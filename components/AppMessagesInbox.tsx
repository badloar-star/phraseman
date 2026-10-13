import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import {
  Animated,
  AppState,
  Dimensions,
  Easing,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import KitTouchable from './KitTouchable';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMessageReceivedCue } from '../hooks/use-message-received-cue';
import { useIsFocused } from '@react-navigation/native';
import { useLang } from './LangContext';
import { usePremium } from './PremiumContext';
import { useTheme } from './ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import MotionModal from './MotionModal';
import { hapticTap } from '../hooks/use-haptics';
import { triLang, type Lang } from '../constants/i18n';
import { consumeVipCelebration } from '../app/vip_celebration_state';
import {
  type AppMessageWithState,
  type AppMessagesSnapshot,
  buildAppMessagePreview,
  dismissAppMessage,
  filterAppMessagesSnapshotForAudience,
  filterAppMessagesSnapshotForNotificationCenter,
  markAppMessageRead,
  pickAppMessagePollOptionText,
  pickAppMessagePollQuestion,
  pickAppMessageText,
  setAppMessageReaction,
  setAppMessagePollVote,
  readAnimatedMessageIds,
  markMessageIdsAnimated,
  readCachedAppMessagesSnapshot,
  refreshAppMessagesSnapshotOnce,
  restoreAppMessage,
} from '../app/app_messages';
import VipSurveyModal from './VipSurveyModal';
import VipCelebrationModal from './VipCelebrationModal';
import VipSurveyReviewPromptModal from './VipSurveyReviewPromptModal';
import { claimVipSurveyReviewPrompt } from '../app/vip_survey_review_prompt';
import { VIP_SURVEY_ID } from '../app/vip_survey_content';
import type { SubmitVipSurveyResponse } from '../app/vip_survey';
import { HOME_NOTIFICATION_BADGE_COLOR, HOME_NOTIFICATION_BADGE_TEXT_COLOR } from './homeNotificationBadge';
import { noAndroidOutline } from '../constants/androidGlow';
import { nestedBoxShadow, raisedBoxShadow } from './v2/ShadowSurface';
import { RowDivider } from './v2/RowDivider';
import { isDevInboxEmpty } from '../app/dev_robot_display';

const BLUR_RENDER_GRACE_MS = 450;
const EMBEDDED_MESSAGE_PAGE_SIZE = 20;
// The unified notification center refreshes at app entry only when its cache is stale.
const BADGE_FOREGROUND_REFRESH_MIN_INTERVAL_MS = 12 * 60 * 60_000;
// зачем (смета Ядра e72a5417b №2, координатор 13.10): открытая шторка читала сеть ВСЕГДА (minIntervalMs: 0) —
// до 240 чтений Firestore (3 запроса × 80) на каждое открытие колокольчика. Кэш показывается сразу, как и раньше;
// свежее чтение — если прошлое старше минуты.
const INBOX_OPEN_REFRESH_MIN_INTERVAL_MS = 60_000;

