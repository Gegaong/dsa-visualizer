import { useState } from 'react'
import { AlgorithmInfoCard } from '../AlgorithmInfoCard'
import { PlaybackControls } from '../PlaybackControls'
import { PseudocodePanel } from '../PseudocodePanel'
import type { GridOutput, ForLoopScanMode, GridSearchMode, GridSubPhase, GridPlaybackMode, GridStep } from '../../../hooks/useForLoopBFSPlayback'

type ScanCorner = 'tl' | 'tr' | 'bl' | 'br'

// The outer scan's two `for` lines depend on the start corner and primary axis, so the displayed
// pseudocode has to be built per scan mode rather than hardcoded to top-left/row-major.
// Both helpers always emit exactly one line each, keeping the highlight indices below valid
// across all 8 combinations.
const scanLoopLines = (corner: ScanCorner, primary: 'h' | 'v'): [string, string] => {
  const rowLoop = corner[0] === 't' ? 'for r ← 0 to rows-1' : 'for r ← rows-1 down to 0'
  const colLoop = corner[1] === 'l' ? 'for c ← 0 to cols-1' : 'for c ← cols-1 down to 0'
  // Horizontal primary → rows outermost; vertical primary → columns outermost.
  return primary === 'h' ? [rowLoop, colLoop] : [colLoop, rowLoop]
}

const scanOrderPhrase = (corner: ScanCorner, primary: 'h' | 'v'): string => {
  const vertical = corner[0] === 't' ? 'top-down' : 'bottom-up'
  const horizontal = corner[1] === 'l' ? 'left to right' : 'right to left'
  return primary === 'h'
    ? `row by row, ${vertical}, ${horizontal}.`
    : `column by column, ${horizontal}, ${vertical}.`
}

const forBfsCode = (corner: ScanCorner, primary: 'h' | 'v') => {
  const [outerLoop, innerLoop] = scanLoopLines(corner, primary)
  return `function SCAN(grid, rows, cols):
    islands ← []; visited ← {}
    ${outerLoop}:
        ${innerLoop}:
            if grid[r][c] = water → skip
            if (r,c) ∈ visited  → skip
            island ← BFS_FILL(r,c, grid, visited)
            islands.add(island)
    return islands

function BFS_FILL(start, grid, visited):
    island ← []
    queue ← [start]
    visited.add(start)
    while queue ≠ empty:
        cell ← queue.dequeue()
        island.add(cell)
        for each nb of cell in grid:
            if nb is land ∧ nb ∉ visited:
                visited.add(nb)
                queue.enqueue(nb)
    return island`
}

const forBfsLogic = (corner: ScanCorner, primary: 'h' | 'v') => `Go through every cell in the grid,
${scanOrderPhrase(corner, primary)}
──────────────────────────────────────────
For each cell:
  · Water → skip it.
  · Already part of a known island → skip it.

  · Land cell that hasn't been visited yet?
      This is the start of a new island.
      BFS expands outward in all directions,
      claiming every touching land cell,
      then their neighbors too, until
      no more connected land remains.
      ✓ New island found and recorded.
──────────────────────────────────────────
Once every cell has been checked,
all islands have been found.`

const forDfsCode = (corner: ScanCorner, primary: 'h' | 'v') => {
  const [outerLoop, innerLoop] = scanLoopLines(corner, primary)
  return `function SCAN(grid, rows, cols):
    islands ← []; visited ← {}
    ${outerLoop}:
        ${innerLoop}:
            if grid[r][c] = water → skip
            if (r,c) ∈ visited  → skip
            island ← DFS_FILL(r,c, grid, visited)
            islands.add(island)
    return islands

function DFS_FILL(start, grid, visited):
    island ← []
    stack ← [start]
    visited.add(start)
    while stack ≠ empty:
        cell ← stack.pop()
        island.add(cell)
        for each nb of cell in grid:
            if nb is land ∧ nb ∉ visited:
                visited.add(nb)
                stack.push(nb)
    return island`
}

const forDfsLogic = (corner: ScanCorner, primary: 'h' | 'v') => `Go through every cell in the grid,
${scanOrderPhrase(corner, primary)}
──────────────────────────────────────────
For each cell:
  · Water → skip it.
  · Already part of a known island → skip it.

  · Land cell that hasn't been visited yet?
      This is the start of a new island.
      DFS dives deep into connected land —
      following one path as far as it goes,
      then backtracking to try the rest,
      until every connected cell is visited.
      ✓ New island found and recorded.
──────────────────────────────────────────
Once every cell has been checked,
all islands have been found.`

