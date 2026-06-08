import { useEffect, useRef, useState } from 'react'

import type { WeightedAlgorithm } from '../../algorithms/algorithmstypes'

import type { AlgorithmInfoKey } from '../../algorithms/algorithmInfo'

import type { WPOutput, WPPhase } from './sidebarTypes'

import { PlaybackControls } from './PlaybackControls'

import { AlgorithmInfoCard } from './AlgorithmInfoCard'

import { PseudocodePanel } from './PseudocodePanel'

import { StepExplanation } from './StepExplanation'

import { confirmNodeLabelFieldOnEnter } from './sidebarFieldHelpers'

const WP_INFO_KEY: Record<WeightedAlgorithm, AlgorithmInfoKey> = {
  bfs: 'wp-bfs',
  dfs: 'wp-dfs',
  dijkstra: 'wp-dijkstra',
  astar: 'wp-astar',
  greedy: 'wp-greedy',
}

// ─── Code pseudocode ─────────────────────────────────────────────────────────

const BFS_CODE = `WeightedBFS(graph, start, goal):
    cost[start] ← 0; queue ← [(path=[start], c=0)]; bestCost ← ∞; bestPath ← []
    while queue ≠ empty:
        (path, c) ← queue.dequeue(); u ← path.last
        if c > cost[u] or c ≥ bestCost: continue
        if u = goal: bestCost ← c; bestPath ← path; continue
        for each neighbor nb of u in graph:
            newCost ← c + w(u, nb)
            if nb ∉ path and newCost < cost[nb] and newCost < bestCost:
                cost[nb] ← newCost; queue.enqueue((path+[nb], newCost))
    return bestPath if bestPath ≠ [] else no path`

// ─── Logic pseudocode ─────────────────────────────────────────────────────────

const BFS_LOGIC = `BFS explores paths in FIFO order —
oldest entry is dequeued first.
──────────────────────────────────────────
Each step:
  · Dequeue the oldest path and look at
    its last node. Skip if a cheaper path
    to it already exists, or if this path
    can't beat the best goal found so far.
  · If the node is the goal: record it as
    the best path found; keep searching —
    a cheaper route may still be queued.
  · For each unvisited neighbor: if this
    path reaches it cheaper than before,
    color the neighbor yellow and add the
    extended path to the back of the queue.
  · Any node that can no longer be reached
    cheaper by anything still in the queue
    turns green — its cost is confirmed.
──────────────────────────────────────────
Queue empty → color the best path green.`

// ─── DFS pseudocode ───────────────────────────────────────────────────────────

const DFS_CODE = `WeightedDFS(graph, start, goal):
    cost[start] ← 0; stack ← [(path=[start], c=0)]; bestCost ← ∞; bestPath ← []
    while stack ≠ empty:
        (path, c) ← stack.pop(); u ← path.last
        if c > cost[u] or c ≥ bestCost: continue
        if u = goal: bestCost ← c; bestPath ← path; continue
        for each neighbor nb of u in graph:
            newCost ← c + w(u, nb)
            if nb ∉ path and newCost < cost[nb] and newCost < bestCost:
                cost[nb] ← newCost; stack.push((path+[nb], newCost))
    return bestPath if bestPath ≠ [] else no path`

const DFS_LOGIC = `DFS explores paths in LIFO order —
most recent entry is popped first.
──────────────────────────────────────────
Each step:
  · Pop the most recent path and look at
    its last node. Skip if a cheaper path
    to it already exists, or if this path
    can't beat the best goal found so far.
  · If the node is the goal: record it as
    the best path found; keep searching —
    a cheaper route may still be in stack.
  · For each unvisited neighbor: if this
    path reaches it cheaper than before,
    color the neighbor yellow and push the
    extended path onto the stack.
  · Any node that can no longer be reached
    cheaper by anything still in the stack
    turns green — its cost is confirmed.
──────────────────────────────────────────
Stack empty → color the best path green.`

