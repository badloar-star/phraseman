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
 *      хэша, рендер текста, события аналитики, продовая проводка в lesson1.tsx.
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
  canReuseExplainRequestState,
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
  it('keeps callable failures in background loading instead of exposing an error', () => {
    const src = read(path.join(APP_DIR, 'explain_phrase_request.ts'));
    const catchStart = src.search(/}\s*catch(?:\s*\([^)]*\))?\s*{/);
    const catchEnd = src.indexOf('// req раскладываем', catchStart);
    const catchBlock = src.slice(catchStart, catchEnd);

    expect(catchStart).toBeGreaterThan(-1);
    expect(catchEnd).toBeGreaterThan(catchStart);
    expect(catchBlock).toContain('scheduleExplainRetry');
    expect(catchBlock).toContain('...INITIAL_STATE');
    expect(catchBlock).not.toContain("status: 'error'");
    expect(catchBlock).not.toContain('error: true');
    expect(catchBlock).not.toContain("status: 'ok'");
    expect(catchBlock).not.toContain('aiErrorToast');
  });

  it('reuses only successful resolved explanations for instant reopen', () => {
    expect(canReuseExplainRequestState({
      ...baseState,
      status: 'ok',
      text: 'ready explanation',
    })).toBe(true);

    expect(canReuseExplainRequestState({
      ...baseState,
      status: 'pending',
      text: 'fallback',
    })).toBe(false);

    expect(canReuseExplainRequestState({
      ...baseState,
      status: 'ok',
      text: '',
    })).toBe(false);

    expect(canReuseExplainRequestState({
      ...baseState,
      status: 'error',
      error: true,
    })).toBe(false);
  });

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

  it('keeps rejected/exhausted/pending hidden behind the loading skeleton', () => {
    for (const status of ['rejected', 'exhausted', 'pending'] as const) {
      const fallback = `server-fallback-${status}`;
      const out = resolveExplainDisplay({ ...baseState, status, text: fallback }, 'ru', 'значение');
      expect(out.showSkeleton).toBe(true);
      expect(out.text).toBe('');
    }
  });

  it('never renders a network error or fallback as explanation content', () => {
    const out = resolveExplainDisplay({ ...baseState, status: 'error', error: true }, 'ru', 'быть в ударе');
    expect(out.showSkeleton).toBe(true);
    // КРИТИЧНО: перевод/смысл фразы НЕ должен попадать в текст (объяснялка грамматики, не словарь).
    expect(out.text).not.toContain('быть в ударе');
    expect(out.text).not.toMatch(/error|stack|undefined|null/i);
    expect(out.text).toBe('');
  });

  it('keeps a language-independent network failure hidden', () => {
    const out = resolveExplainDisplay({ ...baseState, status: 'error', error: true }, 'es', '');
    expect(out.showSkeleton).toBe(true);
    expect(out.text).toBe('');
    expect(out.text).not.toMatch(/error|stack/i);
  });

  it('строка скелетона локализована и БЕЗ эмодзи (правило: никаких эмодзи)', () => {
    expect(loadingLineForLang('ru')).toContain('готов');
    expect(loadingLineForLang('ru')).not.toContain('👶');
    expect(loadingLineForLang('en' as string)).toBeTruthy();
    expect(loadingLineForLang('uk')).not.toContain('👶');
    expect(loadingLineForLang('es')).toBeTruthy();
  });

  it('never marks hidden waiting states as degraded visible content', () => {
    // ok — настоящий текст.
    expect(resolveExplainDisplay({ ...baseState, status: 'ok', text: 'т' }, 'ru').degraded).toBe(false);
    expect(
      resolveExplainDisplay({ ...baseState, status: 'rejected', fromCache: false, text: 'т' }, 'ru').degraded,
    ).toBe(false);
    // Фолбэк-пути: rejected / exhausted / pending / сетевая ошибка.
    expect(
      resolveExplainDisplay({ ...baseState, status: 'rejected', fromCache: true, text: 'fb' }, 'ru').degraded,
    ).toBe(false);
    expect(resolveExplainDisplay({ ...baseState, status: 'exhausted', text: 'fb' }, 'ru').degraded).toBe(false);
    expect(resolveExplainDisplay({ ...baseState, status: 'pending', text: 'fb' }, 'ru').degraded).toBe(false);
    expect(resolveExplainDisplay({ ...baseState, status: 'error', error: true }, 'ru').degraded).toBe(false);
  });

  it('D158: after the auto-retries give up — calm «later» + manual refresh, never server/fallback text', () => {
    const out = resolveExplainDisplay({ ...baseState, status: 'pending', text: 'fb', gaveUp: true }, 'ru', 'быть в ударе');
    expect(out).toEqual({ showSkeleton: false, text: '', degraded: true });
    const hook = read(path.join(APP_DIR, 'explain_phrase_request.ts'));
    expect(hook).toContain('attempt > AI_EXPLAIN_AUTO_RETRIES');
    expect(hook).toContain('const delayMs = AI_EXPLAIN_RETRY_PAUSE_MS;');
    expect(hook).not.toContain('60_000');
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

describe('Lesson explain footer contract', () => {
  const src = stripComments(read(path.join(APP_DIR, 'lesson1.tsx')));

  // зачем (владелец 11.11: «убери кнопку объяснить проще и функцию… они не нужны… обе удалить», плюс лампочку «Объяснить»): плитки «Объяснить» в футере урока больше нет, шторка из урока не открывается.
  it('has no footer explain tile on the result screen', () => {
    expect(src).not.toContain('testID="lesson1-explain"');
    expect(src).not.toContain('explainFeatureOn');
    expect(src).not.toContain('setExplainOpen');
    expect(src).not.toContain('onExplainResolved');
    expect(src).not.toContain('lesson1-explain-result');
  });

  it('keeps the daily credit spend for the 50/50 hint', () => {
    expect(src).toContain('onConsumeExplainCredit();');
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

describe('analytics.ts: новые события зарегистрированы в union', () => {
  const src = read(path.join(APP_DIR, 'analytics.ts'));

  it("union содержит explain_button_shown / explain_sheet_opened / explain_sheet_closed", () => {
    expect(src).toContain("'explain_button_shown'");
    expect(src).toContain("'explain_sheet_opened'");
    expect(src).toContain("'explain_sheet_closed'");
  });
});

describe('ExplainSheet: проводки в уроке нет (app/lesson1.tsx)', () => {
  // зачем (владелец 11.11: «убери кнопку объяснить проще и функцию… они не нужны… обе удалить», плюс лампочку «Объяснить»): урок шторку не импортирует и не рендерит.
  const src = read(path.join(__dirname, '..', 'app', 'lesson1.tsx'));

  it('не импортирует и не рендерит ExplainSheet', () => {
    expect(src).not.toContain("import ExplainSheet from '../components/ExplainSheet'");
    expect(src).not.toContain('<ExplainSheet');
  });
});
