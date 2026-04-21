# Tech Debt Tracker

## Active Debt

| id | area | status | note |
|---|---|---|---|
| TD-0001 | ESLint baseline | active | Existing lint and type-safety violations are frozen in `docs/generated/eslint-baseline.json`; new violations are blocked by `bun run check:eslint-baseline`. |
| TD-0002 | API boundary parsing | active | Some existing API code maps untyped JSON directly. Future API work should parse unknown boundary data before storing it. |
| TD-0003 | Browser validation harness | future | No Playwright/CDP app-driving harness exists yet. Add once docs and local checks are stable. |
| TD-0004 | Observability harness | future | No local logs/metrics/traces harness exists yet. Add only after app-driving validation is useful. |

## Cleanup Policy
- Prefer small targeted cleanup pull requests.
- When recurring review feedback appears, encode it as a doc rule or check.
- Do not expand the ESLint baseline without explicit review.
