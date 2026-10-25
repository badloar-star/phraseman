// зачем (координатор 25.10, случай владельца): сервер отказал «нужен Plus», а телефон считает Plus включённым. Прежнее правило
// «есть Plus → dismiss» закрывало окно — человек не видел ни покупки, ни объяснения. Сторож: для source dialogue_v2_freeform_server
// окно показывает вариант «Не видим твой Plus» (контекст plus_server_refused) с причиной в журнале; для всех остальных source и для
// Free — прежнее поведение; контекст ставит только решатель, вызывающие места его не передают.
import fs from 'fs';
import path from 'path';

import {
  PAYWALL_SOURCE_VALUES,
  SERVER_REFUSED_CONTEXT,
  SERVER_REFUSED_SOURCE,
  resolvePremiumModalEntry,
} from '../app/paywall_entry_contract';
import { PREMIUM_CONTEXT_SET } from '../app/premium_context';

const base = { accessResolved: true, impressionId: 'imp_test_1' } as const;

describe('«Не видим твой Plus»: локальный Plus, а сервер отказал', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { warn.mockRestore(); });

  it('the variant is a known source and context', () => {
    expect(PAYWALL_SOURCE_VALUES).toContain(SERVER_REFUSED_SOURCE);
    expect(PREMIUM_CONTEXT_SET.has(SERVER_REFUSED_CONTEXT)).toBe(true);
  });

  it('local Plus + server-refused source → shows the variant, logs the reason', () => {
    const res = resolvePremiumModalEntry({
      ...base, hasPremiumAccess: true,
      params: { context: 'dialog_limit', source: 'dialogue_v2_freeform_server' },
    });
    expect(res.decision).toBe('show');
    if (res.decision !== 'show') return;
    expect(res.entry.context).toBe('plus_server_refused');
    expect(res.entry.source).toBe('dialogue_v2_freeform_server');
    expect(res.entry.entitlementState).toBe('plus');
    expect(warn.mock.calls.map((c) => String(c[0])).some((l) => l.includes('[PAYWALL-ENTRY]') && l.includes('local_plus_server_refused'))).toBe(true);
  });

  it('local Plus + any other source → dismiss as before', () => {
    for (const source of ['dialogue_v2_freeform', 'settings_premium', 'ai_dialog_daily_limit']) {
      const res = resolvePremiumModalEntry({ ...base, hasPremiumAccess: true, params: { context: 'dialog_limit', source } });
      expect(res.decision).toBe('dismiss');
    }
  });

  it('Free + server-refused source → the ordinary paywall of the requested context', () => {
    const res = resolvePremiumModalEntry({
      ...base, hasPremiumAccess: false,
      params: { context: 'dialog_limit', source: 'dialogue_v2_freeform_server' },
    });
    expect(res.decision).toBe('show');
    if (res.decision === 'show') expect(res.entry.context).toBe('dialog_limit');
  });

  it('access not resolved and cache not free → still waits (no flash for subscribers)', () => {
    const res = resolvePremiumModalEntry({
      accessResolved: false, hasPremiumAccess: false, impressionId: 'imp_test_2', cachedEntitlement: 'premium',
      params: { context: 'dialog_limit', source: 'dialogue_v2_freeform_server' },
    });
    expect(res.decision).toBe('wait');
  });

  it('no caller passes plus_server_refused itself — only the resolver sets it', () => {
    const ROOT = path.join(__dirname, '..');
    const allowed = new Set([
      'app/premium_context.ts', 'app/paywall_entry_contract.ts', 'app/paywall_context_texts.ts', 'app/paywall_copy.ts',
      'components/paywall/PaywallContextIcons.tsx', 'components/dev/paywallDevContexts.ts',
    ]);
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) { walk(rel); continue; }
        if (!/\.(ts|tsx)$/.test(e.name) || /\.(test|spec)\./.test(e.name) || allowed.has(rel)) continue;
        if (fs.readFileSync(path.join(ROOT, rel), 'utf8').includes('plus_server_refused')) offenders.push(rel);
      }
    };
    for (const dir of ['app', 'components', 'hooks', 'modules']) walk(dir);
    expect(offenders).toEqual([]);
  });
});
