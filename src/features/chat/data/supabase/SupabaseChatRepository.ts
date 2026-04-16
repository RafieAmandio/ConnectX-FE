import type { RealtimeChannel } from '@supabase/supabase-js';

import { ApiError, apiFetch, getApiAccessToken } from '@shared/services/api';
import {
  getStoredSupabaseIdentity,
  getSupabaseSession,
  supabaseData,
} from '@shared/services/supabase/client';
import { isExpoDevModeEnabled } from '@shared/utils/env';

import type { ChatRepository } from '../../domain/ChatRepository';
import type {
  ChatImageAsset,
  ChatMessage,
  ChatRoom,
  ConversationSummaryHandlers,
  PaginatedMessages,
  PresenceHandlers,
  RoomSubscriptionHandlers,
  SendImageMessageInput,
  SendMessageInput,
} from '../../domain/models';
import { createRoomTopic, createTypingPayload, mapPresenceState } from './channel-helpers';
import {
  mapConversationSummaryRow,
  mapMessageRow,
  type ConversationSummaryRow,
  type MessageRow,
} from './mappers';

const MESSAGE_PAGE_SIZE = 5;
const CHAT_API = {
  UPLOAD_IMAGE: '/api/chat/uploads/image',
  SEND_MESSAGE: '/api/chat/messages',
} as const;
const SEND_MESSAGE_TIMEOUT_MS = 4_000;
const MOCK_IMAGE_UPLOAD = {
  mediaUrl:
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  thumbnailUrl:
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=480&q=60',
} as const;
const CONVERSATION_SUMMARY_COLUMNS = [
  'conversation_id',
  'kind',
  'last_message_at',
  'last_message_text',
  'participant_headline',
  'participant_name',
  'participant_photo_url',
  'participant_user_id',
  'participant_whatsapp_number',
  'title',
  'unread_count',
  'updated_at',
].join(', ');
const LEGACY_CONVERSATION_SUMMARY_COLUMNS = [
  'conversation_id',
  'kind',
  'last_message_at',
  'last_message_text',
  'participant_headline',
  'participant_name',
  'participant_photo_url',
  'participant_user_id',
  'title',
  'unread_count',
  'updated_at',
].join(', ');

type RoomChannelState = {
  channel: RealtimeChannel;
  handlers: Set<RoomSubscriptionHandlers>;
  initialized: boolean;
  initializationError: Error | null;
  initializePromise: Promise<void> | null;
  isPresenceTracked: boolean;
  presenceHandlers: Set<PresenceHandlers>;
  readyPromise: Promise<void>;
  rejectReady: (error: Error) => void;
  resolveReady: () => void;
  roomId: string;
};

type SummaryChannelState = {
  channel: RealtimeChannel;
  handlers: Set<ConversationSummaryHandlers>;
  initialized: boolean;
  initializationError: Error | null;
  initializePromise: Promise<void> | null;
  readyPromise: Promise<void>;
  rejectReady: (error: Error) => void;
  resolveReady: () => void;
  userId: string;
};

type BackendSendMessageResponse = {
  data: MessageRow;
};

type BackendUploadImageResponse = {
  data: UploadedImage;
};

type UploadedImage = {
  media_url: string;
  thumbnail_url: string | null;
  media_name: string | null;
  media_mime_type: string | null;
  media_size_bytes: number | null;
  upload_id?: string | null;
};

type PreparedMessageInput = {
  clientId: string | null;
  content: string | null;
  mediaMimeType: string | null;
  mediaName: string | null;
  mediaSizeBytes: number | null;
  mediaUrl: string | null;
  messageType: 'text' | 'image';
  roomId: string;
  thumbnailUrl: string | null;
};

function createDeferred() {
  let resolve: () => void = () => { };
  let reject: (error: Error) => void = () => { };

  const promise = new Promise<void>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, reject, resolve };
}

function isMissingWhatsappColumnError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? error.code : null;
  const message = 'message' in error ? error.message : null;

  return (
    code === 'PGRST204' ||
    (typeof message === 'string' && message.includes('participant_whatsapp_number'))
  );
}

