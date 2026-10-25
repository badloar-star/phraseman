import EnergyBar from '../EnergyBar';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ActivityIndicator, BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '../feedback/PressableScale';
import { describeDialogueVoiceMessage } from '../../app/dialogue_voice_message';
import MicAllowanceBadge from '../MicAllowanceBadge';
import type { DialogueVoiceDraft } from '../../app/dialogue_voice_message';
import type { DialogueV2VoiceStatus } from '../../hooks/use_dialogue_v2_voice_message';
import type { DialogueV2CoachingMood } from '../../app/dialogue_v2_turn_coaching_client';
import type { DialogueV2SessionCoachingLabels } from '../../app/dialogue_v2_session_coaching_labels';
import type { Lang } from '../../constants/i18n';
import { DialogueGlassSquareButton, DialogueGlassSysError, useDialogueGlass } from './glass/DialogueGlassKit';
import { ScreenBackSlot, SafeTopBackButton } from '../v2/ScreenBackButton';
import {
  DialogueGlassBubble,
  DialogueGlassBubbleText,
  DialogueGlassTyping,
  dialogueGlassActionStyle,
  dialogueGlassBubbleInk,
  dialogueGlassFieldStyle,
  dialogueGlassRoundButtonStyle,
} from './glass/DialogueGlassChat';
import {
  DialogueGlassBetterPhrasing,
  DialogueGlassEndVeil,
  DialogueGlassGoalCard,
  DialogueGlassLimitWall,
  DialogueGlassMoodFace,
  DialogueGlassQuotaPill,
  DialogueGlassReplyAction,
  DialogueGlassSummaryPill,
} from './glass/DialogueGlassSessionParts';
import { glassTone } from './glass/glassTone';
import { DialogueGlassMenuSheet } from './glass/DialogueGlassMenuSheet';
import DialogGoalsSheet from './DialogGoalsSheet';
import DialogHintModal from './DialogHintModal';
import { useDialogKeyboardLog } from './use_dialog_keyboard_log';
import { DIALOG_GOAL_STRIP_GAP, DIALOG_GOAL_STRIP_HEIGHT, DIALOG_GOAL_STRIP_MIN_LIST, dialogGoalStripFits, dialogListViewportDecision, isDialogListAtEnd } from './dialog_list_viewport';
import { animateNextLayoutTransition } from '../../app/smooth_layout';
import { DialogSayHints } from './hints/DialogSayHints';
import { useDialogSayHintInput } from './hints/use_dialog_say_hint_input';
import type { DialogSayHint } from './hints/dialog_say_hints_model';
import DialogWhySheet from './DialogWhySheet';
import { useDialogInputLayoutTrace } from './glass/useDialogInputLayoutTrace';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { DialogueGlassExitSheet } from './glass/DialogueGlassExitSheet';

// зачем (владелец 2026-09-30): сессия V2 «1 в 1» по макету dialogs.html C1–C24 (Liquid Glass):
// шапка `.dh` (круглая «‹», название сцены + настроение собеседника, пилюля месячного остатка
// ответов у Free (D111), квадратная «⋯»), карточка «Цель N из M» с «Подсказкой», реплики с
// «Перевод»/«Почему так» (C3/C7) и «Лучше так» под своей (C9), плашки ошибок по причине (C18/C19),
// стена лимита на месте ввода (C21), вуаль «к итогу» и пилюля «Итоги» (C24). Разбор приходит
// вместе с репликой (D112) — ни одна кнопка не ждёт сети. Энергии в V2 нет (решения нет).

type DialogueV2SessionMessageBase = Readonly<{
  id: string;
  authorLabel?: string;
  text: string;
}>;

export type DialogueV2SessionMessage = DialogueV2SessionMessageBase & (
  | Readonly<{
    author: 'learner';
    /** Local-only recording; its transcript remains available only to the turn transport. */
    voice?: Readonly<{ uri: string }>;
    preparedBotVoice?: never;
    /** «Лучше так» из разбора следующего хода (D112). */
    betterPhrasing?: string;
    /** Сервер реплику не принял (лимит, dialogs-035): пузырь остаётся с отметкой «Не отправлено». */
    unsent?: boolean;
    /** Реплика не на изучаемом языке (владелец 18.10): не ушла на сервер и не считается ходом. */
    offLanguage?: boolean;
    translation?: never;
    explanation?: never;
  }>
  | Readonly<{
    author: 'persona';
    voice?: never;
    /** Exact build-local asset already authorized by the route runtime. */
    preparedBotVoice?: Readonly<{
      localUri: string;
      preparedResponseId: string;
      replyTextSha256: string;
    }>;
    betterPhrasing?: never;
    unsent?: never;
    offLanguage?: never;
    /** Перевод реплики на язык интерфейса (D112). */
    translation?: string;
    /** «Почему так» — разбор реплики на языке интерфейса (D112). */
    explanation?: string;
  }>
);

export type DialogueV2SessionLabels = Readonly<{
  back: string;
  placeholder: string;
  send: string;
  complete: string;
  /** Короткая подпись под названием сцены (`.dh .su`), пока настроения нет. */
  subtitle: string;
  /** Кнопка «⋯» и заголовок её шторки. */
  more: string;
  close: string;
  you: string;
  voiceIdle: string;
  voiceStarting: string;
  voiceRecording: string;
  discardVoice: string;
  turnError: string;
  retry: string;
  /** Пункт меню и заголовок шторки со списком заданий сцены. */
  tasks: string;
  exitTitle: string;
  exitMessage: string;
  exitStay: string;
  exitLeave: string;
}>;

