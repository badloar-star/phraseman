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
import type Ionicons from '@expo/vector-icons/Ionicons';
import { captureAccountGeneration } from '../account_generation';
import { accountScopeKey } from '../account_scope_key';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { triLang, type Lang } from '../../constants/i18n';
import {
  loadCommunityOwnedPackIds,
  loadCommunityOwnedPackTitles,
  type CommunityOwnedPackTitle,
} from '../community_packs/communityOwnedStorage';
import { loadPublishedCommunityMarketPacks, peekPublishedCommunityMarketPacks } from '../community_packs/communityFirestore';
import {
  loadLocalAuthorPacks,
  localAuthorPackToMarketPack,
  type LocalAuthorPack,
} from '../community_packs/localAuthorPacks';
import { storageStudyTarget } from '../target_storage_keys';
import type { DeckSheetOption } from './DeckPickerSheet';
import { cardBackFanImage } from './cardBackCatalog';
import { loadDeckCards, type DeckRef } from './deck_sources';
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
): Promise<DeckSheetOption[]> {
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
      tr: 'Kartlarım', pl: 'Moje fiszki',
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
  for (const pack of [...bundled, ...communityPacks, ...localMarketPacks]) {
    if (packIds.includes(pack.id)) catalogById.set(pack.id, pack);
  }
  const packDecks = await Promise.all(
    packIds.map(async (packId) => {
      const cards = await loadDeckCards({ kind: 'pack', packId }, cl, studyTarget).catch(() => []);
      /** Набор без доступных на устройстве карточек в списке не нужен. */
      if (cards.length === 0) return null;
      const pack = catalogById.get(packId);
      const storedBackKey = ownedTitles[packId]?.ugcCardBackKey;
      const coverImage = pack
        ? packTileImageForPack(pack) ?? bundledPackTilePng(pack.id)
        : cardBackFanImage(storedBackKey) ?? bundledPackTilePng(packId);
      const coverRevision = pack ? packTileArtRevision(pack) : storedBackKey || packId;
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
      } satisfies DeckSheetOption;
    }),
  );
  for (const deck of packDecks) if (deck) out.push(deck);

  // Снимок для мгновенного первого кадра следующего открытия экрана.
  const key = deckOptionsCacheKey(mode, lang, studyTarget);
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
      refs.map((ref) => loadDeckCards(ref, cl, studyTarget).catch(() => [])),
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
export function __resetDeckOptionsWarmCacheForTests(): void {
  _warmDeckOptions = null;
  _warmDeckOptionsBuiltAtMs = 0;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
