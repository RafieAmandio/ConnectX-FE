import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  ListRenderItemInfo,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@features/auth';
import { AppButton, AppText, AppTopBar } from '@shared/components';

import type { ChatMessage, ChatRoom } from '../domain/models';
import {
  useChatRooms,
  useMarkConversationRead,
  useRoomMessages,
  useRoomPresence,
  useRoomRealtime,
  useRoomTyping,
  useSendChatImageMessage,
  useSendChatMessage,
} from '../presentation/hooks/use-chat';

function createClientId(userId: string) {
  return `${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function createClientUploadId(userId: string) {
  return `upload:${createClientId(userId)}`;
}

function formatRelativeTime(value: string) {
  const deltaInMinutes = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / (1000 * 60))
  );

  if (deltaInMinutes < 1) return 'just now';
  if (deltaInMinutes < 60) return `${deltaInMinutes}m ago`;

  const deltaInHours = Math.round(deltaInMinutes / 60);
  if (deltaInHours < 24) return `${deltaInHours}h ago`;

  return `${Math.round(deltaInHours / 24)}d ago`;
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getInitials(value: string) {
  return value
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getPresenceLabel(onlineCount: number) {
  if (onlineCount <= 0) {
    return 'Offline';
  }

  if (onlineCount === 1) {
    return 'Online now';
  }

  return `${onlineCount} people online`;
}

function getConversationSubtitle(conversation: ChatRoom | null, onlineCount: number) {
  if (!conversation) {
    return 'Loading...';
  }

  if (conversation.headline?.trim()) {
    return conversation.headline;
  }

  if (conversation.kind === 'group') {
    return `Group chat · ${getPresenceLabel(onlineCount)}`;
  }

  return getPresenceLabel(onlineCount);
}

function normalizeDialableNumber(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/[^\d+]/g, '');
}

function formatBytes(value: number | null | undefined) {
  if (!value || value <= 0) {
    return null;
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatConversationCount(value: number) {
  return `${value} ${value === 1 ? 'conversation' : 'conversations'}`;
}

function getConversationPreview(conversation: ChatRoom) {
  return conversation.headline?.trim() || conversation.preview?.trim() || 'Tap to open the conversation.';
}

const MessageBody = React.memo(function MessageBody({
  isOutgoing,
  message,
}: {
  isOutgoing: boolean;
  message: ChatMessage;
}) {
  const textClassName = isOutgoing ? 'text-[#201507]' : 'text-[#F3F0EB]';
  const subtleTextClassName = isOutgoing ? 'text-[#7C5526]' : 'text-[#B8B2AB]';

  if (message.messageType === 'image' && message.mediaUrl) {
    return (
      <View className="gap-3">
        <Image
          contentFit="cover"
          source={{ uri: message.mediaUrl }}
          style={{ borderRadius: 18, height: 220, width: 240 }}
        />
        {message.content ? (
          <AppText className={textClassName} variant="body">
            {message.content}
          </AppText>
        ) : null}
      </View>
    );
  }

  if ((message.messageType === 'video' || message.messageType === 'file') && message.mediaUrl) {
    return (
      <Pressable
        className="gap-3 active:opacity-80"
        onPress={() => {
          void Linking.openURL(message.mediaUrl!);
        }}>
        {message.thumbnailUrl ? (
          <Image
            contentFit="cover"
            source={{ uri: message.thumbnailUrl }}
            style={{ borderRadius: 18, height: 180, width: 240 }}
          />
        ) : null}

        <View className="flex-row items-center gap-3 rounded-[18px] border border-white/10 px-4 py-3">
          <Ionicons
            color={isOutgoing ? '#5C3D18' : '#F7B05B'}
            name={message.messageType === 'video' ? 'videocam-outline' : 'document-outline'}
            size={22}
          />
          <View className="flex-1 gap-0.5">
            <AppText className={textClassName} numberOfLines={1} variant="bodyStrong">
              {message.mediaName ?? (message.messageType === 'video' ? 'Video attachment' : 'File attachment')}
            </AppText>
            <AppText className={subtleTextClassName} numberOfLines={1} variant="code">
              {formatBytes(message.mediaSizeBytes) ??
                (message.messageType === 'video' ? 'Tap to open video' : 'Tap to open attachment')}
            </AppText>
          </View>
        </View>

        {message.content ? (
          <AppText className={textClassName} variant="body">
            {message.content}
          </AppText>
        ) : null}
      </Pressable>
    );
  }

  return (
    <AppText className={textClassName} variant="body">
      {message.content}
    </AppText>
  );
});

function ChatExperimentNotice() {
  return (
    <View className="flex-1" style={{ backgroundColor: '#262626' }}>
      <AppTopBar />
      <View className="flex-1 items-center justify-center px-5">
        <View
          className="w-full max-w-[360px] rounded-[28px] border px-6 py-7"
          style={{ backgroundColor: '#2C2C2C', borderColor: 'rgba(255, 255, 255, 0.08)' }}>
          <View className="items-center gap-5">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-[#3A2B1D]">
              <Ionicons color="#FFB35E" name="chatbubble-ellipses-outline" size={28} />
            </View>
            <View className="gap-2">
              <AppText align="center" className="text-white" variant="title">
                Messages are getting ready
              </AppText>
              <AppText align="center" className="text-[#B8B2AB]">
                Your inbox will show up here as soon as conversations are available. Check back in a
                little while.
              </AppText>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function ChatAvatar({
  conversation,
  size = 56,
}: {
  conversation: ChatRoom;
  size?: number;
}) {
  const initials = getInitials(conversation.title);

  if (conversation.photoUrl) {
    return (
      <Image
        contentFit="cover"
        source={{ uri: conversation.photoUrl }}
        style={{ borderRadius: size / 2, height: size, width: size }}
      />
    );
  }

  return (
    <View
      className="items-center justify-center rounded-full bg-[#2F3440]"
      style={{ height: size, width: size }}>
      <AppText className="text-[#F7B05B]" variant="bodyStrong">
        {initials}
      </AppText>
    </View>
  );
}

const ConversationCard = React.memo(function ConversationCard({
  conversation,
  onPress,
}: {
  conversation: ChatRoom;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="active:opacity-90"
      onPress={onPress}>
      <View
        className="rounded-[26px] border px-4 py-4"
        style={{ backgroundColor: '#2C2C2C', borderColor: 'rgba(255, 255, 255, 0.08)' }}>
        <View className="flex-row items-center gap-4">
          <View className="relative">
            <ChatAvatar conversation={conversation} size={58} />
            {conversation.unreadCount > 0 ? (
              <View className="absolute -right-1 -top-1 min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#2C2C2C] bg-[#F59E0B] px-1">
                <AppText className="text-[11px] text-[#1E1B16]" variant="label">
                  {conversation.unreadCount}
                </AppText>
              </View>
            ) : null}
          </View>

          <View className="flex-1 gap-3">
            <View className="flex-row items-center justify-between gap-3">
              <AppText className="flex-1 text-white" numberOfLines={1} variant="subtitle">
                {conversation.title}
              </AppText>
              <AppText
                className={conversation.unreadCount > 0 ? 'text-[#F59E0B]' : 'text-[#8E8B87]'}
                variant="code">
                {formatRelativeTime(conversation.lastMessageAt)}
              </AppText>
            </View>

            <AppText
              className={conversation.unreadCount > 0 ? 'text-[#F3EEE8]' : 'text-[#AAA39B]'}
              numberOfLines={2}>
              {getConversationPreview(conversation)}
            </AppText>

            <View className="flex-row items-center gap-2">
              <View className="rounded-full bg-[#232323] px-3 py-1.5">
                <AppText className="text-[#BDB7AF]" variant="code">
                  {conversation.kind === 'group' ? 'Group chat' : 'Direct message'}
                </AppText>
              </View>
              {conversation.unreadCount > 0 ? (
                <View className="rounded-full bg-[#5B4225] px-3 py-1.5">
                  <AppText className="text-[#FFB35E]" variant="code">
                    {conversation.unreadCount} new
                  </AppText>
                </View>
              ) : (
                <View className="rounded-full bg-[#202124] px-3 py-1.5">
                  <AppText className="text-[#8E8B87]" variant="code">
                    Up to date
                  </AppText>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

function ChatListEmptyState({
  isRefreshing,
  isUnavailable = false,
  onRefresh,
}: {
  isRefreshing: boolean;
  isUnavailable?: boolean;
  onRefresh: () => void;
}) {
  const title = isUnavailable ? 'Messages are taking a break' : 'No messages yet';
  const description = isUnavailable
    ? 'We could not load your conversations right now. Try again in a moment.'
    : 'When someone reaches out, your conversations will show up here. For now, you are all caught up.';

  return (
    <View className="flex-1 justify-center px-1 py-10">
      <View
        className="rounded-[32px] border px-6 py-8"
        style={{ backgroundColor: '#2C2C2C', borderColor: 'rgba(255, 255, 255, 0.08)' }}>
        <View className="items-center gap-6">
          <View className="relative items-center justify-center">
            <View className="h-24 w-24 rounded-full bg-[#332519]" />
            <View className="absolute h-16 w-16 items-center justify-center rounded-full bg-[#FF9A3E]">
              <Ionicons color="#23160A" name="chatbubble-ellipses-outline" size={30} />
            </View>
            <View className="absolute -right-1 top-1 h-8 w-8 items-center justify-center rounded-full bg-[#232323]">
              <Ionicons color="#FFD08A" name="sparkles-outline" size={16} />
            </View>
          </View>

          <View className="gap-2">
            <AppText align="center" className="text-white" variant="title">
              {title}
            </AppText>
            <AppText align="center" className="text-[#B8B2AB]">
              {description}
            </AppText>
          </View>

          <AppButton
            className="w-full rounded-[20px] bg-[#5B4225]"
            disabled={isRefreshing}
            label={isRefreshing ? 'Refreshing...' : 'Refresh inbox'}
            onPress={onRefresh}
            variant="ghost"
          />
        </View>
      </View>
    </View>
  );
}

function ConversationPanel({
  conversation,
  showBackButton = false,
  onBack,
}: {
  conversation: ChatRoom | null;
  showBackButton?: boolean;
  onBack?: () => void;
}) {
  const { isChatEnabled, session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [draftMessage, setDraftMessage] = React.useState('');
  const roomId = conversation?.id ?? null;
  const messagesQuery = useRoomMessages(roomId, isChatEnabled && Boolean(roomId));
  const markConversationReadMutation = useMarkConversationRead(roomId);
  const sendMessageMutation = useSendChatMessage(roomId);
  const sendImageMessageMutation = useSendChatImageMessage(roomId);
  const { typingState } = useRoomRealtime(roomId, isChatEnabled && Boolean(roomId));
  const presence = useRoomPresence(roomId, isChatEnabled && Boolean(roomId));
  const listRef = React.useRef<FlatList<ChatMessage>>(null);
  const hasPerformedInitialScrollRef = React.useRef(false);
  const isNearBottomRef = React.useRef(true);
  const isSendingMessage = sendMessageMutation.isPending || sendImageMessageMutation.isPending;
  const messages = React.useMemo(
    () => (messagesQuery.data?.pages ?? []).flatMap((page) => [...page.items].reverse()),
    [messagesQuery.data]
  );
  const newestMessageId = messages.at(-1)?.id ?? null;
  const handleCallPress = React.useCallback(async () => {
    const phoneNumber = normalizeDialableNumber(conversation?.participantWhatsappNumber);

    if (!phoneNumber) {
      Alert.alert('Call unavailable', 'This user does not have a phone number available yet.');
      return;
    }

    try {
      await Linking.openURL(`tel:${phoneNumber}`);
    } catch {
      Alert.alert('Call unavailable', 'Your device could not open the phone dialer.');
    }
  }, [conversation?.participantWhatsappNumber]);

  useRoomTyping(roomId, draftMessage, isChatEnabled && Boolean(roomId));

  React.useEffect(() => {
    if (!isChatEnabled || !roomId || !messagesQuery.isSuccess) {
      return;
    }

    if (!conversation?.unreadCount || markConversationReadMutation.isPending) {
      return;
    }

    void markConversationReadMutation.mutateAsync();
  }, [
    conversation?.unreadCount,
    isChatEnabled,
    markConversationReadMutation,
    messagesQuery.isSuccess,
    roomId,
  ]);

  React.useEffect(() => {
    if (!newestMessageId) {
      hasPerformedInitialScrollRef.current = false;
      return;
    }

    if (!hasPerformedInitialScrollRef.current || isNearBottomRef.current) {
      setTimeout(
        () => listRef.current?.scrollToOffset({ animated: hasPerformedInitialScrollRef.current, offset: 0 }),
        50
      );
      hasPerformedInitialScrollRef.current = true;
    }
  }, [newestMessageId]);

  const handleSend = React.useCallback(async () => {
    const body = draftMessage.trim();

    if (!body || isSendingMessage || !roomId) {
      return;
    }

    await sendMessageMutation.mutateAsync({
      clientId: createClientId(session?.user?.id ?? 'anonymous'),
      content: body,
    });
    setDraftMessage('');
    setTimeout(() => listRef.current?.scrollToOffset({ animated: true, offset: 0 }), 100);
  }, [draftMessage, isSendingMessage, roomId, sendMessageMutation, session?.user?.id]);

  const handlePickImage = React.useCallback(async () => {
    if (!roomId || isSendingMessage) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      selectionLimit: 1,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.uri) {
      Alert.alert('Image unavailable', 'The selected image could not be read.');
      return;
    }

    await sendImageMessageMutation.mutateAsync({
      clientId: createClientId(session?.user?.id ?? 'anonymous'),
      clientUploadId: createClientUploadId(session?.user?.id ?? 'anonymous'),
      content: draftMessage.trim(),
      image: {
        fileName: asset.fileName ?? null,
        fileSize: asset.fileSize ?? null,
        mimeType: asset.mimeType ?? null,
        uri: asset.uri,
      },
      roomId,
    });

    setDraftMessage('');
    setTimeout(() => listRef.current?.scrollToOffset({ animated: true, offset: 0 }), 100);
  }, [draftMessage, isSendingMessage, roomId, sendImageMessageMutation, session?.user?.id]);

  const renderMessage = React.useCallback(
    ({ item: message }: ListRenderItemInfo<ChatMessage>) => {
      const isOutgoing = message.senderId === session?.user?.id;
      const hasRichMedia =
        Boolean(message.mediaUrl) &&
        (message.messageType === 'image' ||
          message.messageType === 'video' ||
          message.messageType === 'file');

      return (
        <View className={isOutgoing ? 'items-end' : 'items-start'}>
          <View
            className={
              isOutgoing
                ? `max-w-[82%] rounded-[26px] rounded-br-[10px] bg-[#FF9D3D] ${hasRichMedia ? 'p-3' : 'px-5 py-4'}`
                : `max-w-[82%] rounded-[26px] rounded-bl-[10px] bg-[#313131] ${hasRichMedia ? 'p-3' : 'px-5 py-4'}`
            }>
            <MessageBody
              isOutgoing={isOutgoing}
              message={message}
            />
            <AppText
              className={isOutgoing ? 'mt-2 text-[#7C5526]' : 'mt-2 text-[#97928B]'}
              variant="code">
              {formatMessageTime(message.createdAt)}
              {message.status === 'sending' ? ' · sending' : ''}
              {message.status === 'failed' ? ' · failed' : ''}
            </AppText>
          </View>
        </View>
      );
    },
    [session?.user?.id]
  );

  const listFooter = React.useMemo(() => {
    if (messagesQuery.isFetchingNextPage) {
      return (
        <View className="items-center py-2">
          <AppText className="text-[#9C9893]" variant="code">
            Loading earlier messages...
          </AppText>
        </View>
      );
    }

    if (!messagesQuery.hasNextPage && messages.length > 0) {
      return (
        <View className="items-center py-2">
          <AppText className="text-[#77736D]" variant="code">
            Start of conversation
          </AppText>
        </View>
      );
    }

    return null;
  }, [messages.length, messagesQuery.hasNextPage, messagesQuery.isFetchingNextPage]);



  if (!conversation) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <AppText className="text-white" variant="title">
          Conversation unavailable
        </AppText>
        <AppText align="center" className="mt-2" tone="muted">
          This chat could not be found or is no longer available.
        </AppText>
        <Pressable className="mt-4" onPress={() => router.replace('/chat')}>
          <AppText tone="signal">Open chats</AppText>
        </Pressable>
      </View>
    );
  }


  return (
    <View className="flex-1">
      <View 
        className="flex-row items-center gap-3 px-4 pb-4"
        style={{ paddingTop: Math.max(insets.top + 8, 16) }}>
        {showBackButton ? (
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full bg-[#2E2C2B] active:opacity-70"
            onPress={onBack}>
            <Ionicons color="#F3F0EB" name="chevron-back" size={22} />
          </Pressable>
        ) : null}

        <ChatAvatar conversation={conversation} size={52} />

        <View className="flex-1 gap-0.5">
          <AppText className="text-white" numberOfLines={1} variant="title">
            {conversation.title}
          </AppText>
          <AppText className="text-[#9C9893]" numberOfLines={1}>
            {getConversationSubtitle(conversation, presence.members.length)}
          </AppText>
        </View>

        <Pressable
          className="h-12 w-12 items-center justify-center rounded-full bg-[#2E2C2B] active:opacity-70"
          disabled={!conversation.participantWhatsappNumber}
          onPress={() => {
            void handleCallPress();
          }}
          style={{ opacity: conversation.participantWhatsappNumber ? 1 : 0.45 }}>
          <Ionicons color="#BDB7AF" name="call-outline" size={22} />
        </Pressable>

        <AppButton
          className="min-h-12 rounded-full border border-[#7A562D] bg-[#5B4225] px-5"
          detail={undefined}
          label="Add to Team"
          size="md"
          variant="ghost"
        />
      </View>

      <View className="mx-4 h-px bg-[#3A3938]" />

      <FlatList
        ref={listRef}
        className="flex-1"
        contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingVertical: 20 }}
        data={messages}
        inverted
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          messagesQuery.isLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator color="#F59E0B" />
            </View>
          ) : null
        }
        ListFooterComponent={listFooter}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        onEndReached={() => {
          if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
            void messagesQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.2}
        onScroll={(event) => {
          const { contentOffset } = event.nativeEvent;
          isNearBottomRef.current = contentOffset.y <= 120;
        }}
        renderItem={renderMessage}
        scrollEventThrottle={16}
      />

      {messagesQuery.error instanceof Error ? (
        <View className="px-4 py-3">
          <AppText tone="danger">{messagesQuery.error.message}</AppText>
        </View>
      ) : null}

      <View className="border-t border-[#3A3938] px-4 pb-8 pt-3">
        {typingState?.isTyping ? (
          <AppText className="mb-2 text-[#9C9893]" variant="code">
            {typingState.displayName} is typing...
          </AppText>
        ) : null}

        {presence.error ? (
          <AppText className="mb-2" tone="soft" variant="code">
            Presence unavailable: {presence.error.message}
          </AppText>
        ) : null}

        {sendMessageMutation.error instanceof Error ? (
          <AppText className="mb-2" tone="soft" variant="code">
            Send failed: {sendMessageMutation.error.message}
          </AppText>
        ) : null}

        {!(sendMessageMutation.error instanceof Error) && sendImageMessageMutation.error instanceof Error ? (
          <AppText className="mb-2" tone="soft" variant="code">
            Send failed: {sendImageMessageMutation.error.message}
          </AppText>
        ) : null}

        <View className="flex-row items-end gap-3">
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full bg-transparent active:opacity-70"
            disabled={isSendingMessage || !roomId}
            onPress={() => {
              void handlePickImage();
            }}
            style={{ opacity: isSendingMessage || !roomId ? 0.45 : 1 }}>
            <Ionicons color="#9C9893" name="attach-outline" size={26} />
          </Pressable>

          <View className="flex-1 rounded-full border border-[#444240] bg-[#2E2C2B] px-5 py-3">
            <TextInput
              className="font-body text-[16px] text-white"
              multiline
              onChangeText={setDraftMessage}
              placeholder="Type a message..."
              placeholderTextColor="#7D7974"
              value={draftMessage}
            />
          </View>

          <Pressable
            className="h-14 w-14 items-center justify-center rounded-full bg-[#FF9D3D] active:opacity-70"
            disabled={!draftMessage.trim() || isSendingMessage}
            onPress={() => void handleSend()}
            style={{
              opacity: !draftMessage.trim() || isSendingMessage ? 0.5 : 1,
            }}>
            {isSendingMessage ? (
              <ActivityIndicator color="#1F160C" size="small" />
            ) : (
              <Ionicons color="#1F160C" name="paper-plane-outline" size={24} />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function ChatListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isChatEnabled } = useAuth();
  const conversationsQuery = useChatRooms(isChatEnabled);
  const conversations = React.useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);
  const hasConversations = conversations.length > 0;
  const unreadTotal = conversations.reduce((sum, room) => sum + room.unreadCount, 0);
  const loadingInitialState = conversationsQuery.isLoading && !hasConversations;

  const renderConversation = React.useCallback(
    ({ item: conversation }: { item: ChatRoom }) => (
      <ConversationCard
        conversation={conversation}
        onPress={() => {
          router.push(`/conversation/${conversation.id}`);
        }}
      />
    ),
    [router]
  );

  if (!isChatEnabled) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ChatExperimentNotice />
      </>
    );
  }

  const listHeader = (
    <View className="gap-4 pb-5 pt-3">
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1 gap-1">
          <AppText className="text-white" variant="display">
            Chats
          </AppText>
          <AppText className="text-[#A7A199]">
            Keep conversations moving without losing the thread.
          </AppText>
        </View>

        <View className="items-end gap-2">
          <View className="rounded-full bg-[#5B4225] px-4 py-2">
            <AppText className="text-[#FFB35E]" variant="bodyStrong">
              {unreadTotal > 0 ? `${unreadTotal} unread` : 'All caught up'}
            </AppText>
          </View>
          <AppText className="text-[#7E7972]" variant="code">
            {formatConversationCount(conversations.length)}
          </AppText>
        </View>
      </View>

      <View
        className="overflow-hidden rounded-[30px] border px-5 py-5"
        style={{ backgroundColor: '#2C2C2C', borderColor: 'rgba(255, 255, 255, 0.08)' }}>
        <View
          className="absolute right-[-28px] top-[-24px] h-28 w-28 rounded-full"
          style={{ backgroundColor: 'rgba(255, 154, 62, 0.14)' }}
        />
        <View
          className="absolute bottom-[-42px] left-[-18px] h-32 w-32 rounded-full"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
        />

        <View className="gap-5">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1 gap-2">
              <View className="self-start rounded-full bg-[#3B2A1C] px-3 py-1.5">
                <AppText className="text-[#FFB35E]" variant="label">
                  Inbox
                </AppText>
              </View>
              <AppText className="text-white" variant="hero">
                {hasConversations ? 'Pick up where you left off.' : 'Your next conversation starts here.'}
              </AppText>
              <AppText className="text-[#C6BFB7]">
                {hasConversations
                  ? 'Recent chats, unread updates, and quick replies all stay in one place.'
                  : 'As new people reach out, they will land here in a clean, easy-to-scan inbox.'}
              </AppText>
            </View>

            <View className="h-14 w-14 items-center justify-center rounded-full bg-[#3A2B1D]">
              <Ionicons color="#FFB35E" name="paper-plane-outline" size={24} />
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 rounded-[20px] bg-[#232323] px-4 py-4">
              <AppText className="text-[#7E7972]" variant="label">
                Active
              </AppText>
              <AppText className="mt-2 text-white" variant="title">
                {conversations.length}
              </AppText>
              <AppText className="text-[#A7A199]">
                {hasConversations ? 'conversations in your inbox' : 'waiting for first conversation'}
              </AppText>
            </View>

            <View className="flex-1 rounded-[20px] bg-[#232323] px-4 py-4">
              <AppText className="text-[#7E7972]" variant="label">
                New
              </AppText>
              <AppText className="mt-2 text-white" variant="title">
                {unreadTotal}
              </AppText>
              <AppText className="text-[#A7A199]">
                {unreadTotal > 0 ? 'messages waiting for you' : 'nothing urgent right now'}
              </AppText>
            </View>
          </View>
        </View>
      </View>

      {conversationsQuery.error instanceof Error && hasConversations ? (
        <View
          className="rounded-[22px] border px-4 py-4"
          style={{ backgroundColor: '#30251E', borderColor: 'rgba(255, 179, 94, 0.2)' }}>
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#4A3423]">
              <Ionicons color="#FFB35E" name="refresh-outline" size={18} />
            </View>
            <View className="flex-1 gap-1">
              <AppText className="text-[#FFE0BA]" variant="bodyStrong">
                Some chats may be out of date
              </AppText>
              <AppText className="text-[#D9B98E]">
                We hit a snag while refreshing your inbox. Pull to retry or tap below.
              </AppText>
            </View>
          </View>
          <Pressable
            className="mt-4 self-start rounded-full bg-[#5B4225] px-4 py-2 active:opacity-80"
            onPress={() => {
              void conversationsQuery.refetch();
            }}>
            <AppText className="text-[#FFB35E]" variant="bodyStrong">
              Refresh now
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {hasConversations ? (
        <View className="flex-row items-center justify-between px-1 pt-1">
          <AppText className="text-white" variant="subtitle">
            Recent conversations
          </AppText>
          <AppText className="text-[#7E7972]" variant="code">
            Latest activity first
          </AppText>
        </View>
      ) : null}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1" style={{ backgroundColor: '#262626' }}>
        <AppTopBar />
        {loadingInitialState ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#F59E0B" />
          </View>
        ) : (
          <FlatList
            contentContainerStyle={{
              flexGrow: hasConversations ? undefined : 1,
              paddingBottom: Math.max(insets.bottom + 32, 32),
              paddingHorizontal: 16,
            }}
            contentInsetAdjustmentBehavior="automatic"
            data={conversations}
            ItemSeparatorComponent={() => <View className="h-3" />}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <ChatListEmptyState
                isRefreshing={conversationsQuery.isRefetching}
                isUnavailable={conversationsQuery.error instanceof Error}
                onRefresh={() => {
                  void conversationsQuery.refetch();
                }}
              />
            }
            ListHeaderComponent={listHeader}
            renderItem={renderConversation}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </>
  );
}

export function ChatConversationScreen({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const { isChatEnabled } = useAuth();
  const conversationsQuery = useChatRooms(isChatEnabled);
  const conversation = conversationsQuery.data?.find((room) => room.id === conversationId) ?? null;

  if (!isChatEnabled) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ChatExperimentNotice />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        style={{ backgroundColor: '#262626' }}
        keyboardVerticalOffset={0}>
        <ConversationPanel
          conversation={conversation}
          onBack={() => router.back()}
          showBackButton
        />
      </KeyboardAvoidingView>
    </>
  );
}
