import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 15 "Скажи вслух: спроси меня" / kind: 'voice', builtOn: [10,12,14],
// recalls: [9,10,14]): интро НЕ упоминает "сессию/урок/главу/курс/экран/
// карточку" ни в каком контексте (intro_meta_narration), по образцу сессии 7
// (es_episode_01_session_07_intro_v1.ts) — говорит напрямую про звук
// произносимого вопроса, а не про структуру курса.
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
  ru: 'Письменный вопрос узнают по знакам ¿...?, но произнесённый вслух узнают по звуку. Eres bonito при утверждении звучит ровно, а ¿Eres bonito? — с подъёмом голоса к концу фразы, будто мелодия идёт вверх. Сначала звучит образец вопроса целиком, с этим самым подъёмом, и только затем его нужно повторить своим голосом. Слова при этом остаются теми же самыми — меняется только мелодия голоса, а не порядок слов и не сами слова.',
  uk: 'Письмове питання впізнають за знаками ¿...?, але вимовлене вголос впізнають за звуком. Eres bonito при твердженні звучить рівно, а ¿Eres bonito? — з підйомом голосу до кінця фрази, ніби мелодія йде вгору. Спершу звучить зразок питання цілком, із цим самим підйомом, і лише потім його потрібно повторити власним голосом. Слова при цьому лишаються тими самими — змінюється лише мелодія голосу, а не порядок слів і не самі слова.',
  es: 'A written question is recognized by the marks ¿...?, but one spoken aloud is recognized by its sound. Eres bonito as a statement sounds level, while ¿Eres bonito? rises in pitch toward the end of the phrase, as if the melody climbs upward. The model of the question sounds first in full, with that same rise, and only then does it need to be repeated with one\'s own voice. The words themselves stay exactly the same — only the melody of the voice changes, not the word order and not the words themselves.',
  'pt-BR': 'Uma pergunta escrita é reconhecida pelos sinais ¿...?, mas uma dita em voz alta é reconhecida pelo som. Eres bonito como afirmação soa nivelado, enquanto ¿Eres bonito? sobe de tom em direção ao fim da frase, como se a melodia subisse. O modelo da pergunta soa primeiro por inteiro, com essa mesma subida, e só depois precisa ser repetido com a própria voz. As palavras em si permanecem exatamente as mesmas — muda apenas a melodia da voz, não a ordem das palavras nem as palavras em si.',
  vi: 'Một câu hỏi viết được nhận ra qua dấu ¿...?, nhưng khi nói to lên thì được nhận ra qua âm thanh. Eres bonito khi là câu khẳng định nghe đều đều, còn ¿Eres bonito? lại lên cao về cuối câu, như thể giai điệu đang đi lên. Mẫu câu hỏi vang lên trọn vẹn trước, với sự lên cao đó, và chỉ sau đó mới cần lặp lại bằng chính giọng nói của mình. Bản thân các từ vẫn giữ nguyên — chỉ giai điệu của giọng nói thay đổi, không phải trật tự từ hay bản thân các từ.',
  id: 'Pertanyaan tertulis dikenali dari tanda ¿...?, tetapi yang diucapkan dengan keras dikenali dari bunyinya. Eres bonito sebagai pernyataan terdengar datar, sedangkan ¿Eres bonito? naik nadanya menuju akhir frasa, seolah melodinya naik. Contoh pertanyaan terdengar utuh terlebih dahulu, dengan kenaikan nada yang sama itu, dan baru setelah itu perlu diulangi dengan suara sendiri. Kata-katanya sendiri tetap persis sama — yang berubah hanya melodi suara, bukan urutan kata maupun kata-katanya sendiri.',
  tr: 'Yazılı bir soru ¿...? işaretlerinden tanınır, ama yüksek sesle söylenen bir soru sesinden tanınır. Eres bonito bir ifade olarak düz duyulur, ¿Eres bonito? ise cümlenin sonuna doğru perdesi yükselir, sanki ezgi yukarı çıkıyormuş gibi. Sorunun örneği önce baştan sona, o aynı yükselişle duyulur, ancak sonrasında kendi sesiyle tekrarlanması gerekir. Kelimelerin kendisi tamamen aynı kalır — yalnızca sesin ezgisi değişir, kelime sırası ya da kelimelerin kendisi değil.',
  pl: 'Pytanie pisemne rozpoznaje się po znakach ¿...?, ale wypowiedziane na głos rozpoznaje się po brzmieniu. Eres bonito jako twierdzenie brzmi równo, a ¿Eres bonito? wznosi się w tonie ku końcowi zdania, jakby melodia szła w górę. Najpierw brzmi cały wzór pytania, z tym samym wzniesieniem, a dopiero potem trzeba go powtórzyć własnym głosem. Same słowa pozostają dokładnie takie same — zmienia się tylko melodia głosu, nie kolejność słów ani same słowa.',
});

