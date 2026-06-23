import { readFile } from 'node:fs/promises'
import { createSvgExport, type ExportBoard } from '../src/svgExport.js'
import type { Board } from '../src/boardFile.js'
import {
  isConnectorLabelVisible,
  nudgeConnectorLabelOffset,
  resetConnectorLabelOffset,
  toggleConnectorLabelVisibility,
} from '../src/connectorLabelShortcuts.js'

const fixture: Board = {
  name: 'Mapsmith shortcut fixture',
  nodes: [
    {
      id: 'left',
      kind: 'rectangle',
      x: 40,
      y: 30,
      width: 120,
      height: 60,
      fill: '#fff4d6',
      stroke: '#1f2937',
      text: 'From',
      fontSize: 16,
    },
    {
      id: 'right',
      kind: 'rectangle',
      x: 300,
      y: 30,
      width: 120,
      height: 60,
      fill: '#dff3ff',
      stroke: '#0f8b62',
      text: 'To',
      fontSize: 16,
    },
  ],
  connectors: [
    {
      id: 'shortcut-connector',
      from: 'left',
      to: 'right',
      fromPort: 'east',
      toPort: 'west',
      label: 'Shortcut label',
      stroke: '#065f46',
    },
  ],
}

const parseLabelPosition = (svg: string, label: string) => {
  const match = new RegExp(`<text class="connector-label"[^>]*x="([^"]+)" y="([^"]+)"[^>]*>${label}</text>`).exec(
    svg,
  )
  if (!match) {
    throw new Error(`Missing connector label "${label}" in SVG output`)
  }

  return {
    x: Number.parseFloat(match[1]),
    y: Number.parseFloat(match[2]),
  }
}

const midpoint = { x: 230, y: 60 }
const baseConnector = fixture.connectors[0]

const hiddenConnector = toggleConnectorLabelVisibility(baseConnector)
const hiddenSvg = createSvgExport({ ...fixture, connectors: [hiddenConnector] } as ExportBoard)

if (isConnectorLabelVisible(hiddenConnector)) {
  throw new Error('Connector visibility toggle should hide label when initially visible.')
}

if (hiddenSvg.includes('>Shortcut label</text>')) {
  throw new Error('Connector label should not render when hidden.')
}

const shownConnector = toggleConnectorLabelVisibility(hiddenConnector)
const shownSvg = createSvgExport({ ...fixture, connectors: [shownConnector] } as ExportBoard)

if (!shownSvg.includes('>Shortcut label</text>')) {
  throw new Error('Connector label should render when visible.')
}

const nudgedConnector = nudgeConnectorLabelOffset(nudgeConnectorLabelOffset(shownConnector, 'right', 5), 'up', 2)
const nudgedSvg = createSvgExport({ ...fixture, connectors: [nudgedConnector] } as ExportBoard)
const nudgedPosition = parseLabelPosition(nudgedSvg, 'Shortcut label')

if (nudgedPosition.x !== 235 || nudgedPosition.y !== 58) {
  throw new Error(`Unexpected nudged label position: ${JSON.stringify(nudgedPosition)}`)
}

const resetConnector = resetConnectorLabelOffset(nudgedConnector)
const resetSvg = createSvgExport({ ...fixture, connectors: [resetConnector] } as ExportBoard)
const resetPosition = parseLabelPosition(resetSvg, 'Shortcut label')

if (resetPosition.x !== midpoint.x || resetPosition.y !== midpoint.y) {
  throw new Error(`Unexpected reset label position: ${JSON.stringify(resetPosition)}`)
}

const forbidden = ['connector-label-offset', 'D:\\', 'C:\\', 'gho_', 'token', 'secret', 'password']
for (const blocked of forbidden) {
  if (shownSvg.toLowerCase().includes(blocked.toLowerCase())) {
    throw new Error(`Shortcut SVG proof contains forbidden content: ${blocked}`)
  }
}

const appText = await readFile('src/App.tsx', 'utf8')
const requiredShortcutText = [
  '<dt>Nudge Node</dt>',
  '<dt>Nudge Connector Label</dt>',
  '<dt>Toggle Connector Label</dt>',
  '<dt>Reset Connector Label</dt>',
  '<kbd>L</kbd>',
  '<kbd>0</kbd>',
]

for (const snippet of requiredShortcutText) {
  if (!appText.includes(snippet)) {
    throw new Error(`App.tsx missing shortcut help text snippet: ${snippet}`)
  }
}

console.log('Connector shortcut fixture passed')
