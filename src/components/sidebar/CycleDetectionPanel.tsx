import type { TraversalStrategy } from '../../algorithms/algorithmstypes'

import type { CycleDetectionOutput } from './sidebarTypes'

import { PlaybackControls } from './PlaybackControls'

import { AlgorithmInfoCard } from './AlgorithmInfoCard'

import { StepExplanation } from './StepExplanation'

import { confirmNodeLabelFieldOnEnter } from './sidebarFieldHelpers'

export type CycleDetectionPanelProps = {
  isTraversalRunning: boolean
  isUndirectedMode: boolean
  isCycleDetectionSessionActive: boolean
  algorithmTraversal: TraversalStrategy
  onAlgorithmTraversalChange: (t: TraversalStrategy) => void
  algorithmPickerFrozen: boolean
  canRunCycleDetection: boolean
  cycleDetectionStatusText: string
  isCycleDetectionPlaybackPlaying: boolean
  cycleDetectionPlaybackSpeed: number
  onCycleDetectionPlaybackSpeedChange: (value: number) => void
  onPlayCycleDetection: () => void
  onPauseCycleDetection: () => void
  onNextCycleDetectionStep: () => void
  onPreviousCycleDetectionStep: () => void
  canCycleDetectionStepForward: boolean
  canCycleDetectionStepBackward: boolean
  canCycleDetectionTogglePlay: boolean
  isCycleDetectionPlaybackComplete: boolean
  cycleDetectionOutput: CycleDetectionOutput
  cycleDetectionStepIndex: number
  cycleDetectionStepTotal: number
  cycleDetectionCurrentExplanation: string
  onRunCycleDetection: (strategy: TraversalStrategy) => void
  onStopCycleDetection: () => void
  cycleDetectionStartNodeLabel: string
  onCycleDetectionStartNodeLabelChange: (value: string) => void
}

// Returns a human-readable step counter; shows "Ready / N" before playback begins.
function formatStepDisplay(stepIndex: number, stepTotal: number): string {
  if (stepTotal === 0) return '—'
  if (stepIndex >= 0) return `${stepIndex + 1} / ${stepTotal}`
  return `Ready / ${stepTotal}`
}

// Configuration, playback controls, and output for the cycle detection algorithm.
export const CycleDetectionPanel = ({
  isTraversalRunning,
  isUndirectedMode,
  isCycleDetectionSessionActive,
  algorithmTraversal,
  onAlgorithmTraversalChange,
  algorithmPickerFrozen,
  canRunCycleDetection,
  cycleDetectionStatusText,
  isCycleDetectionPlaybackPlaying,
  cycleDetectionPlaybackSpeed,
  onCycleDetectionPlaybackSpeedChange,
  onPlayCycleDetection,
  onPauseCycleDetection,
  onNextCycleDetectionStep,
  onPreviousCycleDetectionStep,
  canCycleDetectionStepForward,
  canCycleDetectionStepBackward,
  canCycleDetectionTogglePlay,
  isCycleDetectionPlaybackComplete,
  cycleDetectionOutput,
  cycleDetectionStepIndex,
  cycleDetectionStepTotal,
  cycleDetectionCurrentExplanation,
  onRunCycleDetection,
  onStopCycleDetection,
  cycleDetectionStartNodeLabel,
  onCycleDetectionStartNodeLabelChange,
}: CycleDetectionPanelProps) => {
  // Starts a new run or stops the active one; no-ops while traversal is running.
  const toggleRun = () => {
    if (isTraversalRunning) return
    if (isCycleDetectionSessionActive) {
      onStopCycleDetection()
      return
    }
    onRunCycleDetection(algorithmTraversal)
  }

  const hint = isUndirectedMode
    ? 'Cycle detection is for directed graphs only. Switch to Directed at the top left of the canvas, then press Run.'
    : cycleDetectionStatusText

  const stepDisplay = formatStepDisplay(
    cycleDetectionStepIndex,
    cycleDetectionStepTotal,
  )

  const cycleFound = cycleDetectionOutput === null ? '—' : cycleDetectionOutput.hasCycle ? 'Yes' : 'No'
  const cyclePath =
    cycleDetectionOutput !== null && cycleDetectionOutput.hasCycle && cycleDetectionOutput.cycleNodeLabels.length > 0
      ? `${cycleDetectionOutput.cycleNodeLabels.join(' → ')} → ${cycleDetectionOutput.cycleNodeLabels[0]}`
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
          {algorithmTraversal === 'dfs' && (
            <div className="algorithm-inputs-section">
              <label className="field">
                <span>
                  Start node <span className="optional-indicator">(optional)</span>
                </span>
                <input
                  type="text"
                  value={cycleDetectionStartNodeLabel}
                  onChange={(e) => onCycleDetectionStartNodeLabelChange(e.target.value)}
                  onKeyDown={confirmNodeLabelFieldOnEnter}
                  disabled={algorithmPickerFrozen}
                />
              </label>
            </div>
          )}
          <AlgorithmInfoCard infoKey={algorithmTraversal === 'bfs' ? 'cycle-bfs' : 'cycle-dfs'} />
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Playback</h3>
        <PlaybackControls
          runLabel="Run cycle detection"
          stopLabel="Stop run"
          isRunActive={isCycleDetectionSessionActive}
          onRunToggle={toggleRun}
          runDisabled={isTraversalRunning || (!isCycleDetectionSessionActive && !canRunCycleDetection)}
          onPrevious={onPreviousCycleDetectionStep}
          onNext={onNextCycleDetectionStep}
          onPlayPauseToggle={isCycleDetectionPlaybackPlaying ? onPauseCycleDetection : onPlayCycleDetection}
          isPlaying={isCycleDetectionPlaybackPlaying}
          isPlaybackComplete={isCycleDetectionPlaybackComplete}
          canStepBackward={canCycleDetectionStepBackward}
          canStepForward={canCycleDetectionStepForward}
          canTogglePlay={canCycleDetectionTogglePlay}
          stepControlsDisabled={isTraversalRunning}
          speed={cycleDetectionPlaybackSpeed}
          onSpeedChange={onCycleDetectionPlaybackSpeedChange}
        />
        <p className="hint">{hint}</p>
        <StepExplanation text={cycleDetectionCurrentExplanation} />
      </div>

      <div className="sidebar-section">
        <h3>Output</h3>
        <div className="algorithm-output">
          <div className="output-row">
            <span className="output-label">Playback step</span>
            <span className="output-value">{stepDisplay}</span>
          </div>
          <div className="output-row">
            <span className="output-label">Cycle found</span>
            <span className="output-value">{cycleFound}</span>
          </div>
          {cyclePath !== null && (
            <div className="output-row output-row--stacked">
              <span className="output-label">Cycle path</span>
              <div className="output-list">{cyclePath}</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
