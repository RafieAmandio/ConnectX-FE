import React from 'react';

import { saveOnboardingDiscoveryPreference } from '@features/home/services/onboarding-discovery-preference';
import { ApiError } from '@shared/services/api';

import {
  getNextStepId,
  getPreviousStepId,
  getVisibleQuestions,
  materializeStep,
} from '../mock/registry';
import {
  goBackOnboardingSession,
  normalizeStepAnswers,
  startOnboardingSession,
  submitOnboardingAnswers,
  summarizeOnboardingStepForLog,
  validateStepAnswers,
} from '../services/onboarding-session-service';
import type {
  OnboardingAnswerValue,
  OnboardingAnswers,
  OnboardingLocale,
  OnboardingMode,
  OnboardingNextStepResponse,
  OnboardingQuestion,
  OnboardingSessionState,
  OnboardingStep,
  OnboardingValidationErrorResponse,
} from '../types/onboarding.types';

type UseOnboardingSessionParams = {
  actorKey: string;
  enabled?: boolean;
  locale: OnboardingLocale;
  mode: OnboardingMode;
};

function isValidationErrorResponse(
  value: unknown
): value is OnboardingValidationErrorResponse {
  const errors = (value as Partial<OnboardingValidationErrorResponse> | null)?.errors;

  return (
    Boolean(value) &&
    typeof value === 'object' &&
    (value as Partial<OnboardingValidationErrorResponse>).error === 'validation_failed' &&
    Boolean(errors) &&
    typeof errors === 'object' &&
    !Array.isArray(errors)
  );
}

function isStepMismatchResponse(value: unknown) {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    (value as { error?: unknown }).error === 'step_mismatch'
  );
}

function pickStepAnswers(step: OnboardingStep | null, answers: OnboardingAnswers) {
  if (!step) {
    return {};
  }

  return step.questions.reduce<OnboardingAnswers>((result, question) => {
    if (question.id in answers) {
      result[question.id] = answers[question.id];
    } else if (question.previous_answer !== undefined) {
      result[question.id] = question.previous_answer;
    }

    return result;
  }, {});
}

