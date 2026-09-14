/**
 * ⛔ СТОРОЖ КОНСЕРВАЦИИ РАЗДЕЛА MAX. НЕ УДАЛЯТЬ, НЕ ОСЛАБЛЯТЬ.
 *
 * Решение владельца 2026-09-04. Дословно: «Раздел макс надо скрыть и отключить
 * все кроны инстансы и всё что тратит наши деньги… поставь флаги для всех
 * следующих нейронок, что раздел закрыт и его не восстанавливать без
 * специальной команды».
 *
 * ПОВОД — продовые данные за 3 недели (162 звонка, 46 пользователей):
 *   • 96 звонков из 162 (59%) закончились НА НУЛЕ СЕКУНД;
 *   • средняя длительность 27 секунд, дольше минуты — лишь 29 звонков;
 *   • 37 из 63 аккаунтов сожгли пожизненный пробник впустую;
 *   • при этом watchdog крутился каждые 10 минут (~4320 запусков/мес) и шла
 *     оплата OpenAI. Раздел не работал, но стоил денег.
 *
 * ⛔ ЕСЛИ ЭТОТ ТЕСТ УПАЛ — значит кто-то (человек или ИИ) начал возвращать MAX.
 * Чинить надо НЕ тест. Верните пломбы на место. Раздел включается ТОЛЬКО по
 * прямой явной команде владельца вида «включи MAX обратно»; ни «починка
 * импорта», ни «раз уж рядом правлю», ни «в Пульте флаг включён» такой командой
 * НЕ являются. Снимая пломбу по команде владельца — удалите и этот файл.
 */
import fs from 'fs';
import path from 'path';

const read = (...p: string[]): string =>
  fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

describe('раздел MAX законсервирован', () => {
  it('клиентская пломба стоит и закрывает вход раньше env и «Пульта»', () => {
    const flags = read('app', 'max_voice_flags.ts');
    expect(flags).toContain('MAX_SECTION_SEALED_BY_OWNER_2026_09_04 = true');
    // Пломба обязана проверяться ПЕРВОЙ строкой функции: иначе QA-override или
    // удалённый флаг откроют раздел в обход решения владельца.
    const fn = flags.slice(flags.indexOf('export function isMaxVoiceCallEnabled'));
    const sealIdx = fn.indexOf('MAX_SECTION_SEALED_BY_OWNER_2026_09_04');
    const envIdx = fn.indexOf('envOverride()');
    const remoteIdx = fn.indexOf('getRemoteBool');
    expect(sealIdx).toBeGreaterThan(-1);
    expect(sealIdx).toBeLessThan(envIdx);
    expect(sealIdx).toBeLessThan(remoteIdx);
    expect(fn).toMatch(/if \(MAX_SECTION_SEALED_BY_OWNER_2026_09_04\) return false;/u);
  });

  it('НИ ОДНА функция MAX не деплоится: деньги по расписанию не тратятся', () => {
    const idx = read('functions-max', 'index.ts');
    expect(idx).toContain('MAX_SECTION_SEALED_BY_OWNER_2026_09_04');
    expect(idx).toContain("from '../functions/src/max_section_seal'");
    // Живым остаётся только маркер пломбы. Любой другой экспорт = возврат трат:
    // watchdog крутился каждые 10 минут и был главным расходом раздела.
    const liveExports = idx
      .split('\n')
      .filter((line) => line.startsWith('export '))
      .filter((line) => !line.includes('MAX_SECTION_SEALED_BY_OWNER_2026_09_04'));
    expect(liveExports).toEqual([]);
  });

  it('Jarvis and the MAX codebase share the same owner seal', () => {
    const seal = read('functions', 'src', 'max_section_seal.ts');
    const department = read('functions', 'src', 'jarvis', 'maxvoice_department.ts');
    const snapshot = read('functions', 'src', 'jarvis', 'maxvoice_snapshot.ts');
    expect(seal).toContain('MAX_SECTION_SEALED_BY_OWNER_2026_09_04 = true');
    expect(department).toContain("from '../max_section_seal'");
    expect(snapshot).toContain("from '../max_section_seal'");
    expect(department).not.toContain('sectionSealed');
    expect(snapshot).not.toContain('sectionSealed');
    expect(snapshot).not.toContain('__maxvoiceSnapshotTestHooks');
    expect(department).toContain('evaluateMaxvoiceReliability');
    expect(department).toMatch(
      /runMaxvoiceDepartment[\s\S]{0,300}MAX_SECTION_SEALED_BY_OWNER_2026_09_04[\s\S]{0,200}evaluateMaxvoiceReliability/u,
    );
    for (const callSite of ['all_departments_callables.ts', 'jarvis_crons.ts']) {
      expect(read('functions', 'src', 'jarvis', callSite)).not.toContain('sectionSealed');
    }
  });

  it('MAX остаётся запечатан, а его тематический орб служит только плитке Диалоги', () => {
    const home = read('app', '(tabs)', 'home.tsx');
    const quickItems = home.slice(
      home.indexOf('const quickItems = ['),
      home.indexOf('const visibleQuickItems'),
    );
    expect(quickItems).not.toContain("key: 'max'");
    expect(quickItems).toContain("key: 'dialogs'");
    expect(quickItems).toContain("nav.push('/ai_dialog_home' as never)");
    // Решение владельца 2026-09-12: визуал MAX переиспользуется в точности,
    // но не открывает MAX и не снимает серверную/клиентскую пломбу.
    expect(home).toContain('const maxOrbLayers = getMaxHomeOrbLayers(themeMode)');
    expect(home).toContain("item.key === 'dialogs'");
    expect(home).toContain('<MaxHomeOrb');
  });
});
