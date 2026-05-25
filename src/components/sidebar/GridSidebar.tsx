import { useState } from 'react'
import { AlgorithmInfoCard } from './AlgorithmInfoCard'
import { PlaybackControls } from './PlaybackControls'

type GridAlgorithm = 'bfs' | 'dfs'

export const GridSidebar = () => {
  const [algorithm, setAlgorithm] = useState<GridAlgorithm>('bfs')

  return (
    <aside className="sidebar is-grid-search">
      <div className="sidebar-page-switch">
        <button className="sidebar-page-tab is-active" type="button">
          Search type
        </button>
      </div>
      <div className="sidebar-page-body">
        <div className="sidebar-section">
          <div className="pill-group">
            <button
              className={`btn btn-pill ${algorithm === 'bfs' ? 'btn-active' : ''}`}
              type="button"
              onClick={() => setAlgorithm('bfs')}
            >
              BFS
            </button>
            <button
              className={`btn btn-pill ${algorithm === 'dfs' ? 'btn-active' : ''}`}
              type="button"
              onClick={() => setAlgorithm('dfs')}
            >
              DFS
            </button>
          </div>
        </div>

        <AlgorithmInfoCard infoKey={algorithm === 'bfs' ? 'grid-bfs' : 'grid-dfs'} />

        <div className="sidebar-section sidebar-section--grid-playback">
          <h3>Playback</h3>
          <PlaybackControls
            runLabel={`Run ${algorithm.toUpperCase()}`}
            stopLabel={`Stop ${algorithm.toUpperCase()}`}
            isRunActive={false}
            onRunToggle={() => {}}
            runDisabled={true}
            onPrevious={() => {}}
            onNext={() => {}}
            onPlayPauseToggle={() => {}}
            isPlaying={false}
            isPlaybackComplete={false}
            canStepBackward={false}
            canStepForward={false}
            canTogglePlay={false}
            speed={50}
            onSpeedChange={() => {}}
          />
        </div>
      </div>
    </aside>
  )
}
