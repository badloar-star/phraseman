import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '../feedback/PressableScale';
import { describeDialogueVoiceMessage } from '../../app/dialogue_voice_message';
import type { DialogueVoiceDraft } from '../../app/dialogue_voice_message';
import type { DialogueV2VoiceStatus } from '../../hooks/use_dialogue_v2_voice_message';
import type { Lang } from '../../constants/i18n';
import {
  DialogueGlassBackButton,
  DialogueGlassSquareButton,
  DialogueGlassSysError,
  useDialogueGlass,
} from './glass/DialogueGlassKit';
import {
  DialogueGlassBubble,
  DialogueGlassBubbleText,
  DialogueGlassTyping,
  dialogueGlassActionStyle,
  dialogueGlassBubbleInk,
  dialogueGlassFieldStyle,
  dialogueGlassRoundButtonStyle,
} from './glass/DialogueGlassChat';
import { DialogueGlassMenuSheet } from './glass/DialogueGlassMenuSheet';
import DialogGoalsSheet from './DialogGoalsSheet';
import ThemedConfirmModal from '../ThemedConfirmModal';

// зачем (владелец 2026-09-30): сессия V2 «1 в 1» по макету dialogs.html C1–C18 (Liquid Glass):
// шапка `.dh` (круглая «‹», название сцены + «Диалог», квадратная «⋯» со шторкой «Завершить»),
// реплики с мини-аватаром и подписью, светлый пузырь «Вы», живые точки «печатает», системная
// плашка ошибки с «Повторить» прямо в ленте и строка ввода «микрофон · поле · ↑» с подсказкой
// состояния голоса. Плюс (C6, C23): шторка «Задания» (список из брифинга, БЕЗ статусов — сервер
// V2 не сообщает, что закрыто) и подтверждение выхода. Настроения, «Цель N из 5», квоты и
// энергии в ответах V2 нет — их не рисуем (см. чек-лист dialogs.html).

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
  }>
);

