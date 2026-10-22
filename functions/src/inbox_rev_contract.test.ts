// зачем (вопрос 27, пакет 38d250352, правило Ревизора 3.159 «поле не раньше всех путей публикации»): клиент перечитывает
// личные сообщения только при росте users/{uid}.inboxRev. Значит, КАЖДАЯ серверная запись в user_messages обязана
// поднимать счётчик в той же транзакции. Новый путь записи без счётчика — сторож красный.
import * as fs from 'fs';
import * as path from 'path';

const SRC = __dirname;
const read = (file: string): string => fs.readFileSync(path.join(SRC, file), 'utf8');
const INC = "inboxRev: admin.firestore.FieldValue.increment(1)";

/** Тело транзакции от `db.runTransaction(` до конца ближайшего вызова — с запасом по длине. */
function transactionAround(source: string, marker: string): string {
  const at = source.indexOf(marker);
  expect(at).toBeGreaterThan(0);
  const start = source.lastIndexOf('runTransaction(', at);
  expect(start).toBeGreaterThan(0);
  return source.slice(start, at + 4000);
}

describe('users/{uid}.inboxRev растёт на каждой серверной записи в user_messages', () => {
  it('в функциях нет других мест записи в user_messages', () => {
    const writers = fs.readdirSync(SRC)
      .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
      .filter((file) => /user_messages|USER_MESSAGES_COLLECTION/.test(read(file)));
    expect(writers.sort()).toEqual(['admin_app_messages.ts', 'report_replies.ts']);
  });

  it('личное сообщение админа: счётчик в той же транзакции, что и tx.create сообщения', () => {
    const source = read('admin_app_messages.ts');
    // Ссылка на сообщение объявлена ДО runTransaction — берём текст от неё вперёд.
    const at = source.indexOf("userRef.collection('user_messages').doc()");
    expect(at).toBeGreaterThan(0);
    const tx = source.slice(source.indexOf('runTransaction(', at), at + 4000);
    const create = tx.indexOf('tx.create(messageRef, input.document);');
    expect(create).toBeGreaterThan(0);
    expect(tx.indexOf(INC, create)).toBeGreaterThan(create);
  });

  it('ответ на репорт: счётчик в обеих ветках (с наградой — в ту же запись userRef), удалённый аккаунт не создаётся', () => {
    const source = read('report_replies.ts');
    const tx = transactionAround(source, 'kind: \'report_reply\',');
    expect(tx).toContain(`progress: { [HELPFUL_REPORTS_CONFIRMED_KEY]: admin.firestore.FieldValue.increment(1) },\n          ${INC},`);
    expect(tx).toContain(`} else if (userProfileSnap.exists) {`);
    expect(tx).toContain(`tx.set(userRef, { ${INC} }, { merge: true });`);
  });

  it('получение награды: «получено» в user_messages поднимает счётчик', () => {
    const source = read('report_replies.ts');
    const claim = source.slice(source.indexOf('export const claimReportReward'));
    const update = claim.indexOf('tx.update(messageRef, { claimed: true, claimedAtMs: nowMs });');
    expect(update).toBeGreaterThan(0);
    expect(claim.indexOf(`tx.set(userRef, { ${INC} }, { merge: true });`, update)).toBeGreaterThan(update);
  });
});
