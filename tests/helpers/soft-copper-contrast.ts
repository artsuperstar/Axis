import type { DesignMode, DesignPalette } from '../../src/constants/design-system-v2';

export function rgba(hex: string) {
  const bytes = hex.slice(1).match(/../g)!.map(value => parseInt(value, 16));
  return [bytes[0], bytes[1], bytes[2], bytes.length === 4 ? bytes[3] / 255 : 1];
}

export function composite(foreground: string, background: string, opacity = 1) {
  const fg = rgba(foreground), bg = rgba(background);
  fg[3] *= opacity;
  const alpha = fg[3] + bg[3] * (1 - fg[3]);
  const rgb = fg.slice(0, 3).map((value, index) => Math.round((value * fg[3] + bg[index] * bg[3] * (1 - fg[3])) / alpha));
  return `#${rgb.map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

export function contrast(foreground: string, background: string) {
  const luminance = (color: string) => rgba(color).slice(0, 3).map(value => value / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Same Phase 2 pair coverage, with retained Fitness's actual foreground roles made explicit. */
export function runtimeContrast(colors: DesignPalette, mode: DesignMode) {
  const pairs: { mode: DesignMode; label: string; foreground: string; background: string; ratio: number; threshold: number; required: boolean }[] = [];
  function check(label: string, foreground: keyof DesignPalette, background: keyof DesignPalette, threshold = 4.5, required = true) {
    pairs.push({ mode, label, foreground: colors[foreground], background: colors[background], ratio: contrast(colors[foreground], colors[background]), threshold, required });
  }
  for (const background of ['canvas', 'surface', 'group', 'groupStrong', 'control', 'surfaceRaised'] as const) {
    check(`body / ${background}`, 'textPrimary', background);
    check(`secondary / ${background}`, 'textSecondary', background);
    check(`placeholder-supporting / ${background}`, 'textMuted', background);
    check(`control boundary / ${background}`, 'controlBorder', background, 3);
    check(`focus / ${background}`, 'brandFocus', background, 3);
    check(`invalid boundary / ${background}`, 'danger', background, 3);
  }
  const roles = [['primary', 'onBrand', 'brand'], ['primary pressed', 'onBrand', 'brandStrong'], ['secondary button', 'textPrimary', 'control'],
    ['form label', 'textPrimary', 'group'], ['placeholder', 'textMuted', 'surface'], ['selected label', 'brand', 'selected'],
    ['success chip', 'success', 'successSoft'], ['overdue chip', 'attention', 'attentionSoft'], ['error chip', 'danger', 'dangerSoft'],
    ['info chip', 'info', 'infoSoft'], ['pending chip', 'textSecondary', 'control'], ['expense amount', 'financeExpense', 'group']] as const;
  for (const [label, fg, bg] of roles) check(label, fg, bg);
  check('disabled text (inactive exempt)', 'textDisabled', 'inset', 4.5, false);
  for (const feature of ['task', 'work', 'fitness', 'journal'] as const) {
    check(`${feature} identity text/icon on soft`, feature === 'fitness' ? 'fitnessText' : `${feature}Accent`, `${feature}AccentSoft`);
    check(`${feature} filled tile foreground`, feature === 'fitness' ? 'onFitness' : 'onFeature', `${feature}Accent`);
  }
  check('current resting field boundary', 'border', 'surface', 3, false);
  check('current input fill / group', 'surface', 'group', 3, false);
  check('selected fill alone / control', 'selected', 'control', 3, false);
  for (const feature of ['calendarTask', 'calendarCommitment', 'calendarWorkPayment'] as const) check(`${feature} meaningful marker`, feature, 'group', 3);
  return pairs;
}
