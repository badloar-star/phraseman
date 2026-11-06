// Governance-ID: TG-CBC6EB9073FE
import fs from 'node:fs';
import path from 'node:path';
import {
  COURSE_LANGUAGE_ENABLED,
  decideVisibleCourseTargets,
  isCourseLanguageEnabled,
  visiblePackChoicesForNewPack,
  type HideableCourseLanguage,
} from '../app/courses_gate';

// зачем (слово владельца 05.11; 779d869eb): английский виден всегда, es/fr/de/it включаются ПО ОДНОМУ языку константой в коде
// (≤15 % ошибок и рабочий курс). 05.11 замер Ревизора выполнил условие, владелец: «тут должны быть все языки» — в 150 включены все четыре. Включённый язык виден везде, где виден английский; скрытый — нигде; активный
// курс человека не отнимается; прогресс и данные не трогаются. Сторож падает, если скрытие снимут или шлюз полезет в хранилище.

const ALL = ['en', 'es', 'fr', 'de', 'it'] as const;
const NONE: Readonly<Record<HideableCourseLanguage, boolean>> = { es: false, fr: false, de: false, it: false };
const ALL_ON: Readonly<Record<HideableCourseLanguage, boolean>> = { es: true, fr: true, de: true, it: true };
const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('150: выбор курса по языкам', () => {
  test('в 150 включены все четыре языка (слово владельца 06.11 утро: «должны быть доступны ВСЕ»), английский виден всегда', () => {
    expect(COURSE_LANGUAGE_ENABLED).toEqual({ es: true, fr: true, de: true, it: true });
    expect(isCourseLanguageEnabled('en')).toBe(true);
    for (const code of ['es', 'fr', 'de', 'it']) expect(isCourseLanguageEnabled(code)).toBe(true);
  });

  test('при включённых языках в выборе все пять курсов', () => {
    const d = decideVisibleCourseTargets(ALL, { table: ALL_ON, activeTarget: 'en' });
    expect(d.visible).toEqual(ALL);
    expect(d.hidden).toEqual([]);
  });

  test('новый человек видит только en', () => {
    const d = decideVisibleCourseTargets(ALL, { table: NONE, activeTarget: 'en' });
    expect(d.visible).toEqual(['en']);
    expect(d.hidden).toEqual(['es', 'fr', 'de', 'it']);
  });

  test('активный не-английский курс остаётся, остальные скрыты (доступ не отнимаем)', () => {
    const d = decideVisibleCourseTargets(ALL, { table: NONE, activeTarget: 'es' });
    expect(d.visible).toEqual(['en', 'es']);
    expect(d.keptForActive).toEqual(['es']);
    expect(d.hidden).toEqual(['fr', 'de', 'it']);
  });

  test.each(['es', 'fr', 'de', 'it'] as const)('включённый язык %s виден везде, где виден en; остальные скрыты', (code) => {
    const table = { ...NONE, [code]: true };
    expect(isCourseLanguageEnabled(code, table)).toBe(true);
    const d = decideVisibleCourseTargets(ALL, { table, activeTarget: null });
    expect([...d.visible].sort()).toEqual(['en', code].sort());
    for (const other of ['es', 'fr', 'de', 'it'].filter((c) => c !== code)) expect(d.visible).not.toContain(other);
  });

  test('неизвестный код языка скрыт', () => {
    expect(isCourseLanguageEnabled('xx')).toBe(false);
  });

  test('язык НОВОГО набора: при включённых языках виден весь список, «без языка» остаётся', () => {
    const choices = ['en', 'fr', 'de', 'es', 'it', 'none'] as const;
    expect(visiblePackChoicesForNewPack(choices, 'en')).toEqual(choices);
  });

  test('человек с прогрессом в es/de/it/fr не теряет курс: активный остаётся видимым, остальные скрыты, ничего не бросает', () => {
    for (const active of ['es', 'fr', 'de', 'it'] as const) {
      const d = decideVisibleCourseTargets(ALL, { table: NONE, activeTarget: active }); // зачем: механизм при выключенных языках (в 150 они включены — см. замок 06.11)
      expect(d.visible).toEqual(['en', active]);
      expect(d.keptForActive).toEqual([active]);
      expect(d.hidden).toEqual(ALL.filter((c) => c !== 'en' && c !== active));
    }
    expect(() => decideVisibleCourseTargets(ALL, { activeTarget: 'xx' })).not.toThrow();
  });

  test('три места выбора идут через шлюз: настройки/шторка, онбординг, новый набор', () => {
    expect(read('components/settings/StudyLanguagePicker.tsx')).toContain("visibleCourseTargets(studyTargetsForSourceLocale(lang), activeTarget, 'settings_picker')");
    expect(read('components/CleanOnboarding.tsx')).toContain('isCourseVisibleOnOnboarding(item.id)');
    expect(read('app/community_pack_create.tsx')).toContain('visiblePackChoicesForNewPack(PACK_LANGUAGE_CHOICES, packLanguage)');
  });

  test('фильтры «Мои наборы» (PackLanguagePicker) шлюзом не гасятся: чужие/свои данные остаются доступны', () => {
    expect(read('app/flashcards/PackLanguagePicker.tsx')).not.toContain('courses_gate');
  });

  test('шлюз не удаляет и не меняет данные и не читает Пульт', () => {
    const gate = read('app/courses_gate.ts');
    expect(gate).not.toMatch(/AsyncStorage|removeItem|multiRemove|setItem|firestore|getRemoteBool|remote_flags/i);
  });

  test('журнал несёт оба имени и объясняет решение', () => {
    const gate = read('app/courses_gate.ts');
    expect(gate).toContain('[COURSE-GATE]');
    expect(gate).toContain('[COURSES-GATE]');
    expect(gate).toContain('[COURSES-HIDDEN]');
    expect(gate).toContain('hidden');
    expect(gate).toContain('keptForActive');
  });
});
