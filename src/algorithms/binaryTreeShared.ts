import type { BinaryTree, BinaryTreeSide } from '../types'

// Depth-first walk collecting a node and every node in its subtree (used to cascade-delete).
export function collectSubtreeIds(tree: BinaryTree, nodeId: string): string[] {
  const result: string[] = []
  const stack = [nodeId]

  while (stack.length > 0) {
    const id = stack.pop()!
    const node = tree.nodesById[id]
    if (!node) continue
    result.push(id)
    if (node.leftId) stack.push(node.leftId)
    if (node.rightId) stack.push(node.rightId)
  }

  return result
}

// Finds the id of nodeId's parent by scanning every node's children (no parent pointer is stored,
// matching the plain {value, left, right} node shape). Returns null for the root or an unknown id.
export function findParentId(tree: BinaryTree, nodeId: string): string | null {
  for (const node of Object.values(tree.nodesById)) {
    if (node.leftId === nodeId || node.rightId === nodeId) return node.id
  }
  return null
}

// Finds which side (left/right) childId hangs off of its parent. Null if parentId has no such child.
export function findChildSide(tree: BinaryTree, parentId: string, childId: string): BinaryTreeSide | null {
  const parent = tree.nodesById[parentId]
  if (!parent) return null
  if (parent.leftId === childId) return 'left'
  if (parent.rightId === childId) return 'right'
  return null
}

export function getNodeCount(tree: BinaryTree): number {
  return Object.keys(tree.nodesById).length
}

// Height in levels: an empty tree is 0, a single root is 1.
export function getTreeHeight(tree: BinaryTree): number {
  const walk = (id: string | null): number => {
    if (!id) return 0
    const node = tree.nodesById[id]
    if (!node) return 0
    return 1 + Math.max(walk(node.leftId), walk(node.rightId))
  }
  return walk(tree.rootId)
}

// True when the tree has at least one node and every node has a numeric value.
export function treeHasAllNumericValues(tree: BinaryTree): boolean {
  const nodes = Object.values(tree.nodesById)
  return nodes.length > 0 && nodes.every((node) => typeof node.value === 'number')
}

// Collects node ids in inorder (left, node, right).
function collectInorderIds(tree: BinaryTree, nodeId: string | null, out: string[]): void {
  if (!nodeId) return
  const node = tree.nodesById[nodeId]
  if (!node) return
  collectInorderIds(tree, node.leftId, out)
  out.push(nodeId)
  collectInorderIds(tree, node.rightId, out)
}

// Shape-preserving BT → BST: keep structure/labels, reassign values so inorder is sorted.
// No-ops (returns the same tree) when empty or any node value is empty.
export function convertBinaryTreeToBst(tree: BinaryTree): BinaryTree {
  if (!treeHasAllNumericValues(tree) || !tree.rootId) return tree

  const inorderIds: string[] = []
  collectInorderIds(tree, tree.rootId, inorderIds)

  const sortedValues = inorderIds
    .map((id) => tree.nodesById[id].value as number)
    .sort((a, b) => a - b)

  const nodesById = { ...tree.nodesById }
  inorderIds.forEach((id, index) => {
    nodesById[id] = { ...nodesById[id], value: sortedValues[index] }
  })

  return { rootId: tree.rootId, nodesById }
}
