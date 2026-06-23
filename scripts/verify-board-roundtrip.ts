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

if (JSON.stringify(parseBoardFileText(JSON.stringify(fixture))) !== JSON.stringify(fixture)) {
  throw new Error('Legacy board payload should parse into the same board')
}

const invalidCases: Array<{ input: string; expects: string }> = [
  { input: '{}', expects: 'Unsupported board file type' },
  { input: JSON.stringify([]), expects: 'Board payload is not an object' },
  {
    input: JSON.stringify({ type: 'canvasforge-board', version: 999, board: fixture }),
    expects: 'Unsupported board file version',
  },
  {
    input: JSON.stringify({
      type: 'canvasforge-board',
      version: 1,
      board: {
        ...fixture,
        nodes: [{ ...fixture.nodes[0], width: 0 }],
      },
    }),
    expects: 'Board payload is not a valid Mapsmith board',
  },
  {
    input: JSON.stringify({
      type: 'canvasforge-board',
      version: 1,
      board: { ...fixture, connectors: [{ ...fixture.connectors[0], fromPort: 'center' }] },
    }),
    expects: 'Board payload is not a valid Mapsmith board',
  },
]

for (const { input, expects } of invalidCases) {
  let error: string | null = null
  try {
    parseBoardFileText(input)
  } catch (thrown) {
    error = thrown instanceof Error ? thrown.message : String(thrown)
  }

  if (!error || !error.includes(expects)) {
    throw new Error(`Invalid board file was accepted or wrong error: ${input}`)
  }
}

console.log('Board JSON round-trip fixture passed')
