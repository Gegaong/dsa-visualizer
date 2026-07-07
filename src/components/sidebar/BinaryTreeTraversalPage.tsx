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

const CODE_BY_ALGORITHM: Record<BinaryTreeTraversalAlgorithm, string> = {
  preorder: `function preorder(node):
    if node = null:
        return
    visit(node)
    preorder(node.left)
    preorder(node.right)`,
  inorder: `function inorder(node):
    if node = null:
        return
    inorder(node.left)
    visit(node)
    inorder(node.right)`,
  postorder: `function postorder(node):
    if node = null:
        return
    postorder(node.left)
    postorder(node.right)
    visit(node)`,
  'level-order': `function levelOrder(root):
    if root = null:
        return
    queue ← [root]
    while queue ≠ empty:
        node ← queue.dequeue()
        visit(node)
        if node.left ≠ null:
            queue.enqueue(node.left)
        if node.right ≠ null:
            queue.enqueue(node.right)`,
}

const LOGIC_BY_ALGORITHM: Record<BinaryTreeTraversalAlgorithm, string> = {
  preorder: `Recursion visits a node before its
children — handy for copying or
serializing a tree structure.
──────────────────────────────────────────
Each step:
  · Visit the current node and record its value.
  · Recurse into the left child, applying this
    same rule to it and everything below it.
  · Once that call returns, recurse into the
    right child the same way.
──────────────────────────────────────────
No children left → return to the caller.`,
  inorder: `Recursion visits a node strictly
between its two children — on a
binary search tree this yields
sorted values.
──────────────────────────────────────────
Each step:
  · Recurse into the left child first, applying
    this same rule to it and everything below it.
  · Once that call returns, visit the current
    node and record its value.
  · Recurse into the right child the same way.
──────────────────────────────────────────
No children left → return to the caller.`,
  postorder: `Recursion visits a node only after
both children are done — handy for
safely deleting or freeing a tree.
──────────────────────────────────────────
Each step:
  · Recurse into the left child first, applying
    this same rule to it and everything below it.
  · Recurse into the right child the same way.
  · Once both calls return, visit the current
    node and record its value.
──────────────────────────────────────────
No children left → visit self, return to caller.`,
  'level-order': `A queue visits nodes level by
level, left to right — the same
idea BFS uses on a graph.
──────────────────────────────────────────
Each step:
  · Dequeue the front node and visit it.
  · Enqueue its left child, if it has one.
  · Enqueue its right child, if it has one.
──────────────────────────────────────────
Queue empties → every node has been visited.`,
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
        codeText={CODE_BY_ALGORITHM[algorithm]}
        logicText={LOGIC_BY_ALGORITHM[algorithm]}
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
