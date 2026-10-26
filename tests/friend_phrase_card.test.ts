// зачем (идея 8 «Фраза дня вдвоём», макет friends-full.html #phrase; закон владельца «телефон решает»): ответы друзей закрыты
// до моего ответа — подсмотреть нельзя; после — у варианта монеты выбравших его друзей. Чужая ловушка с другим id (другой язык
// интерфейса) на мой вариант не ставится. Карточка встаёт на место «Опроса дня» только за выключателем «Вместе».
import * as fs from 'fs';
import * as path from 'path';
import { normalizeEol } from './helpers/read_source';
import { buildFriendPhraseCard, friendPhraseWhy, type FriendPhraseFriend } from '../app/friends_together/friend_phrase_card';
import { phraseAnsweredLine, phraseQuestion } from '../app/friends_together/friend_phrase_copy';

const DAY = '2026-10-22';
const PHRASE = 'local-42';
const CORRECT = `correct:${PHRASE}`;
const OPTIONS = [
  { id: 'distractor:7', text: 'Опоздать', correct: false },
  { id: CORRECT, text: 'Начать разговор', correct: true },
  { id: 'distractor:9', text: 'Замёрзнуть', correct: false },
];
const friend = (uid: string, name: string): FriendPhraseFriend => ({ uid, name, coinRank: null, isPlus: false });
const FRIENDS = [friend('ira', 'Ирина'), friend('mark', 'Марк'), friend('oleg', 'Олег'), friend('lida', 'Лида'), friend('none', 'Ник')];
const answer = (optionId: string, correct: boolean, day = DAY, phraseId = PHRASE) => ({ v: 1 as const, day, phraseId, optionId, correct });
const PAIRS = {
  ira: { phrase: answer(CORRECT, true) },
  mark: { phrase: answer('distractor:7', false) },
  oleg: { phrase: answer('distractor:99', false) }, // ловушка другого языка интерфейса — id у меня нет
  lida: { phrase: answer(CORRECT, true, '2026-10-21') }, // вчерашний ответ в полночь исчез
  none: { phrase: null },
} as never;
const base = { phraseId: PHRASE, todayKey: DAY, options: OPTIONS, mine: null, answeredElsewhere: false, friends: FRIENDS, pairs: PAIRS };

