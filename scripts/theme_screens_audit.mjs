// Аудит 8 экранов основного потока на зашитые цвета (включая Главную и Шпиль — только чтение).
// зачем (координатор 10.10, «Темы на всех экранах глазами»): сканер храповика пропускает Главную и ряд зон, а для пересъёмки нужно знать
// по КАЖДОМУ экрану: сколько цветов зашито без пометки (проблема), сколько помечено theme-exempt (бренд/иллюстрация/скрим/тень)
// и берёт ли файл цвета из токенов темы. Ничего не меняет, только печатает.
//   node scripts/theme_screens_audit.mjs            — таблица
//   node scripts/theme_screens_audit.mjs --lines    — ещё и строки без пометки
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHOW_LINES = process.argv.includes('--lines');

const SCREENS = [
  ['1. Главная', ['app/(tabs)/home.tsx', 'components/home', 'components/DailyPhraseCard.tsx']],
  ['2. Карточки (хаб)', ['app/flashcards/CardsHubV2.tsx', 'app/flashcards/FlashcardsHubScreen.tsx', 'app/flashcards/FlashcardsCategoryHub.tsx', 'app/flashcards/CardsGlassKit.tsx']],
  ['3. Ошибки', ['app/mistakes_hub.tsx', 'app/mistakes_list.tsx', 'components/mistakes-panel']],
  ['4. Видео', ['app/(tabs)/video.tsx', 'app/lingman_videos.tsx', 'components/youtube', 'components/video']],
  ['5. Сообщество', ['app/(tabs)/community.tsx', 'app/flashcards_packs.tsx', 'components/v2/V2SegmentedControl.tsx', 'components/spire']],
  ['6. Профиль и настройки', ['app/(tabs)/settings.tsx', 'components/settings', 'app/account_details.tsx', 'components/profile-card']],
  ['7. Монеты', ['app/coin_rank.tsx', 'components/coins', 'components/RankChangeBanner.tsx']],
  ['8. Урок', ['app/(tabs)/lessons.tsx', 'components/lessons', 'app/lesson1.tsx', 'app/lesson_complete.tsx', 'app/learning_v2_direct_session_player_v1.tsx', 'components/LearningV2SessionOutcomeSheet.tsx', 'components/learning-v2']],
];

const NAMED = 'white|black|red|green|blue|yellow|orange|gray|grey|purple|pink|gold|silver|cyan|magenta|navy|teal';
const reHex = /(['"`])#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3,4})\1|#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6})(?![0-9A-Za-z])/g;
const reRgb = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)/g;
const reNamed = new RegExp(`(?:[cC]olor|[fF]ill|[sS]troke|tintColor|shadowColor)\\s*[:=]\\s*\\{?\\s*['"](${NAMED})['"]`, 'g');
const TOKEN_USE = /liquidGlassTokens|useV2Palette|useLv2Glass|useCardsGlass|useV2GlassStyle|useTheme\(|themePair|useProfileSheetPaint|useSpirePalette|useDialogueGlass|useFriendsGlass|getV2Palette/;
const SKIP_FILE = /(\.test\.|content\/|factory_native|_authoring_|learning-v2-lab)/;

function files(rel, out) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return out;
  if (statSync(p).isDirectory()) {
    for (const n of readdirSync(p)) {
      if (n === 'node_modules') continue;
      files(`${rel}/${n}`, out);
    }
  } else if (/\.tsx?$/.test(p) && !SKIP_FILE.test(rel)) out.push(rel);
  return out;
}

let totalBad = 0;
for (const [title, roots] of SCREENS) {
  const list = [...new Set(roots.flatMap((r) => files(r, [])))].sort();
  let bad = 0; let exempt = 0; let withTokens = 0;
  const badFiles = [];
  for (const rel of list) {
    const src = readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
    if (TOKEN_USE.test(src)) withTokens += 1;
    let inBlock = false; let b = 0;
    src.split('\n').forEach((l, i) => {
      const t = l.trim();
      if (inBlock) { if (t.includes('*/')) inBlock = false; return; }
      if (t.startsWith('/*') && !t.includes('*/')) { inBlock = true; return; }
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
      const code = l.replace(/\/\/.*$/, '');
      let n = 0;
      for (const re of [reHex, reRgb, reNamed]) { re.lastIndex = 0; while (re.exec(code)) n += 1; }
      if (!n) return;
      if (/theme-exempt:\s*\S/.test(l)) { exempt += n; return; }
      b += n;
      if (SHOW_LINES) console.log(`    ${rel}:${i + 1}  ${t.slice(0, 110)}`);
    });
    if (b) badFiles.push(`${rel} (${b})`);
    bad += b;
  }
  totalBad += bad;
  console.log(`${title}: файлов ${list.length}, из токенов темы ${withTokens}, зашито БЕЗ пометки ${bad}, помечено theme-exempt ${exempt}${badFiles.length ? `\n    без пометки: ${badFiles.join('; ')}` : ''}`);
}
console.log(`ИТОГО без пометки: ${totalBad}`);
