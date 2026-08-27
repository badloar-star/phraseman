import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24, карта сессий es_episode_01_session_map_v1.ts,
// сессия 7 "Скажи вслух: оцени" / kind: 'voice', builtOn: [1,2,3,4,5],
// recalls: [1,3,4,5]): интро НЕ упоминает "сессию/урок/главу/курс/экран/
// карточку" ни в каком контексте (intro_meta_narration — чёрный список слов
// без учёта контекста, проверено в исходнике гейта) — вместо этого говорит
// напрямую про звук произносимой фразы, по образцу английского voice-интро
// (episode_01_session_07_intro_voice_v1.ts: "escucha el modelo", "repite en
// voz alta", без единого упоминания структуры курса).
//
// зачем тело переписано короче исходного черновика (владелец, 2026-08-27,
// тот же класс правки, что и в сессиях 3-6): реальный гейт
// (learning_content_quality_gate_v1.ts) держит верхний потолок 320 знаков /
// 4 предложения; первый черновик этого файла был раздут до ~440-650 знаков
// на локаль и валил бы intro_body_overloaded. Переписано короче без потери
// concept→formula→trap структуры; тело дословно содержит формулировку
// правильного ответа вопроса (intro_question_not_grounded).
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_07_VOICE_TITLE = L({
  ru: 'Скажи вслух: оцени',
  uk: 'Скажи вголос: оціни',
  es: 'Say it out loud: give a verdict',
  'pt-BR': 'Diga em voz alta: dê um veredito',
  vi: 'Nói to lên: đưa ra nhận định',
  id: 'Ucapkan dengan keras: berikan penilaian',
  tr: 'Yüksek sesle söyle: bir yargı ver',
  pl: 'Powiedz na głos: wydaj osąd',
});

export const ES_EPISODE_01_SESSION_07_VOICE_SUMMARY = L({
  ru: 'Знакомые оценочные фразы звучат вслух, без опоры на письменный текст перед глазами.',
  uk: 'Знайомі оціночні фрази звучать уголос, без опори на письмовий текст перед очима.',
  es: 'Familiar verdict phrases are spoken out loud, without written text in front of the eyes.',
  'pt-BR': 'Frases de veredito já conhecidas são ditas em voz alta, sem texto escrito diante dos olhos.',
  vi: 'Những câu nhận định quen thuộc được nói to lên, không có chữ viết trước mắt.',
  id: 'Frasa penilaian yang sudah dikenal diucapkan dengan keras, tanpa teks tertulis di depan mata.',
  tr: 'Tanıdık yargı cümleleri, gözlerin önünde yazılı metin olmadan yüksek sesle söylenir.',
  pl: 'Znajome frazy osądu brzmią na głos, bez pisemnego tekstu przed oczami.',
});

export const ES_EPISODE_01_SESSION_07_VOICE_GOAL = L({
  ru: 'Произнести знакомые оценочные фразы вслух свободно и точно, без запинки и без взгляда на письменный текст.',
  uk: 'Вимовити знайомі оціночні фрази вголос вільно й точно, без запинки й без погляду на письмовий текст.',
  es: 'Say familiar verdict phrases out loud freely and accurately, without hesitation and without looking at written text.',
  'pt-BR': 'Dizer frases de veredito conhecidas em voz alta livremente e com precisão, sem hesitar e sem olhar para o texto escrito.',
  vi: 'Nói những câu nhận định quen thuộc to lên một cách tự do và chính xác, không do dự và không nhìn vào chữ viết.',
  id: 'Mengucapkan frasa penilaian yang sudah dikenal dengan keras secara bebas dan akurat, tanpa ragu-ragu dan tanpa melihat teks tertulis.',
  tr: 'Tanıdık yargı cümlelerini duraksamadan ve yazılı metne bakmadan, özgürce ve doğru bir şekilde yüksek sesle söylemek.',
  pl: 'Wypowiedzieć znajome frazy osądu na głos swobodnie i dokładnie, bez wahania i bez patrzenia na pisemny tekst.',
});

