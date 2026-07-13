import type { BinaryTree, BinaryTreeNode, GoalType } from '../types'

import type { BfsGoal, BfsResult, BfsStep } from './algorithmTypes'

import { parseNumberInput } from '../utils/format'

export type BinaryTreeTraversalAlgorithm = 'preorder' | 'inorder' | 'postorder' | 'level-order'

// Line indices into BinaryTreeTraversalPage CODE_BY_ALGORITHM_AND_GOAL — keep in sync when editing
// pseudocode. Keys that are never pushed (e.g. level-order RETURN_EARLY) still document the panel line.
const PREORDER_TARGET_CODE_LINES = {
  ENTER: 0,
  NULL_CHECK: 1,
  RETURN_NULL: 2,
  MATCH_CHECK: 3,
  RETURN_MATCH: 4,
  RECURSE_LEFT: 5,
  CHECK_LEFT: 6,
  RETURN_LEFT: 7,
  RECURSE_RIGHT: 8,
  RETURN: 9,
} as const

const PREORDER_EXTREME_CODE_LINES = {
  WRAPPER_ENTER: 0,
  INIT_BEST: 1,
  INNER_FN: 2,
  NULL_CHECK: 3,
  RETURN_VOID: 4,
  COMPARE: 5,
  UPDATE_BEST: 6,
  RECURSE_LEFT: 7,
  RECURSE_RIGHT: 8,
  CALL: 9,
  RETURN: 10,
} as const

const INORDER_TARGET_CODE_LINES = {
  ENTER: 0,
  NULL_CHECK: 1,
  RETURN_NULL: 2,
  RECURSE_LEFT: 3,
  CHECK_LEFT: 4,
  RETURN_LEFT: 5,
  MATCH_CHECK: 6,
  RETURN_MATCH: 7,
  RECURSE_RIGHT: 8,
  RETURN: 9,
} as const

const INORDER_EXTREME_CODE_LINES = {
  WRAPPER_ENTER: 0,
  INIT_BEST: 1,
  INNER_FN: 2,
  NULL_CHECK: 3,
  RETURN_VOID: 4,
  RECURSE_LEFT: 5,
  COMPARE: 6,
  UPDATE_BEST: 7,
  RECURSE_RIGHT: 8,
  CALL: 9,
  RETURN: 10,
} as const

const POSTORDER_TARGET_CODE_LINES = {
  ENTER: 0,
  NULL_CHECK: 1,
  RETURN_NULL: 2,
  RECURSE_LEFT: 3,
  CHECK_LEFT: 4,
  RETURN_LEFT: 5,
  RECURSE_RIGHT: 6,
  CHECK_RIGHT: 7,
  RETURN_RIGHT: 8,
  MATCH_CHECK: 9,
  RETURN_MATCH: 10,
  RETURN: 11,
} as const

const POSTORDER_EXTREME_CODE_LINES = {
  WRAPPER_ENTER: 0,
  INIT_BEST: 1,
  INNER_FN: 2,
  NULL_CHECK: 3,
  RETURN_VOID: 4,
  RECURSE_LEFT: 5,
  RECURSE_RIGHT: 6,
  COMPARE: 7,
  UPDATE_BEST: 8,
  CALL: 9,
  RETURN: 10,
} as const

const LEVEL_ORDER_TARGET_CODE_LINES = {
  ENTER: 0,
  NULL_CHECK: 1,
  RETURN_NULL: 2,
  INIT_QUEUE: 3,
  WHILE: 4,
  DEQUEUE: 5,
  MATCH_CHECK: 6,
  RETURN_MATCH: 7,
  CHECK_LEFT: 8,
  ENQUEUE_LEFT: 9,
  CHECK_RIGHT: 10,
  ENQUEUE_RIGHT: 11,
  RETURN: 12,
} as const

const LEVEL_ORDER_EXTREME_CODE_LINES = {
  ENTER: 0,
  INIT_BEST: 1,
  NULL_CHECK: 2,
  RETURN_EARLY: 3,
  INIT_QUEUE: 4,
  WHILE: 5,
  DEQUEUE: 6,
  COMPARE: 7,
  UPDATE_BEST: 8,
  CHECK_LEFT: 9,
  ENQUEUE_LEFT: 10,
  CHECK_RIGHT: 11,
  ENQUEUE_RIGHT: 12,
  RETURN: 13,
} as const

export type BinaryTreeExecStep = {
  order: number
  codeLine: number
  nodeId: string | null
  nodeLabel: string | null
  parentNodeId: string | null
  visitedNodeIds: string[]
  runningBest?: number | null
  matchedGoal?: boolean
  leftResult?: string
  rightResult?: string
  // Level-order BFS queue labels (front → back).
  queueLabels?: string[]
}

