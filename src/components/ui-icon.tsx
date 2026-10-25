import { Image } from 'expo-image';
import { useMemo } from 'react';

import { svgImageSource } from '@/utils/svg-source';

/** One small authored outline vocabulary, extending the prototype's two-unit action geometry. */
export const iconGeometry = {
  creditCard: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 9h20M6 15h4"/>',
  home: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
  utensils: '<path d="M5 3v6M2 3v5a3 3 0 0 0 6 0V3M5 11v10M16 21V3c-5 4-5 10 0 10"/>',
  car: '<path d="m4 9 2-6h12l2 6M3 9h18v9H3V9ZM5 18v3M19 18v3M6 13h2M16 13h2"/>',
  shoppingBag: '<path d="M4 7h16l1 14H3L4 7ZM8 9V6a4 4 0 0 1 8 0v3"/>',
  paw: '<ellipse cx="5" cy="8" rx="2" ry="3"/><ellipse cx="10" cy="5" rx="2" ry="3"/><ellipse cx="16" cy="5" rx="2" ry="3"/><ellipse cx="21" cy="9" rx="2" ry="3"/><path d="M7 21c-5-1-3-6 0-8s5-3 7-1 8 6 4 9c-3 1-7-2-11 0Z"/>',
  ticket: '<path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4V5ZM15 5v3M15 11v2M15 16v3"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  receipt: '<path d="M5 2l3 2 4-2 4 2 3-2v20l-3-2-4 2-4-2-3 2V2ZM9 8h6M9 12h6M9 16h3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
  moodGreat: '<circle cx="12" cy="12" r="9"/><path d="M7 9h1M16 9h1M7 13h10a5 5 0 0 1-10 0Z"/>',
  moodGood: '<circle cx="12" cy="12" r="9"/><path d="M8 9h.01M16 9h.01M7 14q5 6 10 0"/>',
  moodOkay: '<circle cx="12" cy="12" r="9"/><path d="M8 9h.01M16 9h.01M8 15h8"/>',
  moodLow: '<circle cx="12" cy="12" r="9"/><path d="M8 9h.01M16 9h.01M7 17q5-6 10 0"/>',
  moodBad: '<circle cx="12" cy="12" r="9"/><path d="m7 8 2 2m8-2-2 2M7 18q5-8 10 0"/>',
  up: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  down: '<path d="M12 4v16m-6-6 6 6 6-6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 12 9-9M17 3h4v4"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  chevronLeft: '<path d="m15 5-7 7 7 7"/>',
  chevronUp: '<path d="m7 14 5-5 5 5"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  list: '<path d="m3 6 1.5 1.5L7 5M10 6h11M3 12h4M10 12h11M3 18h4M10 18h11"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  document: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  tag: '<path d="M3 12 12 3h7l2 2v7l-9 9-9-9Z"/><circle cx="16" cy="8" r="1"/>',
  folder: '<path d="M3 7V5h6l2 2h10v13H3V7Z"/>',
  flag: '<path d="M5 21V3M5 4h14l-4 5 4 5H5"/>',
  repeat: '<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
  archive: '<path d="M4 8h16v13H4V8Z"/><path d="M3 3h18v5H3V3ZM9 12h6"/>',
  gear: '<path d="m9 3 1-1h4l1 1v2l2 1 2-1 2 3-1 2v3l1 2-2 3-2-1-2 1v2l-1 1h-4l-1-1v-2l-2-1-2 1-2-3 1-2v-3L3 8l2-3 2 1 2-1V3Z"/><circle cx="12" cy="11.5" r="3"/>',
  back: '<path d="m10 5-7 7 7 7M3 12h18"/>',
  forward: '<path d="m9 5 7 7-7 7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M12 14h2M7 18h2"/>',
  calendarRepeat: '<path d="M11 21H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4M7 3v4M17 3v4M3 10h18M20 15a4 4 0 0 0-7 1m0-3v3h3M14 21a4 4 0 0 0 7-1m0 3v-3h-3"/>',
  calendarStopped: '<path d="M10 21H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4M7 3v4M17 3v4M3 10h18"/><circle cx="17" cy="18" r="5"/><path d="M15.5 16v4M18.5 16v4"/>',
  pencil: '<path d="m4 16-1 5 5-1L21 7l-4-4L4 16Zm10-10 4 4"/>',
  dumbbell: '<path d="M8 12h8M5 5v14M8 7v10M16 7v10M19 5v14M2 9v6M22 9v6"/>',
  activity: '<circle cx="13" cy="4" r="2"/><path d="m6 10 5-3 5 4 4 1M11 7l-1 7-4 6M10 14l6 7"/>',
  timer: '<circle cx="12" cy="14" r="8"/><path d="M9 2h6M12 2v4M19 6l2-2M12 10v5l3 2"/>',
  route: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h9a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h9"/>',
  chart: '<path d="M3 3v18h18M7 17v-4M12 17V9M17 17V5"/>',
  heart: '<path d="m12 21-8-8a5 5 0 0 1 8-6 5 5 0 0 1 8 6l-8 8Z"/>',
  person: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  cart: '<path d="M2 3h3l3 12h11l3-9H6M8 15l-1 3h12"/><circle cx="9" cy="21" r="1"/><circle cx="18" cy="21" r="1"/>',
  book: '<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15"/>',
  graduation: '<path d="m2 8 10-5 10 5-10 5L2 8Zm4 2v7c4 3 8 3 12 0v-7M22 8v9"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V3h8v4M2 12c6 4 14 4 20 0M12 12v5"/>',
} as const;
export type UiIconName = keyof typeof iconGeometry;

export function iconSource(name: UiIconName, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconGeometry[name]}</svg>`;
  // Expo Image's Android data-URL loader decodes base64, not percent-encoded SVG.
  return svgImageSource(svg);
}

/** Decorative companion to a named control/heading; no additional screen-reader stop. */
export function UiIcon({ name, color, size = 20 }: { name: UiIconName; color: string; size?: number }) {
  const source = useMemo(() => iconSource(name, color), [name, color]);
  return <Image source={source} style={{ width: size, height: size }} contentFit="contain" accessible={false}
    accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID={`icon-${name}`} />;
}
