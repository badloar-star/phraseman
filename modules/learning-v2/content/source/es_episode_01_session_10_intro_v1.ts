import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл переписан (владелец, 2026-08-27, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// §7 + LEARNING_CONTENT_STYLE_BIBLE.ru.md правило 2): исходный черновик от
// 2026-08-24 держал тела intro на ~400-550 знаков на локаль — за потолком
// intro_body_overloaded (320 знаков / 2-4 предложения,
// learning_content_quality_gate_v1.ts). Смысл сохранён (concept/formula/trap
// про испанский вопрос без инверсии: порядок слов не меняется, только знаки
// ¿? и интонация), текст сжат. Карта сессии: es_episode_01_session_map_v1.ts,
// sessionOrdinal 10, "Так ли это?" / question_marks, question_intonation,
// builtOn: [9], recalls: [1, 9]. Новых слов нет.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_10_TITLE = L({
  ru: 'Так ли это?',
  uk: 'Чи так це?',
  es: 'Is that so?',
  'pt-BR': 'É mesmo assim?',
  vi: 'Có phải vậy không?',
  id: 'Apakah begitu?',
  tr: 'Öyle mi?',
  pl: 'Czy tak jest?',
});

export const ES_EPISODE_01_SESSION_10_SUMMARY = L({
  ru: 'Испанский вопрос не переставляет слова местами — он просто обрамляет то же утверждение двумя знаками вопроса.',
  uk: 'Іспанське питання не переставляє слова місцями — воно просто обрамляє те саме твердження двома знаками питання.',
  es: 'A Spanish question does not rearrange the words — it simply frames the same statement with two question marks.',
  'pt-BR': 'A pergunta em espanhol não reorganiza as palavras — ela simplesmente emoldura a mesma afirmação com dois sinais de interrogação.',
  vi: 'Câu hỏi tiếng Tây Ban Nha không sắp xếp lại từ ngữ — nó chỉ đơn giản đóng khung cùng một câu khẳng định bằng hai dấu hỏi.',
  id: 'Pertanyaan bahasa Spanyol tidak menyusun ulang kata-kata — ia hanya membingkai pernyataan yang sama dengan dua tanda tanya.',
  tr: 'İspanyolca soru kelimeleri yeniden düzenlemez — aynı ifadeyi yalnızca iki soru işaretiyle çerçeveler.',
  pl: 'Hiszpańskie pytanie nie zmienia kolejności słów — po prostu obramowuje to samo twierdzenie dwoma znakami zapytania.',
});

export const ES_EPISODE_01_SESSION_10_GOAL = L({
  ru: 'Узнать на слух вопросительную интонацию и точно написать вопрос с ¿ и ? вокруг уже знакомых слов.',
  uk: 'Упізнати на слух питальну інтонацію і точно написати питання з ¿ та ? навколо вже знайомих слів.',
  es: 'Recognize the questioning intonation by ear and correctly write a question with ¿ and ? around already familiar words.',
  'pt-BR': 'Reconhecer de ouvido a entonação de pergunta e escrever corretamente uma pergunta com ¿ e ? ao redor de palavras já conhecidas.',
  vi: 'Nghe ra ngữ điệu hỏi và viết đúng câu hỏi với ¿ và ? bao quanh những từ đã quen thuộc.',
  id: 'Mengenali dari suara intonasi bertanya dan menulis dengan tepat pertanyaan dengan ¿ dan ? di sekitar kata-kata yang sudah dikenal.',
  tr: 'Soru tonlamasını duyup tanımak ve zaten tanıdık kelimelerin etrafına ¿ ve ? işaretleriyle bir soru doğru yazmak.',
  pl: 'Rozpoznać ze słuchu pytającą intonację i poprawnie napisać pytanie z ¿ i ? wokół już znanych słów.',
});

