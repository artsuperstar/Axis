import { View, type ViewProps } from 'react-native';

import { SurfaceColors, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  type?: ThemeColor;
  surface?: keyof typeof SurfaceColors;
};

export function ThemedView({ style, type, surface = 'screen', ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  return <View style={[{ backgroundColor: theme[type ?? SurfaceColors[surface]] }, style]} {...otherProps} />;
}
