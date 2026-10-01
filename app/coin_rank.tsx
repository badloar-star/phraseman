import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { subscribeAppSnapshot } from './app_snapshot_store';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
} from './account_generation';
import { coinRankMetal, coinRankRowForDisplay, coinRankTitle } from './coin_rank_table_v1';
import { DebugLogger } from './debug-logger';
import { actionToastTri, emitAppEvent } from './events';
import { safeRouterBack } from './navigation_back';
import { getRunesBalanceRead, peekRunes } from './runes_system';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import CoinRankCatalog from '../components/coins/CoinRankCatalog';
import CoinRankUpgradeCeremony from '../components/level_up/CoinRankUpgradeCeremony';
import { LinearGradient } from '../components/SafeLinearGradient';
import { V2GlassSheen, useV2GlassStyle } from '../components/v2/V2Glass';
import V2Pressable from '../components/v2/V2Pressable';
import { useV2Palette } from '../components/v2/useV2Palette';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { V2, V2_TYPE } from '../constants/v2Style';
import {
  isCoinRankCeremonyBindingCurrent,
  isCoinRankOperationBindingCurrent,
  isCoinRankUpgradeEligible,
} from '../hooks/coin_rank_upgrade_guard';
import { useCoinRankUpgrade } from '../hooks/use_coin_rank_upgrade';

type AccountToken = ReturnType<typeof captureAccountGeneration>;

function activeOwner(token: AccountToken): string | null {
  if (token.phase !== 'active') return null;
  const stableId = token.stableId?.trim() ?? '';
  return stableId || null;
}

/**
 * The same local wallet projection used by Home and RuneBalanceChip, with one
 * extra fail-closed state: null while there is no active account owner.
 */
type CoinBalanceProjection = Readonly<{
  balance: number | null;
  ownerKey: string | null;
  forceBalanceReconcile: () => Promise<'durable' | 'unavailable'>;
}>;

