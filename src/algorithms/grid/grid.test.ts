import { describe, it, expect } from 'vitest'

import { getInBoundsNeighbors, computeDiscoverySteps } from './gridShared'
import { runInnerBFS, runInnerDFS } from './gridInnerSearch'
import { runForLoopOuter } from './gridForLoopOuter'
import type { ForLoopScanMode } from './gridForLoopOuter'
import { runOuterBFS, runOuterDFS } from './gridOuterSearch'
import { gridFrom } from '../__testutils__/fixtures'
import type { GridStep } from './gridTypes'

// Sort each island group internally, then sort the groups array so that
// comparisons are independent of the order in which islands were discovered.
function normalizeGroups(groups: string[][]): string[][] {
  return groups
    .map((g) => [...g].sort())
    .sort((a, b) => a[0].localeCompare(b[0]))
}

// ─── getInBoundsNeighbors ─────────────────────────────────────────────────────

describe('getInBoundsNeighbors', () => {
  it('1×1 grid has no neighbors for either connectivity', () => {
    expect(getInBoundsNeighbors('0,0', 1, 1, 4)).toHaveLength(0)
    expect(getInBoundsNeighbors('0,0', 1, 1, 8)).toHaveLength(0)
  })

  it('top-left corner (0,0) of 3×3 — 4-conn: 2 neighbors, 8-conn: 3', () => {
    const n4 = getInBoundsNeighbors('0,0', 3, 3, 4)
    expect(n4).toHaveLength(2)
    expect(n4).toContain('0,1')  // right
    expect(n4).toContain('1,0')  // down

    const n8 = getInBoundsNeighbors('0,0', 3, 3, 8)
    expect(n8).toHaveLength(3)
    expect(n8).toContain('1,1')  // diagonal included in 8-conn
  })

  it('center (1,1) of 3×3 — 4-conn: 4 neighbors, 8-conn: 8', () => {
    expect(getInBoundsNeighbors('1,1', 3, 3, 4)).toHaveLength(4)
    expect(getInBoundsNeighbors('1,1', 3, 3, 8)).toHaveLength(8)
  })

  it('bottom-right corner (2,2) of 3×3 — 4-conn: 2 neighbors', () => {
    const nbs = getInBoundsNeighbors('2,2', 3, 3, 4)
    expect(nbs).toHaveLength(2)
    expect(nbs).toContain('1,2')  // up
    expect(nbs).toContain('2,1')  // left
  })

  it('top-edge cell (0,1) of 3×3 — 4-conn: 3 neighbors (no up, yes left/right/down)', () => {
    const nbs = getInBoundsNeighbors('0,1', 3, 3, 4)
    expect(nbs).toHaveLength(3)
    expect(nbs).toContain('0,0')
    expect(nbs).toContain('0,2')
    expect(nbs).toContain('1,1')
  })

  it('left-edge cell (1,0) of 3×3 — 4-conn: 3 neighbors', () => {
    const nbs = getInBoundsNeighbors('1,0', 3, 3, 4)
    expect(nbs).toHaveLength(3)
    expect(nbs).toContain('0,0')
    expect(nbs).toContain('2,0')
    expect(nbs).toContain('1,1')
  })

  it('asymmetric grid: top-right corner (0,4) of 2×5 — 4-conn: 2 neighbors', () => {
    const nbs = getInBoundsNeighbors('0,4', 2, 5, 4)
    expect(nbs).toHaveLength(2)
    expect(nbs).toContain('1,4')  // down
    expect(nbs).toContain('0,3')  // left
  })

  it('1×5 single-row: interior cell (0,2) — 4-conn: 2 neighbors (left and right only)', () => {
    const nbs = getInBoundsNeighbors('0,2', 1, 5, 4)
    expect(nbs).toHaveLength(2)
    expect(nbs).toContain('0,1')
    expect(nbs).toContain('0,3')
  })
})

// ─── computeDiscoverySteps ────────────────────────────────────────────────────

