import type { GoalType, GraphPreset } from '../../types'

import type { WeightedPathfindingPanelProps } from './WeightedPathfindingPanel'

export type { WeightedPathfindingPanelProps }

import type { TraversalStrategy } from '../../algorithms/algorithmstypes'

import type { TraversalPhase } from '../../hooks/useTraversalPlayback'

export type { TraversalPhase }

import type { CCPhase } from '../../hooks/useConnectedComponentsPlayback'

export type { CCPhase }

import type { SPPhase } from '../../hooks/useShortestPathPlayback'

export type { SPPhase }

export type SidebarPage = 'canvas' | 'traversal' | 'algorithms' | 'pathfinder'

export type AlgorithmMode =
  | 'components'
  | 'cycle'
  | 'bipartite'
  | 'shortest-path'

// State shared across pages: the canvas-algorithm families mutually disable each other,
// and graph edits freeze whenever any of them is active.
export type SidebarSharedState = {
  blockGraphEdits: boolean
  isTraversalRunning: boolean
  isConnectedComponentsSessionActive: boolean
  isCycleDetectionSessionActive: boolean
  isShortestPathSessionActive: boolean
  isBipartiteSessionActive: boolean
}

export type CanvasSetupPageProps = {
  blockGraphEdits: boolean
  isWeightedMode: boolean
  fillMin: string
  fillMax: string
  onFillMinChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onFillMaxChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onFillRangeBlur: () => void
  onFillRangeKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  onFillEmptyValues: () => void
  canFillEmpty: boolean
  onEmptyAllValues: () => void
  canEmptyAll: boolean
  onPresetClick: (preset: GraphPreset) => void
  heuristicPixelsPerUnit: string
  onHeuristicPixelsPerUnitChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onHeuristicPixelsPerUnitBlur: () => void
  distanceMode: boolean
  onDistanceModeChange: (checked: boolean) => void
}

export type TraversalPageProps = SidebarSharedState & {
  algorithmTab: TraversalStrategy
  onAlgorithmTabChange: (tab: TraversalStrategy) => void
  goalType: GoalType
  onGoalTypeChange: (type: GoalType) => void
  startNodeLabel: string
  onStartNodeLabelChange: (value: string) => void
  goalNodeLabel: string
  onGoalNodeLabelChange: (value: string) => void
  goalValueInput: string
  onGoalValueInputChange: (value: string) => void
  onRunTraversal: () => void
  onStopTraversal: () => void
  canRunTraversal: boolean
  traversalStatusText: string
  isTraversalPlaying: boolean
  traversalPlaybackSpeed: number
  onTraversalPlaybackSpeedChange: (value: number) => void
  onPlayTraversal: () => void
  onPauseTraversal: () => void
  onNextTraversalStep: () => void
  onPreviousTraversalStep: () => void
  canStepForward: boolean
  canStepBackward: boolean
  canTogglePlay: boolean
  isTraversalPlaybackComplete: boolean
  traversalCurrentPhase: TraversalPhase | null
  traversalVarsRows: string[][] | null
  pseudocodeShowLogic: boolean
  onPseudocodeFlip: () => void
}

export type ConnectedComponentsOutput = {
  componentCount: number
  largestSize: number
  groupsText: string
  operationCount: number
} | null

export type CycleDetectionOutput = {
  hasCycle: boolean
  cycleNodeLabels: string[]
  operationCount: number
} | null

export type ShortestPathOutput = {
  pathFound: boolean
  pathLength: number
  pathNodeLabels: string[]
  operationCount: number
} | null

export type BipartiteOutput = {
  isBipartite: boolean
  groupALabels: string | null
  groupBLabels: string | null
  operationCount: number
} | null

export type WPOutput = {
  pathFound: boolean
  pathCost: number | null
  pathNodeLabels: string[]
  operationCount: number
} | null

