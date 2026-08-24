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
  ru: 'Знакомая фраза при произнесении звучит не как отдельные слова, а как один слитный поток звука. Es fácil слышится единым дыханием, а не как «es» плюс «fácil» по отдельности. Сначала звучит образец целиком, и только затем его нужно повторить своим голосом, без пауз между словами. Голос при этом сравнивается со звучанием образца, а не с буквами на бумаге, — именно звучание образца и есть цель здесь.',
  uk: 'Знайома фраза при вимові звучить не як окремі слова, а як один злитий потік звуку. Es fácil чується єдиним подихом, а не як «es» плюс «fácil» окремо. Спершу звучить зразок цілком, і лише потім його потрібно повторити власним голосом, без пауз між словами. Голос при цьому порівнюється зі звучанням зразка, а не з літерами на папері, — саме звучання зразка і є метою тут.',
  es: 'A familiar phrase, when spoken, does not sound like separate words but like one flowing stream of sound. Es fácil is heard as a single breath, not as "es" plus "fácil" apart. The model sounds first in full, and only then does it need to be repeated with one\'s own voice, with no pauses between the words. The voice is compared with the sound of the model, not with the letters on paper — that sound of the model is exactly the target here.',
  'pt-BR': 'Uma frase conhecida, ao ser dita, não soa como palavras separadas, mas como um único fluxo de som. Es fácil se ouve num só fôlego, não como "es" mais "fácil" separados. O modelo soa primeiro por inteiro, e só depois precisa ser repetido com a própria voz, sem pausas entre as palavras. A voz é comparada com o som do modelo, não com as letras no papel — é exatamente esse som do modelo o alvo aqui.',
  vi: 'Một câu quen thuộc, khi được nói ra, không nghe như những từ riêng lẻ mà như một dòng âm thanh liền mạch. Es fácil được nghe như một hơi thở duy nhất, không phải "es" cộng "fácil" tách rời. Mẫu vang lên trọn vẹn trước, và chỉ sau đó mới cần lặp lại bằng chính giọng nói của mình, không có khoảng dừng giữa các từ. Giọng nói được so sánh với âm thanh của mẫu, không phải với chữ viết trên giấy — đó chính là mục tiêu ở đây.',
  id: 'Sebuah frasa yang sudah dikenal, saat diucapkan, tidak terdengar seperti kata-kata terpisah, melainkan seperti satu aliran suara yang menyatu. Es fácil terdengar dalam satu tarikan napas, bukan sebagai "es" ditambah "fácil" secara terpisah. Contohnya terdengar utuh terlebih dahulu, dan baru setelah itu perlu diulangi dengan suara sendiri, tanpa jeda di antara kata-kata. Suara dibandingkan dengan bunyi contoh, bukan dengan huruf di atas kertas — itulah sasarannya di sini.',
  tr: 'Tanıdık bir cümle, söylendiğinde ayrı kelimeler gibi değil, tek bir kesintisiz ses akışı gibi duyulur. Es fácil tek bir nefeste duyulur, "es" artı "fácil" olarak ayrı ayrı değil. Önce örnek baştan sona duyulur, ancak sonrasında kelimeler arasında duraksamadan kendi sesiyle tekrarlanması gerekir. Ses, örneğin sesiyle karşılaştırılır, kağıt üzerindeki harflerle değil — burada asıl hedef tam olarak örneğin sesidir.',
  pl: 'Znane zdanie, gdy jest wypowiadane, brzmi nie jak osobne słowa, lecz jak jeden płynny strumień dźwięku. Es fácil słychać jako jeden oddech, a nie jako „es” plus „fácil” osobno. Najpierw brzmi cały wzór, a dopiero potem trzeba go powtórzyć własnym głosem, bez przerw między słowami. Głos porównuje się z brzmieniem wzoru, a nie z literami na papierze — to właśnie brzmienie wzoru jest tu celem.',
});

