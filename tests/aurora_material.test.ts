// Материал «Аврора» со сценой «Рассвет» (слово владельца 11.11: «точно как на макетах, 1 в 1»).
// Числа ниже СНЯТЫ с утверждённого макета docs/work/mockups/home-luxe-2026-11-11/aurora_rassvet.html (значения его переменных оформления
// при тех же ползунках) — сторож проверяет, что код приложения даёт ровно те же цвета, без допуска.
import { auroraMaterial, auroraMaterialForTheme } from '../constants/aurora_material';

jest.mock('../constants/theme_sliders_flag', () => ({ THEME_SLIDERS_V1_ENABLED: true }));
jest.mock('../constants/aurora_material_flag', () => ({ AURORA_MATERIAL_ENABLED: true }));

type Ref = Readonly<{
  bgTop: string; bg: string; bgBottom: string; control: string; secondary: string | null; cardFrom: string; cardTo: string; bgGlow1: string; bgGlow2: string;
  ctaFrom: string; ctaTo: string; ctaInk: string; chipFrom: string; chipTo: string; shadow: string; frostTop: string; frostMid: string; frostBottom: string;
  frostGlow1: string; frostGlow2: string; dayFrom: string; dayTo: string; dayInk: string; dayGlow: string; sceneTop: string; ink: string; inkShadow: string;
}>;

const MOCKUP: Readonly<Record<string, Ref>> = {
  'dark:250:35': { bgTop: '#00000A', bg: '#000007', bgBottom: '#000008', control: '#6A798A', secondary: '#CED9E5', cardFrom: '#5A5C71', cardTo: '#45515E', bgGlow1: 'rgba(63,44,92,0.09)', bgGlow2: 'rgba(0,56,69,0.09)',
    ctaFrom: '#ACE1F7', ctaTo: '#E9E2FF', ctaInk: '#051729', chipFrom: '#007497', chipTo: '#474383', shadow: 'rgba(0,0,2,0.95)', frostTop: 'rgba(135,127,170,0.96)', frostMid: 'rgba(113,110,142,0.96)', frostBottom: 'rgba(90,92,113,0.96)',
    frostGlow1: 'rgba(152,124,193,0.2)', frostGlow2: 'rgba(0,134,145,0.16)', dayFrom: '#E1CEF9', dayTo: '#BBB6EE', dayInk: '#17182E', dayGlow: 'rgba(187,182,238,0.5)', sceneTop: '#003E57', ink: '#03101F', inkShadow: 'rgba(3,16,31,0.8)' },
  'dark:300:100': { bgTop: '#05001F', bg: '#030014', bgBottom: '#040012', control: '#7C7191', secondary: '#DAD3E9', cardFrom: '#6E546B', cardTo: '#534B63', bgGlow1: 'rgba(111,0,68,0.09)', bgGlow2: 'rgba(0,30,127,0.09)',
    ctaFrom: '#C5D2FF', ctaTo: '#FFD0F7', ctaInk: '#1D0736', chipFrom: '#4F50DE', chipTo: '#89007A', shadow: 'rgba(1,0,6,0.95)', frostTop: 'rgba(175,111,152,0.96)', frostMid: 'rgba(143,98,130,0.96)', frostBottom: 'rgba(110,84,107,0.96)',
    frostGlow1: 'rgba(228,68,153,0.2)', frostGlow2: 'rgba(0,112,234,0.16)', dayFrom: '#FFBCDB', dayTo: '#F49CDB', dayInk: '#2B0D29', dayGlow: 'rgba(244,156,219,0.5)', sceneTop: '#312D6E', ink: '#130823', inkShadow: 'rgba(19,8,35,0.8)' },
  'light:20:100': { bgTop: '#FFC7CB', bg: '#F7BBB9', bgBottom: '#FABFB6', control: '#F6D7D6', secondary: null, cardFrom: '#FFFFFF', cardTo: '#FFFAF7', bgGlow1: 'rgba(255,180,51,0.35)', bgGlow2: 'rgba(255,156,237,0.35)',
    ctaFrom: '#FFBCDA', ctaTo: '#FFDCA9', ctaInk: '#340005', chipFrom: '#BC076D', chipTo: '#9A0000', shadow: 'rgba(133,18,36,0.34)', frostTop: 'rgba(178,122,69,0.96)', frostMid: 'rgba(217,189,162,0.96)', frostBottom: 'rgba(255,255,255,0.96)',
    frostGlow1: 'rgba(214,109,0,0.18)', frostGlow2: 'rgba(184,49,166,0.12)', dayFrom: '#FECE8C', dayTo: '#FCA864', dayInk: '#310E00', dayGlow: 'rgba(252,168,100,0.5)', sceneTop: '#621733', ink: '#220406', inkShadow: 'rgba(34,4,6,0.8)' },
  'dark:250:0': { bgTop: '#000000', bg: '#000000', bgBottom: '#000000', control: '#747474', secondary: '#D7D7D7', cardFrom: '#5B5B5B', cardTo: '#4D4D4D', bgGlow1: 'rgba(56,56,56,0.09)', bgGlow2: 'rgba(46,46,46,0.09)',
    ctaFrom: '#D7D7D7', ctaTo: '#E8E8E8', ctaInk: '#161616', chipFrom: '#696969', chipTo: '#4D4D4D', shadow: 'rgba(0,0,0,0.95)', frostTop: 'rgba(133,133,133,0.96)', frostMid: 'rgba(112,112,112,0.96)', frostBottom: 'rgba(91,91,91,0.96)',
    frostGlow1: 'rgba(140,140,140,0.2)', frostGlow2: 'rgba(116,116,116,0.16)', dayFrom: '#D7D7D7', dayTo: '#BEBEBE', dayInk: '#1B1B1B', dayGlow: 'rgba(190,190,190,0.5)', sceneTop: '#383838', ink: '#0F0F0F', inkShadow: 'rgba(15,15,15,0.8)' },
  'light:150:55': { bgTop: '#BFE6BD', bg: '#ADD9B5', bgBottom: '#AADEBF', control: '#D0E7D4', secondary: null, cardFrom: '#FFFFFF', cardTo: '#F6FEFC', bgGlow1: 'rgba(82,226,234,0.35)', bgGlow2: 'rgba(207,210,112,0.35)',
    ctaFrom: '#C8E3A1', ctaTo: '#ABF8F7', ctaInk: '#001D05', chipFrom: '#537700', chipTo: '#006456', shadow: 'rgba(7,87,38,0.34)', frostTop: 'rgba(26,149,146,0.96)', frostMid: 'rgba(141,202,201,0.96)', frostBottom: 'rgba(255,255,255,0.96)',
    frostGlow1: 'rgba(0,165,179,0.18)', frostGlow2: 'rgba(132,119,0,0.12)', dayFrom: '#8BE9F4', dayTo: '#54D5CB', dayInk: '#00231C', dayGlow: 'rgba(84,213,203,0.5)', sceneTop: '#214200', ink: '#001503', inkShadow: 'rgba(0,21,3,0.8)' },
};