export type DialogueV2SessionLabels = Readonly<{
  back: string;
  placeholder: string;
  send: string;
  complete: string;
  /** Короткая подпись под названием сцены (`.dh .su`). */
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
  /** Задания сцены из брифинга (только подписи; статусов выполнения в V2 нет). */
  objectives: readonly Readonly<{ id: string; label: string }>[];
  /** Последний ход не дошёл: плашка «Повторить» в ленте (C18), разговор остаётся на экране. */
  turnError: boolean;
  retryDisabled: boolean;
  onRetry: () => void;
  onBack: () => void;
  onChangeDraft: (value: string) => void;
  onSend: () => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onDiscardVoice: () => void;
  onPlayVoice: (uri: string) => void;
  onPlayPreparedBotVoice: (messageId: string) => void;
  onComplete: () => void;
}>;

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
  objectives,
  turnError,
  retryDisabled,
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
  const [exitOpen, setExitOpen] = React.useState(false);
  const voiceBusy = voiceStatus !== 'idle';
  // зачем: пока висит плашка ошибки, путь один — «Повторить» (раньше экран целиком
  // заменялся плашкой, и новое сообщение отправить было нельзя; поведение то же).
  const canSend = draft.trim().length > 0 && !voiceBusy && !turnError;
  const completeDisabled = sending || voiceBusy || messages.length === 0;
  const voiceHint = voiceStatus === 'recording'
    ? labels.voiceRecording
    : voiceStatus === 'starting' ? labels.voiceStarting : labels.voiceIdle;
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
    if (hasConversation) setExitOpen(true);
    else onBack();
  }, [hasConversation, onBack]);
  React.useEffect(() => {
    if (!hasConversation) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setExitOpen(true);
      return true;
    });
    return () => sub.remove();
  }, [hasConversation]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
      style={{ flex: 1, backgroundColor: glass.bg }}
      testID="dialogue-v2-session-screen"
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View
          testID="dialogue-v2-session-header"
          style={{ paddingHorizontal: 14, paddingTop: 2, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: glass.bg }}
        >
          <DialogueGlassBackButton glass={glass} onPress={requestBack} accessibilityLabel={labels.back} />
          <View style={{ flex: 1, minWidth: 0, marginLeft: 4 }}>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={{ color: glass.text, fontSize: 20, lineHeight: 24, fontWeight: '700', letterSpacing: -0.2 }}>
              {title}
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={{ color: glass.secondary, fontSize: 15, lineHeight: 19, marginTop: 2 }}>
              {labels.subtitle}
            </Text>
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

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => {
            const learner = message.author === 'learner';
            const author = learner ? 'learner' : 'persona';
            const ink = dialogueGlassBubbleInk(glass, author);
            const botVoicePlaying = playingPreparedBotVoiceMessageId === message.id;
            // зачем: внутри колбэка onPress сужение message.voice теряется — берём uri заранее.
            const voiceUri = message.voice?.uri;
            return (
              <DialogueGlassBubble
                key={message.id}
                glass={glass}
                author={author}
                avatar={!learner}
                who={learner ? labels.you : message.authorLabel}
                actions={message.preparedBotVoice ? (
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
                ) : undefined}
              >
                {voiceUri ? (
                  <PressableScale
                    onPress={() => onPlayVoice(voiceUri)}
                    variant="flat"
                    accessibilityRole="button"
                    accessibilityLabel={voiceCopy.action}
                    testID={`dialogue-v2-voice-message-${message.id}`}
                    style={{ minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  >
                    <Ionicons name={playingVoiceUri === voiceUri ? 'pause' : 'play'} size={18} color={ink} />
                    <DialogueGlassBubbleText glass={glass} author={author}>{voiceCopy.label}</DialogueGlassBubbleText>
                  </PressableScale>
                ) : (
                  <DialogueGlassBubbleText glass={glass} author={author}>{message.text}</DialogueGlassBubbleText>
                )}
              </DialogueGlassBubble>
            );
          })}
          {sending ? <DialogueGlassTyping glass={glass} avatar testID="dialogue-v2-session-typing" /> : null}
          {turnError && !sending ? (
            <DialogueGlassSysError
              glass={glass}
              testID="dialogue-v2-session-turn-error"
              message={labels.turnError}
              retryLabel={labels.retry}
              onRetry={onRetry}
              retryDisabled={retryDisabled}
            />
          ) : null}
        </ScrollView>

        <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8, backgroundColor: glass.bg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPressIn={onStartVoice}
              onPressOut={onStopVoice}
              disabled={sending}
              accessibilityRole="button"
              accessibilityLabel={voiceBusy ? labels.voiceRecording : labels.voiceIdle}
              accessibilityState={{ disabled: sending, selected: voiceBusy }}
              testID="dialogue-v2-voice-input"
              style={[dialogueGlassRoundButtonStyle(glass, voiceStatus === 'recording'), { opacity: sending ? 0.55 : 1 }]}
            >
              {voiceStatus === 'starting' ? (
                <ActivityIndicator color={glass.text} />
              ) : (
                <Ionicons name="mic-outline" size={24} color={voiceStatus === 'recording' ? glass.ctaInk : glass.text} />
              )}
            </Pressable>
            <TextInput
              value={draft}
              onChangeText={onChangeDraft}
              editable={!sending && !voiceBusy}
              placeholder={labels.placeholder}
              placeholderTextColor={glass.mutedText}
              accessibilityLabel={labels.placeholder}
              maxFontSizeMultiplier={1.4}
              style={[dialogueGlassFieldStyle(glass), { color: glass.text, fontSize: 16 }]}
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
              style={dialogueGlassRoundButtonStyle(glass, !sending && canSend)}
            >
              <Ionicons name="arrow-up" size={24} color={!sending && canSend ? glass.ctaInk : glass.mutedText} />
            </PressableScale>
          </View>
          <Text
            testID="dialogue-v2-session-voice-hint"
            maxFontSizeMultiplier={1.3}
            style={{ marginTop: 12, minHeight: 20, textAlign: 'center', fontSize: 15, lineHeight: 20, fontWeight: '600', color: voiceBusy ? glass.text : glass.secondary }}
          >
            {voiceHint}
          </Text>
        </View>
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
        onOpenTasks={goalRows.length > 0 ? () => setGoalsOpen(true) : undefined}
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
      <ThemedConfirmModal
        visible={exitOpen}
        title={labels.exitTitle}
        message={labels.exitMessage}
        cancelLabel={labels.exitStay}
        confirmLabel={labels.exitLeave}
        onCancel={() => setExitOpen(false)}
        onConfirm={() => { setExitOpen(false); onBack(); }}
        confirmVariant="accent"
        testIDPrefix="dialogue-v2-session-exit"
      />
    </KeyboardAvoidingView>
  );
}

export default DialogueV2SessionScreen;
