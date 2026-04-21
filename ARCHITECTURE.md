# ARCHITECTURE.md

## Target State
Verve Frontend is a Vue 3 application maintained through an agent-first coding harness.

The repository is designed for:
- explicit frontend and API boundaries,
- progressive disclosure of repository knowledge,
- deterministic local validation,
- mechanically enforced policy checks.

## Harness Topology
The harness follows six workflow layers:

1. Intent Intake
   - Human supplies task intent and acceptance criteria.
   - Agent confirms constraints from repository-local docs and `backend_openapi.json`.
2. Plan and Decomposition
   - Non-trivial work defines one concrete success check before edits.
   - Complex work is captured under `docs/exec-plans/active/`.
3. Execution Runtime
   - Agents use Bun, Vite, Vue TypeScript checks, ESLint, and repository scripts directly.
   - Edits stay scoped to the task and preserve unrelated user changes.
4. Validation and Observation
   - `bun run check` validates harness docs, links, API summary, agent rules, ESLint baseline, types, and build.
   - Failures feed back into the next bounded loop.
5. Review and Merge Loop
   - Agents self-review before handoff.
   - Non-trivial changes should receive an additional agent review where available.
6. Governance and Garbage Collection
   - Drift is tracked in `docs/QUALITY_SCORE.md` and `docs/exec-plans/tech-debt-tracker.md`.
   - Recurring feedback should become docs or mechanical checks.

## Boundary Contracts
Required boundary rules:

1. Repository-local docs are authoritative for agent behavior.
2. `AGENTS.md` is a map; detailed policy belongs under `docs/`.
3. Backend contracts come from root `backend_openapi.json`.
4. API summaries under `docs/generated/` must be refreshed when the OpenAPI contract changes.
5. Rules that matter should be mechanically checkable in `scripts/` or CI.

Disallowed patterns:

- Monolithic instruction files that are not index-first.
- Policy-only guidance with no corresponding enforcement.
- API shape guessing when `backend_openapi.json` contains the contract.
- Architecture or behavior changes without synchronized doc updates.

## Quality Gates
Required before handoff for non-trivial work:

1. `bun run check`
2. `bun run diff:distribution`

Useful focused checks:

- `bun run check:harness`
- `bun run check:api`
- `bun run check:agent-rules`
- `bun run check:eslint-baseline`
- `bun run type-check`
