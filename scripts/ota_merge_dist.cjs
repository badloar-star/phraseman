// ota_merge_dist.cjs — склейка экспортов iOS и Android в один каталог для `eas update --skip-bundler --input-dir`
// и проверки перед публикацией. Схема — merge_meta.cjs OTA-2 (25.10), плюс проверки, которые раньше делались руками.
// Использование: node scripts/ota_merge_dist.cjs <снимок> — внутри ждёт dist-ios/, dist-android/, пишет dist-ota/.
// зачем (координатор 25.10, решение владельца: OTA на 2.0.2 из HEAD одной командой при лимите 95 %): ничего не потерять при склейке и
// не выпустить бандл без ключей из окружения production (вход Apple/Google, RevenueCat) — значения не печатаем, только имена.
'use strict';
const fs = require('fs');
const path = require('path');

const SNAP = process.argv[2];
if (!SNAP) { console.log('[OTA-MERGE] нужен путь к снимку'); process.exit(2); }
const P = (...p) => path.join(SNAP, ...p);
const norm = (p) => p.split('\\').join('/');
let fail = 0;

const ios = JSON.parse(fs.readFileSync(P('dist-ios', 'metadata.json'), 'utf8'));
const android = JSON.parse(fs.readFileSync(P('dist-android', 'metadata.json'), 'utf8'));
if (!ios.fileMetadata?.ios || !android.fileMetadata?.android) { console.log('[OTA-MERGE] ✖ в экспорте нет ios/android'); process.exit(1); }

fs.rmSync(P('dist-ota'), { recursive: true, force: true });
fs.cpSync(P('dist-ios'), P('dist-ota'), { recursive: true });
fs.cpSync(P('dist-android'), P('dist-ota'), { recursive: true, force: false, errorOnExist: false });
for (const f of walk(P('dist-ota'))) if (f.endsWith('.map')) fs.rmSync(f); // карты — только для проверки dev-строк, людям не нужны
const merged = { ...ios, fileMetadata: { ...ios.fileMetadata, ...android.fileMetadata } };
fs.writeFileSync(P('dist-ota', 'metadata.json'), JSON.stringify(merged));
console.log(`[OTA-MERGE] платформы: ${Object.keys(merged.fileMetadata).join(', ')}`);

for (const plat of ['ios', 'android']) {
  const meta = merged.fileMetadata[plat];
  const bundlePath = P('dist-ota', norm(meta.bundle));
  if (!fs.existsSync(bundlePath)) { console.log(`[OTA-MERGE] ✖ ${plat}: нет бандла ${meta.bundle}`); fail++; continue; }
  const missing = meta.assets.filter((a) => !fs.existsSync(P('dist-ota', norm(a.path))));
  // зачем (репетиция 25.10): прежняя проверка «3 пакета .dpk» была ошибочной — в опубликованном OTA-2 их не было (31 ассет
  // на платформу = 30 файлов + бандл, webp и ttf). Проверяем, что ничего не потеряно и шрифты на месте.
  const byExt = {};
  for (const a of meta.assets) byExt[a.ext] = (byExt[a.ext] || 0) + 1;
  if (missing.length) fail++;
  if (!byExt.ttf) fail++;
  const size = fs.statSync(bundlePath).size;
  console.log(`[OTA-MERGE] ${plat}: бандл ${(size / 1e6).toFixed(1)} МБ, ассетов ${meta.assets.length} ${JSON.stringify(byExt)}, потеряно ${missing.length}${byExt.ttf ? '' : ' — НЕТ ШРИФТОВ'}`);
  for (const m of missing.slice(0, 5)) console.log(`  потерян: ${m.path}`);
}

// ключи окружения production попали в бандлы (имена — да, значения — нет)
const envFile = P('.env.ota.pulled');
if (!fs.existsSync(envFile)) { console.log('[OTA-MERGE] ✖ нет .env.ota.pulled — ключи production не подтянуты'); fail++; }
else {
  const pairs = fs.readFileSync(envFile, 'utf8').split(/\r?\n/).map((l) => l.match(/^(EXPO_PUBLIC_[A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]).filter(([, v]) => v.length >= 6);
  // зачем (репетиция 25.10): сборщик выкидывает ветку чужой платформы (Platform.OS), поэтому ключи *_ANDROID* в бандле iOS
  // и *_IOS* в бандле Android отсутствуют законно — их не ждём; общие ключи и ключи своей платформы обязаны быть.
  const foreign = { ios: /_ANDROID(_|$)/, android: /_IOS(_|$)/ };
  for (const plat of ['ios', 'android']) {
    const buf = fs.readFileSync(P('dist-ota', norm(merged.fileMetadata[plat].bundle)));
    const expected = pairs.filter(([k]) => !foreign[plat].test(k));
    const absent = expected.filter(([, v]) => buf.indexOf(v) < 0).map(([k]) => k);
    if (absent.length) fail++;
    console.log(`[OTA-MERGE] ${plat}: ключей production в бандле ${expected.length - absent.length}/${expected.length} (чужой платформы пропущено ${pairs.length - expected.length})${absent.length ? ` — НЕТ: ${absent.join(', ')}` : ''}`);
  }
}
console.log(fail === 0 ? '[OTA-MERGE] ИТОГ: dist-ota готов' : `[OTA-MERGE] ИТОГ: проблем ${fail} — не публиковать`);
process.exit(fail === 0 ? 0 : 1);

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}
