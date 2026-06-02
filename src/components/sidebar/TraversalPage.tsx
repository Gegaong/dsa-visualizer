import type { GoalType } from '../../types'

import type { TraversalPhase } from '../../hooks/useTraversalPlayback'

import type { TraversalPageProps } from './sidebarTypes'

import { PlaybackControls } from './PlaybackControls'

import { AlgorithmInfoCard } from './AlgorithmInfoCard'

import { PseudocodePanel } from './PseudocodePanel'

import { confirmNodeLabelFieldOnEnter } from './sidebarFieldHelpers'

// ─── Code pseudocode strings (10 lines each, 0–9) ───────────────────────────

const BFS_TARGET_NODE_CODE = `function BFS(graph, start, goal):
    queue ← [start]; visited ← {start}
    while queue ≠ empty:
        node ← queue.dequeue()
        if node = goal → return node
        for each nb of node:
            if nb ∉ visited:
                visited.add(nb)
                queue.enqueue(nb)
    return null`

const DFS_TARGET_NODE_CODE = `function DFS(graph, start, goal):
    stack ← [start]; visited ← {start}
    while stack ≠ empty:
        node ← stack.pop()
        if node = goal → return node
        for each nb of node:
            if nb ∉ visited:
                visited.add(nb)
                stack.push(nb)
    return null`

const BFS_TARGET_VALUE_CODE = `function BFS(graph, start, targetVal):
    queue ← [start]; visited ← {start}
    while queue ≠ empty:
        node ← queue.dequeue()
        if node.value = targetVal → return node
        for each nb of node:
            if nb ∉ visited:
                visited.add(nb)
                queue.enqueue(nb)
    return null`

const DFS_TARGET_VALUE_CODE = `function DFS(graph, start, targetVal):
    stack ← [start]; visited ← {start}
    while stack ≠ empty:
        node ← stack.pop()
        if node.value = targetVal → return node
        for each nb of node:
            if nb ∉ visited:
                visited.add(nb)
                stack.push(nb)
    return null`

// max/min code is 12 lines (0–11): init split across 2 lines, if-check split across 2 lines
const BFS_MAX_VALUE_CODE = `function BFS(graph, start):
    queue ← [start]; visited ← {start}
    best ← -∞
    while queue ≠ empty:
        node ← queue.dequeue()
        if node.value > best:
            best ← node.value
        for each nb of node:
            if nb ∉ visited:
                visited.add(nb)
                queue.enqueue(nb)
    return best`

const DFS_MAX_VALUE_CODE = `function DFS(graph, start):
    stack ← [start]; visited ← {start}
    best ← -∞
    while stack ≠ empty:
        node ← stack.pop()
        if node.value > best:
            best ← node.value
        for each nb of node:
            if nb ∉ visited:
                visited.add(nb)
                stack.push(nb)
    return best`

const BFS_MIN_VALUE_CODE = `function BFS(graph, start):
    queue ← [start]; visited ← {start}
    best ← +∞
    while queue ≠ empty:
        node ← queue.dequeue()
        if node.value < best:
            best ← node.value
        for each nb of node:
            if nb ∉ visited:
                visited.add(nb)
                queue.enqueue(nb)
    return best`

const DFS_MIN_VALUE_CODE = `function DFS(graph, start):
    stack ← [start]; visited ← {start}
    best ← +∞
    while stack ≠ empty:
        node ← stack.pop()
        if node.value < best:
            best ← node.value
        for each nb of node:
            if nb ∉ visited:
                visited.add(nb)
                stack.push(nb)
    return best`

// ─── Logic pseudocode strings (12 lines each, 0–11) ─────────────────────────

const BFS_TARGET_NODE_LOGIC = `BFS explores level by level — all nodes
at the same distance before going deeper.
──────────────────────────────────────────
Init: add start to queue, mark visited.
Each step:
  · Dequeue the front node.
  · If it matches the goal → return it.
    Traversal stops on the first match.
  · Otherwise: add each unvisited neighbor
    to the back of the queue.
──────────────────────────────────────────
Queue empties → goal is unreachable.`

