# QUALITY_SCORE

Quality rubric per harness domain.

| domain | score_0_to_5 | rationale | target | owner |
|---|---:|---|---:|---|
| Knowledge map and discoverability | 3 | Harness docs and indexes are established. | 5 | Engineering |
| Mechanical policy enforcement | 3 | Required docs, links, API summary, agent rules, and ESLint baseline are checked. | 5 | Engineering |
| Validation loop reliability | 3 | `bun run check` provides a single local and CI gate. | 5 | Engineering |
| API contract legibility | 3 | `backend_openapi.json` is required and summarized under `docs/generated/`. | 5 | Engineering |
| Drift and debt management | 2 | Legacy ESLint debt is baselined and tracked for follow-up cleanup. | 4 | Engineering |
