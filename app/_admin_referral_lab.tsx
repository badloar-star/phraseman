import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
/**
 * _admin_referral_lab.tsx — DEV/QA превью реферальной VIP-модалки.
 *
 * Зачем: ReferralAccessEndedModal (VIP закончился) в обычном приложении
 * показывается только когда у пользователя реально истёк срок доступа —
 * руками это не воспроизвести. Здесь модалка открывается по кнопке, чтобы
 * проверить вёрстку и тексты.
 *
 * зачем удалено превью Activated: модалка ReferralAccessActivatedModal описывала
 * отменённое правило (до 2026-07-25 друг квалифицировался «установил + ввёл код +
 * прошёл урок», дни получали оба). Теперь квалификация — покупка Plus/Pro другом,
 * награда приходит только пригласившему через поток «Награда за друга» со своими
 * экранами; приглашённый отдельно ничего не получает. Модалка удалена целиком.
 *
 * ВАЖНО: изолированное превью. Никаких записей в Firestore/AsyncStorage —
 * только показ компонента. Открывается под ENABLE_DEV_TOOLS из админ-хаба.
 * В продакшн-сборке экран вырезается (см. стаб admin_referral_lab.tsx).
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ENABLE_DEV_TOOLS } from './config';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { ReferralAccessEndedModal } from './referral_access_ended_modal';

export default function AdminReferralLab() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const { theme: t } = useTheme();
  const { lang } = useLang();

  const [endedOpen, setEndedOpen] = useState(false);

  useEffect(() => {
    if (!ENABLE_DEV_TOOLS) {
      router.replace('/(tabs)/settings' as any);
    }
  }, [router]);

  const L = (
    ru: string,
    uk: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang as Lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });

  return (
    <View style={[styles.root, { backgroundColor: t.bgPrimary, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Назад"
          testID="referral-lab-back"
        >
          <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Referral / VIP — модалки</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: t.textSecond }]}>VIP ЗАКОНЧИЛСЯ (Ended)</Text>
        <TouchableOpacity
          onPress={() => {
            hapticTap();
            setEndedOpen(true);
          }}
          activeOpacity={0.8}
          testID="referral-lab-ended"
          style={[styles.row, { backgroundColor: t.bgCard, borderColor: t.border }]}
        >
          <Ionicons name="time-outline" size={22} color="#E5484D" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: t.textPrimary }]}>Доступ истёк</Text>
            <Text style={[styles.rowDesc, { color: t.textMuted }]}>
              Кнопки «Позвать друга» и «Открыть полный доступ».
            </Text>
          </View>
          <Ionicons name="play-outline" size={18} color={t.textMuted} />
        </TouchableOpacity>
      </ScrollView>

      <ReferralAccessEndedModal
        visible={endedOpen}
        onInviteFriend={() => setEndedOpen(false)}
        onOpenFullAccess={() => {
          setEndedOpen(false);
          router.push({
            pathname: '/premium_modal',
            params: { context: 'generic', source: 'admin_referral_lab' },
          } as any);
        }}
        onClose={() => setEndedOpen(false)}
        L={L}
        t={t}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  rowTitle: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  rowDesc: { fontSize: 12, lineHeight: 17 },
});
