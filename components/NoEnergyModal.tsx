import React, { memo, useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Pressable,
  InteractionManager,
} from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import { MOTION_SPRING_LEGACY } from '../constants/motion';
import { lessonEnergyMessages } from '../app/lesson_locale_utils';
import { useTheme } from './ThemeContext';
import { useEnergy, useEnergyCountdown } from './EnergyContext';
import { usePremium } from './PremiumContext';
import { useLang } from './LangContext';
import EnergyIcon from './EnergyIcon';
import { hapticTap } from '../hooks/use-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from '../app/events';
import { incrementEnergyZeroCount } from '../app/paywall_personalization';
import PremiumGoldButton from './PremiumGoldButton';
import { navigateAfterModalClose } from '../app/safe_modal_navigation';
import { shouldRenderNoEnergyModal } from '../app/services/no_energy_modal_visibility';
import { triLang, type Lang } from '../constants/i18n';
import type { ThemeMode } from '../constants/theme';
import CompassDepthSurface from './CompassDepthSurface';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';

type NoEnergyModalChrome = {
  glow: string;
  borderColor: string;
  surfaceColors: [string, string, string];
  cardGlowColors: [string, string, string];
  titleColor: string;
  subtitleColor: string;
};

const NO_ENERGY_MODAL_CHROME: Record<ThemeMode, NoEnergyModalChrome> = {
  dark: {
    glow: '#F59E0B',
    borderColor: 'rgba(245,158,11,0.34)',
    surfaceColors: ['rgba(24,36,26,0.88)', 'rgba(10,22,14,0.92)', 'rgba(4,10,7,0.94)'],
    cardGlowColors: ['rgba(245,158,11,0.24)', 'rgba(16,185,129,0.10)', 'transparent'],
    titleColor: '#F4FFF7',
    subtitleColor: '#63E894',
  },
  gold: {
    glow: '#D6B35A',
    borderColor: 'rgba(214,179,90,0.42)',
    surfaceColors: ['rgba(38,31,18,0.90)', 'rgba(20,15,8,0.93)', 'rgba(8,6,3,0.95)'],
    cardGlowColors: ['rgba(214,179,90,0.28)', 'rgba(120,82,24,0.14)', 'transparent'],
    titleColor: '#FFF7DE',
    subtitleColor: '#F4D986',
  },
  coral: {
    glow: '#FF7A66',
    borderColor: 'rgba(255,127,80,0.40)',
    surfaceColors: ['rgba(42,20,22,0.90)', 'rgba(22,9,11,0.93)', 'rgba(10,3,5,0.95)'],
    cardGlowColors: ['rgba(255,122,102,0.28)', 'rgba(255,127,80,0.12)', 'transparent'],
    titleColor: '#FFF1EF',
    subtitleColor: '#FF9A8E',
  },
  minimalDark: {
    glow: '#6EA8FF',
    borderColor: 'rgba(110,168,255,0.32)',
    surfaceColors: ['rgba(19,24,33,0.90)', 'rgba(12,15,22,0.94)', 'rgba(5,6,9,0.96)'],
    cardGlowColors: ['rgba(110,168,255,0.20)', 'rgba(167,139,250,0.08)', 'transparent'],
    titleColor: '#F5F7FB',
    subtitleColor: '#A7C7FF',
  },
  business: {
    glow: '#0095F6',
    borderColor: 'rgba(255,255,255,0.12)',
    surfaceColors: ['rgba(18,18,18,0.90)', 'rgba(10,10,10,0.94)', 'rgba(0,0,0,0.96)'],
    cardGlowColors: ['rgba(0,149,246,0.10)', 'rgba(0,149,246,0.05)', 'transparent'],
    titleColor: '#F5F5F5',
    subtitleColor: '#737373',
  },
  businessLight: {
    glow: '#0095F6',
    borderColor: 'rgba(0,0,0,0.10)',
    surfaceColors: ['rgba(255,255,255,0.98)', 'rgba(250,250,250,0.96)', 'rgba(239,239,239,0.98)'],
    cardGlowColors: ['rgba(0,149,246,0.10)', 'rgba(0,149,246,0.05)', 'transparent'],
    titleColor: '#262626',
    subtitleColor: '#8E8E8E',
  },
  midnight: {
    glow: '#8FA0FF',
    borderColor: 'rgba(143,160,255,0.34)',
    surfaceColors: ['rgba(26,29,44,0.9)', 'rgba(13,14,22,0.94)', 'rgba(1,1,2,0.96)'],
    cardGlowColors: ['rgba(91,124,255,0.22)', 'rgba(91,124,255,0.08)', 'transparent'],
    titleColor: '#FFFFFF',
    subtitleColor: '#A9AECB',
  },
  ember: {
    glow: '#FFCC55',
    borderColor: 'rgba(255,204,85,0.34)',
    surfaceColors: ['rgba(35,26,18,0.9)', 'rgba(15,11,7,0.94)', 'rgba(1,1,2,0.96)'],
    cardGlowColors: ['rgba(255,176,61,0.22)', 'rgba(255,176,61,0.08)', 'transparent'],
    titleColor: '#FFFFFF',
    subtitleColor: '#C9B4A4',
  },
  aurora: {
    glow: '#3DE8A6',
    borderColor: 'rgba(61,232,166,0.34)',
    surfaceColors: ['rgba(21,33,27,0.9)', 'rgba(9,15,12,0.94)', 'rgba(1,1,2,0.96)'],
    cardGlowColors: ['rgba(46,230,160,0.22)', 'rgba(46,230,160,0.08)', 'transparent'],
    titleColor: '#FFFFFF',
    subtitleColor: '#A7C0B5',
  },
  volt: {
    glow: '#C6FF34',
    borderColor: 'rgba(198,255,52,0.34)',
    surfaceColors: ['rgba(28,32,16,0.9)', 'rgba(12,14,6,0.94)', 'rgba(1,1,2,0.96)'],
    cardGlowColors: ['rgba(168,232,30,0.22)', 'rgba(168,232,30,0.08)', 'transparent'],
    titleColor: '#FFFFFF',
    subtitleColor: '#BFC6A3',
  },
  candyBlue: {
    glow: '#B2D5E5',
    borderColor: 'rgba(178,213,229,0.34)',
    surfaceColors: ['rgba(18,34,41,0.90)', 'rgba(11,22,27,0.94)', 'rgba(1,2,3,0.96)'],
    cardGlowColors: ['rgba(178,213,229,0.22)', 'rgba(178,213,229,0.08)', 'transparent'],
    titleColor: '#EAF4F8',
    subtitleColor: '#9DB9C4',
  },
  indigo: {
    glow: '#C8C3FF',
    borderColor: 'rgba(200,195,255,0.34)',
    surfaceColors: ['rgba(28,27,46,0.90)', 'rgba(20,19,31,0.94)', 'rgba(1,1,2,0.96)'],
    cardGlowColors: ['rgba(200,195,255,0.22)', 'rgba(200,195,255,0.08)', 'transparent'],
    titleColor: '#F1EFFF',
    subtitleColor: '#B7B3D9',
  },
  vanilla: {
    glow: '#3D4E8F',
    borderColor: 'rgba(42,33,24,0.10)',
    surfaceColors: ['rgba(255,253,244,0.98)', 'rgba(250,244,228,0.96)', 'rgba(244,235,212,0.98)'],
    cardGlowColors: ['rgba(61,78,143,0.10)', 'rgba(61,78,143,0.05)', 'transparent'],
    titleColor: '#2A2118',
    subtitleColor: '#9A8D76',
  },
};