const FORMULA_BODY = L({
  ru: 'Формула проста: сначала звучит образец, затем голос повторяет его целиком, без разбивки на отдельные слова. No es fácil произносится одним потоком: no сливается с es в один поток звука, а не звучит отдельным щелчком перед паузой. Verdadero и único при этом сохраняют своё ударение — оно не теряется в потоке речи, даже когда фраза звучит быстро. Точность здесь измеряется на слух: похоже звучание на образец или нет, а не то, правильно ли выбрана буква на письме.',
  uk: 'Формула проста: спершу звучить зразок, потім голос повторює його цілком, без розбивки на окремі слова. No es fácil вимовляється одним потоком: no зливається з es в один потік звуку, а не звучить окремим клацанням перед паузою. Verdadero та único при цьому зберігають свій наголос — він не губиться в потоці мовлення, навіть коли фраза звучить швидко. Точність тут вимірюється на слух: чи схоже звучання на зразок, а не чи правильно обрана літера на письмі.',
  es: 'The formula is simple: first the model sounds, then the voice repeats it whole, without breaking it into separate words. No es fácil is said in one stream: no comes right before es. It blends with es into one stream of sound, rather than sounding like a separate click before a pause. Verdadero and único keep their stress the whole time — it does not get lost in the flow of speech, even when the phrase is said quickly. Accuracy here is measured by ear: whether the sound matches the model, not whether the right letter was picked in writing.',
  'pt-BR': 'A fórmula é simples: primeiro o modelo soa, depois a voz o repete inteiro, sem quebrá-lo em palavras separadas. No es fácil é dito num só fluxo: no vem antes de es, e ele se funde com es num único fluxo de som, em vez de soar como um clique separado antes de uma pausa. Verdadero e único mantêm o acento o tempo todo — ele não se perde no fluxo da fala, mesmo quando a frase é dita rápido. A precisão aqui é medida pelo ouvido: se o som combina com o modelo, não se a letra certa foi escolhida por escrito.',
  vi: 'Công thức rất đơn giản: đầu tiên mẫu vang lên, sau đó giọng nói lặp lại trọn vẹn, không tách thành các từ riêng lẻ. No es fácil được nói trong một dòng: no đứng ngay trước es. Nó hòa với es thành một dòng âm thanh, thay vì nghe như một tiếng tách riêng biệt trước khoảng dừng. Verdadero và único giữ nguyên trọng âm suốt lúc đó — nó không bị mất trong dòng chảy lời nói, ngay cả khi câu được nói nhanh. Độ chính xác ở đây được đo bằng tai: âm thanh có khớp với mẫu hay không, chứ không phải chữ đúng có được chọn khi viết hay không.',
  id: 'Rumusnya sederhana: pertama contoh terdengar, kemudian suara mengulanginya secara utuh, tanpa memecahnya menjadi kata-kata terpisah. No es fácil diucapkan dalam satu aliran: no menyatu dengan es menjadi satu aliran suara, alih-alih terdengar seperti bunyi klik terpisah sebelum jeda. Verdadero dan único mempertahankan tekanannya sepanjang waktu — ia tidak hilang dalam alur bicara, bahkan ketika frasa diucapkan cepat. Akurasi di sini diukur dengan telinga: apakah bunyinya cocok dengan contoh, bukan apakah huruf yang tepat dipilih secara tertulis.',
  tr: 'Formül basittir: önce örnek duyulur, ardından ses onu ayrı kelimelere bölmeden bütün olarak tekrarlar. No es fácil tek bir akışta söylenir: no, es ile tek bir ses akışında birleşir, bir duraksamadan önce ayrı bir tıklama gibi duyulmak yerine. Verdadero ve único vurgularını her zaman korur — hızlı söylendiğinde bile konuşma akışında kaybolmaz. Buradaki doğruluk kulakla ölçülür: sesin örnekle eşleşip eşleşmediği, yazıda doğru harfin seçilip seçilmediği değil.',
  pl: 'Formuła jest prosta: najpierw brzmi wzór, potem głos powtarza go w całości, bez dzielenia na osobne słowa. No es fácil wymawia się jednym strumieniem: no zlewa się z es w jeden strumień dźwięku, zamiast brzmieć jak osobne kliknięcie przed przerwą. Verdadero i único zachowują swój akcent przez cały czas — nie gubi się on w potoku mowy, nawet gdy zdanie brzmi szybko. Dokładność mierzy się tu na słuch: czy brzmienie pasuje do wzoru, a nie czy wybrano właściwą literę na piśmie.',
});

