// зачем (владелец 01.10: «больше ничего не нажимаю», секретов не будет): расшифровка из YouTube
// берётся в браузере админки через Google Identity Services (публичный client_id). Сторож:
// никаких серверных OAuth-секретов/функций, токен канала не уходит на сервер и в логи.
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');
const admin = fs.readFileSync(path.join(root, 'admin', 'v2', 'legacy.html'), 'utf8');
const index = fs.readFileSync(path.join(root, 'functions', 'src', 'index.ts'), 'utf8');
const firebaseJson = fs.readFileSync(path.join(root, 'firebase.json'), 'utf8');

describe('YouTube-расшифровка без серверного секрета', () => {
  it('серверных OAuth-функций и секретов нет', () => {
    expect(index).not.toMatch(/youtube_captions_oauth|YOUTUBE_OAUTH_CLIENT/);
    expect(fs.existsSync(path.join(root, 'functions', 'src', 'youtube_captions_oauth.ts'))).toBe(false);
  });
  it('админка: GIS-вход, публичный client_id, скачивание VTT в браузере, общая подгонка времени', () => {
    expect(admin).toContain('https://accounts.google.com/gsi/client');
    expect(admin).toContain("initTokenClient({client_id:VP_YT_CLIENT_ID,scope:VP_YT_SCOPE");
    expect(admin).toContain('tfmt=vtt');
    expect(admin).toContain("call('adminAlignVideoPhraseTranscript',{videoId:state.selectedVideoId,transcript:vtt,phrases:readRows()})");
    expect(admin).not.toMatch(/client_secret|GOCSPX-/);
  });
  it('токен канала не уходит на сервер и в логи', () => {
    const block = admin.slice(admin.indexOf('const VP_YT_CLIENT_ID'), admin.indexOf("byId('vp-transcript-file')?.addEventListener"));
    expect(block.length).toBeGreaterThan(1000);
    expect(block).not.toMatch(/call\([^)]*accessToken/);
    for (const line of block.split('\n').filter((l) => /console\.(log|warn|error)/.test(l))) {
      expect(line).not.toMatch(/console\.(log|warn|error)\([^;]*accessToken/);
    }
  });
  it('CSP админки пропускает вход Google', () => {
    expect(firebaseJson).toMatch(/script-src[^;]*https:\/\/accounts\.google\.com/);
    expect(firebaseJson).toMatch(/connect-src[^;]*https:\/\/accounts\.google\.com/);
  });
});
