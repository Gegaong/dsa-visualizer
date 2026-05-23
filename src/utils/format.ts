import type { GraphNode } from '../types'

// Keep only digits and an optional leading '-'.
export const sanitizeNumericInput = (value: string) =>
  value.replace(/[^0-9-]/g, '').replace(/(?!^)-/g, '')

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

// Parses a decimal edge weight; strips trailing '.' so "3." commits as 3.
export const parseEdgeWeightInput = (value: string): number | null => {
  const trimmed = value.trim().replace(/\.$/, '')
  if (trimmed === '' || trimmed === '.') return null
  const num = Number(trimmed)
  return Number.isNaN(num) ? null : num
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

// Convert array index (0, 1, 2, ...) to Alphabetical style column labels (A, B, C, ..., Z, AA, AB, ...)
const indexToLabel = (index: number) => {
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
