// Governance-ID: TG-99C785B4D4E1
// ЗАМОК ВЛАДЕЛЬЦА 06.11 (утро, TestFlight 150): «на онбординге доступен только английский, а должны быть доступны ВСЕ. В разделе выбора изучаемого языка то же самое — должны быть все».
// Отменяет «в 150 только EN» (05.11). В онбординге, в Настройках → изучаемый язык, в шторке добавления языка и в языке нового набора предлагаются все 5 курсов: en, es, fr, de, it.
// Скрыть язык можно только новым словом владельца: правка этого файла + реестра OWNER_LOCKS.md + KNOWN_GUARDS в tests/owner_locks_registry.test.cjs.
import fs from 'node:fs';
import path from 'node:path';
import {
  COURSE_LANGUAGE_ENABLED,
  __resetCoursesGateLogForTests,
  decideVisibleCourseTargets,
  isCourseVisibleOnOnboarding,
  visibleCourseTargets,
  visiblePackChoicesForNewPack,
} from '../app/courses_gate';
import { STUDY_TARGETS, isStudyTargetAllowedForUi, studyTargetsForSourceLocale } from '../app/study_target';

const ALL = ['en', 'es', 'fr', 'de', 'it'] as const;
const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('ЗАМОК ВЛАДЕЛЬЦА 06.11 — предлагаются все 5 курсов', () => {
  beforeEach(() => __resetCoursesGateLogForTests());

  test('таблица шлюза: все четыре не-английских языка включены', () => {
    expect(COURSE_LANGUAGE_ENABLED).toEqual({ es: true, fr: true, de: true, it: true });
  });

  test('онбординг: каждый из пяти курсов виден', () => {
    for (const code of ALL) expect([code, isCourseVisibleOnOnboarding(code)]).toEqual([code, true]);
  });

  test('Настройки / шторка добавления языка: человек без активного курса и с любым активным видит все пять', () => {
    for (const active of [null, ...ALL]) {
      expect([active, [...visibleCourseTargets(ALL, active, 'settings_picker')]]).toEqual([active, [...ALL]]);
      expect(decideVisibleCourseTargets(ALL, { activeTarget: active }).hidden).toEqual([]);
    }
  });

  test('язык нового набора: все пять и «без языка»', () => {
    const choices = [...ALL, 'none'] as const;
    expect([...visiblePackChoicesForNewPack(choices, null)]).toEqual([...choices]);
  });

  test('второго скрытого фильтра нет: список изучаемых языков продукта = все пять при любом языке интерфейса', () => {
    expect([...STUDY_TARGETS].sort()).toEqual([...ALL].sort());
    for (const ui of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      expect([...studyTargetsForSourceLocale(ui)].sort()).toEqual([...ALL].sort());
      for (const code of ALL) expect(isStudyTargetAllowedForUi(code, ui)).toBe(true);
    }
  });

  test('три экрана выбора идут через шлюз, шлюз не читает Пульт и не трогает данные; журнал offered на месте', () => {
    expect(read('components/settings/StudyLanguagePicker.tsx')).toContain("visibleCourseTargets(studyTargetsForSourceLocale(lang), activeTarget, 'settings_picker')");
    expect(read('components/CleanOnboarding.tsx')).toContain('isCourseVisibleOnOnboarding(item.id)');
    expect(read('app/community_pack_create.tsx')).toContain('visiblePackChoicesForNewPack(PACK_LANGUAGE_CHOICES, packLanguage)');
    const gate = read('app/courses_gate.ts');
    expect(gate).not.toMatch(/AsyncStorage|removeItem|multiRemove|setItem|firestore|getRemoteBool|remote_flags|PHRASEMAN_R1_HIDE_V2/i);
    expect(gate).toContain('offered');
    expect(gate).toContain('[COURSE-GATE]');
  });
});
