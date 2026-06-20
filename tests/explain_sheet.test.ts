/**
 * Тесты фичи «Объясни как для 5-летнего» — UI-слой (план 04, Фаза 5).
 *
 * ВАЖНО про харнес: jest здесь node-окружение, react-native замокан стабом
 * (tests/__mocks__/react-native.js — только Platform/AsyncStorage, без View/Text/Modal),
 * @testing-library/react-native в проекте НЕТ, а testMatch берёт только *.test.ts.
 * Поэтому полноценный рендер RN-дерева невозможен. Тестируем двумя способами:
 *   1) Чистая логика хука (resolveExplainDisplay / loadingLineForLang) — реально
 *      исполняется (скелетон во время загрузки, мягкий fallback на ошибке, текст
 *      сервера как есть).
 *   2) Контракты компонентов, которые нельзя отрендерить — через интроспекцию
 *      исходника (тот же стиль, что в остальных tests/*.test.ts): флаг-гейтинг,
 *      вызов submitExplainReport (а НЕ submitErrorReport), отправка phraseEn без
 *      хэша, рендер текста, события аналитики, проводка в DailyPhraseCard.
 *
 * explain_phrase_client замокан, чтобы импорт хука не тянул @react-native-firebase
 * (он не замокан в jest и упал бы в node).
 */
import fs from 'fs';
import path from 'path';

jest.mock('../app/explain_phrase_client', () => ({
  callExplainPhrase: jest.fn(),
  callSubmitExplainReport: jest.fn(),
}));

import {
  resolveExplainDisplay,
  loadingLineForLang,
  splitExplainSegments,
  splitExplainParagraphs,
  type ExplainRequestState,
} from '../app/explain_phrase_request';

const COMPONENTS_DIR = path.join(__dirname, '..', 'components');
const APP_DIR = path.join(__dirname, '..', 'app');
const read = (p: string) => fs.readFileSync(p, 'utf8');

/**
 * Срезаем комментарии (// и /* *\/), чтобы негативные проверки контракта проверяли
 * РЕАЛЬНЫЙ КОД, а не документацию. Наши файлы намеренно поясняют инварианты в
 * комментариях («НЕ phraseRu», «не submitErrorReport», «phraseHash считает сервер»),
 * и эти строки не должны ронять assert'ы про отсутствие плохого вызова в коде.
 */
const stripComments = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const baseState: ExplainRequestState = {
  loading: false,
  text: '',
  status: 'ok',
  fromCache: false,
  error: false,
};

