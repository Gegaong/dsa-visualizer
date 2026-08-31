import type { NQueensStep, NQueensPhase, NQueensPlaybackMode } from '../../../algorithms/nqueens/nqueens'

import { AlgorithmInfoCard } from '../AlgorithmInfoCard'

import { PlaybackControls } from '../PlaybackControls'

import { PseudocodePanel } from '../PseudocodePanel'

const CODE_PSEUDOCODE = `function backtrack(col):
    for row ← 0 to n-1:
        if not CONFLICTS(queens, row, col):
            queens.add({row, col})
            if col = n-1:
                ✓ valid solution found
            else:
                backtrack(col + 1)
            queens.remove({row, col})

function CONFLICTS(queens, row, col):
    for each q in queens:
        if q.row = row → return true
        if |q.row - row| = |q.col - col|
            → return true
    return false`

const EXPLANATORY_PSEUDOCODE = `Work through columns, left to right.
─────────────────────────────────────
In each column, try every row top to bottom:

  · If the position is safe → place a queen.

  · Last column?
      ✓ Solution found. Keep searching.
    Otherwise:
      Do the same for the next column.

  · Once done exploring from this placement,
    remove the queen and try the next row.
─────────────────────────────────────
If no row worked in this column:
  · Step back to the previous column
    and continue from where it left off.`

// Line indices (0-based) to highlight per phase for each pseudocode style.
const CODE_HIGHLIGHTS: Record<NQueensPhase, number[]> = {
  try:       [1, 2, 11, 12, 13, 14, 15],
  place:     [3, 4, 6, 7],
  solution:  [3, 4, 5],
  backtrack: [8],
}

const EXPLANATORY_HIGHLIGHTS: Record<NQueensPhase, number[]> = {
  try:       [0, 2, 4],
  place:     [4, 8, 9],
  solution:  [4, 6, 7],
  backtrack: [11, 12, 14, 15, 16],
}

// Returns the set of line indices to highlight:
//   'ready' = not yet stepped → highlight the function signature (line 0).
//   'done'  = search finished → highlight nothing; the code is no longer executing.
//   null    = mid-run → use the live phase or exact codeLine.
type NQueensLifecycle = 'ready' | 'done' | null

function getHighlightedLines(
  step: NQueensStep | null,
  isExplanatory: boolean,
  lifecycle: NQueensLifecycle,
  mode: NQueensPlaybackMode,
): Set<number> {
  if (lifecycle === 'ready') return new Set(isExplanatory ? [0, 2] : [0])
  if (lifecycle === 'done') return new Set()
  if (!step) return new Set()

  if (mode === 'code' && step.codeLine !== undefined) {
    if (isExplanatory) {
      return new Set(step.logicLines ?? [0, 2])
    }
    return new Set([step.codeLine])
  }

  const map = isExplanatory ? EXPLANATORY_HIGHLIGHTS : CODE_HIGHLIGHTS
  return new Set(map[step.phase])
}

function toChessNotation(col: number, row: number, n: number): string {
  return `${String.fromCharCode(97 + col)}${n - row}`
}

// Extracts runtime variables (n, col, row, q, queens) for display in the variable panel.
// Keeps strictly declared variables visible in fixed slots (using '—' when unset)
// so the layout stays tight, stable, and predictable on every step.
function deriveVars(
  step: NQueensStep | null,
  n: number,
  lifecycle: NQueensLifecycle,
  mode: NQueensPlaybackMode,
): string[][] | null {
  if (lifecycle === 'ready') {
    if (mode === 'code') {
      return [
        [`n = ${n}`, `col = 0`, `row = —`, `q = —`],
        [`queens = []`],
      ]
    }
    return [
      [`col = 0`, `row = —`],
      [`queens = []`],
    ]
  }

  if (lifecycle === 'done') {
    if (mode === 'code') {
      return [
        [`n = ${n}`, `col = —`, `row = —`, `q = —`],
        [`queens = []`],
      ]
    }
    return [
      [`col = —`, `row = —`],
      [`queens = []`],
    ]
  }

  if (!step) {
    return null
  }

  const {
    lockedQueens,
    tryingQueen,
    phase,
    activeCol,
    activeRow,
    conflictingQueen,
    codeLine,
  } = step

  let colStr: string
  let rowStr: string

  if (activeCol !== undefined) {
    colStr = String(activeCol)
    rowStr = activeRow !== undefined && activeRow !== null ? String(activeRow) : '—'
  } else if (tryingQueen) {
    colStr = String(tryingQueen.col)
    rowStr = String(tryingQueen.row)
  } else if (phase === 'backtrack') {
    colStr = String(lockedQueens.length)
    rowStr = '—'
  } else {
    const last = lockedQueens[lockedQueens.length - 1]
    colStr = last ? String(last.col) : '0'
    rowStr = last ? String(last.row) : '—'
  }

  const queensList = [...lockedQueens]
    .sort((a, b) => a.col - b.col)
    .map((q) => toChessNotation(q.col, q.row, n))

  if (mode === 'visual' || codeLine === undefined) {
    return [
      [`col = ${colStr}`, `row = ${rowStr}`],
      [`queens = [${queensList.join(', ')}]`],
    ]
  }

  // In Code Execution Mode: track strictly declared variables inside the code in stable positions
  let qStr = '—'
  if (codeLine === 2 && conflictingQueen) {
    qStr = toChessNotation(conflictingQueen.col, conflictingQueen.row, n)
  }

  return [
    [`n = ${n}`, `col = ${colStr}`, `row = ${rowStr}`, `q = ${qStr}`],
    [`queens = [${queensList.join(', ')}]`],
  ]
}

