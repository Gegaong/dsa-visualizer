import { useEffect, useState } from 'react'
import type { TraversalStrategy } from '../../algorithms/algorithmstypes'
import { useStepPlayback } from '../../hooks/useStepPlayback'
import { PLAYBACK_MAX_DELAY_MS, PLAYBACK_MIN_DELAY_MS } from '../../utils/constants'
import type { AlgorithmMode, AlgorithmsPageProps, CycleDetectionOutput } from './sidebarTypes'
import { PlaybackControls } from './PlaybackControls'
import { confirmNodeLabelFieldOnEnter } from './sidebarFieldHelpers'

// Static metadata for each algorithm option; lives outside the component to avoid re-creation on every render.
const ALGORITHM_DETAILS: Record<AlgorithmMode, {
  label: string
  description: string
  runLabel: string
  outputLabel: string
  outputHint: string
  needsInputs: boolean
  usesTraversal: boolean
}> = {
  components: {
    label: 'Weakly connected components',
    description:
      'Groups nodes linked when edge direction is ignored (underlying undirected connectivity).',
    runLabel: 'Run weak CC',
    outputLabel: 'Components',
    outputHint: 'Weakly connected groups appear here after a run.',
    needsInputs: false,
    usesTraversal: true,
  },
  cycle: {
    label: 'Cycle detection',
    description: 'Detect whether the directed graph contains a cycle.',
    runLabel: 'Run cycle detection',
    outputLabel: 'Cycle',
    outputHint: 'Shows whether a directed cycle exists once the run finishes.',
    needsInputs: false,
    usesTraversal: true,
  },
  bipartite: {
    label: 'Bipartite check',
    description: 'Try to split nodes into two sets with no internal edges.',
    runLabel: 'Run bipartite check',
    outputLabel: 'Bipartite',
    outputHint: 'Shows whether a valid 2-coloring exists.',
    needsInputs: false,
    usesTraversal: true,
  },
  'shortest-path': {
    label: 'Shortest path',
    description: 'Find the shortest path in an unweighted graph.',
    runLabel: 'Run shortest path',
    outputLabel: 'Path',
    outputHint: 'Path length and nodes are shown here after a run.',
    needsInputs: true,
    usesTraversal: false,
  },
  'topological-sort': {
    label: 'Topological sort',
    description: 'Order nodes so every edge points forward in the list (DAG only).',
    runLabel: 'Run topo sort',
    outputLabel: 'Order',
    outputHint: 'A valid ordering is shown here after a run.',
    needsInputs: false,
    usesTraversal: false,
  },
}

// TEMPORARY: mock step counts for sidebar-only playback previews of algorithms that
// aren't wired to the canvas yet. Delete this (and the graphAlgo* state below) once
// each algorithm has a real implementation feeding `connectedComponents`-style results.
const GRAPH_ALGO_MOCK_STEPS: Record<AlgorithmMode, number> = {
  components: 12,
  cycle: 8,
  bipartite: 14,
  'shortest-path': 11,
  'topological-sort': 15,
}

// "Playback step" output value for the real (canvas-wired) algorithms.
const formatPlaybackStepDisplay = (sessionActive: boolean, stepIndex: number, stepTotal: number) => {
  if (!sessionActive || stepTotal === 0) return '—'
  if (stepIndex >= 0) return `${stepIndex + 1} / ${stepTotal}`
  return `Ready / ${stepTotal}`
}

// Output rows for cycle detection: whether a cycle was found and, if so, its node path.
function CycleOutputRows({ output }: { output: CycleDetectionOutput }) {
  const cycleFound = output === null ? '—' : output.hasCycle ? 'Yes' : 'No'
  const cyclePath =
    output !== null && output.hasCycle && output.cycleNodeLabels.length > 0
      ? `${output.cycleNodeLabels.join(' → ')} → ${output.cycleNodeLabels[0]}`
      : null
  return (
    <>
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
    </>
  )
}

