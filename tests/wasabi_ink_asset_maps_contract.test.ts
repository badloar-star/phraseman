import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

type ManifestItem = {
  id: string;
  family: string;
  target: string;
  reference: string;
  width: number;
  height: number;
  alpha: boolean;
  consumer: string;
  promptRole: string;
};

const root = path.join(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');
const manifest = JSON.parse(read('scripts/theme_assets/wasabi-ink-production-manifest.json')) as ManifestItem[];
const runtimeRoots = ['app', 'components', 'constants', 'hooks', 'lib', 'modules'] as const;

function runtimeSource(): string {
  const parts: string[] = [];
  const visit = (absoluteDir: string): void => {
    if (!fs.existsSync(absoluteDir)) return;
    for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
      const absolutePath = path.join(absoluteDir, entry.name);
      if (entry.isDirectory()) visit(absolutePath);
      else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.includes('.test.')) {
        parts.push(fs.readFileSync(absolutePath, 'utf8'));
      }
    }
  };
  for (const sourceRoot of runtimeRoots) visit(path.join(root, sourceRoot));
  return parts.join('\n');
}

function metadataFor(files: string[]): Array<{ file: string; width?: number; height?: number; alpha?: boolean; error?: string }> {
  const script = [
    "const sharp=require('sharp');",
    `const files=${JSON.stringify(files)};`,
    '(async()=>{const rows=[];for(const file of files){try{const m=await sharp(file).metadata();rows.push({file,width:m.width,height:m.height,alpha:Boolean(m.hasAlpha)});}catch(error){rows.push({file,error:String(error)});}}process.stdout.write(JSON.stringify(rows));})().catch(error=>{console.error(error);process.exit(1);});',
  ].join('');
  const result = spawnSync(process.execPath, ['--eval', script], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'Sharp metadata check failed');
  return JSON.parse(result.stdout) as Array<{ file: string; width?: number; height?: number; alpha?: boolean; error?: string }>;
}

describe('Wasabi Ink production asset contract', () => {
  test('defines exactly 54 unique runtime-connected deliverables', () => {
    expect(manifest).toHaveLength(54);
    expect(new Set(manifest.map(item => item.id)).size).toBe(54);
    expect(new Set(manifest.map(item => item.target)).size).toBe(54);
    expect(manifest.filter(item => item.id.startsWith('shared.'))).toHaveLength(5);
    for (const item of manifest) {
      expect(item.target).toMatch(/^assets\/(?:images|theme-icons)\//);
      expect(item.reference).toMatch(/^assets\/(?:images|theme-icons)\//);
      expect(item.target).not.toMatch(/sagePorcelain|\/olive\/|-olive\b/);
      expect(item.width).toBeGreaterThan(0);
      expect(item.height).toBeGreaterThan(0);
      expect(item.promptRole.trim().length).toBeGreaterThan(20);
    }
  });

  test('excludes map-only, preload-only and unrendered V2 assets', () => {
    const excludedTargets = [
      'assets/images/home_menu/wasabiInk/home-wasabiInk-practice.webp',
      'assets/images/home_menu/wasabiInk/home-wasabiInk-shop.webp',
      'assets/images/social_icons/social-chat-wasabiInk.webp',
      'assets/images/tournament/themes/wasabiInk/podium.webp',
      'assets/images/tournament/themes/wasabiInk/weekly-bank.webp',
      'assets/images/tournament/themes/wasabiInk/season-rewards.webp',
    ] as const;
    const ids = new Set(manifest.map(item => item.id));
    const sources = runtimeSource();
    expect(ids.has('wasabi.home.menu.wasabiInk.home.wasabiInk.practice')).toBe(false);
    expect(ids.has('wasabi.home.menu.wasabiInk.home.wasabiInk.shop')).toBe(false);
    expect(ids.has('wasabi.social.icons.social.chat.wasabiInk')).toBe(false);
    expect(manifest.some(item => item.family === 'tournament/themes')).toBe(false);

    const home = read('app/(tabs)/home.tsx');
    const lessons = read('app/(tabs)/lessons.tsx');
    const diagnostic = read('app/diagnostic_test.tsx');
    expect(home).toContain('menuImages.lesson');
    expect(home).toContain('menuImages.cards');
    expect(home).toContain('menuImages.league');
    expect(lessons).toContain('menuImages.test');
    expect(diagnostic).toContain('getHomeMenuImages(themeMode).exam');
    expect(home).not.toContain('menuImages.practice');
    expect(home).not.toContain('menuImages.shop');

    for (const target of excludedTargets) {
      expect(fs.existsSync(path.join(root, target))).toBe(false);
      expect(sources).not.toContain(target);
    }

    const friends = read('app/(tabs)/friends.tsx');
    expect(friends).toContain('getSocialFriendsIcon(themeMode)');
    expect(sources).not.toContain('getSocialChatIcon(themeMode)');
  });

  test('wires the five approved shared overrides through one static module', () => {
    const source = read('app/theme_ui_assets.ts');
    expect(source).toContain("require('../assets/images/energy/wasabiInk/energy.webp')");
    expect(source).toContain("require('../assets/images/level-spin-rewards/wasabiInk/rune.webp')");
    expect(source).toContain("require('../assets/images/spin/wasabiInk/spin-ticket.webp')");
    expect(source).toContain("require('../assets/images/streak_overlays/wasabiInk/streak-freeze-ice.webp')");
    expect(source).toContain("require('../assets/images/league/wasabiInk/league-crown.webp')");
  });

  test('delivers every declared production asset on disk', () => {
    const missing = manifest
      .map(item => item.target)
      .filter(target => !fs.existsSync(path.join(root, target)));

    expect(missing).toEqual([]);
  });

  test('keeps every existing deliverable statically referenced and every delivered file on-contract', () => {
    const sources = runtimeSource();
    const existing = manifest.filter(item => fs.existsSync(path.join(root, item.target)));
    for (const item of existing) {
      expect({ target: item.target, wired: sources.includes(path.basename(item.target)) })
        .toEqual({ target: item.target, wired: true });
    }
    const metadata = metadataFor(existing.map(item => path.join(root, item.target)));
    const byFile = new Map(metadata.map(item => [path.normalize(item.file), item]));
    for (const item of existing) {
      const absolutePath = path.normalize(path.join(root, item.target));
      expect(byFile.get(absolutePath)).toEqual({
        file: path.join(root, item.target),
        width: item.width,
        height: item.height,
        alpha: item.alpha,
      });
    }
  });
});
