// зачем (координатор 15.10, paywalls-023/024, paywall-gap-011; правило «не сливается» и «стекло непрозрачное»): плашки причин/цифр на шторках подписки не берут opaqueControl (сливался со шторкой),
// а тост не прозрачный. Контраст самой заливки плашки к шторке во всех темах проверяет buttons_never_merge_audit (отключённая ≥ 1,5 : 1).
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';

const read = (rel: string): string => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));

describe('плашки подписки и тосты — плотные и не сливаются', () => {
  it('причины отмены, цифры предложения и поле «другое» стоят на buttonFillDisabled', () => {
    const src = read('app/manage_subscription.tsx');
    expect(src).toContain('sel ? glass.selected : glass.buttonFillDisabled');
    expect((src.match(/S\.offerStat, \{ backgroundColor: glass\.buttonFillDisabled \}/g) ?? []).length).toBe(2);
    expect(src).toContain('S.input, { backgroundColor: glass.buttonFillDisabled');
    expect(src).not.toContain('S.reasonRow, { backgroundColor: sel ? glass.selected : glass.opaqueControl');
  });
  it('верх карточки тоста — opaqueCard (не полупрозрачный card)', () => {
    const src = read('components/ActionToast.tsx');
    expect(src).toContain('cardColors: [glass.opaqueCard, glass.opaqueControl, glass.opaqueControl]');
    expect(src).not.toContain('cardColors: [glass.card,');
  });
});
