import React, { useState, useEffect, useRef, useCallback } from 'react';
import TapScale from '../components/TapScale';
import {
  View, Text, TouchableOpacity,
  ScrollView, Animated, Linking, Modal, Easing, StyleSheet,
  Platform,
  TextInput,
  InteractionManager,
  ActivityIndicator,
  type ImageSourcePropType,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from '../components/SafeLinearGradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useEnergy } from '../components/EnergyContext';
import EnergyIcon from '../components/EnergyIcon';
import ContentWrap from '../components/ContentWrap';
import ReportErrorButton from '../components/ReportErrorButton';
import ScreenGradient from '../components/ScreenGradient';
import { useAdaptiveBackgroundSource } from '../components/adaptiveBackgroundAssets';
import { paywallGlassColor } from '../components/paywallGlass';
import MatchFoundToast from '../components/MatchFoundToast';
import { DEV_IAP_BYPASS, IS_EXPO_GO, IS_STORE_RELEASE, KNOWLY_LEGAL_PRIVACY_URL, KNOWLY_LEGAL_TERMS_URL } from './config';
import { initRevenueCat, resolvePremiumPackages, syncRevenueCatIdentity } from './revenuecat_init';
import { getVerifiedRealPremiumStatus, getVerifiedVipStatus, invalidatePremiumCache } from './premium_guard';
import { useEffectivePlatformOS } from './platform_ui_preview';
import {
  getTrialReofferBlockedByCooldown,
  markSubscriptionOrTrialFlowConsumedNow,
} from './premium_trial_eligibility';
import { storeProductHasTrialIntro } from './premium_trial_signal';
import { safeRouterBack } from './navigation_back';
import {
  inferPremiumPlanFromProductId,
  persistStorePremiumLocally,
  revenueCatPremiumMetadata,
  type RevenueCatPremiumMetadata,
} from './premium_revenuecat_state';
import {
  logPremiumPurchased,
  logPremiumModalOpened,
  logCancelSurvey,
  logPaywallView,
  logPaywallPlanSelect,
  logPaywallCtaClick,
  logPaywallContinueFree,
  logPaywallClose,
  logCoursePaywallAfterLesson3,
  logExitTrialOfferShown,
  logExitTrialOfferAccepted,
  logExitTrialOfferDeclined,
} from './firebase';
import { trackEvent } from './analytics';
import { emitAppEvent } from './events';
import { markCelebrationPending } from './premium_celebration_state';
import {
  PREMIUM_CONTEXT_SET,
  type PremiumContext as PremiumContextType,
} from './premium_context';
import {
  readProgressMirror,
  readIntroProgress,
  isMirrorWorthShowing,
  type ProgressMirror,
} from './paywall_progress_mirror';
import { pickPercentileLine } from './paywall_percentile_line';
import { loadPercentileData } from './daily_analytics_sync';
import { computeSavingsPct, computePerDayString } from './paywall_pricing';
import { pickTestimonials, type Testimonial } from './paywall_testimonials';
import {
  activateUrgencyIfNeeded,
  getUrgencyState,
  getDoubledPrice,
  formatCountdown,
  type UrgencyState,
} from './paywall_urgency';
import { collectPaywallStats, pickPaywallTags, type PersonalizedTag } from './paywall_personalization';
import {
  shouldShowExitTrialOffer,
  shouldShowPrimaryTrialUi,
  type PaywallCloseReason,
} from './paywall_trial_offer';
import { hapticTap } from '../hooks/use-haptics';
import { MOTION_SPRING_LEGACY } from '../constants/motion';
import { triLang, type Lang } from '../constants/i18n';
import { getPremiumCourseLevel } from './lesson_lock_system';
import type { ThemeMode } from '../constants/theme';
import { COMPASS_GRADIENTS, COMPASS_RICH } from '../constants/compassTheme';
import { oskolokImageForPackShards } from './oskolok';
import {
  activatePendingPersonalPlanAfterPremium,
  PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY,
} from './personal_plan_activation';

type PremiumPlannedCopy = {
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
};
type PremiumPlannedHeroCopy = {
  title: PremiumPlannedCopy;
  subtitle: PremiumPlannedCopy;
};

function PremiumScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <ScreenGradient>
      {children}
      <MatchFoundToast host="screen" />
    </ScreenGradient>
  );
}

/** Только непустая строка из стора — без выдуманных сумм. */
function storePriceTrim(raw: string | undefined | null): string {
  if (typeof raw !== 'string') return '';
  return raw.trim();
}

function storePricePerMonthTrim(product: PurchasesPackage['product'] | undefined): string {
  return storePriceTrim((product as { pricePerMonthString?: string | null } | undefined)?.pricePerMonthString);
}

function routeParamString(raw: string | string[] | undefined): string {
  return storePriceTrim(Array.isArray(raw) ? raw[0] : raw);
}

const isEnergyGlyph = (value: string) => value.codePointAt(0) === 0x26A1;

type Plan = 'monthly' | 'yearly';
type PremiumPackages = { monthly?: PurchasesPackage; yearly?: PurchasesPackage };
// PremiumContext вынесен в ./premium_context, чтобы вспомогательные модули
// (percentile-строка, зеркало прогресса) типизировались без импорта этого экрана.
type PremiumContext = PremiumContextType;


const PREMIUM_HERO_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/paywalls/premium_hero/premium-hero-dark.webp'),
  neon: require('../assets/images/paywalls/premium_hero/premium-hero-neon.webp'),
  gold: require('../assets/images/paywalls/premium_hero/premium-hero-gold.webp'),
  coral: require('../assets/images/paywalls/premium_hero/premium-hero-coral.webp'),
  minimalLight: require('../assets/images/paywalls/premium_hero/premium-hero-minimal-light.webp'),
  minimalDark: require('../assets/images/paywalls/premium_hero/premium-hero-minimal-dark.webp'),
  compass: require('../assets/images/paywalls/premium_hero/premium-hero-compass-premium.webp'),
};

type PremiumHeroArt = {
  accent: string;
  accent2: string;
  shardAmount: number;
};

const PREMIUM_HERO_ART: Record<PremiumContext, PremiumHeroArt> = {
  arena: { accent: '#58D6FF', accent2: '#A7FF4F', shardAmount: 180 },
  no_energy: { accent: '#FFE86A', accent2: '#64B4FF', shardAmount: 80 },
  course_after_lesson3: { accent: '#63E6BE', accent2: '#FFD86B', shardAmount: 180 },
  lesson_b1: { accent: '#63E6BE', accent2: '#FFD86B', shardAmount: 180 },
  quiz_limit: { accent: '#C8FF00', accent2: '#66E6FF', shardAmount: 80 },
  quiz_level: { accent: '#7DD3FC', accent2: '#A78BFA', shardAmount: 180 },
  quiz_medium: { accent: '#FDBA74', accent2: '#C8FF00', shardAmount: 180 },
  quiz_hard: { accent: '#C084FC', accent2: '#FF6BB5', shardAmount: 420 },
  flashcard_limit: { accent: '#8BD3FF', accent2: '#FDE68A', shardAmount: 80 },
  streak: { accent: '#FFB020', accent2: '#FF5C5C', shardAmount: 180 },
  theme: { accent: '#F0ABFC', accent2: '#67E8F9', shardAmount: 180 },
  club: { accent: '#FACC15', accent2: '#22C55E', shardAmount: 420 },
  trainer: { accent: '#A78BFA', accent2: '#5EEAD4', shardAmount: 180 },
  trainer_limit: { accent: '#A78BFA', accent2: '#5EEAD4', shardAmount: 180 },
  dialog_limit: { accent: '#58D6FF', accent2: '#A7FF4F', shardAmount: 180 },
  diagnosis_training: { accent: '#5EEAD4', accent2: '#60A5FA', shardAmount: 180 },
  mastery: { accent: '#86EFAC', accent2: '#FDE68A', shardAmount: 420 },
  stats: { accent: '#60A5FA', accent2: '#FDE68A', shardAmount: 180 },
  heatmap: { accent: '#34D399', accent2: '#A3E635', shardAmount: 180 },
  patterns: { accent: '#F87171', accent2: '#C084FC', shardAmount: 180 },
  percentiles: { accent: '#FACC15', accent2: '#38BDF8', shardAmount: 420 },
  personal_plan: { accent: '#72E6A9', accent2: '#66A8FF', shardAmount: 420 },
  intro_ended: { accent: '#FFB020', accent2: '#66A8FF', shardAmount: 420 },
  level_up: { accent: '#FACC15', accent2: '#A78BFA', shardAmount: 180 },
  smart_trainer: { accent: '#A78BFA', accent2: '#5EEAD4', shardAmount: 180 },
  generic: { accent: '#C8FF00', accent2: '#67E8F9', shardAmount: 0 },
};

function premiumHeroScrim(themeMode: ThemeMode): string[] {
  if (themeMode === 'minimalLight') {
    return ['rgba(255,255,255,0.72)', 'rgba(255,255,255,0.50)', 'rgba(255,255,255,0.78)'];
  }
  if (themeMode === 'gold') {
    return ['rgba(0,0,0,0.28)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.54)'];
  }
  return ['rgba(0,0,0,0.36)', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.58)'];
}

function shouldUseShardHeroIcon(ctx: PremiumContext): boolean {
  return ctx === 'generic';
}

type PaywallCopy = {
  titleRu: string;
  titleUk: string;
  titleEs: string;
  subtitleRu: string;
  subtitleUk: string;
  subtitleEs: string;
};
const normalizePlan = (raw: string | null | undefined): Plan | null => {
  if (!raw) return null;
  const p = String(raw).trim().toLowerCase();
  if (p === 'monthly') return 'monthly';
  if (p === 'yearly' || p === 'annual') return 'yearly';
  return null;
};

const COURSE_AFTER_LESSON3_COPY: PaywallCopy = {
  titleRu: 'Открой весь текущий уровень',
  titleUk: 'Відкрий весь поточний рівень',
  titleEs: 'Abre todo tu nivel actual',
  subtitleRu: 'A1 открыт бесплатно и проходится последовательно. Premium открывает весь текущий уровень: все уроки доступны сразу, без блокировок по результату. Следующие уровни открываются через экзамены.',
  subtitleUk: 'A1 відкритий безкоштовно й проходиться послідовно. Premium відкриває весь поточний рівень: усі уроки доступні одразу, без блокувань за результатом. Наступні рівні відкриваються через екзамени.',
  subtitleEs: 'A1 es gratis y se avanza paso a paso. Premium abre todo tu nivel actual: todas las lecciones disponibles al instante, sin bloqueos por resultado. Los siguientes niveles se abren con exámenes.',
};
const COURSE_AFTER_LESSON3_PLANNED_COPY: PremiumPlannedHeroCopy = {
  title: {
    'pt-BR': 'Abra todo o nível atual',
    vi: 'Mở toàn bộ cấp hiện tại',
    id: 'Buka seluruh level saat ini',
    tr: 'Mevcut seviyeyi tamamen aç',
    pl: 'Otwórz cały obecny poziom',
  },
  subtitle: {
    'pt-BR': 'O A1 é grátis e avança passo a passo. Premium abre todo o nível atual: todas as lições disponíveis na hora, sem bloqueios por resultado. Os próximos níveis abrem por exames.',
    vi: 'A1 miễn phí và mở từng bài theo tiến độ. Premium mở toàn bộ cấp hiện tại: mọi bài học có ngay, không bị khóa theo kết quả. Các cấp tiếp theo mở qua bài kiểm tra.',
    id: 'A1 gratis dan dibuka bertahap. Premium membuka seluruh level saat ini: semua pelajaran langsung tersedia, tanpa kunci dari hasil. Level berikutnya dibuka lewat ujian.',
    tr: 'A1 ücretsizdir ve adım adım açılır. Premium mevcut seviyenin tamamını açar: tüm dersler hemen erişilir, sonuç engeli yoktur. Sonraki seviyeler sınavlarla açılır.',
    pl: 'A1 jest darmowy i odblokowuje się krok po kroku. Premium otwiera cały obecny poziom: wszystkie lekcje od razu, bez blokad za wynik. Kolejne poziomy otwierają się przez egzaminy.',
  },
};

function normalizePremiumContext(raw: string | string[] | undefined): PremiumContext {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return 'generic';
  if (value === 'hall_of_fame') return 'generic';
  if (value === 'lesson_b1') return 'course_after_lesson3';
  // План #11: smart_trainer теперь самостоятельный контекст (свой lock-preview + copy).
  if (value === 'trainer_smart_mix') return 'smart_trainer';
  if (value === 'avatar_aura') return 'theme';
  return PREMIUM_CONTEXT_SET.has(value as PremiumContext) ? (value as PremiumContext) : 'generic';
}

const PAYWALL_COPY: Partial<Record<PremiumContext, PaywallCopy>> & { generic: PaywallCopy } = {
  arena: {
    titleRu: 'Больше дуэлей на Арене каждый день',
    titleUk: 'Більше дуелей на Арені щодня',
    titleEs: 'Más partidas en la Arena cada día',
    subtitleRu: 'Premium снимает дневной лимит матчей — сражайся в дуэлях, крепи стратегию и рост без ощущения «всё, хватит на сегодня».',
    subtitleUk: 'Premium знімає денний ліміт матчів — воюй вживу, вдосконалюй стратегію і ріст без «на сьогодні досить».',
    subtitleEs:
      'Premium quita el límite diario de partidas: compite cada día, fortalece tu estrategia y tu progreso sin el «ya está bien por hoy».',
  },
  no_energy: {
    titleRu: 'Останови паузы из-за энергии',
    titleUk: 'Зупини паузи через енергію',
    titleEs: 'Evita pausas por energía',
    subtitleRu: 'С Premium — безлимитная энергия: уроки, квизы и финальный экзамен без таймера ожидания, ритм только твой.',
    subtitleUk: 'З Premium — безлімітна енергія: уроки, квізи та фінальний іспит без таймера — ритм лише твій.',
    subtitleEs: 'Con Premium tienes energía ilimitada: lecciones, quizzes y examen final sin temporizadores de espera, a tu ritmo.',
  },
  streak: {
    titleRu: 'Не теряй серию, которую уже построил',
    titleUk: 'Не втрачай серію, яку вже побудував',
    titleEs: 'No pierdas la racha que ya llevas',
    subtitleRu: 'Premium защищает твой ритм: учись без пауз и не откатывайся из-за одного пропуска.',
    subtitleUk: 'Premium захищає твій ритм: навчайся без пауз і не відкатуйся через один пропуск.',
    subtitleEs: 'Premium protege tu ritmo: estudia sin pausas y no retrocedas por un solo día sin practicar.',
  },
  course_after_lesson3: COURSE_AFTER_LESSON3_COPY,
  lesson_b1: COURSE_AFTER_LESSON3_COPY,
  quiz_limit: {
    titleRu: 'Не останавливай прогресс из-за лимитов',
    titleUk: 'Не зупиняй прогрес через ліміти',
    titleEs: 'No frenes tu progreso por los límites',
    subtitleRu: 'С Premium учись без пауз и держи ежедневный темп.',
    subtitleUk: 'З Premium навчайся без пауз і тримай щоденний темп.',
    subtitleEs: 'Con Premium estudia sin frenos y mantén tu ritmo diario.',
  },
  quiz_level: {
    titleRu: 'Больше квизов каждый день',
    titleUk: 'Більше квізів щодня',
    titleEs: 'Más cuestionarios cada día',
    subtitleRu: 'В бесплатной версии доступно 3 квиза в день. Premium снимает дневной лимит, чтобы можно было тренироваться без пауз.',
    subtitleUk: 'У безкоштовній версії доступно 3 квізи на день. Premium знімає денний ліміт, щоб можна було тренуватися без пауз.',
    subtitleEs: 'La versión gratis incluye 3 cuestionarios al día. Premium quita el límite diario para que puedas practicar sin pausas.',
  },
  quiz_medium: {
    titleRu: 'Больше квизов каждый день',
    titleUk: 'Більше квізів щодня',
    titleEs: 'Más cuestionarios cada día',
    subtitleRu: 'В бесплатной версии доступно 3 квиза в день. Premium снимает дневной лимит, чтобы можно было тренироваться без пауз.',
    subtitleUk: 'У безкоштовній версії доступно 3 квізи на день. Premium знімає денний ліміт, щоб можна було тренуватися без пауз.',
    subtitleEs: 'La versión gratis incluye 3 cuestionarios al día. Premium quita el límite diario para que puedas practicar sin pausas.',
  },
  quiz_hard: {
    titleRu: 'Больше квизов каждый день',
    titleUk: 'Більше квізів щодня',
    titleEs: 'Más cuestionarios cada día',
    subtitleRu: 'В бесплатной версии доступно 3 квиза в день. Premium снимает дневной лимит, чтобы можно было тренироваться без пауз.',
    subtitleUk: 'У безкоштовній версії доступно 3 квізи на день. Premium знімає денний ліміт, щоб можна було тренуватися без пауз.',
    subtitleEs: 'La versión gratis incluye 3 cuestionarios al día. Premium quita el límite diario para que puedas practicar sin pausas.',
  },
  flashcard_limit: {
    titleRu: 'Твоя база карточек не должна иметь лимит',
    titleUk: 'Твоя база карток не повинна мати ліміт',
    titleEs: 'Tu colección de tarjetas merece estar sin límites',
    subtitleRu: 'Сохраняй все важные фразы и строй персональную систему повторения без потолка.',
    subtitleUk: 'Зберігай усі важливі фрази й будуй персональну систему повторення без обмежень.',
    subtitleEs: 'Guarda todas las frases clave y crea tu repaso personal sin techo.',
  },
  theme: {
    titleRu: 'Персонализируй обучение под себя',
    titleUk: 'Персоналізуй навчання під себе',
    titleEs: 'Adapta la app a tu estilo',
    subtitleRu: 'С Premium приложение становится твоим: больше вовлеченности, выше регулярность занятий.',
    subtitleUk: 'З Premium застосунок стає твоїм: більше залучення, вища регулярність занять.',
    subtitleEs: 'Con Premium la app se siente tuya: más implicación y más constancia en cada sesión.',
  },
  club: {
    titleRu: 'Усиль прогресс через клубы и бонусы',
    titleUk: 'Підсиль прогрес через клуби та бонуси',
    titleEs: 'Impulsa tu progreso con clubes y bonus',
    subtitleRu: 'Соревнуйся, набирай больше XP и не выпадай из ритма.',
    subtitleUk: 'Змагайся, набирай більше XP і не випадай з ритму.',
    subtitleEs: 'Compite, suma más XP y no pierdas el ritmo.',
  },
  trainer: {
    titleRu: 'Тренер — персональный план повторения',
    titleUk: 'Тренер — персональний план повторення',
    titleEs: 'Entrenador — tu plan de repaso personal',
    subtitleRu: 'Слабые места, Smart Mix, По теме, Сложные — 4 режима работают только на Premium. Без лимита сессий.',
    subtitleUk: 'Слабкі місця, Smart Mix, За темою, Складні — 4 режими лише для Premium. Без ліміту сесій.',
    subtitleEs: 'Débiles, Smart Mix, Por tema, Difíciles — 4 modos solo para Premium. Sin límite de sesiones.',
  },
  trainer_limit: {
    // Библия Phraseman: gain-framing, без слова «лимит», без хардкода числа сессий
    // (оно теперь A/B-переменное). Стиль Инвестор: «что открывается».
    titleRu: 'Тренируйся сколько хочешь',
    titleUk: 'Тренуйся скільки хочеш',
    titleEs: 'Entrena cuanto quieras',
    subtitleRu: 'Premium открывает безлимит сессий Тренера во всех режимах. Повторяй фразы столько, сколько нужно — без пауз.',
    subtitleUk: 'Premium відкриває безліміт сесій Тренера в усіх режимах. Повторюй фрази стільки, скільки треба — без пауз.',
    subtitleEs: 'Premium abre sesiones del Entrenador sin límite en todos los modos. Repite las frases cuanto necesites, sin pausas.',
  },
  dialog_limit: {
    titleRu: 'Говори с Филом без лимита',
    titleUk: 'Спілкуйся з Філом без ліміту',
    titleEs: 'Habla con Phil sin límite',
    subtitleRu: 'Бесплатно — один разговор в день. Premium открывает живую практику английского без ограничений: новые сценарии, разбор каждой реплики, твои слова из карточек.',
    subtitleUk: 'Безкоштовно — одна розмова на день. Premium відкриває живу практику англійської без обмежень: нові сценарії, розбір кожної репліки, твої слова з карток.',
    subtitleEs: 'Gratis: una conversación al día. Premium abre práctica real de inglés sin límites: nuevos escenarios, análisis de cada frase y tus palabras de las tarjetas.',
  },
  diagnosis_training: {
    // Библия: «ошибка»→«разбор/что подтянуть», ≤10 слов/предложение, gain-framing.
    titleRu: 'Разбирай слабые места без лимита',
    titleUk: 'Розбирай слабкі місця без ліміту',
    titleEs: 'Analiza tus puntos débiles sin límite',
    subtitleRu: 'Premium открывает персональный разбор каждого слабого места. Понятное объяснение, верный вариант и тренировка на похожих фразах.',
    subtitleUk: 'Premium відкриває персональний розбір кожного слабкого місця. Зрозуміле пояснення, правильний варіант і тренування на схожих фразах.',
    subtitleEs: 'Premium abre un análisis personal de cada punto débil. Explicación clara, forma correcta y práctica con frases parecidas.',
  },
  mastery: {
    // Библия: «урок»→«раунд», убрана «цена», ≤10 слов, gain-framing.
    titleRu: 'Повторяй раунды без ограничений',
    titleUk: 'Повторюй раунди без обмежень',
    titleEs: 'Repite rondas sin límites',
    subtitleRu: 'Premium открывает повтор любого пройденного раунда. Закрепляй сложные фразы без списания осколков.',
    subtitleUk: 'Premium відкриває повтор будь-якого пройденого раунду. Закріплюй складні фрази без списання осколків.',
    subtitleEs: 'Premium abre el repaso de cualquier ronda completada. Refuerza las frases difíciles sin gastar fragmentos.',
  },
  stats: {
    titleRu: 'Аналитика прогресса — для Premium',
    titleUk: 'Аналітика прогресу — для Premium',
    titleEs: 'Analítica del progreso — Premium',
    subtitleRu: 'Карта активности за год, паттерны ошибок, сравнение с другими учениками. Видишь чёткую картину своего роста.',
    subtitleUk: 'Карта активності за рік, патерни помилок, порівняння з іншими учнями. Бачиш чітку картину свого зростання.',
    subtitleEs: 'Mapa anual de actividad, patrones de error y comparación. Ves tu progreso con total claridad.',
  },
  heatmap: {
    titleRu: 'Карта активности — для Premium',
    titleUk: 'Карта активності — для Premium',
    titleEs: 'Mapa de actividad — Premium',
    subtitleRu: '365 дней занятий на одном экране — увидишь свои сильные и слабые периоды.',
    subtitleUk: '365 днів занять на одному екрані — побач свої сильні й слабкі періоди.',
    subtitleEs: '365 días de estudio en una sola vista: encuentra tus mejores y peores semanas.',
  },
  patterns: {
    titleRu: 'Паттерны твоих ошибок',
    titleUk: 'Патерни твоїх помилок',
    titleEs: 'Patrones de tus errores',
    subtitleRu: 'Узнай в каких темах и фразах ты ошибаешься чаще всего — и тренируй именно их.',
    subtitleUk: 'Дізнайся в яких темах і фразах ти помиляєшся найчастіше — і тренуй саме їх.',
    subtitleEs: 'Descubre los temas y frases donde más fallas y entrena justo lo que importa.',
  },
  percentiles: {
    titleRu: 'Сравнение с другими — для Premium',
    titleUk: 'Порівняння з іншими — для Premium',
    titleEs: 'Comparación con otros — Premium',
    subtitleRu: 'Увидишь, где ты в топе среди всех учеников. Без дизморали — только то, в чём ты крут.',
    subtitleUk: 'Бач куди ти в топі серед усіх учнів. Без дизморалі — лише те, в чому ти крутий.',
    subtitleEs: 'Mira dónde destacas frente a otros estudiantes. Solo lo positivo, sin desmotivar.',
  },
  generic: {
    titleRu: 'Учись быстрее с Premium',
    titleUk: 'Навчайся швидше з Premium',
    titleEs: 'Aprende más rápido con Premium',
    subtitleRu: 'Больше практики, меньше ограничений, стабильный прогресс каждый день.',
    subtitleUk: 'Більше практики, менше обмежень, стабільний прогрес щодня.',
    subtitleEs: 'Más práctica, menos frenos y progreso estable cada día.',
  },
};

PAYWALL_COPY.quiz_limit = {
  titleRu: 'Лимит квизов на сегодня исчерпан',
  titleUk: 'Ліміт квізів на сьогодні вичерпано',
  titleEs: 'Ya usaste tus 3 cuestionarios gratis de hoy',
  subtitleRu: 'В бесплатной версии доступно 3 квиза в день. Premium снимает дневной лимит, чтобы можно было тренироваться без пауз.',
  subtitleUk: 'У безкоштовній версії доступно 3 квізи на день. Premium знімає денний ліміт, щоб можна було тренуватися без пауз.',
  subtitleEs: 'La versión gratis incluye 3 cuestionarios al día. Premium quita el límite diario para que puedas practicar sin pausas.',
};

PAYWALL_COPY.personal_plan = {
  titleRu: 'Получить персональный план',
  titleUk: 'Отримати персональний план',
  titleEs: 'Activar tu plan personal',
  subtitleRu: 'Premium включает задания на каждый день: уроки, живые фразы, повторение и проверки под твою цель. План держит темп, а материалы открываются без лишних остановок.',
  subtitleUk: 'Premium вмикає завдання на кожен день: уроки, живі фрази, повторення й перевірки під твою ціль. План тримає темп, а матеріали відкриваються без зайвих пауз.',
  subtitleEs: 'Premium activa tareas diarias: lecciones, frases reales, repaso y pruebas según tu meta. El plan mantiene el ritmo y los materiales se abren sin pausas extra.',
};

PAYWALL_COPY.intro_ended = {
  // Библия: gain-framing (не loss — стрика 7+ тут нет), ≤10 слов/предложение, «ты».
  titleRu: 'Продолжай в полном доступе',
  titleUk: 'Продовжуй у повному доступі',
  titleEs: 'Sigue con acceso completo',
  subtitleRu: 'Ты уже почувствовал полный доступ. Premium открывает его насовсем — без пауз и блокировок.',
  subtitleUk: 'Ти вже відчув повний доступ. Premium відкриває його назавжди — без пауз і блокувань.',
  subtitleEs: 'Ya probaste el acceso completo. Premium lo abre para siempre, sin pausas ni bloqueos.',
};

// План #3: after-win апсейл при повышении уровня. Стиль 2 Игра + 3 Инвестор, gain-framing.
PAYWALL_COPY.level_up = {
  titleRu: 'Ты растёшь быстро',
  titleUk: 'Ти ростеш швидко',
  titleEs: 'Estás creciendo rápido',
  subtitleRu: 'Новый уровень — твой. Premium снимает все лимиты на пути.',
  subtitleUk: 'Новий рівень — твій. Premium знімає всі ліміти на шляху.',
  subtitleEs: 'Nuevo nivel desbloqueado. Premium quita todos los límites del camino.',
};

// План #11: умный микс тренажёра. Стиль 4 Эксперт + 1 Тренер, gain-framing.
PAYWALL_COPY.smart_trainer = {
  titleRu: 'Умный микс — твой тренер',
  titleUk: 'Розумний мікс — твій тренер',
  titleEs: 'Mezcla inteligente — tu entrenador',
  subtitleRu: 'Сам подбирает, что подтянуть. Каждая сессия — по тебе.',
  subtitleUk: 'Сам добирає, що підтягнути. Кожна сесія — під тебе.',
  subtitleEs: 'Elige solo qué reforzar. Cada sesión es a tu medida.',
};

