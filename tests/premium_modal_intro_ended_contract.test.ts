import fs from 'fs';
import path from 'path';

describe('premium intro-ended context', () => {
  const copySrc = fs.readFileSync(path.join(process.cwd(), 'app', 'paywall_copy.ts'), 'utf8');
  const dispatcherSrc = fs.readFileSync(path.join(process.cwd(), 'app', 'premium_modal.tsx'), 'utf8');

  it('keeps a dedicated intro_ended copy context for all new paywalls', () => {
    expect(copySrc).toContain('PAYWALL_COPY.intro_ended');
    expect(dispatcherSrc).toContain('params: { ...params }');
  });

  it('uses gentle gain-framed copy in the shared paywall copy source', () => {
    const start = copySrc.indexOf('PAYWALL_COPY.intro_ended');
    expect(start).toBeGreaterThan(-1);
    const block = copySrc.slice(start, copySrc.indexOf('PAYWALL_COPY.level_up', start));
    expect(block).toContain('titleRu');
    expect(block).toContain('subtitleRu');
    expect(block).toContain('titleUk');
    expect(block).toContain('titleEs');
  });
});
