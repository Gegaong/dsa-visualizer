import { useState } from 'react'
import { AlgorithmInfoCard } from './AlgorithmInfoCard'
import { PlaybackControls } from './PlaybackControls'
import { StepExplanation } from './StepExplanation'
import type { GridOutput, ForLoopScanMode, GridSearchMode } from '../../hooks/useForLoopBFSPlayback'

type ScanCorner = 'tl' | 'tr' | 'bl' | 'br'

const CORNER_ICONS: Record<ScanCorner, string> = { tl: '↖', tr: '↗', bl: '↙', br: '↘' }
const DIRECTION_LABELS: Record<ScanCorner, { h: string; v: string }> = {
  tl: { h: '→ ↓', v: '↓ →' },
  tr: { h: '← ↓', v: '↓ ←' },
  bl: { h: '→ ↑', v: '↑ →' },
  br: { h: '← ↑', v: '↑ ←' },
}

const MODE_LABELS: Record<GridSearchMode, string> = {
  'for-bfs': 'For Loop — BFS',
  'for-dfs': 'For Loop — DFS',
  'bfs-bfs': 'BFS — BFS',
  'bfs-dfs': 'BFS — DFS',
  'dfs-bfs': 'DFS — BFS',
  'dfs-dfs': 'DFS — DFS',
}

type GridSidebarProps = {
  mode: GridSearchMode
  onModeChange: (mode: GridSearchMode) => void
  isRunning: boolean
  canRun: boolean
  statusText: string
  currentExplanation: string
  gridOutput: GridOutput | null
  stepIndex: number
  stepCount: number
  isPlaying: boolean
  playbackSpeed: number
  isPlaybackComplete: boolean
  canStepBackward: boolean
  canStepForward: boolean
  canTogglePlay: boolean
  isPickingStart: boolean
  bfsStartCells: Set<string>
  dfsStartCell: string | null
  onTogglePickStart: () => void
  onRun: (mode: GridSearchMode, scanMode: ForLoopScanMode) => void
  onStop: () => void
  onStepForward: () => void
  onStepBackward: () => void
  onTogglePlay: () => void
  onSpeedChange: (v: number) => void
}

// Returns the playback step counter — "Ready / N" before the first step, then "i / N".
function formatStepDisplay(stepIndex: number, stepCount: number): string {
  if (stepIndex >= 0) return `${stepIndex + 1} / ${stepCount}`
  return `Ready / ${stepCount}`
}

