// зачем (координатор 13.10, B1 «Авторизация: скорость входа»): вкладка «Уроки» собиралась под онбордингом ≈9 с входа — фоновый премаунт вкладок
// стартовал по потолку whenHomePainted (Главная под онбордингом не рисуется). Теперь старт премаунта ждёт конец онбординга.
import fs from 'node:fs';
import path from 'node:path';
import {
  __resetOnboardingDeferGateForTests,
  isOnboardingDeferActive,
  setOnboardingDeferActive,
  whenOnboardingSettled,
} from '../app/onboarding_defer_gate';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('фоновый премаунт вкладок ждёт онбординг', () => {
  const layout = read('app/(tabs)/_layout.tsx');

  it('startPremount не зовёт scheduleBackgroundPremount напрямую, а ждёт whenOnboardingSettled', () => {
    const start = layout.indexOf('const startPremount = (reason: string) => {');
    expect(start).toBeGreaterThan(0);
    const body = layout.slice(start, layout.indexOf('if (startTabIdxRef.current === 0) {', start));
    expect(body).toContain("whenOnboardingSettled('tabs_premount')");
    expect(body).toContain('if (cancelled) return;');
    // единственный вызов scheduleBackgroundPremount внутри startPremount — после ожидания
    expect(body.indexOf('scheduleBackgroundPremount()')).toBeGreaterThan(body.indexOf("whenOnboardingSettled('tabs_premount')"));
    expect(body.match(/scheduleBackgroundPremount\(\)/g)?.length).toBe(1);
  });

  it('тап по вкладке по-прежнему монтирует её сразу и онбординг не ждёт', () => {
    const mountNowStart = layout.indexOf('const mountNow = useCallback((idx: number) => {');
    const mountNowBody = layout.slice(mountNowStart, mountNowStart + 1800);
    expect(mountNowBody).not.toContain('whenOnboardingSettled');
  });

  it('журнал [LESSONS-REBUILD]: итог ожидания и монтирование вкладки «Уроки» с состоянием онбординга', () => {
    expect(layout).toContain("console.log('[LESSONS-REBUILD] premount_release'");
    const lessons = read('app/(tabs)/lessons.tsx');
    expect(lessons).toContain('[LESSONS-REBUILD] lessons_tab_mounted');
    expect(lessons).toContain('onboardingActive: isOnboardingDeferActive()');
  });
});

describe('ворота онбординга: поведение для премаунта', () => {
  beforeEach(() => { __resetOnboardingDeferGateForTests(); jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('онбординг идёт → премаунт ждёт; онбординг закончился → отпускается', async () => {
    setOnboardingDeferActive(true, 'test');
    expect(isOnboardingDeferActive()).toBe(true);
    let released = false;
    const waiting = whenOnboardingSettled('tabs_premount').then((o) => { released = true; return o; });
    await Promise.resolve();
    expect(released).toBe(false);
    setOnboardingDeferActive(false, 'test');
    await expect(waiting).resolves.toBe('finished');
    expect(isOnboardingDeferActive()).toBe(false);
  });

  it('состояние неизвестно или онбординга нет → сразу, прежнее поведение', async () => {
    expect(isOnboardingDeferActive()).toBeNull();
    await expect(whenOnboardingSettled('tabs_premount')).resolves.toBe('unknown');
    setOnboardingDeferActive(false, 'test');
    await expect(whenOnboardingSettled('tabs_premount')).resolves.toBe('not_active');
  });
});
