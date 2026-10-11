/**
 * PM-286: задания Шпиля «на слух» и «диктант» (черновик Learning V2) в пакете недели.
 * Координатор 01.10, Q34 (а): только en; es/de/fr — пакет прежний байт-в-байт.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { SPIRE_CONFIG_DEFAULTS, spireStepsForFloor } from './spire_config_contract';
import {
  SPIRE_LISTEN_DRAFT_ADMISSION_TAG,
  spireListenDraftPool,
} from './spire_listen_draft_pool';
import { SPIRE_PACK_LISTEN_FROM_FLOOR, buildSpirePack, spireFloorMix } from './spire_pack_contract';
import { answerFingerprint, type TournamentTask } from './tournament_core';

const DRAFT = path.resolve(__dirname, '../../content/arena-multilingual/generated/en/spire_listen_dictate_draft.jsonl');
const draftRows: unknown[] = fs.readFileSync(DRAFT, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));

function explanationForOptions(options: readonly string[], correctIndex: number | null) {
  return {
    ruleNote: 'Полный разбор правила задания.',
    example: 'Корректный пример применения правила.',
    wrongOptionReasons: options.map((_, index) => index === correctIndex ? '' : 'Этот вариант не подходит.'),
  };
}

/** Тот же текстовый пул, что в spire_pack_contract.test.ts (снимок хеша ниже снят с него). */
function makeTextPool(perCell: number): TournamentTask[] {
  const out: TournamentTask[] = [];
  const base: Pick<TournamentTask, 'isVoice' | 'tags' | 'verified'> = { isVoice: false, tags: [] as string[], verified: true };
  for (let difficulty = 1; difficulty <= 3; difficulty += 1) {
    for (let i = 0; i < perCell; i += 1) {
      for (const mode of ['guess_phrase', 'fill_gap', 'find_oddity']) {
        const options = ['a', 'b', 'c', 'd'];
        const correctIndex = i % options.length;
        out.push({ ...base, taskId: `${mode}-${difficulty}-${i}`, mode, difficulty,
          payload: { phrase: `p${i}`, options, correctIndex },
          explanation: explanationForOptions(options, correctIndex) });
      }
      out.push({ ...base, taskId: `translate_build-${difficulty}-${i}`, mode: 'translate_build', difficulty,
        payload: { phrase: `фраза ${i}`, wordBank: ['I', 'am', 'here', 'x'], correctTokens: ['I', 'am', 'here'], correctTokenCount: 3 },
        explanation: explanationForOptions([], null) });
      const rightOptions = ['один', 'два', 'три', 'четыре', 'пять', 'шесть'];
      const items = ['one', 'two', 'three', 'four', 'five', 'six'].map((prompt, correctIndex) => ({
        prompt, options: rightOptions, correctIndex, explanation: explanationForOptions(rightOptions, correctIndex),
      }));
      out.push({ ...base, taskId: `speed_match-${difficulty}-${i}`, mode: 'speed_match', difficulty,
        payload: { prompt: 'пары', rightOptions, items }, explanation: explanationForOptions([], null) });
    }
  }
  return out;
}

const INPUT = {
  weekId: '2026-W40',
  tier: 3,
  timer: SPIRE_CONFIG_DEFAULTS.timer,
  source: { poolVersion: 'pv', publicationFingerprint: 'fp', legacyPool: true },
};

/** Хеши, снятые ДО PM-286 на том же пуле: пакет без звука обязан остаться прежним. */
const PRE_PM286_HASH = { en: 'sp1_D6jK66pQIZgFYWdI2I5eilG9Zc3fufIq', es: 'sp1_Sq0iLnYfmgzUNLRMY15FxAMvoksa3OSL' } as const;

