import { resolveArenaSeasonConfig } from './arena_season_config';
import { ARENA_SEASON_DEFAULTS } from './arena_season';

// Фейковый Firestore: db.collection('remote_config').doc('app').get()
function fakeDb(doc: Record<string, unknown> | undefined) {
  return {
    collection(name: string) {
      return {
        doc(id: string) {
          return {
            async get() {
              const match = name === 'remote_config' && id === 'app';
              return { exists: match && !!doc, data: () => (match ? doc : undefined) };
            },
          };
        },
      };
    },
  } as unknown as FirebaseFirestore.Firestore;
}

describe('resolveArenaSeasonConfig — reads remote_config/app.numbers', () => {
  it('no doc → defaults (behaviour unchanged)', async () => {
    expect(await resolveArenaSeasonConfig(fakeDb(undefined))).toEqual(ARENA_SEASON_DEFAULTS);
  });

  it('empty numbers → defaults', async () => {
    expect(await resolveArenaSeasonConfig(fakeDb({ numbers: {} }))).toEqual(ARENA_SEASON_DEFAULTS);
  });

  it('reads SR overrides from numbers (same keys as client remote_flags)', async () => {
    const cfg = await resolveArenaSeasonConfig(fakeDb({
      numbers: { arena_sr_win: 30, arena_sr_loss: 15, arena_sr_bot_win: 8, arena_season_rollback_steps: 5 },
    }));
    expect(cfg.srWin).toBe(30);
    expect(cfg.srLoss).toBe(15);
    expect(cfg.srBotWin).toBe(8);
    expect(cfg.rollbackSteps).toBe(5);
    expect(cfg.floorIndex).toBe(ARENA_SEASON_DEFAULTS.floorIndex); // not in numbers → default
  });
});
