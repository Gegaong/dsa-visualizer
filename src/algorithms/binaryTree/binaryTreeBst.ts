import type { BinaryTree, BinaryTreeNode, BinaryTreeSide } from '../../types'

import { relabelBinaryTree } from '../../utils/format'

import { findChildSide, findParentId, treeHasAllNumericValues } from './binaryTreeShared'

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

// Line indices into BinaryTreeBstPage INSERT_CODE — keep in sync when editing pseudocode.
// ENTER_CONT is the wrapped `min, max):` line; highlight it together with ENTER.
export const INSERT_BST_CODE_LINES = {
  ENTER: 0,
  ENTER_CONT: 1,
  NULL_CHECK: 2,
  CREATE_NODE: 3,
  EQUAL_CHECK: 4,
  RETURN_EXISTING: 5,
  COMPARE: 6,
  ASSIGN_LEFT: 7,
  ELSE: 8,
  ASSIGN_RIGHT: 9,
  RETURN: 10,
} as const

// Line indices into BinaryTreeBstPage DELETE_CODE — keep in sync when editing pseudocode.
export const DELETE_BST_CODE_LINES = {
  ENTER: 0,
  NULL_RETURN: 1,
  CMP_LEFT: 2,
  ASSIGN_LEFT: 3,
  CMP_RIGHT: 4,
  ASSIGN_RIGHT: 5,
  NO_LEFT: 6,
  NO_RIGHT: 7,
  ELSE: 8,
  SUCC_INIT: 9,
  SUCC_WALK: 10,
  COPY_VALUE: 11,
  DELETE_SUCC: 12,
  RETURN: 13,
} as const

// Insert signature spans two lines; ENTER highlights both.
export function insertBstHighlightLines(codeLine: number): Set<number> {
  if (codeLine === INSERT_BST_CODE_LINES.ENTER) {
    return new Set([INSERT_BST_CODE_LINES.ENTER, INSERT_BST_CODE_LINES.ENTER_CONT])
  }
  return new Set([codeLine])
}

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
  // True on the step that discovers a range violation.
  violated?: boolean
  target?: number
  // True on the search step that returns the matching node.
  matched?: boolean
  // True on the insert step that creates the new node.
  inserted?: boolean
  // True on the delete step that copies the successor value into the target node.
  copied?: boolean
  // True on the delete step that splices a node out of the tree.
  removed?: boolean
  // Successor label during the two-child delete path.
  succLabel?: string | null
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

export type BinaryTreeInsertBstResult = {
  kind: 'insert'
  steps: BinaryTreeBstExecStep[]
  value: number
  // False when the value already exists — no node is created.
  didInsert: boolean
  parentNodeId: string | null
  side: BinaryTreeSide | null
  // Index into steps where the new node should appear; -1 when didInsert is false.
  insertStepIndex: number
  // Index into steps where the duplicate is returned; -1 when didInsert is true.
  rejectStepIndex: number
  // Set when didInsert is false — the node that already holds the value.
  existingNodeId: string | null
  existingNodeLabel: string | null
}

export type BinaryTreeDeleteMutation =
  | { stepIndex: number; kind: 'setValue'; nodeId: string; value: number }
  | { stepIndex: number; kind: 'spliceOut'; nodeId: string; replacementId: string | null }

export type BinaryTreeDeleteMutationInput =
  | { kind: 'setValue'; nodeId: string; value: number }
  | { kind: 'spliceOut'; nodeId: string; replacementId: string | null }

export type BinaryTreeDeleteBstResult = {
  kind: 'delete'
  steps: BinaryTreeBstExecStep[]
  key: number
  found: boolean
  // Node that held the key when found (same id may later hold the successor's value).
  targetNodeId: string | null
  targetNodeLabel: string | null
  mutations: BinaryTreeDeleteMutation[]
  baseTree: BinaryTree
  finalTree: BinaryTree
}

export type BinaryTreeBstExecResult =
  | BinaryTreeValidateBstResult
  | BinaryTreeSearchBstResult
  | BinaryTreeInsertBstResult
  | BinaryTreeDeleteBstResult

