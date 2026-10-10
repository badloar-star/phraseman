/**
 * ReferralWelcomeHost — глобальный хост приветствия ПРИГЛАШЁННОГО.
 *
 * Показывает один раз на главной (после онбординга) тем, кто пришёл по реферал-ссылке,
 * коротко приветствуя и (если код ещё не применён) предлагая ввести код приглашения.
 * зачем: рулетка и награды за рефералов удалены (PM-202, docs/phraseman-2.0/docs/REMOVAL.md) —
 * в тексте НЕТ обещаний призов/ключей/дней Plus; макет OS-REFERRAL-WELCOME-* (Liquid Glass).
 *
 * Монтируется из app/_layout.tsx внутри OverlayArbiterProvider (рядом с
 * другие глобальные hosts), поэтому НЕ требует правок home.tsx. Видимостью управляет
 * OverlayArbiter через useOverlayVisible('referralWelcome', …) — как требует правило
 * «любая авто-модалка главной идёт через арбитр, не через свой visible» (иначе риск
 * двойного statusBarTranslucent-Modal и фриза, см. components/OverlayArbiter.tsx).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { useOverlayVisible } from './OverlayArbiter';
import { triLang, type Lang } from '../constants/i18n';
import {
  decideReferralWelcome,
  markReferralWelcomeSeen,
  type ReferralWelcomeDecision,
} from '../app/referral_welcome_state';
import { useReferralRouletteEnabled } from '../app/referral_roulette_flag';
import { DebugLogger } from '../app/debug-logger';

function makeL(lang: Lang) {
  return (
    ru: string,
    uk: string,
    en: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

// зачем: раньше сбой записи «приветствие показано» глох в немом catch — теперь причина в логе.
function logSeenFailure(e: unknown): void {
  DebugLogger.error('ReferralWelcomeHost:markSeen', e instanceof Error ? e : new Error(String(e)), 'warning');
}

export default function ReferralWelcomeHost() {
  const router = useRouter();
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const reduceMotion = useReduceMotion();
  const { lang } = useLang();
  const rouletteOn = useReferralRouletteEnabled();
  const L = makeL(lang as Lang);

  const [welcomeDecision, setWelcomeDecision] = useState<ReferralWelcomeDecision | null>(null);
  const wantShow = rouletteOn && (welcomeDecision?.show ?? false);
  const visible = useOverlayVisible('referralWelcome', wantShow);

  // Один раз при монтировании решаем, надо ли показывать (читает только AsyncStorage).
  useEffect(() => {
    let alive = true;
    if (!rouletteOn) {
      setWelcomeDecision(null);
      return;
    }
    decideReferralWelcome()
      .then((d) => {
        if (alive && d.show) setWelcomeDecision(d);
      })
      .catch((e) => {
        DebugLogger.error('ReferralWelcomeHost:decide', e instanceof Error ? e : new Error(String(e)), 'warning');
      });
    return () => {
      alive = false;
    };
  }, [rouletteOn]);

  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    if (reduceMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [visible, scale, opacity, reduceMotion]);

  const close = () => {
    setWelcomeDecision(null);
    void markReferralWelcomeSeen().catch(logSeenFailure);
  };

  const openCodeEntry = () => {
    setWelcomeDecision(null);
    void markReferralWelcomeSeen().catch(logSeenFailure);
    try {
      // зачем: экран ввода кода удалён — единый экран рефералов сам выдвигает
      // шит «Код от друга» по параметру enter=1.
      router.push('/referrals?enter=1' as never);
    } catch (e) {
      // роут недоступен — просто закрываем
      DebugLogger.error('ReferralWelcomeHost:openCodeEntry', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  };

  if (!visible) return null;

  const title = L(
    'Тебя пригласили',
    'Тебе запросили',
    'You were invited',
    'Te invitaron',
    'Você foi convidado',
    'Bạn được mời',
    'Kamu diundang',
    'Davet edildin',
    'Masz zaproszenie',
  );
  const body = L(
    'Тебя позвал друг. Начни учиться — мы рады, что ты с нами.',
    'Тебе покликав друг. Починай навчання — ми раді, що ти з нами.',
    'A friend invited you. Start learning — we are glad you are here.',
    'Te invitó un amigo. Empieza a aprender: nos alegra que estés aquí.',
    'Um amigo convidou você. Comece a aprender: que bom ter você aqui.',
    'Một người bạn đã mời bạn. Bắt đầu học nào — chúng tôi rất vui vì có bạn.',
    'Seorang teman mengundangmu. Mulai belajar — kami senang kamu di sini.',
    'Bir arkadaşın seni davet etti. Öğrenmeye başla — burada olmana sevindik.',
    'Zaprosił cię znajomy. Zacznij naukę — cieszymy się, że tu jesteś.',
  );
  const primaryCta = L(
    'Начать учиться',
    'Почати навчання',
    'Start learning',
    'Empezar a aprender',
    'Começar a aprender',
    'Bắt đầu học',
    'Mulai belajar',
    'Öğrenmeye başla',
    'Zacznij naukę',
  );
  const codeCta = L(
    'У меня есть код приглашения',
    'У мене є код запрошення',
    'I have an invite code',
    'Tengo un código de invitación',
    'Tenho um código de convite',
    'Tôi có mã mời',
    'Saya punya kode undangan',
    'Davet kodum var',
    'Mam kod zaproszenia',
  );
  const showCodeCta = welcomeDecision?.needsCodeEntry ?? false;

  const closeLabel = L(
    'Закрыть',
    'Закрити',
    'Close',
    'Cerrar',
    'Fechar',
    'Đóng',
    'Tutup',
    'Kapat',
    'Zamknij',
  );

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <ScrollView style={styles.scrim} contentContainerStyle={styles.scrimContent} decelerationRate="fast">
        <Pressable
          style={styles.backdrop}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        >
          <Pressable onPress={(e) => e.stopPropagation()} accessible={false}>
            <Animated.View
              testID="referral-welcome-card"
              style={[styles.card, { backgroundColor: glass.opaqueSheet, transform: [{ scale }], opacity }]}
            >
              <View style={[styles.badge, { backgroundColor: glass.opaqueControl }]} accessible={false}>
                <Ionicons name="people" size={28} color={glass.lightTint} />
              </View>
              <Text accessibilityRole="header" style={[styles.title, { color: glass.text }]}>{title}</Text>
              <Text style={[styles.body, { color: glass.secondary }]}>{body}</Text>

              <Pressable
                testID="referral-welcome-primary"
                onPress={close}
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: glass.accent, opacity: pressed ? 0.85 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel={primaryCta}
              >
                <Text style={[styles.primaryBtnText, { color: glass.accentInk }]}>{primaryCta}</Text>
              </Pressable>

              {showCodeCta ? (
                <Pressable
                  testID="referral-welcome-code"
                  onPress={openCodeEntry}
                  style={({ pressed }) => [styles.secondaryBtn, { backgroundColor: glass.opaqueControl, opacity: pressed ? 0.85 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel={codeCta}
                >
                  <Text style={[styles.secondaryBtnText, { color: glass.text }]}>{codeCta}</Text>
                </Pressable>
              ) : null}
            </Animated.View>
          </Pressable>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }, // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме
  scrimContent: { flexGrow: 1 },
  backdrop: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  badge: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryBtn: {
    alignSelf: 'stretch',
    minHeight: 52,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignSelf: 'stretch',
    minHeight: 48,
    paddingVertical: 10,
    borderRadius: 16,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
});
