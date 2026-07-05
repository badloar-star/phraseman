import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { useStudyTarget } from './StudyTargetContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import {
  getKeyboardAwareComposerBottomPadding,
  useKeyboardAvoidanceMetrics,
} from './keyboardAvoidance';
import {
  addHelpBoardComment,
  createHelpBoardTopic,
  deleteHelpBoardTopicForEveryone,
  getHelpBoardScope,
  getHiddenHelpBoardComments,
  getHiddenHelpBoardTopics,
  getMyHelpBoardVotes,
  helpBoardVoteKey,
  hideHelpBoardComment,
  hideHelpBoardTopic,
  isHelpBoardAlreadyReported,
  reportHelpBoardItem,
  subscribeHelpBoardComments,
  subscribeHelpBoardTopic,
  subscribeHelpBoardTopics,
  voteHelpBoardItem,
  type HelpBoardComment,
  type HelpBoardCommentSubmitStatus,
  type HelpBoardSort,
  type HelpBoardTargetType,
  type HelpBoardTopic,
  type HelpBoardTopicSubmitStatus,
} from '../app/firestore_help_board';
import { getStableId } from '../app/stable_id';

type ToastKind = 'success' | 'error' | 'info';

function boardCopy(lang: string) {
  return {
    title: triLang(lang as any, { ru: 'Help Board', uk: 'Help Board', es: 'Help Board', 'pt-BR': 'Help Board', vi: 'Help Board', id: 'Help Board', tr: 'Help Board', pl: 'Help Board' }),
    subtitle: triLang(lang as any, {
      ru: 'Вопросы по языку, ответ Компаса и комментарии людей.',
      uk: 'Питання про мову, відповідь Компаса і коментарі людей.',
      es: 'Preguntas de idioma, respuesta de Compass y comentarios.',
      'pt-BR': 'Perguntas de idioma, resposta do Compass e comentarios.',
      vi: 'Cau hoi ngon ngu, cau tra loi Compass va binh luan.',
      id: 'Pertanyaan bahasa, jawaban Compass, dan komentar.',
      tr: 'Dil sorulari, Compass yaniti ve yorumlar.',
      pl: 'Pytania jezykowe, odpowiedz Compass i komentarze.',
    }),
    hot: triLang(lang as any, { ru: 'Горячее', uk: 'Гаряче', es: 'Populares', 'pt-BR': 'Quentes', vi: 'Noi bat', id: 'Ramai', tr: 'Sicak', pl: 'Gorace' }),
    fresh: triLang(lang as any, { ru: 'Новые', uk: 'Нові', es: 'Nuevas', 'pt-BR': 'Novas', vi: 'Moi', id: 'Baru', tr: 'Yeni', pl: 'Nowe' }),
    unanswered: triLang(lang as any, { ru: 'Без ответа', uk: 'Без відповіді', es: 'Sin respuesta', 'pt-BR': 'Sem resposta', vi: 'Chua tra loi', id: 'Belum dijawab', tr: 'Yanitsiz', pl: 'Bez odpowiedzi' }),
    best: triLang(lang as any, { ru: 'Лучшие', uk: 'Найкращі', es: 'Mejores', 'pt-BR': 'Melhores', vi: 'Tot nhat', id: 'Terbaik', tr: 'En iyi', pl: 'Najlepsze' }),
    ask: triLang(lang as any, { ru: 'Создать тему', uk: 'Створити тему', es: 'Crear tema', 'pt-BR': 'Criar tema', vi: 'Tao chu de', id: 'Buat topik', tr: 'Konu ac', pl: 'Utworz temat' }),
    topicTitle: triLang(lang as any, { ru: 'Название темы', uk: 'Назва теми', es: 'Titulo', 'pt-BR': 'Titulo', vi: 'Tieu de', id: 'Judul', tr: 'Baslik', pl: 'Tytul' }),
    question: triLang(lang as any, { ru: 'Вопрос или пример', uk: 'Питання або приклад', es: 'Pregunta o ejemplo', 'pt-BR': 'Pergunta ou exemplo', vi: 'Cau hoi hoac vi du', id: 'Pertanyaan atau contoh', tr: 'Soru veya ornek', pl: 'Pytanie lub przyklad' }),
    send: triLang(lang as any, { ru: 'Отправить', uk: 'Надіслати', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gui', id: 'Kirim', tr: 'Gonder', pl: 'Wyslij' }),
    delete: triLang(lang as any, { ru: 'Удалить', uk: 'Видалити', es: 'Eliminar', 'pt-BR': 'Excluir', vi: 'Xoa', id: 'Hapus', tr: 'Sil', pl: 'Usun' }),
    cancel: triLang(lang as any, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Huy', id: 'Batal', tr: 'Iptal', pl: 'Anuluj' }),
    compass: triLang(lang as any, { ru: 'Компас', uk: 'Компас', es: 'Compass', 'pt-BR': 'Compass', vi: 'Compass', id: 'Compass', tr: 'Compass', pl: 'Compass' }),
    aiNote: triLang(lang as any, {
      ru: 'AI-ответ. Проверь важное самостоятельно.',
      uk: 'AI-відповідь. Важливе перевіряй самостійно.',
      es: 'Respuesta de IA. Verifica lo importante.',
      'pt-BR': 'Resposta de IA. Verifique o que for importante.',
      vi: 'Cau tra loi AI. Hay kiem tra dieu quan trong.',
      id: 'Jawaban AI. Periksa hal penting sendiri.',
      tr: 'AI yaniti. Onemli seyleri kontrol et.',
      pl: 'Odpowiedz AI. Wazne rzeczy sprawdz samodzielnie.',
    }),
    comments: triLang(lang as any, { ru: 'Комментарии', uk: 'Коментарі', es: 'Comentarios', 'pt-BR': 'Comentarios', vi: 'Binh luan', id: 'Komentar', tr: 'Yorumlar', pl: 'Komentarze' }),
    writeComment: triLang(lang as any, { ru: 'Написать комментарий', uk: 'Написати коментар', es: 'Escribe un comentario', 'pt-BR': 'Escreva um comentario', vi: 'Viet binh luan', id: 'Tulis komentar', tr: 'Yorum yaz', pl: 'Napisz komentarz' }),
    reply: triLang(lang as any, { ru: 'Ответить', uk: 'Відповісти', es: 'Responder', 'pt-BR': 'Responder', vi: 'Tra loi', id: 'Balas', tr: 'Yanitla', pl: 'Odpowiedz' }),
    helpful: triLang(lang as any, { ru: 'Оценить', uk: 'Оцінити', es: 'Valorar', 'pt-BR': 'Avaliar', vi: 'Danh gia', id: 'Nilai', tr: 'Oyla', pl: 'Ocen' }),
    hide: triLang(lang as any, { ru: 'Скрыть', uk: 'Сховати', es: 'Ocultar', 'pt-BR': 'Ocultar', vi: 'An', id: 'Sembunyikan', tr: 'Gizle', pl: 'Ukryj' }),
    report: triLang(lang as any, { ru: 'Пожаловаться', uk: 'Поскаржитись', es: 'Reportar', 'pt-BR': 'Denunciar', vi: 'Bao cao', id: 'Laporkan', tr: 'Sikayet', pl: 'Zglos' }),
    reportSubtitle: triLang(lang as any, {
      ru: 'Что не так с этим сообщением?',
      uk: 'Що не так із цим повідомленням?',
      es: '¿Qué está mal con este mensaje?',
      'pt-BR': 'O que há de errado com esta mensagem?',
      vi: 'Tin nhan nay co van de gi?',
      id: 'Ada apa dengan pesan ini?',
      tr: 'Bu mesajda sorun ne?',
      pl: 'Co jest nie tak z ta wiadomoscia?',
    }),
    reasonSpam: triLang(lang as any, { ru: 'Спам или реклама', uk: 'Спам або реклама', es: 'Spam o publicidad', 'pt-BR': 'Spam ou publicidade', vi: 'Spam hoac quang cao', id: 'Spam atau iklan', tr: 'Spam veya reklam', pl: 'Spam lub reklama' }),
    reasonAbuse: triLang(lang as any, { ru: 'Оскорбления или травля', uk: 'Образи або цькування', es: 'Insultos o acoso', 'pt-BR': 'Insultos ou assédio', vi: 'Xuc pham hoac bat nat', id: 'Hinaan atau perundungan', tr: 'Hakaret veya zorbalik', pl: 'Obelgi lub nekanie' }),
    reasonDanger: triLang(lang as any, { ru: 'Опасный контент', uk: 'Небезпечний контент', es: 'Contenido peligroso', 'pt-BR': 'Conteúdo perigoso', vi: 'Noi dung nguy hiem', id: 'Konten berbahaya', tr: 'Tehlikeli icerik', pl: 'Niebezpieczna tresc' }),
    reasonOther: triLang(lang as any, { ru: 'Другое', uk: 'Інше', es: 'Otro', 'pt-BR': 'Outro', vi: 'Khac', id: 'Lainnya', tr: 'Diger', pl: 'Inne' }),
    reportSent: triLang(lang as any, {
      ru: 'Жалоба отправлена. Модератор посмотрит.',
      uk: 'Скаргу надіслано. Модератор перегляне.',
      es: 'Reporte enviado. Un moderador lo revisará.',
      'pt-BR': 'Denúncia enviada. Um moderador vai revisar.',
      vi: 'Da gui bao cao. Kiem duyet vien se xem.',
      id: 'Laporan terkirim. Moderator akan meninjau.',
      tr: 'Sikayet gonderildi. Moderator inceleyecek.',
      pl: 'Zgloszenie wyslane. Moderator je sprawdzi.',
    }),
    reportAlready: triLang(lang as any, {
      ru: 'Ты уже жаловался на это.',
      uk: 'Ти вже скаржився на це.',
      es: 'Ya reportaste esto.',
      'pt-BR': 'Você já denunciou isto.',
      vi: 'Ban da bao cao roi.',
      id: 'Kamu sudah melaporkan ini.',
      tr: 'Bunu zaten sikayet ettin.',
      pl: 'Juz to zglosiles.',
    }),
    reportFailed: triLang(lang as any, {
      ru: 'Не получилось отправить жалобу. Попробуй ещё раз.',
      uk: 'Не вдалося надіслати скаргу. Спробуй ще раз.',
      es: 'No se pudo enviar el reporte. Inténtalo de nuevo.',
      'pt-BR': 'Não foi possível enviar a denúncia. Tente de novo.',
      vi: 'Khong gui duoc bao cao. Thu lai nhe.',
      id: 'Gagal mengirim laporan. Coba lagi.',
      tr: 'Sikayet gonderilemedi. Tekrar dene.',
      pl: 'Nie udalo sie wyslac zgloszenia. Sprobuj ponownie.',
    }),
    voteFailed: triLang(lang as any, {
      ru: 'Не получилось поставить оценку. Попробуй ещё раз.',
      uk: 'Не вдалося поставити оцінку. Спробуй ще раз.',
      es: 'No se pudo votar. Inténtalo de nuevo.',
      'pt-BR': 'Não foi possível votar. Tente de novo.',
      vi: 'Khong danh gia duoc. Thu lai nhe.',
      id: 'Gagal memberi nilai. Coba lagi.',
      tr: 'Oy verilemedi. Tekrar dene.',
      pl: 'Nie udalo sie ocenic. Sprobuj ponownie.',
    }),
    compassThinking: triLang(lang as any, {
      ru: 'Компас пишет ответ…',
      uk: 'Компас пише відповідь…',
      es: 'Compass está escribiendo…',
      'pt-BR': 'Compass está escrevendo…',
      vi: 'Compass dang viet…',
      id: 'Compass sedang menulis…',
      tr: 'Compass yaziyor…',
      pl: 'Compass pisze…',
    }),
    emptyTitle: triLang(lang as any, { ru: 'Пока нет тем', uk: 'Поки немає тем', es: 'Sin temas', 'pt-BR': 'Sem temas', vi: 'Chua co chu de', id: 'Belum ada topik', tr: 'Konu yok', pl: 'Brak tematow' }),
    restricted: triLang(lang as any, {
      ru: 'Help Board доступен только после принятия правил и для режима полного доступа.',
      uk: 'Help Board доступний лише після прийняття правил і для повного доступу.',
      es: 'Help Board requiere reglas aceptadas y acceso completo.',
      'pt-BR': 'Help Board exige regras aceitas e acesso completo.',
      vi: 'Help Board can chap nhan quy tac va quyen truy cap day du.',
      id: 'Help Board perlu aturan diterima dan akses penuh.',
      tr: 'Help Board icin kurallar ve tam erisim gerekir.',
      pl: 'Help Board wymaga zaakceptowanych zasad i pelnego dostepu.',
    }),
  };
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

function topicSubmitErrorMessage(status: HelpBoardTopicSubmitStatus): string {
  if (status === 'blocked') return 'Blocked by moderation';
  if (status === 'throttled') return 'Slow down a little';
  if (status === 'offline') return 'Connection unavailable';
  if (status === 'auth') return 'Account sync failed. Reopen the app and try again.';
  if (status === 'server_unavailable') return 'Help Board server is not deployed yet.';
  return 'Could not send';
}

function commentSubmitErrorMessage(status: HelpBoardCommentSubmitStatus): string {
  if (status === 'blocked') return 'Blocked by moderation';
  if (status === 'throttled') return 'Slow down a little';
  if (status === 'offline') return 'Connection unavailable';
  if (status === 'auth') return 'Account sync failed. Reopen the app and try again.';
  if (status === 'server_unavailable') return 'Help Board server is not deployed yet.';
  if (status === 'not_found') return 'Topic is no longer available.';
  return 'Could not send';
}

interface HelpBoardPanelProps {
  onToast?: (message: string, type?: ToastKind) => void;
  /** Deep-link из центра уведомлений: открыть тему и подсветить комментарий. */
  deepLink?: { topicId: string; commentId?: string } | null;
  onDeepLinkConsumed?: () => void;
}

function HelpBoardPanel({ onToast, deepLink, onDeepLinkConsumed }: HelpBoardPanelProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const keyboardAvoidance = useKeyboardAvoidanceMetrics();
  const keyboardBottomInset = keyboardAvoidance.bottomInset;
  const copy = useMemo(() => boardCopy(lang), [lang]);
  const scope = useMemo(() => getHelpBoardScope(studyTarget, lang), [studyTarget, lang]);
  const [sort, setSort] = useState<HelpBoardSort>('new');
  const [topics, setTopics] = useState<HelpBoardTopic[]>([]);
  const [optimisticTopics, setOptimisticTopics] = useState<HelpBoardTopic[]>([]);
  const [hiddenTopics, setHiddenTopics] = useState<Record<string, boolean>>({});
  const [hiddenComments, setHiddenComments] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<HelpBoardTopic | null>(null);
  const [comments, setComments] = useState<HelpBoardComment[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [questionDraft, setQuestionDraft] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  // Реплай как в Telegram: цель ответа (плашка над полем ввода) + подсветка цитируемого.
  const [replyTarget, setReplyTarget] = useState<HelpBoardComment | null>(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const commentLayoutsRef = useRef<Record<string, number>>({});
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Комментарий, к которому надо доскроллить, как только он появится в снапшоте.
  const pendingScrollCommentIdRef = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [topicSubmitting, setTopicSubmitting] = useState(false);
  const [myStableUid, setMyStableUid] = useState('');
  const [deleteArmedTopicId, setDeleteArmedTopicId] = useState<string | null>(null);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);
  // Мои голоса (targetKey → 1): мгновенная подсветка «уже лайкнуто» + защита от даблтапа.
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [votePending, setVotePending] = useState<Record<string, boolean>>({});
  // Диалог жалобы: цель + отправка.
  const [reportTarget, setReportTarget] = useState<{ type: HelpBoardTargetType; id: string } | null>(null);
  const [reportSending, setReportSending] = useState(false);
  // Внутренний тост панели: родительский onToast показывал только ошибки через
  // Alert, поэтому успешные действия (лайк/жалоба) выглядели как «ничего не произошло».
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commentScrollRef = useRef<ScrollView | null>(null);
  // Синхронный замок отправки темы: setTopicSubmitting(true) применяется
  // асинхронно, поэтому два быстрых тапа в одном тике проходили оба. Ref
  // блокирует второй вход мгновенно.
  const topicSubmitInFlightRef = useRef(false);

  const canWrite = true;
  const commentComposerBottomPadding = getKeyboardAwareComposerBottomPadding(
    keyboardBottomInset,
    bottomInset,
    keyboardAvoidance.visible,
  );

  useEffect(() => {
    let alive = true;
    void getHiddenHelpBoardTopics().then((map) => { if (alive) setHiddenTopics(map); });
    void getHiddenHelpBoardComments().then((map) => { if (alive) setHiddenComments(map); });
    void getMyHelpBoardVotes().then((map) => { if (alive) setMyVotes(map); }).catch(() => {});
    void getStableId().then((uid) => { if (alive) setMyStableUid(uid); }).catch(() => {});
    return () => {
      alive = false;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  // Deep-link из центра уведомлений: открываем тему, комментарий подсветим после загрузки.
  useEffect(() => {
    if (!deepLink?.topicId) return;
    setSelectedId(deepLink.topicId);
    pendingScrollCommentIdRef.current = deepLink.commentId || null;
    onDeepLinkConsumed?.();
  }, [deepLink, onDeepLinkConsumed]);

  useEffect(() => {
    const unsub = subscribeHelpBoardTopics(scope, sort, setTopics, () => setTopics([]));
    return unsub;
  }, [scope, sort]);

  useEffect(() => {
    setReplyTarget(null);
    commentLayoutsRef.current = {};
    if (!selectedId) {
      setSelectedTopic(null);
      setComments([]);
      return;
    }
    const unsubTopic = subscribeHelpBoardTopic(selectedId, setSelectedTopic, () => setSelectedTopic(null));
    const unsubComments = subscribeHelpBoardComments(selectedId, setComments, () => setComments([]));
    return () => {
      unsubTopic();
      unsubComments();
    };
  }, [selectedId]);

  // Подсветить комментарий и доскроллить к нему (тап по цитате / переход из уведомления).
  const scrollToComment = useCallback((commentId: string) => {
    const y = commentLayoutsRef.current[commentId];
    if (typeof y === 'number') {
      commentScrollRef.current?.scrollTo({ y: Math.max(0, y - 70), animated: true });
    }
    setHighlightedCommentId(commentId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedCommentId(null), 1800);
  }, []);

  // Отложенный скролл deep-link'а: ждём, пока комментарий реально отрендерится.
  useEffect(() => {
    const target = pendingScrollCommentIdRef.current;
    if (!target || !comments.some((comment) => comment.id === target)) return;
    pendingScrollCommentIdRef.current = null;
    const id = setTimeout(() => scrollToComment(target), 250);
    return () => clearTimeout(id);
  }, [comments, scrollToComment]);

  useEffect(() => {
    if (!selectedId || !keyboardAvoidance.visible) return;
    const id = setTimeout(() => commentScrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(id);
  }, [keyboardAvoidance.visible, keyboardBottomInset, selectedId]);

  const visibleTopics = [
    ...optimisticTopics.filter((optimistic) => (
      !topics.some((topic) => topic.title === optimistic.title && topic.text === optimistic.text)
    )),
    ...topics,
  ].filter((topic) => !hiddenTopics[topic.id]);
  const visibleComments = comments.filter((comment) => !hiddenComments[comment.id]);

  const showToast = useCallback((message: string, type: ToastKind = 'info') => {
    // Показываем внутри панели — не зависим от того, как родитель обрабатывает onToast.
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, kind: type });
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
    // Родителю дублируем только ошибки (его контракт — Alert по ошибкам).
    if (type === 'error' && onToast) onToast(message, type);
  }, [onToast]);

  const submitTopic = useCallback(async () => {
    if (!canWrite) {
      showToast(copy.restricted, 'error');
      return;
    }
    const title = titleDraft.trim();
    const text = questionDraft.trim();
    if (title.length < 4 || text.length < 8 || topicSubmitting || topicSubmitInFlightRef.current) return;
    topicSubmitInFlightRef.current = true;
    hapticTap();
    const now = Date.now();
    const optimisticId = `optimistic-${now}`;
    const optimisticTopic: HelpBoardTopic = {
      id: optimisticId,
      boardKey: scope.boardKey,
      targetLang: scope.targetLang,
      uiLang: scope.uiLang,
      title,
      text,
      authorUid: 'local',
      authorName: 'You',
      authorAvatar: '',
      authorAura: '',
      status: 'visible',
      compassAnswer: '',
      compassStatus: 'pending',
      helpfulScore: 0,
      compassHelpfulScore: 0,
      commentCount: 0,
      reportCount: 0,
      hotScore: 0,
      bestScore: 0,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };
    setSort('new');
    setOptimisticTopics((cur) => [optimisticTopic, ...cur].slice(0, 6));
    setTitleDraft('');
    setQuestionDraft('');
    setComposerOpen(false);
    setTopicSubmitting(true);
    try {
      const status = await createHelpBoardTopic({ scope, title, text });
      if (status === 'created') {
        setTimeout(() => {
          setOptimisticTopics((cur) => cur.filter((topic) => topic.id !== optimisticId));
        }, 15_000);
      } else if (status === 'review') {
        setOptimisticTopics((cur) => cur.filter((topic) => topic.id !== optimisticId));
        showToast('Sent to review', 'info');
      } else if (status === 'restricted') {
        setOptimisticTopics((cur) => cur.filter((topic) => topic.id !== optimisticId));
        showToast(copy.restricted, 'error');
      } else {
        setOptimisticTopics((cur) => cur.filter((topic) => topic.id !== optimisticId));
        showToast(topicSubmitErrorMessage(status), 'error');
      }
    } finally {
      setTopicSubmitting(false);
      topicSubmitInFlightRef.current = false;
    }
  }, [canWrite, copy.restricted, questionDraft, scope, showToast, titleDraft, topicSubmitting]);

  const submitComment = useCallback(async () => {
    if (!selectedId || commentDraft.trim().length < 2 || busy) return;
    if (!canWrite) {
      showToast(copy.restricted, 'error');
      return;
    }
    hapticTap();
    setBusy(true);
    const status = await addHelpBoardComment({
      topicId: selectedId,
      text: commentDraft,
      ...(replyTarget ? { replyToCommentId: replyTarget.id } : {}),
    });
    setBusy(false);
    if (status === 'sent') {
      setCommentDraft('');
      setReplyTarget(null);
    } else if (status === 'review') {
      setCommentDraft('');
      setReplyTarget(null);
      showToast('Sent to review', 'info');
    } else if (status === 'restricted') {
      showToast(copy.restricted, 'error');
    } else {
      showToast(commentSubmitErrorMessage(status), 'error');
    }
  }, [busy, canWrite, commentDraft, copy.restricted, replyTarget, selectedId, showToast]);

  // Лайк-тоггл: иконка меняется МГНОВЕННО (оптимистично), счётчик подтягивает
  // live-подписка после серверной транзакции. Ошибка → откат + тост (раньше
  // ошибки глотались молча, и лайк выглядел «не работает»).
  const toggleVote = useCallback(async (targetType: HelpBoardTargetType, targetId: string) => {
    const key = helpBoardVoteKey(targetType, targetId);
    if (votePending[key]) return;
    hapticTap();
    const prev = Number(myVotes[key] || 0);
    const next = prev === 1 ? 0 : 1;
    setMyVotes((cur) => ({ ...cur, [key]: next }));
    setVotePending((cur) => ({ ...cur, [key]: true }));
    const res = await voteHelpBoardItem(targetType, targetId, next === 0 ? 0 : 1);
    setVotePending((cur) => {
      const copyMap = { ...cur };
      delete copyMap[key];
      return copyMap;
    });
    if (!res || !res.ok) {
      setMyVotes((cur) => ({ ...cur, [key]: prev }));
      showToast(copy.voteFailed, 'error');
      return;
    }
    // Сервер — истина (toggle-семантика): при рассинхроне выравниваемся по нему.
    if (res.value !== next) setMyVotes((cur) => ({ ...cur, [key]: res.value }));
  }, [copy.voteFailed, myVotes, showToast, votePending]);

  // Отправка жалобы с выбранной в диалоге причиной.
  const submitReport = useCallback(async (reasonCode: string, reasonLabel: string) => {
    if (!reportTarget || reportSending) return;
    hapticTap();
    setReportSending(true);
    try {
      await reportHelpBoardItem(reportTarget.type, reportTarget.id, `${reasonCode}: ${reasonLabel}`);
      setReportTarget(null);
      showToast(copy.reportSent, 'success');
    } catch (e) {
      setReportTarget(null);
      if (isHelpBoardAlreadyReported(e)) showToast(copy.reportAlready, 'info');
      else showToast(copy.reportFailed, 'error');
    } finally {
      setReportSending(false);
    }
  }, [copy.reportAlready, copy.reportFailed, copy.reportSent, reportSending, reportTarget, showToast]);

  const hideTopic = useCallback(async (topicId: string) => {
    hapticTap();
    await hideHelpBoardTopic(topicId);
    setHiddenTopics((cur) => ({ ...cur, [topicId]: true }));
    if (selectedId === topicId) setSelectedId(null);
  }, [selectedId]);

  const hideComment = useCallback(async (commentId: string) => {
    hapticTap();
    await hideHelpBoardComment(commentId);
    setHiddenComments((cur) => ({ ...cur, [commentId]: true }));
  }, []);

  const isMyTopic = useCallback((topic: HelpBoardTopic) => (
    topic.authorUid === myStableUid || topic.authorUid === 'local'
  ), [myStableUid]);

  const deleteTopicEverywhere = useCallback(async (topicId: string) => {
    if (!topicId || topicId.startsWith('optimistic-') || deletingTopicId) return;
    hapticTap();
    setDeletingTopicId(topicId);
    setDeleteArmedTopicId(null);
    setTopics((cur) => cur.filter((topic) => topic.id !== topicId));
    const status = await deleteHelpBoardTopicForEveryone(topicId);
    setDeletingTopicId(null);
    if (status !== 'deleted') {
      showToast(status === 'restricted' ? copy.restricted : topicSubmitErrorMessage(status as HelpBoardTopicSubmitStatus), 'error');
    }
  }, [copy.restricted, deletingTopicId, showToast]);

  const actionRow = (targetType: 'topic' | 'comment', targetId: string, score: number, onHide: () => void, onReply?: () => void) => {
    const voteKey = helpBoardVoteKey(targetType, targetId);
    const liked = Number(myVotes[voteKey] || 0) === 1;
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <TouchableOpacity
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={copy.helpful}
          accessibilityState={{ selected: liked }}
          onPress={() => void toggleVote(targetType, targetId)}
          style={{ minWidth: 44, height: 44, borderRadius: 22, paddingHorizontal: 13, flexDirection: 'row', gap: 5, borderWidth: 0.5, borderColor: liked ? t.accent : t.border, backgroundColor: t.bgSurface, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name={liked ? 'thumbs-up' : 'thumbs-up-outline'} size={16} color={liked ? t.accent : t.textMuted} />
          <Text style={{ color: liked ? t.accent : t.textMuted, fontSize: f.caption, fontWeight: '900' }}>
            {Math.max(0, score)}
          </Text>
        </TouchableOpacity>
        {onReply ? (
          <TouchableOpacity
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={copy.reply}
            onPress={onReply}
            style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 0.5, borderColor: t.border, backgroundColor: t.bgSurface, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-undo-outline" size={16} color={t.textMuted} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={copy.hide}
          onPress={onHide}
          style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 0.5, borderColor: t.border, backgroundColor: t.bgSurface, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="eye-off-outline" size={16} color={t.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={copy.report}
          onPress={() => {
            hapticTap();
            setReportTarget({ type: targetType, id: targetId });
          }}
          style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 0.5, borderColor: t.border, backgroundColor: t.bgSurface, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="flag-outline" size={16} color={t.textMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  const commentAvatar = (comment: HelpBoardComment) => (
    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: comment.isCompass ? t.accent : t.bgCard, borderWidth: 0.5, borderColor: comment.isCompass ? t.accent : t.border, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={comment.isCompass ? 'compass' : 'person'} size={16} color={comment.isCompass ? t.correctText : t.textMuted} />
    </View>
  );

  // Диалог выбора причины жалобы. Раньше кнопка «Пожаловаться» молча слала
  // жалобу с зашитой причиной — юзер ждал, что что-то откроется, и не видел ничего.
  const reportReasons: Array<{ code: string; label: string }> = [
    { code: 'spam', label: copy.reasonSpam },
    { code: 'abuse', label: copy.reasonAbuse },
    { code: 'danger', label: copy.reasonDanger },
    { code: 'other', label: copy.reasonOther },
  ];
  const reportModal = (
    <Modal visible={!!reportTarget} transparent animationType="fade" onRequestClose={() => setReportTarget(null)}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setReportTarget(null)}
        style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.55)' }}
      >
        <TouchableOpacity activeOpacity={1} style={{ borderRadius: 18, borderWidth: 0.5, borderColor: t.border, backgroundColor: t.bgCard, padding: 16, gap: 8 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }}>{copy.report}</Text>
          <Text style={{ color: t.textMuted, fontSize: f.caption, marginBottom: 4 }}>{copy.reportSubtitle}</Text>
          {reportReasons.map((r) => (
            <TouchableOpacity
              key={r.code}
              disabled={reportSending}
              accessibilityRole="button"
              accessibilityLabel={r.label}
              onPress={() => void submitReport(r.code, r.label)}
              style={{ minHeight: 46, borderRadius: 12, borderWidth: 0.5, borderColor: t.border, backgroundColor: t.bgSurface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, opacity: reportSending ? 0.5 : 1 }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>{r.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setReportTarget(null)}
            accessibilityRole="button"
            accessibilityLabel={copy.cancel}
            style={{ minHeight: 42, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '900' }}>{copy.cancel}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  const toastView = toast ? (
    <View pointerEvents="none" style={{ position: 'absolute', left: 12, right: 12, bottom: 18, alignItems: 'center' }}>
      <View
        style={{
          maxWidth: 420,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: t.bgCard,
          borderWidth: 1,
          borderColor: toast.kind === 'error' ? '#E05252' : toast.kind === 'success' ? t.correct : t.border,
        }}
      >
        <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800', textAlign: 'center' }}>{toast.message}</Text>
      </View>
    </View>
  ) : null;

  if (selectedId && selectedTopic) {
    return (
      <View style={{ flex: 1, minHeight: 420 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              hapticTap();
              setSelectedId(null);
            }}
            style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, borderColor: t.border, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgSurface }}
          >
            <Ionicons name="chevron-back" size={21} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }}>{selectedTopic.title}</Text>
            <Text style={{ color: t.textMuted, fontSize: Math.max(10, f.caption - 1), fontWeight: '800' }}>
              {selectedTopic.commentCount} {copy.comments.toLowerCase()}
            </Text>
          </View>
        </View>
        <ScrollView
          ref={commentScrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          nestedScrollEnabled
        >
          <View style={{ borderRadius: 14, borderWidth: 0.5, borderColor: t.border, backgroundColor: t.bgSurface, padding: 12 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, lineHeight: Math.round(f.body * 1.35), fontWeight: '800' }}>{selectedTopic.text}</Text>
            <Text style={{ color: t.textMuted, fontSize: Math.max(10, f.caption - 1), fontWeight: '800', marginTop: 8 }}>
              {selectedTopic.authorName} · {timeLabel(selectedTopic.createdAt)}
            </Text>
            {actionRow('topic', selectedTopic.id, selectedTopic.helpfulScore, () => hideTopic(selectedTopic.id))}
          </View>
          {/* Компас ещё думает: раньше в этот момент не было НИЧЕГО — юзер не знал,
              будет ли ответ вообще. */}
          {(selectedTopic.compassStatus === 'pending' || selectedTopic.compassStatus === 'generating') &&
            !visibleComments.some((comment) => comment.isCompass) && (
            <View style={{ borderRadius: 14, borderWidth: 0.5, borderColor: t.border, backgroundColor: t.bgSurface, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="compass" size={16} color={t.correctText} />
              </View>
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800', flex: 1 }}>{copy.compassThinking}</Text>
            </View>
          )}
          <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900', marginTop: 6 }}>{copy.comments}</Text>
          {visibleComments.map((comment) => {
            const highlighted = highlightedCommentId === comment.id;
            return (
              <View
                key={comment.id}
                onLayout={(e) => { commentLayoutsRef.current[comment.id] = e.nativeEvent.layout.y; }}
                style={{
                  borderRadius: 14,
                  borderWidth: highlighted ? 1.5 : 0.5,
                  borderColor: highlighted ? t.accent : t.border,
                  backgroundColor: t.bgSurface,
                  padding: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {commentAvatar(comment)}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '900' }}>{comment.authorName}</Text>
                    <Text style={{ color: t.textGhost, fontSize: Math.max(9, f.caption - 2), fontWeight: '800' }}>{timeLabel(comment.createdAt)}</Text>
                  </View>
                </View>
                {comment.replyToCommentId ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => scrollToComment(comment.replyToCommentId!)}
                    style={{ flexDirection: 'row', borderRadius: 10, backgroundColor: t.bgCard, marginBottom: 8, overflow: 'hidden' }}
                  >
                    <View style={{ width: 3, backgroundColor: t.accent }} />
                    <View style={{ flex: 1, paddingHorizontal: 9, paddingVertical: 6, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ color: t.accent, fontSize: Math.max(10, f.caption - 1), fontWeight: '900' }}>
                        {comment.replyToIsCompass ? copy.compass : (comment.replyToAuthorName || '')}
                      </Text>
                      <Text numberOfLines={1} style={{ color: t.textMuted, fontSize: Math.max(10, f.caption - 1), fontWeight: '700' }}>
                        {comment.replyToText || ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : null}
                <Text style={{ color: t.textPrimary, fontSize: f.body, lineHeight: Math.round(f.body * 1.35), fontWeight: '700' }}>{comment.text}</Text>
                {actionRow('comment', comment.id, comment.helpfulScore, () => hideComment(comment.id), () => {
                  hapticTap();
                  setReplyTarget(comment);
                })}
              </View>
            );
          })}
        </ScrollView>
        {replyTarget ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, paddingHorizontal: 2 }}>
            <Ionicons name="arrow-undo-outline" size={16} color={t.accent} />
            <View style={{ flex: 1, minWidth: 0, borderLeftWidth: 3, borderLeftColor: t.accent, paddingLeft: 8 }}>
              <Text numberOfLines={1} style={{ color: t.accent, fontSize: Math.max(10, f.caption - 1), fontWeight: '900' }}>
                {replyTarget.isCompass ? copy.compass : replyTarget.authorName}
              </Text>
              <Text numberOfLines={1} style={{ color: t.textMuted, fontSize: Math.max(10, f.caption - 1), fontWeight: '700' }}>
                {replyTarget.text}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={copy.cancel}
              onPress={() => { hapticTap(); setReplyTarget(null); }}
              style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={18} color={t.textMuted} />
            </TouchableOpacity>
          </View>
        ) : null}
        <View testID="help-board-comment-composer" style={{ marginBottom: keyboardBottomInset, flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 8, paddingBottom: commentComposerBottomPadding, borderTopWidth: 0.5, borderTopColor: t.border }}>
          <TextInput
            testID="help-board-comment-input"
            value={commentDraft}
            onChangeText={setCommentDraft}
            onFocus={() => setTimeout(() => commentScrollRef.current?.scrollToEnd({ animated: true }), 80)}
            placeholder={copy.writeComment}
            placeholderTextColor={t.textGhost}
            multiline
            maxLength={900}
            editable={!busy && canWrite}
            style={{ flex: 1, minHeight: 40, maxHeight: 110, borderRadius: 14, borderWidth: 0.5, borderColor: t.border, backgroundColor: t.bgSurface, color: t.textPrimary, paddingHorizontal: 12, paddingVertical: 9, fontSize: f.body, textAlignVertical: 'top' }}
          />
          <TouchableOpacity
            activeOpacity={0.84}
            disabled={busy || !commentDraft.trim()}
            onPress={submitComment}
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: t.accent, opacity: busy || !commentDraft.trim() ? 0.45 : 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="send" size={18} color={t.correctText} />
          </TouchableOpacity>
        </View>
        {reportModal}
        {toastView}
      </View>
    );
  }

  return (
    <View testID="help-board-panel" style={{ flex: 1, minHeight: 420 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        {([
          ['new', copy.fresh],
          ['best', copy.best],
        ] as Array<[HelpBoardSort, string]>).map(([key, label]) => {
          const active = sort === key;
          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.82}
              onPress={() => {
                hapticTap();
                setSort(key);
              }}
              style={{ flex: 1, minHeight: 34, borderBottomWidth: 2, borderBottomColor: active ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}
            >
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={{ color: active ? t.accent : t.textMuted, fontSize: Math.max(10, f.caption - 1), fontWeight: '900' }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => {
            hapticTap();
            setComposerOpen(true);
          }}
          style={{ width: 44, height: 40, alignItems: 'center', justifyContent: 'center', paddingBottom: 2 }}
          accessibilityRole="button"
          accessibilityLabel={copy.ask}
        >
          <Ionicons name="create-outline" size={25} color={t.accent} />
        </TouchableOpacity>
      </View>
      {!canWrite ? (
        <View style={{ borderRadius: 12, borderWidth: 0.5, borderColor: t.border, backgroundColor: t.bgSurface, padding: 10, marginBottom: 10 }}>
          <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: Math.round(f.caption * 1.35), fontWeight: '800' }}>{copy.restricted}</Text>
        </View>
      ) : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 12 }} nestedScrollEnabled>
        {visibleTopics.length === 0 ? (
          <View style={{ minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 }}>
            <Ionicons name="chatbubble-ellipses-outline" size={38} color={t.textGhost} />
            <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900', textAlign: 'center' }}>{copy.emptyTitle}</Text>
          </View>
        ) : visibleTopics.map((topic) => (
          <TouchableOpacity
            key={topic.id}
            activeOpacity={topic.id.startsWith('optimistic-') ? 1 : 0.84}
            onLongPress={() => {
              if (topic.id.startsWith('optimistic-') || !isMyTopic(topic)) return;
              hapticTap();
              setDeleteArmedTopicId((cur) => (cur === topic.id ? null : topic.id));
            }}
            onPress={() => {
              if (topic.id.startsWith('optimistic-')) return;
              if (deleteArmedTopicId === topic.id) {
                setDeleteArmedTopicId(null);
                return;
              }
              hapticTap();
              setSelectedId(topic.id);
            }}
            style={{ borderRadius: 14, borderWidth: 0.5, borderColor: t.border, backgroundColor: t.bgSurface, padding: 12, opacity: topic.id.startsWith('optimistic-') ? 0.78 : 1 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={{ color: t.textPrimary, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.28), fontWeight: '900' }}>{topic.title}</Text>
                <Text numberOfLines={2} style={{ color: t.textMuted, fontSize: f.caption, lineHeight: Math.round(f.caption * 1.35), fontWeight: '700', marginTop: 4 }}>{topic.text}</Text>
              </View>
              <Text style={{ color: t.textGhost, fontSize: Math.max(10, f.caption - 1), fontWeight: '900' }}>{timeLabel(topic.lastActivityAt)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <Text style={{ color: t.textGhost, fontSize: Math.max(10, f.caption - 1), fontWeight: '900' }}>{topic.authorName}</Text>
              <Text style={{ color: t.textGhost, fontSize: Math.max(10, f.caption - 1), fontWeight: '900' }}>+{topic.helpfulScore}</Text>
              <Text style={{ color: t.textGhost, fontSize: Math.max(10, f.caption - 1), fontWeight: '900' }}>{topic.commentCount} {copy.comments.toLowerCase()}</Text>
            </View>
            {deleteArmedTopicId === topic.id ? (
              <TouchableOpacity
                activeOpacity={0.84}
                disabled={deletingTopicId === topic.id}
                accessibilityRole="button"
                accessibilityLabel={copy.delete}
                onPress={() => void deleteTopicEverywhere(topic.id)}
                style={{ minHeight: 40, borderRadius: 12, backgroundColor: '#E05252', opacity: deletingTopicId === topic.id ? 0.55 : 1, alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingHorizontal: 12 }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: f.caption, fontWeight: '900' }}>{copy.delete}</Text>
              </TouchableOpacity>
            ) : null}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={composerOpen} transparent animationType="fade" onRequestClose={() => setComposerOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: 18, backgroundColor: 'rgba(0,0,0,0.55)' }}>
          {/* keyboardShouldPersistTaps='handled': при поднятой клавиатуре ПЕРВЫЙ
              тап по «Отправить»/«Отмена» сразу срабатывает, а не гасится
              dismiss-ом клавиатуры (иначе нужен второй тап — прод-жалоба). */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          >
          <View style={{ borderRadius: 18, borderWidth: 0.5, borderColor: t.border, backgroundColor: t.bgCard, padding: 14, gap: 10 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }}>{copy.ask}</Text>
            <TextInput
              value={titleDraft}
              onChangeText={setTitleDraft}
              placeholder={copy.topicTitle}
              placeholderTextColor={t.textGhost}
              maxLength={120}
              style={{ minHeight: 42, borderRadius: 12, borderWidth: 0.5, borderColor: t.border, backgroundColor: t.bgSurface, color: t.textPrimary, paddingHorizontal: 12, fontSize: f.body, fontWeight: '800' }}
            />
            <TextInput
              value={questionDraft}
              onChangeText={setQuestionDraft}
              placeholder={copy.question}
              placeholderTextColor={t.textGhost}
              multiline
              maxLength={2200}
              style={{ minHeight: 150, maxHeight: 220, borderRadius: 12, borderWidth: 0.5, borderColor: t.border, backgroundColor: t.bgSurface, color: t.textPrimary, paddingHorizontal: 12, paddingVertical: 10, fontSize: f.body, textAlignVertical: 'top' }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity onPress={() => setComposerOpen(false)} style={{ minHeight: 40, borderRadius: 12, borderWidth: 0.5, borderColor: t.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }}>
                <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '900' }}>{copy.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={topicSubmitting || titleDraft.trim().length < 4 || questionDraft.trim().length < 8} onPress={submitTopic} style={{ minHeight: 40, borderRadius: 12, backgroundColor: t.accent, opacity: topicSubmitting || titleDraft.trim().length < 4 || questionDraft.trim().length < 8 ? 0.45 : 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }}>
                <Text style={{ color: t.correctText, fontSize: f.caption, fontWeight: '900' }}>{copy.send}</Text>
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      {reportModal}
      {toastView}
    </View>
  );
}

export default memo(HelpBoardPanel);
