# Dashboard Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the dashboard around a last-52-weeks activity grid, compact overview metrics, recent activities, goals, curated records, and an always-reachable add activity action.

**Architecture:** The backend owns the activity-grid aggregation through `GET /api/v1/statistics/activity-grid`; the frontend only fetches, parses, scales, and renders it. Dashboard composition moves from a loose widget grid to a focused activity home: activity history, overview totals, recent activities, goals, and records, with upload/manual creation hidden behind a header action.

**Tech Stack:** Vue 3 Composition API with `<script setup lang="ts">`, Pinia, TypeScript strict intent, Tailwind CSS v4 utilities, Lucide icons, Bun tests, `vue-tsc`, Vite.

---

## Current Implementation Status

Updated: 2026-06-15

Status: complete. Implementation is complete in commit `2663692 implement plan`. Code review on 2026-06-15 found no blocking static/type issues. Automated validation passed, and final human review accepted the dashboard direction on 2026-06-15.

Completed implementation:

- `src/stores/statistics.ts`
  - Added activity-grid response types and `fetchActivityGrid(52)` support.
- `src/utils/activityGrid.ts`
  - Added pure helpers for intensity, weekday labels, month labels, compact duration formatting, and active-day average formatting.
- `tests/utils/activityGrid.test.ts`
  - Added Bun unit tests for the activity-grid helpers.
- `src/components/widgets/ActivityGridWidget.vue`
  - Added the dashboard activity history grid.
  - Uses duration-based intensity and Monday-Sunday rows.
  - Uses flexible week columns so the grid fills the card without month-label gaps.
  - Month labels are absolutely positioned so they do not change week-column width.
  - Removed the duplicate active-days header text because the overview strip already shows it.
- `src/components/dashboard/DashboardOverviewStrip.vue`
  - Added compact totals for active time, activities, active days, and average active day.
- `src/components/dashboard/AddActivityPanel.vue`
  - Added header `Add` action and side panel.
  - Raised overlay above the navbar after QA showed the navbar covered the close button.
- `src/components/widgets/UploadActivityWidget.vue`
  - Added `embedded` prop.
  - Added missing `HelpCircle` import.
- `src/components/widgets/LastActivitiesWidget.vue`
  - Made Recent Activities the primary dashboard navigation widget.
  - Switched to duration-first metric display with distance as secondary.
- `src/components/widgets/HighlightsWidget.vue`
  - Replaced metric/scope/year controls with curated records.
  - Removed `h-full` after QA showed the card overflowed its grid row and visually collided with the footer.
- `src/components/widgets/GoalsWidget.vue`
  - Removed `h-full` after QA showed vertically stacked right-column widgets overflowed their grid row.
- `src/views/DashboardView.vue`
  - Replaced old dashboard widgets and placeholders with the new activity overview composition.
- `src/layouts/MainLayout.vue`
  - Removed sticky-footer flex behavior so the footer follows `main` in normal document flow.

Human validation notes:

- Activity grid direction accepted after iterations.
- Add panel interaction accepted after overlay z-index fix.
- Final human review accepted the implementation on 2026-06-15.
- Grid label spacing adjusted after QA:
  - weekday label rail widened,
  - month labels made non-sizing,
  - week columns made flexible.
- Footer/records overlap root cause identified as `h-full` on stacked right-column widgets, not footer positioning. The latest fix removes those `h-full` constraints.

Code review notes from 2026-06-15:

- `src/views/DashboardView.vue` now matches the intended order: activity grid, overview strip, recent activities, goals, records, and header add action.
- `src/components/widgets/ActivityGridWidget.vue` uses the backend `activity-grid` contract directly and keeps scaling/rendering logic frontend-local. No backend aggregation logic is duplicated in the component.
- `src/components/dashboard/DashboardOverviewStrip.vue` correctly depends on the same `activityGrid.totals` payload as the matrix, keeping the top summary consistent with the grid.
- `src/components/dashboard/AddActivityPanel.vue` is a reasonable first implementation of the hidden upload/manual action. Human validation should specifically check keyboard expectations such as Escape-to-close and focus behavior; those are not currently implemented.
- `src/components/widgets/HighlightsWidget.vue` now uses curated records. It intentionally keeps duration, distance, and elevation as the first record set, but Gate C should verify that distance/elevation do not dominate mixed-activity users.
- `src/components/widgets/LastActivitiesWidget.vue` is duration-first with distance secondary, matching the dashboard's mixed-activity direction.
- `src/components/widgets/GoalsWidget.vue` remains on the dashboard and no longer forces `h-full`, which avoids right-column overflow with Records.
- `src/layouts/MainLayout.vue` no longer uses sticky-footer flex behavior, so dashboard content and footer follow normal document flow.

Latest verification run after code review:

```bash
bun test tests/utils/activityGrid.test.ts
bun run type-check
bun run check
bun run diff:distribution
```

Latest results:

- Activity-grid helper tests passed: 6 tests, 15 assertions.
- `bun run type-check` passed.
- `bun run check` passed, including harness docs, links, OpenAPI summary freshness, agent rules, ESLint baseline, type check, and production build.
- `bun run diff:distribution` shows no source/test/doc diff and only pre-existing unrelated untracked files: `diff.txt`, `main_logo.svg`, `small_logo.png`.

Previous verification run after the most recent footer/records fix:

```bash
bun run type-check
```

Result: PASS (`vue-tsc --build` completed).

Earlier validation during this implementation:

```bash
bun test tests/utils/activityGrid.test.ts
bun run type-check
bun run check
bun run diff:distribution
```

