import { useEffect, useRef, useState } from 'react'

import type { WeightedAlgorithm } from '../../algorithms/algorithmstypes'

import type { AlgorithmInfoKey } from '../../algorithms/algorithmInfo'

import type { WPOutput, WPPhase } from './sidebarTypes'

import { PlaybackControls } from './PlaybackControls'

import { AlgorithmInfoCard } from './AlgorithmInfoCard'

import { PseudocodePanel } from './PseudocodePanel'

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

// ─── Dijkstra pseudocode ──────────────────────────────────────────────────────

const DIJKSTRA_CODE = `Dijkstra(graph, start, goal):
    dist[v] ← ∞ for all v; dist[start] ← 0; pq ← [(0, start)]; prev ← {}
    while pq ≠ empty:
        (d, u) ← pq.popMin(); if u already settled: continue
        settle u; if u = goal: return reconstruct(prev, start, goal)
        for each neighbor nb of u in graph:
            newDist ← dist[u] + w(u, nb)
            if newDist < dist[nb]:
                dist[nb] ← newDist; prev[nb] ← u; pq.push((newDist, nb))
    return no path`

const DIJKSTRA_LOGIC = `Dijkstra always expands the globally
cheapest known node first, guaranteeing
the shortest path for non-negative weights.
──────────────────────────────────────────
Each step:
  · Pop the cheapest node u from the pq.
    If u is already settled, skip it —
    a stale entry reached u at higher cost.
  · Settle u (turn green): dist[u] confirmed.
    If u = goal, return path via prev.
  · For each neighbor nb: if dist[u]+w(u,nb)
    beats dist[nb], update dist[nb] and push
    (newDist, nb) onto the pq — nb yellow.
  · Nodes already settled are never
    re-expanded — any remaining pq entries
    for a settled node are skipped when
    they are eventually popped.
──────────────────────────────────────────
pq empty → no path from start to goal.`

// ─── A* pseudocode ────────────────────────────────────────────────────────────

const ASTAR_CODE = `AStar(graph, start, goal):
    g[v] ← ∞ for all v; g[start] ← 0; pq ← [(h(start), start)]; prev ← {}
    while pq ≠ empty:
        (f, u) ← pq.popMin(); if u already settled: continue
        settle u; if u = goal: return reconstruct(prev, start, goal)
        for each neighbor nb of u in graph:
            newG ← g[u] + w(u, nb)
            if newG < g[nb]:
                g[nb] ← newG; prev[nb] ← u; pq.push((newG + h(nb), nb))
    return no path`

const ASTAR_LOGIC = `A* expands nodes by f(n) = g(n) + h(n):
actual cost so far plus a heuristic
estimate of the remaining distance.
──────────────────────────────────────────
Each step:
  · Pop the node u with the lowest f value.
    If u is already settled, skip it —
    a stale entry reached u at higher g.
  · Settle u (turn green): g[u] confirmed.
    If u = goal, return the path via prev.
  · For each neighbor nb: if g[u]+w(u,nb)
    beats g[nb], update g[nb], prev[nb] ← u,
    and push (g[nb]+h(nb), nb) — nb yellow.
  · The heuristic h biases expansion toward
    the goal: nodes with lower estimated
    remaining cost get priority, focusing
    the search directionally.
──────────────────────────────────────────
pq empty → no path from start to goal.`

// ─── Greedy pseudocode ────────────────────────────────────────────────────────

const GREEDY_CODE = `Greedy(graph, start, goal):
    pq ← [(h(start), start)]; prev ← {start: null}; visited ← {}
    while pq ≠ empty:
        (_, u) ← pq.popMin(); if u ∈ visited: continue
        visited ← visited ∪ {u}; if u = goal: return reconstruct(prev, start, goal)
        for each neighbor nb of u in graph:
            if nb ∉ prev:
                prev[nb] ← u; pq.push((h(nb), nb))
    return no path`

const GREEDY_LOGIC = `Greedy always expands the node estimated
closest to the goal — path cost is never
considered, only heuristic distance.
──────────────────────────────────────────
Each step:
  · Pop the node u with the lowest h(u).
    If u is already visited, skip it —
    we reached it via a different path.
  · Mark u visited (turn green).
    If u = goal, return the path via prev.
  · For each neighbor nb not seen yet:
    record prev[nb] ← u and push (h(nb),
    nb) onto the pq — nb turns yellow.
  · No cost tracking — only h drives order.
    Greedy can be fast but gives no
    guarantee of optimality; the found
    path depends on the heuristic's shape.
──────────────────────────────────────────
pq empty → no path from start to goal.`

