/**
 * Единый экран «Награда за друга» (/referrals).
 *
 * зачем: владелец схлопнул 5 экранов рефералки в один — дуга призовых карточек
 * (Kimi-стиль, components/prize_arc) крутится прямо здесь, ввод чужого кода и
 * «как это работает» стали шитами, отдельные экраны ленты/объяснялки/ввода
 * удалены. Результат спина определяет СЕРВЕР (referralSpin) — экран лишь
 * докручивает дугу до выданного приза и показывает модалку выигрыша.
 *
 * Параметр ?enter=1 (из настроек «Ввести реферальный код») открывает шит ввода.
 * Режимы сворачивания программы (drain/emergencyStop/softEnabled) сохранены.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import ScreenGradient from '../components/ScreenGradient';
import SectionSheetHeader from '../components/SectionSheetHeader';
import SkeletonBlock from '../components/SkeletonShimmer';
import TapScale from '../components/TapScale';
import PrizeArc, { type PrizeArcHandle } from '../components/prize_arc';
import ReferralCodeSheet from '../components/referral_code_sheet';
import ReferralHowSheet from '../components/referral_how_sheet';
import RouletteWinModal from '../components/roulette_win_modal';
import type { RouletteWinData } from '../components/roulette_win_modal';
import RouletteWinCelebration from '../components/roulette_win_celebration';
import ReferralFriendRewardModal from '../components/referral_friend_reward_modal';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import {
  getClaimableReferralState,
  peekClaimableReferralState,
  type ReferralInvite,
} from './referral_vip';
import {
  claimReferralSpins,
  devGrantReferralSpin,
  readCachedSpinCredits,
  spinReferralRoulette,
} from './roulette_spin_client';
import { preloadRoulettePrizeImages } from './roulette_prizes';
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

/**
 * Докрутка дуги с JS-дедлайном: выданный сервером приз не имеет права
 * потеряться за декоративной анимацией (UI-thread callback может не прийти —
 * см. контракт referral_roulette_finish). Promise.race гарантирует показ
 * модалки не позже дедлайна.
 */
