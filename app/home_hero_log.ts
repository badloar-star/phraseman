// home_hero_log.ts — журнал [HOME-HERO] pick: откуда взят каждый факт, по которому герой Главной выбирает заголовок.
// зачем (координатор 05.11, баг «0-day streak / Day counted» у новичка ранга 0; правило «сперва логи»): без этой строки не видно, какая ветка
// (newbie / day_done / continue) выбрана и по каким значениям. Одна строка на смену решения, без идентификаторов; не бросает.
export type HomeHeroPickFacts = Readonly<{
  rank0: boolean;
  lessonNo: number | null;
  lastLessonId: number | null;
  doneInLesson: number | null;
  continueKind: string;
  continueResolved: boolean;
  streakDays: number;
  streakToday: string;
  hasProgress: boolean | null;
  branch: string;
}>;

/** Какая ветка выбрала hasProgress — значение, а не голое true/false. */
export function homeHeroProgressBranch(f: Pick<HomeHeroPickFacts, 'rank0' | 'lessonNo' | 'lastLessonId' | 'doneInLesson' | 'continueKind' | 'continueResolved'>): string {
  if (f.rank0 && f.lessonNo === 1 && f.lastLessonId === null && (f.doneInLesson ?? 0) === 0) return 'newbie_rank0_lesson1_untouched';
  if (f.continueKind === 'none' && f.continueResolved) return 'no_continue_target';
  if (f.continueResolved) return 'continue_resolved';
  return 'not_resolved_yet';
}

let lastSignature = '';

export function logHomeHeroPick(facts: HomeHeroPickFacts): void {
  try {
    const line = JSON.stringify(facts);
    if (line === lastSignature) return;
    lastSignature = line;
    console.log('[HOME-HERO]', 'pick', line); // guard-ok: решение героя Главной с причиной, без идентификаторов
  } catch (error) {
    console.warn('[HOME-HERO] pick_log_failed', error instanceof Error ? error.message : String(error));
  }
}

export default function __HomeHeroLogRouteShim() {
  return null;
}
