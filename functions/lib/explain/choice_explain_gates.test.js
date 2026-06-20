"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const choice_explain_gates_1 = require("./choice_explain_gates");
describe('choice_explain_gates — input validation', () => {
    it('accepts a normal correct + meaning + distractors', () => {
        const r = (0, choice_explain_gates_1.validateChoiceInput)({
            correctEn: "I'm fine, thanks.",
            phraseMeaning: 'Я в порядке, спасибо.',
            distractors: ['We are all okay.', 'He is not here.'],
            lang: 'ru',
        });
        expect(r.ok).toBe(true);
        expect(r.distractors).toEqual(['We are all okay.', 'He is not here.']);
    });
    it('rejects an empty correct answer', () => {
        expect((0, choice_explain_gates_1.validateChoiceInput)({ correctEn: '', phraseMeaning: 'x', distractors: ['a'], lang: 'ru' }).ok).toBe(false);
    });
    it('rejects an empty meaning', () => {
        expect((0, choice_explain_gates_1.validateChoiceInput)({ correctEn: 'Hi', phraseMeaning: '', distractors: ['a'], lang: 'ru' }).ok).toBe(false);
    });
    it('rejects when there are no distractors', () => {
        expect((0, choice_explain_gates_1.validateChoiceInput)({ correctEn: 'Hi', phraseMeaning: 'm', distractors: [], lang: 'ru' }).reason).toBe('no_distractors');
    });
    it('de-dupes and caps distractors', () => {
        const many = Array.from({ length: choice_explain_gates_1.MAX_CHOICE_DISTRACTORS + 5 }, (_, i) => `opt ${i}`);
        const r = (0, choice_explain_gates_1.validateChoiceInput)({ correctEn: 'Hi', phraseMeaning: 'm', distractors: [...many, 'opt 0', 'OPT 0'], lang: 'ru' });
        expect(r.ok).toBe(true);
        expect(r.distractors?.length).toBe(choice_explain_gates_1.MAX_CHOICE_DISTRACTORS);
    });
});
describe('choice_explain_gates — batch parsing', () => {
    const distractors = ['We are all okay.', 'He is not here.'];
    it('parses a clean JSON batch and maps onto requested keys', () => {
        const raw = JSON.stringify({
            confirm: 'Nice — that is the natural one!',
            distractors: {
                'We are all okay.': 'That talks about a group, not just you.',
                'He is not here.': 'That is about someone else, not you.',
            },
        });
        const r = (0, choice_explain_gates_1.parseChoiceBatch)(raw, distractors);
        expect(r.ok).toBe(true);
        expect(r.confirm).toContain('natural');
        expect(r.distractors['We are all okay.']).toContain('group');
        expect(r.distractors['He is not here.']).toContain('someone else');
    });
    it('tolerates a ```json fenced reply', () => {
        const raw = '```json\n{"confirm":"Good!","distractors":{"We are all okay.":"too plural"}}\n```';
        const r = (0, choice_explain_gates_1.parseChoiceBatch)(raw, distractors);
        expect(r.ok).toBe(true);
        expect(r.distractors['We are all okay.']).toBe('too plural');
    });
    it('maps keys case-insensitively', () => {
        const raw = JSON.stringify({ confirm: 'Yes', distractors: { 'we are all okay.': 'plural' } });
        const r = (0, choice_explain_gates_1.parseChoiceBatch)(raw, distractors);
        expect(r.distractors['We are all okay.']).toBe('plural');
    });
    it('fails on unparseable JSON', () => {
        expect((0, choice_explain_gates_1.parseChoiceBatch)('not json at all', distractors).ok).toBe(false);
    });
    it('fails when confirm is missing', () => {
        const raw = JSON.stringify({ distractors: { 'We are all okay.': 'x' } });
        expect((0, choice_explain_gates_1.parseChoiceBatch)(raw, distractors).ok).toBe(false);
    });
});
//# sourceMappingURL=choice_explain_gates.test.js.map