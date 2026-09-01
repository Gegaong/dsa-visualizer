import type { GridStep, GridResult, InnerAlgo } from './gridTypes'
import { runInnerBFS, runInnerDFS, runInnerBFSCode, runInnerDFSCode } from './gridInnerSearch'
import { computeDiscoverySteps } from './gridShared'

export type ForLoopScanMode =
  | 'tl-h' | 'tl-v'
  | 'tr-h' | 'tr-v'
  | 'bl-h' | 'bl-v'
  | 'br-h' | 'br-v'

// Returns all "r,c" cell keys in the order dictated by the scan mode (corner + primary axis).
function buildScanOrder(mode: ForLoopScanMode, rows: number, cols: number): string[] {
  const topStart  = mode[0] === 't'
  const leftStart = mode[1] === 'l'
  const hPrimary  = mode.endsWith('h')

  const rStart = topStart  ? 0       : rows - 1
  const rEnd   = topStart  ? rows    : -1
  const rStep  = topStart  ? 1       : -1
  const cStart = leftStart ? 0       : cols - 1
  const cEnd   = leftStart ? cols    : -1
  const cStep  = leftStart ? 1       : -1

  const keys: string[] = []
  if (hPrimary) {
    for (let r = rStart; r !== rEnd; r += rStep)
      for (let c = cStart; c !== cEnd; c += cStep)
        keys.push(`${r},${c}`)
  } else {
    for (let c = cStart; c !== cEnd; c += cStep)
      for (let r = rStart; r !== rEnd; r += rStep)
        keys.push(`${r},${c}`)
  }
  return keys
}

// Outer for-loop island locator: scans every cell, skipping water and already-visited islands,
// and fires runInnerBFS/DFS on each unvisited island cell to collect the full island.
export function runForLoopOuter(
  islands: Set<string>,
  rows: number,
  cols: number,
  connectivity: 4 | 8,
  scanMode: ForLoopScanMode = 'tl-h',
  innerAlgo: InnerAlgo = 'bfs',
): GridResult {
  const visited = new Set<string>()
  const steps: GridStep[] = []
  const islandGroups: string[][] = []
  let islandIndex = -1
  const runInner = innerAlgo === 'bfs' ? runInnerBFS : runInnerDFS
  let opsTotal = 0
  let discoveryOps = 0

  for (const key of buildScanOrder(scanMode, rows, cols)) {
    opsTotal++  // cell scan (data read: is this cell land or water?)
    if (!islands.has(key)) {
      visited.add(key)
      steps.push({ phase: 'outer', subPhase: 'outer-water', currentCell: key, newVisited: [key], frontierCells: [], islandIndex: -1 })
      continue
    }

    if (visited.has(key)) {
      steps.push({ phase: 'outer', subPhase: 'outer-visited', currentCell: key, newVisited: [], frontierCells: [], islandIndex: -1 })
      continue
    }

    islandIndex++
    visited.add(key)
    const { steps: innerSteps, cells, operationCount: innerOps } = runInner(key, islandIndex, islands, visited, rows, cols, connectivity)
    opsTotal += innerOps
    for (const s of innerSteps) steps.push(s)
    islandGroups.push(cells)
    discoveryOps = opsTotal
  }

  return { steps, islandGroups, discoverySteps: computeDiscoverySteps(steps), operationCount: opsTotal, discoveryOperations: discoveryOps }
}

