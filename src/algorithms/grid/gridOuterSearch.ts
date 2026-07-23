import type { GridStep, GridResult, InnerAlgo } from './gridTypes'
import { runInnerBFS, runInnerDFS } from './gridInnerSearch'
import { getInBoundsNeighbors, computeDiscoverySteps } from './gridShared'

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
      // Island cell flood-filled by a prior inner search — its water borders were already
      // enqueued while that island was filled, so no propagation needed.
      steps.push({ phase: 'outer', subPhase: 'bfs-outer-skip', currentCell: key, newVisited: [], frontierCells: queue.filter(k => !globalVisited.has(k)), islandIndex: -1 })
      continue
    }

    globalVisited.add(key)

    if (!islands.has(key)) {
      const nbs = getInBoundsNeighbors(key, rows, cols, connectivity)
      opsTotal += nbs.length  // edge examinations (E term)
      for (const nb of nbs) {
        if (!globalVisited.has(nb) && !enqueued.has(nb)) {
          queue.push(nb)
          enqueued.add(nb)
          opsTotal++  // frontier push
        }
      }
      steps.push({ phase: 'outer', subPhase: 'bfs-outer-water', currentCell: key, newVisited: [key], frontierCells: queue.filter(k => !globalVisited.has(k)), islandIndex: -1 })
    } else {
      islandIndex++
      const { steps: inner, cells, waterBorders, operationCount: innerOps } = runInner(key, islandIndex, islands, globalVisited, rows, cols, connectivity)
      opsTotal += innerOps
      for (const s of inner) steps.push(s)
      islandGroups.push(cells)
      discoveryOps = opsTotal
      // Extend the outer frontier with the island's water borders, already read (and counted)
      // during the fill — so each edge is examined once, not re-scanned here.
      for (const nb of waterBorders) {
        if (!globalVisited.has(nb) && !enqueued.has(nb)) {
          queue.push(nb)
          enqueued.add(nb)
          opsTotal++  // frontier push
        }
      }
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
      steps.push({ phase: 'outer', subPhase: 'dfs-outer-skip', currentCell: key, newVisited: [], frontierCells: frontier(), islandIndex: -1 })
      continue
    }

    globalVisited.add(key)

    if (!islands.has(key)) {
      // Push neighbors in reverse so DIRS[0] (up / top-left) is explored first.
      const neighbors = getInBoundsNeighbors(key, rows, cols, connectivity)
      opsTotal += neighbors.length  // edge examinations (E term)
      for (let i = neighbors.length - 1; i >= 0; i--) {
        const nb = neighbors[i]
        if (!globalVisited.has(nb) && !pushed.has(nb)) {
          stack.push(nb)
          pushed.add(nb)
          opsTotal++  // frontier push
        }
      }
      steps.push({ phase: 'outer', subPhase: 'dfs-outer-water', currentCell: key, newVisited: [key], frontierCells: frontier(), islandIndex: -1 })
    } else {
      islandIndex++
      const { steps: inner, cells, waterBorders, operationCount: innerOps } = runInner(key, islandIndex, islands, globalVisited, rows, cols, connectivity)
      opsTotal += innerOps
      for (const s of inner) steps.push(s)
      islandGroups.push(cells)
      discoveryOps = opsTotal
      // Extend the outer frontier with the island's water borders, already read (and counted)
      // during the fill. Dedup in natural order, then push in reverse so first-found is on top.
      const boundary: string[] = []
      for (const nb of waterBorders) {
        if (!globalVisited.has(nb) && !pushed.has(nb)) {
          boundary.push(nb)
          pushed.add(nb)
        }
      }
      for (let i = boundary.length - 1; i >= 0; i--) {
        stack.push(boundary[i])
        opsTotal++  // frontier push
      }
    }
  }

  return { steps, islandGroups, discoverySteps: computeDiscoverySteps(steps), operationCount: opsTotal, discoveryOperations: discoveryOps }
}
