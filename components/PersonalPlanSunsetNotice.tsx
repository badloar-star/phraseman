import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  formatPersonalPlanSunsetCountdown,
  splitPersonalPlanSunsetCountdown,
} from '../app/personal_plan_sunset';
import { triLang, type Lang } from '../constants/i18n';

interface PersonalPlanSunsetNoticeProps {
  lang: Lang;
  nowMs: number;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
}

export default function PersonalPlanSunsetNotice({
  lang,
  nowMs,
  backgroundColor,
  borderColor,
  textColor,
  mutedColor,
  accentColor,
}: PersonalPlanSunsetNoticeProps): React.JSX.Element {
  const countdown = formatPersonalPlanSunsetCountdown(nowMs);
  const parts = splitPersonalPlanSunsetCountdown(nowMs);
  const title = triLang(lang, {
    ru: 'Раздел «Планы» будет отключён 20 октября 2026 в 00:00 UTC',
    uk: 'Розділ «Плани» буде вимкнено 20 жовтня 2026 о 00:00 UTC',
    en: 'The "Plans" section will be turned off on October 20, 2026 at 00:00 UTC',
    es: 'La sección «Planes» se cerrará el 20 de octubre de 2026 a las 00:00 UTC',
    'pt-BR': 'A seção «Planos» será encerrada em 20 de outubro de 2026 às 00:00 UTC',
    vi: 'Mục «Kế hoạch» sẽ đóng lúc 00:00 UTC ngày 20 tháng 10 năm 2026',
    id: 'Bagian «Rencana» akan ditutup pada 20 Oktober 2026 pukul 00.00 UTC',
    tr: '«Planlar» bölümü 20 Ekim 2026 saat 00:00 UTC’de kapatılacak',
    pl: 'Sekcja „Plany” zostanie wyłączona 20 października 2026 o 00:00 UTC',
  });
  const remainingLabel = triLang(lang, {
    ru: 'До отключения',
    uk: 'До вимкнення',
    en: 'Time remaining',
    es: 'Tiempo restante',
    'pt-BR': 'Tempo restante',
    vi: 'Thời gian còn lại',
    id: 'Waktu tersisa',
    tr: 'Kalan süre',
    pl: 'Pozostały czas',
  });
  const units = triLang(lang, {
    ru: 'дни  :  часы  :  минуты  :  секунды',
    uk: 'дні  :  години  :  хвилини  :  секунди',
    en: 'days  :  hours  :  minutes  :  seconds',
    es: 'días  :  horas  :  minutos  :  segundos',
    'pt-BR': 'dias  :  horas  :  minutos  :  segundos',
    vi: 'ngày  :  giờ  :  phút  :  giây',
    id: 'hari  :  jam  :  menit  :  detik',
    tr: 'gün  :  saat  :  dakika  :  saniye',
    pl: 'dni  :  godziny  :  minuty  :  sekundy',
  });
  const accessibleRemaining = triLang(lang, {
    ru: `${parts.days} дней, ${parts.hours} часов, ${parts.minutes} минут и ${parts.seconds} секунд`,
    uk: `${parts.days} днів, ${parts.hours} годин, ${parts.minutes} хвилин і ${parts.seconds} секунд`,
    en: `${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes, and ${parts.seconds} seconds`,
    es: `${parts.days} días, ${parts.hours} horas, ${parts.minutes} minutos y ${parts.seconds} segundos`,
    'pt-BR': `${parts.days} dias, ${parts.hours} horas, ${parts.minutes} minutos e ${parts.seconds} segundos`,
    vi: `${parts.days} ngày, ${parts.hours} giờ, ${parts.minutes} phút và ${parts.seconds} giây`,
    id: `${parts.days} hari, ${parts.hours} jam, ${parts.minutes} menit, dan ${parts.seconds} detik`,
    tr: `${parts.days} gün, ${parts.hours} saat, ${parts.minutes} dakika ve ${parts.seconds} saniye`,
    pl: `${parts.days} dni, ${parts.hours} godzin, ${parts.minutes} minut i ${parts.seconds} sekund`,
  });

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${remainingLabel}: ${accessibleRemaining}.`}
      style={[styles.card, { backgroundColor, borderColor }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${accentColor}1F` }]}>
        <Ionicons name="time-outline" size={22} color={accentColor} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        <Text style={[styles.remainingLabel, { color: mutedColor }]}>{remainingLabel}</Text>
        <Text style={[styles.countdown, { color: accentColor }]}>{countdown}</Text>
        <Text style={[styles.units, { color: mutedColor }]}>
          {units}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 116,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, lineHeight: 22, fontWeight: '900' },
  remainingLabel: { marginTop: 8, fontSize: 12, lineHeight: 15, fontWeight: '800' },
  countdown: {
    marginTop: 2,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  units: { marginTop: 2, fontSize: 11, lineHeight: 15, fontWeight: '700' },
});