const DFS_TARGET_NODE_LOGIC = `DFS dives as deep as possible first,
backtracking when a dead end is reached.
──────────────────────────────────────────
Init: add start to stack, mark visited.
Each step:
  · Pop the top node.
  · If it matches the goal → return it.
    Traversal stops on the first match.
  · Otherwise: add each unvisited neighbor
    on top of the stack.
──────────────────────────────────────────
Stack empties → goal is unreachable.`

const BFS_TARGET_VALUE_LOGIC = `BFS explores level by level — all nodes
at the same distance before going deeper.
──────────────────────────────────────────
Init: add start to queue, mark visited.
Each step:
  · Dequeue the front node.
  · If its value matches target → return it.
    Traversal stops on the first match.
  · Otherwise: add each unvisited neighbor
    to the back of the queue.
──────────────────────────────────────────
Queue empties → target value not found.`

const DFS_TARGET_VALUE_LOGIC = `DFS dives as deep as possible first,
backtracking when a dead end is reached.
──────────────────────────────────────────
Init: add start to stack, mark visited.
Each step:
  · Pop the top node.
  · If its value matches target → return it.
    Traversal stops on the first match.
  · Otherwise: add each unvisited neighbor
    on top of the stack.
──────────────────────────────────────────
Stack empties → target value not found.`

const BFS_MAX_VALUE_LOGIC = `BFS explores level by level — all nodes
at the same distance before going deeper.
──────────────────────────────────────────
Init: add start to queue, mark visited.
Each step:
  · Dequeue the front node.
  · Compare its value to the running best.
    If better → update best. No early stop.
  · Add each unvisited neighbor
    to the back of the queue.
──────────────────────────────────────────
Queue empties → return the max-value node.`

const DFS_MAX_VALUE_LOGIC = `DFS dives as deep as possible first,
backtracking when a dead end is reached.
──────────────────────────────────────────
Init: add start to stack, mark visited.
Each step:
  · Pop the top node.
  · Compare its value to the running best.
    If better → update best. No early stop.
  · Add each unvisited neighbor
    on top of the stack.
──────────────────────────────────────────
Stack empties → return the max-value node.`

const BFS_MIN_VALUE_LOGIC = `BFS explores level by level — all nodes
at the same distance before going deeper.
──────────────────────────────────────────
Init: add start to queue, mark visited.
Each step:
  · Dequeue the front node.
  · Compare its value to the running best.
    If better → update best. No early stop.
  · Add each unvisited neighbor
    to the back of the queue.
──────────────────────────────────────────
Queue empties → return the min-value node.`

const DFS_MIN_VALUE_LOGIC = `DFS dives as deep as possible first,
backtracking when a dead end is reached.
──────────────────────────────────────────
Init: add start to stack, mark visited.
Each step:
  · Pop the top node.
  · Compare its value to the running best.
    If better → update best. No early stop.
  · Add each unvisited neighbor
    on top of the stack.
──────────────────────────────────────────
Stack empties → return the min-value node.`

// ─── Highlight maps ──────────────────────────────────────────────────────────

// target-node / target-value code: 10 lines (0–9).
const CODE_HIGHLIGHTS_TARGET: Record<TraversalPhase, number[]> = {
  ready:          [0, 1],
  'step-regular': [2, 3, 4, 5, 6, 7, 8],
  'step-matched': [2, 3, 4],
  'done-empty':   [2, 9],
}

// max-value / min-value code: 12 lines (0–11) — init and if-check each split across 2 lines.
const CODE_HIGHLIGHTS_EXTREME: Record<TraversalPhase, number[]> = {
  ready:          [0, 1, 2],
  'step-regular': [3, 4, 5, 6, 7, 8, 9, 10],
  'step-matched': [],
  'done-empty':   [3, 11],
}

// target-node / target-value: line 7 is "stop on match" — only active when matched.
const LOGIC_HIGHLIGHTS_TARGET: Record<TraversalPhase, number[]> = {
  ready:          [3],
  'step-regular': [4, 5, 6, 8, 9],
  'step-matched': [4, 5, 6, 7],
  'done-empty':   [11],
}