const PAYWALL_PLANNED_COPY: Partial<Record<PremiumContext, PremiumPlannedHeroCopy>> & { generic: PremiumPlannedHeroCopy } = {
  arena: {
    title: { 'pt-BR': 'Mais duelos na Arena todos os dias', vi: 'Thêm trận đấu Arena mỗi ngày', id: 'Lebih banyak duel Arena setiap hari', tr: 'Her gün daha fazla Arena düellosu', pl: 'Więcej pojedynków na Arenie każdego dnia' },
    subtitle: {
      'pt-BR': 'Premium remove o limite diário de partidas: compita todos os dias, fortaleça sua estratégia e avance sem sentir “por hoje chega”.',
      vi: 'Premium bỏ giới hạn trận hằng ngày: thi đấu mỗi ngày, tăng chiến thuật và tiến bộ mà không bị chặn giữa nhịp.',
      id: 'Premium menghapus batas pertandingan harian: bertanding tiap hari, perkuat strategi, dan berkembang tanpa rasa “cukup untuk hari ini”.',
      tr: 'Premium günlük maç sınırını kaldırır: her gün yarış, stratejini güçlendir ve “bugünlük bu kadar” hissi olmadan ilerle.',
      pl: 'Premium usuwa dzienny limit meczów: rywalizuj codziennie, wzmacniaj strategię i rośnij bez wrażenia “na dziś koniec”.',
    },
  },
  no_energy: {
    title: { 'pt-BR': 'Pare as pausas por falta de energia', vi: 'Dừng những lần nghỉ vì hết năng lượng', id: 'Hentikan jeda karena energi habis', tr: 'Enerji yüzünden verilen araları durdur', pl: 'Zatrzymaj przerwy przez energię' },
    subtitle: {
      'pt-BR': 'Com Premium, energia ilimitada: lições, quizzes e exame final sem temporizador de espera, no seu ritmo.',
      vi: 'Với Premium, năng lượng không giới hạn: bài học, quiz và bài kiểm tra cuối không cần chờ, theo nhịp của bạn.',
      id: 'Dengan Premium, energi tanpa batas: pelajaran, kuis, dan ujian akhir tanpa timer tunggu, sesuai ritmemu.',
      tr: 'Premium ile sınırsız enerji: dersler, quizler ve final sınavı bekleme sayacı olmadan, senin ritminde.',
      pl: 'Z Premium energia jest bez limitu: lekcje, quizy i egzamin końcowy bez czekania, w twoim rytmie.',
    },
  },
  course_after_lesson3: COURSE_AFTER_LESSON3_PLANNED_COPY,
  lesson_b1: COURSE_AFTER_LESSON3_PLANNED_COPY,
  quiz_limit: {
    title: { 'pt-BR': 'O limite de quizzes de hoje acabou', vi: 'Đã hết lượt quiz hôm nay', id: 'Batas kuis hari ini habis', tr: 'Bugünkü quiz sınırı doldu', pl: 'Dzisiejszy limit quizów został wykorzystany' },
    subtitle: {
      'pt-BR': 'A versão grátis inclui 3 quizzes por dia. Premium remove o limite diário para você praticar sem pausas.',
      vi: 'Bản miễn phí có 3 quiz mỗi ngày. Premium bỏ giới hạn hằng ngày để bạn luyện tập không bị ngắt quãng.',
      id: 'Versi gratis mencakup 3 kuis per hari. Premium menghapus batas harian agar kamu bisa berlatih tanpa jeda.',
      tr: 'Ücretsiz sürüm günde 3 quiz içerir. Premium günlük sınırı kaldırır, böylece ara vermeden pratik yapabilirsin.',
      pl: 'Wersja darmowa obejmuje 3 quizy dziennie. Premium usuwa limit dzienny, aby można było ćwiczyć bez przerw.',
    },
  },
  quiz_level: {
    title: { 'pt-BR': 'Mais quizzes todos os dias', vi: 'Thêm quiz mỗi ngày', id: 'Lebih banyak kuis setiap hari', tr: 'Her gün daha fazla quiz', pl: 'Więcej quizów każdego dnia' },
    subtitle: {
      'pt-BR': 'A versão grátis inclui 3 quizzes por dia. Premium remove o limite diário para você praticar sem pausas.',
      vi: 'Bản miễn phí có 3 quiz mỗi ngày. Premium bỏ giới hạn hằng ngày để bạn luyện tập không bị ngắt quãng.',
      id: 'Versi gratis mencakup 3 kuis per hari. Premium menghapus batas harian agar kamu bisa berlatih tanpa jeda.',
      tr: 'Ücretsiz sürüm günde 3 quiz içerir. Premium günlük sınırı kaldırır, böylece ara vermeden pratik yapabilirsin.',
      pl: 'Wersja darmowa obejmuje 3 quizy dziennie. Premium usuwa limit dzienny, aby można było ćwiczyć bez przerw.',
    },
  },
  quiz_medium: {
    title: { 'pt-BR': 'Mais quizzes todos os dias', vi: 'Thêm quiz mỗi ngày', id: 'Lebih banyak kuis setiap hari', tr: 'Her gün daha fazla quiz', pl: 'Więcej quizów każdego dnia' },
    subtitle: {
      'pt-BR': 'A versão grátis inclui 3 quizzes por dia. Premium remove o limite diário para você praticar sem pausas.',
      vi: 'Bản miễn phí có 3 quiz mỗi ngày. Premium bỏ giới hạn hằng ngày để bạn luyện tập không bị ngắt quãng.',
      id: 'Versi gratis mencakup 3 kuis per hari. Premium menghapus batas harian agar kamu bisa berlatih tanpa jeda.',
      tr: 'Ücretsiz sürüm günde 3 quiz içerir. Premium günlük sınırı kaldırır, böylece ara vermeden pratik yapabilirsin.',
      pl: 'Wersja darmowa obejmuje 3 quizy dziennie. Premium usuwa limit dzienny, aby można było ćwiczyć bez przerw.',
    },
  },
  quiz_hard: {
    title: { 'pt-BR': 'Mais quizzes todos os dias', vi: 'Thêm quiz mỗi ngày', id: 'Lebih banyak kuis setiap hari', tr: 'Her gün daha fazla quiz', pl: 'Więcej quizów każdego dnia' },
    subtitle: {
      'pt-BR': 'A versão grátis inclui 3 quizzes por dia. Premium remove o limite diário para você praticar sem pausas.',
      vi: 'Bản miễn phí có 3 quiz mỗi ngày. Premium bỏ giới hạn hằng ngày để bạn luyện tập không bị ngắt quãng.',
      id: 'Versi gratis mencakup 3 kuis per hari. Premium menghapus batas harian agar kamu bisa berlatih tanpa jeda.',
      tr: 'Ücretsiz sürüm günde 3 quiz içerir. Premium günlük sınırı kaldırır, böylece ara vermeden pratik yapabilirsin.',
      pl: 'Wersja darmowa obejmuje 3 quizy dziennie. Premium usuwa limit dzienny, aby można było ćwiczyć bez przerw.',
    },
  },
  flashcard_limit: {
    title: { 'pt-BR': 'Sua base de cartões não deve ter limite', vi: 'Kho thẻ của bạn không nên có giới hạn', id: 'Koleksi kartumu tidak perlu dibatasi', tr: 'Kart arşivin sınırlı olmamalı', pl: 'Twoja baza fiszek nie powinna mieć limitu' },
    subtitle: {
      'pt-BR': 'Salve todas as frases importantes e monte seu sistema pessoal de revisão sem teto.',
      vi: 'Lưu mọi cụm từ quan trọng và xây hệ thống ôn tập cá nhân không giới hạn.',
      id: 'Simpan semua frasa penting dan bangun sistem pengulangan pribadi tanpa batas atas.',
      tr: 'Önemli tüm ifadeleri kaydet ve sınırsız kişisel tekrar sistemini kur.',
      pl: 'Zapisuj wszystkie ważne frazy i buduj własny system powtórek bez sufitu.',
    },
  },
  streak: {
    title: { 'pt-BR': 'Não perca a sequência que você construiu', vi: 'Đừng mất chuỗi bạn đã xây dựng', id: 'Jangan kehilangan streak yang sudah kamu bangun', tr: 'Kurduğun seriyi kaybetme', pl: 'Nie trać serii, którą już zbudowałeś' },
    subtitle: {
      'pt-BR': 'Premium protege seu ritmo: estude sem pausas e não volte atrás por um dia perdido.',
      vi: 'Premium bảo vệ nhịp học: học không gián đoạn và không bị tụt lại vì một ngày bỏ lỡ.',
      id: 'Premium melindungi ritmemu: belajar tanpa jeda dan tidak mundur karena satu hari terlewat.',
      tr: 'Premium ritmini korur: ara vermeden çalış ve tek bir kaçırılan gün yüzünden geri düşme.',
      pl: 'Premium chroni twój rytm: ucz się bez przerw i nie cofaj się przez jeden opuszczony dzień.',
    },
  },
  theme: {
    title: { 'pt-BR': 'Personalize o aprendizado do seu jeito', vi: 'Cá nhân hóa việc học theo bạn', id: 'Sesuaikan belajar dengan gayamu', tr: 'Öğrenmeyi kendine göre kişiselleştir', pl: 'Dopasuj naukę do siebie' },
    subtitle: {
      'pt-BR': 'Com Premium, o app fica mais seu: mais envolvimento e mais regularidade nos estudos.',
      vi: 'Với Premium, ứng dụng giống của bạn hơn: gắn bó hơn và học đều hơn.',
      id: 'Dengan Premium, aplikasi terasa lebih milikmu: lebih terlibat dan lebih konsisten.',
      tr: 'Premium ile uygulama sana ait hisseder: daha fazla bağlılık, daha düzenli çalışma.',
      pl: 'Z Premium aplikacja staje się bardziej twoja: większe zaangażowanie i regularność.',
    },
  },
  club: {
    title: { 'pt-BR': 'Acelere o progresso com clubes e bônus', vi: 'Tăng tiến bộ bằng câu lạc bộ và bonus', id: 'Perkuat progres lewat klub dan bonus', tr: 'Kulüpler ve bonuslarla ilerlemeyi güçlendir', pl: 'Wzmocnij postęp przez kluby i bonusy' },
    subtitle: {
      'pt-BR': 'Compita, ganhe mais XP e não saia do ritmo.',
      vi: 'Thi đấu, nhận thêm XP và giữ nhịp học.',
      id: 'Bersaing, dapatkan lebih banyak XP, dan tetap dalam ritme.',
      tr: 'Yarış, daha fazla XP kazan ve ritmini kaybetme.',
      pl: 'Rywalizuj, zdobywaj więcej XP i trzymaj rytm.',
    },
  },
  trainer: {
    title: { 'pt-BR': 'Treinador: seu plano pessoal de revisão', vi: 'Huấn luyện viên: kế hoạch ôn tập cá nhân', id: 'Trainer: rencana pengulangan personalmu', tr: 'Antrenör: kişisel tekrar planın', pl: 'Trener: twój osobisty plan powtórek' },
    subtitle: {
      'pt-BR': 'Pontos fracos, Smart Mix, Por tema e Difíceis: 4 modos funcionam só no Premium. Sem limite de sessões.',
      vi: 'Điểm yếu, Smart Mix, Theo chủ đề, Câu khó: 4 chế độ chỉ có trong Premium. Không giới hạn phiên.',
      id: 'Titik lemah, Smart Mix, Per topik, Sulit: 4 mode hanya berjalan di Premium. Tanpa batas sesi.',
      tr: 'Zayıf noktalar, Smart Mix, Konuya göre, Zorlar: 4 mod sadece Premium ile çalışır. Seans sınırı yok.',
      pl: 'Słabe punkty, Smart Mix, Według tematu, Trudne: 4 tryby działają tylko w Premium. Bez limitu sesji.',
    },
  },
  trainer_limit: {
    // gain-framing, без хардкода числа бесплатных сессий (A/B-переменное)
    title: { 'pt-BR': 'Treine quanto quiser', vi: 'Luyện tập thỏa thích', id: 'Berlatih sepuasnya', tr: 'İstediğin kadar antrenman', pl: 'Trenuj ile chcesz' },
    subtitle: {
      'pt-BR': 'Premium abre sessões ilimitadas do Treinador em todos os modos.',
      vi: 'Premium mở các phiên Huấn luyện viên không giới hạn ở mọi chế độ.',
      id: 'Premium membuka sesi Trainer tanpa batas di semua mode.',
      tr: 'Premium tüm modlarda sınırsız Antrenör seansı açar.',
      pl: 'Premium otwiera nieograniczone sesje Trenera we wszystkich trybach.',
    },
  },
  diagnosis_training: {
    title: { 'pt-BR': 'Novas análises de erros no Premium', vi: 'Phân tích lỗi mới có trong Premium', id: 'Analisis kesalahan baru ada di Premium', tr: 'Yeni hata analizleri Premium’da', pl: 'Nowe analizy błędów w Premium' },
    subtitle: {
      'pt-BR': 'A primeira análise pessoal é grátis. Premium abre cada erro novo: explicação clara, forma correta e prática com frases parecidas sem limite.',
      vi: 'Phân tích cá nhân đầu tiên miễn phí. Premium mở từng lỗi mới: giải thích rõ, dạng đúng và luyện câu tương tự không giới hạn.',
      id: 'Analisis personal pertama gratis. Premium membuka setiap kesalahan baru: penjelasan jelas, bentuk benar, dan latihan frasa mirip tanpa batas.',
      tr: 'İlk kişisel analiz ücretsiz. Premium her yeni hatayı açar: net açıklama, doğru biçim ve benzer ifadelerle sınırsız pratik.',
      pl: 'Pierwsza analiza osobista jest darmowa. Premium otwiera każdy nowy błąd: jasne wyjaśnienie, poprawną wersję i ćwiczenia na podobnych frazach bez limitu.',
    },
  },
  mastery: {
    title: { 'pt-BR': 'Repita lições sem limites', vi: 'Ôn lại bài học không giới hạn', id: 'Ulang pelajaran tanpa batas', tr: 'Dersleri sınırsız tekrar et', pl: 'Powtarzaj lekcje bez ograniczeń' },
    subtitle: {
      'pt-BR': 'Com Premium, qualquer lição concluída fica aberta para repetir sem gastar fragmentos, mesmo quando o preço subiria a cada repetição.',
      vi: 'Với Premium, mọi bài đã hoàn thành đều có thể ôn lại mà không tốn mảnh, kể cả khi giá tăng sau mỗi lần học lại.',
      id: 'Dengan Premium, semua pelajaran selesai bisa diulang tanpa memakai fragmen, bahkan saat harga naik di tiap pengulangan.',
      tr: 'Premium ile tamamlanan her dersi parça harcamadan tekrar edersin, ücretsiz modda fiyat her tekrar artsa bile.',
      pl: 'Z Premium każda ukończona lekcja jest otwarta do powtórki bez odłamków, nawet gdy w trybie free cena rosłaby po każdym przejściu.',
    },
  },
  stats: {
    title: { 'pt-BR': 'Análises de progresso no Premium', vi: 'Phân tích tiến bộ dành cho Premium', id: 'Analitik progres untuk Premium', tr: 'İlerleme analizi Premium’da', pl: 'Analityka postępu w Premium' },
    subtitle: {
      'pt-BR': 'Mapa anual de atividade, padrões de erro e comparação com outros alunos. Você vê seu crescimento com clareza.',
      vi: 'Bản đồ hoạt động cả năm, mẫu lỗi và so sánh với học viên khác. Bạn thấy rõ bức tranh tiến bộ của mình.',
      id: 'Peta aktivitas setahun, pola kesalahan, dan perbandingan dengan siswa lain. Kamu melihat perkembangan dengan jelas.',
      tr: 'Yıllık etkinlik haritası, hata kalıpları ve diğer öğrencilerle karşılaştırma. Gelişimini net görürsün.',
      pl: 'Roczna mapa aktywności, wzorce błędów i porównanie z innymi uczniami. Widzisz jasny obraz swojego wzrostu.',
    },
  },
  heatmap: {
    title: { 'pt-BR': 'Mapa de atividade no Premium', vi: 'Bản đồ hoạt động dành cho Premium', id: 'Peta aktivitas untuk Premium', tr: 'Etkinlik haritası Premium’da', pl: 'Mapa aktywności w Premium' },
    subtitle: {
      'pt-BR': '365 dias de estudo em uma tela: veja seus períodos fortes e fracos.',
      vi: '365 ngày học trên một màn hình: thấy giai đoạn mạnh và yếu của bạn.',
      id: '365 hari belajar dalam satu layar: lihat periode kuat dan lemahmu.',
      tr: 'Tek ekranda 365 gün çalışma: güçlü ve zayıf dönemlerini gör.',
      pl: '365 dni nauki na jednym ekranie: zobacz swoje mocne i słabe okresy.',
    },
  },
  patterns: {
    title: { 'pt-BR': 'Padrões dos seus erros', vi: 'Mẫu lỗi của bạn', id: 'Pola kesalahanmu', tr: 'Hata kalıpların', pl: 'Wzorce twoich błędów' },
    subtitle: {
      'pt-BR': 'Descubra em quais temas e frases você mais erra — e treine exatamente isso.',
      vi: 'Biết chủ đề và cụm từ bạn sai nhiều nhất — rồi luyện đúng phần đó.',
      id: 'Temukan topik dan frasa yang paling sering salah — lalu latih tepat bagian itu.',
      tr: 'En çok hangi konularda ve ifadelerde hata yaptığını gör — tam onları çalış.',
      pl: 'Zobacz, w jakich tematach i frazach mylisz się najczęściej — i trenuj właśnie je.',
    },
  },
  percentiles: {
    title: { 'pt-BR': 'Comparação com outros no Premium', vi: 'So sánh với người khác dành cho Premium', id: 'Perbandingan dengan pengguna lain di Premium', tr: 'Diğerleriyle karşılaştırma Premium’da', pl: 'Porównanie z innymi w Premium' },
    subtitle: {
      'pt-BR': 'Veja onde você se destaca entre os alunos. Sem desmotivar: só o que mostra sua força.',
      vi: 'Xem bạn nổi bật ở đâu so với học viên khác. Không làm nản: chỉ những điểm bạn mạnh.',
      id: 'Lihat di mana kamu unggul di antara siswa lain. Tanpa menjatuhkan motivasi: hanya sisi kuatmu.',
      tr: 'Öğrenciler arasında nerede öne çıktığını gör. Moral bozma yok: sadece güçlü olduğun yerler.',
      pl: 'Zobacz, gdzie jesteś wysoko wśród uczniów. Bez demotywacji: tylko to, w czym jesteś mocny.',
    },
  },
  generic: {
    title: { 'pt-BR': 'Aprenda mais rápido com Premium', vi: 'Học nhanh hơn với Premium', id: 'Belajar lebih cepat dengan Premium', tr: 'Premium ile daha hızlı öğren', pl: 'Ucz się szybciej z Premium' },
    subtitle: {
      'pt-BR': 'Mais prática, menos limites e progresso estável todos os dias.',
      vi: 'Nhiều luyện tập hơn, ít giới hạn hơn và tiến bộ đều mỗi ngày.',
      id: 'Lebih banyak latihan, lebih sedikit batasan, dan progres stabil setiap hari.',
      tr: 'Daha çok pratik, daha az sınır ve her gün istikrarlı ilerleme.',
      pl: 'Więcej praktyki, mniej ograniczeń i stabilny postęp każdego dnia.',
    },
  },
};

PAYWALL_PLANNED_COPY.personal_plan = {
  title: {
    'pt-BR': 'Ative seu plano pessoal',
    vi: 'Kích hoạt kế hoạch cá nhân',
    id: 'Aktifkan rencana personalmu',
    tr: 'Kişisel planını aç',
    pl: 'Włącz swój plan osobisty',
  },
  subtitle: {
    'pt-BR': 'Premium libera tarefas diárias: lições, frases reais, revisão e quizzes alinhados ao seu objetivo.',
    vi: 'Premium mở nhiệm vụ hằng ngày: bài học, câu thật, ôn tập và quiz theo mục tiêu của bạn.',
    id: 'Premium membuka tugas harian: pelajaran, frasa nyata, pengulangan, dan kuis sesuai tujuanmu.',
    tr: 'Premium günlük görevleri açar: dersler, gerçek ifadeler, tekrar ve hedefe uygun quizler.',
    pl: 'Premium otwiera codzienne zadania: lekcje, żywe frazy, powtórki i quizy pod twój cel.',
  },
};

function getHeroPlannedCopy(ctx: PremiumContext, savedCards: number): PremiumPlannedHeroCopy {
  const planned = PAYWALL_PLANNED_COPY[ctx] ?? PAYWALL_PLANNED_COPY.generic;
  if (ctx !== 'flashcard_limit' || savedCards <= 0) return planned;
  return {
    ...planned,
    title: {
      'pt-BR': `${savedCards}/20 cartões salvos`,
      vi: `Đã lưu ${savedCards}/20 thẻ`,
      id: `${savedCards}/20 kartu tersimpan`,
      tr: `${savedCards}/20 kart kaydedildi`,
      pl: `Zapisano ${savedCards}/20 fiszek`,
    },
  };
}

function getPaywallCopy(context?: string): PaywallCopy {
  if (!context) return PAYWALL_COPY.generic;
  return (PAYWALL_COPY as Record<string, PaywallCopy>)[context] ?? PAYWALL_COPY.generic;
}

const getSubscriptionManageUrl = (): string => {
  // RevenueCat manages billing via the native stores.
  // Use platform-specific destination to avoid wrong-store links.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Platform } = require('react-native');
  return Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';
};

const savePremiumLocally = async (plan: Plan, metadata?: RevenueCatPremiumMetadata) => {
  // expiry = 0 means "managed by RevenueCat". Store/trial expiry is synced separately
  // as premium_rc_expiry_ms so admin can display it without making the client expire early.
  await persistStorePremiumLocally(plan, metadata);
};

// ── Контекстные герои ─────────────────────────────────────────────────────────
interface HeroConfig {
  emoji: string;
  titleRu: string;
  titleUk: string;
  titleEs: string;
  subtitleRu: string;
  subtitleUk: string;
  subtitleEs: string;
  highlightRow: number; // индекс строки сравнения для подсветки (0-5)
}

function getHero(
  ctx: PremiumContext,
  streakDays: number,
  lessonsDone: number,
  savedCards: number,
): HeroConfig {
  const copy = getPaywallCopy(ctx);
  switch (ctx) {
    case 'arena':
      return {
        emoji: '⚔️',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 1,
      };
    case 'no_energy':
      return {
        emoji: '⚡',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 0,
      };
    case 'course_after_lesson3':
    case 'lesson_b1':
      return {
        emoji: '🎓',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 0,
      };
    case 'quiz_limit':
      return {
        emoji: '⚡',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 1,
      };
    case 'quiz_level':
      return {
        emoji: '🧠',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 1,
      };
    case 'quiz_medium':
      return {
        emoji: '🔥',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 1,
      };
    case 'quiz_hard':
      return {
        emoji: '💜',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 1,
      };
    case 'flashcard_limit':
      return {
        emoji: '📚',
        titleRu: savedCards > 0 ? `Сохранено ${savedCards}/20 карточек` : copy.titleRu,
        titleUk: savedCards > 0 ? `Збережено ${savedCards}/20 карток` : copy.titleUk,
        titleEs: savedCards > 0 ? `Guardadas ${savedCards}/20 tarjetas` : copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 2,
      };
    case 'streak':
      return {
        emoji: '🔥',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 4,
      };
    case 'theme':
      return {
        emoji: '🎨',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 3,
      };
    case 'club':
      return {
        emoji: '🏆',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: -1,
      };
    case 'trainer':
    case 'trainer_limit':
    case 'diagnosis_training':
      return {
        emoji: '🧠',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: -1,
      };
    case 'mastery':
      return {
        emoji: '🔁',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: -1,
      };
    case 'stats':
    case 'heatmap':
    case 'patterns':
    case 'percentiles':
      return {
        emoji: '📊',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: -1,
      };
    default:
      return {
        emoji: '✨',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: -1,
      };
  }
}

const CONTEXT_BENEFITS: Partial<Record<PremiumContext, ({ ru: string; uk: string; es: string } & PremiumPlannedCopy)[]>> & { generic: ({ ru: string; uk: string; es: string } & PremiumPlannedCopy)[] } = {
  arena: [
    { ru: 'Дневной потолок матчей снимается', uk: 'Денну межу матчів знято', es: 'Se quita el techo diario de partidas', 'pt-BR': 'O teto diário de partidas é removido', vi: 'Gỡ giới hạn trận hằng ngày', id: 'Batas pertandingan harian dihapus', tr: 'Günlük maç tavanı kalkar', pl: 'Dzienny limit meczów znika' },
    { ru: 'Дуэли без ощущения «на сегодня всё»', uk: 'Дуелі без «на сьогодні вже досить»', es: 'Duelos sin el «ya basta por hoy»', 'pt-BR': 'Duelos sem “por hoje chega”', vi: 'Đấu mà không bị “hôm nay đủ rồi”', id: 'Duel tanpa rasa “cukup hari ini”', tr: '“Bugünlük yeter” hissi olmadan düello', pl: 'Pojedynki bez “na dziś wystarczy”' },
    { ru: 'Темп и мотивация в тренировках сильнее', uk: 'Темп і мотивація в тренуваннях сильніші', es: 'Ritmo y motivación en el entrenamiento', 'pt-BR': 'Mais ritmo e motivação nos treinos', vi: 'Nhịp và động lực luyện tập mạnh hơn', id: 'Ritme dan motivasi latihan lebih kuat', tr: 'Antrenmanda daha güçlü tempo ve motivasyon', pl: 'Silniejsze tempo i motywacja w treningu' },
  ],
  no_energy: [
    { ru: 'Свободные занятия без таймера', uk: 'Вільні заняття без таймера', es: 'Sesiones sin temporizador de espera', 'pt-BR': 'Estudo livre sem temporizador', vi: 'Học tự do không cần chờ timer', id: 'Sesi bebas tanpa timer tunggu', tr: 'Bekleme sayacı olmadan serbest çalışma', pl: 'Swobodna nauka bez timera' },
    { ru: 'Урок, квиз и финальный экзамен без вынужденных пауз', uk: 'Урок, квіз і фінальний іспит без вимушених пауз', es: 'Lección, quiz y examen sin pausas forzadas', 'pt-BR': 'Lição, quiz e exame final sem pausas forçadas', vi: 'Bài học, quiz và bài cuối không bị dừng ép buộc', id: 'Pelajaran, kuis, dan ujian akhir tanpa jeda paksa', tr: 'Ders, quiz ve final sınavı zorunlu ara olmadan', pl: 'Lekcja, quiz i egzamin bez wymuszonych przerw' },
    { ru: 'Стабильный дневной ритм без срывов', uk: 'Стабільний щоденний ритм без зривів', es: 'Ritmo diario estable sin frenos', 'pt-BR': 'Ritmo diário estável sem travar', vi: 'Nhịp học hằng ngày ổn định hơn', id: 'Ritme harian stabil tanpa terhenti', tr: 'Aksamadan istikrarlı günlük ritim', pl: 'Stabilny rytm dnia bez zrywów' },
  ],
  course_after_lesson3: [
    { ru: 'Текущий уровень открывается целиком сразу', uk: 'Поточний рівень відкривається повністю одразу', es: 'Tu nivel actual se abre completo al instante', 'pt-BR': 'O nível atual abre completo na hora', vi: 'Cấp hiện tại mở toàn bộ ngay', id: 'Level saat ini langsung terbuka penuh', tr: 'Mevcut seviye hemen tamamen açılır', pl: 'Obecny poziom od razu otwiera się w całości' },
    { ru: 'Никаких барьеров — просто учись дальше в своё удовольствие', uk: 'Жодних бар\'єрів — просто навчайся далі із задоволенням', es: 'Sin barreras — sigue aprendiendo a tu gusto', 'pt-BR': 'Sem barreiras — continue estudando no seu ritmo', vi: 'Không rào cản — cứ học tiếp theo nhịp của bạn', id: 'Tanpa hambatan — lanjut belajar dengan nyaman', tr: 'Engel yok — keyifle devam et', pl: 'Bez barier — ucz się dalej swoim tempem' },
    { ru: 'Следующие уровни открываются через экзамены', uk: 'Наступні рівні відкриваються через екзамени', es: 'Los siguientes niveles se abren con exámenes', 'pt-BR': 'Os próximos níveis abrem com exames', vi: 'Cấp tiếp theo mở qua bài kiểm tra', id: 'Level berikutnya terbuka lewat ujian', tr: 'Sonraki seviyeler sınavlarla açılır', pl: 'Kolejne poziomy otwierają się przez egzaminy' },
  ],
  lesson_b1: [
    { ru: 'Текущий уровень открывается целиком сразу', uk: 'Поточний рівень відкривається повністю одразу', es: 'Tu nivel actual se abre completo al instante', 'pt-BR': 'O nível atual abre completo na hora', vi: 'Cấp hiện tại mở toàn bộ ngay', id: 'Level saat ini langsung terbuka penuh', tr: 'Mevcut seviye hemen tamamen açılır', pl: 'Obecny poziom od razu otwiera się w całości' },
    { ru: 'Никаких барьеров — просто учись дальше в своё удовольствие', uk: 'Жодних бар\'єрів — просто навчайся далі із задоволенням', es: 'Sin barreras — sigue aprendiendo a tu gusto', 'pt-BR': 'Sem barreiras — continue estudando no seu ritmo', vi: 'Không rào cản — cứ học tiếp theo nhịp của bạn', id: 'Tanpa hambatan — lanjut belajar dengan nyaman', tr: 'Engel yok — keyifle devam et', pl: 'Bez barier — ucz się dalej swoim tempem' },
    { ru: 'Следующие уровни открываются через экзамены', uk: 'Наступні рівні відкриваються через екзамени', es: 'Los siguientes niveles se abren con exámenes', 'pt-BR': 'Os próximos níveis abrem com exames', vi: 'Cấp tiếp theo mở qua bài kiểm tra', id: 'Level berikutnya terbuka lewat ujian', tr: 'Sonraki seviyeler sınavlarla açılır', pl: 'Kolejne poziomy otwierają się przez egzaminy' },
  ],
  quiz_limit: [
    { ru: 'Без лимита попыток и остановок', uk: 'Без ліміту спроб і зупинок', es: 'Sin límite de intentos ni frenos', 'pt-BR': 'Sem limite de tentativas nem pausas', vi: 'Không giới hạn lượt thử và không bị dừng', id: 'Tanpa batas percobaan dan hambatan', tr: 'Deneme ve duraklama sınırı yok', pl: 'Bez limitu prób i zatrzymań' },
    { ru: 'Регулярный учебный ритм каждый день', uk: 'Регулярний навчальний ритм щодня', es: 'Ritmo de estudio estable cada día', 'pt-BR': 'Ritmo de estudo regular todos os dias', vi: 'Nhịp học đều đặn mỗi ngày', id: 'Ritme belajar teratur setiap hari', tr: 'Her gün düzenli öğrenme ritmi', pl: 'Regularny rytm nauki każdego dnia' },
    { ru: 'Больше XP и пользы сессий', uk: 'Більше XP і користі від сесій', es: 'Más XP y valor en cada sesión', 'pt-BR': 'Mais XP e mais valor por sessão', vi: 'Thêm XP và giá trị từ mỗi phiên', id: 'Lebih banyak XP dan manfaat sesi', tr: 'Oturumlardan daha fazla XP ve fayda', pl: 'Więcej XP i korzyści z sesji' },
  ],
  quiz_level: [
    { ru: 'Без дневного лимита на квизы', uk: 'Без денного ліміту на квізи', es: 'Sin límite diario de cuestionarios', 'pt-BR': 'Sem limite diário de quizzes', vi: 'Không giới hạn quiz mỗi ngày', id: 'Tanpa batas kuis harian', tr: 'Günlük quiz sınırı yok', pl: 'Bez dziennego limitu quizów' },
    { ru: 'Больше практики в удобном ритме', uk: 'Більше практики у зручному ритмі', es: 'Más práctica a tu ritmo', 'pt-BR': 'Mais prática no seu ritmo', vi: 'Luyện tập nhiều hơn theo nhịp của bạn', id: 'Lebih banyak latihan sesuai ritmemu', tr: 'Kendi ritminde daha fazla pratik', pl: 'Więcej praktyki we własnym rytmie' },
    { ru: 'Больше практики и XP каждый день', uk: 'Більше практики та XP щодня', es: 'Más práctica y XP cada día', 'pt-BR': 'Mais prática e XP todos os dias', vi: 'Thêm luyện tập và XP mỗi ngày', id: 'Lebih banyak latihan dan XP tiap hari', tr: 'Her gün daha fazla pratik ve XP', pl: 'Więcej praktyki i XP każdego dnia' },
  ],
  quiz_medium: [
    { ru: 'Без дневного лимита на квизы', uk: 'Без денного ліміту на квізи', es: 'Sin límite diario de cuestionarios', 'pt-BR': 'Sem limite diário de quizzes', vi: 'Không giới hạn quiz mỗi ngày', id: 'Tanpa batas kuis harian', tr: 'Günlük quiz sınırı yok', pl: 'Bez dziennego limitu quizów' },
    { ru: 'Больше практики в удобном ритме', uk: 'Більше практики у зручному ритмі', es: 'Más práctica a tu ritmo', 'pt-BR': 'Mais prática no seu ritmo', vi: 'Luyện tập nhiều hơn theo nhịp của bạn', id: 'Lebih banyak latihan sesuai ritmemu', tr: 'Kendi ritminde daha fazla pratik', pl: 'Więcej praktyki we własnym rytmie' },
    { ru: 'Больше практики и XP каждый день', uk: 'Більше практики та XP щодня', es: 'Más práctica y XP cada día', 'pt-BR': 'Mais prática e XP todos os dias', vi: 'Thêm luyện tập và XP mỗi ngày', id: 'Lebih banyak latihan dan XP tiap hari', tr: 'Her gün daha fazla pratik ve XP', pl: 'Więcej praktyki i XP każdego dnia' },
  ],
  quiz_hard: [
    { ru: 'Без дневного лимита на квизы', uk: 'Без денного ліміту на квізи', es: 'Sin límite diario de cuestionarios', 'pt-BR': 'Sem limite diário de quizzes', vi: 'Không giới hạn quiz mỗi ngày', id: 'Tanpa batas kuis harian', tr: 'Günlük quiz sınırı yok', pl: 'Bez dziennego limitu quizów' },
    { ru: 'Больше практики в удобном ритме', uk: 'Більше практики у зручному ритмі', es: 'Más práctica a tu ritmo', 'pt-BR': 'Mais prática no seu ritmo', vi: 'Luyện tập nhiều hơn theo nhịp của bạn', id: 'Lebih banyak latihan sesuai ritmemu', tr: 'Kendi ritminde daha fazla pratik', pl: 'Więcej praktyki we własnym rytmie' },
    { ru: 'Больше практики и XP каждый день', uk: 'Більше практики та XP щодня', es: 'Más práctica y XP cada día', 'pt-BR': 'Mais prática e XP todos os dias', vi: 'Thêm luyện tập và XP mỗi ngày', id: 'Lebih banyak latihan dan XP tiap hari', tr: 'Her gün daha fazla pratik ve XP', pl: 'Więcej praktyki i XP każdego dnia' },
  ],
  flashcard_limit: [
    { ru: 'Безлимит на личную базу карточек', uk: 'Безліміт на особисту базу карток', es: 'Tu colección de tarjetas sin límite', 'pt-BR': 'Sem limite para sua base de cartões', vi: 'Không giới hạn kho thẻ cá nhân', id: 'Tanpa batas untuk koleksi kartu pribadi', tr: 'Kişisel kart arşivinde sınır yok', pl: 'Bez limitu własnej bazy fiszek' },
    { ru: 'Храни все важные фразы', uk: 'Зберігай всі важливі фрази', es: 'Guarda todas tus frases clave', 'pt-BR': 'Guarde todas as frases importantes', vi: 'Lưu mọi cụm từ quan trọng', id: 'Simpan semua frasa penting', tr: 'Tüm önemli ifadeleri sakla', pl: 'Przechowuj wszystkie ważne frazy' },
    { ru: 'Лучше долгосрочное запоминание', uk: 'Краще довгострокове запам\'ятовування', es: 'Memoria a largo plazo más sólida', 'pt-BR': 'Memória de longo prazo mais sólida', vi: 'Ghi nhớ dài hạn chắc hơn', id: 'Ingatan jangka panjang lebih kuat', tr: 'Daha sağlam uzun vadeli hafıza', pl: 'Lepsze zapamiętywanie długoterminowe' },
  ],
  streak: [
    { ru: 'Защита серии даже при пропуске', uk: 'Захист серії навіть при пропуску', es: 'Protege tu racha aunque faltes un día', 'pt-BR': 'Proteção de sequência mesmo se faltar um dia', vi: 'Bảo vệ chuỗi kể cả khi bỏ lỡ một ngày', id: 'Perlindungan streak meski terlewat sehari', tr: 'Bir gün kaçsa bile seri koruması', pl: 'Ochrona serii nawet przy pominięciu dnia' },
    { ru: 'Без пауз из-за энергии', uk: 'Без пауз через енергію', es: 'Sin pausas por energía', 'pt-BR': 'Sem pausas por falta de energia', vi: 'Không bị nghỉ vì hết năng lượng', id: 'Tanpa jeda karena energi', tr: 'Enerji yüzünden ara yok', pl: 'Bez przerw przez energię' },
    { ru: 'Стабильный ежедневный прогресс', uk: 'Стабільний щоденний прогрес', es: 'Avance estable cada día', 'pt-BR': 'Progresso diário estável', vi: 'Tiến bộ hằng ngày ổn định', id: 'Progres harian stabil', tr: 'İstikrarlı günlük ilerleme', pl: 'Stabilny codzienny postęp' },
  ],
  theme: [
    { ru: 'Персональный стиль приложения', uk: 'Персональний стиль застосунку', es: 'Estilo visual a tu medida', 'pt-BR': 'Estilo visual do seu jeito', vi: 'Phong cách giao diện theo bạn', id: 'Gaya visual sesuai seleramu', tr: 'Kişisel uygulama stili', pl: 'Osobisty styl aplikacji' },
    { ru: 'Выше вовлеченность в обучение', uk: 'Вища залученість у навчання', es: 'Mayor compromiso al estudiar', 'pt-BR': 'Mais envolvimento no estudo', vi: 'Gắn bó hơn với việc học', id: 'Lebih terlibat saat belajar', tr: 'Öğrenmeye daha fazla bağlılık', pl: 'Większe zaangażowanie w naukę' },
    { ru: 'Комфортнее заниматься регулярно', uk: 'Комфортніше займатися регулярно', es: 'Sesiones más cómodas y rutinarias', 'pt-BR': 'Mais conforto para estudar sempre', vi: 'Thoải mái hơn để học đều', id: 'Lebih nyaman untuk belajar rutin', tr: 'Düzenli çalışmak daha rahat', pl: 'Wygodniej uczyć się regularnie' },
  ],
  club: [
    { ru: 'Клубы и XP-бусты для ускорения', uk: 'Клуби та XP-бусти для прискорення', es: 'Clubs y bonus de XP para acelerar', 'pt-BR': 'Clubes e boosts de XP para acelerar', vi: 'Câu lạc bộ và boost XP để tăng tốc', id: 'Klub dan boost XP untuk mempercepat', tr: 'Hızlanmak için kulüpler ve XP boostları', pl: 'Kluby i boosty XP do przyspieszenia' },
    { ru: 'Больше пользы с каждой сессии', uk: 'Більше користі з кожної сесії', es: 'Sacas más de cada sesión', 'pt-BR': 'Mais valor em cada sessão', vi: 'Mỗi phiên học có ích hơn', id: 'Manfaat lebih besar di tiap sesi', tr: 'Her seanstan daha fazla fayda', pl: 'Więcej wartości z każdej sesji' },
    { ru: 'Сильнее мотивация возвращаться', uk: 'Сильніша мотивація повертатися', es: 'Más ganas de volver mañana', 'pt-BR': 'Mais motivação para voltar amanhã', vi: 'Thêm động lực quay lại ngày mai', id: 'Lebih termotivasi untuk kembali besok', tr: 'Yarın dönmek için daha güçlü motivasyon', pl: 'Silniejsza motywacja, żeby wrócić jutro' },
  ],
  generic: [
    { ru: 'Больше практики без ограничений', uk: 'Більше практики без обмежень', es: 'Más práctica sin límites', 'pt-BR': 'Mais prática sem limites', vi: 'Nhiều luyện tập hơn, không giới hạn', id: 'Lebih banyak latihan tanpa batas', tr: 'Sınırsız daha fazla pratik', pl: 'Więcej praktyki bez ograniczeń' },
    { ru: 'Стабильный темп и результат', uk: 'Стабільний темп і результат', es: 'Ritmo estable y resultado', 'pt-BR': 'Ritmo e resultado estáveis', vi: 'Nhịp và kết quả ổn định', id: 'Ritme dan hasil stabil', tr: 'İstikrarlı tempo ve sonuç', pl: 'Stabilne tempo i wynik' },
    { ru: 'Премиум-опции сразу после активации', uk: 'Преміум-опції одразу після активації', es: 'Funciones Premium al instante', 'pt-BR': 'Funções Premium logo após ativar', vi: 'Tính năng Premium có ngay sau khi kích hoạt', id: 'Fitur Premium langsung setelah aktif', tr: 'Aktivasyondan hemen sonra Premium özellikler', pl: 'Opcje Premium od razu po aktywacji' },
  ],
  trainer: [
    { ru: 'Слабые места: фразы с наибольшим числом ошибок', uk: 'Слабкі місця: фрази з найбільшою кількістю помилок', es: 'Puntos débiles: frases con más errores', 'pt-BR': 'Pontos fracos: frases com mais erros', vi: 'Điểm yếu: cụm từ bạn sai nhiều nhất', id: 'Titik lemah: frasa dengan kesalahan terbanyak', tr: 'Zayıf noktalar: en çok hata yapılan ifadeler', pl: 'Słabe punkty: frazy z największą liczbą błędów' },
    { ru: 'Smart Mix: алгоритм строит идеальный набор', uk: 'Smart Mix: алгоритм будує ідеальний набір', es: 'Smart Mix: el algoritmo crea el conjunto ideal', 'pt-BR': 'Smart Mix: o algoritmo monta o conjunto ideal', vi: 'Smart Mix: thuật toán tạo bộ luyện phù hợp', id: 'Smart Mix: algoritme menyusun set ideal', tr: 'Smart Mix: algoritma ideal seti kurar', pl: 'Smart Mix: algorytm buduje idealny zestaw' },
    { ru: 'Без лимита сессий в день', uk: 'Без ліміту сесій на день', es: 'Sin límite diario de sesiones', 'pt-BR': 'Sem limite diário de sessões', vi: 'Không giới hạn phiên mỗi ngày', id: 'Tanpa batas sesi harian', tr: 'Günlük seans sınırı yok', pl: 'Bez dziennego limitu sesji' },
    { ru: 'По теме: повтор конкретного урока', uk: 'За темою: повтор конкретного уроку', es: 'Por tema: repaso de una lección específica', 'pt-BR': 'Por tema: revisão de uma lição específica', vi: 'Theo chủ đề: ôn một bài cụ thể', id: 'Per topik: ulang pelajaran tertentu', tr: 'Konuya göre: belirli ders tekrarı', pl: 'Według tematu: powtórka konkretnej lekcji' },
  ],
  trainer_limit: [
    { ru: 'Безлимит сессий Тренера', uk: 'Безліміт сесій Тренера', es: 'Sesiones ilimitadas del Entrenador', 'pt-BR': 'Sessões ilimitadas do Treinador', vi: 'Phiên Huấn luyện viên không giới hạn', id: 'Sesi Trainer tanpa batas', tr: 'Sınırsız Antrenör seansı', pl: 'Sesje Trenera bez limitu' },
    { ru: 'Все 6 режимов без ограничений', uk: 'Всі 6 режимів без обмежень', es: 'Los 6 modos sin restricciones', 'pt-BR': 'Todos os 6 modos sem restrições', vi: 'Cả 6 chế độ không giới hạn', id: 'Semua 6 mode tanpa batasan', tr: '6 modun tamamı sınırsız', pl: 'Wszystkie 6 trybów bez ograniczeń' },
    { ru: 'Смарт-повтор когда хочешь', uk: 'Смарт-повтор коли хочеш', es: 'Repaso inteligente cuando quieras', 'pt-BR': 'Revisão inteligente quando quiser', vi: 'Ôn thông minh bất cứ lúc nào', id: 'Pengulangan pintar kapan saja', tr: 'İstediğin zaman akıllı tekrar', pl: 'Inteligentna powtórka, kiedy chcesz' },
  ],
  diagnosis_training: [
    { ru: 'Каждое слабое место — точный персональный разбор', uk: 'Кожне слабке місце — точний персональний розбір', es: 'Cada punto débil tiene un análisis personal preciso', 'pt-BR': 'Cada ponto fraco vira uma análise pessoal precisa', vi: 'Mỗi điểm yếu thành phân tích cá nhân chính xác', id: 'Setiap titik lemah jadi analisis personal yang tepat', tr: 'Her zayıf nokta net kişisel analize dönüşür', pl: 'Każdy słaby punkt to dokładna analiza osobista' },
    { ru: 'Понятное объяснение: где сбилась фраза и как сказать правильно', uk: 'Зрозуміле пояснення: де збилась фраза і як сказати правильно', es: 'Explicación clara: dónde falla la frase y cómo decirla bien', 'pt-BR': 'Explicação clara: onde a frase falhou e como corrigir', vi: 'Giải thích rõ: câu sai ở đâu và nói đúng thế nào', id: 'Penjelasan jelas: bagian frasa yang salah dan cara benarnya', tr: 'Net açıklama: ifade nerede bozuldu ve doğrusu ne', pl: 'Jasne wyjaśnienie: gdzie fraza się sypie i jak powiedzieć poprawnie' },
    { ru: 'Тренировка на похожих фразах без лимита', uk: 'Тренування на схожих фразах без ліміту', es: 'Práctica con frases parecidas sin límite', 'pt-BR': 'Prática com frases parecidas sem limite', vi: 'Luyện câu tương tự không giới hạn', id: 'Latihan frasa mirip tanpa batas', tr: 'Benzer ifadelerle sınırsız pratik', pl: 'Ćwiczenia na podobnych frazach bez limitu' },
  ],
  mastery: [
    { ru: 'Безлимит повторов любого урока', uk: 'Безліміт повторів будь-якого уроку', es: 'Repeticiones ilimitadas de lecciones', 'pt-BR': 'Repetições ilimitadas de qualquer lição', vi: 'Ôn lại bất kỳ bài nào không giới hạn', id: 'Pengulangan pelajaran apa pun tanpa batas', tr: 'Her ders için sınırsız tekrar', pl: 'Powtórki dowolnej lekcji bez limitu' },
    { ru: 'Не тратишь осколки на перепрохождения уроков', uk: 'Не витрачаєш осколки на перепроходження уроків', es: 'No gastas fragmentos al repetir lecciones', 'pt-BR': 'Você não gasta fragmentos ao repetir lições', vi: 'Không tốn mảnh khi học lại bài', id: 'Tidak memakai fragmen saat mengulang pelajaran', tr: 'Ders tekrarında parça harcamazsın', pl: 'Nie wydajesz odłamków na powtórki lekcji' },
    { ru: 'Тренируй до идеального результата без давления', uk: 'Тренуй до ідеального результату без тиску', es: 'Entrena hasta perfeccionar sin presión', 'pt-BR': 'Treine até o resultado ideal sem pressão', vi: 'Luyện đến kết quả tốt nhất không áp lực', id: 'Latih sampai hasil ideal tanpa tekanan', tr: 'Baskı olmadan ideal sonuca kadar çalış', pl: 'Trenuj do idealnego wyniku bez presji' },
  ],
  stats: [
    { ru: 'Карта активности: все 365 дней', uk: 'Карта активності: всі 365 днів', es: 'Mapa de actividad: los 365 días', 'pt-BR': 'Mapa de atividade: todos os 365 dias', vi: 'Bản đồ hoạt động: đủ 365 ngày', id: 'Peta aktivitas: semua 365 hari', tr: 'Etkinlik haritası: 365 günün tamamı', pl: 'Mapa aktywności: wszystkie 365 dni' },
    { ru: 'Паттерны ошибок и слабые темы', uk: 'Патерни помилок і слабкі теми', es: 'Patrones de errores y temas débiles', 'pt-BR': 'Padrões de erro e temas fracos', vi: 'Mẫu lỗi và chủ đề yếu', id: 'Pola kesalahan dan topik lemah', tr: 'Hata kalıpları ve zayıf konular', pl: 'Wzorce błędów i słabe tematy' },
    { ru: 'Сравнение с другими — где ты в топе', uk: 'Порівняння з іншими — де ти в топі', es: 'Comparación con otros: tu top', 'pt-BR': 'Comparação com outros: onde você se destaca', vi: 'So sánh với người khác: điểm bạn nổi bật', id: 'Perbandingan dengan siswa lain: keunggulanmu', tr: 'Diğerleriyle karşılaştırma: öne çıktığın yer', pl: 'Porównanie z innymi: gdzie jesteś wysoko' },
  ],
  heatmap: [
    { ru: '365 дней активности — увидишь своё постоянство', uk: '365 днів активності — побач свою сталість', es: '365 días: ve tu constancia', 'pt-BR': '365 dias de atividade — veja sua constância', vi: '365 ngày hoạt động — thấy sự đều đặn của bạn', id: '365 hari aktivitas — lihat konsistensimu', tr: '365 gün etkinlik — istikrarını gör', pl: '365 dni aktywności — zobacz swoją regularność' },
    { ru: 'Лучшие и худшие периоды на одном экране', uk: 'Кращі та гірші періоди на одному екрані', es: 'Mejores y peores semanas a la vista', 'pt-BR': 'Melhores e piores períodos em uma tela', vi: 'Giai đoạn tốt và yếu trên một màn hình', id: 'Periode terbaik dan terburuk dalam satu layar', tr: 'En iyi ve en kötü dönemler tek ekranda', pl: 'Najlepsze i słabsze okresy na jednym ekranie' },
    { ru: 'Понимаешь свой ритм обучения', uk: 'Розумієш свій ритм навчання', es: 'Entiendes tu ritmo real', 'pt-BR': 'Você entende seu ritmo real de estudo', vi: 'Hiểu nhịp học thật của bạn', id: 'Kamu memahami ritme belajar yang sebenarnya', tr: 'Gerçek öğrenme ritmini anlarsın', pl: 'Rozumiesz swój prawdziwy rytm nauki' },
  ],
  patterns: [
    { ru: 'Точки роста: где ошибаешься чаще всего', uk: 'Точки росту: де помиляєшся найчастіше', es: 'Puntos de crecimiento concretos', 'pt-BR': 'Pontos de crescimento: onde você mais erra', vi: 'Điểm cần phát triển: nơi bạn sai nhiều nhất', id: 'Titik berkembang: bagian yang paling sering salah', tr: 'Gelişim noktaları: en çok nerede hata var', pl: 'Punkty wzrostu: gdzie mylisz się najczęściej' },
    { ru: 'Конкретные темы и фразы для отработки', uk: 'Конкретні теми та фрази для відпрацювання', es: 'Temas y frases específicos a entrenar', 'pt-BR': 'Temas e frases específicos para treinar', vi: 'Chủ đề và cụm từ cụ thể để luyện', id: 'Topik dan frasa spesifik untuk dilatih', tr: 'Çalışılacak somut konular ve ifadeler', pl: 'Konkretne tematy i frazy do przećwiczenia' },
    { ru: 'Тренируй именно слабое — без распыления', uk: 'Тренуй саме слабке — без розпорошення', es: 'Entrena lo importante, no todo a la vez', 'pt-BR': 'Treine o ponto fraco sem dispersar', vi: 'Luyện đúng điểm yếu, không bị phân tán', id: 'Latih bagian lemah tanpa menyebar fokus', tr: 'Dağılmadan zayıf noktayı çalış', pl: 'Trenuj dokładnie słabe miejsce, bez rozproszenia' },
  ],
  percentiles: [
    { ru: 'Увидишь свой ранг среди всех учеников', uk: 'Бач свій ранг серед усіх учнів', es: 'Mira tu rango entre estudiantes', 'pt-BR': 'Veja seu ranking entre todos os alunos', vi: 'Xem thứ hạng của bạn trong số học viên', id: 'Lihat peringkatmu di antara semua siswa', tr: 'Tüm öğrenciler arasındaki sıralamanı gör', pl: 'Zobacz swoją pozycję wśród wszystkich uczniów' },
    { ru: 'Только позитивные сравнения — мотивация', uk: 'Лише позитивні порівняння — мотивація', es: 'Solo comparaciones positivas: motivación', 'pt-BR': 'Só comparações positivas para motivar', vi: 'Chỉ so sánh tích cực để tạo động lực', id: 'Hanya perbandingan positif untuk motivasi', tr: 'Motivasyon için yalnızca pozitif karşılaştırmalar', pl: 'Tylko pozytywne porównania dla motywacji' },
    { ru: 'Вижу когда я в топе и где расти дальше', uk: 'Бачу коли я в топі та де рости далі', es: 'Sabes en qué destacas y dónde crecer', 'pt-BR': 'Você sabe onde se destaca e onde crescer', vi: 'Biết bạn mạnh ở đâu và nên phát triển gì', id: 'Tahu di mana kamu unggul dan perlu berkembang', tr: 'Nerede güçlü olduğunu ve nereye büyüyeceğini bilirsin', pl: 'Wiesz, gdzie jesteś mocny i gdzie rosnąć dalej' },
  ],
};

