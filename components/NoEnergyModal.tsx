import React, { memo, useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
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
import { pluralWord } from '../constants/plural';
import { soundDirector } from '../modules/audio/sound_director';
import { activityEnergyCost, ENERGY_SESSION_COST, type EnergyActivityKey } from '../app/energy_contract';
import { energyGateMessage } from '../app/energy_activity_titles';
import { formatTimeUntilRecovery } from '../app/energy_system';

import HybridAlertShell, { CascadeItem } from './modal_fx/HybridAlertShell';
import EnergyNeededSheet from './energy/EnergyNeededSheet';
import { chargesEnergyOnMistake, useEnergyMode } from '../app/energy_mode';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM } from '../constants/motionHybrid';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { nestedBoxShadow, plateBoxShadow } from './v2/ShadowSurface';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { useLineScale, useScaledTextStyles } from '../hooks/useLineScale';


/**
 * зачем (координатор 05.10, решение (б) по правилу владельца «каждый экран как на его макете»): у окна три
 * утверждённых макета — dialogs.html B5 (две кнопки в ряд), learn.html noEnergy/dlg (кнопки столбиком) и
 * learning-v2.html 3.2 (крупный тикающий таймер). Вариант обязателен: каждое место вызова выбирает его явно.
 */
export type NoEnergyVariant = 'dialogs' | 'learn' | 'course';

