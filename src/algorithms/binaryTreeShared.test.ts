import { describe, it, expect } from 'vitest'

import type { BinaryTree } from '../types'
import {
  collectSubtreeIds,
  findParentId,
  findChildSide,
  getNodeCount,
  getTreeHeight,
} from './binaryTreeShared'

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
