/**
 * «Серия вдвоём» (идея 1) и шторка друга 2.0 — тексты на 9 языках.
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html#streak и #hub): подписи строки друга, шторки,
 * Главной и финала занятия — из одного места, чтобы строка, шторка и окно говорили одинаково.
 * Род друга неизвестен — где глагол зависит от рода, пишем «(ась)», как уже принято в шторке «Вместе».
 */
import { triLang, type Lang } from '../../constants/i18n';
import type { PairFlameState } from './pair_streak';

type L9 = Readonly<{ ru: string; uk: string; en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>;
const L = (ru: string, uk: string, en: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string): L9 =>
  ({ ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
const pick = (lang: Lang, copy: L9): string => triLang(lang, copy);

function slavic(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

/** Подпись строки друга по состоянию огня пары (строка: огонь + число, затем эта подпись). */
export function pairRowSubline(lang: Lang, state: PairFlameState): string | null {
  switch (state) {
    case 'both_today':
      return pick(lang, L('Оба занимались сегодня', 'Обоє займалися сьогодні', 'You both studied today', 'Hoy estudiaron los dos', 'Vocês dois estudaram hoje', 'Cả hai đã học hôm nay', 'Kalian berdua belajar hari ini', 'Bugün ikiniz de çalıştınız', 'Oboje dziś się uczyliście'));
    // зачем (Переводчик 21.10, docs/work/tasks/friends-pair-copy-review-2026-10-21.md): род друга неизвестен — безличная форма вместо «занимался(ась)»
    case 'friend_pending':
      return pick(lang, L('Сегодня ещё без занятия', 'Сьогодні ще без заняття', 'Hasn’t studied yet', 'Aún no ha estudiado', 'Ainda não estudou', 'Chưa học hôm nay', 'Belum belajar', 'Henüz çalışmadı', 'Dziś jeszcze bez nauki'));
    case 'me_pending':
      return pick(lang, L('Занятие сделано · ждёт тебя', 'Заняття зроблено · чекає на тебе', 'Already studied · waiting for you', 'Ya estudió · te espera', 'Já estudou · espera você', 'Đã học · đang chờ bạn', 'Sudah belajar · menunggumu', 'Çalıştı · seni bekliyor', 'Nauka zrobiona · czeka na ciebie'));
    case 'none_today':
      return pick(lang, L('Сегодня ещё никто из вас', 'Сьогодні ще ніхто з вас', 'Neither of you yet today', 'Hoy todavía ninguno', 'Nenhum de vocês ainda hoje', 'Hôm nay chưa ai học', 'Hari ini belum ada yang belajar', 'Bugün henüz ikiniz de değil', 'Dziś jeszcze nikt z was'));
    case 'broken':
      return pick(lang, L('Серия прервалась', 'Серія перервалася', 'Streak ended', 'La racha se cortó', 'A sequência acabou', 'Chuỗi đã đứt', 'Rangkaian terputus', 'Seri bozuldu', 'Seria przerwana'));
    default:
      return null;
  }
}

export const PAIR_COPY = {
  // зачем (Переводчик 21.10): en/es/vi «Call / Llamar / Gọi» читаются как телефонный звонок — «позвать» = Nudge / Avisar / Rủ
  call: L('Позвать', 'Покликати', 'Nudge', 'Avisar', 'Chamar', 'Rủ', 'Ajak', 'Çağır', 'Zawołaj'),
  // зачем (Переводчик 21.10, «без рода»): кнопка без рода зовущего — «Позвали», «Уже звали» (макет «Позвал» — отклонение для «Сверки»)
  called: L('Позвали', 'Покликали', 'Nudged', 'Avisado', 'Chamado', 'Đã rủ', 'Diajak', 'Çağrıldı', 'Zawołano'),
  alreadyCalled: L('Уже звали', 'Вже кликали', 'Nudged today', 'Ya avisado', 'Já chamado', 'Đã rủ hôm nay', 'Sudah diajak', 'Bugün çağrıldı', 'Już wołano'),
  quietHours: L('Тихие часы', 'Тихі години', 'Quiet hours', 'Horas de silencio', 'Horário silencioso', 'Giờ yên tĩnh', 'Jam tenang', 'Sessiz saatler', 'Ciche godziny'),
  queued: L('В очереди', 'У черзі', 'Queued', 'En cola', 'Na fila', 'Đang chờ', 'Dalam antrean', 'Sırada', 'W kolejce'),
  waitsYou: L('Ждёт тебя', 'Чекає на тебе', 'Waiting for you', 'Te espera', 'Espera você', 'Đang chờ bạn', 'Menunggumu', 'Seni bekliyor', 'Czeka na ciebie'),
  callToStudy: L('Позвать заниматься', 'Покликати займатися', 'Nudge to study', 'Invitar a estudiar', 'Chamar para estudar', 'Rủ cùng học', 'Ajak belajar', 'Çalışmaya çağır', 'Zawołaj do nauki'),
  callRestart: L('Позвать · начать заново', 'Покликати · почати знову', 'Nudge · start again', 'Avisar · empezar de nuevo', 'Chamar · começar de novo', 'Rủ · bắt đầu lại', 'Ajak · mulai lagi', 'Çağır · yeniden başla', 'Zawołaj · zacznij od nowa'),
  highFive: L('Дать пять', 'Дати п’ять', 'High five', 'Chocar los cinco', 'Toca aqui', 'Đập tay', 'Beri tos', 'Çak', 'Przybij piątkę'),
  highFived: L('Пять отправлено', 'П’ять відправлено', 'High five sent', 'Choque de manos enviado', 'Toque enviado', 'Đã đập tay', 'Tos terkirim', 'Çak gönderildi', 'Piątka wysłana'),
  openCard: L('Открыть визитку', 'Відкрити візитку', 'Open profile card', 'Abrir tarjeta', 'Abrir cartão', 'Mở danh thiếp', 'Buka kartu profil', 'Kartı aç', 'Otwórz wizytówkę'),
  menu: L('Меню друга', 'Меню друга', 'Friend menu', 'Menú del amigo', 'Menu do amigo', 'Menu bạn bè', 'Menu teman', 'Arkadaş menüsü', 'Menu znajomego'),
  pairBroken: L('серия вдвоём прервалась', 'серія вдвох перервалася', 'your streak together ended', 'la racha juntos se cortó', 'a sequência juntos acabou', 'chuỗi cùng nhau đã đứt', 'rangkaian bersama terputus', 'birlikte serin bozuldu', 'wspólna seria przerwana'),
  offlineSaved: L('Нет сети · список сохранён', 'Немає мережі · список збережено', 'Offline · saved list', 'Sin conexión · lista guardada', 'Sem conexão · lista salva', 'Ngoại tuyến · danh sách đã lưu', 'Offline · daftar tersimpan', 'Çevrimdışı · kayıtlı liste', 'Offline · zapisana lista'),
  great: L('Отлично', 'Чудово', 'Great', 'Genial', 'Ótimo', 'Tuyệt vời', 'Mantap', 'Harika', 'Świetnie'),
} as const;

export const pairCopy = (lang: Lang, key: keyof typeof PAIR_COPY): string => pick(lang, PAIR_COPY[key]);

/** «12 дней подряд вдвоём» без числа (число — крупно отдельно): «дней подряд вдвоём». */
export function pairStreakDaysLabel(lang: Lang, n: number): string {
  return pick(lang, L(
    `${slavic(n, 'день', 'дня', 'дней')} подряд вдвоём`, `${slavic(n, 'день', 'дні', 'днів')} поспіль удвох`, `${n === 1 ? 'day' : 'days'} in a row together`,
    `${n === 1 ? 'día' : 'días'} seguidos juntos`, `${n === 1 ? 'dia' : 'dias'} seguidos juntos`, 'ngày liên tiếp cùng nhau', 'hari berturut-turut bersama', 'gün üst üste birlikte', `${n === 1 ? 'dzień' : 'dni'} z rzędu razem`,
  ));
}

/** «лучшая 21». */
export function pairBestLabel(lang: Lang, best: number): string {
  return pick(lang, L(`лучшая ${best}`, `найкраща ${best}`, `best ${best}`, `mejor ${best}`, `melhor ${best}`, `cao nhất ${best}`, `terbaik ${best}`, `en iyi ${best}`, `najlepsza ${best}`));
}

/** Строка в «Сегодня» на Главной: «Серия вдвоём · Лидия». */
export function pairHomeTitle(lang: Lang, friendName: string): string {
  return pick(lang, L(`Серия вдвоём · ${friendName}`, `Серія вдвох · ${friendName}`, `Streak together · ${friendName}`, `Racha juntos · ${friendName}`, `Sequência juntos · ${friendName}`, `Chuỗi cùng nhau · ${friendName}`, `Rangkaian bersama · ${friendName}`, `Birlikte seri · ${friendName}`, `Wspólna seria · ${friendName}`));
}

/** Подзаголовок той же строки: «Уже занимался(ась) · 3 дня подряд». */
export function pairHomeSub(lang: Lang, streak: number): string {
  return pick(lang, L(
    `Занятие сделано · ${streak} ${slavic(streak, 'день', 'дня', 'дней')} подряд`, `Заняття зроблено · ${streak} ${slavic(streak, 'день', 'дні', 'днів')} поспіль`, `Already studied · ${streak} ${streak === 1 ? 'day' : 'days'} in a row`,
    `Ya estudió · ${streak} ${streak === 1 ? 'día' : 'días'} seguidos`, `Já estudou · ${streak} ${streak === 1 ? 'dia' : 'dias'} seguidos`, `Đã học · ${streak} ngày liên tiếp`, `Sudah belajar · ${streak} hari berturut-turut`, `Çalıştı · ${streak} gün üst üste`, `Nauka zrobiona · ${streak} ${streak === 1 ? 'dzień' : 'dni'} z rzędu`,
  ));
}

/** Финал занятия: «Серия вдвоём · 13 дней». */
export function pairDoneTitle(lang: Lang, streak: number): string {
  return pick(lang, L(
    `Серия вдвоём · ${streak} ${slavic(streak, 'день', 'дня', 'дней')}`, `Серія вдвох · ${streak} ${slavic(streak, 'день', 'дні', 'днів')}`, `Streak together · ${streak} ${streak === 1 ? 'day' : 'days'}`,
    `Racha juntos · ${streak} ${streak === 1 ? 'día' : 'días'}`, `Sequência juntos · ${streak} ${streak === 1 ? 'dia' : 'dias'}`, `Chuỗi cùng nhau · ${streak} ngày`, `Rangkaian bersama · ${streak} hari`, `Birlikte seri · ${streak} gün`, `Wspólna seria · ${streak} ${streak === 1 ? 'dzień' : 'dni'}`,
  ));
}

/** Финал занятия, первый ряд: «Ирина тоже сегодня занималась» (род неизвестен — «(ась)»). */
export function pairDoneFriendAlsoToday(lang: Lang, friendName: string): string {
  // зачем (Переводчик 21.10, «без рода»): черновик ru/uk/pl в том же духе — отдан Переводчику на сверку
  return pick(lang, L(`${friendName}: занятие сегодня тоже сделано`, `${friendName}: заняття сьогодні теж зроблено`, `${friendName} studied today too`, `${friendName} también estudió hoy`, `${friendName} também estudou hoje`, `${friendName} cũng đã học hôm nay`, `${friendName} juga belajar hari ini`, `${friendName} da bugün çalıştı`, `${friendName}: dziś też nauka zrobiona`));
}

/** Финал занятия, второй ряд: «Марк ещё не занимался(ась)». */
export function pairDoneFriendPending(lang: Lang, friendName: string): string {
  return pick(lang, L(`${friendName}: сегодня ещё без занятия`, `${friendName}: сьогодні ще без заняття`, `${friendName} hasn’t studied yet`, `${friendName} aún no ha estudiado`, `${friendName} ainda não estudou`, `${friendName} chưa học hôm nay`, `${friendName} belum belajar`, `${friendName} henüz çalışmadı`, `${friendName}: dziś jeszcze bez nauki`));
}

/** Веха серии вдвоём: «Серия вдвоём — 30 дней». */
export function pairMilestoneTitle(lang: Lang, n: number): string {
  return pick(lang, L(
    `Серия вдвоём — ${n} ${slavic(n, 'день', 'дня', 'дней')}`, `Серія вдвох — ${n} ${slavic(n, 'день', 'дні', 'днів')}`, `${n}-day streak together`,
    `Racha juntos: ${n} días`, `Sequência juntos: ${n} dias`, `Chuỗi cùng nhau ${n} ngày`, `Rangkaian bersama ${n} hari`, `Birlikte ${n} günlük seri`, `Wspólna seria: ${n} dni`,
  ));
}

export function pairMilestoneBody(lang: Lang, n: number): string {
  const days = pick(lang, L(
    `${n} ${slavic(n, 'день', 'дня', 'дней')} подряд вы оба занимаетесь каждый день.`, `${n} ${slavic(n, 'день', 'дні', 'днів')} поспіль ви обоє займаєтеся щодня.`, `You have both studied every day for ${n} days in a row.`,
    `Llevan ${n} días seguidos estudiando los dos cada día.`, `Vocês dois estudam todos os dias há ${n} dias seguidos.`, `Cả hai đã học mỗi ngày suốt ${n} ngày liên tiếp.`, `Kalian berdua belajar setiap hari selama ${n} hari berturut-turut.`, `${n} gündür ikiniz de her gün çalışıyorsunuz.`, `Oboje uczycie się codziennie od ${n} dni z rzędu.`,
  ));
  const flame = pairMilestoneFlameLine(lang, n);
  return flame ? `${days} ${flame}` : days;
}

/**
 * Огонь пары сменил цвет (макет: «Огонь пары стал голубым»): от 30 дней голубой, от 100 — белый; на 7 днях — без строки.
 * Пороги — те же, что в pairFlameStage, чтобы текст и огонь не расходились.
 */
function pairMilestoneFlameLine(lang: Lang, n: number): string | null {
  if (n >= 100) {
    return pick(lang, L('Огонь пары стал белым.', 'Вогонь пари став білим.', 'Your shared flame turned white.', 'Su llama compartida se volvió blanca.', 'A chama de vocês ficou branca.', 'Ngọn lửa chung đã chuyển sang màu trắng.', 'Api bersama kalian jadi putih.', 'Ortak alevin beyaza döndü.', 'Wasz wspólny płomień stał się biały.'));
  }
  if (n >= 30) {
    return pick(lang, L('Огонь пары стал голубым.', 'Вогонь пари став блакитним.', 'Your shared flame turned blue.', 'Su llama compartida se volvió azul.', 'A chama de vocês ficou azul.', 'Ngọn lửa chung đã chuyển sang màu xanh.', 'Api bersama kalian jadi biru.', 'Ortak alevin maviye döndü.', 'Wasz wspólny płomień stał się niebieski.'));
  }
  return null;
}

/**
 * Тост «Позвать» без сети (макет «Нет сети»: «Позовём Марка, как только будет сеть») — все 9 языков сразу, как ждёт action_toast.
 * Имя без склонения («{Имя}: позовём…») — падеж имени не вывести; черновик ru — на сверку Переводчику.
 */
export function pairQueuedToast(friendName: string): Readonly<{ ru: string; uk: string; en: string; es: string; ptBr: string; vi: string; id: string; tr: string; pl: string }> {
  return {
    ru: `${friendName}: позовём, как только будет сеть`,
    uk: `${friendName}: покличемо, щойно буде мережа`,
    en: `${friendName}: we’ll nudge as soon as you’re online`,
    es: `${friendName}: avisaremos en cuanto haya conexión`,
    ptBr: `${friendName}: vamos chamar assim que houver conexão`,
    vi: `${friendName}: sẽ rủ ngay khi có mạng`,
    id: `${friendName}: akan diajak begitu ada jaringan`,
    tr: `${friendName}: bağlantı gelince çağrılacak`,
    pl: `${friendName}: zawołamy, gdy tylko będzie sieć`,
  };
}

/** Строка окна приглашения: «Серия вдвоём · 7 дней». */
export function pairInviteLine(lang: Lang, n: number): string {
  return pairDoneTitle(lang, n);
}

/** Буквы дней недели с понедельника. */
export function weekdayLetters(lang: Lang): readonly string[] {
  const ru = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  switch (lang) {
    case 'uk': return ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
    case 'en': return ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    case 'es': return ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
    case 'pt-BR': return ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']; // зачем (Переводчик 21.10): так сокращают в Бразилии
    case 'vi': return ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    case 'id': return ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg'];
    case 'tr': return ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];
    case 'pl': return ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
    default: return ru;
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
