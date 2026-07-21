"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegram_support_1 = require("./telegram_support");
const TELEGRAM_TEXT_LIMIT = 4096;
describe('telegram_support — чат поддержки в премиум-боте', () => {
    describe('parseReplyCommand', () => {
        it('разбирает /reply <id> <текст>', () => {
            expect((0, telegram_support_1.parseReplyCommand)('/reply 123456 Привет! Premium активирован.')).toEqual({
                targetUserId: '123456',
                replyText: 'Привет! Premium активирован.',
            });
        });
        it('многострочный ответ сохраняется целиком', () => {
            const parsed = (0, telegram_support_1.parseReplyCommand)('/reply 42 первая строка\nвторая строка');
            expect(parsed?.targetUserId).toBe('42');
            expect(parsed?.replyText).toBe('первая строка\nвторая строка');
        });
        it('невалидные формы → null', () => {
            expect((0, telegram_support_1.parseReplyCommand)('/reply')).toBeNull();
            expect((0, telegram_support_1.parseReplyCommand)('/reply 123')).toBeNull();
            expect((0, telegram_support_1.parseReplyCommand)('/reply 123   ')).toBeNull();
            expect((0, telegram_support_1.parseReplyCommand)('/reply abc текст')).toBeNull();
            expect((0, telegram_support_1.parseReplyCommand)('reply 123 текст')).toBeNull();
            expect((0, telegram_support_1.parseReplyCommand)('')).toBeNull();
        });
    });
    describe('formatSupportForward', () => {
        const user = { id: 987654, username: 'lena_eng', first_name: 'Лена' };
        it('содержит имя, username, id, текст и подсказку как ответить', () => {
            const text = (0, telegram_support_1.formatSupportForward)(user, 'Оплатил год, премиум не пришёл');
            expect(text).toContain('Лена');
            expect(text).toContain('@lena_eng');
            expect(text).toContain('id 987654');
            expect(text).toContain('Оплатил год, премиум не пришёл');
            expect(text).toContain('/reply 987654');
            expect(text).toContain('reply на это сообщение');
        });
        it('без username и имени не ломается', () => {
            const text = (0, telegram_support_1.formatSupportForward)({ id: 5 }, 'привет');
            expect(text).toContain('Без имени');
            expect(text).toContain('id 5');
            expect(text).not.toContain('@');
        });
        it('гигантский текст юзера ужимается под лимит Telegram', () => {
            const text = (0, telegram_support_1.formatSupportForward)(user, 'ж'.repeat(10000));
            expect(text.length).toBeLessThanOrEqual(TELEGRAM_TEXT_LIMIT);
            expect(text).toContain('…');
            expect(text).toContain('/reply 987654'); // подсказка не съедена обрезкой
        });
    });
    describe('formatUserLabel', () => {
        it('полный профиль', () => {
            expect((0, telegram_support_1.formatUserLabel)({ id: 1, username: 'u', first_name: 'Имя' })).toBe('Имя · @u · id 1');
        });
        it('пустой профиль', () => {
            expect((0, telegram_support_1.formatUserLabel)(undefined)).toBe('Без имени · id -');
        });
    });
    describe('truncateForForward', () => {
        it('короткий текст не трогается', () => {
            expect((0, telegram_support_1.truncateForForward)('привет')).toBe('привет');
        });
        it('длинный обрезается с многоточием в пределах лимита', () => {
            const out = (0, telegram_support_1.truncateForForward)('а'.repeat(5000), 100);
            expect(out.length).toBe(100);
            expect(out.endsWith('…')).toBe(true);
        });
    });
    describe('supportThreadDocId', () => {
        it('ключ «админ + его message_id» уникален на каждое пересланное сообщение', () => {
            expect((0, telegram_support_1.supportThreadDocId)(111, 42)).toBe('111_42');
            expect((0, telegram_support_1.supportThreadDocId)('111', '43')).toBe('111_43');
            expect((0, telegram_support_1.supportThreadDocId)(111, 42)).not.toBe((0, telegram_support_1.supportThreadDocId)(222, 42));
        });
    });
    // ── Кнопка «Ответить» под пересланным сообщением ──────────────────────────
    describe('buildSupportReplyCallback', () => {
        it('кодирует ТОЛЬКО message_id админа (не id юзера)', () => {
            expect((0, telegram_support_1.buildSupportReplyCallback)(42)).toBe('sr:42');
            expect((0, telegram_support_1.buildSupportReplyCallback)('1234567890')).toBe('sr:1234567890');
        });
        it('callback_data укладывается в лимит Telegram 64 байта для реальных message_id', () => {
            // message_id всегда маленький (per-chat), даже 10 знаков → ~13 байт.
            const data = (0, telegram_support_1.buildSupportReplyCallback)(9999999999);
            expect(Buffer.byteLength(data, 'utf8')).toBeLessThanOrEqual(64);
        });
        it('отсутствующий message_id НЕ даёт валидный callback (никогда не "sr:undefined")', () => {
            // parse должен отвергнуть всё, что не строго sr:<цифры>
            expect((0, telegram_support_1.parseSupportReplyCallback)((0, telegram_support_1.buildSupportReplyCallback)(undefined))).toBeNull();
            expect((0, telegram_support_1.parseSupportReplyCallback)((0, telegram_support_1.buildSupportReplyCallback)(null))).toBeNull();
        });
    });
    describe('parseSupportReplyCallback', () => {
        it('round-trip: parse(build(id)).adminMessageId === String(id)', () => {
            expect((0, telegram_support_1.parseSupportReplyCallback)((0, telegram_support_1.buildSupportReplyCallback)(42))?.adminMessageId).toBe('42');
            expect((0, telegram_support_1.parseSupportReplyCallback)((0, telegram_support_1.buildSupportReplyCallback)('700'))?.adminMessageId).toBe('700');
        });
        it('мусор и чужие callback → null (оба конца заякорены)', () => {
            expect((0, telegram_support_1.parseSupportReplyCallback)('')).toBeNull();
            expect((0, telegram_support_1.parseSupportReplyCallback)('sr:')).toBeNull();
            expect((0, telegram_support_1.parseSupportReplyCallback)('sr:abc')).toBeNull();
            expect((0, telegram_support_1.parseSupportReplyCallback)('srx:123')).toBeNull();
            expect((0, telegram_support_1.parseSupportReplyCallback)('support:start')).toBeNull();
            expect((0, telegram_support_1.parseSupportReplyCallback)('sr:12:34')).toBeNull();
            expect((0, telegram_support_1.parseSupportReplyCallback)('SR:123')).toBeNull();
            expect((0, telegram_support_1.parseSupportReplyCallback)('sr: 123')).toBeNull();
            expect((0, telegram_support_1.parseSupportReplyCallback)('sr:123 ')).toBeNull();
            expect((0, telegram_support_1.parseSupportReplyCallback)(undefined)).toBeNull();
        });
        it('очень длинный числовой id не ломает разбор (остаётся строкой)', () => {
            const id = '1'.repeat(60);
            expect((0, telegram_support_1.parseSupportReplyCallback)(`sr:${id}`)?.adminMessageId).toBe(id);
        });
    });
    describe('supportReplyKeyboard', () => {
        it('кнопка содержит имя в тексте и parseable callback_data', () => {
            const kb = (0, telegram_support_1.supportReplyKeyboard)(42, 'Гульфия');
            const button = kb.inline_keyboard[0][0];
            expect(button.text).toContain('Гульфия');
            expect(button.callback_data).toBe('sr:42');
            expect((0, telegram_support_1.parseSupportReplyCallback)(button.callback_data)?.adminMessageId).toBe('42');
        });
        it('имя живёт ТОЛЬКО в тексте — спецсимволы/эмодзи/кавычки в имени не попадают в callback_data', () => {
            const kb = (0, telegram_support_1.supportReplyKeyboard)(7, '«Лена» 😀 /reply');
            const button = kb.inline_keyboard[0][0];
            expect(button.callback_data).toBe('sr:7');
            expect(button.text).toContain('«Лена»');
        });
        it('без message_id кнопка не строится (нечего редактировать)', () => {
            expect((0, telegram_support_1.supportReplyKeyboard)(undefined, 'Кто-то')).toBeNull();
        });
    });
});
//# sourceMappingURL=telegram_support.test.js.map