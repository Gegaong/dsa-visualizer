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
    'target-node': `function preorder(root, goal):
    if root = null:
        return null
    if root.label = goal:
        return root
    leftResult ← preorder(root.left, goal)
    if leftResult ≠ null:
        return leftResult
    rightResult ← preorder(root.right, goal)
    return rightResult`,
    'target-value': `function preorder(root, target):
    if root = null:
        return null
    if root.value = target:
        return root
    leftResult ← preorder(root.left, target)
    if leftResult ≠ null:
        return leftResult
    rightResult ← preorder(root.right, target)
    return rightResult`,
    'max-value': `function preorderMax(root):
    best ← -∞
    bestNodes ← []
    function preorder(node):
        if node = null:
            return
        if node.value > best:
            best ← node.value
            bestNodes ← [node]
        else if node.value = best:
            bestNodes.append(node)
        preorder(node.left)
        preorder(node.right)
    preorder(root)
    return bestNodes`,
    'min-value': `function preorderMin(root):
    best ← +∞
    bestNodes ← []
    function preorder(node):
        if node = null:
            return
        if node.value < best:
            best ← node.value
            bestNodes ← [node]
        else if node.value = best:
            bestNodes.append(node)
        preorder(node.left)
        preorder(node.right)
    preorder(root)
    return bestNodes`,
  },

  inorder: {
    'target-node': `function inorder(root, goal):
    if root = null:
        return null
    leftResult ← inorder(root.left, goal)
    if leftResult ≠ null:
        return leftResult
    if root.label = goal:
        return root
    rightResult ← inorder(root.right, goal)
    return rightResult`,
    'target-value': `function inorder(root, target):
    if root = null:
        return null
    leftResult ← inorder(root.left, target)
    if leftResult ≠ null:
        return leftResult
    if root.value = target:
        return root
    rightResult ← inorder(root.right, target)
    return rightResult`,
    'max-value': `function inorderMax(root):
    best ← -∞
    bestNodes ← []
    function inorder(node):
        if node = null:
            return
        inorder(node.left)
        if node.value > best:
            best ← node.value
            bestNodes ← [node]
        else if node.value = best:
            bestNodes.append(node)
        inorder(node.right)
    inorder(root)
    return bestNodes`,
    'min-value': `function inorderMin(root):
    best ← +∞
    bestNodes ← []
    function inorder(node):
        if node = null:
            return
        inorder(node.left)
        if node.value < best:
            best ← node.value
            bestNodes ← [node]
        else if node.value = best:
            bestNodes.append(node)
        inorder(node.right)
    inorder(root)
    return bestNodes`,
  },

  postorder: {
    'target-node': `function postorder(root, goal):
    if root = null:
        return null
    leftResult ← postorder(root.left, goal)
    if leftResult ≠ null:
        return leftResult
    rightResult ← postorder(root.right, goal)
    if rightResult ≠ null:
        return rightResult
    if root.label = goal:
        return root
    return null`,
    'target-value': `function postorder(root, target):
    if root = null:
        return null
    leftResult ← postorder(root.left, target)
    if leftResult ≠ null:
        return leftResult
    rightResult ← postorder(root.right, target)
    if rightResult ≠ null:
        return rightResult
    if root.value = target:
        return root
    return null`,
    'max-value': `function postorderMax(root):
    best ← -∞
    bestNodes ← []
    function postorder(node):
        if node = null:
            return
        postorder(node.left)
        postorder(node.right)
        if node.value > best:
            best ← node.value
            bestNodes ← [node]
        else if node.value = best:
            bestNodes.append(node)
    postorder(root)
    return bestNodes`,
    'min-value': `function postorderMin(root):
    best ← +∞
    bestNodes ← []
    function postorder(node):
        if node = null:
            return
        postorder(node.left)
        postorder(node.right)
        if node.value < best:
            best ← node.value
            bestNodes ← [node]
        else if node.value = best:
            bestNodes.append(node)
    postorder(root)
    return bestNodes`,
  },

  'level-order': {
    'target-node': `function levelOrder(root, goal):
    if root = null:
        return null
    queue ← [root]
    while queue ≠ empty:
        node ← queue.dequeue()
        if node.label = goal:
            return node
        if node.left ≠ null:
            queue.enqueue(node.left)
        if node.right ≠ null:
            queue.enqueue(node.right)
    return null`,
    'target-value': `function levelOrder(root, target):
    if root = null:
        return null
    queue ← [root]
    while queue ≠ empty:
        node ← queue.dequeue()
        if node.value = target:
            return node
        if node.left ≠ null:
            queue.enqueue(node.left)
        if node.right ≠ null:
            queue.enqueue(node.right)
    return null`,
    'max-value': `function levelOrderMax(root):
    best ← -∞
    bestNodes ← []
    if root = null:
        return bestNodes
    queue ← [root]
    while queue ≠ empty:
        node ← queue.dequeue()
        if node.value > best:
            best ← node.value
            bestNodes ← [node]
        else if node.value = best:
            bestNodes.append(node)
        if node.left ≠ null:
            queue.enqueue(node.left)
        if node.right ≠ null:
            queue.enqueue(node.right)
    return bestNodes`,
    'min-value': `function levelOrderMin(root):
    best ← +∞
    bestNodes ← []
    if root = null:
        return bestNodes
    queue ← [root]
    while queue ≠ empty:
        node ← queue.dequeue()
        if node.value < best:
            best ← node.value
            bestNodes ← [node]
        else if node.value = best:
            bestNodes.append(node)
        if node.left ≠ null:
            queue.enqueue(node.left)
        if node.right ≠ null:
            queue.enqueue(node.right)
    return bestNodes`,
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
──────────────────────────────────────────
No nodes left → goal is unreachable.`,
    'target-value': `Preorder visits node
before its children.
──────────────────────────────────────────
Each step:
  · Visit the current node.
  · If its value matches → stop now.
  · Otherwise: recurse left, then right.
──────────────────────────────────────────
No nodes left → target value not found.`,
    'max-value': `Preorder keeps a
running max while walking.
──────────────────────────────────────────
Each step:
  · Visit the current node.
  · Compare node.value with the running best.
    - Better → update best + reset winners.
    - Equal → add this node as a tie.
  · Recurse left, then right.
──────────────────────────────────────────
Walk ends → return best (with ties).`,
    'min-value': `Preorder keeps a
running min while walking.
──────────────────────────────────────────
Each step:
  · Visit the current node.
  · Compare node.value with the running best.
    - Better (smaller) → update best + reset winners.
    - Equal → add this node as a tie.
  · Recurse left, then right.
──────────────────────────────────────────
Walk ends → return best (with ties).`,
  },

  inorder: {
    'target-node': `Inorder visits left,
then node, then right.
──────────────────────────────────────────
Each step:
  · Recurse into the left child.
  · If current node matches → stop now.
  · Otherwise: recurse into the right child.
──────────────────────────────────────────
No nodes left → goal is unreachable.`,
    'target-value': `Inorder visits left,
then node, then right.
──────────────────────────────────────────
Each step:
  · Recurse into the left child.
  · If current.value matches → stop now.
  · Otherwise: recurse into the right child.
──────────────────────────────────────────
No nodes left → target value not found.`,
    'max-value': `Inorder updates max
when each node is visited.
──────────────────────────────────────────
Each step:
  · Recurse left.
  · Visit current node; compare to running best.
    - Better → update best + reset winners.
    - Equal → add this node as a tie.
  · Recurse right.
──────────────────────────────────────────
Walk ends → return best (with ties).`,
    'min-value': `Inorder updates min
when each node is visited.
──────────────────────────────────────────
Each step:
  · Recurse left.
  · Visit current node; compare to running best.
    - Better (smaller) → update best + reset winners.
    - Equal → add this node as a tie.
  · Recurse right.
──────────────────────────────────────────
Walk ends → return best (with ties).`,
  },

  postorder: {
    'target-node': `Postorder visits
children before node.
──────────────────────────────────────────
Each step:
  · Recurse left subtree.
  · Then recurse right subtree.
  · If current node matches → stop now.
──────────────────────────────────────────
No nodes left → goal is unreachable.`,
    'target-value': `Postorder visits
children before node.
──────────────────────────────────────────
Each step:
  · Recurse left subtree.
  · Then recurse right subtree.
  · If current.value matches → stop now.
──────────────────────────────────────────
No nodes left → target value not found.`,
    'max-value': `Postorder updates max
after both subtrees.
──────────────────────────────────────────
Each step:
  · Recurse left, then right.
  · After children: compare current node.value to best.
    - Better → update best + reset winners.
    - Equal → add this node as a tie.
──────────────────────────────────────────
Walk ends → return best (with ties).`,
    'min-value': `Postorder updates min
after both subtrees.
──────────────────────────────────────────
Each step:
  · Recurse left, then right.
  · After children: compare current node.value to best.
    - Better (smaller) → update best + reset winners.
    - Equal → add this node as a tie.
──────────────────────────────────────────
Walk ends → return best (with ties).`,
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
  · Compare node.value with the running best.
    - Better → update best + reset winners.
    - Equal → add this node as a tie.
  · Enqueue left/right children if present.
──────────────────────────────────────────
Queue empties → return best (with ties).`,
    'min-value': `Level-order walks all
nodes with a running min.
──────────────────────────────────────────
Each step:
  · Dequeue the current node.
  · Compare node.value with the running best.
    - Better (smaller) → update best + reset winners.
    - Equal → add this node as a tie.
  · Enqueue left/right children if present.
──────────────────────────────────────────
Queue empties → return best (with ties).`,
  },
}

// No pseudocode line is highlighted yet — only node highlighting on the canvas reflects live
// playback for now.
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
  pseudocodeShowLogic: boolean
  onPseudocodeFlip: () => void
}

// Sidebar page: tree-traversal setup, visually mirroring the graph canvas's TraversalPage.
// Uses a dropdown instead of a BFS/DFS pill toggle (4 traversal orders instead of 2), and the
// Inputs section drops the "Start node" field since a tree traversal always starts at the root.
// Only preorder is actually wired up to a real algorithm so far — the rest just report as
// not-yet-implemented when Run is pressed (see useBinaryTreeTraversalPlayback).
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
        codeHighlighted={NO_HIGHLIGHTS}
        logicHighlighted={NO_HIGHLIGHTS}
        varsRows={null}
        showLogic={pseudocodeShowLogic}
        onFlip={onPseudocodeFlip}
        canDetach={!isTraversalPlaying}
      />
    </div>
  )
}
