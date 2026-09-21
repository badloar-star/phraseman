import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const ADMIN_INDEX = path.join(ROOT, 'admin', 'v2', 'legacy.html');

/**
 * Сторож раздела «Пользователи» (аудит владельца 2026-09-21).
 *
 * Повод. Раздел грузит 50 строк из 5376, но сортировка, фильтры и карточки
 * статистики считались ПО ЗАГРУЖЕННЫМ СТРОКАМ и выдавались за правду о всей
 * базе. «Сортировать по версии» показывало топ случайной полусотни, карточки
 * висели прочерками, дата серверных записей рисовалась как «Invalid Date», а
 * колонка «Тема» показывала дефолт, потому что app_theme НАМЕРЕННО не
 * синхронизируется в облако (app/cloud_sync.ts).
 *
 * Эти проверки ловят возврат каждого из тех дефектов. Сломался сторож —
 * чинить раздел, а не удалять проверку.
 */
function readAdminHtml(): string {
  return fs.readFileSync(ADMIN_INDEX, 'utf8');
}

function sortedSetLiteral(html: string, marker: string): string[] {
  const at = html.indexOf(marker);
  expect(at).toBeGreaterThanOrEqual(0);
  const open = html.indexOf('[', at);
  const close = html.indexOf(']', open);
  expect(open).toBeGreaterThan(-1);
  expect(close).toBeGreaterThan(open);
  return html
    .slice(open + 1, close)
    .split(',')
    .map((part) => part.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
    .sort();
}

describe('admin users section · truthful sorting and stats', () => {
  it('серверная карта сортировки и её зеркало в renderTable не расходятся', () => {
    const html = readAdminHtml();

    // Карта, по которой строится запрос Firestore.
    const mapStart = html.indexOf('const PM_P1_USERS_SORT_FIELDS = {');
    expect(mapStart).toBeGreaterThanOrEqual(0);
    const mapEnd = html.indexOf('};', mapStart);
    const mapBody = html.slice(mapStart, mapEnd);
    const serverFields = Array.from(mapBody.matchAll(/^\s{4}(\w+):\s*\{/gm))
      .map((m) => m[1])
      .sort();

    // Зеркало, которым renderTable решает, что порядок уже задан сервером.
    const viewFields = sortedSetLiteral(html, 'PM_P1_USERS_SORT_FIELDS_VIEW = new Set(');

    expect(serverFields.length).toBeGreaterThan(0);
    expect(viewFields).toEqual(serverFields);
  });

  it('страница запрашивается с серверным порядком и documentId как вторым ключом', () => {
    const html = readAdminHtml();
    // Без второго ключа курсор startAfter зацикливается на документах с
    // одинаковым значением (у сотен пользователей 0 XP).
    expect(html).toContain('orderBy(sort.path, dir), orderBy(documentId())');
  });

  it('смена сортировки сбрасывает кэш страниц и курсоры', () => {
    const html = readAdminHtml();
    // Курсоры привязаны к порядку: без сброса вторая страница вернёт строки
    // из прошлой сортировки.
    expect(html).toContain('sortSignature');
    expect(html).toMatch(/if \(options\.reset \|\| sortChanged\)/);
  });

  it('селектор сортировки переспрашивает сервер, а не тасует загруженные строки', () => {
    const html = readAdminHtml();
    expect(html).toContain('window.applyUsersSort(this.value)');
    expect(html).toContain('requestUsersSortRefresh');
    // Прямой renderTable() в onchange — ровно тот баг, с которого начался аудит.
    expect(html).not.toMatch(/id="sort-by"[^>]*onchange="[^"]*renderTable\(\)/);
  });

  it('колонка и фильтр «Тема» не возвращаются: app_theme не синхронизируется', () => {
    const html = readAdminHtml();
    expect(html).not.toContain('id="f-theme"');
    expect(html).not.toContain('theme_icon');
    // В CSV колонки «Тема» тоже быть не должно.
    const csvStart = html.indexOf('window.exportUsersCSV');
    const csvEnd = html.indexOf('showEmailExportModal', csvStart);
    expect(csvStart).toBeGreaterThanOrEqual(0);
    expect(html.slice(csvStart, csvEnd)).not.toContain("'Тема'");
  });

  it('время пользователя нормализуется: Timestamp не даёт Invalid Date', () => {
    const html = readAdminHtml();
    // usersMillis — именно ОБЪЯВЛЕНИЕ функции: её зовёт fdate на ~500 строк
    // выше, а присваивание в window не поднимается и дало бы ReferenceError,
    // который молча убивает весь раздел.
    expect(html).toMatch(/^\s*function usersMillis\(value\) \{/m);
    expect(html).not.toContain('window.usersMillis = function');

    // Корень вылечен: сам fdate понимает Firestore Timestamp, поэтому его зовут
    // и жалобы, и покупки, и бан-лист, не рискуя «Invalid Date».
    const fdateStart = html.indexOf('function fdate(ts) {');
    expect(fdateStart).toBeGreaterThanOrEqual(0);
    const fdateBody = html.slice(fdateStart, fdateStart + 400);
    expect(fdateBody).toContain('usersMillis(ts)');
    expect(fdateBody).not.toMatch(/const d\s*=\s*new Date\(ts\)/);

    // Таблица форматирует дату Timestamp-совместимо.
    expect(html).toContain('${fdateAny(u.updatedAt)}');
    // Сортировка по дате обязана сравнивать миллисекунды, а не объект.
    expect(html).toContain('usersMillis(b.updatedAt)-usersMillis(a.updatedAt)');
    // Немой catch запрещён правилом владельца.
    const umStart = html.indexOf('function usersMillis(value) {');
    const umBody = html.slice(umStart, html.indexOf('function refCreatedMs', umStart));
    expect(umBody).not.toMatch(/catch\s*\([^)]*\)\s*\{\s*return/);
  });

  it('CSV выгружает полный список, а не отфильтрованную страницу', () => {
    const html = readAdminHtml();
    // `_pagedUsers` непуст после полной догрузки, поэтому он НЕ может стоять
    // первым — иначе экспорт молча отдаст 50 строк вместо всей базы.
    expect(html).toContain('window._usersFullDatasetLoaded ? window._users : (window._pagedUsers || window._users)');
  });

  it('строки пользователей маппятся одной функцией в обоих режимах', () => {
    const html = readAdminHtml();
    // Вторая копия маппера теряла nameIndex, и поиск по #nameIndex работал
    // по-разному в постраничном и полном режимах.
    expect(html).toContain('const mapUserDoc = (docSnap) => userRowFromDocSnap(');
    expect(html.match(/name: p\.user_name \|\| \(titleFor\(xp\)/g) || []).toHaveLength(1);
  });

  it('карточки статистики не обещают средних по всей базе', () => {
    const html = readAdminHtml();
    // count() умеет только количество; «средний XP» и «Plus» по всей базе
    // дёшево не считаются, поэтому карточек быть не должно.
    expect(html).not.toContain('id="s-xp"');
    expect(html).not.toContain('id="s-streak"');
    expect(html).not.toContain('id="s-prem"');
    expect(html).not.toContain('id="s-shards"');
    expect(html).toContain('id="s-total"');
    expect(html).toContain('id="s-page-count"');
  });

  it('запись в карточки идёт через безопасный сеттер', () => {
    const html = readAdminHtml();
    // Раньше updateStats писал в 8 элементов напрямую: удаление одного роняло
    // весь расчёт молча, на первой же отсутствующей карточке.
    expect(html).toContain('function setStatCard');
    const start = html.indexOf('function updateStats(users)');
    const end = html.indexOf('function syncVersionFilterOptions', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(html.slice(start, end)).not.toMatch(/getElementById\('s-[a-z-]+'\)\.textContent/);
  });
});
