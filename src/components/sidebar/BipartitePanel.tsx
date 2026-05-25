import type { TraversalStrategy } from '../../algorithms/algorithmstypes'

import type { BipartiteOutput } from '../../hooks/useBipartitePlayback'

import { PlaybackControls } from './PlaybackControls'

import { AlgorithmInfoCard } from './AlgorithmInfoCard'

import { StepExplanation } from './StepExplanation'

import { confirmNodeLabelFieldOnEnter } from './sidebarFieldHelpers'

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
  bipartiteCurrentExplanation: string
  onRunBipartite: (strategy: TraversalStrategy) => void
  onStopBipartite: () => void
  bipartiteStartNodeLabel: string
  onBipartiteStartNodeLabelChange: (value: string) => void
}

// Returns a human-readable step counter; shows "Ready / N" before playback begins.
function formatStepDisplay(sessionActive: boolean, stepIndex: number, stepTotal: number): string {
  if (!sessionActive || stepTotal === 0) return '—'
  if (stepIndex >= 0) return `${stepIndex + 1} / ${stepTotal}`
  return `Ready / ${stepTotal}`
}

// Configuration, playback controls, and output for the bipartite check algorithm.
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
  bipartiteCurrentExplanation,
  onRunBipartite,
  onStopBipartite,
  bipartiteStartNodeLabel,
  onBipartiteStartNodeLabelChange,
}: BipartitePanelProps) => {
  // Starts a new run or stops the active one; no-ops while traversal is running.
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

  const stepDisplay = formatStepDisplay(isBipartiteSessionActive, bipartiteStepIndex, bipartiteStepTotal)

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

      <div className="sidebar-section">
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
        <StepExplanation text={bipartiteCurrentExplanation} />
      </div>

      <div className="sidebar-section">
        <h3>Output</h3>
        <div className="algorithm-output">
          <div className="output-row">
            <span className="output-label">Playback step</span>
            <span className="output-value">{stepDisplay}</span>
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
