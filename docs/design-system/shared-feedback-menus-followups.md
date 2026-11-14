# Shared presentation follow-ups — explicitly open after3B-S.2

These retain the parent audit IDs; they are not new replacement findings. Neither item is accepted or closed by the feedback/context-menu migration.

## VU-05 / constrained-height header — open, native reproduction required

Source: `src/components/adaptive-sheet.tsx`, existing `adaptive-sheet-layout.ts`; no header architecture changes in3B-S.2.

Preserved reproduction: [S.1 interaction evidence](shared-sheets-headers/interaction-validation.json), `constraints`; [paired atlas](shared-sheets-headers/index.html), `long-large-*-320.png`; [S.1 report](shared-sheets-headers-report.md#disclosed-compounded-stress-constraint).

At320pt, doubled text, synthetic long editorial title and keyboardTop520, fixed-header space is exhausted. S.1 final header706pt; Save y641+62 exceeds keyboard top. Baseline also fails (Save y513+58). This is not accepted merely because the tests for independent ordinary/large or operational-title cases pass.

Later investigation must:

1. Inventory realistic reachable production titles, especially distinguish short editorial New exercise from operational long Client History.
2. Reproduce on native iOS and Android with real system text sizes and keyboards.
3. Measure actual usable viewport after keyboard, window origin and existing safe areas; determine whether the production case is reachable.
4. Design a constrained-height presentation only if justified, independently reviewing full title access, visible/reachable actions, body scrolling, focus reveal and dismissal.
5. Preserve sheet/modal ownership, source drafts, geometry callbacks and single inset ownership. Do not silently introduce truncation, header scrolling or a new dismissal policy.

Acceptance: demonstrate all critical actions and editing content remain reachable in the reproduced production cases; retain full accessible title and source callbacks; validate both platforms and rerun sheet/focus/dirty-state regressions. Until then native acceptance is open.

## VU-05 / VU-07 / bare-host web Escape — open, targeted browser remediation only

Source: `src/components/form-selection-host.tsx`, `autocomplete-field.tsx`, installed RNWeb TextInput keyboard integration. Preserved [S.1 before/after reproduction](shared-sheets-headers/interaction-validation.json), `escape`.

Bare host: TextInput stops keydown propagation before the document listener, so typing Escape leaves the menu open. AdaptiveModal-owned flows already close through RNWeb ModalContent's existing keyup/onRequestClose path, which dismisses the menu before the parent. Explicit dismissal and focus return work in both flows.

No broad keyboard workaround belongs in3B-S.2. A later targeted fix must isolate bare-host web behavior, preserve ordinary input handling, avoid duplicate keydown/keyup dismissals, and prove parent dirty-state guards, inline create/cancel, option order, focus return and Android/iOS native behavior remain unchanged. Native hardware Back is a different contract.

Acceptance: reproducible failing/passing browser tests for bare-host typing Escape and unchanged modal-owned behavior; no source, parsing, native keyboard, navigation or focus-owner changes. Keep this separate from constrained-height header work.