Earlier results:

- Activity-grid helper tests passed.
- Type check passed.
- Full `bun run check` passed before later visual QA layout fixes.
- Diff distribution was concentrated in planned dashboard/source/test files plus pre-existing unrelated untracked files: `diff.txt`, `main_logo.svg`, `small_logo.png`.

Completion notes:

- Human review accepted the final dashboard direction.
- Keep Add panel Escape-to-close/focus trapping as a possible accessibility follow-up, not a blocker for this plan.
- Keep configurable/alternative curated record metrics as a possible future product follow-up, not a blocker for this plan.

---

## File Structure

- Modify `src/stores/statistics.ts`
  - Add `ActivityGridResponse`, `GridWeek`, `GridDay`, `GridMax`, and `GridTotals` frontend types.
  - Add `activityGrid`, `isActivityGridLoading`, `activityGridError`, and `fetchActivityGrid(weeks?: number)`.
  - Keep existing yearly/calendar behavior intact for other views.

- Create `src/utils/activityGrid.ts`
  - Pure helpers for grid intensity, week day labels, future-day detection by `null`, month labels, and compact total formatting.
  - Unit-tested with `bun:test`.

- Create `tests/utils/activityGrid.test.ts`
  - Verify scaling, zero-max handling, week order assumptions, month label formatting, and duration formatting.

- Create `src/components/widgets/ActivityGridWidget.vue`
  - Main GitHub-style activity matrix for the dashboard.
  - Uses `statisticsStore.fetchActivityGrid(52)`.
  - Renders month labels from `GridWeek.month`.
  - Renders seven rows Monday-Sunday.
  - Uses `duration_seconds` for color intensity.
  - Treats `null` days as future/trailing cells.

- Create `src/components/dashboard/DashboardOverviewStrip.vue`
  - Compact totals row sourced from `statisticsStore.activityGrid.totals`.
  - Shows time, activities, active days, and average time per active day.

- Create `src/components/dashboard/AddActivityPanel.vue`
  - Header `+ Add` action.
  - Opens an overlay/panel containing upload and manual activity entry.
  - Reuses existing `UploadActivityWidget` behavior instead of duplicating upload logic.

- Modify `src/components/widgets/UploadActivityWidget.vue`
  - Add an optional `embedded` prop so the upload form can render inside the panel without an extra dashboard card shell.
  - Import the missing `HelpCircle` icon that the current template references.

- Modify `src/components/widgets/LastActivitiesWidget.vue`
  - Make it suitable as a primary dashboard section.
  - Keep fetch behavior via `activityStore.fetchRecentActivities()`.
  - Improve activity metric display so duration is always useful and distance is secondary.

- Modify `src/components/widgets/HighlightsWidget.vue`
  - Replace the confusing metric/scope/year control grid on the dashboard with curated records.
  - Use existing highlight APIs and fetch a small fixed set: longest duration, longest distance, most elevation where available.
  - Keep the implementation bounded to the dashboard widget; do not add backend preference storage.

- Modify `src/components/widgets/GoalsWidget.vue`
  - Remove fixed full-height behavior when used in the stacked dashboard right column.

- Modify `src/views/DashboardView.vue`
  - Remove `YearlyStatsWidget`, `WeeklyStatsWidget`, `CalendarWidget`, `UploadActivityWidget`, `QuickAddWidget`, placeholder cards, and inert `Add Widget`.
  - Add `AddActivityPanel`, `ActivityGridWidget`, `DashboardOverviewStrip`, `LastActivitiesWidget`, `GoalsWidget`, and `HighlightsWidget`.

- Modify `src/layouts/MainLayout.vue`
  - Keep the authenticated layout in normal document flow so `Footer` renders after all routed `main` content.

- No backend files are changed in this frontend plan.

## Success Check

Run this before handoff:

```bash
bun test tests/utils/activityGrid.test.ts
bun run type-check
bun run check
bun run diff:distribution
```

Expected:

- `bun test tests/utils/activityGrid.test.ts` passes.
- `bun run type-check` passes.
- `bun run check` passes or only fails on pre-existing unrelated issues that are documented in the handoff.
- `bun run diff:distribution` reports changes concentrated in dashboard widgets, statistics store, utility tests, and this plan.

## Human-In-The-Loop Validation Gates

This dashboard is a product-direction change, not just a code migration. Do not run every task straight through without human validation. Stop at the gates below and ask the human to inspect the dashboard against representative data before continuing.

Use a local backend/user dataset with these minimum characteristics before visual validation:

- At least 40 activities across the last 52 weeks.
- At least 3 different activity types.
- At least 1 distance-based activity type, such as running, cycling, hiking, or swimming.
- At least 1 non-distance or distance-optional type, such as strength, yoga, indoor cardio, or manual activity.
- At least 1 active current goal visible in `GoalsWidget`.
- At least 1 available highlight for duration; distance and elevation highlights are useful but not mandatory.
- At least 1 week with no activities and at least 1 week with multiple activities.
- Current week includes future trailing days, so the `null` day behavior is visible.

If the local dataset does not meet these checks, pause before product validation and ask the human whether to use their real local data, import sample activities, or limit the review to layout mechanics only.

Required stop points:

1. **Gate A: Activity Grid + Overview** after Task 4.
   - Human validates whether the matrix communicates consistency better than the old yearly/weekly chart area.
   - Human checks that duration-based intensity feels right for mixed activity types.
   - Human checks that overview metrics are understandable without needing the old yearly table.
   - Continue only if the top-of-dashboard direction is accepted or the requested adjustments are applied.

