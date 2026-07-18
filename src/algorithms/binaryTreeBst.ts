import type { BinaryTree, BinaryTreeNode } from '../types'

import { treeHasAllNumericValues } from './binaryTreeShared'

export type BinaryTreeBstAlgorithm = 'validate' | 'search' | 'insert' | 'delete'

// Line indices into BinaryTreeBstPage VALIDATE_CODE — keep in sync when editing pseudocode.
export const VALIDATE_BST_CODE_LINES = {
  ENTER: 0,
  NULL_CHECK: 1,
  RETURN_TRUE: 2,
  RANGE_CHECK: 3,
  RETURN_FALSE: 4,
  RECURSE_LEFT: 5,
  CHECK_LEFT: 6,
  RETURN_LEFT_FALSE: 7,
  RECURSE_RIGHT: 8,
  RETURN: 9,
} as const

// Line indices into BinaryTreeBstPage SEARCH_CODE — keep in sync when editing pseudocode.
export const SEARCH_BST_CODE_LINES = {
  ENTER: 0,
  NULL_CHECK: 1,
  RETURN_NULL: 2,
  EQUAL_CHECK: 3,
  RETURN_NODE: 4,
  COMPARE: 5,
  RECURSE_LEFT: 6,
  RECURSE_RIGHT: 7,
} as const

export type BinaryTreeBstExecStep = {
  order: number
  codeLine: number
  nodeId: string | null
  nodeLabel: string | null
  parentNodeId: string | null
  visitedNodeIds: string[]
  minBound?: number
  maxBound?: number
  leftOk?: string
  rightOk?: string
  /** True on the step that discovers a range violation. */
  violated?: boolean
  target?: number
  /** True on the search step that returns the matching node. */
  matched?: boolean
}

export type BinaryTreeValidateBstResult = {
  kind: 'validate'
  steps: BinaryTreeBstExecStep[]
  isValid: boolean
  violationNodeId: string | null
  violationNodeLabel: string | null
}

export type BinaryTreeSearchBstResult = {
  kind: 'search'
  steps: BinaryTreeBstExecStep[]
  found: boolean
  foundNodeId: string | null
  foundNodeLabel: string | null
  target: number
}

export type BinaryTreeBstExecResult = BinaryTreeValidateBstResult | BinaryTreeSearchBstResult

export function formatBstBound(bound: number): string {
  if (bound === Number.NEGATIVE_INFINITY) return '-∞'
  if (bound === Number.POSITIVE_INFINITY) return '+∞'
  return String(bound)
}

export function buildValidateBstCompletionStatus(result: BinaryTreeValidateBstResult): string {
  if (result.isValid) return 'Done. This tree is a valid BST.'
  const label = result.violationNodeLabel ?? '?'
  return `Done. Not a BST — node ${label} breaks its allowed range.`
}

function formatOk(value: boolean | undefined): string {
  if (value === undefined) return '—'
  return value ? 'true' : 'false'
}

/**
 * Line-by-line Validate BST: each node must sit inside [min, max] (inclusive).
 * Left subtree gets max = node.value; right subtree gets min = node.value.
 * Duplicates are allowed — matches Convert to BST. Stops on the first violation.
 */
