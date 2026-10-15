// Only the native thread bridge is replaced; production gesture ownership remains under test.
module.exports = { scheduleOnRN: (callback, ...args) => queueMicrotask(() => callback(...args)) };
