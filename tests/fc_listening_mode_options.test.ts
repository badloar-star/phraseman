/**
 * cards-2.1 (§7.2 SPEC_2_1): список режимов озвучки «Слушания» и переключение
 * выбранного — четыре чипа заменены одной кнопкой с выпадающим списком.
 */
// ES-ветка triLang живёт под флагом (dev-локаль) — включаем её, как в i18n_locale.test.ts
jest.mock('../app/config', () => ({
  ...jest.requireActual<typeof import('../app/config')>('../app/config'),
  ENABLE_SPANISH_LOCALE: true,
}));

import { LISTENING_ORDERS, type ListeningOrder } from '../app/flashcards/listening_machine';
import {
  isListeningModeSelected,
  isListeningOrder,
  listeningBackLangLabel,
  listeningModeIndex,
  listeningModeLabels,
  listeningModeOptions,
  selectListeningMode,
} from '../app/flashcards/listening_mode_options';

describe('listeningModeOptions — список вариантов', () => {
  it('содержит ВСЕ режимы машины ровно по разу и в её порядке', () => {
    const opts = listeningModeOptions('ru');
    expect(opts.map((o) => o.id)).toEqual([...LISTENING_ORDERS]);
    expect(new Set(opts.map((o) => o.id)).size).toBe(LISTENING_ORDERS.length);
  });

  it('у каждого варианта есть подпись, подсказка и иконка', () => {
    for (const lang of ['ru', 'uk', 'es'] as const) {
      for (const o of listeningModeOptions(lang)) {
        expect(o.label.trim().length).toBeGreaterThan(0);
        expect(o.hint.trim().length).toBeGreaterThan(0);
        expect(o.icon.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('подписи уникальны — кнопка однозначно читается', () => {
    const labels = listeningModeOptions('ru').map((o) => o.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('язык перевода в подписи зависит от локали интерфейса', () => {
    expect(listeningBackLangLabel('ru')).toBe('RU');
    expect(listeningBackLangLabel('uk')).toBe('UA');
    expect(listeningBackLangLabel('es')).toBe('ES');
    expect(listeningModeLabels('uk').en_ru).toBe('EN → UA');
    expect(listeningModeLabels('es').ru_en).toBe('ES → EN');
    expect(listeningModeLabels('ru').en_x2).toBe('EN ×2');
  });

  it('подсказки локализованы (RU ≠ UK ≠ ES)', () => {
    const ru = listeningModeOptions('ru')[0]!.hint;
    const uk = listeningModeOptions('uk')[0]!.hint;
    const es = listeningModeOptions('es')[0]!.hint;
    expect(ru).not.toBe(uk);
    expect(ru).not.toBe(es);
  });
});

describe('isListeningOrder / listeningModeIndex', () => {
  it('валидные режимы распознаются', () => {
    for (const o of LISTENING_ORDERS) expect(isListeningOrder(o)).toBe(true);
  });

  it('мусор отбрасывается', () => {
    for (const bad of ['', 'EN_RU', 'weak', null, undefined, 0, {}, []]) {
      expect(isListeningOrder(bad)).toBe(false);
    }
  });

  it('индекс соответствует позиции в LISTENING_ORDERS', () => {
    LISTENING_ORDERS.forEach((o, i) => expect(listeningModeIndex(o)).toBe(i));
    expect(listeningModeIndex('nope')).toBe(-1);
  });
});

describe('selectListeningMode — переключение выбранного', () => {
  it('валидный кандидат становится текущим', () => {
    expect(selectListeningMode('en_ru', 'en_only')).toBe('en_only');
    expect(selectListeningMode('en_only', 'ru_en')).toBe('ru_en');
  });

  it('повторный выбор того же режима ничего не ломает', () => {
    expect(selectListeningMode('en_x2', 'en_x2')).toBe('en_x2');
  });

  it('мусор НЕ попадает в сохраняемые настройки — остаётся текущий', () => {
    const current: ListeningOrder = 'ru_en';
    expect(selectListeningMode(current, 'garbage')).toBe(current);
    expect(selectListeningMode(current, null)).toBe(current);
    expect(selectListeningMode(current, 42)).toBe(current);
  });

  it('последовательное переключение по всем режимам', () => {
    let cur: ListeningOrder = 'en_ru';
    for (const o of LISTENING_ORDERS) cur = selectListeningMode(cur, o);
    expect(cur).toBe(LISTENING_ORDERS[LISTENING_ORDERS.length - 1]);
  });
});

describe('isListeningModeSelected — отметка текущего в списке', () => {
  it('ровно один вариант отмечен для любого режима', () => {
    const opts = listeningModeOptions('ru');
    for (const cur of LISTENING_ORDERS) {
      const marked = opts.filter((o) => isListeningModeSelected(o, cur));
      expect(marked).toHaveLength(1);
      expect(marked[0]!.id).toBe(cur);
    }
  });
});
