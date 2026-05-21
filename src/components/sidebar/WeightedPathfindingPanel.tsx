import { useState } from 'react'

import type { TraversalStrategy } from '../../algorithms/algorithmstypes'

import type { WPOutput } from './sidebarTypes'

import { PlaybackControls } from './PlaybackControls'

import { confirmNodeLabelFieldOnEnter } from './sidebarFieldHelpers'

export type WeightedPathfindingPanelProps = {
  isWPSessionActive: boolean
  canRunWP: boolean
  wpStatusText: string
  wpStartNodeLabel: string
  wpGoalNodeLabel: string
  onWPStartNodeLabelChange: (value: string) => void
  onWPGoalNodeLabelChange: (value: string) => void
  isWPPlaybackPlaying: boolean
  wpPlaybackSpeed: number
  onWPPlaybackSpeedChange: (value: number) => void
  onPlayWP: () => void
  onPauseWP: () => void
  onNextWPStep: () => void
  onPreviousWPStep: () => void
  canWPStepForward: boolean
  canWPStepBackward: boolean
  canWPTogglePlay: boolean
  isWPPlaybackComplete: boolean
  wpOutput: WPOutput
  wpStepIndex: number
  wpStepTotal: number
  isDetailedMode: boolean
  onToggleDetailedMode: () => void
  onRunWP: (strategy: TraversalStrategy) => void
  onStopWP: () => void
}

function formatStepDisplay(sessionActive: boolean, stepIndex: number, stepTotal: number): string {
  if (!sessionActive || stepTotal === 0) return '—'
  if (stepIndex >= 0) return `${stepIndex + 1} / ${stepTotal}`
  return `Ready / ${stepTotal}`
}

// BFS/DFS strategy picker, start/goal inputs, playback controls, and output for weighted pathfinding.
export const WeightedPathfindingPanel = ({
  isWPSessionActive,
  canRunWP,
  wpStatusText,
  wpStartNodeLabel,
  wpGoalNodeLabel,
  onWPStartNodeLabelChange,
  onWPGoalNodeLabelChange,
  isWPPlaybackPlaying,
  wpPlaybackSpeed,
  onWPPlaybackSpeedChange,
  onPlayWP,
  onPauseWP,
  onNextWPStep,
  onPreviousWPStep,
  canWPStepForward,
  canWPStepBackward,
  canWPTogglePlay,
  isWPPlaybackComplete,
  wpOutput,
  wpStepIndex,
  wpStepTotal,
  isDetailedMode,
  onToggleDetailedMode,
  onRunWP,
  onStopWP,
}: WeightedPathfindingPanelProps) => {
  const [strategy, setStrategy] = useState<TraversalStrategy>('bfs')

  const toggleRun = () => {
    if (isWPSessionActive) {
      onStopWP()
      return
    }
    onRunWP(strategy)
  }

  const frozen = isWPSessionActive

  const stepDisplay = formatStepDisplay(isWPSessionActive, wpStepIndex, wpStepTotal)
  const pathFound = wpOutput === null ? '—' : wpOutput.pathFound ? 'Yes' : 'No'
  const pathCost = wpOutput !== null && wpOutput.pathFound && wpOutput.pathCost !== null
    ? String(wpOutput.pathCost)
    : '—'
  const pathSequence =
    wpOutput !== null && wpOutput.pathFound && wpOutput.pathNodeLabels.length > 0
      ? wpOutput.pathNodeLabels.join(' → ')
      : null

  return (
    <div className="sidebar-page-body sidebar-page-body--pathfinder">
      <div className="sidebar-section algorithm-config-section">
        <h3>Algorithm</h3>
        <div className="algorithm-config-content">
          <div className="pill-group algorithm-traversal-buttons">
            <button
              className={`btn btn-pill ${strategy === 'bfs' ? 'btn-active' : ''}`}
              type="button"
              disabled={frozen}
              onClick={() => setStrategy('bfs')}
            >
              BFS
            </button>
            <button
              className={`btn btn-pill ${strategy === 'dfs' ? 'btn-active' : ''}`}
              type="button"
              disabled={frozen}
              onClick={() => setStrategy('dfs')}
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
                value={wpStartNodeLabel}
                onChange={(event) => onWPStartNodeLabelChange(event.target.value)}
                onKeyDown={confirmNodeLabelFieldOnEnter}
                disabled={frozen}
              />
            </label>
            <label className="field">
              <span>
                Goal node <span className="required-indicator" aria-hidden="true">*</span>
              </span>
              <input
                type="text"
                value={wpGoalNodeLabel}
                onChange={(event) => onWPGoalNodeLabelChange(event.target.value)}
                onKeyDown={confirmNodeLabelFieldOnEnter}
                disabled={frozen}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Playback</h3>
        <PlaybackControls
          runLabel="Run pathfinder"
          stopLabel="Stop run"
          isRunActive={isWPSessionActive}
          onRunToggle={toggleRun}
          runDisabled={!isWPSessionActive && !canRunWP}
          onPrevious={onPreviousWPStep}
          onNext={onNextWPStep}
          onPlayPauseToggle={isWPPlaybackPlaying ? onPauseWP : onPlayWP}
          isPlaying={isWPPlaybackPlaying}
          isPlaybackComplete={isWPPlaybackComplete}
          canStepBackward={canWPStepBackward}
          canStepForward={canWPStepForward}
          canTogglePlay={canWPTogglePlay}
          speed={wpPlaybackSpeed}
          onSpeedChange={onWPPlaybackSpeedChange}
        />
        <div className="detail-mode-row">
          <label className="detail-mode-label">
            <input
              type="checkbox"
              checked={isDetailedMode}
              onChange={onToggleDetailedMode}
              disabled={frozen}
            />
            Show confirmation steps
          </label>
        </div>
        <p className="hint">{wpStatusText}</p>
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
            <span className="output-label">Path cost</span>
            <span className="output-value">{pathCost}</span>
          </div>
          {pathSequence !== null && (
            <div className="output-row output-row--stacked">
              <span className="output-label">Path</span>
              <div className="output-list">{pathSequence}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
