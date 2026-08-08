/**
 * Контракт окна турниров (решение владельца 2026-07-27).
 *
 * зачем: экран показывал мёртвый «00:00» всё время, пока идёт окно слота —
 * таймер досчитывал до нуля и застревал. Правило владельца:
 * окно идёт → таймер пропадает; окно кончилось → таймер возвращается;
 * уже отыграл → отсчёт до следующего окна.
 */

import {
  FALLBACK_ENTRY_WINDOW_MS,
  resolveTournamentWindowState,
} from '../app/tournament_window_state';

const MIN = 60 * 1000;
const NOON = 12 * 60 * MIN;
const EVENING = 19 * 60 * MIN;
const WINDOW = FALLBACK_ENTRY_WINDOW_MS;

const starts = [NOON, EVENING];

describe('окно турниров: до старта', () => {
  it('идёт обычный отсчёт до ближайшего окна', () => {
    const state = resolveTournamentWindowState({ windowStartsMs: starts, nowMs: NOON - 10 * MIN });
    expect(state.phase).toBe('countdown');
    expect(state.secondsToShow).toBe(10 * 60);
  });
});

describe('окно турниров: окно идёт', () => {
  it('таймер ПРОПАДАЕТ — вместо него статус окна', () => {
    const state = resolveTournamentWindowState({ windowStartsMs: starts, nowMs: NOON + 5 * MIN });
    expect(state.phase).toBe('open');
    expect(state.secondsToShow).toBe(0);
  });

  it('видно, сколько осталось до конца окна', () => {
    const state = resolveTournamentWindowState({ windowStartsMs: starts, nowMs: NOON + 10 * MIN });
    expect(state.secondsToWindowEnd).toBe(20 * 60);
  });

  it('вход живой до ПОСЛЕДНЕЙ секунды окна', () => {
    const state = resolveTournamentWindowState({
      windowStartsMs: starts,
      nowMs: NOON + WINDOW - 1000,
    });
    expect(state.phase).toBe('open');
    expect(state.secondsToWindowEnd).toBe(1);
  });
});

describe('окно турниров: окно закончилось', () => {
  it('таймер ВОЗВРАЩАЕТСЯ и считает до следующего окна', () => {
    const state = resolveTournamentWindowState({ windowStartsMs: starts, nowMs: NOON + WINDOW });
    expect(state.phase).toBe('countdown');
    expect(state.secondsToShow).toBe((EVENING - NOON - WINDOW) / 1000);
  });
});

describe('окно турниров: я уже отыграл', () => {
  it('сразу отсчёт до СЛЕДУЮЩЕГО окна, а не мёртвый ноль', () => {
    const state = resolveTournamentWindowState({
      windowStartsMs: starts,
      nowMs: NOON + 5 * MIN,
      playedWindowStartMs: NOON,
    });
    expect(state.phase).toBe('played');
    expect(state.secondsToShow).toBe((EVENING - NOON - 5 * MIN) / 1000);
  });

  it('отыгранное ПРОШЛОЕ окно не мешает играть в новом', () => {
    // Играл в полдень — вечернее окно должно быть открыто.
    const state = resolveTournamentWindowState({
      windowStartsMs: starts,
      nowMs: EVENING + MIN,
      playedWindowStartMs: NOON,
    });
    expect(state.phase).toBe('open');
  });
});

describe('окно турниров: режим «активно весь день» (владелец 2026-08-04)', () => {
  it('allDayEnabled даёт фазу all_day без таймера и без окна', () => {
    const state = resolveTournamentWindowState({
      windowStartsMs: starts,
      nowMs: NOON,
      allDayEnabled: true,
    });
    expect(state.phase).toBe('all_day');
    expect(state.secondsToShow).toBe(0);
    expect(state.secondsToWindowEnd).toBe(0);
    expect(state.activeWindowStartMs).toBe(0);
  });

  it('all_day побеждает даже пустое расписание — не idle', () => {
    const state = resolveTournamentWindowState({ windowStartsMs: [], nowMs: NOON, allDayEnabled: true });
    expect(state.phase).toBe('all_day');
  });

  it('playedWindowStartMs не переводит all_day в played — лимита «раз в окно» нет', () => {
    const state = resolveTournamentWindowState({
      windowStartsMs: starts,
      nowMs: NOON,
      playedWindowStartMs: NOON,
      allDayEnabled: true,
    });
    expect(state.phase).toBe('all_day');
  });

  it('выключили режим — расписание считается как обычно', () => {
    const state = resolveTournamentWindowState({
      windowStartsMs: starts,
      nowMs: NOON + 5 * MIN,
      allDayEnabled: false,
    });
    expect(state.phase).toBe('open');
  });
});

describe('окно турниров: крайние случаи', () => {
  it('пустое расписание не ломает экран', () => {
    const state = resolveTournamentWindowState({ windowStartsMs: [], nowMs: NOON });
    expect(state.phase).toBe('idle');
    expect(state.secondsToShow).toBe(0);
  });

  it('длина окна берётся с сервера, а не из клиентской копии', () => {
    const state = resolveTournamentWindowState({
      windowStartsMs: starts,
      nowMs: NOON + 40 * MIN,
      entryWindowMs: 45 * MIN,
    });
    expect(state.phase).toBe('open');
  });

  it('последнее окно дня: отыграл, следующего нет — не падаем', () => {
    const state = resolveTournamentWindowState({
      windowStartsMs: [EVENING],
      nowMs: EVENING + 5 * MIN,
      playedWindowStartMs: EVENING,
    });
    expect(state.phase).toBe('played');
    expect(state.secondsToShow).toBe((WINDOW - 5 * MIN) / 1000);
  });
});
