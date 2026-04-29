import { AntDesign } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getRouteForAuthPhase, useAuth } from '@features/auth';
import { AppText } from '@shared/components';
import { cn } from '@shared/utils/cn';

import { useOnboardingSession } from '../hooks/use-onboarding-session';
import { validateStepAnswers } from '../services/onboarding-session-service';
import type {
  OnboardingAnswerValue,
  OnboardingLocale,
  OnboardingMode,
  OnboardingNextStepResponse,
  OnboardingQuestion,
  OnboardingStep,
  OnboardingValidationErrorResponse,
} from '../types/onboarding.types';
import { QuestionRenderer } from './question-renderer';

const CONNECTX_LOGO = require('../../../../assets/images/connectx-logo.png');

const ACCENT = '#FF9A3E';
const ACCENT_SOFT = '#2A2117';
const BORDER_SOFT = '#2A2E38';
const CANVAS_BG = '#212121';
const MULTI_SELECT_DROPDOWN_STEP_IDS = new Set([
  'step_su_biz',
  'step_fdr_industry',
  'step_cf_industry',
]);
const SEARCHABLE_DROPDOWN_REQUIRES_QUERY_STEP_IDS = new Set([
  'step_personal_location',
]);
const GENDER_OPTION_ICONS: Record<string, string> = {
  female: 'female',
  male: 'male',
};

function isCompletedResponse(
  response:
    | OnboardingNextStepResponse
    | OnboardingValidationErrorResponse
    | null
    | undefined
): response is OnboardingNextStepResponse & { completed: true; redirect_to?: string } {
  return Boolean(response && 'completed' in response && response.completed);
}

function getCompletionRoute(mode: OnboardingMode, redirectTo?: string) {
  if (redirectTo === '/login') {
    return '/login' as const;
  }

  if (redirectTo === '/(tabs)') {
    return '/(tabs)' as const;
  }

  return mode === 'preview' ? ('/login' as const) : ('/(tabs)' as const);
}

function getRenderableQuestion(
  stepId: string,
  question: OnboardingQuestion
): OnboardingQuestion {
  if (
    stepId !== 'step_personal_gender' ||
    question.id !== 'q_gender' ||
    !question.options?.length
  ) {
    return question;
  }

  return {
    ...question,
    options: question.options.map((option) => {
      const genderIcon = GENDER_OPTION_ICONS[option.value];

      return genderIcon
        ? {
            ...option,
            icon: genderIcon,
          }
        : option;
    }),
  };
}

function ProgressSegment({ active, delay }: { active: boolean; delay: number }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, {
      duration: 480,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
    opacity: 0.25 + progress.value * 0.75,
  }));

  return (
    <View
      className="h-[6px] flex-1 rounded-full overflow-hidden"
      style={{ backgroundColor: BORDER_SOFT }}>
      <Animated.View
        className="absolute left-0 top-0 h-full w-full rounded-full"
        style={[{ backgroundColor: ACCENT, transformOrigin: 'left' }, animatedStyle]}
      />
    </View>
  );
}

function ProgressHeader({
  canGoBack,
  current,
  onBack,
  total,
}: {
  canGoBack: boolean;
  current: number;
  onBack: () => void;
  total: number;
}) {
  return (
    <View className="gap-4 px-5 pt-5 pb-6">
      <View className="flex-row items-center justify-between">
        {canGoBack ? (
          <Pressable
            className="h-8 w-8 items-center justify-start"
            onPress={onBack}
            hitSlop={12}>
            <AntDesign color="#98A2B3" name="arrow-left" size={22} />
          </Pressable>
        ) : (
          <View className="h-8 w-8" />
        )}
        <Animated.View key={`counter-${current}`} entering={FadeInDown.duration(240)}>
          <AppText variant="bodyStrong" className="text-[14px] text-text-muted">
            {current} of {total}
          </AppText>
        </Animated.View>
      </View>
      <View className="flex-row gap-2">
        {Array.from({ length: total }).map((_, index) => (
          <ProgressSegment
            key={index}
            active={index < current}
            delay={index * 60}
          />
        ))}
      </View>
    </View>
  );
}

function LoadingState() {
  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: CANVAS_BG }}>
      <ActivityIndicator color={ACCENT} />
    </View>
  );
}

