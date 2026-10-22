/**
 * «Урок вместе» (идея 2) у друга — тексты окна приглашения на 9 языках: «Алекс зовёт на занятие», строка занятия и срок,
 * факты отправителя (время, итог).
 * зачем (макет docs/design/v2-app/friends-full.html, идея 2 «Маркер и окно»): окно из кода «Пять минут на практику?» получает
 * вариант с занятием. Отдельный файл: lesson_together_copy.ts сейчас правит Переводчик. Имена не склоняем, род неизвестен.
 * Черновик — на сверку Переводчику.
 */
import { triLang, type Lang } from '../../constants/i18n';

type L9 = Readonly<{ ru: string; uk: string; en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>;
const L = (ru: string, uk: string, en: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string): L9 =>
  ({ ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
const pick = (lang: Lang, copy: L9): string => triLang(lang, copy);

/** «Алекс зовёт на занятие». */
export function lessonInviteFriendTitle(lang: Lang, name: string): string {
  return pick(lang, L(`${name} зовёт на занятие`, `${name} кличе на заняття`, `${name} invites you to a session`, `${name} te invita a una sesión`, `${name} te convida para uma sessão`, `${name} rủ bạn học cùng`, `${name} mengajakmu ke sesi`, `${name} seni derse çağırıyor`, `${name} zaprasza cię na zajęcia`));
}

/** «Урок 2 · Занятие 3. Пройди сегодня — до полуночи.» */
export function lessonInviteFriendBody(lang: Lang, lessonOrdinal: number, sessionOrdinal: number): string {
  const l = lessonOrdinal;
  const s = sessionOrdinal;
  return pick(lang, L(
    `Урок ${l} · Занятие ${s}. Пройди сегодня — до полуночи.`,
    `Урок ${l} · Заняття ${s}. Пройди сьогодні — до опівночі.`,
    `Lesson ${l} · Session ${s}. Finish it today, before midnight.`,
    `Lección ${l} · Sesión ${s}. Hazla hoy, antes de medianoche.`,
    `Lição ${l} · Sessão ${s}. Conclua hoje, antes da meia-noite.`,
    `Bài ${l} · Phần ${s}. Học xong hôm nay, trước nửa đêm.`,
    `Pelajaran ${l} · Sesi ${s}. Selesaikan hari ini, sebelum tengah malam.`,
    `${l}. ders · ${s}. oturum. Bugün gece yarısından önce bitir.`,
    `Lekcja ${l} · Zajęcia ${s}. Ukończ dziś, przed północą.`,
  ));
}

export type LessonInviteFact = Readonly<{ key: 'time' | 'result'; value: string; label: string }>;

/** Факты отправителя под текстом окна: «6 мин · время», «3 ★ · итог». Нет данных — факта нет, ничего не выдумываем. */
export function lessonInviteFriendFacts(lang: Lang, minutes: number | undefined, stars: number | undefined): readonly LessonInviteFact[] {
  const facts: LessonInviteFact[] = [];
  if (typeof minutes === 'number' && minutes > 0) {
    const unit = pick(lang, L('мин', 'хв', 'min', 'min', 'min', 'phút', 'mnt', 'dk', 'min'));
    facts.push({ key: 'time', value: `${minutes} ${unit}`, label: pick(lang, L('время', 'час', 'time', 'tiempo', 'tempo', 'thời gian', 'waktu', 'süre', 'czas')) });
  }
  if (typeof stars === 'number' && stars > 0) {
    facts.push({ key: 'result', value: `${stars} ★`, label: pick(lang, L('итог', 'підсумок', 'result', 'resultado', 'resultado', 'kết quả', 'hasil', 'sonuç', 'wynik')) });
  }
  return facts;
}

/** Тост после награды «вместе»: «Алекс: занятие вместе · +2 каждому». Имя перед двоеточием — не склоняем. */
export function lessonTogetherClaimToast(name: string, coins: number): Readonly<{ ru: string; uk: string; en: string; es: string; ptBr: string; vi: string; id: string; tr: string; pl: string }> {
  const who = name ? `${name}: ` : '';
  return {
    ru: `${who}занятие вместе · +${coins} каждому`,
    uk: `${who}заняття разом · +${coins} кожному`,
    en: `${who}session together · +${coins} each`,
    es: `${who}sesión juntos · +${coins} cada uno`,
    ptBr: `${who}sessão juntos · +${coins} para cada um`,
    vi: `${who}học cùng nhau · +${coins} mỗi người`,
    id: `${who}sesi bersama · +${coins} masing-masing`,
    tr: `${who}birlikte ders · her birine +${coins}`,
    pl: `${who}zajęcia razem · +${coins} dla każdego`,
  };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
