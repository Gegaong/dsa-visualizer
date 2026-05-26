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
  const frontierIds = new Set<string>([startNode.id])

  let order = 1
  let foundNode: GraphNode | null = null
  let extremeValue: number | null = null
  let extremeNodes: GraphNode[] = []

  const strategyLabel = strategy === 'bfs' ? 'BFS' : 'DFS'
  const popWord = strategy === 'bfs' ? 'Dequeued' : 'Popped'

  const buildExplanation = (currentNode: GraphNode, parentId: string | null): string => {
    const sortedNeighbors = sortIdsByLabel(neighborsById.get(currentNode.id) ?? [], nodeById)
    const unseen = sortedNeighbors.filter((id) => !visited.has(id))
    const unseenLabels = unseen
      .map((id) => nodeById.get(id)?.label)
      .filter((label): label is string => !!label)

    let goalCheck = ''
    if (input.goal.type === 'target-node' && matchesGoal(currentNode, input.goal)) {
      goalCheck = ` Target node matched — traversal stops immediately.`
    } else if (input.goal.type === 'target-value' && matchesGoal(currentNode, input.goal)) {
      goalCheck = ` Value matches the target — traversal stops immediately.`
    }

    let neighborSentence: string
    if (unseenLabels.length === 0) {
      neighborSentence = strategy === 'bfs'
        ? `No unseen neighbors — all outgoing edges already visited. Returning to the queue (traversal ends if no more nodes).`
        : `No unseen neighbors — continuing with the next node from the stack.`
    } else if (strategy === 'bfs') {
      neighborSentence = `Enqueuing ${unseenLabels.join(', ')} at the back of the queue — processed only after all already-waiting nodes, preserving level-by-level order.`
    } else {
      neighborSentence = `Pushing ${unseenLabels.join(', ')} on top of the stack — they are explored before any waiting siblings, driving the search deeper first.`
    }

    const arrivalNote = parentId === null
      ? `${strategyLabel} starts here — this is the seed node.${goalCheck} ${neighborSentence}`
      : `${popWord} ${currentNode.label}.${goalCheck} ${neighborSentence}`

    return arrivalNote
  }

  traverseReachableFrom({
    neighborsById,
    startId: startNode.id,
    visited,
    strategy,
    orderNeighbors: (raw) => sortIdsByLabel(raw, nodeById),
    onVisit: (currentId, parentId) => {
      const currentNode = nodeById.get(currentId)
      if (!currentNode) return

      frontierIds.delete(currentId)
      const newNeighbors = sortIdsByLabel(neighborsById.get(currentId) ?? [], nodeById).filter(id => !visited.has(id))
      for (const id of newNeighbors) frontierIds.add(id)
      const stepFrontierNodeIds = [...frontierIds]

      if (input.goal.type === 'max-value' || input.goal.type === 'min-value') {
        let valueChangeNote = ''
        if (typeof currentNode.value === 'number') {
          const prevValue = extremeValue
          if (extremeValue === null) {
            extremeValue = currentNode.value
            extremeNodes = [currentNode]
          } else if (input.goal.type === 'max-value' && currentNode.value > extremeValue) {
            extremeValue = currentNode.value
            extremeNodes = [currentNode]
            valueChangeNote = ` Max improved: ${currentNode.value} > ${prevValue}.`
          } else if (input.goal.type === 'min-value' && currentNode.value < extremeValue) {
            extremeValue = currentNode.value
            extremeNodes = [currentNode]
            valueChangeNote = ` Min improved: ${currentNode.value} < ${prevValue}.`
          } else if (currentNode.value === extremeValue) {
            extremeNodes.push(currentNode)
            valueChangeNote = input.goal.type === 'max-value'
              ? ` Ties current max: ${currentNode.value} = ${extremeValue}.`
              : ` Ties current min: ${currentNode.value} = ${extremeValue}.`
          } else {
            valueChangeNote = input.goal.type === 'max-value'
              ? ` Below current max: ${currentNode.value} < ${extremeValue}.`
              : ` Above current min: ${currentNode.value} > ${extremeValue}.`
          }
        }
        const explanation = buildExplanation(currentNode, parentId) + valueChangeNote
        steps.push({ nodeId: currentNode.id, nodeLabel: currentNode.label, order, fromNodeId: parentId, runningBest: extremeValue, frontierNodeIds: stepFrontierNodeIds, explanation })
      } else {
        const explanation = buildExplanation(currentNode, parentId)
        steps.push({ nodeId: currentNode.id, nodeLabel: currentNode.label, order, fromNodeId: parentId, frontierNodeIds: stepFrontierNodeIds, explanation })
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

  // Update final step's explanation if algorithm terminated (no goal found, queue is now empty)
  if (steps.length > 0 && !foundNode) {
    const lastStep = steps[steps.length - 1]
    if (lastStep.explanation && (lastStep.explanation.includes('Enqueuing') || lastStep.explanation.includes('Pushing'))) {
      const action = strategy === 'bfs' ? 'Dequeued' : 'Popped'
      lastStep.explanation = `${action} ${lastStep.nodeLabel}. Queue is empty — traversal complete.`
    }
  }

  // If goal was found, remove the neighbor-pushing sentence from the final step since traversal stops immediately
  if (steps.length > 0 && foundNode) {
    const lastStep = steps[steps.length - 1]
    if (lastStep.explanation && (lastStep.explanation.includes('Pushing') || lastStep.explanation.includes('Enqueuing'))) {
      const action = strategy === 'bfs' ? 'Dequeued' : 'Popped'
      lastStep.explanation = `${action} ${lastStep.nodeLabel}. Goal matched — traversal stops.`
    }
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
