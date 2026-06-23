# Mapsmith Roadmap

Mapsmith is early, but the direction is simple: a fast, local-first diagram editor that covers everyday visual mapping without a subscription.

## Now

- Keep native SVG editing responsive and predictable.
- Keep direct SVG export deterministic and demo-safe.
- Preserve `.mapsmith` save/open compatibility.
- Keep board JSON round-trips covered by a deterministic fixture.
- Keep public examples synthetic, path-free, and parser-verified.
- Keep legacy `.canvasforge` imports working.
- Maintain green CI for lint and production builds.
- Add in-app starter templates (blank, flowchart, system, process).
- Add local browser auto-save and explicit draft recovery controls.

## Next

- Connector polish: clearer routing, label editing, and attachment feedback.
- Export polish: improve PNG/SVG naming and expand fixture coverage.
- Test coverage: more import/export edge cases, keyboard controls, and connector port behavior.
- Documentation: short usage clips, contributor setup, and architecture notes.

## Later

- Multi-page boards.
- Themeable export styles.
- Share-safe static viewer export.
- Self-hosted collaboration experiments.

## Non-Goals

- No account requirement for the core editor.
- No forced cloud storage.
- No proprietary file lock-in for basic boards.
