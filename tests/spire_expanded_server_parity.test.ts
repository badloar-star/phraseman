/**
 * Пик: сервер кладёт задания новых механик в пакет недели, клиент их читает (владелец 11.11.2026, «без выкладки»).
 *
 * зачем: серверный и клиентский код не могут делить модуль, поэтому правила формы задания записаны дважды. Сторож держит их
 * вместе на деле: пакет, собранный СЕРВЕРНЫМ кодом, обязан читаться КЛИЕНТСКИМ разбором и превращаться в задание для экрана.
 * И главное обещание владельцу: пока новые задания явно не включены, пакет собирается байт-в-байт как раньше.
 * Сработал — чинить functions/src/spire_expanded_task.ts или modules/expanded-formats/validate.ts, а не ослаблять сторожа.
 */
import { SPIRE_CONFIG_DEFAULTS, SPIRE_STEP_TASK_COUNT } from '../functions/src/spire_config_contract';
import {
  SPIRE_EXPANDED_MODES,
  spireExpandedPoolTaskFromAuthorRecord,
  spireExpandedPoolTaskProblem,
  type SpireExpandedPoolTask,
} from '../functions/src/spire_expanded_task';
import { SPIRE_PACK_EXPANDED_FROM_FLOOR, buildSpirePack } from '../functions/src/spire_pack_contract';
import type { TournamentTask } from '../functions/src/tournament_core';
import { EXPANDED_FORMATS } from '../modules/expanded-formats/types';
import { spireExpandedTaskFromPack } from '../modules/spire/expanded_pack_task';
import { spireDecodeWeekPack } from '../modules/spire/pack_plan';

function explanation(options: readonly string[], correctIndex: number | null) {
  return {
    ruleNote: 'Полный разбор правила задания.',
    example: 'Корректный пример применения правила.',
    wrongOptionReasons: options.map((_option, index) => (index === correctIndex ? '' : 'Этот вариант не соответствует условию задания.')),
  };
}

/** Тот же минимальный пул, что в серверном тесте пакета: выбор (3 режима) + сборка + пары по трём сложностям. */
function makePool(perCell: number): TournamentTask[] {
  const out: TournamentTask[] = [];
  const base: Pick<TournamentTask, 'isVoice' | 'tags' | 'verified'> = { isVoice: false, tags: [] as string[], verified: true };
  for (let difficulty = 1; difficulty <= 3; difficulty += 1) {
    for (let i = 0; i < perCell; i += 1) {
      for (const mode of ['guess_phrase', 'fill_gap', 'find_oddity']) {
        const options = ['a', 'b', 'c', 'd'];
        const correctIndex = i % options.length;
        out.push({ ...base, taskId: `${mode}-${difficulty}-${i}`, mode, difficulty, payload: { phrase: `p${i}`, options, correctIndex }, explanation: explanation(options, correctIndex) });
      }
      out.push({ ...base, taskId: `translate_build-${difficulty}-${i}`, mode: 'translate_build', difficulty,
        payload: { phrase: `фраза ${i}`, wordBank: ['I', 'am', 'here', 'x'], correctTokens: ['I', 'am', 'here'], correctTokenCount: 3 },
        explanation: explanation([], null) });
      const rightOptions = ['один', 'два', 'три', 'четыре', 'пять', 'шесть'];
      const items = ['one', 'two', 'three', 'four', 'five', 'six'].map((prompt, correctIndex) => ({ prompt, options: rightOptions, correctIndex, explanation: explanation(rightOptions, correctIndex) }));
      out.push({ ...base, taskId: `speed_match-${difficulty}-${i}`, mode: 'speed_match', difficulty, payload: { prompt: 'пары', rightOptions, items }, explanation: explanation([], null) });
    }
  }
  return out;
}

const EXERCISES: Record<string, Record<string, unknown>> = {
  context_choice: { options: ['Yes, I do.', 'At nine.', 'It is my flat.'], key: 0 },
  evidence_choice: { context: 'The shop was closed. We went home.', options: ['The shop was closed.', 'We went home.'], key: 1 },
  dialogue_order: { bank: ['B: Yes.', 'A: Is it open?'], key: [1, 0] },
  word_repair: { words: ['She', 'have', 'finished.'], replacements: ['has', 'had'], key: { word: 1, replacement: 0 } },
  multi_select: { options: ['I am here.', 'I is here.', 'We are here.'], key: [0, 2] },
  linked_gaps: { slots: [['rains', 'rain'], ['will stay', 'stay']], key: [0, 0] },
  typed_word: { key: 'left' },
  sentence_transform: { acceptedAnswers: ['The report was written by Anna.'] },
  classify_function: { items: ['At nine.', 'At home.'], groups: ['When', 'Where'], key: [0, 1] },
  reply_pairs: { questions: ['Where?', 'When?'], replies: ['At nine.', 'At home.'], key: [1, 0] },
  sentence_build_noise: { bank: ['goes', 'She', 'go'], need: 2, key: [1, 0] },
  remove_intruder: { words: ['I', 'am', 'do', 'tired'], key: 2 },
};

function expandedPool(perMode: number): SpireExpandedPoolTask[] {
  const out: SpireExpandedPoolTask[] = [];
  for (const mode of SPIRE_EXPANDED_MODES) {
    for (let i = 0; i < perMode; i += 1) {
      out.push({
        taskId: `peak-expanded-en-b001-${mode}-${String(i).padStart(2, '0')}`,
        lang: 'en',
        mode,
        difficulty: 1 + (i % 3),
        payload: {
          exercise: EXERCISES[mode],
          ui: { en: { instruction: 'Do the task', prompt: 'Prompt', context: '' }, ru: { instruction: 'Выполните задание', prompt: 'Prompt', context: '' } },
          feedback: { en: { correct: 'Because the rule says so.' }, ru: { correct: 'Потому что так по правилу.' } },
        },
      });
    }
  }
  return out;
}