export type ApplyBstInsertSpec = {
  parentNodeId: string | null
  side: BinaryTreeSide | null
  value: number
  newId: string
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

// Line-by-line Validate BST: each node must sit strictly inside (min, max).
// Left subtree gets max = node.value; right subtree gets min = node.value.
// Equal values are not allowed (strict BST). Stops on the first violation.
export function runValidateBstExec(tree: BinaryTree): BinaryTreeValidateBstResult {
  const L = VALIDATE_BST_CODE_LINES
  const steps: BinaryTreeBstExecStep[] = []
  const visitedOrder: string[] = []
  let stopped = false
  let violationNodeId: string | null = null
  let violationNodeLabel: string | null = null

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
      violationNodeId = nodeId
      violationNodeLabel = node?.label ?? null
      stopped = true
      push(L.RETURN_FALSE, nodeId, parentNodeId, minBound, maxBound, frame(), { violated: true })
      return false
    }

    push(L.RANGE_CHECK, nodeId, parentNodeId, minBound, maxBound, frame())

    if (node.value <= minBound || node.value >= maxBound) {
      violationNodeId = node.id
      violationNodeLabel = node.label
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
    violationNodeId,
    violationNodeLabel,
  }
}

export function buildSearchBstCompletionStatus(result: BinaryTreeSearchBstResult): string {
  if (result.found) {
    const label = result.foundNodeLabel ?? '?'
    return `Done. Found target ${result.target} at node ${label}.`
  }
  return `Done. Target ${result.target} is not in the tree.`
}

// Line-by-line BST search from the root: equal → found, smaller → left, larger → right.
// In a strict BST each value appears at most once.
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

export function buildInsertBstCompletionStatus(
  result: BinaryTreeInsertBstResult,
  insertedLabel: string | null,
): string {
  if (!result.didInsert) {
    const label = result.existingNodeLabel ?? '?'
    return `Done. Value ${result.value} already exists at node ${label} — not inserted.`
  }
  const label = insertedLabel ?? '?'
  if (result.parentNodeId === null) {
    return `Done. Inserted ${result.value} as root node ${label}.`
  }
  return `Done. Inserted ${result.value} as node ${label}.`
}