export type DialogueV2SessionBottom = 'input' | 'wall' | 'ended' | 'summary';

export type DialogueV2WhyTarget = Readonly<{
  messageId: string;
  quote: string;
  note: string;
  translation: string;
  /** null — Plus: шторка открыта без счётчика. */
  plusGate: Readonly<{
    revealed: boolean;
    freeLeft: number;
    freePerDay: number;
  }> | null;
}>;

export type DialogueV2SessionScreenProps = Readonly<{
  title: string;
  messages: readonly DialogueV2SessionMessage[];
  draft: string;
  sending: boolean;
  voiceStatus: DialogueV2VoiceStatus;
  voiceDraft: DialogueVoiceDraft | null;
  playingVoiceUri: string | null;
  playingPreparedBotVoiceMessageId: string | null;
  interfaceLang: Lang;
  labels: DialogueV2SessionLabels;
  coachingLabels?: DialogueV2SessionCoachingLabels;
  /** Задания сцены из брифинга (только подписи; статусов выполнения в V2 нет). */
  objectives: readonly Readonly<{ id: string; label: string }>[];
  /** Настроение собеседника из последнего хода; null — ещё не известно. */
  headerMood?: Readonly<{ mood: DialogueV2CoachingMood; label: string }> | null;
  /** Месячный остаток ответов у Free (D111); null — Plus или остаток ещё не известен. */
  quotaPill?: Readonly<{ text: string; accessibilityLabel: string }> | null;
  /** Макет dialogs.html B6: пилюля энергии в шапке (5 → 4 на старте); у Plus её нет. */
  showEnergy?: boolean;
  /** Текущее задание сцены; null — все выполнены. */
  goal?: Readonly<{ kicker: string; label: string }> | null;
  /** Текст окна «Подсказка». */
  hintText?: string | null;
  /** «Можно сказать…» над полем ввода: 1–3 фразы на изучаемом языке со смыслом (владелец 24.10 «постоянно должны быть подсказки»). */
  sayHints?: readonly DialogSayHint[];
  translatedIds?: ReadonlySet<string>;
  onToggleTranslation?: (messageId: string) => void;
  whyTarget?: DialogueV2WhyTarget | null;
  onOpenWhy?: (messageId: string) => void;
  onCloseWhy?: () => void;
  fixOpenIds?: ReadonlySet<string>;
  onOpenFix?: (messageId: string) => void;
  bottom?: DialogueV2SessionBottom;
  onOpenSummary?: () => void;
  onOpenPlus?: () => void;
  /** Текст стены месячного лимита (C21, D111). */
  limitWallMessage?: string;
  /** Причина, почему голос не дал текста (C14/C15), и действие рядом. */
  voiceFailure?: Readonly<{ text: string; actionLabel?: string; onAction?: () => void }> | null;
  /** §SPEECH-NA: на устройстве нет распознавателя — микрофон перечёркнут и приглушён. */
  voiceUnavailable?: boolean;
  /** Последний ход не дошёл: плашка в ленте (C18/C19), разговор остаётся на экране. */
  turnError: boolean;
  /** К2 (координатор 18.10): подпись под «…» собеседника, пока ответ идёт долго; null — без подписи. */
  typingCaption?: string | null;
  /** Значок в аватаре собеседника — значок сценки (Макеты 6dcbedb9f, dialogs-014/022/029); нет — значок человека. */
  personaIcon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Текст плашки; по умолчанию labels.turnError. */
  turnErrorMessage?: string;
  /** Потолок Plus на сегодня (D123): поле ввода приглушено и недоступно — повтор сегодня не поможет (кадр «На сегодня разговоров достаточно»). */
  inputLocked?: boolean;
  retryDisabled: boolean;
  /** false — плашка без «Повторить» (C19 «слишком много сообщений»). */
  retryAvailable?: boolean;
  onRetry: () => void;
  onBack: () => void;
  onChangeDraft: (value: string) => void;
  onSend: () => void;
  /** Бейдж «PLUS» на микрофоне: голосовые попытки на день исчерпаны / голос только в Plus (решение владельца 12.10, п.81 (13); сам вид — тут, правило «когда голос только Plus» — у Ядра). */
  micPlusBadge?: boolean;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onDiscardVoice: () => void;
  onPlayVoice: (uri: string) => void;
  onPlayPreparedBotVoice: (messageId: string) => void;
  onComplete: () => void;
}>;

const EMPTY_SET: ReadonlySet<string> = new Set<string>();
const NO_SAY_HINTS: readonly DialogSayHint[] = Object.freeze([]);

