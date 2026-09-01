/**
 * Сторож: карточки не должны снова расти внутри документа users/{stableId}.
 *
 * История (2026-09-01): progress.flashcards_v1 хранил ВЕСЬ список карточек одной
 * JSON-строкой внутри документа и рос без предела. У трёх самых активных аккаунтов
 * он раздул документ до 1100..1129 КБ при жёстком лимите Firestore в 1 048 576 байт.
 * Firestore начал отклонять ЛЮБУЮ запись в документ целиком
 * ("cannot be written because its size exceeds the maximum allowed size"), то есть
 * у этих людей молча перестал сохраняться ВЕСЬ прогресс — XP, стрик, уроки, — а не
 * только карточки. Отказ при этом не логировался (console.warn под __DEV__).
 *
 * Этот тест держит два обещания:
 *   1) страница карточек не может разрастись до размера, который снова упрётся в лимит;
 *   2) карточки не вернутся в документ — они уезжают в подколлекцию flashcard_pages.
 *
 * Ослаблять пороги ради прохождения новой фичи нельзя: именно этот инвариант
 * стоил трём живым людям месяцев потерянного прогресса.
 */
import {
  CARDS_PER_PAGE,
  MAX_CARDS_PER_PAGE_HARD_LIMIT,
  chunkCardsIntoPages,
  flashcardPageDocId,
} from '../app/flashcards_cloud_pages';

/** Жёсткий лимит документа Firestore. */
const FIRESTORE_DOC_LIMIT_BYTES = 1_048_576;

/**
 * Самая большая карточка, найденная в боевой базе при разборе аварии 2026-09-01.
 * Запас считаем по ней, а не по медиане (~266..363 Б) — сторож обязан держать
 * худший случай, иначе он бесполезен.
 */
const WORST_OBSERVED_CARD_BYTES = 2105;

describe('flashcard cloud pages — сторож от повторения аварии с лимитом документа', () => {
  it('страница даже из самых больших карточек не приближается к лимиту документа', () => {
    const worstCasePageBytes = CARDS_PER_PAGE * WORST_OBSERVED_CARD_BYTES;

    expect(worstCasePageBytes).toBeLessThan(FIRESTORE_DOC_LIMIT_BYTES);
    // Требуем не «влезает впритык», а кратный запас: карточки со временем
    // обрастают полями (literal/explanation/example на несколько языков).
    expect(worstCasePageBytes * 2).toBeLessThan(FIRESTORE_DOC_LIMIT_BYTES);
  });

  it('жёсткий предел страницы тоже держит худший случай', () => {
    expect(MAX_CARDS_PER_PAGE_HARD_LIMIT * WORST_OBSERVED_CARD_BYTES)
      .toBeLessThan(FIRESTORE_DOC_LIMIT_BYTES);
    expect(CARDS_PER_PAGE).toBeLessThanOrEqual(MAX_CARDS_PER_PAGE_HARD_LIMIT);
  });

  it('разбиение не теряет и не дублирует карточки', () => {
    const cards = Array.from({ length: 2685 }, (_, i) => ({ id: `card_${i}` }));

    const pages = chunkCardsIntoPages(cards);

    expect(pages.flat()).toEqual(cards);
    expect(pages.length).toBe(Math.ceil(2685 / CARDS_PER_PAGE));
  });

  it('ни одна страница не превышает предел, сколько бы карточек ни было', () => {
    // 2685 — реальное число карточек у самого тяжёлого пострадавшего аккаунта.
    for (const total of [0, 1, CARDS_PER_PAGE, CARDS_PER_PAGE + 1, 2685, 50_000]) {
      const pages = chunkCardsIntoPages(Array.from({ length: total }, (_, i) => i));
      for (const page of pages) {
        expect(page.length).toBeLessThanOrEqual(CARDS_PER_PAGE);
      }
      expect(pages.flat().length).toBe(total);
    }
  });

  it('запрошенный размер страницы нельзя задрать выше жёсткого предела', () => {
    // зачем: защита от «оптимизации» в будущем — попытка сложить всё в одну
    // страницу вернула бы ровно исходную аварию, просто в другом документе.
    const pages = chunkCardsIntoPages(Array.from({ length: 5000 }, (_, i) => i), 99_999);

    for (const page of pages) {
      expect(page.length).toBeLessThanOrEqual(MAX_CARDS_PER_PAGE_HARD_LIMIT);
    }
  });

  it('страницы разных языков не смешиваются', () => {
    expect(flashcardPageDocId('en', 0)).not.toBe(flashcardPageDocId('fr', 0));
    // Сортируемые id: страница 10 должна идти после страницы 2 и лексикографически.
    expect(flashcardPageDocId('en', 2) < flashcardPageDocId('en', 10)).toBe(true);
  });
});

describe('cloud_sync — карточки не возвращаются в документ users/{stableId}', () => {
  it('SYNC_KEYS всё ещё содержит flashcards_v1, но это локальный ключ, а не путь записи', async () => {
    // Ключ обязан остаться в SYNC_KEYS: он нужен для restore из документа у ещё
    // не мигрированных аккаунтов. Гарантия «не растёт в документе» обеспечивается
    // выносом в подколлекцию в doSyncToCloud, а не удалением ключа из списка.
    const { SYNC_KEYS } = await import('../app/cloud_sync');
    expect(SYNC_KEYS).toContain('flashcards_v1');
  });

  it('исходник doSyncToCloud исключает вынесенные карточки из патча документа', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'cloud_sync.ts'), 'utf8');

    // Сторож на регрессию: если кто-то уберёт вынос, карточки снова поедут в документ.
    expect(source).toContain('offloadedFlashcardKeys');
    expect(source).toContain('writeFlashcardPages');
    expect(source).toMatch(/if \(offloadedFlashcardKeys\.has\(key\)\) continue;/);
  });

  it('отказ записи по размеру документа логируется как critical, а не молчит', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'cloud_sync.ts'), 'utf8');

    // Переполнение документа обязано быть отличимо от прочих отказов и уходить
    // в Firestore как critical: раньше оно молчало (console.warn под __DEV__,
    // а в сторовой сборке __DEV__ = false) и авария жила месяцами незамеченной.
    expect(source).toContain('isDocumentTooLargeError');
    expect(source).toMatch(/isDocumentTooLargeError\(e\)/);
  });
});