const CONCEPT_BODY = L({
  ru: 'Знакомая фраза звучит не как отдельные слова, а как один слитный поток. Сначала звучит образец целиком, затем его нужно повторить своим голосом. Голос сравнивается со звучанием образца, а не с буквами на бумаге.',
  uk: 'Знайома фраза звучить не як окремі слова, а як один злитий потік. Спершу звучить зразок цілком, потім його потрібно повторити власним голосом. Голос порівнюється зі звучанням зразка, а не з літерами на папері.',
  es: 'A familiar phrase does not sound like separate words but like one flowing stream. First the model sounds in full, then it needs to be repeated with one\'s own voice. The voice is compared with the sound of the model, not with the letters on paper.',
  'pt-BR': 'Uma frase conhecida não soa como palavras separadas, mas como um único fluxo. Primeiro o modelo soa por inteiro, depois precisa ser repetido com a própria voz. A voz é comparada com o som do modelo, não com as letras no papel.',
  vi: 'Một câu quen thuộc không nghe như những từ riêng lẻ mà như một dòng liền mạch. Đầu tiên mẫu vang lên trọn vẹn, sau đó cần lặp lại bằng chính giọng nói. Giọng nói được so sánh với âm thanh của mẫu, không phải với chữ viết trên giấy.',
  id: 'Frasa yang sudah dikenal tidak terdengar seperti kata-kata terpisah, melainkan seperti satu aliran. Pertama contoh terdengar utuh, lalu perlu diulangi dengan suara sendiri. Suara dibandingkan dengan bunyi contoh, bukan dengan huruf di atas kertas.',
  tr: 'Tanıdık bir cümle ayrı kelimeler gibi değil, tek bir akış gibi duyulur. Önce örnek baştan sona duyulur, sonra kendi sesinizle tekrarlanması gerekir. Ses, örneğin sesiyle karşılaştırılır, kağıt üzerindeki harflerle değil.',
  pl: 'Znane zdanie brzmi nie jak osobne słowa, lecz jak jeden strumień. Najpierw brzmi cały wzór, potem trzeba go powtórzyć własnym głosem. Głos porównuje się z brzmieniem wzoru, a nie z literami na papierze.',
});

const FORMULA_BODY = L({
  ru: 'Формула проста: сначала звучит образец, затем голос повторяет его целиком. No es fácil звучит одним потоком — no сливается с es. Точность измеряется на слух: похоже звучание на образец или нет.',
  uk: 'Формула проста: спершу звучить зразок, потім голос повторює його цілком. No es fácil звучить одним потоком — no зливається з es. Точність вимірюється на слух: чи схоже звучання на зразок.',
  es: 'The formula is simple: first the model sounds, then the voice repeats it whole. No es fácil is said in one stream — no blends with es. Accuracy here is measured by ear: whether the sound matches the model.',
  'pt-BR': 'A fórmula é simples: primeiro o modelo soa, depois a voz o repete inteiro. No es fácil é dito num só fluxo — no se funde com es. A precisão é medida pelo ouvido: se o som combina com o modelo.',
  vi: 'Công thức đơn giản: đầu tiên mẫu vang lên, sau đó giọng nói lặp lại trọn vẹn. No es fácil được nói trong một dòng — no hòa với es. Độ chính xác được đo bằng tai: âm thanh có khớp với mẫu hay không.',
  id: 'Rumusnya sederhana: pertama contoh terdengar, lalu suara mengulanginya secara utuh. No es fácil diucapkan dalam satu aliran — no menyatu dengan es. Akurasi diukur dengan telinga: apakah bunyinya cocok dengan contoh.',
  tr: 'Formül basittir: önce örnek duyulur, ardından ses onu bütün olarak tekrarlar. No es fácil tek bir akışta söylenir — no, es ile birleşir. Doğruluk kulakla ölçülür: sesin örnekle eşleşip eşleşmediği.',
  pl: 'Formuła jest prosta: najpierw brzmi wzór, potem głos powtarza go w całości. No es fácil wymawia się jednym strumieniem — no zlewa się z es. Dokładność mierzy się na słuch: czy brzmienie pasuje do wzoru.',
});

