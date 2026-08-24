import fs from 'node:fs';
import path from 'node:path';

// ════════════════════════════════════════════════════════════════════════════
// Сторож Фазы 1 «Бандл-диеты» (docs/plans/2026-08-24-bundle-diet-plan.md):
// экспортёр пака, префетч-оркестровка и bundled-фолбэк обязаны держать строй,
// пока владелец не одобрит финальный коммит-переключатель.
// ════════════════════════════════════════════════════════════════════════════

const read = (relative: string): string =>
  fs.readFileSync(path.join(process.cwd(), relative), 'utf8');

describe('plan content prefetch + release pack contract', () => {
  it('экспортёр хэширует ТОЙ ЖЕ каноникализацией, что рантайм-верификатор', () => {
    const exporter = read('scripts/export_plan_content_packs.mjs');
    const loader = read('app/course_pack_remote_loader.ts');
    // Ядро канонической сериализации — по-байтово одинаковые строки в обоих
    // файлах. Разъедутся — «корректный» серверный день провалит sha256 на девайсе.
    const canonicalCore = [
      'return `[${value.map(canonicalCoursePackContent).join(\',\')}]`;',
      'Object.keys(record).filter((key) => record[key] !== undefined).sort()',
      '.map((key) => `${JSON.stringify(key)}:${canonicalCoursePackContent(record[key])}`).join(\',\')}}`;',
      'return JSON.stringify(value);',
    ];
    for (const line of canonicalCore) {
      expect(exporter).toContain(line);
      expect(loader).toContain(line);
    }
  });

  it('формат пути день-строки экспортёра совпадает с rowPathFor рантайма', () => {
    const exporter = read('scripts/export_plan_content_packs.mjs');
    const readiness = read('app/plan_content_remote_readiness.ts');
    const rowPathCore = "`plans/${planId}/day-${String(dayIndex).padStart(3, '0')}.json`";
    expect(exporter).toContain(rowPathCore);
    expect(readiness).toContain(rowPathCore);
  });

  it('регистрация указывает на релизный префикс course-packs (public read в storage.rules)', () => {
    const registration = read('app/plan_content_remote_registration.ts');
    expect(registration).toMatch(/PLAN_CONTENT_PREFIX = 'course-packs\/plan_content\/en\/ru\/release\./);
    const rules = read('storage.rules');
    expect(rules).toContain('match /course-packs/{allPaths=**}');
  });

  it('префетч событийный: без setInterval, без Firestore, только Storage-цепочка', () => {
    const prefetch = read('app/plan_content_prefetch.ts');
    expect(prefetch).not.toContain('setInterval');
    // Сторожим ИМПОРТЫ (слово «Firestore» в комментариях — легитимно):
    // префетч не имеет права тянуть firebase/firestore-модули.
    expect(prefetch).not.toMatch(/from\s+'[^']*(firebase|firestore)[^']*'/i);
    expect(prefetch).toContain("from './plan_content_remote_facade'");
    expect(prefetch).toContain("from './course_pack_remote_loader'");
    expect(prefetch).toContain("from './plan_content_remote_registration'");
  });

  it('префетч подключён ко всем трём событиям плана', () => {
    // холодный старт: главная греет окно «текущий ±2» активного плана
    expect(read('app/(tabs)/home.tsx')).toContain('prefetchActivePlanContentOnColdStart');
    // покупка (и restore): весь план фоном
    const purchase = read('app/paywall_purchase.ts');
    expect(purchase.split('prefetchWholePlanContentInBackground(').length - 1).toBeGreaterThanOrEqual(2);
    // выбор/смена плана: весь план фоном
    expect(read('app/personal_plan_setup.tsx')).toContain('prefetchWholePlanContentInBackground(');
    expect(read('app/personal_plan_complete.tsx')).toContain('prefetchWholePlanContentInBackground(');
  });

  it('bundled-фолбэк ЖИВ: 5 require в plan_content_registry до одобрения владельца', () => {
    // Финальный шаг Ф1 (выпил require, −19 МБ из бандла) делается ОТДЕЛЬНЫМ
    // коммитом ПОСЛЕ проверки на устройстве и одобрения владельца — тогда этот
    // тест обновляется сознательно, в том же коммите.
    const registry = read('app/plan_content_registry.ts');
    for (const planId of ['mitap', 'gavan', 'impuls', 'echo', 'voyazh']) {
      expect(registry).toContain(`require('./plan_content_${planId}')`);
    }
  });
});
