# Release Dry-Run Evidence

Use this template to record a future first-release dry run. This file is a checklist template only; filling it out does not create a release, upload assets, tag a commit, or publish a package.

## Dry-Run Scope

- Date:
- Commit:
- Reviewer:
- GitHub CI URL:

## Required Commands

Record the result and any public-safe notes.

- [ ] `npm run verify:examples`
  - Result:
  - Notes:
- [ ] `npm run verify:public`
  - Result:
  - Notes:
- [ ] `npm audit --omit=dev`
  - Result:
  - Notes:
- [ ] `npm run check`
  - Result:
  - Notes:

## Demo-Safe Proof

- [ ] `examples/portable-flow.mapsmith` remains synthetic/demo-only.
- [ ] The checked open/export/save walkthrough is current.
- [ ] `.mapsmith` save/open round-trip proof is still represented by the checked fixtures.
- [ ] SVG/export proof contains only synthetic labels.
- [ ] Proof material contains no private paths, secrets, credentials, tokens, private URLs, or real customer diagrams.

## Release Posture

- [ ] No public release was created.
- [ ] No release assets were uploaded.
- [ ] No git tag was created.
- [ ] No package was published.
- [ ] `package.json` remains `private: true`.

## Follow-Up

- Blockers:
- Known limitations:
- Follow-up issues:
