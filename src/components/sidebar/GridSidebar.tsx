import { useState } from 'react'
import { AlgorithmInfoCard } from './AlgorithmInfoCard'
import { PlaybackControls } from './PlaybackControls'
import { PseudocodePanel } from './PseudocodePanel'
import type { GridOutput, ForLoopScanMode, GridSearchMode, GridSubPhase } from '../../hooks/useForLoopBFSPlayback'

const FOR_BFS_CODE = `function SCAN(grid, rows, cols):
    for r ← 0 to rows-1:
        for c ← 0 to cols-1:
            if grid[r][c] = water → skip
            if (r,c) ∈ visited  → skip
            island ← BFS_FILL(r,c)
            islands.add(island)
    return islands

function BFS_FILL(start, grid, visited):
    queue ← [start]
    visited.add(start)
    while queue ≠ empty:
        cell ← queue.dequeue()
        island.add(cell)
        for each nb of cell:
            if nb is land ∧ nb ∉ visited:
                visited.add(nb)
                queue.enqueue(nb)
    return island`

const FOR_BFS_LOGIC = `Scan every cell left-to-right,
top-to-bottom.
──────────────────────────────────────────
For each cell:
  · Water → skip it.
  · Already visited → skip it.

  · Unvisited island cell found:
      BFS flood-fill claims the whole island.
      Expands outward level by level using a queue.
      All connected land is visited at once.
      ✓ New island recorded.
──────────────────────────────────────────
BFS flood-fill:
  Enqueue the start, mark it visited.
  While the queue is not empty:
    · Dequeue a cell — add it to the island.
    · Each unvisited land neighbor:
        Mark visited, enqueue.`

const FOR_DFS_CODE = `function SCAN(grid, rows, cols):
    for r ← 0 to rows-1:
        for c ← 0 to cols-1:
            if grid[r][c] = water → skip
            if (r,c) ∈ visited  → skip
            island ← DFS_FILL(r,c)
            islands.add(island)
    return islands

function DFS_FILL(start, grid, visited):
    stack ← [start]
    visited.add(start)
    while stack ≠ empty:
        cell ← stack.pop()
        island.add(cell)
        for each nb of cell:
            if nb is land ∧ nb ∉ visited:
                visited.add(nb)
                stack.push(nb)
    return island`

const FOR_DFS_LOGIC = `Scan every cell left-to-right,
top-to-bottom.
──────────────────────────────────────────
For each cell:
  · Water → skip it.
  · Already visited → skip it.

  · Unvisited island cell found:
      DFS flood-fill claims the whole island.
      Dives deep first, then backtracks, using a stack.
      All connected land is visited at once.
      ✓ New island recorded.
──────────────────────────────────────────
DFS flood-fill:
  Push the start, mark it visited.
  While the stack is not empty:
    · Pop a cell — add it to the island.
    · Each unvisited land neighbor:
        Mark visited, push.`

const BFS_BFS_CODE = `function SCAN(grid, starts):
    queue ← starts; seen ← starts
    while queue ≠ empty:
        cell ← queue.dequeue()
        if cell ∈ visited  → skip
        visited.add(cell)
        if grid[cell] = water → enqueue nbs
        else → island ← BFS_FILL(cell)
    return islands

function BFS_FILL(start, grid, visited):
    queue ← [start]; visited.add(start)
    while queue ≠ empty:
        cell ← queue.dequeue()
        island.add(cell)
        for each nb of cell:
            if nb is land ∧ nb ∉ visited:
                visited.add(nb)
                queue.enqueue(nb)
    return island`

const BFS_BFS_LOGIC = `BFS scans outward from all starts
simultaneously.
──────────────────────────────────────────
For each dequeued cell:
  · Already visited → skip it.
    (claimed by a prior island fill)
  · Water cell:
      Mark visited.
      Enqueue all unseen neighbors.

  · Unvisited island cell found:
      BFS flood-fill claims the whole island.
      Expands outward level by level.
      All connected land visited at once.
      ✓ New island recorded.
──────────────────────────────────────────
BFS flood-fill:
  Enqueue the start, mark it visited.
  While the queue is not empty:
    · Dequeue a cell — add it to the island.
    · Each unvisited land neighbor:
        Mark visited, enqueue.`

const BFS_DFS_CODE = `function SCAN(grid, starts):
    queue ← starts; seen ← starts
    while queue ≠ empty:
        cell ← queue.dequeue()
        if cell ∈ visited  → skip
        visited.add(cell)
        if grid[cell] = water → enqueue nbs
        else → island ← DFS_FILL(cell)
    return islands

function DFS_FILL(start, grid, visited):
    stack ← [start]; visited.add(start)
    while stack ≠ empty:
        cell ← stack.pop()
        island.add(cell)
        for each nb of cell:
            if nb is land ∧ nb ∉ visited:
                visited.add(nb)
                stack.push(nb)
    return island`