describe('«Фраза дня вдвоём»: карточка', () => {
  it('до ответа: видно, кто ответил сегодня, но не их выбор', () => {
    const view = buildFriendPhraseCard(base);
    expect(view.state).toBe('ask');
    expect(view.answered.map((f) => f.uid)).toEqual(['ira', 'mark', 'oleg']);
    expect(view.options.every((o) => o.friends.length === 0 && o.mark === null && !o.mine)).toBe(true);
  });

  it('после верного ответа: монеты на выбранных вариантах, неузнанная ловушка не ставится, ошибившиеся посчитаны', () => {
    const view = buildFriendPhraseCard({ ...base, mine: answer(CORRECT, true) });
    expect(view.state).toBe('done');
    const [trap7, right, trap9] = view.options;
    expect(right).toMatchObject({ mine: true, mark: 'right' });
    expect(right!.friends.map((f) => f.uid)).toEqual(['ira']);
    expect(trap7).toMatchObject({ mine: false, mark: 'wrong' });
    expect(trap7!.friends.map((f) => f.uid)).toEqual(['mark']);
    expect(trap9).toMatchObject({ mark: null, friends: [] });
    expect(view.wrongFriends).toBe(2);
    expect(view.myPickKnown).toBe(true);
  });

  it('мой неверный ответ отмечен своим тоном и крестом, верный — галочкой', () => {
    const view = buildFriendPhraseCard({ ...base, mine: answer('distractor:9', false) });
    expect(view.options[2]).toMatchObject({ mine: true, mark: 'wrong' });
    expect(view.options[1]).toMatchObject({ mine: false, mark: 'right' });
  });

  it('ответ на Главной закрывает вопрос и здесь — без «моего» варианта; вчерашний свой ответ не считается', () => {
    const elsewhere = buildFriendPhraseCard({ ...base, answeredElsewhere: true });
    expect(elsewhere.state).toBe('done');
    expect(elsewhere.myPickKnown).toBe(false);
    expect(elsewhere.options.some((o) => o.mine)).toBe(false);
    expect(buildFriendPhraseCard({ ...base, mine: answer(CORRECT, true, '2026-10-21') }).state).toBe('ask');
  });

  it('«почему»: разбор выбранного, иначе разбор верного, иначе дословно; до ответа — ничего', () => {
    const withFeedback = OPTIONS.map((o) => ({ ...o, feedback: o.correct ? 'Так говорят, когда разряжают обстановку' : 'Это про время' }));
    const mineWrong = buildFriendPhraseCard({ ...base, options: withFeedback, mine: answer('distractor:7', false) });
    expect(friendPhraseWhy(mineWrong, withFeedback, 'сломать лёд')).toEqual({ kind: 'feedback', text: 'Это про время' });
    const elsewhere = buildFriendPhraseCard({ ...base, options: withFeedback, answeredElsewhere: true });
    expect(friendPhraseWhy(elsewhere, withFeedback, 'сломать лёд')).toEqual({ kind: 'feedback', text: 'Так говорят, когда разряжают обстановку' });
    const plain = buildFriendPhraseCard({ ...base, mine: answer(CORRECT, true) });
    expect(friendPhraseWhy(plain, OPTIONS, ' сломать лёд ')).toEqual({ kind: 'literal', text: 'сломать лёд' });
    expect(friendPhraseWhy(buildFriendPhraseCard(base), OPTIONS, 'сломать лёд')).toBeNull();
  });

  it('строки: вопрос с кавычками языка; «кто ответил» — имя перед двоеточием, число не склоняется', () => {
    expect(phraseQuestion('ru', 'Break the ice')).toBe('Что значит «Break the ice»?');
    expect(phraseQuestion('en', 'Break the ice')).toBe('What does “Break the ice” mean?');
    expect(phraseQuestion('pl', 'Break the ice')).toBe('Co znaczy „Break the ice”?');
    expect(phraseAnsweredLine('ru', [])).toBeNull();
    expect(phraseAnsweredLine('ru', ['Ирина'])).toBe('Ирина: ответ откроется после твоего');
    expect(phraseAnsweredLine('ru', ['Ирина', 'Марк', 'Олег'])).toBe('Уже ответили: 3 · ответы откроются после твоего');
  });
});

describe('«Фраза дня вдвоём»: исходники', () => {
  const read = (...p: string[]) => normalizeEol(fs.readFileSync(path.resolve(__dirname, '..', ...p), 'utf8'));
  const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

  it('владелец 26.10: фраза на Главной с монетами друзей; во «Друзьях» остаётся опрос', () => {
    const tab = read('app', '(tabs)', 'friends.tsx');
    expect(tab).not.toContain('<FriendPhraseCard');
    expect(tab).toContain('const firstCard = dailyPollCard;');
    expect(tab).toContain('ListHeaderComponent={<>{firstCard}');
    const home = read('components', 'DailyPhraseCard.tsx');
    expect(home).toContain('<DailyPhraseFriendsRow');
    expect(home).toContain('recordMyPhraseAnswer({ phraseId, optionId, correct })');
  });

  it('ответ: сразу на экране, запись на телефоне с откатом, защита от двойного тапа, метка квеста Главной', () => {
    const card = code(read('components', 'friends_together', 'FriendPhraseCard.tsx'));
    expect(card).toContain('busyRef.current || view.state === \'done\'');
    expect(card).toMatch(/setMine\(\{ v: 1, day: todayKey[\s\S]*?recordMyPhraseAnswer\(/);
    expect(card).toContain('setMine(before)');
    expect(card).toContain('setFailed(true)');
    expect(card).toContain('markDailyPhraseQuestAnswered(');
    expect(card).toContain('InteractionManager.runAfterInteractions');
    expect(card).toContain('withHaptic={false}');
    // цвета — только роли темы, без обводок
    expect(card.match(/(['"`])#(?:[0-9A-Fa-f]{3,8})\1|rgba?\(\s*\d/g) ?? []).toEqual([]);
    expect(card).not.toMatch(/borderWidth|borderColor/);
  });

  it('логика карточки чистая: без хранилища и сети', () => {
    const logic = code(read('app', 'friends_together', 'friend_phrase_card.ts'));
    expect(logic).not.toMatch(/AsyncStorage|firebase|syncToCloud|fetch\(/);
  });
});
