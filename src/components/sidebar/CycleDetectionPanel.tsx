import type { TraversalStrategy } from '../../algorithms/algorithmTypes'

import type { CycleDetectionOutput, CyclePhase } from './sidebarTypes'

import { PlaybackControls } from './PlaybackControls'

import { AlgorithmInfoCard } from './AlgorithmInfoCard'

import { PseudocodePanel } from './PseudocodePanel'

import { confirmNodeLabelFieldOnEnter, NODE_LABEL_FIELD_ATTRS } from './sidebarFieldHelpers'

// ─── Code pseudocode strings ──────────────────────────────────────────────────

const BFS_CODE = `function CycleDetection(graph):
    inDegree[v] ← in-degree of v, for all v
    queue ← {v | inDegree[v] = 0}
    removed ← 0
    while queue ≠ empty:
        u ← queue.dequeue(); removed++
        for each neighbor nb of u in graph:
            inDegree[nb]--
            if inDegree[nb] = 0: queue.enqueue(nb)
    return removed < |graph|`

const DFS_CODE = `function CycleDetection(graph):
    visited ← {}; inStack ← {}
    for each node v in graph:
        if v ∉ visited:
            if dfs(v, visited, inStack, graph): return true
    return false

function dfs(u, visited, inStack, graph):
    visited.add(u); inStack.add(u)
    for each neighbor nb of u in graph:
        if nb ∈ inStack: return true
        if nb ∉ visited:
            if dfs(nb, visited, inStack, graph): return true
    inStack.remove(u); return false`

// ─── Logic pseudocode strings ─────────────────────────────────────────────────

const BFS_LOGIC = `Kahn's removes nodes with in-degree 0 one
by one, decrementing neighbor in-degrees.
──────────────────────────────────────────
Nodes stuck with in-degree > 0 when the
queue empties form a cycle — they always
depend on another stuck node to go first.
──────────────────────────────────────────
Each step:
  · Dequeue u; decrement neighbors' degrees.
  · If a neighbor hits 0: enqueue it.
If removed < |graph|: a cycle exists.`

const DFS_LOGIC = `DFS detects cycles by tracking the active
path in inStack. A back edge — one pointing
to an inStack node — proves a cycle.
──────────────────────────────────────────
Outer loop covers disconnected components.
──────────────────────────────────────────
Each step:
  · Add u to visited and inStack.
  · Neighbor in inStack → back edge → cycle.
  · Recurse into unvisited neighbors.
  · Remove u from inStack on backtrack.
──────────────────────────────────────────
All nodes explored → no cycle.`

// ─── Highlight maps ───────────────────────────────────────────────────────────

// BFS code: 10 lines (0–9)
const BFS_CODE_HIGHLIGHTS: Record<CyclePhase, number[]> = {
  ready:          [0, 1, 2, 3],
  'step-explore': [4, 5, 6, 7, 8],
  'step-cycle':   [9],
  'done-found':   [9],
  'done-empty':   [9],
}

// BFS logic: 11 lines (0–10)
const BFS_LOGIC_HIGHLIGHTS: Record<CyclePhase, number[]> = {
  ready:          [0, 1],
  'step-explore': [7, 8, 9],
  'step-cycle':   [3, 4, 5, 10],
  'done-found':   [10],
  'done-empty':   [10],
}

// DFS code: 14 lines (0–13). Outer function lines 0–5 + blank 6 + inner function lines 7–13.
// step-explore starts at line 8 (first executing body line); the dfs(...) signature on 7 is a
// declaration, not an executing statement, so it stays unhighlighted like every other function header.
const DFS_CODE_HIGHLIGHTS: Record<CyclePhase, number[]> = {
  ready:          [0, 1],
  'step-explore': [8, 9, 11, 12, 13],
  'step-cycle':   [9, 10],
  'done-found':   [4],
  'done-empty':   [5],
}

// DFS logic: 13 lines (0–12)
const DFS_LOGIC_HIGHLIGHTS: Record<CyclePhase, number[]> = {
  ready:          [0, 1, 2],
  'step-explore': [6, 7, 9, 10],
  'step-cycle':   [6, 8],
  'done-found':   [8],
  'done-empty':   [12],
}

function getHighlights(phase: CyclePhase | null, strategy: TraversalStrategy, isLogic: boolean): Set<number> {
  if (!phase) return new Set()
  const map = isLogic
    ? (strategy === 'bfs' ? BFS_LOGIC_HIGHLIGHTS : DFS_LOGIC_HIGHLIGHTS)
    : (strategy === 'bfs' ? BFS_CODE_HIGHLIGHTS : DFS_CODE_HIGHLIGHTS)
  return new Set(map[phase])
}

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
  cycleCurrentPhase: CyclePhase | null
  cycleVarsRows: string[][] | null
  pseudocodeShowLogic: boolean
  onPseudocodeFlip: () => void
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
  cycleCurrentPhase,
  cycleVarsRows,
  pseudocodeShowLogic,
  onPseudocodeFlip,
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
                  {...NODE_LABEL_FIELD_ATTRS}
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
      </div>

      <PseudocodePanel
        codeText={algorithmTraversal === 'bfs' ? BFS_CODE : DFS_CODE}
        logicText={algorithmTraversal === 'bfs' ? BFS_LOGIC : DFS_LOGIC}
        codeHighlighted={getHighlights(cycleCurrentPhase, algorithmTraversal, false)}
        logicHighlighted={getHighlights(cycleCurrentPhase, algorithmTraversal, true)}
        varsRows={cycleVarsRows}
        showLogic={pseudocodeShowLogic}
        onFlip={onPseudocodeFlip}
        canDetach={!isCycleDetectionPlaybackPlaying}
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
            <span className="output-value">{cycleDetectionOutput !== null ? cycleDetectionOutput.operationCount : '—'}</span>
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
