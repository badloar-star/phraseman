// Approved Horizons presentation only. No progression or reward authority.
import type { Theme } from "../../../constants/theme";
export const HORIZON_PALETTES = [
  {
    bg: "#101c19",
    surface: "#192b24",
    surface2: "#253c31",
    accent: "#d1ebbe",
    terrain: "#2b4b3b",
    terrain2: "#42654c",
    terrain3: "#709075",
    edge: "#42584a",
    muted: "#b1bfb1",
    gold: "#e5c48b",
  },
  {
    bg: "#101d22",
    surface: "#192c32",
    surface2: "#24414a",
    accent: "#b6e1de",
    terrain: "#294f56",
    terrain2: "#416a70",
    terrain3: "#6b9090",
    edge: "#425c62",
    muted: "#afbec2",
    gold: "#e1d1a6",
  },
  {
    bg: "#231916",
    surface: "#32231f",
    surface2: "#4a3228",
    accent: "#f4c8a6",
    terrain: "#604134",
    terrain2: "#835740",
    terrain3: "#b77e5b",
    edge: "#664a3e",
    muted: "#c8b7ac",
    gold: "#efd39e",
  },
  {
    bg: "#1b1927",
    surface: "#292437",
    surface2: "#3d344e",
    accent: "#d7c8f2",
    terrain: "#483d60",
    terrain2: "#635275",
    terrain3: "#8b779c",
    edge: "#564b64",
    muted: "#bfb6cb",
    gold: "#e7d4af",
  },
  {
    bg: "#211c13",
    surface: "#30291c",
    surface2: "#443a27",
    accent: "#efda9b",
    terrain: "#54482c",
    terrain2: "#76643b",
    terrain3: "#a58e59",
    edge: "#60543a",
    muted: "#c5bfac",
    gold: "#f0d59a",
  },
  {
    bg: "#171e27",
    surface: "#232e39",
    surface2: "#32424e",
    accent: "#c2dfef",
    terrain: "#3b5260",
    terrain2: "#526f7c",
    terrain3: "#7e9eab",
    edge: "#4e626e",
    muted: "#b9c4cc",
    gold: "#e2dabf",
  },
  {
    bg: "#24191e",
    surface: "#34262d",
    surface2: "#4b353f",
    accent: "#edc7cf",
    terrain: "#614450",
    terrain2: "#805b68",
    terrain3: "#ac818e",
    edge: "#68505a",
    muted: "#cbb7be",
    gold: "#ebc59e",
  },
] as const;
export type HorizonPalette = { [K in keyof (typeof HORIZON_PALETTES)[number]]: string };
export const HORIZON_ROUTES: readonly (readonly (readonly [
  number,
  number,
])[])[] = [
  [
    [78, 76],
    [185, 114],
    [289, 189],
    [217, 275],
    [98, 328],
    [117, 434],
    [265, 487],
    [284, 606],
  ],
  [
    [293, 75],
    [184, 104],
    [91, 179],
    [112, 282],
    [245, 318],
    [296, 424],
    [191, 483],
    [111, 607],
  ],
  [
    [89, 76],
    [115, 184],
    [253, 213],
    [294, 310],
    [177, 357],
    [78, 446],
    [186, 514],
    [283, 615],
  ],
  [
    [190, 71],
    [81, 155],
    [133, 249],
    [277, 253],
    [295, 362],
    [186, 428],
    [81, 515],
    [184, 612],
  ],
  [
    [73, 81],
    [201, 123],
    [292, 210],
    [179, 275],
    [89, 379],
    [209, 414],
    [296, 511],
    [187, 611],
  ],
  [
    [285, 83],
    [150, 119],
    [78, 226],
    [193, 259],
    [292, 361],
    [188, 429],
    [90, 493],
    [147, 614],
  ],
  [
    [193, 78],
    [285, 158],
    [240, 251],
    [110, 281],
    [80, 385],
    [213, 424],
    [295, 512],
    [188, 616],
  ],
];
export function horizonPalette(lesson: number, theme?: Theme): HorizonPalette {
  if (theme) return {
    bg: theme.bgPrimary, surface: theme.bgCard, surface2: theme.bgSurface2,
    accent: theme.accent, terrain: theme.bgSurface, terrain2: theme.bgSurface2,
    terrain3: theme.textMuted, edge: theme.borderLight, muted: theme.textMuted,
    gold: theme.gold,
  };
  return HORIZON_PALETTES[(Math.max(1, Math.floor(lesson)) - 1) % 7];
}
export function horizonChapter(session: number): number {
  return Math.min(7, Math.max(1, Math.ceil(session / 8)));
}
export function horizonRoutePath(chapter: number, count = 8): string {
  const points = HORIZON_ROUTES[Math.min(6, Math.max(0, chapter - 1))].slice(
    0,
    count,
  );
  return points
    .map(([x, y], i) =>
      i === 0
        ? `M${x} ${y}`
        : `C${points[i - 1][0]} ${(points[i - 1][1] + y) / 2} ${x} ${(points[i - 1][1] + y) / 2} ${x} ${y}`,
    )
    .join(" ");
}
