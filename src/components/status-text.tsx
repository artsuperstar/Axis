import { StatusColors } from '@/constants/theme';

import { ThemedText, type ThemedTextProps } from './themed-text';

/** No status derivation or pill container: a semantic text tone with accessible wording supplied by callers. */
export function StatusText({ tone = 'neutral', ...props }: Omit<ThemedTextProps, 'themeColor'> & { tone?: keyof typeof StatusColors }) {
  return <ThemedText type="secondary" {...props} themeColor={StatusColors[tone]} />;
}
