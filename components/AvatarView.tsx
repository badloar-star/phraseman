import React, { memo } from 'react';
import { Animated, View } from 'react-native';
import { Image } from 'expo-image';
import LevelBadge from './LevelBadge';
import { getAvatarByIndex } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import CustomAvatarBadge from './CustomAvatarBadge';
import { parseCustomAvatarValue } from '../constants/custom_avatars';
import AvatarAura from './AvatarAura';
import { getLevelAvatarMaterial } from '../constants/avatar_level_materials';
import type { LevelAvatarMaterial } from '../constants/avatar_level_materials';
import LevelAvatarMaterialOverlay from './LevelAvatarMaterialOverlay';
import { AvatarDNAStage } from './avatar-dna/AvatarDNAStage';
import type { AvatarDNA, AvatarV2Projection } from '../modules/avatar-dna/contracts';

interface Props {
  avatar?: string | null;
  avatarV2?: AvatarV2Projection | null;
  localDNA?: AvatarDNA | null;
  totalXP?: number;
  level?: number;
  size?: number;
  style?: any;
  auraId?: string | null;
  /** Optional outer aura diameter for compact catalog previews. */
  auraVisualSize?: number;
  /**
   * false → аура статична (без бесконечной анимации). Передавай в прокручиваемых
   * списках (лента/лиги/арена), где одновременно видно много аватарок, иначе каждая
   * крутит свой loop и греет телефон при скролле.
   */
  animateAura?: boolean;
  ownerActive?: boolean;
  /**
   * Внешний прогресс анимации ауры — чтобы несколько аватарок на экране
   * двигались одним общим циклом, а не каждая своим таймером.
   * зачем: восстановлено из работы 2026-08-30/31 (клуб, полёт наград).
   */
  auraMotionProgress?: Animated.Value;
}

function AvatarImageWithFallback({
  source,
  size,
  fallbackLevel,
  overlayLevel,
  tint,
  material,
}: {
  source: any;
  size: number;
  fallbackLevel: number;
  overlayLevel: number;
  tint?: readonly [string, string];
  material?: LevelAvatarMaterial;
}) {
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setLoaded(false);
  }, [source]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {!loaded ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
          <LevelBadge level={fallbackLevel} size={size} centeredNumber />
        </View>
      ) : null}
      <Image
        source={source}
        style={{ width: size, height: size }}
        contentFit="contain"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(false)}
      />
      <LevelAvatarMaterialOverlay size={size} level={overlayLevel} tint={tint} material={material} />
    </View>
  );
}

function AvatarView({ avatar, avatarV2, localDNA, totalXP, level, size = 44, style, auraId, auraVisualSize, animateAura = true, ownerActive, auraMotionProgress }: Props) {
  // Уровень известен, только если его передали явно или дали опыт. Часть
  // вызывающих (соперник в арене, строка друга) даёт ТОЛЬКО картинку — там
  // уровня нет, и выдумывать его нельзя.
  const knownLevel = level ?? (totalXP !== undefined ? getLevelFromXP(totalXP) : null);
  const resolvedLevel = knownLevel ?? 1;
  const customAvatar = parseCustomAvatarValue(avatar);
  const avatarIndex = avatar && /^\d+$/.test(avatar) ? parseInt(avatar) : resolvedLevel;
  const avatarDef = getAvatarByIndex(avatarIndex);
  const avatarImage = avatarDef?.image;

  // ЦИФРА НА ЗНАЧКЕ = УРОВЕНЬ ЧЕЛОВЕКА, а не индекс картинки.
  //
  // зачем (жалоба «Издевательство», 2026-09-01): человек видел на Главной
  // шестигранник с числом 50 и надпись «Уровень 13» рядом. Проверка его данных
  // подтвердила: user_avatar = "50" (легендарная аватарка, выданная как
  // VIP-награда), а настоящий уровень по опыту — 12. Номер косметики выдавал
  // себя за уровень.
  //
  // Когда уровень ИЗВЕСТЕН — показываем только его: он не зависит от того,
  // какую аватарку человеку выдали. Когда неизвестен (соперник в арене — там
  // передают одну картинку) — прежнее поведение, индекс: это лучше, чем
  // нарисовать всем «1». Сама картинка всегда берётся по avatarIndex, награду
  // не отбираем.
  const fallbackLevel = knownLevel ?? avatarIndex;
  const material = getLevelAvatarMaterial(avatarIndex);
  const portraitUrl = avatarV2?.state === 'ready' ? avatarV2.portraitUrl : null;
  const [failedPortraitUrl, setFailedPortraitUrl] = React.useState<string | null>(null);

  let content: React.ReactNode;
  if (portraitUrl && portraitUrl !== failedPortraitUrl) {
    content = (
      <Image
        testID="avatar-v2-image"
        source={{ uri: portraitUrl }}
        style={{ width: size, height: size }}
        contentFit="contain"
        cachePolicy="memory-disk"
        accessibilityLabel="Avatar"
        onError={() => setFailedPortraitUrl(portraitUrl)}
      />
    );
  } else if (localDNA) {
    content = <AvatarDNAStage dna={localDNA} camera="portrait" size={size} />;
  } else if (customAvatar) {
    content = <CustomAvatarBadge value={avatar} size={size} />;
  } else {
    content = avatarImage
      ? <AvatarImageWithFallback source={avatarImage} size={size} fallbackLevel={fallbackLevel} overlayLevel={avatarIndex} tint={avatarDef?.tint} material={material} />
      : <LevelBadge level={fallbackLevel} size={size} />;
  }

  return (
    <AvatarAura auraId={auraId} size={size} visualSize={auraVisualSize} style={style} animate={animateAura} ownerActive={ownerActive} motionProgress={auraMotionProgress}>
      {content}
    </AvatarAura>
  );
}

export default memo(AvatarView);