const BFS_BFS_CODE = `function SCAN(grid, starts):
    queue ← starts; seen ← starts
    while queue ≠ empty:
        cell ← queue.dequeue()
        if cell ∈ visited  → skip
        visited.add(cell)
        if grid[cell] = water → enqueue nbs
        else → island ← BFS_FILL(cell, grid, visited)
    return islands

function BFS_FILL(start, grid, visited):
    queue ← [start]; visited.add(start)
    while queue ≠ empty:
        cell ← queue.dequeue()
        island.add(cell)
        for each nb of cell in grid:
            if nb is land ∧ nb ∉ visited:
                visited.add(nb)
                queue.enqueue(nb)
    return island`

const BFS_BFS_LOGIC = `BFS explores the grid outward from all
starting points at once, nearest cells first.
──────────────────────────────────────────
For each cell we reach:
  · Already visited → skip it.
    (already claimed by a previous island)
  · Water → mark it visited and keep
      expanding to its neighbors.

  · Unvisited land cell?
      This is the start of a new island.
      BFS expands outward in all directions,
      claiming every touching land cell,
      then their neighbors too, until
      no more connected land remains.
      ✓ New island found and recorded.
──────────────────────────────────────────
When there are no more cells to explore,
all islands have been found.`

const BFS_DFS_CODE = `function SCAN(grid, starts):
    queue ← starts; seen ← starts
    while queue ≠ empty:
        cell ← queue.dequeue()
        if cell ∈ visited  → skip
        visited.add(cell)
        if grid[cell] = water → enqueue nbs
        else → island ← DFS_FILL(cell, grid, visited)
    return islands

function DFS_FILL(start, grid, visited):
    stack ← [start]; visited.add(start)
    while stack ≠ empty:
        cell ← stack.pop()
        island.add(cell)
        for each nb of cell in grid:
            if nb is land ∧ nb ∉ visited:
                visited.add(nb)
                stack.push(nb)
    return island`

const BFS_DFS_LOGIC = `BFS explores the grid outward from all
starting points at once, nearest cells first.
──────────────────────────────────────────
For each cell we reach:
  · Already visited → skip it.
    (already claimed by a previous island)
  · Water → mark it visited and keep
      expanding to its neighbors.

  · Unvisited land cell?
      This is the start of a new island.
      DFS dives deep into connected land —
      following one path as far as it goes,
      then backtracking to try the rest,
      until every connected cell is visited.
      ✓ New island found and recorded.
──────────────────────────────────────────
When there are no more cells to explore,
all islands have been found.`

const DFS_BFS_CODE = `function SCAN(grid, start):
    stack ← [start]; seen ← [start]
    while stack ≠ empty:
        cell ← stack.pop()
        if cell ∈ visited  → skip
        visited.add(cell)
        if grid[cell] = water → push nbs
        else → island ← BFS_FILL(cell, grid, visited)
    return islands

function BFS_FILL(start, grid, visited):
    queue ← [start]; visited.add(start)
    while queue ≠ empty:
        cell ← queue.dequeue()
        island.add(cell)
        for each nb of cell in grid:
            if nb is land ∧ nb ∉ visited:
                visited.add(nb)
                queue.enqueue(nb)
    return island`

const DFS_BFS_LOGIC = `DFS explores the grid by going as deep as
possible from the starting point first.
──────────────────────────────────────────
For each cell we reach:
  · Already visited → skip it.
    (already claimed by a previous island)
  · Water → mark it visited and keep
      expanding to its neighbors.

  · Unvisited land cell?
      This is the start of a new island.
      BFS expands outward in all directions,
      claiming every touching land cell,
      then their neighbors too, until
      no more connected land remains.
      ✓ New island found and recorded.
──────────────────────────────────────────
When there are no more cells to explore,
all islands have been found.`

const DFS_DFS_CODE = `function SCAN(grid, start):
    stack ← [start]; seen ← [start]
    while stack ≠ empty:
        cell ← stack.pop()
        if cell ∈ visited  → skip
        visited.add(cell)
        if grid[cell] = water → push nbs
        else → island ← DFS_FILL(cell, grid, visited)
    return islands

function DFS_FILL(start, grid, visited):
    stack ← [start]; visited.add(start)
    while stack ≠ empty:
        cell ← stack.pop()
        island.add(cell)
        for each nb of cell in grid:
            if nb is land ∧ nb ∉ visited:
                visited.add(nb)
                stack.push(nb)
    return island`