2. **Gate B: Add Activity Panel** after Task 5.
   - Human validates that upload/manual entry is reachable without occupying dashboard content space.
   - Human checks desktop and mobile opening/closing behavior.
   - Continue only if the interaction model is accepted.

3. **Gate C: Main Content Widgets** after Task 7.
   - Human validates Recent Activities as the primary navigation widget.
   - Human validates that curated records are less confusing than the old dropdown-heavy personal records widget.
   - Human checks whether Goals still feels important enough in the planned right-column position.
   - Continue only after deciding whether Records, Goals, or Recent Activities need size/order changes.

4. **Gate D: Full Dashboard Reordering** after Task 8 and before responsive polish.
   - Human validates the complete order: Activity Grid, Overview Strip, Recent Activities, Goals, Records, Add action.
   - Human compares against the old dashboard and confirms removed widgets are not missed on the main page.
   - Continue only if the dashboard direction is still coherent with real data.

5. **Gate E: Final Visual QA** during Task 9.
   - Human validates desktop and mobile screenshots or the live browser.
   - Human confirms no widget feels empty, misleading, or visually over-weighted.

---

## Historical Task Checklist

The checklist below records the original implementation path. The dashboard code is already implemented in commit `2663692 implement plan`; remaining active work is tracked in `Current Implementation Status`, `Human-In-The-Loop Validation Gates`, and `Task 9` final browser review. Unchecked per-task commit steps below are historical and are superseded by the single implementation commit.

### Task 1: Add Activity Grid Types And Store Fetching

**Files:**
- Modify: `src/stores/statistics.ts`

- [x] **Step 1: Add activity-grid interfaces**

In `src/stores/statistics.ts`, after `CalendarResponse`, add:

```ts
export interface GridDay {
  date: string;
  activity_count: number;
  duration_seconds: number;
}

export interface GridWeek {
  start_date: string;
  month: number | null;
  days: Array<GridDay | null>;
}

export interface GridMax {
  activity_count: number;
  duration_seconds: number;
}

export interface GridTotals {
  activity_count: number;
  duration_seconds: number;
  active_days: number;
}

export interface ActivityGridResponse {
  weeks: GridWeek[];
  scale_max: GridMax;
  totals: GridTotals;
}
```

- [x] **Step 2: Add store state**

Inside `useStatisticsStore`, after `calendarData`, add:

```ts
  const activityGrid = ref<ActivityGridResponse | null>(null);
  const isActivityGridLoading = ref(false);
  const activityGridError = ref<string | null>(null);
```

- [x] **Step 3: Add `fetchActivityGrid`**

Inside `useStatisticsStore`, after `fetchCalendar`, add:

```ts
  async function fetchActivityGrid(weeks = 52) {
    isActivityGridLoading.value = true;
    activityGridError.value = null;

    if (!userStore.token) {
      activityGridError.value = 'Not authenticated';
      isActivityGridLoading.value = false;
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('weeks', weeks.toString());

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/statistics/activity-grid?${params.toString()}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${userStore.token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to load activity grid.');

      activityGrid.value = await response.json();
    } catch (e: unknown) {
      activityGridError.value = e instanceof Error ? e.message : String(e);
      activityGrid.value = null;
    } finally {
      isActivityGridLoading.value = false;
    }
  }
```

- [x] **Step 4: Return new state and action**

In the returned object from `useStatisticsStore`, add:

```ts
    activityGrid,
    isActivityGridLoading,
    activityGridError,
    fetchActivityGrid,
```

- [x] **Step 5: Run focused type check**

Run:

```bash
bun run type-check
```

Expected: `vue-tsc --build` completes without new errors from `src/stores/statistics.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/stores/statistics.ts
git commit -m "feat: add activity grid statistics store"
```

---

### Task 2: Add Activity Grid Utility Helpers With Tests

**Files:**
- Create: `src/utils/activityGrid.ts`
- Create: `tests/utils/activityGrid.test.ts`

- [x] **Step 1: Create failing tests**

Create `tests/utils/activityGrid.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import {
  formatActivityGridDuration,
  formatAverageDuration,
  getActivityGridIntensity,
  getWeekdayLabels,
  monthLabel,
} from '../../src/utils/activityGrid';

describe('activity grid helpers', () => {
  test('scales duration values against scale max', () => {
    expect(getActivityGridIntensity(0, 7200)).toBe(0);
    expect(getActivityGridIntensity(1800, 7200)).toBe(0.25);
    expect(getActivityGridIntensity(7200, 7200)).toBe(1);
    expect(getActivityGridIntensity(9000, 7200)).toBe(1);
  });

  test('returns zero intensity when scale max is zero', () => {
    expect(getActivityGridIntensity(3600, 0)).toBe(0);
  });

  test('formats compact durations', () => {
    expect(formatActivityGridDuration(0)).toBe('0m');
    expect(formatActivityGridDuration(1800)).toBe('30m');
    expect(formatActivityGridDuration(5400)).toBe('1h 30m');
    expect(formatActivityGridDuration(7200)).toBe('2h');
  });

  test('formats average duration per active day', () => {
    expect(formatAverageDuration(7200, 2)).toBe('1h/day');
    expect(formatAverageDuration(0, 0)).toBe('-');
  });

  test('returns Monday-first weekday labels', () => {
    expect(getWeekdayLabels()).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });

  test('formats numeric month labels', () => {
    expect(monthLabel(1)).toBe('Jan');
    expect(monthLabel(6)).toBe('Jun');
    expect(monthLabel(null)).toBe('');
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
bun test tests/utils/activityGrid.test.ts
```

