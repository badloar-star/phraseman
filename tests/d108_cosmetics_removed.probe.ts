/**
 * D108 ratchet: купленные ауры и кастомные аватары удалены целиком (D108, D102, D78);
 * заодно держит D107 (починка серии уроком / «Путешествием дня») и D110
 * (админ-возврат покупки набора).
 *
 * Проба держит ТРИ вещи:
 * 1. Удалённые модули и серверные экспорты не возвращаются.
 * 2. Каталоги и выдача косметики (ауры, кастомные аватары, архив, косметика ботов)
 *    не встречаются в коде приложения и функций — ни в одном файле.
 * 3. Следы косметики в UI (пропсы ауры у AvatarView, импорт заглушек) живут ТОЛЬКО
 *    в файлах из ALLOWLIST. Список может лишь СОКРАЩАТЬСЯ: новый файл роняет пробу,
 *    а файл, из которого следы ушли, обязан быть вычеркнут.
 *
 * Сработала — убери косметику, а не расширяй список. Расширять можно только
 * решением владельца.
 *
 * Запуск: npx tsx tests/d108_cosmetics_removed.probe.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const exists = (relative: string) => fs.existsSync(path.join(root, relative));
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

// ── 1. Удалённое остаётся удалённым ────────────────────────────────────────
const DELETED_FILES = [
  // D108: рендер аур и кастомных аватаров
  'components/AvatarAura.tsx',
  'components/PremiumAvatarHalo.tsx',
  'components/CustomAvatarBadge.tsx',
  'components/Avatar100Portrait.tsx',
  'components/avatar-aura/AuraRenderer.tsx',
  'components/avatar-aura/AuraScenes.tsx',
  'components/avatar-aura/presets.ts',
  'components/avatar-aura/types.ts',
  // D108: каталоги и ассет-таблицы кастомных аватаров
  'constants/avatar100_assets.ts',
  'constants/avatar100_fits.ts',
  'constants/avatar_phenomena_assets.ts',
  'constants/avatar_phenomena_fits.ts',
  'constants/custom_avatar_asset_host.ts',
  'constants/customization_dev_access.ts',
  'constants/cosmetic_asset_availability.ts',
  // D108: выдача косметики в подарках/спинах и авто-надевание ауры
  'app/spin_avatar_gift_pool.ts',
  'app/customization_selection_runtime.ts',
  // D108: архив продажи косметики (клиент + сервер) и косметика ботов
  'app/cosmetic_asset_archive.ts',
  'functions/src/cosmetic_asset_archive.ts',
  'functions/src/bot_cosmetics.ts',
  // D107: защита серии «Путешествием дня»
  'app/daily_journey_protected_day.ts',
];
for (const file of DELETED_FILES) {
  assert.equal(exists(file), false, `D108/D107: удалённый модуль вернулся: ${file}`);
}

const serverIndex = read('functions/src/index.ts');
const adminIndex = read('functions-admin/index.ts');
for (const callable of [
  'cosmeticAssetCatalogGet',
  'adminGetCosmeticAssetArchive',
  'adminSetCosmeticAssetSaleStatus',
  'adminRefundCommunityPackPurchase',
]) {
  assert.doesNotMatch(stripComments(serverIndex), new RegExp(`\\b${callable}\\b`), `D108/D110: вернулся экспорт ${callable}`);
  assert.doesNotMatch(stripComments(adminIndex), new RegExp(`\\b${callable}\\b`), `D108/D110: админ-кодбаза снова экспортирует ${callable}`);
}
assert.doesNotMatch(read('functions/src/community_packs.ts'), /adminRefundCommunityPackPurchase\s*=/, 'D110: вернулся админ-возврат покупки набора');
assert.doesNotMatch(read('admin/v2/legacy.html'), /adminRefundCommunityPackPurchase|adminGetCosmeticAssetArchive|adminSetCosmeticAssetSaleStatus/, 'D108/D110: админка снова зовёт удалённую функцию');

// D107: серию спасает только бесплатная заморозка Plus.
const hallOfFame = stripComments(read('app/hall_of_fame_utils.ts'));
assert.doesNotMatch(hallOfFame, /streak_repair|daily_journey_protected_day|wasRepairedToday|DailyJourneyProtectedDay/, 'D107: серия снова спасается починкой/«Путешествием дня»');
assert.match(hallOfFame, /isStreakFreezeActiveToday\(/, 'D107: бесплатная заморозка Plus обязана остаться');
assert.doesNotMatch(stripComments(read('app/lesson_complete.tsx')), /recordLessonForRepair|streak_repair/, 'D107: урок снова засчитывается в починку серии');

// ── 2. Каталогов и выдачи косметики нет нигде ──────────────────────────────
const COSMETIC_CATALOG_OR_GRANT = new RegExp(
  '\\b(?:AVATAR_AURAS|APPROVED_AVATAR_AURAS|CUSTOM_AVATARS|CUSTOM_AVATAR_GIFT_POOL|CUSTOM_AVATAR_GRADIENTS'
  + '|CUSTOM_AVATAR_SHOP|unlockRandomCustomAvatarGift|unlockRandomAvatarAuraGift'
  + '|commitExternalAuraSelectionOccurrence|botCosmetics|botCosmeticsForCorpus|BOT_SHOWCASE_AURA_IDS'
  + '|parseCustomAvatarValue|makeCustomAvatarValue|getCustomAvatarArtSource|hydrateCosmeticAssetCatalog'
  + '|recordLessonForRepair|wasRepairedToday|commitDailyJourneyProtectedDay|recoverDailyJourneyProtectedDay)\\b',
);

// ── 3. Ратчет: где ещё остались следы косметики в UI ───────────────────────
const COSMETIC_UI_TRACE = new RegExp(
  "\\b(?:auraId|animateAura|auraMotionProgress|auraVisualSize)=\\{"
  + "|from '[./]*(?:constants/)?(?:avatar_auras|custom_avatars)'"
  + "|from '[./]*streak_repair'",
);

/**
 * Разрешённые места. Категории:
 * - design-ui: UI-файлы сессии «Дизайн» — косметику оттуда убирает она;
 * - stub: минимальные модули «косметики нет», которые держатся только импортами
 *   из design-ui (удалить вместе с последним импортом).
 */
