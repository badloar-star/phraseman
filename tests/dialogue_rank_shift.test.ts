// Клиентский сдвиг требований диалогов «+1, потолок 19» для НОВЫХ пользователей (владелец 30.10; решение координатора).
// Старым — прежняя шкала; shared-таблица, её зеркало .js и сервер не меняются (сторож).
import fs from 'node:fs';
import path from 'node:path';
import { setDialogueRankShiftActive, shiftDialogueRankRequired } from '../app/dialogue_rank_shift';
import { getDialogueV2LocalRankAccess } from '../app/dialogue_v2_local_rank_access';
import { dialogScenarioRankAccess } from '../app/ai_dialog_level_lock';
import { DIALOGUE_V2_UNLOCK_RANK_TABLE } from '../shared/dialogue_v2_catalogue_index';

const ROOT = path.join(__dirname, '..');
afterEach(() => setDialogueRankShiftActive(false));

describe('shiftDialogueRankRequired', () => {
  it('выключен — без изменений; включён — min(19, +1)', () => {
    expect(shiftDialogueRankRequired(0, false)).toBe(0);
    expect(shiftDialogueRankRequired(5, false)).toBe(5);
    expect(shiftDialogueRankRequired(0, true)).toBe(1);
    expect(shiftDialogueRankRequired(5, true)).toBe(6);
    expect(shiftDialogueRankRequired(18, true)).toBe(19);
    expect(shiftDialogueRankRequired(19, true)).toBe(19); // потолок
  });
  it('мусор возвращается как есть (контракт доступа сам отклонит)', () => {
    expect(shiftDialogueRankRequired(null, true)).toBeNull();
    expect(shiftDialogueRankRequired(-1, true)).toBe(-1);
    expect(shiftDialogueRankRequired(20, true)).toBe(20);
    expect(shiftDialogueRankRequired(1.5, true)).toBe(1.5);
  });
});

describe('доступ к диалогам V2 при сдвиге', () => {
  it('старый пользователь: ранг 0 открывает social_01, ранг 1 — первую четвёрку (прежняя шкала)', () => {
    expect(getDialogueV2LocalRankAccess('social_01', 0)?.access.status).toBe('unlocked');
    expect(getDialogueV2LocalRankAccess('work_01', 0)?.access.status).toBe('locked_by_rank');
    expect(getDialogueV2LocalRankAccess('work_01', 1)?.access.status).toBe('unlocked');
  });
  it('новый пользователь: ранг 0 — диалогов нет; каждый диалог на ранг позже', () => {
    setDialogueRankShiftActive(true);
    expect(getDialogueV2LocalRankAccess('social_01', 0)?.access.status).toBe('locked_by_rank');
    expect(getDialogueV2LocalRankAccess('social_01', 1)?.access.status).toBe('unlocked');
    expect(getDialogueV2LocalRankAccess('work_01', 1)?.access.status).toBe('locked_by_rank');
    expect(getDialogueV2LocalRankAccess('work_01', 2)?.access.status).toBe('unlocked');
    // подпись «Откроется на ранге N» берёт сдвинутое значение
    expect(getDialogueV2LocalRankAccess('work_01', 1)?.entry.unlockRank).toBe(2);
  });
  it('новый: потолок 19 — последние диалоги (ранг 19 в таблице) остаются на 19', () => {
    setDialogueRankShiftActive(true);
    expect(getDialogueV2LocalRankAccess('work_19', 18)?.access.status).toBe('locked_by_rank');
    expect(getDialogueV2LocalRankAccess('work_19', 19)?.access.status).toBe('unlocked');
    expect(getDialogueV2LocalRankAccess('work_19', 19)?.entry.unlockRank).toBe(19);
  });
  it('старый каталог (по уровню CEFR): A1 = ранг 1, новому = 2', () => {
    expect(dialogScenarioRankAccess({ id: 'x', cefr: 'A1' }, 1).status).toBe('unlocked');
    setDialogueRankShiftActive(true);
    expect(dialogScenarioRankAccess({ id: 'x', cefr: 'A1' }, 1).status).toBe('locked_by_rank');
    expect(dialogScenarioRankAccess({ id: 'x', cefr: 'A1' }, 2).status).toBe('unlocked');
  });
});

describe('сторож «сервер и общая таблица не меняются»', () => {
  const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  it('сдвиг не подключён ни к shared, ни к серверу', () => {
    for (const rel of ['shared/dialogue_v2_catalogue_index.ts', 'shared/dialogue_v2_catalogue_index.js', 'shared/dialogue_v2_access_contract.ts', 'functions/src/dialogue_v2_server_authorization.ts']) {
      expect(read(rel)).not.toContain('dialogue_rank_shift');
    }
  });
  it('shared-таблица как была: ранг 0 — social_01, 20 строк (0…19), ранг 19 — три диалога', () => {
    expect(DIALOGUE_V2_UNLOCK_RANK_TABLE).toHaveLength(20);
    expect(DIALOGUE_V2_UNLOCK_RANK_TABLE[0]).toEqual(['social_01']);
    expect(DIALOGUE_V2_UNLOCK_RANK_TABLE[19]).toEqual(['work_19', 'travel_19', 'everyday_19']);
  });
});