Expected: FAIL because `src/utils/activityGrid.ts` does not exist.

- [x] **Step 3: Implement helpers**

Create `src/utils/activityGrid.ts`:

```ts
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function getActivityGridIntensity(value: number, scaleMax: number): number {
  if (scaleMax <= 0) return 0;
  return Math.min(Math.max(value / scaleMax, 0), 1);
}

export function getWeekdayLabels(): string[] {
  return [...WEEKDAY_LABELS];
}

export function monthLabel(month: number | null): string {
  if (month === null) return '';
  return MONTH_LABELS[month - 1] ?? '';
}

export function formatActivityGridDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0m';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatAverageDuration(totalSeconds: number, activeDays: number): string {
  if (activeDays <= 0) return '-';
  return `${formatActivityGridDuration(Math.round(totalSeconds / activeDays))}/day`;
}
```

- [x] **Step 4: Run tests and verify pass**

Run:

```bash
bun test tests/utils/activityGrid.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/activityGrid.ts tests/utils/activityGrid.test.ts
git commit -m "test: cover activity grid helpers"
```

---

### Task 3: Build The Activity Grid Widget

**Files:**
- Create: `src/components/widgets/ActivityGridWidget.vue`
- Modify: `src/stores/statistics.ts` only if Task 1 exposed a missing type during implementation

- [x] **Step 1: Create `ActivityGridWidget.vue`**

Create `src/components/widgets/ActivityGridWidget.vue`:

```vue
<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useStatisticsStore, type GridDay } from '@/stores/statistics';
import { useActivityStore } from '@/stores/activity';
import {
  formatActivityGridDuration,
  getActivityGridIntensity,
  getWeekdayLabels,
  monthLabel,
} from '@/utils/activityGrid';

const statisticsStore = useStatisticsStore();
const activityStore = useActivityStore();

const weekdayLabels = getWeekdayLabels();

const weeks = computed(() => statisticsStore.activityGrid?.weeks ?? []);
const scaleMax = computed(() => statisticsStore.activityGrid?.scale_max.duration_seconds ?? 0);

const loadGrid = () => {
  statisticsStore.fetchActivityGrid(52);
};

onMounted(loadGrid);
watch(() => activityStore.lastUpdate, loadGrid);

function cellClass(day: GridDay | null): string {
  if (day === null) return 'bg-verve-medium/20 border-verve-medium/20';

  const intensity = getActivityGridIntensity(day.duration_seconds, scaleMax.value);
  if (intensity === 0) return 'bg-verve-light border-verve-medium/30';
  if (intensity < 0.25) return 'bg-verve-neon/30 border-verve-neon/40';
  if (intensity < 0.5) return 'bg-verve-neon/55 border-verve-neon/60';
  if (intensity < 0.75) return 'bg-verve-orange/65 border-verve-orange/70';
  return 'bg-verve-orange border-verve-orange';
}

function cellTitle(day: GridDay | null): string {
  if (day === null) return 'Future day';

  const activityLabel = day.activity_count === 1 ? 'activity' : 'activities';
  return `${day.date}: ${day.activity_count} ${activityLabel}, ${formatActivityGridDuration(day.duration_seconds)}`;
}
</script>

<template>
  <section class="bg-white border border-verve-medium/30 rounded-xl shadow-sm p-5 sm:p-6">
    <div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-5">
      <div>
        <h2 class="text-xl font-bold text-verve-brown">Activity History</h2>
        <p class="text-sm text-verve-brown/60">Last 52 weeks by active time</p>
      </div>
      <p v-if="statisticsStore.activityGrid" class="text-sm font-medium text-verve-brown/60">
        {{ statisticsStore.activityGrid.totals.active_days }} active days
      </p>
    </div>

    <div v-if="statisticsStore.isActivityGridLoading" class="py-14 text-center text-sm text-verve-brown/60">
      <span class="animate-pulse">Loading activity history...</span>
    </div>

    <div
      v-else-if="statisticsStore.activityGridError"
      class="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
    >
      {{ statisticsStore.activityGridError }}
    </div>

    <div v-else-if="weeks.length > 0" class="overflow-x-auto pb-1">
      <div class="inline-grid grid-rows-[auto_repeat(7,minmax(0,1fr))] grid-flow-col gap-1 min-w-full">
        <div class="w-4"></div>
        <div
          v-for="label in weekdayLabels"
          :key="label"
          class="h-3 text-[10px] leading-none text-verve-brown/40"
        >
          {{ label }}
        </div>

        <template v-for="week in weeks" :key="week.start_date">
          <div class="h-3 text-[10px] leading-none text-verve-brown/45">
            {{ monthLabel(week.month) }}
          </div>
          <div
            v-for="(day, dayIndex) in week.days"
            :key="`${week.start_date}-${dayIndex}`"
            class="size-3 rounded-[3px] border"
            :class="cellClass(day)"
            :title="cellTitle(day)"
          ></div>
        </template>
      </div>
    </div>

    <div v-else class="py-14 text-center text-sm italic text-verve-brown/50">
      No activity history found.
    </div>
  </section>
</template>
```

- [x] **Step 2: Run type check**

Run:

```bash
bun run type-check
```

Expected: PASS. If it fails because Tailwind dynamic classes are not recognized by tooling, keep the static class branches as written; do not build class names dynamically.

- [ ] **Step 3: Commit**

