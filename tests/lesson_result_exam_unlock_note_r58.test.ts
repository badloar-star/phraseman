// зачем (аудит кнопок R58 #3, решение координатора 15.10, вариант «а»): «экзамен уровня/Lingman открыт» очередь уведомлений собирала, но на итоге
// 2.0 его не было (окна там запрещены — сторож lesson_complete_single_finish_surface). Теперь это строка в starsNote рядом с «Следующий урок
// открыт», без окон; запись разблокировки — в журнале [LESSON-RESULT] exam_unlock_note.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_complete.tsx'), 'utf8');

describe('R58 #3 · «экзамен открыт» — строкой в итоге урока 2.0', () => {
  it('разблокировка экзамена запоминается и пишется в журнал', () => {
    expect(src).toContain("if (!cancelled) setExamUnlockNote('level');");
    expect(src).toContain("if (!cancelled) setExamUnlockNote('lingman');");
    expect(src).toContain("'[LESSON-RESULT] exam_unlock_note'");
  });

  it('строка добавляется к заметке под звёздами, без окон поверх', () => {
    expect(src).toContain('starsNote={joinResultNotes(!isComboCompletion && resultStars === 1');
    expect(src).toContain(': undefined, examUnlockNote ? examUnlockNoteText(lang, examUnlockNote) : undefined)}');
    const v2Start = src.indexOf('<V2DoneScreen');
    const v2End = src.indexOf('</SafeAreaView>', v2Start);
    const v2Branch = src.slice(v2Start, v2End);
    expect(v2Branch).not.toContain('AchievementNotifModal');
    expect(v2Branch).not.toContain('RegistrationPromptModal');
  });
});
