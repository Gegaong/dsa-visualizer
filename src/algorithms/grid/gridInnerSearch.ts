import type { GridStep } from './gridTypes'
import { getInBoundsNeighbors } from './gridShared'

// BFS flood-fill from startKey: collects all cells of one island level by level, emitting one step per dequeue.
export function runInnerBFS(
  startKey: string,
  islandIndex: number,
  islands: Set<string>,
  visited: Set<string>,
  rows: number,
  cols: number,
  connectivity: 4 | 8,
): { steps: GridStep[]; cells: string[]; waterBorders: string[]; operationCount: number } {
  const queue = [startKey]
  const cells: string[] = []
  const steps: GridStep[] = []
  // Water neighbors seen while filling, handed back so the outer search can extend its frontier
  // without re-reading the island's edges — keeps the op count at one read per edge.
  const waterBorders: string[] = []
  let first = true
  let operationCount = 1  // initial push of startKey into the queue

  while (queue.length > 0) {
    const current = queue.shift()!
    operationCount++  // cell dequeue (V term)
    cells.push(current)
    const newVisited: string[] = first ? [current] : []

    const allNbs = getInBoundsNeighbors(current, rows, cols, connectivity)
    operationCount += allNbs.length  // every neighbor read once (E term)
    for (const nb of allNbs) {
      if (!islands.has(nb)) {
        waterBorders.push(nb)
        continue
      }
      if (!visited.has(nb)) {
        visited.add(nb)
        queue.push(nb)
        operationCount++  // frontier push
        newVisited.push(nb)
      }
    }

    steps.push({ phase: 'inner', subPhase: first ? 'inner-start' : 'inner-process', currentCell: current, newVisited, frontierCells: [...queue], islandIndex })
    first = false
  }

  return { steps, cells, waterBorders, operationCount }
}

// DFS flood-fill from startKey: collects all cells of one island depth-first, emitting one step per pop.
export function runInnerDFS(
  startKey: string,
  islandIndex: number,
  islands: Set<string>,
  visited: Set<string>,
  rows: number,
  cols: number,
  connectivity: 4 | 8,
): { steps: GridStep[]; cells: string[]; waterBorders: string[]; operationCount: number } {
  const stack = [startKey]
  const cells: string[] = []
  const steps: GridStep[] = []
  // Water neighbors seen while filling, handed back so the outer search can extend its frontier
  // without re-reading the island's edges — keeps the op count at one read per edge.
  const waterBorders: string[] = []
  let first = true
  let operationCount = 1  // initial push of startKey into the stack

  while (stack.length > 0) {
    const current = stack.pop()!
    operationCount++  // cell pop (V term)
    cells.push(current)
    const newVisited: string[] = first ? [current] : []

    const allNbs = getInBoundsNeighbors(current, rows, cols, connectivity)
    operationCount += allNbs.length  // every neighbor read once (E term)
    const nbs: string[] = []
    for (const nb of allNbs) {
      if (islands.has(nb)) nbs.push(nb)
      else waterBorders.push(nb)
    }
    // Push island neighbors in reverse so DIRS[0] (up / top-left) is popped first — consistent with outer DFS.
    for (let i = nbs.length - 1; i >= 0; i--) {
      const nb = nbs[i]
      if (!visited.has(nb)) {
        visited.add(nb)
        stack.push(nb)
        operationCount++  // frontier push
        newVisited.push(nb)
      }
    }

    steps.push({ phase: 'inner', subPhase: first ? 'inner-start' : 'inner-process', currentCell: current, newVisited, frontierCells: [...stack], islandIndex })
    first = false
  }

  return { steps, cells, waterBorders, operationCount }
}

