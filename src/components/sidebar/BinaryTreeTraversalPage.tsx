import type { AlgorithmInfoKey } from '../../algorithms/algorithmInfo'
import type { BinaryTreeTraversalAlgorithm } from '../../algorithms/binaryTreeTraversal'
import {
  PREORDER_EXTREME_CODE_LINES,
  PREORDER_TARGET_CODE_LINES,
  INORDER_EXTREME_CODE_LINES,
  INORDER_TARGET_CODE_LINES,
  POSTORDER_EXTREME_CODE_LINES,
  POSTORDER_TARGET_CODE_LINES,
  LEVEL_ORDER_EXTREME_CODE_LINES,
  LEVEL_ORDER_TARGET_CODE_LINES,
} from '../../algorithms/binaryTreeTraversal'
import type { GoalType } from '../../types'

import { AlgorithmInfoCard } from './AlgorithmInfoCard'
import { PlaybackControls } from './PlaybackControls'
import { PseudocodePanel } from './PseudocodePanel'
import { confirmNodeLabelFieldOnEnter, NODE_LABEL_FIELD_ATTRS, NODE_VALUE_FIELD_ATTRS } from './sidebarFieldHelpers'

const ALGORITHM_OPTIONS: { value: BinaryTreeTraversalAlgorithm; label: string }[] = [
  { value: 'preorder', label: 'Preorder' },
  { value: 'inorder', label: 'Inorder' },
  { value: 'postorder', label: 'Postorder' },
  { value: 'level-order', label: 'Level-order (BFS)' },
]

// Shorter than the dropdown labels above (drops the "(BFS)" aside) so the Run/Stop button stays compact.
const SHORT_LABEL_BY_ALGORITHM: Record<BinaryTreeTraversalAlgorithm, string> = {
  preorder: 'Preorder',
  inorder: 'Inorder',
  postorder: 'Postorder',
  'level-order': 'Level-order',
}

const INFO_KEY_BY_ALGORITHM: Record<BinaryTreeTraversalAlgorithm, AlgorithmInfoKey> = {
  preorder: 'bt-preorder',
  inorder: 'bt-inorder',
  postorder: 'bt-postorder',
  'level-order': 'bt-levelorder',
}

const CODE_BY_ALGORITHM_AND_GOAL: Record<
  BinaryTreeTraversalAlgorithm,
  Record<GoalType, string>
