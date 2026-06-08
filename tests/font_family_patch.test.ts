/**
 * Тест глобального фикса шрифта (app/font_family_patch.ts).
 * Проверяем:
 *  1) interFamilyForWeight — маппинг весов в начертания Inter
 *  2) installInterFontPatch — реально оборачивает Text.render, инжектит fontFamily
 *  3) не переопределяет fontFamily, если он уже задан автором (иконки/эмодзи)
 *  4) идемпотентность (повторный вызов — no-op)
 */

import { createElement, isValidElement } from 'react';

// Локальный мок react-native с настоящим Text.render — чтобы прогнать патч целиком.
// Базовый render просто возвращает <span>-подобный элемент с теми же props.
jest.mock('react-native', () => {
  const React = require('react');
  const Text: any = {};
  Text.render = (props: any) => React.createElement('RNText', props);
  return { Text };
});

// typography.ts грузит .ttf через require() — в node-окружении это падает.
// Мокаем только константу имени семейства, ассеты не нужны.
jest.mock('../app/typography', () => ({ APP_FONT_FAMILY: 'Inter' }));

import { interFamilyForWeight, installInterFontPatch } from '../app/font_family_patch';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Text } = require('react-native') as { Text: { render: (props: any) => any } };

/** Достаёт fontFamily из (возможно вложенного) style итогового элемента. */
function familyOf(el: any): string | undefined {
  const style = el?.props?.style;
  const flat = Array.isArray(style) ? style : [style];
  let fam: string | undefined;
  for (const s of flat) {
    if (s && typeof s === 'object' && typeof s.fontFamily === 'string') fam = s.fontFamily;
  }
  return fam;
}

describe('interFamilyForWeight', () => {
  it('900 -> Inter-Black', () => {
    expect(interFamilyForWeight('900')).toBe('Inter-Black');
  });

  it('700 / 800 / bold -> Inter-Bold', () => {
    expect(interFamilyForWeight('700')).toBe('Inter-Bold');
    expect(interFamilyForWeight('800')).toBe('Inter-Bold');
    expect(interFamilyForWeight('bold')).toBe('Inter-Bold');
  });

  it('500 / 600 -> Inter-SemiBold', () => {
    expect(interFamilyForWeight('500')).toBe('Inter-SemiBold');
    expect(interFamilyForWeight('600')).toBe('Inter-SemiBold');
  });

  it('400 / normal / undefined -> Inter (Regular)', () => {
    expect(interFamilyForWeight('400')).toBe('Inter');
    expect(interFamilyForWeight('normal')).toBe('Inter');
    expect(interFamilyForWeight(undefined)).toBe('Inter');
  });
});

describe('installInterFontPatch', () => {
  beforeAll(() => {
    installInterFontPatch();
  });

  it('инжектит Inter-Bold для fontWeight 700', () => {
    const el = Text.render({ style: { fontWeight: '700', fontSize: 18 } });
    expect(isValidElement(el)).toBe(true);
    expect(familyOf(el)).toBe('Inter-Bold');
  });

  it('инжектит Inter-Black для fontWeight 900', () => {
    const el = Text.render({ style: { fontWeight: '900' } });
    expect(familyOf(el)).toBe('Inter-Black');
  });

  it('инжектит Inter (Regular) когда вес не задан', () => {
    const el = Text.render({ style: { fontSize: 14 } });
    expect(familyOf(el)).toBe('Inter');
  });

  it('обрабатывает вложенный массив стилей и берёт последний вес', () => {
    const el = Text.render({ style: [{ fontSize: 12 }, { fontWeight: '600' }] });
    expect(familyOf(el)).toBe('Inter-SemiBold');
  });

  it('НЕ переопределяет fontFamily, если он уже задан автором (иконки)', () => {
    const el = Text.render({ style: { fontFamily: 'Ionicons', fontSize: 20 } });
    // патч не должен подменить Ionicons на Inter
    expect(familyOf(el)).toBe('Ionicons');
  });

  it('работает без style (инжектит Regular)', () => {
    const el = Text.render({ children: 'hi' });
    expect(familyOf(el)).toBe('Inter');
  });

  it('повторный install — идемпотентен (render не оборачивается дважды)', () => {
    const renderRef = Text.render;
    installInterFontPatch();
    expect(Text.render).toBe(renderRef);
  });
});
