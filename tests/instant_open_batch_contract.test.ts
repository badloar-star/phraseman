// зачем (правило владельца «каждый раздел открывается мгновенно», аудит 04.10): сторож пачки правок — достижения, пикер языка, комментарии, объяснение, прогрев V2.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('instant open batch', () => {
  it('achievements seed their first frame from the last states of the same account', () => {
    const src = read('app/achievements_screen.tsx');
    expect(src).toContain('useState<AchievementState[]>(() => peekLastAchievementStates() ?? [])');
    expect(src).toContain('useState(() => peekLastAchievementStates() !== null)');
    expect(src).toContain('rememberLastAchievementStates(nextStates);');
  });

  it('study language picker uses the started-languages peek and does not need the resolver route when known', () => {
    expect(read('components/settings/StudyLanguagePicker.tsx')).toContain('useState(() => peekStartedStudyLanguages() !== null)');
    const lang = read('app/study_languages.ts');
    expect(lang).toContain('export function peekStartedStudyLanguages()');
    expect(lang).toContain('return rememberStarted(stored);');
  });

  it('pack comments show the remembered server feed first and fetch in the background', () => {
    const src = read('app/community_packs/PackCommentsSheet.tsx');
    expect(src).toContain('const remembered = peekPackCommentsMemory(packId);');
    expect(src).toContain('rememberPackCommentsMemory(packId, serverComments);');
  });

  it('pack comments stop spinning after a deadline and offer a retry (PM-214 A2)', () => {
    const src = read('app/community_packs/PackCommentsSheet.tsx');
    expect(src).toContain('const PACK_COMMENTS_LOAD_DEADLINE_MS = 8_000;');
    expect(src).toContain('[PACK-COMMENTS] load:deadline');
    // зачем (правило владельца 18.10): экрана «Не удалось загрузить комментарии» нет — при сбое то же пустое состояние и тихий повтор
    expect(src).not.toContain('pack-comments-load-failed');
    expect(src).toContain("logNoErrorScreen('pack_comments'");
    expect(src).toContain('[visible, packId, isPackAuthor, reloadTick]');
  });

  it('blitz offers try-again when the card pool never loads and the retry restarts the pool (PM-214 A2)', () => {
    const src = read('app/flashcards_blitz_session.tsx');
    expect(src).toContain('[FC-BLITZ-GATE] watchdog:show_retry_pool');
    expect(src).toContain('setPoolReloadRevision((current) => current + 1);');
    expect(src).toContain('[blitzAccessGranted, contentLang, deckRefs, studyTarget, poolReloadRevision]');
  });

  it('blitz deck picker takes the memory or disk snapshot on its first frame and loads fresh data in the background (DQA finding)', () => {
    const src = read('app/flashcards_blitz_session.tsx');
    expect(src).toContain('void hydrateFcDeckOptionsSnapshot();');
    expect(src).toContain("let seeded = peekFcDeckOptions('blitz', lang, studyTarget);");
    expect(src).toContain('[BLITZ-PICKER] first_list source=');
    expect(src).toContain('[BLITZ-PICKER] refreshed decks=');
  });

  it('explanation disk cache can still be moved into memory', () => {
    // зачем (владелец 11.11: «убери кнопку объяснить проще и функцию… они не нужны… обе удалить», плюс лампочку «Объяснить»): кнопки-триггера шторки больше нет; сам перенос кэша в модуле запроса остаётся.
    expect(read('app/explain_phrase_request.ts')).toContain('export async function prefillExplainResultFromDisk(');
  });

  // зачем (d8a0a685a, 11.11 «удаление курса занятий Learning V2»): курса V2 больше нет — вкладке нечего греть.
  // Прежняя проверка сторожила тяжёлый прогрев каталога V2 после паузы в касаниях; теперь сторожим, что вкладка
  // не тянет за собой ни прогрева, ни маршрутов удалённого курса (тяжёлая работа на вкладке без причины — регресс скорости).
  it('the lessons tab no longer warms the removed Learning V2 course', () => {
    const src = read('app/(tabs)/lessons.tsx');
    expect(src).not.toMatch(/learningV2|learning-v2|learning_v2/i);
    expect(src).not.toContain('setTimeout(waitForIdle, 2500)');
  });
});
