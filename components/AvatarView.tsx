import React, { memo } from 'react';
import { Animated, View } from 'react-native';
import { Image } from 'expo-image';
import { getAvatarByIndex } from '../constants/avatars';
import { coinRankRowForDisplay, isValidCoinRank } from '../app/coin_rank_table_v1';

interface Props {
  avatar?: string | null;
  // зачем: Q5 (координатор 01.10) — «Студия персонажа» (Avatar DNA) и портрет V2
  // удалены вместе с их пропсами; аватар = монета ранга или старая картинка.
  size?: number;
  style?: any;
  /**
   * @deprecated D108 — ауры удалены, пропсы ниже игнорируются. Оставлены только
   * чтобы не ломать вызовы в экранах сессии «Дизайн» (Главная, Друзья и др.);
   * убрать вместе с последним вызовом.
   */
  auraId?: string | null;
  /** @deprecated D108 — игнорируется. */
  auraVisualSize?: number;
  /** @deprecated D108 — игнорируется. */
  animateAura?: boolean;
  /** @deprecated D108 — игнорируется. */
  ownerActive?: boolean;
  /** @deprecated D108 — игнорируется. */
  auraMotionProgress?: Animated.Value;
  /**
   * Ранг монеты (0…19). Задан → аватар = монета этого ранга, без ауры и старой картинки
   * (D03/D61: монета и есть новый аватар). Передавай только там, где ранг известен
   * (свой аватар — useMyCoinRank); null/undefined → прежний показ.
   */
  coinRank?: number | null;
}

function AvatarImageWithFallback({
  source,
  size,
}: {
  source: any;
  size: number;
}) {
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setLoaded(false);
  }, [source]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {!loaded ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: size / 2, backgroundColor: '#273449' }} />
      ) : null}
      <Image
        source={source}
        style={{ width: size, height: size }}
        contentFit="contain"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(false)}
      />
    </View>
  );
}

function AvatarView({ avatar, size = 44, style, coinRank }: Props) {
  // зачем (PM-076, D62 п.2): параллельный путь к старому показу — если ранг монеты
  // известен, рисуем монету ранга из единой таблицы. Старые ветки ниже не трогаем:
  // Чужие аватары (друзья и арена) ранга не несут и показываются как раньше.
  const coinRow = isValidCoinRank(coinRank) ? coinRankRowForDisplay(coinRank) : null;
  // зачем: D108 — купленные аватары («custom:…») и ауры удалены. Такое значение
  // больше не рисуется: показываем базовый аватар (индекс 1) без ауры.
  // Числовой идентификатор — только ключ старого ассета, не уровень игрока.
  const avatarIndex = avatar && /^\d+$/.test(avatar) ? parseInt(avatar) : 1;
  const avatarDef = getAvatarByIndex(avatarIndex);
  const avatarImage = avatarDef?.image;

  if (coinRow) {
    return (
      <View style={[{ width: size, height: size }, style]}>
        <Image
          testID="avatar-coin-rank"
          source={coinRow.source}
          style={{ width: size, height: size }}
          contentFit="contain"
          accessibilityLabel={coinRow.levelTitle}
        />
      </View>
    );
  }

  const content: React.ReactNode = avatarImage
    ? <AvatarImageWithFallback source={avatarImage} size={size} />
    : <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#273449' }} />;

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {content}
    </View>
  );
}

export default memo(AvatarView);
