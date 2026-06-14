# Dashboard Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the dashboard around a last-52-weeks activity grid, compact overview metrics, recent activities, goals, curated records, and an always-reachable add activity action.

**Architecture:** The backend owns the activity-grid aggregation through `GET /api/v1/statistics/activity-grid`; the frontend only fetches, parses, scales, and renders it. Dashboard composition moves from a loose widget grid to a focused activity home: activity history, overview totals, recent activities, goals, and records, with upload/manual creation hidden behind a header action.

**Tech Stack:** Vue 3 Composition API with `<script setup lang="ts">`, Pinia, TypeScript strict intent, Tailwind CSS v4 utilities, Lucide icons, Bun tests, `vue-tsc`, Vite.

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

- Modify `src/views/DashboardView.vue`
  - Remove `YearlyStatsWidget`, `WeeklyStatsWidget`, `CalendarWidget`, `UploadActivityWidget`, `QuickAddWidget`, placeholder cards, and inert `Add Widget`.
  - Add `AddActivityPanel`, `ActivityGridWidget`, `DashboardOverviewStrip`, `LastActivitiesWidget`, `GoalsWidget`, and `HighlightsWidget`.

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

---

### Task 1: Add Activity Grid Types And Store Fetching

**Files:**
- Modify: `src/stores/statistics.ts`

- [ ] **Step 1: Add activity-grid interfaces**

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

- [ ] **Step 2: Add store state**

Inside `useStatisticsStore`, after `calendarData`, add:

```ts
  const activityGrid = ref<ActivityGridResponse | null>(null);
  const isActivityGridLoading = ref(false);
  const activityGridError = ref<string | null>(null);
```

- [ ] **Step 3: Add `fetchActivityGrid`**

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

- [ ] **Step 4: Return new state and action**

In the returned object from `useStatisticsStore`, add:

```ts
    activityGrid,
    isActivityGridLoading,
    activityGridError,
    fetchActivityGrid,
```

- [ ] **Step 5: Run focused type check**

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

- [ ] **Step 1: Create failing tests**

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

- [ ] **Step 3: Implement helpers**

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

- [ ] **Step 4: Run tests and verify pass**

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

- [ ] **Step 1: Create `ActivityGridWidget.vue`**

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

- [ ] **Step 2: Run type check**

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

- [ ] **Step 1: Create component**

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

- [ ] **Step 2: Run type check**

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

---

### Task 5: Move Upload And Manual Entry Behind A Header Add Panel

**Files:**
- Create: `src/components/dashboard/AddActivityPanel.vue`
- Modify: `src/components/widgets/UploadActivityWidget.vue`

- [ ] **Step 1: Fix and embed `UploadActivityWidget`**

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

- [ ] **Step 2: Create `AddActivityPanel.vue`**

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

- [ ] **Step 3: Run type check**

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

---

### Task 6: Make Recent Activities The Primary Navigation Widget

**Files:**
- Modify: `src/components/widgets/LastActivitiesWidget.vue`

- [ ] **Step 1: Update display copy and metric layout**

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

- [ ] **Step 2: Run type check**

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

- [ ] **Step 1: Replace local state and fetch logic**

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

- [ ] **Step 2: Replace template**

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

- [ ] **Step 3: Run type check**

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

---

### Task 8: Recompose Dashboard Layout

**Files:**
- Modify: `src/views/DashboardView.vue`

- [ ] **Step 1: Replace imports**

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

- [ ] **Step 2: Replace template**

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

- [ ] **Step 3: Run type check**

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

---

### Task 9: Dashboard Visual QA And Responsive Polish

**Files:**
- Modify only files touched in Tasks 3-8 if QA reveals layout issues.

- [ ] **Step 1: Start the dev server**

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

- [ ] **Step 3: Verify add panel**

Click `Add`.

Expected:

- Right-side panel opens on desktop.
- Upload form is visible without scrolling the dashboard.
- Manual tab opens the manual entry form modal.
- Close button closes the panel.

- [ ] **Step 4: Verify grid rendering**

Inspect the activity grid.

Expected:

- Month labels render above week columns where `month` is present.
- Rows are Monday through Sunday.
- Empty past days render as low-intensity cells.
- Active days render stronger based on `duration_seconds / scale_max.duration_seconds`.
- Future `null` days render muted.
- Tooltips for real days show date, activity count, and duration.

- [ ] **Step 5: Apply scoped polish if needed**

If text overlaps or the grid is too wide on mobile, adjust only the relevant class names. Preferred fixes:

```vue
<div class="overflow-x-auto pb-1">
```

for horizontal grid overflow, and:

```vue
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
```

for dashboard stacking.

- [ ] **Step 6: Stop dev server**

Stop the Vite process before final handoff.

- [ ] **Step 7: Commit QA polish**

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

- [ ] **Step 1: Run utility tests**

Run:

```bash
bun test tests/utils/activityGrid.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run type check**

Run:

```bash
bun run type-check
```

Expected: PASS.

- [ ] **Step 3: Run full check**

Run:

```bash
bun run check
```

Expected: PASS. If it fails, inspect whether the failure is caused by this dashboard work. Fix introduced failures before handoff.

- [ ] **Step 4: Run diff distribution**

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
- `docs/exec-plans/active/2026-06-14-dashboard-overhaul.md`

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
- Placeholder scan: No task contains `TBD`, `TODO`, or undefined future work as an implementation requirement.
- Type consistency: `GridWeek.month`, `scale_max.duration_seconds`, `GridDay | null`, and `duration_seconds` match the updated OpenAPI contract.
- Scope check: Data View is intentionally excluded. This plan only updates the dashboard and does not implement future analytics navigation.
