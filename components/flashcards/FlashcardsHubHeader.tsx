import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { FlowText } from '../text-integrity/FlowText';
import type { Theme, ThemeMode } from '../../constants/theme';
import { pearlIconForTheme } from '../../app/coin_icons';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';

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

interface FlashcardsHubHeaderProps {
  title: string;
  /** Баланс монет пользователя. */
  balance: number;
  t: Theme;
  themeMode: ThemeMode;
}

function FlashcardsHubHeaderBase({ title, balance, t, themeMode }: FlashcardsHubHeaderProps) {
  const { lang } = useLang();
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
      {/* зачем: text-integrity — заголовок переносится, шапка растёт; усечение запрещено. */}
      <FlowText
        testID="flashcards-hub-title"
        provenance="authored"
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
      </FlowText>
      <View
        accessible
        accessibilityLabel={triLang(lang, {
          ru: `Баланс: ${balance}`,
          uk: `Баланс: ${balance}`,
          en: `Balance: ${balance}`,
          es: `Saldo: ${balance}`,
          'pt-BR': `Saldo: ${balance}`,
          vi: `Số dư: ${balance}`,
          id: `Saldo: ${balance}`,
          tr: `Bakiye: ${balance}`,
          pl: `Saldo: ${balance}`,
        })}
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
            вторая озвучка «картинка жемчужина» только мешала бы скринридеру. */}
        <Image
          source={pearlIconForTheme(themeMode)}
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
