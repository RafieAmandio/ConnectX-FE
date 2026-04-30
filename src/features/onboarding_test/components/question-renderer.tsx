import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppCard, AppInput, AppText } from '@shared/components';
import { cn } from '@shared/utils/cn';

import type {
  CurrencyAmountValue,
  OnboardingAnswerValue,
  OnboardingOption,
  OnboardingQuestion,
} from '../types/onboarding.types';

const HOME_BACKGROUND = '#262626';

type QuestionRendererProps = {
  error?: string;
  hideSearchableDropdownResultsUntilQuery?: boolean;
  onChange: (value: OnboardingAnswerValue) => void;
  question: OnboardingQuestion;
  value: OnboardingAnswerValue | undefined;
  variant?: 'default' | 'dropdown_multi_select';
};

function getStringValue(value: OnboardingAnswerValue | undefined) {
  return typeof value === 'string' ? value : '';
}

function getNumberValue(value: OnboardingAnswerValue | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return typeof value === 'string' ? value : '';
}

function getArrayValue(value: OnboardingAnswerValue | undefined) {
  return Array.isArray(value) ? value : [];
}

function getCurrencyValue(value: OnboardingAnswerValue | undefined): CurrencyAmountValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      amount: '',
      currency: '',
    };
  }

  const candidate = value as Partial<CurrencyAmountValue>;

  return {
    amount: typeof candidate.amount === 'string' ? candidate.amount : '',
    currency: typeof candidate.currency === 'string' ? candidate.currency : '',
  };
}

function getSelectedLabel(options: OnboardingOption[] | undefined, value: string) {
  return options?.find((option) => option.value === value)?.label ?? value;
}

function groupOptions(options: OnboardingOption[] | undefined) {
  const groupedOptions = new Map<string, OnboardingOption[]>();

  for (const option of options ?? []) {
    const groupName = option.group ?? 'Options';
    const currentGroup = groupedOptions.get(groupName) ?? [];
    currentGroup.push(option);
    groupedOptions.set(groupName, currentGroup);
  }

  return Array.from(groupedOptions.entries());
}

type AnchorLayout = {
  height: number;
  width: number;
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function DropdownOverlay({
  anchorRef,
  children,
  header,
  maxHeight,
  onClose,
  visible,
}: {
  anchorRef: React.RefObject<View | null>;
  children: React.ReactNode;
  header?: React.ReactNode;
  maxHeight: number;
  onClose: () => void;
  visible: boolean;
}) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [anchorLayout, setAnchorLayout] = React.useState<AnchorLayout | null>(null);

  React.useEffect(() => {
    if (!visible) {
      setAnchorLayout(null);
      return;
    }

    requestAnimationFrame(() => {
      anchorRef.current?.measureInWindow((x, y, width, height) => {
        setAnchorLayout({ height, width, x, y });
      });
    });
  }, [anchorRef, visible]);

  const horizontalPadding = 16;
  const verticalGap = 8;
  const fallbackWidth = windowWidth - horizontalPadding * 2;
  const anchorWidth = anchorLayout?.width ?? fallbackWidth;
  const overlayWidth = Math.min(
    Math.max(anchorWidth, Math.min(240, fallbackWidth)),
    fallbackWidth
  );
  const overlayLeft = anchorLayout
    ? clamp(
        anchorLayout.x,
        horizontalPadding,
        Math.max(horizontalPadding, windowWidth - overlayWidth - horizontalPadding)
      )
    : horizontalPadding;
  const anchorBottom = anchorLayout
    ? anchorLayout.y + anchorLayout.height
    : windowHeight - 80;
  const availableBelow = Math.max(
    0,
    windowHeight - anchorBottom - verticalGap - horizontalPadding
  );
  const availableAbove = Math.max(
    0,
    (anchorLayout?.y ?? 0) - verticalGap - horizontalPadding
  );
  const shouldOpenAbove = availableBelow < 180 && availableAbove > availableBelow;
  const availableHeight = shouldOpenAbove ? availableAbove : availableBelow;
  const overlayMaxHeight = Math.max(160, Math.min(maxHeight, availableHeight || maxHeight));
  const overlayTop = anchorLayout
    ? shouldOpenAbove
      ? Math.max(horizontalPadding, anchorLayout.y - verticalGap - overlayMaxHeight)
      : Math.min(
          anchorBottom + verticalGap,
          windowHeight - overlayMaxHeight - horizontalPadding
        )
    : windowHeight - overlayMaxHeight - 32;
  const scrollMaxHeight = Math.max(88, overlayMaxHeight - (header ? 72 : 0));

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}>
      <View
        className="flex-1"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
          }}
        />
        <AppCard
          className="border-transparent p-1"
          style={{
            backgroundColor: HOME_BACKGROUND,
            borderWidth: 0,
            boxShadow: 'none',
            left: overlayLeft,
            maxHeight: overlayMaxHeight,
            position: 'absolute',
            top: overlayTop,
            width: overlayWidth,
          }}>
          {header}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={{ maxHeight: scrollMaxHeight }}>
            {children}
          </ScrollView>
        </AppCard>
      </View>
    </Modal>
  );
}

type CardBadgeStyle = {
  bg: string;
  border: string;
  icon: string;
  iconColor: string;
  library?: 'ionicons' | 'mci';
};

