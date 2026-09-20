/**
 * Сторож: под замком аккаунта не выполняется НИ ОДИН сетевой вызов.
 *
 * зачем (владелец 2026-09-20): четыре круга диагноза «диалоги не покупаются»
 * закончились этим корнем. Лог устройства поймал факт:
 *
 *   [ARENA-OUTBOX-GUARD] lock timeout target=en waited=5012ms
 *   — another holder is stuck
 *
 * `withAccountTransitionLock` — честная очередь: ждёт предыдущего владельца
 * БЕЗ таймаута. Стоит одному держателю уйти в сеть, как встают ВСЕ остальные
 * 231 владелец замка: покупка диалога, энергия, спины, подарки. Симптом для
 * человека — «нажимаю, и ничего не происходит», без единой ошибки в журнале.
 *
 * Замок защищает смену ПОКОЛЕНИЯ аккаунта. Сетевой вызов поколение не меняет,
 * поэтому под замком ему делать нечего: сеть выполняется до или после.
 *
 * Сработал сторож — выносить сеть из-под замка, а не расширять allowlist.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'modules', 'hooks'];

const LOCK_CALL = /\bwith(AccountTransitionLock|RestoreApplicationLock)\s*\(/g;

/** Сетевые операции. Локальные AsyncStorage.setItem сюда намеренно не входят. */
const NETWORK = [
  /\bhttpsCallable\s*\(/,
  /\bgetFunctions\s*\(/,
  /\bensureStableAuthLink\s*\(/,
  /\binitFirebaseAppCheck\w*\s*\(/,
  /\bgetIdToken\w*\s*\(/,
  /\bfetch\s*\(/,
  // Только Firestore-батч. `LocalCommitCoordinator.commit()` — локальная запись,
  // ловить её как сеть значит врать: сторож обязан быть точным, иначе его
  // начнут обходить allowlist-ом вместо починки.
  /\bdb\.batch\s*\(\s*\)/,
  /\bbatch\.commit\s*\(/,
  // Открытие шифрованной базы phone-state: по замеру владельца 2026-09-20 —
  // до 5 секунд (integrity_check + расшифровка + проба записи через WAL).
  // Эти проверки снимать НЕЛЬЗЯ (инциденты 13.09 и 14.09), поэтому открытие
  // обязано происходить вне замка.
  /\bopenPhoneStateDatabase\s*\(/,
  /\bcollection\s*\(\s*['"]/,
];

/**
 * Известные и ОСОЗНАННЫЕ исключения. Пусто: новых сюда не добавлять,
 * пока не доказано, что вызов не может ждать сеть.
 */
const ALLOWLIST: readonly string[] = [];

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(full);
      }
    }
  };
  for (const d of SCAN_DIRS) walk(path.join(ROOT, d));
  return out;
}

/** Тело вызова замка: от открывающей скобки до её пары. */
function lockBody(source: string, from: number): string {
  let depth = 1;
  let i = from;
  while (i < source.length && depth > 0) {
    const c = source[i];
    if (c === '(') depth += 1;
    else if (c === ')') depth -= 1;
    i += 1;
  }
  return source.slice(from, i);
}

/**
 * fire-and-forget (`void (async () => { ... })()`) замок НЕ удерживает:
 * он не ожидается. Такие блоки вырезаем перед проверкой.
 */
function stripDetached(body: string): string {
  return body.replace(/void\s*\(async[\s\S]*?\}\)\s*\(\s*\)/g, '');
}

describe('под замком аккаунта нет сетевых вызовов', () => {
  it('ни один держатель замка не уходит в сеть', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles()) {
      const rel = path.relative(ROOT, file).replace(/\\/g, '/');
      if (ALLOWLIST.includes(rel)) continue;

      const source = fs.readFileSync(file, 'utf8');
      LOCK_CALL.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = LOCK_CALL.exec(source)) !== null) {
        const body = stripDetached(lockBody(source, match.index + match[0].length));
        const hit = NETWORK.find((re) => re.test(body));
        if (!hit) continue;
        const line = source.slice(0, match.index).split('\n').length;
        offenders.push(`${rel}:${line} — ${hit.source}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
