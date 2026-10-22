// зачем (правило владельца 22.10 через координатора): «каждому эпизоду — интригующее имя, не более 2 слов, коротко; правило
// сохраняется и при написании сессий». Название эпизода живёт в LEARNING_V2_SESSION_TITLES_RU_V1 (session_titles_v1.generated.ts,
// из колонки «Момент сцены» плана курса) — его показывают Сезон, вкладка уроков и «Продолжить». Почти все текущие названия
// длиннее — замораживаем ЧИСЛО нарушителей: оно может только уменьшаться (новые названия Теории его снизят).
import { LEARNING_V2_SESSION_TITLES_RU_V1 } from '../modules/learning-v2/content/session_titles_v1.generated';

/** Нарушителей на 22.10. Новое название ≤ 2 слов — уменьши число; увеличивать нельзя. */
const MAX_TITLES_OVER_TWO_WORDS = 149;

const words = (title: string) => title.trim().split(/\s+/u).filter(Boolean).length;

describe('episode titles: an intriguing name of at most two words', () => {
  const entries = Object.entries(LEARNING_V2_SESSION_TITLES_RU_V1).flatMap(([lesson, sessions]) =>
    Object.entries(sessions).map(([session, title]) => ({ key: `l${lesson}/s${session}`, title })));
  const over = entries.filter((entry) => words(entry.title) > 2);

  it('reads the real title table', () => {
    expect(entries.length).toBeGreaterThan(100);
  });

  it('no title is empty', () => {
    expect(entries.filter((entry) => !entry.title.trim())).toEqual([]);
  });

  it('the number of titles longer than two words never grows', () => {
    expect(over.length).toBeLessThanOrEqual(MAX_TITLES_OVER_TWO_WORDS);
  });

  it('the frozen number shrinks with the table: lower MAX when titles get shorter', () => {
    expect(over.length).toBe(MAX_TITLES_OVER_TWO_WORDS);
  });
});
