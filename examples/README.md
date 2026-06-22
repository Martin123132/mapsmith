# Mapsmith Examples

This folder contains small, synthetic `.mapsmith` boards that are safe to use in public issues, tests, screenshots, and export/import checks.

## Portable Workflow

[portable-flow.mapsmith](portable-flow.mapsmith) demonstrates the current board file shape:

- `type: "canvasforge-board"` compatibility marker,
- `version: 1`,
- local-first board metadata,
- shape nodes,
- connector endpoints with named ports,
- and demo-only text.

The example contains no private diagrams, credentials, customer data, local machine paths, or internal URLs.

See [WALKTHROUGH.md](WALKTHROUGH.md) for the checked open/export/save flow.

## Checking Examples

Run:

```bash
npm run verify:examples
```

The verifier parses the example, checks deterministic round-tripping, renders an SVG string from it, and rejects obvious path or secret-like content.
