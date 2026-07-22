import { describe, it, expect } from 'vitest'

import type { BinaryTree } from '../types'

import {
  buildBinaryTreeTraversalCompletionStatus,
  prepareBinaryTreeTraversalRunInputs,
  runBinaryTreeInorderExec,
  runBinaryTreeInorderSearch,
  runBinaryTreeLevelOrderExec,
  runBinaryTreeLevelOrderSearch,
  runBinaryTreePostorderExec,
  runBinaryTreePostorderSearch,
  runBinaryTreePreorderExec,
  runBinaryTreePreorderSearch,
} from './binaryTreeTraversal'
import { makeTree } from './__testutils__/fixtures'

const EMPTY_TREE: BinaryTree = { rootId: null, nodesById: {} }

//        A
//       / \
//      B   C
//     / \   \
//    D   E   F
const SAMPLE_TREE = makeTree({
  A: ['B', 'C', 1],
  B: ['D', 'E', 2],
  C: [null, 'F', 3],
  D: [null, null, 4],
  E: [null, null, 5],
  F: [null, null, 6],
})

describe('runBinaryTreePreorderSearch', () => {
  it('visits every node in root, left, right order when nothing is found', () => {
    const result = runBinaryTreePreorderSearch(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'Z' })
    expect(result.steps.map((step) => step.nodeLabel)).toEqual(['A', 'B', 'D', 'E', 'C', 'F'])
    expect(result.foundNodeId).toBeNull()
    expect(result.foundNodeLabel).toBeNull()
  })

  it('reports fromNodeId as the parent for every step except the root', () => {
    const result = runBinaryTreePreorderSearch(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'Z' })
    const parentByLabel = Object.fromEntries(result.steps.map((step) => [step.nodeLabel, step.fromNodeId]))
    expect(parentByLabel['A']).toBeNull()
    expect(parentByLabel['B']).toBe('A')
    expect(parentByLabel['D']).toBe('B')
    expect(parentByLabel['C']).toBe('A')
    expect(parentByLabel['F']).toBe('C')
  })

  it('stops recursing the instant a target-node match is visited, before later nodes', () => {
    const result = runBinaryTreePreorderSearch(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'B' })
    expect(result.steps.map((step) => step.nodeLabel)).toEqual(['A', 'B'])
    expect(result.foundNodeId).toBe('B')
    expect(result.foundNodeLabel).toBe('B')
  })

  it('never reports a frontier — recursion has no explicit queue or stack to expose', () => {
    const result = runBinaryTreePreorderSearch(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'Z' })
    expect(result.steps.every((step) => step.frontierNodeIds.length === 0)).toBe(true)
  })

  it('finds a target-value match anywhere in preorder order', () => {
    const result = runBinaryTreePreorderSearch(SAMPLE_TREE, { type: 'target-value', targetValue: 5 })
    expect(result.foundNodeLabel).toBe('E')
    expect(result.steps.map((step) => step.nodeLabel)).toEqual(['A', 'B', 'D', 'E'])
  })

  it('walks the entire tree for a max-value goal and reports the running best', () => {
    const result = runBinaryTreePreorderSearch(SAMPLE_TREE, { type: 'max-value' })
    expect(result.steps.map((step) => step.nodeLabel)).toEqual(['A', 'B', 'D', 'E', 'C', 'F'])
    expect(result.foundValue).toBe(6)
    expect(result.foundNodeIds).toEqual([])
    expect(result.steps.map((step) => step.runningBest)).toEqual([1, 2, 4, 5, 5, 6])
  })

  it('walks the entire tree for a min-value goal', () => {
    const result = runBinaryTreePreorderSearch(SAMPLE_TREE, { type: 'min-value' })
    expect(result.foundValue).toBe(1)
    expect(result.foundNodeIds).toEqual([])
  })
})

