import * as fs from 'fs';
import * as path from 'path';
import {
  ARENA_HUB_ROUTES,
  ARENA_HUB_TABS,
  ARENA_TAB_BAR_HEIGHT,
  arenaHubBodyPaddingBottom,
  arenaHubTabForRoute,
  arenaMatchButtonAction,
  arenaModeChoices,
} from '../modules/arena/hub_nav';

/**
 * Навигация внутри Арены.
 *
 * Владелец (D-30): свой таббар с крупной кнопкой матча в центре. Ошибка здесь
 * стоит дорого и незаметна на глаз: либо кнопка ведёт в отключённый раздел,
 * либо таббар подсвечивает не тот раздел, в котором игрок стоит, либо — худшее
 * — предлагает начать второй матч, когда первый не доигран.
 */

describe('вкладки', () => {
  it('их четыре и у каждой свой путь', () => {
    expect(ARENA_HUB_TABS.length).toBe(4);
    const routes = ARENA_HUB_TABS.map((tab) => ARENA_HUB_ROUTES[tab]);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('каждый путь возвращает свою вкладку', () => {
    for (const tab of ARENA_HUB_TABS) {
      expect(arenaHubTabForRoute(ARENA_HUB_ROUTES[tab])).toBe(tab);
    }
  });

  /**
   * `/arena_ranks` начинается с `/arena`. Наивная проверка по префиксу
   * подсветила бы «Сегодня» на экране рангов.
   */
  it('похожие пути не путаются между собой', () => {
    expect(arenaHubTabForRoute('/arena_ranks')).toBe('rank');
    expect(arenaHubTabForRoute('/arena_history')).toBe('history');
    expect(arenaHubTabForRoute('/arena_tops')).toBe('tops');
    expect(arenaHubTabForRoute('/arena')).toBe('today');
  });

  it('хвостовой слэш и параметры не сбивают подсветку', () => {
    expect(arenaHubTabForRoute('/arena_ranks/')).toBe('rank');
    expect(arenaHubTabForRoute('/arena_ranks?season=2')).toBe('rank');
    expect(arenaHubTabForRoute('/arena?section=play')).toBe('today');
  });

  it('вложенный путь остаётся в своей вкладке', () => {
    expect(arenaHubTabForRoute('/arena_history/2026-08')).toBe('history');
  });

  it('незнакомый путь падает на «Сегодня», а не гасит таббар', () => {
    for (const path of ['', null, undefined, '/', '/settings', '/arena_match']) {
      expect(arenaHubTabForRoute(path as string)).toBe('today');
    }
  });
});

describe('выбор режима', () => {
  const all = { enabled: true, quickEnabled: true, rankedEnabled: true, friendEnabled: true };

  it('режимов три и порядок постоянный', () => {
    expect(arenaModeChoices(all).map((row) => row.key)).toEqual(['quick', 'ranked', 'friend']);
  });

  it('при полной доступности нажимаются все', () => {
    expect(arenaModeChoices(all).every((row) => row.enabled)).toBe(true);
  });

  /**
   * Спрятанный режим выглядит как отсутствующая возможность, и игрок про него
   * не узнаёт вовсе. Погашенный честно говорит «сейчас нельзя».
   */
  it('отключённые режимы гасятся, а НЕ прячутся', () => {
    const choices = arenaModeChoices({ ...all, rankedEnabled: false });
    expect(choices.length).toBe(3);
    expect(choices.find((row) => row.key === 'ranked')!.enabled).toBe(false);
    expect(choices.find((row) => row.key === 'quick')!.enabled).toBe(true);
  });

  it('выключенная Арена гасит всё', () => {
    const choices = arenaModeChoices({ ...all, enabled: false });
    expect(choices.every((row) => !row.enabled)).toBe(true);
    expect(choices.length).toBe(3);
  });

  it('нет данных о доступности — ничего не нажимается', () => {
    for (const value of [null, undefined]) {
      const choices = arenaModeChoices(value);
      expect(choices.length).toBe(3);
      expect(choices.every((row) => !row.enabled)).toBe(true);
    }
  });

  it('у каждого режима есть куда идти', () => {
    for (const choice of arenaModeChoices(all)) {
      expect(choice.route.length).toBeGreaterThan(0);
    }
    expect(arenaModeChoices(all).find((row) => row.key === 'ranked')!.params).toEqual({ mode: 'ranked' });
  });
});

describe('центральная кнопка', () => {
  const enabled = { enabled: true };

  it('обычный случай — открыть выбор режима', () => {
    expect(arenaMatchButtonAction(enabled)).toEqual({ kind: 'choose_mode' });
  });

  /**
   * Предложить начать второй матч, когда первый не доигран, — верный способ
   * его потерять: недоигранный матч закроется просрочкой и без начислений.
   */
  it('идущий матч важнее нового', () => {
    expect(arenaMatchButtonAction({ enabled: true, activeMatchId: 'm1' }))
      .toEqual({ kind: 'resume_match', matchId: 'm1' });
  });

  it('идущий матч ведёт к себе даже при выключенной Арене', () => {
    expect(arenaMatchButtonAction({ enabled: false, activeMatchId: 'm1' }).kind).toBe('resume_match');
  });

  it('стояние в очереди возвращает в очередь', () => {
    expect(arenaMatchButtonAction({
      enabled: true,
      activeQueue: { status: 'waiting', mode: 'ranked', requestId: 'r1', stableUid: 'u1' },
    })).toEqual({ kind: 'resume_queue', mode: 'ranked', requestId: 'r1', stableUid: 'u1' });
  });

  it('матч важнее очереди', () => {
    expect(arenaMatchButtonAction({
      enabled: true,
      activeMatchId: 'm1',
      activeQueue: { status: 'waiting', mode: 'quick', requestId: 'r1', stableUid: 'u1' },
    }).kind).toBe('resume_match');
  });

  it('неполный билет очереди не уводит в никуда', () => {
    expect(arenaMatchButtonAction({
      enabled: true, activeQueue: { status: 'waiting', mode: 'quick' },
    }).kind).toBe('choose_mode');
    expect(arenaMatchButtonAction({
      enabled: true, activeQueue: { status: 'matched', mode: 'quick', requestId: 'r', stableUid: 'u' },
    }).kind).toBe('choose_mode');
  });

  it('выключенная Арена без матча и очереди — кнопка заблокирована', () => {
    expect(arenaMatchButtonAction({ enabled: false })).toEqual({ kind: 'blocked' });
  });
});

describe('место под таббар', () => {
  /**
   * Таббар лежит ПОВЕРХ содержимого. Без отступа последние строки длинного
   * списка — на экране рангов это двадцать четыре тира плюс таблица друзей —
   * закрыты полосой, и до них нельзя ни дочитать, ни дотянуться.
   */
  it('отступ не меньше высоты полосы', () => {
    for (const inset of [0, 10, 34, 48]) {
      expect(arenaHubBodyPaddingBottom(inset)).toBeGreaterThanOrEqual(ARENA_TAB_BAR_HEIGHT);
    }
  });

  /** На телефонах с полосой жеста таббар и сам сдвинут вверх на её высоту. */
  it('системный отступ прибавляется, а не заменяет', () => {
    expect(arenaHubBodyPaddingBottom(34)).toBeGreaterThan(arenaHubBodyPaddingBottom(0));
    expect(arenaHubBodyPaddingBottom(34)).toBe(ARENA_TAB_BAR_HEIGHT + 34);
  });

  it('мусор и отрицательное не съедают отступ', () => {
    for (const inset of [-50, NaN, Number.POSITIVE_INFINITY]) {
      expect(arenaHubBodyPaddingBottom(inset as number)).toBeGreaterThanOrEqual(ARENA_TAB_BAR_HEIGHT);
    }
  });

  /** Число живёт в двух местах, и разъезжаются они молча. */
  it('высота совпадает с реальной высотой компонента', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '..', 'components/arena/ArenaTabBar.tsx'), 'utf8');
    expect(source).toContain(`const BAR_HEIGHT = ${ARENA_TAB_BAR_HEIGHT};`);
  });

  it('обвязка действительно резервирует место', () => {
    const chrome = fs.readFileSync(
      path.resolve(__dirname, '..', 'components/arena/ArenaHubChrome.tsx'), 'utf8');
    expect(chrome).toContain('arenaHubBodyPaddingBottom(insets.bottom)');
  });
});

