import fs from 'fs';
import path from 'path';

/**
 * Замечания владельца после теста на iPhone (2026-08-13):
 *   1) набор открывался «через промежуточное окно» — заглушка «пусто» и прыжок
 *      вкладки на «Сохранённые» до того, как приезжали карточки набора;
 *   2) «назад» из набора вело не туда, откуда набор открыли;
 *   3) в «Моих наборах» не было иконок наборов;
 *   4) «Мои наборы» не были разделены на добавленные и созданные.
 *
 * Тест держит эти четыре свойства на уровне исходников: они про порядок
 * навигации и первый кадр, которые в jsdom не воспроизводятся честно.
 */
const app = (...parts: string[]) => path.join(__dirname, '..', 'app', ...parts);
const read = (...parts: string[]) => fs.readFileSync(app(...parts), 'utf8');

const LOCALE_KEYS = ["ru:", "uk:", "es:", "'pt-BR':", 'vi:', 'id:', 'tr:', 'pl:'];

describe('открытие набора идёт без промежуточного экрана', () => {
  const staging = read('community_packs', 'staging.ts');
  const data = read('flashcards', 'useCollectionData.ts');
  const collection = read('flashcards_collection.tsx');

  it('staging отдаёт карточки уже открытого набора синхронно и делится промисом', () => {
    expect(staging).toContain('const communityPackCardsMemo = new Map<string, CardItem[]>()');
    expect(staging).toContain('export function stagedCommunityPackCardsPromise(');
    expect(staging).toContain('export function peekStagedCommunityPackCards(');
    // Синхронный шаг перед router.push: memo → staged, без await.
    expect(staging).toContain('stagedCommunityPackMarketCards = memo && memo.length > 0 ? memo : null;');
    expect(staging).not.toMatch(/export async function stageCommunityPackCardsForNavigation/);
  });

  it('коллекция ждёт именно staging-запрос набора, а не весь цикл загрузки', () => {
    expect(data).toContain('peekStagedCommunityPackCards');
    expect(data).toContain('stagedCommunityPackCardsPromise(deeplinkPackId)');
    expect(collection).toContain('deeplinkPackId: packDeeplink,');
  });

  it('вкладка набора не перебивается восстановлением позиции', () => {
    const marker = data.indexOf('export function applyPostLoadNavigation');
    expect(marker).toBeGreaterThan(-1);
    const body = data.slice(marker, marker + 2600);
    // `?pack=` решает раньше DEV-набора и раньше progress-restore и выходит.
    const packBranch = body.indexOf('if (ctx.packDeeplink) {');
    const progressBranch = body.indexOf('} else if (!rc && progress) {');
    expect(packBranch).toBeGreaterThan(-1);
    expect(progressBranch).toBeGreaterThan(packBranch);
    expect(body.slice(packBranch, progressBranch)).toContain("ctx.setActiveCat('custom');");
  });

  it('заглушка «пусто» не показывается, пока карточки набора в пути', () => {
    expect(collection).toContain(
      'const packCardsPending = !!packDeeplink && !collectionDataReady && filteredCards.length === 0;',
    );
    expect(collection).toContain('const isEmpty = !loading && !packCardsPending && filteredCards.length === 0;');
  });
});

describe('«назад» из набора ведёт туда, откуда пришли', () => {
  const collection = read('flashcards_collection.tsx');
  const myPacks = read('flashcards_my_packs.tsx');

  it('коллекция знает точку входа и возвращается ровно в неё', () => {
    expect(collection).toContain("if (raw === 'mine') return FC_MY_PACKS_ROUTE;");
    expect(collection).toContain("if (raw === 'community' || previewRequested) return FC_PACKS_ROUTE;");
    expect(collection).toContain('router.dismissTo(packBackOrigin as any);');
  });

  it('отказ в доступе тоже возвращает назад, а не на третий экран', () => {
    expect(collection).toContain('onDenied: () => leaveCollection(),');
    expect(collection).not.toContain("onDenied: () => router.replace('/flashcards' as any)");
  });

  it('«Мои наборы» помечают вход в набор', () => {
    expect(myPacks).toContain("params: { pack: pack.id, from: 'mine' },");
  });
});

describe('«Мои наборы»: иконки и два раздела', () => {
  const myPacks = read('flashcards_my_packs.tsx');

  it('иконка набора берётся так же, как в каталоге сообщества', () => {
    expect(myPacks).toContain("import { bundledPackTilePng, packTileImageForPack } from './flashcards/packMarketplaceIcons';");
    expect(myPacks).toContain('const png = packTileImageForPack(pack) ?? bundledPackTilePng(pack.id);');
    expect(myPacks).toContain('packCategoryIonIcon(pack.category)');
    expect(myPacks).toContain("import { Image } from 'expo-image';");
  });

  it('добавленные из сообщества и созданные мной — разные разделы, пустой не рисуется', () => {
    expect(myPacks).toContain('type MyPacksGroups = {');
    expect(myPacks).toContain('(isMine(pack) ? created : added).push(pack);');
    expect(myPacks).toContain("renderSection('added', copy.added, groups.added)");
    expect(myPacks).toContain("renderSection('created', copy.created, groups.created)");
    expect(myPacks).toContain('if (packs.length === 0) return null;');
  });

  it('заголовки разделов есть во всех 8 локалях', () => {
    for (const key of ['added', 'created'] as const) {
      const start = myPacks.indexOf(`      ${key}: triLang(lang, {`);
      expect([key, start > -1]).toEqual([key, true]);
      const block = myPacks.slice(start, myPacks.indexOf('}),', start));
      for (const locale of LOCALE_KEYS) {
        expect([key, locale, block.includes(locale)]).toEqual([key, locale, true]);
      }
    }
  });

  it('анимаций-циклов на экране нет', () => {
    expect(myPacks).not.toMatch(/withRepeat\([\s\S]{0,220}?,\s*-1/);
  });
});