const BFS_DFS_LOGIC = `BFS scans outward from all starts
simultaneously.
──────────────────────────────────────────
For each dequeued cell:
  · Already visited → skip it.
    (claimed by a prior island fill)
  · Water cell:
      Mark visited.
      Enqueue all unseen neighbors.

  · Unvisited island cell found:
      DFS flood-fill claims the whole island.
      Dives deep first, then backtracks.
      All connected land visited at once.
      ✓ New island recorded.
──────────────────────────────────────────
DFS flood-fill:
  Push the start, mark it visited.
  While the stack is not empty:
    · Pop a cell — add it to the island.
    · Each unvisited land neighbor:
        Mark visited, push.`

const DFS_BFS_CODE = `function SCAN(grid, start):
    stack ← [start]; seen ← [start]
    while stack ≠ empty:
        cell ← stack.pop()
        if cell ∈ visited  → skip
        visited.add(cell)
        if grid[cell] = water → push nbs
        else → island ← BFS_FILL(cell)
    return islands

function BFS_FILL(start, grid, visited):
    queue ← [start]; visited.add(start)
    while queue ≠ empty:
        cell ← queue.dequeue()
        island.add(cell)
        for each nb of cell:
            if nb is land ∧ nb ∉ visited:
                visited.add(nb)
                queue.enqueue(nb)
    return island`

const DFS_BFS_LOGIC = `DFS scans depth-first from one start
cell, exploring as deep as possible.
──────────────────────────────────────────
For each popped cell:
  · Already visited → skip it.
    (claimed by a prior island fill)
  · Water cell:
      Mark visited.
      Push all unseen neighbors.

  · Unvisited island cell found:
      BFS flood-fill claims the whole island.
      Expands outward level by level.
      All connected land visited at once.
      ✓ New island recorded.
──────────────────────────────────────────
BFS flood-fill:
  Enqueue the start, mark it visited.
  While the queue is not empty:
    · Dequeue a cell — add it to the island.
    · Each unvisited land neighbor:
        Mark visited, enqueue.`

const DFS_DFS_CODE = `function SCAN(grid, start):
    stack ← [start]; seen ← [start]
    while stack ≠ empty:
        cell ← stack.pop()
        if cell ∈ visited  → skip
        visited.add(cell)
        if grid[cell] = water → push nbs
        else → island ← DFS_FILL(cell)
    return islands

function DFS_FILL(start, grid, visited):
    stack ← [start]; visited.add(start)
    while stack ≠ empty:
        cell ← stack.pop()
        island.add(cell)
        for each nb of cell:
            if nb is land ∧ nb ∉ visited:
                visited.add(nb)
                stack.push(nb)
    return island`

const DFS_DFS_LOGIC = `DFS scans depth-first from one start
cell, exploring as deep as possible.
──────────────────────────────────────────
For each popped cell:
  · Already visited → skip it.
    (claimed by a prior island fill)
  · Water cell:
      Mark visited.
      Push all unseen neighbors.

  · Unvisited island cell found:
      DFS flood-fill claims the whole island.
      Dives deep first, then backtracks.
      All connected land visited at once.
      ✓ New island recorded.
──────────────────────────────────────────
DFS flood-fill:
  Push the start, mark it visited.
  While the stack is not empty:
    · Pop a cell — add it to the island.
    · Each unvisited land neighbor:
        Mark visited, push.`

