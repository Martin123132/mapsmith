import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Circle,
  Diamond,
  FileInput,
  FolderOpen,
  ImageDown,
  Info,
  Keyboard,
  History,
  MousePointer2,
  Move,
  PanelRightClose,
  Redo2,
  RefreshCcw,
  Save,
  Undo2,
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
import {
  BOARD_FILE_TYPE,
  BOARD_VERSION,
  isBoard,
  parseBoardFileText,
  serializeBoardFile,
} from './boardFile'
import type { Board, Connector, DiagramNode, PortName, ShapeKind } from './boardFile'
import { createConnectorPath, getConnectorLabelPoint } from './connectorRouting.js'
import { createSvgExport } from './svgExport'
import {
  isConnectorLabelVisible,
  nudgeConnectorLabelOffset,
  resetConnectorLabelOffset,
  toggleConnectorLabelVisibility,
} from './connectorLabelShortcuts'
import {
  SNAP_SIZE,
  getMinNodeSize,
  snapNodeFrame,
  snapNodePosition,
  snapPoint,
} from './snapGrid'

const boardName = 'Mapsmith demo board'
const AUTOSAVE_KEY = 'mapsmith-board-draft-v1'
const AUTOSAVE_VERSION = 1
const DOWNLOAD_QA_ATTRIBUTE = 'data-mapsmith-download-qa-records'
const DOWNLOAD_QA_STORAGE_KEY = 'mapsmith-download-qa-records'
const projectLinks = {
  commercialLicense: 'https://github.com/Martin123132/mapsmith/blob/main/COMMERCIAL-LICENSE.md',
  contactEmail: 'glyn@twohandsnetwork.co.uk',
  license: 'https://github.com/Martin123132/mapsmith/blob/main/LICENSE',
  notice: 'https://github.com/Martin123132/mapsmith/blob/main/NOTICE.md',
} as const

type Tool = 'select' | 'pan' | ShapeKind | 'connector'

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

type DownloadQaRecord = {
  filename: string
  size: number
  type: string
}

type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw'

type SelectableBoardItem = {
  kind: 'node' | 'connector'
  id: string
}

const portLabels: Record<PortName, string> = {
  north: 'North',
  east: 'East',
  south: 'South',
  west: 'West',
}

const importHelp = {
  wrapped: `${BOARD_FILE_TYPE} (version ${BOARD_VERSION})`,
  legacyRaw: '{ name, nodes, connectors }',
  supportedExtensions: '.mapsmith, .canvasforge, .json',
} as const

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

type TemplateId =
  | 'blank'
  | 'flowchart'
  | 'system-map'
  | 'process-map'
  | 'saas-map'
  | 'release-review'

type BoardTemplate = {
  id: TemplateId
  name: string
  description: string
  createBoard: () => Board
}

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

const createBlankBoardTemplate = (): Board => ({
  name: 'Blank whiteboard',
  nodes: [
    {
      id: 'blank-note',
      kind: 'text',
      x: -130,
      y: -30,
      width: 260,
      height: 58,
      fill: 'transparent',
      stroke: '#111827',
      text: 'Start your board here',
      fontSize: 26,
    },
  ],
  connectors: [],
})

const createFlowchartTemplate = (): Board => ({
  name: 'Flowchart starter',
  nodes: [
    {
      id: 'flow-start',
      kind: 'rectangle',
      x: -340,
      y: -200,
      width: 220,
      height: 84,
      fill: '#dff3ff',
      stroke: '#1f2937',
      text: 'Start',
      fontSize: 20,
    },
    {
      id: 'flow-process-a',
      kind: 'rectangle',
      x: -340,
      y: -70,
      width: 220,
      height: 84,
      fill: '#fff4d6',
      stroke: '#1f2937',
      text: 'Validate input',
      fontSize: 18,
    },
    {
      id: 'flow-decision',
      kind: 'diamond',
      x: -344,
      y: 64,
      width: 228,
      height: 112,
      fill: '#ffe5ec',
      stroke: '#5f0f40',
      text: 'Approved?',
      fontSize: 19,
    },
    {
      id: 'flow-process-b',
      kind: 'rectangle',
      x: -620,
      y: 222,
      width: 220,
      height: 84,
      fill: '#dcfce7',
      stroke: '#1b4332',
      text: 'Revise',
      fontSize: 18,
    },
    {
      id: 'flow-end',
      kind: 'rectangle',
      x: -340,
      y: 222,
      width: 220,
      height: 84,
      fill: '#dff3ff',
      stroke: '#26547c',
      text: 'Ship',
      fontSize: 19,
    },
  ],
  connectors: [
    {
      id: 'flow-c-1',
      from: 'flow-start',
      to: 'flow-process-a',
      stroke: '#26547c',
    },
    {
      id: 'flow-c-2',
      from: 'flow-process-a',
      to: 'flow-decision',
      stroke: '#26547c',
    },
    {
      id: 'flow-c-3',
      from: 'flow-decision',
      to: 'flow-process-b',
      fromPort: 'west',
      toPort: 'east',
      stroke: '#5f0f40',
    },
    {
      id: 'flow-c-4',
      from: 'flow-decision',
      to: 'flow-end',
      fromPort: 'south',
      toPort: 'north',
      stroke: '#1b4332',
    },
  ],
})

const createSystemMapTemplate = (): Board => ({
  name: 'System map starter',
  nodes: [
    {
      id: 'sys-browser',
      kind: 'rectangle',
      x: -380,
      y: -140,
      width: 190,
      height: 88,
      fill: '#dff3ff',
      stroke: '#1f2937',
      text: 'Browser',
      fontSize: 18,
    },
    {
      id: 'sys-api',
      kind: 'rectangle',
      x: -70,
      y: -140,
      width: 190,
      height: 88,
      fill: '#fff4d6',
      stroke: '#26547c',
      text: 'API service',
      fontSize: 18,
    },
    {
      id: 'sys-db',
      kind: 'ellipse',
      x: 220,
      y: -160,
      width: 186,
      height: 86,
      fill: '#dcfce7',
      stroke: '#1b4332',
      text: 'Database',
      fontSize: 17,
    },
    {
      id: 'sys-worker',
      kind: 'ellipse',
      x: -70,
      y: 50,
      width: 190,
      height: 86,
      fill: '#f1ede2',
      stroke: '#6c584c',
      text: 'Worker',
      fontSize: 18,
    },
    {
      id: 'sys-cache',
      kind: 'diamond',
      x: 220,
      y: 56,
      width: 190,
      height: 94,
      fill: '#ffe5ec',
      stroke: '#5f0f40',
      text: 'Cache',
      fontSize: 18,
    },
  ],
  connectors: [
    {
      id: 'sys-c-1',
      from: 'sys-browser',
      to: 'sys-api',
      fromPort: 'east',
      toPort: 'west',
      stroke: '#26547c',
    },
    {
      id: 'sys-c-2',
      from: 'sys-api',
      to: 'sys-db',
      fromPort: 'east',
      toPort: 'west',
      stroke: '#1b4332',
    },
    {
      id: 'sys-c-3',
      from: 'sys-api',
      to: 'sys-worker',
      fromPort: 'south',
      toPort: 'north',
      stroke: '#6c584c',
    },
    {
      id: 'sys-c-4',
      from: 'sys-worker',
      to: 'sys-cache',
      fromPort: 'east',
      toPort: 'west',
      stroke: '#5f0f40',
    },
    {
      id: 'sys-c-5',
      from: 'sys-cache',
      to: 'sys-api',
      fromPort: 'north',
      toPort: 'south',
      stroke: '#111827',
    },
  ],
})

