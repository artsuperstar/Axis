// Static rendering has no navigator lifecycle. Mounted tests use the real focus boundary.
exports.useFocusEffect = require('react').useEffect;

exports.router = { push() {}, back() {}, replace() {}, canGoBack() { return true; } };
