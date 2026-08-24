import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, PixelRatio, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { arenaLoadWarm, arenaPeekWarm, arenaRememberWarm } from '../modules/arena/warm_cache';
import type { ArenaKeyValueStore } from '../modules/arena/match_store';
import { useLang } from '../components/LangContext';
import { ArenaStateCard, ArenaStateNotice } from '../components/arena/ArenaExpansionUI';
import { ArenaScreen, ArenaStat } from '../components/arena/ArenaScreen';
import { V2Card, V2Cta } from '../components/ui/v2_ui';
import { useTournamentPalette } from '../components/ui/v2_theme';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { arenaExpansionText } from '../modules/arena/expansion_copy';
import { ARENA_STAR_STORE_ENABLED } from '../modules/arena/hub_nav';
import type { ArenaStarStoreResponse, ArenaStoreItem } from '../modules/arena/expansion_contract';
import { arenaStoreItemTitle } from '../modules/arena/expansion_store_copy';
import { arenaFeatureOpenEvent, arenaStoreActionEvent } from '../modules/arena/telemetry';
import { trackArenaTelemetry } from './arena_telemetry';
import { arenaCosmeticDefinition } from '../modules/arena/arena_cosmetics';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import { mergeLevelSpinServerStars } from './level_spin_star_grants';
import { ARENA_LOCALIZED_STORE_ITEM_IDS, type ArenaStoreItemId } from '../modules/arena/expansion_store_copy';
import { arenaExpansionHome, arenaStarEquip, arenaStarPurchase, arenaStarStore, createArenaRequestId } from './arena_client';

/**
 * Системный масштаб шрифта — для высоты строки.
 *
 * В React Native крупный системный шрифт увеличивает `fontSize`, но `lineHeight`
 * задан числом и остаётся прежним: строки наезжают друг на друга и обрезаются.
 * Высота строки умножается на масштаб, поэтому при обычном размере вёрстка та
 * же, а при увеличении — правильная.
 *
 * На главных экранах Арены то же самое делает хук `useArenaFontScale`: он
 * реагирует на смену настройки на ходу. Здесь взято значение на момент
 * загрузки модуля — стили лежат в `StyleSheet`, а часть строк рисуется внутри
 * колбэков списка, где хук вызвать нельзя. Разница видна только если менять
 * системный шрифт, не выходя из приложения.
 */
const FONT_SCALE = PixelRatio.getFontScale();


const warmStore = AsyncStorage as unknown as ArenaKeyValueStore;

/**
 * Снимок магазина. Каталог не меняется неделями, баланс — только после покупки
 * или матча, поэтому прошлый снимок это почти всегда правда, а свежий приезжает
 * той же секундой. Покупку он не решает: цену и остаток проверяет сервер.
 */
function readStoreWarm(value: unknown): ArenaStarStoreResponse | null {
  if (!value || typeof value !== 'object') return null;
  const items = (value as { items?: unknown }).items;
  return Array.isArray(items) ? value as ArenaStarStoreResponse : null;
}