const TRAP_BODY = L({
  ru: 'Легко подумать, что достаточно понимать смысл фразы — но понимание и произношение проверяются по-разному. Самая опасная ошибка — ускориться так, что связка между словами пропадёт. Проверка: голос звучит как одно целое слово.',
  uk: 'Легко подумати, що достатньо розуміти сенс фрази — але розуміння й вимова перевіряються по-різному. Найнебезпечніша помилка — прискоритися так, що зв’язка між словами зникне. Перевірка: голос звучить як одне ціле слово.',
  es: 'It is easy to think that understanding the meaning is enough — but understanding and pronunciation are checked differently. The most dangerous mistake is speeding up so the link between words disappears. The check: the voice sounds like one whole word.',
  'pt-BR': 'É fácil pensar que basta entender o significado — mas entendimento e pronúncia são verificados de formas diferentes. O erro mais perigoso é acelerar tanto que o elo entre as palavras desaparece. A checagem: a voz soa como uma única palavra inteira.',
  vi: 'Dễ nghĩ rằng chỉ cần hiểu nghĩa là đủ — nhưng hiểu và phát âm được kiểm tra khác nhau. Sai lầm nguy hiểm nhất là tăng tốc đến mức mối liên kết giữa các từ biến mất. Cách kiểm tra: giọng nói nghe như một từ trọn vẹn.',
  id: 'Mudah berpikir bahwa memahami makna saja sudah cukup — tetapi pemahaman dan pengucapan diperiksa dengan cara berbeda. Kesalahan paling berbahaya adalah mempercepat hingga hubungan antar kata hilang. Pengecekan: suara terdengar seperti satu kata utuh.',
  tr: 'Anlamı anlamanın yeterli olduğunu düşünmek kolaydır — ama anlama ve telaffuz farklı şekilde kontrol edilir. En tehlikeli hata, kelimeler arasındaki bağın kaybolacak kadar hızlanmaktır. Kontrol: ses bütün tek bir kelime gibi duyulur.',
  pl: 'Łatwo pomyśleć, że wystarczy rozumieć znaczenie — ale rozumienie i wymowa sprawdzane są inaczej. Najniebezpieczniejszym błędem jest przyspieszenie na tyle, że łącznik między słowami zniknie. Sprawdzenie: głos brzmi jak jedno całe słowo.',
});

