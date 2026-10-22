/**
 * «Фраза дня вдвоём» (идея 8) — тексты на 9 языках.
 *
 * зачем (координатор 22.10): черновик Переводчика docs/work/tasks/friends-6-8-9-copy-draft.md — добавка 9a5ff246e
 * (вопрос о значении: в контенте фразы дня только квест «что значит»). Без рода; имя только перед двоеточием — падеж не нужен.
 * «Дословно», «Верно», «Не совсем» — те же строки, что в DailyPhraseCard.tsx (Главная), чтобы фраза дня звучала одинаково.
 */
import { triLang, type Lang } from '../../constants/i18n';

type L9 = Readonly<{ ru: string; uk: string; en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>;
const L = (ru: string, uk: string, en: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string): L9 =>
  ({ ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });

const PHRASE_COPY = {
  kicker: L('Фраза дня вдвоём', 'Вислів дня вдвох', 'Phrase of the day together', 'Frase del día en pareja', 'Frase do dia juntos', 'Cụm từ hôm nay cùng bạn', 'Frasa hari ini bersama', 'Birlikte günün ifadesi', 'Zwrot dnia razem'),
  firstFriend: L('Пока никто из друзей не ответил — их ответы появятся здесь до полуночи', 'Поки ніхто з друзів не відповів — їхні відповіді з’являться тут до півночі', 'None of your friends has answered yet — their answers will show here until midnight', 'Aún no ha respondido ningún amigo: sus respuestas aparecerán aquí hasta medianoche', 'Nenhum amigo respondeu ainda — as respostas aparecem aqui até a meia-noite', 'Chưa có bạn nào trả lời — câu trả lời sẽ hiện ở đây đến nửa đêm', 'Belum ada teman yang menjawab — jawaban mereka muncul di sini sampai tengah malam', 'Henüz hiçbir arkadaşın cevap vermedi — cevapları gece yarısına kadar burada görünür', 'Nikt ze znajomych jeszcze nie odpowiedział — ich odpowiedzi pojawią się tu do północy'),
  tryHighFive: L('Можно дать пять за попытку', 'Можна дати п’ять за спробу', 'You can give a high five for trying', 'Puedes chocar los cinco por el intento', 'Dá para mandar um toque pela tentativa', 'Có thể đập tay khích lệ cho lần thử', 'Kamu bisa memberi tos untuk usahanya', 'Denemesi için çak yapabilirsin', 'Możesz przybić piątkę za próbę'),
  literal: L('Дословно', 'Дослівно', 'Literal translation', 'Traducción literal', 'Tradução literal', 'Dịch sát nghĩa', 'Terjemahan literal', 'Kelime kelime çeviri', 'Dosłownie'),
  right: L('Верно', 'Правильно', 'Correct', 'Correcto', 'Correto', 'Đúng', 'Benar', 'Doğru', 'Poprawnie'),
  wrong: L('Не совсем', 'Не зовсім', 'Not quite', 'No exactamente', 'Não exatamente', 'Chưa đúng', 'Belum tepat', 'Tam değil', 'Niezupełnie'),
  // те же слова, что у тостов друзей (friends.tsx, «Пять») — ответ не сохранился на телефоне, сети тут нет
  saveFailed: L('Сейчас не получилось. Попробуй ещё раз', 'Зараз не вийшло. Спробуй ще раз', "Didn't work this time. Try again", 'Ahora no ha funcionado. Inténtalo de nuevo', 'Não deu certo agora. Tente de novo', 'Lúc này chưa được. Hãy thử lại', 'Belum berhasil. Coba lagi', 'Şu an olmadı. Tekrar dene', 'Teraz się nie udało. Spróbuj ponownie'),
} as const;

export type FriendPhraseCopyKey = keyof typeof PHRASE_COPY;

export function phraseCopy(lang: Lang, key: FriendPhraseCopyKey): string {
  return triLang(lang, PHRASE_COPY[key]);
}

const QUESTION = L('Что значит «{phrase}»?', 'Що означає «{phrase}»?', 'What does “{phrase}” mean?', '¿Qué significa «{phrase}»?', 'O que significa “{phrase}”?', '“{phrase}” nghĩa là gì?', 'Apa arti “{phrase}”?', '“{phrase}” ne anlama geliyor?', 'Co znaczy „{phrase}”?');
const ANSWERED_ONE = L('{name}: ответ откроется после твоего', '{name}: відповідь відкриється після твоєї', '{name}: see the answer after yours', '{name}: verás su respuesta tras la tuya', '{name}: a resposta aparece depois da sua', '{name}: xem câu trả lời sau khi bạn trả lời', '{name}: jawabannya terbuka setelah jawabanmu', '{name}: cevabı seninkinden sonra açılır', '{name}: odpowiedź zobaczysz po swojej');
const ANSWERED_MANY = L('Уже ответили: {n} · ответы откроются после твоего', 'Вже відповіли: {n} · відповіді відкриються після твоєї', 'Answered: {n} · see them after yours', 'Ya respondieron: {n} · las verás tras la tuya', 'Já responderam: {n} · aparecem depois da sua', 'Đã trả lời: {n} · xem sau khi bạn trả lời', 'Sudah menjawab: {n} · terbuka setelah jawabanmu', 'Cevaplayan: {n} · seninkinden sonra açılır', 'Już odpowiedzieli: {n} · zobaczysz po swojej');

/** «Что значит «Break the ice»?» — кавычки по правилам языка (Переводчик). */
export function phraseQuestion(lang: Lang, phrase: string): string {
  return triLang(lang, QUESTION).replace('{phrase}', phrase);
}

/** Строка до ответа: кто уже ответил; без друзей — null (строки нет). Число справа от двоеточия не склоняется. */
export function phraseAnsweredLine(lang: Lang, names: readonly string[]): string | null {
  if (names.length === 0) return null;
  if (names.length === 1) return triLang(lang, ANSWERED_ONE).replace('{name}', names[0]!);
  return triLang(lang, ANSWERED_MANY).replace('{n}', String(names.length));
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
