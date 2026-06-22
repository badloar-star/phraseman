// ════════════════════════════════════════════════════════════════════════════
// welcome_steps.ts — сценарии приветствия (две ветки) + тексты.
//
// Тон по «библии» Phraseman: простой язык, обращение на «ты», без жаргона
// (никаких «XP/статистика/урок» в пугающем ключе), без выдуманных причин,
// без loss-framing. Компас подаётся как умная система, которая САМА всплывает
// и подсказывает актуальное — это НЕ отдельная кнопка на экране.
//
// targets — ключи из spotlight_registry (берём первый отрисованный). Прокрутку
// к блоку оверлей считает сам через measureLayout (без угадывания пикселей).
// Если ни один target не отрисован — шаг пропускается на этапе measure.
// ════════════════════════════════════════════════════════════════════════════
type SpotlightTargetKey = string;
import type { WelcomeBranch } from './welcome_gate';

export interface WelcomeStep {
  /** Какой блок подсвечивать. Несколько ключей = берём первый отрисованный. */
  targets: SpotlightTargetKey[];
  title: string;
  body: string;
  /** Ionicons-имя для иконки подсказки. */
  icon: string;
}

export interface WelcomeIntro {
  title: string;
  body: string;
  primary: string;
  secondary: string;
}

export interface WelcomeOutro {
  title: string;
  body: string;
  primary: string;
}

export interface WelcomeScript {
  intro: WelcomeIntro;
  steps: WelcomeStep[];
  outro: WelcomeOutro;
}

const COMPASS_FREE =
  'Здесь ты учишь английский без зубрёжки. У тебя есть Компас — умный помощник: ' +
  'он сам каждый день подсказывает, чем заняться, так что выбирать ничего не ' +
  'надо. Сейчас быстро покажем, что где находится.';

const COMPASS_PLAN =
  'Здесь ты учишь английский в удовольствие. Компас — твой помощник: он сам ' +
  'каждый день ведёт тебя дальше, шаг за шагом. Давай за минуту покажем, где ' +
  'что находится.';

const STEP_STATS: WelcomeStep = {
  targets: ['home-stats-card'],
  title: 'Твой прогресс',
  body:
    'Тут видно, как далеко ты продвинулся и сколько дней подряд занимаешься. ' +
    'Возвращайся каждый день — и цепочка будет расти вместе с тобой.',
  icon: 'trending-up-outline',
};

const STEP_QUICKSTART: WelcomeStep = {
  targets: ['home-quickstart'],
  title: 'С чего начать',
  body:
    'Три способа позаниматься прямо сейчас: разобрать новое, проверить себя или ' +
    'потренировать слова и фразы. Выбирай, что больше по настроению.',
  icon: 'flash-outline',
};

const STEP_PRACTICE: WelcomeStep = {
  targets: ['home-open-trainer'],
  title: 'Моя практика',
  body:
    'Сюда попадает всё, в чём ты запнулся. Загляни и повтори — так оно крепко ' +
    'осядет в памяти.',
  icon: 'fitness-outline',
};

const STEP_TASKS: WelcomeStep = {
  targets: ['home-activity-daily'],
  title: 'Задания дня',
  body: 'Несколько маленьких заданий на сегодня. Справишься — получишь приятные награды.',
  icon: 'checkbox-outline',
};

const STEP_LEAGUE: WelcomeStep = {
  targets: ['home-league-open'],
  title: 'Цель лиги',
  body:
    'Это дружеское соревнование с другими игроками. Занимаешься — поднимаешься ' +
    'выше и получаешь призы.',
  icon: 'gift-outline',
};

const STEP_PHRASE: WelcomeStep = {
  targets: ['home-phrase-of-day'],
  title: 'Фраза дня',
  body:
    'Каждый день — одна живая фраза, которую и правда говорят носители. Запомни ' +
    'её и используй сам.',
  icon: 'chatbubble-ellipses-outline',
};

const STEP_ARENA: WelcomeStep = {
  targets: ['tab-arena'],
  title: 'Арена',
  body:
    'Быстрые игры с другими людьми на скорость. Отличный способ размяться и ' +
    'проверить себя в азарте.',
  icon: 'flash-outline',
};

const STEP_FRIENDS: WelcomeStep = {
  targets: ['tab-friends'],
  title: 'Друзья',
  body:
    'Добавляй друзей, соревнуйтесь и радуйтесь успехам друг друга. Вместе ' +
    'учиться веселее.',
  icon: 'people-outline',
};

const STEP_PLAN_FREE: WelcomeStep = {
  targets: ['home-choose-personal-plan', 'home-personal-plan-card'],
  title: 'Личный план',
  body:
    'Хочешь идти к конкретной цели? Собери программу под себя — и она будет ' +
    'вести тебя ровно туда, куда тебе нужно.',
  icon: 'map-outline',
};

const STEP_PLAN_OWNED: WelcomeStep = {
  targets: ['home-personal-plan-card', 'home-choose-personal-plan'],
  title: 'Твой план',
  body:
    'Это программа, собранная под твою цель. Она ведёт тебя шаг за шагом, чтобы ' +
    'ты всегда знал, что дальше.',
  icon: 'map-outline',
};

const SCRIPTS: Record<WelcomeBranch, WelcomeScript> = {
  free: {
    intro: {
      title: 'Привет! Это Phraseman',
      body: COMPASS_FREE,
      primary: 'Показать, что тут есть',
      secondary: 'Я сам разберусь',
    },
    steps: [
      STEP_STATS,
      STEP_PLAN_FREE,
      STEP_QUICKSTART,
      STEP_PRACTICE,
      STEP_TASKS,
      STEP_LEAGUE,
      STEP_PHRASE,
      STEP_ARENA,
      STEP_FRIENDS,
    ],
    outro: {
      title: 'Готово, начинаем!',
      body: 'Вот и всё. Начни с Компаса — он подскажет, с чего удобнее стартовать сегодня. Удачи, у тебя всё получится!',
      primary: 'Начать',
    },
  },
  plan: {
    intro: {
      title: 'Привет! Это Phraseman',
      body: COMPASS_PLAN,
      primary: 'Показать, что тут есть',
      secondary: 'Я сам разберусь',
    },
    steps: [
      STEP_PLAN_OWNED,
      STEP_STATS,
      STEP_PRACTICE,
      STEP_TASKS,
      STEP_LEAGUE,
      STEP_PHRASE,
      STEP_ARENA,
      STEP_FRIENDS,
    ],
    outro: {
      title: 'Готово, поехали!',
      body: 'Вот и всё. Открывай Компас — он уже знает, что у тебя дальше, и поведёт тебя по шагам. Удачи, у тебя всё получится!',
      primary: 'Начать',
    },
  },
};

/** Встроенный (из кода) сценарий — фолбэк, на который накладываются оверрайды. */
export function getWelcomeScriptBase(branch: WelcomeBranch): WelcomeScript {
  return SCRIPTS[branch];
}
