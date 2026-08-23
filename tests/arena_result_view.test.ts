import {
  arenaResultAnnounce,
  arenaResultHasAnnounce,
  arenaTierKeyForRating,
} from '../modules/arena/result_view';
import { ARENA_TIER_KEYS } from '../modules/arena/rank_engine';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Что объявить после матча.
 *
 * Экран результата умел только ЗВУЧАТЬ: повышение тира и выданную косметику он
 * проигрывал звуком и не показывал. Игрок, взявший тир, слышал фанфару и не
 * видел ничего — то есть не узнавал ни что случилось, ни что он получил.
 *
 * Главное правило здесь: молчать, а не выдумывать. Ложное «ты поднялся в тир»
 * хуже молчания — игрок пойдёт проверять и не найдёт подтверждения.
 */

// Звёздная шкала (2026-08-23): победа +1, три звезды на ранг. 9 звёзд —
// первый ранг второго тира, 8 — последний ранг первого.
const reward = (over: Record<string, unknown> = {}) => ({
  starsEarned: 12,
  xpEarned: 40,
  ratingDelta: 1,
  ratingAfter: 9,
  rankEvent: 'tier_up',
  rankTierBefore: 0,
  rankTierAfter: 1,
  ...over,
});

describe('повышение и понижение', () => {
  it('подъём в тир объявляется с названием тира', () => {
    const announce = arenaResultAnnounce(reward());
    expect(announce.rank.kind).toBe('tier_up');
    expect(announce.rank.kind === 'tier_up' && announce.rank.tierKey).toBe(ARENA_TIER_KEYS[1]);
  });

  it('падение из тира объявляется отдельно', () => {
    const announce = arenaResultAnnounce(reward({ rankEvent: 'tier_down', ratingAfter: 8, ratingDelta: -1, rankTierAfter: 0 }));
    expect(announce.rank.kind).toBe('tier_down');
  });

  it('смена деления внутри тира — своё событие, не подмена тира', () => {
    expect(arenaResultAnnounce(reward({ rankEvent: 'rank_up', ratingAfter: 6 })).rank.kind).toBe('rank_up');
    expect(arenaResultAnnounce(reward({ rankEvent: 'rank_down', ratingAfter: 5, ratingDelta: -1 })).rank.kind).toBe('rank_down');
  });

  it('несёт точные ранги до и после для всех четырёх анимаций', () => {
    const rankUp = arenaResultAnnounce(reward({ rankEvent: 'rank_up', ratingAfter: 6 })).rank;
    expect(rankUp).toMatchObject({
      kind: 'rank_up',
      before: { rankIndex: 1, division: 2 },
      after: { rankIndex: 2, division: 1 },
    });

    const rankDown = arenaResultAnnounce(reward({ rankEvent: 'rank_down', ratingAfter: 5, ratingDelta: -1 })).rank;
    expect(rankDown).toMatchObject({
      kind: 'rank_down',
      before: { rankIndex: 2, division: 1 },
      after: { rankIndex: 1, division: 2 },
    });

    const tierUp = arenaResultAnnounce(reward()).rank;
    expect(tierUp).toMatchObject({ kind: 'tier_up', before: { tierIndex: 0 }, after: { tierIndex: 1 } });

    const tierDown = arenaResultAnnounce(reward({ rankEvent: 'tier_down', ratingAfter: 8, ratingDelta: -1 })).rank;
    expect(tierDown).toMatchObject({ kind: 'tier_down', before: { tierIndex: 1 }, after: { tierIndex: 0 } });
  });

  it('без события ранга — молчим', () => {
    expect(arenaResultAnnounce(reward({ rankEvent: 'none' })).rank.kind).toBe('none');
    expect(arenaResultAnnounce(reward({ rankEvent: undefined })).rank.kind).toBe('none');
  });

  /** Назвать тир наугад значит соврать. */
  it('событие есть, а тир за шкалой — молчим, а не выдумываем', () => {
    for (const value of [null, 'золото', NaN, undefined]) {
      expect(arenaResultAnnounce(reward({ ratingAfter: value })).rank.kind).toBe('none');
    }
  });

  it('отменённое событие серии больше не объявляется', () => {
    // Промо-серий нет (D-40): их событие не должно превращаться в подъём.
    expect(arenaResultAnnounce(reward({ rankEvent: 'promo_won' })).rank.kind).toBe('none');
  });
});