describe('computeDiscoverySteps', () => {
  it('empty step array → 0', () => {
    expect(computeDiscoverySteps([])).toBe(0)
  })

  it('only outer steps → 0 (no inner phase)', () => {
    const steps: GridStep[] = [
      { phase: 'outer', subPhase: 'outer-water', currentCell: '0,0', newVisited: [], frontierCells: [], islandIndex: -1 },
      { phase: 'outer', subPhase: 'outer-water', currentCell: '0,1', newVisited: [], frontierCells: [], islandIndex: -1 },
    ]
    expect(computeDiscoverySteps(steps)).toBe(0)
  })

  it('last inner step at index 2 followed by an outer step → returns 3', () => {
    const steps: GridStep[] = [
      { phase: 'outer', subPhase: 'outer-water', currentCell: '0,0', newVisited: [], frontierCells: [], islandIndex: -1 },
      { phase: 'inner', subPhase: 'inner-start',   currentCell: '0,1', newVisited: ['0,1'], frontierCells: [], islandIndex: 0 },
      { phase: 'inner', subPhase: 'inner-process', currentCell: '0,2', newVisited: ['0,2'], frontierCells: [], islandIndex: 0 },
      { phase: 'outer', subPhase: 'outer-water', currentCell: '1,0', newVisited: [], frontierCells: [], islandIndex: -1 },
    ]
    expect(computeDiscoverySteps(steps)).toBe(3)
  })

  it('inner step is the very last step → returns steps.length', () => {
    const steps: GridStep[] = [
      { phase: 'outer', subPhase: 'outer-water', currentCell: '0,0', newVisited: [], frontierCells: [], islandIndex: -1 },
      { phase: 'inner', subPhase: 'inner-start',   currentCell: '1,0', newVisited: ['1,0'], frontierCells: [], islandIndex: 0 },
    ]
    expect(computeDiscoverySteps(steps)).toBe(2)
  })
})

// ─── runInnerBFS ──────────────────────────────────────────────────────────────

describe('runInnerBFS', () => {
  it('single-cell island: one inner-start step, no inner-process steps', () => {
    const { islands, rows, cols } = gridFrom('1')
    const visited = new Set(['0,0'])  // outer pre-adds startKey before calling inner
    const { cells, steps, waterBorders } = runInnerBFS('0,0', 0, islands, visited, rows, cols, 4)
    expect(cells).toEqual(['0,0'])
    expect(steps).toHaveLength(1)
    expect(steps[0].subPhase).toBe('inner-start')
    expect(waterBorders).toHaveLength(0)
  })

  it('3-cell row: collects all cells; first step inner-start, rest inner-process', () => {
    const { islands, rows, cols } = gridFrom('111')
    const visited = new Set(['0,0'])
    const { cells, steps } = runInnerBFS('0,0', 0, islands, visited, rows, cols, 4)
    expect(cells.sort()).toEqual(['0,0', '0,1', '0,2'])
    expect(steps[0].subPhase).toBe('inner-start')
    expect(steps.slice(1).every((s) => s.subPhase === 'inner-process')).toBe(true)
  })

  it('3-cell column: collects all cells', () => {
    const { islands, rows, cols } = gridFrom('1\n1\n1')
    const visited = new Set(['0,0'])
    const { cells } = runInnerBFS('0,0', 0, islands, visited, rows, cols, 4)
    expect(cells.sort()).toEqual(['0,0', '1,0', '2,0'])
  })

  it('L-shaped island: collects all 3 cells', () => {
    const { islands, rows, cols } = gridFrom('11\n10')
    const visited = new Set(['0,0'])
    const { cells } = runInnerBFS('0,0', 0, islands, visited, rows, cols, 4)
    expect(cells.sort()).toEqual(['0,0', '0,1', '1,0'])
  })

  it('full 2×2 island: collects all 4 cells', () => {
    const { islands, rows, cols } = gridFrom('11\n11')
    const visited = new Set(['0,0'])
    const { cells } = runInnerBFS('0,0', 0, islands, visited, rows, cols, 4)
    expect(cells.sort()).toEqual(['0,0', '0,1', '1,0', '1,1'])
  })

  it('islandIndex is propagated to every step', () => {
    const { islands, rows, cols } = gridFrom('11\n11')
    const visited = new Set(['0,0'])
    const { steps } = runInnerBFS('0,0', 7, islands, visited, rows, cols, 4)
    expect(steps.every((s) => s.islandIndex === 7)).toBe(true)
  })

  it('waterBorders contains all adjacent water cells of a center island cell', () => {
    const { islands, rows, cols } = gridFrom('000\n010\n000')
    const visited = new Set(['1,1'])
    const { waterBorders } = runInnerBFS('1,1', 0, islands, visited, rows, cols, 4)
    expect(new Set(waterBorders)).toEqual(new Set(['0,1', '1,0', '1,2', '2,1']))
  })

  it('8-connectivity merges diagonally adjacent island cells', () => {
    const { islands, rows, cols } = gridFrom('10\n01')
    const visited = new Set(['0,0'])
    const { cells } = runInnerBFS('0,0', 0, islands, visited, rows, cols, 8)
    expect(cells.sort()).toEqual(['0,0', '1,1'])
  })

  it('4-connectivity does NOT reach diagonally adjacent island cells', () => {
    const { islands, rows, cols } = gridFrom('10\n01')
    const visited = new Set(['0,0'])
    const { cells } = runInnerBFS('0,0', 0, islands, visited, rows, cols, 4)
    expect(cells).toEqual(['0,0'])
  })
})

