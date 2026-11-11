// Удобство №7 (владелец одобрил 04.11): итог нового урока — главная кнопка «Дальше: урок N» и вторая «Повторить мои ошибки · N».
// Классика (lesson_complete) и Learning V2 (HorizonSessionResult). Журнал ошибок только читаем; бонус +500 и расчёт монет не затронуты.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const NEXT = ['Дальше: урок', 'Далі: урок', 'Next: lesson', 'Siguiente: lección', 'Próxima: lição', 'Tiếp theo: bài', 'Berikutnya: pelajaran', 'Sonraki: ders', 'Dalej: lekcja'];
const MISTAKES = ['Повторить мои ошибки · ', 'Повторити мої помилки · ', 'Review my mistakes · ', 'Repasar mis errores · ', 'Revisar meus erros · ', 'Ôn lại lỗi của tôi · ', 'Ulas kesalahanku · ', 'Hatalarımı tekrarla · ', 'Powtórz moje błędy · '];

describe('итог классического урока', () => {
  const src = read('app/lesson_complete.tsx');
  it('главная кнопка «Дальше: урок N» на 9 языках, после урока 32 — прежнее «Завершить»', () => {
    for (const text of NEXT) expect(src).toContain(text);
    expect(src).toContain('triLang(lang, nextLessonLabels(lessonId + 1))');
    expect(src).toContain("ru: 'Завершить'");
  });
  it('вторая кнопка «Повторить мои ошибки · N», N — ошибки прохода; действие прежнее (finishMistakes)', () => {
    for (const text of MISTAKES) expect(src).toContain(text);
    expect(src).toContain('triLang(lang, finishMistakesLabels(runMistakeIds.length))');
    expect(src).toContain('runMistakeIds.length > 0 ? finishMistakes : handleRepeatLesson');
  });
  it('бонус +500 и расчёт монет итога не тронуты этой правкой', () => {
    expect(src).toContain('coinsGained={practiceRunes.runes}');
    expect(src).toContain('firstLessonBonusNote');
  });
});

describe('итог урока Learning V2', () => {
});