// Sidebar page: algorithm picker, per-algorithm configuration, playback, and output.
// Weak connected components and cycle detection are real (wired to the canvas); the
// remaining algorithms currently run a mock playback preview only.
export const AlgorithmsPage = ({
  blockGraphEdits,
  isTraversalRunning,
  isConnectedComponentsSessionActive,
  isCycleDetectionSessionActive,
  onAlgorithmModeChange,
  onRunConnectedComponents,
  onStopConnectedComponents,
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
  onRunCycleDetection,
  onStopCycleDetection,
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
}: AlgorithmsPageProps) => {
  const [algorithmMode, setAlgorithmMode] = useState<AlgorithmMode>('components')
  const [algorithmTraversal, setAlgorithmTraversal] = useState<TraversalStrategy>('bfs')
  const [shortestPathStart, setShortestPathStart] = useState('')
  const [shortestPathGoal, setShortestPathGoal] = useState('')

  // Mock playback scaffolding for the not-yet-wired algorithms (see GRAPH_ALGO_MOCK_STEPS).
  const [graphAlgoArmed, setGraphAlgoArmed] = useState(false)
  const [mockPlaybackSession, setMockPlaybackSession] = useState(0)

  const selectedAlgorithm = ALGORITHM_DETAILS[algorithmMode]
  const isComponentsMode = algorithmMode === 'components'
  const isCycleMode = algorithmMode === 'cycle'
  const isRealAlgorithmMode = isComponentsMode || isCycleMode
  const needsTraversalStrategy = selectedAlgorithm.usesTraversal
  const needsAlgorithmInputs = selectedAlgorithm.needsInputs

  useEffect(() => {
    onAlgorithmModeChange?.(algorithmMode)
  }, [algorithmMode, onAlgorithmModeChange])

  // Reset the mock preview whenever the picked algorithm changes.
  useEffect(() => {
    queueMicrotask(() => {
      setGraphAlgoArmed(false)
      setMockPlaybackSession((s) => s + 1)
    })
  }, [algorithmMode])

  const mockStepsTotal =
    graphAlgoArmed && !isRealAlgorithmMode ? GRAPH_ALGO_MOCK_STEPS[algorithmMode] : 0

  const graphAlgoPlayback = useStepPlayback({
    stepCount: mockStepsTotal,
    minDelay: PLAYBACK_MIN_DELAY_MS,
    maxDelay: PLAYBACK_MAX_DELAY_MS,
    resetSignal: mockPlaybackSession,
    onStepIndexChange: () => { },
    onComplete: () => { },
  })

  const algorithmPickerFrozen =
    blockGraphEdits ||
    graphAlgoArmed ||
    (isComponentsMode && isConnectedComponentsSessionActive) ||
    (isCycleMode && isCycleDetectionSessionActive)

  const toggleGraphAlgoRun = () => {
    if (isTraversalRunning || isConnectedComponentsSessionActive || isCycleDetectionSessionActive) return
    if (isRealAlgorithmMode) return
    if (graphAlgoArmed) {
      setGraphAlgoArmed(false)
      return
    }
    setGraphAlgoArmed(true)
    setMockPlaybackSession((s) => s + 1)
  }

  const toggleConnectedComponentsRun = () => {
    if (isTraversalRunning) return
    if (isConnectedComponentsSessionActive) {
      onStopConnectedComponents()
      return
    }
    onRunConnectedComponents(algorithmTraversal)
  }

  const toggleCycleDetectionRun = () => {
    if (isTraversalRunning) return
    if (isCycleDetectionSessionActive) {
      onStopCycleDetection()
      return
    }
    onRunCycleDetection(algorithmTraversal)
  }

  let graphAlgoPlaybackHint: string
  if (isComponentsMode) {
    graphAlgoPlaybackHint = connectedComponentsStatusText
  } else if (isCycleMode) {
    graphAlgoPlaybackHint = cycleDetectionStatusText
  } else if (!graphAlgoArmed) {
    graphAlgoPlaybackHint = `Configure if needed, then press Run to preview ${selectedAlgorithm.label.toLowerCase()} playback.`
  } else if (graphAlgoPlayback.stepIndex < 0) {
    graphAlgoPlaybackHint = `${selectedAlgorithm.label}: ready. Press Play or step through manually.`
  } else if (graphAlgoPlayback.stepIndex >= mockStepsTotal - 1 && !graphAlgoPlayback.isPlaying) {
    graphAlgoPlaybackHint = `Done. Mock playback finished (${mockStepsTotal} steps).`
  } else {
    graphAlgoPlaybackHint = `Mock step ${graphAlgoPlayback.stepIndex + 1} / ${mockStepsTotal}.`
  }

  let playbackStepDisplay: string
  if (isComponentsMode) {
    playbackStepDisplay = formatPlaybackStepDisplay(
      isConnectedComponentsSessionActive,
      connectedComponentsStepIndex,
      connectedComponentsStepTotal,
    )
  } else if (isCycleMode) {
    playbackStepDisplay = formatPlaybackStepDisplay(
      isCycleDetectionSessionActive,
      cycleDetectionStepIndex,
      cycleDetectionStepTotal,
    )
  } else if (graphAlgoArmed && graphAlgoPlayback.stepIndex >= 0) {
    playbackStepDisplay = `${graphAlgoPlayback.stepIndex + 1} / ${mockStepsTotal}`
  } else {
    playbackStepDisplay = '—'
  }

  let outputRows
  if (isComponentsMode) {
    outputRows = (
      <>
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
      </>
    )
  } else if (isCycleMode) {
    outputRows = <CycleOutputRows output={cycleDetectionOutput} />
  } else {
    outputRows = (
      <>
        <div className="output-row">
          <span className="output-label">{selectedAlgorithm.outputLabel}</span>
          <span className="output-value">—</span>
        </div>
        <p className="hint">{selectedAlgorithm.outputHint}</p>
      </>
    )
  }

  let playbackControls
  if (isComponentsMode) {
    playbackControls = (
      <PlaybackControls
        runLabel={selectedAlgorithm.runLabel}
        stopLabel="Stop run"
        isRunActive={isConnectedComponentsSessionActive}
        onRunToggle={toggleConnectedComponentsRun}
        runDisabled={
          isTraversalRunning ||
          (!isConnectedComponentsSessionActive && !canRunConnectedComponents)
        }
        onPrevious={onPreviousConnectedComponentsStep}
        onNext={onNextConnectedComponentsStep}
        onPlayPauseToggle={
          isConnectedComponentsPlaybackPlaying
            ? onPauseConnectedComponents
            : onPlayConnectedComponents
        }
        isPlaying={isConnectedComponentsPlaybackPlaying}
        isPlaybackComplete={isConnectedComponentsPlaybackComplete}
        canStepBackward={canConnectedComponentsStepBackward}
        canStepForward={canConnectedComponentsStepForward}
        canTogglePlay={canConnectedComponentsTogglePlay}
        stepControlsDisabled={isTraversalRunning}
        speed={connectedComponentsPlaybackSpeed}
        onSpeedChange={onConnectedComponentsPlaybackSpeedChange}
      />
    )
  } else if (isCycleMode) {
    playbackControls = (
      <PlaybackControls
        runLabel={selectedAlgorithm.runLabel}
        stopLabel="Stop run"
        isRunActive={isCycleDetectionSessionActive}
        onRunToggle={toggleCycleDetectionRun}
        runDisabled={
          isTraversalRunning ||
          (!isCycleDetectionSessionActive && !canRunCycleDetection)
        }
        onPrevious={onPreviousCycleDetectionStep}
        onNext={onNextCycleDetectionStep}
        onPlayPauseToggle={
          isCycleDetectionPlaybackPlaying ? onPauseCycleDetection : onPlayCycleDetection
        }
        isPlaying={isCycleDetectionPlaybackPlaying}
        isPlaybackComplete={isCycleDetectionPlaybackComplete}
        canStepBackward={canCycleDetectionStepBackward}
        canStepForward={canCycleDetectionStepForward}
        canTogglePlay={canCycleDetectionTogglePlay}
        stepControlsDisabled={isTraversalRunning}
        speed={cycleDetectionPlaybackSpeed}
        onSpeedChange={onCycleDetectionPlaybackSpeedChange}
      />
    )
  } else {
    playbackControls = (
      <PlaybackControls
        runLabel={selectedAlgorithm.runLabel}
        stopLabel="Stop run"
        isRunActive={graphAlgoArmed}
        onRunToggle={toggleGraphAlgoRun}
        runDisabled={
          !graphAlgoArmed &&
          (isTraversalRunning || isConnectedComponentsSessionActive || isCycleDetectionSessionActive)
        }
        onPrevious={() => graphAlgoPlayback.stepBackward()}
        onNext={() => graphAlgoPlayback.stepForward()}
        onPlayPauseToggle={() => graphAlgoPlayback.togglePlay()}
        isPlaying={graphAlgoPlayback.isPlaying}
        isPlaybackComplete={graphAlgoPlayback.isPlaybackComplete}
        canStepBackward={graphAlgoPlayback.canStepBackward}
        canStepForward={graphAlgoPlayback.canStepForward}
        canTogglePlay={graphAlgoPlayback.canTogglePlay}
        stepControlsDisabled={
          isTraversalRunning || isConnectedComponentsSessionActive || isCycleDetectionSessionActive
        }
        speed={graphAlgoPlayback.playbackSpeed}
        onSpeedChange={(value) => graphAlgoPlayback.setPlaybackSpeed(value)}
      />
    )
  }

  return (
    <div className="sidebar-page-body sidebar-page-body--algorithms">
      <div className="sidebar-section">
        <h3>Algorithm</h3>
        <label className="field algorithm-mode-field">
          <span>Select algorithm</span>
          <select
            value={algorithmMode}
            onChange={(event) => setAlgorithmMode(event.target.value as AlgorithmMode)}
            disabled={algorithmPickerFrozen}
          >
            <option value="components">Weakly connected components</option>
            <option value="cycle">Cycle detection</option>
            <option value="bipartite">Bipartite check</option>
            <option value="shortest-path">Shortest path</option>
            <option value="topological-sort">Topological sort</option>
          </select>
        </label>
      </div>

      <div className="sidebar-section algorithm-config-section">
        <h3>Configuration</h3>
        <div className="algorithm-config-content">
          {needsTraversalStrategy && (
            <div className="pill-group algorithm-traversal-buttons">
              <button
                className={`btn btn-pill ${algorithmTraversal === 'bfs' ? 'btn-active' : ''}`}
                type="button"
                disabled={algorithmPickerFrozen}
                onClick={() => setAlgorithmTraversal('bfs')}
              >
                BFS
              </button>
              <button
                className={`btn btn-pill ${algorithmTraversal === 'dfs' ? 'btn-active' : ''}`}
                type="button"
                disabled={algorithmPickerFrozen}
                onClick={() => setAlgorithmTraversal('dfs')}
              >
                DFS
              </button>
            </div>
          )}

          {needsAlgorithmInputs && (
            <div className="algorithm-inputs-section">
              <label className="field">
                <span>
                  Start node <span className="required-indicator" aria-hidden="true">*</span>
                </span>
                <input
                  type="text"
                  value={shortestPathStart}
                  onChange={(event) => setShortestPathStart(event.target.value.toUpperCase())}
                  onKeyDown={confirmNodeLabelFieldOnEnter}
                  disabled={algorithmPickerFrozen}
                />
              </label>
              <label className="field">
                <span>
                  Goal node <span className="required-indicator" aria-hidden="true">*</span>
                </span>
                <input
                  type="text"
                  value={shortestPathGoal}
                  onChange={(event) => setShortestPathGoal(event.target.value.toUpperCase())}
                  onKeyDown={confirmNodeLabelFieldOnEnter}
                  disabled={algorithmPickerFrozen}
                />
              </label>
            </div>
          )}

          {!needsTraversalStrategy && !needsAlgorithmInputs && (
            <p className="hint">No extra setup needed.</p>
          )}
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Playback</h3>
        {playbackControls}
        <p className="hint">{graphAlgoPlaybackHint}</p>
      </div>

      <div className="sidebar-section">
        <h3>Output</h3>
        <div className="algorithm-output">
          <div className="output-row">
            <span className="output-label">Playback step</span>
            <span className="output-value">{playbackStepDisplay}</span>
          </div>
          {outputRows}
        </div>
      </div>
    </div>
  )
}
