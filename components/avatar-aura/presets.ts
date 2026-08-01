import type { AuraPreset } from './types';

export const AURA_LAB_PRESETS = [
  {
    id: 'opal-nimbus',
    nameRu: 'Опаловый нимб',
    descriptionRu: 'Живой холодный свет мягко дышит вокруг аватара.',
    colors: ['#D6F7FF', '#68C9FF', '#A9A5FF'],
    staticPhase: 0,
    material: 'nimbus',
    durationMs: 7600,
    motion: { outerDegrees: 120, innerDegrees: -72, outerScale: 1.055 },
  },
  {
    id: 'solar-crown',
    nameRu: 'Солнечная корона',
    descriptionRu: 'Шампань и мягкое золото дают дорогой спокойный пульс.',
    colors: ['#FFF3C2', '#E7B64D', '#FF9C71'],
    staticPhase: 1,
    material: 'crown',
    durationMs: 8800,
    motion: { outerDegrees: 64, innerDegrees: -38, outerScale: 1.06 },
  },
  {
    id: 'velvet-bloom',
    nameRu: 'Фиолетовый бархат',
    descriptionRu: 'Глубокий аметистовый свет раскрывается слоями.',
    colors: ['#F1C7FF', '#A778FF', '#6C67DD'],
    staticPhase: 0,
    material: 'velvet',
    durationMs: 8200,
    motion: { outerDegrees: 84, innerDegrees: -120, outerScale: 1.052 },
  },
  {
    id: 'jade-tide',
    nameRu: 'Нефритовый прилив',
    descriptionRu: 'Изумрудные капли собираются в прозрачную живую волну.',
    colors: ['#C7FFE8', '#38D2A1', '#55CBE7'],
    staticPhase: 1,
    material: 'jade',
    durationMs: 9200,
    motion: { outerDegrees: 140, innerDegrees: -94, outerScale: 1.05 },
  },
  {
    id: 'rose-satin',
    nameRu: 'Розовый сатин',
    descriptionRu: 'Мягкий розовый свет скользит по аватару как шёлк.',
    colors: ['#FFE1EF', '#F788B7', '#A98AFF'],
    staticPhase: 0,
    material: 'satin',
    durationMs: 7800,
    motion: { outerDegrees: 108, innerDegrees: -60, outerScale: 1.045 },
  },
] as const satisfies readonly AuraPreset[];

export const AURA_LAB_PRESET_BY_ID: Readonly<Record<string, AuraPreset>> = Object.freeze(
  Object.fromEntries(AURA_LAB_PRESETS.map((preset) => [preset.id, preset])),
);
