// speaking_no_speech_copy.ts — честная подпись «не расслышал» по причине (жалоба №4, решение координатора 25.10, вариант 3).
// зачем: раньше любой пустой результат показывал «Не расслышал. Скажи чуть громче», хотя громкость не измеряется вовсе —
// человек повторял громче, а причина была в коротком нажатии, длинной фразе или неготовой модели. Каждая строка говорит, что
// сделать дальше. Голос — docs/work/VOICE.md (тон «тепло»). ЧЕРНОВИКИ до ответа Переводчика: порядок ru, uk, en, es, pt-BR, vi, id, tr, pl.
import { triLang, type Lang } from '../constants/i18n';

export type SpeakingNoSpeechKind = 'short' | 'long' | 'retry' | 'loading' | 'empty';

/** С какой длины (слов) фраза «длинная»: таймаут судьи на короткой фразе — это скорость телефона, а не длина. */
export const SPEAKING_LONG_PHRASE_WORDS = 6;

type Nine = readonly [string, string, string, string, string, string, string, string, string];

const COPY: Readonly<Record<SpeakingNoSpeechKind, Nine>> = {
  short: [
    'Держи кнопку, пока говоришь, — отпусти после последнего слова',
    'Тримай кнопку, поки говориш, — відпусти після останнього слова',
    'Hold the button while you speak — let go after the last word',
    'Mantén el botón mientras hablas y suéltalo al final',
    'Segure o botão enquanto fala e solte no fim',
    'Giữ nút khi nói, thả ra sau từ cuối cùng',
    'Tahan tombol saat bicara, lepas setelah kata terakhir',
    'Konuşurken tuşa basılı tut, son kelimeden sonra bırak',
    'Trzymaj przycisk, gdy mówisz, puść po ostatnim słowie',
  ],
  long: [
    'Длинная фраза! Скажи чуть быстрее — я успею',
    'Довга фраза! Скажи трохи швидше — я встигну',
    'Long one! Say it a bit faster — I’ll keep up',
    '¡Frase larga! Dila un poco más rápido',
    'Frase longa! Fale um pouco mais rápido',
    'Câu dài đấy! Nói nhanh hơn một chút nhé',
    'Kalimatnya panjang! Ucapkan sedikit lebih cepat',
    'Uzun cümle! Biraz daha hızlı söyle',
    'Długie zdanie! Powiedz je trochę szybciej',
  ],
  // зачем (Ревизор → координатор 25.10): судья не уложился на короткой фразе (медленный телефон) или сломался — человек ни при чём,
  // нейтрально «не успел разобрать — скажи ещё раз», без «длинная» и без «ближе к телефону»
  retry: [
    'Не успел разобрать. Скажи ещё раз',
    'Не встиг розібрати. Скажи ще раз',
    'Didn’t catch that in time. Say it again',
    'No me dio tiempo a entenderlo. Repítelo',
    'Não deu tempo de entender. Diga de novo',
    'Chưa kịp nghe rõ. Nói lại nhé',
    'Belum sempat menangkapnya. Ucapkan lagi',
    'Anlamaya yetişemedim. Bir daha söyle',
    'Nie zdążyłem zrozumieć. Powiedz jeszcze raz',
  ],
  loading: [
    'Распознавание ещё просыпается. Секунду — и повтори',
    'Розпізнавання ще прокидається. Секунду — і повтори',
    'Speech check is still waking up. A second, then try again',
    'El reconocimiento aún despierta. Un segundo y repite',
    'O reconhecimento ainda está acordando. Um segundo e repita',
    'Nhận dạng giọng nói đang khởi động. Chờ chút rồi thử lại',
    'Pengenalan suara masih bersiap. Sebentar, lalu ulangi',
    'Ses tanıma daha uyanıyor. Bir saniye, sonra tekrar dene',
    'Rozpoznawanie jeszcze się budzi. Chwila i spróbuj znowu',
  ],
  empty: [
    'Не разобрал слова. Чуть ближе к телефону — и ещё раз',
    'Не розібрав слова. Трохи ближче до телефона — і ще раз',
    'Couldn’t make out the words. Come a bit closer and try again',
    'No entendí las palabras. Acércate un poco y repite',
    'Não entendi as palavras. Chegue mais perto e repita',
    'Chưa nghe rõ từ. Lại gần điện thoại hơn và thử lại',
    'Kata-katanya belum jelas. Lebih dekat ke ponsel, lalu ulangi',
    'Kelimeleri seçemedim. Telefona biraz yaklaş ve tekrar dene',
    'Nie rozróżniłem słów. Bliżej telefonu i jeszcze raz',
  ],
};

export const SPEAKING_NO_SPEECH_COPY: Readonly<Record<SpeakingNoSpeechKind, Nine>> = COPY;

// зачем (Ревизор 25.10, tsc): проп lang у SpeakingPanel — string; triLang берёт ветку по строке, незнакомый язык уходит в ru
export function speakingNoSpeechText(lang: string, kind: SpeakingNoSpeechKind): string {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = COPY[kind];
  return triLang(lang as Lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
}

/**
 * Причина исхода «не расслышал» → подпись: короткое нажатие / длинная фраза (таймаут на фразе от 6 слов) / не успел разобрать
 * (таймаут на короткой фразе, сбой судьи) / модель не готова / слова не разобраны.
 */
export function speakingNoSpeechKindOf(reason: string, targetWords?: number): SpeakingNoSpeechKind {
  if (reason === 'no_wav') return 'short';
  if (reason === 'timeout') return (targetWords ?? 0) >= SPEAKING_LONG_PHRASE_WORDS ? 'long' : 'retry';
  if (reason === 'threw' || reason === 'score_null') return 'retry';
  if (reason === 'ctx_unavailable') return 'loading';
  return 'empty';
}
