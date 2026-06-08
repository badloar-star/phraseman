/**
 * Контракт системных сообщений чата лиги.
 * Системные сообщения генерируются движком/сервером (НЕ пользователями) и в UI
 * рендерятся иначе: по центру, мельче, с иконкой, без аватара и без действий.
 * Классификатор isSystemLeagueChatMessage — единственная точка, решающая,
 * какой рендер применить, поэтому покрываем её явно.
 */
import {
  isSystemLeagueChatMessage,
  LEAGUE_CHAT_SYSTEM_UID,
} from '../app/league_chat_system';

describe('isSystemLeagueChatMessage', () => {
  it('распознаёт сообщение с kind === "system"', () => {
    expect(isSystemLeagueChatMessage({ kind: 'system', authorUid: 'whatever' })).toBe(true);
  });

  it('распознаёт сообщение от зарезервированного системного uid', () => {
    expect(isSystemLeagueChatMessage({ kind: undefined, authorUid: LEAGUE_CHAT_SYSTEM_UID })).toBe(true);
  });

  it('обычное пользовательское сообщение НЕ системное', () => {
    expect(isSystemLeagueChatMessage({ kind: 'user', authorUid: 'user_123' })).toBe(false);
  });

  it('сообщение без kind от обычного uid НЕ системное', () => {
    expect(isSystemLeagueChatMessage({ kind: undefined, authorUid: 'user_123' })).toBe(false);
  });

  it('обычный пользователь не может подделать системный вид только текстом', () => {
    // нет ни kind:system, ни системного uid → остаётся пользовательским
    expect(isSystemLeagueChatMessage({ authorUid: 'user_456' } as any)).toBe(false);
  });
});