const CONCEPT_BODY = L({
  ru: 'В испанском вопрос не переставляет слова: Eres rápido превращается в ¿Eres rápido? без единой перестановки. Разницу делают только знаки ¿? и интонация — больше ничего не меняется.',
  uk: 'В іспанській питання не переставляє слова: Eres rápido перетворюється на ¿Eres rápido? без жодної перестановки. Різницю роблять тільки знаки ¿? і інтонація — більше нічого не змінюється.',
  es: 'In Spanish a question does not rearrange the words: Eres rápido turns into ¿Eres rápido? without a single rearrangement. Only the marks ¿? and the intonation create the difference — nothing else changes.',
  'pt-BR': 'Em espanhol a pergunta não reorganiza as palavras: Eres rápido vira ¿Eres rápido? sem reorganização. Só os sinais ¿? e a entonação criam a diferença — mais nada muda.',
  vi: 'Trong tiếng Tây Ban Nha câu hỏi không sắp xếp lại từ: Eres rápido biến thành ¿Eres rápido? mà không sắp xếp lại. Chỉ dấu ¿? và ngữ điệu tạo ra khác biệt — không gì khác thay đổi.',
  id: 'Dalam bahasa Spanyol pertanyaan tidak menyusun ulang kata: Eres rápido berubah menjadi ¿Eres rápido? tanpa penyusunan ulang. Hanya tanda ¿? dan intonasi yang menciptakan perbedaan — tidak ada yang lain berubah.',
  tr: 'İspanyolcada soru kelimeleri yeniden düzenlemez: Eres rápido, ¿Eres rápido? olur, hiç yeniden düzenleme olmadan. Yalnızca ¿? işaretleri ve tonlama farkı yaratır — başka hiçbir şey değişmez.',
  pl: 'W hiszpańskim pytanie nie zmienia kolejności słów: Eres rápido zamienia się w ¿Eres rápido? bez zmiany kolejności. Tylko znaki ¿? i intonacja tworzą różnicę — nic więcej się nie zmienia.',
});

const FORMULA_BODY = L({
  ru: 'Формула проста: знаки ставятся по краям фразы, внутри менять нечего. Так Es fácil становится ¿Es fácil? — только знаки и интонация меняют утверждение на вопрос.',
  uk: 'Формула проста: знаки ставляться по краях фрази, всередині міняти нічого. Так Es fácil стає ¿Es fácil? — тільки знаки і інтонація перетворюють твердження на питання.',
  es: 'The formula is simple: the marks go at the edges of the phrase, nothing inside changes. This is how Es fácil becomes ¿Es fácil? — only the marks and the intonation turn a statement into a question.',
  'pt-BR': 'A fórmula é simples: os sinais ficam nas bordas da frase, nada por dentro muda. Assim Es fácil vira ¿Es fácil? — só os sinais e a entonação transformam a afirmação em pergunta.',
  vi: 'Công thức đơn giản: các dấu đặt ở hai đầu câu, bên trong không đổi gì. Es fácil trở thành ¿Es fácil? theo cách đó — chỉ dấu câu và ngữ điệu biến câu khẳng định thành câu hỏi.',
  id: 'Rumusnya sederhana: tanda-tanda diletakkan di kedua ujung frasa, bagian dalam tidak berubah. Begitulah Es fácil menjadi ¿Es fácil? — hanya tanda dan intonasi mengubah pernyataan menjadi pertanyaan.',
  tr: 'Formül basittir: işaretler ifadenin uçlarına konur, içi değişmez. Es fácil böylece ¿Es fácil? olur — yalnızca işaretler ve tonlama ifadeyi soruya çevirir.',
  pl: 'Formuła jest prosta: znaki stoją na krawędziach frazy, wewnątrz nic się nie zmienia. Tak Es fácil staje się ¿Es fácil? — tylko znaki i intonacja zmieniają twierdzenie w pytanie.',
});