const CARD_BADGE_STYLES: Record<string, CardBadgeStyle> = {
  team: {
    bg: '#3A2812',
    border: '#5A3C18',
    icon: 'people',
    iconColor: '#FF9A3E',
  },
  rocket: {
    bg: '#2C2712',
    border: '#4A4218',
    icon: 'albums',
    iconColor: '#D4B83A',
  },
  founder_rocket: {
    bg: '#3A2812',
    border: '#5A3C18',
    icon: 'rocket',
    iconColor: '#FF9A3E',
  },
  cofounder_handshake: {
    bg: '#2C2712',
    border: '#4A4218',
    icon: 'handshake',
    iconColor: '#D4B83A',
    library: 'mci',
  },
  team_member_group: {
    bg: '#1F242E',
    border: '#2E3547',
    icon: 'people-outline',
    iconColor: '#CBD4E0',
  },
  goal_cofounder: {
    bg: '#3A2812',
    border: '#5A3C18',
    icon: 'handshake-outline',
    iconColor: '#FF9A3E',
    library: 'mci',
  },
  goal_team_members: {
    bg: '#2C2712',
    border: '#4A4218',
    icon: 'people',
    iconColor: '#D4B83A',
  },
  goal_both: {
    bg: '#1F242E',
    border: '#2E3547',
    icon: 'disc-outline',
    iconColor: '#E5E7EB',
  },
  yes: {
    bg: '#3A2812',
    border: '#5A3C18',
    icon: 'checkmark-circle-outline',
    iconColor: '#FF9A3E',
  },
  no: {
    bg: '#1F242E',
    border: '#2E3547',
    icon: 'close-circle-outline',
    iconColor: '#CBD4E0',
  },
  availability_full_time: {
    bg: '#1F242E',
    border: '#2E3547',
    icon: 'rocket-outline',
    iconColor: '#CBD4E0',
  },
  availability_part_time: {
    bg: '#1F242E',
    border: '#2E3547',
    icon: 'time-outline',
    iconColor: '#CBD4E0',
  },
  availability_flexible: {
    bg: '#1F242E',
    border: '#2E3547',
    icon: 'globe-outline',
    iconColor: '#CBD4E0',
  },
  exp_founded: {
    bg: '#2A1C10',
    border: '#5A3C18',
    icon: 'flag',
    iconColor: '#FF9A3E',
  },
  exp_built: {
    bg: '#24162E',
    border: '#43285A',
    icon: 'construct',
    iconColor: '#C48BFF',
  },
  exp_worked: {
    bg: '#132A1E',
    border: '#265238',
    icon: 'people',
    iconColor: '#4ADE80',
  },
  exp_none: {
    bg: '#1F242E',
    border: '#2E3547',
    icon: 'leaf-outline',
    iconColor: '#CBD4E0',
  },
  cofounder_technical: {
    bg: '#1A2332',
    border: '#2E3E5A',
    icon: 'code-slash',
    iconColor: '#6BB4FF',
  },
  cofounder_business: {
    bg: '#2A1C10',
    border: '#5A3C18',
    icon: 'briefcase',
    iconColor: '#FF9A3E',
  },
  cofounder_product: {
    bg: '#24162E',
    border: '#43285A',
    icon: 'bulb',
    iconColor: '#C48BFF',
  },
  cofounder_growth: {
    bg: '#132A1E',
    border: '#265238',
    icon: 'trending-up',
    iconColor: '#4ADE80',
  },
  cofounder_ai: {
    bg: '#2B1224',
    border: '#512244',
    icon: 'sparkles',
    iconColor: '#FF6FCF',
  },
  cofounder_operations: {
    bg: '#172734',
    border: '#2C4C64',
    icon: 'settings',
    iconColor: '#7DD3FC',
  },
  cofounder_finance: {
    bg: '#2A2312',
    border: '#564518',
    icon: 'cash',
    iconColor: '#FFD166',
  },
  cofounder_partnerships: {
    bg: '#122726',
    border: '#1E4947',
    icon: 'git-network',
    iconColor: '#5EEAD4',
  },
  founder_solo: {
    bg: '#2A1C10',
    border: '#5A3C18',
    icon: 'person',
    iconColor: '#FF9A3E',
  },
  founder_two: {
    bg: '#24162E',
    border: '#43285A',
    icon: 'people',
    iconColor: '#C48BFF',
  },
  founder_three_plus: {
    bg: '#132A1E',
    border: '#265238',
    icon: 'people-circle',
    iconColor: '#4ADE80',
  },
  team_size_small: {
    bg: '#2A1C10',
    border: '#5A3C18',
    icon: 'person-add',
    iconColor: '#FF9A3E',
  },
  team_size_medium: {
    bg: '#24162E',
    border: '#43285A',
    icon: 'people',
    iconColor: '#C48BFF',
  },
  team_size_large: {
    bg: '#132A1E',
    border: '#265238',
    icon: 'people-circle',
    iconColor: '#4ADE80',
  },
  female: {
    bg: '#2A1626',
    border: '#56304D',
    icon: 'gender-female',
    iconColor: '#F472B6',
    library: 'mci',
  },
  male: {
    bg: '#142238',
    border: '#294766',
    icon: 'gender-male',
    iconColor: '#60A5FA',
    library: 'mci',
  },
  default: {
    bg: '#2A2117',
    border: '#3A2E1E',
    icon: 'ellipse',
    iconColor: '#FF9A3E',
  },
};

function getCardBadgeStyle(option: OnboardingOption): CardBadgeStyle {
  return CARD_BADGE_STYLES[option.icon ?? 'default'] ?? CARD_BADGE_STYLES.default;
}

