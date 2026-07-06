import type { TraversalStrategy } from '../../algorithms/algorithmTypes'

import type { BipartiteOutput, BipartitePhase } from '../../hooks/useBipartitePlayback'

import { PlaybackControls } from './PlaybackControls'

import { AlgorithmInfoCard } from './AlgorithmInfoCard'

import { PseudocodePanel } from './PseudocodePanel'

import { confirmNodeLabelFieldOnEnter } from './sidebarFieldHelpers'

// ─── Code pseudocode strings (20 lines each, 0–19) ──────────────────────────

const BFS_CODE = `function BipartiteCheck(graph):
    color ← {}
    for each node v in graph:
        if v ∉ color:
            color[v] ← red
            if not BFS(v, color, graph):
                return false
    return true

function BFS(start, color, graph):
    queue ← [start]
    while queue ≠ empty:
        u ← queue.dequeue()
        for each nb of u in graph:
            if nb ∉ color:
                color[nb] ← ¬color[u]
                queue.enqueue(nb)
            elif color[nb] = color[u]:
                return false
    return true`

const DFS_CODE = `function BipartiteCheck(graph):
    color ← {}
    for each node v in graph:
        if v ∉ color:
            color[v] ← red
            if not DFS(v, color, graph):
                return false
    return true

function DFS(start, color, graph):
    stack ← [start]
    while stack ≠ empty:
        u ← stack.pop()
        for each nb of u in graph:
            if nb ∉ color:
                color[nb] ← ¬color[u]
                stack.push(nb)
            elif color[nb] = color[u]:
                return false
    return true`

// ─── Logic pseudocode strings (12 lines each, 0–11) ─────────────────────────

const BFS_LOGIC = `Outer loop scans every node once.
When an uncolored node is found,
a new BFS component starts from it.
──────────────────────────────────────────
Assign color red; BFS from it:
  · Dequeue the front node.
  · Uncolored neighbor → assign opposite
      color, enqueue it.
  · Same-colored neighbor as u
      → return false.
──────────────────────────────────────────
All colored with no conflict → return true.`

const DFS_LOGIC = `Outer loop scans every node once.
When an uncolored node is found,
a new DFS component starts from it.
──────────────────────────────────────────
Assign color red; DFS from it:
  · Pop the top node.
  · Uncolored neighbor → assign opposite
      color, push it.
  · Same-colored neighbor as u
      → return false.
──────────────────────────────────────────
All colored with no conflict → return true.`

// ─── Highlight maps ──────────────────────────────────────────────────────────

// Code: 20 lines (0–19). Same structure for BFS and DFS — only function name differs.
// done-not-bipartite lights the full propagation chain: inner conflict (17,18) → caller checks
// the result (5) → outer return false (6).
const CODE_HIGHLIGHTS: Record<BipartitePhase, number[]> = {
  ready:                [0, 1],
  'step-root':          [2, 3, 4, 5, 10],
  'step-neighbor':      [11, 12, 13, 14, 15, 16],
  'done-bipartite':     [7, 19],
  'done-not-bipartite': [5, 6, 17, 18],
}

// Logic: 12 lines (0–11). Shared between BFS and DFS.
const LOGIC_HIGHLIGHTS: Record<BipartitePhase, number[]> = {
  ready:                [0, 1, 2],
  'step-root':          [0, 1, 2, 4],
  'step-neighbor':      [5, 6, 7],
  'done-bipartite':     [11],
  'done-not-bipartite': [8, 9],
}

function getHighlights(phase: BipartitePhase | null, isLogic: boolean): Set<number> {
  if (!phase) return new Set()
  return new Set((isLogic ? LOGIC_HIGHLIGHTS : CODE_HIGHLIGHTS)[phase])
}

export type BipartitePanelProps = {
  isTraversalRunning: boolean
  isUndirectedMode: boolean
  isBipartiteSessionActive: boolean
  algorithmTraversal: TraversalStrategy
  onAlgorithmTraversalChange: (t: TraversalStrategy) => void
  algorithmPickerFrozen: boolean
  canRunBipartite: boolean
  bipartiteStatusText: string
  isBipartitePlaybackPlaying: boolean
  bipartitePlaybackSpeed: number
  onBipartitePlaybackSpeedChange: (value: number) => void
  onPlayBipartite: () => void
  onPauseBipartite: () => void
  onNextBipartiteStep: () => void
  onPreviousBipartiteStep: () => void
  canBipartiteStepForward: boolean
  canBipartiteStepBackward: boolean
  canBipartiteTogglePlay: boolean
  isBipartitePlaybackComplete: boolean
  bipartiteOutput: BipartiteOutput
  bipartiteStepIndex: number
  bipartiteStepTotal: number
  bipartiteCurrentPhase: BipartitePhase | null
  bipartiteVarsRows: string[][] | null
  pseudocodeShowLogic: boolean
  onPseudocodeFlip: () => void
  onRunBipartite: (strategy: TraversalStrategy) => void
  onStopBipartite: () => void
  bipartiteStartNodeLabel: string
  onBipartiteStartNodeLabelChange: (value: string) => void
}