// ─── runInnerDFS ──────────────────────────────────────────────────────────────

describe('runInnerDFS', () => {
  it('single-cell island: one inner-start step', () => {
    const { islands, rows, cols } = gridFrom('1')
    const visited = new Set(['0,0'])
    const { cells, steps } = runInnerDFS('0,0', 0, islands, visited, rows, cols, 4)
    expect(cells).toEqual(['0,0'])
    expect(steps[0].subPhase).toBe('inner-start')
  })

  it('3-cell row: collects all cells', () => {
    const { islands, rows, cols } = gridFrom('111')
    const visited = new Set(['0,0'])
    const { cells } = runInnerDFS('0,0', 0, islands, visited, rows, cols, 4)
    expect(cells.sort()).toEqual(['0,0', '0,1', '0,2'])
  })

  it('3-cell column: collects all cells', () => {
    const { islands, rows, cols } = gridFrom('1\n1\n1')
    const visited = new Set(['0,0'])
    const { cells } = runInnerDFS('0,0', 0, islands, visited, rows, cols, 4)
    expect(cells.sort()).toEqual(['0,0', '1,0', '2,0'])
  })

  it('L-shaped island: collects all 3 cells', () => {
    const { islands, rows, cols } = gridFrom('11\n10')
    const visited = new Set(['0,0'])
    const { cells } = runInnerDFS('0,0', 0, islands, visited, rows, cols, 4)
    expect(cells.sort()).toEqual(['0,0', '0,1', '1,0'])
  })

  it('8-connectivity merges diagonally adjacent island cells', () => {
    const { islands, rows, cols } = gridFrom('10\n01')
    const visited = new Set(['0,0'])
    const { cells } = runInnerDFS('0,0', 0, islands, visited, rows, cols, 8)
    expect(cells.sort()).toEqual(['0,0', '1,1'])
  })

  it('4-connectivity does NOT reach diagonally adjacent island cells', () => {
    const { islands, rows, cols } = gridFrom('10\n01')
    const visited = new Set(['0,0'])
    const { cells } = runInnerDFS('0,0', 0, islands, visited, rows, cols, 4)
    expect(cells).toEqual(['0,0'])
  })

  it('step sequence: first step is inner-start, the rest are inner-process', () => {
    const { islands, rows, cols } = gridFrom('111')
    const visited = new Set(['0,0'])
    const { steps } = runInnerDFS('0,0', 0, islands, visited, rows, cols, 4)
    expect(steps[0].subPhase).toBe('inner-start')
    expect(steps.slice(1).every((s) => s.subPhase === 'inner-process')).toBe(true)
  })

  it('islandIndex is propagated to every step', () => {
    const { islands, rows, cols } = gridFrom('11\n11')
    const visited = new Set(['0,0'])
    const { steps } = runInnerDFS('0,0', 5, islands, visited, rows, cols, 4)
    expect(steps.every((s) => s.islandIndex === 5)).toBe(true)
  })

  it('BFS and DFS collect exactly the same cell set for a complex island', () => {
    const { islands, rows, cols } = gridFrom('1110\n0110\n0011')
    const vBFS = new Set(['0,0'])
    const vDFS = new Set(['0,0'])
    const bfs = runInnerBFS('0,0', 0, islands, vBFS, rows, cols, 4)
    const dfs = runInnerDFS('0,0', 0, islands, vDFS, rows, cols, 4)
    expect(bfs.cells.sort()).toEqual(dfs.cells.sort())
  })
})

// ─── runForLoopOuter ──────────────────────────────────────────────────────────

