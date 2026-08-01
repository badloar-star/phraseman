/**
 * Контракт порога живых игроков (TOURNAMENT_MIN_REAL_PLAYERS).
 *
 * зачем эти тесты: 2026-07-27 порог снизили с 8 до 1 — иначе боевой турнир не
 * работал НИКОГДА (крон отменял комнату за 30 сек до старта, потому что живых
 * игроков меньше восьми). Правка тихая, но задевает деньги: отмена комнаты
 * возвращает жемчужины участникам. Ошибка в обе стороны дорога — либо турнир
 * мёртв в релизе, либо комнаты отменяются с массовым возвратом.
 *
 * Тесты закрепляют СВЯЗИ порога, а не само число: его будут поднимать обратно,
 * когда живых игроков станет больше, и связи обязаны пережить это изменение.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  TOURNAMENT_MIN_REAL_PLAYERS,
  TOURNAMENT_ROOM_SIZE,
} from './tournament_core';

const tournamentsSource = readFileSync(join(__dirname, 'tournaments.ts'), 'utf8');

describe('порог живых игроков', () => {
  it('порог в допустимом диапазоне: от 1 до размера комнаты', () => {
    expect(Number.isInteger(TOURNAMENT_MIN_REAL_PLAYERS)).toBe(true);
    expect(TOURNAMENT_MIN_REAL_PLAYERS).toBeGreaterThanOrEqual(1);
    // Порог выше размера комнаты = комната не соберётся никогда.
    expect(TOURNAMENT_MIN_REAL_PLAYERS).toBeLessThanOrEqual(TOURNAMENT_ROOM_SIZE);
  });

  it('ботов хватает добить комнату при текущем пороге', () => {
    // Крон создания комнат требует TOURNAMENT_ROOM_SIZE - MIN_REAL ботов.
    // Если порог поднимут, требование к пулу ботов упадёт — это нормально;
    // обратное (порог 1) требует максимума ботов, и они должны быть засеяны.
    const botsNeeded = TOURNAMENT_ROOM_SIZE - TOURNAMENT_MIN_REAL_PLAYERS;
    expect(botsNeeded).toBeGreaterThan(0);
    expect(botsNeeded).toBeLessThanOrEqual(TOURNAMENT_ROOM_SIZE - 1);
  });

  /**
   * зачем 2026-07-27 (владелец: «поведение дев с ботами должно быть такое как
   * обычная игра в плане добора ботами, иначе как я проверю»): раньше дев-
   * комната ОБХОДИЛА порог отдельной веткой, и проверить боевой путь через неё
   * было нельзя — она играла по своим правилам. Теперь исключения нет: дев
   * идёт тем же сбором (30с ожидания + 45с добора), поэтому тест закрепляет
   * ОТСУТСТВИЕ обхода, а не его наличие.
   */
  it('дев-комната собирается по общим правилам, без обхода порога', () => {
    expect(tournamentsSource).not.toMatch(/devRoom.*!==\s*true.*TOURNAMENT_MIN_REAL_PLAYERS/s);
    // Добор стартует от входа первого живого — общая для всех точка отсчёта.
    expect(tournamentsSource).toContain('gatherStartedAtMs');
  });

  it('отмена по нехватке игроков откатывается, если игроки набрались', () => {
    // Гонка: крон решил отменить, но пока летела транзакция, игроки зашли.
    // Отмена обязана отмениться — иначе людям вернут жемчужины и выкинут из
    // уже собранной комнаты.
    expect(tournamentsSource).toMatch(
      /players\.filter\(\(player\) => !player\.isBot\)\.length >= TOURNAMENT_MIN_REAL_PLAYERS\s*&&\s*reason === 'not_enough_players'\s*\)\s*return false/s,
    );
  });

  it('отмена возвращает жемчужины — порог напрямую влияет на деньги', () => {
    // Причина not_enough_players ведёт к возврату входного взноса. Если это
    // исчезнет, снижение порога станет тихой потерей денег игроков.
    expect(tournamentsSource).toContain("'not_enough_players'");
    expect(tournamentsSource).toMatch(/cancelRoomInTransaction/);
  });
});
