# PSPEC-0002 Backend API Contract

## Objective
Keep frontend API work grounded in the backend OpenAPI source of truth.

## Source Of Truth
- Canonical contract: `backend_openapi.json`
- Generated compact map: `docs/generated/backend-openapi-summary.json`

## Rules
- Inspect the OpenAPI file before adding or changing API calls.
- Do not infer response shapes from UI assumptions.
- Keep boundary parsing explicit when converting API data into app state.
- Refresh the generated summary when `backend_openapi.json` changes.

## Acceptance Criteria
- `bun run check:api` passes.
- Any API-facing code change cites the relevant OpenAPI path or schema during review.
