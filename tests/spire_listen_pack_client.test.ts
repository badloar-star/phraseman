/**
 * PM-286: пакет en с заданиями «на слух»/«диктант» проходит КЛИЕНТСКИЙ путь —
 * разбор пакета, звук голосом телефона (D47) и мгновенная проверка ответа по отпечаткам.
 * зачем: серверная сборка сама по себе ничего не доказывает — клиент отбраковывал
 * незнакомые режимы и вместе с ними весь пакет.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { arenaAnswerIsCorrect } from '../modules/arena/answer_check';
import { resolveSpireListenAudio } from '../modules/spire/listen_audio';
import { spireDecodeWeekPack } from '../modules/spire/pack_plan';
import { SPIRE_CONFIG_DEFAULTS } from '../functions/src/spire_config_contract';
import { spireListenDraftPool } from '../functions/src/spire_listen_draft_pool';
import { buildSpirePack } from '../functions/src/spire_pack_contract';
import type { TournamentTask } from '../functions/src/tournament_core';

const DRAFT = path.resolve(__dirname, '../content/arena-multilingual/generated/en/spire_listen_dictate_draft.jsonl');

function textPool(perCell: number): TournamentTask[] {
  const out: TournamentTask[] = [];
  const explanation = (options: readonly string[], correct: number | null) => ({
    ruleNote: 'Разбор.', example: 'Пример.',
    wrongOptionReasons: options.map((_, i) => (i === correct ? '' : 'Не подходит.')),
  });
  for (let difficulty = 1; difficulty <= 3; difficulty += 1) {
    for (let i = 0; i < perCell; i += 1) {
      for (const mode of ['guess_phrase', 'fill_gap', 'find_oddity']) {
        const options = ['a', 'b', 'c', 'd'];
        out.push({ taskId: `${mode}-${difficulty}-${i}`, mode, difficulty, isVoice: false, tags: [], verified: true,
          payload: { phrase: `p${i}`, options, correctIndex: i % 4 }, explanation: explanation(options, i % 4) });
      }
      out.push({ taskId: `tb-${difficulty}-${i}`, mode: 'translate_build', difficulty, isVoice: false, tags: [], verified: true,
        payload: { phrase: `ф ${i}`, wordBank: ['I', 'am', 'here', 'x'], correctTokens: ['I', 'am', 'here'], correctTokenCount: 3 },
        explanation: explanation([], null) });
      const rightOptions = ['1', '2', '3', '4', '5', '6'];
      out.push({ taskId: `sm-${difficulty}-${i}`, mode: 'speed_match', difficulty, isVoice: false, tags: [], verified: true,
        payload: { prompt: 'пары', rightOptions, items: ['a', 'b', 'c', 'd', 'e', 'f'].map((prompt, correctIndex) => ({
          prompt, options: rightOptions, correctIndex, explanation: explanation(rightOptions, correctIndex) })) },
        explanation: explanation([], null) });
    }
  }
  return out;
}

describe('PM-286 en pack with listen/dictate on the client', () => {
  it('decodes, every listen/dictate task resolves to device TTS and checks answers locally', () => {
    const rows = fs.readFileSync(DRAFT, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
    const draft = spireListenDraftPool('en', rows);
    const byId = new Map(draft.tasks.map((t) => [t.taskId, t]));
    const built = buildSpirePack({
      weekId: '2026-W40', lang: 'en', tier: 5, pool: [...textPool(60), ...draft.tasks],
      timer: SPIRE_CONFIG_DEFAULTS.timer, source: { poolVersion: 'pv', publicationFingerprint: 'fp', legacyPool: true },
    });
    if (!built.ok) throw new Error(built.reason);

    const decoded = spireDecodeWeekPack(JSON.parse(built.json), { weekId: '2026-W40', lang: 'en', tier: 5 });
    if (!decoded.ok) throw new Error(`decode failed: ${JSON.stringify(decoded)}`);
    const { pack } = decoded;

    let checked = 0;
    for (const floor of pack.floors) {
      for (const step of floor.steps) {
        for (const set of step.sets) {
          set.tasks.forEach((task, i) => {
            if (task.kind !== 'listen' && task.kind !== 'dictate') return;
            const source = byId.get(task.taskId);
            if (!source) throw new Error(task.taskId);
            const audio = resolveSpireListenAudio(task.payload, 'en');
            expect(audio).toMatchObject({ ok: true, engine: 'device_tts', speechLanguage: 'en-US', text: source.payload.phrase });
            const check = { taskId: task.taskId, mode: task.mode, kind: task.kind, answerFingerprints: set.answerFingerprints[i] };
            if (task.kind === 'listen') {
              const right = Number(source.payload.correctIndex);
              expect(arenaAnswerIsCorrect(pack.saltId, check, { selectedIndex: right })).toBe(true);
              expect(arenaAnswerIsCorrect(pack.saltId, check, { selectedIndex: (right + 1) % 4 })).toBe(false);
            } else {
              const tokens = source.payload.correctTokens as string[];
              expect(Number(task.payload.correctTokenCount)).toBe(tokens.length);
              expect(arenaAnswerIsCorrect(pack.saltId, check, { tokens })).toBe(true);
              expect(arenaAnswerIsCorrect(pack.saltId, check, { tokens: [...tokens].reverse().concat('x') })).toBe(false);
            }
            checked += 1;
          });
        }
      }
    }
    expect(checked).toBeGreaterThan(600);
  });
});
