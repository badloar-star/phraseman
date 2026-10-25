// ЗАМОК ВЛАДЕЛЬЦА 25.10: «почему написано повторить, если он открылся через экзамен!!!» (урок 14, эпизод 42, ☆☆☆) — продолжение
// замка 21.10 «открыто ≠ пройдено». «Повторить эпизод N» — только у реально пройденного эпизода; открытый экзаменом или входным
// тестом и не пройденный — «Начать эпизод N».
import fs from 'node:fs';
import path from 'node:path';
import { seasonEpisodeCtaV1 } from '../components/learning-v2/season/season_episode_cta';
import { seasonCardText } from '../components/learning-v2/season/season_copy_card';
import type { SeasonEpisodeCard } from '../components/learning-v2/season/season_course_model';

const card = (state: SeasonEpisodeCard['state']): SeasonEpisodeCard => ({
  kind: 'episode', id: `l14-s42-${state}`, lessonOrdinal: 14, sessionOrdinal: 42, chapterOrdinal: 6, positionInChapter: 2, state,
  sourceState: state === 'done' ? 'completed' : state === 'open' ? 'open' : state === 'current' ? 'current' : 'locked',
} as SeasonEpisodeCard);

beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); });
afterEach(() => jest.restoreAllMocks());

describe('ЗАМОК ВЛАДЕЛЬЦА 25.10: «Повторить» только у пройденного эпизода', () => {
  it('opened by the exam or the placement test and not passed → «Начать эпизод N», never «Повторить»', () => {
    expect(seasonEpisodeCtaV1(card('open'), false)).toBe('begin');
    expect(seasonEpisodeCtaV1(card('open'), true)).toBe('begin');
  });

  it('really passed → «Повторить»; current → «Продолжить» (новичку — «Начать с эпизода»)', () => {
    expect(seasonEpisodeCtaV1(card('done'), false)).toBe('repeat');
    expect(seasonEpisodeCtaV1(card('current'), false)).toBe('continue');
    expect(seasonEpisodeCtaV1(card('current'), true)).toBe('start_with');
  });

  it('the label exists in all 9 languages', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
      expect(seasonCardText(lang as never, 'beginEpisode', { n: 42 })).toMatch(/42/);
    }
    expect(seasonCardText('ru', 'beginEpisode', { n: 42 })).toBe('Начать эпизод 42');
  });

  it('the episode window takes its button from seasonEpisodeCtaV1 (no «else → Повторить» fallback)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components/learning-v2/season/SeasonCourse.tsx'), 'utf8');
    expect(src).toContain('seasonEpisodeCtaV1(card');
    expect(src).not.toMatch(/\}\s*else\s*\{\s*primary\s*=\s*\{\s*label:\s*seasonCardText\(lang,\s*'repeatEpisode'/u);
  });
});
