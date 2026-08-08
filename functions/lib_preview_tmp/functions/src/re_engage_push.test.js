"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Тесты чистой логики re-engage push.
 * Покрываем отбор кандидатов, классификацию причин, анти-спам cooldown,
 * валидацию токена, локализацию текста и разбивку на чанки.
 * I/O (Firestore scan + Expo fetch) здесь не тестируется — только чистые функции.
 */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const re_engage_push_1 = require("./re_engage_push");
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const NOW = 1750000000000;
const TOKEN = 'ExponentPushToken[abc123]';
function user(overrides) {
    return {
        uid: 'u1',
        expoPushToken: TOKEN,
        pushTokenLang: 'ru',
        lastActiveAt: NOW - 5 * DAY,
        streakCount: 0,
        lastReEngagePushAt: null,
        userName: 'Тест',
        ...overrides,
    };
}
describe('isValidExpoPushToken', () => {
    it('принимает ExponentPushToken и ExpoPushToken', () => {
        expect((0, re_engage_push_1.isValidExpoPushToken)('ExponentPushToken[xxx]')).toBe(true);
        expect((0, re_engage_push_1.isValidExpoPushToken)('ExpoPushToken[yyy]')).toBe(true);
    });
    it('отклоняет мусор/пустое/не-строки', () => {
        expect((0, re_engage_push_1.isValidExpoPushToken)('')).toBe(false);
        expect((0, re_engage_push_1.isValidExpoPushToken)('random')).toBe(false);
        expect((0, re_engage_push_1.isValidExpoPushToken)(null)).toBe(false);
        expect((0, re_engage_push_1.isValidExpoPushToken)(123)).toBe(false);
        expect((0, re_engage_push_1.isValidExpoPushToken)('ExponentPushToken[]')).toBe(false);
    });
});
describe('parseReEngageUser', () => {
    it('извлекает поля из сырого документа (числа и строки)', () => {
        const parsed = (0, re_engage_push_1.parseReEngageUser)('uX', {
            expoPushToken: TOKEN,
            pushTokenLang: 'es',
            last_active_at: NOW - 4 * DAY,
            lastReEngagePushAt: NOW - 10 * DAY,
            progress: { streak_count: '7', user_name: 'Ana' },
        });
        expect(parsed).toEqual({
            uid: 'uX',
            expoPushToken: TOKEN,
            pushTokenLang: 'es',
            pushTokenTimezone: null,
            lastActiveAt: NOW - 4 * DAY,
            streakCount: 7,
            lastReEngagePushAt: NOW - 10 * DAY,
            userName: 'Ana',
            pushPrefs: null,
        });
    });
    it('парсит pushPrefs (булевы), мусор внутри игнорирует', () => {
        const parsed = (0, re_engage_push_1.parseReEngageUser)('uZ', {
            pushPrefs: { streak: false, offers: 'да' },
        });
        expect(parsed.pushPrefs).toEqual({ streak: false, offers: undefined });
    });
    it('терпит отсутствие полей', () => {
        const parsed = (0, re_engage_push_1.parseReEngageUser)('uY', undefined);
        expect(parsed.lastActiveAt).toBeNull();
        expect(parsed.streakCount).toBeNull();
        expect(parsed.expoPushToken).toBeNull();
    });
});
describe('classifyReEngageUser', () => {
    it('streak_at_risk: есть серия, не заходил 22ч (< суток)', () => {
        const u = user({ streakCount: 5, lastActiveAt: NOW - 22 * HOUR });
        expect((0, re_engage_push_1.classifyReEngageUser)(u, NOW)).toBe('streak_at_risk');
    });
    it('НЕ streak_at_risk, если серия меньше порога', () => {
        const u = user({ streakCount: re_engage_push_1.STREAK_AT_RISK_MIN - 1, lastActiveAt: NOW - 22 * HOUR });
        // 22ч < 3 дней → и не inactive_return
        expect((0, re_engage_push_1.classifyReEngageUser)(u, NOW)).toBeNull();
    });
    it('inactive_return: не заходил 5 дней', () => {
        const u = user({ streakCount: 0, lastActiveAt: NOW - 5 * DAY });
        expect((0, re_engage_push_1.classifyReEngageUser)(u, NOW)).toBe('inactive_return');
    });
    it('граница окна: ровно MIN дней — шлём', () => {
        const u = user({ lastActiveAt: NOW - re_engage_push_1.INACTIVE_MIN_DAYS * DAY });
        expect((0, re_engage_push_1.classifyReEngageUser)(u, NOW)).toBe('inactive_return');
    });
    it('слишком давно (> MAX дней) — не шлём (мёртвый)', () => {
        const u = user({ lastActiveAt: NOW - (re_engage_push_1.INACTIVE_MAX_DAYS + 1) * DAY });
        expect((0, re_engage_push_1.classifyReEngageUser)(u, NOW)).toBeNull();
    });
    it('заходил вчера (< MIN дней, без стрик-риска) — не шлём', () => {
        const u = user({ streakCount: 0, lastActiveAt: NOW - 1 * DAY });
        expect((0, re_engage_push_1.classifyReEngageUser)(u, NOW)).toBeNull();
    });
    it('cooldown: недавно уже слали — не шлём', () => {
        const u = user({
            lastActiveAt: NOW - 5 * DAY,
            lastReEngagePushAt: NOW - (re_engage_push_1.REENGAGE_COOLDOWN_DAYS - 1) * DAY,
        });
        expect((0, re_engage_push_1.classifyReEngageUser)(u, NOW)).toBeNull();
    });
    it('cooldown истёк — снова можно слать', () => {
        const u = user({
            lastActiveAt: NOW - 5 * DAY,
            lastReEngagePushAt: NOW - (re_engage_push_1.REENGAGE_COOLDOWN_DAYS + 1) * DAY,
        });
        expect((0, re_engage_push_1.classifyReEngageUser)(u, NOW)).toBe('inactive_return');
    });
    it('невалидный токен — не шлём', () => {
        expect((0, re_engage_push_1.classifyReEngageUser)(user({ expoPushToken: 'garbage' }), NOW)).toBeNull();
        expect((0, re_engage_push_1.classifyReEngageUser)(user({ expoPushToken: null }), NOW)).toBeNull();
    });
    it('нет lastActiveAt — не шлём', () => {
        expect((0, re_engage_push_1.classifyReEngageUser)(user({ lastActiveAt: null }), NOW)).toBeNull();
    });
    it('pushPrefs.streak === false: стрик-риск НЕ шлём (юзер выключил категорию)', () => {
        const u = user({
            streakCount: re_engage_push_1.STREAK_AT_RISK_MIN,
            lastActiveAt: NOW - 22 * HOUR,
            pushPrefs: { streak: false },
        });
        expect((0, re_engage_push_1.classifyReEngageUser)(u, NOW)).toBeNull();
    });
    it('pushPrefs.streak === false НЕ трогает inactive_return (другая категория)', () => {
        const u = user({ lastActiveAt: NOW - 5 * DAY, pushPrefs: { streak: false } });
        expect((0, re_engage_push_1.classifyReEngageUser)(u, NOW)).toBe('inactive_return');
    });
    it('pushPrefs отсутствует (старый клиент) — стрик-риск шлём как раньше', () => {
        const u = user({ streakCount: re_engage_push_1.STREAK_AT_RISK_MIN, lastActiveAt: NOW - 22 * HOUR, pushPrefs: null });
        expect((0, re_engage_push_1.classifyReEngageUser)(u, NOW)).toBe('streak_at_risk');
    });
    it('приоритет: стрик-риск важнее (серия 10, 23ч без захода)', () => {
        const u = user({ streakCount: 10, lastActiveAt: NOW - 23 * HOUR });
        expect((0, re_engage_push_1.classifyReEngageUser)(u, NOW)).toBe('streak_at_risk');
    });
});
describe('selectReEngageCandidates', () => {
    it('фильтрует и маппит только подходящих', () => {
        const users = [
            user({ uid: 'send_inactive', lastActiveAt: NOW - 5 * DAY }),
            user({ uid: 'skip_recent', lastActiveAt: NOW - 1 * DAY, streakCount: 0 }),
            user({ uid: 'send_streak', streakCount: 4, lastActiveAt: NOW - 21 * HOUR }),
            user({ uid: 'skip_token', expoPushToken: 'bad', lastActiveAt: NOW - 5 * DAY }),
        ];
        const got = (0, re_engage_push_1.selectReEngageCandidates)(users, NOW);
        const uids = got.map((c) => c.uid).sort();
        expect(uids).toEqual(['send_inactive', 'send_streak']);
        const streakC = got.find((c) => c.uid === 'send_streak');
        expect(streakC.reason).toBe('streak_at_risk');
        expect(streakC.streakCount).toBe(4);
    });
    it('пустой вход → пустой выход', () => {
        expect((0, re_engage_push_1.selectReEngageCandidates)([], NOW)).toEqual([]);
    });
});
describe('buildExpoPushMessage', () => {
    const base = {
        uid: 'u1', token: TOKEN, lang: 'ru', reason: 'inactive_return', streakCount: 0, userName: '',
    };
    it('inactive_return на русском', () => {
        const m = (0, re_engage_push_1.buildExpoPushMessage)(base);
        expect(m.to).toBe(TOKEN);
        expect(m.data.type).toBe('inactive_return');
        expect(m.sound).toBe('default');
        expect(m.title.length).toBeGreaterThan(0);
        expect(m.body.length).toBeGreaterThan(0);
    });
    it('streak_at_risk подставляет число серии', () => {
        const m = (0, re_engage_push_1.buildExpoPushMessage)({ ...base, reason: 'streak_at_risk', streakCount: 12 });
        expect(m.title).toContain('12');
        expect(m.data.type).toBe('streak_at_risk');
    });
    it('неизвестный язык падает на ru (не падает)', () => {
        const m = (0, re_engage_push_1.buildExpoPushMessage)({ ...base, lang: 'zz' });
        expect(m.title.length).toBeGreaterThan(0);
    });
    it.each(['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'])('есть локализация для %s', (lang) => {
        const inactive = (0, re_engage_push_1.buildExpoPushMessage)({ ...base, lang });
        const streak = (0, re_engage_push_1.buildExpoPushMessage)({ ...base, lang, reason: 'streak_at_risk', streakCount: 5 });
        expect(inactive.title).toBeTruthy();
        expect(inactive.body).toBeTruthy();
        expect(streak.title).toContain('5');
    });
});
describe('chunkMessages', () => {
    it('режет по 100 по умолчанию', () => {
        const arr = Array.from({ length: 250 }, (_, i) => i);
        const chunks = (0, re_engage_push_1.chunkMessages)(arr);
        expect(chunks.length).toBe(3);
        expect(chunks[0].length).toBe(100);
        expect(chunks[2].length).toBe(50);
    });
    it('меньше размера — один чанк', () => {
        expect((0, re_engage_push_1.chunkMessages)([1, 2, 3], 100)).toEqual([[1, 2, 3]]);
    });
    it('пустой массив — нет чанков', () => {
        expect((0, re_engage_push_1.chunkMessages)([], 100)).toEqual([]);
    });
});
describe('проекция полей в скане users', () => {
    // зачем: скан users читает документы через .select(), чтобы не тянуть их целиком —
    // доки users самые «толстые» в базе. Но проекция и parseReEngageUser должны знать об
    // одних и тех же полях: добавят поле в парсер и забудут в .select() — оно молча придёт
    // пустым, кандидат отсеется, и пуш просто перестанет уходить. Молча. Этот храповик
    // ловит рассинхрон на CI, а не в проде.
    const source = fs_1.default.readFileSync(path_1.default.join(__dirname, 're_engage_push.ts'), 'utf8');
    const projection = source.slice(source.indexOf('.select('), source.indexOf('if (lastDoc)'));
    it.each([
        'expoPushToken',
        'pushTokenLang',
        'pushTokenTimezone',
        'last_active_at',
        'lastReEngagePushAt',
        'progress.streak_count',
        'progress.user_name',
        'pushPrefs',
    ])('проекция включает поле %s, которое читает parseReEngageUser', (field) => {
        expect(projection).toContain(`'${field}'`);
    });
    it('парсер не читает полей сверх спроецированных', () => {
        const parser = source.slice(source.indexOf('export function parseReEngageUser'), source.indexOf('/** Возвращает локальный час'));
        // Все обращения вида data?.X и progress.X внутри парсера.
        const read = new Set();
        for (const m of parser.matchAll(/data\?\.([a-zA-Z_0-9]+)/g))
            read.add(m[1]);
        for (const m of parser.matchAll(/progress\.([a-zA-Z_0-9]+)/g))
            read.add(`progress.${m[1]}`);
        read.delete('progress'); // сам объект progress, а не поле внутри него
        for (const field of read) {
            expect(projection).toContain(`'${field}'`);
        }
    });
});
//# sourceMappingURL=re_engage_push.test.js.map