import { ApiError } from './client';

type ErrorFieldValue = string | string[] | null | undefined;

const FIELD_LABELS: Record<string, string> = {
  current_password: 'current password',
  email: 'email',
  otp_code: 'verification code',
  password: 'password',
  password_confirmation: 'password confirmation',
  whatsapp_number: 'WhatsApp number',
};

const NORMALIZED_MESSAGES: Record<string, string> = {
  'the current password is incorrect.': 'The current password is incorrect.',
  'the email has already been taken.': 'This email is already in use.',
  'the otp code field is required.': 'Enter the verification code.',
  'the password confirmation does not match.': 'Passwords do not match.',
  'the password must be at least 8 characters.': 'Use at least 8 characters.',
  'the verification code is invalid or expired.': 'The verification code is invalid or expired.',
  'the whatsapp number has already been taken.': 'This WhatsApp number is already in use.',
  'validation failed.': 'Please check the highlighted fields.',
};

const BACKEND_DIAGNOSTIC_PATTERNS = [
  /SQLSTATE\[/i,
  /Connection:\s*\w+/i,
  /Illuminate\\/i,
  /\/var\/task\//i,
  /violates check constraint/i,
  /\b(insert|update|delete|select)\b.+\b(from|into|where|returning)\b/i,
];

function capitalize(message: string) {
  return message.charAt(0).toUpperCase() + message.slice(1);
}

function humanizeFieldName(field: string) {
  const normalizedField = field.trim().toLowerCase().replace(/\s+/g, '_');

  return FIELD_LABELS[normalizedField] ?? field.trim().replace(/_/g, ' ');
}

function isBackendDiagnosticMessage(message: string) {
  return BACKEND_DIAGNOSTIC_PATTERNS.some((pattern) => pattern.test(message));
}

export function normalizeApiDisplayMessage(message: string) {
  const trimmedMessage = message.trim().replace(/\s+/g, ' ');

  if (!trimmedMessage) {
    return '';
  }

  if (isBackendDiagnosticMessage(trimmedMessage)) {
    return '';
  }

  const normalizedMessage = NORMALIZED_MESSAGES[trimmedMessage.toLowerCase()];

  if (normalizedMessage) {
    return normalizedMessage;
  }

  const requiredMatch = trimmedMessage.match(/^The ([\w_ ]+) field is required\.$/i);

  if (requiredMatch?.[1]) {
    return `${capitalize(humanizeFieldName(requiredMatch[1]))} is required.`;
  }

  const takenMatch = trimmedMessage.match(/^The ([\w_ ]+) has already been taken\.$/i);

  if (takenMatch?.[1]) {
    return `This ${humanizeFieldName(takenMatch[1])} is already in use.`;
  }

  return trimmedMessage;
}

function getFirstErrorMessage(value: ErrorFieldValue) {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? normalizeApiDisplayMessage(value[0]) : undefined;
  }

  return typeof value === 'string' ? normalizeApiDisplayMessage(value) : undefined;
}

function getApiErrorPayload(error: unknown) {
  return error instanceof ApiError && error.payload && typeof error.payload === 'object'
    ? (error.payload as Record<string, unknown>)
    : null;
}

function getApiErrorFields(error: unknown) {
  const payload = getApiErrorPayload(error);
  const errors = payload && 'errors' in payload ? payload.errors : null;

  return errors && typeof errors === 'object' && !Array.isArray(errors)
    ? (errors as Record<string, ErrorFieldValue>)
    : null;
}

export function getApiFieldError(error: unknown, fields: string | string[]) {
  const errors = getApiErrorFields(error);

  if (!errors) {
    return undefined;
  }

  const fieldNames = Array.isArray(fields) ? fields : [fields];

  for (const field of fieldNames) {
    const message = getFirstErrorMessage(errors[field]);

    if (message) {
      return message;
    }
  }

  return undefined;
}

export function getApiDisplayMessage(error: unknown, fallbackMessage = 'Please try again.') {
  const payload = getApiErrorPayload(error);
  const payloadMessage =
    payload && typeof payload.message === 'string' ? normalizeApiDisplayMessage(payload.message) : null;

  if (payloadMessage) {
    return payloadMessage;
  }

  if (error instanceof Error && error.message) {
    const errorMessage = normalizeApiDisplayMessage(error.message);

    if (errorMessage) {
      return errorMessage;
    }
  }

  return fallbackMessage;
}