describe('runBinaryTreeInorderSearch', () => {
  it('visits every node in left, root, right order when nothing is found', () => {
    const result = runBinaryTreeInorderSearch(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'Z' })
    expect(result.steps.map((step) => step.nodeLabel)).toEqual(['D', 'B', 'E', 'A', 'C', 'F'])
    expect(result.foundNodeId).toBeNull()
  })

  it('stops when target node is matched in inorder visit order', () => {
    const result = runBinaryTreeInorderSearch(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'E' })
    expect(result.steps.map((step) => step.nodeLabel)).toEqual(['D', 'B', 'E'])
    expect(result.foundNodeLabel).toBe('E')
  })

  it('finds a target-value match in inorder order', () => {
    const result = runBinaryTreeInorderSearch(SAMPLE_TREE, { type: 'target-value', targetValue: 5 })
    expect(result.foundNodeLabel).toBe('E')
    expect(result.steps.map((step) => step.nodeLabel)).toEqual(['D', 'B', 'E'])
  })

  it('tracks running best values for inorder max search', () => {
    const result = runBinaryTreeInorderSearch(SAMPLE_TREE, { type: 'max-value' })
    expect(result.steps.map((step) => step.nodeLabel)).toEqual(['D', 'B', 'E', 'A', 'C', 'F'])
    expect(result.steps.map((step) => step.runningBest)).toEqual([4, 4, 5, 5, 5, 6])
    expect(result.foundValue).toBe(6)
    expect(result.foundNodeIds).toEqual([])
  })

  it('walks the entire tree for a min-value goal', () => {
    const result = runBinaryTreeInorderSearch(SAMPLE_TREE, { type: 'min-value' })
    expect(result.foundValue).toBe(1)
    expect(result.foundNodeIds).toEqual([])
  })
})

describe('runBinaryTreePreorderExec', () => {
  it('emits more steps than node visits because each line of pseudocode is a step', () => {
    const exec = runBinaryTreePreorderExec(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'B' })
    const search = runBinaryTreePreorderSearch(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'B' })
    expect(exec.steps.length).toBeGreaterThan(search.steps.length)
    expect(search.steps.map((step) => step.nodeLabel)).toEqual(['A', 'B'])
  })

  it('highlights the match-return line when the goal is found', () => {
    const exec = runBinaryTreePreorderExec(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'B' })
    const matchStep = exec.steps.find((step) => step.matchedGoal)
    expect(matchStep?.codeLine).toBe(4)
    expect(matchStep?.nodeLabel).toBe('B')
  })

  it('walks null-child calls through the null-check and return-null lines', () => {
    const exec = runBinaryTreePreorderExec(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'Z' })
    expect(exec.steps.some((step) => step.codeLine === 2 && step.nodeId === null)).toBe(true)
  })

  it('snapshots leftResult and rightResult per stack frame for target search', () => {
    const exec = runBinaryTreePreorderExec(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'B' })
    const checkLeftAtA = exec.steps.find((step) => step.codeLine === 6 && step.nodeLabel === 'A')
    expect(checkLeftAtA?.leftResult).toBe('B')
    expect(checkLeftAtA?.rightResult).toBe('—')
    const returnMatchAtB = exec.steps.find((step) => step.matchedGoal)
    expect(returnMatchAtB?.leftResult).toBe('—')
    expect(returnMatchAtB?.rightResult).toBe('—')
  })
})

describe('runBinaryTreeInorderExec', () => {
  it('highlights the match-return line when the goal is found', () => {
    const exec = runBinaryTreeInorderExec(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'E' })
    const matchStep = exec.steps.find((step) => step.matchedGoal)
    expect(matchStep?.codeLine).toBe(7)
    expect(matchStep?.nodeLabel).toBe('E')
  })

  it('snapshots leftResult before checking it', () => {
    const exec = runBinaryTreeInorderExec(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'E' })
    const checkLeftAtA = exec.steps.find((step) => step.codeLine === 4 && step.nodeLabel === 'A')
    expect(checkLeftAtA?.leftResult).toBe('E')
    expect(checkLeftAtA?.rightResult).toBe('—')
  })
})

