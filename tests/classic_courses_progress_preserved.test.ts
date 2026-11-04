// Сторож (владелец 04.11, ЖЁСТКО): замена классических курсов НЕ уничтожает прогресс начатого курса.
// Сработал — чини код курса, а не сторожа. Блокер релиза.
import fs from 'fs';
import path from 'path';
import { countPassedMarks, mergeLessonProgressForSave, restoreLessonProgressPreserving } from '../app/classic_progress_preserve';

const mark = (correct: number, total: number, wrongAt: number[] = []) =>
  Array.from({ length: total }, (_, i) => (wrongAt.includes(i) ? 'wrong' : i < correct ? 'correct' : 'empty'));

/** Эмуляция AsyncStorage с реальными ключами старого прогресса: EN legacy и *_v2:: для fr/es/de/it. */
function realOldStorage(progress50: string[]): Map<string, string> {
  const m = new Map<string, string>();
  m.set('lesson1_best_score', '5'); m.set('lesson1_pass_count', '2'); m.set('lesson9_best_score', '4.5');
  m.set('lesson10_progress', JSON.stringify(progress50)); m.set('lesson10_cellIndex', '17');
  m.set('lesson10_phraseOrder', JSON.stringify(Array.from({ length: 50 }, (_, i) => (i * 7) % 50)));
  m.set('lesson10_errorReplayQueue', JSON.stringify([3, 9]));
  m.set('unlocked_lessons', JSON.stringify([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]));
  m.set('medal_lesson_1', 'gold'); m.set('user_coins', '1240'); m.set('achievement_first_lesson_claimed', 'true');
  for (const target of ['fr', 'es', 'de', 'it']) {
    m.set(`lesson_progress_v2::${target}::10`, JSON.stringify(progress50));
    m.set(`lesson_progress_v2::${target}::lesson10_cellIndex`, '17');
    m.set(`lesson_progress_v2::${target}::lesson1_best_score`, '5');
    m.set(`lesson_progress_v2::${target}::unlocked_lessons`, JSON.stringify([2, 3]));
  }
  return m;
}

describe('классические курсы: отметки урока приводятся к длине без потерь', () => {
  it('длина совпала (50→50): массив применяется как есть, число пройденного то же', () => {
    const stored = mark(20, 50, [4, 11]);
    const r = restoreLessonProgressPreserving(JSON.stringify(stored), 50);
    expect(r.reason).toBe('same_length');
    expect(r.view).toEqual(stored);
    expect(r.tail).toEqual([]);
    expect(mergeLessonProgressForSave(r.view, r.tail)).toEqual(stored);
  });

  it('короче (30→50): сохранённое на своих местах, добавлены пустые ячейки; число пройденного не уменьшилось', () => {
    const stored = mark(25, 30);
    const r = restoreLessonProgressPreserving(JSON.stringify(stored), 50);
    expect(r.reason).toBe('padded');
    expect(r.view.slice(0, 30)).toEqual(stored);
    expect(r.view).toHaveLength(50);
    const written = mergeLessonProgressForSave(r.view, r.tail);
    expect(countPassedMarks(written)).toBeGreaterThanOrEqual(countPassedMarks(stored));
  });

  it('длиннее (70→50) с correct ЗА границей 50: хвост хранится как есть и не теряется при записи', () => {
    const stored = [...mark(50, 50), ...mark(10, 20)]; // 70, correct после 50-й
    const r = restoreLessonProgressPreserving(JSON.stringify(stored), 50);
    expect(r.reason).toBe('tail_kept');
    expect(r.view).toHaveLength(50);
    expect(r.tail).toEqual(stored.slice(50));
    // ответ на ячейку 3 в этом заходе
    const view = [...r.view]; view[3] = 'wrong';
    const written = mergeLessonProgressForSave(view, r.tail);
    expect(written).toHaveLength(70);
    expect(written.slice(50)).toEqual(stored.slice(50));
    expect(countPassedMarks(written)).toBeGreaterThanOrEqual(countPassedMarks(stored));
  });

  it('нечитаемое хранилище: вид пустой, сообщение об ошибке пользователю не требуется, падения нет', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const raw of ['{not json', '"str"', '{"a":1}']) {
      const r = restoreLessonProgressPreserving(raw, 50);
      expect(r.view).toHaveLength(50);
      expect(r.tail).toEqual([]);
    }
    expect(restoreLessonProgressPreserving(null, 50).reason).toBe('none');
    warn.mockRestore();
  });
});

