import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  LayoutChangeEvent,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppCard, AppText } from '@shared/components';

import type {
  DiscoveryAppliedFilters,
  DiscoveryFilterField,
  DiscoveryFilterOption,
  DiscoveryFilterOptionsResponse,
  DiscoveryFilterSection,
  DiscoveryGoalId,
  DiscoveryMode,
} from '../types/discovery.types';

type DiscoveryFilterSheetProps = {
  currentMode: DiscoveryMode;
  errorMessage?: string | null;
  filterOptionsResponse?: DiscoveryFilterOptionsResponse;
  goalOptions: DiscoveryFilterOption[];
  hasConnectXPro?: boolean;
  initialAppliedMode: DiscoveryMode | null;
  initialFilters: DiscoveryAppliedFilters;
  isApplying?: boolean;
  isLoadingOptions?: boolean;
  onApply: (mode: DiscoveryMode, filters: DiscoveryAppliedFilters) => void;
  onClose: () => void;
  onModeChange: (mode: DiscoveryMode) => void;
  onReset: () => void;
  optionsErrorMessage?: string | null;
  sections: DiscoveryFilterSection[];
  visible: boolean;
};

const GOAL_MODE_MAP: Record<DiscoveryGoalId, DiscoveryMode> = {
  goal_finding_cofounder: 'finding_cofounder',
  goal_building_team: 'building_team',
  goal_explore_startups: 'explore_startups',
  goal_joining_startups: 'joining_startups',
};

function isPremiumDiscoverySection(section?: DiscoveryFilterSection) {
  return Boolean(section?.access?.requiresEntitlement);
}

function isDisabledDiscoveryFilterSection(section: DiscoveryFilterSection | undefined, hasConnectXPro = false) {
  if (!section || !isPremiumDiscoverySection(section)) {
    return false;
  }

  return !(section.access?.enabled || hasConnectXPro);
}

function stripDisabledDiscoveryFilters(
  filters: DiscoveryAppliedFilters,
  sections: DiscoveryFilterSection[],
  hasConnectXPro = false
) {
  const sectionMap = new Map(sections.map((section) => [section.id, section]));

  return Object.fromEntries(
    Object.entries(filters).filter(
      ([sectionId]) => !isDisabledDiscoveryFilterSection(sectionMap.get(sectionId), hasConnectXPro)
    )
  );
}

function sectionIcon(sectionId: string): keyof typeof Ionicons.glyphMap {
  switch (sectionId) {
    case 'startupStageIds':
      return 'rocket-outline';
    case 'industryIds':
      return 'briefcase-outline';
    case 'founderTypeIds':
      return 'people-outline';
    case 'locationAvailability':
      return 'location-outline';
    case 'skillStrengthIds':
    case 'skillIds':
      return 'construct-outline';
    case 'roleNeededIds':
      return 'hammer-outline';
    case 'commitmentIds':
      return 'time-outline';
    case 'founderQuality':
    case 'founderBuilderQuality':
    case 'startupQuality':
      return 'sparkles-outline';
    case 'leadershipStrength':
      return 'shield-checkmark-outline';
    case 'startupReadiness':
    case 'hiringReadiness':
    case 'cofounderReadiness':
      return 'flash-outline';
    case 'equityAndCommitment':
      return 'cash-outline';
    case 'aiMatchPrecision':
    case 'aiTalentPrecision':
    case 'aiStartupFit':
      return 'color-wand-outline';
    case 'globalCompatibility':
      return 'globe-outline';
    case 'opportunityFit':
      return 'analytics-outline';
    default:
      return 'options-outline';
  }
}

