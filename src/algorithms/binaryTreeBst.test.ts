import { describe, it, expect } from 'vitest'

import type { BinaryTree } from '../types'

import {
  buildValidateBstCompletionStatus,
  canRunValidateBst,
  formatBstBound,
  runValidateBstExec,
  VALIDATE_BST_CODE_LINES,
} from './binaryTreeBst'

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

// Valid BST:
//        A(4)
//       / \
//     B(2) C(6)
//    / \     \
//  D(1) E(3)  F(7)
const VALID_BST = makeTree({
  A: ['B', 'C', 4],
  B: ['D', 'E', 2],
  C: [null, 'F', 6],
  D: [null, null, 1],
  E: [null, null, 3],
  F: [null, null, 7],
})

// Invalid: C=1 is in A's right but smaller than A.
//        A(4)
//       / \
//     B(2) C(1)
const INVALID_RIGHT = makeTree({
  A: ['B', 'C', 4],
  B: [null, null, 2],
  C: [null, null, 1],
})

// Invalid if equality were required to fail — with inclusive bounds this is a valid BST.
//        A(2)
//       /
//     B(2)
const DUP_LEFT_OK = makeTree({
  A: ['B', null, 2],
  B: [null, null, 2],
})

describe('formatBstBound', () => {
  it('formats infinities as ∞ glyphs', () => {
    expect(formatBstBound(Number.NEGATIVE_INFINITY)).toBe('-∞')
    expect(formatBstBound(Number.POSITIVE_INFINITY)).toBe('+∞')
    expect(formatBstBound(3)).toBe('3')
  })
})

describe('canRunValidateBst', () => {
  it('requires every node to have a numeric value', () => {
    expect(canRunValidateBst(VALID_BST)).toBe(true)
    expect(canRunValidateBst(makeTree({ A: [null, null, 'empty'] }))).toBe(false)
    expect(canRunValidateBst({ rootId: null, nodesById: {} })).toBe(false)
  })
})

describe('runValidateBstExec', () => {
  it('accepts a classic valid BST and visits every numeric node', () => {
    const result = runValidateBstExec(VALID_BST)
    expect(result.isValid).toBe(true)
    expect(result.violationNodeId).toBeNull()
    expect(result.steps.at(-1)?.visitedNodeIds).toEqual(['A', 'B', 'D', 'E', 'C', 'F'])
  })

  it('rejects a right child that violates the ancestor lower bound', () => {
    const result = runValidateBstExec(INVALID_RIGHT)
    expect(result.isValid).toBe(false)
    expect(result.violationNodeLabel).toBe('C')
    const violationStep = result.steps.find((step) => step.violated)
    expect(violationStep?.codeLine).toBe(VALIDATE_BST_CODE_LINES.RETURN_FALSE)
    expect(violationStep?.minBound).toBe(4)
    expect(violationStep?.maxBound).toBe(Number.POSITIVE_INFINITY)
  })

  it('allows equal values on a left child (inclusive BST bounds)', () => {
    const result = runValidateBstExec(DUP_LEFT_OK)
    expect(result.isValid).toBe(true)
    expect(result.violationNodeId).toBeNull()
  })

  it('allows equal values on a right child', () => {
    const result = runValidateBstExec(makeTree({
      A: [null, 'B', 2],
      B: [null, null, 2],
    }))
    expect(result.isValid).toBe(true)
  })

  it('does not mark a violating node as visited', () => {
    const result = runValidateBstExec(INVALID_RIGHT)
    const last = result.steps.at(-1)!
    expect(last.visitedNodeIds).toEqual(['A', 'B'])
    expect(last.visitedNodeIds).not.toContain('C')
  })

  it('stops after discovering a left subtree failure without walking the right', () => {
    //        A(5)
    //       / \
    //     B(3) C(7)
    //     /
    //   D(4)  ← 4 > max bound 3 (parent B)
    const tree = makeTree({
      A: ['B', 'C', 5],
      B: ['D', null, 3],
      C: [null, null, 7],
      D: [null, null, 4],
    })
    const result = runValidateBstExec(tree)
    expect(result.isValid).toBe(false)
    expect(result.violationNodeLabel).toBe('D')
    const labels = result.steps.map((step) => step.nodeLabel).filter(Boolean)
    expect(labels).not.toContain('C')
  })

  it('treats a null root call as valid (empty recursion base)', () => {
    const result = runValidateBstExec({ rootId: null, nodesById: {} })
    expect(result.isValid).toBe(true)
    expect(result.steps.map((step) => step.codeLine)).toEqual([
      VALIDATE_BST_CODE_LINES.ENTER,
      VALIDATE_BST_CODE_LINES.NULL_CHECK,
      VALIDATE_BST_CODE_LINES.RETURN_TRUE,
    ])
  })

  it('records tightening bounds when descending left then right', () => {
    const result = runValidateBstExec(VALID_BST)
    const enterE = result.steps.find(
      (step) => step.codeLine === VALIDATE_BST_CODE_LINES.ENTER && step.nodeLabel === 'E',
    )
    expect(enterE?.minBound).toBe(2)
    expect(enterE?.maxBound).toBe(4)

    const enterF = result.steps.find(
      (step) => step.codeLine === VALIDATE_BST_CODE_LINES.ENTER && step.nodeLabel === 'F',
    )
    expect(enterF?.minBound).toBe(6)
    expect(enterF?.maxBound).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('buildValidateBstCompletionStatus', () => {
  it('describes valid and invalid outcomes', () => {
    expect(buildValidateBstCompletionStatus(runValidateBstExec(VALID_BST))).toBe(
      'Done. This tree is a valid BST.',
    )
    expect(buildValidateBstCompletionStatus(runValidateBstExec(INVALID_RIGHT))).toContain('node C')
  })
})
