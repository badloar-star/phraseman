import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import CompassDepthSurface from './CompassDepthSurface';
import { useIsFocused } from '@react-navigation/native';
import { useLang } from './LangContext';
import { usePremium } from './PremiumContext';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang, type Lang } from '../constants/i18n';
import { consumeVipCelebration } from '../app/vip_celebration_state';
import {
  AppMessageWithState,
  buildAppMessagePreview,
  dismissAppMessage,
  filterAppMessagesSnapshotForAudience,
  markAppMessageRead,
  pickAppMessagePollOptionText,
  pickAppMessagePollQuestion,
  pickAppMessageText,
  setAppMessageReaction,
  setAppMessagePollVote,
  subscribeUserAppMessages,
} from '../app/app_messages';
import VipSurveyModal from './VipSurveyModal';
import VipCelebrationModal from './VipCelebrationModal';
import VipSurveyReviewPromptModal from './VipSurveyReviewPromptModal';
import type { SubmitVipSurveyResponse } from '../app/vip_survey';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import type { ThemeMode } from '../constants/theme';

const MESSAGE_ICON_IMAGES: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/header_glyphs/theme-accent-buttons/message-button-dark-outline-v1.webp'),
  gold: require('../assets/images/header_glyphs/theme-accent-buttons/message-button-gold-outline-v1.webp'),
  coral: require('../assets/images/header_glyphs/theme-accent-buttons/message-button-coral-outline-v1.webp'),
  minimalDark: require('../assets/images/header_glyphs/theme-accent-buttons/message-button-minimalDark-outline-v1.webp'),
  midnight: require('../assets/images/header_glyphs/theme-accent-buttons/message-button-midnight-outline-v1.webp'),
  ember: require('../assets/images/header_glyphs/theme-accent-buttons/message-button-ember-outline-v1.webp'),
  aurora: require('../assets/images/header_glyphs/theme-accent-buttons/message-button-aurora-outline-v1.webp'),
  volt: require('../assets/images/header_glyphs/theme-accent-buttons/message-button-volt-outline-v1.webp'),
};

const BLUR_RENDER_GRACE_MS = 450;