const HERO_ENERGY_ICON_CONTENT_OFFSET = { x: 4, y: 0 } as const;

type EnergyGateArgs = { required: string; have: string };
const ENERGY_GATE_MESSAGES_PT_BR: ((r: EnergyGateArgs) => string)[] = [
  ({ required, have }) => `Para começar agora, você precisa de ${required} ⚡. Disponível: ${have}. Plus remove esse limite.`,
  ({ required, have }) => `Este desafio pede ${required} ⚡ de uma vez. Você tem ${have}. Com Plus, sem espera.`,
];
const ENERGY_GATE_MESSAGES_VI: ((r: EnergyGateArgs) => string)[] = [
  ({ required, have }) => `Để bắt đầu ngay, bạn cần ${required} ⚡. Hiện có: ${have}. Plus gỡ giới hạn này.`,
  ({ required, have }) => `Thử thách này cần ${required} ⚡ cùng lúc. Bạn có ${have}. Với Plus, không cần chờ.`,
];
const ENERGY_GATE_MESSAGES_ID: ((r: EnergyGateArgs) => string)[] = [
  ({ required, have }) => `Untuk mulai sekarang, kamu perlu ${required} ⚡. Tersedia: ${have}. Plus menghapus batas ini.`,
  ({ required, have }) => `Tantangan ini butuh ${required} ⚡ sekaligus. Kamu punya ${have}. Dengan Plus, tanpa menunggu.`,
];
const ENERGY_GATE_MESSAGES_TR: ((r: EnergyGateArgs) => string)[] = [
  ({ required, have }) => `Şimdi başlamak için ${required} ⚡ gerekir. Mevcut: ${have}. Plus bu sınırı kaldırır.`,
  ({ required, have }) => `Bu görev tek seferde ${required} ⚡ ister. Sende ${have} var. Plus ile bekleme yok.`,
];
const ENERGY_GATE_MESSAGES_PL: ((r: EnergyGateArgs) => string)[] = [
  ({ required, have }) => `Aby zacząć teraz, potrzeba ${required} ⚡. Masz: ${have}. Plus znosi ten limit.`,
  ({ required, have }) => `To wyzwanie wymaga ${required} ⚡ naraz. Dostępne: ${have}. Z Plus nie czekasz.`,
];
const ENERGY_GATE_MESSAGES_BY_LANG = {
  ru: [
    ({ required, have }) => `Экзамен требует ${required} ⚡ сразу. Сейчас у тебя: ${have}. С Plus — без лимитов.`,
    ({ required, have }) => `Чтобы начать, нужно ${required} ⚡. У тебя: ${have}. Plus открывает безлимит.`,
  ],
  uk: [
    ({ required, have }) => `Для іспиту потрібно ${required} ⚡ одразу. У вас: ${have}. У Plus — без обмежень.`,
    ({ required, have }) => `Щоб почати зараз, потрібно ${required} ⚡. Доступно: ${have}. Plus прибирає ліміт.`,
  ],
  es: [
    ({ required, have }) => `Para el examen necesitas ${required} ⚡ de golpe. Dispones de: ${have}. Con Plus, sin límites.`,
    ({ required, have }) => `Para empezar ahora necesitas ${required} ⚡. Tienes: ${have}. Plus elimina este límite.`,
  ],
  'pt-BR': ENERGY_GATE_MESSAGES_PT_BR,
  vi: ENERGY_GATE_MESSAGES_VI,
  id: ENERGY_GATE_MESSAGES_ID,
  tr: ENERGY_GATE_MESSAGES_TR,
  pl: ENERGY_GATE_MESSAGES_PL,
} as const satisfies Record<Lang, readonly ((r: EnergyGateArgs) => string)[]>;