describe('runForLoopOuter', () => {
  it('all-water grid: 0 island groups, all steps are outer phase', () => {
    const { islands, rows, cols } = gridFrom('000\n000\n000')
    const result = runForLoopOuter(islands, rows, cols, 4)
    expect(result.islandGroups).toHaveLength(0)
    expect(result.steps.every((s) => s.phase === 'outer')).toBe(true)
  })

  it('single-cell island in the center of a water grid', () => {
    const { islands, rows, cols } = gridFrom('000\n010\n000')
    const result = runForLoopOuter(islands, rows, cols, 4)
    expect(result.islandGroups).toHaveLength(1)
    expect(result.islandGroups[0]).toEqual(['1,1'])
  })

  it('three diagonal single-cell islands — 4-conn: 3 separate islands', () => {
    const { islands, rows, cols } = gridFrom('100\n010\n001')
    const result = runForLoopOuter(islands, rows, cols, 4)
    expect(result.islandGroups).toHaveLength(3)
    expect(result.islandGroups.flat().sort()).toEqual(['0,0', '1,1', '2,2'])
  })

  it('three diagonal single-cell islands — 8-conn: all merge into 1 island', () => {
    const { islands, rows, cols } = gridFrom('100\n010\n001')
    const result = runForLoopOuter(islands, rows, cols, 8)
    expect(result.islandGroups).toHaveLength(1)
    expect(result.islandGroups[0].sort()).toEqual(['0,0', '1,1', '2,2'])
  })

  it('L-shaped island: 1 group with 3 cells', () => {
    const { islands, rows, cols } = gridFrom('110\n100\n000')
    const result = runForLoopOuter(islands, rows, cols, 4)
    expect(result.islandGroups).toHaveLength(1)
    expect(result.islandGroups[0].sort()).toEqual(['0,0', '0,1', '1,0'])
  })

  it('three disconnected islands of varying sizes', () => {
    // island 1: (0,0),(0,1) | island 2: (1,2) | island 3: (2,0),(2,1)
    const { islands, rows, cols } = gridFrom('110\n001\n110')
    const result = runForLoopOuter(islands, rows, cols, 4)
    expect(result.islandGroups).toHaveLength(3)
    const groups = normalizeGroups(result.islandGroups)
    expect(groups[0]).toEqual(['0,0', '0,1'])
    expect(groups[1]).toEqual(['1,2'])
    expect(groups[2]).toEqual(['2,0', '2,1'])
  })

  it('1-row grid with three alternating island cells', () => {
    const { islands, rows, cols } = gridFrom('10101')
    const result = runForLoopOuter(islands, rows, cols, 4)
    expect(result.islandGroups).toHaveLength(3)
    expect(result.islandGroups.flat().sort()).toEqual(['0,0', '0,2', '0,4'])
  })

  it('fully connected 3×3 island: single group with all 9 cells', () => {
    const { islands, rows, cols } = gridFrom('111\n111\n111')
    const result = runForLoopOuter(islands, rows, cols, 4)
    expect(result.islandGroups).toHaveLength(1)
    expect(result.islandGroups[0]).toHaveLength(9)
  })

  it('BFS and DFS inner algorithms produce the same island groups', () => {
    const { islands, rows, cols } = gridFrom('110\n001\n110')
    const bfsResult = runForLoopOuter(islands, rows, cols, 4, 'tl-h', 'bfs')
    const dfsResult = runForLoopOuter(islands, rows, cols, 4, 'tl-h', 'dfs')
    expect(normalizeGroups(bfsResult.islandGroups)).toEqual(normalizeGroups(dfsResult.islandGroups))
  })

  it('all 8 scan modes find the same island groups', () => {
    const { islands, rows, cols } = gridFrom('110\n001\n110')
    const reference = normalizeGroups(runForLoopOuter(islands, rows, cols, 4, 'tl-h').islandGroups)
    const modes: ForLoopScanMode[] = ['tl-h', 'tl-v', 'tr-h', 'tr-v', 'bl-h', 'bl-v', 'br-h', 'br-v']
    for (const mode of modes) {
      const result = runForLoopOuter(islands, rows, cols, 4, mode)
      expect(normalizeGroups(result.islandGroups)).toEqual(reference)
    }
  })

  it('opposite scan modes (tl-h vs br-h) start with different cells', () => {
    const { islands, rows, cols } = gridFrom('110\n001\n110')
    const tlh = runForLoopOuter(islands, rows, cols, 4, 'tl-h')
    const brh = runForLoopOuter(islands, rows, cols, 4, 'br-h')
    expect(tlh.steps[0].currentCell).not.toBe(brh.steps[0].currentCell)
  })

  it('step sequence contains both outer and inner phases when islands exist', () => {
    const { islands, rows, cols } = gridFrom('100\n000\n001')
    const result = runForLoopOuter(islands, rows, cols, 4)
    const phases = new Set(result.steps.map((s) => s.phase))
    expect(phases.has('outer')).toBe(true)
    expect(phases.has('inner')).toBe(true)
  })

  it('operationCount is positive for a non-empty grid', () => {
    const { islands, rows, cols } = gridFrom('110\n001\n110')
    const result = runForLoopOuter(islands, rows, cols, 4)
    expect(result.operationCount).toBeGreaterThan(0)
  })

  it('discoverySteps is ≤ total step count and > 0 when islands exist', () => {
    const { islands, rows, cols } = gridFrom('110\n001\n110')
    const result = runForLoopOuter(islands, rows, cols, 4)
    expect(result.discoverySteps).toBeGreaterThan(0)
    expect(result.discoverySteps).toBeLessThanOrEqual(result.steps.length)
  })

  it('no cell appears in more than one island group', () => {
    const { islands, rows, cols } = gridFrom('110\n001\n110')
    const result = runForLoopOuter(islands, rows, cols, 4)
    const seen = new Set<string>()
    for (const group of result.islandGroups) {
      for (const cell of group) {
        expect(seen.has(cell)).toBe(false)
        seen.add(cell)
      }
    }
  })
})

