// ═══════════════════════════════════════════════════════════════════════════
// tournament_hero_copy.ts — что написано в hero экрана турниров.
//
// зачем 2026-07-27 (владелец): hero знал два состояния и после старта слота
// показывал мёртвый «00:00». Теперь состояний пять, и у каждого своя подача.
// Тексты вынесены из JSX чистой функцией: их читает контрактный тест, а в
// экране не остаётся лестницы тернарников.
//
// ТОН (требование владельца: «должно быть что-то эпичное»): пока окно идёт,
// это не служебное «турниры идут», а событие — «АРЕНА ОТКРЫТА». Крупная
// строка занимает место таймера, поэтому она короткая и заглавная: hero
// остаётся одним акцентом на экран, без микро-текста под заголовком.
// ═══════════════════════════════════════════════════════════════════════════

import { formatTimeLeft } from '../components/tournament/tournament_theme';

export type TournamentHeroCopy = {
  /** Строка над крупным значением. */
  kicker: string;
  /** Крупное значение — цифры отсчёта или статус окна. */
  value: string;
  /** Строка под значением. */
  sub: string;
  /** Крупный кегль (только для цифр отсчёта — статус длиннее и не влезет). */
  big: boolean;
  /** Акцентная подача статуса. */
  tone: 'idle' | 'live';
  /** Показывать пульсирующую точку «в эфире». */
  pulsing: boolean;
};

export type TournamentHeroInput = {
  /** Фаза окна (см. resolveTournamentWindowState). */
  phase: 'countdown' | 'open' | 'played' | 'idle';
  /** Я прямо сейчас в идущем турнире (комната в раунде). */
  live: boolean;
  /** Номер текущего раунда для live. */
  roundNo: number;
  /** Игроков в комнате — для live. */
  playersInRoom: number;
  /** Взнос за вход, чтобы показать банк комнаты. */
  entryGems: number;
  /** Секунды до события, которое показывает таймер. */
  secondsToShow: number;
  /** Секунды до конца текущего окна. */
  secondsToWindowEnd: number;
  /** Время старта ближайшего слота для подписи «Сегодня · 15:20». */
  nextSlotDisplayTime?: string;
};

/** Минуты до конца окна, округлённые вверх — «осталось 12 минут». */
function minutesLeft(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / 60));
}

export function resolveTournamentHeroCopy(input: TournamentHeroInput): TournamentHeroCopy {
  // Я в турнире прямо сейчас — прогресс важнее всего остального.
  if (input.live) {
    return {
      kicker: 'Вы в турнире',
      value: `Раунд ${Math.max(1, input.roundNo)} из 4`,
      sub: `${input.playersInRoom} игроков · банк комнаты ${input.playersInRoom * input.entryGems}`,
      big: false,
      tone: 'live',
      pulsing: true,
    };
  }

  // Окно идёт, играть можно прямо сейчас: таймера нет — есть событие.
  if (input.phase === 'open') {
    return {
      kicker: 'Турнир открыт',
      value: 'ВХОД ОТКРЫТ',
      sub: `до закрытия ${minutesLeft(input.secondsToWindowEnd)} мин · заходите и играйте`,
      big: false,
      tone: 'live',
      pulsing: true,
    };
  }

  // Уже отыграл в этом окне — таймер сразу целится в следующее.
  if (input.phase === 'played') {
    return {
      kicker: 'Этот турнир отыгран',
      value: formatTimeLeft(input.secondsToShow),
      sub: 'следующий турнир · один вход в каждое окно',
      big: true,
      tone: 'idle',
      pulsing: false,
    };
  }

  // Обычный отсчёт до открытия турнира.
  if (input.phase === 'countdown') {
    return {
      kicker: input.nextSlotDisplayTime ? `Сегодня · ${input.nextSlotDisplayTime}` : 'Скоро',
      value: formatTimeLeft(input.secondsToShow),
      sub: '16 игроков · 4 раунда · около 7 минут',
      big: true,
      tone: 'idle',
      pulsing: false,
    };
  }

  // зачем 2026-07-27 (владелец: «чтобы без расписания было доступно начать игру
  // в любое время»): расписания может не быть вовсе, но турнир всё равно
  // собирается по нажатию. Старое «Скоро · первый турнир готовится» описывало
  // ожидание, которого больше нет, и гасило единственное живое действие экрана.
  return {
    kicker: 'Турниры',
    value: 'ИГРАЙТЕ СЕЙЧАС',
    sub: '16 игроков · 4 раунда · около 7 минут',
    big: false,
    tone: 'live',
    pulsing: true,
  };
}
