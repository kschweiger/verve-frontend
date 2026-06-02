# Activity Metadata Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor activity metadata display so activity detail dispatches metadata by `target` through a registry instead of knowing about swimming directly.

**Architecture:** Keep `Activity.metaData` as the raw backend object, parse known metadata targets through `src/activityMetadata/registry.ts`, and render parsed metadata through a generic wrapper component. Swimming remains the only registered metadata type and keeps its domain-specific widget.

**Tech Stack:** Vue 3 Composition API with `<script setup lang="ts">`, TypeScript strict types, Bun tests, Tailwind CSS v4 utilities.

---

## Task 1: Add Registry Tests

**Files:**
- Create: `tests/activityMetadata/registry.test.ts`

- [x] Write tests that assert swimming metadata dispatches by `target`, unknown targets return `null`, and missing targets return `null`.
- [x] Run `bun test tests/activityMetadata/registry.test.ts`.
- [x] Confirm the test fails because `src/activityMetadata/registry.ts` does not exist.

## Task 2: Move Swimming Parser Into Metadata Area

**Files:**
- Move: `src/utils/swimmingMetadata.ts` to `src/activityMetadata/swimming.ts`
- Move: `tests/utils/swimmingMetadata.test.ts` to `tests/activityMetadata/swimming.test.ts`

- [x] Create `src/activityMetadata/`.
- [x] Move the swim parser file.
- [x] Move the swim parser test file.
- [x] Update the swim parser test import to `../../src/activityMetadata/swimming`.
- [x] Update `SwimmingMetadataWidget.vue` to import swim types from `@/activityMetadata/swimming`.
- [x] Keep `parseSwimmingMetadata` and `extractSwimmingMetadataFromVerveFile` behavior unchanged.
- [x] Run `bun test tests/activityMetadata/swimming.test.ts`.

## Task 3: Add Registry Types And Dispatch

**Files:**
- Create: `src/activityMetadata/types.ts`
- Create: `src/activityMetadata/registry.ts`

- [x] Add `ActivityMetadataKind = 'swimming'`.
- [x] Add `ActivityMetadataDefinition<TData>`.
- [x] Add `ParsedActivityMetadata<TData = unknown>`.
- [x] Add a swimming definition with `target: 'SwimmingMetaData'`, `kind: 'swimming'`, and `parse: parseSwimmingMetadata`.
- [x] Implement `parseActivityMetadata(raw)` so it returns parsed known metadata or `null`.
- [x] Run registry and swim parser tests.

## Task 4: Add Generic Renderer Component

**Files:**
- Create: `src/components/widgets/ActivityMetadataWidget.vue`

- [x] Import `SwimmingMetadataWidget`.
- [x] Import `ActivityMetadataKind` and `ParsedActivityMetadata`.
- [x] Add a `components` map keyed by metadata kind.
- [x] Render `<component :is="component" :metadata="metadata.data" />`.
- [x] Keep unknown metadata handling out of the renderer because the registry filters it.

## Task 5: Decouple Activity Detail From Swimming

**Files:**
- Modify: `src/views/ActivityDetailView.vue`

- [x] Replace direct `SwimmingMetadataWidget` import with `ActivityMetadataWidget`.
- [x] Replace direct `parseSwimmingMetadata` import with `parseActivityMetadata`.
- [x] Replace `swimmingMetadata` computed with `activityMetadata`.
- [x] Render `<ActivityMetadataWidget v-if="activityMetadata" :metadata="activityMetadata" />`.
- [x] Do not change any map, segment, chart, tags, gallery, locations, or equipment behavior.

## Task 6: Add Extension Note

**Files:**
- Modify: `docs/product-specs/verve-swimming-metadata.md`

- [x] Add a short frontend display extension section explaining that `meta_data.target` dispatches to parser/widget registry entries.
- [x] State that unknown metadata targets are hidden until a display implementation exists.

## Validation

- [x] Run `bun test tests/activityMetadata/swimming.test.ts`.
- [x] Run `bun test tests/activityMetadata/registry.test.ts`.
- [x] Run `bun run type-check`.
- [x] Run `bun run check`.
- [x] Run `bun run diff:distribution`.

## Assumptions

- No generic fallback UI for unknown metadata in this pass.
- No backend API changes.
- No swim widget redesign.
- Future metadata types add a parser, a widget, a registry definition, and a renderer-map entry.