// Line indices (0-based) to highlight per sub-phase for each pseudocode style.
// FOR-BFS and FOR-DFS share the same line structure — only the function name changes.
const FOR_CODE_HIGHLIGHTS: Record<GridSubPhase, number[]> = {
  'outer-water':     [1, 2, 3],
  'outer-visited':   [1, 2, 4],
  'inner-start':     [5, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  'inner-process':   [12, 13, 14, 15, 16, 17, 18],
  'bfs-outer-skip':  [],
  'bfs-outer-water': [],
  'dfs-outer-skip':  [],
  'dfs-outer-water': [],
}

const FOR_LOGIC_HIGHLIGHTS: Record<GridSubPhase, number[]> = {
  'outer-water':     [0, 1, 3, 4],
  'outer-visited':   [0, 1, 3, 5],
  'inner-start':     [7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18],
  'inner-process':   [15, 16, 17, 18],
  'bfs-outer-skip':  [],
  'bfs-outer-water': [],
  'dfs-outer-skip':  [],
  'dfs-outer-water': [],
}

// BFS-BFS and BFS-DFS share the same line structure — only the inner function name changes.
const BFS_CODE_HIGHLIGHTS: Record<GridSubPhase, number[]> = {
  'bfs-outer-skip':  [2, 3, 4],
  'bfs-outer-water': [2, 3, 4, 5, 6],
  'inner-start':     [7, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  'inner-process':   [12, 13, 14, 15, 16, 17, 18],
  'outer-water':     [],
  'outer-visited':   [],
  'dfs-outer-skip':  [],
  'dfs-outer-water': [],
}

const BFS_LOGIC_HIGHLIGHTS: Record<GridSubPhase, number[]> = {
  'bfs-outer-skip':  [0, 1, 3, 4, 5],
  'bfs-outer-water': [0, 1, 3, 6, 7, 8],
  'inner-start':     [10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21],
  'inner-process':   [18, 19, 20, 21],
  'outer-water':     [],
  'outer-visited':   [],
  'dfs-outer-skip':  [],
  'dfs-outer-water': [],
}

// DFS-BFS and DFS-DFS share the same line structure — only the inner function name changes.
const DFS_CODE_HIGHLIGHTS: Record<GridSubPhase, number[]> = {
  'dfs-outer-skip':  [2, 3, 4],
  'dfs-outer-water': [2, 3, 4, 5, 6],
  'inner-start':     [7, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  'inner-process':   [12, 13, 14, 15, 16, 17, 18],
  'outer-water':     [],
  'outer-visited':   [],
  'bfs-outer-skip':  [],
  'bfs-outer-water': [],
}

const DFS_LOGIC_HIGHLIGHTS: Record<GridSubPhase, number[]> = {
  'dfs-outer-skip':  [0, 1, 3, 4, 5],
  'dfs-outer-water': [0, 1, 3, 6, 7, 8],
  'inner-start':     [10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21],
  'inner-process':   [18, 19, 20, 21],
  'outer-water':     [],
  'outer-visited':   [],
  'bfs-outer-skip':  [],
  'bfs-outer-water': [],
}

function getForHighlights(subPhase: GridSubPhase | null, isLogic: boolean): Set<number> {
  if (!subPhase) return new Set()
  const map = isLogic ? FOR_LOGIC_HIGHLIGHTS : FOR_CODE_HIGHLIGHTS
  return new Set(map[subPhase])
}

function getBfsHighlights(subPhase: GridSubPhase | null, isLogic: boolean): Set<number> {
  if (!subPhase) return new Set()
  const map = isLogic ? BFS_LOGIC_HIGHLIGHTS : BFS_CODE_HIGHLIGHTS
  return new Set(map[subPhase])
}

function getDfsHighlights(subPhase: GridSubPhase | null, isLogic: boolean): Set<number> {
  if (!subPhase) return new Set()
  const map = isLogic ? DFS_LOGIC_HIGHLIGHTS : DFS_CODE_HIGHLIGHTS
  return new Set(map[subPhase])
}

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
          {isRunning && (
            <p className="hint">Step {formatStepDisplay(stepIndex, stepCount)}</p>
          )}
        </div>

        {(mode === 'for-bfs' || mode === 'for-dfs') && (
          <PseudocodePanel
            codeText={mode === 'for-bfs' ? FOR_BFS_CODE : FOR_DFS_CODE}
            logicText={mode === 'for-bfs' ? FOR_BFS_LOGIC : FOR_DFS_LOGIC}
            codeHighlighted={getForHighlights(currentSubPhase, false)}
            logicHighlighted={getForHighlights(currentSubPhase, true)}
          />
        )}

        {(mode === 'bfs-bfs' || mode === 'bfs-dfs') && (
          <PseudocodePanel
            codeText={mode === 'bfs-bfs' ? BFS_BFS_CODE : BFS_DFS_CODE}
            logicText={mode === 'bfs-bfs' ? BFS_BFS_LOGIC : BFS_DFS_LOGIC}
            codeHighlighted={getBfsHighlights(currentSubPhase, false)}
            logicHighlighted={getBfsHighlights(currentSubPhase, true)}
          />
        )}

        {(mode === 'dfs-bfs' || mode === 'dfs-dfs') && (
          <PseudocodePanel
            codeText={mode === 'dfs-bfs' ? DFS_BFS_CODE : DFS_DFS_CODE}
            logicText={mode === 'dfs-bfs' ? DFS_BFS_LOGIC : DFS_DFS_LOGIC}
            codeHighlighted={getDfsHighlights(currentSubPhase, false)}
            logicHighlighted={getDfsHighlights(currentSubPhase, true)}
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
