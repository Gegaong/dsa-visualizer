import type { TraversalStrategy } from '../../algorithms/algorithmstypes'
import type { ConnectedComponentsOutput } from './sidebarTypes'
import { PlaybackControls } from './PlaybackControls'

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
  onRunConnectedComponents: (strategy: TraversalStrategy) => void
  onStopConnectedComponents: () => void
}

// Returns a human-readable step counter; shows "Ready / N" before playback begins.
function formatStepDisplay(sessionActive: boolean, stepIndex: number, stepTotal: number): string {
  if (!sessionActive || stepTotal === 0) return '—'
  if (stepIndex >= 0) return `${stepIndex + 1} / ${stepTotal}`
  return `Ready / ${stepTotal}`
}

// Configuration, playback controls, and output for the connected components algorithm.
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
  onRunConnectedComponents,
  onStopConnectedComponents,
}: ConnectedComponentsPanelProps) => {
  // Starts a new run or stops the active one; no-ops while traversal is running.
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
    isConnectedComponentsSessionActive,
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
        </div>
      </div>

      <div className="sidebar-section">
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

      <div className="sidebar-section">
        <h3>Output</h3>
        <div className="algorithm-output">
          <div className="output-row">
            <span className="output-label">Playback step</span>
            <span className="output-value">{stepDisplay}</span>
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
