// Видимый прогресс ранга на главном экране Арены.
//
// Показывает «до повышения N звёзд» + заполненный бар (доля звёзд к следующему рангу).
// На потолке (Легенда III) — особый статус «Потолок · набирай SR».
//
// Лёгкий, анимированный бар на Reanimated. Данные считает чистый модуль arena_rank_progress.

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { triLang, type Lang } from '../constants/i18n';
import { computeRankProgress } from '../app/arena_rank_progress';

interface ArenaRankProgressBarProps {
  rankIndex: number;
  stars: number;
  lang: Lang;
  /** Цвет акцента/заливки. */
  accent: string;
  /** Цвет приглушённого текста. */
  muted: string;
  /** Цвет фона дорожки бара. */
  trackColor: string;
}

function starsLabel(n: number, lang: Lang): string {
  return triLang(lang, {
    ru: `${n} ${n === 1 ? 'звезда' : n >= 2 && n <= 4 ? 'звезды' : 'звёзд'} до повышения`,
    uk: `${n} ${n === 1 ? 'зірка' : n >= 2 && n <= 4 ? 'зірки' : 'зірок'} до підвищення`,
    es: `${n} ${n === 1 ? 'estrella' : 'estrellas'} para subir`,
    'pt-BR': `${n} ${n === 1 ? 'estrela' : 'estrelas'} para subir`,
    vi: `${n} sao để thăng hạng`,
    id: `${n} bintang untuk naik`,
    tr: `Yükselmeye ${n} yıldız`,
    pl: `${n} ${n === 1 ? 'gwiazdka' : 'gwiazdek'} do awansu`,
  });
}

function ceilingLabel(lang: Lang): string {
  return triLang(lang, {
    ru: 'Потолок · набирай сезонный рейтинг',
    uk: 'Стеля · набирай сезонний рейтинг',
    es: 'Tope · acumula rating de temporada',
    'pt-BR': 'Topo · acumule rating da temporada',
    vi: 'Đỉnh · tích điểm mùa giải',
    id: 'Puncak · kumpulkan rating musim',
    tr: 'Tavan · sezon puanı topla',
    pl: 'Sufit · zdobywaj ranking sezonu',
  });
}

function ArenaRankProgressBar({
  rankIndex,
  stars,
  lang,
  accent,
  muted,
  trackColor,
}: ArenaRankProgressBarProps) {
  const progress = computeRankProgress(rankIndex, stars);
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(progress.ratio, { duration: 520, easing: Easing.out(Easing.cubic) });
  }, [fill, progress.ratio]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  const label = progress.atCeiling ? ceilingLabel(lang) : starsLabel(progress.starsToNext, lang);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: muted }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <Reanimated.View style={[styles.fill, { backgroundColor: accent }, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 320, alignSelf: 'center', gap: 5, marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2, textAlign: 'center' },
  track: { height: 7, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
});

export default React.memo(ArenaRankProgressBar);
