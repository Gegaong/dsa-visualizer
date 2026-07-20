import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { BinaryTree, BinaryTreeSide } from '../types'

import {
  buildDeleteBstCompletionStatus,
  buildInsertBstCompletionStatus,
  buildSearchBstCompletionStatus,
  buildValidateBstCompletionStatus,
  canRunDeleteBst,
  canRunInsertBst,
  canRunValidateBst,
  formatBstBound,
  runDeleteBstExec,
  runInsertBstExec,
  runSearchBstExec,
  runValidateBstExec,
  insertBstHighlightLines,
  treeAfterDeleteMutations,
  type BinaryTreeBstAlgorithm,
  type BinaryTreeBstExecResult,
  type BinaryTreeDeleteBstResult,
  type BinaryTreeInsertBstResult,
} from '../algorithms/binaryTreeBst'

import {
  PLAYBACK_MIN_DELAY_MS,
  PLAYBACK_MAX_DELAY_MS,
  BINARY_TREE_PLAYBACK_DEFAULT_DELAY_MS,
} from '../utils/constants'
import { parseNumberInput, sanitizeNumericInput } from '../utils/format'

import { useStepPlayback } from './useStepPlayback'

const ALGO_LABEL: Record<BinaryTreeBstAlgorithm, string> = {
  validate: 'Validate BST',
  search: 'Search',
  insert: 'Insert',
  delete: 'Delete',
}

const IMPLEMENTED: ReadonlySet<BinaryTreeBstAlgorithm> = new Set([
  'validate',
  'search',
  'insert',
  'delete',
])

const IDLE_STATUS: Record<BinaryTreeBstAlgorithm, string> = {
  validate: 'Run Validate BST to check the search-tree property.',
  search: 'Run Search to look up a target value in the BST.',
  insert: 'Run Insert to place a value into the BST.',
  delete: 'Run Delete to remove a key from the BST.',
}

type ApplyInsertResult = { id: string; label: string }

type UseBinaryTreeBstPlaybackParams = {
  tree: BinaryTree
  // Called when playback reaches CREATE_NODE — must add the leaf and return its id/label.
  onApplyInsert?: (
    parentNodeId: string | null,
    side: BinaryTreeSide | null,
    value: number,
  ) => ApplyInsertResult
  // Called when stepping back before CREATE_NODE — removes the leaf added by onApplyInsert.
  onUndoInsert?: (nodeId: string) => void
  // Called during Delete playback to sync the canvas tree to the step's mutation state.
  onSyncDeleteTree?: (tree: BinaryTree) => void
}

export type BinaryTreeBstHandle = {
  algorithm: BinaryTreeBstAlgorithm
  setAlgorithm: (algorithm: BinaryTreeBstAlgorithm) => void

  targetValueInput: string
  handleTargetValueInputChange: (value: string) => void

  visitedNodeIds: string[]
  currentNodeId: string | null
  startNodeId: string | null
  // Node that broke the BST range check — rendered red on the canvas.
  violationNodeIds: string[]
  // Matched search / insert / delete focus — blue goal on canvas.
  goalNodeIds: string[]

  isRunning: boolean

  isPlaying: boolean
  playbackSpeed: number
  canStepBackward: boolean
  canStepForward: boolean
  canTogglePlay: boolean
  isPlaybackComplete: boolean

  bstCodeHighlighted: Set<number>
  bstVarsRows: string[][] | null

  resetVisualization: () => void
  runAlgorithm: () => void
  stepForward: () => void
  stepBackward: () => void
  play: () => void
  pause: () => void
  onPlaybackSpeedChange: (value: number) => void
  sidebarStatusText: string
  canRunAlgorithm: boolean
}

function buildValidateVarsRows(
  nodeLabel: string,
  minBound: number | null,
  maxBound: number | null,
  extras?: { leftOk?: string; rightOk?: string },
): string[][] {
  const boundsRow = [
    `node = ${nodeLabel}`,
    `min = ${minBound === null ? '—' : formatBstBound(minBound)}`,
    `max = ${maxBound === null ? '—' : formatBstBound(maxBound)}`,
  ]
  if (extras?.leftOk !== undefined && extras?.rightOk !== undefined) {
    return [boundsRow, [`leftOk = ${extras.leftOk}`, `rightOk = ${extras.rightOk}`]]
  }
  return [boundsRow]
}

function buildValueVarsRows(
  nodeLabel: string,
  valueKey: 'target' | 'value',
  value: number | null,
): string[][] {
  return [[
    `node = ${nodeLabel}`,
    `${valueKey} = ${value === null ? '—' : String(value)}`,
  ]]
}

