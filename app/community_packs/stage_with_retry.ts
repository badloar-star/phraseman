/**
 * Открытие набора с тихими повторами.
 *
 * зачем (координатор 02.10, вариант В; правило владельца 01.10 «никаких „не загрузилось“»):
 * при тапе по набору без карточек в памяти и без сети раньше сразу всплывало
 * «Не удалось загрузить набор. Проверьте интернет…». Теперь плитка держит свой
 * спиннер, пока мы тихо повторяем загрузку (всего 3 попытки), и только после
 * этого мягко говорим «Набор ещё не скачан — нужен интернет», без слова «ошибка».
 * Один помощник на все 7 мест — чтобы текст и поведение не разъехались.
 *
 * Firebase: лишние запросы бывают ТОЛЬКО при пустом ответе (повтор после
 * неудачи), удачное открытие по-прежнему стоит один запрос или ноль (память).
 */
import type { CardItem } from '../flashcards/types';
import { registerHubCacheProbe } from '../hub_lifecycle_probe';
import type { FlashcardMarketPack } from '../flashcards/marketplace';
import { storageStudyTarget, type RuntimeStudyTarget } from '../target_storage_keys';
import { actionToastTri, emitAppEvent } from '../events';
import { stageCommunityPackCardsForNavigation } from './staging';

/** Паузы перед 2-й и 3-й попыткой. Итого до ~4,5 с спиннера на плитке. */
export const PACK_STAGE_RETRY_DELAYS_MS: readonly number[] = [1500, 3000];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function stageCommunityPackCardsWithSilentRetry(
  packId: string,
  studyTarget?: RuntimeStudyTarget,
  packMeta?: FlashcardMarketPack,
  options?: { isStillWanted?: () => boolean; tag?: string },
): Promise<CardItem[]> {
  const tag = options?.tag ?? 'pack';
  const attempts = PACK_STAGE_RETRY_DELAYS_MS.length + 1;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let cards: CardItem[] = [];
    try {
      cards = await stageCommunityPackCardsForNavigation(packId, studyTarget, packMeta);
    } catch (error) {
      console.warn(`[FC-PACK-OPEN] ${tag} ${packId}: попытка ${attempt}/${attempts} упала`, error);
    }
    if (cards.length > 0) {
      if (attempt > 1) console.warn(`[FC-PACK-OPEN] ${tag} ${packId}: открылся с попытки ${attempt}`);
      return cards;
    }
    if (attempt === attempts) break;
    if (options?.isStillWanted && !options.isStillWanted()) {
      console.warn(`[FC-PACK-OPEN] ${tag} ${packId}: человек уже ушёл — повторы остановлены после ${attempt}`);
      return [];
    }
    console.warn(`[FC-PACK-OPEN] ${tag} ${packId}: пусто на попытке ${attempt}/${attempts} — тихий повтор`);
    await wait(PACK_STAGE_RETRY_DELAYS_MS[attempt - 1]);
  }
  console.warn(`[FC-PACK-OPEN] ${tag} ${packId}: тихие повторы исчерпаны — мягкая подсказка`);
  return [];
}

// ── Мгновенное открытие (packs-simple-004) ──────────────────────────────────
// зачем (решено по рекомендации, координатор 05.10): тап сразу ведёт на экран набора, подготовка карточек с тихими
// повторами идёт фоном. Реестр держит промис открытия: повторный тап по той же строке получает тот же промис (второго
// staging нет), экран коллекции ждёт именно его. Только память процесса.
type PackOpen = { promise: Promise<CardItem[]>; settled: CardItem[] | null };
const packOpens = new Map<string, PackOpen>();
const packOpenKey = (packId: string, studyTarget?: RuntimeStudyTarget) => `${packId}:${storageStudyTarget(studyTarget)}`;

export function startCommunityPackOpen(
  packId: string,
  studyTarget: RuntimeStudyTarget | undefined,
  packMeta: FlashcardMarketPack | undefined,
  tag: string,
): Promise<CardItem[]> {
  const key = packOpenKey(packId, studyTarget);
  const running = packOpens.get(key);
  if (running && running.settled === null) {
    console.warn(`[FC-PACK-OPEN] ${tag} ${packId}: повторный тап — то же открытие, второй загрузки нет`); // guard-ok: защита от двойного тапа
    return running.promise;
  }
  const entry: PackOpen = { promise: Promise.resolve([]), settled: null };
  entry.promise = stageCommunityPackCardsWithSilentRetry(packId, studyTarget, packMeta, { tag })
    .then((cards) => { entry.settled = cards; return cards; });
  packOpens.set(key, entry);
  return entry.promise;
}

/** Промис открытия набора (если он запускался с тапа) — для экрана коллекции. */
export function peekCommunityPackOpen(packId: string, studyTarget?: RuntimeStudyTarget): Promise<CardItem[]> | null {
  return packOpens.get(packOpenKey(packId, studyTarget))?.promise ?? null;
}

/** Только для тестов. */
export function __resetCommunityPackOpensForTests(): void {
  packOpens.clear();
}

/** Мягкая подсказка после исчерпанных повторов — без «ошибки» и «не удалось». */
export function emitPackNotDownloadedToast(): void {
  emitAppEvent('action_toast', actionToastTri('info', {
    ru: 'Набор ещё не скачан — нужен интернет.',
    uk: 'Набір ще не завантажено — потрібен інтернет.',
    en: 'This pack isn’t downloaded yet — you need internet.',
    es: 'El pack aún no está descargado: necesitas internet.',
    'pt-BR': 'O pacote ainda não foi baixado — é preciso internet.',
    vi: 'Bộ thẻ chưa được tải về — cần có mạng.',
    id: 'Paket belum diunduh — perlu internet.',
    tr: 'Paket henüz inmedi — internet gerekiyor.',
    pl: 'Zestaw nie jest jeszcze pobrany — potrzebny internet.',
  }));
}

// зачем (координатор 12.10, утечка памяти в хабе Карточек; сперва логи): размеры кэшей этого модуля попадают в [HUB-LIFECYCLE] на mount/unmount хаба; вне dev — пусто.
registerHubCacheProbe('community.packOpens', () => packOpens.size);
