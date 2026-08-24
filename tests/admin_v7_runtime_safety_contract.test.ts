import { readFileSync } from 'node:fs';
import path from 'node:path';

const adminHtml = readFileSync(
  path.join(process.cwd(), 'admin', 'v2', 'legacy.html'),
  'utf8',
);

describe('admin V9 runtime safety contract', () => {
  it('ships the intentional V9 build marker with the V7 stabilization runtimes on the canonical surface', () => {
    expect(adminHtml).toContain(
      '2026-08-18-v9-live-layout-theme-moderation-notes',
    );
    expect(adminHtml).toContain('id="pm-v7-ready-style"');
    expect(adminHtml).toContain('id="pm-v7-full-audit-runtime"');
    expect(adminHtml).toContain('pm-v7-full-audit-ready');
  });

  it('keeps login initialization and the Google click handler intact', () => {
    expect(adminHtml).toContain('browserLocalPersistence');
    expect(adminHtml).toContain('getRedirectResult(auth)');
    expect(adminHtml).toContain('window._pmAdminGoogleSignIn = handleAdminGoogleSignIn;');
    expect(adminHtml).toContain("if(typeof window._pmAdminGoogleSignIn==='function'){window._pmAdminGoogleSignIn();}");
  });

  it('does not install a broad client App Check interceptor over unrelated admin buttons', () => {
    expect(adminHtml).not.toContain('const CRITICAL_MUTATION=');
    expect(adminHtml).not.toContain("window.pmV5RevalidateManagedAccess('critical-mutation',true)");
    expect(adminHtml).not.toMatch(
      /document\.addEventListener\('click',async event=>[\s\S]*?await window\.pmRequireAdminAppCheck\(\)/,
    );
  });

  it('keeps owner-sealed App Check out of the live admin transport', () => {
    expect(adminHtml).not.toContain('await window.pmRequireAdminAppCheck?.();');
    expect(adminHtml).not.toContain(
      'window.pmRequireAdminAppCheck = requireAdminAppCheckForGiftCertificates;',
    );
    expect(adminHtml).not.toContain('firebase-app-check.js');
    expect(adminHtml).not.toContain('requireAdminAppCheckForGiftCertificates');
    expect(adminHtml).not.toContain('X-Firebase-AppCheck');
    expect(adminHtml).toContain('function createAdminAuthCallable(name)');
  });

  it('keeps the unfinished access-management scaffold fail-closed and off the live surface', () => {
    expect(adminHtml).toContain(
      'window.PMStrictRemediation=Object.freeze({version:\'2026-08-18\',exactEye:true,managedRbacUi:false',
    );
    expect(adminHtml).toMatch(
      /#tab-access-management,[\s\S]*?\[data-admin-goto="access-management"\]\s*\{\s*display:none\s*!important;\s*\}/,
    );
    expect(adminHtml).toContain(
      "if(location.hash==='#access-management'){try{window.switchTab?.('control-panel')}",
    );
    expect(adminHtml).toContain(
      "if(_pmV5AccessState.enforcementReady!==true)throw new Error('Серверная матрица прав ещё не подтверждена. Выдача доступа заблокирована.')",
    );
    expect(adminHtml).toContain(
      "if(_pmV5AccessState.enforcementReady!==true)throw new Error('Серверная матрица прав ещё не подтверждена. Удаление доступа заблокировано.')",
    );
  });

  it('binds onboarding color stats through a module-owned listener instead of an inline scope leak', () => {
    expect(adminHtml).not.toMatch(/id="pab-include-dev"[^>]*onchange=/);
    const start = adminHtml.indexOf('function bindOnboardingColorStatsControl(');
    const end = adminHtml.indexOf('\n  }', start);
    expect(start).toBeGreaterThan(0);
    const binder = adminHtml.slice(start, end + 4);
    expect(binder).toContain("addEventListener('change'");
    expect(adminHtml).toContain('bindOnboardingColorStatsControl();');

    const listeners: Record<string, () => void> = {};
    const control = {
      dataset: {} as Record<string, string>,
      addEventListener: (event: string, callback: () => void) => { listeners[event] = callback; },
    };
    const execute = new Function(
      'rootDocument',
      `${binder}\nlet calls = 0; let window = {_pabRangeDays: 14}; function loadOnboardingColorStats(days){ if(days === 14) calls += 1; } bindOnboardingColorStatsControl(rootDocument); return () => calls;`,
    )({ getElementById: (id: string) => id === 'pab-include-dev' ? control : null }) as () => number;
    listeners.change();
    expect(execute()).toBe(1);
  });
});
