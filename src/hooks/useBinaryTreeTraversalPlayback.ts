import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { BinaryTree, GoalType } from '../types'

import {
  buildBinaryTreeTraversalCompletionStatus,
  binaryTreeExecToBfsResult,
  prepareBinaryTreeTraversalRunInputs,
  runBinaryTreeInorderExec,
  runBinaryTreeLevelOrderExec,
  runBinaryTreePostorderExec,
  runBinaryTreePreorderExec,
} from '../algorithms/binaryTreeTraversal'
import type { BinaryTreeExecResult, BinaryTreeTraversalAlgorithm } from '../algorithms/binaryTreeTraversal'

import { PLAYBACK_MIN_DELAY_MS, PLAYBACK_MAX_DELAY_MS } from '../utils/constants'

import { parseNumberInput, sanitizeNumericInput } from '../utils/format'

import { useStepPlayback } from './useStepPlayback'

const ALGO_LABEL: Record<BinaryTreeTraversalAlgorithm, string> = {
  preorder: 'Preorder',
  inorder: 'Inorder',
  postorder: 'Postorder',
  'level-order': 'Level-order',
}

const EXEC_BY_ALGORITHM: Record<BinaryTreeTraversalAlgorithm, typeof runBinaryTreePreorderExec> = {
  preorder: runBinaryTreePreorderExec,
  inorder: runBinaryTreeInorderExec,
  postorder: runBinaryTreePostorderExec,
  'level-order': runBinaryTreeLevelOrderExec,
}

type UseBinaryTreeTraversalPlaybackParams = {
  tree: BinaryTree
}

export type BinaryTreeTraversalHandle = {
  algorithm: BinaryTreeTraversalAlgorithm
  setAlgorithm: (algorithm: BinaryTreeTraversalAlgorithm) => void
  goalType: GoalType
  setGoalType: (type: GoalType) => void
  goalNodeLabel: string
  goalValueInput: string
  handleGoalNodeLabelChange: (value: string) => void
  handleGoalValueInputChange: (value: string) => void

  visitedNodeIds: string[]
  currentNodeId: string | null
  startNodeId: string | null
  goalNodeIds: string[]

  isRunning: boolean

  isPlaying: boolean
  playbackSpeed: number
  canStepBackward: boolean
  canStepForward: boolean
  canTogglePlay: boolean
  isPlaybackComplete: boolean

  traversalCodeHighlighted: Set<number>
  traversalVarsRows: string[][] | null

  resetVisualization: () => void
  runTraversal: () => void
  stepForward: () => void
  stepBackward: () => void
  play: () => void
  pause: () => void
  onPlaybackSpeedChange: (value: number) => void
  sidebarStatusText: string
  canRunTraversal: boolean
}

