// MyRankCoin.tsx — монета ранга текущего пользователя (замена фиксированной базовой монеты на балансах, в итогах, праздничных окнах и в полёте наград).
// зачем (слово владельца 05.11: «монета абсолютно во всех местах обязана соответствовать рангу строго»): тот же источник, что у строки «Ты» в Пике — hooks/use_my_rank_coin.ts.
// Принимает те же свойства, что expo-image Image (стиль, testID, contentFit …); размер для выбора картинки берётся из `size` или ширины стиля.
import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Image, type ImageProps } from 'expo-image';
import { MY_RANK_COIN_DEFAULT_SIZE, useMyRankCoinSource } from '../../hooks/use_my_rank_coin';

type Props = Omit<ImageProps, 'source'> & Readonly<{ size?: number }>;

function sizeOfStyle(style: ImageProps['style']): number | null {
  const flat = StyleSheet.flatten(style as never) as { width?: unknown } | undefined;
  return typeof flat?.width === 'number' ? flat.width : null;
}

function MyRankCoinImpl({ size, style, ...rest }: Props): React.JSX.Element {
  const source = useMyRankCoinSource(size ?? sizeOfStyle(style) ?? MY_RANK_COIN_DEFAULT_SIZE);
  return <Image {...rest} style={style} source={source} />;
}

export const MyRankCoin = memo(MyRankCoinImpl);
export default MyRankCoin;
