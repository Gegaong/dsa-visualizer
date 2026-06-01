import type { GridStep, GridResult, InnerAlgo } from './gridTypes'
import { runInnerBFS, runInnerDFS } from './gridInnerSearch'
import { getInBoundsNeighbors, computeDiscoverySteps } from './gridShared'

// After inner search claims an island, add all grid-level neighbors of every island cell
// to the outer collection so the outer traversal can continue beyond the island boundary.
// Returns the number of neighbor checks performed.
function addIslandBoundary(
  cells: string[],
  globalVisited: Set<string>,
  seen: Set<string>,
  out: string[],
  rows: number,
  cols: number,
  connectivity: 4 | 8,
): number {
  let ops = 0
  for (const cell of cells) {
    for (const nb of getInBoundsNeighbors(cell, rows, cols, connectivity)) {
      ops++  // neighbor check
      if (!globalVisited.has(nb) && !seen.has(nb)) {
        out.push(nb)
        seen.add(nb)
        ops++  // frontier push
      }
    }
  }
  return ops
}

// Outer BFS island locator: explores all grid cells breadth-first from one or more start cells.
// Supports multi-source BFS — all startKeys are seeded into the initial queue simultaneously.
// When the first unvisited island cell is dequeued, the inner algorithm flood-fills the whole
// island before the outer BFS continues.
export function runOuterBFS(
  islands: Set<string>,
  rows: number,
  cols: number,
  connectivity: 4 | 8,
  startKeys: string[],
  innerAlgo: InnerAlgo,
): GridResult {
  if (rows === 0 || cols === 0) return { steps: [], islandGroups: [], discoverySteps: 0, operationCount: 0, discoveryOperations: 0 }

  const globalVisited = new Set<string>()
  const enqueued = new Set<string>(startKeys)
  const queue: string[] = [...startKeys]
  const steps: GridStep[] = []
  const islandGroups: string[][] = []
  let islandIndex = -1
  const runInner = innerAlgo === 'bfs' ? runInnerBFS : runInnerDFS
  let opsTotal = startKeys.length  // initial pushes of all start cells
  let discoveryOps = 0

  while (queue.length > 0) {
    const key = queue.shift()!
    opsTotal++  // cell dequeue (V term) — counts all dequeues including already-visited

    if (globalVisited.has(key)) {
      // Island cell flood-filled by a prior inner search — all its neighbors were already
      // added via addIslandBoundary when the island was discovered, so no propagation needed.
      steps.push({ phase: 'outer', currentCell: key, newVisited: [], frontierCells: queue.filter(k => !globalVisited.has(k)), islandIndex: -1, explanation: 'Already explored by island flood-fill — skipping.' })
      continue
    }

    globalVisited.add(key)

    if (!islands.has(key)) {
      const nbs = getInBoundsNeighbors(key, rows, cols, connectivity)
      opsTotal += nbs.length  // edge examinations (E term)
      const newNeighbors: string[] = []
      for (const nb of nbs) {
        if (!globalVisited.has(nb) && !enqueued.has(nb)) {
          queue.push(nb)
          enqueued.add(nb)
          newNeighbors.push(nb)
          opsTotal++  // frontier push
        }
      }
      const n = newNeighbors.length
      const note = n === 0 ? 'No new neighbors.' : `${n} neighbor${n !== 1 ? 's' : ''} added (${queue.length} in queue).`
      steps.push({ phase: 'outer', currentCell: key, newVisited: [key], frontierCells: queue.filter(k => !globalVisited.has(k)), islandIndex: -1, explanation: `Water — BFS dequeued. ${note}` })
    } else {
      islandIndex++
      const { steps: inner, cells, operationCount: innerOps } = runInner(key, islandIndex, islands, globalVisited, rows, cols, connectivity)
      opsTotal += innerOps
      for (const s of inner) steps.push(s)
      islandGroups.push(cells)
      opsTotal += addIslandBoundary(cells, globalVisited, enqueued, queue, rows, cols, connectivity)
      discoveryOps = opsTotal
    }
  }

  return { steps, islandGroups, discoverySteps: computeDiscoverySteps(steps), operationCount: opsTotal, discoveryOperations: discoveryOps }
}

// Outer DFS island locator: explores all grid cells depth-first from a single start cell.
// Goes as far as possible in one direction before backtracking. When the first unvisited island
// cell is popped, the inner algorithm flood-fills the whole island before the outer DFS continues.
export function runOuterDFS(
  islands: Set<string>,
  rows: number,
  cols: number,
  connectivity: 4 | 8,
  startKey: string,
  innerAlgo: InnerAlgo,
): GridResult {
  if (rows === 0 || cols === 0) return { steps: [], islandGroups: [], discoverySteps: 0, operationCount: 0, discoveryOperations: 0 }

  const globalVisited = new Set<string>()
  const pushed = new Set<string>([startKey])
  const stack: string[] = [startKey]
  const steps: GridStep[] = []
  const islandGroups: string[][] = []
  let islandIndex = -1
  const runInner = innerAlgo === 'bfs' ? runInnerBFS : runInnerDFS
  let opsTotal = 1  // initial push of startKey into the stack
  let discoveryOps = 0

  const frontier = () => stack.filter(k => !globalVisited.has(k))

  while (stack.length > 0) {
    const key = stack.pop()!
    opsTotal++  // cell pop (V term) — counts all pops including already-visited

    if (globalVisited.has(key)) {
      steps.push({ phase: 'outer', currentCell: key, newVisited: [], frontierCells: frontier(), islandIndex: -1, explanation: 'Already explored by island flood-fill — skipping.' })
      continue
    }

    globalVisited.add(key)

    if (!islands.has(key)) {
      // Push neighbors in reverse so DIRS[0] (up / top-left) is explored first.
      const neighbors = getInBoundsNeighbors(key, rows, cols, connectivity)
      opsTotal += neighbors.length  // edge examinations (E term)
      let n = 0
      for (let i = neighbors.length - 1; i >= 0; i--) {
        const nb = neighbors[i]
        if (!globalVisited.has(nb) && !pushed.has(nb)) {
          stack.push(nb)
          pushed.add(nb)
          n++
          opsTotal++  // frontier push
        }
      }
      const note = n === 0 ? 'No new neighbors.' : `${n} neighbor${n !== 1 ? 's' : ''} pushed (${stack.length} in stack).`
      steps.push({ phase: 'outer', currentCell: key, newVisited: [key], frontierCells: frontier(), islandIndex: -1, explanation: `Water — DFS popped. ${note}` })
    } else {
      islandIndex++
      const { steps: inner, cells, operationCount: innerOps } = runInner(key, islandIndex, islands, globalVisited, rows, cols, connectivity)
      opsTotal += innerOps
      for (const s of inner) steps.push(s)
      islandGroups.push(cells)
      // Collect boundary cells in natural order, push in reverse so first-found is on top.
      const boundary: string[] = []
      for (const cell of cells) {
        for (const nb of getInBoundsNeighbors(cell, rows, cols, connectivity)) {
          opsTotal++
          if (!globalVisited.has(nb) && !pushed.has(nb)) {
            boundary.push(nb)
            pushed.add(nb)
          }
        }
      }
      for (let i = boundary.length - 1; i >= 0; i--) {
        stack.push(boundary[i])
        opsTotal++  // frontier push
      }
      discoveryOps = opsTotal
    }
  }

  return { steps, islandGroups, discoverySteps: computeDiscoverySteps(steps), operationCount: opsTotal, discoveryOperations: discoveryOps }
}
