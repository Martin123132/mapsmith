import type { Connector } from './boardFile.js'

export type ConnectorLabelDirection = 'left' | 'right' | 'up' | 'down'

const hasLabel = (connector: Connector): boolean =>
  connector.label !== undefined && Boolean(connector.label) && connector.showLabel !== false

export const isConnectorLabelVisible = (connector: Connector): boolean => hasLabel(connector)

export const toggleConnectorLabelVisibility = (connector: Connector): Connector => {
  const nextValue = !hasLabel(connector)
  return { ...connector, showLabel: nextValue }
}

export const nudgeConnectorLabelOffset = (
  connector: Connector,
  direction: ConnectorLabelDirection,
  step: number,
): Connector => {
  if (direction === 'left') {
    return { ...connector, labelOffsetX: (connector.labelOffsetX ?? 0) - step }
  }

  if (direction === 'right') {
    return { ...connector, labelOffsetX: (connector.labelOffsetX ?? 0) + step }
  }

  if (direction === 'up') {
    return { ...connector, labelOffsetY: (connector.labelOffsetY ?? 0) - step }
  }

  return { ...connector, labelOffsetY: (connector.labelOffsetY ?? 0) + step }
}

export const resetConnectorLabelOffset = (connector: Connector): Connector => ({
  ...connector,
  labelOffsetX: 0,
  labelOffsetY: 0,
})