function inboxText(lang: Lang) {
  return {
    title: triLang(lang, { ru: 'Сообщения', uk: 'Повідомлення', en: 'Messages', es: 'Mensajes', 'pt-BR': 'Mensagens', vi: 'Tin nhắn', id: 'Pesan', tr: 'Mesajlar', pl: 'Wiadomości' }),
    emptyTitle: triLang(lang, { ru: 'Сообщений нет', uk: 'Повідомлень немає', en: 'No messages', es: 'No hay mensajes', 'pt-BR': 'Não há mensagens', vi: 'Chưa có tin nhắn', id: 'Belum ada pesan', tr: 'Mesaj yok', pl: 'Brak wiadomości' }),
    emptyBody: triLang(lang, { ru: 'Здесь появятся новости от команды.', uk: 'Тут зʼявлятимуться новини від команди.', en: 'Team updates will show up here.', es: 'Aqui veras las novedades del equipo.', 'pt-BR': 'Aqui você verá as novidades da equipe.', vi: 'Tin tức từ đội ngũ sẽ xuất hiện tại đây.', id: 'Kabar dari tim akan muncul di sini.', tr: 'Ekipten gelen haberler burada görünecek.', pl: 'Tutaj pojawią się nowości od zespołu.' }),
    close: triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' }),
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wróć' }),
    previousPage: triLang(lang, { ru: 'Предыдущая страница', uk: 'Попередня сторінка', en: 'Previous page', es: 'Página anterior', 'pt-BR': 'Página anterior', vi: 'Trang trước', id: 'Halaman sebelumnya', tr: 'Önceki sayfa', pl: 'Poprzednia strona' }),
    nextPage: triLang(lang, { ru: 'Следующая страница', uk: 'Наступна сторінка', en: 'Next page', es: 'Página siguiente', 'pt-BR': 'Próxima página', vi: 'Trang sau', id: 'Halaman berikutnya', tr: 'Sonraki sayfa', pl: 'Następna strona' }),
    unread: triLang(lang, { ru: 'Новое', uk: 'Нове', en: 'New', es: 'Nuevo', 'pt-BR': 'Novo', vi: 'Mới', id: 'Baru', tr: 'Yeni', pl: 'Nowe' }),
    allRead: triLang(lang, { ru: 'Все прочитаны', uk: 'Усі прочитані', en: 'All read', es: 'Todo leído', 'pt-BR': 'Tudo lido', vi: 'Đã đọc hết', id: 'Semua dibaca', tr: 'Hepsi okundu', pl: 'Wszystko przeczytane' }),
    newCount: (n: number) => triLang(lang, {
      ru: `${n} новых`,
      uk: `${n} нових`,
      en: `${n} new`,
      es: `${n} nuevos`,
      'pt-BR': `${n} novas`,
      vi: `${n} tin mới`,
      id: `${n} baru`,
      tr: `${n} yeni`,
      pl: `${n} nowych`,
    }),
    like: triLang(lang, { ru: 'Нравится', uk: 'Подобається', en: 'Like', es: 'Me gusta', 'pt-BR': 'Gostei', vi: 'Thích', id: 'Suka', tr: 'Beğen', pl: 'Lubię to' }),
    dislike: triLang(lang, { ru: 'Не нравится', uk: 'Не подобається', en: 'Dislike', es: 'No me gusta', 'pt-BR': 'Não gostei', vi: 'Không thích', id: 'Tidak suka', tr: 'Beğenme', pl: 'Nie lubię' }),
    poll: triLang(lang, { ru: 'Опрос', uk: 'Опитування', en: 'Survey', es: 'Encuesta', 'pt-BR': 'Enquete', vi: 'Khảo sát', id: 'Survei', tr: 'Anket', pl: 'Ankieta' }), // зачем (Сверка 13.10): «Jajak pendapat» в 2,3× длиннее ru в бейдже; «Survei» — как в остальных строках опроса
    vipSurvey: triLang(lang, { ru: 'Plus-опрос', uk: 'Plus-опитування', en: 'Plus survey', es: 'Encuesta Plus', 'pt-BR': 'Pesquisa Plus', vi: 'Khảo sát Plus', id: 'Survei Plus', tr: 'Plus anketi', pl: 'Ankieta Plus' }),
    vipSurveyCta: triLang(lang, { ru: 'Пройти опрос', uk: 'Пройти опитування', en: 'Take survey', es: 'Responder encuesta', 'pt-BR': 'Responder pesquisa', vi: 'Làm khảo sát', id: 'Ikuti survei', tr: 'Ankete katıl', pl: 'Wypełnij ankietę' }),
    vipSurveyHint: triLang(lang, {
      ru: 'Ответь на несколько вопросов и активируй месяц Plus.',
      uk: 'Дай відповідь на кілька запитань і активуй місяць Plus.',
      en: 'Answer a few questions and activate a month of Plus.',
      es: 'Responde algunas preguntas y activa un mes de Plus.',
      'pt-BR': 'Responda algumas perguntas e ative um mês de Plus.',
      vi: 'Trả lời một vài câu hỏi và kích hoạt một tháng Plus.',
      id: 'Jawab beberapa pertanyaan dan aktifkan satu bulan Plus.',
      tr: 'Birkaç soruyu yanıtla ve bir aylık Plus’ı etkinleştir.',
      pl: 'Odpowiedz na kilka pytań i aktywuj miesiąc Plus.',
    }),
    dismiss: triLang(lang, { ru: 'Убрать уведомление', uk: 'Прибрати сповіщення', en: 'Dismiss notification', es: 'Descartar notificación', 'pt-BR': 'Descartar notificação', vi: 'Bỏ qua thông báo', id: 'Abaikan notifikasi', tr: 'Bildirimi kapat', pl: 'Odrzuć powiadomienie' }),
    team: triLang(lang, { ru: 'От команды', uk: 'Від команди', en: 'From the team', es: 'Del equipo', 'pt-BR': 'Da equipe', vi: 'Từ đội ngũ', id: 'Dari tim', tr: 'Ekipten', pl: 'Od zespołu' }),
    pinned: triLang(lang, { ru: 'Закреплено', uk: 'Закріплено', en: 'Pinned', es: 'Fijado', 'pt-BR': 'Fixado', vi: 'Đã ghim', id: 'Disematkan', tr: 'Sabitlendi', pl: 'Przypięte' }),
    deleted: triLang(lang, { ru: 'Сообщение удалено', uk: 'Повідомлення видалено', en: 'Message deleted', es: 'Mensaje eliminado', 'pt-BR': 'Mensagem removida', vi: 'Đã xóa tin nhắn', id: 'Pesan dihapus', tr: 'Mesaj silindi', pl: 'Wiadomość usunięta' }),
    undo: triLang(lang, { ru: 'Отменить', uk: 'Скасувати', en: 'Undo', es: 'Deshacer', 'pt-BR': 'Desfazer', vi: 'Hoàn tác', id: 'Urungkan', tr: 'Geri al', pl: 'Cofnij' }),
    pollVotes: triLang(lang, { ru: 'голосов', uk: 'голосів', en: 'votes', es: 'votos', 'pt-BR': 'votos', vi: 'lượt bình chọn', id: 'suara', tr: 'oy', pl: 'głosów' }),
    pollSelected: triLang(lang, { ru: 'Твой выбор', uk: 'Твій вибір', en: 'Your choice', es: 'Tu elección', 'pt-BR': 'Sua escolha', vi: 'Lựa chọn của bạn', id: 'Pilihanmu', tr: 'Seçimin', pl: 'Twój wybór' }),
    pollResultsHint: triLang(lang, { ru: 'Результаты после выбора', uk: 'Результати після вибору', en: 'Results after voting', es: 'Resultados después de elegir', 'pt-BR': 'Resultados após escolher', vi: 'Kết quả sau khi chọn', id: 'Hasil setelah memilih', tr: 'Sonuçlar seçimden sonra', pl: 'Wyniki po wyborze' }),
    inbox: triLang(lang, { ru: 'Inbox', uk: 'Inbox', en: 'Inbox', es: 'Inbox', 'pt-BR': 'Inbox', vi: 'Inbox', id: 'Inbox', tr: 'Inbox', pl: 'Inbox' }),
    reportReply: triLang(lang, { ru: 'Ответ на репорт', uk: 'Відповідь на репорт', en: 'Report reply', es: 'Respuesta a tu reporte', 'pt-BR': 'Resposta ao seu reporte', vi: 'Phản hồi báo cáo', id: 'Balasan laporan', tr: 'Rapor yanıtı', pl: 'Odpowiedź na zgłoszenie' }),
    claim: triLang(lang, { ru: 'Получить', uk: 'Отримати', en: 'Claim', es: 'Recibir', 'pt-BR': 'Receber', vi: 'Nhận', id: 'Ambil', tr: 'Al', pl: 'Odbierz' }),
    claimed: triLang(lang, { ru: 'Награда получена', uk: 'Нагороду отримано', en: 'Reward received', es: 'Recompensa recibida', 'pt-BR': 'Recompensa recebida', vi: 'Đã nhận thưởng', id: 'Hadiah diterima', tr: 'Ödül alındı', pl: 'Nagroda odebrana' }),
  };
}

