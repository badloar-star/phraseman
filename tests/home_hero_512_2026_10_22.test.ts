// зачем (координатор 22.10: «Сторож: для каждого 1024 есть 512, сверка по хэшу оригинала, плюс команда пересборки»): герой «Сцены»
// Главной берётся из копий 512 px (scripts/gen_home_hero_512.mjs), оригиналы 1024 владельца не трогаются. Сторож: у каждого оригинала
// home_scene_* есть копия; sha256 оригинала и копии совпадают с манифестом; копия не больше 512; сирот нет; реестр перечисляет ровно
// копии; генератор пишет только в hero512 и реестр; выбор яркости — чистой функцией. Любая красная строка называет команду пересборки.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { pickHomeHero512 } from '../components/home/v2/scene/home_scene_art';
import { readSource } from './helpers/read_source';

const ROOT = path.join(__dirname, '..');
const ART = path.join(ROOT, 'assets', 'images', 'v2art');
const OUT = path.join(ART, 'hero512');
const REBUILD = 'пересобрать: node scripts/gen_home_hero_512.mjs';
const NAME_RE = /^home_scene_[a-z0-9_]+(\.accent)?\.webp$/;

type Entry = Readonly<{ source: string; sourceSha256: string; sha256: string; width: number; height: number }>;
const manifest = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8')) as { size: number; files: Record<string, Entry> };
const sha256 = (file: string) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const listWebp = (dir: string, re: RegExp) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => re.test(f)).sort() : []);
const originals = ['dark', 'light'].flatMap((b) => listWebp(path.join(ART, b), NAME_RE).map((f) => `${b}/${f}`));
const copies = ['dark', 'light'].flatMap((b) => listWebp(path.join(OUT, b), /\.webp$/).map((f) => `${b}/${f}`));

/** Размер из заголовка WebP (VP8X / VP8 / VP8L) — без декодирования. */
function webpSize(file: string): { width: number; height: number } {
  const buf = fs.readFileSync(file);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') throw new Error(`${file}: не WebP`);
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
  }
  throw new Error(`${file}: неизвестный блок ${chunk}`);
}

