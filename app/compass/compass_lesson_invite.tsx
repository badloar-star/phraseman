/**
 * Компас — плашка-зов в сессию. Крыло «Учёба», Волна 2.4.
 *
 * Маленькая плашка «Путаешься? Открыть сессию», которую можно показать в ЛЮБОМ
 * режиме упражнений, когда ученик повторно спотыкается на теме. Сейчас в плане
 * рекомендация урока — мёртвый текст без кнопки; Компас делает её рабочей кнопкой
 * и распространяет на все части (зов в нужную сессию в момент трудности).
 *
 * ИЗОЛЯЦИЯ: рендерит null, если Компас или это крыло выключены. Вызывающий экран
 * монтирует одной строкой и передаёт колбэк навигации — сам компонент в роутер
 * не лезет, остаётся переиспользуемым и безопасным.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import { triLang } from '../../constants/i18n';
import { compassLessonInviteOn } from './compass_flags';
import { COMPASS_LESSON_INVITE, COMPASS_OPEN_SESSION } from './compass_copy';

interface CompassLessonInviteProps {
  /** Показывать ли сейчас (вызывающий решает по числу повторных ошибок на теме). */
  visible: boolean;
  /** Колбэк открытия сессии (навигацию решает вызывающий экран). */
  onOpenSession: () => void;
}

export default function CompassLessonInvite({ visible, onOpenSession }: CompassLessonInviteProps) {
  const { theme: t } = useTheme();
  const { lang } = useLang();

  if (!compassLessonInviteOn() || !visible) return null;

  return (
    <View style={[styles.wrap, { borderLeftColor: t.accent, backgroundColor: t.bgCard }]}>
      <View style={styles.row}>
        <Ionicons name="compass-outline" size={16} color={t.accent} />
        <Text style={[styles.text, { color: t.textSecond }]} numberOfLines={2}>
          {triLang(lang, COMPASS_LESSON_INVITE)}
        </Text>
      </View>
      <TouchableOpacity activeOpacity={0.85} onPress={onOpenSession} style={[styles.btn, { borderColor: t.accent + '66' }]}>
        <Text style={[styles.btnText, { color: t.accent }]}>{triLang(lang, COMPASS_OPEN_SESSION)}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: 12, borderLeftWidth: 3, paddingVertical: 12, paddingHorizontal: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  btn: { alignSelf: 'flex-start', borderRadius: 10, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 14 },
  btnText: { fontSize: 13, fontWeight: '800' },
});