export type BinaryTreeExecResult = {
  steps: BinaryTreeExecStep[]
  foundNodeId: string | null
  foundNodeLabel: string | null
  foundNodeIds: string[]
  foundValue: number | null
  goalType: GoalType
}

const emptyExecResult = (goalType: GoalType): BinaryTreeExecResult => ({
  steps: [],
  foundNodeId: null,
  foundNodeLabel: null,
  foundNodeIds: [],
  foundValue: null,
  goalType,
})

// True when the node matches a target-label or target-value goal (not max/min extremes).
const matchesGoal = (node: BinaryTreeNode, goal: BfsGoal): boolean => {
  if (goal.type === 'target-node') {
    return node.label.toUpperCase() === goal.targetNodeLabel.toUpperCase()
  }
  if (goal.type === 'target-value') {
    return typeof node.value === 'number' && node.value === goal.targetValue
  }
  return false
}

function dispatchBinaryTreeExec(
  tree: BinaryTree,
  goal: BfsGoal,
  runTarget: (tree: BinaryTree, goal: BfsGoal) => BinaryTreeExecResult,
  runExtreme: (tree: BinaryTree, goal: BfsGoal) => BinaryTreeExecResult,
): BinaryTreeExecResult {
  if (!tree.rootId || !tree.nodesById[tree.rootId]) return emptyExecResult(goal.type)

  if (goal.type === 'max-value' || goal.type === 'min-value') {
    const hasNumericValue = Object.values(tree.nodesById).some((node) => typeof node.value === 'number')
    if (!hasNumericValue) return emptyExecResult(goal.type)
    return runExtreme(tree, goal)
  }

  return runTarget(tree, goal)
}

// Line-by-line exec traces for sidebar highlighting + live vars.
export function runBinaryTreePreorderExec(tree: BinaryTree, goal: BfsGoal): BinaryTreeExecResult {
  return dispatchBinaryTreeExec(tree, goal, runPreorderTargetExec, runPreorderExtremeExec)
}

export function runBinaryTreeInorderExec(tree: BinaryTree, goal: BfsGoal): BinaryTreeExecResult {
  return dispatchBinaryTreeExec(tree, goal, runInorderTargetExec, runInorderExtremeExec)
}

export function runBinaryTreePostorderExec(tree: BinaryTree, goal: BfsGoal): BinaryTreeExecResult {
  return dispatchBinaryTreeExec(tree, goal, runPostorderTargetExec, runPostorderExtremeExec)
}

export function runBinaryTreeLevelOrderExec(tree: BinaryTree, goal: BfsGoal): BinaryTreeExecResult {
  return dispatchBinaryTreeExec(tree, goal, runLevelOrderTargetExec, runLevelOrderExtremeExec)
}

function formatSubtreeResult(node: BinaryTreeNode | null | undefined): string {
  if (node === undefined) return '—'
  if (node === null) return 'null'
  return node.label
}

function runPreorderTargetExec(tree: BinaryTree, goal: BfsGoal): BinaryTreeExecResult {
  const L = PREORDER_TARGET_CODE_LINES
  const steps: BinaryTreeExecStep[] = []
  const visitedOrder: string[] = []
  let stopped = false
  let foundNode: BinaryTreeNode | null = null

  const push = (
    codeLine: number,
    nodeId: string | null,
    parentNodeId: string | null,
    frame: { leftResult: BinaryTreeNode | null | undefined; rightResult: BinaryTreeNode | null | undefined },
    opts?: { markVisited?: boolean; matchedGoal?: boolean },
  ) => {
    if (opts?.markVisited && nodeId && !visitedOrder.includes(nodeId)) {
      visitedOrder.push(nodeId)
    }
    steps.push({
      order: steps.length + 1,
      codeLine,
      nodeId,
      nodeLabel: nodeId ? (tree.nodesById[nodeId]?.label ?? null) : null,
      parentNodeId,
      visitedNodeIds: [...visitedOrder],
      matchedGoal: opts?.matchedGoal,
      leftResult: formatSubtreeResult(frame.leftResult),
      rightResult: formatSubtreeResult(frame.rightResult),
    })
  }

  function preorder(nodeId: string | null, parentNodeId: string | null): BinaryTreeNode | null {
    if (stopped) return foundNode

    let leftResult: BinaryTreeNode | null | undefined = undefined
    let rightResult: BinaryTreeNode | null | undefined = undefined
    const frame = () => ({ leftResult, rightResult })

    push(L.ENTER, nodeId, parentNodeId, frame())
    push(L.NULL_CHECK, nodeId, parentNodeId, frame())

    if (!nodeId) {
      push(L.RETURN_NULL, null, parentNodeId, frame())
      return null
    }

    const node = tree.nodesById[nodeId]
    if (!node) {
      push(L.RETURN_NULL, null, parentNodeId, frame())
      return null
    }

    push(L.MATCH_CHECK, nodeId, parentNodeId, frame(), { markVisited: true })

    if (matchesGoal(node, goal)) {
      foundNode = node
      stopped = true
      push(L.RETURN_MATCH, nodeId, parentNodeId, frame(), { matchedGoal: true })
      return node
    }

    push(L.RECURSE_LEFT, nodeId, parentNodeId, frame())
    leftResult = preorder(node.leftId, nodeId)
    push(L.CHECK_LEFT, nodeId, parentNodeId, frame())
    if (leftResult) {
      push(L.RETURN_LEFT, nodeId, parentNodeId, frame())
      return leftResult
    }
    if (stopped) return foundNode

    push(L.RECURSE_RIGHT, nodeId, parentNodeId, frame())
    rightResult = preorder(node.rightId, nodeId)
    push(L.RETURN, nodeId, parentNodeId, frame())
    return rightResult
  }

  preorder(tree.rootId, null)

  const finalNode = foundNode
  return {
    steps,
    foundNodeId: finalNode?.id ?? null,
    foundNodeLabel: finalNode?.label ?? null,
    foundNodeIds: finalNode ? [finalNode.id] : [],
    foundValue: null,
    goalType: goal.type,
  }
}

