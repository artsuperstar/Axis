# Phase 1 validation and preservation

12 November 2026 · source `16ebeab46d20e7a943f08fa017928ce0eb884c0e` · branch `main`.

This phase adds documentation, screenshots, standalone palette specimens and four isolated support scripts. It does not change app code. Native acceptance, app functional regression suites and platform exports are not represented by the browser checks below.

| Check | Command / evidence | Result |
|---|---|---|
| TypeScript | `node node_modules/typescript/bin/tsc --noEmit` | Passed, exit 0; includes the new auxiliary TypeScript builder |
| Changed-file ESLint | `node node_modules/eslint/bin/eslint.js scripts/audit-visual-unification.cjs scripts/build-palette-specimens.cjs scripts/capture-visual-audit.cjs scripts/preview-visual-audit-auxiliary.ts --no-cache` | Passed; final run0 errors /0 warnings |
| Current-source preview builds | `node scripts/audit-visual-unification.cjs builds` | All30 incumbent builders passed; [results](preview-builds.json) |
| Nested-state preview build | `node --import tsx scripts/preview-visual-audit-auxiliary.ts` | Passed; real source components, synthetic local fixture, no app imports from audit files |
| Atlas capture | `node scripts/capture-visual-audit.cjs` / `--retry` for corrected adapters | **154/154** captured,77 dark +77 light; no page errors; [manifest](atlas/manifest.json) |
| Atlas provenance | Fresh HTML/bundle SHA256 and PNG existence/magic checks | Passed for all 154; [capture validation](atlas-validation.json) |
| Palette generation | `node scripts/build-palette-specimens.cjs` | Three unapproved candidates, both themes, exact JSON and local-font HTML |
| Palette preview checks | `node scripts/audit-visual-unification.cjs palettes` | Four screenshots at 1440/390 ×dark/light; three visible specimens per view, no horizontal document overflow, buttons>=48, selection toggles correctly; [results](palette-validation.json) |
| Current contrast | `node scripts/audit-visual-unification.cjs contrasts` | Reproducible source-pair measurements; [results](current-contrast.json), including the documented resting-field concern |
| Preservation | `node scripts/audit-visual-unification.cjs verify` | **2,232 baseline files unchanged**: all src/assets, existing docs/previews evidence, manifests/lock/config/context files |
| Artifact links / freshness | `node scripts/audit-visual-unification.cjs validate` | Local Markdown/HTML targets, all capture provenance,30 builds and baseline verified; [results](artifact-validation.json) |
| Whitespace | `git diff --check` and check of the new text artifacts | Passed |
| Runtime change | `git diff --name-only`, status and baseline SHA256 | No tracked file modified; new paths only as listed below |

The atlas includes19 original contact sheets plus a twentieth after the representative menu/category additions, and four equivalent-surface comparisons. Contact-sheet order is generated from the manifest; use case IDs/original images for durable references. Browser screenshots are first viewport, not full-scroll or native tests. Earlier feature review evidence was not overwritten.

The palette checks are for color/layout approval artifacts. They verify contrast of opaque test pairs, not conformance of the complete app, photo overlays or future native layouts. Source UI captures verify rendering, not every action or persistence rule.

## Reproduction

Use the existing installed dependencies. No package installation is needed. Builders use the current source and write ignored `dist/` output. The capture scripts support `AXIS_PLAYWRIGHT_PATH` and `AXIS_CHROMIUM_PATH`; their fallbacks point to the existing local browser tooling used in this workspace.

```powershell
# Start a fresh audit only: inventory establishes preservation baseline.
node scripts/audit-visual-unification.cjs inventory
node scripts/audit-visual-unification.cjs builds
node --import tsx scripts/preview-visual-audit-auxiliary.ts
node scripts/capture-visual-audit.cjs
node scripts/build-palette-specimens.cjs
node scripts/audit-visual-unification.cjs palettes
node scripts/audit-visual-unification.cjs contrasts
node scripts/audit-visual-unification.cjs validate
```

Do not rerun `inventory` to conceal a changed source baseline. The committed review snapshot should retain its original baseline; a later source revision needs separately labeled evidence. Do not run incumbent `review-*` scripts for this atlas: those write into the previous feature-review directories. The new capture driver writes only this audit's atlas.

## Checks intentionally not run

No app test suite, app iOS/Android export, native build, migration, dependency update, formatting rewrite or persistence reset was needed for this audit-only change. The user requested TypeScript, changed-file lint, relevant preview checks and diff checking when support code is added; those were run. Functional/native/export gates for later implementation are specified in the [roadmap](visual-unification-audit.md#roadmap-and-regression-boundaries).

Native tabs/alerts/pickers, OS font scaling, keyboard, safe areas, VoiceOver/TalkBack, platform back gestures and hardware performance remain to be tested natively. No physical-device acceptance is claimed.

## Git state

Initial worktree: clean, `main`, HEAD`16ebeab` (“Client details update”). Final tracked diff: empty. New untracked additions:

```text
?? docs/design-system/
?? scripts/audit-visual-unification.cjs
?? scripts/build-palette-specimens.cjs
?? scripts/capture-visual-audit.cjs
?? scripts/preview-visual-audit-auxiliary.ts
```

The documentation folder contains the report, screen/token inventories, register, review index, exact current/proposed token data, validation records and fresh visual evidence. Existing source/assets/config/lock files and previous preview evidence remain unchanged. Nothing was committed or pushed.
