# RELIABILITY

## Local Reliability
- `bun run check` is the default pre-handoff gate.
- `bun run type-check` must pass before user-facing TypeScript changes are handed off.
- `bun run build-only` must pass for production build confidence.
- API contract changes must refresh `docs/generated/backend-openapi-summary.json`.

## Failure Handling
- Treat failed checks as feedback for the next bounded loop.
- Keep error messages actionable for future agents.
- Avoid hidden side effects in scripts.
- Do not require secrets or external credentials for local checks.
