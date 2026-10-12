// Нормировка склейки «макет | приложение» по ширине (координатор 12.10, ложное «+5–8 %»): scripts/parity_shot.mjs --fit=width.
// зачем: у Pixel_8 экран 411 dp шириной, у макета 390 dp; при равной ВЫСОТЕ приложение выходило шире макета на ≈ 7,6 % и все размеры казались больше.
// Запуск: node --test tests/parity_shot_fit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEVICE_DP, MOCKUP_DP, ROW_HEIGHT_PX, fitScale, layoutHeights, pngSize } from '../scripts/parity_shot.mjs';

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

test('масштаб: 411 dp → 390-dp эквивалент, 390 dp → без изменений', () => {
  assert.equal(MOCKUP_DP, 390);
  assert.equal(DEVICE_DP, 411);
  assert.ok(Math.abs(fitScale(411) - 390 / 411) < 1e-12);
  assert.equal(fitScale(390), 1);
  assert.ok(Math.abs(411 * fitScale(411) - 390) < 1e-9);
  assert.equal(390 * fitScale(390), 390);
});

test('масштаб: неверные dp — ошибка, а не молчаливое NaN', () => {
  assert.throws(() => fitScale(0), /fit_dp_invalid/);
  assert.throws(() => fitScale(-5), /fit_dp_invalid/);
  assert.throws(() => fitScale(411, 0), /fit_dp_invalid/);
});

test('по умолчанию (fit=height) — прежнее поведение: обе картинки 1200 px', () => {
  const heights = layoutHeights({ mockup: { w: 390, h: 932 }, device: { w: 1080, h: 2400 } });
  assert.deepEqual(heights, { mockupH: ROW_HEIGHT_PX, deviceH: ROW_HEIGHT_PX });
  assert.deepEqual(layoutHeights({ fit: 'height', mockup: { w: 390, h: 932 }, device: null }), { mockupH: 1200, deviceH: 1200 });
});

test('fit=width: ширины картинок равны, высота кадра устройства считается по его пропорциям (1080×2400)', () => {
  const { mockupH, deviceH } = layoutHeights({ fit: 'width', mockup: { w: 390, h: 932 }, device: { w: 1080, h: 2400 } });
  const mockupWidth = (mockupH * 390) / 932; // ≈ 502.1 px
  const deviceWidth = (deviceH * 1080) / 2400;
  assert.equal(mockupH, 1200);
  assert.ok(Math.abs(deviceWidth - mockupWidth) < 1, `ширины должны совпасть: ${deviceWidth} vs ${mockupWidth}`);
  assert.ok(deviceH < 1200, 'кадр устройства (уже, чем макет по пропорции) при равной ширине ниже 1200 px');
});

test('fit=width: результат не зависит от dp устройства (411 и 390 дают равные ширины)', () => {
  const base = { fit: 'width', mockup: { w: 390, h: 932 }, device: { w: 1080, h: 2400 } };
  assert.deepEqual(layoutHeights({ ...base, deviceDp: 411 }), layoutHeights({ ...base, deviceDp: 390 }));
});

test('fit=width без кадра устройства (--mockup-only) и неизвестный режим', () => {
  assert.deepEqual(layoutHeights({ fit: 'width', mockup: { w: 390, h: 932 }, device: null }), { mockupH: 1200, deviceH: 1200 });
  assert.throws(() => layoutHeights({ fit: 'cover', mockup: { w: 390, h: 932 }, device: null }), /fit_unknown/);
});

test('pngSize читает ширину и высоту из IHDR; не-PNG — ошибка', () => {
  assert.deepEqual(pngSize(PNG_1X1), { w: 1, h: 1 });
  assert.throws(() => pngSize(Buffer.from('not a png at all, definitely not')), /png_expected/);
});
