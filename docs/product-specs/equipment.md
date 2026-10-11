# Equipment

Users can maintain a personal inventory of equipment and organize items into sets.

## Individual items

- Users can create, view, edit, and delete individual equipment items from **My Gear**.
- Each item has a required name and equipment type. Brand, model, description, and purchase date are optional.
- Editing sends only changed fields. Clearing an optional field sends `null` so the backend can clear its value.
- Deletion requires confirmation. The frontend removes a deleted item from its equipment caches and refreshes equipment sets.

## Equipment sets

- Users can group existing equipment items into sets and configure default sets for activity types.
- The sets manager remains separate from individual item editing and deletion.
