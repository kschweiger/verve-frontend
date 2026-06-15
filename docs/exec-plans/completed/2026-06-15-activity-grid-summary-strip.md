# Activity Grid Summary Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Update the dashboard overview strip to use the new activity-grid `summary` fields from the backend and replace weak frontend-derived metrics with recency and consistency metrics.

**Architecture:** Keep `/statistics/activity-grid` as the single dashboard activity overview source. The backend owns aggregate semantics through `totals` and `summary`; the frontend owns TypeScript shape definitions, display formatting, icons, labels, and layout. Add small pure formatting helpers in `src/utils/activityGrid.ts` so date/streak rendering is deterministic and unit-tested.

**Tech Stack:** Vue 3 Composition API with `<script setup lang="ts">`, Pinia, TypeScript, Tailwind CSS v4, Lucide icons, Bun tests.

---

## Current Context

The current backend OpenAPI schema defines `ActivityGridResponse.summary`:

```ts
interface GridSummary {
  last_active_day: string | null;
  week_activity_streak: number;
  activities_this_month: number;
}
```

Current frontend gaps:

- `src/stores/statistics.ts` defines `ActivityGridResponse` without `summary`.
- `src/components/dashboard/DashboardOverviewStrip.vue` renders only `totals`.
- The strip currently imports stale `Gauge` / `formatAverageDuration` symbols if the average-duration metric has been removed locally.
- Existing utility tests cover grid duration, intensity, month labels, and hover details, but not summary display formatting.

Product decision:

- The strip should become a four-card dashboard summary:
  - `Active time` from `totals.duration_seconds`
  - `This month` from `summary.activities_this_month`
  - `Last active` from `summary.last_active_day`
  - `Week streak` from `summary.week_activity_streak`
- Do not reintroduce average duration per active day.
- Do not calculate summary semantics from `weeks` in the frontend.
- If the backend returns `last_active_day: null`, show a calm empty value such as `No activity`.

Human validation stop point:

- After the strip update, stop and ask for browser validation against representative data before treating the dashboard direction as final.
- Representative data should include a recent activity, a non-zero streak, and enough activities in the current month to make all four cards meaningful.

## Files

- Modify `src/stores/statistics.ts`
  - Add `GridSummary`.
  - Add `summary: GridSummary` to `ActivityGridResponse`.

- Modify `src/utils/activityGrid.ts`
  - Add `formatLastActiveDay(lastActiveDay, today)`.
  - Add `formatWeekActivityStreak(streak)`.

- Modify `tests/utils/activityGrid.test.ts`
  - Add deterministic tests for last-active formatting.
  - Add singular/plural tests for week-streak formatting.
  - Remove `formatAverageDuration` tests if the helper is no longer used anywhere and is removed.

- Modify `src/components/dashboard/DashboardOverviewStrip.vue`
  - Read both `totals` and `summary`.
  - Render four metrics.
  - Use `grid-cols-2 lg:grid-cols-4`.
  - Remove stale imports.

## Acceptance Checks

Run before handoff:

```bash
bun test tests/utils/activityGrid.test.ts
bun run type-check
bun run check
bun run diff:distribution
```

Expected:

- Utility tests pass.
- Type-check passes with the new `summary` response type.
- Full repo check passes.
- Diff distribution is limited to:
  - `src/stores/statistics.ts`
  - `src/utils/activityGrid.ts`
  - `tests/utils/activityGrid.test.ts`
  - `src/components/dashboard/DashboardOverviewStrip.vue`
  - this plan and active README

Browser acceptance:

- The strip displays four cards on desktop and two-by-two on smaller widths.
- Labels are exactly `Active time`, `This month`, `Last active`, `Week streak`.
- `Last active` is readable for today/yesterday/recent dates and does not show raw backend null.
- `Week streak` uses singular/plural correctly.
- No card text wraps awkwardly or overflows.

---

### Task 1: Update Activity Grid Response Types

**Files:**
- Modify: `src/stores/statistics.ts`

- [x] **Step 1: Add `GridSummary` interface**

In `src/stores/statistics.ts`, add this interface after `GridTotals`:

```ts
export interface GridSummary {
  last_active_day: string | null;
  week_activity_streak: number;
  activities_this_month: number;
}
```

- [x] **Step 2: Add `summary` to `ActivityGridResponse`**

Change `ActivityGridResponse` to:

```ts
export interface ActivityGridResponse {
  weeks: GridWeek[];
  scale_max: GridMax;
  totals: GridTotals;
  summary: GridSummary;
}
```