/** Подсветка правой колонки на пейволле (контраст на тёмном фоне карточки). */
const PAYWALL_COMPARISON_PREMIUM_COLOR = '#6EA8FF';

/** Сравнение free → Premium на пейволле (копии синхронизируй с реальными ограничениями в коде). */
type PaywallComparisonRow = {
  emoji: string;
  titleRu: string;
  titleUk: string;
  titleEs: string;
  titlePlanned: PremiumPlannedCopy;
  freeRu: string;
  freeUk: string;
  freeEs: string;
  freePlanned: PremiumPlannedCopy;
  premRu: string;
  premUk: string;
  premEs: string;
  premPlanned: PremiumPlannedCopy;
  /** Вторая строка премиум-текста (напр. аналитика). */
  premRu2?: string;
  premUk2?: string;
  premEs2?: string;
  premPlanned2?: PremiumPlannedCopy;
};

const PAYWALL_COMPARISON_ROWS: readonly PaywallComparisonRow[] = [
  {
    emoji: '📚',
    titleRu: 'Уроки',
    titleUk: 'Уроки',
    titleEs: 'Lecciones',
    titlePlanned: { 'pt-BR': 'Lições', vi: 'Bài học', id: 'Pelajaran', tr: 'Dersler', pl: 'Lekcje' },
    freeRu: 'Уроки 1–8',
    freeUk: 'Уроки 1–8',
    freeEs: 'Lecciones 1–8',
    freePlanned: { 'pt-BR': 'Lições 1–8', vi: 'Bài 1–8', id: 'Pelajaran 1–8', tr: '1–8. dersler', pl: 'Lekcje 1–8' },
    premRu: 'Все уроки',
    premUk: 'Всі уроки',
    premEs: 'All lessons',
    premPlanned: { 'pt-BR': 'Todas as lições', vi: 'Tất cả bài học', id: 'Semua pelajaran', tr: 'Tüm dersler', pl: 'Wszystkie lekcje' },
  },
  {
    emoji: '⚡',
    titleRu: 'Квизы',
    titleUk: 'Квізи',
    titleEs: 'Quizzes',
    titlePlanned: { 'pt-BR': 'Quizzes', vi: 'Quiz', id: 'Kuis', tr: 'Quizler', pl: 'Quizy' },
    freeRu: 'Только уровень Easy',
    freeUk: 'Лише рівень Easy',
    freeEs: 'Solo nivel Fácil',
    freePlanned: { 'pt-BR': 'Só nível Easy', vi: 'Chỉ mức Easy', id: 'Hanya level Easy', tr: 'Sadece Easy seviyesi', pl: 'Tylko poziom Easy' },
    premRu: 'Все уровни',
    premUk: 'Усі рівні',
    premEs: 'Todos los niveles',
    premPlanned: { 'pt-BR': 'Todos os níveis', vi: 'Tất cả mức', id: 'Semua level', tr: 'Tüm seviyeler', pl: 'Wszystkie poziomy' },
  },
  {
    emoji: '🃏',
    titleRu: 'Карточки',
    titleUk: 'Картки',
    titleEs: 'Tarjetas',
    titlePlanned: { 'pt-BR': 'Cartões', vi: 'Thẻ', id: 'Kartu', tr: 'Kartlar', pl: 'Fiszki' },
    freeRu: 'До 20 сохранённых',
    freeUk: 'До 20 збережених',
    freeEs: 'Hasta 20 guardadas',
    freePlanned: { 'pt-BR': 'Até 20 salvos', vi: 'Tối đa 20 thẻ đã lưu', id: 'Hingga 20 tersimpan', tr: '20 kayda kadar', pl: 'Do 20 zapisanych' },
    premRu: 'Без ограничений',
    premUk: 'Без обмежень',
    premEs: 'Sin límites',
    premPlanned: { 'pt-BR': 'Sem limites', vi: 'Không giới hạn', id: 'Tanpa batas', tr: 'Sınırsız', pl: 'Bez limitów' },
  },
  {
    emoji: '🔋',
    titleRu: 'Энергия',
    titleUk: 'Енергія',
    titleEs: 'Energía',
    titlePlanned: { 'pt-BR': 'Energia', vi: 'Năng lượng', id: 'Energi', tr: 'Enerji', pl: 'Energia' },
    freeRu: '+1 ⚡ ~10 мин',
    freeUk: '+1 ⚡ ~10 хв',
    freeEs: '+1 ⚡ ~10 min',
    freePlanned: { 'pt-BR': '+1 ⚡ ~10 min', vi: '+1 ⚡ ~10 phút', id: '+1 ⚡ ~10 menit', tr: '+1 ⚡ ~10 dk', pl: '+1 ⚡ ~10 min' },
    premRu: 'Не заканчивается',
    premUk: 'Не закінчується',
    premEs: 'No se agota',
    premPlanned: { 'pt-BR': 'Não acaba', vi: 'Không cạn', id: 'Tidak habis', tr: 'Bitmez', pl: 'Nie kończy się' },
  },
  {
    emoji: '⚔️',
    titleRu: 'Арена',
    titleUk: 'Арена',
    titleEs: 'Arena',
    titlePlanned: { 'pt-BR': 'Arena', vi: 'Arena', id: 'Arena', tr: 'Arena', pl: 'Arena' },
    freeRu: 'Лимит матчей в день и ⚡ за вход',
    freeUk: 'Ліміт матчів на день і ⚡ за вхід',
    freeEs: 'Tope diario y ⚡ por partida',
    freePlanned: { 'pt-BR': 'Limite diário e ⚡ por partida', vi: 'Giới hạn ngày và ⚡ mỗi trận', id: 'Batas harian dan ⚡ per pertandingan', tr: 'Günlük sınır ve maç başına ⚡', pl: 'Limit dzienny i ⚡ za mecz' },
    premRu: 'Безлимит',
    premUk: 'Безліміт',
    premEs: 'Ilimitada',
    premPlanned: { 'pt-BR': 'Ilimitada', vi: 'Không giới hạn', id: 'Tanpa batas', tr: 'Sınırsız', pl: 'Bez limitu' },
  },
  {
    emoji: '📊',
    titleRu: 'Аналитика',
    titleUk: 'Аналітика',
    titleEs: 'Analítica',
    titlePlanned: { 'pt-BR': 'Análises', vi: 'Phân tích', id: 'Analitik', tr: 'Analiz', pl: 'Analityka' },
    freeRu: 'Недоступна в бесплатном режиме',
    freeUk: 'Недоступна у безкоштовному режимі',
    freeEs: 'No disponible en modo gratis',
    freePlanned: { 'pt-BR': 'Indisponível no modo grátis', vi: 'Không có ở chế độ miễn phí', id: 'Tidak tersedia di mode gratis', tr: 'Ücretsiz modda yok', pl: 'Niedostępna w trybie darmowym' },
    premRu: 'Детальная персонализированная',
    premUk: 'Детальна персоналізована',
    premEs: 'Analítica personalizada',
    premPlanned: { 'pt-BR': 'Análise personalizada', vi: 'Phân tích cá nhân hóa', id: 'Analitik personal', tr: 'Kişiselleştirilmiş analiz', pl: 'Spersonalizowana analityka' },
    premRu2: 'аналитика',
    premUk2: 'аналітика',
    premEs2: 'detallada',
    premPlanned2: { 'pt-BR': 'detalhada', vi: 'chi tiết', id: 'terperinci', tr: 'detaylı', pl: 'szczegółowa' },
  },
  {
    emoji: '🔁',
    titleRu: 'Повторы уроков',
    titleUk: 'Повтори уроків',
    titleEs: 'Repetir lecciones',
    titlePlanned: { 'pt-BR': 'Repetir lições', vi: 'Ôn lại bài học', id: 'Ulang pelajaran', tr: 'Ders tekrarı', pl: 'Powtórki lekcji' },
    freeRu: 'За осколки при повторе',
    freeUk: 'За осколки за повтор',
    freeEs: 'Con fragmentos por repetición',
    freePlanned: { 'pt-BR': 'Com fragmentos por repetição', vi: 'Tốn mảnh khi ôn lại', id: 'Dengan fragmen per pengulangan', tr: 'Tekrarda parça harcanır', pl: 'Za odłamki przy powtórce' },
    premRu: 'Без ограничений',
    premUk: 'Без обмежень',
    premEs: 'Sin límites',
    premPlanned: { 'pt-BR': 'Sem limites', vi: 'Không giới hạn', id: 'Tanpa batas', tr: 'Sınırsız', pl: 'Bez limitów' },
  },
  {
    emoji: '🎨',
    titleRu: 'Темы интерфейса',
    titleUk: 'Теми інтерфейсу',
    titleEs: 'Temas de interfaz',
    titlePlanned: { 'pt-BR': 'Temas de interface', vi: 'Chủ đề giao diện', id: 'Tema antarmuka', tr: 'Arayüz temaları', pl: 'Motywy interfejsu' },
    freeRu: 'Только базовые темы',
    freeUk: 'Лише базові теми',
    freeEs: 'Solo temas básicos',
    freePlanned: { 'pt-BR': 'Só temas básicos', vi: 'Chỉ chủ đề cơ bản', id: 'Hanya tema dasar', tr: 'Sadece temel temalar', pl: 'Tylko podstawowe motywy' },
    premRu: 'Forest и Neon',
    premUk: 'Forest і Neon',
    premEs: 'Forest y Neon',
    premPlanned: { 'pt-BR': 'Forest e Neon', vi: 'Forest và Neon', id: 'Forest dan Neon', tr: 'Forest ve Neon', pl: 'Forest i Neon' },
  },
  {
    emoji: '🏆',
    titleRu: 'Лидерборды',
    titleUk: 'Лідерборди',
    titleEs: 'Clasificaciones',
    titlePlanned: { 'pt-BR': 'Classificações', vi: 'Bảng xếp hạng', id: 'Klasemen', tr: 'Sıralamalar', pl: 'Rankingi' },
    freeRu: 'Обычное имя в списках',
    freeUk: 'Звичайне ім\'я в списках',
    freeEs: 'Nombre estándar en listas',
    freePlanned: { 'pt-BR': 'Nome padrão nas listas', vi: 'Tên thường trong danh sách', id: 'Nama standar di daftar', tr: 'Listelerde standart ad', pl: 'Zwykła nazwa na listach' },
    premRu: 'Золотое имя в лидербордах',
    premUk: 'Золоте ім\'я в лідербордах',
    premEs: 'Nombre dorado en rankings',
    premPlanned: { 'pt-BR': 'Nome dourado nos rankings', vi: 'Tên vàng trên bảng xếp hạng', id: 'Nama emas di ranking', tr: 'Sıralamalarda altın ad', pl: 'Złota nazwa w rankingach' },
  },
];

/** Экран «Управление Premium» (из настроек): напоминание, что уже включено */
const MANAGE_VIEW_PREMIUM_BENEFITS: ({ ru: string; uk: string; es: string } & PremiumPlannedCopy)[] = [
  {
    ru: 'Безлимитная энергия для уроков, квизов, экзаменов и другого контента без ожидания.',
    uk: 'Безлімітна енергія для уроків, квізів, іспитів та іншого контенту без очікування.',
    es: 'Energía ilimitada para lecciones, quizzes, exámenes y otro contenido sin esperas.',
    'pt-BR': 'Energia ilimitada para lições, quizzes, exames e outros conteúdos sem espera.',
    vi: 'Năng lượng không giới hạn cho bài học, quiz, bài kiểm tra và nội dung khác mà không phải chờ.',
    id: 'Energi tanpa batas untuk pelajaran, kuis, ujian, dan konten lain tanpa menunggu.',
    tr: 'Dersler, quizler, sınavlar ve diğer içerikler için beklemeden sınırsız enerji.',
    pl: 'Nieograniczona energia do lekcji, quizów, egzaminów i innych treści bez czekania.',
  },
  {
    ru: 'Арена без дневного лимита матчей и без затрат энергии на рейтинговые игры.',
    uk: 'Арена без денного ліміту матчів і без витрат енергії на рейтингові ігри.',
    es: 'Arena sin límite diario de partidas y sin gastar energía en juegos clasificatorios.',
    'pt-BR': 'Arena sem limite diário de partidas e sem gastar energia em jogos ranqueados.',
    vi: 'Arena không có giới hạn trận hằng ngày và không tốn năng lượng cho trận xếp hạng.',
    id: 'Arena tanpa batas pertandingan harian dan tanpa memakai energi untuk game peringkat.',
    tr: 'Dereceli oyunlarda enerji harcamadan ve günlük maç sınırı olmadan Arena.',
    pl: 'Arena bez dziennego limitu meczów i bez zużywania energii na gry rankingowe.',
  },
  {
    ru: 'Уроки текущего уровня открыты полностью. Следующие уровни открываются после экзаменов.',
    uk: 'Уроки поточного рівня відкриті повністю. Наступні рівні відкриваються після іспитів.',
    es: 'Las lecciones del nivel actual están abiertas por completo. Los siguientes niveles se desbloquean después de los exámenes.',
    'pt-BR': 'As lições do nível atual ficam totalmente abertas. Os próximos níveis desbloqueiam depois dos exames.',
    vi: 'Các bài học của cấp hiện tại được mở toàn bộ. Cấp tiếp theo mở sau bài kiểm tra.',
    id: 'Pelajaran level saat ini terbuka sepenuhnya. Level berikutnya terbuka setelah ujian.',
    tr: 'Mevcut seviyedeki dersler tamamen açık. Sonraki seviyeler sınavlardan sonra açılır.',
    pl: 'Lekcje obecnego poziomu są w pełni otwarte. Kolejne poziomy odblokowują się po egzaminach.',
  },
  {
    ru: 'Квизы можно проходить регулярно без дневного лимита.',
    uk: 'Квізи можна проходити регулярно без денного ліміту.',
    es: 'Puedes hacer cuestionarios con regularidad, sin límite diario.',
    'pt-BR': 'Você pode fazer quizzes com regularidade, sem limite diário.',
    vi: 'Bạn có thể làm quiz đều đặn mà không bị giới hạn hằng ngày.',
    id: 'Kamu bisa mengerjakan kuis secara rutin tanpa batas harian.',
    tr: 'Quizleri günlük sınıra takılmadan düzenli çözebilirsin.',
    pl: 'Możesz regularnie robić quizy bez dziennego limitu.',
  },
  {
    ru: 'Неограниченное количество сохранённых карточек.',
    uk: 'Необмежена кількість збережених карток.',
    es: 'Cantidad ilimitada de tarjetas guardadas.',
    'pt-BR': 'Quantidade ilimitada de cartões salvos.',
    vi: 'Không giới hạn số thẻ đã lưu.',
    id: 'Jumlah kartu tersimpan tanpa batas.',
    tr: 'Sınırsız sayıda kaydedilmiş kart.',
    pl: 'Nieograniczona liczba zapisanych fiszek.',
  },
  {
    ru: 'Заморозка серии: первая защита доступна бесплатно перед использованием осколков.',
    uk: 'Заморозка серії: перший захист доступний безкоштовно перед використанням осколків.',
    es: 'Protección de racha: la primera está disponible gratis antes de usar fragmentos.',
    'pt-BR': 'Proteção de sequência: a primeira proteção fica grátis antes de usar fragmentos.',
    vi: 'Bảo vệ chuỗi: lần bảo vệ đầu tiên miễn phí trước khi dùng mảnh.',
    id: 'Perlindungan streak: perlindungan pertama tersedia gratis sebelum memakai fragmen.',
    tr: 'Seri koruması: parça kullanmadan önce ilk koruma ücretsizdir.',
    pl: 'Ochrona serii: pierwsza ochrona jest darmowa przed użyciem odłamków.',
  },
  {
    ru: 'Темы Premium: Forest и Neon. Gold открывается только как награда лиги.',
    uk: 'Premium-теми: Forest і Neon. Gold відкривається лише як нагорода ліги.',
    es: 'Temas Premium: Forest y Neon. Gold se desbloquea solo como recompensa de liga.',
    'pt-BR': 'Temas Premium: Forest e Neon. Gold desbloqueia apenas como recompensa de liga.',
    vi: 'Chủ đề Premium: Forest và Neon. Gold chỉ mở khóa như phần thưởng giải đấu.',
    id: 'Tema Premium: Forest dan Neon. Gold hanya terbuka sebagai hadiah liga.',
    tr: 'Premium temalar: Forest ve Neon. Gold yalnızca lig ödülü olarak açılır.',
    pl: 'Motywy Premium: Forest i Neon. Gold odblokowuje się tylko jako nagroda ligi.',
  },
  {
    ru: 'Профиль с премиальной подсветкой на главной странице и в лидербордах.',
    uk: 'Профіль із преміальною підсвіткою на головній сторінці та в лідербордах.',
    es: 'Perfil con resaltado premium en la pantalla principal y en las clasificaciones.',
    'pt-BR': 'Perfil com destaque premium na tela principal e nas classificações.',
    vi: 'Hồ sơ có hiệu ứng nổi bật Premium trên màn hình chính và bảng xếp hạng.',
    id: 'Profil dengan sorotan premium di layar utama dan klasemen.',
    tr: 'Ana ekranda ve sıralamalarda premium vurgulu profil.',
    pl: 'Profil z wyróżnieniem Premium na ekranie głównym i w rankingach.',
  },
];

CONTEXT_BENEFITS.quiz_limit = [
  { ru: 'Без дневного лимита на квизы', uk: 'Без денного ліміту на квізи', es: 'Sin límite diario de cuestionarios', 'pt-BR': 'Sem limite diário de quizzes', vi: 'Không giới hạn quiz mỗi ngày', id: 'Tanpa batas kuis harian', tr: 'Günlük quiz sınırı yok', pl: 'Bez dziennego limitu quizów' },
  { ru: 'Больше практики в удобном ритме', uk: 'Більше практики у зручному ритмі', es: 'Más práctica a tu ritmo', 'pt-BR': 'Mais prática no seu ritmo', vi: 'Luyện tập nhiều hơn theo nhịp của bạn', id: 'Lebih banyak latihan sesuai ritmemu', tr: 'Kendi ritminde daha fazla pratik', pl: 'Więcej praktyki we własnym rytmie' },
  { ru: 'Больше практики и XP каждый день', uk: 'Більше практики та XP щодня', es: 'Más práctica y XP cada día', 'pt-BR': 'Mais prática e XP todos os dias', vi: 'Thêm luyện tập và XP mỗi ngày', id: 'Lebih banyak latihan dan XP tiap hari', tr: 'Her gün daha fazla pratik ve XP', pl: 'Więcej praktyki i XP każdego dnia' },
];

CONTEXT_BENEFITS.personal_plan = [
  { ru: 'Персональный план с заданиями на каждый день', uk: 'Персональний план із завданнями на кожен день', es: 'Plan personal con tareas diarias', 'pt-BR': 'Plano pessoal com tarefas diárias', vi: 'Kế hoạch cá nhân với nhiệm vụ hằng ngày', id: 'Rencana personal dengan tugas harian', tr: 'Günlük görevli kişisel plan', pl: 'Plan osobisty z codziennymi zadaniami' },
  { ru: 'Уроки, фразы, повторение и отдельные квизы плана', uk: 'Уроки, фрази, повторення й окремі квізи плану', es: 'Lecciones, frases, repaso y quizzes del plan', 'pt-BR': 'Lições, frases, revisão e quizzes do plano', vi: 'Bài học, câu, ôn tập và quiz của kế hoạch', id: 'Pelajaran, frasa, pengulangan, dan kuis rencana', tr: 'Dersler, ifadeler, tekrar ve plan quizleri', pl: 'Lekcje, frazy, powtórki i quizy planu' },
  { ru: 'Все нужные материалы открываются без лишних пауз', uk: 'Усі потрібні матеріали відкриваються без зайвих пауз', es: 'Materiales necesarios sin pausas extra', 'pt-BR': 'Materiais necessários sem pausas extras', vi: 'Tài liệu cần thiết không bị dừng thêm', id: 'Materi yang dibutuhkan tanpa jeda ekstra', tr: 'Gerekli materyaller ekstra duraklama olmadan', pl: 'Potrzebne materiały bez dodatkowych przerw' },
];