const TRAP_BODY = L({
  ru: 'Частая ошибка на письме — забыть открывающий ¿ и написать только Es verdad?. Вторая ловушка — переставить слова, как в английском: ¿Verdad es? вместо ¿Es verdad?. Порядок слов не меняется никогда.',
  uk: 'Часта помилка на письмі — забути відкривний ¿ і написати тільки Es verdad?. Друга пастка — переставити слова, як в англійській: ¿Verdad es? замість ¿Es verdad?. Порядок слів не змінюється ніколи.',
  es: 'A common writing mistake is forgetting the opening ¿ and writing only Es verdad?. The second trap is rearranging the words like in English: ¿Verdad es? instead of ¿Es verdad?. The word order never changes.',
  'pt-BR': 'Um erro comum na escrita é esquecer o ¿ de abertura e escrever só Es verdad?. A segunda armadilha é reorganizar as palavras: ¿Verdad es? em vez de ¿Es verdad?. A ordem das palavras nunca muda.',
  vi: 'Lỗi thường gặp khi viết là quên dấu mở ¿ và chỉ viết Es verdad?. Cái bẫy thứ hai là sắp xếp lại từ như tiếng Anh: ¿Verdad es? thay vì ¿Es verdad?. Trật tự từ không bao giờ đổi.',
  id: 'Kesalahan umum dalam menulis adalah lupa tanda pembuka ¿ dan hanya menulis Es verdad?. Jebakan kedua adalah menyusun ulang kata: ¿Verdad es? alih-alih ¿Es verdad?. Urutan kata tidak pernah berubah.',
  tr: 'Yaygın yazım hatası, açılış ¿ işaretini unutup yalnızca Es verdad yazmaktır. İkinci tuzak, kelimeleri İngilizcedeki gibi yeniden düzenlemektir: ¿Es verdad? yerine yanlış sıralı bir biçim. Kelime sırası asla değişmez.',
  pl: 'Częsty błąd w piśmie to zapomnienie otwierającego ¿ i napisanie tylko Es verdad?. Druga pułapka to zmiana kolejności słów: ¿Verdad es? zamiast ¿Es verdad?. Kolejność słów nigdy się nie zmienia.',
});

