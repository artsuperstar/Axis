# Phase 3A.1 — Theme Infrastructure Readiness

Implemented 2026-11-12 against `16ebeab46d20e7a943f08fa017928ce0eb884c0e` (main). Infrastructure only: no palette cutover, style changes, domain changes, dependencies, navigation changes or persistence changes. Phase 3A.1 is complete; the mode interface is ready for 3A.2.

## Root cause and audit

`src/features/finance/overview-presentation.ts` previously used `colors.canvas === '#151315'` to choose the dark chart series/category colors, otherwise light. `src/constants/design-system-v2.ts` used `colors.canvas === DesignColors.light.canvas` for Today's surface, otherwise the dark surface. Custom neutrals could silently choose the wrong chart colors or Task surface. Searching the runtime found no additional equivalent color-as-mode detection requiring changes. Other canvas comparisons in the search were ordinary appearance/feature conditionals.

The existing React Native `useColorScheme`, through `src/hooks/use-color-scheme` and its web hydration variant, still owns mode. `DesignProvider` still owns only typography and Reduced Motion. `UiText` accepts `keyof DesignPalette` and resolves `colors[color]`, so theme metadata must remain outside that palette. Current production callers use canonical palettes; pure helper callers can supply custom color-only objects.

Reviewed the Phase 1 audit, Phase 2 specification, migration plan and traceability, particularly VU-08/VU-09. This request's narrower boundary defers semantic aliases/new roles to 3A.2 even though the older migration plan allowed role readiness in 3A.1.

## Actual API

In `src/constants/design-system-v2.ts`:

```ts
export type DesignPalette = { [K in keyof typeof DesignColors.light]: string };
export type DesignMode = 'light' | 'dark';
export type DesignTheme = Readonly<{ mode: DesignMode; colors: DesignPalette }>;
export function taskSectionSurface(colors: DesignPalette, section: string, mode: DesignMode): string;
```

In `src/components/design-system.tsx`:

```ts
export function useDesignTheme(): DesignTheme;
export function useDesignColors(): DesignPalette;
```

In `src/features/finance/overview-presentation.ts`:

```ts
export function overviewColors(colors: DesignPalette, mode: DesignMode): {
  income: string; expenses: string; axis: string; grid: string;
  selected: string; separator: string; categories: string[];
};
```

Correct usage:

```tsx
const { mode, colors } = useDesignTheme();
const surface = taskSectionSurface(colors, 'Today', mode);
const chart = useMemo(() => overviewColors(colors, mode), [colors, mode]);
```

Pure custom-palette usage:

```ts
overviewColors({ ...DesignColors.dark, canvas: '#423B39' }, 'dark');
taskSectionSurface({ ...DesignColors.light, canvas: '#151315' }, 'Today', 'light');
```