describe('runBinaryTreePostorderSearch', () => {
  it('visits every node in left, right, root order when nothing is found', () => {
    const result = runBinaryTreePostorderSearch(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'Z' })
    expect(result.steps.map((step) => step.nodeLabel)).toEqual(['D', 'E', 'B', 'F', 'C', 'A'])
    expect(result.foundNodeId).toBeNull()
  })

  it('stops when target node is matched in postorder visit order', () => {
    const result = runBinaryTreePostorderSearch(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'E' })
    expect(result.steps.map((step) => step.nodeLabel)).toEqual(['D', 'E'])
    expect(result.foundNodeLabel).toBe('E')
  })

  it('finds a target-value match in postorder order', () => {
    const result = runBinaryTreePostorderSearch(SAMPLE_TREE, { type: 'target-value', targetValue: 2 })
    expect(result.foundNodeLabel).toBe('B')
    expect(result.steps.map((step) => step.nodeLabel)).toEqual(['D', 'E', 'B'])
  })

  it('tracks running best values for postorder max search', () => {
    const result = runBinaryTreePostorderSearch(SAMPLE_TREE, { type: 'max-value' })
    expect(result.steps.map((step) => step.nodeLabel)).toEqual(['D', 'E', 'B', 'F', 'C', 'A'])
    expect(result.steps.map((step) => step.runningBest)).toEqual([4, 5, 5, 6, 6, 6])
    expect(result.foundValue).toBe(6)
    expect(result.foundNodeIds).toEqual([])
  })

  it('walks the entire tree for a min-value goal', () => {
    const result = runBinaryTreePostorderSearch(SAMPLE_TREE, { type: 'min-value' })
    expect(result.foundValue).toBe(1)
    expect(result.foundNodeIds).toEqual([])
  })
})

describe('runBinaryTreePostorderExec', () => {
  it('highlights the match-return line when the goal is found', () => {
    const exec = runBinaryTreePostorderExec(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'E' })
    const matchStep = exec.steps.find((step) => step.matchedGoal)
    expect(matchStep?.codeLine).toBe(10)
    expect(matchStep?.nodeLabel).toBe('E')
  })

  it('snapshots leftResult and rightResult before checking them', () => {
    const exec = runBinaryTreePostorderExec(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'E' })
    const checkLeftAtB = exec.steps.find((step) => step.codeLine === 4 && step.nodeLabel === 'B')
    expect(checkLeftAtB?.leftResult).toBe('null')
    expect(checkLeftAtB?.rightResult).toBe('—')

    const checkRightAtB = exec.steps.find((step) => step.codeLine === 7 && step.nodeLabel === 'B')
    expect(checkRightAtB?.leftResult).toBe('null')
    expect(checkRightAtB?.rightResult).toBe('E')
  })

  it('returns early via rightResult when the goal is found in the right subtree', () => {
    const exec = runBinaryTreePostorderExec(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'F' })
    const returnRightAtC = exec.steps.find((step) => step.codeLine === 8 && step.nodeLabel === 'C')
    expect(returnRightAtC?.rightResult).toBe('F')
    expect(exec.foundNodeLabel).toBe('F')
  })
})

