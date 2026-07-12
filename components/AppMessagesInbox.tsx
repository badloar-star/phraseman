import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import { Ionicons } from '@expo/vector-icons';
import { useMessageReceivedCue } from '../hooks/use-message-received-cue';
import { useIsFocused } from '@react-navigation/native';
import { useLang } from './LangContext';
import { usePremium } from './PremiumContext';
import { useTheme } from './ThemeContext';
import MotionModal from './MotionModal';
import { hapticTap } from '../hooks/use-haptics';
import { triLang, type Lang } from '../constants/i18n';
import { monoIcon } from '../constants/monoIcon';
import { consumeVipCelebration } from '../app/vip_celebration_state';
import {
  type AppMessageWithState,
  type AppMessagesSnapshot,
  buildAppMessagePreview,
  dismissAppMessage,
  filterAppMessagesSnapshotForAudience,
  markAppMessageRead,
  pickAppMessagePollOptionText,
  pickAppMessagePollQuestion,
  pickAppMessageText,
  setAppMessageReaction,
  setAppMessagePollVote,
  claimReportReplyShardsOptimistically,
  subscribeUserAppMessages,
  readAnimatedMessageIds,
  markMessageIdsAnimated,
  readCachedAppMessagesSnapshot,
  refreshAppMessagesSnapshotOnce,
} from '../app/app_messages';
import VipSurveyModal from './VipSurveyModal';
import VipCelebrationModal from './VipCelebrationModal';
import VipSurveyReviewPromptModal from './VipSurveyReviewPromptModal';
import type { SubmitVipSurveyResponse } from '../app/vip_survey';
import { HOME_NOTIFICATION_BADGE_COLOR, HOME_NOTIFICATION_BADGE_TEXT_COLOR } from './homeNotificationBadge';

const BLUR_RENDER_GRACE_MS = 450;
const BADGE_FOREGROUND_REFRESH_MIN_INTERVAL_MS = 3 * 60 * 60_000;

