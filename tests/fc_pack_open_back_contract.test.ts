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

  it('staging завершает ready-snapshot до навигации и сохраняет быстрый memo-путь', () => {
    expect(staging).toContain('const communityPackCardsMemo = new Map<string, CardItem[]>()');
    expect(staging).toContain('export function stagedCommunityPackCardsPromise(');
    expect(staging).toContain('export function peekStagedCommunityPackCards(');
    expect(staging).toContain('export async function stageCommunityPackCardsForNavigation');
    expect(staging).toContain('loadLocalAuthorPacks(studyTarget)');
    expect(staging).toContain('localAuthorPackCardItems(localPack)');
    expect(staging).toContain('stagedCommunityPackMeta = packMeta ? { key, pack: packMeta } : null;');
    expect(staging).toContain('stagedCommunityPackMarketCards = memo && memo.length > 0 ? { key, cards: memo } : null;');
  });

  it('коллекция получает и карточки, и метаданные набора на первом кадре', () => {
    expect(data).toContain('peekStagedCommunityPackCards');
    expect(data).toContain('stagedCommunityPackCardsPromise(deeplinkPackId, studyTarget)');
    expect(data).toContain('peekStagedCommunityPackMeta(opts.deeplinkPackId ?? null, studyTarget)');
    expect(collection).toContain('deeplinkPackId: packDeeplink,');
  });

  it('staging не считается разрешением на доступ к чужому набору', () => {
    const guardStart = data.indexOf('export function usePackDeeplinkGuard');
    const guard = data.slice(guardStart, data.indexOf('// ── E11: undo', guardStart));
    const ownedStart = guard.indexOf('const owned =');
    const ownedEnd = guard.indexOf(';', ownedStart);

    expect(guard.slice(ownedStart, ownedEnd)).not.toContain('stagedFromHub');
  });

  // зачем: 6ce8e6b4e (снимок 1.6.16, 03.09) — кнопки «Слушать/Тренировать» ушли со страницы набора;
  // тренировка стартует только из хаба/таббара, поэтому чужой набор по ссылке не даёт входа в режимы вовсе.
  it('страница набора не открывает режимы тренировки (вход только из хаба)', () => {
    expect(collection).not.toContain('trainDeckId');
    expect(collection).not.toContain('showModeButtons');
  });

  it('оба экрана ждут cold staging и только потом делают push', () => {
    const hub = read('flashcards', 'FlashcardsCategoryHub.tsx');
    const myPacks = read('flashcards_my_packs.tsx');

    for (const source of [hub, myPacks]) {
      const awaited = source.indexOf('await stageCommunityPackCardsWithSilentRetry(pack.id, studyTarget, pack');
      const pushed = source.indexOf("pathname: '/flashcards_collection'", awaited);
      expect(awaited).toBeGreaterThan(-1);
      expect(pushed).toBeGreaterThan(awaited);
    }
  });

  it('поздний ответ старого открытия не проходит ABA-проверку того же pack id', () => {
    const hub = read('flashcards', 'FlashcardsCategoryHub.tsx');
    const myPacks = read('flashcards_my_packs.tsx');

    for (const source of [hub, myPacks]) {
      expect(source).toContain('const requestToken = ++openingRequestGenerationRef.current;');
      expect(source).toContain('openingRequestGenerationRef.current !== requestToken');
      expect(source).toContain('openingRequestGenerationRef.current += 1;');
    }
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
    expect(collection).toContain('!!packDeeplink && !collectionDataReady && (filteredCards.length === 0 || !currentMarketPack);');
    // зачем: efe19ae9d — список рисует `listCards` (с лимитом показа), пустота считается по нему же.
    expect(collection).toContain('const isEmpty = !loading && !packCardsPending && listCards.length === 0;');
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

  // зачем (макет cards-section «Мои наборы»): плитки-обложки заменены строками-карточками с плиткой-иконкой
  // (layers у созданных, people у добавленных); разметка живёт в MyPacksV2, логика групп — в экране.
  const view = read('flashcards', 'MyPacksV2.tsx');

  it('строка набора: плитка-иконка макета, название, подпись, число', () => {
    expect(view).toContain("icon={own ? 'layers-outline' : 'people-outline'}");
    expect(view).toContain('count={pack.cardCount}');
  });

  it('добавленные из сообщества и созданные мной — разные разделы, пустой не рисуется', () => {
    expect(myPacks).toContain('type MyPacksGroups = {');
    expect(myPacks).toContain('(isMine(pack) ? created : added).push(pack);');
    // зачем: 13c9f3012 (PM-093..096) — разделы рисуются из отфильтрованных поиском групп.
    expect(myPacks).toContain('created={visibleGroups.created}');
    expect(myPacks).toContain('added={visibleGroups.added}');
    expect(view).toContain('created.length > 0');
    expect(view).toContain('added.length > 0');
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
