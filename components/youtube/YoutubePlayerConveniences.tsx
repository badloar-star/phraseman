// YoutubePlayerConveniences — ряд под плеером: «Продолжить с m:ss» (брошенный ролик), «Назад на 10 с», «Медленнее» (0,75×).
// зачем (владелец одобрил «все сделать», координатор 04.11, №9): повторить непонятную фразу и замедлить речь — без поиска по полоске.
// Лёгкая плашка: только Pressable/Text, без WebView-работы; отклик мгновенный (скорость и позиция уходят в плеер, подпись меняется сразу).
// Вибрация только на управляющих кнопках (решение владельца): здесь — лёгкий хаптик на «Назад» и «Медленнее».
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Lang } from '../../constants/i18n';
import { backTarget, formatClock, YOUTUBE_SLOW_RATE, youtubeConvenienceCopy } from './youtube_convenience_strings';

type Props = {
  videoId: string;
  lang: Lang;
  /** Последняя известная секунда ролика (из пробы раз в секунду). */
  getPositionSec: () => number | null;
  onSeek: (sec: number) => void;
  onRate: (rate: number) => void;
  /** Сохранённая секунда брошенного ролика; null — кнопки «Продолжить» нет. */
  resumeSec: number | null;
  /** Цвета плашки — токены стекла плеера (как у кнопки закрытия рядом). */
  fill: string;
  ink: string;
};

const tap = () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error: unknown) => {
  console.warn('[VIDEO-CONVENIENCE] хаптик не сработал', String((error as Error)?.message ?? error).slice(0, 80));
}); };

export default function YoutubePlayerConveniences({ videoId, lang, getPositionSec, onSeek, onRate, resumeSec, fill, ink }: Props) {
  const copy = youtubeConvenienceCopy(lang);
  const [slow, setSlow] = useState(false);
  const [resumeShown, setResumeShown] = useState(resumeSec !== null);

  const onBack = useCallback(() => {
    tap();
    const position = getPositionSec();
    const target = backTarget(position ?? 0);
    console.log('[VIDEO-CONVENIENCE]', JSON.stringify({ videoId, action: 'back10', position, target }));
    onSeek(target);
  }, [getPositionSec, onSeek, videoId]);

  const onSlower = useCallback(() => {
    tap();
    const next = !slow;
    setSlow(next); // зачем: подпись меняется в тот же кадр, плеер догоняет
    console.log('[VIDEO-CONVENIENCE]', JSON.stringify({ videoId, action: 'rate', rate: next ? YOUTUBE_SLOW_RATE : 1 }));
    onRate(next ? YOUTUBE_SLOW_RATE : 1);
  }, [slow, onRate, videoId]);

  const onResume = useCallback(() => {
    if (resumeSec === null) return;
    tap();
    setResumeShown(false);
    console.log('[VIDEO-CONVENIENCE]', JSON.stringify({ videoId, action: 'resume', resumeSec }));
    onSeek(resumeSec);
  }, [resumeSec, onSeek, videoId]);

  return (
    <View testID="youtube-conveniences" style={styles.row}>
      {resumeShown && resumeSec !== null ? (
        <Pressable testID="youtube-resume" accessibilityRole="button" onPress={onResume} style={({ pressed }) => [styles.chip, styles.grow, { backgroundColor: fill, opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[styles.label, { color: ink }]} numberOfLines={1}>{copy.continueFrom(formatClock(resumeSec))}</Text>
        </Pressable>
      ) : null}
      <Pressable testID="youtube-back10" accessibilityRole="button" accessibilityLabel={copy.back10} onPress={onBack} style={({ pressed }) => [styles.chip, styles.grow, { backgroundColor: fill, opacity: pressed ? 0.7 : 1 }]}>
        <Text style={[styles.label, { color: ink }]} numberOfLines={1}>{copy.back10}</Text>
      </Pressable>
      <Pressable testID="youtube-slower" accessibilityRole="button" accessibilityState={{ selected: slow }} accessibilityLabel={copy.slower} onPress={onSlower} style={({ pressed }) => [styles.chip, styles.grow, { backgroundColor: fill, opacity: pressed ? 0.7 : 1 }]}>
        <Text style={[styles.label, { color: ink }]} numberOfLines={1}>{slow ? '0,75×' : copy.slower}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 12, paddingBottom: 12 }, // зачем (закон владельца 13.10 №35): зазор между кнопками >= 12
  chip: { minHeight: 44, borderRadius: 14, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  grow: { flexGrow: 1 },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
});
