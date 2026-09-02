import fs from 'fs';
import path from 'path';

/*
 * Сторож этапов 2-3: одно имя и опознание по нему.
 *
 * зачем: опознание по account_id встроено в путь входа всех людей и обязано
 * заменять дорогой поисковый запрос, а не живую привязку. Обычные тесты входа
 * порядок ступеней не заметят: они проверяют результат, а не то, каким путём
 * он получен.
 *
 * ИСТОРИЯ ПРАВИЛА (аудит 2026-09-02). Первая редакция требовала карту ПЕРВОЙ
 * ступенью — до auth_links. На боевой базе у 62 аккаунтов (двое с подпиской)
 * карта вела не туда, куда auth_links, и вход отвечал stable_id_mismatch, а
 * клиент на этот код ротирует личность — пустой профиль. Теперь правило:
 * живая привязка главнее карты; карта — ниже привязки, но выше поискового
 * запроса. Сдвинуть карту НИЖЕ запроса нельзя — исчезнет экономия; поднять
 * ВЫШЕ привязки нельзя — вернётся регрессия.
 */
describe('одно имя аккаунта', () => {
  const identity = fs.readFileSync(path.join(__dirname, 'auth_identity.ts'), 'utf8');
  const lookup = fs.readFileSync(path.join(__dirname, 'account_id_lookup.ts'), 'utf8');
  const contract = fs.readFileSync(path.join(__dirname, 'account_id.ts'), 'utf8');

  it('опознание по имени стоит ПОСЛЕ живой привязки и ДО поискового запроса', () => {
    const byAlias = identity.indexOf('const aliasHit = await findAccountByAlias(');
    const anchor = identity.indexOf('const authLinkAnchor = await findLiveAuthLinkAnchor(');
    const byProvider = identity.indexOf('const authoritativeByAuth = await findStableUidForProviderAuth(');
    expect(anchor).toBeGreaterThan(0);
    expect(byAlias).toBeGreaterThan(anchor);
    expect(byProvider).toBeGreaterThan(byAlias);
  });

  it('найденный аккаунт проверяется, а не берётся на веру — и обязан принадлежать этому uid', () => {
    // Индекс — карта, а не источник правды: аккаунт мог быть слит уже после
    // её заполнения. Вести человека по устаревшей карте = пустой профиль.
    // Владение по firebaseAuthUid — то, что нашёл бы прежний авторитетный
    // запрос; подсказки провайдера и легаси-документы решает прежняя лестница.
    expect(identity).toContain('await verifyAccountHit(db, aliasHit, authUid)');
    expect(lookup).toContain('identityHidden === true');
    expect(lookup).toMatch(/[!=]== hit\.accountId/);
    expect(lookup).toContain('owner === ownerAuthUid');
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
