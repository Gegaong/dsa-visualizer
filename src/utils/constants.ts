export const NODE_SIZE = 48
export const NODE_RADIUS = NODE_SIZE / 2
export const NODE_GAP = 8 // extra spacing between nodes (in px)
export const MIN_EDGE_VISUAL_LENGTH = 20
export const MIN_TOGGLE_EDGE_LENGTH = 36
export const TINY_EDGE_MARKER_EDGE_LENGTH = 16
export const SHORT_EDGE_MARKER_EDGE_LENGTH = 26
export const DEFAULT_CANVAS_WIDTH = 720
export const DEFAULT_CANVAS_HEIGHT = 560
export const DRAG_THRESHOLD = 3

// Shared playback timer bounds (ms). Slider maps through getPlaybackDelayMs so the
// default delay always sits at the midpoint (50), even when it isn't halfway between min/max.
export const PLAYBACK_MIN_DELAY_MS = 1
export const PLAYBACK_MAX_DELAY_MS = 7000
// Preserves the old linear mapping at slider=81: round(7000 - 0.81*(7000-1)).
export const PLAYBACK_DEFAULT_DELAY_MS = 1331

// Binary-tree line-by-line exec has many more steps than graph visit playback, so the
// default cadence is faster while keeping the same outer min/max range.
export const BINARY_TREE_PLAYBACK_DEFAULT_DELAY_MS = 250

// Grid search uses a tighter range (dense cell-by-cell updates).
export const GRID_PLAYBACK_MIN_DELAY_MS = PLAYBACK_MIN_DELAY_MS
export const GRID_PLAYBACK_MAX_DELAY_MS = 300
// Preserves old linear mapping at slider=89: round(300 - 0.89*(300-1)).
export const GRID_PLAYBACK_DEFAULT_DELAY_MS = 34

// N-Queens backtracking also keeps its prior default cadence.
export const NQUEENS_PLAYBACK_MIN_DELAY_MS = PLAYBACK_MIN_DELAY_MS
export const NQUEENS_PLAYBACK_MAX_DELAY_MS = 3525
// Preserves old linear mapping at slider=89: round(3525 - 0.89*(3525-1)).
export const NQUEENS_PLAYBACK_DEFAULT_DELAY_MS = 389

// Canvas zoom bounds and step size.
export const CANVAS_ZOOM_MIN = 0.5
export const CANVAS_ZOOM_MAX = 2
export const CANVAS_ZOOM_STEP = 0.1

// Grid canvas row count controls zoom; cols are derived from the aspect ratio.
export const GRID_ROWS_DEFAULT = 19
export const GRID_ROWS_MIN = 4
export const GRID_ROWS_MAX = 60
export const GRID_ZOOM_STEP = 3

// Binary tree canvas layout: unscaled spacing between leaf-slot columns and between depth levels.
// The whole tree is rendered at these sizes, then uniformly scaled down to fit the container
// (never scaled up past 1) — this produces the "zooms out as it grows" effect.
export const TREE_NODE_SIZE = 48
export const TREE_UNIT_WIDTH = 72
export const TREE_LEVEL_HEIGHT = 96
export const TREE_TOP_PADDING = 40
export const TREE_BOTTOM_PADDING = 40

// Deepest level (root = depth 0) a real node may occupy. Nodes at this depth no longer show
// add-slot indicators, capping how tall a subtree can grow.
// depth 19 => max height 20 levels.
export const TREE_MAX_DEPTH = 19
