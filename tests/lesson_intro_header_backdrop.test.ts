// зачем (бета-тест Б2, 15.10): в теории урока прокручиваемый текст просвечивал ПОД заголовком «Урок N» (шапка — плавающий слой, скрим на светлой теме 0,8). Подложка шапки закрывает контент до низа шапки.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_intro_screens.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('теория урока: подложка шапки', () => {
  it('градиент цвета верха фона темы непрозрачен до низа шапки, кромка ниже; лежит над скроллом (z 9) и под шапкой (z 10)', () => {
    expect(src).toContain('testID="lesson-intro-header-backdrop"');
    expect(src).toContain('colors={[introGlass.bgTop, introGlass.bgTop, introHeaderBackdropClear(introGlass.bgTop)]}');
    expect(src).toContain('locations={[0, headerBottom / (headerBottom + INTRO_HEADER_FEATHER), 1]}');
    expect(src).toContain('height: headerBottom + INTRO_HEADER_FEATHER, zIndex: 9, elevation: 9');
    expect(src).toMatch(/header: \{\n\s*position: 'absolute',[\s\S]*?zIndex: 10,/);
  });

  it('прозрачный конец кромки — тот же цвет с нулевой альфой (без серого пятна при интерполяции)', () => {
    expect(src).toContain('return /^#[0-9a-fA-F]{6}$/.test(bgTop) ? `${bgTop}00` :');
  });
});
