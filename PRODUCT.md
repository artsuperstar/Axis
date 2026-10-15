# Axis — Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Axis is for **personal use first, with a public release intended later**. This audience direction was explicitly confirmed by the owner during Impeccable init on 14 October 2026.

The initial user organizes their own daily responsibilities, money, work, exercise and writing. Product decisions should first serve those real workflows. A broader public audience is intended, but its detailed personas, distribution plan and release timing have not been confirmed.

## Product Purpose

Axis brings personal organization into one native application: Tasks, Calendar, Finance, Fitness and Journal, connected through Home and source-owned views.

The user should be able to understand what matters today, act on it, and retain trustworthy records of what happened. Planning, actual outcomes and personal reflection remain distinct even when shown together.

## Operating Context

- The current application targets native iOS and Android through React Native, TypeScript, Expo SDK 57 and Expo Router. Platform-native navigation, pickers, Back behavior, safe areas and keyboard interactions matter on both operating systems.
- The owner develops and evaluates Axis through staged implementation and physical-device feedback, including iPhone testing through Expo Go. Expo Go is a development tool, not an Axis account or product feature.
- Current data is stored on-device with Expo SQLite and Drizzle ORM. Axis currently has no account or cloud synchronization. Permanent offline-only operation and future synchronization are **undecided**, not promises inferred from this implementation.
- Dates and schedules follow the device's local calendar. Financial entry uses BRL and exact integer centavos. Fitness uses its existing metric measurement models.
- Home, Tasks, Calendar, Finance and Fitness are the five primary tabs. Journal is a secondary destination reached through Home. Preserve source-owned routes and editing flows unless a separate product change authorizes otherwise.

## Capabilities and Constraints

### Current capabilities

- **Tasks:** one-time and recurring tasks; dates/times, priorities and independent Task categories; occurrence outcomes, schedule management and History.
- **Calendar:** bounded date-range projections of dated Tasks and financial obligations, with navigation to their owning features.
- **Finance:** actual income/expense transactions, period dashboards, historical categories, Bills/Subscriptions/Installments, and Work earned/received/outstanding with payment reconciliation.
- **Fitness:** exercise definitions, routines, workout rotation planning, one active workout, measurement-specific set logging, notes and completed-workout History.
- **Journal:** one saved entry per local day, optional mood, persisted recovery drafts, saved History and source-derived daily context. Recovery drafts are distinct from explicitly saved entries.
- **Home:** a compact integration of source-owned daily actions, attention items, spending, workout state/planning and Journal access.

### Durable constraints

- Existing Axis functionality and Stage 13 architecture are authoritative for behavior, data, navigation and information architecture. A visual reference never authorizes invented controls, destinations, metrics or domain behavior.
- Source features own their business rules. Home, Calendar and Journal context project those facts rather than maintain competing copies or duplicate domain computations.
- Preserve the distinction between planned financial obligations, work earned and actual money received/paid. Reconciliation must remain exact; an old unresolved obligation must not disappear because of a display window.
- Preserve historical meaning, references, occurrence outcomes and snapshots. Task and Finance category semantics remain independent; historical Finance labels must survive archival.
- Local dates, recurrence boundaries, pause/resume behavior, completion outcomes and measurement types must not change incidentally during presentation work.
- Refresh failures must preserve last known good data and mounted editors. Unsaved writing and captured form drafts must not be erased by unrelated reads or navigation failures.
- Use bounded projections, genuine History paging and existing virtualization. Do not improve apparent performance by silently omitting authoritative data.
- Visual work must remain scoped. Database, migration, dependency and business-rule changes require their own justification and task authorization.

## Brand Commitments

The product name is **Axis**. The owner has approved **Warm Editorial Hearth** as its design identity: personal, supportive, organized, warm and practical, with the emotional target “This is where I keep my life together.” Avoid gamification, decorative imagery dependent on user content, and dashboard conventions that invent product facts.

Visual rules and their implementation belong in the existing [Design System v2 Visual Groundwork](docs/design-system-v2-visual-groundwork.md) and [Stage 14D / 14D.1 record](docs/design-system-v2-stage-14d.md), not in this product record. The supplied mockups and the latest scoped correction briefs have the authority specified in those records. Do not reopen the approved direction or interpret missing `DESIGN.md` as a new project.

Design System v2 migration is incremental. Tasks main and Fitness active Workout have been migrated; this does not authorize a global restyle of other features or editors.

## Evidence on Hand

- [README](README.md): feature behavior, development setup and validation procedures. Current source remains authoritative where older stage descriptions have been superseded.
- `src/features/`, `src/database/` and `src/app/`: implemented domain rules, local persistence, routes and screen composition.
- `tests/`: data, integrity, lifecycle, reconciliation, component, accessibility and performance regressions.
- `docs/`: staged architecture and UX decisions, the pre-design audits, historical prototype records and the approved visual groundwork.
- `docs/previews/` and [Tasks fidelity comparison](docs/tasks-visual-fidelity-review.html): component-rendered visual evidence with documented provenance and limitations.
- The conversation contains the owner's target mockup, iPhone screenshots and physical-device feedback. A conversation image is not necessarily available as a repository asset.

Static RN Web captures, automated tests and platform exports do not prove physical-device interaction, font rendering, gesture behavior or performance. Record the actual evidence used; do not fabricate device verification, users, testimonials, market claims or public-release readiness.

## Product Principles

1. **Protect personal records and working state.** Preserve history, exact outcomes and unsaved work through normal use and recoverable failures.
2. **Make daily action understandable.** Help the user identify and resolve the next relevant action without hiding outstanding responsibilities or meaningful history.
3. **Keep one authoritative source for each fact.** Integrate features through source-owned projections and navigation.
4. **Respect native mobile use.** Keep familiar platform interactions, accessible controls and responsive layouts while maintaining Axis's approved identity.
5. **Improve deliberately within scope.** Use real workflows and evidence; preserve useful density and established semantics as the application evolves.

## Accessibility & Inclusion

- Support iOS VoiceOver and Android TalkBack with clear labels, roles, selected/expanded/checked states and understandable action subjects.
- Keep controls touch-friendly: at least the applicable platform minimum, with 48-unit targets preferred for shared controls.
- Respect accessibility font scaling and natural wrapping. Important titles, metadata and financial values must remain understandable with long content and larger text.
- Verify text contrast, meaningful control boundaries and non-color state communication in light and dark modes.
- Honor live Reduced Motion settings and preserve usability without animation.
- Preserve safe areas, keyboard access, focus restoration and expected platform Back/navigation behavior.
- Handle Portuguese accents and canonically equivalent Unicode names correctly. Search normalization and persistent identity comparison have distinct, established domain rules.

## Open Product Decisions

- Public-release timing, detailed public personas, distribution, monetization and support commitments.
- Future accounts, cloud synchronization, backup/export and related data-ownership policies. None is promised by the current offline implementation.
- Broader localization, additional currencies/units, tablet-specific product scope and any accessibility certification target.
- Competitive positioning and measurable public product claims; no market differentiation claim has been established.

These are intentionally open decisions. Do not infer their answers from the current code, the personal-use phase, or the visual mockups.
