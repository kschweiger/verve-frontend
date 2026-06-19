# Records Default Activity Type Settings Implementation Plan

> **For agentic workers:** Implement this task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/records` default to the user’s saved records activity type and remove every UI and request path that shows mixed all-activity-type records.

**Architecture:** Backend already exposes `records_settings.default_activity_type` through `GET /api/v1/users/me/settings` and accepts replacement updates at `PATCH /api/v1/users/me/records_settings`. Frontend will extend the existing settings store and settings page using the same pattern as heatmap settings, then make the records store/page require a concrete `type_id` before fetching highlights. The Records page keeps the activity-type dropdown for switching between concrete activity types but no longer includes an “All activity types” option.

**Tech Stack:** Vue 3 Composition API, Pinia, Vue Router, TypeScript, Bun tests, Tailwind CSS v4, backend OpenAPI contract.

**Primary success check:** Opening `/records` first loads user settings, initializes the type filter from `records_settings.default_activity_type`, and the first highlights request includes `type_id`; the Records type dropdown has no all-types option.

---

## Repo Rules

- Follow Vue 3 `<script setup lang="ts">`.
- Do not introduce `any`; use explicit interfaces and `unknown` parsing where needed.
- Treat `backend_openapi.json` as the source of truth.
- Keep checked-in execution plans under `docs/exec-plans/active/`.
- Preserve the existing dashboard `HighlightsWidget` behavior unless this plan explicitly changes it.
- Run `bun run check` and `bun run diff:distribution` before handoff.

## Backend Contract Facts

Confirmed in `backend_openapi.json`:

```ts
interface RecordsSettings {
  default_activity_type: number;
}

interface UserSettingsPublic {
  default_type_id: number;
  defautl_sub_type_id: number | null;
  locale: 'de' | 'en';
  heatmap_settings: HeatmapSettings;
  records_settings?: RecordsSettings;
}
```

Endpoint:

```http
PATCH /api/v1/users/me/records_settings
Content-Type: application/json

