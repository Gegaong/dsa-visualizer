export type GridSearchStep = {
  currentCell: string     // "row,col" cell being processed this step
  searchIndex: number     // which start cell initiated this search (0-based)
  isNewSearch: boolean    // true on the first step of each new search
  visitedCells: string[]  // full snapshot of all visited cells after this step
  frontierCells: string[] // queue (BFS) or stack (DFS) contents after this step
  explanation: string
}

export type GridSearchIsland = {
  startCell: string
  cells: string[]    // all island cells found by this search (empty if unreachable)
  reachable: boolean // false when the start cell was water or already visited
}

export type GridSearchResult = {
  steps: GridSearchStep[]
  islands: GridSearchIsland[]
}

const DIRS_4 = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const
const DIRS_8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]] as const

// Returns all valid in-bounds neighbor keys for a given cell, using 4- or 8-directional adjacency.
function getNeighbors(key: string, rows: number, cols: number, connectivity: 4 | 8): string[] {
  const [r, c] = key.split(',').map(Number)
  const dirs = connectivity === 4 ? DIRS_4 : DIRS_8
  const result: string[] = []
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) result.push(`${nr},${nc}`)
  }
  return result
}

// Converts a "row,col" key to a 1-indexed human-readable label for explanations.
function cellLabel(key: string): string {
  const [r, c] = key.split(',').map(Number)
  return `(row ${r + 1}, col ${c + 1})`
}

// Builds the per-step narration shown during playback, describing what the algorithm just did.
function buildExplanation(
  current: string,
  searchIndex: number,
  newNeighborCount: number,
  frontier: string[],
  strategy: 'bfs' | 'dfs',
  connectivity: 4 | 8,
  isFirstStep: boolean,
): string {
  const struct = strategy === 'bfs' ? 'queue' : 'stack'
  const Struct = struct[0].toUpperCase() + struct.slice(1)
  const actionWord = strategy === 'bfs' ? 'Dequeued' : 'Popped'
  const addWord = strategy === 'bfs' ? 'Enqueued' : 'Pushed'
  const found = newNeighborCount
  const queueInfo = frontier.length > 0
    ? `${Struct} has ${frontier.length} cell${frontier.length > 1 ? 's' : ''} remaining.`
    : `${Struct} is empty — island fully explored.`

  if (isFirstStep) {
    if (found === 0) {
      return `Search #${searchIndex + 1} starts at ${cellLabel(current)}. ${connectivity}-directional scan found no unvisited island neighbors — isolated cell.`
    }
    return `Search #${searchIndex + 1} starts at ${cellLabel(current)}. ${addWord} ${found} island neighbor${found > 1 ? 's' : ''} into the ${struct}.`
  }

  if (found === 0) {
    return `${actionWord} ${cellLabel(current)}. No new island neighbors. ${queueInfo}`
  }
  return `${actionWord} ${cellLabel(current)}. ${addWord} ${found} new neighbor${found > 1 ? 's' : ''}. ${queueInfo}`
}

// Pure BFS/DFS island search on a grid. Runs one search per start cell in order,
// using a shared visited set so each island cell is explored at most once.
export function runGridSearch(
  islands: Set<string>,
  startCells: string[],
  rows: number,
  cols: number,
  connectivity: 4 | 8,
  strategy: 'bfs' | 'dfs',
): GridSearchResult {
  const globalVisited = new Set<string>()
  const steps: GridSearchStep[] = []
  const islandResults: GridSearchIsland[] = []

  for (let searchIndex = 0; searchIndex < startCells.length; searchIndex++) {
    const startCell = startCells[searchIndex]

    if (!islands.has(startCell) || globalVisited.has(startCell)) {
      islandResults.push({ startCell, cells: [], reachable: false })
      continue
    }

    const islandCells: string[] = []
    const frontier: string[] = [startCell]
    globalVisited.add(startCell)
    let firstStep = true

    while (frontier.length > 0) {
      const current = strategy === 'bfs' ? frontier.shift()! : frontier.pop()!
      islandCells.push(current)

      let newNeighborCount = 0
      for (const n of getNeighbors(current, rows, cols, connectivity)) {
        if (islands.has(n) && !globalVisited.has(n)) {
          globalVisited.add(n)
          frontier.push(n)
          newNeighborCount++
        }
      }

      steps.push({
        currentCell: current,
        searchIndex,
        isNewSearch: firstStep,
        visitedCells: [...globalVisited],
        frontierCells: [...frontier],
        explanation: buildExplanation(current, searchIndex, newNeighborCount, frontier, strategy, connectivity, firstStep),
      })

      firstStep = false
    }

    islandResults.push({ startCell, cells: islandCells, reachable: true })
  }

  return { steps, islands: islandResults }
}
