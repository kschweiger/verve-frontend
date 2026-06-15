# Activity Grid Hover Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show clear hover/focus details for activity-grid cells with activity data: date, activity count, and duration.

**Architecture:** Keep the backend contract unchanged. Add small pure helpers in `src/utils/activityGrid.ts`, unit-test them, then use them in `ActivityGridWidget.vue` for a deliberate tooltip/popover instead of relying only on the browser-native `title` attribute.

**Tech Stack:** Vue 3 Composition API with `<script setup lang="ts">`, TypeScript, Tailwind CSS v4 utilities, Bun tests, Vite/browser QA.

**Status:** Completed on 2026-06-15.

Completion evidence:

- Utility tests passed with `bun test tests/utils/activityGrid.test.ts`.
- TypeScript passed with `bun run type-check`.
- Full repository check passed with `bun run check`.
- Diff distribution was reviewed with `bun run diff:distribution`.
- Human browser validation was completed in an authenticated dashboard session.
- Commit steps were intentionally skipped because no commit was requested for this follow-up.

---

## Current Context

Before this follow-up, `src/components/widgets/ActivityGridWidget.vue` only had `cellTitle(day)` and bound it to `:title`. That technically exposed the requested information for real `GridDay` cells, but browser-native titles are delayed, hard to style, inconsistent on touch devices, and not useful for keyboard review. This follow-up should make the behavior intentional and testable.

Desired behavior:

- Hovering a grid cell with `activity_count > 0` shows a small detail tooltip.
- Focusing a grid cell with `activity_count > 0` by keyboard shows the same detail tooltip.
- Tooltip content includes:
  - date,
  - activity count,
  - duration.
- Future `null` cells should not show the activity details tooltip.
- Past days with zero activities should not show a tooltip and should not enter the keyboard tab order.
- Keep the native `title` only on cells with activity data as a harmless fallback if desired, but do not rely on it as the primary UX.

Tooltip position decision:

- Keep the tooltip card-anchored in the top-right of the activity grid card for this iteration.
- Do not make it follow the mouse in this plan. Mouse-following tooltips are likely to obscure adjacent cells while scanning, jitter during horizontal movement, and do not map cleanly to keyboard focus.
- If human/browser validation finds the top-right tooltip too disconnected from the hovered cell, prefer a later cell-anchored tooltip above or near the active cell rather than cursor-following behavior.

## Files

- Modify `src/utils/activityGrid.ts`
  - Add `formatActivityGridCellDetails(day)` and `hasActivityGridCellDetails(day)` helpers.

- Modify `tests/utils/activityGrid.test.ts`
  - Add tests for singular/plural activity counts and the rule that only days with activities expose details.

- Modify `src/components/widgets/ActivityGridWidget.vue`
  - Track hovered/focused cell state.
  - Render a visible tooltip only for `GridDay` cells with `activity_count > 0`.
  - Add keyboard focus support with `tabindex="0"` only for cells with activity data.
  - Keep future `null` cells and inactive past days non-focusable.

## Acceptance Checks

Run before handoff:

```bash
bun test tests/utils/activityGrid.test.ts
bun run type-check
bun run check
bun run diff:distribution
```

Expected:

- Activity-grid helper tests pass.
- Type-check passes.
- Full repo check passes.
- Diff distribution is limited to the activity grid utility, test, widget, this completed plan, and exec-plan README updates.

Human/browser acceptance:

- Use an authenticated dashboard session with activity-grid data that includes at least one active past day, one inactive past day, and the current trailing future cells if the current week is incomplete.
- Hover an active day: tooltip shows date, correct activity count, and duration.
- Hover an inactive past day: no tooltip appears.
- Hover a future trailing cell: no activity-details tooltip appears.
- Keyboard-tab reaches active day cells only; focused active cells show the tooltip.
- Tooltip does not clip inside the grid card or create layout shift.

---

### Task 1: Add Cell Detail Formatter And Visibility Helper

**Files:**
- Modify: `src/utils/activityGrid.ts`
- Modify: `tests/utils/activityGrid.test.ts`

- [x] **Step 1: Add failing formatter and visibility tests**

Append these tests to `tests/utils/activityGrid.test.ts`:

```ts
import type { GridDay } from '../../src/stores/statistics';
```

Update the existing import from `../../src/utils/activityGrid` to include:

