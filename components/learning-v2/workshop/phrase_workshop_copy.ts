// ═══════════════════════════════════════════════════════════════════════════
// phrase_workshop_copy.ts — тексты «Мастерской фраз» на 9 языках.
//
// зачем (владелец 25.10: название «Мастерская фраз», макет утверждён «Да, так»): название кнопки у пройденного урока и
// подсказка для состояния «копится» (тост по ActionToast). Порядок как везде: ru, uk, en, es, pt-BR, vi, id, tr, pl.
// Утверждено Переводчиком (10) 25.10: tr «ifade» — как «фраза» во всём приложении; длина — до 17 знаков, кнопка 16/700 в одну строку.
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];

const S = {
  /** Название входа — подпись на кнопке и в шапке режима. */
  title: ['Мастерская фраз', 'Майстерня фраз', 'Phrase workshop', 'Taller de frases', 'Oficina de frases', 'Xưởng ghép câu', 'Bengkel frasa', 'İfade atölyesi', 'Warsztat fraz'],
  /** Тост на тап по приглушённой кнопке: банк ещё накапливается. Без чисел и порогов. */
  accumulating: [
    'Откроется чуть позже — повтори пару занятий урока',
    'Відкриється трохи пізніше — повтори кілька занять уроку',
    'Opens a bit later — repeat a couple of the lesson’s sessions',
    'Se abrirá un poco más tarde: repite un par de sesiones de la lección',
    'Abre um pouco mais tarde — repita algumas sessões da lição',
    'Sẽ mở sau một chút — hãy ôn lại vài buổi của bài học',
    'Akan terbuka sebentar lagi — ulangi beberapa sesi pelajaran',
    'Biraz sonra açılacak — dersin birkaç oturumunu tekrar et',
    'Otworzy się nieco później — powtórz kilka sesji lekcji',
  ],
} as const satisfies Record<string, Nine>;

export type PhraseWorkshopStringKey = keyof typeof S;

export function phraseWorkshopText(lang: Lang, key: PhraseWorkshopStringKey): string {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = S[key];
  return triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
}

/** Поля события action_toast на 9 языках (как prepHintToastFields): строчный вид с плиткой-значком часов. */
export function phraseWorkshopToastFields(): Readonly<{ messageRu: string; messageUk: string; messageEn: string; messageEs: string; messagePtBr: string; messageVi: string; messageId: string; messageTr: string; messagePl: string }> {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = S.accumulating;
  return { messageRu: ru, messageUk: uk, messageEn: en, messageEs: es, messagePtBr: ptBR, messageVi: vi, messageId: id, messageTr: tr, messagePl: pl };
}
