import { useCallback, useRef, useState } from 'react'
import { useStepPlayback } from './useStepPlayback'
import { runForLoopOuter } from '../algorithms/gridForLoopOuter'
import { runOuterBFS, runOuterDFS } from '../algorithms/gridOuterSearch'
import type { GridResult, GridSubPhase } from '../algorithms/gridTypes'
import type { InnerAlgo } from '../algorithms/gridTypes'
import { buildGridIslandColorMap } from '../utils/gridIslandColors'
import type { IslandHSL } from '../utils/gridIslandColors'
import type { ForLoopScanMode } from '../algorithms/gridForLoopOuter'
export type { IslandHSL } from '../utils/gridIslandColors'
export type { ForLoopScanMode } from '../algorithms/gridForLoopOuter'
export type { InnerAlgo } from '../algorithms/gridTypes'
export type { GridSubPhase } from '../algorithms/gridTypes'

export type GridSearchMode =
  | 'for-bfs' | 'for-dfs'
  | 'bfs-bfs' | 'bfs-dfs'
  | 'dfs-bfs' | 'dfs-dfs'

const GRID_MIN_DELAY = 1
const GRID_MAX_DELAY = 300
const GRID_INITIAL_SPEED = 89

type Params = {
  islands: Set<string>
  rows: number
  cols: number
  connectivity: 4 | 8
}

export type GridOutput = {
  islandCount: number
  discoverySteps: number
  totalSteps: number
  operationCount: number
  discoveryOperations: number
}

export type ForLoopBFSPlaybackHandle = {
  visitedCells: string[]
  frontierCells: string[]
  currentCell: string | null
  currentPhase: 'inner' | 'outer' | null
  islandColorByCellKey: Map<string, IslandHSL> | null
  isRunning: boolean
  gridOutput: GridOutput | null
  stepIndex: number
  stepCount: number
  currentSubPhase: GridSubPhase | null
  canRun: boolean
  isPlaying: boolean
  playbackSpeed: number
  isPlaybackComplete: boolean
  canStepForward: boolean
  canStepBackward: boolean
  canTogglePlay: boolean
  run: (mode: GridSearchMode, scanMode: ForLoopScanMode, startCells?: string[]) => void
  stop: () => void
  stepForward: () => void
  stepBackward: () => void
  togglePlay: () => void
  setPlaybackSpeed: (v: number) => void
}

