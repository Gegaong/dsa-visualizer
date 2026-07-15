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

export type BinaryTreeBstExecStep = {
  order: number
  codeLine: number
  nodeId: string | null
  nodeLabel: string | null
  parentNodeId: string | null
  visitedNodeIds: string[]
  minBound: number
  maxBound: number
  leftOk?: string
  rightOk?: string
  /** True on the step that discovers a range violation. */
  violated?: boolean
}

export type BinaryTreeValidateBstResult = {
  steps: BinaryTreeBstExecStep[]
  isValid: boolean
  violationNodeId: string | null
  violationNodeLabel: string | null
}

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
    steps,
    isValid,
    violationNodeId: violationNode?.id ?? null,
    violationNodeLabel: violationNode?.label ?? null,
  }
}

/** True when Validate BST can safely run (every node has a number). */
export function canRunValidateBst(tree: BinaryTree): boolean {
  return treeHasAllNumericValues(tree)
}
