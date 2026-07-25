import { cardIdFromMemoryKey, worstStatus } from '../app/flashcards/cardStatus';
import { compactArenaMemory, defaultArenaRow } from '../app/flashcards/arenaProgress';

/**
 * Регрессионные тесты на две находки аудита 2026-07-25.
 *
 * Обе — про рассинхрон между режимами: свайп, арена и коллекция работают с
 * одним хранилищем, но раньше делали это по-разному. Такие расхождения не
 * падают и не логируются — они просто молча показывают юзеру неправду.
 */

describe('НАХОДКА 1: ключи памяти свайпа и коллекции не совпадали', () => {
  it('составной ключ свайпа сводится к id карточки', () => {
    // Свайп пишет `${source.id}:${card.id}`, где source.id сам с двоеточием.
    expect(cardIdFromMemoryKey('saved:all:abc123')).toBe('abc123');
    expect(cardIdFromMemoryKey('custom:all:xyz')).toBe('xyz');
    expect(cardIdFromMemoryKey('pack:movies:card_7')).toBe('card_7');
  });

  it('голый ключ арены остаётся собой', () => {
    expect(cardIdFromMemoryKey('abc123')).toBe('abc123');
  });

  it('пустой ключ не роняет разбор', () => {
    expect(cardIdFromMemoryKey('')).toBe('');
    expect(cardIdFromMemoryKey(':')).toBe('');
  });
});

describe('НАХОДКА 1b: одна карточка в двух режимах', () => {
  it('проблемный статус побеждает благополучный', () => {
    // Свайп говорит «освоена», арена — «слабая». Прятать проблему нельзя.
    expect(worstStatus('mastered', 'weak')).toBe('weak');
    expect(worstStatus('weak', 'mastered')).toBe('weak');
  });

  it('«пора повторить» важнее «учу»', () => {
    expect(worstStatus('learning', 'review')).toBe('review');
  });

  it('«освоена» уступает любому другому статусу', () => {
    expect(worstStatus('mastered', 'new')).toBe('new');
    expect(worstStatus('mastered', 'learning')).toBe('learning');
  });

  it('одинаковые статусы не меняются', () => {
    expect(worstStatus('weak', 'weak')).toBe('weak');
  });
});

describe('НАХОДКА 2: арена не подрезала память, в отличие от свайпа', () => {
  it('память до потолка не трогается', () => {
    const small = { a: defaultArenaRow(), b: defaultArenaRow() };
    expect(Object.keys(compactArenaMemory(small))).toHaveLength(2);
  });

  it('память сверх 1200 записей режется до 1200', () => {
    const big: Record<string, ReturnType<typeof defaultArenaRow>> = {};
    for (let i = 0; i < 1500; i++) {
      big[`card_${i}`] = { ...defaultArenaRow(), lastSeenAt: i };
    }
    expect(Object.keys(compactArenaMemory(big))).toHaveLength(1200);
  });

  it('при обрезке остаются САМЫЕ СВЕЖИЕ записи', () => {
    const big: Record<string, ReturnType<typeof defaultArenaRow>> = {};
    for (let i = 0; i < 1500; i++) {
      big[`card_${i}`] = { ...defaultArenaRow(), lastSeenAt: i };
    }
    const out = compactArenaMemory(big);
    // Самая свежая (1499) осталась, самая старая (0) выброшена.
    expect(out['card_1499']).toBeDefined();
    expect(out['card_0']).toBeUndefined();
  });
});
