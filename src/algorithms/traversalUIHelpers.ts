import type { BfsGoal, BfsResult, TraversalStrategy } from './algorithmstypes'
import type { GoalType, GraphNode } from '../types'
import { parseNumberInput } from '../utils/format'

type PrepareArgs = {
  nodes: GraphNode[]
  goalType: GoalType
  startNodeLabel: string
  goalNodeLabel: string
  goalValueInput: string
}

type PrepareResult =
  | {
    ok: true
    startNode: GraphNode
    goal: BfsGoal
    initialGoalNodeIds: string[]
  }
  | {
    ok: false
    error: string
  }

// Validate BFS or DFS inputs and build the goal payload used by runBfs / runDfs.
export const prepareTraversalRunInputs = (
  algo: TraversalStrategy,
  { nodes, goalType, startNodeLabel, goalNodeLabel, goalValueInput }: PrepareArgs,
): PrepareResult => {
  const algoLabel = algo === 'bfs' ? 'BFS' : 'DFS'

  if (nodes.length === 0) {
    return { ok: false, error: `Add nodes before running ${algoLabel}.` }
  }

  if (nodes.some((node) => node.value === 'empty')) {
    return { ok: false, error: 'Fill or nullify all empty node values first.' }
  }

  const normalizedStart = startNodeLabel.trim().toUpperCase()
  if (normalizedStart === '') {
    return { ok: false, error: 'Start node is required.' }
  }

  const startNode = nodes.find((node) => node.label.toUpperCase() === normalizedStart)
  if (!startNode) {
    return { ok: false, error: `Start node "${normalizedStart}" does not exist.` }
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
      startNode,
      goal: { type: 'target-node', targetNodeLabel: normalizedGoalNode },
      initialGoalNodeIds: [targetNode.id],
    }
  }

  if (goalType === 'target-value') {
    const targetValue = parseNumberInput(goalValueInput)
    if (targetValue === null) {
      return { ok: false, error: 'Enter a valid numeric goal value.' }
    }

    return {
      ok: true,
      startNode,
      goal: { type: 'target-value', targetValue },
      initialGoalNodeIds: [],
    }
  }

  if (goalType === 'max-value') {
    return {
      ok: true,
      startNode,
      goal: { type: 'max-value' },
      initialGoalNodeIds: [],
    }
  }

  return {
    ok: true,
    startNode,
    goal: { type: 'min-value' },
    initialGoalNodeIds: [],
  }
}

// Build the final status line after BFS or DFS traversal completes.
export const buildTraversalCompletionStatus = (result: BfsResult, nodes: GraphNode[]) => {
  if (!result.foundNodeLabel) {
    return 'Done. Goal not found in reachable nodes.'
  }

  if (result.goalType === 'max-value' || result.goalType === 'min-value') {
    const valueLabel = result.goalType === 'max-value' ? 'Maximum' : 'Minimum'
    const nodeLabels = nodes
      .filter((node) => result.foundNodeIds.includes(node.id))
      .map((node) => node.label)

    if (result.foundValue === null || nodeLabels.length === 0) {
      return `Done. ${valueLabel} value search over reachable nodes finished.`
    }

    if (nodeLabels.length <= 4) {
      return `${valueLabel} value among reachable nodes is ${result.foundValue} at node(s): ${nodeLabels.join(', ')}.`
    }

    return `${valueLabel} value among reachable nodes is ${result.foundValue}, shared by ${nodeLabels.length} nodes.`
  }

  return `Done. Goal reached at node ${result.foundNodeLabel}.`
}