interface Props {
  /** Чей макет рисуем — см. NoEnergyVariant. Значения по умолчанию нет намеренно. */
  variant: NoEnergyVariant;
  /**
   * Окно 'course': энергия восстановилась, пока окно открыто. Задано — экран продолжает сам (пускает в занятие);
   * не задано — окно закрывается через onClose.
   */
  onEnergyRestored?: () => void;
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
  variant,
  onEnergyRestored,
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
  const sx = useScaledTextStyles(styles);
  const lh = useLineScale();
  const router = useRouter();
  const { theme: t, themeMode, liquidGlassThemeId, f } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const {
    energy,
    bonusEnergy,
    maxEnergy,
    recoveryIntervalMs,
    recoveryEndsAtMs,
    timeUntilNextMs,
  } = useEnergy();
  const { hasPremiumAccess } = usePremium();
  const { lang } = useLang();
  const totalAvailable = energy + bonusEnergy;
  // зачем (PM-082): без указанной активности порог — цена одного занятия (1),
  // а не старые 20: при запасе 5 порог 20 не выполнился бы никогда.
  const requiredEnergy = activity ? activityEnergyCost(activity) : Math.max(ENERGY_SESSION_COST, minRequired ?? 0);
  const isGate = requiredEnergy > 0;
  // зачем (владелец 11.10, режим энергии Б; макет energy-modes-states.html Б7): в режиме Б на занятиях, где энергия снимается за ошибки,
  // старт без энергии показывает шторку «Нужна энергия» с таймером и Plus вместо этого окна. Режим А и остальные занятия — окно как было.
  const energyMode = useEnergyMode();
  const neededSheetMode = activity !== undefined && chargesEnergyOnMistake(activity, energyMode);
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
    if (variant === 'learn') {
      // зачем (координатор 12.10, energy-modes-017, образец энергия-modes-states А3 №25): окно старта урока = образец — одна фиксированная фраза «Дай знаниям немного уложиться. +1 ⚡ вернётся через {время}. Или забудь о паузах с Плюс прямо сейчас.»
      // (первая в пуле lesson1_energy.ts) с живым таймером, а не случайная из двадцати и не «Для урока нужно 1 ⚡…». Пул остаётся в коде (его читают другие места).
      const fixedLine = lessonEnergyMessages(lang)[0] ?? '';
      console.log(`[NO-ENERGY-WINDOW] learn: текст выбран детерминированно (образец А3) lang=${lang} isGate=${String(isGate)} activity=${activity ?? 'нет'} required=${requiredEnergy} have=${totalAvailable} lineLen=${fixedLine.length}`); // guard-ok: ветка решает значение
      setLineText(fixedLine);
      return;
    }
    if (isGate) {
      // зачем БЕЗ рулетки (владелец 2026-09-15: «в диалоге модал говорит
      // экзамен требует 20! какого хуй экзамен!!! исправь все тексты чтобы
      // соответствовали разделу»): строка выбиралась СЛУЧАЙНО из двух
      // вариантов, и один жёстко говорил про экзамен. Цена бралась из
      // activity и была верной — а занятие называлось чужое. Теперь текст
      // тоже строится по activity: раздел определяет строку, а не случай.
      // зачем (dialogs-011, СПЕРВА ЛОГИ): вызов без activity молча брал «урок» — теперь это видно в журнале (activityMissing) и закрыто сторожем tests/no_energy_modal_activity_guard.test.mjs.
      const gateActivity = activity ?? 'classic_lesson';
      console.log('[NO-ENERGY-WINDOW] gate: текст по разделу', JSON.stringify({ variant, lang, activity: activity ?? null, activityMissing: activity === undefined, usedActivity: gateActivity, required: requiredEnergy, have: totalAvailable })); // guard-ok: одна строка при открытии окна
      setLineText(energyGateMessage(gateActivity, lang, requiredEnergy, totalAvailable));
      return;
    }
    const list = lessonEnergyMessages(lang);
    const raw = list[Math.floor(Math.random() * list.length)] ?? list[0] ?? '';
    setLineText(raw);
  }, [modalVisible, isGate, lang, requiredEnergy, totalAvailable, variant, activity]);

  const missingToStart = Math.max(0, requiredEnergy - totalAvailable);
  const timeToStartMs = missingToStart > 0
    ? (timeUntilNextMs || recoveryIntervalMs) + Math.max(0, missingToStart - 1) * recoveryIntervalMs
    : 0;
  const recoveryTimeText = (timeToStartMs > 0 ? formatTimeUntilRecovery(timeToStartMs, lang) : formattedTime) || triLang(lang, {
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
  const showBody = ((isGate && variant !== 'learn') ? (lineText || gateFallback) : (lineText || defaultSubtitle)).replace(/\{time\}/g, recoveryTimeText);
  const reduceMotion = useReduceMotion();
  const hybrid = motionVariant === 'hybrid';

  // зачем (координатор 12.10, образец А3): у варианта learn заголовок всегда «Энергия закончилась» (не «Недостаточно энергии»), как на макете
  const titleText = isGate && variant !== 'learn'
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
    ru: 'Получить Plus', // зачем (Макеты 2bac25805): бренд пишется «Plus» — так в макетах (dialogs/learn/paywall) и в остальных окнах (level_exam, LangContext)
    uk: 'Отримати Plus',
    en: 'Get Plus',
    es: 'Obtener Plus',
    'pt-BR': 'Obter Plus',
    vi: 'Nhận Plus',
    id: 'Dapatkan Plus',
    tr: 'Plus al',
    pl: 'Uzyskaj Plus',
  });
  // learn.html noEnergy: «Открыть Plus»; learning-v2.html 3.2: «Plus — без ограничений».
  const learnCtaLabel = triLang(lang, {
    ru: 'Открыть Plus',
    uk: 'Відкрити Plus',
    en: 'Open Plus',
    es: 'Abrir Plus',
    'pt-BR': 'Abrir o Plus',
    vi: 'Mở Plus',
    id: 'Buka Plus',
    tr: "Plus'ı aç",
    pl: 'Otwórz Plus',
  });
  const courseCtaLabel = triLang(lang, {
    ru: 'Plus — без ограничений',
    uk: 'Plus — без обмежень',
    en: 'Plus — no limits',
    es: 'Plus: sin límites',
    'pt-BR': 'Plus: sem limites',
    vi: 'Plus — không giới hạn',
    id: 'Plus — tanpa batas',
    tr: 'Plus — sınırsız',
    pl: 'Plus — bez limitów',
  });
  // зачем (координатор 05.10, п.2): числа — из настоящих данных энергии, не из текста макета.
  const recoveryMinutes = Math.max(1, Math.round(recoveryIntervalMs / 60_000));
  const capacity = maxEnergy;
  const courseLead = missingToStart > 1
    ? triLang(lang, {
        ru: 'Энергии хватит через',
        uk: 'Енергії вистачить через',
        en: 'You will have enough in',
        es: 'Tendrás suficiente en',
        'pt-BR': 'Você terá o suficiente em',
        vi: 'Sẽ đủ năng lượng sau',
        id: 'Energi cukup dalam',
        tr: 'Yeterli enerji şu sürede',
        pl: 'Wystarczy za',
      })
    : triLang(lang, {
        ru: 'Одна единица восстановится через',
        uk: 'Одна одиниця відновиться через',
        en: 'One unit comes back in',
        es: 'Una unidad vuelve en',
        'pt-BR': 'Uma unidade volta em',
        vi: 'Một đơn vị sẽ hồi sau',
        id: 'Satu unit pulih dalam',
        tr: 'Bir birim şu sürede dolar',
        pl: 'Jedna jednostka wróci za',
      });
  const courseNote = triLang(lang, {
    ru: `Запас ${capacity}, каждые ${recoveryMinutes} ${pluralWord('ru', recoveryMinutes, { one: 'минуту', few: 'минуты', many: 'минут' })} +1. Plus занимается без ограничений.`,
    uk: `Запас ${capacity}, кожні ${recoveryMinutes} хв +1. З Plus можна займатися без обмежень.`,
    en: `Up to ${capacity}, +1 every ${recoveryMinutes} min. Plus has no limits.`,
    es: `Máximo ${capacity}, +1 cada ${recoveryMinutes} min. Con Plus no hay límites.`,
    'pt-BR': `Até ${capacity}, +1 a cada ${recoveryMinutes} min. No Plus não há limites.`,
    vi: `Tối đa ${capacity}, cứ ${recoveryMinutes} phút +1. Plus học không giới hạn.`,
    id: `Maksimal ${capacity}, +1 tiap ${recoveryMinutes} menit. Plus tanpa batas.`,
    tr: `En fazla ${capacity}, her ${recoveryMinutes} dakikada +1. Plus ile sınır yok.`,
    pl: `Zapas ${capacity}, co ${recoveryMinutes} min +1. Z Plus bez limitów.`,
  });
  // Запасной срок, если часы восстановления неизвестны (recoveryEndsAtMs = 0): снимок на момент показа.
  const courseFallbackMs = timeToStartMs > 0 ? timeToStartMs : (timeUntilNextMs || recoveryIntervalMs);
  const courseFallbackDeadlineMs = React.useMemo(() => Date.now() + courseFallbackMs, [courseFallbackMs]);

  // зачем (координатор 05.10, п.3): энергия восстановилась, пока окно курса открыто, — окно закрываем.
  // Только для окна, открытого при нехватке: иначе закрыли бы сразу при показе.
  const openedShortRef = useRef(false);
  useEffect(() => {
    if (!modalVisible) { openedShortRef.current = false; return; }
    if (totalAvailable < requiredEnergy) { openedShortRef.current = true; return; }
    if (variant !== 'course' || !openedShortRef.current) return;
    openedShortRef.current = false;
    const action = onEnergyRestored ? 'continue' : 'close';
    console.log('[NO-ENERGY] restored_while_open', JSON.stringify({ variant, action, totalAvailable, requiredEnergy, activity: activity ?? null }));
    if (onEnergyRestored) onEnergyRestored();
    else onClose();
  }, [activity, modalVisible, onClose, onEnergyRestored, requiredEnergy, totalAvailable, variant]);

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
    <View style={[sx.boltCircle, { backgroundColor: glass.opaqueControl }]}>
      <EnergyIcon
        filled
        solid // зачем (R1, dialogs-011): в круге окна «Нет энергии» молния заливная, как в образце
        themeColor={t.gold}
        size={40}
        animateChange={false}
        shouldShake={false}
        themeMode={themeMode}
      />
    </View>
  );

  const dialogsBody = (
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
        <Text accessibilityRole="header" style={[sx.title, { color: glass.text, fontSize: f.h2 }]}>
          {titleText}
        </Text>,
      )}
      {cascade(
        LUM.ladder[2],
        'body',
        <Text style={[sx.body, { color: glass.secondary, fontSize: f.body, lineHeight: lh(f.body * 1.45) }]}>
          {showBody}
        </Text>,
      )}
      {cascade(
        LUM.ladder[3],
        'actions',
        <View style={sx.actions}>
          <TouchableOpacity
            testID={hybrid ? 'no-energy-modal-hybrid-later' : 'no-energy-modal-later'}
            accessibilityRole="button"
            accessibilityLabel={laterLabel}
            onPress={() => {
              hapticTap();
              laterPress();
            }}
            activeOpacity={0.76}
            style={[sx.action, { backgroundColor: glass.opaqueControl, boxShadow: nestedBoxShadow(glass) }]} // зачем (владелец 12.10, стиль «Тень» без обводок): плашку отделяют тон и малая внешняя тень
          >
            <Text style={[sx.actionLabel, { color: glass.text, fontSize: f.body }]}>{laterLabel}</Text>
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
            style={[sx.action, { backgroundColor: glass.accent }]}
          >
            <Text style={[sx.actionLabel, { color: glass.accentInk, fontSize: f.body }]}>{goldCtaLabel}</Text>
          </TouchableOpacity>
        </View>,
      )}
    </>
  );


  const laterButton = (testID: string) => (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={laterLabel}
      onPress={() => {
        hapticTap();
        laterPress();
      }}
      activeOpacity={0.76}
      style={[sx.action, sx.actionStacked, { backgroundColor: glass.opaqueControl, boxShadow: nestedBoxShadow(glass) }]} // зачем (владелец 12.10, стиль «Тень» без обводок): плашку отделяют тон и малая внешняя тень
    >
      <Text style={[sx.actionLabel, { color: glass.text, fontSize: f.body }]}>{laterLabel}</Text>
    </TouchableOpacity>
  );
  const plusButton = (testID: string, label: string, course: boolean) => (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        hapticTap();
        openPremiumAfterClose();
      }}
      activeOpacity={0.82}
      style={[sx.action, sx.actionStacked, course && sx.actionCourse, { backgroundColor: glass.accent }]}
    >
      <Text style={[sx.actionLabel, { color: glass.accentInk, fontSize: f.body }]}>{label}</Text>
      {course ? <Ionicons name="arrow-forward" size={20} color={glass.accentInk} style={sx.actionArrow} /> : null}
    </TouchableOpacity>
  );

  // learn.html `.dlg`: круг 64 со значком 28, отступ 16, заголовок 22/28, текст 16/22 в 10, кнопки столбиком
  // через 10 в 22 от текста — «Открыть Plus» сверху, «Позже» контуром снизу.
  const learnBody = (
    <>
      {cascade(LUM.ladder[1], 'bolt', (
        <View style={[sx.learnIcon, { backgroundColor: glass.opaqueControl }]}>
          <EnergyIcon filled themeColor={t.gold} size={28} animateChange={false} shouldShake={false} themeMode={themeMode} />
        </View>
      ))}
      {cascade(LUM.ladder[2], 'title', (
        <Text accessibilityRole="header" style={[sx.learnTitle, { color: glass.text }]}>{titleText}</Text>
      ))}
      {cascade(LUM.ladder[2], 'body', (
        <Text style={[sx.learnBodyText, { color: glass.secondary }]}>{showBody}</Text>
      ))}
      {cascade(LUM.ladder[3], 'actions', (
        <View style={sx.stackedActions}>
          {plusButton(hybrid ? 'no-energy-modal-hybrid-cta' : 'no-energy-modal-plus', learnCtaLabel, false)}
          {laterButton(hybrid ? 'no-energy-modal-hybrid-later' : 'no-energy-modal-later')}
        </View>
      ))}
    </>
  );

  // learning-v2.html 3.2 `energyEmpty`: плита 96/r28 с молнией 44, заголовок 25/31/800 в 20, «восстановится через»,
  // таймер 40/46 тикает раз в секунду, строка про запас, белая кнопка r20 со стрелкой, «Позже» текстом.
  const courseBody = (
    <>
      {cascade(LUM.ladder[1], 'bolt', (
        <View style={[sx.courseIcon, { backgroundColor: glass.opaqueControl }]}>
          <EnergyIcon filled themeColor={t.gold} size={44} animateChange={false} shouldShake={false} themeMode={themeMode} />
        </View>
      ))}
      {cascade(LUM.ladder[2], 'title', (
        <Text accessibilityRole="header" style={[sx.courseTitle, { color: glass.text }]}>{titleText}</Text>
      ))}
      {cascade(LUM.ladder[2], 'body', (
        <View style={sx.courseCopy}>
          <Text style={[sx.courseText, { color: glass.secondary }]}>{courseLead}</Text>
          {modalVisible ? (
            <CourseCountdown
              recoveryEndsAtMs={recoveryEndsAtMs}
              recoveryIntervalMs={recoveryIntervalMs}
              missingUnits={Math.max(1, missingToStart)}
              fallbackDeadlineMs={courseFallbackDeadlineMs}
              color={glass.text}
            />
          ) : null}
          <Text style={[sx.courseText, sx.courseNote, { color: glass.secondary }]}>{courseNote}</Text>
        </View>
      ))}
      {cascade(LUM.ladder[3], 'actions', (
        <View style={sx.courseActions}>
          {plusButton(hybrid ? 'no-energy-modal-hybrid-cta' : 'no-energy-modal-plus', courseCtaLabel, true)}
          <TouchableOpacity
            testID={hybrid ? 'no-energy-modal-hybrid-later' : 'no-energy-modal-later'}
            accessibilityRole="button"
            accessibilityLabel={laterLabel}
            onPress={() => {
              hapticTap();
              laterPress();
            }}
            activeOpacity={0.7}
            style={sx.courseLater}
          >
            <Text style={[sx.courseLaterLabel, { color: glass.secondary }]}>{laterLabel}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </>
  );

  const cardBody = variant === 'learn' ? learnBody : variant === 'course' ? courseBody : dialogsBody;
  const variantCard = variant === 'learn' ? sx.learnCard : variant === 'course' ? sx.courseCard : null;
  const variantContent = variant === 'learn' ? sx.learnContent : variant === 'course' ? sx.courseContent : null;

  // зачем (владелец 12.10, стиль «Тень» без обводок): плашку отделяют тон и малая внешняя тень (рамки у окна нет).
  const cardSurface = { backgroundColor: glass.opaqueSheet, boxShadow: plateBoxShadow(glass) };

  if (neededSheetMode) {
    return (
      <EnergyNeededSheet
        visible={modalVisible}
        required={1}
        onWait={laterPress}
        onPlus={openPremiumAfterClose}
        onRestored={onEnergyRestored}
      />
    );
  }

  if (hybrid) {
    return (
      <HybridAlertShell
        visible={modalVisible}
        onRequestClose={onClose}
        shadowColor="#000000" // theme-exempt: тень окна — чёрная в любой теме
        backdropColor="rgba(0,0,0,0.6)" // theme-exempt: затемнение под окном — тёмный скрим в любой теме
        testID="no-energy-modal-hybrid-backdrop"
      >
        <View style={[sx.card, sx.hybridCard, cardSurface, variantCard, variantContent]}>{cardBody}</View>
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
          sx.overlay,
          {
            backgroundColor: variant === 'course' ? 'rgba(0,0,0,0.68)' : 'rgba(0,0,0,0.6)', // theme-exempt: затемнение под окном — тёмный скрим в любой теме
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
            sx.card,
            sx.classicCard,
            cardSurface,
            variantCard,
            { opacity: cardOp, transform: [{ scale: cardScale }] },
          ]}
        >
          <ScrollView
            style={[sx.scroll, variantCard && { borderRadius: variantCard.borderRadius }]}
            contentContainerStyle={[sx.scrollContent, variantContent]}
            showsVerticalScrollIndicator={false}
            bounces={false} decelerationRate="fast"
          >
            {cardBody}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default memo(NoEnergyModal);

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/**
 * зачем (координатор 05.10, п.3): таймер окна курса тикает раз в секунду собственным setInterval —
 * перерисовывается только он, родитель и экран под окном не трогаются. Размонтирован (окно закрыто) —
 * интервал снят.
 */
const CourseCountdown = memo(function CourseCountdown({
  recoveryEndsAtMs, recoveryIntervalMs, missingUnits, fallbackDeadlineMs, color,
}: {
  recoveryEndsAtMs: number;
  recoveryIntervalMs: number;
  missingUnits: number;
  fallbackDeadlineMs: number;
  color: string;
}) {
  const sx = useScaledTextStyles(styles);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  // Те же часы, что у шкалы энергии (useEnergyCountdown): остаток до ближайшей единицы по recoveryEndsAtMs,
  // плюс полные интервалы за каждую недостающую сверх первой.
  let leftMs = fallbackDeadlineMs - now;
  if (recoveryEndsAtMs > 0 && recoveryIntervalMs > 0) {
    const startedAt = recoveryEndsAtMs - recoveryIntervalMs;
    const elapsed = Math.max(0, now - startedAt);
    const step = elapsed % recoveryIntervalMs;
    const next = step === 0 && elapsed > 0 ? recoveryIntervalMs : recoveryIntervalMs - step;
    leftMs = next + Math.max(0, missingUnits - 1) * recoveryIntervalMs;
  }
  return (
    <Text testID="no-energy-course-countdown" style={[sx.courseTimer, { color }]}>
      {formatCountdown(leftMs)}
    </Text>
  );
});

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
  },
  classicCard: {
    maxHeight: '100%',
    shadowColor: '#000000', // theme-exempt: тень окна — чёрная в любой теме
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
  actionStacked: { flex: 0, alignSelf: 'stretch' },
  // `.cm .cta`: 54, r20, стрелка у правого края.
  actionCourse: { minHeight: 54, borderRadius: 20, paddingHorizontal: 48 },
  actionArrow: { position: 'absolute', right: 22 },
  // learn.html `.dlg`
  learnCard: { borderRadius: 24 },
  learnContent: { paddingTop: 26, paddingHorizontal: 22, paddingBottom: 22, gap: 0 },
  learnIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  learnTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  learnBodyText: { fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 10 },
  stackedActions: { alignSelf: 'stretch', gap: 10, marginTop: 22 },
  // learning-v2.html `.cm .cd` + energyEmpty
  courseCard: { borderRadius: 22 },
  courseContent: { paddingTop: 22, paddingHorizontal: 22, paddingBottom: 16, gap: 0 },
  courseIcon: { width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  courseTitle: { fontSize: 25, lineHeight: 31, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center', marginTop: 20 },
  courseCopy: { alignSelf: 'stretch', alignItems: 'center', marginTop: 8 },
  courseText: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  courseNote: { marginTop: 6 },
  courseTimer: { fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -0.6, marginTop: 8, fontVariant: ['tabular-nums'] },
  courseActions: { alignSelf: 'stretch', marginTop: 22 },
  courseLater: { alignSelf: 'center', minHeight: 44, paddingTop: 14, paddingBottom: 4, paddingHorizontal: 20, justifyContent: 'center' },
  courseLaterLabel: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
