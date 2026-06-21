/**
 * PerfectWeekHost — модал «Идеальная неделя» (Weekly Boon модификатор perfect_week).
 *
 * Когда все 7 дней недели закрыты (week_days_done) и приз ещё не выдан — крупная
 * награда осколками, раз в неделю. Монтируется из _layout.tsx внутри
 * OverlayArbiterProvider; видимость через useOverlayVisible('perfectWeekReward', …).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { useOverlayVisible } from './OverlayArbiter';
import { triLang, type Lang } from '../constants/i18n';
import { grantBoonReward } from '../app/boons/boon_rewards';
import {
  checkPerfectWeekEligible,
  markPerfectWeekClaimed,
  PERFECT_WEEK_REWARD,
} from '../app/boons/perfect_week';

function makeL(lang: Lang) {
  return (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

export default function PerfectWeekHost() {
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const L = makeL(lang as Lang);

  const [wantShow, setWantShow] = useState(false);
  const grantedRef = useRef(false);
  const visible = useOverlayVisible('perfectWeekReward', wantShow);

  useEffect(() => {
    let alive = true;
    checkPerfectWeekEligible()
      .then((eligible) => {
        if (alive && eligible) setWantShow(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [visible, scale, opacity]);

  const claim = async () => {
    if (grantedRef.current) return;
    grantedRef.current = true;
    await grantBoonReward(PERFECT_WEEK_REWARD, 'boon_perfect_week');
    await markPerfectWeekClaimed();
  };

  const close = () => {
    void claim();
    setWantShow(false);
  };

  if (!visible) return null;

  const accent = (t as { accent?: string }).accent ?? '#FBBF24';
  const bgCard = (t as { bgCard?: string; bgPrimary?: string }).bgCard
    ?? (t as { bgPrimary?: string }).bgPrimary ?? '#15181a';
  const textPrimary = (t as { textPrimary?: string }).textPrimary ?? '#FFFFFF';
  const textSecond = (t as { textSecond?: string }).textSecond ?? 'rgba(255,255,255,0.7)';

  const title = L(
    'Идеальная неделя', 'Ідеальний тиждень', 'Semana perfecta', 'Semana perfeita',
    'Tuần hoàn hảo', 'Minggu sempurna', 'Kusursuz hafta', 'Idealny tydzień',
  );
  const body = L(
    `7 дней подряд. Это привычка. ${PERFECT_WEEK_REWARD.shards} осколков твои.`,
    `7 днів поспіль. Це звичка. ${PERFECT_WEEK_REWARD.shards} осколків твої.`,
    `7 días seguidos. Es un hábito. ${PERFECT_WEEK_REWARD.shards} fragmentos tuyos.`,
    `7 dias seguidos. É hábito. ${PERFECT_WEEK_REWARD.shards} fragmentos seus.`,
    `7 ngày liên tục. Đó là thói quen. ${PERFECT_WEEK_REWARD.shards} mảnh của bạn.`,
    `7 hari berturut. Itu kebiasaan. ${PERFECT_WEEK_REWARD.shards} serpihan milikmu.`,
    `7 gün üst üste. Bu alışkanlık. ${PERFECT_WEEK_REWARD.shards} parça senin.`,
    `7 dni z rzędu. To nawyk. ${PERFECT_WEEK_REWARD.shards} odłamków twoje.`,
  );
  const cta = L('Забрать', 'Забрати', 'Recoger', 'Pegar', 'Nhận', 'Ambil', 'Al', 'Odbierz');

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            testID="perfect-week-card"
            style={[styles.card, { backgroundColor: bgCard, transform: [{ scale }], opacity }]}
          >
            <View style={[styles.badge, { backgroundColor: accent }]}>
              <Ionicons name="star" size={32} color="#fff" />
            </View>
            <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
            <Text style={[styles.body, { color: textSecond }]}>{body}</Text>
            <Pressable
              testID="perfect-week-cta"
              onPress={close}
              style={[styles.primaryBtn, { backgroundColor: accent }]}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>{cta}</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 22, paddingHorizontal: 22, paddingVertical: 26, alignItems: 'center' },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 21, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 22 },
  primaryBtn: { alignSelf: 'stretch', height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
