import React, { memo, useRef } from 'react';
import { Animated, Image as RNImage, View } from 'react-native';
import { Image } from 'expo-image';
import { getAvatarByIndex } from '../constants/avatars';
import { coinRankRowForDisplay, isValidCoinRank } from '../app/coin_rank_table_v1';

const EXEMPT_COLOR_1 = '#273449'; // theme-exempt: заглушка аватара и подложка — тёмная плашка под изображением

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
  /** Монета ранга отрисована (expo-image onLoad) — экран снимает свою заглушку того же размера. */
  onCoinLoad?: () => void;
  /** Префикс журнала загрузки монеты (например «[PIK-IMG]»): время до onLoad, ранг, размер, откуда ассет. Без префикса — тихо. */
  loadTrace?: string;
}

/** Откуда пришёл ассет: http — Metro (дев-сборка), file/res/asset — из сборки. Только схема, без пути. */
function assetScheme(source: unknown): string {
  try {
    const uri = RNImage.resolveAssetSource(source as number)?.uri ?? '';
    const match = /^([a-z]+):/i.exec(uri);
    return match ? match[1].toLowerCase() : uri ? 'path' : 'none';
  } catch (error) {
    return `unresolved:${error instanceof Error ? error.message.slice(0, 40) : 'unknown'}`; // guard-ok: схема не определилась — причина в журнале
  }
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
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: size / 2, backgroundColor: EXEMPT_COLOR_1 }} />
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

function AvatarView({ avatar, size = 44, style, coinRank, onCoinLoad, loadTrace }: Props) {
  const mountedAtRef = useRef(Date.now()); // отсчёт журнала загрузки монеты — от монтирования, а не от последней перерисовки
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
    // зачем (Макеты df9ecf2c3, «сперва логи»): на «Пике» монеты пустые до ~9 с после данных — журнал покажет время до onLoad и откуда ассет (Metro или сборка).
    const traceStartedAt = mountedAtRef.current;
    return (
      <View style={[{ width: size, height: size }, style]}>
        <Image
          testID="avatar-coin-rank"
          source={coinRow.source}
          style={{ width: size, height: size }}
          contentFit="contain"
          accessibilityLabel={coinRow.levelTitle}
          onLoad={onCoinLoad || loadTrace ? () => {
            if (loadTrace) console.log(loadTrace, JSON.stringify({ stage: 'coin:load', rank: coinRank, size: Math.round(size), ms: Date.now() - traceStartedAt, scheme: assetScheme(coinRow.source) })); // guard-ok: замер загрузки монеты, без идентификаторов
            onCoinLoad?.();
          } : undefined}
          onError={loadTrace ? (event) => {
            console.warn(loadTrace, JSON.stringify({ stage: 'coin:error', rank: coinRank, ms: Date.now() - traceStartedAt, scheme: assetScheme(coinRow.source), error: String(event?.error ?? '').slice(0, 80) })); // guard-ok: ошибка загрузки — причина в журнале, заглушка остаётся
          } : undefined}
        />
      </View>
    );
  }

  const content: React.ReactNode = avatarImage
    ? <AvatarImageWithFallback source={avatarImage} size={size} />
    : <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#273449' }} />; // theme-exempt: заглушка аватара и подложка — тёмная плашка под изображением

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {content}
    </View>
  );
}

export default memo(AvatarView);
