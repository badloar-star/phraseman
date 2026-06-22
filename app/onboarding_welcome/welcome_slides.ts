// ════════════════════════════════════════════════════════════════════════════
// welcome_slides.ts — сценарий «знакомства» (слайды) + резолвер РЕАЛЬНЫХ иконок
// разделов приложения.
//
// Подход (после многих провалов координатной подсветки): отдельный экран-слайды,
// по одному разделу на слайд, с ЕГО НАСТОЯЩЕЙ иконкой-ассетом (как на главной),
// заголовком и понятным текстом. Никаких координат/наведений/скролла по живой
// главной → ломаться нечему.
//
// Иконки берём из тех же источников, что и боевой UI:
//   • уроки/вызовы/карточки/практика/задания/лига → getHomeMenuImages(themeMode);
//   • план → compassIconSource(themeMode) (Компас ведёт план);
//   • фраза дня, статистика → Ionicons (надёжной webp на все темы нет).
// ════════════════════════════════════════════════════════════════════════════
import type { ImageSourcePropType } from 'react-native';
import { getHomeMenuImages } from '../home_menu_icons';
import { compassIconSource } from '../../constants/weeklyCompassIcons';
import { trainerThemeIconSource } from '../../constants/trainerThemeIcons';
import type { ThemeMode } from '../../constants/theme';
import type { WelcomeBranch } from './welcome_gate';

/** Какой ассет показать на слайде. */
export type SlideAsset =
  | { kind: 'image'; from: 'menu'; menuKey: 'lesson' | 'quizes' | 'cards' | 'practice' | 'dayTasks' | 'league' }
  | { kind: 'image'; from: 'compass' }
  | { kind: 'image'; from: 'phrase' }
  | { kind: 'icon'; icon: string };

export interface WelcomeSlide {
  id: string;
  asset: SlideAsset;
  /** Цвет акцента слайда (плитка под иконкой/кнопка). */
  tone: string;
  title: string;
  body: string;
}

export interface WelcomeIntroOutro {
  title: string;
  body: string;
}

export interface WelcomeSlidesScript {
  intro: WelcomeSlide;       // первый слайд — про Компас
  slides: WelcomeSlide[];    // разделы
  outro: WelcomeIntroOutro;  // финал
  primaryStart: string;      // «Начать»
}

/** Разрешить ассет слайда в реальный image source (или null для icon-слайдов). */
export function resolveSlideImage(asset: SlideAsset, themeMode: ThemeMode): ImageSourcePropType | null {
  if (asset.kind === 'icon') return null;
  if (asset.from === 'compass') return compassIconSource(themeMode);
  if (asset.from === 'phrase') return trainerThemeIconSource(themeMode, 'phrases'); // тот же ассет, что плашка «Фраза дня»
  const menu = getHomeMenuImages(themeMode);
  return menu[asset.menuKey];
}

// Палитра акцентов слайдов (по смыслу раздела).
const TONE = {
  compass: '#7F77DD',
  stats: '#7F77DD',
  plan: '#7F77DD',
  lesson: '#378ADD',
  quiz: '#BA7517',
  cards: '#D4537E',
  practice: '#534AB7',
  tasks: '#1D9E75',
  league: '#D4537E',
  phrase: '#1D9E75',
};

// Тексты — по формулировкам пользователя, упор на то, что ПОЛУЧИТ юзер и как
// улучшится его язык (не «какие мы крутые»). Слайды Статистика и Личный план
// убраны (по просьбе — у них нет своего ассета на слайде).
const S = {
  lessons: (): WelcomeSlide => ({
    id: 'lessons', asset: { kind: 'image', from: 'menu', menuKey: 'lesson' }, tone: TONE.lesson,
    title: 'Уроки',
    body: '32 урока по самым нужным темам английского — разложат базу по полочкам и доведут твои знания до уверенного уровня.',
  }),
  quizzes: (): WelcomeSlide => ({
    id: 'quizzes', asset: { kind: 'image', from: 'menu', menuKey: 'quizes' }, tone: TONE.quiz,
    title: 'Вызовы',
    body: 'Короткие квизы, чтобы проверить себя в игре. Сразу видно, что уже усвоил, — и язык закрепляется быстрее.',
  }),
  cards: (): WelcomeSlide => ({
    id: 'cards', asset: { kind: 'image', from: 'menu', menuKey: 'cards' }, tone: TONE.cards,
    title: 'Карточки',
    body: 'Любые слова и фразы из приложения можно сохранить сюда и повторять в удобном режиме — а ещё слушать их с переводом, чтобы запоминать на слух.',
  }),
  practice: (): WelcomeSlide => ({
    id: 'practice', asset: { kind: 'image', from: 'menu', menuKey: 'practice' }, tone: TONE.practice,
    title: 'Моя практика',
    body: 'Умный алгоритм запоминает твои ошибки и сам подбирает занятия по темам, где ты пока хромаешь, — слабые места подтягиваются сами собой.',
  }),
  tasks: (): WelcomeSlide => ({
    id: 'tasks', asset: { kind: 'image', from: 'menu', menuKey: 'dayTasks' }, tone: TONE.tasks,
    title: 'Задания дня',
    body: 'Несколько небольших заданий на каждый день. Делаешь их понемногу — и язык растёт незаметно, без перегруза.',
  }),
  league: (): WelcomeSlide => ({
    id: 'league', asset: { kind: 'image', from: 'menu', menuKey: 'league' }, tone: TONE.league,
    title: 'Лига',
    body: 'Дружеское соревнование с другими игроками. Занимаешься регулярно — поднимаешься выше и забираешь награды.',
  }),
  phrase: (): WelcomeSlide => ({
    id: 'phrase', asset: { kind: 'image', from: 'phrase' }, tone: TONE.phrase,
    title: 'Фраза дня',
    body: 'Каждый день — одна живая фраза, которую правда говорят носители. Запоминаешь по одной — и речь становится естественнее.',
  }),
};

const INTRO_FREE: WelcomeSlide = {
  id: 'intro', asset: { kind: 'image', from: 'compass' }, tone: TONE.compass,
  title: 'Это Компас',
  body: 'Твой умный помощник в приложении. Каждый день он сам подсказывает, чем заняться, — тебе не нужно выбирать, просто открывай и занимайся.',
};

const INTRO_PLAN: WelcomeSlide = {
  id: 'intro', asset: { kind: 'image', from: 'compass' }, tone: TONE.compass,
  title: 'Это Компас',
  body: 'Твой умный помощник в приложении. Каждый день он сам ведёт тебя по плану — искать ничего не нужно, просто открывай и продолжай.',
};

export function getWelcomeSlidesScriptBase(branch: WelcomeBranch): WelcomeSlidesScript {
  const slides = [S.lessons(), S.quizzes(), S.cards(), S.practice(), S.tasks(), S.league(), S.phrase()];
  if (branch === 'plan') {
    return {
      intro: INTRO_PLAN,
      slides,
      outro: { title: 'Готово, начинаем!', body: 'Открывай Компас — он уже знает, что у тебя дальше. Удачи, у тебя всё получится!' },
      primaryStart: 'Начать',
    };
  }
  return {
    intro: INTRO_FREE,
    slides,
    outro: { title: 'Готово, начинаем!', body: 'Начни с Компаса — он подскажет, с чего удобнее стартовать сегодня. Удачи, у тебя всё получится!' },
    primaryStart: 'Начать',
  };
}