// Line-by-line strict BST insert with tightening (min, max) bounds (same rule as Validate):
// left values must be < node.value; right values must be > node.value; equals are rejected.
// Walks to a null slot inside the open range, then creates the leaf — or stops if the value
// already exists. Does not mutate the tree; playback applies the insert at CREATE_NODE.
export function runInsertBstExec(tree: BinaryTree, value: number): BinaryTreeInsertBstResult {
  const L = INSERT_BST_CODE_LINES
  const steps: BinaryTreeBstExecStep[] = []
  const visitedOrder: string[] = []
  let parentNodeId: string | null = null
  let side: BinaryTreeSide | null = null
  let insertStepIndex = -1
  let rejectStepIndex = -1
  let didInsert = false
  let existingNodeId: string | null = null
  let existingNodeLabel: string | null = null

  const push = (
    codeLine: number,
    nodeId: string | null,
    parentId: string | null,
    minBound: number,
    maxBound: number,
    opts?: { markVisited?: boolean; inserted?: boolean; rejected?: boolean },
  ) => {
    if (opts?.markVisited && nodeId && !visitedOrder.includes(nodeId)) {
      visitedOrder.push(nodeId)
    }
    if (opts?.inserted) insertStepIndex = steps.length
    if (opts?.rejected) rejectStepIndex = steps.length
    steps.push({
      order: steps.length + 1,
      codeLine,
      nodeId,
      nodeLabel: nodeId ? (tree.nodesById[nodeId]?.label ?? null) : null,
      parentNodeId: parentId,
      visitedNodeIds: [...visitedOrder],
      minBound,
      maxBound,
      target: value,
      inserted: opts?.inserted,
    })
  }

  function insertBST(
    nodeId: string | null,
    parentId: string | null,
    childSide: BinaryTreeSide | null,
    minBound: number,
    maxBound: number,
  ): void {
    push(L.ENTER, nodeId, parentId, minBound, maxBound)
    push(L.NULL_CHECK, nodeId, parentId, minBound, maxBound)

    if (!nodeId) {
      parentNodeId = parentId
      side = childSide
      didInsert = true
      push(L.CREATE_NODE, null, parentId, minBound, maxBound, { inserted: true })
      return
    }

    const node = tree.nodesById[nodeId]
    if (!node || typeof node.value !== 'number') {
      // Gated before run; treat as insert-at-this-slot if it still happens.
      parentNodeId = parentId
      side = childSide
      didInsert = true
      push(L.CREATE_NODE, null, parentId, minBound, maxBound, { inserted: true })
      return
    }

    // Duplicate → stop without inserting (strict BST: values are unique).
    push(L.EQUAL_CHECK, nodeId, parentId, minBound, maxBound, { markVisited: true })
    if (value === node.value) {
      existingNodeId = nodeId
      existingNodeLabel = node.label
      push(L.RETURN_EXISTING, nodeId, parentId, minBound, maxBound, { rejected: true })
      return
    }

    // Smaller → left (max tightens to node.value); larger → right (min tightens to node.value).
    push(L.COMPARE, nodeId, parentId, minBound, maxBound)
    if (value < node.value) {
      push(L.ASSIGN_LEFT, nodeId, parentId, minBound, maxBound)
      insertBST(node.leftId, nodeId, 'left', minBound, node.value)
    } else {
      push(L.ELSE, nodeId, parentId, minBound, maxBound)
      push(L.ASSIGN_RIGHT, nodeId, parentId, minBound, maxBound)
      insertBST(node.rightId, nodeId, 'right', node.value, maxBound)
    }
    push(L.RETURN, nodeId, parentId, minBound, maxBound)
  }

  insertBST(tree.rootId, null, null, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)

  return {
    kind: 'insert',
    steps,
    value,
    didInsert,
    parentNodeId,
    side,
    insertStepIndex,
    rejectStepIndex,
    existingNodeId,
    existingNodeLabel,
  }
}

// Adds a valued leaf at the BST insert location and relabels A, B, C, …
export function applyBstInsert(tree: BinaryTree, spec: ApplyBstInsertSpec): BinaryTree {
  const newNode: BinaryTreeNode = {
    id: spec.newId,
    label: '',
    value: spec.value,
    leftId: null,
    rightId: null,
  }

  if (spec.parentNodeId === null) {
    if (tree.rootId) return tree
    return relabelBinaryTree({
      rootId: spec.newId,
      nodesById: { ...tree.nodesById, [spec.newId]: newNode },
    })
  }

  const parent = tree.nodesById[spec.parentNodeId]
  if (!parent || spec.side === null) return tree
  if (spec.side === 'left' ? parent.leftId : parent.rightId) return tree

  const updatedParent =
    spec.side === 'left'
      ? { ...parent, leftId: spec.newId }
      : { ...parent, rightId: spec.newId }

  return relabelBinaryTree({
    rootId: tree.rootId,
    nodesById: {
      ...tree.nodesById,
      [spec.parentNodeId]: updatedParent,
      [spec.newId]: newNode,
    },
  })
}

// Removes a leaf inserted by BST insert (used when stepping back past CREATE_NODE).
export function removeBstInsertedNode(tree: BinaryTree, nodeId: string): BinaryTree {
  if (!tree.nodesById[nodeId]) return tree

  const nodesById = { ...tree.nodesById }
  delete nodesById[nodeId]

  const rootId = tree.rootId === nodeId ? null : tree.rootId
  const parentId = findParentId(tree, nodeId)
  if (parentId && nodesById[parentId]) {
    const childSide = findChildSide(tree, parentId, nodeId)
    if (childSide === 'left') {
      nodesById[parentId] = { ...nodesById[parentId], leftId: null }
    } else if (childSide === 'right') {
      nodesById[parentId] = { ...nodesById[parentId], rightId: null }
    }
  }

  return relabelBinaryTree({ rootId, nodesById })
}

// True when BST algorithms can safely run (every node has a number).
export function canRunValidateBst(tree: BinaryTree): boolean {
  return treeHasAllNumericValues(tree)
}