function shouldFallbackToSupabaseSend(error: unknown) {
  if (!(error instanceof ApiError)) {
    return false;
  }

  return (
    error.status === 0 ||
    error.status === 404 ||
    error.status === 501 ||
    error.status >= 500
  );
}

function extractImageName(image: ChatImageAsset) {
  const trimmedName = image.fileName?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  const uriSegment = image.uri.split('/').pop()?.trim();

  if (uriSegment) {
    return uriSegment;
  }

  return `chat-image-${Date.now()}.jpg`;
}

function prepareMessageInput(input: SendMessageInput): PreparedMessageInput {
  if (input.messageType === 'image') {
    if (!input.mediaUrl) {
      throw new Error('Image messages require a media URL.');
    }

    const normalizedCaption = input.content?.trim() ?? '';

    return {
      clientId: input.clientId ?? null,
      content: normalizedCaption || null,
      mediaMimeType: input.mediaMimeType ?? null,
      mediaName: input.mediaName ?? null,
      mediaSizeBytes: input.mediaSizeBytes ?? null,
      mediaUrl: input.mediaUrl,
      messageType: 'image',
      roomId: input.roomId,
      thumbnailUrl: input.thumbnailUrl ?? null,
    };
  }

  const normalizedContent = input.content.trim();

  if (!normalizedContent) {
    throw new Error('Message content cannot be empty.');
  }

  return {
    clientId: input.clientId ?? null,
    content: normalizedContent,
    mediaMimeType: null,
    mediaName: null,
    mediaSizeBytes: null,
    mediaUrl: null,
    messageType: 'text',
    roomId: input.roomId,
    thumbnailUrl: null,
  };
}

async function getCurrentIdentity() {
  const session = await getSupabaseSession();

  if (session?.user) {
    const email = session.user.email?.trim().toLowerCase() ?? 'connectx-member';
    const displayName =
      (typeof session.user.user_metadata?.full_name === 'string'
        ? session.user.user_metadata.full_name.trim()
        : '') ||
      (typeof session.user.user_metadata?.name === 'string'
        ? session.user.user_metadata.name.trim()
        : '') ||
      email.split('@')[0] ||
      'ConnectX Member';

    return {
      displayName,
      userId: session.user.id,
    };
  }

  const storedIdentity = await getStoredSupabaseIdentity();

  if (!storedIdentity) {
    throw new Error('Supabase chat requires an authenticated session.');
  }

  return {
    displayName:
      storedIdentity.displayName ||
      storedIdentity.email?.split('@')[0] ||
      'ConnectX Member',
    userId: storedIdentity.userId,
  };
}

class SupabaseChatRepository implements ChatRepository {
  private roomStates = new Map<string, RoomChannelState>();
  private summaryStates = new Map<string, SummaryChannelState>();

  async clearRealtimeSubscriptions() {
    try {
      await supabaseData.removeAllChannels();
    } finally {
      this.roomStates.clear();
      this.summaryStates.clear();
    }
  }

  async reconnectRealtime() {
    const activeRoomIds = Array.from(this.roomStates.entries())
      .filter(([, state]) => state.handlers.size || state.presenceHandlers.size)
      .map(([roomId]) => roomId);
    const activeUserIds = Array.from(this.summaryStates.entries())
      .filter(([, state]) => state.handlers.size)
      .map(([userId]) => userId);

    for (const roomId of activeRoomIds) {
      this.replaceRoomState(roomId);
    }

    for (const userId of activeUserIds) {
      this.replaceConversationSummaryState(userId);
    }
  }