describe('useExplainRequest: resolveExplainDisplay (чистая логика тела шторки)', () => {
  it('во время генерации (cache MISS) показывает скелетон, без текста', () => {
    const out = resolveExplainDisplay({ ...baseState, loading: true }, 'ru', 'значение');
    expect(out.showSkeleton).toBe(true);
    expect(out.text).toBe('');
  });

  it('на статус ok рендерит серверный текст КАК ЕСТЬ (без правок/валидации)', () => {
    const serverText = 'Это как сказать «мне всё равно», только по-английски.';
    const out = resolveExplainDisplay({ ...baseState, status: 'ok', text: serverText }, 'ru', 'значение');
    expect(out.showSkeleton).toBe(false);
    expect(out.text).toBe(serverText);
  });

  it('на серверный fallback (rejected/exhausted/pending) тоже рендерит text как есть', () => {
    for (const status of ['rejected', 'exhausted', 'pending'] as const) {
      const fallback = `server-fallback-${status}`;
      const out = resolveExplainDisplay({ ...baseState, status, text: fallback }, 'ru', 'значение');
      expect(out.showSkeleton).toBe(false);
      expect(out.text).toBe(fallback);
    }
  });

  it('на сетевой ошибке показывает НЕЙТРАЛЬНЫЙ fallback, НЕ родной перевод и не сырой стек', () => {
    const out = resolveExplainDisplay({ ...baseState, status: 'error', error: true }, 'ru', 'быть в ударе');
    expect(out.showSkeleton).toBe(false);
    // КРИТИЧНО: перевод/смысл фразы НЕ должен попадать в текст (объяснялка грамматики, не словарь).
    expect(out.text).not.toContain('быть в ударе');
    expect(out.text).not.toMatch(/error|stack|undefined|null/i);
    expect(out.text.length).toBeGreaterThan(0);
  });

  it('на ошибке без перевода всё равно даёт осмысленный локализованный текст', () => {
    const out = resolveExplainDisplay({ ...baseState, status: 'error', error: true }, 'es', '');
    expect(out.showSkeleton).toBe(false);
    expect(out.text.length).toBeGreaterThan(0);
    expect(out.text).not.toMatch(/error|stack/i);
  });

  it('строка скелетона локализована и БЕЗ эмодзи (правило: никаких эмодзи)', () => {
    expect(loadingLineForLang('ru')).toContain('готов');
    expect(loadingLineForLang('ru')).not.toContain('👶');
    expect(loadingLineForLang('en' as string)).toBeTruthy();
    expect(loadingLineForLang('uk')).not.toContain('👶');
    expect(loadingLineForLang('es')).toBeTruthy();
  });

  it('degraded=false на настоящем объяснении (ok и live-rejected), true на фолбэках', () => {
    // ok — настоящий текст.
    expect(resolveExplainDisplay({ ...baseState, status: 'ok', text: 'т' }, 'ru').degraded).toBe(false);
    // live-rejected (fromCache=false) несёт НАСТОЯЩИЙ сгенерированный текст — не degraded.
    expect(
      resolveExplainDisplay({ ...baseState, status: 'rejected', fromCache: false, text: 'т' }, 'ru').degraded,
    ).toBe(false);
    // Фолбэк-пути: rejected из кэша / exhausted / pending / сетевая ошибка.
    expect(
      resolveExplainDisplay({ ...baseState, status: 'rejected', fromCache: true, text: 'fb' }, 'ru').degraded,
    ).toBe(true);
    expect(resolveExplainDisplay({ ...baseState, status: 'exhausted', text: 'fb' }, 'ru').degraded).toBe(true);
    expect(resolveExplainDisplay({ ...baseState, status: 'pending', text: 'fb' }, 'ru').degraded).toBe(true);
    expect(resolveExplainDisplay({ ...baseState, status: 'error', error: true }, 'ru').degraded).toBe(true);
  });
});

describe('splitExplainSegments — подсветка английского в объяснении', () => {
  it('латинские фрагменты помечаются en:true, проза — en:false', () => {
    const segs = splitExplainSegments('Слово "am" — это связка.');
    expect(segs).toEqual([
      { text: 'Слово "', en: false },
      { text: 'am', en: true },
      { text: '" — это связка.', en: false },
    ]);
  });

  it('фраза из нескольких английских слов подсвечивается ОДНИМ куском', () => {
    const segs = splitExplainSegments('Фраза "I am ready" короткая.');
    expect(segs.find((s) => s.en)?.text).toBe('I am ready');
  });

  it('апострофы и дефисы внутри английского не рвут сегмент', () => {
    expect(splitExplainSegments(`"I'm" — короткая форма.`).find((s) => s.en)?.text).toBe(`I'm`);
    expect(splitExplainSegments('Слово "well-known" сложное.').find((s) => s.en)?.text).toBe('well-known');
  });

  it('чисто русский текст — один сегмент en:false; пустой текст — пусто', () => {
    expect(splitExplainSegments('Просто русский текст.')).toEqual([
      { text: 'Просто русский текст.', en: false },
    ]);
    expect(splitExplainSegments('')).toEqual([]);
  });
});

describe('splitExplainParagraphs — красивые абзацы', () => {
  it('режет по пустой строке и чистит края', () => {
    expect(splitExplainParagraphs('Раз.\n\nДва.\n\n\nТри.')).toEqual(['Раз.', 'Два.', 'Три.']);
  });

  it('одиночный перевод строки НЕ создаёт новый абзац', () => {
    expect(splitExplainParagraphs('Раз.\nВсё ещё раз.')).toEqual(['Раз.\nВсё ещё раз.']);
  });

  it('пустой/пробельный текст — ноль абзацев', () => {
    expect(splitExplainParagraphs('  \n \n ')).toEqual([]);
  });
});

