import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
/**
 * _admin_referral_lab.tsx — DEV/QA превью реферальных VIP-модалок.
 *
 * Зачем: модалки ReferralAccessActivatedModal (VIP открылся) и
 * ReferralAccessEndedModal (VIP закончился) в обычном приложении показываются
 * только когда друзья реально выполнили условие или истёк срок доступа. Руками
 * это не воспроизвести. Здесь обе модалки открываются с разным числом дней и
 * друзей, чтобы проверить вёрстку и тексты.
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
import { ReferralAccessActivatedModal } from './referral_access_activated_modal';
import { ReferralAccessEndedModal } from './referral_access_ended_modal';

type ActivatedPreview = { grantedDays: number; friendsCount: number; untilLabel?: string };

const ACTIVATED_VARIANTS: readonly ActivatedPreview[] = [
  { grantedDays: 7, friendsCount: 1, untilLabel: 'до 17 июня' },
  { grantedDays: 14, friendsCount: 2, untilLabel: 'до 24 июня' },
  { grantedDays: 30, friendsCount: 5, untilLabel: 'до 10 июля' },
];

export default function AdminReferralLab() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const { theme: t } = useTheme();
  const { lang } = useLang();

  const [activated, setActivated] = useState<ActivatedPreview | null>(null);
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
        <Text style={[styles.sectionLabel, { color: t.textSecond }]}>VIP ОТКРЫЛСЯ (Activated)</Text>
        {ACTIVATED_VARIANTS.map((v) => (
          <TouchableOpacity
            key={v.grantedDays}
            onPress={() => {
              hapticTap();
              setActivated(v);
            }}
            activeOpacity={0.8}
            testID={`referral-lab-activated-${v.grantedDays}`}
            style={[styles.row, { backgroundColor: t.bgCard, borderColor: t.border }]}
          >
            <Ionicons name="gift" size={22} color={t.accent} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: t.textPrimary }]}>
                {v.grantedDays} дней · {v.friendsCount}{' '}
                {v.friendsCount === 1 ? 'друг' : 'друга'}
              </Text>
              <Text style={[styles.rowDesc, { color: t.textMuted }]}>{v.untilLabel}</Text>
            </View>
            <Ionicons name="play-outline" size={18} color={t.textMuted} />
          </TouchableOpacity>
        ))}

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

      <ReferralAccessActivatedModal
        visible={activated !== null}
        grantedDays={activated?.grantedDays ?? 0}
        friendsCount={activated?.friendsCount ?? 0}
        untilLabel={activated?.untilLabel}
        onClose={() => setActivated(null)}
        L={L}
        t={t}
      />

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
