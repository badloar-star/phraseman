import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../../../..');
const files = {
  font: 'assets/fonts/Inter-Regular.ttf',
  lesson: 'assets/images/home_menu/midnight/home-midnight-lessons.webp',
  cards: 'assets/images/home_menu/midnight/home-midnight-cards.webp',
  league: 'assets/images/home_menu/midnight/home-midnight-league.webp',
  dialogs: 'assets/images/home_menu/midnight/home-midnight-dialogs.webp',
  shop: 'assets/images/home_menu/midnight/home-midnight-shop.webp',
  hero: 'assets/images/home_menu/midnight/home-midnight-hero-map.webp',
  rune: 'assets/images/level-spin-rewards/stars_10.webp',
  medal: 'assets/images/levels/zoloto.webp',
};
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
// Use the actual collectible illustration instead of inventing a replacement.
const catalog = fs.readFileSync(path.join(root, 'app/collectibles/catalog_data.ts'), 'utf8');
const firstCard = catalog.split('\n').find(line => line.includes('id: "animals_01"'));
const svgMatch = firstCard?.match(/svg: ("(?:\\.|[^"\\])*")/);
if (!svgMatch) throw new Error('Actual collectible artwork not found');
html = html.replaceAll('@@collectible@@', `data:image/svg+xml;base64,${Buffer.from(JSON.parse(svgMatch[1])).toString('base64')}`);
for (const [key, file] of Object.entries(files)) {
  const buffer = fs.readFileSync(path.join(root, file));
  html = html.replaceAll(`@@${key}@@`, `data:${key === 'font' ? 'font/ttf' : 'image/webp'};base64,${buffer.toString('base64')}`);
}
if (/@@\w+@@/.test(html)) throw new Error('Unresolved asset');
fs.writeFileSync(path.join(dir, 'standalone.html'), html);
console.log(`Standalone generated: ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB, ${Object.keys(files).length + 1} embedded assets.`);


