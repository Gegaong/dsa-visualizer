import { useEffect, useState } from 'react'
import type { TraversalStrategy } from '../../algorithms/algorithmstypes'
import { useStepPlayback } from '../../hooks/useStepPlayback'
import { PLAYBACK_MAX_DELAY_MS, PLAYBACK_MIN_DELAY_MS } from '../../utils/constants'
import type { AlgorithmMode } from './sidebarTypes'
import { PlaybackControls } from './PlaybackControls'

type MockAlgorithmDetails = {
  label: string
  runLabel: string
  outputLabel: string
  outputHint: string
  usesTraversal: boolean
  mockStepCount: number
}

const MOCK_ALGORITHM_DETAILS: Record<AlgorithmMode, MockAlgorithmDetails> = {
  components: { label: 'Connected components', runLabel: 'Run connected components', outputLabel: 'Components', outputHint: 'Component groups appear here after a run.', usesTraversal: true, mockStepCount: 12 },
  cycle: { label: 'Cycle detection', runLabel: 'Run cycle detection', outputLabel: 'Cycle', outputHint: 'Shows whether a directed cycle exists.', usesTraversal: true, mockStepCount: 8 },
  bipartite: { label: 'Bipartite check', runLabel: 'Run bipartite check', outputLabel: 'Bipartite', outputHint: 'Shows whether a valid 2-coloring exists.', usesTraversal: true, mockStepCount: 14 },
  'shortest-path': { label: 'Shortest path', runLabel: 'Run shortest path', outputLabel: 'Path', outputHint: 'Path length and nodes shown here after a run.', usesTraversal: true, mockStepCount: 11 },
  'topological-sort': { label: 'Topological sort', runLabel: 'Run topo sort', outputLabel: 'Order', outputHint: 'A valid ordering is shown here after a run.', usesTraversal: false, mockStepCount: 15 },
}

export type MockAlgorithmPanelProps = {
  algorithmMode: AlgorithmMode
  isTraversalRunning: boolean
  isConnectedComponentsSessionActive: boolean
  isCycleDetectionSessionActive: boolean
  isShortestPathSessionActive: boolean
  isArmed: boolean
  onSetArmed: (value: boolean) => void
  algorithmTraversal: TraversalStrategy
  onAlgorithmTraversalChange: (t: TraversalStrategy) => void
  algorithmPickerFrozen: boolean
}

// Sidebar panel for algorithms not yet wired to the canvas; drives a mock step playback preview.
export const MockAlgorithmPanel = ({
  algorithmMode,
  isTraversalRunning,
  isConnectedComponentsSessionActive,
  isCycleDetectionSessionActive,
  isShortestPathSessionActive,
  isArmed,
  onSetArmed,
  algorithmTraversal,
  onAlgorithmTraversalChange,
  algorithmPickerFrozen,
}: MockAlgorithmPanelProps) => {
  const details = MOCK_ALGORITHM_DETAILS[algorithmMode]
  const [mockSession, setMockSession] = useState(0)

  useEffect(() => {
    queueMicrotask(() => setMockSession((s) => s + 1))
  }, [algorithmMode])

  const mockStepsTotal = isArmed ? details.mockStepCount : 0

  const playback = useStepPlayback({
    stepCount: mockStepsTotal,
    minDelay: PLAYBACK_MIN_DELAY_MS,
    maxDelay: PLAYBACK_MAX_DELAY_MS,
    resetSignal: mockSession,
    onStepIndexChange: () => {},
    onComplete: () => {},
  })

  // Arms the mock playback or disarms it; blocked while any real algorithm session is active.
  const toggleRun = () => {
    if (isTraversalRunning || isConnectedComponentsSessionActive || isCycleDetectionSessionActive || isShortestPathSessionActive) return
    if (isArmed) {
      onSetArmed(false)
      return
    }
    onSetArmed(true)
    setMockSession((s) => s + 1)
  }

  let hint: string
  if (!isArmed) {
    hint = `Configure if needed, then press Run to preview ${details.label.toLowerCase()} playback.`
  } else if (playback.stepIndex < 0) {
    hint = `${details.label}: ready. Press Play or step through manually.`
  } else if (playback.stepIndex >= mockStepsTotal - 1 && !playback.isPlaying) {
    hint = `Done. Mock playback finished (${mockStepsTotal} steps).`
  } else {
    hint = `Mock step ${playback.stepIndex + 1} / ${mockStepsTotal}.`
  }

  const stepDisplay = isArmed && playback.stepIndex >= 0
    ? `${playback.stepIndex + 1} / ${mockStepsTotal}`
    : '—'

  return (
    <>
      <div className="sidebar-section algorithm-config-section">
        <h3>Configuration</h3>
        <div className="algorithm-config-content">
          {details.usesTraversal ? (
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
          ) : (
            <p className="hint">No extra setup needed.</p>
          )}
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Playback</h3>
        <PlaybackControls
          runLabel={details.runLabel}
          stopLabel="Stop run"
          isRunActive={isArmed}
          onRunToggle={toggleRun}
          runDisabled={
            !isArmed &&
            (isTraversalRunning || isConnectedComponentsSessionActive || isCycleDetectionSessionActive)
          }
          onPrevious={() => playback.stepBackward()}
          onNext={() => playback.stepForward()}
          onPlayPauseToggle={() => playback.togglePlay()}
          isPlaying={playback.isPlaying}
          isPlaybackComplete={playback.isPlaybackComplete}
          canStepBackward={playback.canStepBackward}
          canStepForward={playback.canStepForward}
          canTogglePlay={playback.canTogglePlay}
          stepControlsDisabled={isTraversalRunning || isConnectedComponentsSessionActive || isCycleDetectionSessionActive}
          speed={playback.playbackSpeed}
          onSpeedChange={(value) => playback.setPlaybackSpeed(value)}
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
            <span className="output-label">{details.outputLabel}</span>
            <span className="output-value">—</span>
          </div>
          <p className="hint">{details.outputHint}</p>
        </div>
      </div>
    </>
  )
}
