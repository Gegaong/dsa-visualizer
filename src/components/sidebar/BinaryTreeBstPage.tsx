import type { AlgorithmInfoKey } from '../../algorithms/algorithmInfo'
import type { BinaryTreeBstAlgorithm } from '../../algorithms/binaryTreeBst'

import { AlgorithmInfoCard } from './AlgorithmInfoCard'
import { PlaybackControls } from './PlaybackControls'
import { PseudocodePanel } from './PseudocodePanel'
import { NODE_VALUE_FIELD_ATTRS } from './sidebarFieldHelpers'

const ALGORITHM_OPTIONS: { value: BinaryTreeBstAlgorithm; label: string }[] = [
  { value: 'validate', label: 'Validate BST' },
  { value: 'search', label: 'Search' },
  { value: 'insert', label: 'Insert' },
  { value: 'delete', label: 'Delete' },
]

const INFO_KEY_BY_ALGORITHM: Record<BinaryTreeBstAlgorithm, AlgorithmInfoKey | null> = {
  validate: 'bt-validate',
  search: 'bt-search',
  insert: 'bt-insert',
  delete: 'bt-delete',
}

const VALIDATE_CODE = `function isValidBST(node, min, max):
    if node = null:
        return true
    if node.value ∉ (min, max):
        return false
    leftOk ← isValidBST(node.left, min, node.value)
    if leftOk = false:
        return false
    rightOk ← isValidBST(node.right, node.value, max)
    return rightOk`

const VALIDATE_LOGIC = `Check if every node stays
strictly inside its range.
──────────────────────────────────────────
Each recursive call passes open bounds (min, max):
  · Root starts with (-∞, +∞).
  · Empty subtree is always valid.
  · Equals or outside bounds → invalid.
  · Left child gets max = node.value.
  · Right child gets min = node.value.
  · Left subtree must be valid to continue.
  · Final result comes from right subtree.
──────────────────────────────────────────
All nodes strictly in range → tree is a BST.`

const SEARCH_CODE = `function searchBST(node, target):
    if node = null:
        return null
    if node.value = target:
        return node
    if target < node.value:
        return searchBST(node.left, target)
    return searchBST(node.right, target)`

const SEARCH_LOGIC = `Search the tree for a target
value using strict BST order.
──────────────────────────────────────────
Walk from the root toward the target:
  · Empty node → target is not in the tree.
  · Matching value → return that node.
  · Target smaller → only search the left.
  · Target larger → only search the right.
──────────────────────────────────────────
At most one match — values are unique.`

const INSERT_CODE = `function insertBST(node, value,
    min, max):
    if node = null:
        return new Node(value)
    if value = node.value:
        return node
    if value < node.value:
        node.left ← insertBST(node.left, value, min, node.value)
    else:
        node.right ← insertBST(node.right, value, node.value, max)
    return node`

const INSERT_LOGIC = `Insert a value into a strict BST:
left < node < right, no duplicates.
──────────────────────────────────────────
Each call carries open bounds (min, max):
  · Root starts with (-∞, +∞).
  · Empty slot → create the new node there.
  · Value already present → leave tree unchanged.
  · Value < node → left, with max = node.value.
  · Value > node → right, with min = node.value.
  · After linking the child, return node.
──────────────────────────────────────────
The new leaf sits strictly inside every
ancestor's range.`

const DELETE_CODE = `function deleteBST(node, key):
    if node = null: return null
    if key < node.value:
        node.left ← deleteBST(node.left, key)
    else if key > node.value:
        node.right ← deleteBST(node.right, key)
    else if node.left = null: return node.right
    else if node.right = null: return node.left
    else:
        succ ← node.right
        while succ.left ≠ null: succ ← succ.left
        node.value ← succ.value
        node.right ← deleteBST(node.right, succ.value)
    return node`

const DELETE_LOGIC = `Delete a key from a strict BST.
Two children → replace with inorder
successor, then remove that successor.
──────────────────────────────────────────
  · Missing node → nothing to delete.
  · Key smaller → recurse left.
  · Key larger → recurse right.
  · No left child → replace with right.
  · No right child → replace with left.
  · Both children → find min in right,
    copy its value into node, then
    delete that successor from the right.
──────────────────────────────────────────
Value copy is visible before the
successor node is spliced out.`

const CODE_BY_ALGORITHM: Record<BinaryTreeBstAlgorithm, string> = {
  validate: VALIDATE_CODE,
  search: SEARCH_CODE,
  insert: INSERT_CODE,
  delete: DELETE_CODE,
}

const LOGIC_BY_ALGORITHM: Record<BinaryTreeBstAlgorithm, string> = {
  validate: VALIDATE_LOGIC,
  search: SEARCH_LOGIC,
  insert: INSERT_LOGIC,
  delete: DELETE_LOGIC,
}

