// зачем (владелец 25.10 утвердил на настоящих снимках: docs/design/v2-app/exam-window-real.html; координатор): окно экзамена главы по состоянию —
// «сдан»: галочка, «Экзамен сдан», «{c} из {q} верно. Глава {n} открыта.», белая «▶ К главе {n}» + «Закрыть»; «пауза»: часы, «Пересдать через {m} мин»,
// «Попытка: {c} из {q}.», «Закрыть». Раньше у сданного окно показывало описание «можно сдать» и только «Закрыть». «Можно сдать» не тронуто.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('окно экзамена: состояния «сдан» и «пауза»', () => {
  const course = read('components/learning-v2/season/SeasonCourse.tsx');
  const card = read('components/learning-v2/season/SeasonExpandedCard.tsx');
  const copy = read('components/learning-v2/season/season_copy_card.ts');
  const start = course.indexOf("if (status.state === 'passed') {");
  const end = course.indexOf("let secondary: SeasonExpandedAction | null = null;\n      if (primary) secondary = { label: learningV2ChapterExamCopy");
  const states = course.slice(start, end);

  it('строки окна — три ключа Learning V2 (examWinPassed / examWinScore / examWinAttempt) есть во всех 9 языках', () => {
    for (const key of ['examWinPassed', 'examWinScore', 'examWinAttempt']) {
      const line = copy.split('\n').find((l) => l.trim().startsWith(`${key}:`)) ?? '';
      expect(line).not.toBe('');
      expect((line.match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g) ?? []).length).toBe(9);
    }
  });

  it('сдан: галочка, «Экзамен сдан», строка результата, «К главе N» белой кнопкой и «Закрыть»; описания «можно сдать» и фишек нет', () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    for (const part of ["sealIcon: 'checkmark' as const", "seasonCardText(lang, 'examWinPassed')", "seasonCardText(lang, 'examWinScore'", "seasonCardText(lang, 'examToChapter'", "icon: 'play'", "close('to_chapter')", 'refocus(nextIndex)', 'primary: toChapter', 'secondary: examClose', 'exam: null']) {
      expect(states).toContain(part);
    }
    expect(states).not.toContain('examInfo.description');
    expect(states).not.toContain('examInfo.panel');
  });

  it('пауза: часы, «Пересдать через N мин», «Попытка: k из n.», без главной кнопки, «Закрыть»', () => {
    for (const part of ["sealIcon: 'time-outline' as const", "seasonCardText(lang, 'examRetakeIn', { m: status.minutesLeft })", "seasonCardText(lang, 'examWinAttempt'", 'primary: null', 'secondary: examClose', 'exam: null']) {
      expect(states).toContain(part);
    }
  });

  it('«Можно сдать» не тронуто: «Начать экзамен» + «Позже», фишки и описание, строка эталона на месте', () => {
    expect(course).toContain("if (primary) secondary = { label: learningV2ChapterExamCopy(lang, 'later'), onPress: close };");
    expect(course).toContain('translation: examInfo ? examInfo.description : null, exam: examInfo ? examInfo.panel : null');
  });

  it('карточка: значок плитки задаётся состоянием (по умолчанию трофей), ✕ у экзамена остаётся', () => {
    expect(card).toContain('sealIcon?: IonName;');
    expect(card).toContain("name={p.sealIcon ?? 'trophy'}");
    expect(card).toContain('testID="season-expanded-close"');
  });

  it('журнал состояния окна без кириллицы в литералах', () => {
    const strip = states.replace(/\/\/.*$/gm, '');
    expect(strip.match(/['"`][^'"`\n]*[А-Яа-яЁё][^'"`\n]*['"`]/g) ?? []).toEqual([]);
  });
});
