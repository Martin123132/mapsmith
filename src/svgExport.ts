export type ExportShapeKind = 'rectangle' | 'diamond' | 'ellipse' | 'text'
export type ExportPortName = 'north' | 'east' | 'south' | 'west'

export type ExportNode = {
  id: string
  kind: ExportShapeKind
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke: string
  text: string
  fontSize: number
}

export type ExportConnector = {
  id: string
  from: string
  to: string
  fromPort?: ExportPortName
  toPort?: ExportPortName
  label?: string
  labelOffsetX?: number
  labelOffsetY?: number
  showLabel?: boolean
  stroke: string
}

export type ExportBoard = {
  name: string
  nodes: ExportNode[]
  connectors: ExportConnector[]
}

type Point = {
  x: number
  y: number
}

type Bounds = {
  x: number
  y: number
  width: number
  height: number
}

const exportPadding = 80
const portNames: ExportPortName[] = ['north', 'east', 'south', 'west']

const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '0'
  }

  return Number.parseFloat(value.toFixed(3)).toString()
}

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const getPortPoint = (node: ExportNode, port: ExportPortName): Point => {
  switch (port) {
    case 'north':
      return { x: node.x + node.width / 2, y: node.y }
    case 'east':
      return { x: node.x + node.width, y: node.y + node.height / 2 }
    case 'south':
      return { x: node.x + node.width / 2, y: node.y + node.height }
    case 'west':
      return { x: node.x, y: node.y + node.height / 2 }
  }
}

const nearestPort = (node: ExportNode, target: Point): ExportPortName =>
  portNames.reduce((bestPort, candidatePort) => {
    const best = getPortPoint(node, bestPort)
    const candidate = getPortPoint(node, candidatePort)
    const bestDistance = Math.hypot(best.x - target.x, best.y - target.y)
    const candidateDistance = Math.hypot(candidate.x - target.x, candidate.y - target.y)
    return candidateDistance < bestDistance ? candidatePort : bestPort
  }, 'east' as ExportPortName)

const connectorEndpoints = (
  connector: ExportConnector,
  from: ExportNode,
  to: ExportNode,
): { start: Point; end: Point } => {
  const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 }
  const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 }
  const fromPort = connector.fromPort ?? nearestPort(from, toCenter)
  const toPort = connector.toPort ?? nearestPort(to, fromCenter)

  return {
    start: getPortPoint(from, fromPort),
    end: getPortPoint(to, toPort),
  }
}

export const getSvgExportBounds = (nodes: ExportNode[]): Bounds => {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 640, height: 360 }
  }

  const minX = Math.min(...nodes.map((node) => node.x))
  const minY = Math.min(...nodes.map((node) => node.y))
  const maxX = Math.max(...nodes.map((node) => node.x + node.width))
  const maxY = Math.max(...nodes.map((node) => node.y + node.height))

  return {
    x: minX - exportPadding,
    y: minY - exportPadding,
    width: maxX - minX + exportPadding * 2,
    height: maxY - minY + exportPadding * 2,
  }
}

const renderLabel = (node: ExportNode, className = 'node-label'): string =>
  `<text class="${className}" x="${formatNumber(node.x + node.width / 2)}" y="${formatNumber(
    node.y + node.height / 2,
  )}" text-anchor="middle" dominant-baseline="middle" font-size="${formatNumber(
    node.fontSize,
  )}">${escapeXml(node.text)}</text>`

