import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 20 "Верно ли это?" / builtOn: [14, 17], recalls: [14, 17]): три
// страницы concept/formula/trap объединяют формулу согласия de acuerdo
// (сессия 14) со связкой es для предметов и ситуаций (сессия 17). Разница
// с сессией 14: там de acuerdo звучала как прямой диалог "Ты согласен?" —
// здесь фокус на оценке ВЫСКАЗЫВАНИЯ или факта как верного, через
// ¿Es verdad? и реакцию de acuerdo с чужим утверждением о ситуации.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_20_TITLE = L({
  ru: 'Верно ли это?',
  uk: 'Чи це правда?',
  es: 'Is that right?',
  'pt-BR': 'Será que isso é verdade?',
  vi: 'Điều đó có đúng không?',
  id: 'Apakah itu benar?',
  tr: 'Bu doğru mu acaba?',
  pl: 'Czy to prawda?',
});

export const ES_EPISODE_01_SESSION_20_SUMMARY = L({
  ru: '¿Es verdad? проверяет заявление на истинность, de acuerdo выражает согласие с мнением о нём — две разные проверки одного и того же высказывания.',
  uk: '¿Es verdad? перевіряє заяву на істинність, de acuerdo виражає згоду з думкою про неї — дві різні перевірки одного й того самого вислову.',
  es: '¿Es verdad? checks a claim for truth, de acuerdo expresses agreement with an opinion about it — two different checks on the same statement.',
  'pt-BR': '¿Es verdad? verifica se uma afirmação é verdadeira, de acuerdo expressa concordância com uma opinião sobre ela — duas checagens diferentes da mesma declaração.',
  vi: '¿Es verdad? kiểm tra một tuyên bố có đúng không, de acuerdo thể hiện sự đồng ý với ý kiến về nó — hai cách kiểm tra khác nhau cho cùng một câu nói.',
  id: '¿Es verdad? memeriksa apakah suatu klaim benar, de acuerdo mengungkapkan persetujuan dengan pendapat tentangnya — dua pemeriksaan berbeda atas pernyataan yang sama.',
  tr: '¿Es verdad?, bir iddianın doğruluğunu kontrol eder; de acuerdo, onun hakkındaki bir görüşe katılımı ifade eder — aynı ifade üzerinde iki farklı kontrol.',
  pl: '¿Es verdad? sprawdza, czy twierdzenie jest prawdziwe, de acuerdo wyraża zgodę z opinią na jego temat — dwa różne sprawdzenia tej samej wypowiedzi.',
});

export const ES_EPISODE_01_SESSION_20_GOAL = L({
  ru: 'Различать проверку факта (¿Es verdad?) и согласие с мнением (de acuerdo) при оценке чужого высказывания о предмете или ситуации.',
  uk: 'Розрізняти перевірку факту (¿Es verdad?) і згоду з думкою (de acuerdo) під час оцінки чужого вислову про предмет чи ситуацію.',
  es: 'Distinguish checking a fact (¿Es verdad?) from agreeing with an opinion (de acuerdo) when evaluating someone else\'s statement about a thing or situation.',
  'pt-BR': 'Distinguir a checagem de um fato (¿Es verdad?) da concordância com uma opinião (de acuerdo) ao avaliar a declaração de outra pessoa sobre uma coisa ou situação.',
  vi: 'Phân biệt kiểm tra sự thật (¿Es verdad?) với đồng ý về ý kiến (de acuerdo) khi đánh giá lời của người khác về một vật hay tình huống.',
  id: 'Membedakan pemeriksaan fakta (¿Es verdad?) dari persetujuan atas pendapat (de acuerdo) saat menilai pernyataan orang lain tentang benda atau situasi.',
  tr: 'Bir şey ya da durum hakkındaki başkasının ifadesini değerlendirirken bir gerçeği kontrol etmeyi (¿Es verdad?) bir görüşe katılmaktan (de acuerdo) ayırt etmek.',
  pl: 'Odróżniać sprawdzanie faktu (¿Es verdad?) od zgody z opinią (de acuerdo) przy ocenie czyjejś wypowiedzi o rzeczy lub sytuacji.',
});

