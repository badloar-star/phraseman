/*
 * Пакет 8H (TG-5F6CFA464B29) — маскировка ссылок в логах диплинка.
 *
 * зачем: логи `[V2-PAGE] deeplink:*` печатали ссылку целиком — с параметрами; в E2E туда
 * попал пароль тестового входа. Оставляем схему, путь и ИМЕНА параметров, значения → `***`,
 * фрагмент `#…` → `#***`. Для разбора хватает «куда вела ссылка и какие параметры были».
 * Без URL-парсера платформы: строки диплинка бывают относительными (`/lesson?x=1`).
 * Логин/пароль в адресе (`//user:pass@host`) → `//***@host`; параметр без `=` (голый токен) → `***`.
 * Ограничение: ПУТЬ не маскируется — секретов в путях приложения нет (только `[id]`/`[family]`).
 */

const MAX_NAME = 40;

export function maskDeepLinkForLog(raw: unknown): string {
  if (typeof raw !== 'string') return raw === null || raw === undefined ? String(raw) : `<${typeof raw}>`;
  const hashAt = raw.indexOf('#');
  const beforeHash = hashAt >= 0 ? raw.slice(0, hashAt) : raw;
  const queryAt = beforeHash.indexOf('?');
  // зачем (ревью 8H): `https://u:p@host` иначе печатался как есть.
  const base = (queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash).replace(/\/\/[^/@]*@/, '//***@');
  let out = base;
  if (queryAt >= 0) {
    const names = beforeHash.slice(queryAt + 1).split('&').filter((part) => part.length > 0).map((part) => {
      const eq = part.indexOf('=');
      // зачем (ревью 8H): `?<токен>` без `=` — это значение, а не имя; печатать нельзя.
      if (eq < 0) return '***';
      const name = part.slice(0, eq).slice(0, MAX_NAME);
      return `${name}=***`;
    });
    out += `?${names.join('&')}`;
  }
  if (hashAt >= 0) out += '#***';
  return out;
}

/* expo-router route shim: utility module discovered as a route */
export default function __RouteShim() { return null; }
