/**
 * Сторож экрана «Подписка Plus» (координатор 13.10).
 *
 * зачем: у 6 причин отмены не было `en`, а вызов клал `r.ru` в слот en — английский интерфейс видел причины по-русски.
 * И dev `saveOffer=progress|support` открывает шаг удержания без тапов (кадры paywalls-024 / profile-022), только в dev.
 */
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('manage_subscription: причины отмены и шаг удержания', () => {
  const src = read('app/manage_subscription.tsx');

  it('каждая причина отмены имеет en, вызов передаёт r.en в слот английского', () => {
    const block = src.slice(src.indexOf('const CANCEL_REASONS'), src.indexOf('];', src.indexOf('const CANCEL_REASONS')));
    const rows = block.split('\n').filter((line) => line.includes("{ key: '"));
    expect(rows).toHaveLength(6);
    for (const row of rows) expect(row).toMatch(/ en: '[^']+'/);
    expect(src).toContain("LP(r.ru, r.uk, r.en, r.es, r['pt-BR'], r.vi, r.id, r.tr, r.pl)");
    expect(src).not.toContain('LP(r.ru, r.uk, r.ru,');
  });

  it('dev saveOffer: шаг удержания сразу, одно открытие, заглушка стор-сборки экспортирует те же имена', () => {
    expect(src).toContain('const devStep = takeDevSaveOfferOpen();');
    expect(src).toContain("setCancelStep('offer');");
    const dev = read('app/dev_save_offer_progress.ts');
    expect(dev).toContain('openStep = null;');
    const stub = read('store_release_stubs/dev_state/dev_save_offer_progress_stub.ts');
    expect(stub).toContain('export function takeDevSaveOfferOpen(): null { return null; }');
    expect(stub).toContain('export function setDevSaveOfferOpen(): boolean { return false; }');
    expect(read('app/dev_state_fixtures.ts')).toContain("pick('saveOffer', ['progress', 'support', 'off'] as const)");
  });
});
