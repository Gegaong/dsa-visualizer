import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { BinaryTree } from '../types'

import {
  buildSearchBstCompletionStatus,
  buildValidateBstCompletionStatus,
  canRunValidateBst,
  formatBstBound,
  runSearchBstExec,
  runValidateBstExec,
  type BinaryTreeBstAlgorithm,
  type BinaryTreeBstExecResult,
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

const IMPLEMENTED: ReadonlySet<BinaryTreeBstAlgorithm> = new Set(['validate', 'search'])

const IDLE_STATUS: Record<BinaryTreeBstAlgorithm, string> = {
  validate: 'Run Validate BST to check the search-tree property.',
  search: 'Run Search to look up a target value in the BST.',
  insert: 'Insert is coming soon.',
  delete: 'Delete is coming soon.',
}

type UseBinaryTreeBstPlaybackParams = {
  tree: BinaryTree
}

export type BinaryTreeBstHandle = {
  algorithm: BinaryTreeBstAlgorithm
  setAlgorithm: (algorithm: BinaryTreeBstAlgorithm) => void

  targetValueInput: string
  handleTargetValueInputChange: (value: string) => void

  visitedNodeIds: string[]
  currentNodeId: string | null
  startNodeId: string | null
  /** Node that broke the BST range check — rendered red on the canvas. */
  violationNodeIds: string[]
  /** Matched search node — rendered as a blue goal on the canvas. */
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

function buildSearchVarsRows(nodeLabel: string, target: number | null): string[][] {
  return [[
    `node = ${nodeLabel}`,
    `target = ${target === null ? '—' : String(target)}`,
  ]]
}

export function useBinaryTreeBstPlayback({ tree }: UseBinaryTreeBstPlaybackParams): BinaryTreeBstHandle {
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

  const execResultRef = useRef<BinaryTreeBstExecResult | null>(null)
  const finalizeRunRef = useRef<(r: BinaryTreeBstExecResult) => void>(() => {})
  const stopPlaybackRef = useRef(() => {})
  const [playbackSession, setPlaybackSession] = useState(0)

  useEffect(() => {
    execResultRef.current = execResult
  }, [execResult])

  const rootLabel = tree.rootId ? (tree.nodesById[tree.rootId]?.label ?? '—') : '—'
  const rootLabelTagged = rootLabel === '—' ? rootLabel : `${rootLabel}(root)`

  const applyStepIndex = (currentResult: BinaryTreeBstExecResult, index: number) => {
    if (index < 0) {
      setCurrentNodeId(tree.rootId)
      setVisitedNodeIds([])
      setCodeHighlighted(new Set([0]))
      setViolationNodeIds([])
      setGoalNodeIds([])
      setStatusText(`${ALGO_LABEL[algorithm]} ready. Press Play or step through line by line.`)
      return
    }

    const boundedIndex = Math.min(index, currentResult.steps.length - 1)
    const step = currentResult.steps[boundedIndex]

    setCurrentNodeId(step.nodeId)
    setVisitedNodeIds(step.visitedNodeIds)
    setCodeHighlighted(new Set([step.codeLine]))

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

      // Keep the search path; blue goal stays on a found node.
      setGoalNodeIds(
        finishedResult.found && finishedResult.foundNodeId
          ? [finishedResult.foundNodeId]
          : [],
      )
      setViolationNodeIds([])
      setStatusText(buildSearchBstCompletionStatus(finishedResult))
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
      setVisitedNodeIds([])
      setCurrentNodeId(null)
      setViolationNodeIds([])
      setGoalNodeIds([])
      setCodeHighlighted(new Set())
      setExecResult(null)
      setPlaybackSession((session) => session + 1)
      setStatusText(IDLE_STATUS[algo])
      setIsRunning(false)
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
    setCodeHighlighted(new Set([0]))
    setStatusText(readyMessage)
  }

  const runAlgorithm = () => {
    if (playback.isPlaying) return
    if (!IMPLEMENTED.has(algorithm)) {
      setStatusText(`${ALGO_LABEL[algorithm]} is coming soon.`)
      return
    }

    stopPlaybackRef.current()
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
  const treeReady = canRunValidateBst(tree)
  const parsedTarget = parseNumberInput(targetValueInput)
  const canRunAlgorithm =
    algorithm === 'validate'
      ? algorithmReady && treeReady
      : algorithm === 'search'
        ? algorithmReady && treeReady && parsedTarget !== null
        : false

  let sidebarStatusText = statusText
  if (!algorithmReady) {
    sidebarStatusText = `${ALGO_LABEL[algorithm]} is coming soon.`
  } else if (!canRunAlgorithm) {
    if (nodes.length === 0) {
      sidebarStatusText = `Warning: add at least one node before running ${ALGO_LABEL[algorithm]}.`
    } else if (!treeReady) {
      sidebarStatusText =
        `Warning: fill every node with a number before running ${ALGO_LABEL[algorithm]}.`
    } else if (algorithm === 'search' && parsedTarget === null) {
      sidebarStatusText = 'Warning: enter a target value before running Search.'
    }
  }

  const bstVarsRows: string[][] | null = useMemo(() => {
    if (!isRunning || !execResult) return null

    if (execResult.kind === 'search') {
      if (playback.stepIndex < 0) {
        return buildSearchVarsRows(rootLabelTagged, execResult.target)
      }
      const si = Math.min(playback.stepIndex, execResult.steps.length - 1)
      const step = execResult.steps[si]
      const isDone = playback.isPlaybackComplete
      const nodeLabel = isDone && !execResult.found ? '—' : (step.nodeLabel ?? '—')
      return buildSearchVarsRows(nodeLabel, isDone && !execResult.found ? null : execResult.target)
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
  }, [execResult, isRunning, playback.isPlaybackComplete, playback.stepIndex, rootLabelTagged])

  // Hide the green start ring after a valid Validate finishes, or after any Search finishes.
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
