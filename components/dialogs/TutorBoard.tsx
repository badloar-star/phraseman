/**
 * TutorBoard — «доска» над чатом урока: целевая фраза, её перевод, озвучка и
 * отправка в карточки.
 *
 * зачем (владелец 2026-09-14, макет «Урок с Максом»): доска — главный
 * обучающий инструмент MAX, перенесённый в текст. Макс ставит на неё фразу,
 * которую ученик должен произнести; она видна всё время, пока нужна, а не
 * теряется в ленте сообщений выше.
 *
 * Появление — сверху вниз, как в макете. Живёт, пока Макс не поставит новую
 * фразу или не закончится урок: таймера на 12 секунд здесь нет (в тексте, в
 * отличие от звонка, человек читает в своём темпе).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import { hapticTap } from '../../hooks/use-haptics';
import { triLang, type Lang } from '../../constants/i18n';

interface TutorBoardProps {
  lang: Lang;
  /** Целевая фраза на изучаемом языке. */
  text: string;
  /** Её значение на языке интерфейса. */
  meaning: string;
  onSpeak: () => void;
  speakUnavailable?: boolean;
  /** Сохранить фразу в карточки. null — уже сохранена. */
  onSaveToCards: (() => void) | null;
  saved: boolean;
  testID?: string;
}

export default function TutorBoard({
  lang,
  text: phrase,
  meaning,
  onSpeak,
  speakUnavailable = false,
  onSaveToCards,
  saved,
  testID,
}: TutorBoardProps) {
  const { theme: t, f } = useTheme();
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInUp.duration(240)}
      style={[styles.wrap, { backgroundColor: t.bgCard }]}
      testID={testID}
    >
      <View style={styles.head}>
        <Ionicons name="easel" size={16} color={t.accent} />
        <Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
          {triLang(lang, {
            ru: 'На доске', uk: 'На дошці', en: 'On the board', es: 'En la pizarra',
            'pt-BR': 'No quadro', vi: 'Trên bảng', id: 'Di papan', tr: 'Tahtada', pl: 'Na tablicy',
          })}
        </Text>
      </View>

      <Text
        style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', lineHeight: Math.round(f.h2 * 1.25) }}
        maxFontSizeMultiplier={1.2}
      >
        {phrase}
      </Text>
      {meaning ? (
        <Text style={{ color: t.textSecond, fontSize: f.body }} maxFontSizeMultiplier={1.2}>
          {meaning}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            hapticTap();
            if (!speakUnavailable) onSpeak();
          }}
          accessibilityRole="button"
          accessibilityState={{ disabled: speakUnavailable }}
          accessibilityLabel={speakUnavailable ? triLang(lang, {
            ru: 'Голос для этого языка недоступен', uk: 'Голос для цієї мови недоступний', en: 'Voice for this language is unavailable', es: 'La voz para este idioma no está disponible',
            'pt-BR': 'A voz para este idioma não está disponível', vi: 'Giọng nói cho ngôn ngữ này chưa khả dụng', id: 'Suara untuk bahasa ini tidak tersedia', tr: 'Bu dil için ses kullanılamıyor', pl: 'Głos dla tego języka jest niedostępny',
          }) : triLang(lang, {
            ru: 'Послушать фразу', uk: 'Послухати фразу', en: 'Listen to the phrase',
            es: 'Escuchar la frase', 'pt-BR': 'Ouvir a frase', vi: 'Nghe câu này',
            id: 'Dengarkan frasa', tr: 'Cümleyi dinle', pl: 'Posłuchaj zdania',
          })}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: t.accentBg, opacity: speakUnavailable ? 0.5 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
          ]}
        >
          <Ionicons name="volume-medium" size={18} color={t.accent} />
          <Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
            {triLang(lang, {
              ru: 'Послушать', uk: 'Послухати', en: 'Listen', es: 'Escuchar', 'pt-BR': 'Ouvir',
              vi: 'Nghe', id: 'Dengar', tr: 'Dinle', pl: 'Posłuchaj',
            })}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (!onSaveToCards) return;
            hapticTap();
            onSaveToCards();
          }}
          disabled={saved || !onSaveToCards}
          accessibilityRole="button"
          accessibilityState={{ disabled: saved || !onSaveToCards }}
          accessibilityLabel={
            saved
              ? triLang(lang, {
                  ru: 'Фраза уже в карточках', uk: 'Фраза вже в картках', en: 'Phrase already in flashcards',
                  es: 'La frase ya está en las tarjetas', 'pt-BR': 'A frase já está nos cartões',
                  vi: 'Câu này đã ở trong thẻ', id: 'Frasa sudah ada di kartu',
                  tr: 'Cümle zaten kartlarda', pl: 'Zdanie jest już w fiszkach',
                })
              : triLang(lang, {
                  ru: 'Сохранить в карточки', uk: 'Зберегти в картки', en: 'Save to flashcards',
                  es: 'Guardar en tarjetas', 'pt-BR': 'Salvar nos cartões', vi: 'Lưu vào thẻ',
                  id: 'Simpan ke kartu', tr: 'Kartlara kaydet', pl: 'Zapisz do fiszek',
                })
          }
          style={({ pressed }) => [
            styles.action,
            {
              backgroundColor: saved ? t.correctBg : t.bgSurface2,
              opacity: saved ? 1 : pressed ? 0.85 : 1,
              transform: [{ scale: pressed && !saved ? 0.96 : 1 }],
            },
          ]}
        >
          <Ionicons
            name={saved ? 'checkmark-circle' : 'albums-outline'}
            size={18}
            color={saved ? t.correct : t.textSecond}
          />
          <Text
            style={{ color: saved ? t.correct : t.textSecond, fontSize: f.sub, fontWeight: '700' }}
            maxFontSizeMultiplier={1.2}
          >
            {saved
              ? triLang(lang, {
                  ru: 'В карточках', uk: 'У картках', en: 'In flashcards', es: 'En tarjetas',
                  'pt-BR': 'Nos cartões', vi: 'Đã lưu', id: 'Di kartu', tr: 'Kartlarda', pl: 'W fiszkach',
                })
              : triLang(lang, {
                  ru: 'В карточки', uk: 'У картки', en: 'To flashcards', es: 'A tarjetas',
                  'pt-BR': 'Aos cartões', vi: 'Lưu thẻ', id: 'Ke kartu', tr: 'Kartlara', pl: 'Do fiszek',
                })}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 44,
  },
});