```ts
  formatActivityGridCellDetails,
  hasActivityGridCellDetails,
```

Add these tests inside `describe('activity grid helpers', () => { ... })`:

```ts
  test('formats cell details with singular activity count', () => {
    const day: GridDay = {
      date: '2026-06-15',
      activity_count: 1,
      duration_seconds: 3600,
    };

    expect(formatActivityGridCellDetails(day)).toBe('2026-06-15 · 1 activity · 1h');
  });

  test('formats cell details with plural activity count and duration', () => {
    const day: GridDay = {
      date: '2026-06-16',
      activity_count: 3,
      duration_seconds: 5400,
    };

    expect(formatActivityGridCellDetails(day)).toBe('2026-06-16 · 3 activities · 1h 30m');
  });

  test('only days with activities have cell details', () => {
    const activeDay: GridDay = {
      date: '2026-06-15',
      activity_count: 1,
      duration_seconds: 1800,
    };
    const inactiveDay: GridDay = {
      date: '2026-06-16',
      activity_count: 0,
      duration_seconds: 0,
    };

    expect(hasActivityGridCellDetails(activeDay)).toBe(true);
    expect(hasActivityGridCellDetails(inactiveDay)).toBe(false);
    expect(hasActivityGridCellDetails(null)).toBe(false);
  });
```

- [x] **Step 2: Run tests and verify failure**

Run:

```bash
bun test tests/utils/activityGrid.test.ts
```

Expected: FAIL because `hasActivityGridCellDetails` is not exported yet.

- [x] **Step 3: Implement formatter and visibility helper**

In `src/utils/activityGrid.ts`, add the type import at the top:

```ts
import type { GridDay } from '@/stores/statistics';
```

Add these functions after `formatActivityGridDuration`:

```ts
export function formatActivityGridCellDetails(day: GridDay): string {
  const activityLabel = day.activity_count === 1 ? 'activity' : 'activities';
  return `${day.date} · ${day.activity_count} ${activityLabel} · ${formatActivityGridDuration(day.duration_seconds)}`;
}

export function hasActivityGridCellDetails(day: GridDay | null): day is GridDay {
  return day !== null && day.activity_count > 0;
}
```

- [x] **Step 4: Run tests and verify pass**

Run:

```bash
bun test tests/utils/activityGrid.test.ts
```

Expected: PASS.

- [x] **Step 5: Run type check**

Run:

```bash
bun run type-check
```

Expected: PASS.

- [x] **Step 6: Commit skipped because no commit was requested**

```bash
git add src/utils/activityGrid.ts tests/utils/activityGrid.test.ts
git commit -m "test: cover activity grid cell details"
```

---

### Task 2: Render Visible Hover And Focus Details

**Files:**
- Modify: `src/components/widgets/ActivityGridWidget.vue`

- [x] **Step 1: Update imports and state**

In `src/components/widgets/ActivityGridWidget.vue`, update the Vue import:

```ts
import { computed, onMounted, ref, watch } from 'vue';
```

Update the utility import to include the new formatter:

```ts
  formatActivityGridCellDetails,
  hasActivityGridCellDetails,
```

Add this state after `scaleMax`:

```ts
const activeDay = ref<GridDay | null>(null);
```

- [x] **Step 2: Replace `cellTitle`**

Replace the existing `cellTitle` function with:

```ts
function cellDetails(day: GridDay | null): string {
  return hasActivityGridCellDetails(day) ? formatActivityGridCellDetails(day) : '';
}

function showCellDetails(day: GridDay | null) {
  activeDay.value = hasActivityGridCellDetails(day) ? day : null;
}

function clearCellDetails() {
  activeDay.value = null;
}
```

- [x] **Step 3: Add tooltip container to the grid card**

In the template, change the opening `<section>` class from:

```vue
<section class="bg-white border border-verve-medium/30 rounded-xl shadow-sm p-5 sm:p-6">
```

to:

```vue
<section class="relative bg-white border border-verve-medium/30 rounded-xl shadow-sm p-5 sm:p-6">
```

Immediately after the header block and before the loading state, add:

```vue
    <div
      v-if="activeDay"
      class="pointer-events-none absolute right-5 top-5 z-10 rounded-lg border border-verve-medium/30 bg-white px-3 py-2 text-xs font-semibold text-verve-brown shadow-lg"
      role="status"
    >
      {{ cellDetails(activeDay) }}
    </div>
```

