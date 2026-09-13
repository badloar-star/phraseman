import fs from 'fs';
import path from 'path';

/**
 * зачем (владелец, 2026-09-13): «при отмечании наборов для тренировок оно
 * грузится слишком долго очень долго, а должно открываться мгновенно».
 *
 * Два структурных дефекта, каждый из которых сам по себе возвращает медленный
 * экран, поэтому оба закрыты сторожем:
 *
 *  1. Снимок списка наборов жил ТОЛЬКО в памяти процесса. После перезапуска
 *     приложения первый вход всегда показывал спиннер и ждал семь чтений.
 *  2. Список ждал каталог сообщества — при промахе кэша это пять запросов в
 *     Firestore до 200 документов, хотя нужен он лишь ради обложки чужого
 *     набора.
 */
const root = path.join(__dirname, '..');
const read = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

const deckOptions = read('app', 'flashcards', 'deck_options.ts');
const hubScreen = read('app', 'flashcards', 'FlashcardsHubScreen.tsx');
const setupScreen = read('app', 'flashcards_training_setup.tsx');

describe('снимок списка наборов переживает перезапуск', () => {
  it('пишется на диск, а не только в память процесса', () => {
    expect(deckOptions).toContain('DECK_OPTIONS_SNAPSHOT_KEY');
    expect(deckOptions).toContain('AsyncStorage.setItem(DECK_OPTIONS_SNAPSHOT_KEY');
    // Запись не на критическом пути: экран её не ждёт.
    expect(deckOptions).toContain('void AsyncStorage.setItem(DECK_OPTIONS_SNAPSHOT_KEY');
  });

  it('поднимается с диска и не затирает более свежую память', () => {
    expect(deckOptions).toContain('export async function hydrateFcDeckOptionsSnapshot');
    // Обе проверки обязательны: до чтения диска и после него (гонка с загрузкой).
    expect(deckOptions.match(/if \(_warmDeckOptions\) return;/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('гидратация запускается в хабе, до открытия экрана выбора', () => {
    // Если снимок поднимать в самом экране, он опоздает к первому кадру.
    expect(hubScreen).toContain('hydrateFcDeckOptionsSnapshot');
    expect(hubScreen).toContain('void hydrateFcDeckOptionsSnapshot();');
  });

  it('экран выбора берёт снимок синхронно на первом кадре', () => {
    expect(setupScreen).toContain('peekFcDeckOptions');
    // Спиннер допустим только когда показывать нечего.
    expect(setupScreen).toContain("warmDecks && warmDecks.length > 0 ? 'ready' : 'loading'");
  });
});

describe('медленный каталог сообщества не держит список', () => {
  it('используется тёплый слепок, а сеть догоняет фоном', () => {
    expect(deckOptions).toContain('peekPublishedCommunityMarketPacks');
    // Ожидание сетевого каталога внутри Promise.all вернуло бы баг.
    expect(deckOptions).not.toContain("timed('publishedCatalog', () => loadPublishedCommunityMarketPacks");
    expect(deckOptions).toContain('void loadPublishedCommunityMarketPacks(studyTarget)');
  });

  it('прогрев каталога не молчит при отказе', () => {
    // Запрет владельца на немой catch: проглоченный отказ обязан писать причину.
    expect(deckOptions).toContain('publishedCatalog:warm FAILED');
  });
});

describe('трассировка скорости остаётся навсегда', () => {
  it('каждый источник и сборка списка замеряются под единым префиксом', () => {
    // Без замеров следующая регрессия скорости снова будет невидимой.
    expect(deckOptions).toContain('[FC-DECKS] source:');
    expect(deckOptions).toContain('[FC-DECKS] sources:done');
    expect(deckOptions).toContain('[FC-DECKS] build:done');
    expect(deckOptions).toContain('[FC-DECKS] peek:');
  });

  it('промах снимка объясняет причину, а не молчит', () => {
    expect(deckOptions).toContain('нет ключа аккаунта');
    expect(deckOptions).toContain('snapshot:hydrate');
  });
});
