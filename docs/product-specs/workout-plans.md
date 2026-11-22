# Workout plans

Authenticated users can find Workout Plans under Planning on desktop and mobile. The overview lists plans alphabetically with exercise entry counts. Users can create an empty plan or add active catalog exercises, including repeated exercises. Each entry has optional sets, repetitions and weight in kilograms; zero weight is valid. Entries are unordered.

A saved plan opens read-only. Edit changes its name or replaces its exercise entries; Cancel discards the draft. A name conflict is shown at the name field and other save failures preserve the draft. Saved exercises no longer active remain visible and can be edited or removed, but cannot be newly selected. If an exercise label cannot be loaded, the entry remains and the lookup can be retried.

A saved plan shows a collapsed section beneath its exercises with the number of explicitly linked activities and the date of the latest activity in its local timezone. Expanding it shows activities newest first by start instant, with ten rows per page. Each row opens the activity detail and shows the activity-local date and time. The frontend paginates the list returned by the API. Loading, empty, and retry states are local to the section. The section is hidden while editing.

Duplicate creates an independent copy with a chosen name, including inactive entries. Delete requires confirmation naming the plan.

Strength Training activities without a saved workout can apply a template to create an independent workout snapshot. A saved snapshot opens in the workout summary, including when its exercise list is empty. Edit opens a draft with the exercise and target controls used in Planning. Users can add active exercises, including repeats, and edit or remove existing inactive exercises. Save replaces the activity's exercise entries. Cancel discards the draft.

Each saved exercise row offers **Delete** in the workout summary. This removes that individual entry as soon as the server confirms the deletion. Deleting the last entry leaves a saved empty workout.

**Delete workout** asks for confirmation, then removes the activity's workout and its exercises. The activity and any linked template stay available. The activity then offers the plan picker again.

Catalog loading can be retried while existing entries remain editable. If an exercise label is unavailable, the panel keeps the entry visible by its ID and offers a retry.

Save failures keep the draft visible. When the API rejects the sign-in, the panel offers **Sign in again**. Signing out discards any open draft. After signing in, users can reopen the activity and continue working with its workout.

A saved activity workout, including an empty one, can be saved as a new named plan. This copies its persisted entries and links the activity to the new plan, replacing any prior plan link. Name conflicts and other non-authentication failures keep the name available for retry. A rejected sign-in closes the dialog and offers sign-in recovery. After saving, the activity remains open and the new plan is available under Planning.

When an activity has no saved workout, users can start without a plan by selecting one active catalog exercise and optionally entering targets. Save creates the workout. Cancel discards the draft. The exercise catalog remains available if the plan list fails to load.

A saved workout linked to a plan offers **Update linked plan**. Confirmation replaces the linked plan's exercises with the activity's saved exercises. An empty workout clears the linked plan's exercise list. The activity remains open. If the link has already been removed, the action disappears and the panel explains why.
