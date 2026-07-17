import type { AlgorithmInfoKey } from '../../algorithms/algorithmInfo'
import type { BinaryTreeBstAlgorithm } from '../../algorithms/binaryTreeBst'

import { AlgorithmInfoCard } from './AlgorithmInfoCard'
import { PlaybackControls } from './PlaybackControls'
import { PseudocodePanel } from './PseudocodePanel'

const ALGORITHM_OPTIONS: { value: BinaryTreeBstAlgorithm; label: string }[] = [
  { value: 'validate', label: 'Validate BST' },
  { value: 'search', label: 'Search' },
  { value: 'insert', label: 'Insert' },
  { value: 'delete', label: 'Delete' },
]

const INFO_KEY_BY_ALGORITHM: Record<BinaryTreeBstAlgorithm, AlgorithmInfoKey | null> = {
  validate: 'bt-validate',
  search: null,
  insert: null,
  delete: null,
}

const VALIDATE_CODE = `function isValidBST(node, min, max):
    if node = null:
        return true
    if node.value < min or node.value > max:
        return false
    leftOk ← isValidBST(node.left, min, node.value)
    if leftOk = false:
        return false
    rightOk ← isValidBST(node.right, node.value, max)
    return rightOk`

const VALIDATE_LOGIC = `Check if every node stays
within its valid range.
──────────────────────────────────────────
Each recursive call passes bounds [min, max]:
  · Root starts with [-∞, +∞].
  · Empty subtree is always valid.
  · If node exceeds bounds → invalid.
  · Left child gets max = node.value.
  · Right child gets min = node.value.
  · Left subtree must be valid to continue.
  · Final result comes from right subtree.
──────────────────────────────────────────
All nodes within bounds → tree is valid.`

const CODE_BY_ALGORITHM: Record<BinaryTreeBstAlgorithm, string> = {
  validate: VALIDATE_CODE,
  search: '// Coming soon',
  insert: '// Coming soon',
  delete: '// Coming soon',
}

const LOGIC_BY_ALGORITHM: Record<BinaryTreeBstAlgorithm, string> = {
  validate: VALIDATE_LOGIC,
  search: 'Search is coming soon.',
  insert: 'Insert is coming soon.',
  delete: 'Delete is coming soon.',
}

const NO_HIGHLIGHTS = new Set<number>()

export type BinaryTreeBstPageProps = {
  algorithm: BinaryTreeBstAlgorithm
  onAlgorithmChange: (algorithm: BinaryTreeBstAlgorithm) => void
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
        codeHighlighted={algorithm === 'validate' ? bstCodeHighlighted : NO_HIGHLIGHTS}
        logicHighlighted={NO_HIGHLIGHTS}
        varsRows={algorithm === 'validate' ? bstVarsRows : null}
        showLogic={pseudocodeShowLogic}
        onFlip={onPseudocodeFlip}
        canDetach={!isBstPlaying}
      />
    </div>
  )
}
