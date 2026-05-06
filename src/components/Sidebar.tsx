import type { GoalType, GraphPreset } from '../types'
import { GRAPH_PRESETS } from '../utils/presets'

type SidebarProps = {
  goalType: GoalType
  onGoalTypeChange: (type: GoalType) => void
  fillMin: string
  fillMax: string
  onFillMinChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onFillMaxChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onFillRangeBlur: () => void
  onFillRangeKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  onFillNullValues: () => void
  canFillNulls: boolean
  onNullifyAll: () => void
  canNullify: boolean
  onPresetClick: (preset: GraphPreset) => void
}

// Right-side control panel: algorithm picker, inputs, fill values, playback, and presets.
export const Sidebar = ({
  goalType,
  onGoalTypeChange,
  fillMin,
  fillMax,
  onFillMinChange,
  onFillMaxChange,
  onFillRangeBlur,
  onFillRangeKeyDown,
  onFillNullValues,
  canFillNulls,
  onNullifyAll,
  canNullify,
  onPresetClick,
}: SidebarProps) => (
  <aside className="sidebar">
    <div className="sidebar-section">
      <h3>Algorithm</h3>
      <div className="pill-group">
        <button className="btn btn-pill btn-active" type="button">
          BFS
        </button>
        <button className="btn btn-pill" type="button">
          DFS
        </button>
      </div>
    </div>

    <div className="sidebar-section">
      <h3>Inputs</h3>
      <label className="field">
        <span>Start node</span>
        <input type="text" placeholder="A" />
      </label>
      <label className="field">
        <span>Goal type</span>
        <select
          value={goalType}
          onChange={(event) => onGoalTypeChange(event.target.value as GoalType)}
        >
          <option value="target-node">Target node</option>
          <option value="target-value">Target value</option>
          <option value="max-value">Find max value</option>
          <option value="min-value">Find min value</option>
        </select>
      </label>
      {goalType === 'target-node' && (
        <label className="field">
          <span>Goal node</span>
          <input type="text" placeholder="F" />
        </label>
      )}
      {goalType === 'target-value' && (
        <label className="field">
          <span>Goal value</span>
          <input type="number" placeholder="10" />
        </label>
      )}
      {(goalType === 'max-value' || goalType === 'min-value') && (
        <p className="hint">No extra input needed for this goal.</p>
      )}
    </div>

    <div className="sidebar-section">
      <h3>Fill values</h3>
      <label className="field">
        <span>Minimum</span>
        <input
          type="text"
          inputMode="numeric"
          value={fillMin}
          onChange={onFillMinChange}
          onBlur={onFillRangeBlur}
          onKeyDown={onFillRangeKeyDown}
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
        />
      </label>
      <div className="fill-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={onFillNullValues}
          disabled={!canFillNulls}
        >
          Fill null values
        </button>
        <button
          className="btn"
          type="button"
          onClick={onNullifyAll}
          disabled={!canNullify}
        >
          Nullify all values
        </button>
      </div>
    </div>

    <div className="sidebar-section">
      <h3>Playback</h3>
      <div className="playback">
        <button className="btn btn-ghost" type="button">
          Play
        </button>
        <button className="btn btn-ghost" type="button">
          Pause
        </button>
        <button className="btn btn-ghost" type="button">
          Step
        </button>
      </div>
      <input className="slider" type="range" min="0" max="10" />
    </div>

    <div className="sidebar-section">
      <h3>Presets</h3>
      {GRAPH_PRESETS.map((preset) => (
        <button
          key={preset.id}
          className="btn btn-ghost"
          type="button"
          onClick={() => onPresetClick(preset)}
        >
          {preset.name}
        </button>
      ))}
    </div>
  </aside>
)
