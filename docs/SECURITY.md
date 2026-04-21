# SECURITY

## Frontend Security Rules
- Do not use `v-html` without explicit approval and sanitization strategy.
- Do not log tokens, credentials, or personally sensitive user data.
- Keep authentication headers centralized through existing API helpers and stores.
- Do not add dependencies that execute remote code during normal app runtime.
- Validate unknown API boundary data before trusting it.

## Escalation
Escalate before changes that affect:
- authentication or authorization posture,
- token storage,
- deployment secrets,
- billing or paid external services,
- destructive production actions.