describe('ExplainButton: флаг-гейтинг и аналитика', () => {
  const src = read(path.join(COMPONENTS_DIR, 'ExplainButton.tsx'));

  it('рендерит null, когда isExplainEnabled() === false (фича скрыта)', () => {
    expect(src).toContain('isExplainEnabled');
    expect(src).toMatch(/if\s*\(\s*!enabled\s*\)\s*return null/);
  });

  it('проп называется phraseMeaning, НЕ phraseRu', () => {
    expect(src).toContain('phraseMeaning');
    // phraseRu не должно встречаться в КОДЕ (в комментариях допустимо как пояснение).
    expect(stripComments(src)).not.toContain('phraseRu');
  });

  it('эмитит explain_button_shown при показе и explain_sheet_opened по тапу', () => {
    expect(src).toContain("trackEvent('explain_button_shown'");
    expect(src).toContain("trackEvent('explain_sheet_opened'");
  });

  it('открывает ExplainSheet для {phraseEn, phraseMeaning, lang}', () => {
    expect(src).toContain('ExplainSheet');
    expect(src).toMatch(/phraseEn=\{phraseEn\}/);
    expect(src).toMatch(/phraseMeaning=\{phraseMeaning\}/);
  });
});

describe('Lesson explain footer contract', () => {
  const src = stripComments(read(path.join(APP_DIR, 'lesson1.tsx')));

  it('uses one limited footer explain flow instead of a post-answer unlimited button', () => {
    expect(src).toContain('const explainHintsLeft = Math.max(0, 3 + bonusHints - fiftyFiftyUsedToday)');
    expect(src).toContain('onPress={openExplainPreAnswer}');
    expect(src).not.toContain('explainModeRef');
    expect(src).not.toContain('openExplainResult');
    expect(src).not.toContain('lesson1-explain-result');
  });

  it('spends explain credit only for successful live generations', () => {
    expect(src).toContain('if (info.error || info.fromCache) return;');
    expect(src).toContain("if (info.status !== 'ok' && info.status !== 'rejected') return;");
    expect(src).toContain('onConsumeExplainCredit();');
  });
});

describe('ExplainSheet: рендер тела и слайд-ап в доме', () => {
  const src = read(path.join(COMPONENTS_DIR, 'ExplainSheet.tsx'));

  it('рендерит тело объяснения из resolveExplainDisplay (display.text → абзацы)', () => {
    expect(src).toContain('resolveExplainDisplay');
    expect(src).toContain('splitExplainParagraphs(display.text)');
  });

  it('показывает скелетон-лоадер с дружелюбной строкой во время генерации', () => {
    expect(src).toContain('display.showSkeleton');
    expect(src).toContain('loadingLineForLang');
  });

  it('заголовок «Простыми словами» БЕЗ эмодзи (правило: никаких эмодзи)', () => {
    expect(src).toContain('Простыми словами');
    expect(src).not.toContain('👶');
  });

  it('слайд-ап на legacy Animated + Modal + LinearGradient (дом-паттерн NoEnergyModal, НЕ reanimated)', () => {
    expect(src).toContain("from 'react-native'");
    expect(src).toContain('Animated');
    expect(src).toContain('translateY');
    expect(src).toContain("from './SafeLinearGradient'");
    expect(src).toContain('MOTION_SPRING_LEGACY');
    expect(src).not.toContain('react-native-reanimated');
  });

  it('содержит футер-репорт ExplainReportButton', () => {
    expect(src).toContain('ExplainReportButton');
  });

  it('рендерит объяснение абзацами с подсветкой английского (splitExplain*)', () => {
    expect(src).toContain('splitExplainParagraphs');
    expect(src).toContain('splitExplainSegments');
    // Английские сегменты красятся акцентом.
    expect(src).toContain('bodyEn');
  });

  it('на degraded-пути есть кнопка «Попробовать ещё раз» → state.retry()', () => {
    expect(src).toContain('display.degraded');
    expect(src).toContain('state.retry()');
    expect(src).toContain('Попробовать ещё раз');
  });
});

