// зачем (PM-214 «мгновенное открытие разделов», владелец 04.10: «абсолютно каждый раздел открывается без экранов загрузки»; часть Тем — вкладки Карточек и Сообщества):
// первый кадр берётся из кэша/снимка (peek), сеть обновляет фоном; полноэкранных спиннеров нет. Статический контракт — кадры и самолётный прогон за Сверкой.
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';

const read = (rel: string): string => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));

describe('PM-214: Карточки и Сообщество — первый кадр из кэша', () => {
  it('«Мои наборы»: группы из прогретого кэша в начальном состоянии, список показывается и при loading, если наборы уже есть', () => {
    const src = read('app/flashcards_my_packs.tsx');
    expect(src).toContain('useState<MyPacksGroups>(() => peekMyPacksGroups(studyTarget');
    // зачем (правило владельца 18.10 «экранов-ошибок нигде»): состояния 'unavailable' больше нет — при исчерпанных воротах и нуле наборов экран рисует то же, что при пустом списке
    expect(src).toContain("const listStatus: 'list' | 'loading' | 'empty' | 'quiet' = packCount > 0\n    ? 'list'".replace(/\n/g, src.includes('\r\n') ? '\r\n' : '\n'));
    // единственный спиннер — на кнопке удаления (действие), не загрузка экрана
    expect(src.match(/<ActivityIndicator/g)?.length).toBe(1);
    expect(src).toContain('deletePackBusy ? <ActivityIndicator');
  });

  it('«Наборы» сообщества: каталог и опубликованные наборы читаются синхронно в начальном состоянии', () => {
    const src = read('app/flashcards_packs.tsx');
    expect(src).toContain('peekWarmMarketplacePacks()');
    expect(src).toContain('peekPublishedCommunityMarketPacks(studyTarget)');
    expect(src).toContain('useState<boolean>(() => (peekPublishedCommunityMarketPacks(studyTarget)?.length ?? 0) > 0)');
    expect(src).not.toContain('ActivityIndicator');
  });

  it('хаб Карточек: состояние каталога «готов» с первого кадра при тёплом кэше, счётчик «Из видео» — из peek', () => {
    const src = read('app/flashcards/FlashcardsHubScreen.tsx');
    expect(src).toContain("() => (catalog.length > 0 ? 'ready' : 'loading')");
    expect(src).toContain('useState<number | null>(() => countVideoPacks(peekVideoPhraseSetPacks()))');
    expect(src).not.toContain('ActivityIndicator');
  });

  it('коллекция («Сохранённые», набор): карточки из кэша процесса в начальном состоянии', () => {
    const src = read('app/flashcards/useCollectionData.ts');
    expect(src).toContain('useState<CardItem[]>(_savedCardsCache ?? [])');
    expect(src).toContain('useState<CardItem[]>(_customCardsCache ?? [])');
    expect(read('app/flashcards_collection.tsx')).not.toContain('ActivityIndicator');
  });

  it('Сообщество: раздел из ссылки/пути выбирается синхронно и монтируется в первом кадре; без спиннеров', () => {
    const src = read('app/(tabs)/community.tsx');
    expect(src).toContain('useState<Section>(() => sectionFromParam(sectionParam) ?? sectionFromPath(pathname) ?? \'friends\')');
    expect(src).toContain('useState<ReadonlySet<Section>>(() => new Set([section]))');
    expect(src).not.toContain('ActivityIndicator');
  });
});
