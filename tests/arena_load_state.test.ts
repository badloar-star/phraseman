import * as fs from 'fs';
import * as path from 'path';
import { arenaCachedLoadView, arenaKnowsValue, arenaLoadState, arenaShowsData } from '../modules/arena/load_state';

/**
 * Состояние загрузки экрана.
 *
 * Модуль появился из-за одной конкретной лжи, которая была сразу на трёх
 * экранах: при НЕУДАЧНОЙ загрузке они показывали «пусто». Игрок читал «матчей
 * пока нет» и «друзей нет» там, где просто не ответил сервер. Это хуже ошибки:
 * ошибку он бы перечитал, а «пусто» принял за правду о себе.
 *
 * И отдельная ложь на экране рангов: он рисовал «Бронза III · 0 очков» до
 * ответа сервера, то есть показывал чужой ранг как свой.
 */

describe('четыре состояния, а не два', () => {
  it('до ответа — загрузка, а не пустота', () => {
    expect(arenaLoadState({ loaded: false, failed: false, count: 0 })).toBe('loading');
  });

  /** Главное правило: отказ важнее пустоты. */
  it('отказ — это отказ, а НЕ «пусто»', () => {
    expect(arenaLoadState({ loaded: true, failed: true, count: 0 })).toBe('failed');
    expect(arenaLoadState({ loaded: false, failed: true, count: 0 })).toBe('failed');
  });

  it('пустота — только когда ответ пришёл и он пуст', () => {
    expect(arenaLoadState({ loaded: true, failed: false, count: 0 })).toBe('empty');
  });

  it('данные есть — показываем', () => {
    expect(arenaLoadState({ loaded: true, failed: false, count: 3 })).toBe('ready');
  });

  /**
   * Именно эта комбинация и врала: экран считал себя загруженным, потому что
   * запрос завершился, — и не различал «завершился успешно» и «завершился
   * отказом».
   */
  it('завершившийся отказом запрос не выдаётся за пустой ответ', () => {
    expect(arenaLoadState({ loaded: true, failed: true, count: 0 })).not.toBe('empty');
  });

  it('мусор в счётчике не превращает пустоту в данные', () => {
    for (const count of [NaN, -5, undefined as unknown as number, null as unknown as number]) {
      expect(arenaLoadState({ loaded: true, failed: false, count })).toBe('empty');
    }
  });
});

describe('когда можно показывать данные', () => {
  it('только в готовом состоянии', () => {
    expect(arenaShowsData('ready')).toBe(true);
    for (const state of ['loading', 'failed', 'empty'] as const) {
      expect(arenaShowsData(state)).toBe(false);
    }
  });
});

describe('значения без понятия «пусто»', () => {
  /**
   * У ранга, кошелька и профиля пустого состояния не бывает, но бывает
   * НЕИЗВЕСТНОЕ. Ноль — это утверждение, а до ответа сервера мы ничего не
   * знаем и утверждать не имеем права.
   */
  it('до ответа значение неизвестно', () => {
    expect(arenaKnowsValue({ loaded: false, failed: false })).toBe(false);
  });

  it('после отказа значение тоже неизвестно', () => {
    expect(arenaKnowsValue({ loaded: true, failed: true })).toBe(false);
  });

  it('после успешного ответа значение известно', () => {
    expect(arenaKnowsValue({ loaded: true, failed: false })).toBe(true);
  });
});

describe('экраны действительно различают отказ и пустоту', () => {
  const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

  /** Все три экрана раньше показывали «пусто» при неудачной загрузке. */
  const LIST_SCREENS = [
    'app/arena_history.tsx',
    'app/arena_tops.tsx',
    'app/arena_review.tsx',
  ];

  it.each(LIST_SCREENS)('%s различает четыре состояния', (rel) => {
    const source = read(rel);
    expect(source).toContain('arenaLoadState');
    // Экран, у которого есть сохранённый снимок, спрашивает
    // `arenaCachedLoadView`: при отказе ему есть что показать, и ошибка
    // не должна вставать поверх содержимого. Экран без снимка решает сам.
    const cached = source.includes('arenaCachedLoadView');
    const name = cached ? source.includes('boardView') ? 'boardView' : 'view' : 'state';
    expect(source).toContain(`${name} === '${cached ? 'error' : 'failed'}'`);
    expect(source).toContain(`${name} === '${cached ? 'silent' : 'loading'}'`);
    expect(source).toContain(`${name} === 'empty'`);
  });

  it.each(LIST_SCREENS)('%s объясняет отказ, а не молчит', (rel) => {
    expect(read(rel)).toContain("arenaText(lang, 'loadFailed')");
  });

  /**
   * Отдельная ложь экрана рангов: он рисовал «Бронза III · 0 очков» до ответа
   * сервера, то есть показывал чужой ранг как свой.
   */
  it('экран рангов не показывает ранг, пока не знает его', () => {
    const source = read('app/arena_ranks.tsx');
    expect(source).toContain('arenaKnowsValue');
    expect(source).toContain('known ?');
  });

  it('запрос профиля на экране рангов больше не глотает ошибку молча', () => {
    expect(read('app/arena_ranks.tsx')).toContain('setHomeFailed(true)');
  });
});

describe('экран со снимком: ошибка не встаёт поверх содержимого', () => {
  it('не показывает ошибку, когда содержимое уже на экране', () => {
    // Так было до правила: обновление не удалось, сверху краснело «Не удалось
    // загрузить», а прямо под ним шёл полный список из снимка.
    expect(arenaCachedLoadView({ state: 'failed', cachedCount: 8, volatile: false })).toBe('data');
    expect(arenaCachedLoadView({ state: 'failed', cachedCount: 8, volatile: true })).toBe('data_stale');
  });

  it('показывает ошибку, только когда показать нечего', () => {
    expect(arenaCachedLoadView({ state: 'failed', cachedCount: 0, volatile: false })).toBe('error');
    expect(arenaCachedLoadView({ state: 'failed', cachedCount: 0, volatile: true })).toBe('error');
  });

  it('никогда не просит показать загрузку, если снимок есть', () => {
    // Владелец: видимой загрузки нет нигде.
    expect(arenaCachedLoadView({ state: 'loading', cachedCount: 3, volatile: true })).toBe('data');
    expect(arenaCachedLoadView({ state: 'loading', cachedCount: 0, volatile: true })).toBe('silent');
  });

  it('пустота остаётся пустотой', () => {
    expect(arenaCachedLoadView({ state: 'empty', cachedCount: 0, volatile: false })).toBe('empty');
    expect(arenaCachedLoadView({ state: 'ready', cachedCount: 0, volatile: true })).toBe('data');
  });
});
