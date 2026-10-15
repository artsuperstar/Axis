// Native animation boundary only. Components/state/callbacks remain real; timing calls are observable.
const React = require('react');
const { View } = require('react-native');
const calls = [];
const motion = {
  __esModule: true,
  default: { View, createAnimatedComponent: (component) => component },
  useSharedValue: (value) => React.useRef({ value, get() { return this.value; }, set(next) { this.value = next; } }).current,
  useAnimatedStyle: (style) => style(),
  withTiming(value, config) { calls.push({ value, config }); return value; },
  Easing: { out: (value) => value, cubic: (value) => value ** 3 },
  ReduceMotion: { System: 'system' }, calls,
};
module.exports = motion;
