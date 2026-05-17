import { GRAPH_PRESETS } from '../../utils/presets'

import type { CanvasSetupPageProps } from './sidebarTypes'

// Sidebar page: bulk node-value tools (fill / empty-all) and graph presets.
export const CanvasSetupPage = ({
  blockGraphEdits,
  fillMin,
  fillMax,
  onFillMinChange,
  onFillMaxChange,
  onFillRangeBlur,
  onFillRangeKeyDown,
  onFillEmptyValues,
  canFillEmpty,
  onEmptyAllValues,
  canEmptyAll,
  onPresetClick,
}: CanvasSetupPageProps) => (
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
)
