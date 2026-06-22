# Mapsmith

[![CI](https://github.com/Martin123132/mapsmith/actions/workflows/ci.yml/badge.svg)](https://github.com/Martin123132/mapsmith/actions/workflows/ci.yml)

Mapsmith is a local-first, open-source diagram editor for fast visual maps, whiteboards, and flow sketches. It runs in the browser, keeps boards in local files, and exports native SVG-based work without a subscription gate.

![Mapsmith editor showing a native SVG board with shapes and connectors](docs/screenshots/mapsmith-editor.png)

## Why Mapsmith

- Local-first boards: save and reopen `.mapsmith` files from your machine.
- Native SVG canvas: shapes, labels, connector lines, ports, pan, zoom, and keyboard controls.
- Practical exports: save board JSON and export PNG snapshots.
- No account requirement: the core editor is designed to work without cloud lock-in.
- Open-source posture: AGPL-3.0-only, with a public roadmap and visible CI.

## Current MVP

Mapsmith currently includes:

- Shape, text, and connector tools
- Selection, drag movement, resize handles, and keyboard nudging
- Named connector ports for north, east, south, and west attachment points
- Shortcut help overlay for selection, nudge, resize, ports, save, open, and export
- Local `.mapsmith` save/open flow with legacy `.canvasforge` import support
- PNG export
- Responsive editor layout for desktop and small screens

![Mapsmith keyboard shortcut overlay](docs/screenshots/mapsmith-shortcuts.png)

## File Compatibility

New saves use the `.mapsmith` extension. The JSON board payload intentionally keeps the legacy `canvasforge-board` type marker so existing `.canvasforge` files continue to import without migration.

## Roadmap

The short version:

- Improve connector routing and label editing
- Add richer board templates and example diagrams
- Add SVG export alongside PNG export
- Add import/export hardening tests
- Package a stable first public release

See [ROADMAP.md](ROADMAP.md) for the focused public roadmap.

## Development

Install dependencies:

```bash
npm ci
```

Run the development server:

```bash
npm run dev
```

Run repository checks:

```bash
npm run lint
npm run build
npm run audit
```

For a production-like local smoke after `npm run build`:

```bash
npm run preview -- --host 127.0.0.1
```

## Mobile Smoke

The editor is designed around desktop creation, but the shell should remain readable and usable on small screens.

![Mapsmith mobile layout](docs/screenshots/mapsmith-mobile.png)

## License

Mapsmith is licensed under [AGPL-3.0-only](LICENSE).
