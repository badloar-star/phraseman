import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24, карта сессий es_episode_01_session_map_v1.ts,
// сессия 10 "Так ли это?" / question_marks, question_intonation, builtOn: [9],
// recalls: [1, 9]): три страницы concept/formula/trap объясняют испанский
// вопрос без инверсии — порядок слов не меняется, вопрос помечается двумя
// знаками ¿? и интонацией. Recall из сессии 9 — eres; recall из сессии 1 —
// es/fácil/verdad. Новых слов нет (kind: phrases по карте).
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
  ru: 'Узнать на слух вопросительную интонацию и точно написать вопрос с открывающим ¿ и закрывающим ? вокруг уже знакомых слов.',
  uk: 'Упізнати на слух питальну інтонацію і точно написати питання з відкривним ¿ та закривним ? навколо вже знайомих слів.',
  es: 'Recognize the questioning intonation by ear and correctly write a question with the opening ¿ and the closing ? around already familiar words.',
  'pt-BR': 'Reconhecer de ouvido a entonação de pergunta e escrever corretamente uma pergunta com o sinal de abertura ¿ e o de fechamento ? ao redor de palavras já conhecidas.',
  vi: 'Nghe ra ngữ điệu hỏi và viết đúng câu hỏi với dấu mở ¿ và dấu đóng ? bao quanh những từ đã quen thuộc.',
  id: 'Mengenali dari suara intonasi bertanya dan menulis dengan tepat pertanyaan dengan tanda pembuka ¿ dan tanda penutup ? di sekitar kata-kata yang sudah dikenal.',
  tr: 'Soru tonlamasını duyup tanımak ve zaten tanıdık kelimelerin etrafına açılış ¿ ve kapanış ? işaretleriyle bir soru doğru yazmak.',
  pl: 'Rozpoznać ze słuchu pytającą intonację i poprawnie napisać pytanie z otwierającym ¿ i zamykającym ? wokół już znanych słów.',
});

const CONCEPT_BODY = L({
  ru: 'В английском вопрос часто переставляет слова местами: «he is fast» становится «is he fast». В испанском порядок слов не меняется — Eres rápido превращается в ¿Eres rápido? без единой перестановки. Разницу делают только знаки ¿? и интонация: без них ¿Eres rápido? прозвучит как обычное утверждение. Ответ прост: разницу между утверждением и вопросом создают только знаки ¿? и интонация — больше ничего не меняется.',
  uk: 'В англійській питання часто переставляє слова місцями: «he is fast» стає «is he fast». В іспанській порядок слів не змінюється — Eres rápido перетворюється на ¿Eres rápido? без жодної перестановки. Різницю роблять лише знаки ¿? та інтонація: без них ¿Eres rápido? прозвучить як звичайне твердження. Відповідь проста: різницю між твердженням і питанням створюють тільки знаки ¿? і інтонація — більше нічого не змінюється.',
  es: 'In English a question often rearranges words: "he is fast" becomes "is he fast". In Spanish the word order does not change — Eres rápido turns into ¿Eres rápido? without a single rearrangement. Only the marks ¿? and the intonation make the difference: without them ¿Eres rápido? would sound like a plain statement. The answer is simple: only the marks ¿? and the intonation create the difference between a statement and a question — nothing else changes.',
  'pt-BR': 'Em português a pergunta muda a entonação: "ele é rápido" vira "ele é rápido?". Em espanhol a ordem das palavras não muda — Eres rápido vira ¿Eres rápido? sem reorganização. A diferença vem só dos sinais ¿? e da entonação: sem eles, ¿Eres rápido? soaria como afirmação. A resposta é simples: só os sinais ¿? e a entonação criam a diferença entre afirmação e pergunta — mais nada muda.',
  vi: 'Trong tiếng Anh câu hỏi thường sắp xếp lại từ: "he is fast" thành "is he fast". Trong tiếng Tây Ban Nha trật tự từ không đổi — Eres rápido biến thành ¿Eres rápido? mà không sắp xếp lại. Chỉ dấu ¿? và ngữ điệu tạo ra khác biệt: thiếu chúng, ¿Eres rápido? sẽ nghe như câu khẳng định. Câu trả lời rất đơn giản: chỉ dấu ¿? và ngữ điệu tạo ra khác biệt giữa câu khẳng định và câu hỏi — không gì khác thay đổi.',
  id: 'Dalam bahasa Inggris pertanyaan sering menyusun ulang kata: "he is fast" menjadi "is he fast". Dalam bahasa Spanyol urutan kata tidak berubah — Eres rápido berubah menjadi ¿Eres rápido? tanpa penyusunan ulang. Hanya tanda ¿? dan intonasi yang membuat perbedaan: tanpanya, ¿Eres rápido? akan terdengar seperti pernyataan biasa. Jawabannya sederhana: hanya tanda ¿? dan intonasi yang menciptakan perbedaan antara pernyataan dan pertanyaan — tidak ada yang lain berubah.',
  tr: 'İngilizcede soru genellikle kelimeleri yeniden düzenler: "he is fast", "is he fast" olur. İspanyolcada kelime sırası değişmez — Eres rápido, ¿Eres rápido? olur, hiç yeniden düzenleme olmadan. Yalnızca ¿? işaretleri ve tonlama farkı yaratır: onlar olmadan ¿Eres rápido? sıradan bir ifade gibi duyulurdu. Cevap basittir: yalnızca ¿? işaretleri ve tonlama ifade ile soru arasındaki farkı yaratır — başka hiçbir şey değişmez.',
  pl: 'W angielskim pytanie często zmienia kolejność słów: „he is fast” staje się „is he fast”. W hiszpańskim kolejność słów się nie zmienia — Eres rápido zamienia się w ¿Eres rápido? bez żadnej zmiany kolejności. Różnicę tworzą tylko znaki ¿? i intonacja: bez nich ¿Eres rápido? brzmiałoby jak zwykłe twierdzenie. Odpowiedź jest prosta: tylko znaki ¿? i intonacja tworzą różnicę między twierdzeniem a pytaniem — nic więcej się nie zmienia.',
});