  async getConversationSummaries(): Promise<ChatRoom[]> {
    const { userId } = await getCurrentIdentity();

    let summaryQuery = await supabaseData
      .from('conversation_summaries')
      .select(CONVERSATION_SUMMARY_COLUMNS)
      .eq('user_id', userId);

    if (summaryQuery.error && isMissingWhatsappColumnError(summaryQuery.error)) {
      summaryQuery = await supabaseData
        .from('conversation_summaries')
        .select(LEGACY_CONVERSATION_SUMMARY_COLUMNS)
        .eq('user_id', userId);
    }

    const { data, error } = summaryQuery;

    if (error) {
      throw error;
    }

    return ((data ?? []) as unknown as ConversationSummaryRow[])
      .map(mapConversationSummaryRow)
      .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt));
  }

  async getMessages(roomId: string, cursor?: string): Promise<PaginatedMessages> {
    let query = supabaseData
      .from('messages')
      .select(
        'id, room_id, sender_id, client_id, content, created_at, media_mime_type, media_name, media_size_bytes, media_url, message_type, thumbnail_url'
      )
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(MESSAGE_PAGE_SIZE);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const rows = ((data ?? []) as MessageRow[]).map(mapMessageRow);
    const items = [...rows].reverse();
    const nextCursor = rows.length === MESSAGE_PAGE_SIZE ? rows.at(-1)?.createdAt ?? null : null;

    return {
      items,
      nextCursor,
    };
  }

  async sendMessage(input: SendMessageInput): Promise<ChatMessage> {
    const preparedInput = prepareMessageInput(input);

    const apiAccessToken = await getApiAccessToken();

    if (apiAccessToken) {
      try {
        return await this.sendMessageViaBackend(preparedInput);
      } catch (error) {
        if (!shouldFallbackToSupabaseSend(error)) {
          throw error;
        }

        if (isExpoDevModeEnabled()) {
          console.warn('[chat] backend send failed, falling back to Supabase direct insert', error);
        }
      }
    }

    return this.sendMessageDirectlyToSupabase(preparedInput);
  }

  async sendImageMessage(input: SendImageMessageInput): Promise<ChatMessage> {
    const uploadedImage = await this.uploadImage(input);

    return this.sendMessage({
      roomId: input.roomId,
      clientId: input.clientId ?? null,
      content: input.content ?? '',
      mediaMimeType: uploadedImage.media_mime_type,
      mediaName: uploadedImage.media_name,
      mediaSizeBytes: uploadedImage.media_size_bytes,
      mediaUrl: uploadedImage.media_url,
      messageType: 'image',
      thumbnailUrl: uploadedImage.thumbnail_url,
    });
  }

  private async uploadImage(input: SendImageMessageInput): Promise<UploadedImage> {
    const apiAccessToken = await getApiAccessToken();

    if (apiAccessToken) {
      try {
        return await this.uploadImageViaBackend(input);
      } catch (error) {
        if (!shouldFallbackToSupabaseSend(error)) {
          throw error;
        }

        if (isExpoDevModeEnabled()) {
          console.warn('[chat] backend image upload failed, falling back to mock upload', error);
        }
      }
    }

    return this.createMockUploadedImage(input.image);
  }

  private createMockUploadedImage(image: ChatImageAsset): UploadedImage {
    return {
      media_mime_type: image.mimeType?.trim() || 'image/jpeg',
      media_name: extractImageName(image),
      media_size_bytes: image.fileSize ?? null,
      media_url: MOCK_IMAGE_UPLOAD.mediaUrl,
      thumbnail_url: MOCK_IMAGE_UPLOAD.thumbnailUrl,
      upload_id: `mock-upload:${Date.now()}`,
    };
  }

  private async uploadImageViaBackend(input: SendImageMessageInput): Promise<UploadedImage> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, SEND_MESSAGE_TIMEOUT_MS);

    const formData = new FormData();
    const imageName = extractImageName(input.image);
    const clientUploadId = input.clientUploadId?.trim() || `upload:${input.clientId ?? Date.now()}`;

    formData.append('room_id', input.roomId);
    formData.append('client_upload_id', clientUploadId);

    if (input.content?.trim()) {
      formData.append('caption', input.content.trim());
    }

    formData.append(
      'file',
      {
        name: imageName,
        type: input.image.mimeType?.trim() || 'image/jpeg',
        uri: input.image.uri,
      } as any
    );

    try {
      const response = await apiFetch<BackendUploadImageResponse>(CHAT_API.UPLOAD_IMAGE, {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
      });

      return response.data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async sendMessageDirectlyToSupabase(input: PreparedMessageInput): Promise<ChatMessage> {
    const { userId } = await getCurrentIdentity();

    const { data, error } = await supabaseData
      .from('messages')
      .insert({
        client_id: input.clientId ?? null,
        content: input.content,
        media_mime_type: input.mediaMimeType,
        media_name: input.mediaName,
        media_size_bytes: input.mediaSizeBytes,
        media_url: input.mediaUrl,
        message_type: input.messageType,
        room_id: input.roomId,
        sender_id: userId,
        thumbnail_url: input.thumbnailUrl,
      })
      .select(
        'id, room_id, sender_id, client_id, content, created_at, media_mime_type, media_name, media_size_bytes, media_url, message_type, thumbnail_url'
      )
      .single();

    if (error) {
      throw error;
    }

    return mapMessageRow(data as MessageRow);
  }

  private async sendMessageViaBackend(input: PreparedMessageInput): Promise<ChatMessage> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, SEND_MESSAGE_TIMEOUT_MS);

    try {
      const response = await apiFetch<BackendSendMessageResponse>(CHAT_API.SEND_MESSAGE, {
        method: 'POST',
        body:
          input.messageType === 'image'
            ? ({
                room_id: input.roomId,
                client_id: input.clientId,
                content: input.content,
                media_mime_type: input.mediaMimeType,
                media_name: input.mediaName,
                media_size_bytes: input.mediaSizeBytes,
                media_url: input.mediaUrl,
                message_type: input.messageType,
                thumbnail_url: input.thumbnailUrl,
              } as any)
            : ({
                room_id: input.roomId,
                client_id: input.clientId,
                content: input.content,
              } as any),
        signal: abortController.signal,
      });

      return mapMessageRow(response.data);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async markConversationRead(conversationId: string) {
    const { error } = await supabaseData.rpc('mark_conversation_read', {
      conversation_uuid: conversationId,
    });

    if (error) {
      throw error;
    }
  }

  subscribeToConversationSummaries(handlers: ConversationSummaryHandlers) {
    let isActive = true;
    let userIdForCleanup: string | null = null;

    void getCurrentIdentity()
      .then(({ userId }) => {
        if (!isActive) {
          return;
        }

        userIdForCleanup = userId;
        const summaryState = this.getOrCreateConversationSummaryState(userId);
        summaryState.handlers.add(handlers);

        if (summaryState.initializationError) {
          handlers.onError?.(summaryState.initializationError);
        }
      })
      .catch((error) => {
        handlers.onError?.(
          error instanceof Error
            ? error
            : new Error('Failed to initialize conversation summaries subscription.')
        );
      });

    let cleanup = () => {
      isActive = false;
    };

    return () => {
      cleanup();

      if (!userIdForCleanup) {
        return;
      }

      const summaryState = this.summaryStates.get(userIdForCleanup);

      if (!summaryState) {
        return;
      }

      summaryState.handlers.delete(handlers);
      this.cleanupConversationSummaryState(userIdForCleanup);
    };
  }

  subscribeToRoom(roomId: string, handlers: RoomSubscriptionHandlers) {
    const roomState = this.getOrCreateRoomState(roomId);
    roomState.handlers.add(handlers);

    return () => {
      const currentState = this.roomStates.get(roomId);
      currentState?.handlers.delete(handlers);
      this.cleanupRoomState(roomId);
    };
  }

  async setTyping(roomId: string, isTyping: boolean) {
    const roomState = this.getOrCreateRoomState(roomId);
    await roomState.readyPromise;

    const { displayName, userId } = await getCurrentIdentity();

    await roomState.channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: createTypingPayload({
        roomId,
        userId,
        displayName,
        isTyping,
      }),
    });
  }

  subscribeToPresence(roomId: string, handlers: PresenceHandlers) {
    const roomState = this.getOrCreateRoomState(roomId);
    roomState.presenceHandlers.add(handlers);

    return () => {
      const currentState = this.roomStates.get(roomId);
      currentState?.presenceHandlers.delete(handlers);
      this.cleanupRoomState(roomId);
    };
  }

  private cleanupRoomState(roomId: string) {
    const roomState = this.roomStates.get(roomId);

    if (!roomState) {
      return;
    }

    if (roomState.handlers.size || roomState.presenceHandlers.size) {
      return;
    }

    void supabaseData.removeChannel(roomState.channel);
    this.roomStates.delete(roomId);
  }

  private getOrCreateRoomState(roomId: string) {
    const existingState = this.roomStates.get(roomId);

    if (existingState && !existingState.initializationError) {
      return existingState;
    }

    if (existingState) {
      return this.replaceRoomState(roomId, existingState);
    }

    return this.createRoomState(roomId);
  }

  private createRoomState(roomId: string, previousState?: RoomChannelState) {
    const deferred = createDeferred();
    const roomTopic = createRoomTopic(roomId);
    const staleChannels = supabaseData
      .getChannels()
      .filter((channel) => channel.topic === `realtime:${roomTopic}`);

    for (const staleChannel of staleChannels) {
      void supabaseData.removeChannel(staleChannel);
    }

    const channel = supabaseData.channel(roomTopic, {
      config: {
        broadcast: { self: true },
      },
    });

    const roomState: RoomChannelState = {
      channel,
      handlers: new Set(previousState?.handlers ?? []),
      initialized: false,
      initializationError: null,
      initializePromise: null,
      isPresenceTracked: false,
      presenceHandlers: new Set(previousState?.presenceHandlers ?? []),
      readyPromise: deferred.promise,
      rejectReady: deferred.reject,
      resolveReady: deferred.resolve,
      roomId,
    };

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        const message = mapMessageRow(payload.new as MessageRow);

        for (const handlers of roomState.handlers) {
          handlers.onMessage?.(message);
        }
      }
    );

    channel.on('broadcast', { event: 'typing' }, (payload) => {
      const typingState = payload.payload as {
        displayName?: string;
        isTyping?: boolean;
        roomId?: string;
        sentAt?: string;
        userId?: string;
      };

      if (!typingState.roomId || !typingState.userId) {
        return;
      }

      for (const handlers of roomState.handlers) {
        handlers.onTyping?.({
          displayName: typingState.displayName?.trim() || 'ConnectX Member',
          isTyping: Boolean(typingState.isTyping),
          roomId: typingState.roomId,
          sentAt: typingState.sentAt ?? new Date().toISOString(),
          userId: typingState.userId,
        });
      }
    });

    channel.on('presence', { event: 'sync' }, () => {
      const presenceMembers = mapPresenceState(
        channel.presenceState() as Record<
          string,
          { displayName?: string; onlineAt?: string; userId?: string }[]
        >
      );

      for (const handlers of roomState.presenceHandlers) {
        handlers.onSync?.(presenceMembers);
      }
    });

    this.roomStates.set(roomId, roomState);
    roomState.initializePromise = this.initializeRoomState(roomState);
    void roomState.readyPromise.catch(() => undefined);

    return roomState;
  }

  private replaceRoomState(roomId: string, previousState?: RoomChannelState) {
    const currentState = previousState ?? this.roomStates.get(roomId);

    if (currentState) {
      currentState.handlers.clear();
      currentState.presenceHandlers.clear();
      void supabaseData.removeChannel(currentState.channel);
      this.roomStates.delete(roomId);
    }

    return this.createRoomState(roomId, currentState);
  }

  private cleanupConversationSummaryState(userId: string) {
    const summaryState = this.summaryStates.get(userId);

    if (!summaryState) {
      return;
    }

    if (summaryState.handlers.size) {
      return;
    }

    void supabaseData.removeChannel(summaryState.channel);
    this.summaryStates.delete(userId);
  }

  private getOrCreateConversationSummaryState(userId: string) {
    const existingState = this.summaryStates.get(userId);

    if (existingState && !existingState.initializationError) {
      return existingState;
    }

    if (existingState) {
      return this.replaceConversationSummaryState(userId, existingState);
    }

    return this.createConversationSummaryState(userId);
  }

  private createConversationSummaryState(
    userId: string,
    previousState?: SummaryChannelState
  ) {
    const deferred = createDeferred();
    const channelName = `conversation-summaries:${userId}`;
    const staleChannels = supabaseData
      .getChannels()
      .filter((channel) => channel.topic === `realtime:${channelName}`);

    for (const staleChannel of staleChannels) {
      void supabaseData.removeChannel(staleChannel);
    }

    const channel = supabaseData.channel(channelName);
    const summaryState: SummaryChannelState = {
      channel,
      handlers: new Set(previousState?.handlers ?? []),
      initialized: false,
      initializationError: null,
      initializePromise: null,
      readyPromise: deferred.promise,
      rejectReady: deferred.reject,
      resolveReady: deferred.resolve,
      userId,
    };

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversation_summaries',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as Partial<ConversationSummaryRow>;

          if (typeof oldRow.conversation_id === 'string') {
            for (const handlers of summaryState.handlers) {
              handlers.onDelete?.(oldRow.conversation_id);
            }
          }

          return;
        }

        const row = payload.new as ConversationSummaryRow;
        const conversation = mapConversationSummaryRow(row);

        for (const handlers of summaryState.handlers) {
          handlers.onUpsert?.(conversation);
        }
      }
    );

    this.summaryStates.set(userId, summaryState);
    summaryState.initializePromise = this.initializeConversationSummaryState(summaryState);
    void summaryState.readyPromise.catch(() => undefined);

    return summaryState;
  }

  private replaceConversationSummaryState(
    userId: string,
    previousState?: SummaryChannelState
  ) {
    const currentState = previousState ?? this.summaryStates.get(userId);

    if (currentState) {
      currentState.handlers.clear();
      void supabaseData.removeChannel(currentState.channel);
      this.summaryStates.delete(userId);
    }

    return this.createConversationSummaryState(userId, currentState);
  }

  private async initializeConversationSummaryState(summaryState: SummaryChannelState) {
    try {
      await new Promise<void>((resolve, reject) => {
        summaryState.channel.subscribe((status, error) => {
          if (status === 'SUBSCRIBED') {
            resolve();
            return;
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const details =
              error instanceof Error
                ? error.message
                : typeof error === 'string'
                  ? error
                  : null;

            reject(
              new Error(
                details
                  ? `Conversation summaries subscription failed: ${details}`
                  : 'Conversation summaries subscription failed.'
              )
            );
          }
        });
      });

      summaryState.initialized = true;
      summaryState.resolveReady();
    } catch (error) {
      const nextError =
        error instanceof Error
          ? error
          : new Error('Failed to initialize conversation summaries subscription.');

      summaryState.initializationError = nextError;
      summaryState.rejectReady(nextError);

      for (const handlers of summaryState.handlers) {
        handlers.onError?.(nextError);
      }
    }
  }

  private async initializeRoomState(roomState: RoomChannelState) {
    try {
      await new Promise<void>((resolve, reject) => {
        roomState.channel.subscribe((status, error) => {
          if (status === 'SUBSCRIBED') {
            resolve();
            return;
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const details =
              error instanceof Error
                ? error.message
                : typeof error === 'string'
                  ? error
                  : null;

            reject(
              new Error(
                details
                  ? `Realtime channel failed for room ${roomState.roomId}: ${details}`
                  : `Realtime channel failed for room ${roomState.roomId}.`
              )
            );
          }
        });
      });

      if (!roomState.isPresenceTracked) {
        const { displayName, userId } = await getCurrentIdentity();

        const presenceTrackStatus = await roomState.channel.track({
          userId,
          displayName,
          onlineAt: new Date().toISOString(),
        });

        if (presenceTrackStatus !== 'ok') {
          throw new Error(
            `Presence track failed for room ${roomState.roomId}: ${presenceTrackStatus}`
          );
        }

        roomState.isPresenceTracked = true;
      }

      roomState.initialized = true;
      roomState.resolveReady();
    } catch (error) {
      const nextError =
        error instanceof Error ? error : new Error('Failed to initialize realtime room.');

      roomState.initializationError = nextError;
      roomState.rejectReady(nextError);

      for (const handlers of roomState.handlers) {
        handlers.onError?.(nextError);
      }

      for (const handlers of roomState.presenceHandlers) {
        handlers.onError?.(nextError);
      }
    }
  }
}

export const supabaseChatRepository = new SupabaseChatRepository();