describe('выданная косметика', () => {
  it('перечисляется по предметам', () => {
    const announce = arenaResultAnnounce(reward({
      tierRewards: [{ tierIndex: 1, itemId: 'title_rising_challenger' }],
    }));
    expect(announce.unlockedItemIds).toEqual(['title_rising_challenger']);
  });

  it('несколько тиров за раз дают несколько предметов', () => {
    const announce = arenaResultAnnounce(reward({
      tierRewards: [
        { tierIndex: 1, itemId: 'a' },
        { tierIndex: 2, itemId: 'b' },
      ],
    }));
    expect(announce.unlockedItemIds).toEqual(['a', 'b']);
  });

  it('битые записи выпадают, целые остаются', () => {
    const announce = arenaResultAnnounce(reward({
      tierRewards: [null, { tierIndex: 1 }, 'мусор', { itemId: 'ok' }],
    }));
    expect(announce.unlockedItemIds).toEqual(['ok']);
  });

  it('ничего не выдано — пустой список, а не выдуманный предмет', () => {
    expect(arenaResultAnnounce(reward()).unlockedItemIds).toEqual([]);
    expect(arenaResultAnnounce(reward({ tierRewards: 'нет' })).unlockedItemIds).toEqual([]);
  });
});

describe('числа', () => {
  it('очки ранга берутся со знаком — потерю скрывать нельзя', () => {
    expect(arenaResultAnnounce(reward({ ratingDelta: -24 })).ratingDelta).toBe(-24);
    expect(arenaResultAnnounce(reward({ ratingDelta: 20 })).ratingDelta).toBe(20);
  });

  it('звёзды и опыт отрицательными не бывают', () => {
    const announce = arenaResultAnnounce(reward({ starsEarned: -5, xpEarned: -10 }));
    expect(announce.starsEarned).toBe(0);
    expect(announce.xpEarned).toBe(0);
  });

  it('мусор вместо награды не роняет экран', () => {
    for (const value of [null, undefined, 'строка', [], 42]) {
      const announce = arenaResultAnnounce(value);
      expect(announce.rank.kind).toBe('none');
      expect(announce.unlockedItemIds).toEqual([]);
      expect(announce.ratingDelta).toBe(0);
    }
  });
});

describe('есть ли что объявлять', () => {
  it('нечего — не показываем блок вовсе', () => {
    expect(arenaResultHasAnnounce(arenaResultAnnounce({
      starsEarned: 5, xpEarned: 10, ratingDelta: 0,
    }))).toBe(false);
  });

  it('любое из трёх — показываем', () => {
    expect(arenaResultHasAnnounce(arenaResultAnnounce(reward()))).toBe(true);
    expect(arenaResultHasAnnounce(arenaResultAnnounce({ ratingDelta: -16 }))).toBe(true);
    expect(arenaResultHasAnnounce(arenaResultAnnounce({
      tierRewards: [{ itemId: 'x' }],
    }))).toBe(true);
  });
});

describe('тир по очкам', () => {
  it('считается для любого значения', () => {
    expect(arenaTierKeyForRating(0)).toBe(ARENA_TIER_KEYS[0]);
    expect(arenaTierKeyForRating(300)).toBe(ARENA_TIER_KEYS[1]);
    expect(arenaTierKeyForRating(999_999)).toBe(ARENA_TIER_KEYS[ARENA_TIER_KEYS.length - 1]);
    expect(arenaTierKeyForRating(NaN)).toBe(ARENA_TIER_KEYS[0]);
  });
});

/**
 * Экран результата и красное слово «Повторить».
 *
 * При обрыве связи он краснел одним глаголом — без объяснения и без кнопки,
 * которой этот глагол можно выполнить. Игрок видел красное и решал, что
 * потерял результат матча. На самом деле результат уже засчитан на сервере, и
 * ждёт только доставка: повторять нечего.
 */
