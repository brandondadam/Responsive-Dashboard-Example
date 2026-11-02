# Responsive Dashboard Example

A small proof-of-concept dashboard demonstrating a responsive, drag-and-drop widget grid built with [GridStack.js](https://gridstackjs.com/) (v10.3.1, loaded via CDN — no build step or dependencies required).

Open `index.html` in a browser to try it out.

## Features

- Drag-and-drop, resizable dashboard widgets (Lines, Chart, Image, List, Stat, Quick Actions, Search)
- Responsive column layout that adapts across breakpoints (desktop → tablet → phone)
- Add / remove / cycle widget type
- Editable widget titles
- Layout persistence to `localStorage`, with a "Reset Layout" option
- Two selectable **layout modes** that control how saved layouts behave across screen sizes:
  - **Desktop master** — the 12-column desktop arrangement is the single saved layout; smaller screens always auto-reflow from it
  - **Remember each size** — each breakpoint (phone / tablet / desktop) keeps its own saved arrangement

## GridStack APIs used

The grid logic lives in `app.js`. It uses the following GridStack APIs:

- **`GridStack.init(options)`** — initializes the grid on `.grid-stack`, configured with:
  - `column: 12` — 12-column grid on desktop
  - `cellHeight: 80` — fixed row height in pixels
  - `margin: 8` — spacing between widgets
  - `float: false` — widgets compact upward to fill gaps
  - `draggable: { handle, cancel }` — restricts dragging to the widget header, excluding the title and icon buttons
  - `columnOpts` — responsive breakpoints that change the column count at different viewport widths (`1` column ≤480px, `2` columns ≤640px, `4` columns ≤1024px, `12` columns above that), using `layout: 'compact'` to re-flow widgets when the column count changes
- **`grid.batchUpdate()` / `grid.commit()`** — batches widget additions when re-rendering the full layout, avoiding intermediate re-layouts
- **`grid.addWidget(options)`** — adds a new widget (with position, size, and HTML content) to the grid
- **`grid.removeWidget(el)`** — removes a single widget's DOM element from the grid
- **`grid.removeAll()`** — clears all widgets before re-rendering
- **`grid.on('change', callback)`** — used purely to detect breakpoint re-flows (when GridStack changes the column count) so the correct per-size layout can be re-applied; it deliberately does **not** persist geometry, because `change` also fires on automatic re-flows
- **`grid.on('dragstop' / 'resizestop', callback)`** — fire only on real pointer gestures, so these are used to capture genuine user edits into the in-memory model and mark it dirty for `localStorage`
- **`grid.getColumn()`** — reads the active column count to key geometry per breakpoint and to tell re-flows apart from user edits

### Layout persistence model

Stored state separates widget **metadata** (`id`, `title`, `type`) from **geometry** keyed by column count (`{ 12: {…}, 4: {…}, 2: {…}, 1: {…} }`). The 12-column entry is the canonical desktop layout; smaller entries are optional per-size overrides created only when the user edits at that size. Older single-array saves are migrated automatically on load.

## Files

- `index.html` — page markup, GridStack CDN includes, and the "Add Widget" dialog
- `app.js` — widget model, rendering, GridStack setup, and event wiring
- `style.css` — dashboard styling
