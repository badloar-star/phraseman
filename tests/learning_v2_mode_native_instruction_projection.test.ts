/**
 * Сторож двух правок в проекции mode-native заданий (2026-08-27).
 *
 * зачем этот тест: обе правки живут в session_package_from_shard_v1.ts —
 * файле, который собирает то, что реально видит ученик на экране. Ошибка здесь
 * не падает и не логируется: человек просто видит неправильный текст задания.
 * Такое ловится только тестом.
 *
 * Правка 1 — авторская инструкция. SessionModeNativePracticeSourceV1 получил
 * поле instruction; buildSessionShardFromSource кладёт его в instructionByLocale,
 * а проекция обязана показать именно его, а не общий текст по семье задания.
 *
 * Правка 2 — режим «повтори вслух» (scripted_repeat_compare). Раньше проекция
 * возвращала `${instruction} ${payload.targetPhrase}`, из-за чего целевая фраза
 * появлялась ДВАЖДЫ: один раз крупным слоем нативного рендерера, второй — внутри
 * текста инструкции. Теперь prompt содержит только инструкцию.
 */
// зачем именно сессия 2, а не 1: поле instruction появилось позже, чем была
// написана испанская сессия 1 — там оно не заполнено вообще. Авторские
// инструкции реально несёт сессия 2 (все 17 заданий), она и есть предмет
// проверки. Сессия 1 при этом остаётся валидной: instruction опционально.
import { buildEsAuthoredSessionShard } from '../modules/learning-v2/content/source/es_authored_sessions_v1';
import { ES_EPISODE_01_SESSION_02_SOURCE } from '../modules/learning-v2/content/source/es_episode_01_session_02_v1';
import { ES_EPISODE_01_SESSION_02_MODE_NATIVE_PRACTICE_V1 } from '../modules/learning-v2/content/source/es_episode_01_session_02_mode_native_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';
import { learningV2CourseSessionIdV1 } from '../modules/learning-v2/content/course_topology_v1';

type LearnerInteraction = Readonly<{
  interactionId: string;
  family: string;
  prompt: string;
  modePayload: { family: string; targetPhrase?: string } | null;
}>;

const LOCALE = 'ru';
const COURSE_SESSION_ID = learningV2CourseSessionIdV1(1, 2);

function learnerInteractions(): readonly LearnerInteraction[] {
  const shard = buildEsAuthoredSessionShard(ES_EPISODE_01_SESSION_02_SOURCE);
  const children = buildSessionChildBodiesFromShard(shard, LOCALE, COURSE_SESSION_ID);
  const learner = children.learner as { interactions: readonly LearnerInteraction[] };
  return learner.interactions;
}

describe('mode-native instruction projection', () => {
  it('показывает авторскую инструкцию задания, а не общий текст семьи', () => {
    const interactions = learnerInteractions();
    // Практика идёт после трёх интро-вопросов — сопоставляем по порядку.
    const practice = interactions.slice(-ES_EPISODE_01_SESSION_02_MODE_NATIVE_PRACTICE_V1.length);
    expect(practice).toHaveLength(ES_EPISODE_01_SESSION_02_MODE_NATIVE_PRACTICE_V1.length);

    let checked = 0;
    practice.forEach((interaction, index) => {
      const authored = ES_EPISODE_01_SESSION_02_MODE_NATIVE_PRACTICE_V1[index]!;
      const instruction = authored.instruction?.[LOCALE];
      if (!instruction) return;
      expect(interaction.prompt).toContain(instruction);
      checked += 1;
    });
    // Защита от «зелёного» теста на пустом наборе: инструкции должны быть.
    expect(checked).toBeGreaterThan(0);
  });

  it('не дублирует целевую фразу в задании «повтори вслух»', () => {
    const repeats = learnerInteractions().filter(
      (interaction) => interaction.modePayload?.family === 'scripted_repeat_compare',
    );
    expect(repeats.length).toBeGreaterThan(0);

    for (const interaction of repeats) {
      const target = interaction.modePayload?.targetPhrase;
      expect(typeof target).toBe('string');
      // Крупный слой с фразой рисует сам режим; в тексте инструкции её быть не должно.
      expect(interaction.prompt).not.toContain(target as string);
    }
  });
});
