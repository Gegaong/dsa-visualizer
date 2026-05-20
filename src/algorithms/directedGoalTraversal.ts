import type { GraphNode } from '../types'

import type { BfsInput, BfsResult, BfsStep, TraversalStrategy } from './algorithmstypes'

import { buildNeighborsMap } from './graphAdjacency'

import { traverseReachableFrom } from './graphTraversal'

import { sortIdsByLabel } from './sortIdsByLabel'

// True when the node matches a target-label or target-value goal (not max/min extremes).
const matchesGoal = (node: GraphNode, goal: BfsInput['goal']) => {
  if (goal.type === 'target-node') {
    return node.label.toUpperCase() === goal.targetNodeLabel.toUpperCase()
  }

  if (goal.type === 'target-value') {
    return typeof node.value === 'number' && node.value === goal.targetValue
  }

  return false
}

// Directed-graph traversal from the chosen start label: step list + goal outcome; strategy is only visit order (BFS vs DFS).
export function runDirectedGoalTraversal(
  input: BfsInput,
  strategy: TraversalStrategy,
): BfsResult {
  const startNode = input.nodes.find(
    (node) => node.label.toUpperCase() === input.startNodeLabel.toUpperCase(),
  )

  if (!startNode) {
    return {
      steps: [],
      foundNodeId: null,
      foundNodeLabel: null,
      foundNodeIds: [],
      foundValue: null,
      goalType: input.goal.type,
    }
  }

  if (input.goal.type === 'max-value' || input.goal.type === 'min-value') {
    const numericNodes = input.nodes.filter(
      (node): node is GraphNode & { value: number } => typeof node.value === 'number',
    )
    if (numericNodes.length === 0) {
      return {
        steps: [],
        foundNodeId: null,
        foundNodeLabel: null,
        foundNodeIds: [],
        foundValue: null,
        goalType: input.goal.type,
      }
    }
  }

  const nodeById = new Map(input.nodes.map((node) => [node.id, node]))
  const neighborsById = buildNeighborsMap(input.nodes, input.edges)
  const visited = new Set<string>()
  const steps: BfsStep[] = []

  let order = 1
  let foundNode: GraphNode | null = null
  let extremeValue: number | null = null
  let extremeNodes: GraphNode[] = []

  traverseReachableFrom({
    neighborsById,
    startId: startNode.id,
    visited,
    strategy,
    orderNeighbors: (raw) => sortIdsByLabel(raw, nodeById),
    onVisit: (currentId, parentId) => {
      const currentNode = nodeById.get(currentId)
      if (!currentNode) return

      if (input.goal.type === 'max-value' || input.goal.type === 'min-value') {
        if (typeof currentNode.value === 'number') {
          if (extremeValue === null) {
            extremeValue = currentNode.value
            extremeNodes = [currentNode]
          } else if (input.goal.type === 'max-value' && currentNode.value > extremeValue) {
            extremeValue = currentNode.value
            extremeNodes = [currentNode]
          } else if (input.goal.type === 'min-value' && currentNode.value < extremeValue) {
            extremeValue = currentNode.value
            extremeNodes = [currentNode]
          } else if (currentNode.value === extremeValue) {
            extremeNodes.push(currentNode)
          }
        }
        steps.push({ nodeId: currentNode.id, nodeLabel: currentNode.label, order, fromNodeId: parentId, runningBest: extremeValue })
      } else {
        steps.push({ nodeId: currentNode.id, nodeLabel: currentNode.label, order, fromNodeId: parentId })
        if (matchesGoal(currentNode, input.goal)) {
          foundNode = currentNode
          order += 1
          return 'stop'
        }
      }

      order += 1
    },
  })

  let finalNode: GraphNode | null = null
  if (foundNode) {
    finalNode = foundNode
  } else if (extremeNodes.length > 0) {
    finalNode = extremeNodes[0]
  }

  let foundNodeId: string | null = null
  let foundNodeLabel: string | null = null
  if (finalNode) {
    foundNodeId = finalNode.id
    foundNodeLabel = finalNode.label
  }

  let foundNodeIds: string[] = []
  let foundValue: number | null = null
  if (input.goal.type === 'max-value' || input.goal.type === 'min-value') {
    foundNodeIds = extremeNodes.map((node) => node.id)
    foundValue = extremeValue
  } else if (finalNode) {
    foundNodeIds = [finalNode.id]
  }

  return {
    steps,
    foundNodeId,
    foundNodeLabel,
    foundNodeIds,
    foundValue,
    goalType: input.goal.type,
  }
}
