import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const Colors = {
  light: {
    canvas: '#F4F7FB',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    surfaceRaised: '#FFFFFF',
    surfaceMuted: '#EEF2F6',
    text: '#0F1728',
    textMuted: '#526074',
    textSoft: '#7B8797',
    accent: '#FF9A3E',
    accentStrong: '#E8812A',
    accentTint: '#FFEBD8',
    signal: '#F59E0B',
    signalTint: '#FFF4D8',
    success: '#16A34A',
    successTint: '#DCFCE7',
    warning: '#F59E0B',
    danger: '#E11D48',
    dangerTint: '#FFE4E9',
    border: '#D7DEE7',
    borderStrong: '#B3BFCD',
    tint: '#FF9A3E',
    icon: '#64748B',
    tabIconDefault: '#7B8797',
    tabIconSelected: '#FF9A3E',
    card: '#FFFFFF',
    notification: '#FF9A3E',
  },
  dark: {
    canvas: '#1A1A1A',
    background: '#232323',
    surface: '#262626',
    surfaceRaised: '#2C2C2C',
    surfaceMuted: '#1F1F1F',
    text: '#F5F7FA',
    textMuted: '#98A2B3',
    textSoft: '#667085',
    accent: '#FF9A3E',
    accentStrong: '#FFB066',
    accentTint: '#2C1F12',
    signal: '#F59E0B',
    signalTint: '#2C1F08',
    success: '#22C55E',
    successTint: '#0F2318',
    warning: '#F59E0B',
    danger: '#FF5A67',
    dangerTint: '#301016',
    border: '#333333',
    borderStrong: '#444444',
    tint: '#FF9A3E',
    icon: '#98A2B3',
    tabIconDefault: '#667085',
    tabIconSelected: '#FF9A3E',
    card: '#262626',
    notification: '#FF9A3E',
  },
} as const;

export type AppTheme = keyof typeof Colors;

export const Fonts = Platform.select({
  ios: {
    body: 'system-ui',
    display: 'system-ui',
    serif: 'ui-serif',
    mono: 'ui-monospace',
  },
  android: {
    body: 'sans-serif',
    display: 'sans-serif',
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
    body: "Inter, 'SF Pro Text', 'Segoe UI', sans-serif",
    display: "Inter, 'SF Pro Display', 'Segoe UI', sans-serif",
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
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.4,
    fontWeight: '700',
  },
  hero: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -1,
    fontWeight: '700',
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.7,
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyStrong: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  code: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
} as const;

export const Radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const Shadows: Record<'card' | 'floating', ViewStyle> = {
  card: {
    borderCurve: 'continuous',
    boxShadow: '0 18px 48px rgba(0, 0, 0, 0.24)',
  },
  floating: {
    borderCurve: 'continuous',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.32)',
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
    title: 'Scan in seconds',
    description: 'Lead with the one number or action that matters, then demote everything else.',
  },
  {
    title: 'Dark by design',
    description: 'Near-black backgrounds, restrained surfaces, and one electric-blue CTA keep attention focused.',
  },
  {
    title: 'Trust through restraint',
    description: 'Use whitespace, consistent spacing, and semantic color so the interface feels premium and dependable.',
  },
] as const;
