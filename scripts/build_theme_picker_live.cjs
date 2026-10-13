// Сборка docs/design/v2-app/theme-picker-live.html (владелец 13.10, вопрос 3 «тема по умолчанию для новых»).
// зачем: цвета страницы — НАСТОЯЩИЕ токены приложения: модуль constants/liquidGlassThemePalette.ts собирается esbuild в одну строку и
// вставляется в страницу, поэтому та же формула насыщенности, те же 23 темы, тёмная/светлая. Картинки плиток — из assets/images/v2art.
// Запуск: node scripts/build_theme_picker_live.cjs
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const TMP = path.join(require('os').tmpdir(), 'theme_picker_live');
fs.mkdirSync(TMP, { recursive: true });

const entry = path.join(TMP, 'entry.ts');
fs.writeFileSync(entry, "export { liquidGlassTokens, LIQUID_GLASS_THEME_IDS } from '" + path.join(ROOT, 'constants', 'liquidGlassThemePalette').replace(/\\/g, '/') + "';\n");
const bundle = path.join(TMP, 'lg_bundle.js');
execFileSync(process.execPath, [path.join(ROOT, 'node_modules', 'esbuild', 'bin', 'esbuild'), entry, '--bundle', '--format=iife', '--global-name=LG', '--minify', '--target=es2019', '--outfile=' + bundle], { stdio: 'inherit' });

async function enc(file, w, h) {
  if (!fs.existsSync(file)) return null;
  const buf = await sharp(file).resize(w, h, { fit: 'inside' }).webp({ quality: 72 }).toBuffer();
  return 'data:image/webp;base64,' + buf.toString('base64');
}

(async () => {
  const art = {};
  const dir = (m) => path.join(ROOT, 'assets', 'images', 'v2art', m);
  for (const [name, w, h] of [['lessons', 192, 192], ['dialogs', 192, 192], ['cards', 192, 192], ['continue', 288, 192]]) {
    art[name] = {
      dark: await enc(path.join(dir('dark'), name + '.webp'), w, h), darkAccent: await enc(path.join(dir('dark'), name + '.accent.webp'), w, h),
      light: await enc(path.join(dir('light'), name + '.webp'), w, h), lightAccent: await enc(path.join(dir('light'), name + '.accent.webp'), w, h),
    };
  }
  art.coin = await enc(path.join(ROOT, 'assets', 'images', 'coins', 'coin_rank_00.webp'), 96, 96);
  let html = fs.readFileSync(path.join(__dirname, 'theme_picker_live_template.html'), 'utf8');
  html = html.replace('/*__LG_BUNDLE__*/', () => fs.readFileSync(bundle, 'utf8')).replace('/*__ART__*/', () => JSON.stringify(art));
  const out = path.join(ROOT, 'docs', 'design', 'v2-app', 'theme-picker-live.html');
  fs.writeFileSync(out, html);
  console.log('готово', out, Math.round(html.length / 1024) + ' КБ');
})();
