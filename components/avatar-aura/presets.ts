import type { AuraPreset } from './types';

export const AURA_LAB_PRESETS = [
  {
    id: 'prism-oracle',
    nameRu: 'Призматический оракул',
    descriptionRu: 'Грани света и спокойный спектральный фокус.',
    colors: ['#82F5FF', '#9585FF', '#FFB1EC'],
    staticPhase: 0,
    motion: { outerDegrees: 2.2, innerDegrees: -3.5, outerScale: 1.024 },
  },
  {
    id: 'neon-lotus',
    nameRu: 'Неоновый лотос',
    descriptionRu: 'Симметрия лепестков вокруг живого неона.',
    colors: ['#FF79D5', '#955CFF', '#78F5FF'],
    staticPhase: 1,
    motion: { outerDegrees: -1.5, innerDegrees: 4.6, outerScale: 1.035 },
  },
  {
    id: 'chronosigil',
    nameRu: 'Хроносигил',
    descriptionRu: 'Точный знак времени с тёплым электрическим центром.',
    colors: ['#FFC96E', '#FF7F9F', '#7D8CFF'],
    staticPhase: 0,
    motion: { outerDegrees: 1.1, innerDegrees: -5.2, outerScale: 1.018 },
  },
  {
    id: 'velvet-eclipse',
    nameRu: 'Бархатное затмение',
    descriptionRu: 'Тихая орбита в глубоком фиолетовом бархате.',
    colors: ['#E4A1FF', '#8B5CDE', '#FF9A9A'],
    staticPhase: 1,
    motion: { outerDegrees: -2.8, innerDegrees: 2.1, outerScale: 1.03 },
  },
  {
    id: 'jade-cathedral',
    nameRu: 'Нефритовый собор',
    descriptionRu: 'Световые арки и собранная зелёная геометрия.',
    colors: ['#9CF9CF', '#2AD69B', '#8BE7FF'],
    staticPhase: 0,
    motion: { outerDegrees: 1.7, innerDegrees: -3.1, outerScale: 1.022 },
  },
] as const satisfies readonly AuraPreset[];

export const AURA_LAB_PRESET_BY_ID: Readonly<Record<string, AuraPreset>> = Object.freeze(
  Object.fromEntries(AURA_LAB_PRESETS.map((preset) => [preset.id, preset])),
);
