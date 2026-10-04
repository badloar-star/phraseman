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
    expect(src).toContain('testID="pack-comments-load-failed"');
    expect(src).toContain('[visible, packId, isPackAuthor, reloadTick]');
  });

  it('blitz offers try-again when the card pool never loads and the retry restarts the pool (PM-214 A2)', () => {
    const src = read('app/flashcards_blitz_session.tsx');
    expect(src).toContain('[FC-BLITZ-GATE] watchdog:show_retry_pool');
    expect(src).toContain('setPoolReloadRevision((current) => current + 1);');
    expect(src).toContain('[blitzAccessGranted, contentLang, deckRefs, studyTarget, poolReloadRevision]');
  });

  it('explanation disk cache is moved into memory on touch and on open', () => {
    expect(read('app/explain_phrase_request.ts')).toContain('export async function prefillExplainResultFromDisk(');
    const button = read('components/ExplainButton.tsx');
    expect(button.match(/prefillExplainResultFromDisk\(/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('the lessons tab arms the V2 warmup after the first frame, not only after opening V2', () => {
    const src = read('app/(tabs)/lessons.tsx');
    expect(src).toContain('const learningV2WarmupEnabled = ENABLE_DEV_TOOLS || page === "v2" || learningV2WarmupArmed;');
    expect(src).toContain('setTimeout(() => setLearningV2WarmupArmed(true), 2000)');
  });
});
