// зачем (координатор 25.10, аудит «назад» docs/work/back-button-audit-2026-10-26.md, пункт А): экран, на котором есть «назад»
// (общая ScreenBackButton или safeRouterBack), но которого нет в реестре ролей app/navigation_back.ts, теряет историю:
// popBackCandidate видит leaving.section === null, и «назад» уходит на запасной экран, а не к тому, откуда пришли
// ([NAV-BACK] candidate:reset reason=leaving_no_section). Сторож: каждый такой экран — в реестре (root/child/portal). Кто ещё
// не в реестре — база config/back_nav_registry_baseline.json, она только уменьшается: добавили в реестр — уберите из базы.
import fs from 'fs';
import path from 'path';

import { navigationRoutePolicyForAudit } from '../app/navigation_back';

const ROOT = path.join(__dirname, '..');
const baseline: string[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/back_nav_registry_baseline.json'), 'utf8'));

/**
 * Намеренно без роли — решение владельцев зон, не долг (аудит 26.10, пункт А).
 * Сюда добавлять только с причиной; переход в реестр — убрать отсюда.
 */
const INTENTIONALLY_UNREGISTERED: Readonly<Record<string, string>> = {
  // итог диалога закрывается ✕ и Android-«назад» в хаб (B1 Моментов, bdd4ece38); сессия кладёт итог поверх себя push-ем —
  // с разделом 'dialogs' ✕ вернул бы в только что законченную сессию
  'app/dialogue_v2_completion.tsx': 'B1: ✕ и «назад» в хаб Диалогов, не в законченную сессию',
  // сессию открывает брифинг push-ем — с разделом 'dialogs' «назад» из идущей сессии вернул бы на брифинг (повторный старт, трата
  // энергии) вместо хаба. Решение координатора 26.10 (владелец может вернуть): «назад» из сессии — в хаб, как сейчас
  'app/dialogue_v2_session.tsx': 'координатор 26.10: «назад» из идущей сессии — в хаб (fallback /ai_dialog_home), не на брифинг: брифинг = повторная трата энергии',
};

function routeFiles(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (fs.statSync(path.join(ROOT, rel)).isDirectory()) routeFiles(rel, out);
    else if (name.endsWith('.tsx') && !name.startsWith('_') && !name.startsWith('+')) out.push(rel);
  }
  return out;
}
const routeOf = (rel: string): string => {
  const p = rel.replace(/^app/, '').replace(/\.tsx$/, '').replace(/\/index$/, '');
  return p === '' ? '/' : p;
};

/** dev-экраны (витрины, предпросмотры) людям недоступны — в реестр их не заносим. */
const isDevScreen = (rel: string): boolean => /^app\/(dev_|dev-)|_preview\.tsx$/.test(rel);

/** Экраны с «назад»: рисуют общую кнопку или уходят назад через safeRouterBack. */
const screensWithBack = routeFiles('app').filter((rel) => {
  if (isDevScreen(rel)) return false;
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  return /export default/.test(src) && !/export default function __RouteShim/.test(src) && (/<ScreenBackButton\b/.test(src) || /\bsafeRouterBack\(/.test(src));
});

describe('экраны с «назад» — в реестре ролей навигации', () => {
  it('экран без роли есть только в базе (база только уменьшается)', () => {
    const unknown = screensWithBack.filter((rel) => navigationRoutePolicyForAudit(routeOf(rel)).role === 'unknown');
    // новый экран — сразу в реестр app/navigation_back.ts
    expect(unknown.filter((rel) => !baseline.includes(rel) && !(rel in INTENTIONALLY_UNREGISTERED))).toEqual([]);
  });

  it('в базе и в списке «намеренно» нет лишнего: добавленный в реестр или удалённый экран убран', () => {
    const listed = [...baseline, ...Object.keys(INTENTIONALLY_UNREGISTERED)];
    const stale = listed.filter((rel) => !fs.existsSync(path.join(ROOT, rel)) || navigationRoutePolicyForAudit(routeOf(rel)).role !== 'unknown');
    expect(stale).toEqual([]);
  });

  // зачем (координатор 26.10): сессию диалога нельзя «просто добавить в раздел dialogs» — тогда «назад» вернёт на брифинг
  // и человек потратит энергию второй раз. Краснеет, если роль появилась или выход перестал вести в хаб.
  it('сессия диалога вне реестра: «назад» из идущей сессии ведёт в хаб, а не на брифинг', () => {
    expect(navigationRoutePolicyForAudit('/dialogue_v2_session').role).toBe('unknown');
    const session = fs.readFileSync(path.join(ROOT, 'app/dialogue_v2_session.tsx'), 'utf8');
    const backs = session.match(/safeRouterBack\(router, '([^']+)'/g) ?? [];
    expect(backs.length).toBeGreaterThan(0);
    expect(backs.every((call) => call.endsWith("'/ai_dialog_home'"))).toBe(true);
  });

  it('пункт А аудита: тема, свободный диалог, друзья, «Сегодня» — в разделах; память — портал; «Сообщество» — корень', () => {
    expect(navigationRoutePolicyForAudit('/dialogue_v2_theme')).toEqual({ role: 'child', section: 'dialogs' });
    expect(navigationRoutePolicyForAudit('/dialogue_v2_freeform')).toEqual({ role: 'child', section: 'dialogs' });
    expect(navigationRoutePolicyForAudit('/friends_duel')).toEqual({ role: 'child', section: 'friends' });
    expect(navigationRoutePolicyForAudit('/friends_week_mine')).toEqual({ role: 'child', section: 'friends' });
    expect(navigationRoutePolicyForAudit('/today_tasks')).toEqual({ role: 'child', section: 'home' });
    expect(navigationRoutePolicyForAudit('/dialogue_v2_memory').role).toBe('portal');
    expect(navigationRoutePolicyForAudit('/(tabs)/community')).toEqual({ role: 'root', section: 'friends' });
  });
});
