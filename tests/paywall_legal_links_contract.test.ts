import fs from 'node:fs';
import path from 'node:path';
import { KNOWLY_LEGAL_PRIVACY_URL, KNOWLY_LEGAL_TERMS_URL } from '../app/config';

// зачем (аудит R58 #1, координатор 15.10): «Условия» и «Конфиденциальность» на пейволе Plus вели на phraseman.app —
// такого домена нет. Пейвол без рабочих юридических ссылок — повод отказа стора. Сторож: в коде приложения нет
// ссылок на phraseman.app, а пейвол берёт адреса из app/config.ts (тот же источник, что онбординг и экран политики).
const ROOT = path.join(__dirname, '..');
const CODE_DIRS = ['app', 'components', 'hooks', 'modules', 'constants'];

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
}

describe('legal links on the paywall', () => {
  it('no app code links to the non-existent phraseman.app domain', () => {
    const files: string[] = [];
    for (const dir of CODE_DIRS) {
      const abs = path.join(ROOT, dir);
      if (fs.existsSync(abs)) walk(abs, files);
    }
    const offenders = files
      .filter((file) => /https?:\/\/(www\.)?phraseman\.app\b/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(ROOT, file));
    expect(offenders).toEqual([]);
  });

  it('PaywallPlus uses the shared Knowly legal URLs through the shared opener', () => {
    const src = fs.readFileSync(path.join(ROOT, 'components/paywall/PaywallPlus.tsx'), 'utf8');
    expect(src).toMatch(/const TERMS_URL = KNOWLY_LEGAL_TERMS_URL;/);
    expect(src).toMatch(/const PRIVACY_URL = KNOWLY_LEGAL_PRIVACY_URL;/);
    expect(src).toMatch(/openLegalLink\(url, 'paywall_plus'\)/);
    expect(KNOWLY_LEGAL_TERMS_URL).toMatch(/^https:\/\/knowlyapps\.com\/legal\/terms\/$/);
    expect(KNOWLY_LEGAL_PRIVACY_URL).toMatch(/^https:\/\/knowlyapps\.com\/legal\/privacy\/$/);
  });

  // зачем (аудит R58 #53): в онбординге, окне регистрации и на экранах документов ссылку открывали без .catch — при сбое тишина
  it('the shared opener catches the failure and shows a toast', () => {
    const helper = fs.readFileSync(path.join(ROOT, 'app/open_legal_link.ts'), 'utf8');
    expect(helper).toMatch(/Linking\.openURL\(url\)\.catch[\s\S]{0,400}action_toast/);
  });

  it('no screen opens the Knowly legal URLs with a raw Linking.openURL', () => {
    const files: string[] = [];
    for (const dir of CODE_DIRS) {
      const abs = path.join(ROOT, dir);
      if (fs.existsSync(abs)) walk(abs, files);
    }
    const raw = files
      .filter((file) => /Linking\.openURL\(KNOWLY_LEGAL_(TERMS|PRIVACY)_URL\)/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(ROOT, file));
    expect(raw).toEqual([]);
  });
});