describe('runBinaryTreeLevelOrderSearch', () => {
  it('visits every node level by level when nothing is found', () => {
    const result = runBinaryTreeLevelOrderSearch(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'Z' })
    expect(result.steps.map((step) => step.nodeLabel)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    expect(result.foundNodeId).toBeNull()
  })

  it('stops when target node is matched in level-order visit order', () => {
    const result = runBinaryTreeLevelOrderSearch(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'C' })
    expect(result.steps.map((step) => step.nodeLabel)).toEqual(['A', 'B', 'C'])
    expect(result.foundNodeLabel).toBe('C')
  })

  it('finds a target-value match in level-order', () => {
    const result = runBinaryTreeLevelOrderSearch(SAMPLE_TREE, { type: 'target-value', targetValue: 5 })
    expect(result.foundNodeLabel).toBe('E')
    expect(result.steps.map((step) => step.nodeLabel)).toEqual(['A', 'B', 'C', 'D', 'E'])
  })

  it('tracks running best values for level-order max search', () => {
    const result = runBinaryTreeLevelOrderSearch(SAMPLE_TREE, { type: 'max-value' })
    expect(result.steps.map((step) => step.nodeLabel)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    expect(result.steps.map((step) => step.runningBest)).toEqual([1, 2, 3, 4, 5, 6])
    expect(result.foundValue).toBe(6)
    expect(result.foundNodeIds).toEqual([])
  })

  it('walks the entire tree for a min-value goal', () => {
    const result = runBinaryTreeLevelOrderSearch(SAMPLE_TREE, { type: 'min-value' })
    expect(result.foundValue).toBe(1)
    expect(result.foundNodeIds).toEqual([])
  })

  it('reports fromNodeId as the parent for every step except the root', () => {
    const result = runBinaryTreeLevelOrderSearch(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'Z' })
    const parentByLabel = Object.fromEntries(result.steps.map((step) => [step.nodeLabel, step.fromNodeId]))
    expect(parentByLabel['A']).toBeNull()
    expect(parentByLabel['B']).toBe('A')
    expect(parentByLabel['C']).toBe('A')
    expect(parentByLabel['D']).toBe('B')
    expect(parentByLabel['F']).toBe('C')
  })
})

describe('runBinaryTreeLevelOrderExec', () => {
  it('highlights the match-return line when the goal is found', () => {
    const exec = runBinaryTreeLevelOrderExec(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'B' })
    const matchStep = exec.steps.find((step) => step.matchedGoal)
    expect(matchStep?.codeLine).toBe(7)
    expect(matchStep?.nodeLabel).toBe('B')
  })

  it('tracks the BFS queue labels across enqueue steps', () => {
    const exec = runBinaryTreeLevelOrderExec(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'Z' })
    const initQueue = exec.steps.find((step) => step.codeLine === 3)
    expect(initQueue?.queueLabels).toEqual(['A'])

    const afterEnqueueRightAtA = exec.steps.find(
      (step) => step.codeLine === 11 && step.nodeLabel === 'A',
    )
    expect(afterEnqueueRightAtA?.queueLabels).toEqual(['B', 'C'])
  })

  it('ends on the final return-null line when the goal is missing', () => {
    const exec = runBinaryTreeLevelOrderExec(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'Z' })
    expect(exec.steps.at(-1)?.codeLine).toBe(12)
    expect(exec.foundNodeId).toBeNull()
  })
})

// Shared edge cases — every traversal algorithm must behave the same way here.
describe.each([
  ['preorder', runBinaryTreePreorderSearch],
  ['inorder', runBinaryTreeInorderSearch],
  ['postorder', runBinaryTreePostorderSearch],
  ['level-order', runBinaryTreeLevelOrderSearch],
] as const)('%s edge cases', (_name, runSearch) => {
  it('returns no steps for an empty tree', () => {
    const result = runSearch(EMPTY_TREE, { type: 'max-value' })
    expect(result.steps).toEqual([])
    expect(result.foundNodeId).toBeNull()
  })

  it('returns no steps for a max/min goal when no node has a numeric value', () => {
    const tree = makeTree({ A: [null, null, 'empty'] })
    const result = runSearch(tree, { type: 'max-value' })
    expect(result.steps).toEqual([])
  })

  it('ignores empty-value nodes when searching for an extreme', () => {
    const tree = makeTree({
      A: ['B', null, 'empty'],
      B: [null, null, 9],
    })
    const result = runSearch(tree, { type: 'max-value' })
    expect(result.foundValue).toBe(9)
    expect(result.foundNodeIds).toEqual([])
  })

  it('reports value-only result when multiple nodes tie for the extreme', () => {
    const tiedTree = makeTree({
      A: ['B', 'C', 7],
      B: [null, null, 7],
      C: [null, null, 3],
    })
    const result = runSearch(tiedTree, { type: 'max-value' })
    expect(result.foundValue).toBe(7)
    expect(result.foundNodeIds).toEqual([])
  })
})

