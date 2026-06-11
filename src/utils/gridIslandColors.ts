export type IslandHSL = { h: number; s: number; l: number }

type HueBand = { center: number; radius: number }

// Hue ranges reserved by the grid UI: orange (frontier), yellow (visited water),
// green (raw island cells), and blue/cyan (current cell).
const FORBIDDEN: HueBand[] = [
  { center: 40,  radius: 30 },  // orange + yellow: 10°–70°
  { center: 120, radius: 25 },  // green: 95°–145°
  { center: 205, radius: 35 },  // cyan + blue: 170°–240°
]

// Fixed palette for the first few islands — muted enough not to clash with UI state colors.
// Ordered by perceptual distinctiveness; all hues are outside the FORBIDDEN bands.
const PALETTE: IslandHSL[] = [
  { h: 350, s: 62, l: 60 },  // rose
  { h: 270, s: 58, l: 63 },  // purple
  { h: 318, s: 60, l: 63 },  // pink
  { h: 158, s: 52, l: 50 },  // teal
]

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

// Returns a cryptographically random float in [0, 1) for seeding the golden-ratio hue walk.
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