- [x] **Step 3: Run type-check**

Run:

```bash
bun run type-check
```

Expected: PASS, because existing consumers can ignore the additional required field until the strip is updated.

- [x] **Step 4: Commit**

```bash
git add src/stores/statistics.ts
git commit -m "feat: type activity grid summary"
```

---

### Task 2: Add Summary Display Formatters

**Files:**
- Modify: `src/utils/activityGrid.ts`
- Modify: `tests/utils/activityGrid.test.ts`

- [x] **Step 1: Add failing formatter tests**

Update the import in `tests/utils/activityGrid.test.ts` to include:

```ts
  formatLastActiveDay,
  formatWeekActivityStreak,
```

Add these tests inside `describe('activity grid helpers', () => { ... })`:

```ts
  test('formats last active day relative to a pinned date', () => {
    const today = new Date(2026, 5, 15);

    expect(formatLastActiveDay('2026-06-15', today)).toBe('Today');
    expect(formatLastActiveDay('2026-06-14', today)).toBe('Yesterday');
    expect(formatLastActiveDay('2026-06-12', today)).toBe('3 days ago');
    expect(formatLastActiveDay(null, today)).toBe('No activity');
  });

  test('formats older last active days as compact dates', () => {
    const today = new Date(2026, 5, 15);

    expect(formatLastActiveDay('2026-05-01', today)).toBe('May 1');
  });

  test('formats week activity streaks', () => {
    expect(formatWeekActivityStreak(0)).toBe('0 weeks');
    expect(formatWeekActivityStreak(1)).toBe('1 week');
    expect(formatWeekActivityStreak(4)).toBe('4 weeks');
  });
```

- [x] **Step 2: Run tests and verify failure**

Run:

```bash
bun test tests/utils/activityGrid.test.ts
```

Expected: FAIL because `formatLastActiveDay` and `formatWeekActivityStreak` are not exported yet.

- [x] **Step 3: Implement date and streak formatters**

In `src/utils/activityGrid.ts`, add these constants after the month labels:

```ts
const MS_PER_DAY = 24 * 60 * 60 * 1000;
```

Add these helpers after `formatActivityGridCellDetails`:

```ts
function isoDateToUtcDay(value: string): number | null {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

function dateToUtcDay(value: Date): number {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / MS_PER_DAY;
}

export function formatLastActiveDay(lastActiveDay: string | null, today = new Date()): string {
  if (lastActiveDay === null) return 'No activity';

  const activeDay = isoDateToUtcDay(lastActiveDay);
  if (activeDay === null) return lastActiveDay;

  const dayDiff = dateToUtcDay(today) - activeDay;
  if (dayDiff === 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff > 1 && dayDiff < 30) return `${dayDiff} days ago`;

  const [year, month, day] = lastActiveDay.split('-').map(Number);
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: year === today.getFullYear() ? undefined : 'numeric',
  }).format(new Date(year, month - 1, day));
}

export function formatWeekActivityStreak(streak: number): string {
  return `${streak} ${streak === 1 ? 'week' : 'weeks'}`;
}
```

- [x] **Step 4: Run tests and verify pass**

Run:

```bash
bun test tests/utils/activityGrid.test.ts
```

Expected: PASS.

- [x] **Step 5: Remove unused average-duration helper if applicable**

If `formatAverageDuration` is no longer imported anywhere, remove it from `src/utils/activityGrid.ts` and remove its test from `tests/utils/activityGrid.test.ts`.

Verify with:

```bash
rg -n "formatAverageDuration" src tests
```

Expected after removal: no matches.

- [x] **Step 6: Run type-check**

Run:

