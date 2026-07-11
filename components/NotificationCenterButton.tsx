import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import AvatarView from './AvatarView';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { HOME_NOTIFICATION_BADGE_COLOR, HOME_NOTIFICATION_BADGE_TEXT_COLOR } from './homeNotificationBadge';
import { openCommunityHub } from '../app/community_hub_deeplink';
import { claimReportReplyShardsOptimistically } from '../app/app_messages';
import {
  countUnreadNotifications,
  markUserNotificationsRead,
  readCachedUserNotifications,
  refreshUserNotificationsOnce,
  subscribeUserNotifications,
  type UserNotification,
  type UserNotificationType,
} from '../app/user_notifications';

/**
 * Центр событий на главной: «кто поставил лайк, кто принял заявку, кто ответил
 * на сообщение» — всё в одном месте. Данные пишут cloud functions в
 * users/{uid}/notifications; тап по событию ведёт ровно туда, где оно случилось
 * (чат — к конкретному сообщению с подсветкой).
 */

const NOTIFICATION_FOREGROUND_REFRESH_MIN_INTERVAL_MS = 3 * 60 * 60_000;

function centerCopy(lang: Lang) {
  return {
    title: triLang(lang, { ru: 'Уведомления', uk: 'Сповіщення', es: 'Notificaciones', 'pt-BR': 'Notificações', vi: 'Thông báo', id: 'Notifikasi', tr: 'Bildirimler', pl: 'Powiadomienia' }),
    empty: triLang(lang, {
      ru: 'Пока нет событий. Здесь появятся лайки, ответы и заявки в друзья.',
      uk: 'Поки немає подій. Тут зʼявляться лайки, відповіді та заявки в друзі.',
      es: 'Sin eventos todavía. Aquí verás likes, respuestas y solicitudes.',
      'pt-BR': 'Sem eventos ainda. Aqui vão aparecer likes, respostas e pedidos.',
      vi: 'Chưa có sự kiện. Lượt thích, trả lời và lời mời sẽ hiện ở đây.',
      id: 'Belum ada acara. Suka, balasan, dan permintaan akan muncul di sini.',
      tr: 'Henüz olay yok. Beğeniler, yanıtlar ve istekler burada görünecek.',
      pl: 'Brak zdarzeń. Tutaj pojawią się polubienia, odpowiedzi i zaproszenia.',
    }),
    close: triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' }),
  };
}

function reportReplyCopy(lang: Lang) {
  return {
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wróć' }),
    reportReply: triLang(lang, { ru: 'Ответ на репорт', uk: 'Відповідь на репорт', es: 'Respuesta a tu reporte', 'pt-BR': 'Resposta ao seu reporte', vi: 'Phản hồi báo cáo', id: 'Balasan laporan', tr: 'Rapor yanıtı', pl: 'Odpowiedź na zgłoszenie' }),
    claimShards: (n: number) => triLang(lang, {
      ru: `Забрать осколки (+${n})`,
      uk: `Забрати уламки (+${n})`,
      es: `Reclamar fragmentos (+${n})`,
      'pt-BR': `Resgatar fragmentos (+${n})`,
      vi: `Nhận mảnh (+${n})`,
      id: `Ambil shard (+${n})`,
      tr: `Parçaları al (+${n})`,
      pl: `Odbierz odłamki (+${n})`,
    }),
    claimed: triLang(lang, { ru: 'Награда получена', uk: 'Нагороду отримано', es: 'Recompensa recibida', 'pt-BR': 'Recompensa recebida', vi: 'Đã nhận thưởng', id: 'Hadiah diterima', tr: 'Ödül alındı', pl: 'Nagroda odebrana' }),
  };
}

