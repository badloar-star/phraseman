import fs from 'node:fs';
import path from 'node:path';

// зачем: 2026-08-16 владелец не смог войти в админку — с badloar@gmail.com слетел
// custom claim admin, а код входа был исправен. Правка legacy.html в такой ситуации
// ломает работающую защиту, не решая проблему. Этот сторож фиксирует обе стороны:
// логика входа не должна деградировать, а порядок восстановления доступа должен
// оставаться записанным рядом с админкой, чтобы следующая сессия чинила claim,
// а не переписывала вход. Подробности: admin/v2/OWNER_ACCESS.md.

const root = path.resolve(__dirname, '..');
const legacyPath = path.join(root, 'admin/v2/legacy.html');
const ownerDocPath = path.join(root, 'admin/v2/OWNER_ACCESS.md');

describe('admin owner access contract', () => {
  const legacy = fs.readFileSync(legacyPath, 'utf8');

  test('вход требует custom claim admin', () => {
    expect(legacy).toContain("tr.claims.admin !== true");
  });

  test('токен принудительно перевыпускается, если claim ещё не подъехал', () => {
    // Без getIdTokenResult(true) свежевыданный claim не виден до истечения часа —
    // владелец видел бы отказ на исправном аккаунте.
    expect(legacy).toContain('getIdTokenResult(true)');
  });

  test('сессия сохраняется между заходами', () => {
    // browserLocalPersistence — то, из-за чего автовход вообще работает.
    expect(legacy).toContain('browserLocalPersistence');
    expect(legacy).toContain('setPersistence(auth, browserLocalPersistence)');
  });

  test('redirect-вход дочитывается после возврата с Google', () => {
    // Без getRedirectResult вход с телефона теряется и экран логина крутится по кругу.
    expect(legacy).toContain('getRedirectResult(auth)');
    expect(legacy).toContain('_adminRedirectSignInReady');
  });

  test('доступны оба пути входа — popup и redirect', () => {
    expect(legacy).toContain('signInWithPopup');
    expect(legacy).toContain('signInWithRedirect');
  });

  test('отказ по claim НЕ разлогинивает — иначе выгорает автовход', () => {
    // Корень инцидента 2026-08-16: при отсутствии claim стоял signOut, и каждый
    // заход уничтожал сохранённую сессию. Автовход не восстанавливался даже
    // после возврата claim — сохранять было нечего. Сессию трогать нельзя.
    // Блок отказа — последняя проверка claim в onAuthStateChanged: от неё до
    // возврата из обработчика. lastIndexOf, потому что раньше в файле есть
    // такая же проверка внутри кнопки повторной проверки.
    const denyStart = legacy.lastIndexOf("if (!tr.claims || tr.claims.admin !== true) {");
    const denyBlock = legacy.slice(denyStart, legacy.indexOf('showAdminRetryClaimButton(true)', denyStart) + 40);
    expect(denyStart).toBeGreaterThan(0);
    expect(denyBlock).not.toContain('signOut(auth)');
    expect(denyBlock).toContain('showAdminRetryClaimButton(true)');
  });

  test('есть кнопка повторной проверки прав без перезахода', () => {
    expect(legacy).toContain('function showAdminRetryClaimButton');
    expect(legacy).toContain('Проверить доступ снова');
  });

  test('закон о доступе владельца лежит рядом с админкой', () => {
    const doc = fs.readFileSync(ownerDocPath, 'utf8');
    expect(doc).toContain('badloar@gmail.com');
    expect(doc).toContain('set_admin_claim.mjs');
    // Порядок восстановления: сначала проверить claim, потом смотреть код.
    expect(doc).toContain('getUserByEmail');
  });
});
