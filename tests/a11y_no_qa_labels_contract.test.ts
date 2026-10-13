// зачем (Макеты a11y, 13.10): экранный диктор читал вслух служебные id автотеста (qa-fc-editor-en и т. п.). Теперь в этих файлах accessibilityLabel/label без префикса qa-;
// у полей и значков без текста — человеческая подпись на 9 языках, у кнопок с видимым текстом метки нет вовсе, робот ищет по testID (он остался).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const FILES = [
  'app/community_packs/CommunityPackSocialBar.tsx', 'app/flashcards/CollectionHeader.tsx', 'app/flashcards/CollectionListView.tsx', 'app/flashcards/DeckPickerSheet.tsx',
  'app/flashcards/FlashcardListItem.tsx', 'app/flashcards_card_editor.tsx', 'app/flashcards_packs.tsx',
];

describe('доступность: нет служебных qa- меток', () => {
  it('ни accessibilityLabel, ни label не равны строке qa-…', () => {
    for (const rel of FILES) {
      const src = read(rel);
      expect(src).not.toMatch(/accessibilityLabel="qa-/);
      expect(src).not.toMatch(/\blabel="qa-/);
    }
  });

  it('testID этих элементов на месте — по ним ищет робот Сверки', () => {
    const header = read('app/flashcards/CollectionHeader.tsx');
    for (const id of ['fc-pack-author', 'fc-pack-publish', 'fc-pack-edit', 'fc-search-input']) expect(header).toContain(`testID="${id}"`);
    const editor = read('app/flashcards_card_editor.tsx');
    for (const id of ['fc-editor-en', 'fc-editor-tts', 'fc-editor-duplicate', 'fc-editor-tr', 'fc-editor-suggest', 'fc-editor-description']) expect(editor).toContain(`testID="${id}"`);
    expect(read('app/flashcards/DeckPickerSheet.tsx')).toContain('testID="fc-deck-start"');
    expect(read('app/flashcards/FlashcardListItem.tsx')).toContain('testID="fc-details-edit"');
    expect(read('app/flashcards_packs.tsx')).toContain('testID="flashcards-header-back"');
    expect(read('app/community_packs/CommunityPackSocialBar.tsx')).toContain('testID={`pack-comments-${pack.id}`}');
  });

  it('у полей редактора метка — видимая подпись поля, у значка озвучки и очистки поиска — слово на 9 языках', () => {
    const editor = read('app/flashcards_card_editor.tsx');
    expect(editor).toContain('accessibilityLabel={fieldCopy.word}');
    expect(editor).toContain('accessibilityLabel={fieldCopy.translation}');
    expect(editor).toContain('accessibilityLabel={fieldCopy.example}');
    expect(editor).toContain("ru: 'Озвучить', uk: 'Озвучити', en: 'Listen'");
    expect(read('app/flashcards/CollectionHeader.tsx')).toContain("ru: 'Очистить поиск', uk: 'Очистити пошук', en: 'Clear search'");
  });
});
