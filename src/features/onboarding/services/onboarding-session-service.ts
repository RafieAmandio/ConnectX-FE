import * as SecureStore from 'expo-secure-store';

import {
  getNextStepId,
  getVisibleQuestions,
  materializeStep,
  resolveFlowKey,
} from '../mock/registry';
import type {
  CurrencyAmountValue,
  OnboardingAnswerPayload,
  OnboardingAnswerValue,
  OnboardingAnswers,
  OnboardingLocale,
  OnboardingMode,
  OnboardingNextStepResponse,
  OnboardingQuestion,
  OnboardingSessionResponse,
  OnboardingSessionState,
  OnboardingStartParams,
  OnboardingStartResponse,
  OnboardingStep,
  OnboardingStepId,
  OnboardingValidationErrorResponse,
} from '../types/onboarding.types';

const SESSION_KEY_PREFIX = 'connectx.onboarding.session.v15.';
const ACTIVE_SESSION_KEY_PREFIX = 'connectx.onboarding.active.v15.';
const FIRST_STEP_ID: OnboardingStepId = 'step_welcome';

function getSessionStorageKey(sessionId: string) {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

function getActiveSessionStorageKey(mode: OnboardingMode) {
  return `${ACTIVE_SESSION_KEY_PREFIX}${mode}`;
}

function generateSessionId() {
  const randomPart = Math.random().toString(36).slice(2, 8);

  return `onb_${Date.now().toString(36)}_${randomPart}`;
}

function generateProfileId(sessionId: string) {
  return `prof_${sessionId.replace(/^onb_/, '')}`;
}

function isCurrencyAmountValue(value: OnboardingAnswerValue | undefined): value is CurrencyAmountValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<CurrencyAmountValue>;

  return typeof candidate.amount === 'string' && typeof candidate.currency === 'string';
}

function isOnboardingSessionState(value: unknown): value is OnboardingSessionState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<OnboardingSessionState>;

  return (
    typeof candidate.actorKey === 'string' &&
    typeof candidate.id === 'string' &&
    typeof candidate.locale === 'string' &&
    typeof candidate.mode === 'string' &&
    typeof candidate.startedAt === 'string' &&
    typeof candidate.status === 'string' &&
    Array.isArray(candidate.stepHistory)
  );
}

async function readSession(sessionId: string) {
  const rawValue = await SecureStore.getItemAsync(getSessionStorageKey(sessionId));

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!isOnboardingSessionState(parsedValue)) {
      await SecureStore.deleteItemAsync(getSessionStorageKey(sessionId));
      return null;
    }

    return parsedValue;
  } catch {
    await SecureStore.deleteItemAsync(getSessionStorageKey(sessionId));
    return null;
  }
}

async function persistSession(session: OnboardingSessionState) {
  await SecureStore.setItemAsync(
    getSessionStorageKey(session.id),
    JSON.stringify(session)
  );
}

async function setActiveSessionId(mode: OnboardingMode, sessionId: string) {
  await SecureStore.setItemAsync(getActiveSessionStorageKey(mode), sessionId);
}

async function clearActiveSessionId(mode: OnboardingMode) {
  await SecureStore.deleteItemAsync(getActiveSessionStorageKey(mode));
}

async function getActiveSession(mode: OnboardingMode) {
  const sessionId = await SecureStore.getItemAsync(getActiveSessionStorageKey(mode));

  if (!sessionId) {
    return null;
  }

  return readSession(sessionId);
}

function normalizeStringValue(value: OnboardingAnswerValue | undefined) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeAnswerValue(
  question: OnboardingQuestion,
  value: OnboardingAnswerValue | undefined
): OnboardingAnswerValue {
  switch (question.type) {
    case 'multi_select_card':
    case 'multi_select_chip':
    case 'searchable_multi_select': {
      if (!Array.isArray(value)) {
        return [];
      }

      return value
        .filter((item): item is string => typeof item === 'string' && item.length > 0)
        .filter((item, index, array) => array.indexOf(item) === index);
    }
    case 'number': {
      if (typeof value === 'number') {
        return value;
      }

      const normalizedValue = normalizeStringValue(value);

      if (!normalizedValue) {
        return null;
      }

      const parsedValue = Number(normalizedValue);

      return Number.isFinite(parsedValue) ? parsedValue : null;
    }
    case 'currency_amount': {
      if (!isCurrencyAmountValue(value)) {
        return {
          amount: '',
          currency: '',
        };
      }

      return {
        amount: value.amount.trim(),
        currency: value.currency.trim(),
      };
    }
    default:
      return normalizeStringValue(value);
  }
}

