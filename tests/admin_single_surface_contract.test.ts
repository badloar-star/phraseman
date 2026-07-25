/**
 * Контракт единственной рабочей админки.
 *
 * зачем: владелец пользуется ровно одной админкой —
 * https://phraseman-ea0b3.web.app/legacy.html#control-panel, её исходник
 * admin/v2/legacy.html (проверено побайтово: md5 живой страницы == md5 файла).
 * Firebase Hosting target `admin` публикует папку admin/v2, поэтому правки в
 * любой другой файл админки на боевую не попадают. Раньше AGENTS.md велел
 * писать в admin/index.html (редирект-заглушка) — из-за этого сессии дважды
 * правили мёртвые файлы. Тест фиксирует границу машинно, а не «на словах».
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), 'utf8');
const md5 = (value: string | Buffer) => createHash('md5').update(value).digest('hex');

/** Единственная поверхность, куда разрешено писать. */
const LIVE_ADMIN = 'admin/v2/legacy.html';

/** Замороженные файлы: только чтение, развивать нельзя. */
const FROZEN_ADMIN_FILES = [
  'admin/legacy.html',
  'admin/index.html',
  'admin/full.html',
] as const;

describe('единственная рабочая админка', () => {
  it('живая админка существует и это полноценная панель, а не заглушка', () => {
    expect(existsSync(path.join(repoRoot, LIVE_ADMIN))).toBe(true);
    const html = read(LIVE_ADMIN);
    // Полноценная админка — сотни килобайт разметки, а не редирект в 20 строк.
    expect(html.length).toBeGreaterThan(500_000);
    expect(html).toContain('control-panel');
  });

  it('hosting target admin публикует папку admin/v2 — иначе правки не доедут', () => {
    const firebaseJson = JSON.parse(read('firebase.json')) as {
      hosting?: unknown;
    };
    const hostingList = Array.isArray(firebaseJson.hosting)
      ? (firebaseJson.hosting as Array<Record<string, unknown>>)
      : [firebaseJson.hosting as Record<string, unknown>];
    const adminTarget = hostingList.find((entry) => entry?.target === 'admin');

    expect(adminTarget).toBeDefined();
    expect(adminTarget?.public).toBe('admin/v2');
    // LIVE_ADMIN обязан лежать внутри публикуемой папки.
    expect(LIVE_ADMIN.startsWith(`${String(adminTarget?.public)}/`)).toBe(true);
  });

  it('admin/index.html — редирект-заглушка, в неё нельзя писать функциональность', () => {
    if (!existsSync(path.join(repoRoot, 'admin/index.html'))) return;
    const html = read('admin/index.html');
    // Заглушка обязана остаться крошечной: если кто-то начал писать сюда код —
    // размер выдаст это раньше, чем правка уедет в никуда.
    expect(html.length).toBeLessThan(5_000);
    expect(html).toContain('legacy.html');
  });

  it('отставшая копия admin/legacy.html не выдаёт себя за живую админку', () => {
    const stalePath = path.join(repoRoot, 'admin/legacy.html');
    if (!existsSync(stalePath)) return; // удалена — идеальный исход

    // Если копии разошлись, admin/legacy.html — мёртвый дубль. Тест не требует
    // их совпадения (это невозможно поддерживать), но требует, чтобы правила
    // явно называли её замороженной.
    const agents = read('AGENTS.md');
    expect(agents).toContain('admin/legacy.html');
    expect(agents.toUpperCase()).toContain('ЗАМОРОЖЕН');

    const stale = md5(readFileSync(stalePath));
    const live = md5(readFileSync(path.join(repoRoot, LIVE_ADMIN)));
    if (stale !== live) {
      // Разошлись — значит писать в неё точно нельзя.
      expect(agents).toContain(LIVE_ADMIN);
    }
  });

  it('правила проекта называют admin/v2/legacy.html единственной поверхностью', () => {
    const agents = read('AGENTS.md');
    const claude = read('CLAUDE.md');

    expect(agents).toContain(LIVE_ADMIN);
    expect(claude).toContain(LIVE_ADMIN);

    // Старое правило «писать в admin/index.html» должно быть вычищено —
    // именно оно уводило сессии в мёртвый файл.
    expect(agents).not.toMatch(/PREPARED_REPORT_REPLIES` in `admin\/index\.html`/);
  });

  it('замороженные файлы перечислены в правилах поимённо', () => {
    const agents = read('AGENTS.md');
    for (const frozen of FROZEN_ADMIN_FILES) {
      expect(agents).toContain(frozen);
    }
  });
});
