/**
 * ComebackBoonHost — модал «День возвращения» (Weekly Boon comeback).
 *
 * Если пользователь пропустил 2+ дня (зона, которую streak_repair не ловит), при
 * возврате — тёплый модал «мы скучали» + бонус: бесплатная заморозка серии на
 * сегодня и осколки. Монтируется из _layout.tsx внутри OverlayArbiterProvider;
 * видимость — через useOverlayVisible('comebackDay', …).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { useOverlayVisible } from './OverlayArbiter';
import { triLang, type Lang } from '../constants/i18n';
import { emitAppEvent } from '../app/events';
import { getTodayKey } from '../app/daily_tasks';
import { checkComebackEligible, markComebackGranted } from '../app/boons/comeback';
import { COMEBACK_REWARD, grantBoonReward } from '../app/boons/boon_rewards';

function makeL(lang: Lang) {
  return (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

export default function ComebackBoonHost() {
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const L = makeL(lang as Lang);

  const [wantShow, setWantShow] = useState(false);
  const grantedRef = useRef(false);
  const visible = useOverlayVisible('comebackDay', wantShow);

  useEffect(() => {
    let alive = true;
    checkComebackEligible()
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
    const todayKey = getTodayKey();
    // Бесплатная заморозка серии на сегодня + осколки.
    try {
      await AsyncStorage.setItem('streak_freeze', JSON.stringify({ active: true, date: todayKey }));
      emitAppEvent('streak_freeze_updated', { active: true });
    } catch {
      // best-effort
    }
    await grantBoonReward(COMEBACK_REWARD, 'boon_comeback');
    await markComebackGranted(todayKey);
  };

  const close = () => {
    void claim();
    setWantShow(false);
  };

  if (!visible) return null;

  const accent = (t as { accent?: string }).accent ?? '#34C759';
  const bgCard = (t as { bgCard?: string; bgPrimary?: string }).bgCard
    ?? (t as { bgPrimary?: string }).bgPrimary ?? '#15181a';
  const textPrimary = (t as { textPrimary?: string }).textPrimary ?? '#FFFFFF';
  const textSecond = (t as { textSecond?: string }).textSecond ?? 'rgba(255,255,255,0.7)';

  const title = L(
    'С возвращением!', 'З поверненням!', '¡Bienvenido de vuelta!', 'Bem-vindo de volta!',
    'Chào mừng trở lại!', 'Selamat datang kembali!', 'Tekrar hoş geldin!', 'Witaj z powrotem!',
  );
  const body = L(
    `Мы скучали. Держи подарок: серия под защитой на сегодня и ${COMEBACK_REWARD.shards} осколков.`,
    `Ми сумували. Тримай подарунок: серія під захистом сьогодні і ${COMEBACK_REWARD.shards} осколків.`,
    `Te extrañamos. Toma un regalo: racha protegida hoy y ${COMEBACK_REWARD.shards} fragmentos.`,
    `Sentimos sua falta. Um presente: sequência protegida hoje e ${COMEBACK_REWARD.shards} fragmentos.`,
    `Nhớ bạn lắm. Quà đây: chuỗi được bảo vệ hôm nay và ${COMEBACK_REWARD.shards} mảnh.`,
    `Kami merindukanmu. Hadiah: streak aman hari ini dan ${COMEBACK_REWARD.shards} serpihan.`,
    `Seni özledik. Hediye: bugün serin korumada ve ${COMEBACK_REWARD.shards} parça.`,
    `Tęskniliśmy. Prezent: seria chroniona dziś i ${COMEBACK_REWARD.shards} odłamków.`,
  );
  const cta = L('Забрать и продолжить', 'Забрати й продовжити', 'Recoger y seguir', 'Pegar e continuar',
    'Nhận và tiếp tục', 'Ambil dan lanjut', 'Al ve devam et', 'Odbierz i kontynuuj');

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            testID="comeback-boon-card"
            style={[styles.card, { backgroundColor: bgCard, transform: [{ scale }], opacity }]}
          >
            <View style={[styles.badge, { backgroundColor: accent }]}>
              <Ionicons name="sparkles" size={30} color="#fff" />
            </View>
            <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
            <Text style={[styles.body, { color: textSecond }]}>{body}</Text>
            <Pressable
              testID="comeback-boon-cta"
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
  badge: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 21, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 22 },
  primaryBtn: { alignSelf: 'stretch', height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
