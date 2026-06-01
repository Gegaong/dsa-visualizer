export type InnerAlgo = 'bfs' | 'dfs'

export type GridSubPhase =
  | 'outer-water'
  | 'outer-visited'
  | 'inner-start'
  | 'inner-process'

export type GridStep = {
  phase: 'outer' | 'inner'
  subPhase?: GridSubPhase
  currentCell: string
  newVisited: string[]
  frontierCells: string[]
  islandIndex: number
}

export type GridResult = {
  steps: GridStep[]
  islandGroups: string[][]
  discoverySteps: number
  operationCount: number
  discoveryOperations: number
}
