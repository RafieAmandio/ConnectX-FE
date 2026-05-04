import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppCard, AppInput, AppText } from '@shared/components';
import { Colors } from '@shared/theme';

import { useMyProfile, useProfileOptions, useUpdateMyProfile } from '../hooks/use-profile';
import { mockMyProfileResponse, mockProfileOptionsResponse } from '../mock/profile.mock';
import type {
  MyProfileData,
  MyProfileResponse,
  ProfileAboutSection,
  ProfileOptionsResponse,
  UpdateMyProfileRequest,
} from '../types/profile.types';

type FormErrors = Partial<Record<keyof UpdateMyProfileRequest, string>>;

const MAX_PERSONALITY_SELECTIONS = 6;
const palette = Colors.dark;

function hasUsableProfile(response?: MyProfileResponse) {
  return typeof response?.data?.id === 'string' && response.data.id.length > 0;
}

function hasUsableOptions(response?: ProfileOptionsResponse) {
  return Array.isArray(response?.data?.personalityAndHobbies);
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function buildInitialFormState(profile: MyProfileData): UpdateMyProfileRequest {
  return {
    name: profile.name,
    headline: profile.headline,
    location: profile.location.display,
    about: profile.sections.about?.value ?? '',
    personalityAndHobbyIds:
      profile.sections.personalityAndHobbies?.items.map((item) => item.id) ?? [],
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

  if (!formState.location.trim()) {
    nextErrors.location = 'Location is required.';
  } else if (formState.location.trim().length > 120) {
    nextErrors.location = 'Location must be 120 characters or fewer.';
  }

  if (!formState.about.trim()) {
    nextErrors.about = `${aboutErrorLabel} is required.`;
  } else if (formState.about.trim().length > 500) {
    nextErrors.about = `${aboutErrorLabel} must be 500 characters or fewer.`;
  }

  if (formState.personalityAndHobbyIds.length > MAX_PERSONALITY_SELECTIONS) {
    nextErrors.personalityAndHobbyIds = 'You can select up to 6 personality and hobby tags.';
  }

  return nextErrors;
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
  const backgroundColor = tone === 'primary' ? palette.accent : palette.surfaceRaised;
  const borderColor = tone === 'primary' ? palette.accent : palette.borderStrong;
  const textColor = tone === 'primary' ? palette.text : palette.text;

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

export function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const myProfileQuery = useMyProfile();
  const optionsQuery = useProfileOptions();
  const updateProfileMutation = useUpdateMyProfile();
  const profileResponse = myProfileQuery.data;
  const profile =
    profileResponse && hasUsableProfile(profileResponse)
      ? profileResponse.data
      : mockMyProfileResponse.data;
  const [formState, setFormState] = React.useState(() => buildInitialFormState(profile));
  const [formErrors, setFormErrors] = React.useState<FormErrors>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const profileOptionsResponse = optionsQuery.data;
  const aboutCopy = getAboutCopy(profile.sections.about);

  React.useEffect(() => {
    if (profileResponse) {
      console.log('edit profile query response', JSON.stringify(profileResponse, null, 2));
    }
  }, [profileResponse]);

  React.useEffect(() => {
    if (profileOptionsResponse) {
      console.log('profile options response', JSON.stringify(profileOptionsResponse, null, 2));
    }
  }, [profileOptionsResponse]);

  React.useEffect(() => {
    setFormState(buildInitialFormState(profile));
    setFormErrors({});
    setSubmitError(null);
  }, [profile]);

  const options = profileOptionsResponse && hasUsableOptions(profileOptionsResponse)
    ? profileOptionsResponse.data.personalityAndHobbies
    : mockProfileOptionsResponse.data.personalityAndHobbies;

  const selectedCount = formState.personalityAndHobbyIds.length;

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
    const isSelected = formState.personalityAndHobbyIds.includes(itemId);

    if (isSelected) {
      updateField(
        'personalityAndHobbyIds',
        formState.personalityAndHobbyIds.filter((currentId) => currentId !== itemId)
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

    updateField('personalityAndHobbyIds', [...formState.personalityAndHobbyIds, itemId]);
  }

  async function handleSave() {
    const payload: UpdateMyProfileRequest = {
      name: formState.name.trim(),
      headline: formState.headline.trim(),
      location: formState.location.trim(),
      about: formState.about.trim(),
      personalityAndHobbyIds: formState.personalityAndHobbyIds,
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

  const initials = getInitials(profile.name);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        style={{ backgroundColor: palette.canvas }}>
        <View
          className="flex-row items-center justify-between border-b border-border px-5 pb-4"
          style={{
            backgroundColor: palette.background,
            paddingTop: Math.max(insets.top + 14, 24),
          }}>
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full border active:opacity-80"
            hitSlop={12}
            onPress={() => router.back()}
            style={{ backgroundColor: palette.surfaceRaised, borderColor: palette.border }}>
            <Ionicons color={palette.text} name="chevron-back" size={22} />
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
            <ActivityIndicator color={palette.accent} size="small" />
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
          <AppCard className="gap-6">
            <View className="flex-row items-center gap-4">
              {profile.photoUrl ? (
                <Image
                  contentFit="cover"
                  source={{ uri: profile.photoUrl }}
                  style={{
                    borderColor: palette.accent,
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
                    backgroundColor: palette.accentTint,
                    borderColor: palette.accent,
                    borderWidth: 2,
                    height: 76,
                    width: 76,
                  }}>
                  <AppText
                    className="text-[24px] leading-[28px]"
                    style={{ color: palette.accentStrong }}
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
              </View>
            </View>

            <View className="gap-5">
              <AppInput
                autoCapitalize="words"
                className="min-h-14 text-[15px]"
                error={formErrors.name}
                label="Full Name"
                onChangeText={(value) => updateField('name', value)}
                placeholder="Enter your full name"
                shellClassName="gap-2.5"
                value={formState.name}
              />
              <AppInput
                autoCapitalize="words"
                className="min-h-14 text-[15px]"
                error={formErrors.headline}
                label="Title / Headline"
                onChangeText={(value) => updateField('headline', value)}
                placeholder="Enter your headline"
                shellClassName="gap-2.5"
                value={formState.headline}
              />
              <AppInput
                autoCapitalize="words"
                className="min-h-14 text-[15px]"
                error={formErrors.location}
                label="Location"
                onChangeText={(value) => updateField('location', value)}
                placeholder="City, Country"
                shellClassName="gap-2.5"
                value={formState.location}
              />
            </View>
          </AppCard>

          <AppCard className="mt-4 gap-5">
            <View className="gap-1">
              <AppText variant="subtitle">{aboutCopy.label}</AppText>
              <AppText className="text-[13px]" tone="muted">
                Add context for matches before they start a conversation.
              </AppText>
            </View>
            <AppInput
              className="min-h-[148px] px-4 py-4 text-[15px]"
              error={formErrors.about}
              multiline
              onChangeText={(value) => updateField('about', value)}
              placeholder={aboutCopy.placeholder}
              shellClassName="gap-2.5"
              textAlignVertical="top"
              value={formState.about}
            />
          </AppCard>

          <AppCard className="mt-4 gap-5">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-2">
                <Ionicons color={palette.accent} name="flash-outline" size={16} />
                <AppText className="text-[15px]" variant="subtitle">
                  Personality & Hobbies
                </AppText>
              </View>

              <View
                className="rounded-full border px-2.5 py-1"
                style={{ backgroundColor: palette.accentTint, borderColor: palette.accent }}>
                <AppText className="text-[11px]" tone="accent" variant="bodyStrong">
                  {selectedCount}/6 selected
                </AppText>
              </View>
            </View>

            <View className="flex-row flex-wrap gap-3">
              {options.map((item) => {
                const isSelected = formState.personalityAndHobbyIds.includes(item.id);
                const isDisabled = !isSelected && selectedCount >= MAX_PERSONALITY_SELECTIONS;

                return (
                  <Pressable
                    key={item.id}
                    className="flex-row items-center gap-2.5 rounded-[14px] border px-3.5 py-3"
                    disabled={isDisabled}
                    onPress={() => togglePersonalityAndHobby(item.id)}
                    style={{
                      backgroundColor: isSelected ? palette.accentTint : palette.surfaceRaised,
                      borderColor: isSelected ? palette.accent : palette.borderStrong,
                      minWidth: '48%',
                      opacity: isDisabled ? 0.45 : 1,
                      width: '48%',
                    }}>
                    <View
                      className="items-center justify-center rounded-full border"
                      style={{
                        backgroundColor: isSelected ? palette.accent : 'transparent',
                        borderColor: isSelected ? palette.accent : palette.textSoft,
                        height: 20,
                        width: 20,
                      }}>
                      {isSelected ? (
                        <Ionicons color={palette.text} name="checkmark" size={14} />
                      ) : null}
                    </View>
                    <AppText
                      className="flex-1 text-[13px] leading-5"
                      tone={isSelected ? 'accent' : 'muted'}>
                      {item.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {formErrors.personalityAndHobbyIds ? (
              <AppText className="text-[12px]" tone="danger" variant="code">
                {formErrors.personalityAndHobbyIds}
              </AppText>
            ) : null}

            {submitError ? (
              <AppText className="text-[12px]" tone="danger" variant="code">
                {submitError}
              </AppText>
            ) : null}
          </AppCard>

          <View className="mt-5 flex-row gap-3 pt-1">
            <ActionButton
              disabled={updateProfileMutation.isPending}
              label="Cancel"
              onPress={() => router.back()}
            />
            <Pressable
              className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-[12px] border"
              disabled={updateProfileMutation.isPending}
              onPress={handleSave}
              style={{
                backgroundColor: palette.accent,
                borderColor: palette.accent,
                opacity: updateProfileMutation.isPending ? 0.7 : 1,
              }}>
              {updateProfileMutation.isPending ? (
                <ActivityIndicator color={palette.text} size="small" />
              ) : (
                <>
                  <Ionicons color={palette.text} name="save-outline" size={18} />
                  <AppText className="text-[14px]" style={{ color: palette.text }} variant="bodyStrong">
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
