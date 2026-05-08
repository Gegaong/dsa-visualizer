import type { GoalType, GraphPreset } from '../types'
import { useState } from 'react'
import { GRAPH_PRESETS } from '../utils/presets'

type SidebarProps = {
  goalType: GoalType
  onGoalTypeChange: (type: GoalType) => void
  startNodeLabel: string
  onStartNodeLabelChange: (value: string) => void
  goalNodeLabel: string
  onGoalNodeLabelChange: (value: string) => void
  goalValueInput: string
  onGoalValueInputChange: (value: string) => void
  onRunBfs: () => void
  onStopBfs: () => void
  canRunBfs: boolean
  bfsStatusText: string
  isBfsRunning: boolean
  isBfsPlaying: boolean
  bfsPlaybackSpeed: number
  onBfsPlaybackSpeedChange: (value: number) => void
  onPlayBfs: () => void
  onPauseBfs: () => void
  onNextBfsStep: () => void
  onPreviousBfsStep: () => void
  canStepForward: boolean
  canStepBackward: boolean
  canTogglePlay: boolean
  isBfsPlaybackComplete: boolean
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

type SidebarPage = 'canvas' | 'algorithm'

// Right-side control panel: algorithm picker, inputs, fill values, playback, and presets.
export const Sidebar = ({
  goalType,
  onGoalTypeChange,
  startNodeLabel,
  onStartNodeLabelChange,
  goalNodeLabel,
  onGoalNodeLabelChange,
  goalValueInput,
  onGoalValueInputChange,
  onRunBfs,
  onStopBfs,
  canRunBfs,
  bfsStatusText,
  isBfsRunning,
  isBfsPlaying,
  bfsPlaybackSpeed,
  onBfsPlaybackSpeedChange,
  onPlayBfs,
  onPauseBfs,
  onNextBfsStep,
  onPreviousBfsStep,
  canStepForward,
  canStepBackward,
  canTogglePlay,
  isBfsPlaybackComplete,
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

  return (
    <aside
      className={`sidebar ${activePage === 'canvas' ? 'is-canvas-setup' : 'is-algorithm-setup'}`}
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
          className={`sidebar-page-tab ${activePage === 'algorithm' ? 'is-active' : ''}`}
          type="button"
          onClick={() => setActivePage('algorithm')}
        >
          Algorithm setup
        </button>
      </div>

      {activePage === 'canvas' && (
        <>
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
                disabled={isBfsRunning}
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
                disabled={isBfsRunning}
              />
            </label>
            <div className="fill-actions">
              <button
                className="btn btn-primary"
                type="button"
                onClick={onFillEmptyValues}
                disabled={!canFillEmpty || isBfsRunning}
              >
                Fill empty values
              </button>
              <button
                className="btn"
                type="button"
                onClick={onNullifyEmptyValues}
                disabled={!canNullifyEmpty || isBfsRunning}
              >
                Nullify all empty values
              </button>
              <button
                className="btn"
                type="button"
                onClick={onEmptyAllValues}
                disabled={!canEmptyAll || isBfsRunning}
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
                disabled={isBfsRunning}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </>
      )}

      {activePage === 'algorithm' && (
        <>
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

          <div className="sidebar-section algorithm-inputs-section">
            <h3>Inputs</h3>
            <label className="field">
              <span>Start node</span>
              <input
                type="text"
                value={startNodeLabel}
                onChange={(event) => onStartNodeLabelChange(event.target.value)}
                disabled={isBfsRunning}
              />
            </label>
            <label className="field">
              <span>Goal type</span>
              <select
                value={goalType}
                onChange={(event) => onGoalTypeChange(event.target.value as GoalType)}
                disabled={isBfsRunning}
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
                <input
                  type="text"
                  value={goalNodeLabel}
                  onChange={(event) => onGoalNodeLabelChange(event.target.value)}
                  disabled={isBfsRunning}
                />
              </label>
            )}
            {goalType === 'target-value' && (
              <label className="field">
                <span>Goal value</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={goalValueInput}
                  onChange={(event) => onGoalValueInputChange(event.target.value)}
                  disabled={isBfsRunning}
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
                className={`btn playback-run-btn ${isBfsRunning ? 'btn-active' : ''}`}
                type="button"
                onClick={isBfsRunning ? onStopBfs : onRunBfs}
                disabled={!isBfsRunning && !canRunBfs}
              >
                {isBfsRunning ? 'Stop BFS' : 'Run BFS'}
              </button>
              <div className="playback-step-controls">
                <button
                  className="btn playback-control-btn"
                  type="button"
                  onClick={onPreviousBfsStep}
                  disabled={!canStepBackward}
                >
                  Previous
                </button>
                <button
                  className="btn btn-primary playback-control-btn"
                  type="button"
                  onClick={isBfsPlaying ? onPauseBfs : onPlayBfs}
                  disabled={!canTogglePlay}
                >
                  {isBfsPlaying ? 'Pause' : isBfsPlaybackComplete ? 'Replay' : 'Play'}
                </button>
                <button
                  className="btn playback-control-btn"
                  type="button"
                  onClick={onNextBfsStep}
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
                  value={bfsPlaybackSpeed}
                  onChange={(event) => onBfsPlaybackSpeedChange(Number(event.target.value))}
                  disabled={!canTogglePlay}
                />
              </label>
            </div>
            <p className="hint">{bfsStatusText}</p>
          </div>
        </>
      )}
    </aside>
  )
}
