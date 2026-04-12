import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, AppCard, AppText } from '@shared/components';

import type {
  DiscoveryAppliedFilters,
  DiscoveryFilterField,
  DiscoveryFilterOption,
  DiscoveryFilterSection,
  DiscoveryGoalId,
  DiscoveryMode,
} from '../types/discovery.types';

type DiscoveryFilterSheetProps = {
  currentMode: DiscoveryMode;
  errorMessage?: string | null;
  goalOptions: DiscoveryFilterOption[];
  initialAppliedMode: DiscoveryMode | null;
  initialFilters: DiscoveryAppliedFilters;
  isApplying?: boolean;
  onApply: (mode: DiscoveryMode, filters: DiscoveryAppliedFilters) => void;
  onClose: () => void;
  onModeChange: (mode: DiscoveryMode) => void;
  onReset: () => void;
  sections: DiscoveryFilterSection[];
  visible: boolean;
};

const GOAL_MODE_MAP: Record<DiscoveryGoalId, DiscoveryMode> = {
  goal_finding_cofounder: 'finding_cofounder',
  goal_building_team: 'building_team',
  goal_explore_startups: 'explore_startups',
  goal_joining_startups: 'joining_startups',
};

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
  initialFilters: DiscoveryAppliedFilters
) {
  return sections.reduce<DiscoveryAppliedFilters>((draft, section) => {
    if (section.id === 'goal') {
      return draft;
    }

    draft[section.id] =
      initialFilters[section.id] !== undefined ? initialFilters[section.id] : getDefaultSectionValue(section);
    return draft;
  }, {});
}

function cloneDraftFilters(filters: DiscoveryAppliedFilters) {
  return JSON.parse(JSON.stringify(filters)) as DiscoveryAppliedFilters;
}

function OptionChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="rounded-full border px-4 py-2"
      onPress={onPress}
      style={{
        backgroundColor: active ? '#2A2117' : '#1A1C22',
        borderColor: active ? 'rgba(255, 154, 62, 0.5)' : 'rgba(152, 162, 179, 0.18)',
      }}>
      <AppText
        className="text-[13px]"
        style={{ color: active ? '#FFB05B' : '#98A2B3' }}
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
      className="min-h-[100px] flex-1 rounded-[24px] border px-5 py-4"
      onPress={onPress}
      style={{
        backgroundColor: active ? '#3B2A1C' : '#1B1D22',
        borderColor: active ? '#FF9A3E' : 'rgba(152, 162, 179, 0.16)',
        shadowColor: active ? '#FF9A3E' : 'transparent',
        shadowOpacity: active ? 0.22 : 0,
        shadowRadius: active ? 8 : 0,
      }}>
      <View className="gap-3">
        <View className="flex-row items-center gap-3">
          <Ionicons color={active ? '#FF9A3E' : '#98A2B3'} name={goalIcon(goalId)} size={20} />
          <AppText
            className="flex-1 text-[15px]"
            style={{ color: active ? '#FF9A3E' : '#F2F4F7' }}
            variant="subtitle">
            {label}
          </AppText>
        </View>
        {description ? (
          <AppText className="text-[13px]" tone="muted">
            {description}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

function RangeControl({
  field,
  onChange,
  value,
}: {
  field: DiscoveryFilterField;
  onChange: (value: number) => void;
  value: number;
}) {
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const step = field.step ?? 1;
  const suffix = field.ui.suffix ?? '';
  const nextValue = Math.max(min, Math.min(max, value));

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <AppText tone="muted" variant="label">
          {field.title}
        </AppText>
        <AppText tone="signal" variant="bodyStrong">
          {nextValue}
          {suffix}
        </AppText>
      </View>
      <View className="flex-row items-center gap-3">
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-full border border-border bg-background"
          onPress={() => onChange(Math.max(min, nextValue - step))}>
          <Ionicons color="#D0D5DD" name="remove" size={18} />
        </Pressable>
        <View
          className="flex-1 rounded-full"
          style={{ backgroundColor: '#15171C', height: 6, overflow: 'hidden' }}>
          <View
            style={{
              backgroundColor: '#FF9A3E',
              height: '100%',
              width: `${((nextValue - min) / Math.max(max - min, 1)) * 100}%`,
            }}
          />
        </View>
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-full border border-border bg-background"
          onPress={() => onChange(Math.min(max, nextValue + step))}>
          <Ionicons color="#D0D5DD" name="add" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

function CheckboxRow({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="flex-row items-center gap-3 rounded-[18px] border px-4 py-3"
      onPress={onPress}
      style={{
        backgroundColor: active ? '#3B2A1C' : '#1B1D22',
        borderColor: active ? 'rgba(255, 154, 62, 0.5)' : 'rgba(152, 162, 179, 0.14)',
      }}>
      <View
        className="h-6 w-6 items-center justify-center rounded-full border"
        style={{
          backgroundColor: active ? '#FF9A3E' : 'transparent',
          borderColor: active ? '#FF9A3E' : 'rgba(152, 162, 179, 0.38)',
        }}>
        {active ? <Ionicons color="#11131A" name="checkmark" size={14} /> : null}
      </View>
      <AppText className="flex-1 text-[14px]" style={{ color: active ? '#FFB05B' : '#D0D5DD' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

function SearchInput({
  onChangeText,
  value,
}: {
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View
      className="flex-row items-center gap-2 rounded-[16px] border px-4"
      style={{ backgroundColor: '#15171C', borderColor: 'rgba(152, 162, 179, 0.14)', minHeight: 46 }}>
      <Ionicons color="#667085" name="search-outline" size={16} />
      <TextInput
        className="flex-1 font-body text-[14px] text-text"
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

export function DiscoveryFilterSheet({
  currentMode,
  errorMessage,
  goalOptions,
  initialAppliedMode,
  initialFilters,
  isApplying = false,
  onApply,
  onClose,
  onModeChange,
  onReset,
  sections,
  visible,
}: DiscoveryFilterSheetProps) {
  const insets = useSafeAreaInsets();
  const [draftByMode, setDraftByMode] = React.useState<Partial<Record<DiscoveryMode, DiscoveryAppliedFilters>>>({});
  const [expandedByMode, setExpandedByMode] = React.useState<
    Partial<Record<DiscoveryMode, Record<string, boolean>>>
  >({});
  const [searchTerms, setSearchTerms] = React.useState<Record<string, string>>({});

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
            ? buildInitialDraft(sections, initialFilters)
            : buildInitialDraft(sections, {}),
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
  }, [currentMode, initialAppliedMode, initialFilters, sections, visible]);

  const currentDraft = React.useMemo(
    () => draftByMode[currentMode] ?? buildInitialDraft(sections, {}),
    [currentMode, draftByMode, sections]
  );
  const currentExpanded = React.useMemo(
    () => expandedByMode[currentMode] ?? {},
    [currentMode, expandedByMode]
  );

  const basicSections = sections.filter(
    (section) => section.id !== 'goal' && (section.type !== 'group' || section.id === 'locationAvailability')
  );
  const premiumSections = sections.filter(
    (section) => section.id !== 'goal' && section.type === 'group' && section.id !== 'locationAvailability'
  );

  const updateDraft = React.useCallback(
    (updater: (current: DiscoveryAppliedFilters) => DiscoveryAppliedFilters) => {
      setDraftByMode((current) => ({
        ...current,
        [currentMode]: updater(cloneDraftFilters(current[currentMode] ?? buildInitialDraft(sections, {}))),
      }));
    },
    [currentMode, sections]
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
    [updateDraft]
  );

  const handleToggleFieldOption = React.useCallback(
    (sectionId: string, field: DiscoveryFilterField, optionId: string) => {
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
    [updateDraft]
  );

  const handleGoalPress = React.useCallback((goalId: string) => {
    const nextMode = GOAL_MODE_MAP[goalId as DiscoveryGoalId];

    if (!nextMode || nextMode === currentMode) {
      return;
    }

    onModeChange(nextMode);
  }, [currentMode, onModeChange]);

  const handleResetPress = React.useCallback(() => {
    setDraftByMode({});
    setExpandedByMode({});
    setSearchTerms({});
    onReset();
  }, [onReset]);

  const renderField = React.useCallback(
    (sectionId: string, field: DiscoveryFilterField) => {
      const sectionValue = isRecordValue(currentDraft[sectionId]) ? currentDraft[sectionId] : {};
      const fieldValue = sectionValue[field.id] ?? getDefaultFieldValue(field);
      const searchKey = `${currentMode}:${sectionId}:${field.id}`;
      const searchTerm = searchTerms[searchKey] ?? '';

      if (field.ui.component === 'switch') {
        return (
          <View
            key={field.id}
            className="flex-row items-center justify-between rounded-[18px] border px-4 py-3"
            style={{ backgroundColor: '#1B1D22', borderColor: 'rgba(152, 162, 179, 0.14)' }}>
            <AppText className="flex-1 text-[14px]">{field.title}</AppText>
            <Switch
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
              onChangeText={(value) =>
                setSearchTerms((current) => ({
                  ...current,
                  [searchKey]: value,
                }))
              }
              value={searchTerm}
            />
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
    [currentDraft, currentMode, handleFieldValueChange, handleToggleFieldOption, searchTerms]
  );

  const renderSectionContent = React.useCallback(
    (section: DiscoveryFilterSection) => {
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

      const visibleOptions = filterOptionsBySearch(section.options, searchTerm);

      return (
        <View className="gap-3 pt-3">
          {section.ui.searchable ? (
            <SearchInput
              onChangeText={(value) =>
                setSearchTerms((current) => ({
                  ...current,
                  [searchKey]: value,
                }))
              }
              value={searchTerm}
            />
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
                  label={option.label}
                  onPress={() => handleToggleSectionOption(section, option.id)}
                />
              );
            })}
          </View>
        </View>
      );
    },
    [currentDraft, currentMode, handleToggleSectionOption, renderField, searchTerms]
  );

  const renderAccordionSection = React.useCallback(
    (section: DiscoveryFilterSection) => {
      const expanded = currentExpanded[section.id] ?? false;

      return (
        <View
          key={section.id}
          className="border-b pb-4"
          style={{ borderBottomColor: 'rgba(152, 162, 179, 0.12)' }}>
          <Pressable className="flex-row items-center justify-between py-3" onPress={() => handleToggleSection(section.id)}>
            <View className="flex-row items-center gap-3">
              <Ionicons color="#FF9A3E" name={sectionIcon(section.id)} size={20} />
              <AppText className="text-[17px]" variant="subtitle">
                {section.title}
              </AppText>
            </View>
            <Ionicons color="#98A2B3" name={expanded ? 'chevron-up' : 'chevron-down'} size={18} />
          </Pressable>
          {expanded ? renderSectionContent(section) : null}
        </View>
      );
    },
    [currentExpanded, handleToggleSection, renderSectionContent]
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
          className="rounded-t-[30px] border border-border bg-surface px-4 pt-4"
          style={{ maxHeight: '90%', paddingBottom: Math.max(insets.bottom, 16) }}>
          <View className="mb-4 flex-row items-start justify-between">
            <View className="flex-1 gap-1">
              <View className="flex-row items-center gap-3">
                <Ionicons color="#FF9A3E" name="sparkles-outline" size={20} />
                <AppText className="text-[18px]" variant="title">
                  Premium Filters
                </AppText>
              </View>
              <AppText tone="muted">
                Advanced match intelligence for better startup connections
              </AppText>
            </View>
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full border border-border bg-background"
              onPress={onClose}>
              <Ionicons color="#D0D5DD" name="close" size={18} />
            </Pressable>
          </View>

          {errorMessage ? (
            <AppCard tone="signal" className="mb-4 gap-1.5 rounded-[18px] p-3">
              <AppText variant="subtitle">Filters unavailable</AppText>
              <AppText tone="muted">{errorMessage}</AppText>
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

            <View className="gap-1">
              {basicSections.map((section) => renderAccordionSection(section))}
            </View>

            {premiumSections.length > 0 ? (
              <View className="gap-3">
                <AppText className="text-[12px] tracking-[1.8px]" tone="signal" variant="label">
                  PREMIUM INTELLIGENCE
                </AppText>
                <View className="gap-1">
                  {premiumSections.map((section) => renderAccordionSection(section))}
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View className="mt-5 flex-row gap-3">
            <AppButton
              className="flex-1"
              disabled={isApplying}
              label="Reset"
              onPress={handleResetPress}
              variant="secondary"
            />
            <AppButton
              className="flex-1"
              disabled={isApplying}
              label={isApplying ? 'Applying...' : 'Apply Filters'}
              onPress={() => onApply(currentMode, currentDraft)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
