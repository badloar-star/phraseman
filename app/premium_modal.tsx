import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  ScrollView, Animated, Linking, Modal, Easing, StyleSheet,
  Platform,
  TextInput,
  Image,
  ImageBackground,
  type ImageSourcePropType,
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
import EnergyIcon from '../components/EnergyIcon';
import ContentWrap from '../components/ContentWrap';
import ReportErrorButton from '../components/ReportErrorButton';
import ScreenGradient from '../components/ScreenGradient';
import { paywallGlassColor } from '../components/paywallGlass';
import MatchFoundToast from '../components/MatchFoundToast';
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
import type { ThemeMode } from '../constants/theme';
import { oskolokImageForPackShards } from './oskolok';

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

const isEnergyGlyph = (value: string) => value.codePointAt(0) === 0x26A1;

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

const PREMIUM_CONTEXT_VALUES = [
  'arena',
  'no_energy',
  'course_after_lesson3',
  'lesson_b1',
  'quiz_limit',
  'quiz_level',
  'quiz_medium',
  'quiz_hard',
  'flashcard_limit',
  'streak',
  'theme',
  'club',
  'trainer',
  'trainer_limit',
  'diagnosis_training',
  'mastery',
  'stats',
  'heatmap',
  'patterns',
  'percentiles',
  'generic',
] as const satisfies readonly PremiumContext[];
const PREMIUM_CONTEXT_SET = new Set<string>(PREMIUM_CONTEXT_VALUES);

const PREMIUM_HERO_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/paywalls/premium_hero/premium-hero-dark.webp'),
  neon: require('../assets/images/paywalls/premium_hero/premium-hero-neon.webp'),
  gold: require('../assets/images/paywalls/premium_hero/premium-hero-gold.webp'),
  coral: require('../assets/images/paywalls/premium_hero/premium-hero-coral.webp'),
  minimalLight: require('../assets/images/paywalls/premium_hero/premium-hero-minimal-light.webp'),
  minimalDark: require('../assets/images/paywalls/premium_hero/premium-hero-minimal-dark.webp'),
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
  diagnosis_training: { accent: '#5EEAD4', accent2: '#60A5FA', shardAmount: 180 },
  mastery: { accent: '#86EFAC', accent2: '#FDE68A', shardAmount: 420 },
  stats: { accent: '#60A5FA', accent2: '#FDE68A', shardAmount: 180 },
  heatmap: { accent: '#34D399', accent2: '#A3E635', shardAmount: 180 },
  patterns: { accent: '#F87171', accent2: '#C084FC', shardAmount: 180 },
  percentiles: { accent: '#FACC15', accent2: '#38BDF8', shardAmount: 420 },
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
  subtitleRu: 'Первые 3 урока открыты бесплатно. Premium открывает весь текущий уровень: все уроки доступны сразу, без блокировок по результату. Следующие уровни открываются через экзамены.',
  subtitleUk: 'Перші 3 уроки відкриті безкоштовно. Premium відкриває весь поточний рівень: усі уроки доступні одразу, без блокувань за результатом. Наступні рівні відкриваються через екзамени.',
  subtitleEs: 'Las primeras 3 lecciones son gratis. Premium abre todo tu nivel actual: todas las lecciones disponibles al instante, sin bloqueos por resultado. Los siguientes niveles se abren con exámenes.',
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
    'pt-BR': 'As 3 primeiras lições são grátis. Premium abre todo o nível atual: todas as lições disponíveis na hora, sem bloqueios por resultado. Os próximos níveis abrem por exames.',
    vi: '3 bài đầu tiên miễn phí. Premium mở toàn bộ cấp hiện tại: mọi bài học có ngay, không bị khóa theo kết quả. Các cấp tiếp theo mở qua bài kiểm tra.',
    id: '3 pelajaran pertama gratis. Premium membuka seluruh level saat ini: semua pelajaran langsung tersedia, tanpa kunci dari hasil. Level berikutnya dibuka lewat ujian.',
    tr: 'İlk 3 ders ücretsiz. Premium mevcut seviyenin tamamını açar: tüm dersler hemen erişilir, sonuç engeli yoktur. Sonraki seviyeler sınavlarla açılır.',
    pl: 'Pierwsze 3 lekcje są darmowe. Premium otwiera cały obecny poziom: wszystkie lekcje od razu, bez blokad za wynik. Kolejne poziomy otwierają się przez egzaminy.',
  },
};

