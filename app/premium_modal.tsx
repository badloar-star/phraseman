import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  ScrollView, ActivityIndicator, Animated, Linking, Modal, Easing, StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useEnergy } from '../components/EnergyContext';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import { DEV_IAP_BYPASS, IS_EXPO_GO } from './config';
import { getVerifiedPremiumStatus, invalidatePremiumCache } from './premium_guard';
import {
  getTrialReofferBlockedByCooldown,
  markSubscriptionOrTrialFlowConsumedNow,
} from './premium_trial_eligibility';
import { unlockLesson } from './lesson_lock_system';
import {
  logPremiumPurchased,
  logPremiumModalOpened,
  logCancelSurvey,
  logPaywallView,
  logPaywallPlanSelect,
  logPaywallCtaClick,
  logPaywallContinueFree,
  logPaywallClose,
} from './firebase';
import { emitAppEvent } from './events';
import { hapticTap } from '../hooks/use-haptics';
import { MOTION_DURATION, MOTION_SPRING } from '../constants/motion';
import { triLang, type Lang } from '../constants/i18n';

type Plan = 'monthly' | 'yearly';
type PremiumContext =
  | 'arena'
  | 'no_energy'
  | 'lesson_b1'
  | 'quiz_limit'
  | 'quiz_level'
  | 'quiz_medium'
  | 'quiz_hard'
  | 'flashcard_limit'
  | 'streak'
  | 'theme'
  | 'hall_of_fame'
  | 'club'
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

