/**
 * DialogHelperRow — строка помощника над полем ввода.
 *
 * зачем (владелец 2026-09-14): «помощник пусть будет вариант А, но только когда
 * юзер уже три реплики не может сказать ничего адекватного». То есть строка НЕ
 * висит постоянно (это намекало бы на сложность и отвлекало), а появляется
 * ровно тогда, когда человек застрял: три подряд пустых/односложных реплики
 * (app/ai_dialog_coach.ts → isWeakLearnerReply).
 *
 * Внутри: широкая кнопка с конкретной фразой под текущую цель (лампочка) и
 * два коротких готовых ответа. Тап вставляет текст в поле ввода — отправляет
 * человек сам, реплика остаётся его.
 *
 * Данные приходят уже готовыми (coach.suggestions из того же вызова, что и
 * реплика) — ни одного сетевого запроса при появлении строки.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import { hapticTap } from '../../hooks/use-haptics';
import { triLang, type Lang } from '../../constants/i18n';

interface DialogHelperRowProps {
  lang: Lang;
  /** Конкретная подсказка под текущую цель сцены (широкая кнопка с лампочкой). */
  hint: string;
  /** Короткие готовые ответы под уровень (до 3). */
  suggestions: string[];
  /** Тап: вставить текст в поле ввода, не отправлять. */
  onUse: (text: string) => void;
  /** Открыть шторку «Как сказать…» (перевод с родного на изучаемый). */
  onHowToSay: () => void;
  testID?: string;
}

export default function DialogHelperRow({
  lang,
  hint,
  suggestions,
  onUse,
  onHowToSay,
  testID,
}: DialogHelperRowProps) {
  const { theme: t, f } = useTheme();
  const reduceMotion = useReducedMotion();

  // Кнопка «Как сказать…» полезна сама по себе: даже без подсказок человек может
  // спросить, как выразить свою мысль. Поэтому строку прячем, только если нет
  // вообще ничего — а такого не бывает, пока помощник показан.
  if (!hint && suggestions.length === 0) return null;

  const takeLabel = triLang(lang, {
    ru: 'взять', uk: 'взяти', en: 'use', es: 'usar', 'pt-BR': 'usar',
    vi: 'dùng', id: 'pakai', tr: 'al', pl: 'użyj',
  });

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.duration(220)}
      style={styles.wrap}
      testID={testID}
    >
      {hint ? (
        <Pressable
          onPress={() => {
            hapticTap();
            onUse(hint);
          }}
          accessibilityRole="button"
          accessibilityLabel={hint}
          style={({ pressed }) => [
            styles.hint,
            { backgroundColor: t.bgCard, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          testID={testID ? `${testID}-hint` : undefined}
        >
          <Ionicons name="bulb" size={20} color={t.accent} />
          <Text
            style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', flex: 1 }}
            maxFontSizeMultiplier={1.2}
          >
            {hint}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
            {takeLabel}
          </Text>
        </Pressable>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        keyboardShouldPersistTaps="handled"
      >
        {/* «Как сказать…» стоит ПЕРВОЙ: это единственная кнопка, которая
            работает для любой мысли ученика, а не только для заготовленных
            ответов (владелец 2026-09-14, макет помощника). */}
        <Pressable
          onPress={() => {
            hapticTap();
            onHowToSay();
          }}
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            ru: 'Как сказать…', uk: 'Як сказати…', en: 'How to say…', es: 'Cómo decir…',
            'pt-BR': 'Como dizer…', vi: 'Nói thế nào…', id: 'Bagaimana bilang…',
            tr: 'Nasıl denir…', pl: 'Jak powiedzieć…',
          })}
          style={({ pressed }) => [
            styles.askChip,
            { backgroundColor: t.accentBg, transform: [{ scale: pressed ? 0.96 : 1 }] },
          ]}
          testID={testID ? `${testID}-howtosay` : undefined}
        >
          <Ionicons name="language" size={20} color={t.accent} />
        </Pressable>

        {/* guard-ok: не более 3 чипов (сервер режет suggestions до трёх) —
            виртуализация FlatList здесь дороже самого списка. */}
        {suggestions.map((suggestion, index) => (
            <Pressable
              key={`${index}:${suggestion}`}
              onPress={() => {
                hapticTap();
                onUse(suggestion);
              }}
              accessibilityRole="button"
              accessibilityLabel={suggestion}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: t.bgCard, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <Text
                style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700' }}
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
              >
                {suggestion}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginBottom: 8 },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 50,
  },
  chips: { gap: 8, paddingRight: 4, alignItems: 'center' },
  askChip: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 42,
    justifyContent: 'center',
  },
});
