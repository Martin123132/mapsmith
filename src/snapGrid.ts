import type { DiagramNode } from './boardFile.js'

export const SNAP_SIZE = 20

export type SnapPoint = {
  x: number
  y: number
}

export const getMinNodeSize = (node: DiagramNode) => ({
  width: node.kind === 'text' ? 120 : 96,
  height: node.kind === 'text' ? 36 : 56,
})

export const snapValue = (value: number) => Math.round(value / SNAP_SIZE) * SNAP_SIZE

export const snapPoint = <TPoint extends SnapPoint>(point: TPoint): SnapPoint => ({
  x: snapValue(point.x),
  y: snapValue(point.y),
})

export const snapNodePosition = (node: DiagramNode): DiagramNode => ({
  ...node,
  x: snapValue(node.x),
  y: snapValue(node.y),
})

export const snapNodeFrame = (node: DiagramNode): DiagramNode => {
  const minSize = getMinNodeSize(node)
  return {
    ...snapNodePosition(node),
    width: Math.max(minSize.width, snapValue(node.width)),
    height: Math.max(minSize.height, snapValue(node.height)),
  }
}
