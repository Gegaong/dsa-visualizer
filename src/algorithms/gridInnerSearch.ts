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
): { steps: GridStep[]; cells: string[]; operationCount: number } {
  const queue = [startKey]
  const cells: string[] = []
  const steps: GridStep[] = []
  const n = islandIndex + 1
  let first = true
  let operationCount = 1  // initial push of startKey into the queue

  while (queue.length > 0) {
    const current = queue.shift()!
    operationCount++  // cell dequeue (V term)
    cells.push(current)
    const newVisited: string[] = first ? [current] : []

    const allNbs = getInBoundsNeighbors(current, rows, cols, connectivity)
    operationCount += allNbs.length  // all neighbor reads before island filter (E term)
    const nbs = allNbs.filter(k => islands.has(k))
    for (const nb of nbs) {
      if (!visited.has(nb)) {
        visited.add(nb)
        queue.push(nb)
        operationCount++  // frontier push
        newVisited.push(nb)
      }
    }

    let explanation: string
    if (first) {
      const nc = newVisited.length - 1
      explanation = nc > 0
        ? `Island #${n} found. ${nc} neighbor${nc !== 1 ? 's' : ''} added to queue.`
        : `Island #${n} found. No adjacent island cells.`
    } else if (queue.length === 0) {
      explanation = `Queue empty — island #${n} fully explored.`
    } else {
      const nc = newVisited.length
      explanation = nc > 0
        ? `Dequeued. ${nc} new neighbor${nc !== 1 ? 's' : ''} added (${queue.length} in queue).`
        : `Dequeued. No new neighbors (${queue.length} in queue).`
    }

    steps.push({ phase: 'inner', currentCell: current, newVisited, frontierCells: [...queue], islandIndex, explanation })
    first = false
  }

  return { steps, cells, operationCount }
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
): { steps: GridStep[]; cells: string[]; operationCount: number } {
  const stack = [startKey]
  const cells: string[] = []
  const steps: GridStep[] = []
  const n = islandIndex + 1
  let first = true
  let operationCount = 1  // initial push of startKey into the stack

  while (stack.length > 0) {
    const current = stack.pop()!
    operationCount++  // cell pop (V term)
    cells.push(current)
    const newVisited: string[] = first ? [current] : []

    // Push in reverse so DIRS[0] (up / top-left) is popped first — consistent with outer DFS.
    const allNbs = getInBoundsNeighbors(current, rows, cols, connectivity)
    operationCount += allNbs.length  // all neighbor reads before island filter (E term)
    const nbs = allNbs.filter(k => islands.has(k))
    for (let i = nbs.length - 1; i >= 0; i--) {
      const nb = nbs[i]
      if (!visited.has(nb)) {
        visited.add(nb)
        stack.push(nb)
        operationCount++  // frontier push
        newVisited.push(nb)
      }
    }

    let explanation: string
    if (first) {
      const nc = newVisited.length - 1
      explanation = nc > 0
        ? `Island #${n} found. ${nc} neighbor${nc !== 1 ? 's' : ''} added to stack.`
        : `Island #${n} found. No adjacent island cells.`
    } else if (stack.length === 0) {
      explanation = `Stack empty — island #${n} fully explored.`
    } else {
      const nc = newVisited.length
      explanation = nc > 0
        ? `Popped. ${nc} new neighbor${nc !== 1 ? 's' : ''} added (${stack.length} in stack).`
        : `Popped. No new neighbors (${stack.length} in stack).`
    }

    steps.push({ phase: 'inner', currentCell: current, newVisited, frontierCells: [...stack], islandIndex, explanation })
    first = false
  }

  return { steps, cells, operationCount }
}
