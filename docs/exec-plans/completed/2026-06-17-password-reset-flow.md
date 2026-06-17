# Password Reset Flow Execution Plan

> **For agentic workers:** Implement this task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add unauthenticated forgot/reset password pages wired to the new backend OpenAPI auth endpoints.

**Architecture:** Add a small password reset API service, two unauthenticated route-level views, and a login-page navigation link. Keep reset tokens out of Pinia/localStorage and derive request/response shapes from `backend_openapi.json`.

**Tech Stack:** Vue 3 Composition API, Vue Router, TypeScript, Pinia-adjacent service helpers, Bun tests, Vite.

**Status:** Implemented and validated on 2026-06-17.

**Validation completed:**
- `bun test tests/services/passwordReset.test.ts` - 4 tests passed.
- `bun run type-check` - passed.
- `bun run check` - passed.
- `bun run diff:distribution` - passed.

**Diff distribution summary:**

```text
source code changes: 5
test code changes: 1
documentation changes: 2
other changes: 4
```

**Manual workflow check:** Completed by the user after implementation. The login-to-forgot-password-to-reset workflow works.

---

## Repo Rules

- Follow Vue 3 `<script setup lang="ts">`, strict TypeScript, and no `any`.
- Use `backend_openapi.json` as the source of truth.
- Do not touch unrelated dirty files unless the task requires it.
- Keep unauthenticated routes outside `MainLayout`.

## Task 1: Add Password Reset API Service

**Files:**
- Create: `src/services/passwordReset.ts`

- [x] Create `src/services/passwordReset.ts`.
- [x] Define local interfaces matching the OpenAPI contract:

```ts
export interface PasswordForgotPayload {
  email: string;
}

export interface PasswordForgotResult {
  message: string;
  resetLink: string | null;
}

export interface PasswordResetPayload {
  token: string;
  new_password: string;
}
```

- [x] Add local parsing helpers:

```ts
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseApiError = (value: unknown, fallback: string): string => {
  if (!isRecord(value)) return fallback;

  if (typeof value.detail === 'string') return value.detail;

  if (Array.isArray(value.detail)) {
    const firstMessage = value.detail.find(
      (item): item is { msg: string } => isRecord(item) && typeof item.msg === 'string'
    );
    return firstMessage?.msg ?? fallback;
  }

  return fallback;
};
```

- [x] Implement `requestPasswordReset(email: string): Promise<PasswordForgotResult>`.
  - Send `POST ${import.meta.env.VITE_API_BASE_URL}/login/forgot-password`.
  - Use `Content-Type: application/json`.
  - Body must be `JSON.stringify({ email })`.
  - Parse `message` and optional `reset_link`.
  - Throw `Error` with parsed backend message on non-OK responses.

- [x] Implement `resetPassword(payload: PasswordResetPayload): Promise<void>`.
  - Send `POST ${import.meta.env.VITE_API_BASE_URL}/login/reset-password`.
  - Use `Content-Type: application/json`.
  - Body must be `JSON.stringify(payload)`.
  - Throw `Error` with parsed backend message on non-OK responses.

## Task 2: Add Unit Tests

**Files:**
- Create: `tests/services/passwordReset.test.ts`

- [x] Create `tests/services/passwordReset.test.ts`.
- [x] Use `bun:test`.
- [x] Mock `globalThis.fetch` in each test and restore it after each test.
- [x] Cover forgot-password request shape:

```ts
expect(fetchMock).toHaveBeenCalledWith(
  `${import.meta.env.VITE_API_BASE_URL}/login/forgot-password`,
  expect.objectContaining({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@example.com' }),
  })
);
```

- [x] Cover forgot-password response parsing:
  - `{ message: 'Reset link generated.', reset_link: '/reset-password?token=abc' }`
  - expected result `{ message: 'Reset link generated.', resetLink: '/reset-password?token=abc' }`
- [x] Cover missing or null `reset_link` returning `resetLink: null`.
- [x] Cover reset-password request shape:

```ts
expect(fetchMock).toHaveBeenCalledWith(
  `${import.meta.env.VITE_API_BASE_URL}/login/reset-password`,
  expect.objectContaining({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'abc', new_password: 'newpassword123' }),
  })
);
```

- [x] Cover non-OK FastAPI validation payload parsing:

```ts
{
  detail: [{ loc: ['body', 'new_password'], msg: 'String should have at least 8 characters', type: 'string_too_short' }]
}
```

- [x] Run:

```bash
bun test tests/services/passwordReset.test.ts
```

Expected: all tests pass.