// ─── runOuterBFS ──────────────────────────────────────────────────────────────

describe('runOuterBFS', () => {
  it('0-row grid: returns fully empty result', () => {
    const result = runOuterBFS(new Set(), 0, 0, 4, ['0,0'], 'bfs')
    expect(result.steps).toHaveLength(0)
    expect(result.islandGroups).toHaveLength(0)
    expect(result.operationCount).toBe(0)
  })

  it('all-water grid: no island groups', () => {
    const { islands, rows, cols } = gridFrom('000\n000')
    const result = runOuterBFS(islands, rows, cols, 4, ['0,0'], 'bfs')
    expect(result.islandGroups).toHaveLength(0)
  })

  it('single-cell island discovered from any corner start', () => {
    const { islands, rows, cols } = gridFrom('000\n010\n000')
    for (const start of ['0,0', '0,2', '2,0', '2,2']) {
      const result = runOuterBFS(islands, rows, cols, 4, [start], 'bfs')
      expect(result.islandGroups).toHaveLength(1)
      expect(result.islandGroups[0]).toEqual(['1,1'])
    }
  })

  it('three disconnected islands: finds all 3', () => {
    const { islands, rows, cols } = gridFrom('110\n001\n110')
    const result = runOuterBFS(islands, rows, cols, 4, ['0,0'], 'bfs')
    expect(result.islandGroups).toHaveLength(3)
    expect(normalizeGroups(result.islandGroups)).toEqual(
      normalizeGroups(runForLoopOuter(islands, rows, cols, 4).islandGroups),
    )
  })

  it('BFS and DFS inner algorithms produce the same island groups', () => {
    const { islands, rows, cols } = gridFrom('110\n001\n110')
    const bfs = runOuterBFS(islands, rows, cols, 4, ['0,0'], 'bfs')
    const dfs = runOuterBFS(islands, rows, cols, 4, ['0,0'], 'dfs')
    expect(normalizeGroups(bfs.islandGroups)).toEqual(normalizeGroups(dfs.islandGroups))
  })

  it('4-conn vs 8-conn differ for diagonal-only islands', () => {
    const { islands, rows, cols } = gridFrom('100\n010\n001')
    const r4 = runOuterBFS(islands, rows, cols, 4, ['0,0'], 'bfs')
    const r8 = runOuterBFS(islands, rows, cols, 8, ['0,0'], 'bfs')
    expect(r4.islandGroups).toHaveLength(3)
    expect(r8.islandGroups).toHaveLength(1)
  })

  it('multi-source start (two corners): still finds all islands', () => {
    const { islands, rows, cols } = gridFrom('110\n001\n110')
    const result = runOuterBFS(islands, rows, cols, 4, ['0,0', '2,2'], 'bfs')
    expect(result.islandGroups).toHaveLength(3)
  })

  it('operationCount > 0, discoveryOperations > 0, and discoveryOperations ≤ operationCount', () => {
    const { islands, rows, cols } = gridFrom('110\n000\n000')
    const result = runOuterBFS(islands, rows, cols, 4, ['0,0'], 'bfs')
    expect(result.operationCount).toBeGreaterThan(0)
    expect(result.discoveryOperations).toBeGreaterThan(0)
    expect(result.discoveryOperations).toBeLessThanOrEqual(result.operationCount)
  })

  it('bfs-outer-skip step appears when a flood-filled island cell is later dequeued', () => {
    // (0,1),(1,0),(1,1) form one island; outer BFS enqueues both (0,1) and (1,0) from
    // water cell (0,0), but inner BFS fills all three before (1,0) is dequeued.
    const { islands, rows, cols } = gridFrom('010\n110')
    const result = runOuterBFS(islands, rows, cols, 4, ['0,0'], 'bfs')
    expect(result.islandGroups).toHaveLength(1)
    expect(result.steps.some((s) => s.subPhase === 'bfs-outer-skip')).toBe(true)
  })
})

