export type AvatarTextureId =
  | 'grain'
  | 'clay'
  | 'linen'
  | 'bubbles'
  | 'satin'
  | 'droplets'
  | 'mesh'
  | 'silk'
  | 'sprinkles'
  | 'paper'
  | 'waves'
  | 'terrazzo'
  | 'prism'
  | 'stripes'
  | 'confetti'
  | 'rain'
  | 'topo'
  | 'fiber'
  | 'frost'
  | 'mosaic'
  | 'enamel'
  | 'marble'
  | 'glass'
  | 'rays'
  | 'pearl'
  | 'facets'
  | 'chrome'
  | 'leaf'
  | 'moonstone'
  | 'copper'
  | 'brushed'
  | 'opal'
  | 'aurora'
  | 'carbon'
  | 'velvet'
  | 'mercury'
  | 'circuit'
  | 'crystal'
  | 'foil'
  | 'obsidian'
  | 'blackgold'
  | 'plasma'
  | 'platinum'
  | 'jade'
  | 'titanium'
  | 'pearlwave'
  | 'nebula'
  | 'relic'
  | 'iceprism'
  | 'volcanic'
  | 'auroraglass'
  | 'stardust'
  | 'diamondnebula'
  | 'celestial'
  | 'quantum'
  | 'eclipse'
  | 'royalopal'
  | 'cosmicemerald'
  | 'supernova'
  | 'prime';

export interface LevelAvatarMaterial {
  colors: readonly [string, string, string];
  accent: string;
  texture: AvatarTextureId;
}

