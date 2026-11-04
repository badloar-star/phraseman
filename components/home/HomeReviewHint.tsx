// HomeReviewHint — строка «Повторить N слов · M мин» на Главной; тап — мини-тренировка карточек (удобство №8, владелец 04.11).
// зачем: слова начинают забываться — одним касанием к повторению. Одна строка без мелкой подписи, токены темы, без обводок; в списки не вставляет новых View.
import React, { memo } from 'react';
import { StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { Lang } from '../../constants/i18n';
import { V2 } from '../../constants/v2Style';
import { useV2Palette } from '../v2/useV2Palette';
import V2Pressable from '../v2/V2Pressable';
import { homeReviewHintText } from '../../app/home_review_hint_copy';
import { useHomeReviewHint } from '../../hooks/use_home_review_hint';

type Props = Readonly<{ lang: Lang; active: boolean }>;

function HomeReviewHint({ lang, active }: Props) {
  const p = useV2Palette();
  const router = useRouter();
  const hint = useHomeReviewHint(active);
  if (!hint) return null;
  const label = homeReviewHintText(lang, hint.words, hint.minutes);
  return (
    <V2Pressable
      testID="home-review-hint"
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        console.log('[HOME-REVIEW-HINT]', JSON.stringify({ event: 'tap', words: hint.words, size: hint.sessionSize })); // guard-ok: одна строка на тап
        router.push({ pathname: '/flashcards_swipe', params: { size: String(hint.sessionSize), due: '1' } } as never);
      }}
      style={[s.row, { backgroundColor: p.control }]}
    >
      <Ionicons name="refresh" size={20} color={p.text} />
      <Text numberOfLines={2} style={[s.text, { color: p.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={p.textSecondary} />
    </V2Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 16, paddingVertical: 8, borderRadius: V2.radius.card },
  text: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 21, fontWeight: '700' },
});

export default memo(HomeReviewHint);