const renderNode = (node: ExportNode): string => {
  const stroke = escapeXml(node.stroke)
  const fill = escapeXml(node.fill)

  if (node.kind === 'text') {
    return renderLabel(node, 'canvas-title')
  }

  if (node.kind === 'diamond') {
    const points = [
      `${formatNumber(node.x + node.width / 2)},${formatNumber(node.y)}`,
      `${formatNumber(node.x + node.width)},${formatNumber(node.y + node.height / 2)}`,
      `${formatNumber(node.x + node.width / 2)},${formatNumber(node.y + node.height)}`,
      `${formatNumber(node.x)},${formatNumber(node.y + node.height / 2)}`,
    ].join(' ')

    return `<g class="diagram-node"><polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="3" />${renderLabel(
      node,
    )}</g>`
  }

  if (node.kind === 'ellipse') {
    return `<g class="diagram-node"><ellipse cx="${formatNumber(
      node.x + node.width / 2,
    )}" cy="${formatNumber(node.y + node.height / 2)}" rx="${formatNumber(
      node.width / 2,
    )}" ry="${formatNumber(node.height / 2)}" fill="${fill}" stroke="${stroke}" stroke-width="3" />${renderLabel(
      node,
    )}</g>`
  }

  return `<g class="diagram-node"><rect x="${formatNumber(node.x)}" y="${formatNumber(
    node.y,
  )}" width="${formatNumber(node.width)}" height="${formatNumber(
    node.height,
  )}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="3" />${renderLabel(node)}</g>`
}

const renderConnector = (
  connector: ExportConnector,
  nodeMap: Map<string, ExportNode>,
): string | null => {
  const from = nodeMap.get(connector.from)
  const to = nodeMap.get(connector.to)
  if (!from || !to) {
    return null
  }

  const { start, end } = connectorEndpoints(connector, from, to)
  const hasLabel =
    typeof connector.label === 'string' &&
    connector.label.trim() !== '' &&
    connector.showLabel !== false
  const labelText =
    hasLabel && typeof connector.label === 'string' ? escapeXml(connector.label.trim()) : ''
  const labelX = formatNumber((start.x + end.x) / 2 + (connector.labelOffsetX ?? 0))
  const labelY = formatNumber((start.y + end.y) / 2 + (connector.labelOffsetY ?? 0))

  return [
    `<line class="connector-line" x1="${formatNumber(start.x)}" y1="${formatNumber(
      start.y,
    )}" x2="${formatNumber(end.x)}" y2="${formatNumber(end.y)}" stroke="${escapeXml(
      connector.stroke,
    )}" stroke-width="3" stroke-linecap="round" marker-end="url(#mapsmith-arrowhead)" />`,
    hasLabel
      ? `<text class="connector-label" x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-size="12">${labelText}</text>`
      : '',
  ].join('')
}

export const createSvgExport = (board: ExportBoard): string => {
  const bounds = getSvgExportBounds(board.nodes)
  const nodeMap = new Map(board.nodes.map((node) => [node.id, node]))
  const connectors = board.connectors
    .map((connector) => renderConnector(connector, nodeMap))
    .filter((connector): connector is string => Boolean(connector))
    .join('')
  const nodes = board.nodes.map(renderNode).join('')
  const style = [
    '.diagram-node{font-family:Inter,Segoe UI,sans-serif}',
    '.node-label{fill:#111827;font-family:Inter,Segoe UI,sans-serif;font-weight:700;pointer-events:none}',
    '.canvas-title{fill:#111827;font-family:Inter,Segoe UI,sans-serif;font-weight:800}',
    '.connector-line{fill:none}',
    '.connector-label{font-size:12px;font-family:Inter,Segoe UI,sans-serif;font-weight:700;fill:#334155;stroke:#ffffff;stroke-width:3;paint-order:stroke;text-anchor:middle;dominant-baseline:middle}',
  ].join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mapsmith export: ${escapeXml(
    board.name,
  )}" width="${formatNumber(bounds.width)}" height="${formatNumber(
    bounds.height,
  )}" viewBox="${formatNumber(bounds.x)} ${formatNumber(bounds.y)} ${formatNumber(
    bounds.width,
  )} ${formatNumber(bounds.height)}"><defs><marker id="mapsmith-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#26547c" /></marker><style>${style}</style></defs><rect class="export-background" x="${formatNumber(
    bounds.x,
  )}" y="${formatNumber(bounds.y)}" width="${formatNumber(bounds.width)}" height="${formatNumber(
    bounds.height,
  )}" fill="#f8fafc" />${connectors}${nodes}</svg>`
}
