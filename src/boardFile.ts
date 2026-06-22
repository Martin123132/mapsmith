export const BOARD_VERSION = 1
export const BOARD_FILE_TYPE = 'canvasforge-board'

export type ShapeKind = 'rectangle' | 'diamond' | 'ellipse' | 'text'
export type PortName = 'north' | 'east' | 'south' | 'west'

export type DiagramNode = {
  id: string
  kind: ShapeKind
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke: string
  text: string
  fontSize: number
}

export type Connector = {
  id: string
  from: string
  to: string
  fromPort?: PortName
  toPort?: PortName
  stroke: string
}

export type Board = {
  name: string
  nodes: DiagramNode[]
  connectors: Connector[]
}

export type BoardFile = {
  type: typeof BOARD_FILE_TYPE
  version: typeof BOARD_VERSION
  board: Board
}

const shapeKinds: ShapeKind[] = ['rectangle', 'diamond', 'ellipse', 'text']
const portNames: PortName[] = ['north', 'east', 'south', 'west']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isString = (value: unknown): value is string => typeof value === 'string'

const isShapeKind = (value: unknown): value is ShapeKind =>
  isString(value) && shapeKinds.includes(value as ShapeKind)

const isPortName = (value: unknown): value is PortName =>
  isString(value) && portNames.includes(value as PortName)

const isNode = (value: unknown): value is DiagramNode => {
  if (!isRecord(value)) {
    return false
  }

  return (
    isString(value.id) &&
    isShapeKind(value.kind) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.width) &&
    isFiniteNumber(value.height) &&
    value.width > 0 &&
    value.height > 0 &&
    isString(value.fill) &&
    isString(value.stroke) &&
    isString(value.text) &&
    isFiniteNumber(value.fontSize) &&
    value.fontSize > 0
  )
}

const isConnector = (value: unknown): value is Connector => {
  if (!isRecord(value)) {
    return false
  }

  const fromPortValid = value.fromPort === undefined || isPortName(value.fromPort)
  const toPortValid = value.toPort === undefined || isPortName(value.toPort)

  return (
    isString(value.id) &&
    isString(value.from) &&
    isString(value.to) &&
    isString(value.stroke) &&
    fromPortValid &&
    toPortValid
  )
}

export const isBoard = (value: unknown): value is Board => {
  if (!isRecord(value)) {
    return false
  }

  return (
    isString(value.name) &&
    Array.isArray(value.nodes) &&
    value.nodes.every(isNode) &&
    Array.isArray(value.connectors) &&
    value.connectors.every(isConnector)
  )
}

export const isBoardFile = (value: unknown): value is BoardFile => {
  if (!isRecord(value)) {
    return false
  }

  return value.type === BOARD_FILE_TYPE && value.version === BOARD_VERSION && isBoard(value.board)
}

export const serializeBoardFile = (board: Board): string =>
  JSON.stringify(
    {
      type: BOARD_FILE_TYPE,
      version: BOARD_VERSION,
      board,
    } satisfies BoardFile,
    null,
    2,
  )

export const parseBoardFileText = (text: string): Board => {
  const parsed: unknown = JSON.parse(text)
  if (!isBoardFile(parsed)) {
    throw new Error('Invalid Mapsmith board')
  }

  return parsed.board
}
