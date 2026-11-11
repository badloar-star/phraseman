/**
 * «почему?» в заданиях теории (владелец 11.11: «написана просто фраза без объяснения почему»).
 * Контракт: объяснение — это НЕ повтор правильной фразы. Нет объяснения в данных → кнопки «почему?» нет вовсе.
 */
import { getClassicPlainView, isClassicPlainLesson } from '../app/classic_theory_plain';
import { getClassicTheoryView } from '../app/classic_theory_view';
import { classicTheoryWhy } from '../app/classic_theory_why';
import type { TheoryDrill } from '../components/theory/TheoryLessonView';

jest.mock('../app/classic_course_phrases', () => ({
  ...jest.requireActual('../app/classic_course_phrases'),
  classicCourseActiveFor: () => true,
}));

function drillsOf(view: { sections: { blocks: { kind: string; drill?: TheoryDrill }[] }[] } | null): TheoryDrill[] {
  return (view?.sections ?? []).flatMap((s) => s.blocks.flatMap((b) => (b.kind === 'drill' && b.drill ? [b.drill] : [])));
}

describe('theory «почему?» is a real explanation, never the answer phrase itself', () => {
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  // зачем: в новом формате (plain) объяснение обязано быть у КАЖДОГО задания каждого курса — иначе после правки теории кнопка молча пропадёт
  it.each([['en', 400], ['es', 90], ['fr', 90], ['de', 140], ['it', 170]] as const)('every new-format theory task of the %s course has an explanation in ru/uk/en that differs from the answer', (target, atLeast) => {
    let total = 0;
    for (let lesson = 1; lesson <= 32; lesson += 1) {
      for (const drill of drillsOf(getClassicPlainView(target, lesson, 'ru'))) {
        total += 1;
        const text = drill.type === 'choice' ? drill.why : drill.type === 'binary' ? drill.explain : undefined;
        const answer = drill.type === 'choice' ? drill.answer : drill.type === 'binary' ? (drill.correct === 'A' ? drill.optionA : drill.optionB) : '';
        expect(text).toBeDefined();
        for (const key of ['ru', 'uk', 'en'] as const) {
          const value = text?.[key] ?? '';
          expect(value.length).toBeGreaterThan(answer.length);
          expect(value).not.toBe(answer);
        }
        // зачем: интерфейс es/pt/vi/id/tr/pl не должен получить русский текст (переводов нет → английский)
        expect(text?.es).toBe(text?.en);
        expect(/[А-Яа-яЁё]/.test(text?.en ?? '')).toBe(false);
      }
    }
    expect(total).toBeGreaterThan(atLeast);
  });

  it('no explanation in data → the choice task carries no «почему?» at all (button is hidden)', () => {
    expect(classicTheoryWhy('fr', 1, 'c1', 'no-such-phrase')).toBeNull();
    expect(classicTheoryWhy('xx', 1, 'c1', 'no-such-phrase')).toBeNull();
    for (const target of ['fr', 'es', 'de', 'it'] as const) {
      for (let lesson = 1; lesson <= 32; lesson += 1) {
        // уроки нового формата проверены выше; здесь — только старый формат, где объяснений простыми словами нет
        if (isClassicPlainLesson(target, lesson)) continue;
        for (const drill of drillsOf(getClassicTheoryView(target, lesson, 'ru'))) {
          if (drill.type === 'choice') expect(drill.why).toBeUndefined();
        }
      }
    }
  });
});
