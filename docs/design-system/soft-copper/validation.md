# Phase 2 validation and preservation

12 November 2026 · source `16ebeab46d20e7a943f08fa017928ce0eb884c0e` · no runtime implementation.

The initial working tree already contained the untracked Phase 1 audit, atlas and four audit support scripts. Those are user work for this phase and remain byte-for-byte intact. A baseline of **2,751 pre-existing repository files** was captured before adding Phase 2 artifacts. [Baseline](preservation-baseline.json); [final validation](validation.json).

## Checks

| Check | Command/evidence | Result |
|---|---|---|
| TypeScript | `node node_modules/typescript/bin/tsc --noEmit` |Pass, exit0; no runtime TS changes |
| Changed-file ESLint | `node node_modules/eslint/bin/eslint.js scripts/build-soft-copper-specification.cjs --no-cache` |Pass,0 errors/0 warnings |
| Artifact generation | `node scripts/build-soft-copper-specification.cjs --generate` |60 exact token records, light/dark values, provenance/replacements/consumers; state bindings,126 contrast measurements, original20-issue traceability and HTML |
| Contract checks | `node scripts/build-soft-copper-specification.cjs --verify` |Exact primary pair, valid HEX, alias identity,118 required contrast pairs, all20 original rows/IDs/priorities/evidence preserved |
| Specimen browser checks | `node scripts/build-soft-copper-specification.cjs --review` |8 cases: dark/light320/390/430/1440; selection updates; visible buttons>=48; no horizontal document overflow or page errors |
| Current/proposed evidence | `comparison-{dark,light}.png`, `fields-{dark,light}.png` |Fresh HTML screenshots; complete rendered specimen PNGs retained |
| Local links | verifier checks new specification/plan/traceability and review HTML/Markdown |All local targets resolve; query links checked against their file target |
| Preservation/asset integrity | baseline SHA256 for all pre-existing files, including assets and Phase1 evidence/scripts |No changes; original Home art/textures, fonts, icon placeholders and config retained |
| Whitespace | `git diff --check` plus trailing-whitespace check for newly added text |Pass |

Browser tooling is the existing local Playwright/Chromium installation, configurable through `AXIS_PLAYWRIGHT_PATH` and `AXIS_CHROMIUM_PATH`. No dependency installation or network asset fetch is required for generation/review. Fonts are embedded from the existing local Manrope/Lora files. The desktop “current” examples use actual source-derived tokens; dimensions are normalized for comparison, and legacy text uses system-font styling. They do not claim to be running React Native components.

The HTML native select is an illustrative field specimen; native-tab treatment is color keys only. These images do not establish native pickers, tab materials, screen reader focus, software keyboard behavior, OS Dynamic Type, platform touch regions or hardware performance. No native acceptance or physical testing was performed.

## Support-code scope

One new isolated builder: `scripts/build-soft-copper-specification.cjs`. It reads Phase1 proposals/register and existing font files; writes only:

- `docs/design-system/soft-copper/` token register/JSON, contrast JSON, traceability JSON, HTML, screenshots and validation outputs.
- `docs/design-system/soft-copper-traceability.md`, generated from the exact original register rows with additive resolution metadata.

Manually authored new documents: `soft-copper-specification.md`, `soft-copper-migration-plan.md`, review `soft-copper/index.html` and this validation file. No Phase1 source or evidence file was overwritten. Subsequent regenerations only refresh Phase2 outputs.

No application suites/platform exports were needed for this specification-only change; implementation batch tests and native/export gates are explicitly specified in the migration plan. No schema/migration/persistence/config/API/dependency/financial/nav change was made. TypeScript and support-script lint/checks above were run as required.

## Brand asset audit

The repo's generic PNG and Android icon assets are Expo placeholders; `assets/expo.icon` contains an Expo-A SVG/grid/blue-gradient configuration. No selected four-point-star/copper-ring master or verified transparent export is present. Source evidence was inspected visually and in the SVG/config. No emblem was generated, traced, edited or placed. Actual artwork is a gate for batch3E, not a blocker for the specification.

## Git state

Initial: `main`, HEAD`16ebeab`, no tracked diff, Phase1 untracked additions present. Final: no tracked diff; all initial files unchanged. Added in Phase2:

```text
docs/design-system/soft-copper-specification.md
docs/design-system/soft-copper-migration-plan.md
docs/design-system/soft-copper-traceability.md
docs/design-system/soft-copper/
scripts/build-soft-copper-specification.cjs
```

The broad `git status --short` still groups all design docs under `?? docs/design-system/`; it also lists the four untouched Phase1 scripts and the one new Phase2 builder. Nothing staged, committed or pushed. Runtime app code is untouched.
