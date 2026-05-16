import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Clipboard,
  Modal,
  Pressable,
  Share,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import AvatarView from '../components/AvatarView';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import { getBestAvatarForLevel } from '../constants/avatars';
import { normalizeAvatarAuraId } from '../constants/avatar_auras';
import { getLevelFromXP } from '../constants/theme';
import { ensureMyInviteCodeForFriends, lookupUserByFriendCode } from './firestore_friends';
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  deleteFriend,
  subscribeToFriends,
  subscribeToIncomingRequests,
  ensureFriendRequestViewerAuthLink,
  type FriendEntry,
  type FriendRequestEntry,
} from './firestore_friend_requests';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getCanonicalUserId } from './user_id_policy';
import { randomSelfFriendCodeMessage } from './friends_self_code_messages';
import { triLang } from '../constants/i18n';
import { hapticTap as doHaptic } from '../hooks/use-haptics';
import { trackActivity } from './app_activity';
import { getShardsBalance } from './shards_system';
import {
  FRIEND_GIFT_CATALOG,
  isFriendGiftsCloudEnabled,
  sendFriendGiftWithShards,
  type FriendGiftId,
} from './friend_gifts';

// ── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  uid: string;
  name: string;
  xp: number;
  avatar?: string;
  aura?: string;
}

// ── Firestore accessor ────────────────────────────────────────────────────────

const getDb = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

// ── Profile fetch helper ──────────────────────────────────────────────────────

function readPublicNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  return 0;
}

