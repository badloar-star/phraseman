"use strict";
/**
 * Контракт серверной части раздела «Турниры» в админке.
 *
 * зачем: эти callable пишут в боевой пул и включают режим для живых игроков.
 * Проверяем разбор входа (никакого доверия клиенту), гейт «нельзя включить
 * слоты при пустом пуле» и расчёт готовности раундов — ошибка здесь означает
 * комнаты, которые создаются и тут же отменяются, списывая билеты.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const admin_tournament_tasks_1 = require("./admin_tournament_tasks");
const tournament_content_source_1 = require("./tournament_content_source");
function expectRejected(run) {
    expect(run).toThrow();
}
describe('разбор запроса генерации', () => {
    it('без параметров берёт все планы и все форматы', () => {
        const parsed = (0, admin_tournament_tasks_1.parseGenerateRequest)(undefined);
        expect(parsed.plans).toEqual(tournament_content_source_1.TOURNAMENT_SOURCE_PLANS);
        expect(parsed.kinds).toEqual(['choice', 'translate', 'timeattack']);
        expect(parsed.dryRun).toBe(false);
    });
    it('отклоняет неизвестный план и неизвестный формат', () => {
        expectRejected(() => (0, admin_tournament_tasks_1.parseGenerateRequest)({ plans: ['../../etc/passwd'] }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseGenerateRequest)({ plans: ['unknown_plan'] }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseGenerateRequest)({ kinds: ['voice'] })); // голос выключен
        expectRejected(() => (0, admin_tournament_tasks_1.parseGenerateRequest)({ kinds: ['sql_injection'] }));
    });
    it('отклоняет лишние поля — клиенту не даём протащить произвольное', () => {
        expectRejected(() => (0, admin_tournament_tasks_1.parseGenerateRequest)({ plans: ['mitap'], evil: true }));
    });
    it('ограничивает limit разумным потолком', () => {
        expectRejected(() => (0, admin_tournament_tasks_1.parseGenerateRequest)({ limit: 0 }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseGenerateRequest)({ limit: -5 }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseGenerateRequest)({ limit: 999999 }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseGenerateRequest)({ limit: 1.5 }));
        expect((0, admin_tournament_tasks_1.parseGenerateRequest)({ limit: 100 }).limit).toBe(100);
    });
    it('дедуплицирует планы', () => {
        const parsed = (0, admin_tournament_tasks_1.parseGenerateRequest)({ plans: ['mitap', 'mitap', 'echo'] });
        expect(parsed.plans).toEqual(['mitap', 'echo']);
    });
});
describe('разбор запроса списка', () => {
    it('дефолты разумны и ограничены', () => {
        const parsed = (0, admin_tournament_tasks_1.parseListRequest)(undefined);
        expect(parsed.limit).toBe(25);
        expect(parsed.status).toBe('');
    });
    it('отклоняет запредельный limit и мусорный курсор', () => {
        expectRejected(() => (0, admin_tournament_tasks_1.parseListRequest)({ limit: 5000 }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseListRequest)({ cursor: 'плохой курсор с пробелами' }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseListRequest)({ status: 'всё' }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseListRequest)({ difficulty: 9 }));
    });
    it('принимает валидные фильтры', () => {
        const parsed = (0, admin_tournament_tasks_1.parseListRequest)({ limit: 50, status: 'draft', difficulty: 2 });
        expect(parsed).toMatchObject({ limit: 50, status: 'draft', difficulty: 2 });
    });
});
describe('разбор запроса публикации', () => {
    it('требует непустой список id и известное действие', () => {
        expectRejected(() => (0, admin_tournament_tasks_1.parseMutateRequest)({ taskIds: [], action: 'publish' }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseMutateRequest)({ taskIds: ['a'], action: 'drop_database' }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseMutateRequest)({ taskIds: ['../escape'], action: 'publish' }));
    });
    it('дедуплицирует id — двойная публикация одного задания не нужна', () => {
        const parsed = (0, admin_tournament_tasks_1.parseMutateRequest)({ taskIds: ['a', 'a', 'b'], action: 'publish' });
        expect(parsed.taskIds).toEqual(['a', 'b']);
    });
});
describe('разбор расписания', () => {
    const slot = (over = {}) => ({
        slotId: 'daily_1200', localTime: '12:00', timezone: 'Europe/Moscow',
        ticketsRequired: 1, enabled: false, ...over,
    });
    it('принимает слоты в формате, который читает планировщик комнат', () => {
        const parsed = (0, admin_tournament_tasks_1.parseScheduleRequest)({
            slots: [slot(), slot({ slotId: 'daily_1900', localTime: '19:00', enabled: true })],
            timezone: 'Europe/Moscow',
        });
        expect(parsed.slots).toHaveLength(2);
        expect(parsed.slots[0].localTime).toBe('12:00');
        expect(parsed.slots[1].enabled).toBe(true);
        expect(parsed.slots[0].timezone).toBe('Europe/Moscow');
        expect(parsed.slots[0].ticketsRequired).toBe(1);
    });
    it('требует localTime в формате ЧЧ:ММ — hour/minute сервер не понимает', () => {
        // Регрессия: первая версия админки слала hour+minute, сервер молча
        // отбрасывал такие слоты и расписание не запускало ни одного турнира.
        expectRejected(() => (0, admin_tournament_tasks_1.parseScheduleRequest)({ slots: [{ slotId: 'a', hour: 12, minute: 0 }] }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseScheduleRequest)({ slots: [slot({ localTime: '' })] }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseScheduleRequest)({ slots: [slot({ localTime: '9:00' })] }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseScheduleRequest)({ slots: [slot({ localTime: '25:00' })] }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseScheduleRequest)({ slots: [slot({ localTime: '12:61' })] }));
    });
    it('отклоняет мусорную таймзону — её же проверяет сервер комнат', () => {
        expectRejected(() => (0, admin_tournament_tasks_1.parseScheduleRequest)({ slots: [slot()], timezone: 'НеТаймзона' }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseScheduleRequest)({ slots: [slot({ timezone: 'Nowhere/Nope' })] }));
    });
    it('отклоняет дубли слотов — иначе комнаты создадутся дважды', () => {
        expectRejected(() => (0, admin_tournament_tasks_1.parseScheduleRequest)({
            slots: [slot(), slot({ localTime: '19:00' })],
        }));
    });
    it('enabled по умолчанию false — слот не включается молча', () => {
        const parsed = (0, admin_tournament_tasks_1.parseScheduleRequest)({ slots: [{
                    slotId: 'daily_1200', localTime: '12:00', timezone: 'Europe/Moscow',
                }] });
        expect(parsed.slots[0].enabled).toBe(false);
        expect(parsed.slots[0].ticketsRequired).toBe(1);
    });
    it('стоимость входа ограничена разумными пределами', () => {
        expectRejected(() => (0, admin_tournament_tasks_1.parseScheduleRequest)({ slots: [slot({ ticketsRequired: 0 })] }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseScheduleRequest)({ slots: [slot({ ticketsRequired: 9999 })] }));
        expect((0, admin_tournament_tasks_1.parseScheduleRequest)({ slots: [slot({ ticketsRequired: 5 })] }).slots[0].ticketsRequired).toBe(5);
    });
});
describe('карточка задания для ревью', () => {
    const task = {
        taskId: 'choice_mitap_1_p1',
        mode: 'guess_phrase',
        isVoice: false,
        difficulty: 1,
        payload: { phrase: 'I am here', options: ['Я здесь', 'Как дела', 'Спасибо', 'Пока'], correctIndex: 0 },
        tags: ['plan:mitap'],
        verified: false,
    };
    it('показывает правильный ответ — ревьюер обязан видеть, что проверяет', () => {
        const card = (0, admin_tournament_tasks_1.publicAdminTask)(task.taskId, task);
        expect(card.payload).toEqual(task.payload);
        expect(card.valid).toBe(true);
        expect(card.verified).toBe(false);
    });
    it('помечает битое задание как невалидное, а не скрывает', () => {
        const broken = { ...task, payload: { phrase: 'x', options: ['a'], correctIndex: 0 } };
        expect((0, admin_tournament_tasks_1.publicAdminTask)('broken', broken).valid).toBe(false);
    });
});
describe('готовность раундов', () => {
    it('сложности раундов совпадают с serverside selectRoundTasks', () => {
        // Зеркало tournament_core.selectRoundTasks: раунд 1 → [1], 4 → [2,3].
        expect(admin_tournament_tasks_1.ROUND_DIFFICULTIES[1]).toEqual([1]);
        expect(admin_tournament_tasks_1.ROUND_DIFFICULTIES[2]).toEqual([1, 2]);
        expect(admin_tournament_tasks_1.ROUND_DIFFICULTIES[3]).toEqual([2]);
        expect(admin_tournament_tasks_1.ROUND_DIFFICULTIES[4]).toEqual([2, 3]);
    });
    it('порог набора заданий на раунд разумно больше 5 вопросов', () => {
        // 5 вопросов в батче; порог должен давать запас, иначе игроки увидят
        // одни и те же задания в соседних турнирах.
        expect(admin_tournament_tasks_1.ROUND_TASK_TARGET).toBeGreaterThanOrEqual(25);
    });
});
describe('разбор запроса ИИ-генерации', () => {
    it('принимает уровень CEFR, нормализуя регистр, и режет подсказку темы', () => {
        const parsed = (0, admin_tournament_tasks_1.parseAiGenerateRequest)({ level: 'b1', topicHint: ` аэропорт ${'x'.repeat(200)}`, batches: 2 });
        expect(parsed.level).toBe('B1');
        expect(parsed.topicHint.length).toBeLessThanOrEqual(120);
        expect(parsed.batches).toBe(2);
        expect(parsed.dryRun).toBe(false);
    });
    it('отклоняет неизвестный уровень, лишние ключи и завышенные батчи', () => {
        expectRejected(() => (0, admin_tournament_tasks_1.parseAiGenerateRequest)({ level: 'D1' }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseAiGenerateRequest)({ level: 'A2', extra: true }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseAiGenerateRequest)({ level: 'A2', batches: 99 }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseAiGenerateRequest)({ level: 'A2', batches: 0 }));
    });
});
describe('разбор запроса правки задания', () => {
    it('принимает валидную правку payload', () => {
        const parsed = (0, admin_tournament_tasks_1.parseEditRequest)({
            taskId: 'ai_choice_abc',
            payload: { phrase: 'Hello there', options: ['а', 'б', 'в', 'г'], correctIndex: 1 },
            difficulty: 2,
        });
        expect(parsed.taskId).toBe('ai_choice_abc');
        expect(parsed.difficulty).toBe(2);
    });
    it('отклоняет пустой payload, кривой id и сложность вне 0-3', () => {
        expectRejected(() => (0, admin_tournament_tasks_1.parseEditRequest)({ taskId: 'ok', payload: {} }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseEditRequest)({ taskId: 'плохой id!', payload: { a: 1 } }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseEditRequest)({ taskId: 'ok', payload: { a: 1 }, difficulty: 9 }));
    });
});
describe('разбор кураторского набора', () => {
    const base = { slotId: 'daily_1900', timezone: 'Europe/Moscow', dateKey: '2026-07-26' };
    it('принимает валидные раунды и пустой набор (снятие)', () => {
        const parsed = (0, admin_tournament_tasks_1.parseCuratedSetRequest)({
            ...base,
            rounds: [{ roundNo: 1, taskIds: ['t1', 't2', 't3'] }],
        });
        expect(parsed.rounds).toHaveLength(1);
        expect(parsed.rounds[0].taskIds).toEqual(['t1', 't2', 't3']);
        expect((0, admin_tournament_tasks_1.parseCuratedSetRequest)({ ...base, rounds: [] }).rounds).toEqual([]);
    });
    it('отклоняет кривую дату/таймзону, дубли раундов и переполненный раунд', () => {
        expectRejected(() => (0, admin_tournament_tasks_1.parseCuratedSetRequest)({ ...base, dateKey: '26.07.2026', rounds: [] }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseCuratedSetRequest)({ ...base, timezone: 'Nowhere/Nope', rounds: [] }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseCuratedSetRequest)({
            ...base,
            rounds: [{ roundNo: 1, taskIds: ['a'] }, { roundNo: 1, taskIds: ['b'] }],
        }));
        expectRejected(() => (0, admin_tournament_tasks_1.parseCuratedSetRequest)({
            ...base,
            rounds: [{ roundNo: 2, taskIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] }],
        }));
    });
});
describe('фильтр источника пула', () => {
    it('принимает ai и plan_content, отклоняет прочее', () => {
        expect((0, admin_tournament_tasks_1.parseListRequest)({ source: 'ai' }).source).toBe('ai');
        expect((0, admin_tournament_tasks_1.parseListRequest)({ source: 'plan_content' }).source).toBe('plan_content');
        expect((0, admin_tournament_tasks_1.parseListRequest)({}).source).toBe('');
        expectRejected(() => (0, admin_tournament_tasks_1.parseListRequest)({ source: 'unknown' }));
    });
});
//# sourceMappingURL=admin_tournament_tasks.test.js.map