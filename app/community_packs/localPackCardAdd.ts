/**
 * «В набор» для ОДНОЙ карточки: положить карточку в свой локальный (ещё не опубликованный) набор.
 *
 * зачем (Карточки 2.0, макет cards-v2: плитка «В набор» в шторке карточки): раньше карточки попадали в набор только пачкой — через «Отметить несколько →
 * Создать набор» или редактор набора. Здесь — новое действие над данными, но без новых серверных вызовов и без второй записи в обход хранилища:
 * только публичные `loadLocalAuthorPacks` / `saveLocalAuthorPack`, как у `localPackCardOps`. Опубликованные наборы (есть `cloudPackId`) не трогаем:
 * их правка идёт через сервер и модерацию (редактор набора).
 * Формат карточки набора — тот же, что собирает `community_pack_create.tsx` из сохранённой карточки (rowFromStagedSavedCard).
 */
import { normalizePackCardTexts, normalizePackLanguage } from '../flashcards/pack_languages';
import { isDevCardsFail } from '../dev_cards_state';
import type { CardItem } from '../flashcards/types';
import { loadLocalAuthorPacks, saveLocalAuthorPack, type LocalAuthorPack } from './localAuthorPacks';
import { withLocalPackLock } from './local_pack_lock';
import type { CommunityPackCardPayload, CommunityPackSubmissionPayload } from './schema';

const LOG = '[PACK-CARD-ADD]';

export type AddCardToLocalPackResult = 'added' | 'duplicate' | 'not_found' | 'published' | 'failed';

/** Наборы, куда можно добавить карточку: свои, не опубликованные. Пусто — выбирать некуда (экран предложит создать набор). */
export async function loadAddableLocalPacks(): Promise<LocalAuthorPack[]> {
  const packs = await loadLocalAuthorPacks();
  const addable = packs.filter((pack) => !pack.cloudPackId);
  console.log(`${LOG} доступно наборов=${addable.length} из ${packs.length}`);
  return addable;
}

/**
 * Состояние шторки «В какой набор?»: куда можно добавлять и сколько опубликованных наборов выпало из списка.
 * зачем (решение координатора 12.10): если addable пуст, но опубликованные есть, текст «Своих наборов пока нет» неверен — показываем «Нет наборов, куда можно добавить».
 */
export async function loadPackPickerState(): Promise<Readonly<{ addable: LocalAuthorPack[]; publishedCount: number }>> {
  const packs = await loadLocalAuthorPacks();
  const addable = packs.filter((pack) => !pack.cloudPackId);
  console.log(`${LOG} шторка: доступно=${addable.length} опубликовано=${packs.length - addable.length}`);
  return { addable, publishedCount: packs.length - addable.length };
}

/** Карточка набора из любой карточки приложения (тексты — как при «Создать набор из выбранных»). */
export function packCardFromCardItem(card: CardItem, id: string): CommunityPackCardPayload {
  const normalized = normalizePackCardTexts(card as unknown as Record<string, unknown>, normalizePackLanguage(card.packLanguage));
  const note = String(card.note ?? card.description ?? '').trim();
  return {
    id,
    en: normalized.targetText,
    ru: normalized.translationText,
    uk: note,
    translationUk: typeof card.uk === 'string' && card.uk.trim() ? card.uk : undefined,
    origin: card.origin ?? { source: String(card.source ?? 'lesson'), sourceId: String(card.sourceId ?? ''), sourceTitle: String(card.sourceTitle ?? '') },
    es: typeof card.es === 'string' ? card.es.trim() || undefined : undefined,
    sourceLocales: card.sourceLocales as CommunityPackCardPayload['sourceLocales'],
  };
}

/** Следующий свободный id вида `c<N>` (так нумерует карточки редактор набора). */
export function nextPackCardId(cards: readonly Pick<CommunityPackCardPayload, 'id'>[]): string {
  let max = 0;
  for (const card of cards) {
    const match = /^c(\d+)$/.exec(card.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `c${Math.max(max, cards.length) + 1}`;
}

function sameText(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}

export function addCardToLocalPack(packId: string, card: CardItem): Promise<AddCardToLocalPackResult> {
  // зачем (аудит Optimistic UI 15.10): две быстрые правки одного набора идут по очереди — вторая читает уже записанное первой
  return withLocalPackLock(packId, () => addCardToLocalPackLocked(packId, card));
}

async function addCardToLocalPackLocked(packId: string, card: CardItem): Promise<AddCardToLocalPackResult> {
  console.log(`${LOG} старт packId=${packId} cardId=${card.id}`);
  // зачем (координатор 12.10, R1 «нет пути», Карточки): dev `fail=pack_write` — запись в набор не удалась (тост «Не удалось добавить»); в стор-сборке геттер выключен.
  if (isDevCardsFail('pack_write')) {
    console.warn(`${LOG} запись подменена сбоем (pack_write) packId=${packId}`); // guard-ok: dev-ветка
    return 'failed';
  }
  try {
    const pack = (await loadLocalAuthorPacks()).find((item) => item.id === packId);
    if (!pack) {
      console.warn(`${LOG} набор не найден packId=${packId}`);
      return 'not_found';
    }
    if (pack.cloudPackId) {
      console.warn(`${LOG} набор опубликован (cloudPackId=${pack.cloudPackId}) — добавление карточки отсюда запрещено`);
      return 'published';
    }
    const next = packCardFromCardItem(card, nextPackCardId(pack.cards));
    if (!next.en) {
      console.warn(`${LOG} у карточки нет текста cardId=${card.id}`);
      return 'failed';
    }
    if (pack.cards.some((existing) => sameText(existing.en, next.en))) {
      console.log(`${LOG} дубль «${next.en}» уже в наборе packId=${packId}`);
      return 'duplicate';
    }
    const payload: CommunityPackSubmissionPayload = {
      title: pack.title,
      description: pack.description,
      cardThemeKey: pack.cardThemeKey ? (pack.cardThemeKey as never) : undefined,
      cards: [...pack.cards, next],
      packLanguage: pack.packLanguage,
      priceRunes: pack.priceRunes,
      studyTarget: pack.studyTarget,
    };
    await saveLocalAuthorPack(payload, {
      packId: pack.id,
      studyTarget: pack.studyTarget,
      cloudPackId: pack.cloudPackId,
      authorStableId: pack.authorStableId,
      isPremium: true, // набор уже существует — лимит новых наборов не применяется
    });
    console.log(`${LOG} добавлено packId=${packId} id=${next.id} всего=${pack.cards.length + 1}`);
    return 'added';
  } catch (error) {
    console.warn(`${LOG} сбой: ${error instanceof Error ? error.message : String(error)}`);
    return 'failed';
  }
}

/* expo-router route shim: keeps the helper out of the route tree. */
export default function __RouteShim() { return null; }