export default function ArenaStarWalletScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  const active = useRuntimeActive();
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'unavailable' | 'insufficient' | 'success' | 'error'>('loading');
  const warmStoreValue = useMemo(() => readStoreWarm(arenaPeekWarm('store', Date.now())), []);
  const [store, setStore] = useState<ArenaStarStoreResponse | null>(warmStoreValue);
  const [busySku, setBusySku] = useState<string | null>(null);
  /**
   * Отказ ДЕЙСТВИЯ отдельно от отказа загрузки. Раньше и покупка, и надевание
   * писали `state = 'error'` — то есть сорвавшаяся покупка выглядела как не
   * загрузившийся магазин, и игрок не мог понять, списались его руны или нет.
   * Для покупки это худший вопрос из возможных.
   */
  const [actionError, setActionError] = useState<'purchase' | 'equip' | null>(null);
  const purchaseIds = useRef(new Map<string, string>());
  const load = useCallback(() => {
    const accountToken = captureAccountGeneration();
    const ownerStableId = accountToken.stableId?.trim();
    // Снимок уже нарисован — состояние загрузки нужно только когда рисовать
    // нечего, иначе экран мигал бы пустотой поверх готового содержимого.
    setState((current) => (current === 'ready' ? current : 'loading'));
    setActionError(null);
    void Promise.all([arenaExpansionHome(), arenaStarStore()]).then(async ([home, response]) => {
      if (!ownerStableId || !isCurrentAccountGeneration(accountToken, ownerStableId)) return;
      if (!home.availability.store) { setState('unavailable'); return; }
      const next = { ...response, wallet: home.wallet };
      setStore(next);
      arenaRememberWarm({ key: 'store', value: next, wallNowMs: Date.now(), store: warmStore });
      setState(response.items.length ? 'ready' : 'empty');
    }).catch(() => setState('error'));
  }, []);
  useEffect(() => { if (active) load(); }, [active, load]);
  useEffect(() => {
    if (store) return;
    let alive = true;
    void arenaLoadWarm(warmStore, 'store', Date.now()).then((stored) => {
      const parsed = readStoreWarm(stored);
      if (alive && parsed) setStore((current) => current ?? parsed);
    }).catch(() => {});
    return () => { alive = false; };
    // Только на открытии: дальше данные приходят по сети.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { trackArenaTelemetry(arenaFeatureOpenEvent('store', 'hub')); }, []);

  const purchase = (item: ArenaStoreItem) => {
    if (!store || busySku) return;
    if (!ARENA_LOCALIZED_STORE_ITEM_IDS.includes(item.sku as ArenaStoreItemId) || arenaCosmeticDefinition(item.sku)?.slot !== item.slot) return;
    if (store.wallet.walletStars < item.priceStars) { setState('insufficient'); return; }
    const requestId = purchaseIds.current.get(item.sku) ?? createArenaRequestId('star_purchase');
    purchaseIds.current.set(item.sku, requestId);
    const accountToken = captureAccountGeneration();
    const ownerStableId = accountToken.stableId?.trim();
    if (!ownerStableId || !isCurrentAccountGeneration(accountToken, ownerStableId)) return;
    setBusySku(item.sku);
    trackArenaTelemetry(arenaStoreActionEvent('purchase', item.sku as ArenaStoreItemId, item.slot, item.priceStars));
    void arenaStarPurchase(item.sku, store.catalogVersion, requestId).then(async (response) => {
      if (!isCurrentAccountGeneration(accountToken, ownerStableId)) return;
      await mergeLevelSpinServerStars(accountToken, {
        stars: response.balanceAfter,
        ...(response.starsSeq !== undefined ? { starsSeq: response.starsSeq } : {}),
      });
      if (!isCurrentAccountGeneration(accountToken, ownerStableId)) return;
      purchaseIds.current.delete(item.sku);
      setState('success');
      void load();
    }).catch(() => setActionError('purchase')).finally(() => setBusySku(null));
  };
  const equip = (item: ArenaStoreItem) => {
    const requestId = createArenaRequestId('star_equip');
    if (!ARENA_LOCALIZED_STORE_ITEM_IDS.includes(item.sku as ArenaStoreItemId) || arenaCosmeticDefinition(item.sku)?.slot !== item.slot) return;
    trackArenaTelemetry(arenaStoreActionEvent('equip', item.sku as ArenaStoreItemId, item.slot, item.priceStars));
    setBusySku(item.sku);
    void arenaStarEquip(item.sku, item.slot, requestId).then(() => load()).catch(() => setActionError('equip')).finally(() => setBusySku(null));
  };
  const header = store ? <View style={styles.header}>
    <View style={styles.stats}><ArenaStat label={arenaExpansionText(lang, 'spendable')} value={store.wallet.walletStars} /><ArenaStat label={arenaExpansionText(lang, 'seasonEarned')} value={store.wallet.seasonStarsEarned} /></View>
    {state === 'error' ? <ArenaStateNotice state="error" onRetry={load} /> : null}
    {actionError ? (
      <ArenaStateCard
        state="error"
        title={arenaExpansionText(lang, actionError === 'purchase' ? 'purchaseFailed' : 'equipFailed')}
        body={arenaExpansionText(lang, actionError === 'purchase' ? 'purchaseFailedHint' : 'equipFailedHint')}
      />
    ) : null}
    {state === 'insufficient' || state === 'success' ? <ArenaStateCard state={state === 'insufficient' ? 'unavailable' : 'ready'} title={arenaExpansionText(lang, state === 'insufficient' ? 'insufficient' : 'purchaseSuccess')} /> : null}
  </View> : null;

  return (
    <ArenaScreen title={arenaExpansionText(lang, 'wallet')} subtitle={ARENA_STAR_STORE_ENABLED ? arenaExpansionText(lang, 'store') : undefined} scroll={false}>
      <FlatList
        data={ARENA_STAR_STORE_ENABLED ? (store?.items ?? []) : []}
        keyExtractor={(item) => item.sku}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        // зачем: витрина закрыта до релиза — заглушка «магазин пуст» с кнопкой
        // «назад» тут соврала бы: товаров нет не потому, что не загрузились.
        ListEmptyComponent={ARENA_STAR_STORE_ENABLED ? <View style={styles.center}><ArenaStateNotice state={state === 'insufficient' || state === 'success' || state === 'ready' ? 'empty' : state} emptyHint="emptyStore" onRetry={load} onBack={() => router.replace('/arena' as never)} /></View> : null}
        renderItem={({ item }) => { const wired = Boolean(arenaStoreItemTitle(lang, item.sku)) && arenaCosmeticDefinition(item.sku)?.slot === item.slot; return <V2Card style={styles.item}><View style={[styles.itemIcon, { backgroundColor: P.elev2 }]}><Ionicons name={item.icon ?? 'shield'} size={25} color={P.gold} /></View><View style={styles.flex}><Text style={[styles.title, { color: P.text }]}>{arenaStoreItemTitle(lang, item.sku) ?? arenaExpansionText(lang, 'unavailable')}</Text><Text style={[styles.price, { color: P.gold }]}>{item.priceStars}</Text></View><View style={styles.itemAction}>{item.equipped ? <Text style={[styles.owned, { color: P.accent }]}>{arenaExpansionText(lang, 'equipped')}</Text> : item.owned ? <V2Cta tone="ghost" disabled={!wired || busySku === item.sku} onPress={() => equip(item)}>{arenaExpansionText(lang, 'equip')}</V2Cta> : <V2Cta disabled={!wired || !item.available || busySku === item.sku} onPress={() => purchase(item)}>{arenaExpansionText(lang, 'buy').replace('{amount}', String(item.priceStars))}</V2Cta>}</View></V2Card>; }}
      />
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, gap: 12, paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center' },
  header: { gap: 12 },
  stats: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  itemIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  itemAction: { width: 124 },
  title: { fontSize: 17, lineHeight: 23 * FONT_SCALE, fontWeight: '900' },
  body: { marginTop: 2, fontSize: 13, lineHeight: 18 * FONT_SCALE, fontWeight: '600' },
  price: { marginTop: 5, fontSize: 14, fontWeight: '900' },
  owned: { minHeight: 44, textAlignVertical: 'center', textAlign: 'center', fontSize: 13, fontWeight: '900' },
});