type NQueensSidebarProps = {
  n: number
  mode: NQueensPlaybackMode
  onModeChange: (mode: NQueensPlaybackMode) => void
  isRunning: boolean
  stepIndex: number
  stepCount: number
  solutionsFound: number
  operationCount: number
  isPlaying: boolean
  playbackSpeed: number
  isPlaybackComplete: boolean
  canStepBackward: boolean
  canStepForward: boolean
  canTogglePlay: boolean
  currentStep: NQueensStep | null
  pseudocodeShowLogic: boolean
  onRun: () => void
  onStop: () => void
  onStepForward: () => void
  onStepBackward: () => void
  onTogglePlay: () => void
  onSpeedChange: (v: number) => void
  onPseudocodeFlip: () => void
}

// Returns the playback step counter string — "Ready / N" before the first step, then "i / N".
function formatStepDisplay(stepIndex: number, stepCount: number): string {
  if (stepIndex >= 0) return `${stepIndex + 1} / ${stepCount}`
  return `Ready / ${stepCount}`
}

// Final hint once the search is fully stepped through (the terminal complete state).
function buildNQueensCompletionStatus(n: number, solutionsFound: number): string {
  if (solutionsFound === 0) return `Search complete. No solutions exist for ${n} queens.`
  return `Search complete. ${solutionsFound} solution${solutionsFound === 1 ? '' : 's'} found.`
}

// Sidebar for the N-Queens solver — playback controls, pseudocode panel with live variable state, and solution output.
export const NQueensSidebar = ({
  n,
  mode,
  onModeChange,
  isRunning,
  stepIndex,
  stepCount,
  solutionsFound,
  operationCount,
  isPlaying,
  playbackSpeed,
  isPlaybackComplete,
  canStepBackward,
  canStepForward,
  canTogglePlay,
  currentStep,
  pseudocodeShowLogic,
  onRun,
  onStop,
  onStepForward,
  onStepBackward,
  onTogglePlay,
  onSpeedChange,
  onPseudocodeFlip,
}: NQueensSidebarProps) => {
  // Pre-step → setup; finished → outcome; mid-run → live phase.
  const lifecycle: NQueensLifecycle = !isRunning ? null : stepIndex < 0 ? 'ready' : isPlaybackComplete ? 'done' : null
  const codeHighlighted = getHighlightedLines(currentStep, false, lifecycle, mode)
  const logicHighlighted = getHighlightedLines(currentStep, true, lifecycle, mode)

  const varsRows = deriveVars(currentStep, n, lifecycle, mode)

  return (
  <aside className="sidebar is-nqueens">
    <div className="sidebar-page-body sidebar-page-body--grid">
      <AlgorithmInfoCard infoKey="nqueens" />
      <div className="sidebar-section sidebar-section--grid-playback">
        <h3>Playback</h3>
        <div className="playback-mode-toggle" role="radiogroup" aria-label="Playback mode">
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'visual'}
            className={`playback-mode-btn ${mode === 'visual' ? 'playback-mode-btn--active' : ''}`}
            disabled={isRunning}
            onClick={() => onModeChange('visual')}
          >
            Visual Steps
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'code'}
            className={`playback-mode-btn ${mode === 'code' ? 'playback-mode-btn--active' : ''}`}
            disabled={isRunning}
            onClick={() => onModeChange('code')}
          >
            Line by Line
          </button>
        </div>
        <PlaybackControls
          runLabel="Run N-Queens"
          stopLabel="Stop"
          isRunActive={isRunning}
          onRunToggle={isRunning ? onStop : onRun}
          runDisabled={false}
          onPrevious={onStepBackward}
          onNext={onStepForward}
          onPlayPauseToggle={onTogglePlay}
          isPlaying={isPlaying}
          isPlaybackComplete={isPlaybackComplete}
          canStepBackward={canStepBackward}
          canStepForward={canStepForward}
          canTogglePlay={canTogglePlay}
          speed={playbackSpeed}
          onSpeedChange={onSpeedChange}
        />
        {isRunning && (
          <p className="hint">
            {isPlaybackComplete
              ? buildNQueensCompletionStatus(n, solutionsFound)
              : mode === 'code' && currentStep?.codeLine !== undefined
                ? `Line ${currentStep.codeLine + 1} · Step ${formatStepDisplay(stepIndex, stepCount)}`
                : `Step ${formatStepDisplay(stepIndex, stepCount)}`}
          </p>
        )}
      </div>

      <PseudocodePanel
        codeText={CODE_PSEUDOCODE}
        logicText={EXPLANATORY_PSEUDOCODE}
        codeHighlighted={codeHighlighted}
        logicHighlighted={logicHighlighted}
        varsRows={varsRows}
        showLogic={pseudocodeShowLogic}
        onFlip={onPseudocodeFlip}
        canDetach={!isPlaying}
      />

      <div className="sidebar-section">
        <h3>Output</h3>
        <div className="algorithm-output">
          <div className="output-row">
            <span className="output-label">Solutions found</span>
            <span className="output-value">{isRunning ? solutionsFound : '—'}</span>
          </div>
          <div className="output-row">
            <span className="output-label">Operations</span>
            <span className="output-value">{isRunning ? operationCount : '—'}</span>
          </div>
          <div className="output-row">
            <span className="output-label">Total steps</span>
            <span className="output-value">{isRunning ? stepCount : '—'}</span>
          </div>
        </div>
      </div>
    </div>
  </aside>
  )
}
