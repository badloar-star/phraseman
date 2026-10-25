// зачем (таблица эталонов «назад» Макетов 988d643cd): итог экзамена уровня K6–K7 — ✕ слева. Сторож по исходнику: общий ✕ на месте кнопки
// «назад», полоса под ним до прокрутки, экзамен передаёт выход к урокам.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('итог экзамена уровня: ✕ слева по эталону', () => {
  it('LevelExamResult рисует общий ✕ и полосу до прокрутки, если передан onClose', () => {
    const src = read('components/level-exam/LevelExamResult.tsx');
    expect(src).toContain('{onClose ? <SafeTopCloseButton screen="level_exam_result" testID="level-exam-result-close" onPress={onClose} /> : null}');
    expect(src).toMatch(/\{onClose \? <ScreenBackZone \/> : null\}\s*<BouncyScrollView/);
  });

  it('экзамен передаёт выход к урокам', () => {
    expect(read('components/level-exam/LevelExamV2.tsx')).toContain("onClose={() => safeRouterBack(router, '/lessons_list' as never)}");
  });
});
