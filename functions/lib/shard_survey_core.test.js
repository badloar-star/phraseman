"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shard_survey_core_1 = require("./shard_survey_core");
const DAY_MS = 24 * 60 * 60 * 1000;
const validConfigInput = {
    surveyId: 'onboarding_impression_v1',
    enabled: true,
    title: { ru: 'Как впечатление?', es: '¿Qué tal?' },
    subtitle: { ru: 'Пара вопросов' },
    rewardShards: 3,
    minDaysBetweenSurveys: 7,
    audience: { tier: 'free', minLessons: 1, platforms: ['ios'] },
    questions: [
        {
            id: 'most_useful',
            type: 'single_choice',
            text: { ru: 'Что полезнее всего?' },
            options: [
                { id: 'lessons', label: { ru: 'Уроки' } },
                { id: 'quizzes', label: { ru: 'Квизы' } },
            ],
        },
        {
            id: 'one_thing',
            type: 'text',
            text: { ru: 'Что улучшить?' },
        },
    ],
};
describe('parseSurveyConfig', () => {
    it('парсит валидный конфиг', () => {
        const c = (0, shard_survey_core_1.parseSurveyConfig)(validConfigInput);
        expect(c).not.toBeNull();
        expect(c.surveyId).toBe('onboarding_impression_v1');
        expect(c.rewardShards).toBe(3);
        expect(c.questions).toHaveLength(2);
        expect(c.audience.tier).toBe('free');
        expect(c.audience.platforms).toEqual(['ios']);
    });
    it('отбрасывает конфиг без вопросов', () => {
        expect((0, shard_survey_core_1.parseSurveyConfig)({ ...validConfigInput, questions: [] })).toBeNull();
    });
    it('отбрасывает single_choice с <2 вариантами', () => {
        const c = (0, shard_survey_core_1.parseSurveyConfig)({
            ...validConfigInput,
            questions: [{ id: 'q', type: 'single_choice', text: { ru: 'x' }, options: [{ id: 'a', label: { ru: 'A' } }] }],
        });
        expect(c).toBeNull();
    });
    it('требует ru в title', () => {
        expect((0, shard_survey_core_1.parseSurveyConfig)({ ...validConfigInput, title: { es: 'x' } })).toBeNull();
    });
    it('отбрасывает невалидный surveyId', () => {
        expect((0, shard_survey_core_1.parseSurveyConfig)({ ...validConfigInput, surveyId: 'Bad Id!' })).toBeNull();
    });
    it('клампит rewardShards в [1..20]', () => {
        expect((0, shard_survey_core_1.parseSurveyConfig)({ ...validConfigInput, rewardShards: 300 }).rewardShards).toBe(20);
        expect((0, shard_survey_core_1.parseSurveyConfig)({ ...validConfigInput, rewardShards: 0 }).rewardShards).toBe(1);
    });
    it('клампит minDaysBetweenSurveys к полу 1 (анти-спам, аудит)', () => {
        expect((0, shard_survey_core_1.parseSurveyConfig)({ ...validConfigInput, minDaysBetweenSurveys: 0 }).minDaysBetweenSurveys).toBe(1);
        expect((0, shard_survey_core_1.parseSurveyConfig)({ ...validConfigInput, minDaysBetweenSurveys: -5 }).minDaysBetweenSurveys).toBe(1);
        expect((0, shard_survey_core_1.parseSurveyConfig)({ ...validConfigInput, minDaysBetweenSurveys: 14 }).minDaysBetweenSurveys).toBe(14);
    });
    it('отбрасывает дубли id вопросов', () => {
        const dup = (0, shard_survey_core_1.parseSurveyConfig)({
            ...validConfigInput,
            questions: [validConfigInput.questions[0], validConfigInput.questions[0]],
        });
        expect(dup).toBeNull();
    });
});
describe('validateAnswers', () => {
    const questions = (0, shard_survey_core_1.parseSurveyConfig)(validConfigInput).questions;
    it('принимает валидные ответы', () => {
        const r = (0, shard_survey_core_1.validateAnswers)(questions, {
            most_useful: { optionId: 'lessons' },
            one_thing: { comment: 'Больше примеров' },
        });
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.answers.most_useful.optionId).toBe('lessons');
            expect(r.answers.one_thing.comment).toBe('Больше примеров');
        }
    });
    it('отклоняет вариант не из списка', () => {
        const r = (0, shard_survey_core_1.validateAnswers)(questions, { most_useful: { optionId: 'hacked' }, one_thing: { comment: 'x' } });
        expect(r.ok).toBe(false);
        if (!r.ok)
            expect(r.error).toBe('invalid_option:most_useful');
    });
    it('требует непустой comment для text-вопроса', () => {
        const r = (0, shard_survey_core_1.validateAnswers)(questions, { most_useful: { optionId: 'lessons' }, one_thing: { comment: '   ' } });
        expect(r.ok).toBe(false);
        if (!r.ok)
            expect(r.error).toBe('comment_required:one_thing');
    });
    it('отклоняет пустой объект ответов', () => {
        const r = (0, shard_survey_core_1.validateAnswers)(questions, {});
        expect(r.ok).toBe(false);
        if (!r.ok)
            expect(r.error).toBe('answers_required');
    });
    it('обрезает длинный comment до 500', () => {
        const long = 'x'.repeat(600);
        const r = (0, shard_survey_core_1.validateAnswers)(questions, { most_useful: { optionId: 'lessons' }, one_thing: { comment: long } });
        expect(r.ok).toBe(true);
        if (r.ok)
            expect(r.answers.one_thing.comment.length).toBe(500);
    });
});
describe('matchesAudience', () => {
    const base = { isPremium: false, lessonsCompleted: 5, platform: 'ios' };
    it('free-опрос не показывается премиуму', () => {
        const aud = { tier: 'free', minLessons: null, maxLessons: null, platforms: [] };
        expect((0, shard_survey_core_1.matchesAudience)(aud, { ...base, isPremium: true })).toBe(false);
        expect((0, shard_survey_core_1.matchesAudience)(aud, { ...base, isPremium: false })).toBe(true);
    });
    it('premium-опрос не показывается free', () => {
        const aud = { tier: 'premium', minLessons: null, maxLessons: null, platforms: [] };
        expect((0, shard_survey_core_1.matchesAudience)(aud, { ...base, isPremium: false })).toBe(false);
    });
    it('фильтр по minLessons/maxLessons', () => {
        const aud = { tier: 'any', minLessons: 3, maxLessons: 10, platforms: [] };
        expect((0, shard_survey_core_1.matchesAudience)(aud, { ...base, lessonsCompleted: 2 })).toBe(false);
        expect((0, shard_survey_core_1.matchesAudience)(aud, { ...base, lessonsCompleted: 5 })).toBe(true);
        expect((0, shard_survey_core_1.matchesAudience)(aud, { ...base, lessonsCompleted: 11 })).toBe(false);
    });
    it('фильтр по платформе', () => {
        const aud = { tier: 'any', minLessons: null, maxLessons: null, platforms: ['android'] };
        expect((0, shard_survey_core_1.matchesAudience)(aud, { ...base, platform: 'ios' })).toBe(false);
        expect((0, shard_survey_core_1.matchesAudience)(aud, { ...base, platform: 'android' })).toBe(true);
    });
});
describe('passesCooldown', () => {
    const now = Date.UTC(2026, 6, 5, 12, 0, 0);
    it('первый опрос всегда проходит (lastAt=0)', () => {
        expect((0, shard_survey_core_1.passesCooldown)(0, 7, now)).toBe(true);
    });
    it('не проходит, если прошло меньше N дней', () => {
        expect((0, shard_survey_core_1.passesCooldown)(now - 3 * DAY_MS, 7, now)).toBe(false);
    });
    it('проходит, если прошло ≥ N дней', () => {
        expect((0, shard_survey_core_1.passesCooldown)(now - 8 * DAY_MS, 7, now)).toBe(true);
    });
    it('cooldown=0 всегда проходит', () => {
        expect((0, shard_survey_core_1.passesCooldown)(now - 1000, 0, now)).toBe(true);
    });
});
describe('incrementStats', () => {
    it('инкрементит агрегат иммутабельно', () => {
        const prev = { totalResponses: 2, perQuestion: { q1: { a: 1, b: 1 } }, lastResponseAtMs: 100 };
        const next = (0, shard_survey_core_1.incrementStats)(prev, { q1: { optionId: 'a' }, q2: { optionId: 'comment', comment: 'x' } }, 200);
        expect(next.totalResponses).toBe(3);
        expect(next.perQuestion.q1.a).toBe(2);
        expect(next.perQuestion.q1.b).toBe(1);
        expect(next.perQuestion.q2.comment).toBe(1);
        expect(next.lastResponseAtMs).toBe(200);
        // prev не мутирован
        expect(prev.perQuestion.q1.a).toBe(1);
        expect(prev.totalResponses).toBe(2);
    });
    it('работает с пустым prev', () => {
        const next = (0, shard_survey_core_1.incrementStats)(undefined, { q1: { optionId: 'a' } }, 50);
        expect(next.totalResponses).toBe(1);
        expect(next.perQuestion.q1.a).toBe(1);
    });
});
describe('validateSurveyConfigForWrite', () => {
    it('валидный конфиг → нет ошибок', () => {
        expect((0, shard_survey_core_1.validateSurveyConfigForWrite)(validConfigInput)).toEqual([]);
    });
    it('ловит битый surveyId', () => {
        expect((0, shard_survey_core_1.validateSurveyConfigForWrite)({ ...validConfigInput, surveyId: 'Bad!' })).toContain('surveyId_invalid');
    });
    it('ловит reward вне диапазона', () => {
        expect((0, shard_survey_core_1.validateSurveyConfigForWrite)({ ...validConfigInput, rewardShards: 99 })).toContain('reward_out_of_range');
    });
    it('ловит отсутствие вопросов', () => {
        expect((0, shard_survey_core_1.validateSurveyConfigForWrite)({ ...validConfigInput, questions: [] })).toContain('questions_required');
    });
    it('ловит single_choice с <2 вариантами', () => {
        const errs = (0, shard_survey_core_1.validateSurveyConfigForWrite)({
            ...validConfigInput,
            questions: [{ id: 'q', type: 'single_choice', text: { ru: 'x' }, options: [{ id: 'a', label: { ru: 'A' } }] }],
        });
        expect(errs.some((e) => e.startsWith('question_needs_2_options'))).toBe(true);
    });
    it('ловит text-вопрос с вариантами', () => {
        const errs = (0, shard_survey_core_1.validateSurveyConfigForWrite)({
            ...validConfigInput,
            questions: [{ id: 'q', type: 'text', text: { ru: 'x' }, options: [{ id: 'a', label: { ru: 'A' } }] }],
        });
        expect(errs.some((e) => e.startsWith('text_question_no_options'))).toBe(true);
    });
});
describe('resolveLocalized', () => {
    it('возвращает язык, если есть', () => {
        expect((0, shard_survey_core_1.resolveLocalized)({ ru: 'Р', es: 'E' }, 'es')).toBe('E');
    });
    it('фоллбэк на ru', () => {
        expect((0, shard_survey_core_1.resolveLocalized)({ ru: 'Р' }, 'es')).toBe('Р');
    });
});
//# sourceMappingURL=shard_survey_core.test.js.map