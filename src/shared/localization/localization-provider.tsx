import * as SecureStore from 'expo-secure-store';
import React from 'react';

import {
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  translations,
  type AppLocale,
  type TranslationKey,
} from './translations';

type TranslationParams = Record<string, string | number>;

type LocalizationContextValue = {
  locale: AppLocale;
  localeLabel: string;
  setLocale: (locale: AppLocale) => Promise<void>;
  t: (key: TranslationKey, params?: TranslationParams) => string;
};

const LOCALE_STORAGE_KEY = 'connectx.locale';

const LocalizationContext = React.createContext<LocalizationContextValue | null>(null);

function isAppLocale(value: string | null): value is AppLocale {
  return value === 'en' || value === 'id';
}

function interpolate(value: string, params?: TranslationParams) {
  if (!params) {
    return value;
  }

  return Object.entries(params).reduce(
    (nextValue, [key, paramValue]) => nextValue.replaceAll(`{${key}}`, String(paramValue)),
    value
  );
}

async function isSecureStoreAvailable() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<AppLocale>(DEFAULT_LOCALE);

  React.useEffect(() => {
    let isMounted = true;

    void (async () => {
      if (!(await isSecureStoreAvailable())) {
        return;
      }

      try {
        const storedLocale = await SecureStore.getItemAsync(LOCALE_STORAGE_KEY);

        if (isMounted && isAppLocale(storedLocale)) {
          setLocaleState(storedLocale);
        }
      } catch {
        // Keep the default locale if persisted preferences cannot be read.
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const setLocale = React.useCallback(async (nextLocale: AppLocale) => {
    setLocaleState(nextLocale);

    if (!(await isSecureStoreAvailable())) {
      return;
    }

    try {
      await SecureStore.setItemAsync(LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // The in-memory selection still applies for the current session.
    }
  }, []);

  const t = React.useCallback(
    (key: TranslationKey, params?: TranslationParams) =>
      interpolate(translations[locale][key] ?? translations[DEFAULT_LOCALE][key], params),
    [locale]
  );

  const value = React.useMemo<LocalizationContextValue>(
    () => ({
      locale,
      localeLabel: LOCALE_LABELS[locale],
      setLocale,
      t,
    }),
    [locale, setLocale, t]
  );

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocale() {
  const context = React.useContext(LocalizationContext);

  if (!context) {
    throw new Error('useLocale must be used within LocalizationProvider.');
  }

  return {
    locale: context.locale,
    localeLabel: context.localeLabel,
    setLocale: context.setLocale,
  };
}

export function useTranslation() {
  const context = React.useContext(LocalizationContext);

  if (!context) {
    throw new Error('useTranslation must be used within LocalizationProvider.');
  }

  return context.t;
}