function formatMessageDate(createdAtMs: number): string {
  if (!createdAtMs) return '';
  const d = new Date(createdAtMs);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

type AppMessagesInboxProps = {
  mode?: 'standalone' | 'notification-center';
  centerVisible?: boolean;
  onUnreadCountChange?: (count: number) => void;
  onMessageCountChange?: (count: number) => void;
  onDetailOpenChange?: (open: boolean) => void;
  notificationTargetRef?: React.RefObject<View | null>;
  ownerActive?: boolean;
};

function AppMessagesInbox({
  mode = 'standalone',
  centerVisible = false,
  onUnreadCountChange,
  onMessageCountChange,
  onDetailOpenChange,
  notificationTargetRef,
  ownerActive,
}: AppMessagesInboxProps) {
  const isScreenFocused = useIsFocused();
  const runtimeActive = ownerActive ?? isScreenFocused;
  const { lang } = useLang();
  const { hasPremiumAccess } = usePremium();
  // зачем: шторка сообщений (макет system.html SYS-10) — Liquid Glass 13 тем; все поверхности
  // из токенов активной темы, зелёный бренд и цветные рамки убраны.
  const { theme, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const copy = inboxText(lang);
  const [messages, setMessages] = useState<AppMessageWithState[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [surveyTarget, setSurveyTarget] = useState<AppMessageWithState | null>(null);
  const [vipCelebrationVisible, setVipCelebrationVisible] = useState(false);
  const [vipSurveyReviewPromptVisible, setVipSurveyReviewPromptVisible] = useState(false);
  const [undoMessage, setUndoMessage] = useState<AppMessageWithState | null>(null);
  const [embeddedPage, setEmbeddedPage] = useState(0);
  const [renderButton, setRenderButton] = useState(runtimeActive);
  const [animatedIdsReady, setAnimatedIdsReady] = useState(false);
  const badgePulse = useRef(new Animated.Value(1)).current;
  const surveyOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurRenderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const badgeRefreshInFlightRef = useRef(false);

  // ── «Письмо прилетает в иконку» — анимация + звук при новом сообщении ────────
  const { playMessageReceived, stopMessageReceived } = useMessageReceivedCue();
  const ownerActiveRef = useRef(runtimeActive);
  ownerActiveRef.current = runtimeActive;
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
  // Страховка от «вечного оверлея»: см. playEnvelopeFlight.
  const flyFailsafeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [onUnreadCountChange, unreadCount]);

  useEffect(() => {
    onMessageCountChange?.(messages.length);
  }, [messages.length, onMessageCountChange]);

  useEffect(() => {
    if (mode === 'notification-center') onDetailOpenChange?.(!!selectedId);
  }, [mode, onDetailOpenChange, selectedId]);

  useEffect(() => {
    if (mode === 'notification-center' && !centerVisible) setSelectedId(null);
  }, [centerVisible, mode]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(messages.length / EMBEDDED_MESSAGE_PAGE_SIZE) - 1);
    setEmbeddedPage((page) => centerVisible ? Math.min(page, maxPage) : 0);
  }, [centerVisible, messages.length]);

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
    const node = notificationTargetRef?.current ?? buttonRef.current;
    if (!node || typeof node.measureInWindow !== 'function') return;
    node.measureInWindow((x, y, w, h) => {
      if (Number.isFinite(x) && Number.isFinite(y)) {
        iconCenterRef.current = { x: x + (w || 0) / 2, y: y + (h || 0) / 2 };
      }
    });
  }, [notificationTargetRef]);

  // Защита от наложения: пока конверт ЛЕТИТ, повторный вызов игнорируется —
  // иначе несколько новых сообщений подряд запускали анимацию+звук несколько раз.
  // ref (а не state `flying`), чтобы проверка была синхронной в момент вызова.
  const flightInProgressRef = useRef(false);

  const playEnvelopeFlight = useCallback(() => {
    if (!ownerActiveRef.current) return;
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
      // зачем (владелец 2026-09-17: «экран тупо завис, анимации работают»):
      // раньше оверлёт снимался ТОЛЬКО при finished. Прерванная анимация
      // (stopAnimation при потере фокуса, смена AppState) оставляла flying=true
      // навсегда, а нативная модалка конверта на iOS съедает все тапы — экран
      // выглядел живым, но не реагировал. Снимаем ВСЕГДА, чем бы ни кончилось.
      if (__DEV__) console.log('[INBOX-FLY] flight ended', { finished });
      setFlying(false);
      flightInProgressRef.current = false;
    });
    // зачем: последний рубеж. Даже если колбэк анимации не придёт вообще
    // (компонент пересобрали по key, RN проглотил завершение) — оверлей обязан
    // исчезнуть сам. Экран не имеет права остаться неотзывчивым.
    if (flyFailsafeTimer.current) clearTimeout(flyFailsafeTimer.current);
    flyFailsafeTimer.current = setTimeout(() => {
      flyFailsafeTimer.current = null;
      if (__DEV__) console.log('[INBOX-FLY] failsafe released overlay');
      setFlying(false);
      flightInProgressRef.current = false;
    }, 1600);
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

    if (runtimeActive) {
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
  }, [runtimeActive]);

  useEffect(() => {
    if (runtimeActive) return;
    if (flyTimer.current) clearTimeout(flyTimer.current);
    flyTimer.current = null;
    if (flyFailsafeTimer.current) clearTimeout(flyFailsafeTimer.current);
    flyFailsafeTimer.current = null;
    flightInProgressRef.current = false;
    flyAnim.stopAnimation();
    iconReceiveScale.stopAnimation();
    setFlying(false);
    stopMessageReceived();
  }, [flyAnim, iconReceiveScale, runtimeActive, stopMessageReceived]);

  const selected = useMemo(
    () => messages.find((message) => message.id === selectedId) ?? null,
    [messages, selectedId],
  );
  const effectiveVisible = mode === 'notification-center' ? centerVisible : visible;

  const applyAppMessagesSnapshot = useCallback((snapshot: AppMessagesSnapshot) => {
    // зачем (координатор 13.10, system-015): dev_state?inbox=empty — образец «Сообщений нет»; закреплённое серверное сообщение
    // не показываем (закрыть его крестиком нельзя — dismiss пишет в облако). Только dev-сборка, только показ.
    if (isDevInboxEmpty()) {
      console.log(`[DEV-STATE] inbox: пусто по подмене (с сервера пришло ${snapshot.messages.length})`); // guard-ok: dev-ветка
      setMessages([]);
      setUnreadCount(0);
      return;
    }
    // зачем (settings-gap-002): сообщения без текста на языке интерфейса не показываем и не считаем в непрочитанных.
    const filtered = filterAppMessagesSnapshotForAudience(snapshot, hasPremiumAccess, undefined, lang);
    // Modern report replies are mirrored atomically into users/{uid}/notifications
    // and rendered by NotificationCenterButton with the complete three-currency
    // claim flow. Hiding only those mirrors prevents duplicate rows/badge counts;
    // legacy one-pearl messages remain as a backwards-compatible fallback.
    const visible = mode === 'notification-center'
      ? filterAppMessagesSnapshotForNotificationCenter(filtered)
      : filtered;
    setMessages(visible.messages);
    setUnreadCount(visible.unreadCount);
  }, [hasPremiumAccess, lang, mode]);

  useEffect(() => {
    if (!runtimeActive) return;
    let cancelled = false;

    const refreshBadge = async () => {
      if (badgeRefreshInFlightRef.current) return;
      badgeRefreshInFlightRef.current = true;
      try {
        const cached = await readCachedAppMessagesSnapshot();
        if (!cancelled) applyAppMessagesSnapshot(cached);
        const minIntervalMs = effectiveVisible ? INBOX_OPEN_REFRESH_MIN_INTERVAL_MS : BADGE_FOREGROUND_REFRESH_MIN_INTERVAL_MS;
        const refreshed = await refreshAppMessagesSnapshotOnce({
          minIntervalMs,
          onOutcome: (outcome) => {
            console.log(`[INBOX-REFRESH] open=${effectiveVisible ? 'yes' : 'no'} minIntervalMs=${minIntervalMs} outcome=${JSON.stringify(outcome)}`);
          },
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
  }, [applyAppMessagesSnapshot, effectiveVisible, runtimeActive]);

  useEffect(() => {
    if (!hasPremiumAccess || !surveyTarget) return;
    const messageId = surveyTarget.id;
    setSurveyTarget(null);
    setVisible(false);
    setSelectedId(null);
    void dismissAppMessage(messageId);
  }, [hasPremiumAccess, surveyTarget]);

  useEffect(() => {
    // зачем: если выбранное сообщение исчезло (удалили, отфильтровали по аудитории,
    // сменилась личность) — деталь обязана закрыться, иначе владелец центра
    // держит teamDetailOpen=true и рисует пустой список без строк и без пустого
    // состояния: экран выглядит зависшим.
    if (selectedId && !messages.some((message) => message.id === selectedId)) {
      if (__DEV__) console.log('[INBOX-DETAIL] selected message vanished, closing detail', { selectedId });
      setSelectedId(null);
    }
  }, [messages, selectedId]);

  // зачем (PM-033-A1): «Уменьшить движение» — бесконечная анимация не запускается.
  const reducedMotionLoop = useReducedMotion();
  useEffect(() => {
    // Пульс бейджа крутится только когда экран виден И приложение на переднем
    // плане: freezeOnBlur:false держит ушедшие экраны живыми — без гарда луп грел
    // бы телефон в фоне.
    if (unreadCount <= 0 || !runtimeActive || reducedMotionLoop) {
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
        { iterations: 3 }, /* зачем (владелец 01.10): анимации на Главной короткие — 3 раза и покой */
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
  }, [badgePulse, unreadCount, runtimeActive, reducedMotionLoop]);

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
    if (effectiveVisible) { consume(); return; }
    if (!isScreenFocused) return;

    // Реально новое сообщение и экран виден → проигрываем прилёт ровно один раз.
    consume();
    playEnvelopeFlight();
  }, [animatedIdsReady, effectiveVisible, messages, isScreenFocused, playEnvelopeFlight]);

  useEffect(() => () => {
    if (flyTimer.current) clearTimeout(flyTimer.current);
    if (flyFailsafeTimer.current) clearTimeout(flyFailsafeTimer.current);
    if (undoTimer.current) clearTimeout(undoTimer.current);
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

  const dismissMessage = (message: AppMessageWithState, event?: { stopPropagation?: () => void }) => {
    event?.stopPropagation?.();
    hapticTap();
    setMessages((prev) => prev.filter((row) => row.id !== message.id));
    if (message.unread) setUnreadCount((prev) => Math.max(0, prev - 1));
    if (selectedId === message.id) setSelectedId(null);
    if (surveyTarget?.id === message.id) setSurveyTarget(null);
    setUndoMessage(message);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => {
      undoTimer.current = null;
      setUndoMessage((current) => (current?.id === message.id ? null : current));
    }, 5_000);
    void dismissAppMessage(message.id);
  };

  const undoDismissMessage = () => {
    const message = undoMessage;
    if (!message) return;
    hapticTap();
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    setUndoMessage(null);
    setMessages((prev) => (
      prev.some((row) => row.id === message.id)
        ? prev
        : [...prev, message].sort((a, b) => (b.priority - a.priority) || (b.createdAtMs - a.createdAtMs))
    ));
    if (message.unread) setUnreadCount((prev) => prev + 1);
    void restoreAppMessage(message.id);
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
    const target = messages.find((message) => message.id === messageId);
    if (target) dismissMessage(target);
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

  // зачем (решение владельца 04.10): вернуть просьбу об отзыве после опроса Plus, снятую снимком 95eec1717.
  // Показывать ли — решает claimVipSurveyReviewPrompt (уже оценил / уже показано), каждое решение в [VIP-REVIEW-PROMPT].
  const requestVipSurveyReviewPrompt = (trigger: 'after_celebration' | 'already_granted') => {
    void claimVipSurveyReviewPrompt(VIP_SURVEY_ID, trigger).then((decision) => {
      if (decision.show) setVipSurveyReviewPromptVisible(true);
    });
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
    if (!result.alreadyGranted) {
      void consumeVipCelebration(result.grantAt);
      setVipCelebrationVisible(true);
    } else {
      requestVipSurveyReviewPrompt('already_granted');
    }
  };

  // Нейтральная палитра окна: строки — тонкий тон поверх непрозрачной основы, без рамок.
  const chrome = {
    bg: glass.bg,
    panel: glass.opaqueSheet,
    card: glass.selected,
    cardStrong: glass.selected,
    readCard: 'transparent',
    text: glass.text,
    muted: glass.secondary,
    soft: glass.mutedText,
  };
  const vipSurveyAccent = glass.cta;
  const vipSurveyAccentText = glass.ctaInk;
  const vipSurveyTint = glass.selected;
  // Награда (монеты) и «получено» — цвета темы приложения, как и раньше «награда».
  // Ошибка/«не нравится» остаётся красной.
  const dangerColor = theme?.wrong ?? 'red';
  const bellColor = theme?.accentText ?? glass.accentText;

  const renderEmbeddedSection = () => {
    if (!centerVisible) return null;
    // зачем (владелец 2026-09-17: «уведомление есть, закрыл — а модала нет, экран
    // завис»): деталь сообщения рендерится ЗДЕСЬ же. Проверка пустого списка
    // стояла ВЫШЕ проверки selected, поэтому закрытие последнего сообщения
    // убивало и открытую деталь — а владелец центра держал teamDetailOpen=true
    // и показывал пустой список без единой строки. Сначала деталь, потом пустота.
    if (selected) return renderUnifiedDetail();
    if (messages.length === 0 && !undoMessage) return null;
    const maxEmbeddedPage = Math.max(0, Math.ceil(messages.length / EMBEDDED_MESSAGE_PAGE_SIZE) - 1);
    const safeEmbeddedPage = Math.min(embeddedPage, maxEmbeddedPage);
    const pageStart = safeEmbeddedPage * EMBEDDED_MESSAGE_PAGE_SIZE;
    const embeddedMessages = messages.slice(pageStart, pageStart + EMBEDDED_MESSAGE_PAGE_SIZE);
    return (
      <View testID="notification-center-team-section" style={styles.embeddedSection}>
        <View style={styles.embeddedSectionHeader}>
          <Text style={[styles.embeddedSectionTitle, { color: chrome.text }]}>{copy.team}</Text>
          <Text style={[styles.embeddedSectionMeta, { color: chrome.soft }]}>{copy.pinned}</Text>
        </View>
        <View style={styles.embeddedRows}>
          {embeddedMessages.map((message) => {
            const text = pickAppMessageText(message, lang);
            const preview = message.kind === 'vip_survey'
              ? copy.vipSurveyHint
              : message.poll
              ? pickAppMessagePollQuestion(message.poll, lang)
              : buildAppMessagePreview(text.body, 120);
            return (
              <KitTouchable
                key={message.id}
                activeOpacity={0.82}
                onPress={() => selectMessage(message)}
                style={[styles.embeddedRow, { backgroundColor: message.unread ? chrome.cardStrong : chrome.readCard }]}
              >
                {message.unread ? <View pointerEvents="none" style={styles.embeddedUnreadDot} /> : null}
                <View style={styles.embeddedCopy}>
                  <Text numberOfLines={2} style={[styles.embeddedTitle, { color: message.unread ? chrome.text : chrome.muted }]}>
                    {text.title}
                  </Text>
                  {preview ? (
                    <Text numberOfLines={2} style={[styles.embeddedPreview, { color: chrome.muted }]}>{preview}</Text>
                  ) : null}
                  <Text style={[styles.embeddedDate, { color: chrome.soft }]}>{formatMessageDate(message.createdAtMs)}</Text>
                </View>
                <KitTouchable
                  testID={`team-message-dismiss-${message.id}`}
                  activeOpacity={0.72}
                  accessibilityRole="button"
                  accessibilityLabel={copy.dismiss}
                  onPress={(event) => {
                    event.stopPropagation?.();
                    dismissMessage(message);
                  }}
                  style={styles.embeddedDismiss}
                >
                  <Ionicons name="close" size={19} color={chrome.soft} />
                </KitTouchable>
              </KitTouchable>
            );
          })}
        </View>
        {maxEmbeddedPage > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10 }}>
            <KitTouchable
              accessibilityRole="button"
              accessibilityLabel={copy.previousPage}
              disabled={safeEmbeddedPage === 0}
              activeOpacity={0.75}
              onPress={() => setEmbeddedPage((page) => Math.max(0, page - 1))}
              style={[styles.roundIcon, { opacity: safeEmbeddedPage === 0 ? 0.35 : 1, backgroundColor: chrome.card }]}
            >
              <Ionicons name="chevron-back" size={20} color={chrome.text} />
            </KitTouchable>
            <Text style={[styles.embeddedSectionMeta, { color: chrome.soft }]}>
              {safeEmbeddedPage + 1}/{maxEmbeddedPage + 1}
            </Text>
            <KitTouchable
              accessibilityRole="button"
              accessibilityLabel={copy.nextPage}
              disabled={safeEmbeddedPage === maxEmbeddedPage}
              activeOpacity={0.75}
              onPress={() => setEmbeddedPage((page) => Math.min(maxEmbeddedPage, page + 1))}
              style={[styles.roundIcon, { opacity: safeEmbeddedPage === maxEmbeddedPage ? 0.35 : 1, backgroundColor: chrome.card }]}
            >
              <Ionicons name="chevron-forward" size={20} color={chrome.text} />
            </KitTouchable>
          </View>
        ) : null}
        {undoMessage ? (
          <View style={[styles.undoBar, { backgroundColor: chrome.cardStrong }]}>
            <Text style={[styles.undoText, { color: chrome.muted }]}>{copy.deleted}</Text>
            <KitTouchable
              testID="team-message-undo"
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={copy.undo}
              onPress={undoDismissMessage}
              style={styles.undoButton}
            >
              <Text style={[styles.undoButtonText, { color: glass.text }]}>{copy.undo}</Text>
            </KitTouchable>
          </View>
        ) : null}
      </View>
    );
  };

  const renderList = () => (
    <>
      <View style={styles.modalHeader}>
        <View>
          <Text style={[styles.modalTitle, { color: chrome.text, fontSize: 22, lineHeight: 28 }]}>{copy.title}</Text>
          <Text style={[styles.modalSub, { color: chrome.muted }]}>
            {unreadCount > 0 ? copy.newCount(unreadCount) : copy.allRead}
          </Text>
        </View>
        <KitTouchable
          accessibilityRole="button"
          accessibilityLabel={copy.close}
          activeOpacity={0.75}
          onPress={closeInbox}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.roundIcon, { backgroundColor: chrome.card }]}
        >
          <Ionicons name="close" size={21} color={chrome.text} />
        </KitTouchable>
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <View accessible={false} style={[styles.emptyTile, { backgroundColor: glass.opaqueControl }]}>
            <Ionicons name="chatbubble-outline" size={24} color={glass.lightTint} />
          </View>
          <Text style={[styles.emptyTitle, { color: chrome.text }]}>{copy.emptyTitle}</Text>
          <Text style={[styles.emptyBody, { color: chrome.muted }]}>{copy.emptyBody}</Text>
        </View>
      ) : (
        <FlatList removeClippedSubviews={false}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          data={messages}
          keyExtractor={(message) => message.id}
          renderItem={({ item: message }) => {
            const messageRead = !message.unread;
            const text = pickAppMessageText(message, lang);
            const preview = message.kind === 'vip_survey'
              ? copy.vipSurveyHint
              : message.poll
              ? pickAppMessagePollQuestion(message.poll, lang)
              : buildAppMessagePreview(text.body, 160);
            const rowBackgroundColor = 'transparent';
            const rowTitleColor = chrome.text;
            const rowMutedColor = messageRead ? chrome.soft : chrome.muted;
            return (
              <KitTouchable
                activeOpacity={0.82}
                onPress={() => selectMessage(message)}
                testID={message.kind === 'vip_survey' ? 'vip-survey-inbox-row' : undefined}
                style={[styles.messageRow, messageRead && styles.messageRowRead, { backgroundColor: rowBackgroundColor }]}
              >
                <RowDivider edge="bottom" color="rgba(255,255,255,0.09)" /> {/* theme-exempt: светлая линия 0.09 внутри тёмной плашки — постоянная */}
                {message.unread ? <View pointerEvents="none" style={styles.unreadDot} /> : null}
                {/* зачем: макет system.html system_17 — сверху строки «Новое»/дата, ниже заголовок и текст */}
                <View style={styles.messageMetaRow}>
                  {message.kind === 'vip_survey' ? (
                    <View style={[styles.vipSurveyBadge, { backgroundColor: vipSurveyTint }]}>
                      <Ionicons name="sparkles-outline" size={11} color={glass.accentText} />
                      <Text style={[styles.vipSurveyBadgeText, { color: glass.accentText }]}>{copy.vipSurvey}</Text>
                    </View>
                  ) : message.kind === 'report_reply' ? (
                    <>
                      <View style={[styles.pollBadge, { backgroundColor: chrome.card }]}>
                        <Ionicons name="chatbox-ellipses-outline" size={11} color={chrome.soft} />
                        <Text style={[styles.pollBadgeText, { color: chrome.soft }]}>{copy.reportReply}</Text>
                      </View>
                      {/* зачем (координатор 13.10, D70/D104): «+N» старой награды не показываем — она ничего не начисляет */}
                    </>
                  ) : message.poll ? (
                    <View style={[styles.pollBadge, { backgroundColor: chrome.card }]}>
                      <Ionicons name="stats-chart-outline" size={11} color={chrome.soft} />
                      <Text style={[styles.pollBadgeText, { color: chrome.soft }]}>{copy.poll}</Text>
                    </View>
                  ) : null}
                  <Text style={[styles.messageDate, { color: chrome.muted }]}>{message.unread ? copy.unread : formatMessageDate(message.createdAtMs)}</Text>
                </View>
                <View style={styles.messageRowTop}>
                  <View style={styles.messageTitleWrap}>
                    <Text style={[styles.messageTitle, messageRead && styles.messageTitleRead, { color: rowTitleColor }]}>
                      {text.title}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.messagePreview, messageRead && styles.messagePreviewRead, { color: rowMutedColor }]}>
                  {preview}
                </Text>
                {message.kind === 'vip_survey' ? (
                  <View style={styles.messageRowActions}>
                    <KitTouchable
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
                    </KitTouchable>
                  </View>
                ) : null}
              </KitTouchable>
            );
          }}
        />
      )}
    </>
  );

  const renderPoll = (message: AppMessageWithState) => {
    if (!message.poll) return null;
    const poll = message.poll;
    const showResults = Boolean(message.pollOptionId);
    const totalVotes = Math.max(0, poll.voteCount);
    return (
      <View style={[styles.pollCard, { backgroundColor: chrome.card }]}>
        <View style={styles.pollHeader}>
          <View style={[styles.pollHeaderIcon, { backgroundColor: glass.opaqueControl }]}>
            <Ionicons name="stats-chart" size={15} color={glass.lightTint} />
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
            const optionColor = chrome.text;
            const accent = selectedOption ? glass.text : chrome.soft;
            return (
              <KitTouchable
                key={option.id}
                activeOpacity={0.84}
                onPress={() => voteOnSelectedPoll(option.id)}
                style={[
                  styles.pollOption,
                  {
                    // зачем (стиль «Тень», владелец 12.10): кромка выбора снята — выбранный вариант тоном и тенью поглубже, плюс радио слева
                    backgroundColor: selectedOption ? glass.selected : glass.opaqueSheet,
                    boxShadow: selectedOption ? raisedBoxShadow(glass) : nestedBoxShadow(glass),
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
                  <View style={[styles.pollTrack, { backgroundColor: glass.line }]}>
                    <View style={[styles.pollFill, { width: `${pct}%`, backgroundColor: selectedOption ? glass.cta : glass.mutedText }]} />
                  </View>
                ) : null}
              </KitTouchable>
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
      <View style={[styles.vipSurveyCard, { backgroundColor: chrome.card }]}>
        <View style={styles.vipSurveyCardTop}>
          <View style={[styles.vipSurveyIcon, { backgroundColor: vipSurveyTint }]}>
            <Ionicons name="sparkles" size={18} color={glass.accentText} />
          </View>
          <View style={styles.vipSurveyTextWrap}>
            <Text style={[styles.vipSurveyTitle, { color: chrome.text }]}>{copy.vipSurvey}</Text>
            <Text style={[styles.vipSurveyBody, { color: chrome.muted }]}>{copy.vipSurveyHint}</Text>
          </View>
        </View>
        <KitTouchable
          testID="vip-survey-detail-cta"
          activeOpacity={0.86}
          accessibilityRole="button"
          accessibilityLabel={copy.vipSurveyCta}
          onPress={() => openSurvey(message)}
          style={[styles.vipSurveyButton, { backgroundColor: vipSurveyAccent }]}
        >
          <Ionicons name="chatbubbles-outline" size={17} color={vipSurveyAccentText} />
          <Text style={[styles.vipSurveyButtonText, { color: vipSurveyAccentText }]}>{copy.vipSurveyCta}</Text>
        </KitTouchable>
      </View>
    );
  };

  const renderDetail = () => {
    if (!selected) return null;
    const text = pickAppMessageText(selected, lang);
    return (
      <>
        <View style={styles.modalHeader}>
          <KitTouchable
            accessibilityRole="button"
            accessibilityLabel={copy.back}
            activeOpacity={0.75}
            onPress={() => {
              hapticTap();
              setSelectedId(null);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.roundIcon, { backgroundColor: chrome.card }]}
          >
            <Ionicons name="chevron-back" size={22} color={chrome.text} />
          </KitTouchable>
        </View>
        <ScrollView decelerationRate="fast" showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
          <Text style={[styles.detailDate, { color: chrome.soft }]}>{formatMessageDate(selected.createdAtMs)}</Text>
          <Text style={[styles.detailTitle, { color: chrome.text }]}>{text.title}</Text>
          <Text style={[styles.detailBody, { color: chrome.muted }]}>{text.body}</Text>
          {renderVipSurveyCta(selected)}
          {renderPoll(selected)}

          {selected.kind === 'vip_survey' ? null : <View style={styles.reactions}>
            <KitTouchable
              activeOpacity={0.82}
              onPress={() => reactToSelected('like')}
              style={[
                styles.reactionButton,
                {
                  backgroundColor: selected.reaction === 'like' ? glass.opaqueControl : chrome.card,
                  boxShadow: selected.reaction === 'like' ? raisedBoxShadow(glass) : nestedBoxShadow(glass), // зачем (стиль «Тень»): выбранная реакция — тень поглубже, цвет иконки и текста остаётся
                },
              ]}
            >
              <Ionicons name={selected.reaction === 'like' ? 'thumbs-up' : 'thumbs-up-outline'} size={18} color={selected.reaction === 'like' ? glass.text : chrome.muted} />
              <Text style={[styles.reactionText, { color: selected.reaction === 'like' ? glass.text : chrome.muted }]}>{copy.like}</Text>
            </KitTouchable>
            <KitTouchable
              activeOpacity={0.82}
              onPress={() => reactToSelected('dislike')}
              style={[
                styles.reactionButton,
                {
                  backgroundColor: selected.reaction === 'dislike' ? glass.opaqueControl : chrome.card,
                  boxShadow: selected.reaction === 'dislike' ? raisedBoxShadow(glass) : nestedBoxShadow(glass), // зачем (стиль «Тень»): выбранная реакция — тень поглубже, цвет иконки и текста остаётся
                },
              ]}
            >
              <Ionicons name={selected.reaction === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'} size={18} color={selected.reaction === 'dislike' ? dangerColor : chrome.muted} />
              <Text style={[styles.reactionText, { color: selected.reaction === 'dislike' ? dangerColor : chrome.muted }]}>{copy.dislike}</Text>
            </KitTouchable>
          </View>}
        </ScrollView>
      </>
    );
  };

  const renderUnifiedDetail = () => {
    if (!selected) return null;
    const text = pickAppMessageText(selected, lang);
    return (
      <View testID="notification-center-team-detail" style={styles.embeddedDetail}>
        <View style={styles.embeddedDetailHeader}>
          <KitTouchable
            testID="notification-center-team-detail-back"
            accessibilityRole="button"
            accessibilityLabel={copy.back}
            activeOpacity={0.75}
            onPress={() => {
              hapticTap();
              setSelectedId(null);
            }}
            style={[styles.roundIcon, { backgroundColor: chrome.card }]}
          >
            <Ionicons name="chevron-back" size={22} color={chrome.text} />
          </KitTouchable>
          <Text style={[styles.embeddedSectionTitle, { color: chrome.text }]}>{copy.team}</Text>
        </View>
        <View style={styles.detailContent}>
          <Text style={[styles.detailDate, { color: chrome.soft }]}>{formatMessageDate(selected.createdAtMs)}</Text>
          <Text style={[styles.detailTitle, { color: chrome.text }]}>{text.title}</Text>
          <Text style={[styles.detailBody, { color: chrome.muted }]}>{text.body}</Text>
          {renderVipSurveyCta(selected)}
          {renderPoll(selected)}
          {selected.kind === 'vip_survey' ? null : (
            <View style={styles.reactions}>
              <KitTouchable
                activeOpacity={0.82}
                onPress={() => reactToSelected('like')}
                style={[
                  styles.reactionButton,
                  {
                    backgroundColor: selected.reaction === 'like' ? glass.opaqueControl : chrome.card,
                    boxShadow: selected.reaction === 'like' ? raisedBoxShadow(glass) : nestedBoxShadow(glass), // зачем (стиль «Тень»): выбранная реакция — тень поглубже, цвет иконки и текста остаётся
                  },
                ]}
              >
                <Ionicons name={selected.reaction === 'like' ? 'thumbs-up' : 'thumbs-up-outline'} size={18} color={selected.reaction === 'like' ? glass.text : chrome.muted} />
                <Text style={[styles.reactionText, { color: selected.reaction === 'like' ? glass.text : chrome.muted }]}>{copy.like}</Text>
              </KitTouchable>
              <KitTouchable
                activeOpacity={0.82}
                onPress={() => reactToSelected('dislike')}
                style={[
                  styles.reactionButton,
                  {
                    backgroundColor: selected.reaction === 'dislike' ? glass.opaqueControl : chrome.card,
                    boxShadow: selected.reaction === 'dislike' ? raisedBoxShadow(glass) : nestedBoxShadow(glass), // зачем (стиль «Тень»): выбранная реакция — тень поглубже, цвет иконки и текста остаётся
                  },
                ]}
              >
                <Ionicons name={selected.reaction === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'} size={18} color={selected.reaction === 'dislike' ? dangerColor : chrome.muted} />
                <Text style={[styles.reactionText, { color: selected.reaction === 'dislike' ? dangerColor : chrome.muted }]}>{copy.dislike}</Text>
              </KitTouchable>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (!renderButton) return null;

  return (
    <>
      {mode === 'notification-center' ? renderEmbeddedSection() : (
      <KitTouchable
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
      </KitTouchable>
      )}

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
          // зачем (владелец 2026-09-17): конверт рисовался в отдельной нативной
          // Modal с pointerEvents="none" — но у Modal такого пропа НЕТ, RN его не
          // пробрасывает, и на iOS контейнер модалки перехватывал КАЖДЫЙ тап.
          // Экран жил (анимации шли), но не реагировал. Обычный absoluteFill-слой
          // с pointerEvents="none" честно пропускает нажатия насквозь.
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flightOverlay]}>
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
                <View style={[styles.envelope, { backgroundColor: glass.lightTint }]}>
                  <View style={[styles.envelopeFlap, { borderTopColor: glass.cta }]} />
                  <View style={styles.envelopeShine} />
                </View>
              </Animated.View>
          </View>
        );
      })() : null}

      <MotionModal visible={visible} onRequestClose={closeInbox} testID="app-messages-motion-modal">
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeInbox} />
        </View>
        <View pointerEvents="box-none" style={[styles.modalWrap, { paddingTop: insets.top + 12 }]}>
          <View accessibilityViewIsModal style={styles.panelAnim}>
            <View
              style={[
                styles.panel,
                {
                  backgroundColor: glass.opaqueSheet,
                  paddingBottom: Math.max(16, insets.bottom + 12),
                },
              ]}
            >
              <View accessible={false} style={[styles.grabber, { backgroundColor: glass.glassEdge }]} />
              {selected ? renderDetail() : renderList()}
            </View>
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
          requestVipSurveyReviewPrompt('after_celebration');
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
  embeddedDetail: {
    minHeight: 320,
  },
  embeddedDetailHeader: {
    minHeight: 48,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  embeddedSection: {
    gap: 8,
    marginBottom: 10,
  },
  embeddedSectionHeader: {
    minHeight: 28,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  embeddedSectionTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  embeddedSectionMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  embeddedRows: {
    gap: 8,
  },
  embeddedRow: {
    position: 'relative',
    minHeight: 72,
    borderRadius: 16,
    paddingLeft: 13,
    paddingVertical: 11,
    paddingRight: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  embeddedCopy: {
    flex: 1,
    minWidth: 0,
  },
  embeddedTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  embeddedPreview: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  embeddedDate: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  embeddedDismiss: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  embeddedUnreadDot: {
    position: 'absolute',
    top: 12,
    left: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: HOME_NOTIFICATION_BADGE_COLOR,
  },
  undoBar: {
    minHeight: 48,
    borderRadius: 14,
    paddingLeft: 13,
    paddingRight: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  undoText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  undoButton: {
    minWidth: 74,
    minHeight: 44,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoButtonText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
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
  // Слой полёта конверта: поверх содержимого, но полностью «прозрачный» для
  // нажатий (pointerEvents="none" на самом View, а не на Modal — см. коммент выше).
  flightOverlay: {
    zIndex: 60,
  },
  // Летящий конверт (оверлей). Рисуем кодом — независимо от темы, без ассета.
  envelope: {
    flex: 1,
    borderRadius: 12, // зачем (владелец 12.10, стиль «Тень»): без обводки — отделяют тон и тень (летящий конверт)
    overflow: 'hidden',
    shadowColor: 'black', // theme-exempt: тень, затемнение и светлая кромка внутри тёмной плашки — постоянные
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    ...noAndroidOutline, // зачем: без непрозрачного фона Android рисует квадрат вокруг скругления (сторож android_no_square_outline)
  },
  // Треугольный «клапан» конверта — два больших борта сходятся в центре сверху.
  envelopeFlap: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    height: 0,
    borderLeftWidth: 68, // shadow-ok: клапан конверта — треугольник из границ View, не обводка
    borderRightWidth: 68, // shadow-ok: клапан конверта — треугольник из границ View, не обводка
    borderTopWidth: 50, // shadow-ok: клапан конверта — треугольник из границ View, не обводка
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  envelopeShine: {
    position: 'absolute',
    top: 6,
    left: 8,
    width: 26,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.55)', // theme-exempt: тень, затемнение и светлая кромка внутри тёмной плашки — постоянные
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
  },
  badgeText: {
    color: HOME_NOTIFICATION_BADGE_TEXT_COLOR,
    fontSize: 13,
    fontWeight: '700',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.56)', // theme-exempt: тень, затемнение и светлая кромка внутри тёмной плашки — постоянные
  },
  // Нижняя шторка (макет SYS-10): прижата к низу, сверху отступ под safe area.
  modalWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  panelAnim: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '100%',
    alignSelf: 'center',
  },
  panel: {
    maxHeight: '100%',
    minHeight: 360,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    // зачем (стиль «Тень», владелец 12.10): шторку отделяет затемнение, кромки нет
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  modalTitle: {
    fontWeight: '700',
  },
  modalSub: {
    marginTop: 2,
    // зачем: макет 14, но шкала владельца D145 (01.10, новее макета) — подписи 13.
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  roundIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 4,
  },
  // зачем: макет system.html system_17 — плоские строки с точкой слева и тонкой линией снизу, без карточек.
  messageRow: {
    position: 'relative',
    // зачем (владелец 12.10, стиль «Тень»): линия под строкой — RowDivider (линия-View) с тем же светлым тоном 0.09, не borderBottom
    paddingVertical: 14,
    paddingLeft: 22,
    paddingRight: 4,
    overflow: 'visible',
  },
  messageRowRead: {},
  messageRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 3,
  },
  messageTitleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 21,
    left: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: HOME_NOTIFICATION_BADGE_COLOR,
  },
  messageTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  messageTitleRead: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  messageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 3,
  },
  messageDate: {
    // зачем: макет 12, шкала D145 — 13.
    fontSize: 13,
    fontWeight: '600',
  },
  pollBadge: {
    height: 22,
    borderRadius: 11,
    borderWidth: 0,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pollBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  vipSurveyBadge: {
    height: 22,
    borderRadius: 11,
    borderWidth: 0,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vipSurveyBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  messagePreview: {
    // зачем: макет 14, но шкала владельца D145 (01.10, новее макета) — подписи 13.
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  messagePreviewRead: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  messageRowActions: {
    marginTop: 10,
    alignItems: 'flex-start',
  },
  messageRowCta: {
    minHeight: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
  },
  messageRowCtaText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTile: {
    width: 55,
    height: 55,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 6,
    // зачем: макет 18 жирный; по D145 это не заголовок раздела (<19) — 16, иерархия весом.
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  emptyBody: {
    // зачем: макет 15, шкала D145 — 16.
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '400',
  },
  detailContent: {
    paddingBottom: 6,
  },
  detailDate: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '900',
    marginBottom: 14,
  },
  detailBody: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
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
  },
  vipSurveyTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  vipSurveyTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  vipSurveyBody: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  vipSurveyButton: {
    minHeight: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  vipSurveyButtonText: {
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
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  pollQuestion: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  pollOptions: {
    gap: 10, // зачем (стиль «Тень»): плашкам нужен зазор ≥10, чтобы тень «дышала»
  },
  pollOption: {
    minHeight: 48,
    borderRadius: 13,
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
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 13,
    fontWeight: '700',
  },
  reactions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  reactionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 10,
  },
  reactionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
