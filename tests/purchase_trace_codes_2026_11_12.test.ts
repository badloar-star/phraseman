// [PURCHASE-TRACE] (владелец 12.11 «подписка после оплаты не включается», правило «сперва логи»): коды причин на пути покупки
// уходят в журнал поддержки только если проходят схему журнала (строчные буквы/цифры/подчёркивания, ≤ 40, не похожи на id).
// Код, отброшенный схемой, молча пропал бы — этот сторож держит все новые коды в схеме. Сработал — чини код, а не сторожа.
import * as fs from 'fs';
import * as path from 'path';

import { isValidReleaseReasonCode } from '../app/release_reason';

const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('[PURCHASE-TRACE] коды пути покупки проходят схему журнала поддержки', () => {
  it('все варианты новых кодов допустимы', () => {
    const codes: string[] = [];
    for (const plan of ['monthly', 'yearly', 'lifetime']) codes.push(`applied_${plan}`);
    for (const d of ['activate', 'reload', 'stale']) codes.push(`activation_${d}`);
    for (const where of ['bg', 'check']) {
      for (const outcome of ['deactivated', 'kept', 'failed']) {
        for (const why of ['inactive', 'rc_expired', 'premium_expired', 'rc_never_seen', 'rc_stale']) codes.push(`revoke_${where}_${outcome}_${why}`);
      }
    }
    for (const p of 'yn') for (const m of 'yn') for (const s of 'yn') for (const a of 'yn') codes.push(`noent_p${p}_m${m}_s${s}_a${a}`);
    expect(codes.filter((code) => !isValidReleaseReasonCode(code))).toEqual([]);
  });

  it('коды стоят на местах: успех покупки, отказ магазина, решение экрана подписки, оба выключения Plus', () => {
    const purchase = read('app/paywall_purchase.ts');
    expect(purchase).toContain("releaseReason('purchase', `applied_${confirmedPlan}`, 'info');");
    expect(purchase.indexOf("releaseReason('purchase', `noent_p")).toBeGreaterThan(purchase.indexOf("releaseReason('purchase', 'no_entitlement', 'blocked');"));
    expect(read('components/PremiumContext.tsx')).toContain("releaseReason('purchase', `activation_${disposition}`, 'info');");
    const guard = read('app/premium_guard.ts');
    expect(guard).toContain("releaseReason('purchase', `revoke_bg_${outcome}_${revokeReasonCode(snapshot, now)}`, 'info');");
    expect(guard).toContain("releaseReason('purchase', `revoke_check_${outcome}_${revokeReasonCode(snapshot, Date.now())}`, 'info');");
  });
});
