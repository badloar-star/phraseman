import fs from 'fs';
import path from 'path';

const read = (relativePath: string) => fs.readFileSync(
  path.join(process.cwd(), relativePath),
  'utf8',
);

describe('Arena final score wait', () => {
  test('the focused count scene uses local score, bounded beats, and existing motion policy', () => {
    const component = read('components/arena/ArenaFinalScoreCount.tsx');

    expect(component).toContain('arenaFinalScoreBeatValues');
    expect(component).toContain('useCountUp');
    expect(component).toContain('reduceMotion');
    // зачем (D-85, владелец 2026-09-03): сцена считает РУНЫ матча, поэтому
    // рядом с числом стоит ассет руны из общего валютного UI. Звезда ранга
    // отсюда убрана намеренно — она обозначает деления тира, а не валюту.
    expect(component).toContain('RUNE_ASSET');
    expect(component).not.toContain('ArenaStarGlyph');
    expect(component).toContain('entering={reduceMotion ? undefined : FadeIn.duration(220)}');
    expect(component).toContain('entering={reduceMotion ? undefined : ZoomIn.springify().damping(16)}');
    /*
     * Сцена по-прежнему НЕ знает о кошельке и серверных наградах: она рисует
     * только локально посчитанные руны матча.
     *
     * Из проверки исключён путь ассета `level-spin-rewards/...`: слово там —
     * часть имени папки с картинками, а не обращение к награде. Сам запрет на
     * `reward` как поле/значение остаётся (см. вторую строку).
     */
    const withoutAssetPath = component.replace(/level-spin-rewards/g, '');
    expect(withoutAssetPath).not.toMatch(/wallet|balance|starsEarned|xpEarned|reward/i);
  });

  test('the match screen replaces the finished question with local score counting', () => {
    const match = read('app/arena_match.tsx');

    expect(match).toContain('<ArenaFinalScoreCount');
    expect(match).toContain("match.state.phase === 'finished'");
    expect(match).toContain("playSound('starLand')");
  });

  test('navigation waits, while result readiness and handoff stay authoritative', () => {
    const match = read('app/arena_match.tsx');

    expect(match).toContain('pendingCoherentResultRef');
    expect(match).toContain('finalScoreReadyRef');
    expect(match.indexOf('arenaRememberResultHandoff'))
      .toBeLessThan(match.indexOf('if (!finalScoreReadyRef.current)'));
    expect(match).toContain('arenaResultHandoffReady');
    expect(match).toContain('openPreviewResult');
  });

  test('changing Reduced Motion cannot erase an already queued quick result', () => {
    const match = read('app/arena_match.tsx');
    const readinessStart = match.indexOf('const [finalScoreReady');
    const readinessEnd = match.indexOf('/* ---- публикация своего хода', readinessStart);
    const readiness = match.slice(readinessStart, readinessEnd);

    expect(readiness).toContain('pendingCoherentResultRef');
    expect(readiness).not.toContain('pendingCoherentResultRef.current = null');
  });

  test('quick mode still owns its existing authoritative ResultsSequence', () => {
    expect(read('app/arena_results.tsx')).toContain('<ResultsSequence');
  });
});