- [x] **Step 4: Wire hover and focus events on real cells**

Replace the day cell `<div>` inside the `v-for="(day, dayIndex) in week.days"` loop with:

```vue
          <div
            v-for="(day, dayIndex) in week.days"
            :key="`${week.start_date}-${dayIndex}`"
            class="aspect-square w-full rounded-[3px] border outline-none focus:ring-2 focus:ring-verve-orange focus:ring-offset-1"
            :class="cellClass(day)"
            :title="cellDetails(day) || undefined"
            :tabindex="hasActivityGridCellDetails(day) ? 0 : -1"
            :aria-label="cellDetails(day) || undefined"
            @mouseenter="showCellDetails(day)"
            @mouseleave="clearCellDetails"
            @focus="showCellDetails(day)"
            @blur="clearCellDetails"
          ></div>
```

This keeps `title` and `aria-label` as fallbacks only where `cellDetails(day)` is non-empty, makes active day cells keyboard-focusable, and prevents future `null` cells and inactive past days from entering the tab order.

- [x] **Step 5: Run type check**

Run:

```bash
bun run type-check
```

Expected: PASS.

- [x] **Step 6: Commit skipped because no commit was requested**

```bash
git add src/components/widgets/ActivityGridWidget.vue
git commit -m "feat: show activity grid hover details"
```

---

### Task 3: Browser QA

**Files:**
- Modify only `src/components/widgets/ActivityGridWidget.vue` if visual QA reveals clipping or overlap.

- [x] **Step 1: Start dev server**

Run:

```bash
bun run dev
```

Expected: Vite starts and prints a local URL, usually `http://localhost:5173/`.

- [x] **Step 2: Inspect hover behavior**

Open the dashboard in the in-app browser.

Expected:

- Hovering an active day cell shows one tooltip in the top-right of the activity grid card.
- Tooltip text format is `YYYY-MM-DD · N activity/activities · duration`.
- Past zero-activity cells do not show a tooltip.
- Future trailing cells do not show a tooltip.
- Moving between cells updates the tooltip without layout shift.
- The top-right position is intentional for this iteration; note during human validation if it feels too disconnected from the hovered cell.

- [x] **Step 3: Inspect keyboard behavior**

Use Tab to focus into real activity-grid cells.

Expected:

- Active day cells receive focus.
- Focused active day cells show the same details as hover.
- Future trailing cells and inactive past days are skipped.
- Focus ring is visible.

- [x] **Step 4: Apply scoped polish if needed**

If the tooltip clips or hides too much content, adjust only the tooltip class in `ActivityGridWidget.vue`. Prefer moving it within the same card rather than introducing a global portal.

Suggested fallback class if the top-right tooltip overlaps header content:

```vue
class="pointer-events-none absolute right-5 top-16 z-10 rounded-lg border border-verve-medium/30 bg-white px-3 py-2 text-xs font-semibold text-verve-brown shadow-lg"
```

- [x] **Step 5: Stop dev server**

Stop the Vite process before handoff.

- [x] **Step 6: Commit polish skipped because no polish commit was needed/requested**

If QA required polish:

```bash
git add src/components/widgets/ActivityGridWidget.vue
git commit -m "style: polish activity grid hover details"
```

If no changes were made, do not create an empty commit.

---

### Task 4: Final Validation

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

Expected: PASS.

- [x] **Step 4: Run diff distribution**

Run:

```bash
bun run diff:distribution
```

Expected: Report shows changes concentrated in:

- `src/utils/activityGrid.ts`
- `tests/utils/activityGrid.test.ts`
- `src/components/widgets/ActivityGridWidget.vue`
- `docs/exec-plans/completed/2026-06-15-activity-grid-hover-details.md`
- `docs/exec-plans/active/README.md`
- `docs/exec-plans/completed/README.md`

---

## Self-Review

- Spec coverage: The plan covers hover, keyboard focus, date, activity count, duration, active-only details, future `null` cells, and inactive past days without tooltips.
- Placeholder scan: No task contains placeholder instructions or undefined future work.
- Type consistency: The formatter accepts `GridDay`, matching `ActivityGridWidget.vue` and `src/stores/statistics.ts`.
- Scope check: This is intentionally limited to activity-grid cell details and does not change backend data, grid aggregation, or dashboard layout.
