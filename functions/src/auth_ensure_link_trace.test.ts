import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createAuthEnsureLinkTrace } from './auth_identity';

// зачем ([AUTH-ENSURE-LINK], координатор 14.10, ACC-SPEED): authEnsureStableLink на тёплом инстансе отвечает 3,3–3,6 с —
// сперва логи стадий, потом ускорение. Сторож: трассировка пишет стадию и миллисекунды, каждый выход назван, без uid.
const SRC = readFileSync(join(__dirname, 'auth_identity.ts'), 'utf8');

afterEach(() => jest.restoreAllMocks());

describe('[AUTH-ENSURE-LINK]', () => {
  it('стадия, её длительность и время от старта', () => {
    let t = 100;
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const trace = createAuthEnsureLinkTrace(() => t);
    t = 400;
    trace.mark('deletion_checks', { provider: 'google' });
    t = 1_100;
    trace.mark('return:b2');
    const lines = log.mock.calls.map(([line]) => JSON.parse(String(line)));
    expect(lines[0]).toMatchObject({ tag: '[AUTH-ENSURE-LINK]', stage: 'deletion_checks', ms: 300, sinceStartMs: 300, provider: 'google' });
    expect(lines[1]).toMatchObject({ stage: 'return:b2', ms: 700, sinceStartMs: 1000 });
    expect(trace.total()).toBe(1000);
  });

  it('каждый выход ensureStableLinkForAuth назван веткой; обработчик пишет итог и сбой', () => {
    // зачем (координатор 18.10): тело вынесено в ensureStableLinkForAuthOnce — снаружи только обёртка памяти чтений на вызов.
    const start = SRC.indexOf('async function ensureStableLinkForAuthOnce(');
    expect(start).toBeGreaterThan(0);
    const fn = SRC.slice(start, SRC.indexOf('\n}\n', start));
    const wrapper = SRC.slice(SRC.indexOf('export async function ensureStableLinkForAuth('), start);
    expect(wrapper).toContain('identityReadMemo.run(new Map(), () => ensureStableLinkForAuthOnce(');
    expect(fn.match(/return done\('b\d+', \{ ok: true/g)?.length ?? 0).toBe(8);
    expect(fn).not.toMatch(/\n\s*return \{ ok: true/);
    expect(SRC).toContain("event: 'auth_ensure_link_done', tag: '[AUTH-ENSURE-LINK]'");
    expect(SRC).toContain("event: 'auth_ensure_link_failed', tag: '[AUTH-ENSURE-LINK]'");
  });

  it('прогрев по-прежнему отвечает до любой работы', () => {
    const handler = SRC.slice(SRC.indexOf('export const authEnsureStableLink'));
    expect(handler.indexOf('if (request.data?.warmup === true) return { ok: true, warm: true };'))
      .toBeLessThan(handler.indexOf('createAuthEnsureLinkTrace()'));
  });
});
