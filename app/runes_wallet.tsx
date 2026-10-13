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
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import KitProgressFill from '../components/KitProgressFill';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ContentWrap from '../components/ContentWrap';
import V2Backdrop from '../components/v2/V2Backdrop';
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
import { getDevCoinBalanceOverride } from './dev_coin_rank';

const COUNT_PULSE_MS = 700;
const COUNT_PULSE_EASE = Easing.bezier(0.2, 1.25, 0.4, 1);

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
        // зачем (координатор 10.10, extension.css `.anim-count`): пульс баланса 700 мс cubic-bezier(.2,1.25,.4,1) вверх до 1.1
        // и столько же назад (iteration 2 alternate) вместо прежней пружины.
        Animated.sequence([
          Animated.timing(bumpScale, { toValue: 1.1, duration: COUNT_PULSE_MS, easing: COUNT_PULSE_EASE, useNativeDriver: true }),
          Animated.timing(bumpScale, { toValue: 1, duration: COUNT_PULSE_MS, easing: COUNT_PULSE_EASE, useNativeDriver: true }),
        ]).start();
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
  const startPractice = tl('Начни практику', 'Почни практику', 'Start practicing', 'Empieza a practicar');
  const earnedTitle = tl('Получено за всё время', 'Отримано за весь час', 'Received all-time', 'Recibido en total');
  const earnedNote = tl('Локальная история начислений', 'Локальна історія нарахувань', 'Local accrual history', 'Historial local de abonos');
  const backLabel = triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' });

  // зачем (макет PAY-02): ранг и цена следующего берутся из единой таблицы, ничего не считаем сами.
  const rank = rankBinding?.rank ?? null;
  const current = rank === null ? null : coinRankRowForDisplay(rank);
  const next = rank === null ? null : nextCoinRankRow(rank);
  // зачем (Авторизация 12.10, coins-001): dev `coins=N` — баланс только для показа (кошелёк в хранилище не меняется)
  const devBalance = getDevCoinBalanceOverride();
  const shownWallet: RunesBalance = devBalance === null ? wallet : { ...wallet, balance: devBalance, earnedTotal: Math.max(wallet.earnedTotal, devBalance) };
  const isZero = shownWallet.balance <= 0;
  const progress = next ? Math.max(0, Math.min(1, shownWallet.balance / next.priceToReach)) : 0;
  const remaining = next ? Math.max(0, next.priceToReach - shownWallet.balance) : 0;
  const coinSize = isZero ? 92 : 112; // макет: на нулевом балансе монета 92, иначе 112

  return (
    <View style={[styles.root, { backgroundColor: g.bg }]}>
      {/* зачем (coins-002): общий фон 2.0 — почти чёрный bg с едва светлым верхом и свечениями темы; собственный градиент bgTop→bgBottom давал плоский тёмно-синий без виньетки. */}
      <V2Backdrop />
      <ContentWrap>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <V2Pressable
            testID="runes-wallet-back"
            accessibilityLabel={backLabel}
            onPress={goBack}
            scaleTo={0.94}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={21} color={p.text} />
          </V2Pressable>
        </View>
        {/* зачем (coins.html back()): «назад» голым шевроном, ниже крупный заголовок 34 слева — как во всех экранах профиля. */}
        <Text maxFontSizeMultiplier={1.15} accessibilityRole="header" style={[styles.headerTitle, { color: p.text }]}>{title}</Text>

        <ScrollView
          decelerationRate="fast"
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
          showsVerticalScrollIndicator={false}
        >
          <View
            accessible
            accessibilityLabel={`${shownWallet.balance} ${balanceCaption}`}
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
              {formatCoins(shownWallet.balance)}
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
                  {/* зачем (координатор 10.10, kit `.trk > i`): полоса до следующего ранга растёт 800 мс, а не прыгает. */}
                  <KitProgressFill ratio={progress} style={[styles.fill, { backgroundColor: p.progressFill }]} />
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
            <Text testID="runes-wallet-earned" style={[styles.earnedValue, { color: p.textSecondary }]}>{formatCoins(shownWallet.earnedTotal)}</Text>
          </View>
        </ScrollView>
      </ContentWrap>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // зачем (`.topbar` 44 + `.rb.bare`): голый шеврон в области нажатия 48×44.
  header: { minHeight: 44, paddingHorizontal: V2.screenPad, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 48, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  // `.screen-title`: 34/40, 700, -0.5, 10 под строкой «назад».
  headerTitle: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5, marginTop: 10, paddingHorizontal: V2.screenPad },
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
  // `.list-row`: высота 64, поля 10/14, промежуток 14.
  earnedRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingVertical: 10, paddingHorizontal: 14 },
  tile: { width: 41, height: 41, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  earnedCopy: { flex: 1, minWidth: 0 },
  earnedTitle: { ...V2_TYPE.headline },
  earnedNote: { ...V2_TYPE.subtitle, marginTop: 1 },
  // `.value`: вторичный тон; макет 14, шкала D145 — 13.
  earnedValue: { fontSize: 13, lineHeight: 18, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