describe('какие экраны живут под таббаром', () => {
  const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

  /** Разделы, по которым игрок ходит: без таббара он теряет навигацию Арены. */
  const SECTIONS = [
    'app/arena.tsx',
    'app/arena_ranks.tsx',
    'app/arena_tops.tsx',
    'app/arena_history.tsx',
    'app/arena_star_wallet.tsx',
    'app/arena_season_pass.tsx',
    'app/arena_rivalries.tsx',
    'app/arena_partner.tsx',
    'app/arena_mastery_map.tsx',
  ];

  /**
   * Шаги внутри потока. Таббар на них — это кнопка «уйти отсюда» посреди
   * недоигранного матча или прогона: игрок нажмёт её и потеряет результат.
   *
   * «Сегодня» и «Лаборатория» выглядят разделами, но на самом деле показывают
   * задания — это прогоны, и уводить из них нельзя.
   */
  const FLOWS = [
    'app/arena_matchmaking.tsx',
    'app/arena_match.tsx',
    'app/arena_results.tsx',
    'app/arena_review.tsx',
    'app/arena_invite.tsx',
    'app/arena_today.tsx',
    'app/arena_match_lab.tsx',
  ];

  it.each(SECTIONS)('%s показывает таббар', (rel) => {
    expect(read(rel)).toContain('<ArenaHubChrome');
  });

  it.each(FLOWS)('%s таббар НЕ показывает', (rel) => {
    expect(read(rel)).not.toContain('<ArenaHubChrome');
  });

  /** Прогон узнаётся по тому, что он рисует задание. */
  it('экраны с заданиями действительно прогоны, а не разделы', () => {
    for (const rel of ['app/arena_today.tsx', 'app/arena_match_lab.tsx', 'app/arena_match.tsx']) {
      expect(read(rel)).toContain('ArenaQuestion');
    }
  });

  /** Иначе центральная кнопка на этих экранах была бы мёртвой. */
  it('обвязка сама добирает доступность, если экран её не дал', () => {
    const chrome = read('components/arena/ArenaHubChrome.tsx');
    expect(chrome).toContain('arenaV2Home()');
    expect(chrome).toContain('if (availability) return;');
  });
});