function runPreorderExtremeExec(tree: BinaryTree, goal: BfsGoal): BinaryTreeExecResult {
  const L = PREORDER_EXTREME_CODE_LINES
  const steps: BinaryTreeExecStep[] = []
  const visitedOrder: string[] = []
  let extremeValue: number | null = null
  const rootId = tree.rootId!

  const push = (
    codeLine: number,
    nodeId: string | null,
    parentNodeId: string | null,
    runningBest?: number | null,
    opts?: { markVisited?: boolean },
  ) => {
    if (opts?.markVisited && nodeId && !visitedOrder.includes(nodeId)) {
      visitedOrder.push(nodeId)
    }
    steps.push({
      order: steps.length + 1,
      codeLine,
      nodeId,
      nodeLabel: nodeId ? (tree.nodesById[nodeId]?.label ?? null) : null,
      parentNodeId,
      visitedNodeIds: [...visitedOrder],
      runningBest: runningBest ?? extremeValue,
    })
  }

  push(L.WRAPPER_ENTER, rootId, null)
  push(L.INIT_BEST, rootId, null)
  push(L.INNER_FN, rootId, null)

  function innerPreorder(nodeId: string | null, parentNodeId: string | null): void {
    push(L.NULL_CHECK, nodeId, parentNodeId, extremeValue)

    if (!nodeId) {
      push(L.RETURN_VOID, null, parentNodeId, extremeValue)
      return
    }

    const node = tree.nodesById[nodeId]
    if (!node) {
      push(L.RETURN_VOID, null, parentNodeId, extremeValue)
      return
    }

    push(L.COMPARE, nodeId, parentNodeId, extremeValue)

    if (typeof node.value === 'number') {
      if (extremeValue === null) {
        extremeValue = node.value
        push(L.UPDATE_BEST, nodeId, parentNodeId, extremeValue)
      } else if (goal.type === 'max-value' && node.value > extremeValue) {
        extremeValue = node.value
        push(L.UPDATE_BEST, nodeId, parentNodeId, extremeValue)
      } else if (goal.type === 'min-value' && node.value < extremeValue) {
        extremeValue = node.value
        push(L.UPDATE_BEST, nodeId, parentNodeId, extremeValue)
      }
    }

    push(L.RECURSE_LEFT, nodeId, parentNodeId, extremeValue, { markVisited: true })
    innerPreorder(node.leftId, nodeId)
    push(L.RECURSE_RIGHT, nodeId, parentNodeId, extremeValue)
    innerPreorder(node.rightId, nodeId)
  }

  push(L.CALL, rootId, null, extremeValue)
  innerPreorder(rootId, null)
  push(L.RETURN, rootId, null, extremeValue)

  return {
    steps,
    foundNodeId: null,
    foundNodeLabel: null,
    foundNodeIds: [],
    foundValue: extremeValue,
    goalType: goal.type,
  }
}

