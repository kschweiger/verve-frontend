# PSPEC-0001 Agent Harness Operating Contract

## Objective
Enable human-steered, agent-executed Vue frontend development with deterministic checks, explicit boundaries, and repository-local knowledge governance.

## Functional Behavior
1. Repository exposes a short map in `AGENTS.md`.
2. Architecture and policy constraints are codified in `ARCHITECTURE.md` and `docs/`.
3. Every non-trivial change defines at least one concrete success check before edits.
4. Non-trivial changes run the review loop policy before handoff.
5. Knowledge drift is tracked through `docs/QUALITY_SCORE.md` and `docs/exec-plans/tech-debt-tracker.md`.
6. `backend_openapi.json` is required for backend-facing work.
7. Existing ESLint violations are frozen in `docs/generated/eslint-baseline.json`.
8. New ESLint violations fail `bun run check:eslint-baseline`.
9. Forbidden agent patterns fail `bun run check:agent-rules`.

## Acceptance Criteria
1. Required docs and indexes exist and are cross-linked.
2. `bun run check:harness` passes.
3. `bun run check:links` passes.
4. `bun run check:api` passes.
5. `bun run check:agent-rules` passes.
6. `bun run check:eslint-baseline` passes.
7. CI runs `bun run check` on pull requests and `main`.