function WelcomeHero({ step }: { step: OnboardingStep }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className="mb-10 h-24 w-24 items-center justify-center rounded-[28px]"
        style={{
          backgroundColor: ACCENT_SOFT,
          borderCurve: 'continuous',
        }}>
        <View
          className="h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] bg-white"
          style={{ borderCurve: 'continuous' }}>
          <Image
            source={CONNECTX_LOGO}
            style={{ width: 44, height: 44 }}
            contentFit="contain"
          />
        </View>
      </View>
      <AppText
        align="center"
        variant="hero"
        className="text-[30px] leading-[36px] text-white">
        {step.title}
      </AppText>
      {step.subtitle ? (
        <AppText
          align="center"
          className="mt-4 text-[15px] leading-[22px] text-text-muted">
          {step.subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

function PrimaryCta({
  disabled,
  label,
  onPress,
  withArrow = true,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  withArrow?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'h-14 flex-row items-center justify-center gap-3 rounded-[18px]',
        disabled && 'opacity-50'
      )}
      style={{
        backgroundColor: ACCENT,
        borderCurve: 'continuous',
      }}
      android_ripple={{ color: 'rgba(0,0,0,0.12)' }}>
      <AppText variant="subtitle" className="text-[16px] text-[#1A1208]">
        {label}
      </AppText>
      {withArrow ? (
        <AntDesign color="#1A1208" name="arrow-right" size={18} />
      ) : null}
    </Pressable>
  );
}

export function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const insets = useSafeAreaInsets();
  const mode: OnboardingMode = params.mode === 'preview' ? 'preview' : 'post_auth';
  const { authPhase, completeOnboarding, isHydrated, session } = useAuth();
  const locale: OnboardingLocale = 'en';

  const actorKey =
    mode === 'preview'
      ? 'preview-entry'
      : session?.user?.id ?? session?.email ?? 'post-auth-entry';
  const onboardingEnabled =
    mode === 'preview' ||
    Boolean(
      session &&
      (authPhase === 'pending_onboarding' || authPhase === 'authenticated')
    );

  const {
    canSubmit,
    currentStep,
    draftAnswers,
    fieldErrors,
    goBack,
    isGoingBack,
    isLoading,
    isSubmitting,
    mergedAnswers,
    statusMessage,
    submitStep,
    updateAnswer,
    visibleQuestions,
  } = useOnboardingSession({
    actorKey,
    enabled: onboardingEnabled,
    locale,
    mode,
  });

  const handleAnswerChange = React.useCallback(
    async (question: OnboardingQuestion, value: OnboardingAnswerValue) => {
      const nextDraftAnswers = {
        ...draftAnswers,
        [question.id]: value,
      };

      updateAnswer(question, value);

      if (
        !currentStep ||
        !question.meta?.auto_advance ||
        question.type !== 'single_select_card'
      ) {
        return;
      }

      const nextValidationErrors = validateStepAnswers(
        currentStep,
        {
          ...mergedAnswers,
          [question.id]: value,
        },
        locale
      );

      if (Object.keys(nextValidationErrors).length > 0) {
        return;
      }

      const response = await submitStep(nextDraftAnswers);

      if (isCompletedResponse(response)) {
        if (mode === 'post_auth') {
          await completeOnboarding();
        }

        router.replace(getCompletionRoute(mode, response.redirect_to));
      }
    },
    [
      completeOnboarding,
      currentStep,
      draftAnswers,
      locale,
      mergedAnswers,
      mode,
      router,
      submitStep,
      updateAnswer,
    ]
  );

  const handleContinue = React.useCallback(async () => {
    const response = await submitStep();

    if (!isCompletedResponse(response)) {
      return;
    }

    if (mode === 'post_auth') {
      await completeOnboarding();
    }

    router.replace(getCompletionRoute(mode, response.redirect_to));
  }, [completeOnboarding, mode, router, submitStep]);

  const handleBackPress = React.useCallback(() => {
    if (currentStep?.can_go_back) {
      void goBack();
      return;
    }

    if (mode === 'preview') {
      router.replace('/login');
    }
  }, [currentStep?.can_go_back, goBack, mode, router]);

  if (!isHydrated) {
    return null;
  }

  if (mode === 'post_auth' && !session) {
    return <Redirect href="/login" />;
  }

  if (
    mode === 'post_auth' &&
    authPhase !== 'pending_onboarding' &&
    authPhase !== 'authenticated'
  ) {
    return <Redirect href={getRouteForAuthPhase(authPhase)} />;
  }

  if (isLoading || !currentStep) {
    return <LoadingState />;
  }

  const isWelcomeStep = currentStep.questions.length === 0;
  const isAutoAdvanceStep =
    currentStep.questions.length === 1 &&
    currentStep.questions[0].type === 'single_select_card' &&
    Boolean(currentStep.questions[0].meta?.auto_advance);
  const shouldTopAlignContent = currentStep.questions.some((question) =>
    [
      'searchable_dropdown',
      'searchable_multi_select',
      'searchable_single_select',
      'dropdown',
      'grouped_list',
      'multi_select_chip',
      'multi_select_card',
      'single_select_radio',
      'currency_amount',
    ].includes(question.type)
  );
  const renderableQuestions = visibleQuestions.map((question) =>
    getRenderableQuestion(currentStep.id, question)
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
      style={{ backgroundColor: CANVAS_BG }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        className="flex-1"
        style={{ backgroundColor: CANVAS_BG, paddingTop: insets.top }}>
        <ProgressHeader
          canGoBack={currentStep.can_go_back}
          current={currentStep.overall_progress.current}
          onBack={handleBackPress}
          total={currentStep.overall_progress.total}
        />

        {isWelcomeStep ? (
          <View
            className="flex-1 justify-between"
            style={{ paddingBottom: Math.max(insets.bottom + 24, 40) }}>
            <WelcomeHero step={currentStep} />
            <View className="px-5">
              <PrimaryCta
                disabled={isSubmitting}
                label={isSubmitting ? 'Loading...' : currentStep.cta.label}
                onPress={() => {
                  void handleContinue();
                }}
              />
            </View>
          </View>
        ) : (
          <>
            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: shouldTopAlignContent ? 'flex-start' : 'center',
                paddingHorizontal: 20,
                paddingTop: shouldTopAlignContent ? 8 : 0,
                paddingBottom: 96,
                gap: 28,
              }}
              contentInsetAdjustmentBehavior="automatic"
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled>
              <Animated.View
                key={`title-${currentStep.id}`}
                entering={FadeInDown.duration(320)}
                className="gap-2">
                <AppText
                  align="center"
                  variant="hero"
                  className="text-[26px] leading-[32px] text-white">
                  {currentStep.title}
                </AppText>
                {currentStep.subtitle ? (
                  <AppText
                    align="center"
                    className="text-[15px] leading-[22px] text-text-muted">
                    {currentStep.subtitle}
                  </AppText>
                ) : null}
              </Animated.View>

              <Animated.View
                key={`fields-${currentStep.id}`}
                entering={FadeInUp.delay(80).duration(320)}
                className="gap-6">
                {renderableQuestions.map((question) => (
                  <QuestionRenderer
                    key={question.id}
                    error={fieldErrors[question.id]}
                    hideSearchableDropdownResultsUntilQuery={
                      currentStep &&
                      SEARCHABLE_DROPDOWN_REQUIRES_QUERY_STEP_IDS.has(currentStep.id) &&
                      question.type === 'searchable_dropdown'
                    }
                    onChange={(value) => {
                      void handleAnswerChange(question, value);
                    }}
                    question={question}
                    variant={
                      currentStep &&
                        MULTI_SELECT_DROPDOWN_STEP_IDS.has(currentStep.id) &&
                        question.type === 'multi_select_chip'
                        ? 'dropdown_multi_select'
                        : 'default'
                    }
                    value={mergedAnswers[question.id]}
                  />
                ))}
              </Animated.View>

              {statusMessage ? (
                <AppText align="center" selectable tone="danger">
                  {statusMessage}
                </AppText>
              ) : null}
            </ScrollView>

            {isAutoAdvanceStep ? (
              <View style={{ paddingBottom: Math.max(insets.bottom + 16, 32) }} />
            ) : (
              <View
                className="px-5 pt-4"
                style={{
                  backgroundColor: CANVAS_BG,
                  borderTopColor: BORDER_SOFT,
                  borderTopWidth: 1,
                  paddingBottom: Math.max(insets.bottom + 16, 32),
                }}>
                <PrimaryCta
                  disabled={!canSubmit || isSubmitting || isGoingBack}
                  label={isSubmitting ? 'Saving...' : currentStep.cta.label}
                  onPress={() => {
                    void handleContinue();
                  }}
                />
              </View>
            )}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
