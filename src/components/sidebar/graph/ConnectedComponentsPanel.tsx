import type { TraversalStrategy } from '../../../algorithms/graph/algorithmTypes'

import type { CCPhase, ConnectedComponentsOutput } from '../sidebarTypes'

import { PlaybackControls } from '../PlaybackControls'

import { AlgorithmInfoCard } from '../AlgorithmInfoCard'

import { PseudocodePanel } from '../PseudocodePanel'

import { confirmNodeLabelFieldOnEnter, NODE_LABEL_FIELD_ATTRS } from '../sidebarFieldHelpers'

// ─── Code pseudocode strings (19 lines each, 0–18) ──────────────────────────
// Two-function structure: outer loop finds component roots; inner BFS/DFS traverses each.
// The inner function collects its own node list (`component`) and returns it to the outer loop.

const BFS_CODE = `function ConnectedComponents(graph):
    visited ← {}; components ← []
    for each node v in graph:
        if v ∉ visited:
            component ← BFS(v, visited, graph)
            components.add(component)
    return components

function BFS(start, visited, graph):
    component ← []
    queue ← [start]; visited.add(start)
    while queue ≠ empty:
        u ← queue.dequeue()
        component.add(u)
        for each nb of u in graph:
            if nb ∉ visited:
                visited.add(nb)
                queue.enqueue(nb)
    return component`

const DFS_CODE = `function ConnectedComponents(graph):
    visited ← {}; components ← []
    for each node v in graph:
        if v ∉ visited:
            component ← DFS(v, visited, graph)
            components.add(component)
    return components

function DFS(start, visited, graph):
    component ← []
    stack ← [start]; visited.add(start)
    while stack ≠ empty:
        u ← stack.pop()
        component.add(u)
        for each nb of u in graph:
            if nb ∉ visited:
                visited.add(nb)
                stack.push(nb)
    return component`

// ─── Logic pseudocode strings (12 lines each, 0–11) ─────────────────────────

const BFS_LOGIC = `Outer loop scans every node once.
When an unvisited node is found,
a new BFS component starts from it.
──────────────────────────────────────────
BFS within each component:
  · Root: enqueue it, mark visited.
  · Dequeue the front node.
  · For each unvisited neighbor:
      add to queue, mark visited.
Queue empties → component is complete.
──────────────────────────────────────────
No more unvisited nodes → all done.`

const DFS_LOGIC = `Outer loop scans every node once.
When an unvisited node is found,
a new DFS component starts from it.
──────────────────────────────────────────
DFS within each component:
  · Root: push it, mark visited.
  · Pop the top node.
  · For each unvisited neighbor:
      push onto stack, mark visited.
Stack empties → component is complete.
──────────────────────────────────────────
No more unvisited nodes → all done.`

// ─── Highlight maps ──────────────────────────────────────────────────────────

// Code: 19 lines (0–18). Outer function lines 0–6 + blank line 7 + inner function lines 8–18.
// step-root covers the outer-loop discovery (2,3,4) + seed (9,10) AND the while-body (11–17):
// the root is dequeued and its neighbors enqueued in the same step, so its frontier fills here.
// Line 9 (`component ← []`) is root-only: the list is created once per component, not per step.
const CODE_HIGHLIGHTS: Record<CCPhase, number[]> = {
  ready:        [0, 1],
  'step-root':  [2, 3, 4, 9, 10, 11, 12, 13, 14, 15, 16, 17],
  'step-inner': [11, 12, 13, 14, 15, 16, 17],
  done:         [6],
}

// Logic: 12 lines (0–11). Shared between BFS and DFS (only text differs).
// Line 9 ("component is complete") lives in `done`, not `step-inner`: mid-component the queue
// is not empty yet, so it would otherwise light on every inner step and falsely imply completion.
const LOGIC_HIGHLIGHTS: Record<CCPhase, number[]> = {
  ready:        [0, 1, 2],
  'step-root':  [0, 1, 2, 4, 5, 6, 7, 8],
  'step-inner': [4, 6, 7, 8],
  done:         [9, 11],
}

function getHighlights(phase: CCPhase | null, isLogic: boolean): Set<number> {
  if (!phase) return new Set()
  return new Set((isLogic ? LOGIC_HIGHLIGHTS : CODE_HIGHLIGHTS)[phase])
}

export type ConnectedComponentsPanelProps = {
  isTraversalRunning: boolean
  isUndirectedMode: boolean
  isConnectedComponentsSessionActive: boolean
  algorithmTraversal: TraversalStrategy
  onAlgorithmTraversalChange: (t: TraversalStrategy) => void
  algorithmPickerFrozen: boolean
  canRunConnectedComponents: boolean
  connectedComponentsStatusText: string
  isConnectedComponentsPlaybackPlaying: boolean
  connectedComponentsPlaybackSpeed: number
  onConnectedComponentsPlaybackSpeedChange: (value: number) => void
  onPlayConnectedComponents: () => void
  onPauseConnectedComponents: () => void
  onNextConnectedComponentsStep: () => void
  onPreviousConnectedComponentsStep: () => void
  canConnectedComponentsStepForward: boolean
  canConnectedComponentsStepBackward: boolean
  canConnectedComponentsTogglePlay: boolean
  isConnectedComponentsPlaybackComplete: boolean
  connectedComponentsOutput: ConnectedComponentsOutput
  connectedComponentsStepIndex: number
  connectedComponentsStepTotal: number
  ccCurrentPhase: CCPhase | null
  ccVarsRows: string[][] | null
  pseudocodeShowLogic: boolean
  onPseudocodeFlip: () => void
  onRunConnectedComponents: (strategy: TraversalStrategy) => void
  onStopConnectedComponents: () => void
  ccStartNodeLabel: string
  onCCStartNodeLabelChange: (value: string) => void
}