// ─── Highlight maps ───────────────────────────────────────────────────────────
// BFS and DFS share identical line structure (11 code lines, 20 logic lines).
// Dijkstra and A* share identical code line structure (10 lines).
// All three priority algorithms share one logic highlight map (19 lines).

// BFS/DFS code: 11 lines (0–10)
const WP_CODE_HIGHLIGHTS: Record<WPPhase, number[]> = {
  'ready':         [0, 1],
  'step-start':    [0, 1],
  'step-discover': [2, 3, 6, 7, 8, 9],
  'step-settle':   [2, 3, 4],
  'done-found':    [10],
  'done-empty':    [10],
}

// BFS/DFS logic: 20 lines (0–19)
const WP_LOGIC_HIGHLIGHTS: Record<WPPhase, number[]> = {
  'ready':         [0, 1],
  'step-start':    [0, 1],
  'step-discover': [3, 4, 5, 6, 7, 11, 12, 13, 14],
  'step-settle':   [3, 15, 16, 17],
  'done-found':    [18, 19],
  'done-empty':    [18, 19],
}

// Dijkstra + A* code: 10 lines (0–9); identical structure
const PRIORITY_CODE_HIGHLIGHTS: Record<WPPhase, number[]> = {
  'ready':         [0, 1],
  'step-start':    [0, 1],
  'step-settle':   [2, 3, 4],
  'step-discover': [5, 6, 7, 8],
  'done-found':    [4],
  'done-empty':    [9],
}

// Greedy code: 9 lines (0–8)
const GREEDY_CODE_HIGHLIGHTS: Record<WPPhase, number[]> = {
  'ready':         [0, 1],
  'step-start':    [0, 1],
  'step-settle':   [2, 3, 4],
  'step-discover': [5, 6, 7],
  'done-found':    [4],
  'done-empty':    [8],
}

// Dijkstra / A* / Greedy logic: 19 lines (0–18); identical phase positions
const PRIORITY_LOGIC_HIGHLIGHTS: Record<WPPhase, number[]> = {
  'ready':         [0, 1, 2],
  'step-start':    [0, 1, 2],
  'step-settle':   [8, 9],
  'step-discover': [10, 11, 12],
  // Goal reached → the "settle u / if u = goal, return path" lines (parallels code line 4).
  'done-found':    [8, 9],
  'done-empty':    [17, 18],
}

function getWPHighlights(phase: WPPhase | null, isLogic: boolean, algorithm: WeightedAlgorithm): Set<number> {
  if (!phase) return new Set()
  if (algorithm === 'bfs' || algorithm === 'dfs') {
    return new Set((isLogic ? WP_LOGIC_HIGHLIGHTS : WP_CODE_HIGHLIGHTS)[phase])
  }
  if (isLogic) return new Set(PRIORITY_LOGIC_HIGHLIGHTS[phase])
  if (algorithm === 'greedy') return new Set(GREEDY_CODE_HIGHLIGHTS[phase])
  return new Set(PRIORITY_CODE_HIGHLIGHTS[phase])
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

      {isWPSessionActive && (
        <PseudocodePanel
          codeText={
            algorithm === 'dfs' ? DFS_CODE
            : algorithm === 'dijkstra' ? DIJKSTRA_CODE
            : algorithm === 'astar' ? ASTAR_CODE
            : algorithm === 'greedy' ? GREEDY_CODE
            : BFS_CODE
          }
          logicText={
            algorithm === 'dfs' ? DFS_LOGIC
            : algorithm === 'dijkstra' ? DIJKSTRA_LOGIC
            : algorithm === 'astar' ? ASTAR_LOGIC
            : algorithm === 'greedy' ? GREEDY_LOGIC
            : BFS_LOGIC
          }
          codeHighlighted={getWPHighlights(wpCurrentPhase, false, algorithm)}
          logicHighlighted={getWPHighlights(wpCurrentPhase, true, algorithm)}
          varsRows={wpVarsRows}
          showLogic={pseudocodeShowLogic}
          onFlip={onPseudocodeFlip}
        />
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
