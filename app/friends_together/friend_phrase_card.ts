/**
 * «Фраза дня вдвоём» (идея 8, docs/design/v2-app/friends-full.html #phrase) — что показывает карточка вкладки «Друзья».
 *
 * зачем (макет; закон владельца «телефон решает и выдаёт сразу, сервер только хранит записи»): вопрос — квест фразы дня
 * (те же три варианта, что на Главной). Ответы друзей закрыты, пока не ответишь сам — подсмотреть нельзя: до ответа видно
 * только, кто уже ответил. После ответа у каждого варианта — монеты друзей, выбравших его, и короткое «почему».
 * Чистые функции: без хранилища, сети и React — их проверяет tests/friend_phrase_card.test.ts.
 */
import type { DailyPhraseQuestOption } from '../daily_phrase_quest';
import { friendPhraseAnswerFor, type FriendPhraseAnswer } from './friend_phrase';
import type { FriendTogetherPairState } from './together_store';

export type FriendPhraseFriend = Readonly<{ uid: string; name: string; coinRank: number | null; isPlus: boolean }>;

export type FriendPhraseOptionView = Readonly<{
  id: string;
  text: string;
  correct: boolean;
  /** Мой выбор. */
  mine: boolean;
  /** Друзья, выбравшие вариант; до моего ответа всегда пусто. */
  friends: readonly FriendPhraseFriend[];
  /** Значок после ответа: right — верный вариант, wrong — неверный, который выбрал я или друг; null — без значка. */
  mark: 'right' | 'wrong' | null;
}>;

export type FriendPhraseCardView = Readonly<{
  /** ask — ещё не ответил; done — ответил здесь или в квесте Главной. */
  state: 'ask' | 'done';
  options: readonly FriendPhraseOptionView[];
  /** Друзья, сегодня ответившие на ту же фразу (до моего ответа — без их выбора). */
  answered: readonly FriendPhraseFriend[];
  /** Сколько из них ошиблись — строка «Можно дать пять за попытку». */
  wrongFriends: number;
  /** false — ответ дан на Главной: выбор неизвестен, варианты показываем без «моего». */
  myPickKnown: boolean;
}>;

export type FriendPhraseCardInput = Readonly<{
  phraseId: string;
  todayKey: string;
  options: readonly DailyPhraseQuestOption[];
  mine: FriendPhraseAnswer | null;
  /** Квест этой фразы уже отвечен на Главной (метка daily_phrase_quest_answered_v1). */
  answeredElsewhere: boolean;
  friends: readonly FriendPhraseFriend[];
  pairs: Readonly<Record<string, FriendTogetherPairState | undefined>>;
}>;

/** Куда поставить ответ: свой id варианта, иначе верный по флагу; неузнанный неверный — никуда. */
function optionFor(answer: FriendPhraseAnswer, optionIds: ReadonlySet<string>, correctId: string | null): string | null {
  if (optionIds.has(answer.optionId)) return answer.optionId;
  // зачем: ложные варианты квеста зависят от языка интерфейса — у друга с другим языком id ловушки может не совпасть.
  // Верный узнаётся всегда (флаг correct), а чужую ловушку на свой вариант не ставим — это было бы неправдой.
  return answer.correct ? correctId : null;
}

export function buildFriendPhraseCard(input: FriendPhraseCardInput): FriendPhraseCardView {
  const mine = friendPhraseAnswerFor(input.mine, input.todayKey, input.phraseId);
  const done = mine !== null || input.answeredElsewhere;
  const optionIds = new Set(input.options.map((option) => option.id));
  const correctId = input.options.find((option) => option.correct)?.id ?? null;
  const mineAt = mine ? optionFor(mine, optionIds, correctId) : null;

  const answered: FriendPhraseFriend[] = [];
  const byOption = new Map<string, readonly FriendPhraseFriend[]>();
  let wrongFriends = 0;
  for (const friend of input.friends) {
    const answer = friendPhraseAnswerFor(input.pairs[friend.uid]?.phrase ?? null, input.todayKey, input.phraseId);
    if (!answer) continue;
    answered.push(friend);
    if (!answer.correct) wrongFriends += 1;
    const at = optionFor(answer, optionIds, correctId);
    if (at) byOption.set(at, [...(byOption.get(at) ?? []), friend]);
  }

  const options = input.options.map((option): FriendPhraseOptionView => {
    const friends = done ? byOption.get(option.id) ?? [] : [];
    const isMine = mineAt === option.id;
    const mark = !done ? null : option.correct ? 'right' : isMine || friends.length > 0 ? 'wrong' : null;
    return { id: option.id, text: option.text, correct: option.correct, mine: isMine, friends, mark };
  });
  return { state: done ? 'done' : 'ask', options, answered, wrongFriends, myPickKnown: mineAt !== null };
}

/**
 * «Почему» после ответа: разбор выбранного варианта (у квестов es / fr / de он есть), иначе разбор верного,
 * иначе дословный перевод фразы — то же, что Главная открывает после ответа. До ответа — ничего.
 */
export function friendPhraseWhy(
  view: FriendPhraseCardView,
  options: readonly DailyPhraseQuestOption[],
  literal: string,
): Readonly<{ kind: 'feedback' | 'literal'; text: string }> | null {
  if (view.state !== 'done') return null;
  const pickId = view.options.find((option) => option.mine)?.id ?? null;
  const pick = options.find((option) => option.id === pickId) ?? options.find((option) => option.correct) ?? null;
  const feedback = pick?.feedback?.trim();
  if (feedback) return { kind: 'feedback', text: feedback };
  const text = literal.trim();
  return text ? { kind: 'literal', text } : null;
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
