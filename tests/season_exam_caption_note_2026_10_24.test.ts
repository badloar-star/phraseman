// зачем (координатор 24.10; эталон chapter-exam-season.html, правка владельца 22.10 №10): под каруселью у карты экзамена — «Сдать экзамен»
// (раскрывает карту) и строка «Сдашь — откроется глава N · 12 вопросов, сдать от 10»; у последней главы — без «откроется глава».
import { seasonCardText } from '../components/learning-v2/season/season_copy_card';
import { readSource } from './helpers/read_source';

describe('Сезон: подпись под каруселью у карты экзамена', () => {
  it('тексты на 9 языках, ru — как в эталоне', () => {
    expect(`${seasonCardText('ru', 'examOpens', { n: 3 })} · ${seasonCardText('ru', 'examFacts', { q: 12, p: 10 })}`).toBe('Сдашь — откроется глава 3 · 12 вопросов, сдать от 10');
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      expect(seasonCardText(lang, 'examOpens', { n: 3 })).toContain('3');
      expect(seasonCardText(lang, 'examFacts', { q: 12, p: 10 })).toMatch(/12.*10/);
    }
  });

  it('подпись: «Глава N» / «Экзамен главы», кнопка раскрывает карту, строка — только когда экзамен включён и карта не закрыта', () => {
    const view = readSource('components/learning-v2/season/SeasonCourseView.tsx');
    expect(view).toContain("if (selectedCard.kind === 'exam') return { kicker: seasonCardText(lang, 'chapterShort', { n: selectedCard.chapterOrdinal }), title: seasonText(lang, 'exam') };");
    expect(view).toContain("{selectedCard && selectedCard.kind === 'exam' && selectedCard.state !== 'locked' && props.examNote ? (");
    expect(view).toContain('onPress={() => props.onCardOpen(selected)}');
    const course = readSource('components/learning-v2/season/SeasonCourse.tsx');
    expect(course).toContain('const examNote = props.examInfo && props.onStartExam ? (chapterOrdinal: number): string => {');
    expect(course).toContain('examNote={examNote}');
  });
});
