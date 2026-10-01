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
 *
 * 2026-10-01 (координатор §46): по D81 (владелец 30.09) клиентский MAX удалён
 * целиком — экраны, флаги, орб. Клиентская пломба (max_voice_flags.ts) ушла
 * вместе с кодом, который она закрывала; сторож УСИЛЕН: теперь он требует, чтобы
 * клиентского кода MAX не было вовсе. Серверные пломбы ниже — без изменений.
 */
import fs from 'fs';
import path from 'path';

const read = (...p: string[]): string =>
  fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

describe('раздел MAX законсервирован', () => {
  it('клиентского MAX нет: ни экранов, ни флага включения, ни маршрутов (D81)', () => {
    const exists = (...p: string[]): boolean => fs.existsSync(path.join(process.cwd(), ...p));
    for (const file of [
      'max_voice_flags.ts', 'max_lessons.tsx', 'max_call_prestart.tsx',
      'max_call_session.tsx', 'max_voice_review.tsx', 'max_paywall.tsx',
    ]) {
      expect(exists('app', file)).toBe(false);
    }
    const appFiles = fs.readdirSync(path.join(process.cwd(), 'app'));
    expect(appFiles.filter((name) => /^max_.*\.tsx$/u.test(name))).toEqual([]);
    const layout = read('app', '_layout.tsx');
    expect(layout).not.toMatch(/name="max_/u);
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

  it('на Главной и в каталоге Диалогов нет входа в MAX', () => {
    const home = read('app', '(tabs)', 'home.tsx');
    const dialogs = read('components', 'DialogsTabContent.tsx');
    const quickItems = home.slice(
      home.indexOf('const quickItems = ['),
      home.indexOf('const homeV2AllTiles'),
    );
    expect(quickItems).not.toContain("key: 'max'");
    expect(quickItems).toContain("key: 'dialogs'");
    expect(quickItems).toContain("nav.push('/ai_dialog_home' as never)");
    // Орб MAX на плитке Диалогов был только в Главной V1 (удалена 01.10).
    expect(home).not.toContain('<MaxHomeOrb');
    for (const source of [home, dialogs]) {
      expect(source).not.toMatch(/['"]\/max_(?:lessons|call|voice|paywall)/u);
    }
  });
});
