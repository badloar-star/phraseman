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

describe('ExplainSheet: рендер тела и слайд-ап в доме', () => {
  const src = read(path.join(COMPONENTS_DIR, 'ExplainSheet.tsx'));

  it('рендерит тело объяснения из resolveExplainDisplay (display.text)', () => {
    expect(src).toContain('resolveExplainDisplay');
    expect(src).toContain('{display.text}');
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
