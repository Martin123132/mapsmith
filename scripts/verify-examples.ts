import { readFile } from 'node:fs/promises'
import { parseBoardFileText, serializeBoardFile } from '../src/boardFile.js'
import { createSvgExport } from '../src/svgExport.js'

const samplePath = 'examples/portable-flow.mapsmith'
const sampleText = await readFile(samplePath, 'utf8')
const board = parseBoardFileText(sampleText)
const canonical = serializeBoardFile(board)

if (sampleText.trimEnd() !== canonical) {
  throw new Error(`${samplePath} must stay in canonical Mapsmith JSON format`)
}

const svg = createSvgExport(board)

const requiredJson = [
  '"type": "canvasforge-board"',
  '"version": 1',
  '"name": "Mapsmith sample: portable workflow"',
  '"text": "Portable Mapsmith Board"',
  '"fromPort": "east"',
  '"toPort": "west"',
]

const requiredSvg = [
  '<svg xmlns="http://www.w3.org/2000/svg"',
  'Mapsmith export: Mapsmith sample: portable workflow',
  'Portable Mapsmith Board',
  'Draft locally',
  'Check exports',
  'Share demo-safe file',
  'Open anywhere',
  'marker-end="url(#mapsmith-arrowhead)"',
]

const forbidden = [
  'D:\\',
  'C:\\',
  'gho_',
  'token',
  'secret',
  'password',
  'localhost',
  'customer',
  'internal URL',
  '<script',
]

for (const expected of requiredJson) {
  if (!sampleText.includes(expected)) {
    throw new Error(`${samplePath} missing expected JSON content: ${expected}`)
  }
}

for (const expected of requiredSvg) {
  if (!svg.includes(expected)) {
    throw new Error(`${samplePath} SVG proof missing expected content: ${expected}`)
  }
}

for (const blocked of forbidden) {
  if (sampleText.toLowerCase().includes(blocked.toLowerCase())) {
    throw new Error(`${samplePath} contains forbidden content: ${blocked}`)
  }
  if (svg.toLowerCase().includes(blocked.toLowerCase())) {
    throw new Error(`${samplePath} SVG proof contains forbidden content: ${blocked}`)
  }
}

if (board.nodes.length !== 5 || board.connectors.length !== 3) {
  throw new Error(`${samplePath} must keep 5 nodes and 3 connectors`)
}

console.log('Example board fixture passed')