```bash
bun run type-check
```

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add src/utils/activityGrid.ts tests/utils/activityGrid.test.ts
git commit -m "feat: format activity grid summary metrics"
```

---

### Task 3: Render The New Overview Strip

**Files:**
- Modify: `src/components/dashboard/DashboardOverviewStrip.vue`

- [x] **Step 1: Update imports**

Replace the imports at the top of `src/components/dashboard/DashboardOverviewStrip.vue` with:

```ts
import { computed } from 'vue';
import { Activity, CalendarDays, Clock, Flame } from 'lucide-vue-next';
import { useStatisticsStore } from '@/stores/statistics';
import {
  formatActivityGridDuration,
  formatLastActiveDay,
  formatWeekActivityStreak,
} from '@/utils/activityGrid';
```

- [x] **Step 2: Read `summary` as well as `totals`**

Replace:

```ts
const totals = computed(() => statisticsStore.activityGrid?.totals ?? null);
```

with:

```ts
const totals = computed(() => statisticsStore.activityGrid?.totals ?? null);
const summary = computed(() => statisticsStore.activityGrid?.summary ?? null);
```

- [x] **Step 3: Replace strip items**

Replace the full `items` computed with:

```ts
const items = computed(() => {
  if (!totals.value || !summary.value) return [];

  return [
    {
      label: 'Active time',
      value: formatActivityGridDuration(totals.value.duration_seconds),
      icon: Clock,
    },
    {
      label: 'This month',
      value: summary.value.activities_this_month.toString(),
      icon: CalendarDays,
    },
    {
      label: 'Last active',
      value: formatLastActiveDay(summary.value.last_active_day),
      icon: Activity,
    },
    {
      label: 'Week streak',
      value: formatWeekActivityStreak(summary.value.week_activity_streak),
      icon: Flame,
    },
  ];
});
```

- [x] **Step 4: Update responsive grid columns**

Change:

```vue
<section class="grid grid-cols-2 gap-3 lg:grid-cols-3">
```

to:

```vue
<section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
```

- [x] **Step 5: Run type-check**

Run:

```bash
bun run type-check
```

Expected: PASS.

If `Flame` is not exported by the installed `lucide-vue-next` version, use `Activity` for `Week streak` and keep `CalendarDays` for `This month`.

- [x] **Step 6: Commit**

```bash
git add src/components/dashboard/DashboardOverviewStrip.vue
git commit -m "feat: show activity summary strip metrics"
```

---

### Task 4: Human Browser Validation

**Files:**
- Modify only `src/components/dashboard/DashboardOverviewStrip.vue` if visual QA reveals overflow or awkward layout.

- [x] **Step 1: Start dev server**

Run:

```bash
bun run dev
```

Expected: Vite starts and prints a localhost URL.

- [x] **Step 2: Open dashboard with representative data**

Use an authenticated browser session and open the dashboard.

Expected:

- Four overview cards are visible below the activity grid.
- Card labels are scan-friendly.
- Values match the backend summary for the logged-in user.
- `Last active` reads naturally.
- `Week streak` is understandable without extra helper text.

- [x] **Step 3: Human validation stop**

Ask the human to validate:

- whether `This month` is more useful than total `Activities`,
- whether `Week streak` should stay as `0 weeks` when the current week has no activity,
- whether `Last active` should remain relative or show exact dates.

Do not continue to final validation until the human accepts the strip or requests a specific label/layout adjustment.

- [x] **Step 4: Apply scoped polish if requested**

If the human requests label or spacing changes, keep edits limited to `DashboardOverviewStrip.vue` unless formatter wording changes require `src/utils/activityGrid.ts`.

- [x] **Step 5: Stop dev server**

Stop the Vite process before handoff.

---

### Task 5: Final Validation

**Files:**
- No intentional code changes.

- [x] **Step 1: Run utility tests**

Run:

```bash
bun test tests/utils/activityGrid.test.ts
```

Expected: PASS.

- [x] **Step 2: Run type-check**

Run:

```bash
bun run type-check
```

Expected: PASS.

- [x] **Step 3: Run full repo check**

Run:

```bash
bun run check
```

Expected: PASS.

- [x] **Step 4: Run diff distribution**

Run:

```bash
bun run diff:distribution
```

Expected: Report shows changes concentrated in:

- `src/stores/statistics.ts`
- `src/utils/activityGrid.ts`
- `tests/utils/activityGrid.test.ts`
- `src/components/dashboard/DashboardOverviewStrip.vue`
- `docs/exec-plans/completed/2026-06-15-activity-grid-summary-strip.md`
- `docs/exec-plans/active/README.md`
- `docs/exec-plans/completed/README.md`

---

## Completion

- Implemented in commits `32524fc` and `3e164d3`.
- Human browser review completed on 2026-06-15; accepted as looking good.
- Final validation passed:
  - `bun test tests/utils/activityGrid.test.ts`
  - `bun run type-check`
  - `bun run check`
  - `bun run diff:distribution`

---

## Self-Review

- Spec coverage: The plan covers the new OpenAPI `summary` fields, frontend response typing, formatting, strip rendering, browser validation, and final checks.
- Placeholder scan: No task depends on undefined future work or unspecified test behavior.
- Type consistency: The plan uses backend field names exactly: `last_active_day`, `week_activity_streak`, and `activities_this_month`.
- Scope check: This plan only updates the dashboard overview strip. It does not change the activity grid matrix, backend endpoints, goals, records, or recent activities.
