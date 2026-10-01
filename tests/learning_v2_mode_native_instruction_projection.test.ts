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
// зачем (координатор §46, 2026-10-01): прежний предмет проверки — испанская
// сессия 2 — удалён осознанно (f5a01076d, решение владельца), и набор не
// запускался вовсе. Обе правки по-прежнему живут в проекции, поэтому сторож
// перенесён на ВСЕ текущие авторские занятия en и es.
import { AUTHORED_EPISODE_01_SESSIONS } from '../modules/learning-v2/content/source/authored_sessions_v1';
import { allAuthoredEsEpisode01Sessions } from '../modules/learning-v2/content/source/es_authored_sessions_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';
import {
  buildSessionShardFromSource,
  type SessionSource,
} from '../modules/learning-v2/content/source/session_shard_from_source_v1';

type LearnerInteraction = Readonly<{
  interactionId: string;
  family: string;
  prompt: string;
  modePayload: { family: string; targetPhrase?: string } | null;
}>;

const LOCALE = 'ru';
const SESSIONS: readonly SessionSource[] = [
  ...AUTHORED_EPISODE_01_SESSIONS,
  ...allAuthoredEsEpisode01Sessions(),
];

function learnerInteractions(source: SessionSource): readonly LearnerInteraction[] {
  const courseSessionId = `lesson-01:session:${String(source.requiredSessionOrdinal).padStart(2, '0')}`;
  const children = buildSessionChildBodiesFromShard(buildSessionShardFromSource(source), LOCALE, courseSessionId);
  return (children.learner as { interactions: readonly LearnerInteraction[] }).interactions;
}

describe('mode-native instruction projection', () => {
  it('показывает авторскую инструкцию задания, а не общий текст семьи', () => {
    let checked = 0;
    for (const source of SESSIONS) {
      const steps = source.modeNativePractice ?? [];
      // Практика идёт после трёх интро-вопросов — сопоставляем по порядку.
      const practice = learnerInteractions(source).slice(-steps.length);
      steps.forEach((step, index) => {
        const instruction = step.instruction?.[LOCALE];
        if (!instruction) return;
        expect(practice[index]?.prompt).toContain(instruction);
        checked += 1;
      });
    }
    // Защита от «зелёного» теста на пустом наборе: инструкции должны быть.
    expect(checked).toBeGreaterThan(0);
  });

  it('не приклеивает целевую фразу к заданию «повтори вслух»', () => {
    let repeats = 0;
    for (const source of SESSIONS) {
      for (const interaction of learnerInteractions(source)) {
        if (interaction.modePayload?.family !== 'scripted_repeat_compare') continue;
        const target = interaction.modePayload.targetPhrase;
        expect(typeof target).toBe('string');
        // Старый баг: prompt = `${instruction} ${targetPhrase}` — фраза в конце,
        // второй раз поверх крупного слоя режима. Слово ВНУТРИ авторской
        // инструкции («скажите big и сравните», s13–s15) — это текст автора.
        expect(interaction.prompt.trimEnd().endsWith(target as string)).toBe(false);
        repeats += 1;
      }
    }
    expect(repeats).toBeGreaterThan(0);
  });
});