const createProcessTemplate = (): Board => ({
  name: 'Process map starter',
  nodes: [
    {
      id: 'proc-input',
      kind: 'text',
      x: -350,
      y: -220,
      width: 260,
      height: 58,
      fill: 'transparent',
      stroke: '#111827',
      text: 'Customer request',
      fontSize: 21,
    },
    {
      id: 'proc-triage',
      kind: 'rectangle',
      x: -350,
      y: -130,
      width: 220,
      height: 86,
      fill: '#fff4d6',
      stroke: '#1f2937',
      text: 'Triage',
      fontSize: 19,
    },
    {
      id: 'proc-work',
      kind: 'rectangle',
      x: -350,
      y: -20,
      width: 220,
      height: 86,
      fill: '#dff3ff',
      stroke: '#26547c',
      text: 'Work',
      fontSize: 19,
    },
    {
      id: 'proc-review',
      kind: 'diamond',
      x: -354,
      y: 96,
      width: 230,
      height: 118,
      fill: '#ffe5ec',
      stroke: '#5f0f40',
      text: 'Passes QA?',
      fontSize: 18,
    },
    {
      id: 'proc-release',
      kind: 'rectangle',
      x: -350,
      y: 248,
      width: 220,
      height: 86,
      fill: '#dcfce7',
      stroke: '#1b4332',
      text: 'Release',
      fontSize: 19,
    },
    {
      id: 'proc-refine',
      kind: 'rectangle',
      x: -70,
      y: 248,
      width: 220,
      height: 86,
      fill: '#f1ede2',
      stroke: '#6c584c',
      text: 'Refine',
      fontSize: 19,
    },
  ],
  connectors: [
    {
      id: 'proc-c-1',
      from: 'proc-input',
      to: 'proc-triage',
      stroke: '#1f2937',
    },
    {
      id: 'proc-c-2',
      from: 'proc-triage',
      to: 'proc-work',
      stroke: '#26547c',
    },
    {
      id: 'proc-c-3',
      from: 'proc-work',
      to: 'proc-review',
      stroke: '#26547c',
    },
    {
      id: 'proc-c-4',
      from: 'proc-review',
      to: 'proc-release',
      fromPort: 'south',
      toPort: 'north',
      stroke: '#1b4332',
    },
    {
      id: 'proc-c-5',
      from: 'proc-review',
      to: 'proc-refine',
      fromPort: 'east',
      toPort: 'west',
      stroke: '#5f0f40',
    },
  ],
})

const createSaasMapTemplate = (): Board => ({
  name: 'SaaS replacement map',
  nodes: [
    {
      id: 'saas-title',
      kind: 'text',
      x: -500,
      y: -246,
      width: 440,
      height: 54,
      fill: 'transparent',
      stroke: '#111827',
      text: 'SaaS replacement map',
      fontSize: 30,
    },
    {
      id: 'saas-need',
      kind: 'rectangle',
      x: -500,
      y: -120,
      width: 220,
      height: 88,
      fill: '#fff4d6',
      stroke: '#1f2937',
      text: 'User need',
      fontSize: 19,
    },
    {
      id: 'saas-local',
      kind: 'rectangle',
      x: -170,
      y: -120,
      width: 230,
      height: 88,
      fill: '#dff3ff',
      stroke: '#26547c',
      text: 'Local-first tool',
      fontSize: 19,
    },
    {
      id: 'saas-files',
      kind: 'diamond',
      x: 170,
      y: -126,
      width: 230,
      height: 104,
      fill: '#ffe5ec',
      stroke: '#5f0f40',
      text: 'Portable files?',
      fontSize: 18,
    },
    {
      id: 'saas-export',
      kind: 'rectangle',
      x: 520,
      y: -120,
      width: 230,
      height: 88,
      fill: '#dcfce7',
      stroke: '#1b4332',
      text: 'Clean export',
      fontSize: 19,
    },
    {
      id: 'saas-proof',
      kind: 'ellipse',
      x: -170,
      y: 92,
      width: 230,
      height: 88,
      fill: '#f1ede2',
      stroke: '#6c584c',
      text: 'Public proof',
      fontSize: 19,
    },
    {
      id: 'saas-maintain',
      kind: 'ellipse',
      x: 170,
      y: 92,
      width: 230,
      height: 88,
      fill: '#ffffff',
      stroke: '#344054',
      text: 'Maintainer loop',
      fontSize: 18,
    },
  ],
  connectors: [
    {
      id: 'saas-c-1',
      from: 'saas-need',
      to: 'saas-local',
      fromPort: 'east',
      toPort: 'west',
      label: 'build',
      stroke: '#26547c',
    },
    {
      id: 'saas-c-2',
      from: 'saas-local',
      to: 'saas-files',
      fromPort: 'east',
      toPort: 'west',
      label: 'save',
      stroke: '#5f0f40',
    },
    {
      id: 'saas-c-3',
      from: 'saas-files',
      to: 'saas-export',
      fromPort: 'east',
      toPort: 'west',
      label: 'export',
      stroke: '#1b4332',
    },
    {
      id: 'saas-c-4',
      from: 'saas-local',
      to: 'saas-proof',
      fromPort: 'south',
      toPort: 'north',
      label: 'verify',
      stroke: '#6c584c',
    },
    {
      id: 'saas-c-5',
      from: 'saas-proof',
      to: 'saas-maintain',
      fromPort: 'east',
      toPort: 'west',
      label: 'iterate',
      stroke: '#344054',
    },
    {
      id: 'saas-c-6',
      from: 'saas-maintain',
      to: 'saas-files',
      fromPort: 'north',
      toPort: 'south',
      label: 'harden',
      stroke: '#111827',
    },
  ],
})

const createReleaseReviewTemplate = (): Board => ({
  name: 'Release review board',
  nodes: [
    {
      id: 'release-title',
      kind: 'text',
      x: -430,
      y: -236,
      width: 430,
      height: 54,
      fill: 'transparent',
      stroke: '#111827',
      text: 'First release review',
      fontSize: 30,
    },
    {
      id: 'release-demo',
      kind: 'rectangle',
      x: -430,
      y: -116,
      width: 220,
      height: 86,
      fill: '#dff3ff',
      stroke: '#26547c',
      text: 'Demo board',
      fontSize: 19,
    },
    {
      id: 'release-export',
      kind: 'rectangle',
      x: -110,
      y: -116,
      width: 220,
      height: 86,
      fill: '#fff4d6',
      stroke: '#1f2937',
      text: 'SVG proof',
      fontSize: 19,
    },
    {
      id: 'release-docs',
      kind: 'rectangle',
      x: 210,
      y: -116,
      width: 220,
      height: 86,
      fill: '#dcfce7',
      stroke: '#1b4332',
      text: 'Public docs',
      fontSize: 19,
    },
    {
      id: 'release-ci',
      kind: 'diamond',
      x: -110,
      y: 62,
      width: 220,
      height: 112,
      fill: '#ffe5ec',
      stroke: '#5f0f40',
      text: 'CI green?',
      fontSize: 19,
    },
    {
      id: 'release-evidence',
      kind: 'ellipse',
      x: 210,
      y: 80,
      width: 220,
      height: 84,
      fill: '#f1ede2',
      stroke: '#6c584c',
      text: 'Dry-run evidence',
      fontSize: 18,
    },
    {
      id: 'release-hold',
      kind: 'rectangle',
      x: -430,
      y: 80,
      width: 220,
      height: 84,
      fill: '#ffffff',
      stroke: '#344054',
      text: 'No publish yet',
      fontSize: 19,
    },
  ],
  connectors: [
    {
      id: 'release-c-1',
      from: 'release-demo',
      to: 'release-export',
      fromPort: 'east',
      toPort: 'west',
      label: 'open',
      stroke: '#26547c',
    },
    {
      id: 'release-c-2',
      from: 'release-export',
      to: 'release-docs',
      fromPort: 'east',
      toPort: 'west',
      label: 'document',
      stroke: '#1b4332',
    },
    {
      id: 'release-c-3',
      from: 'release-docs',
      to: 'release-evidence',
      fromPort: 'south',
      toPort: 'north',
      label: 'record',
      stroke: '#6c584c',
    },
    {
      id: 'release-c-4',
      from: 'release-export',
      to: 'release-ci',
      fromPort: 'south',
      toPort: 'north',
      label: 'check',
      stroke: '#5f0f40',
    },
    {
      id: 'release-c-5',
      from: 'release-ci',
      to: 'release-hold',
      fromPort: 'west',
      toPort: 'east',
      label: 'hold',
      stroke: '#344054',
    },
  ],
})

const boardTemplates: BoardTemplate[] = [
  {
    id: 'blank',
    name: 'Blank whiteboard',
    description: 'Empty board with a starter note',
    createBoard: createBlankBoardTemplate,
  },
  {
    id: 'flowchart',
    name: 'Flowchart starter',
    description: 'A simple branching flow with one decision point',
    createBoard: createFlowchartTemplate,
  },
  {
    id: 'system-map',
    name: 'System map starter',
    description: 'Service, API, and data path template',
    createBoard: createSystemMapTemplate,
  },
  {
    id: 'process-map',
    name: 'Process map starter',
    description: 'Input-to-release process lane with QA loop',
    createBoard: createProcessTemplate,
  },
  {
    id: 'saas-map',
    name: 'SaaS replacement map',
    description: 'Synthetic product map for local-first replacement planning',
    createBoard: createSaasMapTemplate,
  },
  {
    id: 'release-review',
    name: 'Release review board',
    description: 'Demo-safe first-release review map with proof checkpoints',
    createBoard: createReleaseReviewTemplate,
  },
]

const initialView: View = { x: -365, y: -270, zoom: 1 }

