// зачем (бета-тест Б1, 15.10, 🔴): у нового гостя заготовка «Продолжить» не держится до конца тяжёлой loadData и не исчезает рывком — узкое раннее чтение ключа «последний урок» снимает её сразу,
// с логом [HOME-CONTINUE] (значение ключа и решение). Тело loadData не менялось (контракт home_lesson_progress_single_pass).
import fs from 'node:fs';
import path from 'node:path';

const home = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('Главная: раннее решение карточки «Продолжить»', () => {
  it('читает ТОЛЬКО ключ «последний урок», при отсутствии записи снимает заготовку плавно и логирует решение', () => {
    expect(home).toContain('void AsyncStorage.getItem(lastOpenedLessonKey(studyTarget))');
    expect(home).toContain('[HOME-CONTINUE] early: ключ «последний урок» raw=');
    expect(home).toMatch(/if \(hasLesson\) return;\n\s*animateNextLayoutTransition\(\);\n\s*setLastLesson\(null\);\n\s*setContinueResolved\(true\);/);
  });

  it('ранние выходы и catch называют причину; чужой аккаунт и уже решённая заготовка не трогаются', () => {
    expect(home).toContain('[HOME-CONTINUE] early: пропуск cancelled=');
    expect(home).toContain('[HOME-CONTINUE] early: чтение ключа не удалось');
    expect(home).toContain('if (cancelled || continueResolvedRef.current || !isCurrentAccountGeneration(token))');
  });
});
