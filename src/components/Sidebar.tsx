import type { GoalType, GraphPreset } from '../types'
import type { TraversalStrategy } from '../algorithms/types'
import { useEffect, useRef, useState } from 'react'
import { GRAPH_PRESETS } from '../utils/presets'
import { useStepPlayback } from '../hooks/useStepPlayback'
import { PLAYBACK_MAX_DELAY_MS, PLAYBACK_MIN_DELAY_MS } from '../utils/constants'

export type AlgorithmMode =
  | 'components'
  | 'cycle'
  | 'bipartite'
  | 'shortest-path'
  | 'topological-sort'

// Mock step counts for sidebar-only playback previews (no canvas wiring yet).
const GRAPH_ALGO_MOCK_STEPS: Record<AlgorithmMode, number> = {
  components: 12,
  cycle: 8,
  bipartite: 14,
  'shortest-path': 11,
  'topological-sort': 15,
}

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
    description: 'Detect whether the graph contains a cycle.',
    runLabel: 'Run cycle check',
    outputLabel: 'Cycle',
    outputHint: 'Shows whether a cycle exists once the run finishes.',
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

export type SidebarPage = 'canvas' | 'traversal' | 'algorithms'

type SidebarProps = {
  algorithmTab: TraversalStrategy
  onAlgorithmTabChange: (tab: TraversalStrategy) => void
  goalType: GoalType
  onGoalTypeChange: (type: GoalType) => void
  startNodeLabel: string
  onStartNodeLabelChange: (value: string) => void
  goalNodeLabel: string
  onGoalNodeLabelChange: (value: string) => void
  goalValueInput: string
  onGoalValueInputChange: (value: string) => void
  onRunTraversal: () => void
  onStopTraversal: () => void
  canRunTraversal: boolean
  traversalStatusText: string
  /** True only while Traversal mode has an active BFS/DFS run (drives Run button state). */
  isTraversalRunning: boolean
  /** True while graph edits / sidebar inputs should freeze (traversal or Algorithms playback). */
  blockGraphEdits: boolean
  isTraversalPlaying: boolean
  traversalPlaybackSpeed: number
  onTraversalPlaybackSpeedChange: (value: number) => void
  onPlayTraversal: () => void
  onPauseTraversal: () => void
  onNextTraversalStep: () => void
  onPreviousTraversalStep: () => void
  canStepForward: boolean
  canStepBackward: boolean
  canTogglePlay: boolean
  isTraversalPlaybackComplete: boolean
  fillMin: string
  fillMax: string
  onFillMinChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onFillMaxChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onFillRangeBlur: () => void
  onFillRangeKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  onFillEmptyValues: () => void
  canFillEmpty: boolean
  onNullifyEmptyValues: () => void
  canNullifyEmpty: boolean
  onEmptyAllValues: () => void
  canEmptyAll: boolean
  onPresetClick: (preset: GraphPreset) => void
  onAlgorithmModeChange?: (mode: AlgorithmMode) => void
  onRunConnectedComponents: (strategy: TraversalStrategy) => void
  onStopConnectedComponents: () => void
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
  connectedComponentsOutput: {
    componentCount: number
    largestSize: number
    groupsText: string
  } | null
  connectedComponentsStepIndex: number
  connectedComponentsStepTotal: number
  isConnectedComponentsSessionActive: boolean
  onSidebarSectionChange?: (nav: { from: SidebarPage; to: SidebarPage }) => void
}

