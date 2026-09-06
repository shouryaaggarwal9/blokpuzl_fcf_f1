export const GRID_SIZE = 10;
export const CELL_SIZE = 40;
export const CELL_GAP = 4;
export const BOARD_TOP_Y = 150;

export interface ShapeTemplate {
  name: string;
  coords: [number, number][];
  color: number;
}

export const SHAPES: ShapeTemplate[] = [
  // --- SINGLE & SQUARES ---
  { name: "1x1", coords: [[0, 0]], color: 0x38bdf8 },
  {
    name: "2x2",
    coords: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    color: 0xf59e0b,
  },
  {
    name: "3x3",
    coords: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ],
    color: 0xec4899,
  },

  // --- STRAIGHT LINES (2, 3, AND 4 ONLY) ---
  {
    name: "I2",
    coords: [
      [0, 0],
      [1, 0],
    ],
    color: 0x10b981,
  },
  {
    name: "H2",
    coords: [
      [0, 0],
      [0, 1],
    ],
    color: 0x10b981,
  },
  {
    name: "I3",
    coords: [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    color: 0x06b6d4,
  },
  {
    name: "H3",
    coords: [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    color: 0x06b6d4,
  },
  {
    name: "I4",
    coords: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ],
    color: 0x6366f1,
  },
  {
    name: "H4",
    coords: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
    color: 0x6366f1,
  },

  // --- T-SHAPES ---
  {
    name: "T-Down",
    coords: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 1],
    ],
    color: 0xa855f7,
  },
  {
    name: "T-Up",
    coords: [
      [1, 0],
      [1, 1],
      [1, 2],
      [0, 1],
    ],
    color: 0xa855f7,
  },
  {
    name: "T-Right",
    coords: [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ],
    color: 0xa855f7,
  },
  {
    name: "T-Left",
    coords: [
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 0],
    ],
    color: 0xa855f7,
  },

  // --- Z & S SHAPES ---
  {
    name: "Z-Horiz",
    coords: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
    color: 0xef4444,
  },
  {
    name: "Z-Vert",
    coords: [
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
    ],
    color: 0xef4444,
  },
  {
    name: "S-Horiz",
    coords: [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
    ],
    color: 0x22c55e,
  },
  {
    name: "S-Vert",
    coords: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
    color: 0x22c55e,
  },

  // --- CORNERS ---
  {
    name: "Corner-TL",
    coords: [
      [0, 0],
      [1, 0],
      [1, 1],
    ],
    color: 0xeab308,
  },
  {
    name: "Corner-TR",
    coords: [
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    color: 0xeab308,
  },
  {
    name: "Corner-BL",
    coords: [
      [0, 0],
      [0, 1],
      [1, 0],
    ],
    color: 0xeab308,
  },
  {
    name: "Corner-BR",
    coords: [
      [0, 0],
      [0, 1],
      [1, 1],
    ],
    color: 0xeab308,
  },

  // --- BIG CORNERS ---
  {
    name: "BigCorner-TL",
    coords: [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
      [2, 2],
    ],
    color: 0xf97316,
  },
  {
    name: "BigCorner-BR",
    coords: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ],
    color: 0xf97316,
  },
];
