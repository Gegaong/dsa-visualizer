import { describe, it, expect } from 'vitest'

import type { BinaryTree } from '../types'

import {
  buildBinaryTreeTraversalCompletionStatus,
  prepareBinaryTreeTraversalRunInputs,
  runBinaryTreePreorderExec,
  runBinaryTreePreorderSearch,
} from './binaryTreeTraversal'

// Builds a tree from a terse spec: id -> [leftId | null, rightId | null, value?]. rootId defaults to 'A'.
function makeTree(
  spec: Record<string, [string | null, string | null, (number | 'empty')?]>,
  rootId: string | null = 'A',
): BinaryTree {
  const nodesById: BinaryTree['nodesById'] = {}
  for (const [id, [leftId, rightId, value]] of Object.entries(spec)) {
    nodesById[id] = { id, label: id, value: value ?? 'empty', leftId, rightId }
  }
  return { rootId, nodesById }
}

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
  it('returns no steps for an empty tree', () => {
    const result = runBinaryTreePreorderSearch(EMPTY_TREE, { type: 'max-value' })
    expect(result.steps).toEqual([])
    expect(result.foundNodeId).toBeNull()
  })

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
    expect(result.foundNodeIds).toEqual(['F'])
    expect(result.steps.map((step) => step.runningBest)).toEqual([1, 2, 4, 5, 5, 6])
  })

  it('walks the entire tree for a min-value goal', () => {
    const result = runBinaryTreePreorderSearch(SAMPLE_TREE, { type: 'min-value' })
    expect(result.foundValue).toBe(1)
    expect(result.foundNodeIds).toEqual(['A'])
  })

  it('collects every node that ties for the extreme value', () => {
    const tiedTree = makeTree({
      A: ['B', 'C', 7],
      B: [null, null, 7],
      C: [null, null, 3],
    })
    const result = runBinaryTreePreorderSearch(tiedTree, { type: 'max-value' })
    expect(new Set(result.foundNodeIds)).toEqual(new Set(['A', 'B']))
  })

  it('ignores empty-value nodes when searching for an extreme', () => {
    const tree = makeTree({
      A: ['B', null, 'empty'],
      B: [null, null, 9],
    })
    const result = runBinaryTreePreorderSearch(tree, { type: 'max-value' })
    expect(result.foundValue).toBe(9)
    expect(result.foundNodeIds).toEqual(['B'])
  })

  it('returns no steps for a max/min goal when no node has a numeric value', () => {
    const tree = makeTree({ A: [null, null, 'empty'] })
    const result = runBinaryTreePreorderSearch(tree, { type: 'max-value' })
    expect(result.steps).toEqual([])
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
    expect(buildBinaryTreeTraversalCompletionStatus(result, SAMPLE_TREE)).toBe('Goal not found among the tree nodes.')
  })

  it('reports the matched node for a target search', () => {
    const result = runBinaryTreePreorderSearch(SAMPLE_TREE, { type: 'target-node', targetNodeLabel: 'B' })
    expect(buildBinaryTreeTraversalCompletionStatus(result, SAMPLE_TREE)).toBe('Goal node B reached.')
  })

  it('reports a single extreme-value winner by label', () => {
    const result = runBinaryTreePreorderSearch(SAMPLE_TREE, { type: 'max-value' })
    expect(buildBinaryTreeTraversalCompletionStatus(result, SAMPLE_TREE)).toBe('Maximum value in the tree: 6 at node F.')
  })

  it('lists every tied node up to four', () => {
    const tiedTree = makeTree({
      A: ['B', 'C', 7],
      B: [null, null, 7],
      C: [null, null, 3],
    })
    const result = runBinaryTreePreorderSearch(tiedTree, { type: 'max-value' })
    expect(buildBinaryTreeTraversalCompletionStatus(result, tiedTree)).toBe('Maximum value in the tree: 7, shared by A, B.')
  })
})
