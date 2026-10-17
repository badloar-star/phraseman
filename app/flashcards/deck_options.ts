/**
 * cards-2.1 (§6 SPEC_2_1): сборка списка наборов для `DeckPickerSheet`.
 *
 * После §4/§5 плитки режимов с хаба удалены, и шит выбора наборов открывается из
 * нижнего таббара (⚙ / долгий тап на пункте «Тренировка/Говорить/Блиц»). Список
 * наборов раньше собирался инлайном в хабе — здесь он вынесен в отдельный модуль:
 *  • 'saved'     — все сохранённые карточки (flashcards_v1);
 *  • 'custom'    — мои карточки (custom_flashcards_v2);
 *  • 'pack:<id>' — добавленные наборы, чьи карточки доступны на устройстве.
 *
 * `cardIds` отдаём везде, где карточки реально загружены, — счётчик «Выбрано N ·
 * M карточек» дедуплицирует одну и ту же карточку в двух наборах (§6).
 * Ошибка любого отдельного набора не роняет список.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerHubCacheProbe } from '../hub_lifecycle_probe';
import type Ionicons from '@expo/vector-icons/Ionicons';
import { captureAccountGeneration } from '../account_generation';
import { accountScopeKey } from '../account_scope_key';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { STARTER_FIRST_50_DECK_ID, STARTER_FIRST_50_TITLE, starterFirst50CardItems, starterPackAvailable } from './starter_pack_first_50';
import { triLang, type Lang } from '../../constants/i18n';
import {
  loadCommunityOwnedPackIds,
  loadCommunityOwnedPackTitles,
  type CommunityOwnedPackTitle,
} from '../community_packs/communityOwnedStorage';
import { loadPublishedCommunityMarketPacks, peekPublishedCommunityMarketPacks, peekVideoMarketPacks } from '../community_packs/communityFirestore';
import {
  loadLocalAuthorPacks,
  localAuthorPackToMarketPack,
  type LocalAuthorPack,
} from '../community_packs/localAuthorPacks';
import { storageStudyTarget } from '../target_storage_keys';
import type { DeckSheetOption } from './DeckPickerSheet';
import { deckCardsFromCardItems, loadDeckCards, type DeckCard, type DeckRef } from './deck_sources';
import { NO_PACK_LANGUAGE, normalizePackLanguage } from './pack_languages';
import {
  bundledPacksForOwned,
  derivePackCodeName,
  loadAccessiblePackIds,
  packTitleForInterface,
  type FlashcardMarketPack,
} from './marketplace';
import {
  bundledPackTilePng,
  packTileArtRevision,
  packTileImageForPack,
} from './packMarketplaceIcons';
import type { FcDeckId, FcPresetMode } from './mode_prefs';
import type { FlashcardContentLang } from './types';
import { noteSwallowed } from '../swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее
import { ownedPackIdsVersion } from '../community_packs/owned_pack_ids_signal'; // зачем: #19 — версия состава моих наборов сбрасывает кэш списка по языку

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
  if (pack) return packTitleForInterface(pack, lang) || pack.codeName || packId;
  if (ownedTitle) {
    const cl = contentLang(lang);
    const byLang = cl === 'uk' ? ownedTitle.titleUk : cl === 'es' ? ownedTitle.titleEs : ownedTitle.titleRu;
    const picked = byLang || ownedTitle.titleRu || ownedTitle.titleUk || ownedTitle.titleEs;
    if (picked) return picked;
  }
  return derivePackCodeName(packId);
}

/**
 * Свои наборы, созданные в редакторе («Сохранить»), — ТРЕТИЙ источник наборов
 * наравне с купленными и добавленными из каталога.
 *
 * зачем (жалоба пользователя 2026-09-21: «в Карточках создала себе набор, но не
 * вижу его в выборе наборов, когда выхожу в Начать тренировку»): список наборов
 * собирался только из `ownedIds` (маркет) + `communityIds` (каталог сообщества).
 * Свои наборы живут в ТРЕТЬЕМ хранилище (`community_local_author_packs_v1`) и в
 * список не попадали НИКОГДА — при том что загрузчик их карточек давно написан и
 * работает (`deck_sources.loadPackDeckCards` умеет `local_pack_*`). Механизм был
 * цел, его просто не звали. Те же три источника уже склеивают вручную коллекция,
 * «Мои наборы» и каталог — отстало только это, четвёртое место.
 *
 * Два инварианта, которые здесь удерживаются (оба — ранее пойманные классы багов):
 *  1. ЯЗЫК. `loadLocalAuthorPacks` читает ОБЕ цели (en + fr) и склеивает их,
 *     проставляя `pack.studyTarget`. Без фильтра французский режим показал бы
 *     английские наборы (класс бага 2026-09-05, см. комментарий у `studyTarget`).
 *  2. ДУБЛИ. Локальная копия НЕ удаляется после публикации — она получает
 *     `cloudPackId` (`publishLocalPack`). Без фильтра опубликованный набор шёл бы
 *     в список дважды: как `local_pack_*` и как облачный. Прячем облачного
 *     близнеца по ТОЧНОМУ `cloudPackId` (как `flashcards_my_packs`), а не по
 *     совпадению названия: `mergeLocalAuthorPacks` сравнивает «автор|язык|название»
 *     и ошибается при одинаковых названиях и при переименовании. Побеждает
 *     локальная копия — в ней свежие правки автора, ещё не прошедшие модерацию.
 */
