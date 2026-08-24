import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('semantic sound surface wiring', () => {
  test('no-energy modal emits the dedicated cue only when it becomes visible', () => {
    const source = read('components/NoEnergyModal.tsx');
    expect(source).toContain("soundDirector.request('pm.energy.empty'");
    expect(source).toContain("scope: 'no-energy-modal'");
  });

  test('league result uses outcome-specific cues and keeps the neutral result silent', () => {
    const source = read('app/LeagueResultModal.tsx');
    expect(source).toContain("isPromo ? 'pm.league.promoted' : 'pm.league.demoted'");
    expect(source).toContain('if (isPromo || isDemo)');
  });

  /**
   * зачем 2026-08-04 (владелец: «когда турнир завершён и там пьедестал, надо
   * звук подключить»): подиум турнира был немым. Звук берём лиговый — у
   * Для результата турнира используется самостоятельный живой звук пьедестала.
   * Тест держит четыре вещи, которые легко потерять при рефакторе экрана:
   * сам вызов, разделение исходов, отсечку зрителей по myPlace и защиту от
   * двойного проигрывания (won переключается false → true, когда сервер
   * досчитывает награду уже после финальной таблицы).
   */
  test('tournament podium sounds the outcome for participants only', () => {
    const source = read('app/tournament_results.tsx');
    expect(source).toContain("isWin ? 'pm.league.promoted' : 'pm.league.demoted'");
    expect(source).toContain("scope: 'tournament-results'");
    // Зритель и снявшийся игрок не слышат итог: их нет в финальной таблице.
    expect(source).toContain('const participated = myPlace > 0 && me?.forfeitedAtMs === undefined');
    // Один исход на комнату: иначе призёр слышит проигрыш, а следом победу.
    expect(source).toContain('outcomeSoundedRef.current = true');
  });

  test('purchase celebration has distinct open and finale cues', () => {
    const source = read('components/PremiumCelebrationModal.tsx');
    expect(source).toContain("variant === 'vip' ? 'pm.reward.vip_open' : 'pm.reward.premium_open'");
    expect(source).toContain("variant === 'vip' ? 'pm.reward.vip_finale' : 'pm.reward.premium_finale'");
  });
});