function getQuestionValue(
  question: OnboardingQuestion,
  answers: OnboardingAnswers
) {
  return normalizeAnswerValue(question, answers[question.id]);
}

function hasValue(question: OnboardingQuestion, value: OnboardingAnswerValue) {
  if (
    question.type === 'multi_select_card' ||
    question.type === 'multi_select_chip' ||
    question.type === 'searchable_multi_select'
  ) {
    return Array.isArray(value) && value.length > 0;
  }

  if (question.type === 'currency_amount') {
    return isCurrencyAmountValue(value) && value.currency.length > 0 && value.amount.length > 0;
  }

  if (typeof value === 'number') {
    return true;
  }

  return typeof value === 'string' && value.length > 0;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearValue, monthValue, dayValue] = value.split('-').map((item) => Number(item));
  const normalizedDate = new Date(Date.UTC(yearValue, monthValue - 1, dayValue));

  return (
    normalizedDate.getUTCFullYear() === yearValue &&
    normalizedDate.getUTCMonth() === monthValue - 1 &&
    normalizedDate.getUTCDate() === dayValue
  );
}

function isValidPhone(value: string) {
  return /^\+?\d[\d\s-]{7,}$/.test(value);
}

function getRequiredMessage(label: string, locale: OnboardingLocale) {
  return locale === 'id' ? `${label} wajib diisi.` : `${label} is required.`;
}

function getMessage(locale: OnboardingLocale, en: string, id: string) {
  return locale === 'id' ? id : en;
}

export function validateStepAnswers(
  step: OnboardingStep,
  answers: OnboardingAnswers,
  locale: OnboardingLocale
) {
  const errors: Record<string, string> = {};
  const visibleQuestions = getVisibleQuestions(step, answers);

  for (const question of visibleQuestions) {
    const value = getQuestionValue(question, answers);

    if (question.required && !hasValue(question, value)) {
      errors[question.id] = getRequiredMessage(question.label, locale);
      continue;
    }

    if (!hasValue(question, value)) {
      continue;
    }

    if (question.type === 'email' && typeof value === 'string' && !isValidEmail(value)) {
      errors[question.id] = getMessage(
        locale,
        'Enter a valid email address.',
        'Masukkan alamat email yang valid.'
      );
      continue;
    }

    if (question.type === 'url' && typeof value === 'string' && !isValidUrl(value)) {
      errors[question.id] = getMessage(
        locale,
        'Enter a valid URL that starts with http:// or https://.',
        'Masukkan URL valid yang diawali http:// atau https://.'
      );
      continue;
    }

    if (question.type === 'date' && typeof value === 'string' && !isValidDate(value)) {
      errors[question.id] = getMessage(
        locale,
        'Use the YYYY-MM-DD format.',
        'Gunakan format YYYY-MM-DD.'
      );
      continue;
    }

    if (question.type === 'phone' && typeof value === 'string' && !isValidPhone(value)) {
      errors[question.id] = getMessage(
        locale,
        'Use a valid phone number, for example +6281234567890.',
        'Gunakan nomor telepon yang valid, misalnya +6281234567890.'
      );
      continue;
    }

    if (question.type === 'number') {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        errors[question.id] = getMessage(
          locale,
          'Enter a valid number.',
          'Masukkan angka yang valid.'
        );
        continue;
      }

      if (typeof question.validation?.min === 'number' && value < question.validation.min) {
        errors[question.id] = getMessage(
          locale,
          `Use a value greater than or equal to ${question.validation.min}.`,
          `Gunakan nilai yang lebih besar atau sama dengan ${question.validation.min}.`
        );
        continue;
      }

      if (typeof question.validation?.max === 'number' && value > question.validation.max) {
        errors[question.id] = getMessage(
          locale,
          `Use a value lower than or equal to ${question.validation.max}.`,
          `Gunakan nilai yang lebih kecil atau sama dengan ${question.validation.max}.`
        );
        continue;
      }
    }

    if (
      typeof value === 'string' &&
      typeof question.validation?.min_length === 'number' &&
      value.length < question.validation.min_length
    ) {
      errors[question.id] = getMessage(
        locale,
        `${question.label} must be at least ${question.validation.min_length} characters.`,
        `${question.label} minimal ${question.validation.min_length} karakter.`
      );
      continue;
    }

    if (
      typeof value === 'string' &&
      typeof question.validation?.max_length === 'number' &&
      value.length > question.validation.max_length
    ) {
      errors[question.id] = getMessage(
        locale,
        `${question.label} must be no more than ${question.validation.max_length} characters.`,
        `${question.label} maksimal ${question.validation.max_length} karakter.`
      );
      continue;
    }

    if (
      Array.isArray(value) &&
      typeof question.validation?.min_selections === 'number' &&
      value.length < question.validation.min_selections
    ) {
      errors[question.id] = getMessage(
        locale,
        `Choose at least ${question.validation.min_selections} options.`,
        `Pilih minimal ${question.validation.min_selections} opsi.`
      );
      continue;
    }

    if (
      Array.isArray(value) &&
      typeof question.validation?.max_selections === 'number' &&
      value.length > question.validation.max_selections
    ) {
      errors[question.id] = getMessage(
        locale,
        `Choose no more than ${question.validation.max_selections} options.`,
        `Pilih maksimal ${question.validation.max_selections} opsi.`
      );
      continue;
    }

    if (question.type === 'currency_amount' && isCurrencyAmountValue(value)) {
      const amountValue = Number(value.amount);

      if (!value.currency || !value.amount || Number.isNaN(amountValue) || amountValue <= 0) {
        errors[question.id] = getMessage(
          locale,
          'Select a currency and enter a valid amount.',
          'Pilih mata uang dan masukkan nominal yang valid.'
        );
      }
    }
  }

  return errors;
}