type LocalPackSplit = {
  /** Свои наборы текущей цели изучения — их id добавляются в список. */
  mine: LocalAuthorPack[];
  /** Облачные id опубликованных своих наборов — их близнецов прячем. */
  cloudTwins: Set<string>;
};

function splitLocalAuthorPacks(
  packs: readonly LocalAuthorPack[],
  studyTarget?: RuntimeStudyTarget,
): LocalPackSplit {
  const target = storageStudyTarget(studyTarget);
  const mine: LocalAuthorPack[] = [];
  const cloudTwins = new Set<string>();
  for (const pack of packs) {
    if (!pack?.id) continue;
    // Близнеца прячем независимо от цели: облачный id уникален глобально.
    if (pack.cloudPackId) cloudTwins.add(pack.cloudPackId);
    if (storageStudyTarget(pack.studyTarget) !== target) continue;
    mine.push(pack);
  }
  return { mine, cloudTwins };
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
// зачем (п.83): списки наборов ЧУЖИХ языков (localOnly) — отдельная память по ключу «аккаунт+цель+язык+режим»: не трогают
// снимок текущего языка и диск; повторный выбор языка на настройке тренировки — 0 мс. Живёт до конца процесса.
// зачем (аудит кнопок Карточек #19, координатор 15.10): запись раньше жила до перезапуска — добавленный/купленный/созданный набор другого языка не появлялся. Теперь у записи срок жизни и версия состава моих наборов
// (сигнал community_pack_added / «убрать из моих»): изменился состав или прошло LOCAL_ONLY_DECK_OPTIONS_TTL_MS — собираем заново.
const LOCAL_ONLY_DECK_OPTIONS_TTL_MS = 60_000;
const _localOnlyDeckOptions = new Map<string, { options: DeckSheetOption[]; builtAtMs: number; ownedVersion: number }>();
function localOnlyDeckOptionsFresh(key: string): DeckSheetOption[] | null {
  const hit = _localOnlyDeckOptions.get(key);
  if (!hit) return null;
  if (hit.ownedVersion !== ownedPackIdsVersion() || Date.now() - hit.builtAtMs > LOCAL_ONLY_DECK_OPTIONS_TTL_MS) {
    console.log(`[FC-DECKS] localOnly cache drop key=${key} reason=${hit.ownedVersion !== ownedPackIdsVersion() ? 'owned_changed' : 'ttl'}`); // guard-ok: причина сброса
    _localOnlyDeckOptions.delete(key);
    return null;
  }
  return hit.options;
}
/**
 * Когда список наборов собирался последний раз. Нужен, чтобы прогрев из хаба не
 * поднимал семь источников заново на каждое открытие вкладки.
 *
 * Окно СОЗНАТЕЛЬНО крошечное (3 секунды): это единственный источник свежего
 * состава наборов, и купленный набор обязан появиться при следующем заходе.
 * Окно закрывает только дребезг «мазнул по вкладкам», а не реальный поход
 * человека за покупкой.
 */
let _warmDeckOptionsBuiltAtMs = 0;
const DECK_OPTIONS_REBUILD_MIN_GAP_MS = 3_000;

/**
 * Ключ durable-снимка списка наборов.
 *
 * зачем (владелец 2026-09-13, «должно открываться молниеносно»): снимок выше
 * жил ТОЛЬКО в памяти процесса, поэтому после каждого перезапуска приложения
 * первый вход на экран выбора наборов показывал спиннер и ждал семь
 * источников подряд. Список наборов меняется редко, а показать его нужно
 * мгновенно — значит он обязан пережить перезапуск.
 */
const DECK_OPTIONS_SNAPSHOT_KEY = 'fc_deck_options_snapshot_v1';

/** Снимок пишется фоном: экран не ждёт запись, она не на его критическом пути. */
function persistDeckOptionsSnapshot(key: string, options: DeckSheetOption[]): void {
  void AsyncStorage.setItem(DECK_OPTIONS_SNAPSHOT_KEY, JSON.stringify({ key, options }))
    .catch((error: unknown) => {
      // Немой catch запрещён: без снимка экран снова станет медленным.
      console.warn('[FC-DECKS] snapshot:write FAILED —',
        error instanceof Error ? `${error.name}: ${error.message}` : String(error));
    });
}

/**
 * Поднять снимок с диска в память. Вызывается при входе в раздел карточек,
 * ДО открытия экрана выбора наборов, поэтому peek остаётся синхронным и
 * отдаёт готовый список на первом кадре.
 */
export async function hydrateFcDeckOptionsSnapshot(): Promise<void> {
  if (_warmDeckOptions) return; // Память свежее диска — перетирать нельзя.
  try {
    const raw = await AsyncStorage.getItem(DECK_OPTIONS_SNAPSHOT_KEY);
    if (!raw) {
      console.log('[FC-DECKS] snapshot:hydrate — снимка на диске нет (первый запуск)');
      return;
    }
    const parsed = JSON.parse(raw) as { key?: unknown; options?: unknown };
    if (typeof parsed?.key !== 'string' || !Array.isArray(parsed.options)) {
      console.warn('[FC-DECKS] snapshot:hydrate — снимок битый, игнорирую');
      return;
    }
    if (_warmDeckOptions) return; // Пока читали диск, память успела заполниться.
    _warmDeckOptions = { key: parsed.key, options: parsed.options as DeckSheetOption[] };
    console.log(`[FC-DECKS] snapshot:hydrate ok наборов=${(parsed.options as unknown[]).length}`);
  } catch (error: unknown) {
    console.warn('[FC-DECKS] snapshot:hydrate FAILED —',
      error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  }
}
const _warmAvailableCardCounts = new Map<string, number>();

function studyTargetCacheKey(studyTarget?: RuntimeStudyTarget): string {
  return String(studyTarget ?? 'en').trim() || 'en';
}

function deckOptionsCacheKey(
  mode: FcPresetMode,
  lang: Lang,
  studyTarget?: RuntimeStudyTarget,
): string | null {
  const ownerKey = accountScopeKey(captureAccountGeneration());
  if (!ownerKey) return null;
  // зачем (владелец 2026-09-14, «должно быть загружено ещё до открытия раздела»):
  // список у всех режимов одинаковый (см. loadFcDeckOptions), а режим в ключе
  // делал снимок, прогретый для блица, промахом для «Устно» — каждый режим
  // грузил список заново. Ключ теперь без режима; параметр оставлен ради
  // сигнатуры вызывающих.
  void mode;
  return `${ownerKey}::${studyTargetCacheKey(studyTarget)}::${lang}`;
}

function availableCountCacheKey(
  lang: Lang,
  studyTarget?: RuntimeStudyTarget,
): string | null {
  const ownerKey = accountScopeKey(captureAccountGeneration());
  return ownerKey ? `${ownerKey}::${studyTargetCacheKey(studyTarget)}::${lang}` : null;
}

/** Синхронный снимок для первого кадра. null — снимка ещё нет, нужен спиннер. */
export function peekFcDeckOptions(
  mode: FcPresetMode,
  lang: Lang,
  studyTarget?: RuntimeStudyTarget,
): DeckSheetOption[] | null {
  const key = deckOptionsCacheKey(mode, lang, studyTarget);
  if (!key) {
    // Ранний выход обязан объясняться: без ключа аккаунта снимка нет и быть не может.
    console.log('[FC-DECKS] peek:miss — нет ключа аккаунта, экран покажет спиннер');
    return null;
  }
  const hit = _warmDeckOptions?.key === key ? _warmDeckOptions.options : null;
  console.log(`[FC-DECKS] peek:${hit ? `hit наборов=${hit.length}` : 'miss — снимка нет, экран покажет спиннер'}`);
  return hit;
}

/** Последний подтверждённый общий счётчик — убирает скачок daily-entry при повторном входе. */
export function peekAvailableFcCardCount(
  lang: Lang,
  studyTarget?: RuntimeStudyTarget,
): number | null {
  const key = availableCountCacheKey(lang, studyTarget);
  return key ? _warmAvailableCardCounts.get(key) ?? null : null;
}

/** Совпадают ли списки по составу — чтобы не менять ссылку и не перерисовывать зря. */
/**
 * D127: режим «Устно» (произнести вслух) без звука и без языка распознавания
 * бессмыслен — наборы «без языка» в нём не предлагаем.
 */
export function hideDecksWithoutVoice(decks: readonly DeckSheetOption[], mode: FcPresetMode): DeckSheetOption[] {
  if (mode !== 'speaking') return decks as DeckSheetOption[];
  const out = decks.filter((deck) => deck.packLanguage !== NO_PACK_LANGUAGE);
  if (out.length !== decks.length) {
    console.log(`[PACK-LANG] deck:hide mode=${mode} скрыто наборов без языка=${decks.length - out.length}`);
  }
  return out;
}

export function sameDeckOptions(a: DeckSheetOption[], b: DeckSheetOption[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (
      x.deckId !== y.deckId
      || x.count !== y.count
      || x.title !== y.title
      || x.sourceKind !== y.sourceKind
      || x.coverRevision !== y.coverRevision
      || x.packLanguage !== y.packLanguage
    ) return false;
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
  // зачем: без языка меню выбора колоды показывало английские купленные наборы
  // в режиме French — язык обязан доходить до КАЖДОГО источника (2026-09-05).
  studyTarget?: RuntimeStudyTarget,
  // зачем (п.83, Дизайн: кнопка языка фильтрует наборы на настройке тренировки): списки ЧУЖИХ языков собираются только из
  // того, что уже на устройстве — 0 новых чтений Firestore — и не перетирают тёплый снимок текущего языка (у них своя память).
  opts: Readonly<{ localOnly?: boolean }> = {},
): Promise<DeckSheetOption[]> {
  const localOnly = opts.localOnly === true;
  const cl = contentLang(lang);
  /**
   * зачем (владелец 2026-09-13, «должно открываться молниеносно»): экран ждёт
   * САМЫЙ МЕДЛЕННЫЙ из семи источников, и по логам не видно, какой именно.
   * Замер каждого источника — обязательное первое звено: чинить будем по
   * цифрам, а не по догадке. Лог остаётся навсегда: без него следующая
   * регрессия скорости снова будет невидимой.
   */
  const startedAtMs = Date.now();
  /**
   * зачем (владелец 2026-09-21, «всё лагает, причём везде», TestFlight): хаб
   * карточек зовёт этот прогрев при КАЖДОМ открытии вкладки, а он поднимает семь
   * источников — включая чтение всех сохранённых и своих карточек с диска.
   * Раньше проверки «а не собирали ли мы это только что» в начале не было
   * вообще: `_warmDeckOptions` только ЗАПИСЫВАЛСЯ в конце (строка ниже) и
   * никогда не читался на входе.
   *
   * Отдаём готовый список только внутри очень короткого окна и ТОЛЬКО для
   * точно того же ключа (аккаунт + цель + язык + режим). Окно намеренно
   * маленькое: этот загрузчик — единственный источник свежего состава наборов,
   * и купленный набор обязан появиться при следующем заходе, а не «когда-нибудь».
   */
  const reuseKey = deckOptionsCacheKey(mode, lang, studyTarget);
  const localOnlyHit = localOnly && reuseKey ? localOnlyDeckOptionsFresh(reuseKey) : null;
  if (localOnlyHit) {
    console.log(`[FC-DECKS] build:skip localOnly=yes — список языка уже собран, отдаём из памяти`);
    return localOnlyHit;
  }
  if (reuseKey && _warmDeckOptions?.key === reuseKey
    && Date.now() - _warmDeckOptionsBuiltAtMs < DECK_OPTIONS_REBUILD_MIN_GAP_MS) {
    console.log(`[FC-DECKS] build:skip — тот же ключ собран ${Date.now() - _warmDeckOptionsBuiltAtMs}мс назад, отдаём готовое`);
    return _warmDeckOptions.options;
  }
  const timed = async <T,>(name: string, run: () => Promise<T>, fallback: T): Promise<T> => {
    const at = Date.now();
    try {
      const value = await run();
      console.log(`[FC-DECKS] source:${name} ok за ${Date.now() - at}мс`);
      return value;
    } catch (error: unknown) {
      // Немой catch запрещён: проглоченный отказ источника обязан писать причину.
      console.warn(`[FC-DECKS] source:${name} FAILED за ${Date.now() - at}мс —`,
        error instanceof Error ? `${error.name}: ${error.message}` : String(error));
      return fallback;
    }
  };
  const [savedCards, customCards, ownedIds, communityIds, ownedTitles, communityPacks, localPacks] = await Promise.all([
    timed('saved', () => loadDeckCards({ kind: 'saved' }, cl, studyTarget), []),
    timed('custom', () => loadDeckCards({ kind: 'custom' }, cl, studyTarget), []),
    timed('accessiblePackIds', () => loadAccessiblePackIds(studyTarget), [] as string[]),
    timed('communityOwnedIds', () => loadCommunityOwnedPackIds(studyTarget), [] as string[]),
    timed('communityOwnedTitles', () => loadCommunityOwnedPackTitles(studyTarget), ({}) as Record<string, CommunityOwnedPackTitle>),
    /**
     * зачем (владелец 2026-09-13, «должно открываться молниеносно»): каталог
     * сообщества при промахе кэша — ПЯТЬ запросов в Firestore до 200
     * документов, и весь список наборов ждал их. Нужен он здесь только ради
     * обложки и названия ЧУЖОГО набора; названия уже есть локально в
     * ownedTitles, а обложка догонит следующим заходом. Поэтому берём только
     * тёплый слепок: есть — используем, нет — показываем список немедленно и
     * прогреваем каталог фоном, не задерживая кадр.
     */
    Promise.resolve(peekPublishedCommunityMarketPacks(studyTarget)).then((warmCatalog) => {
      if (warmCatalog) {
        console.log(`[FC-DECKS] source:publishedCatalog warm наборов=${warmCatalog.length}`);
        return warmCatalog;
      }
      if (localOnly) {
        console.log('[FC-DECKS] source:publishedCatalog miss — localOnly, сеть не трогаем');
        return [] as FlashcardMarketPack[];
      }
      console.log('[FC-DECKS] source:publishedCatalog miss — греем фоном, список не ждёт');
      void loadPublishedCommunityMarketPacks(studyTarget).catch((error: unknown) => {
        // Немой catch запрещён: отказ прогрева обязан быть виден.
        console.warn('[FC-DECKS] publishedCatalog:warm FAILED —',
          error instanceof Error ? `${error.name}: ${error.message}` : String(error));
      });
      return [] as FlashcardMarketPack[];
    }),
    timed('localAuthorPacks', () => loadLocalAuthorPacks(studyTarget), []),
  ]);
  console.log(`[FC-DECKS] sources:done за ${Date.now() - startedAtMs}мс`);

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
    sourceKind: 'saved',
  });

  out.push({
    deckId: 'custom',
    title: triLang(lang, {
      ru: 'Мои карточки', uk: 'Мої картки', en: 'My cards', es: 'Mis tarjetas',
      'pt-BR': 'Meus cartões', vi: 'Thẻ của tôi', id: 'Kartu saya',
      tr: 'Kartlarım', pl: 'Moje karty',
    }),
    count: customCards.length,
    cardIds: customCards.map((c) => c.id),
    icon: 'create-outline' as IconName,
    sourceKind: 'custom',
  });

  /**
   * Порядок первого вхождения, без дублей: купленные → добавленные из каталога →
   * СВОИ, созданные в редакторе. Свои идут последними, чтобы у людей без своих
   * наборов привычный порядок списка не поехал.
   */
  const { mine: myLocalPacks, cloudTwins } = splitLocalAuthorPacks(localPacks, studyTarget);
  const packIds: string[] = [];
  for (const id of [...ownedIds, ...communityIds, ...myLocalPacks.map((p) => p.id)]) {
    // Облачного близнеца своего же опубликованного набора пропускаем: его
    // показывает локальная копия, иначе один набор занял бы две строки.
    if (id && !cloudTwins.has(id) && !packIds.includes(id)) packIds.push(id);
  }
  console.log(`[FC-DECKS] локальных наборов: всего=${localPacks.length} моей цели=${myLocalPacks.length} скрыто облачных близнецов=${cloudTwins.size}`);
  const bundled = bundledPacksForOwned(packIds, studyTarget, lang);
  const localMarketPacks = localPacks.map((pack) => localAuthorPackToMarketPack(pack, pack.studyTarget));
  const catalogById = new Map<string, FlashcardMarketPack>();
  /**
   * Тёплый снимок наборов из видео.
   *
   * зачем ОТДЕЛЬНО от communityPacks: общий каталог берёт limit(40) на язык, и
   * добавленный набор из ролика в него может не попасть — тогда в списке
   * тренировки он остался бы БЕЗ названия и обложки (карточки при этом
   * грузятся отдельно, поэтому тренировка не ломалась бы, но набор выглядел бы
   * безымянным). Берём только тёплый слепок, сеть здесь не ждём — первый кадр
   * списка наборов дороже обложки.
   */
  const warmVideoPacks = peekVideoMarketPacks(studyTarget) ?? [];
  if (warmVideoPacks.length > 0) {
    console.log(`[FC-DECKS] source:videoCatalog warm наборов=${warmVideoPacks.length}`);
  }
  for (const pack of [...bundled, ...communityPacks, ...warmVideoPacks, ...localMarketPacks]) {
    if (packIds.includes(pack.id)) catalogById.set(pack.id, pack);
  }
  const packDecks = await Promise.all(
    packIds.map(async (packId) => {
      const loadedCards = await loadDeckCards({ kind: 'pack', packId }, cl, studyTarget, { localOnly }).catch((error: unknown) => {
        console.warn(`[FC-DECKS] pack:${packId} карточки не загрузились —`, error instanceof Error ? error.message : String(error));
        return [] as DeckCard[];
      });
      const cards = loadedCards;
      /** Набор без доступных на устройстве карточек в списке не нужен. */
      if (cards.length === 0) return null;
      const pack = catalogById.get(packId);
      /**
       * зачем (D127): помечаем набор «без языка», а НЕ выкидываем его здесь —
       * снимок списка общий для всех режимов (см. deckOptionsCacheKey). Режим
       * «Устно» прячет такие наборы сам (hideDecksWithoutVoice).
       */
      const silent = normalizePackLanguage(pack?.packLanguage ?? cards[0]?.packLanguage) === NO_PACK_LANGUAGE;
      const coverImage = pack ? packTileImageForPack(pack) : bundledPackTilePng(packId);
      const coverRevision = pack ? packTileArtRevision(pack) : packId;
      return {
        deckId: `pack:${packId}` as FcDeckId,
        title: packTitle(
          pack,
          ownedTitles[packId],
          packId,
          lang,
        ),
        count: cards.length,
        cardIds: cards.map((c) => c.id),
        icon: 'albums-outline' as IconName,
        coverImage,
        coverRevision,
        sourceKind: 'pack',
        ...(silent ? { packLanguage: NO_PACK_LANGUAGE } : {}),
      } satisfies DeckSheetOption;
    }),
  );
  for (const deck of packDecks) if (deck) out.push(deck);

  // зачем (Карточки 2.0, герой новичка «Первые 50 слов · Начать»): у новичка нет ни одной карточки — без этой колоды
  // настройка тренировки открылась бы пустой. Предлагаем встроенный набор только пока своих карточек нет (D160: en).
  if (starterPackAvailable(studyTarget) && out.every((deck) => deck.count === 0)) {
    const starterCards = deckCardsFromCardItems(starterFirst50CardItems(), cl);
    out.push({
      deckId: STARTER_FIRST_50_DECK_ID as FcDeckId,
      title: triLang(lang, STARTER_FIRST_50_TITLE),
      count: starterCards.length,
      cardIds: starterCards.map((c) => c.id),
      icon: 'sparkles-outline' as IconName,
      sourceKind: 'pack',
    } satisfies DeckSheetOption);
    console.log(`[FC-DECKS] starter:offered карточек=${starterCards.length} (своих карточек нет)`);
  }

  // Снимок для мгновенного первого кадра следующего открытия экрана.
  const key = deckOptionsCacheKey(mode, lang, studyTarget);
  if (localOnly) {
    console.log(`[FC-DECKS] build:done localOnly=yes наборов=${out.length} за ${Date.now() - startedAtMs}мс, снимок не трогаем, память=${key ? 'пишем' : 'НЕТ КЛЮЧА'}`);
    if (key) _localOnlyDeckOptions.set(key, { options: out, builtAtMs: Date.now(), ownedVersion: ownedPackIdsVersion() });
    return out;
  }
  console.log(`[FC-DECKS] build:done наборов=${out.length} всего за ${Date.now() - startedAtMs}мс, снимок=${key ? 'пишем' : 'НЕТ КЛЮЧА (аккаунт не готов)'}`);
  if (!key) return out;
  const warm = _warmDeckOptions?.key === key ? _warmDeckOptions.options : null;
  // Тот же состав — держим ПРЕЖНЮЮ ссылку, чтобы экран не перерисовывался зря.
  _warmDeckOptions = { key, options: warm && sameDeckOptions(warm, out) ? warm : out };
  // Отметка для короткого окна выше: без неё гейт никогда не сработал бы.
  _warmDeckOptionsBuiltAtMs = Date.now();
  // Тот же снимок — на диск, чтобы следующий ЗАПУСК приложения открыл экран сразу.
  persistDeckOptionsSnapshot(key, _warmDeckOptions.options);

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
export async function loadAllFcDeckRefs(studyTarget?: RuntimeStudyTarget): Promise<DeckRef[]> {
  /**
   * зачем: свои наборы здесь отсутствовали так же, как в списке выбора, — и это
   * било отдельно. Блиц без явного `?deck=` берёт пул ИМЕННО отсюда, поэтому у
   * человека с карточками ТОЛЬКО в своём наборе пул выходил пустым и режим не
   * стартовал. Ровно тот же отказ уже чинили 13.08.2026 для купленных наборов —
   * тогда фикс не покрыл свои. Ошибка источника не роняет остальные.
   */
  const [ownedIds, communityIds, localPacks] = await Promise.all([
    loadAccessiblePackIds(studyTarget).catch((error: unknown) => {
      console.warn('[FC-DECKS] refs:accessiblePackIds FAILED —',
        error instanceof Error ? `${error.name}: ${error.message}` : String(error));
      return [] as string[];
    }),
    loadCommunityOwnedPackIds(studyTarget).catch((error: unknown) => {
      console.warn('[FC-DECKS] refs:communityOwnedIds FAILED —',
        error instanceof Error ? `${error.name}: ${error.message}` : String(error));
      return [] as string[];
    }),
    loadLocalAuthorPacks(studyTarget).catch((error: unknown) => {
      console.warn('[FC-DECKS] refs:localAuthorPacks FAILED —',
        error instanceof Error ? `${error.name}: ${error.message}` : String(error));
      return [] as LocalAuthorPack[];
    }),
  ]);
  const { mine: myLocalPacks, cloudTwins } = splitLocalAuthorPacks(localPacks, studyTarget);
  const refs: DeckRef[] = [{ kind: 'saved' }, { kind: 'custom' }];
  const seen = new Set<string>();
  for (const id of [...ownedIds, ...communityIds, ...myLocalPacks.map((p) => p.id)]) {
    // Облачный близнец своего набора дал бы те же карточки второй раз.
    if (!id || seen.has(id) || cloudTwins.has(id)) continue;
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
export async function countAvailableFcCards(
  lang: Lang,
  studyTarget?: RuntimeStudyTarget,
): Promise<number> {
  const cl = contentLang(lang);
  try {
    const refs = await loadAllFcDeckRefs(studyTarget);
    const lists = await Promise.all(
      refs.map((ref) => loadDeckCards(ref, cl, studyTarget).catch((swallowedError: unknown) => { noteSwallowed('deck_options:promise_1', swallowedError); return []; })),
    );
    const ids = new Set<string>();
    for (const list of lists) for (const card of list) if (card?.id) ids.add(card.id);
    const cacheKey = availableCountCacheKey(lang, studyTarget);
    if (cacheKey) _warmAvailableCardCounts.set(cacheKey, ids.size);
    return ids.size;
  } catch (error: unknown) {
    // Немой catch запрещён: «0 карточек» неотличимо от «отказало хранилище».
    console.warn('[FC-DECKS] countAvailableFcCards FAILED — отдаём 0 —',
      error instanceof Error ? `${error.name}: ${error.message}` : String(error));
    return 0;
  }
}

/**
 * Сбросить тёплый снимок между тестами (по образцу __resetCustomCardsStoreForTests).
 *
 * зачем: снимок и его отметка времени живут в памяти МОДУЛЯ и переживают
 * AsyncStorage.clear(). Тесты выполняются быстрее окна DECK_OPTIONS_REBUILD_MIN_GAP_MS
 * (3 с), поэтому следующий тест получал список наборов от предыдущего и падал на
 * чужом packId. Из-за этого сторож своих наборов не мог отработать ни разу.
 * В проде сбрасывать нечего: снимок там и должен переживать переходы между экранами.
 */
/**
 * Синхронно: последний список наборов языка `studyTarget`, собранный в режиме localOnly; для текущего языка — обычный тёплый снимок.
 * null — этот язык ещё не собирали (экран показывает скелетон только на месте списка и зовёт loadFcDeckOptions(..., { localOnly: true })).
 */
export function peekFcDeckOptionsLocal(
  mode: FcPresetMode,
  lang: Lang,
  studyTarget?: RuntimeStudyTarget,
): DeckSheetOption[] | null {
  const key = deckOptionsCacheKey(mode, lang, studyTarget);
  if (!key) return null;
  return localOnlyDeckOptionsFresh(key) ?? (_warmDeckOptions?.key === key ? _warmDeckOptions.options : null);
}

export function __resetDeckOptionsWarmCacheForTests(): void {
  _localOnlyDeckOptions.clear();
  _warmDeckOptions = null;
  _warmDeckOptionsBuiltAtMs = 0;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

// зачем (координатор 12.10, утечка памяти в хабе Карточек; сперва логи): размеры кэшей этого модуля попадают в [HUB-LIFECYCLE] на mount/unmount хаба; вне dev — пусто.
registerHubCacheProbe('deck_options.warmAvailableCardCounts', () => _warmAvailableCardCounts.size);
registerHubCacheProbe('deck_options.warmDeckOptions', () => _warmDeckOptions?.options.length ?? 0);
