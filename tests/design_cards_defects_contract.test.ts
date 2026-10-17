// зачем (координатор 12.10, дефекты кода по снимкам Макетов): три расхождения Карточек с одобренными образцами не должны вернуться —
// cards-005 («Сохранённые», а не «Карточки»), cards-011 (у своего набора уровень и слова-чипы), cards-v2-001 (транскрипция верхней карточки хаба).
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';

const read = (rel: string) => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));

describe('Cards defects from the mockup parity registry', () => {
  it('cards-005: the saved list is titled «Сохранённые» in all nine languages, not the section name', () => {
    const src = read('app/flashcards_collection.tsx');
    const at = src.indexOf('const savedScreenTitle = triLang(lang, {');
    expect(at).toBeGreaterThan(-1);
    const block = src.slice(at, at + 400);
    for (const word of ['Сохранённые', 'Збережені', "en: 'Saved'", 'Guardadas', 'Salvos', 'Đã lưu', 'Tersimpan', 'Kayıtlı', 'Zapisane']) expect(block).toContain(word);
    expect(src).toMatch(/<CollectionTitleBlock\s+lang=\{lang\}\s+title=\{savedScreenTitle\}/);
    expect(src).toMatch(/expandedOverline = savedSurface \? savedScreenTitle/);
  });

  it('cards-011: a local author pack carries its level and first words to the deck row', () => {
    const src = read('app/community_packs/localAuthorPacks.ts');
    const at = src.indexOf('export function localAuthorPackToMarketPack(');
    const fn = src.slice(at, src.indexOf('\n}\n', at));
    expect(fn).toMatch(/normalizePackLevel\(pack\.level\)/);
    expect(fn).toMatch(/previewWords: packPreviewWords\(pack\.cards, pack\.packLanguage\)/);
    expect(src).toMatch(/import \{ normalizePackLevel, packPreviewWords, type PackLevel \} from '\.\.\/flashcards\/pack_deck_meta'/);
  });

  it('cards-v2-001: the hub stack shows the stored transcription, falls back to the dictionary, never invents', () => {
    const src = read('app/flashcards/FlashcardsHubScreen.tsx');
    expect(src).toMatch(/import \{ getTranscription \} from '\.\.\/transcription'/);
    expect(src).toMatch(/const topStoredIpa = topCard\?\.transcription\?\.trim\(\) \?\? ''/);
    // зачем (аудит скорости R1, 12.10): словарь читается по слову верхней карточки (useMemo), а не на каждый рендер — смысл прежний: сохранённая, иначе словарь, иначе пусто
    expect(src).toMatch(/topCardEn && !topStoredIpa \? getTranscription\(topCardEn\) : ''/);
    expect(src).toMatch(/topIpa=\{trainingLocked \? limitOutSub : \(topCard \? topIpaText : /);
    expect(src).toContain('ipaFrom'); // журнал [HUB-TOPCARD] называет источник транскрипции
  });
});