describe('герой «Сцены»: копии 512 рядом с оригиналами 1024', () => {
  it('оригиналы героя на месте (есть что уменьшать) и манифест на 512', () => {
    expect(originals.length).toBeGreaterThanOrEqual(20);
    expect(manifest.size).toBe(512);
  });

  it('у каждого оригинала есть копия: sha256 оригинала и копии = манифест, копия ≤ 512', () => {
    const problems: string[] = [];
    for (const key of originals) {
      const entry = manifest.files[key];
      if (!entry) { problems.push(`${key}: нет копии 512 — ${REBUILD}`); continue; }
      if (entry.sourceSha256 !== sha256(path.join(ART, key))) problems.push(`${key}: оригинал изменился после сборки копии — ${REBUILD}`);
      const copy = path.join(OUT, key);
      if (!fs.existsSync(copy)) { problems.push(`${key}: файла копии нет — ${REBUILD}`); continue; }
      if (entry.sha256 !== sha256(copy)) problems.push(`${key}: копия не совпадает с манифестом (правлена руками?) — ${REBUILD}`);
      const size = webpSize(copy);
      if (size.width > 512 || size.height > 512 || size.width !== entry.width || size.height !== entry.height) {
        problems.push(`${key}: копия ${size.width}×${size.height}, в манифесте ${entry.width}×${entry.height} — ${REBUILD}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('сирот нет: каждая копия и запись манифеста — от существующего оригинала', () => {
    const known = new Set(originals);
    const orphans = [...copies, ...Object.keys(manifest.files)].filter((key) => !known.has(key));
    expect(orphans.map((key) => `${key}: оригинала нет — ${REBUILD}`)).toEqual([]);
  });

  it('реестр require перечисляет ровно копии из hero512', () => {
    const registry = readSource('components/home/v2/scene/home_scene_hero512.generated.ts');
    expect(registry).toContain('// АВТОГЕНЕРАЦИЯ: node scripts/gen_home_hero_512.mjs — руками не править.');
    const required = [...registry.matchAll(/require\('\.\.\/\.\.\/\.\.\/\.\.\/assets\/images\/v2art\/hero512\/([^']+)'\)/g)].map((m) => m[1]!).sort();
    expect(required).toEqual([...copies].sort());
    expect(registry.match(/require\(/g)?.length ?? 0).toBe(required.length);
  });

  it('генератор пишет только копии, манифест и реестр — оригиналы 1024 не трогает', () => {
    const script = readSource('scripts/gen_home_hero_512.mjs');
    expect(script).toContain("const outDir = path.join(artDir, 'hero512');");
    expect([...script.matchAll(/fs\.writeFileSync\((\w+)/g)].map((m) => m[1]).sort()).toEqual(['copy', 'manifestFile', 'registryFile']);
    expect([...script.matchAll(/fs\.rmSync\((path\.join\([^)]*\))/g)].map((m) => m[1])).toEqual(['path.join(outDir, key)']);
  });

  it('копии 512 хватает: герой не крупнее 160 dp (≈ 480 px на экране 3×)', () => {
    const stage = readSource('components/home/v2/scene/HomeSceneStage.tsx');
    const hero = Number(/const HERO = (\d+);/.exec(stage)?.[1]);
    expect(hero).toBeGreaterThan(0);
    expect(hero * 3).toBeLessThanOrEqual(512);
  });

  it('сцена берёт копию 512 только для своего героя; флаг hero512 в журнале', () => {
    const art = readSource('components/home/v2/scene/home_scene_art.ts');
    expect(art).toContain('const pick = own ? pickHomeHero512(HOME_HERO_512, name, resolved) : null;');
    expect(art).toContain('hero512: small !== null,');
    expect(readSource('components/home/v2/scene/HomeScene.tsx')).toContain('origin: art.origin, hero512: art.hero512,');
  });
});

describe('pickHomeHero512 — копия той же яркости, из которой взят оригинал', () => {
  const table = { home_scene_x: { dark: 11, light: 22 }, home_scene_y: { dark: 33, darkAccent: 34 } };

  it('свой комплект → своя копия; комплект другой яркости → копия другой яркости', () => {
    expect(pickHomeHero512(table, 'home_scene_x', { brightness: 'dark', origin: 'v2art', accent: null })).toEqual({ small: { base: 11, accent: null }, reason: '512_dark' });
    expect(pickHomeHero512(table, 'home_scene_x', { brightness: 'light', origin: 'v2art', accent: null })).toEqual({ small: { base: 22, accent: null }, reason: '512_light' });
    expect(pickHomeHero512(table, 'home_scene_y', { brightness: 'light', origin: 'v2art_other_brightness', accent: 99 })).toEqual({ small: { base: 33, accent: 34 }, reason: '512_dark' });
  });

  it('нет копии, нет копии слоя, заглушка — оригинал (small: null) и причина', () => {
    expect(pickHomeHero512(table, 'home_scene_y', { brightness: 'light', origin: 'v2art', accent: null })).toEqual({ small: null, reason: 'no_512_light' });
    expect(pickHomeHero512(table, 'home_scene_x', { brightness: 'dark', origin: 'v2art', accent: 5 })).toEqual({ small: null, reason: 'no_512_dark_accent' });
    expect(pickHomeHero512(table, 'home_scene_z', { brightness: 'dark', origin: 'v2art', accent: null })).toEqual({ small: null, reason: 'no_512_dark' });
    expect(pickHomeHero512(table, 'home_scene_x', { brightness: 'dark', origin: 'fallback', accent: null })).toEqual({ small: null, reason: 'origin_fallback' });
    expect(pickHomeHero512(table, 'home_scene_x', { brightness: 'dark', origin: 'none', accent: null })).toEqual({ small: null, reason: 'origin_none' });
  });
});
