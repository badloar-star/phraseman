// ════════════════════════════════════════════════════════════════════════════
// SeasonLegacyCard.tsx — карточка «Ваши прошлые уроки · Классический курс» на экране «Обучение» (под обложкой Сезона).
//
// зачем (координатор 22.10, обращения: двое за утро не нашли свои прежние уроки — кнопка «Классический курс» слишком незаметна; владелец 21.10 одобрял идею): у тех, у кого есть
// прогресс в классическом курсе, — заметная карточка с прогрессом, ведущая в классический список; у новичков без прогресса её нет (остаётся прежний вход через «Все уроки»).
// Данные — уже загруженные счётчики классических уроков вкладки «Уроки» (новых чтений нет). Вид — в стиле Сезона: плита цвета карточки темы, значок-плитка, полоса прогресса.
// Тексты на 9 языках — черновик, ревью — 10 · ПЕРЕВОДЧИК.
// ════════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { triLang, type Lang } from '../../../constants/i18n';
import { plateBoxShadow } from '../../v2/ShadowSurface';
import V2Pressable from '../../v2/V2Pressable';
import { useLv2Glass } from '../LearningV2Glass';

export type SeasonLegacyProgress = Readonly<{ done: number; total: number; ratio: number }>;

type Props = Readonly<{ lang: Lang; progress: SeasonLegacyProgress; onPress: () => void }>;

export function seasonLegacyTitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Ваши прошлые уроки', uk: 'Ваші попередні уроки', en: 'Your earlier lessons', es: 'Tus lecciones anteriores', 'pt-BR': 'Suas lições anteriores',
    vi: 'Các bài học trước đây của bạn', id: 'Pelajaranmu sebelumnya', tr: 'Önceki derslerin', pl: 'Twoje wcześniejsze lekcje',
  });
}

export function seasonLegacyLine(lang: Lang, done: number, total: number): string {
  return triLang(lang, {
    ru: `Классический курс · ${done} из ${total}`, uk: `Класичний курс · ${done} з ${total}`, en: `Classic course · ${done} of ${total}`, es: `Curso clásico · ${done} de ${total}`,
    'pt-BR': `Curso clássico · ${done} de ${total}`, vi: `Khóa học cổ điển · ${done}/${total}`, id: `Kursus klasik · ${done} dari ${total}`, tr: `Klasik kurs · ${done}/${total}`, pl: `Kurs klasyczny · ${done} z ${total}`,
  });
}

function SeasonLegacyCard({ lang, progress, onPress }: Props) {
  const g = useLv2Glass();
  const pct = Math.max(0, Math.min(1, progress.ratio));
  return (
    <View style={styles.outer}>
      <V2Pressable
        testID="season-legacy-card"
        accessibilityRole="button"
        accessibilityLabel={`${seasonLegacyTitle(lang)}. ${seasonLegacyLine(lang, progress.done, progress.total)}`}
        onPress={onPress}
        scaleTo={0.98}
        style={[styles.card, { backgroundColor: g.opaqueCard, boxShadow: plateBoxShadow(g) }]}
      >
        <View style={[styles.tile, { backgroundColor: g.opaqueControl }]}><Ionicons name="library-outline" size={22} color={g.text} /></View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: g.text }]}>{seasonLegacyTitle(lang)}</Text>
          <Text style={[styles.line, { color: g.secondary }]}>{seasonLegacyLine(lang, progress.done, progress.total)}</Text>
          <View style={[styles.track, { backgroundColor: g.opaqueControl }]}><View style={[styles.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: g.accentGraphic }]} /></View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={g.secondary} />
      </V2Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 16, marginTop: 14 },
  card: { borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  line: { fontSize: 13, lineHeight: 17, marginTop: 1 },
  track: { height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});

export default memo(SeasonLegacyCard);