const FORMULA_BODY = L({
  ru: 'Формула проста: сначала звучит образец вопроса с подъёмом голоса к концу, затем голос повторяет его целиком с той же мелодией. ¿Es fácil? поднимается на fácil — именно там голос идёт вверх, а не на es. ¿Eres segura? поднимается на segura. Слово, на которое падает подъём, — обычно последнее слово фразы, признак или связка в конце. Точность здесь измеряется на слух: поднимается ли голос к концу фразы так же, как в образце, а не то, поставлен ли знак ¿...? на письме.',
  uk: 'Формула проста: спершу звучить зразок питання з підйомом голосу до кінця, потім голос повторює його цілком із тією ж мелодією. ¿Es fácil? підіймається на fácil — саме там голос іде вгору, а не на es. ¿Eres segura? підіймається на segura. Слово, на яке припадає підйом, — зазвичай останнє слово фрази, ознака чи зв’язка в кінці. Точність тут вимірюється на слух: чи піднімається голос до кінця фрази так само, як у зразку, а не чи поставлено знак ¿...? на письмі.',
  es: 'The formula is simple: first the model of the question sounds with the pitch rising toward the end, then the voice repeats it whole with the same melody. ¿Es fácil? rises on fácil — that is exactly where the voice climbs, not on es. ¿Eres segura? rises on segura. The word that carries the rise is usually the last word of the phrase, the quality or the linking word at the end. Accuracy here is measured by ear: whether the voice rises toward the end of the phrase the same way as in the model, not whether the mark ¿...? was placed in writing.',
  'pt-BR': 'A fórmula é simples: primeiro o modelo da pergunta soa com o tom subindo em direção ao fim, depois a voz o repete inteiro com a mesma melodia. ¿Es fácil? sobe em fácil — é exatamente aí que a voz sobe, não em es. ¿Eres segura? sobe em segura. A palavra que carrega a subida costuma ser a última palavra da frase, a qualidade ou a ligação no final. A precisão aqui é medida pelo ouvido: se a voz sobe em direção ao fim da frase da mesma forma que no modelo, não se o sinal ¿...? foi colocado por escrito.',
  vi: 'Công thức rất đơn giản: đầu tiên mẫu câu hỏi vang lên với cao độ lên dần về cuối, sau đó giọng nói lặp lại trọn vẹn với cùng giai điệu đó. ¿Es fácil? lên cao ở fácil — đó chính xác là nơi giọng nói đi lên, không phải ở es. ¿Eres segura? lên cao ở segura. Từ mang sự lên cao đó thường là từ cuối cùng của câu, đặc điểm hoặc từ nối ở cuối. Độ chính xác ở đây được đo bằng tai: giọng nói có lên cao về cuối câu giống như trong mẫu hay không, chứ không phải dấu ¿...? có được đặt khi viết hay không.',
  id: 'Rumusnya sederhana: pertama contoh pertanyaan terdengar dengan nada naik menuju akhir, kemudian suara mengulanginya secara utuh dengan melodi yang sama. ¿Es fácil? naik pada fácil — di situlah persisnya suara naik, bukan pada es. ¿Eres segura? naik pada segura. Kata yang membawa kenaikan itu biasanya kata terakhir dari frasa, sifat atau kata penghubung di akhir. Akurasi di sini diukur dengan telinga: apakah suara naik menuju akhir frasa dengan cara yang sama seperti pada contoh, bukan apakah tanda ¿...? diletakkan secara tertulis.',
  tr: 'Formül basittir: önce sorunun örneği sona doğru yükselen perdeyle duyulur, ardından ses onu aynı ezgiyle bütün olarak tekrarlar. ¿Es fácil? fácil üzerinde yükselir — sesin tam olarak yükseldiği yer orasıdır, es değil. ¿Eres segura? segura üzerinde yükselir. Yükselişi taşıyan kelime genellikle cümlenin son kelimesidir, sondaki nitelik ya da bağlaç. Buradaki doğruluk kulakla ölçülür: sesin cümlenin sonuna doğru örnekteki gibi yükselip yükselmediği, ¿...? işaretinin yazıya konup konmadığı değil.',
  pl: 'Formuła jest prosta: najpierw brzmi wzór pytania z tonem wznoszącym się ku końcowi, potem głos powtarza go w całości z tą samą melodią. ¿Es fácil? wznosi się na fácil — właśnie tam głos idzie w górę, nie na es. ¿Eres segura? wznosi się na segura. Słowo niosące wzniesienie to zwykle ostatnie słowo zdania, cecha lub łącznik na końcu. Dokładność mierzy się tu na słuch: czy głos wznosi się ku końcowi zdania tak samo jak we wzorze, a nie czy znak ¿...? postawiono na piśmie.',
});

