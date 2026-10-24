/**
 * «Урок вместе» (идея 2, макет friends-full.html «Друг прошёл» — ряд «Занятие вместе» в финале у друга): последнее начисление
 * +2 «вместе» в этом запуске — для финала занятия, который уже на экране.
 *
 * зачем (координатор 22.10): +2 начисляет телефон сразу после засчитывания занятия (lesson_together_claim.ts) — финал этого
 * занятия узнаёт об этом здесь, без сети и без хранилища: ряд появляется, как только начисление легло в кошелёк.
 */

export type TogetherCredit = Readonly<{
  /** id занятия засчитывания (тот же, что lessonKey финала). */
  sessionId: string;
  inviterUid: string;
  inviterName: string;
  coins: number;
  atMs: number;
}>;

type Listener = (credit: TogetherCredit) => void;

let last: TogetherCredit | null = null;
const listeners = new Set<Listener>();

export function noteTogetherCredit(credit: TogetherCredit): void {
  last = credit;
  console.log(`[FRIENDS-2] moment:credit session=${credit.sessionId} coins=${credit.coins} listeners=${listeners.size}`); // guard-ok: одна строка на начисление
  for (const listener of listeners) listener(credit);
}

/** Начисление для этого занятия, если уже было (финал открылся позже начисления). */
export function peekTogetherCredit(sessionId: string): TogetherCredit | null {
  return last && last.sessionId === sessionId ? last : null;
}

export function subscribeTogetherCredit(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); }; // guard-ok: снятие подписчика из памяти (Set), не запись данных
}

export function __resetTogetherCreditForTests(): void {
  last = null;
  listeners.clear();
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
