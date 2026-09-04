# Responsive Activity History and Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dashboard activity history and the Calendar route useful without horizontal overflow below 1024px, while preserving their desktop presentation and all existing API semantics.

**Architecture:** Keep `/statistics/activity-grid?weeks=52` as the single dashboard statistics request because `DashboardOverviewStrip.vue` consumes its 52-week totals and summary. `ActivityGridWidget.vue` will select the trailing 12 returned weeks for compact rendering; `CalendarView.vue` will render a selected-month agenda from its existing calendar response below the `lg` breakpoint. Pure selection helpers isolate data shaping for Bun tests; no API, Pinia, router, or backend-contract shape changes are required.

**Tech Stack:** Vue 3 Composition API with `<script setup lang="ts">`, TypeScript, Pinia, Vue Router, Tailwind CSS v4 utilities, Lucide/Vue activity icons, Bun tests, Vite.

**Spec:** Approved responsive-design decisions from the 2026-09-04 planning conversation; no separate persisted design document exists.

**Status:** Implementation and automated validation completed on 2026-09-04; authenticated browser validation remains pending because no browser surface is attached to this session.

**Implementation evidence:**

- Focused tests: `bun test tests/utils/calendarData.test.ts tests/utils/activityGrid.test.ts tests/utils/calendarAgenda.test.ts` — 15 passing tests, 33 assertions.
- Repository validation: `bun run check` — harness, links, OpenAPI summary, agent rules, ESLint baseline, Vue type checking, and production build passed.
- Distribution review: `bun run diff:distribution` — 5 source files, 3 test files, and 2 plan-document files changed; unrelated pre-existing `diff.txt` and logo assets were not modified.
- Independent review identified and corrected a desktop tooltip clipping defect and stale-calendar-data rendering during month navigation.

## Global Constraints