function normalizePremiumContext(raw: string | string[] | undefined): PremiumContext {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return 'generic';
  if (value === 'hall_of_fame') return 'generic';
  if (value === 'lesson_b1') return 'course_after_lesson3';
  if (value === 'trainer_smart_mix' || value === 'smart_trainer') return 'trainer';
  if (value === 'avatar_aura') return 'theme';
  return PREMIUM_CONTEXT_SET.has(value) ? (value as PremiumContext) : 'generic';
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
    titleRu: 'Тренер доступен 1 раз в день',
    titleUk: 'Тренер доступний 1 раз на день',
    titleEs: 'El Entrenador está disponible 1 vez al día',
    subtitleRu: 'В бесплатной версии можно начать одну сессию в день. Premium открывает безлимит повторений во всех режимах.',
    subtitleUk: 'У безкоштовній версії можна почати одну сесію на день. Premium відкриває безліміт повторень у всіх режимах.',
    subtitleEs: 'En la versión gratis puedes iniciar una sesión al día. Premium desbloquea repeticiones ilimitadas en todos los modos.',
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

const PAYWALL_PLANNED_COPY: Record<PremiumContext, PremiumPlannedHeroCopy> = {
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
    title: { 'pt-BR': 'Você já usou os 3 quizzes grátis de hoje', vi: 'Bạn đã dùng 3 quiz miễn phí hôm nay', id: '3 kuis gratis hari ini sudah dipakai', tr: 'Bugünkü 3 ücretsiz quiz kullanıldı', pl: '3 darmowe quizy na dziś są już użyte' },
    subtitle: {
      'pt-BR': 'A conta grátis tem 3 quizzes fáceis por dia. Premium remove o limite diário e abre os níveis médio e difícil.',
      vi: 'Tài khoản miễn phí có 3 quiz dễ mỗi ngày. Premium bỏ giới hạn hằng ngày và mở mức trung bình, khó.',
      id: 'Akun gratis mendapat 3 kuis mudah per hari. Premium menghapus batas harian dan membuka level sedang serta sulit.',
      tr: 'Ücretsiz hesapta günde 3 kolay quiz var. Premium günlük sınırı kaldırır ve orta ile zor seviyeleri açar.',
      pl: 'Darmowe konto ma 3 łatwe quizy dziennie. Premium usuwa limit dzienny i otwiera poziom średni oraz trudny.',
    },
  },
  quiz_level: {
    title: { 'pt-BR': 'Você está pronto para o próximo nível', vi: 'Bạn đã sẵn sàng cho cấp tiếp theo', id: 'Kamu siap untuk level berikutnya', tr: 'Sonraki seviyeye hazırsın', pl: 'Jesteś gotowy na kolejny poziom' },
    subtitle: {
      'pt-BR': 'Acesse uma prática mais forte e acelere seu avanço no idioma.',
      vi: 'Mở phần luyện tập mạnh hơn và tăng tốc kỹ năng ngôn ngữ.',
      id: 'Buka latihan yang lebih kuat dan percepat perkembangan bahasa.',
      tr: 'Daha güçlü pratik aç ve dil gelişimini hızlandır.',
      pl: 'Otwórz mocniejszą praktykę i przyspiesz rozwój języka.',
    },
  },
  quiz_medium: {
    title: { 'pt-BR': 'Dificuldade média: mais progresso', vi: 'Mức trung bình: tiến bộ mạnh hơn', id: 'Tingkat sedang: progres lebih kuat', tr: 'Orta seviye: daha güçlü ilerleme', pl: 'Średni poziom: mocniejszy postęp' },
    subtitle: {
      'pt-BR': 'Quizzes médios dão mais prática, fixam melhor o conteúdo e aceleram o progresso.',
      vi: 'Quiz trung bình cho nhiều luyện tập hơn, củng cố sâu hơn và tăng tốc tiến bộ.',
      id: 'Kuis sedang memberi lebih banyak latihan, memperkuat materi, dan mempercepat progres.',
      tr: 'Orta quizler daha çok pratik sağlar, konuyu daha iyi pekiştirir ve ilerlemeyi hızlandırır.',
      pl: 'Średnie quizy dają więcej praktyki, lepiej utrwalają materiał i przyspieszają postęp.',
    },
  },
  quiz_hard: {
    title: { 'pt-BR': 'Nível difícil: máximo crescimento', vi: 'Mức khó: tăng trưởng tối đa', id: 'Level sulit: pertumbuhan maksimal', tr: 'Zor seviye: maksimum gelişim', pl: 'Trudny poziom: maksymalny wzrost' },
    subtitle: {
      'pt-BR': 'Quizzes Hard ajudam a sair do platô e ganhar domínio mais confiante do idioma.',
      vi: 'Quiz Hard giúp bạn vượt giai đoạn chững lại và dùng ngôn ngữ tự tin hơn.',
      id: 'Kuis Hard membantu keluar dari plateau dan menguasai bahasa dengan lebih percaya diri.',
      tr: 'Hard quizler platodan çıkmana ve dili daha özgüvenli kullanmana yardım eder.',
      pl: 'Quizy Hard pomagają wyjść z plateau i szybciej zbudować pewniejsze użycie języka.',
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
    title: { 'pt-BR': 'A sessão do Treinador foi usada', vi: 'Bạn đã dùng phiên Huấn luyện viên', id: 'Sesi Trainer sudah dipakai', tr: 'Antrenör seansı kullanıldı', pl: 'Sesja Trenera została użyta' },
    subtitle: {
      'pt-BR': 'Free: 1 sessão por dia. Premium: repetições ilimitadas em todos os modos.',
      vi: 'Miễn phí: 1 phiên mỗi ngày. Premium: ôn tập không giới hạn ở mọi chế độ.',
      id: 'Gratis: 1 sesi per hari. Premium: pengulangan tanpa batas di semua mode.',
      tr: 'Ücretsiz: günde 1 seans. Premium: tüm modlarda sınırsız tekrar.',
      pl: 'Free: 1 sesja dziennie. Premium: powtórki bez limitu we wszystkich trybach.',
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

const CONTEXT_BENEFITS: Record<PremiumContext, ({ ru: string; uk: string; es: string } & PremiumPlannedCopy)[]> = {
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
    { ru: 'Доступ к более сильной практике', uk: 'Доступ до сильнішої практики', es: 'Acceso a una práctica más exigente', 'pt-BR': 'Acesso a uma prática mais forte', vi: 'Mở luyện tập mạnh hơn', id: 'Akses ke latihan yang lebih kuat', tr: 'Daha güçlü pratiğe erişim', pl: 'Dostęp do mocniejszej praktyki' },
    { ru: 'Быстрее рост языкового навыка', uk: 'Швидше зростання мовної навички', es: 'Progreso del idioma más rápido', 'pt-BR': 'Crescimento mais rápido da habilidade', vi: 'Kỹ năng ngôn ngữ tăng nhanh hơn', id: 'Kemampuan bahasa tumbuh lebih cepat', tr: 'Dil becerisi daha hızlı gelişir', pl: 'Szybszy wzrost umiejętności językowej' },
    { ru: 'Меньше ощущения плато', uk: 'Менше відчуття плато', es: 'Menos sensación de estancamiento', 'pt-BR': 'Menos sensação de platô', vi: 'Ít cảm giác chững lại hơn', id: 'Lebih sedikit rasa plateau', tr: 'Daha az plato hissi', pl: 'Mniej poczucia plateau' },
  ],
  quiz_medium: [
    { ru: 'Сложнее задания и богаче контексты', uk: 'Складніші завдання і багатші контексти', es: 'Ejercicios más ricos en contexto', 'pt-BR': 'Tarefas mais ricas em contexto', vi: 'Bài tập khó hơn và nhiều ngữ cảnh hơn', id: 'Tugas lebih sulit dan konteks lebih kaya', tr: 'Daha zor görevler ve daha zengin bağlamlar', pl: 'Trudniejsze zadania i bogatsze konteksty' },
    { ru: 'Глубже закрепление материала', uk: 'Глибше закріплення матеріалу', es: 'Consolidación más profunda', 'pt-BR': 'Fixação mais profunda do conteúdo', vi: 'Củng cố kiến thức sâu hơn', id: 'Materi lebih melekat', tr: 'Konuyu daha derin pekiştirme', pl: 'Głębsze utrwalenie materiału' },
    { ru: 'Сильнее прогресс каждую неделю', uk: 'Сильніший прогрес щотижня', es: 'Progreso más marcado cada semana', 'pt-BR': 'Progresso mais forte a cada semana', vi: 'Tiến bộ rõ hơn mỗi tuần', id: 'Progres lebih kuat tiap minggu', tr: 'Her hafta daha güçlü ilerleme', pl: 'Silniejszy postęp co tydzień' },
  ],
  quiz_hard: [
    { ru: 'Hard-уровень для максимального роста', uk: 'Hard-рівень для максимального росту', es: 'Nivel difícil para el máximo rendimiento', 'pt-BR': 'Nível Hard para máximo crescimento', vi: 'Mức Hard để tăng trưởng tối đa', id: 'Level Hard untuk pertumbuhan maksimal', tr: 'Maksimum gelişim için Hard seviye', pl: 'Poziom Hard dla maksymalnego wzrostu' },
    { ru: 'Выход из языкового плато', uk: 'Вихід з мовного плато', es: 'Sales del plató del idioma', 'pt-BR': 'Saída do platô do idioma', vi: 'Thoát khỏi giai đoạn chững của ngôn ngữ', id: 'Keluar dari plateau bahasa', tr: 'Dil platosundan çıkış', pl: 'Wyjście z językowego plateau' },
    { ru: 'Быстрее уверенное владение языком', uk: 'Швидше впевнене володіння мовою', es: 'Dominio del idioma con más soltura', 'pt-BR': 'Domínio mais confiante mais rápido', vi: 'Tự tin dùng ngôn ngữ nhanh hơn', id: 'Penguasaan bahasa lebih percaya diri', tr: 'Daha hızlı ve güvenli dil kullanımı', pl: 'Szybsze, pewniejsze użycie języka' },
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
    { ru: 'Новые ошибки превращаются в точные персональные разборы', uk: 'Нові помилки перетворюються на точні персональні розбори', es: 'Cada error nuevo se convierte en un análisis personal preciso', 'pt-BR': 'Novos erros viram análises pessoais precisas', vi: 'Lỗi mới biến thành phân tích cá nhân chính xác', id: 'Kesalahan baru jadi analisis personal yang tepat', tr: 'Yeni hatalar net kişisel analizlere dönüşür', pl: 'Nowe błędy zmieniają się w dokładne analizy osobiste' },
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
    freeRu: 'Уроки 1–3',
    freeUk: 'Уроки 1–3',
    freeEs: 'Lecciones 1–3',
    freePlanned: { 'pt-BR': 'Lições 1–3', vi: 'Bài 1–3', id: 'Pelajaran 1–3', tr: '1–3. dersler', pl: 'Lekcje 1–3' },
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
    ru: 'Квизы доступны на уровнях Medium и Hard, а не только Easy.',
    uk: 'Квізи доступні на рівнях Medium і Hard, а не лише Easy.',
    es: 'Los quizzes están disponibles en Medium y Hard, no solo en Easy.',
    'pt-BR': 'Os quizzes ficam disponíveis em Medium e Hard, não só em Easy.',
    vi: 'Quiz có ở mức Medium và Hard, không chỉ Easy.',
    id: 'Kuis tersedia di Medium dan Hard, bukan hanya Easy.',
    tr: 'Quizler yalnızca Easy değil, Medium ve Hard seviyelerinde de açılır.',
    pl: 'Quizy są dostępne na poziomach Medium i Hard, nie tylko Easy.',
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
  { ru: 'Без дневного лимита на легкие квизы', uk: 'Без денного ліміту на легкі квізи', es: 'Sin límite diario en cuestionarios fáciles', 'pt-BR': 'Sem limite diário para quizzes fáceis', vi: 'Không giới hạn quiz dễ mỗi ngày', id: 'Tanpa batas harian untuk kuis mudah', tr: 'Kolay quizlerde günlük sınır yok', pl: 'Bez dziennego limitu łatwych quizów' },
  { ru: 'Средний и сложный уровни открыты', uk: 'Середній і складний рівні відкриті', es: 'Niveles medio y difícil desbloqueados', 'pt-BR': 'Níveis médio e difícil desbloqueados', vi: 'Mở mức trung bình và khó', id: 'Level sedang dan sulit terbuka', tr: 'Orta ve zor seviyeler açılır', pl: 'Poziom średni i trudny odblokowane' },
  { ru: 'Больше практики и XP каждый день', uk: 'Більше практики та XP щодня', es: 'Más práctica y XP cada día', 'pt-BR': 'Mais prática e XP todos os dias', vi: 'Thêm luyện tập và XP mỗi ngày', id: 'Lebih banyak latihan dan XP tiap hari', tr: 'Her gün daha fazla pratik ve XP', pl: 'Więcej praktyki i XP każdego dnia' },
];

const CONTEXT_BENEFITS_PLANNED: Record<PremiumContext, PremiumPlannedCopy[]> = {
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
    { 'pt-BR': 'Sem limite diário para quizzes fáceis', vi: 'Không giới hạn quiz dễ mỗi ngày', id: 'Tanpa batas harian untuk kuis mudah', tr: 'Kolay quizlerde günlük sınır yok', pl: 'Bez dziennego limitu łatwych quizów' },
    { 'pt-BR': 'Níveis médio e difícil desbloqueados', vi: 'Mở mức trung bình và khó', id: 'Level sedang dan sulit terbuka', tr: 'Orta ve zor seviyeler açılır', pl: 'Poziom średni i trudny odblokowane' },
    { 'pt-BR': 'Mais prática e XP todos os dias', vi: 'Thêm luyện tập và XP mỗi ngày', id: 'Lebih banyak latihan dan XP tiap hari', tr: 'Her gün daha fazla pratik ve XP', pl: 'Więcej praktyki i XP każdego dnia' },
  ],
  quiz_level: [
    { 'pt-BR': 'Acesso a uma prática mais forte', vi: 'Mở luyện tập mạnh hơn', id: 'Akses ke latihan yang lebih kuat', tr: 'Daha güçlü pratiğe erişim', pl: 'Dostęp do mocniejszej praktyki' },
    { 'pt-BR': 'Crescimento mais rápido da habilidade', vi: 'Kỹ năng ngôn ngữ tăng nhanh hơn', id: 'Kemampuan bahasa tumbuh lebih cepat', tr: 'Dil becerisi daha hızlı gelişir', pl: 'Szybszy wzrost umiejętności językowej' },
    { 'pt-BR': 'Menos sensação de platô', vi: 'Ít cảm giác chững lại hơn', id: 'Lebih sedikit rasa plateau', tr: 'Daha az plato hissi', pl: 'Mniej poczucia plateau' },
  ],
  quiz_medium: [
    { 'pt-BR': 'Tarefas mais ricas em contexto', vi: 'Bài tập khó hơn và nhiều ngữ cảnh hơn', id: 'Tugas lebih sulit dan konteks lebih kaya', tr: 'Daha zor görevler ve daha zengin bağlamlar', pl: 'Trudniejsze zadania i bogatsze konteksty' },
    { 'pt-BR': 'Fixação mais profunda do conteúdo', vi: 'Củng cố kiến thức sâu hơn', id: 'Materi lebih melekat', tr: 'Konuyu daha derin pekiştirme', pl: 'Głębsze utrwalenie materiału' },
    { 'pt-BR': 'Progresso mais forte a cada semana', vi: 'Tiến bộ rõ hơn mỗi tuần', id: 'Progres lebih kuat tiap minggu', tr: 'Her hafta daha güçlü ilerleme', pl: 'Silniejszy postęp co tydzień' },
  ],
  quiz_hard: [
    { 'pt-BR': 'Nível Hard para máximo crescimento', vi: 'Mức Hard để tăng trưởng tối đa', id: 'Level Hard untuk pertumbuhan maksimal', tr: 'Maksimum gelişim için Hard seviye', pl: 'Poziom Hard dla maksymalnego wzrostu' },
    { 'pt-BR': 'Saída do platô do idioma', vi: 'Thoát khỏi giai đoạn chững của ngôn ngữ', id: 'Keluar dari plateau bahasa', tr: 'Dil platosundan çıkış', pl: 'Wyjście z językowego plateau' },
    { 'pt-BR': 'Domínio mais confiante mais rápido', vi: 'Tự tin dùng ngôn ngữ nhanh hơn', id: 'Penguasaan bahasa lebih percaya diri', tr: 'Daha hızlı ve güvenli dil kullanımı', pl: 'Szybsze, pewniejsze użycie języka' },
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

function getContextBenefitPlanned(ctx: PremiumContext, index: number): PremiumPlannedCopy {
  const rows = CONTEXT_BENEFITS_PLANNED[ctx] ?? CONTEXT_BENEFITS_PLANNED.generic;
  return rows[index] ?? CONTEXT_BENEFITS_PLANNED.generic[Math.min(index, CONTEXT_BENEFITS_PLANNED.generic.length - 1)];
}

function getPersonalValueLine(ctx: PremiumContext, streakDays: number, lessonsDone: number, savedCards: number, lang: Lang): string {
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
const UNLOCK_ITEMS: ({ icon: string; textRu: string; textUk: string; textEs: string } & PremiumPlannedCopy)[] = [
  { icon: '⚡', textRu: 'Безлимитная энергия', textUk: 'Необмежена енергія', textEs: 'Energía ilimitada', 'pt-BR': 'Energia ilimitada', vi: 'Năng lượng không giới hạn', id: 'Energi tanpa batas', tr: 'Sınırsız enerji', pl: 'Nieograniczona energia' },
  { icon: '🎓', textRu: 'Уровень целиком без замков', textUk: 'Рівень повністю без замків', textEs: 'Nivel completo sin candados', 'pt-BR': 'Nível completo sem bloqueios', vi: 'Toàn bộ cấp không bị khóa', id: 'Level penuh tanpa kunci', tr: 'Kilitsiz tam seviye', pl: 'Cały poziom bez blokad' },
  { icon: '🧠', textRu: 'Квиз Средний', textUk: 'Квіз Середній', textEs: 'Quiz medio', 'pt-BR': 'Quiz médio', vi: 'Quiz trung bình', id: 'Kuis sedang', tr: 'Orta quiz', pl: 'Quiz średni' },
  { icon: '💜', textRu: 'Квиз Сложный', textUk: 'Квіз Складний', textEs: 'Quiz difícil', 'pt-BR': 'Quiz difícil', vi: 'Quiz khó', id: 'Kuis sulit', tr: 'Zor quiz', pl: 'Quiz trudny' },
  { icon: '🎨', textRu: 'Темы Forest и Neon', textUk: 'Теми Forest і Neon', textEs: 'Temas Forest y Neon', 'pt-BR': 'Temas Forest e Neon', vi: 'Chủ đề Forest và Neon', id: 'Tema Forest dan Neon', tr: 'Forest ve Neon temaları', pl: 'Motywy Forest i Neon' },
  { icon: '❄️', textRu: 'Заморозка цепочки', textUk: 'Заморозка стріку', textEs: 'Protección de racha', 'pt-BR': 'Proteção de sequência', vi: 'Bảo vệ chuỗi ngày', id: 'Perlindungan streak', tr: 'Seri koruması', pl: 'Ochrona serii' },
  { icon: '📚', textRu: 'Безлимитные карточки', textUk: 'Безліміт карток', textEs: 'Tarjetas ilimitadas', 'pt-BR': 'Cartões ilimitados', vi: 'Thẻ không giới hạn', id: 'Kartu tanpa batas', tr: 'Sınırsız kartlar', pl: 'Nieograniczone fiszki' },
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
  const { theme: t, themeMode, f } = useTheme();
  const paywallCardBg = paywallGlassColor(t.bgCard, themeMode, 'card');
  const paywallSurfaceBg = paywallGlassColor(t.bgSurface, themeMode, 'surface');
  const paywallSurface2Bg = paywallGlassColor(t.bgSurface2, themeMode, 'soft');
  const paywallPrimaryBg = paywallGlassColor(t.bgPrimary, themeMode, 'primary');
  const paywallChromeBg = paywallGlassColor(t.bgCard, themeMode, 'chrome');
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
        isPremium
      />
    </View>
  );
  const renderPremiumShardGlyph = (size: number, width = size, amount = 0) => (
    <View style={{ width, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={oskolokImageForPackShards(amount, themeMode)}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );

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
  const heroPlanned = getHeroPlannedCopy(ctx, savedCards);
  const benefits = CONTEXT_BENEFITS[ctx] ?? CONTEXT_BENEFITS.generic;
  const heroBackdrop = PREMIUM_HERO_BACKDROPS[themeMode] ?? PREMIUM_HERO_BACKDROPS.minimalDark;
  const heroArt = PREMIUM_HERO_ART[ctx] ?? PREMIUM_HERO_ART.generic;
  const heroScrim = premiumHeroScrim(themeMode);
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
        if (isPremium) {
          const effectivePlan = plan ?? 'yearly';
          setIsAdminGrantedPremium(isAdmin);
          setActivePlan(effectivePlan);
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
      emitAppEvent('streak_freeze_updated', { active: true });
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
      <PremiumScreenShell>
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
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: paywallChromeBg, justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="close" size={20} color={t.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 12, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
            {/* Header badge */}
            <Animated.View style={{ alignItems: 'center', transform: [{ scale: successScale }], opacity: successOpacity, marginBottom: 28 }}>
              <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: t.correct + '22', borderWidth: 2, borderColor: t.correct, justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}>
                {renderPremiumShardGlyph(62)}
              </View>
              <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '800', textAlign: 'center' }}>
                {LP('Premium активирован! 🎉', 'Premium активовано! 🎉', '¡Premium activado! 🎉', {
                  'pt-BR': 'Premium ativado! 🎉',
                  vi: 'Đã kích hoạt Premium! 🎉',
                  id: 'Premium aktif! 🎉',
                  tr: 'Premium etkinleştirildi! 🎉',
                  pl: 'Premium aktywowany! 🎉',
                })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 6 }}>
                {LP('Открываем все возможности…', 'Відкриваємо всі можливості…', 'Abriendo todas las funciones…', {
                  'pt-BR': 'Abrindo todos os recursos…',
                  vi: 'Đang mở tất cả tính năng…',
                  id: 'Membuka semua fitur…',
                  tr: 'Tüm özellikler açılıyor…',
                  pl: 'Otwieramy wszystkie funkcje…',
                })}
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
                        backgroundColor: paywallCardBg,
                        borderRadius: 14,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: t.correct + '55',
                        gap: 12,
                        minHeight: 62,
                      }}>
                        {isEnergyGlyph(item.icon)
                          ? renderPremiumEnergyGlyph(30)
                          : <Text style={{ fontSize: 26 }}>{item.icon}</Text>}
                        <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '600' }}>
                          {LP(item.textRu, item.textUk, item.textEs, item)}
                        </Text>
                      </View>

                      {/* Gray overlay — fades out on unlock */}
                      <Animated.View
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: paywallCardBg,
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
                  {LP('Начать учиться →', 'Почати навчання →', 'Empezar a aprender →', {
                    'pt-BR': 'Começar a aprender →',
                    vi: 'Bắt đầu học →',
                    id: 'Mulai belajar →',
                    tr: 'Öğrenmeye başla →',
                    pl: 'Zacznij naukę →',
                  })}
                </Text>
              </TouchableOpacity>
            )}
            <View style={{ height: 32 }} />
          </ScrollView>
        </SafeAreaView>
      </PremiumScreenShell>
    );
  }

  // ── Manage view ─────────────────────────────────────────────────────────────
  if (viewMode === 'manage' && !activePlan) {
    return (
      <PremiumScreenShell>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14 }}>
              <TouchableOpacity
                onPress={() => { hapticTap(); goBack(); }}
                style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: paywallChromeBg, borderWidth: 1, borderColor: t.border }}
                activeOpacity={0.82}
              >
                <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
              </TouchableOpacity>
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
      vi: 'khong co ngay het han',
      id: 'tanpa tanggal akhir',
      tr: 'bitis tarihi yok',
      pl: 'bez daty koncowej',
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
      <PremiumScreenShell>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14 }}>
              <TouchableOpacity
                onPress={() => { hapticTap(); goBack(); }}
                style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: paywallChromeBg, borderWidth: 1, borderColor: t.border }}
                activeOpacity={0.82}
              >
                <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
              </TouchableOpacity>
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
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 28, gap: 16 }}>
              <View style={refinedCard}>
                <LinearGradient
                  colors={[paywallSurfaceBg, paywallCardBg, paywallSurface2Bg]}
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
                              'pt-BR': 'Este e acesso de admin, nao uma nova compra na loja.',
                              vi: 'Day la quyen truy cap admin, khong phai giao dich moi trong cua hang.',
                              id: 'Ini akses admin, bukan pembelian toko baru.',
                              tr: 'Bu admin erisimi, magazada yeni satin alma degil.',
                              pl: 'To dostep admina, nie nowy zakup w sklepie.',
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
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: premiumGoldSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: premiumBorder }}>
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
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: premiumGoldSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: premiumBorder, marginTop: 1 }}>
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

              {!cancelled && !isAdminGrantedPremium && (
                <TouchableOpacity
                  onPress={() => { hapticTap(); openManageWithToast(); }}
                  activeOpacity={0.86}
                  style={{ borderRadius: 18, ...premiumShadow }}
                >
                  <LinearGradient
                    colors={[paywallSurfaceBg, paywallCardBg]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 18, borderWidth: 1, borderColor: premiumHairline, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: premiumGoldSoft, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="swap-horizontal-outline" size={20} color={premiumGold} />
                      </View>
                      <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>{LP('Сменить план', 'Змінити план', 'Cambiar plan', {
                        'pt-BR': 'Trocar plano',
                        vi: 'Đổi gói',
                        id: 'Ubah paket',
                        tr: 'Planı değiştir',
                        pl: 'Zmień plan',
                      })}</Text>
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
                    colors={[paywallCardBg, paywallSurfaceBg]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 18, borderWidth: 1, borderColor: t.wrong + '55', borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.wrongBg, alignItems: 'center', justifyContent: 'center' }}>
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
                  style={{ borderRadius: 18 }}
                >
                  <LinearGradient
                    colors={[paywallCardBg, paywallSurfaceBg]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 18, borderWidth: 1, borderColor: premiumHairline, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: premiumGoldSoft, alignItems: 'center', justifyContent: 'center' }}>
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
                      'pt-BR': 'Premium de admin nao cancela uma assinatura separada da loja. Se houver teste ou plano ativo, cancele na App Store / Google Play.',
                      vi: 'Premium admin khong huy goi dang ky rieng trong cua hang. Neu co goi hoac dung thu dang hoat dong, hay huy trong App Store / Google Play.',
                      id: 'Premium admin tidak membatalkan langganan toko terpisah. Jika ada trial atau paket aktif, batalkan di App Store / Google Play.',
                      tr: 'Admin Premium ayri magazadaki aboneligi iptal etmez. Aktif deneme veya plan varsa App Store / Google Play icinde iptal edin.',
                      pl: 'Premium admina nie anuluje osobnej subskrypcji w sklepie. Jesli trial lub plan jest aktywny, anuluj go w App Store / Google Play.',
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
                      'pt-BR': '3 dias de Premium gratis',
                      vi: '3 ngay Premium mien phi',
                      id: 'Premium gratis 3 hari',
                      tr: '3 gun Premium ucretsiz',
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
                        'pt-BR': 'Teste o Premium agora. Se nao gostar, voce pode cancelar antes do fim do periodo gratis.',
                        vi: 'Dung thu Premium ngay. Neu khong phu hop, ban co the huy truoc khi het thoi gian dung thu.',
                        id: 'Coba Premium sekarang. Jika tidak cocok, kamu bisa membatalkan sebelum masa uji coba berakhir.',
                        tr: 'Premiumu simdi dene. Uygun degilse deneme suresi bitmeden iptal edebilirsin.',
                        pl: 'Wyprobuj Premium teraz. Jesli Ci nie pasuje, mozesz anulowac przed koncem okresu probnego.',
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
                        'pt-BR': 'Depois do teste, a assinatura continuara no plano escolhido.',
                        vi: 'Sau thoi gian dung thu, goi dang ky se tiep tuc theo goi da chon.',
                        id: 'Setelah uji coba, langganan berlanjut dengan paket yang dipilih.',
                        tr: 'Deneme suresinden sonra abonelik secilen planla devam eder.',
                        pl: 'Po okresie probnym subskrypcja bedzie kontynuowana w wybranym planie.',
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
                    logExitTrialOfferAccepted(ctx, exitTrialPlan);
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
                      'pt-BR': 'Comecar gratis',
                      vi: 'Bat dau mien phi',
                      id: 'Mulai gratis',
                      tr: 'Ucretsiz basla',
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
                      'pt-BR': 'Continuar gratis',
                      vi: 'Tiep tuc mien phi',
                      id: 'Tetap gratis',
                      tr: 'Ucretsiz devam et',
                      pl: 'Zostan przy wersji darmowej',
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
                    logExitTrialOfferAccepted(ctx, exitTrialPlan);
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
            <Animated.View style={{ alignItems: 'center', marginBottom: 24, transform: [{ translateY: heroFloat }] }}>
              <ImageBackground
                source={heroBackdrop}
                resizeMode="cover"
                imageStyle={{ borderRadius: 22 }}
                style={{ width: '100%', borderRadius: 22, backgroundColor: paywallCardBg, borderWidth: 1, borderColor: heroArt.accent + '66', paddingVertical: 20, paddingHorizontal: 16, alignItems: 'center', overflow: 'hidden' }}
              >
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
                <View style={{ backgroundColor: paywallSurfaceBg, borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 12, borderWidth: 1, borderColor: heroArt.accent + '33' }}>
                  {shouldUseShardHeroIcon(ctx)
                    ? renderPremiumShardGlyph(56, 56, heroArt.shardAmount)
                    : isEnergyGlyph(hero.emoji)
                    ? renderPremiumEnergyGlyph(54)
                    : <Text style={{ fontSize: 44 }}>{hero.emoji}</Text>}
                </View>
                <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '800', textAlign: 'center', marginBottom: 8 }} adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={2}>
                  {LP(hero.titleRu, hero.titleUk, hero.titleEs, heroPlanned.title)}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: f.body * 1.55 }}>
                  {LP(hero.subtitleRu, hero.subtitleUk, hero.subtitleEs, heroPlanned.subtitle)}
                </Text>
              </ImageBackground>
            </Animated.View>

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
                    backgroundColor: paywallCardBg,
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
                    {LP(b.ru, b.uk, b.es, getContextBenefitPlanned(ctx, i))}
                  </Text>
                </View>
              ))}
            </View>

            {/* БЛОК 3: Персональная ценность */}
            <View style={{ marginBottom: 16, backgroundColor: paywallCardBg, borderRadius: 14, borderWidth: 1, borderColor: t.textSecond + '55', padding: 14 }}>
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
            </View>

            {/* Сравнение free → Premium */}
            <View
              style={{
                marginBottom: 18,
                backgroundColor: paywallSurfaceBg,
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
                borderRadius: 16, padding: 18, marginBottom: 10,
                borderWidth: selected === 'yearly' ? 2 : 1,
                borderColor: selected === 'yearly' ? t.textSecond : t.border,
                backgroundColor: selected === 'yearly' ? paywallSurfaceBg : paywallCardBg,
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
                      <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }} numberOfLines={2}>
                        {LP('Годовая подписка', 'Річна підписка', 'Suscripción anual', {
                          'pt-BR': 'Assinatura anual',
                          vi: 'Gói đăng ký hằng năm',
                          id: 'Langganan tahunan',
                          tr: 'Yıllık abonelik',
                          pl: 'Subskrypcja roczna',
                        })}
                      </Text>
                      <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 3 }} numberOfLines={3}>
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
                          {LP('...', '...', '...', {
                            'pt-BR': '...',
                            vi: '...',
                            id: '...',
                            tr: '...',
                            pl: '...',
                          })}
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
                borderRadius: 16, padding: 18, marginBottom: 20,
                borderWidth: selected === 'monthly' ? 2 : 1,
                borderColor: selected === 'monthly' ? t.textSecond : t.border,
                backgroundColor: selected === 'monthly' ? paywallSurfaceBg : paywallCardBg,
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
                      <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }} numberOfLines={2}>
                        {LP('Ежемесячная подписка', 'Щомісячна підписка', 'Suscripción mensual', {
                          'pt-BR': 'Assinatura mensal',
                          vi: 'Gói đăng ký hằng tháng',
                          id: 'Langganan bulanan',
                          tr: 'Aylık abonelik',
                          pl: 'Subskrypcja miesięczna',
                        })}
                      </Text>
                      <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 3 }} numberOfLines={3}>
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
                          <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '800', textAlign: 'right' }} adjustsFontSizeToFit numberOfLines={1}>
                            {priceStr}
                          </Text>
                          <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'right' }} numberOfLines={1}>{periodLabel}</Text>
                        </>
                      ) : (
                        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', textAlign: 'right' }} numberOfLines={2}>
                          {LP('...', '...', '...', {
                            'pt-BR': '...',
                            vi: '...',
                            id: '...',
                            tr: '...',
                            pl: '...',
                          })}
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
                ? LP('Premium', 'Premium', 'Premium', {
                    'pt-BR': 'Premium',
                    vi: 'Premium',
                    id: 'Premium',
                    tr: 'Premium',
                    pl: 'Premium',
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
                        'Store price appears before purchase.',
                        'Store price appears before purchase.',
                        'Store price appears before purchase.',
                        {
                          'pt-BR': 'Store price appears before purchase.',
                          vi: 'Store price appears before purchase.',
                          id: 'Store price appears before purchase.',
                          tr: 'Store price appears before purchase.',
                          pl: 'Store price appears before purchase.',
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