function inboxText(lang: Lang) {
  return {
    title: triLang(lang, { ru: 'Сообщения', uk: 'Повідомлення', es: 'Mensajes', 'pt-BR': 'Mensagens', vi: 'Tin nhắn', id: 'Pesan', tr: 'Mesajlar', pl: 'Wiadomości' }),
    emptyTitle: triLang(lang, { ru: 'Сообщений нет', uk: 'Повідомлень немає', es: 'No hay mensajes', 'pt-BR': 'Não há mensagens', vi: 'Chưa có tin nhắn', id: 'Belum ada pesan', tr: 'Mesaj yok', pl: 'Brak wiadomości' }),
    emptyBody: triLang(lang, { ru: 'Здесь появятся новости от команды.', uk: 'Тут зʼявлятимуться новини від команди.', es: 'Aqui veras las novedades del equipo.', 'pt-BR': 'Aqui você verá as novidades da equipe.', vi: 'Tin tức từ đội ngũ sẽ xuất hiện tại đây.', id: 'Kabar dari tim akan muncul di sini.', tr: 'Ekipten gelen haberler burada görünecek.', pl: 'Tutaj pojawią się nowości od zespołu.' }),
    close: triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' }),
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wróć' }),
    unread: triLang(lang, { ru: 'Новое', uk: 'Нове', es: 'Nuevo', 'pt-BR': 'Novo', vi: 'Mới', id: 'Baru', tr: 'Yeni', pl: 'Nowe' }),
    like: triLang(lang, { ru: 'Нравится', uk: 'Подобається', es: 'Me gusta', 'pt-BR': 'Gostei', vi: 'Thích', id: 'Suka', tr: 'Beğen', pl: 'Lubię to' }),
    dislike: triLang(lang, { ru: 'Не нравится', uk: 'Не подобається', es: 'No me gusta', 'pt-BR': 'Não gostei', vi: 'Không thích', id: 'Tidak suka', tr: 'Beğenme', pl: 'Nie lubię' }),
    poll: triLang(lang, { ru: 'Опрос', uk: 'Опитування', es: 'Encuesta', 'pt-BR': 'Enquete', vi: 'Khảo sát', id: 'Jajak pendapat', tr: 'Anket', pl: 'Ankieta' }),
    vipSurvey: triLang(lang, { ru: 'VIP-опрос', uk: 'VIP-опитування', es: 'VIP survey', 'pt-BR': 'VIP survey', vi: 'VIP survey', id: 'VIP survey', tr: 'VIP survey', pl: 'VIP survey' }),
    vipSurveyCta: triLang(lang, { ru: 'Пройти опрос', uk: 'Пройти опитування', es: 'Take survey', 'pt-BR': 'Take survey', vi: 'Take survey', id: 'Take survey', tr: 'Take survey', pl: 'Take survey' }),
    vipSurveyHint: triLang(lang, {
      ru: 'Ответьте на несколько вопросов и активируйте месяц VIP.',
      uk: 'Дайте відповідь на кілька запитань і активуйте місяць VIP.',
      es: 'Answer a few questions and activate one month of VIP.',
      'pt-BR': 'Answer a few questions and activate one month of VIP.',
      vi: 'Answer a few questions and activate one month of VIP.',
      id: 'Answer a few questions and activate one month of VIP.',
      tr: 'Answer a few questions and activate one month of VIP.',
      pl: 'Answer a few questions and activate one month of VIP.',
    }),
    dismiss: triLang(lang, { ru: 'Убрать уведомление', uk: 'Прибрати сповіщення', es: 'Dismiss notification', 'pt-BR': 'Dismiss notification', vi: 'Dismiss notification', id: 'Dismiss notification', tr: 'Dismiss notification', pl: 'Dismiss notification' }),
    pollVotes: triLang(lang, { ru: 'голосов', uk: 'голосів', es: 'votos', 'pt-BR': 'votos', vi: 'lượt bình chọn', id: 'suara', tr: 'oy', pl: 'głosów' }),
    pollSelected: triLang(lang, { ru: 'Ваш выбор', uk: 'Ваш вибір', es: 'Tu eleccion', 'pt-BR': 'Sua escolha', vi: 'Lựa chọn của bạn', id: 'Pilihan Anda', tr: 'Seçiminiz', pl: 'Twój wybór' }),
    pollResultsHint: triLang(lang, { ru: 'Результаты после выбора', uk: 'Результати після вибору', es: 'Resultados despues de elegir', 'pt-BR': 'Resultados após escolher', vi: 'Kết quả sau khi chọn', id: 'Hasil setelah memilih', tr: 'Sonuçlar seçimden sonra', pl: 'Wyniki po wyborze' }),
  };
}

