import type { GridStep, GridResult, InnerAlgo } from './gridTypes'
import { runInnerBFS, runInnerDFS } from './gridInnerSearch'

export type ScanCorner = 'tl' | 'tr' | 'bl' | 'br'

const DIRS_4 = [[-1, 0], [0, 1], [1, 0], [0, -1]] as const
const DIRS_8 = [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1]] as const

// Returns all valid in-bounds grid neighbors of `key` (island and water alike).
function getAllGridNeighbors(key: string, rows: number, cols: number, connectivity: 4 | 8): string[] {
  const [r, c] = key.split(',').map(Number)
  const dirs = connectivity === 4 ? DIRS_4 : DIRS_8
  const out: string[] = []
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(`${nr},${nc}`)
  }
  return out
}

// Maps a corner label to its "r,c" grid key.
function cornerToCell(corner: ScanCorner, rows: number, cols: number): string {
  if (corner === 'tl') return '0,0'
  if (corner === 'tr') return `0,${cols - 1}`
  if (corner === 'bl') return `${rows - 1},0`
  return `${rows - 1},${cols - 1}`
}

// Step count up to and including the last inner step (used for the "steps to find all" stat).
function computeDiscoverySteps(steps: GridStep[]): number {
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].phase === 'inner') return i + 1
  }
  return 0
}

// After inner search claims an island, add all grid-level neighbors of every island cell
// to the outer collection so the outer traversal can continue beyond the island boundary.
function addIslandBoundary(
  cells: string[],
  globalVisited: Set<string>,
  seen: Set<string>,
  out: string[],
  rows: number,
  cols: number,
  connectivity: 4 | 8,
): void {
  for (const cell of cells) {
    for (const nb of getAllGridNeighbors(cell, rows, cols, connectivity)) {
      if (!globalVisited.has(nb) && !seen.has(nb)) {
        out.push(nb)
        seen.add(nb)
      }
    }
  }
}

// Outer BFS island locator: explores all grid cells breadth-first from the start corner.
// Cells closer to the start corner are processed first. When the first unvisited island cell
// is dequeued, the inner algorithm flood-fills the whole island before the outer BFS continues.
export function runOuterBFS(
  islands: Set<string>,
  rows: number,
  cols: number,
  connectivity: 4 | 8,
  startCorner: ScanCorner,
  innerAlgo: InnerAlgo,
): GridResult {
  if (rows === 0 || cols === 0) return { steps: [], islandGroups: [], discoverySteps: 0 }

  const start = cornerToCell(startCorner, rows, cols)
  const globalVisited = new Set<string>()
  const enqueued = new Set<string>([start])
  const queue: string[] = [start]
  const steps: GridStep[] = []
  const islandGroups: string[][] = []
  let islandIndex = -1
  const runInner = innerAlgo === 'bfs' ? runInnerBFS : runInnerDFS

  while (queue.length > 0) {
    const key = queue.shift()!

    if (globalVisited.has(key)) {
      // Island cell flood-filled by a prior inner search — all its neighbors were already
      // added via addIslandBoundary when the island was discovered, so no propagation needed.
      steps.push({ phase: 'outer', currentCell: key, newVisited: [], frontierCells: queue.filter(k => !globalVisited.has(k)), islandIndex: -1, explanation: 'Already explored by island flood-fill — skipping.' })
      continue
    }

    globalVisited.add(key)

    if (!islands.has(key)) {
      const newNeighbors: string[] = []
      for (const nb of getAllGridNeighbors(key, rows, cols, connectivity)) {
        if (!globalVisited.has(nb) && !enqueued.has(nb)) {
          queue.push(nb)
          enqueued.add(nb)
          newNeighbors.push(nb)
        }
      }
      const n = newNeighbors.length
      const note = n === 0 ? 'No new neighbors.' : `${n} neighbor${n !== 1 ? 's' : ''} added (${queue.length} in queue).`
      steps.push({ phase: 'outer', currentCell: key, newVisited: [key], frontierCells: queue.filter(k => !globalVisited.has(k)), islandIndex: -1, explanation: `Water — BFS dequeued. ${note}` })
    } else {
      islandIndex++
      const { steps: inner, cells } = runInner(key, islandIndex, islands, globalVisited, rows, cols, connectivity)
      for (const s of inner) steps.push(s)
      islandGroups.push(cells)
      addIslandBoundary(cells, globalVisited, enqueued, queue, rows, cols, connectivity)
    }
  }

  return { steps, islandGroups, discoverySteps: computeDiscoverySteps(steps) }
}

// Outer DFS island locator: explores all grid cells depth-first from the start corner.
// Goes as far as possible in one direction before backtracking. When the first unvisited island
// cell is popped, the inner algorithm flood-fills the whole island before the outer DFS continues.
export function runOuterDFS(
  islands: Set<string>,
  rows: number,
  cols: number,
  connectivity: 4 | 8,
  startCorner: ScanCorner,
  innerAlgo: InnerAlgo,
): GridResult {
  if (rows === 0 || cols === 0) return { steps: [], islandGroups: [], discoverySteps: 0 }

  const start = cornerToCell(startCorner, rows, cols)
  const globalVisited = new Set<string>()
  const pushed = new Set<string>([start])
  const stack: string[] = [start]
  const steps: GridStep[] = []
  const islandGroups: string[][] = []
  let islandIndex = -1
  const runInner = innerAlgo === 'bfs' ? runInnerBFS : runInnerDFS

  const frontier = () => stack.filter(k => !globalVisited.has(k))

  while (stack.length > 0) {
    const key = stack.pop()!

    if (globalVisited.has(key)) {
      steps.push({ phase: 'outer', currentCell: key, newVisited: [], frontierCells: frontier(), islandIndex: -1, explanation: 'Already explored by island flood-fill — skipping.' })
      continue
    }

    globalVisited.add(key)

    if (!islands.has(key)) {
      // Push neighbors in reverse so DIRS[0] (up / top-left) is explored first.
      const neighbors = getAllGridNeighbors(key, rows, cols, connectivity)
      let n = 0
      for (let i = neighbors.length - 1; i >= 0; i--) {
        const nb = neighbors[i]
        if (!globalVisited.has(nb) && !pushed.has(nb)) {
          stack.push(nb)
          pushed.add(nb)
          n++
        }
      }
      const note = n === 0 ? 'No new neighbors.' : `${n} neighbor${n !== 1 ? 's' : ''} pushed (${stack.length} in stack).`
      steps.push({ phase: 'outer', currentCell: key, newVisited: [key], frontierCells: frontier(), islandIndex: -1, explanation: `Water — DFS popped. ${note}` })
    } else {
      islandIndex++
      const { steps: inner, cells } = runInner(key, islandIndex, islands, globalVisited, rows, cols, connectivity)
      for (const s of inner) steps.push(s)
      islandGroups.push(cells)
      // Collect boundary cells in natural order, push in reverse so first-found is on top.
      const boundary: string[] = []
      for (const cell of cells) {
        for (const nb of getAllGridNeighbors(cell, rows, cols, connectivity)) {
          if (!globalVisited.has(nb) && !pushed.has(nb)) {
            boundary.push(nb)
            pushed.add(nb)
          }
        }
      }
      for (let i = boundary.length - 1; i >= 0; i--) stack.push(boundary[i])
    }
  }

  return { steps, islandGroups, discoverySteps: computeDiscoverySteps(steps) }
}
