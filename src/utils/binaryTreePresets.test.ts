import { describe, it, expect } from 'vitest'

import { runValidateBstExec } from '../algorithms/binaryTreeBst'
import { getNodeCount, getTreeHeight } from '../algorithms/binaryTreeShared'

import { BINARY_TREE_PRESETS, buildBinaryTreePreset } from './binaryTreePresets'

describe('BINARY_TREE_PRESETS', () => {
  it('lists five presets in BT then BST order with the expected names', () => {
    expect(BINARY_TREE_PRESETS.map((preset) => preset.name)).toEqual([
      'Binary Tree 1',
      'Binary Tree 2',
      'Binary Tree 3',
      'Binary Search Tree 1',
      'Binary Search Tree 2',
    ])
  })

  it('grows BT presets by node count, then BST presets by node count', () => {
    const counts = BINARY_TREE_PRESETS.map((preset) => buildBinaryTreePreset(preset).tree).map(getNodeCount)
    expect(counts[0]).toBeLessThan(counts[1])
    expect(counts[1]).toBeLessThan(counts[2])
    expect(counts[3]).toBeLessThan(counts[4])
  })

  it('builds contiguous A… labels and a usable nextId', () => {
    const { tree, nextId } = buildBinaryTreePreset(BINARY_TREE_PRESETS[0])
    const labels = Object.values(tree.nodesById).map((node) => node.label).sort()
    expect(labels).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
    expect(nextId).toBe(8)
    expect(tree.rootId).toBe('bt-1')
  })

  it('keeps BT1 and BST1 evenly split under the root', () => {
    const subtreeCount = (
      tree: ReturnType<typeof buildBinaryTreePreset>['tree'],
      rootId: string | null,
    ): number => {
      if (!rootId) return 0
      const node = tree.nodesById[rootId]
      if (!node) return 0
      return 1 + subtreeCount(tree, node.leftId) + subtreeCount(tree, node.rightId)
    }

    for (const id of ['bt-1', 'bst-1'] as const) {
      const preset = BINARY_TREE_PRESETS.find((entry) => entry.id === id)!
      const { tree } = buildBinaryTreePreset(preset)
      const root = tree.nodesById[tree.rootId!]
      expect(subtreeCount(tree, root.leftId)).toBe(subtreeCount(tree, root.rightId))
    }
  })

  it('keeps BST presets valid and plain BT presets free to break the search property', () => {
    for (const preset of BINARY_TREE_PRESETS) {
      const { tree } = buildBinaryTreePreset(preset)
      const result = runValidateBstExec(tree)
      if (preset.id.startsWith('bst-')) {
        expect(result.isValid).toBe(true)
      }
    }

    // At least one plain BT should fail validate (otherwise the set is too neat).
    const btResults = BINARY_TREE_PRESETS
      .filter((preset) => preset.id.startsWith('bt-'))
      .map((preset) => runValidateBstExec(buildBinaryTreePreset(preset).tree).isValid)
    expect(btResults.some((ok) => !ok)).toBe(true)
  })

  it('includes negatives on some presets but not all', () => {
    const hasNeg = BINARY_TREE_PRESETS.map((preset) =>
      preset.nodes.some((node) => node.value < 0),
    )
    expect(hasNeg.some(Boolean)).toBe(true)
    expect(hasNeg.some((v) => !v)).toBe(true)
  })

  it('produces uneven heights on some presets (not all perfect/full shapes)', () => {
    const heights = BINARY_TREE_PRESETS.map((preset) => getTreeHeight(buildBinaryTreePreset(preset).tree))
    // Every preset should have height ≥ 2; at least one should be taller than its "balanced" sibling band.
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(2)
    expect(new Set(heights).size).toBeGreaterThan(1)
  })
})
