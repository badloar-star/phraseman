import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  ScrollView, Animated, Linking, Modal, Easing, StyleSheet,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useEnergy } from '../components/EnergyContext';
import ContentWrap from '../components/ContentWrap';
import ReportErrorButton from '../components/ReportErrorButton';
import ScreenGradient from '../components/ScreenGradient';
import { DEV_IAP_BYPASS, IS_EXPO_GO, KNOWLY_LEGAL_PRIVACY_URL, KNOWLY_LEGAL_TERMS_URL } from './config';
import { initRevenueCat, resolvePremiumPackages } from './revenuecat_init';
import { getVerifiedPremiumStatus, invalidatePremiumCache } from './premium_guard';
import { useEffectivePlatformOS } from './platform_ui_preview';
import {
  getTrialReofferBlockedByCooldown,
  markSubscriptionOrTrialFlowConsumedNow,
} from './premium_trial_eligibility';
import { storeProductHasTrialIntro } from './premium_trial_signal';
import {
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
import { emitAppEvent } from './events';
import { markCelebrationPending } from './premium_celebration_state';
import { collectPaywallStats, pickPaywallTags, type PersonalizedTag } from './paywall_personalization';
import {
  shouldShowExitTrialOffer,
  shouldShowPrimaryTrialUi,
  type PaywallCloseReason,
  type PaywallViewMode,
} from './paywall_trial_offer';
import { hapticTap } from '../hooks/use-haptics';
import { MOTION_DURATION, MOTION_SPRING } from '../constants/motion';
import { triLang, type Lang } from '../constants/i18n';
import { getPremiumCourseLevel } from './lesson_lock_system';

/** Только непустая строка из стора — без выдуманных сумм. */
function storePriceTrim(raw: string | undefined | null): string {
  if (typeof raw !== 'string') return '';
  return raw.trim();
}

type Plan = 'monthly' | 'yearly';
type PremiumContext =
  | 'arena'
  | 'no_energy'
  | 'course_after_lesson3'
  | 'lesson_b1'
  | 'quiz_limit'
  | 'quiz_level'
  | 'quiz_medium'
  | 'quiz_hard'
  | 'flashcard_limit'
  | 'streak'
  | 'theme'
  | 'club'
  /** Trainer premium modes paywall. */
  | 'trainer'
  /** Trainer daily session limit reached. */
  | 'trainer_limit'
  /** Personalized diagnosis training after the one free try. */
  | 'diagnosis_training'
  /** Mastery — повторное прохождение урока за осколки либо безлимит на Premium. */
  | 'mastery'
  /** Стат-экран: heatmap, mistake patterns, percentiles за blur\'ом. */
  | 'stats'
  | 'heatmap'
  | 'patterns'
  | 'percentiles'
  | 'generic';
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
  subtitleRu: 'Первые 3 урока открыты бесплатно. Premium открывает весь текущий уровень: все уроки доступны сразу, без блокировок по результату. Следующие уровни открываются через экзамены.',
  subtitleUk: 'Перші 3 уроки відкриті безкоштовно. Premium відкриває весь поточний рівень: усі уроки доступні одразу, без блокувань за результатом. Наступні рівні відкриваються через екзамени.',
  subtitleEs: 'Las primeras 3 lecciones son gratis. Premium abre todo tu nivel actual: todas las lecciones disponibles al instante, sin bloqueos por resultado. Los siguientes niveles se abren con exámenes.',
};

function normalizePremiumContext(raw: string | string[] | undefined): PremiumContext {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'hall_of_fame') return 'generic';
  if (value === 'lesson_b1') return 'course_after_lesson3';
  if (value === 'trainer_smart_mix') return 'trainer';
  return (value ?? 'generic') as PremiumContext;
}

const PAYWALL_COPY: Record<PremiumContext, PaywallCopy> = {
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
    titleRu: 'Ты готов к следующему уровню',
    titleUk: 'Ти готовий до наступного рівня',
    titleEs: 'Estás listo para el siguiente nivel',
    subtitleRu: 'Открой более сильную практику и ускорь рост языка.',
    subtitleUk: 'Відкрий сильнішу практику та пришвидш свій прогрес.',
    subtitleEs: 'Accede a una práctica más exigente y acelera tu progreso.',
  },
  quiz_medium: {
    // Пейволл при тапе на Medium: пользователь мог ни разу не играть в Easy — не пишем «легкий пройден».
    titleRu: 'Средняя сложность — сильнее прогресс',
    titleUk: 'Середня складність — сильніший прогрес',
    titleEs: 'Nivel medio: más progreso',
    subtitleRu: 'Средние квизы дают больше практики, глубже закрепляют материал и ускоряют прогресс.',
    subtitleUk: 'Середні квізи дають більше практики, глибше закріплюють матеріал і прискорюють прогрес.',
    subtitleEs: 'Los quizzes medios dan más práctica, consolidan mejor el contenido y aceleran el progreso.',
  },
  quiz_hard: {
    titleRu: 'Сложный уровень - максимум роста',
    titleUk: 'Складний рівень - максимум росту',
    titleEs: 'Nivel difícil: máximo potencial',
    subtitleRu: 'Hard-квизы помогают выйти из плато и быстрее прокачать уверенное владение языком.',
    subtitleUk: 'Hard-квізи допомагають вийти з плато й швидше прокачати впевнене володіння мовою.',
    subtitleEs: 'Los quizzes difíciles te ayudan a salir del estancamiento y dominar el idioma con más confianza.',
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
    titleRu: 'Сессия Тренера использована',
    titleUk: 'Сесію Тренера використано',
    titleEs: 'Sesión del Entrenador usada',
    subtitleRu: 'Free: 1 сессия в сутки. Premium: безлимит повторений в любых режимах.',
    subtitleUk: 'Free: 1 сесія на добу. Premium: безліміт повторень у будь-яких режимах.',
    subtitleEs: 'Free: 1 sesión al día. Premium: repeticiones ilimitadas en todos los modos.',
  },
  diagnosis_training: {
    titleRu: 'Новые разборы ошибок — в Premium',
    titleUk: 'Нові розбори помилок — у Premium',
    titleEs: 'Nuevos análisis de errores en Premium',
    subtitleRu: 'Первый персональный разбор доступен бесплатно. Premium открывает разбор каждой новой ошибки: понятное объяснение, правильный вариант и тренировку на похожих фразах без лимита.',
    subtitleUk: 'Перший персональний розбір доступний безкоштовно. Premium відкриває розбір кожної нової помилки: зрозуміле пояснення, правильний варіант і тренування на схожих фразах без ліміту.',
    subtitleEs: 'El primer análisis personalizado es gratis. Premium abre el análisis de cada error nuevo: explicación clara, forma correcta y práctica con frases parecidas sin límite.',
  },
  mastery: {
    titleRu: 'Перепроходи уроки без ограничений',
    titleUk: 'Перепрохід уроків без обмежень',
    titleEs: 'Repite lecciones sin límites',
    subtitleRu: 'С Premium любой пройденный урок открыт для повтора — без списания осколков (в том числе когда цена росла бы за каждый проход).',
    subtitleUk: 'З Premium будь-який пройдений урок відкрито для повтору — без списання осколків, навіть якщо для free ціна зростає.',
    subtitleEs: 'Con Premium repites cualquier lección completada sin gastar fragmentos (aunque sin premium el precio sube en cada repetición).',
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
  titleRu: '3 бесплатных квиза на сегодня использованы',
  titleUk: '3 безкоштовні квізи на сьогодні використано',
  titleEs: 'Ya usaste tus 3 cuestionarios gratis de hoy',
  subtitleRu: 'Free-аккаунту доступны 3 легких квиза в день. Premium снимает дневной лимит и открывает средний и сложный уровни.',
  subtitleUk: 'Free-акаунту доступні 3 легкі квізи на день. Premium знімає денний ліміт і відкриває середній та складний рівні.',
  subtitleEs: 'La cuenta gratis tiene 3 cuestionarios fáciles al día. Premium quita el límite diario y abre los niveles medio y difícil.',
};

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
        emoji: '💎',
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

