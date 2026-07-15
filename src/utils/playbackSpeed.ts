/**
 * Playback slider → delay (ms).
 *
 * Slider is always centered at 50 for the default delay:
 *   0   → maxDelay (slowest)
 *   50  → defaultDelay
 *  100  → minDelay (fastest)
 *
 * Left and right halves stretch independently, so an asymmetric default
 * (closer to "fast" than "slow") still sits in the middle of the UI.
 */
export function getPlaybackDelayMs(
  speedValue: number,
  minDelay: number,
  maxDelay: number,
  defaultDelay: number,
): number {
  const clampedSpeed = Math.min(100, Math.max(0, speedValue))
  const lo = Math.min(minDelay, maxDelay)
  const hi = Math.max(minDelay, maxDelay)
  const mid = Math.min(hi, Math.max(lo, defaultDelay))

  if (clampedSpeed <= 50) {
    const t = clampedSpeed / 50
    return Math.round(hi + t * (mid - hi))
  }

  const t = (clampedSpeed - 50) / 50
  return Math.round(mid + t * (lo - mid))
}

/** Slider value that maps to `defaultDelay` via getPlaybackDelayMs. */
export const PLAYBACK_SLIDER_CENTER = 50
