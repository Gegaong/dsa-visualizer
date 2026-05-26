import { useState } from 'react'
import { AlgorithmInfoCard } from './AlgorithmInfoCard'
import { PlaybackControls } from './PlaybackControls'
import { StepExplanation } from './StepExplanation'
import type { GridOutput, ForLoopScanMode } from '../../hooks/useForLoopBFSPlayback'

type ScanCorner = 'tl' | 'tr' | 'bl' | 'br'

const CORNER_ICONS: Record<ScanCorner, string> = { tl: '↖', tr: '↗', bl: '↙', br: '↘' }
const DIRECTION_LABELS: Record<ScanCorner, { h: string; v: string }> = {
  tl: { h: '→ ↓', v: '↓ →' },
  tr: { h: '← ↓', v: '↓ ←' },
  bl: { h: '→ ↑', v: '↑ →' },
  br: { h: '← ↑', v: '↑ ←' },
}

type GridSearchMode =
  | 'for-bfs'
  | 'for-dfs'
  | 'bfs-bfs'
  | 'bfs-dfs'
  | 'dfs-bfs'
  | 'dfs-dfs'

const MODE_LABELS: Record<GridSearchMode, string> = {
  'for-bfs': 'For Loop — BFS',
  'for-dfs': 'For Loop — DFS',
  'bfs-bfs': 'BFS — BFS',
  'bfs-dfs': 'BFS — DFS',
  'dfs-bfs': 'DFS — BFS',
  'dfs-dfs': 'DFS — DFS',
}

type GridSidebarProps = {
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
  onRun: (mode: GridSearchMode, scanMode: ForLoopScanMode) => void
  onStop: () => void
  onStepForward: () => void
  onStepBackward: () => void
  onTogglePlay: () => void
  onSpeedChange: (v: number) => void
}

// Returns a human-readable step counter; shows "Ready / N" before playback begins.
function formatStepDisplay(isRunning: boolean, stepIndex: number, stepCount: number): string {
  if (!isRunning || stepCount === 0) return '—'
  if (stepIndex >= 0) return `${stepIndex + 1} / ${stepCount}`
  return `Ready / ${stepCount}`
}

export const GridSidebar = ({
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
  onRun,
  onStop,
  onStepForward,
  onStepBackward,
  onTogglePlay,
  onSpeedChange,
}: GridSidebarProps) => {
  const [mode, setMode] = useState<GridSearchMode>('for-bfs')
  const [scanCorner, setScanCorner] = useState<ScanCorner>('tl')
  const [scanPrimary, setScanPrimary] = useState<'h' | 'v'>('h')

  const handleRunToggle = () => {
    if (isRunning) onStop()
    else onRun(mode, `${scanCorner}-${scanPrimary}` as ForLoopScanMode)
  }

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
                onChange={(e) => setMode(e.target.value as GridSearchMode)}
              >
                {(Object.keys(MODE_LABELS) as GridSearchMode[]).map(key => (
                  <option key={key} value={key}>{MODE_LABELS[key]}</option>
                ))}
              </select>
            </label>
          </div>
          {mode.startsWith('for') && (
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
          )}
        </div>

        {mode === 'for-bfs' && <AlgorithmInfoCard infoKey="grid-for-bfs" />}
        {mode === 'for-dfs' && <AlgorithmInfoCard infoKey="grid-for-dfs" />}

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
          <p className="hint">Step {formatStepDisplay(isRunning, stepIndex, stepCount)} — {statusText}</p>
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
