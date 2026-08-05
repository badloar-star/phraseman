// ════════════════════════════════════════════════════════════════════════════
// tournament_table_no_fake_zeros_contract.test.ts — таблица не врёт нулями.
//
// зачем 2026-08-04 (владелец): «таблица между раундами первые 3 секунды
// показывает 0, а я хочу живое количество сразу — обновление добавляет
// результат последней игры раунда каждого, чтобы нулей не было никогда».
//
// Раньше экран прятал чужой score за тире, пока комната не выходила из
// round{N} (округление «результаты ещё не досчитаны»). Проверка сервера
// (tournament_core.ts) показала: score каждого игрока пишется в документ
// комнаты СРАЗУ по мере его ответов, а не одним пакетом в конце раунда —
// значит то, что клиент прятал за тире, было уже настоящим текущим числом.
// Владелец подтвердил: показывать его сразу, без искусственной задержки.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

const TABLE_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'tournament_table.tsx'),
  'utf8',
);

describe('строка таблицы', () => {
  test('счёт показывается всегда как реальное число, без тире-заглушки', () => {
    expect(TABLE_SOURCE).toContain('{row.score}');
    expect(TABLE_SOURCE).not.toMatch(/row\.score\s*:\s*'—'/);
  });

  test('TableRow (сама строка) больше не завязана на признак «досчитан ли раунд»', () => {
    // scoresSettled ещё используется в тексте подсказки «Ждём остальных» /
    // таймере — это статус раунда, не число. А вот сама строка и полоса
    // теперь ничего не гейтят по нему.
    const rowComponent = TABLE_SOURCE.slice(
      TABLE_SOURCE.indexOf('const TableRow ='),
    );
    expect(rowComponent).not.toContain('scoresSettled');
  });

  test('полоса-рейтинг всегда считается по реальному счёту, не по минимуму-заглушке', () => {
    const fill = TABLE_SOURCE.slice(
      TABLE_SOURCE.indexOf('const fillRatio'),
      TABLE_SOURCE.indexOf('const fillRatio') + 200,
    );
    expect(fill).toContain('row.score / maxScore');
    expect(fill).not.toContain('scoresSettled');
  });

  test('нет приглушённого «ожидающего» тона счёта — число не отличается от финального', () => {
    expect(TABLE_SOURCE).not.toContain('scorePending');
  });
});

describe('актуальность данных без перезагрузки', () => {
  test('таблица живёт на подписке комнаты, а не на разовом запросе', () => {
    // «Всё обновляется в фоне»: как только сервер записал новый ответ,
    // число сменяется без действий игрока.
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
