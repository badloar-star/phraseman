// PM-230 (A2) — права админки: каждый admin*-эндпоинт обязан проверять права.
//
// зачем: админские callable-функции меняют конфиг, выдают сертификаты, читают
// почту поддержки. Новая функция без проверки claim/permission = дыра для любого
// вошедшего. Тест ищет `export const admin... = onCall(` и требует в теле
// проверку (requireX/assertX/hasClaimedPermission/request.auth/permission).
// Эндпоинты, которые только делегируют обработчику, перечислены в DELEGATED с
// указанием обработчика — тест проверяет проверку уже В НЁМ.
// App Check здесь НЕ проверяется и не включается (пломба 2026-08-17).
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SRC = __dirname;
const GUARD = /require[A-Z]\w*|assert[A-Z]\w*|hasClaimedPermission|hasVerifiedCallablePermission|authorize\w*|request\.auth|isAdmin|permission|ensure[A-Z]\w*|admin_only/;

// endpoint → [файл, имя обработчика, проверка внутри обработчика]
const DELEGATED: Record<string, [string, string, RegExp]> = {
  adminPublishNavLayout: ['admin_config_controls.ts', 'async function publishConfig', /requireAdminConfigActor/],
  adminPublishAlertsConfig: ['admin_config_controls.ts', 'async function publishConfig', /requireAdminConfigActor/],
  adminListGlobalBroadcasts: ['admin_global_broadcast.ts', 'export const adminListGlobalBroadcasts', /roleFor\(request, 'campaigns\.read'\)/],
  adminProductAnalytics: ['admin_product_analytics.ts', 'export async function handleAdminProductAnalytics', /hasVerifiedCallablePermission/],
  adminSubscriptionAnalytics: ['admin_subscription_analytics.ts', 'export async function handleAdminSubscriptionAnalytics', /hasVerifiedCallablePermission/],
  adminCreateV2GenerationPlan: ['admin_v2_generation.ts', 'export async function handleAdminCreateV2GenerationPlan', /authenticateRootOwner|requireV2ConfiguredRootOwnerV1|requireAdmin|permission/],
  adminSupportDispatchReply: ['support_inbox.ts', 'async function handleSupportReplyDispatch', /requireSupportPermission\(request, 'support\.reply\.send'\)/],
  adminSupportSendReply: ['support_inbox.ts', 'async function handleSupportReplyDispatch', /requireSupportPermission\(request, 'support\.reply\.send'\)/],
};

interface Endpoint { file: string; name: string; body: string }

function collect(): Endpoint[] {
  const out: Endpoint[] = [];
  const re = /export\s+const\s+(admin\w+)\s*=\s*onCall\s*\(/g;
  for (const file of readdirSync(SRC)) {
    if (!file.endsWith('.ts') || file.endsWith('.test.ts') || file.startsWith('max_')) continue;
    const text = readFileSync(path.join(SRC, file), 'utf8');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const next = text.indexOf('\nexport ', m.index + 10);
      out.push({ file, name: m[1]!, body: text.slice(m.index, next < 0 ? text.length : next) });
    }
  }
  return out;
}

describe('PM-230 admin callables: проверка прав', () => {
  const endpoints = collect();

  it('нашли админские эндпоинты (защита от пустого прохода)', () => {
    expect(endpoints.length).toBeGreaterThan(150);
  });

  it('каждый admin*-эндпоинт проверяет права сам или через перечисленный обработчик', () => {
    const unguarded = endpoints.filter((e) => !GUARD.test(e.body)).map((e) => e.name);
    const unexpected = unguarded.filter((n) => !(n in DELEGATED));
    expect(unexpected).toEqual([]);
  });

  it('делегированные обработчики проверяют права внутри', () => {
    const problems: string[] = [];
    for (const [name, [file, marker, guard]] of Object.entries(DELEGATED)) {
      const text = readFileSync(path.join(SRC, file), 'utf8');
      const at = text.indexOf(marker);
      if (at < 0) { problems.push(`${name}: обработчик «${marker}» не найден в ${file}`); continue; }
      const window = text.slice(at, at + 1500);
      if (!guard.test(window)) problems.push(`${name}: в ${file} после «${marker}» нет проверки ${guard}`);
    }
    expect(problems).toEqual([]);
  });

  it('список делегатов не устарел: каждый всё ещё не проходит прямую проверку', () => {
    const byName = new Map(endpoints.map((e) => [e.name, e]));
    const stale = Object.keys(DELEGATED).filter((n) => !byName.has(n) || GUARD.test(byName.get(n)!.body));
    expect(stale).toEqual([]);
  });
});
