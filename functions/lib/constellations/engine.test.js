"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const engine_1 = require("./engine");
const hex_1 = require("./hex");
const CFG = config_1.CONSTELLATION_DEFAULTS;
// Раскладка без сида-рандома: углы поворота 0 — слоты по часовой.
const HOMES = ['3,0', '3,-3', '-3,0', '-3,3'];
function makeState(overrides) {
    const base = (0, engine_1.createInitialMatchState)({
        uids: ['u0', 'u1', 'u2', 'u3'],
        homes: HOMES,
        roundsTotal: CFG.roundsTotal,
        homeCores: CFG.homeCores,
    });
    return { ...base, ...overrides };
}
function noInput() {
    return { shields: [], attacks: [], duels: [], falling: [] };
}
describe('constellations/engine — стартовое состояние', () => {
    test('4 игрока владеют только родными звёздами, 3 ядра, раунд 1', () => {
        const s = makeState();
        expect(s.round).toBe(1);
        expect(s.stage).toBe('active');
        for (let slot = 0; slot < 4; slot += 1) {
            const p = s.players[slot];
            expect(p.cores).toBe(3);
            expect(p.status).toBe('alive');
            expect(s.stars[HOMES[slot]].owner).toBe(slot);
        }
        const owned = Object.values(s.stars).filter((st) => st.owner !== null);
        expect(owned).toHaveLength(4);
        expect(Object.keys(s.stars)).toHaveLength(37);
    });
});
describe('constellations/engine — легальные цели', () => {
    test('доступны только соседи своего созвездия, не свои звёзды', () => {
        const s = makeState();
        const targets = (0, engine_1.legalTargets)(s, 0); // дом 3,0 — угол, 3 соседа в карте
        expect(targets.sort()).toEqual(['2,0', '2,1', '3,-1'].sort());
    });
    test('падающий и выбитый не имеют целей', () => {
        const s = makeState();
        s.players[1] = { ...s.players[1], status: 'falling' };
        s.players[2] = { ...s.players[2], status: 'out' };
        expect((0, engine_1.legalTargets)(s, 1)).toEqual([]);
        expect((0, engine_1.legalTargets)(s, 2)).toEqual([]);
    });
});
describe('constellations/engine — конфликты (Столкновение)', () => {
    const action = (slot, target) => ({
        slot, target, shieldStarKey: null,
    });
    test('двое на одну звезду → дуэль; разные цели → одиночные', () => {
        const res = (0, engine_1.detectConflicts)([action(0, '0,0'), action(1, '0,0'), action(2, '-2,0')], { 0: 100, 1: 200, 2: 300, 3: 0 });
        expect(res.duels).toEqual([{ starKey: '0,0', slots: [0, 1] }]);
        expect(res.singles.map((a) => a.slot)).toEqual([2]);
        expect(res.outpaced).toEqual([]);
    });
    test('трое на одну звезду → дуэль двух БЛИЖАЙШИХ по силе, третий «опоздал» (1.2)', () => {
        // Рейтинги 100/300/200: минимальный разрыв у пары {100,200}=100 (slots 0,2)
        // берётся первым в порядке перебора. slot 1 (300) — самый сильный — «опоздал».
        // Так система больше НЕ штрафует сильных, сталкивая их лбами.
        const res = (0, engine_1.detectConflicts)([action(0, '0,0'), action(1, '0,0'), action(2, '0,0')], { 0: 100, 1: 300, 2: 200, 3: 0 });
        expect(res.duels).toEqual([{ starKey: '0,0', slots: [0, 2] }]);
        expect(res.outpaced).toEqual([1]);
    });
});
describe('constellations/engine — резолв атак', () => {
    test('успех против нейтральной: захват; идеальный → Сияние 1', () => {
        const s = makeState();
        const { state } = (0, engine_1.resolveRound)(s, {
            ...noInput(),
            attacks: [
                { slot: 0, target: '2,0', correctAll: true, perfect: true },
                { slot: 1, target: '2,-2', correctAll: true, perfect: false },
            ],
        }, CFG);
        expect(state.stars['2,0']).toEqual({ owner: 0, radiance: 1 });
        expect(state.stars['2,-2']).toEqual({ owner: 1, radiance: 0 });
        expect(state.players[0].perfectCaptures).toBe(1);
    });
    test('провал атаки: звезда не меняется', () => {
        const s = makeState();
        const { state } = (0, engine_1.resolveRound)(s, {
            ...noInput(),
            attacks: [{ slot: 0, target: '2,0', correctAll: false, perfect: false }],
        }, CFG);
        expect(state.stars['2,0'].owner).toBeNull();
    });
    test('успех против чужой: переход, Сияние ИЗНАШИВАЕТСЯ на 1, не обнуляется (1.5)', () => {
        const s = makeState();
        s.stars['2,0'] = { owner: 1, radiance: 2 };
        const { state } = (0, engine_1.resolveRound)(s, {
            ...noInput(),
            attacks: [{ slot: 0, target: '2,0', correctAll: true, perfect: false }],
        }, CFG);
        // Позиционная игра: укреплённый рубеж дороже отбивать — броня 2→1, не 0.
        expect(state.stars['2,0']).toEqual({ owner: 0, radiance: 1 });
    });
    test('исходное состояние не мутируется (иммутабельность)', () => {
        const s = makeState();
        const before = JSON.parse(JSON.stringify(s));
        (0, engine_1.resolveRound)(s, {
            ...noInput(),
            attacks: [{ slot: 0, target: '2,0', correctAll: true, perfect: true }],
        }, CFG);
        expect(s).toEqual(before);
    });
    test('Сияние центра держится выше: перехват Полярной с бронёй 3 → 2, не 0 (1.5)', () => {
        const s = makeState();
        s.stars['0,0'] = { owner: 1, radiance: 3 }; // центр, maxCenter=3
        const { state } = (0, engine_1.resolveRound)(s, {
            ...noInput(),
            attacks: [{ slot: 0, target: '0,0', correctAll: true, perfect: false }],
        }, CFG);
        expect(state.stars['0,0']).toEqual({ owner: 0, radiance: 2 }); // износ на 1
    });
    test('идеальный захват чужой брони: износ −1, потом +1 за идеал (1.5)', () => {
        const s = makeState();
        s.stars['2,0'] = { owner: 1, radiance: 2 };
        const { state } = (0, engine_1.resolveRound)(s, {
            ...noInput(),
            attacks: [{ slot: 0, target: '2,0', correctAll: true, perfect: true }],
        }, CFG);
        // среднее кольцо cap 2: worn 2→1, +1 идеал = 2
        expect(state.stars['2,0']).toEqual({ owner: 0, radiance: 2 });
    });
});
describe('constellations/engine — щит и дуэли', () => {
    test('щит поднимает Сияние своей звезды до капа 2', () => {
        const s = makeState();
        s.stars[HOMES[0]] = { owner: 0, radiance: 1 };
        const { state } = (0, engine_1.resolveRound)(s, {
            ...noInput(),
            shields: [{ slot: 0, starKey: HOMES[0] }],
        }, CFG);
        expect(state.stars[HOMES[0]].radiance).toBe(2);
        expect(state.players[0].shieldUsed).toBe(true);
    });
    test('дуэль: победитель забирает звезду, оба-мимо — звезда прежнему владельцу', () => {
        const s = makeState();
        const { state } = (0, engine_1.resolveRound)(s, {
            ...noInput(),
            duels: [{ starKey: '0,0', slots: [0, 1], winner: 1 }],
        }, CFG);
        expect(state.stars['0,0'].owner).toBe(1);
        const s2 = makeState();
        s2.stars['0,0'] = { owner: 2, radiance: 1 };
        const { state: state2 } = (0, engine_1.resolveRound)(s2, {
            ...noInput(),
            duels: [{ starKey: '0,0', slots: [0, 1], winner: null }],
        }, CFG);
        expect(state2.stars['0,0'].owner).toBe(2);
    });
});
describe('constellations/engine — ядра, выбивание, возрождение', () => {
    test('успешная атака дома снимает ядро; 0 ядер → СМЕЖНЫЕ звёзды атакующему + бонус', () => {
        const s = makeState();
        s.players[1] = { ...s.players[1], cores: 1 };
        s.stars['2,-2'] = { owner: 1, radiance: 0 }; // звезда жертвы, СМЕЖНАЯ с домом '3,-3'
        const { state, events } = (0, engine_1.resolveRound)(s, {
            ...noInput(),
            attacks: [{ slot: 0, target: HOMES[1], correctAll: true, perfect: false }],
        }, CFG);
        expect(state.players[1].cores).toBe(0);
        expect(state.stars[HOMES[1]].owner).toBe(0);
        // Смежная с захваченным домом — наследуется захватчиком (волна фронта).
        expect(state.stars['2,-2']).toEqual({ owner: 0, radiance: 0 });
        expect(state.players[0].bonusPoints).toBeGreaterThanOrEqual(CFG.scoring.eliminationBonus);
        expect(events.some((e) => e.type === 'eliminated' && e.slot === 1)).toBe(true);
    });
    test('выбивание: ОТРЕЗАННАЯ звезда жертвы освобождается, не достаётся лидеру (аудит: снежок)', () => {
        const s = makeState();
        s.players[1] = { ...s.players[1], cores: 1 };
        // Далёкая звезда жертвы, НЕ смежная с её домом '3,-3' → после выбивания
        // должна стать нейтральной, а не перейти slot 0 через анклав.
        s.stars['-2,2'] = { owner: 1, radiance: 0 };
        const { state } = (0, engine_1.resolveRound)(s, {
            ...noInput(),
            attacks: [{ slot: 0, target: HOMES[1], correctAll: true, perfect: false }],
        }, CFG);
        expect(state.stars[HOMES[1]].owner).toBe(0); // дом — захватчику (точка удара)
        expect(state.stars['-2,2'].owner).toBeNull(); // отрезанная — освобождена
    });
    test('первый вылет при >3 оставшихся раундах → падающая звезда', () => {
        const s = makeState(); // раунд 1 из 10, осталось 9
        s.players[1] = { ...s.players[1], cores: 1 };
        const { state } = (0, engine_1.resolveRound)(s, {
            ...noInput(),
            attacks: [{ slot: 0, target: HOMES[1], correctAll: true, perfect: false }],
        }, CFG);
        expect(state.players[1].status).toBe('falling');
    });
    test('поздний вылет (≤3 оставшихся) → сразу out', () => {
        const s = makeState({ round: 8 }); // после 8-го останется 2
        s.players[1] = { ...s.players[1], cores: 1 };
        const { state } = (0, engine_1.resolveRound)(s, {
            ...noInput(),
            attacks: [{ slot: 0, target: HOMES[1], correctAll: true, perfect: false }],
        }, CFG);
        expect(state.players[1].status).toBe('out');
    });
    test('падающая звезда: 2 верных ответа → возрождение с 2 ядрами и невредимостью home (1.3)', () => {
        const s = makeState();
        s.players[1] = { ...s.players[1], status: 'falling', fallingLight: 1, cores: 0 };
        const { state, events } = (0, engine_1.resolveRound)(s, {
            ...noInput(),
            falling: [{ slot: 1, answeredCorrect: true }],
        }, CFG);
        const p = state.players[1];
        expect(p.status).toBe('alive');
        expect(p.cores).toBe(2); // 1.3: 2 ядра, не 1 — иначе добьют сразу
        expect(p.rebirthUsed).toBe(true);
        expect(p.homeShieldUntilRound).toBe(state.round + CFG.rebirth.shieldRounds - 1);
        const home = state.players[1].homeStarKey;
        expect(state.stars[home].owner).toBe(1);
        expect(events.some((e) => e.type === 'reborn' && e.slot === 1)).toBe(true);
    });
    test('неверный ответ падающей звезды не копит свет', () => {
        const s = makeState();
        s.players[1] = { ...s.players[1], status: 'falling', fallingLight: 0, cores: 0 };
        const { state } = (0, engine_1.resolveRound)(s, {
            ...noInput(),
            falling: [{ slot: 1, answeredCorrect: false }],
        }, CFG);
        expect(state.players[1].fallingLight).toBe(0);
        expect(state.players[1].status).toBe('falling');
    });
    test('повторный вылет после возрождения → out навсегда', () => {
        const s = makeState();
        s.players[1] = { ...s.players[1], cores: 1, rebirthUsed: true };
        const { state } = (0, engine_1.resolveRound)(s, {
            ...noInput(),
            attacks: [{ slot: 0, target: HOMES[1], correctAll: true, perfect: false }],
        }, CFG);
        expect(state.players[1].status).toBe('out');
    });
    // ── 7.4: зафиксированное поведение краевых случаев движка ────────────────
    test('возрождение без свободных звёзд: остаётся falling, свет сохранён, не крашит', () => {
        const s = makeState();
        // Все звёзды заняты игроком 0 → нет ни одной нейтральной для рождения.
        for (const key of Object.keys(s.stars))
            s.stars[key] = { owner: 0, radiance: 0 };
        s.players[1] = { ...s.players[1], status: 'falling', fallingLight: 1, cores: 0 };
        const { state, events } = (0, engine_1.resolveRound)(s, {
            ...noInput(),
            falling: [{ slot: 1, answeredCorrect: true }],
        }, CFG);
        expect(state.players[1].status).toBe('falling'); // не возродился — некуда
        expect(state.players[1].fallingLight).toBe(2); // но свет накоплен (возродится, как освободится)
        expect(events.some((e) => e.type === 'reborn')).toBe(false);
    });
    test('дуэль за чужой home с последним ядром: победитель дуэли выбивает владельца', () => {
        const s = makeState();
        s.players[1] = { ...s.players[1], cores: 1 };
        const { state, events } = (0, engine_1.resolveRound)(s, {
            ...noInput(),
            duels: [{ starKey: HOMES[1], slots: [0, 1], winner: 0 }],
        }, CFG);
        expect(state.players[1].cores).toBe(0);
        expect(state.stars[HOMES[1]].owner).toBe(0);
        expect(events.some((e) => e.type === 'eliminated' && e.slot === 1)).toBe(true);
    });
    test('иммутабельность: resolveRound не мутирует переданный state (клон)', () => {
        const s = makeState();
        s.players[1] = { ...s.players[1], cores: 1 };
        const before = structuredClone(s);
        (0, engine_1.resolveRound)(s, {
            ...noInput(),
            attacks: [{ slot: 0, target: HOMES[1], correctAll: true, perfect: false }],
        }, CFG);
        expect(s).toEqual(before); // исходный state нетронут
    });
    test('невредимость возрождённого: удар по home под щитом не снимает ядро (1.3)', () => {
        const s = makeState({ round: 3 });
        s.players[1] = { ...s.players[1], cores: 2, homeShieldUntilRound: 4 }; // защищён до раунда 4
        const { state, events } = (0, engine_1.resolveRound)(s, {
            ...noInput(),
            attacks: [{ slot: 0, target: HOMES[1], correctAll: true, perfect: false }],
        }, CFG);
        expect(state.players[1].cores).toBe(2); // ядро не снято
        expect(state.players[1].status).toBe('alive');
        expect(state.stars[HOMES[1]].owner).toBe(1); // звезда осталась
        // Событие честное: щит отразил, а НЕ ложное «ядро потеряно» (аудит-фикс).
        expect(events.some((e) => e.type === 'home_shielded' && e.slot === 1)).toBe(true);
        expect(events.some((e) => e.type === 'core_lost' && e.slot === 1)).toBe(false);
    });
});
describe('constellations/engine — Полярная и созвездия', () => {
    test('удержание Полярной: ЗАТУХАЮЩИЙ доход byStreak, пыль каждые 3 раунда кап 2 (1.1)', () => {
        let s = makeState();
        s.stars['0,0'] = { owner: 0, radiance: 0 };
        let dustEvents = 0;
        for (let i = 0; i < 9; i += 1) {
            const res = (0, engine_1.resolveRound)(s, noInput(), { ...CFG, roundsTotal: 100 });
            dustEvents += res.events.filter((e) => e.type === 'polar_dust').length;
            s = res.state;
        }
        // byStreak [5,5,5,3,3,2,2,2,2,2] за 9 раундов: 5+5+5+3+3+2+2+2+2 = 29 (было 45).
        const expected = CFG.scoring.polarHoldByStreak.slice(0, 9).reduce((a, b) => a + b, 0);
        expect(expected).toBe(29);
        expect(s.players[0].bonusPoints).toBe(expected);
        expect(s.players[0].dustEarned).toBe(2); // 3-й и 6-й раунды; 9-й упёрся в кап
        expect(dustEvents).toBe(2);
    });
    test('перехват Полярной сбрасывает счёт удержания', () => {
        let s = makeState();
        s.stars['0,0'] = { owner: 0, radiance: 0 };
        s = (0, engine_1.resolveRound)(s, noInput(), CFG).state; // 1 раунд у slot0
        s.stars['0,0'] = { owner: 1, radiance: 0 }; // перехват
        s = (0, engine_1.resolveRound)(s, noInput(), CFG).state;
        expect(s.players[0].polarRoundsHeld).toBe(0);
        expect(s.players[1].polarRoundsHeld).toBe(1);
    });
    test('созвездие 3+ смежных даёт бонус каждый раунд', () => {
        const s = makeState();
        s.stars['2,0'] = { owner: 0, radiance: 0 };
        s.stars['2,1'] = { owner: 0, radiance: 0 }; // 3,0 + 2,0 + 2,1 смежны
        const { state, events } = (0, engine_1.resolveRound)(s, noInput(), CFG);
        expect(state.players[0].bonusPoints).toBe(CFG.scoring.constellationBonusPerRound);
        expect(events.some((e) => e.type === 'constellation_bonus' && e.slot === 0)).toBe(true);
    });
});
describe('constellations/engine — завершение матча', () => {
    test('последний раунд закрывает матч', () => {
        const s = makeState({ round: 10 });
        const { state } = (0, engine_1.resolveRound)(s, noInput(), CFG);
        expect(state.stage).toBe('finished');
    });
    // Порог ранней победы вычисляется ИЗ конфига (а не хардкод «26/70%»), иначе
    // тест проходит случайно при смене mapSharePct (7.5 — устранение хрупкости).
    const earlyWinThreshold = Math.ceil((hex_1.STAR_COUNT * CFG.earlyWin.mapSharePct) / 100);
    /** Сделать так, чтобы у slot0 стало РОВНО n звёзд (остальные — нейтральные). */
    const giveStars = (s, n) => {
        // Сброс: всё нейтрально, затем отдаём ровно n первых ключей slot0.
        for (const key of Object.keys(s.stars))
            s.stars[key] = { owner: null, radiance: 0 };
        let given = 0;
        for (const key of Object.keys(s.stars)) {
            if (given >= n)
                break;
            s.stars[key] = { owner: 0, radiance: 0 };
            given += 1;
        }
    };
    test(`ранняя победа при доле карты ≥ порога (${earlyWinThreshold} из ${hex_1.STAR_COUNT})`, () => {
        const s = makeState();
        giveStars(s, earlyWinThreshold);
        const { state, events } = (0, engine_1.resolveRound)(s, noInput(), CFG);
        expect(state.stage).toBe('finished');
        expect(events.some((e) => e.type === 'early_win' && e.slot === 0)).toBe(true);
    });
    test('НЕТ ранней победы при доле на 1 звезду ниже порога (негатив-кейс)', () => {
        const s = makeState();
        giveStars(s, earlyWinThreshold - 1);
        const { state, events } = (0, engine_1.resolveRound)(s, noInput(), CFG);
        expect(state.stage).not.toBe('finished');
        expect(events.some((e) => e.type === 'early_win')).toBe(false);
    });
    test('выбил всех (остальные out) → ранняя победа', () => {
        const s = makeState();
        s.players[1] = { ...s.players[1], status: 'out', cores: 0 };
        s.players[2] = { ...s.players[2], status: 'out', cores: 0 };
        s.players[3] = { ...s.players[3], status: 'out', cores: 0 };
        const { state } = (0, engine_1.resolveRound)(s, noInput(), CFG);
        expect(state.stage).toBe('finished');
    });
    test('падающий игрок НЕ считается выбитым для ранней победы', () => {
        const s = makeState();
        s.players[1] = { ...s.players[1], status: 'out', cores: 0 };
        s.players[2] = { ...s.players[2], status: 'out', cores: 0 };
        s.players[3] = { ...s.players[3], status: 'falling', cores: 0 };
        const { state } = (0, engine_1.resolveRound)(s, noInput(), CFG);
        expect(state.stage).toBe('active');
    });
    test('захват в последнем раунде даёт ×2 (бонус = стоимость звезды)', () => {
        const s = makeState({ round: 10 });
        const { state } = (0, engine_1.resolveRound)(s, {
            ...noInput(),
            attacks: [{ slot: 0, target: '2,0', correctAll: true, perfect: false }],
        }, CFG);
        // среднее кольцо = 20 очков; множитель 2 → +20 бонусных
        expect(state.players[0].bonusPoints).toBe(20);
    });
});
//# sourceMappingURL=engine.test.js.map