// ─── runOuterDFS ──────────────────────────────────────────────────────────────

describe('runOuterDFS', () => {
  it('0-row grid: returns fully empty result', () => {
    const result = runOuterDFS(new Set(), 0, 0, 4, '0,0', 'bfs')
    expect(result.steps).toHaveLength(0)
    expect(result.islandGroups).toHaveLength(0)
    expect(result.operationCount).toBe(0)
  })

  it('all-water grid: no island groups', () => {
    const { islands, rows, cols } = gridFrom('000\n000')
    const result = runOuterDFS(islands, rows, cols, 4, '0,0', 'bfs')
    expect(result.islandGroups).toHaveLength(0)
  })

  it('single-cell island discovered from corner start', () => {
    const { islands, rows, cols } = gridFrom('000\n010\n000')
    const result = runOuterDFS(islands, rows, cols, 4, '0,0', 'bfs')
    expect(result.islandGroups).toHaveLength(1)
    expect(result.islandGroups[0]).toEqual(['1,1'])
  })

  it('three disconnected islands: finds all 3', () => {
    const { islands, rows, cols } = gridFrom('110\n001\n110')
    const result = runOuterDFS(islands, rows, cols, 4, '0,0', 'bfs')
    expect(result.islandGroups).toHaveLength(3)
  })

  it('BFS and DFS inner algorithms produce the same island groups', () => {
    const { islands, rows, cols } = gridFrom('110\n001\n110')
    const bfs = runOuterDFS(islands, rows, cols, 4, '0,0', 'bfs')
    const dfs = runOuterDFS(islands, rows, cols, 4, '0,0', 'dfs')
    expect(normalizeGroups(bfs.islandGroups)).toEqual(normalizeGroups(dfs.islandGroups))
  })

  it('4-conn vs 8-conn differ for diagonal-only islands', () => {
    const { islands, rows, cols } = gridFrom('100\n010\n001')
    const r4 = runOuterDFS(islands, rows, cols, 4, '0,0', 'bfs')
    const r8 = runOuterDFS(islands, rows, cols, 8, '0,0', 'bfs')
    expect(r4.islandGroups).toHaveLength(3)
    expect(r8.islandGroups).toHaveLength(1)
  })

  it('OuterDFS and OuterBFS find exactly the same island groups', () => {
    const { islands, rows, cols } = gridFrom('110\n001\n110')
    const bfsResult = runOuterBFS(islands, rows, cols, 4, ['0,0'], 'bfs')
    const dfsResult = runOuterDFS(islands, rows, cols, 4, '0,0', 'bfs')
    expect(normalizeGroups(bfsResult.islandGroups)).toEqual(normalizeGroups(dfsResult.islandGroups))
  })

  it('operationCount > 0, discoveryOperations > 0, and discoveryOperations ≤ operationCount', () => {
    const { islands, rows, cols } = gridFrom('110\n000\n000')
    const result = runOuterDFS(islands, rows, cols, 4, '0,0', 'bfs')
    expect(result.operationCount).toBeGreaterThan(0)
    expect(result.discoveryOperations).toBeGreaterThan(0)
    expect(result.discoveryOperations).toBeLessThanOrEqual(result.operationCount)
  })

  it('dfs-outer-skip step appears when a flood-filled island cell is later popped', () => {
    // Same island as the BFS skip test — DFS from (0,0) pushes both (0,1) and (1,0) onto
    // the stack, inner DFS fills all three cells, then (1,0) is popped and triggers the skip.
    const { islands, rows, cols } = gridFrom('010\n110')
    const result = runOuterDFS(islands, rows, cols, 4, '0,0', 'bfs')
    expect(result.islandGroups).toHaveLength(1)
    expect(result.steps.some((s) => s.subPhase === 'dfs-outer-skip')).toBe(true)
  })
})
