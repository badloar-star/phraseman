/**
 * Сторож правила владельца (2026-09-13): «в СВОЙ первый календарный день человек
 * не видит модалок недельных бонусов; начиная со второго — видит».
 *
 * Правило держится на ОДНОМ гарде в `getTodaysBoons` (движок бонусов) плюс
 * повторе в `checkComebackEligible` (единственный путь, который движок не
 * проходит). Обычные тесты бонусов этот класс регрессии НЕ ловят: они передают
 * todayKey явно и про день установки ничего не знают.
 *
 * Приветственный подарок за установку (+300 рун, +100 жемчужин) владелец просил
 * НЕ трогать — здесь же проверяем, что гард в его код не пролез.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { getTodaysBoons } from '../app/boons/boon_engine';
import {
  __resetFirstDaySilenceCacheForTests,
  __setInstallDayKeyForTests,
  isFirstDayAfterInstall,
  rememberInstallDateMs,
  FIRST_DAY_BOON_SILENCE_ENABLED,
  INSTALL_DATE_STORAGE_KEY,
} from '../app/boons/first_day_silence';
import { getLocalDayKey } from '../app/local_date';
import {
  __resetRemoteFlagsForTest,
  applyRemoteConfigSnapshot,
} from '../app/remote_flags';

/**
 * Расписание с бонусом на КАЖДЫЙ день недели плюс включённые модификаторы —
 * так тест не зависит от того, в какой день недели его запустили.
 */
const EVERY_DAY_CONFIG = {
  schedule: {
    0: 'streak_saver',
    1: 'mystery_monday',
    2: 'double_xp',
    3: 'turbo_regen',
    4: 'double_xp',
    5: 'flashcard_friday',
    6: 'speaking_saturday',
  },
  enabled: {},
  modifiersEnabled: {},
};

function armLiveConfig(): void {
  __resetRemoteFlagsForTest();
  applyRemoteConfigSnapshot({
    texts: { weekly_boons_config: JSON.stringify(EVERY_DAY_CONFIG) },
  });
}

beforeEach(() => {
  __resetFirstDaySilenceCacheForTests();
  armLiveConfig();
});

afterEach(() => {
  __resetFirstDaySilenceCacheForTests();
  __resetRemoteFlagsForTest();
});

describe('isFirstDayAfterInstall', () => {
  it('правило включено (иначе тишины первого дня нет вообще)', () => {
    expect(FIRST_DAY_BOON_SILENCE_ENABLED).toBe(true);
  });

  it('день установки === сегодня → первый день', () => {
    __setInstallDayKeyForTests(getLocalDayKey());
    expect(isFirstDayAfterInstall()).toBe(true);
  });

  it('установка была вчера → уже НЕ первый день (со второго дня бонусы есть)', () => {
    const yesterday = getLocalDayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    __setInstallDayKeyForTests(yesterday);
    expect(isFirstDayAfterInstall()).toBe(false);
  });

  it('fail-open: день установки неизвестен → правило НЕ срабатывает', () => {
    // Иначе тишина накрыла бы существующих пользователей на каждом холодном
    // старте, пока кэш ещё не прочитан с диска.
    __setInstallDayKeyForTests(null);
    expect(isFirstDayAfterInstall()).toBe(false);
  });

  it('rememberInstallDateMs заполняет кэш синхронно (путь первого запуска)', () => {
    __setInstallDayKeyForTests(null);
    expect(isFirstDayAfterInstall()).toBe(false);
    rememberInstallDateMs(Date.now());
    expect(isFirstDayAfterInstall()).toBe(true);
  });

  it('мусорное значение install_date не включает правило', () => {
    __setInstallDayKeyForTests(null);
    rememberInstallDateMs(0);
    rememberInstallDateMs(-1);
    rememberInstallDateMs(Number.NaN);
    expect(isFirstDayAfterInstall()).toBe(false);
  });
});

describe('getTodaysBoons — единая точка гашения', () => {
  it('в день установки нет ни primary, ни модификаторов', () => {
    __setInstallDayKeyForTests(getLocalDayKey());
    const today = getTodaysBoons();
    expect(today.primary).toBeNull();
    expect(today.modifiers).toEqual([]);
  });

  it('на следующий день бонус возвращается сам, без действий пользователя', () => {
    const yesterday = getLocalDayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    __setInstallDayKeyForTests(yesterday);
    expect(getTodaysBoons().primary).not.toBeNull();
  });

  it('день/неделя считаются и в тишине (календарь не ломается)', () => {
    __setInstallDayKeyForTests(getLocalDayKey());
    const silent = getTodaysBoons();
    expect(typeof silent.utcWeekday).toBe('number');
    expect(typeof silent.weekNumber).toBe('number');
  });
});

describe('гард стоит в коде там, где нужен', () => {
  const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), 'utf8');

  it('boon_engine зовёт гард (иначе модалки и эффекты разъедутся)', () => {
    const engine = read('app', 'boons', 'boon_engine.ts');
    expect(engine).toContain("from './first_day_silence'");
    expect(engine).toContain('isFirstDayAfterInstall()');
  });

  it('checkComebackEligible повторяет гард — он идёт МИМО движка', () => {
    // last_active_date зеркалится из облака: переустановка на старом аккаунте
    // даёт свежий install_date при старой дате активности, и сундук «мы скучали»
    // выпрыгнул бы в первый день.
    const comeback = read('app', 'boons', 'comeback.ts');
    expect(comeback).toContain('isFirstDayAfterInstall()');
  });

  it('_layout отдаёт install_date в кэш на первом запуске', () => {
    const layout = read('app', '_layout.tsx');
    expect(layout).toContain('rememberInstallDateMs');
  });

  it('ключ install_date не переименован (его пишет _layout)', () => {
    expect(INSTALL_DATE_STORAGE_KEY).toBe('install_date');
    expect(read('app', '_layout.tsx')).toContain("'install_date'");
  });

  it('приветственный подарок за установку гардом НЕ тронут', () => {
    // Владелец: «только модал бонус за скачивание 300 рун и 100 жемчугов не
    // трогай, он пусть будет».
    const host = read('components', 'OnboardingWelcomeHost.tsx');
    expect(host).not.toContain('isFirstDayAfterInstall');
    expect(host).not.toContain('first_day_silence');
  });

  it('четыре хоста бонусных модалок ходят через движок, а не мимо', () => {
    // Если хост перестанет спрашивать движок, гард его накрывать перестанет —
    // и тишина первого дня тихо развалится именно в этом хосте.
    expect(read('components', 'BoonActivatedHost.tsx')).toContain('getTodaysBoons');
    expect(read('components', 'MysteryMondayHost.tsx')).toContain('isPrimaryBoonActive');
    expect(read('components', 'PerfectWeekHost.tsx')).toContain('isBoonModifierActive');
    expect(read('components', 'ComebackBoonHost.tsx')).toContain('checkComebackEligible');
  });

  it('немого catch в новом модуле нет (запрет владельца)', () => {
    const silence = read('app', 'boons', 'first_day_silence.ts');
    expect(silence).not.toMatch(/catch\s*(\([^)]*\))?\s*\{\s*\}/);
    expect(silence).toContain('DebugLogger.error');
  });
});
