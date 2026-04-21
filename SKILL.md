---
name: "verve-frontend-harness"
description: "Operating skill for agent-first Vue frontend implementation loops in Verve."
---

# Verve Frontend Harness Skill

## When To Use
- Use for any non-trivial Verve frontend code, docs, CI, or tooling change.
- Use when work touches backend API integration, frontend architecture, or agent policy.
- Use when changes need bounded validation and review-loop closure.

## Workflow
1. Load context progressively: `AGENTS.md` -> `ARCHITECTURE.md` -> docs indexes.
2. For API work, inspect `backend_openapi.json` before touching code.
3. Define one concrete success check before edits.
4. Implement the smallest coherent patch that can pass that check.
5. Run focused checks, inspect failures, and revise.
6. Run `bun run check` before handoff for non-trivial work.
7. Run `bun run diff:distribution` and include the result in the handoff.

## Frontend Rules
- Vue 3 Composition API only with `<script setup lang="ts">`.
- Strict TypeScript intent. Do not introduce `any`.
- Tailwind CSS v4 CSS-first configuration; prefer utilities over custom CSS.
- Use ARIA labels and accessible controls for interactive UI.
- Keep components small and single-purpose; move complex logic into `src/composables/use*.ts`.
- Preserve existing public component/store/router interfaces unless the task asks for a change.

## Escalation Triggers
Escalate to a human when:
- destructive production action is required,
- secrets or external credentials are required,
- security or billing posture changes are proposed,
- policy intent remains ambiguous after reading repository artifacts.