function runInorderTargetExec(tree: BinaryTree, goal: BfsGoal): BinaryTreeExecResult {
  const L = INORDER_TARGET_CODE_LINES
  const steps: BinaryTreeExecStep[] = []
  const visitedOrder: string[] = []
  let stopped = false
  let foundNode: BinaryTreeNode | null = null

  const push = (
    codeLine: number,
    nodeId: string | null,
    parentNodeId: string | null,
    frame: { leftResult: BinaryTreeNode | null | undefined; rightResult: BinaryTreeNode | null | undefined },
    opts?: { markVisited?: boolean; matchedGoal?: boolean },
  ) => {
    if (opts?.markVisited && nodeId && !visitedOrder.includes(nodeId)) {
      visitedOrder.push(nodeId)
    }
    steps.push({
      order: steps.length + 1,
      codeLine,
      nodeId,
      nodeLabel: nodeId ? (tree.nodesById[nodeId]?.label ?? null) : null,
      parentNodeId,
      visitedNodeIds: [...visitedOrder],
      matchedGoal: opts?.matchedGoal,
      leftResult: formatSubtreeResult(frame.leftResult),
      rightResult: formatSubtreeResult(frame.rightResult),
    })
  }

  function inorder(nodeId: string | null, parentNodeId: string | null): BinaryTreeNode | null {
    if (stopped) return foundNode

    let leftResult: BinaryTreeNode | null | undefined = undefined
    let rightResult: BinaryTreeNode | null | undefined = undefined
    const frame = () => ({ leftResult, rightResult })

    push(L.ENTER, nodeId, parentNodeId, frame())
    push(L.NULL_CHECK, nodeId, parentNodeId, frame())

    if (!nodeId) {
      push(L.RETURN_NULL, null, parentNodeId, frame())
      return null
    }

    const node = tree.nodesById[nodeId]
    if (!node) {
      push(L.RETURN_NULL, null, parentNodeId, frame())
      return null
    }

    push(L.RECURSE_LEFT, nodeId, parentNodeId, frame())
    leftResult = inorder(node.leftId, nodeId)
    push(L.CHECK_LEFT, nodeId, parentNodeId, frame())
    if (leftResult) {
      push(L.RETURN_LEFT, nodeId, parentNodeId, frame())
      return leftResult
    }
    if (stopped) return foundNode

    push(L.MATCH_CHECK, nodeId, parentNodeId, frame(), { markVisited: true })

    if (matchesGoal(node, goal)) {
      foundNode = node
      stopped = true
      push(L.RETURN_MATCH, nodeId, parentNodeId, frame(), { matchedGoal: true })
      return node
    }

    push(L.RECURSE_RIGHT, nodeId, parentNodeId, frame())
    rightResult = inorder(node.rightId, nodeId)
    push(L.RETURN, nodeId, parentNodeId, frame())
    return rightResult
  }

  inorder(tree.rootId, null)

  const finalNode = foundNode
  return {
    steps,
    foundNodeId: finalNode?.id ?? null,
    foundNodeLabel: finalNode?.label ?? null,
    foundNodeIds: finalNode ? [finalNode.id] : [],
    foundValue: null,
    goalType: goal.type,
  }
}

function runInorderExtremeExec(tree: BinaryTree, goal: BfsGoal): BinaryTreeExecResult {
  const L = INORDER_EXTREME_CODE_LINES
  const steps: BinaryTreeExecStep[] = []
  const visitedOrder: string[] = []
  let extremeValue: number | null = null
  const rootId = tree.rootId!

  const push = (
    codeLine: number,
    nodeId: string | null,
    parentNodeId: string | null,
    runningBest?: number | null,
    opts?: { markVisited?: boolean },
  ) => {
    if (opts?.markVisited && nodeId && !visitedOrder.includes(nodeId)) {
      visitedOrder.push(nodeId)
    }
    steps.push({
      order: steps.length + 1,
      codeLine,
      nodeId,
      nodeLabel: nodeId ? (tree.nodesById[nodeId]?.label ?? null) : null,
      parentNodeId,
      visitedNodeIds: [...visitedOrder],
      runningBest: runningBest ?? extremeValue,
    })
  }

  push(L.WRAPPER_ENTER, rootId, null)
  push(L.INIT_BEST, rootId, null)
  push(L.INNER_FN, rootId, null)

  function innerInorder(nodeId: string | null, parentNodeId: string | null): void {
    push(L.NULL_CHECK, nodeId, parentNodeId, extremeValue)

    if (!nodeId) {
      push(L.RETURN_VOID, null, parentNodeId, extremeValue)
      return
    }

    const node = tree.nodesById[nodeId]
    if (!node) {
      push(L.RETURN_VOID, null, parentNodeId, extremeValue)
      return
    }

    push(L.RECURSE_LEFT, nodeId, parentNodeId, extremeValue)
    innerInorder(node.leftId, nodeId)

    push(L.COMPARE, nodeId, parentNodeId, extremeValue)
    if (typeof node.value === 'number') {
      if (extremeValue === null) {
        extremeValue = node.value
        push(L.UPDATE_BEST, nodeId, parentNodeId, extremeValue)
      } else if (goal.type === 'max-value' && node.value > extremeValue) {
        extremeValue = node.value
        push(L.UPDATE_BEST, nodeId, parentNodeId, extremeValue)
      } else if (goal.type === 'min-value' && node.value < extremeValue) {
        extremeValue = node.value
        push(L.UPDATE_BEST, nodeId, parentNodeId, extremeValue)
      }
    }

    push(L.RECURSE_RIGHT, nodeId, parentNodeId, extremeValue, { markVisited: true })
    innerInorder(node.rightId, nodeId)
  }

  push(L.CALL, rootId, null, extremeValue)
  innerInorder(rootId, null)
  push(L.RETURN, rootId, null, extremeValue)

  return {
    steps,
    foundNodeId: null,
    foundNodeLabel: null,
    foundNodeIds: [],
    foundValue: extremeValue,
    goalType: goal.type,
  }
}