function buildValidationError(errors: Record<string, string>): OnboardingValidationErrorResponse {
  return {
    error: 'validation_failed',
    errors,
  };
}

function mergeAnswers(step: OnboardingStep, existingAnswers: OnboardingAnswers, incomingAnswers: OnboardingAnswers) {
  const nextAnswers = { ...existingAnswers };

  for (const question of step.questions) {
    if (!(question.id in incomingAnswers)) {
      continue;
    }

    nextAnswers[question.id] = normalizeAnswerValue(question, incomingAnswers[question.id]);
  }

  return nextAnswers;
}

function createInitialSession(params: OnboardingStartParams): OnboardingSessionState {
  const now = new Date().toISOString();

  return {
    actorKey: params.actorKey,
    answers: {},
    completedAt: null,
    currentStepId: FIRST_STEP_ID,
    flowKey: null,
    id: generateSessionId(),
    locale: params.locale,
    mode: params.mode,
    profileId: null,
    redirectTo: null,
    startedAt: now,
    status: 'in_progress',
    stepHistory: [FIRST_STEP_ID],
    updatedAt: now,
  };
}

async function requireSession(sessionId: string) {
  const session = await readSession(sessionId);

  if (!session) {
    throw new Error(`Onboarding session ${sessionId} was not found.`);
  }

  return session;
}

function getCompletionRedirect(mode: OnboardingMode) {
  return mode === 'preview' ? '/login' : '/(tabs)';
}

export function resolveDeviceOnboardingLocale(localeCandidate?: string | null): OnboardingLocale {
  if (!localeCandidate) {
    return 'en';
  }

  return localeCandidate.toLowerCase().startsWith('id') ? 'id' : 'en';
}

export async function startMockOnboardingSession(
  params: OnboardingStartParams
): Promise<OnboardingStartResponse> {
  const activeSession = await getActiveSession(params.mode);

  if (
    activeSession &&
    activeSession.status === 'in_progress' &&
    activeSession.actorKey === params.actorKey &&
    activeSession.currentStepId
  ) {
    return {
      current_step: materializeStep(
        activeSession.currentStepId,
        activeSession.answers,
        activeSession.locale
      ),
      session_id: activeSession.id,
      status: 'in_progress',
    };
  }

  const session = createInitialSession(params);

  await Promise.all([persistSession(session), setActiveSessionId(session.mode, session.id)]);

  return {
    current_step: materializeStep(session.currentStepId as OnboardingStepId, session.answers, session.locale),
    session_id: session.id,
    status: 'in_progress',
  };
}