const CONTEXT_BENEFITS_PLANNED: Partial<Record<PremiumContext, PremiumPlannedCopy[]>> & { generic: PremiumPlannedCopy[] } = {
  arena: [
    { 'pt-BR': 'O teto diário de partidas é removido', vi: 'Gỡ giới hạn trận hằng ngày', id: 'Batas pertandingan harian dihapus', tr: 'Günlük maç tavanı kalkar', pl: 'Dzienny limit meczów znika' },
    { 'pt-BR': 'Duelos sem “por hoje chega”', vi: 'Đấu mà không bị “hôm nay đủ rồi”', id: 'Duel tanpa rasa “cukup hari ini”', tr: '“Bugünlük yeter” hissi olmadan düello', pl: 'Pojedynki bez “na dziś wystarczy”' },
    { 'pt-BR': 'Mais ritmo e motivação nos treinos', vi: 'Nhịp và động lực luyện tập mạnh hơn', id: 'Ritme dan motivasi latihan lebih kuat', tr: 'Antrenmanda daha güçlü tempo ve motivasyon', pl: 'Silniejsze tempo i motywacja w treningu' },
  ],
  no_energy: [
    { 'pt-BR': 'Estudo livre sem temporizador', vi: 'Học tự do không cần chờ timer', id: 'Sesi bebas tanpa timer tunggu', tr: 'Bekleme sayacı olmadan serbest çalışma', pl: 'Swobodna nauka bez timera' },
    { 'pt-BR': 'Lição, quiz e exame final sem pausas forçadas', vi: 'Bài học, quiz và bài cuối không bị dừng ép buộc', id: 'Pelajaran, kuis, dan ujian akhir tanpa jeda paksa', tr: 'Ders, quiz ve final sınavı zorunlu ara olmadan', pl: 'Lekcja, quiz i egzamin bez wymuszonych przerw' },
    { 'pt-BR': 'Ritmo diário estável sem travar', vi: 'Nhịp học hằng ngày ổn định hơn', id: 'Ritme harian stabil tanpa terhenti', tr: 'Aksamadan istikrarlı günlük ritim', pl: 'Stabilny rytm dnia bez zrywów' },
  ],
  course_after_lesson3: [
    { 'pt-BR': 'O nível atual abre completo na hora', vi: 'Cấp hiện tại mở toàn bộ ngay', id: 'Level saat ini langsung terbuka penuh', tr: 'Mevcut seviye hemen tamamen açılır', pl: 'Obecny poziom od razu otwiera się w całości' },
    { 'pt-BR': 'Sem barreiras — continue estudando no seu ritmo', vi: 'Không rào cản — cứ học tiếp theo nhịp của bạn', id: 'Tanpa hambatan — lanjut belajar dengan nyaman', tr: 'Engel yok — keyifle devam et', pl: 'Bez barier — ucz się dalej swoim tempem' },
    { 'pt-BR': 'Os próximos níveis abrem com exames', vi: 'Cấp tiếp theo mở qua bài kiểm tra', id: 'Level berikutnya terbuka lewat ujian', tr: 'Sonraki seviyeler sınavlarla açılır', pl: 'Kolejne poziomy otwierają się przez egzaminy' },
  ],
  lesson_b1: [
    { 'pt-BR': 'O nível atual abre completo na hora', vi: 'Cấp hiện tại mở toàn bộ ngay', id: 'Level saat ini langsung terbuka penuh', tr: 'Mevcut seviye hemen tamamen açılır', pl: 'Obecny poziom od razu otwiera się w całości' },
    { 'pt-BR': 'Sem barreiras — continue estudando no seu ritmo', vi: 'Không rào cản — cứ học tiếp theo nhịp của bạn', id: 'Tanpa hambatan — lanjut belajar dengan nyaman', tr: 'Engel yok — keyifle devam et', pl: 'Bez barier — ucz się dalej swoim tempem' },
    { 'pt-BR': 'Os próximos níveis abrem com exames', vi: 'Cấp tiếp theo mở qua bài kiểm tra', id: 'Level berikutnya terbuka lewat ujian', tr: 'Sonraki seviyeler sınavlarla açılır', pl: 'Kolejne poziomy otwierają się przez egzaminy' },
  ],
  quiz_limit: [
    { 'pt-BR': 'Sem limite diário de quizzes', vi: 'Không giới hạn quiz mỗi ngày', id: 'Tanpa batas kuis harian', tr: 'Günlük quiz sınırı yok', pl: 'Bez dziennego limitu quizów' },
    { 'pt-BR': 'Mais prática no seu ritmo', vi: 'Luyện tập nhiều hơn theo nhịp của bạn', id: 'Lebih banyak latihan sesuai ritmemu', tr: 'Kendi ritminde daha fazla pratik', pl: 'Więcej praktyki we własnym rytmie' },
    { 'pt-BR': 'Mais prática e XP todos os dias', vi: 'Thêm luyện tập và XP mỗi ngày', id: 'Lebih banyak latihan dan XP tiap hari', tr: 'Her gün daha fazla pratik ve XP', pl: 'Więcej praktyki i XP każdego dnia' },
  ],
  quiz_level: [
    { 'pt-BR': 'Sem limite diário de quizzes', vi: 'Không giới hạn quiz mỗi ngày', id: 'Tanpa batas kuis harian', tr: 'Günlük quiz sınırı yok', pl: 'Bez dziennego limitu quizów' },
    { 'pt-BR': 'Mais prática no seu ritmo', vi: 'Luyện tập nhiều hơn theo nhịp của bạn', id: 'Lebih banyak latihan sesuai ritmemu', tr: 'Kendi ritminde daha fazla pratik', pl: 'Więcej praktyki we własnym rytmie' },
    { 'pt-BR': 'Mais prática e XP todos os dias', vi: 'Thêm luyện tập và XP mỗi ngày', id: 'Lebih banyak latihan dan XP tiap hari', tr: 'Her gün daha fazla pratik ve XP', pl: 'Więcej praktyki i XP każdego dnia' },
  ],
  quiz_medium: [
    { 'pt-BR': 'Sem limite diário de quizzes', vi: 'Không giới hạn quiz mỗi ngày', id: 'Tanpa batas kuis harian', tr: 'Günlük quiz sınırı yok', pl: 'Bez dziennego limitu quizów' },
    { 'pt-BR': 'Mais prática no seu ritmo', vi: 'Luyện tập nhiều hơn theo nhịp của bạn', id: 'Lebih banyak latihan sesuai ritmemu', tr: 'Kendi ritminde daha fazla pratik', pl: 'Więcej praktyki we własnym rytmie' },
    { 'pt-BR': 'Mais prática e XP todos os dias', vi: 'Thêm luyện tập và XP mỗi ngày', id: 'Lebih banyak latihan dan XP tiap hari', tr: 'Her gün daha fazla pratik ve XP', pl: 'Więcej praktyki i XP każdego dnia' },
  ],
  quiz_hard: [
    { 'pt-BR': 'Sem limite diário de quizzes', vi: 'Không giới hạn quiz mỗi ngày', id: 'Tanpa batas kuis harian', tr: 'Günlük quiz sınırı yok', pl: 'Bez dziennego limitu quizów' },
    { 'pt-BR': 'Mais prática no seu ritmo', vi: 'Luyện tập nhiều hơn theo nhịp của bạn', id: 'Lebih banyak latihan sesuai ritmemu', tr: 'Kendi ritminde daha fazla pratik', pl: 'Więcej praktyki we własnym rytmie' },
    { 'pt-BR': 'Mais prática e XP todos os dias', vi: 'Thêm luyện tập và XP mỗi ngày', id: 'Lebih banyak latihan dan XP tiap hari', tr: 'Her gün daha fazla pratik ve XP', pl: 'Więcej praktyki i XP każdego dnia' },
  ],
  flashcard_limit: [
    { 'pt-BR': 'Sem limite para sua base de cartões', vi: 'Không giới hạn kho thẻ cá nhân', id: 'Tanpa batas untuk koleksi kartu pribadi', tr: 'Kişisel kart arşivinde sınır yok', pl: 'Bez limitu własnej bazy fiszek' },
    { 'pt-BR': 'Guarde todas as frases importantes', vi: 'Lưu mọi cụm từ quan trọng', id: 'Simpan semua frasa penting', tr: 'Tüm önemli ifadeleri sakla', pl: 'Przechowuj wszystkie ważne frazy' },
    { 'pt-BR': 'Memória de longo prazo mais sólida', vi: 'Ghi nhớ dài hạn chắc hơn', id: 'Ingatan jangka panjang lebih kuat', tr: 'Daha sağlam uzun vadeli hafıza', pl: 'Lepsze zapamiętywanie długoterminowe' },
  ],
  streak: [
    { 'pt-BR': 'Proteção de sequência mesmo se faltar um dia', vi: 'Bảo vệ chuỗi kể cả khi bỏ lỡ một ngày', id: 'Perlindungan streak meski terlewat sehari', tr: 'Bir gün kaçsa bile seri koruması', pl: 'Ochrona serii nawet przy pominięciu dnia' },
    { 'pt-BR': 'Sem pausas por falta de energia', vi: 'Không bị nghỉ vì hết năng lượng', id: 'Tanpa jeda karena energi', tr: 'Enerji yüzünden ara yok', pl: 'Bez przerw przez energię' },
    { 'pt-BR': 'Progresso diário estável', vi: 'Tiến bộ hằng ngày ổn định', id: 'Progres harian stabil', tr: 'İstikrarlı günlük ilerleme', pl: 'Stabilny codzienny postęp' },
  ],
  theme: [
    { 'pt-BR': 'Estilo visual do seu jeito', vi: 'Phong cách giao diện theo bạn', id: 'Gaya visual sesuai seleramu', tr: 'Kişisel uygulama stili', pl: 'Osobisty styl aplikacji' },
    { 'pt-BR': 'Mais envolvimento no estudo', vi: 'Gắn bó hơn với việc học', id: 'Lebih terlibat saat belajar', tr: 'Öğrenmeye daha fazla bağlılık', pl: 'Większe zaangażowanie w naukę' },
    { 'pt-BR': 'Mais conforto para estudar sempre', vi: 'Thoải mái hơn để học đều', id: 'Lebih nyaman untuk belajar rutin', tr: 'Düzenli çalışmak daha rahat', pl: 'Wygodniej uczyć się regularnie' },
  ],
  club: [
    { 'pt-BR': 'Clubes e boosts de XP para acelerar', vi: 'Câu lạc bộ và boost XP để tăng tốc', id: 'Klub dan boost XP untuk mempercepat', tr: 'Hızlanmak için kulüpler ve XP boostları', pl: 'Kluby i boosty XP do przyspieszenia' },
    { 'pt-BR': 'Mais valor em cada sessão', vi: 'Mỗi phiên học có ích hơn', id: 'Manfaat lebih besar di tiap sesi', tr: 'Her seanstan daha fazla fayda', pl: 'Więcej wartości z każdej sesji' },
    { 'pt-BR': 'Mais motivação para voltar amanhã', vi: 'Thêm động lực quay lại ngày mai', id: 'Lebih termotivasi untuk kembali besok', tr: 'Yarın dönmek için daha güçlü motivasyon', pl: 'Silniejsza motywacja, żeby wrócić jutro' },
  ],
  generic: [
    { 'pt-BR': 'Mais prática sem limites', vi: 'Nhiều luyện tập hơn, không giới hạn', id: 'Lebih banyak latihan tanpa batas', tr: 'Sınırsız daha fazla pratik', pl: 'Więcej praktyki bez ograniczeń' },
    { 'pt-BR': 'Ritmo e resultado estáveis', vi: 'Nhịp và kết quả ổn định', id: 'Ritme dan hasil stabil', tr: 'İstikrarlı tempo ve sonuç', pl: 'Stabilne tempo i wynik' },
    { 'pt-BR': 'Funções Premium logo após ativar', vi: 'Tính năng Premium có ngay sau khi kích hoạt', id: 'Fitur Premium langsung setelah aktif', tr: 'Aktivasyondan hemen sonra Premium özellikler', pl: 'Opcje Premium od razu po aktywacji' },
  ],
  trainer: [
    { 'pt-BR': 'Pontos fracos: frases com mais erros', vi: 'Điểm yếu: cụm từ bạn sai nhiều nhất', id: 'Titik lemah: frasa dengan kesalahan terbanyak', tr: 'Zayıf noktalar: en çok hata yapılan ifadeler', pl: 'Słabe punkty: frazy z największą liczbą błędów' },
    { 'pt-BR': 'Smart Mix: o algoritmo monta o conjunto ideal', vi: 'Smart Mix: thuật toán tạo bộ luyện phù hợp', id: 'Smart Mix: algoritme menyusun set ideal', tr: 'Smart Mix: algoritma ideal seti kurar', pl: 'Smart Mix: algorytm buduje idealny zestaw' },
    { 'pt-BR': 'Sem limite diário de sessões', vi: 'Không giới hạn phiên mỗi ngày', id: 'Tanpa batas sesi harian', tr: 'Günlük seans sınırı yok', pl: 'Bez dziennego limitu sesji' },
    { 'pt-BR': 'Por tema: revisão de uma lição específica', vi: 'Theo chủ đề: ôn một bài cụ thể', id: 'Per topik: ulang pelajaran tertentu', tr: 'Konuya göre: belirli ders tekrarı', pl: 'Według tematu: powtórka konkretnej lekcji' },
  ],
  trainer_limit: [
    { 'pt-BR': 'Sessões ilimitadas do Treinador', vi: 'Phiên Huấn luyện viên không giới hạn', id: 'Sesi Trainer tanpa batas', tr: 'Sınırsız Antrenör seansı', pl: 'Sesje Trenera bez limitu' },
    { 'pt-BR': 'Todos os 6 modos sem restrições', vi: 'Cả 6 chế độ không giới hạn', id: 'Semua 6 mode tanpa batasan', tr: '6 modun tamamı sınırsız', pl: 'Wszystkie 6 trybów bez ograniczeń' },
    { 'pt-BR': 'Revisão inteligente quando quiser', vi: 'Ôn thông minh bất cứ lúc nào', id: 'Pengulangan pintar kapan saja', tr: 'İstediğin zaman akıllı tekrar', pl: 'Inteligentna powtórka, kiedy chcesz' },
  ],
  diagnosis_training: [
    { 'pt-BR': 'Novos erros viram análises pessoais precisas', vi: 'Lỗi mới biến thành phân tích cá nhân chính xác', id: 'Kesalahan baru jadi analisis personal yang tepat', tr: 'Yeni hatalar net kişisel analizlere dönüşür', pl: 'Nowe błędy zmieniają się w dokładne analizy osobiste' },
    { 'pt-BR': 'Explicação clara: onde a frase falhou e como corrigir', vi: 'Giải thích rõ: câu sai ở đâu và nói đúng thế nào', id: 'Penjelasan jelas: bagian frasa yang salah dan cara benarnya', tr: 'Net açıklama: ifade nerede bozuldu ve doğrusu ne', pl: 'Jasne wyjaśnienie: gdzie fraza się sypie i jak powiedzieć poprawnie' },
    { 'pt-BR': 'Prática com frases parecidas sem limite', vi: 'Luyện câu tương tự không giới hạn', id: 'Latihan frasa mirip tanpa batas', tr: 'Benzer ifadelerle sınırsız pratik', pl: 'Ćwiczenia na podobnych frazach bez limitu' },
  ],
  mastery: [
    { 'pt-BR': 'Repetições ilimitadas de qualquer lição', vi: 'Ôn lại bất kỳ bài nào không giới hạn', id: 'Pengulangan pelajaran apa pun tanpa batas', tr: 'Her ders için sınırsız tekrar', pl: 'Powtórki dowolnej lekcji bez limitu' },
    { 'pt-BR': 'Você não gasta fragmentos ao repetir lições', vi: 'Không tốn mảnh khi học lại bài', id: 'Tidak memakai fragmen saat mengulang pelajaran', tr: 'Ders tekrarında parça harcamazsın', pl: 'Nie wydajesz odłamków na powtórki lekcji' },
    { 'pt-BR': 'Treine até o resultado ideal sem pressão', vi: 'Luyện đến kết quả tốt nhất không áp lực', id: 'Latih sampai hasil ideal tanpa tekanan', tr: 'Baskı olmadan ideal sonuca kadar çalış', pl: 'Trenuj do idealnego wyniku bez presji' },
  ],
  stats: [
    { 'pt-BR': 'Mapa de atividade: todos os 365 dias', vi: 'Bản đồ hoạt động: đủ 365 ngày', id: 'Peta aktivitas: semua 365 hari', tr: 'Etkinlik haritası: 365 günün tamamı', pl: 'Mapa aktywności: wszystkie 365 dni' },
    { 'pt-BR': 'Padrões de erro e temas fracos', vi: 'Mẫu lỗi và chủ đề yếu', id: 'Pola kesalahan dan topik lemah', tr: 'Hata kalıpları ve zayıf konular', pl: 'Wzorce błędów i słabe tematy' },
    { 'pt-BR': 'Comparação com outros: onde você se destaca', vi: 'So sánh với người khác: điểm bạn nổi bật', id: 'Perbandingan dengan siswa lain: keunggulanmu', tr: 'Diğerleriyle karşılaştırma: öne çıktığın yer', pl: 'Porównanie z innymi: gdzie jesteś wysoko' },
  ],
  heatmap: [
    { 'pt-BR': '365 dias de atividade — veja sua constância', vi: '365 ngày hoạt động — thấy sự đều đặn của bạn', id: '365 hari aktivitas — lihat konsistensimu', tr: '365 gün etkinlik — istikrarını gör', pl: '365 dni aktywności — zobacz swoją regularność' },
    { 'pt-BR': 'Melhores e piores períodos em uma tela', vi: 'Giai đoạn tốt và yếu trên một màn hình', id: 'Periode terbaik dan terburuk dalam satu layar', tr: 'En iyi ve en kötü dönemler tek ekranda', pl: 'Najlepsze i słabsze okresy na jednym ekranie' },
    { 'pt-BR': 'Você entende seu ritmo real de estudo', vi: 'Hiểu nhịp học thật của bạn', id: 'Kamu memahami ritme belajar yang sebenarnya', tr: 'Gerçek öğrenme ritmini anlarsın', pl: 'Rozumiesz swój prawdziwy rytm nauki' },
  ],
  patterns: [
    { 'pt-BR': 'Pontos de crescimento: onde você mais erra', vi: 'Điểm cần phát triển: nơi bạn sai nhiều nhất', id: 'Titik berkembang: bagian yang paling sering salah', tr: 'Gelişim noktaları: en çok nerede hata var', pl: 'Punkty wzrostu: gdzie mylisz się najczęściej' },
    { 'pt-BR': 'Temas e frases específicos para treinar', vi: 'Chủ đề và cụm từ cụ thể để luyện', id: 'Topik dan frasa spesifik untuk dilatih', tr: 'Çalışılacak somut konular ve ifadeler', pl: 'Konkretne tematy i frazy do przećwiczenia' },
    { 'pt-BR': 'Treine o ponto fraco sem dispersar', vi: 'Luyện đúng điểm yếu, không bị phân tán', id: 'Latih bagian lemah tanpa menyebar fokus', tr: 'Dağılmadan zayıf noktayı çalış', pl: 'Trenuj dokładnie słabe miejsce, bez rozproszenia' },
  ],
  percentiles: [
    { 'pt-BR': 'Veja seu ranking entre todos os alunos', vi: 'Xem thứ hạng của bạn trong số học viên', id: 'Lihat peringkatmu di antara semua siswa', tr: 'Tüm öğrenciler arasındaki sıralamanı gör', pl: 'Zobacz swoją pozycję wśród wszystkich uczniów' },
    { 'pt-BR': 'Só comparações positivas para motivar', vi: 'Chỉ so sánh tích cực để tạo động lực', id: 'Hanya perbandingan positif untuk motivasi', tr: 'Motivasyon için yalnızca pozitif karşılaştırmalar', pl: 'Tylko pozytywne porównania dla motywacji' },
    { 'pt-BR': 'Você sabe onde se destaca e onde crescer', vi: 'Biết bạn mạnh ở đâu và nên phát triển gì', id: 'Tahu di mana kamu unggul dan perlu berkembang', tr: 'Nerede güçlü olduğunu ve nereye büyüyeceğini bilirsin', pl: 'Wiesz, gdzie jesteś mocny i gdzie rosnąć dalej' },
  ],
};

CONTEXT_BENEFITS_PLANNED.personal_plan = [
  { 'pt-BR': 'Plano pessoal com tarefas diárias', vi: 'Kế hoạch cá nhân với nhiệm vụ hằng ngày', id: 'Rencana personal dengan tugas harian', tr: 'Günlük görevli kişisel plan', pl: 'Plan osobisty z codziennymi zadaniami' },
  { 'pt-BR': 'Lições, frases, revisão e quizzes do plano', vi: 'Bài học, câu, ôn tập và quiz của kế hoạch', id: 'Pelajaran, frasa, pengulangan, dan kuis rencana', tr: 'Dersler, ifadeler, tekrar ve plan quizleri', pl: 'Lekcje, frazy, powtórki i quizy planu' },
  { 'pt-BR': 'Materiais necessários sem pausas extras', vi: 'Tài liệu cần thiết không bị dừng thêm', id: 'Materi yang dibutuhkan tanpa jeda ekstra', tr: 'Gerekli materyaller ekstra duraklama olmadan', pl: 'Potrzebne materiały bez dodatkowych przerw' },
];

function getContextBenefitPlanned(ctx: PremiumContext, index: number): PremiumPlannedCopy {
  const rows = CONTEXT_BENEFITS_PLANNED[ctx] ?? CONTEXT_BENEFITS_PLANNED.generic;
  return rows[index] ?? CONTEXT_BENEFITS_PLANNED.generic[Math.min(index, CONTEXT_BENEFITS_PLANNED.generic.length - 1)];
}

