import type { BinaryTree, BinaryTreeSide } from '../types'
import {
  TREE_UNIT_WIDTH,
  TREE_LEVEL_HEIGHT,
  TREE_TOP_PADDING,
  TREE_BOTTOM_PADDING,
  TREE_NODE_SIZE,
  TREE_MAX_DEPTH,
} from './constants'

export type BinaryTreeAddSlot = {
  // 'root' for the single indicator shown on an empty tree, otherwise `${parentId}-${side}`.
  id: string
  parentId: string | null
  side: BinaryTreeSide | null
  x: number
  y: number
}

export type BinaryTreeLayout = {
  nodePositions: Map<string, { x: number; y: number }>
  addSlots: BinaryTreeAddSlot[]
  scale: number
}

// Minimum gap, in leaf units, kept between any two adjacent items (real nodes or empty-slot
// indicators) that end up at the same depth.
const MIN_GAP = 1

type UnscaledSlot = { parentId: string; side: BinaryTreeSide; x: number; depth: number }
type Contour = Map<number, { min: number; max: number }>

type Subtree = {
  // x is relative to this subtree's own root, which always sits at exactly 0.
  nodeUnits: Map<string, { x: number; depth: number }>
  slots: UnscaledSlot[]
  // Absolute depth -> the min/max x (still relative to this subtree's root) reached at that depth.
  // Used to detect and resolve overlap when two subtrees are placed side by side.
  contour: Contour
}

function extendContour(contour: Contour, depth: number, x: number) {
  const existing = contour.get(depth)
  contour.set(depth, existing ? { min: Math.min(existing.min, x), max: Math.max(existing.max, x) } : { min: x, max: x })
}

function shiftedContour(contour: Contour, dx: number): Contour {
  const shifted: Contour = new Map()
  for (const [depth, range] of contour) shifted.set(depth, { min: range.min + dx, max: range.max + dx })
  return shifted
}

// Recursively lays out one subtree in an isolated local coordinate system (its own root at x = 0),
// so it can be positioned and merged into its parent without knowing anything about siblings.
//   - A leaf gets two empty-slot indicators at ±1 (unless it's already at TREE_MAX_DEPTH, in which
//     case it's a dead end — no indicators, since a slot there would create a node one level too deep).
//   - A node with a single child places that child exactly 1 unit to its side — a constant step
//     per level, so a one-sided chain renders as a perfectly straight diagonal instead of curving.
//   - A node with two children lays out each side independently, then shifts the right side just
//     far enough (comparing contours depth by depth) that no two items from either side ever land
//     within MIN_GAP of each other, before centering itself as their midpoint.
function buildSubtree(tree: BinaryTree, nodeId: string, depth: number): Subtree {
  const node = tree.nodesById[nodeId]
  const hasLeft = node.leftId !== null
  const hasRight = node.rightId !== null
  const canGrow = depth < TREE_MAX_DEPTH

  if (!hasLeft && !hasRight) {
    if (!canGrow) {
      return {
        nodeUnits: new Map([[nodeId, { x: 0, depth }]]),
        slots: [],
        contour: new Map([[depth, { min: 0, max: 0 }]]),
      }
    }
    const contour: Contour = new Map([
      [depth, { min: 0, max: 0 }],
      [depth + 1, { min: -1, max: 1 }],
    ])
    return {
      nodeUnits: new Map([[nodeId, { x: 0, depth }]]),
      slots: [
        { parentId: nodeId, side: 'left', x: -1, depth: depth + 1 },
        { parentId: nodeId, side: 'right', x: 1, depth: depth + 1 },
      ],
      contour,
    }
  }

  if (hasLeft !== hasRight) {
    const side: BinaryTreeSide = hasLeft ? 'left' : 'right'
    const childId = (hasLeft ? node.leftId : node.rightId)!
    const childOffset = side === 'left' ? -1 : 1
    const child = buildSubtree(tree, childId, depth + 1)

    const nodeUnits = new Map<string, { x: number; depth: number }>()
    for (const [id, u] of child.nodeUnits) nodeUnits.set(id, { x: u.x + childOffset, depth: u.depth })
    nodeUnits.set(nodeId, { x: 0, depth })

    const slots = child.slots.map((s) => ({ ...s, x: s.x + childOffset }))
    const contour = shiftedContour(child.contour, childOffset)
    extendContour(contour, depth, 0)

    if (canGrow) {
      const missingOffset = side === 'left' ? 1 : -1
      slots.push({ parentId: nodeId, side: side === 'left' ? 'right' : 'left', x: missingOffset, depth: depth + 1 })
      extendContour(contour, depth + 1, missingOffset)
    }

    return { nodeUnits, slots, contour }
  }

  const left = buildSubtree(tree, node.leftId!, depth + 1)
  const right = buildSubtree(tree, node.rightId!, depth + 1)

  let shift = 0
  for (const [d, leftRange] of left.contour) {
    const rightRange = right.contour.get(d)
    if (!rightRange) continue
    shift = Math.max(shift, leftRange.max - rightRange.min + MIN_GAP)
  }

  const rightUnits = new Map<string, { x: number; depth: number }>()
  for (const [id, u] of right.nodeUnits) rightUnits.set(id, { x: u.x + shift, depth: u.depth })
  const rightSlots = right.slots.map((s) => ({ ...s, x: s.x + shift }))
  const rightContour = shiftedContour(right.contour, shift)

  // Parent sits at the midpoint of its two (now non-overlapping) children; recenter the whole
  // merged subtree so the parent itself ends up back at the canonical local x = 0.
  const recenterBy = shift / 2

  const nodeUnits = new Map<string, { x: number; depth: number }>()
  for (const [id, u] of left.nodeUnits) nodeUnits.set(id, { x: u.x - recenterBy, depth: u.depth })
  for (const [id, u] of rightUnits) nodeUnits.set(id, { x: u.x - recenterBy, depth: u.depth })
  nodeUnits.set(nodeId, { x: 0, depth })

  const slots = [
    ...left.slots.map((s) => ({ ...s, x: s.x - recenterBy })),
    ...rightSlots.map((s) => ({ ...s, x: s.x - recenterBy })),
  ]

  const contour: Contour = new Map()
  for (const [d, r] of shiftedContour(left.contour, -recenterBy)) {
    extendContour(contour, d, r.min)
    extendContour(contour, d, r.max)
  }
  for (const [d, r] of shiftedContour(rightContour, -recenterBy)) {
    extendContour(contour, d, r.min)
    extendContour(contour, d, r.max)
  }
  extendContour(contour, depth, 0)

  return { nodeUnits, slots, contour }
}

