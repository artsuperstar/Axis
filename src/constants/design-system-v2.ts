import type { TextStyle } from 'react-native';

/** Canonical Soft Copper roles. Legacy consumers retain their own opt-in boundary.
 * Fitness identity stays at its existing values until the separately reviewed feature migration.
 * shadow is a color-only compatibility alias of shadowColor for older v2 callers. */
export const DesignColors = {
  light: {
    brand: '#874833',
    brandStrong: '#713926',
    brandSoft: '#F1DDD3',
    onBrand: '#FFF8F2',
    canvas: '#F5F0EA',
    surface: '#FFFCF8',
    group: '#FBF5F0',
    groupStrong: '#F7EDE8',
    inset: '#F0E9E5',
    control: '#F8F3EF',
    surfaceRaised: '#FFFCF8',
    overlay: '#F5F0EA',
    textPrimary: '#241E1C',
    textSecondary: '#6A5E59',
    textMuted: '#746660',
    textDisabled: '#746660',
    border: '#E4DAD4',
    controlBorder: '#9B837B',
    borderStrong: '#9B837B',
    selected: '#F1DDD3',
    controlPressed: '#F7EDE8',
    success: '#32664E',
    successSoft: '#E4F0E8',
    attention: '#805619',
    attentionSoft: '#FBEACF',
    danger: '#9B303E',
    dangerSoft: '#F6E2E5',
    info: '#3D5E86',
    infoSoft: '#E6EDF5',
    financeIncome: '#32664E',
    financeExpense: '#94455C',
    taskAccent: '#505A8A',
    taskAccentSoft: '#E6E7F3',
    workAccent: '#245C49',
    workAccentSoft: '#E9F1E9',
    fitnessAccent: '#B66F5D',
    fitnessAccentSoft: '#F2DDD6',
    journalAccent: '#28634F',
    journalAccentSoft: '#E4F0E8',
    onFeature: '#FFFCF8',
    calendarTask: '#2563EB',
    calendarCommitment: '#B45309',
    calendarWorkPayment: '#0F766E',
    scrim: '#10181447',
    shadowColor: '#2D1C2C24',
    brandFocus: '#874833',
    brandBorder: '#874833',
    brandSelection: '#F1DDD3',
    brandDecorative: '#874833',
    taskText: '#505A8A',
    fitnessText: '#8E4E3F',
    onFitness: '#151010',
    completed: '#32664E',
    received: '#32664E',
    overdue: '#805619',
    pending: '#6A5E59',
    outstanding: '#241E1C',
    homeAccent: '#874833',
    calendarAccent: '#874833',
    financeAccent: '#874833',
    shadow: '#2D1C2C24',
  },
  dark: {
    brand: '#E7AA8B',
    brandStrong: '#F0BDA3',
    brandSoft: '#462F27',
    onBrand: '#291911',
    canvas: '#151315',
    surface: '#1B181A',
    group: '#242024',
    groupStrong: '#2B2429',
    inset: '#191619',
    control: '#2B272A',
    surfaceRaised: '#2B2429',
    overlay: '#151315',
    textPrimary: '#F6F0ED',
    textSecondary: '#C9BDB8',
    textMuted: '#AFA39E',
    textDisabled: '#AFA39E',
    border: '#3A3337',
    controlBorder: '#95828E',
    borderStrong: '#95828E',
    selected: '#462F27',
    controlPressed: '#2B2429',
    success: '#A8D0B7',
    successSoft: '#20382D',
    attention: '#DFC18B',
    attentionSoft: '#4C3928',
    danger: '#F0ABAB',
    dangerSoft: '#432A30',
    info: '#B4CEE8',
    infoSoft: '#243345',
    financeIncome: '#A8D0B7',
    financeExpense: '#F1A9B4',
    taskAccent: '#AEB7E8',
    taskAccentSoft: '#303247',
    workAccent: '#BCEAD5',
    workAccentSoft: '#11291F',
    fitnessAccent: '#E2A08F',
    fitnessAccentSoft: '#472D29',
    journalAccent: '#9DCAB6',
    journalAccentSoft: '#263F33',
    onFeature: '#151315',
    calendarTask: '#93C5FD',
    calendarCommitment: '#FBBF24',
    calendarWorkPayment: '#5EEAD4',
    scrim: '#0000007A',
    shadowColor: '#00000000',
    brandFocus: '#E7AA8B',
    brandBorder: '#E7AA8B',
    brandSelection: '#462F27',
    brandDecorative: '#E7AA8B',
    taskText: '#AEB7E8',
    fitnessText: '#E2A08F',
    onFitness: '#2A1720',
    completed: '#A8D0B7',
    received: '#A8D0B7',
    overdue: '#DFC18B',
    pending: '#C9BDB8',
    outstanding: '#F6F0ED',
    homeAccent: '#E7AA8B',
    calendarAccent: '#E7AA8B',
    financeAccent: '#E7AA8B',
    shadow: '#00000000',
  },
} as const;
export type DesignPalette = { [K in keyof typeof DesignColors.light]: string };
export type DesignMode = 'light' | 'dark';
export type DesignTheme = Readonly<{ mode: DesignMode; colors: DesignPalette }>;
export const Shape = { group: 16, raised: 18, control: 10, inset: 8, status: 8, menu: 12, sheet: 20, fab: 28 } as const;
export const DesignSpace = { xs: 4, sm: 8, md: 12, lg: 16, section: 20, xl: 24, xxl: 32 } as const;
export const MotionTokens = { press: 120, selection: 180, indicator: 190, insertion: 220, expansion: 220, menu: 160 } as const;
export const TouchTarget = 48;
export const DesignTypography = {
  screenTitle: { fontSize: 36, lineHeight: 46, fontWeight: '600' },
  editorTitle: { fontSize: 26, lineHeight: 34, fontWeight: '600' },
  editorSection: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  fieldLabel: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
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

export function taskSectionSurface(colors: DesignPalette, section: string, mode: DesignMode) {
  return section === 'Today' ? mode === 'light' ? colors.surface : colors.groupStrong : section === 'Earlier' ? colors.control
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