// Line-by-line Outer for-loop island locator
export function runForLoopOuterCode(
  islands: Set<string>,
  rows: number,
  cols: number,
  connectivity: 4 | 8,
  scanMode: ForLoopScanMode = 'tl-h',
  innerAlgo: InnerAlgo = 'bfs',
): GridResult {
  if (rows === 0 || cols === 0) return { steps: [], islandGroups: [], discoverySteps: 0, operationCount: 0, discoveryOperations: 0 }

  const visited = new Set<string>()
  const steps: GridStep[] = []
  const islandGroups: string[][] = []
  let islandIndex = -1
  const runInnerCode = innerAlgo === 'bfs' ? runInnerBFSCode : runInnerDFSCode
  let opsTotal = 0
  let discoveryOps = 0

  // Line 0: function SCAN(grid, rows, cols)
  steps.push({
    phase: 'outer',
    currentCell: '0,0',
    newVisited: [],
    frontierCells: [],
    islandIndex: -1,
    codeLine: 0,
    logicLines: [0, 1],
  })

  // Line 1: islands ← []; visited ← {}
  steps.push({
    phase: 'outer',
    currentCell: '0,0',
    newVisited: [],
    frontierCells: [],
    islandIndex: -1,
    codeLine: 1,
    logicLines: [0, 1],
  })

  const scanOrder = buildScanOrder(scanMode, rows, cols)

  for (const key of scanOrder) {
    opsTotal++  // cell scan read

    // Line 2: outer loop (row or col depending on primary)
    steps.push({
      phase: 'outer',
      currentCell: key,
      newVisited: [],
      frontierCells: [],
      islandIndex: -1,
      codeLine: 2,
      logicLines: [0, 1, 3],
    })

    // Line 3: inner loop
    steps.push({
      phase: 'outer',
      currentCell: key,
      newVisited: [],
      frontierCells: [],
      islandIndex: -1,
      codeLine: 3,
      logicLines: [0, 1, 3],
    })

    if (!islands.has(key)) {
      visited.add(key)
      // Line 4: if grid[r][c] = water → skip
      steps.push({
        phase: 'outer',
        subPhase: 'outer-water',
        currentCell: key,
        newVisited: [key],
        frontierCells: [],
        islandIndex: -1,
        codeLine: 4,
        logicLines: [0, 1, 3, 4],
      })
      continue
    }

    // Land cell: Line 4 is checked and evaluates to false
    steps.push({
      phase: 'outer',
      currentCell: key,
      newVisited: [],
      frontierCells: [],
      islandIndex: -1,
      codeLine: 4,
      logicLines: [0, 1, 3],
    })

    if (visited.has(key)) {
      // Line 5: if (r,c) ∈ visited → skip
      steps.push({
        phase: 'outer',
        subPhase: 'outer-visited',
        currentCell: key,
        newVisited: [],
        frontierCells: [],
        islandIndex: -1,
        codeLine: 5,
        logicLines: [0, 1, 3, 5],
      })
      continue
    }

    // Unvisited land: Line 5 evaluates to false
    steps.push({
      phase: 'outer',
      currentCell: key,
      newVisited: [],
      frontierCells: [],
      islandIndex: -1,
      codeLine: 5,
      logicLines: [0, 1, 3],
    })

    // Line 6: island ← FILL(r,c, grid, visited)
    steps.push({
      phase: 'outer',
      currentCell: key,
      newVisited: [],
      frontierCells: [],
      islandIndex: islandIndex + 1,
      codeLine: 6,
      logicLines: [7, 8, 9, 10, 11, 12, 13],
    })

    islandIndex++
    visited.add(key)
    const { steps: innerSteps, cells, operationCount: innerOps } = runInnerCode(key, islandIndex, islands, visited, rows, cols, connectivity, 'for')
    opsTotal += innerOps
    for (const s of innerSteps) {
      steps.push(s)
    }
    islandGroups.push(cells)
    discoveryOps = opsTotal

    // Line 7: islands.add(island)
    steps.push({
      phase: 'outer',
      currentCell: key,
      newVisited: [],
      frontierCells: [],
      islandIndex,
      codeLine: 7,
      logicLines: [7, 8, 9, 10, 11, 12, 13],
    })
  }

  // Line 8: return islands
  const lastKey = scanOrder[scanOrder.length - 1] ?? '0,0'
  steps.push({
    phase: 'outer',
    currentCell: lastKey,
    newVisited: [],
    frontierCells: [],
    islandIndex: -1,
    codeLine: 8,
    logicLines: [15, 16],
  })

  return { steps, islandGroups, discoverySteps: computeDiscoverySteps(steps), operationCount: opsTotal, discoveryOperations: discoveryOps }
}