/** Design 2.0 text-chat surface; session authority lives in the route, not here. */
export function DialogueV2SessionScreen({
  title,
  messages,
  draft,
  sending,
  voiceStatus,
  voiceDraft,
  playingVoiceUri,
  playingPreparedBotVoiceMessageId,
  interfaceLang,
  labels,
  coachingLabels,
  objectives,
  headerMood = null,
  quotaPill = null,
  showEnergy = false,
  goal = null,
  hintText = null,
  sayHints = NO_SAY_HINTS,
  translatedIds = EMPTY_SET,
  onToggleTranslation,
  whyTarget = null,
  onOpenWhy,
  onCloseWhy,
  fixOpenIds = EMPTY_SET,
  onOpenFix,
  bottom = 'input',
  onOpenSummary,
  onOpenPlus,
  limitWallMessage,
  voiceFailure = null,
  voiceUnavailable = false,
  micPlusBadge = false,
  turnError,
  typingCaption = null,
  personaIcon,
  turnErrorMessage,
  inputLocked = false,
  retryDisabled,
  retryAvailable = true,
  onRetry,
  onBack,
  onChangeDraft,
  onSend,
  onStartVoice,
  onStopVoice,
  onDiscardVoice,
  onPlayVoice,
  onPlayPreparedBotVoice,
  onComplete,
}: DialogueV2SessionScreenProps) {
  const glass = useDialogueGlass();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [goalsOpen, setGoalsOpen] = React.useState(false);
  const [hintOpen, setHintOpen] = React.useState(false);
  const [exitOpen, setExitOpen] = React.useState(false);
  const scrollRef = React.useRef<ScrollView>(null);
  const markKeyboardCause = useDialogKeyboardLog('scenario');
  const voiceBusy = voiceStatus !== 'idle';
  // зачем: пока висит плашка ошибки, путь один — «Повторить» (раньше экран целиком
  // заменялся плашкой, и новое сообщение отправить было нельзя; поведение то же).
  const canSend = draft.trim().length > 0 && !voiceBusy && !turnError && !inputLocked;
  const completeDisabled = sending || voiceBusy || messages.length === 0;
  const voiceHint = voiceStatus === 'recording'
    ? labels.voiceRecording
    : voiceStatus === 'starting' ? labels.voiceStarting : voiceFailure?.text ?? labels.voiceIdle;
  const voiceCopy = describeDialogueVoiceMessage(interfaceLang);
  const goalRows = React.useMemo(
    () => objectives.map((objective) => ({ id: objective.id, labelRu: objective.label })),
    [objectives],
  );
  const noGoalsMet = React.useMemo(() => new Set<string>(), []);
  // зачем (C23): пока переписка не началась, терять нечего — назад сразу; после первой реплики
  // выход идёт через подтверждение, чтобы случайный тап/жест не стирал разговор.
  const hasConversation = messages.length > 0;
  const requestBack = React.useCallback(() => {
    // зачем (сверка dialogs-036, «сперва логи»): ссылка открыла Главную вместо «Выйти из диалога?» — окно показывается только после первой реплики; ветка и значения, которые её решили, — в журнал
    console.log(`[DLG-EXIT] back:request hasConversation=${hasConversation} messages=${messages.length} bottom=${String(bottom)} → ${hasConversation && bottom !== 'summary' ? 'exit_sheet' : 'leave_now'}`);
    if (hasConversation && bottom !== 'summary') setExitOpen(true);
    else onBack();
  }, [bottom, hasConversation, messages.length, onBack]);
  React.useEffect(() => {
    if (!hasConversation || bottom === 'summary') {
      console.log(`[DLG-EXIT] backhandler:disarmed hasConversation=${hasConversation} bottom=${String(bottom)} — системная «назад» выходит сразу, окна подтверждения не будет`);
      return undefined;
    }
    console.log(`[DLG-EXIT] backhandler:armed messages=${messages.length} bottom=${String(bottom)} — «назад» откроет «Выйти из диалога?»`);
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('[DLG-EXIT] backhandler:press → exit_sheet');
      setExitOpen(true);
      return true;
    });
    return () => sub.remove();
  }, [bottom, hasConversation, messages.length]);

  // зачем (аудит Optimistic UI, координатор 25.10): тап по подсказке — фраза в поле, фокус в поле, курсор в конце (общий хук с экраном свободного разговора)
  const hintInput = useDialogSayHintInput(onChangeDraft);
  const openGoals = React.useCallback(() => setGoalsOpen(true), []);
  const openHint = React.useCallback(() => setHintOpen(true), []);
  // зачем (жалоба тестера 24.10 «встречный вопрос появляется на секунду и исчезает»; координатор: логи остаются в релизе): [DIALOG-VANISH] —
  // что в ленте, сколько ей места, у конца ли она и когда её докручиваем. Текст реплик не пишем — только id, автор, длина.
  // зачем (скрин тестера: между карточкой цели и строкой ввода ленты не видно): пока человек печатает, карточка цели свёрнута —
  // на небольшом экране шапка + цель + ввод с подсказками + клавиатура съедали всю высоту ленты. Цель остаётся в «Задания».
  // Ревью 2 · ДИЗАЙН 25.10: сворачиваем по фокусу поля (раньше keyboardDidShow на Android — второй скачок), плавно (220 мс);
  // клавиатура — запасной путь (закрыли «назад», а фокус остался).
  const [goalFolded, setGoalFolded] = React.useState(false);
  const goalFoldedRef = React.useRef(false);
  // зачем (решение координатора 25.10): «свёрнуто» не пусто — если ленте остаётся ≥ 220 dp, тонкая плашка цели в одну строку.
  const [goalStripFits, setGoalStripFits] = React.useState(false);
  const goalStripFitsRef = React.useRef(false);
  const goalShown = !!(goal && coachingLabels && bottom === 'input' && !goalFolded);
  const goalStripShown = !!(goal && coachingLabels && bottom === 'input' && goalFolded && goalStripFits);
  const vanishPrevRef = React.useRef<{ count: number; lastId: string | null }>({ count: 0, lastId: null });
  const vanishLayoutRef = React.useRef({ header: 0, list: 0, content: 0, keyboard: 0, scrollY: 0 });
  const setGoalFold = React.useCallback((folded: boolean, trigger: 'focus' | 'blur' | 'keyboard') => {
    if (goalFoldedRef.current === folded) return; // guard-ok: карточка уже в этом состоянии (фокус и клавиатура приходят парой)
    goalFoldedRef.current = folded;
    goalStripFitsRef.current = false; // плашку решает следующая раскладка ленты
    animateNextLayoutTransition();
    setGoalStripFits(false);
    setGoalFolded(folded);
    console.log('[DIALOG-GOAL] fold', JSON.stringify({ folded, trigger, list: vanishLayoutRef.current.list, strip: false }));
  }, []);
  const atEndRef = React.useRef(true);
  const scrollToEnd = React.useCallback((_width?: number, height?: number) => {
    if (typeof height === 'number') {
      vanishLayoutRef.current = { ...vanishLayoutRef.current, content: Math.round(height) };
      console.log('[DIALOG-VANISH] content', JSON.stringify({ height: Math.round(height), layout: vanishLayoutRef.current }));
    }
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);
  React.useEffect(() => {
    const last = messages[messages.length - 1];
    const prev = vanishPrevRef.current;
    const lastId = last?.id ?? null;
    if (messages.length === prev.count && lastId === prev.lastId) return; // guard-ok: лента не менялась — писать нечего
    const change = messages.length < prev.count ? 'shrunk'
      : lastId !== prev.lastId ? (messages.length > prev.count ? 'appended' : 'replaced_last') : 'same_last';
    console.log('[DIALOG-VANISH] messages', JSON.stringify({
      count: messages.length, prevCount: prev.count, lastId, lastAuthor: last?.author ?? null,
      lastLen: typeof last?.text === 'string' ? last.text.length : null, change, bottom: String(bottom), goalShown, sending,
      atEnd: atEndRef.current, layout: vanishLayoutRef.current,
    }));
    vanishPrevRef.current = { count: messages.length, lastId };
  }, [bottom, goalShown, messages, sending]);
  const onVanishHeaderLayout = React.useCallback((event: LayoutChangeEvent) => {
    const height = Math.round(event.nativeEvent.layout.height);
    if (height === vanishLayoutRef.current.header) return; // guard-ok: высота шапки прежняя
    vanishLayoutRef.current = { ...vanishLayoutRef.current, header: height };
    console.log('[DIALOG-VANISH] header', JSON.stringify({ height, goalShown, goalFolded, goalStripShown, layout: vanishLayoutRef.current }));
  }, [goalFolded, goalShown, goalStripShown]);
  // зачем: окно ленты сжалось или выросло (карточка цели, строка ввода с подсказками, клавиатура) — содержимое не менялось, и
  // onContentSizeChange молчит. Был у конца — докручиваем без анимации; листал историю вверх — не дёргаем.
  const onListLayout = React.useCallback((event: LayoutChangeEvent) => {
    const height = Math.round(event.nativeEvent.layout.height);
    const prevViewport = vanishLayoutRef.current.list;
    const decision = dialogListViewportDecision({ prevViewport, viewport: height, wasAtEnd: atEndRef.current });
    if (decision === 'same_height') return; // guard-ok: высота окна ленты прежняя
    vanishLayoutRef.current = { ...vanishLayoutRef.current, list: height };
    console.log('[DIALOG-VANISH] list', JSON.stringify({ height, prevViewport, decision, count: messages.length, layout: vanishLayoutRef.current }));
    if (decision === 'stick_to_end') scrollRef.current?.scrollToEnd({ animated: false });
    if (!goalFoldedRef.current) return; // guard-ok: карточка развёрнута — плашка не нужна
    const fits = dialogGoalStripFits({ listHeight: height, stripShown: goalStripFitsRef.current });
    if (fits === goalStripFitsRef.current) return; // guard-ok: решение о плашке прежнее
    goalStripFitsRef.current = fits;
    setGoalStripFits(fits);
    console.log('[DIALOG-GOAL] strip', JSON.stringify({ shown: fits, list: height, minList: DIALOG_GOAL_STRIP_MIN_LIST }));
  }, [messages.length]);
  const onListScroll = React.useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const state = { offsetY: Math.round(contentOffset.y), viewport: Math.round(layoutMeasurement.height), content: Math.round(contentSize.height) };
    vanishLayoutRef.current = { ...vanishLayoutRef.current, scrollY: state.offsetY };
    const atEnd = isDialogListAtEnd(state);
    if (atEnd === atEndRef.current) return; // guard-ok: пишем только смену «у конца / листает вверх»
    atEndRef.current = atEnd;
    console.log('[DIALOG-VANISH] scroll', JSON.stringify({ atEnd, ...state }));
  }, []);

  // зачем (координатор 12.10, «сперва логи», Сверка dialogs-030/031): где стоит строка ввода после отправки — [DLG-INPUT-LAYOUT] (высота клавиатуры, зазор до низа окна, нижний отступ безопасной зоны).
  const inputInsets = useStableSafeAreaInsets();
  const inputTrace = useDialogInputLayoutTrace({ sending, bottomMode: String(bottom), insetBottom: inputInsets.bottom });

  // зачем (сверка dialogs-030/-016, 🔴 «после отправки клавиатура скрыта, а поле ввода осталось приподнятым — пустая полоса ~150px»):
  // на Android при windowSoftInputMode=adjustResize режим height у KeyboardAvoidingView удваивает сдвиг и после скрытия клавиатуры не возвращает высоту.
  // Режим padding возвращает нижний отступ в 0 сам. Сперва логи: высота клавиатуры при показе/скрытии печатается в [DIALOGUE-KEYBOARD].
  React.useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (event) => {
      console.log('[DIALOGUE-KEYBOARD] show', JSON.stringify({ height: Math.round(event.endCoordinates?.height ?? 0), os: Platform.OS }));
      // зачем (R1 dialogs-038, Ядро 12.10: «при открытой клавиатуре лента не прокручивается к последней реплике»): лента прокручивалась только при росте содержимого (onContentSizeChange), а клавиатура
      // не меняет содержимое — сжимается видимая область, и свежая реплика оставалась под полем ввода. На показ клавиатуры докручиваем к концу после того, как область сжалась (iOS шлёт Will* до сжатия).
      const settleMs = Platform.OS === 'ios' ? 120 : 0;
      setTimeout(() => {
        console.log('[DIALOGUE-KEYBOARD] scroll_to_end after show', JSON.stringify({ settleMs })); // guard-ok: ветка решает значение
        scrollRef.current?.scrollToEnd({ animated: true });
      }, settleMs);
      vanishLayoutRef.current = { ...vanishLayoutRef.current, keyboard: Math.round(event.endCoordinates?.height ?? 0) };
      console.log('[DIALOG-VANISH] keyboard:show', JSON.stringify({ layout: vanishLayoutRef.current }));
      setGoalFold(true, 'keyboard');
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      console.log('[DIALOGUE-KEYBOARD] hide', JSON.stringify({ os: Platform.OS }));
      vanishLayoutRef.current = { ...vanishLayoutRef.current, keyboard: 0 };
      console.log('[DIALOG-VANISH] keyboard:hide', JSON.stringify({ layout: vanishLayoutRef.current }));
      setGoalFold(false, 'keyboard');
    });
    return () => { show.remove(); hide.remove(); };
  }, [setGoalFold]);

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={0}
      style={{ flex: 1, backgroundColor: glass.bg }}
      testID="dialogue-v2-session-screen"
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* зачем (закон владельца 22.10 «назад/✕ в одном месте»): общая кнопка первым ребёнком под безопасным верхом; в шапке — её место */}
        <SafeTopBackButton screen="dialogue_v2_session" accessibilityLabel={labels.back} onPress={requestBack} />
        <View
          testID="dialogue-v2-session-header"
          onLayout={onVanishHeaderLayout}
          style={{ paddingHorizontal: 14, paddingTop: 2, paddingBottom: 12, backgroundColor: glass.bg }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ScreenBackSlot />
            <View style={{ flex: 1, minWidth: 0, marginLeft: 4 }}>
              {/* зачем (разбор зон 13.10, dialogs-013 / dialogs-036 / dialogs-gap-016; образец dialogs.html `.dh .ti { white-space: nowrap; text-overflow: ellipsis }`): название сцены — одна строка с «…», а не перенос на две; полное название читает озвучка (header) и показывает брифинг */}
              <Text accessibilityRole="header" numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.3} style={{ color: glass.text, fontSize: 20, lineHeight: 24, fontWeight: '700', letterSpacing: -0.2 }}>
                {title}
              </Text>
              {/* зачем (эмулятор 02.10): энергия и плашка лимита стояли в строке заголовка и
                  сжимали его до ~150 dp — «Поздоровать/ься» рвалось посреди слова. Теперь они
                  во второй строке, рядом с настроением, а заголовок занимает всю ширину. */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <View
                  testID="dialogue-v2-session-mood"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1, flexGrow: 1 }}
                  accessible
                  accessibilityLabel={headerMood?.label ?? labels.subtitle}
                >
                  {headerMood ? <DialogueGlassMoodFace mood={headerMood.mood} color={glass.secondary} /> : null}
                  {/* зачем (dialogs-023, Макеты 12.10): «Насторожён» рвалось на «Настороже / н» — рядом энергия и плашка лимита, места на слово не хватало. Макет: `.dmood` — white-space: nowrap;
                      одна строка, без переноса посреди слова и без сжатия шрифта; целиком подпись читает озвучка (accessibilityLabel выше). */}
                  <Text numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.3} style={{ flexShrink: 1, color: glass.secondary, fontSize: 16, lineHeight: 21 }}>
                    {headerMood?.label ?? labels.subtitle}
                  </Text>
                </View>
                {showEnergy ? <EnergyBar glass solidBolt /> : null}
                {quotaPill ? (
                  <DialogueGlassQuotaPill
                    glass={glass}
                    testID="dialogue-v2-session-quota"
                    text={quotaPill.text}
                    accessibilityLabel={quotaPill.accessibilityLabel}
                  />
                ) : null}
              </View>
            </View>
            <DialogueGlassSquareButton
              glass={glass}
              testID="dialogue-v2-session-more"
              accessibilityLabel={labels.more}
              onPress={() => setMenuOpen(true)}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={glass.text} />
            </DialogueGlassSquareButton>
          </View>
          {goalShown && goal && coachingLabels ? (
            <DialogueGlassGoalCard
              glass={glass}
              testID="dialogue-v2-session-goal"
              kicker={goal.kicker}
              label={goal.label}
              hintLabel={coachingLabels.hint}
              onOpen={openGoals}
              onHint={hintText ? openHint : undefined}
            />
          ) : null}
          {goalStripShown && goal ? (
            <Pressable
              testID="dialogue-v2-session-goal-strip"
              onPress={openGoals}
              accessibilityRole="button"
              accessibilityLabel={`${goal.kicker}. ${goal.label}`}
              style={{ marginTop: DIALOG_GOAL_STRIP_GAP, height: DIALOG_GOAL_STRIP_HEIGHT, borderRadius: DIALOG_GOAL_STRIP_HEIGHT / 2, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: glassTone(glass.text, 0.06) }}
            >
              <Ionicons name="flag-outline" size={14} color={glass.secondary} />
              <Text numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.2} style={{ flex: 1, fontSize: 13, lineHeight: 17, color: glass.text }}>
                {`${goal.kicker} · ${goal.label}`}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          // зачем (жалоба владельца 25.10 «нельзя смахнуть клавиатуру вниз»): смахивание ленты прячет клавиатуру (iOS — вслед за пальцем)
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onScrollBeginDrag={() => markKeyboardCause('drag')}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd} decelerationRate="fast"
          onLayout={onListLayout}
          onScroll={onListScroll}
          scrollEventThrottle={64}
        >
          {/* зачем (C24): после финальной реплики тап по ленте ведёт к итогу. */}
          {/* зачем (жалоба владельца 25.10): до конца диалога этот слой забирал тапы, и тап мимо поля клавиатуру не прятал — теперь прячет */}
          {/* guard-ok: лента ограничена потолком хода сессии на сервере (≤ 64 хода), виртуализация не нужна. */}
          <Pressable
            onPress={() => {
              if (bottom === 'ended' && onOpenSummary) { onOpenSummary(); return; }
              markKeyboardCause('tap');
              Keyboard.dismiss();
            }}
            accessible={false} // guard-ok: слой-тап без своей роли; доступный путь — надпись вуали ниже
            accessibilityState={{ disabled: bottom !== 'ended' }}
          >
            {messages.map((message) => {
              const learner = message.author === 'learner';
              const author = learner ? 'learner' : 'persona';
              const ink = dialogueGlassBubbleInk(glass, author);
              const botVoicePlaying = playingPreparedBotVoiceMessageId === message.id;
              // зачем: внутри колбэка onPress сужение message.voice теряется — берём uri заранее.
              const voiceUri = message.voice?.uri;
              const translated = !learner && !!message.translation && translatedIds.has(message.id);
              const personaActions = !learner && coachingLabels ? (
                <>
                  {message.preparedBotVoice ? (
                    <PressableScale
                      onPress={() => onPlayPreparedBotVoice(message.id)}
                      variant="flat"
                      accessibilityRole="button"
                      accessibilityLabel={voiceCopy.action}
                      accessibilityState={{ selected: botVoicePlaying }}
                      hitSlop={4}
                      testID={`dialogue-v2-prepared-bot-voice-${message.id}`}
                      style={dialogueGlassActionStyle(glass, botVoicePlaying)}
                    >
                      <Ionicons name={botVoicePlaying ? 'pause' : 'volume-medium-outline'} size={18} color={botVoicePlaying ? glass.ctaInk : glass.text} />
                    </PressableScale>
                  ) : null}
                  {message.translation && onToggleTranslation ? (
                    <DialogueGlassReplyAction
                      glass={glass}
                      testID={`dialogue-v2-translate-${message.id}`}
                      icon="language-outline"
                      label={translated ? coachingLabels.hideTranslation : coachingLabels.translate}
                      active={translated}
                      onPress={() => onToggleTranslation(message.id)}
                    />
                  ) : null}
                  {message.explanation && onOpenWhy ? (
                    <DialogueGlassReplyAction
                      glass={glass}
                      testID={`dialogue-v2-why-${message.id}`}
                      icon="bulb-outline"
                      label={coachingLabels.why}
                      onPress={() => onOpenWhy(message.id)}
                    />
                  ) : null}
                </>
              ) : message.preparedBotVoice ? (
                <PressableScale
                  onPress={() => onPlayPreparedBotVoice(message.id)}
                  variant="flat"
                  accessibilityRole="button"
                  accessibilityLabel={voiceCopy.action}
                  accessibilityState={{ selected: botVoicePlaying }}
                  hitSlop={4}
                  testID={`dialogue-v2-prepared-bot-voice-${message.id}`}
                  style={dialogueGlassActionStyle(glass, botVoicePlaying)}
                >
                  <Ionicons name={botVoicePlaying ? 'pause' : 'volume-medium-outline'} size={18} color={botVoicePlaying ? glass.ctaInk : glass.text} />
                </PressableScale>
              ) : undefined;
              const learnerActions = learner && message.betterPhrasing && coachingLabels && onOpenFix ? (
                <DialogueGlassBetterPhrasing
                  glass={glass}
                  testID={`dialogue-v2-better-${message.id}`}
                  label={coachingLabels.better}
                  phrasing={message.betterPhrasing}
                  open={fixOpenIds.has(message.id)}
                  onOpen={() => onOpenFix(message.id)}
                />
              ) : undefined;
              const hasPersonaActions = !learner && (!!message.preparedBotVoice
                || (!!coachingLabels && (!!message.translation || !!message.explanation)));
              return (
                <DialogueGlassBubble
                  key={message.id}
                  glass={glass}
                  author={author}
                  avatar={!learner}
                  avatarIcon={personaIcon}
                  who={learner ? labels.you : message.authorLabel}
                  actions={learner ? learnerActions : hasPersonaActions ? personaActions : undefined}
                  note={learner && message.unsent && coachingLabels ? coachingLabels.unsent : undefined}
                  testID={`dialogue-v2-message-${message.id}`}
                >
                  {voiceUri ? (
                    <PressableScale
                      onPress={() => onPlayVoice(voiceUri)}
                      variant="flat"
                      accessibilityRole="button"
                      accessibilityLabel={voiceCopy.action}
                      testID={`dialogue-v2-voice-message-${message.id}`}
                      style={{ minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    >
                      {/* зачем (Макеты dialogs-gap-014, образец .dg-vm .pl): ▶ голосового сообщения стоит в круге 30 с тёмной подложкой 14 %, а не голым значком; цвет круга — от чернил пузыря (в светлой теме не пропадает) */}
                      <View testID={`dialogue-v2-voice-message-disc-${message.id}`} style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: glassTone(ink, 0.14) }}>
                        <Ionicons name={playingVoiceUri === voiceUri ? 'pause' : 'play'} size={16} color={ink} />
                      </View>
                      <DialogueGlassBubbleText glass={glass} author={author}>{voiceCopy.label}</DialogueGlassBubbleText>
                    </PressableScale>
                  ) : translated ? (
                    <Text
                      testID={`dialogue-v2-translation-${message.id}`}
                      maxFontSizeMultiplier={1.5}
                      style={{ fontSize: 16, lineHeight: 22, fontStyle: 'italic', fontWeight: '400', color: glass.secondary }}
                    >
                      {message.translation}
                    </Text>
                  ) : (
                    <DialogueGlassBubbleText glass={glass} author={author}>{message.text}</DialogueGlassBubbleText>
                  )}
                </DialogueGlassBubble>
              );
            })}
            {sending ? <DialogueGlassTyping glass={glass} avatar avatarIcon={personaIcon} testID="dialogue-v2-session-typing" caption={typingCaption} /> : null}
            {turnError && !sending ? (
              <DialogueGlassSysError
                glass={glass}
                testID="dialogue-v2-session-turn-error"
                message={turnErrorMessage ?? labels.turnError}
                retryLabel={retryAvailable ? labels.retry : undefined}
                onRetry={retryAvailable ? onRetry : undefined}
                retryDisabled={retryDisabled}
              />
            ) : null}
          </Pressable>
        </ScrollView>

        {bottom === 'wall' && coachingLabels && onOpenSummary && onOpenPlus ? (
          <DialogueGlassLimitWall
            glass={glass}
            testID="dialogue-v2-session-limit-wall"
            title={coachingLabels.wallTitle}
            message={limitWallMessage ?? coachingLabels.wallTitle}
            secondaryLabel={coachingLabels.wallReview}
            onSecondary={onOpenSummary}
            primaryLabel={coachingLabels.wallPlus}
            onPrimary={onOpenPlus}
          />
        ) : null}
        {bottom === 'ended' && coachingLabels && onOpenSummary ? (
          <DialogueGlassEndVeil glass={glass} testID="dialogue-v2-session-end-veil" text={coachingLabels.endVeil} onPress={onOpenSummary} />
        ) : null}
        {bottom === 'summary' && coachingLabels && onOpenSummary ? (
          <DialogueGlassSummaryPill glass={glass} testID="dialogue-v2-session-summary-pill" label={coachingLabels.summary} onPress={onOpenSummary} />
        ) : null}
        {bottom === 'input' ? (
          <View ref={inputTrace.barRef} collapsable={false} onLayout={inputTrace.onBarLayout} style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8, backgroundColor: glass.bg }}>
            {/* зачем (владелец 24.10 через координатора): «Можно сказать…» всегда над полем; тап кладёт фразу в черновик, отправляет человек сам */}
            <DialogSayHints lang={interfaceLang} hints={sayHints} onUse={hintInput.onUse} disabled={voiceBusy || inputLocked} compact={goalFolded} testID="dialogue-v2-session-say-hints" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable
                onPressIn={onStartVoice}
                onPressOut={onStopVoice}
                disabled={sending} // guard-ok: accessibilityState ниже
                accessibilityRole="button"
                accessibilityLabel={`${voiceUnavailable && voiceFailure ? voiceFailure.text : voiceBusy ? labels.voiceRecording : labels.voiceIdle}${micPlusBadge ? ', Plus' : ''}`}
                accessibilityState={{ disabled: sending || voiceUnavailable, selected: voiceBusy }}
                testID="dialogue-v2-voice-input"
                style={[dialogueGlassRoundButtonStyle(glass, voiceStatus === 'recording'), { opacity: sending || voiceUnavailable ? 0.55 : 1 }]}
              >
                {voiceStatus === 'starting' ? (
                  <ActivityIndicator color={glass.text} />
                ) : (
                  <Ionicons name={voiceUnavailable ? 'mic-off-outline' : 'mic-outline'} size={24} color={voiceStatus === 'recording' ? glass.ctaInk : glass.text} />
                )}
                {/* зачем (владелец 15.10, D196; эталон dialogs.html блок H, .rbtn 52): вместо значка «PLUS» по старому состоянию — цифра остатка общего дневного счётчика (пилюля 22, цифра 13), на нуле «PLUS» внутри неё, у Plus цифры нет */}
                <MicAllowanceBadge size="sm" testID="dialogue-v2-voice-allowance" />
              </Pressable>
              <TextInput
                ref={hintInput.inputRef}
                selection={hintInput.selection}
                value={draft}
                onChangeText={hintInput.onChangeText}
                // зачем (координатор 18.10, К1): пока ждём ответ (до 13 с), следующую реплику можно набирать — блокируются только «отправить»,
                // микрофон и «Завершить». Набранное не трогается ни ответом, ни ошибкой; двойную отправку держит send() (sending / turnStartingRef).
                editable={!voiceBusy && !inputLocked}
                placeholder={labels.placeholder}
                placeholderTextColor={glass.mutedText}
                // зачем (ревью 2 · ДИЗАЙН 25.10): карточка цели уходит из дерева вместе с фокусом скринридера — цель читается с полем
                accessibilityLabel={goal ? `${labels.placeholder}. ${goal.kicker}: ${goal.label}` : labels.placeholder}
                onFocus={() => setGoalFold(true, 'focus')}
                onBlur={() => setGoalFold(false, 'blur')}
                // зачем: уход фокуса снимает управляемое выделение подсказки (onBlur выше занят сворачиванием карточки цели — его строка закреплена тестом)
                onEndEditing={hintInput.onBlur}
                testID="dialogue-v2-session-input" // зачем (робот съёмки, 12.10): поле нужно находить не по языковой подписи
                maxFontSizeMultiplier={1.4}
                multiline
                // зачем (Сверка dialogs-022): клавиша ввода — «Отправить», а не перенос строки; Enter отправляет реплику
                // только когда отправить можно (тот же canSend, что у кнопки ↑), иначе ничего не делает.
                returnKeyType="send"
                submitBehavior="submit"
                onSubmitEditing={() => { if (!sending && canSend) onSend(); }}
                // зачем (R1_DIFF_ONE_FIX, dialogs-gap-012): на потолке Plus поле приглушено и закрыто (в образце приглушённое), а не выглядит обычным и активным
                style={[dialogueGlassFieldStyle(glass), { color: glass.text, fontSize: 16 }, inputLocked && { opacity: 0.55 }]}
              />
              {voiceDraft ? (
                <PressableScale
                  onPress={onDiscardVoice}
                  disabled={sending || voiceBusy}
                  variant="flat"
                  accessibilityRole="button"
                  accessibilityLabel={labels.discardVoice}
                  accessibilityState={{ disabled: sending || voiceBusy }}
                  style={[dialogueGlassRoundButtonStyle(glass, false), { opacity: sending || voiceBusy ? 0.55 : 1 }]}
                >
                  <Ionicons name="trash-outline" size={20} color={glass.text} />
                </PressableScale>
              ) : null}
              <PressableScale
                onPress={onSend}
                disabled={sending || !canSend}
                variant="flat"
                accessibilityRole="button"
                accessibilityLabel={labels.send}
                accessibilityState={{ disabled: sending || !canSend }}
                testID="dialogue-v2-session-send" // зачем (робот съёмки, 12.10): кнопка «Отправить» без привязки к языку интерфейса
                style={dialogueGlassRoundButtonStyle(glass, !sending && canSend)}
              >
                <Ionicons name="arrow-up" size={24} color={!sending && canSend ? glass.ctaInk : glass.mutedText} />
              </PressableScale>
            </View>
            <View style={{ marginTop: 12, minHeight: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
              <Text
                testID="dialogue-v2-session-voice-hint"
                maxFontSizeMultiplier={1.3}
                style={{ textAlign: 'center', fontSize: 16, lineHeight: 21, fontWeight: '700', color: voiceBusy ? glass.text : glass.secondary, flexShrink: 1 }}
              >
                {voiceHint}
              </Text>
              {!voiceBusy && voiceFailure?.actionLabel && voiceFailure.onAction ? (
                <Pressable
                  testID="dialogue-v2-session-voice-action"
                  onPress={voiceFailure.onAction}
                  accessibilityRole="button"
                  accessibilityLabel={voiceFailure.actionLabel}
                  hitSlop={10}
                >
                  <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 16, lineHeight: 21, fontWeight: '700', color: glass.text }}>
                    {voiceFailure.actionLabel}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </SafeAreaView>

      <DialogueGlassMenuSheet
        glass={glass}
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={labels.more}
        closeLabel={labels.close}
        completeLabel={labels.complete}
        completeDisabled={completeDisabled}
        onComplete={onComplete}
        tasksLabel={goalRows.length > 0 ? labels.tasks : undefined}
        onOpenTasks={goalRows.length > 0 ? openGoals : undefined}
      />
      <DialogGoalsSheet
        visible={goalsOpen}
        onClose={() => setGoalsOpen(false)}
        lang={interfaceLang}
        objectives={goalRows}
        objectivesMet={noGoalsMet}
        showStatus={false}
        testID="dialogue-v2-session-goals"
      />
      {hintText ? (
        <DialogHintModal
          visible={hintOpen}
          onClose={() => setHintOpen(false)}
          lang={interfaceLang}
          hint={hintText}
          testID="dialogue-v2-session-hint"
        />
      ) : null}
      {whyTarget && coachingLabels && onCloseWhy ? (
        <DialogWhySheet
          visible
          onClose={onCloseWhy}
          lang={interfaceLang}
          quote={whyTarget.quote}
          coach={{ note: whyTarget.note, translation: whyTarget.translation, suggestions: [], userFix: null }}
          plusGate={whyTarget.plusGate ? {
            revealed: whyTarget.plusGate.revealed,
            freeLeft: whyTarget.plusGate.freeLeft,
            freePerDay: whyTarget.plusGate.freePerDay,
            exhaustedText: coachingLabels.whyExhausted,
            openPlusLabel: coachingLabels.openPlus,
            onOpenPlus: () => { onCloseWhy(); onOpenPlus?.(); },
          } : null}
          testID="dialogue-v2-session-why"
        />
      ) : null}
      <DialogueGlassExitSheet
        glass={glass}
        visible={exitOpen}
        title={labels.exitTitle}
        message={labels.exitMessage}
        stayLabel={labels.exitStay}
        leaveLabel={labels.exitLeave}
        onStay={() => setExitOpen(false)}
        onLeave={() => { setExitOpen(false); onBack(); }}
        testIDPrefix="dialogue-v2-session-exit"
      />
    </KeyboardAvoidingView>
  );
}

export default DialogueV2SessionScreen;