export async function getMockCurrentStep(sessionId: string) {
  const session = await requireSession(sessionId);

  if (!session.currentStepId) {
    throw new Error('This onboarding session has no current step.');
  }

  return materializeStep(session.currentStepId, session.answers, session.locale);
}

export async function getMockOnboardingSession(
  sessionId: string
): Promise<OnboardingSessionResponse> {
  const session = await requireSession(sessionId);

  return {
    current_step: session.currentStepId
      ? materializeStep(session.currentStepId, session.answers, session.locale)
      : null,
    session,
  };
}

export async function submitMockOnboardingAnswers(
  sessionId: string,
  payload: OnboardingAnswerPayload
): Promise<OnboardingNextStepResponse | OnboardingValidationErrorResponse> {
  const session = await requireSession(sessionId);

  if (!session.currentStepId) {
    return {
      can_go_back: false,
      completed: true,
      next_step: null,
      profile_id: session.profileId ?? undefined,
      redirect_to: session.redirectTo ?? undefined,
    };
  }

  if (payload.step_id !== session.currentStepId) {
    throw new Error('Attempted to submit answers for a non-current onboarding step.');
  }

  const currentStep = materializeStep(session.currentStepId, session.answers, session.locale);
  const nextAnswers = mergeAnswers(currentStep, session.answers, payload.answers);
  const nextStepSnapshot = materializeStep(session.currentStepId, nextAnswers, session.locale);
  const validationErrors = validateStepAnswers(nextStepSnapshot, nextAnswers, session.locale);

  if (Object.keys(validationErrors).length > 0) {
    return buildValidationError(validationErrors);
  }

  const nextStepId = getNextStepId(session.currentStepId, nextAnswers);
  const updatedAt = new Date().toISOString();
  const updatedSession: OnboardingSessionState = {
    ...session,
    answers: nextAnswers,
    flowKey: resolveFlowKey(nextAnswers),
    updatedAt,
  };

  if (!nextStepId) {
    const completedSession: OnboardingSessionState = {
      ...updatedSession,
      completedAt: updatedAt,
      currentStepId: null,
      profileId: generateProfileId(session.id),
      redirectTo: getCompletionRedirect(session.mode),
      status: 'completed',
    };

    await Promise.all([
      persistSession(completedSession),
      clearActiveSessionId(completedSession.mode),
    ]);

    return {
      can_go_back: true,
      completed: true,
      next_step: null,
      profile_id: completedSession.profileId ?? undefined,
      redirect_to: completedSession.redirectTo ?? undefined,
    };
  }

  const stepHistory = [...updatedSession.stepHistory];

  if (stepHistory[stepHistory.length - 1] !== nextStepId) {
    stepHistory.push(nextStepId);
  }

  const inProgressSession: OnboardingSessionState = {
    ...updatedSession,
    currentStepId: nextStepId,
    stepHistory,
  };

  await Promise.all([
    persistSession(inProgressSession),
    setActiveSessionId(inProgressSession.mode, inProgressSession.id),
  ]);

  const nextStep = materializeStep(nextStepId, inProgressSession.answers, inProgressSession.locale);

  return {
    can_go_back: nextStep.can_go_back,
    next_step: nextStep,
    progress: nextStep.overall_progress,
  };
}

export async function goBackMockOnboardingSession(sessionId: string) {
  const session = await requireSession(sessionId);

  if (!session.currentStepId || session.stepHistory.length <= 1) {
    return materializeStep(FIRST_STEP_ID, session.answers, session.locale);
  }

  const nextHistory = session.stepHistory.slice(0, -1);
  const previousStepId = nextHistory[nextHistory.length - 1] ?? FIRST_STEP_ID;
  const updatedSession: OnboardingSessionState = {
    ...session,
    currentStepId: previousStepId,
    stepHistory: nextHistory,
    updatedAt: new Date().toISOString(),
  };

  await persistSession(updatedSession);

  return materializeStep(previousStepId, updatedSession.answers, updatedSession.locale);
}
