// зачем (владелец 21.10, №45 шаг 6; Ревизор п.7): карточка аккаунта читала весь users/{stableId} ради linkedAuth даже
// когда сессия уже вошла через Google/Apple. Сторож: сначала сессия, документ — только для гостя.
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'auth_provider.ts'), 'utf8');

describe('getLinkedAuthInfo: привязка из сессии раньше чтения документа', () => {
  it('провайдер сессии отвечает без Firestore, гость читает документ как раньше', () => {
    const start = source.indexOf('export async function getLinkedAuthInfo(');
    const end = source.indexOf('\n}\n', start);
    const body = source.slice(start, end);

    const devGate = body.indexOf('getDevLinkedAuthDemo()');
    const sessionCheck = body.indexOf('sessionLinked = fromAuth();');
    const sessionReturn = body.indexOf("return cardLog('currentUser_provider', sessionLinked);");
    const usersRead = body.indexOf("db.collection('users').doc(stableId).get()");

    expect(devGate).toBeGreaterThan(0);
    expect(sessionCheck).toBeGreaterThan(devGate);
    expect(sessionReturn).toBeGreaterThan(sessionCheck);
    expect(usersRead).toBeGreaterThan(sessionReturn);
    // Сбой чтения сессии не роняет функцию — причина в журнале, дальше прежний путь.
    expect(body).toContain("identityTrace('[AUTH-PEEK]', 'linked_auth_session_read_failed'");
  });
});
