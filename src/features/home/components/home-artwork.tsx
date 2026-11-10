import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

export type HomeIdentity = 'today' | 'attention' | 'fitness' | 'journal' | 'spent';
const plates = {
  today: require('../../../../assets/images/home-v2/today.webp'),
  attention: require('../../../../assets/images/home-v2/attention.webp'),
  fitness: require('../../../../assets/images/home-v2/fitness.webp'),
  journal: require('../../../../assets/images/home-v2/journal.webp'),
  spent: require('../../../../assets/images/home-v2/spent.webp'),
};
const identities = {
  today: { dark: { body: '#2C191F', border: '#88605F', accent: '#FFD0BD', text: '#FFF4EE' }, light: { body: '#F8EAE5', border: '#C8A39A', accent: '#87402E', text: '#40221E' } },
  attention: { dark: { body: '#302314', border: '#88673D', accent: '#FFCE83', text: '#FFF4E3' }, light: { body: '#F6ECD8', border: '#BDA06E', accent: '#795115', text: '#3B2A11' } },
  fitness: { dark: { body: '#11291F', border: '#426C57', accent: '#BCEAD5', text: '#EDF9F2' }, light: { body: '#E9F1E9', border: '#92AE9F', accent: '#245C49', text: '#16392E' } },
  journal: { dark: { body: '#281E30', border: '#715A7D', accent: '#E9C9F2', text: '#FBF1FF' }, light: { body: '#EEE7F2', border: '#AF98BB', accent: '#69427B', text: '#392943' } },
  spent: { dark: { body: '#261A16', border: '#87583F', accent: '#FFD0AE', text: '#FFF4ED' }, light: { body: '#F4E6DE', border: '#B79583', accent: '#81452F', text: '#482A20' } },
};
export function useHomeIdentity(id: HomeIdentity) {
  const dark = useColorScheme() === 'dark';
  return { ...identities[id][dark ? 'dark' : 'light'], dark };
}

/** Stable local plates never participate in source loading. A failed plate leaves the tonal fallback. */
export const HomeArtwork = memo(function HomeArtwork({ identity }: { identity: HomeIdentity }) {
  const [failed, setFailed] = useState(false);
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    {!failed && <Image testID={`home-art-${identity}`} source={plates[identity]} contentFit="cover" contentPosition="center" cachePolicy="memory" transition={0}
      accessible={false} onError={() => setFailed(true)} style={StyleSheet.absoluteFill} />}
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(12, 9, 12, 0.20)' }]} />
  </View>;
});
