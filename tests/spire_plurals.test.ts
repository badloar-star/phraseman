// зачем (координатор 12.10, аудит SPIRE_I18N_AUDIT §6): «1 ступеней», «1 steps», «1 людей», «2 stopni» — формы по числу на всех 9 языках.
import {
  SPIRE_PEOPLE_FORMS, SPIRE_STEP_FORMS, spirePeopleCount, spireStepsCount, spireStepsShort, spireStepsWordAfterOf,
} from '../components/spire/spire_plurals';
import type { Lang } from '../constants/i18n';

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

describe('Spire step and people plurals', () => {
  it('declines steps in the Slavic languages', () => {
    expect(spireStepsCount('ru', 1)).toBe('1 ступень');
    expect(spireStepsCount('ru', 3)).toBe('3 ступени');
    expect(spireStepsCount('ru', 5)).toBe('5 ступеней');
    expect(spireStepsCount('ru', 11)).toBe('11 ступеней');
    expect(spireStepsCount('ru', 21)).toBe('21 ступень');
    expect(spireStepsCount('uk', 1)).toBe('1 сходинка');
    expect(spireStepsCount('uk', 2)).toBe('2 сходинки');
    expect(spireStepsCount('uk', 7)).toBe('7 сходинок');
    expect(spireStepsCount('pl', 1)).toBe('1 stopień');
    expect(spireStepsCount('pl', 4)).toBe('4 stopnie');
    expect(spireStepsCount('pl', 12)).toBe('12 stopni');
  });

  it('declines steps in the other languages', () => {
    expect(spireStepsCount('en', 1)).toBe('1 step');
    expect(spireStepsCount('en', 2)).toBe('2 steps');
    expect(spireStepsCount('es', 1)).toBe('1 escalón');
    expect(spireStepsCount('es', 3)).toBe('3 escalones');
    expect(spireStepsCount('pt-BR', 1)).toBe('1 degrau');
    expect(spireStepsCount('pt-BR', 8)).toBe('8 degraus');
    for (const lang of ['vi', 'id', 'tr'] as const) expect(spireStepsCount(lang, 1).slice(2)).toBe(spireStepsCount(lang, 9).slice(2));
  });

  it('after «из N» the Slavic languages keep the genitive plural', () => {
    expect(spireStepsWordAfterOf('ru', 8)).toBe('ступеней');
    expect(spireStepsWordAfterOf('ru', 22)).toBe('ступеней');
    expect(spireStepsWordAfterOf('uk', 22)).toBe('сходинок');
    expect(spireStepsWordAfterOf('pl', 22)).toBe('stopni');
    expect(spireStepsWordAfterOf('en', 1)).toBe('step');
    expect(spireStepsWordAfterOf('es', 8)).toBe('escalones');
  });

  it('declines people', () => {
    expect(spirePeopleCount('ru', 1)).toBe('1 человек');
    expect(spirePeopleCount('ru', 2)).toBe('2 человека');
    expect(spirePeopleCount('ru', 30)).toBe('30 человек');
    expect(spirePeopleCount('uk', 1)).toBe('1 людина');
    expect(spirePeopleCount('uk', 3)).toBe('3 людини');
    expect(spirePeopleCount('uk', 30)).toBe('30 людей');
    expect(spirePeopleCount('en', 1)).toBe('1 person');
    expect(spirePeopleCount('en', 30)).toBe('30 people');
    expect(spirePeopleCount('pl', 2)).toBe('2 osoby');
    expect(spirePeopleCount('pl', 30)).toBe('30 osób');
  });

  it('keeps abbreviations fixed and only the English short form agrees', () => {
    expect(spireStepsShort('ru', 1)).toBe('ступ.');
    expect(spireStepsShort('uk', 5)).toBe('сход.');
    expect(spireStepsShort('en', 1)).toBe('step');
    expect(spireStepsShort('en', 5)).toBe('steps');
  });

  it('has a non-empty form for every language', () => {
    for (const lang of LANGS) {
      for (const forms of [SPIRE_STEP_FORMS[lang], SPIRE_PEOPLE_FORMS[lang]]) {
        expect(forms.one.trim()).not.toBe('');
        expect(forms.few.trim()).not.toBe('');
        expect(forms.many.trim()).not.toBe('');
      }
    }
  });
});