> = {
  preorder: {
    'target-node': `function preorder(node, goal):
    if node = null:
        return null
    if node.label = goal:
        return node
    leftResult ← preorder(node.left, goal)
    if leftResult ≠ null:
        return leftResult
    rightResult ← preorder(node.right, goal)
    return rightResult`,
    'target-value': `function preorder(node, target):
    if node = null:
        return null
    if node.value = target:
        return node
    leftResult ← preorder(node.left, target)
    if leftResult ≠ null:
        return leftResult
    rightResult ← preorder(node.right, target)
    return rightResult`,
    'max-value': `function preorderMax(node):
    max ← -∞
    function preorder(node):
        if node = null:
            return
        if node.value > max:
            max ← node.value
        preorder(node.left)
        preorder(node.right)
    preorder(node)
    return max`,
    'min-value': `function preorderMin(node):
    min ← +∞
    function preorder(node):
        if node = null:
            return
        if node.value < min:
            min ← node.value
        preorder(node.left)
        preorder(node.right)
    preorder(node)
    return min`,
  },

  inorder: {
    'target-node': `function inorder(node, goal):
    if node = null:
        return null
    leftResult ← inorder(node.left, goal)
    if leftResult ≠ null:
        return leftResult
    if node.label = goal:
        return node
    rightResult ← inorder(node.right, goal)
    return rightResult`,
    'target-value': `function inorder(node, target):
    if node = null:
        return null
    leftResult ← inorder(node.left, target)
    if leftResult ≠ null:
        return leftResult
    if node.value = target:
        return node
    rightResult ← inorder(node.right, target)
    return rightResult`,
    'max-value': `function inorderMax(node):
    max ← -∞
    function inorder(node):
        if node = null:
            return
        inorder(node.left)
        if node.value > max:
            max ← node.value
        inorder(node.right)
    inorder(node)
    return max`,
    'min-value': `function inorderMin(node):
    min ← +∞
    function inorder(node):
        if node = null:
            return
        inorder(node.left)
        if node.value < min:
            min ← node.value
        inorder(node.right)
    inorder(node)
    return min`,
  },

  postorder: {
    'target-node': `function postorder(node, goal):
    if node = null:
        return null
    leftResult ← postorder(node.left, goal)
    if leftResult ≠ null:
        return leftResult
    rightResult ← postorder(node.right, goal)
    if rightResult ≠ null:
        return rightResult
    if node.label = goal:
        return node
    return null`,
    'target-value': `function postorder(node, target):
    if node = null:
        return null
    leftResult ← postorder(node.left, target)
    if leftResult ≠ null:
        return leftResult
    rightResult ← postorder(node.right, target)
    if rightResult ≠ null:
        return rightResult
    if node.value = target:
        return node
    return null`,
    'max-value': `function postorderMax(node):
    max ← -∞
    function postorder(node):
        if node = null:
            return
        postorder(node.left)
        postorder(node.right)
        if node.value > max:
            max ← node.value
    postorder(node)
    return max`,
    'min-value': `function postorderMin(node):
    min ← +∞
    function postorder(node):
        if node = null:
            return
        postorder(node.left)
        postorder(node.right)
        if node.value < min:
            min ← node.value
    postorder(node)
    return min`,
  },

  'level-order': {
    'target-node': `function levelOrder(node, goal):
    if node = null:
        return null
    queue ← [node]
    while queue ≠ empty:
        node ← queue.dequeue()
        if node.label = goal:
            return node
        if node.left ≠ null:
            queue.enqueue(node.left)
        if node.right ≠ null:
            queue.enqueue(node.right)
    return null`,
    'target-value': `function levelOrder(node, target):
    if node = null:
        return null
    queue ← [node]
    while queue ≠ empty:
        node ← queue.dequeue()
        if node.value = target:
            return node
        if node.left ≠ null:
            queue.enqueue(node.left)
        if node.right ≠ null:
            queue.enqueue(node.right)
    return null`,
    'max-value': `function levelOrderMax(node):
    max ← -∞
    if node = null:
        return max
    queue ← [node]
    while queue ≠ empty:
        node ← queue.dequeue()
        if node.value > max:
            max ← node.value
        if node.left ≠ null:
            queue.enqueue(node.left)
        if node.right ≠ null:
            queue.enqueue(node.right)
    return max`,
    'min-value': `function levelOrderMin(node):
    min ← +∞
    if node = null:
        return min
    queue ← [node]
    while queue ≠ empty:
        node ← queue.dequeue()
        if node.value < min:
            min ← node.value
        if node.left ≠ null:
            queue.enqueue(node.left)
        if node.right ≠ null:
            queue.enqueue(node.right)
    return min`,
  },
}

// Keep each intro wrapped to short lines so the top-right panel controls never overlap the
// first lines of text (same convention used on the graph pseudocode cards).
const LOGIC_BY_ALGORITHM_AND_GOAL: Record<
  BinaryTreeTraversalAlgorithm,
  Record<GoalType, string>
