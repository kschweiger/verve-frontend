# FRONTEND

This file is the canonical frontend guidance for agents working in Verve.

## Stack
- Framework: Vue 3.5+ with Composition API.
- Component syntax: `<script setup lang="ts">`.
- Language: TypeScript with strict typing intent.
- Styling: Tailwind CSS v4 with CSS-first configuration in `src/assets/main.css`.
- State: Pinia stores under `src/stores/`.
- Icons: Lucide via `lucide-vue-next`.
- Build runtime: Bun, Vite, and `vue-tsc`.

## Coding Rules
- Use `ref`, `reactive`, `computed`, and plain `const` declarations. Never use Options API objects.
- Define props and emits with `defineProps<{ ... }>()` and `defineEmits<{ ... }>()`.
- Use `defineModel` for two-way bindings when a component owns that contract.
- Use PascalCase for component filenames and camelCase for variables.
- Move complex reusable logic into `src/composables/use*.ts`.
- Keep components focused on one responsibility.
- Add ARIA labels or accessible names for interactive controls.

## Tailwind CSS v4
- Configure theme values with `@theme` in CSS, not `tailwind.config.js`.
- Use `grow`, not `flex-grow`.
- Use slash opacity syntax such as `bg-blue-500/50`.
- Prefer utilities over custom CSS.
- When custom CSS is necessary, use theme variables such as `var(--color-verve-dark)`.

## API Work
- Root `backend_openapi.json` is the backend API source of truth.
- Read `docs/generated/backend-openapi-summary.json` for a compact map, then inspect the OpenAPI source for exact schemas.
- Do not probe data shapes or guess response structures.
- Parse unknown boundary data before mapping it into application state.

## Forbidden Patterns
- No `v-html` unless a task explicitly approves it and includes a security rationale.
- No Options API (`data`, `methods`, `computed` objects).
- No `this` inside scripts.
- No CommonJS `require`; use ESM imports.
- No new `any` usage. Existing violations are tracked in `docs/generated/eslint-baseline.json`.
- No old Tailwind color names such as `lightBlue`; use current names such as `sky`.