export const GridSidebar = ({
  mode,
  onModeChange,
  isRunning,
  canRun,
  statusText,
  currentExplanation,
  gridOutput,
  stepIndex,
  stepCount,
  isPlaying,
  playbackSpeed,
  isPlaybackComplete,
  canStepBackward,
  canStepForward,
  canTogglePlay,
  isPickingStart,
  bfsStartCells,
  dfsStartCell,
  onTogglePickStart,
  onRun,
  onStop,
  onStepForward,
  onStepBackward,
  onTogglePlay,
  onSpeedChange,
}: GridSidebarProps) => {
  const [scanCorner, setScanCorner] = useState<ScanCorner>('tl')
  const [scanPrimary, setScanPrimary] = useState<'h' | 'v'>('h')

  const isOuterMode = !mode.startsWith('for')
  const isBfsOuter = mode.startsWith('bfs')

  const handleRunToggle = () => {
    if (isRunning) onStop()
    else onRun(mode, `${scanCorner}-${scanPrimary}` as ForLoopScanMode)
  }

  const startPointCount = isBfsOuter ? bfsStartCells.size : (dfsStartCell !== null ? 1 : 0)

  return (
    <aside className="sidebar is-grid-search">
      <div className="sidebar-page-switch">
        <button className="sidebar-page-tab is-active" type="button">
          Search setup
        </button>
      </div>
      <div className="sidebar-page-body sidebar-page-body--grid">
        <div className="sidebar-section algorithm-config-section">
          <h3>Search strategy</h3>
          <div className="algorithm-config-content">
            <label className="field algorithm-mode-field">
              <span>Outer — Inner</span>
              <select
                value={mode}
                disabled={isRunning}
                onChange={(e) => onModeChange(e.target.value as GridSearchMode)}
              >
                {(Object.keys(MODE_LABELS) as GridSearchMode[]).map(key => (
                  <option key={key} value={key}>{MODE_LABELS[key]}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {mode === 'for-bfs' && <AlgorithmInfoCard infoKey="grid-for-bfs" />}
        {mode === 'for-dfs' && <AlgorithmInfoCard infoKey="grid-for-dfs" />}
        {mode === 'bfs-bfs' && <AlgorithmInfoCard infoKey="grid-bfs-bfs" />}
        {mode === 'bfs-dfs' && <AlgorithmInfoCard infoKey="grid-bfs-dfs" />}
        {mode === 'dfs-bfs' && <AlgorithmInfoCard infoKey="grid-dfs-bfs" />}
        {mode === 'dfs-dfs' && <AlgorithmInfoCard infoKey="grid-dfs-dfs" />}

        {/* Corner + direction pickers: only for for-loop modes */}
        {!isOuterMode && (
          <div className="sidebar-section algorithm-config-section">
            <div className="scan-start-row">
              <div className="field">
                <span>Start corner</span>
                <div className="scan-corner-picker">
                  {(['tl', 'tr', 'bl', 'br'] as ScanCorner[]).map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`scan-corner-btn${scanCorner === c ? ' active' : ''}`}
                      disabled={isRunning}
                      onClick={() => setScanCorner(c)}
                    >
                      {CORNER_ICONS[c]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span>Direction</span>
                <div className="grid-connectivity-toggle scan-direction-toggle">
                  <button
                    type="button"
                    className={scanPrimary === 'h' ? 'active' : ''}
                    disabled={isRunning}
                    onClick={() => setScanPrimary('h')}
                  >
                    {DIRECTION_LABELS[scanCorner].h}
                  </button>
                  <button
                    type="button"
                    className={scanPrimary === 'v' ? 'active' : ''}
                    disabled={isRunning}
                    onClick={() => setScanPrimary('v')}
                  >
                    {DIRECTION_LABELS[scanCorner].v}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Start cell picker: only for outer BFS / DFS modes */}
        {isOuterMode && (
          <div className="sidebar-section">
            <h3>
              {isBfsOuter ? 'Start points' : 'Start point'}
              <span className="h3-optional"> (optional)</span>
            </h3>
            <button
              type="button"
              className={`btn btn-pill${isPickingStart ? ' btn-active' : ''}`}
              disabled={isRunning}
              onClick={onTogglePickStart}
            >
              {isPickingStart ? 'Cancel' : (isBfsOuter ? 'Pick start points' : 'Pick start point')}
            </button>
            {isPickingStart && (
              <p className="hint">
                {isBfsOuter
                  ? 'Click cells on the grid to add start points. Click a marked cell again to remove it.'
                  : 'Click a cell on the grid to set the start point.'}
              </p>
            )}
            {!isPickingStart && startPointCount > 0 && (
              <span className="start-pick-count">
                {startPointCount} {startPointCount === 1 ? 'point' : 'points'} selected
              </span>
            )}
          </div>
        )}

        <div className="sidebar-section sidebar-section--grid-playback">
          <h3>Playback</h3>
          <PlaybackControls
            runLabel={`Run ${MODE_LABELS[mode]}`}
            stopLabel={`Stop ${MODE_LABELS[mode]}`}
            isRunActive={isRunning}
            onRunToggle={handleRunToggle}
            runDisabled={!isRunning && !canRun}
            onPrevious={onStepBackward}
            onNext={onStepForward}
            onPlayPauseToggle={onTogglePlay}
            isPlaying={isPlaying}
            isPlaybackComplete={isPlaybackComplete}
            canStepBackward={canStepBackward}
            canStepForward={canStepForward}
            canTogglePlay={canTogglePlay}
            speed={playbackSpeed}
            onSpeedChange={onSpeedChange}
          />
          {isRunning
            ? <p className="hint">Step {formatStepDisplay(stepIndex, stepCount)} — {statusText}</p>
            : <p className="hint">{statusText}</p>
          }
          <StepExplanation text={currentExplanation} />
        </div>

        <div className="sidebar-section">
          <h3>Output</h3>
          <div className="algorithm-output">
            <div className="output-row">
              <span className="output-label">Islands found</span>
              <span className="output-value">
                {gridOutput !== null ? gridOutput.islandCount : '—'}
              </span>
            </div>
            <div className="output-row">
              <span className="output-label">Steps to find all</span>
              <span className="output-value">
                {gridOutput !== null ? gridOutput.discoverySteps : '—'}
              </span>
            </div>
            <div className="output-row">
              <span className="output-label">Total steps</span>
              <span className="output-value">
                {gridOutput !== null ? gridOutput.totalSteps : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