```bash
git add src/components/widgets/ActivityGridWidget.vue
git commit -m "feat: add dashboard activity history grid"
```

---

### Task 4: Build The Dashboard Overview Strip

**Files:**
- Create: `src/components/dashboard/DashboardOverviewStrip.vue`

- [x] **Step 1: Create component**

Create `src/components/dashboard/DashboardOverviewStrip.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { Activity, CalendarDays, Clock, Gauge } from 'lucide-vue-next';
import { useStatisticsStore } from '@/stores/statistics';
import { formatActivityGridDuration, formatAverageDuration } from '@/utils/activityGrid';

const statisticsStore = useStatisticsStore();

const totals = computed(() => statisticsStore.activityGrid?.totals ?? null);

const items = computed(() => {
  if (!totals.value) return [];

  return [
    {
      label: 'Active time',
      value: formatActivityGridDuration(totals.value.duration_seconds),
      icon: Clock,
    },
    {
      label: 'Activities',
      value: totals.value.activity_count.toString(),
      icon: Activity,
    },
    {
      label: 'Active days',
      value: totals.value.active_days.toString(),
      icon: CalendarDays,
    },
    {
      label: 'Avg active day',
      value: formatAverageDuration(totals.value.duration_seconds, totals.value.active_days),
      icon: Gauge,
    },
  ];
});
</script>

<template>
  <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <div
      v-for="item in items"
      :key="item.label"
      class="bg-white border border-verve-medium/30 rounded-xl shadow-sm px-4 py-3"
    >
      <div class="flex items-center gap-2 text-verve-brown/50">
        <component :is="item.icon" class="size-4" aria-hidden="true" />
        <p class="text-xs font-bold uppercase tracking-wider">{{ item.label }}</p>
      </div>
      <p class="mt-2 text-2xl font-bold text-verve-brown">{{ item.value }}</p>
    </div>
  </section>
</template>
```

- [x] **Step 2: Run type check**

Run:

```bash
bun run type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardOverviewStrip.vue
git commit -m "feat: add dashboard overview strip"
```

- [x] **Step 4: STOP - Human validation Gate A**

Create a temporary, uncommitted preview of the new top section in `src/views/DashboardView.vue`. Add these imports:

```ts
import DashboardOverviewStrip from '@/components/dashboard/DashboardOverviewStrip.vue';
import ActivityGridWidget from '@/components/widgets/ActivityGridWidget.vue';
```

Then temporarily replace the top statistics grid in the current dashboard template:

```vue
<div class="grid grid-cols-1 gap-6">
  <YearlyStatsWidget />
  <WeeklyStatsWidget />
</div>
```

with:

```vue
<div class="space-y-6">
  <ActivityGridWidget />
  <DashboardOverviewStrip />
</div>
```

This preview edit is only for human validation. Do not commit the temporary `DashboardView.vue` edit in Task 4.

Run:

```bash
bun run dev
```

Expected: Vite starts and prints a local URL, usually `http://localhost:5173/`.

Ask the human to validate against the dataset checklist from `Human-In-The-Loop Validation Gates`:

- Does the matrix feel like a useful top-level activity overview?
- Does duration-based intensity make sense across mixed activity types?
- Are active days, active time, activity count, and average active day the right overview metrics?
- Is anything from the old yearly/weekly top area still needed before continuing?

Do not continue to Task 5 until the human explicitly accepts Gate A or requests specific changes. Apply requested changes inside Task 3 or Task 4 files, rerun `bun run type-check`, and repeat Gate A.

After Gate A is accepted, remove the temporary `DashboardView.vue` preview imports and template edit so the only committed Task 4 files remain:

```bash
git diff -- src/views/DashboardView.vue
```

Expected: the diff only contains the temporary preview imports/template. Remove those temporary edits before continuing to Task 5.

---

### Task 5: Move Upload And Manual Entry Behind A Header Add Panel

**Files:**
- Create: `src/components/dashboard/AddActivityPanel.vue`
- Modify: `src/components/widgets/UploadActivityWidget.vue`

- [x] **Step 1: Fix and embed `UploadActivityWidget`**

In `src/components/widgets/UploadActivityWidget.vue`, change the icon import to include `HelpCircle`:

```ts
import { FileText, CheckCircle, XCircle, Loader2, RefreshCw, HelpCircle } from 'lucide-vue-next';
```

After store setup, add:

```ts
defineProps<{
  embedded?: boolean;
}>();
```

Replace the root template wrapper opening tag:

```vue
  <div class="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
```

with:

```vue
  <div :class="embedded ? 'h-full flex flex-col' : 'bg-white rounded-lg shadow-md p-6 h-full flex flex-col'">
```

- [x] **Step 2: Create `AddActivityPanel.vue`**

Create `src/components/dashboard/AddActivityPanel.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { Plus, X } from 'lucide-vue-next';
import UploadActivityWidget from '@/components/widgets/UploadActivityWidget.vue';

const isOpen = ref(false);
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-xl bg-verve-neon px-4 py-2 text-sm font-bold text-verve-brown shadow-sm border border-verve-dark/5 hover:brightness-105 transition"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      @click="isOpen = true"
    >
      <Plus class="size-4" aria-hidden="true" />
      <span>Add</span>
    </button>

    <div
      v-if="isOpen"
      class="fixed inset-0 z-40 bg-verve-brown/20 backdrop-blur-sm"
      @click.self="isOpen = false"
    >
      <aside
        class="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl border-l border-verve-medium/30 p-5 sm:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Add activity"
      >
        <div class="flex items-center justify-between mb-5">
          <div>
            <h2 class="text-xl font-bold text-verve-brown">Add activity</h2>
            <p class="text-sm text-verve-brown/60">Upload a file or create a manual activity.</p>
          </div>
          <button
            type="button"
            class="size-9 inline-flex items-center justify-center rounded-lg text-verve-brown/60 hover:text-verve-brown hover:bg-verve-light transition"
            aria-label="Close add activity panel"
            @click="isOpen = false"
          >
            <X class="size-5" aria-hidden="true" />
          </button>
        </div>

        <UploadActivityWidget embedded />
      </aside>
    </div>
  </div>
</template>
```

