// зачем (план Б к сборке 16.10, координатор 14.10): владелец 15.10 решает судьбу Learning V2; решение исполняется ОДНОЙ
// строкой app/learning_v2_visibility_switch.ts. Сторож держит контракт в обоих положениях рубильника: при «скрыт» ни один
// вход в V2 не виден, старые ссылки ведут на Главную с [V2-HIDDEN]; при «открыт» поведение прежнее.
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

describe('рубильник «Learning V2 скрыт»', () => {
  it('по умолчанию выключен — решение владельца ещё не принято', () => {
    expect(read('app/learning_v2_visibility_switch.ts')).toMatch(/export const LEARNING_V2_HIDDEN: boolean = (false|true);/);
  });

  it('внешние ссылки в V2 при «скрыт» ведут на Главную и пишут [V2-HIDDEN]', () => {
    mockHidden = true;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    for (const link of ['/learning-v2/session/es-s1', '/learning-v2/course', '/learning_v2_direct_session_player_v1', 'learning-v2/course?x=1']) {
      expect(redirect(link)).toBe('/home');
    }
    expect(warn.mock.calls.some(([line]) => String(line).includes('[V2-HIDDEN] entry=deep_link redirect=/home'))).toBe(true);
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
    expect(lessons).toMatch(/^const LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY = !LEARNING_V2_HIDDEN && \(LEARNING_V2_HAS_RELEASED_SESSIONS_V1 \|\| ENABLE_DEV_TOOLS\);$/m);
    // кнопка «V2» и чип «Новые уроки» рендерятся только под константой
    expect(lessons.match(/\{LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY \? \(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    // прямой маршрут курса (initialPage="v2") и запомненная вкладка
    expect(lessons).toContain('if (initial === "v2" && !LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY) {');
    expect(lessons).toContain('rememberedLessonsPage === "v2" && LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY');
    expect(lessons).toContain('saved !== "v2" || !LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY');
    // прогрев каталога V2 при скрытом V2 не взводится
    expect(lessons).toContain('if (!LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY || learningV2WarmupArmed || page !== "lessons") return undefined;');
  });

  it('маршруты курса и занятия при «скрыт» уводят на Главную с [V2-HIDDEN]', () => {
    const course = read('app/learning-v2/course.tsx');
    expect(course).toContain('if (isLearningV2Hidden()) {');
    expect(course).toContain('logLearningV2Hidden("route_learning_v2_course", LEARNING_V2_HIDDEN_REDIRECT);');
    expect(course).toContain('<Redirect href={LEARNING_V2_HIDDEN_REDIRECT} />');

    const session = read('app/learning-v2/session/[id].tsx');
    expect(session).toContain('export default function LearningV2SessionRoute() {');
    expect(session).toContain('logLearningV2Hidden("route_learning_v2_session", LEARNING_V2_HIDDEN_REDIRECT');
    expect(session).not.toContain('export default function LearningV2SessionScreen()');
  });

  it('других входов в маршруты V2 вне самого V2 нет (новый вход — сначала под рубильник)', () => {
    // Разрешённые места: сам V2, вкладка «Обучение» (переход в занятие живёт на странице v2, закрытой константой),
    // служебные реестры путей (назад, попытки, возможности рантайма) — они не открывают V2, а распознают его путь.
    const allowed = new Set([
      'app/(tabs)/lessons.tsx',
      'app/+native-intent.tsx',
      'app/navigation_back.ts',
      'app/native_runtime_capability.ts',
      'app/session_attempts/session_attempts_registry.ts',
      'components/appArtBackdropRegistry.ts',
      'constants/devRoutes.ts',
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
