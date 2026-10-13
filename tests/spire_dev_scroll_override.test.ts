// зачем (координатор 13.10, №25б): Сверке нужен кадр верха башни Пика (конус и навершие). dev_state?spireScroll=top прокручивает окно к началу сцены;
// в стор-сборке параметр вырезан заглушкой, значение живёт только в памяти процесса.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('dev-параметр spireScroll=top', () => {
  const dev = read('app/dev_spire_tier.ts');
  const fixtures = read('app/dev_state_fixtures.ts');
  const stub = read('store_release_stubs/dev_state/dev_spire_tier_stub.ts');
  const tower = read('components/spire/SpireTower.tsx');

  it('параметр ссылки разбирается (top|off) и применяется шагом dev_state', () => {
    expect(fixtures).toContain("spireScroll?: 'top' | 'off';");
    expect(fixtures).toContain("request.spireScroll = pick('spireScroll', ['top', 'off'] as const);");
    expect(fixtures).toContain("setDevSpireScrollOverride } = await import('./dev_spire_tier')");
  });

  it('только dev: геттер в стор-сборке всегда null, установка отклоняется с логом; стор-заглушка без подмены', () => {
    expect(dev).toContain('return devAvailable() ? scrollOverride : null;');
    expect(dev).toContain("console.warn('[DEV-STATE] spireScroll: отклонено — не dev-сборка'");
    expect(stub).toContain('export function setDevSpireScrollOverride(): boolean { return false; }');
    expect(stub).toContain('export function getDevSpireScrollOverride(): null { return null; }');
  });

  it('башня при spireScroll=top прокручивается к началу сцены и пишет [SPIRE-SCROLL] top с gotY', () => {
    expect(tower).toContain("getDevSpireScrollOverride() === 'top'");
    expect(tower).toContain("'[SPIRE-SCROLL] top'");
  });
});