function CardBadgeIcon({ badge, size = 26 }: { badge: CardBadgeStyle; size?: number }) {
  if (badge.library === 'mci') {
    return (
      <MaterialCommunityIcons
        color={badge.iconColor}
        name={badge.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
        size={size}
      />
    );
  }

  return (
    <Ionicons
      color={badge.iconColor}
      name={badge.icon as React.ComponentProps<typeof Ionicons>['name']}
      size={size}
    />
  );
}

function QuestionHeader({
  error,
  question,
}: {
  error?: string;
  question: OnboardingQuestion;
}) {
  const hasLabel = Boolean(question.label);
  const hasSubLabel = Boolean(question.sub_label);
  const hasHelper = Boolean(question.helper_text);

  if (!hasLabel && !hasSubLabel && !hasHelper && !error) {
    return null;
  }

  return (
    <View className="gap-2">
      {hasLabel || hasSubLabel ? (
        <View className="gap-1">
          {hasLabel ? (
            <AppText variant="subtitle">{question.label}</AppText>
          ) : null}
          {hasSubLabel ? (
            <AppText tone="muted">{question.sub_label}</AppText>
          ) : null}
        </View>
      ) : null}
      {hasHelper ? (
        <AppText tone="soft">{question.helper_text}</AppText>
      ) : null}
      {error ? (
        <AppText selectable tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const FIELD_BG = 'bg-[#292929]';
const FIELD_BORDER = 'border-[#383838]';
const FIELD_CLASS = `${FIELD_BG} ${FIELD_BORDER}`;

function TextLikeQuestion({
  error,
  keyboardType,
  multiline = false,
  onChange,
  question,
  value,
}: Omit<QuestionRendererProps, 'value'> & {
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url';
  multiline?: boolean;
  value: string;
}) {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View className="gap-3">
      <QuestionHeader error={error} question={question} />
      <AppInput
        autoCapitalize={question.type === 'email' || question.type === 'url' ? 'none' : 'sentences'}
        autoCorrect={question.type === 'email' || question.type === 'url' ? false : true}
        error={error}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 5 : 1}
        onBlur={() => setIsFocused(false)}
        onChangeText={(nextValue) => onChange(nextValue)}
        onFocus={() => setIsFocused(true)}
        placeholder={question.placeholder ?? undefined}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
        className={cn(
          FIELD_BG,
          isFocused ? 'border-[#FF9A3E]' : FIELD_BORDER,
          multiline && 'min-h-[140px] py-4'
        )}
      />
    </View>
  );
}

function SelectionCard({
  isSelected,
  onPress,
  option,
}: {
  isSelected: boolean;
  onPress: () => void;
  option: OnboardingOption;
}) {
  const badge = getCardBadgeStyle(option);
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  const wasSelectedRef = React.useRef(isSelected);

  React.useEffect(() => {
    if (isSelected && !wasSelectedRef.current) {
      scale.value = withSequence(
        withTiming(0.96, { duration: 90 }),
        withSpring(1.03, { damping: 8, stiffness: 180 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
      glow.value = withSequence(
        withTiming(1, { duration: 180 }),
        withTiming(0.55, { duration: 320 })
      );
    }
    if (!isSelected && wasSelectedRef.current) {
      glow.value = withTiming(0, { duration: 180 });
    }
    wasSelectedRef.current = isSelected;
  }, [isSelected, scale, glow]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value * 0.6,
    shadowRadius: 14 + glow.value * 10,
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.975, { duration: 90 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 220 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}>
      <Animated.View
        className={cn(
          'flex-row items-center gap-4 rounded-[22px] border px-4 py-4',
          isSelected
            ? 'border-[#FF9A3E] bg-[#1F1712]'
            : 'border-[#383838] bg-[#292929]'
        )}
        style={[
          {
            borderCurve: 'continuous',
            borderWidth: isSelected ? 2 : 1,
            shadowColor: '#FF9A3E',
            shadowOffset: { width: 0, height: 0 },
          },
          animatedStyle,
        ]}>
        <View
          className="h-14 w-14 items-center justify-center rounded-[16px] border"
          style={{
            backgroundColor: isSelected ? '#2A1C10' : badge.bg,
            borderColor: isSelected ? '#5A3C18' : badge.border,
            borderCurve: 'continuous',
          }}>
          <CardBadgeIcon badge={badge} />
        </View>
        <View className="flex-1 gap-1">
          <AppText variant="subtitle" className="text-[18px] text-white">
            {option.label}
          </AppText>
          {option.sub_label ? (
            <AppText className="text-[13px] text-text-muted">
              {option.sub_label}
            </AppText>
          ) : null}
        </View>
        {isSelected ? (
          <Ionicons color="#FF9A3E" name="checkmark" size={24} />
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

function SingleSelectCardQuestion({
  error,
  onChange,
  question,
  value,
}: QuestionRendererProps) {
  const currentValue = getStringValue(value);

  return (
    <View className="gap-3">
      <QuestionHeader error={error} question={question} />
      <View className="gap-3">
        {question.options?.map((option) => (
          <SelectionCard
            key={option.id}
            isSelected={currentValue === option.value}
            onPress={() => onChange(option.value)}
            option={option}
          />
        ))}
      </View>
    </View>
  );
}

function SingleSelectRadioQuestion({
  error,
  onChange,
  question,
  value,
}: QuestionRendererProps) {
  const currentValue = getStringValue(value);

  return (
    <View className="gap-3">
      <QuestionHeader error={error} question={question} />
      <View className="gap-2">
        {question.options?.map((option) => {
          const isSelected = currentValue === option.value;

          return (
            <Pressable
              key={option.id}
              className={cn(
                'flex-row items-center gap-3 rounded-[18px] border px-4 py-4',
                isSelected
                  ? 'border-[#FF9A3E] bg-[#1F1712]'
                  : 'border-[#383838] bg-[#292929]'
              )}
              style={{ borderWidth: isSelected ? 2 : 1 }}
              onPress={() => onChange(option.value)}>
              <View
                className={cn(
                  'h-5 w-5 items-center justify-center rounded-full border-2',
                  isSelected
                    ? 'border-[#FF9A3E] bg-[#FF9A3E]'
                    : 'border-[#5A6074] bg-transparent'
                )}>
                {isSelected ? (
                  <Ionicons color="#1A1208" name="checkmark" size={12} />
                ) : null}
              </View>
              <View className="flex-1 gap-1">
                <AppText
                  variant="bodyStrong"
                  className={cn(isSelected ? 'text-[#FF9A3E]' : 'text-white')}>
                  {option.label}
                </AppText>
                {option.sub_label ? (
                  <AppText tone="muted">{option.sub_label}</AppText>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MultiSelectCardQuestion({
  error,
  onChange,
  question,
  value,
}: QuestionRendererProps) {
  const currentValues = getArrayValue(value);

  return (
    <View className="gap-3">
      <QuestionHeader error={error} question={question} />
      <View className="gap-3">
        {question.options?.map((option) => {
          const isSelected = currentValues.includes(option.value);
          const badge = getCardBadgeStyle(option);

          return (
            <Pressable
              key={option.id}
              onPress={() => {
                if (isSelected) {
                  onChange(currentValues.filter((item) => item !== option.value));
                  return;
                }
                onChange([...currentValues, option.value]);
              }}>
              <View
                className={cn(
                  'flex-row items-center gap-3 rounded-[20px] border px-4 py-3.5',
                  isSelected
                    ? 'border-[#FF9A3E] bg-[#1F1712]'
                    : 'border-[#383838] bg-[#292929]'
                )}
                style={{ borderCurve: 'continuous', borderWidth: isSelected ? 2 : 1 }}>
                <View
                  className="h-9 w-9 items-center justify-center rounded-[10px]"
                  style={{
                    backgroundColor: badge.bg,
                    borderCurve: 'continuous',
                  }}>
                  <CardBadgeIcon badge={badge} size={18} />
                </View>
                <View className="flex-1 gap-1">
                  <AppText variant="subtitle" className="text-[16px] text-white">
                    {option.label}
                  </AppText>
                  {option.sub_label ? (
                    <AppText className="text-[13px] text-text-muted">
                      {option.sub_label}
                    </AppText>
                  ) : null}
                </View>
                <View
                  className={cn(
                    'h-6 w-6 items-center justify-center rounded-[8px] border-2',
                    isSelected
                      ? 'border-[#FF9A3E] bg-[#FF9A3E]'
                      : 'border-[#5A6074] bg-transparent'
                  )}>
                  {isSelected ? (
                    <Ionicons color="#1A1208" name="checkmark" size={14} />
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MultiSelectChipQuestion({
  error,
  onChange,
  question,
  value,
}: QuestionRendererProps) {
  const currentValues = getArrayValue(value);

  return (
    <View className="gap-3">
      <QuestionHeader error={error} question={question} />
      <View className="flex-row flex-wrap gap-2">
        {question.options?.map((option) => {
          const isSelected = currentValues.includes(option.value);

          return (
            <Pressable
              key={option.id}
              className="flex-row items-center gap-2 rounded-full px-4 py-2.5"
              style={{
                backgroundColor: '#292929',
                borderColor: isSelected ? '#FF9A3E' : '#383838',
                borderWidth: isSelected ? 2 : 1,
              }}
              onPress={() => {
                if (isSelected) {
                  onChange(currentValues.filter((item) => item !== option.value));
                  return;
                }

                onChange([...currentValues, option.value]);
              }}>
              <AppText
                variant="bodyStrong"
                className={cn(isSelected ? 'text-[#FF9A3E]' : 'text-white')}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MultiSelectDropdownQuestion({
  error,
  onChange,
  question,
  value,
}: QuestionRendererProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const triggerRef = React.useRef<View | null>(null);
  const inputRef = React.useRef<React.ComponentRef<typeof TextInput>>(null);
  const currentValues = getArrayValue(value);
  const maxSelections = question.validation?.max_selections ?? Infinity;
  const atLimit = currentValues.length >= maxSelections;

  const selectedLabels = React.useMemo(
    () =>
      currentValues
        .map((currentValue) => getSelectedLabel(question.options, currentValue))
        .filter(Boolean),
    [currentValues, question.options]
  );

  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return question.options ?? [];
    }

    return (question.options ?? []).filter((option) => {
      const haystack = `${option.label} ${option.group ?? ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, question.options]);

  const displayLabel =
    selectedLabels.length === 0
      ? question.placeholder ?? 'Select options'
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selected`;

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  const closeDropdown = () => {
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const toggle = (optionValue: string) => {
    if (currentValues.includes(optionValue)) {
      onChange(currentValues.filter((item) => item !== optionValue));
      return;
    }

    if (atLimit) {
      return;
    }

    onChange([...currentValues, optionValue]);
  };

  return (
    <View
      className="gap-3"
      style={{ zIndex: isOpen ? 40 : 1, elevation: isOpen ? 12 : 0 }}>
      <QuestionHeader error={error} question={question} />
      <View>
        <Pressable
          ref={triggerRef}
          style={{ height: 56 }}
          className={cn(
            'flex-row items-center justify-between rounded-[16px] border px-4',
            isOpen ? 'border-[#FF9A3E] bg-[#2A2117]' : FIELD_CLASS
          )}
          onPress={() => (isOpen ? closeDropdown() : setIsOpen(true))}>
          <View className="flex-1">
            <AppText
              className={cn(
                selectedLabels.length > 0 ? 'text-white' : 'text-text-soft',
                isOpen && 'text-[#FF9A3E]'
              )}
              numberOfLines={1}>
              {displayLabel}
            </AppText>
          </View>
          <View className="ml-3 flex-row items-center gap-2">
            {selectedLabels.length > 1 ? (
              <View
                className="min-w-6 items-center rounded-full px-2 py-0.5"
                style={{ backgroundColor: '#FF9A3E' }}>
                <AppText
                  variant="label"
                  className="text-[10px]"
                  style={{ color: '#1A1208', fontVariant: ['tabular-nums'] }}>
                  {selectedLabels.length}
                </AppText>
              </View>
            ) : null}
            <AppText
              variant="label"
              className="text-[10px]"
              style={{ color: isOpen ? '#FF9A3E' : '#98A2B3' }}>
              {isOpen ? '▲' : '▼'}
            </AppText>
          </View>
        </Pressable>

        <DropdownOverlay
          anchorRef={triggerRef}
          header={
            <View
              className="mb-1 flex-row items-center gap-2 rounded-[14px] border px-3"
              style={{
                backgroundColor: '#292929',
                borderColor: query ? '#FF9A3E' : '#383838',
                height: 52,
              }}>
              <Ionicons color={query ? '#FF9A3E' : '#98A2B3'} name="search" size={18} />
              <TextInput
                ref={inputRef}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setQuery}
                placeholder={question.placeholder ?? 'Search'}
                placeholderTextColor="#667085"
                value={query}
                className="flex-1 font-body text-[15px] text-white"
                style={{ paddingVertical: 0 }}
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons color="#98A2B3" name="close-circle" size={18} />
                </Pressable>
              ) : null}
            </View>
          }
          maxHeight={460}
          onClose={closeDropdown}
          visible={isOpen}>
          {filteredOptions.map((option) => {
            const isSelected = currentValues.includes(option.value);
            const isDisabled = !isSelected && atLimit;

            return (
              <Pressable
                key={option.id}
                disabled={isDisabled}
                className={cn(
                  'flex-row items-center gap-3 rounded-[12px] px-3 py-3',
                  isSelected ? 'bg-[#2A2117]' : 'bg-transparent',
                  isDisabled && 'opacity-40'
                )}
                onPress={() => toggle(option.value)}>
                <View
                  className={cn(
                    'h-5 w-5 items-center justify-center rounded-[6px] border-2',
                    isSelected
                      ? 'border-[#FF9A3E] bg-[#FF9A3E]'
                      : 'border-[#5A6074] bg-transparent'
                  )}>
                  {isSelected ? (
                    <Ionicons color="#1A1208" name="checkmark" size={12} />
                  ) : null}
                </View>
                <View className="flex-1 gap-1">
                  <AppText
                    variant="bodyStrong"
                    className={cn(isSelected ? 'text-[#FF9A3E]' : 'text-white')}>
                    {option.label}
                  </AppText>
                  {option.sub_label ? (
                    <AppText tone="muted">{option.sub_label}</AppText>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
          {filteredOptions.length === 0 ? (
            <View className="px-3 py-4">
              <AppText tone="muted">No results</AppText>
            </View>
          ) : null}
        </DropdownOverlay>
      </View>
    </View>
  );
}

function SearchableMultiSelectDropdownQuestion({
  error,
  onChange,
  question,
  value,
}: QuestionRendererProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const triggerRef = React.useRef<View | null>(null);
  const inputRef = React.useRef<React.ComponentRef<typeof TextInput>>(null);
  const currentValues = getArrayValue(value);
  const maxSelections = question.validation?.max_selections ?? Infinity;
  const atLimit = currentValues.length >= maxSelections;

  const selectedLabels = React.useMemo(
    () =>
      currentValues
        .map((currentValue) => getSelectedLabel(question.options, currentValue))
        .filter(Boolean),
    [currentValues, question.options]
  );

  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return question.options ?? [];
    }

    return (question.options ?? []).filter((option) => {
      const haystack = `${option.label} ${option.group ?? ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, question.options]);

  const displayLabel =
    selectedLabels.length === 0
      ? question.placeholder ?? 'Select options'
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selected`;

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  const openDropdown = () => {
    setIsOpen(true);
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const toggle = (optionValue: string) => {
    if (currentValues.includes(optionValue)) {
      onChange(currentValues.filter((item) => item !== optionValue));
      return;
    }

    if (atLimit) {
      return;
    }

    onChange([...currentValues, optionValue]);
  };

  return (
    <View
      className="gap-3"
      style={{ zIndex: isOpen ? 40 : 1, elevation: isOpen ? 12 : 0 }}>
      <QuestionHeader error={error} question={question} />
      <View>
        <Pressable
          ref={triggerRef}
          style={{ height: 56 }}
          className={cn(
            'flex-row items-center justify-between rounded-[16px] border px-4',
            isOpen ? 'border-[#FF9A3E] bg-[#2A2117]' : FIELD_CLASS
          )}
          onPress={() => (isOpen ? closeDropdown() : openDropdown())}>
          <View className="flex-1">
            <AppText
              className={cn(
                selectedLabels.length > 0 ? 'text-white' : 'text-text-soft',
                isOpen && 'text-[#FF9A3E]'
              )}
              numberOfLines={1}>
              {displayLabel}
            </AppText>
          </View>
          <View className="ml-3 flex-row items-center gap-2">
            {selectedLabels.length > 1 ? (
              <View
                className="min-w-6 items-center rounded-full px-2 py-0.5"
                style={{ backgroundColor: '#FF9A3E' }}>
                <AppText
                  variant="label"
                  className="text-[10px]"
                  style={{ color: '#1A1208', fontVariant: ['tabular-nums'] }}>
                  {selectedLabels.length}
                </AppText>
              </View>
            ) : null}
            <AppText
              variant="label"
              className="text-[10px]"
              style={{ color: isOpen ? '#FF9A3E' : '#98A2B3' }}>
              {isOpen ? '▲' : '▼'}
            </AppText>
          </View>
        </Pressable>

        <DropdownOverlay
          anchorRef={triggerRef}
          header={
            <View
              className="mb-1 flex-row items-center gap-2 rounded-[14px] border px-3"
              style={{
                backgroundColor: '#292929',
                borderColor: query ? '#FF9A3E' : '#383838',
                height: 52,
              }}>
              <Ionicons color={query ? '#FF9A3E' : '#98A2B3'} name="search" size={18} />
              <TextInput
                ref={inputRef}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setQuery}
                placeholder={question.placeholder ?? 'Search'}
                placeholderTextColor="#667085"
                value={query}
                className="flex-1 font-body text-[15px] text-white"
                style={{ paddingVertical: 0 }}
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons color="#98A2B3" name="close-circle" size={18} />
                </Pressable>
              ) : null}
            </View>
          }
          maxHeight={460}
          onClose={closeDropdown}
          visible={isOpen}>
          {groupOptions(filteredOptions).map(([groupName, options]) => (
            <View key={groupName} className="gap-1 pb-2">
              <AppText tone="muted" variant="label" className="px-3 pt-2 pb-1">
                {groupName}
              </AppText>
              {options.map((option) => {
                const isSelected = currentValues.includes(option.value);
                const isDisabled = !isSelected && atLimit;

                return (
                  <Pressable
                    key={option.id}
                    disabled={isDisabled}
                    className={cn(
                      'flex-row items-center gap-3 rounded-[12px] px-3 py-3',
                      isSelected ? 'bg-[#2A2117]' : 'bg-transparent',
                      isDisabled && 'opacity-40'
                    )}
                    onPress={() => toggle(option.value)}>
                    <View
                      className={cn(
                        'h-5 w-5 items-center justify-center rounded-[6px] border-2',
                        isSelected
                          ? 'border-[#FF9A3E] bg-[#FF9A3E]'
                          : 'border-[#5A6074] bg-transparent'
                      )}>
                      {isSelected ? (
                        <Ionicons color="#1A1208" name="checkmark" size={12} />
                      ) : null}
                    </View>
                    <View className="flex-1 gap-1">
                      <AppText
                        variant="bodyStrong"
                        className={cn(isSelected ? 'text-[#FF9A3E]' : 'text-white')}>
                        {option.label}
                      </AppText>
                      {option.sub_label ? (
                        <AppText tone="muted">{option.sub_label}</AppText>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
          {filteredOptions.length === 0 ? (
            <View className="px-3 py-4">
              <AppText tone="muted">No results</AppText>
            </View>
          ) : null}
        </DropdownOverlay>
      </View>
    </View>
  );
}

function SingleSelectChipQuestion({
  error,
  onChange,
  question,
  value,
}: QuestionRendererProps) {
  const currentValue = getStringValue(value);

  return (
    <View className="gap-3">
      <QuestionHeader error={error} question={question} />
      <View className="flex-row flex-wrap gap-2">
        {question.options?.map((option) => {
          const isSelected = currentValue === option.value;
          const iconName = option.icon as
            | React.ComponentProps<typeof Ionicons>['name']
            | undefined;

          return (
            <Pressable
              key={option.id}
              onPress={() => onChange(option.value)}
              className="flex-row items-center gap-2 rounded-full px-4 py-2.5"
              style={{
                backgroundColor: '#292929',
                borderColor: isSelected ? '#FF9A3E' : '#383838',
                borderWidth: isSelected ? 2 : 1,
              }}>
              {iconName ? (
                <Ionicons
                  color={isSelected ? '#FF9A3E' : '#98A2B3'}
                  name={iconName}
                  size={16}
                />
              ) : null}
              <AppText
                variant="bodyStrong"
                className={cn(isSelected ? 'text-[#FF9A3E]' : 'text-white')}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DropdownQuestion({
  error,
  onChange,
  question,
  value,
}: QuestionRendererProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const triggerRef = React.useRef<View | null>(null);
  const currentValue = getStringValue(value);
  const currentLabel = currentValue
    ? getSelectedLabel(question.options, currentValue)
    : question.placeholder ?? 'Select one';

  return (
    <View
      className="gap-3"
      style={{ zIndex: isOpen ? 40 : 1, elevation: isOpen ? 12 : 0 }}>
      <QuestionHeader error={error} question={question} />
      <View>
        <Pressable
          ref={triggerRef}
          style={{ height: 56 }}
          className={cn(
            'flex-row items-center justify-between rounded-[16px] border px-4',
            isOpen ? 'border-[#FF9A3E] bg-[#2A2117]' : FIELD_CLASS
          )}
          onPress={() => setIsOpen((currentState) => !currentState)}>
          <AppText
            className={cn(
              currentValue ? 'text-white' : 'text-text-soft',
              isOpen && 'text-[#FF9A3E]'
            )}>
            {currentLabel}
          </AppText>
          <AppText
            variant="label"
            className="text-[10px]"
            style={{ color: isOpen ? '#FF9A3E' : '#98A2B3' }}>
            {isOpen ? '▲' : '▼'}
          </AppText>
        </Pressable>

        <DropdownOverlay
          anchorRef={triggerRef}
          maxHeight={360}
          onClose={() => setIsOpen(false)}
          visible={isOpen}>
          {question.options?.map((option) => {
            const isSelected = currentValue === option.value;

            return (
              <Pressable
                key={option.id}
                className={cn(
                  'rounded-[12px] px-3 py-3',
                  isSelected ? 'bg-[#2A2117]' : 'bg-transparent'
                )}
                onPress={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}>
                <AppText
                  variant="bodyStrong"
                  className={cn(isSelected ? 'text-[#FF9A3E]' : 'text-white')}>
                  {option.label}
                </AppText>
                {option.sub_label ? (
                  <AppText tone="muted">{option.sub_label}</AppText>
                ) : null}
              </Pressable>
            );
          })}
        </DropdownOverlay>
      </View>
    </View>
  );
}

function SearchableDropdownQuestion({
  error,
  hideSearchableDropdownResultsUntilQuery,
  onChange,
  question,
  value,
}: QuestionRendererProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const triggerRef = React.useRef<View | null>(null);
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef<React.ComponentRef<typeof TextInput>>(null);
  const currentValue = getStringValue(value);
  const currentLabel = currentValue
    ? getSelectedLabel(question.options, currentValue)
    : '';
  const hasQuery = query.trim().length > 0;
  const shouldRenderResults =
    isOpen && (!hideSearchableDropdownResultsUntilQuery || hasQuery);

  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return question.options ?? [];
    }

    return (question.options ?? []).filter((option) => {
      const haystack = `${option.label} ${option.group ?? ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, question.options]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  const openDropdown = () => {
    setIsOpen(true);
    setQuery('');
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  return (
    <View
      className="gap-3"
      style={{ zIndex: isOpen ? 40 : 1, elevation: isOpen ? 12 : 0 }}>
      <QuestionHeader error={error} question={question} />
      <View>
        <Pressable
          ref={triggerRef}
          onPress={() => (isOpen ? closeDropdown() : openDropdown())}
          style={{ height: 56 }}
          className={cn(
            'flex-row items-center justify-between rounded-[16px] border px-4',
            isOpen ? 'border-[#FF9A3E] bg-[#2A2117]' : FIELD_CLASS
          )}>
          <View className="flex-1">
            <AppText
              className={cn(
                currentLabel ? 'text-white' : 'text-text-soft',
                isOpen && 'text-[#FF9A3E]'
              )}
              numberOfLines={1}>
              {currentLabel || question.placeholder || 'Select one'}
            </AppText>
          </View>
          <AppText
            variant="label"
            className="ml-2 text-[10px]"
            style={{ color: isOpen ? '#FF9A3E' : '#98A2B3' }}>
            {isOpen ? '▲' : '▼'}
          </AppText>
        </Pressable>

        <DropdownOverlay
          anchorRef={triggerRef}
          header={
            <View
              className="mb-1 flex-row items-center gap-2 rounded-[14px] border px-3"
              style={{
                backgroundColor: '#292929',
                borderColor: query ? '#FF9A3E' : '#383838',
                height: 52,
              }}>
              <Ionicons color={query ? '#FF9A3E' : '#98A2B3'} name="search" size={18} />
              <TextInput
                ref={inputRef}
                autoFocus
                autoCapitalize="words"
                autoCorrect={false}
                onChangeText={setQuery}
                placeholder={question.placeholder ?? 'Search'}
                placeholderTextColor="#667085"
                value={query}
                className="flex-1 font-body text-[15px] text-white"
                style={{ paddingVertical: 0 }}
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons color="#98A2B3" name="close-circle" size={18} />
                </Pressable>
              ) : null}
            </View>
          }
          maxHeight={460}
          onClose={closeDropdown}
          visible={isOpen}>
          {shouldRenderResults
            ? groupOptions(filteredOptions).map(([groupName, options]) => (
              <View key={groupName} className="gap-1 pb-2">
                <AppText tone="muted" variant="label" className="px-3 pt-2 pb-1">
                  {groupName}
                </AppText>
                {options.map((option) => {
                  const isSelected = currentValue === option.value;

                  return (
                    <Pressable
                      key={option.id}
                      className={cn(
                        'rounded-[12px] px-3 py-3',
                        isSelected ? 'bg-[#2A2117]' : 'bg-transparent'
                      )}
                      onPress={() => {
                        onChange(option.value);
                        closeDropdown();
                      }}>
                      <AppText
                        variant="bodyStrong"
                        className={cn(isSelected ? 'text-[#FF9A3E]' : 'text-white')}>
                        {option.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ))
            : null}
          {shouldRenderResults && filteredOptions.length === 0 ? (
            <View className="px-3 py-4">
              <AppText tone="muted">No results</AppText>
            </View>
          ) : null}
        </DropdownOverlay>
      </View>
    </View>
  );
}

function SearchableMultiSelectQuestion({
  error,
  onChange,
  question,
  value,
}: QuestionRendererProps) {
  const currentValues = getArrayValue(value);
  const [query, setQuery] = React.useState('');
  const maxSelections = question.validation?.max_selections ?? Infinity;
  const atLimit = currentValues.length >= maxSelections;

  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return question.options ?? [];
    }

    return (question.options ?? []).filter((option) => {
      const haystack = `${option.label} ${option.group ?? ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, question.options]);

  const toggle = (optionValue: string) => {
    if (currentValues.includes(optionValue)) {
      onChange(currentValues.filter((item) => item !== optionValue));
      return;
    }

    if (atLimit) {
      return;
    }

    onChange([...currentValues, optionValue]);
  };

  return (
    <View className="gap-3">
      <QuestionHeader error={error} question={question} />
      <View className="flex-row items-center justify-between">
        <AppText className="text-[12px] text-text-soft">
          {currentValues.length} / {Number.isFinite(maxSelections) ? maxSelections : '∞'} selected
        </AppText>
        {atLimit ? (
          <AppText className="text-[12px]" style={{ color: '#FF9A3E' }}>
            Max reached
          </AppText>
        ) : null}
      </View>
      <View
        className={cn(
          'flex-row items-center gap-2 rounded-[16px] border px-4',
          query ? 'border-[#FF9A3E] bg-[#292929]' : FIELD_CLASS
        )}
        style={{ height: 56 }}>
        <Ionicons color={query ? '#FF9A3E' : '#98A2B3'} name="search" size={18} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder={question.placeholder ?? 'Search'}
          placeholderTextColor="#667085"
          value={query}
          className="flex-1 font-body text-[15px] text-white"
          style={{ paddingVertical: 0 }}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons color="#98A2B3" name="close-circle" size={18} />
          </Pressable>
        ) : null}
      </View>
      <View
        className="rounded-[18px] border"
        style={{
          backgroundColor: '#212121',
          borderColor: '#383838',
          borderCurve: 'continuous',
          maxHeight: 380,
          overflow: 'hidden',
        }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator>
          {groupOptions(filteredOptions).map(([groupName, options]) => (
            <View key={groupName} className="pb-1">
              <AppText
                className="px-4 pt-3 pb-1 text-[11px] uppercase text-text-soft"
                style={{ letterSpacing: 1.2 }}>
                {groupName}
              </AppText>
              {options.map((option) => {
                const isSelected = currentValues.includes(option.value);
                const isDisabled = !isSelected && atLimit;

                return (
                  <Pressable
                    key={option.id}
                    disabled={isDisabled}
                    onPress={() => toggle(option.value)}
                    className={cn(
                      'flex-row items-center gap-3 px-4 py-3',
                      isDisabled && 'opacity-40'
                    )}>
                    <View
                      className={cn(
                        'h-5 w-5 items-center justify-center rounded-[6px] border-2',
                        isSelected
                          ? 'border-[#FF9A3E] bg-[#FF9A3E]'
                          : 'border-[#5A6074] bg-transparent'
                      )}>
                      {isSelected ? (
                        <Ionicons color="#1A1208" name="checkmark" size={12} />
                      ) : null}
                    </View>
                    <AppText
                      className={cn(
                        'flex-1 text-[15px]',
                        isSelected ? 'text-[#FF9A3E]' : 'text-white'
                      )}>
                      {option.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ))}
          {filteredOptions.length === 0 ? (
            <View className="px-4 py-6">
              <AppText tone="muted" align="center">
                {`No industries match "${query}"`}
              </AppText>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

function SearchableSingleSelectQuestion({
  error,
  onChange,
  question,
  value,
}: QuestionRendererProps) {
  const currentValue = getStringValue(value);
  const [query, setQuery] = React.useState('');

  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return question.options ?? [];
    }

    return (question.options ?? []).filter((option) => {
      const haystack = `${option.label} ${option.group ?? ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, question.options]);

  return (
    <View className="gap-3">
      <QuestionHeader error={error} question={question} />
      <View
        className={cn(
          'flex-row items-center gap-2 rounded-[16px] border px-4',
          query ? 'border-[#FF9A3E] bg-[#292929]' : FIELD_CLASS
        )}
        style={{ height: 56 }}>
        <Ionicons color={query ? '#FF9A3E' : '#98A2B3'} name="search" size={18} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder={question.placeholder ?? 'Search'}
          placeholderTextColor="#667085"
          value={query}
          className="flex-1 font-body text-[15px] text-white"
          style={{ paddingVertical: 0 }}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons color="#98A2B3" name="close-circle" size={18} />
          </Pressable>
        ) : null}
      </View>
      <View
        className="rounded-[18px] border"
        style={{
          backgroundColor: '#212121',
          borderColor: '#383838',
          borderCurve: 'continuous',
          maxHeight: 420,
          overflow: 'hidden',
        }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator>
          {groupOptions(filteredOptions).map(([groupName, options]) => (
            <View key={groupName} className="pb-1">
              <AppText
                className="px-4 pt-3 pb-1 text-[11px] uppercase text-text-soft"
                style={{ letterSpacing: 1.2 }}>
                {groupName}
              </AppText>
              {options.map((option) => {
                const isSelected = currentValue === option.value;

                return (
                  <Pressable
                    key={option.id}
                    onPress={() => onChange(option.value)}
                    className="flex-row items-center gap-3 px-4 py-3">
                    <View
                      className={cn(
                        'h-5 w-5 items-center justify-center rounded-full border-2',
                        isSelected
                          ? 'border-[#FF9A3E] bg-[#FF9A3E]'
                          : 'border-[#5A6074] bg-transparent'
                      )}>
                      {isSelected ? (
                        <Ionicons color="#1A1208" name="checkmark" size={12} />
                      ) : null}
                    </View>
                    <AppText
                      className={cn(
                        'flex-1 text-[15px]',
                        isSelected ? 'text-[#FF9A3E]' : 'text-white'
                      )}>
                      {option.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ))}
          {filteredOptions.length === 0 ? (
            <View className="px-4 py-6">
              <AppText tone="muted" align="center">
                {`No results for "${query}"`}
              </AppText>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

function GroupedListQuestion({
  error,
  onChange,
  question,
  value,
}: QuestionRendererProps) {
  const currentValue = getStringValue(value);

  return (
    <View className="gap-3">
      <QuestionHeader error={error} question={question} />
      <View className="gap-5">
        {groupOptions(question.options).map(([groupName, options]) => (
          <View key={groupName} className="gap-2.5">
            <AppText
              className="text-[11px] uppercase text-text-soft"
              style={{ letterSpacing: 1.2 }}>
              {groupName}
            </AppText>
            <View className="flex-row flex-wrap gap-2.5">
              {options.map((option) => {
                const isSelected = currentValue === option.value;

                return (
                  <Pressable
                    key={option.id}
                    onPress={() => onChange(option.value)}
                    className={cn(
                      'flex-row items-center gap-2 rounded-full border px-4 py-3',
                      isSelected
                        ? 'border-[#FF9A3E] bg-[#1F1712]'
                        : 'border-[#383838] bg-[#292929]'
                    )}>
                    <Ionicons
                      color={isSelected ? '#FF9A3E' : '#98A2B3'}
                      name={isSelected ? 'location' : 'location-outline'}
                      size={15}
                    />
                    <AppText
                      variant="bodyStrong"
                      className={cn(
                        'text-[14px]',
                        isSelected ? 'text-[#FF9A3E]' : 'text-white'
                      )}>
                      {option.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function padTwo(value: number) {
  return value.toString().padStart(2, '0');
}

function daysInMonth(year: number, month: number) {
  if (!year || !month) {
    return 31;
  }

  return new Date(year, month, 0).getDate();
}

function parseDateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return { day: '', month: '', year: '' };
  }

  return { year: match[1], month: match[2], day: match[3] };
}

function assembleDate(year: string, month: string, day: string) {
  if (!year || !month || !day) {
    return '';
  }

  return `${year}-${month}-${day}`;
}

type DatePart = 'day' | 'month' | 'year';

function DateDropdown({
  displayValue,
  isOpen,
  label,
  onSelect,
  onToggle,
  options,
  placeholder,
  selectedValue,
}: {
  displayValue: string;
  isOpen: boolean;
  label: string;
  onSelect: (value: string) => void;
  onToggle: () => void;
  options: { label: string; value: string }[];
  placeholder: string;
  selectedValue: string;
}) {
  const triggerRef = React.useRef<View | null>(null);

  return (
    <View className="flex-1 gap-2" style={{ zIndex: isOpen ? 30 : 1 }}>
      <AppText tone="muted" variant="label" className="text-[10px]">
        {label}
      </AppText>
      <Pressable
        ref={triggerRef}
        onPress={onToggle}
        style={{ height: 56 }}
        className={cn(
          'flex-row items-center justify-between rounded-[16px] border px-4',
          isOpen ? 'border-[#FF9A3E] bg-[#2A2117]' : FIELD_CLASS
        )}>
        <AppText
          className={cn(
            displayValue ? 'text-white' : 'text-text-soft',
            isOpen && 'text-[#FF9A3E]'
          )}>
          {displayValue || placeholder}
        </AppText>
        <AppText
          variant="label"
          className="text-[10px]"
          style={{ color: isOpen ? '#FF9A3E' : '#98A2B3' }}>
          {isOpen ? '▲' : '▼'}
        </AppText>
      </Pressable>

      <DropdownOverlay
        anchorRef={triggerRef}
        maxHeight={320}
        onClose={onToggle}
        visible={isOpen}>
        {options.map((option) => {
          const isSelected = option.value === selectedValue;

          return (
            <Pressable
              key={option.value}
              className={cn(
                'rounded-[12px] px-3 py-3',
                isSelected ? 'bg-[#2A2117]' : 'bg-transparent'
              )}
              onPress={() => onSelect(option.value)}>
              <AppText
                variant="bodyStrong"
                className={cn(isSelected ? 'text-[#FF9A3E]' : 'text-white')}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </DropdownOverlay>
    </View>
  );
}

function DateSelectQuestion({
  error,
  onChange,
  question,
  value,
}: QuestionRendererProps) {
  const externalValue = getStringValue(value);
  const [draftParts, setDraftParts] = React.useState(() =>
    parseDateParts(externalValue)
  );
  const [openPart, setOpenPart] = React.useState<DatePart | null>(null);

  React.useEffect(() => {
    if (!externalValue) {
      return;
    }

    const externalParts = parseDateParts(externalValue);

    setDraftParts((current) => {
      if (
        current.day === externalParts.day &&
        current.month === externalParts.month &&
        current.year === externalParts.year
      ) {
        return current;
      }

      return externalParts;
    });
  }, [externalValue]);

  const parts = draftParts;
  const currentYear = new Date().getFullYear();

  const yearOptions = React.useMemo(
    () =>
      Array.from({ length: 100 }).map((_, index) => {
        const year = currentYear - index;
        return { label: String(year), value: String(year) };
      }),
    [currentYear]
  );
  const monthOptions = React.useMemo(
    () =>
      MONTH_LABELS.map((label, index) => ({
        label,
        value: padTwo(index + 1),
      })),
    []
  );
  const dayCount = daysInMonth(Number(parts.year), Number(parts.month));
  const dayOptions = React.useMemo(
    () =>
      Array.from({ length: dayCount }).map((_, index) => ({
        label: String(index + 1),
        value: padTwo(index + 1),
      })),
    [dayCount]
  );

  const monthDisplay = React.useMemo(() => {
    if (!parts.month) return '';
    const found = monthOptions.find((option) => option.value === parts.month);
    return found ? found.label.slice(0, 3) : '';
  }, [parts.month, monthOptions]);

  const updatePart = (part: DatePart, nextValue: string) => {
    const nextParts = { ...parts, [part]: nextValue };

    if (part === 'month' || part === 'year') {
      const clampLimit = daysInMonth(
        Number(part === 'year' ? nextValue : nextParts.year),
        Number(part === 'month' ? nextValue : nextParts.month)
      );

      if (nextParts.day && Number(nextParts.day) > clampLimit) {
        nextParts.day = padTwo(clampLimit);
      }
    }

    setDraftParts(nextParts);
    onChange(assembleDate(nextParts.year, nextParts.month, nextParts.day));
    setOpenPart(null);
  };

  const togglePart = (part: DatePart) => {
    setOpenPart((current) => (current === part ? null : part));
  };

  return (
    <View
      className="gap-3"
      style={{ zIndex: openPart ? 30 : 1, elevation: openPart ? 12 : 0 }}>
      <QuestionHeader error={error} question={question} />
      <View className="flex-row items-start gap-3">
        <DateDropdown
          displayValue={parts.day}
          isOpen={openPart === 'day'}
          label="Day"
          onSelect={(nextValue) => updatePart('day', nextValue)}
          onToggle={() => togglePart('day')}
          options={dayOptions}
          placeholder="DD"
          selectedValue={parts.day}
        />
        <DateDropdown
          displayValue={monthDisplay}
          isOpen={openPart === 'month'}
          label="Month"
          onSelect={(nextValue) => updatePart('month', nextValue)}
          onToggle={() => togglePart('month')}
          options={monthOptions}
          placeholder="MMM"
          selectedValue={parts.month}
        />
        <DateDropdown
          displayValue={parts.year}
          isOpen={openPart === 'year'}
          label="Year"
          onSelect={(nextValue) => updatePart('year', nextValue)}
          onToggle={() => togglePart('year')}
          options={yearOptions}
          placeholder="YYYY"
          selectedValue={parts.year}
        />
      </View>
    </View>
  );
}

function getSegmentedIconName(icon: string | null | undefined) {
  if (icon === 'clock') {
    return 'time-outline' as const;
  }
  if (icon === 'calendar') {
    return 'calendar-outline' as const;
  }
  return null;
}

function SegmentedQuestion({
  error,
  onChange,
  question,
  value,
}: QuestionRendererProps) {
  const currentValue = getStringValue(value);

  return (
    <View className="gap-3">
      <QuestionHeader error={error} question={question} />
      <View
        className="flex-row rounded-[20px] p-1"
        style={{ backgroundColor: '#1F1712', borderWidth: 1, borderColor: '#383838' }}>
        {question.options?.map((option) => {
          const isSelected = currentValue === option.value;
          const iconName = getSegmentedIconName(option.icon);

          return (
            <Pressable
              key={option.id}
              className="flex-1 rounded-[16px] px-3 py-3"
              style={{
                backgroundColor: isSelected ? '#FF9A3E' : 'transparent',
              }}
              onPress={() => onChange(option.value)}>
              <View className="flex-row items-center justify-center gap-2">
                {iconName ? (
                  <Ionicons
                    color={isSelected ? '#1A1208' : '#9CA3AF'}
                    name={iconName}
                    size={18}
                  />
                ) : null}
                <AppText
                  align="center"
                  variant="bodyStrong"
                  style={{ color: isSelected ? '#1A1208' : '#9CA3AF' }}>
                  {option.label}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CurrencyAmountQuestion({
  error,
  onChange,
  question,
  value,
}: QuestionRendererProps) {
  const currentValue = getCurrencyValue(value);

  return (
    <View className="gap-3">
      <QuestionHeader error={error} question={question} />
      <View className="gap-3">
        <View className="gap-2">
          <AppText tone="muted" variant="label">
            {question.meta?.currency_label ?? 'Currency'}
          </AppText>
          <View className="flex-row flex-wrap gap-2">
            {question.options?.map((option) => {
              const isSelected = currentValue.currency === option.value;

              return (
                <Pressable
                  key={option.id}
                  className="rounded-full px-4 py-2"
                  style={{
                    backgroundColor: isSelected ? '#1F1712' : '#292929',
                    borderColor: isSelected ? '#FF9A3E' : '#383838',
                    borderWidth: isSelected ? 2 : 1,
                  }}
                  onPress={() =>
                    onChange({
                      ...currentValue,
                      currency: option.value,
                    })
                  }>
                  <AppText
                    variant="bodyStrong"
                    style={{ color: isSelected ? '#FF9A3E' : '#FFFFFF' }}>
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View className="gap-2">
          <AppText tone="muted" variant="label">
            {question.meta?.amount_label ?? 'Amount'}
          </AppText>
          <AppInput
            keyboardType="numeric"
            onChangeText={(nextAmount) =>
              onChange({
                ...currentValue,
                amount: nextAmount,
              })
            }
            placeholder={question.meta?.amount_placeholder ?? '5000'}
            value={currentValue.amount}
          />
        </View>
      </View>
    </View>
  );
}

export function QuestionRenderer({
  error,
  hideSearchableDropdownResultsUntilQuery,
  onChange,
  question,
  variant = 'default',
  value,
}: QuestionRendererProps) {
  switch (question.type) {
    case 'textarea':
      return (
        <TextLikeQuestion
          error={error}
          multiline
          onChange={onChange}
          question={question}
          value={getStringValue(value)}
        />
      );
    case 'number':
      return (
        <TextLikeQuestion
          error={error}
          keyboardType="numeric"
          onChange={(nextValue) => {
            if (!nextValue) {
              onChange('');
              return;
            }

            const parsedValue = Number(nextValue);
            onChange(Number.isNaN(parsedValue) ? nextValue : parsedValue);
          }}
          question={question}
          value={getNumberValue(value)}
        />
      );
    case 'date':
      return (
        <DateSelectQuestion
          error={error}
          onChange={onChange}
          question={question}
          value={value}
        />
      );
    case 'email':
      return (
        <TextLikeQuestion
          error={error}
          keyboardType="email-address"
          onChange={onChange}
          question={question}
          value={getStringValue(value)}
        />
      );
    case 'url':
      return (
        <TextLikeQuestion
          error={error}
          keyboardType="url"
          onChange={onChange}
          question={question}
          value={getStringValue(value)}
        />
      );
    case 'phone':
      return (
        <TextLikeQuestion
          error={error}
          keyboardType="phone-pad"
          onChange={onChange}
          question={question}
          value={getStringValue(value)}
        />
      );
    case 'single_select_card':
      return (
        <SingleSelectCardQuestion
          error={error}
          onChange={onChange}
          question={question}
          value={value}
        />
      );
    case 'single_select_chip':
      return (
        <SingleSelectChipQuestion
          error={error}
          onChange={onChange}
          question={question}
          value={value}
        />
      );
    case 'single_select_radio':
      return (
        <SingleSelectRadioQuestion
          error={error}
          onChange={onChange}
          question={question}
          value={value}
        />
      );
    case 'multi_select_card':
      return (
        <MultiSelectCardQuestion
          error={error}
          onChange={onChange}
          question={question}
          value={value}
        />
      );
    case 'multi_select_chip':
      if (variant === 'dropdown_multi_select') {
        return (
          <MultiSelectDropdownQuestion
            error={error}
            onChange={onChange}
            question={question}
            value={value}
          />
        );
      }

      return (
        <MultiSelectChipQuestion
          error={error}
          onChange={onChange}
          question={question}
          value={value}
        />
      );
    case 'searchable_multi_select':
      if (variant === 'dropdown_multi_select') {
        return (
          <SearchableMultiSelectDropdownQuestion
            error={error}
            onChange={onChange}
            question={question}
            value={value}
          />
        );
      }

      return (
        <SearchableMultiSelectQuestion
          error={error}
          onChange={onChange}
          question={question}
          value={value}
        />
      );
    case 'searchable_single_select':
      return (
        <SearchableSingleSelectQuestion
          error={error}
          onChange={onChange}
          question={question}
          value={value}
        />
      );
    case 'dropdown':
      return (
        <DropdownQuestion
          error={error}
          onChange={onChange}
          question={question}
          value={value}
        />
      );
    case 'searchable_dropdown':
      return (
        <SearchableDropdownQuestion
          error={error}
          hideSearchableDropdownResultsUntilQuery={
            hideSearchableDropdownResultsUntilQuery
          }
          onChange={onChange}
          question={question}
          value={value}
        />
      );
    case 'grouped_list':
      return (
        <GroupedListQuestion
          error={error}
          onChange={onChange}
          question={question}
          value={value}
        />
      );
    case 'segmented':
      return (
        <SegmentedQuestion
          error={error}
          onChange={onChange}
          question={question}
          value={value}
        />
      );
    case 'currency_amount':
      return (
        <CurrencyAmountQuestion
          error={error}
          onChange={onChange}
          question={question}
          value={value}
        />
      );
    case 'text':
    default:
      return (
        <TextLikeQuestion
          error={error}
          onChange={onChange}
          question={question}
          value={getStringValue(value)}
        />
      );
  }
}
