/**
 * Режим «Говорить» раздела «Карточки» (владелец, 2026-08-17): чистая логика
 * очереди сессии — зачёт идёт дальше, промах уходит в конец очереди (кэп
 * повторов общий с разделом), пропуск без попытки — честная ошибка.
 */
import type { DeckCard } from '../app/flashcards/deck_sources';
import { MAX_MISTAKE_REPEATS } from '../app/flashcards/session_queue';
import {
  advanceSpeaking,
  beginSpeakingAttempt,
  cancelSpeakingAttempt,
  currentSpeakingCard,
  initialSpeakingState,
  parseSpeakingPrefs,
  scoreSpeakingAttempt,
  speakingProgress,
  speakingRetryCards,
  summarizeSpeaking,
} from '../app/flashcards/speaking_session_logic';

const card = (id: string): DeckCard => ({ id, en: `phrase ${id}`, translation: `перевод ${id}`, ru: `перевод ${id}` });
const cards = [card('a'), card('b'), card('c')];

describe('speaking session logic', () => {
  it('пустая подборка сразу завершена, текущей карточки нет', () => {
    const s = initialSpeakingState([]);
    expect(s.finished).toBe(true);
    expect(currentSpeakingCard(s)).toBeNull();
  });

  it('зачёт с первой попытки: событие «верно», следующая карточка, повторов нет', () => {
    let s = initialSpeakingState(cards);
    expect(currentSpeakingCard(s)?.id).toBe('a');
    s = beginSpeakingAttempt(s);
    expect(s.phase).toBe('live');
    s = scoreSpeakingAttempt(s, { score: 92, passed: true });
    expect(s.phase).toBe('scored');
    expect(s.events).toEqual([{ key: 'a', correct: true }]);
    s = advanceSpeaking(s);
    expect(currentSpeakingCard(s)?.id).toBe('b');
    expect(s.queue).toHaveLength(3);
    expect(speakingProgress(s)).toEqual({ position: 2, total: 3 });
  });

  it('промах: карточка уходит в конец очереди, максимум MAX_MISTAKE_REPEATS раз', () => {
    let s = initialSpeakingState([card('a'), card('b')]);
    for (let round = 0; round < MAX_MISTAKE_REPEATS + 2; round += 1) {
      s = scoreSpeakingAttempt(beginSpeakingAttempt(s), { score: 20, passed: false });
      s = advanceSpeaking(s);
      // «b» проходим сразу, чтобы дойти до повтора «a»
      if (currentSpeakingCard(s)?.id === 'b') {
        s = advanceSpeaking(scoreSpeakingAttempt(beginSpeakingAttempt(s), { score: 95, passed: true }));
      }
    }
    // a + b + два повтора a = 4 позиции; дальше повторов нет — сессия закончилась
    expect(s.queue.map((c) => c.id)).toEqual(['a', 'b', 'a', 'a']);
    expect(s.finished).toBe(true);
    const summary = summarizeSpeaking(s);
    expect(summary.wrong).toBe(3);
    expect(summary.correct).toBe(1);
    expect(summary.learnKeys).toEqual(['a']);
  });

  it('оценка вне фазы live игнорируется (поздний ответ панели не портит состояние)', () => {
    const s = initialSpeakingState(cards);
    expect(scoreSpeakingAttempt(s, { score: 99, passed: true })).toBe(s);
  });

  it('срыв записи возвращает в idle без события', () => {
    let s = beginSpeakingAttempt(initialSpeakingState(cards));
    s = cancelSpeakingAttempt(s);
    expect(s.phase).toBe('idle');
    expect(s.events).toEqual([]);
  });

  it('пропуск без попытки — ошибка в журнале и повтор в конце; после промаха «Дальше» второй раз не пишет', () => {
    let s = initialSpeakingState(cards);
    s = advanceSpeaking(s, { skip: true });
    expect(s.events).toEqual([{ key: 'a', correct: false }]);
    expect(s.queue.map((c) => c.id)).toEqual(['a', 'b', 'c', 'a']);
    // промах уже записан scoreSpeakingAttempt — advance не дублирует
    s = scoreSpeakingAttempt(beginSpeakingAttempt(s), { score: 10, passed: false });
    s = advanceSpeaking(s);
    expect(s.events).toHaveLength(2);
  });

  it('«Добить» собирает только несданные карточки, по одному разу, в порядке появления', () => {
    let s = initialSpeakingState(cards);
    s = advanceSpeaking(scoreSpeakingAttempt(beginSpeakingAttempt(s), { score: 30, passed: false })); // a ✗
    s = advanceSpeaking(scoreSpeakingAttempt(beginSpeakingAttempt(s), { score: 95, passed: true })); // b ✓
    s = advanceSpeaking(s, { skip: true }); // c пропуск
    expect(speakingRetryCards(s).map((c) => c.id)).toEqual(['a', 'c']);
  });

  it('удержание в фазе live не начинает вторую попытку', () => {
    const s = beginSpeakingAttempt(initialSpeakingState(cards));
    expect(beginSpeakingAttempt(s)).toBe(s);
  });
});

describe('fc_speaking_prefs_v1', () => {
  it('дефолт — «Скажи по-английски»; мусор и чужие поля не ломают чтение', () => {
    expect(parseSpeakingPrefs(null)).toEqual({ task: 'recall' });
    expect(parseSpeakingPrefs('{bad json')).toEqual({ task: 'recall' });
    expect(parseSpeakingPrefs(JSON.stringify({ task: 'nope' }))).toEqual({ task: 'recall' });
    expect(parseSpeakingPrefs(JSON.stringify({ task: 'repeat', future: 1 }))).toEqual({ task: 'repeat' });
  });
});