- Use Vue 3 Composition API and `<script setup lang="ts">`; do not introduce `any`, Options API, `v-html`, CommonJS, or `this` in scripts.
- Retain the OpenAPI-defined calendar and activity-grid endpoints and their existing TypeScript store interfaces.
- The compact breakpoint is Tailwind `lg` (1024px): desktop grids require approximately 900px of usable content width.
- At widths below 1024px, show the latest 12 activity-grid weeks and a selected-month agenda containing every in-month date, including rest days.
- At widths of 1024px and above, preserve the existing 52-week grid and eight-column calendar with weekly-summary column.
- Use semantic buttons and accessible names for newly tappable controls; active grid-cell details must remain available to mouse, keyboard, and touch users.
- Leave `src/components/widgets/CalendarWidget.vue` unchanged: it is not rendered by the current dashboard route and is outside this scope.
- Before handoff, run `bun run check` and `bun run diff:distribution`; do not modify unrelated untracked files.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/utils/activityGrid.ts` | Select the trailing grid weeks without changing aggregate data. |
| `src/utils/calendarAgenda.ts` | Flatten calendar response weeks into ordered, in-month agenda days. |
| `tests/utils/activityGrid.test.ts` | Prove trailing-week selection behavior. |
| `tests/utils/calendarAgenda.test.ts` | Prove agenda extraction filters adjacent-month dates and preserves order. |
| `src/components/widgets/ActivityGridWidget.vue` | Switch heatmap density and interaction behavior at the compact breakpoint. |
| `src/views/CalendarView.vue` | Render compact month agenda and responsive header while retaining desktop calendar. |

## Task 1: Add Tested Display-Selection Helpers

**Files:**

- Modify: `src/utils/activityGrid.ts`
- Create: `src/utils/calendarAgenda.ts`
- Modify: `tests/utils/activityGrid.test.ts`
- Create: `tests/utils/calendarAgenda.test.ts`

**Interfaces:**

- Consumes: `GridWeek`, `CalendarWeek`, and `CalendarDay` from `src/stores/statistics.ts`.
- Produces:

  ```ts
  export function getRecentGridWeeks(weeks: readonly GridWeek[], limit: number): GridWeek[];
  export function getMonthAgendaDays(weeks: readonly CalendarWeek[]): CalendarDay[];
  ```

- `ActivityGridWidget.vue` consumes `getRecentGridWeeks`; `CalendarView.vue` consumes `getMonthAgendaDays`.

- [ ] **Step 1: Write the failing grid-window tests**

  Add `getRecentGridWeeks` to the `activityGrid` utility import and add this fixture and tests to `tests/utils/activityGrid.test.ts`:

  ```ts
  import type { GridWeek } from '../../src/stores/statistics';

  function gridWeek(startDate: string): GridWeek {
    return { start_date: startDate, month: null, days: [] };
  }

  test('keeps the newest grid weeks in chronological order', () => {
    const weeks = [
      gridWeek('2026-01-05'),
      gridWeek('2026-01-12'),
      gridWeek('2026-01-19'),
      gridWeek('2026-01-26'),
    ];

    expect(getRecentGridWeeks(weeks, 2).map((week) => week.start_date)).toEqual([
      '2026-01-19',
      '2026-01-26',
    ]);
  });

  test('returns all available grid weeks when the limit exceeds the response', () => {
    const weeks = [gridWeek('2026-01-05'), gridWeek('2026-01-12')];

    expect(getRecentGridWeeks(weeks, 12)).toEqual(weeks);
  });
  ```

- [ ] **Step 2: Write the failing month-agenda tests**

  Create `tests/utils/calendarAgenda.test.ts` with deterministic calendar-day fixtures and this behavior:

  ```ts
  import { describe, expect, test } from 'bun:test';
  import type { CalendarDay, CalendarWeek } from '../../src/stores/statistics';
  import { getMonthAgendaDays } from '../../src/utils/calendarAgenda';

  function calendarDay(date: string, isInMonth: boolean): CalendarDay {
    return {
      date,
      is_in_month: isInMonth,
      items: [],
      active_type_ids: [],
      total: { count: 0, distance: 0, duration: 0, effective_duration: 0, elevation_gain: 0 },
    };
  }

  test('returns only selected-month days in calendar order', () => {
    const weeks: CalendarWeek[] = [
      {
        days: [
          calendarDay('2026-05-31', false),
          calendarDay('2026-06-01', true),
          calendarDay('2026-06-02', true),
        ],
        week_summary: { count: 0, distance: 0, duration: 0, effective_duration: 0, elevation_gain: 0 },
      },
      {
        days: [calendarDay('2026-06-30', true), calendarDay('2026-07-01', false)],
        week_summary: { count: 0, distance: 0, duration: 0, effective_duration: 0, elevation_gain: 0 },
      },
    ];

    expect(getMonthAgendaDays(weeks).map((day) => day.date)).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-30',
    ]);
  });
  ```

- [ ] **Step 3: Run the new tests and confirm they fail because the helpers do not exist**

  Run:

  ```bash
  bun test tests/utils/activityGrid.test.ts tests/utils/calendarAgenda.test.ts
  ```

  Expected: test compilation fails with missing exports/modules for `getRecentGridWeeks` and `getMonthAgendaDays`.

- [ ] **Step 4: Implement the grid-week selector**

  In `src/utils/activityGrid.ts`, import `GridWeek` as a type and add:

  ```ts
  export function getRecentGridWeeks(weeks: readonly GridWeek[], limit: number): GridWeek[] {
    if (limit <= 0) return [];
    return weeks.slice(-limit);
  }
  ```

  This function must not recalculate `scale_max`, totals, or summary values; those remain server-owned 52-week values.

- [ ] **Step 5: Implement the agenda selector**

  Create `src/utils/calendarAgenda.ts`:

  ```ts
  import type { CalendarDay, CalendarWeek } from '@/stores/statistics';

  export function getMonthAgendaDays(weeks: readonly CalendarWeek[]): CalendarDay[] {
    return weeks.flatMap((week) => week.days.filter((day) => day.is_in_month));
  }
  ```

- [ ] **Step 6: Run focused tests and type checking**

  Run:

  ```bash
  bun test tests/utils/activityGrid.test.ts tests/utils/calendarAgenda.test.ts
  bun run type-check
  ```

  Expected: all existing grid tests and the new agenda tests pass; TypeScript accepts the readonly inputs and returned concrete arrays.

- [ ] **Step 7: Commit the tested helper layer**

  ```bash
  git add src/utils/activityGrid.ts src/utils/calendarAgenda.ts tests/utils/activityGrid.test.ts tests/utils/calendarAgenda.test.ts
  git commit -m "feat: add responsive activity display selectors"
  ```

## Task 2: Render a 12-Week, Touch-Accessible Activity Grid Below `lg`

**Files:**

- Modify: `src/components/widgets/ActivityGridWidget.vue`
- Test: `tests/utils/activityGrid.test.ts`

**Interfaces:**

- Consumes: `getRecentGridWeeks(weeks, 12)`, existing `ActivityGridResponse.scale_max`, `activityGrid.totals`, and `activityGrid.summary`.
- Produces: no new public component props or store fields; the widget continues to fetch `fetchActivityGrid(52)`.

- [ ] **Step 1: Add compact-viewport state and selected-week computation**

  Update the Vue import to include `onBeforeUnmount`. Add these constants and state near the existing computed values:

  ```ts
  const COMPACT_QUERY = '(max-width: 1023px)';
  const COMPACT_WEEK_COUNT = 12;

  const isCompact = ref(false);
  let compactMediaQuery: MediaQueryList | null = null;

  const visibleWeeks = computed(() =>
    isCompact.value ? getRecentGridWeeks(weeks.value, COMPACT_WEEK_COUNT) : weeks.value
  );
  const gridTemplateColumns = computed(
    () => `28px repeat(${visibleWeeks.value.length}, minmax(12px, 1fr))`
  );
  const historySubtitle = computed(() =>
    isCompact.value ? 'Last 12 weeks by active time' : 'Last 52 weeks by active time'
  );
  ```

  Replace the existing `gridTemplateColumns` definition and import `getRecentGridWeeks` from `@/utils/activityGrid`.

- [ ] **Step 2: Synchronize compact state with the real viewport lifecycle**

  Add a `syncCompactViewport` handler that copies `compactMediaQuery.matches` into `isCompact` and clears `activeDay` when the presentation switches. Register it in `onMounted` with `window.matchMedia(COMPACT_QUERY)` and a `change` listener; remove that exact listener in `onBeforeUnmount`.

  Keep the existing `onMounted(loadGrid)` and activity-store refresh watch. Never change `loadGrid` from `statisticsStore.fetchActivityGrid(52)`, because the overview-strip metrics share this response.

- [ ] **Step 3: Make grid dimensions follow `visibleWeeks`**

  Replace all week rendering and the `v-else-if` condition to use `visibleWeeks`. Change the grid wrapper classes so the compact view has no minimum width while desktop keeps the current geometry:

  ```html
  <div v-else-if="visibleWeeks.length > 0" class="overflow-visible lg:overflow-x-auto lg:pb-1">
    <div class="grid min-w-0 gap-1 lg:min-w-[900px]" :style="{ gridTemplateColumns }">
  ```

  Use `historySubtitle` under the card title. This must show exactly twelve trailing columns at compact widths and all returned columns at desktop widths.

- [ ] **Step 4: Replace active cell `div`s with semantic buttons**

  For `hasActivityGridCellDetails(day)`, render a `button type="button"` using the existing cell color, size, focus-ring, `title`, and `aria-label` classes. Add `p-0`, `@click="showCellDetails(day)"`, and retain mouse/focus handlers. Render non-active and null days as non-focusable `div`s with the same visual sizing.

  This preserves hover and keyboard detail exposure on desktop while making active cells operable on touch screens. Do not make rest or future cells keyboard-focusable.

- [ ] **Step 5: Make selected details non-obstructive on compact screens**

  Move the existing `activeDay` status card after the grid markup and give it static compact placement with desktop-only absolute placement:

  ```html
  class="mt-4 rounded-lg border border-verve-medium/30 bg-white px-3 py-2 text-xs font-semibold text-verve-brown shadow-lg lg:absolute lg:right-5 lg:top-5 lg:mt-0"
  ```

  On compact screens, tapping an active cell displays its details below the heatmap until another active cell is selected or a viewport/data refresh clears the selection. On desktop, the card remains in its current top-right hover/focus location.

- [ ] **Step 6: Run focused checks**

  Run:

  ```bash
  bun test tests/utils/activityGrid.test.ts
  bun run type-check
  ```

  Expected: grid utility tests remain green and Vue type checking accepts the conditional button/div rendering and media-query lifecycle cleanup.

- [ ] **Step 7: Commit the responsive grid behavior**

  ```bash
  git add src/components/widgets/ActivityGridWidget.vue
  git commit -m "feat: adapt activity history for compact screens"
  ```

## Task 3: Render a Selected-Month Calendar Agenda Below `lg`

**Files:**

- Modify: `src/views/CalendarView.vue`
- Consumes: `getMonthAgendaDays(weeks)`, existing `CalendarDay`, `ActivityCalendarItem`, `ActivityIcon`, `formatDuration`, and activity-detail route.
- Produces: no new route, API request, Pinia field, or shared component interface.

- [ ] **Step 1: Add agenda data and display helpers to the view**

  Import `CalendarDay` and `getMonthAgendaDays`. Add a computed agenda source and local formatting helpers:

  ```ts
  const agendaDays = computed(() => getMonthAgendaDays(statsStore.calendarData?.weeks ?? []));

  const getAgendaDateLabel = (date: string) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${date}T00:00:00`));

  const getDaySummary = (day: CalendarDay) => {
    const parts: string[] = [];
    if (day.total.distance > 0) parts.push(`${day.total.distance.toFixed(1)} km`);
    if (day.total.effective_duration > 0) parts.push(formatDuration(day.total.effective_duration));
    parts.push(`${day.total.count} ${day.total.count === 1 ? 'activity' : 'activities'}`);
    return parts.join(' · ');
  };
  ```

  Constructing the date with `T00:00:00` avoids shifting date-only API values into the prior day for users west of UTC.

