import type { BinaryTree, BinaryTreePreset } from '../types'

import { relabelBinaryTree } from './format'

// Five canvas presets: BT 1–3 (plain binary trees, growing size) then BST 1–2 (valid search
// trees). BT1 / BST1 are intentionally even under the root; later presets stay messy —
// uneven sides, missing children, mixed signs — so they look hand-built.

export const BINARY_TREE_PRESETS: BinaryTreePreset[] = [
  // BT 1 — small standard (~7), equal sides under root (3 + 3), all positive, not a BST.
  //         5
  //       /   \
  //      9     2
  //     / \   / \
  //    1   7 4   0
  {
    id: 'bt-1',
    name: 'Binary Tree 1',
    nodes: [
      { value: 5, left: 1, right: 2 },
      { value: 9, left: 3, right: 4 },
      { value: 2, left: 5, right: 6 },
      { value: 1, left: null, right: null },
      { value: 7, left: null, right: null },
      { value: 4, left: null, right: null },
      { value: 0, left: null, right: null },
    ],
  },

  // BT 2 — medium (~13), uneven depth, includes negatives.
  //              3
  //            /   \
  //          -4     8
  //          / \      \
  //        12  -1      0
  //        /     \    / \
  //       5       7  6  -9
  //              / \      \
  //            11   2      4
  //                 \
  //                 -2
  {
    id: 'bt-2',
    name: 'Binary Tree 2',
    nodes: [
      { value: 3, left: 1, right: 2 },
      { value: -4, left: 3, right: 4 },
      { value: 8, left: null, right: 5 },
      { value: 12, left: 6, right: null },
      { value: -1, left: null, right: 7 },
      { value: 0, left: 8, right: 9 },
      { value: 5, left: null, right: null },
      { value: 7, left: 10, right: 11 },
      { value: 6, left: null, right: null },
      { value: -9, left: null, right: 12 },
      { value: 11, left: null, right: null },
      { value: 2, left: null, right: 13 },
      { value: 4, left: null, right: null },
      { value: -2, left: null, right: null },
    ],
  },

  // BT 3 — large (~17), left-deep mess, mixed signs, not a BST.
  //                 7
  //              /     \
  //            15       -3
  //           /  \      /  \
  //         -6    2    11   4
  //         / \    \        / \
  //        9   1    0      8  -2
  //       /       / \          \
  //     14       5  -8          6
  //                              \
  //                              10
  {
    id: 'bt-3',
    name: 'Binary Tree 3',
    nodes: [
      { value: 7, left: 1, right: 2 },
      { value: 15, left: 3, right: 4 },
      { value: -3, left: 5, right: 6 },
      { value: -6, left: 7, right: 8 },
      { value: 2, left: null, right: 9 },
      { value: 11, left: null, right: null },
      { value: 4, left: 10, right: 11 },
      { value: 9, left: 12, right: null },
      { value: 1, left: null, right: null },
      { value: 0, left: 13, right: 14 },
      { value: 8, left: null, right: null },
      { value: -2, left: null, right: 15 },
      { value: 14, left: null, right: null },
      { value: 5, left: null, right: null },
      { value: -8, left: null, right: null },
      { value: 6, left: null, right: 16 },
      { value: 10, left: null, right: null },
    ],
  },

  // BST 1 — small standard valid search tree (~9), equal sides under root (4 + 4), positives.
  //           8
  //         /   \
  //        3     12
  //       / \    / \
  //      1   5  10  15
  //         /     /
  //        4     14
  {
    id: 'bst-1',
    name: 'Binary Search Tree 1',
    nodes: [
      { value: 8, left: 1, right: 2 },
      { value: 3, left: 3, right: 4 },
      { value: 12, left: 5, right: 6 },
      { value: 1, left: null, right: null },
      { value: 5, left: 7, right: null },
      { value: 10, left: null, right: null },
      { value: 15, left: 8, right: null },
      { value: 4, left: null, right: null },
      { value: 14, left: null, right: null },
    ],
  },

  // BST 2 — large valid search tree (~20), left-heavier, includes negatives.
  //                  10
  //              /        \
  //            -2          25
  //           /  \        /   \
  //        -10    4     18     40
  //        /  \  / \   /  \    / \
  //      -15 -5 1  7 14  20  30  50
  //         /     /      \        \
  //       -7     5       16       55
  //               \
  //                6
  {
    id: 'bst-2',
    name: 'Binary Search Tree 2',
    nodes: [
      { value: 10, left: 1, right: 2 },
      { value: -2, left: 3, right: 4 },
      { value: 25, left: 5, right: 6 },
      { value: -10, left: 7, right: 8 },
      { value: 4, left: 9, right: 10 },
      { value: 18, left: 11, right: 12 },
      { value: 40, left: 13, right: 14 },
      { value: -15, left: null, right: null },
      { value: -5, left: 15, right: null },
      { value: 1, left: null, right: null },
      { value: 7, left: 16, right: null },
      { value: 14, left: null, right: 17 },
      { value: 20, left: null, right: null },
      { value: 30, left: null, right: null },
      { value: 50, left: null, right: 18 },
      { value: -7, left: null, right: null },
      { value: 5, left: null, right: 19 },
      { value: 16, left: null, right: null },
      { value: 55, left: null, right: null },
      { value: 6, left: null, right: null },
    ],
  },
]

export type BuildBinaryTreePresetResult = {
  tree: BinaryTree
  nextId: number
}

// Builds a labeled BinaryTree from a preset spec. Node ids are bt-1, bt-2, … in array order.
export function buildBinaryTreePreset(preset: BinaryTreePreset): BuildBinaryTreePresetResult {
  const nodesById: BinaryTree['nodesById'] = {}

  preset.nodes.forEach((spec, index) => {
    const id = `bt-${index + 1}`
    nodesById[id] = {
      id,
      label: '',
      value: spec.value,
      leftId: spec.left === null ? null : `bt-${spec.left + 1}`,
      rightId: spec.right === null ? null : `bt-${spec.right + 1}`,
    }
  })

  const tree = relabelBinaryTree({
    rootId: preset.nodes.length > 0 ? 'bt-1' : null,
    nodesById,
  })

  return { tree, nextId: preset.nodes.length + 1 }
}
