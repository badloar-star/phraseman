import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('Arena owner-requested runtime surface', () => {
  it('never renders sending-result or opponent-answer receipt copy', () => {
    const match = read('app/arena_match.tsx');
    const today = read('app/arena_today.tsx');
    const copy = read('modules/arena/copy.ts');

    expect(match).not.toContain("arenaText(lang, 'sendingResult')");
    expect(match).not.toContain("arenaText(lang, 'opponentAnsweredBadge')");
    expect(copy).not.toContain('sendingResult:');
    expect(copy).not.toContain('opponentAnsweredBadge:');
    expect(today).not.toContain("arenaText(lang, 'waiting')");
    expect(copy).not.toContain('waiting:');
    expect(copy).not.toContain('preparingDuel:');
    expect(copy).not.toContain('preparingDuelHint:');
  });

  it('keeps the final task mounted until a coherent result is ready', () => {
    const match = read('app/arena_match.tsx');
    const results = read('app/arena_results.tsx');

    expect(match).toContain('arenaResultHandoffReady');
    expect(match).toContain('finishedTask');
    expect(match).toContain('finishQueued');
    expect(match).toContain('arenaRetryQueuedFinish(');
    expect(match).toContain('arenaFinishRetryDelay(attempt)');
    expect(match).not.toContain('<V2Card style={styles.doneCard}>');
    expect(results).not.toMatch(/surfaceKind === 'neutral_pending'[\s\S]{0,900}<ArenaScreen/);
    expect(results).not.toMatch(/surfaceKind === 'quick_pending'[\s\S]{0,900}<ArenaScreen/);
    expect(results).not.toContain("arenaText(lang, 'awaitingRival')");
    expect(results).not.toContain("arenaText(lang, 'reportQueued')");
    expect(results).not.toContain("arenaText(lang, 'resultPending')");
    expect(match).toContain("if (delivery.status === 'storage_failed')");
    expect(match).toContain("arenaText(lang, 'reportStorageFailed')");
    // Требование владельца — ПОВЕДЕНИЕ: у отказа сохранения есть повтор, и
    // повтор снимает замок `sent`, иначе отчёт второй раз не уйдёт никогда.
    // Раньше здесь стояла точная строка "onPress: () => setSent(false)" —
    // объектная форма действия, которой в Арене нет ни в одном алерте: они
    // все на JSX+DuoPressable. Сторож охранял форматирование, а не смысл, и
    // лежал красным при полностью рабочей кнопке «Повторить».
    expect(match).toMatch(/testID="arena-match-storage-retry"[\s\S]{0,200}setSent\(false\)/);
  });

  it('renders questions without a containing card and uses bilingual semantic color', () => {
    const question = read('components/arena/ArenaQuestion.tsx');

    expect(question).toContain('ArenaBilingualText');
    expect(question).not.toContain('<V2Card style={styles.card}>');
    expect(question).not.toContain('backgroundColor: P.elev');
    expect(question).toContain('options: { gap: 8 }');
  });

  it('reserves a real VS lane and hides the unexplained Arena completion check', () => {
    const players = read('components/arena/ArenaPlayers.tsx');
    const results = read('app/arena_results.tsx');
    const sequence = read('components/feedback/ResultsSequence.tsx');

    expect(players).toMatch(/vs: \{[^}]*minWidth: 40/);
    expect(sequence).toContain('showFinaleMark = true');
    expect(results).toContain('showFinaleMark={false}');
  });

  it('keeps the Arena navbar icon-only and removes perpetual hub animation loops', () => {
    const tabbar = read('app/(tabs)/_layout.tsx');
    const backdrop = read('components/ui/V2Backdrop.tsx');

    expect(tabbar).toContain("icon: 'shield-half-outline'");
    expect(tabbar).not.toContain('withRepeat');
    expect(backdrop).toContain('TABBAR_HYBRID.hubEntry');
    expect(backdrop).not.toMatch(/duration: (360|520)/);
    expect(backdrop).not.toMatch(/MOTION_VARIANTS[^\n]*'hub'/);
  });

  it('schedules exact opponent presentation instead of showing scripted ticks immediately', () => {
    const hook = read('hooks/use_arena_local_match.ts');

    expect(hook).toContain('arenaOpponentRevealDelayMs');
    expect(hook).toContain("type: 'opponent_revealed'");
    expect(hook).toContain('opponentTimerRef');
    const restoredBranch = hook.slice(
      hook.indexOf('if (restored)'),
      hook.indexOf('return arenaLocalMatchInit'),
    );
    expect(restoredBranch).toContain("type: 'resume'");
    expect(restoredBranch).toContain('arenaMonotonicEpochId()');
  });
});