// Insert may start from an empty tree; otherwise every existing node must be numeric.
export function canRunInsertBst(tree: BinaryTree): boolean {
  const nodes = Object.values(tree.nodesById)
  if (nodes.length === 0) return true
  return treeHasAllNumericValues(tree)
}

// Delete needs a numeric tree (empty tree is allowed — the walk returns null immediately).
export function canRunDeleteBst(tree: BinaryTree): boolean {
  const nodes = Object.values(tree.nodesById)
  if (nodes.length === 0) return true
  return treeHasAllNumericValues(tree)
}

export function cloneBinaryTree(tree: BinaryTree): BinaryTree {
  const nodesById: BinaryTree['nodesById'] = {}
  for (const [id, node] of Object.entries(tree.nodesById)) {
    nodesById[id] = { ...node }
  }
  return { rootId: tree.rootId, nodesById }
}

export function applyBstDeleteMutation(
  tree: BinaryTree,
  mutation: BinaryTreeDeleteMutation | BinaryTreeDeleteMutationInput,
): BinaryTree {
  if (mutation.kind === 'setValue') {
    const node = tree.nodesById[mutation.nodeId]
    if (!node) return tree
    return {
      rootId: tree.rootId,
      nodesById: {
        ...tree.nodesById,
        [mutation.nodeId]: { ...node, value: mutation.value },
      },
    }
  }

  const { nodeId, replacementId } = mutation
  if (!tree.nodesById[nodeId]) return tree

  const nodesById = { ...tree.nodesById }
  const parentId = findParentId(tree, nodeId)
  if (parentId && nodesById[parentId]) {
    const side = findChildSide(tree, parentId, nodeId)
    if (side === 'left') {
      nodesById[parentId] = { ...nodesById[parentId], leftId: replacementId }
    } else if (side === 'right') {
      nodesById[parentId] = { ...nodesById[parentId], rightId: replacementId }
    }
  }

  delete nodesById[nodeId]
  const rootId = tree.rootId === nodeId ? replacementId : tree.rootId
  return relabelBinaryTree({ rootId, nodesById })
}

// Rebuilds the tree as it should look after all mutations with stepIndex ≤ upToStepIndex.
export function treeAfterDeleteMutations(
  baseTree: BinaryTree,
  mutations: BinaryTreeDeleteMutation[],
  upToStepIndex: number,
): BinaryTree {
  let tree = cloneBinaryTree(baseTree)
  for (const mutation of mutations) {
    if (mutation.stepIndex > upToStepIndex) break
    tree = applyBstDeleteMutation(tree, mutation)
  }
  return tree
}

export function buildDeleteBstCompletionStatus(result: BinaryTreeDeleteBstResult): string {
  if (!result.found) {
    return `Done. Key ${result.key} is not in the tree.`
  }
  const label = result.targetNodeLabel ?? '?'
  return `Done. Deleted key ${result.key} (was node ${label}).`
}

