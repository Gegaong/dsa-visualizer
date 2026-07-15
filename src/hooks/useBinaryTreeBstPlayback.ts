import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { BinaryTree } from '../types'

import {
  buildValidateBstCompletionStatus,
  canRunValidateBst,
  formatBstBound,
  runValidateBstExec,
  type BinaryTreeBstAlgorithm,
  type BinaryTreeValidateBstResult,
} from '../algorithms/binaryTreeBst'

import {
  PLAYBACK_MIN_DELAY_MS,
  PLAYBACK_MAX_DELAY_MS,
  BINARY_TREE_PLAYBACK_DEFAULT_DELAY_MS,
} from '../utils/constants'

import { useStepPlayback } from './useStepPlayback'

const ALGO_LABEL: Record<BinaryTreeBstAlgorithm, string> = {
  validate: 'Validate BST',
  search: 'Search',
  insert: 'Insert',
  delete: 'Delete',
}

const IMPLEMENTED: ReadonlySet<BinaryTreeBstAlgorithm> = new Set(['validate'])

type UseBinaryTreeBstPlaybackParams = {
  tree: BinaryTree
}

export type BinaryTreeBstHandle = {
  algorithm: BinaryTreeBstAlgorithm
  setAlgorithm: (algorithm: BinaryTreeBstAlgorithm) => void

  visitedNodeIds: string[]
  currentNodeId: string | null
  startNodeId: string | null
  /** Node that broke the BST range check — rendered red on the canvas. */
  violationNodeIds: string[]

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

export function useBinaryTreeBstPlayback({ tree }: UseBinaryTreeBstPlaybackParams): BinaryTreeBstHandle {
  const [algorithm, setAlgorithmState] = useState<BinaryTreeBstAlgorithm>('validate')

  const [visitedNodeIds, setVisitedNodeIds] = useState<string[]>([])
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
  const [violationNodeIds, setViolationNodeIds] = useState<string[]>([])
  const [codeHighlighted, setCodeHighlighted] = useState<Set<number>>(new Set())
  const [statusText, setStatusText] = useState('Run Validate BST to check the search-tree property.')
  const [isRunning, setIsRunning] = useState(false)
  const [execResult, setExecResult] = useState<BinaryTreeValidateBstResult | null>(null)

  const execResultRef = useRef<BinaryTreeValidateBstResult | null>(null)
  const finalizeRunRef = useRef<(r: BinaryTreeValidateBstResult) => void>(() => {})
  const stopPlaybackRef = useRef(() => {})
  const [playbackSession, setPlaybackSession] = useState(0)

  useEffect(() => {
    execResultRef.current = execResult
  }, [execResult])

  const rootLabel = tree.rootId ? (tree.nodesById[tree.rootId]?.label ?? '—') : '—'
  const rootLabelTagged = rootLabel === '—' ? rootLabel : `${rootLabel}(root)`

  const buildVarsRows = useCallback(
    (
      nodeLabel: string,
      minBound: number | null,
      maxBound: number | null,
      extras?: { leftOk?: string; rightOk?: string },
    ): string[][] => {
      const boundsRow = [
        `node = ${nodeLabel}`,
        `min = ${minBound === null ? '—' : formatBstBound(minBound)}`,
        `max = ${maxBound === null ? '—' : formatBstBound(maxBound)}`,
      ]
      if (extras?.leftOk !== undefined && extras?.rightOk !== undefined) {
        return [boundsRow, [`leftOk = ${extras.leftOk}`, `rightOk = ${extras.rightOk}`]]
      }
      return [boundsRow]
    },
    [],
  )

  const applyStepIndex = (currentResult: BinaryTreeValidateBstResult, index: number) => {
    if (index < 0) {
      setCurrentNodeId(tree.rootId)
      setVisitedNodeIds([])
      setCodeHighlighted(new Set([0]))
      setViolationNodeIds([])
      setStatusText(`${ALGO_LABEL[algorithm]} ready. Press Play or step through line by line.`)
      return
    }

    const boundedIndex = Math.min(index, currentResult.steps.length - 1)
    const step = currentResult.steps[boundedIndex]

    setCurrentNodeId(step.nodeId)
    setVisitedNodeIds(step.visitedNodeIds)
    setCodeHighlighted(new Set([step.codeLine]))

    if (currentResult.violationNodeId) {
      const violationIndex = currentResult.steps.findIndex((s) => s.violated)
      if (violationIndex >= 0 && boundedIndex >= violationIndex) {
        setViolationNodeIds([currentResult.violationNodeId])
      } else {
        setViolationNodeIds([])
      }
    } else {
      setViolationNodeIds([])
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
    finalizeRunRef.current = (finishedResult: BinaryTreeValidateBstResult) => {
      playback.stopPlayback()
      setCurrentNodeId(null)

      const lastLine = finishedResult.steps.at(-1)?.codeLine
      if (lastLine !== undefined) setCodeHighlighted(new Set([lastLine]))

      if (finishedResult.isValid) {
        // Valid tree — clear canvas highlights so nothing stays tinted at the end.
        setVisitedNodeIds([])
        setViolationNodeIds([])
      } else if (finishedResult.violationNodeId) {
        setViolationNodeIds([finishedResult.violationNodeId])
      }
      setStatusText(buildValidateBstCompletionStatus(finishedResult))
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
      setCodeHighlighted(new Set())
      setExecResult(null)
      setPlaybackSession((session) => session + 1)
      if (IMPLEMENTED.has(algo)) {
        setStatusText(`Run ${ALGO_LABEL[algo]} to check the search-tree property.`)
      } else {
        setStatusText(`${ALGO_LABEL[algo]} is coming soon.`)
      }
      setIsRunning(false)
    },
    [algorithm],
  )

  const setAlgorithm = (nextAlgorithm: BinaryTreeBstAlgorithm) => {
    if (nextAlgorithm === algorithm) return
    setAlgorithmState(nextAlgorithm)
    resetVisualization(nextAlgorithm)
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
    setCodeHighlighted(new Set())

    if (!canRunValidateBst(tree)) {
      setStatusText('Warning: fill every node with a number before running Validate BST.')
      return
    }

    const validateExec = runValidateBstExec(tree)

    setExecResult(validateExec)
    setPlaybackSession((session) => session + 1)
    setIsRunning(true)
    setCurrentNodeId(tree.rootId)
    setCodeHighlighted(new Set([0]))
    setStatusText('Validate BST ready. Press Play or step through line by line.')
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
  const canRunAlgorithm = algorithmReady && canRunValidateBst(tree)

  let sidebarStatusText = statusText
  if (!algorithmReady) {
    sidebarStatusText = `${ALGO_LABEL[algorithm]} is coming soon.`
  } else if (!canRunAlgorithm) {
    sidebarStatusText =
      nodes.length === 0
        ? 'Warning: add at least one node before running Validate BST.'
        : 'Warning: fill every node with a number before running Validate BST.'
  }

  const bstVarsRows: string[][] | null = useMemo(() => {
    if (!isRunning || !execResult) return null

    if (playback.stepIndex < 0) {
      return buildVarsRows(rootLabelTagged, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, {
        leftOk: '—',
        rightOk: '—',
      })
    }

    const si = Math.min(playback.stepIndex, execResult.steps.length - 1)
    const step = execResult.steps[si]
    const isDone = playback.isPlaybackComplete
    const nodeLabel = isDone ? '—' : (step.nodeLabel ?? '—')
    return buildVarsRows(
      nodeLabel,
      isDone ? null : step.minBound,
      isDone ? null : step.maxBound,
      {
        leftOk: isDone ? '—' : (step.leftOk ?? '—'),
        rightOk: isDone ? '—' : (step.rightOk ?? '—'),
      },
    )
  }, [
    buildVarsRows,
    execResult,
    isRunning,
    playback.isPlaybackComplete,
    playback.stepIndex,
    rootLabelTagged,
  ])

  // Hide the green start ring after a valid run finishes (canvas should be fully clear).
  const showStartHighlight =
    isRunning && !(playback.isPlaybackComplete && execResult?.isValid === true)

  return {
    algorithm,
    setAlgorithm,

    visitedNodeIds,
    currentNodeId,
    startNodeId: showStartHighlight ? tree.rootId : null,
    violationNodeIds,

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
