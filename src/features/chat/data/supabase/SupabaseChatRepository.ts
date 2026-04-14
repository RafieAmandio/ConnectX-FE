import type { RealtimeChannel } from '@supabase/supabase-js';

import { getSupabaseSession, supabase } from '@shared/services/supabase/client';

import type { ChatRepository } from '../../domain/ChatRepository';
import type {
  ChatMessage,
  ChatRoom,
  ConversationSummaryHandlers,
  PaginatedMessages,
  PresenceHandlers,
  RoomSubscriptionHandlers,
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

async function getCurrentIdentity() {
  const session = await getSupabaseSession();

  if (!session?.user) {
    throw new Error('Supabase chat requires an authenticated Google session.');
  }

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

class SupabaseChatRepository implements ChatRepository {
  private roomStates = new Map<string, RoomChannelState>();
  private summaryStates = new Map<string, SummaryChannelState>();

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

    let summaryQuery = await supabase
      .from('conversation_summaries')
      .select(CONVERSATION_SUMMARY_COLUMNS)
      .eq('user_id', userId);

    if (summaryQuery.error && isMissingWhatsappColumnError(summaryQuery.error)) {
      summaryQuery = await supabase
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
    let query = supabase
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
    const { userId } = await getCurrentIdentity();
    const normalizedContent = input.content.trim();

    if (!normalizedContent) {
      throw new Error('Message content cannot be empty.');
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id: input.roomId,
        sender_id: userId,
        client_id: input.clientId ?? null,
        content: normalizedContent,
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

  async markConversationRead(conversationId: string) {
    const { error } = await supabase.rpc('mark_conversation_read', {
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

    void supabase.removeChannel(roomState.channel);
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
    const staleChannels = supabase
      .getChannels()
      .filter((channel) => channel.topic === `realtime:${roomTopic}`);

    for (const staleChannel of staleChannels) {
      void supabase.removeChannel(staleChannel);
    }

    const channel = supabase.channel(roomTopic, {
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
      void supabase.removeChannel(currentState.channel);
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

    void supabase.removeChannel(summaryState.channel);
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
    const staleChannels = supabase
      .getChannels()
      .filter((channel) => channel.topic === `realtime:${channelName}`);

    for (const staleChannel of staleChannels) {
      void supabase.removeChannel(staleChannel);
    }

    const channel = supabase.channel(channelName);
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
      void supabase.removeChannel(currentState.channel);
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