- [x] **Step 3: Run type check**

Run:

```bash
bun run type-check
```

Expected: PASS. This task also verifies the pre-existing `HelpCircle` reference is fixed.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/AddActivityPanel.vue src/components/widgets/UploadActivityWidget.vue
git commit -m "feat: move activity creation into add panel"
```

- [x] **Step 5: STOP - Human validation Gate B**

With the dev server running, ask the human to inspect the `Add` interaction on desktop and mobile widths.

Expected validation points:

- `Add` is visible without scrolling.
- Upload is reachable in one click.
- Manual entry remains reachable.
- The panel does not obscure the dashboard in a way that makes reviewing data annoying.
- Closing the panel feels obvious.

Do not continue to Task 6 until the human accepts the add-panel interaction or requests specific changes. Apply requested changes in `src/components/dashboard/AddActivityPanel.vue` or `src/components/widgets/UploadActivityWidget.vue`, rerun `bun run type-check`, and repeat Gate B.

---

### Task 6: Make Recent Activities The Primary Navigation Widget

**Files:**
- Modify: `src/components/widgets/LastActivitiesWidget.vue`

- [x] **Step 1: Update display copy and metric layout**

Replace the template in `LastActivitiesWidget.vue` with:

```vue
<template>
  <section class="bg-white rounded-xl shadow-sm border border-verve-medium/30 p-6 h-full">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-xl font-bold text-verve-brown">Recent Activities</h3>
        <p class="text-sm text-verve-brown/60">Latest sessions and imports</p>
      </div>
      <router-link to="/activities" class="text-sm font-bold text-verve-orange hover:text-verve-brown transition">
        View all
      </router-link>
    </div>

    <div v-if="activityStore.isRecentLoading" class="text-center py-8 text-verve-brown/60 text-sm">
      Loading activities...
    </div>

    <div v-else-if="activityStore.recentError" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
      Error: {{ activityStore.recentError }}
    </div>

    <div v-else-if="activityStore.recentActivities.length > 0" class="divide-y divide-verve-medium/20">
      <router-link
        v-for="activity in activityStore.recentActivities"
        :key="activity.id"
        :to="{ name: 'activity-detail', params: { id: activity.id } }"
        class="grid grid-cols-[1fr_auto] gap-4 py-3 group"
      >
        <div class="min-w-0">
          <p class="font-bold text-verve-brown text-sm truncate group-hover:text-verve-orange transition-colors">
            {{ activity.name || 'Untitled activity' }}
          </p>
          <p class="text-xs text-verve-brown/60">
            {{ new Date(activity.start).toLocaleDateString() }}
          </p>
        </div>

        <div class="text-right whitespace-nowrap">
          <p class="font-bold text-verve-brown text-sm font-mono">
            {{ activity.duration }}
          </p>
          <p class="text-xs text-verve-brown/60 font-mono">
            <span v-if="activity.distance != null">{{ activity.distance.toFixed(2) }} km</span>
            <span v-else>No distance</span>
          </p>
        </div>
      </router-link>
    </div>

    <div v-else class="text-center py-8 text-verve-brown/60 text-sm italic">
      No recent activities found.
    </div>
  </section>
</template>
```

- [x] **Step 2: Run type check**

Run:

```bash
bun run type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/widgets/LastActivitiesWidget.vue
git commit -m "feat: emphasize recent activities on dashboard"
```

---

### Task 7: Convert Personal Records Into Curated Records

**Files:**
- Modify: `src/components/widgets/HighlightsWidget.vue`

- [x] **Step 1: Replace local state and fetch logic**

In `HighlightsWidget.vue`, replace the script with:

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Trophy } from 'lucide-vue-next';
import { useHighlightStore } from '@/stores/highlights';
import { type Activity } from '@/stores/activity';
import { fetchActivitySummary } from '@/services/api';
import { formatDuration, parseISODuration } from '@/utils/datetime';

const highlightStore = useHighlightStore();

interface CuratedRecordDefinition {
  metric: string;
  label: string;
}

interface CuratedRecord {
  metric: string;
  label: string;
  activity: Activity;
  value: number;
}

const definitions: CuratedRecordDefinition[] = [
  { metric: 'duration', label: 'Longest duration' },
  { metric: 'distance', label: 'Longest distance' },
  { metric: 'elevation_change_up', label: 'Most elevation' },
];

const records = ref<CuratedRecord[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

const currentYear = new Date().getFullYear();

async function loadCuratedRecords() {
  isLoading.value = true;
  error.value = null;
  records.value = [];

  try {
    const loaded: CuratedRecord[] = [];

    for (const definition of definitions) {
      await highlightStore.fetchDashboardHighlights(definition.metric, currentYear);
      const first = highlightStore.dashboardHighlights[0];
      if (!first) continue;

      const activity = await fetchActivitySummary(first.activity_id);
      loaded.push({
        metric: definition.metric,
        label: definition.label,
        activity,
        value: first.value,
      });
    }

    records.value = loaded;
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    isLoading.value = false;
  }
}

function formatValue(value: number | string, metric: string): string {
  if (metric === 'duration' && typeof value === 'string') {
    return formatDuration(parseISODuration(value));
  }

  const numericValue = typeof value === 'number' ? value : 0;

  if (metric === 'duration') return formatDuration(numericValue);
  if (metric === 'distance') return `${numericValue.toFixed(2)} km`;
  if (metric === 'elevation_change_up') return `${numericValue.toFixed(0)} m`;
  return numericValue.toString();
}

const hasRecords = computed(() => records.value.length > 0);

onMounted(loadCuratedRecords);
</script>
```

