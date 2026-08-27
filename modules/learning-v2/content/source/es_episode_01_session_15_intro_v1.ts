import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл переписан (владелец, 2026-08-27, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// §7 + LEARNING_CONTENT_STYLE_BIBLE.ru.md правило 2): исходный черновик от
// 2026-08-25 держал тела intro на ~420-520 знаков на локаль — за потолком
// intro_body_overloaded (320 знаков / 2-4 предложения,
// learning_content_quality_gate_v1.ts). Смысл сохранён (concept/formula/trap
// про вопросительную интонацию: подъём голоса к концу фразы, обычно на
// последнем слове, ровный тон превращает вопрос обратно в утверждение на
// слух), текст сжат. Интро НЕ упоминает "сессию/урок/главу/курс" ни в каком
// контексте (intro_meta_narration), по образцу сессии 7. Карта сессии:
// es_episode_01_session_map_v1.ts, sessionOrdinal 15, "Скажи вслух: спроси
// меня" / kind: 'voice', builtOn: [10, 12, 14], recalls: [9, 10, 14].
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_15_VOICE_TITLE = L({
  ru: 'Скажи вслух: спроси меня',
  uk: 'Скажи вголос: запитай мене',
  es: 'Say it out loud: ask me',
  'pt-BR': 'Diga em voz alta: pergunte-me',
  vi: 'Nói to lên: hãy hỏi tôi',
  id: 'Ucapkan dengan keras: tanyakan padaku',
  tr: 'Yüksek sesle söyle: bana sor',
  pl: 'Powiedz na głos: zapytaj mnie',
});

export const ES_EPISODE_01_SESSION_15_VOICE_SUMMARY = L({
  ru: 'Знакомые вопросы звучат вслух — с той интонацией, что делает их вопросом, а не просто фразой со знаком ¿...? на письме.',
  uk: 'Знайомі питання звучать уголос — з тією інтонацією, що робить їх питанням, а не просто фразою зі знаком ¿...? на письмі.',
  es: 'Familiar questions are spoken out loud — with the intonation that makes them a question, not just a phrase with the mark ¿...? in writing.',
  'pt-BR': 'Perguntas já conhecidas são ditas em voz alta — com a entonação que as torna uma pergunta, não apenas uma frase com o sinal ¿...? por escrito.',
  vi: 'Những câu hỏi quen thuộc được nói to lên — với ngữ điệu khiến chúng trở thành câu hỏi, không chỉ là một câu có dấu ¿...? khi viết.',
  id: 'Pertanyaan yang sudah dikenal diucapkan dengan keras — dengan intonasi yang menjadikannya pertanyaan, bukan sekadar frasa dengan tanda ¿...? secara tertulis.',
  tr: 'Tanıdık sorular yüksek sesle söylenir — onları yazıda sadece ¿...? işaretli bir cümle değil, bir soru yapan tonlamayla.',
  pl: 'Znajome pytania brzmią na głos — z intonacją, która czyni je pytaniem, a nie tylko frazą ze znakiem ¿...? na piśmie.',
});

export const ES_EPISODE_01_SESSION_15_VOICE_GOAL = L({
  ru: 'Задать знакомые вопросы вслух с восходящей интонацией, свободно и точно, без запинки и без взгляда на письменный текст.',
  uk: 'Поставити знайомі питання вголос із висхідною інтонацією, вільно й точно, без запинки й без погляду на письмовий текст.',
  es: 'Ask familiar questions out loud with rising intonation, freely and accurately, without hesitation and without looking at written text.',
  'pt-BR': 'Fazer perguntas conhecidas em voz alta com entonação ascendente, livremente e com precisão, sem hesitar e sem olhar para o texto escrito.',
  vi: 'Đặt những câu hỏi quen thuộc to lên với ngữ điệu lên cao, một cách tự do và chính xác, không do dự và không nhìn vào chữ viết.',
  id: 'Mengajukan pertanyaan yang sudah dikenal dengan keras dengan intonasi naik, secara bebas dan akurat, tanpa ragu-ragu dan tanpa melihat teks tertulis.',
  tr: 'Tanıdık soruları duraksamadan ve yazılı metne bakmadan, yükselen bir tonlamayla özgürce ve doğru bir şekilde yüksek sesle sormak.',
  pl: 'Zadać znajome pytania na głos z rosnącą intonacją, swobodnie i dokładnie, bez wahania i bez patrzenia na pisemny tekst.',
});

const CONCEPT_BODY = L({
  ru: 'Письменный вопрос узнают по знакам ¿...?, но вслух — по звуку: голос поднимается к концу фразы, будто мелодия идёт вверх. Слова остаются теми же самыми — меняется только мелодия голоса, не порядок слов.',
  uk: 'Письмове питання впізнають за знаками ¿...?, але вголос — за звуком: голос піднімається до кінця фрази, ніби мелодія йде вгору. Слова лишаються тими самими — змінюється лише мелодія голосу, не порядок слів.',
  es: 'A written question is recognized by the marks ¿...?, but aloud by its sound: the voice rises toward the end of the phrase, as if the melody climbs upward. The words stay exactly the same — only the melody of the voice changes, not the word order.',
  'pt-BR': 'Uma pergunta escrita é reconhecida pelos sinais ¿...?, mas em voz alta pelo som: a voz sobe em direção ao fim da frase, como se a melodia subisse. As palavras permanecem as mesmas — muda apenas a melodia da voz, não a ordem das palavras.',
  vi: 'Một câu hỏi viết được nhận ra qua dấu ¿...?, nhưng khi nói to thì qua âm thanh: giọng lên cao về cuối câu, như thể giai điệu đang đi lên. Các từ vẫn giữ nguyên — chỉ giai điệu giọng nói thay đổi, không phải trật tự từ.',
  id: 'Pertanyaan tertulis dikenali dari tanda ¿...?, tetapi diucapkan dengan keras dikenali dari bunyinya: suara naik menuju akhir frasa, seolah melodinya naik. Kata-katanya tetap sama — yang berubah hanya melodi suara, bukan urutan kata.',
  tr: 'Yazılı bir soru ¿...? işaretlerinden tanınır, ama yüksek sesle sesinden tanınır: ses cümlenin sonuna doğru yükselir, sanki ezgi yukarı çıkıyormuş gibi. Kelimeler aynı kalır — yalnızca sesin ezgisi değişir, kelime sırası değil.',
  pl: 'Pytanie pisemne rozpoznaje się po znakach ¿...?, ale na głos po brzmieniu: głos wznosi się ku końcowi zdania, jakby melodia szła w górę. Słowa pozostają takie same — zmienia się tylko melodia głosu, nie kolejność słów.',
});

const FORMULA_BODY = L({
  ru: 'Голос поднимается к концу фразы — слово, куда падает подъём, это последнее слово фразы: ¿Es fácil? поднимается на fácil, а не на es. Точность измеряется на слух: поднимается ли голос так же, как в образце.',
  uk: 'Голос піднімається до кінця фрази — слово, куди припадає підйом, це останнє слово фрази: ¿Es fácil? підіймається на fácil, а не на es. Точність вимірюється на слух: чи піднімається голос так само, як у зразку.',
  es: 'The voice rises toward the end of the phrase, usually on the last word — ¿Es fácil? rises on fácil, not on es; ¿Eres segura? rises on segura. Accuracy is measured by ear: whether the voice rises the same way as in the model.',
  'pt-BR': 'A voz sobe em direção ao fim da frase, geralmente na última palavra — ¿Es fácil? sobe em fácil, não em es; ¿Eres segura? sobe em segura. A precisão é medida pelo ouvido: se a voz sobe da mesma forma que no modelo.',
  vi: 'Giọng nói lên cao về cuối câu, thường ở từ cuối cùng — ¿Es fácil? lên cao ở fácil, không phải ở es; ¿Eres segura? lên ở segura. Độ chính xác được đo bằng tai: giọng nói có lên cao giống như trong mẫu hay không.',
  id: 'Suara naik menuju akhir frasa, biasanya pada kata terakhir — ¿Es fácil? naik pada fácil, bukan pada es; ¿Eres segura? naik pada segura. Akurasi diukur dengan telinga: apakah suara naik dengan cara yang sama seperti pada contoh.',
  tr: 'Ses cümlenin sonuna doğru, genellikle son kelimede yükselir — ¿Es fácil? fácil üzerinde yükselir, es değil; ¿Eres segura? segura üzerinde yükselir. Doğruluk kulakla ölçülür: sesin örnekteki gibi yükselip yükselmediği.',
  pl: 'Głos wznosi się ku końcowi zdania — słowo, na które przypada wzniesienie, to ostatnie słowo zdania: ¿Es fácil? wznosi się na fácil, nie na es. Dokładność mierzy się na słuch: czy głos wznosi się tak samo jak we wzorze.',
});

const TRAP_BODY = L({
  ru: 'Ровный голос без подъёма превращает вопрос обратно в утверждение на слух, даже если на письме стоят знаки ¿...?. Самая опасная ошибка — задать No eres de acuerdo тем же ровным тоном, что и отрицание: собеседник услышит спор, а не вопрос.',
  uk: 'Рівний голос без підйому перетворює питання назад на твердження на слух, навіть якщо на письмі стоять знаки ¿...?. Найнебезпечніша помилка — поставити No eres de acuerdo тим самим рівним тоном, що й заперечення: співрозмовник почує суперечку, а не питання.',
  es: 'A level voice without a rise turns the question back into a statement to the ear, even if the marks ¿...? are there in writing. The most dangerous mistake is asking No eres de acuerdo with that same level tone as a plain negation: the listener hears an argument, not a question.',
  'pt-BR': 'Uma voz nivelada sem subida transforma a pergunta de volta numa afirmação ao ouvido, mesmo com os sinais ¿...? por escrito. O erro mais perigoso é fazer No eres de acuerdo com o mesmo tom nivelado de uma negação: o interlocutor ouve uma discussão, não uma pergunta.',
  vi: 'Giọng đều đều không lên cao sẽ biến câu hỏi trở lại thành câu khẳng định khi nghe, dù dấu ¿...? có trên chữ viết. Sai lầm nguy hiểm nhất là hỏi No eres de acuerdo bằng giọng đều đều như câu phủ định: người nghe sẽ nghe thấy tranh cãi, không phải câu hỏi.',
  id: 'Suara datar tanpa kenaikan mengubah pertanyaan kembali menjadi pernyataan di telinga, meskipun tanda ¿...? ada secara tertulis. Kesalahan paling berbahaya adalah menanyakan No eres de acuerdo dengan nada datar seperti negasi: pendengar akan mendengar perdebatan, bukan pertanyaan.',
  tr: 'Yükselişsiz düz bir ses, yazıda ¿...? işaretleri olsa bile soruyu kulakta yeniden bir ifadeye dönüştürür. En tehlikeli hata, No eres de acuerdo sorusunu sıradan bir olumsuzlamayla aynı düz tonda sormaktır: dinleyici bir soru değil, bir tartışma duyar.',
  pl: 'Równy głos bez wzniesienia zamienia pytanie z powrotem w twierdzenie dla ucha, nawet gdy na piśmie stoją znaki ¿...?. Najniebezpieczniejszym błędem jest zadanie No eres de acuerdo tym samym równym tonem co przeczenie: rozmówca usłyszy kłótnię, a nie pytanie.',
});

export const ES_EPISODE_01_SESSION_15_VOICE_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Вопрос узнают по звуку',
      uk: 'Питання впізнають за звуком',
      es: 'A question is recognized by its sound',
      'pt-BR': 'Uma pergunta é reconhecida pelo som',
      vi: 'Câu hỏi được nhận ra qua âm thanh',
      id: 'Pertanyaan dikenali dari bunyinya',
      tr: 'Bir soru sesinden tanınır',
      pl: 'Pytanie rozpoznaje się po brzmieniu',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Письменный вопрос узнают по знакам ¿...?, но вслух — по звуку: ', semantic: 'explanation' }, { text: 'голос поднимается к концу фразы', semantic: 'targetCorrect' }, { text: ', будто мелодия идёт вверх. Слова остаются теми же самыми — меняется только мелодия голоса, не порядок слов.', semantic: 'explanation' }),
      uk: R({ text: 'Письмове питання впізнають за знаками ¿...?, але вголос — за звуком: ', semantic: 'explanation' }, { text: 'голос піднімається до кінця фрази', semantic: 'targetCorrect' }, { text: ', ніби мелодія йде вгору. Слова лишаються тими самими — змінюється лише мелодія голосу, не порядок слів.', semantic: 'explanation' }),
      es: R({ text: 'A written question is recognized by the marks ¿...?, but aloud by its sound: ', semantic: 'explanation' }, { text: 'it rises in pitch toward the end of the phrase', semantic: 'targetCorrect' }, { text: ', as if the melody climbs upward. The words stay exactly the same — only the melody of the voice changes, not the word order.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Uma pergunta escrita é reconhecida pelos sinais ¿...?, mas em voz alta pelo som: ', semantic: 'explanation' }, { text: 'sobe de tom em direção ao fim da frase', semantic: 'targetCorrect' }, { text: ', como se a melodia subisse. As palavras permanecem as mesmas — muda apenas a melodia da voz, não a ordem das palavras.', semantic: 'explanation' }),
      vi: R({ text: 'Một câu hỏi viết được nhận ra qua dấu ¿...?, nhưng khi nói to thì qua âm thanh: ', semantic: 'explanation' }, { text: 'lên cao về cuối câu', semantic: 'targetCorrect' }, { text: ', như thể giai điệu đang đi lên. Các từ vẫn giữ nguyên — chỉ giai điệu giọng nói thay đổi, không phải trật tự từ.', semantic: 'explanation' }),
      id: R({ text: 'Pertanyaan tertulis dikenali dari tanda ¿...?, tetapi diucapkan dengan keras dikenali dari bunyinya: ', semantic: 'explanation' }, { text: 'naik nadanya menuju akhir frasa', semantic: 'targetCorrect' }, { text: ', seolah melodinya naik. Kata-katanya tetap sama — yang berubah hanya melodi suara, bukan urutan kata.', semantic: 'explanation' }),
      tr: R({ text: 'Yazılı bir soru ¿...? işaretlerinden tanınır, ama yüksek sesle sesinden tanınır: ', semantic: 'explanation' }, { text: 'cümlenin sonuna doğru perdesi yükselir', semantic: 'targetCorrect' }, { text: ', sanki ezgi yukarı çıkıyormuş gibi. Kelimeler aynı kalır — yalnızca sesin ezgisi değişir, kelime sırası değil.', semantic: 'explanation' }),
      pl: R({ text: 'Pytanie pisemne rozpoznaje się po znakach ¿...?, ale na głos po brzmieniu: ', semantic: 'explanation' }, { text: 'wznosi się w tonie ku końcowi zdania', semantic: 'targetCorrect' }, { text: ', jakby melodia szła w górę. Słowa pozostają takie same — zmienia się tylko melodia głosu, nie kolejność słów.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как меняется звук фразы, когда она становится вопросом?',
        uk: 'Як змінюється звук фрази, коли вона стає питанням?',
        es: 'How does the sound of the phrase change when it becomes a question?',
        'pt-BR': 'Como o som da frase muda quando ela se torna uma pergunta?',
        vi: 'Âm thanh của câu thay đổi thế nào khi nó trở thành câu hỏi?',
        id: 'Bagaimana bunyi frasa berubah ketika menjadi pertanyaan?',
        tr: 'Cümle soru haline geldiğinde sesi nasıl değişir?',
        pl: 'Jak zmienia się brzmienie zdania, gdy staje się pytaniem?',
      }),
      choices: [
        L({ ru: 'с подъёмом голоса к концу фразы', uk: 'з підйомом голосу до кінця фрази', es: 'rises in pitch toward the end of the phrase', 'pt-BR': 'sobe de tom em direção ao fim da frase', vi: 'lên cao về cuối câu', id: 'naik nadanya menuju akhir frasa', tr: 'cümlenin sonuna doğru perdesi yükselir', pl: 'wznosi się w tonie ku końcowi zdania' }),
        L({ ru: 'Слова меняются местами', uk: 'Слова міняються місцями', es: 'The words swap places', 'pt-BR': 'As palavras trocam de lugar', vi: 'Các từ đổi chỗ cho nhau', id: 'Kata-kata bertukar tempat', tr: 'Kelimeler yer değiştirir', pl: 'Słowa zamieniają się miejscami' }),
        L({ ru: 'Фраза звучит быстрее', uk: 'Фраза звучить швидше', es: 'The phrase sounds faster', 'pt-BR': 'A frase soa mais rápida', vi: 'Câu nói nhanh hơn', id: 'Frasa terdengar lebih cepat', tr: 'Cümle daha hızlı duyulur', pl: 'Zdanie brzmi szybciej' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Голос поднимается к концу фразы — слова не меняются местами, и скорость сама по себе не делает фразу вопросом.',
        uk: 'Голос піднімається до кінця фрази — слова не міняються місцями, і швидкість сама по собі не робить фразу питанням.',
        es: 'The voice rises toward the end of the phrase — the words do not swap places, and speed on its own does not make the phrase a question.',
        'pt-BR': 'A voz sobe em direção ao fim da frase — as palavras não trocam de lugar, e a velocidade por si só não torna a frase uma pergunta.',
        vi: 'Giọng nói lên cao về cuối câu — các từ không đổi chỗ, và bản thân tốc độ không khiến câu trở thành câu hỏi.',
        id: 'Suara naik menuju akhir frasa — kata-kata tidak bertukar tempat, dan kecepatan saja tidak membuat frasa menjadi pertanyaan.',
        tr: 'Ses cümlenin sonuna doğru yükselir — kelimeler yer değiştirmez ve hız tek başına cümleyi soru yapmaz.',
        pl: 'Głos wznosi się ku końcowi zdania — słowa nie zamieniają się miejscami, a sama szybkość nie czyni zdania pytaniem.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Подъём падает на последнее слово',
      uk: 'Підйом припадає на останнє слово',
      es: 'The rise falls on the last word',
      'pt-BR': 'A subida cai na última palavra',
      vi: 'Sự lên cao rơi vào từ cuối cùng',
      id: 'Kenaikan jatuh pada kata terakhir',
      tr: 'Yükseliş son kelimeye düşer',
      pl: 'Wzniesienie przypada na ostatnie słowo',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Голос поднимается к концу фразы — слово, куда падает подъём, это ', semantic: 'explanation' }, { text: 'последнее слово фразы', semantic: 'targetCorrect' }, { text: ': ¿Es fácil? поднимается на fácil, а не на es. Точность измеряется на слух: поднимается ли голос так же, как в образце.', semantic: 'explanation' }),
      uk: R({ text: 'Голос піднімається до кінця фрази — слово, куди припадає підйом, це ', semantic: 'explanation' }, { text: 'останнє слово фрази', semantic: 'targetCorrect' }, { text: ': ¿Es fácil? підіймається на fácil, а не на es. Точність вимірюється на слух: чи піднімається голос так само, як у зразку.', semantic: 'explanation' }),
      es: R({ text: 'The voice rises toward the end of the phrase, usually on ', semantic: 'explanation' }, { text: 'the last word of the phrase', semantic: 'targetCorrect' }, { text: ' — ¿Es fácil? rises on fácil, not on es; ¿Eres segura? rises on segura. Accuracy is measured by ear: whether the voice rises the same way as in the model.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A voz sobe em direção ao fim da frase, geralmente na ', semantic: 'explanation' }, { text: 'última palavra da frase', semantic: 'targetCorrect' }, { text: ' — ¿Es fácil? sobe em fácil, não em es; ¿Eres segura? sobe em segura. A precisão é medida pelo ouvido: se a voz sobe da mesma forma que no modelo.', semantic: 'explanation' }),
      vi: R({ text: 'Giọng nói lên cao về cuối câu, thường ở ', semantic: 'explanation' }, { text: 'từ cuối cùng của câu', semantic: 'targetCorrect' }, { text: ' — ¿Es fácil? lên cao ở fácil, không phải ở es; ¿Eres segura? lên ở segura. Độ chính xác được đo bằng tai: giọng nói có lên cao giống như trong mẫu hay không.', semantic: 'explanation' }),
      id: R({ text: 'Suara naik menuju akhir frasa, biasanya pada ', semantic: 'explanation' }, { text: 'kata terakhir dari frasa', semantic: 'targetCorrect' }, { text: ' — ¿Es fácil? naik pada fácil, bukan pada es; ¿Eres segura? naik pada segura. Akurasi diukur dengan telinga: apakah suara naik dengan cara yang sama seperti pada contoh.', semantic: 'explanation' }),
      tr: R({ text: 'Ses cümlenin sonuna doğru, genellikle ', semantic: 'explanation' }, { text: 'cümlenin son kelimesinde', semantic: 'targetCorrect' }, { text: ' yükselir — ¿Es fácil? fácil üzerinde yükselir, es değil; ¿Eres segura? segura üzerinde yükselir. Doğruluk kulakla ölçülür: sesin örnekteki gibi yükselip yükselmediği.', semantic: 'explanation' }),
      pl: R({ text: 'Głos wznosi się ku końcowi zdania — słowo, na które przypada wzniesienie, to ', semantic: 'explanation' }, { text: 'ostatnie słowo zdania', semantic: 'targetCorrect' }, { text: ': ¿Es fácil? wznosi się na fácil, nie na es. Dokładność mierzy się na słuch: czy głos wznosi się tak samo jak we wzorze.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'На каком слове обычно поднимается голос в вопросе?',
        uk: 'На якому слові зазвичай піднімається голос у питанні?',
        es: 'On which word does the voice usually rise in a question?',
        'pt-BR': 'Em qual palavra a voz costuma subir numa pergunta?',
        vi: 'Giọng nói thường lên cao ở từ nào trong câu hỏi?',
        id: 'Pada kata mana suara biasanya naik dalam pertanyaan?',
        tr: 'Bir soruda ses genellikle hangi kelimede yükselir?',
        pl: 'Na którym słowie zwykle wznosi się głos w pytaniu?',
      }),
      choices: [
        L({ ru: 'последнее слово фразы', uk: 'останнє слово фрази', es: 'the last word of the phrase', 'pt-BR': 'a última palavra da frase', vi: 'từ cuối cùng của câu', id: 'kata terakhir dari frasa', tr: 'cümlenin son kelimesidir', pl: 'ostatnie słowo zdania' }),
        L({ ru: 'На первом слове фразы', uk: 'На першому слові фрази', es: 'On the first word of the phrase', 'pt-BR': 'Na primeira palavra da frase', vi: 'Ở từ đầu tiên của câu', id: 'Pada kata pertama frasa', tr: 'Cümlenin ilk kelimesinde', pl: 'Na pierwszym słowie zdania' }),
        L({ ru: 'Голос вообще не меняется', uk: 'Голос узагалі не змінюється', es: 'The voice does not change at all', 'pt-BR': 'A voz não muda em nada', vi: 'Giọng nói hoàn toàn không thay đổi', id: 'Suara sama sekali tidak berubah', tr: 'Ses hiç değişmez', pl: 'Głos w ogóle się nie zmienia' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Правильный ответ — последнее слово фразы: голос поднимается именно там, не на первом слове, и он определённо меняется, а не остаётся ровным.',
        uk: 'Правильна відповідь — останнє слово фрази: голос піднімається саме там, не на першому слові, і він точно змінюється, а не лишається рівним.',
        es: 'The correct answer is the last word of the phrase: the voice rises exactly there, not on the first word, and it definitely changes rather than staying level.',
        'pt-BR': 'A resposta certa é a última palavra da frase: a voz sobe exatamente ali, não na primeira palavra, e ela definitivamente muda, em vez de ficar nivelada.',
        vi: 'Câu trả lời đúng là từ cuối cùng của câu: giọng nói lên cao chính xác ở đó, không phải từ đầu tiên, và nó chắc chắn thay đổi chứ không giữ đều đều.',
        id: 'Jawaban yang benar adalah kata terakhir dari frasa: suara naik persis di situ, bukan pada kata pertama, dan itu pasti berubah, bukan tetap datar.',
        tr: 'Doğru cevap cümlenin son kelimesidir: ses tam olarak orada yükselir, ilk kelimede değil, ve kesinlikle değişir, düz kalmaz.',
        pl: 'Poprawna odpowiedź to ostatnie słowo zdania: głos wznosi się dokładnie tam, nie na pierwszym słowie, i zdecydowanie się zmienia, a nie pozostaje równy.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Ровный голос превращает вопрос в спор',
      uk: 'Рівний голос перетворює питання на суперечку',
      es: 'A level voice turns a question into an argument',
      'pt-BR': 'Uma voz nivelada transforma a pergunta em discussão',
      vi: 'Giọng đều đều biến câu hỏi thành tranh cãi',
      id: 'Suara datar mengubah pertanyaan menjadi perdebatan',
      tr: 'Düz bir ses soruyu tartışmaya çevirir',
      pl: 'Równy głos zamienia pytanie w kłótnię',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Ровный голос без подъёма превращает вопрос обратно в утверждение на слух, даже если на письме стоят знаки ¿...?. Самая опасная ошибка — задать No eres de acuerdo тем же ровным тоном, что и отрицание: ', semantic: 'explanation' }, { text: 'собеседник услышит спор, а не вопрос', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      uk: R({ text: 'Рівний голос без підйому перетворює питання назад на твердження на слух, навіть якщо на письмі стоять знаки ¿...?. Найнебезпечніша помилка — поставити No eres de acuerdo тим самим рівним тоном, що й заперечення: ', semantic: 'explanation' }, { text: 'співрозмовник почує суперечку, а не питання', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      es: R({ text: 'A level voice without a rise turns the question back into a statement to the ear, even if the marks ¿...? are there in writing. The most dangerous mistake is asking No eres de acuerdo with that same level tone as a plain negation: ', semantic: 'explanation' }, { text: 'the listener hears an argument, not a question', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Uma voz nivelada sem subida transforma a pergunta de volta numa afirmação ao ouvido, mesmo com os sinais ¿...? por escrito. O erro mais perigoso é fazer No eres de acuerdo com o mesmo tom nivelado de uma negação: ', semantic: 'explanation' }, { text: 'o interlocutor ouve uma discussão, não uma pergunta', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      vi: R({ text: 'Giọng đều đều không lên cao sẽ biến câu hỏi trở lại thành câu khẳng định khi nghe, dù dấu ¿...? có trên chữ viết. Sai lầm nguy hiểm nhất là hỏi No eres de acuerdo bằng giọng đều đều như câu phủ định: ', semantic: 'explanation' }, { text: 'người nghe sẽ nghe thấy một cuộc tranh cãi, không phải một câu hỏi', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      id: R({ text: 'Suara datar tanpa kenaikan mengubah pertanyaan kembali menjadi pernyataan di telinga, meskipun tanda ¿...? ada secara tertulis. Kesalahan paling berbahaya adalah menanyakan No eres de acuerdo dengan nada datar seperti negasi: ', semantic: 'explanation' }, { text: 'pendengar akan mendengar perdebatan, bukan pertanyaan', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      tr: R({ text: 'Yükselişsiz düz bir ses, yazıda ¿...? işaretleri olsa bile soruyu kulakta yeniden bir ifadeye dönüştürür. En tehlikeli hata, No eres de acuerdo sorusunu sıradan bir olumsuzlamayla aynı düz tonda sormaktır: ', semantic: 'explanation' }, { text: 'dinleyici bir soru değil, bir tartışma duyar', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      pl: R({ text: 'Równy głos bez wzniesienia zamienia pytanie z powrotem w twierdzenie dla ucha, nawet gdy na piśmie stoją znaki ¿...?. Najniebezpieczniejszym błędem jest zadanie No eres de acuerdo tym samym równym tonem co przeczenie: ', semantic: 'explanation' }, { text: 'rozmówca usłyszy kłótnię, a nie pytanie', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что случится, если задать вопрос ровным тоном без подъёма?',
        uk: 'Що станеться, якщо поставити питання рівним тоном без підйому?',
        es: 'What happens if a question is asked with a level tone and no rise?',
        'pt-BR': 'O que acontece se uma pergunta for feita com tom nivelado e sem subida?',
        vi: 'Điều gì xảy ra nếu một câu hỏi được đặt với giọng đều đều, không lên cao?',
        id: 'Apa yang terjadi jika pertanyaan diajukan dengan nada datar tanpa kenaikan?',
        tr: 'Bir soru düz bir tonla, yükseliş olmadan sorulursa ne olur?',
        pl: 'Co się stanie, gdy pytanie zada się równym tonem, bez wzniesienia?',
      }),
      choices: [
        L({ ru: 'Собеседник услышит спор, а не вопрос', uk: 'Співрозмовник почує суперечку, а не питання', es: 'The listener hears an argument, not a question', 'pt-BR': 'O interlocutor ouve uma discussão, não uma pergunta', vi: 'người nghe sẽ nghe thấy một cuộc tranh cãi, không phải một câu hỏi', id: 'pendengar akan mendengar perdebatan, bukan pertanyaan', tr: 'dinleyici bir soru değil, bir tartışma duyar', pl: 'Rozmówca usłyszy kłótnię, a nie pytanie' }),
        L({ ru: 'Ничего не изменится', uk: 'Нічого не зміниться', es: 'Nothing changes', 'pt-BR': 'Nada muda', vi: 'Không có gì thay đổi', id: 'Tidak ada yang berubah', tr: 'Hiçbir şey değişmez', pl: 'Nic się nie zmieni' }),
        L({ ru: 'Фраза станет длиннее', uk: 'Фраза стане довшою', es: 'The phrase becomes longer', 'pt-BR': 'A frase fica mais longa', vi: 'Câu sẽ dài hơn', id: 'Frasa menjadi lebih panjang', tr: 'Cümle daha uzun olur', pl: 'Zdanie stanie się dłuższe' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Собеседник услышит спор, а не вопрос, — ровный тон без подъёма меняет смысл на слух, а длина фразы тут ни при чём.',
        uk: 'Співрозмовник почує суперечку, а не питання, — рівний тон без підйому змінює сенс на слух, а довжина фрази тут ні до чого.',
        es: 'The listener hears an argument, not a question — a level tone without a rise changes the meaning to the ear, and the length of the phrase has nothing to do with it.',
        'pt-BR': 'O interlocutor ouve uma discussão, não uma pergunta — um tom nivelado sem subida muda o sentido ao ouvido, e o comprimento da frase não tem nada a ver com isso.',
        vi: 'Người nghe sẽ nghe thấy tranh cãi, không phải câu hỏi — giọng đều đều không lên cao làm thay đổi ý nghĩa khi nghe, và độ dài câu không liên quan gì đến điều đó.',
        id: 'Pendengar mendengar perdebatan, bukan pertanyaan — nada datar tanpa kenaikan mengubah makna di telinga, dan panjang frasa tidak ada hubungannya dengan itu.',
        tr: 'Dinleyici bir tartışma duyar, soru değil — yükselişsiz düz bir ton anlamı kulakta değiştirir ve cümlenin uzunluğunun bununla ilgisi yoktur.',
        pl: 'Rozmówca usłyszy kłótnię, a nie pytanie — równy ton bez wzniesienia zmienia znaczenie dla ucha, a długość zdania nie ma z tym nic wspólnego.',
      }),
    },
  },
];
