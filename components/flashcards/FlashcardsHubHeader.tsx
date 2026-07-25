import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { Theme } from '../../constants/theme';

/**
 * Шапка раздела «Карточки» — заголовок + баланс монет (макет
 * flashcards-screens.html, экран A1, блок `.hub-top`).
 *
 * зачем: на боевом экране баланс монет НЕ показывался вообще — юзер не видел,
 * хватает ли ему на набор, пока не упрётся в пейвол. Макет ставит баланс прямо
 * в шапку раздела: решение «покупать или копить» принимается до тапа, а не после.
 *
 * Из макета дословно: заголовок 24px/900/-.5px, баланс 15px/800 с tabular-nums
 * (цифры не пляшут при смене суммы), капсула 999px, min-height 36px.
 * Обводки капсулы из макета НЕ переносим (§0.D) — держим тоном подложки.
 */

const COIN_ICON = require('../../assets/images/currency/coin_1.webp');

interface FlashcardsHubHeaderProps {
  title: string;
  /** Баланс монет пользователя. */
  balance: number;
  t: Theme;
}

function FlashcardsHubHeaderBase({ title, balance, t }: FlashcardsHubHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 10,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          minWidth: 0,
          color: t.textPrimary,
          fontSize: 24,
          fontWeight: '900',
          letterSpacing: -0.5,
        }}
      >
        {title}
      </Text>
      <View
        accessible
        accessibilityLabel={`Баланс: ${balance}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
          minHeight: 36,
          borderRadius: 999,
          // зачем: §0.D — капсула держится тоном подложки, без кромки.
          backgroundColor: t.bgSurface,
        }}
      >
        {/* Монета декоративная: сумма уже озвучена меткой на капсуле выше,
            вторая озвучка «картинка монета» только мешала бы скринридеру. */}
        <Image
          source={COIN_ICON}
          style={{ width: 18, height: 18 }}
          contentFit="contain"
          accessible={false}
        />
        <Text
          style={{
            color: t.textPrimary,
            fontSize: 15,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
          }}
        >
          {balance.toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

export default memo(FlashcardsHubHeaderBase);
