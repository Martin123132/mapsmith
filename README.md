# Mapsmith

Mapsmith is a local-first open-source diagram and whiteboard prototype aimed at replacing everyday paid diagramming subscriptions.

The package is named `mapsmith` and remains `private: true` to prevent accidental publication from this prototype worktree.

## Current MVP

- React + Vite + TypeScript app shell
- Native SVG diagram engine with shapes, text, connectors, pan, and zoom
- Local `.mapsmith` save/open flow with legacy `.canvasforge` import support
- PNG export flow
- Seed board for first-run verification
- AGPL-3.0-only app license marker

## File Compatibility

New saves use the `.mapsmith` extension. The JSON board payload intentionally keeps the legacy `canvasforge-board` type marker so existing `.canvasforge` files continue to import without migration.

## Development

Run from this project directory on `D:\`:

```powershell
$env:TEMP='D:\Codex\tmp'
$env:TMP='D:\Codex\tmp'
$env:npm_config_cache='D:\Codex\cache\npm'
& 'C:\Program Files\nodejs\npm.cmd' run dev
```

Repository health commands:

```powershell
npm run lint
npm run build
npm run audit
npm run check
```

For a production-like local smoke after `npm run build`:

```powershell
npm run preview -- --host 127.0.0.1
```
