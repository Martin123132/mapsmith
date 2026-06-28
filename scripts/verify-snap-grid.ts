import type { DiagramNode } from '../src/boardFile.js'
import {
  SNAP_SIZE,
  getMinNodeSize,
  snapNodeFrame,
  snapNodePosition,
  snapPoint,
  snapValue,
} from '../src/snapGrid.js'

const failures: string[] = []

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    failures.push(message)
  }
}

const sampleNode: DiagramNode = {
  id: 'snap-demo-node',
  kind: 'rectangle',
  x: -407,
  y: -107,
  width: 137,
  height: 73,
  fill: '#ffffff',
  stroke: '#111827',
  text: 'Snap demo',
  fontSize: 18,
}

const snappedPosition = snapNodePosition(sampleNode)
const snappedFrame = snapNodeFrame(sampleNode)
const textNode: DiagramNode = {
  ...sampleNode,
  id: 'snap-demo-text',
  kind: 'text',
  width: 111,
  height: 21,
}
const snappedTextFrame = snapNodeFrame(textNode)
const textMinSize = getMinNodeSize(textNode)

assert(SNAP_SIZE === 20, 'snap grid size must stay at 20px')
assert(snapValue(-407) === -400, 'negative x coordinates snap to the nearest grid line')
assert(snapValue(-107) === -100, 'negative y coordinates snap to the nearest grid line')
assert(snapValue(137) === 140, 'positive dimensions snap to the nearest grid line')
assert(snapPoint({ x: 33, y: 49 }).x === 40, 'snapPoint snaps x')
assert(snapPoint({ x: 33, y: 49 }).y === 40, 'snapPoint snaps y')
assert(snappedPosition.x === -400, 'snapNodePosition snaps x')
assert(snappedPosition.y === -100, 'snapNodePosition snaps y')
assert(snappedPosition.width === sampleNode.width, 'snapNodePosition leaves width unchanged')
assert(snappedPosition.height === sampleNode.height, 'snapNodePosition leaves height unchanged')
assert(snappedFrame.x === -400, 'snapNodeFrame snaps x')
assert(snappedFrame.y === -100, 'snapNodeFrame snaps y')
assert(snappedFrame.width === 140, 'snapNodeFrame snaps width')
assert(snappedFrame.height === 80, 'snapNodeFrame snaps height')
assert(snappedTextFrame.width === textMinSize.width, 'text frame respects minimum width')
assert(snappedTextFrame.height === textMinSize.height, 'text frame respects minimum height')
assert(sampleNode.x === -407 && sampleNode.y === -107, 'snap helpers must not mutate input nodes')

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log('Snap grid proof passed')