// Line-by-line strict BST delete (inorder successor for the two-child case).
// Mutations are recorded per step so playback can show value-copy then splice-out.
export function runDeleteBstExec(tree: BinaryTree, key: number): BinaryTreeDeleteBstResult {
  const L = DELETE_BST_CODE_LINES
  const baseTree = cloneBinaryTree(tree)
  let working = cloneBinaryTree(tree)
  const steps: BinaryTreeBstExecStep[] = []
  const mutations: BinaryTreeDeleteMutation[] = []
  const visitedOrder: string[] = []
  let found = false
  let targetNodeId: string | null = null
  let targetNodeLabel: string | null = null

  const push = (
    codeLine: number,
    nodeId: string | null,
    parentNodeId: string | null,
    searchKey: number,
    opts?: {
      markVisited?: boolean
      matched?: boolean
      copied?: boolean
      removed?: boolean
      succLabel?: string | null
    },
  ) => {
    if (opts?.markVisited && nodeId && !visitedOrder.includes(nodeId)) {
      visitedOrder.push(nodeId)
    }
    steps.push({
      order: steps.length + 1,
      codeLine,
      nodeId,
      nodeLabel: nodeId ? (working.nodesById[nodeId]?.label ?? null) : null,
      parentNodeId,
      visitedNodeIds: [...visitedOrder],
      target: searchKey,
      matched: opts?.matched,
      copied: opts?.copied,
      removed: opts?.removed,
      succLabel: opts?.succLabel,
    })
  }

  const recordMutation = (mutation: BinaryTreeDeleteMutationInput) => {
    mutations.push({ ...mutation, stepIndex: steps.length - 1 })
    working = applyBstDeleteMutation(working, mutation)
  }

  // Returns the replacement subtree root id (possibly null).
  function deleteBST(
    nodeId: string | null,
    parentNodeId: string | null,
    searchKey: number,
  ): string | null {
    push(L.ENTER, nodeId, parentNodeId, searchKey)
    push(L.NULL_RETURN, nodeId, parentNodeId, searchKey)

    if (!nodeId) return null

    const node = working.nodesById[nodeId]
    if (!node || typeof node.value !== 'number') return null

    push(L.CMP_LEFT, nodeId, parentNodeId, searchKey, { markVisited: true })
    if (searchKey < node.value) {
      push(L.ASSIGN_LEFT, nodeId, parentNodeId, searchKey)
      deleteBST(node.leftId, nodeId, searchKey)
      push(L.RETURN, nodeId, parentNodeId, searchKey)
      return nodeId
    }

    push(L.CMP_RIGHT, nodeId, parentNodeId, searchKey)
    if (searchKey > node.value) {
      push(L.ASSIGN_RIGHT, nodeId, parentNodeId, searchKey)
      deleteBST(node.rightId, nodeId, searchKey)
      push(L.RETURN, nodeId, parentNodeId, searchKey)
      return nodeId
    }

    // searchKey === node.value
    if (!found) {
      found = true
      targetNodeId = nodeId
      targetNodeLabel = node.label
    }

    const leftId = node.leftId
    const rightId = node.rightId

    if (!leftId) {
      push(L.NO_LEFT, nodeId, parentNodeId, searchKey, { matched: true, removed: true })
      recordMutation({ kind: 'spliceOut', nodeId, replacementId: rightId })
      return rightId
    }

    push(L.NO_LEFT, nodeId, parentNodeId, searchKey, { matched: true })
    if (!rightId) {
      push(L.NO_RIGHT, nodeId, parentNodeId, searchKey, { matched: true, removed: true })
      recordMutation({ kind: 'spliceOut', nodeId, replacementId: leftId })
      return leftId
    }

    push(L.NO_RIGHT, nodeId, parentNodeId, searchKey, { matched: true })
    push(L.ELSE, nodeId, parentNodeId, searchKey, { matched: true })
    push(L.SUCC_INIT, rightId, nodeId, searchKey, {
      succLabel: working.nodesById[rightId]?.label ?? null,
    })

    let succId = rightId
    while (true) {
      const succ = working.nodesById[succId]
      push(L.SUCC_WALK, succId, nodeId, searchKey, {
        markVisited: true,
        succLabel: succ?.label ?? null,
      })
      if (!succ?.leftId) break
      succId = succ.leftId
    }

    const succNode = working.nodesById[succId]
    const succValue = typeof succNode?.value === 'number' ? succNode.value : searchKey
    push(L.COPY_VALUE, nodeId, parentNodeId, searchKey, {
      copied: true,
      matched: true,
      succLabel: succNode?.label ?? null,
    })
    recordMutation({ kind: 'setValue', nodeId, value: succValue })

    const currentRightId = working.nodesById[nodeId]?.rightId ?? rightId
    push(L.DELETE_SUCC, nodeId, parentNodeId, searchKey, {
      succLabel: succNode?.label ?? null,
    })
    deleteBST(currentRightId, nodeId, succValue)
    push(L.RETURN, nodeId, parentNodeId, searchKey)
    return nodeId
  }

  deleteBST(working.rootId, null, key)

  return {
    kind: 'delete',
    steps,
    key,
    found,
    targetNodeId,
    targetNodeLabel,
    mutations,
    baseTree,
    finalTree: cloneBinaryTree(working),
  }
}