const CONTEXT_BENEFITS: Record<PremiumContext, { ru: string; uk: string; es: string }[]> = {
  arena: [
    { ru: 'Дневной потолок матчей снимается', uk: 'Денну межу матчів знято', es: 'Se quita el techo diario de partidas' },
    { ru: 'Дуэли без ощущения «на сегодня всё»', uk: 'Дуелі без «на сьогодні вже досить»', es: 'Duelos sin el «ya basta por hoy»' },
    { ru: 'Темп и мотивация в тренировках сильнее', uk: 'Темп і мотивація в тренуваннях сильніші', es: 'Ritmo y motivación en el entrenamiento' },
  ],
  no_energy: [
    { ru: 'Свободные занятия без таймера', uk: 'Вільні заняття без таймера', es: 'Sesiones sin temporizador de espera' },
    { ru: 'Урок, квиз и финальный экзамен без вынужденных пауз', uk: 'Урок, квіз і фінальний іспит без вимушених пауз', es: 'Lección, quiz y examen sin pausas forzadas' },
    { ru: 'Стабильный дневной ритм без срывов', uk: 'Стабільний щоденний ритм без зривів', es: 'Ritmo diario estable sin frenos' },
  ],
  course_after_lesson3: [
    { ru: 'Текущий уровень открывается целиком сразу', uk: 'Поточний рівень відкривається повністю одразу', es: 'Tu nivel actual se abre completo al instante' },
    { ru: 'Никаких барьеров — просто учись дальше в своё удовольствие', uk: 'Жодних бар\'єрів — просто навчайся далі із задоволенням', es: 'Sin barreras — sigue aprendiendo a tu gusto' },
    { ru: 'Следующие уровни открываются через экзамены', uk: 'Наступні рівні відкриваються через екзамени', es: 'Los siguientes niveles se abren con exámenes' },
  ],
  lesson_b1: [
    { ru: 'Текущий уровень открывается целиком сразу', uk: 'Поточний рівень відкривається повністю одразу', es: 'Tu nivel actual se abre completo al instante' },
    { ru: 'Никаких барьеров — просто учись дальше в своё удовольствие', uk: 'Жодних бар\'єрів — просто навчайся далі із задоволенням', es: 'Sin barreras — sigue aprendiendo a tu gusto' },
    { ru: 'Следующие уровни открываются через экзамены', uk: 'Наступні рівні відкриваються через екзамени', es: 'Los siguientes niveles se abren con exámenes' },
  ],
  quiz_limit: [
    { ru: 'Без лимита попыток и остановок', uk: 'Без ліміту спроб і зупинок', es: 'Sin límite de intentos ni frenos' },
    { ru: 'Регулярный учебный ритм каждый день', uk: 'Регулярний навчальний ритм щодня', es: 'Ritmo de estudio estable cada día' },
    { ru: 'Больше XP и пользы сессий', uk: 'Більше XP і користі від сесій', es: 'Más XP y valor en cada sesión' },
  ],
  quiz_level: [
    { ru: 'Доступ к более сильной практике', uk: 'Доступ до сильнішої практики', es: 'Acceso a una práctica más exigente' },
    { ru: 'Быстрее рост языкового навыка', uk: 'Швидше зростання мовної навички', es: 'Progreso del idioma más rápido' },
    { ru: 'Меньше ощущения плато', uk: 'Менше відчуття плато', es: 'Menos sensación de estancamiento' },
  ],
  quiz_medium: [
    { ru: 'Сложнее задания и богаче контексты', uk: 'Складніші завдання і багатші контексти', es: 'Ejercicios más ricos en contexto' },
    { ru: 'Глубже закрепление материала', uk: 'Глибше закріплення матеріалу', es: 'Consolidación más profunda' },
    { ru: 'Сильнее прогресс каждую неделю', uk: 'Сильніший прогрес щотижня', es: 'Progreso más marcado cada semana' },
  ],
  quiz_hard: [
    { ru: 'Hard-уровень для максимального роста', uk: 'Hard-рівень для максимального росту', es: 'Nivel difícil para el máximo rendimiento' },
    { ru: 'Выход из языкового плато', uk: 'Вихід з мовного плато', es: 'Sales del plató del idioma' },
    { ru: 'Быстрее уверенное владение языком', uk: 'Швидше впевнене володіння мовою', es: 'Dominio del idioma con más soltura' },
  ],
  flashcard_limit: [
    { ru: 'Безлимит на личную базу карточек', uk: 'Безліміт на особисту базу карток', es: 'Tu colección de tarjetas sin límite' },
    { ru: 'Храни все важные фразы', uk: 'Зберігай всі важливі фрази', es: 'Guarda todas tus frases clave' },
    { ru: 'Лучше долгосрочное запоминание', uk: 'Краще довгострокове запам\'ятовування', es: 'Memoria a largo plazo más sólida' },
  ],
  streak: [
    { ru: 'Защита серии даже при пропуске', uk: 'Захист серії навіть при пропуску', es: 'Protege tu racha aunque faltes un día' },
    { ru: 'Без пауз из-за энергии', uk: 'Без пауз через енергію', es: 'Sin pausas por energía' },
    { ru: 'Стабильный ежедневный прогресс', uk: 'Стабільний щоденний прогрес', es: 'Avance estable cada día' },
  ],
  theme: [
    { ru: 'Персональный стиль приложения', uk: 'Персональний стиль застосунку', es: 'Estilo visual a tu medida' },
    { ru: 'Выше вовлеченность в обучение', uk: 'Вища залученість у навчання', es: 'Mayor compromiso al estudiar' },
    { ru: 'Комфортнее заниматься регулярно', uk: 'Комфортніше займатися регулярно', es: 'Sesiones más cómodas y rutinarias' },
  ],
  club: [
    { ru: 'Клубы и XP-бусты для ускорения', uk: 'Клуби та XP-бусти для прискорення', es: 'Clubs y bonus de XP para acelerar' },
    { ru: 'Больше пользы с каждой сессии', uk: 'Більше користі з кожної сесії', es: 'Sacas más de cada sesión' },
    { ru: 'Сильнее мотивация возвращаться', uk: 'Сильніша мотивація повертатися', es: 'Más ganas de volver mañana' },
  ],
  generic: [
    { ru: 'Больше практики без ограничений', uk: 'Більше практики без обмежень', es: 'Más práctica sin límites' },
    { ru: 'Стабильный темп и результат', uk: 'Стабільний темп і результат', es: 'Ritmo estable y resultado' },
    { ru: 'Премиум-опции сразу после активации', uk: 'Преміум-опції одразу після активації', es: 'Funciones Premium al instante' },
  ],
  trainer: [
    { ru: 'Слабые места: фразы с наибольшим числом ошибок', uk: 'Слабкі місця: фрази з найбільшою кількістю помилок', es: 'Puntos débiles: frases con más errores' },
    { ru: 'Smart Mix: алгоритм строит идеальный набор', uk: 'Smart Mix: алгоритм будує ідеальний набір', es: 'Smart Mix: el algoritmo crea el conjunto ideal' },
    { ru: 'Без лимита сессий в день', uk: 'Без ліміту сесій на день', es: 'Sin límite diario de sesiones' },
    { ru: 'По теме: повтор конкретного урока', uk: 'За темою: повтор конкретного уроку', es: 'Por tema: repaso de una lección específica' },
  ],
  trainer_limit: [
    { ru: 'Безлимит сессий Тренера', uk: 'Безліміт сесій Тренера', es: 'Sesiones ilimitadas del Entrenador' },
    { ru: 'Все 6 режимов без ограничений', uk: 'Всі 6 режимів без обмежень', es: 'Los 6 modos sin restricciones' },
    { ru: 'Смарт-повтор когда хочешь', uk: 'Смарт-повтор коли хочеш', es: 'Repaso inteligente cuando quieras' },
  ],
  diagnosis_training: [
    { ru: 'Новые ошибки превращаются в точные персональные разборы', uk: 'Нові помилки перетворюються на точні персональні розбори', es: 'Cada error nuevo se convierte en un análisis personal preciso' },
    { ru: 'Понятное объяснение: где сбилась фраза и как сказать правильно', uk: 'Зрозуміле пояснення: де збилась фраза і як сказати правильно', es: 'Explicación clara: dónde falla la frase y cómo decirla bien' },
    { ru: 'Тренировка на похожих фразах без лимита', uk: 'Тренування на схожих фразах без ліміту', es: 'Práctica con frases parecidas sin límite' },
  ],
  mastery: [
    { ru: 'Безлимит повторов любого урока', uk: 'Безліміт повторів будь-якого уроку', es: 'Repeticiones ilimitadas de lecciones' },
    { ru: 'Не тратишь осколки на перепрохождения уроков', uk: 'Не витрачаєш осколки на перепроходження уроків', es: 'No gastas fragmentos al repetir lecciones' },
    { ru: 'Тренируй до идеального результата без давления', uk: 'Тренуй до ідеального результату без тиску', es: 'Entrena hasta perfeccionar sin presión' },
  ],
  stats: [
    { ru: 'Карта активности: все 365 дней', uk: 'Карта активності: всі 365 днів', es: 'Mapa de actividad: los 365 días' },
    { ru: 'Паттерны ошибок и слабые темы', uk: 'Патерни помилок і слабкі теми', es: 'Patrones de errores y temas débiles' },
    { ru: 'Сравнение с другими — где ты в топе', uk: 'Порівняння з іншими — де ти в топі', es: 'Comparación con otros: tu top' },
  ],
  heatmap: [
    { ru: '365 дней активности — увидишь своё постоянство', uk: '365 днів активності — побач свою сталість', es: '365 días: ve tu constancia' },
    { ru: 'Лучшие и худшие периоды на одном экране', uk: 'Кращі та гірші періоди на одному екрані', es: 'Mejores y peores semanas a la vista' },
    { ru: 'Понимаешь свой ритм обучения', uk: 'Розумієш свій ритм навчання', es: 'Entiendes tu ritmo real' },
  ],
  patterns: [
    { ru: 'Точки роста: где ошибаешься чаще всего', uk: 'Точки росту: де помиляєшся найчастіше', es: 'Puntos de crecimiento concretos' },
    { ru: 'Конкретные темы и фразы для отработки', uk: 'Конкретні теми та фрази для відпрацювання', es: 'Temas y frases específicos a entrenar' },
    { ru: 'Тренируй именно слабое — без распыления', uk: 'Тренуй саме слабке — без розпорошення', es: 'Entrena lo importante, no todo a la vez' },
  ],
  percentiles: [
    { ru: 'Увидишь свой ранг среди всех учеников', uk: 'Бач свій ранг серед усіх учнів', es: 'Mira tu rango entre estudiantes' },
    { ru: 'Только позитивные сравнения — мотивация', uk: 'Лише позитивні порівняння — мотивація', es: 'Solo comparaciones positivas: motivación' },
    { ru: 'Вижу когда я в топе и где расти дальше', uk: 'Бачу коли я в топі та де рости далі', es: 'Sabes en qué destacas y dónde crecer' },
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
  freeRu: string;
  freeUk: string;
  freeEs: string;
  premRu: string;
  premUk: string;
  premEs: string;
  /** Вторая строка премиум-текста (напр. аналитика). */
  premRu2?: string;
  premUk2?: string;
  premEs2?: string;
};

const PAYWALL_COMPARISON_ROWS: readonly PaywallComparisonRow[] = [
  {
    emoji: '📚',
    titleRu: 'Уроки',
    titleUk: 'Уроки',
    titleEs: 'Lecciones',
    freeRu: 'Уроки 1–3',
    freeUk: 'Уроки 1–3',
    freeEs: 'Lecciones 1–3',
    premRu: 'Все уроки',
    premUk: 'Всі уроки',
    premEs: 'All lessons',
  },
  {
    emoji: '⚡',
    titleRu: 'Квизы',
    titleUk: 'Квізи',
    titleEs: 'Quizzes',
    freeRu: 'Только уровень Easy',
    freeUk: 'Лише рівень Easy',
    freeEs: 'Solo nivel Fácil',
    premRu: 'Все уровни',
    premUk: 'Усі рівні',
    premEs: 'Todos los niveles',
  },
  {
    emoji: '🃏',
    titleRu: 'Карточки',
    titleUk: 'Картки',
    titleEs: 'Tarjetas',
    freeRu: 'До 20 сохранённых',
    freeUk: 'До 20 збережених',
    freeEs: 'Hasta 20 guardadas',
    premRu: 'Без ограничений',
    premUk: 'Без обмежень',
    premEs: 'Sin límites',
  },
  {
    emoji: '🔋',
    titleRu: 'Энергия',
    titleUk: 'Енергія',
    titleEs: 'Energía',
    freeRu: '+1 ⚡ ~10 мин',
    freeUk: '+1 ⚡ ~10 хв',
    freeEs: '+1 ⚡ ~10 min',
    premRu: 'Не заканчивается',
    premUk: 'Не закінчується',
    premEs: 'No se agota',
  },
  {
    emoji: '⚔️',
    titleRu: 'Арена',
    titleUk: 'Арена',
    titleEs: 'Arena',
    freeRu: 'Лимит матчей в день и ⚡ за вход',
    freeUk: 'Ліміт матчів на день і ⚡ за вхід',
    freeEs: 'Tope diario y ⚡ por partida',
    premRu: 'Безлимит',
    premUk: 'Безліміт',
    premEs: 'Ilimitada',
  },
  {
    emoji: '📊',
    titleRu: 'Аналитика',
    titleUk: 'Аналітика',
    titleEs: 'Analítica',
    freeRu: 'Недоступна в бесплатном режиме',
    freeUk: 'Недоступна у безкоштовному режимі',
    freeEs: 'No disponible en modo gratis',
    premRu: 'Детальная персонализированная',
    premUk: 'Детальна персоналізована',
    premEs: 'Analítica personalizada',
    premRu2: 'аналитика',
    premUk2: 'аналітика',
    premEs2: 'detallada',
  },
  {
    emoji: '🔁',
    titleRu: 'Повторы уроков',
    titleUk: 'Повтори уроків',
    titleEs: 'Repetir lecciones',
    freeRu: 'За осколки при повторе',
    freeUk: 'За осколки за повтор',
    freeEs: 'Con fragmentos por repetición',
    premRu: 'Без ограничений',
    premUk: 'Без обмежень',
    premEs: 'Sin límites',
  },
  {
    emoji: '🎨',
    titleRu: 'Темы интерфейса',
    titleUk: 'Теми інтерфейсу',
    titleEs: 'Temas de interfaz',
    freeRu: 'Только базовые темы',
    freeUk: 'Лише базові теми',
    freeEs: 'Solo temas básicos',
    premRu: 'Все темы оформления',
    premUk: 'Усі теми оформлення',
    premEs: 'Todos los temas visuales',
  },
  {
    emoji: '🏆',
    titleRu: 'Лидерборды',
    titleUk: 'Лідерборди',
    titleEs: 'Clasificaciones',
    freeRu: 'Обычное имя в списках',
    freeUk: 'Звичайне ім\'я в списках',
    freeEs: 'Nombre estándar en listas',
    premRu: 'Золотое имя в лидербордах',
    premUk: 'Золоте ім\'я в лідербордах',
    premEs: 'Nombre dorado en rankings',
  },
];

/** Экран «Управление Premium» (из настроек): напоминание, что уже включено */
const MANAGE_VIEW_PREMIUM_BENEFITS: { ru: string; uk: string; es: string }[] = [
  {
    ru: 'Безлимитная энергия для уроков, квизов, экзаменов и другого контента без ожидания.',
    uk: 'Безлімітна енергія для уроків, квізів, іспитів та іншого контенту без очікування.',
    es: 'Energía ilimitada para lecciones, quizzes, exámenes y otro contenido sin esperas.',
  },
  {
    ru: 'Арена без дневного лимита матчей и без затрат энергии на рейтинговые игры.',
    uk: 'Арена без денного ліміту матчів і без витрат енергії на рейтингові ігри.',
    es: 'Arena sin límite diario de partidas y sin gastar energía en juegos clasificatorios.',
  },
  {
    ru: 'Уроки текущего уровня открыты полностью. Следующие уровни открываются после экзаменов.',
    uk: 'Уроки поточного рівня відкриті повністю. Наступні рівні відкриваються після іспитів.',
    es: 'Las lecciones del nivel actual están abiertas por completo. Los siguientes niveles se desbloquean después de los exámenes.',
  },
  {
    ru: 'Квизы доступны на уровнях Medium и Hard, а не только Easy.',
    uk: 'Квізи доступні на рівнях Medium і Hard, а не лише Easy.',
    es: 'Los quizzes están disponibles en Medium y Hard, no solo en Easy.',
  },
  {
    ru: 'Неограниченное количество сохранённых карточек.',
    uk: 'Необмежена кількість збережених карток.',
    es: 'Cantidad ilimitada de tarjetas guardadas.',
  },
  {
    ru: 'Заморозка серии: первая защита доступна бесплатно перед использованием осколков.',
    uk: 'Заморозка серії: перший захист доступний безкоштовно перед використанням осколків.',
    es: 'Protección de racha: la primera está disponible gratis antes de usar fragmentos.',
  },
  {
    ru: 'Темы: Forest, Neon и Coral.',
    uk: 'Теми: Forest, Neon і Coral.',
    es: 'Temas: Forest, Neon y Coral.',
  },
  {
    ru: 'Профиль с премиальной подсветкой на главной странице и в лидербордах.',
    uk: 'Профіль із преміальною підсвіткою на головній сторінці та в лідербордах.',
    es: 'Perfil con resaltado premium en la pantalla principal y en las clasificaciones.',
  },
];

CONTEXT_BENEFITS.quiz_limit = [
  { ru: 'Без дневного лимита на легкие квизы', uk: 'Без денного ліміту на легкі квізи', es: 'Sin límite diario en cuestionarios fáciles' },
  { ru: 'Средний и сложный уровни открыты', uk: 'Середній і складний рівні відкриті', es: 'Niveles medio y difícil desbloqueados' },
  { ru: 'Больше практики и XP каждый день', uk: 'Більше практики та XP щодня', es: 'Más práctica y XP cada día' },
];

function getPersonalValueLine(ctx: PremiumContext, streakDays: number, lessonsDone: number, savedCards: number, lang: Lang): string {
  if (ctx === 'streak' && streakDays > 0) {
    return triLang(lang, {
      ru: `Сейчас у тебя серия ${streakDays} дн. Premium даёт заморозку и спокойнее ритм без пауз.`,
      uk: `Зараз у тебе серія ${streakDays} дн. Premium дає заморозку і спокійніший ритм без пауз.`,
      es: `Llevas ${streakDays} ${streakDays === 1 ? 'día' : 'días'} de racha. Premium añade protección y más constancia.`,
    });
  }
  if (ctx === 'course_after_lesson3') {
    return triLang(lang, {
      ru: `Уроков пройдено: ${lessonsDone}. Premium откроет текущий уровень целиком, а следующий — после экзамена.`,
      uk: `Уроків пройдено: ${lessonsDone}. Premium відкриє поточний рівень повністю, а наступний — після екзамену.`,
      es: `Lecciones completadas: ${lessonsDone}. Premium abre tu nivel actual completo; el siguiente se abre con examen.`,
    });
  }
  if (ctx === 'lesson_b1') {
    return triLang(lang, {
      ru: `Уроков пройдено: ${lessonsDone}. Premium снимает замки с уроков текущего уровня.`,
      uk: `Уроків пройдено: ${lessonsDone}. Premium знімає замки з уроків поточного рівня.`,
      es: `Lecciones completadas: ${lessonsDone}. Premium quita los candados del nivel actual.`,
    });
  }
  if (ctx === 'flashcard_limit' && savedCards > 0) {
    return triLang(lang, {
      ru: `У тебя уже ${savedCards} карточек. Premium снимает лимит полностью.`,
      uk: `У тебе вже ${savedCards} карток. Premium знімає ліміт повністю.`,
      es: `Ya tienes ${savedCards} tarjetas. Premium quita el límite por completo.`,
    });
  }
  return triLang(lang, {
    ru: 'После активации Premium ты сразу получишь больше пользы из каждой сессии.',
    uk: 'Після активації Premium ти відразу отримаєш більше користі з кожної сесії.',
    es: 'Tras activar Premium sacarás más partido a cada sesión al momento.',
  });
}

// ── Строки сравнения ──────────────────────────────────────────────────────────

const formatDate = (ts: number, lang: string) =>
  new Date(ts).toLocaleDateString(
    lang === 'uk' ? 'uk-UA' : lang === 'es' ? 'es-ES' : 'ru-RU',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );

/**
 * `storeProductHasTrialIntro` импортирован из `./premium_trial_signal` — общая логика
 * проверки реального intro phase из App Store / Google Play.
 */

// ── Список открываемых фич для celebrate-модалки ──────────────────────────────
const UNLOCK_ITEMS: { icon: string; textRu: string; textUk: string; textEs: string }[] = [
  { icon: '⚡', textRu: 'Безлимитная энергия',      textUk: 'Необмежена енергія',    textEs: 'Energía ilimitada' },
  { icon: '🎓', textRu: 'Уровень целиком без замков', textUk: 'Рівень повністю без замків', textEs: 'Nivel completo sin candados' },
  { icon: '🧠', textRu: 'Квиз Средний',             textUk: 'Квіз Середній',        textEs: 'Quiz medio' },
  { icon: '💜', textRu: 'Квиз Сложный',             textUk: 'Квіз Складний',        textEs: 'Quiz difícil' },
  { icon: '🎨', textRu: 'Кастомные темы',          textUk: 'Кастомні теми',       textEs: 'Temas personalizados' },
  { icon: '❄️', textRu: 'Заморозка цепочки',         textUk: 'Заморозка стріку',     textEs: 'Protección de racha' },
  { icon: '📚', textRu: 'Безлимитные карточки',    textUk: 'Безліміт карток',      textEs: 'Tarjetas ilimitadas' },
];

// ── Компонент ─────────────────────────────────────────────────────────────────
export default function PremiumModal() {
  const router = useRouter();
  const effectiveOs = useEffectivePlatformOS();
  const insets = useSafeAreaInsets();
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home' as any);
  };
  const params = useLocalSearchParams<{
    context?: string;
    streak?: string;
    lessons_done?: string;
    saved?: string;
    level?: string;
    manage?: string;
    source?: string;
    _preview_success?: string;
    _force_trial_ui?: string;
  }>();
  const manageRaw = params.manage;
  /** Стабильный флаг без зависимости от нового объекта params на каждом ререндере */
  const openManageFromSettings =
    manageRaw === '1' || (Array.isArray(manageRaw) && manageRaw[0] === '1');
  /** Admin-only QA: форсит показ trial-UI (золотая лента + «Бесплатно» в карточках)
      даже когда магазин не вернул intro phase. Проставляется ТОЛЬКО из admin-панели,
      пользователь без deep-link доступа сам его не передаст. */
  const forceTrialUI = params._force_trial_ui === '1';

  const ctx = normalizePremiumContext(params.context);
  const streakDays   = parseInt(params.streak       ?? '0') || 0;
  const lessonsDone  = parseInt(params.lessons_done ?? '0') || 0;
  const savedCards   = parseInt(params.saved        ?? '0') || 0;
  /** Один `paywall_plan_select` на пару (context, plan) за открытие экрана — без дублей карточка + CTA. */
  const lastPaywallPlanSelectLoggedRef = useRef<Plan | null>(null);
  const logPaywallPlanSelectDeduped = useCallback((plan: Plan) => {
    if (lastPaywallPlanSelectLoggedRef.current === plan) return;
    lastPaywallPlanSelectLoggedRef.current = plan;
    logPaywallPlanSelect(ctx, plan);
  }, [ctx]);

  useEffect(() => {
    lastPaywallPlanSelectLoggedRef.current = null;
    logPremiumModalOpened(ctx);
    logPaywallView(ctx);
    if (ctx === 'course_after_lesson3') {
      logCoursePaywallAfterLesson3(lessonsDone);
    }
  }, [ctx, lessonsDone]);
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { reload: reloadEnergy } = useEnergy();
  const L = (ru: string, uk: string, es: string) => triLang(lang as Lang, { ru, uk, es });

  const [selected,   setSelected]   = useState<Plan>('yearly');
  const [restoring,  setRestoring]  = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [packages,   setPackages]   = useState<{ monthly?: PurchasesPackage; yearly?: PurchasesPackage }>({});
  /** true = в 90-дн. «окне» после последней покупки/триал-флоу — не показываем копию 3 дня (локально). */
  const [trialReofferBlocked, setTrialReofferBlocked] = useState(false);

  // manage-view state
  type ViewMode = PaywallViewMode;
  const [viewMode,    setViewMode]   = useState<ViewMode>(openManageFromSettings ? 'manage' : 'purchase');
  const [activePlan,  setActivePlan]  = useState<Plan | null>(null);
  const [isAdminGrantedPremium, setIsAdminGrantedPremium] = useState(false);
  const [expiryTs,    setExpiryTs]   = useState<number>(0);
  const [cancelled]  = useState(false);
  const [cancelSurveyVisible, setCancelSurveyVisible] = useState(false);
  const [cancelSurveyOtherText, setCancelSurveyOtherText] = useState('');
  const [exitTrialOfferVisible, setExitTrialOfferVisible] = useState(false);
  const exitTrialOfferSeenRef = useRef(false);
  const successScale   = useRef(new Animated.Value(0.6)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const purchasingRef  = useRef(false);
  const ctaPulse       = useRef(new Animated.Value(1)).current;
  const badgeSparkle   = useRef(new Animated.Value(0)).current;
  const heroGlow       = useRef(new Animated.Value(0.35)).current;
  const heroFloat      = useRef(new Animated.Value(0)).current;
  // Entrance animation: пейвол появляется плавно снизу при открытии
  const entranceOpacity    = useRef(new Animated.Value(0)).current;
  const entranceTranslateY = useRef(new Animated.Value(52)).current;
  const entranceScale      = useRef(new Animated.Value(0.97)).current;
  const successTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Celebrate modal — per-item reveal animations
  const [openedLocks, setOpenedLocks] = useState<boolean[]>(UNLOCK_ITEMS.map(() => false));
  const itemAnims = useRef(UNLOCK_ITEMS.map(() => ({
    cardOpacity:    new Animated.Value(0),
    cardTranslateY: new Animated.Value(22),
    grayOverlay:    new Animated.Value(1),   // 1=gray, 0=colorful
    lockOpacity:    new Animated.Value(0),
    lockScale:      new Animated.Value(0.5),
    lockRot:        new Animated.Value(0),   // raw degrees value
  }))).current;
  const celebrateTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [canClose, setCanClose] = useState(false);

  const resolveCurrentPremiumState = useCallback(async () => {
    const verified = await getVerifiedPremiumStatus().catch(() => false);
    const res = await AsyncStorage.multiGet([
      'premium_active',
      'premium_plan',
      'premium_expiry',
      'tester_no_premium',
      'admin_premium_override',
    ]);
    const active = res.find(r => r[0] === 'premium_active')?.[1];
    const rawPlan = String(res.find(r => r[0] === 'premium_plan')?.[1] ?? '').trim();
    const plan = normalizePlan(rawPlan);
    const expiry = parseInt(res.find(r => r[0] === 'premium_expiry')?.[1] || '0');
    const noPremium = res.find(r => r[0] === 'tester_no_premium')?.[1];
    const adminOverride = res.find(r => r[0] === 'admin_premium_override')?.[1];
    const adminGrantAlive =
      adminOverride === 'true' &&
      !!rawPlan &&
      rawPlan.toLowerCase() !== 'null' &&
      (expiry === 0 || expiry > Date.now());
    const isAdmin = adminGrantAlive;
    const hasLocalActive =
      noPremium !== 'true' &&
      active === 'true' &&
      !!plan &&
      (expiry === 0 || expiry > Date.now());
    const isPremium = noPremium === 'true' ? false : (verified || isAdmin || hasLocalActive);
    return { isPremium, plan, expiry, isAdmin };
  }, []);

  const startCelebrationSequence = useCallback(() => {
    celebrateTimers.current.forEach(t => clearTimeout(t));
    celebrateTimers.current = [];

    const STAGGER = 340; // ms between each item start

    UNLOCK_ITEMS.forEach((_, idx) => {
      const base = idx * STAGGER;

      // Step 1 (t=base): card slides in, gray
      const t1 = setTimeout(() => {
        const a = itemAnims[idx];
        Animated.parallel([
          Animated.timing(a.cardOpacity,    { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.spring(a.cardTranslateY, { toValue: 0, useNativeDriver: true, tension: 90, friction: 11 }),
        ]).start();
      }, base);

      // Step 2 (t=base+180): lock pops in
      const t2 = setTimeout(() => {
        const a = itemAnims[idx];
        Animated.parallel([
          Animated.timing(a.lockOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.spring(a.lockScale,   { toValue: 1, useNativeDriver: true, tension: 150, friction: 8 }),
        ]).start();
      }, base + 180);

      // Step 3 (t=base+340): lock wobbles (shake)
      const t3 = setTimeout(() => {
        const a = itemAnims[idx];
        Animated.sequence([
          Animated.timing(a.lockRot, { toValue: -18, duration: 70, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
          Animated.timing(a.lockRot, { toValue:  14, duration: 70, useNativeDriver: true }),
          Animated.timing(a.lockRot, { toValue: -10, duration: 60, useNativeDriver: true }),
          Animated.timing(a.lockRot, { toValue:   6, duration: 55, useNativeDriver: true }),
          Animated.timing(a.lockRot, { toValue:   0, duration: 45, useNativeDriver: true }),
        ]).start();
      }, base + 340);

      // Step 4 (t=base+680): switch icon → lock-open + rotate open
      const t4 = setTimeout(() => {
        setOpenedLocks(prev => {
          const next = [...prev];
          next[idx] = true;
          return next;
        });
        const a = itemAnims[idx];
        Animated.timing(a.lockRot, { toValue: -38, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.cubic) }).start();
      }, base + 680);

      // Step 5 (t=base+880): lock fades out + gray overlay fades out → card goes colorful
      const t5 = setTimeout(() => {
        const a = itemAnims[idx];
        Animated.parallel([
          Animated.timing(a.lockOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.timing(a.grayOverlay, { toValue: 0, duration: 320, useNativeDriver: true }),
        ]).start();
      }, base + 880);

      celebrateTimers.current.push(t1, t2, t3, t4, t5);
    });

    // Show continue button after last item fully reveals
    const lastDone = (UNLOCK_ITEMS.length - 1) * STAGGER + 880 + 350;
    const tClose = setTimeout(() => setCanClose(true), lastDone);
    celebrateTimers.current.push(tClose);
  }, [itemAnims]);

  useEffect(() => () => { if (successTimer.current) clearTimeout(successTimer.current); }, []);

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
        tension: MOTION_SPRING.panel.tension,
        friction: MOTION_SPRING.panel.friction,
        useNativeDriver: true,
      }),
      Animated.spring(entranceScale, {
        toValue: 1,
        tension: MOTION_SPRING.panel.tension,
        friction: MOTION_SPRING.panel.friction,
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

  // Запускаем анимацию всякий раз как входим в success-режим
  useEffect(() => {
    if (viewMode === 'success') {
      successScale.setValue(0.6);
      successOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: MOTION_SPRING.panel.tension,
          friction: MOTION_SPRING.panel.friction,
        }),
        Animated.timing(successOpacity, { toValue: 1, duration: MOTION_DURATION.normal, useNativeDriver: true }),
      ]).start();
      startCelebrationSequence();
    }
  }, [viewMode, startCelebrationSequence, successOpacity, successScale]);

  // Превью из тестерского экрана
  useEffect(() => {
    if (params._preview_success === '1') setViewMode('success');
  }, [params._preview_success]);

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
  const benefits = CONTEXT_BENEFITS[ctx] ?? CONTEXT_BENEFITS.generic;
  const personalValueLine = getPersonalValueLine(ctx, streakDays, lessonsDone, savedCards, lang as Lang);
  const yearlyStoreHasTrial = !trialReofferBlocked && storeProductHasTrialIntro(packages.yearly?.product);
  const monthlyStoreHasTrial = !trialReofferBlocked && storeProductHasTrialIntro(packages.monthly?.product);
  const hasStoreTrial = yearlyStoreHasTrial || monthlyStoreHasTrial;
  const showPrimaryTrialUi = shouldShowPrimaryTrialUi({
    forceTrialUI,
    source: params.source,
  });
  const primaryYearlyHasTrial = showPrimaryTrialUi && (forceTrialUI || yearlyStoreHasTrial);
  const primaryMonthlyHasTrial = showPrimaryTrialUi && (forceTrialUI || monthlyStoreHasTrial);
  const primaryHasTrialOffer = primaryYearlyHasTrial || primaryMonthlyHasTrial;
  const exitTrialPlan: Plan = yearlyStoreHasTrial ? 'yearly' : 'monthly';
  const storePricesRequired = !IS_EXPO_GO && !DEV_IAP_BYPASS;
  const yearlyPrice = storePriceTrim(packages.yearly?.product.priceString);
  const monthlyPrice = storePriceTrim(packages.monthly?.product.priceString);

  const closePaywallAfterDecline = useCallback((reason: PaywallCloseReason) => {
    if (exitTrialOfferVisible) {
      logExitTrialOfferDeclined(ctx, exitTrialPlan);
    }
    if (reason === 'close') logPaywallClose(ctx);
    else logPaywallContinueFree(ctx);
    goBack();
  }, [ctx, exitTrialOfferVisible, exitTrialPlan, goBack]);

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
      logExitTrialOfferShown(ctx, exitTrialPlan);
      setExitTrialOfferVisible(true);
      return;
    }
    closePaywallAfterDecline(reason);
  }, [
    closePaywallAfterDecline,
    ctx,
    exitTrialPlan,
    forceTrialUI,
    hasStoreTrial,
    openManageFromSettings,
    purchasing,
    restoring,
    viewMode,
  ]);

  // Персонализированные теги: top-3 «болевых» строки, загружаются асинхронно.
  // Показываем pill-карточки выше hero-блока чтобы юзер увидел «зеркало своего опыта»
  // до стандартного рекламного pitch.
  const [personalizedTags, setPersonalizedTags] = React.useState<PersonalizedTag[]>([]);
  React.useEffect(() => {
    void collectPaywallStats().then((stats) => {
      setPersonalizedTags(pickPaywallTags(stats, 3));
    });
  }, []);

  useEffect(() => {
    getTrialReofferBlockedByCooldown().then(setTrialReofferBlocked);

    /** С manage=1 не трогаем — отдельный эффект, иначе двойная гидрация и моргание. */
    if (openManageFromSettings) return;

    resolveCurrentPremiumState()
      .then(({ isPremium, plan, expiry, isAdmin }) => {
        if (isPremium && plan) {
          setIsAdminGrantedPremium(isAdmin);
          setActivePlan(plan);
          setExpiryTs(prev => (expiry > 0 ? expiry : prev));
          setViewMode('manage');
        }
      })
      .catch(() => {});
  }, [resolveCurrentPremiumState, openManageFromSettings]);

  useFocusEffect(
    useCallback(() => {
      void getTrialReofferBlockedByCooldown().then(setTrialReofferBlocked);
      if (IS_EXPO_GO || DEV_IAP_BYPASS) return;
      void Purchases.getOfferings()
        .then(o => {
          const pkgs = o.current?.availablePackages ?? [];
          setPackages(resolvePremiumPackages(pkgs));
        })
        .catch(() => {});
    }, []),
  );

  const activateFreezeIfNeeded = async () => {
    if (ctx === 'streak') {
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem('streak_freeze', JSON.stringify({ active: true, date: today }));
    }
  };

  const showSuccess = () => {
    invalidatePremiumCache();
    AsyncStorage.setItem('had_premium_ever', '1').catch(() => {});
    void getPremiumCourseLevel().catch(() => {});
    emitAppEvent('premium_activated');
    reloadEnergy();
    setOpenedLocks(UNLOCK_ITEMS.map(() => false));
    setCanClose(false);
    itemAnims.forEach(a => {
      a.cardOpacity.setValue(0);
      a.cardTranslateY.setValue(22);
      a.grayOverlay.setValue(1);
      a.lockOpacity.setValue(0);
      a.lockScale.setValue(0.5);
      a.lockRot.setValue(0);
    });
    setViewMode('success');
  };

  // Cleanup celebration timers on unmount
  useEffect(() => () => { celebrateTimers.current.forEach(t => clearTimeout(t)); }, []);

  const handlePurchase = async (plan: Plan) => {
    // Defensive guard: if premium is already active locally, don\'t start a second flow.
    if (activePlan) {
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
      showSuccess();
      purchasingRef.current = false;
      return;
    }
    await initRevenueCat();
    if (!(await Purchases.isConfigured())) {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Платежи временно недоступны. Откройте приложение через пару секунд и попробуйте снова.',
        messageUk: 'Платежі тимчасово недоступні. Зачекайте кілька секунд і спробуйте знову.',
        messageEs: 'Pagos no disponibles por ahora. Espera unos segundos e inténtalo de nuevo.',
      });
      purchasingRef.current = false;
      return;
    }
    let pkg = plan === 'yearly' ? packages.yearly : packages.monthly;
    if (!pkg) {
      // Fallback: пользователь мог нажать CTA раньше, чем завершился initial getOfferings.
      try {
        const offerings = await Purchases.getOfferings();
        const nextPackages = resolvePremiumPackages(offerings.current?.availablePackages ?? []);
        setPackages(nextPackages);
        pkg = plan === 'yearly' ? nextPackages.yearly : nextPackages.monthly;
      } catch {
        // Ошибку покажем общим тостом ниже
      }
    }
    if (!pkg) {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Магазин недоступен. Попробуйте ещё раз.',
        messageUk: 'Магазин недоступний. Спробуйте ще раз.',
        messageEs: 'La tienda no está disponible. Inténtalo de nuevo.',
      });
      purchasingRef.current = false;
      return;
    }
    if (!storePriceTrim(pkg.product.priceString)) {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Цены ещё загружаются. Попробуйте через секунду.',
        messageUk: 'Ціни ще завантажуються. Спробуйте за секунду.',
        messageEs: 'Los precios aún se están cargando. Inténtalo en un segundo.',
      });
      purchasingRef.current = false;
      return;
    }
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

      const { customerInfo } = trialOption
        ? await Purchases.purchaseSubscriptionOption(trialOption)
        : await Purchases.purchasePackage(pkg);
      // purchasePackage не выбросил исключение → покупка авторизована Apple/Google.
      // Активируем сразу, не дожидаясь синхронизации RC (sandbox может запаздывать).
      // RC-статус используем как дополнительную проверку, но не как условие активации.
      await savePremiumLocally(plan, revenueCatPremiumMetadata(customerInfo, pkg.product.identifier));
      logPremiumPurchased(pkg.product.identifier);
      // Локальная отметка: 90 д. без копии «3 дня» (магазин отдельно решает про intro).
      await markSubscriptionOrTrialFlowConsumedNow();
      await activateFreezeIfNeeded();
      // Подняли pending для PremiumCelebrationModal — на следующем mount home.tsx
      // юзер увидит celebration с замочками и короной.
      void markCelebrationPending();
      showSuccess();
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
            void markCelebrationPending();
            showSuccess();
            return;
          }
        } catch {
          // Fall through to the visible error below.
        }
      }

      if (!e.userCancelled) {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: e.message || 'Что-то пошло не так.',
          messageUk: e.message || 'Щось пішло не так.',
          messageEs: e.message || 'Algo salió mal.',
        });
      }
    } finally {
      setPurchasing(false);
      purchasingRef.current = false;
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const info = await Purchases.restorePurchases();
      const isActive =
        Object.keys(info.entitlements.active).length > 0 ||
        info.activeSubscriptions.length > 0;
      if (isActive) {
        const plan: Plan = info.activeSubscriptions.some(s => /year|annual|12.?month/i.test(s)) ? 'yearly' : 'monthly';
        await savePremiumLocally(plan, revenueCatPremiumMetadata(info));
        await markSubscriptionOrTrialFlowConsumedNow();
        // Restore = первый раз на этом устройстве (или после reset) — celebration уместна,
        // чтобы юзер видел что premium «активирован» и понимал что разблокировано.
        void markCelebrationPending();
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

  // ── Success / Celebrate view ──────────────────────────────────────────────────
  if (viewMode === 'success') {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Close button — always visible */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, paddingBottom: 0 }}>
            <TouchableOpacity
              onPress={() => {
                hapticTap();
                celebrateTimers.current.forEach(t => clearTimeout(t));
                invalidatePremiumCache();
                emitAppEvent('premium_activated');
                goBack();
              }}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.bgCard + 'cc', justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="close" size={20} color={t.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 12, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
            {/* Header badge */}
            <Animated.View style={{ alignItems: 'center', transform: [{ scale: successScale }], opacity: successOpacity, marginBottom: 28 }}>
              <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: t.correct + '22', borderWidth: 2, borderColor: t.correct, justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}>
                <Ionicons name="diamond" size={42} color={t.correct} />
              </View>
              <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '800', textAlign: 'center' }}>
                {L('Premium активирован! 🎉', 'Premium активовано! 🎉', '¡Premium activado! 🎉')}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 6 }}>
                {L('Открываем все возможности…', 'Відкриваємо всі можливості…', 'Abriendo todas las funciones…')}
              </Text>
            </Animated.View>

            {/* Unlocked feature items */}
            <View style={{ width: '100%', gap: 10 }}>
              {UNLOCK_ITEMS.map((item, idx) => {
                const anim = itemAnims[idx];
                const lockRotDeg = anim.lockRot.interpolate({
                  inputRange: [-40, 40],
                  outputRange: ['-40deg', '40deg'],
                  extrapolate: 'clamp',
                });
                const isOpen = openedLocks[idx];
                return (
                  <Animated.View
                    key={idx}
                    style={{
                      opacity: anim.cardOpacity,
                      transform: [{ translateY: anim.cardTranslateY }],
                    }}
                  >
                    {/* Card with relative positioning for overlays */}
                    <View style={{ borderRadius: 14, overflow: 'hidden' }}>
                      {/* Colorful card (always present underneath) */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: t.bgCard,
                        borderRadius: 14,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: t.correct + '55',
                        gap: 12,
                        minHeight: 62,
                      }}>
                        <Text style={{ fontSize: 26 }}>{item.icon}</Text>
                        <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '600' }}>
                          {L(item.textRu, item.textUk, item.textEs)}
                        </Text>
                      </View>

                      {/* Gray overlay — fades out on unlock */}
                      <Animated.View
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: t.bgCard,
                          opacity: anim.grayOverlay,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: t.border,
                        }}
                      />

                      {/* Lock — centered, animates open then fades */}
                      <Animated.View
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          justifyContent: 'center',
                          alignItems: 'center',
                          opacity: anim.lockOpacity,
                        }}
                      >
                        <Animated.View style={{
                          transform: [
                            { rotate: lockRotDeg },
                            { scale: anim.lockScale },
                          ],
                        }}>
                          <Ionicons
                            name={isOpen ? 'lock-open' : 'lock-closed'}
                            size={34}
                            color={isOpen ? t.correct : t.textPrimary}
                          />
                        </Animated.View>
                      </Animated.View>
                    </View>
                  </Animated.View>
                );
              })}
            </View>

            {/* Continue button appears after all items */}
            {canClose && (
              <TouchableOpacity
                onPress={() => {
                  hapticTap();
                  invalidatePremiumCache();
                  emitAppEvent('premium_activated');
                  goBack();
                }}
                style={{ marginTop: 28, backgroundColor: t.correct, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40, width: '100%', alignItems: 'center' }}
              >
                <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '800' }}>
                  {L('Начать учиться →', 'Почати навчання →', 'Empezar a aprender →')}
                </Text>
              </TouchableOpacity>
            )}
            <View style={{ height: 32 }} />
          </ScrollView>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── Manage view ─────────────────────────────────────────────────────────────
  if (viewMode === 'manage' && !activePlan) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14 }}>
              <TouchableOpacity
                onPress={() => { hapticTap(); goBack(); }}
                style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgCard + 'AA', borderWidth: 1, borderColor: t.border }}
                activeOpacity={0.82}
              >
                <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
              </TouchableOpacity>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800' }}>Premium</Text>
                <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 1 }}>
                  {L('Управление подпиской', 'Керування підпискою', 'Gestionar suscripción')}
                </Text>
              </View>
            </View>
            <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
              <View style={{ backgroundColor: t.bgCard, borderRadius: 22, borderWidth: 1, borderColor: t.border, padding: 20 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800' }}>
                  {L('Проверяем подписку', 'Перевіряємо підписку', 'Comprobando suscripción')}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.body, marginTop: 8, lineHeight: 22 }}>
                  {L('Секунду, загружаем данные Premium.', 'Секунду, завантажуємо дані Premium.', 'Un segundo, cargando los datos de Premium.')}
                </Text>
              </View>
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (viewMode === 'manage' && activePlan) {
    const amount = activePlan === 'yearly'
      ? yearlyPrice
      : monthlyPrice;
    const period = activePlan === 'yearly'
      ? L('год', 'рік', 'año')
      : L('месяц', 'місяць', 'mes');
    const amountLabel = amount === ''
      ? (effectiveOs === 'ios'
          ? L('Цена в App Store', 'Ціна в App Store', 'Precio en App Store')
          : effectiveOs === 'android'
            ? L('Цена в Google Play', 'Ціна в Google Play', 'Precio en Google Play')
            : L('Цена в магазине', 'Ціна в магазині', 'Precio en la tienda'))
      : `${amount} / ${period}`;
    const premiumGold = t.gold;
    const premiumGoldSoft = t.goldBg;
    const premiumBorder = premiumGold + '66';
    const premiumHairline = premiumGold + '2E';
    const premiumShadow = {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.24,
      shadowRadius: 24,
      elevation: 10,
    };
    const refinedCard = {
      borderRadius: 22,
      ...premiumShadow,
    };
    const refinedCardInner = {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: premiumHairline,
      overflow: 'hidden' as const,
    };
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14 }}>
              <TouchableOpacity
                onPress={() => { hapticTap(); goBack(); }}
                style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgCard + 'AA', borderWidth: 1, borderColor: t.border }}
                activeOpacity={0.82}
              >
                <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
              </TouchableOpacity>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800' }}>Premium</Text>
                <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 1 }}>
                  {L('Управление подпиской', 'Керування підпискою', 'Gestionar suscripción')}
                </Text>
              </View>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 28, gap: 16 }}>
              <View style={refinedCard}>
                <LinearGradient
                  colors={[t.bgSurface, t.bgCard, t.bgSurface2]}
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
                  <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 18, right: 18, height: 1, backgroundColor: premiumGold + '88' }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <LinearGradient
                      colors={[premiumGold, '#FFF1A8', premiumGold]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFF7C8' }}
                    >
                      <Ionicons name="diamond" size={27} color={t.textOnGold} />
                    </LinearGradient>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', lineHeight: Math.round(f.h2 * 1.18) }} numberOfLines={2} adjustsFontSizeToFit>
                        {L('Premium активирован', 'Premium активовано', 'Premium activado')}
                      </Text>
                      <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 4 }} numberOfLines={2}>
                        {activePlan === 'yearly'
                          ? L('Годовая подписка', 'Річна підписка', 'Suscripción anual')
                          : L('Ежемесячная подписка', 'Щомісячна підписка', 'Suscripción mensual')}
                      </Text>
                    </View>
                  </View>
                  {!cancelled && (
                    <View style={{ paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: premiumHairline, gap: 14 }}>
                      <View style={{ flexDirection: 'row', gap: 14 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700' }}>
                            {L('Следующий платёж', 'Наступний платіж', 'Próximo pago')}
                          </Text>
                          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', marginTop: 5 }} numberOfLines={2}>
                            {expiryTs > 0 ? formatDate(expiryTs, lang) : '—'}
                          </Text>
                        </View>
                        <View style={{ flex: 1.25 }}>
                          <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700' }}>
                            {L('Сумма', 'Сума', 'Importe')}
                          </Text>
                          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', marginTop: 5 }} numberOfLines={2} adjustsFontSizeToFit>
                            {amountLabel}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: t.textMuted, fontSize: 12, lineHeight: 17 }}>
                        {effectiveOs === 'ios'
                          ? L('Точную дату списания смотри в App Store', 'Точну дату списання дивись в App Store', 'La fecha exacta del cargo está en App Store')
                          : effectiveOs === 'android'
                            ? L('Точную дату списания смотри в Google Play', 'Точну дату списання дивись у Google Play', 'La fecha exacta del cargo está en Google Play')
                            : L('Точную дату списания смотри в магазине приложений', 'Точну дату списання дивись у магазині застосунків', 'La fecha exacta del cargo está en la tienda de apps')}
                      </Text>
                    </View>
                  )}
                  {cancelled && (
                    <Text style={{ color: t.wrong, fontSize: f.sub, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.wrong + '44', lineHeight: 20 }}>
                      {L(
                        `Подписка отменена. Доступ активен до ${formatDate(expiryTs, lang)}`,
                        `Підписку скасовано. Доступ активний до ${formatDate(expiryTs, lang)}`,
                        `Suscripción cancelada. El acceso sigue hasta el ${formatDate(expiryTs, lang)}`,
                      )}
                    </Text>
                  )}
                </LinearGradient>
              </View>

              <View style={refinedCard}>
                <LinearGradient
                  colors={[t.bgCard, t.bgSurface, t.bgCard]}
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
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: premiumGoldSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: premiumBorder }}>
                      <Ionicons name="sparkles" size={18} color={premiumGold} />
                    </View>
                    <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900' }}>
                      {L('Что у тебя уже включено', 'Що в тебе вже включено', 'Lo que ya tienes incluido')}
                    </Text>
                  </View>
                  <View style={{ gap: 13 }}>
                    {MANAGE_VIEW_PREMIUM_BENEFITS.map((row, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: premiumGoldSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: premiumBorder, marginTop: 1 }}>
                          <Ionicons name="checkmark" size={15} color={premiumGold} />
                        </View>
                        <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, lineHeight: 22, fontWeight: '500' }}>
                          {L(row.ru, row.uk, row.es)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              </View>

              {!cancelled && !isAdminGrantedPremium && (
                <TouchableOpacity
                  onPress={() => { hapticTap(); openManageWithToast(); }}
                  activeOpacity={0.86}
                  style={{ borderRadius: 18, ...premiumShadow }}
                >
                  <LinearGradient
                    colors={[t.bgSurface, t.bgCard]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 18, borderWidth: 1, borderColor: premiumHairline, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: premiumGoldSoft, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="swap-horizontal-outline" size={20} color={premiumGold} />
                      </View>
                      <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>{L('Сменить план', 'Змінити план', 'Cambiar plan')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={premiumGold} />
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {!cancelled && !isAdminGrantedPremium && (
                <TouchableOpacity
                  onPress={() => { hapticTap(); setCancelSurveyVisible(true); }}
                  activeOpacity={0.86}
                  style={{ borderRadius: 18 }}
                >
                  <LinearGradient
                    colors={[t.bgCard, t.bgSurface]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 18, borderWidth: 1, borderColor: t.wrong + '55', borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.wrongBg, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="close-circle-outline" size={21} color={t.wrong} />
                    </View>
                    <Text style={{ color: t.wrong, fontSize: f.body, fontWeight: '800' }}>{L('Отменить подписку', 'Скасувати підписку', 'Cancelar suscripción')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center', marginTop: 4, lineHeight: 17 }}>
                {effectiveOs === 'ios'
                  ? L('Подписка управляется через App Store', 'Підписка управляється через App Store', 'La suscripción se gestiona en App Store')
                  : effectiveOs === 'android'
                    ? L('Подписка управляется через Google Play', 'Підписка управляється через Google Play', 'La suscripción se gestiona en Google Play')
                    : L('Подписка управляется через магазин приложений', 'Підписка управляється через магазин застосунків', 'La suscripción se gestiona en la tienda de apps')}
              </Text>
              {isAdminGrantedPremium && (
                <Text style={{ color: t.textSecond, fontSize: f.label, textAlign: 'center', marginTop: 2, lineHeight: 17 }}>
                  {L('Премиум выдан администратором. Управление — через админ-панель.', 'Преміум видано адміністратором. Керування — через адмін-панель.', 'Premium concedido por un administrador. La gestión es desde el panel de admin.')}
                </Text>
              )}
            </ScrollView>
          </ContentWrap>
        </SafeAreaView>

        {/* Опрос при отмене подписки */}
        <Modal visible={cancelSurveyVisible} transparent animationType="slide">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: t.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Math.max(40, insets.bottom + 16) }}>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginBottom: 6 }}>
                {L('Почему хочешь отменить?', 'Чому хочеш скасувати?', '¿Por qué quieres cancelar?')}
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.body, marginBottom: 20 }}>
                {L('Это поможет нам стать лучше', 'Це допоможе нам стати кращими', 'Nos ayudará a mejorar')}
              </Text>
              <TextInput
                value={cancelSurveyOtherText}
                onChangeText={setCancelSurveyOtherText}
                placeholder={L('Комментарий (необязательно)', 'Коментар (необов\'язково)', 'Comentario (opcional)')}
                placeholderTextColor={t.textGhost}
                multiline
                maxLength={1000}
                style={{
                  minHeight: 82,
                  maxHeight: 140,
                  textAlignVertical: 'top',
                  color: t.textPrimary,
                  backgroundColor: t.bgPrimary,
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
                { key: 'too_expensive',    ru: 'Слишком дорого', uk: 'Надто дорого', es: 'Demasiado caro' },
                { key: 'not_enough_value', ru: 'Не хватает контента', uk: 'Не вистачає контенту', es: 'Falta contenido' },
                { key: 'technical_issues', ru: 'Технические проблемы', uk: 'Технічні проблеми', es: 'Problemas técnicos' },
                { key: 'found_better_app', ru: 'Нашёл лучше приложение', uk: 'Знайшов краще застосунок', es: 'Encontré una app mejor' },
                { key: 'not_using_enough', ru: 'Пользуюсь редко', uk: 'Користуюсь рідко', es: 'Casi no la uso' },
                { key: 'other',            ru: 'Другое', uk: 'Інше', es: 'Otro motivo' },
              ] as { key: string; ru: string; uk: string; es: string }[]).map(item => (
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
                    {L(item.ru, item.uk, item.es)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={t.textGhost} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={{ marginTop: 20, paddingVertical: 14, alignItems: 'center', backgroundColor: t.bgPrimary, borderRadius: 14 }}
                onPress={() => { hapticTap(); setCancelSurveyVisible(false); }}
                activeOpacity={0.7}
              >
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                  {L('Остаться с Premium', 'Залишитись з Premium', 'Seguir con Premium')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScreenGradient>
    );
  }

  // ── Purchase view ─────────────────────────────────────────────────────────────
  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <Modal
            visible={exitTrialOfferVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setExitTrialOfferVisible(false)}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', justifyContent: 'flex-end' }}>
              <View
                style={{
                  backgroundColor: t.bgCard,
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
                    {L('Попробовать 3 дня бесплатно?', 'Спробувати 3 дні безкоштовно?', 'Probar 3 días gratis?')}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.body, lineHeight: 22, marginTop: 10, textAlign: 'center' }}>
                    {L(
                      'Магазин показывает trial для этого плана. Оплата начнется только после пробного периода, если не отменить подписку.',
                      'Магазин показує trial для цього плану. Оплата почнеться лише після пробного періоду, якщо не скасувати підписку.',
                      'La tienda ofrece prueba para este plan. El pago empieza solo después del periodo de prueba si no cancelas.',
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
                    logExitTrialOfferAccepted(ctx, exitTrialPlan);
                    void handlePurchase(exitTrialPlan);
                  }}
                >
                  <Text style={{ color: '#1F1A08', fontSize: f.bodyLg, fontWeight: '900' }}>
                    {L('Начать 3 дня бесплатно', 'Почати 3 дні безкоштовно', 'Empezar 3 días gratis')}
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
                    {L('Нет, продолжить бесплатно', 'Ні, продовжити безкоштовно', 'No, continuar gratis')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          <Animated.View style={{
            flex: 1,
            opacity: entranceOpacity,
            transform: [
              { translateY: entranceTranslateY },
              { scale: entranceScale },
            ],
          }}>
          <ScrollView
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
                    {L('Попробуй Premium 3 дня бесплатно', 'Спробуй Premium 3 дні безкоштовно', 'Prueba Premium 3 días gratis')}
                  </Text>
                </View>
                <Text
                  style={{ color: '#FFE07A', fontSize: f.caption, fontWeight: '600', marginTop: 4, textAlign: 'center' }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {L('Без списания сейчас • Отмена в любой момент', 'Без списання зараз • Скасування в будь-який час', 'Sin cargo ahora • Cancela cuando quieras')}
                </Text>
              </View>
            )}

            {/* БЛОК 0: Персонализированные теги — «зеркало опыта» юзера */}
            {personalizedTags.length > 0 && (
              <View style={{ marginBottom: 16, gap: 8 }}>
                <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>
                  {L('Почему Premium тебе нужен', 'Чому Premium тобі потрібен', 'Por qué necesitas Premium')}
                </Text>
                {personalizedTags.map((tag) => (
                  <View
                    key={tag.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: t.bgCard,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: t.border,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                    }}
                  >
                    <Text style={{ fontSize: 22, width: 30, textAlign: 'center' }}>{tag.emoji}</Text>
                    <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontWeight: '600', lineHeight: f.body * 1.45 }}>
                      {L(tag.ru, tag.uk, tag.es)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* БЛОК 1: Герой */}
            <Animated.View style={{ alignItems: 'center', marginBottom: 24, transform: [{ translateY: heroFloat }] }}>
              <View style={{ width: '100%', borderRadius: 22, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.textSecond + '35', paddingVertical: 20, paddingHorizontal: 16, alignItems: 'center', overflow: 'hidden' }}>
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    width: 180,
                    height: 180,
                    borderRadius: 90,
                    backgroundColor: t.textSecond,
                    opacity: heroGlow,
                    top: -60,
                  }}
                />
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    width: 240,
                    height: 120,
                    borderRadius: 120,
                    backgroundColor: t.correct,
                    opacity: heroGlow.interpolate({ inputRange: [0.35, 0.62], outputRange: [0.08, 0.16] }),
                    bottom: -70,
                  }}
                />
                <View style={{ backgroundColor: t.bgSurface + 'cc', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 12 }}>
                  <Text style={{ fontSize: 44 }}>{hero.emoji}</Text>
                </View>
                <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '800', textAlign: 'center', marginBottom: 8 }} adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={2}>
                  {L(hero.titleRu, hero.titleUk, hero.titleEs)}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: f.body * 1.55 }}>
                  {L(hero.subtitleRu, hero.subtitleUk, hero.subtitleEs)}
                </Text>
              </View>
            </Animated.View>

            {/* БЛОК 2: Что ты получишь */}
            <View style={{ marginBottom: 18, gap: 8 }}>
              <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {L('Что ты получишь', 'Що ти отримаєш', 'Lo que obtienes')}
              </Text>
              {benefits.map((b, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: t.bgCard,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: i === 0 ? t.correct + '66' : t.border,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    shadowColor: i === 0 ? t.correct : '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: i === 0 ? 0.22 : 0.1,
                    shadowRadius: 6,
                    elevation: i === 0 ? 4 : 1,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={18} color={t.correct} />
                  <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '600', flex: 1 }}>
                    {L(b.ru, b.uk, b.es)}
                  </Text>
                </View>
              ))}
            </View>

            {/* БЛОК 3: Персональная ценность */}
            <View style={{ marginBottom: 16, backgroundColor: t.bgCard, borderRadius: 14, borderWidth: 1, borderColor: t.textSecond + '55', padding: 14 }}>
              <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                {L('Для тебя сейчас', 'Для тебе зараз', 'Para ti ahora')}
              </Text>
              <Text style={{ color: t.textPrimary, fontSize: f.sub, lineHeight: f.sub * 1.45 }}>
                {personalValueLine}
              </Text>
            </View>

            {/* Сравнение free → Premium */}
            <View
              style={{
                marginBottom: 18,
                backgroundColor: t.bgSurface,
                borderRadius: 16,
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
                {L('Что меняется с Premium', 'Що змінюється з Premium', 'Qué cambia con Premium')}
              </Text>
              {PAYWALL_COMPARISON_ROWS.map((row, idx, arr) => {
                const freeL = L(row.freeRu, row.freeUk, row.freeEs);
                const title = L(row.titleRu, row.titleUk, row.titleEs);
                const prem1 = L(row.premRu, row.premUk, row.premEs);
                const hasPrem2 = row.premRu2 != null && row.premUk2 != null && row.premEs2 != null;
                const prem2 = hasPrem2 ? L(row.premRu2!, row.premUk2!, row.premEs2!) : '';
                const premTextStyle = {
                  color: PAYWALL_COMPARISON_PREMIUM_COLOR,
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
                    <Text style={{ width: 28, fontSize: 17, textAlign: 'center' }}>{row.emoji}</Text>
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
                  <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>{L('Заморозка цепочки', 'Заморозка стріку', 'Protección de racha')}</Text>
                  <Text style={{ color: t.textGhost, fontSize: 10, lineHeight: 13, marginTop: 1 }} numberOfLines={2}>
                    {L('Серия не сгорит при пропуске дня', 'Захисти серію — навіть якщо пропустив день', 'Protege tu racha aunque te saltes un día')}
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
                borderRadius: 16, padding: 18, marginBottom: 10,
                borderWidth: selected === 'yearly' ? 2 : 1,
                borderColor: selected === 'yearly' ? t.textSecond : t.border,
                backgroundColor: selected === 'yearly' ? t.bgSurface : t.bgCard,
                opacity: purchasing && selected !== 'yearly' ? 0.5 : 1,
                shadowColor: selected === 'yearly' ? t.textSecond : '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: selected === 'yearly' ? 0.32 : 0.08,
                shadowRadius: selected === 'yearly' ? 10 : 4,
                elevation: selected === 'yearly' ? 8 : 1,
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
                const periodLabel = L('/ год', '/ рік', '/ año');
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }} numberOfLines={2}>
                        {L('Годовая подписка', 'Річна підписка', 'Suscripción anual')}
                      </Text>
                      <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 3 }} numberOfLines={3}>
                        {L(
                          'Годовой доступ ко всем возможностям Premium',
                          'Річний доступ до всіх можливостей Premium',
                          'Acceso anual a todas las funciones Premium',
                        )}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', maxWidth: '44%', minWidth: 92 }}>
                      {trialReady ? (
                        <>
                          {/* Главный якорь — триал. Цена ниже мелким, но ЧИТАЕМЫМ цветом —
                              compliance с App Store 3.1.2 / Google Play (price must be clearly disclosed). */}
                          <Text style={{ color: t.correct, fontSize: f.numMd, fontWeight: '900', textAlign: 'right' }} adjustsFontSizeToFit numberOfLines={1}>
                            {L('Бесплатно', 'Безкоштовно', 'Gratis')}
                          </Text>
                           <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700', marginTop: 1, textAlign: 'right' }} numberOfLines={1}>
                            {L('на 3 дня', 'на 3 дні', 'durante 3 días')}
                          </Text>
                          <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 5, textAlign: 'right' }} numberOfLines={2}>
                            {L(`затем ${priceStr} ${periodLabel}`, `потім ${priceStr} ${periodLabel}`, `luego ${priceStr} ${periodLabel}`)}
                          </Text>
                        </>
                      ) : priceStr ? (
                        <>
                          <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '800', textAlign: 'right' }} adjustsFontSizeToFit numberOfLines={1}>
                            {priceStr}
                          </Text>
                          <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'right' }} numberOfLines={1}>
                            {periodLabel}
                          </Text>
                        </>
                      ) : (
                        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', textAlign: 'right' }} numberOfLines={2}>
                          {L('Загружаем цену...', 'Завантажуємо ціну...', 'Cargando precio...')}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })()}
              {selected === 'yearly' && (
                <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={16} color={t.correct} />
                  <Text style={{ flex: 1, minWidth: 0, color: t.correct, fontSize: f.caption, fontWeight: '700' }} numberOfLines={2}>
                    {L('Выбран самый выгодный план', 'Обрано найвигідніший план', 'Plan más rentable seleccionado')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Месячный */}
            <TouchableOpacity
              style={{
                borderRadius: 16, padding: 18, marginBottom: 20,
                borderWidth: selected === 'monthly' ? 2 : 1,
                borderColor: selected === 'monthly' ? t.textSecond : t.border,
                backgroundColor: selected === 'monthly' ? t.bgSurface : t.bgCard,
                opacity: purchasing && selected !== 'monthly' ? 0.5 : 1,
                shadowColor: selected === 'monthly' ? t.textSecond : '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: selected === 'monthly' ? 0.24 : 0.06,
                shadowRadius: selected === 'monthly' ? 8 : 4,
                elevation: selected === 'monthly' ? 6 : 1,
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
                const periodLabel = L('/ месяц', '/ місяць', '/mes');
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }} numberOfLines={2}>
                        {L('Ежемесячная подписка', 'Щомісячна підписка', 'Suscripción mensual')}
                      </Text>
                      <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 3 }} numberOfLines={3}>
                        {L(
                          'Месячный доступ ко всем возможностям Premium',
                          'Місячний доступ до всіх можливостей Premium',
                          'Acceso mensual a todas las funciones Premium',
                        )}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', maxWidth: '44%', minWidth: 92 }}>
                      {trialReady ? (
                        <>
                          <Text style={{ color: t.correct, fontSize: f.numMd, fontWeight: '900', textAlign: 'right' }} adjustsFontSizeToFit numberOfLines={1}>
                            {L('Бесплатно', 'Безкоштовно', 'Gratis')}
                          </Text>
                          <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700', marginTop: 1, textAlign: 'right' }} numberOfLines={1}>
                            {L('на 3 дня', 'на 3 дні', 'durante 3 días')}
                          </Text>
                          <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 5, textAlign: 'right' }} numberOfLines={2}>
                            {L(`затем ${priceStr} / месяц`, `потім ${priceStr} / місяць`, `luego ${priceStr} / mes`)}
                          </Text>
                        </>
                      ) : priceStr ? (
                        <>
                          <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '800', textAlign: 'right' }} adjustsFontSizeToFit numberOfLines={1}>
                            {priceStr}
                          </Text>
                          <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'right' }} numberOfLines={1}>{periodLabel}</Text>
                        </>
                      ) : (
                        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', textAlign: 'right' }} numberOfLines={2}>
                          {L('Загружаем цену...', 'Завантажуємо ціну...', 'Cargando precio...')}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })()}
              {selected === 'monthly' && (
                <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={16} color={t.correct} />
                  <Text style={{ flex: 1, minWidth: 0, color: t.correct, fontSize: f.caption, fontWeight: '700' }} numberOfLines={2}>
                    {L('Выбран гибкий ежемесячный план', 'Обрано гнучкий щомісячний план', 'Plan mensual flexible')}
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
                ? L('/год', '/рік', '/año')
                : L('/мес', '/міс', '/mes');
              const ctaLabel = !canPurchaseSelectedPlan
                ? L('Загружаем цены...', 'Завантажуємо ціни...', 'Cargando precios...')
                : hasTrial
                  ? L(
                      `🚀 3 дня бесплатно — затем ${ctaPrice}${periodStr}`,
                      `🚀 3 дні безкоштовно — потім ${ctaPrice}${periodStr}`,
                      `🚀 3 días gratis — luego ${ctaPrice}${periodStr}`,
                    )
                  : selected === 'yearly'
                    ? L('🚀 Получить Premium', '🚀 Отримати Premium', '🚀 Obtener Premium')
                    : L('🚀 Оформить месячную подписку', '🚀 Оформити місячну підписку', '🚀 Contratar suscripción mensual');
              return (
                <Animated.View style={{ transform: [{ scale: purchasing ? 1 : ctaPulse }] }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: t.textSecond, borderRadius: 16, padding: 18,
                    alignItems: 'center', marginBottom: 10,
                    opacity: purchasing || !canPurchaseSelectedPlan ? 0.7 : 1,
                    shadowColor: t.textSecond,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.5,
                    shadowRadius: 12,
                    elevation: 8,
                  }}
                  onPress={() => {
                    hapticTap();
                    logPaywallPlanSelectDeduped(selected);
                    logPaywallCtaClick(ctx, selected);
                    handlePurchase(selected);
                  }}
                  activeOpacity={0.85}
                  disabled={purchasing || !canPurchaseSelectedPlan}
                >
                  <Text style={{ color: t.correctText, fontSize: f.h2, fontWeight: '800' }} adjustsFontSizeToFit numberOfLines={1}>
                    {ctaLabel}
                  </Text>
                </TouchableOpacity>
                </Animated.View>
              );
            })()}

            {/* Мелкие хуки */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
              {primaryHasTrialOffer && (
                <Text style={{ color: t.textGhost, fontSize: f.label }}>
                  {L('✓ Без списания сейчас', '✓ Без списання зараз', '✓ Sin cobro ahora')}
                </Text>
              )}
              <Text style={{ color: t.textGhost, fontSize: f.label }}>
                {L('✓ Отмена в любой момент', '✓ Скасування в будь-який час', '✓ Cancela cuando quieras')}
              </Text>
            </View>

            {/* Восстановить */}
            <TouchableOpacity
              style={{ paddingVertical: 10, alignItems: 'center' }}
              onPress={() => { hapticTap(); handleRestore(); }}
              disabled={restoring}
            >
              <Text style={{ color: restoring ? t.textGhost : t.textSecond, fontSize: f.body }}>
                {L('Восстановить подписку', 'Відновити підписку', 'Restaurar suscripción')}
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
                {L('Продолжить бесплатно', 'Продовжити безкоштовно', 'Continuar gratis')}
              </Text>
            </TouchableOpacity>

            {(() => {
              const footerPrice = selected === 'yearly' ? yearlyPrice : monthlyPrice;
              if (!footerPrice) {
                return (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center', lineHeight: 18 }}>
                      {L(
                        'Загружаем актуальные цены из магазина приложений.',
                        'Завантажуємо актуальні ціни з магазину застосунків.',
                        'Cargando precios actuales desde la tienda de apps.',
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

              return (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center', lineHeight: 18 }}>
                    {lang === 'uk'
                      ? (
                          ios ? (
                            <>
                              Оформлюється{' '}
                              <Text style={{ fontWeight: '700', color: t.textMuted }}>{footerPeriodUk}</Text>
                              {' '}із автоматичним поновленням. Оплата знімається з Apple ID за тарифами App Store для вашого регіону (сума{' '}
                              <Text style={{ fontWeight: '700', color: t.textMuted }}>{footerPrice}</Text>
                              {' '}на екрані). Скасувати можна в будь-який момент:{' '}
                              <Text style={{ fontWeight: '600' }}>Налаштування → Apple ID → Підписки</Text>.
                            </>
                          ) : (
                            <>
                              Оформлюється{' '}
                              <Text style={{ fontWeight: '700', color: t.textMuted }}>{footerPeriodUk}</Text>
                              {' '}із автоматичним поновленням. Оплата через Google Play для вашого регіону (сума{' '}
                              <Text style={{ fontWeight: '700', color: t.textMuted }}>{footerPrice}</Text>
                              {' '}на екрані). Скасувати:{' '}
                              <Text style={{ fontWeight: '600' }}>Google Play → Підписки</Text>.
                            </>
                          )
                        )
                      : lang === 'es'
                        ? (
                            ios ? (
                              <>
                                Contratas la{' '}
                                <Text style={{ fontWeight: '700', color: t.textMuted }}>{footerPeriodEs}</Text>
                                {' '}con renovación automática. El cobro se hace en tu Apple ID según los precios del App Store de tu zona ({' '}
                                <Text style={{ fontWeight: '700', color: t.textMuted }}>{footerPrice}</Text>
                                {' '}según pantalla). Puedes cancelar cuando quieras:{' '}
                                <Text style={{ fontWeight: '600' }}>Ajustes → Apple ID → Suscripciones</Text>.
                              </>
                            ) : (
                              <>
                                Contratas la{' '}
                                <Text style={{ fontWeight: '700', color: t.textMuted }}>{footerPeriodEs}</Text>
                                {' '}con renovación automática. Pago vía Google Play en tu zona ({' '}
                                <Text style={{ fontWeight: '700', color: t.textMuted }}>{footerPrice}</Text>
                                {' '}según pantalla). Cancelación:{' '}
                                <Text style={{ fontWeight: '600' }}>Google Play → Suscripciones</Text>.
                              </>
                            )
                          )
                        : ios ? (
                            <>
                              Оформляется{' '}
                              <Text style={{ fontWeight: '700', color: t.textMuted }}>{footerPeriodRu}</Text>
                              {' '}с автопродлением. Списание с Apple ID по тарифам App Store для вашего региона (сумма{' '}
                              <Text style={{ fontWeight: '700', color: t.textMuted }}>{footerPrice}</Text>
                              {' '}на экране). Отменить можно в любой момент:{' '}
                              <Text style={{ fontWeight: '600' }}>Настройки → Apple ID → Подписки</Text>.
                            </>
                          ) : (
                            <>
                              Оформляется{' '}
                              <Text style={{ fontWeight: '700', color: t.textMuted }}>{footerPeriodRu}</Text>
                              {' '}с автопродлением. Оплата через Google Play для вашего региона (сумма{' '}
                              <Text style={{ fontWeight: '700', color: t.textMuted }}>{footerPrice}</Text>
                              {' '}на экране). Отмена:{' '}
                              <Text style={{ fontWeight: '600' }}>Google Play → Подписки</Text>.
                            </>
                          )}
                  </Text>
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
                      {L(trialRu, trialUk, trialEs)}
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
                    {L(
                      'Ссылки Privacy Policy и Terms of Use ниже дополняют условия покупки в магазине приложений.',
                      'Посилання Privacy Policy та Terms of Use нижче доповнюють умови покупки в магазині застосунків.',
                      'Privacy Policy y Terms of Use enlazan abajo y completan los términos de compra en la tienda de apps.',
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
                })}
              />
            </View>
          </ScrollView>
          </Animated.View>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
