import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { triLang } from '../../constants/i18n';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import EnergyCostBadge from '../EnergyCostBadge';

type Props = {
  count: number;
  locked: boolean;
  onPress: () => void;
};

export default function MistakePracticeLoopNode({ count, locked, onPress }: Props) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const copy = React.useMemo(() => triLang(lang, {
    ru: { title: 'Ошибки', optional: 'Необязательная петля', plus: ', нужен Plus' },
    uk: { title: 'Помилки', optional: 'Необов’язкова петля', plus: ', потрібен Plus' },
    es: { title: 'Errores', optional: 'Bucle opcional', plus: ', requiere Plus' },
    'pt-BR': { title: 'Erros', optional: 'Loop opcional', plus: ', requer Plus' },
    vi: { title: 'Lỗi sai', optional: 'Vòng lặp tùy chọn', plus: ', cần Plus' },
    id: { title: 'Kesalahan', optional: 'Loop opsional', plus: ', perlu Plus' },
    tr: { title: 'Hatalar', optional: 'İsteğe bağlı döngü', plus: ', Plus gerekir' },
    pl: { title: 'Błędy', optional: 'Opcjonalna pętla', plus: ', wymaga Plus' },
  }), [lang]);
  return (
    <View style={styles.branch}>
      <View style={[styles.stem, { backgroundColor: t.border }]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${copy.title}, ${count}. ${copy.optional}${locked ? copy.plus : ''}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: t.bgCard },
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.icon, { backgroundColor: t.wrongBg }]}>
          <Ionicons name="refresh" size={23} color={t.wrong} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.body }]}>{copy.title} · {count}</Text>
        </View>
        {locked ? (
          <View style={[styles.plus, { backgroundColor: t.accentBg }]}>
            <Text style={[styles.plusText, { color: t.accent }]}>Plus</Text>
          </View>
        ) : <Ionicons name="chevron-forward" size={21} color={t.textMuted} />}
        {!locked ? <EnergyCostBadge testID="mistake-practice-loop-energy-cost" /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  branch: { marginTop: 16, marginBottom: 4, flexDirection: 'row', alignItems: 'center', paddingLeft: 28 },
  stem: { width: 28, height: 2 },
  card: { flex: 1, minHeight: 72, borderRadius: 20, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.82 },
  icon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { fontWeight: '700' },
  plus: { minHeight: 30, borderRadius: 12, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  plusText: { fontWeight: '700', fontSize: 12 },
});