> = {
  preorder: {
    'target-node': `Preorder visits node
before its children.
──────────────────────────────────────────
Init: start at the root.
Each step:
  · Visit the current node.
  · If it matches the goal → stop now.
  · Otherwise: recurse left, then right.
    - Non-null subtree result → return it.
──────────────────────────────────────────
No nodes left → goal is unreachable.`,
    'target-value': `Preorder visits node
before its children.
──────────────────────────────────────────
Init: start at the root.
Each step:
  · Visit the current node.
  · If its value matches → stop now.
  · Otherwise: recurse left, then right.
    - Non-null subtree result → return it.
──────────────────────────────────────────
No nodes left → target value not found.`,
    'max-value': `Preorder keeps a
running max while walking.
──────────────────────────────────────────
Init: start at the root.
Each step:
  · Visit the current node.
  · Compare node.value with the running max.
    - Better → update max.
  · Recurse left, then right.
──────────────────────────────────────────
Walk ends → return max.`,
    'min-value': `Preorder keeps a
running min while walking.
──────────────────────────────────────────
Init: start at the root.
Each step:
  · Visit the current node.
  · Compare node.value with the running min.
    - Better (smaller) → update min.
  · Recurse left, then right.
──────────────────────────────────────────
Walk ends → return min.`,
  },

  inorder: {
    'target-node': `Inorder visits left,
then node, then right.
──────────────────────────────────────────
Init: start at the root.
Each step:
  · Recurse into the left child.
    - Non-null leftResult → return it.
  · If current node matches → stop now.
  · Otherwise: recurse into the right child.
──────────────────────────────────────────
No nodes left → goal is unreachable.`,
    'target-value': `Inorder visits left,
then node, then right.
──────────────────────────────────────────
Init: start at the root.
Each step:
  · Recurse into the left child.
    - Non-null leftResult → return it.
  · If current.value matches → stop now.
  · Otherwise: recurse into the right child.
──────────────────────────────────────────
No nodes left → target value not found.`,
    'max-value': `Inorder updates max
when each node is visited.
──────────────────────────────────────────
Init: start at the root.
Each step:
  · Recurse left.
  · Visit current node; compare to running max.
    - Better → update max.
  · Recurse right.
──────────────────────────────────────────
Walk ends → return max.`,
    'min-value': `Inorder updates min
when each node is visited.
──────────────────────────────────────────
Init: start at the root.
Each step:
  · Recurse left.
  · Visit current node; compare to running min.
    - Better (smaller) → update min.
  · Recurse right.
──────────────────────────────────────────
Walk ends → return min.`,
  },

  postorder: {
    'target-node': `Postorder visits
children before node.
──────────────────────────────────────────
Init: start at the root.
Each step:
  · Recurse left subtree.
    - Non-null leftResult → return it.
  · Then recurse right subtree.
    - Non-null rightResult → return it.
  · If current node matches → stop now.
──────────────────────────────────────────
No nodes left → goal is unreachable.`,
    'target-value': `Postorder visits
children before node.
──────────────────────────────────────────
Init: start at the root.
Each step:
  · Recurse left subtree.
    - Non-null leftResult → return it.
  · Then recurse right subtree.
    - Non-null rightResult → return it.
  · If current.value matches → stop now.
──────────────────────────────────────────
No nodes left → target value not found.`,
    'max-value': `Postorder updates max
after both subtrees.
──────────────────────────────────────────
Init: start at the root.
Each step:
  · Recurse left, then right.
  · After children: compare current node.value to max.
    - Better → update max.
──────────────────────────────────────────
Walk ends → return max.`,
    'min-value': `Postorder updates min
after both subtrees.
──────────────────────────────────────────
Init: start at the root.
Each step:
  · Recurse left, then right.
  · After children: compare current node.value to min.
    - Better (smaller) → update min.
──────────────────────────────────────────
Walk ends → return min.`,
  },

  'level-order': {
    'target-node': `Level-order visits
nodes level by level.
──────────────────────────────────────────
Init: add root to queue.
Each step:
  · Dequeue a node to visit.
  · If it matches the goal → stop now.
  · Otherwise enqueue left/right children.
──────────────────────────────────────────
Queue empties → goal is unreachable.`,
    'target-value': `Level-order visits
nodes level by level.
──────────────────────────────────────────
Init: add root to queue.
Each step:
  · Dequeue a node to visit.
  · If its value matches → stop now.
  · Otherwise enqueue left/right children.
──────────────────────────────────────────
Queue empties → target value not found.`,
    'max-value': `Level-order walks all
nodes with a running max.
──────────────────────────────────────────
Init: add root to queue.
Each step:
  · Dequeue the current node.
  · Compare node.value with the running max.
    - Better → update max.
  · Enqueue left/right children if present.
──────────────────────────────────────────
Queue empties → return max.`,
    'min-value': `Level-order walks all
nodes with a running min.
──────────────────────────────────────────
Init: add root to queue.
Each step:
  · Dequeue the current node.
  · Compare node.value with the running min.
    - Better (smaller) → update min.
  · Enqueue left/right children if present.
──────────────────────────────────────────
Queue empties → return min.`,
  },
}

