export type ConnectorPortName = 'north' | 'east' | 'south' | 'west'

export type ConnectorPoint = {
  x: number
  y: number
}

const defaultLead = 32

const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '0'
  }

  return Number.parseFloat(value.toFixed(3)).toString()
}

const offsetPoint = (
  point: ConnectorPoint,
  port: ConnectorPortName,
  distance: number,
): ConnectorPoint => {
  if (port === 'north') {
    return { x: point.x, y: point.y - distance }
  }

  if (port === 'east') {
    return { x: point.x + distance, y: point.y }
  }

  if (port === 'south') {
    return { x: point.x, y: point.y + distance }
  }

  return { x: point.x - distance, y: point.y }
}

const isHorizontalPort = (port: ConnectorPortName) => port === 'east' || port === 'west'

const removeDuplicatePoints = (points: ConnectorPoint[]) =>
  points.filter((point, index) => {
    const previous = points[index - 1]
    return !previous || previous.x !== point.x || previous.y !== point.y
  })

export const getConnectorRoutePoints = (
  start: ConnectorPoint,
  end: ConnectorPoint,
  fromPort?: ConnectorPortName,
  toPort?: ConnectorPortName,
  lead = defaultLead,
): ConnectorPoint[] => {
  if (!fromPort || !toPort) {
    return [start, end]
  }

  const startLead = offsetPoint(start, fromPort, lead)
  const endLead = offsetPoint(end, toPort, lead)

  if (isHorizontalPort(fromPort)) {
    const midX = (startLead.x + endLead.x) / 2
    return removeDuplicatePoints([
      start,
      startLead,
      { x: midX, y: startLead.y },
      { x: midX, y: endLead.y },
      endLead,
      end,
    ])
  }

  const midY = (startLead.y + endLead.y) / 2
  return removeDuplicatePoints([
    start,
    startLead,
    { x: startLead.x, y: midY },
    { x: endLead.x, y: midY },
    endLead,
    end,
  ])
}

export const createConnectorPath = (
  start: ConnectorPoint,
  end: ConnectorPoint,
  fromPort?: ConnectorPortName,
  toPort?: ConnectorPortName,
): string => {
  const points = getConnectorRoutePoints(start, end, fromPort, toPort)
  const [firstPoint, ...remainingPoints] = points

  return [
    `M ${formatNumber(firstPoint.x)} ${formatNumber(firstPoint.y)}`,
    ...remainingPoints.map((point) => `L ${formatNumber(point.x)} ${formatNumber(point.y)}`),
  ].join(' ')
}

export const getConnectorLabelPoint = (
  start: ConnectorPoint,
  end: ConnectorPoint,
  fromPort?: ConnectorPortName,
  toPort?: ConnectorPortName,
): ConnectorPoint => {
  const points = getConnectorRoutePoints(start, end, fromPort, toPort)
  const segments = points.slice(1).map((point, index) => {
    const previous = points[index]
    return {
      end: point,
      length: Math.hypot(point.x - previous.x, point.y - previous.y),
      start: previous,
    }
  })
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0)
  let remaining = totalLength / 2

  for (const segment of segments) {
    if (remaining <= segment.length) {
      const progress = segment.length === 0 ? 0 : remaining / segment.length
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * progress,
        y: segment.start.y + (segment.end.y - segment.start.y) * progress,
      }
    }

    remaining -= segment.length
  }

  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
}
