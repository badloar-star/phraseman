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
import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { glassFill } from './GlassSurface';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { trackEvent } from '../app/analytics';
import { getStableId } from '../app/stable_id';
import { submitFeedbackEntry, type FeedbackKind } from '../app/feedback_client';
import { dequeueFeedbackEntry, enqueueFeedbackEntry } from '../app/feedback_outbox';

export interface FeedbackRatingCardProps {
  kind: FeedbackKind;
  /** id урока/сессии словаря/диалога/матча — один отзыв на попытку. */
  entityId: string;
  /** Человекочитаемое имя (напр. «Урок 5: Прошедшее время») — видно в админке. */
  entityLabel?: string | null;
  lang: string;
  userName?: string | null;
  title: string;
  placeholder: string;
  sendLabel: string;
  thanksLabel: string;
  ratingA11yLabel: string;
  testID?: string;
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
}: FeedbackRatingCardProps) {
  const { theme: t, f } = useTheme();
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0);
  const [state, setState] = useState<'idle' | 'sent'>('idle');

  const sendFeedback = async (): Promise<void> => {
    const message = text.trim();
    if (state === 'sent' || (message === '' && rating === 0)) return;
    hapticTap();
    const input = { kind, entityId, entityLabel: entityLabel ?? null, message, rating, lang, userName: userName ?? null };

    // Мгновенно: интерфейс не ждёт ни диск, ни сеть.
    setState('sent');
    setText('');
    void trackEvent('feedback_entry_sent', { kind, rating, hasText: message !== '' });

    try {
      const accountKey = await getStableId();
      await enqueueFeedbackEntry(accountKey, input);
      await submitFeedbackEntry(input);
      await dequeueFeedbackEntry(accountKey, kind, entityId);
    } catch {
      // Осталось в очереди: досылка произойдёт на следующем экране завершения.
    }
  };

  const card = { backgroundColor: glassFill(t.bgSurface, 0.48), borderRadius: 20, padding: 18 } as const;

  return (
    <View testID={testID} style={card}>
      <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900', textAlign: 'center' }} maxFontSizeMultiplier={2}>
        {title}
      </Text>
      {state === 'sent' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
          <Ionicons name="checkmark-circle" size={20} color={t.correctText} />
          <Text accessibilityLiveRegion="polite" style={{ color: t.correctText, fontSize: f.body, fontWeight: '800' }} maxFontSizeMultiplier={2}>
            {thanksLabel}
          </Text>
        </View>
      ) : (
        <>
          <View accessibilityRole="radiogroup" accessibilityLabel={ratingA11yLabel} style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={`star-${star}`}
                testID={`${testID}-star-${star}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: rating >= star }}
                accessibilityLabel={`${ratingA11yLabel} ${star}`}
                onPress={() => { hapticTap(); setRating(star); }}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name={rating >= star ? 'star' : 'star-outline'} size={26} color={rating >= star ? t.gold : t.textGhost} />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            testID={`${testID}-input`}
            accessibilityLabel={title}
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={t.textGhost}
            multiline
            maxLength={2000}
            maxFontSizeMultiplier={2}
            style={{
              color: t.textPrimary,
              fontSize: f.body,
              fontWeight: '600',
              lineHeight: Math.round(f.body * 1.4),
              backgroundColor: glassFill(t.bgCard, 0.7),
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingTop: 12,
              paddingBottom: 12,
              marginTop: 12,
              minHeight: 92,
              textAlignVertical: 'top',
            }}
          />
          <TouchableOpacity
            testID={`${testID}-send`}
            accessibilityRole="button"
            accessibilityLabel={sendLabel}
            accessibilityState={{ disabled: text.trim() === '' && rating === 0 }}
            disabled={text.trim() === '' && rating === 0}
            onPress={() => { void sendFeedback(); }}
            style={{
              marginTop: 12,
              minHeight: 48,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: text.trim() === '' && rating === 0 ? glassFill(t.bgCard, 0.6) : t.accent,
            }}
          >
            <Text style={{ color: text.trim() === '' && rating === 0 ? t.textGhost : t.correctText, fontSize: f.body, fontWeight: '900' }} maxFontSizeMultiplier={2}>
              {sendLabel}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
