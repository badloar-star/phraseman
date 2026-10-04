/**
 * runes_wallet.tsx — раздел «Монеты»: баланс, текущий ранг и заработанное за всё время.
 *
 * зачем (владелец, 2026-08-24): тап по счётчику монет в шапке главной и шапке
 * «Обучения» открывает этот раздел. Прямой запрет владельца 2026-08-24: ЗДЕСЬ НЕТ
 * ТОВАРОВ И МАГАЗИНА — не возвращать.
 * зачем (паритет с макетом coins.html PAY-02, 2026-10-04): вид по макету — монета ранга,
 * крупный баланс «баланс монет», карточка «Текущий ранг» с полоской и строка
 * «Получено за всё время». Логика баланса (снапшот, подписка, поздний ответ не затирает
 * свежее) не менялась. Монета — только ассет ранга coin_rank_XX.
 *
 * Первый кадр — синхронно из снапшота (peekRunesBalance): никакого «0 и прыжка».
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ContentWrap from '../components/ContentWrap';
import { LinearGradient } from '../components/SafeLinearGradient';
import { V2GlassSheen, useV2GlassStyle } from '../components/v2/V2Glass';
import V2Pressable from '../components/v2/V2Pressable';
import { useV2Palette } from '../components/v2/useV2Palette';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { V2, V2_TYPE } from '../constants/v2Style';
import { useMyCoinRankBinding } from '../hooks/use_my_coin_rank';
import { coinRankRowForDisplay, coinRankTitle, nextCoinRankRow } from './coin_rank_table_v1';
import { safeRouterBack } from './navigation_back';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { peekRunesBalance, subscribeRunesBalance, getRunesBalance, type RunesBalance } from './runes_system';

function formatCoins(value: number): string {
  return Math.max(0, Math.trunc(value)).toLocaleString('ru-RU').replace(/ /g, ' ');
}

export default function RunesWalletScreen() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const { liquidGlassThemeId } = useTheme();
  const p = useV2Palette();
  const glass = useV2GlassStyle();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const { lang } = useLang();
  const rankBinding = useMyCoinRankBinding();

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
  const openRank = useCallback(() => router.push('/coin_rank' as never), [router]);

  // для языков без отдельного перевода берём английский (как на экране повышения ранга)
  const tl = (ru: string, uk: string, en: string, es: string) => triLang(lang, {
    ru, uk, en, es, 'pt-BR': en, vi: en, id: en, tr: en, pl: en,
  });
  const title = triLang(lang, { ru: 'Монеты', uk: 'Монети', en: 'Coins', es: 'Monedas', 'pt-BR': 'Moedas', vi: 'Xu', id: 'Koin', tr: 'Jetonlar', pl: 'Monety' });
  const balanceCaption = tl('баланс монет', 'баланс монет', 'coin balance', 'saldo de monedas');
  const rankLabel = tl('Текущий ранг', 'Поточний ранг', 'Current rank', 'Rango actual');
  const rankWord = tl('ранг', 'ранг', 'rank', 'rango');
  const untilNext = tl('До следующего повышения', 'До наступного підвищення', 'Until the next upgrade', 'Hasta la siguiente mejora');
  const startPractice = tl('Начните практику', 'Почніть практику', 'Start practicing', 'Empieza a practicar');
  const earnedTitle = tl('Получено за всё время', 'Отримано за весь час', 'Received all-time', 'Recibido en total');
  const earnedNote = tl('Локальная история начислений', 'Локальна історія нарахувань', 'Local accrual history', 'Historial local de abonos');
  const backLabel = triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' });

  // зачем (макет PAY-02): ранг и цена следующего берутся из единой таблицы, ничего не считаем сами.
  const rank = rankBinding?.rank ?? null;
  const current = rank === null ? null : coinRankRowForDisplay(rank);
  const next = rank === null ? null : nextCoinRankRow(rank);
  const isZero = wallet.balance <= 0;
  const progress = next ? Math.max(0, Math.min(1, wallet.balance / next.priceToReach)) : 0;
  const remaining = next ? Math.max(0, next.priceToReach - wallet.balance) : 0;
  const coinSize = isZero ? 92 : 112; // макет: на нулевом балансе монета 92, иначе 112

  return (
    <View style={[styles.root, { backgroundColor: g.bg }]}>
      <LinearGradient pointerEvents="none" colors={[g.bgTop, g.bgBottom]} style={StyleSheet.absoluteFill} />
      <ContentWrap>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <V2Pressable
            testID="runes-wallet-back"
            accessibilityLabel={backLabel}
            onPress={goBack}
            scaleTo={0.94}
            style={[styles.backButton, glass]}
          >
            <V2GlassSheen seed={4} />
            <Ionicons name="chevron-back" size={24} color={p.text} />
          </V2Pressable>
          <Text accessibilityRole="header" style={[styles.headerTitle, { color: p.text }]}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          decelerationRate="fast"
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
          showsVerticalScrollIndicator={false}
        >
          <View
            accessible
            accessibilityLabel={`${wallet.balance} ${balanceCaption}`}
            style={styles.hero}
          >
            {current ? (
              <Image
                testID="runes-wallet-coin"
                source={current.source}
                contentFit="contain"
                style={{ width: coinSize, height: coinSize }}
                accessible={false}
              />
            ) : (
              <View style={{ width: coinSize, height: coinSize }} />
            )}
            <Animated.Text style={[styles.balance, { color: p.text, transform: [{ scale: bumpScale }] }]}>
              {formatCoins(wallet.balance)}
            </Animated.Text>
            <Text style={[styles.caption, { color: p.textSecondary }]}>{balanceCaption}</Text>
          </View>

          <V2Pressable
            testID="runes-wallet-rank-card"
            accessibilityRole="button"
            accessibilityLabel={rankLabel}
            onPress={openRank}
            scaleTo={0.98}
            style={[styles.card, glass]}
          >
            <V2GlassSheen seed={2} />
            <View style={styles.rankHead}>
              <View style={styles.rankCopy}>
                <Text style={[styles.overline, { color: p.textSecondary }]}>{rankLabel.toUpperCase()}</Text>
                <Text style={[styles.rankTitle, { color: p.text }]}>
                  {rank === null ? ' ' : `${coinRankTitle(rank, lang)} · ${rankWord} ${rank}`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={p.textSecondary} />
            </View>
            {next ? (
              <>
                <View style={[styles.track, { backgroundColor: g.opaqueControl }]}>
                  <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: p.progressFill }]} />
                </View>
                <View style={styles.rankFoot}>
                  <Text style={[styles.footText, { color: p.textSecondary }]}>{isZero ? startPractice : untilNext}</Text>
                  <Text style={[styles.footText, { color: p.textSecondary }]}>{isZero ? '—' : formatCoins(remaining)}</Text>
                </View>
              </>
            ) : null}
          </V2Pressable>

          <View style={[styles.card, styles.earnedRow, glass]}>
            <V2GlassSheen seed={1} />
            <View style={[styles.tile, { backgroundColor: p.control }]}>
              <Ionicons name="trending-up" size={20} color={p.text} />
            </View>
            <View style={styles.earnedCopy}>
              <Text style={[styles.earnedTitle, { color: p.text }]}>{earnedTitle}</Text>
              <Text style={[styles.earnedNote, { color: p.textSecondary }]}>{earnedNote}</Text>
            </View>
            <Text testID="runes-wallet-earned" style={[styles.earnedValue, { color: p.text }]}>{formatCoins(wallet.earnedTotal)}</Text>
          </View>
        </ScrollView>
      </ContentWrap>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 70, paddingHorizontal: V2.screenPad, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: V2.iconButton, height: V2.iconButton, borderRadius: V2.iconButton / 2, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...V2_TYPE.title, flex: 1, textAlign: 'center', marginHorizontal: 10 },
  headerSpacer: { width: V2.iconButton, height: V2.iconButton },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: V2.screenPad, paddingTop: 8, gap: V2.gap },
  hero: { alignItems: 'center', paddingTop: 26, paddingBottom: 18 },
  balance: { fontSize: 50, lineHeight: 56, fontWeight: '800', letterSpacing: -1, marginTop: 8, fontVariant: ['tabular-nums'] },
  caption: { ...V2_TYPE.body },
  card: { borderRadius: V2.radius.card, padding: 18 },
  rankHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankCopy: { flex: 1, minWidth: 0 },
  overline: { ...V2_TYPE.overline },
  rankTitle: { ...V2_TYPE.section, marginTop: 6 },
  track: { height: 7, borderRadius: 999, overflow: 'hidden', marginTop: 18 },
  fill: { height: '100%', borderRadius: 999 },
  rankFoot: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 9 },
  footText: { ...V2_TYPE.subtitle },
  earnedRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  tile: { width: 41, height: 41, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  earnedCopy: { flex: 1, minWidth: 0 },
  earnedTitle: { ...V2_TYPE.headline },
  earnedNote: { ...V2_TYPE.subtitle, marginTop: 1 },
  earnedValue: { ...V2_TYPE.headline, fontVariant: ['tabular-nums'] },
});
