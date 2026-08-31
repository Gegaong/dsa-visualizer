export type NQueensPlaybackMode = 'visual' | 'code'

export type NQueensPhase = 'try' | 'place' | 'backtrack' | 'solution'

export type NQueensStep = {
  lockedQueens: ReadonlyArray<{ row: number; col: number }>
  tryingQueen: { row: number; col: number } | null
  phase: NQueensPhase
  conflictChecks: number
  codeLine?: number
  logicLines?: number[]
  activeCol?: number
  activeRow?: number | null
  conflictingQueen?: { row: number; col: number } | null
}

// Returns conflict status and the exact number of queens examined before deciding.
// Short-circuits on first conflict — only counts checks actually performed.
function hasConflict(
  placed: ReadonlyArray<{ row: number; col: number }>,
  row: number,
  col: number,
): { conflict: boolean; checks: number; conflictingQueen?: { row: number; col: number } } {
  let checks = 0
  for (const q of placed) {
    checks++
    if (q.row === row || Math.abs(q.row - row) === Math.abs(q.col - col)) {
      return { conflict: true, checks, conflictingQueen: q }
    }
  }
  return { conflict: false, checks }
}

// Solves N-Queens column by column in Visual / Action mode: 1 step per physical board change.
export function solveNQueens(n: number): NQueensStep[] {
  if (n <= 0) return []
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

// Solves N-Queens column by column in Code Execution mode: 1 step per pseudocode line executed.
export function solveNQueensCode(n: number): NQueensStep[] {
  if (n <= 0) return []
  const steps: NQueensStep[] = []
  const placed: Array<{ row: number; col: number }> = []

  function bt(col: number): void {
    // Line 0: function backtrack(col)
    steps.push({
      lockedQueens: placed.map(q => ({ ...q })),
      tryingQueen: null,
      phase: 'try',
      conflictChecks: 0,
      codeLine: 0,
      logicLines: [0, 2],
      activeCol: col,
      activeRow: null,
    })

    for (let row = 0; row < n; row++) {
      // Line 1: for row ← 0 to n-1
      steps.push({
        lockedQueens: placed.map(q => ({ ...q })),
        tryingQueen: { row, col },
        phase: 'try',
        conflictChecks: 0,
        codeLine: 1,
        logicLines: [2],
        activeCol: col,
        activeRow: row,
      })

      const { conflict, checks, conflictingQueen } = hasConflict(placed, row, col)

      // Line 2: if not CONFLICTS(queens, row, col)
      steps.push({
        lockedQueens: placed.map(q => ({ ...q })),
        tryingQueen: { row, col },
        phase: 'try',
        conflictChecks: checks,
        codeLine: 2,
        logicLines: [4],
        activeCol: col,
        activeRow: row,
        conflictingQueen: conflictingQueen ?? null,
      })

      if (!conflict) {
        placed.push({ row, col })

        // Line 3: queens.add({row, col})
        steps.push({
          lockedQueens: placed.map(q => ({ ...q })),
          tryingQueen: null,
          phase: 'place',
          conflictChecks: 0,
          codeLine: 3,
          logicLines: [4],
          activeCol: col,
          activeRow: row,
        })

        // Line 4: if col = n-1
        steps.push({
          lockedQueens: placed.map(q => ({ ...q })),
          tryingQueen: null,
          phase: 'place',
          conflictChecks: 0,
          codeLine: 4,
          logicLines: col === n - 1 ? [6, 7] : [8, 9],
          activeCol: col,
          activeRow: row,
        })

        if (col === n - 1) {
          // Line 5: ✓ valid solution found
          steps.push({
            lockedQueens: placed.map(q => ({ ...q })),
            tryingQueen: null,
            phase: 'solution',
            conflictChecks: 0,
            codeLine: 5,
            logicLines: [6, 7],
            activeCol: col,
            activeRow: row,
          })
        } else {
          // Line 7: backtrack(col + 1)
          steps.push({
            lockedQueens: placed.map(q => ({ ...q })),
            tryingQueen: null,
            phase: 'place',
            conflictChecks: 0,
            codeLine: 7,
            logicLines: [8, 9],
            activeCol: col,
            activeRow: row,
          })
          bt(col + 1)
        }

        placed.pop()

        // Line 8: queens.remove({row, col})
        const isColumnExhausted = row === n - 1
        steps.push({
          lockedQueens: placed.map(q => ({ ...q })),
          tryingQueen: null,
          phase: 'backtrack',
          conflictChecks: 0,
          codeLine: 8,
          logicLines: isColumnExhausted ? [11, 12, 14, 15, 16] : [11, 12],
          activeCol: col,
          activeRow: row,
        })
      }
    }
  }

  bt(0)
  return steps
}
