/**
 * ReferralWelcomeHost — глобальный хост приветствия ПРИГЛАШЁННОГО.
 *
 * Показывает один раз на главной (после онбординга) тем, кто пришёл по реферал-ссылке,
 * объясняя награду: «установи → ВВЕДИ КОД (если ещё не) → пройди 1 урок полностью →
 * получишь 7 дней полного доступа». До этого реферал-ссылка молча вела на главную и
 * новичок не знал про подарок (награда referee = 7 дней, functions/src/referral.ts).
 *
 * Монтируется из app/_layout.tsx внутри OverlayArbiterProvider (рядом с
 * ArenaFriendInviteHost), поэтому НЕ требует правок home.tsx. Видимостью управляет
 * OverlayArbiter через useOverlayVisible('referralWelcome', …) — как требует правило
 * «любая авто-модалка главной идёт через арбитр, не через свой visible» (иначе риск
 * двойного statusBarTranslucent-Modal и фриза, см. components/OverlayArbiter.tsx).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { useOverlayVisible } from './OverlayArbiter';
import { triLang, type Lang } from '../constants/i18n';
import {
  decideReferralWelcome,
  markReferralWelcomeSeen,
} from '../app/referral_welcome_state';

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
  const L = makeL(lang as Lang);

  const [wantShow, setWantShow] = useState(false);
  const visible = useOverlayVisible('referralWelcome', wantShow);

  // Один раз при монтировании решаем, надо ли показывать (читает только AsyncStorage).
  useEffect(() => {
    let alive = true;
    decideReferralWelcome()
      .then((d) => {
        if (alive && d.show) setWantShow(true);
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

  const close = () => {
    setWantShow(false);
    void markReferralWelcomeSeen().catch(() => {});
  };

  const openCodeEntry = () => {
    setWantShow(false);
    void markReferralWelcomeSeen().catch(() => {});
    try {
      router.push('/referral_code_entry' as never);
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
    'Пройди один урок полностью — и получишь 7 дней полного доступа бесплатно. Твой друг тоже получит свои 7 дней.',
    'Пройди один урок повністю — і отримаєш 7 днів повного доступу безкоштовно. Твій друг теж отримає свої 7 днів.',
    'Completa una lección entera y obtienes 7 días de acceso total gratis. Tu amigo también recibe sus 7 días.',
    'Conclua uma lição inteira e ganhe 7 dias de acesso total grátis. Seu amigo também ganha 7 dias.',
    'Hoàn thành một bài học và nhận 7 ngày truy cập đầy đủ miễn phí. Bạn của bạn cũng nhận 7 ngày.',
    'Selesaikan satu pelajaran penuh dan dapatkan 7 hari akses penuh gratis. Temanmu juga dapat 7 hari.',
    'Bir dersi tamamen bitir, 7 gün tam erişim bedava senin olsun. Arkadaşın da kendi 7 gününü alır.',
    'Ukończ całą lekcję i zgarnij 7 dni pełnego dostępu za darmo. Twój znajomy też dostaje swoje 7 dni.',
  );
  const primaryCta = L(
    'Пройти первый урок',
    'Пройти перший урок',
    'Empezar la primera lección',
    'Fazer a primeira lição',
    'Học bài đầu tiên',
    'Mulai pelajaran pertama',
    'İlk dersi yap',
    'Zrób pierwszą lekcję',
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

  const bgCard = (t as { bgCard?: string; bgPrimary?: string }).bgCard
    ?? (t as { bgPrimary?: string }).bgPrimary
    ?? '#15181a';
  const accent = (t as { accent?: string }).accent ?? '#34C759';
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
              <Ionicons name="gift" size={30} color="#fff" />
            </View>
            <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
            <Text style={[styles.body, { color: textSecond }]}>{body}</Text>

            <Pressable
              testID="referral-welcome-primary"
              onPress={close}
              style={[styles.primaryBtn, { backgroundColor: accent }]}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>{primaryCta}</Text>
            </Pressable>

            <Pressable
              testID="referral-welcome-code"
              onPress={openCodeEntry}
              style={styles.secondaryBtn}
              accessibilityRole="button"
            >
              <Text style={[styles.secondaryBtnText, { color: textSecond }]}>{codeCta}</Text>
            </Pressable>
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
