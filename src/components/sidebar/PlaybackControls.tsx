type PlaybackControlsProps = {
  // Run / Stop button
  runLabel: string
  stopLabel: string
  isRunActive: boolean
  onRunToggle: () => void
  runDisabled: boolean
  // Step controls
  onPrevious: () => void
  onNext: () => void
  onPlayPauseToggle: () => void
  isPlaying: boolean
  isPlaybackComplete: boolean
  canStepBackward: boolean
  canStepForward: boolean
  canTogglePlay: boolean
  // Blanket disable for every step/speed control (e.g. while the other algorithm family runs).
  stepControlsDisabled?: boolean
  // Speed slider
  speed: number
  onSpeedChange: (value: number) => void
}

// Shared Run/Stop + Previous/Play/Next + speed-slider block used by every algorithm page.
export const PlaybackControls = ({
  runLabel,
  stopLabel,
  isRunActive,
  onRunToggle,
  runDisabled,
  onPrevious,
  onNext,
  onPlayPauseToggle,
  isPlaying,
  isPlaybackComplete,
  canStepBackward,
  canStepForward,
  canTogglePlay,
  stepControlsDisabled = false,
  speed,
  onSpeedChange,
}: PlaybackControlsProps) => {
  const playLabel = isPlaying ? 'Pause' : isPlaybackComplete ? 'Replay' : 'Play'

  return (
    <div className="playback">
      <button
        className={`btn playback-run-btn ${isRunActive ? 'btn-active' : ''}`}
        type="button"
        onClick={onRunToggle}
        disabled={runDisabled}
      >
        {isRunActive ? stopLabel : runLabel}
      </button>
      <div className="playback-step-controls">
        <button
          className="btn playback-control-btn"
          type="button"
          onClick={onPrevious}
          disabled={!canStepBackward || stepControlsDisabled}
        >
          Previous
        </button>
        <button
          className={`btn playback-control-btn ${isPlaying ? 'btn-active' : ''}`}
          type="button"
          onClick={onPlayPauseToggle}
          disabled={!canTogglePlay || stepControlsDisabled}
        >
          {playLabel}
        </button>
        <button
          className="btn playback-control-btn"
          type="button"
          onClick={onNext}
          disabled={!canStepForward || stepControlsDisabled}
        >
          Next
        </button>
      </div>
      <label className="field playback-speed-field">
        <span>Speed</span>
        <input
          className="slider"
          type="range"
          min={0}
          max={100}
          step="any"
          value={speed}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          disabled={!canTogglePlay || stepControlsDisabled}
        />
      </label>
    </div>
  )
}
