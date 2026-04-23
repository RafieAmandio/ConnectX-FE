import React from 'react';

import { getVisibleQuestions } from '../mock/registry';
import {
  getMockOnboardingSession,
  goBackMockOnboardingSession,
  startMockOnboardingSession,
  submitMockOnboardingAnswers,
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
  OnboardingStartResponse,
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
  value: OnboardingNextStepResponse | OnboardingValidationErrorResponse
): value is OnboardingValidationErrorResponse {
  return 'error' in value;
}

function pickStepAnswers(step: OnboardingStep | null, answers: OnboardingAnswers) {
  if (!step) {
    return {};
  }

  return step.questions.reduce<OnboardingAnswers>((result, question) => {
    if (question.id in answers) {
      result[question.id] = answers[question.id];
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
  const [allAnswers, setAllAnswers] = React.useState<OnboardingAnswers>({});
  const [draftAnswers, setDraftAnswers] = React.useState<OnboardingAnswers>({});
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGoingBack, setIsGoingBack] = React.useState(false);

  const hydrateFromSession = React.useCallback(
    (nextSession: OnboardingSessionState, nextStep: OnboardingStep | null) => {
      setSessionState(nextSession);
      setCurrentStep(nextStep);
      setAllAnswers(nextSession.answers);
      setDraftAnswers(pickStepAnswers(nextStep, nextSession.answers));
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
      const startResponse: OnboardingStartResponse = await startMockOnboardingSession({
        actorKey,
        locale,
        mode,
      });
      const sessionResponse = await getMockOnboardingSession(startResponse.session_id);

      setSessionId(startResponse.session_id);
      hydrateFromSession(sessionResponse.session, sessionResponse.current_step);
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load onboarding right now.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [actorKey, enabled, hydrateFromSession, locale, mode]);

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
        const response = await submitMockOnboardingAnswers(sessionId, {
          answers: answersOverride ?? draftAnswers,
          step_id: currentStep.id,
        });

        if (isValidationErrorResponse(response)) {
          setFieldErrors(response.errors);
          return response;
        }

        const sessionResponse = await getMockOnboardingSession(sessionId);
        hydrateFromSession(sessionResponse.session, sessionResponse.current_step);

        return response;
      } catch (error) {
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
    [currentStep, draftAnswers, hydrateFromSession, isSubmitting, sessionId]
  );

  const goBack = React.useCallback(async () => {
    if (!sessionId || !currentStep || isGoingBack) {
      return;
    }

    setIsGoingBack(true);
    setStatusMessage(null);

    try {
      const previousStep = await goBackMockOnboardingSession(sessionId);

      setCurrentStep(previousStep);
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
  }, [allAnswers, currentStep, isGoingBack, sessionId]);

  return {
    allAnswers,
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
