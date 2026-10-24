/**
 * Сторож проводки «Сегодня» (D49): каждая точка, где активность реально
 * завершается, сообщает store. Если точку переписали и вызов потерялся —
 * задание молча станет мёртвым (ровно то, на что жаловался владелец 01.10).
 * Сработал — верни вызов recordTodayTaskActivity, а не удаляй проверку.
 */
import * as fs from 'fs';
import * as path from 'path';

import { TODAY_TASK_POOL } from '../modules/today-tasks/today_tasks_core';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const WIRING: ReadonlyArray<Readonly<{ file: string; kind: string; marker: RegExp }>> = [
  { file: 'app/lesson_complete.tsx', kind: 'lesson', marker: /recordTodayTaskActivity\(\{\s*kind:\s*'lesson'/ },
  { file: 'app/learning_v2_direct_session_player_v1.tsx', kind: 'lesson', marker: /recordTodayTaskActivity\(\{\s*kind:\s*"lesson"/ },
  { file: 'app/dialogs_progress.ts', kind: 'dialog', marker: /recordTodayTaskActivity\(\{\s*kind:\s*'dialog'/ },
  { file: 'app/dialogue_v2_session_outcome_store.ts', kind: 'dialog', marker: /recordTodayTaskActivity\(\{\s*kind:\s*'dialog'/ },
  { file: 'hooks/usePracticeRunes.ts', kind: 'cards+mistakes', marker: /todayTaskKindForPracticeActivity\(input\.activity\)/ },
  { file: 'app/youtube_player_seek_bus.ts', kind: 'video', marker: /noteTodayVideoPlaybackTick\(/ },
  // [PEAK-CLOSE] 24.10: засчёт ступени — в хвосте закрытия (после анимаций окна итога), вызов из use_spire_game
  { file: 'app/spire/spire_step_close.ts', kind: 'spire_steps', marker: /recordTodayTaskActivity\(\{\s*kind:\s*'spire_steps'/ },
  { file: 'app/spire/use_spire_game.ts', kind: 'spire_steps', marker: /spireRunStepCloseTail\(\{[^;]*countToday: passedNew/ },
];

describe('«Сегодня»: проводка событий активности', () => {
  it.each(WIRING)('$file сообщает $kind', ({ file, marker }) => {
    expect(read(file)).toMatch(marker);
  });

  it('Главная берёт живой хук, а не заглушку', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).toMatch(/useTodayTasks\(lang, studyTarget\)/);
    expect(home).not.toMatch(/buildTodayTasksPlaceholder/);
  });

  it('у каждого типа пула есть источник события', () => {
    const covered = new Set(['lesson', 'dialog', 'cards', 'mistakes', 'video', 'spire_steps']);
    const kinds: readonly string[] = TODAY_TASK_POOL;
    expect(kinds.length).toBeGreaterThan(0);
    for (const kind of kinds) expect(covered.has(kind)).toBe(true);
  });

  // зачем (Q21, координатор 01.10): видео-задание платит как остальные — награда за задание дня, не за просмотр.
  it('видео-задание платит 50 монет за выполненное задание дня (Q21)', () => {
    expect(read('modules/today-tasks/today_tasks_core.ts')).toMatch(/video:\s*Object\.freeze\(\{[^}]*rewardCoins:\s*50/);
  });
});
