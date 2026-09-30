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
  ScrollView,
  InteractionManager,
} from 'react-native';
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
import { shouldRenderNoEnergyModal } from '../app/services/no_energy_modal_visibility';
import { triLang } from '../constants/i18n';
import { soundDirector } from '../modules/audio/sound_director';
import { activityEnergyCost, ENERGY_SESSION_COST, type EnergyActivityKey } from '../app/energy_contract';
import { energyGateMessage } from '../app/energy_activity_titles';
import { formatTimeUntilRecovery } from '../app/energy_system';

import HybridAlertShell, { CascadeItem } from './modal_fx/HybridAlertShell';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM } from '../constants/motionHybrid';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';


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
  /** Canonical activity determines the exact price shown in this sheet. */
  activity?: EnergyActivityKey;
  /** `premium_modal` context: аналитика и тексты. По умолчанию `no_energy`. */
  paywallContext?: string;
  onBeforeOpenPremium?: () => void;
  /**
   * Устарело (жемчуг выведен из интерфейса 2026-09-30): кнопки «за жемчужины» больше нет,
   * проп оставлен только для совместимости вызовов из настроек тестера и игнорируется.
   */
  qaForceShardCta?: boolean;
  /** Admin/QA preview: render the no-energy UI even for Premium/VIP accounts. */
  qaIgnorePremiumAccess?: boolean;
  /** default 'classic' — боевое поведение не меняется, пока не передан явно. */
  motionVariant?: 'classic' | 'hybrid';
}