const FORMULA_BODY = L({
  ru: 'Формула проста: возьми готовое утверждение целиком и поставь ¿ перед первым словом, ? после последнего — ничего внутри фразы менять не нужно. Es fácil становится ¿Es fácil?, Eres bonito становится ¿Eres bonito? — слова и их порядок остаются ровно теми же, что и в утверждении. Ответ прост: испанский вопрос обрамляет утверждение знаками с двух сторон, а не переставляет слова внутри него. Это касается любого утверждения из уже известных слов — формула работает одинаково для всех них.',
  uk: 'Формула проста: візьми готове твердження цілком і постав ¿ перед першим словом, ? після останнього — нічого всередині фрази міняти не потрібно. Es fácil стає ¿Es fácil?, Eres bonito стає ¿Eres bonito? — слова та їхній порядок лишаються рівно тими самими, що й у твердженні. Відповідь проста: іспанське питання обрамляє твердження знаками з двох боків, а не переставляє слова всередині нього. Це стосується будь-якого твердження з уже відомих слів — формула працює однаково для всіх них.',
  es: 'The formula is simple: take the whole ready statement and put ¿ before the first word, ? after the last one — nothing inside the phrase needs to change. Es fácil becomes ¿Es fácil?, Eres bonito becomes ¿Eres bonito? — the words and their order stay exactly the same as in the statement. The answer is simple: a Spanish question frames the statement with marks on both sides, it does not rearrange the words inside it. This applies to any statement made of already known words — the formula works the same way for all of them.',
  'pt-BR': 'A fórmula é simples: pegue a afirmação inteira pronta e coloque ¿ antes da primeira palavra, ? depois da última — nada dentro da frase precisa mudar. Es fácil vira ¿Es fácil?, Eres bonito vira ¿Eres bonito? — as palavras e sua ordem ficam exatamente as mesmas da afirmação. A resposta é simples: uma pergunta em espanhol emoldura a afirmação com sinais dos dois lados, não reorganiza as palavras dentro dela. Isso vale para qualquer afirmação feita de palavras já conhecidas — a fórmula funciona do mesmo jeito para todas elas.',
  vi: 'Công thức đơn giản: lấy toàn bộ câu khẳng định có sẵn và đặt ¿ trước từ đầu tiên, ? sau từ cuối cùng — không cần đổi gì bên trong câu. Es fácil trở thành ¿Es fácil?, Eres bonito trở thành ¿Eres bonito? — các từ và trật tự của chúng vẫn y hệt như trong câu khẳng định. Câu trả lời rất đơn giản: câu hỏi tiếng Tây Ban Nha đóng khung câu khẳng định bằng dấu ở hai bên, không sắp xếp lại từ bên trong nó. Điều này áp dụng cho bất kỳ câu khẳng định nào làm từ các từ đã biết — công thức hoạt động giống nhau cho tất cả chúng.',
  id: 'Rumusnya sederhana: ambil seluruh pernyataan yang sudah jadi dan letakkan ¿ sebelum kata pertama, ? setelah kata terakhir — tidak ada yang perlu diubah di dalam frasa. Es fácil menjadi ¿Es fácil?, Eres bonito menjadi ¿Eres bonito? — kata-kata dan urutannya tetap persis sama seperti pada pernyataan. Jawabannya sederhana: pertanyaan bahasa Spanyol membingkai pernyataan dengan tanda di kedua sisi, bukan menyusun ulang kata-kata di dalamnya. Ini berlaku untuk pernyataan apa pun yang dibuat dari kata-kata yang sudah dikenal — rumusnya bekerja dengan cara yang sama untuk semuanya.',
  tr: 'Formül basittir: hazır ifadeyi bütünüyle al ve ilk kelimeden önce ¿, son kelimeden sonra ? koy — ifadenin içinde hiçbir şeyi değiştirmeye gerek yok. Es fácil, ¿Es fácil? olur, Eres bonito, ¿Eres bonito? olur — kelimeler ve sıraları ifadedekiyle tamamen aynı kalır. Cevap basittir: İspanyolca soru, ifadeyi her iki taraftan işaretlerle çerçeveler, içindeki kelimeleri yeniden düzenlemez. Bu, zaten bilinen kelimelerden oluşan herhangi bir ifade için geçerlidir — formül hepsi için aynı şekilde çalışır.',
  pl: 'Formuła jest prosta: weź całe gotowe twierdzenie i postaw ¿ przed pierwszym słowem, ? po ostatnim — nic wewnątrz frazy nie trzeba zmieniać. Es fácil staje się ¿Es fácil?, Eres bonito staje się ¿Eres bonito? — słowa i ich kolejność pozostają dokładnie takie same jak w twierdzeniu. Odpowiedź jest prosta: hiszpańskie pytanie obramowuje twierdzenie znakami z obu stron, nie zmienia kolejności słów wewnątrz niego. Dotyczy to każdego twierdzenia zbudowanego ze znanych już słów — formuła działa tak samo dla wszystkich nich.',
});

