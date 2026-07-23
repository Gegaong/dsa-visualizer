import type { GridStep, GridResult, InnerAlgo } from './gridTypes'
import { runInnerBFS, runInnerDFS } from './gridInnerSearch'
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
