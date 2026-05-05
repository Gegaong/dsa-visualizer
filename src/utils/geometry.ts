import type { GraphNode } from '../types'
import {
  NODE_SIZE,
  NODE_RADIUS,
  NODE_GAP,
  MIN_EDGE_STUB,
  MIN_EDGE_VISUAL_LENGTH,
} from './constants'

export const toDegrees = (radians: number) => (radians * 180) / Math.PI

export const clampToRange = (value: number, min: number, max: number) =>
  Math.min(Math.max(min, value), max)

// Check if a new node at (x, y) overlaps with any existing nodes using distance-based collision detection.
export const isOverlapping = (x: number, y: number, list: GraphNode[]) => {
  const newCenterX = x + NODE_RADIUS
  const newCenterY = y + NODE_RADIUS
  const minDistance = NODE_SIZE + NODE_GAP // Minimum distance between centers (both radii + gap)

  return list.some((node) => {
    const existingCenterX = node.x + NODE_RADIUS
    const existingCenterY = node.y + NODE_RADIUS
    const dx = existingCenterX - newCenterX
    const dy = existingCenterY - newCenterY

    // Use squared distance to avoid sqrt() overhead
    return dx * dx + dy * dy < minDistance * minDistance
  })
}

// Push a dropped node away from neighbors to preserve the same minimum spacing.
export const resolveDragPosition = (
  x: number,
  y: number,
  nodeId: string,
  list: GraphNode[],
  canvasWidth: number,
  canvasHeight: number,
) => {
  const minDistance = NODE_SIZE + NODE_GAP
  const maxX = canvasWidth - NODE_SIZE
  const maxY = canvasHeight - NODE_SIZE
  let resolvedX = clampToRange(x, 0, maxX)
  let resolvedY = clampToRange(y, 0, maxY)

  for (let pass = 0; pass < 4; pass += 1) {
    let adjusted = false

    for (const other of list) {
      if (other.id === nodeId) continue

      const centerX = resolvedX + NODE_RADIUS
      const centerY = resolvedY + NODE_RADIUS
      const otherCenterX = other.x + NODE_RADIUS
      const otherCenterY = other.y + NODE_RADIUS
      const dx = centerX - otherCenterX
      const dy = centerY - otherCenterY
      const distance = Math.hypot(dx, dy)

      if (distance < minDistance) {
        const push = minDistance - distance
        const dirX = distance === 0 ? 1 : dx / distance
        const dirY = distance === 0 ? 0 : dy / distance
        resolvedX = clampToRange(resolvedX + dirX * push, 0, maxX)
        resolvedY = clampToRange(resolvedY + dirY * push, 0, maxY)
        adjusted = true
      }
    }

    if (!adjusted) {
      break
    }
  }

  return { x: resolvedX, y: resolvedY }
}

export const getEdgeGeometry = (fromNode: GraphNode, toNode: GraphNode) => {
  const x1 = fromNode.x + NODE_RADIUS
  const y1 = fromNode.y + NODE_RADIUS
  const x2 = toNode.x + NODE_RADIUS
  const y2 = toNode.y + NODE_RADIUS

  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.hypot(dx, dy)

  if (dist < 0.001) {
    return null
  }

  const unitX = dx / dist
  const unitY = dy / dist
  // Keep a minimum visible edge length so arrowheads don't crowd on short edges.
  const minVisibleLength = Math.max(MIN_EDGE_STUB, MIN_EDGE_VISUAL_LENGTH)
  const inset = Math.min(
    NODE_RADIUS,
    Math.max(0, (dist - minVisibleLength) / 2),
  )

  const startX = x1 + unitX * inset
  const startY = y1 + unitY * inset
  const endX = x2 - unitX * inset
  const endY = y2 - unitY * inset
  const edgeLength = dist - 2 * inset

  return {
    x1,
    y1,
    x2,
    y2,
    startX,
    startY,
    endX,
    endY,
    edgeLength,
  }
}
