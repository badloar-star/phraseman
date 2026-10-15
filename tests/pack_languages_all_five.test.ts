// зачем (владелец 15.10: «ТАКОГО НИГДЕ НЕ ДОЛЖНО БЫТЬ, ВСЕ ЯЗЫКИ ДОЛЖНЫ БЫТЬ И ДОЛЖНЫ БЫТЬ ДОСТУПНЫ — наборы с видео есть на всех языках»; расследование [PACK-LANG]):
// в каждом выборе языка наборов — все пять (en, fr, de, es, it); фильтр не пропускает чужой язык; журнал показывает, откуда у набора язык.
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';
import { filterPacksByLanguage } from '../app/community_packs/communityCatalogFilter';
import { PACK_LANGUAGES, packMatchesLanguageFilter } from '../app/flashcards/pack_languages';
import { formatPackLangTrace, packLangRow } from '../app/flashcards/pack_lang_trace';

const read = (rel: string): string => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));
const pack = (id: string, extra: Record<string, unknown> = {}) => ({ id, ...extra }) as never;

describe('выбор языка наборов — всегда все пять', () => {
  it('PACK_LANGUAGES = en, fr, de, es, it', () => {
    expect(PACK_LANGUAGES).toEqual(['en', 'fr', 'de', 'es', 'it']);
  });
  it('пикеры без своего списка берут все пять; каталог — тоже', () => {
    expect(read('app/flashcards/PackLanguagePicker.tsx')).toContain('languages ?? (allowNone ? PACK_LANGUAGE_CHOICES : PACK_LANGUAGES)');
    for (const file of ['app/flashcards/CollectionHeader.tsx', 'app/flashcards/CollectionHeaderV2.tsx', 'app/flashcards/MyPacksV2.tsx', 'app/flashcards_video_packs.tsx']) {
      const src = read(file);
      expect(src).toMatch(/<PackLanguagePicker[^>]*value=/);
      expect(src).not.toMatch(/<PackLanguagePicker[^>]*languages=/);
    }
    expect(read('app/flashcards_packs.tsx')).toContain('const catalogLanguages = PACK_LANGUAGES;');
  });
});

describe('фильтр языка наборов', () => {
  const packs = [
    pack('en1', { packLanguage: 'en' }), pack('fr1', { packLanguage: 'fr' }), pack('it1', { packLanguage: 'it', videoId: 'v1' }),
    pack('de1', { studyTarget: 'de' }), pack('none1', { packLanguage: 'none' }), pack('legacy'),
  ];
  it('при выбранном FR итальянский и немецкий наборы не проходят', () => {
    const ids = filterPacksByLanguage(packs, 'fr').map((p) => p.id);
    expect(ids).toContain('fr1');
    expect(ids).not.toContain('it1');
    expect(ids).not.toContain('de1');
    expect(ids).not.toContain('en1');
  });
  it('набор «без языка» виден при любом языке (D127), старый набор без поля — английский', () => {
    expect(packMatchesLanguageFilter('none', 'fr')).toBe(true);
    expect(filterPacksByLanguage(packs, 'en').map((p) => p.id)).toEqual(expect.arrayContaining(['en1', 'legacy', 'none1']));
  });
});

describe('журнал [PACK-LANG]', () => {
  it('показывает выбранный язык, сырые поля набора, источник и что убрано', () => {
    const lines = formatPackLangTrace('каталог', 'fr', [pack('fr1', { packLanguage: 'fr' }), pack('it1', { packLanguage: 'it', videoId: 'v' }), pack('old')]);
    expect(lines[0]).toContain('[PACK-LANG] каталог selected=fr total=3 kept=1 filtered=2');
    expect(lines.join('\n')).toContain('DROPPED id=it1');
    expect(lines.join('\n')).toContain('kind=video packLanguage=it studyTarget=undefined source=packLanguage language=it');
    expect(packLangRow(pack('old'), 'fr').source).toBe('default_en');
    expect(packLangRow(pack('t', { studyTarget: 'de' }), 'de').source).toBe('studyTarget');
  });
  it('каталог пишет журнал, а пустой язык — честная фраза без технических слов', () => {
    const hub = read('app/flashcards/FlashcardsCategoryHub.tsx');
    expect(hub).toContain("formatPackLangTrace('catalog', packLanguage, catalogCommunityPacks)");
    expect(hub).toContain('На этом языке пока нет наборов');
  });
});
