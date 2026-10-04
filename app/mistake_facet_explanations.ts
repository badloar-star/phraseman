import { triLang, type Lang } from '../constants/i18n';
import type { MistakeFacet } from '../modules/mistake-practice/contracts';

/**
 * Короткие объяснения «почему это ошибка» по типу ошибки (карточка ошибки и экран сессии берут отсюда один текст).
 * зачем (макет «Панель»: строка «Почему это ошибка» в карточке): тексты те же, что показывает сессия после неверного ответа.
 */
const copyFor = (lang: Lang) => triLang(lang, {
  ru: {
    explanationWordOrder: 'Сверь порядок слов: в английской фразе позиция каждого слова меняет смысл.',
    explanationMissing: 'Проверь пропущенное слово и прочитай целую фразу ещё раз.',
    explanationMeaning: 'Свяжи значение со всей фразой, а не с одним знакомым словом.',
    explanationPronunciation: 'Скажи фразу спокойно и отчётливо, сохраняя ударение и окончания.',
    explanationListening: 'Сначала найди опорные слова на слух, затем восстанови полную фразу.',
    explanationDefault: 'Сравни свой вариант с правильной формой и обрати внимание на окончание и служебные слова.',
  },
  uk: {
    explanationWordOrder: 'Звір порядок слів: в англійській фразі позиція кожного слова змінює зміст.',
    explanationMissing: 'Перевір пропущене слово й прочитай усю фразу ще раз.',
    explanationMeaning: 'Пов’яжи значення з усією фразою, а не з одним знайомим словом.',
    explanationPronunciation: 'Скажи фразу спокійно й чітко, зберігаючи наголос і закінчення.',
    explanationListening: 'Спочатку знайди опорні слова на слух, потім віднови повну фразу.',
    explanationDefault: 'Порівняй свій варіант із правильною формою та зверни увагу на закінчення і службові слова.',
  },
  en: {
    explanationWordOrder: 'Check the word order: in an English sentence, each word\'s position changes the meaning.',
    explanationMissing: 'Check the missing word and read the whole phrase again.',
    explanationMeaning: 'Connect the meaning to the whole phrase, not just one familiar word.',
    explanationPronunciation: 'Say the phrase calmly and clearly, keeping the stress and endings.',
    explanationListening: 'First catch the key words by ear, then reconstruct the full phrase.',
    explanationDefault: 'Compare your answer with the correct form and pay attention to endings and function words.',
  },
  es: {
    explanationWordOrder: 'Revisa el orden: en inglés, la posición de cada palabra cambia el sentido.',
    explanationMissing: 'Comprueba la palabra omitida y vuelve a leer la frase completa.',
    explanationMeaning: 'Relaciona el significado con toda la frase, no solo con una palabra conocida.',
    explanationPronunciation: 'Di la frase con calma y claridad, manteniendo el acento y las terminaciones.',
    explanationListening: 'Primero identifica las palabras clave al escuchar y luego reconstruye la frase completa.',
    explanationDefault: 'Compara tu respuesta con la forma correcta y fíjate en las terminaciones y palabras auxiliares.',
  },
  'pt-BR': {
    explanationWordOrder: 'Confira a ordem das palavras: em inglês, a posição de cada palavra muda o sentido.',
    explanationMissing: 'Verifique a palavra que faltou e leia a frase inteira de novo.',
    explanationMeaning: 'Relacione o significado com a frase toda, não só com uma palavra conhecida.',
    explanationPronunciation: 'Diga a frase com calma e clareza, mantendo o acento e as terminações.',
    explanationListening: 'Primeiro identifique as palavras-chave ao ouvir e depois reconstrua a frase completa.',
    explanationDefault: 'Compare sua resposta com a forma correta e preste atenção nas terminações e palavras auxiliares.',
  },
  vi: {
    explanationWordOrder: 'Kiểm tra trật tự từ: trong câu tiếng Anh, vị trí mỗi từ thay đổi ý nghĩa.',
    explanationMissing: 'Kiểm tra từ bị thiếu và đọc lại toàn bộ câu.',
    explanationMeaning: 'Liên kết ý nghĩa với cả câu, không chỉ với một từ quen thuộc.',
    explanationPronunciation: 'Nói câu một cách bình tĩnh và rõ ràng, giữ đúng trọng âm và đuôi từ.',
    explanationListening: 'Trước tiên hãy tìm các từ khóa khi nghe, sau đó khôi phục lại toàn bộ câu.',
    explanationDefault: 'So sánh câu trả lời của bạn với dạng đúng và chú ý đến đuôi từ và từ chức năng.',
  },
  id: {
    explanationWordOrder: 'Periksa urutan kata: dalam kalimat bahasa Inggris, posisi setiap kata mengubah arti.',
    explanationMissing: 'Periksa kata yang hilang dan baca ulang seluruh kalimat.',
    explanationMeaning: 'Hubungkan arti dengan seluruh kalimat, bukan hanya satu kata yang dikenal.',
    explanationPronunciation: 'Ucapkan kalimat dengan tenang dan jelas, jaga tekanan dan akhiran kata.',
    explanationListening: 'Cari dulu kata kunci saat mendengarkan, lalu susun ulang kalimat lengkapnya.',
    explanationDefault: 'Bandingkan jawabanmu dengan bentuk yang benar dan perhatikan akhiran serta kata bantu.',
  },
  tr: {
    explanationWordOrder: 'Kelime sırasını kontrol et: İngilizce cümlede her kelimenin konumu anlamı değiştirir.',
    explanationMissing: 'Eksik kelimeyi kontrol et ve tüm cümleyi tekrar oku.',
    explanationMeaning: 'Anlamı tüm cümleyle ilişkilendir, sadece bildiğin bir kelimeyle değil.',
    explanationPronunciation: 'Cümleyi sakin ve net söyle, vurguyu ve ekleri koru.',
    explanationListening: 'Önce dinlerken anahtar kelimeleri bul, sonra tüm cümleyi yeniden kur.',
    explanationDefault: 'Cevabını doğru formla karşılaştır ve eklere ve yardımcı kelimelere dikkat et.',
  },
  pl: {
    explanationWordOrder: 'Sprawdź szyk wyrazów: w angielskim zdaniu pozycja każdego słowa zmienia znaczenie.',
    explanationMissing: 'Sprawdź brakujące słowo i przeczytaj całe zdanie jeszcze raz.',
    explanationMeaning: 'Połącz znaczenie z całym zdaniem, a nie tylko ze znanym słowem.',
    explanationPronunciation: 'Powiedz zdanie spokojnie i wyraźnie, zachowując akcent i końcówki.',
    explanationListening: 'Najpierw znajdź słowa kluczowe ze słuchu, potem odtwórz całe zdanie.',
    explanationDefault: 'Porównaj swoją odpowiedź z poprawną formą i zwróć uwagę na końcówki i słowa pomocnicze.',
  },
});

export function mistakeFacetExplanation(lang: Lang, facet: MistakeFacet): string {
  const copy = copyFor(lang);
  if (facet === 'word_order') return copy.explanationWordOrder;
  if (facet === 'missing_token') return copy.explanationMissing;
  if (facet === 'meaning') return copy.explanationMeaning;
  if (facet === 'pronunciation') return copy.explanationPronunciation;
  if (facet === 'listening') return copy.explanationListening;
  return copy.explanationDefault;
}