function runPostorderTargetExec(tree: BinaryTree, goal: BfsGoal): BinaryTreeExecResult {
  const L = POSTORDER_TARGET_CODE_LINES
  const steps: BinaryTreeExecStep[] = []
  const visitedOrder: string[] = []
  let stopped = false
  let foundNode: BinaryTreeNode | null = null

  const push = (
    codeLine: number,
    nodeId: string | null,
    parentNodeId: string | null,
    frame: { leftResult: BinaryTreeNode | null | undefined; rightResult: BinaryTreeNode | null | undefined },
    opts?: { markVisited?: boolean; matchedGoal?: boolean },
  ) => {
    if (opts?.markVisited && nodeId && !visitedOrder.includes(nodeId)) {
      visitedOrder.push(nodeId)
    }
    steps.push({
      order: steps.length + 1,
      codeLine,
      nodeId,
      nodeLabel: nodeId ? (tree.nodesById[nodeId]?.label ?? null) : null,
      parentNodeId,
      visitedNodeIds: [...visitedOrder],
      matchedGoal: opts?.matchedGoal,
      leftResult: formatSubtreeResult(frame.leftResult),
      rightResult: formatSubtreeResult(frame.rightResult),
    })
  }

  function postorder(nodeId: string | null, parentNodeId: string | null): BinaryTreeNode | null {
    if (stopped) return foundNode

    let leftResult: BinaryTreeNode | null | undefined = undefined
    let rightResult: BinaryTreeNode | null | undefined = undefined
    const frame = () => ({ leftResult, rightResult })

    push(L.ENTER, nodeId, parentNodeId, frame())
    push(L.NULL_CHECK, nodeId, parentNodeId, frame())

    if (!nodeId) {
      push(L.RETURN_NULL, null, parentNodeId, frame())
      return null
    }

    const node = tree.nodesById[nodeId]
    if (!node) {
      push(L.RETURN_NULL, null, parentNodeId, frame())
      return null
    }

    push(L.RECURSE_LEFT, nodeId, parentNodeId, frame())
    leftResult = postorder(node.leftId, nodeId)
    push(L.CHECK_LEFT, nodeId, parentNodeId, frame())
    if (leftResult) {
      push(L.RETURN_LEFT, nodeId, parentNodeId, frame())
      return leftResult
    }
    if (stopped) return foundNode

    push(L.RECURSE_RIGHT, nodeId, parentNodeId, frame())
    rightResult = postorder(node.rightId, nodeId)
    push(L.CHECK_RIGHT, nodeId, parentNodeId, frame())
    if (rightResult) {
      push(L.RETURN_RIGHT, nodeId, parentNodeId, frame())
      return rightResult
    }
    if (stopped) return foundNode

    push(L.MATCH_CHECK, nodeId, parentNodeId, frame(), { markVisited: true })

    if (matchesGoal(node, goal)) {
      foundNode = node
      stopped = true
      push(L.RETURN_MATCH, nodeId, parentNodeId, frame(), { matchedGoal: true })
      return node
    }

    push(L.RETURN, nodeId, parentNodeId, frame())
    return null
  }

  postorder(tree.rootId, null)

  const finalNode = foundNode
  return {
    steps,
    foundNodeId: finalNode?.id ?? null,
    foundNodeLabel: finalNode?.label ?? null,
    foundNodeIds: finalNode ? [finalNode.id] : [],
    foundValue: null,
    goalType: goal.type,
  }
}