function notificationLabel(type: UserNotificationType, lang: Lang): string {
  switch (type) {
    case 'friend_request':
      return triLang(lang, { ru: 'заявка в друзья', uk: 'заявка в друзі', es: 'solicitud de amistad', 'pt-BR': 'pedido de amizade', vi: 'lời mời kết bạn', id: 'permintaan pertemanan', tr: 'arkadaşlık isteği', pl: 'zaproszenie do znajomych' });
    case 'friend_accepted':
      return triLang(lang, { ru: 'принял(а) вашу заявку', uk: 'прийняв(ла) вашу заявку', es: 'aceptó tu solicitud', 'pt-BR': 'aceitou seu pedido', vi: 'đã chấp nhận lời mời', id: 'menerima permintaanmu', tr: 'isteğini kabul etti', pl: 'przyjął(ęła) zaproszenie' });
    case 'activity_like':
      return triLang(lang, { ru: 'поставил(а) вам лайк', uk: 'поставив(ла) вам лайк', es: 'te dio un like', 'pt-BR': 'curtiu você', vi: 'đã thích bạn', id: 'menyukaimu', tr: 'seni beğendi', pl: 'dał(a) ci polubienie' });
    case 'friend_gift_received':
      return triLang(lang, { ru: 'отправил(а) вам подарок', uk: 'надіслав(ла) вам подарунок', es: 'te envió un regalo', 'pt-BR': 'enviou um presente', vi: 'đã gửi quà cho bạn', id: 'mengirimimu hadiah', tr: 'sana hediye gönderdi', pl: 'wysłał(a) ci prezent' });
    case 'friend_gift_thanks':
      return triLang(lang, { ru: 'поблагодарил(а) за подарок', uk: 'подякував(ла) за подарунок', es: 'agradeció tu regalo', 'pt-BR': 'agradeceu o presente', vi: 'đã cảm ơn món quà', id: 'berterima kasih atas hadiah', tr: 'hediye için teşekkür etti', pl: 'podziękował(a) za prezent' });
    case 'help_board_comment':
      return triLang(lang, { ru: 'прокомментировал(а) вашу тему', uk: 'прокоментував(ла) вашу тему', es: 'comentó tu tema', 'pt-BR': 'comentou seu tema', vi: 'đã bình luận chủ đề của bạn', id: 'mengomentari topikmu', tr: 'konunu yorumladı', pl: 'skomentował(a) twój temat' });
    case 'help_board_reply':
    case 'league_chat_reply':
      return triLang(lang, { ru: 'ответил(а) на ваше сообщение', uk: 'відповів(ла) на ваше повідомлення', es: 'respondió a tu mensaje', 'pt-BR': 'respondeu sua mensagem', vi: 'đã trả lời tin nhắn của bạn', id: 'membalas pesanmu', tr: 'mesajına yanıt verdi', pl: 'odpowiedział(a) na twoją wiadomość' });
    case 'help_board_like':
      return triLang(lang, { ru: 'оценил(а) ваше сообщение', uk: 'оцінив(ла) ваше повідомлення', es: 'valoró tu mensaje', 'pt-BR': 'avaliou sua mensagem', vi: 'đã đánh giá tin nhắn của bạn', id: 'menilai pesanmu', tr: 'mesajını beğendi', pl: 'ocenił(a) twoją wiadomość' });
    case 'report_reply':
      return reportReplyCopy(lang).reportReply;
    default:
      return '';
  }
}

function notificationIcon(type: UserNotificationType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'friend_request': return 'person-add-outline';
    case 'friend_accepted': return 'people-outline';
    case 'activity_like': return 'heart';
    case 'friend_gift_received': return 'gift-outline';
    case 'friend_gift_thanks': return 'happy-outline';
    case 'help_board_comment': return 'chatbubble-ellipses-outline';
    case 'help_board_reply': return 'arrow-undo-outline';
    case 'help_board_like': return 'thumbs-up-outline';
    case 'league_chat_reply': return 'arrow-undo-outline';
    case 'report_reply': return 'chatbox-ellipses-outline';
    default: return 'notifications-outline';
  }
}

function notificationIconColor(type: UserNotificationType, fallback: string): string {
  if (type === 'activity_like') return '#FF2D55';
  if (type === 'friend_accepted') return '#34C759';
  if (type === 'report_reply') return '#2E9E63';
  return fallback;
}

