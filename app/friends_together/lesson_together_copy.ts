/**
 * «Урок вместе» (идея 2) — тексты на 9 языках: кнопка в финале занятия, выбор друзей, «отправлено».
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html, идея 2): одно место для текстов приглашения на занятие.
 * Род друга неизвестен — формулировки безличные («Уже пройдено»), имена не склоняем. Черновик — на сверку Переводчику.
 */
import { triLang, type Lang } from '../../constants/i18n';
import type { LessonInviteStatus } from './lesson_together';

type L9 = Readonly<{ ru: string; uk: string; en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>;
const L = (ru: string, uk: string, en: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string): L9 =>
  ({ ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
const pick = (lang: Lang, copy: L9): string => triLang(lang, copy);

/** Вторичная кнопка в финале занятия, под «Продолжить». */
export function lessonInviteButton(lang: Lang): string {
  return pick(lang, L('Позвать друга на это занятие', 'Покликати друга на це заняття', 'Invite a friend to this session', 'Invitar a un amigo a esta sesión', 'Convidar um amigo para esta sessão', 'Rủ bạn học buổi này', 'Ajak teman ke sesi ini', 'Bu oturuma bir arkadaşını çağır', 'Zaproś znajomego na te zajęcia'));
}

export function lessonInviteSheetTitle(lang: Lang): string {
  return pick(lang, L('Позвать на занятие', 'Покликати на заняття', 'Invite to this session', 'Invitar a la sesión', 'Convidar para a sessão', 'Rủ học cùng', 'Ajak ke sesi', 'Oturuma çağır', 'Zaproś na zajęcia'));
}

/** «Урок 2 · Занятие 3 · Are you…?. Кто пройдёт его сегодня — получит награду «вместе», и ты тоже.» */
export function lessonInviteSheetBody(lang: Lang, lessonLine: string): string {
  return pick(lang, L(
    `${lessonLine}. Кто пройдёт его сегодня — получит награду «вместе», и ты тоже.`,
    `${lessonLine}. Хто пройде його сьогодні — отримає нагороду «разом», і ти теж.`,
    `${lessonLine}. Whoever finishes it today gets the “together” reward — and so do you.`,
    `${lessonLine}. Quien la termine hoy recibe el premio «juntos», y tú también.`,
    `${lessonLine}. Quem concluir hoje ganha a recompensa “juntos” — e você também.`,
    `${lessonLine}. Ai học xong hôm nay sẽ nhận thưởng “cùng nhau”, và bạn cũng vậy.`,
    `${lessonLine}. Yang menyelesaikannya hari ini dapat hadiah “bersama”, kamu juga.`,
    `${lessonLine}. Bugün bitiren “birlikte” ödülünü alır, sen de.`,
    `${lessonLine}. Kto ukończy je dziś, dostanie nagrodę „razem” — ty też.`,
  ));
}

/** Подпись строки друга в выборе: урок открыт / уже пройдено / ещё закрыт; прогресс неизвестен — подписи нет. */
export function lessonInviteStatusLine(lang: Lang, status: LessonInviteStatus, lesson: number): string | null {
  switch (status) {
    case 'unknown':
      return null;
    case 'open':
      return pick(lang, L(`Урок ${lesson} открыт`, `Урок ${lesson} відкрито`, `Lesson ${lesson} unlocked`, `Lección ${lesson} abierta`, `Lição ${lesson} liberada`, `Bài ${lesson} đã mở`, `Pelajaran ${lesson} terbuka`, `${lesson}. ders açık`, `Lekcja ${lesson} odblokowana`));
    case 'done':
      return pick(lang, L('Уже пройдено · позовём повторить', 'Уже пройдено · покличемо повторити', 'Already done · invite to review', 'Ya completada · invitar a repasar', 'Já concluída · chamar para revisar', 'Đã học · rủ ôn lại', 'Sudah selesai · ajak mengulang', 'Zaten bitti · tekrar için çağır', 'Już ukończone · zaproś na powtórkę'));
    default:
      return pick(lang, L(`Урок ${lesson} ещё закрыт`, `Урок ${lesson} ще закрито`, `Lesson ${lesson} still locked`, `Lección ${lesson} aún cerrada`, `Lição ${lesson} ainda bloqueada`, `Bài ${lesson} chưa mở`, `Pelajaran ${lesson} masih terkunci`, `${lesson}. ders henüz kilitli`, `Lekcja ${lesson} jeszcze zablokowana`));
  }
}

/** Главная кнопка выбора по числу отмеченных (0 — подсказка, кнопка неактивна). */
export function lessonInviteCta(lang: Lang, count: number): string {
  if (count <= 0) return pick(lang, L('Выбери друзей', 'Обери друзів', 'Pick friends', 'Elige amigos', 'Escolha amigos', 'Chọn bạn', 'Pilih teman', 'Arkadaş seç', 'Wybierz znajomych'));
  if (count === 1) return pick(lang, L('Позвать друга', 'Покликати друга', 'Invite 1 friend', 'Invitar a 1 amigo', 'Convidar 1 amigo', 'Rủ 1 bạn', 'Ajak 1 teman', '1 arkadaşı çağır', 'Zaproś 1 osobę'));
  if (count === 2) return pick(lang, L('Позвать двоих', 'Покликати двох', 'Invite 2 friends', 'Invitar a 2 amigos', 'Convidar 2 amigos', 'Rủ 2 bạn', 'Ajak 2 teman', '2 arkadaşı çağır', 'Zaproś 2 osoby'));
  return pick(lang, L('Позвать троих', 'Покликати трьох', 'Invite 3 friends', 'Invitar a 3 amigos', 'Convidar 3 amigos', 'Rủ 3 bạn', 'Ajak 3 teman', '3 arkadaşı çağır', 'Zaproś 3 osoby'));
}

/** Строка под кнопкой: предел виден до нажатия (макет «Выбраны трое»). */
export function lessonInviteLimitNote(lang: Lang, full: boolean): string {
  return full
    ? pick(lang, L('Трое — максимум за занятие', 'Троє — максимум за заняття', 'Three is the maximum per session', 'Tres es el máximo por sesión', 'Três é o máximo por sessão', 'Ba bạn là tối đa mỗi buổi', 'Tiga adalah batas per sesi', 'Oturum başına en fazla üç kişi', 'Trzy osoby to maksimum na zajęcia'))
    : pick(lang, L('До трёх друзей за занятие', 'До трьох друзів за заняття', 'Up to three friends per session', 'Hasta tres amigos por sesión', 'Até três amigos por sessão', 'Tối đa ba bạn mỗi buổi', 'Maksimal tiga teman per sesi', 'Oturum başına en fazla üç arkadaş', 'Do trzech znajomych na zajęcia'));
}

/** Нет друзей — пустой выбор (макет «Нет друзей»). */
export function lessonInviteEmptyCopy(lang: Lang): Readonly<{ title: string; body: string; add: string; later: string }> {
  return {
    title: pick(lang, L('Пока некого позвать', 'Поки нікого покликати', 'No one to invite yet', 'Aún no hay a quién invitar', 'Ainda não há quem convidar', 'Chưa có ai để rủ', 'Belum ada yang bisa diajak', 'Henüz çağıracak kimse yok', 'Na razie nie ma kogo zaprosić')),
    body: pick(lang, L('Добавь друга — и проходите занятия вместе.', 'Додай друга — і проходьте заняття разом.', 'Add a friend and take sessions together.', 'Añade a un amigo y hagan las sesiones juntos.', 'Adicione um amigo e façam as sessões juntos.', 'Thêm bạn để học cùng nhau.', 'Tambahkan teman dan ikuti sesi bersama.', 'Bir arkadaş ekle, dersleri birlikte yapın.', 'Dodaj znajomego i róbcie zajęcia razem.')),
    add: pick(lang, L('Добавить друга', 'Додати друга', 'Add a friend', 'Añadir amigo', 'Adicionar amigo', 'Thêm bạn', 'Tambah teman', 'Arkadaş ekle', 'Dodaj znajomego')),
    later: pick(lang, L('Не сейчас', 'Не зараз', 'Not now', 'Ahora no', 'Agora não', 'Để sau', 'Nanti saja', 'Şimdi değil', 'Nie teraz')),
  };
}

/** Кнопка в финале после отправки: «Приглашения ушли: Ирина, Олег» (имена не склоняем). */
export function lessonInviteSentLine(lang: Lang, names: readonly string[]): string {
  const list = names.join(', ');
  return pick(lang, L(`Приглашения ушли: ${list}`, `Запрошення надіслано: ${list}`, `Invites sent: ${list}`, `Invitaciones enviadas: ${list}`, `Convites enviados: ${list}`, `Đã gửi lời mời: ${list}`, `Undangan terkirim: ${list}`, `Davetler gönderildi: ${list}`, `Zaproszenia wysłane: ${list}`));
}

/** Тост после отправки. Тексты — для action_toast (messageRu … messagePl). */
export function lessonInviteSentToast(): Readonly<{ ru: string; uk: string; en: string; es: string; ptBr: string; vi: string; id: string; tr: string; pl: string }> {
  return {
    ru: 'Приглашения ушли. Напишем, когда пройдут',
    uk: 'Запрошення надіслано. Напишемо, коли пройдуть',
    en: 'Invites sent. We’ll let you know when they finish',
    es: 'Invitaciones enviadas. Te avisaremos cuando terminen',
    ptBr: 'Convites enviados. Avisaremos quando concluírem',
    vi: 'Đã gửi lời mời. Mình sẽ báo khi bạn bè học xong',
    id: 'Undangan terkirim. Kami kabari saat mereka selesai',
    tr: 'Davetler gönderildi. Bitirdiklerinde haber vereceğiz',
    pl: 'Zaproszenia wysłane. Damy znać, gdy skończą',
  };
}

/** «Урок 2 · Занятие 3» — строка занятия в выборе друзей и в приглашении. */
export function lessonInviteLessonLine(lang: Lang, lesson: number, session: number): string {
  return pick(lang, L(`Урок ${lesson} · Занятие ${session}`, `Урок ${lesson} · Заняття ${session}`, `Lesson ${lesson} · Session ${session}`, `Lección ${lesson} · Sesión ${session}`, `Lição ${lesson} · Sessão ${session}`, `Bài ${lesson} · Buổi ${session}`, `Pelajaran ${lesson} · Sesi ${session}`, `${lesson}. ders · ${session}. oturum`, `Lekcja ${lesson} · Zajęcia ${session}`));
}

/** Тост, если приглашения не ушли: предел на занятие — честно, остальное — «попробуй ещё раз». */
export function lessonInviteFailToast(limit: boolean): Readonly<{ ru: string; uk: string; en: string; es: string; ptBr: string; vi: string; id: string; tr: string; pl: string }> {
  return limit
    ? { ru: 'На это занятие сегодня уже позвали троих', uk: 'На це заняття сьогодні вже покликали трьох', en: 'You’ve already invited three friends to this session today', es: 'Hoy ya invitaste a tres amigos a esta sesión', ptBr: 'Você já convidou três amigos para esta sessão hoje', vi: 'Hôm nay bạn đã rủ ba người học buổi này', id: 'Hari ini kamu sudah mengajak tiga teman ke sesi ini', tr: 'Bu oturuma bugün zaten üç kişiyi çağırdın', pl: 'Na te zajęcia zaproszono dziś już trzy osoby' }
    : { ru: 'Сейчас не получилось. Попробуй ещё раз', uk: 'Зараз не вийшло. Спробуй ще раз', en: 'Didn’t work this time. Try again', es: 'No funcionó esta vez. Inténtalo de nuevo', ptBr: 'Não deu certo agora. Tente de novo', vi: 'Lúc này chưa được. Hãy thử lại', id: 'Belum berhasil. Coba lagi', tr: 'Şu an olmadı. Tekrar dene', pl: 'Teraz się nie udało. Spróbuj ponownie' };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