function runPostorderExtremeExec(tree: BinaryTree, goal: BfsGoal): BinaryTreeExecResult {
  const L = POSTORDER_EXTREME_CODE_LINES
  const steps: BinaryTreeExecStep[] = []
  const visitedOrder: string[] = []
  let extremeValue: number | null = null
  const rootId = tree.rootId!

  const push = (
    codeLine: number,
    nodeId: string | null,
    parentNodeId: string | null,
    runningBest?: number | null,
    opts?: { markVisited?: boolean },
  ) => {
    if (opts?.markVisited && nodeId && !visitedOrder.includes(nodeId)) {
      visitedOrder.push(nodeId)
    }
    steps.push({
      order: steps.length + 1,
      codeLine,
      nodeId,
      nodeLabel: nodeId ? (tree.nodesById[nodeId]?.label ?? null) : null,
      parentNodeId,
      visitedNodeIds: [...visitedOrder],
      runningBest: runningBest ?? extremeValue,
    })
  }

  push(L.WRAPPER_ENTER, rootId, null)
  push(L.INIT_BEST, rootId, null)
  push(L.INNER_FN, rootId, null)

  function innerPostorder(nodeId: string | null, parentNodeId: string | null): void {
    push(L.NULL_CHECK, nodeId, parentNodeId, extremeValue)

    if (!nodeId) {
      push(L.RETURN_VOID, null, parentNodeId, extremeValue)
      return
    }

    const node = tree.nodesById[nodeId]
    if (!node) {
      push(L.RETURN_VOID, null, parentNodeId, extremeValue)
      return
    }

    push(L.RECURSE_LEFT, nodeId, parentNodeId, extremeValue)
    innerPostorder(node.leftId, nodeId)
    push(L.RECURSE_RIGHT, nodeId, parentNodeId, extremeValue)
    innerPostorder(node.rightId, nodeId)

    let willUpdate = false
    if (typeof node.value === 'number') {
      if (extremeValue === null) willUpdate = true
      else if (goal.type === 'max-value' && node.value > extremeValue) willUpdate = true
      else if (goal.type === 'min-value' && node.value < extremeValue) willUpdate = true
    }

    if (willUpdate) {
      push(L.COMPARE, nodeId, parentNodeId, extremeValue)
      extremeValue = node.value as number
      push(L.UPDATE_BEST, nodeId, parentNodeId, extremeValue, { markVisited: true })
    } else {
      push(L.COMPARE, nodeId, parentNodeId, extremeValue, { markVisited: true })
    }
  }

  push(L.CALL, rootId, null, extremeValue)
  innerPostorder(rootId, null)
  push(L.RETURN, rootId, null, extremeValue)

  return {
    steps,
    foundNodeId: null,
    foundNodeLabel: null,
    foundNodeIds: [],
    foundValue: extremeValue,
    goalType: goal.type,
  }
}

type QueueEntry = { nodeId: string; parentNodeId: string | null }

function queueLabelsFrom(tree: BinaryTree, queue: QueueEntry[]): string[] {
  return queue.map((entry) => tree.nodesById[entry.nodeId]?.label ?? entry.nodeId)
}

function runLevelOrderTargetExec(tree: BinaryTree, goal: BfsGoal): BinaryTreeExecResult {
  const L = LEVEL_ORDER_TARGET_CODE_LINES
  const steps: BinaryTreeExecStep[] = []
  const visitedOrder: string[] = []
  const rootId = tree.rootId!

  const push = (
    codeLine: number,
    nodeId: string | null,
    parentNodeId: string | null,
    queue: QueueEntry[],
    opts?: { markVisited?: boolean; matchedGoal?: boolean },
  ) => {
    if (opts?.markVisited && nodeId && !visitedOrder.includes(nodeId)) {
      visitedOrder.push(nodeId)
    }
    steps.push({
      order: steps.length + 1,
      codeLine,
      nodeId,
      nodeLabel: nodeId ? (tree.nodesById[nodeId]?.label ?? null) : null,
      parentNodeId,
      visitedNodeIds: [...visitedOrder],
      matchedGoal: opts?.matchedGoal,
      queueLabels: queueLabelsFrom(tree, queue),
    })
  }

  push(L.ENTER, rootId, null, [])
  push(L.NULL_CHECK, rootId, null, [])

  const queue: QueueEntry[] = [{ nodeId: rootId, parentNodeId: null }]
  push(L.INIT_QUEUE, rootId, null, queue)

  while (queue.length > 0) {
    push(L.WHILE, queue[0]?.nodeId ?? null, queue[0]?.parentNodeId ?? null, queue)

    const current = queue.shift()!
    const node = tree.nodesById[current.nodeId]
    if (!node) continue

    push(L.DEQUEUE, current.nodeId, current.parentNodeId, queue, { markVisited: true })
    push(L.MATCH_CHECK, current.nodeId, current.parentNodeId, queue)

    if (matchesGoal(node, goal)) {
      push(L.RETURN_MATCH, current.nodeId, current.parentNodeId, queue, { matchedGoal: true })
      return {
        steps,
        foundNodeId: node.id,
        foundNodeLabel: node.label,
        foundNodeIds: [node.id],
        foundValue: null,
        goalType: goal.type,
      }
    }

    push(L.CHECK_LEFT, current.nodeId, current.parentNodeId, queue)
    if (node.leftId && tree.nodesById[node.leftId]) {
      queue.push({ nodeId: node.leftId, parentNodeId: current.nodeId })
      push(L.ENQUEUE_LEFT, current.nodeId, current.parentNodeId, queue)
    }

    push(L.CHECK_RIGHT, current.nodeId, current.parentNodeId, queue)
    if (node.rightId && tree.nodesById[node.rightId]) {
      queue.push({ nodeId: node.rightId, parentNodeId: current.nodeId })
      push(L.ENQUEUE_RIGHT, current.nodeId, current.parentNodeId, queue)
    }
  }

  push(L.RETURN, null, null, [])

  return {
    steps,
    foundNodeId: null,
    foundNodeLabel: null,
    foundNodeIds: [],
    foundValue: null,
    goalType: goal.type,
  }
}

