import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, Text, View } from 'react-native';

import type { TutorBoardPayload } from '../../app/max_tutor_live_board_state';
import { triLang, type Lang } from '../../constants/i18n';
import { LUM } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useTheme } from '../ThemeContext';

type Props = {
  board: TutorBoardPayload;
  onListen: () => void;
  onDismiss: () => void;
  listenState: 'ready' | 'blocked' | 'pending';
  lang: Lang;
};

export function MaxTutorLiveBoard({ board, onListen, onDismiss, listenState, lang }: Props) {
  const { theme: t, f } = useTheme();
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: LUM.resolveMs,
      useNativeDriver: true,
    }).start();
  }, [progress, reduceMotion]);

  const label = board.kind === 'recast'
    ? triLang(lang, { ru: 'Попробуй так', uk: 'Спробуй так', es: 'Prueba así', 'pt-BR': 'Tente assim', vi: 'Thử nói thế này', id: 'Coba begini', tr: 'Şöyle dene', pl: 'Spróbuj tak' })
    : board.kind === 'translation'
      ? triLang(lang, { ru: 'Перевод', uk: 'Переклад', es: 'Traducción', 'pt-BR': 'Tradução', vi: 'Bản dịch', id: 'Terjemahan', tr: 'Çeviri', pl: 'Tłumaczenie' })
      : triLang(lang, { ru: 'Подсказка', uk: 'Підказка', es: 'Pista', 'pt-BR': 'Dica', vi: 'Gợi ý', id: 'Petunjuk', tr: 'İpucu', pl: 'Podpowiedź' });
  const listenLabel = listenState === 'blocked'
    ? triLang(lang, {
        ru: 'Сначала дослушай Макса', uk: 'Спочатку дослухай Макса', es: 'Primero escucha a Max', 'pt-BR': 'Primeiro ouça o Max',
        vi: 'Hãy nghe Max nói xong', id: 'Dengarkan Max dulu', tr: 'Önce Max’i dinle', pl: 'Najpierw wysłuchaj Maxa',
      })
    : listenState === 'pending'
      ? triLang(lang, {
          ru: 'Макс произносит фразу', uk: 'Макс вимовляє фразу', es: 'Max dice la frase', 'pt-BR': 'Max está dizendo a frase',
          vi: 'Max đang đọc cụm từ', id: 'Max sedang mengucapkan frasa', tr: 'Max ifadeyi söylüyor', pl: 'Max wypowiada frazę',
        })
      : triLang(lang, {
          ru: 'Прослушать фразу', uk: 'Прослухати фразу', es: 'Escuchar la frase', 'pt-BR': 'Ouvir a frase',
          vi: 'Nghe cụm từ', id: 'Dengarkan frasa', tr: 'İfadeyi dinle', pl: 'Posłuchaj frazy',
        });
  const listenDisabled = listenState !== 'ready';
  const dismissLabel = triLang(lang, {
    ru: 'Скрыть подсказку', uk: 'Сховати підказку', es: 'Ocultar la pista', 'pt-BR': 'Ocultar a dica',
    vi: 'Ẩn gợi ý', id: 'Sembunyikan petunjuk', tr: 'İpucunu gizle', pl: 'Ukryj podpowiedź',
  });

  return (
    <Animated.View
      testID="max-tutor-live-board"
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      }}
    >
      <View
        style={{
          borderRadius: 22,
          borderWidth: 1,
          borderColor: t.border,
          backgroundColor: t.bgCard,
          padding: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, color: t.accent, fontSize: f.label, fontWeight: '900', textTransform: 'uppercase' }}>
            {label}
          </Text>
          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel={dismissLabel}
            onPress={onDismiss}
            hitSlop={8}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 }}
          >
            <Ionicons name="close" size={22} color={t.textMuted} />
          </Pressable>
        </View>
        <Text selectable style={{ color: t.textPrimary, fontSize: f.bodyLg, lineHeight: f.bodyLg * 1.35, fontWeight: '800' }}>
          {board.targetText}
        </Text>
        {board.meaning !== '' ? (
          <Text selectable style={{ color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.4, marginTop: 6 }}>
            {board.meaning}
          </Text>
        ) : null}
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={listenLabel}
          accessibilityState={{ disabled: listenDisabled, busy: listenState === 'pending' }}
          disabled={listenDisabled}
          onPress={listenDisabled ? undefined : onListen}
          style={{
            minHeight: 44,
            marginTop: 14,
            borderRadius: 14,
            backgroundColor: listenDisabled ? t.bgSurface2 : t.accent,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {listenState === 'pending' ? (
            <ActivityIndicator size="small" color={t.textMuted} />
          ) : (
            <Ionicons name="volume-high-outline" size={20} color={listenDisabled ? t.textMuted : t.correctText} />
          )}
          <Text style={{ color: listenDisabled ? t.textMuted : t.correctText, fontSize: f.body, fontWeight: '900' }}>
            {listenLabel}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default MaxTutorLiveBoard;
