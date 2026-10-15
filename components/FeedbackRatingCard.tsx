// Переиспользуемый блок «оценка звёздами + текстовый отзыв» для экранов
// завершения (урок / словарь / диалог / арена).
// Общая карточка используется на всех поддерживаемых экранах.
// «такой же блок нужен везде: уроки, словарь, диалог, арена блиц или рейтинг».
//
// Optimistic UI: тап «Отправить» сразу показывает «Спасибо», отзыв уходит в
// локальную очередь (feedback_outbox) и досылается сетью фоном — тот же
// Показ троттлится раздельно по разделу
// (feedback_prompt_throttle, не чаще раза в неделю) — гейт решает вызывающий
// экран (см. shouldPromptFeedback), сам компонент рендерится безусловно.
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { glassFill } from './GlassSurface';
import { FONT_SCALE, useTheme } from './ThemeContext';
import { LinearGradient } from './SafeLinearGradient';
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
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { plateBoxShadow } from './v2/ShadowSurface';
import { DebugLogger } from '../app/debug-logger';
import { isDevDialogFeedbackSent } from '../app/dev_dialog_state';

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
  presentation?: 'default' | 'compact-stars' | 'liquid-glass-rate';
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
  const { theme: t, f, liquidGlassThemeId, fontSize, uiScale } = useTheme();
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
  // зачем (координатор 14.10, dialogs-044): dev_dialog_feedback=sent открывает карточку диалога уже в состоянии «Отзыв отправлен», сам отзыв не отправляется (вызов только по кнопке)
  const [state, setState] = useState<'idle' | 'sent'>(kind === 'dialogue' && isDevDialogFeedbackSent() ? 'sent' : 'idle');
  const [expanded, setExpanded] = useState(false);
  const compactStars = presentation === 'compact-stars';
  const liquidGlassRate = presentation === 'liquid-glass-rate';


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

  if (liquidGlassRate) {
    const glass = liquidGlassTokens(liquidGlassThemeId);
    const textScale = (FONT_SCALE[fontSize] / FONT_SCALE.medium) * uiScale;
    const sendDisabled = text.trim() === '' && rating === 0;
    const liquidBodyVisible = expanded || state === 'sent';
    return (
      <View
        testID={testID}
        style={[
          styles.liquidCard,
          { backgroundColor: glass.opaqueCard, boxShadow: plateBoxShadow(glass) }, // зачем (владелец 12.10, стиль «Тень»): карточка без обводки — тон и тень
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          testID={`${testID}-sheen`}
          colors={[glass.lightTint, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.liquidSheen]}
        />
        <TouchableOpacity
          testID={`${testID}-header`}
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityState={{ expanded: liquidBodyVisible, disabled: state === 'sent' }}
          disabled={state === 'sent'}
          onPress={() => { hapticTap(); setExpanded(current => !current); }}
          style={styles.liquidHeader}
        >
          <Text
            testID={`${testID}-title`}
            style={[
              styles.liquidTitle,
              { color: glass.text, fontSize: 16 * textScale, lineHeight: 22 * textScale },
            ]}
            maxFontSizeMultiplier={undefined}
          >
            {title}
          </Text>
          <Ionicons
            name={liquidBodyVisible ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={glass.secondary}
          />
        </TouchableOpacity>

        {liquidBodyVisible ? state === 'sent' ? (
          <View style={styles.liquidSentRow}>
            <Ionicons name="checkmark-circle" size={20} color={t.correct} />
            <Text
              testID={`${testID}-thanks`}
              accessibilityLiveRegion="polite"
              style={[
                styles.liquidThanks,
                { color: t.correct, fontSize: 16 * textScale, lineHeight: 22 * textScale },
              ]}
              maxFontSizeMultiplier={undefined}
            >
              {thanksLabel}
            </Text>
          </View>
        ) : (
          <>
            <View
              testID={`${testID}-rating`}
              accessibilityRole="radiogroup"
              accessibilityLabel={ratingA11yLabel}
              style={styles.liquidRatingRow}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={`star-${star}`}
                  testID={`${testID}-star-${star}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: rating === star }}
                  accessibilityLabel={`${ratingA11yLabel} ${star}`}
                  onPress={() => { hapticTap(); setRating(star); }}
                  style={styles.liquidStarButton}
                >
                  <Ionicons
                    name={rating >= star ? 'star' : 'star-outline'}
                    size={34}
                    color={rating >= star ? t.accentText : glass.mutedText}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              testID={`${testID}-input`}
              accessibilityLabel={title}
              value={text}
              onChangeText={setText}
              placeholder={placeholder}
              placeholderTextColor={glass.mutedText}
              multiline
              maxLength={2000}
              maxFontSizeMultiplier={undefined}
              style={[
                styles.liquidInput,
                {
                  color: glass.text,
                  fontSize: 16 * textScale,
                  lineHeight: 22 * textScale,
                  backgroundColor: glass.opaqueControl,
                  borderColor: glass.glassEdge, // shadow-ok: контур поля ввода текста отзыва (TextInput), не контейнер
                },
              ]}
            />
            <TouchableOpacity
              testID={`${testID}-send`}
              accessibilityRole="button"
              accessibilityLabel={sendLabel}
              accessibilityState={{ disabled: sendDisabled }}
              disabled={sendDisabled}
              onPress={() => { void sendFeedback(); }}
              style={styles.liquidSendTarget}
            >
              <View
                testID={`${testID}-send-visual`}
                style={[
                  styles.liquidSendVisual,
                  { backgroundColor: sendDisabled ? glass.buttonFillDisabled : glass.ctaFill }, // зачем (владелец 13.10, №35): токены кнопок темы
                ]}
              >
                <Text
                  testID={`${testID}-send-label`}
                  style={[
                    styles.liquidSendLabel,
                    {
                      color: sendDisabled ? glass.mutedText : glass.ctaFillInk,
                      fontSize: 16 * textScale,
                      lineHeight: 22 * textScale,
                    },
                  ]}
                  maxFontSizeMultiplier={undefined}
                >
                  {sendLabel}
                </Text>
                <Ionicons
                  name="send"
                  size={16}
                  color={sendDisabled ? glass.mutedText : glass.ctaFillInk}
                />
              </View>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    );
  }

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
                <Ionicons name={rating >= star ? 'star' : 'star-outline'} size={compactStars ? 28 : 26} color={rating >= star ? t.accentText : t.textGhost} />
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
                { backgroundColor: text.trim() === '' && rating === 0 ? glassFill(t.bgCard, 0.6) : t.accent }, // light-accent-ok: кнопка с текстом
              ]}
            >
              {compactStars ? (
                <Ionicons
                  name="send"
                  size={18}
                  color={text.trim() === '' && rating === 0 ? t.textGhost : t.textOnGold}
                />
              ) : (
                <Text style={{ color: text.trim() === '' && rating === 0 ? t.textGhost : t.textOnGold, fontSize: f.body, fontWeight: '900' }} maxFontSizeMultiplier={2}>
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
  liquidCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  liquidSheen: { opacity: 0.08 },
  liquidHeader: {
    minHeight: 44,
    marginVertical: -11,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liquidTitle: { flex: 1, minWidth: 0, flexShrink: 1, fontWeight: '700' },
  liquidRatingRow: {
    width: '100%',
    maxWidth: 260,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 4,
    marginTop: 12,
  },
  liquidStarButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liquidInput: {
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1, // shadow-ok: контур поля ввода (TextInput), не контейнер
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    marginTop: 16,
    fontWeight: '600',
    textAlignVertical: 'top',
  },
  liquidSendTarget: {
    minHeight: 44,
    maxWidth: '100%',
    alignSelf: 'flex-end',
    justifyContent: 'center',
    marginTop: 10,
  },
  liquidSendVisual: {
    minHeight: 42,
    maxWidth: '100%',
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  liquidSendLabel: { minWidth: 0, flexShrink: 1, fontWeight: '600', textAlign: 'center' },
  liquidSentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  liquidThanks: { minWidth: 0, flexShrink: 1, fontWeight: '700' },
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
