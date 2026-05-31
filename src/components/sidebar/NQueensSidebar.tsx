import { useState } from 'react'
import type { NQueensStep, NQueensPhase } from '../../algorithms/nqueens'
import { AlgorithmInfoCard } from './AlgorithmInfoCard'
import { PlaybackControls } from './PlaybackControls'

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
  try:       [1, 2, 10, 11, 12, 13, 14, 15],
  place:     [3, 4, 6, 7],
  solution:  [3, 4, 5],
  backtrack: [8],
}

const EXPLANATORY_HIGHLIGHTS: Record<NQueensPhase, number[]> = {
  try:       [2, 4],
  place:     [4, 8, 9],
  solution:  [4, 6, 7],
  backtrack: [11, 12, 14, 15, 16],
}

function getHighlightedLines(phase: NQueensPhase | null, isExplanatory: boolean): Set<number> {
  if (!phase) return new Set()
  const map = isExplanatory ? EXPLANATORY_HIGHLIGHTS : CODE_HIGHLIGHTS
  return new Set(map[phase])
}

function deriveVars(step: NQueensStep, n: number) {
  const { lockedQueens, tryingQueen, phase } = step

  let col: number
  let row: number | null

  if (tryingQueen) {
    col = tryingQueen.col
    row = tryingQueen.row
  } else if (phase === 'backtrack') {
    col = lockedQueens.length
    row = null
  } else {
    const last = lockedQueens[lockedQueens.length - 1]
    col = last?.col ?? 0
    row = last?.row ?? null
  }

  const queens = [...lockedQueens].sort((a, b) => a.col - b.col).map(q => `${String.fromCharCode(97 + q.col)}${n - q.row}`)
  return { col, row, queens }
}

type NQueensSidebarProps = {
  n: number
  isRunning: boolean
  stepIndex: number
  stepCount: number
  solutionsFound: number
  isPlaying: boolean
  playbackSpeed: number
  isPlaybackComplete: boolean
  canStepBackward: boolean
  canStepForward: boolean
  canTogglePlay: boolean
  currentStep: NQueensStep | null
  onRun: () => void
  onStop: () => void
  onStepForward: () => void
  onStepBackward: () => void
  onTogglePlay: () => void
  onSpeedChange: (v: number) => void
}

// Returns the playback step counter string — "Ready / N" before the first step, then "i / N".
function formatStepDisplay(stepIndex: number, stepCount: number): string {
  if (stepIndex >= 0) return `${stepIndex + 1} / ${stepCount}`
  return `Ready / ${stepCount}`
}

export const NQueensSidebar = ({
  n,
  isRunning,
  stepIndex,
  stepCount,
  solutionsFound,
  isPlaying,
  playbackSpeed,
  isPlaybackComplete,
  canStepBackward,
  canStepForward,
  canTogglePlay,
  currentStep,
  onRun,
  onStop,
  onStepForward,
  onStepBackward,
  onTogglePlay,
  onSpeedChange,
}: NQueensSidebarProps) => {
  const [isExplanatory, setIsExplanatory] = useState(false)

  const text = isExplanatory ? EXPLANATORY_PSEUDOCODE : CODE_PSEUDOCODE
  const highlighted = getHighlightedLines(currentStep?.phase ?? null, isExplanatory)
  const vars = !isExplanatory && currentStep ? deriveVars(currentStep, n) : null

  return (
  <aside className="sidebar is-nqueens">
    <div className="sidebar-page-switch">
      <button className="sidebar-page-tab is-active" type="button">
        Solver
      </button>
    </div>
    <div className="sidebar-page-body sidebar-page-body--grid">
      <AlgorithmInfoCard infoKey="nqueens" />
      <div className="sidebar-section sidebar-section--grid-playback">
        <h3>Playback</h3>
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
          <p className="hint">Step {formatStepDisplay(stepIndex, stepCount)}</p>
        )}
      </div>

      <div className="step-explanation step-explanation--pseudocode">
        <button
          className="pseudocode-toggle-btn"
          type="button"
          onClick={() => setIsExplanatory(v => !v)}
        >
          {isExplanatory ? 'Logic' : 'Code'}
        </button>
        {vars && (
          <div className="pseudocode-vars">
            <div className="pseudocode-vars-row">
              <span>n = {n}</span>
              <span>col = {vars.col}</span>
              <span>row = {vars.row ?? '—'}</span>
            </div>
            <div className="pseudocode-vars-row">
              <span>queens = [{vars.queens.join(', ')}]</span>
            </div>
          </div>
        )}
        <pre className="nqueens-pseudocode">
          {text.split('\n').map((line, i) => (
            <span
              key={i}
              className={`pseudocode-line${highlighted.has(i) ? ' pseudocode-line--active' : ''}`}
            >
              {line}
            </span>
          ))}
        </pre>
      </div>

      <div className="sidebar-section">
        <h3>Output</h3>
        <div className="algorithm-output">
          <div className="output-row">
            <span className="output-label">Solutions found</span>
            <span className="output-value">{isRunning ? solutionsFound : '—'}</span>
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
