/** Shared light/dark colors and system typography. */

import '@/global.css';

import { Platform, type TextStyle } from 'react-native';

export const Colors = {
  light: {
    background: '#FAFAF9',
    surface: '#F1F3F1',
    surfaceRaised: '#FFFFFF',
    surfaceMuted: '#E9EEEA',
    textPrimary: '#17211D',
    textSecondary: '#4E5E55',
    textMuted: '#59675E',
    border: '#CBD3CE',
    borderStrong: '#77857C',
    accent: '#28634F',
    accentMuted: '#E4F0E8',
    onAccent: '#FFFFFF',
    success: '#276242',
    warning: '#825A14',
    danger: '#A53535',
    info: '#315E88',
    scrim: 'rgba(16, 24, 20, 0.28)',
    // Compatibility aliases for feature screens awaiting their design stage.
    text: '#17211D',
    backgroundElement: '#F1F3F1',
    backgroundSelected: '#E9EEEA',
    calendarTask: '#2563EB',
    calendarCommitment: '#B45309',
    calendarWorkPayment: '#0F766E',
  },
  dark: {
    background: '#121615',
    surface: '#1D2421',
    surfaceRaised: '#28312D',
    surfaceMuted: '#18201C',
    textPrimary: '#EDF3EF',
    textSecondary: '#B7C5BC',
    textMuted: '#A2B1A8',
    border: '#48594F',
    borderStrong: '#81968A',
    accent: '#9DCAB6',
    accentMuted: '#263F33',
    onAccent: '#12231B',
    success: '#9CCBAD',
    warning: '#DFC18B',
    danger: '#F0ABAB',
    info: '#A6C5E3',
    scrim: 'rgba(0, 0, 0, 0.48)',
    text: '#EDF3EF',
    backgroundElement: '#1D2421',
    backgroundSelected: '#2E3933',
    calendarTask: '#93C5FD',
    calendarCommitment: '#FBBF24',
    calendarWorkPayment: '#5EEAD4',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemePalette = { [K in ThemeColor]: string };

export const SurfaceColors = {
  screen: 'background', grouped: 'surface', raised: 'surfaceRaised', overlay: 'surfaceRaised',
} as const satisfies Record<string, ThemeColor>;

/** Text-first statuses; features retain ownership of their status wording and rules. */
export const StatusColors = {
  neutral: 'textSecondary', attention: 'warning', success: 'success', subdued: 'textMuted', danger: 'danger', info: 'info',
} as const satisfies Record<string, ThemeColor>;

export const Space = { micro: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const Radius = { small: 4, control: 8, surface: 8, overlay: 12 } as const;
export const ControlSize = { touch: 44, field: 48, indicator: 24 } as const;

/** System-font roles. Legacy ThemedText names remain available during incremental adoption. */
export const Typography = {
  screenTitle: { fontSize: 32, lineHeight: 40, fontWeight: '600' },
  sectionHeading: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  sheetTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  cardTitle: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  secondary: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  metadata: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  button: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  input: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  metric: { fontSize: 28, lineHeight: 36, fontWeight: '600', fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;
export type TypographyRole = keyof typeof Typography;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;
