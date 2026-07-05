// ════════════════════════════════════════════════════════════════════════════
// constellations_hex.ts — клиентская гекс-геометрия «Созвездий» (спек A1/F3).
//
// Клиентская копия серверной математики functions/src/constellations/hex.ts:
// те же axial-координаты, кольца и соседство ОБЯЗАНЫ совпадать с сервером
// (легальность целей, линии созвездий). Плюс чисто клиентское: axial → пиксели
// (pointy-top) для отрисовки карты на react-native-svg.
//
// Никакого Firestore и React — чистые функции, дёшево тестируются.
// ════════════════════════════════════════════════════════════════════════════

export interface Hex {
  q: number;
  r: number;
}

export type ConstellationRing = 'polar' | 'inner' | 'middle' | 'outer';

export const CONSTELLATION_MAP_RADIUS = 3;
export const CONSTELLATION_STAR_COUNT = 37;

const HEX_DIRECTIONS: readonly Hex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function hexKey(h: Hex): string {
  return `${h.q},${h.r}`;
}

const HEX_KEY_RE = /^(-?\d+),(-?\d+)$/;

export function parseHexKey(key: string): Hex | null {
  const m = HEX_KEY_RE.exec(key);
  if (!m) return null;
  return { q: Number(m[1]), r: Number(m[2]) };
}

export function hexDistance(a: Hex, b: Hex): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export function isOnMap(h: Hex): boolean {
  return hexDistance(h, { q: 0, r: 0 }) <= CONSTELLATION_MAP_RADIUS;
}

export function neighborsInMap(h: Hex): Hex[] {
  return HEX_DIRECTIONS
    .map((d) => ({ q: h.q + d.q, r: h.r + d.r }))
    .filter(isOnMap);
}

export function ringOf(h: Hex): ConstellationRing {
  switch (hexDistance(h, { q: 0, r: 0 })) {
    case 0: return 'polar';
    case 1: return 'inner';
    case 2: return 'middle';
    default: return 'outer';
  }
}

export function allMapHexes(): Hex[] {
  const cells: Hex[] = [];
  for (let q = -CONSTELLATION_MAP_RADIUS; q <= CONSTELLATION_MAP_RADIUS; q += 1) {
    for (let r = -CONSTELLATION_MAP_RADIUS; r <= CONSTELLATION_MAP_RADIUS; r += 1) {
      if (isOnMap({ q, r })) cells.push({ q, r });
    }
  }
  return cells;
}

/** Смежны ли две звезды (для линий созвездий). */
export function areNeighbors(a: Hex, b: Hex): boolean {
  return hexDistance(a, b) === 1;
}

/** Связные группы своих звёзд — созвездия (A7a): линии рисуем внутри групп 3+. */
export function connectedGroups(keys: readonly string[]): string[][] {
  const remaining = new Set(keys);
  const groups: string[][] = [];
  for (const start of keys) {
    if (!remaining.has(start)) continue;
    const group: string[] = [];
    const queue = [start];
    remaining.delete(start);
    while (queue.length > 0) {
      const key = queue.pop() as string;
      group.push(key);
      const h = parseHexKey(key);
      if (!h) continue;
      for (const n of neighborsInMap(h)) {
        const nKey = hexKey(n);
        if (remaining.has(nKey)) {
          remaining.delete(nKey);
          queue.push(nKey);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}

// ── Пиксельная раскладка (pointy-top) ───────────────────────────────────────

export interface HexPixel {
  x: number;
  y: number;
}

const SQRT3 = Math.sqrt(3);

/** Центр гекса в пикселях; size — радиус гекса (центр→вершина). */
export function hexToPixel(h: Hex, size: number): HexPixel {
  return {
    x: size * SQRT3 * (h.q + h.r / 2),
    y: size * 1.5 * h.r,
  };
}

/** Вершины гекса (pointy-top) вокруг центра — строка для svg <Polygon points>. */
export function hexCornerPoints(center: HexPixel, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${center.x + size * Math.cos(angle)},${center.y + size * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

export interface MapLayout {
  /** Ключ → центр в пикселях (в системе с (0,0) в центре Полярной). */
  centers: Record<string, HexPixel>;
  /** Полные габариты карты с полем margin. */
  width: number;
  height: number;
  /** Смещение, переводящее центры в положительные координаты svg. */
  offsetX: number;
  offsetY: number;
}

/** Раскладка всей карты: 37 центров + габариты под viewBox. */
export function buildMapLayout(hexSize: number, margin: number): MapLayout {
  const centers: Record<string, HexPixel> = {};
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  for (const h of allMapHexes()) {
    const p = hexToPixel(h, hexSize);
    centers[hexKey(h)] = p;
    minX = Math.min(minX, p.x - hexSize);
    maxX = Math.max(maxX, p.x + hexSize);
    minY = Math.min(minY, p.y - hexSize);
    maxY = Math.max(maxY, p.y + hexSize);
  }
  return {
    centers,
    width: maxX - minX + margin * 2,
    height: maxY - minY + margin * 2,
    offsetX: -minX + margin,
    offsetY: -minY + margin,
  };
}
