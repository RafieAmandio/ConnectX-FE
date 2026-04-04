import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const Colors = {
  light: {
    canvas: '#F5EDE1',
    background: '#FFF8EF',
    surface: '#F9F1E5',
    surfaceRaised: '#FFFDF9',
    surfaceMuted: '#E8DED0',
    text: '#16202A',
    textMuted: '#5E6B74',
    textSoft: '#869098',
    accent: '#127E74',
    accentStrong: '#0B5F58',
    accentTint: '#D7F1ED',
    signal: '#E57D57',
    signalTint: '#FCE2D7',
    border: '#D8CCBB',
    borderStrong: '#B8A995',
    success: '#24815B',
    warning: '#B56B16',
    danger: '#C84F4C',
    tint: '#127E74',
    icon: '#61707A',
    tabIconDefault: '#7D8890',
    tabIconSelected: '#127E74',
    card: '#FFFDF9',
    notification: '#E57D57',
  },
  dark: {
    canvas: '#0D1518',
    background: '#122027',
    surface: '#16262D',
    surfaceRaised: '#1B2E36',
    surfaceMuted: '#22353D',
    text: '#EFF7F5',
    textMuted: '#B7C5C9',
    textSoft: '#86979B',
    accent: '#5EE0D1',
    accentStrong: '#A2F4EB',
    accentTint: '#183A39',
    signal: '#FF9A70',
    signalTint: '#432920',
    border: '#284048',
    borderStrong: '#43616A',
    success: '#5DD29A',
    warning: '#F6B766',
    danger: '#F18B87',
    tint: '#5EE0D1',
    icon: '#A8B7BB',
    tabIconDefault: '#7D8F96',
    tabIconSelected: '#5EE0D1',
    card: '#1B2E36',
    notification: '#FF9A70',
  },
} as const;

export type AppTheme = keyof typeof Colors;

export const Fonts = Platform.select({
  ios: {
    body: 'system-ui',
    display: 'ui-rounded',
    serif: 'ui-serif',
    mono: 'ui-monospace',
  },
  android: {
    body: 'sans-serif',
    display: 'sans-serif-medium',
    serif: 'serif',
    mono: 'monospace',
  },
  default: {
    body: 'sans-serif',
    display: 'sans-serif',
    serif: 'serif',
    mono: 'monospace',
  },
  web: {
    body: "'Avenir Next', 'Segoe UI', 'Helvetica Neue', sans-serif",
    display: "'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif",
    serif: "Iowan Old Style, 'Palatino Linotype', serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});

export const Typography: Record<
  'display' | 'hero' | 'title' | 'subtitle' | 'body' | 'bodyStrong' | 'label' | 'code',
  TextStyle
> = {
  display: {
    fontFamily: Fonts.display,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.2,
    fontWeight: '700',
  },
  hero: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    fontWeight: '700',
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyStrong: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    lineHeight: 18,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const Radius = {
  sm: 14,
  md: 20,
  lg: 28,
  xl: 36,
  pill: 999,
} as const;

export const Shadows: Record<'card' | 'floating', ViewStyle> = {
  card: {
    borderCurve: 'continuous',
    boxShadow: '0 18px 40px rgba(15, 20, 24, 0.08)',
  },
  floating: {
    borderCurve: 'continuous',
    boxShadow: '0 12px 30px rgba(15, 20, 24, 0.12)',
  },
};

export const NavigationThemes: Record<AppTheme, Theme> = {
  light: {
    ...DefaultTheme,
    dark: false,
    colors: {
      ...DefaultTheme.colors,
      primary: Colors.light.accent,
      background: Colors.light.canvas,
      card: Colors.light.background,
      text: Colors.light.text,
      border: Colors.light.border,
      notification: Colors.light.notification,
    },
  },
  dark: {
    ...DarkTheme,
    dark: true,
    colors: {
      ...DarkTheme.colors,
      primary: Colors.dark.accent,
      background: Colors.dark.canvas,
      card: Colors.dark.background,
      text: Colors.dark.text,
      border: Colors.dark.border,
      notification: Colors.dark.notification,
    },
  },
};

export const DesignPrinciples = [
  {
    title: 'Warm structure',
    description: 'Use warm neutrals for page backgrounds and reserve pure white for elevated content.',
  },
  {
    title: 'Confident hierarchy',
    description: 'Rounded display type handles emphasis while body copy stays calm and highly readable.',
  },
  {
    title: 'Accent with restraint',
    description: 'Sea-glass teal is for action and direction; coral is for highlights and moments of urgency.',
  },
] as const;
