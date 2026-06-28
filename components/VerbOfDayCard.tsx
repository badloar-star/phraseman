import React, { memo, useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { useLang } from './LangContext';
import { useStudyTarget } from './StudyTargetContext';
import { useTheme } from './ThemeContext';
import {
  getVerbOfDaySnapshot,
  type VerbOfDaySnapshot,
} from '../app/verb_of_day';
import { LESSONS_WITH_IRREGULAR_VERBS } from '../app/irregular_verbs_data';

/**
 * Домашняя карточка «Глагол дня». Автономна: читает снимок (глагол + серия),
 * ведёт в раздел неправильных глаголов. Если глаголов в таргете нет — не рисуется.
 */
function VerbOfDayCard() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const router = useRouter();
  const [snap, setSnap] = useState<VerbOfDaySnapshot | null>(null);

  const refresh = useCallback(() => {
    let cancelled = false;
    void getVerbOfDaySnapshot(studyTarget).then(s => { if (!cancelled) setSnap(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, [studyTarget]);

  useEffect(refresh, [refresh]);
  // Перечитываем при возврате на главный (могли отработать глагол в уроке).
  useFocusEffect(refresh);

  if (!snap || !snap.verb) return null;

  const verb = snap.verb;
  const openVerb = () => {
    hapticTap();
    // Урок, где этот глагол введён; fallback — первый урок с глаголами.
    const sorted = [...LESSONS_WITH_IRREGULAR_VERBS].sort((a, b) => a - b);
    const lessonId = sorted[0] ?? 1;
    router.push({ pathname: '/lesson_irregular_verbs', params: { id: lessonId } } as any);
  };

  const accent = snap.done ? t.correct : t.accent;

  return (
    <TouchableOpacity
      testID="home-verb-of-day-card"
      activeOpacity={0.88}
      onPress={openVerb}
      style={{
        marginHorizontal: 16, marginBottom: 12, borderRadius: 18,
        backgroundColor: t.bgCard, borderWidth: 1, borderColor: accent + '55',
        padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
      }}
    >
      <View style={{
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: accent + '1A', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ionicons name={snap.done ? 'checkmark-done' : 'flash'} size={24} color={accent} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700', letterSpacing: 0.3 }}>
          {triLang(lang, {
            ru: 'Глагол дня', uk: 'Дієслово дня', es: 'Verbo del día', 'pt-BR': 'Verbo do dia',
            vi: 'Động từ trong ngày', id: 'Kata kerja hari ini', tr: 'Günün fiili', pl: 'Czasownik dnia',
          })}
        </Text>
        <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800', marginTop: 2 }} numberOfLines={1}>
          {verb.base} · {verb.past} · {verb.pp}
        </Text>
        {snap.streak > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Ionicons name="flame" size={13} color="#FF9500" />
            <Text style={{ color: t.textSecond, fontSize: f.label, fontWeight: '600' }}>
              {triLang(lang, {
                ru: `Серия: ${snap.streak}`, uk: `Серія: ${snap.streak}`, es: `Racha: ${snap.streak}`,
                'pt-BR': `Sequência: ${snap.streak}`, vi: `Chuỗi: ${snap.streak}`, id: `Rentetan: ${snap.streak}`,
                tr: `Seri: ${snap.streak}`, pl: `Seria: ${snap.streak}`,
              })}
            </Text>
          </View>
        )}
      </View>

      {snap.done ? (
        <Text style={{ color: t.correct, fontSize: f.label, fontWeight: '700' }}>
          {triLang(lang, {
            ru: 'Готово', uk: 'Готово', es: 'Hecho', 'pt-BR': 'Feito',
            vi: 'Xong', id: 'Selesai', tr: 'Tamam', pl: 'Gotowe',
          })}
        </Text>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
      )}
    </TouchableOpacity>
  );
}

export default memo(VerbOfDayCard);