const CONCEPT_BODY = L({
  ru: 'Одно и то же высказывание можно оценить двумя разными способами. ¿Es verdad? спрашивает, соответствует ли заявление действительности — это проверка самого факта. De acuerdo, наоборот, не проверяет факт, а выражает согласие с чьим-то мнением о нём. Разница простая: можно сказать Es verdad, но No de acuerdo — факт истинный, но говорящий не разделяет вывод из него. Ответ прост: es verdad проверяет истинность, de acuerdo — согласие с мнением, это не одно и то же.',
  uk: 'Одне й те саме висловлювання можна оцінити двома різними способами. ¿Es verdad? запитує, чи відповідає заява дійсності — це перевірка самого факту. De acuerdo, навпаки, не перевіряє факт, а виражає згоду з чиєюсь думкою про нього. Різниця проста: можна сказати Es verdad, але No de acuerdo — факт істинний, але мовець не поділяє висновок із нього. Відповідь проста: es verdad перевіряє істинність, de acuerdo — згоду з думкою, це не одне й те саме.',
  es: 'The same statement can be evaluated in two different ways. ¿Es verdad? asks whether a claim matches reality — this checks the fact itself. De acuerdo, on the other hand, does not check the fact — it expresses agreement with someone\'s opinion about it. The difference is simple: you can say Es verdad but No de acuerdo — the fact is true, but the speaker does not share the conclusion drawn from it. The answer is simple: es verdad checks truth, de acuerdo checks agreement with an opinion — they are not the same thing.',
  'pt-BR': 'A mesma declaração pode ser avaliada de duas formas diferentes. ¿Es verdad? pergunta se uma afirmação corresponde à realidade — isso checa o próprio fato. De acuerdo, por outro lado, não checa o fato — expressa concordância com a opinião de alguém sobre ele. A diferença é simples: dá para dizer Es verdad mas No de acuerdo — o fato é verdadeiro, mas quem fala não compartilha a conclusão tirada dele. A resposta é simples: es verdad checa a verdade, de acuerdo checa a concordância com uma opinião — não são a mesma coisa.',
  vi: 'Cùng một câu nói có thể được đánh giá theo hai cách khác nhau. ¿Es verdad? hỏi liệu một tuyên bố có đúng với thực tế không — đây là kiểm tra chính sự thật. De acuerdo, ngược lại, không kiểm tra sự thật — nó thể hiện sự đồng ý với ý kiến của ai đó về điều đó. Sự khác biệt rất đơn giản: có thể nói Es verdad nhưng No de acuerdo — sự thật là đúng, nhưng người nói không chia sẻ kết luận rút ra từ đó. Câu trả lời rất đơn giản: es verdad kiểm tra tính đúng đắn, de acuerdo kiểm tra sự đồng ý với ý kiến — chúng không phải cùng một điều.',
  id: 'Pernyataan yang sama bisa dinilai dengan dua cara berbeda. ¿Es verdad? menanyakan apakah suatu klaim sesuai kenyataan — ini memeriksa faktanya sendiri. De acuerdo, sebaliknya, tidak memeriksa fakta — ia mengungkapkan persetujuan dengan pendapat seseorang tentangnya. Perbedaannya sederhana: bisa mengatakan Es verdad tetapi No de acuerdo — faktanya benar, tetapi penutur tidak berbagi kesimpulan yang ditarik darinya. Jawabannya sederhana: es verdad memeriksa kebenaran, de acuerdo memeriksa persetujuan dengan pendapat — keduanya bukan hal yang sama.',
  tr: 'Aynı ifade iki farklı şekilde değerlendirilebilir. ¿Es verdad?, bir iddianın gerçeğe uyup uymadığını sorar — bu, gerçeğin kendisini kontrol eder. De acuerdo ise gerçeği kontrol etmez — biri hakkındaki bir görüşe katılımı ifade eder. Fark basittir: Es verdad ama No de acuerdo diyebilirsiniz — gerçek doğrudur, ama konuşan ondan çıkan sonucu paylaşmaz. Cevap basittir: es verdad doğruluğu kontrol eder, de acuerdo bir görüşe katılımı kontrol eder — ikisi aynı şey değildir.',
  pl: 'To samo stwierdzenie można ocenić na dwa różne sposoby. ¿Es verdad? pyta, czy twierdzenie odpowiada rzeczywistości — to sprawdza sam fakt. De acuerdo, przeciwnie, nie sprawdza faktu — wyraża zgodę z czyjąś opinią na jego temat. Różnica jest prosta: można powiedzieć Es verdad, ale No de acuerdo — fakt jest prawdziwy, ale mówiący nie podziela wniosku z niego wyciągniętego. Odpowiedź jest prosta: es verdad sprawdza prawdziwość, de acuerdo sprawdza zgodę z opinią — to nie to samo.',
});

const FORMULA_BODY = L({
  ru: 'Формула проверки факта — та же, что и в предыдущей теме: es + verdad, знаки ¿? меняют утверждение на вопрос без перестановки слов. Формула согласия — тоже без изменений: de + acuerdo, застывшая пара слов, не согласующаяся ни с родом, ни с числом. Обе формулы можно поставить рядом в одном диалоге: сначала оценить факт связкой es, потом отдельно выразить согласие формулой de acuerdo. Ответ прост: es verdad оценивает факт связкой ser, de acuerdo — отдельная неизменяемая формула согласия.',
  uk: 'Формула перевірки факту — та сама, що й у попередній темі: es + verdad, знаки ¿? змінюють твердження на питання без перестановки слів. Формула згоди — теж без змін: de + acuerdo, застигла пара слів, що не узгоджується ні з родом, ні з числом. Обидві формули можна поставити поряд в одному діалозі: спершу оцінити факт зв’язкою es, потім окремо висловити згоду формулою de acuerdo. Відповідь проста: es verdad оцінює факт зв’язкою ser, de acuerdo — окрема незмінювана формула згоди.',
  es: 'The formula for checking a fact is the same as before: es + verdad, the marks ¿? turn a statement into a question without reordering the words. The agreement formula is also unchanged: de + acuerdo, a fixed pair of words that agrees with neither gender nor number. Both formulas can stand side by side in one exchange: first evaluate the fact with the linking word es, then separately express agreement with the formula de acuerdo. The answer is simple: es verdad evaluates a fact with the linking word ser, de acuerdo is a separate, unchanging agreement formula.',
  'pt-BR': 'A fórmula para checar um fato é a mesma de antes: es + verdad, os sinais ¿? transformam uma afirmação em pergunta sem reordenar as palavras. A fórmula de concordância também não muda: de + acuerdo, um par fixo de palavras que não concorda nem com gênero nem com número. As duas fórmulas podem ficar lado a lado numa mesma troca: primeiro avaliar o fato com a ligação es, depois expressar separadamente concordância com a fórmula de acuerdo. A resposta é simples: es verdad avalia um fato com a ligação ser, de acuerdo é uma fórmula de concordância separada e invariável.',
  vi: 'Công thức kiểm tra sự thật giống như trước: es + verdad, dấu ¿? biến câu khẳng định thành câu hỏi mà không đổi trật tự từ. Công thức đồng ý cũng không đổi: de + acuerdo, một cặp từ cố định không hòa hợp với giống hay số. Cả hai công thức có thể đứng cạnh nhau trong cùng một cuộc trao đổi: trước tiên đánh giá sự thật bằng từ nối es, sau đó riêng biệt thể hiện đồng ý bằng công thức de acuerdo. Câu trả lời rất đơn giản: es verdad đánh giá sự thật bằng từ nối ser, de acuerdo là một công thức đồng ý riêng biệt, không đổi.',
  id: 'Rumus untuk memeriksa fakta sama seperti sebelumnya: es + verdad, tanda ¿? mengubah pernyataan menjadi pertanyaan tanpa mengubah urutan kata. Rumus persetujuan juga tidak berubah: de + acuerdo, pasangan kata tetap yang tidak sesuai dengan gender maupun jumlah. Kedua rumus bisa berdampingan dalam satu pertukaran: pertama menilai fakta dengan kata penghubung es, lalu secara terpisah mengungkapkan persetujuan dengan rumus de acuerdo. Jawabannya sederhana: es verdad menilai fakta dengan kata penghubung ser, de acuerdo adalah rumus persetujuan terpisah yang tidak berubah.',
  tr: 'Bir gerçeği kontrol etme formülü öncekiyle aynıdır: es + verdad, ¿? işaretleri kelime sırasını değiştirmeden bir ifadeyi soruya çevirir. Onay formülü de değişmez: de + acuerdo, ne cinsiyete ne de sayıya uyan sabit bir kelime çifti. Her iki formül de tek bir alışverişte yan yana durabilir: önce gerçeği es bağlacıyla değerlendirin, sonra ayrı olarak de acuerdo formülüyle katılımı ifade edin. Cevap basittir: es verdad, ser bağlacıyla bir gerçeği değerlendirir; de acuerdo ayrı, değişmeyen bir onay formülüdür.',
  pl: 'Formuła sprawdzania faktu jest taka sama jak wcześniej: es + verdad, znaki ¿? zamieniają twierdzenie w pytanie bez zmiany kolejności słów. Formuła zgody też się nie zmienia: de + acuerdo, utrwalona para słów, która nie zgadza się ani z rodzajem, ani z liczbą. Obie formuły mogą stanąć obok siebie w jednej wymianie kwestii: najpierw ocenić fakt łącznikiem es, potem osobno wyrazić zgodę formułą de acuerdo. Odpowiedź jest prosta: es verdad ocenia fakt łącznikiem ser, de acuerdo to osobna, niezmienna formuła zgody.',
});

