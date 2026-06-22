import { parseBoardFileText, serializeBoardFile, type Board } from '../src/boardFile.js'

const fixture: Board = {
  name: 'Mapsmith portable board',
  nodes: [
    {
      id: 'source',
      kind: 'rectangle',
      x: 24,
      y: 48,
      width: 180,
      height: 86,
      fill: '#fff4d6',
      stroke: '#111827',
      text: 'Local file',
      fontSize: 20,
    },
    {
      id: 'middle',
      kind: 'diamond',
      x: 294,
      y: 32,
      width: 184,
      height: 118,
      fill: '#dff3ff',
      stroke: '#26547c',
      text: 'Round-trip JSON',
      fontSize: 18,
    },
    {
      id: 'target',
      kind: 'ellipse',
      x: 568,
      y: 52,
      width: 196,
      height: 92,
      fill: '#dcfce7',
      stroke: '#14532d',
      text: 'Portable work',
      fontSize: 18,
    },
  ],
  connectors: [
    {
      id: 'source-to-middle',
      from: 'source',
      to: 'middle',
      fromPort: 'east',
      toPort: 'west',
      stroke: '#26547c',
    },
    {
      id: 'middle-to-target',
      from: 'middle',
      to: 'target',
      fromPort: 'east',
      toPort: 'west',
      stroke: '#0f8b62',
    },
  ],
}

const serialized = serializeBoardFile(fixture)
const parsed = parseBoardFileText(serialized)
const reserialized = serializeBoardFile(parsed)

if (serialized !== reserialized) {
  throw new Error('Board file did not round-trip deterministically')
}

const required = [
  '"type": "canvasforge-board"',
  '"version": 1',
  '"name": "Mapsmith portable board"',
  '"text": "Round-trip JSON"',
  '"fromPort": "east"',
  '"toPort": "west"',
]

const forbidden = ['D:\\', 'C:\\', 'gho_', 'token', 'secret', 'password', 'localhost']

for (const expected of required) {
  if (!serialized.includes(expected)) {
    throw new Error(`Board round-trip fixture missing expected content: ${expected}`)
  }
}

for (const blocked of forbidden) {
  if (serialized.toLowerCase().includes(blocked.toLowerCase())) {
    throw new Error(`Board round-trip fixture contains forbidden content: ${blocked}`)
  }
}

const invalidCases = [
  '{}',
  JSON.stringify({ type: 'canvasforge-board', version: 999, board: fixture }),
  JSON.stringify({
    type: 'canvasforge-board',
    version: 1,
    board: { ...fixture, nodes: [{ ...fixture.nodes[0], width: 0 }] },
  }),
  JSON.stringify({
    type: 'canvasforge-board',
    version: 1,
    board: { ...fixture, connectors: [{ ...fixture.connectors[0], fromPort: 'center' }] },
  }),
]

for (const invalid of invalidCases) {
  let rejected = false
  try {
    parseBoardFileText(invalid)
  } catch {
    rejected = true
  }

  if (!rejected) {
    throw new Error(`Invalid board file was accepted: ${invalid}`)
  }
}

console.log('Board JSON round-trip fixture passed')
