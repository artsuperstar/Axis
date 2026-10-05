import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { DatabaseProvider } from '@/database/database-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

void SplashScreen.preventAutoHideAsync().catch((error) => console.error('Splash hold failed', error));

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = useTheme();
  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = { ...baseTheme, colors: { ...baseTheme.colors,
    primary: colors.accent, background: colors.background, card: colors.surfaceRaised,
    text: colors.textPrimary, border: colors.border, notification: colors.danger,
  } };
  return (
    <ThemeProvider value={navigationTheme}>
      <DatabaseProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </DatabaseProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