function formatStepDisplay(stepIndex: number, stepTotal: number): string {
  if (stepTotal === 0) return '—'
  if (stepIndex >= 0) return `${stepIndex + 1} / ${stepTotal}`
  return `Ready / ${stepTotal}`
}

// Configuration, playback controls, pseudocode, and output for the bipartite check algorithm.
export const BipartitePanel = ({
  isTraversalRunning,
  isUndirectedMode,
  isBipartiteSessionActive,
  algorithmTraversal,
  onAlgorithmTraversalChange,
  algorithmPickerFrozen,
  canRunBipartite,
  bipartiteStatusText,
  isBipartitePlaybackPlaying,
  bipartitePlaybackSpeed,
  onBipartitePlaybackSpeedChange,
  onPlayBipartite,
  onPauseBipartite,
  onNextBipartiteStep,
  onPreviousBipartiteStep,
  canBipartiteStepForward,
  canBipartiteStepBackward,
  canBipartiteTogglePlay,
  isBipartitePlaybackComplete,
  bipartiteOutput,
  bipartiteStepIndex,
  bipartiteStepTotal,
  bipartiteCurrentPhase,
  bipartiteVarsRows,
  pseudocodeShowLogic,
  onPseudocodeFlip,
  onRunBipartite,
  onStopBipartite,
  bipartiteStartNodeLabel,
  onBipartiteStartNodeLabelChange,
}: BipartitePanelProps) => {
  const toggleRun = () => {
    if (isTraversalRunning) return
    if (isBipartiteSessionActive) {
      onStopBipartite()
      return
    }
    onRunBipartite(algorithmTraversal)
  }

  const hint = !isUndirectedMode
    ? 'Bipartite check runs on undirected graphs only. Switch to Undirected at the top left of the canvas, then press Run.'
    : bipartiteStatusText

  const stepDisplay = formatStepDisplay(bipartiteStepIndex, bipartiteStepTotal)
  const isBipartiteText = bipartiteOutput === null ? '—' : bipartiteOutput.isBipartite ? 'Yes' : 'No'

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
                type="text"
                value={bipartiteStartNodeLabel}
                onChange={(e) => onBipartiteStartNodeLabelChange(e.target.value)}
                onKeyDown={confirmNodeLabelFieldOnEnter}
                disabled={algorithmPickerFrozen}
              />
            </label>
          </div>
          <AlgorithmInfoCard infoKey={algorithmTraversal === 'bfs' ? 'bipartite-bfs' : 'bipartite-dfs'} />
        </div>
      </div>

      <div className="sidebar-section sidebar-section--bipartite-playback">
        <h3>Playback</h3>
        <PlaybackControls
          runLabel="Run bipartite check"
          stopLabel="Stop run"
          isRunActive={isBipartiteSessionActive}
          onRunToggle={toggleRun}
          runDisabled={isTraversalRunning || (!isBipartiteSessionActive && !canRunBipartite)}
          onPrevious={onPreviousBipartiteStep}
          onNext={onNextBipartiteStep}
          onPlayPauseToggle={isBipartitePlaybackPlaying ? onPauseBipartite : onPlayBipartite}
          isPlaying={isBipartitePlaybackPlaying}
          isPlaybackComplete={isBipartitePlaybackComplete}
          canStepBackward={canBipartiteStepBackward}
          canStepForward={canBipartiteStepForward}
          canTogglePlay={canBipartiteTogglePlay}
          stepControlsDisabled={isTraversalRunning}
          speed={bipartitePlaybackSpeed}
          onSpeedChange={onBipartitePlaybackSpeedChange}
        />
        <p className="hint">{hint}</p>
      </div>

      <PseudocodePanel
        codeText={algorithmTraversal === 'bfs' ? BFS_CODE : DFS_CODE}
        logicText={algorithmTraversal === 'bfs' ? BFS_LOGIC : DFS_LOGIC}
        codeHighlighted={getHighlights(bipartiteCurrentPhase, false)}
        logicHighlighted={getHighlights(bipartiteCurrentPhase, true)}
        varsRows={bipartiteVarsRows}
        showLogic={pseudocodeShowLogic}
        onFlip={onPseudocodeFlip}
        canDetach={!isBipartitePlaybackPlaying}
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
            <span className="output-value">{bipartiteOutput !== null ? bipartiteOutput.operationCount : '—'}</span>
          </div>
          <div className="output-row">
            <span className="output-label">Is bipartite</span>
            <span className="output-value">{isBipartiteText}</span>
          </div>
          {bipartiteOutput !== null && bipartiteOutput.isBipartite && (
            <>
              {bipartiteOutput.groupALabels !== null && (
                <div className="output-row output-row--stacked">
                  <span className="output-label">Group A (red)</span>
                  <div className="output-list">{bipartiteOutput.groupALabels}</div>
                </div>
              )}
              {bipartiteOutput.groupBLabels !== null && (
                <div className="output-row output-row--stacked">
                  <span className="output-label">Group B (blue)</span>
                  <div className="output-list">{bipartiteOutput.groupBLabels}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
