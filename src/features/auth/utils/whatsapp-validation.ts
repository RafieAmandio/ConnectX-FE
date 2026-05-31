export function normalizeWhatsappNumber(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  const hasLeadingPlus = trimmedValue.startsWith('+');
  const digitsOnly = trimmedValue.replace(/\D/g, '');

  if (!digitsOnly) {
    return '';
  }

  if (hasLeadingPlus) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.startsWith('62')) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.startsWith('0')) {
    return `+62${digitsOnly.slice(1)}`;
  }

  return `+${digitsOnly}`;
}

export function getWhatsappNumberError(value: string) {
  if (!value) {
    return 'WhatsApp number is required.';
  }

  if (!/^\+\d{10,15}$/.test(value)) {
    return 'Use a format like +6281234567890.';
  }

  return null;
}
