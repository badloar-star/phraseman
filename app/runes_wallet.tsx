/**
 * runes_wallet.tsx — раздел «Руны»: баланс и заработанное за всё время.
 *
 * зачем (владелец, 2026-08-24): тап по счётчику рун в шапке главной и шапке
 * «Обучения» открывает этот раздел (решение 23.08, макет
 * docs/v2/mockups/27-runes-wallet-and-boosts.html). Прямой запрет владельца
 * 2026-08-24: ЗДЕСЬ НЕТ ТОВАРОВ И МАГАЗИНА — блок «усиления» из макета отменён,
 * не возвращать его в этот экран.
 *
 * Первый кадр — синхронно из снапшота (peekRunesBalance): никакого «0 и
 * прыжка» (Performance Bible).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useScreen } from '../hooks/use-screen';
import ContentWrap from '../components/ContentWrap';
import TapScale from '../components/TapScale';
import { HOME_RUNE_ICON_SOURCE } from '../components/home/homeRuneAsset';
import { triLang } from '../constants/i18n';

// зачем (владелец, 25.08: «иконку смени на ассет правильный»): тот же
// ассет-монета, что в Арене/Лиге/Главной через HomeRuneBalance, а не
// текстовый глиф RuneGlyph — одна валюта, один и тот же образ везде.
import { runeWord } from '../constants/runes';
import { safeRouterBack } from './navigation_back';
import { peekRunesBalance, subscribeRunesBalance, getRunesBalance, type RunesBalance } from './runes_system';

export default function RunesWalletScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { insets } = useScreen();

  // Синхронный первый кадр из снапшота — цифра сразу правильная.
  const [wallet, setWallet] = useState<RunesBalance>(() => peekRunesBalance());

  // Пружинка счётчика при живом начислении (обратная связь, не декорация):
  // тот же язык движения, что у чипа в шапке — bump без перелёта.
  const bumpScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;
    const unsubscribe = subscribeRunesBalance((next, delta) => {
      if (!mounted) return;
      setWallet(next);
      if (delta > 0) {
        bumpScale.setValue(1);
        Animated.spring(bumpScale, {
          toValue: 1,
          useNativeDriver: true,
          // Короткий подхват: вверх и назад одной пружиной через velocity —
          // прерываемо и без каскада sequence.
          velocity: 3,
          speed: 18,
          bounciness: 9,
        }).start();
      }
    });
    // Авторитетная проекция с диска (без чтений Firestore). Поздний ответ не
    // затирает более свежее локальное значение: берём только рост.
    void getRunesBalance().then((authoritative) => {
      if (!mounted) return;
      setWallet((current) => (
        authoritative.balance !== current.balance || authoritative.earnedTotal > current.earnedTotal
          ? authoritative
          : current
      ));
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [bumpScale]);

  const goBack = useCallback(() => safeRouterBack(router), [router]);

  // The local wallet projection already contains the canonical received total.
  // Keeping this screen on that same source avoids a missing/stale secondary
  // server snapshot and guarantees that tapping the shared HUD cannot crash.
  const receivedTotal = wallet.earnedTotal;
  const title = triLang(lang, { ru: 'Руны', uk: 'Руни', en: 'Runes', es: 'Runas', 'pt-BR': 'Runas', vi: 'Rune', id: 'Rune', tr: 'Rünler', pl: 'Runy' });
  const earnedTotalLabel = triLang(lang, {
    ru: `получено за всё время — ${receivedTotal}`,
    uk: `отримано за весь час — ${receivedTotal}`,
    en: `received all-time — ${receivedTotal}`,
    es: `recibidas en total: ${receivedTotal}`,
    'pt-BR': `recebidas no total: ${receivedTotal}`,
    vi: `tổng đã nhận: ${receivedTotal}`,
    id: `total diterima: ${receivedTotal}`,
    tr: `toplam alınan: ${receivedTotal}`,
    pl: `otrzymane łącznie: ${receivedTotal}`,
  });
  return (
    <View style={{ flex: 1, backgroundColor: t.bgPrimary }}>
      <ContentWrap>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: insets.top + 6,
            paddingBottom: 8,
          }}
        >
          <TapScale
            onPress={goBack}
            withHaptic={true}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: t.bgCard,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
              flexShrink: 0,
            }}
          >
            <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
          </TapScale>
          <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }}>
            {title}
          </Text>
        </View>

        <ScrollView decelerationRate="fast"
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            accessible
            accessibilityLabel={`${wallet.balance} ${runeWord(lang, wallet.balance)}`}
            style={{ alignItems: 'center', paddingTop: 18, paddingBottom: 26, paddingHorizontal: 18 }}
          >
            <Image source={HOME_RUNE_ICON_SOURCE} style={{ width: 52, height: 52 }} resizeMode="contain" accessible={false} />
            <Animated.Text
              style={{
                color: t.textPrimary,
                fontSize: 52,
                fontWeight: '900',
                lineHeight: 58,
                letterSpacing: -1.5,
                fontVariant: ['tabular-nums'],
                marginTop: 4,
                transform: [{ scale: bumpScale }],
              }}
            >
              {wallet.balance}
            </Animated.Text>
            <Text
              style={{
                color: t.textMuted,
                fontSize: 13, // guard-ok: hero .sub из утверждённого макета 27 — статистика, не подпись под пунктом
                fontWeight: '700',
                marginTop: 7,
              }}
            >
              {earnedTotalLabel}
            </Text>
          </View>

        </ScrollView>
      </ContentWrap>
    </View>
  );
}
