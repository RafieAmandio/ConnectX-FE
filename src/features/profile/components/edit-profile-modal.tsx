import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppCard, AppText } from '@shared/components';
import { cn } from '@shared/utils/cn';

import {
  useMyProfile,
  useProfileOptions,
  useUpdateMyProfile,
  useUploadProfileImage,
} from '../hooks/use-profile';
import { mockMyProfileResponse, mockProfileOptionsResponse } from '../mock/profile.mock';
import type {
  MyProfileData,
  MyProfileResponse,
  ProfileAboutSection,
  ProfileEducationItem,
  ProfileExperienceItem,
  ProfileOptionsResponse,
  UpdateMyProfileRequest,
} from '../types/profile.types';

type FormErrors = Partial<Record<keyof UpdateMyProfileRequest, string>>;
type EditableBackgroundTab = 'experience' | 'education';
type ProfileLocationOption = ProfileOptionsResponse['data']['locations'][number];
type ProfilePersonalityOption = ProfileOptionsResponse['data']['personalityAndHobbies'][number];

const MAX_PERSONALITY_SELECTIONS = 6;
const profilePalette = {
  accent: '#FF9A3E',
  accentSoft: '#2A2117',
  canvas: '#262626',
  header: '#262626',
  field: '#292929',
  selected: '#1F1712',
  border: '#383838',
  borderSoft: 'rgba(255, 255, 255, 0.08)',
  text: '#FFFFFF',
  textMuted: '#98A2B3',
  textSoft: '#8F8F8F',
  buttonText: '#1A1208',
  danger: '#FF5A67',
};

type ProfileInputProps = TextInputProps & {
  className?: string;
  error?: string;
  label?: string;
  shellClassName?: string;
};

function hasUsableProfile(response?: MyProfileResponse) {
  return typeof response?.data?.id === 'string' && response.data.id.length > 0;
}

function hasUsablePersonalityOptions(response?: ProfileOptionsResponse) {
  return Array.isArray(response?.data?.personalityAndHobbies);
}

