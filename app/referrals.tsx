import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import SkeletonBlock from '../components/SkeletonShimmer';
import TapScale from '../components/TapScale';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import {
  getClaimableReferralState,
  peekClaimableReferralState,
  type ReferralInvite,
} from './referral_vip';
import { claimReferralSpins, devGrantReferralSpin, readCachedSpinCredits } from './roulette_spin_client';
import { preloadRoulettePrizeImages, ROULETTE_PRIZES } from './roulette_prizes';
import { useReferralRoulettePolicy } from './referral_roulette_flag';
import { formatReferralSunsetDate, referralSunsetCopy } from './referral_sunset_copy';
import { selectAccountScopedReferralState, selectReferralSurfaceState } from './referral_surface_state';
import { copyReferralCodeForAccount } from './referral_code_clipboard';
import { ensureInviteCodeShared, invalidateInviteCodeShared } from './invite_code_singleton';
import { buildCloudReferralInviteShare } from './referral_invite_share';
import { isReferralCloudEnabled } from './referral_cloud';
import { safeRouterBack } from './navigation_back';
import { glassFill } from '../components/GlassSurface';
import TonalSurface from '../components/TonalSurface';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import {
  REFERRAL_STATE_STORAGE_KEY,
  beginReferralInvitesRequest, commitReferralState, hydrateReferralStateFromRaw,
  isReferralInvitesRequestCurrent, readReferralDrain, readReferralInvites,
} from './referrals_cache';