const resolvePremiumPackages = (
  availablePackages: PurchasesPackage[],
): { monthly?: PurchasesPackage; yearly?: PurchasesPackage } => {
  const byType = (needle: string) =>
    availablePackages.find((p: any) => String(p?.packageType || '').toUpperCase() === needle);
  const byId = (rx: RegExp) => availablePackages.find((p) => rx.test(p.product.identifier));

  const monthly =
    byType('MONTHLY') ??
    byType('$RC_MONTHLY') ??
    byId(/month|monthly|1.?month/i);
  const yearly =
    byType('ANNUAL') ??
    byType('$RC_ANNUAL') ??
    byType('YEARLY') ??
    byId(/year|yearly|annual|12.?month/i);

  return { monthly, yearly };
};

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
  lesson_b1: {
    titleRu: 'Ты готов к B1 - пора идти дальше',
    titleUk: 'Ти готовий до B1 - час іти далі',
    titleEs: 'Estás listo para B1: sigue avanzando',
    subtitleRu: 'Открой B1/B2 и переходи от базовых упражнений к рабочему английскому.',
    subtitleUk: 'Відкрий B1/B2 і переходь від базових вправ до робочої англійської.',
    subtitleEs: 'Abre B1/B2 y pasa de ejercicios básicos al inglés que usas cada día.',
  },
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
  hall_of_fame: {
    titleRu: 'Соревнуйся и держи темп',
    titleUk: 'Змагайся та тримай темп',
    titleEs: 'Compite y mantén el ritmo',
    subtitleRu: 'Премиум-режимы усиливают мотивацию и помогают удерживать ежедневный ритм обучения.',
    subtitleUk: 'Преміум-режими підсилюють мотивацію й допомагають утримувати щоденний ритм навчання.',
    subtitleEs: 'Los modos premium refuerzan la motivación y ayudan a mantener estudios cada día.',
  },
  club: {
    titleRu: 'Усиль прогресс через клубы и бонусы',
    titleUk: 'Підсиль прогрес через клуби та бонуси',
    titleEs: 'Impulsa tu progreso con clubes y bonus',
    subtitleRu: 'Соревнуйся, набирай больше XP и не выпадай из ритма.',
    subtitleUk: 'Змагайся, набирай більше XP і не випадай з ритму.',
    subtitleEs: 'Compite, suma más XP y no pierdas el ritmo.',
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

const savePremiumLocally = async (plan: Plan) => {
  // expiry = 0 означает "без срока" — RevenueCat сам проверяет подписку при каждом запуске.
  // Фиксированный timestamp (30/365 дней) приводил к потере премиума после обновлений
  // приложения, если RC не успевал ответить до истечения срока локального кэша.
  await AsyncStorage.multiSet([
    ['premium_plan',    plan],
    ['premium_expiry',  '0'],
    ['premium_active',  'true'],
    ['tester_no_premium', 'false'],  // сброс тест-флага при реальной покупке
  ]);
  invalidatePremiumCache();
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
    case 'lesson_b1':
      return {
        emoji: '🎓',
        titleRu: lessonsDone >= 18 ? 'Ты закончил A2!' : copy.titleRu,
        titleUk: lessonsDone >= 18 ? 'Ти закінчив A2!' : copy.titleUk,
        titleEs: lessonsDone >= 18 ? '¡Has completado A2!' : copy.titleEs,
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
        titleRu: streakDays > 0
          ? `Стрик ${streakDays} ${streakDays === 1 ? 'день' : streakDays < 5 ? 'дня' : 'дней'} под угрозой!`
          : copy.titleRu,
        titleUk: streakDays > 0
          ? `Стрік ${streakDays} ${streakDays === 1 ? 'день' : 'днів'} під загрозою!`
          : copy.titleUk,
        titleEs: streakDays > 0
          ? `¡Racha de ${streakDays} ${streakDays === 1 ? 'día' : 'días'} en juego!`
          : copy.titleEs,
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
    case 'hall_of_fame':
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
  lesson_b1: [
    { ru: 'Открыт путь к B1/B2 без пауз', uk: 'Відкрито шлях до B1/B2 без пауз', es: 'Camino a B1/B2 sin pausa' },
    { ru: 'Больше результативной практики в день', uk: 'Більше результативної практики за день', es: 'Más práctica útil cada día' },
    { ru: 'Быстрее переход к уверенной речи', uk: 'Швидший перехід до впевненої мови', es: 'Antes al inglés con más confianza' },
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
    { ru: 'Лучше долгосрочное запоминание', uk: 'Краще довгострокове запамʼятовування', es: 'Memoria a largo plazo más sólida' },
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
  hall_of_fame: [
    { ru: 'Соревновательный драйв и мотивация', uk: 'Змагальний драйв і мотивація', es: 'Competición que refuerza la motivación' },
    { ru: 'Больше смысла в ежедневном темпе', uk: 'Більше сенсу у щоденному темпі', es: 'Más sentido a tu rutina diaria' },
    { ru: 'Прогресс заметен быстрее', uk: 'Прогрес помітний швидше', es: 'Notas el progreso antes' },
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
};

/** Сравнение free → Premium: копия синхронизирована с логикой (уроки 19+, квизы: лише easy, картки index≥20, енергія 30 хв/од.) */
const PAYWALL_COMPARISON_COPY = {
  lessonsFreeRu: 'A1–A2, уроки 1–18',
  lessonsFreeUk: 'A1–A2, уроки 1–18',
  lessonsFreeEs: 'A1–A2, lecciones 1–18',
  premiumBenefitRu: 'Безлимитно',
  premiumBenefitUk: 'Безлімітно',
  premiumBenefitEs: 'Ilimitado',
  quizFreeRu: 'Только уровень Easy',
  quizFreeUk: 'Лише рівень Easy',
  quizFreeEs: 'Solo nivel Fácil',
  cardsFreeRu: 'До 20 сохранённых',
  cardsFreeUk: 'До 20 збережених',
  cardsFreeEs: 'Hasta 20 guardadas',
  energyFreeRu: '+1 ⚡ ~30 мин',
  energyFreeUk: '+1 ⚡ ~30 хв',
  energyFreeEs: '+1 ⚡ ~30 min',
} as const;

function getPersonalValueLine(ctx: PremiumContext, streakDays: number, lessonsDone: number, savedCards: number, lang: Lang): string {
  if (ctx === 'streak' && streakDays > 0) {
    return triLang(lang, {
      ru: `Сейчас у тебя стрик ${streakDays} дн. Premium поможет его удержать.`,
      uk: `Зараз у тебе стрік ${streakDays} дн. Premium допоможе його втримати.`,
      es: `Tienes una racha de ${streakDays} ${streakDays === 1 ? 'día' : 'días'}. Premium te ayudará a mantenerla.`,
    });
  }
  if (ctx === 'lesson_b1') {
    return triLang(lang, {
      ru: `Уроков пройдено: ${lessonsDone}. Следующий шаг - B1/B2.`,
      uk: `Уроків пройдено: ${lessonsDone}. Наступний крок - B1/B2.`,
      es: `Lecciones completadas: ${lessonsDone}. Siguiente paso: B1/B2.`,
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
 * Есть ли у StoreProduct бесплатная фаза (триал), по данным магазина/RC.
 * Сброс `trial_last_consumed_at` в AsyncStorage влияет только на копию, но не
 * на то, отдаст ли Google/Apple данному аккаунту триал (уже использовали — фазы не будет).
 */
function isZeroPriceMicros(micros: unknown): boolean {
  if (micros === 0) return true;
  if (typeof micros === 'string' && (micros === '0' || parseInt(micros, 10) === 0)) return true;
  return false;
}

function pricingPhaseIsFree(phase: { price?: { amountMicros?: number; priceAmountMicros?: number } } | null | undefined): boolean {
  if (!phase?.price) return false;
  const p = phase.price;
  if (isZeroPriceMicros(p.amountMicros)) return true;
  if (p.amountMicros == null && isZeroPriceMicros(p.priceAmountMicros)) return true;
  return false;
}

function subscriptionOptionHasFreeTrial(o: {
  freePhase?: unknown;
  phases?: { price?: { amountMicros?: number } }[];
  pricingPhases?: { price?: { amountMicros?: number; priceAmountMicros?: number } }[];
}): boolean {
  if (o.freePhase != null) return true;
  if (o.phases?.some(ph => pricingPhaseIsFree(ph) || isZeroPriceMicros(ph?.price?.amountMicros))) return true;
  if (o.pricingPhases?.some(pricingPhaseIsFree)) return true;
  return false;
}

function storeProductHasTrialIntro(product: PurchasesPackage['product'] | undefined): boolean {
  if (!product) return false;
  const p = product as any;

  // iOS: introductory offer / free trial в introPrice
  if (p.introPrice != null) {
    const ip = p.introPrice;
    if (ip.price === 0 || ip.price === 0.0) return true;
    if (typeof ip.price === 'number' && Math.abs(ip.price) < 1e-9) return true;
    if (typeof ip.priceString === 'string') {
      const normalized = ip.priceString.replace(/[^\d.,-]/g, '').replace(/,/g, '.');
      const n = parseFloat(normalized);
      if (!Number.isNaN(n) && n === 0) return true;
    }
  }

  for (const key of ['defaultOption', 'defaultSubscriptionOption'] as const) {
    const opt = p[key];
    if (opt && subscriptionOptionHasFreeTrial(opt)) return true;
  }

  const opts = p.subscriptionOptions;
  if (Array.isArray(opts) && opts.some((o: any) => subscriptionOptionHasFreeTrial(o))) {
    return true;
  }

  if (__DEV__ && !p.__trialLogged) {
    p.__trialLogged = true;
    try {
      console.log('[RC] storeProductHasTrial intro check', p.identifier, {
        hasSubOpts: Array.isArray(opts) ? opts.length : 0,
        introPrice: p.introPrice,
        defaultOption: !!p.defaultOption,
        keys: Object.keys(p).filter(k => k.includes('ption') || k === 'introPrice' || k === 'subscriptionOptions'),
      });
    } catch { /* noop */ }
  }

  return false;
}

// ── Список открываемых фич для celebrate-модалки ──────────────────────────────
const UNLOCK_ITEMS: { icon: string; textRu: string; textUk: string; textEs: string }[] = [
  { icon: '⚡', textRu: 'Безлимитная энергия',      textUk: 'Необмежена енергія',    textEs: 'Energía ilimitada' },
  { icon: '🎓', textRu: 'Уроки B1 и B2 (19–32)',    textUk: 'Уроки B1 та B2 (19–32)', textEs: 'Lecciones B1 y B2 (19–32)' },
  { icon: '🧠', textRu: 'Квиз Средний',             textUk: 'Квіз Середній',        textEs: 'Quiz medio' },
  { icon: '💜', textRu: 'Квиз Сложный',             textUk: 'Квіз Складний',        textEs: 'Quiz difícil' },
  { icon: '🎨', textRu: 'Кастомные темы',          textUk: 'Кастомні теми',       textEs: 'Temas personalizados' },
  { icon: '❄️', textRu: 'Заморозка стрика',         textUk: 'Заморозка стріку',     textEs: 'Protección de racha' },
  { icon: '📚', textRu: 'Безлимитные карточки',    textUk: 'Безліміт карток',      textEs: 'Tarjetas ilimitadas' },
];

// ── Компонент ─────────────────────────────────────────────────────────────────
export default function PremiumModal() {
  const router = useRouter();
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
    _preview_success?: string;
    _force_trial_ui?: string;
  }>();
  /** Admin-only QA: форсит показ trial-UI (золотая лента + «Бесплатно» в карточках)
      даже когда магазин не вернул intro phase. Проставляется ТОЛЬКО из admin-панели,
      пользователь без deep-link доступа сам его не передаст. */
  const forceTrialUI = params._force_trial_ui === '1';

  const ctx = (params.context ?? 'generic') as PremiumContext;
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
  }, [ctx]);
  const streakDays   = parseInt(params.streak       ?? '0') || 0;
  const lessonsDone  = parseInt(params.lessons_done ?? '0') || 0;
  const savedCards   = parseInt(params.saved        ?? '0') || 0;

  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { reload: reloadEnergy } = useEnergy();
  const L = (ru: string, uk: string, es: string) => triLang(lang as Lang, { ru, uk, es });

  const [selected,   setSelected]   = useState<Plan>('yearly');
  const [restoring,  setRestoring]  = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [packages,   setPackages]   = useState<{ monthly?: PurchasesPackage; yearly?: PurchasesPackage }>({});
  /** true = в 90-дн. «окне» после последней покупки/триал-флоу — не показываем копию 7 дней (локально). */
  const [trialReofferBlocked, setTrialReofferBlocked] = useState(false);

  // manage-view state
  type ViewMode = 'purchase' | 'manage' | 'change_plan' | 'success';
  const [viewMode,    setViewMode]   = useState<ViewMode>('purchase');
  const [activePlan,  setActivePlan]  = useState<Plan | null>(null);
  const [isAdminGrantedPremium, setIsAdminGrantedPremium] = useState(false);
  const [expiryTs,    setExpiryTs]   = useState<number>(0);
  const [cancelled]  = useState(false);
  const [cancelSurveyVisible, setCancelSurveyVisible] = useState(false);
  const successScale   = useRef(new Animated.Value(0.6)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const purchasingRef  = useRef(false);
  const ctaPulse       = useRef(new Animated.Value(1)).current;
  const badgeSparkle   = useRef(new Animated.Value(0)).current;
  const heroGlow       = useRef(new Animated.Value(0.35)).current;
  const heroFloat      = useRef(new Animated.Value(0)).current;
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

  // Открыт с плашки «управление подпиской» (settings): только если в хранилище есть активный план
  useEffect(() => {
    if ((params as any).manage === '1') {
      // Сначала manage как «загрузка»; без валидного плана сбрасываем в purchase (иначе пейвол при viewMode=manage && !activePlan)
      setViewMode('manage');
      resolveCurrentPremiumState().then(({ isPremium, plan, expiry, isAdmin }) => {
        if (!isPremium || !plan) {
          setViewMode('purchase');
          return;
        }
        setIsAdminGrantedPremium(isAdmin);
        setActivePlan(plan);
        setExpiryTs(expiry);
        setViewMode('manage');
        if (!isAdmin && !expiry && !IS_EXPO_GO && !DEV_IAP_BYPASS) {
          Purchases.getCustomerInfo()
            .then(info => {
              const entitlement = info.entitlements.active['premium'];
              if (entitlement?.expirationDate) {
                setExpiryTs(new Date(entitlement.expirationDate).getTime());
              }
            })
            .catch(() => {});
        }
      }).catch(() => {
        setViewMode('purchase');
      });
    }
  }, [params, resolveCurrentPremiumState]);

  const hero = getHero(ctx, streakDays, lessonsDone, savedCards);
  const benefits = CONTEXT_BENEFITS[ctx] ?? CONTEXT_BENEFITS.generic;
  const personalValueLine = getPersonalValueLine(ctx, streakDays, lessonsDone, savedCards, lang as Lang);

  useEffect(() => {
    getTrialReofferBlockedByCooldown().then(setTrialReofferBlocked);
    resolveCurrentPremiumState().then(({ isPremium, plan, expiry, isAdmin }) => {
      if (isPremium && plan) {
        setIsAdminGrantedPremium(isAdmin);
        setActivePlan(plan); setExpiryTs(expiry); setViewMode('manage');
      }
    }).catch(() => {});
  }, [resolveCurrentPremiumState]);

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
    unlockLesson(19).catch(() => {}); // Открываем первый урок B1 при покупке премиума (правило: премиум → доступ к B1 без сдачи зачёта A2)
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
    // Defensive guard: if premium is already active locally, don't start a second flow.
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
    setPurchasing(true);
    try {
      // На Android для free trial нужно явно выбрать subscriptionOption с триальной фазой
      if (__DEV__) console.log('[RC] subscriptionOptions:', JSON.stringify(pkg.product.subscriptionOptions?.map(o => ({ id: o.id, freePhase: o.freePhase }))));
      const trialOption = !trialReofferBlocked
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
      void customerInfo; // RC customerInfo доступен для отладки при необходимости
      await savePremiumLocally(plan);
      logPremiumPurchased(pkg.product.identifier);
      // Локальная отметка: 90 д. без копии «7 дней» (магазин отдельно решает про intro).
      await markSubscriptionOrTrialFlowConsumedNow();
      await activateFreezeIfNeeded();
      showSuccess();
    } catch (e: any) {
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
        await savePremiumLocally(plan);
        await markSubscriptionOrTrialFlowConsumedNow();
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
  if (viewMode === 'manage' && activePlan) {
    const amount = activePlan === 'yearly'
      ? (packages.yearly?.product.priceString ?? '€23.99')
      : (packages.monthly?.product.priceString ?? '€3.99');
    const period = activePlan === 'yearly'
      ? L('год', 'рік', 'año')
      : L('месяц', 'місяць', 'mes');
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
              <TouchableOpacity onPress={() => { hapticTap(); goBack(); }}>
                <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
              </TouchableOpacity>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginLeft: 8 }}>Premium</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
              <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: t.correct, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="diamond" size={28} color={t.correct} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                      {L('Premium активирован ✓', 'Premium активовано ✓', 'Premium activado ✓')}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }}>
                      {activePlan === 'yearly'
                        ? L('Годовая подписка', 'Річна підписка', 'Suscripción anual')
                        : L('Ежемесячная подписка', 'Щомісячна підписка', 'Suscripción mensual')}
                    </Text>
                  </View>
                </View>
                {!cancelled && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 0.5, borderTopColor: t.border }}>
                    <View>
                      <Text style={{ color: t.textMuted, fontSize: f.label }}>{L('Следующий платёж', 'Наступний платіж', 'Próximo pago')}</Text>
                      <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600', marginTop: 2 }}>
                        {expiryTs > 0 ? formatDate(expiryTs, lang) : 'App Store / Google Play'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: t.textMuted, fontSize: f.label }}>{L('Сумма', 'Сума', 'Importe')}</Text>
                      <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600', marginTop: 2 }}>{amount} / {period}</Text>
                    </View>
                  </View>
                )}
                {cancelled && (
                  <Text style={{ color: t.wrong, fontSize: f.sub, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: t.border }}>
                    {L(
                      `Подписка отменена. Доступ активен до ${formatDate(expiryTs, lang)}`,
                      `Підписку скасовано. Доступ активний до ${formatDate(expiryTs, lang)}`,
                      `Suscripción cancelada. El acceso sigue hasta el ${formatDate(expiryTs, lang)}`,
                    )}
                  </Text>
                )}
              </View>

              {!cancelled && !isAdminGrantedPremium && (
                <TouchableOpacity
                  style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: t.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  onPress={() => { hapticTap(); setViewMode('change_plan'); }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Ionicons name="swap-horizontal-outline" size={22} color={t.textSecond} />
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600' }}>{L('Сменить план', 'Змінити план', 'Cambiar plan')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
                </TouchableOpacity>
              )}

              {!cancelled && !isAdminGrantedPremium && (
                <TouchableOpacity
                  style={{ borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: t.wrong + '66', backgroundColor: t.bgCard, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  onPress={() => { hapticTap(); setCancelSurveyVisible(true); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close-circle-outline" size={22} color={t.wrong} />
                  <Text style={{ color: t.wrong, fontSize: f.body, fontWeight: '600' }}>{L('Отменить подписку', 'Скасувати підписку', 'Cancelar suscripción')}</Text>
                </TouchableOpacity>
              )}

              <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center', marginTop: 4 }}>
                {L('Подписка управляется через App Store / Google Play', 'Підписка управляється через App Store / Google Play', 'La suscripción se gestiona en App Store / Google Play')}
              </Text>
              {isAdminGrantedPremium && (
                <Text style={{ color: t.textSecond, fontSize: f.label, textAlign: 'center', marginTop: 2 }}>
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
                    logCancelSurvey(item.key);
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

  // ── Change plan view ─────────────────────────────────────────────────────────
  if (viewMode === 'change_plan' && activePlan) {
    const otherPlan: Plan = activePlan === 'yearly' ? 'monthly' : 'yearly';
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
              <TouchableOpacity onPress={() => { hapticTap(); setViewMode('manage'); }}>
                <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
              </TouchableOpacity>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginLeft: 8 }}>{L('Сменить план', 'Змінити план', 'Cambiar plan')}</Text>
            </View>
            <View style={{ padding: 20, gap: 12 }}>
              {([activePlan, otherPlan] as Plan[]).map(plan => {
                const isCurrent = plan === activePlan;
                return (
                  <TouchableOpacity
                    key={plan}
                    style={{ borderRadius: 16, padding: 18, borderWidth: isCurrent ? 2 : 1, borderColor: isCurrent ? t.correct : t.border, backgroundColor: isCurrent ? t.bgSurface : t.bgCard }}
                    onPress={() => {
                      hapticTap();
                      if (isCurrent) return;
                      openManageWithToast();
                    }}
                    activeOpacity={isCurrent ? 1 : 0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View>
                        <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                          {plan === 'yearly' ? L('Годовая подписка', 'Річна підписка', 'Suscripción anual') : L('Ежемесячная подписка', 'Щомісячна підписка', 'Suscripción mensual')}
                        </Text>
                        {isCurrent
                          ? <Text style={{ color: t.correct, fontSize: f.sub, marginTop: 3, fontWeight: '600' }}>{L('✓ Текущий план', '✓ Поточний план', '✓ Plan actual')}</Text>
                          : <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 3 }}>{L('Изменить через Google Play', 'Змінити через Google Play', 'Cambiar en Google Play')}</Text>
                        }
                      </View>
                      <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }}>{plan === 'yearly' ? (packages.yearly?.product.priceString ?? '€23.99') : (packages.monthly?.product.priceString ?? '€3.99')}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center', lineHeight: f.sub * 1.5 }}>
                {L(
                  'Для смены плана ты будешь перенаправлен в Google Play',
                  'Для зміни плану тебе буде перенаправлено до Google Play',
                  'Para cambiar de plan se te redirigirá a Google Play',
                )}
              </Text>
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── Purchase view ─────────────────────────────────────────────────────────────
  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 48, paddingBottom: 36 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Крестик */}
            <TouchableOpacity
              style={{ alignSelf: 'flex-end', padding: 8, marginBottom: 8 }}
              onPress={() => {
                hapticTap();
                logPaywallClose(ctx);
                goBack();
              }}
            >
              <Ionicons name="close" size={24} color={t.textMuted} />
            </TouchableOpacity>

            {/* TRIAL RIBBON: показываем только когда хотя бы один план реально отдаёт intro phase
                и пользователь не в локальном 90-дневном кулдауне. Цена остаётся видна ниже в карточках —
                это требование App Store 3.1.2 / Google Play subscriptions policy.
                forceTrialUI — admin QA bypass, чтобы тестировать UI в Expo Go/dev без реального RC. */}
            {(forceTrialUI || (!trialReofferBlocked && (storeProductHasTrialIntro(packages.yearly?.product) || storeProductHasTrialIntro(packages.monthly?.product)))) && (
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
                    {L('Попробуй Premium 7 дней бесплатно', 'Спробуй Premium 7 днів безкоштовно', 'Prueba Premium 7 días gratis')}
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
              {([
                { emoji: '📚', titleRu: 'Уроки', titleUk: 'Уроки', titleEs: 'Lecciones', fRu: PAYWALL_COMPARISON_COPY.lessonsFreeRu, fUk: PAYWALL_COMPARISON_COPY.lessonsFreeUk, fEs: PAYWALL_COMPARISON_COPY.lessonsFreeEs },
                { emoji: '⚡', titleRu: 'Квизы', titleUk: 'Квізи', titleEs: 'Quizzes', fRu: PAYWALL_COMPARISON_COPY.quizFreeRu, fUk: PAYWALL_COMPARISON_COPY.quizFreeUk, fEs: PAYWALL_COMPARISON_COPY.quizFreeEs },
                { emoji: '🃏', titleRu: 'Карточки', titleUk: 'Картки', titleEs: 'Tarjetas', fRu: PAYWALL_COMPARISON_COPY.cardsFreeRu, fUk: PAYWALL_COMPARISON_COPY.cardsFreeUk, fEs: PAYWALL_COMPARISON_COPY.cardsFreeEs },
                { emoji: '🔋', titleRu: 'Энергия', titleUk: 'Енергія', titleEs: 'Energía', fRu: PAYWALL_COMPARISON_COPY.energyFreeRu, fUk: PAYWALL_COMPARISON_COPY.energyFreeUk, fEs: PAYWALL_COMPARISON_COPY.energyFreeEs },
              ] as const).map((row, idx, arr) => {
                const freeL = L(row.fRu, row.fUk, row.fEs);
                const premL = L(
                  PAYWALL_COMPARISON_COPY.premiumBenefitRu,
                  PAYWALL_COMPARISON_COPY.premiumBenefitUk,
                  PAYWALL_COMPARISON_COPY.premiumBenefitEs,
                );
                const title = L(row.titleRu, row.titleUk, row.titleEs);
                return (
                  <View
                    key={row.titleRu}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 7,
                      borderBottomWidth: idx < arr.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: t.border,
                    }}
                  >
                    <Text style={{ fontSize: 16, width: 26, textAlign: 'center' }}>{row.emoji}</Text>
                    <View style={{ flex: 1, minWidth: 0, paddingLeft: 4, paddingRight: 6 }}>
                      <Text numberOfLines={1} style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>{title}</Text>
                      <Text numberOfLines={2} style={{ color: t.textGhost, fontSize: 10, lineHeight: 13, marginTop: 1 }}>{freeL}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={13} color={t.textMuted} style={{ marginRight: 4 }} />
                    <View style={{ maxWidth: '38%' }}>
                      <Text numberOfLines={2} style={{ color: t.textSecond, fontSize: 10, lineHeight: 13, fontWeight: '800', textAlign: 'right' }}>
                        {premL}
                      </Text>
                    </View>
                  </View>
                );
              })}

              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginVertical: 8 }} />

              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 }}>
                <Ionicons name="snow-outline" size={20} color="#64B4FF" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>{L('Заморозка стрика', 'Заморозка стріку', 'Protección de racha')}</Text>
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
              {/* Бейдж */}
              <Animated.View style={{
                position: 'absolute', top: -11, right: 14,
                backgroundColor: '#B8860B',
                borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3,
                borderWidth: 1, borderColor: '#FFD700',
                shadowColor: '#FFD700',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: badgeSparkle,
                shadowRadius: 8,
                elevation: 6,
              }}>
                <Text style={{ color: '#FFD700', fontSize: f.label, fontWeight: '800' }}>
                  {L('✨ Лучшая цена', '✨ Найкраща ціна', '✨ Mejor precio')}
                </Text>
              </Animated.View>
              {(() => {
                const yearlyHasTrial = forceTrialUI || (!trialReofferBlocked && storeProductHasTrialIntro(packages.yearly?.product));
                const priceStr = packages.yearly?.product.priceString ?? '€23.99';
                const periodLabel = L('/ год', '/ рік', '/ año');
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                        {L('Годовая подписка', 'Річна підписка', 'Suscripción anual')}
                      </Text>
                      <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 3 }}>
                        {L('Экономия 50% по сравнению с месячным', 'Економія 50% порівняно з місячним', 'Ahorra un 50 % frente al plan mensual')}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', maxWidth: '46%' }}>
                      {yearlyHasTrial ? (
                        <>
                          {/* Главный якорь — триал. Цена ниже мелким, но ЧИТАЕМЫМ цветом —
                              compliance с App Store 3.1.2 / Google Play (price must be clearly disclosed). */}
                          <Text style={{ color: t.correct, fontSize: f.numMd, fontWeight: '900', textAlign: 'right' }} adjustsFontSizeToFit numberOfLines={1}>
                            {L('Бесплатно', 'Безкоштовно', 'Gratis')}
                          </Text>
                          <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700', marginTop: 1, textAlign: 'right' }}>
                            {L('на 7 дней', 'на 7 днів', 'durante 7 días')}
                          </Text>
                          <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 5, textAlign: 'right' }} numberOfLines={2}>
                            {L(`затем ${priceStr} ${periodLabel}`, `потім ${priceStr} ${periodLabel}`, `luego ${priceStr} ${periodLabel}`)}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '800' }}>
                            {priceStr}
                          </Text>
                          <Text style={{ color: t.textMuted, fontSize: f.caption }}>
                            {periodLabel}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                );
              })()}
              {selected === 'yearly' && (
                <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={16} color={t.correct} />
                  <Text style={{ color: t.correct, fontSize: f.caption, fontWeight: '700' }}>
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
                const monthlyHasTrial = forceTrialUI || (!trialReofferBlocked && storeProductHasTrialIntro(packages.monthly?.product));
                const priceStr = packages.monthly?.product.priceString ?? '€3.99';
                const periodLabel = L('/ месяц', '/ місяць', '/mes');
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                        {L('Ежемесячная подписка', 'Щомісячна підписка', 'Suscripción mensual')}
                      </Text>
                      <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 3 }}>
                        {L('☕ Как одна чашка кофе в месяц', '☕ Як одна чашка кави на місяць', '☕ Como un café al mes')}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', maxWidth: '46%' }}>
                      {monthlyHasTrial ? (
                        <>
                          <Text style={{ color: t.correct, fontSize: f.numMd, fontWeight: '900', textAlign: 'right' }} adjustsFontSizeToFit numberOfLines={1}>
                            {L('Бесплатно', 'Безкоштовно', 'Gratis')}
                          </Text>
                          <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700', marginTop: 1, textAlign: 'right' }}>
                            {L('на 7 дней', 'на 7 днів', 'durante 7 días')}
                          </Text>
                          <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 5, textAlign: 'right' }} numberOfLines={2}>
                            {L(`затем ${priceStr} / месяц`, `потім ${priceStr} / місяць`, `luego ${priceStr} / mes`)}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '800' }}>
                            {priceStr}
                          </Text>
                          <Text style={{ color: t.textMuted, fontSize: f.caption }}>{periodLabel}</Text>
                        </>
                      )}
                    </View>
                  </View>
                );
              })()}
              {selected === 'monthly' && (
                <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={16} color={t.correct} />
                  <Text style={{ color: t.correct, fontSize: f.caption, fontWeight: '700' }}>
                    {L('Выбран гибкий ежемесячный план', 'Обрано гнучкий щомісячний план', 'Plan mensual flexible')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* CTA */}
            {(() => {
              const selectedPkg = selected === 'yearly' ? packages.yearly : packages.monthly;
              const hasTrial = forceTrialUI || (!trialReofferBlocked && storeProductHasTrialIntro(selectedPkg?.product));
              const priceStr = selectedPkg?.product.priceString ?? (selected === 'yearly' ? '€23.99' : '€3.99');
              const periodStr = selected === 'yearly'
                ? L('/год', '/рік', '/año')
                : L('/мес', '/міс', '/mes');
              const ctaLabel = hasTrial
                ? L(
                    `🚀 7 дней бесплатно — затем ${priceStr}${periodStr}`,
                    `🚀 7 днів безкоштовно — потім ${priceStr}${periodStr}`,
                    `🚀 7 días gratis — luego ${priceStr}${periodStr}`,
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
                    opacity: purchasing ? 0.7 : 1,
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
                  disabled={purchasing}
                >
                  {purchasing
                    ? <ActivityIndicator color={t.correctText} />
                    : <Text style={{ color: t.correctText, fontSize: f.h2, fontWeight: '800' }} adjustsFontSizeToFit numberOfLines={1}>
                        {ctaLabel}
                      </Text>
                  }
                </TouchableOpacity>
                </Animated.View>
              );
            })()}

            {/* Мелкие хуки */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
              {(forceTrialUI || (!trialReofferBlocked && (storeProductHasTrialIntro(packages.monthly?.product) || storeProductHasTrialIntro(packages.yearly?.product)))) && (
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
                {restoring
                  ? L('Восстанавливаем...', 'Відновлення...', 'Restaurando...')
                  : L('Восстановить подписку', 'Відновити підписку', 'Restaurar suscripción')}
              </Text>
            </TouchableOpacity>

            {/* Продолжить бесплатно */}
            <TouchableOpacity
              style={{ paddingVertical: 8, alignItems: 'center' }}
              onPress={() => {
                hapticTap();
                logPaywallContinueFree(ctx);
                goBack();
              }}
            >
              <Text style={{ color: t.textGhost, fontSize: f.body, textDecorationLine: 'underline' }}>
                {ctx === 'streak'
                  ? L('Нет, спасибо — стрик сгорит', 'Ні, дякую — стрік згорить', 'No, gracias: perderás la racha')
                  : L('Продолжить бесплатно', 'Продовжити безкоштовно', 'Continuar gratis')}
              </Text>
            </TouchableOpacity>

            {(() => {
              const selectedPkgFooter = selected === 'yearly' ? packages.yearly : packages.monthly;
              const footerHasTrial =
                forceTrialUI ||
                (!trialReofferBlocked && storeProductHasTrialIntro(selectedPkgFooter?.product));
              const footerPrice =
                selectedPkgFooter?.product.priceString ??
                (selected === 'yearly' ? '€23.99' : '€3.99');
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
              const ios = Platform.OS === 'ios';

              const trialUk = ios
                ? `Якщо для цього плану доступні 7 днів без оплати: після закінчення пробного періоду з вашого Apple ID буде списано ${footerPrice} за обраний термін, якщо ви не скасуєте принаймні за 24 години до його закінчення (Налаштування → Apple ID → Підписки).`
                : `Якщо для цього плану доступні 7 днів без оплати: після закінчення пробного періоду з вашого облікового запису Google буде списано ${footerPrice} за обраний термін, якщо ви не скасуєте принаймні за 24 години до його закінчення (Google Play → Підписки).`;

              const trialRu = ios
                ? `Если для этого плана доступны 7 дней без оплаты: после окончания пробного периода с вашего Apple ID будет списана сумма ${footerPrice} за выбранный срок, если вы не отмените подписку как минимум за 24 часа до его окончания (Настройки → Apple ID → Подписки).`
                : `Если для этого плана доступны 7 дней без оплаты: после окончания пробного периода с вашего аккаунта Google будет списана сумма ${footerPrice} за выбранный срок, если вы не отмените подписку как минимум за 24 часа до его окончания (Google Play → Подписки).`;

              const trialEs = ios
                ? `Si este plan ofrece 7 días sin cargo: al terminar la prueba, tu Apple ID cargará ${footerPrice} por el período elegido si no cancelas al menos 24 horas antes (Ajustes → Apple ID → Suscripciones).`
                : `Si este plan ofrece 7 días sin cargo: al terminar la prueba, tu cuenta Google cargará ${footerPrice} por el período elegido si no cancelas al menos 24 horas antes (Google Play → Suscripciones).`;

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
              <TouchableOpacity onPress={() => { hapticTap(); Linking.openURL('https://badloar-star.github.io/phraseman-privacy/'); }}>
                <Text style={{ color: t.textGhost, fontSize: f.label, textDecorationLine: 'underline' }}>
                  Privacy Policy
                </Text>
              </TouchableOpacity>
              <Text style={{ color: t.textGhost, fontSize: f.label }}>·</Text>
              <TouchableOpacity onPress={() => { hapticTap(); Linking.openURL('https://badloar-star.github.io/phraseman-privacy/terms.html'); }}>
                <Text style={{ color: t.textGhost, fontSize: f.label, textDecorationLine: 'underline' }}>
                  Terms of Use
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