- [ ] **Step 2: Make header controls fit compact layouts**

  Change the header breakpoint from `md` to `lg`, make the month-navigation group wrap safely, and make the summary a `grid grid-cols-3` with narrow-screen gaps instead of `space-x-8`. Keep the current title, today action, metrics, and month state transitions.

  Set `type="button"` and these accessible names on navigation buttons:

  ```html
  aria-label="Previous month"
  aria-label="Go to current month"
  aria-label="Next month"
  ```

- [ ] **Step 3: Wrap the existing desktop calendar behind the `lg` breakpoint**

  Replace the current single `min-w-[900px]` calendar container with an outer desktop-only scrolling wrapper:

  ```html
  <div class="hidden overflow-x-auto lg:block">
    <div class="min-w-[900px] rounded-xl border border-verve-medium/30 bg-white shadow-sm">
      <!-- existing eight-column calendar header and body -->
    </div>
  </div>
  ```

  Keep existing weekday headers, day chips, month-summary logic, weekly-summary column, loading state, and activity links inside this desktop branch. The `min-w-[900px]` element must be a child of the overflow wrapper, never the page-level container.

- [ ] **Step 4: Add the compact every-day agenda branch**

  Before the desktop branch, render an `lg:hidden` white bordered section when `statsStore.calendarData` exists. Iterate over `agendaDays` and render one date row for every selected-month day:

  ```html
  <article v-for="day in agendaDays" :key="day.date" class="border-b border-verve-medium/20 px-4 py-3 last:border-b-0">
    <div class="flex items-center justify-between gap-3">
      <p class="font-bold text-verve-brown">{{ getAgendaDateLabel(day.date) }}</p>
      <span v-if="isToday(day.date)" class="rounded-full bg-verve-neon px-2 py-0.5 text-xs font-bold text-verve-brown">Today</span>
    </div>
  </article>
  ```

  For `day.total.count === 0`, render exactly `Rest day` in calm secondary text. For an active day, show `getDaySummary(day)` and render an activity list beneath it. Each activity must be a `router-link` to the existing `activity-detail` route, include `ActivityIcon`, use `item.name ?? 'Activity'` as its primary label, and use the existing `getDisplayValue(item)` as its secondary metric. Preserve the existing link target and hover/focus styling vocabulary.

