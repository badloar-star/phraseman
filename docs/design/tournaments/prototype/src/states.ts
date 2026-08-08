// Реестр всех состояний турнира — для галереи и скриншотов.
// Каждое состояние открывается напрямую по hash: #s=<id>

export type ScreenId = 'arena' | 'season' | 'lobby' | 'round' | 'table' | 'results' | 'cancel'
  | 'roundintro' | 'roundalt' | 'vip' | 'bank' | 'watch' | 'tickets' | 'sharecard'
  | 'streak' | 'profile' | 'onboarding' | 'edges' | 'assets'

export type DemoState = {
  id: string
  file: string            // имя скриншота
  group: string
  title: string
  sub: string
  screen: ScreenId
  preset?: Record<string, unknown>
}

const DEMO_SCORES_R1 = [10, 15, 10, 0, 15, 0, 10, 0, 10, 0, 10, 15, 0, 10, 0, 15]
const DEMO_SCORES_MID = [35, 40, 25, 30, 45, 15, 30, 10, 35, 5, 25, 40, 15, 30, 10, 50]
const DEMO_SCORES_FINAL = [62, 70, 45, 52, 68, 28, 55, 18, 60, 12, 45, 66, 30, 50, 22, 75]
// победа: ты 1-й
const DEMO_SCORES_WIN = [75, 70, 45, 52, 68, 28, 55, 18, 60, 12, 45, 66, 30, 50, 22, 62]
// призовое: ты 2-й
const DEMO_SCORES_PRIZE = [68, 75, 45, 52, 60, 28, 55, 18, 62, 12, 45, 66, 30, 50, 22, 70]
// без приза: ты 9-й
const DEMO_SCORES_NOPRIZE = [25, 70, 45, 52, 68, 28, 55, 30, 60, 12, 45, 66, 32, 50, 22, 75]

