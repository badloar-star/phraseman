// зачем (координатор 24.10; эталон chapter-exam-season.html, правка владельца 22.10 №10): под каруселью у карты экзамена — «Сдать экзамен»
// (раскрывает карту) и строка «Сдашь — откроется глава N» (25.10: без «· 12 вопросов, сдать от 10»); у последней главы строки нет.
import { seasonCardText } from '../components/learning-v2/season/season_copy_card';
import { readSource } from './helpers/read_source';

describe('Сезон: подпись под каруселью у карты экзамена', () => {
  it('тексты на 9 языках, ru — как в эталоне', () => {
    // координатор 25.10: в подписи только «Сдашь — откроется глава N», без «· 12 вопросов, сдать от 10»
    expect(seasonCardText('ru', 'examOpens', { n: 3 })).toBe('Сдашь — откроется глава 3');
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      expect(seasonCardText(lang, 'examOpens', { n: 3 })).toContain('3');
      expect(seasonCardText(lang, 'examFacts', { q: 12, p: 10 })).toMatch(/12.*10/);
    }
  });

  // зачем (24.10, кадры эталона): подпись экзамена теперь по состоянию — сторож tests/season_exam_captions_etalon_2026_10_25.test.ts
  it('подпись: у закрытой карты экзамена — «Глава N» / «Экзамен главы» без кнопки; у открытой — из examCaption', () => {
    const view = readSource('components/learning-v2/season/SeasonCourseView.tsx');
    expect(view).toContain("const exam = selectedCard.state !== 'locked' && props.examCaption ? props.examCaption(selectedCard) : null;");
    expect(view).toContain('onPress={caption.exam.action.onPress}');
    expect(readSource('components/learning-v2/season/SeasonCourse.tsx')).toContain('examCaption={examCaption}');
  });
});
