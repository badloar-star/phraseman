// зачем (координатор 24.10; эталон chapter-exam-season.html, раздел ex1/ex2): подпись под каруселью у карты экзамена — три состояния
// эталона дословно (ru), «Позже» в раскрытой карте; кнопки ведут туда же, куда в эталоне.
import { seasonExamCaption, type SeasonExamCaptionInput } from '../components/learning-v2/season/season_exam_caption';
import { readSource } from './helpers/read_source';

const base: SeasonExamCaptionInput = { lang: 'ru', chapterOrdinal: 2, chapterCount: 7, status: { state: 'available' }, canStart: true, questions: 12, passFrom: 10, nextRange: { a: 13, b: 16 } };

describe('Сезон: подпись экзамена по эталону', () => {
  it('можно сдать (avail) — дословно', () => {
    expect(seasonExamCaption(base)).toEqual({
      kicker: 'Финал главы 2, можно сдать заранее',
      title: 'Экзамен главы',
      action: { kind: 'open', label: 'Сдать экзамен', icon: 'trophy', chapter: null },
      // координатор 25.10: «· 12 вопросов, сдать от 10» — кухня, убрано
      note: 'Сдашь — откроется глава 3',
    });
    expect(seasonExamCaption({ ...base, canStart: false }).action).toBeNull();
    expect(seasonExamCaption({ ...base, chapterOrdinal: 7 }).note).toBeNull();
  });

  it('пауза (pause) — дословно, минуты из отсчёта, кнопки нет', () => {
    expect(seasonExamCaption({ ...base, status: { state: 'cooldown', lastCorrect: 9, minutesLeft: 59 } })).toEqual({
      kicker: 'Попытка: 9 из 12, нужно 10',
      title: 'Пересдать через 59 мин',
      action: null,
      note: 'Пересдать можно через час после попытки',
    });
  });

  it('сдан (pass) — дословно; последняя глава без «К главе»', () => {
    expect(seasonExamCaption({ ...base, status: { state: 'passed', correct: 11 } })).toEqual({
      kicker: 'Экзамен сдан, 11 из 12',
      title: 'Глава 3 открыта',
      action: { kind: 'toChapter', label: 'К главе 3', icon: 'play', chapter: 3 },
      // ЗАМОК ВЛАДЕЛЬЦА 25.10 (открыт только первый эпизод): подпись говорит, с какого эпизода начнём
      note: 'Начнём с эпизода 13',
    });
    expect(seasonExamCaption({ ...base, chapterOrdinal: 7, status: { state: 'passed', correct: 12 } })).toEqual({ kicker: 'Экзамен сдан, 12 из 12', title: 'Экзамен главы', action: null, note: null });
  });

  it('тексты есть на 9 языках', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      const a = seasonExamCaption({ ...base, lang });
      const p = seasonExamCaption({ ...base, lang, status: { state: 'cooldown', lastCorrect: 9, minutesLeft: 59 } });
      const d = seasonExamCaption({ ...base, lang, status: { state: 'passed', correct: 11 } });
      for (const s of [a.kicker, p.kicker, p.title, p.note, d.kicker, d.title, d.note, d.action?.label]) expect(String(s)).not.toMatch(/\{[a-z]+\}/);
      expect(p.title).toContain('59');
    }
  });

  it('экран: подпись из чистой функции, «Позже» в раскрытой карте, «Начать экзамен» с ▶ как в эталоне', () => {
    const course = readSource('components/learning-v2/season/SeasonCourse.tsx');
    expect(course).toContain('seasonExamCaption({');
    expect(course).toContain("secondary = { label: learningV2ChapterExamCopy(lang, 'later'), onPress: close };");
    expect(course).toContain("label: learningV2ChapterExamCopy(lang, 'start'), icon: 'play'");
    expect(readSource('components/learning-v2/season/SeasonCourseView.tsx')).toContain('examCaption?: (card: SeasonCard) => SeasonExamCaptionView | null;');
    expect(readSource('components/learning-v2/season/SeasonCourseConnected.tsx')).toContain('examStatus={SEASON_CHAPTER_EXAM_ENABLED ? examStatus : undefined}');
  });
});