const TRAP_BODY = L({
  ru: 'Легко подумать, что раз слова знакомы, вопрос скажется сам собой правильно, — но ровный голос без подъёма превращает вопрос обратно в утверждение на слух, даже если на письме стоят знаки ¿...?. Самая опасная ошибка — задать ¿No eres de acuerdo? тем же ровным тоном, что и обычное отрицание: тогда собеседник услышит спор, а не вопрос. Есть и обратная ошибка — поднимать голос слишком рано, на первом слове, а не на последнем. Проверка простая: подъём слышен ближе к концу фразы, на признаке или связке, а не в её начале.',
  uk: 'Легко подумати, що раз слова знайомі, питання скажеться саме собою правильно, — але рівний голос без підйому перетворює питання назад на твердження на слух, навіть якщо на письмі стоять знаки ¿...?. Найнебезпечніша помилка — поставити ¿No eres de acuerdo? тим самим рівним тоном, що й звичайне заперечення: тоді співрозмовник почує суперечку, а не питання. Є й зворотна помилка — піднімати голос надто рано, на першому слові, а не на останньому. Перевірка проста: підйом чутний ближче до кінця фрази, на ознаці чи зв’язці, а не на її початку.',
  es: 'It is easy to think that since the words are familiar, the question will come out right by itself — but a level voice without a rise turns the question back into a statement to the ear, even if the marks ¿...? are there in writing. The most dangerous mistake is to ask ¿No eres de acuerdo? with that same level tone as a plain negation: then the listener hears an argument, not a question. There is also the opposite mistake — raising the voice too early, on the first word rather than the last. The check is simple: the rise is heard closer to the end of the phrase, on the quality or the linking word, not at its start.',
  'pt-BR': 'É fácil pensar que, como as palavras são conhecidas, a pergunta vai sair certa sozinha — mas uma voz nivelada sem subida transforma a pergunta de volta numa afirmação ao ouvido, mesmo que os sinais ¿...? estejam ali por escrito. O erro mais perigoso é fazer ¿No eres de acuerdo? com o mesmo tom nivelado de uma negação comum: aí o interlocutor ouve uma discussão, não uma pergunta. Há também o erro oposto — subir a voz cedo demais, na primeira palavra em vez da última. A checagem é simples: a subida se ouve mais perto do fim da frase, na qualidade ou na ligação, não no seu início.',
  vi: 'Dễ nghĩ rằng vì các từ đã quen thuộc, câu hỏi sẽ tự nhiên nói đúng — nhưng giọng đều đều không lên cao sẽ biến câu hỏi trở lại thành câu khẳng định khi nghe, ngay cả khi dấu ¿...? có trên chữ viết. Sai lầm nguy hiểm nhất là hỏi ¿No eres de acuerdo? bằng cùng giọng điệu đều đều như một câu phủ định thông thường: khi đó người nghe sẽ nghe thấy một cuộc tranh cãi, không phải một câu hỏi. Cũng có sai lầm ngược lại — lên giọng quá sớm, ở từ đầu tiên thay vì từ cuối. Cách kiểm tra đơn giản: sự lên cao được nghe gần cuối câu hơn, ở đặc điểm hay từ nối, không phải ở đầu câu.',
  id: 'Mudah untuk berpikir bahwa karena kata-katanya sudah dikenal, pertanyaan akan terucap benar dengan sendirinya — tetapi suara datar tanpa kenaikan mengubah pertanyaan kembali menjadi pernyataan di telinga, meskipun tanda ¿...? ada secara tertulis. Kesalahan paling berbahaya adalah menanyakan ¿No eres de acuerdo? dengan nada datar yang sama seperti negasi biasa: maka pendengar akan mendengar perdebatan, bukan pertanyaan. Ada juga kesalahan sebaliknya — menaikkan suara terlalu dini, pada kata pertama alih-alih kata terakhir. Pengecekannya sederhana: kenaikan terdengar lebih dekat ke akhir frasa, pada sifat atau kata penghubung, bukan di awalnya.',
  tr: 'Kelimeler tanıdık olduğu için sorunun kendiliğinden doğru çıkacağını düşünmek kolaydır — ama yükselişsiz düz bir ses, yazıda ¿...? işaretleri olsa bile soruyu kulakta yeniden bir ifadeye dönüştürür. En tehlikeli hata, ¿No eres de acuerdo? sorusunu sıradan bir olumsuzlamayla aynı düz tonda sormaktır: o zaman dinleyici bir soru değil, bir tartışma duyar. Bunun tersi bir hata da vardır — sesi çok erken, son kelimede değil ilk kelimede yükseltmek. Kontrol basittir: yükseliş, cümlenin sonuna daha yakın, nitelikte ya da bağlaçta duyulur, başında değil.',
  pl: 'Łatwo pomyśleć, że skoro słowa są znajome, pytanie samo wyjdzie poprawnie — ale równy głos bez wzniesienia zamienia pytanie z powrotem w twierdzenie dla ucha, nawet jeśli na piśmie stoją znaki ¿...?. Najniebezpieczniejszym błędem jest zadanie ¿No eres de acuerdo? tym samym równym tonem co zwykłe przeczenie: wtedy rozmówca usłyszy kłótnię, a nie pytanie. Jest też błąd odwrotny — podniesienie głosu zbyt wcześnie, na pierwszym słowie zamiast na ostatnim. Sprawdzenie jest proste: wzniesienie słychać bliżej końca zdania, na cesze lub łączniku, a nie na jego początku.',
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
      ru: R({ text: 'Письменный вопрос узнают по знакам ¿...?, но произнесённый вслух узнают по звуку. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' при утверждении звучит ровно, а ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' — с подъёмом голоса к концу фразы, будто мелодия идёт вверх. Сначала звучит образец вопроса целиком, с этим самым подъёмом, и только затем его нужно повторить своим голосом. Слова при этом остаются теми же самыми — меняется только мелодия голоса, а не порядок слов и не сами слова.', semantic: 'explanation' }),
      uk: R({ text: 'Письмове питання впізнають за знаками ¿...?, але вимовлене вголос впізнають за звуком. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' при твердженні звучить рівно, а ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' — з підйомом голосу до кінця фрази, ніби мелодія йде вгору. Спершу звучить зразок питання цілком, із цим самим підйомом, і лише потім його потрібно повторити власним голосом. Слова при цьому лишаються тими самими — змінюється лише мелодія голосу, а не порядок слів і не самі слова.', semantic: 'explanation' }),
      es: R({ text: 'A written question is recognized by the marks ¿...?, but one spoken aloud is recognized by its sound. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' as a statement sounds level, while ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' rises in pitch toward the end of the phrase, as if the melody climbs upward. The model of the question sounds first in full, with that same rise, and only then does it need to be repeated with one\'s own voice. The words themselves stay exactly the same — only the melody of the voice changes, not the word order and not the words themselves.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Uma pergunta escrita é reconhecida pelos sinais ¿...?, mas uma dita em voz alta é reconhecida pelo som. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' como afirmação soa nivelado, enquanto ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' sobe de tom em direção ao fim da frase, como se a melodia subisse. O modelo da pergunta soa primeiro por inteiro, com essa mesma subida, e só depois precisa ser repetido com a própria voz. As palavras em si permanecem exatamente as mesmas — muda apenas a melodia da voz, não a ordem das palavras nem as palavras em si.', semantic: 'explanation' }),
      vi: R({ text: 'Một câu hỏi viết được nhận ra qua dấu ¿...?, nhưng khi nói to lên thì được nhận ra qua âm thanh. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' khi là câu khẳng định nghe đều đều, còn ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' lại lên cao về cuối câu, như thể giai điệu đang đi lên. Mẫu câu hỏi vang lên trọn vẹn trước, với sự lên cao đó, và chỉ sau đó mới cần lặp lại bằng chính giọng nói của mình. Bản thân các từ vẫn giữ nguyên — chỉ giai điệu của giọng nói thay đổi, không phải trật tự từ hay bản thân các từ.', semantic: 'explanation' }),
      id: R({ text: 'Pertanyaan tertulis dikenali dari tanda ¿...?, tetapi yang diucapkan dengan keras dikenali dari bunyinya. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' sebagai pernyataan terdengar datar, sedangkan ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' naik nadanya menuju akhir frasa, seolah melodinya naik. Contoh pertanyaan terdengar utuh terlebih dahulu, dengan kenaikan nada yang sama itu, dan baru setelah itu perlu diulangi dengan suara sendiri. Kata-katanya sendiri tetap persis sama — yang berubah hanya melodi suara, bukan urutan kata maupun kata-katanya sendiri.', semantic: 'explanation' }),
      tr: R({ text: 'Yazılı bir soru ¿...? işaretlerinden tanınır, ama yüksek sesle söylenen bir soru sesinden tanınır. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' bir ifade olarak düz duyulur, ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' ise cümlenin sonuna doğru perdesi yükselir, sanki ezgi yukarı çıkıyormuş gibi. Sorunun örneği önce baştan sona, o aynı yükselişle duyulur, ancak sonrasında kendi sesiyle tekrarlanması gerekir. Kelimelerin kendisi tamamen aynı kalır — yalnızca sesin ezgisi değişir, kelime sırası ya da kelimelerin kendisi değil.', semantic: 'explanation' }),
      pl: R({ text: 'Pytanie pisemne rozpoznaje się po znakach ¿...?, ale wypowiedziane na głos rozpoznaje się po brzmieniu. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' jako twierdzenie brzmi równo, a ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' wznosi się w tonie ku końcowi zdania, jakby melodia szła w górę. Najpierw brzmi cały wzór pytania, z tym samym wzniesieniem, a dopiero potem trzeba go powtórzyć własnym głosem. Same słowa pozostają dokładnie takie same — zmienia się tylko melodia głosu, nie kolejność słów ani same słowa.', semantic: 'explanation' }),
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
      ru: R({ text: 'Формула проста: сначала звучит образец вопроса с подъёмом голоса к концу, затем голос повторяет его целиком с той же мелодией. ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' поднимается на fácil — именно там голос идёт вверх, а не на es. ', semantic: 'explanation' }, { text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' поднимается на segura. Слово, на которое падает подъём, — обычно последнее слово фразы, признак или связка в конце. Точность здесь измеряется на слух: поднимается ли голос к концу фразы так же, как в образце, а не то, поставлен ли знак ¿...? на письме.', semantic: 'explanation' }),
      uk: R({ text: 'Формула проста: спершу звучить зразок питання з підйомом голосу до кінця, потім голос повторює його цілком із тією ж мелодією. ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' підіймається на fácil — саме там голос іде вгору, а не на es. ', semantic: 'explanation' }, { text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' підіймається на segura. Слово, на яке припадає підйом, — зазвичай останнє слово фрази, ознака чи зв’язка в кінці. Точність тут вимірюється на слух: чи піднімається голос до кінця фрази так само, як у зразку, а не чи поставлено знак ¿...? на письмі.', semantic: 'explanation' }),
      es: R({ text: 'The formula is simple: first the model of the question sounds with the pitch rising toward the end, then the voice repeats it whole with the same melody. ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' rises on fácil — that is exactly where the voice climbs, not on es. ', semantic: 'explanation' }, { text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' rises on segura. The word that carries the rise is usually the last word of the phrase, the quality or the linking word at the end. Accuracy here is measured by ear: whether the voice rises toward the end of the phrase the same way as in the model, not whether the mark ¿...? was placed in writing.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é simples: primeiro o modelo da pergunta soa com o tom subindo em direção ao fim, depois a voz o repete inteiro com a mesma melodia. ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' sobe em fácil — é exatamente aí que a voz sobe, não em es. ', semantic: 'explanation' }, { text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' sobe em segura. A palavra que carrega a subida costuma ser a última palavra da frase, a qualidade ou a ligação no final. A precisão aqui é medida pelo ouvido: se a voz sobe em direção ao fim da frase da mesma forma que no modelo, não se o sinal ¿...? foi colocado por escrito.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức rất đơn giản: đầu tiên mẫu câu hỏi vang lên với cao độ lên dần về cuối, sau đó giọng nói lặp lại trọn vẹn với cùng giai điệu đó. ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' lên cao ở fácil — đó chính xác là nơi giọng nói đi lên, không phải ở es. ', semantic: 'explanation' }, { text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' lên cao ở segura. Từ mang sự lên cao đó thường là từ cuối cùng của câu, đặc điểm hoặc từ nối ở cuối. Độ chính xác ở đây được đo bằng tai: giọng nói có lên cao về cuối câu giống như trong mẫu hay không, chứ không phải dấu ¿...? có được đặt khi viết hay không.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sederhana: pertama contoh pertanyaan terdengar dengan nada naik menuju akhir, kemudian suara mengulanginya secara utuh dengan melodi yang sama. ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' naik pada fácil — di situlah persisnya suara naik, bukan pada es. ', semantic: 'explanation' }, { text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' naik pada segura. Kata yang membawa kenaikan itu biasanya kata terakhir dari frasa, sifat atau kata penghubung di akhir. Akurasi di sini diukur dengan telinga: apakah suara naik menuju akhir frasa dengan cara yang sama seperti pada contoh, bukan apakah tanda ¿...? diletakkan secara tertulis.', semantic: 'explanation' }),
      tr: R({ text: 'Formül basittir: önce sorunun örneği sona doğru yükselen perdeyle duyulur, ardından ses onu aynı ezgiyle bütün olarak tekrarlar. ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' fácil üzerinde yükselir — sesin tam olarak yükseldiği yer orasıdır, es değil. ', semantic: 'explanation' }, { text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' segura üzerinde yükselir. Yükselişi taşıyan kelime genellikle cümlenin son kelimesidir, sondaki nitelik ya da bağlaç. Buradaki doğruluk kulakla ölçülür: sesin cümlenin sonuna doğru örnekteki gibi yükselip yükselmediği, ¿...? işaretinin yazıya konup konmadığı değil.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest prosta: najpierw brzmi wzór pytania z tonem wznoszącym się ku końcowi, potem głos powtarza go w całości z tą samą melodią. ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' wznosi się na fácil — właśnie tam głos idzie w górę, nie na es. ', semantic: 'explanation' }, { text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' wznosi się na segura. Słowo niosące wzniesienie to zwykle ostatnie słowo zdania, cecha lub łącznik na końcu. Dokładność mierzy się tu na słuch: czy głos wznosi się ku końcowi zdania tak samo jak we wzorze, a nie czy znak ¿...? postawiono na piśmie.', semantic: 'explanation' }),
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
      ru: R({ text: 'Легко подумать, что раз слова знакомы, вопрос скажется сам собой правильно, — но ровный голос без подъёма превращает вопрос обратно в утверждение на слух, даже если на письме стоят знаки ¿...?. Самая опасная ошибка — задать ', semantic: 'explanation' }, { text: '¿No eres de acuerdo?', semantic: 'targetCorrect' }, { text: ' тем же ровным тоном, что и обычное отрицание: тогда собеседник услышит спор, а не вопрос. Есть и обратная ошибка — поднимать голос слишком рано, на первом слове, а не на последнем. Проверка простая: подъём слышен ближе к концу фразы, на признаке или связке, а не в её начале.', semantic: 'explanation' }),
      uk: R({ text: 'Легко подумати, що раз слова знайомі, питання скажеться саме собою правильно, — але рівний голос без підйому перетворює питання назад на твердження на слух, навіть якщо на письмі стоять знаки ¿...?. Найнебезпечніша помилка — поставити ', semantic: 'explanation' }, { text: '¿No eres de acuerdo?', semantic: 'targetCorrect' }, { text: ' тим самим рівним тоном, що й звичайне заперечення: тоді співрозмовник почує суперечку, а не питання. Є й зворотна помилка — піднімати голос надто рано, на першому слові, а не на останньому. Перевірка проста: підйом чутний ближче до кінця фрази, на ознаці чи зв’язці, а не на її початку.', semantic: 'explanation' }),
      es: R({ text: 'It is easy to think that since the words are familiar, the question will come out right by itself — but a level voice without a rise turns the question back into a statement to the ear, even if the marks ¿...? are there in writing. The most dangerous mistake is to ask ', semantic: 'explanation' }, { text: '¿No eres de acuerdo?', semantic: 'targetCorrect' }, { text: ' with that same level tone as a plain negation: then the listener hears an argument, not a question. There is also the opposite mistake — raising the voice too early, on the first word rather than the last. The check is simple: the rise is heard closer to the end of the phrase, on the quality or the linking word, not at its start.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'É fácil pensar que, como as palavras são conhecidas, a pergunta vai sair certa sozinha — mas uma voz nivelada sem subida transforma a pergunta de volta numa afirmação ao ouvido, mesmo que os sinais ¿...? estejam ali por escrito. O erro mais perigoso é fazer ', semantic: 'explanation' }, { text: '¿No eres de acuerdo?', semantic: 'targetCorrect' }, { text: ' com o mesmo tom nivelado de uma negação comum: aí o interlocutor ouve uma discussão, não uma pergunta. Há também o erro oposto — subir a voz cedo demais, na primeira palavra em vez da última. A checagem é simples: a subida se ouve mais perto do fim da frase, na qualidade ou na ligação, não no seu início.', semantic: 'explanation' }),
      vi: R({ text: 'Dễ nghĩ rằng vì các từ đã quen thuộc, câu hỏi sẽ tự nhiên nói đúng — nhưng giọng đều đều không lên cao sẽ biến câu hỏi trở lại thành câu khẳng định khi nghe, ngay cả khi dấu ¿...? có trên chữ viết. Sai lầm nguy hiểm nhất là hỏi ', semantic: 'explanation' }, { text: '¿No eres de acuerdo?', semantic: 'targetCorrect' }, { text: ' bằng cùng giọng điệu đều đều như một câu phủ định thông thường: khi đó người nghe sẽ nghe thấy một cuộc tranh cãi, không phải một câu hỏi. Cũng có sai lầm ngược lại — lên giọng quá sớm, ở từ đầu tiên thay vì từ cuối. Cách kiểm tra đơn giản: sự lên cao được nghe gần cuối câu hơn, ở đặc điểm hay từ nối, không phải ở đầu câu.', semantic: 'explanation' }),
      id: R({ text: 'Mudah untuk berpikir bahwa karena kata-katanya sudah dikenal, pertanyaan akan terucap benar dengan sendirinya — tetapi suara datar tanpa kenaikan mengubah pertanyaan kembali menjadi pernyataan di telinga, meskipun tanda ¿...? ada secara tertulis. Kesalahan paling berbahaya adalah menanyakan ', semantic: 'explanation' }, { text: '¿No eres de acuerdo?', semantic: 'targetCorrect' }, { text: ' dengan nada datar yang sama seperti negasi biasa: maka pendengar akan mendengar perdebatan, bukan pertanyaan. Ada juga kesalahan sebaliknya — menaikkan suara terlalu dini, pada kata pertama alih-alih kata terakhir. Pengecekannya sederhana: kenaikan terdengar lebih dekat ke akhir frasa, pada sifat atau kata penghubung, bukan di awalnya.', semantic: 'explanation' }),
      tr: R({ text: 'Kelimeler tanıdık olduğu için sorunun kendiliğinden doğru çıkacağını düşünmek kolaydır — ama yükselişsiz düz bir ses, yazıda ¿...? işaretleri olsa bile soruyu kulakta yeniden bir ifadeye dönüştürür. En tehlikeli hata, ', semantic: 'explanation' }, { text: '¿No eres de acuerdo?', semantic: 'targetCorrect' }, { text: ' sorusunu sıradan bir olumsuzlamayla aynı düz tonda sormaktır: o zaman dinleyici bir soru değil, bir tartışma duyar. Bunun tersi bir hata da vardır — sesi çok erken, son kelimede değil ilk kelimede yükseltmek. Kontrol basittir: yükseliş, cümlenin sonuna daha yakın, nitelikte ya da bağlaçta duyulur, başında değil.', semantic: 'explanation' }),
      pl: R({ text: 'Łatwo pomyśleć, że skoro słowa są znajome, pytanie samo wyjdzie poprawnie — ale równy głos bez wzniesienia zamienia pytanie z powrotem w twierdzenie dla ucha, nawet jeśli na piśmie stoją znaki ¿...?. Najniebezpieczniejszym błędem jest zadanie ', semantic: 'explanation' }, { text: '¿No eres de acuerdo?', semantic: 'targetCorrect' }, { text: ' tym samym równym tonem co zwykłe przeczenie: wtedy rozmówca usłyszy kłótnię, a nie pytanie. Jest też błąd odwrotny — podniesienie głosu zbyt wcześnie, na pierwszym słowie zamiast na ostatnim. Sprawdzenie jest proste: wzniesienie słychać bliżej końca zdania, na cesze lub łączniku, a nie na jego początku.', semantic: 'explanation' }),
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
