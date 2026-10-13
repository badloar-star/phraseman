// зачем (правило владельца 13.10): «Диалоги открываются все по мере ранга. С самого начала доступен только 1 диалог уровня A1 в «Общении» и всё.
// Остальные открываются по рангу. Ранги все используются, а не с 7». Одна таблица-источник (shared/dialogue_v2_catalogue_index), сторож её состава.
import fs from 'node:fs';
import path from 'node:path';
import {
  DIALOGUE_V2_CATALOGUE_INDEX,
  DIALOGUE_V2_UNLOCK_RANK_TABLE,
  getDialogueV2CatalogueEntry,
} from '../shared/dialogue_v2_catalogue_index';
import { DIALOGUE_V2_CEFR_SEQUENCE, DIALOGUE_V2_WORLD_IDS } from '../shared/dialogue_v2_contract';
import { getDialogueV2LocalRankAccess } from '../app/dialogue_v2_local_rank_access';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

describe('таблица рангов открытия диалогов', () => {
  const unlockedAt = (rank: number) => DIALOGUE_V2_CATALOGUE_INDEX.filter((entry) => entry.unlockRank <= rank);

  it('ранг 0: открыт ровно один диалог — первый A1 «Общения» (social_01)', () => {
    const open = unlockedAt(0);
    expect(open.map((entry) => entry.id)).toEqual(['social_01']);
    expect(open[0].cefr).toBe('A1');
    expect(getDialogueV2LocalRankAccess('social_01', 0)?.access).toEqual({ status: 'unlocked' });
    expect(getDialogueV2LocalRankAccess('work_01', 0)?.access).toEqual({ status: 'locked_by_rank', rankRequired: 1 });
  });

  it('каждый ранг 1…19 открывает хотя бы один диалог, все ранги используются, ни один диалог не открывается выше 19', () => {
    for (let rank = 1; rank <= 19; rank += 1) {
      const newlyOpened = DIALOGUE_V2_CATALOGUE_INDEX.filter((entry) => entry.unlockRank === rank);
      expect(`ранг ${rank}: ${newlyOpened.length >= 1}`).toBe(`ранг ${rank}: true`);
      expect(newlyOpened.length).toBeLessThanOrEqual(4);
    }
    expect(DIALOGUE_V2_CATALOGUE_INDEX.every((entry) => entry.unlockRank >= 0 && entry.unlockRank <= 19)).toBe(true);
    expect(unlockedAt(19)).toHaveLength(76);
  });

  it('все 76 диалогов в таблице ровно по одному разу и совпадают с каталогом', () => {
    const ids = DIALOGUE_V2_UNLOCK_RANK_TABLE.flat();
    expect(ids).toHaveLength(76);
    expect(new Set(ids).size).toBe(76);
    expect([...ids].sort()).toEqual(DIALOGUE_V2_CATALOGUE_INDEX.map((entry) => entry.id).sort());
    expect(DIALOGUE_V2_UNLOCK_RANK_TABLE).toHaveLength(20); // ранги 0…19
  });

  it('порядок уровней не нарушен: диалог более высокого уровня не открывается раньше более низкого', () => {
    const sorted = [...DIALOGUE_V2_CATALOGUE_INDEX].sort((a, b) => a.unlockRank - b.unlockRank);
    let maxCefr = -1;
    for (const entry of sorted) {
      const cefr = CEFR_ORDER.indexOf(entry.cefr);
      // внутри ранга уровни могут смешиваться только соседние; между рангами уровень не убывает
      expect(cefr).toBeGreaterThanOrEqual(maxCefr - 1);
      maxCefr = Math.max(maxCefr, cefr);
    }
    // внутри каждого раздела порядок диалогов (по возрастанию номера, то есть уровня) сохранён
    for (const worldId of DIALOGUE_V2_WORLD_IDS) {
      const ranks = DIALOGUE_V2_CATALOGUE_INDEX.filter((entry) => entry.worldId === worldId).map((entry) => entry.unlockRank);
      expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
    }
    expect(DIALOGUE_V2_CATALOGUE_INDEX.filter((entry) => entry.worldId === 'social').map((entry) => entry.cefr)).toEqual([...DIALOGUE_V2_CEFR_SEQUENCE]);
  });

  it('структурное поле rankRequired (его проверяют пакеты и их хэши) не изменилось: номер сценария в разделе', () => {
    for (const worldId of DIALOGUE_V2_WORLD_IDS) {
      const entries = DIALOGUE_V2_CATALOGUE_INDEX.filter((entry) => entry.worldId === worldId);
      expect(entries.map((entry) => entry.rankRequired)).toEqual(Array.from({ length: 19 }, (_, index) => index + 1));
    }
    expect(getDialogueV2CatalogueEntry('social_19')).toEqual({ id: 'social_19', worldId: 'social', rankRequired: 19, unlockRank: 18, cefr: 'C2' });
  });

  it('замок и подпись «Откроется на ранге N» берут ранг открытия из таблицы, а не номер в разделе', () => {
    expect(getDialogueV2LocalRankAccess('social_07', 6)?.access).toEqual({ status: 'unlocked' }); // social_07 открывается на ранге 6 (раньше — на 7)
    expect(getDialogueV2LocalRankAccess('social_08', 6)?.access).toEqual({ status: 'locked_by_rank', rankRequired: 7 });
    expect(getDialogueV2LocalRankAccess('work_06', 5)?.access).toEqual({ status: 'locked_by_rank', rankRequired: 6 });
    const proj = read('app/dialogue_v2_authorized_catalogue_projection.ts');
    const rel = read('app/dialogue_v2_released_catalogue_projection.ts');
    expect(proj).toContain('rankRequired: entry.unlockRank,');
    expect(rel).toContain('rankRequired: entry.unlockRank,');
    expect(proj).not.toContain('rankRequired: entry.rankRequired,');
    expect(rel).not.toContain('rankRequired: entry.rankRequired,');
  });

  it('пройденные диалоги не запираются новой таблицей: «пройдено» решается раньше замка', () => {
    const proj = read('app/dialogue_v2_authorized_catalogue_projection.ts');
    expect(proj).toContain("const status: DialogueV2CatalogueLearnerItem['status'] = isDone ? 'done' : unlocked ? 'available' : 'locked';");
  });

  it('журнал [DIALOG-RANK-GATE] есть в обеих проекциях и пишет id, уровень, ранг открытия, мой ранг, решение', () => {
    const access = read('app/dialogue_v2_local_rank_access.ts');
    expect(access).toContain('[DIALOG-RANK-GATE]');
    expect(access).toContain('${row.id}:${row.cefr}@${row.unlockRank}=${row.decision}');
    expect(access).toContain('мой_ранг=');
    expect(read('app/dialogue_v2_authorized_catalogue_projection.ts')).toContain("logDialogueV2RankGate('authorized'");
    expect(read('app/dialogue_v2_released_catalogue_projection.ts')).toContain("logDialogueV2RankGate('released'");
  });

  it('зеркало shared/*.js совпадает с .ts по таблице и рангам открытия', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mirror = require('../shared/dialogue_v2_catalogue_index.js') as { DIALOGUE_V2_UNLOCK_RANK_TABLE: readonly (readonly string[])[]; DIALOGUE_V2_CATALOGUE_INDEX: readonly { id: string; unlockRank: number }[] };
    expect(mirror.DIALOGUE_V2_UNLOCK_RANK_TABLE).toEqual(DIALOGUE_V2_UNLOCK_RANK_TABLE);
    expect(mirror.DIALOGUE_V2_CATALOGUE_INDEX.map((entry) => `${entry.id}:${entry.unlockRank}`)).toEqual(DIALOGUE_V2_CATALOGUE_INDEX.map((entry) => `${entry.id}:${entry.unlockRank}`));
  });
});
