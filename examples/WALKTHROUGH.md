# Portable Board Walkthrough

This walkthrough uses only the synthetic board in [portable-flow.mapsmith](portable-flow.mapsmith). It is safe for public issues, screenshots, and export/import checks.

## 1. Open the Sample Board

1. Start Mapsmith with `npm run dev`.
2. Use **Open** in the toolbar.
3. Select `examples/portable-flow.mapsmith`.

Expected result: the board titled `Mapsmith sample: portable workflow` opens with the demo labels `Draft locally`, `Check exports`, `Share demo-safe file`, and `Open anywhere`.

## 2. Export SVG

1. With the sample board open, choose **SVG** in the toolbar.
2. Save the downloaded SVG anywhere outside the repo unless you intentionally need it for a test.

Expected result: the exported SVG contains the same synthetic labels and does not contain local paths, credentials, tokens, passwords, private URLs, or script tags.

## 3. Re-Save the Board

1. Choose **Save** in the toolbar.
2. Confirm the downloaded file uses the `.mapsmith` extension.
3. Reopen the downloaded board with **Open**.

Expected result: the board round-trips as Mapsmith JSON with `type: "canvasforge-board"` and `version: 1`.

## 4. Run the Checked Proof

Run:

```bash
npm run verify:examples
```

The verifier parses the sample board, checks canonical JSON formatting, re-renders it through the SVG exporter, verifies the expected demo labels, and rejects obvious path or secret-like content.
