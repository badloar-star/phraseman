import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '../feedback/PressableScale';
import MicAllowanceBadge from '../MicAllowanceBadge';
import { describeDialogueVoiceMessage, type DialogueVoiceDraft } from '../../app/dialogue_voice_message';
import type { DialogueV2VoiceStatus } from '../../hooks/use_dialogue_v2_voice_message';
import type { Lang } from '../../constants/i18n';
import { DialogueGlassBackButton, DialogueGlassSysError, dialogueGlassCardStyle, useDialogueGlass } from './glass/DialogueGlassKit';
import {
  DialogueGlassBubble,
  DialogueGlassBubbleText,
  DialogueGlassTyping,
  dialogueGlassBubbleInk,
  dialogueGlassFieldStyle,
  dialogueGlassRoundButtonStyle,
} from './glass/DialogueGlassChat';

// зачем (владелец 2026-09-30): «Свободный разговор» «1 в 1» по макету dialogs.html F1/F2
// (Liquid Glass): шапка с круглой «‹» и названием, пустое состояние — карточка «Что можно
// спросить» с лампочкой, ответы — стеклянный пузырь без аватара, свои — светлый пузырь,
// строка ввода «поле · ↑». Микрофон сохранён: голосовой ввод — живая функция этого экрана.

export type DialogueV2FreeformMessage = Readonly<{
  id: string;
  author: 'learner' | 'assistant';
  text: string;
  /** Replay-only local learner attachment. Its transcript never leaves the route. */
  voice?: Readonly<{ uri: string }>;
}>;

export type DialogueV2FreeformScreenProps = Readonly<{
  title: string;
  memoryNote: string;
  messages: readonly DialogueV2FreeformMessage[];
  draft: string;
  sending: boolean;
  voiceStatus: DialogueV2VoiceStatus;
  voiceDraft: DialogueVoiceDraft | null;
  playingVoiceUri: string | null;
  interfaceLang: Lang;
  labels: Readonly<{
    back: string;
    placeholder: string;
    send: string;
    emptyTitle: string;
    emptyText: string;
    voiceIdle: string;
    voiceRecording: string;
    discardVoice: string;
  }>;
  onBack: () => void;
  onChangeDraft: (value: string) => void;
  onSend: () => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onDiscardVoice: () => void;
  onPlayVoice: (uri: string) => void;
  /** §SPEECH-NA: на устройстве нет распознавателя — микрофон перечёркнут и приглушён. */
  voiceUnavailable?: boolean;
  /** Строка-ответ на тап по недоступному микрофону («не работает на этом устройстве»). */
  voiceNotice?: string | null;
  /** R52: сбой хода — плашка с «Повторить» под лентой (как в сценарном диалоге), а не весь экран «недоступно». */
  turnError?: Readonly<{ message: string; retryLabel?: string; onRetry?: () => void }> | null;
}>;

