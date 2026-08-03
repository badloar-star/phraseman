// ════════════════════════════════════════════════════════════════════════════
// tournament_table_no_fake_zeros_contract.test.ts — таблица не врёт нулями.
//
// зачем 2026-08-03 (владелец): «когда мы на турнирной таблице, мы видим сначала
// нули, а я сказал показывать актуальную инфу вместо нулей всегда мгновенно,
// то есть всё обновляется в фоне, и первый, кто дошёл до таблицы, должен видеть
// вообще всё настоящее актуальное состояние».
//
// Суть проблемы: пока комната не вышла из round{N}, сервер ещё не применил
// чужие результаты и score у остальных игроков РЕАЛЬНО равен нулю. Рисовать
// этот ноль — врать: у человека не «ноль звёзд», его результат просто не
// досчитан. Ноль неотличим от честного результата и обесценивает таблицу.
//
// Экран в jest не поднимается (reanimated/expo-router), поэтому тест читает
// исходник и фиксирует контракт — тот же приём, что в других контрактах турнира.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

import { hasTournamentTableSettledScores } from '../app/tournament_client';

const TABLE_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'tournament_table.tsx'),
  'utf8',
);

describe('признак «результаты досчитаны»', () => {
  test('пока комната в том же раунде — результаты НЕ считаются финальными', () => {
    expect(hasTournamentTableSettledScores('round2', 2)).toBe(false);
  });

  test('комната ушла дальше раунда — результаты финальные', () => {
    expect(hasTournamentTableSettledScores('table2', 2)).toBe(true);
    expect(hasTournamentTableSettledScores('round3', 2)).toBe(true);
    expect(hasTournamentTableSettledScores('results', 2)).toBe(true);
  });

  test('без указания завершённого раунда таблица показывает данные как есть', () => {
    // Зритель и прямой вход по ссылке: скрывать нечего, раунд не наш.
    expect(hasTournamentTableSettledScores('round2', null)).toBe(true);
  });
});

describe('строка таблицы', () => {
  test('чужой недосчитанный результат показывается тире, а не нулём', () => {
    expect(TABLE_SOURCE).toContain("{scoresSettled || row.isYou ? row.score : '—'}");
  });

  test('свой результат виден ВСЕГДА — он посчитан локально в раунде', () => {
    // Игрок только что играл: прятать от него собственные звёзды нельзя.
    expect(TABLE_SOURCE).toMatch(/scoresSettled \|\| row\.isYou/);
  });

  test('полоса-рейтинг не изображает нулевой рейтинг вместе с цифрой', () => {
    // Иначе цифра честная («—»), а длина полосы всё равно врёт.
    const fill = TABLE_SOURCE.slice(
      TABLE_SOURCE.indexOf('const fillRatio'),
      TABLE_SOURCE.indexOf('const fillRatio') + 260,
    );
    expect(fill).toContain('scoresSettled || row.isYou');
  });

  test('тире подаётся приглушённым тоном, а не как обычный счёт', () => {
    expect(TABLE_SOURCE).toContain('scorePending');
    expect(TABLE_SOURCE).toMatch(/scorePending: \{ color: P\.ghost \}/);
  });

  test('признак досчёта передаётся в каждую строку', () => {
    expect(TABLE_SOURCE).toContain('scoresSettled={scoresSettled}');
  });
});

describe('актуальность данных без перезагрузки', () => {
  test('таблица живёт на подписке комнаты, а не на разовом запросе', () => {
    // «Всё обновляется в фоне»: как только сервер досчитал раунд, тире
    // сменяются реальными числами без действий игрока.
    expect(TABLE_SOURCE).toContain('useTournamentRoom');
  });

  test('первый кадр берётся из кэша комнаты, а не из пустого состояния', () => {
    // «Первый, кто дошёл до таблицы, должен видеть настоящее состояние».
    const client = fs.readFileSync(
      path.join(__dirname, '..', 'app', 'tournament_client.ts'),
      'utf8',
    );
    expect(client).toContain('const initialRoom = roomId ? roomCache.get(roomId) ?? null : null');
  });

  test('строки не прячутся за спиннером ожидания', () => {
    // Layout stability: список рисуется сразу, меняются только значения.
    expect(TABLE_SOURCE).not.toContain('ActivityIndicator');
  });
});
