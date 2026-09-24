import * as fs from 'fs';
import * as path from 'path';
import { validateTournamentTaskForNewRoom } from './tournament_core';
import { spireConvertMultilingualPool, type SpireMultilingualLang } from './spire_multilingual_pool';

/**
 * Интеграционная проверка на РЕАЛЬНОМ контенте (не синтетике): все 4000
 * заданий на язык × 3 языка проходят конвертер и серверную проверку
 * validateTournamentTaskForNewRoom без единого фейла среди converted.
 * Один прогон занимает секунды (12000 записей, чистые функции, без сети).
 */
function readRows(lang: SpireMultilingualLang): unknown[] {
  const filePath = path.join(__dirname, '..', '..', 'content', 'arena-multilingual', 'generated', lang, 'tasks.jsonl');
  const text = fs.readFileSync(filePath, 'utf8');
  return text.split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line));
}

describe.each<SpireMultilingualLang>(['es', 'de', 'fr'])('spireConvertMultilingualPool на реальном контенте (%s)', (lang) => {
  test('конвертирует 3808/4000 заданий, все converted проходят validateTournamentTaskForNewRoom', () => {
    const rows = readRows(lang);
    expect(rows).toHaveLength(4000);
    const { tasks, stats } = spireConvertMultilingualPool(lang, rows);
    expect(stats.totalRows).toBe(4000);
    expect(stats.converted).toBe(3808);
    expect(stats.skippedByMode).toEqual({ speed_match: 192 });

    const failures: string[] = [];
    for (const task of tasks) {
      const v = validateTournamentTaskForNewRoom(task);
      if (!v.ok) failures.push(`${task.taskId}: ${v.reason}`);
    }
    expect(failures.slice(0, 5)).toEqual([]);
    expect(failures).toHaveLength(0);

    // Уникальность taskId внутри языка — иначе сборщик пакета может схлопнуть задания.
    expect(new Set(tasks.map((t) => t.taskId)).size).toBe(tasks.length);
  });
});
