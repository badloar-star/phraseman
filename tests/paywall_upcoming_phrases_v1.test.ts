// Пейвол М, блок «что скажешь через 30 дней» (координатор 25.10): 3–4 пары { en, translation } из ближайших непройденных уроков
// курса — начиная со следующего урока, только выпущенные уроки, только локальный контент (вступления из бандла), синхронно.
// Нечего показать — пустой массив. Журнал [PAYWALL-M-PHRASES] пишет источник, число и причину пустого ответа.
import {
  __resetUpcomingPhrasesCacheForTests,
  learningV2UpcomingCoursePhrasesV1 as upcoming,
} from '../modules/learning-v2/content/paywall_upcoming_phrases_v1';

let logs: string[] = [];
beforeEach(() => {
  __resetUpcomingPhrasesCacheForTests();
  logs = [];
  jest.spyOn(console, 'log').mockImplementation((...a: unknown[]) => { logs.push(a.map(String).join(' ')); });
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

const isPair = (p: { en: string; translation: string }) => /^[A-Z][A-Za-z ,'’.!-]+$/.test(p.en) && /[А-Яа-яЁёІіЇїЄєҐґ]/.test(p.translation);

describe('фразы курса для пейвола М', () => {
  it('новичок: 4 пары из уроков 2, 3, 4, 5 — по порядку, на русском', () => {
    const out = upcoming({ currentSessionId: null, completedCount: 0, interfaceLocale: 'ru' });
    expect(out.map((p) => p.lessonOrdinal)).toEqual([2, 3, 4, 5]);
    expect(out.every(isPair)).toBe(true);
    expect(logs.some((l) => l.includes('[PAYWALL-M-PHRASES] source') && l.includes('next_lessons'))).toBe(true);
  });

  it('середина курса: начиная со следующего урока, перевод на языке интерфейса (uk)', () => {
    const out = upcoming({ currentSessionId: 'lesson-07:session:23', completedCount: 359, interfaceLocale: 'uk' });
    expect(out.map((p) => p.lessonOrdinal)).toEqual([8, 9, 10, 11]);
    expect(out.every(isPair)).toBe(true);
    const ru = upcoming({ currentSessionId: 'lesson-07:session:23', completedCount: 359, interfaceLocale: 'ru' });
    expect(ru.map((p) => p.en)).toEqual(out.map((p) => p.en));
    expect(ru.map((p) => p.translation)).not.toEqual(out.map((p) => p.translation));
  });

  it('просьба о 3 фразах — 3; повторы английской фразы не попадают', () => {
    const out = upcoming({ currentSessionId: 'lesson-03:session:05', completedCount: 117, interfaceLocale: 'ru', count: 3 });
    expect(out).toHaveLength(3);
    expect(new Set(out.map((p) => p.en.toLowerCase())).size).toBe(3);
  });

  it('последний выпущенный урок: следующих уроков нет — из оставшихся занятий текущего урока', () => {
    // зачем (Ревизор 26.10, NIGHT_BACKLOG §5): урок 29 был последним в манифесте, когда писали проверку; 26.10 выпущен урок 30 — «последний» считаем по манифесту, а не числом
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rows = (require('../modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated') as { FACTORY_NATIVE_MANIFEST_V1: readonly { lessonOrdinal: number; sessionOrdinal: number }[] }).FACTORY_NATIVE_MANIFEST_V1;
    const lastLesson = Math.max(...rows.map((r) => r.lessonOrdinal));
    const out = upcoming({ currentSessionId: `lesson-${String(lastLesson).padStart(2, '0')}:session:05`, completedCount: 1572, interfaceLocale: 'ru' });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((p) => p.lessonOrdinal === lastLesson && p.sessionOrdinal > 5)).toBe(true);
    expect(logs.some((l) => l.includes('current_lesson_rest'))).toBe(true);
  });

  it('курс пройден — пусто с причиной', () => {
    expect(upcoming({ currentSessionId: null, completedCount: 1596, interfaceLocale: 'ru' })).toEqual([]);
    expect(logs.some((l) => l.includes('[PAYWALL-M-PHRASES] empty') && l.includes('course_completed'))).toBe(true);
  });

  it('язык интерфейса без перевода курса (es) — пусто, русский перевод не подставляется', () => {
    expect(upcoming({ currentSessionId: 'lesson-01:session:03', completedCount: 2, interfaceLocale: 'es' })).toEqual([]);
    expect(logs.some((l) => l.includes('no_translation_for_locale') && l.includes('"es"'))).toBe(true);
  });

  it('ничего, кроме бандла: в модуле нет сети и Firestore', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'modules/learning-v2/content/paywall_upcoming_phrases_v1.ts'), 'utf8') as string;
    // проверяем то, что модуль подключает и вызывает, а не слова в комментариях
    const imports = src.match(/(?:from|require\()\s*['"][^'"]+['"]/g) ?? [];
    expect(imports.filter((i) => /firebase|async-storage|cloud_sync/i.test(i))).toEqual([]);
    expect(src).not.toMatch(/\bfetch\(|getDoc|onSnapshot|AsyncStorage\./);
  });
});
