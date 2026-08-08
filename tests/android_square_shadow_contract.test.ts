/**
 * Контракт: на Android не должно быть светлых КВАДРАТОВ вокруг скруглённых
 * элементов.
 *
 * Причина класса бага: `elevation` на Android рисует не blur-тень, а системный
 * outline. Форму он берёт из НЕПРОЗРАЧНОГО фона; если фон полупрозрачный или
 * его рисует дочерний слой (LinearGradient/Image), Android заливает
 * прямоугольник по bounding box — отсюда квадрат вокруг круглой плитки.
 *
 * зачем: владелец сообщил, что квадраты видны почти везде на Android, а на
 * iPhone их нет. Этот тест закрывает класс бага, чтобы он не вернулся.
 */
import { isOpaqueColor } from '../constants/androidGlow';

describe('isOpaqueColor — из какого фона Android выведет скруглённый outline', () => {
  it('считает непрозрачными обычные HEX и именованные цвета', () => {
    expect(isOpaqueColor('#FFFFFF')).toBe(true);
    expect(isOpaqueColor('#000')).toBe(true);
    expect(isOpaqueColor('#18233F')).toBe(true);
    expect(isOpaqueColor('white')).toBe(true);
    expect(isOpaqueColor('#FFFFFFFF')).toBe(true);
  });

  it('считает ПРОЗРАЧНЫМИ rgba с alpha < 1 — именно они дают квадрат', () => {
    expect(isOpaqueColor('rgba(255,255,255,0.08)')).toBe(false);
    expect(isOpaqueColor('rgba(30, 30, 36, 0.92)')).toBe(false);
    expect(isOpaqueColor('rgba(8,10,16,0.94)')).toBe(false);
  });

  it('считает непрозрачным rgba с alpha = 1', () => {
    expect(isOpaqueColor('rgba(0,0,0,1)')).toBe(true);
  });

  it('разбирает 8-значный HEX с alpha', () => {
    expect(isOpaqueColor('#B7C8FF57')).toBe(false);
    expect(isOpaqueColor('#B7C8FFff')).toBe(true);
  });

  it('трактует отсутствие фона и transparent как прозрачные', () => {
    expect(isOpaqueColor(undefined)).toBe(false);
    expect(isOpaqueColor('transparent')).toBe(false);
  });
});
