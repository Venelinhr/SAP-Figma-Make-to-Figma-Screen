# SAP Figma Make to Figma Screen

Copy a **Figma Make** link, paste it in a Figma plugin, and get real **SAP Web UI Kit** screens in Figma.
No AI runs at use time. The result has auto layout, the sizes from Make, and kit parts (not pictures).

You get the main screen **and** the popups, tabs and other screens of the app.

## What you need
- Mac or Windows, [Node.js](https://nodejs.org) 20 or newer
- Google Chrome (logged in to Figma)
- Figma desktop app
- The **SAP Web UI Kit** library enabled in your Figma file

## Set up (one time)
```bash
git clone https://github.com/Venelinhr/SAP-Figma-Make-to-Figma-Screen.git
cd SAP-Figma-Make-to-Figma-Screen
node make-figma/build.js
node make-figma/ctl.js start
```
1. Chrome → `chrome://extensions` → turn on **Developer mode** → **Load unpacked** → choose the folder `make-figma/extension`.
2. Figma → **Plugins → Development → Import plugin from manifest** → choose `make-figma/plugin/manifest.json`.

## Use
1. In Figma Make, click **Share** and copy the link (`https://www.figma.com/make/...`).
2. In Figma, run **Plugins → Development → Make → Figma**.
3. The status line must say "connected" and show the extension version (2.10.0).
4. Press **Cmd+V** (Ctrl+V on Windows) to paste the link.
5. Keep Chrome in front for about 85 seconds. The extension opens the app and uses it with safe clicks.
6. The plugin builds the frames in Figma. Read the **warning list** in the plugin. It names every gap.

Use the **share link**, not a published `*.figma.site` link. A published link skips the popups and screens.

## What the extension clicks
The extension does not only look at the first screen. It **uses your Make app like a person would**: it clicks around, finds the other screens and popups, reads each one, and sends everything to the plugin. The plugin then builds **every screen it found** as its own frame in Figma.

How it works, step by step:
1. It opens your Make app in your own Chrome and reads the main screen.
2. It looks for things that lead somewhere else, and clicks them one by one:
   - **Side navigation** items (they lead to other screens)
   - **Tabs** (also the tabs inside a popup, for example "History")
   - **Table rows** (they open a detail popup)
   - **Dropdowns** and **date pickers** (they open a list or a calendar)
   - **Toolbar buttons** such as sort, settings, help, user menu
   - **KPI cards** (they can lead to a detail view)
3. After each click it waits until the screen stops changing, then reads the new screen or popup.
4. It goes back and tries the next item. It stops after about 85 seconds or 20 clicks.
5. It sends all the screens it found to the plugin. You get one Figma frame per screen, popup and tab.

Rules for the clicks:
- **Safe only.** It never presses Save, Delete, Send, Submit, Approve or similar buttons. It will not change your data.
- **No repeats.** For a table, it opens one row for each different status value (for example one "Error", one "Warning"), not every row.
- **Your Chrome must stay in front.** A hidden tab or an unfocused window does not open popups.
- Apps built with React or web components are read in their open state only. The clicking is built for SAPUI5 apps.

The plugin shows a warning list at the end. If a screen was not found, the list says so.

## After you change code
```bash
node make-figma/build.js
```
Then close and open the plugin again. After an extension change, reload it in `chrome://extensions`.

Bridge commands: `node make-figma/ctl.js start | stop | restart | status` (port 41779, log `make-figma/bridge.log`).

## Tests
```bash
node --test test/make2tree.test.js
```

## State
- **SAPUI5 apps:** work well (Maintenance, Customer Support, Purchase Orders, Flights, Build Screen).
- **React / UI5 Web Components apps:** the converter is built and tested on sample pages. It is **not yet proven** on a real app.
- Known gaps: React apps are read in their open state only; the calendar popup shows the kit sample month; frame height stops at the browser window.

## Rules the tool follows
- Show every icon. If the kit has no such icon, the closest kit icon is placed and a warning says so. You can swap it.
- Copy card styles: background, radius, shadow, border, padding, gaps, sizes.
- Colours use the nearest SAP token. Never a raw colour.
- One frame per different status value (no repeated popups), plus its tabs.

## How it works
`Figma plugin` → `bridge (port 41779)` → `Chrome extension` (opens your Make app, reads it, explores it) → `converter` (`build/make-convert.js` + `build/make-map.json`) → frames in Figma.
More: `make-figma/README.md` and `make-figma/PROJECT-SUMMARY.md`.

## Notes
SAP, SAP Fiori and the SAP Web UI Kit belong to SAP SE. This project is an unofficial helper tool. Check that you may share the kit data in `knowledge/live/` before you make this repository public.

License: MIT
