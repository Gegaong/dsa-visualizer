import type { AlgorithmInfoKey } from '../../algorithms/algorithmInfo'
import type { BinaryTreeTraversalAlgorithm } from '../../algorithms/binaryTreeTraversal'
import type { GoalType } from '../../types'

import { AlgorithmInfoCard } from './AlgorithmInfoCard'
import { PlaybackControls } from './PlaybackControls'
import { PseudocodePanel } from './PseudocodePanel'
import { confirmNodeLabelFieldOnEnter } from './sidebarFieldHelpers'

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
Each step:
  · Recurse left, then right.
  · After children: compare current node.value to max.
    - Better → update max.
──────────────────────────────────────────
Walk ends → return max.`,
    'min-value': `Postorder updates min
after both subtrees.
──────────────────────────────────────────
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
Each step:
  · Dequeue a node to visit.
  · If it matches the goal → stop now.
  · Otherwise enqueue left/right children.
──────────────────────────────────────────
Queue empties → goal is unreachable.`,
    'target-value': `Level-order visits
nodes level by level.
──────────────────────────────────────────
Each step:
  · Dequeue a node to visit.
  · If its value matches → stop now.
  · Otherwise enqueue left/right children.
──────────────────────────────────────────
Queue empties → target value not found.`,
    'max-value': `Level-order walks all
nodes with a running max.
──────────────────────────────────────────
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
Each step:
  · Dequeue the current node.
  · Compare node.value with the running min.
    - Better (smaller) → update min.
  · Enqueue left/right children if present.
──────────────────────────────────────────
Queue empties → return min.`,
  },
}

const NO_HIGHLIGHTS = new Set<number>()

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
              type="text"
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
              type="text"
              inputMode="numeric"
              value={goalValueInput}
              onChange={(event) => onGoalValueInputChange(event.target.value)}
              disabled={isTraversalRunning}
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
        logicHighlighted={NO_HIGHLIGHTS}
        varsRows={traversalVarsRows}
        showLogic={pseudocodeShowLogic}
        onFlip={onPseudocodeFlip}
        canDetach={!isTraversalPlaying}
      />
    </div>
  )
}
