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

  /**
   * Повторять в пустоте нечего — ложной кнопки повтора быть не должно. Но
   * дорога назад нужна: без неё пустой экран остаётся тупиком с одной
   * системной стрелкой.
   */
  it('пустота объясняется, повтора не выдумывает, но выход даёт', () => {
    const copy = arenaExpansionStateCopy({ state: 'empty', emptyHint: 'emptyLab' });
    expect(copy.body).toBe('emptyLab');
    expect(copy.action).toBe('back');
    expect(copy.action).not.toBe('retry');
    expect(arenaExpansionStateCopy({ state: 'empty' }).body).toBeUndefined();
  });

  it('загрузка и готовность действий не предлагают', () => {
    expect(arenaExpansionStateCopy({ state: 'loading' }).action).toBe('none');
    expect(arenaExpansionStateCopy({ state: 'ready' }).action).toBe('none');
  });

  /**
   * Владелец (2026-08-13): «не должно быть видимой никогда нигде загрузки».
   * Слово «Загрузка…» не сообщает игроку ничего, чего он не видит сам, зато
   * превращает быстрый экран в ожидание.
   */
  it('загрузка вообще ничего не рисует', () => {
    expect(arenaExpansionStateCopy({ state: 'loading' }).silent).toBe(true);
    for (const state of ['error', 'unavailable', 'expired', 'empty', 'ready'] as const) {
      expect(arenaExpansionStateCopy({ state }).silent).toBeUndefined();
    }
  });

  it('общая карточка возвращает пустоту на загрузке', () => {
    const ui = fs.readFileSync(path.resolve(__dirname, '..', 'components/arena/ArenaExpansionUI.tsx'), 'utf8');
    expect(ui).toContain('if (copy.silent) return null');
  });

  it('ни один экран расширения не пишет слово «Загрузка»', () => {
    // зачем короче (владелец, 2026-08-16): лаборатория, призрачные дуэли,
    // соперничества и карта мастерства удалены — дублировали быстрый матч
    // и ранги.
    for (const screen of ['app/arena_today.tsx', 'app/arena_star_wallet.tsx']) {
      const source = fs.readFileSync(path.resolve(__dirname, '..', screen), 'utf8');
      expect(source).not.toContain("arenaExpansionText(lang, 'loading')");
    }
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
  'components/arena/ArenaHubSurface.tsx',
  'app/arena_today.tsx',
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

/**
 * Красное «Повторить» вместо объяснения — самая частая ложь Арены.
 *
 * Оно стояло на шести экранах сразу: матч, результат, поиск соперника,
 * приглашение друга, вход по коду и пропуск сезона. Игрок видел красный
 * глагол, не понимал, что произошло, и не знал, потерял он что-нибудь или нет.
 * Ни на одном из шести не было ни причины, ни слова о последствиях.
 */
describe('подпись кнопки больше нигде не выдаётся за объяснение', () => {
  const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

  const SCREENS: readonly string[] = [
    'app/arena_match.tsx',
    'app/arena_results.tsx',
    'app/arena_matchmaking.tsx',
    'app/arena_friend_duel.tsx',
    'app/arena_invite.tsx',
    'app/arena_season_pass.tsx',
  ];

  it('ни один экран не показывает «Повторить» красным текстом вместо причины', () => {
    for (const screen of SCREENS) {
      const source = read(screen);
      expect(source).not.toContain("P.danger }]}>{arenaText(lang, 'retry')}");
    }
  });

  it('каждый отказ действия объясняет последствия', () => {
    expect(read('app/arena_friend_duel.tsx')).toContain("'inviteFailedHint'");
    expect(read('app/arena_invite.tsx')).toContain("'joinFailedHint'");
    expect(read('app/arena_season_pass.tsx')).toContain('Redirect href="/season_pass"');
  });

  it('объяснения переведены на восемь языков и не совпадают с подписью кнопки', () => {
    for (const key of ['inviteFailed', 'inviteFailedHint', 'joinFailed', 'joinFailedHint',
      'claimFailed', 'claimFailedHint'] as const) {
      for (const lang of LANGS) {
        expect(arenaText(lang, key).length).toBeGreaterThan(0);
        expect(arenaText(lang, key)).not.toBe(arenaText(lang, 'retry'));
      }
    }
  });
});

/**
 * Отказ покупки — не отказ загрузки.
 *
 * Магазин писал `state = 'error'` и на покупку, и на надевание, и на спин, а
 * это же поле рисует состояние всего экрана. Сорвавшаяся покупка выглядела как
 * не загрузившийся магазин, и игрок не мог понять главного: списались его
 * звёзды или нет.
 */
describe('магазин отвечает за свои действия отдельно', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_star_wallet.tsx'), 'utf8');

  it('покупка, надевание и спин не выдают себя за отказ загрузки', () => {
    expect(source).toContain('actionError');
    expect(source).not.toContain("void arenaStarEquip(item.sku, item.slot, requestId).then(() => load()).catch(() => setState('error'))");
    expect(source).not.toContain(".catch(() => setState('error')).finally(() => setBusySku(null))");
  });

  it('каждое действие объясняет, что цело', () => {
    for (const key of ['purchaseFailed', 'purchaseFailedHint', 'equipFailed', 'equipFailedHint',
      'spinFailed', 'spinFailedHint'] as const) {
      expect(source).toContain(`'${key}'`);
      for (const lang of LANGS) {
        expect(arenaExpansionText(lang, key).length).toBeGreaterThan(0);
      }
    }
  });

  it('отказ покупки звучит не так, как отказ загрузки', () => {
    for (const lang of LANGS) {
      expect(arenaExpansionText(lang, 'purchaseFailed')).not.toBe(arenaExpansionText(lang, 'loadFailed'));
      expect(arenaExpansionText(lang, 'purchaseFailedHint')).not.toBe(arenaExpansionText(lang, 'loadFailedHint'));
    }
  });
});

/**
 * Отказ от приглашения уходил домой ЧЕРЕЗ `finally` — то есть и тогда, когда
 * отказ не дошёл. Гость был уверен, что отказался, а хозяин продолжал ждать
 * ответа, которого уже никто не пришлёт.
 */
describe('отказ от приглашения не притворяется отправленным', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_invite.tsx'), 'utf8');

  it('домой уходим только после успешного отказа', () => {
    expect(source).not.toContain("arenaV2InviteDecline(inviteId.trim()).finally(() => router.replace('/arena' as never))");
    expect(source).toContain('declineFailed');
  });

  it('сказано, что видит друг и что приглашение истечёт само', () => {
    for (const lang of LANGS) {
      expect(arenaText(lang, 'declineFailed').length).toBeGreaterThan(0);
      expect(arenaText(lang, 'declineFailedHint').length).toBeGreaterThan(0);
    }
  });
});

/**
 * Пустой пропуск сезона и пустые экраны расширения: выход обязан быть всегда.
 * Раньше пустота показывала объяснение и не давала ни одной кнопки — оставалась
 * одна системная стрелка, а на части устройств и её не видно.
 */
describe('из пустоты есть выход', () => {
  const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

  it('пропуск сезона объясняет пустой список, но только после ответа сервера', () => {
    const source = read('app/arena_season_pass.tsx');
    expect(source).toContain('Redirect href="/season_pass"');
    expect(source).not.toContain('arenaV2SeasonClaim');
  });

  it('обещание про звёзды переведено на все языки', () => {
    for (const lang of LANGS) {
      expect(arenaText(lang, 'seasonEmpty').length).toBeGreaterThan(0);
      expect(arenaText(lang, 'seasonEmptyHint').length).toBeGreaterThan(0);
    }
  });
});
