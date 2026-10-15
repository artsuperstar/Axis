// Installed native image boundary; render the actual data URI with RN Web for previews.
const React = require('react');
const native = require('react-native');
module.exports = { Image: native.StyleSheet.flatten ? function StaticImage({ source, style, testID }) {
  return React.createElement('img', { src: source.uri, style: native.StyleSheet.flatten(style), alt: '', 'aria-hidden': true, 'data-testid': testID });
} : native.Image };
