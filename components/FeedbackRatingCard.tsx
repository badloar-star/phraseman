// Переиспользуемый блок «оценка звёздами + текстовый отзыв» для экранов
// завершения (урок / словарь / диалог / арена). Вынесен из max_voice_review.tsx
// (владелец 2026-08-23, звонок MAX) в общий компонент — владелец 2026-08-25:
// «такой же блок нужен везде: уроки, словарь, диалог, арена блиц или рейтинг».
//
// Optimistic UI: тап «Отправить» сразу показывает «Спасибо», отзыв уходит в
// локальную очередь (feedback_outbox) и досылается сетью фоном — тот же
// паттерн, что и у звонка MAX. Показ троттлится раздельно по разделу
// (feedback_prompt_throttle, не чаще раза в неделю) — гейт решает вызывающий
// экран (см. shouldPromptFeedback), сам компонент рендерится безусловно.
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { glassFill } from './GlassSurface';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { trackEvent } from '../app/analytics';
import { getStableId } from '../app/stable_id';
import {
  FEEDBACK_AI_SUMMARY_CONSENT_VERSION,
  submitFeedbackEntry,
  type FeedbackKind,
} from '../app/feedback_client';
import { enqueueFeedbackEntry, flushFeedbackOutbox } from '../app/feedback_outbox';
import { type Lang } from '../constants/i18n';
import { DebugLogger } from '../app/debug-logger';

export interface FeedbackRatingCardProps {
  kind: FeedbackKind;
  /** id урока/сессии словаря/диалога/матча — один отзыв на попытку. */
  entityId: string;
  /** Человекочитаемое имя (напр. «Урок 5: Прошедшее время») — видно в админке. */
  entityLabel?: string | null;
  lang: Lang;
  userName?: string | null;
  title: string;
  placeholder: string;
  sendLabel: string;
  thanksLabel: string;
  ratingA11yLabel: string;
  testID?: string;
  presentation?: 'default' | 'compact-stars';
}

