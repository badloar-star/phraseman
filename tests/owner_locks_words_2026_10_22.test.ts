// ЗАМКИ ВЛАДЕЛЬЦА 22.10 по экрану «Слова» (макет words-lesson-course.html, таблица words-inventory.md; кнопки владельца: «переносить как в макете», «озвучка — на языке изучаемого слова», «транскрипции НЕТ»;
// реестр docs/work/OWNER_LOCKS.md). Каждый тест падает, если правку откатят; ослабить — только по новому слову владельца.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const code = (src: string): string => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '');

describe('Замки владельца 22.10: экран «Слова»', () => {
  const screen = code(read('app/learning_v2_lesson_words.tsx'));
  const list = code(read('components/learning-v2/words/LearningV2WordsList.tsx'));
  const model = code(read('components/learning-v2/words/words_list_model.ts'));
  const pill = code(read('components/v2/V2PillSwitch.tsx'));

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «переносить как в макете» — переключатель «Этот урок / Весь курс» — таблетка Диалогов v4 (48, ячейки 40)
  it('переключатель — таблетка: V2PillSwitch 48 / 40, выбранная ячейка — цвет текста темы', () => {
    expect(screen).toContain('<V2PillSwitch');
    expect(pill).toMatch(/track: \{ height: 48, borderRadius: 24, padding: 4,/);
    expect(pill).toMatch(/cell: \{ height: 40, borderRadius: 20,/);
    expect(pill).toContain("backgroundColor: on ? g.text : 'transparent'");
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «число слов у заголовка» (24 у урока, 81 у курса)
  it('число слов стоит справа у заголовка', () => {
    expect(screen).toContain('testID="learning-v2-words-count"');
    expect(screen).toContain('{listWords.length}');
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «кружок-динамик вместо серых точек» (три точки статуса были всегда одинаковыми)
  it('слева кружок-динамик 40; серых точек статуса и галочки «выучено» нет', () => {
    expect(list).toContain('testID="learning-v2-word-speaker"');
    expect(list).toMatch(/speaker: \{ width: 40, height: 40, borderRadius: 20,/);
    expect(list).toContain("name={speaking ? 'volume-high' : 'volume-medium'}");
    expect(list).not.toMatch(/ellipsis-horizontal-circle|checkmark-circle|WordList/);
    expect(screen).not.toMatch(/WordList|NO_COUNTS|learnedCounts/);
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «озвучка — на ЯЗЫКЕ изучаемого слова (сейчас жёстко en-US)»
  it('озвучка на языке слова, системным голосом; не зашито en-US', () => {
    expect(list).toMatch(/language: ttsLocaleForStudyTarget\(word\.targetLanguage as StudyTargetLang\)/);
    expect(list).toContain('systemTtsOnly: true');
    expect(list).not.toMatch(/en-US/);
    expect(list).toContain('const request = guardRef.current.begin(key);');
    expect(list).toContain('SPEAK_HIGHLIGHT_MS = 2_500');
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «транскрипции НЕТ»
  it('транскрипции нет нигде в строке слова', () => {
    expect(list + model).not.toMatch(/transcription/i);
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «закладка передаёт все 9 переводов» (pt-BR, vi, id, tr, pl раньше терялись)
  it('закладка «в карточки» получает все девять переводов', () => {
    expect(list).toContain('ru={meaning.ru}');
    expect(list).toContain('uk={meaning.uk}');
    expect(list).toContain('es={meaning.es}');
    expect(list).toContain("sourceLocales={{ 'pt-BR': meaning['pt-BR'], vi: meaning.vi, id: meaning.id, tr: meaning.tr, pl: meaning.pl }}");
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «ключ строки (урок, id слова)»
  it('ключ строки — (урок, id слова), а не английский текст', () => {
    expect(model).toContain('return `${item.lessonOrdinal}:${item.lexicalItemId}`;');
    expect(list).toContain('keyExtractor={(row) => row.key}');
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «во «Весь курс» поиск (от 12 слов) и разделы «Урок N + число» из прежнего словаря»
  it('поиск — только во «Весь курс» и от 12 слов; разделы «Урок N» с числом', () => {
    expect(model).toContain('export const WORDS_SEARCH_MIN = 12;');
    expect(list).toContain("mode === 'course' && words.length >= WORDS_SEARCH_MIN");
    expect(list).toContain('testID="learning-v2-words-search"');
    expect(model).toContain("rows.push({ kind: 'section', key: `section-${ordinal}`, lessonOrdinal: ordinal, count: bucket.length });");
  });

  it('список виртуализирован; сети и спиннера нет; запрос поиска сбрасывается при смене вкладки', () => {
    expect(list).toContain('<FlatList');
    expect(list + screen).not.toMatch(/firebase|firestore|fetch\(|ActivityIndicator|adjustsFontSizeToFit/i);
    expect(list).toContain("useEffect(() => { setQuery(''); }, [mode]);");
  });
});
