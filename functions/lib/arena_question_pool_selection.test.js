"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const arena_question_pool_selection_1 = require("./arena_question_pool_selection");
const row = (id, overrides = {}) => ({
    id,
    studyTarget: 'en',
    learnerSourceLocale: 'ru',
    level: 'A2',
    availability: 'active',
    skillTag: id.startsWith('g') ? 'grammar' : 'vocabulary',
    rand: Number(id.replace(/\D/g, '')) / 100,
    ...overrides,
});
describe('selectArenaPoolQuestions', () => {
    it('uses only active questions from the requested pool and avoids recent IDs', () => {
        const rows = Array.from({ length: 12 }, (_, index) => row(`q${index}`));
        rows.push(row('wrong-locale', { learnerSourceLocale: 'en' }));
        rows.push(row('removed', { availability: 'removed' }));
        const result = (0, arena_question_pool_selection_1.selectArenaPoolQuestions)(rows, {
            studyTarget: 'en', learnerSourceLocale: 'ru', level: 'A2', count: 10,
            excludedIds: new Set(['q0', 'q1']),
        });
        expect(result.fallback).toBe('none');
        expect(result.ids).toHaveLength(10);
        expect(new Set(result.ids).size).toBe(10);
        expect(result.ids).not.toEqual(expect.arrayContaining(['q0', 'q1', 'wrong-locale', 'removed']));
    });
});
//# sourceMappingURL=arena_question_pool_selection.test.js.map