describe('реальный старый прогресс: вход в урок нового курса и ответ не меняют НИЧЕГО лишнего', () => {
  for (const total of [50, 30, 70]) {
    it(`длина урока в новом курсе ${total}: все ключи кроме lesson10_progress/cellIndex/phraseOrder-после-ответа идентичны`, () => {
      const storage = realOldStorage(mark(30, 50, [2]));
      const before = new Map(storage);
      // вход: ТОЛЬКО чтение
      const restored = restoreLessonProgressPreserving(storage.get('lesson10_progress') ?? null, total);
      expect(new Map(storage)).toEqual(before);
      // первый ответ: пишутся прогресс урока и позиция — больше ничего
      const view = [...restored.view]; const cell = view.findIndex((x) => x === 'empty'); view[Math.max(0, cell)] = 'correct';
      storage.set('lesson10_progress', JSON.stringify(mergeLessonProgressForSave(view, restored.tail)));
      storage.set('lesson10_cellIndex', String(Math.max(0, cell) + 1));
      for (const [key, value] of before) {
        if (key === 'lesson10_progress' || key === 'lesson10_cellIndex') continue;
        expect(storage.get(key)).toBe(value); // завершённость, best_score, медали, монеты, достижения, fr/es/de/it — байт в байт
      }
      const after = JSON.parse(storage.get('lesson10_progress') as string) as string[];
      expect(countPassedMarks(after)).toBeGreaterThanOrEqual(countPassedMarks(JSON.parse(before.get('lesson10_progress') as string)));
    });
  }
});

describe('исходный код: загрузка урока ничего не удаляет и не перезаписывает', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');
  const from = source.indexOf('const [sp, ss, ci, savedOrder');
  const to = source.indexOf('setCellIndex(startCell);', from);
  const loadRegion = source.slice(from, to);

  it('область загрузки найдена', () => {
    expect(from).toBeGreaterThan(0);
    expect(to).toBeGreaterThan(from);
  });

  it('в области загрузки нет removeItem и записи progress/cell/order (порядок откладывается до ответа)', () => {
    expect(loadRegion).not.toMatch(/removeItem\s*\(/);
    expect(loadRegion).not.toMatch(/setItem\s*\(\s*LESSON_KEY/);
    expect(loadRegion).not.toMatch(/setItem\s*\(\s*CELL_KEY/);
    // единственная запись порядка при загрузке — когда сохранённого порядка вообще не было
    const orderWrites = loadRegion.match(/setItem\s*\(\s*ORDER_KEY/g) ?? [];
    expect(orderWrites.length).toBeLessThanOrEqual(1);
    expect(loadRegion).toContain('orderPersistPendingRef.current = true');
  });

  it('запись отметок идёт через хвост (mergeLessonProgressForSave), не сырым np', () => {
    expect(source).toMatch(/mergeLessonProgressForSave\(np, progressTailRef\.current\)/);
    expect(source).not.toMatch(/JSON\.stringify\(np\)\)\.catch\(noteSwallowedHandler\('lesson1:useCallback\.setItem_3'\)\)/);
  });

  it('помощник не трогает хранилище вообще', () => {
    const helper = fs.readFileSync(path.join(__dirname, '..', 'app', 'classic_progress_preserve.ts'), 'utf8');
    expect(helper).not.toMatch(/AsyncStorage|removeItem|multiRemove|setItem/);
  });
});
