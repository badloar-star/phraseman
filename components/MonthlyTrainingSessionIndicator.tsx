import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import type { MonthlyTrainingSessionQuotaResult } from '../app/monthly_training_sessions';

type Props = Readonly<{
  quota: MonthlyTrainingSessionQuotaResult;
  textColor: string;
  mutedColor: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** Opt-in text role for hosts that normalize their own preference scale. */
  textMetrics?: Readonly<{ fontSize: number; lineHeight: number }>;
}>;

/** Shared visible state for free card and speaking training sessions. */
export default function MonthlyTrainingSessionIndicator({
  quota,
  textColor,
  mutedColor,
  style,
  testID = 'monthly-training-session-indicator',
  textMetrics,
}: Props) {
  const { lang } = useLang();
  const label = useMemo(() => {
    if (quota.status === 'waiting') {
      return triLang(lang, {
        ru: 'Проверяем месячный лимит тренировок…', uk: 'Перевіряємо місячний ліміт тренувань…',
        en: 'Checking the monthly training limit…', es: 'Comprobando el límite mensual de entrenamientos…',
        'pt-BR': 'Verificando o limite mensal de treinos…', vi: 'Đang kiểm tra giới hạn luyện tập hàng tháng…',
        id: 'Memeriksa batas latihan bulanan…', tr: 'Aylık çalışma limiti kontrol ediliyor…', pl: 'Sprawdzamy miesięczny limit treningów…',
      });
    }
    if (quota.status === 'exhausted') {
      return triLang(lang, {
        ru: '30 из 30 тренировок в этом месяце использованы. Лимит обновится в следующем месяце.',
        uk: '30 з 30 тренувань цього місяця використано. Ліміт оновиться наступного місяця.',
        en: 'All 30 training sessions for this month have been used. The limit resets next month.',
        es: 'Ya usaste las 30 sesiones de este mes. El límite se renovará el próximo mes.',
        'pt-BR': 'As 30 sessões deste mês foram usadas. O limite será renovado no próximo mês.',
        vi: 'Bạn đã dùng hết 30 lượt luyện tập tháng này. Giới hạn sẽ đặt lại vào tháng sau.',
        id: '30 sesi bulan ini sudah digunakan. Batas akan diperbarui bulan depan.',
        tr: 'Bu ayın 30 çalışmasının tamamı kullanıldı. Limit gelecek ay yenilenecek.',
        pl: 'Wykorzystano wszystkie 30 treningów w tym miesiącu. Limit odnowi się w przyszłym miesiącu.',
      });
    }
    const remaining = Math.max(0, quota.limit - quota.used);
    return triLang(lang, {
      ru: `Осталось ${remaining} из ${quota.limit} тренировок в этом месяце`,
      uk: `Залишилося ${remaining} з ${quota.limit} тренувань цього місяця`,
      en: `${remaining} of ${quota.limit} training sessions left this month`,
      es: `Quedan ${remaining} de ${quota.limit} sesiones este mes`,
      'pt-BR': `Restam ${remaining} de ${quota.limit} sessões neste mês`,
      vi: `Còn ${remaining} trong ${quota.limit} lượt luyện tập tháng này`,
      id: `Tersisa ${remaining} dari ${quota.limit} sesi bulan ini`,
      tr: `Bu ay ${quota.limit} çalışmadan ${remaining} tanesi kaldı`,
      pl: `Zostało ${remaining} z ${quota.limit} treningów w tym miesiącu`,
    });
  }, [lang, quota.limit, quota.status, quota.used]);

  return (
    <View testID={testID} accessibilityLiveRegion="polite" style={[styles.wrap, style]}>
      <Text style={textMetrics
        ? [styles.text, { color: quota.status === 'exhausted' ? mutedColor : textColor }, textMetrics]
        : [styles.text, { color: quota.status === 'exhausted' ? mutedColor : textColor }]}
      >{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  text: { fontSize: 12, lineHeight: 17, fontWeight: '800', textAlign: 'center' },
});