describe('ExplainReportButton: контракт репорта', () => {
  const src = read(path.join(COMPONENTS_DIR, 'ExplainReportButton.tsx'));

  it('вызывает callSubmitExplainReport, а НЕ submitErrorReport', () => {
    const code = stripComments(src);
    expect(code).toContain('callSubmitExplainReport');
    // submitErrorReport не должен вызываться в коде (упоминание в комментарии «почему
    // не reuse ReportErrorButton» допустимо).
    expect(code).not.toContain('submitErrorReport');
  });

  it('шлёт phraseEn и НЕ вычисляет phraseHash на клиенте', () => {
    const code = stripComments(src);
    expect(code).toContain('phraseEn');
    // Клиент НЕ хэширует — в коде не должно быть phraseHash/sha256/hashFor.
    expect(code).not.toMatch(/phraseHash|sha256|hashFor/i);
  });

  it('использует визуал icon-flag (Ionicons flag, цвет t.wrong) как у ReportErrorButton', () => {
    expect(src).toContain('Ionicons');
    expect(src).toContain("name={sent ? 'checkmark-circle' : 'flag'}");
    expect(src).toContain('t.wrong');
  });

  it('открывает ФОРМУ жалобы: меню причин (4 ключа = серверный белый список) + комментарий', () => {
    // Ключи причин — зеркало REPORT_REASONS в functions/src/explain/explain_reports.ts.
    expect(src).toContain("['unclear', 'incorrect', 'wrong_language', 'other']");
    expect(src).toContain('Что именно непонятно?');
    expect(src).toContain('TextInput');
    expect(src).toContain('maxLength={COMMENT_MAX_LEN}');
  });

  it('шлёт kind/phraseEn/lang/reason/comment (+ userAnswer для разбора ошибки)', () => {
    const code = stripComments(src);
    // Контракт после добавления kind='mistake': в вызове присутствуют ключевые поля.
    expect(code).toMatch(/callSubmitExplainReport\(\{[\s\S]*?kind,/);
    expect(code).toMatch(/callSubmitExplainReport\(\{[\s\S]*?phraseEn,/);
    expect(code).toMatch(/callSubmitExplainReport\(\{[\s\S]*?lang,/);
    expect(code).toMatch(/callSubmitExplainReport\(\{[\s\S]*?reason,/);
    expect(code).toMatch(/callSubmitExplainReport\(\{[\s\S]*?comment:/);
    // userAnswer прокидывается для mistake-режима.
    expect(code).toMatch(/userAnswer:\s*kind === 'mistake'/);
  });

  it('форма — вложенный Modal с KeyboardAvoidingView (клавиатура не перекрывает ввод)', () => {
    expect(src).toContain('KeyboardAvoidingView');
    expect(src).toContain('<Modal');
  });
});

describe('Кнопка называется «Объяснить просто» (переименование 2026-06-10)', () => {
  it('ExplainButton (фраза дня и другие поверхности)', () => {
    const src = read(path.join(COMPONENTS_DIR, 'ExplainButton.tsx'));
    expect(src).toContain('Объяснить просто');
    expect(src).not.toContain('Объясни проще');
  });

  it('lesson1 keeps explain in the footer and does not duplicate it on the result screen', () => {
    const src = stripComments(read(path.join(APP_DIR, 'lesson1.tsx')));
    expect(src).toContain('testID="lesson1-explain"');
    expect(src).not.toContain('lesson1-explain-result');
    expect(src).not.toContain('Объяснить просто');
  });
});

describe('analytics.ts: новые события зарегистрированы в union', () => {
  const src = read(path.join(APP_DIR, 'analytics.ts'));

  it("union содержит explain_button_shown / explain_sheet_opened / explain_sheet_closed", () => {
    expect(src).toContain("'explain_button_shown'");
    expect(src).toContain("'explain_sheet_opened'");
    expect(src).toContain("'explain_sheet_closed'");
  });
});

describe('DailyPhraseCard.tsx: кнопка вшита за флагом с верными пропами', () => {
  const src = read(path.join(COMPONENTS_DIR, 'DailyPhraseCard.tsx'));

  it('импортирует и рендерит ExplainButton', () => {
    expect(src).toContain("import ExplainButton from './ExplainButton'");
    expect(src).toContain('<ExplainButton');
  });

  it('передаёт phraseEn=phrase.english и phraseMeaning=phraseCopy.meaning || phrase.meaning', () => {
    expect(src).toMatch(/phraseEn=\{phrase\.english\}/);
    expect(src).toMatch(/phraseMeaning=\{phraseCopy\.meaning \|\| phrase\.meaning\}/);
    expect(src).toMatch(/lang=\{lang\}/);
  });
});
