// Server-rendered form tests use web date fields. Native picker behavior is checked on devices.
module.exports = {
  __esModule: true,
  default: () => { throw new Error('Native date picker cannot render in a web form test.'); },
  DateTimePickerAndroid: { open: () => { throw new Error('Native date picker cannot open in a web form test.'); } },
};
