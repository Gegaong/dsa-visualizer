import type { GridStep } from './gridTypes'

const DIRS_4 = [[-1, 0], [0, 1], [1, 0], [0, -1]] as const
const DIRS_8 = [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1]] as const

// Returns valid in-bounds island-cell neighbors of `key` using the chosen connectivity.
function getIslandNeighbors(
  key: string,
  islands: Set<string>,
  rows: number,
  cols: number,
  connectivity: 4 | 8,
): string[] {
  const [r, c] = key.split(',').map(Number)
  const dirs = connectivity === 4 ? DIRS_4 : DIRS_8
  const result: string[] = []
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc
    const nk = `${nr},${nc}`
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && islands.has(nk)) result.push(nk)
  }
  return result
}

// BFS flood-fill from startKey: collects all cells of one island level by level, emitting one step per dequeue.
export function runInnerBFS(
  startKey: string,
  islandIndex: number,
  islands: Set<string>,
  visited: Set<string>,
  rows: number,
  cols: number,
  connectivity: 4 | 8,
): { steps: GridStep[]; cells: string[] } {
  const queue = [startKey]
  const cells: string[] = []
  const steps: GridStep[] = []
  const n = islandIndex + 1
  let first = true

  while (queue.length > 0) {
    const current = queue.shift()!
    cells.push(current)
    const newVisited: string[] = first ? [current] : []

    for (const nb of getIslandNeighbors(current, islands, rows, cols, connectivity)) {
      if (!visited.has(nb)) {
        visited.add(nb)
        queue.push(nb)
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

  return { steps, cells }
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
): { steps: GridStep[]; cells: string[] } {
  const stack = [startKey]
  const cells: string[] = []
  const steps: GridStep[] = []
  const n = islandIndex + 1
  let first = true

  while (stack.length > 0) {
    const current = stack.pop()!
    cells.push(current)
    const newVisited: string[] = first ? [current] : []

    for (const nb of getIslandNeighbors(current, islands, rows, cols, connectivity)) {
      if (!visited.has(nb)) {
        visited.add(nb)
        stack.push(nb)
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

  return { steps, cells }
}
