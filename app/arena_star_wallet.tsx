import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useLang } from '../components/LangContext';
import { ArenaStateCard, ArenaStateNotice } from '../components/arena/ArenaExpansionUI';
import { ArenaScreen, ArenaStat } from '../components/arena/ArenaScreen';
import { ArenaHubChrome } from '../components/arena/ArenaHubChrome';
import { V2Card, V2Cta } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { arenaExpansionText } from '../modules/arena/expansion_copy';
import type { ArenaStarStoreResponse, ArenaStoreItem } from '../modules/arena/expansion_contract';
import { arenaStoreItemTitle } from '../modules/arena/expansion_store_copy';
import { arenaFeatureOpenEvent, arenaStoreActionEvent } from '../modules/arena/telemetry';
import { trackArenaTelemetry } from './arena_telemetry';
import { arenaCosmeticDefinition } from '../modules/arena/arena_cosmetics';
import { ARENA_LOCALIZED_STORE_ITEM_IDS, type ArenaStoreItemId } from '../modules/arena/expansion_store_copy';
import { arenaExpansionHome, arenaStarEquip, arenaStarPurchase, arenaStarStore, arenaV2SpinClaim, arenaV2SpinStatus, createArenaRequestId } from './arena_client';

export default function ArenaStarWalletScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  const active = useRuntimeActive();
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'unavailable' | 'insufficient' | 'success' | 'error'>('loading');
  const [store, setStore] = useState<ArenaStarStoreResponse | null>(null);
  const [spins, setSpins] = useState(0);
  const [busySku, setBusySku] = useState<string | null>(null);
  /**
   * Отказ ДЕЙСТВИЯ отдельно от отказа загрузки. Раньше и покупка, и надевание,
   * и спин писали `state = 'error'` — то есть сорвавшаяся покупка выглядела
   * как не загрузившийся магазин, и игрок не мог понять, списались его звёзды
   * или нет. Для покупки это худший вопрос из возможных.
   */
  const [actionError, setActionError] = useState<'purchase' | 'equip' | 'spin' | null>(null);
  const purchaseIds = useRef(new Map<string, string>());
  const spinId = useRef<string | null>(null);
  const load = useCallback(() => {
    setState('loading');
    setActionError(null);
    void Promise.all([arenaExpansionHome(), arenaStarStore(), arenaV2SpinStatus().catch(() => ({ ok: true as const, spinsAvailable: 0 }))]).then(([home, response, spin]) => {
      if (!home.availability.store) { setState('unavailable'); return; }
      setStore({ ...response, wallet: home.wallet });
      setSpins(spin.spinsAvailable);
      setState(response.items.length ? 'ready' : 'empty');
    }).catch(() => setState('error'));
  }, []);
  useEffect(() => { if (active) load(); }, [active, load]);
  useEffect(() => { trackArenaTelemetry(arenaFeatureOpenEvent('store', 'hub')); }, []);

  const purchase = (item: ArenaStoreItem) => {
    if (!store || busySku) return;
    if (!ARENA_LOCALIZED_STORE_ITEM_IDS.includes(item.sku as ArenaStoreItemId) || arenaCosmeticDefinition(item.sku)?.slot !== item.slot) return;
    if (store.wallet.walletStars < item.priceStars) { setState('insufficient'); return; }
    const requestId = purchaseIds.current.get(item.sku) ?? createArenaRequestId('star_purchase');
    purchaseIds.current.set(item.sku, requestId);
    setBusySku(item.sku);
    trackArenaTelemetry(arenaStoreActionEvent('purchase', item.sku as ArenaStoreItemId, item.slot, item.priceStars));
    void arenaStarPurchase(item.sku, store.catalogVersion, requestId).then(() => {
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
  const claimSpin = () => {
    const requestId = spinId.current ?? createArenaRequestId('spin');
    spinId.current = requestId;
    setBusySku('spin');
    void arenaV2SpinClaim(requestId).then(() => { spinId.current = null; setSpins((old) => Math.max(0, old - 1)); setState('success'); }).catch(() => setActionError('spin')).finally(() => setBusySku(null));
  };

  const header = store ? <View style={styles.header}>
    <View style={styles.stats}><ArenaStat label={arenaExpansionText(lang, 'spendable')} value={store.wallet.walletStars} /><ArenaStat label={arenaExpansionText(lang, 'seasonEarned')} value={store.wallet.seasonStarsEarned} /></View>
    {spins > 0 ? <V2Card style={styles.spin}><View style={styles.icon}><Ionicons name="sparkles" size={26} color={P.onGold} /></View><View style={styles.flex}><Text style={[styles.title, { color: P.text }]}>{arenaExpansionText(lang, 'spin')}</Text><Text style={[styles.body, { color: P.muted }]}>{spins}</Text></View><View style={styles.action}><V2Cta disabled={busySku === 'spin'} onPress={claimSpin}>{arenaExpansionText(lang, 'spinClaim')}</V2Cta></View></V2Card> : null}
    {state === 'error' ? <ArenaStateNotice state="error" onRetry={load} /> : null}
    {actionError ? (
      <ArenaStateCard
        state="error"
        title={arenaExpansionText(lang, actionError === 'purchase' ? 'purchaseFailed' : actionError === 'equip' ? 'equipFailed' : 'spinFailed')}
        body={arenaExpansionText(lang, actionError === 'purchase' ? 'purchaseFailedHint' : actionError === 'equip' ? 'equipFailedHint' : 'spinFailedHint')}
      />
    ) : null}
    {state === 'insufficient' || state === 'success' ? <ArenaStateCard state={state === 'insufficient' ? 'unavailable' : 'ready'} title={arenaExpansionText(lang, state === 'insufficient' ? 'insufficient' : 'purchaseSuccess')} /> : null}
  </View> : null;

  return (
    <ArenaHubChrome>
    <ArenaScreen title={arenaExpansionText(lang, 'wallet')} subtitle={arenaExpansionText(lang, 'store')} scroll={false}>
      <FlatList
        data={store?.items ?? []}
        keyExtractor={(item) => item.sku}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        ListEmptyComponent={<View style={styles.center}><ArenaStateNotice state={state === 'insufficient' || state === 'success' || state === 'ready' ? 'empty' : state} emptyHint="emptyStore" onRetry={load} onBack={() => router.replace('/arena' as never)} /></View>}
        renderItem={({ item }) => { const wired = Boolean(arenaStoreItemTitle(lang, item.sku)) && arenaCosmeticDefinition(item.sku)?.slot === item.slot; return <V2Card style={styles.item}><View style={[styles.itemIcon, { backgroundColor: P.elev2 }]}><Ionicons name={item.icon ?? 'shield'} size={25} color={P.gold} /></View><View style={styles.flex}><Text style={[styles.title, { color: P.text }]}>{arenaStoreItemTitle(lang, item.sku) ?? arenaExpansionText(lang, 'unavailable')}</Text><Text style={[styles.price, { color: P.gold }]}>{item.priceStars}</Text></View><View style={styles.itemAction}>{item.equipped ? <Text style={[styles.owned, { color: P.accent }]}>{arenaExpansionText(lang, 'equipped')}</Text> : item.owned ? <V2Cta tone="ghost" disabled={!wired || busySku === item.sku} onPress={() => equip(item)}>{arenaExpansionText(lang, 'equip')}</V2Cta> : <V2Cta disabled={!wired || !item.available || busySku === item.sku} onPress={() => purchase(item)}>{arenaExpansionText(lang, 'buy').replace('{amount}', String(item.priceStars))}</V2Cta>}</View></V2Card>; }}
      />
    </ArenaScreen>
    </ArenaHubChrome>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, gap: 12, paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center' },
  header: { gap: 12 },
  stats: { flexDirection: 'row', gap: 10 },
  spin: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#F7C948', alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  action: { minWidth: 120 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  itemIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  itemAction: { width: 124 },
  title: { fontSize: 17, lineHeight: 23, fontWeight: '900' },
  body: { marginTop: 2, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  price: { marginTop: 5, fontSize: 14, fontWeight: '900' },
  owned: { minHeight: 44, textAlignVertical: 'center', textAlign: 'center', fontSize: 13, fontWeight: '900' },
});
