// зачем (сверка Макетов e4e4149d0, «Каталог без сети»): пустой каталог без сети — «Нет сети» + «Повторить» на всех 9 языках,
// с логом [CATALOG-OFFLINE] и причиной; с сетью остаётся прежнее «Здесь появятся наборы после публикации».
import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: { fetch: jest.fn() } }));

import { catalogOfflineVerdict } from '../app/flashcards/useCatalogOffline';

const root = join(__dirname, '..');
const hub = readFileSync(join(root, 'app', 'flashcards', 'FlashcardsCategoryHub.tsx'), 'utf8');
const packs = readFileSync(join(root, 'app', 'flashcards_packs.tsx'), 'utf8');
const hook = readFileSync(join(root, 'app', 'flashcards', 'useCatalogOffline.ts'), 'utf8');

const LANGS = ['ru', 'uk', 'en', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl'];

function block(src: string, startMarker: string, length = 900): string {
  const i = src.indexOf(startMarker);
  expect(i).toBeGreaterThan(-1);
  return src.slice(i, i + length);
}

describe('каталог без сети', () => {
  // зачем (владелец 26.10, «Нет сети» при живой сети): один снимок reachable=false — ещё не офлайн; подтверждение — второе
  // чтение через 5 с тем же правилом (app/net_offline_step.ts).
  it('вердикт: нет соединения → офлайн с причиной; одиночный reachable=false — ещё нет; иначе онлайн', () => {
    expect(catalogOfflineVerdict({ isConnected: false, isInternetReachable: false, type: 'none' } as any)).toMatchObject({ offline: true, reason: expect.stringContaining('not_connected') });
    expect(catalogOfflineVerdict({ isConnected: true, isInternetReachable: false, type: 'wifi' } as any)).toMatchObject({ offline: false, reason: expect.stringContaining('unreachable_wait') });
    expect(catalogOfflineVerdict({ isConnected: true, isInternetReachable: true, type: 'wifi' } as any).offline).toBe(false);
    // null = система ещё не знает — не считаем офлайном, чтобы не пугать зря
    expect(catalogOfflineVerdict({ isConnected: null, isInternetReachable: null, type: 'unknown' } as any).offline).toBe(false);
  });

  // зачем (правило владельца 01.10 и 18.10 «экранов-ошибок нигде», координатор 08:00): «Нет сети» с облаком и «Повторить» заменены обычным пустым каталогом; каталог тихо перечитывается сам.
  it('хаб без сети: нет «Нет сети», облака и кнопки; пустой каталог — обычное пустое, повтор через ворота, причина в журнале', () => {
    expect(hub).not.toContain("'Нет сети'");
    expect(hub).not.toContain('cloud-offline-outline');
    expect(hub).not.toContain('flashcards-community-offline-retry');
    expect(hub).toContain('const catalogOfflineEmpty = communityOffline && catalogCommunityPacks.length === 0;');
    expect(hub).toContain("useLoadGate({ id: 'cards-community-catalog'");
    expect(hub).toContain("logNoErrorScreen('flashcards_category_hub', 'community_offline_empty', 'quiet_empty')");
  });

  it('экран подключает хук и «Повторить»; логи [NET-BANNER] place=cards_catalog несут попытку и причину', () => {
    expect(packs).toMatch(/useCatalogOffline\(\{/);
    expect(packs).toMatch(/communityOffline=\{communityOffline\}/);
    expect(packs).toMatch(/onRetryCatalog=\{retryCatalog\}/);
    expect(hook).toContain('[NET-BANNER] place=cards_catalog probe attempt=${attempt} offline=${String(step.offline)} recheckInMs=${String(step.recheckInMs)} reason=${step.reason}');
    expect(hook).toContain('[NET-BANNER] place=cards_catalog probe failed attempt=${attempt} reason=');
    expect(hook).toContain("probe(step.unreachableSinceMs, 'confirm')");
  });
});
