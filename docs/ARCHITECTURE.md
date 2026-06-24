# Mapsmith Architecture

Mapsmith is a local-first React/Vite diagram editor. The app is source-available for personal and non-commercial use under the PolyForm Noncommercial License 1.0.0; commercial use requires a separate written license from TWO HANDS NETWORK LTD.

## Main Surfaces

- `src/App.tsx`: editor state, toolbar commands, canvas interactions, autosave, import/open, save, PNG/SVG export, and keyboard shortcuts.
- `src/boardFile.ts`: board schema, board-file serialization, legacy raw-board import support, and validation guards.
- `src/svgExport.ts`: deterministic SVG export renderer used by browser export and verification scripts.
- `src/connectorLabelShortcuts.ts`: pure helpers for connector label visibility and keyboard nudging.
- `src/App.css`: responsive app shell, canvas, side panels, inspectors, shortcut panel, and connector affordances.

## Board Model

The saved board model is intentionally small:

- `Board`: `{ name, nodes, connectors }`
- `DiagramNode`: shape type, position, size, fill/stroke, text, and font size
- `Connector`: source/target node ids, optional named ports, optional label state, and stroke

Saved `.mapsmith` files use a wrapped payload with:

```json
{
  "type": "canvasforge-board",
  "version": 1,
  "board": {}
}
```

The legacy `canvasforge-board` marker is preserved so older `.canvasforge` files can still import. Raw legacy board objects (`{ name, nodes, connectors }`) are also accepted by `parseBoardFileText`.

## Editor State

The editor keeps local React state for:

- active board and viewport,
- selected node or connector,
- active tool,
- undo/redo stacks,
- connector source and live preview point,
- autosave status and unsaved-change status.

Board mutations flow through `updateBoard` or `recordBoardSnapshot` so undo/redo, autosave, and unsaved-change detection stay aligned.

## Canvas Interactions

The native SVG canvas handles:

- shape creation,
- node dragging,
- resize handles,
- panning and zooming,
- connector creation,
- visible connector port hints,
- live dashed connector preview,
- selected connector port reassignment and label controls.

The SVG canvas remains the source of interaction. Exported SVG is generated independently through `src/svgExport.ts` so exports stay deterministic and testable.

## Local Persistence

Mapsmith is local-first:

- explicit Save downloads a `.mapsmith` JSON file,
- Open parses `.mapsmith`, `.canvasforge`, or compatible JSON,
- autosave writes a draft to browser local storage,
- destructive board replacements prompt when there are unsaved changes.

No account or forced cloud storage is required for the core editor.

## Verification

The main gate is:

```bash
npm run check
```

It runs lint, production build, deterministic SVG proof, board round-trip proof, example proof, import smoke proof, connector shortcut proof, and public-readiness docs proof.

Other useful commands:

```bash
npm run audit
npm run verify:examples
npm run verify:import-smoke
npm run verify:public
```

Rendered browser QA is documented in [RENDERED_QA.md](RENDERED_QA.md). Local screenshots and logs should stay under `D:\Codex\revenge-tour\mapsmith\node_modules\.tmp\rendered-qa` on this machine.