// Binary-tree counterpart to useTraversalPlayback (one algorithm session; no cross-algo canvas clearing).
export function useBinaryTreeTraversalPlayback({ tree }: UseBinaryTreeTraversalPlaybackParams): BinaryTreeTraversalHandle {
  const [algorithm, setAlgorithmState] = useState<BinaryTreeTraversalAlgorithm>('preorder')
  const [goalType, setGoalTypeState] = useState<GoalType>('target-node')
  const [goalNodeLabel, setGoalNodeLabel] = useState('')
  const [goalValueInput, setGoalValueInput] = useState('')

  const [visitedNodeIds, setVisitedNodeIds] = useState<string[]>([])
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
  const [goalNodeIds, setGoalNodeIds] = useState<string[]>([])
  const [codeHighlighted, setCodeHighlighted] = useState<Set<number>>(new Set())
  const [statusText, setStatusText] = useState('Pick a goal, then run the selected traversal.')
  const [isRunning, setIsRunning] = useState(false)
  const [execResult, setExecResult] = useState<BinaryTreeExecResult | null>(null)

  const execResultRef = useRef<BinaryTreeExecResult | null>(null)
  const initialGoalNodeIdsRef = useRef<string[]>([])
  const finalizeRunRef = useRef<(r: BinaryTreeExecResult) => void>(() => {})
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
      runningBest: number | null | undefined,
      extras?: {
        leftResult?: string
        rightResult?: string
        queueLabels?: string[]
      },
    ): string[][] => {
      const queueRow =
        extras?.queueLabels !== undefined
          ? [[`queue = [${extras.queueLabels.join(', ')}]`]]
          : []

      if (goalType === 'max-value') {
        return [[`node = ${nodeLabel}`, `max = ${runningBest ?? '—'}`], ...queueRow]
      }
      if (goalType === 'min-value') {
        return [[`node = ${nodeLabel}`, `min = ${runningBest ?? '—'}`], ...queueRow]
      }

      const goalCell =
        goalType === 'target-node' ? `goal = "${goalNodeLabel}"` : `goal = ${goalValueInput}`
      const row1 = [`node = ${nodeLabel}`, goalCell]
      if (queueRow.length > 0) return [row1, ...queueRow]
      if (extras?.leftResult !== undefined && extras?.rightResult !== undefined) {
        return [row1, [`leftResult = ${extras.leftResult}`, `rightResult = ${extras.rightResult}`]]
      }
      return [row1]
    },
    [goalNodeLabel, goalType, goalValueInput],
  )

  const applyStepIndex = (currentResult: BinaryTreeExecResult, index: number) => {
    if (index < 0) {
      setCurrentNodeId(tree.rootId)
      setVisitedNodeIds([])
      setCodeHighlighted(new Set([0]))
      setGoalNodeIds(initialGoalNodeIdsRef.current)
      setStatusText(`${ALGO_LABEL[algorithm]} ready. Press Play or step through line by line.`)
      return
    }

    const boundedIndex = Math.min(index, currentResult.steps.length - 1)
    const step = currentResult.steps[boundedIndex]

    setCurrentNodeId(step.nodeId)
    setVisitedNodeIds(step.visitedNodeIds)
    setCodeHighlighted(new Set([step.codeLine]))

    if (step.matchedGoal && step.nodeId) {
      setGoalNodeIds([step.nodeId])
    } else {
      setGoalNodeIds(initialGoalNodeIdsRef.current)
    }

    setStatusText(`Line ${step.codeLine + 1} · step ${step.order}/${currentResult.steps.length}`)
  }

  const playback = useStepPlayback({
    stepCount: execResult?.steps.length ?? 0,
    minDelay: PLAYBACK_MIN_DELAY_MS,
    maxDelay: PLAYBACK_MAX_DELAY_MS,
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
    finalizeRunRef.current = (finishedResult: BinaryTreeExecResult) => {
      playback.stopPlayback()
      setCurrentNodeId(null)

      const lastLine = finishedResult.steps.at(-1)?.codeLine
      if (lastLine !== undefined) setCodeHighlighted(new Set([lastLine]))

      const bfsShape = binaryTreeExecToBfsResult(finishedResult)

      if (!finishedResult.foundNodeLabel && (finishedResult.goalType === 'target-node' || finishedResult.goalType === 'target-value')) {
        setStatusText('Done. Goal not found in the tree.')
        return
      }

      if (finishedResult.foundNodeIds.length > 0) setGoalNodeIds(finishedResult.foundNodeIds)
      setStatusText(buildBinaryTreeTraversalCompletionStatus(bfsShape))
    }
  }, [tree, playback])

  useEffect(() => {
    stopPlaybackRef.current = () => playback.stopPlayback()
  }, [playback])

  const resetVisualization = useCallback(
    (idleAlgorithm: BinaryTreeTraversalAlgorithm = algorithm) => {
      stopPlaybackRef.current()
      setVisitedNodeIds([])
      setCurrentNodeId(null)
      setGoalNodeIds([])
      setCodeHighlighted(new Set())
      setExecResult(null)
      setPlaybackSession((session) => session + 1)
      setStatusText(`Pick a goal, then run ${ALGO_LABEL[idleAlgorithm]}.`)
      setIsRunning(false)
    },
    [algorithm],
  )

  const setAlgorithm = (nextAlgorithm: BinaryTreeTraversalAlgorithm) => {
    if (nextAlgorithm === algorithm) return
    setAlgorithmState(nextAlgorithm)
    resetVisualization(nextAlgorithm)
  }

  const setGoalType = (type: GoalType) => {
    resetVisualization()
    setGoalTypeState(type)
    setGoalNodeLabel('')
    setGoalValueInput('')
  }

  const handleGoalNodeLabelChange = (value: string) => {
    resetVisualization()
    setGoalNodeLabel(value.toUpperCase())
  }

  const handleGoalValueInputChange = (value: string) => {
    resetVisualization()
    setGoalValueInput(sanitizeNumericInput(value))
  }

  const runTraversal = () => {
    if (playback.isPlaying) return

    stopPlaybackRef.current()
    setVisitedNodeIds([])
    setCurrentNodeId(null)
    setGoalNodeIds([])
    setCodeHighlighted(new Set())

    const preparation = prepareBinaryTreeTraversalRunInputs({
      tree,
      goalType,
      goalNodeLabel,
      goalValueInput,
      algoLabel: ALGO_LABEL[algorithm],
    })

    if (!preparation.ok) {
      setStatusText(preparation.error)
      return
    }

    initialGoalNodeIdsRef.current = preparation.initialGoalNodeIds
    setGoalNodeIds(preparation.initialGoalNodeIds)

    const traversalExec = EXEC_BY_ALGORITHM[algorithm](tree, preparation.goal)

    if (traversalExec.steps.length === 0) {
      setStatusText(`${ALGO_LABEL[algorithm]} could not start with the current tree and inputs.`)
      return
    }

    setExecResult(traversalExec)
    setPlaybackSession((session) => session + 1)
    setIsRunning(true)
    setCurrentNodeId(tree.rootId)
    setCodeHighlighted(new Set([0]))
    setStatusText(`${ALGO_LABEL[algorithm]} ready. Press Play or step through line by line.`)
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
      setGoalNodeIds(initialGoalNodeIdsRef.current)
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
  const hasEmptyNodes = nodes.some((node) => node.value === 'empty')

  const canRunTraversal =
    nodes.length > 0 &&
    (goalType === 'target-node' || !hasEmptyNodes) &&
    (goalType !== 'target-node' || goalNodeLabel.trim() !== '') &&
    (goalType !== 'target-value' || parseNumberInput(goalValueInput) !== null)

  const goalNodeMissing = goalType === 'target-node' && goalNodeLabel.trim() === ''
  const goalValueMissing = goalType === 'target-value' && parseNumberInput(goalValueInput) === null

  let sidebarStatusText = statusText
  if (goalNodeMissing) {
    sidebarStatusText = 'Warning: Goal node is a required field.'
  } else if (goalValueMissing) {
    sidebarStatusText = 'Warning: Goal value is a required field.'
  } else if (hasEmptyNodes && goalType !== 'target-node') {
    sidebarStatusText = `Warning: fill or nullify all empty nodes before running ${ALGO_LABEL[algorithm]}.`
  }

  const traversalVarsRows: string[][] | null = useMemo(() => {
    if (!isRunning || !execResult) return null

    if (playback.stepIndex < 0) {
      if (algorithm === 'level-order') {
        return buildVarsRows(
          rootLabelTagged,
          goalType === 'max-value' || goalType === 'min-value' ? null : undefined,
          { queueLabels: [] },
        )
      }
      const extras =
        algorithm !== 'level-order' &&
        (goalType === 'target-node' || goalType === 'target-value')
          ? { leftResult: '—', rightResult: '—' }
          : undefined
      return buildVarsRows(
        rootLabelTagged,
        goalType === 'max-value' || goalType === 'min-value' ? null : undefined,
        extras,
      )
    }

    const si = Math.min(playback.stepIndex, execResult.steps.length - 1)
    const step = execResult.steps[si]
    const isDone = playback.isPlaybackComplete
    const nodeLabel = isDone && !step.matchedGoal ? '—' : (step.nodeLabel ?? '—')
    const bestVal =
      goalType === 'max-value' || goalType === 'min-value'
        ? (isDone ? execResult.foundValue : (step.runningBest ?? null))
        : undefined
    const extras =
      step.queueLabels !== undefined
        ? { queueLabels: isDone ? [] : step.queueLabels }
        : step.leftResult !== undefined && step.rightResult !== undefined
          ? { leftResult: step.leftResult, rightResult: step.rightResult }
          : undefined
    return buildVarsRows(nodeLabel, bestVal, extras)
  }, [
    algorithm,
    buildVarsRows,
    execResult,
    goalType,
    isRunning,
    playback.isPlaybackComplete,
    playback.stepIndex,
    rootLabelTagged,
  ])

  return {
    algorithm,
    setAlgorithm,
    goalType,
    setGoalType,
    goalNodeLabel,
    goalValueInput,
    handleGoalNodeLabelChange,
    handleGoalValueInputChange,

    visitedNodeIds,
    currentNodeId,
    startNodeId: isRunning ? tree.rootId : null,
    goalNodeIds,

    isRunning,

    isPlaying: playback.isPlaying,
    playbackSpeed: playback.playbackSpeed,
    canStepBackward: execResult !== null && playback.canStepBackward,
    canStepForward: execResult !== null && playback.canStepForward,
    canTogglePlay: execResult !== null && playback.canTogglePlay,
    isPlaybackComplete: execResult !== null && playback.isPlaybackComplete,

    traversalCodeHighlighted: isRunning ? codeHighlighted : new Set(),
    traversalVarsRows,

    resetVisualization,
    runTraversal,
    stepForward,
    stepBackward,
    play,
    pause,
    onPlaybackSpeedChange,
    sidebarStatusText,
    canRunTraversal,
  }
}