// Manages algorithm selection, run-time result storage, and step-by-step playback for all 6 grid search modes.
export function useForLoopBFSPlayback({ islands, rows, cols, connectivity }: Params): ForLoopBFSPlaybackHandle {
  const [visitedCells, setVisitedCells] = useState<string[]>([])
  const [frontierCells, setFrontierCells] = useState<string[]>([])
  const [currentCell, setCurrentCell] = useState<string | null>(null)
  const [islandColorByCellKey, setIslandColorByCellKey] = useState<Map<string, IslandHSL> | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<'inner' | 'outer' | null>(null)
  const [currentSubPhase, setCurrentSubPhase] = useState<GridSubPhase | null>(null)
  const [stepCount, setStepCount] = useState(0)
  const [resetSignal, setResetSignal] = useState(0)
  const [gridOutput, setGridOutput] = useState<GridOutput | null>(null)

  const resultRef = useRef<GridResult | null>(null)
  // Running visited set — avoids full snapshots in step data (water cells would explode memory).
  const visitedSetRef = useRef(new Set<string>())
  const prevStepIndexRef = useRef(-1)

  // Resets all visual state (visited set, frontier, current cell) without touching algorithm result.
  const clearVisuals = useCallback(() => {
    visitedSetRef.current = new Set()
    prevStepIndexRef.current = -1
    setVisitedCells([])
    setFrontierCells([])
    setCurrentCell(null)
  }, [])

  const pb = useStepPlayback({
    stepCount,
    minDelay: GRID_MIN_DELAY,
    maxDelay: GRID_MAX_DELAY,
    initialSpeed: GRID_INITIAL_SPEED,
    resetSignal,
    onStepIndexChange: (newIndex) => {
      const result = resultRef.current
      if (!result || newIndex < 0) {
        clearVisuals()
        setCurrentPhase(null)
        setCurrentSubPhase(null)
        return
      }

      const prevIndex = prevStepIndexRef.current
      prevStepIndexRef.current = newIndex

      if (newIndex > prevIndex) {
        for (let i = Math.max(0, prevIndex + 1); i <= newIndex; i++) {
          result.steps[i].newVisited.forEach(k => visitedSetRef.current.add(k))
        }
      } else {
        visitedSetRef.current = new Set()
        for (let i = 0; i <= newIndex; i++) {
          result.steps[i].newVisited.forEach(k => visitedSetRef.current.add(k))
        }
      }

      const step = result.steps[newIndex]
      setVisitedCells([...visitedSetRef.current])
      setFrontierCells(step.frontierCells)
      setCurrentCell(step.currentCell)
      setCurrentPhase(step.phase)
      setCurrentSubPhase(step.subPhase ?? null)
    },
    onComplete: () => {
      setCurrentCell(null)
      setFrontierCells([])
      setCurrentPhase(null)
      setCurrentSubPhase(null)
    },
  })

  // Runs the chosen algorithm, stores the full step sequence, and initialises playback state.
  const run = (mode: GridSearchMode, scanMode: ForLoopScanMode, startCells?: string[]) => {
    if (pb.isPlaying) return
    pb.stopPlayback()
    const innerAlgo: InnerAlgo = mode.endsWith('bfs') ? 'bfs' : 'dfs'
    const corner = scanMode.slice(0, 2)
    const defaultKey = corner === 'tl' ? '0,0'
      : corner === 'tr' ? `0,${cols - 1}`
      : corner === 'bl' ? `${rows - 1},0`
      : `${rows - 1},${cols - 1}`
    let result: GridResult
    if (mode.startsWith('for')) {
      result = runForLoopOuter(islands, rows, cols, connectivity, scanMode, innerAlgo)
    } else if (mode.startsWith('bfs')) {
      const keys = startCells && startCells.length > 0 ? startCells : [defaultKey]
      result = runOuterBFS(islands, rows, cols, connectivity, keys, innerAlgo)
    } else {
      const key = startCells && startCells.length > 0 ? startCells[0] : defaultKey
      result = runOuterDFS(islands, rows, cols, connectivity, key, innerAlgo)
    }
    resultRef.current = result
    // Island colors built once at run time so they show during traversal, not just at completion.
    setIslandColorByCellKey(buildGridIslandColorMap(result.islandGroups))
    setGridOutput({
      islandCount: result.islandGroups.length,
      discoverySteps: result.discoverySteps,
      totalSteps: result.steps.length,
      operationCount: result.operationCount,
      discoveryOperations: result.discoveryOperations,
    })
    setIsRunning(true)
    setStepCount(result.steps.length)
    setResetSignal(s => s + 1)
  }

  // Aborts playback and clears all algorithm and visual state, returning to idle.
  const stop = () => {
    pb.stopPlayback()
    resultRef.current = null
    setIsRunning(false)
    setStepCount(0)
    setIslandColorByCellKey(null)
    setGridOutput(null)
    clearVisuals()
    setCurrentPhase(null)
    setCurrentSubPhase(null)
  }

  const canRun = islands.size > 0 && cols > 0

  return {
    visitedCells,
    frontierCells,
    currentCell,
    currentPhase,
    currentSubPhase,
    islandColorByCellKey,
    isRunning,
    gridOutput,
    stepIndex: pb.stepIndex,
    stepCount,
    canRun,
    isPlaying: pb.isPlaying,
    playbackSpeed: pb.playbackSpeed,
    isPlaybackComplete: pb.isPlaybackComplete,
    canStepForward: pb.canStepForward,
    canStepBackward: pb.canStepBackward,
    canTogglePlay: pb.canTogglePlay,
    run,
    stop,
    stepForward: pb.stepForward,
    stepBackward: pb.stepBackward,
    togglePlay: pb.togglePlay,
    setPlaybackSpeed: pb.setPlaybackSpeed,
  }
}