function timeLabel(ms: number): string {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function NotificationCenterButton() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const topInset = Math.max(18, insets.top + 8);
  const copy = useMemo(() => ({ ...centerCopy(lang as Lang), ...reportReplyCopy(lang as Lang) }), [lang]);
  const [visible, setVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<UserNotification[]>([]);
  const markedReadIdsRef = useRef<Set<string>>(new Set());
  const optimisticReportClaimIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    const refreshOnce = () => {
      void refreshUserNotificationsOnce({
        minIntervalMs: NOTIFICATION_FOREGROUND_REFRESH_MIN_INTERVAL_MS,
      }).then((list) => {
        if (alive) setItems(list);
      });
    };
    void readCachedUserNotifications().then((cached) => {
      if (alive && cached.length) setItems((cur) => (cur.length ? cur : cached));
    });
    refreshOnce();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshOnce();
    });
    return () => {
      alive = false;
      appSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const unsubscribe = subscribeUserNotifications((list) => {
      setItems(list);
    });
    return unsubscribe;
  }, [visible]);

  const unreadCount = countUnreadNotifications(items);
  const selected = useMemo(() => items.find((row) => row.id === selectedId) ?? null, [items, selectedId]);

  // Открытие центра гасит непрочитанность: как в Telegram — увидел список, значит прочитал.
  const open = useCallback(() => {
    hapticTap();
    setVisible(true);
    const unreadIds = items
      .filter((row) => !row.read && !markedReadIdsRef.current.has(row.id))
      .map((row) => row.id);
    if (unreadIds.length) {
      unreadIds.forEach((id) => markedReadIdsRef.current.add(id));
      void markUserNotificationsRead(unreadIds);
    }
  }, [items]);

  const close = useCallback(() => {
    hapticTap();
    setSelectedId(null);
    setVisible(false);
  }, []);

  const backToList = useCallback(() => {
    hapticTap();
    setSelectedId(null);
  }, []);

  const markReportReplyClaimedLocally = useCallback((notificationId: string, messageId: string) => {
    setItems((prev) => prev.map((row) => {
      if (row.id !== notificationId && row.reportReply?.messageId !== messageId) return row;
      if (!row.reportReply) return row;
      return { ...row, reportReply: { ...row.reportReply, claimed: true } };
    }));
  }, []);

  const claimReportReward = useCallback((row: UserNotification) => {
    const reward = row.reportReply;
    if (!reward || reward.shards <= 0 || reward.claimed) return;
    if (optimisticReportClaimIdsRef.current.has(reward.messageId)) return;
    optimisticReportClaimIdsRef.current.add(reward.messageId);
    hapticTap();
    markReportReplyClaimedLocally(row.id, reward.messageId);
    void claimReportReplyShardsOptimistically(reward.messageId, reward.shards);
  }, [markReportReplyClaimedLocally]);

  const openNotification = useCallback((row: UserNotification) => {
    hapticTap();
    if (row.type === 'report_reply' && row.reportReply) {
      setSelectedId(row.id);
      return;
    }
    setVisible(false);
    const nav = row.nav;
    if (!nav) return;
    if (nav.kind === 'help_board' && nav.topicId) {
      openCommunityHub({ tab: 'help', topicId: nav.topicId, commentId: nav.commentId || undefined });
      return;
    }
    if (nav.kind === 'league_chat' && nav.messageId) {
      openCommunityHub({ tab: 'league', messageId: nav.messageId });
      return;
    }
    router.push('/(tabs)/friends' as any);
  }, []);

  const renderReportReplyDetail = (row: UserNotification) => {
    const reward = row.reportReply;
    if (!reward) return null;
    const title = reward.title || row.text || copy.reportReply;
    const body = reward.body || row.text || '';
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.detailContent}>
        <Text style={[styles.detailMeta, { color: t.textGhost }]}>{timeLabel(row.createdAt)}</Text>
        <Text style={[styles.detailTitle, { color: t.textPrimary }]}>{title}</Text>
        {body ? <Text style={[styles.detailBody, { color: t.textMuted }]}>{body}</Text> : null}
        {reward.shards > 0 ? (
          <View style={[styles.rewardCard, { backgroundColor: t.bgSurface, borderColor: 'rgba(99,217,143,0.35)' }]}>
            <View style={styles.rewardTop}>
              <View style={styles.rewardIcon}>
                <Ionicons name={reward.claimed ? 'checkmark-circle' : 'diamond-outline'} size={20} color="#2E9E63" />
              </View>
              <Text style={[styles.rewardTitle, { color: t.textPrimary }]}>
                {reward.claimed ? copy.claimed : `+${reward.shards}`}
              </Text>
            </View>
            {!reward.claimed ? (
              <TouchableOpacity
                testID="notification-report-reply-claim-cta"
                activeOpacity={0.86}
                accessibilityRole="button"
                accessibilityLabel={copy.claimShards(reward.shards)}
                onPress={() => claimReportReward(row)}
                style={styles.rewardButton}
              >
                <Ionicons name="diamond-outline" size={17} color="#07110A" />
                <Text style={styles.rewardButtonText}>{copy.claimShards(reward.shards)}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    );
  };

  return (
    <>
      <TouchableOpacity
        testID="home-notification-center-button"
        activeOpacity={0.78}
        accessibilityRole="button"
        accessibilityLabel={copy.title}
        onPress={open}
        style={styles.headerButton}
      >
        <View style={styles.headerIconWrap}>
          <Ionicons name="notifications-outline" size={30} color={t.accent} />
        </View>
        {unreadCount > 0 ? (
          <View testID="home-notification-center-badge" style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
        <View testID="notification-center-screen" style={{ flex: 1, backgroundColor: t.bgCard, paddingTop: topInset }}>
          <View style={styles.header}>
            {selected ? (
              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityRole="button"
                accessibilityLabel={copy.back}
                onPress={backToList}
                style={[styles.closeButton, { backgroundColor: t.bgSurface, borderColor: t.border }]}
              >
                <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
              </TouchableOpacity>
            ) : null}
            <Text allowFontScaling={false} numberOfLines={1} style={[styles.headerTitle, { color: t.textPrimary }]}>
              {selected ? copy.reportReply : copy.title}
            </Text>
            <TouchableOpacity
              activeOpacity={0.76}
              accessibilityRole="button"
              accessibilityLabel={copy.close}
              onPress={close}
              style={[styles.closeButton, { backgroundColor: t.bgSurface, borderColor: t.border }]}
            >
              <Ionicons name="close" size={22} color={t.textPrimary} />
            </TouchableOpacity>
          </View>
          {selected ? renderReportReplyDetail(selected) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24, gap: 8 }}>
            {items.length === 0 ? (
              <View style={{ minHeight: 320, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 }}>
                <Ionicons name="notifications-off-outline" size={40} color={t.textGhost} />
                <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '800', textAlign: 'center', lineHeight: Math.round(f.sub * 1.35) }}>
                  {copy.empty}
                </Text>
              </View>
            ) : items.map((row) => {
              const label = notificationLabel(row.type, lang as Lang);
              const rowTitle = row.type === 'report_reply'
                ? (row.reportReply?.title || row.text || copy.reportReply)
                : `${row.fromName || '·'}${label ? ` ${label}` : ''}`;
              const rowPreview = row.type === 'report_reply'
                ? (row.reportReply?.body || row.text || '')
                : row.text;
              const hasAvatar = !!row.fromAvatar;
              return (
                <TouchableOpacity
                  key={row.id}
                  testID={`notification-row-${row.id}`}
                  activeOpacity={0.82}
                  onPress={() => openNotification(row)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    borderRadius: 14,
                    borderWidth: 0,
                    borderColor: t.border,
                    backgroundColor: t.bgSurface,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  {hasAvatar ? (
                    <AvatarView avatar={row.fromAvatar!} size={38} animateAura={false} />
                  ) : (
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.bgCard, borderWidth: 0, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={notificationIcon(row.type)} size={18} color={notificationIconColor(row.type, t.textMuted)} />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={2} style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800', lineHeight: Math.round(f.caption * 1.3) }}>
                      {rowTitle}
                    </Text>
                    {rowPreview ? (
                      <Text numberOfLines={1} style={{ color: t.textMuted, fontSize: Math.max(10, f.caption - 1), fontWeight: '700', marginTop: 2 }}>
                        {rowPreview}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={{ color: t.textGhost, fontSize: Math.max(9, f.caption - 2), fontWeight: '800' }}>
                      {timeLabel(row.createdAt)}
                    </Text>
                    <Ionicons name={notificationIcon(row.type)} size={13} color={notificationIconColor(row.type, t.textGhost)} />
                  </View>
                  {!row.read && !markedReadIdsRef.current.has(row.id) ? (
                    <View style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: HOME_NOTIFICATION_BADGE_COLOR }} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: 48,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconWrap: {
    width: 44,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 3,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: HOME_NOTIFICATION_BADGE_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: HOME_NOTIFICATION_BADGE_TEXT_COLOR,
    fontSize: 10,
    fontWeight: '900',
  },
  header: {
    minHeight: 46,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  detailMeta: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    marginBottom: 12,
  },
  detailBody: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
  },
  rewardCard: {
    marginTop: 18,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  rewardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rewardIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99,217,143,0.14)',
  },
  rewardTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  rewardButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#63D98F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  rewardButtonText: {
    color: '#07110A',
    fontSize: 13,
    fontWeight: '900',
  },
});

export default memo(NotificationCenterButton);