const createId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`

type BoardDraftRecord = {
  type: 'mapsmith-board-draft'
  version: typeof AUTOSAVE_VERSION
  savedAt: number
  board: Board
}

type AutosaveState = {
  hasDraft: boolean
  savedAt: number | null
  error: string
}

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

const exportTimeStem = () =>
  new Date().toISOString().replace(/T/g, '-').replace(/\..+?$/, '').replace(/:/g, '-')

const isBoardDraftRecord = (value: unknown): value is BoardDraftRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const candidate = value as {
    type?: unknown
    version?: unknown
    savedAt?: unknown
    board?: unknown
  }

  return (
    candidate.type === 'mapsmith-board-draft' &&
    candidate.version === AUTOSAVE_VERSION &&
    typeof candidate.savedAt === 'number' &&
    Number.isFinite(candidate.savedAt) &&
    isBoard(candidate.board)
  )
}

const loadBoardDraft = (): BoardDraftRecord | null => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(AUTOSAVE_KEY)
    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)
    return isBoardDraftRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

const draftSavedLabel = (value: number | null) => {
  if (!value) {
    return 'No saved draft'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const buildExportNames = (name: string, stamp: string) => ({
  mapsmith: `${safeFileStem(name)}-${stamp}.mapsmith`,
  png: `${safeFileStem(name)}-${stamp}.png`,
  svg: `${safeFileStem(name)}-${stamp}.svg`,
})

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

const choosePortTowardPoint = (from: DiagramNode, point: Point): PortName => {
  const fromCenter = centerOf(from)
  const dx = point.x - fromCenter.x
  const dy = point.y - fromCenter.y

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
  const fromPort = connector.fromPort ?? choosePortToward(from, to)
  const toPort = connector.toPort ?? oppositePort(fromPort)

  return {
    end: getPortPoint(to, toPort),
    fromPort,
    start: getPortPoint(from, fromPort),
    toPort,
  }
}

const normalizeBoard = (board: Board): Board => {
  const map = new Map(board.nodes.map((node) => [node.id, node]))
  return {
    ...board,
    connectors: board.connectors.map((connector) => assignPorts(connector, map)),
  }
}

const HISTORY_LIMIT = 60

const boardSnapshot = (board: Board): Board => ({
  ...board,
  nodes: board.nodes.map((node) => ({ ...node })),
  connectors: board.connectors.map((connector) => ({ ...connector })),
})

const areBoardsEqual = (left: Board, right: Board) =>
  JSON.stringify(left) === JSON.stringify(right)

const resizeNode = (node: DiagramNode, handle: ResizeHandle, delta: Point): DiagramNode => {
  const minSize = getMinNodeSize(node)
  const next = { ...node }

  if (handle.includes('e')) {
    next.width = Math.max(minSize.width, node.width + delta.x)
  }

  if (handle.includes('s')) {
    next.height = Math.max(minSize.height, node.height + delta.y)
  }

  if (handle.includes('w')) {
    const nextWidth = Math.max(minSize.width, node.width - delta.x)
    next.x = node.x + node.width - nextWidth
    next.width = nextWidth
  }

  if (handle.includes('n')) {
    const nextHeight = Math.max(minSize.height, node.height - delta.y)
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
  const minSize = getMinNodeSize(node)

  if (direction === 'left') {
    return { ...node, width: Math.max(minSize.width, node.width - step) }
  }

  if (direction === 'right') {
    return { ...node, width: node.width + step }
  }

  if (direction === 'up') {
    return { ...node, height: Math.max(minSize.height, node.height - step) }
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

const shouldCaptureDownloadForQa = () =>
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('qa-downloads')

const recordDownloadForQa = (blob: Blob, filename: string) => {
  try {
    const raw = window.sessionStorage.getItem(DOWNLOAD_QA_STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    const previous: DownloadQaRecord[] = Array.isArray(parsed) ? parsed : []
    const record = { filename, size: blob.size, type: blob.type }
    const records = JSON.stringify([...previous, record].slice(-12))
    window.sessionStorage.setItem(DOWNLOAD_QA_STORAGE_KEY, records)
    document.documentElement.setAttribute(DOWNLOAD_QA_ATTRIBUTE, records)
  } catch {
    // QA capture must never block normal download behavior.
  }
}

const downloadBlob = (blob: Blob, filename: string) => {
  if (shouldCaptureDownloadForQa()) {
    recordDownloadForQa(blob, filename)
    return
  }

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30000)
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
  const initialDraft = useMemo(() => loadBoardDraft(), [])
  const initialBoard = useMemo(
    () => normalizeBoard(initialDraft?.board ?? createDemoBoard()),
    [initialDraft],
  )
  const boardRef = useRef<Board>(initialBoard)
  const [board, setBoard] = useState<Board>(() => initialBoard)
  const [view, setView] = useState<View>(initialView)
  const [tool, setTool] = useState<Tool>('select')
  const [selectedId, setSelectedId] = useState<string>(initialDraft?.board.nodes[0]?.id ?? 'local-first')
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>('')
  const [connectorStartId, setConnectorStartId] = useState<string | null>(null)
  const [connectorPreviewPoint, setConnectorPreviewPoint] = useState<Point | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [status, setStatus] = useState('Ready')
  const [lastChanged, setLastChanged] = useState('Not edited')
  const [canvasSize, setCanvasSize] = useState({ width: 960, height: 620 })
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [boardTitleDraft, setBoardTitleDraft] = useState(initialDraft?.board.name ?? boardName)
  const [templateId, setTemplateId] = useState<TemplateId>('flowchart')
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [history, setHistory] = useState<Board[]>(() => [boardSnapshot(initialBoard)])
  const [future, setFuture] = useState<Board[]>([])
  const dragStartBoardRef = useRef<Board | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const snapToGridRef = useRef(snapToGrid)
  const [autosaveState, setAutosaveState] = useState<AutosaveState>(() => ({
    hasDraft: Boolean(initialDraft),
    savedAt: initialDraft?.savedAt ?? null,
    error: '',
  }))
  const lastSavedBoardRef = useRef<Board>(boardSnapshot(initialBoard))
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const autosaveInitializedRef = useRef(false)
  const autosaveTimerRef = useRef<number | null>(null)

  const setSavedBoardCheckpoint = useCallback((nextBoard: Board) => {
    lastSavedBoardRef.current = boardSnapshot(normalizeBoard(nextBoard))
    setHasUnsavedChanges(false)
  }, [])

  const syncUnsavedState = useCallback((nextBoard: Board) => {
    const normalized = boardSnapshot(normalizeBoard(nextBoard))
    setHasUnsavedChanges(!areBoardsEqual(normalized, lastSavedBoardRef.current))
  }, [])

  const selectedNode = useMemo(
    () => board.nodes.find((node) => node.id === selectedId) ?? null,
    [board.nodes, selectedId],
  )
  const selectedConnector = useMemo(
    () => board.connectors.find((connector) => connector.id === selectedConnectorId) ?? null,
    [board.connectors, selectedConnectorId],
  )
  const selectableItems: SelectableBoardItem[] = useMemo(
    () => [
      ...board.nodes.map((node) => ({ kind: 'node' as const, id: node.id })),
      ...board.connectors.map((connector) => ({ kind: 'connector' as const, id: connector.id })),
    ],
    [board.nodes, board.connectors],
  )

  const elementCount = board.nodes.length + board.connectors.length
  const snapModeLabel = snapToGrid ? `${SNAP_SIZE}px grid` : 'Free'
  const shortcutHint = useMemo(() => {
    if (selectedConnector) {
      return 'Connector shortcuts: arrows move label, Shift+arrows=10px, N/E/S/W set source port, Shift+N/E/S/W set target port, L toggles label, 0 resets offset'
    }

    if (selectedNode) {
      return 'Node shortcuts: arrows move, Shift+arrows = 10px, Alt+arrows resize'
    }

    if (showShortcuts) {
      return 'Shortcut panel open: press ? again to close'
    }

    return 'Press ? for keyboard shortcuts. Press Tab to cycle selection, Shift+Tab previous'
  }, [selectedConnector, selectedNode, showShortcuts])
  const selectedIndex = useMemo(() => {
    if (selectedConnector) {
      return selectableItems.findIndex(
        (item) => item.kind === 'connector' && item.id === selectedConnector.id,
      )
    }

    if (selectedNode) {
      return selectableItems.findIndex((item) => item.kind === 'node' && item.id === selectedNode.id)
    }

    return -1
  }, [selectableItems, selectedConnector, selectedNode])
  const selectionLabel = useMemo(() => {
    if (selectedConnector) {
      return `Connector ${selectedConnector.id} (${selectedIndex + 1}/${selectableItems.length})`
    }

    if (selectedNode) {
      return `Node ${selectedNode.id} (${selectedIndex + 1}/${selectableItems.length})`
    }

    return ''
  }, [selectedConnector, selectedIndex, selectedNode, selectableItems.length])
  const nodeMap = useMemo(
    () => new Map(board.nodes.map((node) => [node.id, node])),
    [board.nodes],
  )
  const connectorModeStatus = useMemo(() => {
    if (tool !== 'connector') {
      return ''
    }

    const startNode = connectorStartId ? nodeMap.get(connectorStartId) : null
    return startNode ? `Target from ${startNode.text}` : 'Pick source node'
  }, [connectorStartId, nodeMap, tool])
  const connectorPreview = useMemo(() => {
    if (tool !== 'connector' || !connectorStartId || !connectorPreviewPoint) {
      return null
    }

    const from = nodeMap.get(connectorStartId)
    if (!from) {
      return null
    }

    const fromPort = choosePortTowardPoint(from, connectorPreviewPoint)

    return {
      end: connectorPreviewPoint,
      fromPort,
      start: getPortPoint(from, fromPort),
      toPort: oppositePort(fromPort),
    }
  }, [connectorPreviewPoint, connectorStartId, nodeMap, tool])
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
  const previewExportNames = useMemo(
    () => buildExportNames(board.name, exportTimeStem()),
    [board],
  )

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

  useEffect(() => {
    boardRef.current = board
  }, [board])

  useEffect(() => {
    snapToGridRef.current = snapToGrid
  }, [snapToGrid])

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = 'You have unsaved changes in Mapsmith.'
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [hasUnsavedChanges])

  const confirmBoardReplace = useCallback((actionName: string) => {
    if (!hasUnsavedChanges) {
      return true
    }

    return window.confirm(`Discard unsaved changes and ${actionName}?`)
  }, [hasUnsavedChanges])

  const copyExportName = useCallback(async (label: string, filename: string) => {
    if (!navigator.clipboard) {
      setStatus(`Clipboard not available for ${label}`)
      return
    }

    try {
      await navigator.clipboard.writeText(filename)
      setStatus(`${label} filename copied`)
    } catch {
      setStatus(`Could not copy ${label} filename`)
    }
  }, [])

  const persistDraft = useCallback((nextBoard: Board) => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }

    try {
      const draft: BoardDraftRecord = {
        type: 'mapsmith-board-draft',
        version: AUTOSAVE_VERSION,
        savedAt: Date.now(),
        board: normalizeBoard(nextBoard),
      }

      window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft))
      setAutosaveState({ hasDraft: true, savedAt: draft.savedAt, error: '' })
    } catch {
      setAutosaveState((current) =>
        current.error
          ? current
          : { ...current, error: 'Draft storage unavailable in this browser' },
      )
    }
  }, [])

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      setAutosaveState((current) =>
        current.error
          ? current
          : { ...current, error: 'Draft storage unavailable in this browser' },
      )
      return
    }

    try {
      window.localStorage.removeItem(AUTOSAVE_KEY)
      setAutosaveState({ hasDraft: false, savedAt: null, error: '' })
      setStatus('Draft cleared')
      setLastChanged(nowLabel())
    } catch {
      setAutosaveState((current) =>
        current.error
          ? current
          : { ...current, error: 'Failed to clear local draft' },
      )
    }
  }, [])

  useEffect(() => {
    if (!autosaveInitializedRef.current) {
      autosaveInitializedRef.current = true
      return
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      persistDraft(board)
    }, 500)

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
    }
  }, [board, persistDraft])

  const markBoardChange = useCallback(
    (nextStatus = 'Edited in memory') => {
      setLastChanged(nowLabel())
      setStatus(nextStatus)
    },
    [],
  )

  const syncSelectionWithBoard = useCallback((nextBoard: Board) => {
    setSelectedId((currentSelectedId) =>
      nextBoard.nodes.some((node) => node.id === currentSelectedId)
        ? currentSelectedId
        : nextBoard.nodes[0]?.id ?? '',
    )

    setSelectedConnectorId((currentConnectorId) =>
      nextBoard.connectors.some((connector) => connector.id === currentConnectorId)
        ? currentConnectorId
        : '',
    )
    setConnectorStartId(null)
  }, [])

  const pushBoardHistory = useCallback(
    (currentBoard: Board, nextBoard: Board) => {
      const normalizedCurrent = boardSnapshot(normalizeBoard(currentBoard))
      const normalizedNext = boardSnapshot(normalizeBoard(nextBoard))
      if (areBoardsEqual(normalizedCurrent, normalizedNext)) {
        return
      }

      setHistory((currentHistory) => {
        const historyCurrent = (() => {
          if (
            currentHistory.length &&
            areBoardsEqual(currentHistory[currentHistory.length - 1], normalizedCurrent)
          ) {
            return currentHistory
          }

          return [...currentHistory, normalizedCurrent].slice(-HISTORY_LIMIT)
        })()

        if (
          historyCurrent.length &&
          areBoardsEqual(historyCurrent[historyCurrent.length - 1], normalizedNext)
        ) {
          return historyCurrent
        }

        return [...historyCurrent, normalizedNext].slice(-HISTORY_LIMIT)
      })

      setFuture([])
    },
    [],
  )

  const updateBoard = useCallback(
    (mutator: (current: Board) => Board, status = 'Edited in memory') => {
      let nextBoardForCommit: Board | null = null
      setBoard((current) => {
        const nextBoard = boardSnapshot(normalizeBoard(mutator(current)))
        if (areBoardsEqual(current, nextBoard)) {
          return current
        }

        pushBoardHistory(current, nextBoard)
        nextBoardForCommit = nextBoard
        return nextBoard
      })
      if (nextBoardForCommit) {
        syncUnsavedState(nextBoardForCommit)
      }
      markBoardChange(status)
    },
    [markBoardChange, pushBoardHistory, syncUnsavedState],
  )

  const recordBoardSnapshot = useCallback(
    (
      status = 'Edited in memory',
      previousBoard: Board | null = null,
      finalizeCurrent?: (current: Board) => Board,
    ) => {
      if (!previousBoard) {
        markBoardChange(status)
        return
      }

      let nextBoardForSync: Board | null = null
      setBoard((current) => {
        const finalizedCurrent = finalizeCurrent ? finalizeCurrent(current) : current
        const normalizedCurrent = boardSnapshot(normalizeBoard(finalizedCurrent))
        pushBoardHistory(previousBoard, normalizedCurrent)
        nextBoardForSync = normalizedCurrent
        return normalizedCurrent
      })
      if (nextBoardForSync) {
        syncUnsavedState(nextBoardForSync)
      }
      markBoardChange(status)
    },
    [markBoardChange, pushBoardHistory, syncUnsavedState],
  )
  const setActiveDragState = useCallback((nextDragState: DragState | null) => {
    dragStateRef.current = nextDragState
    setDragState(nextDragState)
  }, [])

  const reportSelection = useCallback(
    (item: SelectableBoardItem | null, position: number | null = null) => {
      if (!item || position === null || position < 0 || selectableItems.length === 0) {
        return
      }

      setStatus(`Selected ${item.kind} ${item.id} (${(position + 1).toString()}/${selectableItems.length.toString()})`)
    },
    [selectableItems.length],
  )
  const cycleSelection = useCallback(
    (direction: 1 | -1) => {
      if (selectableItems.length === 0) {
        setStatus('No items to select')
        return
      }

      const currentIndex = selectableItems.findIndex(
        (item) =>
          (item.kind === 'node' && item.id === selectedId) ||
          (item.kind === 'connector' && item.id === selectedConnectorId),
      )
      const nextIndex =
        currentIndex === -1
          ? (direction === 1 ? 0 : selectableItems.length - 1)
          : (currentIndex + direction + selectableItems.length) % selectableItems.length
      const next = selectableItems[nextIndex]

      if (next.kind === 'node') {
        setSelectedId(next.id)
        setSelectedConnectorId('')
      } else {
        setSelectedId('')
        setSelectedConnectorId(next.id)
      }
      setConnectorStartId(null)
      reportSelection(next, nextIndex)
    },
    [reportSelection, selectableItems, selectedConnectorId, selectedId],
  )

  const canUndo = history.length > 1
  const canRedo = future.length > 0

  const undo = useCallback(() => {
    if (history.length <= 1) {
      setStatus('Nothing to undo')
      return
    }

    const previousState = history[history.length - 2]

    setHistory((currentHistory) => currentHistory.slice(0, -1))
    setFuture((currentFuture) => [boardSnapshot(normalizeBoard(boardRef.current)), ...currentFuture].slice(0, HISTORY_LIMIT))
    setBoard(previousState)
    syncSelectionWithBoard(previousState)
    syncUnsavedState(previousState)
    markBoardChange('Undo')
  }, [history, markBoardChange, syncSelectionWithBoard, syncUnsavedState])

  const redo = useCallback(() => {
    if (future.length < 1) {
      setStatus('Nothing to redo')
      return
    }

    const nextState = future[0]
    setHistory((currentHistory) => [...currentHistory, nextState].slice(-HISTORY_LIMIT))
    setFuture((currentFuture) => currentFuture.slice(1))
    setBoard(nextState)
    syncSelectionWithBoard(nextState)
    syncUnsavedState(nextState)
    markBoardChange('Redo')
  }, [future, markBoardChange, syncSelectionWithBoard, syncUnsavedState])

  const recoverDraft = useCallback(() => {
    if (!confirmBoardReplace('load the local draft')) {
      return
    }

    const draft = loadBoardDraft()
    if (!draft) {
      setAutosaveState((current) => ({
        ...current,
        hasDraft: false,
        savedAt: null,
      }))
      setStatus('No local draft to recover')
      return
    }

    const nextBoard = normalizeBoard(draft.board)
    updateBoard(() => nextBoard, 'Draft recovered')
    setBoardTitleDraft(nextBoard.name)
    setView(initialView)
    syncSelectionWithBoard(nextBoard)
    setSavedBoardCheckpoint(nextBoard)
    setAutosaveState({ hasDraft: true, savedAt: draft.savedAt, error: '' })
  }, [confirmBoardReplace, setSavedBoardCheckpoint, syncSelectionWithBoard, updateBoard])

  const applyTemplate = useCallback(
    (nextTemplateId: TemplateId) => {
      const template = boardTemplates.find((entry) => entry.id === nextTemplateId)
      if (!template) {
        setStatus('Unknown template')
        return
      }

      if (!confirmBoardReplace(`load ${template.name}`)) {
        return
      }

      const nextBoard = normalizeBoard(template.createBoard())
      updateBoard(() => nextBoard, `${template.name} template loaded`)
      setBoardTitleDraft(nextBoard.name)
      setView(initialView)
      setSavedBoardCheckpoint(nextBoard)
    },
    [confirmBoardReplace, setSavedBoardCheckpoint, updateBoard],
  )

  const applyBoardTitle = useCallback(() => {
    const nextName = boardTitleDraft.trim() || 'Mapsmith board'
    if (nextName === board.name) {
      return
    }

    updateBoard((current) => ({ ...current, name: nextName }), 'Board title updated')
    setBoardTitleDraft(nextName)
  }, [board.name, boardTitleDraft, updateBoard])

  const removeConnector = useCallback(
    (connectorId: string) => {
      updateBoard(
        (current) => ({
          ...current,
          connectors: current.connectors.filter((connector) => connector.id !== connectorId),
        }),
        'Connector deleted',
      )
      if (selectedConnectorId === connectorId) {
        setSelectedConnectorId('')
      }
    },
    [selectedConnectorId, updateBoard],
  )

  const removeNode = useCallback(
    (nodeId: string) => {
      updateBoard(
        (current) => ({
          ...current,
          nodes: current.nodes.filter((node) => node.id !== nodeId),
          connectors: current.connectors.filter(
            (connector) => connector.from !== nodeId && connector.to !== nodeId,
          ),
        }),
        'Node deleted',
      )
      if (selectedId === nodeId) {
        setSelectedId('')
      }
      setSelectedConnectorId('')
      setConnectorStartId(null)
    },
    [selectedId, updateBoard],
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

      updateBoard(
        (current) => ({
          ...current,
          nodes: current.nodes.map((node) =>
            node.id === selectedNode.id ? { ...node, ...patch } : node,
          ),
        }),
        'Edited in memory',
      )
    },
    [selectedNode, updateBoard],
  )

  const updateSelectedConnectorPort = useCallback(
    (side: 'fromPort' | 'toPort', port: PortName) => {
      if (!selectedConnector) {
        return
      }

      updateBoard(
        (current) => ({
          ...current,
          connectors: current.connectors.map((connector) =>
            connector.id === selectedConnector.id ? { ...connector, [side]: port } : connector,
          ),
        }),
        side === 'fromPort' ? 'Source port changed' : 'Target port changed',
      )
    },
    [selectedConnector, updateBoard],
  )

  const updateSelectedConnectorLabel = useCallback(
    (rawLabel: string) => {
      if (!selectedConnector) {
        return
      }

      const nextLabel = rawLabel.trim() === '' ? undefined : rawLabel
      updateBoard(
        (current) => ({
          ...current,
          connectors: current.connectors.map((connector) =>
            connector.id === selectedConnector.id
              ? {
                  ...connector,
                  label: nextLabel,
                  showLabel: nextLabel === undefined ? false : true,
                }
              : connector,
          ),
        }),
        'Connector label changed',
      )
    },
    [selectedConnector, updateBoard],
  )

  const updateSelectedConnectorLabelOffset = useCallback(
    (axis: 'x' | 'y', value: string) => {
      if (!selectedConnector) {
        return
      }

      const nextValue = value.trim() === '' ? 0 : Number(value)
      if (Number.isNaN(nextValue)) {
        return
      }

      updateBoard(
        (current) => ({
          ...current,
          connectors: current.connectors.map((connector) =>
            connector.id === selectedConnector.id
              ? {
                  ...connector,
                  [axis === 'x' ? 'labelOffsetX' : 'labelOffsetY']: nextValue,
                }
              : connector,
          ),
        }),
        'Connector label position changed',
      )
    },
    [selectedConnector, updateBoard],
  )

  const updateSelectedConnectorLabelVisibility = useCallback(
    (nextValue: boolean) => {
      if (!selectedConnector) {
        return
      }

      updateBoard(
        (current) => ({
          ...current,
          connectors: current.connectors.map((connector) =>
            connector.id === selectedConnector.id
              ? { ...connector, showLabel: nextValue }
              : connector,
          ),
        }),
        'Connector label visibility changed',
      )
    },
    [selectedConnector, updateBoard],
  )

  const handleCanvasPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.button !== 0) {
        return
      }

      const point = screenToWorld(event.clientX, event.clientY)

      if (tool === 'pan') {
        hasDraggedRef.current = false
        setActiveDragState({
          mode: 'pan',
          startClientX: event.clientX,
          startClientY: event.clientY,
          startView: view,
        })
        setStatus('Panning board')
        return
      }

      if (tool === 'rectangle' || tool === 'diamond' || tool === 'ellipse' || tool === 'text') {
        const createdNode = createNode(tool, point)
        const node = snapToGrid ? snapNodePosition(createdNode) : createdNode
        updateBoard(
          (current) => ({
            ...current,
            nodes: [...current.nodes, node],
          }),
          `${tool[0].toUpperCase()}${tool.slice(1)} added`,
        )
        setSelectedId(node.id)
        setSelectedConnectorId('')
        setTool('select')
        return
      }

      setSelectedId('')
      setSelectedConnectorId('')
      setConnectorStartId(null)
    },
    [screenToWorld, setActiveDragState, snapToGrid, tool, updateBoard, view],
  )

  const handleNodePointerDown = useCallback(
    (event: ReactPointerEvent<SVGGElement>, node: DiagramNode) => {
      event.stopPropagation()
      const point = screenToWorld(event.clientX, event.clientY)

      if (tool === 'connector') {
        if (!connectorStartId) {
          setConnectorStartId(node.id)
          setConnectorPreviewPoint(centerOf(node))
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
          updateBoard(
            (current) => ({
              ...current,
              connectors: [...current.connectors, assignPorts(connector, nodeMap)],
            }),
            'Connector added',
          )
          setSelectedId(node.id)
          setSelectedConnectorId('')
          setConnectorStartId(null)
          setConnectorPreviewPoint(null)
          setTool('select')
          return
        }

        return
      }

      setSelectedId(node.id)
      setSelectedConnectorId('')
      setConnectorStartId(null)
      reportSelection(
        { kind: 'node', id: node.id },
        selectableItems.findIndex((item) => item.kind === 'node' && item.id === node.id),
      )
      canvasRef.current?.focus()
      hasDraggedRef.current = false
      dragStartBoardRef.current = boardSnapshot(boardRef.current)
      setActiveDragState({
        mode: 'node',
        id: node.id,
        offsetX: point.x - node.x,
        offsetY: point.y - node.y,
      })
      setStatus('Selected node')
    },
    [
      connectorStartId,
      nodeMap,
      screenToWorld,
      setActiveDragState,
      tool,
      reportSelection,
      selectableItems,
      updateBoard,
    ],
  )

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<SVGCircleElement>, node: DiagramNode, handle: ResizeHandle) => {
      event.stopPropagation()
      setSelectedId(node.id)
      setSelectedConnectorId('')
      setConnectorStartId(null)
      canvasRef.current?.focus()
      hasDraggedRef.current = false
      dragStartBoardRef.current = boardSnapshot(boardRef.current)
      setActiveDragState({
        mode: 'resize',
        id: node.id,
        handle,
        startPoint: screenToWorld(event.clientX, event.clientY),
        startNode: node,
      })
      setStatus('Resizing node')
    },
    [screenToWorld, setActiveDragState],
  )

  const handleConnectorPointerDown = useCallback(
    (event: ReactPointerEvent<SVGGElement>, connector: Connector) => {
      event.stopPropagation()
      setSelectedId('')
      setSelectedConnectorId(connector.id)
      setConnectorStartId(null)
      setTool('select')
      reportSelection(
        { kind: 'connector', id: connector.id },
        selectableItems.findIndex((item) => item.kind === 'connector' && item.id === connector.id),
      )
      canvasRef.current?.focus()
    },
    [selectableItems, reportSelection],
  )

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const activeDragState = dragStateRef.current
      const isSnapEnabled = snapToGridRef.current

      if (!activeDragState) {
        if (tool === 'connector' && connectorStartId) {
          setConnectorPreviewPoint(screenToWorld(event.clientX, event.clientY))
        }
        return
      }

      if (activeDragState.mode === 'pan') {
        hasDraggedRef.current = true
        const dx = (event.clientX - activeDragState.startClientX) / activeDragState.startView.zoom
        const dy = (event.clientY - activeDragState.startClientY) / activeDragState.startView.zoom
        setView({
          ...activeDragState.startView,
          x: activeDragState.startView.x - dx,
          y: activeDragState.startView.y - dy,
        })
        return
      }

      if (activeDragState.mode === 'resize') {
        hasDraggedRef.current = true
        const point = screenToWorld(event.clientX, event.clientY)
        const delta = {
          x: point.x - activeDragState.startPoint.x,
          y: point.y - activeDragState.startPoint.y,
        }
        const resizedNode = resizeNode(activeDragState.startNode, activeDragState.handle, delta)
        const nextNode = isSnapEnabled ? snapNodeFrame(resizedNode) : resizedNode
        let nextBoard: Board | null = null
        setBoard((current) => {
          const next = {
            ...current,
            nodes: current.nodes.map((node) => (node.id === activeDragState.id ? nextNode : node)),
          }
          nextBoard = next
          return next
        })
        if (nextBoard) {
          syncUnsavedState(nextBoard)
        }
        setLastChanged(nowLabel())
        setStatus(isSnapEnabled ? 'Resizing node on grid' : 'Resizing node')
        return
      }

      const point = screenToWorld(event.clientX, event.clientY)
      const rawPosition = {
        x: point.x - activeDragState.offsetX,
        y: point.y - activeDragState.offsetY,
      }
      const position = isSnapEnabled ? snapPoint(rawPosition) : rawPosition
      hasDraggedRef.current = true
      let nextBoard: Board | null = null
      setBoard((current) => {
        nextBoard = {
          ...current,
          nodes: current.nodes.map((node) =>
            node.id === activeDragState.id
              ? {
                  ...node,
                  x: position.x,
                  y: position.y,
                }
              : node,
          ),
        }
        return nextBoard
      })
      if (nextBoard) {
        syncUnsavedState(nextBoard)
      }
      setLastChanged(nowLabel())
      setStatus(isSnapEnabled ? 'Moving node on grid' : 'Moving node')
    },
    [connectorStartId, screenToWorld, syncUnsavedState, tool],
  )

  const handlePointerUp = useCallback(() => {
    const activeDragState = dragStateRef.current
    const shouldSnapOnPointerUp = snapToGrid
    if (activeDragState?.mode === 'resize' && hasDraggedRef.current) {
      recordBoardSnapshot('Resized node', dragStartBoardRef.current, (current) =>
        shouldSnapOnPointerUp
          ? {
              ...current,
              nodes: current.nodes.map((node) =>
                node.id === activeDragState.id ? snapNodeFrame(node) : node,
              ),
            }
          : current,
      )
    } else if (activeDragState?.mode === 'node' && hasDraggedRef.current) {
      recordBoardSnapshot('Moved node', dragStartBoardRef.current, (current) =>
        shouldSnapOnPointerUp
          ? {
              ...current,
              nodes: current.nodes.map((node) =>
                node.id === activeDragState.id ? snapNodePosition(node) : node,
              ),
            }
          : current,
      )
    } else if (activeDragState?.mode === 'pan' && hasDraggedRef.current) {
      setStatus('Board panned')
    }
    dragStartBoardRef.current = null
    setActiveDragState(null)
  }, [recordBoardSnapshot, setActiveDragState, snapToGrid])

  const saveBoard = useCallback(() => {
    const seed = exportTimeStem()
    const nextNames = buildExportNames(board.name, seed)
    const normalized = normalizeBoard(board)
    downloadBlob(
      new Blob([serializeBoardFile(normalized)], { type: 'application/json' }),
      nextNames.mapsmith,
    )
    setSavedBoardCheckpoint(normalized)
    setStatus(`Board file prepared: ${nextNames.mapsmith}`)
  }, [board, setSavedBoardCheckpoint])

  const openBoard = useCallback(() => {
    if (!confirmBoardReplace('open a new board')) {
      return
    }

    fileInputRef.current?.click()
  }, [confirmBoardReplace])

  const handleFileSelected = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const parsedBoard = parseBoardFileText(text)

      const nextBoard = normalizeBoard(parsedBoard)
      updateBoard(() => nextBoard, 'Board loaded')
      setBoardTitleDraft(parsedBoard.name)
      syncSelectionWithBoard(nextBoard)
      setSavedBoardCheckpoint(nextBoard)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load board'
      setStatus(`Could not load board: ${message}`)
    }
  }, [setSavedBoardCheckpoint, syncSelectionWithBoard, updateBoard])

  const resetBoard = useCallback(() => {
    if (!confirmBoardReplace('reset to the demo board')) {
      return
    }

    const nextBoard = normalizeBoard(createDemoBoard())
    updateBoard(() => nextBoard, 'Demo board reset')
    setBoardTitleDraft(nextBoard.name)
    syncSelectionWithBoard(nextBoard)
    setView(initialView)
    setSavedBoardCheckpoint(nextBoard)
  }, [confirmBoardReplace, setSavedBoardCheckpoint, syncSelectionWithBoard, updateBoard])

  const exportPng = useCallback(async () => {
    const seed = exportTimeStem()
    const nextNames = buildExportNames(board.name, seed)

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

    downloadBlob(blob, nextNames.png)
    setStatus(`PNG export prepared: ${nextNames.png}`)
  }, [board])

  const exportSvg = useCallback(() => {
    const seed = exportTimeStem()
    const nextNames = buildExportNames(board.name, seed)

    if (!canvasRef.current) {
      setStatus('Canvas not ready')
      return
    }

    downloadBlob(
      new Blob([createSvgExport(board)], { type: 'image/svg+xml;charset=utf-8' }),
      nextNames.svg,
    )
    setStatus(`SVG export prepared: ${nextNames.svg}`)
  }, [board])

  const handleCanvasKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGSVGElement>) => {
      if (event.target instanceof HTMLInputElement) {
        return
      }

      const isFileShortcut = event.metaKey || event.ctrlKey
      const fileKey = event.key.toLowerCase()

      if (isFileShortcut && fileKey === 's') {
        event.preventDefault()
        saveBoard()
        setStatus('Board save shortcut used')
        return
      }

      if (isFileShortcut && fileKey === 'o') {
        event.preventDefault()
        openBoard()
        setStatus('Board open shortcut used')
        return
      }

      if (isFileShortcut && event.shiftKey && fileKey === 'p') {
        event.preventDefault()
        void exportPng()
        setStatus('PNG export shortcut used')
        return
      }

      if (isFileShortcut && event.shiftKey && fileKey === 'e') {
        event.preventDefault()
        exportSvg()
        setStatus('SVG export shortcut used')
        return
      }

      if (isFileShortcut && fileKey === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
        return
      }

      if (isFileShortcut && ((event.shiftKey && fileKey === 'z') || fileKey === 'y')) {
        event.preventDefault()
        redo()
        return
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        cycleSelection(event.shiftKey ? -1 : 1)
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

      if (selectedConnector && (event.key === 'l' || event.key === 'L')) {
        event.preventDefault()
        updateBoard((current) => ({
          ...current,
          connectors: current.connectors.map((connector) =>
            connector.id === selectedConnector.id
              ? toggleConnectorLabelVisibility(connector)
              : connector,
          ),
        }), 'Connector label visibility toggled')
        return
      }

      if (selectedConnector) {
        const portMap: Record<string, PortName> = {
          n: 'north',
          e: 'east',
          s: 'south',
          w: 'west',
        }

        const connectorPort = portMap[fileKey]
        if (connectorPort) {
          event.preventDefault()
          updateSelectedConnectorPort(event.shiftKey ? 'toPort' : 'fromPort', connectorPort)
          return
        }
      }

      if (selectedConnector && event.key === '0') {
        event.preventDefault()
        updateBoard(
          (current) => ({
            ...current,
            connectors: current.connectors.map((connector) =>
              connector.id === selectedConnector.id ? resetConnectorLabelOffset(connector) : connector,
            ),
          }),
          'Connector label offset reset',
        )
        return
      }

      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        return
      }

      if (selectedConnector) {
        event.preventDefault()
        const step = event.shiftKey ? 10 : 1
        const direction = event.key.replace('Arrow', '').toLowerCase() as
          | 'left'
          | 'right'
          | 'up'
          | 'down'

        updateBoard(
          (current) => ({
            ...current,
            connectors: current.connectors.map((connector) =>
              connector.id === selectedConnector.id
                ? nudgeConnectorLabelOffset(connector, direction, step)
                : connector,
            ),
          }),
          'Connector label nudged',
        )
        return
      }

      if (!selectedNode) {
        return
      }

      event.preventDefault()
      const step = event.shiftKey ? 10 : 1
      const direction = event.key.replace('Arrow', '').toLowerCase() as
        | 'left'
        | 'right'
        | 'up'
        | 'down'

      updateBoard(
        (current) => ({
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
        }),
        event.altKey ? 'Keyboard resized' : 'Keyboard nudged',
      )
    },
    [
      exportPng,
      exportSvg,
      openBoard,
      redo,
      cycleSelection,
      removeConnector,
      removeNode,
      saveBoard,
      selectedConnector,
      updateSelectedConnectorPort,
      selectedNode,
      undo,
      updateBoard,
      showShortcuts,
    ],
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
            <input
              aria-label="Board title"
              className="board-title-field"
              value={boardTitleDraft}
              onChange={(event) => setBoardTitleDraft(event.target.value)}
              onBlur={applyBoardTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  applyBoardTitle()
                }
              }}
            />
          </div>
        </div>

        <div className="command-strip" aria-label="Board commands">
          <button type="button" onClick={saveBoard} title="Save board (Ctrl/Cmd + S)">
            <Save size={17} />
            <span>Save</span>
          </button>
          <button type="button" onClick={openBoard} title="Open board (Ctrl/Cmd + O)">
            <FolderOpen size={17} />
            <span>Open</span>
          </button>
          <button
            type="button"
            onClick={exportPng}
            title="Export PNG (Ctrl/Cmd + Shift + P)"
          >
            <ImageDown size={17} />
            <span>PNG</span>
          </button>
          <button
            type="button"
            onClick={exportSvg}
            title="Export SVG (Ctrl/Cmd + Shift + E)"
          >
            <FileInput size={17} />
            <span>SVG</span>
          </button>
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl/Cmd + Z)"
          >
            <Undo2 size={17} />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl/Cmd + Shift + Z / Ctrl/Cmd + Y)"
          >
            <Redo2 size={17} />
            <span>Redo</span>
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
              <dt>Snap</dt>
              <dd>{snapModeLabel}</dd>
            </div>
            <div>
              <dt>Changed</dt>
              <dd>{lastChanged}</dd>
            </div>
            <div>
              <dt>Unsaved</dt>
              <dd className={hasUnsavedChanges ? 'unsaved unsaved-changes' : 'unsaved'}>
                {hasUnsavedChanges ? 'Unsaved changes' : 'Saved'}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{status}</dd>
            </div>
          </dl>

          <section className="snap-panel" aria-label="Canvas alignment">
            <label className="snap-toggle">
              <input
                aria-label="Snap to grid"
                checked={snapToGrid}
                type="checkbox"
                onChange={(event) => {
                  const nextSnapToGrid = event.target.checked
                  snapToGridRef.current = nextSnapToGrid
                  setSnapToGrid(nextSnapToGrid)
                  setStatus(nextSnapToGrid ? 'Snap grid enabled' : 'Free movement enabled')
                }}
              />
              <span>
                <strong>Snap grid</strong>
                <small>{snapToGrid ? `${SNAP_SIZE}px movement` : 'Free movement'}</small>
              </span>
            </label>
          </section>

          <section className="autosave-panel" aria-label="Local draft recovery">
            <h3>Local draft</h3>
            <p>
              {autosaveState.hasDraft
                ? `Saved draft: ${draftSavedLabel(autosaveState.savedAt)}`
                : 'No local draft saved yet'}
            </p>
            <div className="autosave-actions">
              <button
                className="template-load autosave-button"
                type="button"
                onClick={recoverDraft}
                disabled={!autosaveState.hasDraft}
              >
                <History size={16} />
                <span>Recover draft</span>
              </button>
              <button
                className="autosave-button autosave-button-secondary"
                type="button"
                onClick={clearDraft}
                disabled={!autosaveState.hasDraft}
              >
                Clear draft
              </button>
            </div>
            {autosaveState.error ? <p className="autosave-warning">{autosaveState.error}</p> : null}
          </section>

          <section className="import-help" aria-label="Import support">
            <h3>Import support</h3>
            <p>Accepted board formats:</p>
            <ul>
              <li>Wrapped format: <code>{importHelp.wrapped}</code></li>
              <li>Accepted extensions: <code>{importHelp.supportedExtensions}</code></li>
              <li>Raw board object: <code>{importHelp.legacyRaw}</code></li>
            </ul>
            <p>
              Errors appear in Status with a reason, for example:
              <code>Unsupported board file type</code>.
            </p>
          </section>

          <section className="template-panel" aria-label="Starter templates">
            <h3>Starter Templates</h3>
            <label>
              <span>Load a blank board quickly</span>
              <select
                aria-label="Template board"
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value as TemplateId)}
              >
                {boardTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <p>{boardTemplates.find((template) => template.id === templateId)?.description}</p>
            <button
              className="template-load"
              type="button"
              onClick={() => applyTemplate(templateId)}
            >
              Load Template
            </button>
          </section>

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
                  <dt>Label</dt>
                  <input
                    value={selectedConnector.label ?? ''}
                    placeholder="Optional connector label"
                    onChange={(event) => updateSelectedConnectorLabel(event.target.value)}
                  />
                  <label className="connector-label-control">
                    <span>Show label</span>
                    <input
                      type="checkbox"
                      checked={isConnectorLabelVisible(selectedConnector)}
                      onChange={(event) => updateSelectedConnectorLabelVisibility(event.target.checked)}
                    />
                  </label>
                  <label className="connector-label-control">
                    <span>Offset X</span>
                    <input
                      type="number"
                      value={selectedConnector.labelOffsetX ?? 0}
                      step="1"
                      onChange={(event) =>
                        updateSelectedConnectorLabelOffset('x', event.target.value)
                      }
                    />
                  </label>
                  <label className="connector-label-control">
                    <span>Offset Y</span>
                    <input
                      type="number"
                      value={selectedConnector.labelOffsetY ?? 0}
                      step="1"
                      onChange={(event) =>
                        updateSelectedConnectorLabelOffset('y', event.target.value)
                      }
                    />
                  </label>
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
                  setConnectorPreviewPoint(null)
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
                const isSelectedConnector = selectedConnectorId === connector.id
                const { start, end, fromPort, toPort } = getPersistentConnectorEndpoints(
                  normalizedConnector,
                  from,
                  to,
                )
                const connectorPath = createConnectorPath(start, end, fromPort, toPort)
                const labelPoint = getConnectorLabelPoint(start, end, fromPort, toPort)
                return (
                  <g
                    key={connector.id}
                    className={`connector ${isSelectedConnector ? 'selected' : ''}`}
                    onPointerDown={(event) => handleConnectorPointerDown(event, normalizedConnector)}
                  >
                    {isSelectedConnector ? (
                      <path
                        d={connectorPath}
                        className="connector-selection-ring"
                        fill="none"
                        stroke={connector.stroke}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="10"
                      />
                    ) : null}
                    <path
                      d={connectorPath}
                      className="connector-hit"
                      fill="none"
                      stroke="transparent"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="18"
                    />
                    <path
                      d={connectorPath}
                      className="connector-line"
                      fill="none"
                      markerEnd="url(#arrowhead)"
                      stroke={connector.stroke}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                    />
                    {connector.label && connector.showLabel !== false ? (
                      <text
                        className="connector-label"
                        x={labelPoint.x + (connector.labelOffsetX ?? 0)}
                        y={labelPoint.y + (connector.labelOffsetY ?? 0)}
                        textAnchor="middle"
                      >
                        {connector.label}
                      </text>
                    ) : null}
                    {isSelectedConnector ? (
                      <>
                        <circle className="connector-port" cx={start.x} cy={start.y} r="5.5" />
                        <circle className="connector-port" cx={end.x} cy={end.y} r="5.5" />
                      </>
                    ) : null}
                  </g>
                )
              })}
            </g>

            {connectorPreview ? (
              <g className="connector-preview" aria-hidden="true">
                <path
                  className="connector-preview-line"
                  d={createConnectorPath(
                    connectorPreview.start,
                    connectorPreview.end,
                    connectorPreview.fromPort,
                    connectorPreview.toPort,
                  )}
                  fill="none"
                  markerEnd="url(#arrowhead)"
                />
                <circle
                  className="connector-preview-end"
                  cx={connectorPreview.end.x}
                  cy={connectorPreview.end.y}
                  r="5"
                />
              </g>
            ) : null}

            <g className="nodes">
              {board.nodes.map((node) => (
                <DiagramNodeView
                  key={node.id}
                  isConnectorStart={connectorStartId === node.id}
                  isSelected={selectedId === node.id}
                  node={node}
                  showConnectorPorts={tool === 'connector'}
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
              ? `${tool[0].toUpperCase()}${tool.slice(1)} mode`
              : `${tool[0].toUpperCase()}${tool.slice(1)} mode${selectionLabel ? ` • ${selectionLabel}` : ''}`}
            {connectorModeStatus ? <span className="connector-mode-chip">{connectorModeStatus}</span> : null}
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
                    <kbd>Tab</kbd>
                    <span>next</span>
                    <kbd>Shift</kbd>
                    <span>+Tab previous</span>
                  </dd>
                </div>
                <div>
                  <dt>Nudge Node</dt>
                  <dd>
                    <kbd>Arrows</kbd>
                    <span>1px</span>
                    <kbd>Shift</kbd>
                    <span>10px</span>
                  </dd>
                </div>
                <div>
                  <dt>Nudge Connector Label</dt>
                  <dd>
                    <kbd>Arrows</kbd>
                    <span>1px</span>
                    <kbd>Shift</kbd>
                    <span>10px (selected connector)</span>
                  </dd>
                </div>
                <div>
                  <dt>Toggle Connector Label</dt>
                  <dd>
                    <kbd>L</kbd>
                    <span>Show/hide selected connector label</span>
                  </dd>
                </div>
                <div>
                  <dt>Reset Connector Label</dt>
                  <dd>
                    <kbd>0</kbd>
                    <span>Reset selected connector label position</span>
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
                    <span>From:</span>
                    <kbd>N</kbd>
                    <kbd>E</kbd>
                    <kbd>S</kbd>
                    <kbd>W</kbd>
                    <span>To:</span>
                    <kbd>Shift</kbd>
                    <span>+</span>
                    <kbd>N</kbd>
                    <span>/</span>
                    <kbd>E</kbd>
                    <span>/</span>
                    <kbd>S</kbd>
                    <span>/</span>
                    <kbd>W</kbd>
                  </dd>
                </div>
                <div>
                  <dt>History</dt>
                  <dd>
                    <kbd>Ctrl/Cmd</kbd>
                    <span>+</span>
                    <kbd>Z</kbd>
                    <span>undo</span>
                    <kbd>Ctrl/Cmd</kbd>
                    <span>+</span>
                    <kbd>Shift</kbd>
                    <span>+</span>
                    <kbd>Z</kbd>
                    <span>redo</span>
                    <kbd>or</kbd>
                    <kbd>Ctrl/Cmd</kbd>
                    <span>+</span>
                    <kbd>Y</kbd>
                  </dd>
                </div>
                <div>
                  <dt>Files</dt>
                  <dd>
                    <span>Save</span>
                    <kbd>Ctrl/Cmd</kbd>
                    <span>+</span>
                    <kbd>S</kbd>
                    <span>Open</span>
                    <kbd>Ctrl/Cmd</kbd>
                    <span>+</span>
                    <kbd>O</kbd>
                    <span>PNG</span>
                    <kbd>Ctrl/Cmd</kbd>
                    <span>+Shift</span>
                    <kbd>P</kbd>
                    <span>SVG</span>
                    <kbd>Ctrl/Cmd</kbd>
                    <span>+Shift</span>
                    <kbd>E</kbd>
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
          <section className="file-shortcuts" aria-label="File shortcuts">
            <h3>File shortcuts</h3>
            <dl className="metadata-list file-shortcuts-list">
              <div>
                <dt>Undo</dt>
                <dd>
                  <kbd>Ctrl/Cmd</kbd>
                  <span>+</span>
                  <kbd>Z</kbd>
                </dd>
              </div>
              <div>
                <dt>Redo</dt>
                <dd>
                  <kbd>Ctrl/Cmd</kbd>
                  <span>+</span>
                  <kbd>Shift</kbd>
                  <span>+</span>
                  <kbd>Z</kbd>
                  <span>or</span>
                  <kbd>Ctrl/Cmd</kbd>
                  <span>+</span>
                  <kbd>Y</kbd>
                </dd>
              </div>
              <div>
                <dt>Save</dt>
                <dd>
                  <kbd>Ctrl/Cmd</kbd>
                  <span>+</span>
                  <kbd>S</kbd>
                </dd>
              </div>
              <div>
                <dt>Open</dt>
                <dd>
                  <kbd>Ctrl/Cmd</kbd>
                  <span>+</span>
                  <kbd>O</kbd>
                </dd>
              </div>
              <div>
                <dt>PNG</dt>
                <dd>
                  <kbd>Ctrl/Cmd</kbd>
                  <span>+Shift</span>
                  <kbd>P</kbd>
                </dd>
              </div>
              <div>
                <dt>SVG</dt>
                <dd>
                  <kbd>Ctrl/Cmd</kbd>
                  <span>+Shift</span>
                  <kbd>E</kbd>
                </dd>
              </div>
            </dl>
          </section>
          <section className="export-metadata" aria-label="Export metadata">
            <h3>Current Files</h3>
            <dl className="metadata-list">
              <div>
                <dt>Board</dt>
                <dd>{board.name || 'Mapsmith board'}</dd>
              </div>
              <div>
                <dt>Maps file</dt>
                <dd>
                  <span>{previewExportNames.mapsmith}</span>
                  <button
                    type="button"
                    onClick={() => copyExportName('Maps file', previewExportNames.mapsmith)}
                  >
                    Copy
                  </button>
                </dd>
              </div>
              <div>
                <dt>PNG file</dt>
                <dd>
                  <span>{previewExportNames.png}</span>
                  <button
                    type="button"
                    onClick={() => copyExportName('PNG file', previewExportNames.png)}
                  >
                    Copy
                  </button>
                </dd>
              </div>
              <div>
                <dt>SVG file</dt>
                <dd>
                  <span>{previewExportNames.svg}</span>
                  <button
                    type="button"
                    onClick={() => copyExportName('SVG file', previewExportNames.svg)}
                  >
                    Copy
                  </button>
                </dd>
              </div>
            </dl>
          </section>
          <section className="licence-panel" aria-label="Licence and contact">
            <div className="licence-panel-heading">
              <Info size={16} />
              <h3>Licence</h3>
            </div>
            <p>
              Source-available for personal and non-commercial use under PolyForm
              Noncommercial 1.0.0.
            </p>
            <dl className="licence-list">
              <div>
                <dt>Commercial use</dt>
                <dd>Requires a separate written license from TWO HANDS NETWORK LTD.</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>
                  <a href={`mailto:${projectLinks.contactEmail}`}>{projectLinks.contactEmail}</a>
                </dd>
              </div>
            </dl>
            <div className="licence-links" aria-label="Licence links">
              <a href={projectLinks.license} rel="noreferrer" target="_blank">
                License
              </a>
              <a href={projectLinks.notice} rel="noreferrer" target="_blank">
                Notice
              </a>
              <a href={projectLinks.commercialLicense} rel="noreferrer" target="_blank">
                Commercial
              </a>
            </div>
          </section>
        </aside>
      </section>

      <footer className="statusbar">
        <span>Personal/non-commercial use. Commercial license: TWO HANDS NETWORK LTD</span>
        <span>{shortcutHint}</span>
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
  showConnectorPorts,
  onPointerDown,
  onResizePointerDown,
  onSelect,
}: {
  isConnectorStart: boolean
  isSelected: boolean
  node: DiagramNode
  showConnectorPorts: boolean
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
      {showConnectorPorts
        ? portNames.map((port) => {
            const point = getPortPoint(node, port)
            return (
              <circle
                key={`${node.id}-connector-port-${port}`}
                className={`connector-target-port ${isConnectorStart ? 'source' : ''}`}
                cx={point.x}
                cy={point.y}
                data-connector-port={port}
                data-connector-source={isConnectorStart ? 'true' : undefined}
                r="5"
              />
            )
          })
        : null}
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
