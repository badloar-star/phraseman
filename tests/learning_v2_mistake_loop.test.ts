import fs from 'node:fs';
import path from 'node:path';

// зачем (координатор 15.10, разбор красных наборов): карта урока V2 (app/learning-v2/lesson/[id].tsx), где жила петля ошибок,
// удалена сознательно 5bef1e710 («dead lesson map screen», §129) — проверки карты сняты вместе с экраном. Остальной смысл
// сторожа сохранён: урок из payload в сессии, «Мои ошибки» не продолжают черновик карточек, текст узла петли без капса,
// счёт петли — только по текущему уроку.
const node = fs.readFileSync(path.join(__dirname, '..', 'components', 'mistake-practice', 'MistakePracticeLoopNode.tsx'), 'utf8');
const legacySession = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning-v2', 'session', '[id].tsx'), 'utf8');
const mistakeSession = fs.readFileSync(path.join(__dirname, '..', 'app', 'mistake_practice_session.tsx'), 'utf8');
const runtime = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning_v2_mistake_loop_runtime.ts'), 'utf8');

describe('Learning V2 optional mistake loop', () => {
  test('the lesson map screen stays removed (5bef1e710)', () => {
    expect(fs.existsSync(path.join(__dirname, '..', 'app', 'learning-v2', 'lesson', '[id].tsx'))).toBe(false);
  });

  test('counts only the current lesson', () => {
    expect(runtime).toContain('item.lessonId === input.lessonId');
  });

  test('captures the canonical released lesson id and never resumes the cards draft in Learning V2', () => {
    // зачем: 936b8c09b (30.08) обернул значение в String() ради типов — смысл тот же: урок из payload.
    expect(legacySession).toMatch(/lessonId: (?:String\()?payload\.lessonId/);
    expect(legacySession).not.toContain('lessonId: "lesson-1"');
    expect(mistakeSession).toContain("const persistSession = entrySource === 'cards'");
  });

  // зачем (Ревизор 15.10, 🟡 к 332d3a62f): вместе с картой ушли проверки «порог 5» и «граница Plus» — это деньги, сторож обязан
  // их держать. Петля на карте больше не рисуется (runtime и узел сейчас никем не подключены), но те же правила живут в
  // «Моих ошибках»: от 5 ошибок — платная сессия (энергия), у Free 1 сессия в сутки, дальше — пейвол Plus; Plus идёт без чека.
  test('money: a session of 5+ mistakes costs energy, 1–4 is free', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const session = require('../modules/mistake-practice/session') as typeof import('../modules/mistake-practice/session');
    expect(session.MISTAKE_PRACTICE_ENERGY_MIN_COUNT).toBe(5);
    expect([1, 4, 5, 12].map((n) => session.mistakePracticeSessionCostsEnergy(n))).toEqual([false, false, true, true]);
  });

  test('money: Free gets one mistakes session a day, then the Plus paywall; Plus skips the daily receipt', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { REVENUE_DAILY_LIMITS } = require('../app/revenue_daily_limits') as typeof import('../app/revenue_daily_limits');
    expect(REVENUE_DAILY_LIMITS.mistake_practice_starts).toBe(1);
    const gate = fs.readFileSync(path.join(__dirname, '..', 'hooks', 'useMistakePracticeStartGate.ts'), 'utf8');
    // 66ee71ea7 (Ревизор 2.76): в ветки добавлена строка решения [MISTAKES-GATE] decision — сторож держит ту же цепочку
    // «исчерпано → пейвол → false» и «Plus → пускаем без чека»; поведение — в tests/mistake_practice_gate_energy_precheck.test.ts
    expect(gate).toMatch(/if \(quota\.status === 'exhausted'\) \{\s*decide\('paywall'\);\s*openPaywall\(\);\s*return false;/);
    expect(gate).toContain("params: { context: 'mistake_practice', source }");
    expect(gate).toMatch(/if \(quota\.limit === null\) \{ decide\('start_unlimited'\); return true; \} \/\/ Plus/);
    expect(node).toMatch(/plus: ', нужен Plus'/);
    expect(node).toContain('locked: boolean;');
  });

  test('loop node copy: optional, no shouting caps, Plus presentation', () => {
    expect(node).toContain('Необязательная петля');
    expect(node).not.toContain('styles.eyebrow');
    expect(node).not.toContain('НЕОБЯЗАТЕЛЬНАЯ ПЕТЛЯ</Text>');
    expect(node).toContain('Plus');
  });
});