function formatMessageDate(createdAtMs: number): string {
  if (!createdAtMs) return '';
  const d = new Date(createdAtMs);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

function AppMessagesInbox() {
  const isScreenFocused = useIsFocused();
  const { lang } = useLang();
  const { hasPremiumAccess } = usePremium();
  const { f, isDark, themeMode } = useTheme();
  const copy = inboxText(lang);
  const [messages, setMessages] = useState<AppMessageWithState[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [surveyTarget, setSurveyTarget] = useState<AppMessageWithState | null>(null);
  const [vipCelebrationVisible, setVipCelebrationVisible] = useState(false);
  const [vipSurveyReviewPromptVisible, setVipSurveyReviewPromptVisible] = useState(false);
  const [renderButton, setRenderButton] = useState(isScreenFocused);
  const fade = useRef(new Animated.Value(0)).current;
  const panel = useRef(new Animated.Value(18)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;
  const surveyOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurRenderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (blurRenderTimer.current) {
      clearTimeout(blurRenderTimer.current);
      blurRenderTimer.current = null;
    }

    if (isScreenFocused) {
      setRenderButton(true);
      return;
    }

    blurRenderTimer.current = setTimeout(() => {
      blurRenderTimer.current = null;
      setRenderButton(false);
    }, BLUR_RENDER_GRACE_MS);

    if (surveyOpenTimer.current) {
      clearTimeout(surveyOpenTimer.current);
      surveyOpenTimer.current = null;
    }
    setVisible(false);
    setSelectedId(null);
    setSurveyTarget(null);
    setVipCelebrationVisible(false);
    setVipSurveyReviewPromptVisible(false);

    return () => {
      if (blurRenderTimer.current) {
        clearTimeout(blurRenderTimer.current);
        blurRenderTimer.current = null;
      }
    };
  }, [isScreenFocused]);

  const selected = useMemo(
    () => messages.find((message) => message.id === selectedId) ?? null,
    [messages, selectedId],
  );

  useEffect(() => {
    const sub = subscribeUserAppMessages((snapshot) => {
      const filtered = filterAppMessagesSnapshotForAudience(snapshot, hasPremiumAccess);
      setMessages(filtered.messages);
      setUnreadCount(filtered.unreadCount);
    });
    return () => sub.remove();
  }, [hasPremiumAccess]);

  useEffect(() => {
    if (!hasPremiumAccess || !surveyTarget) return;
    const messageId = surveyTarget.id;
    setSurveyTarget(null);
    setVisible(false);
    setSelectedId(null);
    void dismissAppMessage(messageId);
  }, [hasPremiumAccess, surveyTarget]);

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

  useEffect(() => () => {
    if (surveyOpenTimer.current) clearTimeout(surveyOpenTimer.current);
    if (blurRenderTimer.current) clearTimeout(blurRenderTimer.current);
  }, []);

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

  const dismissSurveyMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((message) => message.id !== messageId));
    setUnreadCount((prev) => {
      const target = messages.find((message) => message.id === messageId);
      return target?.unread ? Math.max(0, prev - 1) : prev;
    });
    if (selectedId === messageId) setSelectedId(null);
    if (surveyTarget?.id === messageId) setSurveyTarget(null);
    void dismissAppMessage(messageId);
  };

  const openSurvey = (message: AppMessageWithState) => {
    hapticTap();
    if (hasPremiumAccess) {
      dismissSurveyMessage(message.id);
      return;
    }
    if (message.unread) {
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, unread: false, readAtMs: Date.now() } : m)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      void markAppMessageRead(message.id);
    }
    setSelectedId(null);
    setVisible(false);
    if (surveyOpenTimer.current) clearTimeout(surveyOpenTimer.current);
    surveyOpenTimer.current = setTimeout(() => {
      setSurveyTarget(message);
      surveyOpenTimer.current = null;
    }, 180);
  };

  const handleSurveyCompleted = (result: SubmitVipSurveyResponse) => {
    const messageId = surveyTarget?.id;
    if (messageId) {
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
      setSelectedId((current) => (current === messageId ? null : current));
      void dismissAppMessage(messageId);
    }
    setSurveyTarget(null);
    setVisible(false);
    if (result.alreadyGranted) {
      setVipSurveyReviewPromptVisible(true);
    } else {
      void consumeVipCelebration(result.grantAt);
      setVipCelebrationVisible(true);
    }
  };

  const isCompassTheme = false;
  const chrome = isCompassTheme
    ? {
      bg: '#020304',
      panel: '#2F2F31',
      card: '#1F1F21',
      border: 'rgba(242,196,141,0.18)',
      text: '#FFF8E8',
      muted: '#D8D2C8',
      soft: '#F2C48D',
      panelGradient: ['#1F1F21', '#171719'] as const,
    }
    : isDark
    ? {
      bg: '#111820',
      panel: '#17202A',
      card: '#202934',
      border: 'rgba(255,255,255,0.10)',
      text: '#F7F8FB',
      muted: '#AAB3C2',
      soft: '#7C8798',
      panelGradient: ['#1A2430', '#101820'] as const,
    }
    : {
      bg: false ? '#F3ECDC' : '#F7F8FB',
      panel: '#FFFFFF',
      card: '#F1F4F8',
      border: 'rgba(32,37,46,0.12)',
      text: '#20252E',
      muted: '#657084',
      soft: '#8791A2',
      panelGradient: ['#FFFFFF', '#F4F6FA'] as const,
    };
  const vipSurveyAccent = isCompassTheme ? '#F2C48D' : '#64748B';
  const vipSurveyAccentText = isCompassTheme ? '#151008' : '#FFFFFF';
  const vipSurveyTint = isCompassTheme ? 'rgba(242,196,141,0.12)' : 'rgba(100,116,139,0.10)';
  const vipSurveyBorder = isCompassTheme ? 'rgba(242,196,141,0.24)' : 'rgba(100,116,139,0.32)';
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
          style={[styles.roundIcon, isCompassTheme && compassShadow(1), { backgroundColor: chrome.card, borderColor: chrome.border, borderRadius: isCompassTheme ? 8 : 18, overflow: isCompassTheme ? 'hidden' : 'visible' }]}
        >
          {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
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
            const messageRead = !message.unread;
            const text = pickAppMessageText(message, lang);
            const preview = message.kind === 'vip_survey'
              ? copy.vipSurveyHint
              : message.poll
              ? pickAppMessagePollQuestion(message.poll, lang)
              : buildAppMessagePreview(text.body, 160);
            const rowBackgroundColor = messageRead
              ? isCompassTheme
                ? 'rgba(94,98,106,0.34)'
                : isDark
                ? 'rgba(148,163,184,0.14)'
                : '#E5E7EB'
              : chrome.card;
            const rowBorderColor = message.unread && isCompassTheme
              ? COMPASS_RICH.hairlineStrong
              : messageRead
              ? isCompassTheme
                ? 'rgba(242,196,141,0.12)'
                : 'rgba(100,116,139,0.20)'
              : chrome.border;
            const rowTitleColor = messageRead ? chrome.muted : chrome.text;
            const rowMutedColor = messageRead ? chrome.soft : chrome.muted;
            return (
              <TouchableOpacity
                key={message.id}
                activeOpacity={0.82}
                onPress={() => selectMessage(message)}
                testID={message.kind === 'vip_survey' ? 'vip-survey-inbox-row' : undefined}
                style={[styles.messageRow, messageRead && styles.messageRowRead, isCompassTheme && compassShadow(message.unread ? 2 : 1), { backgroundColor: rowBackgroundColor, borderColor: rowBorderColor, borderRadius: isCompassTheme ? 8 : 16, overflow: isCompassTheme ? 'hidden' : 'visible' }]}
              >
                {isCompassTheme ? <CompassDepthSurface radius={8} selected={message.unread} quiet={!message.unread} /> : null}
                <View style={styles.messageRowTop}>
                  <View style={styles.messageTitleWrap}>
                    {message.unread ? <View style={styles.unreadDot} /> : <View style={styles.readDotSpace} />}
                    <Text style={[styles.messageTitle, messageRead && styles.messageTitleRead, { color: rowTitleColor }]} numberOfLines={messageRead ? 1 : 2}>
                      {text.title}
                    </Text>
                  </View>
                </View>
                <View style={styles.messageMetaRow}>
                  {message.kind === 'vip_survey' ? (
                    <View style={[styles.vipSurveyBadge, { backgroundColor: vipSurveyTint, borderColor: vipSurveyBorder, borderRadius: isCompassTheme ? 6 : 11 }]}>
                      <Ionicons name="sparkles-outline" size={11} color={vipSurveyAccent} />
                      <Text style={[styles.vipSurveyBadgeText, { color: vipSurveyAccent }]}>{copy.vipSurvey}</Text>
                    </View>
                  ) : message.poll ? (
                    <View style={[styles.pollBadge, { borderColor: chrome.border }]}>
                      <Ionicons name="stats-chart-outline" size={11} color={chrome.soft} />
                      <Text style={[styles.pollBadgeText, { color: chrome.soft }]}>{copy.poll}</Text>
                    </View>
                  ) : null}
                  <Text style={[styles.messageDate, { color: rowMutedColor }]}>{formatMessageDate(message.createdAtMs)}</Text>
                </View>
                <Text style={[styles.messagePreview, messageRead && styles.messagePreviewRead, { color: rowMutedColor }]} numberOfLines={messageRead ? 1 : 2}>
                  {preview}
                </Text>
                {message.kind === 'vip_survey' ? (
                  <View style={styles.messageRowActions}>
                    <TouchableOpacity
                      testID="vip-survey-inbox-cta"
                      activeOpacity={0.86}
                      accessibilityRole="button"
                      accessibilityLabel={copy.vipSurveyCta}
                      onPress={(event) => {
                        event.stopPropagation?.();
                        openSurvey(message);
                      }}
                      style={[styles.messageRowCta, isCompassTheme && compassShadow(1), { backgroundColor: vipSurveyAccent, borderRadius: isCompassTheme ? 8 : 12, overflow: isCompassTheme ? 'hidden' : 'visible' }]}
                    >
                      {isCompassTheme ? <CompassDepthSurface radius={8} cream /> : null}
                      <Ionicons name="chatbubbles-outline" size={15} color={vipSurveyAccentText} />
                      <Text style={[styles.messageRowCtaText, { color: vipSurveyAccentText }]}>{copy.vipSurveyCta}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
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
      <View style={[styles.pollCard, isCompassTheme && compassShadow(1), { backgroundColor: chrome.card, borderColor: chrome.border, borderRadius: isCompassTheme ? 9 : 16, overflow: isCompassTheme ? 'hidden' : 'visible' }]}>
        {isCompassTheme ? <CompassDepthSurface radius={9} quiet /> : null}
        <View style={styles.pollHeader}>
          <View style={[styles.pollHeaderIcon, { backgroundColor: isCompassTheme ? 'rgba(242,196,141,0.12)' : isDark ? '#263447' : '#E7EEF8', borderRadius: isCompassTheme ? 6 : 15 }]}>
            <Ionicons name="stats-chart" size={15} color={isCompassTheme ? '#F2C48D' : isDark ? '#93C5FD' : '#2563EB'} />
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
            const optionColor = isCompassTheme ? (selectedOption ? COMPASS_RICH.champagne : chrome.text) : selectedOption ? '#63D98F' : chrome.text;
            return (
              <TouchableOpacity
                key={option.id}
                activeOpacity={0.84}
                onPress={() => voteOnSelectedPoll(option.id)}
                style={[
                  styles.pollOption,
                  {
                    borderColor: isCompassTheme ? (selectedOption ? COMPASS_RICH.hairlineStrong : chrome.border) : selectedOption ? '#63D98F' : chrome.border,
                    backgroundColor: isCompassTheme ? (selectedOption ? COMPASS_RICH.washStrong : COMPASS_RICH.charcoalSoft) : selectedOption ? 'rgba(99,217,143,0.12)' : (isDark ? '#17202A' : '#FFFFFF'),
                    borderRadius: isCompassTheme ? 8 : 13,
                    overflow: isCompassTheme ? 'hidden' : 'visible',
                  },
                  isCompassTheme && compassShadow(selectedOption ? 2 : 1),
                ]}
              >
                {isCompassTheme ? <CompassDepthSurface radius={8} selected={selectedOption} quiet={!selectedOption} /> : null}
                <View style={styles.pollOptionTop}>
                  <Ionicons
                    name={selectedOption ? 'radio-button-on' : 'radio-button-off'}
                    size={17}
                    color={isCompassTheme ? (selectedOption ? COMPASS_RICH.champagne : chrome.soft) : selectedOption ? '#63D98F' : chrome.soft}
                  />
                  <Text style={[styles.pollOptionText, { color: optionColor }]} numberOfLines={3}>
                    {pickAppMessagePollOptionText(option, lang)}
                  </Text>
                  {showResults ? (
                    <Text style={[styles.pollOptionMeta, { color: isCompassTheme ? (selectedOption ? COMPASS_RICH.champagne : chrome.soft) : selectedOption ? '#63D98F' : chrome.soft }]}>
                      {pct}%
                    </Text>
                  ) : null}
                </View>
                {showResults ? (
                  <View style={[styles.pollTrack, { backgroundColor: isCompassTheme ? COMPASS_RICH.void : isDark ? '#0F1720' : '#E8EEF6' }]}>
                    <View style={[styles.pollFill, { width: `${pct}%`, backgroundColor: isCompassTheme ? (selectedOption ? COMPASS_RICH.champagne : COMPASS_RICH.copper) : selectedOption ? '#63D98F' : '#93A4B8' }]} />
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

  const renderVipSurveyCta = (message: AppMessageWithState) => {
    if (message.kind !== 'vip_survey') return null;
    return (
      <View style={[styles.vipSurveyCard, isCompassTheme && compassShadow(2), { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : isDark ? '#182131' : '#F8FAFC', borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'rgba(100,116,139,0.26)', borderRadius: isCompassTheme ? 9 : 16, overflow: isCompassTheme ? 'hidden' : 'visible' }]}>
        {isCompassTheme ? <CompassDepthSurface radius={9} selected /> : null}
        <View style={styles.vipSurveyCardTop}>
          <View style={[styles.vipSurveyIcon, { backgroundColor: vipSurveyTint, borderRadius: isCompassTheme ? 6 : 16 }]}>
            <Ionicons name="sparkles" size={18} color={vipSurveyAccent} />
          </View>
          <View style={styles.vipSurveyTextWrap}>
            <Text style={[styles.vipSurveyTitle, { color: chrome.text }]}>{copy.vipSurvey}</Text>
            <Text style={[styles.vipSurveyBody, { color: chrome.muted }]}>{copy.vipSurveyHint}</Text>
          </View>
        </View>
        <TouchableOpacity
          testID="vip-survey-detail-cta"
          activeOpacity={0.86}
          accessibilityRole="button"
          accessibilityLabel={copy.vipSurveyCta}
          onPress={() => openSurvey(message)}
          style={[styles.vipSurveyButton, isCompassTheme && compassShadow(1), { backgroundColor: vipSurveyAccent, borderRadius: isCompassTheme ? 8 : 14, overflow: isCompassTheme ? 'hidden' : 'visible' }]}
        >
          {isCompassTheme ? <CompassDepthSurface radius={8} cream /> : null}
          <Ionicons name="chatbubbles-outline" size={17} color={vipSurveyAccentText} />
          <Text style={[styles.vipSurveyButtonText, { color: vipSurveyAccentText }]}>{copy.vipSurveyCta}</Text>
        </TouchableOpacity>
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
            style={[styles.roundIcon, isCompassTheme && compassShadow(1), { backgroundColor: chrome.card, borderColor: chrome.border, borderRadius: isCompassTheme ? 8 : 18, overflow: isCompassTheme ? 'hidden' : 'visible' }]}
          >
            {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
            <Ionicons name="chevron-back" size={22} color={chrome.text} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
          <Text style={[styles.detailDate, { color: chrome.soft }]}>{formatMessageDate(selected.createdAtMs)}</Text>
          <Text style={[styles.detailTitle, { color: chrome.text }]}>{text.title}</Text>
          <Text style={[styles.detailBody, { color: chrome.muted }]}>{text.body}</Text>
          {renderVipSurveyCta(selected)}
          {renderPoll(selected)}

          {selected.kind === 'vip_survey' ? null : <View style={styles.reactions}>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => reactToSelected('like')}
              style={[
                styles.reactionButton,
                {
                  borderColor: isCompassTheme ? (selected.reaction === 'like' ? COMPASS_RICH.hairlineStrong : chrome.border) : selected.reaction === 'like' ? '#63D98F' : chrome.border,
                  backgroundColor: isCompassTheme ? (selected.reaction === 'like' ? COMPASS_RICH.washStrong : chrome.card) : selected.reaction === 'like' ? 'rgba(99,217,143,0.14)' : chrome.card,
                  borderRadius: isCompassTheme ? 8 : 15,
                  overflow: isCompassTheme ? 'hidden' : 'visible',
                },
                isCompassTheme && compassShadow(selected.reaction === 'like' ? 2 : 1),
              ]}
            >
              {isCompassTheme ? <CompassDepthSurface radius={8} selected={selected.reaction === 'like'} quiet={selected.reaction !== 'like'} /> : null}
              <Ionicons name={selected.reaction === 'like' ? 'thumbs-up' : 'thumbs-up-outline'} size={18} color={isCompassTheme ? (selected.reaction === 'like' ? COMPASS_RICH.champagne : chrome.muted) : selected.reaction === 'like' ? '#63D98F' : chrome.muted} />
              <Text style={[styles.reactionText, { color: isCompassTheme ? (selected.reaction === 'like' ? COMPASS_RICH.champagne : chrome.muted) : selected.reaction === 'like' ? '#63D98F' : chrome.muted }]}>{copy.like}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => reactToSelected('dislike')}
              style={[
                styles.reactionButton,
                {
                  borderColor: isCompassTheme ? (selected.reaction === 'dislike' ? COMPASS_RICH.copper : chrome.border) : selected.reaction === 'dislike' ? '#F87171' : chrome.border,
                  backgroundColor: isCompassTheme ? (selected.reaction === 'dislike' ? COMPASS_RICH.copperWash : chrome.card) : selected.reaction === 'dislike' ? 'rgba(248,113,113,0.14)' : chrome.card,
                  borderRadius: isCompassTheme ? 8 : 15,
                  overflow: isCompassTheme ? 'hidden' : 'visible',
                },
                isCompassTheme && compassShadow(selected.reaction === 'dislike' ? 2 : 1),
              ]}
            >
              {isCompassTheme ? <CompassDepthSurface radius={8} selected={selected.reaction === 'dislike'} quiet={selected.reaction !== 'dislike'} /> : null}
              <Ionicons name={selected.reaction === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'} size={18} color={isCompassTheme ? (selected.reaction === 'dislike' ? COMPASS_RICH.peach : chrome.muted) : selected.reaction === 'dislike' ? '#F87171' : chrome.muted} />
              <Text style={[styles.reactionText, { color: isCompassTheme ? (selected.reaction === 'dislike' ? COMPASS_RICH.peach : chrome.muted) : selected.reaction === 'dislike' ? '#F87171' : chrome.muted }]}>{copy.dislike}</Text>
            </TouchableOpacity>
          </View>}
        </ScrollView>
      </>
    );
  };

  if (!renderButton) return null;

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
          <Animated.View
            style={[styles.badge, { transform: [{ scale: badgePulse }] }]}
            accessibilityLabel={`${unreadCount > 99 ? '99+' : unreadCount} ${copy.unread}`}
          >
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
              colors={chrome.panelGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.panel, isCompassTheme && compassShadow(3), { borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : chrome.border, borderRadius: isCompassTheme ? 10 : 24 }]}
            >
              {isCompassTheme ? <CompassDepthSurface radius={10} quiet /> : null}
              {selected ? renderDetail() : renderList()}
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
      <VipSurveyModal
        visible={!!surveyTarget}
        messageId={surveyTarget?.id ?? ''}
        onClose={() => setSurveyTarget(null)}
        onCompleted={handleSurveyCompleted}
      />
      <VipCelebrationModal
        visible={vipCelebrationVisible}
        onClose={() => {
          setVipCelebrationVisible(false);
          setVipSurveyReviewPromptVisible(true);
        }}
      />
      <VipSurveyReviewPromptModal
        visible={vipSurveyReviewPromptVisible}
        onClose={() => setVipSurveyReviewPromptVisible(false)}
      />
    </>
  );
}

export default memo(AppMessagesInbox);

const styles = StyleSheet.create({
  headerButton: {
    width: 66,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    width: 56,
    height: 40,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
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
  messageRowRead: {
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  messageRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 5,
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
    lineHeight: 20,
    fontWeight: '900',
  },
  messageTitleRead: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },
  messageMetaRow: {
    paddingLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 7,
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
  vipSurveyBadge: {
    height: 22,
    borderRadius: 11,
    borderWidth: 0.5,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(100,116,139,0.10)',
  },
  vipSurveyBadgeText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
  },
  messagePreview: {
    paddingLeft: 16,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  messagePreviewRead: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  messageRowActions: {
    marginTop: 10,
    paddingLeft: 16,
    alignItems: 'flex-start',
  },
  messageRowCta: {
    minHeight: 34,
    borderRadius: 12,
    backgroundColor: '#475569',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
  },
  messageRowCtaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
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
  vipSurveyCard: {
    marginTop: 18,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  vipSurveyCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  vipSurveyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(100,116,139,0.14)',
  },
  vipSurveyTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  vipSurveyTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  vipSurveyBody: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  vipSurveyButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#475569',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  vipSurveyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
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
