import * as fs from 'fs';
import * as path from 'path';
import { validateTournamentTaskForNewRoom } from './tournament_core';
import { spireInspectMultilingualPool, type SpireMultilingualLang } from './spire_multilingual_pool';

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

describe.each<SpireMultilingualLang>(['es', 'de', 'fr'])('spireInspectMultilingualPool на реальном контенте (%s)', (lang) => {
  test('конвертирует 4000/4000 заданий, все converted проходят validateTournamentTaskForNewRoom', () => {
    const rows = readRows(lang);
    expect(rows).toHaveLength(4000);
    const { tasks, stats } = spireInspectMultilingualPool(lang, rows);
    expect(stats.totalRows).toBe(4000);
    expect(stats.converted).toBe(4000);
    expect(stats.skippedByMode).toEqual({});

    const failures: string[] = [];
    for (const task of tasks) {
      const v = validateTournamentTaskForNewRoom({ ...task, verified: true });
      if (!v.ok) failures.push(`${task.taskId}: ${v.reason}`);
    }
    expect(failures.slice(0, 5)).toEqual([]);
    expect(failures).toHaveLength(0);

    const rawById = new Map((rows as Array<{
      taskId: string;
      mode: string;
      payload: { pairs?: Array<{ tileLeft: string; tileRight: string }> };
    }>).map((row) => [row.taskId, row]));
    for (const task of tasks.filter((candidate) => candidate.mode === 'speed_match')) {
      const raw = rawById.get(task.taskId)!;
      const pairs = raw.payload.pairs!;
      const orderedRight = pairs.map((pair) => pair.tileRight);
      expect(task.payload.rightOptions).not.toEqual(orderedRight);
      expect(task.explanation!.example).toBe(`${pairs[0].tileLeft} — ${pairs[0].tileRight}`);
      expect(task.explanation!.ruleNote).not.toContain('глагола');
      for (const item of task.payload.items as Array<Record<string, unknown>>) {
        const options = item.options as string[];
        const correctIndex = item.correctIndex as number;
        expect((item.explanation as { example: string }).example).toBe(`${item.prompt} — ${options[correctIndex]}`);
      }
    }

    // Уникальность taskId внутри языка — иначе сборщик пакета может схлопнуть задания.
    expect(new Set(tasks.map((t) => t.taskId)).size).toBe(tasks.length);
  });
});