function makeL(lang: Lang) {
  return (
    ru: string,
    uk: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

function shortInviteName(invite: ReferralInvite): string {
  const id = String(invite.refereeStableId || '').trim();
  if (!id) return '----';
  return id.length <= 6 ? id : id.slice(-6).toUpperCase();
}

function inviteDisplayName(invite: ReferralInvite, fallbackPrefix: string): string {
  const name = String(invite.refereeName ?? '').trim().replace(/\s+/g, ' ');
  if (name) return name;
  return `${fallbackPrefix} #${shortInviteName(invite)}`;
}

/** Кэш последнего успешного списка приглашений — экран рисуется мгновенно, без скелетонов. */
export default function ReferralsScreen() {
  const router = useRouter();
  const { theme: t, f, ds } = useTheme();
  const { lang } = useLang();
  const L = makeL(lang as Lang);
  const renderToken = captureAccountGeneration();
  const renderAccountScope = accountScopeKey(renderToken);
  const initialWarm = readReferralInvites(renderToken);
  const initialDrain = readReferralDrain(renderToken);
  const [loadedAccountScope, setLoadedAccountScope] = useState<string | null>(() => renderAccountScope);
  const [inviteState, setInvites] = useState<ReferralInvite[]>(() => initialWarm?.value ?? []);
  const [loading, setLoading] = useState(() => initialWarm === null);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** Дубликат реф-кода из /friends — чтобы код можно было найти, когда в Друзьях уже есть люди. */
  const referralEnabled = isReferralCloudEnabled();
  const roulettePolicy = useReferralRoulettePolicy();
  const warmReferralState = peekClaimableReferralState();
  const [drain, setDrain] = useState(() => initialDrain?.value ?? warmReferralState?.drain ?? {
    softEnabled: roulettePolicy.softEnabled,
    emergencyStop: roulettePolicy.emergencyStop,
    serverNowMs: 0,
    activePendingCount: 0,
    claimableQualifiedCount: 0,
    availableCreditCount: 0,
    latestPendingDeadlineMs: 0,
    earliestCreditExpiryMs: 0,
  });
  const [hasServerDrain, setHasServerDrain] = useState(() => !!initialDrain || !!warmReferralState);
  const [spinCreditState, setSpinCredits] = useState(() => (
    initialDrain?.value.availableCreditCount ?? warmReferralState?.drain.availableCreditCount ?? 0
  ));
  const scopedReferralState = selectAccountScopedReferralState(renderAccountScope, {
    accountKey: loadedAccountScope,
    invites: inviteState,
    drain: hasServerDrain ? drain : null,
    spins: spinCreditState,
  });
  const invites = scopedReferralState.invites;
  const spinCredits = scopedReferralState.spins;
  const visibleLoading = loading || !scopedReferralState.accountMatches;
  const referralSurface = selectReferralSurfaceState({
    referralEnabled,
    remotePolicy: roulettePolicy,
    persistedDrain: scopedReferralState.drain,
  });
  const marketingVisible = referralSurface.marketingVisible;
  const drainVisible = referralSurface.drainVisible;
  const referralUiVisible = marketingVisible || drainVisible;
  const sunsetCopy = referralSunsetCopy[lang as Lang] ?? referralSunsetCopy.ru;
  const [referralCodeState, setReferralCode] = useState<string | null>(null);
  const [referralCodeAccountScope, setReferralCodeAccountScope] = useState<string | null>(() => (
    renderAccountScope
  ));
  const referralCode = selectAccountScopedReferralState(renderAccountScope, {
    accountKey: referralCodeAccountScope,
    referralCode: referralCodeState,
  }).referralCode;
  const [codeCopied, setCodeCopied] = useState(false);
  const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (options: { force?: boolean } = {}) => {
    if (!referralEnabled || referralSurface.emergencyStop) {
      setLoading(false);
      return;
    }
    const token = captureAccountGeneration();
    const requestScope = accountScopeKey(token);
    if (requestScope !== renderAccountScope) return;
    const warm = readReferralInvites(token);
    const request = beginReferralInvitesRequest(token);
    if (warm) {
      setLoadedAccountScope(requestScope);
      setInvites(warm.value);
      setLoading(false);
    } else {
      setLoading(true);
    }
    if (!options.force && warm?.isFresh) return;
    try {
      const state = await getClaimableReferralState({ force: options.force });
    // ok:false = сеть/сервер не ответили — не затираем показанный кэш пустотой.
      if (!state.ok || !commitReferralState(request, state.invites, state.drain)) return;
        setLoadedAccountScope(requestScope);
        setInvites(state.invites);
        setDrain(state.drain);
        setHasServerDrain(true);
        setSpinCredits(state.drain.availableCreditCount);
    } finally {
      if (isReferralInvitesRequestCurrent(request)) setLoading(false);
    }
  }, [referralEnabled, referralSurface.emergencyStop, renderAccountScope]);

  useEffect(() => {
    if (!referralEnabled || referralSurface.emergencyStop) {
      setSpinCredits(0);
      return;
    }
    let alive = true;
    const persistenceToken = captureAccountGeneration();
    // Мгновенная гидрация из кэша: экран не «грузится каждый раз», сервер обновляет фоном.
    void AsyncStorage.getItem(REFERRAL_STATE_STORAGE_KEY)
      .then(raw => {
        if (!alive || !raw) return;
        try {
          const token = persistenceToken;
          if (hydrateReferralStateFromRaw(raw, token) && isCurrentAccountGeneration(token)) {
            const current = readReferralInvites(token);
            const currentDrain = readReferralDrain(token);
            if (!current || !currentDrain) return;
            setLoadedAccountScope(accountScopeKey(token));
            setInvites(current.value);
            setDrain(currentDrain.value);
            setHasServerDrain(true);
            setSpinCredits(currentDrain.value.availableCreditCount);
            setLoading(false);
          }
        } catch { /* битый кэш — просто ждём сеть */ }
      })
      .catch(() => {});
    load()
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [load, referralEnabled, referralSurface.emergencyStop, renderAccountScope]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load({ force: true }).catch(() => {});
    setRefreshing(false);
  }, [load]);

  // Прокруты рулетки Plus: конвертируем qualified-приглашения (капы на сервере),
  // счётчик — мгновенно из кэша, затем сеть.
  useEffect(() => {
    if (!referralUiVisible) {
      setSpinCredits(0);
      return;
    }
    let alive = true;
    const requestToken = captureAccountGeneration();
    void (async () => {
      const claim = await claimReferralSpins().catch(() => null);
      if (!alive || !isCurrentAccountGeneration(requestToken)) return;
      if (claim && typeof claim.spinsTotal === 'number') {
        setSpinCredits(claim.spinsTotal);
        await load({ force: true }).catch(() => {});
      }
      else {
        const cached = await readCachedSpinCredits();
        if (alive && isCurrentAccountGeneration(requestToken)) setSpinCredits(cached);
      }
    })();
    return () => { alive = false; };
  }, [load, referralUiVisible]);

  useEffect(() => {
    if (referralUiVisible && spinCredits > 0) void preloadRoulettePrizeImages().catch(() => {});
  }, [referralUiVisible, spinCredits]);

  // DEV: кнопка «+1 прокрут» (только __DEV__; гейт/лимит 10-в-сутки — на сервере).
  const [devGrantBusy, setDevGrantBusy] = useState(false);
  const onDevGrantSpin = useCallback(async () => {
    if (devGrantBusy) return;
    setDevGrantBusy(true);
    try {
      const res = await devGrantReferralSpin();
      if (res.ok) {
        // Успех — без лишней дев-плашки: счётчик обновляется прямо в чипе.
        setSpinCredits(res.spinsTotal);
      } else if (res.reason === 'daily_limit') {
        setMessage('DEV: лимит 10 прокрутов в сутки исчерпан');
      } else if (res.reason === 'disabled') {
        setMessage('DEV: выдача прокрутов выключена (remote_config)');
      } else {
        setMessage(`DEV: не удалось выдать прокрут (${res.code ?? 'error'})`);
      }
    } finally {
      setDevGrantBusy(false);
    }
  }, [devGrantBusy]);

  // Реф-код: тот же серверный код, что в /friends. Ретрай/бэкофф — внутри синглтона
  // (dedupe с friends.tsx — один сетевой проход на процесс).
  useEffect(() => {
    invalidateInviteCodeShared(renderAccountScope);
    setReferralCodeAccountScope(renderAccountScope);
    setReferralCode(null);
    setCodeCopied(false);
  }, [renderAccountScope]);

  useEffect(() => {
    if (!marketingVisible || referralCode) return;
    let cancelled = false;
    const requestToken = captureAccountGeneration();
    const requestAccountScope = accountScopeKey(requestToken);
    void ensureInviteCodeShared('User').then(code => {
      if (
        !cancelled
        && code
        && requestAccountScope === renderAccountScope
        && isCurrentAccountGeneration(requestToken)
      ) {
        setReferralCodeAccountScope(requestAccountScope);
        setReferralCode(code);
      }
    });
    return () => { cancelled = true; };
  }, [marketingVisible, referralCode, renderAccountScope]);

  /** «Пригласить» — системный Share; с кэшированным кодом открывается мгновенно. */
  const [inviteBusy, setInviteBusy] = useState(false);
  const handleInvite = useCallback(async () => {
    if (inviteBusy) return;
    const requestToken = captureAccountGeneration();
    if (accountScopeKey(requestToken) !== renderAccountScope) return;
    hapticTap();
    setInviteBusy(true);
    try {
      const share = await buildCloudReferralInviteShare({ lang: lang as Lang, userName: 'User' }).catch(() => null);
      if (
        accountScopeKey(requestToken) !== renderAccountScope
        || !isCurrentAccountGeneration(requestToken)
      ) return;
      if (share?.message) {
        await Share.share({ message: share.message });
      } else {
        setMessage(L(
          'Код ещё готовится — проверь сеть и попробуй через пару секунд.',
          'Код ще готується — перевір мережу і спробуй за кілька секунд.',
          'Tu código aún se está preparando: revisa la conexión e inténtalo en unos segundos.',
          'Seu código ainda está sendo preparado — verifique a conexão e tente em alguns segundos.',
          'Mã của bạn đang được chuẩn bị — kiểm tra mạng và thử lại sau vài giây.',
          'Kodemu masih disiapkan — periksa jaringan dan coba lagi beberapa detik lagi.',
          'Kodun hazırlanıyor — bağlantıyı kontrol edip birkaç saniye sonra tekrar dene.',
          'Twój kod jest jeszcze przygotowywany — sprawdź sieć i spróbuj za kilka sekund.',
        ));
      }
    } finally {
      setInviteBusy(false);
    }
  }, [L, inviteBusy, lang, renderAccountScope]);

  const copyReferralCode = useCallback(async () => {
    if (!referralCode || !renderAccountScope) return;
    hapticTap();
    try {
      const copied = await copyReferralCodeForAccount({
        accountToken: renderToken,
        accountKey: renderAccountScope,
        code: referralCode,
        readText: Clipboard.getStringAsync,
        writeText: async (value) => {
          await Clipboard.setStringAsync(value);
        },
      });
      if (!copied) return;
      setCodeCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCodeCopied(false), 1600);
    } catch { /* буфер недоступен — код всё равно виден на экране */ }
  }, [referralCode, renderAccountScope, renderToken]);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const renderInvite = (invite: ReferralInvite, index: number) => {
    const qualified = invite.status === 'qualified';
    const rewarded = invite.status === 'rewarded';
    const skipped = invite.status === 'skipped_referrer_cap';
    const spinReady = qualified || skipped;
    const statusText = rewarded
      ? L('Прокрут начислен', 'Прокрут нараховано', 'Giro añadido', 'Giro adicionado', 'Đã cộng lượt quay', 'Putaran ditambahkan', 'Çevirme eklendi', 'Los dodany')
      : spinReady
        ? L('Прокрут готов', 'Прокрут готовий', 'Giro listo', 'Giro pronto', 'Lượt quay đã sẵn sàng', 'Putaran siap', 'Çevirme hazır', 'Los jest gotowy')
        : L('Ждём первый урок', 'Чекаємо перший урок', 'Esperando la primera lección', 'Aguardando a primeira lição', 'Đang chờ bài học đầu tiên', 'Menunggu pelajaran pertama', 'İlk ders bekleniyor', 'Czekamy na pierwszą lekcję');
    const displayName = inviteDisplayName(invite, L('Друг', 'Друг', 'Amigo', 'Amigo', 'Bạn', 'Teman', 'Arkadaş', 'Znajomy'));

    return (
      <TonalSurface
        key={`${invite.refereeStableId}-${index}`}
        testID={`referrals-row-${invite.refereeStableId || index}`}
        radius={18}
        tone={spinReady ? 'raised' : 'subtle'}
        backgroundColor={spinReady ? t.accentBg : glassFill(t.bgSurface, 0.46)}
        style={{
          padding: 14,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgSurface }}>
            <Ionicons name={spinReady ? 'sparkles-outline' : 'person-outline'} size={22} color={spinReady ? t.accent : t.textMuted} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body ?? 16, fontWeight: '700' }} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={{ color: spinReady ? t.accent : t.textMuted, fontSize: f.sub ?? 13, fontWeight: '700', marginTop: 2 }}>
              {statusText}
            </Text>
          </View>
        </View>
      </TonalSurface>
    );
  };

  return (
    <ScreenGradient artBackdrop="friends">
      <SafeAreaView testID="screen-referrals" style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.accent} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34, gap: 16 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TapScale
              accessibilityRole="button"
              accessibilityLabel={L('Назад', 'Назад', 'Atrás', 'Voltar', 'Quay lại', 'Kembali', 'Geri', 'Wstecz')}
              onPress={() => safeRouterBack(router, '/(tabs)/friends' as any)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.bgSurface,
                marginRight: 12,
              }}
            >
              <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
            </TapScale>
            <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.h1 ?? 28, fontWeight: '700' }}>
              {L('Рефералы', 'Реферали', 'Referidos', 'Indicados', 'Giới thiệu', 'Referal', 'Davetler', 'Polecenia')}
            </Text>
          </View>

          {referralUiVisible && (
            <TonalSurface
              testID="referrals-roulette-hero"
              radius={20}
              tone="raised"
              backgroundColor={t.accentBg}
              style={{ padding: 18, gap: 14 }}
            >
              <Text
                style={{ color: t.textPrimary, fontSize: f.h2 ?? 22, lineHeight: 28, fontFamily: ds.fontFamily, fontWeight: '700' }}
                numberOfLines={1}
              >
                {drainVisible
                  ? sunsetCopy.drainTitle
                  : L('Рулетка Plus', 'Рулетка Plus', 'Ruleta Plus', 'Roleta Plus', 'Vòng quay Plus', 'Roulette Plus', 'Plus Ruleti', 'Ruletka Plus')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, backgroundColor: t.bgSurface }}>
                  <Text style={{ color: spinCredits > 0 ? t.accent : t.textSecond, fontSize: f.sub ?? 13, fontFamily: ds.fontFamily, fontWeight: '700' }}>
                    {L(`Прокрутов: ${spinCredits}`, `Прокрутів: ${spinCredits}`, `Giros: ${spinCredits}`, `Giros: ${spinCredits}`, `Lượt quay: ${spinCredits}`, `Putaran: ${spinCredits}`, `Çevirme: ${spinCredits}`, `Losy: ${spinCredits}`)}
                  </Text>
                </View>
                {marketingVisible && __DEV__ && (
                  <TouchableOpacity
                    testID="referrals-roulette-dev-grant"
                    accessibilityRole="button"
                    accessibilityLabel="DEV: добавить один прокрут"
                    activeOpacity={0.8}
                    disabled={devGrantBusy}
                    onPress={() => void onDevGrantSpin()}
                    style={{ minHeight: 34, paddingHorizontal: 11, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgSurface, opacity: devGrantBusy ? 0.6 : 1 }}
                  >
                    {devGrantBusy
                      ? <ActivityIndicator size="small" color={t.accent} />
                      : <Text style={{ color: t.accent, fontSize: f.sub ?? 13, fontFamily: ds.fontFamily, fontWeight: '700' }}>DEV +1</Text>}
                  </TouchableOpacity>
                )}
              </View>
              {marketingVisible && <View testID="referrals-roulette-preview" style={{ width: '100%', height: 112 }}>
                <ScrollView
                  testID="referrals-roulette-preview-rail"
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingRight: 2 }}
                >
                  {ROULETTE_PRIZES.map((prize) => (
                    <View key={prize.index} style={{ width: 156, height: 104, borderRadius: 14, overflow: 'hidden', backgroundColor: t.bgSurface }}>
                      <Image source={prize.image} style={{ width: '100%', height: '100%' }} contentFit="contain" cachePolicy="memory-disk" priority={spinCredits > 0 ? 'high' : 'normal'} />
                    </View>
                  ))}
                </ScrollView>
              </View>}
              <Text style={{ color: t.textSecond, fontSize: f.body ?? 16, lineHeight: 23, fontFamily: ds.fontFamily, fontWeight: '400' }}>
                {drainVisible ? sunsetCopy.drainBody : L(
                  'Пригласи друга — когда он введёт твой код и закончит первый урок, получишь 1 прокрут. В рулетке — Plus от 1 дня до 365 дней.',
                  'Запроси друга — коли він введе твій код і закінчить перший урок, отримаєш 1 прокрут. У рулетці — Plus від 1 до 365 днів.',
                  'Invita a un amigo: cuando use tu código y termine la primera lección, recibirás 1 giro. En la ruleta hay Plus de 1 a 365 días.',
                  'Convide um amigo: quando ele usar seu código e concluir a primeira lição, você recebe 1 giro. Na roleta há Plus de 1 a 365 dias.',
                  'Mời một người bạn: khi họ nhập mã của bạn và hoàn thành bài học đầu tiên, bạn nhận 1 lượt quay. Phần thưởng Plus từ 1 đến 365 ngày.',
                  'Undang teman: setelah memasukkan kodemu dan menyelesaikan pelajaran pertama, kamu mendapat 1 putaran. Hadiah Plus dari 1 sampai 365 hari.',
                  'Bir arkadaşını davet et: kodunu girip ilk dersi bitirdiğinde 1 çevirme kazanırsın. Rulette 1–365 gün Plus var.',
                  'Zaproś znajomego: gdy wpisze twój kod i ukończy pierwszą lekcję, dostaniesz 1 los. W ruletce wygrywa się od 1 do 365 dni Plus.',
                )}
              </Text>
              {drainVisible && drain.latestPendingDeadlineMs > 0 && (
                <View testID="referrals-sunset-pending-deadline" style={{ padding: 12, borderRadius: 14, backgroundColor: t.bgSurface }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.sub ?? 13, fontWeight: '700' }}>
                    {sunsetCopy.pendingDeadline}: {formatReferralSunsetDate(drain.latestPendingDeadlineMs, lang as Lang)}
                  </Text>
                </View>
              )}
              {drainVisible && drain.earliestCreditExpiryMs > 0 && (
                <View testID="referrals-sunset-spin-expiry" style={{ padding: 12, borderRadius: 14, backgroundColor: t.bgSurface }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.sub ?? 13, fontWeight: '700' }}>
                    {sunsetCopy.spinExpiry}: {formatReferralSunsetDate(drain.earliestCreditExpiryMs, lang as Lang)}
                  </Text>
                </View>
              )}
              {spinCredits > 0 && <TouchableOpacity
                testID="referrals-roulette-spin"
                accessibilityRole="button"
                activeOpacity={0.84}
                onPress={() => router.push('/roulette' as any)}
                style={{ minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: t.accent }}
              >
                <Ionicons name="refresh-circle" size={20} color={t.correctText} />
                <Text style={{ color: t.correctText, fontSize: f.body ?? 16, fontFamily: ds.fontFamily, fontWeight: '700' }}>
                  {L('Крутить', 'Крутити', 'Girar', 'Girar', 'Quay', 'Putar', 'Çevir', 'Zakręć')}
                </Text>
              </TouchableOpacity>}
              {marketingVisible && <TouchableOpacity
                testID="referrals-roulette-about"
                accessibilityRole="link"
                activeOpacity={0.8}
                onPress={() => router.push('/roulette_about' as any)}
                style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
              >
                <Ionicons name="information-circle-outline" size={17} color={t.textSecond} />
                <Text style={{ color: t.textSecond, fontSize: f.sub ?? 13, fontFamily: ds.fontFamily, fontWeight: '400' }}>
                  {L('Как это работает', 'Як це працює', 'Cómo funciona', 'Como funciona', 'Cách hoạt động', 'Cara kerjanya', 'Nasıl çalışır', 'Jak to działa')}
                </Text>
              </TouchableOpacity>}
            </TonalSurface>
          )}

          {referralUiVisible && (
          <TonalSurface radius={20} tone="raised" backgroundColor={glassFill(t.bgSurface, 0.46)} style={{ padding: 18, gap: 10 }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgSurface }}>
              <Ionicons name="people-outline" size={24} color={t.accent} />
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.h2 ?? 22, lineHeight: 28, fontWeight: '700' }}>
              {L('Твои приглашения', 'Твої запрошення', 'Tus invitaciones', 'Seus convites', 'Lời mời của bạn', 'Undanganmu', 'Davetlerin', 'Twoje zaproszenia')}
            </Text>
            <Text testID="referrals-condition-hint" style={{ color: t.textSecond, fontSize: f.body ?? 16, lineHeight: 23, fontWeight: '700' }}>
              {drainVisible ? sunsetCopy.drainBody : L(
                'Здесь появятся приглашённые друзья. За каждого друга, который введёт твой код и закончит первый урок, начисляется 1 прокрут.',
                'Тут з’являться запрошені друзі. За кожного друга, який введе твій код і закінчить перший урок, нараховується 1 прокрут.',
                'Aquí aparecerán tus amigos invitados. Cada amigo que use tu código y termine la primera lección te da 1 giro.',
                'Seus amigos convidados aparecerão aqui. Cada amigo que usar seu código e concluir a primeira lição dá 1 giro.',
                'Bạn bè được mời sẽ xuất hiện ở đây. Mỗi người nhập mã của bạn và hoàn thành bài học đầu tiên sẽ cho bạn 1 lượt quay.',
                'Teman yang kamu undang muncul di sini. Setiap teman yang memasukkan kodemu dan menyelesaikan pelajaran pertama memberi 1 putaran.',
                'Davet ettiğin arkadaşlar burada görünür. Kodunu girip ilk dersi bitiren her arkadaş 1 çevirme kazandırır.',
                'Tutaj pojawią się zaproszeni znajomi. Każdy, kto wpisze twój kod i ukończy pierwszą lekcję, daje ci 1 los.',
              )}
            </Text>
          </TonalSurface>
          )}

          {marketingVisible && (
            <TouchableOpacity
              testID="referrals-invite"
              accessibilityRole="button"
              activeOpacity={0.84}
              disabled={inviteBusy}
              onPress={() => { void handleInvite(); }}
              style={{
                minHeight: 54,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: t.accent,
                opacity: inviteBusy ? 0.7 : 1,
              }}
            >
              {inviteBusy
                ? <ActivityIndicator color={t.correctText} />
                : <Ionicons name="share-social" size={20} color={t.correctText} />}
              <Text style={{ color: t.correctText, fontSize: f.body ?? 16, fontWeight: '700' }}>
                {L('Пригласить друга', 'Запросити друга', 'Invitar a un amigo', 'Convidar um amigo', 'Mời bạn bè', 'Undang teman', 'Arkadaş davet et', 'Zaproś znajomego')}
              </Text>
            </TouchableOpacity>
          )}

          {marketingVisible && referralCode ? (
            <TonalSurface
              testID="referrals-my-code-card"
              radius={20}
              style={{ padding: 18, gap: 12 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="gift-outline" size={18} color={t.accent} />
                <Text style={{ color: t.textPrimary, fontSize: f.body ?? 16, fontWeight: '700', flex: 1 }} numberOfLines={2}>
                  {L('Твой код для друзей', 'Твій код для друзів', 'Tu código para amigos', 'Seu código para amigos', 'Mã của bạn cho bạn bè', 'Kode untuk temanmu', 'Arkadaşların için kodun', 'Twój kod dla znajomych')}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={copyReferralCode}
                accessibilityRole="button"
                accessibilityLabel={L('Скопировать код', 'Скопіювати код', 'Copiar código', 'Copiar código', 'Sao chép mã', 'Salin kode', 'Kodu kopyala', 'Skopiuj kod')}
                style={{ backgroundColor: t.bgSurface, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' }}
              >
                <Text testID="referrals-my-code-value" style={{ color: t.accent, fontSize: f.h2 ?? 22, fontWeight: '700', letterSpacing: 3 }} maxFontSizeMultiplier={1.2}>
                  {referralCode}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={copyReferralCode}
                accessibilityRole="button"
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12, backgroundColor: t.bgSurface }}
              >
                <Ionicons name={codeCopied ? 'checkmark' : 'copy-outline'} size={16} color={codeCopied ? t.accent : t.textSecond} />
                <Text style={{ color: codeCopied ? t.accent : t.textPrimary, fontSize: f.sub ?? 13, fontWeight: '700' }}>
                  {codeCopied
                    ? L('Скопировано', 'Скопійовано', 'Copiado', 'Copiado', 'Đã sao chép', 'Tersalin', 'Kopyalandı', 'Skopiowano')
                    : L('Копировать', 'Копіювати', 'Copiar', 'Copiar', 'Sao chép', 'Salin', 'Kopyala', 'Kopiuj')}
                </Text>
              </TouchableOpacity>
            </TonalSurface>
          ) : null}

          {referralUiVisible && message && (
            <View style={{ borderRadius: 16, padding: 12, backgroundColor: t.bgSurface }}>
              <Text testID="referrals-feedback" style={{ color: t.textPrimary, fontSize: f.sub ?? 13, lineHeight: 20, fontWeight: '700' }}>{message}</Text>
            </View>
          )}

          {referralUiVisible && (visibleLoading ? (
            <View style={{ gap: 12 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBlock key={`referral-skeleton-${i}`} width="100%" height={76} borderRadius={18} />
              ))}
            </View>
          ) : invites.length > 0 ? (
            <View style={{ gap: 12 }}>
              {invites.map(renderInvite)}
            </View>
          ) : null)}
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