function buildInsertVarsRows(
  nodeLabel: string,
  value: number | null,
  minBound: number | null,
  maxBound: number | null,
): string[][] {
  return [[
    `node = ${nodeLabel}`,
    `value = ${value === null ? '—' : String(value)}`,
    `min = ${minBound === null ? '—' : formatBstBound(minBound)}`,
    `max = ${maxBound === null ? '—' : formatBstBound(maxBound)}`,
  ]]
}

function buildDeleteVarsRows(
  nodeLabel: string,
  key: number | null,
  succLabel: string | null,
): string[][] {
  const row = [
    `node = ${nodeLabel}`,
    `key = ${key === null ? '—' : String(key)}`,
  ]
  if (succLabel !== null) row.push(`succ = ${succLabel}`)
  return [row]
}

export function useBinaryTreeBstPlayback({
  tree,
  onApplyInsert,
  onUndoInsert,
  onSyncDeleteTree,
}: UseBinaryTreeBstPlaybackParams): BinaryTreeBstHandle {
  const [algorithm, setAlgorithmState] = useState<BinaryTreeBstAlgorithm>('validate')
  const [targetValueInput, setTargetValueInput] = useState('')

  const [visitedNodeIds, setVisitedNodeIds] = useState<string[]>([])
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
  const [violationNodeIds, setViolationNodeIds] = useState<string[]>([])
  const [goalNodeIds, setGoalNodeIds] = useState<string[]>([])
  const [codeHighlighted, setCodeHighlighted] = useState<Set<number>>(new Set())
  const [statusText, setStatusText] = useState(IDLE_STATUS.validate)
  const [isRunning, setIsRunning] = useState(false)
  const [execResult, setExecResult] = useState<BinaryTreeBstExecResult | null>(null)
  const [insertedLabel, setInsertedLabel] = useState<string | null>(null)

  const execResultRef = useRef<BinaryTreeBstExecResult | null>(null)
  const insertedNodeIdRef = useRef<string | null>(null)
  const insertedLabelRef = useRef<string | null>(null)
  const finalizeRunRef = useRef<(r: BinaryTreeBstExecResult) => void>(() => {})
  const stopPlaybackRef = useRef(() => {})
  const onApplyInsertRef = useRef(onApplyInsert)
  const onUndoInsertRef = useRef(onUndoInsert)
  const onSyncDeleteTreeRef = useRef(onSyncDeleteTree)
  const [playbackSession, setPlaybackSession] = useState(0)

  useEffect(() => {
    execResultRef.current = execResult
  }, [execResult])

  const isPlaybackCompleteRef = useRef(false)

  useEffect(() => {
    onApplyInsertRef.current = onApplyInsert
    onUndoInsertRef.current = onUndoInsert
    onSyncDeleteTreeRef.current = onSyncDeleteTree
  }, [onApplyInsert, onUndoInsert, onSyncDeleteTree])

  const rootLabel = tree.rootId ? (tree.nodesById[tree.rootId]?.label ?? '—') : '—'
  const rootLabelTagged = rootLabel === '—' ? rootLabel : `${rootLabel}(root)`

  const undoInsertIfNeeded = () => {
    const id = insertedNodeIdRef.current
    if (!id) return
    onUndoInsertRef.current?.(id)
    insertedNodeIdRef.current = null
    insertedLabelRef.current = null
    setInsertedLabel(null)
  }

  const syncInsertPresence = (result: BinaryTreeInsertBstResult, boundedIndex: number) => {
    if (!result.didInsert) return
    const shouldHaveNode = boundedIndex >= result.insertStepIndex
    if (shouldHaveNode && !insertedNodeIdRef.current) {
      const applied = onApplyInsertRef.current?.(result.parentNodeId, result.side, result.value)
      if (applied) {
        insertedNodeIdRef.current = applied.id
        insertedLabelRef.current = applied.label
        setInsertedLabel(applied.label)
      }
    } else if (!shouldHaveNode && insertedNodeIdRef.current) {
      undoInsertIfNeeded()
    }
  }

  const highlightForStep = (result: BinaryTreeBstExecResult, codeLine: number): Set<number> => {
    if (result.kind === 'insert') return insertBstHighlightLines(codeLine)
    return new Set([codeLine])
  }

  const syncDeleteTreeToStep = (result: BinaryTreeDeleteBstResult, stepIndex: number) => {
    const nextTree =
      stepIndex < 0
        ? result.baseTree
        : treeAfterDeleteMutations(result.baseTree, result.mutations, stepIndex)
    onSyncDeleteTreeRef.current?.(nextTree)
  }

  const applyStepIndex = (currentResult: BinaryTreeBstExecResult, index: number) => {
    if (index < 0) {
      if (currentResult.kind === 'insert') undoInsertIfNeeded()
      if (currentResult.kind === 'delete') syncDeleteTreeToStep(currentResult, -1)
      setCurrentNodeId(tree.rootId)
      setVisitedNodeIds([])
      setCodeHighlighted(highlightForStep(currentResult, 0))
      setViolationNodeIds([])
      setGoalNodeIds([])
      setStatusText(`${ALGO_LABEL[algorithm]} ready. Press Play or step through line by line.`)
      return
    }

    const boundedIndex = Math.min(index, currentResult.steps.length - 1)
    const step = currentResult.steps[boundedIndex]

    if (currentResult.kind === 'insert') {
      syncInsertPresence(currentResult, boundedIndex)
    }
    if (currentResult.kind === 'delete') {
      syncDeleteTreeToStep(currentResult, boundedIndex)
    }

    const insertedId = insertedNodeIdRef.current
    const onInsertCreate =
      currentResult.kind === 'insert' &&
      currentResult.didInsert &&
      boundedIndex >= currentResult.insertStepIndex &&
      insertedId

    setCurrentNodeId(onInsertCreate ? insertedId : step.nodeId)
    setVisitedNodeIds(step.visitedNodeIds)
    setCodeHighlighted(highlightForStep(currentResult, step.codeLine))

    if (currentResult.kind === 'validate' && currentResult.violationNodeId) {
      const violationIndex = currentResult.steps.findIndex((s) => s.violated)
      setViolationNodeIds(
        violationIndex >= 0 && boundedIndex >= violationIndex
          ? [currentResult.violationNodeId]
          : [],
      )
    } else {
      setViolationNodeIds([])
    }

    if (currentResult.kind === 'search' && currentResult.foundNodeId) {
      const matchIndex = currentResult.steps.findIndex((s) => s.matched)
      setGoalNodeIds(
        matchIndex >= 0 && boundedIndex >= matchIndex
          ? [currentResult.foundNodeId]
          : [],
      )
    } else if (
      currentResult.kind === 'insert' &&
      currentResult.didInsert &&
      insertedId &&
      boundedIndex >= currentResult.insertStepIndex
    ) {
      setGoalNodeIds([insertedId])
    } else if (
      currentResult.kind === 'insert' &&
      !currentResult.didInsert &&
      currentResult.existingNodeId &&
      boundedIndex >= currentResult.rejectStepIndex
    ) {
      setGoalNodeIds([currentResult.existingNodeId])
    } else if (
      currentResult.kind === 'delete' &&
      step.nodeId &&
      (step.matched || step.copied || step.removed)
    ) {
      setGoalNodeIds([step.nodeId])
    } else {
      setGoalNodeIds([])
    }

    setStatusText(`Line ${step.codeLine + 1} · step ${step.order}/${currentResult.steps.length}`)
  }

  const playback = useStepPlayback({
    stepCount: execResult?.steps.length ?? 0,
    minDelay: PLAYBACK_MIN_DELAY_MS,
    maxDelay: PLAYBACK_MAX_DELAY_MS,
    defaultDelay: BINARY_TREE_PLAYBACK_DEFAULT_DELAY_MS,
    resetSignal: playbackSession,
    onStepIndexChange: (index) => {
      const currentResult = execResultRef.current
      if (!currentResult) return
      applyStepIndex(currentResult, index)
    },
    onComplete: () => {
      const currentResult = execResultRef.current
      if (currentResult) finalizeRunRef.current(currentResult)
    },
  })

  useEffect(() => {
    isPlaybackCompleteRef.current = playback.isPlaybackComplete
  }, [playback.isPlaybackComplete])

  useEffect(() => {
    finalizeRunRef.current = (finishedResult: BinaryTreeBstExecResult) => {
      playback.stopPlayback()
      setCurrentNodeId(null)

      const lastLine = finishedResult.steps.at(-1)?.codeLine
      if (lastLine !== undefined) setCodeHighlighted(new Set([lastLine]))

      if (finishedResult.kind === 'validate') {
        if (finishedResult.isValid) {
          // Valid tree — clear canvas highlights so nothing stays tinted at the end.
          setVisitedNodeIds([])
          setViolationNodeIds([])
        } else if (finishedResult.violationNodeId) {
          setViolationNodeIds([finishedResult.violationNodeId])
        }
        setGoalNodeIds([])
        setStatusText(buildValidateBstCompletionStatus(finishedResult))
        return
      }

      if (finishedResult.kind === 'search') {
        setGoalNodeIds(
          finishedResult.found && finishedResult.foundNodeId
            ? [finishedResult.foundNodeId]
            : [],
        )
        setViolationNodeIds([])
        setStatusText(buildSearchBstCompletionStatus(finishedResult))
        return
      }

      if (finishedResult.kind === 'delete') {
        onSyncDeleteTreeRef.current?.(finishedResult.finalTree)
        setVisitedNodeIds([])
        setGoalNodeIds([])
        setViolationNodeIds([])
        setStatusText(buildDeleteBstCompletionStatus(finishedResult))
        return
      }

      // Insert: keep the walk path; blue goal on the new node, or on the existing duplicate.
      if (finishedResult.didInsert) {
        const insertedId = insertedNodeIdRef.current
        setGoalNodeIds(insertedId ? [insertedId] : [])
      } else {
        setGoalNodeIds(
          finishedResult.existingNodeId ? [finishedResult.existingNodeId] : [],
        )
      }
      setViolationNodeIds([])
      setStatusText(buildInsertBstCompletionStatus(finishedResult, insertedLabelRef.current))
    }
  }, [playback])

  useEffect(() => {
    stopPlaybackRef.current = () => playback.stopPlayback()
  }, [playback])

  const resetVisualization = useCallback(
    (idleAlgorithm?: BinaryTreeBstAlgorithm) => {
      // Ignore non-string args (defensive if this is ever wired directly to onClick).
      const algo =
        typeof idleAlgorithm === 'string' && idleAlgorithm in ALGO_LABEL
          ? idleAlgorithm
          : algorithm

      stopPlaybackRef.current()
      // Finish an in-progress mutation on Stop: delete always commits to its final tree; an
      // insert that already created its leaf (past CREATE_NODE) commits too if the walk finished
      // unwinding, but gets undone if it didn't — otherwise the new node would silently survive
      // with the hook no longer tracking it as removable.
      const active = execResultRef.current
      if (active?.kind === 'delete') {
        onSyncDeleteTreeRef.current?.(active.finalTree)
      } else if (active?.kind === 'insert' && !isPlaybackCompleteRef.current) {
        undoInsertIfNeeded()
      }
      setVisitedNodeIds([])
      setCurrentNodeId(null)
      setViolationNodeIds([])
      setGoalNodeIds([])
      setCodeHighlighted(new Set())
      setExecResult(null)
      setPlaybackSession((session) => session + 1)
      setStatusText(IDLE_STATUS[algo])
      setIsRunning(false)
      insertedNodeIdRef.current = null
      insertedLabelRef.current = null
      setInsertedLabel(null)
    },
    [algorithm],
  )

  const setAlgorithm = (nextAlgorithm: BinaryTreeBstAlgorithm) => {
    if (nextAlgorithm === algorithm) return
    setAlgorithmState(nextAlgorithm)
    resetVisualization(nextAlgorithm)
  }

  const handleTargetValueInputChange = (value: string) => {
    setTargetValueInput(sanitizeNumericInput(value))
  }

  const beginRun = (result: BinaryTreeBstExecResult, readyMessage: string) => {
    setExecResult(result)
    setPlaybackSession((session) => session + 1)
    setIsRunning(true)
    setCurrentNodeId(tree.rootId)
    setCodeHighlighted(result.kind === 'insert' ? insertBstHighlightLines(0) : new Set([0]))
    setStatusText(readyMessage)
  }

  const runAlgorithm = () => {
    if (playback.isPlaying) return
    if (!IMPLEMENTED.has(algorithm)) {
      setStatusText(`${ALGO_LABEL[algorithm]} is coming soon.`)
      return
    }

    stopPlaybackRef.current()
    // Same undo-vs-commit guard as resetVisualization, in case this is ever reached with a prior
    // insert still mid-walk (the Run/Stop toggle currently prevents it, but keep this safe).
    const active = execResultRef.current
    if (active?.kind === 'insert' && !isPlaybackCompleteRef.current) {
      undoInsertIfNeeded()
    } else {
      insertedNodeIdRef.current = null
      insertedLabelRef.current = null
      setInsertedLabel(null)
    }
    setVisitedNodeIds([])
    setCurrentNodeId(null)
    setViolationNodeIds([])
    setGoalNodeIds([])
    setCodeHighlighted(new Set())

    if (algorithm === 'validate') {
      if (!canRunValidateBst(tree)) {
        setStatusText('Warning: fill every node with a number before running Validate BST.')
        return
      }
      beginRun(runValidateBstExec(tree), 'Validate BST ready. Press Play or step through line by line.')
      return
    }

    if (algorithm === 'search') {
      if (!canRunValidateBst(tree)) {
        setStatusText('Warning: fill every node with a number before running Search.')
        return
      }
      const target = parseNumberInput(targetValueInput)
      if (target === null) {
        setStatusText('Warning: enter a target value before running Search.')
        return
      }
      beginRun(runSearchBstExec(tree, target), 'Search ready. Press Play or step through line by line.')
      return
    }

    if (algorithm === 'insert') {
      if (!canRunInsertBst(tree)) {
        setStatusText('Warning: fill every node with a number before running Insert.')
        return
      }
      const value = parseNumberInput(targetValueInput)
      if (value === null) {
        setStatusText('Warning: enter a value before running Insert.')
        return
      }
      beginRun(runInsertBstExec(tree, value), 'Insert ready. Press Play or step through line by line.')
      return
    }

    if (algorithm === 'delete') {
      if (!canRunDeleteBst(tree)) {
        setStatusText('Warning: fill every node with a number before running Delete.')
        return
      }
      const key = parseNumberInput(targetValueInput)
      if (key === null) {
        setStatusText('Warning: enter a key before running Delete.')
        return
      }
      beginRun(runDeleteBstExec(tree, key), 'Delete ready. Press Play or step through line by line.')
    }
  }

  const stepForward = () => {
    if (!execResult) return
    playback.stepForward()
  }

  const stepBackward = () => {
    if (!execResult) return
    playback.stepBackward()
    setIsRunning(true)
  }

  const play = () => {
    if (!execResult) return
    const replayFromEnd = playback.isPlaybackComplete
    if (replayFromEnd && execResult.kind === 'insert' && execResult.didInsert) {
      // Replay needs a clean tree so CREATE_NODE can add the leaf again.
      undoInsertIfNeeded()
    }
    if (replayFromEnd && execResult.kind === 'delete') {
      onSyncDeleteTreeRef.current?.(execResult.baseTree)
    }
    playback.togglePlay()
    if (replayFromEnd) {
      setViolationNodeIds([])
      setGoalNodeIds([])
      setIsRunning(true)
    }
  }

  const pause = () => {
    playback.stopPlayback()
  }

  const onPlaybackSpeedChange = (value: number) => {
    playback.setPlaybackSpeed(value)
  }

  const nodes = Object.values(tree.nodesById)
  const algorithmReady = IMPLEMENTED.has(algorithm)
  const parsedTarget = parseNumberInput(targetValueInput)
  const treeReadyForValidate = canRunValidateBst(tree)
  const treeReadyForInsert = canRunInsertBst(tree)
  const treeReadyForDelete = canRunDeleteBst(tree)

  const canRunAlgorithm =
    algorithm === 'validate'
      ? algorithmReady && treeReadyForValidate
      : algorithm === 'search'
        ? algorithmReady && treeReadyForValidate && parsedTarget !== null
        : algorithm === 'insert'
          ? algorithmReady && treeReadyForInsert && parsedTarget !== null
          : algorithm === 'delete'
            ? algorithmReady && treeReadyForDelete && parsedTarget !== null
            : false

  let sidebarStatusText = statusText
  if (!algorithmReady) {
    sidebarStatusText = `${ALGO_LABEL[algorithm]} is coming soon.`
  } else if (!canRunAlgorithm) {
    if (algorithm !== 'insert' && algorithm !== 'delete' && nodes.length === 0) {
      sidebarStatusText = `Warning: add at least one node before running ${ALGO_LABEL[algorithm]}.`
    } else if (algorithm === 'insert' && !treeReadyForInsert) {
      sidebarStatusText = 'Warning: fill every node with a number before running Insert.'
    } else if (algorithm === 'delete' && !treeReadyForDelete) {
      sidebarStatusText = 'Warning: fill every node with a number before running Delete.'
    } else if (algorithm !== 'insert' && !treeReadyForValidate) {
      sidebarStatusText =
        `Warning: fill every node with a number before running ${ALGO_LABEL[algorithm]}.`
    } else if (parsedTarget === null) {
      sidebarStatusText =
        algorithm === 'insert'
          ? 'Warning: enter a value before running Insert.'
          : algorithm === 'delete'
            ? 'Warning: enter a key before running Delete.'
            : 'Warning: enter a target value before running Search.'
    }
  }

  const bstVarsRows: string[][] | null = useMemo(() => {
    if (!isRunning || !execResult) return null

    if (execResult.kind === 'search') {
      if (playback.stepIndex < 0) {
        return buildValueVarsRows(rootLabelTagged, 'target', execResult.target)
      }
      const si = Math.min(playback.stepIndex, execResult.steps.length - 1)
      const step = execResult.steps[si]
      const isDone = playback.isPlaybackComplete
      const nodeLabel = isDone && !execResult.found ? '—' : (step.nodeLabel ?? '—')
      return buildValueVarsRows(
        nodeLabel,
        'target',
        isDone && !execResult.found ? null : execResult.target,
      )
    }

    if (execResult.kind === 'insert') {
      if (playback.stepIndex < 0) {
        return buildInsertVarsRows(
          tree.rootId ? rootLabelTagged : '—',
          execResult.value,
          Number.NEGATIVE_INFINITY,
          Number.POSITIVE_INFINITY,
        )
      }
      const si = Math.min(playback.stepIndex, execResult.steps.length - 1)
      const step = execResult.steps[si]
      const onCreate = execResult.didInsert && si >= execResult.insertStepIndex
      const nodeLabel = onCreate ? (insertedLabel ?? 'new') : (step.nodeLabel ?? '—')
      return buildInsertVarsRows(
        nodeLabel,
        execResult.value,
        step.minBound ?? null,
        step.maxBound ?? null,
      )
    }

    if (execResult.kind === 'delete') {
      if (playback.stepIndex < 0) {
        return buildDeleteVarsRows(
          tree.rootId ? rootLabelTagged : '—',
          execResult.key,
          null,
        )
      }
      const si = Math.min(playback.stepIndex, execResult.steps.length - 1)
      const step = execResult.steps[si]
      const isDone = playback.isPlaybackComplete
      return buildDeleteVarsRows(
        isDone ? '—' : (step.nodeLabel ?? '—'),
        isDone ? null : (step.target ?? execResult.key),
        isDone ? null : (step.succLabel ?? null),
      )
    }

    if (playback.stepIndex < 0) {
      return buildValidateVarsRows(rootLabelTagged, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, {
        leftOk: '—',
        rightOk: '—',
      })
    }

    const si = Math.min(playback.stepIndex, execResult.steps.length - 1)
    const step = execResult.steps[si]
    const isDone = playback.isPlaybackComplete
    const nodeLabel = isDone ? '—' : (step.nodeLabel ?? '—')
    return buildValidateVarsRows(
      nodeLabel,
      isDone ? null : (step.minBound ?? null),
      isDone ? null : (step.maxBound ?? null),
      {
        leftOk: isDone ? '—' : (step.leftOk ?? '—'),
        rightOk: isDone ? '—' : (step.rightOk ?? '—'),
      },
    )
  }, [
    execResult,
    insertedLabel,
    isRunning,
    playback.isPlaybackComplete,
    playback.stepIndex,
    rootLabelTagged,
    tree.rootId,
  ])

  // Hide the green start ring after a valid Validate finishes, or after Search/Insert/Delete finishes.
  const showStartHighlight =
    isRunning &&
    !(
      playback.isPlaybackComplete &&
      (execResult?.kind !== 'validate' || execResult.isValid === true)
    )

  return {
    algorithm,
    setAlgorithm,

    targetValueInput,
    handleTargetValueInputChange,

    visitedNodeIds,
    currentNodeId,
    startNodeId: showStartHighlight ? tree.rootId : null,
    violationNodeIds,
    goalNodeIds,

    isRunning,

    isPlaying: playback.isPlaying,
    playbackSpeed: playback.playbackSpeed,
    canStepBackward: execResult !== null && playback.canStepBackward,
    canStepForward: execResult !== null && playback.canStepForward,
    canTogglePlay: execResult !== null && playback.canTogglePlay,
    isPlaybackComplete: execResult !== null && playback.isPlaybackComplete,

    bstCodeHighlighted: isRunning ? codeHighlighted : new Set(),
    bstVarsRows,

    resetVisualization,
    runAlgorithm,
    stepForward,
    stepBackward,
    play,
    pause,
    onPlaybackSpeedChange,
    sidebarStatusText,
    canRunAlgorithm,
  }
}