export default function FeedbackRatingCard({
  kind,
  entityId,
  entityLabel,
  lang,
  userName,
  title,
  placeholder,
  sendLabel,
  thanksLabel,
  ratingA11yLabel,
  testID = 'feedback-rating-card',
  presentation = 'default',
}: FeedbackRatingCardProps) {
  const { theme: t, f } = useTheme();
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0);
  // зачем (владелец 2026-08-26): «убери этот текст и галочку — никаких
  // согласий мы тут не спрашиваем». Чекбокс убран со всех экранов отзыва.
  // Сервер (feedback_entries.ts) устроен fail-closed: во внешний сервис анализа
  // текст уходит только при aiSummaryConsent === true с актуальной версией
  // согласия. Поэтому убрать одну галочку было НЕДОСТАТОЧНО — без этой строки
  // анализ тем молча выключился бы целиком. Владелец выбрал
  // «убрать чекбокс И слать», поэтому согласие теперь даётся один раз в
  // Политике конфиденциальности, а не отдельной галочкой в каждой карточке.
  const aiSummaryConsent = true;
  const [state, setState] = useState<'idle' | 'sent'>('idle');
  const compactStars = presentation === 'compact-stars';


  const flushPendingFeedback = async (): Promise<void> => {
    try {
      const accountKey = await getStableId();
      await flushFeedbackOutbox(accountKey, submitFeedbackEntry);
    } catch (e) {
      // Offline queue remains intact for the next completion-screen mount.
      DebugLogger.error('FeedbackRatingCard:accountKey', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  };

  useEffect(() => {
    void flushPendingFeedback();
    // This is a lifecycle retry, not a background timer.
  }, []);

  const sendFeedback = async (): Promise<void> => {
    const message = text.trim();
    if (state === 'sent' || (message === '' && rating === 0)) return;
    hapticTap();
    const input = {
      kind, entityId, entityLabel: entityLabel ?? null, message, rating,
      aiSummaryConsent,
      aiSummaryConsentVersion: aiSummaryConsent ? FEEDBACK_AI_SUMMARY_CONSENT_VERSION : null,
      lang, userName: userName ?? null,
    };

    // Мгновенно: интерфейс не ждёт ни диск, ни сеть.
    setState('sent');
    setText('');
    void trackEvent('feedback_entry_sent', { kind, rating, hasText: message !== '' });

    try {
      const accountKey = await getStableId();
      const persisted = await enqueueFeedbackEntry(accountKey, input);
      if (!persisted) {
        // Disk/SQLite can fail independently of the network. The in-memory
        // payload still gets one best-effort delivery attempt instead of being
        // silently dropped before flush can see it.
        await submitFeedbackEntry(input);
        return;
      }
      await flushFeedbackOutbox(accountKey, submitFeedbackEntry);
    } catch (e) {
      // Осталось в очереди: досылка произойдёт на следующем экране завершения.
      DebugLogger.error('FeedbackRatingCard:persisted', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  };

  const card = {
    backgroundColor: glassFill(t.bgSurface, 0.48),
    borderRadius: compactStars ? 18 : 20,
    padding: compactStars ? 10 : 18,
  } as const;

  return (
    <View testID={testID} style={card}>
      <Text style={{ color: t.textPrimary, fontSize: compactStars ? f.body : f.bodyLg, fontWeight: '900', textAlign: 'center' }} maxFontSizeMultiplier={2}>
        {title}
      </Text>
      {state === 'sent' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
          <Ionicons name="checkmark-circle" size={20} color={t.correct} />
          <Text accessibilityLiveRegion="polite" style={{ color: t.correct, fontSize: f.body, fontWeight: '800' }} maxFontSizeMultiplier={2}>
            {thanksLabel}
          </Text>
        </View>
      ) : (
        <>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={ratingA11yLabel}
            style={[styles.ratingRow, compactStars ? styles.compactRatingRow : null]}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={`star-${star}`}
                testID={`${testID}-star-${star}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: rating === star }}
                accessibilityLabel={`${ratingA11yLabel} ${star}`}
                onPress={() => { hapticTap(); setRating(star); }}
                style={[styles.starButton, compactStars ? styles.compactStarButton : null]}
              >
                <Ionicons name={rating >= star ? 'star' : 'star-outline'} size={compactStars ? 28 : 26} color={rating >= star ? t.gold : t.textGhost} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={compactStars ? styles.compactInputRow : undefined}>
            <TextInput
              testID={`${testID}-input`}
              accessibilityLabel={title}
              value={text}
              onChangeText={setText}
              placeholder={placeholder}
              placeholderTextColor={t.textGhost}
              multiline={!compactStars}
              maxLength={2000}
              maxFontSizeMultiplier={2}
              style={[
                styles.input,
                {
                  color: t.textPrimary,
                  fontSize: f.body,
                  lineHeight: Math.round(f.body * 1.4),
                  backgroundColor: glassFill(t.bgCard, 0.7),
                },
                compactStars ? styles.compactInput : null,
              ]}
            />
            <TouchableOpacity
              testID={`${testID}-send`}
              accessibilityRole="button"
              accessibilityLabel={sendLabel}
              accessibilityState={{ disabled: text.trim() === '' && rating === 0 }}
              disabled={text.trim() === '' && rating === 0}
              onPress={() => { void sendFeedback(); }}
              style={[
                styles.sendButton,
                compactStars ? styles.compactSendButton : null,
                { backgroundColor: text.trim() === '' && rating === 0 ? glassFill(t.bgCard, 0.6) : t.accent },
              ]}
            >
              {compactStars ? (
                <Ionicons
                  name="send"
                  size={18}
                  color={text.trim() === '' && rating === 0 ? t.textGhost : t.correctText}
                />
              ) : (
                <Text style={{ color: text.trim() === '' && rating === 0 ? t.textGhost : t.correctText, fontSize: f.body, fontWeight: '900' }} maxFontSizeMultiplier={2}>
                  {sendLabel}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ratingRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  compactRatingRow: { gap: 2, marginTop: 2 },
  starButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  compactStarButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: {
    fontWeight: '600',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    marginTop: 12,
    minHeight: 92,
    textAlignVertical: 'top',
  },
  compactInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  compactInput: {
    flex: 1,
    height: 44,
    minHeight: 44,
    marginTop: 0,
    paddingTop: 9,
    paddingBottom: 9,
    textAlignVertical: 'center',
  },
  sendButton: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactSendButton: { width: 44, height: 44, minHeight: 44, marginTop: 0 },
});
