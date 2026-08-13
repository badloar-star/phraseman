import * as fs from 'fs';
import * as path from 'path';
import { arenaExpansionStateCopy } from '../modules/arena/expansion_state';
import { arenaExpansionText } from '../modules/arena/expansion_copy';
import { arenaText } from '../modules/arena/copy';
import type { Lang } from '../constants/i18n';

/**
 * Пустые состояния и объяснения на экранах расширения.
 *
 * Владелец (D-65): каждый интерфейс Арены продуман до конца. Семь экранов
 * расширения показывали НЕУДАЧНУЮ ЗАГРУЗКУ как «Сейчас недоступно» — то есть
 * выдавали временный отказ сети за выключенный раздел. Разница видна игроку по
 * последствиям: из выключенного раздела он уходит, а отказ повторяет.
 *
 * Второе, что здесь закреплено: «Сегодня» в приложении ровно одно. Вкладка дня
 * и заход из десяти заданий назывались одинаково, и игрок не мог понять, куда
 * он попал.
 */

const LANGS: readonly Lang[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as Lang[];

describe('отказ загрузки — не «недоступно»', () => {
  it('отказ объясняется и предлагает повтор', () => {
    const copy = arenaExpansionStateCopy({ state: 'error' });
    expect(copy.title).toBe('loadFailed');
    expect(copy.body).toBe('loadFailedHint');
    expect(copy.action).toBe('retry');
  });

  it('выключенный раздел повтором не чинится — кнопка ведёт назад', () => {
    const copy = arenaExpansionStateCopy({ state: 'unavailable' });
    expect(copy.title).toBe('unavailable');
    expect(copy.body).toBe('unavailableHint');
    expect(copy.action).toBe('back');
  });

  it('истёкший срок объясняется по-разному у испытания и у записи', () => {
    expect(arenaExpansionStateCopy({ state: 'expired' }).body).toBe('todayNextDay');
    expect(arenaExpansionStateCopy({ state: 'expired', ghost: true }).title).toBe('ghostExpired');
    expect(arenaExpansionStateCopy({ state: 'expired', ghost: true }).body).toBe('ghostExpiredHint');
  });

  /** Ложная кнопка хуже её отсутствия: в пустоте нажимать нечего. */
  it('пустота объясняется, но кнопки не выдумывает', () => {
    const copy = arenaExpansionStateCopy({ state: 'empty', emptyHint: 'emptyLab' });
    expect(copy.body).toBe('emptyLab');
    expect(copy.action).toBe('none');
    expect(arenaExpansionStateCopy({ state: 'empty' }).body).toBeUndefined();
  });

  it('загрузка и готовность действий не предлагают', () => {
    expect(arenaExpansionStateCopy({ state: 'loading' }).action).toBe('none');
    expect(arenaExpansionStateCopy({ state: 'ready' }).action).toBe('none');
  });

  it('каждое состояние отказа переведено на все восемь языков', () => {
    for (const key of ['loadFailed', 'loadFailedHint', 'unavailableHint', 'todayNextDay',
      'ghostExpired', 'ghostExpiredHint', 'emptyLab', 'emptyRivalry', 'emptyPartner',
      'emptyStore', 'emptyGhost'] as const) {
      for (const lang of LANGS) {
        const text = arenaExpansionText(lang, key);
        expect(typeof text).toBe('string');
        expect(text.length).toBeGreaterThan(0);
      }
    }
  });
});

/**
 * Экраны перечислены ПОИМЁННО: без списка следующий экран заведёт ту же ложь
 * заново, и тест этого не заметит.
 */
const SCREENS: readonly string[] = [
  'app/arena.tsx',
  'app/arena_today.tsx',
  'app/arena_mastery_map.tsx',
  'app/arena_match_lab.tsx',
  'app/arena_partner.tsx',
  'app/arena_rivalries.tsx',
  'app/arena_ghost_duel.tsx',
  'app/arena_star_wallet.tsx',
];

describe('экраны действительно этим пользуются', () => {
  const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

  it('ни один экран больше не выдаёт отказ за «недоступно»', () => {
    for (const screen of SCREENS) {
      expect(read(screen)).not.toContain("'error' ? 'unavailable'");
    }
  });

  it('все восемь экранов показывают состояние общей карточкой', () => {
    for (const screen of SCREENS) {
      expect(read(screen)).toContain('ArenaStateNotice');
    }
  });

  it('общая карточка берёт строки из чистой развилки, а не решает сама', () => {
    const ui = read('components/arena/ArenaExpansionUI.tsx');
    expect(ui).toContain('arenaExpansionStateCopy');
  });
});

describe('«Сегодня» в Арене ровно одно', () => {
  /**
   * Вкладка дня и заход из десяти заданий назывались одинаково: игрок видел
   * «Сегодня» дважды и считал, что нажал не туда.
   */
  it('вкладка дня и испытание дня называются по-разному во всех языках', () => {
    for (const lang of LANGS) {
      expect(arenaExpansionText(lang, 'todayTitle')).not.toBe(arenaText(lang, 'todayTab'));
    }
  });

  it('испытание дня не называет себя «Сегодня» по-русски', () => {
    expect(arenaExpansionText('ru' as Lang, 'todayTitle')).toBe('Испытание дня');
    expect(arenaText('ru' as Lang, 'todayTab')).toBe('Сегодня');
  });

  /**
   * Внутренние разделы хаба живут ПОД вкладкой «Сегодня». Раздел с тем же
   * названием читается как то же самое место, и игрок перестаёт понимать, где
   * он находится.
   */
  it('раздел хаба не повторяет название вкладки', () => {
    for (const lang of LANGS) {
      expect(arenaExpansionText(lang, 'today')).not.toBe(arenaText(lang, 'todayTab'));
    }
  });
});