// Maps each pseudocode line to the logic-text line(s) it corresponds to, so the logic panel
// highlights in sync with playback the same way the code panel already does. Hand-built per
// algorithm (same maintenance convention as the *_CODE_LINES maps). Every logic block's line 3
// is its "Init:" line (line-for-line consistent across all 16 blocks); a code line with no
// natural counterpart in the prose otherwise maps to an empty array rather than forcing a match
// that isn't really there.
//
// One structural wrinkle worth calling out: preorder/inorder/postorder are recursive, so their
// ENTER/NULL_CHECK line reruns on *every* node visit, not just the root — mapping it straight to
// Init would be wrong (it would relabel every child visit as "start at the root"). Only the
// genuine one-time setup lines (WRAPPER_ENTER/INIT_BEST/INNER_FN/CALL in the extreme variants;
// ENTER/NULL_CHECK/INIT_QUEUE in level-order, which is iterative and never revisits them) map
// directly to Init here. The recursive orders' true first-entry-only case is instead handled by
// isBeforeFirstStep in getLogicHighlighted, which overrides everything else exactly once, before
// any real step has been taken.

const PT = PREORDER_TARGET_CODE_LINES
const PREORDER_TARGET_LOGIC_LINES: Record<number, number[]> = {
  [PT.ENTER]: [5],
  [PT.NULL_CHECK]: [5],
  [PT.RETURN_NULL]: [10],
  [PT.MATCH_CHECK]: [6],
  [PT.RETURN_MATCH]: [6],
  [PT.RECURSE_LEFT]: [7],
  [PT.CHECK_LEFT]: [8],
  [PT.RETURN_LEFT]: [8],
  [PT.RECURSE_RIGHT]: [7],
  [PT.RETURN]: [8],
}

const PE = PREORDER_EXTREME_CODE_LINES
const PREORDER_EXTREME_LOGIC_LINES: Record<number, number[]> = {
  [PE.WRAPPER_ENTER]: [3],
  [PE.INIT_BEST]: [3],
  [PE.INNER_FN]: [3],
  [PE.NULL_CHECK]: [5],
  [PE.RETURN_VOID]: [],
  [PE.COMPARE]: [6],
  [PE.UPDATE_BEST]: [7],
  [PE.RECURSE_LEFT]: [8],
  [PE.RECURSE_RIGHT]: [8],
  [PE.CALL]: [3],
  [PE.RETURN]: [10],
}

const IT = INORDER_TARGET_CODE_LINES
const INORDER_TARGET_LOGIC_LINES: Record<number, number[]> = {
  [IT.ENTER]: [5],
  [IT.NULL_CHECK]: [5],
  [IT.RETURN_NULL]: [10],
  [IT.RECURSE_LEFT]: [5],
  [IT.CHECK_LEFT]: [6],
  [IT.RETURN_LEFT]: [6],
  [IT.MATCH_CHECK]: [7],
  [IT.RETURN_MATCH]: [7],
  [IT.RECURSE_RIGHT]: [8],
  [IT.RETURN]: [8],
}

const IE = INORDER_EXTREME_CODE_LINES
const INORDER_EXTREME_LOGIC_LINES: Record<number, number[]> = {
  [IE.WRAPPER_ENTER]: [3],
  [IE.INIT_BEST]: [3],
  [IE.INNER_FN]: [3],
  [IE.NULL_CHECK]: [5],
  [IE.RETURN_VOID]: [],
  [IE.RECURSE_LEFT]: [5],
  [IE.COMPARE]: [6],
  [IE.UPDATE_BEST]: [7],
  [IE.RECURSE_RIGHT]: [8],
  [IE.CALL]: [3],
  [IE.RETURN]: [10],
}

const PoT = POSTORDER_TARGET_CODE_LINES
const POSTORDER_TARGET_LOGIC_LINES: Record<number, number[]> = {
  [PoT.ENTER]: [5],
  [PoT.NULL_CHECK]: [5],
  [PoT.RETURN_NULL]: [11],
  [PoT.RECURSE_LEFT]: [5],
  [PoT.CHECK_LEFT]: [6],
  [PoT.RETURN_LEFT]: [6],
  [PoT.RECURSE_RIGHT]: [7],
  [PoT.CHECK_RIGHT]: [8],
  [PoT.RETURN_RIGHT]: [8],
  [PoT.MATCH_CHECK]: [9],
  [PoT.RETURN_MATCH]: [9],
  [PoT.RETURN]: [11],
}