function formatStepDisplay(stepIndex: number, stepTotal: number): string {
  if (stepTotal === 0) return '—'
  if (stepIndex >= 0) return `${stepIndex + 1} / ${stepTotal}`
  return `Ready / ${stepTotal}`
}

// Configuration, playback controls, pseudocode, and output for the connected components algorithm.
export const ConnectedComponentsPanel = ({
  isTraversalRunning,
  isUndirectedMode,
  isConnectedComponentsSessionActive,
  algorithmTraversal,
  onAlgorithmTraversalChange,
  algorithmPickerFrozen,
  canRunConnectedComponents,
  connectedComponentsStatusText,
  isConnectedComponentsPlaybackPlaying,
  connectedComponentsPlaybackSpeed,
  onConnectedComponentsPlaybackSpeedChange,
  onPlayConnectedComponents,
  onPauseConnectedComponents,
  onNextConnectedComponentsStep,
  onPreviousConnectedComponentsStep,
  canConnectedComponentsStepForward,
  canConnectedComponentsStepBackward,
  canConnectedComponentsTogglePlay,
  isConnectedComponentsPlaybackComplete,
  connectedComponentsOutput,
  connectedComponentsStepIndex,
  connectedComponentsStepTotal,
  ccCurrentPhase,
  ccVarsRows,
  pseudocodeShowLogic,
  onPseudocodeFlip,
  onRunConnectedComponents,
  onStopConnectedComponents,
  ccStartNodeLabel,
  onCCStartNodeLabelChange,
}: ConnectedComponentsPanelProps) => {
  const toggleRun = () => {
    if (isTraversalRunning) return
    if (isConnectedComponentsSessionActive) {
      onStopConnectedComponents()
      return
    }
    onRunConnectedComponents(algorithmTraversal)
  }

  const hint = !isUndirectedMode
    ? 'Connected components run only on an undirected graph. Switch to Undirected at the top left of the canvas, then press Run.'
    : connectedComponentsStatusText

  const stepDisplay = formatStepDisplay(
    connectedComponentsStepIndex,
    connectedComponentsStepTotal,
  )

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
                Start node <span className="optional-indicator">(optional)</span>
              </span>
              <input
                {...NODE_LABEL_FIELD_ATTRS}
                value={ccStartNodeLabel}
                onChange={(e) => onCCStartNodeLabelChange(e.target.value)}
                onKeyDown={confirmNodeLabelFieldOnEnter}
                disabled={algorithmPickerFrozen}
              />
            </label>
          </div>
          <AlgorithmInfoCard infoKey={algorithmTraversal === 'bfs' ? 'cc-bfs' : 'cc-dfs'} />
        </div>
      </div>

      <div className="sidebar-section sidebar-section--cc-playback">
        <h3>Playback</h3>
        <PlaybackControls
          runLabel="Run connected components"
          stopLabel="Stop run"
          isRunActive={isConnectedComponentsSessionActive}
          onRunToggle={toggleRun}
          runDisabled={isTraversalRunning || (!isConnectedComponentsSessionActive && !canRunConnectedComponents)}
          onPrevious={onPreviousConnectedComponentsStep}
          onNext={onNextConnectedComponentsStep}
          onPlayPauseToggle={isConnectedComponentsPlaybackPlaying ? onPauseConnectedComponents : onPlayConnectedComponents}
          isPlaying={isConnectedComponentsPlaybackPlaying}
          isPlaybackComplete={isConnectedComponentsPlaybackComplete}
          canStepBackward={canConnectedComponentsStepBackward}
          canStepForward={canConnectedComponentsStepForward}
          canTogglePlay={canConnectedComponentsTogglePlay}
          stepControlsDisabled={isTraversalRunning}
          speed={connectedComponentsPlaybackSpeed}
          onSpeedChange={onConnectedComponentsPlaybackSpeedChange}
        />
        <p className="hint">{hint}</p>
      </div>

      <PseudocodePanel
        codeText={algorithmTraversal === 'bfs' ? BFS_CODE : DFS_CODE}
        logicText={algorithmTraversal === 'bfs' ? BFS_LOGIC : DFS_LOGIC}
        codeHighlighted={getHighlights(ccCurrentPhase, false)}
        logicHighlighted={getHighlights(ccCurrentPhase, true)}
        varsRows={ccVarsRows}
        showLogic={pseudocodeShowLogic}
        onFlip={onPseudocodeFlip}
        canDetach={!isConnectedComponentsPlaybackPlaying}
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
            <span className="output-value">
              {connectedComponentsOutput !== null ? connectedComponentsOutput.operationCount : '—'}
            </span>
          </div>
          <div className="output-row">
            <span className="output-label">Components found</span>
            <span className="output-value">
              {connectedComponentsOutput !== null ? connectedComponentsOutput.componentCount : '—'}
            </span>
          </div>
          <div className="output-row">
            <span className="output-label">Largest size</span>
            <span className="output-value">
              {connectedComponentsOutput !== null ? connectedComponentsOutput.largestSize : '—'}
            </span>
          </div>
          <div className="output-row output-row--stacked">
            <span className="output-label">Groups</span>
            <div className="output-list">
              {connectedComponentsOutput !== null ? connectedComponentsOutput.groupsText : '—'}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
