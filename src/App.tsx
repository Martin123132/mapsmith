import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Circle,
  Diamond,
  FileInput,
  FolderOpen,
  ImageDown,
  Keyboard,
  MousePointer2,
  Move,
  PanelRightClose,
  RefreshCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Square,
  Type,
  Waypoints,
  X,
} from 'lucide-react'
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import './App.css'
import { createSvgExport } from './svgExport'

const BOARD_VERSION = 1
const boardName = 'Mapsmith demo board'

type ShapeKind = 'rectangle' | 'diamond' | 'ellipse' | 'text'
type Tool = 'select' | 'pan' | ShapeKind | 'connector'

type DiagramNode = {
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

type Connector = {
  id: string
  from: string
  to: string
  fromPort?: PortName
  toPort?: PortName
  stroke: string
}

type Board = {
  name: string
  nodes: DiagramNode[]
  connectors: Connector[]
}

type BoardFile = {
  type: 'canvasforge-board'
  version: typeof BOARD_VERSION
  board: Board
}

type View = {
  x: number
  y: number
  zoom: number
}

type DragState =
  | {
      mode: 'node'
      id: string
      offsetX: number
      offsetY: number
    }
  | {
      mode: 'resize'
      id: string
      handle: ResizeHandle
      startPoint: Point
      startNode: DiagramNode
    }
  | {
      mode: 'pan'
      startClientX: number
      startClientY: number
      startView: View
    }

type Point = {
  x: number
  y: number
}

type PortName = 'north' | 'east' | 'south' | 'west'
type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw'

const portLabels: Record<PortName, string> = {
  north: 'North',
  east: 'East',
  south: 'South',
  west: 'West',
}

const portNames: PortName[] = ['north', 'east', 'south', 'west']

const tools: Array<{
  icon: typeof MousePointer2
  label: string
  tool: Tool
}> = [
  { icon: MousePointer2, label: 'Select', tool: 'select' },
  { icon: Move, label: 'Pan', tool: 'pan' },
  { icon: Square, label: 'Rectangle', tool: 'rectangle' },
  { icon: Diamond, label: 'Diamond', tool: 'diamond' },
  { icon: Circle, label: 'Ellipse', tool: 'ellipse' },
  { icon: Type, label: 'Text', tool: 'text' },
  { icon: Waypoints, label: 'Connector', tool: 'connector' },
]

const palette = [
  '#fff4d6',
  '#dff3ff',
  '#dcfce7',
  '#ffe5ec',
  '#f1ede2',
  '#ffffff',
]

const createDemoBoard = (): Board => ({
  name: boardName,
  nodes: [
    {
      id: 'subscription-tax',
      kind: 'rectangle',
      x: -310,
      y: -70,
      width: 220,
      height: 90,
      fill: '#fff4d6',
      stroke: '#1f2937',
      text: 'Subscription tax',
      fontSize: 20,
    },
    {
      id: 'local-first',
      kind: 'diamond',
      x: -10,
      y: -82,
      width: 180,
      height: 104,
      fill: '#dff3ff',
      stroke: '#26547c',
      text: 'Local-first editor',
      fontSize: 18,
    },
    {
      id: 'export-ready',
      kind: 'rectangle',
      x: 260,
      y: -70,
      width: 220,
      height: 90,
      fill: '#dcfce7',
      stroke: '#1b4332',
      text: 'Export-ready boards',
      fontSize: 19,
    },
    {
      id: 'fork-friendly',
      kind: 'ellipse',
      x: -235,
      y: 118,
      width: 230,
      height: 88,
      fill: '#ffe5ec',
      stroke: '#5f0f40',
      text: 'Fork-friendly code',
      fontSize: 18,
    },
    {
      id: 'self-host',
      kind: 'ellipse',
      x: 105,
      y: 118,
      width: 230,
      height: 88,
      fill: '#f1ede2',
      stroke: '#6c584c',
      text: 'Self-host next',
      fontSize: 18,
    },
    {
      id: 'title',
      kind: 'text',
      x: -310,
      y: -204,
      width: 470,
      height: 52,
      fill: 'transparent',
      stroke: '#111827',
      text: 'Mapsmith',
      fontSize: 40,
    },
    {
      id: 'subtitle',
      kind: 'text',
      x: -308,
      y: -154,
      width: 460,
      height: 36,
      fill: 'transparent',
      stroke: '#4b5563',
      text: 'Free local diagram boards',
      fontSize: 20,
    },
  ],
  connectors: [
    {
      id: 'connector-1',
      from: 'subscription-tax',
      to: 'local-first',
      fromPort: 'east',
      toPort: 'west',
      stroke: '#26547c',
    },
    {
      id: 'connector-2',
      from: 'local-first',
      to: 'export-ready',
      fromPort: 'east',
      toPort: 'west',
      stroke: '#1b4332',
    },
    {
      id: 'connector-3',
      from: 'local-first',
      to: 'fork-friendly',
      fromPort: 'south',
      toPort: 'north',
      stroke: '#5f0f40',
    },
    {
      id: 'connector-4',
      from: 'local-first',
      to: 'self-host',
      fromPort: 'south',
      toPort: 'north',
      stroke: '#6c584c',
    },
  ],
})

const initialView: View = { x: -365, y: -270, zoom: 1 }

const createId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`

const safeFileStem = (name: string) =>
  name
    .trim()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'mapsmith-board'

const nowLabel = () =>
  new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date())

const centerOf = (node: DiagramNode) => ({
  x: node.x + node.width / 2,
  y: node.y + node.height / 2,
})

const getPortPoint = (node: DiagramNode, port: PortName): Point => {
  const center = centerOf(node)

  if (port === 'north') {
    return { x: center.x, y: node.y }
  }

  if (port === 'east') {
    return { x: node.x + node.width, y: center.y }
  }

  if (port === 'south') {
    return { x: center.x, y: node.y + node.height }
  }

  return { x: node.x, y: center.y }
}

const getHandlePoints = (node: DiagramNode): Array<{ handle: ResizeHandle; point: Point }> => [
  { handle: 'nw', point: { x: node.x, y: node.y } },
  { handle: 'ne', point: { x: node.x + node.width, y: node.y } },
  { handle: 'se', point: { x: node.x + node.width, y: node.y + node.height } },
  { handle: 'sw', point: { x: node.x, y: node.y + node.height } },
]

const getConnectionPoint = (node: DiagramNode, target: Point): Point => {
  const center = centerOf(node)
  const dx = target.x - center.x
  const dy = target.y - center.y

  if (node.kind === 'ellipse') {
    const rx = node.width / 2
    const ry = node.height / 2
    const scale = Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)) || 1
    return {
      x: center.x + dx / scale,
      y: center.y + dy / scale,
    }
  }

  if (node.kind === 'diamond') {
    const halfWidth = node.width / 2
    const halfHeight = node.height / 2
    const scale = Math.abs(dx) / halfWidth + Math.abs(dy) / halfHeight || 1
    return {
      x: center.x + dx / scale,
      y: center.y + dy / scale,
    }
  }

  const halfWidth = node.width / 2
  const halfHeight = node.height / 2
  const scale = Math.max(Math.abs(dx) / halfWidth, Math.abs(dy) / halfHeight) || 1
  return {
    x: center.x + dx / scale,
    y: center.y + dy / scale,
  }
}

const getConnectorEndpoints = (from: DiagramNode, to: DiagramNode) => {
  const fromCenter = centerOf(from)
  const toCenter = centerOf(to)

  return {
    start: getConnectionPoint(from, toCenter),
    end: getConnectionPoint(to, fromCenter),
  }
}

const choosePortToward = (from: DiagramNode, to: DiagramNode): PortName => {
  const fromCenter = centerOf(from)
  const toCenter = centerOf(to)
  const dx = toCenter.x - fromCenter.x
  const dy = toCenter.y - fromCenter.y

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'east' : 'west'
  }

  return dy >= 0 ? 'south' : 'north'
}

const oppositePort = (port: PortName): PortName => {
  if (port === 'north') {
    return 'south'
  }

  if (port === 'east') {
    return 'west'
  }

  if (port === 'south') {
    return 'north'
  }

  return 'east'
}

const assignPorts = (connector: Connector, nodeMap: Map<string, DiagramNode>): Connector => {
  if (connector.fromPort && connector.toPort) {
    return connector
  }

  const from = nodeMap.get(connector.from)
  const to = nodeMap.get(connector.to)
  if (!from || !to) {
    return connector
  }

  const fromPort = connector.fromPort ?? choosePortToward(from, to)
  const toPort = connector.toPort ?? oppositePort(fromPort)
  return { ...connector, fromPort, toPort }
}

const getPersistentConnectorEndpoints = (
  connector: Connector,
  from: DiagramNode,
  to: DiagramNode,
) => {
  if (connector.fromPort && connector.toPort) {
    return {
      start: getPortPoint(from, connector.fromPort),
      end: getPortPoint(to, connector.toPort),
    }
  }

  return getConnectorEndpoints(from, to)
}

const normalizeBoard = (board: Board): Board => {
  const map = new Map(board.nodes.map((node) => [node.id, node]))
  return {
    ...board,
    connectors: board.connectors.map((connector) => assignPorts(connector, map)),
  }
}

const resizeNode = (node: DiagramNode, handle: ResizeHandle, delta: Point): DiagramNode => {
  const minWidth = node.kind === 'text' ? 120 : 96
  const minHeight = node.kind === 'text' ? 36 : 56
  const next = { ...node }

  if (handle.includes('e')) {
    next.width = Math.max(minWidth, node.width + delta.x)
  }

  if (handle.includes('s')) {
    next.height = Math.max(minHeight, node.height + delta.y)
  }

  if (handle.includes('w')) {
    const nextWidth = Math.max(minWidth, node.width - delta.x)
    next.x = node.x + node.width - nextWidth
    next.width = nextWidth
  }

  if (handle.includes('n')) {
    const nextHeight = Math.max(minHeight, node.height - delta.y)
    next.y = node.y + node.height - nextHeight
    next.height = nextHeight
  }

  return next
}

const resizeNodeByKeyboard = (
  node: DiagramNode,
  direction: 'left' | 'right' | 'up' | 'down',
  step: number,
): DiagramNode => {
  const minWidth = node.kind === 'text' ? 120 : 96
  const minHeight = node.kind === 'text' ? 36 : 56

  if (direction === 'left') {
    return { ...node, width: Math.max(minWidth, node.width - step) }
  }

  if (direction === 'right') {
    return { ...node, width: node.width + step }
  }

  if (direction === 'up') {
    return { ...node, height: Math.max(minHeight, node.height - step) }
  }

  return { ...node, height: node.height + step }
}

const getBounds = (nodes: DiagramNode[]) => {
  if (nodes.length === 0) {
    return { x: -420, y: -280, width: 840, height: 560 }
  }

  const minX = Math.min(...nodes.map((node) => node.x))
  const minY = Math.min(...nodes.map((node) => node.y))
  const maxX = Math.max(...nodes.map((node) => node.x + node.width))
  const maxY = Math.max(...nodes.map((node) => node.y + node.height))

  return {
    x: minX - 96,
    y: minY - 96,
    width: maxX - minX + 192,
    height: maxY - minY + 192,
  }
}

const wrapLines = (text: string, maxChars = 22) => {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []

  for (const word of words) {
    const current = lines.at(-1)
    if (!current || `${current} ${word}`.length > maxChars) {
      lines.push(word)
    } else {
      lines[lines.length - 1] = `${current} ${word}`
    }
  }

  return lines.length > 0 ? lines : ['']
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30000)
}

const serializeBoard = (board: Board): string =>
  JSON.stringify(
    {
      type: 'canvasforge-board',
      version: BOARD_VERSION,
      board: normalizeBoard(board),
    } satisfies BoardFile,
    null,
    2,
  )

const isBoardFile = (data: unknown): data is BoardFile => {
  if (!data || typeof data !== 'object') {
    return false
  }

  const candidate = data as Partial<BoardFile>
  return (
    candidate.type === 'canvasforge-board' &&
    candidate.version === BOARD_VERSION &&
    !!candidate.board &&
    Array.isArray(candidate.board.nodes) &&
    Array.isArray(candidate.board.connectors)
  )
}

const createNode = (kind: ShapeKind, point: { x: number; y: number }): DiagramNode => {
  const id = createId(kind)
  const base = {
    id,
    kind,
    x: point.x - 80,
    y: point.y - 42,
    width: 180,
    height: 86,
    fill: '#ffffff',
    stroke: '#111827',
    text: kind === 'text' ? 'New text' : 'New node',
    fontSize: kind === 'text' ? 24 : 18,
  }

  if (kind === 'diamond') {
    return { ...base, width: 180, height: 108, fill: '#dff3ff' }
  }

  if (kind === 'ellipse') {
    return { ...base, width: 200, height: 90, fill: '#ffe5ec' }
  }

  if (kind === 'text') {
    return {
      ...base,
      width: 240,
      height: 54,
      fill: 'transparent',
      stroke: '#111827',
    }
  }

  return { ...base, fill: '#fff4d6' }
}

function App() {
  const canvasRef = useRef<SVGSVGElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasDraggedRef = useRef(false)
  const [board, setBoard] = useState<Board>(() => normalizeBoard(createDemoBoard()))
  const [view, setView] = useState<View>(initialView)
  const [tool, setTool] = useState<Tool>('select')
  const [selectedId, setSelectedId] = useState<string>('local-first')
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>('')
  const [connectorStartId, setConnectorStartId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [status, setStatus] = useState('Ready')
  const [lastChanged, setLastChanged] = useState('Not edited')
  const [canvasSize, setCanvasSize] = useState({ width: 960, height: 620 })
  const [showShortcuts, setShowShortcuts] = useState(false)

  const selectedNode = useMemo(
    () => board.nodes.find((node) => node.id === selectedId) ?? null,
    [board.nodes, selectedId],
  )
  const selectedConnector = useMemo(
    () => board.connectors.find((connector) => connector.id === selectedConnectorId) ?? null,
    [board.connectors, selectedConnectorId],
  )

  const boardTitle = board.name
  const elementCount = board.nodes.length + board.connectors.length
  const nodeMap = useMemo(
    () => new Map(board.nodes.map((node) => [node.id, node])),
    [board.nodes],
  )
  const selectedConnectorEndpoints = useMemo(() => {
    if (!selectedConnector) {
      return null
    }

    const from = nodeMap.get(selectedConnector.from)
    const to = nodeMap.get(selectedConnector.to)
    if (!from || !to) {
      return null
    }

    return { from, to, connector: assignPorts(selectedConnector, nodeMap) }
  }, [nodeMap, selectedConnector])
  const visibleWidth = canvasSize.width / view.zoom
  const visibleHeight = canvasSize.height / view.zoom

  useEffect(() => {
    const svg = canvasRef.current
    if (!svg) {
      return
    }

    const updateCanvasSize = () => {
      const rect = svg.getBoundingClientRect()
      const nextSize = {
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
      }
      setCanvasSize((current) =>
        current.width === nextSize.width && current.height === nextSize.height
          ? current
          : nextSize,
      )
    }

    updateCanvasSize()
    const observer = new ResizeObserver(updateCanvasSize)
    observer.observe(svg)
    window.addEventListener('resize', updateCanvasSize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateCanvasSize)
    }
  }, [])

  const markChanged = useCallback((nextStatus = 'Edited in memory') => {
    setLastChanged(nowLabel())
    setStatus(nextStatus)
  }, [])

  const removeConnector = useCallback(
    (connectorId: string) => {
      setBoard((current) => ({
        ...current,
        connectors: current.connectors.filter((connector) => connector.id !== connectorId),
      }))
      if (selectedConnectorId === connectorId) {
        setSelectedConnectorId('')
      }
      markChanged('Connector deleted')
    },
    [markChanged, selectedConnectorId],
  )

  const removeNode = useCallback(
    (nodeId: string) => {
      setBoard((current) => ({
        ...current,
        nodes: current.nodes.filter((node) => node.id !== nodeId),
        connectors: current.connectors.filter(
          (connector) => connector.from !== nodeId && connector.to !== nodeId,
        ),
      }))
      if (selectedId === nodeId) {
        setSelectedId('')
      }
      setSelectedConnectorId('')
      setConnectorStartId(null)
      markChanged('Node deleted')
    },
    [markChanged, selectedId],
  )

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const svg = canvasRef.current
      if (!svg) {
        return { x: 0, y: 0 }
      }

      const rect = svg.getBoundingClientRect()
      return {
        x: view.x + (clientX - rect.left) / view.zoom,
        y: view.y + (clientY - rect.top) / view.zoom,
      }
    },
    [view],
  )

  const updateSelectedNode = useCallback(
    (patch: Partial<DiagramNode>) => {
      if (!selectedNode) {
        return
      }

      setBoard((current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          node.id === selectedNode.id ? { ...node, ...patch } : node,
        ),
      }))
      markChanged()
    },
    [markChanged, selectedNode],
  )

  const updateSelectedConnectorPort = useCallback(
    (side: 'fromPort' | 'toPort', port: PortName) => {
      if (!selectedConnector) {
        return
      }

      setBoard((current) => ({
        ...current,
        connectors: current.connectors.map((connector) =>
          connector.id === selectedConnector.id ? { ...connector, [side]: port } : connector,
        ),
      }))
      markChanged(side === 'fromPort' ? 'Source port changed' : 'Target port changed')
    },
    [markChanged, selectedConnector],
  )

  const handleCanvasPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.button !== 0) {
        return
      }

      const point = screenToWorld(event.clientX, event.clientY)

      if (tool === 'pan') {
        hasDraggedRef.current = false
        setDragState({
          mode: 'pan',
          startClientX: event.clientX,
          startClientY: event.clientY,
          startView: view,
        })
        setStatus('Panning board')
        return
      }

      if (tool === 'rectangle' || tool === 'diamond' || tool === 'ellipse' || tool === 'text') {
        const node = createNode(tool, point)
        setBoard((current) => ({
          ...current,
          nodes: [...current.nodes, node],
        }))
        setSelectedId(node.id)
        setSelectedConnectorId('')
        setTool('select')
        markChanged(`${tool[0].toUpperCase()}${tool.slice(1)} added`)
        return
      }

      setSelectedId('')
      setSelectedConnectorId('')
      setConnectorStartId(null)
    },
    [markChanged, screenToWorld, tool, view],
  )

  const handleNodePointerDown = useCallback(
    (event: ReactPointerEvent<SVGGElement>, node: DiagramNode) => {
      event.stopPropagation()
      const point = screenToWorld(event.clientX, event.clientY)

      if (tool === 'connector') {
        if (!connectorStartId) {
          setConnectorStartId(node.id)
          setSelectedId(node.id)
          setSelectedConnectorId('')
          setStatus('Pick target node')
          return
        }

        if (connectorStartId !== node.id) {
          const connector: Connector = {
            id: createId('connector'),
            from: connectorStartId,
            to: node.id,
            stroke: '#26547c',
          }
          setBoard((current) => ({
            ...current,
            connectors: [...current.connectors, assignPorts(connector, nodeMap)],
          }))
          setSelectedId(node.id)
          setSelectedConnectorId('')
          setConnectorStartId(null)
          setTool('select')
          markChanged('Connector added')
        }
        return
      }

      setSelectedId(node.id)
      setSelectedConnectorId('')
      setConnectorStartId(null)
      canvasRef.current?.focus()
      hasDraggedRef.current = false
      setDragState({
        mode: 'node',
        id: node.id,
        offsetX: point.x - node.x,
        offsetY: point.y - node.y,
      })
      setStatus('Selected node')
    },
    [connectorStartId, markChanged, nodeMap, screenToWorld, tool],
  )

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<SVGCircleElement>, node: DiagramNode, handle: ResizeHandle) => {
      event.stopPropagation()
      setSelectedId(node.id)
      setSelectedConnectorId('')
      setConnectorStartId(null)
      canvasRef.current?.focus()
      hasDraggedRef.current = false
      setDragState({
        mode: 'resize',
        id: node.id,
        handle,
        startPoint: screenToWorld(event.clientX, event.clientY),
        startNode: node,
      })
      setStatus('Resizing node')
    },
    [screenToWorld],
  )

  const handleConnectorPointerDown = useCallback(
    (event: ReactPointerEvent<SVGGElement>, connector: Connector) => {
      event.stopPropagation()
      setSelectedId('')
      setSelectedConnectorId(connector.id)
      setConnectorStartId(null)
      setTool('select')
      setStatus('Selected connector')
      canvasRef.current?.focus()
    },
    [],
  )

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (!dragState) {
        return
      }

      if (dragState.mode === 'pan') {
        hasDraggedRef.current = true
        const dx = (event.clientX - dragState.startClientX) / dragState.startView.zoom
        const dy = (event.clientY - dragState.startClientY) / dragState.startView.zoom
        setView({
          ...dragState.startView,
          x: dragState.startView.x - dx,
          y: dragState.startView.y - dy,
        })
        return
      }

      if (dragState.mode === 'resize') {
        hasDraggedRef.current = true
        const point = screenToWorld(event.clientX, event.clientY)
        const delta = {
          x: point.x - dragState.startPoint.x,
          y: point.y - dragState.startPoint.y,
        }
        setBoard((current) => ({
          ...current,
          nodes: current.nodes.map((node) =>
            node.id === dragState.id
              ? resizeNode(dragState.startNode, dragState.handle, delta)
              : node,
          ),
        }))
        setLastChanged(nowLabel())
        setStatus('Resizing node')
        return
      }

      const point = screenToWorld(event.clientX, event.clientY)
      hasDraggedRef.current = true
      setBoard((current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          node.id === dragState.id
            ? {
                ...node,
                x: point.x - dragState.offsetX,
                y: point.y - dragState.offsetY,
              }
            : node,
        ),
      }))
      setLastChanged(nowLabel())
      setStatus('Moving node')
    },
    [dragState, screenToWorld],
  )

  const handlePointerUp = useCallback(() => {
    if (dragState?.mode === 'resize' && hasDraggedRef.current) {
      setStatus('Resized node')
    } else if (dragState?.mode === 'node' && hasDraggedRef.current) {
      setStatus('Moved node')
    } else if (dragState?.mode === 'pan' && hasDraggedRef.current) {
      setStatus('Board panned')
    }
    setDragState(null)
  }, [dragState?.mode])

  const handleCanvasKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGSVGElement>) => {
      if (event.target instanceof HTMLInputElement) {
        return
      }

      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        event.preventDefault()
        setShowShortcuts((current) => !current)
        setStatus('Shortcut panel toggled')
        return
      }

      if (event.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false)
          setStatus('Shortcut panel closed')
          return
        }

        setSelectedId('')
        setSelectedConnectorId('')
        setConnectorStartId(null)
        setStatus('Selection cleared')
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedConnector) {
          event.preventDefault()
          removeConnector(selectedConnector.id)
          return
        }

        if (selectedNode) {
          event.preventDefault()
          removeNode(selectedNode.id)
        }
        return
      }

      if (!selectedNode || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        return
      }

      event.preventDefault()
      const step = event.shiftKey ? 10 : 1
      const direction = event.key.replace('Arrow', '').toLowerCase() as
        | 'left'
        | 'right'
        | 'up'
        | 'down'

      setBoard((current) => ({
        ...current,
        nodes: current.nodes.map((node) => {
          if (node.id !== selectedNode.id) {
            return node
          }

          if (event.altKey) {
            return resizeNodeByKeyboard(node, direction, step)
          }

          return {
            ...node,
            x: node.x + (direction === 'right' ? step : direction === 'left' ? -step : 0),
            y: node.y + (direction === 'down' ? step : direction === 'up' ? -step : 0),
          }
        }),
      }))
      markChanged(event.altKey ? 'Keyboard resized' : 'Keyboard nudged')
    },
    [markChanged, removeConnector, removeNode, selectedConnector, selectedNode, showShortcuts],
  )

  const handleWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      event.preventDefault()
      const point = screenToWorld(event.clientX, event.clientY)
      const factor = event.deltaY > 0 ? 0.9 : 1.1
      const nextZoom = Math.min(2.4, Math.max(0.35, view.zoom * factor))
      const svg = canvasRef.current
      if (!svg) {
        return
      }

      const rect = svg.getBoundingClientRect()
      setView({
        x: point.x - (event.clientX - rect.left) / nextZoom,
        y: point.y - (event.clientY - rect.top) / nextZoom,
        zoom: nextZoom,
      })
    },
    [screenToWorld, view.zoom],
  )

  const saveBoard = useCallback(() => {
    downloadBlob(
      new Blob([serializeBoard(board)], { type: 'application/json' }),
      `${safeFileStem(board.name)}.mapsmith`,
    )
    setStatus('Board file prepared')
  }, [board])

  const openBoard = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelected = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const parsed: unknown = JSON.parse(text)
      if (!isBoardFile(parsed)) {
        throw new Error('Invalid Mapsmith board')
      }

      setBoard(normalizeBoard(parsed.board))
      setSelectedId(parsed.board.nodes[0]?.id ?? '')
      setSelectedConnectorId('')
      setConnectorStartId(null)
      setStatus('Board loaded')
      setLastChanged(nowLabel())
    } catch {
      setStatus('Could not load board')
    }
  }, [])

  const resetBoard = useCallback(() => {
    const nextBoard = normalizeBoard(createDemoBoard())
    setBoard(nextBoard)
    setSelectedId('local-first')
    setSelectedConnectorId('')
    setConnectorStartId(null)
    setView(initialView)
    setStatus('Demo board reset')
    setLastChanged(nowLabel())
  }, [])

  const exportPng = useCallback(async () => {
    if (!canvasRef.current) {
      setStatus('Canvas not ready')
      return
    }

    const bounds = getBounds(board.nodes)
    const source = createSvgExport(board)
    const image = new Image()
    const url = URL.createObjectURL(
      new Blob([source], { type: 'image/svg+xml;charset=utf-8' }),
    )

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Could not render SVG'))
      image.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bounds.width)
    canvas.height = Math.round(bounds.height)
    const context = canvas.getContext('2d')
    if (!context) {
      URL.revokeObjectURL(url)
      setStatus('PNG export failed')
      return
    }

    context.fillStyle = '#f8fafc'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0)
    URL.revokeObjectURL(url)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) {
      setStatus('PNG export failed')
      return
    }

    downloadBlob(blob, `${safeFileStem(board.name)}.png`)
    setStatus('PNG export prepared')
  }, [board])

  const exportSvg = useCallback(() => {
    if (!canvasRef.current) {
      setStatus('Canvas not ready')
      return
    }

    downloadBlob(
      new Blob([createSvgExport(board)], { type: 'image/svg+xml;charset=utf-8' }),
      `${safeFileStem(board.name)}.svg`,
    )
    setStatus('SVG export prepared')
  }, [board])

  const zoomLabel = `${Math.round(view.zoom * 100)}%`

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Sparkles size={18} strokeWidth={2.3} />
          </span>
          <div>
            <h1>Mapsmith</h1>
            <p>{boardTitle}</p>
          </div>
        </div>

        <div className="command-strip" aria-label="Board commands">
          <button type="button" onClick={saveBoard} title="Save board">
            <Save size={17} />
            <span>Save</span>
          </button>
          <button type="button" onClick={openBoard} title="Open board">
            <FolderOpen size={17} />
            <span>Open</span>
          </button>
          <button type="button" onClick={exportPng} title="Export PNG">
            <ImageDown size={17} />
            <span>PNG</span>
          </button>
          <button type="button" onClick={exportSvg} title="Export SVG">
            <FileInput size={17} />
            <span>SVG</span>
          </button>
          <button type="button" onClick={resetBoard} title="Reset demo board">
            <RefreshCcw size={17} />
            <span>Reset</span>
          </button>
          <button
            aria-pressed={showShortcuts}
            type="button"
            onClick={() => setShowShortcuts((current) => !current)}
            title="Keyboard shortcuts"
          >
            <Keyboard size={17} />
            <span>Keys</span>
          </button>
        </div>
      </header>

      <section className="workspace" aria-label="Mapsmith editor">
        <aside className="side-panel left-panel" aria-label="Project status">
          <div className="panel-heading">
            <ShieldCheck size={18} />
            <h2>Local Board</h2>
          </div>
          <dl className="stat-list">
            <div>
              <dt>Elements</dt>
              <dd>{elementCount}</dd>
            </div>
            <div>
              <dt>Changed</dt>
              <dd>{lastChanged}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{status}</dd>
            </div>
          </dl>

          {selectedNode ? (
            <form className="inspector" aria-label="Selected element inspector">
              <label>
                Label
                <input
                  value={selectedNode.text}
                  onChange={(event) => updateSelectedNode({ text: event.target.value })}
                />
              </label>
              <label>
                Fill
                <div className="swatches">
                  {palette.map((color) => (
                    <button
                      key={color}
                      aria-label={`Use fill ${color}`}
                      className={selectedNode.fill === color ? 'selected' : ''}
                      style={{ background: color }}
                      type="button"
                      onClick={() => updateSelectedNode({ fill: color })}
                    />
                  ))}
                </div>
              </label>
            </form>
          ) : selectedConnector && selectedConnectorEndpoints ? (
            <div className="connector-inspector" aria-label="Selected connector inspector">
              <dl>
                <div>
                  <dt>From</dt>
                  <dd>
                    {selectedConnectorEndpoints.from.text}
                    <span>{portLabels[selectedConnectorEndpoints.connector.fromPort ?? 'east']}</span>
                  </dd>
                  <div className="port-picker" aria-label="Source port">
                    {portNames.map((port) => (
                      <button
                        key={`from-${port}`}
                        aria-pressed={selectedConnectorEndpoints.connector.fromPort === port}
                        type="button"
                        onClick={() => updateSelectedConnectorPort('fromPort', port)}
                      >
                        {portLabels[port][0]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <dt>To</dt>
                  <dd>
                    {selectedConnectorEndpoints.to.text}
                    <span>{portLabels[selectedConnectorEndpoints.connector.toPort ?? 'west']}</span>
                  </dd>
                  <div className="port-picker" aria-label="Target port">
                    {portNames.map((port) => (
                      <button
                        key={`to-${port}`}
                        aria-pressed={selectedConnectorEndpoints.connector.toPort === port}
                        type="button"
                        onClick={() => updateSelectedConnectorPort('toPort', port)}
                      >
                        {portLabels[port][0]}
                      </button>
                    ))}
                  </div>
                </div>
              </dl>
              <button type="button" onClick={() => removeConnector(selectedConnector.id)}>
                Delete connector
              </button>
            </div>
          ) : null}

          <div className="format-block">
            <FileInput size={18} />
            <span>.mapsmith</span>
          </div>
        </aside>

        <section className="canvas-stage" aria-label="Diagram canvas">
          <div className="native-toolbar" aria-label="Canvas tools">
            {tools.map(({ icon: Icon, label, tool: nextTool }) => (
              <button
                key={nextTool}
                aria-pressed={tool === nextTool}
                title={label}
                type="button"
                onClick={() => {
                  setTool(nextTool)
                  setConnectorStartId(null)
                }}
              >
                <Icon size={17} />
              </button>
            ))}
          </div>

          <svg
            ref={canvasRef}
            aria-label="Native Mapsmith drawing board"
            className={`native-canvas ${dragState?.mode === 'pan' || tool === 'pan' ? 'is-panning' : ''}`}
            role="img"
            tabIndex={0}
            viewBox={`${view.x} ${view.y} ${visibleWidth} ${visibleHeight}`}
            onKeyDown={handleCanvasKeyDown}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
          >
            <defs>
              <pattern id="grid-small" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e8edf5" strokeWidth="1" />
              </pattern>
              <pattern id="grid-large" width="100" height="100" patternUnits="userSpaceOnUse">
                <rect width="100" height="100" fill="url(#grid-small)" />
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#d7deea" strokeWidth="1" />
              </pattern>
              <marker
                id="arrowhead"
                markerHeight="8"
                markerWidth="8"
                orient="auto"
                refX="7"
                refY="4"
                viewBox="0 0 8 8"
              >
                <path d="M 0 0 L 8 4 L 0 8 z" fill="context-stroke" />
              </marker>
            </defs>

            <rect
              x={view.x - 2000}
              y={view.y - 2000}
              width={visibleWidth + 4000}
              height={visibleHeight + 4000}
              fill="url(#grid-large)"
            />

            <g className="connectors">
              {board.connectors.map((connector) => {
                const from = nodeMap.get(connector.from)
                const to = nodeMap.get(connector.to)
                if (!from || !to) {
                  return null
                }

                const normalizedConnector = assignPorts(connector, nodeMap)
                const { start, end } = getPersistentConnectorEndpoints(normalizedConnector, from, to)
                return (
                  <g
                    key={connector.id}
                    className={`connector ${selectedConnectorId === connector.id ? 'selected' : ''}`}
                    onPointerDown={(event) => handleConnectorPointerDown(event, normalizedConnector)}
                  >
                    <line
                      className="connector-hit"
                      stroke="transparent"
                      strokeLinecap="round"
                      strokeWidth="18"
                      x1={start.x}
                      x2={end.x}
                      y1={start.y}
                      y2={end.y}
                    />
                    <line
                      className="connector-line"
                      markerEnd="url(#arrowhead)"
                      stroke={connector.stroke}
                      strokeLinecap="round"
                      strokeWidth="3"
                      x1={start.x}
                      x2={end.x}
                      y1={start.y}
                      y2={end.y}
                    />
                    {selectedConnectorId === connector.id ? (
                      <>
                        <circle className="connector-port" cx={start.x} cy={start.y} r="5.5" />
                        <circle className="connector-port" cx={end.x} cy={end.y} r="5.5" />
                      </>
                    ) : null}
                  </g>
                )
              })}
            </g>

            <g className="nodes">
              {board.nodes.map((node) => (
                <DiagramNodeView
                  key={node.id}
                  isConnectorStart={connectorStartId === node.id}
                  isSelected={selectedId === node.id}
                  node={node}
                  onPointerDown={handleNodePointerDown}
                  onResizePointerDown={handleResizePointerDown}
                  onSelect={setSelectedId}
                />
              ))}
            </g>
          </svg>

          <div className="zoom-pill">{zoomLabel}</div>
          <div className="canvas-hint">
            {tool === 'connector'
              ? connectorStartId
                ? 'Connector target'
                : 'Connector source'
              : `${tool[0].toUpperCase()}${tool.slice(1)} mode`}
          </div>
          {showShortcuts ? (
            <aside className="shortcut-card" aria-label="Keyboard shortcuts">
              <div className="shortcut-card-heading">
                <h3>Keys</h3>
                <button type="button" onClick={() => setShowShortcuts(false)} title="Close">
                  <X size={15} />
                </button>
              </div>
              <dl>
                <div>
                  <dt>Selection</dt>
                  <dd>
                    <kbd>Esc</kbd>
                    <span>Clear</span>
                    <kbd>Del</kbd>
                    <span>Delete</span>
                  </dd>
                </div>
                <div>
                  <dt>Nudge</dt>
                  <dd>
                    <kbd>Arrows</kbd>
                    <span>1px</span>
                    <kbd>Shift</kbd>
                    <span>10px</span>
                  </dd>
                </div>
                <div>
                  <dt>Resize</dt>
                  <dd>
                    <kbd>Alt</kbd>
                    <span>+ arrows</span>
                  </dd>
                </div>
                <div>
                  <dt>Ports</dt>
                  <dd>
                    <kbd>N</kbd>
                    <kbd>E</kbd>
                    <kbd>S</kbd>
                    <kbd>W</kbd>
                  </dd>
                </div>
                <div>
                  <dt>Files</dt>
                  <dd>
                    <span>Save</span>
                    <span>Open</span>
                    <span>PNG</span>
                  </dd>
                </div>
              </dl>
            </aside>
          ) : null}
        </section>

        <aside className="side-panel right-panel" aria-label="Build track">
          <div className="panel-heading">
            <PanelRightClose size={18} />
            <h2>Build Track</h2>
          </div>
          <ol className="track-list">
            <li data-state="done">
              <span>01</span>
              <strong>Native SVG engine</strong>
            </li>
            <li data-state="done">
              <span>02</span>
              <strong>Local save/open</strong>
            </li>
            <li data-state="active">
              <span>03</span>
              <strong>PNG/SVG export</strong>
            </li>
            <li>
              <span>04</span>
              <strong>Self-host rooms</strong>
            </li>
          </ol>
        </aside>
      </section>

      <footer className="statusbar">
        <span>github.com/Martin123132/mapsmith</span>
        <span>AGPL app shell, native SVG engine</span>
        <span>{status}</span>
      </footer>

      <input
        ref={fileInputRef}
        className="file-input"
        type="file"
        accept=".mapsmith,.canvasforge,application/json"
        onChange={handleFileSelected}
      />
    </main>
  )
}

function DiagramNodeView({
  isConnectorStart,
  isSelected,
  node,
  onPointerDown,
  onResizePointerDown,
  onSelect,
}: {
  isConnectorStart: boolean
  isSelected: boolean
  node: DiagramNode
  onPointerDown: (event: ReactPointerEvent<SVGGElement>, node: DiagramNode) => void
  onResizePointerDown: (
    event: ReactPointerEvent<SVGCircleElement>,
    node: DiagramNode,
    handle: ResizeHandle,
  ) => void
  onSelect: (id: string) => void
}) {
  const center = centerOf(node)
  const lines = wrapLines(node.text, node.kind === 'text' ? 26 : 18)
  const handles = getHandlePoints(node)

  return (
    <g
      className={`diagram-node ${node.kind}`}
      data-selected={isSelected}
      onDoubleClick={() => onSelect(node.id)}
      onPointerDown={(event) => onPointerDown(event, node)}
    >
      {isSelected ? (
        <rect
          className="selection-box"
          height={node.height + 14}
          rx="8"
          width={node.width + 14}
          x={node.x - 7}
          y={node.y - 7}
        />
      ) : null}
      {isConnectorStart ? (
        <rect
          className="selection-halo"
          height={node.height + 24}
          rx="12"
          width={node.width + 24}
          x={node.x - 12}
          y={node.y - 12}
        />
      ) : null}

      {node.kind === 'rectangle' ? (
        <rect
          fill={node.fill}
          height={node.height}
          rx="3"
          stroke={node.stroke}
          strokeWidth="3"
          width={node.width}
          x={node.x}
          y={node.y}
        />
      ) : null}
      {node.kind === 'diamond' ? (
        <polygon
          fill={node.fill}
          points={`${center.x},${node.y} ${node.x + node.width},${center.y} ${center.x},${
            node.y + node.height
          } ${node.x},${center.y}`}
          stroke={node.stroke}
          strokeWidth="3"
        />
      ) : null}
      {node.kind === 'ellipse' ? (
        <ellipse
          cx={center.x}
          cy={center.y}
          fill={node.fill}
          rx={node.width / 2}
          ry={node.height / 2}
          stroke={node.stroke}
          strokeWidth="3"
        />
      ) : null}

      <text
        className={node.kind === 'text' ? 'canvas-title' : 'node-label'}
        fill={node.stroke}
        fontSize={node.fontSize}
        textAnchor={node.kind === 'text' ? 'start' : 'middle'}
        x={node.kind === 'text' ? node.x : center.x}
        y={
          node.kind === 'text'
            ? node.y + node.fontSize
            : center.y - ((lines.length - 1) * node.fontSize * 0.58)
        }
      >
        {lines.map((line, index) => (
          <tspan
            key={`${node.id}-${line}-${index}`}
            dy={index === 0 ? 0 : node.fontSize * 1.18}
            x={node.kind === 'text' ? node.x : center.x}
          >
            {line}
          </tspan>
        ))}
      </text>
      {isSelected
        ? handles.map(({ handle, point }) => (
            <circle
              key={`${node.id}-${handle}`}
              aria-label={`Resize ${handle}`}
              className={`resize-handle resize-handle-${handle}`}
              cx={point.x}
              cy={point.y}
              r="7"
              role="button"
              tabIndex={0}
              onPointerDown={(event) => onResizePointerDown(event, node, handle)}
            />
          ))
        : null}
    </g>
  )
}

export default App
