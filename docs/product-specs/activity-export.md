# Activity Export

The export control is shown only after authenticated GET `/api/v1/activity/{id}/is_exportable` returns `{ "is_exportable": true }`. It stays hidden while checking, when false, or when the check fails. Activity/account changes reset eligibility and trigger a new check; stale responses are ignored. Successful eligibility does not guarantee a successful export.

Activity detail offers an Export split button beside Edit. The main action always downloads Verve GeoJSON. The arrow menu offers Verve GeoJSON (.geojson) and GPX (.gpx); choosing either downloads immediately without changing the main action.

The control's labels and status messages use the active app language. File format names and downloaded filenames use the documented format.

Both buttons are disabled while exporting, with visible and announced progress. Failures appear inline and the controls permit retry. Keyboard users can open the menu, navigate with arrows or Home/End, select with Enter/Space, dismiss with Escape, and leave with Tab. Selection and Escape return focus to the arrow; outside clicks dismiss the menu.

The authenticated GET `/api/v1/activity/{id}/export` uses `output_format=geojson|gpx` as defined in `backend_openapi.json`. Download the returned file unchanged as `activity-<id>.geojson` or `activity-<id>.gpx`; the contract specifies no filename header. The backend decides which track data can be exported, including 422 failures. Do not infer eligibility from map visibility.

Activity/account changes and unmount invalidate pending exports, preventing stale downloads. Temporary download links and object URLs are cleaned up.
