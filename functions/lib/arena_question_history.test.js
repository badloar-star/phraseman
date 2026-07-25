"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const arena_question_history_1 = require("./arena_question_history");
test('keeps newest unique arena questions within the fixed history limit', () => {
    expect((0, arena_question_history_1.mergeArenaQuestionHistory)(['q1', 'q2'], ['q2', 'q3'])).toEqual(['q2', 'q3', 'q1']);
    expect((0, arena_question_history_1.mergeArenaQuestionHistory)([], Array.from({ length: 101 }, (_, i) => `q${i}`))).toHaveLength(100);
});
//# sourceMappingURL=arena_question_history.test.js.map