// Computes final pixel positions for every node and empty-slot indicator. The root is always
// pinned to the exact horizontal center of the container, no matter how lopsided the tree is —
// everything else is placed relative to it. The scale (uniform, never > 1) is picked so that
// whichever side of the root needs more room — left or right — still fits within its half of the
// container; a one-sided tree therefore uses up to the full width on its heavy side while barely
// touching the other, rather than being squeezed as if it were balanced. The tree stays anchored
// to the top; as it grows, the scale shrinks to keep it fitting, freeing up room below.
export function computeBinaryTreeLayout(
  tree: BinaryTree,
  containerWidth: number,
  containerHeight: number,
): BinaryTreeLayout {
  const canMeasure = containerWidth > 0 && containerHeight > 0
  const halfWidth = containerWidth / 2

  if (!tree.rootId) {
    const contentHeight = TREE_TOP_PADDING + TREE_BOTTOM_PADDING
    const scale = canMeasure ? Math.min(1, containerHeight / contentHeight) : 1
    return {
      nodePositions: new Map(),
      addSlots: [{ id: 'root', parentId: null, side: null, x: halfWidth, y: TREE_TOP_PADDING * scale }],
      scale,
    }
  }

  const { nodeUnits, slots, contour } = buildSubtree(tree, tree.rootId, 0)

  let maxDepth = 0
  let minX = 0
  let maxX = 0
  for (const range of contour.values()) {
    minX = Math.min(minX, range.min)
    maxX = Math.max(maxX, range.max)
  }
  for (const depth of contour.keys()) maxDepth = Math.max(maxDepth, depth)

  const contentHeight = TREE_TOP_PADDING + maxDepth * TREE_LEVEL_HEIGHT + TREE_BOTTOM_PADDING
  const neededLeftUnits = -minX
  const neededRightUnits = maxX
  // Items are centered on their own coordinate (via CSS translate(-50%, -50%)), so the outermost
  // item's own half-width also needs to fit within the container — otherwise it gets sliced off by
  // the canvas edge. This padding scales down together with everything else, so it's expressed as
  // "half a node" worth of extra unit-space rather than a fixed pixel amount.
  const halfNodePadding = TREE_NODE_SIZE / 2

  const scaleCandidates = [1]
  if (canMeasure) {
    if (neededLeftUnits > 0) scaleCandidates.push(halfWidth / (neededLeftUnits * TREE_UNIT_WIDTH + halfNodePadding))
    if (neededRightUnits > 0) scaleCandidates.push(halfWidth / (neededRightUnits * TREE_UNIT_WIDTH + halfNodePadding))
    scaleCandidates.push(containerHeight / contentHeight)
  }
  const scale = Math.min(...scaleCandidates)

  const toPixelX = (xUnits: number) => halfWidth + xUnits * TREE_UNIT_WIDTH * scale
  const toPixelY = (depth: number) => (TREE_TOP_PADDING + depth * TREE_LEVEL_HEIGHT) * scale

  const nodePositions = new Map<string, { x: number; y: number }>()
  for (const [id, { x, depth }] of nodeUnits) {
    nodePositions.set(id, { x: toPixelX(x), y: toPixelY(depth) })
  }

  const addSlots: BinaryTreeAddSlot[] = slots.map((slot) => ({
    id: `${slot.parentId}-${slot.side}`,
    parentId: slot.parentId,
    side: slot.side,
    x: toPixelX(slot.x),
    y: toPixelY(slot.depth),
  }))

  return { nodePositions, addSlots, scale }
}
