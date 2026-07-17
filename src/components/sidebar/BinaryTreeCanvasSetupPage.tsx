import type { ChangeEvent, KeyboardEvent } from 'react'

import type { BinaryTreePreset } from '../../types'
import { BINARY_TREE_PRESETS } from '../../utils/binaryTreePresets'

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
  onPresetClick: (preset: BinaryTreePreset) => void
  presetsDisabled?: boolean
}

// Sidebar page: bulk fill/reset tools for node values, plus tree/BST presets.
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
  onPresetClick,
  presetsDisabled = false,
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
      {BINARY_TREE_PRESETS.map((preset) => (
        <button
          key={preset.id}
          className="btn btn-ghost"
          type="button"
          disabled={presetsDisabled}
          onClick={() => onPresetClick(preset)}
        >
          {preset.name}
        </button>
      ))}
    </div>
  </div>
)
