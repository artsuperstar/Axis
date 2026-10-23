import { NativeTabs } from 'expo-router/native-tabs';
import { useDesignColors } from '@/components/design-system';

export default function AppTabs() {
  const colors = useDesignColors();

  return (
    <NativeTabs
      backgroundColor={colors.canvas}
      indicatorColor={colors.brandSoft}
      tintColor={colors.brand}
      iconColor={{ default: colors.textSecondary, selected: colors.brand }}
      labelVisibilityMode="labeled"
      labelStyle={{ selected: { color: colors.brand } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="tasks" disableTransparentOnScrollEdge disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Tasks</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checkmark.circle.fill" md="check_circle" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendar" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="finance" disableAutomaticContentInsets>
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