function runLevelOrderExtremeExec(tree: BinaryTree, goal: BfsGoal): BinaryTreeExecResult {
  const L = LEVEL_ORDER_EXTREME_CODE_LINES
  const steps: BinaryTreeExecStep[] = []
  const visitedOrder: string[] = []
  let extremeValue: number | null = null
  const rootId = tree.rootId!

  const push = (
    codeLine: number,
    nodeId: string | null,
    parentNodeId: string | null,
    queue: QueueEntry[],
    runningBest?: number | null,
    opts?: { markVisited?: boolean },
  ) => {
    if (opts?.markVisited && nodeId && !visitedOrder.includes(nodeId)) {
      visitedOrder.push(nodeId)
    }
    steps.push({
      order: steps.length + 1,
      codeLine,
      nodeId,
      nodeLabel: nodeId ? (tree.nodesById[nodeId]?.label ?? null) : null,
      parentNodeId,
      visitedNodeIds: [...visitedOrder],
      runningBest: runningBest ?? extremeValue,
      queueLabels: queueLabelsFrom(tree, queue),
    })
  }

  push(L.ENTER, rootId, null, [])
  push(L.INIT_BEST, rootId, null, [])
  push(L.NULL_CHECK, rootId, null, [])

  const queue: QueueEntry[] = [{ nodeId: rootId, parentNodeId: null }]
  push(L.INIT_QUEUE, rootId, null, queue)

  while (queue.length > 0) {
    push(L.WHILE, queue[0]?.nodeId ?? null, queue[0]?.parentNodeId ?? null, queue, extremeValue)

    const current = queue.shift()!
    const node = tree.nodesById[current.nodeId]
    if (!node) continue

    push(L.DEQUEUE, current.nodeId, current.parentNodeId, queue, extremeValue)

    let willUpdate = false
    if (typeof node.value === 'number') {
      if (extremeValue === null) willUpdate = true
      else if (goal.type === 'max-value' && node.value > extremeValue) willUpdate = true
      else if (goal.type === 'min-value' && node.value < extremeValue) willUpdate = true
    }

    if (willUpdate) {
      push(L.COMPARE, current.nodeId, current.parentNodeId, queue, extremeValue)
      extremeValue = node.value as number
      push(L.UPDATE_BEST, current.nodeId, current.parentNodeId, queue, extremeValue, { markVisited: true })
    } else {
      push(L.COMPARE, current.nodeId, current.parentNodeId, queue, extremeValue, { markVisited: true })
    }

    push(L.CHECK_LEFT, current.nodeId, current.parentNodeId, queue, extremeValue)
    if (node.leftId && tree.nodesById[node.leftId]) {
      queue.push({ nodeId: node.leftId, parentNodeId: current.nodeId })
      push(L.ENQUEUE_LEFT, current.nodeId, current.parentNodeId, queue, extremeValue)
    }

    push(L.CHECK_RIGHT, current.nodeId, current.parentNodeId, queue, extremeValue)
    if (node.rightId && tree.nodesById[node.rightId]) {
      queue.push({ nodeId: node.rightId, parentNodeId: current.nodeId })
      push(L.ENQUEUE_RIGHT, current.nodeId, current.parentNodeId, queue, extremeValue)
    }
  }

  push(L.RETURN, rootId, null, [], extremeValue)

  return {
    steps,
    foundNodeId: null,
    foundNodeLabel: null,
    foundNodeIds: [],
    foundValue: extremeValue,
    goalType: goal.type,
  }
}

