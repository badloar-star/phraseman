// зачем (владелец 04.10): «Подключить» всплывало после закрытия вкладки, а английский канал давал ложное
// «Выбран другой канал» — сверка шла с внутренним номером каталога вместо YouTube-id. Без новых секретов.
import * as fs from 'fs';
import * as path from 'path';

const admin = fs.readFileSync(path.join(__dirname, '..', 'admin', 'v2', 'legacy.html'), 'utf8');
const block = admin.slice(admin.indexOf('const VP_YT_CLIENT_ID'), admin.indexOf("byId('vp-transcript-file')?.addEventListener"));

describe('YouTube: подключение один раз, сверка по YouTube-id', () => {
  it('сверка канала по youtubeChannelId, а не по внутреннему номеру каталога', () => {
    expect(block).toContain("const expectedYt=String(channel?.youtubeChannelId||'')");
    expect(block).toContain('got.some((it)=>it.id===expectedYt)');
    expect(block).not.toContain('ids.includes(channelId)');
  });
  it('токен в localStorage, не в sessionStorage; тихое обновление по подсказке аккаунта', () => {
    expect(block).toContain('localStorage.setItem(VP_YT_STORE');
    expect(block).not.toContain('sessionStorage');
    expect(block).toContain('login_hint:hint');
  });
  it('факт подключения — в Firestore без токенов', () => {
    const bridge = admin.slice(admin.indexOf('window.pmYoutubeConnections = {'), admin.indexOf('// === Learning V2 · Генератор E1'));
    expect(bridge).toContain("doc(db, 'admin_youtube_connections', 'state')");
    expect(bridge).not.toMatch(/accessToken|access_token/);
    expect(block).toMatch(/const record=\{youtubeChannelId:expectedYt,title:[^}]*accountHint,connectedAtMs:Date\.now\(\)\}/);
  });
  it('логи [VIDEO-TRANSCRIPT]: что ждали, что вернул Google, откуда статус', () => {
    expect(block).toContain("'[VIDEO-TRANSCRIPT] admin connect start'");
    expect(block).toContain("'[VIDEO-TRANSCRIPT] admin connect google returned'");
    expect(block).toContain("'[VIDEO-TRANSCRIPT] admin connections from firestore'");
  });
});