- [x] **Step 2: Replace template**

In `HighlightsWidget.vue`, replace the template with:

```vue
<template>
  <section class="bg-white rounded-xl shadow-sm border border-verve-medium/30 p-6 h-full">
    <div class="flex items-center gap-2 mb-4">
      <Trophy class="size-5 text-verve-orange" aria-hidden="true" />
      <div>
        <h3 class="text-xl font-bold text-verve-brown">Records</h3>
        <p class="text-sm text-verve-brown/60">This year's highlights</p>
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-8 text-verve-brown/60 text-sm">
      Loading records...
    </div>

    <div v-else-if="error" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
      {{ error }}
    </div>

    <div v-else-if="hasRecords" class="space-y-2">
      <router-link
        v-for="record in records"
        :key="record.metric"
        :to="{ name: 'activity-detail', params: { id: record.activity.id } }"
        class="block p-3 rounded-xl hover:bg-verve-light/50 border border-transparent hover:border-verve-medium/30 transition-all"
      >
        <div class="flex items-center justify-between gap-4">
          <div class="min-w-0">
            <p class="text-xs font-bold uppercase tracking-wider text-verve-brown/45">
              {{ record.label }}
            </p>
            <p class="font-bold text-verve-brown text-sm truncate">
              {{ record.activity.name || new Date(record.activity.start).toLocaleDateString() }}
            </p>
          </div>
          <p class="text-lg font-bold text-verve-orange whitespace-nowrap">
            {{ formatValue(record.value, record.metric) }}
          </p>
        </div>
      </router-link>
    </div>

    <div v-else class="text-center py-8 text-verve-brown/60 text-sm italic">
      No records found yet.
    </div>
  </section>
</template>
```

- [x] **Step 3: Run type check**

Run:

```bash
bun run type-check
```

Expected: PASS. If `first.value` is typed as `string | number`, update `CuratedRecord.value` to `string | number` and keep `formatValue` unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/components/widgets/HighlightsWidget.vue
git commit -m "feat: simplify dashboard records"
```

- [x] **Step 5: STOP - Human validation Gate C**

With `LastActivitiesWidget`, `GoalsWidget`, and the updated `HighlightsWidget` available, ask the human to validate the main content widgets before the full dashboard reorder.

Expected validation points:

- Recent Activities is useful as the primary navigation widget.
- Duration-first display is better than distance-first display for mixed data.
- Curated Records are understandable without metric/scope/year dropdowns.
- The selected curated records do not over-emphasize distance-based activity types.
- Goals should remain on the dashboard and should be placed above Records unless the human requests otherwise.

Do not continue to Task 8 until the human accepts the widget direction or requests specific changes. Apply requested changes in `src/components/widgets/LastActivitiesWidget.vue`, `src/components/widgets/HighlightsWidget.vue`, or the later Task 8 layout, rerun `bun run type-check`, and repeat Gate C.

---

### Task 8: Recompose Dashboard Layout

**Files:**
- Modify: `src/views/DashboardView.vue`

- [x] **Step 1: Replace imports**

Replace the imports in `DashboardView.vue` with:

```ts
import { useUserStore } from '@/stores/auth';
import AddActivityPanel from '@/components/dashboard/AddActivityPanel.vue';
import DashboardOverviewStrip from '@/components/dashboard/DashboardOverviewStrip.vue';
import ActivityGridWidget from '@/components/widgets/ActivityGridWidget.vue';
import LastActivitiesWidget from '@/components/widgets/LastActivitiesWidget.vue';
import GoalsWidget from '@/components/widgets/GoalsWidget.vue';
import HighlightsWidget from '@/components/widgets/HighlightsWidget.vue';
```

- [x] **Step 2: Replace template**

Replace the template in `DashboardView.vue` with:

```vue
<template>
  <div class="min-h-full bg-verve-medium">
    <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold text-verve-brown">
            Welcome back, {{ userStore.user_full_name ?? userStore.user_name }}!
          </h1>
          <p class="text-verve-brown/60 mt-1 font-medium">Activity overview</p>
        </div>

        <AddActivityPanel />
      </header>

      <div class="space-y-6">
        <ActivityGridWidget />
        <DashboardOverviewStrip />

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2">
            <LastActivitiesWidget />
          </div>

          <div class="space-y-6">
            <GoalsWidget />
            <HighlightsWidget />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [x] **Step 3: Run type check**

Run:

```bash
bun run type-check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/views/DashboardView.vue
git commit -m "feat: recompose dashboard around activity overview"
```

- [x] **Step 5: STOP - Human validation Gate D**

Open the full dashboard with representative data and ask the human to compare it to the previous dashboard direction.

Expected validation points:

