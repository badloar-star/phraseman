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
 * Тест ловит именно возврат к проверке «по существованию»: если кто-то уберёт
 * различение статуса, grace снова станет невидимым, а обычные тесты входа этого
 * НЕ заметят — они работают на завершённых удалениях.
 */
describe('grace-период отличается от завершённого удаления', () => {
  const identity = fs.readFileSync(path.join(__dirname, 'auth_identity.ts'), 'utf8');
  const cloudSync = fs.readFileSync(
    path.join(__dirname, '../../app/cloud_sync.ts'),
    'utf8',
  );
  const authProvider = fs.readFileSync(
    path.join(__dirname, '../../app/auth_provider.ts'),
    'utf8',
  );

  it('сервер решает по статусу метки, а не по её существованию', () => {
    expect(identity).toContain('function readAccountDeleteGraceDeadline(');
    expect(identity).toContain("if (String(data.status ?? '') !== 'pending') return null;");
    expect(identity).toContain('function throwAccountDeletePending(');
    expect(identity).toContain("'account_delete_pending'");
  });

  it('grace проверяется ПЕРЕД похоронами на каждом пути входа', () => {
    // Каждый throwIdentityRetired обязан иметь grace-проверку ВЫШЕ себя.
    //
    // Единственное осознанное исключение — rotateRetiredProviderStableLink:
    // туда входят лишь после доказанной смерти старой личности, а проверяют там
    // auth-метку и СВЕЖИЙ stable_id, где grace невозможен по определению.
    // Исключение отмечено в коде комментарием «зачем БЕЗ grace-ветки».
    const retiredCalls = [...identity.matchAll(/throwIdentityRetired\('(auth|stable)'\)/g)];
    expect(retiredCalls.length).toBeGreaterThanOrEqual(8);

    const unguarded = retiredCalls.filter((call) => {
      const before = identity.slice(Math.max(0, call.index! - 500), call.index!);
      return !before.includes('throwAccountDeletePending')
        && !before.includes('зачем БЕЗ grace-ветки');
    });
    expect(unguarded).toHaveLength(0);
  });

  it('главный путь провайдерского входа не ротирует живой аккаунт', () => {
    // Ротация на свежий пустой профиль ДОЛЖНА стоять после grace-проверки:
    // иначе человек внутри 14 дней получал чистый экран, а вернуть прогресс
    // было уже некуда — привязка уехала на новый id.
    const grace = identity.indexOf('const linkedGraceDeadlineMs = readAccountDeleteGraceDeadline(linkedTombstone);');
    const rotate = identity.indexOf('await rotateRetiredProviderStableLink(');
    expect(grace).toBeGreaterThan(0);
    expect(rotate).toBeGreaterThan(grace);
  });

  it('клиент не схлопывает pending в retired', () => {
    expect(cloudSync).toContain("if (combined.includes('account_delete_pending')) return 'account_delete_pending';");
    // Ровно та строка, которая и убивала модал восстановления.
    expect(cloudSync).not.toContain(
      "if (combined.includes('identity_retired') || combined.includes('account_delete_pending')) {",
    );
    expect(cloudSync).toContain("| 'account_delete_pending'");
  });

  it('вход возвращает pending наружу, а не ротирует личность', () => {
    const pendingReturns = authProvider.match(
      /failure === 'account_delete_pending'/g,
    ) ?? [];
    // Обе ветки: remote-аккаунт и локальный stable_id.
    expect(pendingReturns.length).toBe(2);
    expect(authProvider).toContain("return { result: 'error', error: 'account_delete_pending' };");
  });

  it('дедлайн принимается только числом, строка не считается живым grace', () => {
    // Найдено самопроверкой 01.09: Number('9999999999999') прошло бы как живой
    // grace, и человеку пообещали бы восстановление, которого
    // accountDeleteRestoreMine не выполнит (он читает то же поле числом).
    expect(identity).toContain("typeof deadline !== 'number'");
    expect(identity).not.toContain('const deadline = Number(data.graceDeadlineMs);');
  });

  it('воркер помечает метки running при взятии задачи, а не только в конце', () => {
    // Иначе ВСЁ время работы воркера tombstone оставался 'pending', вход
    // предлагал «Восстановить аккаунт?», а сервер отказывал: данные уже
    // частично снесены. Обещание без выполнения.
    const job = fs.readFileSync(path.join(__dirname, 'account_delete_job.ts'), 'utf8');
    const claim = job.indexOf("status: 'running',\n      attempts,");
    expect(claim).toBeGreaterThan(0);
    const complete = job.indexOf("status: 'completed'");
    // Обе метки переводятся в running ВНУТРИ транзакции взятия — то есть до
    // блока завершения.
    const tombRunning = job.indexOf('tx.set(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableUid), {');
    const markerRunning = job.indexOf('tx.set(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid), {');
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
