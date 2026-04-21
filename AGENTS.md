# AGENTS.md

## Purpose
This repository is agent-first and harness-oriented.
`AGENTS.md` is intentionally short: it is a map, not the full manual.

## Start Here
1. Read `ARCHITECTURE.md`.
2. Open the indexes:
   - `docs/design-docs/index.md`
   - `docs/product-specs/index.md`
   - `docs/references/index.md`
3. For frontend implementation, read `docs/FRONTEND.md`.
4. For backend-facing work, read `backend_openapi.json` and `docs/generated/backend-openapi-summary.json`.

## Navigation Map
- Architecture and boundaries: `ARCHITECTURE.md`
- Frontend coding rules: `docs/FRONTEND.md`
- Product judgment: `docs/PRODUCT_SENSE.md`
- Design guidance: `docs/DESIGN.md`
- Reliability and security: `docs/RELIABILITY.md`, `docs/SECURITY.md`
- Plans and debt: `docs/PLANS.md`, `docs/exec-plans/tech-debt-tracker.md`
- End-to-end operating skill: `SKILL.md`

## Agent-First Rules
- Use progressive disclosure: indexes first, details second.
- Repository-local, versioned artifacts are the source of truth.
- Define one concrete success check before editing.
- Keep runtime Vue behavior unchanged unless the task explicitly asks for product behavior.
- If behavior or policy changes, update docs and enforcement in the same change set.

## Frontend Invariants
- Vue 3 Composition API only. Never use Options API objects such as `data`, `methods`, or `computed`.
- Every component script must use `<script setup lang="ts">`.
- TypeScript must be strict. Do not introduce `any`; use `unknown`, explicit interfaces, or generated API types.
- Tailwind CSS v4 is CSS-first. Use `@theme`, `grow`, slash opacity, and theme variables.
- Use Pinia for shared state, Lucide for icons, PascalCase component files, and camelCase variables.
- API-facing code must derive shapes from `backend_openapi.json`; do not guess backend response data.
- Do not use `v-html`, CommonJS `require`, or `this` in scripts.

## Validation Loop
- Run `bun run check` before handoff for non-trivial changes.
- Run narrower checks during the loop when they directly match the edit.
- Existing ESLint issues are frozen in `docs/generated/eslint-baseline.json`; do not add new ones.
- Final handoff should include a diff distribution report from `bun run diff:distribution`.

## Escalation Policy
Escalate to a human when:
- destructive or irreversible production action is required,
- security or billing posture changes are needed,
- secrets or external credentials are required,
- policy intent cannot be inferred from repository artifacts.