const up = (v: string | null): string | null => (v === null ? null : v.startsWith('#') ? v.toUpperCase() : v);

describe('aurora_material: цвета приложения = цвета утверждённого макета', () => {
  for (const [key, ref] of Object.entries(MOCKUP)) {
    it(`${key}: все цвета совпадают с макетом`, () => {
      const [ap, H, S] = key.split(':');
      const m = auroraMaterial(Number(H), Number(S), ap as 'dark' | 'light');
      const got: Ref = {
        bgTop: m.bgTop, bg: m.bg, bgBottom: m.bgBottom, control: m.control, secondary: m.secondary, cardFrom: m.cardFrom, cardTo: m.cardTo, bgGlow1: m.bgGlow1, bgGlow2: m.bgGlow2,
        ctaFrom: m.ctaFrom, ctaTo: m.ctaTo, ctaInk: m.ctaInk, chipFrom: m.chipFrom, chipTo: m.chipTo, shadow: m.shadow, frostTop: m.frostTop, frostMid: m.frostMid, frostBottom: m.frostBottom,
        frostGlow1: m.frostGlow1, frostGlow2: m.frostGlow2, dayFrom: m.scene.dayFrom, dayTo: m.scene.dayTo, dayInk: m.scene.dayInk, dayGlow: m.scene.dayGlow, sceneTop: m.scene.top, ink: m.scene.ink, inkShadow: m.scene.inkShadow,
      };
      const norm = (o: Ref): Record<string, string | null> => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, up(v as string | null)]));
      expect(norm(got)).toEqual(norm(ref));
    });
  }
});

describe('aurora_material: стражи и поведение на краях', () => {
  const HUES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
  const SATS = [0, 10, 35, 60, 100];
  it('тёмное: плашка отделена от фона не меньше 2,4 к 1 при любых оттенке и насыщенности', () => {
    for (const H of HUES) for (const S of SATS) expect(auroraMaterial(H, S, 'dark').plateContrast).toBeGreaterThanOrEqual(2.4);
  });
  it('светлое: плашка отделена от фона не меньше 1,5 к 1 (потолок — светлота фона 0,845, на нём лежит тёмный текст)', () => {
    for (const H of HUES) for (const S of SATS) expect(auroraMaterial(H, S, 'light').plateContrast).toBeGreaterThanOrEqual(1.5);
  });
  it('сцена «Рассвет»: белые подписи читаются не хуже 4,6 к 1 при любых оттенке и насыщенности', () => {
    for (const H of HUES) for (const S of SATS) for (const ap of ['dark', 'light'] as const) expect(auroraMaterial(H, S, ap).scene.whiteContrast).toBeGreaterThanOrEqual(4.6);
  });
  it('насыщенность 0: всё чисто серое — ни жёлтого, ни зелёного (у каждого цвета три равных канала)', () => {
    const m = auroraMaterial(250, 0, 'dark');
    for (const hex of [m.bgTop, m.bg, m.bgBottom, m.cardFrom, m.cardTo, m.control, m.ctaFrom, m.ctaTo, m.chipFrom, m.chipTo, m.scene.top, m.scene.mid, m.scene.bottom, m.scene.sun]) {
      expect(hex.slice(1, 3)).toBe(hex.slice(3, 5));
      expect(hex.slice(3, 5)).toBe(hex.slice(5, 7));
    }
  });
  it('материал есть только у тем-ползунков; именная тема и мусор → null', () => {
    expect(auroraMaterialForTheme('tune:250:35', 'dark')).not.toBeNull();
    expect(auroraMaterialForTheme('graphite', 'dark')).toBeNull();
    expect(auroraMaterialForTheme(undefined, 'light')).toBeNull();
    expect(auroraMaterialForTheme('tune:250:35', 'dark')).toBe(auroraMaterialForTheme('tune:250:35', 'dark'));
  });
});
