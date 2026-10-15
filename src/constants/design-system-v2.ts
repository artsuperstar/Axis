import type { TextStyle } from 'react-native';

/** Warm Editorial Hearth. Opt-in migration; legacy Calm Utility consumers remain unchanged. */
export const DesignColors = {
  light: {
    canvas: '#F5F0EA', surface: '#FFFCF8', group: '#FBF5F0', groupStrong: '#F7EDE8', inset: '#F0E9E5', control: '#F8F3EF', selected: '#F1E1E8',
    textPrimary: '#241E1C', textSecondary: '#6A5E59', textMuted: '#746660', border: '#E4DAD4', borderStrong: '#9B837B',
    brand: '#7B425E', brandStrong: '#68344E', brandSoft: '#EBD8E1', onBrand: '#FFF9FB',
    taskAccent: '#6670A5', taskAccentSoft: '#E6E7F3', taskText: '#505A8A',
    fitnessAccent: '#B66F5D', fitnessAccentSoft: '#F2DDD6', fitnessText: '#8E4E3F', onFitness: '#151010',
    attention: '#805619', attentionSoft: '#FBEACF', danger: '#9B303E', info: '#3D5E86', shadow: 'rgba(45, 28, 44, 0.14)',
  },
  dark: {
    canvas: '#151315', surface: '#1B181A', group: '#242024', groupStrong: '#2B2429', inset: '#191619', control: '#2B272A', selected: '#3C2B35',
    textPrimary: '#F6F0ED', textSecondary: '#C9BDB8', textMuted: '#AFA39E', border: '#3A3337', borderStrong: '#7F7078',
    brand: '#DFA6BF', brandStrong: '#EDBAD0', brandSoft: '#422E38', onBrand: '#2A1720',
    taskAccent: '#AEB7E8', taskAccentSoft: '#303247', taskText: '#AEB7E8',
    fitnessAccent: '#E2A08F', fitnessAccentSoft: '#472D29', fitnessText: '#E2A08F', onFitness: '#2A1720',
    attention: '#DFC18B', attentionSoft: '#4C3928', danger: '#F0ABAB', info: '#B4CEE8', shadow: 'none',
  },
} as const;
export type DesignPalette = { [K in keyof typeof DesignColors.light]: string };
export const Shape = { group: 16, raised: 18, control: 10, inset: 8, status: 8, menu: 12, sheet: 20, fab: 28 } as const;
export const DesignSpace = { xs: 4, sm: 8, md: 12, lg: 16, section: 20, xl: 24, xxl: 32 } as const;
export const MotionTokens = { press: 120, selection: 180, indicator: 190, insertion: 220, expansion: 220, menu: 160 } as const;
export const TouchTarget = 48;
export const DesignTypography = {
  screenTitle: { fontSize: 36, lineHeight: 46, fontWeight: '600' },
  sectionHeading: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  cardTitle: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  sheetTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  secondary: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  metadata: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  smallLabel: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  button: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  numeric: { fontSize: 15, lineHeight: 22, fontWeight: '600', fontVariant: ['tabular-nums'] },
  metric: { fontSize: 30, lineHeight: 38, fontWeight: '600', fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;
export type DesignTextRole = keyof typeof DesignTypography;

export function taskSectionSurface(colors: DesignPalette, section: string) {
  return section === 'Today' ? colors.canvas === DesignColors.light.canvas ? colors.surface : colors.groupStrong : section === 'Earlier' ? colors.control
    : section === 'Upcoming' ? colors.surface : colors.group;
}

export function displayFontStyle(loaded: boolean, system = false): TextStyle {
  return loaded && !system ? { fontFamily: 'AxisLora-SemiBold', fontWeight: '400' } : { fontWeight: '600' };
}

export function interfaceFontStyle(loaded: boolean, weight: 'regular' | 'semibold', system = false) {
  return loaded && !system ? { fontFamily: weight === 'regular' ? 'AxisManrope-Regular' : 'AxisManrope-SemiBold', fontWeight: '400' as const }
    : { fontWeight: weight === 'regular' ? '400' as const : '600' as const };
}

/** Compare actual measured navigation rows, never assume fixed quarters or a single line. */
export function canSlideNavigationIndicator(rects: readonly { y: number }[], fontScale: number) {
  return fontScale < 1.5 && rects.length > 0 && rects.every((rect) => Math.abs(rect.y - rects[0].y) < 2);
}
