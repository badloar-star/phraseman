// ═══════════════════════════════════════════════════════════════════════════
// prep_cta_copy.ts — тексты «Готовим занятие…» на 9 языках (живой макет lesson-preparing-live.html, 25.10).
//
// зачем: три строки — подпись на занятой кнопке, подпись через 6 с и подсказка, когда не успело за 12 с. Подсказка «Нажми «Продолжить»…»
// и «Начать» — те же слова, что человек видит на кнопке (и та же фраза, что уже есть у вкладки «Уроки» для «Начать»).
// Порядок как везде: ru, uk, en, es, pt-BR, vi, id, tr, pl. Строки сверены с Переводчиком (docs/work/tasks/lv2-preparing-and-packs-error-copy-2026-10-25.md, 25.10): «Готовим занятие…» / «Ещё готовится…» / подсказка «Нажми «Продолжить»…».
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];

const S = {
  /** Подпись на занятой кнопке (с 0,35 с до 6 с). */
  preparing: ['Готовим занятие…', 'Готуємо заняття…', 'Getting your session ready…', 'Preparando tu sesión…', 'Preparando sua sessão…', 'Đang chuẩn bị buổi học…', 'Menyiapkan sesi…', 'Oturum hazırlanıyor…', 'Przygotowujemy zajęcia…'],
  /** Подпись с 6 с до срока. */
  still: ['Ещё секунду…', 'Ще секунду…', 'Still getting ready…', 'Aún preparándose…', 'Ainda preparando…', 'Vẫn đang chuẩn bị…', 'Masih disiapkan…', 'Hâlâ hazırlanıyor…', 'Jeszcze się przygotowuje…'],
  /** Подсказка снизу, когда за 12 с не успело: Главная остаётся на месте. */
  hintContinue: ['Занятие ещё готовится. Нажми «Продолжить» через пару секунд', 'Заняття ще готується. Натисни «Продовжити» за кілька секунд', 'The session is still getting ready. Tap Continue again in a few seconds', 'La sesión aún se está preparando. Toca Continuar en unos segundos', 'A sessão ainda está sendo preparada. Toque em Continuar em alguns segundos', 'Buổi học vẫn đang chuẩn bị. Nhấn Tiếp tục sau vài giây', 'Sesi masih disiapkan. Ketuk Lanjutkan lagi dalam beberapa detik', 'Oturum hâlâ hazırlanıyor. Birkaç saniye sonra Devam et\'e dokun', 'Zajęcia jeszcze się przygotowują. Stuknij „Kontynuuj” za kilka sekund'],
  /** Подсказка, когда подготовка отказала не по сроку (материала нет): те же слова, что у вкладки «Уроки». */
  hintUnavailable: ['Сейчас недоступно. Попробуй снова чуть позже', 'Зараз недоступно. Спробуй ще раз трохи пізніше', 'Not available right now. Please try again a little later', 'No disponible ahora. Inténtalo de nuevo un poco más tarde', 'Indisponível agora. Tente de novo daqui a pouco', 'Hiện chưa dùng được. Hãy thử lại sau ít phút', 'Belum tersedia sekarang. Coba lagi nanti', 'Şu anda kullanılamıyor. Biraz sonra tekrar dene', 'Chwilowo niedostępne. Spróbuj ponownie za chwilę'],
} as const satisfies Record<string, Nine>;

export type PrepCtaStringKey = keyof typeof S;

export function prepCtaText(lang: Lang, key: PrepCtaStringKey): string {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = S[key];
  return triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
}

/** Подсказка для ActionToast (все 9 языков сразу, ключи полей события): по сроку — «ещё готовится», иначе — «сейчас недоступно». */
export function prepHintToastFields(kind: 'timeout' | 'unavailable' = 'timeout'): Readonly<{ messageRu: string; messageUk: string; messageEn: string; messageEs: string; messagePtBr: string; messageVi: string; messageId: string; messageTr: string; messagePl: string }> {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = kind === 'timeout' ? S.hintContinue : S.hintUnavailable;
  return { messageRu: ru, messageUk: uk, messageEn: en, messageEs: es, messagePtBr: ptBR, messageVi: vi, messageId: id, messageTr: tr, messagePl: pl };
}
