/**
 * «Фраза дня вдвоём» (идея 8, docs/design/v2-app/friends-full.html #phrase) — мой ответ на фразу дня, записанный телефоном.
 *
 * зачем (закон владельца «телефон решает и выдаёт сразу, сервер только хранит записи, чтобы друг их забрал»; координатор 22.10):
 * верность ответа решает телефон (варианты фразы дня — локальный контент), ответ сразу виден и сохраняется в хранилище; запись
 * friends_phrase_v1 едет в users/{uid}.progress тем же склеенным патчем синхронизации, а друзья получают её тем же friendsGetProfiles
 * (чтение users/{uid} уже есть) — 0 новых чтений, без транзакции голоса. Здесь — только чистая запись и строгий разбор чужой.
 */

export const FRIEND_PHRASE_STORAGE_KEY = 'friends_phrase_v1';

export type FriendPhraseAnswer = Readonly<{
  v: 1;
  /** Местный день ответа, YYYY-MM-DD. */
  day: string;
  /** id фразы дня (тот же у друзей с тем же языком изучения). */
  phraseId: string;
  /** Выбранный вариант: id варианта квеста фразы дня. */
  optionId: string;
  correct: boolean;
}>;

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const TOKEN = /^[A-Za-z0-9_.:-]{1,80}$/;

/** Строгий разбор (своя запись из хранилища или чужая из профиля друга — недоверенная). */
export function parseFriendPhraseAnswer(raw: unknown): FriendPhraseAnswer | null {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    if (!raw.trim()) return null;
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const r = value as Record<string, unknown>;
  if (r.v !== 1 || typeof r.correct !== 'boolean') return null;
  if (typeof r.day !== 'string' || !DAY_KEY.test(r.day)) return null;
  if (typeof r.phraseId !== 'string' || !TOKEN.test(r.phraseId)) return null;
  if (typeof r.optionId !== 'string' || !TOKEN.test(r.optionId)) return null;
  return { v: 1, day: r.day, phraseId: r.phraseId, optionId: r.optionId, correct: r.correct };
}

/** Ответ друга на ТУ ЖЕ фразу сегодня — иначе null (вчерашние ответы в полночь исчезают, макет). */
export function friendPhraseAnswerFor(answer: FriendPhraseAnswer | null, todayKey: string, phraseId: string): FriendPhraseAnswer | null {
  return answer && answer.day === todayKey && answer.phraseId === phraseId ? answer : null;
}

export function serializeFriendPhraseAnswer(answer: FriendPhraseAnswer): string {
  return JSON.stringify({ v: 1, day: answer.day, phraseId: answer.phraseId, optionId: answer.optionId, correct: answer.correct });
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
