import type { TraversalStrategy } from '../../algorithms/algorithmstypes'

import type { ShortestPathOutput } from './sidebarTypes'

import { PlaybackControls } from './PlaybackControls'

import { confirmNodeLabelFieldOnEnter } from './sidebarFieldHelpers'

export type ShortestPathPanelProps = {
  isTraversalRunning: boolean
  isShortestPathSessionActive: boolean
  algorithmTraversal: TraversalStrategy
  onAlgorithmTraversalChange: (t: TraversalStrategy) => void
  algorithmPickerFrozen: boolean
  canRunShortestPath: boolean
  shortestPathStatusText: string
  shortestPathStartNodeLabel: string
  shortestPathGoalNodeLabel: string
  onShortestPathStartNodeLabelChange: (value: string) => void
  onShortestPathGoalNodeLabelChange: (value: string) => void
  isShortestPathPlaybackPlaying: boolean
  shortestPathPlaybackSpeed: number
  onShortestPathPlaybackSpeedChange: (value: number) => void
  onPlayShortestPath: () => void
  onPauseShortestPath: () => void
  onNextShortestPathStep: () => void
  onPreviousShortestPathStep: () => void
  canShortestPathStepForward: boolean
  canShortestPathStepBackward: boolean
  canShortestPathTogglePlay: boolean
  isShortestPathPlaybackComplete: boolean
  shortestPathOutput: ShortestPathOutput
  shortestPathStepIndex: number
  shortestPathStepTotal: number
  onRunShortestPath: (strategy: TraversalStrategy) => void
  onStopShortestPath: () => void
}

// Returns a human-readable step counter; shows "Ready / N" before playback begins.
function formatStepDisplay(sessionActive: boolean, stepIndex: number, stepTotal: number): string {
  if (!sessionActive || stepTotal === 0) return '—'
  if (stepIndex >= 0) return `${stepIndex + 1} / ${stepTotal}`
  return `Ready / ${stepTotal}`
}

// Configuration (BFS/DFS, start/goal inputs), playback controls, and output for shortest path.
export const ShortestPathPanel = ({
  isTraversalRunning,
  isShortestPathSessionActive,
  algorithmTraversal,
  onAlgorithmTraversalChange,
  algorithmPickerFrozen,
  canRunShortestPath,
  shortestPathStatusText,
  shortestPathStartNodeLabel,
  shortestPathGoalNodeLabel,
  onShortestPathStartNodeLabelChange,
  onShortestPathGoalNodeLabelChange,
  isShortestPathPlaybackPlaying,
  shortestPathPlaybackSpeed,
  onShortestPathPlaybackSpeedChange,
  onPlayShortestPath,
  onPauseShortestPath,
  onNextShortestPathStep,
  onPreviousShortestPathStep,
  canShortestPathStepForward,
  canShortestPathStepBackward,
  canShortestPathTogglePlay,
  isShortestPathPlaybackComplete,
  shortestPathOutput,
  shortestPathStepIndex,
  shortestPathStepTotal,
  onRunShortestPath,
  onStopShortestPath,
}: ShortestPathPanelProps) => {
  // Starts a new run or stops the active one; no-ops while traversal is running.
  const toggleRun = () => {
    if (isTraversalRunning) return
    if (isShortestPathSessionActive) {
      onStopShortestPath()
      return
    }
    onRunShortestPath(algorithmTraversal)
  }

  const stepDisplay = formatStepDisplay(
    isShortestPathSessionActive,
    shortestPathStepIndex,
    shortestPathStepTotal,
  )

  const pathFound = shortestPathOutput === null ? '—' : shortestPathOutput.pathFound ? 'Yes' : 'No'
  const pathLength = shortestPathOutput !== null && shortestPathOutput.pathFound ? String(shortestPathOutput.pathLength) : '—'
  const pathSequence =
    shortestPathOutput !== null && shortestPathOutput.pathFound && shortestPathOutput.pathNodeLabels.length > 0
      ? shortestPathOutput.pathNodeLabels.join(' → ')
      : null

  return (
    <>
      <div className="sidebar-section algorithm-config-section">
        <h3>Configuration</h3>
        <div className="algorithm-config-content">
          <div className="pill-group algorithm-traversal-buttons">
            <button
              className={`btn btn-pill ${algorithmTraversal === 'bfs' ? 'btn-active' : ''}`}
              type="button"
              disabled={algorithmPickerFrozen}
              onClick={() => onAlgorithmTraversalChange('bfs')}
            >
              BFS
            </button>
            <button
              className={`btn btn-pill ${algorithmTraversal === 'dfs' ? 'btn-active' : ''}`}
              type="button"
              disabled={algorithmPickerFrozen}
              onClick={() => onAlgorithmTraversalChange('dfs')}
            >
              DFS
            </button>
          </div>
          <div className="algorithm-inputs-section">
            <label className="field">
              <span>
                Start node <span className="required-indicator" aria-hidden="true">*</span>
              </span>
              <input
                type="text"
                value={shortestPathStartNodeLabel}
                onChange={(event) => onShortestPathStartNodeLabelChange(event.target.value)}
                onKeyDown={confirmNodeLabelFieldOnEnter}
                disabled={algorithmPickerFrozen}
              />
            </label>
            <label className="field">
              <span>
                Goal node <span className="required-indicator" aria-hidden="true">*</span>
              </span>
              <input
                type="text"
                value={shortestPathGoalNodeLabel}
                onChange={(event) => onShortestPathGoalNodeLabelChange(event.target.value)}
                onKeyDown={confirmNodeLabelFieldOnEnter}
                disabled={algorithmPickerFrozen}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Playback</h3>
        <PlaybackControls
          runLabel="Run shortest path"
          stopLabel="Stop run"
          isRunActive={isShortestPathSessionActive}
          onRunToggle={toggleRun}
          runDisabled={isTraversalRunning || (!isShortestPathSessionActive && !canRunShortestPath)}
          onPrevious={onPreviousShortestPathStep}
          onNext={onNextShortestPathStep}
          onPlayPauseToggle={isShortestPathPlaybackPlaying ? onPauseShortestPath : onPlayShortestPath}
          isPlaying={isShortestPathPlaybackPlaying}
          isPlaybackComplete={isShortestPathPlaybackComplete}
          canStepBackward={canShortestPathStepBackward}
          canStepForward={canShortestPathStepForward}
          canTogglePlay={canShortestPathTogglePlay}
          stepControlsDisabled={isTraversalRunning}
          speed={shortestPathPlaybackSpeed}
          onSpeedChange={onShortestPathPlaybackSpeedChange}
        />
        <p className="hint">{shortestPathStatusText}</p>
      </div>

      <div className="sidebar-section">
        <h3>Output</h3>
        <div className="algorithm-output">
          <div className="output-row">
            <span className="output-label">Playback step</span>
            <span className="output-value">{stepDisplay}</span>
          </div>
          <div className="output-row">
            <span className="output-label">Path found</span>
            <span className="output-value">{pathFound}</span>
          </div>
          <div className="output-row">
            <span className="output-label">Path length</span>
            <span className="output-value">{pathLength}</span>
          </div>
          {pathSequence !== null && (
            <div className="output-row output-row--stacked">
              <span className="output-label">Path</span>
              <div className="output-list">{pathSequence}</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
