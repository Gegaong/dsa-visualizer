import { describe, it, expect } from 'vitest'

import type { BinaryTree } from '../types'
import {
  collectSubtreeIds,
  findParentId,
  buildParentIdMap,
  findChildSide,
  getNodeCount,
  getTreeHeight,
  treeHasAllNumericValues,
  treeHasDuplicateNumericValues,
  convertBinaryTreeToBst,
} from './binaryTreeShared'
import { runValidateBstExec } from './binaryTreeBst'

// Builds a tree from a terse spec: id -> [leftId | null, rightId | null]. rootId defaults to 'A'.
function makeTree(spec: Record<string, [string | null, string | null]>, rootId: string | null = 'A'): BinaryTree {
  const nodesById: BinaryTree['nodesById'] = {}
  for (const [id, [leftId, rightId]] of Object.entries(spec)) {
    nodesById[id] = { id, label: id, value: 'empty', leftId, rightId }
  }
  return { rootId, nodesById }
}

const EMPTY_TREE: BinaryTree = { rootId: null, nodesById: {} }

describe('collectSubtreeIds', () => {
  it('returns an empty array for an unknown id', () => {
    expect(collectSubtreeIds(EMPTY_TREE, 'A')).toEqual([])
  })

  it('returns just the node itself for a leaf', () => {
    const tree = makeTree({ A: [null, null] })
    expect(collectSubtreeIds(tree, 'A')).toEqual(['A'])
  })

  it('collects every descendant of a node, not siblings above it', () => {
    //         A
    //        / \
    //       B   C
    //      / \
    //     D   E
    const tree = makeTree({
      A: ['B', 'C'],
      B: ['D', 'E'],
      C: [null, null],
      D: [null, null],
      E: [null, null],
    })
    expect(new Set(collectSubtreeIds(tree, 'B'))).toEqual(new Set(['B', 'D', 'E']))
    expect(collectSubtreeIds(tree, 'C')).toEqual(['C'])
    expect(new Set(collectSubtreeIds(tree, 'A'))).toEqual(new Set(['A', 'B', 'C', 'D', 'E']))
  })

  it('handles a one-sided chain (only left children)', () => {
    const tree = makeTree({
      A: ['B', null],
      B: ['C', null],
      C: [null, null],
    })
    expect(collectSubtreeIds(tree, 'A')).toEqual(['A', 'B', 'C'])
  })
})

describe('findParentId', () => {
  it('returns null for the root', () => {
    const tree = makeTree({ A: [null, null] })
    expect(findParentId(tree, 'A')).toBeNull()
  })

  it('returns null for an unknown id', () => {
    const tree = makeTree({ A: [null, null] })
    expect(findParentId(tree, 'Z')).toBeNull()
  })

  it('finds the direct parent regardless of which side the child is on', () => {
    const tree = makeTree({
      A: ['B', 'C'],
      B: [null, null],
      C: [null, null],
    })
    expect(findParentId(tree, 'B')).toBe('A')
    expect(findParentId(tree, 'C')).toBe('A')
  })
})

describe('buildParentIdMap', () => {
  it('is empty for an empty tree or a lone root', () => {
    expect(buildParentIdMap(EMPTY_TREE).size).toBe(0)
    expect(buildParentIdMap(makeTree({ A: [null, null] })).size).toBe(0)
  })

  it('maps every child id to its direct parent, agreeing with findParentId', () => {
    const tree = makeTree({
      A: ['B', 'C'],
      B: ['D', 'E'],
      C: [null, null],
      D: [null, null],
      E: [null, null],
    })
    const map = buildParentIdMap(tree)
    for (const id of ['B', 'C', 'D', 'E']) {
      expect(map.get(id)).toBe(findParentId(tree, id))
    }
    expect(map.has('A')).toBe(false)
  })
})

describe('findChildSide', () => {
  it('identifies left vs right correctly', () => {
    const tree = makeTree({
      A: ['B', 'C'],
      B: [null, null],
      C: [null, null],
    })
    expect(findChildSide(tree, 'A', 'B')).toBe('left')
    expect(findChildSide(tree, 'A', 'C')).toBe('right')
  })

  it('returns null when the pair is not actually a parent/child', () => {
    const tree = makeTree({
      A: ['B', null],
      B: [null, null],
    })
    expect(findChildSide(tree, 'A', 'Z')).toBeNull()
    expect(findChildSide(tree, 'Z', 'B')).toBeNull()
  })
})

