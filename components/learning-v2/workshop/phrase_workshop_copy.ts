// ═══════════════════════════════════════════════════════════════════════════
// phrase_workshop_copy.ts — тексты «Мастерской фраз» на 9 языках.
//
// зачем (владелец 25.10: название «Мастерская фраз», макет утверждён «Да, так»): название кнопки у пройденного урока и
// подсказка для состояния «копится» (тост по ActionToast). Порядок как везде: ru, uk, en, es, pt-BR, vi, id, tr, pl.
// Утверждено Переводчиком (10) 25.10: uk «вислів», tr «ifade» — как «фраза» во всём приложении (uk — слово владельца 12.10); длина — до 17 знаков, кнопка 16/700 в одну строку.
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];

const S = {
  /** Название входа — подпись на кнопке и в шапке режима. */
  title: ['Мастерская фраз', 'Майстерня висловів', 'Phrase workshop', 'Taller de frases', 'Oficina de frases', 'Xưởng ghép câu', 'Bengkel frasa', 'İfade atölyesi', 'Warsztat fraz'],
  /** Тост на тап по приглушённой кнопке: банк ещё накапливается. Без чисел и порогов. */
  accumulating: [
    // зачем (голос PhraseMan, VOICE.md 25.10): живой образ вместо «откроется позже»; «session» → слово урока, как во всём приложении
    'Мастерская ещё разогревается — повтори пару занятий урока',
    'Майстерня ще розігрівається — повтори кілька занять уроку',
    'The workshop is still warming up — redo a couple of practice rounds',
    'El taller aún se está calentando: repite un par de prácticas de la lección',
    'A oficina ainda está esquentando — refaça algumas práticas da lição',
    'Xưởng vẫn đang khởi động — ôn lại vài phần của bài học nhé',
    'Bengkelnya masih pemanasan — ulangi beberapa latihan pelajaran',
    'Atölye hâlâ ısınıyor — dersin birkaç alıştırmasını tekrar et',
    'Warsztat jeszcze się rozgrzewa — powtórz kilka ćwiczeń z lekcji',
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
