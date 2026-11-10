import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDesignColors } from '@/components/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

const sources = {
  dark: require('../../../../assets/images/home-v22/dark.webp'),
  light: require('../../../../assets/images/home-v22/light.webp'),
};

/** Out-of-flow material; the ScrollView remains first in the native inset-discovery chain. */
export const HomeBackground = memo(function HomeBackground({ viewportHeight }: { viewportHeight: number }) {
  const theme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = useDesignColors();
  const [failed, setFailed] = useState<Partial<Record<typeof theme, boolean>>>({});
  return <View testID="home-background" pointerEvents="none" accessible={false}
    accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[StyleSheet.absoluteFill, { backgroundColor: colors.canvas, minHeight: viewportHeight }]}>
    {!failed[theme] && <Image key={theme} testID={`home-background-${theme}`} source={sources[theme]}
      contentFit="cover" contentPosition="center" cachePolicy="memory" transition={0} accessible={false}
      onError={() => setFailed(previous => ({ ...previous, [theme]: true }))}
      style={[StyleSheet.absoluteFill, { opacity: theme === 'light' ? 0.6 : 1 }]} />}
  </View>;
});
