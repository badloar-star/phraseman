// ═══════════════════════════════════════════════════════════════════════════
// story_plus_offer_strings.ts — тексты трёх кадров-предложений Plus в «Историях» на 9 языках интерфейса.
//
// зачем (владелец 11.11: «карточки предложения переместить в истории и сделать красивый дизайн им»; макет
// docs/design/v2-app/stories-plus-offers.html): русские тексты — те, что владелец одобрил для карточек. Отдельный файл,
// а не story_template_strings.ts: раздел историй 11.11 правит другая сессия, общий файл текстов не трогаем.
// Формат тот же: девять значений ru, uk, en, es, pt-BR, vi, id, tr, pl.
// Заголовок кадра серии («7 дней подряд») здесь не дублируется — он собирается из уже переведённого `streakBigUnit`.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import { glueNumbers } from '../../moments/glue_numbers';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const S = {
  // подпись кнопки («Посмотреть Plus») лежит в общем story_template_strings.ts под ключом ctaSeePlus — её читает реестр кнопок
  // 1 · защита серии. Число защит написано словом/цифрой прямо в тексте (одобренная владельцем фраза «три защиты в месяц»);
  // сторож tests/story_plus_offer_frames_2026_11_11.test.ts ломается, если PREMIUM_FREE_FREEZES_PER_MONTH перестанет быть 3.
  streakText: [
    'С Plus серия не сгорит, если пропустишь день: три защиты в месяц.',
    'З Plus серія не згорить, якщо пропустиш день: три захисти на місяць.',
    'With Plus your streak survives a missed day: 3 shields a month.',
    'Con Plus tu racha no se pierde si faltas un día: 3 protecciones al mes.',
    'Com Plus sua sequência não se perde se você faltar um dia: 3 proteções por mês.',
    'Với Plus, chuỗi không mất khi bạn bỏ lỡ một ngày: 3 lần bảo vệ mỗi tháng.',
    'Dengan Plus, rangkaianmu tidak hangus jika melewatkan sehari: 3 pelindung per bulan.',
    'Plus ile bir günü kaçırsan da serin bozulmaz: ayda 3 koruma.',
    'Z Plus seria nie przepadnie, gdy opuścisz dzień: 3 ochrony w miesiącu.',
  ],
  // 2 · итог недели
  weekTitle: [
    'Итог недели на одной странице', 'Підсумок тижня на одній сторінці', 'Your week on one page', 'Tu semana en una página',
    'Sua semana em uma página', 'Tổng kết tuần trên một trang', 'Ringkasan minggu dalam satu halaman', 'Haftan tek sayfada', 'Twój tydzień na jednej stronie',
  ],
  weekText: [
    'Что укрепилось, где проседает и с чего начать новую неделю.',
    'Що закріпилося, де просідає і з чого почати новий тиждень.',
    'What got stronger, what slips and where to start next week.',
    'Qué se afianzó, qué falla y por dónde empezar la próxima semana.',
    'O que firmou, o que ainda falha e por onde começar a próxima semana.',
    'Điều đã vững, điều còn yếu và bắt đầu tuần mới từ đâu.',
    'Apa yang makin kuat, apa yang masih lemah, dan dari mana memulai minggu depan.',
    'Ne pekişti, ne aksıyor ve yeni haftaya nereden başlamalı.',
    'Co się utrwaliło, co kuleje i od czego zacząć nowy tydzień.',
  ],
  // 3 · диалоги без счётчика. Лимит 30 написан в тексте (одобренная фраза); сторож ломается, если
  // REVENUE_MONTHLY_LIMITS.ai_dialog_replies перестанет быть 30. Крупное число на кадре берётся из константы.
  dialogOverline: ['Диалоги с ИИ', 'Діалоги з ШІ', 'AI dialogues', 'Diálogos con IA', 'Diálogos com IA', 'Hội thoại với AI', 'Dialog dengan AI', 'Yapay zekâ diyalogları', 'Dialogi z AI'],
  dialogTitle: [
    'Второй диалог за плечами', 'Другий діалог позаду', 'Second dialogue done', 'Segundo diálogo hecho', 'Segundo diálogo concluído',
    'Xong hội thoại thứ hai', 'Dialog kedua selesai', 'İkinci diyalog tamam', 'Drugi dialog za tobą',
  ],
  dialogText: [
    'Бесплатно — 30 ответов в месяц. С Plus счётчика нет.',
    'Безкоштовно — 30 відповідей на місяць. З Plus лічильника немає.',
    'Free: 30 replies a month. With Plus there is no counter.',
    'Gratis: 30 respuestas al mes. Con Plus no hay contador.',
    'Grátis: 30 respostas por mês. Com Plus não há contador.',
    'Miễn phí: 30 câu trả lời mỗi tháng. Với Plus thì không giới hạn.',
    'Gratis: 30 balasan per bulan. Dengan Plus tidak ada penghitung.',
    'Ücretsiz: ayda 30 yanıt. Plus’ta sayaç yok.',
    'Za darmo: 30 odpowiedzi w miesiącu. Z Plus nie ma licznika.',
  ],
  // подпись под зачёркнутым числом лимита
  quotaUnit: ['ответов в месяц', 'відповідей на місяць', 'replies a month', 'respuestas al mes', 'respostas por mês', 'câu trả lời mỗi tháng', 'balasan per bulan', 'yanıt / ay', 'odpowiedzi w miesiącu'],
} as const satisfies Readonly<Record<string, Nine>>;

export type StoryPlusOfferStringKey = keyof typeof S;
export const STORY_PLUS_OFFER_STRING_KEYS = Object.keys(S) as StoryPlusOfferStringKey[];

/** Текст кадра-предложения на языке интерфейса; неизвестный язык — английский. Числа приклеены к словам неразрывным пробелом. */
export function plusOfferText(lang: Lang, key: StoryPlusOfferStringKey): string {
  const row: Nine = S[key];
  return glueNumbers(row[LANG_INDEX[lang] ?? LANG_INDEX.en!]!);
}