const INPUT = {
  weekId: '2026-W46',
  lang: 'en',
  tier: 3,
  pool: makePool(40),
  timer: SPIRE_CONFIG_DEFAULTS.timer,
  source: { poolVersion: 'pv', publicationFingerprint: 'fp', legacyPool: true },
};
const EXPECT = { weekId: INPUT.weekId, lang: INPUT.lang, tier: INPUT.tier };

describe('Пик: новые механики в серверном пакете недели', () => {
  it('сервер и клиент знают одни и те же двенадцать форматов', () => {
    expect([...SPIRE_EXPANDED_MODES].sort()).toEqual([...EXPANDED_FORMATS].sort());
  });

  it('образцы всех двенадцати форматов проходят серверную проверку', () => {
    for (const task of expandedPool(1)) expect([task.mode, spireExpandedPoolTaskProblem(task, 'en')]).toEqual([task.mode, null]);
  });

  it('пока новые задания не включены, пакет собирается байт-в-байт как раньше', () => {
    const plain = buildSpirePack(INPUT);
    const empty = buildSpirePack({ ...INPUT, expanded: { tasks: [], perSet: 2 } });
    const zero = buildSpirePack({ ...INPUT, expanded: { tasks: expandedPool(3), perSet: 0 } });
    expect(plain.ok && empty.ok && zero.ok).toBe(true);
    if (!plain.ok || !empty.ok || !zero.ok) return;
    expect(empty.json).toBe(plain.json);
    expect(zero.json).toBe(plain.json);
  });

  it('включённые задания встают в наборы с нужного этажа, без повторов в ступени, и клиент читает такой пакет', () => {
    const built = buildSpirePack({ ...INPUT, expanded: { tasks: expandedPool(6), perSet: 2 } });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    for (const floor of built.pack.floors) {
      for (const step of floor.steps) {
        const inStep = step.sets.flatMap((set) => set.tasks.map((task) => task.taskId));
        expect(new Set(inStep).size).toBe(inStep.length);
        for (const set of step.sets) {
          expect(set.tasks).toHaveLength(SPIRE_STEP_TASK_COUNT);
          const expanded = set.tasks.filter((task) => task.kind === 'expanded');
          expect([floor.floor, expanded.length]).toEqual([floor.floor, floor.floor >= SPIRE_PACK_EXPANDED_FROM_FLOOR ? 2 : 0]);
          set.tasks.forEach((task, index) => expect(set.answerFingerprints[index].length).toBeGreaterThan(0));
        }
      }
    }
    const decoded = spireDecodeWeekPack(JSON.parse(built.json), EXPECT);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    const tasks = decoded.pack.floors.flatMap((floor) => floor.steps.flatMap((step) => step.sets.flatMap((set) => set.tasks)));
    const expandedTasks = tasks.filter((task) => task.kind === 'expanded');
    expect(expandedTasks.length).toBeGreaterThan(0);
    for (const task of expandedTasks) {
      const screen = spireExpandedTaskFromPack(task, 'ru', 'en');
      expect([task.taskId, screen.ok]).toEqual([task.taskId, true]);
    }
  });

  it('заданий не хватило — слот остаётся за прежним видом, пакет собирается', () => {
    const one = expandedPool(1).slice(0, 1);
    const built = buildSpirePack({ ...INPUT, expanded: { tasks: one, perSet: 3 } });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const perSet = built.pack.floors.flatMap((floor) => floor.steps.flatMap((step) => step.sets.map((set) => set.tasks.filter((task) => task.kind === 'expanded').length)));
    expect(Math.max(...perSet)).toBe(1);
  });

  it('битое задание или задание другого языка — пакет не собирается', () => {
    const broken = [{ ...expandedPool(1)[0], payload: { ...expandedPool(1)[0].payload, exercise: { options: ['a'], key: 0 } } }];
    expect(buildSpirePack({ ...INPUT, expanded: { tasks: broken, perSet: 1 } })).toMatchObject({ ok: false, reason: 'expanded_task_invalid' });
    const foreign = [{ ...expandedPool(1)[0], lang: 'es' }];
    expect(buildSpirePack({ ...INPUT, expanded: { tasks: foreign, perSet: 1 } })).toMatchObject({ ok: false, reason: 'expanded_task_invalid' });
  });

  it('авторская запись Кодекса превращается в задание пула; запись с битым упражнением — нет', () => {
    const record = {
      schema: 'peak-expanded-author-v1', candidateId: 'peak-expanded-en-b001-context_choice-01', studyTarget: 'en', format: 'context_choice',
      level: { week: 6, floor: 3 }, exercise: EXERCISES.context_choice,
      ui: { en: { instruction: 'Choose the reply', prompt: 'Do you live here?', context: '' } },
      feedback: { en: { correct: 'A yes or no question needs yes or no.' } },
    };
    expect(spireExpandedPoolTaskFromAuthorRecord(record)).toMatchObject({ taskId: record.candidateId, lang: 'en', mode: 'context_choice', difficulty: 2 });
    expect(spireExpandedPoolTaskFromAuthorRecord({ ...record, exercise: { options: ['a'], key: 0 } })).toBeNull();
  });
});
