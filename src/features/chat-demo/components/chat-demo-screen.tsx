import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItemInfo,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, AppText, AppTopBar } from '@shared/components';

import { useCreateStartupInvitation } from '@features/team/hooks/use-team';
import type { ChatConversation, ChatMessage } from '@features/chat/types/chat.types';
import {
  useAppendMockMessage,
  useChatConversations,
  useConversationMessages,
} from '@features/chat/hooks/use-mock-chat';

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

function ChatDemoAvatar({ conversation, size = 56 }: { conversation: ChatConversation; size?: number }) {
  return (
    <View
      className="items-center justify-center rounded-full bg-[#2F3440]"
      style={{ height: size, width: size }}>
      <AppText className="text-[#F7B05B]" variant="bodyStrong">
        {getInitials(conversation.name)}
      </AppText>
    </View>
  );
}

function ConversationCard({
  conversation,
  onPress,
}: {
  conversation: ChatConversation;
  onPress: () => void;
}) {
  return (
    <Pressable className="active:opacity-90" onPress={onPress}>
      <View className="flex-row items-center gap-3 px-1 py-2.5">
        <ChatDemoAvatar conversation={conversation} size={52} />

        <View className="min-w-0 flex-1 border-b border-[#353535] pb-3">
          <View className="flex-row items-center justify-between gap-3">
            <AppText className="flex-1 text-white" numberOfLines={1} variant="bodyStrong">
              {conversation.name}
            </AppText>
            <AppText
              className={conversation.unreadCount > 0 ? 'text-[#F59E0B]' : 'text-[#8E8B87]'}
              variant="code">
              {formatRelativeTime(conversation.lastMessageAt)}
            </AppText>
          </View>

          <View className="mt-1 flex-row items-center gap-3">
            <AppText
              className={conversation.unreadCount > 0 ? 'flex-1 text-[#F3EEE8]' : 'flex-1 text-[#AAA39B]'}
              numberOfLines={1}>
              {conversation.preview}
            </AppText>

            {conversation.unreadCount > 0 ? (
              <View className="min-h-5 min-w-5 items-center justify-center rounded-full bg-[#F59E0B] px-1.5">
                <AppText className="text-[11px] text-[#1E1B16]" variant="label">
                  {conversation.unreadCount}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState({
  isRefreshing,
  isUnavailable,
  onRefresh,
}: {
  isRefreshing: boolean;
  isUnavailable: boolean;
  onRefresh: () => void;
}) {
  return (
    <View className="flex-1 justify-center py-10">
      <View
        className="rounded-[32px] border px-6 py-8"
        style={{ backgroundColor: '#2C2C2C', borderColor: 'rgba(255, 255, 255, 0.08)' }}>
        <View className="items-center gap-5">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-[#3A2B1D]">
            <Ionicons color="#FFB35E" name="chatbubble-ellipses-outline" size={28} />
          </View>
          <View className="gap-2">
            <AppText align="center" className="text-white" variant="title">
              {isUnavailable ? 'Demo chats unavailable' : 'No demo chats yet'}
            </AppText>
            <AppText align="center" className="text-[#B8B2AB]">
              {isUnavailable
                ? 'SQLite could not load the demo inbox. Try reseeding the local data.'
                : 'Seed the local demo inbox to show match-linked conversations.'}
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

export function ChatDemoListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const conversationsQuery = useChatConversations();
  const conversations = conversationsQuery.data ?? [];
  const hasConversations = conversations.length > 0;
  const renderConversation = React.useCallback(
    ({ item }: ListRenderItemInfo<ChatConversation>) => (
      <ConversationCard
        conversation={item}
        onPress={() => {
          router.push(`/chat_demo/${item.id}` as never);
        }}
      />
    ),
    [router]
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1" style={{ backgroundColor: '#262626' }}>
        <AppTopBar />
        {conversationsQuery.isLoading && !hasConversations ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#F59E0B" />
          </View>
        ) : (
          <FlatList
            contentContainerStyle={{
              flexGrow: hasConversations ? undefined : 1,
              paddingBottom: Math.max(insets.bottom + 32, 32),
              paddingHorizontal: 16,
              paddingTop: 12,
            }}
            contentInsetAdjustmentBehavior="automatic"
            data={conversations}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <EmptyState
                isRefreshing={conversationsQuery.isRefetching}
                isUnavailable={conversationsQuery.error instanceof Error}
                onRefresh={() => {
                  void conversationsQuery.refetch();
                }}
              />
            }
            ListHeaderComponent={
              <View className="pb-3 pt-1">
                <AppText className="text-white" variant="display">
                  Chat Demo
                </AppText>

                {conversationsQuery.error instanceof Error && hasConversations ? (
                  <View
                    className="mt-4 rounded-[22px] border px-4 py-4"
                    style={{ backgroundColor: '#30251E', borderColor: 'rgba(255, 179, 94, 0.2)' }}>
                    <AppText className="text-[#FFE0BA]" variant="bodyStrong">
                      Some demo chats may be out of date
                    </AppText>
                    <AppText className="mt-1 text-[#D9B98E]">
                      {conversationsQuery.error.message}
                    </AppText>
                  </View>
                ) : null}
              </View>
            }
            renderItem={renderConversation}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isOutgoing = message.direction === 'outgoing';

  return (
    <View className={isOutgoing ? 'items-end' : 'items-start'}>
      <View
        className={
          isOutgoing
            ? 'max-w-[82%] rounded-[26px] rounded-br-[10px] bg-[#FF9D3D] px-5 py-4'
            : 'max-w-[82%] rounded-[26px] rounded-bl-[10px] bg-[#313131] px-5 py-4'
        }>
        <AppText className={isOutgoing ? 'text-[#201507]' : 'text-[#F3F0EB]'}>
          {message.body}
        </AppText>
        <AppText className={isOutgoing ? 'mt-2 text-[#7C5526]' : 'mt-2 text-[#97928B]'} variant="code">
          {formatMessageTime(message.createdAt)}
          {message.status === 'sent' ? ' · sent' : ' · read'}
        </AppText>
      </View>
    </View>
  );
}

export function ChatDemoConversationScreen({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const conversationsQuery = useChatConversations();
  const messagesQuery = useConversationMessages(conversationId);
  const appendMessageMutation = useAppendMockMessage(conversationId);
  const createStartupInvitationMutation = useCreateStartupInvitation();
  const [draftMessage, setDraftMessage] = React.useState('');
  const [invitationMessage, setInvitationMessage] = React.useState<string | null>(null);
  const [invitationError, setInvitationError] = React.useState<string | null>(null);
  const listRef = React.useRef<FlatList<ChatMessage>>(null);
  const conversation = conversationsQuery.data?.find((item) => item.id === conversationId) ?? null;
  const messages = messagesQuery.data ?? [];
  const isSending = appendMessageMutation.isPending;
  const invitationSent = createStartupInvitationMutation.isSuccess;

  React.useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  const handleSend = React.useCallback(async () => {
    const body = draftMessage.trim();

    if (!body || isSending) {
      return;
    }

    await appendMessageMutation.mutateAsync(body);
    setDraftMessage('');
  }, [appendMessageMutation, draftMessage, isSending]);

  const handleAddToTeam = React.useCallback(async () => {
    if (!conversation?.participantEmail || createStartupInvitationMutation.isPending || invitationSent) {
      return;
    }

    setInvitationMessage(null);
    setInvitationError(null);

    try {
      const response = await createStartupInvitationMutation.mutateAsync({
        email: conversation.participantEmail,
      });

      setInvitationMessage(response.message);
    } catch (error) {
      setInvitationError(error instanceof Error ? error.message : 'Unable to send team invitation.');
    }
  }, [
    conversation?.participantEmail,
    createStartupInvitationMutation,
    invitationSent,
  ]);

  if (conversationsQuery.isLoading && !conversation) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#262626' }}>
          <ActivityIndicator color="#F59E0B" />
        </View>
      </>
    );
  }

  if (!conversation) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1" style={{ backgroundColor: '#262626' }}>
          <AppTopBar />
          <View className="flex-1 items-center justify-center px-6">
            <AppText align="center" className="text-white" variant="title">
              Conversation unavailable
            </AppText>
            <AppText align="center" className="mt-2 text-[#B8B2AB]">
              This chat could not be found right now.
            </AppText>
            <Pressable className="mt-5" onPress={() => router.replace('/chat_demo' as never)}>
              <AppText tone="signal">Open chat demo</AppText>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        style={{ backgroundColor: '#262626' }}>
        <View
          className="flex-row items-center gap-3 px-4 pb-4"
          style={{ paddingTop: Math.max(insets.top + 8, 16) }}>
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full bg-[#2E2C2B] active:opacity-70"
            onPress={() => router.back()}>
            <Ionicons color="#F3F0EB" name="chevron-back" size={22} />
          </Pressable>

          <ChatDemoAvatar conversation={conversation} size={52} />

          <View className="flex-1 gap-0.5">
            <AppText className="text-white" numberOfLines={1} variant="title">
              {conversation.name}
            </AppText>
            <AppText className="text-[#9C9893]" numberOfLines={1}>
              Direct message
            </AppText>
            {invitationMessage ? (
              <AppText className="text-[#7DD37D]" numberOfLines={1} variant="code">
                {invitationMessage}
              </AppText>
            ) : null}
            {invitationError ? (
              <AppText className="text-[#FF8A7A]" numberOfLines={1} variant="code">
                {invitationError}
              </AppText>
            ) : null}
          </View>

          <Pressable
            className="min-h-11 flex-row items-center justify-center gap-2 rounded-full bg-[#FF9D3D] px-4 active:opacity-80"
            disabled={createStartupInvitationMutation.isPending || invitationSent}
            onPress={() => void handleAddToTeam()}
            style={{ opacity: createStartupInvitationMutation.isPending || invitationSent ? 0.6 : 1 }}>
            {createStartupInvitationMutation.isPending ? (
              <ActivityIndicator color="#1F160C" size="small" />
            ) : (
              <Ionicons
                color="#1F160C"
                name={invitationSent ? 'checkmark-outline' : 'person-add-outline'}
                size={18}
              />
            )}
            <AppText className="text-[#1F160C]" variant="bodyStrong">
              {createStartupInvitationMutation.isPending
                ? 'Sending'
                : invitationSent
                  ? 'Invited'
                  : 'Add to Team'}
            </AppText>
          </Pressable>
        </View>

        <View className="mx-4 h-px bg-[#3A3938]" />

        <FlatList
          ref={listRef}
          className="flex-1"
          contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingVertical: 20 }}
          data={messages}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            messagesQuery.isLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator color="#F59E0B" />
              </View>
            ) : (
              <View className="items-center py-8">
                <AppText className="text-[#9C9893]">No messages in this demo chat yet.</AppText>
              </View>
            )
          }
          renderItem={({ item }) => <MessageBubble message={item} />}
          showsVerticalScrollIndicator={false}
        />

        {messagesQuery.error instanceof Error ? (
          <View className="px-4 py-3">
            <AppText tone="danger">{messagesQuery.error.message}</AppText>
          </View>
        ) : null}

        {appendMessageMutation.error instanceof Error ? (
          <View className="px-4 py-2">
            <AppText tone="danger">Send failed: {appendMessageMutation.error.message}</AppText>
          </View>
        ) : null}

        <View className="border-t border-[#3A3938] px-4 pb-8 pt-3">
          <View className="flex-row items-end gap-3">
            <View className="flex-1 rounded-full border border-[#444240] bg-[#2E2C2B] px-5 py-3">
              <TextInput
                className="font-body text-[16px] text-white"
                multiline
                onChangeText={setDraftMessage}
                placeholder="Type a demo message..."
                placeholderTextColor="#7D7974"
                value={draftMessage}
              />
            </View>

            <Pressable
              className="h-14 w-14 items-center justify-center rounded-full bg-[#FF9D3D] active:opacity-70"
              disabled={!draftMessage.trim() || isSending}
              onPress={() => void handleSend()}
              style={{ opacity: !draftMessage.trim() || isSending ? 0.5 : 1 }}>
              {isSending ? (
                <ActivityIndicator color="#1F160C" size="small" />
              ) : (
                <Ionicons color="#1F160C" name="paper-plane-outline" size={24} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
