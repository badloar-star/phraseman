import type { ImageSourcePropType } from 'react-native';
import type { AvatarAuraDef } from '../constants/avatar_auras';
import type { SeasonAuraAsset } from './season_pass_track_config';
import { isCoreAvatarAuraArt } from '../constants/avatar_aura_core_art';
import { getAvatarAuraLayerUrl } from '../constants/avatar_aura_image_urls';

type ApprovedAuraMotion = NonNullable<AvatarAuraDef['motion']>;
type MotionRecipe = Omit<SeasonAuraAsset, 'baseSource' | 'flowSource' | 'particlesSource'>;

const MOTION_RECIPES: Readonly<Record<ApprovedAuraMotion, MotionRecipe>> = Object.freeze({
  calm: { pulseMs: 7600, baseSpinMs: 52000, flowSpinMs: 32000, particlesSpinMs: 23000, flowReverse: false, particlesReverse: true },
  nature: { pulseMs: 6400, baseSpinMs: 44000, flowSpinMs: 25000, particlesSpinMs: 18000, flowReverse: false, particlesReverse: true },
  tech: { pulseMs: 5600, baseSpinMs: 36000, flowSpinMs: 19000, particlesSpinMs: 13000, flowReverse: true, particlesReverse: false },
  mystic: { pulseMs: 6200, baseSpinMs: 47000, flowSpinMs: 22000, particlesSpinMs: 15000, flowReverse: false, particlesReverse: true },
  energy: { pulseMs: 4600, baseSpinMs: 30000, flowSpinMs: 15000, particlesSpinMs: 9500, flowReverse: false, particlesReverse: true },
  playful: { pulseMs: 5200, baseSpinMs: 34000, flowSpinMs: 18000, particlesSpinMs: 11000, flowReverse: true, particlesReverse: false },
  luxury: { pulseMs: 6800, baseSpinMs: 48000, flowSpinMs: 26000, particlesSpinMs: 17000, flowReverse: false, particlesReverse: true },
  dark: { pulseMs: 6000, baseSpinMs: 42000, flowSpinMs: 20000, particlesSpinMs: 14000, flowReverse: true, particlesReverse: false },
  plus: { pulseMs: 4800, baseSpinMs: 30000, flowSpinMs: 14000, particlesSpinMs: 9000, flowReverse: false, particlesReverse: true },
  pro: { pulseMs: 4000, baseSpinMs: 24000, flowSpinMs: 11000, particlesSpinMs: 7000, flowReverse: true, particlesReverse: false },
});

/**
 * Ауры подписки живут в бандле: их видят сразу после оплаты, когда сети может
 * не быть. Всё остальное стримится из Storage (см. avatar_aura_remote_art.ts).
 */
const CORE_AURA_LAYERS: Readonly<Record<string, readonly [ImageSourcePropType, ImageSourcePropType, ImageSourcePropType]>> = Object.freeze({
  'aura-plus': [
    require('../assets/images/avatar-auras/aura-plus/base.webp'),
    require('../assets/images/avatar-auras/aura-plus/flow.webp'),
    require('../assets/images/avatar-auras/aura-plus/accents.webp'),
  ],
  'aura-pro': [
    require('../assets/images/avatar-auras/aura-pro/base.webp'),
    require('../assets/images/avatar-auras/aura-pro/flow.webp'),
    require('../assets/images/avatar-auras/aura-pro/accents.webp'),
  ],
});

/**
 * Каталог одобренных аур: id → «характер» движения. Сами слои больше не
 * перечисляются здесь по одному — путь слоя однозначно выводится из id
 * (`<auraId>/<layer>.webp`), а источник выбирается в getApprovedAvatarAuraAsset:
 * ядро из бандла, остальное по URL из карты Storage.
 *
 * зачем именно так: 111 из 117 слоёв (2.4 МБ) больше не едут в нативный бинарь
 * (Фаза 4 «Бандл-диеты», решение владельца 2026-08-24), а каталог остался
 * единственной точкой правды о составе аур.
 */
const APPROVED_AVATAR_AURA_MOTION: Readonly<Record<string, ApprovedAuraMotion>> = Object.freeze({
  'aura-plus': 'plus',
  'aura-pro': 'pro',
  'aura-aurora': 'calm',
  'aura-ember': 'energy',
  'aura-mint': 'nature',
  'aura-violet': 'tech',
  'aura-coral': 'nature',
  'aura-prism': 'playful',
  'aura-lagoon': 'calm',
  'aura-sunset': 'mystic',
  'aura-still-halo': 'calm',
  'aura-moonline': 'calm',
  'aura-pearl-breath': 'calm',
  'aura-frost-petal': 'nature',
  'aura-storm-vine': 'nature',
  'aura-sunflower-pulse': 'nature',
  'aura-neon-circuit': 'tech',
  'aura-data-ring': 'tech',
  'aura-plasma-gear': 'tech',
  'aura-holo-scan': 'tech',
  'aura-lunar-sigil': 'mystic',
  'aura-solar-eclipse': 'mystic',
  'aura-star-choir': 'mystic',
  'aura-astral-eyes': 'mystic',
  'aura-magma-rift': 'energy',
  'aura-thunder-fang': 'energy',
  'aura-inferno-crown': 'energy',
  'aura-acid-surge': 'energy',
  'aura-bubble-pop': 'playful',
  'aura-pixel-party': 'playful',
  'aura-rainbow-loop': 'playful',
  'aura-gilded-laurel': 'luxury',
  'aura-diamond-orbit': 'luxury',
  'aura-velvet-gold': 'luxury',
  'aura-regal-wings': 'luxury',
  'aura-void-thorn': 'dark',
  'aura-blood-moon': 'dark',
  'aura-obsidian-smoke': 'dark',
  'aura-phantom-chain': 'dark',
});

/** Собранные ассеты кэшируем: объект стабилен по ссылке, memo не сбрасывается. */
const assetCache = new Map<string, SeasonAuraAsset | undefined>();

function buildAsset(auraId: string): SeasonAuraAsset | undefined {
  const motion = APPROVED_AVATAR_AURA_MOTION[auraId];
  if (!motion) return undefined;

  if (isCoreAvatarAuraArt(auraId)) {
    const layers = CORE_AURA_LAYERS[auraId];
    if (!layers) return undefined;
    return Object.freeze({
      baseSource: layers[0],
      flowSource: layers[1],
      particlesSource: layers[2],
      ...MOTION_RECIPES[motion],
    });
  }

  const base = getAvatarAuraLayerUrl(auraId, 'base');
  const flow = getAvatarAuraLayerUrl(auraId, 'flow');
  const accents = getAvatarAuraLayerUrl(auraId, 'accents');
  // Нет всех трёх слоёв в карте — ауры для рантайма не существует, и
  // AvatarAura тихо рисует свой градиентный ореол вместо кольца.
  if (!base || !flow || !accents) return undefined;

  return Object.freeze({
    baseSource: { uri: base },
    flowSource: { uri: flow },
    particlesSource: { uri: accents },
    ...MOTION_RECIPES[motion],
  });
}

export function getApprovedAvatarAuraAsset(auraId: string | null | undefined): SeasonAuraAsset | undefined {
  if (!auraId) return undefined;
  if (assetCache.has(auraId)) return assetCache.get(auraId);
  const asset = buildAsset(auraId);
  assetCache.set(auraId, asset);
  return asset;
}

/** Все id одобренных аур — для прогрева и сторожей. */
export function approvedAvatarAuraIds(): readonly string[] {
  return Object.keys(APPROVED_AVATAR_AURA_MOTION);
}
