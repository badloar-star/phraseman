/**
 * Сцена «Сверяем результат…» УДАЛЕНА — и не должна вернуться.
 *
 * История. Между последним заданием и экраном результата стояла пауза с
 * count-up счётом и флагом `finalScoreReady`. За этим флагом были заперты ВСЕ
 * пути перехода: пока он не поднимался, экран не мог открыть результат ничем —
 * это и был мёртвый кадр, на который владелец жаловался четыре раза подряд
 * (2026-09-03 → 2026-09-04: «сверка результата не начинается», «убери этот
 * экран вообще который зависает, показывай сразу экран результата»).
 *
 * Ждать было нечего: счёт ведётся ПО ХОДУ матча (`state.matchStars` растёт с
 * каждым ответом и виден в плашке игроков), исход считается локально тем же
 * движком, что и на сервере. Награда и ранг догоняют уже на экране результата.
 *
 * Этот файл раньше сторожил саму сцену. Теперь он сторожит её отсутствие.
 */
import fs from 'fs';
import path from 'path';

const read = (relativePath: string) => fs.readFileSync(
  path.join(process.cwd(), relativePath),
  'utf8',
);

describe('Арена: промежуточной сцены между матчем и результатом нет', () => {
  const match = read('app/arena_match.tsx');

  test('экран матча не показывает сцену подсчёта и не ждёт её готовности', () => {
    expect(match).not.toContain('<ArenaFinalScoreCount');
    // Флаг-задержка был корнем зависания: любая его проверка запирает переход.
    expect(match).not.toContain('finalScoreReadyRef.current');
    expect(match).not.toMatch(/\bfinalScoreReady\b\s*(\)|&|\?|,)/);
  });

  test('матч закончился — переход к результату запускается сразу', () => {
    const start = match.indexOf("if (match?.state.phase !== 'finished') return;");
    expect(start).toBeGreaterThan(-1);
    // Единственное условие перехода — что матч закончился. Никаких таймеров.
    const effect = match.slice(start, start + 220);
    expect(effect).toContain('openPreviewResult()');
  });

  test('быстрый матч больше не исключён из локального открытия результата', () => {
    // Раньше `if (plan.mode === 'quick') return;` оставлял quick ждать сервер —
    // и именно он висел намертво, когда ответа не было.
    expect(match).not.toContain("if (plan.mode === 'quick') return;");
  });

  test('страховочный переход срабатывает почти мгновенно, а не через секунды', () => {
    const threshold = match.match(/const ARENA_SETTLE_STUCK_MS = ([\d_]+);/);
    expect(threshold).not.toBeNull();
    const ms = Number((threshold?.[1] ?? '').replace(/_/g, ''));
    // Это не ожидание сервера, а защита от двойного открытия: доли секунды.
    expect(ms).toBeLessThanOrEqual(1_000);
  });

  test('снимок для результата по-прежнему кладётся до перехода', () => {
    // Без снимка экран результата откроется пустым — это отдельный класс бага.
    expect(match).toContain('arenaRememberResultHandoff');
    expect(match).toContain('arenaResultHandoffReady');
  });

  test('быстрый матч сохраняет свою серверную сцену начисления на результате', () => {
    expect(read('app/arena_results.tsx')).toContain('<ResultsSequence');
  });
});
