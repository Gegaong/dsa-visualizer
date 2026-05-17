import { useEffect, useState } from 'react'

import type { TraversalStrategy } from '../../algorithms/algorithmstypes'

import type { AlgorithmMode, AlgorithmsPageProps } from './sidebarTypes'

import { ConnectedComponentsPanel } from './ConnectedComponentsPanel'

import { CycleDetectionPanel } from './CycleDetectionPanel'

import { ShortestPathPanel } from './ShortestPathPanel'

import { BipartitePanel } from './BipartitePanel'

// Sidebar page: algorithm picker and routing to per-algorithm panels.
export const AlgorithmsPage = ({
  blockGraphEdits,
  isTraversalRunning,
  isConnectedComponentsSessionActive,
  isCycleDetectionSessionActive,
  isShortestPathSessionActive,
  isBipartiteSessionActive,
  isUndirectedMode,
  onAlgorithmModeChange,
  onRunConnectedComponents,
  onStopConnectedComponents,
  canRunConnectedComponents,
  connectedComponentsStatusText,
  isConnectedComponentsPlaybackPlaying,
  connectedComponentsPlaybackSpeed,
  onConnectedComponentsPlaybackSpeedChange,
  onPlayConnectedComponents,
  onPauseConnectedComponents,
  onNextConnectedComponentsStep,
  onPreviousConnectedComponentsStep,
  canConnectedComponentsStepForward,
  canConnectedComponentsStepBackward,
  canConnectedComponentsTogglePlay,
  isConnectedComponentsPlaybackComplete,
  connectedComponentsOutput,
  connectedComponentsStepIndex,
  connectedComponentsStepTotal,
  onRunCycleDetection,
  onStopCycleDetection,
  canRunCycleDetection,
  cycleDetectionStatusText,
  isCycleDetectionPlaybackPlaying,
  cycleDetectionPlaybackSpeed,
  onCycleDetectionPlaybackSpeedChange,
  onPlayCycleDetection,
  onPauseCycleDetection,
  onNextCycleDetectionStep,
  onPreviousCycleDetectionStep,
  canCycleDetectionStepForward,
  canCycleDetectionStepBackward,
  canCycleDetectionTogglePlay,
  isCycleDetectionPlaybackComplete,
  cycleDetectionOutput,
  cycleDetectionStepIndex,
  cycleDetectionStepTotal,
  onRunShortestPath,
  onStopShortestPath,
  canRunShortestPath,
  shortestPathStatusText,
  shortestPathStartNodeLabel,
  shortestPathGoalNodeLabel,
  onShortestPathStartNodeLabelChange,
  onShortestPathGoalNodeLabelChange,
  isShortestPathPlaybackPlaying,
  shortestPathPlaybackSpeed,
  onShortestPathPlaybackSpeedChange,
  onPlayShortestPath,
  onPauseShortestPath,
  onNextShortestPathStep,
  onPreviousShortestPathStep,
  canShortestPathStepForward,
  canShortestPathStepBackward,
  canShortestPathTogglePlay,
  isShortestPathPlaybackComplete,
  shortestPathOutput,
  shortestPathStepIndex,
  shortestPathStepTotal,
  onRunBipartite,
  onStopBipartite,
  canRunBipartite,
  bipartiteStatusText,
  isBipartitePlaybackPlaying,
  bipartitePlaybackSpeed,
  onBipartitePlaybackSpeedChange,
  onPlayBipartite,
  onPauseBipartite,
  onNextBipartiteStep,
  onPreviousBipartiteStep,
  canBipartiteStepForward,
  canBipartiteStepBackward,
  canBipartiteTogglePlay,
  isBipartitePlaybackComplete,
  bipartiteOutput,
  bipartiteStepIndex,
  bipartiteStepTotal,
}: AlgorithmsPageProps) => {
  const [algorithmMode, setAlgorithmMode] = useState<AlgorithmMode>('components')
  const [algorithmTraversal, setAlgorithmTraversal] = useState<TraversalStrategy>('bfs')
  useEffect(() => {
    onAlgorithmModeChange?.(algorithmMode)
  }, [algorithmMode, onAlgorithmModeChange])

  const algorithmPickerFrozen =
    blockGraphEdits ||
    (algorithmMode === 'components' && isConnectedComponentsSessionActive) ||
    (algorithmMode === 'cycle' && isCycleDetectionSessionActive) ||
    (algorithmMode === 'shortest-path' && isShortestPathSessionActive) ||
    (algorithmMode === 'bipartite' && isBipartiteSessionActive)

  const sharedPanelProps = {
    algorithmTraversal,
    onAlgorithmTraversalChange: setAlgorithmTraversal,
    algorithmPickerFrozen,
    isTraversalRunning,
  }

  return (
    <div className="sidebar-page-body sidebar-page-body--algorithms">
      <div className="sidebar-section">
        <h3>Algorithm</h3>
        <label className="field algorithm-mode-field">
          <span>Select algorithm</span>
          <select
            value={algorithmMode}
            onChange={(event) => setAlgorithmMode(event.target.value as AlgorithmMode)}
            disabled={algorithmPickerFrozen}
          >
            <option value="components">Connected components</option>
            <option value="cycle">Cycle detection</option>
            <option value="bipartite">Bipartite check</option>
            <option value="shortest-path">Shortest path</option>
          </select>
        </label>
      </div>

      {algorithmMode === 'components' && (
        <ConnectedComponentsPanel
          {...sharedPanelProps}
          isUndirectedMode={isUndirectedMode}
          isConnectedComponentsSessionActive={isConnectedComponentsSessionActive}
          canRunConnectedComponents={canRunConnectedComponents}
          connectedComponentsStatusText={connectedComponentsStatusText}
          isConnectedComponentsPlaybackPlaying={isConnectedComponentsPlaybackPlaying}
          connectedComponentsPlaybackSpeed={connectedComponentsPlaybackSpeed}
          onConnectedComponentsPlaybackSpeedChange={onConnectedComponentsPlaybackSpeedChange}
          onPlayConnectedComponents={onPlayConnectedComponents}
          onPauseConnectedComponents={onPauseConnectedComponents}
          onNextConnectedComponentsStep={onNextConnectedComponentsStep}
          onPreviousConnectedComponentsStep={onPreviousConnectedComponentsStep}
          canConnectedComponentsStepForward={canConnectedComponentsStepForward}
          canConnectedComponentsStepBackward={canConnectedComponentsStepBackward}
          canConnectedComponentsTogglePlay={canConnectedComponentsTogglePlay}
          isConnectedComponentsPlaybackComplete={isConnectedComponentsPlaybackComplete}
          connectedComponentsOutput={connectedComponentsOutput}
          connectedComponentsStepIndex={connectedComponentsStepIndex}
          connectedComponentsStepTotal={connectedComponentsStepTotal}
          onRunConnectedComponents={onRunConnectedComponents}
          onStopConnectedComponents={onStopConnectedComponents}
        />
      )}

      {algorithmMode === 'cycle' && (
        <CycleDetectionPanel
          {...sharedPanelProps}
          isUndirectedMode={isUndirectedMode}
          isCycleDetectionSessionActive={isCycleDetectionSessionActive}
          canRunCycleDetection={canRunCycleDetection}
          cycleDetectionStatusText={cycleDetectionStatusText}
          isCycleDetectionPlaybackPlaying={isCycleDetectionPlaybackPlaying}
          cycleDetectionPlaybackSpeed={cycleDetectionPlaybackSpeed}
          onCycleDetectionPlaybackSpeedChange={onCycleDetectionPlaybackSpeedChange}
          onPlayCycleDetection={onPlayCycleDetection}
          onPauseCycleDetection={onPauseCycleDetection}
          onNextCycleDetectionStep={onNextCycleDetectionStep}
          onPreviousCycleDetectionStep={onPreviousCycleDetectionStep}
          canCycleDetectionStepForward={canCycleDetectionStepForward}
          canCycleDetectionStepBackward={canCycleDetectionStepBackward}
          canCycleDetectionTogglePlay={canCycleDetectionTogglePlay}
          isCycleDetectionPlaybackComplete={isCycleDetectionPlaybackComplete}
          cycleDetectionOutput={cycleDetectionOutput}
          cycleDetectionStepIndex={cycleDetectionStepIndex}
          cycleDetectionStepTotal={cycleDetectionStepTotal}
          onRunCycleDetection={onRunCycleDetection}
          onStopCycleDetection={onStopCycleDetection}
        />
      )}

      {algorithmMode === 'shortest-path' && (
        <ShortestPathPanel
          {...sharedPanelProps}
          isShortestPathSessionActive={isShortestPathSessionActive}
          canRunShortestPath={canRunShortestPath}
          shortestPathStatusText={shortestPathStatusText}
          shortestPathStartNodeLabel={shortestPathStartNodeLabel}
          shortestPathGoalNodeLabel={shortestPathGoalNodeLabel}
          onShortestPathStartNodeLabelChange={onShortestPathStartNodeLabelChange}
          onShortestPathGoalNodeLabelChange={onShortestPathGoalNodeLabelChange}
          isShortestPathPlaybackPlaying={isShortestPathPlaybackPlaying}
          shortestPathPlaybackSpeed={shortestPathPlaybackSpeed}
          onShortestPathPlaybackSpeedChange={onShortestPathPlaybackSpeedChange}
          onPlayShortestPath={onPlayShortestPath}
          onPauseShortestPath={onPauseShortestPath}
          onNextShortestPathStep={onNextShortestPathStep}
          onPreviousShortestPathStep={onPreviousShortestPathStep}
          canShortestPathStepForward={canShortestPathStepForward}
          canShortestPathStepBackward={canShortestPathStepBackward}
          canShortestPathTogglePlay={canShortestPathTogglePlay}
          isShortestPathPlaybackComplete={isShortestPathPlaybackComplete}
          shortestPathOutput={shortestPathOutput}
          shortestPathStepIndex={shortestPathStepIndex}
          shortestPathStepTotal={shortestPathStepTotal}
          onRunShortestPath={onRunShortestPath}
          onStopShortestPath={onStopShortestPath}
        />
      )}

      {algorithmMode === 'bipartite' && (
        <BipartitePanel
          {...sharedPanelProps}
          isUndirectedMode={isUndirectedMode}
          isBipartiteSessionActive={isBipartiteSessionActive}
          canRunBipartite={canRunBipartite}
          bipartiteStatusText={bipartiteStatusText}
          isBipartitePlaybackPlaying={isBipartitePlaybackPlaying}
          bipartitePlaybackSpeed={bipartitePlaybackSpeed}
          onBipartitePlaybackSpeedChange={onBipartitePlaybackSpeedChange}
          onPlayBipartite={onPlayBipartite}
          onPauseBipartite={onPauseBipartite}
          onNextBipartiteStep={onNextBipartiteStep}
          onPreviousBipartiteStep={onPreviousBipartiteStep}
          canBipartiteStepForward={canBipartiteStepForward}
          canBipartiteStepBackward={canBipartiteStepBackward}
          canBipartiteTogglePlay={canBipartiteTogglePlay}
          isBipartitePlaybackComplete={isBipartitePlaybackComplete}
          bipartiteOutput={bipartiteOutput}
          bipartiteStepIndex={bipartiteStepIndex}
          bipartiteStepTotal={bipartiteStepTotal}
          onRunBipartite={onRunBipartite}
          onStopBipartite={onStopBipartite}
        />
      )}


    </div>
  )
}
