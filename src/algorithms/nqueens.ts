export type NQueensPhase = 'try' | 'place' | 'backtrack' | 'solution'

export type NQueensStep = {
  lockedQueens: ReadonlyArray<{ row: number; col: number }>
  tryingQueen: { row: number; col: number } | null
  phase: NQueensPhase
  conflictChecks: number
}

// Returns conflict status and the exact number of queens examined before deciding.
// Short-circuits on first conflict — only counts checks actually performed.
function hasConflict(
  placed: ReadonlyArray<{ row: number; col: number }>,
  row: number,
  col: number,
): { conflict: boolean; checks: number } {
  let checks = 0
  for (const q of placed) {
    checks++
    if (q.row === row) return { conflict: true, checks }
    if (Math.abs(q.row - row) === Math.abs(q.col - col)) return { conflict: true, checks }
  }
  return { conflict: false, checks }
}

// Solves N-Queens column by column: for each column, scan every row top-to-bottom,
// try the cell, place if safe, then recurse into the next column.
export function solveNQueens(n: number): NQueensStep[] {
  const steps: NQueensStep[] = []
  const placed: Array<{ row: number; col: number }> = []

  function bt(col: number): void {
    for (let row = 0; row < n; row++) {
      const { conflict, checks } = hasConflict(placed, row, col)
      steps.push({
        lockedQueens: placed.map(q => ({ ...q })),
        tryingQueen: { row, col },
        phase: 'try',
        conflictChecks: checks,
      })
      if (!conflict) {
        placed.push({ row, col })
        const phase: NQueensPhase = col === n - 1 ? 'solution' : 'place'
        steps.push({ lockedQueens: placed.map(q => ({ ...q })), tryingQueen: null, phase, conflictChecks: 0 })
        if (col < n - 1) bt(col + 1)
        placed.pop()
        steps.push({ lockedQueens: placed.map(q => ({ ...q })), tryingQueen: null, phase: 'backtrack', conflictChecks: 0 })
      }
    }
  }

  bt(0)
  return steps
}
