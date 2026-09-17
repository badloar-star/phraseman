import fs from 'fs';
import path from 'path';
import { arenaText } from '../modules/arena/copy';
import type { Lang } from '../constants/i18n';
import { arenaMatchButtonAction, arenaModeChoices } from '../modules/arena/hub_nav';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Arena mode navigation', () => {
  const all = { enabled: true, quickEnabled: true, rankedEnabled: true, friendEnabled: true };

  /**
   * зачем (владелец 2026-09-17, жалоба Виталия «уровень от количества побед не
   * меняется»): порядок режимов несёт смысл — ПЕРВЫМ стоит тот, который двигает
   * ранг. До этого тест требовал `quick` первым и тем самым охранял ровно ту
   * путаницу, на которую пожаловался игрок (класс бага из памяти
   * `project_paywall_guard_protected_a_lie_2026-09-14`: сторож защищал ложь).
   *
   * Упал этот тест — значит кто-то вернул быстрый матч наверх. Возвращать
   * порядок в modules/arena/hub_nav.ts, а не править ожидание здесь.
   */
  it('puts the rank-moving mode first and preserves disabled reasons', () => {
    expect(arenaModeChoices(all).map((row) => row.key)).toEqual(['ranked', 'quick', 'friend']);
    const partial = arenaModeChoices({ ...all, rankedEnabled: false });
    expect(partial.find((row) => row.key === 'ranked')).toMatchObject({ enabled: false, reason: 'mode_off' });
    expect(partial.find((row) => row.key === 'quick')).toMatchObject({ enabled: true, reason: 'ok' });
  });

  it('resumes active work before offering a new mode', () => {
    expect(arenaMatchButtonAction({ enabled: true, activeMatchId: 'm1' }))
      .toEqual({ kind: 'resume_match', matchId: 'm1' });
    expect(arenaMatchButtonAction({
      enabled: true,
      activeQueue: { status: 'waiting', mode: 'ranked', requestId: 'r1', stableUid: 'u1' },
    })).toEqual({ kind: 'resume_queue', mode: 'ranked', requestId: 'r1', stableUid: 'u1' });
    expect(arenaMatchButtonAction({ enabled: true })).toEqual({ kind: 'choose_mode' });
  });

  it('localizes distinct unavailable reasons in all eight locales', () => {
    const langs = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as Lang[];
    for (const lang of langs) {
      expect(arenaText(lang, 'modeArenaOff')).not.toBe(arenaText(lang, 'modeOff'));
    }
  });

  it('contains no private Arena tabbar implementation', () => {
    expect(fs.existsSync(path.join(ROOT, 'components/arena/ArenaTabBar.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'components/arena/ArenaHubChrome.tsx'))).toBe(false);
    expect(read('components/arena/ArenaHubSurface.tsx')).toContain('arenaMatchButtonAction');
  });
});
