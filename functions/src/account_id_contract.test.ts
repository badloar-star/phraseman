import fs from 'fs';
import path from 'path';

/*
 * Сторож этапов 2-3: одно имя и опознание по нему.
 *
 * зачем: опознание по account_id встроено ПЕРВОЙ ступенью в путь входа всех
 * людей. Если её сдвинуть ниже или убрать, вход тихо вернётся к шести
 * последовательным способам — и вместе с ними вернутся «не могу войти» и
 * пустые профили. Обычные тесты входа этого не заметят: они проверяют
 * результат, а не то, каким путём он получен.
 */
describe('одно имя аккаунта', () => {
  const identity = fs.readFileSync(path.join(__dirname, 'auth_identity.ts'), 'utf8');
  const lookup = fs.readFileSync(path.join(__dirname, 'account_id_lookup.ts'), 'utf8');
  const contract = fs.readFileSync(path.join(__dirname, 'account_id.ts'), 'utf8');

  it('опознание по имени стоит ПЕРВЫМ, до всех прежних способов', () => {
    const byAlias = identity.indexOf('const aliasHit = await findAccountByAlias(');
    const anchor = identity.indexOf('const authLinkAnchor = await findLiveAuthLinkAnchor(');
    const byProvider = identity.indexOf('const authoritativeByAuth = await findStableUidForProviderAuth(');
    expect(byAlias).toBeGreaterThan(0);
    expect(anchor).toBeGreaterThan(byAlias);
    expect(byProvider).toBeGreaterThan(byAlias);
  });

  it('найденный аккаунт проверяется, а не берётся на веру', () => {
    // Индекс — карта, а не источник правды: аккаунт мог быть слит уже после
    // её заполнения. Вести человека по устаревшей карте = пустой профиль.
    expect(identity).toContain('await verifyAccountHit(db, aliasHit)');
    expect(lookup).toContain('identityHidden === true');
    expect(lookup).toContain('=== hit.accountId');
  });

  it('новая ступень не может уронить вход', () => {
    // Ошибка чтения обязана давать null, а не исключение: до неё вход работал.
    const readFn = lookup.slice(lookup.indexOf('export async function findAccountByAlias'));
    expect(readFn).toContain('catch');
    expect(readFn).toContain('return null;');
    // И обязана оставлять след — иначе отключится молча.
    expect(lookup).toContain('account_id_lookup_unavailable');
    expect(lookup).toContain('account_id_index_incomplete');
  });

  it('имя не выводится из старых идентификаторов', () => {
    // Имя, посчитанное из stable_id, менялось бы вместе с источником и
    // перестало бы быть постоянным — то есть смысл этапа 2 исчез бы.
    expect(contract).toContain('randomUUID()');
    expect(contract).not.toMatch(/newAccountId[\s\S]{0,200}sha256/);
  });

  it('псевдонимы кладутся по хешу — защита от зарезервированных id', () => {
    // Инцидент 29.08: Firestore резервирует идентификаторы вида __x__.
    expect(contract).toContain("createHash('sha256')");
    expect(contract).toContain('/^__.*__$/');
  });
});