/** Одна bento-ячейка зеркала прогресса: крупное число + подпись (Стиль 2 Игра по Библии). */
function ProgressMirrorStat({ value, label, t, f, accent }: {
  value: number;
  label: string;
  t: { textPrimary: string; textSecond: string };
  f: { sub: number; caption: number };
  accent: string;
}) {
  return (
    <View style={{ minWidth: 64, alignItems: 'flex-start' }}>
      <Text style={{ color: accent, fontSize: f.sub * 1.4, fontWeight: '800' }}>
        {value.toLocaleString('ru-RU')}
      </Text>
      <Text style={{ color: t.textSecond, fontSize: f.caption, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function getPersonalValueLine(ctx: PremiumContext, streakDays: number, lessonsDone: number, savedCards: number, lang: Lang): string {
  if (ctx === 'intro_ended') {
    // Библия: gain-framing. Если есть личные данные — называем накопленное;
    // если данных нет (частый случай — вызов без params) — корректный gain-фоллбэк,
    // а НЕ проваливаемся в чужую generic-ветку.
    const parts: string[] = [];
    const partsByLang = {
      ru: { streak: `серия ${streakDays} дн.`, lessons: `${lessonsDone} сессий`, cards: `${savedCards} фраз` },
      uk: { streak: `серія ${streakDays} дн.`, lessons: `${lessonsDone} сесій`, cards: `${savedCards} фраз` },
      es: { streak: `racha de ${streakDays} días`, lessons: `${lessonsDone} sesiones`, cards: `${savedCards} frases` },
      'pt-BR': { streak: `sequência de ${streakDays} dias`, lessons: `${lessonsDone} sessões`, cards: `${savedCards} frases` },
      vi: { streak: `chuỗi ${streakDays} ngày`, lessons: `${lessonsDone} phiên`, cards: `${savedCards} cụm từ` },
      id: { streak: `streak ${streakDays} hari`, lessons: `${lessonsDone} sesi`, cards: `${savedCards} frasa` },
      tr: { streak: `${streakDays} günlük seri`, lessons: `${lessonsDone} oturum`, cards: `${savedCards} ifade` },
      pl: { streak: `seria ${streakDays} dni`, lessons: `${lessonsDone} sesji`, cards: `${savedCards} fraz` },
    } as const;
    const key = (partsByLang as Record<string, { streak: string; lessons: string; cards: string }>)[lang]
      ? lang
      : 'ru';
    const L = (partsByLang as Record<string, { streak: string; lessons: string; cards: string }>)[key];
    if (streakDays > 0) parts.push(L.streak);
    if (lessonsDone > 0) parts.push(L.lessons);
    if (savedCards > 0) parts.push(L.cards);
    const earned = parts.join(' · ');
    if (earned) {
      // gain-framing: называем накопленное и продолжаем темп
      return triLang(lang, {
        ru: `Уже твоё: ${earned}. Premium держит этот темп.`,
        uk: `Уже твоє: ${earned}. Premium тримає цей темп.`,
        es: `Ya es tuyo: ${earned}. Premium mantiene ese ritmo.`,
        'pt-BR': `Já é seu: ${earned}. O Premium mantém esse ritmo.`,
        vi: `Đã là của bạn: ${earned}. Premium giữ nhịp này.`,
        id: `Sudah jadi milikmu: ${earned}. Premium menjaga ritme ini.`,
        tr: `Artık senin: ${earned}. Premium bu ritmi korur.`,
        pl: `Już twoje: ${earned}. Premium utrzymuje to tempo.`,
      });
    }
    // нет личных данных → корректный gain-фоллбэк (не проваливаемся в generic)
    return triLang(lang, {
      ru: 'Полный доступ открыт навсегда. Занимайся в своём темпе.',
      uk: 'Повний доступ відкритий назавжди. Навчайся у своєму темпі.',
      es: 'Acceso completo para siempre. Aprende a tu ritmo.',
      'pt-BR': 'Acesso completo para sempre. Aprenda no seu ritmo.',
      vi: 'Truy cập đầy đủ mãi mãi. Học theo nhịp của bạn.',
      id: 'Akses penuh selamanya. Belajar sesuai ritmemu.',
      tr: 'Tam erişim kalıcı. Kendi ritminde öğren.',
      pl: 'Pełny dostęp na zawsze. Ucz się we własnym tempie.',
    });
  }
  if (ctx === 'streak' && streakDays > 0) {
    return triLang(lang, {
      ru: `Сейчас у тебя серия ${streakDays} дн. Premium даёт заморозку и спокойнее ритм без пауз.`,
      uk: `Зараз у тебе серія ${streakDays} дн. Premium дає заморозку і спокійніший ритм без пауз.`,
      es: `Llevas ${streakDays} ${streakDays === 1 ? 'día' : 'días'} de racha. Premium añade protección y más constancia.`,
      'pt-BR': `Você está em uma sequência de ${streakDays} ${streakDays === 1 ? 'dia' : 'dias'}. Premium adiciona proteção e mais constância.`,
      vi: `Bạn đang có chuỗi ${streakDays} ngày. Premium thêm bảo vệ chuỗi và nhịp học ổn định hơn.`,
      id: `Streak kamu sudah ${streakDays} hari. Premium memberi perlindungan dan ritme yang lebih tenang.`,
      tr: `${streakDays} günlük bir serin var. Premium koruma ve daha sakin bir çalışma ritmi sağlar.`,
      pl: `Masz serię ${streakDays} dni. Premium daje ochronę serii i spokojniejszy rytm.`,
    });
  }
  if (ctx === 'course_after_lesson3') {
    return triLang(lang, {
      ru: `Уроков пройдено: ${lessonsDone}. Premium откроет текущий уровень целиком, а следующий — после экзамена.`,
      uk: `Уроків пройдено: ${lessonsDone}. Premium відкриє поточний рівень повністю, а наступний — після екзамену.`,
      es: `Lecciones completadas: ${lessonsDone}. Premium abre tu nivel actual completo; el siguiente se abre con examen.`,
      'pt-BR': `Lições concluídas: ${lessonsDone}. Premium abre todo o nível atual; o próximo abre com exame.`,
      vi: `Bài học đã hoàn thành: ${lessonsDone}. Premium mở toàn bộ cấp hiện tại; cấp tiếp theo mở bằng bài kiểm tra.`,
      id: `Pelajaran selesai: ${lessonsDone}. Premium membuka seluruh level saat ini; level berikutnya dibuka lewat ujian.`,
      tr: `Tamamlanan ders: ${lessonsDone}. Premium mevcut seviyenin tamamını açar; sonraki seviye sınavla açılır.`,
      pl: `Ukończone lekcje: ${lessonsDone}. Premium odblokuje cały obecny poziom; następny otworzy się po egzaminie.`,
    });
  }
  if (ctx === 'lesson_b1') {
    return triLang(lang, {
      ru: `Уроков пройдено: ${lessonsDone}. Premium снимает замки с уроков текущего уровня.`,
      uk: `Уроків пройдено: ${lessonsDone}. Premium знімає замки з уроків поточного рівня.`,
      es: `Lecciones completadas: ${lessonsDone}. Premium quita los candados del nivel actual.`,
      'pt-BR': `Lições concluídas: ${lessonsDone}. Premium remove os bloqueios do nível atual.`,
      vi: `Bài học đã hoàn thành: ${lessonsDone}. Premium mở khóa các bài của cấp hiện tại.`,
      id: `Pelajaran selesai: ${lessonsDone}. Premium membuka kunci pelajaran di level saat ini.`,
      tr: `Tamamlanan ders: ${lessonsDone}. Premium mevcut seviyedeki derslerin kilidini kaldırır.`,
      pl: `Ukończone lekcje: ${lessonsDone}. Premium zdejmuje blokady z lekcji obecnego poziomu.`,
    });
  }
  if (ctx === 'flashcard_limit' && savedCards > 0) {
    return triLang(lang, {
      ru: `У тебя уже ${savedCards} карточек. Premium снимает лимит полностью.`,
      uk: `У тебе вже ${savedCards} карток. Premium знімає ліміт повністю.`,
      es: `Ya tienes ${savedCards} tarjetas. Premium quita el límite por completo.`,
      'pt-BR': `Você já tem ${savedCards} cartões. Premium remove o limite por completo.`,
      vi: `Bạn đã có ${savedCards} thẻ. Premium gỡ hoàn toàn giới hạn.`,
      id: `Kamu sudah punya ${savedCards} kartu. Premium menghapus batas sepenuhnya.`,
      tr: `Zaten ${savedCards} kartın var. Premium sınırı tamamen kaldırır.`,
      pl: `Masz już ${savedCards} fiszek. Premium całkowicie usuwa limit.`,
    });
  }
  if (ctx === 'quiz_limit') {
    return triLang(lang, {
      ru: 'Ты уже прошёл несколько квизов — значит, формат работает. Premium убирает дневной лимит.',
      uk: 'Ти вже пройшов кілька квізів — формат працює. Premium прибирає денний ліміт.',
      es: 'Ya completaste varios cuestionarios — el formato funciona. Premium quita el límite diario.',
      'pt-BR': 'Você já completou vários quizzes — o formato funciona. Premium remove o limite diário.',
      vi: 'Bạn đã hoàn thành một vài bài kiểm tra — định dạng này hoạt động. Premium gỡ giới hạn hằng ngày.',
      id: 'Kamu sudah menyelesaikan beberapa kuis — formatnya cocok. Premium hapus batas harian.',
      tr: 'Birkaç quiz tamamladın — format işe yarıyor. Premium günlük limiti kaldırır.',
      pl: 'Ukończyłeś już kilka quizów — format działa. Premium usuwa dzienny limit.',
    });
  }
  if (ctx === 'trainer_limit') {
    // Библия: gain-framing, без хардкода числа сессий (теперь A/B-переменное).
    return triLang(lang, {
      ru: 'Ты уже втянулся в ритм. Premium открывает безлимит сессий Тренера во всех режимах.',
      uk: 'Ти вже втягнувся в ритм. Premium відкриває безліміт сесій Тренера в усіх режимах.',
      es: 'Ya entraste en ritmo. Premium abre sesiones del Entrenador sin límite en todos los modos.',
      'pt-BR': 'Você já entrou no ritmo. Premium abre sessões do Treinador sem limite em todos os modos.',
      vi: 'Bạn đã vào nhịp rồi. Premium mở không giới hạn phiên Luyện tập trong mọi chế độ.',
      id: 'Kamu sudah masuk ritme. Premium membuka sesi Pelatih tanpa batas di semua mode.',
      tr: 'Ritmi yakaladın. Premium tüm modlarda sınırsız Antrenör oturumu açar.',
      pl: 'Złapałeś rytm. Premium otwiera nieograniczone sesje Trenera we wszystkich trybach.',
    });
  }
  if (ctx === 'diagnosis_training') {
    return triLang(lang, {
      ru: 'Диагностика нашла твои слабые места. Premium даёт неограниченный доступ к тренировкам по каждому из них.',
      uk: 'Діагностика знайшла твої слабкі місця. Premium дає необмежений доступ до тренувань по кожному з них.',
      es: 'El diagnóstico encontró tus puntos débiles. Premium te da acceso ilimitado para entrenar cada uno.',
      'pt-BR': 'O diagnóstico encontrou seus pontos fracos. Premium dá acesso ilimitado para treinar cada um deles.',
      vi: 'Chẩn đoán đã tìm ra điểm yếu của bạn. Premium cho phép luyện tập không giới hạn cho từng điểm đó.',
      id: 'Diagnosis menemukan titik lemahmu. Premium memberi akses tak terbatas untuk latihan setiap titik lemah itu.',
      tr: 'Tanılama zayıf noktalarını buldu. Premium her biri için sınırsız antrenman erişimi sağlar.',
      pl: 'Diagnoza znalazła twoje słabe punkty. Premium daje nieograniczony dostęp do treningu każdego z nich.',
    });
  }
  if (ctx === 'mastery') {
    return triLang(lang, {
      ru: 'Повторное прохождение урока — это настоящее закрепление. Premium делает это без ограничений.',
      uk: 'Повторне проходження уроку — справжнє закріплення. Premium робить це без обмежень.',
      es: 'Repasar la lección es consolidación real. Premium lo hace sin límites.',
      'pt-BR': 'Revisar a lição é consolidação real. Premium faz isso sem limites.',
      vi: 'Ôn lại bài học là củng cố thực sự. Premium cho phép bạn làm điều đó không giới hạn.',
      id: 'Mengulang pelajaran adalah penguatan nyata. Premium melakukannya tanpa batas.',
      tr: 'Dersi tekrar yapmak gerçek pekiştirme. Premium bunu sınırsız yapar.',
      pl: 'Powtarzanie lekcji to prawdziwe utrwalanie. Premium robi to bez ograniczeń.',
    });
  }
  return triLang(lang, {
    ru: 'После активации Premium ты сразу получишь больше пользы из каждой сессии.',
    uk: 'Після активації Premium ти відразу отримаєш більше користі з кожної сесії.',
    es: 'Tras activar Premium sacarás más partido a cada sesión al momento.',
    'pt-BR': 'Depois de ativar o Premium, você tira mais proveito de cada sessão imediatamente.',
    vi: 'Sau khi kích hoạt Premium, bạn sẽ nhận được nhiều giá trị hơn từ mỗi phiên học.',
    id: 'Setelah mengaktifkan Premium, setiap sesi langsung jadi lebih bermanfaat.',
    tr: 'Premium etkinleşince her oturumdan hemen daha fazla verim alırsın.',
    pl: 'Po aktywacji Premium od razu wyciągniesz więcej z każdej sesji.',
  });
}

// ── Строки сравнения ──────────────────────────────────────────────────────────

const PREMIUM_DATE_LOCALE: Record<Lang, string> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
  es: 'es-ES',
  'pt-BR': 'pt-BR',
  vi: 'vi-VN',
  id: 'id-ID',
  tr: 'tr-TR',
  pl: 'pl-PL',
};

const formatDate = (ts: number, lang: Lang) =>
  new Date(ts).toLocaleDateString(PREMIUM_DATE_LOCALE[lang] ?? 'ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/**
 * `storeProductHasTrialIntro` импортирован из `./premium_trial_signal` — общая логика
 * проверки реального intro phase из App Store / Google Play.
 */

// ── Компонент ─────────────────────────────────────────────────────────────────
export default function PremiumModal() {
  const router = useRouter();
  const effectiveOs = useEffectivePlatformOS();
  const insets = useSafeAreaInsets();
  const goBack = () => {
    safeRouterBack(router);
  };
  const params = useLocalSearchParams<{
    context?: string;
    streak?: string;
    lessons_done?: string;
    saved?: string;
    level?: string;
    manage?: string;
    source?: string;
    /** Предвыбор плана из онбординга/диплинка: 'monthly' | 'yearly' | 'annual'. */
    plan?: string;
    _force_trial_ui?: string;
    _mock_yearly_price?: string;
    _mock_yearly_monthly?: string;
    _mock_monthly_price?: string;
  }>();
  const manageRaw = params.manage;
  /** Стабильный флаг без зависимости от нового объекта params на каждом ререндере */
  const openManageFromSettings =
    manageRaw === '1' || (Array.isArray(manageRaw) && manageRaw[0] === '1');
  /** Admin-only QA: форсит показ trial-UI (золотая лента + «Бесплатно» в карточках)
      даже когда магазин не вернул intro phase. Проставляется ТОЛЬКО из admin-панели,
      пользователь без deep-link доступа сам его не передаст. */
  const forceTrialUI = params._force_trial_ui === '1';
  const allowMockStorePricePreview = __DEV__ && !IS_STORE_RELEASE;
  const mockYearlyPrice = allowMockStorePricePreview ? routeParamString(params._mock_yearly_price) : '';
  const mockYearlyMonthlyEquivalent = allowMockStorePricePreview ? routeParamString(params._mock_yearly_monthly) : '';
  const mockMonthlyPrice = allowMockStorePricePreview ? routeParamString(params._mock_monthly_price) : '';

  const ctx = normalizePremiumContext(params.context);

  // A/B: 50% новых пользователей видят высококонверсионный v2-пейвол.
  // manage-режим всегда остаётся на v1 (там управление подпиской, v2 его не реализует).
  useEffect(() => {
    if (openManageFromSettings) return;
    void AsyncStorage.getItem('paywall_variant').then((stored) => {
      if (stored === 'v2') {
        router.replace('/premium_modal_v2' as any);
      } else if (stored === null) {
        // Первое открытие — назначаем вариант детерминированно по userId-hash,
        // fallback: Math.random() для скорости (не нужна воспроизводимость между сессиями).
        const variant = Math.random() < 0.5 ? 'v2' : 'v1';
        void AsyncStorage.setItem('paywall_variant', variant);
        if (variant === 'v2') router.replace('/premium_modal_v2' as any);
      }
      // stored === 'v1' → остаёмся здесь
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sourceParam = routeParamString(params.source);
  const paywallOpenOrigin = sourceParam || 'direct';
  const revenueContext = paywallOpenOrigin !== 'direct' ? paywallOpenOrigin : (openManageFromSettings ? 'settings' : ctx);
  const streakDays   = parseInt(params.streak       ?? '0') || 0;
  const lessonsDone  = parseInt(params.lessons_done ?? '0') || 0;
  const savedCards   = parseInt(params.saved        ?? '0') || 0;
  /** Один `paywall_plan_select` на пару (context, plan) за открытие экрана — без дублей карточка + CTA. */
  const lastPaywallPlanSelectLoggedRef = useRef<Plan | null>(null);
  const logPaywallPlanSelectDeduped = useCallback((plan: Plan) => {
    if (lastPaywallPlanSelectLoggedRef.current === plan) return;
    lastPaywallPlanSelectLoggedRef.current = plan;
    logPaywallPlanSelect(revenueContext, plan);
  }, [revenueContext]);

  useEffect(() => {
    lastPaywallPlanSelectLoggedRef.current = null;
    logPremiumModalOpened(ctx);
    logPaywallView(revenueContext);
    // Единое имя события для сквозной воронки v1+v2 (PostHog/Firebase-фасад).
    // Старые logPaywall* остаются для обратной совместимости дашбордов.
    void trackEvent('paywall_shown', { context: ctx, source: paywallOpenOrigin, paywall: 'v1' });
    if (ctx === 'course_after_lesson3') {
      logCoursePaywallAfterLesson3(lessonsDone);
    }
  }, [ctx, lessonsDone, revenueContext, paywallOpenOrigin]);
  const { theme: t, themeMode, f } = useTheme();
  const paywallCardBg = paywallGlassColor(t.bgCard, themeMode, 'card');
  const paywallSurfaceBg = paywallGlassColor(t.bgSurface, themeMode, 'surface');
  const paywallSurface2Bg = paywallGlassColor(t.bgSurface2, themeMode, 'soft');
  const paywallPrimaryBg = paywallGlassColor(t.bgPrimary, themeMode, 'primary');
  const paywallChromeBg = paywallGlassColor(t.bgCard, themeMode, 'chrome');
  const isCompassPaywall = themeMode === 'compass';
  const compassRadius = isCompassPaywall ? 9 : 16;
  const compassPanelRadius = isCompassPaywall ? 10 : 22;
  const compassIconRadius = isCompassPaywall ? 8 : 18;
  const compassSmallRadius = isCompassPaywall ? 7 : 12;
  const compassAccent = isCompassPaywall ? COMPASS_RICH.champagne : t.gold;
  const compassAccentSoft = isCompassPaywall ? COMPASS_RICH.washStrong : t.goldBg;
  const compassAccentBorder = isCompassPaywall ? COMPASS_RICH.hairlineStrong : t.gold + '66';
  const compassHairline = isCompassPaywall ? COMPASS_RICH.hairlineQuiet : t.gold + '2E';
  const compassPanelColors = isCompassPaywall
    ? COMPASS_GRADIENTS.premiumPanel
    : [paywallSurfaceBg, paywallCardBg, paywallSurface2Bg];
  const { lang } = useLang();
  const { reload: reloadEnergy } = useEnergy();
  const LP = (ru: string, uk: string, es: string, planned: PremiumPlannedCopy) => triLang(lang as Lang, {
    ru,
    uk,
    es,
    'pt-BR': planned['pt-BR'],
    vi: planned.vi,
    id: planned.id,
    tr: planned.tr,
    pl: planned.pl,
  });
  const renderPremiumEnergyGlyph = (size: number, width = size) => (
    <View style={{ width, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <EnergyIcon
        filled
        themeColor={t.gold}
        size={size}
        animateChange={false}
        shouldShake={false}
        themeMode={themeMode}
      />
    </View>
  );
  const renderPremiumShardGlyph = (size: number, width = size, amount = 0) => (
    <View style={{ width, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={oskolokImageForPackShards(amount, themeMode)}
        style={{ width: size, height: size }}
        contentFit="contain"
        accessibilityLabel="Осколки"
      />
    </View>
  );

  const preselectedPlan = normalizePlan(routeParamString(params.plan));
  const [selected,   setSelected]   = useState<Plan>(preselectedPlan ?? 'yearly');
  const [restoring,  setRestoring]  = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [packages,   setPackages]   = useState<PremiumPackages>({});
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [packagesLoadAttempted, setPackagesLoadAttempted] = useState(false);
  /** true = в 90-дн. «окне» после последней покупки/триал-флоу — не показываем копию 3 дня (локально). */
  const [trialReofferBlocked, setTrialReofferBlocked] = useState(false);

  // manage-view state
  type ViewMode = 'purchase' | 'manage';
  const [viewMode,    setViewMode]   = useState<ViewMode>(openManageFromSettings ? 'manage' : 'purchase');
  const [activePlan,  setActivePlan]  = useState<Plan | null>(null);
  const [isAdminGrantedPremium, setIsAdminGrantedPremium] = useState(false);
  const [expiryTs,    setExpiryTs]   = useState<number>(0);
  const [cancelled]  = useState(false);
  const [cancelSurveyVisible, setCancelSurveyVisible] = useState(false);
  const [cancelSurveyOtherText, setCancelSurveyOtherText] = useState('');
  const [changePlanConfirmVisible, setChangePlanConfirmVisible] = useState(false);
  const [exitTrialOfferVisible, setExitTrialOfferVisible] = useState(false);
  const exitTrialOfferSeenRef = useRef(false);
  const purchasingRef  = useRef(false);
  const ctaPulse       = useRef(new Animated.Value(1)).current;
  const badgeSparkle   = useRef(new Animated.Value(0)).current;
  const heroGlow       = useRef(new Animated.Value(0.35)).current;
  const heroFloat      = useRef(new Animated.Value(0)).current;
  // Entrance animation: пейвол появляется плавно снизу при открытии
  const entranceOpacity    = useRef(new Animated.Value(0)).current;
  const entranceTranslateY = useRef(new Animated.Value(52)).current;
  const entranceScale      = useRef(new Animated.Value(0.97)).current;

  const resolveCurrentPremiumState = useCallback(async () => {
    const [verifiedReal, verifiedVip] = await Promise.all([
      getVerifiedRealPremiumStatus().catch(() => false),
      getVerifiedVipStatus().catch(() => false),
    ]);
    const res = await AsyncStorage.multiGet([
      'premium_active',
      'premium_plan',
      'premium_expiry',
      'tester_no_premium',
      'admin_premium_override',
      'vip_active',
      'vip_plan',
      'vip_until',
      'vip_admin_override',
    ]);
    const active = res.find(r => r[0] === 'premium_active')?.[1];
    const rawPlan = String(res.find(r => r[0] === 'premium_plan')?.[1] ?? '').trim();
    const plan = normalizePlan(rawPlan);
    const expiry = parseInt(res.find(r => r[0] === 'premium_expiry')?.[1] || '0');
    const noPremium = res.find(r => r[0] === 'tester_no_premium')?.[1];
    const adminOverride = res.find(r => r[0] === 'admin_premium_override')?.[1];
    const vipActive = res.find(r => r[0] === 'vip_active')?.[1];
    const vipPlanRaw = String(res.find(r => r[0] === 'vip_plan')?.[1] ?? '').trim();
    const vipUntil = parseInt(res.find(r => r[0] === 'vip_until')?.[1] || '0');
    const vipOverride = res.find(r => r[0] === 'vip_admin_override')?.[1];
    const legacyAdminGrant =
      adminOverride === 'true' ||
      (rawPlan.toLowerCase() === 'admin_grant' && adminOverride !== 'false');
    const legacyAdminActive =
      noPremium !== 'true' &&
      legacyAdminGrant &&
      (expiry === 0 || expiry > Date.now());
    const vipStorageActive =
      noPremium !== 'true' &&
      vipActive === 'true' &&
      vipOverride !== 'false' &&
      (vipUntil === 0 || vipUntil > Date.now());
    const isAdmin = verifiedVip || vipStorageActive || legacyAdminActive;
    const adminExpiry = vipUntil > 0 ? vipUntil : expiry;
    const adminPlan = (() => {
      const normalizedVipPlan = normalizePlan(vipPlanRaw);
      if (normalizedVipPlan) return normalizedVipPlan;
      if (plan) return plan;
      if (adminExpiry > 0 && adminExpiry - Date.now() <= 45 * 24 * 60 * 60 * 1000) return 'monthly';
      return 'yearly';
    })();
    const hasLocalActive =
      noPremium !== 'true' &&
      active === 'true' &&
      !legacyAdminGrant &&
      !!plan &&
      (expiry === 0 || expiry > Date.now());
    const isPremium = noPremium === 'true' ? false : (verifiedReal || hasLocalActive || isAdmin);
    return {
      isPremium,
      plan: isAdmin ? adminPlan : plan,
      expiry: isAdmin ? adminExpiry : expiry,
      isAdmin,
    };
  }, []);

  const loadPremiumPackages = useCallback(async (): Promise<PremiumPackages> => {
    if (IS_EXPO_GO || DEV_IAP_BYPASS) return {};

    setPackagesLoadAttempted(true);
    setLoadingPackages(true);
    try {
      await initRevenueCat();
      if (!(await Purchases.isConfigured().catch(() => false))) return {};
      const offerings = await Purchases.getOfferings();
      const nextPackages = resolvePremiumPackages(offerings.current?.availablePackages ?? []);
      setPackages(nextPackages);
      return nextPackages;
    } catch {
      return {};
    } finally {
      setLoadingPackages(false);
    }
  }, []);

  // Entrance animation при каждом маунте экрана
  useEffect(() => {
    entranceOpacity.setValue(0);
    entranceTranslateY.setValue(52);
    entranceScale.setValue(0.97);
    Animated.parallel([
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(entranceTranslateY, {
        toValue: 0,
        tension: MOTION_SPRING_LEGACY.panel.tension,
        friction: MOTION_SPRING_LEGACY.panel.friction,
        useNativeDriver: true,
      }),
      Animated.spring(entranceScale, {
        toValue: 1,
        tension: MOTION_SPRING_LEGACY.panel.tension,
        friction: MOTION_SPRING_LEGACY.panel.friction,
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(heroGlow, { toValue: 0.62, duration: 1400, useNativeDriver: true }),
        Animated.timing(heroGlow, { toValue: 0.35, duration: 1400, useNativeDriver: true }),
      ])
    );
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(heroFloat, { toValue: -4, duration: 1800, useNativeDriver: true }),
        Animated.timing(heroFloat, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    glowLoop.start();
    floatLoop.start();
    return () => {
      glowLoop.stop();
      floatLoop.stop();
    };
  }, [heroGlow, heroFloat]);

  // Пульс CTA-кнопки и мерцание бейджика
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, { toValue: 1.02, duration: 950, useNativeDriver: true }),
        Animated.timing(ctaPulse, { toValue: 1.0, duration: 950, useNativeDriver: true }),
      ])
    );
    const sparkleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgeSparkle, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(badgeSparkle, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();
    sparkleLoop.start();
    return () => { pulseLoop.stop(); sparkleLoop.stop(); };
  }, [ctaPulse, badgeSparkle]);

  /** Открытие с «Настроек»: без `[params]` в deps — объект params у роутера часто новый каждый кадр → эффект крутился бы снова и сбрасывал дату. */
  useEffect(() => {
    if (!openManageFromSettings) return;

    let cancelled = false;

    const run = async () => {
      setViewMode('manage');
      try {
        const { isPremium, plan, expiry, isAdmin } = await resolveCurrentPremiumState();

        if (cancelled) return;

        if (!isPremium) {
          setViewMode('purchase');
          return;
        }
        const effectivePlan = plan ?? 'yearly';
        setIsAdminGrantedPremium(isAdmin);
        setActivePlan(effectivePlan);
        setExpiryTs(prev => (expiry > 0 ? expiry : prev));
        setViewMode('manage');

        const hasExpiryHint = expiry > 0;

        if (!isAdmin && !hasExpiryHint && !IS_EXPO_GO && !DEV_IAP_BYPASS) {
          try {
            const info = await Purchases.getCustomerInfo();
            if (cancelled) return;
            const entitlement = info.entitlements.active['premium'];
            if (entitlement?.expirationDate) {
              setExpiryTs(new Date(entitlement.expirationDate).getTime());
            }
          } catch {
            /* noop */
          }
        }
      } catch {
        if (!cancelled) setViewMode('purchase');
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [openManageFromSettings, resolveCurrentPremiumState]);

  const hero = getHero(ctx, streakDays, lessonsDone, savedCards);
  const heroPlanned = getHeroPlannedCopy(ctx, savedCards);
  const benefits = CONTEXT_BENEFITS[ctx] ?? CONTEXT_BENEFITS.generic;
  const heroBackdrop = useAdaptiveBackgroundSource(PREMIUM_HERO_BACKDROPS[themeMode]);
  const heroArt = PREMIUM_HERO_ART[ctx];
  const heroScrim = premiumHeroScrim(themeMode);
  const paywallComparisonPremiumColor =
    themeMode === 'compass' ? '#F2C48D' : PAYWALL_COMPARISON_PREMIUM_COLOR;
  const personalValueLine = getPersonalValueLine(ctx, streakDays, lessonsDone, savedCards, lang as Lang);

  // План #5 «зеркало прогресса» + #4 перцентиль — асинхронно, не блокируем рендер.
  const [progressMirror, setProgressMirror] = React.useState<ProgressMirror | null>(null);
  const [percentileLine, setPercentileLine] = React.useState<string | null>(null);
  // План #2: urgency-таймер (порт из v2). Реальный дедлайн — окно персональной цены, НЕ фальшивая срочность.
  const [urgency, setUrgency] = React.useState<UrgencyState | null>(null);
  React.useEffect(() => {
    if (openManageFromSettings) return; // в manage-режиме urgency не нужен
    let cancelled = false;
    void (async () => {
      try {
        await activateUrgencyIfNeeded();
        const st = await getUrgencyState();
        if (!cancelled) setUrgency(st);
      } catch { /* no-op */ }
    })();
    return () => { cancelled = true; };
  }, [openManageFromSettings]);
  React.useEffect(() => {
    if (!urgency?.isActive) return;
    const id = setInterval(() => {
      setUrgency((prev) => {
        if (!prev?.isActive) return prev;
        const remaining = prev.remainingMs - 1000;
        if (remaining <= 0) return { isActive: false, remainingMs: 0, remainingFormatted: '00:00:00' };
        return { ...prev, remainingMs: remaining, remainingFormatted: formatCountdown(remaining) };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [urgency?.isActive]);
  // План #6: ротация отзывов (детерминированно по дню). В ПРОДЕ показываются только
  // verified-отзывы (anti-fake, App Review 5.1.1); черновики видны лишь в dev/preview.
  const [testimonials, setTestimonials] = React.useState<Testimonial[]>([]);
  React.useEffect(() => {
    const dayHash = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    const includeUnverified = __DEV__ && !IS_STORE_RELEASE;
    setTestimonials(pickTestimonials(lang as Lang, ctx, dayHash, 2, includeUnverified));
  }, [ctx, lang]);
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Зеркало прогресса: для intro_ended — дельта «за 3 дня», иначе lifetime «уже твоё».
      try {
        const m = ctx === 'intro_ended' ? await readIntroProgress() : await readProgressMirror();
        if (!cancelled && isMirrorWorthShowing(m)) setProgressMirror(m);
      } catch { /* пейвол не должен падать из-за статистики */ }
      // Перцентиль-строка только для релевантных high-value контекстов.
      if (ctx === 'streak' || ctx === 'intro_ended' || ctx === 'percentiles') {
        try {
          const { percentiles } = await loadPercentileData();
          if (cancelled) return;
          const line = pickPercentileLine(ctx, percentiles, { streak: streakDays }, lang as Lang);
          if (line) setPercentileLine(line);
        } catch { /* нет данных — молчим */ }
      }
    })();
    return () => { cancelled = true; };
  }, [ctx, streakDays, lang]);

  const yearlyStoreHasTrial = !trialReofferBlocked && storeProductHasTrialIntro(packages.yearly?.product);
  const monthlyStoreHasTrial = !trialReofferBlocked && storeProductHasTrialIntro(packages.monthly?.product);
  const hasStoreTrial = yearlyStoreHasTrial || monthlyStoreHasTrial;
  const showPrimaryTrialUi = shouldShowPrimaryTrialUi({
    forceTrialUI,
    source: params.source,
    hasStoreTrial,
  });
  const primaryYearlyHasTrial = showPrimaryTrialUi && (forceTrialUI || yearlyStoreHasTrial);
  const primaryMonthlyHasTrial = showPrimaryTrialUi && (forceTrialUI || monthlyStoreHasTrial);
  const primaryHasTrialOffer = primaryYearlyHasTrial || primaryMonthlyHasTrial;
  const exitTrialPlan: Plan = yearlyStoreHasTrial ? 'yearly' : 'monthly';
  const storePricesRequired = !IS_EXPO_GO && !DEV_IAP_BYPASS;
  const yearlyPrice = storePriceTrim(packages.yearly?.product.priceString) || mockYearlyPrice;
  const monthlyPrice = storePriceTrim(packages.monthly?.product.priceString) || mockMonthlyPrice;
  const yearlyMonthlyEquivalent = storePricePerMonthTrim(packages.yearly?.product) || mockYearlyMonthlyEquivalent;
  const selectedMonthlyEquivalent = selected === 'yearly' ? yearlyMonthlyEquivalent : '';
  // План #9: процент экономии. Сначала точно из pricePerMonth, иначе fallback из строк
  // (год vs месяц×12) — чтобы сигнал выгоды был ВСЕГДА, даже когда стор не отдал pricePerMonth.
  const savingsPct: number | null = computeSavingsPct({
    yearlyPerMonth: (packages.yearly?.product as { pricePerMonth?: number } | undefined)?.pricePerMonth,
    monthlyPerMonth: (packages.monthly?.product as { pricePerMonth?: number } | undefined)?.pricePerMonth,
    yearlyPriceStr: packages.yearly?.product.priceString ?? null,
    monthlyPriceStr: packages.monthly?.product.priceString ?? null,
  });
  // План #10: цена в день из годовой (decoupling, Правило 3 Библии). Валюта — из стора.
  // Точную сумму берём из числового product.price (без неоднозначности парсинга), строку — для валюты.
  const yearlyPerDay = computePerDayString(
    packages.yearly?.product.priceString ?? null,
    (packages.yearly?.product as { price?: number } | undefined)?.price ?? null,
  );
  const perDayLabel = yearlyPerDay
    ? LP(`≈ ${yearlyPerDay} в день`, `≈ ${yearlyPerDay} на день`, `≈ ${yearlyPerDay} al día`, {
        'pt-BR': `≈ ${yearlyPerDay} por dia`,
        vi: `≈ ${yearlyPerDay} mỗi ngày`,
        id: `≈ ${yearlyPerDay} per hari`,
        tr: `≈ ${yearlyPerDay} / gün`,
        pl: `≈ ${yearlyPerDay} dziennie`,
      })
    : '';
  // План #2: зачёркнутая «старая» цена — только пока активен реальный urgency-период.
  const urgencyActive = urgency?.isActive === true;
  const yearlyDoubledPrice = urgencyActive ? getDoubledPrice(yearlyPrice) : null;
  const monthlyDoubledPrice = urgencyActive ? getDoubledPrice(monthlyPrice) : null;
  const monthlyEquivalentLabel = yearlyMonthlyEquivalent
    ? LP(`≈ ${yearlyMonthlyEquivalent} / месяц`, `≈ ${yearlyMonthlyEquivalent} / місяць`, `≈ ${yearlyMonthlyEquivalent} / mes`, {
        'pt-BR': `≈ ${yearlyMonthlyEquivalent} /mês`,
        vi: `≈ ${yearlyMonthlyEquivalent} /tháng`,
        id: `≈ ${yearlyMonthlyEquivalent} /bulan`,
        tr: `≈ ${yearlyMonthlyEquivalent} /ay`,
        pl: `≈ ${yearlyMonthlyEquivalent} /mies.`,
      })
    : '';
  const yearlyBillingNote = yearlyMonthlyEquivalent
    ? LP('оплата за год', 'оплата за рік', 'facturado anual', {
        'pt-BR': 'cobrado anualmente',
        vi: 'thanh toán hằng năm',
        id: 'ditagih tahunan',
        tr: 'yıllık faturalandırılır',
        pl: 'rozliczenie roczne',
      })
    : '';
  const missingStorePriceLabel = loadingPackages || !packagesLoadAttempted
    ? LP('Загружаем…', 'Завантажуємо…', 'Loading…', {
        'pt-BR': 'Preço pendente',
        vi: 'Sắp có giá',
        id: 'Harga segera tersedia',
        tr: 'Fiyat hazırlanıyor',
        pl: 'Cena wkrótce',
      })
    : LP('Повторить', 'Повторити', 'Reintentar', {
        'pt-BR': 'Repetir',
        vi: 'Thử lại',
        id: 'Coba lagi',
        tr: 'Tekrar dene',
        pl: 'Ponów',
      });

  const closePaywallAfterDecline = useCallback((reason: PaywallCloseReason) => {
    if (exitTrialOfferVisible) {
      logExitTrialOfferDeclined(revenueContext, exitTrialPlan);
    }
    if (reason === 'close') logPaywallClose(revenueContext);
    else logPaywallContinueFree(revenueContext);
    // План #7: abandoned-paywall push через ~1ч (только реальный пейвол, не manage).
    if (!openManageFromSettings) {
      void import('./notifications')
        .then(({ schedulePaywallAbandonedNotification }) => schedulePaywallAbandonedNotification(lang as Lang))
        .catch(() => {});
    }
    goBack();
  }, [exitTrialOfferVisible, exitTrialPlan, goBack, revenueContext, openManageFromSettings, lang]);

  const requestPaywallClose = useCallback((reason: PaywallCloseReason) => {
    if (shouldShowExitTrialOffer({
      context: ctx,
      closeReason: reason,
      viewMode,
      openManageFromSettings,
      purchasing,
      restoring,
      hasStoreTrial,
      alreadySeen: exitTrialOfferSeenRef.current,
      forceTrialUI,
    })) {
      exitTrialOfferSeenRef.current = true;
      logExitTrialOfferShown(revenueContext, exitTrialPlan);
      setExitTrialOfferVisible(true);
      return;
    }
    closePaywallAfterDecline(reason);
  }, [
    closePaywallAfterDecline,
    exitTrialPlan,
    forceTrialUI,
    hasStoreTrial,
    openManageFromSettings,
    purchasing,
    revenueContext,
    restoring,
    viewMode,
  ]);

  // Персонализированные теги: top-3 «болевых» строки, загружаются асинхронно.
  // Показываем pill-карточки выше hero-блока чтобы юзер увидел «зеркало своего опыта»
  // до стандартного рекламного pitch.
  const [personalizedTags, setPersonalizedTags] = React.useState<PersonalizedTag[]>([]);
  React.useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void collectPaywallStats().then((stats) => {
        setPersonalizedTags(pickPaywallTags(stats, 3));
      });
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    getTrialReofferBlockedByCooldown().then(setTrialReofferBlocked);

    /** С manage=1 не трогаем — отдельный эффект, иначе двойная гидрация и моргание. */
    if (openManageFromSettings) return;

    resolveCurrentPremiumState()
      .then(async ({ isPremium, plan, expiry, isAdmin }) => {
        if (isPremium) {
          const effectivePlan = plan ?? 'yearly';
          setIsAdminGrantedPremium(isAdmin);
          setActivePlan(effectivePlan);
          setExpiryTs(prev => (expiry > 0 ? expiry : prev));
          if (ctx === 'personal_plan') {
            await activatePendingPersonalPlanAfterPremium();
            finishPersonalPlanActivationFlow();
            return;
          }
          setViewMode('manage');
        }
      })
      .catch(() => {});
  }, [resolveCurrentPremiumState, openManageFromSettings]);

  useFocusEffect(
    useCallback(() => {
      void getTrialReofferBlockedByCooldown().then(setTrialReofferBlocked);
      void loadPremiumPackages();
    }, [loadPremiumPackages]),
  );

  const activateFreezeIfNeeded = async () => {
    if (ctx === 'streak') {
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem('streak_freeze', JSON.stringify({ active: true, date: today }));
      emitAppEvent('streak_freeze_updated', { active: true });
    }
  };

  const activatePersonalPlanAfterPremiumIfNeeded = async () => {
    if (ctx !== 'personal_plan') return;
    await activatePendingPersonalPlanAfterPremium();
  };

  const markPremiumCelebrationIfNeeded = async () => {
    if (ctx === 'personal_plan') return;
    await markCelebrationPending();
  };

  const finishPersonalPlanActivationFlow = () => {
    invalidatePremiumCache();
    AsyncStorage.setItem('had_premium_ever', '1').catch(() => {});
    void getPremiumCourseLevel().catch(() => {});
    emitAppEvent('premium_activated');
    reloadEnergy();
    AsyncStorage.getItem(PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY)
      .then((pendingNickname) => {
        if (pendingNickname === '1') {
          return AsyncStorage.multiSet([
            ['onboarding_step', 'name'],
            [PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY, '1'],
          ])
            .then(() => AsyncStorage.removeItem('onboarding_done'))
            .then(() => {
              emitAppEvent('personal_plan_onboarding_nickname_ready');
              router.replace('/(tabs)/home' as any);
            });
        }
        router.replace('/personal_plan_thank_you' as any);
      })
      .catch(() => {
        router.replace('/personal_plan_thank_you' as any);
      });
  };

  const finishPremiumActivationAndReturn = () => {
    if (ctx === 'personal_plan') {
      finishPersonalPlanActivationFlow();
      return;
    }
    invalidatePremiumCache();
    AsyncStorage.setItem('had_premium_ever', '1').catch(() => {});
    void getPremiumCourseLevel().catch(() => {});
    emitAppEvent('premium_activated');
    reloadEnergy();
    goBack();
  };

  const handlePurchase = async (plan: Plan) => {
    // Defensive guard: if premium is already active locally, don\'t start a second flow.
    if (activePlan) {
      if (ctx === 'personal_plan') {
        await activatePersonalPlanAfterPremiumIfNeeded();
        finishPersonalPlanActivationFlow();
        return;
      }
      setViewMode('manage');
      return;
    }
    let latestPremiumState = await resolveCurrentPremiumState().catch(() => null);
    if (!latestPremiumState?.isPremium && !IS_EXPO_GO) {
      try {
        const { restoreFromCloud } = await import('./cloud_sync');
        await restoreFromCloud();
        invalidatePremiumCache();
        latestPremiumState = await resolveCurrentPremiumState().catch(() => latestPremiumState);
      } catch {
        // Cloud refresh is best-effort; if it fails, the store flow still handles normal purchases.
      }
    }
    if (latestPremiumState?.isPremium) {
      const effectivePlan = latestPremiumState.plan ?? 'yearly';
      setIsAdminGrantedPremium(latestPremiumState.isAdmin);
      setActivePlan(effectivePlan);
      setExpiryTs(prev => (latestPremiumState?.expiry && latestPremiumState.expiry > 0 ? latestPremiumState.expiry : prev));
      if (ctx === 'personal_plan') {
        await activatePersonalPlanAfterPremiumIfNeeded();
        finishPersonalPlanActivationFlow();
        return;
      }
      setViewMode('manage');
      return;
    }
    if (purchasingRef.current) return;
    purchasingRef.current = true;
    setSelected(plan);
    if (IS_EXPO_GO || DEV_IAP_BYPASS) {
      await savePremiumLocally(plan);
      await markSubscriptionOrTrialFlowConsumedNow();
      await activateFreezeIfNeeded();
      await activatePersonalPlanAfterPremiumIfNeeded();
      purchasingRef.current = false;
      await markPremiumCelebrationIfNeeded();
      finishPremiumActivationAndReturn();
      return;
    }
    await initRevenueCat();
    if (!(await Purchases.isConfigured())) {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Платежи временно недоступны. Открой приложение через пару секунд и попробуй снова.',
        messageUk: 'Платежі тимчасово недоступні. Зачекайте кілька секунд і спробуйте знову.',
        messageEs: 'Pagos no disponibles por ahora. Espera unos segundos e inténtalo de nuevo.',
      });
      purchasingRef.current = false;
      return;
    }
    if (!(await syncRevenueCatIdentity())) {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Платежи ещё привязываются к аккаунту. Подожди пару секунд и попробуй снова.',
        messageUk: 'Платежі ще прив\'язуються до акаунта. Зачекайте пару секунд і спробуйте знову.',
        messageEs: 'Los pagos aún se están vinculando a la cuenta. Espera unos segundos e inténtalo de nuevo.',
      });
      purchasingRef.current = false;
      return;
    }
    let currentPackages = packages;
    let pkg = plan === 'yearly' ? currentPackages.yearly : currentPackages.monthly;
    const hadVisibleStorePrice = !!storePriceTrim(pkg?.product.priceString);
    if (!pkg || !hadVisibleStorePrice) {
      // Fallback: пользователь мог нажать CTA раньше, чем завершился initial getOfferings.
      currentPackages = await loadPremiumPackages();
      pkg = plan === 'yearly' ? currentPackages.yearly : currentPackages.monthly;
      if (pkg && storePriceTrim(pkg.product.priceString)) {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Готово. Нажми кнопку ещё раз, чтобы открыть доступ.',
          messageUk: 'Готово. Натисни кнопку ще раз, щоб відкрити доступ.',
          messageEs: 'Listo. Pulsa el botón otra vez para abrir el acceso.',
        });
        purchasingRef.current = false;
        return;
      }
    }
    if (!pkg) {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Магазин недоступен. Попробуй ещё раз.',
        messageUk: 'Магазин недоступний. Спробуйте ще раз.',
        messageEs: 'La tienda no está disponible. Inténtalo de nuevo.',
      });
      purchasingRef.current = false;
      return;
    }
    if (!storePriceTrim(pkg.product.priceString)) {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Ещё загружаем. Попробуй через секунду.',
        messageUk: 'Ціни ще завантажуються. Спробуйте за секунду.',
        messageEs: 'Los precios aún se están cargando. Inténtalo en un segundo.',
      });
      purchasingRef.current = false;
      return;
    }
    let returnedAfterActivation = false;
    setPurchasing(true);
    try {
      // Android: для free trial иногда нужно явно выбрать subscriptionOption с триальной фазой.
      // iOS: introductory offer применяет система — только purchasePackage; purchaseSubscriptionOption
      // здесь может не открыть лист оплаты (см. RC docs: iOS subscription offers).
      if (__DEV__) console.log('[RC] subscriptionOptions:', JSON.stringify(pkg.product.subscriptionOptions?.map(o => ({ id: o.id, freePhase: o.freePhase }))));
      const trialOption =
        Platform.OS === 'android' && !trialReofferBlocked
          ? pkg.product.subscriptionOptions?.find(o =>
              o.freePhase != null || (o as any).phases?.some((ph: { periodDuration?: string; price?: { amountMicros: number } }) => ph.price?.amountMicros === 0)
            )
          : undefined;
      if (__DEV__) console.log('[RC] trialOption found:', trialOption?.id ?? 'none');

      // Воронка: момент открытия платёжного диалога стора (раньше не трекался —
      // нельзя было измерить drop-off между нажатием CTA и завершением покупки).
      void trackEvent('purchase_started', {
        context: revenueContext,
        plan,
        product_id: pkg.product.identifier,
        with_trial: !!trialOption,
        paywall: 'v1',
      });
      // Воронка after-win (#3): явный CTA-шаг для контекста level_up.
      if (ctx === 'level_up') {
        const awSource = routeParamString(params.source) || 'afterwin_levelup';
        void trackEvent('afterwin_upsell_cta', { plan, source: awSource });
        void import('./firebase').then(({ logAfterWinUpsellCta }) => logAfterWinUpsellCta(awSource, plan)).catch(() => {});
      }

      const { customerInfo } = trialOption
        ? await Purchases.purchaseSubscriptionOption(trialOption)
        : await Purchases.purchasePackage(pkg);
      // purchasePackage не выбросил исключение → покупка авторизована Apple/Google.
      // Активируем сразу, не дожидаясь синхронизации RC (sandbox может запаздывать).
      // RC-статус используем как дополнительную проверку, но не как условие активации.
      await savePremiumLocally(plan, revenueCatPremiumMetadata(customerInfo, pkg.product.identifier));
      logPremiumPurchased(pkg.product.identifier, revenueContext);
      void trackEvent('purchase_completed', {
        context: revenueContext,
        plan,
        product_id: pkg.product.identifier,
        with_trial: !!trialOption,
        paywall: 'v1',
      });
      if (trialOption) {
        void trackEvent('trial_started', { context: revenueContext, plan, product_id: pkg.product.identifier, paywall: 'v1' });
      }
      // Локальная отметка: 90 д. без копии «3 дня» (магазин отдельно решает про intro).
      await markSubscriptionOrTrialFlowConsumedNow();
      await activateFreezeIfNeeded();
      await activatePersonalPlanAfterPremiumIfNeeded();
      // Подняли pending для PremiumCelebrationModal — на следующем mount home.tsx
      // юзер увидит celebration с замочками и короной.
      await markPremiumCelebrationIfNeeded();
      returnedAfterActivation = true;
      finishPremiumActivationAndReturn();
      return;
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? '');
      const code = String(e?.code ?? '');
      const alreadyOwned =
        /already.*(subscribed|purchased|owned)|currently subscribed|product.*already/i.test(msg) ||
        /product.*already|purchase.*not.*allowed|already/i.test(code);

      if (alreadyOwned) {
        try {
          const info = await Purchases.restorePurchases();
          const isActive =
            Object.keys(info.entitlements.active).length > 0 ||
            info.activeSubscriptions.length > 0;
          if (isActive) {
            const restoredPlan: Plan =
              info.activeSubscriptions.some(s => /year|annual|12.?month/i.test(s)) ? 'yearly' : plan;
            await savePremiumLocally(restoredPlan, revenueCatPremiumMetadata(info));
            await markSubscriptionOrTrialFlowConsumedNow();
            await activateFreezeIfNeeded();
            await activatePersonalPlanAfterPremiumIfNeeded();
            await markPremiumCelebrationIfNeeded();
            returnedAfterActivation = true;
            finishPremiumActivationAndReturn();
            return;
          }
        } catch {
          // Fall through to the visible error below.
        }
      }

      if ((e as any)?.userCancelled) {
        void trackEvent('purchase_cancelled', { context: revenueContext, plan, paywall: 'v1' });
      } else {
        void trackEvent('purchase_failed', { context: revenueContext, plan, paywall: 'v1', error: msg.slice(0, 100) });
      }
      if (!(e as any)?.userCancelled) {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: (e as any)?.message || 'Что-то пошло не так.',
          messageUk: (e as any)?.message || 'Щось пішло не так.',
          messageEs: (e as any)?.message || 'Algo salió mal.',
        });
      }
    } finally {
      if (!returnedAfterActivation) setPurchasing(false);
      purchasingRef.current = false;
    }
  };

  const isDevStorePreview = IS_EXPO_GO || DEV_IAP_BYPASS;

  const handleChangePlan = async () => {
    if (activePlan !== 'monthly' || (isAdminGrantedPremium && !isDevStorePreview)) return;
    if (purchasingRef.current) return;
    purchasingRef.current = true;
    setPurchasing(true);
    try {
      if (isDevStorePreview) {
        await savePremiumLocally('yearly');
        setActivePlan('yearly');
        invalidatePremiumCache();
        emitAppEvent('action_toast', {
          type: 'success',
          messageRu: 'DEV: план переключён на годовой локально.',
          messageUk: 'DEV: план перемкнено на річний локально.',
          messageEs: 'DEV: plan cambiado a anual localmente.',
        });
        return;
      }
      await initRevenueCat();
      if (!(await Purchases.isConfigured()) || !(await syncRevenueCatIdentity())) {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Платежи ещё готовятся. Подожди пару секунд и попробуй снова.',
          messageUk: 'Платежі ще готуються. Зачекайте пару секунд і спробуйте знову.',
          messageEs: 'Los pagos aún se están preparando. Espera unos segundos e inténtalo de nuevo.',
        });
        return;
      }

      let currentPkg = packages.monthly;
      let nextPkg = packages.yearly;
      if (!currentPkg || !nextPkg || !storePriceTrim(nextPkg.product.priceString)) {
        const nextPackages = await loadPremiumPackages();
        currentPkg = nextPackages.monthly;
        nextPkg = nextPackages.yearly;
      }
      if (!currentPkg || !nextPkg || !storePriceTrim(nextPkg.product.priceString)) {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Годовой план пока недоступен в магазине. Попробуй позже.',
          messageUk: 'Річний план поки недоступний у магазині. Спробуйте пізніше.',
          messageEs: 'El plan anual aún no está disponible en la tienda. Inténtalo más tarde.',
        });
        return;
      }

      const googleProductChangeInfo = {
        oldProductIdentifier: currentPkg.product.identifier,
        prorationMode: Purchases.PRORATION_MODE.DEFERRED,
      };
      const purchaseResult = Platform.OS === 'android'
        ? await Purchases.purchasePackage(nextPkg, null, googleProductChangeInfo)
        : await Purchases.purchasePackage(nextPkg);
      const info = purchaseResult.customerInfo ?? await Purchases.getCustomerInfo();
      const isActive =
        Object.keys(info.entitlements.active).length > 0 ||
        info.activeSubscriptions.length > 0;
      if (isActive) {
        const confirmedPlan: Plan =
          info.activeSubscriptions.some(s => /year|annual|12.?month/i.test(s)) ? 'yearly' : 'monthly';
        const metadata = revenueCatPremiumMetadata(info);
        await savePremiumLocally(confirmedPlan, metadata);
        setActivePlan(confirmedPlan);
        setExpiryTs(prev => {
          const expiry = Number(metadata.expiryMs ?? 0);
          return expiry > 0 ? expiry : prev;
        });
        invalidatePremiumCache();
      }
      emitAppEvent('action_toast', {
        type: 'success',
        messageRu: 'Смена плана отправлена в магазин. Годовой план будет подтверждён в окне оплаты.',
        messageUk: 'Зміну плану передано в магазин. Річний план буде підтверджено у вікні оплати.',
        messageEs: 'Cambio enviado a la tienda. El plan anual se confirmará en la ventana de pago.',
      });
    } catch (e: any) {
      if (!e?.userCancelled) {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: e.message || 'Не удалось сменить план.',
          messageUk: e.message || 'Не вдалося змінити план.',
          messageEs: e.message || 'No se pudo cambiar el plan.',
        });
      }
    } finally {
      setPurchasing(false);
      purchasingRef.current = false;
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      if (isDevStorePreview) {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Восстановление покупок доступно в реальной сборке через магазин.',
          messageUk: 'Відновлення покупок доступне в реальній збірці через магазин.',
          messageEs: 'La restauración de compras está disponible en una compilación real con tienda.',
        });
        return;
      }
      await initRevenueCat();
      if (!(await Purchases.isConfigured()) || !(await syncRevenueCatIdentity())) {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Платежи ещё готовятся. Подожди пару секунд и попробуй снова.',
          messageUk: 'Платежі ще готуються. Зачекайте пару секунд і спробуйте знову.',
          messageEs: 'Los pagos aún se están preparando. Espera unos segundos e inténtalo de nuevo.',
        });
        return;
      }
      const info = await Purchases.restorePurchases();
      const activeSubscriptions = info.activeSubscriptions ?? [];
      const isActive =
        Object.keys(info.entitlements.active).length > 0 ||
        activeSubscriptions.length > 0;
      if (isActive) {
        const metadata = revenueCatPremiumMetadata(info);
        const plan: Plan = inferPremiumPlanFromProductId(
          metadata.productId,
          activeSubscriptions.some(s => /year|annual|12.?month/i.test(s)) ? 'yearly' : 'monthly',
        );
        await savePremiumLocally(plan, metadata);
        await markSubscriptionOrTrialFlowConsumedNow();
        // Restore = первый раз на этом устройстве (или после reset) — celebration уместна,
        // чтобы юзер видел что premium «активирован» и понимал что разблокировано.
        await activatePersonalPlanAfterPremiumIfNeeded();
        await markPremiumCelebrationIfNeeded();
        if (ctx === 'personal_plan') {
          finishPersonalPlanActivationFlow();
          return;
        }
        emitAppEvent('premium_activated');
        reloadEnergy();
        emitAppEvent('action_toast', {
          type: 'success',
          messageRu: 'Подписка восстановлена!',
          messageUk: 'Підписку відновлено!',
          messageEs: '¡Suscripción restaurada!',
        });
        goBack();
      } else {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Активных подписок не найдено.',
          messageUk: 'Активних підписок не знайдено.',
          messageEs: 'No hay suscripciones activas.',
        });
      }
    } catch (e: any) {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: e.message || 'Ошибка восстановления.',
        messageUk: e.message || 'Помилка відновлення.',
        messageEs: e.message || 'Error al restaurar la suscripción.',
      });
    } finally {
      setRestoring(false);
    }
  };

  const openManageWithToast = () => {
    emitAppEvent('action_toast', {
      type: 'info',
      messageRu: 'Открываем управление подпиской.',
      messageUk: 'Відкриваємо керування підпискою.',
      messageEs: 'Abriendo la gestión de la suscripción.',
    });
    Linking.openURL(getSubscriptionManageUrl());
  };

  // ── Manage view ─────────────────────────────────────────────────────────────
  if (viewMode === 'manage' && !activePlan) {
    return (
      <PremiumScreenShell>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14 }}>
              <TapScale
                onPress={() => goBack()}
                style={{ width: 40, height: 40, borderRadius: isCompassPaywall ? 8 : 20, alignItems: 'center', justifyContent: 'center', backgroundColor: paywallChromeBg, borderWidth: 1, borderColor: t.border }}
              >
                <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
              </TapScale>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800' }}>Premium</Text>
                <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 1 }}>
                  {LP('Управление подпиской', 'Керування підпискою', 'Gestionar suscripción', {
                    'pt-BR': 'Gerenciar assinatura',
                    vi: 'Quản lý gói đăng ký',
                    id: 'Kelola langganan',
                    tr: 'Aboneliği yönet',
                    pl: 'Zarządzanie subskrypcją',
                  })}
                </Text>
              </View>
            </View>
            <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
              <View style={{ backgroundColor: paywallCardBg, borderRadius: 22, borderWidth: 1, borderColor: t.border, padding: 20 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800' }}>
                  {LP('Проверяем подписку', 'Перевіряємо підписку', 'Comprobando suscripción', {
                    'pt-BR': 'Verificando assinatura',
                    vi: 'Đang kiểm tra gói đăng ký',
                    id: 'Memeriksa langganan',
                    tr: 'Abonelik kontrol ediliyor',
                    pl: 'Sprawdzamy subskrypcję',
                  })}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.body, marginTop: 8, lineHeight: 22 }}>
                  {LP('Секунду, загружаем данные Premium.', 'Секунду, завантажуємо дані Premium.', 'Un segundo, cargando los datos de Premium.', {
                    'pt-BR': 'Um segundo, carregando os dados do Premium.',
                    vi: 'Chờ một chút, đang tải dữ liệu Premium.',
                    id: 'Sebentar, memuat data Premium.',
                    tr: 'Bir saniye, Premium verileri yükleniyor.',
                    pl: 'Chwileczkę, ładujemy dane Premium.',
                  })}
                </Text>
              </View>
            </View>
          </ContentWrap>
        </SafeAreaView>
      </PremiumScreenShell>
    );
  }

  if (viewMode === 'manage' && activePlan) {
    const amount = activePlan === 'yearly'
      ? yearlyPrice
      : monthlyPrice;
    const period = activePlan === 'yearly'
      ? LP('год', 'рік', 'año', {
          'pt-BR': 'ano',
          vi: 'năm',
          id: 'tahun',
          tr: 'yıl',
          pl: 'rok',
        })
      : LP('месяц', 'місяць', 'mes', {
          'pt-BR': 'mês',
          vi: 'tháng',
          id: 'bulan',
          tr: 'ay',
          pl: 'miesiąc',
        });
    const noExpiryLabel = LP('без срока', 'без строку', 'sin fecha de fin', {
      'pt-BR': 'sem data final',
      vi: 'không có ngày hết hạn',
      id: 'tanpa tanggal akhir',
      tr: 'bitiş tarihi yok',
      pl: 'bez daty końcowej',
    });
    const amountLabel = isAdminGrantedPremium
      ? LP('Выдано администратором', 'Видано адміністратором', 'Concedido por admin', {
          'pt-BR': 'Concedido por admin',
          vi: 'Duoc cap boi quan tri vien',
          id: 'Diberikan oleh admin',
          tr: 'Yonetici tarafindan verildi',
          pl: 'Przyznane przez admina',
        })
      : amount === ''
      ? (effectiveOs === 'ios'
          ? LP('Цена в App Store', 'Ціна в App Store', 'Precio en App Store', {
              'pt-BR': 'Preço na App Store',
              vi: 'Giá trong App Store',
              id: 'Harga di App Store',
              tr: 'App Store fiyatı',
              pl: 'Cena w App Store',
            })
          : effectiveOs === 'android'
            ? LP('Цена в Google Play', 'Ціна в Google Play', 'Precio en Google Play', {
                'pt-BR': 'Preço no Google Play',
                vi: 'Giá trên Google Play',
                id: 'Harga di Google Play',
                tr: 'Google Play fiyatı',
                pl: 'Cena w Google Play',
              })
            : LP('Цена в магазине', 'Ціна в магазині', 'Precio en la tienda', {
                'pt-BR': 'Preço na loja',
                vi: 'Giá trong cửa hàng',
                id: 'Harga di toko',
                tr: 'Mağaza fiyatı',
                pl: 'Cena w sklepie',
              }))
      : `${amount} / ${period}`;
    const canChangeMonthlyToYearly = activePlan === 'monthly' && !cancelled && (!isAdminGrantedPremium || isDevStorePreview);
    const yearlyChangePrice = storePriceTrim(packages.yearly?.product.priceString);
    const changePlanCurrentEndLabel = expiryTs > 0 ? formatDate(expiryTs, lang) : noExpiryLabel;
    const changePlanStoreName = effectiveOs === 'ios' ? 'App Store' : 'Google Play';
    const changePlanYearlyAmount = yearlyChangePrice || LP('Годовой план появится в окне оплаты', 'Річний план зʼявиться у вікні оплати', 'El precio anual aparecerá en la ventana de pago', {
      'pt-BR': 'O preço anual aparecerá na janela de pagamento',
      vi: 'Giá gói năm sẽ xuất hiện trong cửa sổ thanh toán',
      id: 'Harga tahunan akan muncul di jendela pembayaran',
      tr: 'Yıllık fiyat ödeme penceresinde görünür',
      pl: 'Cena roczna pojawi się w oknie płatności',
    });
    const premiumGold = compassAccent;
    const premiumGoldSoft = compassAccentSoft;
    const premiumBorder = compassAccentBorder;
    const premiumHairline = compassHairline;
    const premiumShadow = {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: isCompassPaywall ? 2 : 10 },
      shadowOpacity: isCompassPaywall ? 0.10 : 0.24,
      shadowRadius: isCompassPaywall ? 4 : 24,
      elevation: isCompassPaywall ? 1 : 10,
    };
    const refinedCard = {
      borderRadius: compassPanelRadius,
      ...(isCompassPaywall ? {} : premiumShadow),
    };
    const refinedCardInner = {
      borderRadius: compassPanelRadius,
      borderWidth: 1,
      borderColor: premiumHairline,
      overflow: 'hidden' as const,
    };
    return (
      <PremiumScreenShell>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14 }}>
              <TapScale
                onPress={() => goBack()}
                style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: paywallChromeBg, borderWidth: 1, borderColor: t.border }}
              >
                <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
              </TapScale>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800' }}>Premium</Text>
                <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 1 }}>
                  {LP('Управление подпиской', 'Керування підпискою', 'Gestionar suscripción', {
                    'pt-BR': 'Gerenciar assinatura',
                    vi: 'Quản lý gói đăng ký',
                    id: 'Kelola langganan',
                    tr: 'Aboneliği yönet',
                    pl: 'Zarządzanie subskrypcją',
                  })}
                </Text>
              </View>
            </View>
            <ScrollView decelerationRate="normal" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 28, gap: 16 }}>
              <View style={refinedCard}>
                <LinearGradient
                  colors={compassPanelColors as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[refinedCardInner, { padding: 20, gap: 16 }]}
                >
                  <LinearGradient
                    pointerEvents="none"
                    colors={[premiumGold + '28', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 18, right: 18, height: 1, backgroundColor: isCompassPaywall ? 'rgba(255,231,182,0.16)' : premiumGold + '88' }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <LinearGradient
                      colors={[premiumGold, '#FFF1A8', premiumGold]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ width: 52, height: 52, borderRadius: compassIconRadius, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isCompassPaywall ? COMPASS_RICH.edgeLight : '#FFF7C8' }}
                    >
                      {renderPremiumShardGlyph(36)}
                    </LinearGradient>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', lineHeight: Math.round(f.h2 * 1.18) }} numberOfLines={2} adjustsFontSizeToFit>
                        {LP('Premium активирован', 'Premium активовано', 'Premium activado', {
                          'pt-BR': 'Premium ativado',
                          vi: 'Đã kích hoạt Premium',
                          id: 'Premium aktif',
                          tr: 'Premium etkin',
                          pl: 'Premium aktywny',
                        })}
                      </Text>
                      <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 4 }} numberOfLines={2}>
                        {isAdminGrantedPremium
                          ? LP('Премиум выдан администратором', 'Преміум видано адміністратором', 'Premium concedido por admin', {
                              'pt-BR': 'Premium concedido por admin',
                              vi: 'Premium do quan tri vien cap',
                              id: 'Premium diberikan oleh admin',
                              tr: 'Premium yonetici tarafindan verildi',
                              pl: 'Premium przyznane przez admina',
                            })
                          : activePlan === 'yearly'
                            ? LP('Годовая подписка', 'Річна підписка', 'Suscripción anual', {
                                'pt-BR': 'Assinatura anual',
                                vi: 'Gói đăng ký hằng năm',
                                id: 'Langganan tahunan',
                                tr: 'Yıllık abonelik',
                                pl: 'Subskrypcja roczna',
                              })
                            : LP('Ежемесячная подписка', 'Щомісячна підписка', 'Suscripción mensual', {
                                'pt-BR': 'Assinatura mensal',
                                vi: 'Gói đăng ký hằng tháng',
                                id: 'Langganan bulanan',
                                tr: 'Aylık abonelik',
                                pl: 'Subskrypcja miesięczna',
                              })}
                      </Text>
                    </View>
                  </View>
                  {!cancelled && (
                    <View style={{ paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: premiumHairline, gap: 14 }}>
                      <View style={{ flexDirection: 'row', gap: 14 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700' }}>
                            {isAdminGrantedPremium
                              ? LP('Доступ до', 'Доступ до', 'Acceso hasta', {
                                  'pt-BR': 'Acesso ate',
                                  vi: 'Truy cap den',
                                  id: 'Akses sampai',
                                  tr: 'Erisim tarihi',
                                  pl: 'Dostep do',
                                })
                              : LP('Следующий платёж', 'Наступний платіж', 'Próximo pago', {
                                  'pt-BR': 'Próximo pagamento',
                                  vi: 'Thanh toán tiếp theo',
                                  id: 'Pembayaran berikutnya',
                                  tr: 'Sonraki ödeme',
                                  pl: 'Następna płatność',
                                })}
                          </Text>
                          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', marginTop: 5 }} numberOfLines={2}>
                            {expiryTs > 0 ? formatDate(expiryTs, lang) : (isAdminGrantedPremium ? noExpiryLabel : '—')}
                          </Text>
                        </View>
                        <View style={{ flex: 1.25 }}>
                          <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700' }}>
                            {LP('Сумма', 'Сума', 'Importe', {
                              'pt-BR': 'Valor',
                              vi: 'Số tiền',
                              id: 'Jumlah',
                              tr: 'Tutar',
                              pl: 'Kwota',
                            })}
                          </Text>
                          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', marginTop: 5 }} numberOfLines={2} adjustsFontSizeToFit>
                            {amountLabel}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: t.textMuted, fontSize: 12, lineHeight: 17 }}>
                        {isAdminGrantedPremium
                          ? LP('Это админский доступ, не новая покупка в магазине.', 'Це адмінський доступ, не нова покупка в магазині.', 'This is admin access, not a new store purchase.', {
                              'pt-BR': 'Este é acesso de administrador, não uma nova compra na loja.',
                              vi: 'Đây là quyền truy cập quản trị, không phải giao dịch mới trong cửa hàng.',
                              id: 'Ini akses admin, bukan pembelian toko baru.',
                              tr: 'Bu yönetici erişimi, mağazada yeni bir satın alma değil.',
                              pl: 'To dostęp administratora, nie nowy zakup w sklepie.',
                            })
                          : effectiveOs === 'ios'
                            ? LP('Точную дату списания смотри в App Store', 'Точну дату списання дивись в App Store', 'La fecha exacta del cargo está en App Store', {
                              'pt-BR': 'Veja a data exata da cobrança na App Store',
                              vi: 'Xem ngày tính phí chính xác trong App Store',
                              id: 'Lihat tanggal penagihan tepatnya di App Store',
                              tr: 'Tam ödeme tarihini App Store içinde kontrol et',
                              pl: 'Dokładną datę pobrania opłaty znajdziesz w App Store',
                            })
                          : effectiveOs === 'android'
                            ? LP('Точную дату списания смотри в Google Play', 'Точну дату списання дивись у Google Play', 'La fecha exacta del cargo está en Google Play', {
                                'pt-BR': 'Veja a data exata da cobrança no Google Play',
                                vi: 'Xem ngày tính phí chính xác trên Google Play',
                                id: 'Lihat tanggal penagihan tepatnya di Google Play',
                                tr: 'Tam ödeme tarihini Google Play içinde kontrol et',
                                pl: 'Dokładną datę pobrania opłaty znajdziesz w Google Play',
                              })
                            : LP('Точную дату списания смотри в магазине приложений', 'Точну дату списання дивись у магазині застосунків', 'La fecha exacta del cargo está en la tienda de apps', {
                                'pt-BR': 'Veja a data exata da cobrança na loja de apps',
                                vi: 'Xem ngày tính phí chính xác trong cửa hàng ứng dụng',
                                id: 'Lihat tanggal penagihan tepatnya di toko aplikasi',
                                tr: 'Tam ödeme tarihini uygulama mağazasında kontrol et',
                                pl: 'Dokładną datę pobrania opłaty znajdziesz w sklepie z aplikacjami',
                              })}
                      </Text>
                    </View>
                  )}
                  {cancelled && (
                    <Text style={{ color: t.wrong, fontSize: f.sub, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.wrong + '44', lineHeight: 20 }}>
                      {LP(
                        `Подписка отменена. Доступ активен до ${formatDate(expiryTs, lang)}`,
                        `Підписку скасовано. Доступ активний до ${formatDate(expiryTs, lang)}`,
                        `Suscripción cancelada. El acceso sigue hasta el ${formatDate(expiryTs, lang)}`,
                        {
                          'pt-BR': `Assinatura cancelada. O acesso fica ativo até ${formatDate(expiryTs, lang)}`,
                          vi: `Gói đăng ký đã hủy. Quyền truy cập còn hiệu lực đến ${formatDate(expiryTs, lang)}`,
                          id: `Langganan dibatalkan. Akses aktif sampai ${formatDate(expiryTs, lang)}`,
                          tr: `Abonelik iptal edildi. Erişim ${formatDate(expiryTs, lang)} tarihine kadar aktif`,
                          pl: `Subskrypcja anulowana. Dostęp jest aktywny do ${formatDate(expiryTs, lang)}`,
                        },
                      )}
                    </Text>
                  )}
                </LinearGradient>
              </View>

              <View style={refinedCard}>
                <LinearGradient
                  colors={[paywallCardBg, paywallSurfaceBg, paywallCardBg]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[refinedCardInner, { padding: 20, gap: 16 }]}
                >
                  <LinearGradient
                    pointerEvents="none"
                    colors={[premiumGold + '18', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 34, height: 34, borderRadius: isCompassPaywall ? 7 : 17, backgroundColor: premiumGoldSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: premiumBorder }}>
                      <Ionicons name="sparkles" size={18} color={premiumGold} />
                    </View>
                    <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900' }}>
                      {LP('Что у тебя уже включено', 'Що в тебе вже включено', 'Lo que ya tienes incluido', {
                        'pt-BR': 'O que já está incluído',
                        vi: 'Những gì bạn đã có',
                        id: 'Yang sudah termasuk',
                        tr: 'Zaten dahil olanlar',
                        pl: 'Co już masz w pakiecie',
                      })}
                    </Text>
                  </View>
                  <View style={{ gap: 13 }}>
                    {MANAGE_VIEW_PREMIUM_BENEFITS.map((row, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                        <View style={{ width: 24, height: 24, borderRadius: isCompassPaywall ? 5 : 12, backgroundColor: premiumGoldSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: premiumBorder, marginTop: 1 }}>
                          <Ionicons name="checkmark" size={15} color={premiumGold} />
                        </View>
                        <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, lineHeight: 22, fontWeight: '500' }}>
                          {LP(row.ru, row.uk, row.es, row)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              </View>

              {canChangeMonthlyToYearly && (
                <TouchableOpacity
                  onPress={() => { hapticTap(); setChangePlanConfirmVisible(true); }}
                  activeOpacity={0.86}
                  disabled={purchasing}
                  style={{ borderRadius: compassPanelRadius, opacity: purchasing ? 0.62 : 1, ...(isCompassPaywall ? {} : premiumShadow) }}
                >
                  <LinearGradient
                    colors={(isCompassPaywall ? COMPASS_GRADIENTS.raisedTile : [paywallSurfaceBg, paywallCardBg]) as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 18, borderWidth: 1, borderColor: premiumHairline, borderRadius: compassPanelRadius, gap: 10, overflow: 'hidden' }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <View style={{ width: 34, height: 34, borderRadius: isCompassPaywall ? 7 : 17, backgroundColor: premiumGoldSoft, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="swap-horizontal-outline" size={20} color={premiumGold} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }} numberOfLines={2}>
                            {LP('Перейти на годовой план', 'Перейти на річний план', 'Cambiar al plan anual', {
                              'pt-BR': 'Mudar para o plano anual',
                              vi: 'Chuyển sang gói hằng năm',
                              id: 'Pindah ke paket tahunan',
                              tr: 'Yıllık plana geç',
                              pl: 'Przejdź na plan roczny',
                            })}
                          </Text>
                          {!!yearlyChangePrice && (
                            <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }} numberOfLines={1}>
                              {yearlyChangePrice}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={premiumGold} />
                    </View>
                    <Text style={{ color: t.textMuted, fontSize: 12, lineHeight: 17 }}>
                      {LP('Изменение применится через магазин. На Google Play годовой план начнётся после текущего периода; на iOS откроется управление подпиской App Store.', 'Зміна застосовується через магазин. У Google Play річний план почнеться після поточного періоду; на iOS відкриється керування підпискою App Store.', 'El cambio se aplica a través de la tienda. En Google Play, el plan anual empezará después del periodo actual; en iOS se abrirá la gestión de App Store.', {
                        'pt-BR': 'A mudança é aplicada pela loja. No Google Play, o plano anual começa após o período atual; no iOS, abre o gerenciamento da App Store.',
                        vi: 'Thay đổi được áp dụng qua cửa hàng. Trên Google Play, gói hằng năm bắt đầu sau kỳ hiện tại; trên iOS sẽ mở phần quản lý App Store.',
                        id: 'Perubahan diterapkan melalui toko. Di Google Play, paket tahunan dimulai setelah periode saat ini; di iOS akan membuka pengelolaan App Store.',
                        tr: 'Değişiklik mağaza üzerinden uygulanır. Google Play’de yıllık plan mevcut dönemden sonra başlar; iOS’ta App Store abonelik yönetimi açılır.',
                        pl: 'Zmiana jest stosowana przez sklep. W Google Play plan roczny zacznie się po obecnym okresie; w iOS otworzy się zarządzanie subskrypcją App Store.',
                      })}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {!cancelled && !isAdminGrantedPremium && (
                <TouchableOpacity
                  onPress={() => { hapticTap(); setCancelSurveyVisible(true); }}
                  activeOpacity={0.86}
                  style={{ borderRadius: compassPanelRadius }}
                >
                  <LinearGradient
                    colors={(isCompassPaywall ? COMPASS_GRADIENTS.recessedPanel : [paywallCardBg, paywallSurfaceBg]) as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 18, borderWidth: 1, borderColor: t.wrong + '55', borderRadius: compassPanelRadius, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: isCompassPaywall ? 7 : 17, backgroundColor: t.wrongBg, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="close-circle-outline" size={21} color={t.wrong} />
                    </View>
                    <Text style={{ color: t.wrong, fontSize: f.body, fontWeight: '800' }}>{LP('Отменить подписку', 'Скасувати підписку', 'Cancelar suscripción', {
                      'pt-BR': 'Cancelar assinatura',
                      vi: 'Hủy gói đăng ký',
                      id: 'Batalkan langganan',
                      tr: 'Aboneliği iptal et',
                      pl: 'Anuluj subskrypcję',
                    })}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {isAdminGrantedPremium && (
                <TouchableOpacity
                  onPress={() => { hapticTap(); openManageWithToast(); }}
                  activeOpacity={0.86}
                  style={{ borderRadius: compassPanelRadius }}
                >
                  <LinearGradient
                    colors={(isCompassPaywall ? COMPASS_GRADIENTS.recessedPanel : [paywallCardBg, paywallSurfaceBg]) as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 18, borderWidth: 1, borderColor: premiumHairline, borderRadius: compassPanelRadius, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: isCompassPaywall ? 7 : 17, backgroundColor: premiumGoldSoft, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="open-outline" size={20} color={premiumGold} />
                    </View>
                    <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                      {effectiveOs === 'ios'
                        ? LP('Проверить подписки в App Store', 'Перевірити підписки в App Store', 'Revisar suscripciones en App Store', {
                            'pt-BR': 'Ver assinaturas na App Store',
                            vi: 'Kiem tra dang ky trong App Store',
                            id: 'Periksa langganan di App Store',
                            tr: 'App Store aboneliklerini kontrol et',
                            pl: 'Sprawdz subskrypcje w App Store',
                          })
                        : LP('Проверить подписки в Google Play', 'Перевірити підписки в Google Play', 'Revisar suscripciones en Google Play', {
                            'pt-BR': 'Ver assinaturas no Google Play',
                            vi: 'Kiem tra dang ky trong Google Play',
                            id: 'Periksa langganan di Google Play',
                            tr: 'Google Play aboneliklerini kontrol et',
                            pl: 'Sprawdz subskrypcje w Google Play',
                          })}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={premiumGold} />
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center', marginTop: 4, lineHeight: 17 }}>
                {isAdminGrantedPremium
                  ? LP('Админский Premium не отменяет отдельную подписку в магазине. Если там был активный триал или план, отмените его в App Store / Google Play.', 'Адмінський Premium не скасовує окрему підписку в магазині. Якщо там був активний trial або план, скасуйте його в App Store / Google Play.', 'Admin Premium does not cancel a separate store subscription. If a trial or plan is active there, cancel it in App Store / Google Play.', {
                      'pt-BR': 'Premium de administrador não cancela uma assinatura separada da loja. Se houver teste ou plano ativo, cancele na App Store / Google Play.',
                      vi: 'Premium quản trị không hủy gói đăng ký riêng trong cửa hàng. Nếu có gói hoặc bản dùng thử đang hoạt động, hãy hủy trong App Store / Google Play.',
                      id: 'Premium admin tidak membatalkan langganan toko terpisah. Jika ada trial atau paket aktif, batalkan di App Store / Google Play.',
                      tr: 'Yönetici Premium’u ayrı mağaza aboneliğini iptal etmez. Aktif deneme veya plan varsa App Store / Google Play içinde iptal edin.',
                      pl: 'Premium administratora nie anuluje osobnej subskrypcji w sklepie. Jeśli trial lub plan jest aktywny, anuluj go w App Store / Google Play.',
                    })
                  : effectiveOs === 'ios'
                    ? LP('Подписка управляется через App Store', 'Підписка управляється через App Store', 'La suscripción se gestiona en App Store', {
                      'pt-BR': 'A assinatura é gerenciada pela App Store',
                      vi: 'Gói đăng ký được quản lý qua App Store',
                      id: 'Langganan dikelola melalui App Store',
                      tr: 'Abonelik App Store üzerinden yönetilir',
                      pl: 'Subskrypcja jest zarządzana przez App Store',
                    })
                  : effectiveOs === 'android'
                    ? LP('Подписка управляется через Google Play', 'Підписка управляється через Google Play', 'La suscripción se gestiona en Google Play', {
                        'pt-BR': 'A assinatura é gerenciada pelo Google Play',
                        vi: 'Gói đăng ký được quản lý qua Google Play',
                        id: 'Langganan dikelola melalui Google Play',
                        tr: 'Abonelik Google Play üzerinden yönetilir',
                        pl: 'Subskrypcja jest zarządzana przez Google Play',
                      })
                    : LP('Подписка управляется через магазин приложений', 'Підписка управляється через магазин застосунків', 'La suscripción se gestiona en la tienda de apps', {
                        'pt-BR': 'A assinatura é gerenciada pela loja de apps',
                        vi: 'Gói đăng ký được quản lý qua cửa hàng ứng dụng',
                        id: 'Langganan dikelola melalui toko aplikasi',
                        tr: 'Abonelik uygulama mağazası üzerinden yönetilir',
                        pl: 'Subskrypcja jest zarządzana przez sklep z aplikacjami',
                      })}
              </Text>
              {isAdminGrantedPremium && (
                <Text style={{ color: t.textSecond, fontSize: f.label, textAlign: 'center', marginTop: 2, lineHeight: 17 }}>
                  {LP('Премиум выдан администратором. Управление — через админ-панель.', 'Преміум видано адміністратором. Керування — через адмін-панель.', 'Premium concedido por un administrador. La gestión es desde el panel de admin.', {
                    'pt-BR': 'Premium concedido por um administrador. O gerenciamento é feito pelo painel de admin.',
                    vi: 'Premium do quản trị viên cấp. Quản lý trong bảng admin.',
                    id: 'Premium diberikan oleh admin. Pengelolaan melalui panel admin.',
                    tr: 'Premium yönetici tarafından verildi. Yönetim admin panelinden yapılır.',
                    pl: 'Premium przyznane przez administratora. Zarządzanie odbywa się w panelu admina.',
                  })}
                </Text>
              )}
            </ScrollView>
          </ContentWrap>
        </SafeAreaView>

        <Modal
          visible={changePlanConfirmVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!purchasing) setChangePlanConfirmVisible(false);
          }}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: paywallCardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: Math.max(34, insets.bottom + 16), borderTopWidth: 1, borderColor: premiumHairline }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: premiumGoldSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: premiumBorder }}>
                  <Ionicons name="shield-checkmark-outline" size={22} color={premiumGold} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900' }} numberOfLines={2} adjustsFontSizeToFit>
                    {LP('Подтвердить годовой план', 'Підтвердити річний план', 'Confirmar plan anual', {
                      'pt-BR': 'Confirmar plano anual',
                      vi: 'Xác nhận gói năm',
                      id: 'Konfirmasi paket tahunan',
                      tr: 'Yıllık planı onayla',
                      pl: 'Potwierdź plan roczny',
                    })}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }} numberOfLines={2}>
                    {changePlanStoreName}
                  </Text>
                </View>
              </View>

              <View style={{ borderRadius: 16, borderWidth: 1, borderColor: premiumHairline, backgroundColor: paywallSurfaceBg, overflow: 'hidden' }}>
                {[
                  [
                    LP('Текущий месячный план', 'Поточний місячний план', 'Plan mensual actual', {
                      'pt-BR': 'Plano mensal atual',
                      vi: 'Gói tháng hiện tại',
                      id: 'Paket bulanan saat ini',
                      tr: 'Mevcut aylık plan',
                      pl: 'Obecny plan miesięczny',
                    }),
                    LP(`Активен до ${changePlanCurrentEndLabel}`, `Активний до ${changePlanCurrentEndLabel}`, `Activo hasta ${changePlanCurrentEndLabel}`, {
                      'pt-BR': `Ativo até ${changePlanCurrentEndLabel}`,
                      vi: `Có hiệu lực đến ${changePlanCurrentEndLabel}`,
                      id: `Aktif sampai ${changePlanCurrentEndLabel}`,
                      tr: `${changePlanCurrentEndLabel} tarihine kadar aktif`,
                      pl: `Aktywny do ${changePlanCurrentEndLabel}`,
                    }),
                  ],
                  [
                    LP('Новый годовой план', 'Новий річний план', 'Nuevo plan anual', {
                      'pt-BR': 'Novo plano anual',
                      vi: 'Gói năm mới',
                      id: 'Paket tahunan baru',
                      tr: 'Yeni yıllık plan',
                      pl: 'Nowy plan roczny',
                    }),
                    changePlanYearlyAmount,
                  ],
                  [
                    LP('Дата применения', 'Дата застосування', 'Fecha de aplicación', {
                      'pt-BR': 'Data de aplicação',
                      vi: 'Ngày áp dụng',
                      id: 'Tanggal berlaku',
                      tr: 'Uygulama tarihi',
                      pl: 'Data zastosowania',
                    }),
                    effectiveOs === 'android'
                      ? LP(`После текущего периода: ${changePlanCurrentEndLabel}`, `Після поточного періоду: ${changePlanCurrentEndLabel}`, `Después del periodo actual: ${changePlanCurrentEndLabel}`, {
                          'pt-BR': `Após o período atual: ${changePlanCurrentEndLabel}`,
                          vi: `Sau kỳ hiện tại: ${changePlanCurrentEndLabel}`,
                          id: `Setelah periode saat ini: ${changePlanCurrentEndLabel}`,
                          tr: `Mevcut dönemden sonra: ${changePlanCurrentEndLabel}`,
                          pl: `Po obecnym okresie: ${changePlanCurrentEndLabel}`,
                        })
                      : LP('Точную дату и списание подтвердит Apple в окне оплаты', 'Точну дату і списання підтвердить Apple у вікні оплати', 'Apple confirmará la fecha y el cargo en la ventana de pago', {
                          'pt-BR': 'A Apple confirmará a data e a cobrança na janela de pagamento',
                          vi: 'Apple sẽ xác nhận ngày và khoản phí trong cửa sổ thanh toán',
                          id: 'Apple akan mengonfirmasi tanggal dan tagihan di jendela pembayaran',
                          tr: 'Apple tarih ve ücreti ödeme penceresinde onaylar',
                          pl: 'Apple potwierdzi datę i opłatę w oknie płatności',
                        }),
                  ],
                ].map(([label, value], index) => (
                  <View key={label} style={{ padding: 14, borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: premiumHairline }}>
                    <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800', marginBottom: 4 }}>{label}</Text>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', lineHeight: 21 }}>{value}</Text>
                  </View>
                ))}
              </View>

              <Text style={{ color: t.textMuted, fontSize: f.label, lineHeight: 18, marginTop: 14 }}>
                {LP('После нажатия откроется стандартное окно оплаты магазина. Без подтверждения в нём деньги не списываются.', 'Після натискання відкриється стандартне вікно оплати магазину. Без підтвердження в ньому кошти не списуються.', 'Después se abrirá la ventana de pago de la tienda. Sin confirmarla, no se cobrará nada.', {
                  'pt-BR': 'Depois será aberta a janela padrão de pagamento da loja. Sem confirmar nela, nada será cobrado.',
                  vi: 'Sau đó cửa sổ thanh toán tiêu chuẩn của cửa hàng sẽ mở. Nếu không xác nhận ở đó, bạn sẽ không bị tính phí.',
                  id: 'Setelah itu jendela pembayaran standar toko akan terbuka. Tanpa konfirmasi di sana, tidak ada biaya.',
                  tr: 'Ardından mağazanın standart ödeme penceresi açılır. Orada onaylamadan ücret alınmaz.',
                  pl: 'Następnie otworzy się standardowe okno płatności sklepu. Bez potwierdzenia nic nie zostanie pobrane.',
                })}
              </Text>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <TouchableOpacity
                  onPress={() => { hapticTap(); setChangePlanConfirmVisible(false); }}
                  disabled={purchasing}
                  activeOpacity={0.86}
                  style={{ flex: 1, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: premiumHairline, backgroundColor: paywallSurfaceBg, opacity: purchasing ? 0.6 : 1 }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                    {LP('Назад', 'Назад', 'Atrás', {
                      'pt-BR': 'Voltar',
                      vi: 'Quay lại',
                      id: 'Kembali',
                      tr: 'Geri',
                      pl: 'Wstecz',
                    })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    hapticTap();
                    setChangePlanConfirmVisible(false);
                    void handleChangePlan();
                  }}
                  disabled={purchasing}
                  activeOpacity={0.86}
                  style={{ flex: 1.35, minHeight: 50, borderRadius: 16, overflow: 'hidden', opacity: purchasing ? 0.6 : 1 }}
                >
                  <LinearGradient colors={[premiumGold, '#FFF1A8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
                    <Text style={{ color: '#17130A', fontSize: f.body, fontWeight: '900', textAlign: 'center' }} numberOfLines={2} adjustsFontSizeToFit>
                      {purchasing
                        ? LP('Открываем оплату...', 'Відкриваємо оплату...', 'Abriendo pago...', {
                            'pt-BR': 'Abrindo pagamento...',
                            vi: 'Đang mở thanh toán...',
                            id: 'Membuka pembayaran...',
                            tr: 'Ödeme açılıyor...',
                            pl: 'Otwieranie płatności...',
                          })
                        : LP('Подтвердить', 'Підтвердити', 'Confirmar', {
                            'pt-BR': 'Confirmar',
                            vi: 'Xác nhận',
                            id: 'Konfirmasi',
                            tr: 'Onayla',
                            pl: 'Potwierdź',
                          })}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Опрос при отмене подписки */}
        <Modal visible={cancelSurveyVisible} transparent animationType="slide">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: paywallCardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Math.max(40, insets.bottom + 16) }}>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginBottom: 6 }}>
                {LP('Почему хочешь отменить?', 'Чому хочеш скасувати?', '¿Por qué quieres cancelar?', {
                  'pt-BR': 'Por que você quer cancelar?',
                  vi: 'Vì sao bạn muốn hủy?',
                  id: 'Mengapa ingin membatalkan?',
                  tr: 'Neden iptal etmek istiyorsun?',
                  pl: 'Dlaczego chcesz anulować?',
                })}
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.body, marginBottom: 20 }}>
                {LP('Это поможет нам стать лучше', 'Це допоможе нам стати кращими', 'Nos ayudará a mejorar', {
                  'pt-BR': 'Isso nos ajuda a melhorar',
                  vi: 'Điều này giúp chúng tôi cải thiện',
                  id: 'Ini membantu kami menjadi lebih baik',
                  tr: 'Bu, daha iyi olmamıza yardımcı olur',
                  pl: 'To pomoże nam się poprawić',
                })}
              </Text>
              <TextInput
                value={cancelSurveyOtherText}
                onChangeText={setCancelSurveyOtherText}
                placeholder={LP('Комментарий (необязательно)', 'Коментар (необов\'язково)', 'Comentario (opcional)', {
                  'pt-BR': 'Comentário (opcional)',
                  vi: 'Bình luận (không bắt buộc)',
                  id: 'Komentar (opsional)',
                  tr: 'Yorum (isteğe bağlı)',
                  pl: 'Komentarz (opcjonalnie)',
                })}
                placeholderTextColor={t.textGhost}
                multiline
                maxLength={1000}
                style={{
                  minHeight: 82,
                  maxHeight: 140,
                  textAlignVertical: 'top',
                  color: t.textPrimary,
                  backgroundColor: paywallPrimaryBg,
                  borderColor: t.border,
                  borderWidth: 0.5,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: f.body,
                  marginBottom: 10,
                }}
              />
              {([
                { key: 'too_expensive',    ru: 'Слишком дорого', uk: 'Надто дорого', es: 'Demasiado caro', 'pt-BR': 'Muito caro', vi: 'Quá đắt', id: 'Terlalu mahal', tr: 'Çok pahalı', pl: 'Za drogo', planned: { 'pt-BR': 'Muito caro', vi: 'Quá đắt', id: 'Terlalu mahal', tr: 'Çok pahalı', pl: 'Za drogo' } },
                { key: 'not_enough_value', ru: 'Не хватает контента', uk: 'Не вистачає контенту', es: 'Falta contenido', 'pt-BR': 'Falta conteúdo', vi: 'Chưa đủ nội dung', id: 'Kontennya kurang', tr: 'Yeterli içerik yok', pl: 'Za mało treści', planned: { 'pt-BR': 'Falta conteúdo', vi: 'Chưa đủ nội dung', id: 'Kontennya kurang', tr: 'Yeterli içerik yok', pl: 'Za mało treści' } },
                { key: 'technical_issues', ru: 'Технические проблемы', uk: 'Технічні проблеми', es: 'Problemas técnicos', 'pt-BR': 'Problemas técnicos', vi: 'Sự cố kỹ thuật', id: 'Masalah teknis', tr: 'Teknik sorunlar', pl: 'Problemy techniczne', planned: { 'pt-BR': 'Problemas técnicos', vi: 'Sự cố kỹ thuật', id: 'Masalah teknis', tr: 'Teknik sorunlar', pl: 'Problemy techniczne' } },
                { key: 'found_better_app', ru: 'Нашёл лучше приложение', uk: 'Знайшов краще застосунок', es: 'Encontré una app mejor', 'pt-BR': 'Encontrei um app melhor', vi: 'Tôi tìm thấy ứng dụng tốt hơn', id: 'Menemukan aplikasi yang lebih baik', tr: 'Daha iyi bir uygulama buldum', pl: 'Znalazłem lepszą aplikację', planned: { 'pt-BR': 'Encontrei um app melhor', vi: 'Tôi tìm thấy ứng dụng tốt hơn', id: 'Menemukan aplikasi yang lebih baik', tr: 'Daha iyi bir uygulama buldum', pl: 'Znalazłem lepszą aplikację' } },
                { key: 'not_using_enough', ru: 'Пользуюсь редко', uk: 'Користуюсь рідко', es: 'Casi no la uso', 'pt-BR': 'Quase não uso', vi: 'Tôi ít dùng ứng dụng', id: 'Jarang saya gunakan', tr: 'Neredeyse kullanmıyorum', pl: 'Rzadko używam', planned: { 'pt-BR': 'Quase não uso', vi: 'Tôi ít dùng ứng dụng', id: 'Jarang saya gunakan', tr: 'Neredeyse kullanmıyorum', pl: 'Rzadko używam' } },
                { key: 'other',            ru: 'Другое', uk: 'Інше', es: 'Otro motivo', 'pt-BR': 'Outro motivo', vi: 'Lý do khác', id: 'Alasan lain', tr: 'Başka bir neden', pl: 'Inny powód', planned: { 'pt-BR': 'Outro motivo', vi: 'Lý do khác', id: 'Alasan lain', tr: 'Başka bir neden', pl: 'Inny powód' } },
              ] as ({ key: string; ru: string; uk: string; es: string; planned: PremiumPlannedCopy } & PremiumPlannedCopy)[]).map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={{ paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: t.border, flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => {
                    hapticTap();
                    logCancelSurvey(item.key, cancelSurveyOtherText, ctx);
                    setCancelSurveyOtherText('');
                    setCancelSurveyVisible(false);
                    openManageWithToast();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.body, flex: 1 }}>
                    {LP(item.ru, item.uk, item.es, item.planned)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={t.textGhost} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={{ marginTop: 20, paddingVertical: 14, alignItems: 'center', backgroundColor: paywallPrimaryBg, borderRadius: 14 }}
                onPress={() => { hapticTap(); setCancelSurveyVisible(false); }}
                activeOpacity={0.7}
              >
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                  {LP('Остаться с Premium', 'Залишитись з Premium', 'Seguir con Premium', {
                    'pt-BR': 'Continuar com Premium',
                    vi: 'Tiếp tục dùng Premium',
                    id: 'Tetap dengan Premium',
                    tr: 'Premium ile kal',
                    pl: 'Zostań przy Premium',
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </PremiumScreenShell>
    );
  }

  // ── Purchase view ─────────────────────────────────────────────────────────────
  return (
    <PremiumScreenShell>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <Modal
            visible={exitTrialOfferVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setExitTrialOfferVisible(false)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.68)',
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingTop: insets.top + 18,
                paddingBottom: insets.bottom + 18,
              }}
            >
              <View
                style={{
                  backgroundColor: paywallCardBg,
                  width: '100%',
                  maxWidth: 360,
                  maxHeight: '92%',
                  borderRadius: 22,
                  paddingHorizontal: 20,
                  paddingTop: 20,
                  paddingBottom: 18,
                  borderWidth: 1,
                  borderColor: '#FACC1555',
                  shadowColor: '#000',
                  shadowOpacity: 0.28,
                  shadowRadius: 22,
                  shadowOffset: { width: 0, height: 14 },
                  elevation: 14,
                }}
              >
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={LP('Закрыть', 'Закрити', 'Cerrar', {
                    'pt-BR': 'Fechar',
                    vi: 'Dong',
                    id: 'Tutup',
                    tr: 'Kapat',
                    pl: 'Zamknij',
                  })}
                  hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    zIndex: 2,
                  }}
                  onPress={() => {
                    hapticTap();
                    setExitTrialOfferVisible(false);
                  }}
                >
                  <Ionicons name="close" size={20} color={t.textMuted} />
                </TouchableOpacity>

                <View style={{ alignItems: 'center', marginBottom: 18, paddingTop: 10 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFD7001F',
                      borderWidth: 1,
                      borderColor: '#FFD70066',
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons name="sparkles" size={24} color="#FFD700" />
                  </View>
                  <Text
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.84}
                    style={{
                      color: t.textPrimary,
                      fontSize: Math.min(f.h2, 24),
                      lineHeight: 29,
                      fontWeight: '900',
                      textAlign: 'center',
                      paddingHorizontal: 28,
                    }}
                  >
                    {LP('3 дня Premium бесплатно', '3 дні Premium безкоштовно', '3 dias de Premium gratis', {
                      'pt-BR': '3 dias de Premium grátis',
                      vi: '3 ngày Premium miễn phí',
                      id: 'Premium gratis 3 hari',
                      tr: '3 gün Premium ücretsiz',
                      pl: '3 dni Premium za darmo',
                    })}
                  </Text>
                  <Text
                    style={{
                      color: t.textMuted,
                      fontSize: f.body,
                      lineHeight: 22,
                      marginTop: 12,
                      textAlign: 'center',
                    }}
                  >
                    {LP(
                      'Попробуй Premium сейчас. Если не подойдет, отменить можно до конца пробного периода.',
                      'Спробуй Premium зараз. Якщо не підійде, скасувати можна до завершення пробного періоду.',
                      'Prueba Premium ahora. Si no te convence, puedes cancelar antes de que termine la prueba.',
                      {
                        'pt-BR': 'Teste o Premium agora. Se não gostar, você pode cancelar antes do fim do período grátis.',
                        vi: 'Dùng thử Premium ngay. Nếu không phù hợp, bạn có thể hủy trước khi hết thời gian dùng thử.',
                        id: 'Coba Premium sekarang. Jika tidak cocok, kamu bisa membatalkan sebelum masa uji coba berakhir.',
                        tr: 'Premium’u şimdi dene. Uygun değilse deneme süresi bitmeden iptal edebilirsin.',
                        pl: 'Wypróbuj Premium teraz. Jeśli Ci nie pasuje, możesz anulować przed końcem okresu próbnego.',
                      },
                    )}
                  </Text>
                  <Text
                    style={{
                      color: t.textGhost,
                      fontSize: Math.max(12, f.caption),
                      lineHeight: 18,
                      marginTop: 10,
                      textAlign: 'center',
                    }}
                  >
                    {LP(
                      'После пробного периода подписка продолжится по выбранному плану.',
                      'Після пробного періоду підписка продовжиться за обраним планом.',
                      'Despues de la prueba, la suscripcion continuara con el plan elegido.',
                      {
                        'pt-BR': 'Depois do teste, a assinatura continuará no plano escolhido.',
                        vi: 'Sau thời gian dùng thử, gói đăng ký sẽ tiếp tục theo gói đã chọn.',
                        id: 'Setelah uji coba, langganan berlanjut dengan paket yang dipilih.',
                        tr: 'Deneme süresinden sonra abonelik seçilen planla devam eder.',
                        pl: 'Po okresie próbnym subskrypcja będzie kontynuowana w wybranym planie.',
                      },
                    )}
                  </Text>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#FFD700',
                    borderRadius: 14,
                    minHeight: 52,
                    paddingVertical: 16,
                    paddingHorizontal: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 8,
                    opacity: purchasing ? 0.62 : 1,
                  }}
                  activeOpacity={0.86}
                  disabled={purchasing}
                  onPress={() => {
                    hapticTap();
                    setExitTrialOfferVisible(false);
                    setSelected(exitTrialPlan);
                    logPaywallPlanSelectDeduped(exitTrialPlan);
                    logExitTrialOfferAccepted(revenueContext, exitTrialPlan);
                    void handlePurchase(exitTrialPlan);
                  }}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    style={{ color: '#1F1A08', fontSize: f.bodyLg, fontWeight: '900', textAlign: 'center' }}
                  >
                    {LP('Начать бесплатно', 'Почати безкоштовно', 'Empezar gratis', {
                      'pt-BR': 'Começar grátis',
                      vi: 'Bắt đầu miễn phí',
                      id: 'Mulai gratis',
                      tr: 'Ücretsiz başla',
                      pl: 'Zacznij za darmo',
                    })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.78}
                  style={{
                    minHeight: 48,
                    paddingVertical: 13,
                    paddingHorizontal: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 8,
                    borderRadius: 14,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                  }}
                  onPress={() => {
                    hapticTap();
                    setExitTrialOfferVisible(false);
                    closePaywallAfterDecline('continue_free');
                  }}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}
                  >
                    {LP('Остаться на бесплатной версии', 'Залишитися на безкоштовній версії', 'Seguir gratis', {
                      'pt-BR': 'Continuar grátis',
                      vi: 'Tiếp tục miễn phí',
                      id: 'Tetap gratis',
                      tr: 'Ücretsiz devam et',
                      pl: 'Zostań przy wersji darmowej',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          {false && (
          <Modal
            visible={false}
            transparent
            animationType="fade"
            onRequestClose={() => setExitTrialOfferVisible(false)}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', justifyContent: 'flex-end' }}>
              <View
                style={{
                  backgroundColor: paywallCardBg,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  padding: 22,
                  paddingBottom: 24 + insets.bottom,
                  borderTopWidth: 1,
                  borderColor: '#FFD70055',
                }}
              >
                <View style={{ alignItems: 'center', marginBottom: 14 }}>
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFD7001F',
                      borderWidth: 1,
                      borderColor: '#FFD70066',
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons name="sparkles" size={25} color="#FFD700" />
                  </View>
                  <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', textAlign: 'center' }}>
                    {LP('Попробовать 3 дня бесплатно?', 'Спробувати 3 дні безкоштовно?', 'Probar 3 días gratis?', {
                      'pt-BR': 'Experimentar 3 dias grátis?',
                      vi: 'Dùng thử miễn phí 3 ngày?',
                      id: 'Coba gratis 3 hari?',
                      tr: '3 gün ücretsiz denemek ister misin?',
                      pl: 'Wypróbować 3 dni za darmo?',
                    })}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.body, lineHeight: 22, marginTop: 10, textAlign: 'center' }}>
                    {LP(
                      'Магазин показывает trial для этого плана. Оплата начнется только после пробного периода, если не отменить подписку.',
                      'Магазин показує trial для цього плану. Оплата почнеться лише після пробного періоду, якщо не скасувати підписку.',
                      'La tienda ofrece prueba para este plan. El pago empieza solo después del periodo de prueba si no cancelas.',
                      {
                        'pt-BR': 'A loja oferece teste para este plano. A cobrança começa só depois do período de teste, se você não cancelar.',
                        vi: 'Cửa hàng đang hiển thị bản dùng thử cho gói này. Thanh toán chỉ bắt đầu sau thời gian dùng thử nếu bạn không hủy.',
                        id: 'Toko menawarkan uji coba untuk paket ini. Pembayaran dimulai setelah masa uji coba jika kamu tidak membatalkan.',
                        tr: 'Mağaza bu plan için deneme sunuyor. İptal etmezsen ödeme yalnızca deneme süresinden sonra başlar.',
                        pl: 'Sklep oferuje okres próbny dla tego planu. Opłata zacznie się dopiero po okresie próbnym, jeśli nie anulujesz.',
                      },
                    )}
                  </Text>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#FFD700',
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: 'center',
                    marginTop: 8,
                  }}
                  activeOpacity={0.86}
                  disabled={purchasing}
                  onPress={() => {
                    hapticTap();
                    setExitTrialOfferVisible(false);
                    setSelected(exitTrialPlan);
                    logPaywallPlanSelectDeduped(exitTrialPlan);
                    logExitTrialOfferAccepted(revenueContext, exitTrialPlan);
                    void handlePurchase(exitTrialPlan);
                  }}
                >
                  <Text style={{ color: '#1F1A08', fontSize: f.bodyLg, fontWeight: '900' }}>
                    {LP('Начать 3 дня бесплатно', 'Почати 3 дні безкоштовно', 'Empezar 3 días gratis', {
                      'pt-BR': 'Começar 3 dias grátis',
                      vi: 'Bắt đầu 3 ngày miễn phí',
                      id: 'Mulai 3 hari gratis',
                      tr: '3 gün ücretsiz başla',
                      pl: 'Zacznij 3 dni za darmo',
                    })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ paddingVertical: 14, alignItems: 'center', marginTop: 4 }}
                  onPress={() => {
                    hapticTap();
                    setExitTrialOfferVisible(false);
                    closePaywallAfterDecline('continue_free');
                  }}
                >
                  <Text style={{ color: t.textGhost, fontSize: f.body, textDecorationLine: 'underline' }}>
                    {LP('Нет, продолжить бесплатно', 'Ні, продовжити безкоштовно', 'No, continuar gratis', {
                      'pt-BR': 'Não, continuar grátis',
                      vi: 'Không, tiếp tục miễn phí',
                      id: 'Tidak, lanjut gratis',
                      tr: 'Hayır, ücretsiz devam et',
                      pl: 'Nie, kontynuuj za darmo',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          )}
          <Animated.View style={{
            flex: 1,
            opacity: entranceOpacity,
            transform: [
              { translateY: entranceTranslateY },
              { scale: entranceScale },
            ],
          }}>
          <ScrollView
            decelerationRate="normal"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 48, paddingBottom: 36 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Крестик */}
            <TouchableOpacity
              style={{ alignSelf: 'flex-end', padding: 8, marginBottom: 8 }}
              onPress={() => {
                hapticTap();
                requestPaywallClose('close');
              }}
            >
              <Ionicons name="close" size={24} color={t.textMuted} />
            </TouchableOpacity>

            {/* TRIAL RIBBON: показываем только когда хотя бы один план реально отдаёт intro phase
                и пользователь не в локальном 90-дневном кулдауне. Цена остаётся видна ниже в карточках —
                это требование App Store 3.1.2 / Google Play subscriptions policy.
                forceTrialUI — admin QA bypass, чтобы тестировать UI в Expo Go/dev без реального RC. */}
            {primaryHasTrialOffer && (
              <View
                style={{
                  marginBottom: 18,
                  borderRadius: 18,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  backgroundColor: '#1a1208',
                  borderWidth: 1.5,
                  borderColor: '#FFD700',
                  overflow: 'hidden',
                  alignItems: 'center',
                }}
              >
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: -40,
                    left: -20,
                    right: -20,
                    height: 120,
                    backgroundColor: '#FFD700',
                    opacity: badgeSparkle.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.18] }),
                  }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' }}>
                  <Text style={{ fontSize: 20, marginRight: 8 }}>🎁</Text>
                  <Text
                    style={{ flex: 1, color: '#FFD700', fontSize: f.bodyLg, fontWeight: '900', textAlign: 'center', marginRight: 28 }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {LP('Попробуй Premium 3 дня бесплатно', 'Спробуй Premium 3 дні безкоштовно', 'Prueba Premium 3 días gratis', {
                      'pt-BR': 'Experimente Premium 3 dias grátis',
                      vi: 'Dùng thử Premium miễn phí 3 ngày',
                      id: 'Coba Premium gratis 3 hari',
                      tr: 'Premiumu 3 gün ücretsiz dene',
                      pl: 'Wypróbuj Premium 3 dni za darmo',
                    })}
                  </Text>
                </View>
                <Text
                  style={{ color: '#FFE07A', fontSize: f.caption, fontWeight: '600', marginTop: 4, textAlign: 'center' }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {LP('Без списания сейчас • Отмена в любой момент', 'Без списання зараз • Скасування в будь-який час', 'Sin cargo ahora • Cancela cuando quieras', {
                    'pt-BR': 'Sem cobrança agora • Cancele quando quiser',
                    vi: 'Không bị tính phí ngay • Hủy bất cứ lúc nào',
                    id: 'Tanpa biaya sekarang • Batalkan kapan saja',
                    tr: 'Şimdi ücret alınmaz • İstediğin zaman iptal et',
                    pl: 'Bez opłaty teraz • Anuluj w dowolnym momencie',
                  })}
                </Text>
              </View>
            )}

            {/* БЛОК 0: Персонализированные теги — «зеркало опыта» юзера */}
            {personalizedTags.length > 0 && (
              <View style={{ marginBottom: 16, gap: 8 }}>
                <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>
                  {LP('Почему Premium тебе нужен', 'Чому Premium тобі потрібен', 'Por qué necesitas Premium', {
                    'pt-BR': 'Por que você precisa do Premium',
                    vi: 'Vì sao bạn cần Premium',
                    id: 'Kenapa kamu butuh Premium',
                    tr: 'Premium neden işine yarar',
                    pl: 'Dlaczego potrzebujesz Premium',
                  })}
                </Text>
                {personalizedTags.map((tag) => (
                  <View
                    key={tag.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: paywallCardBg,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: t.border,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                    }}
                  >
                    {isEnergyGlyph(tag.emoji)
                      ? renderPremiumEnergyGlyph(28, 30)
                      : <Text style={{ fontSize: 22, width: 30, textAlign: 'center' }}>{tag.emoji}</Text>}
                    <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontWeight: '600', lineHeight: f.body * 1.45 }}>
                      {LP(tag.ru, tag.uk, tag.es, tag)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* БЛОК 1: Герой */}
            <Animated.View style={{ width: '100%', alignSelf: 'stretch', alignItems: 'center', marginBottom: 24, transform: [{ translateY: heroFloat }] }}>
              <View
                style={{ width: '100%', alignSelf: 'stretch', borderRadius: isCompassPaywall ? 10 : 22, backgroundColor: paywallCardBg, borderWidth: 1, borderColor: isCompassPaywall ? 'rgba(255,231,182,0.16)' : heroArt.accent + '66', paddingVertical: 20, paddingHorizontal: 16, alignItems: 'center', overflow: 'hidden' }}
              >
                <Image
                  source={heroBackdrop}
                  contentFit="cover"
                  style={StyleSheet.absoluteFillObject}
                  accessible={false}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={heroScrim as any}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    width: 180,
                    height: 180,
                    borderRadius: 90,
                    backgroundColor: heroArt.accent,
                    opacity: heroGlow,
                    top: -60,
                    left: '50%',
                    transform: [{ translateX: -90 }],
                  }}
                />
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    width: 240,
                    height: 120,
                    borderRadius: 120,
                    backgroundColor: heroArt.accent2,
                    opacity: heroGlow.interpolate({ inputRange: [0.35, 0.62], outputRange: [0.08, 0.16] }),
                    bottom: -70,
                    left: '50%',
                    transform: [{ translateX: -120 }],
                  }}
                />
                <View style={{ backgroundColor: isCompassPaywall ? COMPASS_RICH.charcoalRaised : paywallSurfaceBg, borderRadius: isCompassPaywall ? 9 : 24, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 12, borderWidth: 1, borderColor: isCompassPaywall ? COMPASS_RICH.hairlineQuiet : heroArt.accent + '33' }}>
                  {shouldUseShardHeroIcon(ctx)
                    ? renderPremiumShardGlyph(56, 56, heroArt.shardAmount)
                    : isEnergyGlyph(hero.emoji)
                    ? renderPremiumEnergyGlyph(54)
                    : <Text style={{ fontSize: 44 }}>{hero.emoji}</Text>}
                </View>
                <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '800', textAlign: 'center', marginBottom: 8 }} adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={2}>
                  {LP(hero.titleRu, hero.titleUk, hero.titleEs, heroPlanned.title)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                  <Text style={{ color: '#FFD700', fontSize: f.body, letterSpacing: 1 }}>★★★★★</Text>
                  <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
                    {LP('4.8 · 10 000+ оценок', '4.8 · 10 000+ оцінок', '4.8 · 10 000+ valoraciones', {
                      'pt-BR': '4.8 · 10 000+ avaliações',
                      vi: '4.8 · 10 000+ đánh giá',
                      id: '4.8 · 10 000+ ulasan',
                      tr: '4.8 · 10 000+ değerlendirme',
                      pl: '4.8 · 10 000+ ocen',
                    })}
                  </Text>
                </View>
                <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: f.body * 1.55 }}>
                  {LP(hero.subtitleRu, hero.subtitleUk, hero.subtitleEs, heroPlanned.subtitle)}
                </Text>
              </View>
            </Animated.View>

            {/* План #2: urgency-полоса — только при активном реальном окне цены */}
            {urgencyActive && urgency && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.correct + '1A', borderColor: t.correct + '55', borderWidth: 1, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 14 }}>
                <Ionicons name="time-outline" size={16} color={t.correct} />
                <Text style={{ color: t.correct, fontSize: f.label, fontWeight: '700' }} numberOfLines={1}>
                  {LP(
                    `Твоя цена закреплена — ещё ${urgency.remainingFormatted}`,
                    `Твоя ціна закріплена — ще ${urgency.remainingFormatted}`,
                    `Tu precio está fijado — quedan ${urgency.remainingFormatted}`,
                    {
                      'pt-BR': `Seu preço está fixado — ainda ${urgency.remainingFormatted}`,
                      vi: `Giá của bạn đã được giữ — còn ${urgency.remainingFormatted}`,
                      id: `Hargamu terkunci — sisa ${urgency.remainingFormatted}`,
                      tr: `Fiyatın sabitlendi — kalan ${urgency.remainingFormatted}`,
                      pl: `Twoja cena jest zablokowana — jeszcze ${urgency.remainingFormatted}`,
                    },
                  )}
                </Text>
              </View>
            )}

            {/* План #6: реальные отзывы учеников (social proof) */}
            {testimonials.length > 0 && (
              <View style={{ marginBottom: 16, gap: 8 }}>
                <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {LP('Что говорят ученики', 'Що кажуть учні', 'Lo que dicen los alumnos', {
                    'pt-BR': 'O que dizem os alunos',
                    vi: 'Học viên nói gì',
                    id: 'Kata para pelajar',
                    tr: 'Öğrenciler ne diyor',
                    pl: 'Co mówią uczniowie',
                  })}
                </Text>
                {testimonials.map((tm, i) => (
                  <View key={i} style={{ backgroundColor: isCompassPaywall ? COMPASS_RICH.charcoalRaised : paywallCardBg, borderRadius: isCompassPaywall ? 9 : 14, borderWidth: 1, borderColor: isCompassPaywall ? 'rgba(255,231,182,0.16)' : t.textSecond + '40', padding: 12 }}>
                    <Text style={{ color: '#FFD700', fontSize: f.caption, letterSpacing: 1, marginBottom: 4 }}>★★★★★</Text>
                    <Text style={{ color: t.textPrimary, fontSize: f.sub, lineHeight: f.sub * 1.4 }}>{tm.text}</Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 4 }}>— {tm.author}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* БЛОК 2: Что ты получишь */}
            <View style={{ marginBottom: 18, gap: 8 }}>
              <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {LP('Что ты получишь', 'Що ти отримаєш', 'Lo que obtienes', {
                  'pt-BR': 'O que você recebe',
                  vi: 'Bạn sẽ nhận được gì',
                  id: 'Yang kamu dapatkan',
                  tr: 'Neler alırsın',
                  pl: 'Co otrzymasz',
                })}
              </Text>
              {benefits.map((b, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: isCompassPaywall ? COMPASS_RICH.charcoalRaised : paywallCardBg,
                    borderRadius: compassSmallRadius,
                    borderWidth: 1,
                    borderColor: i === 0 ? (isCompassPaywall ? COMPASS_RICH.hairlineStrong : t.correct + '66') : t.border,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    shadowColor: isCompassPaywall ? 'transparent' : i === 0 ? t.correct : '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isCompassPaywall ? 0 : i === 0 ? 0.22 : 0.1,
                    shadowRadius: isCompassPaywall ? 0 : 6,
                    elevation: isCompassPaywall ? 0 : i === 0 ? 4 : 1,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={18} color={t.correct} />
                  <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '600', flex: 1 }}>
                    {LP(b.ru, b.uk, b.es, getContextBenefitPlanned(ctx, i))}
                  </Text>
                </View>
              ))}
            </View>

            {/* БЛОК 3: Персональная ценность */}
            <View style={{ marginBottom: 16, backgroundColor: isCompassPaywall ? COMPASS_RICH.charcoalRaised : paywallCardBg, borderRadius: isCompassPaywall ? 9 : 14, borderWidth: 1, borderColor: isCompassPaywall ? 'rgba(255,231,182,0.16)' : t.textSecond + '55', padding: 14, overflow: 'hidden' }}>
              <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                {LP('Для тебя сейчас', 'Для тебе зараз', 'Para ti ahora', {
                  'pt-BR': 'Para você agora',
                  vi: 'Dành cho bạn lúc này',
                  id: 'Untukmu sekarang',
                  tr: 'Şu anda senin için',
                  pl: 'Dla ciebie teraz',
                })}
              </Text>
              <Text style={{ color: t.textPrimary, fontSize: f.sub, lineHeight: f.sub * 1.45 }}>
                {personalValueLine}
              </Text>
              {/* План #4: социальное сравнение (гордость, не угроза) — только при хорошем перцентиле */}
              {percentileLine && (
                <Text style={{ color: t.textSecond, fontSize: f.label, lineHeight: f.label * 1.4, marginTop: 8 }}>
                  {percentileLine}
                </Text>
              )}
            </View>

            {/* План #5: зеркало прогресса «Уже твоё» — endowment перед стеной */}
            {progressMirror && (
              <View style={{ marginBottom: 16, backgroundColor: isCompassPaywall ? COMPASS_RICH.charcoalRaised : paywallCardBg, borderRadius: isCompassPaywall ? 9 : 14, borderWidth: 1, borderColor: isCompassPaywall ? 'rgba(255,231,182,0.16)' : t.textSecond + '55', padding: 14, overflow: 'hidden' }}>
                <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  {LP('Уже твоё', 'Вже твоє', 'Ya es tuyo', {
                    'pt-BR': 'Já é seu',
                    vi: 'Đã là của bạn',
                    id: 'Sudah jadi milikmu',
                    tr: 'Artık senin',
                    pl: 'Już twoje',
                  })}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {progressMirror.phrases > 0 && (
                    <ProgressMirrorStat value={progressMirror.phrases} label={LP('фраз', 'фраз', 'frases', { 'pt-BR': 'frases', vi: 'cụm từ', id: 'frasa', tr: 'ifade', pl: 'fraz' })} t={t} f={f} accent={paywallComparisonPremiumColor} />
                  )}
                  {progressMirror.words > 0 && (
                    <ProgressMirrorStat value={progressMirror.words} label={LP('слов', 'слів', 'palabras', { 'pt-BR': 'palavras', vi: 'từ', id: 'kata', tr: 'kelime', pl: 'słów' })} t={t} f={f} accent={paywallComparisonPremiumColor} />
                  )}
                  {progressMirror.xp > 0 && (
                    <ProgressMirrorStat value={progressMirror.xp} label="XP" t={t} f={f} accent={paywallComparisonPremiumColor} />
                  )}
                  {progressMirror.streak > 0 && (
                    <ProgressMirrorStat value={progressMirror.streak} label={LP('дн. серия', 'дн. серія', 'días racha', { 'pt-BR': 'dias seq.', vi: 'ngày chuỗi', id: 'hari', tr: 'gün seri', pl: 'dni serii' })} t={t} f={f} accent={paywallComparisonPremiumColor} />
                  )}
                </View>
                <Text style={{ color: t.textPrimary, fontSize: f.sub, lineHeight: f.sub * 1.45, marginTop: 10 }}>
                  {LP('Premium держит этот темп.', 'Premium тримає цей темп.', 'Premium mantiene este ritmo.', {
                    'pt-BR': 'O Premium mantém esse ritmo.',
                    vi: 'Premium giữ nhịp độ này.',
                    id: 'Premium menjaga ritme ini.',
                    tr: 'Premium bu tempoyu korur.',
                    pl: 'Premium utrzymuje to tempo.',
                  })}
                </Text>
              </View>
            )}

            {/* План #2: «Сейчас в бесплатном режиме» — нейтральная констатация (Стиль 4 Эксперт), */}
            {/* НЕ запугивание. Только для intro_ended (юзер только что вышел из полного доступа). */}
            {ctx === 'intro_ended' && (
              <View style={{ marginBottom: 16, backgroundColor: isCompassPaywall ? COMPASS_RICH.charcoalRaised : paywallCardBg, borderRadius: isCompassPaywall ? 9 : 14, borderWidth: 1, borderColor: isCompassPaywall ? 'rgba(255,231,182,0.16)' : t.textSecond + '40', padding: 14 }}>
                <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  {LP('В бесплатном режиме', 'У безкоштовному режимі', 'En modo gratuito', {
                    'pt-BR': 'No modo gratuito',
                    vi: 'Ở chế độ miễn phí',
                    id: 'Di mode gratis',
                    tr: 'Ücretsiz modda',
                    pl: 'W trybie darmowym',
                  })}
                </Text>
                {[
                  LP('Уроки — 2 в день', 'Уроки — 2 на день', 'Lecciones — 2 al día', { 'pt-BR': 'Lições — 2 por dia', vi: 'Bài học — 2 mỗi ngày', id: 'Pelajaran — 2 per hari', tr: 'Dersler — günde 2', pl: 'Lekcje — 2 dziennie' }),
                  LP('Энергия — восстанавливается по одной', 'Енергія — відновлюється по одній', 'Energía — se recupera de a una', { 'pt-BR': 'Energia — recupera aos poucos', vi: 'Năng lượng — hồi từng điểm', id: 'Energi — pulih satu per satu', tr: 'Enerji — teker teker dolar', pl: 'Energia — wraca po jednej' }),
                  LP('Личный план — на паузе', 'Особистий план — на паузі', 'Plan personal — en pausa', { 'pt-BR': 'Plano pessoal — em pausa', vi: 'Kế hoạch cá nhân — tạm dừng', id: 'Rencana pribadi — dijeda', tr: 'Kişisel plan — duraklatıldı', pl: 'Plan osobisty — wstrzymany' }),
                ].map((line, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: i === 0 ? 0 : 6 }}>
                    <Ionicons name="ellipse" size={5} color={t.textMuted} />
                    <Text style={{ color: t.textPrimary, fontSize: f.sub, flex: 1 }}>{line}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Сравнение free → Premium */}
            <View
              style={{
                marginBottom: 18,
                backgroundColor: isCompassPaywall ? COMPASS_RICH.charcoalSoft : paywallSurfaceBg,
                borderRadius: isCompassPaywall ? 10 : 16,
                borderWidth: 1,
                borderColor: t.textSecond + '2a',
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Text
                style={{
                  color: t.textPrimary,
                  fontSize: 12,
                  fontWeight: '800',
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                {LP('Что меняется с Premium', 'Що змінюється з Premium', 'Qué cambia con Premium', {
                  'pt-BR': 'O que muda com o Premium',
                  vi: 'Premium thay đổi điều gì',
                  id: 'Apa yang berubah dengan Premium',
                  tr: 'Premium ile ne değişir',
                  pl: 'Co zmienia Premium',
                })}
              </Text>
              {PAYWALL_COMPARISON_ROWS.map((row, idx, arr) => {
                const freeL = LP(row.freeRu, row.freeUk, row.freeEs, row.freePlanned);
                const title = LP(row.titleRu, row.titleUk, row.titleEs, row.titlePlanned);
                const prem1 = LP(row.premRu, row.premUk, row.premEs, row.premPlanned);
                const hasPrem2 = row.premRu2 != null && row.premUk2 != null && row.premEs2 != null;
                const prem2 = hasPrem2 && row.premPlanned2 ? LP(row.premRu2!, row.premUk2!, row.premEs2!, row.premPlanned2) : '';
                const premTextStyle = {
                  color: paywallComparisonPremiumColor,
                  fontSize: 10,
                  lineHeight: 13,
                  fontWeight: '800' as const,
                  textAlign: 'right' as const,
                };
                return (
                  <View
                    key={row.titleRu}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 8,
                      borderBottomWidth: idx < arr.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: t.border,
                    }}
                  >
                    {isEnergyGlyph(row.emoji)
                      ? renderPremiumEnergyGlyph(22, 28)
                      : <Text style={{ width: 28, fontSize: 17, textAlign: 'center' }}>{row.emoji}</Text>}
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                      <Text numberOfLines={1} style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>{title}</Text>
                      <Text numberOfLines={2} style={{ color: t.textGhost, fontSize: 10, lineHeight: 13, marginTop: 2 }}>{freeL}</Text>
                    </View>
                    <View style={{ paddingHorizontal: 4, justifyContent: 'center' }}>
                      <Ionicons name="arrow-forward" size={13} color={t.textMuted} />
                    </View>
                    <View
                      style={{
                        flexGrow: 0,
                        flexShrink: 0,
                        width: '32%',
                        maxWidth: 136,
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={premTextStyle}>{prem1}</Text>
                      {hasPrem2 ? (
                        <Text style={[premTextStyle, { marginTop: 1 }]}>{prem2}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}

              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginVertical: 8 }} />

              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 }}>
                <Ionicons name="snow-outline" size={20} color="#64B4FF" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>{LP('Заморозка цепочки', 'Заморозка стріку', 'Protección de racha', {
                    'pt-BR': 'Proteção de sequência',
                    vi: 'Bảo vệ chuỗi ngày',
                    id: 'Perlindungan streak',
                    tr: 'Seri koruması',
                    pl: 'Ochrona serii',
                  })}</Text>
                  <Text style={{ color: t.textGhost, fontSize: 10, lineHeight: 13, marginTop: 1 }} numberOfLines={2}>
                    {LP('Серия не сгорит при пропуске дня', 'Захисти серію — навіть якщо пропустив день', 'Protege tu racha aunque te saltes un día', {
                      'pt-BR': 'Protege sua sequência se você pular um dia',
                      vi: 'Giữ chuỗi ngay cả khi bỏ lỡ một ngày',
                      id: 'Lindungi streak meski melewatkan satu hari',
                      tr: 'Bir günü kaçırsan da serini korur',
                      pl: 'Chroni serię, nawet gdy opuścisz dzień',
                    })}
                  </Text>
                </View>
                <View style={{ borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: t.correct + '20', borderWidth: 1, borderColor: t.correct + '45' }}>
                  <Text style={{ color: t.correct, fontSize: 9, fontWeight: '800' }}>PREMIUM</Text>
                </View>
              </View>
            </View>

            {/* БЛОК 3: Планы */}

            {/* Годовой */}
            <TouchableOpacity
              style={{
                borderRadius: compassRadius, padding: 18, marginBottom: 10,
                borderWidth: 1,
                borderColor: isCompassPaywall ? (selected === 'yearly' ? 'rgba(255,231,182,0.46)' : 'rgba(255,255,255,0.08)') : selected === 'yearly' ? t.textSecond : t.border,
                backgroundColor: isCompassPaywall ? (selected === 'yearly' ? COMPASS_RICH.creamSoft : '#74726E') : (selected === 'yearly' ? paywallSurfaceBg : paywallCardBg),
                opacity: purchasing && selected !== 'yearly' ? 0.5 : 1,
                shadowColor: isCompassPaywall ? 'transparent' : selected === 'yearly' ? t.textSecond : '#000',
                shadowOffset: { width: 0, height: isCompassPaywall ? 0 : 4 },
                shadowOpacity: isCompassPaywall ? 0 : selected === 'yearly' ? 0.32 : 0.08,
                shadowRadius: isCompassPaywall ? 0 : selected === 'yearly' ? 10 : 4,
                elevation: isCompassPaywall ? 0 : selected === 'yearly' ? 8 : 1,
              }}
              onPress={() => {
                hapticTap();
                logPaywallPlanSelectDeduped('yearly');
                setSelected('yearly');
              }}
              activeOpacity={0.85}
              disabled={purchasing}
            >
              {(() => {
                const priceStr = yearlyPrice;
                const trialReady = primaryYearlyHasTrial && !!priceStr;
                const periodLabel = LP('/ год', '/ рік', '/ año', {
                  'pt-BR': '/ ano',
                  vi: '/ năm',
                  id: '/ tahun',
                  tr: '/ yıl',
                  pl: '/ rok',
                });
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <Text style={{ color: isCompassPaywall && selected === 'yearly' ? COMPASS_RICH.textDark : t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }} numberOfLines={1}>
                          {LP('Годовая подписка', 'Річна підписка', 'Suscripción anual', {
                            'pt-BR': 'Assinatura anual',
                            vi: 'Gói đăng ký hằng năm',
                            id: 'Langganan tahunan',
                            tr: 'Yıllık abonelik',
                            pl: 'Subskrypcja roczna',
                          })}
                        </Text>
                        {savingsPct !== null && (
                          <View style={{ backgroundColor: t.correct + '22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: t.correct + '55' }}>
                            <Text style={{ color: t.correct, fontSize: f.label, fontWeight: '800' }}>{`−${savingsPct}%`}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: isCompassPaywall && selected === 'yearly' ? 'rgba(33,23,14,0.72)' : t.textMuted, fontSize: f.caption, marginTop: 3 }} numberOfLines={3}>
                        {LP(
                          'Годовой доступ ко всем возможностям Premium',
                          'Річний доступ до всіх можливостей Premium',
                          'Acceso anual a todas las funciones Premium',
                          {
                            'pt-BR': 'Acesso anual a todos os recursos Premium',
                            vi: 'Truy cập hằng năm vào tất cả tính năng Premium',
                            id: 'Akses tahunan ke semua fitur Premium',
                            tr: 'Tüm Premium özelliklere yıllık erişim',
                            pl: 'Roczny dostęp do wszystkich funkcji Premium',
                          },
                        )}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', maxWidth: '44%', minWidth: 92 }}>
                      {trialReady ? (
                        <>
                          {/* Главный якорь — триал. Цена ниже мелким, но ЧИТАЕМЫМ цветом —
                              compliance с App Store 3.1.2 / Google Play (price must be clearly disclosed). */}
                          <Text style={{ color: t.correct, fontSize: f.numMd, fontWeight: '900', textAlign: 'right' }} adjustsFontSizeToFit numberOfLines={1}>
                            {LP('Бесплатно', 'Безкоштовно', 'Gratis', {
                              'pt-BR': 'Grátis',
                              vi: 'Miễn phí',
                              id: 'Gratis',
                              tr: 'Ücretsiz',
                              pl: 'Za darmo',
                            })}
                          </Text>
                           <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700', marginTop: 1, textAlign: 'right' }} numberOfLines={1}>
                            {LP('на 3 дня', 'на 3 дні', 'durante 3 días', {
                              'pt-BR': 'por 3 dias',
                              vi: 'trong 3 ngày',
                              id: 'selama 3 hari',
                              tr: '3 gün boyunca',
                              pl: 'przez 3 dni',
                            })}
                          </Text>
                          <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 5, textAlign: 'right' }} numberOfLines={2}>
                            {LP(`затем ${priceStr} ${periodLabel}`, `потім ${priceStr} ${periodLabel}`, `luego ${priceStr} ${periodLabel}`, {
                              'pt-BR': `depois ${priceStr} ${periodLabel}`,
                              vi: `sau đó ${priceStr} ${periodLabel}`,
                              id: `lalu ${priceStr} ${periodLabel}`,
                              tr: `sonra ${priceStr} ${periodLabel}`,
                              pl: `potem ${priceStr} ${periodLabel}`,
                            })}
                          </Text>
                          {!!monthlyEquivalentLabel && (
                            <>
                              <Text style={{ color: t.textSecond, fontSize: f.label, fontWeight: '800', marginTop: 4, textAlign: 'right' }} numberOfLines={1}>
                                {monthlyEquivalentLabel}
                              </Text>
                              <Text style={{ color: t.textGhost, fontSize: f.label, marginTop: 1, textAlign: 'right' }} numberOfLines={1}>
                                {yearlyBillingNote}
                              </Text>
                            </>
                          )}
                          {!!perDayLabel && (
                            <Text style={{ color: t.textGhost, fontSize: f.label, marginTop: 1, textAlign: 'right' }} numberOfLines={1}>
                              {perDayLabel}
                            </Text>
                          )}
                        </>
                      ) : priceStr ? (
                        <>
                          {!!yearlyDoubledPrice && (
                            <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'right', textDecorationLine: 'line-through' }} numberOfLines={1}>
                              {yearlyDoubledPrice}
                            </Text>
                          )}
                          <Text style={{ color: isCompassPaywall && selected === 'yearly' ? COMPASS_RICH.textDark : t.textPrimary, fontSize: f.numMd, fontWeight: '800', textAlign: 'right' }} adjustsFontSizeToFit numberOfLines={1}>
                            {priceStr}
                          </Text>
                          <Text style={{ color: isCompassPaywall && selected === 'yearly' ? 'rgba(33,23,14,0.72)' : t.textMuted, fontSize: f.caption, textAlign: 'right' }} numberOfLines={1}>
                            {periodLabel}
                          </Text>
                          {!!monthlyEquivalentLabel && (
                            <>
                              <Text style={{ color: t.textSecond, fontSize: f.label, fontWeight: '800', marginTop: 4, textAlign: 'right' }} numberOfLines={1}>
                                {monthlyEquivalentLabel}
                              </Text>
                              <Text style={{ color: t.textGhost, fontSize: f.label, marginTop: 1, textAlign: 'right' }} numberOfLines={1}>
                                {yearlyBillingNote}
                              </Text>
                            </>
                          )}
                          {!!perDayLabel && (
                            <Text style={{ color: t.textGhost, fontSize: f.label, marginTop: 1, textAlign: 'right' }} numberOfLines={1}>
                              {perDayLabel}
                            </Text>
                          )}
                        </>
                      ) : (
                        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', textAlign: 'right' }} numberOfLines={2}>
                          {missingStorePriceLabel}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })()}
              {selected === 'yearly' && (
                <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={16} color={isCompassPaywall ? COMPASS_RICH.textDark : t.correct} />
                  <Text style={{ flex: 1, minWidth: 0, color: isCompassPaywall ? COMPASS_RICH.textDark : t.correct, fontSize: f.caption, fontWeight: '700' }} numberOfLines={2}>
                    {LP('Выбран самый выгодный план', 'Обрано найвигідніший план', 'Plan más rentable seleccionado', {
                      'pt-BR': 'Plano mais vantajoso selecionado',
                      vi: 'Đã chọn gói lợi nhất',
                      id: 'Paket paling hemat dipilih',
                      tr: 'En avantajlı plan seçildi',
                      pl: 'Wybrano najkorzystniejszy plan',
                    })}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Месячный */}
            <TouchableOpacity
              style={{
                borderRadius: compassRadius, padding: 18, marginBottom: 20,
                borderWidth: 1,
                borderColor: isCompassPaywall ? (selected === 'monthly' ? 'rgba(255,231,182,0.46)' : 'rgba(255,255,255,0.08)') : selected === 'monthly' ? t.textSecond : t.border,
                backgroundColor: isCompassPaywall ? (selected === 'monthly' ? COMPASS_RICH.creamSoft : '#74726E') : (selected === 'monthly' ? paywallSurfaceBg : paywallCardBg),
                opacity: purchasing && selected !== 'monthly' ? 0.5 : 1,
                shadowColor: isCompassPaywall ? 'transparent' : selected === 'monthly' ? t.textSecond : '#000',
                shadowOffset: { width: 0, height: isCompassPaywall ? 0 : 4 },
                shadowOpacity: isCompassPaywall ? 0 : selected === 'monthly' ? 0.24 : 0.06,
                shadowRadius: isCompassPaywall ? 0 : selected === 'monthly' ? 8 : 4,
                elevation: isCompassPaywall ? 0 : selected === 'monthly' ? 6 : 1,
              }}
              onPress={() => {
                hapticTap();
                logPaywallPlanSelectDeduped('monthly');
                setSelected('monthly');
              }}
              activeOpacity={0.85}
              disabled={purchasing}
            >
              {(() => {
                const priceStr = monthlyPrice;
                const trialReady = primaryMonthlyHasTrial && !!priceStr;
                const periodLabel = LP('/ месяц', '/ місяць', '/mes', {
                  'pt-BR': '/mês',
                  vi: '/tháng',
                  id: '/bulan',
                  tr: '/ay',
                  pl: '/mies.',
                });
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
                      <Text style={{ color: isCompassPaywall && selected === 'monthly' ? COMPASS_RICH.textDark : t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }} numberOfLines={2}>
                        {LP('Ежемесячная подписка', 'Щомісячна підписка', 'Suscripción mensual', {
                          'pt-BR': 'Assinatura mensal',
                          vi: 'Gói đăng ký hằng tháng',
                          id: 'Langganan bulanan',
                          tr: 'Aylık abonelik',
                          pl: 'Subskrypcja miesięczna',
                        })}
                      </Text>
                      <Text style={{ color: isCompassPaywall && selected === 'monthly' ? 'rgba(33,23,14,0.72)' : t.textMuted, fontSize: f.sub, marginTop: 3 }} numberOfLines={3}>
                        {LP(
                          'Месячный доступ ко всем возможностям Premium',
                          'Місячний доступ до всіх можливостей Premium',
                          'Acceso mensual a todas las funciones Premium',
                          {
                            'pt-BR': 'Acesso mensal a todos os recursos Premium',
                            vi: 'Truy cập hằng tháng vào tất cả tính năng Premium',
                            id: 'Akses bulanan ke semua fitur Premium',
                            tr: 'Tüm Premium özelliklere aylık erişim',
                            pl: 'Miesięczny dostęp do wszystkich funkcji Premium',
                          },
                        )}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', maxWidth: '44%', minWidth: 92 }}>
                      {trialReady ? (
                        <>
                          <Text style={{ color: t.correct, fontSize: f.numMd, fontWeight: '900', textAlign: 'right' }} adjustsFontSizeToFit numberOfLines={1}>
                            {LP('Бесплатно', 'Безкоштовно', 'Gratis', {
                              'pt-BR': 'Grátis',
                              vi: 'Miễn phí',
                              id: 'Gratis',
                              tr: 'Ücretsiz',
                              pl: 'Za darmo',
                            })}
                          </Text>
                          <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700', marginTop: 1, textAlign: 'right' }} numberOfLines={1}>
                            {LP('на 3 дня', 'на 3 дні', 'durante 3 días', {
                              'pt-BR': 'por 3 dias',
                              vi: 'trong 3 ngày',
                              id: 'selama 3 hari',
                              tr: '3 gün boyunca',
                              pl: 'przez 3 dni',
                            })}
                          </Text>
                          <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 5, textAlign: 'right' }} numberOfLines={2}>
                            {LP(`затем ${priceStr} / месяц`, `потім ${priceStr} / місяць`, `luego ${priceStr} / mes`, {
                              'pt-BR': `depois ${priceStr} /mês`,
                              vi: `sau đó ${priceStr} /tháng`,
                              id: `lalu ${priceStr} /bulan`,
                              tr: `sonra ${priceStr} /ay`,
                              pl: `potem ${priceStr} /mies.`,
                            })}
                          </Text>
                        </>
                      ) : priceStr ? (
                        <>
                          <Text style={{ color: isCompassPaywall && selected === 'monthly' ? COMPASS_RICH.textDark : t.textPrimary, fontSize: f.numMd, fontWeight: '800', textAlign: 'right' }} adjustsFontSizeToFit numberOfLines={1}>
                            {priceStr}
                          </Text>
                          <Text style={{ color: isCompassPaywall && selected === 'monthly' ? 'rgba(33,23,14,0.72)' : t.textMuted, fontSize: f.caption, textAlign: 'right' }} numberOfLines={1}>{periodLabel}</Text>
                        </>
                      ) : (
                        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', textAlign: 'right' }} numberOfLines={2}>
                          {missingStorePriceLabel}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })()}
              {selected === 'monthly' && (
                <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={16} color={isCompassPaywall ? COMPASS_RICH.textDark : t.correct} />
                  <Text style={{ flex: 1, minWidth: 0, color: isCompassPaywall ? COMPASS_RICH.textDark : t.correct, fontSize: f.caption, fontWeight: '700' }} numberOfLines={2}>
                    {LP('Выбран гибкий ежемесячный план', 'Обрано гнучкий щомісячний план', 'Plan mensual flexible', {
                      'pt-BR': 'Plano mensal flexível selecionado',
                      vi: 'Đã chọn gói tháng linh hoạt',
                      id: 'Paket bulanan fleksibel dipilih',
                      tr: 'Esnek aylık plan seçildi',
                      pl: 'Wybrano elastyczny plan miesięczny',
                    })}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* CTA */}
            {(() => {
              const selectedPkg = selected === 'yearly' ? packages.yearly : packages.monthly;
              const ctaPrice = selected === 'yearly' ? yearlyPrice : monthlyPrice;
              const hasTrial = (selected === 'yearly' ? primaryYearlyHasTrial : primaryMonthlyHasTrial) && !!ctaPrice;
              const canPurchaseSelectedPlan = !storePricesRequired || (!!selectedPkg && !!ctaPrice);
              const periodStr = selected === 'yearly'
                ? LP('/год', '/рік', '/año', {
                    'pt-BR': '/ano',
                    vi: '/năm',
                    id: '/tahun',
                    tr: '/yıl',
                    pl: '/rok',
                  })
                : LP('/мес', '/міс', '/mes', {
                    'pt-BR': '/mês',
                    vi: '/tháng',
                    id: '/bulan',
                    tr: '/ay',
                    pl: '/mies.',
                  });
              const ctaLabel = !canPurchaseSelectedPlan
                ? loadingPackages
                  ? LP('Загружаем…', 'Завантажуємо…', 'Loading…', {
                      'pt-BR': 'Preço pendente',
                      vi: 'Sắp có giá',
                      id: 'Harga segera tersedia',
                      tr: 'Fiyat hazırlanıyor',
                      pl: 'Cena wkrótce',
                    })
                  : LP('Загрузить цену', 'Завантажити ціну', 'Cargar precio', {
                      'pt-BR': 'Carregar preço',
                      vi: 'Tải giá',
                      id: 'Muat harga',
                      tr: 'Fiyatı yükle',
                      pl: 'Załaduj cenę',
                    })
                : hasTrial
                  ? LP(
                      `🚀 3 дня бесплатно — затем ${ctaPrice}${periodStr}`,
                      `🚀 3 дні безкоштовно — потім ${ctaPrice}${periodStr}`,
                      `🚀 3 días gratis — luego ${ctaPrice}${periodStr}`,
                      {
                        'pt-BR': `🚀 3 dias grátis — depois ${ctaPrice}${periodStr}`,
                        vi: `🚀 3 ngày miễn phí — sau đó ${ctaPrice}${periodStr}`,
                        id: `🚀 3 hari gratis — lalu ${ctaPrice}${periodStr}`,
                        tr: `🚀 3 gün ücretsiz — sonra ${ctaPrice}${periodStr}`,
                        pl: `🚀 3 dni za darmo — potem ${ctaPrice}${periodStr}`,
                      },
                    )
                  : selected === 'yearly'
                    ? LP('🚀 Получить Premium', '🚀 Отримати Premium', '🚀 Obtener Premium', {
                        'pt-BR': '🚀 Obter Premium',
                        vi: '🚀 Nhận Premium',
                        id: '🚀 Dapatkan Premium',
                        tr: '🚀 Premium al',
                        pl: '🚀 Pobierz Premium',
                      })
                    : LP('🚀 Оформить месячную подписку', '🚀 Оформити місячну підписку', '🚀 Contratar suscripción mensual', {
                        'pt-BR': '🚀 Assinar mensalmente',
                        vi: '🚀 Đăng ký gói tháng',
                        id: '🚀 Ambil langganan bulanan',
                        tr: '🚀 Aylık abonelik başlat',
                        pl: '🚀 Wykup subskrypcję miesięczną',
                      });
              return (
                <Animated.View style={{ transform: [{ scale: purchasing ? 1 : ctaPulse }] }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: isCompassPaywall ? COMPASS_RICH.creamSoft : t.textSecond, borderRadius: isCompassPaywall ? 10 : 16, padding: 18,
                    alignItems: 'center', marginBottom: 10,
                    borderWidth: 0,
                    borderColor: 'transparent',
                    overflow: 'hidden',
                    opacity: purchasing || loadingPackages ? 0.7 : 1,
                    shadowColor: isCompassPaywall ? 'transparent' : t.textSecond,
                    shadowOffset: { width: 0, height: isCompassPaywall ? 0 : 4 },
                    shadowOpacity: isCompassPaywall ? 0 : 0.5,
                    shadowRadius: isCompassPaywall ? 0 : 12,
                    elevation: isCompassPaywall ? 0 : 8,
                  }}
                  onPress={() => {
                    hapticTap();
                    logPaywallPlanSelectDeduped(selected);
                    logPaywallCtaClick(revenueContext, selected);
                    if (!canPurchaseSelectedPlan) {
                      void loadPremiumPackages().then((nextPackages) => {
                        const nextPkg = selected === 'yearly' ? nextPackages.yearly : nextPackages.monthly;
                        if (!storePriceTrim(nextPkg?.product.priceString)) {
                          emitAppEvent('action_toast', {
                            type: 'error',
                            messageRu: 'Не удалось загрузить из магазина. Проверь интернет и попробуй ещё раз.',
                            messageUk: 'Ціна магазину не завантажилась. Перевірте інтернет і спробуйте ще раз.',
                            messageEs: 'El precio de la tienda no se cargó. Revisa internet e inténtalo de nuevo.',
                          });
                        }
                      });
                      return;
                    }
                    handlePurchase(selected);
                  }}
                  activeOpacity={0.85}
                  disabled={purchasing || loadingPackages}
                >
                  {purchasing
                    ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <ActivityIndicator size="small" color={isCompassPaywall ? COMPASS_RICH.textDark : t.correctText} />
                        <Text style={{ color: isCompassPaywall ? COMPASS_RICH.textDark : t.correctText, fontSize: f.h2, fontWeight: '800' }}>
                          {LP('Обрабатываем…', 'Обробляємо…', 'Procesando…', {
                            'pt-BR': 'Processando…',
                            vi: 'Đang xử lý…',
                            id: 'Memproses…',
                            tr: 'İşleniyor…',
                            pl: 'Przetwarzamy…',
                          })}
                        </Text>
                      </View>
                    : <Text style={{ color: isCompassPaywall ? COMPASS_RICH.textDark : t.correctText, fontSize: f.h2, fontWeight: '800' }} adjustsFontSizeToFit numberOfLines={1}>
                        {ctaLabel}
                      </Text>
                  }
                </TouchableOpacity>
                </Animated.View>
              );
            })()}

            {/* Мелкие хуки */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
              {primaryHasTrialOffer && (
                <Text style={{ color: t.textGhost, fontSize: f.label }}>
                  {LP('✓ Без списания сейчас', '✓ Без списання зараз', '✓ Sin cobro ahora', {
                    'pt-BR': '✓ Sem cobrança agora',
                    vi: '✓ Không bị tính phí ngay',
                    id: '✓ Tanpa biaya sekarang',
                    tr: '✓ Şimdi ücret alınmaz',
                    pl: '✓ Bez opłaty teraz',
                  })}
                </Text>
              )}
              <Text style={{ color: t.textGhost, fontSize: f.label }}>
                {LP('✓ Отмена в любой момент', '✓ Скасування в будь-який час', '✓ Cancela cuando quieras', {
                  'pt-BR': '✓ Cancele quando quiser',
                  vi: '✓ Hủy bất cứ lúc nào',
                  id: '✓ Batalkan kapan saja',
                  tr: '✓ İstediğin zaman iptal et',
                  pl: '✓ Anuluj w dowolnym momencie',
                })}
              </Text>
            </View>

            {/* Восстановить */}
            <TouchableOpacity
              style={{ paddingVertical: 10, alignItems: 'center' }}
              onPress={() => { hapticTap(); handleRestore(); }}
              disabled={restoring}
            >
              <Text style={{ color: restoring ? t.textGhost : t.textSecond, fontSize: f.body }}>
                {LP('Восстановить подписку', 'Відновити підписку', 'Restaurar suscripción', {
                  'pt-BR': 'Restaurar assinatura',
                  vi: 'Khôi phục gói đăng ký',
                  id: 'Pulihkan langganan',
                  tr: 'Aboneliği geri yükle',
                  pl: 'Przywróć subskrypcję',
                })}
              </Text>
            </TouchableOpacity>

            {/* Продолжить бесплатно */}
            <TouchableOpacity
              style={{ paddingVertical: 8, alignItems: 'center' }}
              onPress={() => {
                hapticTap();
                requestPaywallClose('continue_free');
              }}
            >
              <Text style={{ color: t.textGhost, fontSize: f.body, textDecorationLine: 'underline' }}>
                {LP('Продолжить бесплатно', 'Продовжити безкоштовно', 'Continuar gratis', {
                  'pt-BR': 'Continuar grátis',
                  vi: 'Tiếp tục miễn phí',
                  id: 'Lanjut gratis',
                  tr: 'Ücretsiz devam et',
                  pl: 'Kontynuuj za darmo',
                })}
              </Text>
            </TouchableOpacity>

            {(() => {
              const footerPrice = selected === 'yearly' ? yearlyPrice : monthlyPrice;
              if (!footerPrice) {
                return (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center', lineHeight: 18 }}>
                      {LP(
                        'Точная сумма появится перед покупкой.',
                        'Точна сума зʼявиться перед покупкою.',
                        'El precio de la tienda aparecerá antes de la compra.',
                        {
                          'pt-BR': 'O preço da loja aparecerá antes da compra.',
                          vi: 'Giá trong cửa hàng sẽ xuất hiện trước khi mua.',
                          id: 'Harga toko akan muncul sebelum pembelian.',
                          tr: 'Mağaza fiyatı satın alma öncesinde görünür.',
                          pl: 'Cena ze sklepu pojawi się przed zakupem.',
                        },
                      )}
                    </Text>
                  </View>
                );
              }
              const footerHasTrial = (selected === 'yearly' ? primaryYearlyHasTrial : primaryMonthlyHasTrial) && !!footerPrice;
              const footerPeriodUk =
                selected === 'yearly'
                  ? 'річну підписку PhraseMan Premium'
                  : 'місячну підписку PhraseMan Premium';
              const footerPeriodRu =
                selected === 'yearly'
                  ? 'годовую подписку PhraseMan Premium'
                  : 'месячную подписку PhraseMan Premium';
              const footerPeriodEs =
                selected === 'yearly'
                  ? 'suscripción anual PhraseMan Premium'
                  : 'suscripción mensual PhraseMan Premium';
              const footerPeriodPlanned: PremiumPlannedCopy = selected === 'yearly'
                ? {
                    'pt-BR': 'assinatura anual PhraseMan Premium',
                    vi: 'gói PhraseMan Premium hằng năm',
                    id: 'langganan tahunan PhraseMan Premium',
                    tr: 'yıllık PhraseMan Premium aboneliği',
                    pl: 'roczna subskrypcja PhraseMan Premium',
                  }
                : {
                    'pt-BR': 'assinatura mensal PhraseMan Premium',
                    vi: 'gói PhraseMan Premium hằng tháng',
                    id: 'langganan bulanan PhraseMan Premium',
                    tr: 'aylık PhraseMan Premium aboneliği',
                    pl: 'miesięczna subskrypcja PhraseMan Premium',
                  };
              const ios = effectiveOs === 'ios';

              const trialUk = ios
                ? `Якщо для цього плану доступні 3 дні без оплати: після закінчення пробного періоду з вашого Apple ID буде списано ${footerPrice} за обраний термін, якщо ви не скасуєте принаймні за 24 години до його закінчення (Налаштування → Apple ID → Підписки).`
                : `Якщо для цього плану доступні 3 дні без оплати: після закінчення пробного періоду з вашого облікового запису Google буде списано ${footerPrice} за обраний термін, якщо ви не скасуєте принаймні за 24 години до його закінчення (Google Play → Підписки).`;

              const trialRu = ios
                ? `Если для этого плана доступны 3 дня без оплаты: после окончания пробного периода с вашего Apple ID будет списана сумма ${footerPrice} за выбранный срок, если вы не отмените подписку как минимум за 24 часа до его окончания (Настройки → Apple ID → Подписки).`
                : `Если для этого плана доступны 3 дня без оплаты: после окончания пробного периода с вашего аккаунта Google будет списана сумма ${footerPrice} за выбранный срок, если вы не отмените подписку как минимум за 24 часа до его окончания (Google Play → Подписки).`;

              const trialEs = ios
                ? `Si este plan ofrece 3 días sin cargo: al terminar la prueba, tu Apple ID cargará ${footerPrice} por el período elegido si no cancelas al menos 24 horas antes (Ajustes → Apple ID → Suscripciones).`
                : `Si este plan ofrece 3 días sin cargo: al terminar la prueba, tu cuenta Google cargará ${footerPrice} por el período elegido si no cancelas al menos 24 horas antes (Google Play → Suscripciones).`;

              const legalRu = ios
                ? `Оформляется ${footerPeriodRu} с автопродлением. Списание с Apple ID по тарифам App Store для вашего региона: ${footerPrice}. Отменить можно в любой момент: Настройки → Apple ID → Подписки.`
                : `Оформляется ${footerPeriodRu} с автопродлением. Оплата через Google Play для вашего региона: ${footerPrice}. Отмена: Google Play → Подписки.`;
              const legalUk = ios
                ? `Оформлюється ${footerPeriodUk} із автоматичним поновленням. Оплата знімається з Apple ID за тарифами App Store для вашого регіону: ${footerPrice}. Скасувати можна в будь-який момент: Налаштування → Apple ID → Підписки.`
                : `Оформлюється ${footerPeriodUk} із автоматичним поновленням. Оплата через Google Play для вашого регіону: ${footerPrice}. Скасувати: Google Play → Підписки.`;
              const legalEs = ios
                ? `Contratas la ${footerPeriodEs} con renovación automática. El cobro se hace en tu Apple ID según los precios del App Store de tu zona: ${footerPrice}. Puedes cancelar cuando quieras: Ajustes → Apple ID → Suscripciones.`
                : `Contratas la ${footerPeriodEs} con renovación automática. Pago vía Google Play en tu zona: ${footerPrice}. Cancelación: Google Play → Suscripciones.`;
              const legalPlanned: PremiumPlannedCopy = {
                'pt-BR': ios
                  ? `Você assina a ${footerPeriodPlanned['pt-BR']} com renovação automática. A cobrança é feita no Apple ID conforme os preços da App Store da sua região: ${footerPrice}. Você pode cancelar quando quiser: Ajustes → Apple ID → Assinaturas.`
                  : `Você assina a ${footerPeriodPlanned['pt-BR']} com renovação automática. O pagamento é feito pelo Google Play na sua região: ${footerPrice}. Cancelamento: Google Play → Assinaturas.`,
                vi: ios
                  ? `Bạn đăng ký ${footerPeriodPlanned.vi} có tự động gia hạn. Apple ID sẽ tính phí theo giá App Store tại khu vực của bạn: ${footerPrice}. Bạn có thể hủy bất cứ lúc nào: Cài đặt → Apple ID → Đăng ký.`
                  : `Bạn đăng ký ${footerPeriodPlanned.vi} có tự động gia hạn. Thanh toán qua Google Play tại khu vực của bạn: ${footerPrice}. Hủy tại: Google Play → Gói đăng ký.`,
                id: ios
                  ? `Kamu berlangganan ${footerPeriodPlanned.id} dengan perpanjangan otomatis. Biaya ditagih ke Apple ID sesuai harga App Store di wilayahmu: ${footerPrice}. Kamu bisa membatalkan kapan saja: Pengaturan → Apple ID → Langganan.`
                  : `Kamu berlangganan ${footerPeriodPlanned.id} dengan perpanjangan otomatis. Pembayaran melalui Google Play di wilayahmu: ${footerPrice}. Pembatalan: Google Play → Langganan.`,
                tr: ios
                  ? `${footerPeriodPlanned.tr} otomatik yenilemeyle başlar. Ücret, bölgenizdeki App Store fiyatlarına göre Apple ID hesabından alınır: ${footerPrice}. İstediğiniz zaman iptal edebilirsiniz: Ayarlar → Apple ID → Abonelikler.`
                  : `${footerPeriodPlanned.tr} otomatik yenilemeyle başlar. Ödeme, bölgenizdeki Google Play üzerinden yapılır: ${footerPrice}. İptal: Google Play → Abonelikler.`,
                pl: ios
                  ? `Aktywujesz ${footerPeriodPlanned.pl} z automatycznym odnowieniem. Opłata zostanie pobrana z Apple ID według cen App Store w twoim regionie: ${footerPrice}. Możesz anulować w dowolnym momencie: Ustawienia → Apple ID → Subskrypcje.`
                  : `Aktywujesz ${footerPeriodPlanned.pl} z automatycznym odnowieniem. Płatność przez Google Play w twoim regionie: ${footerPrice}. Anulowanie: Google Play → Subskrypcje.`,
              };

              return (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center', lineHeight: 18 }}>
                    {LP(legalRu, legalUk, legalEs, legalPlanned)}
                  </Text>
                  {!!selectedMonthlyEquivalent && (
                    <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center', lineHeight: 17, marginTop: 8 }}>
                      {LP(
                        `Эквивалент ${selectedMonthlyEquivalent} / месяц указан только для сравнения; списание идет за год.`,
                        `Еквівалент ${selectedMonthlyEquivalent} / місяць наведено лише для порівняння; списання йде за рік.`,
                        `El equivalente de ${selectedMonthlyEquivalent} / mes es solo comparativo; el cobro es anual.`,
                        {
                          'pt-BR': `O equivalente de ${selectedMonthlyEquivalent} /mês é apenas comparativo; a cobrança é anual.`,
                          vi: `Mức tương đương ${selectedMonthlyEquivalent} /tháng chỉ để so sánh; phí được tính hằng năm.`,
                          id: `Setara ${selectedMonthlyEquivalent} /bulan hanya untuk perbandingan; tagihan tahunan.`,
                          tr: `${selectedMonthlyEquivalent} /ay eşdeğeri yalnızca karşılaştırma içindir; ödeme yıllıktır.`,
                          pl: `Ekwiwalent ${selectedMonthlyEquivalent} /mies. służy tylko do porównania; opłata jest roczna.`,
                        },
                      )}
                    </Text>
                  )}
                  {footerHasTrial ? (
                    <Text
                      style={{
                        color: t.textGhost,
                        fontSize: f.label,
                        textAlign: 'center',
                        lineHeight: 18,
                        marginTop: 10,
                    }}
                  >
                      {LP(trialRu, trialUk, trialEs, {
                        'pt-BR': ios
                          ? `Se este plano oferecer 3 dias grátis: ao fim do teste, seu Apple ID cobrará ${footerPrice} pelo período escolhido se você não cancelar pelo menos 24 horas antes (Ajustes → Apple ID → Assinaturas).`
                          : `Se este plano oferecer 3 dias grátis: ao fim do teste, sua conta Google cobrará ${footerPrice} pelo período escolhido se você não cancelar pelo menos 24 horas antes (Google Play → Assinaturas).`,
                        vi: ios
                          ? `Nếu gói này có 3 ngày miễn phí: sau khi hết dùng thử, Apple ID của bạn sẽ bị tính ${footerPrice} cho kỳ đã chọn nếu bạn không hủy trước ít nhất 24 giờ (Cài đặt → Apple ID → Đăng ký).`
                          : `Nếu gói này có 3 ngày miễn phí: sau khi hết dùng thử, tài khoản Google của bạn sẽ bị tính ${footerPrice} cho kỳ đã chọn nếu bạn không hủy trước ít nhất 24 giờ (Google Play → Gói đăng ký).`,
                        id: ios
                          ? `Jika paket ini menawarkan 3 hari gratis: setelah uji coba berakhir, Apple ID kamu akan dikenai ${footerPrice} untuk periode yang dipilih jika tidak dibatalkan setidaknya 24 jam sebelumnya (Pengaturan → Apple ID → Langganan).`
                          : `Jika paket ini menawarkan 3 hari gratis: setelah uji coba berakhir, akun Google kamu akan dikenai ${footerPrice} untuk periode yang dipilih jika tidak dibatalkan setidaknya 24 jam sebelumnya (Google Play → Langganan).`,
                        tr: ios
                          ? `Bu plan 3 gün ücretsiz deneme sunuyorsa: deneme bitince en az 24 saat önce iptal etmezsen seçilen dönem için Apple ID hesabından ${footerPrice} alınır (Ayarlar → Apple ID → Abonelikler).`
                          : `Bu plan 3 gün ücretsiz deneme sunuyorsa: deneme bitince en az 24 saat önce iptal etmezsen seçilen dönem için Google hesabından ${footerPrice} alınır (Google Play → Abonelikler).`,
                        pl: ios
                          ? `Jeśli ten plan oferuje 3 dni bez opłaty: po zakończeniu okresu próbnego Apple ID pobierze ${footerPrice} za wybrany okres, jeśli nie anulujesz co najmniej 24 godziny wcześniej (Ustawienia → Apple ID → Subskrypcje).`
                          : `Jeśli ten plan oferuje 3 dni bez opłaty: po zakończeniu okresu próbnego konto Google pobierze ${footerPrice} za wybrany okres, jeśli nie anulujesz co najmniej 24 godziny wcześniej (Google Play → Subskrypcje).`,
                      })}
                    </Text>
                  ) : null}
                  <Text
                    style={{
                      color: t.textGhost,
                      fontSize: f.label,
                      textAlign: 'center',
                      lineHeight: 17,
                      marginTop: footerHasTrial ? 10 : 8,
                    }}
                  >
                    {LP(
                      'Ссылки Privacy Policy и Terms of Use ниже дополняют условия покупки в магазине приложений.',
                      'Посилання Privacy Policy та Terms of Use нижче доповнюють умови покупки в магазині застосунків.',
                      'Privacy Policy y Terms of Use enlazan abajo y completan los términos de compra en la tienda de apps.',
                      {
                        'pt-BR': 'Os links Privacy Policy e Terms of Use abaixo complementam os termos de compra na loja de apps.',
                        vi: 'Các liên kết Privacy Policy và Terms of Use bên dưới bổ sung điều kiện mua trong cửa hàng ứng dụng.',
                        id: 'Tautan Privacy Policy dan Terms of Use di bawah melengkapi ketentuan pembelian di toko aplikasi.',
                        tr: 'Aşağıdaki Privacy Policy ve Terms of Use bağlantıları, uygulama mağazasındaki satın alma koşullarını tamamlar.',
                        pl: 'Linki Privacy Policy i Terms of Use poniżej uzupełniają warunki zakupu w sklepie z aplikacjami.',
                      },
                    )}
                  </Text>
                </View>
              );
            })()}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 14, marginBottom: 4 }}>
              <TouchableOpacity onPress={() => { hapticTap(); Linking.openURL(KNOWLY_LEGAL_PRIVACY_URL); }}>
                <Text style={{ color: t.textGhost, fontSize: f.label, textDecorationLine: 'underline' }}>
                  Privacy Policy
                </Text>
              </TouchableOpacity>
              <Text style={{ color: t.textGhost, fontSize: f.label }}>·</Text>
              <TouchableOpacity onPress={() => { hapticTap(); Linking.openURL(KNOWLY_LEGAL_TERMS_URL); }}>
                <Text style={{ color: t.textGhost, fontSize: f.label, textDecorationLine: 'underline' }}>
                  Terms of Use
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
              <ReportErrorButton
                screen="premium_modal"
                dataId="premium_offer"
                dataText={triLang(lang, {
                  ru: 'Экран Premium',
                  uk: 'Екран Premium',
                  es: 'Pantalla Premium',
                  'pt-BR': 'Tela Premium',
                  vi: 'Màn hình Premium',
                  id: 'Layar Premium',
                  tr: 'Premium ekranı',
                  pl: 'Ekran Premium',
                })}
              />
            </View>
          </ScrollView>
          </Animated.View>
        </ContentWrap>
      </SafeAreaView>
    </PremiumScreenShell>
  );
}