// Unified line-by-line inner flood-fill generator for both BFS and DFS
export function runInnerFillCode(
  startKey: string,
  islandIndex: number,
  islands: Set<string>,
  visited: Set<string>,
  rows: number,
  cols: number,
  connectivity: 4 | 8,
  innerAlgo: 'bfs' | 'dfs',
  outerStyle: 'for' | 'outer',
): { steps: GridStep[]; cells: string[]; waterBorders: string[]; operationCount: number } {
  const steps: GridStep[] = []
  const cells: string[] = []
  const waterBorders: string[] = []
  const container: string[] = []
  let operationCount = 0

  const isBfs = innerAlgo === 'bfs'
  const logicLines = outerStyle === 'for' ? [7, 8, 9, 10, 11, 12, 13] : [9, 10, 11, 12, 13, 14, 15]
  const baseOffset = outerStyle === 'for' ? 0 : -2

  const makeStep = (
    codeLine: number,
    currentCell: string,
    newVisited: string[] = [],
    subPhase: 'inner-start' | 'inner-process' = 'inner-process',
  ): GridStep => ({
    phase: 'inner',
    subPhase,
    currentCell,
    newVisited,
    frontierCells: [...container],
    islandIndex,
    codeLine,
    logicLines,
  })

  // Line 10: function BFS_FILL / DFS_FILL(start, grid, visited)
  steps.push(makeStep(10, startKey, [], 'inner-start'))

  if (outerStyle === 'for') {
    // Line 11: island ← []
    steps.push(makeStep(11, startKey, [], 'inner-start'))

    // Line 12: queue / stack ← [start]
    container.push(startKey)
    operationCount++
    steps.push(makeStep(12, startKey, [], 'inner-start'))

    // Line 13: visited.add(start)
    visited.add(startKey)
    steps.push(makeStep(13, startKey, [startKey], 'inner-start'))
  } else {
    // Line 11: queue / stack ← [start]; visited.add(start)
    container.push(startKey)
    visited.add(startKey)
    operationCount++
    steps.push(makeStep(11, startKey, [startKey], 'inner-start'))
  }

  while (container.length > 0) {
    const nextPeek = isBfs ? container[0] : container[container.length - 1]
    // Line 14 / 12: while queue / stack ≠ empty
    steps.push(makeStep(14 + baseOffset, nextPeek))

    // Line 15 / 13: cell ← queue.dequeue() / stack.pop()
    const current = isBfs ? container.shift()! : container.pop()!
    operationCount++
    steps.push(makeStep(15 + baseOffset, current))

    // Line 16 / 14: island.add(cell)
    cells.push(current)
    steps.push(makeStep(16 + baseOffset, current))

    const allNbs = getInBoundsNeighbors(current, rows, cols, connectivity)
    operationCount += allNbs.length

    // Line 17 / 15: for each nb of cell in grid
    steps.push(makeStep(17 + baseOffset, current))

    const candidateNbs = isBfs ? allNbs : [...allNbs].reverse()
    for (const nb of candidateNbs) {
      const isLand = islands.has(nb)
      if (!isLand) waterBorders.push(nb)

      const isUnvisitedLand = isLand && !visited.has(nb)
      // Line 18 / 16: if nb is land ∧ nb ∉ visited
      steps.push(makeStep(18 + baseOffset, current))

      if (isUnvisitedLand) {
        // Line 19 / 17: visited.add(nb)
        visited.add(nb)
        steps.push(makeStep(19 + baseOffset, current, [nb]))

        // Line 20 / 18: queue.enqueue(nb) / stack.push(nb)
        container.push(nb)
        operationCount++
        steps.push(makeStep(20 + baseOffset, current))
      }
    }
  }

  // Line 21 / 19: return island
  steps.push(makeStep(21 + baseOffset, startKey))

  return { steps, cells, waterBorders, operationCount }
}

export function runInnerBFSCode(
  startKey: string,
  islandIndex: number,
  islands: Set<string>,
  visited: Set<string>,
  rows: number,
  cols: number,
  connectivity: 4 | 8,
  outerStyle: 'for' | 'outer',
) {
  return runInnerFillCode(startKey, islandIndex, islands, visited, rows, cols, connectivity, 'bfs', outerStyle)
}

export function runInnerDFSCode(
  startKey: string,
  islandIndex: number,
  islands: Set<string>,
  visited: Set<string>,
  rows: number,
  cols: number,
  connectivity: 4 | 8,
  outerStyle: 'for' | 'outer',
) {
  return runInnerFillCode(startKey, islandIndex, islands, visited, rows, cols, connectivity, 'dfs', outerStyle)
}

