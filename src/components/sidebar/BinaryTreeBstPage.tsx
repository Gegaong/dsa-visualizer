import type { AlgorithmInfoKey } from '../../algorithms/algorithmInfo'
import type { BinaryTreeBstAlgorithm } from '../../algorithms/binaryTreeBst'
import {
  VALIDATE_BST_CODE_LINES,
  SEARCH_BST_CODE_LINES,
  INSERT_BST_CODE_LINES,
  DELETE_BST_CODE_LINES,
} from '../../algorithms/binaryTreeBst'

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
Init: start at the root, with bounds (-∞, +∞).
Each recursive call passes open bounds (min, max):
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
Init: start at the root.
Walk toward the target:
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
Init: start at the root, with bounds (-∞, +∞).
Each call carries open bounds (min, max):
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
Two children → use the inorder successor.
──────────────────────────────────────────
Init: start at the root.
Each call walks toward the key:
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

// Maps each pseudocode line to the logic-text line(s) it corresponds to, so the logic panel
// highlights in sync with playback the same way the code panel already does (same convention as
// BinaryTreeTraversalPage). Every logic block's line 3 is its "Init:" line. ENTER (and, for
// insert, ENTER_CONT) reruns on every recursive call, not just the root — mapping it straight to
// Init would be wrong, since it would relabel every child visit as "start at the root." Instead
// isBeforeFirstStep (see getLogicHighlighted) overrides everything to Init exactly once, before
// any real step has been taken; after that ENTER falls back to its regular per-visit mapping below.

const VL = VALIDATE_BST_CODE_LINES
const VALIDATE_LOGIC_LINES: Record<number, number[]> = {
  [VL.ENTER]: [5],
  [VL.NULL_CHECK]: [5],
  [VL.RETURN_TRUE]: [5],
  [VL.RANGE_CHECK]: [6],
  [VL.RETURN_FALSE]: [6],
  [VL.RECURSE_LEFT]: [7],
  [VL.CHECK_LEFT]: [9],
  [VL.RETURN_LEFT_FALSE]: [9],
  [VL.RECURSE_RIGHT]: [8],
  [VL.RETURN]: [10],
}

const SL = SEARCH_BST_CODE_LINES
const SEARCH_LOGIC_LINES: Record<number, number[]> = {
  [SL.ENTER]: [5],
  [SL.NULL_CHECK]: [5],
  [SL.RETURN_NULL]: [5],
  [SL.EQUAL_CHECK]: [6],
  [SL.RETURN_NODE]: [6],
  [SL.COMPARE]: [7],
  [SL.RECURSE_LEFT]: [7],
  [SL.RECURSE_RIGHT]: [8],
}

const IL = INSERT_BST_CODE_LINES
const INSERT_LOGIC_LINES: Record<number, number[]> = {
  [IL.ENTER]: [5],
  [IL.ENTER_CONT]: [5],
  [IL.NULL_CHECK]: [5],
  [IL.CREATE_NODE]: [5],
  [IL.EQUAL_CHECK]: [6],
  [IL.RETURN_EXISTING]: [6],
  [IL.COMPARE]: [7],
  [IL.ASSIGN_LEFT]: [7],
  [IL.ELSE]: [8],
  [IL.ASSIGN_RIGHT]: [8],
  [IL.RETURN]: [9],
}

const DL = DELETE_BST_CODE_LINES
const DELETE_LOGIC_LINES: Record<number, number[]> = {
  [DL.ENTER]: [5],
  [DL.NULL_RETURN]: [5],
  [DL.CMP_LEFT]: [6],
  [DL.ASSIGN_LEFT]: [6],
  [DL.CMP_RIGHT]: [7],
  [DL.ASSIGN_RIGHT]: [7],
  [DL.NO_LEFT]: [8],
  [DL.NO_RIGHT]: [9],
  [DL.ELSE]: [10],
  [DL.SUCC_INIT]: [10],
  [DL.SUCC_WALK]: [10],
  [DL.COPY_VALUE]: [11],
  [DL.DELETE_SUCC]: [12],
  // Shared final return point for every branch — doesn't correspond to one specific bullet.
  [DL.RETURN]: [],
}

const BST_LOGIC_LINE_MAPS: Record<BinaryTreeBstAlgorithm, Record<number, number[]>> = {
  validate: VALIDATE_LOGIC_LINES,
  search: SEARCH_LOGIC_LINES,
  insert: INSERT_LOGIC_LINES,
  delete: DELETE_LOGIC_LINES,
}

// The "Init:" line index is the same (3) across every logic block, so the pre-first-step preview
// can highlight it directly without needing a per-algorithm lookup.
const BST_INIT_LOGIC_LINE = new Set([3])

function getBstLogicHighlighted(
  algorithm: BinaryTreeBstAlgorithm,
  codeHighlighted: Set<number>,
  isBeforeFirstStep: boolean,
): Set<number> {
  if (isBeforeFirstStep) return BST_INIT_LOGIC_LINE

  const map = BST_LOGIC_LINE_MAPS[algorithm]
  const lines = new Set<number>()
  for (const codeLine of codeHighlighted) {
    for (const logicLine of map[codeLine] ?? []) lines.add(logicLine)
  }
  return lines
}

export type BinaryTreeBstPageProps = {
  algorithm: BinaryTreeBstAlgorithm
  onAlgorithmChange: (algorithm: BinaryTreeBstAlgorithm) => void
  targetValueInput: string
  onTargetValueInputChange: (value: string) => void
  isBstRunning: boolean
  isBeforeFirstStep: boolean
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
  isBeforeFirstStep,
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
        logicHighlighted={getBstLogicHighlighted(algorithm, bstCodeHighlighted, isBeforeFirstStep)}
        varsRows={bstVarsRows}
        showLogic={pseudocodeShowLogic}
        onFlip={onPseudocodeFlip}
        canDetach={!isBstPlaying}
      />
    </div>
  )
}
