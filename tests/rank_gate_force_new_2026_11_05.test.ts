// зачем (владелец 05.11 07:1x: «принудительно новый для моего аккаунта»): хэш uid в числовом ключе remote config; одна функция на клиенте и копия-скрипт для Ядра.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { isRankGateForcedNew, rankGateUidHash } from '../app/rank_gate_uid_hash';
import { applyRemoteConfigSnapshot, getRemoteNumber } from '../app/remote_flags';
import { decideForUser } from '../app/rank_gate_decision';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('принудительно «новый» аккаунт по хэшу uid', () => {
  afterEach(() => { applyRemoteConfigSnapshot({}); });

  it('хэш стабилен, 31-битный, ненулевой, различает uid', () => {
    const h = rankGateUidHash('abc123');
    expect(h).toBe(rankGateUidHash('abc123'));
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThanOrEqual(2147483647);
    expect(rankGateUidHash('abc124')).not.toBe(h);
    expect(rankGateUidHash('Nova-95934-тест')).toBeGreaterThan(0);
  });

  it('скрипт Ядра считает то же число, что клиент (кириллица тоже)', () => {
    for (const uid of ['abc123', 'user-ÿ-95934', 'Нова']) {
      const out = execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts/rank_gate_uid_hash.mjs'), uid]).toString().trim();
      expect(Number(out)).toBe(rankGateUidHash(uid));
    }
  });

  it('ключ выключен по умолчанию (0); Пульт включает числом; принудительно «новым» только совпавший uid', () => {
    applyRemoteConfigSnapshot({});
    expect(getRemoteNumber('rank_gates_force_new_uid_hash')).toBe(0);
    expect(isRankGateForcedNew('abc123', 0)).toBe(false);
    const h = rankGateUidHash('abc123');
    applyRemoteConfigSnapshot({ numbers: { rank_gates_force_new_uid_hash: h } });
    expect(getRemoteNumber('rank_gates_force_new_uid_hash')).toBe(h);
    expect(isRankGateForcedNew('abc123', h)).toBe(true);
    expect(isRankGateForcedNew('other', h)).toBe(false);
    expect(isRankGateForcedNew(null, h)).toBe(false);
  });

  it('принудительно «новый» старый аккаунт на ранге 0: разделы закрыты, Plus и «Сохранённые» — нет', () => {
    const forced = { isNew: true, reason: 'force_new' } as never;
    const base = { gatesEnabled: true, rank: 0, plusActive: false, plusResolved: true } as const;
    expect(decideForUser('video', { ...base, verdict: forced })).toMatchObject({ status: 'locked' });
    expect(decideForUser('peak', { ...base, verdict: forced })).toMatchObject({ status: 'locked' });
    expect(decideForUser('saved_cards', { ...base, verdict: forced })).toMatchObject({ status: 'allowed' });
    expect(decideForUser('video', { ...base, plusActive: true, verdict: forced })).toMatchObject({ status: 'allowed' });
  });

  it('хук считает вердикт «на лету», в сторадже когорта не меняется; пишет [RANK-GATE] verdict force-new', () => {
    const hook = read('hooks/use_rank_access.ts');
    expect(hook).toContain("isRankGateForcedNew(owner, getRemoteNumber('rank_gates_force_new_uid_hash'))");
    expect(hook).toContain("reason: 'force_new'");
    expect(hook).toContain('[RANK-GATE] verdict force-new');
    expect(read('app/rank_gates_new_user.ts')).not.toMatch(/force_new[^\n]*setItem/);
  });
});
