// зачем (координатор 12.10, cards-v2-029): dev-подмена языка изучения — только dev-сборка и только одноразовый гость; ключ языка не выгружается в облако; ссылка «Нет карточек» использует es.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('dev_state studyTarget=', () => {
  it('модуль отказывает вне dev-сборки и на настоящем аккаунте (гард гостя до записи)', () => {
    const src = read('app/dev_state_study_target.ts');
    expect(src).toContain("typeof __DEV__ === 'undefined' || __DEV__ !== true || IS_STORE_RELEASE");
    expect(src.indexOf('assertDisposableGuest(')).toBeGreaterThan(0);
    expect(src.indexOf('assertDisposableGuest(')).toBeLessThan(src.indexOf('setStoredStudyTarget(target'));
    expect(src).toContain('[DEV-STATE] studyTarget');
  });

  it('параметр разбирается из ссылки и применяется до карточных фикстур', () => {
    const fx = read('app/dev_state_fixtures.ts');
    expect(fx).toContain("request.studyTarget = pick('studyTarget', ['en', 'es', 'de', 'fr', 'it'] as const);");
    expect(fx.indexOf("await step('studyTarget'")).toBeGreaterThan(0);
    expect(fx.indexOf("await step('studyTarget'")).toBeLessThan(fx.indexOf("await step('cards', request.cards"));
  });

  it('cards-v2-029 / cards-076: ссылка «Нет карточек» — гость с es и cards=empty', () => {
    expect(read('scripts/dev_links_r1_steps_cards2.py')).toContain("EMPTY_PLUS + '&studyTarget=es', '/flashcards_training_setup?mode=blitz'");
  });
});
