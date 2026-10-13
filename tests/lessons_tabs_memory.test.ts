// зачем (владелец 13.10, вопрос 18; макет learn.html «Уроки | V2»): выбранная вкладка списка уроков хранится локально и открывается сразу.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/(tabs)/lessons.tsx'), 'utf8');

describe('вкладки «Уроки | V2»: память выбора', () => {
  it('ключ, логи и запись только по тапу', () => {
    expect(src).toContain('lessons_tab_page_v1');
    expect(src).toContain('[LESSONS-TABS]');
    expect(src).toContain('rememberLessonsPage("v2")');
    expect(src).toContain('rememberLessonsPage("lessons")');
  });
  it('стартовая вкладка берётся синхронно из памяти, V2 — только если курс доступен', () => {
    expect(src).toContain('useState<"lessons" | "dialogs" | "v2">(() => startLessonsPage(initialPage))');
    expect(src).toMatch(/rememberedLessonsPage === "v2" && LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY/);
  });
  it('поздняя подстановка с диска не перебивает тап и без немых catch', () => {
    expect(src).toContain('userPickedTabRef.current');
    expect(src).not.toMatch(/getItem\(LESSONS_TAB_STORAGE_KEY\)[\s\S]{0,900}catch\s*\(\s*\w*\s*\)\s*\{\s*\}/);
  });
});