export const LEVEL_AVATAR_MATERIALS: readonly LevelAvatarMaterial[] = [
  { colors: ['#69E7D1', '#BAF7D5', '#4BB5E8'], accent: '#9CF6C8', texture: 'grain' },
  { colors: ['#FF8E9E', '#FFC079', '#B66CFF'], accent: '#FFC07A', texture: 'clay' },
  { colors: ['#65AEFA', '#BFE0FF', '#4BD5B0'], accent: '#A7D8FF', texture: 'linen' },
  { colors: ['#B693FF', '#F3B1FF', '#6EE7F9'], accent: '#D6B4FF', texture: 'bubbles' },
  { colors: ['#F7A423', '#FFF083', '#FF7E9C'], accent: '#FFE174', texture: 'satin' },
  { colors: ['#25D7EF', '#ADFFF1', '#77D947'], accent: '#8FF4FF', texture: 'droplets' },
  { colors: ['#FF9A4D', '#FFB2BD', '#9BEFAB'], accent: '#FFC18F', texture: 'mesh' },
  { colors: ['#C78AFF', '#F090FF', '#A6CFFF'], accent: '#EBB4FF', texture: 'silk' },
  { colors: ['#15C4AD', '#66F2DF', '#FFE45D'], accent: '#74F2DF', texture: 'sprinkles' },
  { colors: ['#F986C1', '#FFBDDF', '#FFE47C'], accent: '#FFB5DC', texture: 'paper' },
  { colors: ['#0EA5E9', '#6EE7F9', '#F4DF4E'], accent: '#73E9FF', texture: 'waves' },
  { colors: ['#84CC16', '#CBFF66', '#50D5FF'], accent: '#C9FF67', texture: 'terrazzo' },
  { colors: ['#8B5CF6', '#29D6ED', '#F472B6'], accent: '#B49AFF', texture: 'prism' },
  { colors: ['#F97316', '#FACC15', '#EF4444'], accent: '#FFD56F', texture: 'stripes' },
  { colors: ['#DB2777', '#FB7185', '#60A5FA'], accent: '#FF93BD', texture: 'confetti' },
  { colors: ['#2563EB', '#38BDF8', '#4ADE80'], accent: '#8ED8FF', texture: 'rain' },
  { colors: ['#16A34A', '#86EFAC', '#14B8A6'], accent: '#98F1A7', texture: 'topo' },
  { colors: ['#E11D48', '#FB7185', '#9333EA'], accent: '#FF93AA', texture: 'fiber' },
  { colors: ['#06B6D4', '#A5F3FC', '#818CF8'], accent: '#9DF8FF', texture: 'frost' },
  { colors: ['#7C3AED', '#C4A5FF', '#F59E0B'], accent: '#B79CFF', texture: 'mosaic' },
  { colors: ['#0891B2', '#7DEFFF', '#F8FAFC'], accent: '#8CEFFF', texture: 'enamel' },
  { colors: ['#047857', '#45D89F', '#FCD34D'], accent: '#8CF0BF', texture: 'marble' },
  { colors: ['#BE123C', '#FB7185', '#FECDD3'], accent: '#FF9AA9', texture: 'glass' },
  { colors: ['#1D4ED8', '#60A5FA', '#DBEAFE'], accent: '#9FC7FF', texture: 'rays' },
  { colors: ['#F8FAFC', '#F9A8D4', '#BFDBFE'], accent: '#FFF2BD', texture: 'pearl' },
  { colors: ['#CA8A04', '#FACC15', '#FB923C'], accent: '#FFE475', texture: 'facets' },
  { colors: ['#9333EA', '#E879F9', '#22D3EE'], accent: '#E3A7FF', texture: 'chrome' },
  { colors: ['#15803D', '#4ADE80', '#0E7490'], accent: '#8DF2A5', texture: 'leaf' },
  { colors: ['#CBD5E1', '#FFFFFF', '#A5B4FC'], accent: '#EDF4FF', texture: 'moonstone' },
  { colors: ['#B45309', '#F97316', '#334155'], accent: '#FFAF68', texture: 'copper' },
  { colors: ['#1E3A8A', '#3B82F6', '#94A3B8'], accent: '#8DB4FF', texture: 'brushed' },
  { colors: ['#7F1D1D', '#EF4444', '#FEF3C7'], accent: '#FFB25F', texture: 'opal' },
  { colors: ['#0F766E', '#22D3EE', '#F472B6'], accent: '#87F3FF', texture: 'aurora' },
  { colors: ['#111827', '#22C55E', '#06B6D4'], accent: '#66F29A', texture: 'carbon' },
  { colors: ['#581C87', '#7E22CE', '#FBBF24'], accent: '#D99CFF', texture: 'velvet' },
  { colors: ['#334155', '#CBD5E1', '#06B6D4'], accent: '#E6EEF8', texture: 'mercury' },
  { colors: ['#052E16', '#16A34A', '#FDE047'], accent: '#8DF6A6', texture: 'circuit' },
  { colors: ['#4C1D95', '#8B5CF6', '#F0ABFC'], accent: '#C7B3FF', texture: 'crystal' },
  { colors: ['#92400E', '#F59E0B', '#EF4444'], accent: '#FFE176', texture: 'foil' },
  { colors: ['#020617', '#1E3A8A', '#38BDF8'], accent: '#72CFFF', texture: 'obsidian' },
  { colors: ['#0C0A09', '#78350F', '#F59E0B'], accent: '#F5C15B', texture: 'blackgold' },
  { colors: ['#312E81', '#DB2777', '#22D3EE'], accent: '#FF94CB', texture: 'plasma' },
  { colors: ['#475569', '#E2E8F0', '#A78BFA'], accent: '#F6FBFF', texture: 'platinum' },
  { colors: ['#022C22', '#047857', '#FCD34D'], accent: '#88EFBD', texture: 'jade' },
  { colors: ['#831843', '#F472B6', '#64748B'], accent: '#FFABD4', texture: 'titanium' },
  { colors: ['#064E3B', '#0E7490', '#F8FAFC'], accent: '#B5F7E3', texture: 'pearlwave' },
  { colors: ['#1E1B4B', '#7C3AED', '#22D3EE'], accent: '#C197FF', texture: 'nebula' },
  { colors: ['#451A03', '#B45309', '#FFF7ED'], accent: '#FFE070', texture: 'relic' },
  { colors: ['#0F172A', '#67E8F9', '#C084FC'], accent: '#A8F6FF', texture: 'iceprism' },
  { colors: ['#09090B', '#991B1B', '#FBBF24'], accent: '#FF9D55', texture: 'volcanic' },
  { colors: ['#020617', '#14B8A6', '#F472B6'], accent: '#A7FFF0', texture: 'auroraglass' },
  { colors: ['#030712', '#111827', '#F59E0B'], accent: '#FFD36D', texture: 'stardust' },
  { colors: ['#111827', '#38BDF8', '#F0ABFC'], accent: '#D7F4FF', texture: 'diamondnebula' },
  { colors: ['#1F2937', '#94A3B8', '#FDE68A'], accent: '#F7FBFF', texture: 'celestial' },
  { colors: ['#020617', '#2563EB', '#A3E635'], accent: '#74EAFF', texture: 'quantum' },
  { colors: ['#050505', '#713F12', '#FFF7ED'], accent: '#FFD06A', texture: 'eclipse' },
  { colors: ['#2E1065', '#8B5CF6', '#FEF08A'], accent: '#CBB5FF', texture: 'royalopal' },
  { colors: ['#001B16', '#047857', '#F0FDF4'], accent: '#88F5BF', texture: 'cosmicemerald' },
  { colors: ['#1F040B', '#BE123C', '#FBBF24'], accent: '#FF97AA', texture: 'supernova' },
  { colors: ['#030303', '#312E81', '#F59E0B'], accent: '#FFF0A3', texture: 'prime' },
];

export function getLevelAvatarMaterial(level: number): LevelAvatarMaterial | undefined {
  if (!Number.isFinite(level)) return undefined;
  const index = Math.max(1, Math.min(LEVEL_AVATAR_MATERIALS.length, Math.round(level))) - 1;
  return LEVEL_AVATAR_MATERIALS[index];
}