const PoE = POSTORDER_EXTREME_CODE_LINES
const POSTORDER_EXTREME_LOGIC_LINES: Record<number, number[]> = {
  [PoE.WRAPPER_ENTER]: [3],
  [PoE.INIT_BEST]: [3],
  [PoE.INNER_FN]: [3],
  [PoE.NULL_CHECK]: [5],
  [PoE.RETURN_VOID]: [],
  [PoE.RECURSE_LEFT]: [5],
  [PoE.RECURSE_RIGHT]: [5],
  [PoE.COMPARE]: [6],
  [PoE.UPDATE_BEST]: [7],
  [PoE.CALL]: [3],
  [PoE.RETURN]: [9],
}

const LT = LEVEL_ORDER_TARGET_CODE_LINES
const LEVEL_ORDER_TARGET_LOGIC_LINES: Record<number, number[]> = {
  [LT.ENTER]: [3],
  [LT.NULL_CHECK]: [3],
  // Structurally unreachable (the outer dispatch already filters out a null root before this
  // runs), but still mapped for documentation, same as LEVEL_ORDER_EXTREME_CODE_LINES.RETURN_EARLY.
  [LT.RETURN_NULL]: [9],
  [LT.INIT_QUEUE]: [3],
  [LT.WHILE]: [5],
  [LT.DEQUEUE]: [5],
  [LT.MATCH_CHECK]: [6],
  [LT.RETURN_MATCH]: [6],
  [LT.CHECK_LEFT]: [7],
  [LT.ENQUEUE_LEFT]: [7],
  [LT.CHECK_RIGHT]: [7],
  [LT.ENQUEUE_RIGHT]: [7],
  [LT.RETURN]: [9],
}

const LE = LEVEL_ORDER_EXTREME_CODE_LINES
const LEVEL_ORDER_EXTREME_LOGIC_LINES: Record<number, number[]> = {
  [LE.ENTER]: [3],
  [LE.INIT_BEST]: [3],
  [LE.NULL_CHECK]: [3],
  // Structurally unreachable — see LEVEL_ORDER_TARGET_LOGIC_LINES.RETURN_NULL above.
  [LE.RETURN_EARLY]: [10],
  [LE.INIT_QUEUE]: [3],
  [LE.WHILE]: [5],
  [LE.DEQUEUE]: [5],
  [LE.COMPARE]: [6],
  [LE.UPDATE_BEST]: [7],
  [LE.CHECK_LEFT]: [8],
  [LE.ENQUEUE_LEFT]: [8],
  [LE.CHECK_RIGHT]: [8],
  [LE.ENQUEUE_RIGHT]: [8],
  [LE.RETURN]: [10],
}

const LOGIC_LINE_MAPS: Record<BinaryTreeTraversalAlgorithm, { target: Record<number, number[]>; extreme: Record<number, number[]> }> = {
  preorder: { target: PREORDER_TARGET_LOGIC_LINES, extreme: PREORDER_EXTREME_LOGIC_LINES },
  inorder: { target: INORDER_TARGET_LOGIC_LINES, extreme: INORDER_EXTREME_LOGIC_LINES },
  postorder: { target: POSTORDER_TARGET_LOGIC_LINES, extreme: POSTORDER_EXTREME_LOGIC_LINES },
  'level-order': { target: LEVEL_ORDER_TARGET_LOGIC_LINES, extreme: LEVEL_ORDER_EXTREME_LOGIC_LINES },
}

// The "Init:" line index is the same (3) across every logic block, so the pre-first-step preview
// can highlight it directly without needing a per-algorithm lookup.
const INIT_LOGIC_LINE = new Set([3])

function getLogicHighlighted(
  algorithm: BinaryTreeTraversalAlgorithm,
  goalType: GoalType,
  codeHighlighted: Set<number>,
  isBeforeFirstStep: boolean,
): Set<number> {
  if (isBeforeFirstStep) return INIT_LOGIC_LINE

  const isExtreme = goalType === 'max-value' || goalType === 'min-value'
  const map = isExtreme ? LOGIC_LINE_MAPS[algorithm].extreme : LOGIC_LINE_MAPS[algorithm].target

  const lines = new Set<number>()
  for (const codeLine of codeHighlighted) {
    for (const logicLine of map[codeLine] ?? []) lines.add(logicLine)
  }
  return lines
}

