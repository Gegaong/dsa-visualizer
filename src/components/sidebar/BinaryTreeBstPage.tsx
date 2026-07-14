import { useState } from 'react'

export type BinaryTreeBstAlgorithm =
  | 'validate'
  | 'search'
  | 'insert'
  | 'delete'

const ALGORITHM_OPTIONS: { value: BinaryTreeBstAlgorithm; label: string }[] = [
  { value: 'validate', label: 'Validate BST' },
  { value: 'search', label: 'Search' },
  { value: 'insert', label: 'Insert' },
  { value: 'delete', label: 'Delete' },
]

// Sidebar page: BST operations UI shell. Algorithms are listed here first; playback wiring comes later.
export const BinaryTreeBstPage = () => {
  const [algorithm, setAlgorithm] = useState<BinaryTreeBstAlgorithm>('validate')

  return (
    <div className="sidebar-page-body">
      <div className="sidebar-section">
        <h3>Binary Search Tree</h3>
        <label className="field">
          <span>Select algorithm</span>
          <select
            value={algorithm}
            onChange={(event) => setAlgorithm(event.target.value as BinaryTreeBstAlgorithm)}
          >
            {ALGORITHM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
