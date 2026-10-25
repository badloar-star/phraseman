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
    expect(unknown.filter((rel) => !baseline.includes(rel))).toEqual([]); // новый экран — сразу в реестр app/navigation_back.ts
  });

  it('в базе нет лишнего: добавленный в реестр или удалённый экран убран из базы', () => {
    const stale = baseline.filter((rel) => !fs.existsSync(path.join(ROOT, rel)) || navigationRoutePolicyForAudit(routeOf(rel)).role !== 'unknown');
    expect(stale).toEqual([]);
  });
});
