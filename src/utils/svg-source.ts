/** Offline ASCII SVG data URLs, including Android's base64-only image data loader. */
export function svgImageSource(svg: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < svg.length; i += 3) {
    const bits = (svg.charCodeAt(i) << 16) | ((svg.charCodeAt(i + 1) || 0) << 8) | (svg.charCodeAt(i + 2) || 0);
    result += alphabet[(bits >>> 18) & 63] + alphabet[(bits >>> 12) & 63]
      + (i + 1 < svg.length ? alphabet[(bits >>> 6) & 63] : '=') + (i + 2 < svg.length ? alphabet[bits & 63] : '=');
  }
  return { uri: `data:image/svg+xml;base64,${result}` };
}
