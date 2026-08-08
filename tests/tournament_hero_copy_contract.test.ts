/**
 * Контракт текстов hero экрана турниров (владелец 2026-07-27).
 *
 * зачем: пока окно идёт, на месте таймера обязан стоять статус («что-то
 * эпичное», формулировка владельца), а не мёртвый «00:00». Тест держит
 * главное: в каком состоянии показываются цифры, а в каком — событие.
 */

import { resolveTournamentHeroCopy } from '../app/tournament_hero_copy';

const base = {
  live: false,
  roundNo: 1,
  playersInRoom: 0,
  entryGems: 3,
  secondsToShow: 0,
  secondsToWindowEnd: 0,
};

describe('hero: окно идёт', () => {
  const copy = resolveTournamentHeroCopy({
    ...base,
    phase: 'open',
    secondsToWindowEnd: 12 * 60,
  });

  it('вместо таймера — статус, а не нули', () => {
    expect(copy.value).not.toMatch(/00:00/);
    expect(copy.value).toBe('ВХОД ОТКРЫТ');
  });

  it('статус подан акцентом и пульсом «в эфире»', () => {
    expect(copy.tone).toBe('live');
    expect(copy.pulsing).toBe(true);
  });

  it('видно, сколько осталось до закрытия входа', () => {
    expect(copy.sub).toContain('12 мин');
  });
});

describe('hero: до открытия окна', () => {
  const copy = resolveTournamentHeroCopy({
    ...base,
    phase: 'countdown',
    secondsToShow: 5 * 60,
    nextSlotDisplayTime: '15:20',
  });

  it('крупные цифры отсчёта', () => {
    expect(copy.big).toBe(true);
    expect(copy.value).toBe('05:00');
  });

  it('в шапке — время ближайшей арены', () => {
    expect(copy.kicker).toContain('15:20');
  });
});

describe('hero: уже отыграл в этом окне', () => {
  const copy = resolveTournamentHeroCopy({
    ...base,
    phase: 'played',
    secondsToShow: 90 * 60,
  });

  it('таймер целится в следующее окно, а не застревает', () => {
    expect(copy.big).toBe(true);
    expect(copy.value).toBe('1:30:00');
  });

  it('честно сказано, что этот турнир отыгран', () => {
    expect(copy.kicker).toBe('Этот турнир отыгран');
    expect(copy.pulsing).toBe(false);
  });
});

describe('hero: я в турнире прямо сейчас', () => {
  it('прогресс раунда важнее статуса окна', () => {
    const copy = resolveTournamentHeroCopy({
      ...base,
      phase: 'open',
      live: true,
      roundNo: 3,
      playersInRoom: 16,
    });
    expect(copy.value).toBe('Раунд 3 из 4');
    expect(copy.sub).toContain('банк комнаты 48');
  });
});

describe('hero: режим «активно весь день» (владелец 2026-08-04)', () => {
  /**
   * зачем: «если в админке включено весь день турниры, должно показывать не
   * "сейчас турниров нет", а "турниры весь день"». Тон — как у открытого
   * окна (событие, а не служебный статус): вход живой ровно так же.
   */
  it('говорит «весь день», а не «турниров нет»', () => {
    const copy = resolveTournamentHeroCopy({ ...base, phase: 'all_day' });
    expect(copy.value).toBe('ВЕСЬ ДЕНЬ');
    expect(copy.value).not.toBe('Сейчас турниров нет');
    expect(copy.tone).toBe('live');
    expect(copy.pulsing).toBe(true);
  });

  it('без таймера — цифр отсчёта тут не бывает', () => {
    const copy = resolveTournamentHeroCopy({ ...base, phase: 'all_day' });
    expect(copy.big).toBe(false);
    expect(copy.value).not.toMatch(/^\d/);
  });
});

describe('hero: расписания ещё нет', () => {
  /**
   * зачем 2026-08-03 (владелец, релизное решение): турниры ТОЛЬКО по
   * расписанию из админки. Прежнее «ИГРАЙТЕ СЕЙЧАС» (мгновенные комнаты вне
   * окна, решение 2026-07-27) отменено — без расписания экран честно говорит,
   * что турниров нет, и не зовёт в мёртвое действие.
   */
  it('честно говорит, что турниров нет, и не зовёт играть', () => {
    const copy = resolveTournamentHeroCopy({ ...base, phase: 'idle' });
    expect(copy.value).toBe('Сейчас турниров нет');
    expect(copy.value).not.toMatch(/Скоро/);
    expect(copy.sub.length).toBeGreaterThan(0);
    expect(copy.pulsing).toBe(false);
    expect(copy.tone).toBe('idle');
  });
});