export type AlgorithmsPageProps = SidebarSharedState & {
  /** Matches canvas Directed / Undirected toggle; gates which graph algorithms may run. */
  isUndirectedMode: boolean
  onAlgorithmModeChange?: (mode: AlgorithmMode) => void

  onRunConnectedComponents: (strategy: TraversalStrategy) => void
  onStopConnectedComponents: () => void
  canRunConnectedComponents: boolean
  connectedComponentsStatusText: string
  ccStartNodeLabel: string
  onCCStartNodeLabelChange: (value: string) => void
  isConnectedComponentsPlaybackPlaying: boolean
  connectedComponentsPlaybackSpeed: number
  onConnectedComponentsPlaybackSpeedChange: (value: number) => void
  onPlayConnectedComponents: () => void
  onPauseConnectedComponents: () => void
  onNextConnectedComponentsStep: () => void
  onPreviousConnectedComponentsStep: () => void
  canConnectedComponentsStepForward: boolean
  canConnectedComponentsStepBackward: boolean
  canConnectedComponentsTogglePlay: boolean
  isConnectedComponentsPlaybackComplete: boolean
  connectedComponentsOutput: ConnectedComponentsOutput
  connectedComponentsStepIndex: number
  connectedComponentsStepTotal: number
  ccCurrentPhase: CCPhase | null
  ccVarsRows: string[][] | null
  pseudocodeShowLogic: boolean
  onPseudocodeFlip: () => void

  onRunCycleDetection: (strategy: TraversalStrategy) => void
  onStopCycleDetection: () => void
  canRunCycleDetection: boolean
  cycleDetectionStatusText: string
  cycleDetectionStartNodeLabel: string
  onCycleDetectionStartNodeLabelChange: (value: string) => void
  isCycleDetectionPlaybackPlaying: boolean
  cycleDetectionPlaybackSpeed: number
  onCycleDetectionPlaybackSpeedChange: (value: number) => void
  onPlayCycleDetection: () => void
  onPauseCycleDetection: () => void
  onNextCycleDetectionStep: () => void
  onPreviousCycleDetectionStep: () => void
  canCycleDetectionStepForward: boolean
  canCycleDetectionStepBackward: boolean
  canCycleDetectionTogglePlay: boolean
  isCycleDetectionPlaybackComplete: boolean
  cycleDetectionOutput: CycleDetectionOutput
  cycleDetectionStepIndex: number
  cycleDetectionStepTotal: number
  cycleDetectionCurrentExplanation: string

  onRunShortestPath: (strategy: TraversalStrategy) => void
  onStopShortestPath: () => void
  canRunShortestPath: boolean
  shortestPathStatusText: string
  shortestPathStartNodeLabel: string
  shortestPathGoalNodeLabel: string
  onShortestPathStartNodeLabelChange: (value: string) => void
  onShortestPathGoalNodeLabelChange: (value: string) => void
  isShortestPathPlaybackPlaying: boolean
  shortestPathPlaybackSpeed: number
  onShortestPathPlaybackSpeedChange: (value: number) => void
  onPlayShortestPath: () => void
  onPauseShortestPath: () => void
  onNextShortestPathStep: () => void
  onPreviousShortestPathStep: () => void
  canShortestPathStepForward: boolean
  canShortestPathStepBackward: boolean
  canShortestPathTogglePlay: boolean
  isShortestPathPlaybackComplete: boolean
  shortestPathOutput: ShortestPathOutput
  shortestPathStepIndex: number
  shortestPathStepTotal: number
  spCurrentPhase: SPPhase | null
  spVarsRows: string[][] | null

  onRunBipartite: (strategy: TraversalStrategy) => void
  onStopBipartite: () => void
  canRunBipartite: boolean
  bipartiteStatusText: string
  bipartiteStartNodeLabel: string
  onBipartiteStartNodeLabelChange: (value: string) => void
  isBipartitePlaybackPlaying: boolean
  bipartitePlaybackSpeed: number
  onBipartitePlaybackSpeedChange: (value: number) => void
  onPlayBipartite: () => void
  onPauseBipartite: () => void
  onNextBipartiteStep: () => void
  onPreviousBipartiteStep: () => void
  canBipartiteStepForward: boolean
  canBipartiteStepBackward: boolean
  canBipartiteTogglePlay: boolean
  isBipartitePlaybackComplete: boolean
  bipartiteOutput: BipartiteOutput
  bipartiteStepIndex: number
  bipartiteStepTotal: number
  bipartiteCurrentExplanation: string
}

export type SidebarProps = {
  activePage: SidebarPage
  onActivePage: (page: SidebarPage) => void
  onSidebarSectionChange?: (nav: { from: SidebarPage; to: SidebarPage }) => void
  canvasSetup: CanvasSetupPageProps
  traversal: TraversalPageProps
  algorithms: AlgorithmsPageProps
  pathfinder: WeightedPathfindingPanelProps
  isWeightedMode?: boolean
}