export function runValidateBstExec(tree: BinaryTree): BinaryTreeValidateBstResult {
  const L = VALIDATE_BST_CODE_LINES
  const steps: BinaryTreeBstExecStep[] = []
  const visitedOrder: string[] = []
  let stopped = false
  let violationNode: BinaryTreeNode | null = null

  const push = (
    codeLine: number,
    nodeId: string | null,
    parentNodeId: string | null,
    minBound: number,
    maxBound: number,
    frame: { leftOk: boolean | undefined; rightOk: boolean | undefined },
    opts?: { markVisited?: boolean; violated?: boolean },
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
      minBound,
      maxBound,
      leftOk: formatOk(frame.leftOk),
      rightOk: formatOk(frame.rightOk),
      violated: opts?.violated,
    })
  }

  function isValidBST(nodeId: string | null, parentNodeId: string | null, minBound: number, maxBound: number): boolean {
    if (stopped) return false

    let leftOk: boolean | undefined = undefined
    let rightOk: boolean | undefined = undefined
    const frame = () => ({ leftOk, rightOk })

    push(L.ENTER, nodeId, parentNodeId, minBound, maxBound, frame())
    push(L.NULL_CHECK, nodeId, parentNodeId, minBound, maxBound, frame())

    if (!nodeId) {
      push(L.RETURN_TRUE, null, parentNodeId, minBound, maxBound, frame())
      return true
    }

    const node = tree.nodesById[nodeId]
    if (!node || typeof node.value !== 'number') {
      // Treat missing / empty as invalid data; should be gated before run.
      violationNode = node ?? null
      stopped = true
      push(L.RETURN_FALSE, nodeId, parentNodeId, minBound, maxBound, frame(), { violated: true })
      return false
    }

    push(L.RANGE_CHECK, nodeId, parentNodeId, minBound, maxBound, frame())

    if (node.value < minBound || node.value > maxBound) {
      violationNode = node
      stopped = true
      push(L.RETURN_FALSE, nodeId, parentNodeId, minBound, maxBound, frame(), { violated: true })
      return false
    }

    // Only nodes that pass the range check count as visited.
    push(L.RECURSE_LEFT, nodeId, parentNodeId, minBound, maxBound, frame(), { markVisited: true })
    leftOk = isValidBST(node.leftId, nodeId, minBound, node.value)
    push(L.CHECK_LEFT, nodeId, parentNodeId, minBound, maxBound, frame())
    if (!leftOk) {
      push(L.RETURN_LEFT_FALSE, nodeId, parentNodeId, minBound, maxBound, frame())
      return false
    }
    if (stopped) return false

    push(L.RECURSE_RIGHT, nodeId, parentNodeId, minBound, maxBound, frame())
    rightOk = isValidBST(node.rightId, nodeId, node.value, maxBound)
    push(L.RETURN, nodeId, parentNodeId, minBound, maxBound, frame())
    return rightOk
  }

  const isValid = isValidBST(tree.rootId, null, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)

  return {
    kind: 'validate',
    steps,
    isValid,
    violationNodeId: violationNode?.id ?? null,
    violationNodeLabel: violationNode?.label ?? null,
  }
}

export function buildSearchBstCompletionStatus(result: BinaryTreeSearchBstResult): string {
  if (result.found) {
    const label = result.foundNodeLabel ?? '?'
    return `Done. Found target ${result.target} at node ${label}.`
  }
  return `Done. Target ${result.target} is not in the tree.`
}

/**
 * Line-by-line BST search from the root: equal → found, smaller → left, larger → right.
 * Stops when the target matches or a null child is reached.
 */
export function runSearchBstExec(tree: BinaryTree, target: number): BinaryTreeSearchBstResult {
  const L = SEARCH_BST_CODE_LINES
  const steps: BinaryTreeBstExecStep[] = []
  const visitedOrder: string[] = []

  const push = (
    codeLine: number,
    nodeId: string | null,
    parentNodeId: string | null,
    opts?: { markVisited?: boolean; matched?: boolean },
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
      target,
      matched: opts?.matched,
    })
  }

  function searchBST(nodeId: string | null, parentNodeId: string | null): string | null {
    push(L.ENTER, nodeId, parentNodeId)
    push(L.NULL_CHECK, nodeId, parentNodeId)

    if (!nodeId) {
      push(L.RETURN_NULL, null, parentNodeId)
      return null
    }

    const node = tree.nodesById[nodeId]
    if (!node || typeof node.value !== 'number') {
      // Gated before run; treat as not found if it still happens.
      push(L.RETURN_NULL, nodeId, parentNodeId)
      return null
    }

    // Mark visited when the node's value is compared against the target.
    push(L.EQUAL_CHECK, nodeId, parentNodeId, { markVisited: true })
    if (node.value === target) {
      push(L.RETURN_NODE, nodeId, parentNodeId, { matched: true })
      return nodeId
    }

    push(L.COMPARE, nodeId, parentNodeId)
    if (target < node.value) {
      push(L.RECURSE_LEFT, nodeId, parentNodeId)
      return searchBST(node.leftId, nodeId)
    }

    push(L.RECURSE_RIGHT, nodeId, parentNodeId)
    return searchBST(node.rightId, nodeId)
  }

  const foundNodeId = searchBST(tree.rootId, null)
  const foundNode = foundNodeId ? tree.nodesById[foundNodeId] : null

  return {
    kind: 'search',
    steps,
    found: foundNodeId !== null,
    foundNodeId,
    foundNodeLabel: foundNode?.label ?? null,
    target,
  }
}

/** True when BST algorithms can safely run (every node has a number). */
export function canRunValidateBst(tree: BinaryTree): boolean {
  return treeHasAllNumericValues(tree)
}
