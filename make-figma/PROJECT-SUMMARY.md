# Make → Figma — summary of the build (2026-09-30 / 2026-10-01)

## What this is
A tool that copies a Figma Make app into Figma as real SAP design system parts. Paste a Make link in the Figma plugin. The tool builds the main screen, and a frame for every popup, tab and other screen of the app. No Claude is needed while it runs.

## How it runs
plugin (paste link) → bridge `make-figma/bridge/server.js` (port 41779) → Chrome extension (opens the app in the user's own logged-in Chrome, reads it, uses it with safe clicks) → `make-figma/out/last-dump.json` → converter `build/make-convert.js` → frames in Figma + a warning list.

## Timeline (condensed)
1. Standalone Make-only set made next to the old SAP Bridge (kept untouched).
2. Share links need the user's Figma login → own Chrome extension (no cookie copy, no token sent anywhere).
3. Layout fixes: wrap rows, hug / fill widths, table fit, max lines, overlay frames (Dialog, Popover).
4. Explorer added: opens rows, dropdowns, pickers, then every tab inside a popup; skips repeated popups.
5. Converter cases: avatars, feed lists, status badges with icons, icon tabs, object header, calendar, list items (Byline + real icon), cards with kit shadows.
6. Control table `build/make-map.json` (29 controls → kit parts, 12 aliases, 43 container classes), 156 extra icons, closest-icon fallback.
7. Self-check: lost texts, unknown controls, nearest colour tokens → warning list.
8. React / web-component apps: DOM reader + adapter `domToUi5` that reuses the same pipeline; plain HTML (buttons, inputs, tables, roles, dialogs, SVG, absolute lines, gradients, circles, pills).

## Results
- SAPUI5 apps (Maintenance, Customer Support, Purchase Orders, Flights, Build-Screen): confirmed good by the user ("Perfect!", "really happy").
- React / web-component apps: built, tested on pages shaped like the real Ariba source; NOT proven on the real app (user answered "No, only SAPUI5 apps so far").
- Tests: 34 pass (`node --test test/make2tree.test.js test/make-link.test.js`). Main-frame geometry 100 % on Maintenance.

## What we learned
- Figma cannot read Make through its API. Only the user's own Chrome can open a share link.
- A new extension version counts only after reload in `chrome://extensions`; the plugin shows the version and warns when old.
- Hidden tabs and unfocused windows open no popups: bring tab and window to the front. The scan read must never fall back silently to a plain read.
- Kit nodes inside an instance are valid only in one synchronous step; a nested swap renews sibling ids. Texts first, icons one by one, swaps last. Guard every `findOne` / `findAll`.
- Not published in the kit: `Card Main Header`, `Card Numeric Header`. Byline List Item and a status without state have no icon slot → a real icon instance is placed next to them.
- Overlays (dialogs, popovers) sit outside the page tree → each is its own frame.
- A general layout rule can break another app (centring rule lowered the search app) → fix synthesized rows explicitly, re-run `make-verify` on all fixtures.
- `get_design_context` on a Make file key returns the real source files (read with `ReadMcpResourceTool`): use it to learn what a new app contains.
- The auto-mode classifier blocks opening web pages in a browser (also headless), cookie copy and combined memory+commit+push commands. Do not work around it.
- A `/goal` whose proof needs the user's Chrome cannot be closed by the assistant: say so once and offer `/goal clear`.

## User rules (every app)
Show every icon (swappable instances). Copy card styles, colours (nearest kit token + warning, never raw), radius, shadows, padding, gaps, sizes. No repeated popups with the same status. Detect everything and build it.

## Known gaps
React apps: open state only (no explorer). Calendar popup shows the kit sample month. Dropdown popovers show no ticks. Frame height stops at the browser window. Popups are checked by eye. Custom SVG icons are vectors, not kit icons.

## Next
1. Paste the Ariba share link (`figma.com/make/ubagPCk8AivyWlhUaQfK2R/…`), send the frame link and warning list, fix each gap.
2. New SAPUI5 link: the warning list shows what is missing.
3. Optional: explorer for React apps; whole page height. `git push` of branch `figma-make` is still open (commit `dff2ed7` pushed; `9f4b6f6` … local).

## Tools
- `node make-figma/tools/outline.js <dump.json> [depth]` — Figma tree outline of a saved dump.
- `node make-figma/tools/unmapped.js` — warnings and lost texts across all saved dumps.
- `node build/make-verify.js <dump.json>` — geometry check of the main frame.
- Fixtures: `test/fixtures/make-*.dump.json` (+ `make-dom.gen.js`, `make-dom-ariba.gen.js` build the React ones).