export function useOnboardingSession({
  actorKey,
  enabled = true,
  locale,
  mode,
}: UseOnboardingSessionParams) {
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [sessionState, setSessionState] = React.useState<OnboardingSessionState | null>(null);
  const [currentStep, setCurrentStep] = React.useState<OnboardingStep | null>(null);
  const [canGoBack, setCanGoBack] = React.useState(false);
  const [allAnswers, setAllAnswers] = React.useState<OnboardingAnswers>({});
  const [draftAnswers, setDraftAnswers] = React.useState<OnboardingAnswers>({});
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGoingBack, setIsGoingBack] = React.useState(false);

  const hydrateFromStep = React.useCallback(
    (
      nextStep: OnboardingStep | null,
      nextAnswers: OnboardingAnswers = {},
      nextCanGoBack = nextStep?.can_go_back ?? false
    ) => {
      setSessionState(null);
      setCurrentStep(nextStep);
      setCanGoBack(Boolean(nextCanGoBack && nextStep && nextStep.overall_progress.current > 1));
      setAllAnswers(nextAnswers);
      setDraftAnswers(pickStepAnswers(nextStep, nextAnswers));
      setFieldErrors({});
    },
    []
  );

  const bootstrap = React.useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      if (mode === 'preview') {
        const previewStep = materializeStep('step_welcome', {}, locale);

        setSessionId(`preview-${actorKey}`);
        hydrateFromStep(previewStep, {}, false);
        return;
      }

      const startResponse = await startOnboardingSession({
        actorKey,
        locale,
        mode,
      });

      setSessionId(startResponse.session_id);
      // GET /api/v1/onboarding/sessions/:session_id does not exist yet.
      // Use the current_step returned by POST /sessions to render the first screen.
      // const sessionResponse = await getOnboardingSession(startResponse.session_id, locale);
      hydrateFromStep(
        startResponse.current_step,
        {},
        startResponse.can_go_back ?? startResponse.current_step.can_go_back
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load onboarding right now.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [actorKey, enabled, hydrateFromStep, locale, mode]);

  React.useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const mergedAnswers = React.useMemo(
    () => ({
      ...allAnswers,
      ...draftAnswers,
    }),
    [allAnswers, draftAnswers]
  );

  const visibleQuestions = React.useMemo(
    () => (currentStep ? getVisibleQuestions(currentStep, mergedAnswers) : []),
    [currentStep, mergedAnswers]
  );

  const liveValidationErrors = React.useMemo(
    () => (currentStep ? validateStepAnswers(currentStep, mergedAnswers, locale) : {}),
    [currentStep, locale, mergedAnswers]
  );

  const canSubmit = React.useMemo(() => {
    if (!currentStep) {
      return false;
    }

    if (currentStep.cta.enabled_when !== 'valid') {
      return true;
    }

    return Object.keys(liveValidationErrors).length === 0;
  }, [currentStep, liveValidationErrors]);

  const updateAnswer = React.useCallback(
    (question: OnboardingQuestion, value: OnboardingAnswerValue) => {
      setDraftAnswers((currentDraftAnswers) => ({
        ...currentDraftAnswers,
        [question.id]: value,
      }));
      setFieldErrors((currentFieldErrors) => {
        if (!(question.id in currentFieldErrors)) {
          return currentFieldErrors;
        }

        const nextFieldErrors = { ...currentFieldErrors };
        delete nextFieldErrors[question.id];

        return nextFieldErrors;
      });
      setStatusMessage(null);
    },
    []
  );

  const submitStep = React.useCallback(
    async (answersOverride?: OnboardingAnswers) => {
      if (!sessionId || !currentStep || isSubmitting) {
        return null;
      }

      setIsSubmitting(true);
      setStatusMessage(null);

      try {
        const submittedAnswers = normalizeStepAnswers(currentStep, answersOverride ?? draftAnswers);
        const nextAnswers = {
          ...allAnswers,
          ...submittedAnswers,
        };

        if (mode === 'preview') {
          const nextStepId = getNextStepId(currentStep.id, nextAnswers);
          const nextStep = nextStepId ? materializeStep(nextStepId, nextAnswers, locale) : null;
          const response: OnboardingNextStepResponse = {
            can_go_back: Boolean(nextStep?.can_go_back),
            completed: !nextStep,
            next_step: nextStep,
            progress: nextStep?.overall_progress ?? currentStep.overall_progress,
            redirect_to: '/login',
          };

          saveOnboardingDiscoveryPreference(nextAnswers);
          hydrateFromStep(
            response.completed ? null : response.next_step,
            nextAnswers,
            response.can_go_back ?? response.next_step?.can_go_back ?? false
          );

          return response;
        }

        const response = await submitOnboardingAnswers(sessionId, {
          answers: submittedAnswers,
          step_id: currentStep.id,
        }, locale);
        saveOnboardingDiscoveryPreference(nextAnswers);

        hydrateFromStep(
          response.completed ? null : response.next_step,
          nextAnswers,
          response.can_go_back ?? response.next_step?.can_go_back ?? false
        );

        return response;
      } catch (error) {
        if (error instanceof ApiError && error.status === 422 && isValidationErrorResponse(error.payload)) {
          setFieldErrors(error.payload.errors);
          return error.payload;
        }

        if (error instanceof ApiError && error.status === 409 && isStepMismatchResponse(error.payload)) {
          setStatusMessage('This step changed. Please restart onboarding and try again.');
          return null;
        }

        setStatusMessage(
          error instanceof Error
            ? error.message
            : 'Unable to submit this step right now.'
        );

        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [allAnswers, currentStep, draftAnswers, hydrateFromStep, isSubmitting, locale, mode, sessionId]
  );

  const goBack = React.useCallback(async () => {
    if (!sessionId || !currentStep || isGoingBack) {
      return;
    }

    setIsGoingBack(true);
    setStatusMessage(null);

    try {
      if (mode === 'preview') {
        const previousStepId = getPreviousStepId(currentStep.id, allAnswers);

        if (!previousStepId) {
          return;
        }

        const previousStep = materializeStep(previousStepId, allAnswers, locale);

        setCurrentStep(previousStep);
        setCanGoBack(previousStep.overall_progress.current > 1);
        setDraftAnswers(pickStepAnswers(previousStep, allAnswers));
        setFieldErrors({});
        return;
      }

      const backResponse = await goBackOnboardingSession(sessionId, locale);

      console.log(
        '[onboarding_test] go back response',
        JSON.stringify(
          {
            can_go_back: backResponse.can_go_back,
            current_step: summarizeOnboardingStepForLog(backResponse.current_step),
            previous_step: summarizeOnboardingStepForLog(backResponse.previous_step),
            progress: backResponse.progress,
          },
          null,
          2
        )
      );

      const previousStep = backResponse.previous_step ?? backResponse.current_step ?? null;

      if (!previousStep) {
        setStatusMessage('Unable to load the previous step right now.');
        return;
      }

      setCurrentStep(previousStep);
      setCanGoBack(
        Boolean(
          (backResponse.can_go_back ?? previousStep.can_go_back) &&
          previousStep.overall_progress.current > 1
        )
      );
      setDraftAnswers(pickStepAnswers(previousStep, allAnswers));
      setFieldErrors({});
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Unable to go back right now.'
      );
    } finally {
      setIsGoingBack(false);
    }
  }, [allAnswers, currentStep, isGoingBack, locale, mode, sessionId]);

  return {
    allAnswers,
    canGoBack,
    canSubmit,
    currentStep,
    draftAnswers,
    fieldErrors,
    goBack,
    isGoingBack,
    isLoading,
    isSubmitting,
    mergedAnswers,
    sessionId,
    sessionState,
    statusMessage,
    submitStep,
    updateAnswer,
    visibleQuestions,
  };
}