const TRAP_BODY = L({
  ru: 'Самая частая ошибка на письме — забыть открывающий ¿ и написать только Es verdad?, оставив закрывающий знак. Читающий не видит вопрос с самого начала фразы и может не подготовиться к вопросительной интонации заранее. Вторая ловушка — попытаться переставить слова местами, как в английском: ¿Verdad es? вместо ¿Es verdad? — испанский так не работает, порядок остаётся неизменным. Проверка простая: если утверждение уже верное — Es verdad, Eres bonito, Es fácil — вопрос из него получается добавлением двух знаков по краям, без единой перестановки внутри.',
  uk: 'Найчастіша помилка на письмі — забути відкривний ¿ і написати тільки Es verdad?, лишивши закривний знак. Той, хто читає, не бачить питання з самого початку фрази і може не підготуватися до питальної інтонації заздалегідь. Друга пастка — спробувати переставити слова місцями, як в англійській: ¿Verdad es? замість ¿Es verdad? — іспанська так не працює, порядок лишається незмінним. Перевірка проста: якщо твердження вже правильне — Es verdad, Eres bonito, Es fácil — питання з нього виходить додаванням двох знаків по краях, без жодної перестановки всередині.',
  es: 'The most common mistake in writing is forgetting the opening ¿ and writing only Es verdad?, leaving just the closing mark. The reader does not see the question from the very start of the phrase and may not prepare for the questioning intonation ahead of time. The second trap is trying to rearrange the words like in English: ¿Verdad es? instead of ¿Es verdad? — Spanish does not work that way, the order stays unchanged. The check is simple: if the statement is already correct — Es verdad, Eres bonito, Es fácil — the question comes from adding two marks on the edges, without a single rearrangement inside.',
  'pt-BR': 'O erro mais comum na escrita é esquecer o ¿ de abertura e escrever só Es verdad?, deixando apenas o sinal de fechamento. Quem lê não vê a pergunta desde o início da frase e pode não se preparar para a entonação de pergunta com antecedência. A segunda armadilha é tentar reorganizar as palavras como em português com inversão: ¿Verdad es? em vez de ¿Es verdad? — o espanhol não funciona assim, a ordem fica igual. A checagem é simples: se a afirmação já está correta — Es verdad, Eres bonito, Es fácil — a pergunta vem de acrescentar dois sinais nas bordas, sem nenhuma reorganização por dentro.',
  vi: 'Lỗi phổ biến nhất khi viết là quên dấu mở ¿ và chỉ viết Es verdad?, để lại mỗi dấu đóng. Người đọc không thấy câu hỏi ngay từ đầu câu và có thể không chuẩn bị trước cho ngữ điệu hỏi. Cái bẫy thứ hai là cố sắp xếp lại từ như trong tiếng Anh: ¿Verdad es? thay vì ¿Es verdad? — tiếng Tây Ban Nha không hoạt động như vậy, trật tự vẫn giữ nguyên. Cách kiểm tra đơn giản: nếu câu khẳng định đã đúng — Es verdad, Eres bonito, Es fácil — câu hỏi có được bằng cách thêm hai dấu ở hai đầu, không sắp xếp lại gì bên trong.',
  id: 'Kesalahan paling umum dalam menulis adalah lupa tanda pembuka ¿ dan hanya menulis Es verdad?, hanya menyisakan tanda penutup. Pembaca tidak melihat pertanyaan sejak awal frasa dan mungkin tidak bersiap untuk intonasi bertanya lebih awal. Jebakan kedua adalah mencoba menyusun ulang kata seperti dalam bahasa Inggris: ¿Verdad es? alih-alih ¿Es verdad? — bahasa Spanyol tidak bekerja seperti itu, urutannya tetap tidak berubah. Pengecekannya sederhana: jika pernyataannya sudah benar — Es verdad, Eres bonito, Es fácil — pertanyaan didapat dengan menambahkan dua tanda di kedua sisi, tanpa penyusunan ulang apa pun di dalamnya.',
  tr: 'Yazıda en yaygın hata, açılış ¿ işaretini unutup yalnızca Es verdad? yazmak, sadece kapanış işaretini bırakmaktır. Okuyucu soruyu ifadenin en başından itibaren görmez ve soru tonlamasına önceden hazırlanamayabilir. İkinci tuzak, İngilizcedeki gibi kelimeleri yeniden düzenlemeye çalışmaktır: ¿Es verdad? yerine ¿Verdad es? — İspanyolca böyle çalışmaz, sıra değişmeden kalır. Kontrol basittir: ifade zaten doğruysa — Es verdad, Eres bonito, Es fácil — soru, içini yeniden düzenlemeden kenarlara iki işaret eklenerek elde edilir.',
  pl: 'Najczęstszy błąd w piśmie to zapomnienie otwierającego ¿ i napisanie tylko Es verdad?, zostawiając sam znak zamykający. Czytający nie widzi pytania od samego początku frazy i może nie przygotować się wcześniej na pytającą intonację. Druga pułapka to próba zamiany kolejności słów jak w angielskim: ¿Verdad es? zamiast ¿Es verdad? — hiszpański tak nie działa, kolejność pozostaje niezmieniona. Sprawdzenie jest proste: jeśli twierdzenie jest już poprawne — Es verdad, Eres bonito, Es fácil — pytanie powstaje przez dodanie dwóch znaków na krawędziach, bez żadnej zmiany kolejności wewnątrz.',
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
      ru: R({ text: 'В английском вопрос часто переставляет слова местами: «he is fast» становится «is he fast». В испанском порядок слов не меняется — ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'explanation' }, { text: ' превращается в ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'targetCorrect' }, { text: ' без единой перестановки. Разницу делают только знаки ¿? и интонация: без них ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'targetCorrect' }, { text: ' прозвучит как обычное утверждение. Ответ прост: разницу между утверждением и вопросом создают только знаки ¿? и интонация — больше ничего не меняется.', semantic: 'explanation' }),
      uk: R({ text: 'В англійській питання часто переставляє слова місцями: «he is fast» стає «is he fast». В іспанській порядок слів не змінюється — ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'explanation' }, { text: ' перетворюється на ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'targetCorrect' }, { text: ' без жодної перестановки. Різницю роблять лише знаки ¿? та інтонація: без них ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'targetCorrect' }, { text: ' прозвучить як звичайне твердження. Відповідь проста: різницю між твердженням і питанням створюють тільки знаки ¿? і інтонація — більше нічого не змінюється.', semantic: 'explanation' }),
      es: R({ text: 'In English a question often rearranges words: "he is fast" becomes "is he fast". In Spanish the word order does not change — ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'explanation' }, { text: ' turns into ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'targetCorrect' }, { text: ' without a single rearrangement. Only the marks ¿? and the intonation make the difference: without them ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'targetCorrect' }, { text: ' would sound like a plain statement. The answer is simple: only the marks ¿? and the intonation create the difference between a statement and a question — nothing else changes.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Em português a pergunta muda a entonação: "ele é rápido" vira "ele é rápido?". Em espanhol a ordem das palavras não muda — ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'explanation' }, { text: ' vira ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'targetCorrect' }, { text: ' sem reorganização. A diferença vem só dos sinais ¿? e da entonação: sem eles, ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'targetCorrect' }, { text: ' soaria como afirmação. A resposta é simples: só os sinais ¿? e a entonação criam a diferença entre afirmação e pergunta — mais nada muda.', semantic: 'explanation' }),
      vi: R({ text: 'Trong tiếng Anh câu hỏi thường sắp xếp lại từ: "he is fast" thành "is he fast". Trong tiếng Tây Ban Nha trật tự từ không đổi — ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'explanation' }, { text: ' biến thành ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'targetCorrect' }, { text: ' mà không sắp xếp lại. Chỉ dấu ¿? và ngữ điệu tạo ra khác biệt: thiếu chúng, ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'targetCorrect' }, { text: ' sẽ nghe như câu khẳng định. Câu trả lời rất đơn giản: chỉ dấu ¿? và ngữ điệu tạo ra khác biệt giữa câu khẳng định và câu hỏi — không gì khác thay đổi.', semantic: 'explanation' }),
      id: R({ text: 'Dalam bahasa Inggris pertanyaan sering menyusun ulang kata: "he is fast" menjadi "is he fast". Dalam bahasa Spanyol urutan kata tidak berubah — ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'explanation' }, { text: ' berubah menjadi ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'targetCorrect' }, { text: ' tanpa penyusunan ulang. Hanya tanda ¿? dan intonasi yang membuat perbedaan: tanpanya, ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'targetCorrect' }, { text: ' akan terdengar seperti pernyataan biasa. Jawabannya sederhana: hanya tanda ¿? dan intonasi yang menciptakan perbedaan antara pernyataan dan pertanyaan — tidak ada yang lain berubah.', semantic: 'explanation' }),
      tr: R({ text: 'İngilizcede soru genellikle kelimeleri yeniden düzenler: "he is fast", "is he fast" olur. İspanyolcada kelime sırası değişmez — ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'explanation' }, { text: ', ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'targetCorrect' }, { text: ' olur, hiç yeniden düzenleme olmadan. Yalnızca ¿? işaretleri ve tonlama farkı yaratır: onlar olmadan ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'targetCorrect' }, { text: ' sıradan bir ifade gibi duyulurdu. Cevap basittir: yalnızca ¿? işaretleri ve tonlama ifade ile soru arasındaki farkı yaratır — başka hiçbir şey değişmez.', semantic: 'explanation' }),
      pl: R({ text: 'W angielskim pytanie często zmienia kolejność słów: „he is fast” staje się „is he fast”. W hiszpańskim kolejność słów się nie zmienia — ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'explanation' }, { text: ' zamienia się w ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'targetCorrect' }, { text: ' bez żadnej zmiany kolejności. Różnicę tworzą tylko znaki ¿? i intonacja: bez nich ', semantic: 'explanation' }, { text: '¿Eres rápido?', semantic: 'targetCorrect' }, { text: ' brzmiałoby jak zwykłe twierdzenie. Odpowiedź jest prosta: tylko znaki ¿? i intonacja tworzą różnicę między twierdzeniem a pytaniem — nic więcej się nie zmienia.', semantic: 'explanation' }),
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
        ru: 'Верно только знаки ¿? и интонация — порядок слов остаётся тем же самым, что и в утверждении, никакой перестановки не происходит.',
        uk: 'Правильно тільки знаки ¿? і інтонація — порядок слів лишається тим самим, що й у твердженні, жодної перестановки не відбувається.',
        es: 'Only the marks ¿? and the intonation are correct — the word order stays exactly the same as in the statement, no rearrangement happens.',
        'pt-BR': 'Só os sinais ¿? e a entonação estão corretos — a ordem das palavras fica exatamente igual à da afirmação, nenhuma reorganização acontece.',
        vi: 'Chỉ dấu ¿? và ngữ điệu là đúng — trật tự từ vẫn giữ nguyên y hệt câu khẳng định, không có sự sắp xếp lại nào xảy ra.',
        id: 'Hanya tanda ¿? dan intonasi yang benar — urutan kata tetap persis sama seperti pernyataan, tidak ada penyusunan ulang yang terjadi.',
        tr: 'Yalnızca ¿? işaretleri ve tonlama doğrudur — kelime sırası ifadedekiyle tamamen aynı kalır, hiçbir yeniden düzenleme olmaz.',
        pl: 'Poprawne są tylko znaki ¿? i intonacja — kolejność słów pozostaje dokładnie taka sama jak w twierdzeniu, nie zachodzi żadna zmiana kolejności.',
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
      ru: R({ text: 'Формула проста: возьми готовое утверждение целиком и поставь ¿ перед первым словом, ? после последнего — ничего внутри фразы менять не нужно. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'explanation' }, { text: ' становится ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'explanation' }, { text: ' становится ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' — слова и их порядок остаются ровно теми же, что и в утверждении. Ответ прост: испанский вопрос обрамляет утверждение знаками с двух сторон, а не переставляет слова внутри него. Это касается любого утверждения из уже известных слов — формула работает одинаково для всех них.', semantic: 'explanation' }),
      uk: R({ text: 'Формула проста: візьми готове твердження цілком і постав ¿ перед першим словом, ? після останнього — нічого всередині фрази міняти не потрібно. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'explanation' }, { text: ' стає ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'explanation' }, { text: ' стає ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' — слова та їхній порядок лишаються рівно тими самими, що й у твердженні. Відповідь проста: іспанське питання обрамляє твердження знаками з двох боків, а не переставляє слова всередині нього. Це стосується будь-якого твердження з уже відомих слів — формула працює однаково для всіх них.', semantic: 'explanation' }),
      es: R({ text: 'The formula is simple: take the whole ready statement and put ¿ before the first word, ? after the last one — nothing inside the phrase needs to change. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'explanation' }, { text: ' becomes ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'explanation' }, { text: ' becomes ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' — the words and their order stay exactly the same as in the statement. The answer is simple: a Spanish question frames the statement with marks on both sides, it does not rearrange the words inside it. This applies to any statement made of already known words — the formula works the same way for all of them.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é simples: pegue a afirmação inteira pronta e coloque ¿ antes da primeira palavra, ? depois da última — nada dentro da frase precisa mudar. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'explanation' }, { text: ' vira ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'explanation' }, { text: ' vira ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' — as palavras e sua ordem ficam exatamente as mesmas da afirmação. A resposta é simples: uma pergunta em espanhol emoldura a afirmação com sinais dos dois lados, não reorganiza as palavras dentro dela. Isso vale para qualquer afirmação feita de palavras já conhecidas — a fórmula funciona do mesmo jeito para todas elas.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức đơn giản: lấy toàn bộ câu khẳng định có sẵn và đặt ¿ trước từ đầu tiên, ? sau từ cuối cùng — không cần đổi gì bên trong câu. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'explanation' }, { text: ' trở thành ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'explanation' }, { text: ' trở thành ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' — các từ và trật tự của chúng vẫn y hệt như trong câu khẳng định. Câu trả lời rất đơn giản: câu hỏi tiếng Tây Ban Nha đóng khung câu khẳng định bằng dấu ở hai bên, không sắp xếp lại từ bên trong nó. Điều này áp dụng cho bất kỳ câu khẳng định nào làm từ các từ đã biết — công thức hoạt động giống nhau cho tất cả chúng.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sederhana: ambil seluruh pernyataan yang sudah jadi dan letakkan ¿ sebelum kata pertama, ? setelah kata terakhir — tidak ada yang perlu diubah di dalam frasa. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'explanation' }, { text: ' menjadi ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'explanation' }, { text: ' menjadi ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' — kata-kata dan urutannya tetap persis sama seperti pada pernyataan. Jawabannya sederhana: pertanyaan bahasa Spanyol membingkai pernyataan dengan tanda di kedua sisi, bukan menyusun ulang kata-kata di dalamnya. Ini berlaku untuk pernyataan apa pun yang dibuat dari kata-kata yang sudah dikenal — rumusnya bekerja dengan cara yang sama untuk semuanya.', semantic: 'explanation' }),
      tr: R({ text: 'Formül basittir: hazır ifadeyi bütünüyle al ve ilk kelimeden önce ¿, son kelimeden sonra ? koy — ifadenin içinde hiçbir şeyi değiştirmeye gerek yok. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'explanation' }, { text: ', ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' olur, ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'explanation' }, { text: ', ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' olur — kelimeler ve sıraları ifadedekiyle tamamen aynı kalır. Cevap basittir: İspanyolca soru, ifadeyi her iki taraftan işaretlerle çerçeveler, içindeki kelimeleri yeniden düzenlemez. Bu, zaten bilinen kelimelerden oluşan herhangi bir ifade için geçerlidir — formül hepsi için aynı şekilde çalışır.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest prosta: weź całe gotowe twierdzenie i postaw ¿ przed pierwszym słowem, ? po ostatnim — nic wewnątrz frazy nie trzeba zmieniać. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'explanation' }, { text: ' staje się ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'explanation' }, { text: ' staje się ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' — słowa i ich kolejność pozostają dokładnie takie same jak w twierdzeniu. Odpowiedź jest prosta: hiszpańskie pytanie obramowuje twierdzenie znakami z obu stron, nie zmienia kolejności słów wewnątrz niego. Dotyczy to każdego twierdzenia zbudowanego ze znanych już słów — formuła działa tak samo dla wszystkich nich.', semantic: 'explanation' }),
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
        ru: '¿Es fácil? верно, потому что вопрос — это то же утверждение с ¿ спереди и ? сзади, без перестановки слов и без лишних добавок вроде «sí».',
        uk: '¿Es fácil? правильно, бо питання — це те саме твердження з ¿ спереду і ? ззаду, без перестановки слів і без зайвих додатків на кшталт «sí».',
        es: '¿Es fácil? is correct because a question is the same statement with ¿ in front and ? behind, without rearranging words and without extra additions like "sí".',
        'pt-BR': '¿Es fácil? está correto porque a pergunta é a mesma afirmação com ¿ na frente e ? atrás, sem reorganizar palavras e sem acréscimos extras como "sí".',
        vi: '¿Es fácil? đúng vì câu hỏi chính là câu khẳng định đó với ¿ ở trước và ? ở sau, không sắp xếp lại từ và không thêm thắt như "sí".',
        id: '¿Es fácil? benar karena pertanyaan adalah pernyataan yang sama dengan ¿ di depan dan ? di belakang, tanpa menyusun ulang kata dan tanpa tambahan seperti "sí".',
        tr: '¿Es fácil? doğrudur çünkü soru, önünde ¿ ve arkasında ? olan aynı ifadedir, kelimeleri yeniden düzenlemeden ve "sí" gibi ekstra eklemeler olmadan.',
        pl: '¿Es fácil? jest poprawne, ponieważ pytanie to to samo twierdzenie z ¿ z przodu i ? z tyłu, bez zmiany kolejności słów i bez dodatków typu „sí”.',
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
      ru: R({ text: 'Самая частая ошибка на письме — забыть открывающий ¿ и написать только ', semantic: 'explanation' }, { text: 'Es verdad?', semantic: 'targetWrong' }, { text: ', оставив закрывающий знак. Читающий не видит вопрос с самого начала фразы и может не подготовиться к вопросительной интонации заранее. Вторая ловушка — попытаться переставить слова местами, как в английском: ', semantic: 'explanation' }, { text: '¿Verdad es?', semantic: 'targetWrong' }, { text: ' вместо ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: ' — испанский так не работает, порядок остаётся неизменным. Проверка простая: если утверждение уже верное — Es verdad, Eres bonito, Es fácil — вопрос из него получается добавлением двух знаков по краям, без единой перестановки внутри.', semantic: 'explanation' }),
      uk: R({ text: 'Найчастіша помилка на письмі — забути відкривний ¿ і написати тільки ', semantic: 'explanation' }, { text: 'Es verdad?', semantic: 'targetWrong' }, { text: ', лишивши закривний знак. Той, хто читає, не бачить питання з самого початку фрази і може не підготуватися до питальної інтонації заздалегідь. Друга пастка — спробувати переставити слова місцями, як в англійській: ', semantic: 'explanation' }, { text: '¿Verdad es?', semantic: 'targetWrong' }, { text: ' замість ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: ' — іспанська так не працює, порядок лишається незмінним. Перевірка проста: якщо твердження вже правильне — Es verdad, Eres bonito, Es fácil — питання з нього виходить додаванням двох знаків по краях, без жодної перестановки всередині.', semantic: 'explanation' }),
      es: R({ text: 'The most common mistake in writing is forgetting the opening ¿ and writing only ', semantic: 'explanation' }, { text: 'Es verdad?', semantic: 'targetWrong' }, { text: ', leaving just the closing mark. The reader does not see the question from the very start of the phrase and may not prepare for the questioning intonation ahead of time. The second trap is trying to rearrange the words like in English: ', semantic: 'explanation' }, { text: '¿Verdad es?', semantic: 'targetWrong' }, { text: ' instead of ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: ' — Spanish does not work that way, the order stays unchanged. The check is simple: if the statement is already correct — Es verdad, Eres bonito, Es fácil — the question comes from adding two marks on the edges, without a single rearrangement inside.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'O erro mais comum na escrita é esquecer o ¿ de abertura e escrever só ', semantic: 'explanation' }, { text: 'Es verdad?', semantic: 'targetWrong' }, { text: ', deixando apenas o sinal de fechamento. Quem lê não vê a pergunta desde o início da frase e pode não se preparar para a entonação de pergunta com antecedência. A segunda armadilha é tentar reorganizar as palavras como em português com inversão: ', semantic: 'explanation' }, { text: '¿Verdad es?', semantic: 'targetWrong' }, { text: ' em vez de ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: ' — o espanhol não funciona assim, a ordem fica igual. A checagem é simples: se a afirmação já está correta — Es verdad, Eres bonito, Es fácil — a pergunta vem de acrescentar dois sinais nas bordas, sem nenhuma reorganização por dentro.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi phổ biến nhất khi viết là quên dấu mở ¿ và chỉ viết ', semantic: 'explanation' }, { text: 'Es verdad?', semantic: 'targetWrong' }, { text: ', để lại mỗi dấu đóng. Người đọc không thấy câu hỏi ngay từ đầu câu và có thể không chuẩn bị trước cho ngữ điệu hỏi. Cái bẫy thứ hai là cố sắp xếp lại từ như trong tiếng Anh: ', semantic: 'explanation' }, { text: '¿Verdad es?', semantic: 'targetWrong' }, { text: ' thay vì ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: ' — tiếng Tây Ban Nha không hoạt động như vậy, trật tự vẫn giữ nguyên. Cách kiểm tra đơn giản: nếu câu khẳng định đã đúng — Es verdad, Eres bonito, Es fácil — câu hỏi có được bằng cách thêm hai dấu ở hai đầu, không sắp xếp lại gì bên trong.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan paling umum dalam menulis adalah lupa tanda pembuka ¿ dan hanya menulis ', semantic: 'explanation' }, { text: 'Es verdad?', semantic: 'targetWrong' }, { text: ', hanya menyisakan tanda penutup. Pembaca tidak melihat pertanyaan sejak awal frasa dan mungkin tidak bersiap untuk intonasi bertanya lebih awal. Jebakan kedua adalah mencoba menyusun ulang kata seperti dalam bahasa Inggris: ', semantic: 'explanation' }, { text: '¿Verdad es?', semantic: 'targetWrong' }, { text: ' alih-alih ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: ' — bahasa Spanyol tidak bekerja seperti itu, urutannya tetap tidak berubah. Pengecekannya sederhana: jika pernyataannya sudah benar — Es verdad, Eres bonito, Es fácil — pertanyaan didapat dengan menambahkan dua tanda di kedua sisi, tanpa penyusunan ulang apa pun di dalamnya.', semantic: 'explanation' }),
      tr: R({ text: 'Yazıda en yaygın hata, açılış ¿ işaretini unutup yalnızca ', semantic: 'explanation' }, { text: 'Es verdad?', semantic: 'targetWrong' }, { text: ' yazmak, sadece kapanış işaretini bırakmaktır. Okuyucu soruyu ifadenin en başından itibaren görmez ve soru tonlamasına önceden hazırlanamayabilir. İkinci tuzak, İngilizcedeki gibi kelimeleri yeniden düzenlemeye çalışmaktır: ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: ' yerine ', semantic: 'explanation' }, { text: '¿Verdad es?', semantic: 'targetWrong' }, { text: ' — İspanyolca böyle çalışmaz, sıra değişmeden kalır. Kontrol basittir: ifade zaten doğruysa — Es verdad, Eres bonito, Es fácil — soru, içini yeniden düzenlemeden kenarlara iki işaret eklenerek elde edilir.', semantic: 'explanation' }),
      pl: R({ text: 'Najczęstszy błąd w piśmie to zapomnienie otwierającego ¿ i napisanie tylko ', semantic: 'explanation' }, { text: 'Es verdad?', semantic: 'targetWrong' }, { text: ', zostawiając sam znak zamykający. Czytający nie widzi pytania od samego początku frazy i może nie przygotować się wcześniej na pytającą intonację. Druga pułapka to próba zamiany kolejności słów jak w angielskim: ', semantic: 'explanation' }, { text: '¿Verdad es?', semantic: 'targetWrong' }, { text: ' zamiast ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: ' — hiszpański tak nie działa, kolejność pozostaje niezmieniona. Sprawdzenie jest proste: jeśli twierdzenie jest już poprawne — Es verdad, Eres bonito, Es fácil — pytanie powstaje przez dodanie dwóch znaków na krawędziach, bez żadnej zmiany kolejności wewnątrz.', semantic: 'explanation' }),
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
        ru: '¿Es verdad? верно, потому что порядок слов не меняется и присутствуют оба знака — открывающий ¿ и закрывающий ?.',
        uk: '¿Es verdad? правильно, бо порядок слів не змінюється і присутні обидва знаки — відкривний ¿ і закривний ?.',
        es: '¿Es verdad? is correct because the word order does not change and both marks are present — the opening ¿ and the closing ?.',
        'pt-BR': '¿Es verdad? está correto porque a ordem das palavras não muda e ambos os sinais estão presentes — o de abertura ¿ e o de fechamento ?.',
        vi: '¿Es verdad? đúng vì trật tự từ không đổi và có cả hai dấu — dấu mở ¿ và dấu đóng ?.',
        id: '¿Es verdad? benar karena urutan kata tidak berubah dan kedua tanda hadir — tanda pembuka ¿ dan tanda penutup ?.',
        tr: '¿Es verdad? doğrudur çünkü kelime sırası değişmez ve her iki işaret de mevcuttur — açılış ¿ ve kapanış ?.',
        pl: '¿Es verdad? jest poprawne, ponieważ kolejność słów się nie zmienia i obecne są oba znaki — otwierający ¿ i zamykający ?.',
      }),
    },
  },
];
