import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

const failures = []

const requireIncludes = (label, text, snippets) => {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      failures.push(`${label} missing: ${snippet}`)
    }
  }
}

const files = {
  readme: await read('README.md'),
  contributing: await read('CONTRIBUTING.md'),
  security: await read('SECURITY.md'),
  releaseChecklist: await read('docs/RELEASE_CHECKLIST.md'),
  releaseDryRun: await read('docs/RELEASE_DRY_RUN_EVIDENCE.md'),
  bugIssue: await read('.github/ISSUE_TEMPLATE/bug_report.yml'),
  exportIssue: await read('.github/ISSUE_TEMPLATE/export_import_issue.yml'),
  releaseIssue: await read('.github/ISSUE_TEMPLATE/release_readiness.yml'),
  issueConfig: await read('.github/ISSUE_TEMPLATE/config.yml'),
  pullRequest: await read('.github/PULL_REQUEST_TEMPLATE.md'),
  ci: await read('.github/workflows/ci.yml'),
  packageJson: await read('package.json'),
}

const packageData = JSON.parse(files.packageJson)

if (packageData.license !== 'AGPL-3.0-only') {
  failures.push('package.json must keep AGPL-3.0-only license')
}

if (packageData.private !== true) {
  failures.push('package.json must remain private until an explicit package publishing decision')
}

requireIncludes('README.md', files.readme, [
  '[CONTRIBUTING.md](CONTRIBUTING.md)',
  '[SECURITY.md](SECURITY.md)',
  '[docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md)',
  '[examples/](examples/)',
  '[open/export/save walkthrough](examples/WALKTHROUGH.md)',
  'npm run verify:examples',
  'AGPL-3.0-only',
  'local-first',
])

requireIncludes('CONTRIBUTING.md', files.contributing, [
  'public-safe',
  'Do not commit private diagrams',
  'npm run check',
  'npm run verify:board',
  'npm run verify:svg',
])

requireIncludes('SECURITY.md', files.security, [
  'Reporting a Vulnerability',
  'avoid posting sensitive exploit details',
  'private diagrams',
  'tokens',
  'passwords',
])

requireIncludes('docs/RELEASE_CHECKLIST.md', files.releaseChecklist, [
  'Do not publish a release',
  'RELEASE_DRY_RUN_EVIDENCE.md',
  'npm run check',
  'npm run verify:examples',
  'npm run verify:public',
  'npm audit --omit=dev',
  'GitHub CI URL is recorded in the dry-run evidence.',
  'package.json` remains `private: true',
  'No public release, package publish, or asset upload',
  'examples/portable-flow.mapsmith',
  'checked open/export/save walkthrough',
  'CI is green on `main`',
  'release readiness issue template',
  'Release notes do not mention private branches',
])

requireIncludes('docs/RELEASE_DRY_RUN_EVIDENCE.md', files.releaseDryRun, [
  'Release Dry-Run Evidence',
  'filling it out does not create a release',
  'GitHub CI URL:',
  '`npm run verify:examples`',
  '`npm run verify:public`',
  '`npm audit --omit=dev`',
  '`npm run check`',
  'examples/portable-flow.mapsmith',
  'SVG/export proof contains only synthetic labels.',
  'no private paths, secrets, credentials, tokens, private URLs, or real customer diagrams',
  'No public release was created.',
  'No release assets were uploaded.',
  'No git tag was created.',
  'No package was published.',
  '`package.json` remains `private: true`.',
])

requireIncludes('bug issue template', files.bugIssue, [
  'name: Bug report',
  'public-safe',
  'credentials',
  'Steps to reproduce',
  'Public-safe screenshots or files',
])

requireIncludes('export/import issue template', files.exportIssue, [
  'name: Export or import issue',
  'Save .mapsmith',
  'Export SVG',
  'Export PNG',
  'demo-safe',
  'npm run verify:board',
])

requireIncludes('release readiness issue template', files.releaseIssue, [
  'name: Release readiness review',
  'No public release has been created.',
  'No package has been published.',
  '`package.json` remains `private: true`.',
  '`npm run check` passes.',
  '`npm run verify:examples` passes.',
  '`npm run verify:public` passes.',
  '`npm audit --omit=dev` reports no vulnerabilities.',
  'examples/portable-flow.mapsmith',
  'SVG/export proof material contains no private paths, secrets, or real customer diagrams.',
])

requireIncludes('issue template config', files.issueConfig, [
  'blank_issues_enabled: true',
  'ROADMAP.md',
])

requireIncludes('pull request template', files.pullRequest, [
  'Public-Safe Check',
  'npm run check',
  'npm audit --omit=dev',
  'Rendered QA',
])

requireIncludes('CI workflow', files.ci, ['npm run check'])

const forbiddenGeneratedContent = ['gho_', 'AKIA', 'BEGIN PRIVATE KEY']
for (const [label, text] of Object.entries(files)) {
  for (const forbidden of forbiddenGeneratedContent) {
    if (text.includes(forbidden)) {
      failures.push(`${label} contains forbidden secret-looking text: ${forbidden}`)
    }
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log('Public project readiness docs passed')