function goalIcon(goalId: string): keyof typeof Ionicons.glyphMap {
  switch (goalId) {
    case 'goal_finding_cofounder':
      return 'people-outline';
    case 'goal_building_team':
      return 'briefcase-outline';
    case 'goal_explore_startups':
      return 'rocket-outline';
    case 'goal_joining_startups':
      return 'locate-outline';
    default:
      return 'ellipse-outline';
  }
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getDefaultFieldValue(field: DiscoveryFilterField) {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  if (field.type === 'multi_select') {
    return [];
  }

  if (field.type === 'boolean') {
    return false;
  }

  if (field.type === 'range') {
    return field.min ?? 0;
  }

  return '';
}

function getDefaultSectionValue(section: DiscoveryFilterSection) {
  if (section.defaultValue !== undefined) {
    return section.defaultValue;
  }

  if (section.type === 'multi_select') {
    return [];
  }

  if (section.fields?.length) {
    return Object.fromEntries(section.fields.map((field) => [field.id, getDefaultFieldValue(field)]));
  }

  return '';
}

function buildInitialDraft(
  sections: DiscoveryFilterSection[],
  initialFilters: DiscoveryAppliedFilters,
  hasConnectXPro = false
) {
  const enabledInitialFilters = stripDisabledDiscoveryFilters(initialFilters, sections, hasConnectXPro);

  return sections.reduce<DiscoveryAppliedFilters>((draft, section) => {
    if (section.id === 'goal') {
      return draft;
    }

    draft[section.id] =
      enabledInitialFilters[section.id] !== undefined
        ? enabledInitialFilters[section.id]
        : getDefaultSectionValue(section);
    return draft;
  }, {});
}

function cloneDraftFilters(filters: DiscoveryAppliedFilters) {
  return JSON.parse(JSON.stringify(filters)) as DiscoveryAppliedFilters;
}

function clampRangeValue(value: number, min: number, max: number, step: number) {
  const clampedValue = Math.min(max, Math.max(min, value));
  const steppedValue = min + Math.round((clampedValue - min) / step) * step;

  return Math.min(max, Math.max(min, steppedValue));
}

function OptionChip({
  active,
  disabled = false,
  label,
  onPress,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="rounded-full border px-4 py-2"
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor: disabled ? '#17191E' : active ? '#2A2117' : '#2C2C2C',
        borderColor: disabled
          ? 'rgba(102, 112, 133, 0.18)'
          : active
            ? 'rgba(255, 154, 62, 0.5)'
            : 'rgba(255, 255, 255, 0.1)',
        opacity: disabled ? 0.6 : 1,
      }}>
      <AppText
        className="text-[13px]"
        style={{ color: disabled ? '#667085' : active ? '#FFB05B' : '#98A2B3' }}
        variant="bodyStrong">
        {label}
      </AppText>
    </Pressable>
  );
}