const TRAP_BODY = L({
  ru: 'Главная ловушка — решить, что Es verdad и De acuerdo взаимозаменяемы, раз обе звучат как позитивный отклик. На самом деле верно и обратное сочетание, Es verdad, no de acuerdo: факт подтверждён, но говорящий не разделяет вывод из него. Вторая ловушка — спутать Es igual с проверкой факта: ¿Es igual? спрашивает про безразличие, а не про истинность. Проверка простая: сомневаешься в самом факте — спрашивай ¿Es verdad?, хочешь выразить отношение к чужому выводу — используй de acuerdo или no de acuerdo.',
  uk: 'Головна пастка — вирішити, що Es verdad і De acuerdo взаємозамінні, бо обидва звучать як позитивна відповідь. Насправді вірне й зворотне поєднання, Es verdad, no de acuerdo: факт підтверджено, але мовець не поділяє висновок із нього. Друга пастка — сплутати Es igual із перевіркою факту: ¿Es igual? запитує про байдужість, а не про істинність. Перевірка проста: сумніваєшся в самому факті — питай ¿Es verdad?, хочеш висловити ставлення до чужого висновку — використовуй de acuerdo чи no de acuerdo.',
  es: 'The main trap is deciding that Es verdad and De acuerdo are interchangeable just because both sound like a positive response. In fact, the opposite combination is also valid, Es verdad, no de acuerdo: the fact is confirmed, but the speaker does not share the conclusion drawn from it. The second trap is confusing Es igual with checking a fact: ¿Es igual? asks about indifference, not truth. The check is simple: doubt the fact itself — ask ¿Es verdad?; want to express your stance on someone else\'s conclusion — use de acuerdo or no de acuerdo.',
  'pt-BR': 'A armadilha principal é decidir que Es verdad e De acuerdo são intercambiáveis só porque ambos soam como uma resposta positiva. Na verdade, a combinação oposta também é válida, Es verdad, no de acuerdo: o fato é confirmado, mas quem fala não compartilha a conclusão tirada dele. A segunda armadilha é confundir Es igual com a checagem de um fato: ¿Es igual? pergunta sobre indiferença, não sobre a verdade. A checagem é simples: duvida do próprio fato — pergunte ¿Es verdad?; quer expressar sua posição sobre a conclusão de outra pessoa — use de acuerdo ou no de acuerdo.',
  vi: 'Cái bẫy chính là cho rằng Es verdad và De acuerdo có thể thay thế cho nhau chỉ vì cả hai đều nghe như phản hồi tích cực. Thực tế, tổ hợp ngược lại cũng đúng, Es verdad, no de acuerdo: sự thật được xác nhận, nhưng người nói không chia sẻ kết luận rút ra từ đó. Cái bẫy thứ hai là nhầm Es igual với việc kiểm tra sự thật: ¿Es igual? hỏi về sự thờ ơ, không phải về tính đúng đắn. Cách kiểm tra đơn giản: nghi ngờ chính sự thật — hỏi ¿Es verdad?; muốn thể hiện quan điểm về kết luận của người khác — dùng de acuerdo hay no de acuerdo.',
  id: 'Jebakan utama adalah memutuskan bahwa Es verdad dan De acuerdo bisa saling menggantikan hanya karena keduanya terdengar seperti respons positif. Faktanya, kombinasi sebaliknya juga berlaku, Es verdad, no de acuerdo: faktanya dikonfirmasi, tetapi penutur tidak berbagi kesimpulan yang ditarik darinya. Jebakan kedua adalah mengacaukan Es igual dengan memeriksa fakta: ¿Es igual? menanyakan tentang ketidakpedulian, bukan kebenaran. Pengecekannya sederhana: ragu pada faktanya sendiri — tanyakan ¿Es verdad?; ingin mengungkapkan sikap terhadap kesimpulan orang lain — gunakan de acuerdo atau no de acuerdo.',
  tr: 'Asıl tuzak, ikisi de olumlu bir yanıt gibi duyulduğu için Es verdad ile De acuerdo\'nun birbirinin yerine geçtiğine karar vermektir. Aslında tam tersi birleşim de geçerlidir, Es verdad, no de acuerdo: gerçek doğrulanmıştır, ama konuşan ondan çıkan sonucu paylaşmaz. İkinci tuzak, Es igual\'i bir gerçeği kontrol etmekle karıştırmaktır: ¿Es igual?, doğruluğu değil kayıtsızlığı sorar. Kontrol basittir: gerçeğin kendisinden şüphe ediyorsanız ¿Es verdad? diye sorun; başkasının sonucu hakkındaki tutumunuzu ifade etmek istiyorsanız de acuerdo ya da no de acuerdo kullanın.',
  pl: 'Główna pułapka to uznanie, że Es verdad i De acuerdo są wymienne tylko dlatego, że oba brzmią jak pozytywna odpowiedź. W rzeczywistości poprawne jest też odwrotne połączenie, Es verdad, no de acuerdo: fakt jest potwierdzony, ale mówiący nie podziela wniosku z niego wyciągniętego. Druga pułapka to mylenie Es igual ze sprawdzaniem faktu: ¿Es igual? pyta o obojętność, nie o prawdziwość. Sprawdzenie jest proste: wątpisz w sam fakt — pytaj ¿Es verdad?; chcesz wyrazić stosunek do czyjegoś wniosku — użyj de acuerdo lub no de acuerdo.',
});

