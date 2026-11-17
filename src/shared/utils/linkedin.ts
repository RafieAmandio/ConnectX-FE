export type LinkedInSlugKind = 'company' | 'profile';

const LINKEDIN_SLUG_PATTERN = /^[A-Za-z0-9_.-]+$/;

// Any linkedin.com host: www., country subdomains (id.linkedin.com) and none.
const LINKEDIN_PREFIX_PATTERNS: Record<LinkedInSlugKind, RegExp> = {
  company: /^(https?:\/\/)?([a-z0-9-]+\.)*linkedin\.com\/company\//i,
  profile: /^(https?:\/\/)?([a-z0-9-]+\.)*linkedin\.com\/in\//i,
};

const LINKEDIN_DISPLAY_PREFIXES: Record<LinkedInSlugKind, string> = {
  company: 'linkedin.com/company/',
  profile: 'linkedin.com/in/',
};

const LINKEDIN_URL_PREFIXES: Record<LinkedInSlugKind, string> = {
  company: 'https://linkedin.com/company/',
  profile: 'https://linkedin.com/in/',
};

export function getLinkedInSlugKindForQuestionId(questionId: string): LinkedInSlugKind | null {
  if (questionId === 'q_linkedin_url') {
    return 'profile';
  }

  if (questionId === 'q_startup_linkedin') {
    return 'company';
  }

  return null;
}

export function getLinkedInSlugKindForQuestion(question: {
  id: string;
  label?: string | null;
  placeholder?: string | null;
}): LinkedInSlugKind | null {
  const kindFromId = getLinkedInSlugKindForQuestionId(question.id);

  if (kindFromId) {
    return kindFromId;
  }

  const haystack = [question.id, question.label, question.placeholder]
    .filter((item): item is string => typeof item === 'string')
    .join(' ')
    .toLowerCase();

  if (!haystack.includes('linkedin')) {
    return null;
  }

  if (haystack.includes('/company/') || haystack.includes('company')) {
    return 'company';
  }

  if (haystack.includes('/in/') || haystack.includes('linkedin url')) {
    return 'profile';
  }

  return null;
}

export function getLinkedInInputPrefix(kind: LinkedInSlugKind) {
  return LINKEDIN_DISPLAY_PREFIXES[kind];
}

export function composeLinkedInUrl(value: unknown, kind: LinkedInSlugKind) {
  const slug = normalizeLinkedInSlug(value, kind);

  return slug ? `${LINKEDIN_URL_PREFIXES[kind]}${slug}` : '';
}

export function normalizeLinkedInSlug(value: unknown, kind: LinkedInSlugKind) {
  if (typeof value !== 'string') {
    return '';
  }

  // Share links carry ?utm_source=... and the app adds a trailing slash; keep only the slug.
  let normalizedValue = value
    .trim()
    .replace(LINKEDIN_PREFIX_PATTERNS[kind], '')
    .replace(/[?#].*$/, '');

  while (normalizedValue.endsWith('/')) {
    normalizedValue = normalizedValue.slice(0, -1);
  }

  return normalizedValue.trim();
}

export function isValidLinkedInSlug(value: string) {
  return Boolean(value) && LINKEDIN_SLUG_PATTERN.test(value) && !/[/:?&#\s]/.test(value);
}
