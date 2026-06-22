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
  bugIssue: await read('.github/ISSUE_TEMPLATE/bug_report.yml'),
  exportIssue: await read('.github/ISSUE_TEMPLATE/export_import_issue.yml'),
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
  'npm run check',
  'npm audit --omit=dev',
  'CI is green on `main`',
  'Release notes do not mention private branches',
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