interface Props {
  visible: boolean;
  onClose: () => void;
  /**
   * Если задано — текстовая кнопка «Позже» вызывает это.
   * Иначе как раньше: `onBackHome ?? onClose`.
   * Нужно, когда `onClose` только закрывает окно (успех покупки за осколки), а «Понятно»
   * должно выполнить другое действие (например выход с урока).
   */
  onGotIt?: () => void;
  onBackHome?: () => void;
  /** Напр. 8 — экзамен Лингмана: иной текст, не «закончилась» */
  minRequired?: number;
  /** `premium_modal` context: аналитика и тексты. По умолчанию `no_energy`. */
  paywallContext?: string;
  onBeforeOpenPremium?: () => void;
  /**
   * Админ/QA: показать CTA «за осколки» даже при полной базовой энергии (превью в настройках тестера).
   * Покупка тогда вернёт already_full — покажем info-тост.
   */
  qaForceShardCta?: boolean;
  /** Admin/QA preview: render the no-energy UI even for Premium/VIP accounts. */
  qaIgnorePremiumAccess?: boolean;
}

function NoEnergyModal({
  visible,
  onClose,
  onGotIt,
  onBackHome,
  minRequired,
  paywallContext = 'no_energy',
  onBeforeOpenPremium,
  qaForceShardCta = false,
  qaIgnorePremiumAccess = false,
}: Props) {
  const router = useRouter();
  const { theme: t, themeMode, f } = useTheme();
  const art = NO_ENERGY_MODAL_CHROME[themeMode] ?? NO_ENERGY_MODAL_CHROME.dark;
  const graphiteRadius = themeMode === 'minimalDark';
  const isCompassTheme = false;
  const modalRadius = isCompassTheme ? 10 : graphiteRadius ? 8 : 22;
  const buttonRadius = isCompassTheme ? 9 : graphiteRadius ? 6 : 14;
  const paywallCardBg = t.bgCard;
  const { energy, bonusEnergy, maxEnergy, isUnlimited, reload } = useEnergy();
  const { hasPremiumAccess } = usePremium();
  const { lang } = useLang();
  const totalAvailable = energy + bonusEnergy;
  const isGate = minRequired != null && minRequired > 0;
  const modalVisible = shouldRenderNoEnergyModal(visible, hasPremiumAccess, qaIgnorePremiumAccess);
  const { formattedTime } = useEnergyCountdown({ visible: modalVisible });
  const [lineText, setLineText] = useState('');
  /** «Енергія» → закрыть RN Modal → тут же открыть stack modal премиум: нужно не наслаивать окна, иначе на части прошивок «залипают» тачи под экраном. */
  const pendingPremiumContextRef = useRef<string | null>(null);
  const flushPremiumPushRef = useRef<() => void>(() => {});

  const flushPremiumPush = useCallback(() => {
    const ctx = pendingPremiumContextRef.current;
    if (!ctx) return;
    pendingPremiumContextRef.current = null;
    router.push({ pathname: '/premium_modal', params: { context: ctx } } as any);
  }, [router]);

  useEffect(() => {
    flushPremiumPushRef.current = flushPremiumPush;
  }, [flushPremiumPush]);

  const openPremiumAfterClose = () => {
    pendingPremiumContextRef.current = paywallContext;
    (onBeforeOpenPremium ?? onClose)();
  };

  /** Android: Modal.onDismiss из JS по сути не вызывает колбэк — ждём снятия окна и только потом переходим. */
  useEffect(() => {
    if (visible || Platform.OS === 'ios') return;
    if (pendingPremiumContextRef.current === null) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ia = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        if (cancelled) return;
        flushPremiumPushRef.current();
      }, 360);
    });
    return () => {
      cancelled = true;
      ia.cancel();
      if (timer != null) clearTimeout(timer);
    };
  }, [visible]);

  const handleModalDismissIos = Platform.OS === 'ios' ? () => flushPremiumPush() : undefined;

  // ─── Анимации входа и pulse-glow на молнии ──────────────────────────────
  const cardScale  = useRef(new Animated.Value(0.85)).current;
  const cardOp     = useRef(new Animated.Value(0)).current;
  const boltScale  = useRef(new Animated.Value(0)).current;
  const boltShake  = useRef(new Animated.Value(0)).current;
  const haloPulse  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!modalVisible) {
      cardScale.setValue(0.85);
      cardOp.setValue(0);
      boltScale.setValue(0);
      boltShake.setValue(0);
      haloPulse.setValue(0);
      return;
    }
    // Пайволл-персонализация: модалка стала видимой = энергия закончилась.
    incrementEnergyZeroCount();

    // Все запущенные анимации сохраняем в список и останавливаем в cleanup
    // (Fabric: иначе анимация продолжает driver-update view, который уже
    // отдан на размонтаж → NativeAnimatedNodesManager.disconnect crash).
    const running: Animated.CompositeAnimation[] = [];

    const intro = Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, friction: MOTION_SPRING_LEGACY.ui.friction, tension: MOTION_SPRING_LEGACY.ui.tension, useNativeDriver: true }),
      Animated.timing(cardOp, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(120),
        Animated.spring(boltScale, { toValue: 1, friction: MOTION_SPRING_LEGACY.micro.friction, tension: MOTION_SPRING_LEGACY.micro.tension, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(boltShake, { toValue: 1, duration: 70, useNativeDriver: true }),
          Animated.timing(boltShake, { toValue: -1, duration: 70, useNativeDriver: true }),
          Animated.timing(boltShake, { toValue: 0.6, duration: 70, useNativeDriver: true }),
          Animated.timing(boltShake, { toValue: 0, duration: 90, useNativeDriver: true }),
        ]),
      ]),
    ]);
    intro.start();
    running.push(intro);

    // Один мягкий цикл вместо бесконечного pulse молнии.
    const pulse = Animated.sequence([
      Animated.timing(haloPulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(haloPulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]);
    pulse.start();
    running.push(pulse);

    return () => { running.forEach(a => a.stop()); };
  }, [modalVisible, cardScale, cardOp, boltScale, boltShake, haloPulse]);

  const wasOpenRef = useRef(false);
  useLayoutEffect(() => {
    if (!modalVisible) {
      wasOpenRef.current = false;
      setLineText('');
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    // «Нет энергии» в проде = пользователь уже увидел систему; не дублировать отдельным тутором на главной
    void AsyncStorage.setItem('energy_onboarding_shown', '1');
    emitAppEvent('bug_hunt_eligible_check');
    if (isGate && minRequired != null) {
      const list = ENERGY_GATE_MESSAGES_BY_LANG[lang];
      const line = list[Math.floor(Math.random() * list.length)]!({
        required: String(minRequired),
        have: String(totalAvailable),
      });
      setLineText(line);
      return;
    }
    const list = lessonEnergyMessages(lang);
    const raw = list[Math.floor(Math.random() * list.length)] ?? list[0] ?? '';
    setLineText(raw);
  }, [modalVisible, isGate, lang, minRequired, totalAvailable]);

  const recoveryTimeText = formattedTime || triLang(lang, {
    ru: 'несколько минут',
    uk: 'кілька хвилин',
    es: 'unos minutos',
    'pt-BR': 'alguns minutos',
    vi: 'vài phút',
    id: 'beberapa menit',
    tr: 'birkaç dakika',
    pl: 'kilka minut',
  });
  const defaultSubtitle = triLang(lang, {
    ru: `+1 ⚡ вернётся через ${recoveryTimeText}. Хочешь учить без остановок — это Plus.`,
    uk: `+1 ⚡ відновиться через ${recoveryTimeText}. Хочеш безліміт? Тобі в Plus.`,
    es: `+1 ⚡ se recuperará en ${recoveryTimeText}. ¿Quieres energía ilimitada? Prueba Plus.`,
    'pt-BR': `+1 ⚡ volta em ${recoveryTimeText}. Quer energia ilimitada? Experimente Plus.`,
    vi: `+1 ⚡ sẽ hồi lại sau ${recoveryTimeText}. Muốn năng lượng không giới hạn? Hãy thử Plus.`,
    id: `+1 ⚡ pulih dalam ${recoveryTimeText}. Mau energi tanpa batas? Coba Plus.`,
    tr: `+1 ⚡ ${recoveryTimeText} içinde yenilenir. Sınırsız enerji ister misin? Plus'u dene.`,
    pl: `+1 ⚡ wróci za ${recoveryTimeText}. Chcesz energię bez limitu? Wypróbuj Plus.`,
  });
  const gateFallback = isGate && minRequired != null
    ? ENERGY_GATE_MESSAGES_BY_LANG[lang][0]!({ required: String(minRequired), have: String(totalAvailable) })
    : '';
  const showBody = (isGate ? (lineText || gateFallback) : (lineText || defaultSubtitle)).replace(/\{time\}/g, recoveryTimeText);

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="fade"
      onDismiss={handleModalDismissIos}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.72)' }]}>
        {/* Цветной радиальный отблеск над затемнением */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={[art.glow + '22', 'transparent']}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.6 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Тап по фону закрывает модалку */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            hapticTap();
            onClose();
          }}
        />

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : paywallCardBg,
              opacity: cardOp,
              transform: [{ scale: cardScale }],
              shadowColor: isCompassTheme ? '#000' : art.glow,
              shadowOpacity: isCompassTheme ? 0.52 : 0.45,
              shadowRadius: isCompassTheme ? 18 : 24,
              borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : art.borderColor,
              borderRadius: modalRadius,
            },
            isCompassTheme && compassShadow(3),
          ]}
        >
          <LinearGradient
            colors={art.surfaceColors}
            locations={[0, 0.5, 1]}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Внутренний градиент сверху карточки */}
          <LinearGradient
            colors={art.cardGlowColors}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
            style={styles.cardGlow}
            pointerEvents="none"
          />
          {isCompassTheme ? <CompassDepthSurface radius={modalRadius} selected /> : null}

          {/* Hero icon: молния с pulse-масштабом */}
          <Animated.View
            style={[
              styles.boltIcon,
              {
                transform: [
                  { scale: Animated.multiply(boltScale, haloPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] })) },
                  { translateX: boltShake.interpolate({ inputRange: [-1, 1], outputRange: [-3, 3] }) },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.energyHeroIconContent,
                {
                  transform: [
                    { translateX: HERO_ENERGY_ICON_CONTENT_OFFSET.x },
                    { translateY: HERO_ENERGY_ICON_CONTENT_OFFSET.y },
                  ],
                },
              ]}
            >
              <EnergyIcon
                filled
                themeColor={t.gold}
                size={64}
                animateChange={false}
                shouldShake={false}
                themeMode={themeMode}
              />
            </View>
          </Animated.View>

          <Text style={[styles.title, { color: art.titleColor, fontSize: f.h2 }]}>
            {isGate
              ? triLang(lang, {
                  ru: 'Недостаточно энергии',
                  uk: 'Недостатньо енергії',
                  es: 'No tienes suficiente energía',
                  'pt-BR': 'Energia insuficiente',
                  vi: 'Không đủ năng lượng',
                  id: 'Energi tidak cukup',
                  tr: 'Yeterli enerji yok',
                  pl: 'Za mało energii',
                })
              : triLang(lang, {
                  ru: 'Энергия закончилась',
                  uk: 'Енергія закінчилась',
                  es: 'Se acabó la energía',
                  'pt-BR': 'A energia acabou',
                  vi: 'Hết năng lượng',
                  id: 'Energi habis',
                  tr: 'Enerji bitti',
                  pl: 'Energia się skończyła',
                })}
          </Text>
          <Text style={[styles.subtitle, { color: art.subtitleColor, fontSize: f.body }]}>
            {showBody}
          </Text>
          <PremiumGoldButton
            active={modalVisible}
            f={f}
            paywallContext={paywallContext}
            onPress={openPremiumAfterClose}
            shellStyle={{ marginTop: 4 }}
          />
          <TouchableOpacity
            onPress={() => {
              hapticTap();
              if (onGotIt) {
                onGotIt();
                return;
              }
              (onBackHome ?? onClose)();
            }}
            activeOpacity={0.7}
            style={{ paddingVertical: 10, alignItems: 'center', marginTop: 4 }}
          >
            <Text style={{ fontSize: f.body, color: t.textMuted }}>
              {triLang(lang, {
                ru: 'Позже',
                uk: 'Пізніше',
                es: 'Más tarde',
                'pt-BR': 'Mais tarde',
                vi: 'Để sau',
                id: 'Nanti',
                tr: 'Daha sonra',
                pl: 'Później',
              })}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default memo(NoEnergyModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  card: {
    alignSelf: 'center',
    borderRadius: 22,
    borderWidth: 0,
    borderColor: 'rgba(245,158,11,0.34)',
    paddingVertical: 26,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 220,
  },
  boltIcon: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyHeroIconContent: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontWeight: '700', textAlign: 'center' },
  subtitle: { textAlign: 'center', lineHeight: 22 },
  closeBtnWrap: {
    alignSelf: 'stretch',
    width: '100%',
    marginTop: 4,
    borderRadius: 14,
    overflow: 'hidden',
  },
  closeBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  closeBtnText: { fontWeight: '700' },
});
