import { Image } from 'expo-image';
import { useMemo } from 'react';

/** One small authored outline vocabulary, extending the prototype's two-unit action geometry. */
export const iconGeometry = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  list: '<path d="m3 6 1.5 1.5L7 5M10 6h11M3 12h4M10 12h11M3 18h4M10 18h11"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  document: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  tag: '<path d="M3 12 12 3h7l2 2v7l-9 9-9-9Z"/><circle cx="16" cy="8" r="1"/>',
  folder: '<path d="M3 7V5h6l2 2h10v13H3V7Z"/>',
  flag: '<path d="M5 21V3M5 4h14l-4 5 4 5H5"/>',
  repeat: '<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
  back: '<path d="m10 5-7 7 7 7M3 12h18"/>',
  forward: '<path d="m9 5 7 7-7 7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M12 14h2M7 18h2"/>',
  dumbbell: '<path d="M8 12h8M5 5v14M8 7v10M16 7v10M19 5v14M2 9v6M22 9v6"/>',
  activity: '<circle cx="13" cy="4" r="2"/><path d="m6 10 5-3 5 4 4 1M11 7l-1 7-4 6M10 14l6 7"/>',
  timer: '<circle cx="12" cy="14" r="8"/><path d="M9 2h6M12 2v4M19 6l2-2M12 10v5l3 2"/>',
  route: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h9a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h9"/>',
} as const;
export type UiIconName = keyof typeof iconGeometry;

// These authored SVGs contain ASCII only. Encode locally without depending on a browser global,
// a Node Buffer polyfill, or another package in the native runtime.
function asciiBase64(value: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < value.length; i += 3) {
    const bits = (value.charCodeAt(i) << 16) | ((value.charCodeAt(i + 1) || 0) << 8) | (value.charCodeAt(i + 2) || 0);
    result += alphabet[(bits >>> 18) & 63] + alphabet[(bits >>> 12) & 63]
      + (i + 1 < value.length ? alphabet[(bits >>> 6) & 63] : '=') + (i + 2 < value.length ? alphabet[bits & 63] : '=');
  }
  return result;
}

export function iconSource(name: UiIconName, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconGeometry[name]}</svg>`;
  // Expo Image's Android data-URL loader decodes base64, not percent-encoded SVG.
  return { uri: `data:image/svg+xml;base64,${asciiBase64(svg)}` };
}

/** Decorative companion to a named control/heading; no additional screen-reader stop. */
export function UiIcon({ name, color, size = 20 }: { name: UiIconName; color: string; size?: number }) {
  const source = useMemo(() => iconSource(name, color), [name, color]);
  return <Image source={source} style={{ width: size, height: size }} contentFit="contain" accessible={false}
    accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID={`icon-${name}`} />;
}
