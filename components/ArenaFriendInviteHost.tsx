import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  type AppStateStatus,
  Easing,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { triLang } from '../constants/i18n';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../app/config';
import { ensureAnonUser } from '../app/cloud_sync';
import { ensureFriendRequestViewerAuthLink } from '../app/firestore_friend_requests';
import { emitAppEvent, onAppEvent } from '../app/events';
import { logEvent } from '../app/firebase';
import { useEnergy } from './EnergyContext';
import {
  subscribeIncomingArenaInvites,
  setArenaInviteStatus,
  type ArenaInviteRow,
} from '../app/services/arena_invites';
import { joinArenaFriendRoomAsGuest } from '../app/arena_friend_room_guest';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useGlobalBottomOverlayOffset } from '../hooks/use-global-bottom-overlay-offset';
import { useOverlayVisible } from './OverlayArbiter';

const INVITE_TIMEOUT_MS = 60_000;

/**
 * Входящее приглашение на арену от друга.
 * Показывается как баннер снизу (не Modal) с таймером 60 с.
 * При отклонении/истечении — пишет status='declined' в arena_invites,
 * чтобы отправитель мог подписаться и показать тост.
 */
function ArenaFriendInviteHost() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { spendOne, isUnlimited } = useEnergy();
  const bottomOffset = useGlobalBottomOverlayOffset();

  const [topInvite, setTopInvite] = useState<ArenaInviteRow | null>(null);
  const [busy, setBusy] = useState(false);
  const overlayVisible = useOverlayVisible('arenaInvite', topInvite != null);
  const shownIdsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentInviteRef = useRef<ArenaInviteRow | null>(null);
  const visibleInviteIdRef = useRef<string | null>(null);

  // Slide-up animation
  const slideY = useRef(new Animated.Value(200)).current;
  const timerAnim = useRef(new Animated.Value(1)).current;
  const timerAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const defaultName = () => triLang(lang, {
    ru: 'Игрок',
    uk: 'Гравець',
    es: 'Jugador',
    'pt-BR': 'Jogador',
    vi: 'Người chơi',
    id: 'Pemain',
    tr: 'Oyuncu',
    pl: 'Gracz',
  });

  const clearAutoDeclineTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    timerAnimRef.current?.stop?.();
    timerAnimRef.current = null;
  };

  const doDecline = async (invite: ArenaInviteRow) => {
    clearAutoDeclineTimer();
    // Animate out
    Animated.timing(slideY, { toValue: 200, duration: 250, useNativeDriver: true, easing: Easing.in(Easing.ease) }).start();
    setTopInvite(null);
    currentInviteRef.current = null;
    visibleInviteIdRef.current = null;
    await setArenaInviteStatus(invite.id, 'declined');
    logEvent('arena_invite_declined', {});
  };

  const showInvite = (invite: ArenaInviteRow) => {
    clearAutoDeclineTimer();
    visibleInviteIdRef.current = null;
    currentInviteRef.current = invite;
    setTopInvite(invite);
    setBusy(false);
  };

  const startInvitePresentation = (invite: ArenaInviteRow) => {
    // Slide in
    slideY.setValue(200);
    timerAnim.setValue(1);
    Animated.spring(slideY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();

    // Timer bar animation
    timerAnimRef.current = Animated.timing(timerAnim, {
      toValue: 0,
      duration: INVITE_TIMEOUT_MS,
      useNativeDriver: true,
      easing: Easing.linear,
    });
    timerAnimRef.current.start();

    // Auto-decline after timeout
    timerRef.current = setTimeout(() => {
      const cur = currentInviteRef.current;
      if (cur) void doDecline(cur);
    }, INVITE_TIMEOUT_MS);
  };

  useEffect(() => {
    if (!topInvite || !overlayVisible) return;
    if (visibleInviteIdRef.current === topInvite.id) return;
    visibleInviteIdRef.current = topInvite.id;
    startInvitePresentation(topInvite);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayVisible, topInvite?.id]);

  // ── Firestore subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;

    let cancelled = false;
    let offSnap: (() => void) | null = null;
    let attachGen = 0;

    const attach = async () => {
      const gen = ++attachGen;
      offSnap?.();
      offSnap = null;
      if (cancelled) return;

      const stableUid = await ensureAnonUser();
      if (cancelled || gen !== attachGen) return;
      if (!stableUid) return;

      void ensureFriendRequestViewerAuthLink();
      if (cancelled || gen !== attachGen) return;

      // Check Firebase Auth — if not ready yet, onAuthStateChanged will retrigger attach()
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const auth = require('@react-native-firebase/auth').default;
        if (!auth().currentUser) return;
      } catch {
        return;
      }

      if (cancelled || gen !== attachGen) return;

      offSnap = subscribeIncomingArenaInvites(
        stableUid,
        (list) => {
          const next = list[0] ?? null;
          if (!next) {
            // All gone (accepted/declined elsewhere or expired)
            if (currentInviteRef.current) {
              clearAutoDeclineTimer();
              Animated.timing(slideY, { toValue: 200, duration: 250, useNativeDriver: true, easing: Easing.in(Easing.ease) }).start();
              setTopInvite(null);
              currentInviteRef.current = null;
              visibleInviteIdRef.current = null;
            }
            return;
          }
          // New invite or same id — show/keep
          if (!currentInviteRef.current || currentInviteRef.current.id !== next.id) {
            if (!shownIdsRef.current.has(next.id)) {
              shownIdsRef.current.add(next.id);
            }
            showInvite(next);
          }
        },
        (err) => {
          logEvent('arena_invite_listen_err', { detail: String(err?.message ?? err).slice(0, 100) });
          if (!cancelled) void attach();
        },
      );
    };

    void attach();

    const subHydrated = onAppEvent('cloud_profile_hydrated', () => { void attach(); });

    let unsubAuth: (() => void) | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const auth = require('@react-native-firebase/auth').default;
      unsubAuth = auth().onAuthStateChanged(() => { void attach(); });
    } catch { /* ignore */ }

    const onAppStateChange = (s: AppStateStatus) => { if (s === 'active') void attach(); };
    const subApp = AppState.addEventListener('change', onAppStateChange);

    return () => {
      cancelled = true;
      subHydrated.remove();
      unsubAuth?.();
      subApp.remove();
      offSnap?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup timer on unmount
  useEffect(() => () => { clearAutoDeclineTimer(); }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const onDecline = () => {
    if (!topInvite || busy) return;
    hapticTap();
    void doDecline(topInvite);
  };

  const onAccept = async () => {
    if (!topInvite || busy) return;
    hapticSuccess();
    clearAutoDeclineTimer();
    setBusy(true);
    const invite = topInvite;
    try {
      const res = await joinArenaFriendRoomAsGuest(invite.roomId, {
        defaultPlayerName: defaultName(),
        spendOne,
        isUnlimited,
      });
      if (res.ok) {
        await setArenaInviteStatus(invite.id, 'accepted');
        Animated.timing(slideY, { toValue: 200, duration: 200, useNativeDriver: true, easing: Easing.in(Easing.ease) }).start();
        setTopInvite(null);
        currentInviteRef.current = null;
        visibleInviteIdRef.current = null;
        router.replace({ pathname: '/arena_game' as any, params: { sessionId: res.sessionId, userId: res.uid } });
        return;
      }
      if (res.code === 'no_energy') {
        void doDecline(invite);
        return;
      }
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Не вышло войти в комнату. Попроси друга пригласить ещё раз.',
        messageUk: 'Не вдалося зайти в кімнату. Попроси друга запросити ще раз.',
        messageEs: 'No se pudo entrar en la sala. Pídele a tu amigo que vuelva a invitarte.',
      });
      void doDecline(invite);
    } finally {
      setBusy(false);
    }
  };

  if (!topInvite || !overlayVisible) return null;

  const hostLabel = topInvite.fromName.trim() || defaultName();

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: bottomOffset + 8,
        zIndex: 9998,
        transform: [{ translateY: slideY }],
      }}
      pointerEvents="box-none"
    >
      <View
        style={{
          backgroundColor: t.bgCard,
          borderColor: t.accent,
          borderWidth: 1.5,
          borderRadius: 20,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.22,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
          elevation: 12,
        }}
      >
        {/* Timer bar */}
        <View style={{ height: 3, backgroundColor: `${t.accent}33` }}>
          <Animated.View
            style={{
              height: '100%',
              width: '100%',
              backgroundColor: t.accent,
              transformOrigin: 'left',
              transform: [{ scaleX: timerAnim }],
            }}
          />
        </View>

        <View style={{ padding: 16, gap: 12 }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 26 }}>⚔️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', lineHeight: f.body + 4 }}>
                {triLang(lang, {
                  ru: `Вызов от ${hostLabel}`,
                  uk: `Виклик від ${hostLabel}`,
                  es: `Reto de ${hostLabel}`,
                  'pt-BR': `Desafio de ${hostLabel}`,
                  vi: `Lời thách đấu từ ${hostLabel}`,
                  id: `Tantangan dari ${hostLabel}`,
                  tr: `${hostLabel} meydan okuyor`,
                  pl: `Wyzwanie od ${hostLabel}`,
                })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }}>
                {triLang(lang, {
                  ru: 'Друг зовёт сыграть на арене',
                  uk: 'Друг кличе зіграти на арені',
                  es: 'Tu amigo quiere jugar en la Arena',
                  'pt-BR': 'Um amigo chamou você para jogar na Arena',
                  vi: 'Bạn bè mời bạn chơi trong Arena',
                  id: 'Teman mengajakmu bermain di Arena',
                  tr: 'Bir arkadaşın Arenada oynamaya çağırıyor',
                  pl: 'Znajomy zaprasza Cię do gry na Arenie',
                })}
              </Text>
            </View>
          </View>

          {/* Buttons row */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onDecline}
              disabled={busy}
              activeOpacity={0.7}
              style={{
                flex: 1,
                height: 46,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: t.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: busy ? 0.4 : 1,
              }}
            >
              <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '600' }}>
                {triLang(lang, {
                  ru: 'Отклонить',
                  uk: 'Відмовитись',
                  es: 'Rechazar',
                  'pt-BR': 'Recusar',
                  vi: 'Từ chối',
                  id: 'Tolak',
                  tr: 'Reddet',
                  pl: 'Odrzuć',
                })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => void onAccept()}
              disabled={busy}
              activeOpacity={0.85}
              style={{
                flex: 2,
                height: 46,
                borderRadius: 14,
                backgroundColor: t.accent,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: busy ? 0.7 : 1,
              }}
            >
              {false && busy ? (
                <View />
              ) : (
                <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '900' }}>
                  {triLang(lang, {
                    ru: '⚡ ПРИНЯТЬ',
                    uk: '⚡ ПРИЙНЯТИ',
                    es: '⚡ ACEPTAR',
                    'pt-BR': '⚡ ACEITAR',
                    vi: '⚡ CHẤP NHẬN',
                    id: '⚡ TERIMA',
                    tr: '⚡ KABUL ET',
                    pl: '⚡ PRZYJMIJ',
                  })}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default memo(ArenaFriendInviteHost);
