import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Clipboard,
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

// ── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  uid: string;
  name: string;
  xp: number;
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

async function fetchUserProfile(uid: string): Promise<UserProfile> {
  try {
    const db = getDb();
    if (!db) return { uid, name: 'Игрок', xp: 0 };
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) return { uid, name: 'Игрок', xp: 0 };
    const data: Record<string, unknown> = snap.data() ?? {};
    const progress = (data.progress as Record<string, unknown>) ?? {};
    const linked = (data.linkedAuth as Record<string, unknown> | undefined) ?? {};
    const name =
      (data.displayName as string) ||
      (progress.displayName as string) ||
      (progress.user_name as string) ||
      (typeof linked.displayName === 'string' ? linked.displayName : '') ||
      'Игрок';
    const xp =
      parseInt((progress.user_total_xp as string) ?? '0') || 0;
    return { uid, name, xp };
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

  // Fallback: if subscriptions don't fire within 5s (e.g. no network), stop spinner
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
    deleteBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#e55',
    },
    bottomPad: { height: 40 },
  });

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderRequest = (req: FriendRequestEntry) => {
    const profile = profileCache[req.fromUid];
    const xp = profile?.xp ?? 0;
    const avatarId = String(getBestAvatarForLevel(getLevelFromXP(xp)));
    const name = profile?.name ?? '...';
    return (
      <View key={req.fromUid} style={styles.personRow}>
        <AvatarView avatar={avatarId} size={44} />
        <View style={styles.personInfo}>
          <Text style={styles.personName}>{name}</Text>
          <Text style={styles.personXp}>{xp} XP</Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => void handleAccept(req.fromUid)}
            accessibilityLabel={L('Принять', 'Прийняти', 'Aceptar')}
          >
            <Text style={styles.acceptBtnText}>
              {L('Принять', 'Прийняти', 'Aceptar')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
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
    const avatarId = String(getBestAvatarForLevel(getLevelFromXP(xp)));
    const name = profile?.name ?? '...';
    return (
      <View key={friend.uid} style={styles.personRow}>
        <AvatarView avatar={avatarId} size={44} />
        <View style={styles.personInfo}>
          <Text style={styles.personName}>{name}</Text>
          <Text style={styles.personXp}>{xp} XP</Text>
        </View>
        <TouchableOpacity
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

  if (isLoading) {
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
            <ActivityIndicator size="large" color={t.accent} />
          </View>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

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

        <ScrollView showsVerticalScrollIndicator={false}>
          <ContentWrap>

            {/* ── Section 1: My Code ────────────────────────────────────── */}
            <Text style={styles.sectionTitle}>
              {L('Мой код', 'Мій код', 'Mi código')}
            </Text>
            <View style={styles.codeCard}>
              {myCode ? (
                <>
                  <Text style={styles.codeText}>{myCode}</Text>
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
                <ActivityIndicator size="small" color={t.accent} />
              )}
            </View>

            {/* ── Section 2: Add Friend ─────────────────────────────────── */}
            <Text style={styles.sectionTitle}>
              {L('Добавить друга', 'Додати друга', 'Añadir amigo')}
            </Text>
            <View style={styles.inputRow}>
              <TextInput
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
                style={[
                  styles.addButton,
                  (codeInput.length !== 6 || isAdding) && styles.addButtonDisabled,
                ]}
                onPress={() => void handleAdd()}
                disabled={codeInput.length !== 6 || isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator size="small" color={t.correctText} />
                ) : (
                  <Text style={styles.addButtonText}>
                    {L('Добавить', 'Додати', 'Añadir')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            {addFeedback ? (
              <Text style={styles.feedbackText}>{addFeedback}</Text>
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
