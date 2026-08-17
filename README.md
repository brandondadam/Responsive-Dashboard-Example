# Responsive Dashboard Example

A small proof-of-concept dashboard demonstrating a responsive, drag-and-drop widget grid built with [GridStack.js](https://gridstackjs.com/) (v10.3.1, loaded via CDN — no build step or dependencies required).

Open `index.html` in a browser to try it out.

## Features

- Drag-and-drop, resizable dashboard widgets (Lines, Chart, Image, List, Stat, Quick Actions, Search)
- Responsive column layout that adapts across breakpoints (desktop → tablet → phone)
- Add / remove / cycle widget type
- Editable widget titles
- Layout persistence to `localStorage`, with a "Reset Layout" option

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
- **`grid.on('change', callback)`** — listens for drag/resize events and syncs the in-memory widget model (position/size) so it can be persisted to `localStorage`

## Files

- `index.html` — page markup, GridStack CDN includes, and the "Add Widget" dialog
- `app.js` — widget model, rendering, GridStack setup, and event wiring
- `style.css` — dashboard styling