- [ ] **Step 5: Preserve loading behavior in both layouts**

  Retain one full-width loading branch when `statsStore.calendarData` is null. Do not duplicate a loading indicator inside both responsive branches, and do not alter the existing `fetchCalendar(year, month)` watch or month-navigation functions.

- [ ] **Step 6: Run type checking**

  Run:

  ```bash
  bun run type-check
  ```

  Expected: the agenda branch compiles with strict `CalendarDay` and `ActivityCalendarItem` types, and all navigation controls retain valid templates.

- [ ] **Step 7: Commit the responsive calendar behavior**

  ```bash
  git add src/views/CalendarView.vue
  git commit -m "feat: add compact calendar agenda"
  ```

## Task 4: Validate the Complete Responsive Experience

**Files:**

- Modify: `docs/exec-plans/active/2026-09-04-responsive-activity-history-calendar.md`
- Move after successful validation: `docs/exec-plans/completed/2026-09-04-responsive-activity-history-calendar.md`

**Interfaces:**

- Consumes: completed Tasks 1–3 and an authenticated browser session with calendar and activity-grid data.
- Produces: verified completion evidence and an archived execution plan.

- [ ] **Step 1: Run automated validation**

  Run:

  ```bash
  bun test tests/utils/activityGrid.test.ts tests/utils/calendarAgenda.test.ts
  bun run type-check
  bun run check
  bun run diff:distribution
  ```

  Expected: all tests and checks pass. The distribution report contains only the planned helpers, tests, responsive view/widget changes, and this execution-plan lifecycle update.

