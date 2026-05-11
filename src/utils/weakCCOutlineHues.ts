export type WeakCCOutlineHSL = { h: number; s: number; l: number }

const GOLDEN_RATIO = 0.6180339887

// The most perceptually distinct colors first, in order.
const DISTINCT_PALETTE: WeakCCOutlineHSL[] = [
  { h: 0,   s: 85, l: 55 },  // red
  { h: 210, s: 85, l: 55 },  // blue
  { h: 120, s: 65, l: 42 },  // green
  { h: 50,  s: 95, l: 52 },  // yellow
  { h: 30,  s: 90, l: 55 },  // orange
  { h: 270, s: 75, l: 60 },  // purple
  { h: 180, s: 70, l: 43 },  // cyan
  { h: 330, s: 80, l: 60 },  // pink
]

// Uniform [0, 1) from crypto RNG.
function randomFloat(): number {
  const u = new Uint32Array(1)
  globalThis.crypto.getRandomValues(u)
  return u[0] / 2 ** 32
}

// First 8 components get the most distinct colors; beyond that golden ratio stepping kicks in.
export function buildWeakCCOutlineHSLByNodeId(
  components: string[][],
): Map<string, WeakCCOutlineHSL> {
  const map = new Map<string, WeakCCOutlineHSL>()
  if (components.length === 0) return map

  const seed = randomFloat()

  components.forEach((nodeIds, i) => {
    const hsl = i < DISTINCT_PALETTE.length
      ? DISTINCT_PALETTE[i]
      : { h: ((seed + i * GOLDEN_RATIO) % 1) * 360, s: 75, l: 55 }

    nodeIds.forEach((id) => map.set(id, hsl))
  })

  return map
}