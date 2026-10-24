// ЗАМОК ВЛАДЕЛЬЦА 22.10: «цвета строго оттенки текущей темы» (ослабить может только новое слово владельца; docs/work/OWNER_LOCKS.md)
// зачем (координатор 22.10, контраст новых экранов): сырой токен `good` / `bad` (зелёный/красный темы) как цвет ТЕКСТА или ЗНАЧКА давал 3,75–3,90 вместо 4,5 на мягкой подложке в светлых темах.
// Текст и значки берут semanticInk(glass).goodText / badText (constants/liquidGlassSemanticInk.ts): тот же оттенок темы, глубина ≥ 4,55. Сырой good/bad остаётся для ЗАЛИВОК и графики (кольца, полосы, галочки на цветной заливке).
// Храповик: число таких мест по файлу может только падать; новый файл стартует с нуля. Оставшиеся — чужие системы тонов (mpColors, tones, card сцены «Сегодня») и особые случаи, которые ведут свои сторожа.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SKIP = /\.test\.|preview|fixtures|\.generated\.|node_modules/i;
// цвет текста/значка: color=, color:, textDecorationColor — со значением good/bad какого-либо объекта токенов
const RAW = /\b(?:color|textDecorationColor)\s*(?:=\s*\{|:)[^\n;]*?\b(\w+(?:\([^)]*\))?)\.(?:good|bad)\b(?!\w)/g;

// База на 22.10 после замены в 19 файлах: оставшиеся места — отдельные системы тонов и особые случаи.
const BASELINE = {
  'app/flashcards_speaking_session.tsx': 1, // тёмная ветка: good, осветлённый к образцу #A6E8B9 (mixHex), светлая уже на semanticInk
  'components/home/v2/today_scene/TodaySceneView.tsx': 1, // card.bad — токен сцены «Сегодня» (свой сторож сцены)
  'components/mistakes-panel/PanelKit.tsx': 3, // mpColors(g).bad — собственная система тонов панели «Мои ошибки»
  'components/NotificationCenterButton.tsx': 2, // tones.good — тона центра уведомлений (tests/notification_center_tones_theme)
};

function files(rel) {
  let st;
  try { st = statSync(join(ROOT, rel)); } catch { return []; }
  if (st.isFile()) return [rel];
  return readdirSync(join(ROOT, rel)).flatMap((n) => (n === 'node_modules' ? [] : files(`${rel}/${n}`)));
}

function count() {
  const res = {};
  for (const f of [...files('app'), ...files('components')]) {
    if (!/\.(ts|tsx)$/.test(f) || SKIP.test(f)) continue;
    let inBlock = false;
    let n = 0;
    for (const l of readFileSync(join(ROOT, f), 'utf8').replace(/\r\n/g, '\n').split('\n')) {
      const t = l.trim();
      if (inBlock) { if (t.includes('*/')) inBlock = false; continue; }
      if (t.startsWith('/*') && !t.includes('*/')) { inBlock = true; continue; }
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
      // тень/кольцо (boxShadow, softShadow, inset) — графика, ей хватает 3:1: сырой good/bad там остаётся
      if (/boxShadow|softShadow|inset:/.test(l)) continue;
      n += (l.replace(/\/\/.*$/, '').match(RAW) || []).length;
    }
    if (n > 0) res[f] = n;
  }
  return res;
}

test('сырой good/bad как цвет текста или значка не растёт — берём semanticInk(glass).goodText/badText', () => {
  const current = count();
  const grew = Object.entries(current).filter(([f, n]) => n > (BASELINE[f] ?? 0));
  assert.deepEqual(grew, [], `сырой good/bad как цвет текста (используйте semanticInk из constants/liquidGlassSemanticInk): ${JSON.stringify(grew)}`);
});

test('semanticInk подключён в файлах, которые я перевёл', () => {
  for (const f of ['components/friends_together/FriendWeekCard.tsx', 'components/completion/V2DoneScreen.tsx', 'app/learning_v2_session_intro.tsx']) {
    assert.match(readFileSync(join(ROOT, f), 'utf8'), /semanticInk\(/, `${f} не использует semanticInk`);
  }
});

if (process.argv.includes('--print')) console.log(JSON.stringify(count(), null, 2));
