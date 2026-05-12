import type { GoalType } from '../../types'
import type { TraversalPageProps } from './sidebarTypes'
import { PlaybackControls } from './PlaybackControls'
import { confirmNodeLabelFieldOnEnter } from './sidebarFieldHelpers'

// Sidebar page: BFS/DFS goal-traversal — strategy pills, goal inputs, playback, status line.
export const TraversalPage = ({
  blockGraphEdits,
  isTraversalRunning,
  isConnectedComponentsSessionActive,
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
}: TraversalPageProps) => {
  const algoShort = algorithmTab === 'dfs' ? 'DFS' : 'BFS'

  return (
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
        <PlaybackControls
          runLabel={`Run ${algoShort}`}
          stopLabel={`Stop ${algoShort}`}
          isRunActive={isTraversalRunning}
          onRunToggle={isTraversalRunning ? onStopTraversal : onRunTraversal}
          runDisabled={
            !isTraversalRunning && (!canRunTraversal || isConnectedComponentsSessionActive)
          }
          onPrevious={onPreviousTraversalStep}
          onNext={onNextTraversalStep}
          onPlayPauseToggle={isTraversalPlaying ? onPauseTraversal : onPlayTraversal}
          isPlaying={isTraversalPlaying}
          isPlaybackComplete={isTraversalPlaybackComplete}
          canStepBackward={canStepBackward}
          canStepForward={canStepForward}
          canTogglePlay={canTogglePlay}
          speed={traversalPlaybackSpeed}
          onSpeedChange={onTraversalPlaybackSpeedChange}
        />
      </div>

      <div className="sidebar-traversal-status">
        <p className="hint">{traversalStatusText}</p>
      </div>
    </div>
  )
}
