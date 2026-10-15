// зачем (владелец 15.10: набор из видео добавил — «Мои наборы» пусты; координатор R06/R27–R30): добавленный набор другого языка виден СРАЗУ; фильтр языка не прячет всё молча.
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';
import { applyMyPacksLanguageView } from '../app/flashcards/my_packs_language_view';

const read = (rel: string): string => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));
const pack = (id: string, packLanguage?: string) => ({ id, packLanguage });

describe('«Мои наборы»: фильтр языка не прячет добавленное', () => {
  it('набор из видео на итальянском при выбранном английском виден сразу (фильтр снят автоматически)', () => {
    const view = applyMyPacksLanguageView({ added: [pack('video-it', 'it')], created: [], language: 'en', showAll: false });
    expect(view.added.map((p) => p.id)).toEqual(['video-it']);
    expect(view.auto).toBe(true);
    expect(view.hidden).toBe(0);
  });
  it('часть скрыта: остаются наборы выбранного языка, счётчик «Скрыто N» считает остальные', () => {
    const view = applyMyPacksLanguageView({ added: [pack('a-en', 'en'), pack('a-it', 'it'), pack('a-fr', 'fr')], created: [pack('c-it', 'it')], language: 'en', showAll: false });
    expect(view.added.map((p) => p.id)).toEqual(['a-en']);
    expect(view.created).toEqual([]);
    expect(view.hidden).toBe(3);
    expect(view.auto).toBe(false);
  });
  it('«Показать все» снимает фильтр; набор «без языка» виден всегда; набор без поля — английский', () => {
    const all = applyMyPacksLanguageView({ added: [pack('a-it', 'it'), pack('a-en', 'en')], created: [], language: 'fr', showAll: true });
    expect(all.added).toHaveLength(2);
    expect(all.hidden).toBe(0);
    const mixed = applyMyPacksLanguageView({ added: [pack('none', 'none'), pack('old'), pack('it', 'it')], created: [], language: 'en', showAll: false });
    expect(mixed.added.map((p) => p.id)).toEqual(['none', 'old']);
    expect(mixed.hidden).toBe(1);
  });
  it('пусто — остаётся пусто (нечего показывать)', () => {
    const view = applyMyPacksLanguageView({ added: [], created: [], language: 'en', showAll: false });
    expect(view).toMatchObject({ hidden: 0, auto: false, total: 0 });
  });
});

describe('экран «Мои наборы» — подключение', () => {
  const screen = read('app/flashcards_my_packs.tsx');
  it('загрузка отдаёт все наборы, язык фильтруется на клиенте; смена языка не перечитывает данные', () => {
    expect(screen).toContain('groups: groupPacks(visible, isMine),');
    expect(screen).toContain('}, [accountGeneration, cloudCommunityEnabled, studyTarget]);');
    expect(screen).toContain('applyMyPacksLanguageView({ added: groups.added');
  });
  it('язык по умолчанию — цель обучения, а не глобальный сохранённый (R30)', () => {
    expect(screen).toContain('const next = defaultPackLanguageForStudyTarget(studyTarget);');
    expect(screen).not.toContain('stored ?? defaultPackLanguageForStudyTarget(studyTarget)');
  });
  it('добавление набора: кэш «набора нет» сброшен, список перечитан, язык переключён на язык нового набора (R29, R06)', () => {
    // R44: подписка и сброс кэша — на уровне модуля (my_packs_missing_cache), а не внутри экрана
    const cacheModule = read('app/flashcards/my_packs_missing_cache.ts');
    expect(cacheModule).toContain("onAppEvent('community_pack_added'");
    expect(cacheModule).toContain('missingPackCache.clear();');
    expect(screen).toContain('subscribeAddedPack(');
    expect(screen).toContain('if (next !== \'none\' && next !== packLanguage) setPackLanguage(next);');
  });
  it('строка «Скрыто N: другой язык · Показать все» и журналы [MY-PACKS] / [PACK-ADD] language', () => {
    const v2 = read('app/flashcards/MyPacksV2.tsx');
    expect(v2).toContain('fc-my-packs-hidden-language');
    expect(v2).toContain('Показать все');
    expect(screen).toContain('[MY-PACKS] language selected=');
    expect(read('app/community_packs/communityPackActions.ts')).toContain('[PACK-ADD] language pack=');
  });
});
