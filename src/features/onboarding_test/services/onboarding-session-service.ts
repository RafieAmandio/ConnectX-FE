import { apiFetch } from '@shared/services/api';

import { getVisibleQuestions } from '../mock/registry';
import type {
  CurrencyAmountValue,
  OnboardingAnswerPayload,
  OnboardingAnswerValue,
  OnboardingAnswers,
  OnboardingBackResponse,
  OnboardingLocale,
  OnboardingNextStepResponse,
  OnboardingQuestion,
  OnboardingSessionResponse,
  OnboardingStartParams,
  OnboardingStartResponse,
  OnboardingStep,
} from '../types/onboarding.types';

const ONBOARDING_API = {
  BACK: (sessionId: string) => `/api/v1/onboarding/sessions/${sessionId}/back`,
  CURRENT: (sessionId: string) => `/api/v1/onboarding/sessions/${sessionId}/current`,
  SESSION: (sessionId: string) => `/api/v1/onboarding/sessions/${sessionId}`,
  SESSIONS: '/api/v1/onboarding/sessions',
  SUBMIT_ANSWER: (sessionId: string) => `/api/v1/onboarding/sessions/${sessionId}/answer`,
} as const;

function localeHeaders(locale: OnboardingLocale) {
  return {
    'Accept-Language': locale,
  };
}

function isCurrencyAmountValue(value: OnboardingAnswerValue | undefined): value is CurrencyAmountValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<CurrencyAmountValue>;

  return typeof candidate.amount === 'string' && typeof candidate.currency === 'string';
}

function normalizeStringValue(value: OnboardingAnswerValue | undefined) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function shouldAcceptSocialHandle(question: OnboardingQuestion) {
  return question.id === 'q_su_twitter' || question.id === 'q_su_instagram';
}

function hasUrlScheme(value: string) {
  return /^https?:\/\//i.test(value);
}

function normalizeUrlValue(
  question: OnboardingQuestion,
  value: OnboardingAnswerValue | undefined
) {
  const normalizedValue = normalizeStringValue(value);

  if (!normalizedValue || shouldAcceptSocialHandle(question) || hasUrlScheme(normalizedValue)) {
    return normalizedValue;
  }

  return `https://${normalizedValue}`;
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
    case 'url':
      return normalizeUrlValue(question, value);
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

export function normalizeStepAnswers(
  step: OnboardingStep,
  answers: OnboardingAnswers
) {
  const normalizedAnswers: OnboardingAnswers = {};
  const visibleQuestions = getVisibleQuestions(step, answers);

  for (const question of visibleQuestions) {
    if (question.id in answers) {
      normalizedAnswers[question.id] = getQuestionValue(question, answers);
    }
  }

  return normalizedAnswers;
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
    const url = new URL(hasUrlScheme(value) ? value : `https://${value}`);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function shouldSkipUrlValidation(question: OnboardingQuestion) {
  return shouldAcceptSocialHandle(question);
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

    if (
      question.type === 'url' &&
      typeof value === 'string' &&
      !shouldSkipUrlValidation(question) &&
      !isValidUrl(value)
    ) {
      errors[question.id] = getMessage(
        locale,
        'Enter a valid website or URL.',
        'Masukkan website atau URL yang valid.'
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

export function resolveDeviceOnboardingLocale(localeCandidate?: string | null): OnboardingLocale {
  if (!localeCandidate) {
    return 'en';
  }

  return localeCandidate.toLowerCase().startsWith('id') ? 'id' : 'en';
}

export async function startOnboardingSession(
  params: OnboardingStartParams
): Promise<OnboardingStartResponse> {
  return apiFetch<OnboardingStartResponse>(ONBOARDING_API.SESSIONS, {
    body: {
      actor_key: params.actorKey,
      locale: params.locale,
      mode: params.mode,
    } as unknown as BodyInit,
    headers: localeHeaders(params.locale),
    method: 'POST',
  });
}

export async function getCurrentOnboardingStep(sessionId: string, locale: OnboardingLocale) {
  return apiFetch<OnboardingStep>(ONBOARDING_API.CURRENT(sessionId), {
    headers: localeHeaders(locale),
  });
}

export async function getOnboardingSession(
  sessionId: string,
  locale: OnboardingLocale
): Promise<OnboardingSessionResponse> {
  return apiFetch<OnboardingSessionResponse>(ONBOARDING_API.SESSION(sessionId), {
    headers: localeHeaders(locale),
  });
}

export async function submitOnboardingAnswers(
  sessionId: string,
  payload: OnboardingAnswerPayload,
  locale: OnboardingLocale
): Promise<OnboardingNextStepResponse> {
  const response = await apiFetch<OnboardingNextStepResponse>(ONBOARDING_API.SUBMIT_ANSWER(sessionId), {
    body: payload as unknown as BodyInit,
    headers: localeHeaders(locale),
    method: 'POST',
  });

  console.log(
    '[onboarding_test] submit answer response',
    JSON.stringify(
      {
        locale,
        payload,
        response,
        sessionId,
      },
      null,
      2
    )
  );

  return response;
}

export async function goBackOnboardingSession(
  sessionId: string,
  locale: OnboardingLocale
): Promise<OnboardingBackResponse> {
  return apiFetch<OnboardingBackResponse>(ONBOARDING_API.BACK(sessionId), {
    body: {} as unknown as BodyInit,
    headers: localeHeaders(locale),
    method: 'POST',
  });
}