const SPIN_SETTLE_DEADLINE_MS = 3_600;
function settlePrizeArcAnimation(startLanding: () => Promise<void> | undefined): Promise<void> {
  const landing = startLanding();
  if (!landing) return Promise.resolve();
  let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
  const deadline = new Promise<void>((resolve) => {
    deadlineTimer = setTimeout(resolve, SPIN_SETTLE_DEADLINE_MS);
  });
  return Promise.race([landing, deadline]).finally(() => {
    if (deadlineTimer) clearTimeout(deadlineTimer);
  });
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
  const params = useLocalSearchParams<{ enter?: string; source?: string }>();
  const closeFallback = params.source === 'settings' ? '/(tabs)/settings' : '/(tabs)/friends';
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
  // Серверный список приглашений может прийти позже DEV-гранта со старым нулём.
  // До первого свежего подтверждения он не имеет права отнять уже выданный ключ.
  const devGrantedCreditsFloorRef = useRef(0);
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

  // ── Шиты и спин ─────────────────────────────────────────────────────────────
  const arcRef = useRef<PrizeArcHandle>(null);
  const [spinning, setSpinning] = useState(false);
  const spinningRef = useRef(false);
  const [win, setWin] = useState<RouletteWinData | null>(null);
  const [winCelebrationVisible, setWinCelebrationVisible] = useState(false);
  const winTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [codeSheetOpen, setCodeSheetOpen] = useState(false);
  const [howSheetOpen, setHowSheetOpen] = useState(false);

  // зачем: владелец (2026-07-25) — раньше при появлении готового ключа (друг
  // оформил Plus/Pro и статус приглашения перешёл в qualified/skipped) экран
  // просто молча перерисовывал строку без обратной связи. Диффим предыдущий
  // снимок invites против нового: если чей-то статус ВПЕРВЫЕ стал «ключ готов»,
  // показываем поздравительную модалку (оптимистично, по факту прихода данных
  // с сервера — сам грант ключа уже произошёл на сервере, тут только клиентская
  // реакция на замеченное изменение, без придуманного триггера).
  const prevInviteStatusRef = useRef<Map<string, string> | null>(null);
  const [rewardCelebration, setRewardCelebration] = useState<{ name: string } | null>(null);
  useEffect(() => {
    const prevMap = prevInviteStatusRef.current;
    const nextMap = new Map(invites.map(inv => [inv.refereeStableId, inv.status]));
    if (prevMap) {
      for (const invite of invites) {
        const prevStatus = prevMap.get(invite.refereeStableId);
        const nowReady = invite.status === 'qualified' || invite.status === 'skipped_referrer_cap';
        const wasReady = prevStatus === 'qualified' || prevStatus === 'skipped_referrer_cap';
        if (nowReady && !wasReady && prevStatus !== undefined) {
          setRewardCelebration({
            name: inviteDisplayName(invite, L('Друг', 'Друг', 'Amigo', 'Amigo', 'Bạn', 'Teman', 'Arkadaş', 'Znajomy')),
          });
          break;
        }
      }
    }
    prevInviteStatusRef.current = nextMap;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invites]);

  // Из настроек «Ввести реферальный код» → тот же экран с открытым шитом.
  const enterParamHandledRef = useRef(false);
  useEffect(() => {
    if (enterParamHandledRef.current) return;
    if (params.enter === '1' && marketingVisible) {
      enterParamHandledRef.current = true;
      setCodeSheetOpen(true);
    }
  }, [params.enter, marketingVisible]);

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
        const serverCredits = state.drain.availableCreditCount;
        const protectedCredits = Math.max(serverCredits, devGrantedCreditsFloorRef.current);
        if (serverCredits >= devGrantedCreditsFloorRef.current) {
          devGrantedCreditsFloorRef.current = 0;
        }
        const protectedDrain = { ...state.drain, availableCreditCount: protectedCredits };
        setLoadedAccountScope(requestScope);
        setInvites(state.invites);
        setDrain(protectedDrain);
        setHasServerDrain(true);
        setSpinCredits(protectedCredits);
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
            setDrain({
              ...currentDrain.value,
              availableCreditCount: Math.max(
                currentDrain.value.availableCreditCount,
                devGrantedCreditsFloorRef.current,
              ),
            });
            setHasServerDrain(true);
            setSpinCredits(Math.max(
              currentDrain.value.availableCreditCount,
              devGrantedCreditsFloorRef.current,
            ));
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

  // Ключи: конвертируем qualified-приглашения (капы на сервере),
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
        const cached = await readCachedSpinCredits();
        if (!alive || !isCurrentAccountGeneration(requestToken)) return;
        setSpinCredits(Math.max(claim.spinsTotal, cached, devGrantedCreditsFloorRef.current));
        await load({ force: true }).catch(() => {});
      }
      else {
        const cached = await readCachedSpinCredits();
        if (alive && isCurrentAccountGeneration(requestToken)) {
          setSpinCredits(Math.max(cached, devGrantedCreditsFloorRef.current));
        }
      }
    })();
    return () => { alive = false; };
  }, [load, referralUiVisible]);

  useEffect(() => {
    if (referralUiVisible) void preloadRoulettePrizeImages().catch(() => {});
  }, [referralUiVisible]);

  useEffect(() => () => {
    spinningRef.current = false;
    if (winTimerRef.current) clearTimeout(winTimerRef.current);
  }, []);

  // ── Серверный выигрыш: дуга стартует мгновенно, сервер решает в фоне ────────
  const onSpin = useCallback(async () => {
    if (spinningRef.current || spinCredits <= 0) return;
    hapticTap();
    const spinAccount = captureAccountGeneration();
    spinningRef.current = true;
    setSpinning(true);
    // зачем: владелец (2026-07-26) — на «Получить приз» НЕТ загрузки: вращение
    // дуги и локальное списание ключа происходят сразу по нажатию, сервер
    // подтверждает в фоне. Ошибка → мягкая остановка дуги и откат ключа.
    // guard-ok: списание чисто локальное (в кэш/сервер не пишется), при ошибке
    // откатывается ниже, при успехе перезаписывается серверным spinsLeft.
    const creditsBeforeSpin = spinCredits;
    const floorBeforeSpin = devGrantedCreditsFloorRef.current;
    devGrantedCreditsFloorRef.current = Math.min(floorBeforeSpin, Math.max(0, creditsBeforeSpin - 1)); // guard-ok
    setSpinCredits(Math.max(0, creditsBeforeSpin - 1)); // guard-ok

    arcRef.current?.startSpin();
    try {
      // Карточки уже рендерятся через expo-image; preload — только прогрев.
      // Asset.loadAsync иногда не завершает Promise, поэтому ждать его перед
      // серверным spin нельзя: сервер сначала должен подтвердить и списать ключ.
      void preloadRoulettePrizeImages().catch(() => {});
      const outcome = await spinReferralRoulette();
      if (!isCurrentAccountGeneration(spinAccount)) {
        arcRef.current?.stopSpin();
        return;
      }
      if (!outcome.ok) {
        arcRef.current?.stopSpin();
        if (outcome.reason === 'no_spins') {
          devGrantedCreditsFloorRef.current = 0;
          setSpinCredits(0);
          setMessage(L('Ключи закончились — пригласи друга', 'Ключі закінчилися — запроси друга', 'No quedan llaves: invita a un amigo', 'As chaves acabaram — convide um amigo', 'Đã hết chìa khóa — hãy mời bạn', 'Kunci habis — undang teman', 'Anahtar kalmadı — bir arkadaşını davet et', 'Skończyły się klucze — zaproś znajomego'));
          return;
        }
        // Ключ НЕ потрачен — возвращаем оптимистично списанный счётчик.
        devGrantedCreditsFloorRef.current = floorBeforeSpin;
        setSpinCredits(creditsBeforeSpin);
        if (outcome.reason === 'link_required') {
          setMessage(L('Нужно связать аккаунт — загляни в профиль', 'Потрібно прив’язати акаунт — зазирни в профіль', 'Vincula tu cuenta desde el perfil', 'Vincule sua conta no perfil', 'Hãy liên kết tài khoản trong hồ sơ', 'Tautkan akunmu di profil', 'Hesabını profilden bağla', 'Połącz konto w profilu'));
        } else if (outcome.reason === 'disabled') {
          setMessage(L('Награды временно недоступны', 'Нагороди тимчасово недоступні', 'Las recompensas no están disponibles temporalmente', 'As recompensas estão temporariamente indisponíveis', 'Phần thưởng tạm thời không khả dụng', 'Hadiah sementara tidak tersedia', 'Ödüller geçici olarak kullanılamıyor', 'Nagrody są chwilowo niedostępne'));
        } else {
          // retry уже выполнен внутри клиента с тем же spinRequestId — не дублируем.
          setMessage(L('Сеть подвела — попробуй ещё раз', 'Помилка мережі — спробуй ще раз', 'Falló la red: inténtalo de nuevo', 'Falha na rede — tente novamente', 'Lỗi mạng — hãy thử lại', 'Jaringan bermasalah — coba lagi', 'Ağ hatası — tekrar dene', 'Błąd sieci — spróbuj ponownie'));
        }
        return;
      }
      devGrantedCreditsFloorRef.current = outcome.spinsLeft;
      setSpinCredits(outcome.spinsLeft);
      // Сервер уже списал ключ и авторитетно выбрал приз — докручиваем дугу до
      // него с текущей скорости; JS-дедлайн не даст модалке потеряться.
      await settlePrizeArcAnimation(() => arcRef.current?.spinTo(outcome.prizeIndex));
      if (!isCurrentAccountGeneration(spinAccount)) return;
      void hapticSuccess();
      setWin({ prizeIndex: outcome.prizeIndex, prizeDays: outcome.prizeDays, vipUntil: outcome.vipUntil });
    } finally {
      spinningRef.current = false;
      setSpinning(false);
    }
  }, [L, spinCredits]);

  const closeWinAndStartCelebration = useCallback(() => {
    setWin(null);
    if (winTimerRef.current) clearTimeout(winTimerRef.current);
    // Даём fade-закрытию модалки закончиться, затем запускаем отдельную Kimi-анимацию.
    winTimerRef.current = setTimeout(() => {
      winTimerRef.current = null;
      setWinCelebrationVisible(true);
    }, 220);
  }, []);

  // DEV: кнопка «+1 ключ» (только __DEV__; гейт/лимит 10-в-сутки — на сервере).
  const [devGrantBusy, setDevGrantBusy] = useState(false);
  const onDevGrantSpin = useCallback(async () => {
    if (devGrantBusy) return;
    setDevGrantBusy(true);
    try {
      const res = await devGrantReferralSpin();
      if (res.ok) {
        // DEV-грант уже подтверждён сервером. Обновляем оба источника этого экрана
        // синхронно: иначе ранний load() с прежним drain.availableCreditCount = 0
        // способен перерисовать кнопку неактивной прямо после «DEV +1».
        const grantedSpins = Math.max(1, res.spinsTotal);
        devGrantedCreditsFloorRef.current = Math.max(devGrantedCreditsFloorRef.current, grantedSpins);
        setLoadedAccountScope(renderAccountScope);
        setSpinCredits((current) => Math.max(current, grantedSpins));
        setDrain((current) => ({
          ...current,
          availableCreditCount: Math.max(current.availableCreditCount, grantedSpins),
        }));
        setHasServerDrain(true);
        setMessage('DEV: ключ добавлен — нажми «Получить приз», чтобы увидеть серверный выигрыш.');
      } else if (res.reason === 'disabled') {
        setMessage('DEV: выдача ключей выключена (remote_config)');
      } else {
        setMessage(`DEV: не удалось выдать ключ (${res.code ?? 'error'})`);
      }
    } finally {
      setDevGrantBusy(false);
    }
  }, [devGrantBusy, renderAccountScope]);

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
      ? L('Ключ начислен', 'Ключ нараховано', 'Llave añadida', 'Chave adicionada', 'Đã cộng chìa khóa', 'Kunci ditambahkan', 'Anahtar eklendi', 'Klucz dodany')
      : spinReady
        ? L('Ключ готов', 'Ключ готовий', 'Llave lista', 'Chave pronta', 'Chìa khóa đã sẵn sàng', 'Kunci siap', 'Anahtar hazır', 'Klucz jest gotowy')
        : L('Ждём покупку Plus', 'Чекаємо на покупку Plus', 'Esperando la compra de Plus', 'Aguardando a compra do Plus', 'Đang chờ mua Plus', 'Menunggu pembelian Plus', 'Plus satın alımı bekleniyor', 'Czekamy na zakup Plus');
    const displayName = inviteDisplayName(invite, L('Друг', 'Друг', 'Amigo', 'Amigo', 'Bạn', 'Teman', 'Arkadaş', 'Znajomy'));

    // зачем: владелец (2026-07-25) — список друзей раньше просто «выпрыгивал»
    // статично без входной анимации; заводим лёгкий FadeInDown как у остальных
    // карточек в friends.tsx (FoundUserCard), задержка по индексу для каскада.
    return (
      <Reanimated.View key={`${invite.refereeStableId}-${index}`} entering={FadeInDown.delay(index * 40).duration(280)}>
      <TonalSurface
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
      </Reanimated.View>
    );
  };

  // зачем: слова «рулетка/прокрут/крутить» запрещены владельцем во всём UI —
  // механика называется «Награда за друга», действие — «Забрать награду».
  const spinCtaLabel = spinning
    ? L('Открываем…', 'Відкриваємо…', 'Abriendo…', 'Abrindo…', 'Đang mở…', 'Membuka…', 'Açılıyor…', 'Otwieramy…')
    : L('Получить приз', 'Отримати приз', 'Recibir premio', 'Receber prêmio', 'Nhận quà', 'Ambil hadiah', 'Ödülü al', 'Odbierz nagrodę');

  return (
    <ScreenGradient artBackdrop="friends">
      <SafeAreaView testID="screen-referrals" style={{ flex: 1 }}>
        {/* зачем: стандарт «шторки раздела» — модал с выездом снизу; шапка
            фиксированная над скроллом, «как это работает» — аксессуар у крестика. */}
        <SectionSheetHeader
          title={drainVisible
            ? sunsetCopy.drainTitle
            : L('Награда за друга', 'Нагорода за друга', 'Recompensa por amigo', 'Recompensa por amigo', 'Phần thưởng mời bạn', 'Hadiah undang teman', 'Arkadaş ödülü', 'Nagroda za znajomego')}
          onClose={() => safeRouterBack(router, closeFallback as any)}
          accessory={referralUiVisible ? (
            <TapScale
              testID="referrals-roulette-about"
              accessibilityRole="button"
              accessibilityLabel={L('Как это работает', 'Як це працює', 'Cómo funciona', 'Como funciona', 'Cách hoạt động', 'Cara kerjanya', 'Nasıl çalışır', 'Jak to działa')}
              onPress={() => setHowSheetOpen(true)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.bgCard,
              }}
            >
              <Text style={{ color: t.textSecond, fontSize: f.sub ?? 13, fontFamily: ds.fontFamily, fontWeight: '700' }}>?</Text>
            </TapScale>
          ) : undefined}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.accent} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 34, gap: 16 }}
        >

          {referralUiVisible && (
            <View testID="referrals-roulette-hero" style={{ gap: 12 }}>
              {/* Дуга bleeds до физических краёв экрана — карточки клипаются рамкой, как у Kimi. */}
              <View style={{ marginHorizontal: -20 }}>
                <PrizeArc ref={arcRef} dimmed={false} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: spinCredits > 0 ? t.accentBg : glassFill(t.bgSurface, 0.46) }}>
                  <Ionicons name="key-outline" size={15} color={spinCredits > 0 ? t.accent : t.textSecond} />
                  <Text style={{ color: spinCredits > 0 ? t.accent : t.textSecond, fontSize: f.sub ?? 13, fontFamily: ds.fontFamily, fontWeight: '700' }}>
                    {L(`Ключей: ${spinCredits}`, `Ключів: ${spinCredits}`, `Llaves: ${spinCredits}`, `Chaves: ${spinCredits}`, `Chìa khóa: ${spinCredits}`, `Kunci: ${spinCredits}`, `Anahtar: ${spinCredits}`, `Klucze: ${spinCredits}`)}
                  </Text>
                </View>
                {marketingVisible && __DEV__ && (
                  <TouchableOpacity
                    testID="referrals-roulette-dev-grant"
                    accessibilityRole="button"
                    accessibilityLabel="DEV: добавить один ключ"
                    accessibilityState={{ disabled: devGrantBusy }}
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

              <Text testID="referrals-condition-hint" style={{ color: t.textSecond, fontSize: f.sub ?? 13, lineHeight: 19, fontFamily: ds.fontFamily, fontWeight: '400', textAlign: 'center', paddingHorizontal: 8 }}>
                {drainVisible ? sunsetCopy.drainBody : L(
                  'Пригласи друга — когда он введёт твой код и оформит Plus или Pro, получишь ключ. Награда — Plus от 1 дня до 365 дней.',
                  'Запроси друга — коли він введе твій код і оформить Plus або Pro, отримаєш ключ. Нагорода — Plus від 1 до 365 днів.',
                  'Invita a un amigo: cuando use tu código y compre Plus o Pro, recibirás una llave. Recompensa: Plus de 1 a 365 días.',
                  'Convide um amigo: quando ele usar seu código e assinar o Plus ou Pro, você recebe uma chave. Recompensa: Plus de 1 a 365 dias.',
                  'Mời một người bạn: khi họ nhập mã của bạn và mua Plus hoặc Pro, bạn nhận một chìa khóa. Phần thưởng: Plus từ 1 đến 365 ngày.',
                  'Undang teman: setelah memasukkan kodemu dan membeli Plus atau Pro, kamu mendapat kunci. Hadiah: Plus dari 1 sampai 365 hari.',
                  'Bir arkadaşını davet et: kodunu girip Plus veya Pro satın aldığında bir anahtar kazanırsın. Ödül: 1–365 gün Plus.',
                  'Zaproś znajomego: gdy wpisze twój kod i kupi Plus lub Pro, dostaniesz klucz. Nagroda: Plus od 1 do 365 dni.',
                )}
              </Text>

              <TouchableOpacity
                testID="referrals-roulette-spin"
                accessibilityRole="button"
                accessibilityState={{ disabled: spinning || spinCredits <= 0 }}
                activeOpacity={0.84}
                disabled={spinning || spinCredits <= 0}
                onPress={() => { void onSpin(); }}
                style={{ minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: spinCredits > 0 || spinning ? t.accent : t.bgSurface2, opacity: spinning ? 0.84 : 1 }}
              >
                {/* зачем: владелец (2026-07-26) — никакого спиннера на «Получить приз»:
                    отклик на нажатие — мгновенное вращение дуги, кнопка лишь меняет
                    подпись на «Открываем…» и остаётся в цвете действия. */}
                <Ionicons name="sparkles" size={18} color={spinCredits > 0 || spinning ? t.correctText : t.textMuted} />
                <Text style={{ color: spinCredits > 0 || spinning ? t.correctText : t.textMuted, fontSize: f.body ?? 16, fontFamily: ds.fontFamily, fontWeight: '700' }}>
                  {spinCtaLabel}
                </Text>
              </TouchableOpacity>

              {marketingVisible && (
                <TouchableOpacity
                  testID="referrals-invite"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: inviteBusy }}
                  activeOpacity={0.84}
                  disabled={inviteBusy}
                  onPress={() => { void handleInvite(); }}
                  style={{
                    minHeight: spinCredits > 0 ? 46 : 54,
                    borderRadius: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: spinCredits > 0 ? glassFill(t.bgSurface, 0.46) : t.accent,
                    opacity: inviteBusy ? 0.7 : 1,
                  }}
                >
                  {inviteBusy
                    ? <ActivityIndicator color={spinCredits > 0 ? t.accent : t.correctText} />
                    : <Ionicons name="share-social" size={19} color={spinCredits > 0 ? t.accent : t.correctText} />}
                  <Text style={{ color: spinCredits > 0 ? t.textPrimary : t.correctText, fontSize: f.body ?? 16, fontWeight: '700' }}>
                    {L('Пригласить друга', 'Запросити друга', 'Invitar a un amigo', 'Convidar um amigo', 'Mời bạn bè', 'Undang teman', 'Arkadaş davet et', 'Zaproś znajomego')}
                  </Text>
                </TouchableOpacity>
              )}

              {/* зачем: владелец (2026-07-26) — ряд «Ввести реферальный код» убран из
                  настроек, а тихая строка внизу экрана не находилась. Ввод кода —
                  полноценная кнопка прямо в hero, под «Пригласить друга». */}
              {marketingVisible && (
                <TouchableOpacity
                  testID="referrals-enter-code"
                  accessibilityRole="button"
                  activeOpacity={0.8}
                  onPress={() => { hapticTap(); setCodeSheetOpen(true); }}
                  style={{
                    minHeight: 46,
                    borderRadius: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: glassFill(t.bgSurface, 0.46),
                  }}
                >
                  <Ionicons name="ticket-outline" size={18} color={t.accent} />
                  <Text style={{ color: t.textPrimary, fontSize: f.body ?? 16, fontWeight: '700' }}>
                    {L('Ввести код друга', 'Ввести код друга', 'Ingresar código de amigo', 'Inserir código de amigo', 'Nhập mã của bạn bè', 'Masukkan kode teman', 'Arkadaş kodunu gir', 'Wpisz kod znajomego')}
                  </Text>
                </TouchableOpacity>
              )}

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
            </View>
          )}

          {marketingVisible && referralCode ? (
            <TonalSurface
              testID="referrals-my-code-card"
              radius={20}
              style={{ padding: 18, gap: 12 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="gift-outline" size={18} color={t.accent} />
                <Text style={{ color: t.textPrimary, fontSize: f.body ?? 16, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                  {L('Твой код', 'Твій код', 'Tu código', 'Seu código', 'Mã của bạn', 'Kodemu', 'Kodun', 'Twój kod')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={copyReferralCode}
                  accessibilityRole="button"
                  accessibilityLabel={L('Скопировать код', 'Скопіювати код', 'Copiar código', 'Copiar código', 'Sao chép mã', 'Salin kode', 'Kodu kopyala', 'Skopiuj kod')}
                  style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' }}
                >
                  <Text testID="referrals-my-code-value" style={{ color: t.accent, fontSize: f.h2 ?? 22, fontWeight: '700', letterSpacing: 3 }} maxFontSizeMultiplier={1.2}>
                    {referralCode}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={copyReferralCode}
                  accessibilityRole="button"
                  accessibilityLabel={L('Скопировать код', 'Скопіювати код', 'Copiar código', 'Copiar código', 'Sao chép mã', 'Salin kode', 'Kodu kopyala', 'Skopiuj kod')}
                  style={{ width: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: codeCopied ? t.accentBg : t.bgSurface }}
                >
                  <Ionicons name={codeCopied ? 'checkmark' : 'copy-outline'} size={20} color={codeCopied ? t.accent : t.textSecond} />
                </TouchableOpacity>
              </View>
            </TonalSurface>
          ) : null}

          {referralUiVisible && message && (
            <View style={{ borderRadius: 16, padding: 12, backgroundColor: t.bgSurface }}>
              <Text testID="referrals-feedback" style={{ color: t.textPrimary, fontSize: f.sub ?? 13, lineHeight: 20, fontWeight: '700' }}>{message}</Text>
            </View>
          )}

          {referralUiVisible && (
            <Text style={{ color: t.textMuted, fontSize: f.label ?? 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: -6 }}>
              {L('Приглашённые друзья', 'Запрошені друзі', 'Amigos invitados', 'Amigos convidados', 'Bạn bè đã mời', 'Teman yang diundang', 'Davet edilen arkadaşlar', 'Zaproszeni znajomi')}
            </Text>
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
          ) : (
            <View style={{ borderRadius: 18, padding: 14, backgroundColor: glassFill(t.bgSurface, 0.46) }}>
              <Text style={{ color: t.textSecond, fontSize: f.sub ?? 13, lineHeight: 19, fontWeight: '400' }}>
                {L('Здесь появятся друзья по твоему коду.', 'Тут з’являться друзі за твоїм кодом.', 'Aquí aparecerán los amigos que usen tu código.', 'Aqui aparecerão os amigos que usarem seu código.', 'Bạn bè dùng mã của bạn sẽ xuất hiện ở đây.', 'Teman yang memakai kodemu akan muncul di sini.', 'Kodunu kullanan arkadaşlar burada görünecek.', 'Tutaj pojawią się znajomi, którzy użyją twojego kodu.')}
              </Text>
            </View>
          ))}
        </ScrollView>

        <ReferralCodeSheet visible={codeSheetOpen} onClose={() => setCodeSheetOpen(false)} />
        <ReferralHowSheet visible={howSheetOpen} onClose={() => setHowSheetOpen(false)} />
        <RouletteWinModal data={win} onClose={closeWinAndStartCelebration} />
        <RouletteWinCelebration
          visible={winCelebrationVisible}
          onComplete={() => setWinCelebrationVisible(false)}
        />
        <ReferralFriendRewardModal
          data={rewardCelebration}
          onClose={() => setRewardCelebration(null)}
          title={L('Ключ получен!', 'Ключ отримано!', '¡Llave conseguida!', 'Chave recebida!', 'Đã nhận chìa khóa!', 'Kunci diperoleh!', 'Anahtar alındı!', 'Klucz zdobyty!')}
          subtitle={rewardCelebration
            ? L(
              `${rewardCelebration.name} оформил Plus или Pro — забирай ключ и крути награду.`,
              `${rewardCelebration.name} оформив Plus або Pro — забирай ключ і крути нагороду.`,
              `${rewardCelebration.name} activó Plus o Pro: recoge tu llave y gira la recompensa.`,
              `${rewardCelebration.name} ativou o Plus ou Pro — pegue sua chave e gire a recompensa.`,
              `${rewardCelebration.name} đã mua Plus hoặc Pro — hãy nhận chìa khóa và quay thưởng.`,
              `${rewardCelebration.name} membeli Plus atau Pro — ambil kuncimu dan putar hadiah.`,
              `${rewardCelebration.name} Plus veya Pro satın aldı — anahtarını al ve ödülü çevir.`,
              `${rewardCelebration.name} kupił Plus lub Pro — odbierz klucz i zakręć nagrodą.`,
            )
            : ''}
          ctaLabel={L('Забрать награду', 'Забрати нагороду', 'Recibir recompensa', 'Receber recompensa', 'Nhận thưởng', 'Ambil hadiah', 'Ödülü al', 'Odbierz nagrodę')}
        />
      </SafeAreaView>
    </ScreenGradient>
  );
}
