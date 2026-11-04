/**
 * Закрытый рангом раздел (владелец 30.10, «Главная Free по рангам»): недоступный deep link / вкладка новичка показывает краткое
 * объяснение «нужен ранг N» и кнопку «К занятиям» — без обводок и мелких пояснений под названием.
 * Лог: [RANK-GATE] locked_screen.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useLang } from '../../LangContext';
import { triLang } from '../../../constants/i18n';
import { V2_TYPE } from '../../../constants/v2Style';
import { useV2Palette } from '../../v2/useV2Palette';
import V2Pressable from '../../v2/V2Pressable';
import type { RankAccessSurface } from '../../../shared/rank_access_contract';

type Props = Readonly<{ surface: RankAccessSurface; minimumRank: number }>;

export default function RankLockedSection({ surface, minimumRank }: Props) {
  const { lang } = useLang();
  const palette = useV2Palette();
  const router = useRouter();
  useEffect(() => { console.log('[RANK-GATE] locked_screen', JSON.stringify({ surface, minimumRank })); /* guard-ok: разовый журнал открытия закрытого экрана */ }, [surface, minimumRank]);
  const title = triLang(lang, {
    ru: `Откроется с ранга ${minimumRank}`, uk: `Відкриється з рангу ${minimumRank}`, en: `Opens at rank ${minimumRank}`, es: `Se abre en el rango ${minimumRank}`,
    'pt-BR': `Abre no rank ${minimumRank}`, vi: `Mở ở hạng ${minimumRank}`, id: `Terbuka di peringkat ${minimumRank}`, tr: `${minimumRank}. rütbede açılır`, pl: `Otworzy się na randze ${minimumRank}`,
  });
  const cta = triLang(lang, { ru: 'К занятиям', uk: 'До занять', en: 'To lessons', es: 'A las lecciones', 'pt-BR': 'Às lições', vi: 'Đến bài học', id: 'Ke pelajaran', tr: 'Derslere', pl: 'Do lekcji' });
  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]} accessibilityRole="summary">
      <Text style={[V2_TYPE.title, styles.title, { color: palette.text }]}>{title}</Text>
      <V2Pressable
        accessibilityRole="button"
        accessibilityLabel={cta}
        onPress={() => { console.log('[RANK-GATE] locked_screen cta lessons', JSON.stringify({ surface })); router.replace('/(tabs)/lessons' as never); /* guard-ok: тап */ }}
        style={[styles.cta, { backgroundColor: palette.cta }]}
      >
        <Text style={[styles.ctaText, { color: palette.ctaText }]}>{cta}</Text>
      </V2Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 20 },
  title: { textAlign: 'center' },
  cta: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 999 },
  ctaText: { fontSize: 16, fontWeight: '700' },
});
