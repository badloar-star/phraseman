// зачем (баг 02.10, «Дизайн», холодный старт): integrity rows=52, все «HMAC verification failed for
// page N» 1…52 — базу шифровали другим ключом. Это та же причина, что NOTADB: восстановление обязано
// её узнать (пересоздание + данные из локального хранилища и облака). Частичную порчу с 02.10 (§75) тоже пересоздаём; различие остаётся в логе integrity_verdict.
jest.mock('expo-sqlite', () => ({}));
jest.mock('expo-file-system', () => ({ File: jest.fn() }));
jest.mock('expo-constants', () => ({ __esModule: true, default: {}, ExecutionEnvironment: {} }));

import { isUnreadableDatabaseFailure, isWholeFileKeyMismatch } from '../modules/phone-state/database';

const rows = (pages: number[]) => pages.map((page) => ({ cipher_integrity_check: `HMAC verification failed for page ${page}` }));

describe('PhoneState: чужой ключ против порчи', () => {
  it('HMAC не сошёлся на всех страницах 1…N — чужой ключ', () => {
    expect(isWholeFileKeyMismatch(rows(Array.from({ length: 52 }, (_, i) => i + 1)))).toBe(true);
    expect(isWholeFileKeyMismatch(rows([1]))).toBe(true);
  });

  it('частичная порча — не чужой ключ (в логе отличается)', () => {
    expect(isWholeFileKeyMismatch(rows([3]))).toBe(false);
    expect(isWholeFileKeyMismatch(rows([1, 2, 4]))).toBe(false);
    expect(isWholeFileKeyMismatch([{ cipher_integrity_check: 'row is corrupt' }])).toBe(false);
    expect(isWholeFileKeyMismatch([...rows([1, 2]), { cipher_integrity_check: 'row is corrupt' }])).toBe(false);
    expect(isWholeFileKeyMismatch([])).toBe(false);
  });

  it('восстановление узнаёт и чужой ключ, и порчу (§75 — без вечного падения)', () => {
    expect(isUnreadableDatabaseFailure(new Error('phone_state_cipher_key_mismatch'))).toBe(true);
    expect(isUnreadableDatabaseFailure(new Error('phone_state_cipher_integrity_failed'))).toBe(true);
    expect(isUnreadableDatabaseFailure(new Error('file is not a database'))).toBe(true);
  });
});