const NO_HIGHLIGHTS = new Set<number>()

export type BinaryTreeBstPageProps = {
  algorithm: BinaryTreeBstAlgorithm
  onAlgorithmChange: (algorithm: BinaryTreeBstAlgorithm) => void
  targetValueInput: string
  onTargetValueInputChange: (value: string) => void
  isBstRunning: boolean
  onRunAlgorithm: () => void
  onStopAlgorithm: () => void
  canRunAlgorithm: boolean
  bstStatusText: string
  isBstPlaying: boolean
  bstPlaybackSpeed: number
  onBstPlaybackSpeedChange: (value: number) => void
  onPlayBst: () => void
  onPauseBst: () => void
  onNextBstStep: () => void
  onPreviousBstStep: () => void
  canStepForward: boolean
  canStepBackward: boolean
  canTogglePlay: boolean
  isBstPlaybackComplete: boolean
  bstCodeHighlighted: Set<number>
  bstVarsRows: string[][] | null
  pseudocodeShowLogic: boolean
  onPseudocodeFlip: () => void
}

export const BinaryTreeBstPage = ({
  algorithm,
  onAlgorithmChange,
  targetValueInput,
  onTargetValueInputChange,
  isBstRunning,
  onRunAlgorithm,
  onStopAlgorithm,
  canRunAlgorithm,
  bstStatusText,
  isBstPlaying,
  bstPlaybackSpeed,
  onBstPlaybackSpeedChange,
  onPlayBst,
  onPauseBst,
  onNextBstStep,
  onPreviousBstStep,
  canStepForward,
  canStepBackward,
  canTogglePlay,
  isBstPlaybackComplete,
  bstCodeHighlighted,
  bstVarsRows,
  pseudocodeShowLogic,
  onPseudocodeFlip,
}: BinaryTreeBstPageProps) => {
  const algoLabel =
    ALGORITHM_OPTIONS.find((option) => option.value === algorithm)?.label ?? algorithm
  const infoKey = INFO_KEY_BY_ALGORITHM[algorithm]
  const showValueInput = algorithm === 'search' || algorithm === 'insert' || algorithm === 'delete'

  return (
    <div className="sidebar-page-body">
      <div className="sidebar-section">
        <h3>Binary Search Tree</h3>
        <label className="field">
          <span>Select algorithm</span>
          <select
            value={algorithm}
            onChange={(event) => onAlgorithmChange(event.target.value as BinaryTreeBstAlgorithm)}
            disabled={isBstRunning}
          >
            {ALGORITHM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      {infoKey && <AlgorithmInfoCard infoKey={infoKey} />}

      {showValueInput && (
        <div className="sidebar-section algorithm-inputs-section">
          <h3>Inputs</h3>
          <label className="field">
            <span>
              {algorithm === 'insert' ? 'Value' : algorithm === 'delete' ? 'Key' : 'Target value'}{' '}
              <span className="required-indicator" aria-hidden="true">*</span>
            </span>
            <input
              {...NODE_VALUE_FIELD_ATTRS}
              value={targetValueInput}
              onChange={(event) => onTargetValueInputChange(event.target.value)}
              disabled={isBstRunning}
            />
          </label>
        </div>
      )}

      <div className="sidebar-section sidebar-section--traversal-playback">
        <h3>Playback</h3>
        <PlaybackControls
          runLabel={`Run ${algoLabel}`}
          stopLabel={`Stop ${algoLabel}`}
          isRunActive={isBstRunning}
          onRunToggle={isBstRunning ? onStopAlgorithm : onRunAlgorithm}
          runDisabled={!isBstRunning && !canRunAlgorithm}
          onPrevious={onPreviousBstStep}
          onNext={onNextBstStep}
          onPlayPauseToggle={isBstPlaying ? onPauseBst : onPlayBst}
          isPlaying={isBstPlaying}
          isPlaybackComplete={isBstPlaybackComplete}
          canStepBackward={canStepBackward}
          canStepForward={canStepForward}
          canTogglePlay={canTogglePlay}
          speed={bstPlaybackSpeed}
          onSpeedChange={onBstPlaybackSpeedChange}
        />
        <p className="hint">{bstStatusText}</p>
      </div>

      <PseudocodePanel
        codeText={CODE_BY_ALGORITHM[algorithm]}
        logicText={LOGIC_BY_ALGORITHM[algorithm]}
        codeHighlighted={bstCodeHighlighted}
        logicHighlighted={NO_HIGHLIGHTS}
        varsRows={bstVarsRows}
        showLogic={pseudocodeShowLogic}
        onFlip={onPseudocodeFlip}
        canDetach={!isBstPlaying}
      />
    </div>
  )
}