const ALLOWLIST: Readonly<Record<string, 'design-ui' | 'stub'>> = {
  'app/community_packs/PackCommentsSheet.tsx': 'design-ui',
  'components/NotificationCenterButton.tsx': 'design-ui',
  'components/friends_together/FriendLevelUpModal.tsx': 'design-ui',
  'components/friends_together/FriendTogetherSheet.tsx': 'design-ui',
};

// Один проход: строки сохраняются как есть, комментарии вырезаются. Иначе «/*»
// внутри строчного комментария (например «components/friends/*») съедал бы код.
function stripComments(source: string): string {
  return source.replace(
    /('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    (match, literal: string | undefined) => literal ?? '',
  );
}

const SCAN_ROOTS = ['app', 'components', 'hooks', 'modules', 'constants', 'functions/src'];
const SKIP_DIRS = new Set(['node_modules', 'lib', 'content', 'graphify-out']);

function walk(relative: string, out: string[]): void {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const child = `${relative}/${entry.name}`;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(child, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(child);
    }
  }
}

const files: string[] = [];
for (const scanRoot of SCAN_ROOTS) walk(scanRoot, files);
const sources = new Map(files.map((file) => [file, stripComments(read(file))]));

const catalogOffenders = files.filter((file) => COSMETIC_CATALOG_OR_GRANT.test(sources.get(file)!)).sort();
assert.deepEqual(catalogOffenders, [], `D108/D107: каталог или выдача косметики/починки вернулись: ${catalogOffenders.join(', ')}`);

const offenders = files.filter((file) => COSMETIC_UI_TRACE.test(sources.get(file)!)).sort();
const unexpected = offenders.filter((file) => !(file in ALLOWLIST));
assert.deepEqual(unexpected, [], `D108: новый след косметики вне списка: ${unexpected.join(', ')}`);

const stale = Object.keys(ALLOWLIST).filter((file) => !offenders.includes(file)).sort();
assert.deepEqual(stale, [], `D108: вычеркни из ALLOWLIST — косметики там больше нет: ${stale.join(', ')}`);

// Заглушки живут, только пока их импортирует «Дизайн»; ушёл последний импорт — удалить файл.
const STUBS: Readonly<Record<string, RegExp>> = {
  'constants/avatar_auras.ts': /from '[./]*(?:constants\/)?avatar_auras'/,
  'constants/custom_avatars.ts': /from '[./]*(?:constants\/)?custom_avatars'/,
  'app/streak_repair.ts': /from '[./]*streak_repair'/,
};
for (const [stub, importRe] of Object.entries(STUBS)) {
  const importers = files.filter((file) => file !== stub && importRe.test(sources.get(file)!));
  if (importers.length === 0) {
    assert.equal(exists(stub), false, `D108/D107: ${stub} больше никто не импортирует — удали файл (D78)`);
  } else {
    const foreign = importers.filter((file) => ALLOWLIST[file] !== 'design-ui');
    assert.deepEqual(foreign, [], `D108/D107: заглушку ${stub} импортирует не «Дизайн»: ${foreign.join(', ')}`);
  }
}

console.log(`D108 COSMETICS REMOVED RATCHET: PASS (${offenders.length} design-ui files left)`);