- Top order feels right: Activity Grid first, Overview Strip second.
- Recent Activities, Goals, and Records have the right visual weight.
- Removed dashboard widgets are not missed in the main overview:
  - `YearlyStatsWidget`
  - `WeeklyStatsWidget`
  - `CalendarWidget`
  - `UploadActivityWidget` as a permanent card
  - `QuickAddWidget` as a permanent card
  - placeholder cards
- The fullscreen Calendar can cover calendar needs outside the dashboard.
- Detailed analytics can move to a future Data View instead of staying on the dashboard.

Do not continue to Task 9 until the human accepts the dashboard order or requests specific changes. Apply requested changes in `src/views/DashboardView.vue` and the affected widget files, rerun `bun run type-check`, and repeat Gate D.

---

### Task 9: Dashboard Visual QA And Responsive Polish

**Files:**
- Modify only files touched in Tasks 3-8 if QA reveals layout issues.

- [x] **Step 1: Start the dev server**

Run:

```bash
bun run dev
```

Expected: Vite starts and prints a local URL, usually `http://localhost:5173/`.

- [ ] **Step 2: Open dashboard in browser**

Use the in-app Browser plugin to open the dev server URL. Log in if the local app requires it.

Expected:

- Header shows welcome text and `Add` button.
- Activity History grid appears above the overview strip.
- Overview strip appears below the grid.
- Recent Activities is the dominant main content.
- Goals and Records appear in the right column on desktop.
- On mobile width, sections stack without overlapping text.

- [x] **Step 3: STOP - Human validation Gate E**

Ask the human to inspect the live dashboard or screenshots at desktop and mobile widths.

Expected validation points:

- No widget feels empty, misleading, or visually over-weighted.
- The activity grid is readable without dominating the whole page.
- The overview strip is useful but not visually louder than the matrix or Recent Activities.
- Recent Activities, Goals, and Records preserve a clear hierarchy.
- The page still feels like an overview, not an analytics detail page.

Do not continue to polish or final validation until the human accepts the visual direction or requests specific layout changes.

- [x] **Step 4: Verify add panel**

Click `Add`.

Expected:

- Right-side panel opens on desktop.
- Upload form is visible without scrolling the dashboard.
- Manual tab opens the manual entry form modal.
- Close button closes the panel.

- [x] **Step 5: Verify grid rendering**

Inspect the activity grid.

Expected:

- Month labels render above week columns where `month` is present.
- Rows are Monday through Sunday.
- Empty past days render as low-intensity cells.
- Active days render stronger based on `duration_seconds / scale_max.duration_seconds`.
- Future `null` days render muted.
- Tooltips for real days show date, activity count, and duration.

- [x] **Step 6: Apply scoped polish if needed**

If text overlaps or the grid is too wide on mobile, adjust only the relevant class names. Preferred fixes:

```vue
<div class="overflow-x-auto pb-1">
```

for horizontal grid overflow, and:

```vue
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
```

for dashboard stacking.

- [ ] **Step 7: Stop dev server**

Stop the Vite process before final handoff.

- [ ] **Step 8: Commit QA polish**

If any polish changes were made:

```bash
git add src/components/widgets/ActivityGridWidget.vue src/views/DashboardView.vue src/components/dashboard/AddActivityPanel.vue
git commit -m "style: polish dashboard responsive layout"
```

If no changes were made, do not create an empty commit.

---

### Task 10: Final Validation

**Files:**
- No intentional code changes.

- [x] **Step 1: Run utility tests**

Run:

```bash
bun test tests/utils/activityGrid.test.ts
```

Expected: PASS.

- [x] **Step 2: Run type check**

Run:

```bash
bun run type-check
```

Expected: PASS.

- [x] **Step 3: Run full check**

Run:

```bash
bun run check
```

Expected: PASS. If it fails, inspect whether the failure is caused by this dashboard work. Fix introduced failures before handoff.

- [x] **Step 4: Run diff distribution**

Run:

```bash
bun run diff:distribution
```

Expected: Report shows changes concentrated in:

- `src/stores/statistics.ts`
- `src/utils/activityGrid.ts`
- `tests/utils/activityGrid.test.ts`
- `src/components/widgets/ActivityGridWidget.vue`
- `src/components/dashboard/DashboardOverviewStrip.vue`
- `src/components/dashboard/AddActivityPanel.vue`
- `src/components/widgets/UploadActivityWidget.vue`
- `src/components/widgets/LastActivitiesWidget.vue`
- `src/components/widgets/HighlightsWidget.vue`
- `src/views/DashboardView.vue`
- `docs/exec-plans/completed/2026-06-14-dashboard-overhaul.md`

- [ ] **Step 5: Final commit if validation changed files**

If validation required fixes:

```bash
git add src tests docs
git commit -m "fix: finalize dashboard overhaul validation"
```

If validation did not change files, do not create an empty commit.

---

## Self-Review

- Spec coverage: The plan covers the new activity-grid route, top matrix, overview strip, recent activities, add panel, goals retention, curated records, and removal of the old central yearly/weekly/calendar/upload widget grid.
- Human validation coverage: Gate A validates the matrix and overview before deeper widget work; Gate B validates the add panel; Gate C validates Recent Activities, Goals, and Records; Gate D validates the full reordering; Gate E validates final responsive visual quality.
- Placeholder scan: No task contains placeholder instructions or undefined future work as an implementation requirement.
- Type consistency: `GridWeek.month`, `scale_max.duration_seconds`, `GridDay | null`, and `duration_seconds` match the updated OpenAPI contract.
- Scope check: Data View is intentionally excluded. This plan only updates the dashboard and does not implement future analytics navigation.
