import { DISTINCT_PALETTE } from './weakCCOutlineHues'
export type IslandHSL = { h: number; s: number; l: number }

type HueBand = { center: number; radius: number }

const FORBIDDEN: HueBand[] = [
  { center: 50,  radius: 20 },
  { center: 120, radius: 20 },
  { center: 195, radius: 20 },
]

// Shortest angular distance between two hues on the [0, 360) circle.
function circularDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

// True if hue `h` falls inside any forbidden band (reserved for water/frontier/current cell colors).
function isForbidden(h: number): boolean {
  return FORBIDDEN.some(({ center, radius }) => circularDist(h, center) < radius)
}

const PALETTE: IslandHSL[] = DISTINCT_PALETTE.filter(({ h }) => !isForbidden(h))

// Returns hue arcs safe to use — the interval complement of FORBIDDEN bands on [0, 360).
function buildSafeArcs(): Array<[number, number]> {
  const bands = FORBIDDEN.flatMap(({ center, radius }) => {
    const a = (center - radius + 360) % 360
    const b = (center + radius) % 360
    return a < b ? [[a, b] as [number, number]] : [[0, b] as [number, number], [a, 360] as [number, number]]
  }).sort(([a], [b]) => a - b)

  const merged: Array<[number, number]> = []
  for (const iv of bands) {
    if (merged.length && iv[0] <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], iv[1])
    } else {
      merged.push([...iv])
    }
  }

  const safe: Array<[number, number]> = []
  let pos = 0
  for (const [s, e] of merged) {
    if (pos < s) safe.push([pos, s])
    pos = e
  }
  if (pos < 360) safe.push([pos, 360])
  return safe
}

const SAFE_ARCS = buildSafeArcs()
const SAFE_TOTAL = SAFE_ARCS.reduce((sum, [s, e]) => sum + e - s, 0)

const GOLDEN_RATIO = 0.6180339887

function randomFloat(): number {
  const u = new Uint32Array(1)
  globalThis.crypto.getRandomValues(u)
  return u[0] / 2 ** 32
}

// Maps golden-ratio steps proportionally across all safe arcs so no two successive islands cluster near a forbidden-zone edge.
function generateSafeHue(seed: number, index: number): number {
  let offset = ((seed + index * GOLDEN_RATIO) % 1) * SAFE_TOTAL
  for (const [start, end] of SAFE_ARCS) {
    const w = end - start
    if (offset < w) return start + offset
    offset -= w
  }
  return SAFE_ARCS[0][0]
}

// Assigns a distinct HSL color to each island group, avoiding hues reserved for UI states.
export function buildGridIslandColorMap(groups: string[][]): Map<string, IslandHSL> {
  const map = new Map<string, IslandHSL>()
  if (groups.length === 0) return map
  const seed = randomFloat()
  groups.forEach((cells, i) => {
    const hsl = i < PALETTE.length
      ? PALETTE[i]
      : { h: generateSafeHue(seed, i), s: 75, l: 55 }
    cells.forEach(k => map.set(k, hsl))
  })
  return map
}
