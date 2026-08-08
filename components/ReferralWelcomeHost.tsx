/**
 * ReferralWelcomeHost — глобальный хост приветствия ПРИГЛАШЁННОГО.
 *
 * Показывает один раз на главной (после онбординга) тем, кто пришёл по реферал-ссылке,
 * объясняя условие: «установи → ВВЕДИ КОД (если ещё не) → оформи Plus или Pro →
 * пригласившему откроется один прокрут рулетки с призом Plus от 1 до 365 дней».
 *
 * Монтируется из app/_layout.tsx внутри OverlayArbiterProvider (рядом с
 * другие глобальные hosts), поэтому НЕ требует правок home.tsx. Видимостью управляет
 * OverlayArbiter через useOverlayVisible('referralWelcome', …) — как требует правило
 * «любая авто-модалка главной идёт через арбитр, не через свой visible» (иначе риск
 * двойного statusBarTranslucent-Modal и фриза, см. components/OverlayArbiter.tsx).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { useOverlayVisible } from './OverlayArbiter';
import { triLang, type Lang } from '../constants/i18n';
import {
  decideReferralWelcome,
  markReferralWelcomeSeen,
  type ReferralWelcomeDecision,
} from '../app/referral_welcome_state';
import { useReferralRouletteEnabled } from '../app/referral_roulette_flag';

function makeL(lang: Lang) {
  return (
    ru: string,
    uk: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

export default function ReferralWelcomeHost() {
  const router = useRouter();
  const { theme: t } = useTheme();
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
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [rouletteOn]);

  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [visible, scale, opacity]);

  const close = () => {
    setWelcomeDecision(null);
    void markReferralWelcomeSeen().catch(() => {});
  };

  const openCodeEntry = () => {
    setWelcomeDecision(null);
    void markReferralWelcomeSeen().catch(() => {});
    try {
      // зачем: экран ввода кода удалён — единый экран рефералов сам выдвигает
      // шит «Код от друга» по параметру enter=1.
      router.push('/referrals?enter=1' as never);
    } catch {
      /* роут недоступен — просто закрываем */
    }
  };

  if (!visible) return null;

  const title = L(
    'Тебя пригласили — лови подарок',
    'Тебе запросили — лови подарунок',
    'Te invitaron: hay un regalo',
    'Você foi convidado: tem um presente',
    'Bạn được mời — có quà tặng',
    'Kamu diundang — ada hadiah',
    'Davet edildin — bir hediye var',
    'Masz zaproszenie — jest prezent',
  );
  const body = L(
    'Оформи Plus или Pro — пригласивший тебя друг получит ключ. Награда — Plus от 1 дня до 365 дней.',
    'Оформи Plus або Pro — друг, який тебе запросив, отримає ключ. Нагорода — Plus від 1 до 365 днів.',
    'Compra Plus o Pro: quien te invitó recibirá una llave. Recompensa: Plus de 1 a 365 días.',
    'Assine Plus ou Pro: quem convidou você recebe uma chave. Recompensa: Plus de 1 a 365 dias.',
    'Mua Plus hoặc Pro: người mời bạn nhận một chìa khóa. Phần thưởng: Plus từ 1 đến 365 ngày.',
    'Beli Plus atau Pro: teman yang mengundangmu mendapat kunci. Hadiah: Plus 1–365 hari.',
    'Plus veya Pro satın al: seni davet eden arkadaşın bir anahtar kazanır. Ödül: 1–365 gün Plus.',
    'Kup Plus lub Pro: osoba, która cię zaprosiła, dostanie klucz. Nagroda: Plus od 1 do 365 dni.',
  );
  const primaryCta = L(
    'Начать учиться',
    'Почати навчання',
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
    'Tengo un código de invitación',
    'Tenho um código de convite',
    'Tôi có mã mời',
    'Saya punya kode undangan',
    'Davet kodum var',
    'Mam kod zaproszenia',
  );
  const showCodeCta = welcomeDecision?.needsCodeEntry ?? false;

  const bgCard = (t as { bgCard?: string; bgPrimary?: string }).bgCard
    ?? (t as { bgPrimary?: string }).bgPrimary
    ?? '#15181a';
  const accent = (t as { accent?: string }).accent ?? '#34C759';
  const accentText = (t as { correctText?: string }).correctText ?? '#07110A';
  const textPrimary = (t as { textPrimary?: string }).textPrimary ?? '#FFFFFF';
  const textSecond = (t as { textSecond?: string; textSecondary?: string }).textSecond
    ?? (t as { textSecondary?: string }).textSecondary
    ?? 'rgba(255,255,255,0.7)';

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            testID="referral-welcome-card"
            style={[styles.card, { backgroundColor: bgCard, transform: [{ scale }], opacity }]}
          >
            <View style={[styles.badge, { backgroundColor: accent }]}>
              <Ionicons name="gift" size={30} color={accentText} />
            </View>
            <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
            <Text style={[styles.body, { color: textSecond }]}>{body}</Text>

            <Pressable
              testID="referral-welcome-primary"
              onPress={close}
              style={[styles.primaryBtn, { backgroundColor: accent }]}
              accessibilityRole="button"
            >
              <Text style={[styles.primaryBtnText, { color: accentText }]}>{primaryCta}</Text>
            </Pressable>

            {showCodeCta ? (
              <Pressable
                testID="referral-welcome-code"
                onPress={openCodeEntry}
                style={styles.secondaryBtn}
                accessibilityRole="button"
              >
                <Text style={[styles.secondaryBtnText, { color: textSecond }]}>{codeCta}</Text>
              </Pressable>
            ) : null}
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: 'center',
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 22,
  },
  primaryBtn: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryBtn: {
    alignSelf: 'stretch',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