const DFS_DFS_LOGIC = `DFS explores the grid by going as deep as
possible from the starting point first.
──────────────────────────────────────────
For each cell we reach:
  · Already visited → skip it.
    (already claimed by a previous island)
  · Water → mark it visited and keep
      expanding to its neighbors.

  · Unvisited land cell?
      This is the start of a new island.
      DFS dives deep into connected land —
      following one path as far as it goes,
      then backtracking to try the rest,
      until every connected cell is visited.
      ✓ New island found and recorded.
──────────────────────────────────────────
When there are no more cells to explore,
all islands have been found.`

// Line indices (0-based) to highlight per sub-phase for each pseudocode style.
// FOR-BFS and FOR-DFS share the same line structure — only the function name changes.
// Code: 22 lines (0–21). SCAN lines 0–8 + blank line 9 + FILL lines 10–21.
// Line 11 (`island ← []`) is start-only: the list is created once per island, not per step.
const FOR_CODE_HIGHLIGHTS: Record<GridSubPhase, number[]> = {
  'outer-water':     [2, 3, 4],
  'outer-visited':   [2, 3, 5],
  'inner-start':     [6, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  'inner-process':   [14, 15, 16, 17, 18, 19, 20],
  'bfs-outer-skip':  [],
  'bfs-outer-water': [],
  'dfs-outer-skip':  [],
  'dfs-outer-water': [],
}

const FOR_LOGIC_HIGHLIGHTS: Record<GridSubPhase, number[]> = {
  'outer-water':     [0, 1, 3, 4],
  'outer-visited':   [0, 1, 3, 5],
  'inner-start':     [7, 8, 9, 10, 11, 12, 13],
  'inner-process':   [7, 8, 9, 10, 11, 12, 13],
  'bfs-outer-skip':  [],
  'bfs-outer-water': [],
  'dfs-outer-skip':  [],
  'dfs-outer-water': [],
}

// BFS-BFS and BFS-DFS share the same line structure — only the inner function name changes.
const BFS_CODE_HIGHLIGHTS: Record<GridSubPhase, number[]> = {
  'bfs-outer-skip':  [2, 3, 4],
  'bfs-outer-water': [2, 3, 4, 5, 6],
  'inner-start':     [7, 11, 12, 13, 14, 15, 16, 17, 18],
  'inner-process':   [12, 13, 14, 15, 16, 17, 18],
  'outer-water':     [],
  'outer-visited':   [],
  'dfs-outer-skip':  [],
  'dfs-outer-water': [],
}

const BFS_LOGIC_HIGHLIGHTS: Record<GridSubPhase, number[]> = {
  'bfs-outer-skip':  [0, 1, 3, 4, 5],
  'bfs-outer-water': [0, 1, 3, 6, 7],
  'inner-start':     [9, 10, 11, 12, 13, 14, 15],
  'inner-process':   [9, 10, 11, 12, 13, 14, 15],
  'outer-water':     [],
  'outer-visited':   [],
  'dfs-outer-skip':  [],
  'dfs-outer-water': [],
}

// DFS-BFS and DFS-DFS share the same line structure — only the inner function name changes.
const DFS_CODE_HIGHLIGHTS: Record<GridSubPhase, number[]> = {
  'dfs-outer-skip':  [2, 3, 4],
  'dfs-outer-water': [2, 3, 4, 5, 6],
  'inner-start':     [7, 11, 12, 13, 14, 15, 16, 17, 18],
  'inner-process':   [12, 13, 14, 15, 16, 17, 18],
  'outer-water':     [],
  'outer-visited':   [],
  'bfs-outer-skip':  [],
  'bfs-outer-water': [],
}

const DFS_LOGIC_HIGHLIGHTS: Record<GridSubPhase, number[]> = {
  'dfs-outer-skip':  [0, 1, 3, 4, 5],
  'dfs-outer-water': [0, 1, 3, 6, 7],
  'inner-start':     [9, 10, 11, 12, 13, 14, 15],
  'inner-process':   [9, 10, 11, 12, 13, 14, 15],
  'outer-water':     [],
  'outer-visited':   [],
  'bfs-outer-skip':  [],
  'bfs-outer-water': [],
}

// lifecycle drives the pre-step and post-finish highlights, consistent with every other algorithm:
//   'ready' = session started, not yet stepped → the setup (signature + any pre-loop init; logic
//             shows the opening overview before the first divider).
//   'done'  = playback finished → the terminal `return islands` (code) and the closing conclusion (logic).
//   null    = mid-run → use the live sub-phase.
type GridLifecycle = 'ready' | 'done' | null

function getForHighlights(
  subPhase: GridSubPhase | null,
  isLogic: boolean,
  lifecycle: GridLifecycle,
  playbackMode: GridPlaybackMode,
  step: GridStep | null,
): Set<number> {
  if (lifecycle === 'ready') return new Set([0, 1])
  if (lifecycle === 'done') return new Set(isLogic ? [15, 16] : [8])
  if (!step) return new Set()

  if (playbackMode === 'code' && step.codeLine !== undefined) {
    if (isLogic) {
      return new Set(step.logicLines ?? [0, 1])
    }
    return new Set([step.codeLine])
  }

  if (!subPhase) return new Set()
  const map = isLogic ? FOR_LOGIC_HIGHLIGHTS : FOR_CODE_HIGHLIGHTS
  return new Set(map[subPhase])
}

function getBfsHighlights(
  subPhase: GridSubPhase | null,
  isLogic: boolean,
  lifecycle: GridLifecycle,
  playbackMode: GridPlaybackMode,
  step: GridStep | null,
): Set<number> {
  if (lifecycle === 'ready') return new Set([0, 1])
  if (lifecycle === 'done') return new Set(isLogic ? [17, 18] : [8])
  if (!step) return new Set()

  if (playbackMode === 'code' && step.codeLine !== undefined) {
    if (isLogic) {
      return new Set(step.logicLines ?? [0, 1])
    }
    return new Set([step.codeLine])
  }

  if (!subPhase) return new Set()
  const map = isLogic ? BFS_LOGIC_HIGHLIGHTS : BFS_CODE_HIGHLIGHTS
  return new Set(map[subPhase])
}

function getDfsHighlights(
  subPhase: GridSubPhase | null,
  isLogic: boolean,
  lifecycle: GridLifecycle,
  playbackMode: GridPlaybackMode,
  step: GridStep | null,
): Set<number> {
  if (lifecycle === 'ready') return new Set([0, 1])
  if (lifecycle === 'done') return new Set(isLogic ? [17, 18] : [8])
  if (!step) return new Set()

  if (playbackMode === 'code' && step.codeLine !== undefined) {
    if (isLogic) {
      return new Set(step.logicLines ?? [0, 1])
    }
    return new Set([step.codeLine])
  }

  if (!subPhase) return new Set()
  const map = isLogic ? DFS_LOGIC_HIGHLIGHTS : DFS_CODE_HIGHLIGHTS
  return new Set(map[subPhase])
}

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
  playbackMode: GridPlaybackMode
  onPlaybackModeChange: (mode: GridPlaybackMode) => void
  currentStep: GridStep | null
  isRunning: boolean
  canRun: boolean
  gridOutput: GridOutput | null
  stepIndex: number
  stepCount: number
  isPlaying: boolean
  playbackSpeed: number
  isPlaybackComplete: boolean
  canStepBackward: boolean
  canStepForward: boolean
  canTogglePlay: boolean
  currentSubPhase: GridSubPhase | null
  isPickingStart: boolean
  bfsStartCells: Set<string>
  dfsStartCell: string | null
  pseudocodeShowLogic: boolean
  onTogglePickStart: () => void
  onRun: (mode: GridSearchMode, scanMode: ForLoopScanMode) => void
  onStop: () => void
  onStepForward: () => void
  onStepBackward: () => void
  onTogglePlay: () => void
  onSpeedChange: (v: number) => void
  onPseudocodeFlip: () => void
}

