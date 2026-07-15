import type { BinaryTree, GraphNode } from '../types'
import { NODE_SIZE } from './constants'

// Keep only digits and an optional leading '-'.
export const sanitizeNumericInput = (value: string) =>
  value.replace(/[^0-9-]/g, '').replace(/(?!^)-/g, '')

// Keep only A–Z letters (canvas node labels are spreadsheet-style: A, B, …, Z, AA, …).
export const sanitizeNodeLabelInput = (value: string) =>
  value.toUpperCase().replace(/[^A-Z]/g, '')

// Keep only digits and at most one decimal point (no sign — edge weights are positive).
export const sanitizeDecimalInput = (value: string): string => {
  const clean = value.replace(/[^0-9.]/g, '')
  const dot = clean.indexOf('.')
  if (dot === -1) return clean
  return clean.slice(0, dot + 1) + clean.slice(dot + 1).replace(/\./g, '')
}

// Returns null for in-progress typing (empty, lone '-') or invalid input.
export const parseNumberInput = (value: string) => {
  const trimmed = value.trim()

  if (trimmed === '' || trimmed === '-') {
    return null
  }

  const numberValue = Number(trimmed)
  return Number.isNaN(numberValue) ? null : numberValue
}

// Parses a decimal edge weight; must be positive. Strips trailing '.' so "3." commits as 3.
export const parseEdgeWeightInput = (value: string): number | null => {
  const trimmed = value.trim().replace(/\.$/, '')
  if (trimmed === '' || trimmed === '.') return null
  const num = Number(trimmed)
  if (Number.isNaN(num) || num <= 0) return null
  return num
}

// Formats a cost value for display: rounds to 4 decimal places to clean float noise,
// then removes trailing zeros so 7.0 → "7", 3.5 → "3.5", 3.1400 → "3.14".
export const formatCost = (cost: number): string =>
  parseFloat(cost.toFixed(2)).toString()

// Inclusive integer RNG used when filling empty node values.
export const getRandomIntInclusive = (min: number, max: number) => {
  const low = Math.ceil(min)
  const high = Math.floor(max)
  return Math.floor(Math.random() * (high - low + 1)) + low
}

const NODE_INPUT_FONT_SIZE_PX = 13

// Reference font sizes (px) on a 48px node. Five digits keep the prior small-tier size; fewer
// digits scale up so shorter values fill more of the circle interior.
const NODE_VALUE_FONT_BY_CHAR_COUNT: Record<number, number> = {
  1: 18,
  2: 16,
  3: 14,
  4: 13,
  5: 12,
}
const NODE_VALUE_ELLIPSIS_FONT_PX = 11

// Scale node-value font to the rendered node diameter. Shorter displayed text uses a larger font
// so single digits fill the circle more; five digits stay at the previous fit size.
export const getNodeValueFontSizePx = (
  nodeDiameterPx: number,
  displayText: string,
): number => {
  if (!displayText) return nodeDiameterPx * (14 / NODE_SIZE)
  if (displayText === '...') {
    return nodeDiameterPx * (NODE_VALUE_ELLIPSIS_FONT_PX / NODE_SIZE)
  }

  const charCount = Math.min(5, displayText.length)
  const fontPx = NODE_VALUE_FONT_BY_CHAR_COUNT[charCount] ?? NODE_VALUE_FONT_BY_CHAR_COUNT[5]
  return nodeDiameterPx * (fontPx / NODE_SIZE)
}

export const getNodeInputFontSizePx = (nodeDiameterPx: number): number =>
  nodeDiameterPx * (NODE_INPUT_FONT_SIZE_PX / NODE_SIZE)

// Picks display text for a numeric node value: full digits up to 5 chars, then "...".
// Font size is chosen separately via getNodeValueFontSizePx from the displayed character count.
export const formatNodeValueDisplay = (value: number | 'empty'): string => {
  if (value === 'empty') return ''

  const text = String(value)
  if (text.length <= 5) return text

  return '...'
}

// Convert array index (0, 1, 2, ...) to Alphabetical style column labels (A, B, C, ..., Z, AA, AB, ...)
export const indexToLabel = (index: number) => {
  let label = ''
  let remaining = index + 1

  while (remaining > 0) {
    const remainder = (remaining - 1) % 26
    label = String.fromCharCode(65 + remainder) + label
    remaining = Math.floor((remaining - 1) / 26)
  }

  return label
}

// Recalculate labels for all nodes based on their position in the array.
// Used after deletion to maintain consistent A, B, C... labeling.
export const reindexNodes = (list: GraphNode[]) =>
  list.map((node, index) => ({
    ...node,
    label: indexToLabel(index),
  }))

// Same idea as reindexNodes, for the binary tree canvas: relabel every node from its position
// in insertion order (object key order) so labels stay contiguous (A, B, C, ...) after add/delete.
export const relabelBinaryTree = (tree: BinaryTree): BinaryTree => {
  const ids = Object.keys(tree.nodesById)
  const nodesById: BinaryTree['nodesById'] = {}

  ids.forEach((id, index) => {
    nodesById[id] = { ...tree.nodesById[id], label: indexToLabel(index) }
  })

  return { rootId: tree.rootId, nodesById }
}
