import fs from 'node:fs';
import path from 'node:path';

// зачем (правило владельца 01.10 и 18.10, координатор 08:00: «полноэкранных экранов-ошибок НИГДЕ быть не должно»; опись Ревизора fullscreen-error-states-2026-10-18.md, раздел «Карточки / Наборы»):
// сторож источника — в перечисленных файлах нет экранов «Сейчас недоступно / Не удалось загрузить / Нет сети / не найдено» и перечёркнутого облака; каждое место пишет [NO-ERROR-SCREEN].
// Сработал — не возвращать экран ошибки, а привести место к правилу (кэш или спокойное пустое состояние, тихий повтор; нет объекта — тихо назад).
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

// комментарии «зачем» называют прежние тексты — их не считаем: проверяем только код и строки
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');

const FORBIDDEN = ['Сейчас недоступно', 'Не удалось загрузить', 'Не удалось открыть', 'Нет сети', 'Режим недоступен', 'cloud-offline-outline', 'Not available right now'];

describe('Карточки / Наборы: экранов-ошибок нет', () => {
  const files = [
    'app/flashcards/SavedCollectionStates.tsx',
    'app/flashcards/PackOpenFailedView.tsx',
    'app/flashcards/TrainingSetupV2.tsx',
    'app/flashcards/MyPacksV2.tsx',
    'app/flashcards/FlashcardsCategoryHub.tsx',
    'app/flashcards_video_packs.tsx',
    'app/community_packs/PackCommentsSheet.tsx',
  ];
  for (const file of files) {
    it(`${file}: нет слов об ошибке и «облака с чертой»`, () => {
      const src = stripComments(read(file));
      for (const word of FORBIDDEN) expect(src).not.toContain(word);
    });
  }

  it('«объекта нет» → тихо назад: карточка не найдена, набор не открылся, создание/правка набора, режим тренировки не задан', () => {
    for (const [file, screen] of [
      ['app/flashcards_card_editor.tsx', 'card_editor'],
      ['app/pack_opening.tsx', 'pack_opening'],
      ['app/community_pack_create.tsx', 'community_pack_create'],
      ['app/flashcards/TrainingSetupV2.tsx', 'training_setup'],
    ] as const) {
      const src = read(file);
      expect(src).toContain(`<QuietLeave screen="${screen}"`);
    }
    expect(read('app/flashcards_card_editor.tsx')).not.toContain('fc-editor-not-found');
    expect(read('app/community_pack_create.tsx')).not.toContain('ugc-pack-load-error');
    expect(stripComments(read('app/community_pack_create.tsx'))).not.toContain('Создание наборов пока недоступно');
  });

  it('«нет сети / сервер молчит» → спокойное пустое состояние и тихий повтор, причина в журнале', () => {
    expect(read('app/flashcards_my_packs.tsx')).toContain("logNoErrorScreen('flashcards_my_packs'");
    expect(read('app/flashcards_my_packs.tsx')).not.toContain("'unavailable'");
    expect(read('app/flashcards/FlashcardsCategoryHub.tsx')).toContain("logNoErrorScreen('flashcards_category_hub'");
    expect(read('app/flashcards_video_packs.tsx')).toContain("logNoErrorScreen('flashcards_video_packs'");
    expect(read('app/community_packs/PackCommentsSheet.tsx')).toContain("logNoErrorScreen('pack_comments'");
    expect(read('app/flashcards/SavedCollectionStates.tsx')).toContain("logNoErrorScreen('flashcards_saved'");
    expect(read('app/flashcards/TrainingSetupV2.tsx')).toContain('screen="training_setup" reason="setup_decks_exhausted"');
    expect(read('app/flashcards/PackOpenFailedView.tsx')).toContain('screen="pack_open_failed"');
  });

  it('общие части: журнал [NO-ERROR-SCREEN], пустое состояние без облака и кнопки, тексты на 9 языках', () => {
    expect(read('app/no_error_screen_log.ts')).toContain("console.log('[NO-ERROR-SCREEN]'");
    const quiet = read('components/cards-grid/QuietEmptyState.tsx');
    expect(quiet).toContain('icon="albums-outline"');
    expect(quiet).toContain('hideAction');
    expect(quiet).not.toContain('cloud-offline-outline');
    const copy = read('components/cards-grid/quiet_empty_copy.ts');
    for (const lang of ['ru', 'uk', 'en', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl']) {
      expect(copy.split(`${lang}:`).length - 1).toBeGreaterThanOrEqual(2);
    }
  });
});
