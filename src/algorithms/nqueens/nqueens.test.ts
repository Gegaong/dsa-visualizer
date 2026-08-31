import { describe, it, expect } from 'vitest'

import { solveNQueens, solveNQueensCode } from './nqueens'

// One 'solution' step is emitted each time the final column is successfully filled.
function solutions(n: number) {
  return solveNQueens(n).filter((step) => step.phase === 'solution')
}

function solutionsCode(n: number) {
  return solveNQueensCode(n).filter((step) => step.phase === 'solution')
}

function solutionCount(n: number): number {
  return solutions(n).length
}

// A full board is valid when no two queens share a row, a column, or a diagonal.
function isValidPlacement(queens: ReadonlyArray<{ row: number; col: number }>, n: number): boolean {
  if (queens.length !== n) return false
  for (let i = 0; i < queens.length; i += 1) {
    for (let j = i + 1; j < queens.length; j += 1) {
      const a = queens[i]
      const b = queens[j]
      if (a.row === b.row || a.col === b.col || Math.abs(a.row - b.row) === Math.abs(a.col - b.col)) {
        return false
      }
    }
  }
  return true
}

describe('solveNQueens', () => {
  // Known sequence: OEIS A000170
  it('matches the known number of solutions for all allowed board sizes (n = 1–10)', () => {
    expect(solutionCount(1)).toBe(1)
    expect(solutionCount(2)).toBe(0)
    expect(solutionCount(3)).toBe(0)
    expect(solutionCount(4)).toBe(2)
    expect(solutionCount(5)).toBe(10)
    expect(solutionCount(6)).toBe(4)
    expect(solutionCount(7)).toBe(40)
    expect(solutionCount(8)).toBe(92)
    expect(solutionCount(9)).toBe(352)
    expect(solutionCount(10)).toBe(724)
  })

  it('produces the two canonical 4-queens boards', () => {
    // each solution as row-per-column (queens are placed column 0..n-1 in order)
    const boards = new Set(solutions(4).map((s) => s.lockedQueens.map((q) => q.row).join(',')))
    expect(boards).toEqual(new Set(['1,3,0,2', '2,0,3,1']))
  })

  it('n = 1: single solution places the queen at row 0, col 0', () => {
    const sol = solutions(1)
    expect(sol).toHaveLength(1)
    expect(sol[0].lockedQueens).toEqual([{ row: 0, col: 0 }])
  })

  it('every reported solution is a full, non-attacking placement (n = 5–8)', () => {
    for (const n of [5, 6, 7, 8]) {
      for (const step of solutions(n)) {
        expect(isValidPlacement(step.lockedQueens, n)).toBe(true)
      }
    }
  })

  it('each solution has every queen in a distinct row', () => {
    for (const step of solutions(6)) {
      const rows = step.lockedQueens.map((q) => q.row)
      expect(new Set(rows).size).toBe(6)
    }
  })

  it('walks through all four phases on a backtracking run', () => {
    const phases = new Set(solveNQueens(4).map((s) => s.phase))
    expect(phases).toEqual(new Set(['try', 'place', 'backtrack', 'solution']))
  })

  it('records conflict checks on "try" steps, starting from zero on the empty board', () => {
    const tries = solveNQueens(5).filter((s) => s.phase === 'try')
    expect(tries.length).toBeGreaterThan(0)
    expect(tries.every((s) => s.conflictChecks >= 0)).toBe(true)
    expect(tries[0].conflictChecks).toBe(0)
  })

  it('column invariant: every "try" step has lockedQueens.length === tryingQueen.col', () => {
    for (const step of solveNQueens(5)) {
      if (step.phase === 'try') {
        expect(step.tryingQueen).not.toBeNull()
        expect(step.lockedQueens.length).toBe(step.tryingQueen!.col)
      }
    }
  })

  it('every "solution" step has all n queens locked and tryingQueen = null', () => {
    for (const step of solutions(5)) {
      expect(step.lockedQueens).toHaveLength(5)
      expect(step.tryingQueen).toBeNull()
    }
  })

  it('"place" and "backtrack" steps always have tryingQueen = null', () => {
    for (const step of solveNQueens(4)) {
      if (step.phase === 'place' || step.phase === 'backtrack') {
        expect(step.tryingQueen).toBeNull()
      }
    }
  })

  it('emits no steps for n = 0 (no columns to fill)', () => {
    expect(solveNQueens(0)).toEqual([])
  })
})

describe('solveNQueensCode', () => {
  it('finds identical solution counts and identical boards as visual solveNQueens for n = 1–8', () => {
    for (let n = 1; n <= 8; n++) {
      const visualSols = solutions(n)
      const codeSols = solutionsCode(n)
      expect(codeSols.length).toBe(visualSols.length)
      const visualBoards = visualSols.map((s) => s.lockedQueens.map((q) => `${q.row},${q.col}`).join(';'))
      const codeBoards = codeSols.map((s) => s.lockedQueens.map((q) => `${q.row},${q.col}`).join(';'))
      expect(codeBoards).toEqual(visualBoards)
    }
  })

  it('assigns valid codeLine indices (0..8) and logicLines to every step', () => {
    const steps = solveNQueensCode(4)
    expect(steps.length).toBeGreaterThan(0)
    const validLines = new Set([0, 1, 2, 3, 4, 5, 7, 8])
    for (const step of steps) {
      expect(step.codeLine).toBeDefined()
      expect(validLines.has(step.codeLine!)).toBe(true)
      expect(Array.isArray(step.logicLines)).toBe(true)
      expect(step.logicLines!.length).toBeGreaterThan(0)
    }
  })

  it('emits no steps for n = 0', () => {
    expect(solveNQueensCode(0)).toEqual([])
  })
})
