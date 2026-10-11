# Dashboard and Calendar

## Dashboard

- Activity history, summary metrics, recent activities, goals, and curated records form the activity overview. A header Add action opens upload and manual creation.
- `GET /api/v1/statistics/activity-grid?weeks=52` is the shared history and summary source. The backend owns aggregation; the frontend formats and renders it.
- At widths of 1024px and above, show 52 weeks with Monday–Sunday rows. Below 1024px, show the trailing 12 weeks in chronological order without changing the request or summary period.
- Grid intensity uses activity duration. Active cells expose date, activity count, and active duration; show total duration separately when it differs. Details are available through mouse, keyboard, and touch interaction.
- Inactive and future cells do not expose activity details or enter the keyboard tab order. Details must not clip or shift the layout.
- The four summary cards show Active time, This month, Last active, and Week streak using backend `totals` and `summary`; do not recompute summary semantics from grid cells.
- A null last-active date displays No activity. Relative dates and streak labels use readable singular/plural formatting.
- Recent activities prioritize duration, with distance secondary. Their entries navigate to activity detail.

## Calendar

- Below 1024px, show an ordered agenda for the selected month, including rest days and excluding adjacent-month dates.
- At 1024px and above, show the desktop calendar with its weekly-summary column.
- Month navigation uses the existing calendar API. Do not show stale previous-month data while the next month loads.
- Compact history and calendar layouts must fit narrow screens without horizontal overflow.

## Validation Status

The responsive layouts passed automated checks in September 2026. Authenticated browser validation was still pending in the original implementation record; it is not implied by this spec.
