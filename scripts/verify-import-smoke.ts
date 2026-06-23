import { readFile } from 'node:fs/promises'
import { parseBoardFileText, serializeBoardFile } from '../src/boardFile.js'

const samplePath = 'examples/portable-flow.mapsmith'

const sampleText = await readFile(samplePath, 'utf8')
const boardFromWrapped = parseBoardFileText(sampleText)

if (!boardFromWrapped.name || boardFromWrapped.nodes.length !== 5 || boardFromWrapped.connectors.length !== 3) {
  throw new Error('Sample board must contain the expected demo structure')
}

const wrappedAgain = serializeBoardFile(boardFromWrapped)
const boardFromWrappedAgain = parseBoardFileText(wrappedAgain)

if (JSON.stringify(boardFromWrapped) !== JSON.stringify(boardFromWrappedAgain)) {
  throw new Error('Wrapped board sample did not round-trip deterministically')
}

const rawPayload = JSON.stringify({
  name: boardFromWrapped.name,
  nodes: boardFromWrapped.nodes,
  connectors: boardFromWrapped.connectors,
})
const boardFromRaw = parseBoardFileText(rawPayload)
if (JSON.stringify(boardFromWrapped) !== JSON.stringify(boardFromRaw)) {
  throw new Error('Raw board payload did not parse to the expected structure')
}

const invalidSamples: Array<{ input: string; expects: string }> = [
  { input: 'nonsense', expects: 'Board file is not valid JSON' },
  { input: '[]', expects: 'Board payload is not an object' },
  { input: JSON.stringify({ type: 'canvasforge-board', version: 999, board: boardFromWrapped }), expects: 'Unsupported board file version' },
  {
    input: JSON.stringify({
      type: 'canvasforge-board',
      version: 1,
      board: { ...boardFromWrapped, connectors: [{ ...boardFromWrapped.connectors[0], fromPort: 'invalid' }] },
    }),
    expects: 'Board payload is not a valid Mapsmith board',
  },
]

for (const { input, expects } of invalidSamples) {
  let error: string | null = null
  try {
    parseBoardFileText(input)
  } catch (thrown) {
    error = thrown instanceof Error ? thrown.message : String(thrown)
  }

  if (!error || !error.includes(expects)) {
    throw new Error(`Import smoke proof did not reject invalid input or error message changed: ${expects}`)
  }
}

console.log('Import smoke proof passed')
