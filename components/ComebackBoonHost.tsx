/**
 * ComebackBoonHost — модал «День возвращения» (Weekly Boon comeback).
 *
 * Если пользователь пропустил 2+ дня (зона, которую streak_repair не ловит), при
 * возврате — тёплый модал «мы скучали» + бонус: бесплатная заморозка серии на
 * сегодня и осколки. Монтируется из _layout.tsx внутри OverlayArbiterProvider;
 * видимость — через useOverlayVisible('comebackDay', …).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { useOverlayVisible } from './OverlayArbiter';
import { triLang, type Lang } from '../constants/i18n';
import { emitAppEvent } from '../app/events';
import { getTodayKey } from '../app/daily_tasks';
import { checkComebackEligible, markComebackGranted } from '../app/boons/comeback';
import { COMEBACK_REWARD, grantBoonReward } from '../app/boons/boon_rewards';
import { isStreakFreezeActiveToday, parseStreakFreeze } from '../app/streak_freeze';
import { weeklyBoonIconSource } from '../constants/boonIconAssets';

function makeL(lang: Lang) {
  return (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

export default function ComebackBoonHost() {
  const { theme: t, themeMode } = useTheme();
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
    // Повторная проверка против стора (защита от двойной выдачи, если хост
    // перемонтировался или приложение закрылось до markComebackGranted).
    if (!(await checkComebackEligible())) return;
    const todayKey = getTodayKey();
    // Бесплатная заморозка серии на сегодня + осколки. Не перетираем уже активную
    // заморозку (платную) — если сегодня уже защищён, оставляем как есть.
    try {
      const existing = parseStreakFreeze(await AsyncStorage.getItem('streak_freeze'));
      if (!isStreakFreezeActiveToday(existing, todayKey)) {
        await AsyncStorage.setItem('streak_freeze', JSON.stringify({ active: true, date: todayKey }));
        emitAppEvent('streak_freeze_updated', { active: true });
      }
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
  const iconSource = weeklyBoonIconSource('comeback', themeMode);

  const title = L(
    'Ты вернулся. Хорошо.', 'Ти повернувся. Добре.', 'Volviste. Bien.', 'Você voltou. Que bom.',
    'Bạn quay lại rồi. Tốt.', 'Kamu kembali. Bagus.', 'Geri döndün. Güzel.', 'Wróciłeś. Dobrze.',
  );
  const body = L(
    `Серия под защитой и ${COMEBACK_REWARD.shards} осколков твои. Продолжим?`,
    `Серія під захистом і ${COMEBACK_REWARD.shards} осколків твої. Продовжимо?`,
    `Racha protegida y ${COMEBACK_REWARD.shards} fragmentos son tuyos. ¿Seguimos?`,
    `Sequência protegida e ${COMEBACK_REWARD.shards} fragmentos são seus. Vamos?`,
    `Chuỗi được bảo vệ và ${COMEBACK_REWARD.shards} mảnh là của bạn. Tiếp nhé?`,
    `Streak aman dan ${COMEBACK_REWARD.shards} serpihan jadi milikmu. Lanjut?`,
    `Serin korumada ve ${COMEBACK_REWARD.shards} parça senin. Devam mı?`,
    `Seria chroniona i ${COMEBACK_REWARD.shards} odłamków są twoje. Działamy?`,
  );
  const cta = L('Продолжить', 'Продовжити', 'Continuar', 'Continuar',
    'Tiếp tục', 'Lanjut', 'Devam et', 'Kontynuuj');

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            testID="comeback-boon-card"
            style={[styles.card, { backgroundColor: bgCard, transform: [{ scale }], opacity }]}
          >
            <View style={styles.badge}>
              <Image source={iconSource} resizeMode="contain" style={styles.boonIcon} />
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
  badge: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  boonIcon: { width: 76, height: 76 },
  title: { fontSize: 21, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 22 },
  primaryBtn: { alignSelf: 'stretch', height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
