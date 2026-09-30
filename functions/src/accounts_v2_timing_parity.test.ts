import fs from 'fs';
import path from 'path';
import {
  ACCOUNTS_V2_OPERATION_MAX_AGE_MS,
  ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS,
} from './accounts_v2_contract';

/*
 * Сторож сроков Account V2: жизнь операции в outbox клиента < TTL квитанций
 * сервера; предел возраста операции одинаков у клиента и сервера; окно будущего SRS.
 * зачем: вынесено из accounts_v2_envelope_parity.test.ts (≤ 800 строк на файл,
 * ремонт №1 TG-DFA918464DFA) без изменения проверок.
 */

/**
 * Значение константы-произведения из исходника (`24 * 60 * 60 * 1000`, `180 * DAY_MS`).
 * зачем: сторож читает ТЕКСТ обеих сторон, а не зашитые в тест числа.
 */
function constProduct(source: string, name: string, known: Readonly<Record<string, number>> = {}): number {
  const match = new RegExp(`(?:export )?const ${name} = ([\\w\\s*]+);`).exec(source);
  if (match === null) return Number.NaN;
  return match[1].split('*').map((token) => token.trim()).reduce((product, token) => {
    // Числовой литерал может быть с разделителями (60_000); имя константы — нет.
    if (/^\d[\d_]*$/.test(token)) return product * Number(token.replace(/_/g, ''));
    return product * (known[token] ?? Number.NaN);
  }, 1);
}

// ─── сроки: жизнь операции в outbox < TTL квитанций; окно будущего SRS ───
// зачем (TG-7CD73967EF61): числа читаются из ИСХОДНИКОВ обеих сторон, а не
// зашиваются в тест: сервер поднимет/опустит TTL — сторож увидит сразу.
describe('сроки клиента против серверных (из исходников)', () => {
  const recordsSource = fs.readFileSync(path.resolve(
    __dirname, '..', '..', 'modules', 'account-session-v2', 'account_sync_outbox_records.ts'), 'utf8');
  const portSource = fs.readFileSync(path.join(__dirname, 'accounts_v2_adapter', 'firestore_port.ts'), 'utf8');
  const clockSource = fs.readFileSync(path.resolve(
    __dirname, '..', '..', 'modules', 'account-session-v2', 'account_sync_clock.ts'), 'utf8');

  function lifetimeProblems(records: string, port: string): string[] {
    const clientMaxAge = constProduct(records, 'ACCOUNT_SYNC_OPERATION_MAX_AGE_MS');
    const serverTtl = constProduct(port, 'ACCOUNTS_V2_RECEIPT_TTL_MS', { DAY_MS: constProduct(port, 'DAY_MS') });
    if (!Number.isFinite(clientMaxAge) || !Number.isFinite(serverTtl)) return ['срок жизни: константы не найдены'];
    return clientMaxAge < serverTtl ? [] : [`срок жизни: клиент ${clientMaxAge} ≥ TTL квитанций ${serverTtl}`];
  }

  function skewProblems(clock: string): string[] {
    const clientSkew = constProduct(clock, 'ACCOUNT_SYNC_SRS_MAX_FUTURE_SKEW_MS');
    const margin = constProduct(clock, 'ACCOUNT_SYNC_SRS_FUTURE_MARGIN_MS');
    const problems: string[] = [];
    if (clientSkew !== ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS) {
      problems.push(`окно будущего SRS: клиент ${clientSkew} ≠ сервер ${ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS}`);
    }
    if (!(margin > 0 && margin < clientSkew)) problems.push(`запас окна SRS: ${margin}`);
    return problems;
  }

  test('предел жизни операции клиента строго меньше TTL квитанций сервера', () => {
    expect(lifetimeProblems(recordsSource, portSource)).toEqual([]);
    expect(constProduct(recordsSource, 'ACCOUNT_SYNC_OPERATION_MAX_AGE_MS')).toBe(170 * 24 * 60 * 60 * 1000);
  });

  // зачем (TG-DFA918464DFA): сервер отказывает по тому же пределу, что клиент уводит
  // в карантин сам — иначе одна сторона пропускала бы то, что другая считает старым.
  const contractSource = fs.readFileSync(path.join(__dirname, 'accounts_v2_contract.ts'), 'utf8');
  function maxAgeProblems(records: string, server: string): string[] {
    const client = constProduct(records, 'ACCOUNT_SYNC_OPERATION_MAX_AGE_MS');
    const serverAge = constProduct(server, 'ACCOUNTS_V2_OPERATION_MAX_AGE_MS');
    return client === serverAge && serverAge === ACCOUNTS_V2_OPERATION_MAX_AGE_MS
      ? [] : [`предел возраста: клиент ${client} ≠ сервер ${serverAge}`];
  }

  test('предел возраста операции клиента = серверному (из исходников)', () => {
    expect(maxAgeProblems(recordsSource, contractSource)).toEqual([]);
  });

  test('мутация предела возраста сервера ловится', () => {
    const mutated = contractSource.replace(
      'export const ACCOUNTS_V2_OPERATION_MAX_AGE_MS = 170 * 24 * 60 * 60 * 1000;',
      'export const ACCOUNTS_V2_OPERATION_MAX_AGE_MS = 175 * 24 * 60 * 60 * 1000;');
    expect(mutated).not.toBe(contractSource);
    expect(maxAgeProblems(recordsSource, mutated).length).toBeGreaterThan(0);
  });

  test('окно будущего SRS клиента = серверному, запас внутри окна', () => {
    expect(skewProblems(clockSource)).toEqual([]);
  });

  test.each([
    ['TTL сервера опустили до 170 суток', () => lifetimeProblems(recordsSource,
      portSource.replace('export const ACCOUNTS_V2_RECEIPT_TTL_MS = 180 * DAY_MS;', 'export const ACCOUNTS_V2_RECEIPT_TTL_MS = 170 * DAY_MS;'))],
    ['клиент поднял предел до 180 суток', () => lifetimeProblems(recordsSource.replace(
      'export const ACCOUNT_SYNC_OPERATION_MAX_AGE_MS = 170 * 24 * 60 * 60 * 1000;',
      'export const ACCOUNT_SYNC_OPERATION_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;'), portSource)],
    ['окно SRS клиента разошлось', () => skewProblems(clockSource.replace(
      'export const ACCOUNT_SYNC_SRS_MAX_FUTURE_SKEW_MS = 10 * 60 * 1000;',
      'export const ACCOUNT_SYNC_SRS_MAX_FUTURE_SKEW_MS = 15 * 60 * 1000;'))],
  ])('мутация сроков «%s» ловится', (_label, problems) => {
    expect(problems().length).toBeGreaterThan(0);
  });
});
