import type { GoalType, GraphPreset } from '../types'
import { useState } from 'react'
import { GRAPH_PRESETS } from '../utils/presets'

type GraphAlgorithmTab = 'bfs' | 'dfs'
type TraversalStrategy = 'bfs' | 'dfs'
type AlgorithmMode =
  | 'components'
  | 'cycle'
  | 'bipartite'
  | 'shortest-path'
  | 'topological-sort'

type SidebarProps = {
  algorithmTab: GraphAlgorithmTab
  onAlgorithmTabChange: (tab: GraphAlgorithmTab) => void
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
  isTraversalRunning: boolean
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
}

type SidebarPage = 'canvas' | 'traversal' | 'algorithms'

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
}: SidebarProps) => {
  const [activePage, setActivePage] = useState<SidebarPage>('canvas')
  const [algorithmMode, setAlgorithmMode] = useState<AlgorithmMode>('components')
  const [algorithmTraversal, setAlgorithmTraversal] = useState<TraversalStrategy>('bfs')
  const [shortestPathStart, setShortestPathStart] = useState('')
  const [shortestPathGoal, setShortestPathGoal] = useState('')
  const algoShort = algorithmTab === 'dfs' ? 'DFS' : 'BFS'
  const needsTraversalStrategy =
    algorithmMode === 'components' ||
    algorithmMode === 'cycle' ||
    algorithmMode === 'bipartite'
  const needsAlgorithmInputs = algorithmMode === 'shortest-path'

  // Enter confirms the field by moving focus away (same idea as “done typing”).
  const confirmNodeLabelFieldOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    }
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
                disabled={isTraversalRunning}
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
                disabled={isTraversalRunning}
              />
            </label>
            <div className="fill-actions">
              <button
                className="btn btn-primary"
                type="button"
                onClick={onFillEmptyValues}
                disabled={!canFillEmpty || isTraversalRunning}
              >
                Fill empty values
              </button>
              <button
                className="btn"
                type="button"
                onClick={onNullifyEmptyValues}
                disabled={!canNullifyEmpty || isTraversalRunning}
              >
                Nullify all empty values
              </button>
              <button
                className="btn"
                type="button"
                onClick={onEmptyAllValues}
                disabled={!canEmptyAll || isTraversalRunning}
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
                disabled={isTraversalRunning}
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
                disabled={isTraversalRunning}
                onClick={() => onAlgorithmTabChange('bfs')}
              >
                BFS
              </button>
              <button
                className={`btn btn-pill ${algorithmTab === 'dfs' ? 'btn-active' : ''}`}
                type="button"
                disabled={isTraversalRunning}
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
                disabled={isTraversalRunning}
              />
            </label>
            <label className="field">
              <span>Goal type</span>
              <select
                value={goalType}
                onChange={(event) => onGoalTypeChange(event.target.value as GoalType)}
                disabled={isTraversalRunning}
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
                  disabled={isTraversalRunning}
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
                  disabled={isTraversalRunning}
                />
              </label>
            )}
            {(goalType === 'max-value' || goalType === 'min-value') && (
              <p className="hint">No extra input needed for this goal.</p>
            )}
          </div>

          <div className="sidebar-section">
            <h3>Playback</h3>
            <div className="playback">
              <button
                className={`btn playback-run-btn ${isTraversalRunning ? 'btn-active' : ''}`}
                type="button"
                onClick={isTraversalRunning ? onStopTraversal : onRunTraversal}
                disabled={!isTraversalRunning && !canRunTraversal}
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
            <p className="hint">{traversalStatusText}</p>
          </div>
        </div>
      )}

      {activePage === 'algorithms' && (
        <div className="sidebar-page-body">
          <div className="sidebar-section">
            <h3>Algorithm</h3>
            <div className="pill-group">
              <button
                className={`btn btn-pill ${algorithmMode === 'components' ? 'btn-active' : ''}`}
                type="button"
                disabled={isTraversalRunning}
                onClick={() => setAlgorithmMode('components')}
              >
                Connected components
              </button>
              <button
                className={`btn btn-pill ${algorithmMode === 'cycle' ? 'btn-active' : ''}`}
                type="button"
                disabled={isTraversalRunning}
                onClick={() => setAlgorithmMode('cycle')}
              >
                Cycle detection
              </button>
              <button
                className={`btn btn-pill ${algorithmMode === 'bipartite' ? 'btn-active' : ''}`}
                type="button"
                disabled={isTraversalRunning}
                onClick={() => setAlgorithmMode('bipartite')}
              >
                Bipartite check
              </button>
              <button
                className={`btn btn-pill ${algorithmMode === 'shortest-path' ? 'btn-active' : ''}`}
                type="button"
                disabled={isTraversalRunning}
                onClick={() => setAlgorithmMode('shortest-path')}
              >
                Shortest path
              </button>
              <button
                className={`btn btn-pill ${algorithmMode === 'topological-sort' ? 'btn-active' : ''}`}
                type="button"
                disabled={isTraversalRunning}
                onClick={() => setAlgorithmMode('topological-sort')}
              >
                Topological sort
              </button>
            </div>
          </div>

          {needsTraversalStrategy && (
            <div className="sidebar-section">
              <h3>Traversal strategy</h3>
              <div className="pill-group">
                <button
                  className={`btn btn-pill ${algorithmTraversal === 'bfs' ? 'btn-active' : ''}`}
                  type="button"
                  disabled={isTraversalRunning}
                  onClick={() => setAlgorithmTraversal('bfs')}
                >
                  BFS
                </button>
                <button
                  className={`btn btn-pill ${algorithmTraversal === 'dfs' ? 'btn-active' : ''}`}
                  type="button"
                  disabled={isTraversalRunning}
                  onClick={() => setAlgorithmTraversal('dfs')}
                >
                  DFS
                </button>
              </div>
            </div>
          )}

          {needsAlgorithmInputs && (
            <div className="sidebar-section algorithm-inputs-section">
              <h3>Inputs</h3>
              <label className="field">
                <span>
                  Start node <span className="required-indicator" aria-hidden="true">*</span>
                </span>
                <input
                  type="text"
                  value={shortestPathStart}
                  onChange={(event) => setShortestPathStart(event.target.value.toUpperCase())}
                  onKeyDown={confirmNodeLabelFieldOnEnter}
                  disabled={isTraversalRunning}
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
                  disabled={isTraversalRunning}
                />
              </label>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
