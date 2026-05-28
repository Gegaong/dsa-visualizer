import type { GridStep } from './gridTypes'

export const DIRS_4 = [[-1, 0], [0, 1], [1, 0], [0, -1]] as const
export const DIRS_8 = [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1]] as const

// Returns all valid in-bounds grid neighbors of `key` (island and water alike).
export function getInBoundsNeighbors(key: string, rows: number, cols: number, connectivity: 4 | 8): string[] {
  const [r, c] = key.split(',').map(Number)
  const dirs = connectivity === 4 ? DIRS_4 : DIRS_8
  const out: string[] = []
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(`${nr},${nc}`)
  }
  return out
}

// Step count up to and including the last inner step (used for the "steps to find all" stat).
export function computeDiscoverySteps(steps: GridStep[]): number {
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].phase === 'inner') return i + 1
  }
  return 0
}
