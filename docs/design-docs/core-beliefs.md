# DDES-0001 Core Beliefs for Agent-First Frontend Delivery

## Intent
Define repository-level principles that make autonomous implementation reliable.

## Beliefs
1. Humans define intent; agents execute implementation loops.
2. Architecture constraints accelerate delivery when they are explicit and enforced.
3. Repository-local knowledge is mandatory for repeatable agent behavior.
4. Backend API contracts must be visible to agents through versioned artifacts.
5. Recurring feedback should become checks, not repeated manual comments.
6. Fast bounded validation loops outperform large unvalidated batches.

## Consequences
- Keep documentation index-first and linked.
- Promote persistent review feedback into rules and checks.
- Preserve deterministic outputs for machine consumers.
- Keep API-facing work grounded in `backend_openapi.json`.