describe('обрыв связи не создаёт промежуточный экран результата', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_results.tsx'), 'utf8');

  it('не выдаёт кнопочный глагол за объяснение', () => {
    expect(source).not.toContain("styles.error, { color: P.danger }]}>{arenaText(lang, 'retry')");
  });

  /**
   * Раньше здесь стояла надпись «Загрузка». Владелец её запретил: экран
   * результата и так открывается с игроками и счётом, а слово только
   * превращает мгновение в ожидание.
   */
  it('до ответа экран молчит, а не пишет «Загрузка»', () => {
    expect(source).not.toContain("arenaText(lang, 'loading')");
  });

  it('не монтирует ветку подготовки результата', () => {
    expect(source).not.toContain("arenaText(lang, 'resultPending')");
    expect(source).not.toContain("arenaText(lang, 'resultPendingHint')");
  });
});

/**
 * «+0» вместо «пока не знаю».
 *
 * Награда за матч может ещё не прийти: сервер не ответил или отчёт лежит в
 * очереди отправки. Компонент в этом случае рисовал **+0** — то есть
 * утверждение «ты не заработал ничего». Игрок, взявший три звезды, видел ноль
 * и уходил с ощущением, что матч не засчитали. Настоящий ноль (быстрый матч
 * звёзд не начисляет) при этом обязан рисоваться нолём: он известен.
 */
describe('неизвестная награда не выдаётся за ноль', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'components/arena/ArenaRewards.tsx'), 'utf8');

  it('число рисуется только когда награда известна', () => {
    expect(source).toContain('const known = reward !== undefined');
    expect(source).not.toContain('<Text style={[styles.value, { color: P.text }]}>+{shownStars}</Text>');
  });

  it('счёт неизвестного игрока тоже не превращается в ноль', () => {
    const players = fs.readFileSync(path.resolve(__dirname, '..', 'components/arena/ArenaPlayers.tsx'), 'utf8');
    expect(players).toContain('player && knownScore !== null');
    expect(players).toContain('? <V2Counter value={shownScore} />');
  });
});

/**
 * Ноль как утверждение — третий заход.
 *
 * Сначала это была награда за матч («+0» вместо «пока не знаю»), потом счёт
 * неизвестного игрока. Здесь ещё два места: кошелёк на главном экране и свой
 * тир в топах. Оба показывали ноль до того, как пришёл ответ, и оба отвечали
 * на вопрос игрока о НЁМ САМОМ — а значит врали убедительно.
 */
describe('ноль не подменяет незнание', () => {
  const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

  it('плотная сводка хаба рисует прочерк, пока статистика неизвестна', () => {
    const summary = read('components/arena/ArenaHubSummary.tsx');
    expect(summary).toContain("stats?.wins ?? '—'");
    expect(summary).toContain("stats?.losses ?? '—'");
    expect(summary).toContain("model.streak ?? '—'");
  });

  it('топы не выдают чужой тир за свой', () => {
    const tops = read('app/arena_tops.tsx');
    expect(tops).not.toContain("arenaRankView(you?.rating ?? 0)");
    expect(tops).toContain('you ? (');
  });
});

/**
 * Матч, который сервер ещё не закрыл: свой отчёт ушёл, а соперник не сдал.
 * Игрок видел экран результата без награды и без единого слова о том, почему
 * её нет и придёт ли она вообще.
 */
describe('ожидание отчёта остаётся за финальным кадром матча', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_results.tsx'), 'utf8');

  it('не монтирует ни один экран ожидания', () => {
    expect(source).not.toContain("arenaText(lang, 'awaitingRival')");
    expect(source).not.toContain("arenaText(lang, 'awaitingRivalHint')");
    expect(source).not.toContain("arenaText(lang, 'reportQueued')");
    expect(source).not.toContain("arenaText(lang, 'reportQueuedHint')");
  });
});

/** Владелец (2026-08-21): ник стоит под аватаром и показывается целиком. */
describe('длинные имена не ломают строку игроков', () => {
  const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

  it('переносит полный ник под аватар мелким кеглем', () => {
    const players = read('components/arena/ArenaPlayers.tsx');
    expect(players).toContain('<View style={styles.identity}>');
    expect(players).not.toContain('numberOfLines={1}');
    expect(players).not.toContain('ellipsizeMode="tail"');
    expect(players).toMatch(/name:\s*\{[^}]*fontSize:\s*1[012](?:\.\d+)?/);
  });

  it('заголовок строки раздела тоже ограничен', () => {
    expect(read('components/arena/ArenaExpansionUI.tsx')).toContain('numberOfLines={2}');
  });
});
