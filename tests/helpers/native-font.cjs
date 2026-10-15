// Runtime loader boundary; production bundled files are validated separately.
const state = { loaded: true, error: null, displayLoaded: true, displayError: null };
module.exports = { state, useFonts: (fonts) => Object.hasOwn(fonts, 'AxisLora-SemiBold')
  ? [state.displayLoaded, state.displayError] : [state.loaded, state.error] };
