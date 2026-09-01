import fs from 'fs';
import path from 'path';

/*
 * Сторож: вход во время grace обязан отличаться от входа в мёртвый аккаунт.
 *
 * зачем (владелец, 2026-09-01): «при попытке зайти появляется модал восстановить
 * аккаунт? если да то заходит нормально без проблем». Аудит 01.09 показал, что
 * этого НЕ происходило: маркер, tombstone и постоянные отказы пишутся сразу при
 * подаче заявки, а вход проверял их одним `exists` — и все 14 дней отвечал
 * `identity_retired`. Приложение обрабатывает этот код молча и заводит ПУСТОЙ
 * профиль, то есть человек терял и прогресс, и саму возможность передумать.
 *
 * ПОСЛЕ ЭТАПА 1 смысл живёт в ОДНОМ месте — account_gate.ts. Поэтому сторож
 * следит не за текстом проверок (их больше нет по всему файлу), а за тем, что
 * решение действительно централизовано и не расползлось обратно.
 */
describe('grace-период отличается от завершённого удаления', () => {
  const gate = fs.readFileSync(path.join(__dirname, 'account_gate.ts'), 'utf8');
  const identity = fs.readFileSync(path.join(__dirname, 'auth_identity.ts'), 'utf8');
  const cloudSync = fs.readFileSync(path.join(__dirname, '../../app/cloud_sync.ts'), 'utf8');
  const authProvider = fs.readFileSync(path.join(__dirname, '../../app/auth_provider.ts'), 'utf8');

  it('дверь решает по статусу метки, а не по её существованию', () => {
    expect(gate).toContain("if (String(data.status ?? '') !== 'pending') return 'deleted';");
    // Дедлайн строкой не считается живым grace: Number('999…') дало бы валидное
    // число, и человеку пообещали бы восстановление, которого сервер не сделает.
    expect(gate).toContain("typeof deadline !== 'number'");
    expect(gate).not.toContain('const deadline = Number(data.graceDeadlineMs);');
  });

  it('решение о доступе принимает ТОЛЬКО дверь', () => {
    // Ключевая гарантия этапа 1: в auth_identity больше нет собственной логики
    // «grace или смерть» — именно её дублирование и порождало дыры.
    expect(identity).not.toMatch(/function readAccountDeleteGraceDeadline\(/);
    expect(identity).not.toMatch(/function throwAccountDeletePending\(/);
    expect(identity).toContain("from './account_gate'");

    // Каждый отказ идёт через дверь, а не через самодельный throw.
    const rawRetired = identity.match(/throwIdentityRetired\('(auth|stable|closure)'\)/g) ?? [];
    const gateCalls = identity.match(/assertAccountUsable\(/g) ?? [];
    expect(gateCalls.length).toBeGreaterThanOrEqual(8);
    // Оставшиеся прямые throw допустимы только в ротации уже мёртвой личности.
    for (const call of rawRetired) {
      const at = identity.indexOf(call);
      const before = identity.slice(Math.max(0, at - 600), at);
      expect(before).toMatch(/зачем БЕЗ grace-ветки|rotateRetiredProviderStableLink/);
    }
  });

  it('коды отказа РАЗНЫЕ — их схлопывание и было главной дырой', () => {
    expect(gate).toContain("'account_delete_pending'");
    expect(gate).toContain("'identity_retired'");
    // grace обязан идти первым: иначе живой аккаунт хоронится как удалённый.
    expect(gate.indexOf("kind === 'grace'")).toBeLessThan(gate.indexOf("'identity_retired'"));
  });

  it('главный путь провайдерского входа не ротирует живой аккаунт', () => {
    // Ротация на свежий пустой профиль ДОЛЖНА стоять после проверки grace:
    // иначе человек внутри 14 дней получал чистый экран, а вернуть прогресс
    // было уже некуда — привязка уехала на новый id.
    const grace = identity.indexOf('const linkedState = accountStateFromSnapshots({');
    const rotate = identity.indexOf('await rotateRetiredProviderStableLink(');
    expect(grace).toBeGreaterThan(0);
    expect(rotate).toBeGreaterThan(grace);
  });

  it('клиент не схлопывает pending в retired', () => {
    expect(cloudSync).toContain("if (combined.includes('account_delete_pending')) return 'account_delete_pending';");
    expect(cloudSync).not.toContain(
      "if (combined.includes('identity_retired') || combined.includes('account_delete_pending')) {",
    );
    expect(cloudSync).toContain("| 'account_delete_pending'");
  });

  it('вход возвращает pending наружу, а не ротирует личность', () => {
    const pendingReturns = authProvider.match(/failure === 'account_delete_pending'/g) ?? [];
    expect(pendingReturns.length).toBe(2);
    expect(authProvider).toContain("return { result: 'error', error: 'account_delete_pending' };");
  });

  it('воркер помечает метки running при взятии задачи, а не только в конце', () => {
    // Иначе ВСЁ время работы воркера tombstone оставался 'pending', вход
    // предлагал «Восстановить аккаунт?», а сервер отказывал: данные уже
    // частично снесены. Обещание без выполнения.
    const job = fs.readFileSync(path.join(__dirname, 'account_delete_job.ts'), 'utf8');
    const claim = job.indexOf("status: 'running',\n      attempts,");
    const complete = job.indexOf("status: 'completed'");
    const tombRunning = job.indexOf('tx.set(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableUid), {');
    const markerRunning = job.indexOf('tx.set(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid), {');
    expect(claim).toBeGreaterThan(0);
    expect(tombRunning).toBeGreaterThan(claim);
    expect(markerRunning).toBeGreaterThan(claim);
    expect(tombRunning).toBeLessThan(complete);
    expect(markerRunning).toBeLessThan(complete);
  });

  it('удаление уносит контактную запись по почте', () => {
    const del = fs.readFileSync(path.join(__dirname, 'account_delete.ts'), 'utf8');
    expect(del).toContain('async function deleteEmailContactRecords(');
    expect(del).toContain("runDeleteStage(ctx, stats, 'email_contacts'");
    expect(del).toContain("return ['website_contact_inbox', 'email_contacts'];");
    // Платёжный след сайта обязан пережить удаление аккаунта в приложении.
    expect(del).toContain('hasSiteTrace');
  });
});