const TRAP_BODY = L({
  ru: 'Легко подумать, что здесь достаточно понимать смысл фразы, — но понимание и произношение проверяются по-разному. Можно точно знать, что означает Es único, и всё равно смазать звук, если торопиться и не довести дыхание до конца слова. Самая опасная ошибка — ускориться настолько, что связка между словами пропадёт совсем: между no и es должна быть слышна плавная связь, а не обрыв звука. Проверка простая: если голос звучит как одно целое слово, а не как несколько отдельных кусков, — фраза сказана верно.',
  uk: 'Легко подумати, що тут достатньо розуміти сенс фрази, — але розуміння й вимова перевіряються по-різному. Можна точно знати, що означає Es único, і все одно змазати звук, якщо поспішати й не довести подих до кінця слова. Найнебезпечніша помилка — прискоритися настільки, що зв’язка між словами зникне зовсім: між no та es має бути чутний плавний зв’язок, а не обрив звуку. Перевірка проста: якщо голос звучить як одне ціле слово, а не як кілька окремих шматків, — фраза сказана правильно.',
  es: 'It is easy to think that understanding the meaning of a phrase is enough here — but understanding and pronunciation are checked differently. One can know exactly what Es único means and still blur the sound if rushing and not carrying the breath through to the end of the word. The most dangerous mistake is speeding up so much that the link between the words disappears entirely: between no and es there should be a smooth connection audible, not a break in the sound. The check is simple: if the voice sounds like one whole word rather than several separate pieces, the phrase is said correctly.',
  'pt-BR': 'É fácil pensar que basta entender o significado da frase aqui — mas entendimento e pronúncia são verificados de formas diferentes. Dá para saber exatamente o que Es único significa e ainda assim borrar o som se apressar e não levar a respiração até o fim da palavra. O erro mais perigoso é acelerar tanto que o elo entre as palavras desaparece por completo: entre no e es deve se ouvir uma ligação suave, não um corte no som. A checagem é simples: se a voz soa como uma única palavra inteira, e não como vários pedaços separados, a frase foi dita corretamente.',
  vi: 'Dễ nghĩ rằng chỉ cần hiểu nghĩa của câu là đủ ở đây — nhưng hiểu và phát âm được kiểm tra khác nhau. Có thể biết chính xác Es único nghĩa là gì mà vẫn làm mờ âm thanh nếu vội vàng và không kéo hơi thở đến hết từ. Sai lầm nguy hiểm nhất là tăng tốc đến mức mối liên kết giữa các từ biến mất hoàn toàn: giữa no và es cần nghe được một sự kết nối mượt mà, không phải một sự ngắt quãng âm thanh. Cách kiểm tra đơn giản: nếu giọng nói nghe như một từ trọn vẹn duy nhất chứ không phải nhiều mảnh riêng lẻ, câu đã được nói đúng.',
  id: 'Mudah untuk berpikir bahwa memahami makna frasa saja sudah cukup di sini — tetapi pemahaman dan pengucapan diperiksa dengan cara berbeda. Seseorang bisa tahu persis apa arti Es único dan tetap mengaburkan bunyinya jika terburu-buru dan tidak menuntaskan napas hingga akhir kata. Kesalahan paling berbahaya adalah mempercepat sedemikian rupa sehingga hubungan antar kata hilang sama sekali: antara no dan es seharusnya terdengar sambungan yang halus, bukan bunyi yang terputus. Pengecekannya sederhana: jika suara terdengar seperti satu kata utuh, bukan beberapa bagian terpisah, frasa itu diucapkan dengan benar.',
  tr: 'Burada cümlenin anlamını anlamanın yeterli olduğunu düşünmek kolaydır — ama anlama ve telaffuz farklı şekilde kontrol edilir. Es único’nun ne anlama geldiğini tam olarak bilebilir ve yine de acele edip nefesi kelimenin sonuna kadar taşımazsa sesi bulanıklaştırabilirsiniz. En tehlikeli hata, kelimeler arasındaki bağın tamamen kaybolacak kadar hızlanmaktır: no ile es arasında akıcı bir bağlantı duyulmalı, sesin kesilmesi değil. Kontrol basittir: ses bütün tek bir kelime gibi duyulur, birkaç ayrı parça değil — o zaman cümle doğru söylenmiştir.',
  pl: 'Łatwo pomyśleć, że wystarczy tu rozumieć znaczenie zdania — ale rozumienie i wymowa sprawdzane są inaczej. Można dokładnie wiedzieć, co znaczy Es único, i mimo to zamazać dźwięk, jeśli się śpieszy i nie doprowadzi oddechu do końca słowa. Najniebezpieczniejszym błędem jest przyspieszenie na tyle, że łącznik między słowami całkowicie zniknie: między no a es powinno być słychać płynne połączenie, a nie zerwanie dźwięku. Sprawdzenie jest proste: jeśli głos brzmi jak jedno całe słowo, a nie jak kilka osobnych kawałków, zdanie zostało powiedziane poprawnie.',
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
      ru: R({ text: 'Знакомая фраза при произнесении звучит не как отдельные слова, а как один слитный поток звука. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' слышится единым дыханием, а не как «es» плюс «fácil» по отдельности. Сначала звучит образец целиком, и только затем его нужно повторить своим голосом, без пауз между словами. Голос при этом сравнивается со звучанием образца, а не с буквами на бумаге, — именно звучание образца и есть цель здесь.', semantic: 'explanation' }),
      uk: R({ text: 'Знайома фраза при вимові звучить не як окремі слова, а як один злитий потік звуку. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' чується єдиним подихом, а не як «es» плюс «fácil» окремо. Спершу звучить зразок цілком, і лише потім його потрібно повторити власним голосом, без пауз між словами. Голос при цьому порівнюється зі звучанням зразка, а не з літерами на папері, — саме звучання зразка і є метою тут.', semantic: 'explanation' }),
      es: R({ text: 'A familiar phrase, when spoken, does not sound like separate words but like one flowing stream of sound. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' is heard as a single breath, not as "es" plus "fácil" apart. The model sounds first in full, and only then does it need to be repeated with one\'s own voice, with no pauses between the words. The voice is compared with the sound of the model, not with the letters on paper — that sound of the model is exactly the target here.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Uma frase conhecida, ao ser dita, não soa como palavras separadas, mas como um único fluxo de som. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' se ouve num só fôlego, não como "es" mais "fácil" separados. O modelo soa primeiro por inteiro, e só depois precisa ser repetido com a própria voz, sem pausas entre as palavras. A voz é comparada com o som do modelo, não com as letras no papel — é exatamente esse som do modelo o alvo aqui.', semantic: 'explanation' }),
      vi: R({ text: 'Một câu quen thuộc, khi được nói ra, không nghe như những từ riêng lẻ mà như một dòng âm thanh liền mạch. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' được nghe như một hơi thở duy nhất, không phải "es" cộng "fácil" tách rời. Mẫu vang lên trọn vẹn trước, và chỉ sau đó mới cần lặp lại bằng chính giọng nói của mình, không có khoảng dừng giữa các từ. Giọng nói được so sánh với âm thanh của mẫu, không phải với chữ viết trên giấy — đó chính là mục tiêu ở đây.', semantic: 'explanation' }),
      id: R({ text: 'Sebuah frasa yang sudah dikenal, saat diucapkan, tidak terdengar seperti kata-kata terpisah, melainkan seperti satu aliran suara yang menyatu. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' terdengar dalam satu tarikan napas, bukan sebagai "es" ditambah "fácil" secara terpisah. Contohnya terdengar utuh terlebih dahulu, dan baru setelah itu perlu diulangi dengan suara sendiri, tanpa jeda di antara kata-kata. Suara dibandingkan dengan bunyi contoh, bukan dengan huruf di atas kertas — itulah sasarannya di sini.', semantic: 'explanation' }),
      tr: R({ text: 'Tanıdık bir cümle, söylendiğinde ayrı kelimeler gibi değil, tek bir kesintisiz ses akışı gibi duyulur. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' tek bir nefeste duyulur, "es" artı "fácil" olarak ayrı ayrı değil. Önce örnek baştan sona duyulur, ancak sonrasında kelimeler arasında duraksamadan kendi sesiyle tekrarlanması gerekir. Ses, örneğin sesiyle karşılaştırılır, kağıt üzerindeki harflerle değil — burada asıl hedef tam olarak örneğin sesidir.', semantic: 'explanation' }),
      pl: R({ text: 'Znane zdanie, gdy jest wypowiadane, brzmi nie jak osobne słowa, lecz jak jeden płynny strumień dźwięku. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' słychać jako jeden oddech, a nie jako „es” plus „fácil” osobno. Najpierw brzmi cały wzór, a dopiero potem trzeba go powtórzyć własnym głosem, bez przerw między słowami. Głos porównuje się z brzmieniem wzoru, a nie z literami na papierze — to właśnie brzmienie wzoru jest tu celem.', semantic: 'explanation' }),
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
      ru: R({ text: 'Формула проста: сначала звучит образец, затем голос повторяет его целиком, без разбивки на отдельные слова. ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' произносится одним потоком: no сливается с es, а не звучит отдельным щелчком перед паузой. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' и ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' при этом сохраняют своё ударение — оно не теряется в потоке речи, даже когда фраза звучит быстро. Точность здесь измеряется на слух: похоже звучание на образец или нет, а не то, правильно ли выбрана буква на письме.', semantic: 'explanation' }),
      uk: R({ text: 'Формула проста: спершу звучить зразок, потім голос повторює його цілком, без розбивки на окремі слова. ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' вимовляється одним потоком: no зливається з es в один потік звуку, а не звучить окремим клацанням перед паузою. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' та ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' при цьому зберігають свій наголос — він не губиться в потоці мовлення, навіть коли фраза звучить швидко. Точність тут вимірюється на слух: чи схоже звучання на зразок, а не чи правильно обрана літера на письмі.', semantic: 'explanation' }),
      es: R({ text: 'The formula is simple: first the model sounds, then the voice repeats it whole, without breaking it into separate words. ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' is said in one stream: no comes right before es. It blends with es into one stream of sound, rather than sounding like a separate click before a pause. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' and ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' keep their stress the whole time — it does not get lost in the flow of speech, even when the phrase is said quickly. Accuracy here is measured by ear: whether the sound matches the model, not whether the right letter was picked in writing.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é simples: primeiro o modelo soa, depois a voz o repete inteiro, sem quebrá-lo em palavras separadas. ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' é dito num só fluxo: no vem antes de es, e ele se funde com es num único fluxo de som, em vez de soar como um clique separado antes de uma pausa. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' e ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' mantêm o acento o tempo todo — ele não se perde no fluxo da fala, mesmo quando a frase é dita rápido. A precisão aqui é medida pelo ouvido: se o som combina com o modelo, não se a letra certa foi escolhida por escrito.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức rất đơn giản: đầu tiên mẫu vang lên, sau đó giọng nói lặp lại trọn vẹn, không tách thành các từ riêng lẻ. ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' được nói trong một dòng: no đứng ngay trước es. Nó hòa với es thành một dòng âm thanh, thay vì nghe như một tiếng tách riêng biệt trước khoảng dừng. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' và ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' giữ nguyên trọng âm suốt lúc đó — nó không bị mất trong dòng chảy lời nói, ngay cả khi câu được nói nhanh. Độ chính xác ở đây được đo bằng tai: âm thanh có khớp với mẫu hay không, chứ không phải chữ đúng có được chọn khi viết hay không.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sederhana: pertama contoh terdengar, kemudian suara mengulanginya secara utuh, tanpa memecahnya menjadi kata-kata terpisah. ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' diucapkan dalam satu aliran: no menyatu dengan es menjadi satu aliran suara, alih-alih terdengar seperti bunyi klik terpisah sebelum jeda. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' dan ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' mempertahankan tekanannya sepanjang waktu — ia tidak hilang dalam alur bicara, bahkan ketika frasa diucapkan cepat. Akurasi di sini diukur dengan telinga: apakah bunyinya cocok dengan contoh, bukan apakah huruf yang tepat dipilih secara tertulis.', semantic: 'explanation' }),
      tr: R({ text: 'Formül basittir: önce örnek duyulur, ardından ses onu ayrı kelimelere bölmeden bütün olarak tekrarlar. ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' tek bir akışta söylenir: no, es ile tek bir ses akışında birleşir, bir duraksamadan önce ayrı bir tıklama gibi duyulmak yerine. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' ve ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' vurgularını her zaman korur — hızlı söylendiğinde bile konuşma akışında kaybolmaz. Buradaki doğruluk kulakla ölçülür: sesin örnekle eşleşip eşleşmediği, yazıda doğru harfin seçilip seçilmediği değil.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest prosta: najpierw brzmi wzór, potem głos powtarza go w całości, bez dzielenia na osobne słowa. ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' wymawia się jednym strumieniem: no zlewa się z es w jeden strumień dźwięku, zamiast brzmieć jak osobne kliknięcie przed przerwą. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' i ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' zachowują swój akcent przez cały czas — nie gubi się on w potoku mowy, nawet gdy zdanie brzmi szybko. Dokładność mierzy się tu na słuch: czy brzmienie pasuje do wzoru, a nie czy wybrano właściwą literę na piśmie.', semantic: 'explanation' }),
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
      ru: R({ text: 'Легко подумать, что здесь достаточно понимать смысл фразы, — но понимание и произношение проверяются по-разному. Можно точно знать, что означает ', semantic: 'explanation' }, { text: 'Es único', semantic: 'targetCorrect' }, { text: ', и всё равно смазать звук, если торопиться и не довести дыхание до конца слова. Самая опасная ошибка — ускориться настолько, что связка между словами пропадёт совсем: между ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' и ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' должна быть слышна плавная связь, а не обрыв звука. Проверка простая: если голос звучит как одно целое слово, а не как несколько отдельных кусков, — фраза сказана верно.', semantic: 'explanation' }),
      uk: R({ text: 'Легко подумати, що тут достатньо розуміти сенс фрази, — але розуміння й вимова перевіряються по-різному. Можна точно знати, що означає ', semantic: 'explanation' }, { text: 'Es único', semantic: 'targetCorrect' }, { text: ', і все одно змазати звук, якщо поспішати й не довести подих до кінця слова. Найнебезпечніша помилка — прискоритися настільки, що зв’язка між словами зникне зовсім: між ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' та ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' має бути чутний плавний зв’язок, а не обрив звуку. Перевірка проста: якщо голос звучить як одне ціле слово, а не як кілька окремих шматків, — фраза сказана правильно.', semantic: 'explanation' }),
      es: R({ text: 'It is easy to think that understanding the meaning of a phrase is enough here — but understanding and pronunciation are checked differently. One can know exactly what ', semantic: 'explanation' }, { text: 'Es único', semantic: 'targetCorrect' }, { text: ' means and still blur the sound if rushing and not carrying the breath through to the end of the word. The most dangerous mistake is speeding up so much that the link between the words disappears entirely: between ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' and ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' there should be a smooth connection audible, not a break in the sound. The check is simple: if the voice sounds like one whole word rather than several separate pieces, the phrase is said correctly.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'É fácil pensar que basta entender o significado da frase aqui — mas entendimento e pronúncia são verificados de formas diferentes. Dá para saber exatamente o que ', semantic: 'explanation' }, { text: 'Es único', semantic: 'targetCorrect' }, { text: ' significa e ainda assim borrar o som se apressar e não levar a respiração até o fim da palavra. O erro mais perigoso é acelerar tanto que o elo entre as palavras desaparece por completo: entre ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' e ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' deve se ouvir uma ligação suave, não um corte no som. A checagem é simples: se a voz soa como uma única palavra inteira, e não como vários pedaços separados, a frase foi dita corretamente.', semantic: 'explanation' }),
      vi: R({ text: 'Dễ nghĩ rằng chỉ cần hiểu nghĩa của câu là đủ ở đây — nhưng hiểu và phát âm được kiểm tra khác nhau. Có thể biết chính xác ', semantic: 'explanation' }, { text: 'Es único', semantic: 'targetCorrect' }, { text: ' nghĩa là gì mà vẫn làm mờ âm thanh nếu vội vàng và không kéo hơi thở đến hết từ. Sai lầm nguy hiểm nhất là tăng tốc đến mức mối liên kết giữa các từ biến mất hoàn toàn: giữa ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' và ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' cần nghe được một sự kết nối mượt mà, không phải một sự ngắt quãng âm thanh. Cách kiểm tra đơn giản: nếu giọng nói nghe như một từ trọn vẹn duy nhất chứ không phải nhiều mảnh riêng lẻ, câu đã được nói đúng.', semantic: 'explanation' }),
      id: R({ text: 'Mudah untuk berpikir bahwa memahami makna frasa saja sudah cukup di sini — tetapi pemahaman dan pengucapan diperiksa dengan cara berbeda. Seseorang bisa tahu persis apa arti ', semantic: 'explanation' }, { text: 'Es único', semantic: 'targetCorrect' }, { text: ' dan tetap mengaburkan bunyinya jika terburu-buru dan tidak menuntaskan napas hingga akhir kata. Kesalahan paling berbahaya adalah mempercepat sedemikian rupa sehingga hubungan antar kata hilang sama sekali: antara ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' dan ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' seharusnya terdengar sambungan yang halus, bukan bunyi yang terputus. Pengecekannya sederhana: jika suara terdengar seperti satu kata utuh, bukan beberapa bagian terpisah, frasa itu diucapkan dengan benar.', semantic: 'explanation' }),
      tr: R({ text: 'Burada cümlenin anlamını anlamanın yeterli olduğunu düşünmek kolaydır — ama anlama ve telaffuz farklı şekilde kontrol edilir. ', semantic: 'explanation' }, { text: 'Es único', semantic: 'targetCorrect' }, { text: '’nun ne anlama geldiğini tam olarak bilebilir ve yine de acele edip nefesi kelimenin sonuna kadar taşımazsa sesi bulanıklaştırabilirsiniz. En tehlikeli hata, kelimeler arasındaki bağın tamamen kaybolacak kadar hızlanmaktır: ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' ile ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' arasında akıcı bir bağlantı duyulmalı, sesin kesilmesi değil. Kontrol basittir: ses bütün tek bir kelime gibi duyulur, birkaç ayrı parça değil — o zaman cümle doğru söylenmiştir.', semantic: 'explanation' }),
      pl: R({ text: 'Łatwo pomyśleć, że wystarczy tu rozumieć znaczenie zdania — ale rozumienie i wymowa sprawdzane są inaczej. Można dokładnie wiedzieć, co znaczy ', semantic: 'explanation' }, { text: 'Es único', semantic: 'targetCorrect' }, { text: ', i mimo to zamazać dźwięk, jeśli się śpieszy i nie doprowadzi oddechu do końca słowa. Najniebezpieczniejszym błędem jest przyspieszenie na tyle, że łącznik między słowami całkowicie zniknie: między ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' a ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' powinno być słychać płynne połączenie, a nie zerwanie dźwięku. Sprawdzenie jest proste: jeśli głos brzmi jak jedno całe słowo, a nie jak kilka osobnych kawałków, zdanie zostało powiedziane poprawnie.', semantic: 'explanation' }),
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
