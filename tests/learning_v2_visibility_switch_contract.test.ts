// Решение владельца 04.11 (заморозка): Learning V2 скрыт по умолчанию и открывается только проверкой прогресса
// (завершено хотя бы одно занятие V2, app/learning_v2_progress_gate.ts); старые ссылки ведут в классический Курс, а DEV/локаль не открывают V2.
import fs from 'node:fs';
import path from 'node:path';

let mockHidden = false;
jest.mock('../app/learning_v2_visibility_switch', () => {
  const actual = jest.requireActual('../app/learning_v2_visibility_switch');
  return { ...actual, isLearningV2Hidden: () => mockHidden };
});

import { redirectSystemPath } from '../app/+native-intent';

const ROOT = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const redirect = (p: string) => redirectSystemPath({ path: p, initial: true });

afterEach(() => {
  mockHidden = false;
});

describe('заморозка Learning V2 решением владельца (04.11)', () => {
  it('в исходнике V2 по умолчанию скрыт, значение — живая привязка, открывает только проверка прогресса', () => {
    const source = read('app/learning_v2_visibility_switch.ts');
    expect(source).toContain('export let LEARNING_V2_HIDDEN: boolean = true;');
    expect(source).toContain('export function setLearningV2Unlocked(unlocked: boolean, from: string): boolean {');
    expect(read('app/learning_v2_progress_gate.ts')).toContain('setLearningV2Unlocked(unlocked, from);');
  });

  it('внешние ссылки в V2 при «скрыт» ведут в классический Курс и пишут [V2-HIDDEN]', () => {
    mockHidden = true;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    for (const link of ['/learning-v2/session/es-s1', '/learning-v2/course', '/learning_v2_direct_session_player_v1', 'learning-v2/course?x=1']) {
      expect(redirect(link)).toBe('/lessons_list');
    }
    expect(warn.mock.calls.some(([line]) => String(line).includes('[V2-HIDDEN] entry=deep_link redirect=/lessons_list'))).toBe(true);
    warn.mockRestore();
    log.mockRestore();
  });

  it('при «открыт» внешние ссылки в V2 в дев-сборке не переписываются', () => {
    mockHidden = false;
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    expect(redirect('/learning-v2/course')).not.toBe('/home');
    log.mockRestore();
  });

  it('вкладка «Обучение»: кнопка V2, чип «Новые уроки», вкладка из памяти и initialPage="v2" — под одной константой с рубильником', () => {
    const lessons = read('app/(tabs)/lessons.tsx');
    expect(lessons).toMatch(/^const learningV2CourseCanBeOpenedManually = \(\): boolean => !LEARNING_V2_HIDDEN && \(LEARNING_V2_HAS_RELEASED_SESSIONS_V1 \|\| ENABLE_DEV_TOOLS\);$/m);
    // кнопка «V2» и чип «Новые уроки» рендерятся только под константой (чип — ещё и только в push-маршруте старого списка, владелец 17.10)
    // зачем (R92, 17.10): внутри вкладки константа дополнена языком интерфейса — learningV2CanOpen
    expect(lessons).toContain('const learningV2CanOpen = learningV2CourseCanBeOpenedManually() && isLearningV2OpenForUiLangV1(lang, "lessons_tab");');
    expect(lessons).toContain('useLearningV2Visibility();');
    expect(lessons.match(/\{learningV2CanOpen \? \(/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(lessons).toContain('{!isRetainedTab && learningV2CanOpen ? (');
    // Решение владельца 04.11: вход «v2» из памяти или ссылки разрешён только когда проверка прогресса открыла V2 (learningV2CanOpen).
    expect(lessons).toContain('if (initial === "v2" && !learningV2CanOpen) {');
    // прогрев каталога V2 при скрытом V2 не взводится
    // зачем (работа 19.10, закоммичена 22.10 в 72f72a94e): прогрев ждёт паузы в касаниях и на списке, и на карте V2 —
    // исключена только страница диалогов; главное правило сторожа (скрытый V2 → без прогрева) прежнее.
    expect(lessons).toContain('if (!learningV2CanOpen || learningV2WarmupArmed || page === "dialogs") return undefined;');
  });

  it('маршруты курса и занятия при «скрыт» уводят на Главную с [V2-HIDDEN]', () => {
    const course = read('app/learning-v2/course.tsx');
    expect(course).toContain('if (isLearningV2Hidden()) {');
    expect(course).toContain('logLearningV2Hidden("route_learning_v2_course", LEARNING_V2_HIDDEN_REDIRECT);');
    expect(course).toContain('if (!rootNavigationReady) return;');
    expect(course).toContain('scheduleAfterRootNavigationReady(() => {');
    expect(course).toContain('router.replace(LEARNING_V2_HIDDEN_REDIRECT);');

    const session = read('app/learning-v2/session/[id].tsx');
    expect(session).toContain('if (isLearningV2Hidden()) {');
    expect(session).toContain('logLearningV2Hidden("route_learning_v2_session", LEARNING_V2_HIDDEN_REDIRECT');
  });

  it('других входов в маршруты V2 вне самого V2 нет (новый вход — сначала под рубильник)', () => {
    // Разрешённые места: сам V2, вкладка «Обучение» (переход в занятие живёт на странице v2, закрытой константой),
    // служебные реестры путей (назад, попытки, возможности рантайма) — они не открывают V2, а распознают его путь.
    // зачем (владелец 17.10, «Обучение открывает новые уроки»): плитка «Уроки» на Главной ведёт на карту V2 — только под рубильником (isLearningV2Hidden() → прежний /lessons_list),
    // это проверяет tests/home_learning_cta_contract.test.ts.
    const allowed = new Set([
      'app/(tabs)/home.tsx',
      'app/(tabs)/lessons.tsx',
      'app/+native-intent.tsx',
      'app/navigation_back.ts',
      'app/native_runtime_capability.ts',
      'app/lessons_access_diagnostics.ts',
      'app/session_attempts/session_attempts_registry.ts',
      'components/appArtBackdropRegistry.ts',
      'constants/devRoutes.ts',
      // экзамен главы v2: рисуется только маршрутом app/learning-v2/chapter-exam.tsx (он сам под рубильником); «/learning-v2/course» — его запасной выход
      'components/learning-v2/exam_v2/ChapterExamV2Run.tsx',
    ]);
    const routeRe = /["'`]\/learning(?:-v2\/|_v2_)/;
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || rel === 'components/dev' || rel === 'app/learning-v2') continue;
          walk(rel);
        } else if (/\.(ts|tsx)$/.test(entry.name) && !/^app\/(_?learning_v2_|learning_v2_modes_showcase_run\/)/.test(rel) && !allowed.has(rel)) {
          if (routeRe.test(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) offenders.push(rel);
        }
      }
    };
    for (const dir of ['app', 'components', 'hooks', 'modules', 'constants']) walk(dir);
    expect(offenders).toEqual([]);
  });

  it('«Что нового» не упоминает Learning V2 (скрывать нечего)', () => {
    const copy = read('components/release_notes_v2_copy.ts');
    expect(copy).not.toMatch(/Learning V2|learning-v2|Новые уроки/);
  });
});
