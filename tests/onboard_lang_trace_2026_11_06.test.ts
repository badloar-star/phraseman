// зачем (P0 06.11 «выбор языка на онбординге не меняет курс», «сперва логи»): трассировка [ONBOARD-LANG] обязана стоять во всех точках цепочки —
// выбор → запись → чтение → решение замка. Без неё диагноз гадание. После починки логи на ранних выходах и в catch остаются.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('[ONBOARD-LANG] трассировка цепочки выбора языка', () => {
  it('запись и чтение ключа языка', () => {
    const src = read('app/study_target.ts');
    expect(src).toContain('[ONBOARD-LANG] read raw=');
    expect(src).toContain('[ONBOARD-LANG] set requested=');
    expect(src).toContain('[ONBOARD-LANG] read:unknown_value_reset');
  });

  it('онбординг: вход выбора, сверка после записи, запись дефолта en', () => {
    const src = read('components/CleanOnboarding.tsx');
    expect(src).toContain('[ONBOARD-LANG] choose target=');
    expect(src).toContain('[ONBOARD-LANG] choose:done');
    expect(src).toContain('[ONBOARD-LANG] ensure_en');
    expect(src).toContain('[ONBOARD-LANG] choose:readback_failed');
  });

  it('решение замка дополнительного языка', () => {
    expect(read('app/course_language_access.ts')).toContain('[ONBOARD-LANG] lock_decision');
  });
});
