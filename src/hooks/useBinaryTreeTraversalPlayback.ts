import { useCallback, useEffect, useRef, useState } from 'react'

import type { BinaryTree, GoalType } from '../types'

import type { BfsResult } from '../algorithms/algorithmTypes'

import {
  buildBinaryTreeTraversalCompletionStatus,
  prepareBinaryTreeTraversalRunInputs,
  runBinaryTreePreorderSearch,
} from '../algorithms/binaryTreeTraversal'
import type { BinaryTreeTraversalAlgorithm } from '../algorithms/binaryTreeTraversal'

import { PLAYBACK_MIN_DELAY_MS, PLAYBACK_MAX_DELAY_MS } from '../utils/constants'

import { parseNumberInput, sanitizeNumericInput } from '../utils/format'

import { useStepPlayback } from './useStepPlayback'

const ALGO_LABEL: Record<BinaryTreeTraversalAlgorithm, string> = {
  preorder: 'Preorder',
  inorder: 'Inorder',
  postorder: 'Postorder',
  'level-order': 'Level-order',
}

// Only preorder has a real implementation so far — the other three stay selectable in the
// dropdown but Run reports them as not-yet-implemented instead of doing anything.
const IMPLEMENTED_ALGORITHMS = new Set<BinaryTreeTraversalAlgorithm>(['preorder'])

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
  result: BfsResult | null

  isPlaying: boolean
  playbackSpeed: number
  canStepBackward: boolean
  canStepForward: boolean
  canTogglePlay: boolean
  isPlaybackComplete: boolean

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

// Binary tree counterpart to useTraversalPlayback: a tree only ever runs one traversal at a
// time (no competing algorithms sharing the canvas), so this drops the goal-type/step logic in
// place but skips all of the "other algorithm is running" cross-session bookkeeping.
export function useBinaryTreeTraversalPlayback({ tree }: UseBinaryTreeTraversalPlaybackParams): BinaryTreeTraversalHandle {
  const [algorithm, setAlgorithmState] = useState<BinaryTreeTraversalAlgorithm>('preorder')
  const [goalType, setGoalTypeState] = useState<GoalType>('target-node')
  const [goalNodeLabel, setGoalNodeLabel] = useState('')
  const [goalValueInput, setGoalValueInput] = useState('')

  const [visitedNodeIds, setVisitedNodeIds] = useState<string[]>([])
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
  const [goalNodeIds, setGoalNodeIds] = useState<string[]>([])
  const [statusText, setStatusText] = useState('Pick a goal, then run the selected traversal.')
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<BfsResult | null>(null)

  const resultRef = useRef<BfsResult | null>(null)
  const initialGoalNodeIdsRef = useRef<string[]>([])
  const finalizeRunRef = useRef<(r: BfsResult) => void>(() => {})
  const stopPlaybackRef = useRef(() => {})
  const [playbackSession, setPlaybackSession] = useState(0)

  useEffect(() => {
    resultRef.current = result
  }, [result])

  const applyStepIndex = (currentResult: BfsResult, index: number) => {
    if (index < 0) {
      setCurrentNodeId(null)
      setVisitedNodeIds([])
      setStatusText(`${ALGO_LABEL[algorithm]} ready. Press Play or step through manually.`)
      return
    }

    const boundedIndex = Math.min(index, currentResult.steps.length - 1)
    const currentStep = currentResult.steps[boundedIndex]
    const visitedIds = currentResult.steps.slice(0, boundedIndex + 1).map((step) => step.nodeId)

    setCurrentNodeId(currentStep.nodeId)
    setVisitedNodeIds(visitedIds)
    setStatusText(`Visiting ${currentStep.nodeLabel} (step ${currentStep.order}/${currentResult.steps.length})`)
  }

  const playback = useStepPlayback({
    stepCount: result?.steps.length ?? 0,
    minDelay: PLAYBACK_MIN_DELAY_MS,
    maxDelay: PLAYBACK_MAX_DELAY_MS,
    resetSignal: playbackSession,
    onStepIndexChange: (index) => {
      const currentResult = resultRef.current
      if (!currentResult) return
      applyStepIndex(currentResult, index)
    },
    onComplete: () => {
      const currentResult = resultRef.current
      if (currentResult) finalizeRunRef.current(currentResult)
    },
  })

  useEffect(() => {
    finalizeRunRef.current = (finishedResult: BfsResult) => {
      playback.stopPlayback()
      setCurrentNodeId(null)

      if (!finishedResult.foundNodeLabel) {
        setStatusText('Done. Goal not found in the tree.')
        return
      }

      if (finishedResult.foundNodeIds.length > 0) setGoalNodeIds(finishedResult.foundNodeIds)
      setStatusText(buildBinaryTreeTraversalCompletionStatus(finishedResult, tree))
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
      setResult(null)
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

    if (!IMPLEMENTED_ALGORITHMS.has(algorithm)) {
      setStatusText(`${ALGO_LABEL[algorithm]} hasn't been implemented yet.`)
      return
    }

    stopPlaybackRef.current()
    setVisitedNodeIds([])
    setCurrentNodeId(null)
    setGoalNodeIds([])

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

    const traversalResult = runBinaryTreePreorderSearch(tree, preparation.goal)

    if (traversalResult.steps.length === 0) {
      setStatusText(`${ALGO_LABEL[algorithm]} could not start with the current tree and inputs.`)
      return
    }

    setResult(traversalResult)
    setPlaybackSession((session) => session + 1)
    setIsRunning(true)
    setStatusText(`${ALGO_LABEL[algorithm]} ready. Press Play or step through manually.`)
  }

  const stepForward = () => {
    if (!result) return
    playback.stepForward()
  }

  const stepBackward = () => {
    if (!result) return
    playback.stepBackward()
    setIsRunning(true)
    setGoalNodeIds(initialGoalNodeIdsRef.current)
  }

  const play = () => {
    if (!result) return
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
    IMPLEMENTED_ALGORITHMS.has(algorithm) &&
    nodes.length > 0 &&
    (goalType === 'target-node' || !hasEmptyNodes) &&
    (goalType !== 'target-node' || goalNodeLabel.trim() !== '') &&
    (goalType !== 'target-value' || parseNumberInput(goalValueInput) !== null)

  const goalNodeMissing = goalType === 'target-node' && goalNodeLabel.trim() === ''
  const goalValueMissing = goalType === 'target-value' && parseNumberInput(goalValueInput) === null

  let sidebarStatusText = statusText
  if (!IMPLEMENTED_ALGORITHMS.has(algorithm)) {
    sidebarStatusText = `${ALGO_LABEL[algorithm]} hasn't been implemented yet.`
  } else if (goalNodeMissing) {
    sidebarStatusText = 'Warning: Goal node is a required field.'
  } else if (goalValueMissing) {
    sidebarStatusText = 'Warning: Goal value is a required field.'
  } else if (hasEmptyNodes && goalType !== 'target-node') {
    sidebarStatusText = `Warning: fill or nullify all empty nodes before running ${ALGO_LABEL[algorithm]}.`
  }

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
    result,

    isPlaying: playback.isPlaying,
    playbackSpeed: playback.playbackSpeed,
    canStepBackward: result !== null && playback.canStepBackward,
    canStepForward: result !== null && playback.canStepForward,
    canTogglePlay: result !== null && playback.canTogglePlay,
    isPlaybackComplete: result !== null && playback.isPlaybackComplete,

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
