# AGENTS.md

Verve is a Vue frontend for reviewing, organizing, and comparing activity data.

## Backend API Contract — Required

**`backend_openapi.json` is the canonical source of truth for the backend API. Before adding or changing any API integration, read the relevant paths and schemas in this file.** This includes requests, response parsing, API types, and stores or UI that consume backend data.

- Derive endpoint paths, HTTP methods, parameters, payloads, response shapes, and nullability from the OpenAPI contract. Never guess them from existing code, examples, product specs, or UI needs.
- If another repository artifact conflicts with `backend_openapi.json` about the API contract, follow `backend_openapi.json` and correct the conflicting artifact.
- If required behavior is missing or ambiguous in the contract, flag the gap before implementing dependent API code. Do not invent backend capabilities or silently change the contract to fit the frontend.
- Define TypeScript interfaces and types from the OpenAPI response schemas, including required fields and nullability. Trust backend responses to conform to this contract; use these types when reading JSON. Do not add runtime response validators or duplicate backend validation rules unless explicitly requested.

## Context

- Read the relevant [product specs](docs/product-specs/index.md) when changing business behavior. Keep them current when that behavior changes.
- App code lives in `src/`; tests live in `tests/`. Follow nearby patterns and preserve unrelated changes.

## Conventions

- Vue 3 Composition API with `<script setup lang="ts">` only.
- Strict TypeScript; do not introduce `any`, Options API, `this` in scripts, CommonJS `require`, or `v-html`.
- Tailwind CSS v4: CSS-first `@theme`, `grow`, slash opacity, and existing theme variables in `src/assets/main.css`.
- Use Pinia for shared state, Lucide icons, PascalCase component files, and camelCase variables. Extract reusable logic into `src/composables/use*.ts`.
- Keep controls accessible, with semantic elements, accessible names, and visible focus states. Preserve the Verve palette and avoid nested cards.
- Keep authentication headers in existing API helpers. Never log tokens, credentials, or sensitive user data.

## Commands

- `bun run dev` starts the app.
- `bun run check` runs the ESLint baseline check, Vue type check, and production build. Run it before handing off non-trivial changes.
- `bun test` runs the test suite; use focused tests for affected behavior.
- `bun run lint:check` checks against existing lint debt in `docs/generated/eslint-baseline.json`. Do not expand the baseline to accept new violations.

Ask before destructive production actions or changes to security, billing, or external credentials.
