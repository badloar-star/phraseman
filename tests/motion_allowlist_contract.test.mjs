// зачем (PM-032-A1/A2): в 2.0 нет вечной декоративной пульсации. Бесконечный цикл
// (Animated.loop без iterations, withRepeat(..., -1)) допустим только там, где он
// несёт смысл: загрузка, курсор ввода, идёт звук/печать, фон Главной (её вид не
// трогаем по решению владельца). Новый вечный цикл = сначала причина в списке ниже.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIRS = ['app', 'components', 'modules', 'hooks'];

// файл → сколько вечных циклов в нём разрешено и почему
const ALLOWED = {
  'app/(tabs)/friends.tsx': [1, 'скелетон поиска друга (загрузка)'],
  'app/_layout.tsx': [1, 'заставка запуска (загрузка)'],
  'app/flashcards/CardsHubV2.tsx': [1, 'парение плиток хаба; крутится только пока экран активен (useRuntimeActive); хаб утра возвращён по приказу владельца 11.10; для робота — dev animations=off'],
  'app/flashcards/SpeakMicButton.tsx': [1, 'кольцо микрофона «Устно», пока идёт запись (cards-v2 `ring`); при «уменьшить движение» статично'],
  'app/lesson1.tsx': [1, 'мигающий курсор ввода'],
  'app/voice_equalizer.tsx': [1, 'эквалайзер, пока идёт звук'],
  'components/AiTypingBubble.tsx': [2, 'собеседник печатает'],
  'components/CleanOnboarding.tsx': [2, 'онбординг не трогаем (владелец)'],
  'components/dialogs/glass/DialogueGlassChat.tsx': [1, 'собеседник печатает'],
  'components/learning-v2-lab/ModeDemoPlayer.tsx': [1, 'лаборатория режимов (дев)'],
  'components/learning-v2/horizons/HorizonArtwork.tsx': [1, 'фон горизонтов, гейт фокуса и AppState'],
  'components/onboarding_aha/SpeechBeat.tsx': [1, 'онбординг не трогаем (владелец)'],
  'components/onboarding_aha/TypewriterText.tsx': [1, 'онбординг не трогаем (владелец)'],
  'components/profile-card/useLoop.ts': [1, 'общий хук; вызывающие гейтят сами'],
  'modules/learning-v2/modes/listen_choose_mode_v1.tsx': [1, 'кнопка звука, пока идёт звук'],
  'components/ForceUpdateGate.tsx': [1, 'только принудительное обновление без выхода'],
  'components/OfflineBanner.tsx': [1, 'статус: нет сети'],
  'components/SkeletonShimmer.tsx': [1, 'скелетон (загрузка)'],
  'components/v2/KitSpinner.tsx': [1, 'системный спиннер кита `.spin` (загрузка/проверка)'],
  'components/stats/AiBlockNote.tsx': [1, 'ИИ готовит разбор (загрузка)'],
  'modules/learning-v2/modes/scripted_repeat_compare_mode_v1.tsx': [1, 'идёт запись/звук'],
  'components/LearningV2MapNode.tsx': [1, 'хвост PM-032: ореол узла карты'],
  // зачем (владелец 15.10, m16 «звонок» — эталон v3 одобрен 14.10): идёт входящий звонок — кольца и пульс «Ответить», пока звонок на экране; гейт фокуса и AppState (useRuntimeActive), при «уменьшить движение» статично
  'components/dialogs/DialogueIncomingCall.tsx': [2, 'идёт входящий звонок (m16): кольца и пульс «Ответить», гейт useRuntimeActive'],
};

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'node_modules' && name !== 'dev') walk(p, out); continue; }
    if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

function closeParen(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')' && --depth === 0) return i;
  }
  return src.length;
}

function infiniteLoops(src) {
  let n = 0;
  for (const m of src.matchAll(/\b(?:Animated|RNAnimated)\.loop\(/g)) {
    const open = m.index + m[0].length - 1;
    if (!/\biterations\s*:/.test(src.slice(open, closeParen(src, open)))) n++;
  }
  n += (src.match(/withRepeat\([^;]*?,\s*-1\b/g) || []).length;
  return n;
}

const found = {};
for (const d of DIRS) {
  for (const f of walk(join(ROOT, d), [])) {
    const src = normalizeEol(readFileSync(f, 'utf8')).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
    const n = infiniteLoops(src);
    if (n > 0) found[relative(ROOT, f).split(sep).join('/')] = n;
  }
}

test('every infinite animation loop is on the allowlist with a reason', () => {
  // список может только сокращаться: убрал цикл — уменьши число здесь
  const stale = Object.entries(ALLOWED).filter(([f, [n]]) => (found[f] ?? 0) < n).map(([f]) => f);
  assert.deepEqual(stale, [], 'цикл убран — уменьши число в ALLOWED');
  const extra = Object.entries(found).filter(([f, n]) => n > (ALLOWED[f]?.[0] ?? 0));
  assert.deepEqual(extra, [], 'новый вечный цикл: сделай разовым (iterations) или впиши причину в ALLOWED');
});

test('decorative loops fixed in PM-032 stay one-shot', () => {
  for (const f of [
    'app/lesson_complete.tsx',
    'app/pack_opening.tsx',
    'app/flashcards/CollectionListView.tsx',
    'app/lesson_intro_screens.tsx',
    'components/learning-v2/LearningV2NewWordEncounterOverlay.tsx',
    'app/flashcards/CardPackShardPaywallModal.tsx',
    'app/streak_stats.tsx',
    'components/SaveToCardsButton.tsx',
    'app/learning-v2/lesson/[id].tsx',
    // D140: CollectibleArtFrame / CollectiblesEmptyStateMotion / HoloFoilCard удалены с коллекциями.
    'components/level_up/LevelUpMintCeremony.tsx',
    'components/paywall/PaywallMotion.tsx',
  ]) assert.equal(found[f] ?? 0, 0, f);
});
