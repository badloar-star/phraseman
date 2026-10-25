// speaking_no_speech_copy.ts — честная подпись «не расслышал» по причине (жалоба №4, решение координатора 25.10, вариант 3).
// зачем: раньше любой пустой результат показывал «Не расслышал. Скажи чуть громче», хотя громкость не измеряется вовсе —
// человек повторял громче, а причина была в коротком нажатии, длинной фразе или неготовой модели. Каждая строка говорит, что
// сделать дальше. Голос — docs/work/VOICE.md (тон «тепло»). Живые тексты Переводчика: 706b13a30 (short/long/loading/empty),
// 73b9ec696 (retry). Порядок: ru, uk, en, es, pt-BR, vi, id, tr, pl.
import { triLang, type Lang } from '../constants/i18n';

export type SpeakingNoSpeechKind = 'short' | 'long' | 'retry' | 'loading' | 'empty';

/** С какой длины (слов) фраза «длинная»: таймаут судьи на короткой фразе — это скорость телефона, а не длина. */
export const SPEAKING_LONG_PHRASE_WORDS = 6;

type Nine = readonly [string, string, string, string, string, string, string, string, string];

const COPY: Readonly<Record<SpeakingNoSpeechKind, Nine>> = {
  short: [
    'Отпускай кнопку после последнего слова — я дослушаю',
    'Відпускай кнопку після останнього слова — я дослухаю',
    'Let go after your last word — I’ll hear you out',
    'Suelta tras la última palabra: te escucho hasta el final',
    'Solta o botão depois da última palavra — eu escuto até o fim',
    'Thả nút sau từ cuối cùng — mình nghe hết cho',
    'Lepas setelah kata terakhir — aku dengar sampai habis',
    'Son kelimeden sonra bırak — sonuna kadar dinlerim',
    'Puść przycisk po ostatnim słowie — wysłucham do końca',
  ],
  long: [
    'Длинная фраза! Скажи чуть быстрее — я успею',
    'Довгий вислів! Скажи трохи швидше — я встигну',
    'That’s a long one! Say it a bit faster — I’ll keep up',
    '¡Frase larga! Dila un poco más rápido, que te sigo',
    'Frase longa! Fala um pouco mais rápido — eu acompanho',
    'Câu dài quá! Nói nhanh hơn chút — mình theo kịp',
    'Kalimatnya panjang! Ucapkan lebih cepat — aku kejar',
    'Uzun bir cümle! Biraz hızlı söyle — yetişirim',
    'Długie zdanie! Powiedz trochę szybciej — nadążę',
  ],
  // зачем (Ревизор → координатор 25.10): судья не уложился на короткой фразе (медленный телефон) или сломался — человек ни при чём,
  // нейтрально «не успел разобрать — скажи ещё раз», без «длинная» и без «ближе к телефону»
  retry: [
    'Не успел разобрать — скажи ещё раз',
    'Не встиг розібрати — скажи ще раз',
    'Didn’t catch that in time — say it again',
    'No me dio tiempo a entenderlo: dilo otra vez',
    'Não deu tempo de entender — fala de novo',
    'Mình chưa kịp nghe ra — nói lại nhé',
    'Belum sempat menangkap — ucapkan lagi ya',
    'Yetişemedim — bir daha söyle',
    'Nie zdążyłem rozpoznać — powiedz jeszcze raz',
  ],
  loading: [
    'Распознавание ещё просыпается. Секунду — и повтори',
    'Розпізнавання ще прокидається. Секунду — і повтори',
    'Speech recognition is still waking up. One sec, then retry',
    'La voz aún se está despertando. Un segundo y repite',
    'O reconhecimento ainda está acordando. Um segundo e repete',
    'Nhận diện giọng nói đang khởi động. Đợi chút rồi nói lại',
    'Pengenal suara masih bangun. Sebentar, lalu ulangi',
    'Ses tanıma daha uyanıyor. Bir saniye, sonra tekrarla',
    'Rozpoznawanie jeszcze się budzi. Sekunda i powtórz',
  ],
  empty: [
    'Не разобрал слова. Чуть ближе и погромче — и ещё раз',
    'Не розібрав слів. Трохи ближче й гучніше — і ще раз',
    'Couldn’t catch that. A bit closer, a bit louder — again',
    'No pillé las palabras. Acércate, más alto y otra vez',
    'Não peguei as palavras. Chega perto, fala alto e repete',
    'Mình chưa nghe rõ. Lại gần, nói to hơn rồi thử lại',
    'Belum tertangkap. Lebih dekat, lebih keras, ulangi ya',
    'Kelimeleri seçemedim. Yaklaş, yüksek sesle tekrar et',
    'Nie złapałem słów. Bliżej i głośniej — jeszcze raz',
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