## Task 3: Add Forgot Password View

**Files:**
- Create: `src/views/ForgotPasswordView.vue`

- [x] Create `ForgotPasswordView.vue` using `<script setup lang="ts">`.
- [x] Import `ref`, `RouterLink`, `requestPasswordReset`, and `logo`.
- [x] Add state:
  - `email`
  - `isSubmitting`
  - `errorMessage`
  - `successMessage`
  - `resetLink`
- [x] Implement submit behavior:
  - clear previous messages.
  - call `requestPasswordReset(email.value)`.
  - set `successMessage` from backend `message`.
  - set `resetLink` from backend `resetLink`.
  - show parsed error on failure.
  - always clear `isSubmitting`.
- [x] Build a login-style centered card:
  - Verve logo.
  - email input with accessible label.
  - submit button.
  - success panel with backend message.
  - clickable `resetLink` when present with text `Open reset link`.
  - `RouterLink` back to `{ name: 'login' }`.
- [x] Disable the input and submit button while submitting.

## Task 4: Add Reset Password View

**Files:**
- Create: `src/views/ResetPasswordView.vue`

- [x] Create `ResetPasswordView.vue` using `<script setup lang="ts">`.
- [x] Import `computed`, `ref`, `RouterLink`, `useRoute`, `resetPassword`, and `logo`.
- [x] Read token from URL:
  - prefer `route.query.token` when it is a string.
  - fall back to `route.params.token` when it is a string.
  - otherwise use an empty string.
- [x] Add state:
  - `newPassword`
  - `confirmPassword`
  - `isSubmitting`
  - `errorMessage`
  - `successMessage`
- [x] Add frontend validation before submit:
  - token is required.
  - both password fields are required.
  - passwords must match.
  - password length must be between 8 and 40 characters.
- [x] On submit, call:

```ts
await resetPassword({ token: resetToken.value, new_password: newPassword.value });
```

- [x] On success:
  - clear both password fields.
  - show `Password reset successfully. You can now sign in.`
  - show `RouterLink` to `{ name: 'login' }`.
- [x] On missing token:
  - show a missing-token error state.
  - show a `RouterLink` to `{ name: 'forgot-password' }`.
- [x] Do not log in automatically and do not store the token.

## Task 5: Wire Routes

**Files:**
- Modify: `src/router/index.ts`

- [x] Import:

```ts
import ForgotPasswordView from '@/views/ForgotPasswordView.vue';
import ResetPasswordView from '@/views/ResetPasswordView.vue';
```

- [x] Add top-level unauthenticated routes near `/login`:

```ts
{
  path: '/forgot-password',
  name: 'forgot-password',
  component: ForgotPasswordView,
},
{
  path: '/reset-password/:token?',
  name: 'reset-password',
  component: ResetPasswordView,
},
```

- [x] Keep the existing auth guard unchanged except for allowing these routes by omission from `requiresAuth`.
- [x] Do not redirect authenticated users away from reset pages.

## Task 6: Update Login UI

**Files:**
- Modify: `src/components/LoginForm.vue`

- [x] Add a `RouterLink` to `{ name: 'forgot-password' }` near the password field.
- [x] Use visible text `Forgot password?`.
- [x] Match the existing login form link styling.
- [x] Keep login submit behavior unchanged.

## Task 7: Manual Flow Checks

- [x] Run the dev server:

```bash
bun run dev
```

- [x] Verify in browser:
  - `/login` shows a forgot-password link.
  - clicking the link opens `/forgot-password`.
  - submitting an email calls `/login/forgot-password`.
  - a backend `reset_link` is displayed as a clickable link.
  - `/reset-password?token=abc` shows the reset form.
  - `/reset-password/abc` shows the reset form.
  - `/reset-password` shows the missing-token state.
  - successful reset shows a login link.

## Task 8: Final Validation

- [x] Run focused tests:

```bash
bun test tests/services/passwordReset.test.ts
```

- [x] Run type checking:

```bash
bun run type-check
```

- [x] Run full validation:

```bash
bun run check
```

- [x] Run diff distribution:

```bash
bun run diff:distribution
```

- [x] Include the `diff:distribution` summary in the final handoff.

## Acceptance Criteria

- User can navigate from login to forgot-password.
- Forgot-password posts the email to `/login/forgot-password`.
- Returned `reset_link` is displayed as a clickable link.
- Reset page extracts token from `?token=` and `/reset-password/:token`.
- Reset page posts `{ token, new_password }` to `/login/reset-password`.
- No `any`, no Options API, and no authenticated-route requirement for reset pages.
