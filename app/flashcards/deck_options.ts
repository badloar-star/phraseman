/**
 * cards-2.1 (§6 SPEC_2_1): сборка списка наборов для `DeckPickerSheet`.
 *
 * После §4/§5 плитки режимов с хаба удалены, и шит выбора наборов открывается из
 * нижнего таббара (⚙ / долгий тап на пункте «Тренировка/Слушать/Блиц»). Список
 * наборов раньше собирался инлайном в хабе — здесь он вынесен в отдельный модуль:
 *  • 'saved'     — все сохранённые карточки (flashcards_v1);
 *  • 'custom'    — мои карточки (custom_flashcards_v2);
 *  • 'pack:<id>' — добавленные наборы, чьи карточки доступны на устройстве.
 *
 * `cardIds` отдаём везде, где карточки реально загружены, — счётчик «Выбрано N ·
 * M карточек» дедуплицирует одну и ту же карточку в двух наборах (§6).
 * Ошибка любого отдельного набора не роняет список.
 */
import type Ionicons from '@expo/vector-icons/Ionicons';
import { triLang, type Lang } from '../../constants/i18n';
import {
  loadCommunityOwnedPackIds,
  loadCommunityOwnedPackTitles,
  type CommunityOwnedPackTitle,
} from '../community_packs/communityOwnedStorage';
import type { DeckSheetOption } from './DeckPickerSheet';
import { loadDeckCards, type DeckRef } from './deck_sources';
import {
  bundledPacksForOwned,
  derivePackCodeName,
  loadAccessiblePackIds,
  packTitleForInterface,
  type FlashcardMarketPack,
} from './marketplace';
import type { FcDeckId, FcPresetMode } from './mode_prefs';
import type { FlashcardContentLang } from './types';

type IconName = keyof typeof Ionicons.glyphMap;

const contentLang = (lang: Lang): FlashcardContentLang =>
  lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';

/**
 * Заголовок набора для списка: бандл знает названия сам, community-пак — по
 * заголовку, сохранённому рядом с id в момент добавления (`addCommunityOwnedPackId`).
 *
 * // зачем: community-паки (куплены/добавлены через каталог) не входят в
 * BUNDLED_MARKETPLACE_PACKS, и раньше падали в фолбэк «packId.replace(...)» —
 * в шите «Что слушаем?» показывался сырой id набора (напр. MQ2TYDZs19fYRfSIV02p)
 * вместо названия. Первая попытка чинить это через тёплый in-memory кэш
 * маркетплейса не сработала: тот кэш фильтруется до BUNDLED_MARKETPLACE_PACKS
 * (`filterToBundledCatalog` в marketplace.ts) и НИКОГДА не содержит community-id —
 * поэтому title теперь сохраняется отдельно, локально, без сети (см. ownedTitles).
 * derivePackCodeName как последний фолбэк — человекочитаемее сырого id.
 */
function packTitle(
  pack: FlashcardMarketPack | undefined,
  ownedTitle: CommunityOwnedPackTitle | undefined,
  packId: string,
  lang: Lang,
): string {
  if (pack) return packTitleForInterface(pack, contentLang(lang)) || pack.codeName || packId;
  if (ownedTitle) {
    const cl = contentLang(lang);
    const byLang = cl === 'uk' ? ownedTitle.titleUk : cl === 'es' ? ownedTitle.titleEs : ownedTitle.titleRu;
    const picked = byLang || ownedTitle.titleRu || ownedTitle.titleUk || ownedTitle.titleEs;
    if (picked) return picked;
  }
  return derivePackCodeName(packId);
}

/**
 * Тёплый снимок последнего собранного списка наборов.
 *
 * зачем (владелец: «открывая раздел тренировки, экран отметить наборы моргает»):
 * список собирается пятью асинхронными чтениями, поэтому экран выбора наборов
 * КАЖДЫЙ раз показывал спиннер и лишь потом список — смена состояния читалась
 * как моргание. Снимок позволяет отрисовать первый кадр сразу готовым, а сеть/
 * хранилище догоняют фоном и подменяют список только если состав изменился.
 * Ключ включает язык: заголовки наборов локализованы.
 */
let _warmDeckOptions: { key: string; options: DeckSheetOption[] } | null = null;

function deckOptionsCacheKey(mode: FcPresetMode, lang: Lang): string {
  // Список у всех режимов одинаковый (см. loadFcDeckOptions), режим в ключе
  // оставлен только чтобы будущее расхождение по режимам не отдало чужой снимок.
  return `${mode}::${lang}`;
}

/** Синхронный снимок для первого кадра. null — снимка ещё нет, нужен спиннер. */
export function peekFcDeckOptions(mode: FcPresetMode, lang: Lang): DeckSheetOption[] | null {
  const key = deckOptionsCacheKey(mode, lang);
  return _warmDeckOptions?.key === key ? _warmDeckOptions.options : null;
}

/** Совпадают ли списки по составу — чтобы не менять ссылку и не перерисовывать зря. */
export function sameDeckOptions(a: DeckSheetOption[], b: DeckSheetOption[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (x.deckId !== y.deckId || x.count !== y.count || x.title !== y.title) return false;
  }
  return true;
}

/**
 * Наборы для шита выбора — одинаковый список у всех трёх режимов.
 *
 * FIX (владелец, 2026-08-13): раньше у режима «Тренировка» первой строкой шёл
 * псевдо-набор «Слабые» не входит в карточечные наборы. «Тренировка»
 * раздела карточек больше не ведёт в тот тренажёр (это отдельная функция с
 * главного экрана), поэтому его очереди в списке наборов не место: остаются
 * только реальные наборы карточек. `mode` сохранён в сигнатуре — от него
 * зависит текст шита и ключ пресета.
 */
