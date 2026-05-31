import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  ListRenderItemInfo,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  TextInput,
  useWindowDimensions,
  View,
  type DimensionValue,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, AppTopBar } from '@shared/components';
import { buildApiUrl } from '@shared/services/api/config';

import { ChatEmptyState } from '@features/chat/components/chat-empty-state';
import {
  useChatDemoConversations,
  useChatDemoMessages,
  useChatDemoRoomRealtime,
  useMarkChatDemoConversationRead,
  useSendChatDemoMediaMessage,
  useSendChatDemoMessage,
  useUploadChatDemoMedia,
} from '@features/chat/hooks/use-chat-demo';
import type {
  ChatDemoUploadedMedia,
  SendChatDemoMediaMessageType,
} from '@features/chat/services/chat-demo-api-service';
import type { ChatConversation, ChatMessage } from '@features/chat/types/chat.types';
import { useDiscoveryOnboardingRequiredHandler } from '@features/home/hooks/use-discovery-onboarding-required-handler';
import { useViewerContext } from '@features/home/hooks/use-viewer-context';
import { StartupInvitationComposer } from '@features/team/components/startup-invitation-composer';

type PendingChatDemoMedia = {
  fileName: string | null;
  fileSize: number | null;
  localUri: string;
  mediaType: SendChatDemoMediaMessageType;
  mimeType: string | null;
  uploadedMedia: ChatDemoUploadedMedia;
};

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

type MessageTextPart =
  | { text: string; type: 'text' }
  | { text: string; type: 'link'; url: string };

const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<]+)/gi;
const TRAILING_URL_PUNCTUATION_PATTERN = /[),.!?:;]+$/;
const COMPOSER_INPUT_MAX_HEIGHT = 92;
const CHAT_DEMO_DOCUMENT_TYPES = ['application/pdf', 'audio/*'] as const;

function withAlpha(hexColor: string, alpha: number) {
  const normalized = hexColor.replace('#', '');

  if (normalized.length !== 6) {
    return hexColor;
  }

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function SkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: React.ComponentProps<typeof Animated.View>['style'];
}) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 920 }), -1, true);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.42, 0.86]),
  }));

  return (
    <Animated.View
      className={className}
      style={[{ backgroundColor: withAlpha('#FFFFFF', 0.12) }, animatedStyle, style]}
    />
  );
}