{
  "default_activity_type": 1
}
```

The response body is not used by the frontend; refresh user settings after a successful update, matching `updateHeatmapSettings`.

## Task 1: Add Records Settings To Settings Store

**Files:**
- Modify: `src/stores/settings.ts`
- Test: `tests/stores/settings.test.ts`

- [x] Add the exported interface:

```ts
export interface RecordsSettings {
  default_activity_type: number;
}
```

- [x] Update `UserSettings`:

```ts
export interface UserSettings {
  default_type_id: number | null;
  defautl_sub_type_id: number | null;
  locale: string;
  heatmap_settings: HeatmapSettings;
  records_settings: RecordsSettings | null;
}
```

- [x] Add an action beside `updateHeatmapSettings`:

```ts
async function updateRecordsSettings(defaultActivityType: number): Promise<boolean> {
  const userStore = useUserStore();
  if (!userStore.token) return false;

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me/records_settings`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${userStore.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ default_activity_type: defaultActivityType }),
    });

    if (!response.ok) throw new Error('Failed to update records settings.');

    await fetchAllSettings();
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
```

- [x] Return `updateRecordsSettings` from the store.

- [x] If direct Bun store tests fail to resolve the router alias from `src/stores/settings.ts`, replace:

```ts
import router from '@/router';
```

with:

```ts
import router from '../router';
```

This matches the direct-test compatibility fix used by `src/services/records.ts` and does not change runtime behavior.

Implemented as a dynamic `await import('../router')` inside `updatePassword`, which keeps runtime behavior unchanged and avoids loading the router in direct store tests.

- [x] Create `tests/stores/settings.test.ts` with tests for loading and updating records settings:

```ts
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import { useSettingsStore } from '../../src/stores/settings';

const originalFetch = globalThis.fetch;
const originalLocalStorage = globalThis.localStorage;

const jsonResponse = (body: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

const localStorageStub = (): Storage =>
  ({
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  }) as Storage;

beforeEach(() => {
  setActivePinia(createPinia());
  globalThis.localStorage = localStorageStub();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalLocalStorage;
});

describe('settings store records settings', () => {
  test('loads records_settings from user settings', async () => {
    const userStore = useUserStore();
    userStore.setToken('token-123');
    const fetchMock = mock(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.endsWith('/users/me')) {
        return jsonResponse({
          name: 'runner',
          email: 'runner@example.com',
          full_name: null,
          is_active: true,
        });
      }
      return jsonResponse({
        settings: {
          default_type_id: 1,
          defautl_sub_type_id: null,
          locale: 'en',
          heatmap_settings: { excluded_activity_types: [] },
          records_settings: { default_activity_type: 2 },
        },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const settingsStore = useSettingsStore();
    await settingsStore.fetchAllSettings();

    expect(settingsStore.userSettings?.records_settings).toEqual({
      default_activity_type: 2,
    });
  });

  test('patches records settings and refreshes settings', async () => {
    const userStore = useUserStore();
    userStore.setToken('token-123');
    const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.endsWith('/users/me/records_settings')) {
        expect(init).toEqual(
          expect.objectContaining({
            method: 'PATCH',
            headers: {
              Authorization: 'Bearer token-123',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ default_activity_type: 3 }),
          })
        );
        return jsonResponse({});
      }
      if (url.endsWith('/users/me')) {
        return jsonResponse({
          name: 'runner',
          email: 'runner@example.com',
          full_name: null,
          is_active: true,
        });
      }
      return jsonResponse({
        settings: {
          default_type_id: 1,
          defautl_sub_type_id: null,
          locale: 'en',
          heatmap_settings: { excluded_activity_types: [] },
          records_settings: { default_activity_type: 3 },
        },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const settingsStore = useSettingsStore();
    await expect(settingsStore.updateRecordsSettings(3)).resolves.toBe(true);
    expect(settingsStore.userSettings?.records_settings?.default_activity_type).toBe(3);
  });
});
```

- [x] Run the new test and confirm it fails before implementation:

```bash
bun test tests/stores/settings.test.ts
```

Expected before implementation: failure because `records_settings` and/or `updateRecordsSettings` are missing.

- [x] Implement the store changes.

- [x] Run:

```bash
bun test tests/stores/settings.test.ts
```

Expected after implementation: all settings store tests pass.

## Task 2: Add Records Settings Form

**Files:**
- Create: `src/components/forms/RecordsSettingsForm.vue`

- [x] Create the form component:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import type { RecordsSettings } from '@/stores/settings';
import type { ActivityType } from '@/stores/types';

const props = defineProps<{
  initialSettings: RecordsSettings | null;
  activityTypes: ActivityType[];
}>();

const emit = defineEmits<{
  (e: 'save', defaultActivityType: number): void;
  (e: 'cancel'): void;
}>();

const fallbackTypeId = computed(() => props.activityTypes[0]?.id ?? null);
const selectedTypeId = ref<number | null>(
  props.initialSettings?.default_activity_type ?? fallbackTypeId.value
);

const canSave = computed(() => selectedTypeId.value !== null);

function onSave() {
  if (selectedTypeId.value === null) return;
  emit('save', selectedTypeId.value);
}
</script>

<template>
  <div class="space-y-4 pt-2">
    <p class="text-sm text-verve-brown/60">
      Choose which activity type opens first in the records trophy case.
    </p>

    <div v-if="activityTypes.length === 0" class="text-verve-brown/40 text-sm">
      Loading types...
    </div>

    <label v-else class="block">
      <span class="block text-xs font-bold text-verve-brown/60 uppercase mb-2">
        Default records activity type
      </span>
      <select
        v-model.number="selectedTypeId"
        class="w-full"
        aria-label="Default records activity type"
      >
        <option v-for="activityType in activityTypes" :key="activityType.id" :value="activityType.id">
          {{ activityType.name }}
        </option>
      </select>
    </label>

    <div class="flex justify-end gap-3 pt-4 border-t border-verve-medium/30">
      <button
        type="button"
        class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors"
        @click="$emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="button"
        class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all disabled:opacity-50"
        :disabled="!canSave"
        @click="onSave"
      >
        Save Changes
      </button>
    </div>
  </div>
</template>
```

## Task 3: Add Records Configuration To Settings Page

**Files:**
- Modify: `src/views/SettingsView.vue`

- [x] Import the new form:

```ts
import RecordsSettingsForm from '@/components/forms/RecordsSettingsForm.vue';
```

- [x] Add UI state:

```ts
const isRecordsEditing = ref(false);
```

- [x] Add a computed label:

```ts
const recordsDefaultTypeName = computed(() => {
  const typeId = settingsStore.userSettings?.records_settings?.default_activity_type;
  if (!typeId) return 'Not Set';
  const foundType = typeStore.activityTypes.find((t) => t.id === typeId);
  return foundType?.name ?? `ID #${typeId}`;
});
```

- [x] Add save handler:

```ts
async function handleRecordsSave(defaultActivityType: number) {
  const success = await settingsStore.updateRecordsSettings(defaultActivityType);
  if (success) isRecordsEditing.value = false;
}
```

- [x] Add a “Records Configuration” section after Heatmap Configuration and before the version footer:

```vue
<div class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30">
  <div class="flex justify-between items-center border-b border-verve-medium/30 pb-4 mb-4">
    <div>
      <h2 class="text-xl font-bold text-verve-brown">Records Configuration</h2>
      <p class="text-sm text-verve-brown/60 mt-1">
        Choose the activity type shown first in your trophy case.
      </p>
    </div>

    <button
      v-if="!isRecordsEditing"
      class="px-4 py-2 border border-verve-medium/50 rounded-xl text-sm font-semibold text-verve-brown hover:bg-verve-light transition-colors"
      @click="isRecordsEditing = true"
    >
      Edit Default
    </button>
  </div>

  <RecordsSettingsForm
    v-if="isRecordsEditing"
    :initial-settings="settingsStore.userSettings?.records_settings ?? null"
    :activity-types="typeStore.activityTypes"
    @save="handleRecordsSave"
    @cancel="isRecordsEditing = false"
  />

  <div v-else>
    <p class="text-xs font-bold text-verve-brown/60 uppercase mb-1">
      Default Records Activity Type
    </p>
    <p class="text-verve-brown font-medium">{{ recordsDefaultTypeName }}</p>
  </div>
</div>
```

- [x] Run:

```bash
bun run type-check
```

Expected: no TypeScript errors from the new settings form integration.

## Task 4: Require A Concrete Type In Records Store

**Files:**
- Modify: `src/stores/records.ts`
- Test: `tests/stores/records.test.ts`

- [x] Create `tests/stores/records.test.ts` covering concrete type fetches and null guard behavior:

```ts
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import { useRecordsStore } from '../../src/stores/records';

const originalFetch = globalThis.fetch;
const originalLocalStorage = globalThis.localStorage;

const jsonResponse = (body: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

beforeEach(() => {
  setActivePinia(createPinia());
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  } as Storage;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalLocalStorage;
});

describe('records store type filter', () => {
  test('uses a concrete type_id for overview fetches', async () => {
    const userStore = useUserStore();
    userStore.setToken('token-123');
    const fetchMock = mock(async () => jsonResponse({ data: {} }));
    globalThis.fetch = fetchMock as typeof fetch;

    const recordsStore = useRecordsStore();
    recordsStore.setInitialTypeId(2);
    await recordsStore.fetchOverview();

    expect(fetchMock).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_BASE_URL}/highlights/?year=${new Date().getFullYear()}&type_id=2`,
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' },
      })
    );
  });

  test('does not fetch overview without a concrete type_id', async () => {
    const fetchMock = mock(async () => jsonResponse({ data: {} }));
    globalThis.fetch = fetchMock as typeof fetch;

    const recordsStore = useRecordsStore();
    await recordsStore.fetchOverview();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(recordsStore.error).toBe('Choose an activity type to view records.');
  });
});
```

- [x] Run the test and confirm it fails before store changes:

```bash
bun test tests/stores/records.test.ts
```

Expected before implementation: failure because `setInitialTypeId` is missing and/or `fetchOverview` still allows `null`.

- [x] Update `src/stores/records.ts`:

```ts
function setInitialTypeId(nextTypeId: number) {
  typeId.value = nextTypeId;
}
```

- [x] Update `fetchOverview()` before setting `isLoading`:

```ts
if (typeId.value === null) {
  groups.value = [];
  selectedMetric.value = null;
  error.value = 'Choose an activity type to view records.';
  return;
}
```

- [x] Keep the existing API call, now relying on the guard:

```ts
await fetchRecordsOverview({ year: requestYear.value, typeId: typeId.value })
```

- [x] Update `setTypeId` to require a number:

```ts
async function setTypeId(nextTypeId: number) {
  typeId.value = nextTypeId;
  await fetchOverview();
}
```

- [x] Return `setInitialTypeId`.

- [x] Run:

```bash
bun test tests/stores/records.test.ts
```

Expected after implementation: records store tests pass.

## Task 5: Initialize Records Page From Records Settings

**Files:**
- Modify: `src/views/RecordsView.vue`

- [x] Import the settings store:

```ts
import { useSettingsStore } from '@/stores/settings';
```

- [x] Create the store instance:

```ts
const settingsStore = useSettingsStore();
```

- [x] Add a concrete default resolver:

```ts
function resolveInitialRecordsTypeId(): number | null {
  const recordsTypeId = settingsStore.userSettings?.records_settings?.default_activity_type;
  if (recordsTypeId && activityTypes.value.some((activityType) => activityType.id === recordsTypeId)) {
    return recordsTypeId;
  }

  const appDefaultTypeId = settingsStore.userSettings?.default_type_id;
  if (appDefaultTypeId && activityTypes.value.some((activityType) => activityType.id === appDefaultTypeId)) {
    return appDefaultTypeId;
  }

  return activityTypes.value[0]?.id ?? null;
}
```

- [x] Replace the current `onMounted` body:

```ts
onMounted(async () => {
  await Promise.all([
    typeStore.fetchActivityTypes(),
    settingsStore.fetchAllSettings(),
  ]);

  const initialTypeId = resolveInitialRecordsTypeId();
  if (initialTypeId !== null) {
    recordsStore.setInitialTypeId(initialTypeId);
  }

  await recordsStore.fetchOverview();
});
```

- [x] Update `setTypeFromSelect` so it never maps to `null`:

```ts
function setTypeFromSelect(event: Event) {
  const value = Number((event.target as HTMLSelectElement).value);
  if (Number.isInteger(value)) {
    void recordsStore.setTypeId(value);
  }
}
```

- [x] Remove the all-types option from the select:

```vue
<option v-for="activityType in activityTypes" :key="activityType.id" :value="activityType.id">
  {{ activityType.name }}
</option>
```

- [x] Confirm there is no remaining text `All activity types` in `src/views/RecordsView.vue`.

## Task 6: Preserve Existing Records Service Contract

**Files:**
- Modify only if tests require it: `src/services/records.ts`
- Test: `tests/services/records.test.ts`

- [x] Keep `RecordsQueryParams.typeId?: number | null` and `buildRecordsQuery` null behavior unchanged because other future callers may still omit `type_id`.

- [x] Do not change existing service tests that prove query-builder null behavior unless the service contract itself changes later.

- [x] Add this test only if implementation accidentally starts permitting unfiltered Records page calls through the store instead of through the service:

```ts
// Keep this behavior in tests/services/records.test.ts.
test('query builder can omit type_id for non-records-page callers', () => {
  expect(buildRecordsQuery({ year: 2026, typeId: null })).toBe('year=2026');
});
```

Expected: service remains a generic API wrapper; page/store enforce Records-page product policy.

## Task 7: Validation

**Files:**
- Review changed files only.

- [x] Run focused tests:

```bash
bun test tests/stores/settings.test.ts tests/stores/records.test.ts tests/services/records.test.ts tests/utils/records.test.ts
```

Expected: all focused tests pass.

- [x] Run TypeScript:

```bash
bun run type-check
```

Expected: no type errors.

- [x] Run full repository gate:

```bash
bun run check
```

Expected: harness checks, markdown links, OpenAPI freshness, agent rules, ESLint baseline, TypeScript, and build all pass.

- [x] Run diff distribution:

```bash
bun run diff:distribution
```

Expected: report includes records/settings source and store tests. Pre-existing untracked files may still appear under “other”; do not modify them unless the user explicitly asks.

- [x] Manual browser check:
  - Open `/records`.
  - Confirm the first highlights request is `/highlights/?year=<currentYear>&type_id=<records_settings.default_activity_type>`.
  - Confirm the type dropdown contains only concrete activity types and no “All activity types” option.
  - Switch the type dropdown and confirm the next highlights request includes the selected concrete `type_id`.
  - Open Settings, edit Records Configuration, save a different default type, reload `/records`, and confirm the saved type is selected by default.
  - Switch Lifetime and confirm the request omits `year` but still includes `type_id`.

Verified by the user in browser on 2026-06-19.

## Assumptions

- `records_settings.default_activity_type` is the canonical default for the Records page.
- The Records page must never show all-types or unfiltered highlights in this version.
- The generic records service can still support omitted `type_id`; the Records page/store layer owns the stricter product rule.
- If `records_settings` is missing or points at an unavailable activity type, fall back to `default_type_id`, then the first loaded activity type, and never fetch until a concrete type is available.
- Backend replaces records settings at `PATCH /users/me/records_settings` and does not require the frontend to parse a response body.
