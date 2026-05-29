export type NQueensPhase = 'try' | 'place' | 'backtrack' | 'solution'

export type NQueensStep = {
  lockedQueens: ReadonlyArray<{ row: number; col: number }>
  tryingQueen: { row: number; col: number } | null
  phase: NQueensPhase
}

// Returns true if placing at (row, col) would attack any already-placed queen.
function hasConflict(
  placed: ReadonlyArray<{ row: number; col: number }>,
  row: number,
  col: number,
): boolean {
  for (const q of placed) {
    if (q.row === row) return true
    if (Math.abs(q.row - row) === Math.abs(q.col - col)) return true
  }
  return false
}

// Solves N-Queens column by column: for each column, scan every row top-to-bottom,
// try the cell, place if safe, then recurse into the next column.
export function solveNQueens(n: number): NQueensStep[] {
  const steps: NQueensStep[] = []
  const placed: Array<{ row: number; col: number }> = []

  function bt(col: number): void {
    for (let row = 0; row < n; row++) {
      steps.push({
        lockedQueens: placed.map(q => ({ ...q })),
        tryingQueen: { row, col },
        phase: 'try',
      })
      if (!hasConflict(placed, row, col)) {
        placed.push({ row, col })
        // Last column: placing this queen IS the solution — no extra step needed.
        const phase: NQueensPhase = col === n - 1 ? 'solution' : 'place'
        steps.push({ lockedQueens: placed.map(q => ({ ...q })), tryingQueen: null, phase })
        if (col < n - 1) bt(col + 1)
        placed.pop()
        steps.push({ lockedQueens: placed.map(q => ({ ...q })), tryingQueen: null, phase: 'backtrack' })
      }
    }
  }

  bt(0)
  return steps
}
