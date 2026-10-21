# Day at a Glance v2.1 review

Actual Journal UI with SQLite-generated source fixtures. See [parent preview notes](../README.md) for browser substitution boundaries and reproduction. Build with `scripts/preview-journal.ts`, then open `dist/journal-review/index.html?selected&context`; add `fewTasks`, `manyTasks` or `large` as needed.

Captures cover one, four and seven completed Tasks, all three source summaries, a long completed title, both themes, 320/390/430 widths and doubled-text simulation. Large-text Finance gets a separate scrolled capture. No Tasks/Fitness/Finance block is a button; the visible Save entry action belongs to the unchanged Journal editor.

`review.json` records zero source controls, zero runtime errors and zero horizontal text overflow for the matrix. Completed names and counts come from actual Tasks reads. Fitness preserves its existing Free workout / Workout completed summary. Finance uses actual R$32.50 spent, R$180 income and R$147.50 net, localized as BRL.

These are browser review captures, not physical-device tests or native Dynamic Type verification. Retest text wrapping, grouped VoiceOver/TalkBack announcements, four-title remainder and natural scrolling in Expo Go.