// ─── Highlight maps ───────────────────────────────────────────────────────────
// BFS and DFS share identical line structure (11 code lines, 20 logic lines),
// so one set of maps covers both.

// code: 11 lines (0–10)
const WP_CODE_HIGHLIGHTS: Record<WPPhase, number[]> = {
  'ready':         [0, 1],
  'step-start':    [0, 1],
  'step-discover': [2, 3, 6, 7, 8, 9],
  'step-settle':   [2, 3, 4],
  'done-found':    [10],
  'done-empty':    [10],
}

// logic: 20 lines (0–19)
const WP_LOGIC_HIGHLIGHTS: Record<WPPhase, number[]> = {
  'ready':         [0, 1, 2],
  'step-start':    [0, 1, 2],
  'step-discover': [3, 4, 5, 6, 7, 11, 12, 13, 14],
  'step-settle':   [3, 15, 16, 17],
  'done-found':    [18, 19],
  'done-empty':    [18, 19],
}

function getWPHighlights(phase: WPPhase | null, isLogic: boolean): Set<number> {
  if (!phase) return new Set()
  const map = isLogic ? WP_LOGIC_HIGHLIGHTS : WP_CODE_HIGHLIGHTS
  return new Set(map[phase])
}

// ─── Props & component ────────────────────────────────────────────────────────

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
  onRunWP: (algorithm: WeightedAlgorithm) => void
  onStopWP: () => void
  wpQueueSize: number | null
  wpNodesSettled: number
  wpCurrentExplanation: string
  wpCurrentPhase: WPPhase | null
  wpVarsRows: string[][] | null
  pseudocodeShowLogic: boolean
  onPseudocodeFlip: () => void
}

function formatStepDisplay(stepIndex: number, stepTotal: number): string {
  if (stepTotal === 0) return '—'
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
  onRunWP,
  onStopWP,
  wpQueueSize,
  wpNodesSettled,
  wpCurrentExplanation,
  wpCurrentPhase,
  wpVarsRows,
  pseudocodeShowLogic,
  onPseudocodeFlip,
}: WeightedPathfindingPanelProps) => {
  const [algorithm, setAlgorithm] = useState<WeightedAlgorithm>('bfs')
  const [showNodeHelp, setShowNodeHelp] = useState(false)
  const nodeHelpBtnRef = useRef<HTMLButtonElement>(null)
  const nodeHelpPopupRef = useRef<HTMLDivElement>(null)

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

  const toggleRun = () => {
    if (isWPSessionActive) {
      onStopWP()
      return
    }
    onRunWP(algorithm)
  }

  const frozen = isWPSessionActive
  const showPseudocode = isWPSessionActive && (algorithm === 'bfs' || algorithm === 'dfs')

  const stepDisplay = formatStepDisplay(wpStepIndex, wpStepTotal)
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
          <AlgorithmInfoCard infoKey={WP_INFO_KEY[algorithm]} />
        </div>
      </div>

      <div className="sidebar-section sidebar-section--wp-playback">
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
        <p className="hint">{wpStatusText}</p>
      </div>

      {showPseudocode ? (
        <PseudocodePanel
          codeText={algorithm === 'dfs' ? DFS_CODE : BFS_CODE}
          logicText={algorithm === 'dfs' ? DFS_LOGIC : BFS_LOGIC}
          codeHighlighted={getWPHighlights(wpCurrentPhase, false)}
          logicHighlighted={getWPHighlights(wpCurrentPhase, true)}
          varsRows={wpVarsRows}
          showLogic={pseudocodeShowLogic}
          onFlip={onPseudocodeFlip}
        />
      ) : (
        <StepExplanation text={wpCurrentExplanation} />
      )}

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
            <span className="output-label">Operations</span>
            <span className="output-value">{wpOutput !== null ? wpOutput.operationCount : '—'}</span>
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