describe('getNodeCount', () => {
  it('is 0 for an empty tree', () => {
    expect(getNodeCount(EMPTY_TREE)).toBe(0)
  })

  it('counts every node regardless of shape', () => {
    const tree = makeTree({
      A: ['B', 'C'],
      B: [null, null],
      C: [null, null],
    })
    expect(getNodeCount(tree)).toBe(3)
  })
})

describe('getTreeHeight', () => {
  it('is 0 for an empty tree', () => {
    expect(getTreeHeight(EMPTY_TREE)).toBe(0)
  })

  it('is 1 for a lone root', () => {
    const tree = makeTree({ A: [null, null] })
    expect(getTreeHeight(tree)).toBe(1)
  })

  it('takes the deeper side when the tree is unbalanced', () => {
    //     A
    //    / \
    //   B   C
    //  /
    // D
    // \
    //  E
    const tree = makeTree({
      A: ['B', 'C'],
      B: ['D', null],
      C: [null, null],
      D: [null, 'E'],
      E: [null, null],
    })
    expect(getTreeHeight(tree)).toBe(4)
  })
})

describe('treeHasAllNumericValues', () => {
  it('is false for an empty tree', () => {
    expect(treeHasAllNumericValues(EMPTY_TREE)).toBe(false)
  })

  it('is false when any node is empty', () => {
    const tree = makeTree({ A: ['B', null], B: [null, null] })
    tree.nodesById.A = { ...tree.nodesById.A, value: 1 }
    expect(treeHasAllNumericValues(tree)).toBe(false)
  })

  it('is true when every node has a number', () => {
    const tree = makeTree({ A: ['B', null], B: [null, null] })
    tree.nodesById.A = { ...tree.nodesById.A, value: 1 }
    tree.nodesById.B = { ...tree.nodesById.B, value: 2 }
    expect(treeHasAllNumericValues(tree)).toBe(true)
  })
})

describe('treeHasDuplicateNumericValues', () => {
  it('is false when all numeric values are unique', () => {
    const tree = makeTree({ A: ['B', null], B: [null, null] })
    tree.nodesById.A = { ...tree.nodesById.A, value: 1 }
    tree.nodesById.B = { ...tree.nodesById.B, value: 2 }
    expect(treeHasDuplicateNumericValues(tree)).toBe(false)
  })

  it('is true when two nodes share the same number', () => {
    const tree = makeTree({ A: ['B', null], B: [null, null] })
    tree.nodesById.A = { ...tree.nodesById.A, value: 2 }
    tree.nodesById.B = { ...tree.nodesById.B, value: 2 }
    expect(treeHasDuplicateNumericValues(tree)).toBe(true)
  })
})

describe('convertBinaryTreeToBst', () => {
  it('returns the same tree when values are missing', () => {
    const tree = makeTree({ A: [null, null] })
    expect(convertBinaryTreeToBst(tree)).toBe(tree)
  })

  it('drops duplicate values and rebuilds a valid strict BST', () => {
    //     A(2)
    //    / \
    //  B(2) C(5)   unique → [2, 5]
    const tree = makeTree({
      A: ['B', 'C'],
      B: [null, null],
      C: [null, null],
    })
    tree.nodesById.A = { ...tree.nodesById.A, value: 2 }
    tree.nodesById.B = { ...tree.nodesById.B, value: 2 }
    tree.nodesById.C = { ...tree.nodesById.C, value: 5 }

    const result = convertBinaryTreeToBst(tree)
    const values = Object.values(result.nodesById).map((node) => node.value)
    expect(values).toEqual(expect.arrayContaining([2, 5]))
    expect(values).toHaveLength(2)
    expect(new Set(values).size).toBe(2)
    expect(getNodeCount(result)).toBe(2)
    expect(runValidateBstExec(result).isValid).toBe(true)
  })

  it('keeps structure and labels, sorts values into inorder order', () => {
    //     A(3)
    //    / \
    //  B(1) C(2)   inorder B,A,C → values 1,3,2 → sorted 1,2,3
    const tree = makeTree({
      A: ['B', 'C'],
      B: [null, null],
      C: [null, null],
    })
    tree.nodesById.A = { ...tree.nodesById.A, value: 3 }
    tree.nodesById.B = { ...tree.nodesById.B, value: 1 }
    tree.nodesById.C = { ...tree.nodesById.C, value: 2 }

    const result = convertBinaryTreeToBst(tree)
    expect(result.rootId).toBe('A')
    expect(result.nodesById.A.leftId).toBe('B')
    expect(result.nodesById.A.rightId).toBe('C')
    expect(result.nodesById.A.label).toBe('A')
    expect(result.nodesById.B.value).toBe(1)
    expect(result.nodesById.A.value).toBe(2)
    expect(result.nodesById.C.value).toBe(3)
  })
})