export async function loadFcDeckOptions(
  mode: FcPresetMode,
  lang: Lang,
): Promise<DeckSheetOption[]> {
  const cl = contentLang(lang);
  const [savedCards, customCards, ownedIds, communityIds, ownedTitles] = await Promise.all([
    loadDeckCards({ kind: 'saved' }, cl).catch(() => []),
    loadDeckCards({ kind: 'custom' }, cl).catch(() => []),
    loadAccessiblePackIds().catch(() => [] as string[]),
    loadCommunityOwnedPackIds().catch(() => [] as string[]),
    loadCommunityOwnedPackTitles().catch(() => ({}) as Record<string, CommunityOwnedPackTitle>),
  ]);

  const out: DeckSheetOption[] = [];

  out.push({
    deckId: 'saved',
    title: triLang(lang, {
      ru: 'Все сохранённые', uk: 'Усі збережені', en: 'All saved', es: 'Todas las guardadas',
      'pt-BR': 'Todos os salvos', vi: 'Tất cả thẻ đã lưu', id: 'Semua tersimpan',
      tr: 'Tüm kaydedilenler', pl: 'Wszystkie zapisane',
    }),
    count: savedCards.length,
    cardIds: savedCards.map((c) => c.id),
    icon: 'bookmark-outline' as IconName,
  });

  out.push({
    deckId: 'custom',
    title: triLang(lang, {
      ru: 'Мои карточки', uk: 'Мої картки', en: 'My cards', es: 'Mis tarjetas',
      'pt-BR': 'Meus cartões', vi: 'Thẻ của tôi', id: 'Kartu saya',
      tr: 'Kartlarım', pl: 'Moje fiszki',
    }),
    count: customCards.length,
    cardIds: customCards.map((c) => c.id),
    icon: 'create-outline' as IconName,
  });

  /** Порядок первого вхождения, без дублей: сначала добавленные наборы, потом UGC. */
  const packIds: string[] = [];
  for (const id of [...ownedIds, ...communityIds]) {
    if (id && !packIds.includes(id)) packIds.push(id);
  }
  const bundled = bundledPacksForOwned(packIds);
  const packDecks = await Promise.all(
    packIds.map(async (packId) => {
      const cards = await loadDeckCards({ kind: 'pack', packId }, cl).catch(() => []);
      /** Набор без доступных на устройстве карточек в списке не нужен. */
      if (cards.length === 0) return null;
      return {
        deckId: `pack:${packId}` as FcDeckId,
        title: packTitle(
          bundled.find((p) => p.id === packId),
          ownedTitles[packId],
          packId,
          lang,
        ),
        count: cards.length,
        cardIds: cards.map((c) => c.id),
        icon: 'albums-outline' as IconName,
      } satisfies DeckSheetOption;
    }),
  );
  for (const deck of packDecks) if (deck) out.push(deck);

  // Снимок для мгновенного первого кадра следующего открытия экрана.
  const key = deckOptionsCacheKey(mode, lang);
  const warm = _warmDeckOptions?.key === key ? _warmDeckOptions.options : null;
  // Тот же состав — держим ПРЕЖНЮЮ ссылку, чтобы экран не перерисовывался зря.
  _warmDeckOptions = { key, options: warm && sameDeckOptions(warm, out) ? warm : out };

  return _warmDeckOptions.options;
}

// ── Все доступные источники карточек (сохранённые + мои + ВСЕ наборы) ────────

/**
 * FIX (владелец, 2026-08-13): «карточки из наборов должны считаться».
 * Блиц без `?deck=` раньше брал только `saved + custom`, поэтому у человека с
 * карточками ТОЛЬКО в купленных/добавленных наборах пул был пуст и режим
 * отказывался стартовать. Здесь собираем полный список источников: сохранённые,
 * мои карточки и каждый доступный на устройстве набор (маркет + сообщество).
 * Ошибка отдельного источника не роняет список.
 */
export async function loadAllFcDeckRefs(): Promise<DeckRef[]> {
  const [ownedIds, communityIds] = await Promise.all([
    loadAccessiblePackIds().catch(() => [] as string[]),
    loadCommunityOwnedPackIds().catch(() => [] as string[]),
  ]);
  const refs: DeckRef[] = [{ kind: 'saved' }, { kind: 'custom' }];
  const seen = new Set<string>();
  for (const id of [...ownedIds, ...communityIds]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    refs.push({ kind: 'pack', packId: id });
  }
  return refs;
}

/**
 * Сколько уникальных карточек доступно человеку ВСЕГО (сохранённые + мои + все
 * наборы), с дедупликацией по стабильному id. Нужен таббару, чтобы решить,
 * показывать ли пункт «Блиц» (`canStartBlitz(count)` из `blitz_logic`).
 * Никогда не бросает — при любой ошибке отдаёт 0.
 */
export async function countAvailableFcCards(lang: Lang): Promise<number> {
  const cl = contentLang(lang);
  try {
    const refs = await loadAllFcDeckRefs();
    const lists = await Promise.all(
      refs.map((ref) => loadDeckCards(ref, cl).catch(() => [])),
    );
    const ids = new Set<string>();
    for (const list of lists) for (const card of list) if (card?.id) ids.add(card.id);
    return ids.size;
  } catch {
    return 0;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