function GoalCard({
  active,
  description,
  goalId,
  label,
  onPress,
}: {
  active: boolean;
  description?: string;
  goalId: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="h-[82px] w-full rounded-[16px] border px-3.5 py-3"
      onPress={onPress}
      style={{
        backgroundColor: active ? '#3B2A1C' : '#2C2C2C',
        borderColor: active ? '#FF9A3E' : 'rgba(255, 255, 255, 0.1)',
        shadowColor: active ? '#FF9A3E' : 'transparent',
        shadowOpacity: active ? 0.22 : 0,
        shadowRadius: active ? 8 : 0,
      }}>
      <View className="gap-1.5">
        <View className="flex-row items-center gap-2">
          <Ionicons color={active ? '#FF9A3E' : '#98A2B3'} name={goalIcon(goalId)} size={16} />
          <AppText
            className="flex-1 text-[13px] font-semibold"
            numberOfLines={1}
            style={{ color: active ? '#FF9A3E' : '#F2F4F7' }}>
            {label}
          </AppText>
        </View>
        {description ? (
          <AppText className="text-[11px] leading-[15px]" numberOfLines={2} style={{ color: active ? '#E3934B' : '#98A2B3' }}>
            {description}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const RANGE_THUMB_SIZE = 24;

const RangeControl = React.memo(function RangeControl({
  disabled = false,
  field,
  onChange,
  value,
}: {
  disabled?: boolean;
  field: DiscoveryFilterField;
  onChange: (value: number) => void;
  value: number;
}) {
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const step = field.step ?? 1;
  const suffix = field.ui.suffix ?? '';
  const nextValue = clampRangeValue(value, min, max, step);
  const trackRef = React.useRef<View>(null);
  const trackPageXRef = React.useRef(0);
  const trackWidthRef = React.useRef(0);
  const draggingRef = React.useRef(false);
  const draftValueRef = React.useRef(nextValue);
  const [trackWidth, setTrackWidth] = React.useState(0);
  const [draftValue, setDraftValue] = React.useState(nextValue);

  React.useEffect(() => {
    if (draggingRef.current) {
      return;
    }

    draftValueRef.current = nextValue;
    setDraftValue(nextValue);
  }, [nextValue]);

  const progress = (draftValue - min) / Math.max(max - min, 1);
  const thumbOffset = Math.min(
    Math.max(progress * trackWidth - RANGE_THUMB_SIZE / 2, 0),
    Math.max(trackWidth - RANGE_THUMB_SIZE, 0)
  );

  const syncTrackMetrics = React.useCallback(() => {
    trackRef.current?.measureInWindow((pageX, _pageY, measuredWidth) => {
      trackPageXRef.current = pageX;
      trackWidthRef.current = measuredWidth;
      setTrackWidth((current) => (current === measuredWidth ? current : measuredWidth));
    });
  }, []);

  const handleTrackLayout = React.useCallback((event: LayoutChangeEvent) => {
    const measuredWidth = event.nativeEvent.layout.width;

    trackWidthRef.current = measuredWidth;
    setTrackWidth(measuredWidth);
    requestAnimationFrame(syncTrackMetrics);
  }, [syncTrackMetrics]);

  const setDraftValueFromPosition = React.useCallback(
    (positionX: number) => {
      const measuredTrackWidth = trackWidthRef.current;

      if (measuredTrackWidth <= 0) {
        return;
      }

      const clampedX = Math.min(measuredTrackWidth, Math.max(0, positionX));
      const rawValue = min + (clampedX / measuredTrackWidth) * (max - min);
      const clampedValue = clampRangeValue(rawValue, min, max, step);

      if (draftValueRef.current === clampedValue) {
        return;
      }

      draftValueRef.current = clampedValue;
      setDraftValue(clampedValue);
    },
    [max, min, step]
  );

  const updateValueFromPageX = React.useCallback(
    (pageX: number, locationX: number) => {
      const measuredPageX = trackPageXRef.current;

      if (measuredPageX > 0) {
        setDraftValueFromPosition(pageX - measuredPageX);
        return;
      }

      setDraftValueFromPosition(locationX);
    },
    [setDraftValueFromPosition]
  );

  const commitDraftValue = React.useCallback(() => {
    draggingRef.current = false;

    if (draftValueRef.current !== nextValue) {
      onChange(draftValueRef.current);
    }
  }, [nextValue, onChange]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          !disabled && Math.abs(gestureState.dx) >= Math.abs(gestureState.dy),
        onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
          !disabled && Math.abs(gestureState.dx) >= Math.abs(gestureState.dy),
        onPanResponderGrant: (event) => {
          if (disabled) {
            return;
          }

          draggingRef.current = true;
          syncTrackMetrics();
          updateValueFromPageX(event.nativeEvent.pageX, event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          if (disabled) {
            return;
          }

          updateValueFromPageX(event.nativeEvent.pageX, event.nativeEvent.locationX);
        },
        onPanResponderRelease: commitDraftValue,
        onPanResponderTerminate: commitDraftValue,
        onPanResponderTerminationRequest: () => false,
        onPanResponderReject: commitDraftValue,
        onStartShouldSetPanResponder: () => !disabled,
        onStartShouldSetPanResponderCapture: () => !disabled,
      }),
    [commitDraftValue, disabled, syncTrackMetrics, updateValueFromPageX]
  );

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <AppText tone="muted" variant="label">
          {field.title}
        </AppText>
        <AppText tone="signal" variant="bodyStrong">
          {draftValue}
          {suffix}
        </AppText>
      </View>
      <View className="gap-2">
        <View
          ref={trackRef}
          className="justify-center"
          onLayout={handleTrackLayout}
          {...panResponder.panHandlers}
          style={{ height: 30 }}>
          <View
            style={{
              backgroundColor: '#15171C',
              borderRadius: 999,
              height: 6,
              left: 0,
              overflow: 'hidden',
              position: 'absolute',
              right: 0,
              top: 12,
            }}
          />
          <View
            style={{
              backgroundColor: disabled ? '#667085' : '#FF9A3E',
              borderRadius: 999,
              height: 6,
              left: 0,
              position: 'absolute',
              top: 12,
              width: `${progress * 100}%`,
            }}
          />
          <View
            style={{
              backgroundColor: disabled ? '#98A2B3' : '#FF9A3E',
              borderColor: '#1B1D22',
              borderRadius: 999,
              borderWidth: 4,
              height: RANGE_THUMB_SIZE,
              left: thumbOffset,
              position: 'absolute',
              top: 3,
              width: RANGE_THUMB_SIZE,
            }}
          />
        </View>
        <View className="flex-row items-center justify-between px-0.5">
          <AppText className="text-[12px]" tone="muted">
            {min}
            {suffix}
          </AppText>
          <AppText className="text-[12px]" tone="muted">
            {max}
            {suffix}
          </AppText>
        </View>
      </View>
    </View>
  );
});

function CheckboxRow({
  active,
  disabled = false,
  label,
  onPress,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="flex-row items-center gap-3 rounded-[18px] border px-4 py-3"
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor: disabled ? '#17191E' : active ? '#3B2A1C' : '#2C2C2C',
        borderColor: disabled
          ? 'rgba(102, 112, 133, 0.16)'
          : active
            ? 'rgba(255, 154, 62, 0.5)'
            : 'rgba(255, 255, 255, 0.1)',
        opacity: disabled ? 0.6 : 1,
      }}>
      <View
        className="h-6 w-6 items-center justify-center rounded-full border"
        style={{
          backgroundColor: disabled ? '#344054' : active ? '#FF9A3E' : 'transparent',
          borderColor: disabled ? '#475467' : active ? '#FF9A3E' : 'rgba(152, 162, 179, 0.38)',
        }}>
        {active ? <Ionicons color={disabled ? '#D0D5DD' : '#11131A'} name="checkmark" size={14} /> : null}
      </View>
      <AppText
        className="flex-1 text-[14px]"
        style={{ color: disabled ? '#667085' : active ? '#FFB05B' : '#D0D5DD' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

function SearchInput({
  disabled = false,
  onChangeText,
  value,
}: {
  disabled?: boolean;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View
      className="flex-row items-center gap-2 rounded-[16px] border px-4"
      style={{ backgroundColor: '#2C2C2C', borderColor: 'rgba(255, 255, 255, 0.1)', minHeight: 46 }}>
      <Ionicons color="#667085" name="search-outline" size={16} />
      <TextInput
        className="flex-1 font-body text-[14px] text-text"
        editable={!disabled}
        onChangeText={onChangeText}
        placeholder="Search"
        placeholderTextColor="#667085"
        value={value}
      />
    </View>
  );
}

function filterOptionsBySearch(
  options: DiscoveryFilterOption[] | undefined,
  searchTerm: string
) {
  if (!options) {
    return [];
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (!normalizedSearch) {
    return options;
  }

  return options.filter((option) => option.label.toLowerCase().includes(normalizedSearch));
}

function filterSearchableCheckboxOptions(
  options: DiscoveryFilterOption[] | undefined,
  searchTerm: string
) {
  if (!options) {
    return [];
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (!normalizedSearch) {
    return options;
  }

  return options.filter((option) => {
    const haystack = `${option.label} ${option.description ?? ''}`.toLowerCase();
    return haystack.includes(normalizedSearch);
  });
}

function getSearchableCheckboxPlaceholder(sectionId: string) {
  switch (sectionId) {
    case 'industryIds':
      return 'Search industry';
    case 'skillStrengthIds':
      return 'Search skill strength';
    default:
      return 'Search';
  }
}

function getSearchableCheckboxEmptyMessage(sectionId: string, searchTerm: string) {
  if (searchTerm.trim()) {
    return `No results for "${searchTerm}"`;
  }

  switch (sectionId) {
    case 'industryIds':
      return 'No industries available';
    case 'skillStrengthIds':
      return 'No skill strengths available';
    default:
      return 'No options available';
  }
}

function getEmptyOptionsMessage(
  options: DiscoveryFilterOption[] | undefined,
  searchTerm: string
) {
  if (searchTerm.trim().length > 0 && (options?.length ?? 0) > 0) {
    return 'No matching options found.';
  }

  return 'No options available right now.';
}

export function DiscoveryFilterSheet({
  currentMode,
  errorMessage,
  filterOptionsResponse,
  goalOptions,
  hasConnectXPro = false,
  initialAppliedMode,
  initialFilters,
  isApplying = false,
  isLoadingOptions = false,
  onApply,
  onClose,
  onModeChange,
  sections,
  optionsErrorMessage,
  visible,
}: DiscoveryFilterSheetProps) {
  const insets = useSafeAreaInsets();
  const [draftByMode, setDraftByMode] = React.useState<Partial<Record<DiscoveryMode, DiscoveryAppliedFilters>>>({});
  const [expandedByMode, setExpandedByMode] = React.useState<
    Partial<Record<DiscoveryMode, Record<string, boolean>>>
  >({});
  const [searchTerms, setSearchTerms] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    console.log('discovery filter-options sheet result', {
      currentMode,
      responseMode: filterOptionsResponse?.data.mode,
      result: filterOptionsResponse,
    });
  }, [currentMode, filterOptionsResponse]);

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    setDraftByMode((current) => {
      if (current[currentMode]) {
        return current;
      }

      return {
        ...current,
        [currentMode]:
          currentMode === initialAppliedMode
            ? buildInitialDraft(sections, initialFilters, hasConnectXPro)
            : buildInitialDraft(sections, {}, hasConnectXPro),
      };
    });

    setExpandedByMode((current) => {
      if (current[currentMode]) {
        return current;
      }

      const basicSectionIds = sections
        .filter((section) => section.id !== 'goal' && (section.type !== 'group' || section.id === 'locationAvailability'))
        .map((section) => section.id);

      const premiumSectionIds = sections
        .filter((section) => section.id !== 'goal' && section.type === 'group' && section.id !== 'locationAvailability')
        .map((section) => section.id);

      const nextExpanded = Object.fromEntries([
        ...basicSectionIds.map((sectionId, index) => [sectionId, index === 0]),
        ...premiumSectionIds.map((sectionId) => [
          sectionId,
          sections.find((section) => section.id === sectionId)?.ui.defaultCollapsed === false,
        ]),
      ]);

      return {
        ...current,
        [currentMode]: nextExpanded,
      };
    });
  }, [currentMode, hasConnectXPro, initialAppliedMode, initialFilters, sections, visible]);

  const currentDraft = React.useMemo(
    () => draftByMode[currentMode] ?? buildInitialDraft(sections, {}, hasConnectXPro),
    [currentMode, draftByMode, hasConnectXPro, sections]
  );
  const currentExpanded = React.useMemo(
    () => expandedByMode[currentMode] ?? {},
    [currentMode, expandedByMode]
  );
  const sectionById = React.useMemo(
    () => new Map(sections.map((section) => [section.id, section])),
    [sections]
  );
  const basicSections = sections.filter((section) => section.id !== 'goal' && !isPremiumDiscoverySection(section));
  const advancedSections = sections.filter((section) => section.id !== 'goal' && isPremiumDiscoverySection(section));

  const updateDraft = React.useCallback(
    (updater: (current: DiscoveryAppliedFilters) => DiscoveryAppliedFilters) => {
      setDraftByMode((current) => ({
        ...current,
        [currentMode]: updater(
          cloneDraftFilters(current[currentMode] ?? buildInitialDraft(sections, {}, hasConnectXPro))
        ),
      }));
    },
    [currentMode, hasConnectXPro, sections]
  );

  const handleToggleSection = React.useCallback((sectionId: string) => {
    setExpandedByMode((current) => ({
      ...current,
      [currentMode]: {
        ...(current[currentMode] ?? {}),
        [sectionId]: !(current[currentMode] ?? {})[sectionId],
      },
    }));
  }, [currentMode]);

  const handleToggleSectionOption = React.useCallback((section: DiscoveryFilterSection, optionId: string) => {
    updateDraft((current) => {
      const currentValue = current[section.id];

      if (section.type === 'multi_select') {
        const selected = Array.isArray(currentValue) ? currentValue : [];
        const nextValue = selected.includes(optionId)
          ? selected.filter((item) => item !== optionId)
          : [...selected, optionId];

        return {
          ...current,
          [section.id]: nextValue,
        };
      }

      return {
        ...current,
        [section.id]: currentValue === optionId ? '' : optionId,
      };
    });
  }, [updateDraft]);

  const handleFieldValueChange = React.useCallback(
    (sectionId: string, fieldId: string, value: unknown) => {
      if (isDisabledDiscoveryFilterSection(sectionById.get(sectionId), hasConnectXPro)) {
        return;
      }

      updateDraft((current) => {
        const currentSectionValue = isRecordValue(current[sectionId]) ? current[sectionId] : {};

        return {
          ...current,
          [sectionId]: {
            ...currentSectionValue,
            [fieldId]: value,
          },
        };
      });
    },
    [hasConnectXPro, sectionById, updateDraft]
  );

  const handleToggleFieldOption = React.useCallback(
    (sectionId: string, field: DiscoveryFilterField, optionId: string) => {
      if (isDisabledDiscoveryFilterSection(sectionById.get(sectionId), hasConnectXPro)) {
        return;
      }

      updateDraft((current) => {
        const currentSectionValue = isRecordValue(current[sectionId]) ? current[sectionId] : {};
        const existingValue = currentSectionValue[field.id];

        if (field.type === 'multi_select') {
          const selected = Array.isArray(existingValue) ? existingValue : [];
          const nextValue = selected.includes(optionId)
            ? selected.filter((item) => item !== optionId)
            : [...selected, optionId];

          return {
            ...current,
            [sectionId]: {
              ...currentSectionValue,
              [field.id]: nextValue,
            },
          };
        }

        return {
          ...current,
          [sectionId]: {
            ...currentSectionValue,
            [field.id]: existingValue === optionId ? '' : optionId,
          },
        };
      });
    },
    [hasConnectXPro, sectionById, updateDraft]
  );

  const handleGoalPress = React.useCallback((goalId: string) => {
    const nextMode = GOAL_MODE_MAP[goalId as DiscoveryGoalId];

    if (!nextMode || nextMode === currentMode) {
      return;
    }

    onModeChange(nextMode);
  }, [currentMode, onModeChange]);

  const renderField = React.useCallback(
    (sectionId: string, field: DiscoveryFilterField) => {
      const disabled = isDisabledDiscoveryFilterSection(sectionById.get(sectionId), hasConnectXPro);
      const sectionValue = isRecordValue(currentDraft[sectionId]) ? currentDraft[sectionId] : {};
      const fieldValue = sectionValue[field.id] ?? getDefaultFieldValue(field);
      const searchKey = `${currentMode}:${sectionId}:${field.id}`;
      const searchTerm = searchTerms[searchKey] ?? '';

      if (field.ui.component === 'switch') {
        return (
          <View
            key={field.id}
            className="flex-row items-center justify-between rounded-[18px] border px-4 py-3"
            style={{ backgroundColor: '#2C2C2C', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <AppText className="flex-1 text-[14px]">{field.title}</AppText>
            <Switch
              disabled={disabled}
              onValueChange={(value) => handleFieldValueChange(sectionId, field.id, value)}
              thumbColor="#FFFFFF"
              trackColor={{ false: '#344054', true: '#FF9A3E' }}
              value={Boolean(fieldValue)}
            />
          </View>
        );
      }

      if (field.ui.component === 'slider') {
        return (
          <RangeControl
            disabled={disabled}
            key={field.id}
            field={field}
            onChange={(value) => handleFieldValueChange(sectionId, field.id, value)}
            value={typeof fieldValue === 'number' ? fieldValue : Number(field.defaultValue ?? field.min ?? 0)}
          />
        );
      }

      const visibleOptions = filterOptionsBySearch(field.options, searchTerm);

      return (
        <View key={field.id} className="gap-3">
          <AppText tone="muted" variant="label">
            {field.title}
          </AppText>
          {field.ui.searchable ? (
            <SearchInput
              disabled={disabled}
              onChangeText={(value) =>
                setSearchTerms((current) => ({
                  ...current,
                  [searchKey]: value,
                }))
              }
              value={searchTerm}
            />
          ) : null}
          {visibleOptions.length === 0 ? (
            <AppText className="text-[13px]" tone="muted">
              {getEmptyOptionsMessage(field.options, searchTerm)}
            </AppText>
          ) : null}
          {field.ui.component === 'chips' ? (
            <View className="flex-row flex-wrap gap-2">
              {visibleOptions.map((option) => {
                const active = Array.isArray(fieldValue)
                  ? fieldValue.includes(option.id)
                  : fieldValue === option.id;

                return (
                  <OptionChip
                    key={option.id}
                    active={active}
                    disabled={disabled}
                    label={option.label}
                    onPress={() => handleToggleFieldOption(sectionId, field, option.id)}
                  />
                );
              })}
            </View>
          ) : (
            <View className="gap-2">
              {visibleOptions.map((option) => {
                const active = Array.isArray(fieldValue)
                  ? fieldValue.includes(option.id)
                  : fieldValue === option.id;

                return (
                  <CheckboxRow
                    key={option.id}
                    active={active}
                    disabled={disabled}
                    label={option.label}
                    onPress={() => handleToggleFieldOption(sectionId, field, option.id)}
                  />
                );
              })}
            </View>
          )}
        </View>
      );
    },
    [currentDraft, currentMode, handleFieldValueChange, handleToggleFieldOption, hasConnectXPro, searchTerms, sectionById]
  );

  const renderSectionContent = React.useCallback(
    (section: DiscoveryFilterSection) => {
      const disabled = isDisabledDiscoveryFilterSection(section, hasConnectXPro);
      const sectionValue = currentDraft[section.id];
      const searchKey = `${currentMode}:${section.id}`;
      const searchTerm = searchTerms[searchKey] ?? '';

      if (section.type === 'group') {
        return (
          <View className="gap-4 pt-3">
            {section.fields?.map((field) => renderField(section.id, field))}
          </View>
        );
      }

      if (section.id === 'industryIds' || section.id === 'skillStrengthIds' || section.id === 'roleNeededIds') {
        const searchableOptions = filterSearchableCheckboxOptions(section.options, searchTerm);

        return (
          <View className="gap-4 pt-3">
            <View
              className="flex-row items-center gap-3 rounded-full border px-5"
              style={{
                backgroundColor: searchTerm ? '#292929' : '#2C2C2C',
                borderColor: searchTerm ? '#FF9A3E' : 'rgba(255, 255, 255, 0.1)',
                height: 56,
              }}>
              <Ionicons color={searchTerm ? '#FF9A3E' : '#98A2B3'} name="search" size={20} />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 font-body text-[15px] text-white"
                editable={!disabled}
                onChangeText={(value) =>
                  setSearchTerms((current) => ({
                    ...current,
                    [searchKey]: value,
                  }))
                }
                placeholder={getSearchableCheckboxPlaceholder(section.id)}
                placeholderTextColor="#8A8F99"
                style={{ paddingVertical: 0 }}
                value={searchTerm}
              />
              {searchTerm ? (
                <Pressable
                  disabled={disabled}
                  hitSlop={10}
                  onPress={() =>
                    setSearchTerms((current) => ({
                      ...current,
                      [searchKey]: '',
                    }))
                  }>
                  <Ionicons color="#98A2B3" name="close-circle" size={20} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
              style={{ maxHeight: 320 }}>
              <View className="gap-1">
                {searchableOptions.map((option) => {
                  const active = Array.isArray(sectionValue)
                    ? sectionValue.includes(option.id)
                    : sectionValue === option.id;

                  return (
                    <Pressable
                      key={option.id}
                      className="min-h-[54px] flex-row items-center gap-4 py-2"
                      disabled={disabled}
                      onPress={() => handleToggleSectionOption(section, option.id)}
                      style={{ opacity: disabled ? 0.45 : 1 }}>
                      <View className="flex-1 gap-1">
                        <AppText
                          className="text-[15px] leading-[21px]"
                          style={{ color: active ? '#FF9A3E' : '#FFFFFF' }}>
                          {option.label}
                        </AppText>
                        {option.description ? (
                          <AppText className="text-[13px] leading-[18px]" tone="muted">
                            {option.description}
                          </AppText>
                        ) : null}
                      </View>
                      <View
                        className="h-7 w-7 items-center justify-center rounded-[7px] border-2"
                        style={{
                          backgroundColor: active ? '#FF9A3E' : 'transparent',
                          borderColor: active ? '#FF9A3E' : '#5A6074',
                        }}>
                        {active ? <Ionicons color="#1A1208" name="checkmark" size={17} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {searchableOptions.length === 0 ? (
                <View className="px-4 py-8">
                  <AppText align="center" tone="muted">
                    {getSearchableCheckboxEmptyMessage(section.id, searchTerm)}
                  </AppText>
                </View>
              ) : null}
            </ScrollView>
          </View>
        );
      }

      const visibleOptions = filterOptionsBySearch(section.options, searchTerm);

      return (
        <View className="gap-3 pt-3">
          {section.ui.searchable ? (
            <SearchInput
              disabled={disabled}
              onChangeText={(value) =>
                setSearchTerms((current) => ({
                  ...current,
                  [searchKey]: value,
                }))
              }
              value={searchTerm}
            />
          ) : null}
          {visibleOptions.length === 0 ? (
            <AppText className="text-[13px]" tone="muted">
              {getEmptyOptionsMessage(section.options, searchTerm)}
            </AppText>
          ) : null}
          <View className="flex-row flex-wrap gap-2">
            {visibleOptions.map((option) => {
              const active = Array.isArray(sectionValue)
                ? sectionValue.includes(option.id)
                : sectionValue === option.id;

              return (
                <OptionChip
                  key={option.id}
                  active={active}
                  disabled={disabled}
                  label={option.label}
                  onPress={() => handleToggleSectionOption(section, option.id)}
                />
              );
            })}
          </View>
        </View>
      );
    },
    [currentDraft, currentMode, handleToggleSectionOption, hasConnectXPro, renderField, searchTerms]
  );

  const renderAccordionSection = React.useCallback(
    (section: DiscoveryFilterSection) => {
      const expanded = currentExpanded[section.id] ?? false;
      const disabled = isDisabledDiscoveryFilterSection(section, hasConnectXPro);

      return (
        <View
          key={section.id}
          className="border-b pb-4"
          style={{ borderBottomColor: 'rgba(152, 162, 179, 0.12)' }}>
          <Pressable className="flex-row items-center justify-between py-3" onPress={() => handleToggleSection(section.id)}>
            <View className="flex-row items-center gap-3">
              <Ionicons color={disabled ? '#667085' : '#FF9A3E'} name={sectionIcon(section.id)} size={20} />
              <AppText className="text-[17px]" variant="subtitle">
                {section.title}
              </AppText>
            </View>
            <Ionicons color="#98A2B3" name={expanded ? 'chevron-up' : 'chevron-down'} size={18} />
          </Pressable>
          {expanded ? (
            <>
              {disabled ? (
                <AppText className="pb-1 text-[12px]" tone="muted">
                  ConnectX Pro is required to use this advanced filter section.
                </AppText>
              ) : null}
              {renderSectionContent(section)}
            </>
          ) : null}
        </View>
      );
    },
    [currentExpanded, handleToggleSection, hasConnectXPro, renderSectionContent]
  );

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(10, 10, 14, 0.62)' }}>
        <Pressable className="flex-1" onPress={onClose} />
        <View
          className="rounded-t-[30px] border border-white/10 bg-[#2C2C2C] px-4 pt-8"
          style={{ maxHeight: '90%', paddingBottom: Math.max(insets.bottom, 16) }}>
          <View className="mb-4 flex-row items-start justify-between">
            <View className="flex-1 gap-1">
              <View className="flex-row items-center gap-3">
                <Ionicons color="#FF9A3E" name="sparkles-outline" size={20} />
                <AppText className="text-[18px]" variant="title">
                  Candidate Filters
                </AppText>
              </View>
              <AppText tone="muted">
                Tune the discovery deck and generate candidates from the filters you can use today
              </AppText>
            </View>
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full border border-border bg-background"
              onPress={onClose}>
              <Ionicons color="#D0D5DD" name="close" size={18} />
            </Pressable>
          </View>

          {errorMessage ? (
            <AppCard tone="signal" className="mb-4 gap-1.5 rounded-[18px] border-white/10 bg-[#2C2C2C] p-3">
              <AppText variant="subtitle">Filters unavailable</AppText>
              <AppText tone="muted">{errorMessage}</AppText>
            </AppCard>
          ) : null}

          {optionsErrorMessage ? (
            <AppCard tone="signal" className="mb-4 gap-1.5 rounded-[18px] border-white/10 bg-[#2C2C2C] p-3">
              <AppText variant="subtitle">Filter options unavailable</AppText>
              <AppText tone="muted">{optionsErrorMessage}</AppText>
            </AppCard>
          ) : null}

          <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
            <View className="gap-4">
              <AppText className="text-[12px] tracking-[1.6px]" tone="muted" variant="label">
                YOUR GOAL RIGHT NOW
              </AppText>
              <View className="flex-row flex-wrap gap-3">
                {goalOptions.map((goal) => (
                  <View key={goal.id} style={{ width: '48%' }}>
                    <GoalCard
                      active={GOAL_MODE_MAP[goal.id as DiscoveryGoalId] === currentMode}
                      description={goal.description}
                      goalId={goal.id}
                      label={goal.label}
                      onPress={() => handleGoalPress(goal.id)}
                    />
                  </View>
                ))}
              </View>
            </View>

            {isLoadingOptions ? (
              <AppCard tone="default" className="gap-1.5 rounded-[18px] border-white/10 bg-[#2C2C2C] p-4">
                <AppText variant="subtitle">Loading filter options...</AppText>
                <AppText tone="muted">
                  Pulling the latest industries, skills, roles, and languages for this goal.
                </AppText>
              </AppCard>
            ) : (
              <>
                <View className="gap-1">
                  {basicSections.map((section) => renderAccordionSection(section))}
                </View>

                {advancedSections.length > 0 ? (
                  <View className="gap-3">
                    <AppText className="text-[12px] tracking-[1.8px]" tone="signal" variant="label">
                      ADVANCED FILTERS
                    </AppText>
                    <View className="gap-1">
                      {advancedSections.map((section) => renderAccordionSection(section))}
                    </View>
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>

          <View className="mt-5">
            <Pressable
              disabled={isApplying || isLoadingOptions}
              onPress={() => onApply(currentMode, stripDisabledDiscoveryFilters(currentDraft, sections, hasConnectXPro))}
              className="h-14 flex-row items-center justify-center gap-3 rounded-[18px]"
              style={{
                backgroundColor: '#FF9A3E',
                borderCurve: 'continuous',
                opacity: isApplying || isLoadingOptions ? 0.5 : 1,
              }}
              android_ripple={{ color: 'rgba(0,0,0,0.12)' }}>
              <AppText variant="subtitle" className="text-[16px] text-[#1A1208]">
                <Ionicons color="" name="flash-outline" size={18} />
                {isApplying ? 'Generating...' : isLoadingOptions ? 'Loading filters...' : 'Generate Candidate'}
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