function useCoinBalance(): CoinBalanceProjection {
  const initialTokenRef = useRef<AccountToken>(captureAccountGeneration());
  const ownerRef = useRef<string | null>(activeOwner(initialTokenRef.current));
  const generationRef = useRef<number>(initialTokenRef.current.generation);
  const forcedBlockRef = useRef(false);
  const [ownerKey, setOwnerKey] = useState<string | null>(() => (
    ownerRef.current ? `${ownerRef.current}:${generationRef.current}` : null
  ));
  const [balance, setBalance] = useState<number | null>(() => (
    ownerRef.current ? peekRunes() : null
  ));

  const reconcile = useCallback((token: AccountToken = captureAccountGeneration()) => {
    const owner = activeOwner(token);
    if (!owner || ownerRef.current !== owner) return;
    void getRunesBalanceRead()
      .then((read) => {
        if (ownerRef.current !== owner || !isCurrentAccountGeneration(token, owner)) return;
        if (!forcedBlockRef.current) setBalance(read.wallet.balance);
      })
      .catch(() => {
        // Keep the last known projection. Unknown remains null; a failed read
        // must never manufacture a spendable zero or enable the CTA.
      });
  }, []);

  const forceBalanceReconcile = useCallback(async (): Promise<'durable' | 'unavailable'> => {
    const token = captureAccountGeneration();
    const owner = activeOwner(token);
    if (!owner || ownerRef.current !== owner || generationRef.current !== token.generation) return 'unavailable';
    forcedBlockRef.current = true;
    setBalance(null);
    try {
      const read = await getRunesBalanceRead();
      if (ownerRef.current !== owner
        || generationRef.current !== token.generation
        || !isCurrentAccountGeneration(token, owner)
        || read.quality !== 'durable') {
        return 'unavailable';
      }
      forcedBlockRef.current = false;
      setBalance(read.wallet.balance);
      return 'durable';
    } catch {
      return 'unavailable';
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const unsubscribeSnapshot = subscribeAppSnapshot(() => {
      if (!mounted) return;
      const token = captureAccountGeneration();
      const owner = activeOwner(token);
      if (forcedBlockRef.current
        || !owner
        || ownerRef.current !== owner
        || generationRef.current !== token.generation
        || !isCurrentAccountGeneration(token, owner)) return;
      setBalance(peekRunes());
    });
    const accountSubscription = subscribeAccountGeneration((token) => {
      if (!mounted) return;
      const nextOwner = activeOwner(token);
      const ownerChanged = ownerRef.current !== nextOwner || generationRef.current !== token.generation;
      ownerRef.current = nextOwner;
      generationRef.current = token.generation;
      if (ownerChanged) {
        forcedBlockRef.current = false;
        setBalance(null);
        setOwnerKey(nextOwner ? `${nextOwner}:${token.generation}` : null);
      }
      if (nextOwner) reconcile(token);
    });
    if (ownerRef.current) reconcile(initialTokenRef.current);
    return () => {
      mounted = false;
      unsubscribeSnapshot();
      accountSubscription.remove();
    };
  }, [reconcile]);

  return { balance, ownerKey, forceBalanceReconcile };
}

function formatCoins(value: number): string {
  return Math.max(0, Math.trunc(value)).toLocaleString('ru-RU').replace(/\u00a0/g, ' ');
}

export default function CoinRankScreen() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const p = useV2Palette();
  const glass = useV2GlassStyle();
  // зачем (темы 2.0): без useMemo — токены зависят ещё от уровня цвета и оформления; поиск кэширован.
  const g = liquidGlassTokens(liquidGlassThemeId);
  const { balance, ownerKey, forceBalanceReconcile } = useCoinBalance();
  const {
    rankBinding,
    rank,
    next,
    isMaxRank,
    upgrading,
    upgrade,
    ceremony,
    dismissCeremony,
  } = useCoinRankUpgrade();
  const rankBindingRef = useRef(rankBinding);
  rankBindingRef.current = rankBinding;
  const reconciliationBlockedRef = useRef(false);
  const [balanceReconciling, setBalanceReconciling] = useState(false);
  const current = rank === null ? null : coinRankRowForDisplay(rank);
  const canUpgrade = isCoinRankUpgradeEligible({
    rank,
    balance,
    nextPrice: next?.priceToReach ?? null,
    upgrading,
    balanceReconciling: balanceReconciling || reconciliationBlockedRef.current,
  });

  useEffect(() => {
    reconciliationBlockedRef.current = false;
    setBalanceReconciling(false);
  }, [ownerKey]);

  // зачем (PM-128, эмулятор 01.10): раньше `lang === 'ru' ? … : English` — украинский,
  // португальский и остальные видели экран по-английски. Теперь все 9 языков интерфейса.
  const copy = useMemo(() => ({
    title: triLang(lang, { ru: 'Ранг игрока', uk: 'Ранг гравця', en: 'Player rank', es: 'Rango del jugador', 'pt-BR': 'Rank do jogador', vi: 'Hạng người chơi', id: 'Peringkat pemain', tr: 'Oyuncu rütbesi', pl: 'Ranga gracza' }),
    current: triLang(lang, { ru: 'Текущий ранг', uk: 'Поточний ранг', en: 'Current rank', es: 'Rango actual', 'pt-BR': 'Rank atual', vi: 'Hạng hiện tại', id: 'Peringkat saat ini', tr: 'Mevcut rütbe', pl: 'Obecna ranga' }),
    level: triLang(lang, { ru: 'Уровень', uk: 'Рівень', en: 'Level', es: 'Nivel', 'pt-BR': 'Nível', vi: 'Cấp', id: 'Level', tr: 'Seviye', pl: 'Poziom' }),
    balance: triLang(lang, { ru: 'Ваш баланс', uk: 'Ваш баланс', en: 'Your balance', es: 'Tu saldo', 'pt-BR': 'Seu saldo', vi: 'Số dư của bạn', id: 'Saldo kamu', tr: 'Bakiyen', pl: 'Twoje saldo' }),
    coins: triLang(lang, { ru: 'монет', uk: 'монет', en: 'coins', es: 'monedas', 'pt-BR': 'moedas', vi: 'xu', id: 'koin', tr: 'jeton', pl: 'monet' }),
    next: triLang(lang, { ru: 'Следующий ранг', uk: 'Наступний ранг', en: 'Next rank', es: 'Siguiente rango', 'pt-BR': 'Próximo rank', vi: 'Hạng tiếp theo', id: 'Peringkat berikutnya', tr: 'Sonraki rütbe', pl: 'Następna ranga' }),
    cost: triLang(lang, { ru: 'Стоимость повышения', uk: 'Вартість підвищення', en: 'Upgrade cost', es: 'Coste de la mejora', 'pt-BR': 'Custo da promoção', vi: 'Chi phí nâng hạng', id: 'Biaya naik peringkat', tr: 'Yükseltme bedeli', pl: 'Koszt awansu' }),
    remaining: triLang(lang, { ru: 'Осталось накопить', uk: 'Залишилося накопичити', en: 'Still needed', es: 'Te falta', 'pt-BR': 'Ainda falta', vi: 'Còn thiếu', id: 'Masih kurang', tr: 'Kalan', pl: 'Brakuje jeszcze' }),
    enough: triLang(lang, { ru: 'Монет достаточно для повышения', uk: 'Монет достатньо для підвищення', en: 'Enough coins to upgrade', es: 'Tienes monedas suficientes para subir', 'pt-BR': 'Moedas suficientes para subir', vi: 'Đủ xu để nâng hạng', id: 'Koin cukup untuk naik peringkat', tr: 'Yükseltmek için yeterli jeton var', pl: 'Masz dość monet na awans' }),
    loading: triLang(lang, { ru: 'Загружаем данные', uk: 'Завантажуємо дані', en: 'Loading data', es: 'Cargando datos', 'pt-BR': 'Carregando dados', vi: 'Đang tải dữ liệu', id: 'Memuat data', tr: 'Veriler yükleniyor', pl: 'Wczytujemy dane' }),
    upgrade: triLang(lang, { ru: 'Повысить ранг', uk: 'Підвищити ранг', en: 'Upgrade rank', es: 'Subir de rango', 'pt-BR': 'Subir de rank', vi: 'Nâng hạng', id: 'Naik peringkat', tr: 'Rütbeyi yükselt', pl: 'Awansuj' }),
    max: triLang(lang, { ru: 'Достигнут максимальный ранг', uk: 'Досягнуто максимального рангу', en: 'Maximum rank reached', es: 'Has alcanzado el rango máximo', 'pt-BR': 'Rank máximo alcançado', vi: 'Đã đạt hạng cao nhất', id: 'Peringkat maksimum tercapai', tr: 'En yüksek rütbeye ulaşıldı', pl: 'Osiągnięto najwyższą rangę' }),
  }), [lang]);

  const showToast = useCallback((
    type: 'success' | 'error' | 'info' | 'warning',
    ru: string,
    en: string,
  ) => {
    emitAppEvent('action_toast', actionToastTri(type, {
      ru,
      uk: ru,
      en,
      es: en,
      'pt-BR': en,
      vi: en,
      id: en,
      tr: en,
      pl: en,
    }));
  }, []);

  const handleUpgrade = useCallback(async () => {
    if (!canUpgrade || reconciliationBlockedRef.current) return;
    if (!rankBinding) return;
    const operationBinding = Object.freeze({
      ownerStableId: rankBinding.ownerStableId,
      accountGeneration: rankBinding.accountGeneration,
      rank: rankBinding.rank,
    });
    const operationStillCurrent = () => (
      isCoinRankOperationBindingCurrent(
        operationBinding,
        rankBindingRef.current,
        captureAccountGeneration(),
      )
    );
    if (!operationStillCurrent()) return;
    const result = await upgrade();
    if (!operationStillCurrent()) return;
    if (result.ok) {
      if (result.status === 'upgraded') return;
      if (result.status === 'already_applied') {
        showToast('info', 'Ранг уже повышен. Баланс повторно не списан.', 'Rank already upgraded. No second charge was made.');
      }
      return;
    }
    switch (result.reason) {
      case 'insufficient_coins': {
        reconciliationBlockedRef.current = true;
        setBalanceReconciling(true);
        const quality = await forceBalanceReconcile();
        if (!operationStillCurrent()) return;
        if (quality === 'durable') {
          reconciliationBlockedRef.current = false;
          setBalanceReconciling(false);
          showToast('warning', 'Монет недостаточно. Баланс проверен и обновлён.', 'Not enough coins. Your balance was verified and refreshed.');
        } else {
          setBalanceReconciling(false);
          showToast('error', 'Не удалось подтвердить баланс. Повышение заблокировано.', 'Could not verify the balance. Upgrading is disabled.');
        }
        return;
      }
      case 'stale_rank':
        showToast('info', 'Ранг изменился. Данные на экране обновлены.', 'Your rank changed. The screen has been refreshed.');
        return;
      case 'max_rank':
        showToast('info', 'Максимальный ранг уже достигнут.', 'Maximum rank is already reached.');
        return;
      case 'identity_changed':
        showToast('error', 'Аккаунт изменился. Повышение не выполнено.', 'The account changed. The upgrade was not performed.');
        return;
      case 'invalid_rank':
      case 'state_corrupt':
        showToast('error', 'Данные ранга повреждены. Монеты не списаны.', 'Rank data is invalid. No coins were charged.');
        return;
      case 'failed':
        showToast('error', 'Не удалось повысить ранг. Монеты не списаны.', 'Could not upgrade the rank. No coins were charged.');
        return;
    }
  }, [canUpgrade, forceBalanceReconcile, rankBinding, showToast, upgrade]);

  const goBack = useCallback(() => safeRouterBack(router), [router]);
  const missing = balance !== null && next ? Math.max(0, next.priceToReach - balance) : null;
  const progress = balance !== null && next ? Math.max(0, Math.min(1, balance / next.priceToReach)) : 0;
  const ctaLabel = upgrading || balanceReconciling
    ? triLang(lang, { ru: 'Повышаем…', uk: 'Підвищуємо…', en: 'Upgrading…', es: 'Subiendo…', 'pt-BR': 'Subindo…', vi: 'Đang nâng hạng…', id: 'Menaikkan…', tr: 'Yükseltiliyor…', pl: 'Awansujemy…' })
    : rank === null || balance === null
      ? copy.loading
      : isMaxRank
        ? copy.max
        : `${copy.upgrade} · ${formatCoins(next!.priceToReach)} ${copy.coins}`;
  const visibleCeremony = isCoinRankCeremonyBindingCurrent(
    ceremony,
    rankBinding,
    captureAccountGeneration(),
  ) ? ceremony : null;
  // зачем (владелец 30.09: «анимация не запускается при изменении ранга») — временная трассировка:
  // церемония есть, но экран её прячет, пока показанный ранг не станет toRank. Печатаем, что решило.
  const ceremonyTraceKey = ceremony
    ? `${ceremony.fromRank}>${ceremony.toRank}|${rankBinding?.rank ?? 'null'}|${visibleCeremony ? 'show' : 'hide'}`
    : null;
  useEffect(() => {
    if (!ceremonyTraceKey || !ceremony) return;
    DebugLogger.info('[RANK-CEREMONY]', `экран: показывать ли ${JSON.stringify({
      ceremonyFrom: ceremony.fromRank,
      ceremonyTo: ceremony.toRank,
      displayedRank: rankBinding?.rank ?? null,
      sameOwner: rankBinding ? rankBinding.ownerStableId === ceremony.ownerStableId : null,
      sameGeneration: rankBinding ? rankBinding.accountGeneration === ceremony.accountGeneration : null,
      visible: visibleCeremony !== null,
    })}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceremonyTraceKey]);

  return (
    <View style={[styles.root, { backgroundColor: g.bg }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[g.bgTop, g.bgBottom]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <V2Pressable
          testID="coin-rank-back"
          accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
          onPress={goBack}
          scaleTo={0.94}
          style={[styles.backButton, glass]}
        >
          <V2GlassSheen seed={4} />
          <Ionicons name="chevron-back" size={24} color={p.text} />
        </V2Pressable>
        <Text accessibilityRole="header" style={[styles.headerTitle, { color: p.text }]}>{copy.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          {current ? (
            <Image
              testID="coin-rank-current-asset"
              source={current.source}
              contentFit="contain"
              style={styles.heroCoin}
              accessible={false}
            />
          ) : (
            <View testID="coin-rank-loading-asset" style={[styles.heroPlaceholder, { backgroundColor: g.opaqueCard }]}>
              <ActivityIndicator color={g.cta} />
            </View>
          )}
          <Text style={[styles.overline, { color: p.textSecondary }]}>{copy.current.toUpperCase()}</Text>
          <Text testID="coin-rank-current-title" style={[styles.rankTitle, { color: p.text }]}>
            {current ? coinRankTitle(current.rank, lang) : '—'}
          </Text>
          <Text style={[styles.rankMeta, { color: p.textSecondary }]}>
            {rank === null ? copy.loading : `${copy.level} ${rank} · ${coinRankMetal(current!.rank, lang)}`}
          </Text>
        </View>

        <View style={[styles.card, glass]}>
          <V2GlassSheen seed={1} />
          <Text style={[styles.cardLabel, { color: p.textSecondary }]}>{copy.balance}</Text>
          <Text testID="coin-rank-balance" style={[styles.balanceValue, { color: p.text }]}>
            {balance === null ? '—' : formatCoins(balance)}
          </Text>
          <Text style={[styles.cardFootnote, { color: p.textSecondary }]}>{copy.coins}</Text>
        </View>

        <View style={[styles.card, styles.nextCard, glass]}>
          <V2GlassSheen seed={2} />
          {next ? (
            <>
              <View style={styles.nextHeader}>
                <View style={styles.nextCopy}>
                  <Text style={[styles.cardLabel, { color: p.textSecondary }]}>{copy.next}</Text>
                  <Text testID="coin-rank-next-title" style={[styles.nextTitle, { color: p.text }]}>{coinRankTitle(next.rank, lang)}</Text>
                  <Text style={[styles.nextMeta, { color: p.textSecondary }]}>{`${copy.level} ${next.rank} · ${coinRankMetal(next.rank, lang)}`}</Text>
                </View>
                <Image source={next.source} contentFit="contain" style={styles.nextCoin} accessible={false} />
              </View>
              <View style={[styles.progressTrack, { backgroundColor: g.opaqueControl }]}>
                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: g.accent }]} />
              </View>
              <View style={styles.costRow}>
                <Text style={[styles.costText, { color: p.textSecondary }]}>{copy.cost}</Text>
                <Text style={[styles.costValue, { color: p.text }]}>{formatCoins(next.priceToReach)}</Text>
              </View>
              <Text style={[styles.statusText, { color: missing === 0 ? p.text : p.textSecondary }]}>
                {balance === null
                  ? copy.loading
                  : missing === 0
                    ? copy.enough
                    : `${copy.remaining}: ${formatCoins(missing!)} ${copy.coins}`}
              </Text>
            </>
          ) : (
            <View style={styles.maxState}>
              <Ionicons name="checkmark-circle" size={30} color={p.iconTint} />
              <Text style={[styles.maxTitle, { color: p.text }]}>{rank === null ? copy.loading : copy.max}</Text>
            </View>
          )}
        </View>

        {/* зачем (coins.html «каталог 00–19»): ряд всех 20 рангов под карточкой повышения; чисто вид. */}
        <CoinRankCatalog glass={g} lang={lang} currentRank={rank} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 18, backgroundColor: g.bgBottom }]}>
        <V2Pressable
          testID="coin-rank-upgrade"
          accessibilityLabel={ctaLabel}
          disabled={!canUpgrade}
          onPress={handleUpgrade}
          scaleTo={0.97}
          style={[
            styles.cta,
            { backgroundColor: canUpgrade ? g.cta : g.opaqueControl },
          ]}
        >
          {upgrading ? <ActivityIndicator size="small" color={g.ctaInk} /> : null}
          <Text style={[styles.ctaText, { color: canUpgrade ? g.ctaInk : g.mutedText }]}>{ctaLabel}</Text>
        </V2Pressable>
      </View>

      <CoinRankUpgradeCeremony ceremony={visibleCeremony} onDone={dismissCeremony} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    minHeight: 70,
    paddingHorizontal: V2.screenPad,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: V2.iconButton,
    height: V2.iconButton,
    borderRadius: V2.iconButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...V2_TYPE.title, flex: 1, textAlign: 'center', marginHorizontal: 10 },
  headerSpacer: { width: V2.iconButton, height: V2.iconButton },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: V2.screenPad, paddingTop: 8, paddingBottom: 24, gap: V2.gap },
  hero: { alignItems: 'center', paddingVertical: 10 },
  heroCoin: { width: 178, height: 178 },
  heroPlaceholder: { width: 178, height: 178, borderRadius: 89, alignItems: 'center', justifyContent: 'center' },
  overline: { ...V2_TYPE.overline, marginTop: 4 },
  rankTitle: { ...V2_TYPE.largeTitle, marginTop: 4, textAlign: 'center' },
  rankMeta: { ...V2_TYPE.body, marginTop: 3, textAlign: 'center' },
  card: {
    minHeight: 112,
    borderRadius: V2.radius.card,
    padding: 18,
  },
  cardLabel: { ...V2_TYPE.caption, textTransform: 'uppercase', letterSpacing: 1.1 },
  balanceValue: { fontSize: 38, lineHeight: 44, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 },
  cardFootnote: { ...V2_TYPE.body },
  nextCard: { minHeight: 224 },
  nextHeader: { flexDirection: 'row', alignItems: 'center', minHeight: 84 },
  nextCopy: { flex: 1, minWidth: 0, paddingRight: 8 },
  nextTitle: { ...V2_TYPE.section, marginTop: 4 },
  nextMeta: { ...V2_TYPE.subtitle, marginTop: 2 },
  nextCoin: { width: 82, height: 82, flexShrink: 0 },
  progressTrack: { height: 7, borderRadius: 999, overflow: 'hidden', marginTop: 14 },
  progressFill: { height: '100%', borderRadius: 999 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 14 },
  costText: { ...V2_TYPE.body, flex: 1 },
  costValue: { ...V2_TYPE.headline, fontVariant: ['tabular-nums'] },
  statusText: { ...V2_TYPE.caption, marginTop: 8 },
  maxState: { minHeight: 176, alignItems: 'center', justifyContent: 'center', gap: 12 },
  maxTitle: { ...V2_TYPE.headline, textAlign: 'center' },
  footer: { paddingHorizontal: V2.screenPad, paddingTop: 12 },
  cta: {
    minHeight: V2.cta.height,
    borderRadius: V2.cta.radius,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaText: { ...V2_TYPE.headline, textAlign: 'center' },
});