describe('prepareBinaryTreeTraversalRunInputs', () => {
  const baseArgs = { tree: SAMPLE_TREE, algoLabel: 'Preorder' }

  it('rejects an empty tree', () => {
    const result = prepareBinaryTreeTraversalRunInputs({
      tree: EMPTY_TREE,
      goalType: 'max-value',
      goalNodeLabel: '',
      goalValueInput: '',
      algoLabel: 'Preorder',
    })
    expect(result.ok).toBe(false)
  })

  it('requires a goal node label for target-node search', () => {
    const result = prepareBinaryTreeTraversalRunInputs({
      ...baseArgs,
      goalType: 'target-node',
      goalNodeLabel: '',
      goalValueInput: '',
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a goal node label that does not exist in the tree', () => {
    const result = prepareBinaryTreeTraversalRunInputs({
      ...baseArgs,
      goalType: 'target-node',
      goalNodeLabel: 'Z',
      goalValueInput: '',
    })
    expect(result.ok).toBe(false)
  })

  it('builds a valid target-node goal', () => {
    const result = prepareBinaryTreeTraversalRunInputs({
      ...baseArgs,
      goalType: 'target-node',
      goalNodeLabel: 'c',
      goalValueInput: '',
    })
    expect(result).toEqual({
      ok: true,
      goal: { type: 'target-node', targetNodeLabel: 'C' },
      initialGoalNodeIds: ['C'],
    })
  })

  it('rejects a non-numeric target value', () => {
    const result = prepareBinaryTreeTraversalRunInputs({
      ...baseArgs,
      goalType: 'target-value',
      goalNodeLabel: '',
      goalValueInput: 'abc',
    })
    expect(result.ok).toBe(false)
  })

  it('requires every node to have a value for non target-node goals', () => {
    const treeWithEmpty = makeTree({ A: ['B', null, 1], B: [null, null] })
    const result = prepareBinaryTreeTraversalRunInputs({
      tree: treeWithEmpty,
      algoLabel: 'Preorder',
      goalType: 'max-value',
      goalNodeLabel: '',
      goalValueInput: '',
    })
    expect(result.ok).toBe(false)
  })

  it('allows empty node values when searching for a target node', () => {
    const treeWithEmpty = makeTree({ A: ['B', null, 1], B: [null, null] })
    const result = prepareBinaryTreeTraversalRunInputs({
      tree: treeWithEmpty,
      algoLabel: 'Preorder',
      goalType: 'target-node',
      goalNodeLabel: 'B',
      goalValueInput: '',
    })
    expect(result.ok).toBe(true)
  })
})

describe('buildBinaryTreeTraversalCompletionStatus', () => {
  it('reports when the goal was not found', () => {
    const result = runBinaryTreePreorderSearch(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'Z' })
    expect(buildBinaryTreeTraversalCompletionStatus(result)).toBe('Goal not found among the tree nodes.')
  })

  it('reports the matched node for a target search', () => {
    const result = runBinaryTreePreorderSearch(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'B' })
    expect(buildBinaryTreeTraversalCompletionStatus(result)).toBe('Goal node B reached.')
  })

  it('reports the extreme value without naming a winner node', () => {
    const result = runBinaryTreePreorderSearch(SAMPLE_TREE, { type: 'max-value' })
    expect(buildBinaryTreeTraversalCompletionStatus(result)).toBe('Maximum value in the tree: 6.')
  })

  it('reports only the extreme value (no winner-node list)', () => {
    const tiedTree = makeTree({
      A: ['B', 'C', 7],
      B: [null, null, 7],
      C: [null, null, 3],
    })
    const result = runBinaryTreePreorderSearch(tiedTree, { type: 'max-value' })
    expect(buildBinaryTreeTraversalCompletionStatus(result)).toBe('Maximum value in the tree: 7.')
  })
})
