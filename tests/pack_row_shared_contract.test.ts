/**
 * Source-контракт: ВСЕ строки наборов идут через ОДИН общий компонент components/packs/PackRow.
 *
 * зачем (владелец, OWNER_REQUESTS_LEDGER строки 9 и 29; пакет packs-author-title-row-height-2026-10-11):
 * строки наборов в каталоге «Наборы сообщества» (и поиске), «Мои наборы», выборе набора в тренировке и
 * в шапке набора внутри — одной фиксированной высоты под максимум две строки названия; замена вида плашки —
 * правка одного файла. Сработал сторож — верни строку в PackRow, а не расширяй исключения.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const PACK_ROW = 'components/packs/PackRow.tsx';
const MODEL = 'components/packs/packRowModel.ts';
const CONSUMERS: readonly (readonly [string, string])[] = [
  ['app/flashcards/FlashcardsCategoryHub.tsx', 'variant="plate"'],
  ['app/flashcards/CommunityPackPreview.tsx', 'variant="plate"'],
  ['app/flashcards/MyPacksV2.tsx', 'variant="row"'],
  ['app/flashcards/TrainingSetupV2.tsx', 'variant="row"'],
];

describe('строки наборов — один общий компонент PackRow', () => {
  it.each(CONSUMERS)('%s рисует строку набора через <PackRow %s>', (file, variant) => {
    const src = read(file);
    expect(src).toContain("from '../../components/packs/PackRow'");
    expect(src).toContain('<PackRow');
    expect(src).toContain(variant);
  });

  it('старой строки набора KitPackRow больше нет нигде', () => {
    expect(read('components/cards-grid/CardsKit.tsx')).not.toContain('export const KitPackRow');
    for (const [file] of CONSUMERS) expect(read(file)).not.toContain('KitPackRow');
  });

  it('каталог не рисует собственную строку мимо PackRow (старые стили строки packs-simple удалены)', () => {
    const hub = read('app/flashcards/FlashcardsCategoryHub.tsx');
    expect(hub).not.toContain('baseRowStyles');
    expect(hub).not.toContain('variant="list"');
    expect(hub).not.toContain('HybridSheetShell');
  });
});

describe('PackRow: фиксированная высота, две строки названия, чистое название', () => {
  const row = read(PACK_ROW);
  const model = read(MODEL);

  it('название — максимум 2 строки, многоточие только если не влезает', () => {
    expect(model).toContain('export const PACK_ROW_TITLE_LINES = 2;');
    // зачем (решение координатора 11.10 по сторожу обрезки): обрезка — только семантический примитив ClampedText,
    // ни одного eslint-disable и ни одного сырого numberOfLines в строке набора.
    expect(row).toContain('maxLines={PACK_ROW_TITLE_LINES}');
    expect(row).toContain("import { ClampedText } from '../text-integrity/ClampedText';");
    expect(row).not.toContain('eslint-disable');
    expect(row).not.toMatch(/numberOfLines=\{/);
    const clamped = read('components/text-integrity/ClampedText.tsx');
    expect(clamped).toContain('журнал'); // ссылка на решение владельца п.9
    expect(clamped).toContain('type UnsafeNativeTextProp = Exclude<keyof TextProps, keyof FlowTextProps>;');
  });

  it('высота задана заранее от межстрочного × 2 с учётом масштаба шрифта', () => {
    expect(model).toContain('lh(m.titleLine) * PACK_ROW_TITLE_LINES');
    expect(row).toContain('const height = packRowHeight(variant, lh);');
    expect(row).toContain('height,');
    expect(row).toContain('const lh = useLineScale();');
  });

  it('плитка и хвост строки по центру по вертикали', () => {
    expect(row).toMatch(/surface: \{ flexDirection: 'row', alignItems: 'center'/);
  });

  it('название проходит через formatPackTitleForDisplay (cleanPackSourceTitle Ядра)', () => {
    expect(row).toContain('const shown = formatPackTitleForDisplay(title);');
    expect(read('app/flashcards/marketplace.ts')).toContain("import { cleanPackSourceTitle } from '../../shared/pack_source_title';");
  });

  it('kit-нажатие 240 мс и запреты владельца: без adjustsFontSizeToFit и без обводок-контейнеров', () => {
    expect(row).toContain("import { KitTouchable } from '../KitTouchable';");
    expect(row).not.toContain('adjustsFontSizeToFit');
    expect(row).not.toMatch(/borderWidth/);
    expect(row).not.toMatch(/borderColor/);
  });

  it('шрифты строки — шкала D145 (16 и 13), число плитки — крупная цифра макета', () => {
    expect(model).toContain('titleSize: 16');
    expect(model).toContain('metaSize: 13');
    for (const m of row.matchAll(/fontSize:\s*(\d+)/g)) {
      const size = Number(m[1]);
      expect([13, 16, 23]).toContain(size);
    }
  });
});

describe('автор: признак официального набора проверяется ДО чтения public_profiles', () => {
  const authors = read('app/community_packs/packAuthorNames.ts');

  it('официальный id не доходит до firestore', () => {
    const resolveAt = authors.indexOf('export async function resolveCommunityAuthorProfile');
    const officialAt = authors.indexOf('if (isOfficialPackAuthorId(sid))', resolveAt);
    const fetchAt = authors.indexOf('fetchPublicProfile(sid)', resolveAt);
    expect(officialAt).toBeGreaterThan(resolveAt);
    expect(fetchAt).toBeGreaterThan(officialAt);
    expect(authors).toContain('[PACK-AUTHOR] skip-read official');
  });

  it('хук подписи решает официального автора синхронно и не идёт в сеть', () => {
    expect(authors).toContain("const sid = official ? '' : String(pack?.authorStableId ?? '').trim();");
    expect(authors).toContain('isOfficialVideoPack(pack) ? OFFICIAL_PACK_AUTHOR_NAME : null');
  });

  it('флаг isOfficial маппера каталога не тронут (иначе isOfficialCatalogPack выкинет наборы роликов)', () => {
    expect(read('app/community_packs/communityFirestore.ts')).not.toMatch(/isOfficial:\s*isOfficialVideoPack/);
  });
});

describe('каталог: «+» добавляет набор оптимистично, с откатом и защитой от двойного тапа', () => {
  const hub = read('app/flashcards/FlashcardsCategoryHub.tsx');

  it('локальная отметка сразу, запись фоном, откат при отказе', () => {
    expect(hub).toContain('const quickAddPack = useCallback(');
    expect(hub).toContain('addingPackIdsRef.current.has(pack.id)');
    expect(hub).toContain('await addCommunityPackToLibrary(pack, target)');
    expect(hub).toContain('const target = studyTargetRef.current;');
    expect(hub).toContain("if (result === 'added' || result === 'already_added') return;");
    expect(hub).toContain('next.delete(pack.id);');
    expect(hub).toContain('[PACK-ROW] add:result');
    expect(hub).toContain('[PACK-ROW] add:rollback');
  });

  it('отказ без ложного «Проверь связь» (8e8fe95a8): честный текст по причине', () => {
    expect(hub).toContain("emitAppEvent('action_toast', packAddFailureToast(result));");
    expect(hub).not.toMatch(/Проверь связь|Перевір зв/);
  });

  it('платный набор не добавляется бесплатно — открывается экран набора с покупкой', () => {
    expect(hub).toContain('[PACK-ROW] add:paid');
    expect(hub).toMatch(/if \(price > 0\) \{[\s\S]{0,200}openPackPreview\(pack\);/);
  });

  it('строки зовут свежие обработчики через ref (memo не держит устаревший studyTarget)', () => {
    expect(hub).toContain('onOpen={() => openRowRef.current(pack)}');
    expect(hub).toContain('onAdd={() => addRowRef.current(pack)}');
    expect(hub).toContain('quickAddRef.current(pack);');
  });

  it('«+» доступен VoiceOver действием строки', () => {
    expect(hub).toContain("a11yActions={owned || opening ? undefined : [{ name: 'add-pack', label: addLabel, run: onAdd }]}");
    expect(read(PACK_ROW)).toContain('accessibilityActions={a11yActions?.map(');
  });
});

describe('живые счётчики (жалоба владельца «плитка отстаёт до перезахода»)', () => {
  const hub = read('app/flashcards/FlashcardsCategoryHub.tsx');
  const preview = read('app/flashcards/CommunityPackPreview.tsx');

  it.each([
    ['хаб каталога', hub],
    ['экран набора', preview],
  ])('%s слушает лайки, отклики и добавления', (_name, src) => {
    for (const event of ['community_pack_like_changed', 'community_pack_comments_changed', 'community_pack_added']) {
      expect(src).toContain(`onAppEvent('${event}'`);
    }
  });

  it('хаб накладывает сдвиг поверх каталога и прибавляет «добавили» при «+»', () => {
    expect(hub).toContain('const counts = livePackCounts(countsOverlay, pack.id, packBaseCounts(pack));');
    expect(hub).toContain("bumpCounts(pack.id, { added: 1 }, 'quick-add');");
    expect(hub).toContain("bumpCounts(pack.id, { added: -1 }, 'quick-add-rollback');");
    expect(hub).toContain('likes={counts.likes}');
  });

  it('экран набора показывает живые цифры, а не голый pack.commentsCount', () => {
    expect(preview).toContain('comments={liveComments}');
    // ревью 2, п.2: та же модель, что в хабе — поздний ответ чтения, уже учёвший лайк, сбрасывает сдвиг (без N+2)
    expect(preview).toContain('const live = livePackCounts(overlay, pack.id, base);');
    expect(preview).toContain('bumpPackCounts(prev, pack.id, baseRef.current, d)');
    expect(preview).not.toContain('comments={pack.commentsCount ?? 0}');
  });
});

describe('мелочи ревью 11.10 (макет #c1 и Performance Bible)', () => {
  const hub = read('app/flashcards/FlashcardsCategoryHub.tsx');
  const row = read(PACK_ROW);
  const screen = read('app/flashcards_packs.tsx');

  it('меню долгого нажатия — на 8 ниже плашки (стопка 10 компенсирована)', () => {
    expect(hub).toContain('const STACK_GAP = 10;');
    expect(hub).toContain('const MENU_GAP = 8;');
    expect(hub).toContain('marginTop: MENU_GAP - STACK_GAP');
  });

  it('меню и «Не показывать мне» вставляются в поток через animateNextLayoutTransition', () => {
    expect(hub).toContain("import { animateNextLayoutTransition } from '../smooth_layout';");
    expect(hub).toMatch(/const setMenuPack = useCallback\([\s\S]{0,200}animateNextLayoutTransition\(\);/);
    expect(hub).toMatch(/animateNextLayoutTransition\(\);\s*setUgcReportHintPackId\(null\);\s*setHiddenCommunityPackIds/);
  });

  it('сбой скрытия — откат с тостом; сбой перечитывания не возвращает скрытый набор', () => {
    expect(hub).toContain("emitAppEvent('action_toast', packHideFailureToast());");
    expect(hub).toContain('[PACK-ROW] hide:refresh-failed');
  });

  it('приподнятая плашка: скруглённая тень и внутреннее кольцо `.pl.up`', () => {
    expect(row).toContain('{ borderRadius: m.radius },');
    expect(row).toContain("color: `${g.mediaInk}2E`");
  });

  it('бейдж «Топ» не выше межстрочного названия, плитка-счётчик растёт вместе со шрифтом', () => {
    expect(row).toContain('const badgeHeight = lh(PACK_ROW_BADGE_LINE);');
    expect(row).toContain('maxFontSizeMultiplier={COUNT_TILE_MAX_FONT_SCALE}');
    expect(row).toContain('const width = countTileWidth(fontScale);');
  });

  it('шапка набора внутри без нажатия — не доступная обёртка (кнопка откликов видна VoiceOver)', () => {
    expect(row).toContain('<View testID={testID}>{surface}</View>');
  });

  it('экран поиска по #c1: «назад» и крестик 44 без подложки, поле 52 со скруглением 26 и внутренней кромкой', () => {
    expect(screen).toContain('searchBareBtn: { width: 44, height: 44, borderRadius: 22');
    expect(screen).toContain('minHeight: 52, height: 52, borderRadius: 26');
    expect(screen).toMatch(/testID="flashcards-packs-search-back"[\s\S]{0,200}style=\{styles\.searchBareBtn\}/);
  });

  it('поле поиска 52 помещается в строку шапки «Сообщества» без сдвига списка (ревью 2, п.3)', () => {
    const tab = read('app/(tabs)/community.tsx');
    // шапка: поля 12/4, высота строки 58; слой поиска 52 с −5 сверху и снизу → 12 + 52 − 10 + 4 = 58
    expect(tab).toContain("headerOverlay: { flex: 1, height: 52, marginVertical: -5, justifyContent: 'center' },");
    expect(tab).toContain('paddingTop: 12, paddingBottom: 4, minHeight: 58');
    expect(12 + 52 - 5 * 2 + 4).toBe(58);
  });
});

describe('💸 «+» в каталоге не перечитывает каталог (ревью 2, п.1)', () => {
  const hub = read('app/flashcards/FlashcardsCategoryHub.tsx');
  const screen = read('app/flashcards_packs.tsx');

  it('событие добавления от «+» каталога не зовёт обновление — локальное состояние уже верное', () => {
    expect(hub).toMatch(/if \(addingPackIdsRef\.current\.has\(packId\)\) \{\s*console\.log\(`\[PACK-ROW\] refresh skipped reason=quick_add/);
    // признак ставится ДО записи (событие приходит до await), снимается — после
    const addAt = hub.indexOf('addingPackIdsRef.current.add(pack.id);');
    const awaitAt = hub.indexOf('await addCommunityPackToLibrary(pack, target)');
    const deleteAt = hub.indexOf('addingPackIdsRef.current.delete(pack.id);');
    expect(addAt).toBeGreaterThan(0);
    expect(awaitAt).toBeGreaterThan(addAt);
    expect(deleteAt).toBeGreaterThan(awaitAt);
  });

  it('добавление с экрана набора — обычное обновление с троттлом, без force', () => {
    expect(screen).toContain('onMarketRefresh={refreshHubMarketAfterAdd}');
    expect(screen).not.toContain('refreshHubMarketForce');
    expect(screen).toMatch(/const refreshHubMarketAfterAdd = useCallback\(\(\) => \{\s*void loadHubMarket\(\);/);
  });
});

describe('ClampedText — одно видимое исключение сторожа обрезки (решение координатора 11.10)', () => {
  const clamped = read('components/text-integrity/ClampedText.tsx');

  it('обрезка — обычным атрибутом, ноль eslint-disable: файл — явное исключение правила и сканера (доработка 3)', () => {
    expect(clamped).toContain('numberOfLines={maxLines}');
    expect(clamped).not.toMatch(/eslint-disable/);
    const core = read('scripts/text-integrity/inventory-core.cjs');
    expect(core).toMatch(/SEMANTIC_TRUNCATION_PRIMITIVES = Object\.freeze\(\[\s*\/\/ журнал владельца п\.9, решение владельца через координатора 11\.10[^\n]*\n\s*'components\/text-integrity\/ClampedText\.tsx',\s*\]\)/);
    expect(read('tools/eslint-rules/no-unsafe-text-truncation.js')).toContain('const ALLOWED_PRIMITIVE_FILES = SEMANTIC_TRUNCATION_PRIMITIVES;');
    // без обходов сторожа: ни spread-объекта обрезки, ни объяснения, как обойти
    expect(clamped).not.toMatch(/\{\.\.\.clamp\}/);
    expect(clamped).not.toMatch(/spread/i);
  });

  it('не экспортируется из components/text-integrity/index.ts', () => {
    expect(read('components/text-integrity/index.ts')).not.toContain('ClampedText');
  });

  it('трещотка потребителей: ClampedText импортирует ТОЛЬКО components/packs/PackRow.tsx', () => {
    const importers: string[] = [];
    const walk = (dir: string): void => {
      for (const name of fs.readdirSync(path.join(ROOT, dir))) {
        if (name === 'node_modules' || name.startsWith('.')) continue;
        const rel = `${dir}/${name}`;
        const stat = fs.statSync(path.join(ROOT, rel));
        if (stat.isDirectory()) { walk(rel); continue; }
        if (!/\.(tsx?|jsx?)$/.test(name) || rel === 'components/text-integrity/ClampedText.tsx') continue;
        if (/from\s+['"][^'"]*text-integrity\/ClampedText['"]/.test(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) importers.push(rel);
      }
    };
    for (const dir of ['app', 'components', 'modules', 'hooks', 'constants', 'lib']) {
      if (fs.existsSync(path.join(ROOT, dir))) walk(dir);
    }
    // Новый потребитель — только по решению владельца или координатора (журнал п.9).
    expect(importers.sort()).toEqual(['components/packs/PackRow.tsx']);
  });

  it('в остальных файлах наборов — ни одного eslint-disable сторожа обрезки', () => {
    for (const file of [PACK_ROW, ...CONSUMERS.map(([f]) => f)]) {
      expect(read(file)).not.toContain('no-unsafe-text-truncation');
    }
  });
});