export type BinaryTreeTraversalPageProps = {
  algorithm: BinaryTreeTraversalAlgorithm
  onAlgorithmChange: (algorithm: BinaryTreeTraversalAlgorithm) => void
  goalType: GoalType
  onGoalTypeChange: (type: GoalType) => void
  goalNodeLabel: string
  onGoalNodeLabelChange: (value: string) => void
  goalValueInput: string
  onGoalValueInputChange: (value: string) => void
  isTraversalRunning: boolean
  isBeforeFirstStep: boolean
  onRunTraversal: () => void
  onStopTraversal: () => void
  canRunTraversal: boolean
  traversalStatusText: string
  isTraversalPlaying: boolean
  traversalPlaybackSpeed: number
  onTraversalPlaybackSpeedChange: (value: number) => void
  onPlayTraversal: () => void
  onPauseTraversal: () => void
  onNextTraversalStep: () => void
  onPreviousTraversalStep: () => void
  canStepForward: boolean
  canStepBackward: boolean
  canTogglePlay: boolean
  isTraversalPlaybackComplete: boolean
  traversalCodeHighlighted: Set<number>
  traversalVarsRows: string[][] | null
  pseudocodeShowLogic: boolean
  onPseudocodeFlip: () => void
}

// Sidebar page: tree-traversal setup, visually mirroring the graph canvas's TraversalPage.
// Uses a dropdown instead of a BFS/DFS pill toggle (4 traversal orders instead of 2), and the
// Inputs section drops the "Start node" field since a tree traversal always starts at the root.
export const BinaryTreeTraversalPage = ({
  algorithm,
  onAlgorithmChange,
  goalType,
  onGoalTypeChange,
  goalNodeLabel,
  onGoalNodeLabelChange,
  goalValueInput,
  onGoalValueInputChange,
  isTraversalRunning,
  isBeforeFirstStep,
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
  traversalCodeHighlighted,
  traversalVarsRows,
  pseudocodeShowLogic,
  onPseudocodeFlip,
}: BinaryTreeTraversalPageProps) => {
  const algoLabel = SHORT_LABEL_BY_ALGORITHM[algorithm]

  return (
    <div className="sidebar-page-body">
      <div className="sidebar-section">
        <h3>Traversal</h3>
        <label className="field">
          <span>Algorithm</span>
          <select
            value={algorithm}
            onChange={(event) => onAlgorithmChange(event.target.value as BinaryTreeTraversalAlgorithm)}
            disabled={isTraversalRunning}
          >
            {ALGORITHM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <AlgorithmInfoCard infoKey={INFO_KEY_BY_ALGORITHM[algorithm]} />

      <div className="sidebar-section algorithm-inputs-section">
        <h3>Inputs</h3>
        <label className="field">
          <span>Goal type</span>
          <select
            value={goalType}
            onChange={(event) => onGoalTypeChange(event.target.value as GoalType)}
            disabled={isTraversalRunning}
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
              {...NODE_LABEL_FIELD_ATTRS}
              value={goalNodeLabel}
              onChange={(event) => onGoalNodeLabelChange(event.target.value)}
              onKeyDown={confirmNodeLabelFieldOnEnter}
              disabled={isTraversalRunning}
            />
          </label>
        )}
        {goalType === 'target-value' && (
          <label className="field">
            <span>
              Goal value <span className="required-indicator" aria-hidden="true">*</span>
            </span>
            <input
              {...NODE_VALUE_FIELD_ATTRS}
              value={goalValueInput}
              onChange={(event) => onGoalValueInputChange(event.target.value)}
              disabled={isTraversalRunning}
            />
          </label>
        )}
      </div>

      <div className="sidebar-section sidebar-section--traversal-playback">
        <h3>Playback</h3>
        <PlaybackControls
          runLabel={`Run ${algoLabel}`}
          stopLabel={`Stop ${algoLabel}`}
          isRunActive={isTraversalRunning}
          onRunToggle={isTraversalRunning ? onStopTraversal : onRunTraversal}
          runDisabled={!isTraversalRunning && !canRunTraversal}
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
        codeText={CODE_BY_ALGORITHM_AND_GOAL[algorithm][goalType]}
        logicText={LOGIC_BY_ALGORITHM_AND_GOAL[algorithm][goalType]}
        codeHighlighted={traversalCodeHighlighted}
        logicHighlighted={getLogicHighlighted(algorithm, goalType, traversalCodeHighlighted, isBeforeFirstStep)}
        varsRows={traversalVarsRows}
        showLogic={pseudocodeShowLogic}
        onFlip={onPseudocodeFlip}
        canDetach={!isTraversalPlaying}
      />
    </div>
  )
}
