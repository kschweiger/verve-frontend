# Admin

- Show Admin in the account dropdown only when `GET /api/v1/users/me` returns `is_admin: true`. Load account data after login and when restoring a saved session. The `/admin` route checks current admin status before rendering.
- Model API responses with TypeScript interfaces derived from `backend_openapi.json`; trust the backend contract without runtime response validators.
- Fetch the plain list of other users from `GET /api/v1/admin/users`. Add the current user from `/users/me` to the picker and select them by default. An empty list leaves the current user available. Failed list loading shows Retry and disables submission.
- Offer Reprocess tracks and Recalculate highlights for the selected user. Use `POST /api/v1/admin/reprocess_tracks` and `POST /api/v1/admin/recalculate_highlights`, always passing one `user_id` as a query parameter and no request body. Do not offer activity-targeted or all-user operations.
- Disable submissions while a request is pending. Do not automatically retry maintenance POST requests. Show submission errors inline without discarding earlier jobs.
- Store submitted jobs for the current frontend session, including returned track, completion, and highlight tasks. Display each run's target user. Refresh task status manually through `GET /api/v1/admin/tasks/{task_id}`; show the returned state, optional error, and expandable result without assuming terminal state values.
- Clear cached user lists and submitted jobs on logout, token changes, or revoked admin status. Ignore responses from previous sessions. A 401 clears authentication; a 403 removes admin access and returns the user to the dashboard.
- Backend authorization remains authoritative for every admin request. The menu and route checks control frontend navigation.
