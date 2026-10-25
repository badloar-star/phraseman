// «Опрос дня» (владелец 2026-09-30): модель + исходниковый контракт карточки.
import { readFileSync } from 'fs';
import path from 'path';

import {
  dailyPollPercents,
  parseDailyPoll,
  pickDailyPollText,
} from '../app/daily_poll/daily_poll_model';

const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

const rawPoll = {
  status: 'active',
  question: { ru: 'Что помогает заниматься регулярно?', en: 'What helps you study regularly?' },
  options: [
    { id: 'a', text: { ru: 'Короткие занятия', en: 'Short sessions' } },
    { id: 'b', text: { ru: 'Занятия с друзьями', en: 'Studying with friends' } },
  ],
  counts: { a: 2, b: 1 },
};

describe('daily poll model', () => {
  it('разбирает активный опрос', () => {
    const poll = parseDailyPoll(rawPoll, '2026-10-01');
    expect(poll?.options.map((o) => o.id)).toEqual(['a', 'b']);
    expect(poll?.counts).toEqual({ a: 2, b: 1 });
  });

  it('архив, один вариант, пять вариантов, нет ни ru ни en — карточки нет', () => {
    expect(parseDailyPoll({ ...rawPoll, status: 'archived' }, 'd')).toBeNull();
    expect(parseDailyPoll({ ...rawPoll, options: rawPoll.options.slice(0, 1) }, 'd')).toBeNull();
    const five = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, text: { ru: id } }));
    expect(parseDailyPoll({ ...rawPoll, options: five }, 'd')).toBeNull();
    expect(parseDailyPoll({ ...rawPoll, question: { es: 'Hola' } }, 'd')).toBeNull();
    expect(parseDailyPoll(null, 'd')).toBeNull();
  });

  it('язык: интерфейс → en → ru', () => {
    const text = { ru: 'Привет', en: 'Hi', es: 'Hola' };
    expect(pickDailyPollText(text, 'es')).toBe('Hola');
    expect(pickDailyPollText(text, 'pl')).toBe('Hi');
    expect(pickDailyPollText({ ru: 'Привет' }, 'pl')).toBe('Привет');
  });

  it('проценты в сумме 100, без голосов — нули', () => {
    const p = dailyPollPercents({ a: 1, b: 1, c: 1 }, ['a', 'b', 'c']);
    expect(p.a + p.b + p.c).toBe(100);
    expect(dailyPollPercents({}, ['a', 'b'])).toEqual({ a: 0, b: 0 });
    expect(dailyPollPercents({ a: 3, b: 1 }, ['a', 'b'])).toEqual({ a: 75, b: 25 });
  });

});

describe('daily poll card source contract', () => {
  const card = read('components/friends/DailyPollCard.tsx');
  const client = read('app/daily_poll/daily_poll_client.ts');
  const friends = read('app/(tabs)/friends.tsx');

  it('вкладка «Друзья» показывает карточку первым блоком списка', () => {
    expect(friends).toContain("import DailyPollCard from '../../components/friends/DailyPollCard'");
    // 25.10 (Ревизор, прогон 05:00): первым блоком теперь `firstCard` — за выключателем «Вместе» это «Фраза дня вдвоём» (ba45e9009, идея 8, 22.10), а «Опрос дня» —
    // её fallback и единственная карточка без выключателя. Смысл прежний: опрос остаётся первым блоком, пока нет фразы вдвоём; проверка стала строже — связка обязательна.
    expect(friends).toContain('const dailyPollCard = <DailyPollCard active={friendsRuntimeActive} />;');
    expect(friends).toContain('fallback={dailyPollCard}');
    expect(friends).toContain(') : dailyPollCard;');
    expect(friends).toContain('ListHeaderComponent={<>{firstCard}');
  });

  it('нет опроса — нет карточки (без пустой рамки)', () => {
    expect(card).toMatch(/if \(!poll\) return null;/);
  });

  it('экономия Firebase: без onSnapshot и таймеров, одно чтение документа, кэш на день', () => {
    for (const src of [card, client]) {
      expect(src).not.toMatch(/\.onSnapshot\(|\bonSnapshot\(|setInterval\(/);
    }
    expect(client).toContain(".collection('daily_polls').doc(dateKey).get()");
    expect(client).toContain('getLocalDayKey()');
    expect(client).toContain('daily_poll_cache_v1');
  });

  it('голос через callable, проценты из его ответа, голос хранится локально', () => {
    expect(client).toContain("'dailyPollVote'");
    expect(client).toContain('daily_poll_vote_v1');
    expect(client).toMatch(/counts: normalizeDailyPollCounts\(res\.data\?\.counts/);
  });

  it('optimistic UI: выбор сразу, откат при ошибке, защита от двойного тапа', () => {
    expect(card).toContain('setPendingOptionId(optionId); // optimistic');
    expect(card).toMatch(/setPendingOptionId\(null\);\s*setError\(outcome\.reason\)/);
    expect(card).toContain('busyRef.current');
    expect(client).toContain('voteInFlight');
  });

  it('логи [DAILY-POLL], немых catch нет', () => {
    expect(client).toContain("DAILY_POLL_LOG = '[DAILY-POLL]'");
    for (const src of [card, client]) {
      expect(src).not.toMatch(/catch\s*(\([^)]*\))?\s*\{\s*\}/);
      expect(src).not.toMatch(/\.catch\(\(\)\s*=>\s*\{\s*\}\)/);
    }
  });
});