function NoEnergyModal({
  visible,
  onClose,
  onGotIt,
  onBackHome,
  minRequired,
  activity,
  paywallContext = 'no_energy',
  onBeforeOpenPremium,
  qaIgnorePremiumAccess = false,
  motionVariant = 'classic',
}: Props) {
  const router = useRouter();
  const { theme: t, themeMode, liquidGlassThemeId, f } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const {
    energy,
    bonusEnergy,
    recoveryIntervalMs,
    timeUntilNextMs,
  } = useEnergy();
  const { hasPremiumAccess } = usePremium();
  const { lang } = useLang();
  const totalAvailable = energy + bonusEnergy;
  // зачем (PM-082): без указанной активности порог — цена одного занятия (1),
  // а не старые 20: при запасе 5 порог 20 не выполнился бы никогда.
  const requiredEnergy = activity ? activityEnergyCost(activity) : Math.max(ENERGY_SESSION_COST, minRequired ?? 0);
  const isGate = requiredEnergy > 0;
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
    router.push({ pathname: '/premium_modal', params: { context: ctx, source: 'no_energy_modal' } } as any);
  }, [router]);

  useEffect(() => {
    flushPremiumPushRef.current = flushPremiumPush;
  }, [flushPremiumPush]);

  const openPremiumAfterClose = () => {
    pendingPremiumContextRef.current = paywallContext;
    (onBeforeOpenPremium ?? onClose)();
  };

  // зачем (совет агентов 2026-09-30, решение A1): жемчуг выведен из интерфейса 2.0 —
  // кнопка «Восстановить за N жемчужин» и её ветка (цена, баланс, покупка) убраны.
  // Ядро app/energy_shard_refill.ts и баланс жемчуга НЕ тронуты: остаток пользователя
  // остаётся в данных, просто здесь больше не тратится. Окно = «Позже» + «Получить Plus» (макет B5).

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
    soundDirector.request('pm.energy.empty', {
      scope: 'no-energy-modal',
      dedupeKey: 'visible',
    });

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
    if (isGate) {
      // зачем БЕЗ рулетки (владелец 2026-09-15: «в диалоге модал говорит
      // экзамен требует 20! какого хуй экзамен!!! исправь все тексты чтобы
      // соответствовали разделу»): строка выбиралась СЛУЧАЙНО из двух
      // вариантов, и один жёстко говорил про экзамен. Цена бралась из
      // activity и была верной — а занятие называлось чужое. Теперь текст
      // тоже строится по activity: раздел определяет строку, а не случай.
      setLineText(energyGateMessage(activity ?? 'classic_lesson', lang, requiredEnergy, totalAvailable));
      return;
    }
    const list = lessonEnergyMessages(lang);
    const raw = list[Math.floor(Math.random() * list.length)] ?? list[0] ?? '';
    setLineText(raw);
  }, [modalVisible, isGate, lang, requiredEnergy, totalAvailable]);

  const missingToStart = Math.max(0, requiredEnergy - totalAvailable);
  const timeToStartMs = missingToStart > 0
    ? (timeUntilNextMs || recoveryIntervalMs) + Math.max(0, missingToStart - 1) * recoveryIntervalMs
    : 0;
  const recoveryTimeText = (timeToStartMs > 0 ? formatTimeUntilRecovery(timeToStartMs) : formattedTime) || triLang(lang, {
    ru: 'несколько минут',
    uk: 'кілька хвилин',
    en: 'a few minutes',
    es: 'unos minutos',
    'pt-BR': 'alguns minutos',
    vi: 'vài phút',
    id: 'beberapa menit',
    tr: 'birkaç dakika',
    pl: 'kilka minut',
  });
  const defaultSubtitle = triLang(lang, {
    ru: `+1 ⚡ вернётся через ${recoveryTimeText}. В Plus и Pro энергия безлимитная.`,
    uk: `+1 ⚡ відновиться через ${recoveryTimeText}. У Plus і Pro енергія безлімітна.`,
    en: `+1 ⚡ comes back in ${recoveryTimeText}. Energy is unlimited with Plus and Pro.`,
    es: `+1 ⚡ se recuperará en ${recoveryTimeText}. La energía es ilimitada con Plus y Pro.`,
    'pt-BR': `+1 ⚡ volta em ${recoveryTimeText}. A energia é ilimitada no Plus e Pro.`,
    vi: `+1 ⚡ sẽ hồi lại sau ${recoveryTimeText}. Plus và Pro có năng lượng không giới hạn.`,
    id: `+1 ⚡ pulih dalam ${recoveryTimeText}. Energi tanpa batas tersedia di Plus dan Pro.`,
    tr: `+1 ⚡ ${recoveryTimeText} içinde yenilenir. Plus ve Pro'da enerji sınırsızdır.`,
    pl: `+1 ⚡ wróci za ${recoveryTimeText}. W Plus i Pro energia jest bez limitu.`,
  });
  // Запасная строка раньше брала ВСЕГДА нулевой вариант — то есть тот самый
  // экзаменный. Теперь она строится тем же способом, что и основная.
  const gateFallback = isGate
    ? energyGateMessage(activity ?? 'classic_lesson', lang, requiredEnergy, totalAvailable)
    : '';
  const showBody = (isGate ? (lineText || gateFallback) : (lineText || defaultSubtitle)).replace(/\{time\}/g, recoveryTimeText);
  const reduceMotion = useReduceMotion();
  const hybrid = motionVariant === 'hybrid';

  const titleText = isGate
    ? triLang(lang, {
        ru: 'Недостаточно энергии',
        uk: 'Недостатньо енергії',
        en: 'Not enough energy',
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
        en: 'Out of energy',
        es: 'Se acabó la energía',
        'pt-BR': 'A energia acabou',
        vi: 'Hết năng lượng',
        id: 'Energi habis',
        tr: 'Enerji bitti',
        pl: 'Energia się skończyła',
      });
  const laterLabel = triLang(lang, {
    ru: 'Позже',
    uk: 'Пізніше',
    en: 'Later',
    es: 'Más tarde',
    'pt-BR': 'Mais tarde',
    vi: 'Để sau',
    id: 'Nanti',
    tr: 'Daha sonra',
    pl: 'Później',
  });
  const goldCtaLabel = triLang(lang, {
    ru: 'Получить Плюс',
    uk: 'Отримати Plus',
    en: 'Get Plus',
    es: 'Obtener Plus',
    'pt-BR': 'Obter Plus',
    vi: 'Nhận Plus',
    id: 'Dapatkan Plus',
    tr: 'Plus al',
    pl: 'Uzyskaj Plus',
  });
  // зачем: Liquid Glass 1 в 1 с макета dialogs.html B5 — по центру круг с молнией, заголовок,
  // одна строка про восстановление и в ряд «Позже» (контур) + «Получить Plus» (светлая кнопка).
  // Поверхность — непрозрачный opaqueSheet с волосяной кромкой glassEdge из токенов темы; свои
  // зелёные/золотые палитры по режимам убраны. Оффер энергии — НЕ награда: молния садится
  // без отскока (LUM.settle), без CHK/RewardImpactRings.
  const laterPress = () => {
    if (onGotIt) {
      onGotIt();
      return;
    }
    (onBackHome ?? onClose)();
  };
  const cascade = (delay: number, key: string, node: React.ReactNode) =>
    hybrid ? (
      <CascadeItem key={key} delay={delay} reduceMotion={reduceMotion}>
        {node}
      </CascadeItem>
    ) : (
      <React.Fragment key={key}>{node}</React.Fragment>
    );

  const boltIcon = (
    <View style={[styles.boltCircle, { backgroundColor: glass.opaqueControl }]}>
      <EnergyIcon
        filled
        themeColor={t.gold}
        size={40}
        animateChange={false}
        shouldShake={false}
        themeMode={themeMode}
      />
    </View>
  );

  const cardBody = (
    <>
      {cascade(
        LUM.ladder[1],
        'bolt',
        hybrid ? (
          boltIcon
        ) : (
          <Animated.View
            style={{
              transform: [
                { scale: Animated.multiply(boltScale, haloPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] })) },
                { translateX: boltShake.interpolate({ inputRange: [-1, 1], outputRange: [-3, 3] }) },
              ],
            }}
          >
            {boltIcon}
          </Animated.View>
        ),
      )}
      {cascade(
        LUM.ladder[2],
        'title',
        <Text accessibilityRole="header" style={[styles.title, { color: glass.text, fontSize: f.h2 }]}>
          {titleText}
        </Text>,
      )}
      {cascade(
        LUM.ladder[2],
        'body',
        <Text style={[styles.body, { color: glass.secondary, fontSize: f.body, lineHeight: f.body * 1.45 }]}>
          {showBody}
        </Text>,
      )}
      {cascade(
        LUM.ladder[3],
        'actions',
        <View style={styles.actions}>
          <TouchableOpacity
            testID={hybrid ? 'no-energy-modal-hybrid-later' : 'no-energy-modal-later'}
            accessibilityRole="button"
            accessibilityLabel={laterLabel}
            onPress={() => {
              hapticTap();
              laterPress();
            }}
            activeOpacity={0.76}
            style={[styles.action, { borderWidth: 1, borderColor: glass.glassEdge }]}
          >
            <Text style={[styles.actionLabel, { color: glass.text, fontSize: f.body }]}>{laterLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID={hybrid ? 'no-energy-modal-hybrid-cta' : 'no-energy-modal-plus'}
            accessibilityRole="button"
            accessibilityLabel={goldCtaLabel}
            onPress={() => {
              hapticTap();
              openPremiumAfterClose();
            }}
            activeOpacity={0.82}
            style={[styles.action, { backgroundColor: glass.cta }]}
          >
            <Text style={[styles.actionLabel, { color: glass.ctaInk, fontSize: f.body }]}>{goldCtaLabel}</Text>
          </TouchableOpacity>
        </View>,
      )}
    </>
  );

  const cardSurface = { backgroundColor: glass.opaqueSheet, borderColor: glass.glassEdge };

  if (hybrid) {
    return (
      <HybridAlertShell
        visible={modalVisible}
        onRequestClose={onClose}
        shadowColor="#000000"
        backdropColor="rgba(0,0,0,0.6)"
        testID="no-energy-modal-hybrid-backdrop"
      >
        <View style={[styles.card, styles.hybridCard, cardSurface]}>{cardBody}</View>
      </HybridAlertShell>
    );
  }

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="fade"
      onDismiss={handleModalDismissIos}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: 'rgba(0,0,0,0.6)',
            paddingTop: Math.max(24, insets.top),
            paddingBottom: Math.max(24, insets.bottom),
            paddingLeft: Math.max(24, insets.left),
            paddingRight: Math.max(24, insets.right),
          },
        ]}
      >
        {/* Тап по фону закрывает модалку */}
        <Pressable
          accessible={false}
          style={StyleSheet.absoluteFill}
          onPress={() => {
            hapticTap();
            onClose();
          }}
        />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.card,
            styles.classicCard,
            cardSurface,
            { opacity: cardOp, transform: [{ scale: cardScale }] },
          ]}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {cardBody}
          </ScrollView>
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
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: 26,
    borderWidth: 1,
  },
  classicCard: {
    maxHeight: '100%',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  hybridCard: {
    paddingTop: 24,
    paddingHorizontal: 22,
    paddingBottom: 22,
    alignItems: 'center',
    gap: 14,
  },
  scroll: { flexShrink: 1, minHeight: 0, borderRadius: 26 },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 22,
    paddingBottom: 22,
    alignItems: 'center',
    gap: 14,
  },
  boltCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontWeight: '700', textAlign: 'center' },
  body: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', flexDirection: 'row', gap: 10, marginTop: 8 },
  action: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontWeight: '700', textAlign: 'center' },
});
