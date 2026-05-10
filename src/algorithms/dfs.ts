import type { GraphNode } from '../types'
import type { BfsInput, BfsResult, BfsStep } from './types'

// Check whether a node satisfies a non-extreme DFS goal.
const matchesGoal = (node: GraphNode, goal: BfsInput['goal']) => {
  if (goal.type === 'target-node') {
    return node.label.toUpperCase() === goal.targetNodeLabel.toUpperCase()
  }

  if (goal.type === 'target-value') {
    return typeof node.value === 'number' && node.value === goal.targetValue
  }

  return false
}

// Build outgoing adjacency lists based on edge direction (same as BFS).
const buildNeighbors = (input: BfsInput) => {
  const neighborsById = new Map<string, string[]>()
  input.nodes.forEach((node) => neighborsById.set(node.id, []))

  input.edges.forEach((edge) => {
    const from = neighborsById.get(edge.fromNodeId)
    const to = neighborsById.get(edge.toNodeId)
    if (!from || !to) return

    if (edge.direction === 'both' || edge.direction === 'forward') {
      from.push(edge.toNodeId)
    }
    if (edge.direction === 'both' || edge.direction === 'backward') {
      to.push(edge.fromNodeId)
    }
  })

  return neighborsById
}

// Execute DFS (iterative, pre-order) from the given start label; same I/O contract as runBfs.
export const runDfs = (input: BfsInput): BfsResult => {
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
  const neighborsById = buildNeighbors(input)
  const stack: string[] = [startNode.id]
  const visited = new Set<string>([startNode.id])
  const steps: BfsStep[] = []

  let order = 1
  let foundNode: GraphNode | null = null
  let extremeValue: number | null = null
  let extremeNodes: GraphNode[] = []

  while (stack.length > 0) {
    const currentId = stack.pop()
    if (!currentId) continue
    const currentNode = nodeById.get(currentId)
    if (!currentNode) continue

    steps.push({ nodeId: currentNode.id, nodeLabel: currentNode.label, order })
    order += 1

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
    } else if (matchesGoal(currentNode, input.goal)) {
      foundNode = currentNode
      break
    }

    const neighbors = neighborsById.get(currentNode.id) || []
    for (let i = neighbors.length - 1; i >= 0; i -= 1) {
      const neighborId = neighbors[i]
      if (visited.has(neighborId)) continue
      visited.add(neighborId)
      stack.push(neighborId)
    }
  }

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
