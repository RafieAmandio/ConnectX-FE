import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { AppButton, AppText } from '@shared/components';

type ChatEmptyStateProps = {
  description: string;
  onExplore: () => void;
  title: string;
};

export function ChatEmptyState({ description, onExplore, title }: ChatEmptyStateProps) {
  return (
    <View className="flex-1 justify-center px-1 py-10">
      <View
        className="overflow-hidden rounded-[24px] border"
        style={{ backgroundColor: '#2B2B2B', borderColor: 'rgba(255, 255, 255, 0.08)' }}>
        <View className="gap-6 px-5 py-6">
          <View className="flex-row items-start gap-4">
            <View
              className="h-14 w-14 items-center justify-center rounded-[18px] border"
              style={{ backgroundColor: '#34302B', borderColor: 'rgba(255, 179, 94, 0.18)' }}>
              <Ionicons color="#FFB35E" name="chatbubble-ellipses-outline" size={26} />
            </View>

            <View className="min-w-0 flex-1 gap-2">
              <AppText className="text-white" variant="title">
                {title}
              </AppText>
              <AppText className="text-[#B8B2AB]">{description}</AppText>
            </View>
          </View>

          <AppButton
            className="rounded-[18px] border bg-[#3A3128]"
            label="Explore more"
            onPress={onExplore}
            style={{ borderColor: 'rgba(255, 179, 94, 0.16)' }}
            variant="ghost"
          />
        </View>
      </View>
    </View>
  );
}
