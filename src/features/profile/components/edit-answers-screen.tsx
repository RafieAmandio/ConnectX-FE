import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getVisibleQuestions } from '@features/onboarding_test/mock/registry';
import { OnboardingScrollContext, QuestionRenderer } from '@features/onboarding_test/components/question-renderer';
import type { OnboardingAnswerValue, OnboardingAnswers, OnboardingStep } from '@features/onboarding_test/types/onboarding.types';
import { AppButton, AppCard, AppText } from '@shared/components';
import { useLocale, useTranslation } from '@shared/localization';
import { ApiError } from '@shared/services/api';

import { useOnboardingAnswers, useUpdateOnboardingAnswers } from '../hooks/use-onboarding-answers';
import { ProfileCompletenessCard } from './profile-completeness-card';

// Asked once in onboarding, refused by PATCH /me/onboarding-answers.
const NOT_EDITABLE = new Set(['q_use_connectx']);

function getFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.payload || typeof error.payload !== 'object') {
    return {};
  }

  const errors = (error.payload as { errors?: Record<string, string[]> }).errors ?? {};

  return Object.fromEntries(Object.entries(errors).map(([key, messages]) => [key, messages[0] ?? '']));
}

export function EditAnswersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTranslation();
  const { locale } = useLocale();
  const answersQuery = useOnboardingAnswers();
  const updateAnswers = useUpdateOnboardingAnswers();
  const scrollRef = React.useRef<ScrollView>(null);
  const data = answersQuery.data?.data;

  const savedAnswers = React.useMemo<OnboardingAnswers>(() => {
    const answers: OnboardingAnswers = {};
    data?.steps.forEach((step) => step.questions.forEach((question) => {
      answers[question.id] = question.previous_answer ?? null;
    }));
    return answers;
  }, [data]);
  const [draft, setDraft] = React.useState<OnboardingAnswers>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const answers = React.useMemo(() => ({ ...savedAnswers, ...draft }), [draft, savedAnswers]);
  const changed = React.useMemo(
    () => Object.fromEntries(
      Object.entries(draft).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(savedAnswers[key] ?? null))
    ) as Record<string, OnboardingAnswerValue>,
    [draft, savedAnswers]
  );
  const hasChanges = Object.keys(changed).length > 0;
  const missingKeys = React.useMemo(
    () => new Set(data?.completeness.missing.map((item) => item.key) ?? []),
    [data]
  );

  function handleBack() {
    if (!hasChanges) {
      router.back();
      return;
    }

    Alert.alert(t('profile.answers.discardTitle'), t('profile.answers.discardMessage'), [
      { style: 'cancel', text: t('profile.answers.keepEditing') },
      { onPress: () => router.back(), style: 'destructive', text: t('profile.answers.discard') },
    ]);
  }

  async function handleSave() {
    setErrors({});

    try {
      await updateAnswers.mutateAsync(changed);
      setDraft({});
      Alert.alert(t('profile.answers.savedTitle'), t('profile.answers.savedMessage'));
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      setErrors(fieldErrors);
      Alert.alert(
        t('profile.answers.saveErrorTitle'),
        error instanceof Error ? error.message : t('profile.answers.saveErrorMessage')
      );
    }
  }

  const sections = React.useMemo(() => {
    const bySection = new Map<string, NonNullable<typeof data>['steps']>();
    data?.steps.forEach((step) => {
      bySection.set(step.section, [...(bySection.get(step.section) ?? []), step]);
    });
    return [...bySection.entries()];
  }, [data]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-canvas">
        <View
          className="flex-row items-center gap-3 border-b border-border px-4 pb-3"
          style={{ paddingTop: insets.top + 10 }}>
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-raised active:opacity-80"
            hitSlop={12}
            onPress={handleBack}>
            <Ionicons color="#FFFFFF" name="chevron-back" size={22} />
          </Pressable>
          <View className="min-w-0 flex-1">
            <AppText className="text-[21px]" numberOfLines={1} variant="title">
              {t('profile.answers.title')}
            </AppText>
            <AppText className="text-[13px]" numberOfLines={1} tone="muted">
              {t('profile.answers.subtitle')}
            </AppText>
          </View>
        </View>

        {answersQuery.isPending ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#FF9A3E" />
          </View>
        ) : answersQuery.isError || !data ? (
          <View className="flex-1 justify-center gap-4 px-6">
            <AppText align="center" tone="muted">
              {answersQuery.error instanceof Error ? answersQuery.error.message : t('profile.answers.loadError')}
            </AppText>
            <AppButton label={t('profile.tryAgain')} onPress={() => void answersQuery.refetch()} />
          </View>
        ) : (
          <OnboardingScrollContext.Provider value={scrollRef}>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={{ gap: 20, paddingBottom: insets.bottom + 120, paddingHorizontal: 16, paddingTop: 16 }}
              keyboardShouldPersistTaps="handled">
              <ProfileCompletenessCard missing={data.completeness.missing} />

              {sections.map(([section, steps]) => (
                <View key={section} className="gap-3">
                  <AppText className="px-1 text-[11px] tracking-[1px]" tone="muted" variant="label">
                    {section}
                  </AppText>
                  <AppCard className="gap-6 rounded-[24px] border-white/10 bg-[#292929] px-4 py-5">
                    {steps.flatMap((step) =>
                      getVisibleQuestions(step as unknown as OnboardingStep, answers)
                        .filter((question) => !NOT_EDITABLE.has(question.id))
                        .map((question) => (
                          <View key={question.id} className="gap-2">
                            {missingKeys.has(question.id) && draft[question.id] === undefined ? (
                              <View className="self-start rounded-full bg-[#3B2A1C] px-2.5 py-1">
                                <AppText className="text-[11px] text-[#FF9A3E]" variant="bodyStrong">
                                  {t('profile.answers.missingTag')}
                                </AppText>
                              </View>
                            ) : null}
                            <QuestionRenderer
                              error={errors[question.id]}
                              locale={locale}
                              onChange={(value) => {
                                setDraft((current) => ({ ...current, [question.id]: value }));
                                setErrors((current) => ({ ...current, [question.id]: '' }));
                              }}
                              question={question}
                              value={answers[question.id] ?? undefined}
                            />
                          </View>
                        ))
                    )}
                  </AppCard>
                </View>
              ))}
            </ScrollView>
          </OnboardingScrollContext.Provider>
        )}

        {data ? (
          <View
            className="absolute inset-x-0 bottom-0 border-t border-border bg-canvas px-4 pt-3"
            style={{ paddingBottom: insets.bottom + 12 }}>
            <AppButton
              disabled={!hasChanges || updateAnswers.isPending}
              label={updateAnswers.isPending ? t('profile.answers.saving') : t('profile.answers.save')}
              onPress={() => void handleSave()}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </>
  );
}