/** A dedicated V2 freeform surface, deliberately separate from scenario sessions. */
export function DialogueV2FreeformScreen({
  title,
  memoryNote,
  messages,
  draft,
  sending,
  voiceStatus,
  voiceDraft,
  playingVoiceUri,
  interfaceLang,
  labels,
  onBack,
  onChangeDraft,
  onSend,
  onStartVoice,
  onStopVoice,
  onDiscardVoice,
  onPlayVoice,
  voiceUnavailable = false,
  voiceNotice = null,
  turnError = null,
}: DialogueV2FreeformScreenProps) {
  const glass = useDialogueGlass();
  const voiceBusy = voiceStatus !== 'idle';
  const canSend = draft.trim().length > 0 && !voiceBusy;
  const voiceCopy = describeDialogueVoiceMessage(interfaceLang);
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
      style={{ flex: 1, backgroundColor: glass.bg }}
      testID="dialogue-v2-freeform-screen"
    >
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <DialogueGlassBackButton glass={glass} onPress={onBack} accessibilityLabel={labels.back} />
          <View style={styles.headerText}>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[styles.title, { color: glass.text }]}>{title}</Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.subtitle, { color: glass.secondary }]}>{memoryNote}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.fill}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false} decelerationRate="fast"
        >
          {messages.length === 0 && !sending ? (
            <View testID="dialogue-v2-freeform-empty" style={[dialogueGlassCardStyle(glass), styles.tip]}>
              <View style={[styles.tipTile, { backgroundColor: glass.opaqueControl }]}>
                <Ionicons name="bulb-outline" size={22} color={glass.text} />
              </View>
              <View style={styles.headerText}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.tipTitle, { color: glass.text }]}>{labels.emptyTitle}</Text>
                <Text maxFontSizeMultiplier={1.4} style={[styles.tipText, { color: glass.secondary }]}>{labels.emptyText}</Text>
              </View>
            </View>
          ) : null}
          {messages.map((message) => {
            const author = message.author === 'learner' ? 'learner' : 'assistant';
            return (
              <DialogueGlassBubble key={message.id} glass={glass} author={author}>
                {message.voice ? (
                  <PressableScale
                    onPress={() => onPlayVoice(message.voice!.uri)}
                    variant="flat"
                    accessibilityRole="button"
                    accessibilityLabel={voiceCopy.action}
                    testID={`dialogue-v2-freeform-voice-message-${message.id}`}
                    style={styles.voiceRow}
                  >
                    <Ionicons name={playingVoiceUri === message.voice.uri ? 'pause' : 'play'} size={18} color={dialogueGlassBubbleInk(glass, author)} />
                    <DialogueGlassBubbleText glass={glass} author={author}>{voiceCopy.label}</DialogueGlassBubbleText>
                  </PressableScale>
                ) : (
                  <DialogueGlassBubbleText glass={glass} author={author}>{message.text}</DialogueGlassBubbleText>
                )}
              </DialogueGlassBubble>
            );
          })}
          {sending ? <DialogueGlassTyping glass={glass} testID="dialogue-v2-freeform-typing" /> : null}
          {turnError && !sending ? (
            <DialogueGlassSysError glass={glass} testID="dialogue-v2-freeform-turn-error" message={turnError.message} retryLabel={turnError.retryLabel} onRetry={turnError.onRetry} />
          ) : null}
        </ScrollView>

        <View style={[styles.composer, { backgroundColor: glass.bg }]}>
          <View style={styles.composerRow}>
            <Pressable
              onPressIn={onStartVoice}
              onPressOut={onStopVoice}
              disabled={sending}
              accessibilityRole="button"
              accessibilityLabel={voiceUnavailable && voiceNotice ? voiceNotice : voiceBusy ? labels.voiceRecording : labels.voiceIdle}
              accessibilityState={{ disabled: sending || voiceUnavailable, selected: voiceBusy }}
              testID="dialogue-v2-freeform-voice-input"
              style={[dialogueGlassRoundButtonStyle(glass, voiceStatus === 'recording'), { opacity: sending || voiceUnavailable ? 0.55 : 1 }]}
            >
              {voiceStatus === 'starting' ? (
                <ActivityIndicator color={glass.text} />
              ) : (
                <Ionicons name={voiceUnavailable ? 'mic-off-outline' : 'mic-outline'} size={24} color={voiceStatus === 'recording' ? glass.ctaInk : glass.text} />
              )}
              {/* зачем (владелец 15.10, D196): цифра остатка общего дневного счётчика голоса на микрофоне свободного разговора (пилюля 22); 0 — «PLUS», у Plus цифры нет */}
              <MicAllowanceBadge size="sm" testID="dialogue-v2-freeform-voice-allowance" />
            </Pressable>
            <TextInput
              // зачем (съёмка R1 dialogs-046/gap-011): поле и отправка свободного разговора были без testID — робот не мог написать реплику.
              testID="dialogue-v2-freeform-input"
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
              testID="dialogue-v2-freeform-send"
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
          {voiceNotice ? (
            <Text
              testID="dialogue-v2-freeform-voice-notice"
              accessibilityLiveRegion="polite"
              // зачем (D145, храповик 05.10): служебная строка о голосе — малый размер шкалы 13 (в макете её нет).
              style={{ color: glass.mutedText, fontSize: 13, lineHeight: 18, marginTop: 8, paddingHorizontal: 4 }}
            >
              {voiceNotice}
            </Text>
          ) : null}
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: 14, paddingTop: 2, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontSize: 22, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  subtitle: { fontSize: 16, lineHeight: 21, marginTop: 2 },
  scroll: { paddingHorizontal: 14, paddingBottom: 24 },
  tip: { marginTop: 18, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  tipTile: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  tipText: { marginTop: 6, fontSize: 16, lineHeight: 22 },
  voiceRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8 },
  composer: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});

export default DialogueV2FreeformScreen;
