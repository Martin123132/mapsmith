import { createSvgExport, type ExportBoard } from '../src/svgExport.js'

const fixture: ExportBoard = {
  name: 'Mapsmith fixture <safe>',
  nodes: [
    {
      id: 'start',
      kind: 'rectangle',
      x: 40,
      y: 60,
      width: 180,
      height: 90,
      fill: '#fff4d6',
      stroke: '#111827',
      text: 'Subscription tax',
      fontSize: 20,
    },
    {
      id: 'edit',
      kind: 'diamond',
      x: 310,
      y: 40,
      width: 180,
      height: 120,
      fill: '#dff3ff',
      stroke: '#26547c',
      text: 'Local-first <editor> & "SVG"',
      fontSize: 18,
    },
    {
      id: 'done',
      kind: 'ellipse',
      x: 580,
      y: 70,
      width: 190,
      height: 88,
      fill: '#dcfce7',
      stroke: '#14532d',
      text: 'Export-ready boards',
      fontSize: 18,
    },
  ],
  connectors: [
    {
      id: 'start-to-edit',
      from: 'start',
      to: 'edit',
      fromPort: 'east',
      toPort: 'west',
      stroke: '#26547c',
    },
    {
      id: 'edit-to-done',
      from: 'edit',
      to: 'done',
      fromPort: 'east',
      toPort: 'west',
      stroke: '#0f8b62',
    },
  ],
}

const svg = createSvgExport(fixture)

const mustContain = [
  '<svg xmlns="http://www.w3.org/2000/svg"',
  'aria-label="Mapsmith export: Mapsmith fixture &lt;safe&gt;"',
  'width="890"',
  'height="280"',
  'viewBox="-40 -40 890 280"',
  'Subscription tax',
  'Local-first &lt;editor&gt; &amp; &quot;SVG&quot;',
  'Export-ready boards',
  'marker-end="url(#mapsmith-arrowhead)"',
  'class="export-background"',
]

const mustNotContain = [
  '<script',
  '</script',
  'Local-first <editor>',
  'selection-box',
  'selection-halo',
  'resize-handle',
  'connector-port',
  'D:\\',
  'C:\\',
]

for (const expected of mustContain) {
  if (!svg.includes(expected)) {
    throw new Error(`SVG export fixture missing expected content: ${expected}`)
  }
}

for (const forbidden of mustNotContain) {
  if (svg.includes(forbidden)) {
    throw new Error(`SVG export fixture contains forbidden content: ${forbidden}`)
  }
}

const connectorCount = [...svg.matchAll(/class="connector-line"/g)].length
if (connectorCount !== 2) {
  throw new Error(`Expected 2 exported connectors, found ${connectorCount}`)
}

console.log('SVG export fixture passed')