function hasUsableLocationOptions(response?: ProfileOptionsResponse) {
  return Array.isArray(response?.data?.locations);
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function slugifyLocationLabel(value: string) {
  return value
    .split(',')[0]
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') ?? '';
}

function resolveInitialLocationId(profile: MyProfileData, locations: ProfileLocationOption[]) {
  const locationId = profile.location.id?.trim();

  if (locationId) {
    return locationId;
  }

  const matchingLocation = locations.find(
    (location) =>
      location.label === profile.location.display ||
      location.value === profile.location.city.toLowerCase()
  );

  return matchingLocation?.value ?? slugifyLocationLabel(profile.location.display);
}

function buildInitialFormState(
  profile: MyProfileData,
  locations: ProfileLocationOption[] = mockProfileOptionsResponse.data.locations
): UpdateMyProfileRequest {
  return {
    name: profile.name,
    headline: profile.headline,
    photoUrl: profile.photoUrl,
    locationId: resolveInitialLocationId(profile, locations),
    about: profile.sections.about?.value ?? '',
    personalityAndHobbyIds:
      profile.sections.personalityAndHobbies?.items.map((item) => item.id) ?? [],
    experience: profile.sections.experience?.items ?? [],
    education: profile.sections.education?.items ?? [],
  };
}

function getAboutCopy(aboutSection: ProfileAboutSection | undefined) {
  if (aboutSection?.kind === 'startupIdea') {
    return {
      errorLabel: aboutSection.title || 'Startup idea',
      label: aboutSection.title || 'Startup Idea',
      placeholder: 'Describe your startup idea',
    };
  }

  return {
    errorLabel: aboutSection?.title || 'Description',
    label: aboutSection?.title || 'Description',
    placeholder: 'Describe yourself and what you are looking for',
  };
}

function validateForm(formState: UpdateMyProfileRequest, aboutErrorLabel: string): FormErrors {
  const nextErrors: FormErrors = {};

  if (!formState.name.trim()) {
    nextErrors.name = 'Full name is required.';
  } else if (formState.name.trim().length > 100) {
    nextErrors.name = 'Full name must be 100 characters or fewer.';
  }

  if (!formState.headline.trim()) {
    nextErrors.headline = 'Headline is required.';
  } else if (formState.headline.trim().length > 120) {
    nextErrors.headline = 'Headline must be 120 characters or fewer.';
  }

  if (!formState.locationId.trim()) {
    nextErrors.locationId = 'Location is required.';
  }

  if (!formState.about.trim()) {
    nextErrors.about = `${aboutErrorLabel} is required.`;
  } else if (formState.about.trim().length > 500) {
    nextErrors.about = `${aboutErrorLabel} must be 500 characters or fewer.`;
  }

  if ((formState.personalityAndHobbyIds?.length ?? 0) > MAX_PERSONALITY_SELECTIONS) {
    nextErrors.personalityAndHobbyIds = 'You can select up to 6 personality and hobby tags.';
  }

  const hasInvalidExperience = formState.experience.some(
    (item) => !item.title.trim() || !item.organization.trim()
  );

  if (hasInvalidExperience) {
    nextErrors.experience = 'Each experience needs a title and organization.';
  }

  const hasInvalidEducation = formState.education.some(
    (item) => !item.degree.trim() || !item.school.trim()
  );

  if (hasInvalidEducation) {
    nextErrors.education = 'Each education item needs a degree and school.';
  }

  return nextErrors;
}

function ProfileInput({
  className,
  error,
  label,
  placeholderTextColor = profilePalette.textSoft,
  shellClassName,
  style,
  ...props
}: ProfileInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View className={cn('gap-2', shellClassName)}>
      {label ? (
        <AppText
          style={{ color: isFocused ? profilePalette.accent : profilePalette.textMuted }}
          variant="label">
          {label}
        </AppText>
      ) : null}
      <TextInput
        className={cn(
          'min-h-14 rounded-[16px] border py-3 pl-3 pr-4 font-body text-[15px]',
          className
        )}
        onBlur={(event) => {
          setIsFocused(false);
          props.onBlur?.(event);
        }}
        onFocus={(event) => {
          setIsFocused(true);
          props.onFocus?.(event);
        }}
        placeholderTextColor={placeholderTextColor}
        style={[
          {
            backgroundColor: profilePalette.field,
            borderColor: error
              ? profilePalette.danger
              : isFocused
                ? profilePalette.accent
                : profilePalette.border,
            color: profilePalette.text,
            letterSpacing: 0,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <AppText
          className="px-1"
          selectable
          style={{ color: profilePalette.danger }}
          variant="code">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function ActionButton({
  disabled,
  icon,
  label,
  onPress,
  tone = 'secondary',
}: {
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary';
}) {
  const backgroundColor =
    tone === 'primary' ? profilePalette.accent : profilePalette.field;
  const borderColor = tone === 'primary' ? profilePalette.accent : profilePalette.border;
  const textColor = tone === 'primary' ? profilePalette.buttonText : profilePalette.text;

  return (
    <Pressable
      className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-[12px] border"
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor,
        borderColor,
        opacity: disabled ? 0.55 : 1,
      }}>
      {icon ? <Ionicons color={textColor} name={icon} size={18} /> : null}
      <AppText className="text-[14px]" style={{ color: textColor }} variant="bodyStrong">
        {label}
      </AppText>
    </Pressable>
  );
}

function getLocationOptionLabel(options: ProfileLocationOption[], value: string) {
  return options.find((option) => option.value === value || option.id === value)?.label ?? '';
}

function filterLocationOptions(options: ProfileLocationOption[], searchTerm: string) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (!normalizedSearch) {
    return [];
  }

  return options.filter((option) => {
    const haystack = `${option.label} ${option.group ?? ''}`.toLowerCase();
    return haystack.includes(normalizedSearch);
  });
}

function groupLocationOptions(options: ProfileLocationOption[]) {
  const groups = new Map<string, ProfileLocationOption[]>();

  options.forEach((option) => {
    const groupName = option.group || 'Other';
    groups.set(groupName, [...(groups.get(groupName) ?? []), option]);
  });

  return Array.from(groups.entries());
}

function LocationSelector({
  error,
  locations,
  onChange,
  value,
}: {
  error?: string;
  locations: ProfileLocationOption[];
  onChange: (value: string) => void;
  value: string;
}) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const selectedLabel = getLocationOptionLabel(locations, value);
  const visibleOptions = filterLocationOptions(locations, searchTerm);
  const hasSearchTerm = searchTerm.trim().length > 0;

  return (
    <View className="gap-2.5">
      <AppText style={{ color: profilePalette.textMuted }} variant="label">
        Location
      </AppText>
      <View
        className="gap-3 rounded-[16px] border p-3"
        style={{
          backgroundColor: profilePalette.field,
          borderColor: error ? profilePalette.danger : profilePalette.border,
        }}>
        {selectedLabel ? (
          <View
            className="flex-row items-center justify-between gap-3 rounded-[14px] px-3 py-2.5"
            style={{ backgroundColor: profilePalette.accentSoft }}>
            <View className="min-w-0 flex-1 gap-0.5">
              <AppText className="text-[11px]" tone="muted" variant="label">
                Selected city
              </AppText>
              <AppText
                className="text-[14px]"
                numberOfLines={1}
                style={{ color: profilePalette.accent }}
                variant="bodyStrong">
                {selectedLabel}
              </AppText>
            </View>
            <Pressable hitSlop={10} onPress={() => onChange('')}>
              <Ionicons color={profilePalette.textMuted} name="close-circle" size={20} />
            </Pressable>
          </View>
        ) : null}

        <View
          className="flex-row items-center gap-2 rounded-[14px] border px-4"
          style={{
            backgroundColor: '#2C2C2C',
            borderColor: 'rgba(255,255,255,0.1)',
            minHeight: 46,
          }}>
          <Ionicons color={profilePalette.textSoft} name="search-outline" size={16} />
          <TextInput
            autoCapitalize="words"
            className="flex-1 font-body text-[14px]"
            onChangeText={setSearchTerm}
            placeholder="Search a city"
            placeholderTextColor={profilePalette.textSoft}
            style={{ color: profilePalette.text, letterSpacing: 0 }}
            value={searchTerm}
          />
        </View>

        {hasSearchTerm ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={{ maxHeight: 240 }}>
            <View className="gap-2">
              {groupLocationOptions(visibleOptions).map(([groupName, options]) => (
                <View key={groupName} className="gap-1">
                  <AppText className="px-1 text-[12px]" tone="muted" variant="label">
                    {groupName}
                  </AppText>
                  {options.map((option) => {
                    const active = value === option.value;

                    return (
                      <Pressable
                        key={option.id}
                        className="flex-row items-center justify-between gap-3 rounded-[14px] px-3 py-3"
                        onPress={() => {
                          onChange(option.value);
                          setSearchTerm('');
                        }}
                        style={{ backgroundColor: active ? profilePalette.accentSoft : '#2C2C2C' }}>
                        <AppText
                          className="flex-1 text-[14px]"
                          style={{ color: active ? profilePalette.accent : profilePalette.text }}
                          variant="bodyStrong">
                          {option.label}
                        </AppText>
                        {active ? (
                          <Ionicons color={profilePalette.accent} name="checkmark" size={18} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
            {visibleOptions.length === 0 ? (
              <View className="px-4 py-6">
                <AppText align="center" tone="muted">
                  {`No results for "${searchTerm}"`}
                </AppText>
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </View>
      {error ? (
        <AppText className="px-1" selectable style={{ color: profilePalette.danger }} variant="code">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function filterPersonalityOptions(options: ProfilePersonalityOption[], searchTerm: string) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (!normalizedSearch) {
    return options;
  }

  return options.filter((option) => option.name.toLowerCase().includes(normalizedSearch));
}

function PersonalityAndHobbiesSelector({
  error,
  onToggle,
  options,
  selectedIds,
}: {
  error?: string;
  onToggle: (itemId: string) => void;
  options: ProfilePersonalityOption[];
  selectedIds: string[];
}) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isExpanded, setIsExpanded] = React.useState(true);
  const visibleOptions = filterPersonalityOptions(options, searchTerm);
  const selectedOptions = options.filter((option) => selectedIds.includes(option.id));
  const hasSearchTerm = searchTerm.trim().length > 0;
  const hasReachedLimit = selectedIds.length >= MAX_PERSONALITY_SELECTIONS;

  return (
    <View className="gap-3">
      {selectedOptions.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <Pressable
              key={option.id}
              className="flex-row items-center gap-1.5 rounded-full border px-3 py-2"
              onPress={() => onToggle(option.id)}
              style={{
                backgroundColor: profilePalette.selected,
                borderColor: profilePalette.accent,
              }}>
              <AppText
                className="text-[13px]"
                style={{ color: profilePalette.accent }}
                variant="bodyStrong">
                {option.name}
              </AppText>
              <Ionicons color={profilePalette.accent} name="close-circle" size={17} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <View
        className="gap-2 rounded-[16px] border p-3"
        style={{
          backgroundColor: profilePalette.field,
          borderColor: error ? profilePalette.danger : profilePalette.border,
        }}>
        <View
          className="flex-row items-center gap-2 rounded-[14px] border px-4"
          style={{
            backgroundColor: '#2C2C2C',
            borderColor: 'rgba(255,255,255,0.1)',
            minHeight: 46,
          }}>
          <Ionicons color={profilePalette.textSoft} name="search-outline" size={16} />
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            className="flex-1 font-body text-[14px]"
            onChangeText={setSearchTerm}
            onFocus={() => setIsExpanded(true)}
            placeholder="Search personality or hobbies"
            placeholderTextColor={profilePalette.textSoft}
            style={{ color: profilePalette.text, letterSpacing: 0 }}
            value={searchTerm}
          />
          {hasSearchTerm ? (
            <Pressable hitSlop={10} onPress={() => setSearchTerm('')}>
              <Ionicons color={profilePalette.textMuted} name="close-circle" size={18} />
            </Pressable>
          ) : (
            <Pressable hitSlop={10} onPress={() => setIsExpanded((current) => !current)}>
              <Ionicons
                color={profilePalette.textMuted}
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
              />
            </Pressable>
          )}
        </View>

        {isExpanded ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={{ maxHeight: 240 }}>
            <View className="gap-1">
              {visibleOptions.map((option) => {
                const isSelected = selectedIds.includes(option.id);
                const isDisabled = !isSelected && hasReachedLimit;

                return (
                  <Pressable
                    key={option.id}
                    className="flex-row items-center justify-between gap-3 rounded-[14px] px-3 py-3"
                    disabled={isDisabled}
                    onPress={() => onToggle(option.id)}
                    style={{
                      backgroundColor: isSelected ? profilePalette.accentSoft : '#2C2C2C',
                      opacity: isDisabled ? 0.45 : 1,
                    }}>
                    <AppText
                      className="flex-1 text-[14px]"
                      style={{ color: isSelected ? profilePalette.accent : profilePalette.text }}
                      variant="bodyStrong">
                      {option.name}
                    </AppText>
                    {isSelected ? (
                      <Ionicons color={profilePalette.accent} name="checkmark" size={18} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            {hasSearchTerm && visibleOptions.length === 0 ? (
              <View className="px-4 py-6">
                <AppText align="center" tone="muted">
                  {`No results for "${searchTerm}"`}
                </AppText>
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </View>

      {error ? (
        <AppText className="text-[12px]" tone="danger" variant="code">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function BackgroundTabButton({
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
      className="min-h-10 flex-1 items-center justify-center rounded-[14px] px-3 active:opacity-80"
      onPress={onPress}
      style={{
        backgroundColor: active ? profilePalette.accentSoft : 'transparent',
        borderColor: active ? profilePalette.accent : 'transparent',
        borderWidth: 1,
      }}>
      <AppText
        className="text-[13px]"
        style={{ color: active ? profilePalette.accent : profilePalette.textMuted }}
        variant="bodyStrong">
        {label}
      </AppText>
    </Pressable>
  );
}

function BackgroundEditorHeader({
  icon,
  label,
  onAdd,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onAdd: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-row items-center gap-2">
        <Ionicons color={profilePalette.accent} name={icon} size={16} />
        <AppText className="text-[15px]" variant="subtitle">
          {label}
        </AppText>
      </View>
      <Pressable
        className="min-h-9 flex-row items-center gap-1.5 rounded-full border px-3 active:opacity-80"
        onPress={onAdd}
        style={{ backgroundColor: profilePalette.accentSoft, borderColor: profilePalette.accent }}>
        <Ionicons color={profilePalette.accent} name="add" size={16} />
        <AppText className="text-[12px]" style={{ color: profilePalette.accent }} variant="bodyStrong">
          Add
        </AppText>
      </Pressable>
    </View>
  );
}

function BackgroundLogoUpload({
  disabled,
  isUploading,
  label,
  logoUrl,
  onPick,
  onRemove,
}: {
  disabled?: boolean;
  isUploading?: boolean;
  label: string;
  logoUrl?: string | null;
  onPick: () => void;
  onRemove: () => void;
}) {
  const currentUrl = logoUrl?.trim() || null;

  return (
    <View className="gap-2">
      <AppText style={{ color: profilePalette.textMuted }} variant="label">
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        className="min-h-[132px] overflow-hidden rounded-[16px] border p-4 active:opacity-80"
        disabled={disabled}
        onPress={onPick}
        style={{
          backgroundColor: '#2C2C2C',
          borderColor: currentUrl ? profilePalette.accent : profilePalette.border,
          opacity: disabled ? 0.7 : 1,
        }}>
        {currentUrl ? (
          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <View
                className="overflow-hidden rounded-[14px] border"
                style={{
                  backgroundColor: profilePalette.field,
                  borderColor: profilePalette.borderSoft,
                  height: 64,
                  width: 64,
                }}>
                <Image
                  contentFit="cover"
                  source={{ uri: currentUrl }}
                  style={{ height: '100%', width: '100%' }}
                />
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <AppText className="text-[14px]" variant="bodyStrong">
                  Logo selected
                </AppText>
                <AppText className="text-[12px]" numberOfLines={1} selectable tone="muted">
                  {currentUrl}
                </AppText>
              </View>
            </View>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center gap-3 py-3">
            <View
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: profilePalette.accentSoft }}>
              <Ionicons color={profilePalette.accent} name="image-outline" size={22} />
            </View>
            <View className="items-center gap-1">
              <AppText align="center" className="text-[14px]" variant="bodyStrong">
                Upload logo
              </AppText>
              <AppText align="center" className="text-[12px]" tone="muted">
                Choose an image from your library
              </AppText>
            </View>
          </View>
        )}

        <View className="mt-4 flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1 flex-row items-center gap-2">
            {isUploading ? <ActivityIndicator color={profilePalette.accent} size="small" /> : null}
            <AppText className="text-[12px]" numberOfLines={1} tone="muted">
              {isUploading ? 'Uploading...' : currentUrl ? 'Tap to replace' : 'JPG or PNG'}
            </AppText>
          </View>

          {currentUrl && !isUploading ? (
            <Pressable
              accessibilityRole="button"
              className="rounded-full border px-3 py-1"
              disabled={disabled}
              onPress={(event) => {
                event.stopPropagation();
                onRemove();
              }}
              style={{ borderColor: profilePalette.border }}>
              <AppText className="text-[12px]" tone="muted" variant="label">
                Remove
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

function sanitizeRequiredText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeOptionalText(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  return value.trim() || null;
}

function sanitizeExperience(items: ProfileExperienceItem[]) {
  return items.map((item) => ({
    ...item,
    title: sanitizeRequiredText(item.title),
    organization: sanitizeRequiredText(item.organization),
    period: sanitizeOptionalText(item.period),
    location: sanitizeOptionalText(item.location),
    companyLogo: sanitizeOptionalText(item.companyLogo),
    description: sanitizeOptionalText(item.description),
  }));
}

function sanitizeEducation(items: ProfileEducationItem[]) {
  return items.map((item) => ({
    ...item,
    degree: sanitizeRequiredText(item.degree),
    school: sanitizeRequiredText(item.school),
    field: sanitizeOptionalText(item.field),
    period: sanitizeOptionalText(item.period),
    schoolLogo: sanitizeOptionalText(item.schoolLogo),
    description: sanitizeOptionalText(item.description),
  }));
}

function ExperienceEditor({
  disabled,
  error,
  items,
  onPickLogo,
  onChange,
  uploadingLogoKey,
}: {
  disabled?: boolean;
  error?: string;
  items: ProfileExperienceItem[];
  onPickLogo: (index: number) => void;
  onChange: (items: ProfileExperienceItem[]) => void;
  uploadingLogoKey?: string | null;
}) {
  function updateItem(index: number, patch: Partial<ProfileExperienceItem>) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    onChange(items.filter((_item, itemIndex) => itemIndex !== index));
  }

  return (
    <View className="gap-4">
      <BackgroundEditorHeader
        icon="briefcase-outline"
        label={`Experience (${items.length})`}
        onAdd={() => onChange([...items, { title: '', organization: '', period: '', location: '' }])}
      />

      {items.length ? (
        items.map((item, index) => (
          <View
            key={item.id ?? `experience-${index}`}
            className="gap-4 rounded-[18px] border p-4"
            style={{ backgroundColor: '#252525', borderColor: profilePalette.border }}>
            <View className="flex-row items-center justify-between gap-3">
              <AppText className="text-[13px]" tone="muted" variant="label">
                Experience {index + 1}
              </AppText>
              <Pressable hitSlop={10} onPress={() => removeItem(index)}>
                <Ionicons color={profilePalette.danger} name="trash-outline" size={18} />
              </Pressable>
            </View>
            <ProfileInput
              autoCapitalize="words"
              label="Title"
              onChangeText={(value) => updateItem(index, { title: value })}
              placeholder="Growth Lead"
              value={item.title}
            />
            <ProfileInput
              autoCapitalize="words"
              label="Organization"
              onChangeText={(value) => updateItem(index, { organization: value })}
              placeholder="Company name"
              value={item.organization}
            />
            <View className="flex-row gap-3">
              <ProfileInput
                autoCapitalize="words"
                label="Period"
                onChangeText={(value) => updateItem(index, { period: value })}
                placeholder="2023 - Present"
                shellClassName="flex-1"
                value={item.period ?? ''}
              />
              <ProfileInput
                autoCapitalize="words"
                label="Location"
                onChangeText={(value) => updateItem(index, { location: value })}
                placeholder="Jakarta"
                shellClassName="flex-1"
                value={item.location ?? ''}
              />
            </View>
            <BackgroundLogoUpload
              disabled={disabled}
              isUploading={uploadingLogoKey === `experience-${index}`}
              label="Logo"
              logoUrl={item.companyLogo}
              onPick={() => onPickLogo(index)}
              onRemove={() => updateItem(index, { companyLogo: null })}
            />
          </View>
        ))
      ) : (
        <View
          className="items-center gap-2 rounded-[16px] border px-4 py-6"
          style={{ backgroundColor: '#252525', borderColor: profilePalette.border }}>
          <Ionicons color={profilePalette.textSoft} name="briefcase-outline" size={24} />
          <AppText align="center" className="text-[13px]" tone="muted">
            Add experience so matches can understand your background.
          </AppText>
        </View>
      )}

      {error ? (
        <AppText className="text-[12px]" tone="danger" variant="code">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function EducationEditor({
  disabled,
  error,
  items,
  onPickLogo,
  onChange,
  uploadingLogoKey,
}: {
  disabled?: boolean;
  error?: string;
  items: ProfileEducationItem[];
  onPickLogo: (index: number) => void;
  onChange: (items: ProfileEducationItem[]) => void;
  uploadingLogoKey?: string | null;
}) {
  function updateItem(index: number, patch: Partial<ProfileEducationItem>) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    onChange(items.filter((_item, itemIndex) => itemIndex !== index));
  }

  return (
    <View className="gap-4">
      <BackgroundEditorHeader
        icon="school-outline"
        label={`Education (${items.length})`}
        onAdd={() => onChange([...items, { degree: '', school: '', field: '', period: '' }])}
      />

      {items.length ? (
        items.map((item, index) => (
          <View
            key={item.id ?? `education-${index}`}
            className="gap-4 rounded-[18px] border p-4"
            style={{ backgroundColor: '#252525', borderColor: profilePalette.border }}>
            <View className="flex-row items-center justify-between gap-3">
              <AppText className="text-[13px]" tone="muted" variant="label">
                Education {index + 1}
              </AppText>
              <Pressable hitSlop={10} onPress={() => removeItem(index)}>
                <Ionicons color={profilePalette.danger} name="trash-outline" size={18} />
              </Pressable>
            </View>
            <ProfileInput
              autoCapitalize="words"
              label="Degree"
              onChangeText={(value) => updateItem(index, { degree: value })}
              placeholder="Bachelor of Business Administration"
              value={item.degree}
            />
            <ProfileInput
              autoCapitalize="words"
              label="School"
              onChangeText={(value) => updateItem(index, { school: value })}
              placeholder="University name"
              value={item.school}
            />
            <View className="flex-row gap-3">
              <ProfileInput
                autoCapitalize="words"
                label="Field"
                onChangeText={(value) => updateItem(index, { field: value })}
                placeholder="Product"
                shellClassName="flex-1"
                value={item.field ?? ''}
              />
              <ProfileInput
                autoCapitalize="words"
                label="Period"
                onChangeText={(value) => updateItem(index, { period: value })}
                placeholder="2017 - 2021"
                shellClassName="flex-1"
                value={item.period ?? ''}
              />
            </View>
            <BackgroundLogoUpload
              disabled={disabled}
              isUploading={uploadingLogoKey === `education-${index}`}
              label="Logo"
              logoUrl={item.schoolLogo}
              onPick={() => onPickLogo(index)}
              onRemove={() => updateItem(index, { schoolLogo: null })}
            />
          </View>
        ))
      ) : (
        <View
          className="items-center gap-2 rounded-[16px] border px-4 py-6"
          style={{ backgroundColor: '#252525', borderColor: profilePalette.border }}>
          <Ionicons color={profilePalette.textSoft} name="school-outline" size={24} />
          <AppText align="center" className="text-[13px]" tone="muted">
            Add education so matches can read your training and credentials.
          </AppText>
        </View>
      )}

      {error ? (
        <AppText className="text-[12px]" tone="danger" variant="code">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const myProfileQuery = useMyProfile();
  const optionsQuery = useProfileOptions();
  const updateProfileMutation = useUpdateMyProfile();
  const uploadProfileImageMutation = useUploadProfileImage();
  const uploadBackgroundLogoMutation = useUploadProfileImage();
  const profileResponse = myProfileQuery.data;
  const profile =
    profileResponse && hasUsableProfile(profileResponse)
      ? profileResponse.data
      : mockMyProfileResponse.data;
  const profileOptionsResponse = optionsQuery.data;
  const options = profileOptionsResponse && hasUsablePersonalityOptions(profileOptionsResponse)
    ? profileOptionsResponse.data.personalityAndHobbies
    : mockProfileOptionsResponse.data.personalityAndHobbies;
  const locationOptions = profileOptionsResponse && hasUsableLocationOptions(profileOptionsResponse)
    ? profileOptionsResponse.data.locations
    : mockProfileOptionsResponse.data.locations;
  const [formState, setFormState] = React.useState(() => buildInitialFormState(profile, locationOptions));
  const [formErrors, setFormErrors] = React.useState<FormErrors>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [backgroundTab, setBackgroundTab] = React.useState<EditableBackgroundTab>('experience');
  const [uploadingLogoKey, setUploadingLogoKey] = React.useState<string | null>(null);
  const aboutCopy = getAboutCopy(profile.sections.about);
  const isStartupOwnerProfile = Boolean(profile.startup);

  React.useEffect(() => {
    setFormState(buildInitialFormState(profile, locationOptions));
    setFormErrors({});
    setSubmitError(null);
  }, [locationOptions, profile]);

  const selectedPersonalityIds = formState.personalityAndHobbyIds ?? [];
  const selectedCount = selectedPersonalityIds.length;

  function updateField<K extends keyof UpdateMyProfileRequest>(
    field: K,
    value: UpdateMyProfileRequest[K]
  ) {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
    setFormErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
    setSubmitError(null);
  }

  function togglePersonalityAndHobby(itemId: string) {
    const isSelected = selectedPersonalityIds.includes(itemId);

    if (isSelected) {
      updateField(
        'personalityAndHobbyIds',
        selectedPersonalityIds.filter((currentId) => currentId !== itemId)
      );
      return;
    }

    if (selectedCount >= MAX_PERSONALITY_SELECTIONS) {
      setFormErrors((current) => ({
        ...current,
        personalityAndHobbyIds: 'You can select up to 6 personality and hobby tags.',
      }));
      return;
    }

    updateField('personalityAndHobbyIds', [...selectedPersonalityIds, itemId]);
  }

  function updateExperienceLogo(index: number, logoUrl: string | null) {
    setFormState((current) => ({
      ...current,
      experience: current.experience.map((item, itemIndex) =>
        itemIndex === index ? { ...item, companyLogo: logoUrl } : item
      ),
    }));
    setFormErrors((current) => ({ ...current, experience: undefined }));
    setSubmitError(null);
  }

  function updateEducationLogo(index: number, logoUrl: string | null) {
    setFormState((current) => ({
      ...current,
      education: current.education.map((item, itemIndex) =>
        itemIndex === index ? { ...item, schoolLogo: logoUrl } : item
      ),
    }));
    setFormErrors((current) => ({ ...current, education: undefined }));
    setSubmitError(null);
  }

  async function handleSave() {
    const payload: UpdateMyProfileRequest = {
      name: formState.name.trim(),
      headline: formState.headline.trim(),
      photoUrl: formState.photoUrl?.trim() || null,
      locationId: formState.locationId.trim(),
      about: formState.about.trim(),
      ...(isStartupOwnerProfile ? {} : { personalityAndHobbyIds: selectedPersonalityIds }),
      experience: sanitizeExperience(formState.experience),
      education: sanitizeEducation(formState.education),
    };

    const validationErrors = validateForm(payload, aboutCopy.errorLabel);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setSubmitError(null);

    try {
      await updateProfileMutation.mutateAsync(payload);
      router.back();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save profile changes.');
    }
  }

  async function handlePickProfileImage() {
    if (
      uploadProfileImageMutation.isPending ||
      uploadBackgroundLogoMutation.isPending ||
      updateProfileMutation.isPending
    ) {
      return;
    }

    setSubmitError(null);

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      allowsMultipleSelection: false,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      selectionLimit: 1,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.uri) {
      setSubmitError('The selected image could not be read.');
      return;
    }

    try {
      const uploadedImage = await uploadProfileImageMutation.mutateAsync({
        fileName: asset.fileName ?? null,
        mimeType: asset.mimeType ?? null,
        uri: asset.uri,
      });

      updateField('photoUrl', uploadedImage.url);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to upload this image right now.');
    }
  }

  async function handlePickBackgroundLogo(type: EditableBackgroundTab, index: number) {
    if (
      uploadProfileImageMutation.isPending ||
      uploadBackgroundLogoMutation.isPending ||
      updateProfileMutation.isPending
    ) {
      return;
    }

    const nextUploadingLogoKey = `${type}-${index}`;
    setSubmitError(null);

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      allowsMultipleSelection: false,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      selectionLimit: 1,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.uri) {
      setSubmitError('The selected image could not be read.');
      return;
    }

    try {
      setUploadingLogoKey(nextUploadingLogoKey);
      const uploadedImage = await uploadBackgroundLogoMutation.mutateAsync({
        fileName: asset.fileName ?? null,
        mimeType: asset.mimeType ?? null,
        uri: asset.uri,
      });

      if (type === 'experience') {
        updateExperienceLogo(index, uploadedImage.url);
      } else {
        updateEducationLogo(index, uploadedImage.url);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to upload this image right now.');
    } finally {
      setUploadingLogoKey(null);
    }
  }

  const initials = getInitials(profile.name);
  const profilePhotoUrl = formState.photoUrl?.trim() || null;
  const isUploadingProfileImage = uploadProfileImageMutation.isPending;
  const isUploadingBackgroundLogo = uploadBackgroundLogoMutation.isPending;
  const isSavingProfile =
    updateProfileMutation.isPending || isUploadingProfileImage || isUploadingBackgroundLogo;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        style={{ backgroundColor: profilePalette.canvas }}>
        <View
          className="flex-row items-center justify-between border-b border-border px-5 pb-4"
          style={{
            backgroundColor: profilePalette.header,
            borderBottomColor: profilePalette.border,
            paddingTop: Math.max(insets.top + 14, 24),
          }}>
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full border active:opacity-80"
            hitSlop={12}
            onPress={() => router.back()}
            style={{
              backgroundColor: profilePalette.field,
              borderColor: profilePalette.border,
            }}>
            <Ionicons color={profilePalette.text} name="chevron-back" size={22} />
          </Pressable>

          <View className="min-w-0 flex-1 px-4">
            <AppText className="text-[21px]" numberOfLines={1} variant="title">
              Edit Profile
            </AppText>
            <AppText className="text-[13px]" numberOfLines={1} tone="muted">
              Refresh the essentials people see first.
            </AppText>
          </View>

          {myProfileQuery.isFetching ? (
            <ActivityIndicator color={profilePalette.accent} size="small" />
          ) : (
            <View className="h-11 w-11" />
          )}
        </View>

        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom + 28, 36),
            paddingHorizontal: 20,
            paddingTop: 20,
          }}>
          <AppCard
            className="gap-6"
            style={{ backgroundColor: profilePalette.field, borderColor: profilePalette.border }}>
            <View className="flex-row items-center gap-4">
              {profilePhotoUrl ? (
                <Image
                  contentFit="cover"
                  source={{ uri: profilePhotoUrl }}
                  style={{
                    borderColor: profilePalette.accent,
                    borderRadius: 999,
                    borderWidth: 2,
                    height: 76,
                    width: 76,
                  }}
                />
              ) : (
                <View
                  className="items-center justify-center rounded-full"
                  style={{
                    backgroundColor: profilePalette.accentSoft,
                    borderColor: profilePalette.accent,
                    borderWidth: 2,
                    height: 76,
                    width: 76,
                  }}>
                  <AppText
                    className="text-[24px] leading-[28px]"
                    style={{ color: profilePalette.accent }}
                    variant="title">
                    {initials}
                  </AppText>
                </View>
              )}

              <View className="min-w-0 flex-1 gap-1">
                <AppText className="text-[16px]" numberOfLines={1} variant="subtitle">
                  Profile identity
                </AppText>
                <AppText className="text-[13px] leading-5" tone="muted">
                  Your name, headline, and location appear across matches and chat.
                </AppText>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  <Pressable
                    accessibilityRole="button"
                    className="h-9 flex-row items-center justify-center gap-2 rounded-[12px] border px-3"
                    disabled={isSavingProfile}
                    onPress={handlePickProfileImage}
                    style={{
                      backgroundColor: profilePalette.selected,
                      borderColor: profilePalette.accent,
                      opacity: isSavingProfile ? 0.7 : 1,
                    }}>
                    {isUploadingProfileImage ? (
                      <ActivityIndicator color={profilePalette.accent} size="small" />
                    ) : (
                      <Ionicons color={profilePalette.accent} name="image-outline" size={16} />
                    )}
                    <AppText
                      className="text-[12px]"
                      style={{ color: profilePalette.accent }}
                      variant="bodyStrong">
                      {isUploadingProfileImage
                        ? 'Uploading...'
                        : profilePhotoUrl
                          ? 'Change Photo'
                          : 'Upload Photo'}
                    </AppText>
                  </Pressable>

                  {profilePhotoUrl ? (
                    <Pressable
                      accessibilityRole="button"
                      className="h-9 flex-row items-center justify-center gap-2 rounded-[12px] border px-3"
                      disabled={isSavingProfile}
                      onPress={() => updateField('photoUrl', null)}
                      style={{
                        backgroundColor: profilePalette.field,
                        borderColor: profilePalette.border,
                        opacity: isSavingProfile ? 0.7 : 1,
                      }}>
                      <Ionicons color={profilePalette.textMuted} name="trash-outline" size={15} />
                      <AppText className="text-[12px]" tone="muted" variant="bodyStrong">
                        Remove
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>

            <View className="gap-5">
              <ProfileInput
                autoCapitalize="words"
                className="min-h-14 text-[15px]"
                error={formErrors.name}
                label="Full Name"
                onChangeText={(value) => updateField('name', value)}
                placeholder="Enter your full name"
                shellClassName="gap-2.5"
                value={formState.name}
              />
              <ProfileInput
                autoCapitalize="words"
                className="min-h-14 text-[15px]"
                error={formErrors.headline}
                label="Title / Headline"
                onChangeText={(value) => updateField('headline', value)}
                placeholder="Enter your headline"
                shellClassName="gap-2.5"
                value={formState.headline}
              />
              <LocationSelector
                error={formErrors.locationId}
                locations={locationOptions}
                onChange={(value) => updateField('locationId', value)}
                value={formState.locationId}
              />
            </View>
          </AppCard>

          <AppCard
            className="mt-4 gap-5"
            style={{ backgroundColor: profilePalette.field, borderColor: profilePalette.border }}>
            <View className="gap-1">
              <AppText variant="subtitle">{aboutCopy.label}</AppText>
              <AppText className="text-[13px]" tone="muted">
                Add context for matches before they start a conversation.
              </AppText>
            </View>
            <ProfileInput
              className="min-h-[148px] px-4 py-4 text-[15px]"
              error={formErrors.about}
              multiline
              onChangeText={(value) => updateField('about', value)}
              placeholder={aboutCopy.placeholder}
              shellClassName="gap-2.5"
              style={{ paddingHorizontal: 16, paddingVertical: 16 }}
              textAlignVertical="top"
              value={formState.about}
            />
          </AppCard>

          <AppCard
            className="mt-4 gap-5"
            style={{ backgroundColor: profilePalette.field, borderColor: profilePalette.border }}>
            <View className="gap-1">
              <AppText variant="subtitle">Experience & Education</AppText>
              <AppText className="text-[13px]" tone="muted">
                Add the background people will scan before matching.
              </AppText>
            </View>

            <View
              className="flex-row rounded-[18px] border p-1"
              style={{ backgroundColor: '#252525', borderColor: profilePalette.border }}>
              <BackgroundTabButton
                active={backgroundTab === 'experience'}
                label="Experience"
                onPress={() => setBackgroundTab('experience')}
              />
              <BackgroundTabButton
                active={backgroundTab === 'education'}
                label="Education"
                onPress={() => setBackgroundTab('education')}
              />
            </View>

            {backgroundTab === 'experience' ? (
              <ExperienceEditor
                disabled={isSavingProfile}
                error={formErrors.experience}
                items={formState.experience}
                onChange={(items) => updateField('experience', items)}
                onPickLogo={(index) => handlePickBackgroundLogo('experience', index)}
                uploadingLogoKey={uploadingLogoKey}
              />
            ) : (
              <EducationEditor
                disabled={isSavingProfile}
                error={formErrors.education}
                items={formState.education}
                onChange={(items) => updateField('education', items)}
                onPickLogo={(index) => handlePickBackgroundLogo('education', index)}
                uploadingLogoKey={uploadingLogoKey}
              />
            )}
          </AppCard>

          {!isStartupOwnerProfile ? (
            <AppCard
              className="mt-4 gap-5"
              style={{ backgroundColor: profilePalette.field, borderColor: profilePalette.border }}>
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-row items-center gap-2">
                  <Ionicons color={profilePalette.accent} name="flash-outline" size={16} />
                  <AppText className="text-[15px]" variant="subtitle">
                    Personality & Hobbies
                  </AppText>
                </View>

                <View
                  className="rounded-full border px-2.5 py-1"
                  style={{
                    backgroundColor: profilePalette.accentSoft,
                    borderColor: profilePalette.accent,
                  }}>
                  <AppText
                    className="text-[11px]"
                    style={{ color: profilePalette.accent }}
                    variant="bodyStrong">
                    {selectedCount}/6 selected
                  </AppText>
                </View>
              </View>

              <PersonalityAndHobbiesSelector
                error={formErrors.personalityAndHobbyIds}
                onToggle={togglePersonalityAndHobby}
                options={options}
                selectedIds={selectedPersonalityIds}
              />

              {submitError ? (
                <AppText className="text-[12px]" tone="danger" variant="code">
                  {submitError}
                </AppText>
              ) : null}
            </AppCard>
          ) : submitError ? (
            <AppText className="mt-4 text-[12px]" tone="danger" variant="code">
              {submitError}
            </AppText>
          ) : null}

          <View className="mt-5 flex-row gap-3 pt-1">
            <ActionButton
              disabled={isSavingProfile}
              label="Cancel"
              onPress={() => router.back()}
            />
            <Pressable
              className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-[12px] border"
              disabled={isSavingProfile}
              onPress={handleSave}
              style={{
                backgroundColor: profilePalette.accent,
                borderColor: profilePalette.accent,
                opacity: isSavingProfile ? 0.7 : 1,
              }}>
              {updateProfileMutation.isPending ? (
                <ActivityIndicator color={profilePalette.buttonText} size="small" />
              ) : (
                <>
                  <Ionicons color={profilePalette.buttonText} name="save-outline" size={18} />
                  <AppText
                    className="text-[14px]"
                    style={{ color: profilePalette.buttonText }}
                    variant="bodyStrong">
                    Save Changes
                  </AppText>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
