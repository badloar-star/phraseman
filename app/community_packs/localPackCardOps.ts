/**
 * Убрать карточку из СВОЕГО локального набора и вернуть её на место («Карточка удалена · Вернуть»).
 *
 * зачем (владелец 04.10, cards-section «Своя карточка» → «Удалить»): у раскрытой карточки своего набора есть «Удалить» с тостом «Вернуть».
 * Раньше карточку набора можно было убрать только в редакторе набора. Работает ТОЛЬКО с локальными наборами автора, которых ещё нет в сообществе:
 * правка опубликованного набора идёт через сервер (редактор набора) — для неё нужен отдельный серверный механизм.
 * Используются только публичные функции хранилища локальных наборов (чтение + сохранение), второй записи в обход них нет.
 */
import { communityPackCardsToCardItems } from './communityFirestore';
import { loadLocalAuthorPacks, saveLocalAuthorPack, type LocalAuthorPack } from './localAuthorPacks';
import { withLocalPackLock } from './local_pack_lock';
import type { CommunityPackCardPayload, CommunityPackSubmissionPayload } from './schema';

export type LocalPackCardSnapshot = Readonly<{ packId: string; card: CommunityPackCardPayload; index: number }>;

const LOG = '[PACK-CARD-DELETE]';

function cardItemId(pack: LocalAuthorPack, card: CommunityPackCardPayload): string | null {
  return communityPackCardsToCardItems(pack.id, [card], pack.packLanguage)[0]?.id ?? null;
}

function payloadFrom(pack: LocalAuthorPack, cards: CommunityPackCardPayload[]): CommunityPackSubmissionPayload {
  return {
    title: pack.title,
    description: pack.description,
    // зачем: тип ключа темы в LocalAuthorPack — строка; приведение через never — потому что прямое приведение к CommunityPackCardThemeKey роняет компилятор
    cardThemeKey: pack.cardThemeKey ? (pack.cardThemeKey as never) : undefined,
    cards,
    packLanguage: pack.packLanguage,
    priceRunes: pack.priceRunes,
    studyTarget: pack.studyTarget,
  };
}

async function persist(pack: LocalAuthorPack, cards: CommunityPackCardPayload[]): Promise<void> {
  await saveLocalAuthorPack(payloadFrom(pack, cards), {
    packId: pack.id,
    studyTarget: pack.studyTarget,
    cloudPackId: pack.cloudPackId,
    authorStableId: pack.authorStableId,
    isPremium: true, // набор уже существует — лимит новых наборов не применяется
  });
}

/** Убирает карточку; null — набор или карточка не найдены (или набор уже опубликован). */
export function removeCardFromLocalPack(packId: string, cardId: string): Promise<LocalPackCardSnapshot | null> {
  // зачем (аудит Optimistic UI 15.10): чтение и запись набора — под очередью по набору, чтобы две быстрые правки не затирали друг друга
  return withLocalPackLock(packId, () => removeCardFromLocalPackLocked(packId, cardId));
}

async function removeCardFromLocalPackLocked(packId: string, cardId: string): Promise<LocalPackCardSnapshot | null> {
  console.log(`${LOG} старт packId=${packId} cardId=${cardId}`);
  const pack = (await loadLocalAuthorPacks()).find((item) => item.id === packId);
  if (!pack) {
    console.warn(`${LOG} набор не найден packId=${packId}`);
    return null;
  }
  if (pack.cloudPackId) {
    console.warn(`${LOG} набор опубликован (cloudPackId=${pack.cloudPackId}) — локальное удаление карточки запрещено`);
    return null;
  }
  const index = pack.cards.findIndex((card) => cardItemId(pack, card) === cardId);
  if (index < 0) {
    console.warn(`${LOG} карточка не найдена в наборе cardId=${cardId} всего=${pack.cards.length}`);
    return null;
  }
  const card = pack.cards[index]!;
  await persist(pack, pack.cards.filter((_, i) => i !== index));
  console.log(`${LOG} убрано index=${index} осталось=${pack.cards.length - 1}`);
  return { packId, card, index };
}

/** Возвращает карточку на её место; false — набор исчез или карточка уже есть. */
export function restoreCardToLocalPack(snapshot: LocalPackCardSnapshot): Promise<boolean> {
  return withLocalPackLock(snapshot.packId, () => restoreCardToLocalPackLocked(snapshot));
}

async function restoreCardToLocalPackLocked(snapshot: LocalPackCardSnapshot): Promise<boolean> {
  const pack = (await loadLocalAuthorPacks()).find((item) => item.id === snapshot.packId);
  if (!pack) {
    console.warn(`${LOG} возврат: набор исчез packId=${snapshot.packId}`);
    return false;
  }
  if (pack.cards.some((card) => card.id === snapshot.card.id)) {
    console.warn(`${LOG} возврат: карточка уже в наборе id=${snapshot.card.id}`);
    return true;
  }
  const next = [...pack.cards];
  next.splice(Math.min(snapshot.index, next.length), 0, snapshot.card);
  await persist(pack, next);
  console.log(`${LOG} возвращено index=${snapshot.index} всего=${next.length}`);
  return true;
}
