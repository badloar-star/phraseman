// зачем: 2026-07-26 владелец забраковал ДВА захода на Learning V2 — витрину
// «скриптовых режимов» Kimi и session-прототип (карта → 12 сессий → раннер) —
// и решил (опрос, серия A): прототип снести сразу, строить с нуля по планам
// Кодекса (docs/v2/00–08) через ревизию → HTML-макеты → RN-волны. Контракт
// держит три вещи: (1) дев-вход V2 живёт и стабилен, (2) оба забракованных
// захода НЕ возвращаются, (3) заглушка уважает тему приложения и запреты стиля.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
const exists = (rel: string) => fs.existsSync(path.join(process.cwd(), rel));

const lessonsSource = read('app/(tabs)/lessons.tsx');
const labSource = read('components/learning-v2-lab/LearningV2ModesLab.tsx');

describe('lessons V2 — вход поверхности после сноса прототипа', () => {
  test('дев-гейт V2 остаётся смонтированным на странице Уроки', () => {
    // Точка монтажа — решение владельца A4: Уроки → V2 за ENABLE_DEV_TOOLS.
    // Ломать её нельзя: сюда волнами приедут новые режимы.
    expect(lessonsSource).toMatch(/ENABLE_DEV_TOOLS/);
    expect(lessonsSource).toMatch(/useState<\s*'lessons'\s*\|\s*'dialogs'\s*\|\s*'v2'/);
    expect(lessonsSource).toMatch(/label="V2"/);
    expect(lessonsSource).toMatch(/LearningV2ModesLab/);
  });

  test('забракованная витрина Kimi не возвращается ни под каким видом', () => {
    expect(labSource).not.toMatch(/ModeDemoPlayer|LAB_MODE_CATALOG|kimi\/registry/);
  });

  test('снесённый session-прототип не возвращается', () => {
    // Решение владельца A3: снести сразу. Возврат каталога session/ или его
    // импортов = регрессия против явного решения. Новые режимы живут в другой
    // структуре (по докам 04/06), а не в воскрешённом прототипе.
    expect(exists('components/learning-v2-lab/session')).toBe(false);
    expect(labSource).not.toMatch(/\.\/session\//);
    expect(labSource).not.toMatch(/SessionRunner|UnitMap|ZoneCeremony|PracticeLab/);
  });

  test('переиспользуемый слой kimi (токены/примитивы/голос) сохранён', () => {
    // Хендовер §4: tokens/primitives/use_voice_capture — переиспользуемое.
    expect(exists('components/learning-v2-lab/kimi/tokens.ts')).toBe(true);
    expect(exists('components/learning-v2-lab/kimi/primitives.tsx')).toBe(true);
    expect(exists('components/learning-v2-lab/kimi/use_voice_capture.ts')).toBe(true);
  });

  test('заглушка берёт цвета из темы приложения, а не из хардкод-палитры', () => {
    // Решение владельца №4 (хендовер §3): режимы перенимают тему приложения.
    // Хардкод cinema-палитры Kimi был одной из причин браковки прототипа.
    expect(labSource).toMatch(/useTheme/);
    expect(labSource).not.toMatch(/from '\.\/kimi\/tokens'/);
    expect(labSource).not.toMatch(/#[0-9A-Fa-f]{6}/);
  });

  test('стиль заглушки уважает запреты владельца', () => {
    expect(labSource).not.toMatch(/adjustsFontSizeToFit/);
    // Обводки контейнеров запрещены; разделитель одной стороны разрешён.
    expect(labSource).not.toMatch(/(?<!Bottom)(?<!Top)(?<!Left)(?<!Right)borderWidth/);
    expect(labSource).not.toMatch(/(?<!borderBottom)(?<!borderTop)(?<!borderLeft)borderColor/);
  });
});
