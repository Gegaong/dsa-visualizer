import type { ChangeEvent, KeyboardEvent } from 'react'

// Placeholder preset slots — real trees get chosen and wired in later.
const PRESET_PLACEHOLDERS = ['Preset 1', 'Preset 2', 'Preset 3', 'Preset 4', 'Preset 5']

export type BinaryTreeCanvasSetupPageProps = {
  fillMin: string
  fillMax: string
  onFillMinChange: (event: ChangeEvent<HTMLInputElement>) => void
  onFillMaxChange: (event: ChangeEvent<HTMLInputElement>) => void
  onFillRangeBlur: () => void
  onFillRangeKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onFillEmptyValues: () => void
  canFillEmpty: boolean
  onEmptyAllValues: () => void
  canEmptyAll: boolean
}

// Sidebar page: bulk fill/reset tools for node values, plus a future-presets section.
// Mirrors the graph canvas's CanvasSetupPage layout so both feel consistent.
export const BinaryTreeCanvasSetupPage = ({
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
}: BinaryTreeCanvasSetupPageProps) => (
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
          onClick={onFillEmptyValues}
          disabled={!canFillEmpty}
        >
          Fill empty values
        </button>
        <button
          className="btn"
          type="button"
          onClick={onEmptyAllValues}
          disabled={!canEmptyAll}
        >
          Empty all values
        </button>
      </div>
    </div>

    <div className="sidebar-section">
      <h3>Presets</h3>
      {PRESET_PLACEHOLDERS.map((label) => (
        <button
          key={label}
          className="btn btn-ghost"
          type="button"
          disabled
          title="Coming soon"
        >
          {label}
        </button>
      ))}
    </div>
  </div>
)
