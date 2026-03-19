# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # Start development server on http://localhost:3000
pnpm build      # Production build
pnpm lint       # Run ESLint
```

No test suite is configured.

## Architecture

**あげた (Ageta)** is a Japanese-language offline-first PWA for logging gym workouts. Built with Next.js App Router, React 19, TypeScript, and Tailwind CSS v4. All data lives in the browser via IndexedDB — there is no backend.

### Data layer (`src/data/`)

- **`db.ts`** — Raw IndexedDB access. Opens/upgrades the `ageta-db` database (version 4) and seeds ~56 exercises on first install. Exports `withStore()`, a helper that wraps any IDB operation in a transaction.
- **`repository.ts`** — `WorkoutRepository` interface defining the data contract.
- **`localRepository.ts`** — `LocalWorkoutRepository` implements the interface using `withStore()`. All methods assert `typeof window !== "undefined"` since IDB is browser-only.

### Domain layer (`src/domain/`)

- **`models.ts`** — Core types: `Exercise`, `Workout`, `SetEntry`.
- **`pr.ts`** — Pure functions for computing per-exercise PRs (max weight, best reps, estimated 1RM using the formula `weight × (1 + reps / 30)`).

### Pages (`app/`)

All pages are `"use client"` components. Each creates a `LocalWorkoutRepository` via `useMemo` on mount.

- **`/` (`app/page.tsx`)** — Today's workout: body-part tab picker → exercise grid → weight/rep inputs → set list with inline editing. Creates a `Workout` record lazily on first set added.
- **`/history` (`app/history/page.tsx`)** — Past workouts grouped by date, expandable to show individual sets.
- **`/pr` (`app/pr/page.tsx`)** — Per-exercise personal records using `computeExercisePrs`.

Navigation is a fixed bottom bar (`src/components/BottomNav.tsx`).

### Path alias

`@/*` maps to `src/*` (configured in `tsconfig.json`). Use `@/data/...`, `@/domain/...`, `@/lib/...`, `@/components/...`.

### Localisation

The UI is entirely in Japanese. Exercise names are stored in English in IndexedDB and translated for display via `EXERCISE_NAME_JA` in `src/lib/exerciseNames.ts`. When adding new exercises to the seed data in `db.ts`, also add the Japanese name to that map.

### PWA

The web app manifest (`public/manifest.json`) enables standalone install. There is no service worker currently — offline storage is purely IndexedDB.

### Weight logging rules

- All logged weights are **両手合計** (total for both hands). This applies to dumbbell exercises too: if each dumbbell weighs 30 kg, log 60 kg.
- **Step derivation** (`src/lib/weightStep.ts`): exercises whose name contains `DB`, `Dumbbell`, or `ダンベル` (case-insensitive) get a default step of 2 kg (1 kg per hand). All others default to 2.5 kg. The user can override the step at any time via the step toggle (options: 1, 2, 2.5 kg); the override is stored per exercise in `stepOverrides` state and survives tab switches within the session.
- The helper text "※重量は両手合計（ダンベルも合計）で記録" is shown below WeightInput as a subtle reminder.

### WeightInput component (`src/components/WeightInput.tsx`)

A controlled numeric input with ±step buttons and quick-apply weight chips.

**State design** — uses two pieces of state to avoid needing refs during render (required by `react-hooks/refs` lint rule from `eslint-config-next`):
- `draft: string` — the raw text displayed in the input, allowing partial entries like `""`, `"."`, `"7."`.
- `committedValue: number` — the last value emitted via `onChange`. When the parent's `value` prop diverges from `committedValue` (chip click, adjust button, external reset), a render-phase `if` block syncs `draft` to the new value. This is React's documented "adjusting state based on props" pattern and avoids `useEffect` for state sync.

**Key behaviors:**
- Typing `","` normalises to `"."` (European/mobile keyboard support).
- `onChange` is only called when the current text parses to a finite number.
- On blur or Enter: clamps to `[0, 500]` and canonicalises the display; reverts to last valid value if the text is unparseable.
- Adjust buttons (`−step` / `+step`) do NOT update `committedValue`, so the external sync fires on next render and overwrites any partial draft — this is intentional and correctly handles iOS where blur may not fire before a touch handler.
- Chip `key` is `chip.id` (never `chip.label`). Chips carry an optional `onSelect` callback used when clicking a chip should also set reps (prev chip).

### Styling

Tailwind CSS v4 (PostCSS plugin via `@tailwindcss/postcss`). Dark mode uses the `dark:` variant. The layout is constrained to `max-w-md` and centred. Main content has `pb-24` to clear the fixed bottom nav.
