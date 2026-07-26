"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const arena_season_config_1 = require("./arena_season_config");
const arena_season_1 = require("./arena_season");
// Фейковый Firestore: db.collection('remote_config').doc('app').get()
function fakeDb(doc) {
    return {
        collection(name) {
            return {
                doc(id) {
                    return {
                        async get() {
                            const match = name === 'remote_config' && id === 'app';
                            return { exists: match && !!doc, data: () => (match ? doc : undefined) };
                        },
                    };
                },
            };
        },
    };
}
describe('resolveArenaSeasonConfig — reads remote_config/app.numbers', () => {
    it('no doc → defaults (behaviour unchanged)', async () => {
        expect(await (0, arena_season_config_1.resolveArenaSeasonConfig)(fakeDb(undefined))).toEqual(arena_season_1.ARENA_SEASON_DEFAULTS);
    });
    it('empty numbers → defaults', async () => {
        expect(await (0, arena_season_config_1.resolveArenaSeasonConfig)(fakeDb({ numbers: {} }))).toEqual(arena_season_1.ARENA_SEASON_DEFAULTS);
    });
    it('reads SR overrides from numbers (same keys as client remote_flags)', async () => {
        const cfg = await (0, arena_season_config_1.resolveArenaSeasonConfig)(fakeDb({
            numbers: { arena_sr_win: 30, arena_sr_loss: 15, arena_sr_bot_win: 8, arena_season_rollback_steps: 5 },
        }));
        expect(cfg.srWin).toBe(30);
        expect(cfg.srLoss).toBe(15);
        expect(cfg.srBotWin).toBe(8);
        expect(cfg.rollbackSteps).toBe(5);
        expect(cfg.floorIndex).toBe(arena_season_1.ARENA_SEASON_DEFAULTS.floorIndex); // not in numbers → default
    });
});
//# sourceMappingURL=arena_season_config.test.js.map