export const ES_EPISODE_01_SESSION_10_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Тот же порядок слов, два знака',
      uk: 'Той самий порядок слів, два знаки',
      es: 'Same word order, two marks',
      'pt-BR': 'A mesma ordem de palavras, dois sinais',
      vi: 'Cùng trật tự từ, hai dấu',
      id: 'Urutan kata yang sama, dua tanda',
      tr: 'Aynı kelime sırası, iki işaret',
      pl: 'Ta sama kolejność słów, dwa znaki',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'В испанском вопрос не переставляет слова: ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'explanation' }, { text: ' превращается в ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'explanation' }, { text: ' без единой перестановки. ', semantic: 'explanation' }, { text: 'Разницу делают только знаки ¿? и интонация', semantic: 'targetCorrect' }, { text: ' — больше ничего не меняется.', semantic: 'explanation' }),
      uk: R({ text: 'В іспанській питання не переставляє слова: ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'explanation' }, { text: ' перетворюється на ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'explanation' }, { text: ' без жодної перестановки. ', semantic: 'explanation' }, { text: 'Різницю роблять тільки знаки ¿? і інтонація', semantic: 'targetCorrect' }, { text: ' — більше нічого не змінюється.', semantic: 'explanation' }),
      es: R({ text: 'In Spanish a question does not rearrange the words: ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'explanation' }, { text: ' turns into ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'explanation' }, { text: ' without a single rearrangement. ', semantic: 'explanation' }, { text: 'Only the marks ¿? and the intonation', semantic: 'targetCorrect' }, { text: ' create the difference — nothing else changes.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Em espanhol a pergunta não reorganiza as palavras: ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'explanation' }, { text: ' vira ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'explanation' }, { text: ' sem reorganização. ', semantic: 'explanation' }, { text: 'Só os sinais ¿? e a entonação', semantic: 'targetCorrect' }, { text: ' criam a diferença — mais nada muda.', semantic: 'explanation' }),
      vi: R({ text: 'Trong tiếng Tây Ban Nha câu hỏi không sắp xếp lại từ: ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'explanation' }, { text: ' biến thành ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'explanation' }, { text: ' mà không sắp xếp lại. ', semantic: 'explanation' }, { text: 'Chỉ dấu ¿? và ngữ điệu', semantic: 'targetCorrect' }, { text: ' tạo ra khác biệt — không gì khác thay đổi.', semantic: 'explanation' }),
      id: R({ text: 'Dalam bahasa Spanyol pertanyaan tidak menyusun ulang kata: ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'explanation' }, { text: ' berubah menjadi ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'explanation' }, { text: ' tanpa penyusunan ulang. ', semantic: 'explanation' }, { text: 'Hanya tanda ¿? dan intonasi', semantic: 'targetCorrect' }, { text: ' yang menciptakan perbedaan — tidak ada yang lain berubah.', semantic: 'explanation' }),
      tr: R({ text: 'İspanyolcada soru kelimeleri yeniden düzenlemez: ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'explanation' }, { text: ', ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'explanation' }, { text: ' olur, hiç yeniden düzenleme olmadan. ', semantic: 'explanation' }, { text: 'Yalnızca ¿? işaretleri ve tonlama', semantic: 'targetCorrect' }, { text: ' farkı yaratır — başka hiçbir şey değişmez.', semantic: 'explanation' }),
      pl: R({ text: 'W hiszpańskim pytanie nie zmienia kolejności słów: ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'explanation' }, { text: ' zamienia się w ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'explanation' }, { text: ' bez zmiany kolejności. ', semantic: 'explanation' }, { text: 'Tylko znaki ¿? i intonacja', semantic: 'targetCorrect' }, { text: ' tworzą różnicę — nic więcej się nie zmienia.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что делает испанский вопрос отличным от утверждения?',
        uk: 'Що робить іспанське питання відмінним від твердження?',
        es: 'What makes a Spanish question different from a statement?',
        'pt-BR': 'O que torna uma pergunta em espanhol diferente de uma afirmação?',
        vi: 'Điều gì làm cho câu hỏi tiếng Tây Ban Nha khác câu khẳng định?',
        id: 'Apa yang membuat pertanyaan bahasa Spanyol berbeda dari pernyataan?',
        tr: 'İspanyolca bir soruyu ifadeden farklı kılan nedir?',
        pl: 'Co odróżnia hiszpańskie pytanie od twierdzenia?',
      }),
      choices: [
        L({ ru: 'Только знаки ¿? и интонация', uk: 'Тільки знаки ¿? і інтонація', es: 'Only the marks ¿? and the intonation', 'pt-BR': 'Só os sinais ¿? e a entonação', vi: 'Chỉ dấu ¿? và ngữ điệu', id: 'Hanya tanda ¿? dan intonasi', tr: 'Yalnızca ¿? işaretleri ve tonlama', pl: 'Tylko znaki ¿? i intonacja' }),
        L({ ru: 'Перестановка слов местами', uk: 'Перестановка слів місцями', es: 'Rearranging the words', 'pt-BR': 'Reorganização das palavras', vi: 'Sắp xếp lại từ ngữ', id: 'Penyusunan ulang kata', tr: 'Kelimelerin yeniden düzenlenmesi', pl: 'Zmiana kolejności słów' }),
        L({ ru: 'Новое слово в начале фразы', uk: 'Нове слово на початку фрази', es: 'A new word at the start of the phrase', 'pt-BR': 'Uma palavra nova no início da frase', vi: 'Một từ mới ở đầu câu', id: 'Kata baru di awal frasa', tr: 'İfadenin başında yeni bir kelime', pl: 'Nowe słowo na początku frazy' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Верно только знаки ¿? и интонация — порядок слов остаётся тем же самым, что и в утверждении.',
        uk: 'Правильно тільки знаки ¿? і інтонація — порядок слів лишається тим самим, що й у твердженні.',
        es: 'Only the marks ¿? and the intonation are correct — the word order stays exactly the same as in the statement.',
        'pt-BR': 'Só os sinais ¿? e a entonação estão corretos — a ordem das palavras fica exatamente igual à da afirmação.',
        vi: 'Chỉ dấu ¿? và ngữ điệu là đúng — trật tự từ vẫn giữ nguyên y hệt câu khẳng định.',
        id: 'Hanya tanda ¿? dan intonasi yang benar — urutan kata tetap persis sama seperti pernyataan.',
        tr: 'Yalnızca ¿? işaretleri ve tonlama doğrudur — kelime sırası ifadedekiyle tamamen aynı kalır.',
        pl: 'Poprawne są tylko znaki ¿? i intonacja — kolejność słów pozostaje dokładnie taka sama jak w twierdzeniu.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Обрамление, а не перестановка',
      uk: 'Обрамлення, а не перестановка',
      es: 'Framing, not rearranging',
      'pt-BR': 'Emoldurar, não reorganizar',
      vi: 'Đóng khung, không sắp xếp lại',
      id: 'Membingkai, bukan menyusun ulang',
      tr: 'Yeniden düzenleme değil çerçeveleme',
      pl: 'Obramowanie, nie zmiana kolejności',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула проста: знаки ставятся по краям фразы, внутри менять нечего. Так ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'explanation' }, { text: ' становится ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' — только знаки и интонация меняют утверждение на вопрос.', semantic: 'explanation' }),
      uk: R({ text: 'Формула проста: знаки ставляться по краях фрази, всередині міняти нічого. Так ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'explanation' }, { text: ' стає ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' — тільки знаки і інтонація перетворюють твердження на питання.', semantic: 'explanation' }),
      es: R({ text: 'The formula is simple: the marks go at the edges of the phrase, nothing inside changes. This is how ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'explanation' }, { text: ' becomes ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' — only the marks and the intonation turn a statement into a question.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é simples: os sinais ficam nas bordas da frase, nada por dentro muda. Assim ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'explanation' }, { text: ' vira ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' — só os sinais e a entonação transformam a afirmação em pergunta.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức đơn giản: các dấu đặt ở hai đầu câu, bên trong không đổi gì. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'explanation' }, { text: ' trở thành ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' theo cách đó — chỉ dấu câu và ngữ điệu biến câu khẳng định thành câu hỏi.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sederhana: tanda-tanda diletakkan di kedua ujung frasa, bagian dalam tidak berubah. Begitulah ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'explanation' }, { text: ' menjadi ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' — hanya tanda dan intonasi mengubah pernyataan menjadi pertanyaan.', semantic: 'explanation' }),
      tr: R({ text: 'Formül basittir: işaretler ifadenin uçlarına konur, içi değişmez. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'explanation' }, { text: ' böylece ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' olur — yalnızca işaretler ve tonlama ifadeyi soruya çevirir.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest prosta: znaki stoją na krawędziach frazy, wewnątrz nic się nie zmienia. Tak ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'explanation' }, { text: ' staje się ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' — tylko znaki i intonacja zmieniają twierdzenie w pytanie.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как превратить утверждение Es fácil в вопрос?',
        uk: 'Як перетворити твердження Es fácil на питання?',
        es: 'How do you turn the statement Es fácil into a question?',
        'pt-BR': 'Como transformar a afirmação Es fácil em pergunta?',
        vi: 'Làm sao biến câu khẳng định Es fácil thành câu hỏi?',
        id: 'Bagaimana mengubah pernyataan Es fácil menjadi pertanyaan?',
        tr: 'Es fácil ifadesi nasıl soruya dönüştürülür?',
        pl: 'Jak zamienić twierdzenie Es fácil w pytanie?',
      }),
      choices: [
        L({ ru: '¿Es fácil?', uk: '¿Es fácil?', es: '¿Es fácil?', 'pt-BR': '¿Es fácil?', vi: '¿Es fácil?', id: '¿Es fácil?', tr: '¿Es fácil?', pl: '¿Es fácil?' }),
        L({ ru: 'Fácil es?', uk: 'Fácil es?', es: 'Fácil es?', 'pt-BR': 'Fácil es?', vi: 'Fácil es?', id: 'Fácil es?', tr: 'Fácil es?', pl: 'Fácil es?' }),
        L({ ru: 'Es fácil, sí?', uk: 'Es fácil, sí?', es: 'Es fácil, sí?', 'pt-BR': 'Es fácil, sí?', vi: 'Es fácil, sí?', id: 'Es fácil, sí?', tr: 'Es fácil, sí?', pl: 'Es fácil, sí?' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: '¿Es fácil? верно — то же утверждение с ¿ спереди и ? сзади, без перестановки слов.',
        uk: '¿Es fácil? правильно — те саме твердження з ¿ спереду і ? ззаду, без перестановки слів.',
        es: '¿Es fácil? is correct — the same statement with ¿ in front and ? behind, without rearranging words.',
        'pt-BR': '¿Es fácil? está correto — a mesma afirmação com ¿ na frente e ? atrás, sem reorganizar palavras.',
        vi: '¿Es fácil? đúng — chính câu khẳng định đó với ¿ ở trước và ? ở sau, không sắp xếp lại từ.',
        id: '¿Es fácil? benar — pernyataan yang sama dengan ¿ di depan dan ? di belakang, tanpa menyusun ulang kata.',
        tr: '¿Es fácil? doğrudur — önünde ¿ ve arkasında ? olan aynı ifade, kelimeleri yeniden düzenlemeden.',
        pl: '¿Es fácil? jest poprawne — to samo twierdzenie z ¿ z przodu i ? z tyłu, bez zmiany kolejności słów.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Оба знака нужны, порядок не меняй',
      uk: 'Обидва знаки потрібні, порядок не міняй',
      es: 'Both marks are needed, do not change the order',
      'pt-BR': 'Os dois sinais são necessários, não mude a ordem',
      vi: 'Cần cả hai dấu, đừng đổi trật tự',
      id: 'Kedua tanda diperlukan, jangan ubah urutan',
      tr: 'Her iki işaret de gerekli, sırayı değiştirme',
      pl: 'Oba znaki są potrzebne, nie zmieniaj kolejności',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Частая ошибка на письме — забыть открывающий ¿ и написать только ', semantic: 'explanation' }, { text: 'Es verdad?', semantic: 'targetWrong' }, { text: '. Вторая ловушка — переставить слова, как в английском: ', semantic: 'explanation' }, { text: '¿Verdad es?', semantic: 'targetWrong' }, { text: ' вместо ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: '. Порядок слов не меняется никогда.', semantic: 'explanation' }),
      uk: R({ text: 'Часта помилка на письмі — забути відкривний ¿ і написати тільки ', semantic: 'explanation' }, { text: 'Es verdad?', semantic: 'targetWrong' }, { text: '. Друга пастка — переставити слова, як в англійській: ', semantic: 'explanation' }, { text: '¿Verdad es?', semantic: 'targetWrong' }, { text: ' замість ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: '. Порядок слів не змінюється ніколи.', semantic: 'explanation' }),
      es: R({ text: 'A common writing mistake is forgetting the opening ¿ and writing only ', semantic: 'explanation' }, { text: 'Es verdad?', semantic: 'targetWrong' }, { text: '. The second trap is rearranging the words like in English: ', semantic: 'explanation' }, { text: '¿Verdad es?', semantic: 'targetWrong' }, { text: ' instead of ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: '. The word order never changes.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Um erro comum na escrita é esquecer o ¿ de abertura e escrever só ', semantic: 'explanation' }, { text: 'Es verdad?', semantic: 'targetWrong' }, { text: '. A segunda armadilha é reorganizar as palavras: ', semantic: 'explanation' }, { text: '¿Verdad es?', semantic: 'targetWrong' }, { text: ' em vez de ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: '. A ordem das palavras nunca muda.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi thường gặp khi viết là quên dấu mở ¿ và chỉ viết ', semantic: 'explanation' }, { text: 'Es verdad?', semantic: 'targetWrong' }, { text: '. Cái bẫy thứ hai là sắp xếp lại từ như tiếng Anh: ', semantic: 'explanation' }, { text: '¿Verdad es?', semantic: 'targetWrong' }, { text: ' thay vì ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: '. Trật tự từ không bao giờ đổi.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan umum dalam menulis adalah lupa tanda pembuka ¿ dan hanya menulis ', semantic: 'explanation' }, { text: 'Es verdad?', semantic: 'targetWrong' }, { text: '. Jebakan kedua adalah menyusun ulang kata: ', semantic: 'explanation' }, { text: '¿Verdad es?', semantic: 'targetWrong' }, { text: ' alih-alih ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: '. Urutan kata tidak pernah berubah.', semantic: 'explanation' }),
      tr: R({ text: 'Yaygın yazım hatası, açılış ¿ işaretini unutup yalnızca ', semantic: 'explanation' }, { text: 'Es verdad', semantic: 'targetWrong' }, { text: ' yazmaktır. İkinci tuzak, kelimeleri İngilizcedeki gibi yeniden düzenlemektir: ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: ' yerine yanlış sıralı bir biçim. Kelime sırası asla değişmez.', semantic: 'explanation' }),
      pl: R({ text: 'Częsty błąd w piśmie to zapomnienie otwierającego ¿ i napisanie tylko ', semantic: 'explanation' }, { text: 'Es verdad?', semantic: 'targetWrong' }, { text: '. Druga pułapka to zmiana kolejności słów: ', semantic: 'explanation' }, { text: '¿Verdad es?', semantic: 'targetWrong' }, { text: ' zamiast ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: '. Kolejność słów nigdy się nie zmienia.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно спросить «Это правда?»',
        uk: 'Як правильно запитати «Це правда?»',
        es: 'How do you correctly ask "Is it true?"',
        'pt-BR': 'Como perguntar corretamente "É verdade?"',
        vi: 'Hỏi đúng "Có đúng không?" như thế nào?',
        id: 'Bagaimana bertanya dengan benar "Apakah itu benar?"',
        tr: '"Doğru mu?" doğru nasıl sorulur?',
        pl: 'Jak poprawnie zapytać „Czy to prawda?”',
      }),
      choices: [
        L({ ru: '¿Es verdad?', uk: '¿Es verdad?', es: '¿Es verdad?', 'pt-BR': '¿Es verdad?', vi: '¿Es verdad?', id: '¿Es verdad?', tr: '¿Es verdad?', pl: '¿Es verdad?' }),
        L({ ru: '¿Verdad es?', uk: '¿Verdad es?', es: '¿Verdad es?', 'pt-BR': '¿Verdad es?', vi: '¿Verdad es?', id: '¿Verdad es?', tr: '¿Verdad es?', pl: '¿Verdad es?' }),
        L({ ru: 'Es verdad?', uk: 'Es verdad?', es: 'Es verdad?', 'pt-BR': 'Es verdad?', vi: 'Es verdad?', id: 'Es verdad?', tr: 'Es verdad?', pl: 'Es verdad?' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: '¿Es verdad? верно, потому что порядок слов не меняется и присутствуют оба знака.',
        uk: '¿Es verdad? правильно, бо порядок слів не змінюється і присутні обидва знаки.',
        es: '¿Es verdad? is correct because the word order does not change and both marks are present.',
        'pt-BR': '¿Es verdad? está correto porque a ordem das palavras não muda e ambos os sinais estão presentes.',
        vi: '¿Es verdad? đúng vì trật tự từ không đổi và có cả hai dấu.',
        id: '¿Es verdad? benar karena urutan kata tidak berubah dan kedua tanda hadir.',
        tr: '¿Es verdad? doğrudur çünkü kelime sırası değişmez ve her iki işaret de mevcuttur.',
        pl: '¿Es verdad? jest poprawne, ponieważ kolejność słów się nie zmienia i obecne są oba znaki.',
      }),
    },
  },
];