// Right-side control panel: algorithm picker, inputs, fill values, playback, and presets.
export const Sidebar = ({
  algorithmTab,
  onAlgorithmTabChange,
  goalType,
  onGoalTypeChange,
  startNodeLabel,
  onStartNodeLabelChange,
  goalNodeLabel,
  onGoalNodeLabelChange,
  goalValueInput,
  onGoalValueInputChange,
  onRunTraversal,
  onStopTraversal,
  canRunTraversal,
  traversalStatusText,
  isTraversalRunning,
  blockGraphEdits,
  isTraversalPlaying,
  traversalPlaybackSpeed,
  onTraversalPlaybackSpeedChange,
  onPlayTraversal,
  onPauseTraversal,
  onNextTraversalStep,
  onPreviousTraversalStep,
  canStepForward,
  canStepBackward,
  canTogglePlay,
  isTraversalPlaybackComplete,
  fillMin,
  fillMax,
  onFillMinChange,
  onFillMaxChange,
  onFillRangeBlur,
  onFillRangeKeyDown,
  onFillEmptyValues,
  canFillEmpty,
  onNullifyEmptyValues,
  canNullifyEmpty,
  onEmptyAllValues,
  canEmptyAll,
  onPresetClick,
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
  isConnectedComponentsSessionActive,
  onSidebarSectionChange,
}: SidebarProps) => {
  const [activePage, setActivePage] = useState<SidebarPage>('canvas')
  const prevSidebarPageRef = useRef<SidebarPage>(activePage)

  const [graphAlgoArmed, setGraphAlgoArmed] = useState(false)
  const [mockPlaybackSession, setMockPlaybackSession] = useState(0)

  useEffect(() => {
    const prev = prevSidebarPageRef.current
    if (prev !== activePage) {
      onSidebarSectionChange?.({ from: prev, to: activePage })
      prevSidebarPageRef.current = activePage
    }
  }, [activePage, onSidebarSectionChange])

  useEffect(() => {
    if (activePage !== 'algorithms') {
      queueMicrotask(() => {
        setGraphAlgoArmed(false)
        setMockPlaybackSession((s) => s + 1)
      })
    }
  }, [activePage])
  const [algorithmMode, setAlgorithmMode] = useState<AlgorithmMode>('components')
  const [algorithmTraversal, setAlgorithmTraversal] = useState<TraversalStrategy>('bfs')
  const [shortestPathStart, setShortestPathStart] = useState('')
  const [shortestPathGoal, setShortestPathGoal] = useState('')
  const selectedAlgorithm = ALGORITHM_DETAILS[algorithmMode]
  const isComponentsMode = algorithmMode === 'components'
  const algoShort = algorithmTab === 'dfs' ? 'DFS' : 'BFS'
  const needsTraversalStrategy = selectedAlgorithm.usesTraversal
  const needsAlgorithmInputs = selectedAlgorithm.needsInputs

  useEffect(() => {
    queueMicrotask(() => {
      setGraphAlgoArmed(false)
      setMockPlaybackSession((s) => s + 1)
    })
  }, [algorithmMode])

  useEffect(() => {
    onAlgorithmModeChange?.(algorithmMode)
  }, [algorithmMode, onAlgorithmModeChange])

  const mockStepsTotal =
    graphAlgoArmed && !isComponentsMode ? GRAPH_ALGO_MOCK_STEPS[algorithmMode] : 0

  const algorithmPickerFrozen =
    blockGraphEdits ||
    graphAlgoArmed ||
    (isComponentsMode && isConnectedComponentsSessionActive)

  const graphAlgoPlayback = useStepPlayback({
    stepCount: mockStepsTotal,
    minDelay: PLAYBACK_MIN_DELAY_MS,
    maxDelay: PLAYBACK_MAX_DELAY_MS,
    resetSignal: mockPlaybackSession,
    onStepIndexChange: () => { },
    onComplete: () => { },
  })

  const toggleGraphAlgoRun = () => {
    if (isTraversalRunning || isConnectedComponentsSessionActive) return
    if (isComponentsMode) return
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

  let graphAlgoPlaybackHint: string
  if (isComponentsMode) {
    graphAlgoPlaybackHint = connectedComponentsStatusText
  } else if (!graphAlgoArmed) {
    graphAlgoPlaybackHint = `Configure if needed, then press Run to preview ${selectedAlgorithm.label.toLowerCase()} playback.`
  } else if (graphAlgoPlayback.stepIndex < 0) {
    graphAlgoPlaybackHint = `${selectedAlgorithm.label}: ready. Press Play or step through manually.`
  } else if (graphAlgoPlayback.stepIndex >= mockStepsTotal - 1 && !graphAlgoPlayback.isPlaying) {
    graphAlgoPlaybackHint = `Done. Mock playback finished (${mockStepsTotal} steps).`
  } else {
    graphAlgoPlaybackHint = `Mock step ${graphAlgoPlayback.stepIndex + 1} / ${mockStepsTotal}.`
  }

  // Enter confirms the field by moving focus away (same idea as “done typing”).
  const confirmNodeLabelFieldOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    }
  }

  let playbackStepDisplay: string
  if (!isComponentsMode) {
    playbackStepDisplay = graphAlgoArmed && graphAlgoPlayback.stepIndex >= 0
      ? `${graphAlgoPlayback.stepIndex + 1} / ${mockStepsTotal}`
      : '—'
  } else if (!isConnectedComponentsSessionActive || connectedComponentsStepTotal === 0) {
    playbackStepDisplay = '—'
  } else if (connectedComponentsStepIndex >= 0) {
    playbackStepDisplay = `${connectedComponentsStepIndex + 1} / ${connectedComponentsStepTotal}`
  } else {
    playbackStepDisplay = `Ready / ${connectedComponentsStepTotal}`
  }

  return (
    <aside
      className={`sidebar ${activePage === 'canvas'
        ? 'is-canvas-setup'
        : activePage === 'traversal'
          ? 'is-traversal-setup'
          : 'is-algorithm-setup'
        }`}
    >
      <div className="sidebar-page-switch">
        <button
          className={`sidebar-page-tab ${activePage === 'canvas' ? 'is-active' : ''}`}
          type="button"
          onClick={() => setActivePage('canvas')}
        >
          Canvas setup
        </button>
        <button
          className={`sidebar-page-tab ${activePage === 'traversal' ? 'is-active' : ''}`}
          type="button"
          onClick={() => setActivePage('traversal')}
        >
          Traversal mode
        </button>
        <button
          className={`sidebar-page-tab ${activePage === 'algorithms' ? 'is-active' : ''}`}
          type="button"
          onClick={() => setActivePage('algorithms')}
        >
          Algorithms
        </button>
      </div>

      {activePage === 'canvas' && (
        <div className="sidebar-page-body">
          <div className="sidebar-section">
            <h3>Node values</h3>
            <label className="field">
              <span>Minimum</span>
              <input
                type="text"
                inputMode="numeric"
                value={fillMin}
                onChange={onFillMinChange}
                onBlur={onFillRangeBlur}
                onKeyDown={onFillRangeKeyDown}
                disabled={blockGraphEdits}
              />
            </label>
            <label className="field">
              <span>Maximum</span>
              <input
                type="text"
                inputMode="numeric"
                value={fillMax}
                onChange={onFillMaxChange}
                onBlur={onFillRangeBlur}
                onKeyDown={onFillRangeKeyDown}
                disabled={blockGraphEdits}
              />
            </label>
            <div className="fill-actions">
              <button
                className="btn btn-primary"
                type="button"
                onClick={onFillEmptyValues}
                disabled={!canFillEmpty || blockGraphEdits}
              >
                Fill empty values
              </button>
              <button
                className="btn"
                type="button"
                onClick={onNullifyEmptyValues}
                disabled={!canNullifyEmpty || blockGraphEdits}
              >
                Nullify all empty values
              </button>
              <button
                className="btn"
                type="button"
                onClick={onEmptyAllValues}
                disabled={!canEmptyAll || blockGraphEdits}
              >
                Empty all values
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Presets</h3>
            {GRAPH_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className="btn btn-ghost"
                type="button"
                onClick={() => onPresetClick(preset)}
                disabled={blockGraphEdits}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {activePage === 'traversal' && (
        <div className="sidebar-page-body">
          <div className="sidebar-section">
            <h3>Traversal</h3>
            <div className="pill-group">
              <button
                className={`btn btn-pill ${algorithmTab === 'bfs' ? 'btn-active' : ''}`}
                type="button"
                disabled={blockGraphEdits && !isTraversalRunning}
                onClick={() => onAlgorithmTabChange('bfs')}
              >
                BFS
              </button>
              <button
                className={`btn btn-pill ${algorithmTab === 'dfs' ? 'btn-active' : ''}`}
                type="button"
                disabled={blockGraphEdits && !isTraversalRunning}
                onClick={() => onAlgorithmTabChange('dfs')}
              >
                DFS
              </button>
            </div>
          </div>

          <div className="sidebar-section algorithm-inputs-section">
            <h3>Inputs</h3>
            <label className="field">
              <span>
                Start node <span className="required-indicator" aria-hidden="true">*</span>
              </span>
              <input
                type="text"
                value={startNodeLabel}
                onChange={(event) => onStartNodeLabelChange(event.target.value)}
                onKeyDown={confirmNodeLabelFieldOnEnter}
                disabled={blockGraphEdits}
              />
            </label>
            <label className="field">
              <span>Goal type</span>
              <select
                value={goalType}
                onChange={(event) => onGoalTypeChange(event.target.value as GoalType)}
                disabled={blockGraphEdits}
              >
                <option value="target-node">Target node</option>
                <option value="target-value">Target value</option>
                <option value="max-value">Find max value</option>
                <option value="min-value">Find min value</option>
              </select>
            </label>
            {goalType === 'target-node' && (
              <label className="field">
                <span>
                  Goal node <span className="required-indicator" aria-hidden="true">*</span>
                </span>
                <input
                  type="text"
                  value={goalNodeLabel}
                  onChange={(event) => onGoalNodeLabelChange(event.target.value)}
                  onKeyDown={confirmNodeLabelFieldOnEnter}
                  disabled={blockGraphEdits}
                />
              </label>
            )}
            {goalType === 'target-value' && (
              <label className="field">
                <span>
                  Goal value <span className="required-indicator" aria-hidden="true">*</span>
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={goalValueInput}
                  onChange={(event) => onGoalValueInputChange(event.target.value)}
                  disabled={blockGraphEdits}
                />
              </label>
            )}
            {(goalType === 'max-value' || goalType === 'min-value') && (
              <p className="hint">No extra input needed for this goal.</p>
            )}
          </div>

          <div className="sidebar-section sidebar-section--traversal-playback">
            <h3>Playback</h3>
            <div className="playback">
              <button
                className={`btn playback-run-btn ${isTraversalRunning ? 'btn-active' : ''}`}
                type="button"
                onClick={isTraversalRunning ? onStopTraversal : onRunTraversal}
                disabled={
                  !isTraversalRunning &&
                  (!canRunTraversal || isConnectedComponentsSessionActive)
                }
              >
                {isTraversalRunning ? `Stop ${algoShort}` : `Run ${algoShort}`}
              </button>
              <div className="playback-step-controls">
                <button
                  className="btn playback-control-btn"
                  type="button"
                  onClick={onPreviousTraversalStep}
                  disabled={!canStepBackward}
                >
                  Previous
                </button>
                <button
                  className={`btn playback-control-btn ${isTraversalPlaying ? 'btn-active' : ''}`}
                  type="button"
                  onClick={isTraversalPlaying ? onPauseTraversal : onPlayTraversal}
                  disabled={!canTogglePlay}
                >
                  {isTraversalPlaying ? 'Pause' : isTraversalPlaybackComplete ? 'Replay' : 'Play'}
                </button>
                <button
                  className="btn playback-control-btn"
                  type="button"
                  onClick={onNextTraversalStep}
                  disabled={!canStepForward}
                >
                  Next
                </button>
              </div>
              <label className="field playback-speed-field">
                <span>Speed</span>
                <input
                  className="slider"
                  type="range"
                  min={0}
                  max={100}
                  step="any"
                  value={traversalPlaybackSpeed}
                  onChange={(event) => onTraversalPlaybackSpeedChange(Number(event.target.value))}
                  disabled={!canTogglePlay}
                />
              </label>
            </div>
          </div>

          <div className="sidebar-traversal-status">
            <p className="hint">{traversalStatusText}</p>
          </div>
        </div>
      )}

      {activePage === 'algorithms' && (
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
            <div className="playback">
              {isComponentsMode ? (
                <>
                  <button
                    className={`btn playback-run-btn ${isConnectedComponentsSessionActive ? 'btn-active' : ''}`}
                    type="button"
                    onClick={toggleConnectedComponentsRun}
                    disabled={
                      isTraversalRunning ||
                      (!isConnectedComponentsSessionActive && !canRunConnectedComponents)
                    }
                  >
                    {isConnectedComponentsSessionActive ? 'Stop run' : selectedAlgorithm.runLabel}
                  </button>
                  <div className="playback-step-controls">
                    <button
                      className="btn playback-control-btn"
                      type="button"
                      onClick={onPreviousConnectedComponentsStep}
                      disabled={!canConnectedComponentsStepBackward || isTraversalRunning}
                    >
                      Previous
                    </button>
                    <button
                      className={`btn playback-control-btn ${isConnectedComponentsPlaybackPlaying ? 'btn-active' : ''}`}
                      type="button"
                      onClick={
                        isConnectedComponentsPlaybackPlaying
                          ? onPauseConnectedComponents
                          : onPlayConnectedComponents
                      }
                      disabled={!canConnectedComponentsTogglePlay || isTraversalRunning}
                    >
                      {isConnectedComponentsPlaybackPlaying
                        ? 'Pause'
                        : isConnectedComponentsPlaybackComplete
                          ? 'Replay'
                          : 'Play'}
                    </button>
                    <button
                      className="btn playback-control-btn"
                      type="button"
                      onClick={onNextConnectedComponentsStep}
                      disabled={!canConnectedComponentsStepForward || isTraversalRunning}
                    >
                      Next
                    </button>
                  </div>
                  <label className="field playback-speed-field">
                    <span>Speed</span>
                    <input
                      className="slider"
                      type="range"
                      min={0}
                      max={100}
                      step="any"
                      value={connectedComponentsPlaybackSpeed}
                      onChange={(event) =>
                        onConnectedComponentsPlaybackSpeedChange(Number(event.target.value))
                      }
                      disabled={!canConnectedComponentsTogglePlay || isTraversalRunning}
                    />
                  </label>
                </>
              ) : (
                <>
                  <button
                    className={`btn playback-run-btn ${graphAlgoArmed ? 'btn-active' : ''}`}
                    type="button"
                    onClick={toggleGraphAlgoRun}
                    disabled={
                      !graphAlgoArmed &&
                      (isTraversalRunning || isConnectedComponentsSessionActive)
                    }
                  >
                    {graphAlgoArmed ? 'Stop run' : selectedAlgorithm.runLabel}
                  </button>
                  <div className="playback-step-controls">
                    <button
                      className="btn playback-control-btn"
                      type="button"
                      onClick={() => graphAlgoPlayback.stepBackward()}
                      disabled={
                        !graphAlgoPlayback.canStepBackward ||
                        isTraversalRunning ||
                        isConnectedComponentsSessionActive
                      }
                    >
                      Previous
                    </button>
                    <button
                      className={`btn playback-control-btn ${graphAlgoPlayback.isPlaying ? 'btn-active' : ''}`}
                      type="button"
                      onClick={() => graphAlgoPlayback.togglePlay()}
                      disabled={
                        !graphAlgoPlayback.canTogglePlay ||
                        isTraversalRunning ||
                        isConnectedComponentsSessionActive
                      }
                    >
                      {graphAlgoPlayback.isPlaying ? 'Pause' : graphAlgoPlayback.isPlaybackComplete ? 'Replay' : 'Play'}
                    </button>
                    <button
                      className="btn playback-control-btn"
                      type="button"
                      onClick={() => graphAlgoPlayback.stepForward()}
                      disabled={
                        !graphAlgoPlayback.canStepForward ||
                        isTraversalRunning ||
                        isConnectedComponentsSessionActive
                      }
                    >
                      Next
                    </button>
                  </div>
                  <label className="field playback-speed-field">
                    <span>Speed</span>
                    <input
                      className="slider"
                      type="range"
                      min={0}
                      max={100}
                      step="any"
                      value={graphAlgoPlayback.playbackSpeed}
                      onChange={(event) =>
                        graphAlgoPlayback.setPlaybackSpeed(Number(event.target.value))
                      }
                      disabled={
                        !graphAlgoPlayback.canTogglePlay ||
                        isTraversalRunning ||
                        isConnectedComponentsSessionActive
                      }
                    />
                  </label>
                </>
              )}
            </div>
            <p className="hint">{graphAlgoPlaybackHint}</p>
          </div>

          <div className="sidebar-section">
            <h3>Output</h3>
            <div className="algorithm-output">
              <div className="output-row">
                <span className="output-label">Playback step</span>
                <span className="output-value">
                  {playbackStepDisplay}
                </span>
              </div>

              {isComponentsMode ? (
                <>
                  <div className="output-row">
                    <span className="output-label">Components found</span>
                    <span className="output-value">
                      {connectedComponentsOutput !== null
                        ? connectedComponentsOutput.componentCount
                        : '—'}
                    </span>
                  </div>
                  <div className="output-row">
                    <span className="output-label">Largest size</span>
                    <span className="output-value">
                      {connectedComponentsOutput !== null
                        ? connectedComponentsOutput.largestSize
                        : '—'}
                    </span>
                  </div>
                  <div className="output-row output-row--stacked">
                    <span className="output-label">Groups</span>
                    <div className="output-list">
                      {connectedComponentsOutput !== null
                        ? connectedComponentsOutput.groupsText
                        : '—'}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="output-row">
                    <span className="output-label">{selectedAlgorithm.outputLabel}</span>
                    <span className="output-value">—</span>
                  </div>
                  <p className="hint">{selectedAlgorithm.outputHint}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