// max-value / min-value: line 7 is "update best" — active on every step.
const LOGIC_HIGHLIGHTS_EXTREME: Record<TraversalPhase, number[]> = {
  ready:          [3],
  'step-regular': [4, 5, 6, 7, 8, 9],
  'step-matched': [],
  'done-empty':   [11],
}

function getHighlights(phase: TraversalPhase | null, goalType: GoalType, isLogic: boolean): Set<number> {
  if (!phase) return new Set()
  const isExtreme = goalType === 'max-value' || goalType === 'min-value'
  if (isLogic) {
    return new Set((isExtreme ? LOGIC_HIGHLIGHTS_EXTREME : LOGIC_HIGHLIGHTS_TARGET)[phase])
  }
  return new Set((isExtreme ? CODE_HIGHLIGHTS_EXTREME : CODE_HIGHLIGHTS_TARGET)[phase])
}

function getCodeText(algorithmTab: 'bfs' | 'dfs', goalType: GoalType): string {
  if (algorithmTab === 'bfs') {
    if (goalType === 'target-node') return BFS_TARGET_NODE_CODE
    if (goalType === 'target-value') return BFS_TARGET_VALUE_CODE
    if (goalType === 'max-value') return BFS_MAX_VALUE_CODE
    return BFS_MIN_VALUE_CODE
  }
  if (goalType === 'target-node') return DFS_TARGET_NODE_CODE
  if (goalType === 'target-value') return DFS_TARGET_VALUE_CODE
  if (goalType === 'max-value') return DFS_MAX_VALUE_CODE
  return DFS_MIN_VALUE_CODE
}

function getLogicText(algorithmTab: 'bfs' | 'dfs', goalType: GoalType): string {
  if (algorithmTab === 'bfs') {
    if (goalType === 'target-node') return BFS_TARGET_NODE_LOGIC
    if (goalType === 'target-value') return BFS_TARGET_VALUE_LOGIC
    if (goalType === 'max-value') return BFS_MAX_VALUE_LOGIC
    return BFS_MIN_VALUE_LOGIC
  }
  if (goalType === 'target-node') return DFS_TARGET_NODE_LOGIC
  if (goalType === 'target-value') return DFS_TARGET_VALUE_LOGIC
  if (goalType === 'max-value') return DFS_MAX_VALUE_LOGIC
  return DFS_MIN_VALUE_LOGIC
}

