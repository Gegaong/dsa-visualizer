import { useEffect, useRef, useState } from 'react'

import type { WeightedAlgorithm } from '../../algorithms/algorithmstypes'

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
  onRunWP: (algorithm: WeightedAlgorithm) => void
  onStopWP: () => void
  wpQueueSize: number | null
  wpNodesSettled: number
}

function formatStepDisplay(sessionActive: boolean, stepIndex: number, stepTotal: number): string {
  if (!sessionActive || stepTotal === 0) return '—'
  if (stepIndex >= 0) return `${stepIndex + 1} / ${stepTotal}`
  return `Ready / ${stepTotal}`
}

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
  wpQueueSize,
  wpNodesSettled,
}: WeightedPathfindingPanelProps) => {
  const [algorithm, setAlgorithm] = useState<WeightedAlgorithm>('bfs')
  const [showHelp, setShowHelp] = useState(false)
  const helpBtnRef = useRef<HTMLButtonElement>(null)
  const helpPopupRef = useRef<HTMLDivElement>(null)
  const [showNodeHelp, setShowNodeHelp] = useState(false)
  const nodeHelpBtnRef = useRef<HTMLButtonElement>(null)
  const nodeHelpPopupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showHelp) return
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node
      const inBtn = helpBtnRef.current?.contains(target) ?? false
      const inPopup = helpPopupRef.current?.contains(target) ?? false
      if (!inBtn && !inPopup) setShowHelp(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showHelp])

  useEffect(() => {
    if (!showNodeHelp) return
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node
      const inBtn = nodeHelpBtnRef.current?.contains(target) ?? false
      const inPopup = nodeHelpPopupRef.current?.contains(target) ?? false
      if (!inBtn && !inPopup) setShowNodeHelp(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showNodeHelp])

  const toggleHelp = () => setShowHelp((v) => !v)

  const toggleRun = () => {
    if (isWPSessionActive) {
      onStopWP()
      return
    }
    onRunWP(algorithm)
  }

  const frozen = isWPSessionActive
  const showDetailedMode = algorithm === 'bfs' || algorithm === 'dfs'

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
        <div className="detail-mode-row">
          <h3>Pathfinder</h3>
          <button
            ref={nodeHelpBtnRef}
            type="button"
            className="detail-mode-help-btn"
            onClick={() => setShowNodeHelp((v) => !v)}
            aria-label="Node color legend"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.5 9a2.5 2.5 0 0 1 4.9 0.7c0 1.7-2.4 1.7-2.4 3.3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          {showNodeHelp && (
            <div ref={nodeHelpPopupRef} className="detail-mode-help-popup detail-mode-help-popup--below" role="tooltip">
              <p className="detail-mode-help-popup-title">Node colors — during a run</p>
              <div className="wp-legend">
                <div className="wp-legend-item">
                  <span className="wp-legend-dot" style={{ background: 'rgba(229,57,53,0.2)', borderColor: '#e53935' }} />
                  <span>Not yet reached</span>
                </div>
                <div className="wp-legend-item">
                  <span className="wp-legend-dot" style={{ background: 'rgba(253,216,53,0.28)', borderColor: '#fdd835' }} />
                  <span>In queue — best cost so far (may still decrease)</span>
                </div>
                <div className="wp-legend-item">
                  <span className="wp-legend-dot" style={{ background: 'rgba(160,207,70,0.22)', borderColor: '#a0cf46' }} />
                  <span>In queue — assumed via heuristic (A* / Greedy)</span>
                </div>
                <div className="wp-legend-item">
                  <span className="wp-legend-dot" style={{ background: 'rgba(67,160,71,0.24)', borderColor: '#43a047' }} />
                  <span>Settled — cost is final</span>
                </div>
                <div className="wp-legend-item">
                  <span className="wp-legend-dot" style={{ background: 'rgba(67,160,71,0.24)', borderColor: '#43a047', transform: 'scale(1.3)' }} />
                  <span>On the final path (enlarged on canvas)</span>
                </div>
                <div className="wp-legend-item">
                  <span className="wp-legend-dot" style={{ background: 'rgba(160,207,70,0.22)', borderColor: '#a0cf46', transform: 'scale(1.3)' }} />
                  <span>Greedy path — not guaranteed optimal</span>
                </div>
                <div className="wp-legend-item">
                  <span className="wp-legend-dot" style={{ background: 'transparent', borderColor: '#2f7d32', borderWidth: 2 }} />
                  <span>Start node</span>
                </div>
                <div className="wp-legend-item">
                  <span className="wp-legend-dot" style={{ background: 'rgba(42,79,156,0.22)', borderColor: '#2a4f9c' }} />
                  <span>Goal node</span>
                </div>
              </div>
              <p className="detail-mode-help-popup-title" style={{ marginTop: 10 }}>? in the cost label</p>
              <p>The cost shown is not yet locked in — a cheaper path to this node may still be found.</p>
            </div>
          )}
        </div>
        <div className="algorithm-config-content">
          <label className="field">
            <span>Method</span>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as WeightedAlgorithm)}
              disabled={frozen}
            >
              <option value="bfs">BFS (Breadth-First)</option>
              <option value="dfs">DFS (Depth-First)</option>
              <option value="dijkstra">Dijkstra</option>
              <option value="astar">A* (Euclidean)</option>
              <option value="greedy">Greedy Best-First (Euclidean)</option>
            </select>
          </label>
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
        {showDetailedMode && (
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
            <button
              ref={helpBtnRef}
              type="button"
              className="detail-mode-help-btn"
              onClick={toggleHelp}
              aria-label="What are confirmation steps?"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.5 9a2.5 2.5 0 0 1 4.9 0.7c0 1.7-2.4 1.7-2.4 3.3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>
            {showHelp && (
              <div
                ref={helpPopupRef}
                className="detail-mode-help-popup"
                role="tooltip"
              >
                <p className="detail-mode-help-popup-title">Confirmation steps</p>
                <p>
                  A node turns green once its cost is locked in — no remaining path can reach
                  it more cheaply.
                </p>
                <p>
                  <strong>How we detect this:</strong> after each expansion, we check the
                  cheapest cost left in the queue. Any node whose best cost is ≤ that minimum
                  is confirmed.
                </p>
                <p>
                  <strong>Off:</strong> confirmations happen silently during discovery.
                </p>
                <p>
                  <strong>On:</strong> each confirmation gets its own step explaining why the
                  cost is final.
                </p>
              </div>
            )}
          </div>
        )}
        <p className="hint">{wpStatusText}</p>
      </div>

      <div className="sidebar-section">
        <h3>Output</h3>
        <div className="algorithm-output">
          <div className="output-row">
            <span className="output-label">Playback step</span>
            <span className="output-value">{stepDisplay}</span>
          </div>
          {isWPSessionActive && (
            <div className="output-row">
              <span className="output-label">Nodes settled</span>
              <span className="output-value">{wpNodesSettled}</span>
            </div>
          )}
          {wpQueueSize !== null && (
            <div className="output-row">
              <span className="output-label">Queue size</span>
              <span className="output-value">{wpQueueSize}</span>
            </div>
          )}
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
