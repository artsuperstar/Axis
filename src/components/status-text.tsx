import { StatusColors } from '@/constants/theme';

import { ThemedText, type ThemedTextProps } from './themed-text';
import { UiText } from './design-system';
import { DesignTypography, type DesignTextRole } from '@/constants/design-system-v2';

const designStatusColors = {
  neutral: 'textSecondary', attention: 'attention', success: 'success', subdued: 'textMuted', danger: 'danger', info: 'info',
} as const;

/** No status derivation or pill container: a semantic text tone with accessible wording supplied by callers. */
export function StatusText({ tone = 'neutral', appearance, type = 'secondary', ...props }: Omit<ThemedTextProps, 'themeColor'> & { tone?: keyof typeof StatusColors; appearance?: 'v2' }) {
  if (appearance === 'v2') return <UiText {...props} type={type in DesignTypography ? type as DesignTextRole : 'secondary'} color={designStatusColors[tone]} />;
  return <ThemedText type={type} {...props} themeColor={StatusColors[tone]} />;
}