function ConversationRowSkeleton({ unread = false }: { unread?: boolean }) {
  return (
    <View className="flex-row items-center gap-3 px-1 py-2.5">
      <SkeletonBlock
        className="h-[52px] w-[52px] rounded-full"
        style={{ backgroundColor: unread ? withAlpha('#F59E0B', 0.22) : withAlpha('#FFFFFF', 0.12) }}
      />

      <View className="min-w-0 flex-1 border-b border-[#353535] pb-3">
        <View className="flex-row items-center justify-between gap-3">
          <SkeletonBlock className="h-[18px] w-[46%] rounded-full" />
          <SkeletonBlock className="h-3.5 w-12 rounded-full" />
        </View>

        <View className="mt-3 flex-row items-center gap-3">
          <SkeletonBlock className="h-3.5 flex-1 rounded-full" />
          {unread ? (
            <SkeletonBlock
              className="h-5 w-5 rounded-full"
              style={{ backgroundColor: withAlpha('#F59E0B', 0.24) }}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function ChatListSkeleton() {
  return (
    <View className="flex-1 px-4 pt-3" accessibilityLabel="Loading conversations">
      <View className="pb-5 pt-1">
        <SkeletonBlock className="h-10 w-40 rounded-[12px]" />
      </View>

      <View className="gap-1">
        <ConversationRowSkeleton unread />
        <ConversationRowSkeleton />
        <ConversationRowSkeleton unread />
        <ConversationRowSkeleton />
        <ConversationRowSkeleton />
      </View>
    </View>
  );
}

function MessageBubbleSkeleton({
  outgoing = false,
  width = '68%',
}: {
  outgoing?: boolean;
  width?: DimensionValue;
}) {
  return (
    <View className={outgoing ? 'items-end' : 'items-start'}>
      <View
        className={
          outgoing
            ? 'max-w-[82%] rounded-[26px] rounded-br-[10px] px-5 py-4'
            : 'max-w-[82%] rounded-[26px] rounded-bl-[10px] px-5 py-4'
        }
        style={{ backgroundColor: outgoing ? '#4C351D' : '#313131', width }}>
        <SkeletonBlock
          className="h-3.5 rounded-full"
          style={{ backgroundColor: outgoing ? withAlpha('#FFD39A', 0.24) : withAlpha('#FFFFFF', 0.12) }}
        />
        <SkeletonBlock
          className="mt-2 h-3.5 w-[72%] rounded-full"
          style={{ backgroundColor: outgoing ? withAlpha('#FFD39A', 0.2) : withAlpha('#FFFFFF', 0.1) }}
        />
      </View>
    </View>
  );
}

function ChatRoomSkeleton() {
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1" style={{ backgroundColor: '#262626' }}>
        <View
          className="flex-row items-center gap-3 px-4 pb-4"
          style={{ paddingTop: Math.max(insets.top + 8, 16) }}>
          <SkeletonBlock className="h-11 w-11 rounded-full" />
          <SkeletonBlock
            className="h-[52px] w-[52px] rounded-full"
            style={{ backgroundColor: withAlpha('#F59E0B', 0.2) }}
          />
          <View className="flex-1 gap-2">
            <SkeletonBlock className="h-5 w-[54%] rounded-full" />
            <SkeletonBlock className="h-3.5 w-[72%] rounded-full" />
          </View>
        </View>

        <View className="mx-4 h-px bg-[#3A3938]" />

        <View className="flex-1 justify-end gap-4 px-4 py-5">
          <MessageBubbleSkeleton width="64%" />
          <MessageBubbleSkeleton outgoing width="72%" />
          <MessageBubbleSkeleton width="56%" />
          <MessageBubbleSkeleton outgoing width="48%" />
          <MessageBubbleSkeleton width="76%" />
        </View>

        <View className="border-t border-[#3A3938] px-4 pb-8 pt-3">
          <View className="flex-row items-end gap-3">
            <SkeletonBlock className="h-11 w-11 rounded-full" />
            <SkeletonBlock className="h-11 flex-1 rounded-[24px]" />
            <SkeletonBlock
              className="h-11 w-11 rounded-full"
              style={{ backgroundColor: withAlpha('#F59E0B', 0.22) }}
            />
          </View>
        </View>
      </View>
    </>
  );
}

function MessagesSkeleton() {
  return (
    <View className="gap-4 py-2" accessibilityLabel="Loading messages">
      <MessageBubbleSkeleton width="64%" />
      <MessageBubbleSkeleton outgoing width="72%" />
      <MessageBubbleSkeleton width="56%" />
    </View>
  );
}

function normalizeMessageUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function normalizeMediaUrl(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  if (/^(?:https?:|file:|content:|data:|blob:)/i.test(trimmedValue)) {
    return trimmedValue;
  }

  return buildApiUrl(trimmedValue);
}

function getMediaMessageType(mimeType: string | null | undefined): SendChatDemoMediaMessageType {
  return mimeType?.trim().toLowerCase().startsWith('image/') ? 'image' : 'file';
}

function getAttachmentKind(mimeType: string | null | undefined) {
  const normalizedMimeType = mimeType?.trim().toLowerCase();

  if (normalizedMimeType === 'application/pdf') {
    return 'pdf';
  }

  if (normalizedMimeType?.startsWith('audio/')) {
    return 'audio';
  }

  return 'file';
}

function getAttachmentIconName(mimeType: string | null | undefined) {
  const kind = getAttachmentKind(mimeType);

  if (kind === 'pdf') {
    return 'document-text-outline' as const;
  }

  if (kind === 'audio') {
    return 'musical-notes-outline' as const;
  }

  return 'document-outline' as const;
}

function getAttachmentLabel(mimeType: string | null | undefined) {
  const kind = getAttachmentKind(mimeType);

  if (kind === 'pdf') {
    return 'PDF document';
  }

  if (kind === 'audio') {
    return 'Audio file';
  }

  return 'Attachment';
}

function formatFileSize(value: number | null | undefined) {
  if (!value || value <= 0) {
    return null;
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 102.4) / 10} KB`;
  }

  return `${Math.round(value / (1024 * 102.4)) / 10} MB`;
}

function openMediaUrl(value: string | null | undefined) {
  const mediaUrl = normalizeMediaUrl(value);

  if (!mediaUrl) {
    Alert.alert('Attachment unavailable', 'This attachment could not be opened.');
    return;
  }

  void Linking.openURL(mediaUrl).catch(() => {
    Alert.alert('Unable to open attachment', 'This attachment could not be opened.');
  });
}

function getImageDownloadFileName(imageUrl: string) {
  const cleanPath = imageUrl.split('?')[0]?.split('#')[0] ?? '';
  const fileName = cleanPath.split('/').pop()?.trim();

  if (fileName && /\.(?:jpe?g|png|gif|webp|heic|heif)$/i.test(fileName)) {
    return fileName;
  }

  return `connectx-image-${Date.now()}.jpg`;
}

async function getSaveableImageUri(imageUrl: string) {
  if (/^(?:file|content):/i.test(imageUrl)) {
    return imageUrl;
  }

  if (!/^https?:\/\//i.test(imageUrl)) {
    throw new Error('This image format cannot be saved.');
  }

  if (!FileSystem.cacheDirectory) {
    throw new Error('Image cache is unavailable.');
  }

  const destinationUri = `${FileSystem.cacheDirectory}${getImageDownloadFileName(imageUrl)}`;
  const downloadedImage = await FileSystem.downloadAsync(imageUrl, destinationUri);

  return downloadedImage.uri;
}

async function saveImageToLibrary(imageUrl: string | null) {
  if (!imageUrl) {
    throw new Error('This image is unavailable.');
  }

  const permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);

  if (!permission.granted) {
    throw new Error('Photo library permission is required to save images.');
  }

  const localUri = await getSaveableImageUri(imageUrl);

  await MediaLibrary.saveToLibraryAsync(localUri);
}

function ImagePreviewModal({
  imageUrl,
  onClose,
  visible,
}: {
  imageUrl: string | null;
  onClose: () => void;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [isSaving, setSaving] = React.useState(false);
  const handleSave = React.useCallback(async () => {
    if (isSaving) {
      return;
    }

    setSaving(true);

    try {
      await saveImageToLibrary(imageUrl);
      Alert.alert('Image saved', 'The image was saved to your photo library.');
    } catch (error) {
      Alert.alert(
        'Unable to save image',
        error instanceof Error ? error.message : 'This image could not be saved.'
      );
    } finally {
      setSaving(false);
    }
  }, [imageUrl, isSaving]);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View className="flex-1 bg-black">
        <View
          className="absolute right-4 z-10 flex-row gap-3"
          style={{ top: Math.max(insets.top + 8, 20) }}>
          <Pressable
            accessibilityLabel="Save image"
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
            disabled={isSaving}
            onPress={handleSave}>
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons color="#FFFFFF" name="download-outline" size={24} />
            )}
          </Pressable>

          <Pressable
            accessibilityLabel="Close image preview"
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
            onPress={onClose}>
            <Ionicons color="#FFFFFF" name="close" size={26} />
          </Pressable>
        </View>

        <Pressable className="flex-1 items-center justify-center" onPress={onClose}>
          {imageUrl ? (
            <Image
              contentFit="contain"
              source={{ uri: imageUrl }}
              style={{ height: '100%', width: '100%' }}
            />
          ) : null}
        </Pressable>
      </View>
    </Modal>
  );
}

function splitMessageText(value: string): MessageTextPart[] {
  const parts: MessageTextPart[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(URL_PATTERN)) {
    const matchedText = match[0];
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      parts.push({ text: value.slice(lastIndex, matchIndex), type: 'text' });
    }

    const linkText = matchedText.replace(TRAILING_URL_PUNCTUATION_PATTERN, '');
    const trailingText = matchedText.slice(linkText.length);

    if (linkText) {
      parts.push({ text: linkText, type: 'link', url: normalizeMessageUrl(linkText) });
    }

    if (trailingText) {
      parts.push({ text: trailingText, type: 'text' });
    }

    lastIndex = matchIndex + matchedText.length;
  }

  if (lastIndex < value.length) {
    parts.push({ text: value.slice(lastIndex), type: 'text' });
  }

  return parts;
}

function MessageText({
  isLinkable,
  isOutgoing,
  text,
}: {
  isLinkable: boolean;
  isOutgoing: boolean;
  text: string;
}) {
  if (!isLinkable) {
    return <>{text}</>;
  }

  return (
    <>
      {splitMessageText(text).map((part, index) => {
        if (part.type === 'text') {
          return <React.Fragment key={`${part.type}-${index}`}>{part.text}</React.Fragment>;
        }

        return (
          <AppText
            className={isOutgoing ? 'text-[#4A3215] underline' : 'text-[#8BCBFF] underline'}
            key={`${part.url}-${index}`}
            onPress={() => {
              void Linking.openURL(part.url).catch(() => {
                Alert.alert('Unable to open link', 'This link could not be opened.');
              });
            }}>
            {part.text}
          </AppText>
        );
      })}
    </>
  );
}

function ChatDemoAvatar({ conversation, size = 56 }: { conversation: ChatConversation; size?: number }) {
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
  isUnavailable,
  onExplore,
}: {
  isUnavailable: boolean;
  onExplore: () => void;
}) {
  const title = isUnavailable ? 'Unable to load messages' : 'No conversations yet';
  const description =
    'Messages will appear here when you get connects. Explore more profiles to start a conversation.';

  return (
    <ChatEmptyState
      description={description}
      exploreButtonLabelClassName="text-white"
      onExplore={onExplore}
      title={title}
    />
  );
}

export function ChatDemoListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const conversationsQuery = useChatDemoConversations({
    refetchInterval: isFocused ? 10_000 : false,
  });
  const handleOnboardingRequired = useDiscoveryOnboardingRequiredHandler();
  const markConversationReadMutation = useMarkChatDemoConversationRead();
  const refetchConversations = conversationsQuery.refetch;
  const conversations = conversationsQuery.data ?? [];
  const hasConversations = conversations.length > 0;
  const [isPullRefreshing, setIsPullRefreshing] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      void refetchConversations();
    }, [refetchConversations])
  );

  React.useEffect(() => {
    if (conversationsQuery.isError) {
      handleOnboardingRequired(conversationsQuery.error);
    }
  }, [conversationsQuery.error, conversationsQuery.isError, handleOnboardingRequired]);

  const renderConversation = React.useCallback(
    ({ item }: ListRenderItemInfo<ChatConversation>) => (
      <ConversationCard
        conversation={item}
        onPress={() => {
          if (item.unreadCount > 0 && item.lastMessageId) {
            markConversationReadMutation.mutate({
              conversationId: item.id,
              lastReadMessageId: item.lastMessageId,
            });
          }

          router.push(`/chat_demo/${item.id}` as never);
        }}
      />
    ),
    [markConversationReadMutation, router]
  );

  const handlePullRefresh = React.useCallback(async () => {
    setIsPullRefreshing(true);

    try {
      await refetchConversations();
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refetchConversations]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1" style={{ backgroundColor: '#262626' }}>
        <AppTopBar />
        {conversationsQuery.isLoading && !hasConversations ? (
          <ChatListSkeleton />
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
                isUnavailable={conversationsQuery.error instanceof Error}
                onExplore={() => {
                  router.replace('/(tabs)' as never);
                }}
              />
            }
            ListHeaderComponent={
              <View className="pb-3 pt-1">
                <AppText className="text-white" variant="display">
                  Messages
                </AppText>

                {conversationsQuery.error instanceof Error && hasConversations ? (
                  <View
                    className="mt-4 rounded-[22px] border px-4 py-4"
                    style={{ backgroundColor: '#30251E', borderColor: 'rgba(255, 179, 94, 0.2)' }}>
                    <AppText className="text-[#FFE0BA]" variant="bodyStrong">
                      Some messages may be out of date
                    </AppText>
                    <AppText className="mt-1 text-[#D9B98E]">
                      {conversationsQuery.error.message}
                    </AppText>
                  </View>
                ) : null}
              </View>
            }
            refreshControl={
              <RefreshControl
                onRefresh={handlePullRefresh}
                refreshing={isPullRefreshing}
                tintColor="#F59E0B"
              />
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
  const { width: windowWidth } = useWindowDimensions();
  const isOutgoing = message.direction === 'outgoing';
  const mediaUrl = normalizeMediaUrl(message.media?.url);
  const thumbnailUrl = normalizeMediaUrl(message.media?.thumbnailUrl);
  const hasMediaUrl = Boolean(mediaUrl);
  const showBody = Boolean(message.body.trim());
  const [isImagePreviewVisible, setImagePreviewVisible] = React.useState(false);
  const [isCopyMenuVisible, setCopyMenuVisible] = React.useState(false);
  const [copyMenuPosition, setCopyMenuPosition] = React.useState({ left: 12, top: 12 });
  const [isCopied, setIsCopied] = React.useState(false);
  const bubbleRef = React.useRef<React.ElementRef<typeof View>>(null);
  const copiedFeedbackTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const attachmentSize = formatFileSize(message.media?.sizeBytes);

  React.useEffect(() => {
    return () => {
      if (copiedFeedbackTimeoutRef.current) {
        clearTimeout(copiedFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = React.useCallback(() => {
    if (!showBody) {
      return;
    }

    void Clipboard.setStringAsync(message.body);
    setCopyMenuVisible(false);
    setIsCopied(true);

    if (copiedFeedbackTimeoutRef.current) {
      clearTimeout(copiedFeedbackTimeoutRef.current);
    }

    copiedFeedbackTimeoutRef.current = setTimeout(() => {
      setIsCopied(false);
      copiedFeedbackTimeoutRef.current = null;
    }, 1_500);
  }, [message.body, showBody]);

  const handleLongPress = React.useCallback(() => {
    if (!showBody) {
      return;
    }

    bubbleRef.current?.measureInWindow((x, y, width) => {
      const menuWidth = 112;
      const left = isOutgoing ? x + width - menuWidth : x;

      setCopyMenuPosition({
        left: Math.min(Math.max(left, 12), windowWidth - menuWidth - 12),
        top: Math.max(y - 52, 12),
      });
      setCopyMenuVisible(true);
    });
  }, [isOutgoing, showBody, windowWidth]);

  return (
    <View className={isOutgoing ? 'items-end' : 'items-start'} ref={bubbleRef}>
      <Pressable
        accessibilityHint={showBody ? 'Long press to copy message' : undefined}
        delayLongPress={350}
        disabled={!showBody}
        className={
          isOutgoing
            ? 'max-w-[82%] rounded-[26px] rounded-br-[10px] bg-[#FF9D3D] px-5 py-4'
            : 'max-w-[82%] rounded-[26px] rounded-bl-[10px] bg-[#313131] px-5 py-4'
        }
        onLongPress={handleLongPress}>
        {message.type === 'image' && hasMediaUrl ? (
          <Pressable
            accessibilityLabel="Open image"
            accessibilityRole="imagebutton"
            className="active:opacity-80"
            onPress={() => setImagePreviewVisible(true)}>
            <Image
              contentFit="cover"
              source={{ uri: thumbnailUrl ?? mediaUrl ?? undefined }}
              style={{ borderRadius: 18, height: 220, width: 240 }}
            />
          </Pressable>
        ) : null}

        {message.type === 'image' && !hasMediaUrl ? (
          <View
            className="w-56 items-center gap-2 rounded-[18px] border border-white/10 px-4 py-5"
            style={{ backgroundColor: isOutgoing ? 'rgba(32, 21, 7, 0.08)' : '#292929' }}>
            <Ionicons color={isOutgoing ? '#5C3D18' : '#F7B05B'} name="image-outline" size={24} />
            <AppText
              align="center"
              className={isOutgoing ? 'text-[#5C3D18]' : 'text-[#B8B2AB]'}
              variant="code">
              Image unavailable
            </AppText>
          </View>
        ) : null}

        {message.type !== 'image' && hasMediaUrl ? (
          <Pressable
            className="w-56 flex-row items-center gap-3 rounded-[18px] border border-white/10 px-4 py-3 active:opacity-80"
            onPress={() => openMediaUrl(message.media?.url)}>
            <Ionicons
              color={isOutgoing ? '#5C3D18' : '#F7B05B'}
              name={getAttachmentIconName(message.media?.mimeType)}
              size={22}
            />
            <View className="min-w-0 flex-1">
              <AppText
                className={isOutgoing ? 'text-[#201507]' : 'text-[#F3F0EB]'}
                numberOfLines={1}
                variant="bodyStrong">
                {getAttachmentLabel(message.media?.mimeType)}
              </AppText>
              <AppText
                className={isOutgoing ? 'text-[#7C5526]' : 'text-[#AFA9A2]'}
                numberOfLines={1}
                variant="code">
                {attachmentSize ? `${attachmentSize} · Open` : 'Open attachment'}
              </AppText>
            </View>
          </Pressable>
        ) : null}

        {showBody || !message.type || message.type === 'text' ? (
          <AppText
            className={[
              isOutgoing ? 'text-[#201507]' : 'text-[#F3F0EB]',
              hasMediaUrl || message.type === 'image' ? 'mt-3' : '',
            ].join(' ')}>
            {showBody ? (
              <MessageText
                isLinkable={message.type !== 'image'}
                isOutgoing={isOutgoing}
                text={message.body}
              />
            ) : (
              'Message'
            )}
          </AppText>
        ) : null}
        <AppText className={isOutgoing ? 'mt-2 text-[#7C5526]' : 'mt-2 text-[#97928B]'} variant="code">
          {formatMessageTime(message.createdAt)}
          {isCopied ? ' · Copied' : ''}
        </AppText>
      </Pressable>
      {message.type === 'image' ? (
        <ImagePreviewModal
          imageUrl={mediaUrl}
          onClose={() => setImagePreviewVisible(false)}
          visible={isImagePreviewVisible}
        />
      ) : null}
      <Modal
        animationType="fade"
        onRequestClose={() => setCopyMenuVisible(false)}
        transparent
        visible={isCopyMenuVisible}>
        <Pressable className="flex-1" onPress={() => setCopyMenuVisible(false)}>
          <Pressable
            accessibilityLabel="Copy message"
            accessibilityRole="button"
            className="absolute flex-row items-center gap-2 rounded-[14px] bg-[#F3F0EB] px-4 py-3 active:opacity-80"
            onPress={handleCopy}
            style={{
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.24)',
              left: copyMenuPosition.left,
              top: copyMenuPosition.top,
            }}>
            <Ionicons color="#312719" name="copy-outline" size={18} />
            <AppText className="text-[#312719]" variant="bodyStrong">
              Copy
            </AppText>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function ChatDemoConversationScreen({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const viewerContext = useViewerContext();
  const conversationsQuery = useChatDemoConversations();
  const messagesQuery = useChatDemoMessages(conversationId);
  const handleOnboardingRequired = useDiscoveryOnboardingRequiredHandler();
  const sendMessageMutation = useSendChatDemoMessage(conversationId);
  const sendMediaMessageMutation = useSendChatDemoMediaMessage(conversationId);
  const uploadMediaMutation = useUploadChatDemoMedia();
  const [draftMessage, setDraftMessage] = React.useState('');
  const [pendingMedia, setPendingMedia] = React.useState<PendingChatDemoMedia | null>(null);
  const [inviteComposerVisible, setInviteComposerVisible] = React.useState(false);
  const [invitationSent, setInvitationSent] = React.useState(false);
  const [invitationMessage, setInvitationMessage] = React.useState<string | null>(null);
  const [invitationError, setInvitationError] = React.useState<string | null>(null);
  const [androidKeyboardOverlap, setAndroidKeyboardOverlap] = React.useState(0);
  const listRef = React.useRef<FlatList<ChatMessage>>(null);
  const containerFrameRef = React.useRef({ height: 0, y: 0 });
  const conversation = conversationsQuery.data?.find((item) => item.id === conversationId) ?? null;
  const messages = React.useMemo(
    () => [...(messagesQuery.data?.pages ?? [])].reverse().flatMap((page) => page.items),
    [messagesQuery.data]
  );
  const visibleMessages = React.useMemo(() => [...messages].reverse(), [messages]);
  const isSending = sendMessageMutation.isPending || sendMediaMessageMutation.isPending;
  const isUploadingMedia = uploadMediaMutation.isPending;
  const canInviteToTeam = viewerContext === 'startup';
  const inputBottomPadding =
    Platform.OS === 'ios' || androidKeyboardOverlap === 0 ? Math.max(insets.bottom + 8, 20) : 12;

  useChatDemoRoomRealtime(conversationId);

  React.useEffect(() => {
    if (conversationsQuery.isError) {
      handleOnboardingRequired(conversationsQuery.error);
    }
  }, [conversationsQuery.error, conversationsQuery.isError, handleOnboardingRequired]);

  React.useEffect(() => {
    if (messagesQuery.isError) {
      handleOnboardingRequired(messagesQuery.error);
    }
  }, [handleOnboardingRequired, messagesQuery.error, messagesQuery.isError]);

  const updateAndroidKeyboardOverlap = React.useCallback((keyboardY?: number) => {
    if (Platform.OS !== 'android') {
      return;
    }

    if (!keyboardY) {
      setAndroidKeyboardOverlap(0);
      return;
    }

    const { height, y } = containerFrameRef.current;

    if (height <= 0) {
      return;
    }

    setAndroidKeyboardOverlap(Math.max(y + height - keyboardY, 0));
  }, []);

  const handleContainerLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      containerFrameRef.current = event.nativeEvent.layout;

      if (Platform.OS === 'android') {
        updateAndroidKeyboardOverlap(Keyboard.metrics()?.screenY);
      }
    },
    [updateAndroidKeyboardOverlap]
  );

  React.useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      updateAndroidKeyboardOverlap(event.endCoordinates.screenY);
    });
    const changeSubscription = Keyboard.addListener('keyboardDidChangeFrame', (event) => {
      updateAndroidKeyboardOverlap(event.endCoordinates.screenY);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      updateAndroidKeyboardOverlap();
    });

    updateAndroidKeyboardOverlap(Keyboard.metrics()?.screenY);

    return () => {
      showSubscription.remove();
      changeSubscription.remove();
      hideSubscription.remove();
    };
  }, [updateAndroidKeyboardOverlap]);

  React.useEffect(() => {
    setPendingMedia(null);
  }, [conversationId]);

  const handleSend = React.useCallback(async () => {
    const body = draftMessage.trim();

    if ((!body && !pendingMedia) || isSending || isUploadingMedia) {
      return;
    }

    if (pendingMedia) {
      try {
        await sendMediaMessageMutation.mutateAsync({
          mediaType: pendingMedia.mediaType,
          previewUri: pendingMedia.localUri,
          uploadedMedia: pendingMedia.uploadedMedia,
        });
      } catch {
        return;
      }

      setPendingMedia(null);
    } else {
      try {
        await sendMessageMutation.mutateAsync(body);
      } catch {
        return;
      }
    }

    setDraftMessage('');
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ animated: true, offset: 0 });
    });
  }, [
    draftMessage,
    isSending,
    isUploadingMedia,
    pendingMedia,
    sendMediaMessageMutation,
    sendMessageMutation,
  ]);

  const handlePickImage = React.useCallback(async () => {
    if (isSending || isUploadingMedia) {
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

    try {
      const uploadedMedia = await uploadMediaMutation.mutateAsync({
        fileName: asset.fileName ?? null,
        fileSize: asset.fileSize ?? null,
        mimeType: asset.mimeType ?? null,
        uri: asset.uri,
      });

      setPendingMedia({
        fileName: asset.fileName ?? null,
        fileSize: asset.fileSize ?? null,
        localUri: asset.uri,
        mediaType: 'image',
        mimeType: asset.mimeType ?? null,
        uploadedMedia,
      });
    } catch {
      return;
    }
  }, [isSending, isUploadingMedia, uploadMediaMutation]);

  const handlePickDocument = React.useCallback(async () => {
    if (isSending || isUploadingMedia) {
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: [...CHAT_DEMO_DOCUMENT_TYPES],
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.uri) {
      Alert.alert('File unavailable', 'The selected file could not be read.');
      return;
    }

    try {
      const uploadedMedia = await uploadMediaMutation.mutateAsync({
        fileName: asset.name ?? null,
        fileSize: asset.size ?? null,
        mimeType: asset.mimeType ?? null,
        uri: asset.uri,
      });

      setPendingMedia({
        fileName: asset.name ?? null,
        fileSize: asset.size ?? null,
        localUri: asset.uri,
        mediaType: getMediaMessageType(asset.mimeType),
        mimeType: asset.mimeType ?? null,
        uploadedMedia,
      });
    } catch {
      return;
    }
  }, [isSending, isUploadingMedia, uploadMediaMutation]);

  const handlePickAttachment = React.useCallback(() => {
    if (isSending || isUploadingMedia) {
      return;
    }

    Alert.alert('Add attachment', undefined, [
      { text: 'Photo', onPress: () => void handlePickImage() },
      { text: 'PDF or audio', onPress: () => void handlePickDocument() },
      { style: 'cancel', text: 'Cancel' },
    ]);
  }, [handlePickDocument, handlePickImage, isSending, isUploadingMedia]);

  const handleAddToTeam = React.useCallback(() => {
    if (!canInviteToTeam || !conversation?.participantEmail || invitationSent) {
      return;
    }

    setInvitationMessage(null);
    setInvitationError(null);
    setInviteComposerVisible(true);
  }, [canInviteToTeam, conversation?.participantEmail, invitationSent]);

  if (conversationsQuery.isLoading && !conversation) {
    return <ChatRoomSkeleton />;
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
              <AppText tone="signal">Back to chats</AppText>
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        onLayout={handleContainerLayout}
        style={{ backgroundColor: '#262626', flex: 1 }}
        keyboardVerticalOffset={0}
        enabled={Platform.OS === 'ios'}>
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
              {conversation.headline?.trim() || 'Direct message'}
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

          {canInviteToTeam ? (
            <Pressable
              className="min-h-11 flex-row items-center justify-center gap-2 rounded-full bg-[#FF9D3D] px-4 active:opacity-80"
              disabled={invitationSent || !conversation.participantEmail}
              onPress={handleAddToTeam}
              style={{ opacity: invitationSent || !conversation.participantEmail ? 0.6 : 1 }}>
              <Ionicons
                color="#1F160C"
                name={invitationSent ? 'checkmark-outline' : 'person-add-outline'}
                size={18}
              />
              <AppText className="text-[#1F160C]" variant="bodyStrong">
                {invitationSent ? 'Invited' : 'Add to Team'}
              </AppText>
            </Pressable>
          ) : null}
        </View>

        <View className="mx-4 h-px bg-[#3A3938]" />

        <FlatList
          ref={listRef}
          className="flex-1"
          contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingVertical: 20 }}
          data={visibleMessages}
          inverted
          keyExtractor={(item) => item.id}
          ListFooterComponent={
            messagesQuery.hasNextPage ? (
              <Pressable
                className="items-center py-2 active:opacity-80"
                disabled={messagesQuery.isFetchingNextPage}
                onPress={() => {
                  void messagesQuery.fetchNextPage();
                }}>
                {messagesQuery.isFetchingNextPage ? (
                  <ActivityIndicator color="#F59E0B" size="small" />
                ) : (
                  <AppText className="text-[#F7B05B]" variant="code">
                    Load earlier messages
                  </AppText>
                )}
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            messagesQuery.isLoading ? (
              <MessagesSkeleton />
            ) : (
              <View className="items-center py-8">
                <AppText className="text-[#9C9893]">No messages in this chat yet.</AppText>
              </View>
            )
          }
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onEndReached={() => {
            if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
              void messagesQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.2}
          renderItem={({ item }) => <MessageBubble message={item} />}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        />

        {messagesQuery.error instanceof Error ? (
          <View className="px-4 py-3">
            <AppText tone="danger">{messagesQuery.error.message}</AppText>
          </View>
        ) : null}

        {sendMessageMutation.error instanceof Error ? (
          <View className="px-4 py-2">
            <AppText tone="danger">Send failed: {sendMessageMutation.error.message}</AppText>
          </View>
        ) : null}

        {!(sendMessageMutation.error instanceof Error) && sendMediaMessageMutation.error instanceof Error ? (
          <View className="px-4 py-2">
            <AppText tone="danger">Send failed: {sendMediaMessageMutation.error.message}</AppText>
          </View>
        ) : null}

        {uploadMediaMutation.error instanceof Error ? (
          <View className="px-4 py-2">
            <AppText tone="danger">Upload failed: {uploadMediaMutation.error.message}</AppText>
          </View>
        ) : null}

        <View
          className="border-t border-[#3A3938] px-4 pt-3"
          style={{ marginBottom: androidKeyboardOverlap, paddingBottom: inputBottomPadding }}>
          {pendingMedia ? (
            <View className="mb-3 flex-row items-center gap-3 rounded-[18px] border border-[#444240] bg-[#2E2C2B] p-2">
              {pendingMedia.mediaType === 'image' ? (
                <Image
                  contentFit="cover"
                  source={{ uri: pendingMedia.localUri }}
                  style={{ borderRadius: 12, height: 64, width: 64 }}
                />
              ) : (
                <View className="h-16 w-16 items-center justify-center rounded-[12px] bg-[#3A3938]">
                  <Ionicons
                    color="#F7B05B"
                    name={getAttachmentIconName(pendingMedia.mimeType)}
                    size={28}
                  />
                </View>
              )}
              <View className="flex-1">
                <AppText className="text-[#F3F0EB]" numberOfLines={1} variant="bodyStrong">
                  {pendingMedia.mediaType === 'image'
                    ? 'Image attached'
                    : pendingMedia.fileName || getAttachmentLabel(pendingMedia.mimeType)}
                </AppText>
                <AppText className="text-[#9C9893]" numberOfLines={1} variant="code">
                  {formatFileSize(pendingMedia.fileSize) ?? 'Ready to send'}
                </AppText>
              </View>
              <Pressable
                className="h-9 w-9 items-center justify-center rounded-full bg-[#3A3938] active:opacity-70"
                disabled={isSending}
                onPress={() => setPendingMedia(null)}>
                <Ionicons color="#F3F0EB" name="close-outline" size={22} />
              </Pressable>
            </View>
          ) : null}

          <View className="flex-row items-end gap-3">
            <Pressable
              className="h-11 w-11 items-center justify-center rounded-full bg-transparent active:opacity-70"
              disabled={isSending || isUploadingMedia}
              onPress={handlePickAttachment}
              style={{ opacity: isSending || isUploadingMedia ? 0.45 : 1 }}>
              {isUploadingMedia ? (
                <ActivityIndicator color="#9C9893" size="small" />
              ) : (
                <Ionicons color="#9C9893" name="attach-outline" size={26} />
              )}
            </Pressable>

            <View
              className="min-h-11 flex-1 justify-center rounded-[24px] border border-[#444240] bg-[#2E2C2B] px-4 py-2"
              style={{ maxHeight: COMPOSER_INPUT_MAX_HEIGHT + 16 }}>
              <TextInput
                className="font-body text-[15px] text-white"
                multiline
                onChangeText={setDraftMessage}
                placeholder="Type a message..."
                placeholderTextColor="#7D7974"
                scrollEnabled
                showSoftInputOnFocus
                style={{
                  maxHeight: COMPOSER_INPUT_MAX_HEIGHT,
                  minHeight: 24,
                  padding: 0,
                  textAlignVertical: 'top',
                }}
                value={draftMessage}
              />
            </View>

            <Pressable
              className="h-11 w-11 items-center justify-center rounded-full bg-[#FF9D3D] active:opacity-70"
              disabled={(!draftMessage.trim() && !pendingMedia) || isSending || isUploadingMedia}
              onPress={() => void handleSend()}
              style={{
                opacity: (!draftMessage.trim() && !pendingMedia) || isSending || isUploadingMedia ? 0.5 : 1,
              }}>
              {sendMessageMutation.isPending || sendMediaMessageMutation.isPending ? (
                <ActivityIndicator color="#1F160C" size="small" />
              ) : (
                <Ionicons color="#1F160C" name="paper-plane-outline" size={24} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      {canInviteToTeam ? (
        <StartupInvitationComposer
          initialEmail={conversation.participantEmail ?? ''}
          onClose={() => {
            setInviteComposerVisible(false);
          }}
          onSuccess={(message) => {
            setInvitationSent(true);
            setInvitationMessage(message);
          }}
          recipientName={conversation.name}
          visible={inviteComposerVisible}
        />
      ) : null}
    </>
  );
}
