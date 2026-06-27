# Rendered QA

Use this when checking Mapsmith as a browser product, especially before release prep or after layout, toolbar, canvas, import/export, or shortcut changes.

Keep temporary screenshots and logs under `D:\Codex\revenge-tour\mapsmith\node_modules\.tmp\rendered-qa` on this machine. Do not commit those artifacts unless a future release process explicitly asks for sanitized public assets.

## Target Flow

The baseline flow is:

```text
app loads -> first meaningful editor screen renders -> primary visible controls respond without runtime errors
```

## Desktop Smoke

1. Start the app with `npm run dev -- --host 127.0.0.1 --port 5173`.
2. Open `http://127.0.0.1:5173/`.
3. Confirm the page title is `Mapsmith`.
4. Confirm the editor is not blank:
   - top toolbar is visible,
   - `Local Board` panel is visible,
   - native canvas is visible,
   - demo board nodes and connectors are visible.
5. Confirm browser console has no relevant errors or warnings.
6. Confirm side panels scroll inside the workspace row and do not run under the status bar.
7. Open the `Keys` panel and confirm the shortcut panel appears and the button is pressed.
8. For non-writing export checks, open `http://127.0.0.1:5173/?qa-downloads`, click `Save`, `SVG`, and `PNG`, then verify `data-mapsmith-download-qa-records` contains `.mapsmith`, `.svg`, and `.png` records with non-zero sizes. This dev-only path records metadata and skips real browser downloads.

## Mobile Smoke

Use a small viewport around `390 x 760`.

1. Confirm side panels collapse.
2. Confirm toolbar buttons remain usable.
3. Confirm native canvas remains visible and does not create horizontal page overflow.
4. Confirm status remains visible at the bottom.
5. Confirm browser console has no relevant errors or warnings.

## Evidence

Capture screenshots for:

- desktop editor after load,
- shortcut panel open,
- mobile collapsed layout.

For local QA on this machine, save them under:

```text
D:\Codex\revenge-tour\mapsmith\node_modules\.tmp\rendered-qa
```

## Current Manual Evidence

The latest rendered QA pass checked:

- desktop app load at `http://127.0.0.1:5173/`,
- nonblank native canvas with demo nodes/connectors,
- no console errors or warnings,
- fixed scroll containment for the left sidebar,
- `Keys` shortcut panel interaction,
- non-writing `?qa-downloads` save/SVG/PNG metadata capture,
- mobile `390 x 760` collapsed layout with no horizontal overflow.
