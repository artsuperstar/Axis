import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const colors = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.accentMuted}
      tintColor={colors.accent}
      iconColor={{ default: colors.textSecondary, selected: colors.accent }}
      labelVisibilityMode="labeled"
      labelStyle={{ selected: { color: colors.accent } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="tasks" disableTransparentOnScrollEdge disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Tasks</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checkmark.circle.fill" md="check_circle" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="finance">
        <NativeTabs.Trigger.Label>Finance</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="dollarsign.circle.fill" md="account_balance_wallet" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="fitness" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Fitness</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="figure.strengthtraining.traditional" md="fitness_center" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