function execStepsToVisitSteps(exec: BinaryTreeExecResult): BfsStep[] {
  const visits: BfsStep[] = []
  let prevLen = 0
  for (const step of exec.steps) {
    if (step.visitedNodeIds.length <= prevLen) continue
    prevLen = step.visitedNodeIds.length
    if (!step.nodeId || !step.nodeLabel) continue
    visits.push({
      nodeId: step.nodeId,
      nodeLabel: step.nodeLabel,
      order: visits.length + 1,
      fromNodeId: step.parentNodeId,
      runningBest: step.runningBest,
      frontierNodeIds: [],
    })
  }
  return visits
}

// Collapse exec steps into visit-order BfsResult (tests + completion status).
export function binaryTreeExecToBfsResult(exec: BinaryTreeExecResult): BfsResult {
  return {
    steps: execStepsToVisitSteps(exec),
    foundNodeId: exec.foundNodeId,
    foundNodeLabel: exec.foundNodeLabel,
    foundNodeIds: exec.foundNodeIds,
    foundValue: exec.foundValue,
    goalType: exec.goalType,
  }
}

export function runBinaryTreePreorderSearch(tree: BinaryTree, goal: BfsGoal): BfsResult {
  return binaryTreeExecToBfsResult(runBinaryTreePreorderExec(tree, goal))
}

export function runBinaryTreeInorderSearch(tree: BinaryTree, goal: BfsGoal): BfsResult {
  return binaryTreeExecToBfsResult(runBinaryTreeInorderExec(tree, goal))
}

export function runBinaryTreePostorderSearch(tree: BinaryTree, goal: BfsGoal): BfsResult {
  return binaryTreeExecToBfsResult(runBinaryTreePostorderExec(tree, goal))
}

export function runBinaryTreeLevelOrderSearch(tree: BinaryTree, goal: BfsGoal): BfsResult {
  return binaryTreeExecToBfsResult(runBinaryTreeLevelOrderExec(tree, goal))
}

type PrepareArgs = {
  tree: BinaryTree
  goalType: GoalType
  goalNodeLabel: string
  goalValueInput: string
  algoLabel: string
}

type PrepareResult =
  | { ok: true; goal: BfsGoal; initialGoalNodeIds: string[] }
  | { ok: false; error: string }

// Validate goal inputs and build the payload for a tree traversal run (always starts at root).
export const prepareBinaryTreeTraversalRunInputs = ({
  tree,
  goalType,
  goalNodeLabel,
  goalValueInput,
  algoLabel,
}: PrepareArgs): PrepareResult => {
  const nodes = Object.values(tree.nodesById)

  if (nodes.length === 0) {
    return { ok: false, error: `Add nodes before running ${algoLabel}.` }
  }

  if (goalType !== 'target-node' && nodes.some((node) => node.value === 'empty')) {
    return { ok: false, error: 'Fill all empty node values first.' }
  }

  if (goalType === 'target-node') {
    const normalizedGoalNode = goalNodeLabel.trim().toUpperCase()
    if (normalizedGoalNode === '') {
      return { ok: false, error: 'Goal node is required for Target node search.' }
    }
    const targetNode = nodes.find((node) => node.label.toUpperCase() === normalizedGoalNode)
    if (!targetNode) {
      return { ok: false, error: `Goal node "${normalizedGoalNode}" does not exist.` }
    }
    return {
      ok: true,
      goal: { type: 'target-node', targetNodeLabel: normalizedGoalNode },
      initialGoalNodeIds: [targetNode.id],
    }
  }

  if (goalType === 'target-value') {
    const targetValue = parseNumberInput(goalValueInput)
    if (targetValue === null) {
      return { ok: false, error: 'Enter a valid numeric goal value.' }
    }
    return { ok: true, goal: { type: 'target-value', targetValue }, initialGoalNodeIds: [] }
  }

  if (goalType === 'max-value') {
    return { ok: true, goal: { type: 'max-value' }, initialGoalNodeIds: [] }
  }

  return { ok: true, goal: { type: 'min-value' }, initialGoalNodeIds: [] }
}

// Build the final status line after a binary tree traversal completes.
export const buildBinaryTreeTraversalCompletionStatus = (result: BfsResult): string => {
  if (result.goalType === 'max-value' || result.goalType === 'min-value') {
    const valueLabel = result.goalType === 'max-value' ? 'Maximum' : 'Minimum'
    if (result.foundValue === null) {
      return `${valueLabel} value search complete.`
    }
    return `${valueLabel} value in the tree: ${result.foundValue}.`
  }

  if (!result.foundNodeLabel) {
    return 'Goal not found among the tree nodes.'
  }

  return `Goal node ${result.foundNodeLabel} reached.`
}
