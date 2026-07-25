// Палитра — league hub (constants/theme.ts DARK + docs/design/league-hub-redesign)
// Контейнеры СТРОГО без бордеров: только тональные заливки + мягкий внутренний блик.
export const T = {
  bg: '#070C08',
  bgGlow: 'radial-gradient(1200px 600px at 15% -5%, rgba(71,200,112,.08), transparent 60%)',
  card: '#101710',      // базовый контейнер
  elev: '#17241A',      // приподнятый контейнер
  elev2: '#1D2E22',     // active / выбранное
  text: '#F0F7F2',
  muted: '#8AB49A',
  ghost: '#5B7A67',
  accent: '#47C870',
  accentSoft: 'rgba(71,200,112,.14)',
  accentText: '#042010',
  accentDark: '#1E6B3A',   // 3D-полка зелёной кнопки
  gold: '#FFD43B',
  goldSoft: 'rgba(255,212,59,.12)',
  goldText: '#B98A1B',
  goldDark: '#7d5f0e',
  silver: '#C9D4DC',
  bronze: '#D29A6A',
  danger: '#FF5B6C',
  dangerSoft: 'rgba(255,91,108,.12)',
  dangerDark: '#7a2530',
  streak: '#FB923C',
}

export const radius = { lg: 26, md: 18, sm: 12 }

/** Мягкий внутренний блик сверху — вместо бордера */
export const innerLight = 'inset 0 1px 0 rgba(255,255,255,0.045)'

export type Player = {
  id: number
  name: string
  emoji: string
  color: string
  rank: string
  streak: number
  titles: string[]
  winRate: number
  played: number
  isYou?: boolean
}

export const YOU: Player = {
  id: 0, name: 'Вы', emoji: '🦊', color: '#58CC89',
  rank: 'Золото II', streak: 4,
  titles: ['Чемпион дня ×2', 'Топ-10 сезона'],
  winRate: 41, played: 37, isYou: true,
}

export const PLAYERS: Player[] = [
  { id: 1, name: 'СловоЖора', emoji: '🐺', color: '#FF9F6E', rank: 'Алмаз I', streak: 6, titles: ['Чемпион дня ×5', 'Топ-3 сезона'], winRate: 63, played: 128 },
  { id: 2, name: 'Фразочкина', emoji: '🦉', color: '#6EDDB4', rank: 'Золото I', streak: 3, titles: ['Чемпион дня ×1'], winRate: 48, played: 76 },
  { id: 3, name: 'ГраммарНацик', emoji: '🤓', color: '#FFD060', rank: 'Платина III', streak: 0, titles: ['Полиглот'], winRate: 52, played: 94 },
  { id: 4, name: 'МолнияPRO', emoji: '⚔️', color: '#F07654', rank: 'Алмаз II', streak: 5, titles: ['Чемпион дня ×3', 'Король арены'], winRate: 58, played: 143 },
  { id: 5, name: 'LingvoLisa', emoji: '🦊', color: '#B79CFF', rank: 'Золото III', streak: 0, titles: [], winRate: 39, played: 41 },
  { id: 6, name: 'Полиглот_77', emoji: '🌍', color: '#6EC6FF', rank: 'Платина I', streak: 3, titles: ['Топ-10 сезона'], winRate: 55, played: 102 },
  { id: 7, name: 'СленгМастер', emoji: '🎧', color: '#7BE382', rank: 'Серебро I', streak: 0, titles: [], winRate: 33, played: 28 },
  { id: 8, name: 'VerbaVolt', emoji: '⚡', color: '#F0E68C', rank: 'Золото II', streak: 4, titles: ['Чемпион дня ×1'], winRate: 46, played: 67 },
  { id: 9, name: 'ТихийСловарь', emoji: '📚', color: '#F0A8C8', rank: 'Бронза I', streak: 0, titles: [], winRate: 27, played: 15 },
  { id: 10, name: 'IdiomHunter', emoji: '🏹', color: '#8FD3FF', rank: 'Платина II', streak: 0, titles: ['Снайпер фраз'], winRate: 51, played: 88 },
  { id: 11, name: 'МадамПеревод', emoji: '💃', color: '#FFB26B', rank: 'Золото I', streak: 3, titles: ['Чемпион дня ×2'], winRate: 49, played: 73 },
  { id: 12, name: 'NoCapNika', emoji: '🧢', color: '#8FE8DD', rank: 'Серебро II', streak: 0, titles: [], winRate: 31, played: 22 },
  { id: 13, name: 'АкцентЗеро', emoji: '🎯', color: '#C5A3FF', rank: 'Платина III', streak: 0, titles: ['Полиглот'], winRate: 53, played: 91 },
  { id: 14, name: 'RoflPhrase', emoji: '🤡', color: '#93E088', rank: 'Бронза II', streak: 0, titles: [], winRate: 24, played: 11 },
  { id: 15, name: 'КубокБарон', emoji: '👑', color: '#F09F9F', rank: 'Алмаз III', streak: 7, titles: ['Чемпион дня ×4', 'Топ-3 сезона'], winRate: 61, played: 156 },
]

export const ALL = [YOU, ...PLAYERS]

export const QUESTIONS = [
  { phrase: '«Break a leg!»', hint: 'Что это значит?', options: ['Сломай ногу!', 'Ни пуха ни пера!', 'Беги быстрее!', 'Держись подальше!'], correct: 1 },
  { phrase: '«It’s raining cats and dogs»', hint: 'Что это значит?', options: ['Дождь из животных', 'Льёт как из ведра', 'Погода для прогулок', 'Кошки против собак'], correct: 1 },
  { phrase: '«Hit the sack»', hint: 'Что он собирается делать?', options: ['Ударить мешок', 'Пойти спать', 'Собрать вещи', 'Начать драку'], correct: 1 },
  { phrase: '«Piece of cake»', hint: 'Что это значит?', options: ['Кусок торта', 'Проще простого', 'Вкусная работа', 'Разделить поровну'], correct: 1 },
]

export const SEASON_LEADERS = [
  { name: 'СловоЖора', emoji: '🐺', color: '#FF9F6E', pts: 284 },
  { name: 'КубокБарон', emoji: '👑', color: '#F09F9F', pts: 261 },
  { name: 'МолнияPRO', emoji: '⚔️', color: '#F07654', pts: 247 },
  { name: 'Полиглот_77', emoji: '🌍', color: '#6EC6FF', pts: 213 },
  { name: 'МадамПеревод', emoji: '💃', color: '#FFB26B', pts: 198 },
  { name: 'Вы', emoji: '🦊', color: '#58CC89', pts: 174, isYou: true },
]
