import { describe, it, expect } from 'vitest'

import type { BinaryTree } from '../types'

import {
  buildValidateBstCompletionStatus,
  buildSearchBstCompletionStatus,
  buildInsertBstCompletionStatus,
  buildDeleteBstCompletionStatus,
  canRunValidateBst,
  canRunInsertBst,
  canRunDeleteBst,
  formatBstBound,
  runValidateBstExec,
  runSearchBstExec,
  runInsertBstExec,
  runDeleteBstExec,
  applyBstInsert,
  removeBstInsertedNode,
  treeAfterDeleteMutations,
  VALIDATE_BST_CODE_LINES,
  SEARCH_BST_CODE_LINES,
  INSERT_BST_CODE_LINES,
  DELETE_BST_CODE_LINES,
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

// Duplicate left child — invalid under strict (min, max) bounds.
//        A(2)
//       /
//     B(2)
const DUP_LEFT = makeTree({
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

  it('rejects equal values on a left child (strict BST bounds)', () => {
    const result = runValidateBstExec(DUP_LEFT)
    expect(result.isValid).toBe(false)
    expect(result.violationNodeLabel).toBe('B')
  })

  it('rejects equal values on a right child', () => {
    const result = runValidateBstExec(makeTree({
      A: [null, 'B', 2],
      B: [null, null, 2],
    }))
    expect(result.isValid).toBe(false)
    expect(result.violationNodeLabel).toBe('B')
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

describe('runSearchBstExec', () => {
  it('finds a present target and only walks the BST path', () => {
    const result = runSearchBstExec(VALID_BST, 3)
    expect(result.found).toBe(true)
    expect(result.foundNodeLabel).toBe('E')
    expect(result.steps.at(-1)?.visitedNodeIds).toEqual(['A', 'B', 'E'])
    expect(result.steps.at(-1)?.matched).toBe(true)
    expect(result.steps.at(-1)?.codeLine).toBe(SEARCH_BST_CODE_LINES.RETURN_NODE)
  })

  it('goes right when the target is larger than the current node', () => {
    const result = runSearchBstExec(VALID_BST, 7)
    expect(result.found).toBe(true)
    expect(result.foundNodeLabel).toBe('F')
    expect(result.steps.at(-1)?.visitedNodeIds).toEqual(['A', 'C', 'F'])
  })

  it('returns not found when the walk hits null', () => {
    const result = runSearchBstExec(VALID_BST, 5)
    expect(result.found).toBe(false)
    expect(result.foundNodeId).toBeNull()
    expect(result.steps.at(-1)?.codeLine).toBe(SEARCH_BST_CODE_LINES.RETURN_NULL)
    // Path toward 5: A(4) → right C(6) → left null
    expect(result.steps.at(-1)?.visitedNodeIds).toEqual(['A', 'C'])
  })

  it('finds the root when the target matches it', () => {
    const result = runSearchBstExec(VALID_BST, 4)
    expect(result.found).toBe(true)
    expect(result.foundNodeLabel).toBe('A')
    expect(result.steps.at(-1)?.visitedNodeIds).toEqual(['A'])
  })

  it('handles an empty tree as not found', () => {
    const result = runSearchBstExec({ rootId: null, nodesById: {} }, 1)
    expect(result.found).toBe(false)
    expect(result.steps.map((step) => step.codeLine)).toEqual([
      SEARCH_BST_CODE_LINES.ENTER,
      SEARCH_BST_CODE_LINES.NULL_CHECK,
      SEARCH_BST_CODE_LINES.RETURN_NULL,
    ])
  })

  it('emits compare then recurse-left when descending left', () => {
    const result = runSearchBstExec(VALID_BST, 1)
    const atRoot = result.steps.filter((step) => step.nodeLabel === 'A')
    expect(atRoot.some((step) => step.codeLine === SEARCH_BST_CODE_LINES.COMPARE)).toBe(true)
    expect(atRoot.some((step) => step.codeLine === SEARCH_BST_CODE_LINES.RECURSE_LEFT)).toBe(true)
    expect(atRoot.some((step) => step.codeLine === SEARCH_BST_CODE_LINES.RECURSE_RIGHT)).toBe(false)
  })
})

describe('buildSearchBstCompletionStatus', () => {
  it('describes found and missing outcomes', () => {
    expect(buildSearchBstCompletionStatus(runSearchBstExec(VALID_BST, 3))).toBe(
      'Done. Found target 3 at node E.',
    )
    expect(buildSearchBstCompletionStatus(runSearchBstExec(VALID_BST, 5))).toBe(
      'Done. Target 5 is not in the tree.',
    )
  })
})

describe('canRunInsertBst', () => {
  it('allows an empty tree, but rejects trees with empty node values', () => {
    expect(canRunInsertBst({ rootId: null, nodesById: {} })).toBe(true)
    expect(canRunInsertBst(VALID_BST)).toBe(true)
    expect(canRunInsertBst(makeTree({ A: [null, null, 'empty'] }))).toBe(false)
  })
})

describe('runInsertBstExec', () => {
  it('inserts as root on an empty tree', () => {
    const result = runInsertBstExec({ rootId: null, nodesById: {} }, 4)
    expect(result.didInsert).toBe(true)
    expect(result.parentNodeId).toBeNull()
    expect(result.side).toBeNull()
    expect(result.steps.at(-1)?.codeLine).toBe(INSERT_BST_CODE_LINES.CREATE_NODE)
    expect(result.steps[result.insertStepIndex]?.inserted).toBe(true)
  })

  it('walks left for a smaller value and records the left slot', () => {
    const result = runInsertBstExec(VALID_BST, 0)
    expect(result.parentNodeId).toBe('D')
    expect(result.side).toBe('left')
    expect(result.steps.at(-1)?.visitedNodeIds).toEqual(['A', 'B', 'D'])
  })

  it('rejects an existing value without inserting (strict BST)', () => {
    const equal = runInsertBstExec(VALID_BST, 4)
    expect(equal.didInsert).toBe(false)
    expect(equal.insertStepIndex).toBe(-1)
    expect(equal.rejectStepIndex).toBeGreaterThanOrEqual(0)
    expect(equal.existingNodeLabel).toBe('A')
    expect(equal.steps.at(-1)?.codeLine).toBe(INSERT_BST_CODE_LINES.RETURN_EXISTING)
    expect(equal.steps.at(-1)?.visitedNodeIds).toEqual(['A'])

    const larger = runInsertBstExec(VALID_BST, 8)
    expect(larger.didInsert).toBe(true)
    expect(larger.parentNodeId).toBe('F')
    expect(larger.side).toBe('right')
  })

  it('sends only strictly larger values down the right branch from a node', () => {
    const larger = runInsertBstExec(VALID_BST, 5)
    expect(larger.didInsert).toBe(true)
    expect(larger.parentNodeId).toBe('C')
    expect(larger.side).toBe('left')
    const atRoot = larger.steps.filter((step) => step.nodeLabel === 'A')
    expect(atRoot.some((step) => step.codeLine === INSERT_BST_CODE_LINES.ASSIGN_RIGHT)).toBe(true)
    expect(atRoot.some((step) => step.codeLine === INSERT_BST_CODE_LINES.EQUAL_CHECK)).toBe(true)
  })

  it('tightens max when descending left and min when descending right', () => {
    const left = runInsertBstExec(VALID_BST, 0)
    const enterD = left.steps.find(
      (step) => step.codeLine === INSERT_BST_CODE_LINES.ENTER && step.nodeLabel === 'D',
    )
    expect(enterD?.minBound).toBe(Number.NEGATIVE_INFINITY)
    expect(enterD?.maxBound).toBe(2)

    const right = runInsertBstExec(VALID_BST, 8)
    const enterF = right.steps.find(
      (step) => step.codeLine === INSERT_BST_CODE_LINES.ENTER && step.nodeLabel === 'F',
    )
    expect(enterF?.minBound).toBe(6)
    expect(enterF?.maxBound).toBe(Number.POSITIVE_INFINITY)
  })

  it('keeps a valid BST valid after the planned insert is applied', () => {
    const plan = runInsertBstExec(VALID_BST, 0)
    const next = applyBstInsert(VALID_BST, {
      parentNodeId: plan.parentNodeId,
      side: plan.side,
      value: plan.value,
      newId: 'bt-new',
    })
    expect(runValidateBstExec(next).isValid).toBe(true)
  })
})

describe('applyBstInsert / removeBstInsertedNode', () => {
  it('adds a valued leaf and can undo the insert', () => {
    const inserted = applyBstInsert(VALID_BST, {
      parentNodeId: 'D',
      side: 'left',
      value: 0,
      newId: 'bt-new',
    })
    expect(inserted.nodesById['bt-new']?.value).toBe(0)
    expect(inserted.nodesById.D.leftId).toBe('bt-new')
    expect(Object.keys(inserted.nodesById)).toHaveLength(7)

    const undone = removeBstInsertedNode(inserted, 'bt-new')
    expect(undone.nodesById['bt-new']).toBeUndefined()
    expect(undone.nodesById.D.leftId).toBeNull()
    expect(Object.keys(undone.nodesById)).toHaveLength(6)
  })

  it('can insert a root into an empty tree', () => {
    const inserted = applyBstInsert(
      { rootId: null, nodesById: {} },
      { parentNodeId: null, side: null, value: 5, newId: 'bt-1' },
    )
    expect(inserted.rootId).toBe('bt-1')
    expect(inserted.nodesById['bt-1']?.value).toBe(5)
    expect(inserted.nodesById['bt-1']?.label).toBe('A')
  })
})

describe('buildInsertBstCompletionStatus', () => {
  it('describes root and child inserts', () => {
    const rootResult = runInsertBstExec({ rootId: null, nodesById: {} }, 5)
    expect(buildInsertBstCompletionStatus(rootResult, 'A')).toBe(
      'Done. Inserted 5 as root node A.',
    )
    const childResult = runInsertBstExec(VALID_BST, 0)
    expect(buildInsertBstCompletionStatus(childResult, 'G')).toBe(
      'Done. Inserted 0 as node G.',
    )
  })

  it('describes a rejected duplicate', () => {
    const rejected = runInsertBstExec(VALID_BST, 4)
    expect(buildInsertBstCompletionStatus(rejected, null)).toBe(
      'Done. Value 4 already exists at node A — not inserted.',
    )
  })
})

describe('canRunDeleteBst', () => {
  it('allows an empty tree, but rejects trees with empty node values', () => {
    expect(canRunDeleteBst({ rootId: null, nodesById: {} })).toBe(true)
    expect(canRunDeleteBst(VALID_BST)).toBe(true)
    expect(canRunDeleteBst(makeTree({ A: [null, null, 'empty'] }))).toBe(false)
  })
})

describe('runDeleteBstExec', () => {
  it('reports not found without mutating when the key is missing', () => {
    const result = runDeleteBstExec(VALID_BST, 5)
    expect(result.found).toBe(false)
    expect(result.mutations).toHaveLength(0)
    expect(result.finalTree.nodesById.A.value).toBe(4)
    expect(result.steps.at(-1)?.codeLine).toBe(DELETE_BST_CODE_LINES.RETURN)
  })

  it('splices out a leaf (zero children)', () => {
    const result = runDeleteBstExec(VALID_BST, 1)
    expect(result.found).toBe(true)
    expect(result.mutations.some((m) => m.kind === 'spliceOut')).toBe(true)
    expect(result.finalTree.nodesById.D).toBeUndefined()
    expect(result.finalTree.nodesById.B.leftId).toBeNull()
    expect(runValidateBstExec(result.finalTree).isValid).toBe(true)
  })

  it('splices out a one-child node by promoting the child', () => {
    // Delete C(6) which only has right child F(7)
    const result = runDeleteBstExec(VALID_BST, 6)
    expect(result.found).toBe(true)
    expect(result.finalTree.nodesById.C).toBeUndefined()
    expect(result.finalTree.nodesById.A.rightId).toBe('F')
    expect(result.finalTree.nodesById.F.value).toBe(7)
    expect(runValidateBstExec(result.finalTree).isValid).toBe(true)
  })

  it('copies the successor value before removing the successor (two children)', () => {
    // Delete A(4): successor is E(3)? Wait inorder of VALID_BST: D1 B2 E3 A4 C6 F7
    // Right of A is C. Min of right subtree is C itself (C has no left). Successor = C(6).
    const result = runDeleteBstExec(VALID_BST, 4)
    expect(result.found).toBe(true)
    expect(result.targetNodeId).toBe('A')

    const copy = result.mutations.find((m) => m.kind === 'setValue')
    expect(copy).toEqual(expect.objectContaining({ kind: 'setValue', nodeId: 'A', value: 6 }))

    const copyStep = result.steps.find((s) => s.copied)
    expect(copyStep?.codeLine).toBe(DELETE_BST_CODE_LINES.COPY_VALUE)
    expect(copyStep?.nodeId).toBe('A')

    // After copy but before splice, A should show 6 and C still exists.
    const afterCopy = treeAfterDeleteMutations(
      result.baseTree,
      result.mutations,
      copy!.stepIndex,
    )
    expect(afterCopy.nodesById.A.value).toBe(6)
    expect(afterCopy.nodesById.C).toBeDefined()

    // Final tree: C gone, A holds 6, F hangs off A.
    expect(result.finalTree.nodesById.A.value).toBe(6)
    expect(result.finalTree.nodesById.C).toBeUndefined()
    expect(result.finalTree.nodesById.A.rightId).toBe('F')
    expect(runValidateBstExec(result.finalTree).isValid).toBe(true)

    // Scrubbing must expose the intermediate copy before the structural shift.
    expect(copy!.stepIndex).toBeLessThan(
      result.mutations.find((m) => m.kind === 'spliceOut')!.stepIndex,
    )
  })

  it('uses a deeper successor when the right child has a left spine', () => {
    //        A(5)
    //       / \
    //     B(3) C(9)
    //         /
    //       D(7)
    const tree = makeTree({
      A: ['B', 'C', 5],
      B: [null, null, 3],
      C: ['D', null, 9],
      D: [null, null, 7],
    })
    const result = runDeleteBstExec(tree, 5)
    const copy = result.mutations.find((m) => m.kind === 'setValue')
    expect(copy).toEqual(expect.objectContaining({ nodeId: 'A', value: 7 }))
    expect(result.finalTree.nodesById.A.value).toBe(7)
    expect(result.finalTree.nodesById.D).toBeUndefined()
    expect(result.finalTree.nodesById.C.leftId).toBeNull()
    expect(runValidateBstExec(result.finalTree).isValid).toBe(true)
  })
})

describe('buildDeleteBstCompletionStatus', () => {
  it('describes found and missing outcomes', () => {
    expect(buildDeleteBstCompletionStatus(runDeleteBstExec(VALID_BST, 1))).toContain('Deleted key 1')
    expect(buildDeleteBstCompletionStatus(runDeleteBstExec(VALID_BST, 5))).toBe(
      'Done. Key 5 is not in the tree.',
    )
  })
})
