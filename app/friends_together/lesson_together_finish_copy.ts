/**
 * «Урок вместе» (идея 2) — ряд «Занятие вместе» в финале у друга и тихая строка «Сообщений» у пригласившего, 9 языков.
 *
 * зачем (координатор 22.10; Переводчик 865d9c17b, docs/work/tasks/friends-6-8-9-copy-draft.md «Идея 2»): род человека
 * неизвестен и падеж имени не собрать — имя только перед двоеточием. Кавычки — по правилам языка.
 */
import { triLang, type Lang } from '../../constants/i18n';

type L9 = Readonly<{ ru: string; uk: string; en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>;
const L = (ru: string, uk: string, en: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string): L9 =>
  ({ ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });

const FINAL_TITLE = L('{name}: занятие вместе', '{name}: заняття разом', '{name}: a session together', '{name}: sesión juntos', '{name}: sessão juntos', '{name}: học cùng nhau', '{name}: sesi bersama', '{name}: birlikte oturum', '{name}: wspólne zajęcia');
const FINAL_SUB = L('Награда «вместе» — каждому', 'Нагорода «разом» — кожному', 'A “together” reward for both of you', 'Premio «juntos» para los dos', 'Prêmio “juntos” para vocês dois', 'Phần thưởng “cùng nhau” cho cả hai', 'Hadiah “bersama” untuk kalian berdua', 'İkinize de “birlikte” ödülü', 'Nagroda „razem” dla was obojga');
const INVITE_EXPIRED = L('{name}: приглашение закончилось в полночь', '{name}: запрошення закінчилося опівночі', '{name}: the invitation ended at midnight', '{name}: la invitación terminó a medianoche', '{name}: o convite terminou à meia-noite', '{name}: lời mời đã hết hạn lúc nửa đêm', '{name}: undangan berakhir tengah malam', '{name}: davet gece yarısı sona erdi', '{name}: zaproszenie wygasło o północy');

/** «Алекс: занятие вместе». */
export function finalTogetherTitle(lang: Lang, name: string): string {
  return triLang(lang, FINAL_TITLE).replace('{name}', name);
}

/** «Награда «вместе» — каждому». зачем (координатор 24.10): без «вам» — замок владельца «интерфейс на ты» (informal_address_ru_uk_guard). */
export function finalTogetherSub(lang: Lang): string {
  return triLang(lang, FINAL_SUB);
}

/** «Ирина: приглашение закончилось в полночь». */
export function bellInviteExpired(lang: Lang, name: string): string {
  return triLang(lang, INVITE_EXPIRED).replace('{name}', name);
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
