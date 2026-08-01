"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
// зачем: этот сюит раньше проверял «проводку» ЖИВОЙ игры Арена (Firestore-триггер в index.ts,
// клиентский hooks/use-arena-session.ts, вотчдог game_loop.ts). Сама игра Арена выведена из
// эксплуатации (см. src/quiz_arena_decommission.ts — все геймплейные callable/триггеры заменены
// tombstone-заглушками), а hooks/use-arena-session.ts и game_loop.ts физически удалены из
// репозитория — их больше некуда читать. Оставлен только 1 живой инвариант: 40-секундный тайм-аут
// вопроса Арены остаётся зафиксирован в src/content_factory/arena_stage_consumer_adapter.ts,
// который до сих пор используется генератором пула вопросов (см. admin_arena_question_pool.ts).
describe('Arena timing production wiring (retired gameplay pipeline)', () => {
    it('keeps the 40 second question timeout authoritative in the still-active pool generator adapter', () => {
        const adapter = node_fs_1.default.readFileSync(node_path_1.default.join(__dirname, 'arena_stage_consumer_adapter.ts'), 'utf8');
        expect(adapter).toContain('difficulty');
        expect(adapter).toContain('questionTimeoutMs !== 40000');
    });
});
//# sourceMappingURL=arena_timing_wiring.test.js.map