// Sidebar page: BFS/DFS goal-traversal — strategy pills, goal inputs, playback, pseudocode.
export const TraversalPage = ({
  blockGraphEdits,
  isTraversalRunning,
  isConnectedComponentsSessionActive,
  isCycleDetectionSessionActive,
  algorithmTab,
  onAlgorithmTabChange,
  goalType,
  onGoalTypeChange,
  startNodeLabel,
  onStartNodeLabelChange,
  goalNodeLabel,
  onGoalNodeLabelChange,
  goalValueInput,
  onGoalValueInputChange,
  onRunTraversal,
  onStopTraversal,
  canRunTraversal,
  traversalStatusText,
  isTraversalPlaying,
  traversalPlaybackSpeed,
  onTraversalPlaybackSpeedChange,
  onPlayTraversal,
  onPauseTraversal,
  onNextTraversalStep,
  onPreviousTraversalStep,
  canStepForward,
  canStepBackward,
  canTogglePlay,
  isTraversalPlaybackComplete,
  traversalCurrentPhase,
  traversalVarsRows,
  pseudocodeShowLogic,
  onPseudocodeFlip,
}: TraversalPageProps) => {
  const algoShort = algorithmTab === 'dfs' ? 'DFS' : 'BFS'

  return (
    <div className="sidebar-page-body">
      <div className="sidebar-section">
        <h3>Traversal</h3>
        <div className="pill-group">
          <button
            className={`btn btn-pill ${algorithmTab === 'bfs' ? 'btn-active' : ''}`}
            type="button"
            disabled={blockGraphEdits && !isTraversalRunning}
            onClick={() => onAlgorithmTabChange('bfs')}
          >
            BFS
          </button>
          <button
            className={`btn btn-pill ${algorithmTab === 'dfs' ? 'btn-active' : ''}`}
            type="button"
            disabled={blockGraphEdits && !isTraversalRunning}
            onClick={() => onAlgorithmTabChange('dfs')}
          >
            DFS
          </button>
        </div>
      </div>

      <AlgorithmInfoCard infoKey={algorithmTab === 'bfs' ? 'traversal-bfs' : 'traversal-dfs'} />

      <div className="sidebar-section algorithm-inputs-section">
        <h3>Inputs</h3>
        <label className="field">
          <span>
            Start node <span className="required-indicator" aria-hidden="true">*</span>
          </span>
          <input
            type="text"
            value={startNodeLabel}
            onChange={(event) => onStartNodeLabelChange(event.target.value)}
            onKeyDown={confirmNodeLabelFieldOnEnter}
            disabled={blockGraphEdits}
          />
        </label>
        <label className="field">
          <span>Goal type</span>
          <select
            value={goalType}
            onChange={(event) => onGoalTypeChange(event.target.value as GoalType)}
            disabled={blockGraphEdits}
          >
            <option value="target-node">Target node</option>
            <option value="target-value">Target value</option>
            <option value="max-value">Find max value</option>
            <option value="min-value">Find min value</option>
          </select>
        </label>
        {goalType === 'target-node' && (
          <label className="field">
            <span>
              Goal node <span className="required-indicator" aria-hidden="true">*</span>
            </span>
            <input
              type="text"
              value={goalNodeLabel}
              onChange={(event) => onGoalNodeLabelChange(event.target.value)}
              onKeyDown={confirmNodeLabelFieldOnEnter}
              disabled={blockGraphEdits}
            />
          </label>
        )}
        {goalType === 'target-value' && (
          <label className="field">
            <span>
              Goal value <span className="required-indicator" aria-hidden="true">*</span>
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={goalValueInput}
              onChange={(event) => onGoalValueInputChange(event.target.value)}
              disabled={blockGraphEdits}
            />
          </label>
        )}
        {(goalType === 'max-value' || goalType === 'min-value') && (
          <p className="hint">No extra input needed for this goal.</p>
        )}
      </div>

      <div className="sidebar-section sidebar-section--traversal-playback">
        <h3>Playback</h3>
        <PlaybackControls
          runLabel={`Run ${algoShort}`}
          stopLabel={`Stop ${algoShort}`}
          isRunActive={isTraversalRunning}
          onRunToggle={isTraversalRunning ? onStopTraversal : onRunTraversal}
          runDisabled={
            !isTraversalRunning &&
            (!canRunTraversal || isConnectedComponentsSessionActive || isCycleDetectionSessionActive)
          }
          onPrevious={onPreviousTraversalStep}
          onNext={onNextTraversalStep}
          onPlayPauseToggle={isTraversalPlaying ? onPauseTraversal : onPlayTraversal}
          isPlaying={isTraversalPlaying}
          isPlaybackComplete={isTraversalPlaybackComplete}
          canStepBackward={canStepBackward}
          canStepForward={canStepForward}
          canTogglePlay={canTogglePlay}
          speed={traversalPlaybackSpeed}
          onSpeedChange={onTraversalPlaybackSpeedChange}
        />
        <p className="hint">{traversalStatusText}</p>
      </div>

      <PseudocodePanel
        codeText={getCodeText(algorithmTab, goalType)}
        logicText={getLogicText(algorithmTab, goalType)}
        codeHighlighted={getHighlights(traversalCurrentPhase, goalType, false)}
        logicHighlighted={getHighlights(traversalCurrentPhase, goalType, true)}
        varsRows={traversalVarsRows}
        showLogic={pseudocodeShowLogic}
        onFlip={onPseudocodeFlip}
      />
    </div>
  )
}
