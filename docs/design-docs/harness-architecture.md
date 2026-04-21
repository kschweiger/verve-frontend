# DDES-0002 Agentic Harness Architecture

## Intent
Define an enforceable harness architecture for high-throughput frontend delivery without drift.

## Layers
1. Intent Intake
2. Plan and Decomposition
3. Execution Runtime
4. Validation and Observation
5. Review and Merge Loop
6. Governance and Garbage Collection

Each layer has one primary responsibility and explicit handoff artifacts.

## Boundary Rules
- Knowledge must be encoded in versioned repository artifacts.
- `AGENTS.md` remains map-first and short.
- Detailed frontend and policy rules live under `docs/`.
- Backend API behavior is non-authoritative until represented in `backend_openapi.json`.
- Rule changes require synchronized updates to enforcement scripts or CI.

## Enforcement Direction
- Validate required docs and index references.
- Validate local Markdown links offline.
- Validate generated OpenAPI summary freshness.
- Validate forbidden agent patterns in source files.
- Validate no net-new ESLint issues beyond the frozen baseline.
