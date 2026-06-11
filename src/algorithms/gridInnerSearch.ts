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