// Returns the playback step counter — "Ready / N" before the first step, then "i / N".
function formatStepDisplay(stepIndex: number, stepCount: number): string {
  if (stepIndex >= 0) return `${stepIndex + 1} / ${stepCount}`
  return `Ready / ${stepCount}`
}

// Final hint once the scan is fully stepped through (the terminal complete state).
function buildGridCompletionStatus(islandCount: number): string {
  return `Search complete. ${islandCount} island${islandCount === 1 ? '' : 's'} found.`
}

export const GridSidebar = ({
  mode,
  onModeChange,
  playbackMode,
  onPlaybackModeChange,
  currentStep,
  isRunning,
  canRun,
  gridOutput,
  stepIndex,
  stepCount,
  isPlaying,
  playbackSpeed,
  isPlaybackComplete,
  canStepBackward,
  canStepForward,
  canTogglePlay,
  currentSubPhase,
  isPickingStart,
  bfsStartCells,
  dfsStartCell,
  pseudocodeShowLogic,
  onTogglePickStart,
  onRun,
  onStop,
  onStepForward,
  onStepBackward,
  onTogglePlay,
  onSpeedChange,
  onPseudocodeFlip,
}: GridSidebarProps) => {
  const [scanCorner, setScanCorner] = useState<ScanCorner>('tl')
  const [scanPrimary, setScanPrimary] = useState<'h' | 'v'>('h')

  const isOuterMode = !mode.startsWith('for')
  const isBfsOuter = mode.startsWith('bfs')
  // Pre-step → setup lines; finished → terminal/conclusion lines; mid-run → live sub-phase.
  const lifecycle: GridLifecycle = !isRunning ? null : stepIndex < 0 ? 'ready' : isPlaybackComplete ? 'done' : null

  const handleRunToggle = () => {
    if (isRunning) onStop()
    else onRun(mode, `${scanCorner}-${scanPrimary}` as ForLoopScanMode)
  }

  const startPointCount = isBfsOuter ? bfsStartCells.size : (dfsStartCell !== null ? 1 : 0)

  return (
    <aside className="sidebar is-grid-search">
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
          <div className="playback-mode-toggle" role="radiogroup" aria-label="Playback mode">
            <button
              type="button"
              role="radio"
              aria-checked={playbackMode === 'visual'}
              className={`playback-mode-btn ${playbackMode === 'visual' ? 'playback-mode-btn--active' : ''}`}
              disabled={isRunning}
              onClick={() => onPlaybackModeChange('visual')}
            >
              Visual Steps
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={playbackMode === 'code'}
              className={`playback-mode-btn ${playbackMode === 'code' ? 'playback-mode-btn--active' : ''}`}
              disabled={isRunning}
              onClick={() => onPlaybackModeChange('code')}
            >
              Line by Line
            </button>
          </div>
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
          {isRunning && (
            <p className="hint">
              {isPlaybackComplete
                ? buildGridCompletionStatus(gridOutput?.islandCount ?? 0)
                : playbackMode === 'code' && currentStep?.codeLine !== undefined
                  ? `Line ${currentStep.codeLine + 1} · Step ${formatStepDisplay(stepIndex, stepCount)}`
                  : `Step ${formatStepDisplay(stepIndex, stepCount)}`}
            </p>
          )}
        </div>

        {(mode === 'for-bfs' || mode === 'for-dfs') && (
          <PseudocodePanel
            codeText={mode === 'for-bfs'
              ? forBfsCode(scanCorner, scanPrimary)
              : forDfsCode(scanCorner, scanPrimary)}
            logicText={mode === 'for-bfs'
              ? forBfsLogic(scanCorner, scanPrimary)
              : forDfsLogic(scanCorner, scanPrimary)}
            codeHighlighted={getForHighlights(currentSubPhase, false, lifecycle, playbackMode, currentStep)}
            logicHighlighted={getForHighlights(currentSubPhase, true, lifecycle, playbackMode, currentStep)}
            showLogic={pseudocodeShowLogic}
            onFlip={onPseudocodeFlip}
            canDetach={!isPlaying}
          />
        )}

        {(mode === 'bfs-bfs' || mode === 'bfs-dfs') && (
          <PseudocodePanel
            codeText={mode === 'bfs-bfs' ? BFS_BFS_CODE : BFS_DFS_CODE}
            logicText={mode === 'bfs-bfs' ? BFS_BFS_LOGIC : BFS_DFS_LOGIC}
            codeHighlighted={getBfsHighlights(currentSubPhase, false, lifecycle, playbackMode, currentStep)}
            logicHighlighted={getBfsHighlights(currentSubPhase, true, lifecycle, playbackMode, currentStep)}
            showLogic={pseudocodeShowLogic}
            onFlip={onPseudocodeFlip}
            canDetach={!isPlaying}
          />
        )}

        {(mode === 'dfs-bfs' || mode === 'dfs-dfs') && (
          <PseudocodePanel
            codeText={mode === 'dfs-bfs' ? DFS_BFS_CODE : DFS_DFS_CODE}
            logicText={mode === 'dfs-bfs' ? DFS_BFS_LOGIC : DFS_DFS_LOGIC}
            codeHighlighted={getDfsHighlights(currentSubPhase, false, lifecycle, playbackMode, currentStep)}
            logicHighlighted={getDfsHighlights(currentSubPhase, true, lifecycle, playbackMode, currentStep)}
            showLogic={pseudocodeShowLogic}
            onFlip={onPseudocodeFlip}
            canDetach={!isPlaying}
          />
        )}

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
              <span className="output-label">Ops to find all</span>
              <span className="output-value">
                {gridOutput !== null ? gridOutput.discoveryOperations : '—'}
              </span>
            </div>
            <div className="output-row">
              <span className="output-label">Total operations</span>
              <span className="output-value">
                {gridOutput !== null ? gridOutput.operationCount : '—'}
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

