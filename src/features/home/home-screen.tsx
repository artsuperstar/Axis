import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { FormButton, FormError } from '@/components/form-controls';
import { UiText, useDesignColors } from '@/components/design-system';
import { DesignSpace as Space } from '@/constants/design-system-v2';
import { TransactionCreate } from '@/features/finance/components/transaction-create';
import { localDateString, pickerValue } from '@/utils/calendar';

import { HomeContent } from './components/home-content';
import { useHome } from './use-home';

export function HomeScreen() {
  const colors = useDesignColors();
  const home = useHome();
  const [transactionOpen, setTransactionOpen] = useState(false);
  const date = home.snapshot?.date ?? localDateString(new Date());
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
    <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={styles.content}>
    <View style={styles.inner}>
      <View style={styles.header}>
        <UiText type="screenTitle" accessibilityRole="header">Home</UiText>
        <UiText type="secondary" color="textSecondary">{pickerValue(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</UiText>
      </View>
      <FormError appearance="v2" message={home.error || home.actionError} />
      {!!home.error && <FormButton appearance="v2" label="Retry" onPress={home.reload} />}
      {home.snapshot ? <HomeContent snapshot={home.snapshot} onAddTransaction={() => setTransactionOpen(true)} onOpen={(target) => target.pathname === '/(tabs)/fitness' ? router.navigate(target) : router.push(target)} onComplete={home.completeTask} />
        : !home.error && <ActivityIndicator color={colors.textPrimary} accessibilityLabel="Loading Home" />}
    </View>
    </ScrollView>
    {transactionOpen && <TransactionCreate onSaved={home.reload} onDismiss={() => setTransactionOpen(false)} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: Space.lg, paddingBottom: Space.xxl },
  inner: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: Space.section }, header: { gap: Space.xs },
});
