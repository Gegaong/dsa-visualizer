import { useEffect, useState } from 'react'

import type { CanvasType } from '../types'

import { CompressIcon, FullscreenIcon } from './FullscreenIcon'

type HeaderProps = {
  activeCanvas: CanvasType
  onCanvasTypeChange: (type: CanvasType) => void
}

// Topbar with canvas type tabs and a fullscreen toggle for the whole app.
export const Header = ({ activeCanvas, onCanvasTypeChange }: HeaderProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-title">DSA Visualizer</span>
        <span className="brand-subtitle">Build structures, then test algorithms.</span>
      </div>
      <nav className="structure-nav">
        <button
          className={`btn btn-pill ${activeCanvas === 'graph' ? 'btn-active' : ''}`}
          type="button"
          onClick={() => onCanvasTypeChange('graph')}
        >
          Graph
        </button>
        <button
          className={`btn btn-pill ${activeCanvas === 'weighted-graph' ? 'btn-active' : ''}`}
          type="button"
          onClick={() => onCanvasTypeChange('weighted-graph')}
        >
          Weighted Graph
        </button>
        <button
          className={`btn btn-pill ${activeCanvas === 'grid' ? 'btn-active' : ''}`}
          type="button"
          onClick={() => onCanvasTypeChange('grid')}
        >
          Grid
        </button>
        <button
          className={`btn btn-pill ${activeCanvas === 'nqueens' ? 'btn-active' : ''}`}
          type="button"
          onClick={() => onCanvasTypeChange('nqueens')}
        >
          N-Queens
        </button>
      </nav>
      <button
        className="topbar-fullscreen-btn"
        type="button"
        title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
        onClick={toggleFullscreen}
      >
        {isFullscreen ? <CompressIcon /> : <FullscreenIcon />}
      </button>
    </header>
  )
}
