import fs from 'fs';
import path from 'path';

// зачем (аудит загрузок 11.11, коммит 66f122769): «Управление подпиской» спрашивало магазин строго по очереди и держало
// заготовку без потолка. Правка сделала запросы параллельными и поставила общий потолок. Этот сторож падает, если кто-то
// вернёт очередь, уберёт потолок или даст сбою витрины отнять уже полученные данные покупателя.
const manage = fs
  .readFileSync(path.join(process.cwd(), 'app', 'manage_subscription.tsx'), 'utf8')
  .replace(/\r\n/g, '\n');

// Эффект загрузки экрана: от объявления поколения аккаунта до расчёта данных плана.
const bootstrapStart = manage.indexOf('const generation = screenAccount;');
const bootstrap = manage.slice(bootstrapStart, manage.indexOf('const devPlanForMetadata', bootstrapStart));

describe('manage subscription: чтение магазина и потолок заготовки', () => {
  it('находит эффект загрузки экрана', () => {
    expect(bootstrapStart).toBeGreaterThan(-1);
    expect(bootstrap.length).toBeGreaterThan(200);
  });

  it('данные покупателя и витрина запрашиваются вместе, а не по очереди', () => {
    const together = bootstrap.indexOf('await Promise.all([');
    expect(together).toBeGreaterThan(-1);
    const pair = bootstrap.slice(together, bootstrap.indexOf(']);', together));
    expect(pair).toContain('readRevenueCatCustomerInfoForGeneration(generation)');
    expect(pair).toContain('Purchases.getOfferings()');
    // прежняя очередь: отдельное ожидание витрины после данных покупателя
    expect(bootstrap).not.toMatch(/=\s*await Purchases\.getOfferings\(\)/);
  });

  it('сбой витрины ловится на месте, пишет причину и не отнимает данные покупателя', () => {
    const offerings = bootstrap.indexOf('Purchases.getOfferings().catch(');
    expect(offerings).toBeGreaterThan(-1);
    const handler = bootstrap.slice(offerings, bootstrap.indexOf(']);', offerings));
    expect(handler).toContain("DebugLogger.error('manage_subscription:offerings'");
    expect(handler).toContain('return null;');
    // витрина может не прийти — разбор пакетов обязан это пережить
    expect(bootstrap).toContain('o?.current?.availablePackages');
  });

  it('заготовка снимается по общему потолку и не дольше его', () => {
    const timer = bootstrap.indexOf('const loadCeilingTimer = setTimeout(');
    expect(timer).toBeGreaterThan(-1);
    const ceiling = bootstrap.slice(timer, bootstrap.indexOf('}, LOAD_GATE_TOTAL_MS);', timer));
    expect(ceiling.length).toBeGreaterThan(0);
    expect(ceiling).toContain('setLoading(false);');
    expect(manage).toContain("import { LOAD_GATE_TOTAL_MS } from './load_gate_config';");
    // потолок ставится до начала загрузки, иначе зависший первый шаг его не дождётся
    expect(timer).toBeLessThan(bootstrap.indexOf('void (async () =>'));
  });

  it('потолок не трогает чужой аккаунт и режим съёмки, и убирается за собой', () => {
    const timer = bootstrap.indexOf('const loadCeilingTimer = setTimeout(');
    const ceiling = bootstrap.slice(timer, bootstrap.indexOf('}, LOAD_GATE_TOTAL_MS);', timer));
    const guard = ceiling.indexOf('if (!isBootstrapCurrent() || isDevManageLoadingHold()) return;');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(ceiling.indexOf('setLoading(false);'));
    // таймер гасится и по завершении загрузки, и при уходе с экрана / смене аккаунта
    expect(bootstrap).toMatch(/finally\s*\{\s*clearTimeout\(loadCeilingTimer\);/);
    expect(bootstrap).toMatch(/return \(\) => \{ dead = true; clearTimeout\(loadCeilingTimer\); \};/);
  });
});
