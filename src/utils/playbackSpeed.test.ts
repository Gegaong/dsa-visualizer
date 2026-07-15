import { describe, it, expect } from 'vitest'

import {
  BINARY_TREE_PLAYBACK_DEFAULT_DELAY_MS,
  GRID_PLAYBACK_DEFAULT_DELAY_MS,
  GRID_PLAYBACK_MAX_DELAY_MS,
  GRID_PLAYBACK_MIN_DELAY_MS,
  NQUEENS_PLAYBACK_DEFAULT_DELAY_MS,
  NQUEENS_PLAYBACK_MAX_DELAY_MS,
  NQUEENS_PLAYBACK_MIN_DELAY_MS,
  PLAYBACK_DEFAULT_DELAY_MS,
  PLAYBACK_MAX_DELAY_MS,
  PLAYBACK_MIN_DELAY_MS,
} from './constants'
import { getPlaybackDelayMs, PLAYBACK_SLIDER_CENTER } from './playbackSpeed'

describe('getPlaybackDelayMs', () => {
  const min = PLAYBACK_MIN_DELAY_MS
  const max = PLAYBACK_MAX_DELAY_MS
  const def = PLAYBACK_DEFAULT_DELAY_MS

  it('puts the default delay at the slider midpoint', () => {
    expect(getPlaybackDelayMs(PLAYBACK_SLIDER_CENTER, min, max, def)).toBe(def)
  })

  it('maps the slow end to maxDelay and the fast end to minDelay', () => {
    expect(getPlaybackDelayMs(0, min, max, def)).toBe(max)
    expect(getPlaybackDelayMs(100, min, max, def)).toBe(min)
  })

  it('interpolates independently on each side of the midpoint', () => {
    expect(getPlaybackDelayMs(25, min, max, def)).toBe(Math.round((max + def) / 2))
    expect(getPlaybackDelayMs(75, min, max, def)).toBe(Math.round((def + min) / 2))
  })

  it('clamps out-of-range slider values', () => {
    expect(getPlaybackDelayMs(-10, min, max, def)).toBe(max)
    expect(getPlaybackDelayMs(200, min, max, def)).toBe(min)
  })

  it('clamps a defaultDelay that sits outside [min, max]', () => {
    expect(getPlaybackDelayMs(50, 10, 100, 500)).toBe(100)
    expect(getPlaybackDelayMs(50, 10, 100, 1)).toBe(10)
  })

  it('is monotonically non-increasing as the slider moves right (faster)', () => {
    let prev = Number.POSITIVE_INFINITY
    for (let speed = 0; speed <= 100; speed += 1) {
      const delay = getPlaybackDelayMs(speed, min, max, def)
      expect(delay).toBeLessThanOrEqual(prev)
      prev = delay
    }
  })
})

describe('preserved historical default delays', () => {
  it('keeps graph/grid/nqueens defaults equal to the old linear-slider endpoints', () => {
    expect(PLAYBACK_DEFAULT_DELAY_MS).toBe(Math.round(7000 - 0.81 * (7000 - 1)))
    expect(GRID_PLAYBACK_DEFAULT_DELAY_MS).toBe(Math.round(300 - 0.89 * (300 - 1)))
    expect(NQUEENS_PLAYBACK_DEFAULT_DELAY_MS).toBe(Math.round(3525 - 0.89 * (3525 - 1)))
  })

  it('centers each family default on slider 50 while keeping its min/max ends', () => {
    expect(getPlaybackDelayMs(50, PLAYBACK_MIN_DELAY_MS, PLAYBACK_MAX_DELAY_MS, PLAYBACK_DEFAULT_DELAY_MS))
      .toBe(PLAYBACK_DEFAULT_DELAY_MS)
    expect(getPlaybackDelayMs(0, PLAYBACK_MIN_DELAY_MS, PLAYBACK_MAX_DELAY_MS, PLAYBACK_DEFAULT_DELAY_MS))
      .toBe(PLAYBACK_MAX_DELAY_MS)
    expect(getPlaybackDelayMs(100, PLAYBACK_MIN_DELAY_MS, PLAYBACK_MAX_DELAY_MS, PLAYBACK_DEFAULT_DELAY_MS))
      .toBe(PLAYBACK_MIN_DELAY_MS)

    expect(getPlaybackDelayMs(50, GRID_PLAYBACK_MIN_DELAY_MS, GRID_PLAYBACK_MAX_DELAY_MS, GRID_PLAYBACK_DEFAULT_DELAY_MS))
      .toBe(GRID_PLAYBACK_DEFAULT_DELAY_MS)
    expect(getPlaybackDelayMs(0, GRID_PLAYBACK_MIN_DELAY_MS, GRID_PLAYBACK_MAX_DELAY_MS, GRID_PLAYBACK_DEFAULT_DELAY_MS))
      .toBe(GRID_PLAYBACK_MAX_DELAY_MS)
    expect(getPlaybackDelayMs(100, GRID_PLAYBACK_MIN_DELAY_MS, GRID_PLAYBACK_MAX_DELAY_MS, GRID_PLAYBACK_DEFAULT_DELAY_MS))
      .toBe(GRID_PLAYBACK_MIN_DELAY_MS)

    expect(getPlaybackDelayMs(50, NQUEENS_PLAYBACK_MIN_DELAY_MS, NQUEENS_PLAYBACK_MAX_DELAY_MS, NQUEENS_PLAYBACK_DEFAULT_DELAY_MS))
      .toBe(NQUEENS_PLAYBACK_DEFAULT_DELAY_MS)
    expect(getPlaybackDelayMs(0, NQUEENS_PLAYBACK_MIN_DELAY_MS, NQUEENS_PLAYBACK_MAX_DELAY_MS, NQUEENS_PLAYBACK_DEFAULT_DELAY_MS))
      .toBe(NQUEENS_PLAYBACK_MAX_DELAY_MS)
    expect(getPlaybackDelayMs(100, NQUEENS_PLAYBACK_MIN_DELAY_MS, NQUEENS_PLAYBACK_MAX_DELAY_MS, NQUEENS_PLAYBACK_DEFAULT_DELAY_MS))
      .toBe(NQUEENS_PLAYBACK_MIN_DELAY_MS)
  })

  it('uses a faster binary-tree default while sharing the graph min/max range', () => {
    expect(BINARY_TREE_PLAYBACK_DEFAULT_DELAY_MS).toBeLessThan(PLAYBACK_DEFAULT_DELAY_MS)
    expect(getPlaybackDelayMs(50, PLAYBACK_MIN_DELAY_MS, PLAYBACK_MAX_DELAY_MS, BINARY_TREE_PLAYBACK_DEFAULT_DELAY_MS))
      .toBe(BINARY_TREE_PLAYBACK_DEFAULT_DELAY_MS)
    expect(getPlaybackDelayMs(0, PLAYBACK_MIN_DELAY_MS, PLAYBACK_MAX_DELAY_MS, BINARY_TREE_PLAYBACK_DEFAULT_DELAY_MS))
      .toBe(PLAYBACK_MAX_DELAY_MS)
    expect(getPlaybackDelayMs(100, PLAYBACK_MIN_DELAY_MS, PLAYBACK_MAX_DELAY_MS, BINARY_TREE_PLAYBACK_DEFAULT_DELAY_MS))
      .toBe(PLAYBACK_MIN_DELAY_MS)
  })
})