export const ES_EPISODE_01_SESSION_07_VOICE_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Фраза звучит единым потоком',
      uk: 'Фраза звучить єдиним потоком',
      es: 'A phrase sounds like one flow',
      'pt-BR': 'Uma frase soa como um único fluxo',
      vi: 'Một câu vang lên như một dòng chảy',
      id: 'Sebuah frasa terdengar seperti satu aliran',
      tr: 'Bir cümle tek bir akış gibi duyulur',
      pl: 'Zdanie brzmi jak jeden strumień',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Знакомая фраза звучит не как отдельные слова, а как один слитный поток. Сначала звучит образец целиком, затем его нужно повторить своим голосом. ', semantic: 'explanation' }, { text: 'Голос сравнивается со звучанием образца', semantic: 'targetCorrect' }, { text: ', а не с буквами на бумаге.', semantic: 'explanation' }),
      uk: R({ text: 'Знайома фраза звучить не як окремі слова, а як один злитий потік. Спершу звучить зразок цілком, потім його потрібно повторити власним голосом. ', semantic: 'explanation' }, { text: 'Голос порівнюється зі звучанням зразка', semantic: 'targetCorrect' }, { text: ', а не з літерами на папері.', semantic: 'explanation' }),
      es: R({ text: 'A familiar phrase does not sound like separate words but like one flowing stream. First the model sounds in full, then it needs to be repeated with one\'s own voice. ', semantic: 'explanation' }, { text: 'The voice is compared with the sound of the model', semantic: 'targetCorrect' }, { text: ', not with the letters on paper.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Uma frase conhecida não soa como palavras separadas, mas como um único fluxo. Primeiro o modelo soa por inteiro, depois precisa ser repetido com a própria voz. ', semantic: 'explanation' }, { text: 'A voz é comparada com o som do modelo', semantic: 'targetCorrect' }, { text: ', não com as letras no papel.', semantic: 'explanation' }),
      vi: R({ text: 'Một câu quen thuộc không nghe như những từ riêng lẻ mà như một dòng liền mạch. Đầu tiên mẫu vang lên trọn vẹn, sau đó cần lặp lại bằng chính giọng nói. ', semantic: 'explanation' }, { text: 'Giọng nói được so sánh với âm thanh của mẫu', semantic: 'targetCorrect' }, { text: ', không phải với chữ viết trên giấy.', semantic: 'explanation' }),
      id: R({ text: 'Frasa yang sudah dikenal tidak terdengar seperti kata-kata terpisah, melainkan seperti satu aliran. Pertama contoh terdengar utuh, lalu perlu diulangi dengan suara sendiri. ', semantic: 'explanation' }, { text: 'Suara dibandingkan dengan bunyi contoh', semantic: 'targetCorrect' }, { text: ', bukan dengan huruf di atas kertas.', semantic: 'explanation' }),
      tr: R({ text: 'Tanıdık bir cümle ayrı kelimeler gibi değil, tek bir akış gibi duyulur. Önce örnek baştan sona duyulur, sonra kendi sesinizle tekrarlanması gerekir. ', semantic: 'explanation' }, { text: 'Ses, örneğin sesiyle karşılaştırılır', semantic: 'targetCorrect' }, { text: ', kağıt üzerindeki harflerle değil.', semantic: 'explanation' }),
      pl: R({ text: 'Znane zdanie brzmi nie jak osobne słowa, lecz jak jeden strumień. Najpierw brzmi cały wzór, potem trzeba go powtórzyć własnym głosem. ', semantic: 'explanation' }, { text: 'Głos porównuje się z brzmieniem wzoru', semantic: 'targetCorrect' }, { text: ', a nie z literami na papierze.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'С чем сравнивается голос в этой практике?',
        uk: 'З чим порівнюється голос у цій практиці?',
        es: 'What is the voice compared to in this practice?',
        'pt-BR': 'Com o que a voz é comparada nesta prática?',
        vi: 'Giọng nói được so sánh với gì trong bài luyện này?',
        id: 'Suara dibandingkan dengan apa dalam latihan ini?',
        tr: 'Bu pratikte ses neyle karşılaştırılır?',
        pl: 'Z czym porównuje się głos w tej praktyce?',
      }),
      choices: [
        L({ ru: 'Со звучанием образца', uk: 'Зі звучанням зразка', es: 'With the sound of the model', 'pt-BR': 'Com o som do modelo', vi: 'Với âm thanh của mẫu', id: 'Dengan bunyi contoh', tr: 'Örneğin sesiyle', pl: 'Z brzmieniem wzoru' }),
        L({ ru: 'С буквами на бумаге', uk: 'З літерами на папері', es: 'With the letters on paper', 'pt-BR': 'Com as letras no papel', vi: 'Với chữ viết trên giấy', id: 'Dengan huruf di atas kertas', tr: 'Kağıt üzerindeki harflerle', pl: 'Z literami na papierze' }),
        L({ ru: 'С цветом фона', uk: 'З кольором фону', es: 'With the background color', 'pt-BR': 'Com a cor de fundo', vi: 'Với màu nền', id: 'Dengan warna latar belakang', tr: 'Arka plan rengiyle', pl: 'Z kolorem tła' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Голос сравнивается со звучанием образца — не с буквами на бумаге и не с цветом фона.',
        uk: 'Голос порівнюється зі звучанням зразка — не з літерами на папері й не з кольором фону.',
        es: 'The voice is compared with the sound of the model — not with the letters on paper and not with the background color.',
        'pt-BR': 'A voz é comparada com o som do modelo — não com as letras no papel nem com a cor de fundo.',
        vi: 'Giọng nói được so sánh với âm thanh của mẫu — không phải với chữ viết trên giấy hay màu nền.',
        id: 'Suara dibandingkan dengan bunyi contoh — bukan dengan huruf di atas kertas maupun warna latar belakang.',
        tr: 'Ses, örneğin sesiyle karşılaştırılır — kağıt üzerindeki harflerle veya arka plan rengiyle değil.',
        pl: 'Głos porównuje się z brzmieniem wzoru — nie z literami na papierze i nie z kolorem tła.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Слова сливаются в потоке',
      uk: 'Слова зливаються в потоці',
      es: 'Words blend in the flow',
      'pt-BR': 'As palavras se fundem no fluxo',
      vi: 'Các từ hòa vào dòng chảy',
      id: 'Kata-kata menyatu dalam aliran',
      tr: 'Kelimeler akışta birleşir',
      pl: 'Słowa łączą się w strumieniu',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула проста: сначала звучит образец, затем голос повторяет его целиком. ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' звучит одним потоком — ', semantic: 'explanation' }, { text: 'no сливается с es в один поток звука', semantic: 'targetCorrect' }, { text: '. Точность измеряется на слух: похоже звучание на образец или нет.', semantic: 'explanation' }),
      uk: R({ text: 'Формула проста: спершу звучить зразок, потім голос повторює його цілком. ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' звучить одним потоком — ', semantic: 'explanation' }, { text: 'no зливається з es в один потік звуку', semantic: 'targetCorrect' }, { text: '. Точність вимірюється на слух: чи схоже звучання на зразок.', semantic: 'explanation' }),
      es: R({ text: 'The formula is simple: first the model sounds, then the voice repeats it whole. ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' is said in one stream — ', semantic: 'explanation' }, { text: 'it blends with es into one stream of sound', semantic: 'targetCorrect' }, { text: '. Accuracy here is measured by ear: whether the sound matches the model.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é simples: primeiro o modelo soa, depois a voz o repete inteiro. ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' é dito num só fluxo — ', semantic: 'explanation' }, { text: 'ele se funde com es num único fluxo de som', semantic: 'targetCorrect' }, { text: '. A precisão é medida pelo ouvido: se o som combina com o modelo.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức đơn giản: đầu tiên mẫu vang lên, sau đó giọng nói lặp lại trọn vẹn. ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' được nói trong một dòng — ', semantic: 'explanation' }, { text: 'nó hòa với es thành một dòng âm thanh', semantic: 'targetCorrect' }, { text: '. Độ chính xác được đo bằng tai: âm thanh có khớp với mẫu hay không.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sederhana: pertama contoh terdengar, lalu suara mengulanginya secara utuh. ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' diucapkan dalam satu aliran — ', semantic: 'explanation' }, { text: 'menyatu dengan es menjadi satu aliran suara', semantic: 'targetCorrect' }, { text: '. Akurasi diukur dengan telinga: apakah bunyinya cocok dengan contoh.', semantic: 'explanation' }),
      tr: R({ text: 'Formül basittir: önce örnek duyulur, ardından ses onu bütün olarak tekrarlar. ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' tek bir akışta söylenir — ', semantic: 'explanation' }, { text: 'es ile tek bir ses akışında birleşir', semantic: 'targetCorrect' }, { text: '. Doğruluk kulakla ölçülür: sesin örnekle eşleşip eşleşmediği.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest prosta: najpierw brzmi wzór, potem głos powtarza go w całości. ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' wymawia się jednym strumieniem — ', semantic: 'explanation' }, { text: 'zlewa się z es w jeden strumień dźwięku', semantic: 'targetCorrect' }, { text: '. Dokładność mierzy się na słuch: czy brzmienie pasuje do wzoru.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как звучит no перед es, когда фраза произнесена правильно?',
        uk: 'Як звучить no перед es, коли фраза вимовлена правильно?',
        es: 'How does no sound before es when the phrase is said correctly?',
        'pt-BR': 'Como soa no antes de es quando a frase é dita corretamente?',
        vi: 'No nghe như thế nào trước es khi câu được nói đúng?',
        id: 'Bagaimana bunyi no sebelum es ketika frasa diucapkan dengan benar?',
        tr: 'Cümle doğru söylendiğinde no, es’ten önce nasıl duyulur?',
        pl: 'Jak brzmi no przed es, gdy zdanie jest powiedziane poprawnie?',
      }),
      choices: [
        L({ ru: 'Сливается с es в один поток звука', uk: 'Зливається з es в один потік звуку', es: 'It blends with es into one stream of sound', 'pt-BR': 'Ele se funde com es num único fluxo de som', vi: 'Nó hòa với es thành một dòng âm thanh', id: 'Menyatu dengan es menjadi satu aliran suara', tr: 'Es ile tek bir ses akışında birleşir', pl: 'Zlewa się z es w jeden strumień dźwięku' }),
        L({ ru: 'Звучит отдельным щелчком перед паузой', uk: 'Звучить окремим клацанням перед паузою', es: 'It sounds like a separate click before a pause', 'pt-BR': 'Soa como um clique separado antes de uma pausa', vi: 'Nghe như một tiếng tách riêng biệt trước khoảng dừng', id: 'Terdengar seperti bunyi klik terpisah sebelum jeda', tr: 'Bir duraksamadan önce ayrı bir tıklama gibi duyulur', pl: 'Brzmi jak osobne kliknięcie przed przerwą' }),
        L({ ru: 'Пропадает совсем', uk: 'Зникає зовсім', es: 'It disappears entirely', 'pt-BR': 'Desaparece completamente', vi: 'Biến mất hoàn toàn', id: 'Hilang sepenuhnya', tr: 'Tamamen kaybolur', pl: 'Znika całkowicie' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No сливается с es в один поток звука — оно не звучит отдельным щелчком и не пропадает.',
        uk: 'No зливається з es в один потік звуку — воно не звучить окремим клацанням і не зникає.',
        es: 'No blends with es into one stream of sound — it does not sound like a separate click and does not disappear.',
        'pt-BR': 'No se funde com es num único fluxo de som — não soa como um clique separado nem desaparece.',
        vi: 'No hòa với es thành một dòng âm thanh — nó không nghe như một tiếng tách riêng và không biến mất.',
        id: 'No menyatu dengan es menjadi satu aliran suara — tidak terdengar seperti bunyi klik terpisah dan tidak hilang.',
        tr: 'No, es ile tek bir ses akışında birleşir — ayrı bir tıklama gibi duyulmaz ve kaybolmaz.',
        pl: 'No zlewa się z es w jeden strumień dźwięku — nie brzmi jak osobne kliknięcie i nie znika.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Понимание — не то же самое, что произношение',
      uk: 'Розуміння — не те саме, що вимова',
      es: 'Understanding is not the same as pronunciation',
      'pt-BR': 'Entendimento não é o mesmo que pronúncia',
      vi: 'Hiểu không giống với phát âm',
      id: 'Pemahaman tidak sama dengan pengucapan',
      tr: 'Anlama telaffuzla aynı şey değildir',
      pl: 'Rozumienie to nie to samo co wymowa',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Легко подумать, что достаточно понимать смысл фразы — но понимание и произношение проверяются по-разному. Самая опасная ошибка — ускориться так, что связка между словами пропадёт. Проверка: ', semantic: 'explanation' }, { text: 'голос звучит как одно целое слово', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      uk: R({ text: 'Легко подумати, що достатньо розуміти сенс фрази — але розуміння й вимова перевіряються по-різному. Найнебезпечніша помилка — прискоритися так, що зв’язка між словами зникне. Перевірка: ', semantic: 'explanation' }, { text: 'голос звучить як одне ціле слово', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      es: R({ text: 'It is easy to think that understanding the meaning is enough — but understanding and pronunciation are checked differently. The most dangerous mistake is speeding up so the link between words disappears. The check: ', semantic: 'explanation' }, { text: 'the voice sounds like one whole word', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'É fácil pensar que basta entender o significado — mas entendimento e pronúncia são verificados de formas diferentes. O erro mais perigoso é acelerar tanto que o elo entre as palavras desaparece. A checagem: ', semantic: 'explanation' }, { text: 'a voz soa como uma única palavra inteira', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      vi: R({ text: 'Dễ nghĩ rằng chỉ cần hiểu nghĩa là đủ — nhưng hiểu và phát âm được kiểm tra khác nhau. Sai lầm nguy hiểm nhất là tăng tốc đến mức mối liên kết giữa các từ biến mất. Cách kiểm tra: ', semantic: 'explanation' }, { text: 'giọng nói nghe như một từ trọn vẹn', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      id: R({ text: 'Mudah berpikir bahwa memahami makna saja sudah cukup — tetapi pemahaman dan pengucapan diperiksa dengan cara berbeda. Kesalahan paling berbahaya adalah mempercepat hingga hubungan antar kata hilang. Pengecekan: ', semantic: 'explanation' }, { text: 'suara terdengar seperti satu kata utuh', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      tr: R({ text: 'Anlamı anlamanın yeterli olduğunu düşünmek kolaydır — ama anlama ve telaffuz farklı şekilde kontrol edilir. En tehlikeli hata, kelimeler arasındaki bağın kaybolacak kadar hızlanmaktır. Kontrol: ', semantic: 'explanation' }, { text: 'ses bütün tek bir kelime gibi duyulur', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      pl: R({ text: 'Łatwo pomyśleć, że wystarczy rozumieć znaczenie — ale rozumienie i wymowa sprawdzane są inaczej. Najniebezpieczniejszym błędem jest przyspieszenie na tyle, że łącznik między słowami zniknie. Sprawdzenie: ', semantic: 'explanation' }, { text: 'głos brzmi jak jedno całe słowo', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как понять, что фраза сказана верно?',
        uk: 'Як зрозуміти, що фраза сказана правильно?',
        es: 'How can one tell a phrase is said correctly?',
        'pt-BR': 'Como saber se uma frase foi dita corretamente?',
        vi: 'Làm sao biết một câu được nói đúng?',
        id: 'Bagaimana mengetahui bahwa sebuah frasa diucapkan dengan benar?',
        tr: 'Bir cümlenin doğru söylendiği nasıl anlaşılır?',
        pl: 'Jak poznać, że zdanie zostało powiedziane poprawnie?',
      }),
      choices: [
        L({ ru: 'Голос звучит как одно целое слово', uk: 'Голос звучить як одне ціле слово', es: 'The voice sounds like one whole word', 'pt-BR': 'A voz soa como uma única palavra inteira', vi: 'Giọng nói nghe như một từ trọn vẹn', id: 'Suara terdengar seperti satu kata utuh', tr: 'Ses bütün tek bir kelime gibi duyulur', pl: 'Głos brzmi jak jedno całe słowo' }),
        L({ ru: 'Каждое слово звучит отдельным щелчком', uk: 'Кожне слово звучить окремим клацанням', es: 'Each word sounds like a separate click', 'pt-BR': 'Cada palavra soa como um clique separado', vi: 'Mỗi từ nghe như một tiếng tách riêng', id: 'Setiap kata terdengar seperti bunyi klik terpisah', tr: 'Her kelime ayrı bir tıklama gibi duyulur', pl: 'Każde słowo brzmi jak osobne kliknięcie' }),
        L({ ru: 'Значение фразы правильно понято', uk: 'Значення фрази правильно зрозуміле', es: 'The meaning of the phrase is correctly understood', 'pt-BR': 'O significado da frase é entendido corretamente', vi: 'Nghĩa của câu được hiểu đúng', id: 'Makna frasa dipahami dengan benar', tr: 'Cümlenin anlamı doğru anlaşılmıştır', pl: 'Znaczenie zdania jest poprawnie zrozumiane' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Голос звучит как одно целое слово — понимание значения важно само по себе, но не проверяет произношение, а отдельные щелчки означают, что связка между словами потерялась.',
        uk: 'Голос звучить як одне ціле слово — розуміння значення важливе саме по собі, але не перевіряє вимову, а окремі клацання означають, що зв’язка між словами загубилася.',
        es: 'The voice sounds like one whole word — understanding the meaning matters on its own, but it does not check pronunciation, and separate clicks mean the link between the words was lost.',
        'pt-BR': 'A voz soa como uma única palavra inteira — entender o significado importa por si só, mas não verifica a pronúncia, e cliques separados significam que o elo entre as palavras se perdeu.',
        vi: 'Giọng nói nghe như một từ trọn vẹn duy nhất — hiểu nghĩa quan trọng tự nó, nhưng không kiểm tra phát âm, và những tiếng tách riêng nghĩa là mối liên kết giữa các từ đã bị mất.',
        id: 'Suara terdengar seperti satu kata utuh — memahami makna penting dengan sendirinya, tetapi tidak memeriksa pengucapan, dan bunyi klik terpisah berarti hubungan antar kata hilang.',
        tr: 'Ses bütün tek bir kelime gibi duyulur — anlamı anlamak kendi başına önemlidir ama telaffuzu kontrol etmez, ayrı tıklamalar ise kelimeler arasındaki bağın kaybolduğu anlamına gelir.',
        pl: 'Głos brzmi jak jedno całe słowo — rozumienie znaczenia jest ważne samo w sobie, ale nie sprawdza wymowy, a osobne kliknięcia oznaczają, że łącznik między słowami się zgubił.',
      }),
    },
  },
];
