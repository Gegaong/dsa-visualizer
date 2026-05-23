import { GRAPH_PRESETS, WEIGHTED_GRAPH_PRESETS } from '../../utils/presets'

import type { CanvasSetupPageProps } from './sidebarTypes'

// Sidebar page: bulk fill / reset tools (node values in graph mode, edge weights in
// weighted mode) and graph presets. Labels swap based on isWeightedMode.
export const CanvasSetupPage = ({
  blockGraphEdits,
  isWeightedMode,
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
  heuristicPixelsPerUnit,
  onHeuristicPixelsPerUnitChange,
  onHeuristicPixelsPerUnitBlur,
  distanceMode,
  onDistanceModeChange,
}: CanvasSetupPageProps) => (
  <div className="sidebar-page-body">
    {isWeightedMode && (
      <div className="sidebar-section">
        <h3>Heuristic scale</h3>
        <label className="field">
          <span>1 unit =</span>
          <div className="field-inline-unit">
            <input
              type="text"
              inputMode="numeric"
              value={heuristicPixelsPerUnit}
              onChange={onHeuristicPixelsPerUnitChange}
              onBlur={onHeuristicPixelsPerUnitBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
            />
            <span className="field-unit-suffix">px</span>
          </div>
        </label>
        <label className="field-toggle">
          <input
            className="toggle-input"
            type="checkbox"
            checked={distanceMode}
            onChange={(e) => onDistanceModeChange(e.target.checked)}
            disabled={blockGraphEdits}
          />
          <span className="toggle-label">Use node distances as weights</span>
          <span className="toggle-track">
            <span className="toggle-thumb" />
          </span>
        </label>
      </div>
    )}

    <div className="sidebar-section">
      <h3>{isWeightedMode ? 'Edge weights' : 'Node values'}</h3>
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
          disabled={!canFillEmpty || blockGraphEdits || distanceMode}
        >
          {isWeightedMode ? 'Randomize default weights' : 'Fill empty values'}
        </button>
        <button
          className="btn"
          type="button"
          onClick={onEmptyAllValues}
          disabled={!canEmptyAll || blockGraphEdits || distanceMode}
        >
          {isWeightedMode ? 'Reset all weights to 1' : 'Empty all values'}
        </button>
      </div>
    </div>

    <div className="sidebar-section">
      <h3>Presets</h3>
      {(isWeightedMode ? WEIGHTED_GRAPH_PRESETS : GRAPH_PRESETS).map((preset) => (
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
