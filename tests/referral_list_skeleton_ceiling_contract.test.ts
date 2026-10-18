import fs from 'node:fs';
import path from 'node:path';

// зачем (владелец 18.10 08:49, iPhone: «Награда за друга» → «Приглашённые друзья» — вечный скелет, в журнале ни строки о загрузке):
// скелет держался, пока loading ИЛИ пока ключ аккаунта списка не совпал с текущим — при пустом/сменившемся ключе и молчащем
// сервере он не снимался никогда. Теперь: потолок 1,5 с → список или спокойное пустое состояние, загрузка фоном;
// журнал [REFERRAL-LIST] на каждом шаге (вход, кэш/сервер, ранние выходы, catch, итог экрана) — без идентификаторов.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('«Приглашённые друзья»: скелет не вечный, журнал есть', () => {
  const source = read('app/referrals.tsx');

  it('потолок скелета 1,5 с и вид списка решает listView, а не голый visibleLoading', () => {
    expect(source).toContain('const REFERRAL_LIST_SKELETON_CEILING_MS = 1500;');
    expect(source).toContain("const listView: 'skeleton' | 'list' | 'empty' = visibleLoading && !listCeilingPassed ? 'skeleton' : invites.length > 0 ? 'list' : 'empty';");
    expect(source).toContain("{referralUiVisible && (listView === 'skeleton' ? (");
    expect(source).not.toContain('{referralUiVisible && (visibleLoading ? (');
  });

  it('журнал [REFERRAL-LIST]: старт, ранние выходы, ответ сервера, сбой, finally и итог экрана', () => {
    for (const stage of ["'load:start'", "'load:skip'", "'load:done'", "'load:stale_response'", "'load:finally'", "'render'"]) {
      expect(source).toContain(stage);
    }
    expect(source).toContain("stage: 'load:server_not_ok'");
    expect(source).toContain("stage: 'load:failed'");
  });

  it('в журнал не попадают uid, stableId и имена', () => {
    const lines = source.split('\n').filter((line) => line.includes('logReferralList(') || line.includes("'[REFERRAL-LIST]'"));
    for (const line of lines) {
      expect(line).not.toMatch(/stableId\s*[,:}]|\buid\b|displayName|refereeStableId/);
    }
  });
});
