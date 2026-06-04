import React, { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
  Animated,
  Easing,
  Platform,
  InteractionManager,
} from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import { lessonEnergyMessages } from '../app/lesson_locale_utils';
import { useTheme } from './ThemeContext';
import { useEnergy } from './EnergyContext';
import { usePremium } from './PremiumContext';
import { useLang } from './LangContext';
import EnergyIcon from './EnergyIcon';
import { hapticTap, hapticWarning } from '../hooks/use-haptics';
import { getShardsBalance } from '../app/shards_system';
import {
  energyRefillShardCost,
  refillEnergyWithShards,
  toastEnergyRefilledWithShards,
} from '../app/energy_shard_refill';
import { oskolokImageForPackShards } from '../app/oskolok';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from '../app/events';
import { incrementEnergyZeroCount } from '../app/paywall_personalization';
import PremiumGoldButton from './PremiumGoldButton';
import { navigateAfterModalClose } from '../app/safe_modal_navigation';
import { paywallGlassColor } from './paywallGlass';
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
  neon: {
    glow: '#C8FF00',
    borderColor: 'rgba(200,255,0,0.36)',
    surfaceColors: ['rgba(30,36,16,0.88)', 'rgba(16,22,8,0.92)', 'rgba(5,8,3,0.94)'],
    cardGlowColors: ['rgba(200,255,0,0.26)', 'rgba(0,255,170,0.10)', 'transparent'],
    titleColor: '#FAFFE8',
    subtitleColor: '#C8FF00',
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
    borderColor: 'rgba(255,100,100,0.40)',
    surfaceColors: ['rgba(42,20,22,0.90)', 'rgba(22,9,11,0.93)', 'rgba(10,3,5,0.95)'],
    cardGlowColors: ['rgba(255,122,102,0.28)', 'rgba(255,100,100,0.12)', 'transparent'],
    titleColor: '#FFF1EF',
    subtitleColor: '#FF9A8E',
  },
  minimalLight: {
    glow: '#D8C49C',
    borderColor: 'rgba(106,83,52,0.34)',
    surfaceColors: ['rgba(255,253,246,0.92)', 'rgba(243,236,220,0.94)', 'rgba(232,222,203,0.96)'],
    cardGlowColors: ['rgba(255,246,220,0.34)', 'rgba(243,236,220,0.18)', 'transparent'],
    titleColor: '#171615',
    subtitleColor: '#273044',
  },
  minimalDark: {
    glow: '#6EA8FF',
    borderColor: 'rgba(110,168,255,0.32)',
    surfaceColors: ['rgba(19,24,33,0.90)', 'rgba(12,15,22,0.94)', 'rgba(5,6,9,0.96)'],
    cardGlowColors: ['rgba(110,168,255,0.20)', 'rgba(167,139,250,0.08)', 'transparent'],
    titleColor: '#F5F7FB',
    subtitleColor: '#A7C7FF',
  },
  compass: {
    glow: '#F2C48D',
    borderColor: 'rgba(242,196,141,0.34)',
    surfaceColors: ['rgba(23,20,16,0.90)', 'rgba(12,10,7,0.94)', 'rgba(2,3,4,0.96)'],
    cardGlowColors: ['rgba(242,196,141,0.22)', 'rgba(242,196,141,0.08)', 'transparent'],
    titleColor: '#FFF8E8',
    subtitleColor: '#D8D2C8',
  },
};