export const ES_EPISODE_01_SESSION_20_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Проверить факт — не то же самое, что согласиться',
      uk: 'Перевірити факт — не те саме, що погодитися',
      es: 'Checking a fact is not the same as agreeing',
      'pt-BR': 'Checar um fato não é o mesmo que concordar',
      vi: 'Kiểm tra sự thật không giống với việc đồng ý',
      id: 'Memeriksa fakta bukan sama dengan setuju',
      tr: 'Bir gerçeği kontrol etmek, katılmakla aynı şey değildir',
      pl: 'Sprawdzenie faktu to nie to samo co zgoda',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Одно и то же высказывание можно оценить двумя разными способами. ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: ' спрашивает, соответствует ли заявление действительности — это проверка самого факта. ', semantic: 'explanation' }, { text: 'De acuerdo', semantic: 'targetCorrect' }, { text: ', наоборот, не проверяет факт, а выражает согласие с чьим-то мнением о нём. Разница простая: можно сказать Es verdad, но No de acuerdo — факт истинный, но говорящий не разделяет вывод из него. Ответ прост: es verdad проверяет истинность, de acuerdo — согласие с мнением, это не одно и то же.', semantic: 'explanation' }),
      uk: R({ text: 'Одне й те саме висловлювання можна оцінити двома різними способами. ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: ' запитує, чи відповідає заява дійсності — це перевірка самого факту. ', semantic: 'explanation' }, { text: 'De acuerdo', semantic: 'targetCorrect' }, { text: ', навпаки, не перевіряє факт, а виражає згоду з чиєюсь думкою про нього. Різниця проста: можна сказати Es verdad, але No de acuerdo — факт істинний, але мовець не поділяє висновок із нього. Відповідь проста: es verdad перевіряє істинність, de acuerdo — згоду з думкою, це не одне й те саме.', semantic: 'explanation' }),
      es: R({ text: 'The same statement can be evaluated in two different ways. ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: ' asks whether a claim matches reality — this checks the fact itself. ', semantic: 'explanation' }, { text: 'De acuerdo', semantic: 'targetCorrect' }, { text: ', on the other hand, does not check the fact — it expresses agreement with someone\'s opinion about it. The difference is simple: you can say Es verdad but No de acuerdo — the fact is true, but the speaker does not share the conclusion drawn from it. The answer is simple: es verdad checks truth, de acuerdo checks agreement with an opinion — they are not the same thing.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A mesma declaração pode ser avaliada de duas formas diferentes. ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: ' pergunta se uma afirmação corresponde à realidade — isso checa o próprio fato. ', semantic: 'explanation' }, { text: 'De acuerdo', semantic: 'targetCorrect' }, { text: ', por outro lado, não checa o fato — expressa concordância com a opinião de alguém sobre ele. A diferença é simples: dá para dizer Es verdad mas No de acuerdo — o fato é verdadeiro, mas quem fala não compartilha a conclusão tirada dele. A resposta é simples: es verdad checa a verdade, de acuerdo checa a concordância com uma opinião — não são a mesma coisa.', semantic: 'explanation' }),
      vi: R({ text: 'Cùng một câu nói có thể được đánh giá theo hai cách khác nhau. ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: ' hỏi liệu một tuyên bố có đúng với thực tế không — đây là kiểm tra chính sự thật. ', semantic: 'explanation' }, { text: 'De acuerdo', semantic: 'targetCorrect' }, { text: ', ngược lại, không kiểm tra sự thật — nó thể hiện sự đồng ý với ý kiến của ai đó về điều đó. Sự khác biệt rất đơn giản: có thể nói Es verdad nhưng No de acuerdo — sự thật là đúng, nhưng người nói không chia sẻ kết luận rút ra từ đó. Câu trả lời rất đơn giản: es verdad kiểm tra tính đúng đắn, de acuerdo kiểm tra sự đồng ý với ý kiến — chúng không phải cùng một điều.', semantic: 'explanation' }),
      id: R({ text: 'Pernyataan yang sama bisa dinilai dengan dua cara berbeda. ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: ' menanyakan apakah suatu klaim sesuai kenyataan — ini memeriksa faktanya sendiri. ', semantic: 'explanation' }, { text: 'De acuerdo', semantic: 'targetCorrect' }, { text: ', sebaliknya, tidak memeriksa fakta — ia mengungkapkan persetujuan dengan pendapat seseorang tentangnya. Perbedaannya sederhana: bisa mengatakan Es verdad tetapi No de acuerdo — faktanya benar, tetapi penutur tidak berbagi kesimpulan yang ditarik darinya. Jawabannya sederhana: es verdad memeriksa kebenaran, de acuerdo memeriksa persetujuan dengan pendapat — keduanya bukan hal yang sama.', semantic: 'explanation' }),
      tr: R({ text: 'Aynı ifade iki farklı şekilde değerlendirilebilir. ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: ', bir iddianın gerçeğe uyup uymadığını sorar — bu, gerçeğin kendisini kontrol eder. ', semantic: 'explanation' }, { text: 'De acuerdo', semantic: 'targetCorrect' }, { text: ' ise gerçeği kontrol etmez — biri hakkındaki bir görüşe katılımı ifade eder. Fark basittir: Es verdad ama No de acuerdo diyebilirsiniz — gerçek doğrudur, ama konuşan ondan çıkan sonucu paylaşmaz. Cevap basittir: es verdad doğruluğu kontrol eder, de acuerdo bir görüşe katılımı kontrol eder — ikisi aynı şey değildir.', semantic: 'explanation' }),
      pl: R({ text: 'To samo stwierdzenie można ocenić na dwa różne sposoby. ', semantic: 'explanation' }, { text: '¿Es verdad?', semantic: 'targetCorrect' }, { text: ' pyta, czy twierdzenie odpowiada rzeczywistości — to sprawdza sam fakt. ', semantic: 'explanation' }, { text: 'De acuerdo', semantic: 'targetCorrect' }, { text: ', przeciwnie, nie sprawdza faktu — wyraża zgodę z czyjąś opinią na jego temat. Różnica jest prosta: można powiedzieć Es verdad, ale No de acuerdo — fakt jest prawdziwy, ale mówiący nie podziela wniosku z niego wyciągniętego. Odpowiedź jest prosta: es verdad sprawdza prawdziwość, de acuerdo sprawdza zgodę z opinią — to nie to samo.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что проверяет ¿Es verdad?',
        uk: 'Що перевіряє ¿Es verdad?',
        es: 'What does ¿Es verdad? check?',
        'pt-BR': 'O que ¿Es verdad? checa?',
        vi: '¿Es verdad? kiểm tra điều gì?',
        id: 'Apa yang diperiksa oleh ¿Es verdad?',
        tr: '¿Es verdad? neyi kontrol eder?',
        pl: 'Co sprawdza ¿Es verdad?',
      }),
      choices: [
        L({ ru: '¿Es verdad?', uk: '¿Es verdad?', es: '¿Es verdad?', 'pt-BR': '¿Es verdad?', vi: '¿Es verdad?', id: '¿Es verdad?', tr: '¿Es verdad?', pl: '¿Es verdad?' }),
        L({ ru: 'De acuerdo', uk: 'De acuerdo', es: 'De acuerdo', 'pt-BR': 'De acuerdo', vi: 'De acuerdo', id: 'De acuerdo', tr: 'De acuerdo', pl: 'De acuerdo' }),
        L({ ru: 'Es igual', uk: 'Es igual', es: 'Es igual', 'pt-BR': 'Es igual', vi: 'Es igual', id: 'Es igual', tr: 'Es igual', pl: 'Es igual' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: '¿Es verdad? — верно, потому что именно этот вопрос проверяет заявление на истинность. De acuerdo выражает согласие с мнением, а не проверку факта.',
        uk: '¿Es verdad? — правильно, бо саме це питання перевіряє заяву на істинність. De acuerdo виражає згоду з думкою, а не перевірку факту.',
        es: '¿Es verdad? is correct, because this question checks a claim for truth. De acuerdo expresses agreement with an opinion, not a fact check.',
        'pt-BR': '¿Es verdad? está correto, porque essa pergunta checa se uma afirmação é verdadeira. De acuerdo expressa concordância com uma opinião, não a checagem de um fato.',
        vi: '¿Es verdad? đúng, vì chính câu hỏi này kiểm tra một tuyên bố có đúng không. De acuerdo thể hiện sự đồng ý với ý kiến, không phải kiểm tra sự thật.',
        id: '¿Es verdad? benar, karena pertanyaan inilah yang memeriksa apakah suatu klaim benar. De acuerdo mengungkapkan persetujuan dengan pendapat, bukan pemeriksaan fakta.',
        tr: '¿Es verdad? doğrudur, çünkü bir iddianın doğruluğunu kontrol eden tam olarak bu sorudur. De acuerdo bir görüşe katılımı ifade eder, gerçek kontrolünü değil.',
        pl: '¿Es verdad? jest poprawne, ponieważ to właśnie to pytanie sprawdza prawdziwość twierdzenia. De acuerdo wyraża zgodę z opinią, nie sprawdzanie faktu.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Две формулы, каждая своя',
      uk: 'Дві формули, кожна своя',
      es: 'Two formulas, each its own',
      'pt-BR': 'Duas fórmulas, cada uma a sua',
      vi: 'Hai công thức, mỗi cái một kiểu',
      id: 'Dua rumus, masing-masing berbeda',
      tr: 'İki formül, her biri kendine özgü',
      pl: 'Dwie formuły, każda inna',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула проверки факта — та же, что и в предыдущей теме: ', semantic: 'explanation' }, { text: 'es + verdad', semantic: 'targetCorrect' }, { text: ', знаки ¿? меняют утверждение на вопрос без перестановки слов. Формула согласия — тоже без изменений: ', semantic: 'explanation' }, { text: 'de + acuerdo', semantic: 'targetCorrect' }, { text: ', застывшая пара слов, не согласующаяся ни с родом, ни с числом. Обе формулы можно поставить рядом в одном диалоге: сначала оценить факт связкой es, потом отдельно выразить согласие формулой de acuerdo. Ответ прост: es verdad оценивает факт связкой ser, de acuerdo — отдельная неизменяемая формула согласия.', semantic: 'explanation' }),
      uk: R({ text: 'Формула перевірки факту — та сама, що й у попередній темі: ', semantic: 'explanation' }, { text: 'es + verdad', semantic: 'targetCorrect' }, { text: ', знаки ¿? змінюють твердження на питання без перестановки слів. Формула згоди — теж без змін: ', semantic: 'explanation' }, { text: 'de + acuerdo', semantic: 'targetCorrect' }, { text: ', застигла пара слів, що не узгоджується ні з родом, ні з числом. Обидві формули можна поставити поряд в одному діалозі: спершу оцінити факт зв’язкою es, потім окремо висловити згоду формулою de acuerdo. Відповідь проста: es verdad оцінює факт зв’язкою ser, de acuerdo — окрема незмінювана формула згоди.', semantic: 'explanation' }),
      es: R({ text: 'The formula for checking a fact is the same as before: ', semantic: 'explanation' }, { text: 'es + verdad', semantic: 'targetCorrect' }, { text: ', the marks ¿? turn a statement into a question without reordering the words. The agreement formula is also unchanged: ', semantic: 'explanation' }, { text: 'de + acuerdo', semantic: 'targetCorrect' }, { text: ', a fixed pair of words that agrees with neither gender nor number. Both formulas can stand side by side in one exchange: first evaluate the fact with the linking word es, then separately express agreement with the formula de acuerdo. The answer is simple: es verdad evaluates a fact with the linking word ser, de acuerdo is a separate, unchanging agreement formula.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula para checar um fato é a mesma de antes: ', semantic: 'explanation' }, { text: 'es + verdad', semantic: 'targetCorrect' }, { text: ', os sinais ¿? transformam uma afirmação em pergunta sem reordenar as palavras. A fórmula de concordância também não muda: ', semantic: 'explanation' }, { text: 'de + acuerdo', semantic: 'targetCorrect' }, { text: ', um par fixo de palavras que não concorda nem com gênero nem com número. As duas fórmulas podem ficar lado a lado numa mesma troca: primeiro avaliar o fato com a ligação es, depois expressar separadamente concordância com a fórmula de acuerdo. A resposta é simples: es verdad avalia um fato com a ligação ser, de acuerdo é uma fórmula de concordância separada e invariável.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức kiểm tra sự thật giống như trước: ', semantic: 'explanation' }, { text: 'es + verdad', semantic: 'targetCorrect' }, { text: ', dấu ¿? biến câu khẳng định thành câu hỏi mà không đổi trật tự từ. Công thức đồng ý cũng không đổi: ', semantic: 'explanation' }, { text: 'de + acuerdo', semantic: 'targetCorrect' }, { text: ', một cặp từ cố định không hòa hợp với giống hay số. Cả hai công thức có thể đứng cạnh nhau trong cùng một cuộc trao đổi: trước tiên đánh giá sự thật bằng từ nối es, sau đó riêng biệt thể hiện đồng ý bằng công thức de acuerdo. Câu trả lời rất đơn giản: es verdad đánh giá sự thật bằng từ nối ser, de acuerdo là một công thức đồng ý riêng biệt, không đổi.', semantic: 'explanation' }),
      id: R({ text: 'Rumus untuk memeriksa fakta sama seperti sebelumnya: ', semantic: 'explanation' }, { text: 'es + verdad', semantic: 'targetCorrect' }, { text: ', tanda ¿? mengubah pernyataan menjadi pertanyaan tanpa mengubah urutan kata. Rumus persetujuan juga tidak berubah: ', semantic: 'explanation' }, { text: 'de + acuerdo', semantic: 'targetCorrect' }, { text: ', pasangan kata tetap yang tidak sesuai dengan gender maupun jumlah. Kedua rumus bisa berdampingan dalam satu pertukaran: pertama menilai fakta dengan kata penghubung es, lalu secara terpisah mengungkapkan persetujuan dengan rumus de acuerdo. Jawabannya sederhana: es verdad menilai fakta dengan kata penghubung ser, de acuerdo adalah rumus persetujuan terpisah yang tidak berubah.', semantic: 'explanation' }),
      tr: R({ text: 'Bir gerçeği kontrol etme formülü öncekiyle aynıdır: ', semantic: 'explanation' }, { text: 'es + verdad', semantic: 'targetCorrect' }, { text: ', ¿? işaretleri kelime sırasını değiştirmeden bir ifadeyi soruya çevirir. Onay formülü de değişmez: ', semantic: 'explanation' }, { text: 'de + acuerdo', semantic: 'targetCorrect' }, { text: ', ne cinsiyete ne de sayıya uyan sabit bir kelime çifti. Her iki formül de tek bir alışverişte yan yana durabilir: önce gerçeği es bağlacıyla değerlendirin, sonra ayrı olarak de acuerdo formülüyle katılımı ifade edin. Cevap basittir: es verdad, ser bağlacıyla bir gerçeği değerlendirir; de acuerdo ayrı, değişmeyen bir onay formülüdür.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła sprawdzania faktu jest taka sama jak wcześniej: ', semantic: 'explanation' }, { text: 'es + verdad', semantic: 'targetCorrect' }, { text: ', znaki ¿? zamieniają twierdzenie w pytanie bez zmiany kolejności słów. Formuła zgody też się nie zmienia: ', semantic: 'explanation' }, { text: 'de + acuerdo', semantic: 'targetCorrect' }, { text: ', utrwalona para słów, która nie zgadza się ani z rodzajem, ani z liczbą. Obie formuły mogą stanąć obok siebie w jednej wymianie kwestii: najpierw ocenić fakt łącznikiem es, potem osobno wyrazić zgodę formułą de acuerdo. Odpowiedź jest prosta: es verdad ocenia fakt łącznikiem ser, de acuerdo to osobna, niezmienna formuła zgody.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно попросить проверить факт?',
        uk: 'Як правильно попросити перевірити факт?',
        es: 'How do you correctly ask someone to check a fact?',
        'pt-BR': 'Como se pede corretamente para checar um fato?',
        vi: 'Cách đúng để hỏi kiểm tra một sự thật là gì?',
        id: 'Bagaimana cara meminta pemeriksaan fakta dengan benar?',
        tr: 'Bir gerçeğin kontrol edilmesi doğru şekilde nasıl istenir?',
        pl: 'Jak poprawnie poprosić o sprawdzenie faktu?',
      }),
      choices: [
        L({ ru: 'Es verdad', uk: 'Es verdad', es: 'Es verdad', 'pt-BR': 'Es verdad', vi: 'Es verdad', id: 'Es verdad', tr: 'Es verdad', pl: 'Es verdad' }),
        L({ ru: 'Es acuerdo', uk: 'Es acuerdo', es: 'Es acuerdo', 'pt-BR': 'Es acuerdo', vi: 'Es acuerdo', id: 'Es acuerdo', tr: 'Es acuerdo', pl: 'Es acuerdo' }),
        L({ ru: 'De verdad', uk: 'De verdad', es: 'De verdad', 'pt-BR': 'De verdad', vi: 'De verdad', id: 'De verdad', tr: 'De verdad', pl: 'De verdad' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Es verdad верно: связка es с существительным verdad. Es acuerdo путает связку и формулу согласия, De verdad путает предлог de с verdad.',
        uk: 'Es verdad правильно: зв’язка es з іменником verdad. Es acuerdo плутає зв’язку і формулу згоди, De verdad плутає прийменник de з verdad.',
        es: 'Es verdad is correct: the linking word es with the noun verdad. Es acuerdo mixes up the linking word with the agreement formula, De verdad mixes up the preposition de with verdad.',
        'pt-BR': 'Es verdad está correto: a ligação es com o substantivo verdad. Es acuerdo confunde a ligação com a fórmula de concordância, De verdad confunde a preposição de com verdad.',
        vi: 'Es verdad đúng: từ nối es với danh từ verdad. Es acuerdo nhầm từ nối với công thức đồng ý, De verdad nhầm giới từ de với verdad.',
        id: 'Es verdad benar: kata penghubung es dengan kata benda verdad. Es acuerdo mengacaukan kata penghubung dengan rumus persetujuan, De verdad mengacaukan preposisi de dengan verdad.',
        tr: 'Es verdad doğrudur: verdad isimli es bağlacı. Es acuerdo bağlacı onay formülüyle karıştırır, De verdad ise de edatını verdad ile karıştırır.',
        pl: 'Es verdad jest poprawne: łącznik es z rzeczownikiem verdad. Es acuerdo myli łącznik z formułą zgody, De verdad myli przyimek de z verdad.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Верно — не значит согласен',
      uk: 'Правда — не означає згоден',
      es: 'True does not mean agreed',
      'pt-BR': 'Verdadeiro não significa concordo',
      vi: 'Đúng không có nghĩa là đồng ý',
      id: 'Benar tidak berarti setuju',
      tr: 'Doğru olması katılmak anlamına gelmez',
      pl: 'Prawda nie znaczy zgoda',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Главная ловушка — решить, что Es verdad и De acuerdo взаимозаменяемы, раз обе звучат как позитивный отклик. На самом деле верно и обратное сочетание, ', semantic: 'explanation' }, { text: 'Es verdad, no de acuerdo', semantic: 'targetCorrect' }, { text: ': факт подтверждён, но говорящий не разделяет вывод из него. Вторая ловушка — спутать ', semantic: 'explanation' }, { text: 'Es igual', semantic: 'targetWrong' }, { text: ' с проверкой факта: ¿Es igual? спрашивает про безразличие, а не про истинность. Проверка простая: сомневаешься в самом факте — спрашивай ¿Es verdad?, хочешь выразить отношение к чужому выводу — используй de acuerdo или no de acuerdo.', semantic: 'explanation' }),
      uk: R({ text: 'Головна пастка — вирішити, що Es verdad і De acuerdo взаємозамінні, бо обидва звучать як позитивна відповідь. Насправді вірне й зворотне поєднання, ', semantic: 'explanation' }, { text: 'Es verdad, no de acuerdo', semantic: 'targetCorrect' }, { text: ': факт підтверджено, але мовець не поділяє висновок із нього. Друга пастка — сплутати ', semantic: 'explanation' }, { text: 'Es igual', semantic: 'targetWrong' }, { text: ' із перевіркою факту: ¿Es igual? запитує про байдужість, а не про істинність. Перевірка проста: сумніваєшся в самому факті — питай ¿Es verdad?, хочеш висловити ставлення до чужого висновку — використовуй de acuerdo чи no de acuerdo.', semantic: 'explanation' }),
      es: R({ text: 'The main trap is deciding that Es verdad and De acuerdo are interchangeable just because both sound like a positive response. In fact, the opposite combination is also valid, ', semantic: 'explanation' }, { text: 'Es verdad, no de acuerdo', semantic: 'targetCorrect' }, { text: ': the fact is confirmed, but the speaker does not share the conclusion drawn from it. The second trap is confusing ', semantic: 'explanation' }, { text: 'Es igual', semantic: 'targetWrong' }, { text: ' with checking a fact: ¿Es igual? asks about indifference, not truth. The check is simple: doubt the fact itself — ask ¿Es verdad?; want to express your stance on someone else\'s conclusion — use de acuerdo or no de acuerdo.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A armadilha principal é decidir que Es verdad e De acuerdo são intercambiáveis só porque ambos soam como uma resposta positiva. Na verdade, a combinação oposta também é válida, ', semantic: 'explanation' }, { text: 'Es verdad, no de acuerdo', semantic: 'targetCorrect' }, { text: ': o fato é confirmado, mas quem fala não compartilha a conclusão tirada dele. A segunda armadilha é confundir ', semantic: 'explanation' }, { text: 'Es igual', semantic: 'targetWrong' }, { text: ' com a checagem de um fato: ¿Es igual? pergunta sobre indiferença, não sobre a verdade. A checagem é simples: duvida do próprio fato — pergunte ¿Es verdad?; quer expressar sua posição sobre a conclusão de outra pessoa — use de acuerdo ou no de acuerdo.', semantic: 'explanation' }),
      vi: R({ text: 'Cái bẫy chính là cho rằng Es verdad và De acuerdo có thể thay thế cho nhau chỉ vì cả hai đều nghe như phản hồi tích cực. Thực tế, tổ hợp ngược lại cũng đúng, ', semantic: 'explanation' }, { text: 'Es verdad, no de acuerdo', semantic: 'targetCorrect' }, { text: ': sự thật được xác nhận, nhưng người nói không chia sẻ kết luận rút ra từ đó. Cái bẫy thứ hai là nhầm ', semantic: 'explanation' }, { text: 'Es igual', semantic: 'targetWrong' }, { text: ' với việc kiểm tra sự thật: ¿Es igual? hỏi về sự thờ ơ, không phải về tính đúng đắn. Cách kiểm tra đơn giản: nghi ngờ chính sự thật — hỏi ¿Es verdad?; muốn thể hiện quan điểm về kết luận của người khác — dùng de acuerdo hay no de acuerdo.', semantic: 'explanation' }),
      id: R({ text: 'Jebakan utama adalah memutuskan bahwa Es verdad dan De acuerdo bisa saling menggantikan hanya karena keduanya terdengar seperti respons positif. Faktanya, kombinasi sebaliknya juga berlaku, ', semantic: 'explanation' }, { text: 'Es verdad, no de acuerdo', semantic: 'targetCorrect' }, { text: ': faktanya dikonfirmasi, tetapi penutur tidak berbagi kesimpulan yang ditarik darinya. Jebakan kedua adalah mengacaukan ', semantic: 'explanation' }, { text: 'Es igual', semantic: 'targetWrong' }, { text: ' dengan memeriksa fakta: ¿Es igual? menanyakan tentang ketidakpedulian, bukan kebenaran. Pengecekannya sederhana: ragu pada faktanya sendiri — tanyakan ¿Es verdad?; ingin mengungkapkan sikap terhadap kesimpulan orang lain — gunakan de acuerdo atau no de acuerdo.', semantic: 'explanation' }),
      tr: R({ text: 'Asıl tuzak, ikisi de olumlu bir yanıt gibi duyulduğu için Es verdad ile De acuerdo\'nun birbirinin yerine geçtiğine karar vermektir. Aslında tam tersi birleşim de geçerlidir, ', semantic: 'explanation' }, { text: 'Es verdad, no de acuerdo', semantic: 'targetCorrect' }, { text: ': gerçek doğrulanmıştır, ama konuşan ondan çıkan sonucu paylaşmaz. İkinci tuzak, ', semantic: 'explanation' }, { text: 'Es igual', semantic: 'targetWrong' }, { text: '\'i bir gerçeği kontrol etmekle karıştırmaktır: ¿Es igual?, doğruluğu değil kayıtsızlığı sorar. Kontrol basittir: gerçeğin kendisinden şüphe ediyorsanız ¿Es verdad? diye sorun; başkasının sonucu hakkındaki tutumunuzu ifade etmek istiyorsanız de acuerdo ya da no de acuerdo kullanın.', semantic: 'explanation' }),
      pl: R({ text: 'Główna pułapka to uznanie, że Es verdad i De acuerdo są wymienne tylko dlatego, że oba brzmią jak pozytywna odpowiedź. W rzeczywistości poprawne jest też odwrotne połączenie, ', semantic: 'explanation' }, { text: 'Es verdad, no de acuerdo', semantic: 'targetCorrect' }, { text: ': fakt jest potwierdzony, ale mówiący nie podziela wniosku z niego wyciągniętego. Druga pułapka to mylenie ', semantic: 'explanation' }, { text: 'Es igual', semantic: 'targetWrong' }, { text: ' ze sprawdzaniem faktu: ¿Es igual? pyta o obojętność, nie o prawdziwość. Sprawdzenie jest proste: wątpisz w sam fakt — pytaj ¿Es verdad?; chcesz wyrazić stosunek do czyjegoś wniosku — użyj de acuerdo lub no de acuerdo.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Факт подтверждён, но говорящий не разделяет вывод. Как сказать?',
        uk: 'Факт підтверджено, але мовець не поділяє висновок. Як сказати?',
        es: 'The fact is confirmed, but the speaker disagrees with the conclusion. How do you say it?',
        'pt-BR': 'O fato é confirmado, mas quem fala discorda da conclusão. Como se diz isso?',
        vi: 'Sự thật được xác nhận, nhưng người nói không đồng ý với kết luận. Nói thế nào?',
        id: 'Faktanya dikonfirmasi, tetapi penutur tidak setuju dengan kesimpulannya. Bagaimana mengatakannya?',
        tr: 'Gerçek doğrulandı, ama konuşan sonuca katılmıyor. Nasıl söylenir?',
        pl: 'Fakt jest potwierdzony, ale mówiący nie zgadza się z wnioskiem. Jak to powiedzieć?',
      }),
      choices: [
        L({ ru: 'Es verdad, no de acuerdo', uk: 'Es verdad, no de acuerdo', es: 'Es verdad, no de acuerdo', 'pt-BR': 'Es verdad, no de acuerdo', vi: 'Es verdad, no de acuerdo', id: 'Es verdad, no de acuerdo', tr: 'Es verdad, no de acuerdo', pl: 'Es verdad, no de acuerdo' }),
        L({ ru: 'No es verdad, de acuerdo', uk: 'No es verdad, de acuerdo', es: 'No es verdad, de acuerdo', 'pt-BR': 'No es verdad, de acuerdo', vi: 'No es verdad, de acuerdo', id: 'No es verdad, de acuerdo', tr: 'No es verdad, de acuerdo', pl: 'No es verdad, de acuerdo' }),
        L({ ru: 'Es igual', uk: 'Es igual', es: 'Es igual', 'pt-BR': 'Es igual', vi: 'Es igual', id: 'Es igual', tr: 'Es igual', pl: 'Es igual' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Es verdad, no de acuerdo верно: факт подтверждён (Es verdad), но говорящий не согласен с выводом (no de acuerdo) — это разные вещи, и обе части могут звучать в одной паре реплик именно в таком сочетании.',
        uk: 'Es verdad, no de acuerdo правильно: факт підтверджено (Es verdad), але мовець не згоден із висновком (no de acuerdo) — це різні речі, і обидві частини можуть звучати в одній парі реплік саме в такому поєднанні.',
        es: 'Es verdad, no de acuerdo is correct: the fact is confirmed (Es verdad), but the speaker disagrees with the conclusion (no de acuerdo) — these are different things, and both parts can appear together in exactly this combination.',
        'pt-BR': 'Es verdad, no de acuerdo está correto: o fato é confirmado (Es verdad), mas quem fala discorda da conclusão (no de acuerdo) — são coisas diferentes, e as duas partes podem aparecer juntas exatamente nessa combinação.',
        vi: 'Es verdad, no de acuerdo đúng: sự thật được xác nhận (Es verdad), nhưng người nói không đồng ý với kết luận (no de acuerdo) — đây là những điều khác nhau, và cả hai phần có thể xuất hiện cùng nhau đúng theo tổ hợp này.',
        id: 'Es verdad, no de acuerdo benar: faktanya dikonfirmasi (Es verdad), tetapi penutur tidak setuju dengan kesimpulannya (no de acuerdo) — ini adalah hal yang berbeda, dan kedua bagian bisa muncul bersama persis dalam kombinasi ini.',
        tr: 'Es verdad, no de acuerdo doğrudur: gerçek doğrulanmıştır (Es verdad), ama konuşan sonuca katılmaz (no de acuerdo) — bunlar farklı şeylerdir ve her iki bölüm de tam olarak bu kombinasyonla bir arada görünebilir.',
        pl: 'Es verdad, no de acuerdo jest poprawne: fakt jest potwierdzony (Es verdad), ale mówiący nie zgadza się z wnioskiem (no de acuerdo) — to różne rzeczy, i obie części mogą wystąpić razem dokładnie w takim połączeniu.',
      }),
    },
  },
];