function inboxText(lang: Lang) {
  return {
    title: triLang(lang, { ru: 'Сообщения', uk: 'Повідомлення', es: 'Mensajes', 'pt-BR': 'Mensagens', vi: 'Tin nhắn', id: 'Pesan', tr: 'Mesajlar', pl: 'Wiadomości' }),
    emptyTitle: triLang(lang, { ru: 'Сообщений нет', uk: 'Повідомлень немає', es: 'No hay mensajes', 'pt-BR': 'Não há mensagens', vi: 'Chưa có tin nhắn', id: 'Belum ada pesan', tr: 'Mesaj yok', pl: 'Brak wiadomości' }),
    emptyBody: triLang(lang, { ru: 'Здесь появятся новости от команды.', uk: 'Тут зʼявлятимуться новини від команди.', es: 'Aqui veras las novedades del equipo.', 'pt-BR': 'Aqui você verá as novidades da equipe.', vi: 'Tin tức từ đội ngũ sẽ xuất hiện tại đây.', id: 'Kabar dari tim akan muncul di sini.', tr: 'Ekipten gelen haberler burada görünecek.', pl: 'Tutaj pojawią się nowości od zespołu.' }),
    close: triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' }),
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wróć' }),
    unread: triLang(lang, { ru: 'Новое', uk: 'Нове', es: 'Nuevo', 'pt-BR': 'Novo', vi: 'Mới', id: 'Baru', tr: 'Yeni', pl: 'Nowe' }),
    allRead: triLang(lang, { ru: 'Все прочитаны', uk: 'Усі прочитані', es: 'Todo leído', 'pt-BR': 'Tudo lido', vi: 'Đã đọc hết', id: 'Semua dibaca', tr: 'Hepsi okundu', pl: 'Wszystko przeczytane' }),
    newCount: (n: number) => triLang(lang, {
      ru: `${n} новых`,
      uk: `${n} нових`,
      es: `${n} nuevos`,
      'pt-BR': `${n} novas`,
      vi: `${n} tin mới`,
      id: `${n} baru`,
      tr: `${n} yeni`,
      pl: `${n} nowych`,
    }),
    like: triLang(lang, { ru: 'Нравится', uk: 'Подобається', es: 'Me gusta', 'pt-BR': 'Gostei', vi: 'Thích', id: 'Suka', tr: 'Beğen', pl: 'Lubię to' }),
    dislike: triLang(lang, { ru: 'Не нравится', uk: 'Не подобається', es: 'No me gusta', 'pt-BR': 'Não gostei', vi: 'Không thích', id: 'Tidak suka', tr: 'Beğenme', pl: 'Nie lubię' }),
    poll: triLang(lang, { ru: 'Опрос', uk: 'Опитування', es: 'Encuesta', 'pt-BR': 'Enquete', vi: 'Khảo sát', id: 'Jajak pendapat', tr: 'Anket', pl: 'Ankieta' }),
    vipSurvey: triLang(lang, { ru: 'Plus-опрос', uk: 'Plus-опитування', es: 'Plus survey', 'pt-BR': 'Plus survey', vi: 'Plus survey', id: 'Plus survey', tr: 'Plus survey', pl: 'Plus survey' }),
    vipSurveyCta: triLang(lang, { ru: 'Пройти опрос', uk: 'Пройти опитування', es: 'Take survey', 'pt-BR': 'Take survey', vi: 'Take survey', id: 'Take survey', tr: 'Take survey', pl: 'Take survey' }),
    vipSurveyHint: triLang(lang, {
      ru: 'Ответьте на несколько вопросов и активируйте месяц Plus.',
      uk: 'Дайте відповідь на кілька запитань і активуйте місяць Plus.',
      es: 'Answer a few questions and activate one month of Plus.',
      'pt-BR': 'Answer a few questions and activate one month of Plus.',
      vi: 'Answer a few questions and activate one month of Plus.',
      id: 'Answer a few questions and activate one month of Plus.',
      tr: 'Answer a few questions and activate one month of Plus.',
      pl: 'Answer a few questions and activate one month of Plus.',
    }),
    dismiss: triLang(lang, { ru: 'Убрать уведомление', uk: 'Прибрати сповіщення', es: 'Dismiss notification', 'pt-BR': 'Dismiss notification', vi: 'Dismiss notification', id: 'Dismiss notification', tr: 'Dismiss notification', pl: 'Dismiss notification' }),
    pollVotes: triLang(lang, { ru: 'голосов', uk: 'голосів', es: 'votos', 'pt-BR': 'votos', vi: 'lượt bình chọn', id: 'suara', tr: 'oy', pl: 'głosów' }),
    pollSelected: triLang(lang, { ru: 'Ваш выбор', uk: 'Ваш вибір', es: 'Tu eleccion', 'pt-BR': 'Sua escolha', vi: 'Lựa chọn của bạn', id: 'Pilihan Anda', tr: 'Seçiminiz', pl: 'Twój wybór' }),
    pollResultsHint: triLang(lang, { ru: 'Результаты после выбора', uk: 'Результати після вибору', es: 'Resultados despues de elegir', 'pt-BR': 'Resultados após escolher', vi: 'Kết quả sau khi chọn', id: 'Hasil setelah memilih', tr: 'Sonuçlar seçimden sonra', pl: 'Wyniki po wyborze' }),
    helpBoard: triLang(lang, { ru: 'Help Board', uk: 'Help Board', es: 'Help Board', 'pt-BR': 'Help Board', vi: 'Help Board', id: 'Help Board', tr: 'Help Board', pl: 'Help Board' }),
    leagueChat: triLang(lang, { ru: 'Чат лиги', uk: 'Чат ліги', es: 'Chat de liga', 'pt-BR': 'Chat da liga', vi: 'Chat liga', id: 'Chat liga', tr: 'Lig sohbeti', pl: 'Czat ligi' }),
    inbox: triLang(lang, { ru: 'Inbox', uk: 'Inbox', es: 'Inbox', 'pt-BR': 'Inbox', vi: 'Inbox', id: 'Inbox', tr: 'Inbox', pl: 'Inbox' }),
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

// hex (#RRGGBB) → rgba(...) с заданной непрозрачностью. Нужен для деликатного
// оттенка темы поверх фона панели (мягкий «налёт» цвета, не яркая заливка).
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
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
  const { f, isDark, themeMode, theme } = useTheme();
  const copy = inboxText(lang);
  const [messages, setMessages] = useState<AppMessageWithState[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [surveyTarget, setSurveyTarget] = useState<AppMessageWithState | null>(null);
  const [vipCelebrationVisible, setVipCelebrationVisible] = useState(false);
  const [vipSurveyReviewPromptVisible, setVipSurveyReviewPromptVisible] = useState(false);
  const optimisticReportClaimIdsRef = useRef<Set<string>>(new Set());
  const [renderButton, setRenderButton] = useState(isScreenFocused);
  const [animatedIdsReady, setAnimatedIdsReady] = useState(false);
  const badgePulse = useRef(new Animated.Value(1)).current;
  const surveyOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurRenderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const badgeRefreshInFlightRef = useRef(false);

  // ── «Письмо прилетает в иконку» — анимация + звук при новом сообщении ────────
  const { playMessageReceived } = useMessageReceivedCue();
  // Прогресс полёта конверта (0 — старт у центра сверху, 1 — влетел в иконку).
  const flyAnim = useRef(new Animated.Value(0)).current;
  // Масштаб самой иконки: лёгкий «приём» (подскок) в момент прилёта письма.
  const iconReceiveScale = useRef(new Animated.Value(1)).current;
  const [flying, setFlying] = useState(false);
  // Замер позиции кнопки-иконки в окне, чтобы целиться конвертом точно в неё.
  const buttonRef = useRef<View>(null);
  const iconCenterRef = useRef<{ x: number; y: number } | null>(null);
  // ID сообщений, для которых анимация прилёта УЖЕ показывалась (персистентно, из
  // AsyncStorage). Письмо «прилетает» один раз на сообщение, а не при каждом заходе.
  const animatedIdsRef = useRef<Set<string> | null>(null);
  const flyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Загружаем сохранённые ID один раз при монтировании.
  useEffect(() => {
    let cancelled = false;
    void readAnimatedMessageIds().then((ids) => {
      if (!cancelled) {
        animatedIdsRef.current = new Set(ids);
        setAnimatedIdsReady(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const measureIcon = useCallback(() => {
    const node = buttonRef.current;
    if (!node || typeof node.measureInWindow !== 'function') return;
    node.measureInWindow((x, y, w, h) => {
      if (Number.isFinite(x) && Number.isFinite(y)) {
        iconCenterRef.current = { x: x + (w || 0) / 2, y: y + (h || 0) / 2 };
      }
    });
  }, []);

  // Защита от наложения: пока конверт ЛЕТИТ, повторный вызов игнорируется —
  // иначе несколько новых сообщений подряд запускали анимацию+звук несколько раз.
  // ref (а не state `flying`), чтобы проверка была синхронной в момент вызова.
  const flightInProgressRef = useRef(false);

  const playEnvelopeFlight = useCallback(() => {
    if (flightInProgressRef.current) return; // уже летит — не дублируем
    flightInProgressRef.current = true;
    measureIcon();
    flyAnim.setValue(0);
    setFlying(true);
    Animated.timing(flyAnim, {
      toValue: 1,
      duration: 720,
      easing: Easing.in(Easing.cubic), // ускоряется к иконке — «затягивает» письмо
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setFlying(false);
    });
    // Иконка «принимает» письмо: подрастает на прилёте и мягко возвращается.
    if (flyTimer.current) clearTimeout(flyTimer.current);
    flyTimer.current = setTimeout(() => {
      flyTimer.current = null;
      playMessageReceived();
      Animated.sequence([
        Animated.spring(iconReceiveScale, { toValue: 1.28, useNativeDriver: true, friction: 4, tension: 160 }),
        Animated.spring(iconReceiveScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }),
      ]).start(() => {
        // полёт + подскок завершились — снимаем замок, можно показать следующий
        flightInProgressRef.current = false;
      });
    }, 560); // совпадает с моментом, когда конверт почти внутри иконки
  }, [flyAnim, iconReceiveScale, measureIcon, playMessageReceived]);

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

  const applyAppMessagesSnapshot = useCallback((snapshot: AppMessagesSnapshot) => {
    const filtered = filterAppMessagesSnapshotForAudience(snapshot, hasPremiumAccess);
    setMessages(filtered.messages);
    setUnreadCount(filtered.unreadCount);
  }, [hasPremiumAccess]);

  useEffect(() => {
    if (!visible) return;
    const sub = subscribeUserAppMessages((snapshot) => {
      applyAppMessagesSnapshot(snapshot);
    });
    return () => sub.remove();
  }, [applyAppMessagesSnapshot, visible]);

  useEffect(() => {
    if (!isScreenFocused || visible) return;
    let cancelled = false;

    const refreshBadge = async () => {
      if (badgeRefreshInFlightRef.current) return;
      badgeRefreshInFlightRef.current = true;
      try {
        const cached = await readCachedAppMessagesSnapshot();
        if (!cancelled) applyAppMessagesSnapshot(cached);
        const refreshed = await refreshAppMessagesSnapshotOnce({
          minIntervalMs: BADGE_FOREGROUND_REFRESH_MIN_INTERVAL_MS,
        });
        if (!cancelled) applyAppMessagesSnapshot(refreshed);
      } finally {
        badgeRefreshInFlightRef.current = false;
      }
    };

    void refreshBadge();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshBadge();
    });

    return () => {
      cancelled = true;
      appSub.remove();
    };
  }, [applyAppMessagesSnapshot, isScreenFocused, visible]);

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
    // Пульс бейджа крутится только когда экран виден И приложение на переднем
    // плане: freezeOnBlur:false держит ушедшие экраны живыми — без гарда луп грел
    // бы телефон в фоне.
    if (unreadCount <= 0 || !isScreenFocused) {
      badgePulse.setValue(1);
      return;
    }

    let loop: Animated.CompositeAnimation | null = null;
    const start = () => {
      if (loop) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(badgePulse, { toValue: 1.08, duration: 650, useNativeDriver: true }),
          Animated.timing(badgePulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        ]),
      );
      loop.start();
    };
    const stop = () => {
      loop?.stop();
      loop = null;
      badgePulse.setValue(1);
    };

    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      loop?.stop();
      loop = null;
    };
  }, [badgePulse, unreadCount, isScreenFocused]);

  // Новое сообщение прилетело: конверт «влетает» в иконку + звук — РОВНО ОДИН раз на
  // сообщение. Срабатывает для ID, которых ещё нет в сохранённом наборе animatedIds.
  // На самом первом наборе (свежая установка / уже существующие сообщения) — молча
  // помечаем их «показанными», без анимации, чтобы не было залпа при первом входе.
  // Прочитано/непрочитано роли не играет — привязка только к факту «было ли письмо».
  const didBaselineRef = useRef(false);
  useEffect(() => {
    if (!animatedIdsReady) return;
    const animated = animatedIdsRef.current;
    if (!animated) return; // набор ещё не загружен из AsyncStorage

    const knownIds = messages.map((m) => m.id).filter(Boolean);
    const freshIds = knownIds.filter((id) => !animated.has(id));
    if (freshIds.length === 0) return;

    const consume = () => {
      freshIds.forEach((id) => animated.add(id));
      void markMessageIdsAnimated(freshIds);
    };

    // Первый снапшот после загрузки — базовая линия: молча помечаем существующие
    // сообщения «показанными», без анимации (иначе залп при каждом первом входе).
    if (!didBaselineRef.current) {
      didBaselineRef.current = true;
      consume();
      return;
    }

    // Если инбокс открыт — пользователь и так видит письмо: помечаем без анимации.
    // Если экран не в фокусе — НЕ помечаем, чтобы прилёт показался один раз, когда
    // экран снова станет видимым.
    if (visible) { consume(); return; }
    if (!isScreenFocused) return;

    // Реально новое сообщение и экран виден → проигрываем прилёт ровно один раз.
    consume();
    playEnvelopeFlight();
  }, [animatedIdsReady, messages, isScreenFocused, visible, playEnvelopeFlight]);

  useEffect(() => () => {
    if (flyTimer.current) clearTimeout(flyTimer.current);
    flightInProgressRef.current = false; // снять замок при размонтировании
  }, []);

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
    setSelectedId(null);
    setVisible(true);
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

  // Local UI overlay: hide the CTA immediately; persistence is handled in the background.
  const markReplyClaimedLocally = (messageId: string) => {
    setMessages((prev) => prev.map((m) => (
      m.id === messageId && m.reportReply ? { ...m, reportReply: { ...m.reportReply, claimed: true } } : m
    )));
  };

  const claimReportReward = (message: AppMessageWithState) => {
    const reward = message.reportReply;
    if (!reward || reward.shards <= 0 || reward.claimed) return;
    if (optimisticReportClaimIdsRef.current.has(message.id)) return;
    optimisticReportClaimIdsRef.current.add(message.id);
    hapticTap();
    markReplyClaimedLocally(message.id);
    void claimReportReplyShardsOptimistically(message.id, reward.shards);
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

  const chrome = isDark
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
      bg: '#F7F8FB',
      panel: '#FFFFFF',
      card: '#F1F4F8',
      border: 'rgba(32,37,46,0.12)',
      text: '#20252E',
      muted: '#657084',
      soft: '#8791A2',
      panelGradient: ['#FFFFFF', '#F4F6FA'] as const,
    };
  const vipSurveyAccent = '#64748B';
  const vipSurveyAccentText = '#FFFFFF';
  const vipSurveyTint = 'rgba(100,116,139,0.10)';
  const vipSurveyBorder = 'rgba(100,116,139,0.32)';
  // Цвет колокольчика — акцент активной темы (золото/коралл/синий и т.д.), как и
  // прежние раскрашенные иконки. fallback на vipSurveyAccent, если темы вдруг нет.
  const bellColor = theme?.accent ?? vipSurveyAccent;

  // Деликатный градиент-оттенок под цвет активной темы. Это НЕ заливка фона —
  // тонкий полупрозрачный слой акцента в верхнем углу панели поверх основного
  // фона. Низкая непрозрачность специально: фон остаётся фоном и не перетягивает
  // внимание с самих сообщений. Diagonal — от верхнего левого угла к прозрачному низу.
  const themeAccent = theme?.accent ?? vipSurveyAccent;
  const accentTintColors = [
    hexToRgba(themeAccent, isDark ? 0.16 : 0.12),
    hexToRgba(themeAccent, isDark ? 0.05 : 0.04),
    'rgba(0,0,0,0)',
  ] as const;

  const renderList = () => (
    <>
      <View style={styles.modalHeader}>
        <View>
          <Text style={[styles.modalTitle, { color: chrome.text, fontSize: Math.max(20, f.h2) }]}>{copy.title}</Text>
          <Text style={[styles.modalSub, { color: chrome.muted }]}>
            {unreadCount > 0 ? copy.newCount(unreadCount) : copy.allRead}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={copy.close}
          activeOpacity={0.75}
          onPress={closeInbox}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
            const messageRead = !message.unread;
            const text = pickAppMessageText(message, lang);
            const preview = message.kind === 'vip_survey'
              ? copy.vipSurveyHint
              : message.poll
              ? pickAppMessagePollQuestion(message.poll, lang)
              : buildAppMessagePreview(text.body, 160);
            const rowBackgroundColor = messageRead
              ? isDark
                ? 'rgba(148,163,184,0.14)'
                : '#E5E7EB'
              : chrome.card;
            const rowBorderColor = messageRead
              ? 'rgba(100,116,139,0.20)'
              : chrome.border;
            const rowTitleColor = messageRead ? chrome.muted : chrome.text;
            const rowMutedColor = messageRead ? chrome.soft : chrome.muted;
            return (
              <TouchableOpacity
                key={message.id}
                activeOpacity={0.82}
                onPress={() => selectMessage(message)}
                testID={message.kind === 'vip_survey' ? 'vip-survey-inbox-row' : undefined}
                style={[styles.messageRow, messageRead && styles.messageRowRead, { backgroundColor: rowBackgroundColor, borderColor: rowBorderColor }]}
              >
                {message.unread ? <View pointerEvents="none" style={styles.unreadDot} /> : null}
                <View style={styles.messageRowTop}>
                  <View style={styles.messageTitleWrap}>
                    <Text style={[styles.messageTitle, messageRead && styles.messageTitleRead, { color: rowTitleColor }]} numberOfLines={messageRead ? 1 : 2}>
                      {text.title}
                    </Text>
                  </View>
                </View>
                <View style={styles.messageMetaRow}>
                  {message.kind === 'vip_survey' ? (
                    <View style={[styles.vipSurveyBadge, { backgroundColor: vipSurveyTint, borderColor: vipSurveyBorder }]}>
                      <Ionicons name="sparkles-outline" size={11} color={vipSurveyAccent} />
                      <Text style={[styles.vipSurveyBadgeText, { color: vipSurveyAccent }]}>{copy.vipSurvey}</Text>
                    </View>
                  ) : message.kind === 'report_reply' ? (
                    <>
                      <View style={[styles.pollBadge, { borderColor: chrome.border }]}>
                        <Ionicons name="chatbox-ellipses-outline" size={11} color={chrome.soft} />
                        <Text style={[styles.pollBadgeText, { color: chrome.soft }]}>{copy.reportReply}</Text>
                      </View>
                      {(message.reportReply?.shards ?? 0) > 0 && !message.reportReply?.claimed ? (
                        <View style={[styles.pollBadge, { borderColor: 'rgba(99,217,143,0.5)', backgroundColor: 'rgba(99,217,143,0.10)' }]}>
                          <Ionicons name="diamond-outline" size={11} color={monoIcon(themeMode, '#63D98F')} />
                          <Text style={[styles.pollBadgeText, { color: '#63D98F' }]}>+{message.reportReply?.shards}</Text>
                        </View>
                      ) : null}
                    </>
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
                      style={[styles.messageRowCta, { backgroundColor: vipSurveyAccent }]}
                    >
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
      <View style={[styles.pollCard, { backgroundColor: chrome.card, borderColor: chrome.border }]}>
        <View style={styles.pollHeader}>
          <View style={[styles.pollHeaderIcon, { backgroundColor: isDark ? '#263447' : '#E7EEF8' }]}>
            <Ionicons name="stats-chart" size={15} color={monoIcon(themeMode, isDark ? '#93C5FD' : '#2563EB')} />
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
            const accent = selectedOption ? '#63D98F' : chrome.soft;
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
                    color={accent}
                  />
                  <Text style={[styles.pollOptionText, { color: optionColor }]} numberOfLines={3}>
                    {pickAppMessagePollOptionText(option, lang)}
                  </Text>
                  {showResults ? (
                    <Text style={[styles.pollOptionMeta, { color: accent }]}>
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

  // Карточка награды в ответе на репорт: кнопка «Забрать осколки» → CF claimReportReward.
  // Никаких модалок при начислении — вся выдача живёт здесь, в уведомлении.
  const renderReportReplyClaim = (message: AppMessageWithState) => {
    if (message.kind !== 'report_reply') return null;
    const reward = message.reportReply;
    if (!reward || reward.shards <= 0) return null;
    return (
      <View style={[styles.vipSurveyCard, { backgroundColor: isDark ? '#182131' : '#F8FAFC', borderColor: 'rgba(99,217,143,0.30)' }]}>
        <View style={styles.vipSurveyCardTop}>
          <View style={[styles.vipSurveyIcon, { backgroundColor: 'rgba(99,217,143,0.14)' }]}>
            <Ionicons name={reward.claimed ? 'checkmark-circle' : 'diamond'} size={18} color={monoIcon(themeMode, '#63D98F')} />
          </View>
          <View style={styles.vipSurveyTextWrap}>
            <Text style={[styles.vipSurveyTitle, { color: chrome.text }]}>
              {reward.claimed ? copy.claimed : `+${reward.shards}`}
            </Text>
          </View>
        </View>
        {!reward.claimed ? (
          <TouchableOpacity
            testID="report-reply-claim-cta"
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel={copy.claimShards(reward.shards)}
            onPress={() => { void claimReportReward(message); }}
            style={[styles.vipSurveyButton, { backgroundColor: '#2E9E63' }]}
          >
            <Ionicons name="diamond-outline" size={17} color="#FFFFFF" />
            <Text style={[styles.vipSurveyButtonText, { color: '#FFFFFF' }]}>{copy.claimShards(reward.shards)}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderVipSurveyCta = (message: AppMessageWithState) => {
    if (message.kind !== 'vip_survey') return null;
    return (
      <View style={[styles.vipSurveyCard, { backgroundColor: isDark ? '#182131' : '#F8FAFC', borderColor: 'rgba(100,116,139,0.26)' }]}>
        <View style={styles.vipSurveyCardTop}>
          <View style={[styles.vipSurveyIcon, { backgroundColor: vipSurveyTint }]}>
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
          style={[styles.vipSurveyButton, { backgroundColor: vipSurveyAccent }]}
        >
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
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.roundIcon, { backgroundColor: chrome.card, borderColor: chrome.border }]}
          >
            <Ionicons name="chevron-back" size={22} color={chrome.text} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
          <Text style={[styles.detailDate, { color: chrome.soft }]}>{formatMessageDate(selected.createdAtMs)}</Text>
          <Text style={[styles.detailTitle, { color: chrome.text }]}>{text.title}</Text>
          <Text style={[styles.detailBody, { color: chrome.muted }]}>{text.body}</Text>
          {renderVipSurveyCta(selected)}
          {renderReportReplyClaim(selected)}
          {renderPoll(selected)}

          {selected.kind === 'vip_survey' ? null : <View style={styles.reactions}>
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
              <Ionicons name={selected.reaction === 'like' ? 'thumbs-up' : 'thumbs-up-outline'} size={18} color={selected.reaction === 'like' ? monoIcon(themeMode, '#63D98F') : chrome.muted} />
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
              <Ionicons name={selected.reaction === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'} size={18} color={selected.reaction === 'dislike' ? monoIcon(themeMode, '#F87171') : chrome.muted} />
              <Text style={[styles.reactionText, { color: selected.reaction === 'dislike' ? '#F87171' : chrome.muted }]}>{copy.dislike}</Text>
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
        ref={buttonRef}
        onLayout={measureIcon}
        testID="home-app-messages-button"
        activeOpacity={0.78}
        accessibilityRole="button"
        accessibilityLabel={copy.title}
        onPress={openInbox}
        style={styles.headerButton}
      >
        <Animated.View style={{ transform: [{ scale: iconReceiveScale }] }}>
          <View style={[styles.headerIcon, styles.headerIconWrap]}>
            {/* Конверт: колокольчик теперь у центра событий (NotificationCenterButton). */}
            <Ionicons name="mail-outline" size={30} color={bellColor} />
          </View>
        </Animated.View>
        {unreadCount > 0 && (
          <Animated.View
            style={[styles.badge, { transform: [{ scale: badgePulse }] }]}
            accessibilityLabel={`${unreadCount > 99 ? '99+' : unreadCount} ${copy.unread}`}
          >
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
          </Animated.View>
        )}
      </TouchableOpacity>

      {flying ? (() => {
        const screen = Dimensions.get('window');
        const target = iconCenterRef.current ?? { x: screen.width - 44, y: 70 };
        // Старт: центр экрана, верхняя треть — «письмо появляется» и летит в иконку.
        const startX = screen.width / 2;
        const startY = screen.height * 0.34;
        const ENV_W = 132;
        const ENV_H = 92;
        // translate: из стартовой точки (центр конверта) в центр иконки.
        const translateX = flyAnim.interpolate({ inputRange: [0, 1], outputRange: [startX - ENV_W / 2, target.x - ENV_W / 2] });
        const translateY = flyAnim.interpolate({ inputRange: [0, 1], outputRange: [startY - ENV_H / 2, target.y - ENV_H / 2] });
        // Уменьшается и «втягивается» в иконку.
        const scale = flyAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.42, 0.08] });
        // Искажение: лёгкий наклон + скос, усиливающийся к концу полёта.
        const rotate = flyAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '-8deg', '14deg'] });
        const skewX = flyAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: ['0deg', '6deg', '-18deg'] });
        const scaleY = flyAnim.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 0.86, 0.5] });
        // Появляется быстро, гаснет на самом финише (внутри иконки).
        const opacity = flyAnim.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 1, 1, 0] });
        return (
          <Modal transparent visible animationType="none" pointerEvents="none" onRequestClose={() => {}}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <Animated.View
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: ENV_W,
                  height: ENV_H,
                  opacity,
                  transform: [
                    { translateX },
                    { translateY },
                    { scale },
                    { scaleY },
                    { rotate },
                    { skewX },
                  ],
                }}
              >
                <View style={styles.envelope}>
                  <View style={styles.envelopeFlap} />
                  <View style={styles.envelopeShine} />
                </View>
              </Animated.View>
            </View>
          </Modal>
        );
      })() : null}

      <MotionModal visible={visible} onRequestClose={closeInbox} testID="app-messages-motion-modal">
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeInbox} />
        </View>
        <View pointerEvents="box-none" style={styles.modalWrap}>
          <View style={styles.panelAnim}>
            <LinearGradient
              colors={chrome.panelGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.panel, { borderColor: chrome.border }]}
            >
              {/* Деликатный оттенок темы поверх фона панели. Абсолютный слой под
                  содержимым, не перехватывает нажатия. Гаснет к низу — фон спокойный. */}
              <LinearGradient
                pointerEvents="none"
                colors={accentTintColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {selected ? renderDetail() : renderList()}
            </LinearGradient>
          </View>
        </View>
      </MotionModal>
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
    width: 48,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    width: 44,
    height: 38,
  },
  headerIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Летящий конверт (оверлей). Рисуем кодом — независимо от темы, без ассета.
  envelope: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2C36B',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  // Треугольный «клапан» конверта — два больших борта сходятся в центре сверху.
  envelopeFlap: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    height: 0,
    borderLeftWidth: 68,
    borderRightWidth: 68,
    borderTopWidth: 50,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#F4D785',
  },
  envelopeShine: {
    position: 'absolute',
    top: 6,
    left: 8,
    width: 26,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.55)',
    transform: [{ rotate: '-18deg' }],
  },
  badge: {
    position: 'absolute',
    top: 1,
    right: 1,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: HOME_NOTIFICATION_BADGE_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: '#FFF',
  },
  badgeText: {
    color: HOME_NOTIFICATION_BADGE_TEXT_COLOR,
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
    borderWidth: 0,
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
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    gap: 10,
    paddingBottom: 4,
  },
  messageRow: {
    position: 'relative',
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 13,
    overflow: 'visible',
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
  },
  unreadDot: {
    position: 'absolute',
    top: 19,
    left: -14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: HOME_NOTIFICATION_BADGE_COLOR,
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
    borderWidth: 0,
    backgroundColor: 'rgba(127,127,127,0.10)',
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
    borderWidth: 0,
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
    borderWidth: 0,
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
    borderWidth: 0,
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
