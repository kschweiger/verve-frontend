# Password Reset

- The login page links to the forgot-password flow. Forgot and reset pages are unauthenticated and outside the authenticated app layout.
- Forgot-password submission sends the email to the OpenAPI-defined auth endpoint. Display the returned message and optional development reset link when supplied by the backend.
- Reset submission sends the reset token and new password to the OpenAPI-defined auth endpoint.
- Keep reset tokens out of Pinia and localStorage. Do not log tokens or credentials.
- Handle missing tokens, password validation, pending requests, API failures, and successful reset explicitly. Successful reset allows the user to return to login.
- Request and response fields come from `backend_openapi.json`; do not assume a reset link is always present.