type EnergyGateArgs = { required: string; have: string };
const ENERGY_GATE_MESSAGES_PT_BR: ((r: EnergyGateArgs) => string)[] = [
  ({ required, have }) => `Para começar agora, você precisa de ${required} ⚡. Disponível: ${have}. Premium remove esse limite.`,
  ({ required, have }) => `Este desafio pede ${required} ⚡ de uma vez. Você tem ${have}. Com Premium, sem espera.`,
];
const ENERGY_GATE_MESSAGES_VI: ((r: EnergyGateArgs) => string)[] = [
  ({ required, have }) => `Để bắt đầu ngay, bạn cần ${required} ⚡. Hiện có: ${have}. Premium gỡ giới hạn này.`,
  ({ required, have }) => `Thử thách này cần ${required} ⚡ cùng lúc. Bạn có ${have}. Với Premium, không cần chờ.`,
];
const ENERGY_GATE_MESSAGES_ID: ((r: EnergyGateArgs) => string)[] = [
  ({ required, have }) => `Untuk mulai sekarang, kamu perlu ${required} ⚡. Tersedia: ${have}. Premium menghapus batas ini.`,
  ({ required, have }) => `Tantangan ini butuh ${required} ⚡ sekaligus. Kamu punya ${have}. Dengan Premium, tanpa menunggu.`,
];
const ENERGY_GATE_MESSAGES_TR: ((r: EnergyGateArgs) => string)[] = [
  ({ required, have }) => `Şimdi başlamak için ${required} ⚡ gerekir. Mevcut: ${have}. Premium bu sınırı kaldırır.`,
  ({ required, have }) => `Bu görev tek seferde ${required} ⚡ ister. Sende ${have} var. Premium ile bekleme yok.`,
];
const ENERGY_GATE_MESSAGES_PL: ((r: EnergyGateArgs) => string)[] = [
  ({ required, have }) => `Aby zacząć teraz, potrzeba ${required} ⚡. Masz: ${have}. Premium znosi ten limit.`,
  ({ required, have }) => `To wyzwanie wymaga ${required} ⚡ naraz. Dostępne: ${have}. Z Premium nie czekasz.`,
];
const ENERGY_GATE_MESSAGES_BY_LANG = {
  ru: [
    ({ required, have }) => `Для экзамена нужно ${required} ⚡ сразу. У вас: ${have}. С Premium — без ограничений.`,
    ({ required, have }) => `Чтобы начать сейчас, нужно ${required} ⚡. Доступно: ${have}. Premium снимает лимит.`,
  ],
  uk: [
    ({ required, have }) => `Для іспиту потрібно ${required} ⚡ одразу. У вас: ${have}. У Premium — без обмежень.`,
    ({ required, have }) => `Щоб почати зараз, потрібно ${required} ⚡. Доступно: ${have}. Premium прибирає ліміт.`,
  ],
  es: [
    ({ required, have }) => `Para el examen necesitas ${required} ⚡ de golpe. Dispones de: ${have}. Con Premium, sin límites.`,
    ({ required, have }) => `Para empezar ahora necesitas ${required} ⚡. Tienes: ${have}. Premium elimina este límite.`,
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
   * Если задано — основная кнопка («Понятно» / «На главную») вызывает это.
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

export default function NoEnergyModal({
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
  const isCompassTheme = themeMode === 'compass';
  const modalRadius = isCompassTheme ? 10 : graphiteRadius ? 8 : 22;
  const buttonRadius = isCompassTheme ? 9 : graphiteRadius ? 6 : 14;
  const paywallCardBg = paywallGlassColor(t.bgCard, themeMode, 'card');
  const { formattedTime, energy, bonusEnergy, maxEnergy, isUnlimited, reload } = useEnergy();
  const { hasPremiumAccess } = usePremium();
  const { lang } = useLang();
  const totalAvailable = energy + bonusEnergy;
  const isGate = minRequired != null && minRequired > 0;
  const modalVisible = shouldRenderNoEnergyModal(visible, hasPremiumAccess, qaIgnorePremiumAccess);
  const [lineText, setLineText] = useState('');
  const [shardBusy, setShardBusy] = useState(false);

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

  const shardCost = energyRefillShardCost(maxEnergy);
  /** Докупка базы за осколки: не скрываем при гейте экзамена (8⚡ при max базы < 8 — база + бонус всё равно могут дотянуть).
   * В __DEV__ при открытой модалке всегда показываем CTA (превью с полной базой иначе выглядит как «пропала кнопка»). */
  const showShardRestore =
    !isUnlimited &&
    (qaForceShardCta || energy < maxEnergy || (__DEV__ && visible));

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
      Animated.spring(cardScale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
      Animated.timing(cardOp, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(120),
        Animated.spring(boltScale, { toValue: 1, friction: 4, tension: 130, useNativeDriver: true }),
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

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(haloPulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(haloPulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
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
    hapticWarning();
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
    ru: `+1 ⚡ восстановится через ${recoveryTimeText}. Хочешь безлимит? Тебе в Premium.`,
    uk: `+1 ⚡ відновиться через ${recoveryTimeText}. Хочеш безліміт? Тобі в Premium.`,
    es: `+1 ⚡ se recuperará en ${recoveryTimeText}. ¿Quieres energía ilimitada? Prueba Premium.`,
    'pt-BR': `+1 ⚡ volta em ${recoveryTimeText}. Quer energia ilimitada? Experimente Premium.`,
    vi: `+1 ⚡ sẽ hồi lại sau ${recoveryTimeText}. Muốn năng lượng không giới hạn? Hãy thử Premium.`,
    id: `+1 ⚡ pulih dalam ${recoveryTimeText}. Mau energi tanpa batas? Coba Premium.`,
    tr: `+1 ⚡ ${recoveryTimeText} içinde yenilenir. Sınırsız enerji ister misin? Premium'u dene.`,
    pl: `+1 ⚡ wróci za ${recoveryTimeText}. Chcesz energię bez limitu? Wypróbuj Premium.`,
  });
  const gateFallback = isGate && minRequired != null
    ? ENERGY_GATE_MESSAGES_BY_LANG[lang][0]!({ required: String(minRequired), have: String(totalAvailable) })
    : '';
  const showBody = (isGate ? (lineText || gateFallback) : (lineText || defaultSubtitle)).replace(/\{time\}/g, recoveryTimeText);

  const onRestoreWithShards = async () => {
    if (shardBusy || !showShardRestore) return;
    setShardBusy(true);
    try {
      const r = await refillEnergyWithShards({
        maxEnergy,
        baseEnergy: energy,
        isUnlimited,
      });
      if (r.ok) {
        toastEnergyRefilledWithShards();
        await reload();
        onClose();
        return;
      }
      if (r.reason === 'insufficient_shards') {
        const bal = await getShardsBalance();
        navigateAfterModalClose(
          onClose,
          () => router.push({
            pathname: '/shards_shop',
            params: { need: String(Math.max(0, shardCost - bal)), source: 'no_energy_modal' },
          } as any),
        );
        return;
      }
      if (r.reason === 'already_full' || r.reason === 'unlimited') {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu:
            'Базовая энергия уже на максимуме — потратьте ⚡ в уроке или квизе, затем снова откройте превью, чтобы проверить покупку за осколки.',
          messageUk:
            'Базова енергія вже на максимумі — витратьте ⚡ в уроці або квізі, потім знову відкрийте превʼю, щоб перевірити покупку за осколки.',
          messageEs:
            'La energía base ya está al máximo: gasta ⚡ en una lección o un cuestionario y vuelve a abrir la vista previa para probar la compra con fragmentos.',
          messagePtBr:
            'A energia base já está no máximo: gaste ⚡ em uma lição ou quiz e abra a prévia de novo para testar a compra com fragmentos.',
          messageVi:
            'Năng lượng cơ bản đã đầy: hãy dùng ⚡ trong bài học hoặc quiz rồi mở lại bản xem trước để thử mua bằng mảnh.',
          messageId:
            'Energi dasar sudah penuh: gunakan ⚡ di pelajaran atau kuis, lalu buka pratinjau lagi untuk menguji pembelian dengan shard.',
          messageTr:
            'Temel enerji zaten dolu: bir ders veya quizde ⚡ harca, sonra parçalarla satın almayı test etmek için önizlemeyi tekrar aç.',
          messagePl:
            'Podstawowa energia jest już pełna: zużyj ⚡ w lekcji albo quizie, a potem ponownie otwórz podgląd, by sprawdzić zakup za odłamki.',
        });
      }
    } finally {
      setShardBusy(false);
    }
  };

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

          {/* Hero icon: молния со свечением */}
          <View style={styles.boltWrap}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.boltHalo,
                {
                  backgroundColor: art.glow,
                  opacity: haloPulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.45] }),
                  transform: [{ scale: haloPulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.18] }) }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.boltIcon,
                {
                  transform: [
                    { scale: boltScale },
                    { rotate: boltShake.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] }) },
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
            </Animated.View>
          </View>

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
          {showShardRestore && (
            <TouchableOpacity
              onPress={() => {
                hapticTap();
                void onRestoreWithShards();
              }}
              activeOpacity={0.88}
              disabled={shardBusy}
              style={[
                styles.shardBtn,
                {
                  borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : '#7C3AED88',
                  backgroundColor: isCompassTheme ? COMPASS_RICH.champagne : '#7C3AED22',
                  borderRadius: buttonRadius,
                  overflow: 'hidden',
                },
                isCompassTheme && compassShadow(1),
              ]}
            >
              {isCompassTheme ? <CompassDepthSurface radius={buttonRadius} cream /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Image
                  source={oskolokImageForPackShards(shardCost)}
                  style={{ width: 30, height: 30 }}
                  resizeMode="contain"
                />
                <Text style={{ color: isCompassTheme ? COMPASS_RICH.textDark : t.textPrimary, fontWeight: '800', fontSize: f.body, flex: 1 }}>
                  {triLang(lang, {
                    ru: 'Восстановить энергию',
                    uk: 'Відновити енергію',
                    es: 'Recuperar energía',
                    'pt-BR': 'Restaurar energia',
                    vi: 'Khôi phục năng lượng',
                    id: 'Pulihkan energi',
                    tr: 'Enerjiyi yenile',
                    pl: 'Odnów energię',
                  })} · {shardCost}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          <PremiumGoldButton
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
            activeOpacity={0.88}
            style={[styles.closeBtnWrap, { borderRadius: buttonRadius }, isCompassTheme && compassShadow(1)]}
          >
            {isCompassTheme ? <CompassDepthSurface radius={buttonRadius} cream /> : null}
            <LinearGradient
              colors={isCompassTheme ? [COMPASS_RICH.cream, COMPASS_RICH.champagne] : [t.accent, t.accent + 'BB']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.closeBtn, { borderRadius: buttonRadius }]}
            >
              <Text style={[styles.closeBtnText, { fontSize: f.body, color: isCompassTheme ? COMPASS_RICH.textDark : t.correctText }]}>
                {onBackHome
                  ? triLang(lang, {
                      ru: 'На главную',
                      uk: 'На головну',
                      es: 'Volver al inicio',
                      'pt-BR': 'Voltar ao início',
                      vi: 'Về trang chính',
                      id: 'Kembali ke beranda',
                      tr: 'Ana sayfaya dön',
                      pl: 'Na stronę główną',
                    })
                  : triLang(lang, {
                      ru: 'Понятно',
                      uk: 'Зрозуміло',
                      es: 'Entendido',
                      'pt-BR': 'Entendi',
                      vi: 'Đã hiểu',
                      id: 'Mengerti',
                      tr: 'Anladım',
                      pl: 'Rozumiem',
                    })}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

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
    borderWidth: StyleSheet.hairlineWidth,
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
  boltWrap: {
    width: 88, height: 88,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  boltHalo: {
    position: 'absolute',
    width: 88, height: 88, borderRadius: 44,
  },
  boltIcon: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontWeight: '700', textAlign: 'center' },
  subtitle: { textAlign: 'center', lineHeight: 22 },
  shardBtn: {
    alignSelf: 'stretch',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 2,
    minHeight: 52,
    justifyContent: 'center',
  },
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