- [ ] **Step 2: Perform browser validation at representative widths**

  Validate the authenticated dashboard and Calendar route at 320px, 390px, 768px, and 1024px wide:

  - Below 1024px, neither route produces horizontal document scrolling.
  - Dashboard activity history shows twelve chronological week columns; active cells expose the correct date/count/duration after tap, hover, and keyboard focus.
  - Dashboard overview-strip values remain the existing 52-week response-derived values after compact grid rendering.
  - Calendar shows only selected-month dates, including every rest day; activity days show daily totals and working activity-detail links.
  - Previous, next, and Today reload the correct selected month in both compact and desktop presentations.
  - At 1024px, desktop activity history restores the 52-week grid and Calendar restores the seven-day plus weekly-summary grid.
  - Focus rings remain visible and no text clips, overlaps, or wraps into unusable controls.

- [ ] **Step 3: Record completion evidence and archive the plan**

  Replace this plan's status with completion evidence naming the commands and browser widths validated. Move it to `docs/exec-plans/completed/` and update `docs/exec-plans/active/README.md` if it was listed as active.

- [ ] **Step 4: Commit validation evidence**

  ```bash
  git add docs/exec-plans/active/README.md docs/exec-plans/completed/2026-09-04-responsive-activity-history-calendar.md
  git commit -m "docs: complete responsive activity views plan"
  ```

## Decision Log

- Use 12 compact weeks: this provides about three months of history and keeps day targets practical on 320–390px screens.
- Use `lg` rather than `sm`: a 900px desktop grid cannot fit reliably in the widths between phone and desktop breakpoints.
- Keep a 52-week API response: changing its request parameter would silently change dashboard overview totals and summaries.
- Show every selected-month day in the compact agenda: approved preference favors calendar completeness over a shorter activity-only feed.
- Do not add a backend endpoint, store field, router path, browser-test framework, or redesign of `CalendarWidget.vue`.
