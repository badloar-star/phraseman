import fs from 'fs';
import path from 'path';
import { maskDeepLinkForLog } from '../app/deep_link_log_mask';

/*
 * Пакет 8H — логи диплинка не печатают значения параметров ссылки (там бывают пароли/токены).
 * Сторож: каждый лог `[V2-PAGE] deeplink:` в app/ отдаёт ссылку только через maskDeepLinkForLog.
 */

// зачем (ревью 8H): после вырезания вызовов маски и ключей `url:`/`target:` любое оставшееся
// упоминание url/target — сырая ссылка (лог без JSON.stringify, `${url}`, String(target)…).
function rawLinkLeaks(statement: string): boolean {
  const rest = statement
    .replace(/maskDeepLinkForLog\(\s*[A-Za-z_$][\w$.]*\s*\)/g, '')
    .replace(/\b(url|target)\s*:/g, '');
  return /\b(url|target)\b/.test(rest);
}

describe('8H — маскировка ссылки', () => {
  test('схема, путь и имена параметров остаются; значения и фрагмент — ***', () => {
    expect(maskDeepLinkForLog('phraseman://dev/login?email=a@b.test&password=secret#tok'))
      .toBe('phraseman://dev/login?email=***&password=***#***');
    expect(maskDeepLinkForLog('/lesson/3?ref=push&flag')).toBe('/lesson/3?ref=***&***');
    expect(maskDeepLinkForLog('https://u:p@host.test/x?t=1')).toBe('https://***@host.test/x?t=***');
    expect(maskDeepLinkForLog('/x?eyJhbGciOiJIUzI1NiJ9')).toBe('/x?***');
    expect(maskDeepLinkForLog('https://knowlyapps.com/start/')).toBe('https://knowlyapps.com/start/');
    expect(maskDeepLinkForLog(null)).toBe('null');
    expect(maskDeepLinkForLog(42)).toBe('<number>');
    expect(maskDeepLinkForLog('/x?' + 'n'.repeat(80) + '=v')).toBe(`/x?${'n'.repeat(40)}=***`);
  });

  test('сторож: логи [V2-PAGE] deeplink: не печатают сырой url/target', () => {
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
      }
    };
    walk(path.join(__dirname, '..', 'app'));
    const offenders: string[] = [];
    let checked = 0;
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      let from = source.indexOf('[V2-PAGE] deeplink:');
      while (from >= 0) {
        const statement = source.slice(from, source.indexOf(');', from));
        checked += 1;
        if (rawLinkLeaks(statement)) offenders.push(path.relative(path.join(__dirname, '..'), file));
        from = source.indexOf('[V2-PAGE] deeplink:', from + 1);
      }
    }
    expect(checked).toBeGreaterThanOrEqual(3);
    // мутации: сторож обязан ловить небрежные варианты
    expect(rawLinkLeaks('[V2-PAGE] deeplink:x", url')).toBe(true);
    expect(rawLinkLeaks('[V2-PAGE] deeplink:x ${url}`')).toBe(true);
    expect(rawLinkLeaks('[V2-PAGE] deeplink:x", JSON.stringify({ url: maskDeepLinkForLog(url), target: String(target) })')).toBe(true);
    expect(rawLinkLeaks('[V2-PAGE] deeplink:x", JSON.stringify({ url })')).toBe(true);
    expect(rawLinkLeaks('[V2-PAGE] deeplink:url_event", JSON.stringify({ url: maskDeepLinkForLog(url), target: maskDeepLinkForLog(target) })')).toBe(false);
    expect(offenders).toEqual([]);
  });
});
