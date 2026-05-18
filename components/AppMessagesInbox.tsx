import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from './LangContext';
import { usePremium } from './PremiumContext';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import {
  AppMessageWithState,
  buildAppMessagePreview,
  filterAppMessagesSnapshotForAudience,
  markAppMessageRead,
  pickAppMessagePollOptionText,
  pickAppMessagePollQuestion,
  pickAppMessageText,
  setAppMessageReaction,
  setAppMessagePollVote,
  subscribeUserAppMessages,
} from '../app/app_messages';

const MESSAGE_ICON_IMAGES = {
  dark: require('../assets/images/messages/message-forest.webp'),
  neon: require('../assets/images/messages/message-neon.webp'),
  gold: require('../assets/images/messages/message-gold.webp'),
  coral: require('../assets/images/messages/message-coral.webp'),
  minimalLight: require('../assets/images/messages/message-minimal-light.webp'),
  minimalDark: require('../assets/images/messages/message-minimal-dark.webp'),
};

function inboxText(lang: 'ru' | 'uk' | 'es') {
  if (lang === 'uk') {
    return {
      title: 'Повідомлення',
      emptyTitle: 'Повідомлень немає',
      emptyBody: 'Тут зʼявлятимуться новини від команди.',
      close: 'Закрити',
      back: 'Назад',
      unread: 'Нове',
      like: 'Подобається',
      dislike: 'Не подобається',
      poll: 'Опитування',
      pollVotes: 'голосів',
      pollSelected: 'Ваш вибір',
      pollResultsHint: 'Результати після вибору',
    };
  }
  if (lang === 'es') {
    return {
      title: 'Mensajes',
      emptyTitle: 'No hay mensajes',
      emptyBody: 'Aqui veras las novedades del equipo.',
      close: 'Cerrar',
      back: 'Volver',
      unread: 'Nuevo',
      like: 'Me gusta',
      dislike: 'No me gusta',
      poll: 'Encuesta',
      pollVotes: 'votos',
      pollSelected: 'Tu eleccion',
      pollResultsHint: 'Resultados despues de elegir',
    };
  }
  return {
    title: 'Сообщения',
    emptyTitle: 'Сообщений нет',
    emptyBody: 'Здесь появятся новости от команды.',
    close: 'Закрыть',
    back: 'Назад',
    unread: 'Новое',
    like: 'Нравится',
    dislike: 'Не нравится',
    poll: 'Опрос',
    pollVotes: 'голосов',
    pollSelected: 'Ваш выбор',
    pollResultsHint: 'Результаты после выбора',
  };

}