describe('PM-286 listen/dictate in the weekly pack', () => {
  const draft = spireListenDraftPool('en', draftRows);

  it('admits all 611 en draft rows (493 listen + 118 dictate) under the owner admission tag', () => {
    expect(draft.released).toBe(true);
    expect(draft.totalRows).toBe(611);
    expect(draft.tasks).toHaveLength(611);
    expect(draft.rejected).toEqual({});
    expect(draft.tasks.filter((t) => t.mode === 'listen_choose')).toHaveLength(493);
    expect(draft.tasks.filter((t) => t.mode === 'listen_build')).toHaveLength(118);
    for (const t of draft.tasks) {
      expect(t.tags).toContain(SPIRE_LISTEN_DRAFT_ADMISSION_TAG);
      expect(t).not.toHaveProperty('sourceFile');
    }
  });

  it('is en-only (Q34 (а)): es/de/fr/it get nothing', () => {
    for (const lang of ['es', 'de', 'fr', 'it']) {
      const pool = spireListenDraftPool(lang, draftRows);
      expect(pool.released).toBe(false);
      expect(pool.tasks).toHaveLength(0);
    }
  });

  it('pool without listen tasks → pack identical to pre-PM-286 (en and es)', () => {
    for (const lang of ['en', 'es'] as const) {
      const built = buildSpirePack({ ...INPUT, lang, pool: makeTextPool(60) });
      if (!built.ok) throw new Error(built.reason);
      expect(built.pack.packHash).toBe(PRE_PM286_HASH[lang]);
      expect(built.pack.pendingKinds).toHaveProperty('listen');
      expect(built.pack.pendingKinds).toHaveProperty('dictate');
    }
    expect(spireFloorMix(7)).toEqual({ choice: 6, translate_build: 3, speed_match: 1, listen_choose: 0, listen_build: 0 });
  });

  it('en pack carries listen/dictate from floor 6, playable by device TTS, answers only as fingerprints', () => {
    const built = buildSpirePack({ ...INPUT, lang: 'en', pool: [...makeTextPool(60), ...draft.tasks] });
    if (!built.ok) throw new Error(built.reason);
    const { pack } = built;
    expect(pack.pendingKinds).not.toHaveProperty('listen');
    expect(pack.pendingKinds).not.toHaveProperty('dictate');
    expect(pack.pendingKinds).toHaveProperty('voice');
    const byId = new Map(draft.tasks.map((t) => [t.taskId, t]));
    let listen = 0;
    let dictate = 0;
    for (const floor of pack.floors) {
      expect(floor.steps).toHaveLength(spireStepsForFloor(floor.floor));
      for (const step of floor.steps) {
        const ids = step.sets.flatMap((set) => set.tasks.map((t) => t.taskId));
        expect(new Set(ids).size).toBe(ids.length);
        for (const set of step.sets) {
          expect(set.tasks).toHaveLength(10);
          set.tasks.forEach((task, i) => {
            if (task.kind !== 'listen' && task.kind !== 'dictate') return;
            expect(floor.floor).toBeGreaterThanOrEqual(SPIRE_PACK_LISTEN_FROM_FLOOR);
            const source = byId.get(task.taskId);
            if (!source) throw new Error(`unknown ${task.taskId}`);
            expect(task.payload.audioUri).toMatch(/^device-tts:en:[0-9a-f]+$/);
            expect(task.payload.phrase).toBe(source.payload.phrase);
            expect(task.payload).not.toHaveProperty('correctIndex');
            expect(task.payload).not.toHaveProperty('correctTokens');
            if (task.kind === 'listen') {
              listen += 1;
              expect(task.mode).toBe('listen_choose');
              expect(set.answerFingerprints[i]).toEqual([answerFingerprint(pack.saltId, task.taskId, source.payload.correctIndex)]);
            } else {
              dictate += 1;
              expect(task.mode).toBe('listen_build');
              expect(task.payload.correctTokenCount).toBe((source.payload.correctTokens as string[]).length);
              expect(set.answerFingerprints[i]).toEqual([answerFingerprint(pack.saltId, task.taskId, source.payload.correctTokens)]);
            }
          });
        }
      }
    }
    // 6–9, 11–14: 2 listen + 1 dictate на набор; Страж 10/15: 1 + 1.
    expect(listen).toBeGreaterThan(400);
    expect(dictate).toBeGreaterThan(200);
  });

  it('rejects a listen task whose audio is in another language than the pack', () => {
    const foreign = draft.tasks.map((t) => ({ ...t, payload: { ...t.payload, audioUri: String(t.payload.audioUri).replace('device-tts:en:', 'device-tts:es:') } }));
    const built = buildSpirePack({ ...INPUT, lang: 'en', pool: [...makeTextPool(60), ...foreign] });
    if (!built.ok) throw new Error(built.reason);
    expect(built.pack.packHash).toBe(PRE_PM286_HASH.en);
  });
});
