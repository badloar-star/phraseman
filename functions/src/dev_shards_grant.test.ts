// ═══════════════════════════════════════════════════════════════════════════
// КОНТРАКТ СЕРВЕРНОЙ ЧАСТИ ДЕВ-НАЧИСЛЕНИЯ
//
// Железное правило владельца (2026-07-27): дев-начисление ВСЕГДА админское,
// ВСЕГДА идёт на сервер и работает на ЛЮБОЙ аккаунт. Клиентскую половину
// правила стережёт tests/dev_shards_grant_contract.test.ts, эта — серверную.
//
// Здесь проверяется ДВЕ вещи, и они тянут в разные стороны:
//   1. функция НЕ требует админ-роли (иначе правило «на любой аккаунт» мертво);
//   2. значит, единственная защита прода — серверный рубильник, и он обязан
//      быть fail-closed: любая неопределённость = ВЫКЛЮЧЕНО.
//
// Если ослабить пункт 2, дев-функция начисления валюты окажется открытой в
// проде. Поэтому тест на fail-closed трогать нельзя.
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from 'fs';
import { join } from 'path';
import { isDevShardsGrantEnabled } from './dev_shards_grant';

describe('рубильник дев-начисления: fail-closed', () => {
  it('выключено, когда конфига нет или он мусорный', () => {
    expect(isDevShardsGrantEnabled(undefined)).toBe(false);
    expect(isDevShardsGrantEnabled(null)).toBe(false);
    expect(isDevShardsGrantEnabled({})).toBe(false);
    expect(isDevShardsGrantEnabled('on')).toBe(false);
    expect(isDevShardsGrantEnabled(42)).toBe(false);
    expect(isDevShardsGrantEnabled([])).toBe(false);
  });

  it('выключено, когда ключа нет или он не равен 1', () => {
    expect(isDevShardsGrantEnabled({ numbers: {} })).toBe(false);
    expect(isDevShardsGrantEnabled({ numbers: { dev_shards_grant_enabled: 0 } })).toBe(false);
    expect(isDevShardsGrantEnabled({ numbers: { dev_shards_grant_enabled: 2 } })).toBe(false);
    expect(isDevShardsGrantEnabled({ numbers: { dev_shards_grant_enabled: null } })).toBe(false);
    // Строка 'true' — классическая ловушка: Number('true') = NaN, а не 1.
    expect(isDevShardsGrantEnabled({ numbers: { dev_shards_grant_enabled: 'true' } })).toBe(false);
    // numbers не объект — конфиг сломан, значит выключено.
    expect(isDevShardsGrantEnabled({ numbers: 1 })).toBe(false);
  });

  it('включено ТОЛЬКО при явной единице', () => {
    expect(isDevShardsGrantEnabled({ numbers: { dev_shards_grant_enabled: 1 } })).toBe(true);
    // Строковая единица из админки тоже считается: Number('1') === 1.
    expect(isDevShardsGrantEnabled({ numbers: { dev_shards_grant_enabled: '1' } })).toBe(true);
  });
});

describe('железное правило: начисление на ЛЮБОЙ аккаунт', () => {
  const source = readFileSync(join(__dirname, 'dev_shards_grant.ts'), 'utf8');

  it('функция НЕ требует админ-claim — иначе правило владельца нарушено', () => {
    // Обычный аккаунт claim admin не имеет (setCustomUserClaims в проекте не
    // вызывается нигде), поэтому такая проверка убила бы дев-начисление.
    expect(source).not.toMatch(/token\??\.admin\s*!==\s*true/);
    expect(source).not.toContain('Admin role required');
    expect(source).not.toContain('requireRewardWriter');
  });

  it('но требует авторизацию — анонимный вызов без аккаунта недопустим', () => {
    expect(source).toContain("throw new HttpsError('unauthenticated', 'auth_required')");
  });

  it('прод защищён рубильником, а не клиентским флагом', () => {
    // Клиентский флаг подделывается, серверный — нет. Проверка обязана стоять
    // ДО любой записи баланса.
    const gate = source.indexOf('dev_shards_grant_disabled');
    const write = source.indexOf('appendExternalEconomyEvent(tx', gate);
    expect(gate).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(gate);
  });

  it('начисление идемпотентно и ограничено потолком', () => {
    expect(source).toContain('dev_grant_receipts');
    expect(source).toContain('alreadyApplied');
    expect(source).toContain('DEV_GRANT_MAX');
  });

  it('подтверждённое событие и чек пишутся одной транзакцией', () => {
    expect(source).toContain('db.runTransaction');
    expect(source).toContain('appendExternalEconomyEvent');
    expect(source).not.toContain('shards: after');
  });
});