function formatMessageDate(createdAtMs: number): string {
  if (!createdAtMs) return '';
  const d = new Date(createdAtMs);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

export default function AppMessagesInbox() {
  const { lang } = useLang();
  const { isPremium } = usePremium();
  const { theme: t, f, isDark, themeMode } = useTheme();
  const copy = inboxText(lang);
  const [messages, setMessages] = useState<AppMessageWithState[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const panel = useRef(new Animated.Value(18)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;

  const selected = useMemo(
    () => messages.find((message) => message.id === selectedId) ?? null,
    [messages, selectedId],
  );

  useEffect(() => {
    const sub = subscribeUserAppMessages((snapshot) => {
      const filtered = filterAppMessagesSnapshotForAudience(snapshot, isPremium);
      setMessages(filtered.messages);
      setUnreadCount(filtered.unreadCount);
    });
    return () => sub.remove();
  }, [isPremium]);

  useEffect(() => {
    if (selectedId && !messages.some((message) => message.id === selectedId)) {
      setSelectedId(null);
    }
  }, [messages, selectedId]);

  useEffect(() => {
    if (unreadCount <= 0) {
      badgePulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulse, { toValue: 1.08, duration: 650, useNativeDriver: true }),
        Animated.timing(badgePulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [badgePulse, unreadCount]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: visible ? 1 : 0, duration: visible ? 180 : 140, useNativeDriver: true }),
      Animated.spring(panel, { toValue: visible ? 0 : 18, useNativeDriver: true, friction: 9, tension: 120 }),
    ]).start();
  }, [fade, panel, visible]);

  useEffect(() => {
    if (!selected || !selected.unread) return;
    setMessages((prev) => prev.map((m) => (m.id === selected.id ? { ...m, unread: false, readAtMs: Date.now() } : m)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    void markAppMessageRead(selected.id);
  }, [selected]);

  const openInbox = () => {
    hapticTap();
    setVisible(true);
    setSelectedId(null);
  };

  const closeInbox = () => {
    hapticTap();
    setVisible(false);
    setSelectedId(null);
  };

  const selectMessage = (message: AppMessageWithState) => {
    hapticTap();
    setSelectedId(message.id);
  };

  const reactToSelected = (reaction: 'like' | 'dislike') => {
    if (!selected) return;
    const next = selected.reaction === reaction ? null : reaction;
    setMessages((prev) => prev.map((m) => (m.id === selected.id ? { ...m, reaction: next } : m)));
    hapticTap();
    void setAppMessageReaction(selected.id, next);
  };

  const voteOnSelectedPoll = (optionId: string) => {
    if (!selected?.poll || selected.pollOptionId === optionId) return;
    const previousOptionId = selected.pollOptionId;
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id !== selected.id || !message.poll) return message;
        const counts = { ...message.poll.counts };
        if (previousOptionId) {
          counts[previousOptionId] = Math.max(0, (counts[previousOptionId] || 0) - 1);
        }
        counts[optionId] = (counts[optionId] || 0) + 1;
        return {
          ...message,
          pollOptionId: optionId,
          poll: {
            ...message.poll,
            counts,
            voteCount: previousOptionId ? message.poll.voteCount : message.poll.voteCount + 1,
          },
        };
      }),
    );
    hapticTap();
    void setAppMessagePollVote(selected.id, optionId);
  };

  const chrome = isDark
    ? {
      bg: '#111820',
      panel: '#17202A',
      card: '#202934',
      border: 'rgba(255,255,255,0.10)',
      text: '#F7F8FB',
      muted: '#AAB3C2',
      soft: '#7C8798',
    }
    : {
      bg: themeMode === 'minimalLight' ? '#F3ECDC' : '#F7F8FB',
      panel: '#FFFFFF',
      card: '#F1F4F8',
      border: 'rgba(32,37,46,0.12)',
      text: '#20252E',
      muted: '#657084',
      soft: '#8791A2',
    };
  const headerIcon = MESSAGE_ICON_IMAGES[themeMode] ?? MESSAGE_ICON_IMAGES.minimalDark;

  const renderList = () => (
    <>
      <View style={styles.modalHeader}>
        <View>
          <Text style={[styles.modalTitle, { color: chrome.text, fontSize: Math.max(20, f.h2) }]}>{copy.title}</Text>
          <Text style={[styles.modalSub, { color: chrome.muted }]}>
            {unreadCount > 0 ? `${unreadCount}` : '0'}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={copy.close}
          activeOpacity={0.75}
          onPress={closeInbox}
          style={[styles.roundIcon, { backgroundColor: chrome.card, borderColor: chrome.border }]}
        >
          <Ionicons name="close" size={21} color={chrome.text} />
        </TouchableOpacity>
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="mail-open-outline" size={34} color={chrome.soft} />
          <Text style={[styles.emptyTitle, { color: chrome.text }]}>{copy.emptyTitle}</Text>
          <Text style={[styles.emptyBody, { color: chrome.muted }]}>{copy.emptyBody}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {messages.map((message) => {
            const text = pickAppMessageText(message, lang);
            const preview = message.poll
              ? pickAppMessagePollQuestion(message.poll, lang)
              : buildAppMessagePreview(text.body, 160);
            return (
              <TouchableOpacity
                key={message.id}
                activeOpacity={0.82}
                onPress={() => selectMessage(message)}
                style={[styles.messageRow, { backgroundColor: chrome.card, borderColor: chrome.border }]}
              >
                <View style={styles.messageRowTop}>
                  <View style={styles.messageTitleWrap}>
                    {message.unread ? <View style={styles.unreadDot} /> : <View style={styles.readDotSpace} />}
                    <Text style={[styles.messageTitle, { color: chrome.text }]} numberOfLines={1}>
                      {text.title}
                    </Text>
                  </View>
                  {message.poll ? (
                    <View style={[styles.pollBadge, { borderColor: chrome.border }]}>
                      <Ionicons name="stats-chart-outline" size={11} color={chrome.soft} />
                      <Text style={[styles.pollBadgeText, { color: chrome.soft }]}>{copy.poll}</Text>
                    </View>
                  ) : null}
                  <Text style={[styles.messageDate, { color: chrome.soft }]}>{formatMessageDate(message.createdAtMs)}</Text>
                </View>
                <Text style={[styles.messagePreview, { color: chrome.muted }]} numberOfLines={2}>
                  {preview}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </>
  );

  const renderPoll = (message: AppMessageWithState) => {
    if (!message.poll) return null;
    const poll = message.poll;
    const showResults = Boolean(message.pollOptionId);
    const totalVotes = Math.max(0, poll.voteCount);
    return (
      <View style={[styles.pollCard, { backgroundColor: chrome.card, borderColor: chrome.border }]}>
        <View style={styles.pollHeader}>
          <View style={[styles.pollHeaderIcon, { backgroundColor: isDark ? '#263447' : '#E7EEF8' }]}>
            <Ionicons name="stats-chart" size={15} color={isDark ? '#93C5FD' : '#2563EB'} />
          </View>
          <View style={styles.pollHeaderText}>
            <Text style={[styles.pollLabel, { color: chrome.soft }]}>{copy.poll}</Text>
            <Text style={[styles.pollQuestion, { color: chrome.text }]}>{pickAppMessagePollQuestion(poll, lang)}</Text>
          </View>
        </View>

        <View style={styles.pollOptions}>
          {poll.options.map((option) => {
            const selectedOption = message.pollOptionId === option.id;
            const count = Math.max(0, poll.counts[option.id] || 0);
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const optionColor = selectedOption ? '#63D98F' : chrome.text;
            return (
              <TouchableOpacity
                key={option.id}
                activeOpacity={0.84}
                onPress={() => voteOnSelectedPoll(option.id)}
                style={[
                  styles.pollOption,
                  {
                    borderColor: selectedOption ? '#63D98F' : chrome.border,
                    backgroundColor: selectedOption ? 'rgba(99,217,143,0.12)' : (isDark ? '#17202A' : '#FFFFFF'),
                  },
                ]}
              >
                <View style={styles.pollOptionTop}>
                  <Ionicons
                    name={selectedOption ? 'radio-button-on' : 'radio-button-off'}
                    size={17}
                    color={selectedOption ? '#63D98F' : chrome.soft}
                  />
                  <Text style={[styles.pollOptionText, { color: optionColor }]} numberOfLines={3}>
                    {pickAppMessagePollOptionText(option, lang)}
                  </Text>
                  {showResults ? (
                    <Text style={[styles.pollOptionMeta, { color: selectedOption ? '#63D98F' : chrome.soft }]}>
                      {pct}%
                    </Text>
                  ) : null}
                </View>
                {showResults ? (
                  <View style={[styles.pollTrack, { backgroundColor: isDark ? '#0F1720' : '#E8EEF6' }]}>
                    <View style={[styles.pollFill, { width: `${pct}%`, backgroundColor: selectedOption ? '#63D98F' : '#93A4B8' }]} />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.pollFooter, { color: chrome.soft }]}>
          {showResults ? `${copy.pollVotes}: ${totalVotes}` : copy.pollResultsHint}
        </Text>
      </View>
    );
  };

  const renderDetail = () => {
    if (!selected) return null;
    const text = pickAppMessageText(selected, lang);
    return (
      <>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={copy.back}
            activeOpacity={0.75}
            onPress={() => {
              hapticTap();
              setSelectedId(null);
            }}
            style={[styles.roundIcon, { backgroundColor: chrome.card, borderColor: chrome.border }]}
          >
            <Ionicons name="chevron-back" size={22} color={chrome.text} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={copy.close}
            activeOpacity={0.75}
            onPress={closeInbox}
            style={[styles.roundIcon, { backgroundColor: chrome.card, borderColor: chrome.border }]}
          >
            <Ionicons name="close" size={21} color={chrome.text} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
          <Text style={[styles.detailDate, { color: chrome.soft }]}>{formatMessageDate(selected.createdAtMs)}</Text>
          <Text style={[styles.detailTitle, { color: chrome.text }]}>{text.title}</Text>
          <Text style={[styles.detailBody, { color: chrome.muted }]}>{text.body}</Text>
          {renderPoll(selected)}

          <View style={styles.reactions}>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => reactToSelected('like')}
              style={[
                styles.reactionButton,
                {
                  borderColor: selected.reaction === 'like' ? '#63D98F' : chrome.border,
                  backgroundColor: selected.reaction === 'like' ? 'rgba(99,217,143,0.14)' : chrome.card,
                },
              ]}
            >
              <Ionicons name={selected.reaction === 'like' ? 'thumbs-up' : 'thumbs-up-outline'} size={18} color={selected.reaction === 'like' ? '#63D98F' : chrome.muted} />
              <Text style={[styles.reactionText, { color: selected.reaction === 'like' ? '#63D98F' : chrome.muted }]}>{copy.like}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => reactToSelected('dislike')}
              style={[
                styles.reactionButton,
                {
                  borderColor: selected.reaction === 'dislike' ? '#F87171' : chrome.border,
                  backgroundColor: selected.reaction === 'dislike' ? 'rgba(248,113,113,0.14)' : chrome.card,
                },
              ]}
            >
              <Ionicons name={selected.reaction === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'} size={18} color={selected.reaction === 'dislike' ? '#F87171' : chrome.muted} />
              <Text style={[styles.reactionText, { color: selected.reaction === 'dislike' ? '#F87171' : chrome.muted }]}>{copy.dislike}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </>
    );
  };

  return (
    <>
      <TouchableOpacity
        testID="home-app-messages-button"
        activeOpacity={0.78}
        accessibilityRole="button"
        accessibilityLabel={copy.title}
        onPress={openInbox}
        style={styles.headerButton}
      >
        <Image source={headerIcon} style={styles.headerIcon} contentFit="contain" />
        {unreadCount > 0 && (
          <Animated.View style={[styles.badge, { transform: [{ scale: badgePulse }] }]}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
          </Animated.View>
        )}
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="none" onRequestClose={closeInbox}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeInbox} />
        </Animated.View>
        <View pointerEvents="box-none" style={styles.modalWrap}>
          <Animated.View style={[styles.panelAnim, { opacity: fade, transform: [{ translateY: panel }] }]}>
            <LinearGradient
              colors={isDark ? ['#1A2430', '#101820'] : ['#FFFFFF', '#F4F6FA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.panel, { borderColor: chrome.border }]}
            >
              {selected ? renderDetail() : renderList()}
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: 56,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    width: 52,
    height: 36,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.56)',
  },
  modalWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 34,
  },
  panelAnim: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  panel: {
    maxHeight: '86%',
    minHeight: 360,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  modalTitle: {
    fontWeight: '900',
  },
  modalSub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  roundIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    gap: 10,
    paddingBottom: 4,
  },
  messageRow: {
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 13,
  },
  messageRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 7,
  },
  messageTitleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  readDotSpace: {
    width: 8,
    height: 8,
  },
  messageTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '900',
  },
  messageDate: {
    fontSize: 11,
    fontWeight: '800',
  },
  pollBadge: {
    height: 22,
    borderRadius: 11,
    borderWidth: 0.5,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pollBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  messagePreview: {
    paddingLeft: 16,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '900',
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontWeight: '600',
  },
  detailContent: {
    paddingBottom: 6,
  },
  detailDate: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '900',
    marginBottom: 14,
  },
  detailBody: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
  },
  pollCard: {
    marginTop: 18,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  pollHeaderIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  pollLabel: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  pollQuestion: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  pollOptions: {
    gap: 8,
  },
  pollOption: {
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  pollOptionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pollOptionText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  pollOptionMeta: {
    minWidth: 38,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '900',
  },
  pollTrack: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 9,
  },
  pollFill: {
    height: '100%',
    borderRadius: 999,
  },
  pollFooter: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: '800',
  },
  reactions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  reactionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 10,
  },
  reactionText: {
    fontSize: 12,
    fontWeight: '900',
  },
});