`useDesignColors` remains compatible and returns the same canonical palette reference. Both hooks share the existing platform accessor; no new context/provider/state or dependencies were added. Two module-level wrappers keep `useDesignTheme` identity stable between unchanged modes. The existing fallback is preserved: anything except `dark` resolves to light (including null and web's server snapshot). There are no compatibility aliases or optional helper mode arguments: every internal caller was updated atomically, and pure helpers require explicit authoritative mode. No brightness or HEX heuristic remains.

## Every affected runtime caller

All paths below are relative to `src/features/`. Previously each read only `useDesignColors` and called its helper without mode; now each reads `{ mode, colors }` once and supplies mode, so background changes cannot choose the presentation variant.

| File | Function / purpose | Specific change |
|---|---|---|
| `finance/components/cash-flow-chart.tsx` | CashFlowChart | Pass mode to overviewColors; memo dependencies include palette and mode |
| `finance/components/expense-donut-chart.tsx` | ExpenseDonutChart | Same; preserve category ordering and neutral colors |
| `finance/components/finance-dashboard.tsx` | Summary | Pass mode to financial metric color selection |
| `finance/components/transaction-row.tsx` | TransactionRow | Pass mode to income/expense amount colors |
| `tasks/components/task-list-row.tsx` | TaskListRow | Pass mode to row surface |
| `tasks/components/task-section.tsx` | TaskSectionHeader and TaskSectionFooter | Pass mode to both surfaces; disclosure/animation logic unchanged |
| `tasks/components/task-workspace-list.tsx` | TaskWorkspaceList | Pass mode to Completed today group surface; virtualization unchanged |

This is seven caller files / eight component functions. Existing callback, refresh, focus, rendering and provider boundaries remain intact. Chart memoization now also handles mode changes even if a caller retains the same palette object. The new wrapper does not add a per-render object allocation or additional platform subscription at any converted caller.

## Tests and validation

| Check | Before | After |
|---|---|---|
| Full suite, TZ=America/Sao_Paulo | 1,454 passed; zero failed/skipped | 1,462 passed; zero failed/skipped |
| Focused tests, 17 files | Existing tests included in baseline | 268 passed; zero failed/skipped |
| TypeScript, `tsc --noEmit` | Pass | Pass |
| Changed-file ESLint (including new test and capture script) | — | Pass; zero diagnostics |
| Full ESLint | 6 errors, 2 warnings | Exactly the same 6 errors, 2 warnings; zero added/removed diagnostics |
| iOS export | — | Pass, 1,894 modules |
| Android export | — | Pass, 1,991 modules |
| `git diff --check` | — | Pass |
| Visual comparisons | 24 fresh source captures | 24/24 byte-identical PNGs |

Eight tests were added: six current/custom/opposite-canonical-canvas cases across both modes; one same-custom-palette/both-modes/neutral-role preservation case; one rendered hook test covering platform mode changes, stable wrapper/palette identity, UiText key lookup, color-only type/key inference and null/unrecognized fallback. Expected chart series/category arrays are pinned to their previous values. All section variants are covered, including the unknown-section fallback.

Updated direct calls in `tests/design-system-v2.test.ts`, `tests/finance-overview-v2.test.ts`, and `tests/finance-overview.test.ts` to supply explicit mode. New pure cases live in `tests/theme-mode.test.ts`. No tests were weakened or suppressed.

Focused command (all with `node --import tsx --test --test-concurrency=2 --test-reporter=tap` and TZ=America/Sao_Paulo): `theme-mode`, `design-system`, `design-system-v2`, `finance-overview`, `finance-overview-v2`, `finance-charts`, `finance-charts-integration`, `task-workspace`, `task-section-navigation`, `task-row-disclosure`, `task-disclosure-motion`, `task-disclosure-isolation`, `task-occurrence-presentation`, `tasks-experience`, `transactions-experience`, `transaction-editor-v2`, `transactions-v22` (each under `tests/`, suffix `.test.ts`). These cover chart grouping, selection/period interactions, transaction amounts, Task selected/disabled/completed states, recurrence projection, navigation and disclosure behavior. Full suite uses `tests/*.test.ts`.

Baseline environment detail: a first run without an explicit TZ reported 1,451/1,454 passed. Three existing date tests assumed local calendar dates (`finance.test.ts` transaction date; `transactions-experience.test.ts` future-date validation and Android callback date). The timezone-aligned run was completed before runtime edits and passed all 1,454. No date logic/test expectations were changed. Restricted Windows profile lookup also prevented tsx from starting in the sandbox (`uv_os_get_passwd`); the successful tests/preview builders/exports ran outside that restriction. There is no remaining validation block.

Full lint's existing errors are `react/no-children-prop` in `tests/context-menu.test.ts` (3), `tests/navigation-conventions.test.ts` (2), `tests/transactions-experience.test.ts` (1). The two existing unused-variable warnings are in `tests/tasks-experience.test.ts`. [Exact baseline comparison](theme-readiness/eslint-comparison.json). No new lint errors or suppressions. Export output contains only the environment's existing NO_COLOR/FORCE_COLOR warnings, not build failures.

Detailed counts and commands: [validation.json](theme-readiness/validation.json). Raw command logs remain in ignored `dist/theme-readiness/`.

## Visual evidence and skills

[Before/after review gallery](theme-readiness/index.html) · [PNG hashes](theme-readiness/visual-equivalence.json) · [Before manifest](theme-readiness/before.json) · [After manifest](theme-readiness/after.json).

Captured current-source RNWeb fixtures before any runtime edit, froze generated fixture directories, then rebuilt/captured the same cases after. Both modes; viewport height 844; pt-BR; America/Sao_Paulo; reduced motion; fonts ready; identical animation/caret suppression. Tasks and Fitness use existing source-rendered static fixtures; other previews mount their existing interactive browser fixtures. No old screenshot was relabeled as new evidence.

| Screen / state | Widths, each in both themes |
|---|---|
| Home v2.2 | 390 |
| Tasks | 320, 390 |
| Calendar | 390 |
| Finance Overview | 320, 390, 430 |
| Finance selected second cash-flow interval | 390 |
| Finance Spending/category presentation | 390 |
| Finance transaction editor | 390 |
| Fitness landing/workout | 390 |
| Journal restored selected draft | 390 |

All 24 pairs are byte-identical. No chart color, Task surface, text color, header, selection, spacing or layout difference was observed. No changes to existing token objects, module style definitions or artwork; [source invariant evidence](theme-readiness/source-invariants.json) confirms these. Both financial chart series and all category values remain exactly as before. Task indigo identity and surface values remain exactly as before.

- **Anthropic frontend-design:** kept established visual identity as the invariant; separated explicit mode metadata from color roles rather than mixing non-colors into palette keys. No new design direction.
- **Impeccable:** inspected incumbent/current-source captures, reviewed styling invariants, and verified exact before/after equality; no opportunistic polishing.
- **UI/UX Pro Max:** checked selected, semantic, focus, disabled and interaction meanings against unchanged controls/tokens and relevant tests; income/expense grouping and Task identity preserved.
- **Expo Skills (building-native-ui):** reviewed SDK 58 ownership against [versioned docs](https://docs.expo.dev/versions/v58.0.0/) and [color-theme guidance](https://docs.expo.dev/develop/user-interface/color-themes/). Retained platform mode, web hydration fallback, current provider boundaries, native tabs/insets and native component behavior. Both Metro platform exports pass.

## Files, repository preservation and remaining acceptance

Modified existing files: the two foundation files, `overview-presentation.ts`, all seven caller files above, and the three existing test files listed above (13 total). Added `tests/theme-mode.test.ts`, `scripts/review-theme-readiness.cjs`, this report, and the `docs/design-system/theme-readiness/` evidence package (initial-state manifest, before/after manifests, 48 PNGs, gallery, comparison/invariant/validation JSON). No existing Phase 1/2 report or builder was edited.

The initial worktree had no tracked changes and had untracked `docs/design-system/` plus five audit/specification scripts. SHA256 verification of the 2,777 initial files found only those 13 intended existing files changed; all 230 prior design-document/artifact/script files remain byte-for-byte unchanged. Final HEAD is unchanged; index is empty; all changes remain unstaged. No commit or push.

Browser evidence and successful Metro exports are not native device acceptance. Remaining physical check: switch OS light/dark mode on iOS and Android while Tasks and Finance are mounted; verify chart/row updates and unchanged sheets/native-tab/safe-area appearance. This phase changes no native configuration or subscription ownership. Full lint remains subject to the existing baseline issues above. No unresolved implementation defect is known.

## Phase 3A.2 handoff

Phase 3A.1 is complete. Use the exported mode API directly for palette changes; never infer mode from canvas. Keep `DesignPalette` color-only and stable canonical palette references.

3A.2 must atomically update `src/constants/design-system-v2.ts` to the approved canonical Soft Copper values/roles and semantic aliases, update the color-role consumption described in the approved specification, and correct primary-button bindings in `src/components/design-system.tsx`: **normal primary must use `brand`, with `brandStrong` reserved for pressed/hover feedback**. Coordinate `src/components/control-appearance.ts` and its FormButton adapter in `src/components/form-controls.tsx` where the approved mappings require it. Do not change only the token values while leaving UiButton's existing default `brandStrong` binding.

Target affected Finance adapters/helpers and Task callers above only where required by the approved role migration; preserve explicit mode. Validate all current v2 consumers at the product-wide visual checkpoint, including canonical primary/onBrand, focus/boundary and selected/status pairs. Legacy sheets, broader feature/status migration and native root/tint work remain in their approved later batches unless the 3A.2 prompt explicitly includes them.

Do not modify domain/data logic, recurrence, BRL centavos, allocations, dates, schema/persistence, routes, native-tab triggers, modal/safe-area ownership, artwork/textures, app icon or Home emblem. Preserve the approved layouts, typography, geometry, motion/Reduced Motion and existing source-owned interactions.
