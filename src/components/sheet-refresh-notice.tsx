import { createContext, useContext } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { FormButton, FormError } from './form-controls';

/** Feature-owned read status, inherited by its sheets without owning any editor state. */
export const SheetRefreshContext = createContext<{ error: string | null; onRetry: () => void } | null>(null);

export function SheetRefreshNotice() {
  const status = useContext(SheetRefreshContext);
  if (!status?.error) return null;
  return <View style={styles.notice}>
    <FormError message={status.error} />
    <FormButton label="Retry refresh" onPress={status.onRetry} />
  </View>;
}

const styles = StyleSheet.create({ notice: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, gap: Spacing.one } });
