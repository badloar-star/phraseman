"use strict";
// ════════════════════════════════════════════════════════════════════════════
// constellations/hex.ts — чистая гекс-математика игры «Созвездия» (спек A1).
//
// Карта: гексагональное поле радиуса 3 в axial-координатах (q, r) — 37 звёзд.
// Кольца по дистанции от центра: 0 = Полярная, 1 = внутреннее (6),
// 2 = среднее (12), 3 = внешнее (18). Родные звёзды 4 игроков — две пары
// противоположных углов внешнего кольца: у каждого игрока идентичный набор
// дистанций до врагов {3, 6, 6} — «мне достался угол хуже» исключено.
//
// БЕЗ firebase-admin: юнит-тесты тривиальны, модуль переиспользуем клиентом
// (те же формулы соседства/колец обязаны совпадать на обеих сторонах).
// Раскладка детерминирована сидом mapSeed — реплеи/разборы бесплатно.
// ════════════════════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAR_COUNT = exports.MAP_RADIUS = void 0;
exports.hexKey = hexKey;
exports.parseHexKey = parseHexKey;
exports.hexDistance = hexDistance;
exports.hexNeighbors = hexNeighbors;
exports.isOnMap = isOnMap;
exports.neighborsInMap = neighborsInMap;
exports.ringOf = ringOf;
exports.allMapHexes = allMapHexes;
exports.createSeededRand = createSeededRand;
exports.generateMap = generateMap;
exports.validateMapSymmetry = validateMapSymmetry;
exports.connectedGroups = connectedGroups;
exports.MAP_RADIUS = 3;
exports.STAR_COUNT = 37;
const CENTER = { q: 0, r: 0 };
const HEX_DIRECTIONS = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
];
// Углы внешнего кольца в порядке обхода: соседние — дистанция 3, любые
// несоседние — 6 (гексовая метрика, не евклидова).
const OUTER_CORNERS = [
    { q: 3, r: 0 },
    { q: 3, r: -3 },
    { q: 0, r: -3 },
    { q: -3, r: 0 },
    { q: -3, r: 3 },
    { q: 0, r: 3 },
];
function hexKey(h) {
    return `${h.q},${h.r}`;
}
const HEX_KEY_RE = /^(-?\d+),(-?\d+)$/;
function parseHexKey(key) {
    const m = HEX_KEY_RE.exec(key);
    if (!m)
        throw new Error(`Bad hex key: ${key}`);
    return { q: Number(m[1]), r: Number(m[2]) };
}
function hexDistance(a, b) {
    const dq = a.q - b.q;
    const dr = a.r - b.r;
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}
function hexNeighbors(h) {
    return HEX_DIRECTIONS.map((d) => ({ q: h.q + d.q, r: h.r + d.r }));
}
function isOnMap(h) {
    return hexDistance(h, CENTER) <= exports.MAP_RADIUS;
}
function neighborsInMap(h) {
    return hexNeighbors(h).filter(isOnMap);
}
function ringOf(h) {
    const d = hexDistance(h, CENTER);
    switch (d) {
        case 0: return 'polar';
        case 1: return 'inner';
        case 2: return 'middle';
        case 3: return 'outer';
        default: throw new Error(`Hex ${hexKey(h)} is off the map (distance ${d})`);
    }
}
function allMapHexes() {
    const cells = [];
    for (let q = -exports.MAP_RADIUS; q <= exports.MAP_RADIUS; q += 1) {
        for (let r = -exports.MAP_RADIUS; r <= exports.MAP_RADIUS; r += 1) {
            const h = { q, r };
            if (isOnMap(h))
                cells.push(h);
        }
    }
    return cells;
}
// ── Детерминированный PRNG от строкового сида (FNV-1a → mulberry32) ─────────
// Date.now()/Math.random() здесь запрещены по построению: одна и та же
// раскладка обязана воспроизводиться из mapSeed документа матча.
/** Сидированный PRNG для детерминированных решений (боты, карта). */
function createSeededRand(seed) {
    return mulberry32(hashSeed(seed));
}
function hashSeed(seed) {
    let h = 0x811c9dc5;
    for (let i = 0; i < seed.length; i += 1) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}
function mulberry32(a) {
    let state = a >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/**
 * Генерирует раскладку родных звёзд от сида: поворот пары противоположных
 * углов (6 вариантов) + перемешивание назначения слотов. Раскладка всегда
 * проходит validateMapSymmetry — это инвариант, закреплённый тестом.
 */
function generateMap(seed) {
    const rand = mulberry32(hashSeed(seed));
    const rotation = Math.floor(rand() * 6);
    // Две пары противоположных углов: k, k+1, k+3, k+4 (mod 6).
    const cornerIdx = [0, 1, 3, 4].map((offset) => (rotation + offset) % 6);
    const corners = cornerIdx.map((i) => hexKey(OUTER_CORNERS[i]));
    // Fisher–Yates на 4 элементах: какой слот какой угол получает.
    const homes = [...corners];
    for (let i = homes.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rand() * (i + 1));
        [homes[i], homes[j]] = [homes[j], homes[i]];
    }
    return { seed, homes };
}
/**
 * Валидатор симметрии (спек A1): 4 разных дома, все на внешнем кольце,
 * у каждого набор дистанций до остальных ровно {3, 6, 6}.
 */
function validateMapSymmetry(map) {
    if (!Array.isArray(map.homes) || map.homes.length !== 4)
        return false;
    let homes;
    try {
        homes = map.homes.map(parseHexKey);
    }
    catch {
        return false;
    }
    if (new Set(map.homes).size !== 4)
        return false;
    for (const home of homes) {
        if (hexDistance(home, CENTER) !== exports.MAP_RADIUS)
            return false;
        const dists = homes
            .filter((other) => other !== home)
            .map((other) => hexDistance(home, other))
            .sort((a, b) => a - b);
        if (dists[0] !== 3 || dists[1] !== 6 || dists[2] !== 6)
            return false;
    }
    return true;
}
/**
 * Связные компоненты множества звёзд по смежности на карте — «созвездия».
 * Используется бонусом смежности (A7a) и подсветкой линий на клиенте.
 */
function connectedGroups(keys) {
    const remaining = new Set(keys);
    const groups = [];
    for (const start of keys) {
        if (!remaining.has(start))
            continue;
        const group = [];
        const queue = [start];
        remaining.delete(start);
        while (queue.length > 0) {
            const key = queue.pop();
            group.push(key);
            for (const n of neighborsInMap(parseHexKey(key))) {
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
//# sourceMappingURL=hex.js.map