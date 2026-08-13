/**
 * cards-2.1 (§6 SPEC_2_1): сборка списка колод для `DeckPickerSheet`.
 *
 * После §4/§5 плитки режимов с хаба удалены, и шит выбора колоды открывается из
 * нижнего таббара (⚙ / долгий тап на пункте «Тренировка/Слушать/Блиц»). Список
 * колод раньше собирался инлайном в хабе — здесь он вынесен в отдельный модуль:
 *  • 'weak'      — due-очередь тренера (только у режима «Тренировка», выбирается
 *                  в одиночку, см. deck_selection.SOLO_DECK_ID);
 *  • 'saved'     — все сохранённые карточки (flashcards_v1);
 *  • 'custom'    — мои карточки (custom_flashcards_v2);
 *  • 'pack:<id>' — добавленные наборы, чьи карточки доступны на устройстве.
 *
 * `cardIds` отдаём везде, где карточки реально загружены, — счётчик «Выбрано N ·
 * M карточек» дедуплицирует одну и ту же карточку в двух колодах (§6).
 * Ошибка любой отдельной колоды не роняет список.
 */
import type { Ionicons } from '@expo/vector-icons';
import { triLang, type Lang } from '../../constants/i18n';
import { getTrainerTotalDue } from '../trainer_store';
import { loadCommunityOwnedPackIds } from '../community_packs/communityOwnedStorage';
import type { DeckSheetOption } from './DeckPickerSheet';
import { loadDeckCards } from './deck_sources';
import {
  bundledPacksForOwned,
  loadAccessiblePackIds,
  packTitleForInterface,
  type FlashcardMarketPack,
} from './marketplace';
import type { FcDeckId, FcPresetMode } from './mode_prefs';
import type { FlashcardContentLang } from './types';

type IconName = keyof typeof Ionicons.glyphMap;

const contentLang = (lang: Lang): FlashcardContentLang =>
  lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';

/** Заголовок набора для списка: бандл знает названия, у остальных — код набора. */
function packTitle(pack: FlashcardMarketPack | undefined, packId: string, lang: Lang): string {
  if (pack) return packTitleForInterface(pack, contentLang(lang)) || pack.codeName || packId;
  return packId.replace(/^official_/, '').replace(/_/g, ' ');
}

/**
 * Колоды для шита выбора. `mode` влияет только на присутствие псевдо-колоды
 * «Слабые» — у слушания и блица due-очереди тренера нет (E10/E12).
 */
export async function loadFcDeckOptions(
  mode: FcPresetMode,
  lang: Lang,
): Promise<DeckSheetOption[]> {
  const cl = contentLang(lang);
  const [weakCount, savedCards, customCards, ownedIds, communityIds] = await Promise.all([
    mode === 'trainer' ? getTrainerTotalDue().catch(() => 0) : Promise.resolve(0),
    loadDeckCards({ kind: 'saved' }, cl).catch(() => []),
    loadDeckCards({ kind: 'custom' }, cl).catch(() => []),
    loadAccessiblePackIds().catch(() => [] as string[]),
    loadCommunityOwnedPackIds().catch(() => [] as string[]),
  ]);

  const out: DeckSheetOption[] = [];

  if (mode === 'trainer') {
    out.push({
      deckId: 'weak',
      title: triLang(lang, { ru: 'Слабые', uk: 'Слабкі', es: 'Difíciles' }),
      count: weakCount,
      icon: 'flash-outline' as IconName,
    });
  }

  out.push({
    deckId: 'saved',
    title: triLang(lang, { ru: 'Все сохранённые', uk: 'Усі збережені', es: 'Todas las guardadas' }),
    count: savedCards.length,
    cardIds: savedCards.map((c) => c.id),
    icon: 'bookmark-outline' as IconName,
  });

  out.push({
    deckId: 'custom',
    title: triLang(lang, { ru: 'Мои карточки', uk: 'Мої картки', es: 'Mis tarjetas' }),
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

  return out;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