function readPublicString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function fetchUserProfile(uid: string): Promise<UserProfile> {
  try {
    const db = getDb();
    if (!db) return { uid, name: 'Игрок', xp: 0 };
    let snap = await db.collection('leaderboard').doc(uid).get();
    if (!snap.exists) {
      const byAuthSnap = await db.collection('leaderboard').where('firebaseAuthUid', '==', uid).limit(1).get();
      const byAuthDoc = byAuthSnap.docs?.[0];
      if (byAuthDoc) snap = byAuthDoc;
    }
    if (!snap.exists) return { uid, name: 'Игрок', xp: 0 };
    const data: Record<string, unknown> = snap.data() ?? {};
    const name =
      readPublicString(data.name) ||
      readPublicString(data.displayName) ||
      'Игрок';
    const xp = readPublicNumber(data.points);
    const avatar = readPublicString(data.avatar);
    const aura = readPublicString(data.aura);
    return { uid, name, xp, avatar: avatar || undefined, aura: normalizeAvatarAuraId(aura) };
  } catch {
    return { uid, name: 'Игрок', xp: 0 };
  }
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FriendsScreen() {
  const router = useRouter();
  const { theme: t } = useTheme();
  const { lang } = useLang();

  const L = (ru: string, uk: string, es: string) =>
    triLang(lang, { ru, uk, es });

  // ── State ──────────────────────────────────────────────────────────────────

  const [myCode, setMyCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [requests, setRequests] = useState<FriendRequestEntry[]>([]);

  const [profileCache, setProfileCache] = useState<Record<string, UserProfile>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ uid: string; name: string } | null>(null);
  const [giftTarget, setGiftTarget] = useState<UserProfile | null>(null);
  const [giftBalance, setGiftBalance] = useState(0);
  const [giftBusyId, setGiftBusyId] = useState<FriendGiftId | null>(null);

  // Track whether both subscriptions have fired at least once
  const friendsFiredRef = useRef(false);
  const requestsFiredRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Mount: fetch my friend code ────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const code = await ensureMyInviteCodeForFriends('');
      if (!cancelled && code) setMyCode(code);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void ensureFriendRequestViewerAuthLink();
    }, []),
  );

  // ── Real-time subscriptions (после связки auth ↔ stableId в Firestore) ──

  useEffect(() => {
    let cancelled = false;
    let unsubFriends: () => void = () => {};
    let unsubReq: () => void = () => {};

    void (async () => {
      await ensureFriendRequestViewerAuthLink();
      if (cancelled) return;

      const markFriendsDone = () => {
        if (!friendsFiredRef.current) {
          friendsFiredRef.current = true;
          if (requestsFiredRef.current) setIsLoading(false);
        }
      };
      const markRequestsDone = () => {
        if (!requestsFiredRef.current) {
          requestsFiredRef.current = true;
          if (friendsFiredRef.current) setIsLoading(false);
        }
      };

      unsubFriends = subscribeToFriends(
        (data) => { if (!cancelled) { setFriends(data); markFriendsDone(); } },
        () => { markFriendsDone(); },
      );
      unsubReq = subscribeToIncomingRequests(
        (data) => { if (!cancelled) { setRequests(data); markRequestsDone(); } },
        () => { markRequestsDone(); },
      );
    })();

    return () => {
      cancelled = true;
      unsubFriends();
      unsubReq();
    };
  }, []);

  // Fallback: if subscriptions don\'t fire within 5s (e.g. no network), stop spinner
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // ── Fetch missing profiles when friends/requests change ───────────────────

  useEffect(() => {
    const uids = [
      ...friends.map(f => f.uid),
      ...requests.map(r => r.fromUid),
    ];
    const missing = uids.filter(uid => !profileCache[uid]);
    if (missing.length === 0) return;
    void Promise.all(missing.map(fetchUserProfile)).then(profiles => {
      setProfileCache(prev => {
        const next = { ...prev };
        for (const p of profiles) next[p.uid] = p;
        return next;
      });
    });
  }, [friends, requests]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup timers on unmount ─────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const showFeedback = (msg: string) => {
    setAddFeedback(msg);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setAddFeedback(null), 2500);
  };

  const handleAdd = async () => {
    if (codeInput.length !== 6 || isAdding) return;
    doHaptic();
    setIsAdding(true);
    try {
      const codeNorm = codeInput.toUpperCase();
      await trackActivity('friends:add_by_code_start', {
        feature: 'friends',
        screen: 'friends',
        result: 'start',
        tags: { codeLength: codeNorm.length },
      });
      const lookup = await lookupUserByFriendCode(codeInput);
      if (!lookup) {
        await trackActivity('friends:add_by_code_result', {
          feature: 'friends',
          screen: 'friends',
          result: 'blocked',
          tags: { reason: 'not_found', codeLength: codeNorm.length },
        });
        showFeedback(L('Пользователь не найден', 'Користувача не знайдено', 'Usuario no encontrado'));
        return;
      }
      const myUid = await getCanonicalUserId();
      const isSelf =
        (myCode != null && codeNorm === myCode.toUpperCase()) ||
        (myUid != null && lookup.uid === myUid);
      if (isSelf) {
        await trackActivity('friends:add_by_code_result', {
          feature: 'friends',
          screen: 'friends',
          result: 'blocked',
          tags: { reason: 'self_code', targetUid: lookup.uid },
        });
        showFeedback(randomSelfFriendCodeMessage(L));
        return;
      }
      if (lookup.source === 'referral_code') {
        void import('./referral_bootstrap')
          .then((m) => m.captureReferralCodeFromManualInput(codeNorm))
          .catch(() => {});
      }
      const result = await sendFriendRequest(lookup.uid);
      await trackActivity('friends:add_by_code_result', {
        feature: 'friends',
        screen: 'friends',
        result: result === 'sent' ? 'success' : result === 'error' ? 'error' : 'blocked',
        tags: { targetUid: lookup.uid, requestResult: result },
      });
      if (result === 'sent') {
        showFeedback(L('Заявка отправлена!', 'Заявку надіслано!', '¡Solicitud enviada!'));
        setCodeInput('');
      } else if (result === 'already_sent') {
        showFeedback(L('Заявка уже отправлена', 'Заявку вже надіслано', 'Solicitud ya enviada'));
      } else if (result === 'already_friends') {
        showFeedback(L('Вы уже друзья', 'Ви вже друзі', 'Ya son amigos'));
      } else if (result === 'self') {
        showFeedback(randomSelfFriendCodeMessage(L));
      } else {
        showFeedback(L('Пользователь не найден', 'Користувача не знайдено', 'Usuario no encontrado'));
      }
    } catch (e) {
      void import('./app_health')
        .then(({ logAppWarning }) =>
          logAppWarning('friends:add_by_code_ui_failed', e, {
            feature: 'friends',
            screen: 'friends',
            writeToFirestore: true,
            tags: { codeLength: codeInput.length },
          }),
        )
        .catch(() => {});
      await trackActivity('friends:add_by_code_error', {
        feature: 'friends',
        screen: 'friends',
        result: 'error',
        tags: { codeLength: codeInput.length, error: e instanceof Error ? e.message : String(e) },
      });
      showFeedback(L('Ошибка. Попробуйте ещё раз', 'Помилка. Спробуйте ще раз', 'Error. Inténtalo de nuevo'));
    } finally {
      setIsAdding(false);
    }
  };

  const handleCopy = () => {
    if (!myCode) return;
    doHaptic();
    Clipboard.setString(myCode);
    setCopyFeedback(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyFeedback(false), 1800);
  };

  const handleShare = async () => {
    if (!myCode) return;
    doHaptic();
    await Share.share({
      message:
        L('Мой код в PhraseMan:', 'Мій код у PhraseMan:', 'Mi código en PhraseMan:') +
        ' ' +
        myCode,
    });
  };

  const handleAccept = async (fromUid: string) => {
    doHaptic();
    await acceptFriendRequest(fromUid);
  };

  const handleDecline = async (fromUid: string) => {
    doHaptic();
    await declineFriendRequest(fromUid);
  };

  const handleDeleteConfirm = (uid: string, name: string) => {
    doHaptic();
    setDeleteTarget({ uid, name });
  };

  const openGiftPicker = (profile: UserProfile) => {
    doHaptic();
    setGiftTarget(profile);
    void getShardsBalance().then(setGiftBalance).catch(() => setGiftBalance(0));
  };

  const giftLabel = (gift: (typeof FRIEND_GIFT_CATALOG)[number]) =>
    triLang(lang, { ru: gift.labelRu, uk: gift.labelUk, es: gift.labelEs });

  const giftDescription = (gift: (typeof FRIEND_GIFT_CATALOG)[number]) =>
    triLang(lang, { ru: gift.descRu, uk: gift.descUk, es: gift.descEs });

  const handleSendGift = async (giftId: FriendGiftId) => {
    if (!giftTarget || giftBusyId) return;
    const gift = FRIEND_GIFT_CATALOG.find((x) => x.id === giftId);
    if (!gift) return;
    if (!isFriendGiftsCloudEnabled()) {
      showFeedback(L('Подарки доступны только с облачной синхронизацией', 'Подарунки доступні лише з хмарною синхронізацією', 'Los regalos requieren sincronizacion en la nube'));
      return;
    }
    if (giftBalance < gift.costShards) {
      showFeedback(L('Не хватает осколков', 'Не вистачає осколків', 'No tienes suficientes fragmentos'));
      return;
    }
    doHaptic();
    setGiftBusyId(giftId);
    try {
      const res = await sendFriendGiftWithShards({
        friendStableId: giftTarget.uid,
        giftId,
      });
      setGiftBalance(res.senderBalanceAfter);
      setGiftTarget(null);
      showFeedback(L('Подарок отправлен', 'Подарунок надіслано', 'Regalo enviado'));
      await trackActivity('friends:send_gift', {
        feature: 'friends',
        screen: 'friends',
        result: 'success',
        tags: { giftId, targetUid: giftTarget.uid, cost: gift.costShards },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showFeedback(
        msg.includes('precondition') || msg.includes('Not enough')
          ? L('Не хватает осколков или дружба уже не активна', 'Не вистачає осколків або дружба вже не активна', 'Faltan fragmentos o la amistad ya no esta activa')
          : L('Не удалось отправить подарок', 'Не вдалося надіслати подарунок', 'No se pudo enviar el regalo'),
      );
      await trackActivity('friends:send_gift', {
        feature: 'friends',
        screen: 'friends',
        result: 'error',
        tags: { giftId, targetUid: giftTarget.uid, error: msg },
      });
    } finally {
      setGiftBusyId(null);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const sortedFriends = [...friends].sort((a, b) => {
    const xpA = profileCache[a.uid]?.xp ?? 0;
    const xpB = profileCache[b.uid]?.xp ?? 0;
    return xpB - xpA;
  });

  // ── Styles ─────────────────────────────────────────────────────────────────

  const styles = StyleSheet.create({
    flex1: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: t.textPrimary,
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: t.textSecond,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 20,
      marginBottom: 8,
    },
    codeCard: {
      backgroundColor: t.bgCard,
      borderRadius: 14,
      padding: 20,
      alignItems: 'center',
      gap: 12,
    },
    codeText: {
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: 4,
      color: t.accent,
      fontVariant: ['tabular-nums'],
    },
    codeButtonRow: {
      flexDirection: 'row',
      gap: 12,
    },
    codeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: t.bgSurface,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 10,
    },
    codeButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: t.textPrimary,
    },
    inputRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    textInput: {
      flex: 1,
      backgroundColor: t.bgCard,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 18,
      fontWeight: '700',
      color: t.textPrimary,
      letterSpacing: 2,
    },
    addButton: {
      backgroundColor: t.accent,
      borderRadius: 10,
      paddingHorizontal: 18,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonDisabled: {
      opacity: 0.45,
    },
    addButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: t.correctText,
    },
    feedbackText: {
      fontSize: 13,
      color: t.textSecond,
      marginTop: 6,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: t.textSecond,
      textAlign: 'center',
      paddingVertical: 16,
    },
    personRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.bgCard,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      gap: 12,
    },
    personInfo: { flex: 1 },
    personName: {
      fontSize: 15,
      fontWeight: '600',
      color: t.textPrimary,
    },
    personXp: {
      fontSize: 12,
      color: t.textSecond,
      marginTop: 2,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
    },
    acceptBtn: {
      backgroundColor: t.accent,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    acceptBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: t.correctText,
    },
    declineBtn: {
      backgroundColor: t.bgSurface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: t.textSecond,
    },
    declineBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: t.textSecond,
    },
    deleteBtn: {
      backgroundColor: t.bgSurface,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: '#e55',
    },
    giftBtn: {
      width: 36,
      height: 34,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.bgSurface,
      borderWidth: 1,
      borderColor: t.accent,
    },
    deleteBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#e55',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    giftSheet: {
      backgroundColor: t.bgCard,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      padding: 18,
      paddingBottom: 24,
      gap: 12,
    },
    giftSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    giftSheetTitleWrap: { flex: 1 },
    giftSheetTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: t.textPrimary,
    },
    giftSheetSubtitle: {
      fontSize: 13,
      color: t.textSecond,
      marginTop: 2,
    },
    giftCloseBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      backgroundColor: t.bgSurface,
    },
    giftBalancePill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: t.bgSurface,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    giftBalanceText: {
      color: t.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    giftOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: t.bgSurface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: 'rgba(127,127,127,0.18)',
    },
    giftOptionDisabled: {
      opacity: 0.45,
    },
    giftIconBox: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.bgCard,
    },
    giftOptionText: { flex: 1 },
    giftOptionTitle: {
      color: t.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    giftOptionDesc: {
      color: t.textSecond,
      fontSize: 12,
      marginTop: 2,
    },
    giftCost: {
      minWidth: 46,
      textAlign: 'right',
      color: t.accent,
      fontSize: 14,
      fontWeight: '800',
    },
    bottomPad: { height: 40 },
  });

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderRequest = (req: FriendRequestEntry) => {
    const profile = profileCache[req.fromUid];
    const xp = profile?.xp ?? 0;
    const avatarId = profile?.avatar || String(getBestAvatarForLevel(getLevelFromXP(xp)));
    const name = profile?.name ?? 'Phraseman';
    return (
      <View key={req.fromUid} testID={`friends-request-${req.fromUid}`} style={styles.personRow}>
        <AvatarView avatar={avatarId} size={44} auraId={profile?.aura} />
        <View style={styles.personInfo}>
          <Text style={styles.personName}>{name}</Text>
          <Text style={styles.personXp}>{xp} XP</Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            testID={`friends-accept-${req.fromUid}`}
            style={styles.acceptBtn}
            onPress={() => void handleAccept(req.fromUid)}
            accessibilityLabel={L('Принять', 'Прийняти', 'Aceptar')}
          >
            <Text style={styles.acceptBtnText}>
              {L('Принять', 'Прийняти', 'Aceptar')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID={`friends-decline-${req.fromUid}`}
            style={styles.declineBtn}
            onPress={() => void handleDecline(req.fromUid)}
            accessibilityLabel={L('Отклонить', 'Відхилити', 'Rechazar')}
          >
            <Text style={styles.declineBtnText}>
              {L('Отклонить', 'Відхилити', 'Rechazar')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFriend = (friend: FriendEntry) => {
    const profile = profileCache[friend.uid];
    const xp = profile?.xp ?? 0;
    const avatarId = profile?.avatar || String(getBestAvatarForLevel(getLevelFromXP(xp)));
    const name = profile?.name ?? 'Phraseman';
    return (
      <View key={friend.uid} testID={`friends-row-${friend.uid}`} style={styles.personRow}>
        <AvatarView avatar={avatarId} size={44} auraId={profile?.aura} />
        <View style={styles.personInfo}>
          <Text style={styles.personName}>{name}</Text>
          <Text style={styles.personXp}>{xp} XP</Text>
        </View>
        <TouchableOpacity
          testID={`friends-gift-${friend.uid}`}
          style={styles.giftBtn}
          onPress={() => openGiftPicker({ uid: friend.uid, name, xp, avatar: avatarId, aura: profile?.aura })}
          accessibilityLabel={L('Подарить', 'Подарувати', 'Regalar')}
        >
          <Ionicons name="gift-outline" size={18} color={t.accent} />
        </TouchableOpacity>
        <TouchableOpacity
          testID={`friends-delete-${friend.uid}`}
          style={styles.deleteBtn}
          onPress={() => handleDeleteConfirm(friend.uid, name)}
          accessibilityLabel={L('Удалить', 'Видалити', 'Eliminar')}
        >
          <Text style={styles.deleteBtnText}>
            {L('Удалить', 'Видалити', 'Eliminar')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Full-screen loading ────────────────────────────────────────────────────

  if (false && isLoading) {
    return (
      <ScreenGradient>
        <SafeAreaView style={styles.flex1}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => { doHaptic(); router.back(); }}>
              <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {L('Друзья', 'Друзі', 'Amigos')}
            </Text>
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.emptyText} />
          </View>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <ScreenGradient>
      <SafeAreaView testID="screen-friends" style={styles.flex1}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { doHaptic(); router.back(); }}>
            <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {L('Друзья', 'Друзі', 'Amigos')}
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <ContentWrap>

            {/* ── Section 1: My Code ────────────────────────────────────── */}
            <Text style={styles.sectionTitle}>
              {L('Мой код', 'Мій код', 'Mi código')}
            </Text>
            <View style={styles.codeCard}>
              {myCode ? (
                <>
                  <Text testID="friends-my-code" style={styles.codeText}>{myCode}</Text>
                  <View style={styles.codeButtonRow}>
                    <TouchableOpacity style={styles.codeButton} onPress={handleCopy}>
                      <Ionicons name="copy-outline" size={16} color={t.textPrimary} />
                      <Text style={styles.codeButtonText}>
                        {copyFeedback
                          ? L('Скопировано!', 'Скопійовано!', '¡Copiado!')
                          : L('Копировать', 'Копіювати', 'Copiar')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.codeButton} onPress={() => void handleShare()}>
                      <Ionicons name="share-outline" size={16} color={t.textPrimary} />
                      <Text style={styles.codeButtonText}>
                        {L('Поделиться', 'Поділитись', 'Compartir')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <Text style={styles.codeText}>------</Text>
              )}
            </View>

            {/* ── Section 2: Add Friend ─────────────────────────────────── */}
            <Text style={styles.sectionTitle}>
              {L('Добавить друга', 'Додати друга', 'Añadir amigo')}
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                testID="friends-code-input"
                style={styles.textInput}
                placeholder={L(
                  'Код друга (6 символов)',
                  'Код друга (6 символів)',
                  'Código de amigo (6 símbolos)',
                )}
                placeholderTextColor={t.textSecond}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
                value={codeInput}
                onChangeText={v =>
                  setCodeInput(v.toUpperCase().replace(/[^A-Z2-9]/g, ''))
                }
              />
              <TouchableOpacity
                testID="friends-search"
                style={[
                  styles.addButton,
                  (codeInput.length !== 6 || isAdding) && styles.addButtonDisabled,
                ]}
                onPress={() => void handleAdd()}
                disabled={codeInput.length !== 6 || isAdding}
              >
                {isAdding ? (
                  <Text style={styles.addButtonText}>
                    {L('Добавить', 'Додати', 'Añadir')}
                  </Text>
                ) : (
                  <Text style={styles.addButtonText}>
                    {L('Добавить', 'Додати', 'Añadir')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            {addFeedback ? (
              <Text testID="friends-add-feedback" style={styles.feedbackText}>{addFeedback}</Text>
            ) : null}

            {/* ── Активные входящие заявки (только если есть) ─────────── */}
            {requests.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>
                  {L('Активные заявки', 'Активні заявки', 'Solicitudes activas')}
                </Text>
                {requests.map(renderRequest)}
              </>
            ) : null}

            {/* ── Section 4: My Friends ────────────────────────────────── */}
            <Text style={styles.sectionTitle}>
              {L('Мои друзья', 'Мої друзі', 'Mis amigos')}
            </Text>
            {sortedFriends.length === 0 ? (
              <Text style={styles.emptyText}>
                {L(
                  'Ещё нет друзей — добавьте по коду',
                  'Ще немає друзів',
                  'Sin amigos aún',
                )}
              </Text>
            ) : (
              sortedFriends.map(renderFriend)
            )}

            <View style={styles.bottomPad} />
          </ContentWrap>
        </ScrollView>
        <Modal
          visible={giftTarget !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setGiftTarget(null)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setGiftTarget(null)} />
            <View style={styles.giftSheet}>
              <View style={styles.giftSheetHeader}>
                {giftTarget ? (
                  <AvatarView
                    avatar={giftTarget.avatar || String(getBestAvatarForLevel(getLevelFromXP(giftTarget.xp)))}
                    size={44}
                    auraId={giftTarget.aura}
                  />
                ) : null}
                <View style={styles.giftSheetTitleWrap}>
                  <Text style={styles.giftSheetTitle}>
                    {L('Подарок другу', 'Подарунок другу', 'Regalo para amigo')}
                  </Text>
                  <Text style={styles.giftSheetSubtitle}>{giftTarget?.name ?? ''}</Text>
                </View>
                <TouchableOpacity style={styles.giftCloseBtn} onPress={() => setGiftTarget(null)}>
                  <Ionicons name="close" size={20} color={t.textPrimary} />
                </TouchableOpacity>
              </View>
              <View style={styles.giftBalancePill}>
                <Ionicons name="diamond-outline" size={15} color={t.accent} />
                <Text style={styles.giftBalanceText}>{giftBalance}</Text>
              </View>
              {FRIEND_GIFT_CATALOG.map((gift) => {
                const disabled = giftBalance < gift.costShards || giftBusyId !== null;
                return (
                  <TouchableOpacity
                    key={gift.id}
                    style={[styles.giftOption, disabled && styles.giftOptionDisabled]}
                    disabled={disabled}
                    onPress={() => void handleSendGift(gift.id)}
                  >
                    <View style={styles.giftIconBox}>
                      <Ionicons name={gift.icon as any} size={21} color={t.accent} />
                    </View>
                    <View style={styles.giftOptionText}>
                      <Text style={styles.giftOptionTitle}>{giftLabel(gift)}</Text>
                      <Text style={styles.giftOptionDesc}>{giftDescription(gift)}</Text>
                    </View>
                    {giftBusyId === gift.id ? (
                      <Text style={styles.giftCost}>{gift.costShards} 💎</Text>
                    ) : (
                      <Text style={styles.giftCost}>{gift.costShards} 💎</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Modal>
        <ThemedConfirmModal
          visible={deleteTarget !== null}
          title={L('Удалить друга?', 'Видалити друга?', '¿Eliminar amigo?')}
          message={deleteTarget?.name ?? ''}
          cancelLabel={L('Отмена', 'Скасувати', 'Cancelar')}
          confirmLabel={L('Удалить', 'Видалити', 'Eliminar')}
          confirmVariant="default"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            const target = deleteTarget;
            setDeleteTarget(null);
            if (target) void deleteFriend(target.uid);
          }}
        />
      </SafeAreaView>
    </ScreenGradient>
  );
}
