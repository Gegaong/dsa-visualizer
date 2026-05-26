export type InnerAlgo = 'bfs' | 'dfs'

export type GridStep = {
  phase: 'outer' | 'inner'
  currentCell: string
  newVisited: string[]
  frontierCells: string[]
  islandIndex: number
  explanation: string
}

export type GridResult = {
  steps: GridStep[]
  islandGroups: string[][]
  discoverySteps: number
}
