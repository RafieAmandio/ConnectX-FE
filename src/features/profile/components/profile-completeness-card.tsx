import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@shared/components';
import { useTranslation } from '@shared/localization';

// "Complete your profile" notice (profileCompleteness from the backend, plus a missing photo).
// Rendered nothing when there is nothing to complete.
export function ProfileCompletenessCard({
  compact = false,
  missing = [],
  missingCount,
  onPress,
  photoMissing = false,
}: {
  // One line, no chips: for the deck, where the card needs the space.
  compact?: boolean;
  missing?: { key: string; label: string }[];
  missingCount?: number;
  onPress?: () => void;
  photoMissing?: boolean;
}) {
  const t = useTranslation();
  const count = missingCount ?? missing.length;

  if (count === 0 && !photoMissing) {
    return null;
  }

  const items = [
    ...(photoMissing ? [t('profile.completeness.photo')] : []),
    ...missing.slice(0, 4).map((item) => item.label),
  ];
  const extra = count - Math.min(missing.length, 4);

  return (
    <Pressable
      className={`gap-3 rounded-[20px] border px-4 active:opacity-90 ${compact ? 'py-3' : 'py-4'}`}
      disabled={!onPress}
      onPress={onPress}
      style={{ backgroundColor: '#2A2117', borderColor: 'rgba(255, 154, 62, 0.35)' }}>
      <View className="flex-row items-center gap-3">
        <Ionicons color="#FF9A3E" name="person-circle-outline" size={24} />
        <View className="min-w-0 flex-1">
          <AppText className="text-[15px]" variant="bodyStrong">
            {t('profile.completeness.title')}
          </AppText>
          <AppText className="text-[13px] leading-5" numberOfLines={compact ? 1 : undefined} tone="muted">
            {photoMissing && count === 0 ? t('profile.completeness.photoHint') : t('profile.completeness.hint')}
          </AppText>
        </View>
        {onPress ? <Ionicons color="#FF9A3E" name="chevron-forward" size={18} /> : null}
      </View>
      {!compact && (items.length || extra > 0) ? (
        <View className="flex-row flex-wrap gap-2">
          {items.map((label) => (
            <View key={label} className="rounded-full border border-[#5A3C18] px-3 py-1">
              <AppText className="text-[12px] text-[#FFB066]">{label}</AppText>
            </View>
          ))}
          {extra > 0 ? (
            <View className="rounded-full border border-[#5A3C18] px-3 py-1">
              <AppText className="text-[12px] text-[#FFB066]">{t('profile.completeness.more', { count: extra })}</AppText>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
