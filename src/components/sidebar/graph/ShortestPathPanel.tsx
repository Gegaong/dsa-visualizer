import type { TraversalStrategy } from '../../../algorithms/graph/algorithmTypes'

import type { SPPhase, ShortestPathOutput } from '../sidebarTypes'

import { PlaybackControls } from '../PlaybackControls'

import { AlgorithmInfoCard } from '../AlgorithmInfoCard'

import { PseudocodePanel } from '../PseudocodePanel'

import { confirmNodeLabelFieldOnEnter, NODE_LABEL_FIELD_ATTRS } from '../sidebarFieldHelpers'

// ─── Code pseudocode strings ─────────────────────────────────────────────────

const BFS_CODE = `function ShortestPathBFS(graph, start, goal):
    parent ← {start: null}
    queue ← [start]
    while queue ≠ empty:
        u ← queue.dequeue()
        if u = goal:
            return reconstructPath(parent)
        for each neighbor nb of u in graph:
            if nb ∉ parent:
                parent[nb] ← u; queue.enqueue(nb)
    return no path`

const DFS_CODE = `function ShortestPathDFS(graph, start, goal):
    bestPath ← null; inPath ← [start]
    dfs(start, inPath, graph)
    return bestPath

function dfs(u, inPath, graph):
    if u = goal:
        if bestPath = null or |inPath| < |bestPath|: bestPath ← copy(inPath)
        return
    for each neighbor nb of u in graph:
        if nb ∉ inPath and (bestPath = null or |inPath|+1 < |bestPath|):
            inPath.add(nb)
            dfs(nb, inPath, graph)
            inPath.remove(nb)`

// ─── Logic pseudocode strings ─────────────────────────────────────────────────

const BFS_LOGIC = `BFS explores nodes layer by layer,
visiting all distance-k nodes before
any distance-(k+1) node.
──────────────────────────────────────────
Each step:
  · Dequeue the front node.
  · If it's the goal — reconstruct path.
  · Enqueue unseen neighbors,
      recording each one's parent.
First dequeue of goal = shortest path.
──────────────────────────────────────────
Queue empty → no path exists.`

const DFS_LOGIC = `DFS explores every acyclic path via
backtracking, keeping the shortest found.
Pruning skips branches that can't improve.
──────────────────────────────────────────
Each recursive step:
  · If at goal, update bestPath if shorter.
  · Otherwise try each unvisited neighbor
      that could still improve bestPath.
  · Backtrack: remove nb from inPath.
Pruning: skip if |inPath|+1 ≥ |bestPath|.
──────────────────────────────────────────
All paths explored → return bestPath.`

// ─── Highlight maps ───────────────────────────────────────────────────────────

// BFS code: 11 lines (0–10)
const BFS_CODE_HIGHLIGHTS: Record<SPPhase, number[]> = {
  ready:        [0, 1, 2],
  'step-explore': [3, 4, 7, 8, 9],
  'step-goal':    [3, 4, 5, 6],
  'done-found':   [6],
  'done-empty':   [10],
}

// BFS logic: 12 lines (0–11)
const BFS_LOGIC_HIGHLIGHTS: Record<SPPhase, number[]> = {
  ready:        [0, 1, 2],
  'step-explore': [4, 5, 7, 8],
  'step-goal':    [4, 5, 6, 9],
  'done-found':   [9],
  'done-empty':   [11],
}

// DFS code: 14 lines (0–13). Outer function lines 0–3 + blank 4 + inner function lines 5–13.
const DFS_CODE_HIGHLIGHTS: Record<SPPhase, number[]> = {
  ready:        [0, 1],
  'step-explore': [9, 10, 11, 12, 13],
  'step-goal':    [6, 7, 8],
  'done-found':   [3],
  'done-empty':   [3],
}

// DFS logic: 12 lines (0–11)
const DFS_LOGIC_HIGHLIGHTS: Record<SPPhase, number[]> = {
  ready:        [0, 1, 2],
  'step-explore': [4, 6, 7, 8, 9],
  'step-goal':    [4, 5],
  'done-found':   [11],
  'done-empty':   [11],
}

function getHighlights(phase: SPPhase | null, strategy: TraversalStrategy, isLogic: boolean): Set<number> {
  if (!phase) return new Set()
  const map = isLogic
    ? (strategy === 'bfs' ? BFS_LOGIC_HIGHLIGHTS : DFS_LOGIC_HIGHLIGHTS)
    : (strategy === 'bfs' ? BFS_CODE_HIGHLIGHTS : DFS_CODE_HIGHLIGHTS)
  return new Set(map[phase])
}

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
  spCurrentPhase: SPPhase | null
  spVarsRows: string[][] | null
  pseudocodeShowLogic: boolean
  onPseudocodeFlip: () => void
  onRunShortestPath: (strategy: TraversalStrategy) => void
  onStopShortestPath: () => void
}

function formatStepDisplay(stepIndex: number, stepTotal: number): string {
  if (stepTotal === 0) return '—'
  if (stepIndex >= 0) return `${stepIndex + 1} / ${stepTotal}`
  return `Ready / ${stepTotal}`
}

// Configuration (BFS/DFS, start/goal inputs), playback controls, pseudocode, and output for shortest path.
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
  spCurrentPhase,
  spVarsRows,
  pseudocodeShowLogic,
  onPseudocodeFlip,
  onRunShortestPath,
  onStopShortestPath,
}: ShortestPathPanelProps) => {
  const toggleRun = () => {
    if (isTraversalRunning) return
    if (isShortestPathSessionActive) {
      onStopShortestPath()
      return
    }
    onRunShortestPath(algorithmTraversal)
  }

  const stepDisplay = formatStepDisplay(shortestPathStepIndex, shortestPathStepTotal)
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
                {...NODE_LABEL_FIELD_ATTRS}
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
                {...NODE_LABEL_FIELD_ATTRS}
                value={shortestPathGoalNodeLabel}
                onChange={(event) => onShortestPathGoalNodeLabelChange(event.target.value)}
                onKeyDown={confirmNodeLabelFieldOnEnter}
                disabled={algorithmPickerFrozen}
              />
            </label>
          </div>
          <AlgorithmInfoCard infoKey={algorithmTraversal === 'bfs' ? 'sp-bfs' : 'sp-dfs'} />
        </div>
      </div>

      <div className="sidebar-section sidebar-section--sp-playback">
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

      <PseudocodePanel
        codeText={algorithmTraversal === 'bfs' ? BFS_CODE : DFS_CODE}
        logicText={algorithmTraversal === 'bfs' ? BFS_LOGIC : DFS_LOGIC}
        codeHighlighted={getHighlights(spCurrentPhase, algorithmTraversal, false)}
        logicHighlighted={getHighlights(spCurrentPhase, algorithmTraversal, true)}
        varsRows={spVarsRows}
        showLogic={pseudocodeShowLogic}
        onFlip={onPseudocodeFlip}
        canDetach={!isShortestPathPlaybackPlaying}
      />

      <div className="sidebar-section">
        <h3>Output</h3>
        <div className="algorithm-output">
          <div className="output-row">
            <span className="output-label">Playback step</span>
            <span className="output-value">{stepDisplay}</span>
          </div>
          <div className="output-row">
            <span className="output-label">Operations</span>
            <span className="output-value">{shortestPathOutput !== null ? shortestPathOutput.operationCount : '—'}</span>
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
