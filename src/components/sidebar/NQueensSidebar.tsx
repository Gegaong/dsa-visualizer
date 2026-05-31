import { AlgorithmInfoCard } from './AlgorithmInfoCard'
import { PlaybackControls } from './PlaybackControls'
import { StepExplanation } from './StepExplanation'

type NQueensSidebarProps = {
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
  onRun,
  onStop,
  onStepForward,
  onStepBackward,
  onTogglePlay,
  onSpeedChange,
}: NQueensSidebarProps) => (
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
        <StepExplanation text="" />
      </div>

      <div className="step-explanation step-explanation--pseudocode">
        <pre className="nqueens-pseudocode">{`function backtrack(col):
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
    return false`}</pre>
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
