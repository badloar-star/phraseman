"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hex_1 = require("./hex");
describe('constellations/hex — базовая математика', () => {
    test('карта радиуса 3 содержит ровно 37 звёзд', () => {
        expect(hex_1.MAP_RADIUS).toBe(3);
        expect((0, hex_1.allMapHexes)()).toHaveLength(hex_1.STAR_COUNT);
        expect(hex_1.STAR_COUNT).toBe(37);
    });
    test('кольца: полярная 1 / внутреннее 6 / среднее 12 / внешнее 18', () => {
        const byRing = { polar: 0, inner: 0, middle: 0, outer: 0 };
        for (const h of (0, hex_1.allMapHexes)())
            byRing[(0, hex_1.ringOf)(h)] += 1;
        expect(byRing).toEqual({ polar: 1, inner: 6, middle: 12, outer: 18 });
    });
    test('ringOf бросает для клетки вне карты', () => {
        expect(() => (0, hex_1.ringOf)({ q: 4, r: 0 })).toThrow();
    });
    test('hexKey/parseHexKey — обратимы, мусор отклоняется', () => {
        const h = { q: -2, r: 3 };
        expect((0, hex_1.parseHexKey)((0, hex_1.hexKey)(h))).toEqual(h);
        expect(() => (0, hex_1.parseHexKey)('garbage')).toThrow();
        expect(() => (0, hex_1.parseHexKey)('1,NaN')).toThrow();
    });
    test('дистанция: симметрична, 0 к себе, диаметр карты = 6', () => {
        const a = { q: 3, r: 0 };
        const b = { q: -3, r: 0 };
        expect((0, hex_1.hexDistance)(a, a)).toBe(0);
        expect((0, hex_1.hexDistance)(a, b)).toBe((0, hex_1.hexDistance)(b, a));
        expect((0, hex_1.hexDistance)(a, b)).toBe(6);
    });
    test('соседи: всегда 6 сырых; в карте у угла внешнего кольца только 3', () => {
        expect((0, hex_1.hexNeighbors)({ q: 0, r: 0 })).toHaveLength(6);
        const cornerNeighbors = (0, hex_1.neighborsInMap)({ q: 3, r: 0 });
        expect(cornerNeighbors).toHaveLength(3);
        for (const n of cornerNeighbors)
            expect((0, hex_1.isOnMap)(n)).toBe(true);
    });
});
describe('constellations/hex — генерация карты от сида', () => {
    test('детерминизм: один сид → одна карта', () => {
        const a = (0, hex_1.generateMap)('match-123');
        const b = (0, hex_1.generateMap)('match-123');
        expect(a).toEqual(b);
    });
    test('разные сиды дают разные раскладки хотя бы иногда', () => {
        const homes = new Set();
        for (let i = 0; i < 20; i += 1)
            homes.add((0, hex_1.generateMap)(`seed-${i}`).homes.join('|'));
        expect(homes.size).toBeGreaterThan(1);
    });
    test('родные звёзды: 4 разных, все на внешнем кольце', () => {
        const map = (0, hex_1.generateMap)('any-seed');
        expect(new Set(map.homes).size).toBe(4);
        for (const key of map.homes) {
            expect((0, hex_1.ringOf)((0, hex_1.parseHexKey)(key))).toBe('outer');
        }
    });
    test('симметрия: каждый игрок эквидистантен центру и имеет одинаковый набор дистанций до врагов {3,6,6}', () => {
        const map = (0, hex_1.generateMap)('sym-check');
        expect((0, hex_1.validateMapSymmetry)(map)).toBe(true);
        for (const key of map.homes) {
            const home = (0, hex_1.parseHexKey)(key);
            expect((0, hex_1.hexDistance)(home, { q: 0, r: 0 })).toBe(hex_1.MAP_RADIUS);
            const dists = map.homes
                .filter((k) => k !== key)
                .map((k) => (0, hex_1.hexDistance)(home, (0, hex_1.parseHexKey)(k)))
                .sort((x, y) => x - y);
            expect(dists).toEqual([3, 6, 6]);
        }
    });
    test('validateMapSymmetry ловит битые раскладки', () => {
        expect((0, hex_1.validateMapSymmetry)({ seed: 'x', homes: ['0,0', '3,0', '-3,0', '0,3'] })).toBe(false); // дом в центре
        expect((0, hex_1.validateMapSymmetry)({ seed: 'x', homes: ['3,0', '3,0', '-3,0', '0,3'] })).toBe(false); // дубль
        expect((0, hex_1.validateMapSymmetry)({ seed: 'x', homes: ['3,0', '-3,0'] })).toBe(false); // не 4 дома
        expect((0, hex_1.validateMapSymmetry)({ seed: 'x', homes: ['3,0', '2,-3', '-3,0', '-2,3'] })).toBe(false); // кривые дистанции
    });
});
describe('constellations/hex — связные группы (созвездия)', () => {
    test('пустой список → нет групп', () => {
        expect((0, hex_1.connectedGroups)([])).toEqual([]);
    });
    test('3 смежные звезды образуют одну группу, отдельная звезда — свою', () => {
        const groups = (0, hex_1.connectedGroups)(['0,0', '1,0', '1,-1', '3,0']);
        const sizes = groups.map((g) => g.length).sort((a, b) => a - b);
        expect(sizes).toEqual([1, 3]);
    });
    test('диагональные (несмежные) звезды не склеиваются', () => {
        const groups = (0, hex_1.connectedGroups)(['0,0', '2,0']);
        expect(groups).toHaveLength(2);
    });
});
//# sourceMappingURL=hex.test.js.map