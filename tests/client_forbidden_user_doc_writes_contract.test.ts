/**
 * Сторож: клиент не пишет server-owned поля в корень users/{uid}.
 *
 * зачем (владелец 2026-09-02): при разборе отказов permission-denied нашлись три
 * места, писавшие поля, которые правила запрещают клиенту БЕЗУСЛОВНО (исключения
 * нет даже для админского токена). Все три падали ВСЕГДА, и все три прятали
 * причину — двойной немой catch либо `if (__DEV__) console.warn`, невидимый в
 * сторовой сборке:
 *
 *  1. firestore_leaderboard.ts — писал `firebaseAuthUid` как fallback после
 *     падения callable authEnsureStableLink. Fallback не мог сработать никогда.
 *  2. friend_activity_likes.ts — писал `firebaseAuthUid` перед каждым лайком.
 *  3. shards_system.ts — писал `shards` в двух местах. В транзакции awardOneTime
 *     это роняло ВСЮ транзакцию вместе с claimRef (маркером «награда выдана»),
 *     из-за чего одноразовая награда молча не начислялась.
 *
 * Авторитетные писатели этих полей — только Admin SDK: authEnsureStableLink для
 * идентичности и личный экономический журнал (client_economy_*) для кошелька.
 *
 * Обычные тесты этот класс НЕ ловят: они гоняют клиент на моках Firestore, где
 * правил не существует, и остаются зелёными при любой запрещённой записи.
 *
 * Сработал — убрать запись и ходить через callable/журнал, а не ослаблять
 * проверку.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const APP_DIR = join(__dirname, '..', 'app');

/** Убирает комментарии: примеры и объяснения внутри них не должны валить сторожа. */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

function readSource(fileName: string): string {
  return stripComments(readFileSync(join(APP_DIR, fileName), 'utf8'));
}

describe('клиент не пишет server-owned поля в users/{uid}', () => {
  it('firestore_leaderboard больше не пишет firebaseAuthUid', () => {
    const source = readSource('firestore_leaderboard.ts');
    expect(source).not.toMatch(/firebaseAuthUid\s*:/);
    // Законный путь — общий помощник, который ходит в callable на Admin SDK.
    expect(source).toContain('ensureStableAuthLinkForStableId');
  });

  it('friend_activity_likes больше не пишет firebaseAuthUid', () => {
    const source = readSource('friend_activity_likes.ts');
    expect(source).not.toMatch(/firebaseAuthUid\s*:/);
    expect(source).toContain('ensureStableAuthLinkForStableId');
  });

  it('shards_system больше не пишет shards в корень users', () => {
    const source = readSource('shards_system.ts');
    // Запись вида `shards: <значение>` в объекте, уходящем в Firestore.
    // Чтение (`data()?.shards`) намеренно разрешено: на нём держится перенос
    // баланса старых аккаунтов при первой миграции журнала.
    const writes = source
      .split('\n')
      .map((line, index) => ({ line: line.trim(), no: index + 1 }))
      .filter(({ line }) => /^shards:\s*\w/.test(line));
    expect(writes.map((w) => `${w.no}: ${w.line}`)).toEqual([]);
  });

  it('shards_system не пишет и служебные поля баланса', () => {
    const source = readSource('shards_system.ts');
    const writes = source
      .split('\n')
      .map((line, index) => ({ line: line.trim(), no: index + 1 }))
      .filter(({ line }) => /^shards_updated_(at_ms|op|reason):\s*\w/.test(line));
    expect(writes.map((w) => `${w.no}: ${w.line}`)).toEqual([]);
  });

  it('ни один из трёх файлов не глушит ошибку под __DEV__', () => {
    // Немой catch под __DEV__ — причина, по которой все три бага жили молча:
    // в сторовой сборке __DEV__ = false, и отказ не попадал никуда.
    for (const file of ['firestore_leaderboard.ts', 'friend_activity_likes.ts', 'shards_system.ts']) {
      const source = readSource(file);
      expect({ file, hits: source.match(/if \(__DEV__\) console\.warn\('\[shards_system\]'/g) ?? [] })
        .toEqual({ file, hits: [] });
    }
  });
});
