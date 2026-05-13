import type { GraphNode } from '../types'

// Keep only digits and an optional leading '-'.
export const sanitizeNumericInput = (value: string) =>
  value.replace(/[^0-9-]/g, '').replace(/(?!^)-/g, '')

// Returns null for in-progress typing (empty, lone '-') or invalid input.
export const parseNumberInput = (value: string) => {
  const trimmed = value.trim()

  if (trimmed === '' || trimmed === '-') {
    return null
  }

  const numberValue = Number(trimmed)
  return Number.isNaN(numberValue) ? null : numberValue
}

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