export const STATES: DemoState[] = [
  // ── Главная ──
  { id: 'home-countdown', file: '01-home-countdown', group: 'Главная', title: 'Отсчёт до старта', sub: 'Турнир через 4 минуты · вход 1 🎟', screen: 'arena', preset: { variant: 'countdown' } },
  { id: 'home-live', file: '02-home-live', group: 'Главная', title: 'Турнир идёт сейчас', sub: 'LIVE · можно зайти в игру', screen: 'arena', preset: { variant: 'live' } },
  { id: 'home-no-tickets', file: '03-home-no-tickets', group: 'Главная', title: 'Нет билетов', sub: 'Кнопка заблокирована · как получить 🎟', screen: 'arena', preset: { variant: 'noTickets' } },
  { id: 'home-confirm', file: '04-home-confirm', group: 'Главная', title: 'Подтверждение входа', sub: 'Bottom sheet · списание 1 🎟', screen: 'arena', preset: { variant: 'countdown', confirm: true } },
  { id: 'home-bank', file: '05-home-bank', group: 'Главная', title: 'Банк недели + VIP', sub: 'Крупный счётчик · тизер воскресного VIP', screen: 'arena', preset: { variant: 'countdown', bankFirst: true } },

  // ── Лобби ──
  { id: 'lobby-filling', file: '06-lobby-filling', group: 'Лобби', title: 'Лобби заполняется', sub: '7 из 16 · пустые слоты «дышат»', screen: 'lobby', preset: { joined: 7 } },
  { id: 'lobby-full', file: '07-lobby-full', group: 'Лобби', title: 'Лобби полное', sub: '16/16 · таймер старта', screen: 'lobby', preset: { joined: 16 } },
  { id: 'lobby-profile', file: '08-lobby-profile', group: 'Лобби', title: 'Карточка игрока', sub: 'Bottom sheet профиля · в друзья', screen: 'lobby', preset: { joined: 16, profile: true } },

  // ── Раунд ──
  { id: 'round-idle', file: '09-round-idle', group: 'Раунд', title: 'Вопрос нетронут', sub: 'Таймер 10 сек · варианты активны', screen: 'round', preset: {} },
  { id: 'round-correct', file: '10-round-correct', group: 'Раунд', title: 'Правильный ответ', sub: 'Зелёная строка · баннер «Правильно!»', screen: 'round', preset: { picked: 1 } },
  { id: 'round-wrong', file: '11-round-wrong', group: 'Раунд', title: 'Ошибка', sub: 'Баннер «Почти!» + верный ответ', screen: 'round', preset: { picked: 0 } },
  { id: 'round-x2', file: '12-round-multiplier', group: 'Раунд', title: 'Множитель ×2', sub: 'Серия 3+ · 🔥×2 · +20 очков', screen: 'round', preset: { picked: 1, streak: 3 } },
  { id: 'round-timer-low', file: '13-round-timer-low', group: 'Раунд', title: 'Последние секунды', sub: 'Красное кольцо таймера · 2 сек', screen: 'round', preset: { timeLeft: 2 } },

  // ── Таблица ──
  { id: 'table-r1', file: '14-table-round1', group: 'Таблица', title: 'После раунда 1', sub: 'Бары выросли · сортировка', screen: 'table', preset: { scores: DEMO_SCORES_R1, round: 0 } },
  { id: 'table-overtake', file: '15-table-overtake', group: 'Таблица', title: 'Обгоны', sub: 'Середина турнира · бейджи «обгон!»', screen: 'table', preset: { scores: DEMO_SCORES_MID, round: 2, overtakes: [0, 2, 11] } },
  { id: 'table-final', file: '16-table-final', group: 'Таблица', title: 'Финальная таблица', sub: 'Перед подиумом', screen: 'table', preset: { scores: DEMO_SCORES_FINAL, round: 3 } },

  // ── Результаты ──
  { id: 'results-win', file: '17-results-win', group: 'Результаты', title: 'Победа', sub: 'Ты 1-й · корона · shard-burst · 50💎+🎟+титул', screen: 'results', preset: { scores: DEMO_SCORES_WIN } },
  { id: 'results-prize', file: '18-results-prize', group: 'Результаты', title: 'Призовое место', sub: 'Ты 2-й · 25 💎', screen: 'results', preset: { scores: DEMO_SCORES_PRIZE } },
  { id: 'results-no-prize', file: '19-results-no-prize', group: 'Результаты', title: 'Без приза', sub: '9-е место · XP-кэшбэк · мотивация', screen: 'results', preset: { scores: DEMO_SCORES_NOPRIZE } },
  { id: 'results-share', file: '20-results-share', group: 'Результаты', title: 'Шер-карточка', sub: '«Я обыграл 15 игроков» · Поделиться', screen: 'results', preset: { scores: DEMO_SCORES_WIN, shareFocus: true } },

  // ── Сезон ──
  { id: 'season-normal', file: '21-season', group: 'Сезон', title: 'Сезон · обычный', sub: 'Вы 6-е · рейтинг недели · награды', screen: 'season', preset: {} },
  { id: 'season-top5', file: '22-season-top5', group: 'Сезон', title: 'Ты в топ-5', sub: '4-е место · зона наград', screen: 'season', preset: { place: 4 } },
  { id: 'season-end', file: '23-season-end', group: 'Сезон', title: 'Конец сезона', sub: 'До сброса 3ч 12м · срочность', screen: 'season', preset: { seconds: 3 * 3600 + 12 * 60 } },

  // ── Прочее ──
  { id: 'cancel', file: '24-tournament-cancelled', group: 'Прочее', title: 'Турнир отменён', sub: 'Не набралось игроков · возврат 🎟 + компенсация', screen: 'cancel', preset: {} },

  // ── Раунд: интро и режимы ──
  { id: 'round-intro', file: '25-round-intro', group: 'Раунд: интро и режимы', title: 'Раунд-интро', sub: '«Раунд 2 · Микс» · отсчёт 3-2-1', screen: 'roundintro', preset: { round: 2, mode: 'mix' } },
  { id: 'round-translate', file: '26-round-translate', group: 'Раунд: интро и режимы', title: 'Перевод на скорость', sub: 'Собери перевод из слов', screen: 'roundalt', preset: { variant: 'translate' } },
  { id: 'round-timeattack', file: '27-round-timeattack', group: 'Раунд: интро и режимы', title: 'Тайм-атака', sub: '60 сек · счётчик верных', screen: 'roundalt', preset: { variant: 'timeattack' } },
  { id: 'round-voice', file: '28-round-voice', group: 'Раунд: интро и режимы', title: 'Голосовой раунд', sub: 'Микрофон · волна · ×1.5', screen: 'roundalt', preset: { variant: 'voice' } },

  // ── VIP и банк ──
  { id: 'vip-entry', file: '32-vip-entry', group: 'VIP и банк', title: 'VIP-турнир · вход', sub: 'Банк 2 480 💎 · вход 5 🎟 · gold', screen: 'vip', preset: {} },
  { id: 'bank-week', file: '33-bank-week', group: 'VIP и банк', title: 'Банк недели', sub: 'Счётчик · лента · подиум 50/30/20', screen: 'bank', preset: {} },
  { id: 'vip-watch-lobby', file: '29-vip-watch-lobby', group: 'VIP и банк', title: 'VIP · лобби зрителя', sub: 'Прогнозы до старта · ставка 5💎 · ×3', screen: 'watch', preset: { variant: 'lobby' } },
  { id: 'vip-watch', file: '34-vip-watch', group: 'VIP и банк', title: 'Трансляция VIP', sub: 'Прогнозы закрыты · реакции · живая таблица', screen: 'watch', preset: { variant: 'live', predicted: true } },
  { id: 'vip-watch-sheet', file: '35-vip-watch-sheet', group: 'VIP и банк', title: 'Прогноз «кто победит»', sub: 'Шторка из карточек участников · до старта', screen: 'watch', preset: { variant: 'lobby', sheet: true } },

  // ── Билеты ──
  { id: 'tickets-inventory', file: '36-tickets-inventory', group: 'Билеты', title: 'Инвентарь билетов', sub: '«У вас 3 🎟» · добор', screen: 'tickets', preset: { variant: 'inventory' } },
  { id: 'tickets-howto', file: '37-tickets-howto', group: 'Билеты', title: 'Как получить', sub: '4 источника · большие иконки', screen: 'tickets', preset: { variant: 'howto' } },
  { id: 'tickets-free', file: '38-tickets-free', group: 'Билеты', title: 'Бесплатный вход недели', sub: 'Бейдж FREE · билеты не тронем', screen: 'tickets', preset: { variant: 'free' } },

  // ── Шеринг и серия ──
  { id: 'share-win', file: '39-share-win', group: 'Шеринг и серия', title: 'Шер-карточка · победа', sub: '«Я обыграл 15 игроков»', screen: 'sharecard', preset: { variant: 'win' } },
  { id: 'share-streak', file: '40-share-streak', group: 'Шеринг и серия', title: 'Шер-карточка · серия', sub: '5 🔥 подряд · «Неудержимый»', screen: 'sharecard', preset: { variant: 'streak' } },
  { id: 'share-champion', file: '41-share-champion', group: 'Шеринг и серия', title: 'Шер-карточка · чемпион сезона', sub: 'Топ-1 недели · корона', screen: 'sharecard', preset: { variant: 'champion' } },
  { id: 'streak-unlock', file: '42-streak-unlock', group: 'Шеринг и серия', title: 'Серия 3 🔥', sub: 'Огненная рамка · shard-burst', screen: 'streak', preset: {} },

  // ── Профиль и онбординг ──
  { id: 'profile-full', file: '43-profile-full', group: 'Профиль и онбординг', title: 'Профиль игрока', sub: 'Ранг · титулы · винрейт-ring · история', screen: 'profile', preset: {} },
  { id: 'onboarding', file: '44-onboarding', group: 'Профиль и онбординг', title: 'Онбординг', sub: '3 свайп-карточки «Что такое Турниры»', screen: 'onboarding', preset: {} },

  // ── Сервисные состояния ──
  { id: 'edge-loading', file: '45-edge-loading', group: 'Сервисные состояния', title: 'Загрузка', sub: 'Skeleton shimmer', screen: 'edges', preset: { variant: 'loading' } },
  { id: 'edge-offline', file: '46-edge-offline', group: 'Сервисные состояния', title: 'Нет соединения', sub: 'Retry · 10 сек назад', screen: 'edges', preset: { variant: 'offline' } },
  { id: 'edge-preseason', file: '47-edge-preseason', group: 'Сервисные состояния', title: 'Сезон ещё не начался', sub: 'Отсчёт до понедельника', screen: 'edges', preset: { variant: 'preseason' } },
  { id: 'edge-waiting', file: '48-edge-waiting', group: 'Сервисные состояния', title: 'Ты уже в лобби', sub: 'Ждём старт · пульс', screen: 'edges', preset: { variant: 'waiting' } },

  // ── Ассеты ──
  { id: 'assets-gallery', file: '49-assets-gallery', group: 'Ассеты', title: 'Галерея ассетов', sub: 'Все элементы режима · живые анимации', screen: 'assets', preset: {} },
]

export const stateById = (id: string) => STATES.find((s) => s.id === id)

export function readHashState(): DemoState | null {
  const m = window.location.hash.match(/#s=([\w-]+)/)
  return m ? (stateById(m[1]) ?? null) : null
}
