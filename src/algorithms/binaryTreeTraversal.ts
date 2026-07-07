import type { BinaryTree, BinaryTreeNode, GoalType } from '../types'

import type { BfsGoal, BfsResult, BfsStep } from './algorithmTypes'

import { parseNumberInput } from '../utils/format'

export type BinaryTreeTraversalAlgorithm = 'preorder' | 'inorder' | 'postorder' | 'level-order'

// True when the node matches a target-label or target-value goal (not max/min extremes) —
// same rule as the graph canvas's directed goal traversal.
const matchesGoal = (node: BinaryTreeNode, goal: BfsGoal): boolean => {
  if (goal.type === 'target-node') {
    return node.label.toUpperCase() === goal.targetNodeLabel.toUpperCase()
  }
  if (goal.type === 'target-value') {
    return typeof node.value === 'number' && node.value === goal.targetValue
  }
  return false
}

// True preorder recursion (root, then recurse left, then recurse right) — mirrors the pseudocode
// exactly, the same way solveNQueens() drives its visualization with real backtracking recursion
// rather than an explicit worklist. There's no queue or stack here, so — unlike the graph
// canvas's BFS/DFS — steps don't report a "frontier": that concept only makes sense for an
// explicit worklist of discovered-but-not-yet-visited nodes, which recursion never builds.
export function runBinaryTreePreorderSearch(tree: BinaryTree, goal: BfsGoal): BfsResult {
  const emptyResult: BfsResult = {
    steps: [],
    foundNodeId: null,
    foundNodeLabel: null,
    foundNodeIds: [],
    foundValue: null,
    goalType: goal.type,
  }

  if (!tree.rootId || !tree.nodesById[tree.rootId]) return emptyResult

  if (goal.type === 'max-value' || goal.type === 'min-value') {
    const hasNumericValue = Object.values(tree.nodesById).some((node) => typeof node.value === 'number')
    if (!hasNumericValue) return emptyResult
  }

  const steps: BfsStep[] = []
  let order = 1
  let foundNode: BinaryTreeNode | null = null
  let stopped = false
  let extremeValue: number | null = null
  let extremeNodes: BinaryTreeNode[] = []

  const isExtremeGoal = goal.type === 'max-value' || goal.type === 'min-value'

  function preorder(nodeId: string, parentId: string | null): void {
    if (stopped) return
    const node = tree.nodesById[nodeId]
    if (!node) return

    if (isExtremeGoal) {
      if (typeof node.value === 'number') {
        if (extremeValue === null) {
          extremeValue = node.value
          extremeNodes = [node]
        } else if (goal.type === 'max-value' && node.value > extremeValue) {
          extremeValue = node.value
          extremeNodes = [node]
        } else if (goal.type === 'min-value' && node.value < extremeValue) {
          extremeValue = node.value
          extremeNodes = [node]
        } else if (node.value === extremeValue) {
          extremeNodes.push(node)
        }
      }
      steps.push({ nodeId: node.id, nodeLabel: node.label, order, fromNodeId: parentId, runningBest: extremeValue, frontierNodeIds: [] })
      order += 1
    } else {
      steps.push({ nodeId: node.id, nodeLabel: node.label, order, fromNodeId: parentId, frontierNodeIds: [] })
      order += 1
      if (matchesGoal(node, goal)) {
        foundNode = node
        stopped = true
        return
      }
    }

    if (node.leftId) preorder(node.leftId, node.id)
    if (stopped) return
    if (node.rightId) preorder(node.rightId, node.id)
  }

  preorder(tree.rootId, null)

  const finalNode = foundNode ?? extremeNodes[0] ?? null

  const foundNodeId = finalNode?.id ?? null
  const foundNodeLabel = finalNode?.label ?? null

  let foundNodeIds: string[] = []
  let foundValue: number | null = null
  if (goal.type === 'max-value' || goal.type === 'min-value') {
    foundNodeIds = extremeNodes.map((node) => node.id)
    foundValue = extremeValue
  } else if (finalNode) {
    foundNodeIds = [finalNode.id]
  }

  return { steps, foundNodeId, foundNodeLabel, foundNodeIds, foundValue, goalType: goal.type }
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

// Validate the binary tree traversal's goal inputs and build the goal payload used by
// runBinaryTreePreorderSearch. There's no start-node field to validate — a tree traversal
// always starts at the root.
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
export const buildBinaryTreeTraversalCompletionStatus = (result: BfsResult, tree: BinaryTree): string => {
  if (!result.foundNodeLabel) {
    return 'Goal not found among the tree nodes.'
  }

  if (result.goalType === 'max-value' || result.goalType === 'min-value') {
    const valueLabel = result.goalType === 'max-value' ? 'Maximum' : 'Minimum'
    const nodeLabels = result.foundNodeIds
      .map((id) => tree.nodesById[id]?.label)
      .filter((label): label is string => Boolean(label))

    if (result.foundValue === null || nodeLabels.length === 0) {
      return `${valueLabel} value search complete.`
    }
    if (nodeLabels.length === 1) {
      return `${valueLabel} value in the tree: ${result.foundValue} at node ${nodeLabels[0]}.`
    }
    if (nodeLabels.length <= 4) {
      return `${valueLabel} value in the tree: ${result.foundValue}, shared by ${nodeLabels.join(', ')}.`
    }
    return `${valueLabel} value in the tree: ${result.foundValue}, shared by ${nodeLabels.length} nodes.`
  }

  return `Goal node ${result.foundNodeLabel} reached.`
}
