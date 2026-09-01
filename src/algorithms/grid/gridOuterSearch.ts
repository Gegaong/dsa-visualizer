import type { GridStep, GridResult, InnerAlgo } from './gridTypes'
import { runInnerBFS, runInnerDFS, runInnerBFSCode, runInnerDFSCode } from './gridInnerSearch'
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

// Unified line-by-line Outer Search (BFS / DFS) island locator
export function runOuterSearchCode(
  islands: Set<string>,
  rows: number,
  cols: number,
  connectivity: 4 | 8,
  startKeys: string[],
  outerAlgo: 'bfs' | 'dfs',
  innerAlgo: InnerAlgo,
): GridResult {
  if (rows === 0 || cols === 0) return { steps: [], islandGroups: [], discoverySteps: 0, operationCount: 0, discoveryOperations: 0 }

  const isBfs = outerAlgo === 'bfs'
  const globalVisited = new Set<string>()
  const enqueued = new Set<string>(startKeys)
  const container: string[] = [...startKeys]
  const steps: GridStep[] = []
  const islandGroups: string[][] = []
  let islandIndex = -1
  const runInnerCode = innerAlgo === 'bfs' ? runInnerBFSCode : runInnerDFSCode
  let opsTotal = startKeys.length
  let discoveryOps = 0

  const firstKey = startKeys[0] ?? '0,0'
  const frontier = () => container.filter(k => !globalVisited.has(k))

  const makeStep = (
    codeLine: number,
    currentCell: string,
    logicLines: number[],
    newVisited: string[] = [],
    subPhase?: GridSubPhase,
    activeIslandIdx: number = -1,
  ): GridStep => ({
    phase: 'outer',
    subPhase,
    currentCell,
    newVisited,
    frontierCells: frontier(),
    islandIndex: activeIslandIdx,
    codeLine,
    logicLines,
  })

  // Line 0: function SCAN(grid, start/starts)
  steps.push({
    phase: 'outer',
    currentCell: firstKey,
    newVisited: [],
    frontierCells: [],
    islandIndex: -1,
    codeLine: 0,
    logicLines: [0, 1],
  })

  // Line 1: container ← start/starts; seen ← start/starts
  steps.push({
    phase: 'outer',
    currentCell: firstKey,
    newVisited: [],
    frontierCells: frontier(),
    islandIndex: -1,
    codeLine: 1,
    logicLines: [0, 1],
  })

  while (container.length > 0) {
    const nextPeek = isBfs ? container[0] : container[container.length - 1]
    // Line 2: while container ≠ empty
    steps.push(makeStep(2, nextPeek, [0, 1, 3]))

    // Line 3: cell ← container.dequeue() / pop()
    const key = isBfs ? container.shift()! : container.pop()!
    opsTotal++
    steps.push(makeStep(3, key, [0, 1, 3]))

    if (globalVisited.has(key)) {
      // Line 4: if cell ∈ visited → skip
      steps.push(makeStep(4, key, [0, 1, 3, 4, 5], [], isBfs ? 'bfs-outer-skip' : 'dfs-outer-skip'))
      continue
    }

    // Line 4 checked and false
    steps.push(makeStep(4, key, [0, 1, 3]))

    // Line 5: visited.add(cell)
    globalVisited.add(key)
    steps.push(makeStep(5, key, [0, 1, 3], [key]))

    if (!islands.has(key)) {
      // Line 6: if grid[cell] = water → enqueue / push nbs
      const neighbors = getInBoundsNeighbors(key, rows, cols, connectivity)
      opsTotal += neighbors.length
      const nbsToAdd = isBfs ? neighbors : [...neighbors].reverse()
      for (const nb of nbsToAdd) {
        if (!globalVisited.has(nb) && !enqueued.has(nb)) {
          container.push(nb)
          enqueued.add(nb)
          opsTotal++
        }
      }
      steps.push(makeStep(6, key, [0, 1, 3, 6, 7], [], isBfs ? 'bfs-outer-water' : 'dfs-outer-water'))
    } else {
      // Line 7: else → island ← FILL(cell, grid, visited)
      steps.push(makeStep(7, key, [9, 10, 11, 12, 13, 14, 15], [], undefined, islandIndex + 1))

      islandIndex++
      const { steps: inner, cells, waterBorders, operationCount: innerOps } = runInnerCode(key, islandIndex, islands, globalVisited, rows, cols, connectivity, 'outer')
      opsTotal += innerOps
      for (const s of inner) steps.push(s)
      islandGroups.push(cells)
      discoveryOps = opsTotal

      const boundary: string[] = []
      for (const nb of waterBorders) {
        if (!globalVisited.has(nb) && !enqueued.has(nb)) {
          boundary.push(nb)
          enqueued.add(nb)
        }
      }
      const boundaryToAdd = isBfs ? boundary : [...boundary].reverse()
      for (const nb of boundaryToAdd) {
        container.push(nb)
        opsTotal++
      }
    }
  }

  // Line 8: return islands
  steps.push({
    phase: 'outer',
    currentCell: firstKey,
    newVisited: [],
    frontierCells: [],
    islandIndex: -1,
    codeLine: 8,
    logicLines: [17, 18],
  })

  return { steps, islandGroups, discoverySteps: computeDiscoverySteps(steps), operationCount: opsTotal, discoveryOperations: discoveryOps }
}

export function runOuterBFSCode(
  islands: Set<string>,
  rows: number,
  cols: number,
  connectivity: 4 | 8,
  startKeys: string[],
  innerAlgo: InnerAlgo,
): GridResult {
  return runOuterSearchCode(islands, rows, cols, connectivity, startKeys, 'bfs', innerAlgo)
}

export function runOuterDFSCode(
  islands: Set<string>,
  rows: number,
  cols: number,
  connectivity: 4 | 8,
  startKey: string,
  innerAlgo: InnerAlgo,
): GridResult {
  return runOuterSearchCode(islands, rows, cols, connectivity, [startKey], 'dfs', innerAlgo)
}

