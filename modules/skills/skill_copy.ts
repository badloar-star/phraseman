/**
 * Тексты экрана «Навыки». Русский — дословно из утверждённого макета
 * (docs/design/v2-app/elevate-real4.js: имена осей и строки «от чего растёт»).
 */
import type { SkillId } from './skill_points_table';

type Copy = Readonly<{ ru: string; uk: string; es: string; en: string }>;

export const SKILL_NAME: Readonly<Record<SkillId, Copy>> = {
  listening: { ru: 'Слух', uk: 'Слух', es: 'Oído', en: 'Listening' },
  speech: { ru: 'Речь', uk: 'Мовлення', es: 'Habla', en: 'Speaking' },
  vocab: { ru: 'Словарь', uk: 'Словник', es: 'Vocabulario', en: 'Vocabulary' },
  grammar: { ru: 'Грамматика', uk: 'Граматика', es: 'Gramática', en: 'Grammar' },
  speed: { ru: 'Скорость', uk: 'Швидкість', es: 'Velocidad', en: 'Speed' },
  social: { ru: 'Социальный', uk: 'Соціальний', es: 'Social', en: 'Social' },
};

export const SKILL_SOURCE: Readonly<Record<SkillId, Copy>> = {
  listening: { ru: 'Растёт от видео и диалогов', uk: 'Зростає від відео та діалогів', es: 'Crece con vídeos y diálogos', en: 'Grows from videos and dialogs' },
  speech: { ru: 'Растёт от диалогов голосом и режима «Устно»', uk: 'Зростає від діалогів голосом і режиму «Усно»', es: 'Crece con diálogos por voz y el modo «Oral»', en: 'Grows from voice dialogs and Speaking mode' },
  vocab: { ru: 'Растёт от карточек и «Найди пары»', uk: 'Зростає від карток і «Знайди пари»', es: 'Crece con tarjetas y «Encuentra pares»', en: 'Grows from cards and Find the pairs' },
  grammar: { ru: 'Растёт от уроков, теории и работы над ошибками', uk: 'Зростає від уроків, теорії та роботи над помилками', es: 'Crece con lecciones, teoría y repaso de errores', en: 'Grows from lessons, theory and mistake practice' },
  speed: { ru: 'Растёт от игр «Поток» и «Блиц»', uk: 'Зростає від ігор «Потік» і «Бліц»', es: 'Crece con los juegos «Flujo» y «Blitz»', en: 'Grows from Flow and Blitz' },
  social: { ru: 'Растёт от сердечек, комментариев, своих наборов и друзей', uk: 'Зростає від сердечок, коментарів, власних наборів і друзів', es: 'Crece con corazones, comentarios, tus sets y amigos', en: 'Grows from hearts, comments, your sets and friends' },
};

export const SKILLS_SCREEN_COPY = {
  title: { ru: 'Навыки', uk: 'Навички', es: 'Habilidades', en: 'Skills' },
  thisWeek: { ru: 'за неделю', uk: 'за тиждень', es: 'esta semana', en: 'this week' },
  index: { ru: 'Индекс речи', uk: 'Індекс мовлення', es: 'Índice de habla', en: 'Speech index' },
  hint: { ru: 'Нажми на навык — покажу, от чего он растёт', uk: 'Натисни на навичку — покажу, від чого вона зростає', es: 'Toca una habilidad para ver de qué crece', en: 'Tap a skill to see what grows it' },
  levelShort: { ru: 'ур.', uk: 'рів.', es: 'niv.', en: 'lv.' },
  improve: { ru: 'Подтянуть', uk: 'Підтягнути', es: 'Mejorar', en: 'Improve' },
  back: { ru: 'Назад', uk: 'Назад', es: 'Atrás', en: 'Back' },
} as const satisfies Record<string, Copy>;
