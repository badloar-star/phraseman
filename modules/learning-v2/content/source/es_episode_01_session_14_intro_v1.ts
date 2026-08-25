import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 14 "Согласен или нет" / agreement_phrase, builtOn: [5, 10],
// recalls: [5, 10]): три страницы вводят de acuerdo — устойчивую формулу
// согласия, неизменяемую как igual (recall 5), звучащую как ответ на
// вопрос (recall 10).
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_14_WORD_FIRST_TITLE = L({
  ru: 'Согласен или нет',
  uk: 'Згоден чи ні',
  es: 'Agreed or not',
  'pt-BR': 'Concordo ou não',
  vi: 'Đồng ý hay không',
  id: 'Setuju atau tidak',
  tr: 'Katılıyorum ya da değilim',
  pl: 'Zgadzam się czy nie',
});

export const ES_EPISODE_01_SESSION_14_WORD_FIRST_SUMMARY = L({
  ru: 'Одно новое выражение — de acuerdo — служит самостоятельной репликой согласия, неизменяемой ни по роду, ни по числу.',
  uk: 'Один новий вислів — de acuerdo — слугує самостійною реплікою згоди, незмінною ні за родом, ні за числом.',
  es: 'One new expression — de acuerdo — serves as a standalone reply of agreement, unchanging by gender or number.',
  'pt-BR': 'Uma expressão nova — de acuerdo — serve como uma resposta independente de concordância, invariável por gênero ou número.',
  vi: 'Một cách diễn đạt mới — de acuerdo — dùng như một câu trả lời độc lập thể hiện sự đồng ý, không đổi theo giống hay số.',
  id: 'Satu ungkapan baru — de acuerdo — berfungsi sebagai balasan mandiri persetujuan, tidak berubah oleh gender atau jumlah.',
  tr: 'Bir yeni ifade — de acuerdo — cinsiyete ya da sayıya göre değişmeyen bağımsız bir onay yanıtı olarak işlev görür.',
  pl: 'Jedno nowe wyrażenie — de acuerdo — służy jako samodzielna odpowiedź wyrażająca zgodę, niezmienna przez rodzaj czy liczbę.',
});

export const ES_EPISODE_01_SESSION_14_WORD_FIRST_GOAL = L({
  ru: 'Узнать на слух, понять и точно написать de acuerdo как реакцию на чужое мнение, отдельно от verdad и igual.',
  uk: 'Упізнати на слух, зрозуміти й точно написати de acuerdo як реакцію на чужу думку, окремо від verdad та igual.',
  es: 'Recognize by ear, understand, and correctly write de acuerdo as a reaction to someone else\'s opinion, distinct from verdad and igual.',
  'pt-BR': 'Reconhecer de ouvido, entender e escrever corretamente de acuerdo como uma reação à opinião de outra pessoa, distinta de verdad e igual.',
  vi: 'Nghe ra, hiểu và viết đúng de acuerdo như một phản ứng với ý kiến của người khác, tách biệt với verdad và igual.',
  id: 'Mengenali dari suara, memahami, dan menulis de acuerdo dengan tepat sebagai reaksi terhadap pendapat orang lain, berbeda dari verdad dan igual.',
  tr: 'De acuerdo\'yu başkasının fikrine bir tepki olarak duyup tanımak, anlamak ve doğru yazmak; verdad ve igual\'den ayırt etmek.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i poprawnie zapisać de acuerdo jako reakcję na czyjąś opinię, odróżniając je od verdad i igual.',
});

const CONCEPT_BODY = L({
  ru: 'De acuerdo — устойчивая реакция на чужое мнение или предложение, которую говорят целиком, двумя словами сразу. Она отличается от verdad, которая подтверждает факт как истинный: verdad про правду самого утверждения, de acuerdo — про то, что говорящий согласен с точкой зрения. Она отличается и от igual, которая выражает безразличие «без разницы» — совсем не то же самое, что активное согласие. De acuerdo, как и igual, не меняется по роду или числу, потому что это застывшая формула, а не прилагательное, согласующееся с подлежащим. Ответ прост: de acuerdo выражает согласие с мнением, а не подтверждение факта и не безразличие.',
  uk: 'De acuerdo — стала реакція на чужу думку чи пропозицію, яку кажуть цілком, двома словами одразу. Вона відрізняється від verdad, яка підтверджує факт як істинний: verdad про правду самого твердження, de acuerdo — про те, що мовець згоден з точкою зору. Вона відрізняється і від igual, яка висловлює байдужість «без різниці» — зовсім не те саме, що активна згода. De acuerdo, як і igual, не змінюється за родом чи числом, бо це застигла формула, а не прикметник, що узгоджується з підметом. Відповідь проста: de acuerdo висловлює згоду з думкою, а не підтвердження факту і не байдужість.',
  es: 'De acuerdo is a fixed reaction to someone else\'s opinion or proposal, said as a whole, two words at once. It differs from verdad, which confirms a fact as true: verdad is about the truth of the statement itself, de acuerdo is about the speaker agreeing with a point of view. It also differs from igual, which expresses indifference, "no difference" — not the same thing as active agreement. De acuerdo, like igual, does not change by gender or number, because it is a fixed formula, not an adjective agreeing with a subject. The answer is simple: de acuerdo expresses agreement with an opinion, not confirmation of a fact and not indifference.',
  'pt-BR': 'De acuerdo é uma reação fixa à opinião ou proposta de outra pessoa, dita por inteiro, duas palavras de uma vez. Ela difere de verdad, que confirma um fato como verdadeiro: verdad é sobre a verdade da própria afirmação, de acuerdo é sobre quem fala concordar com um ponto de vista. Também difere de igual, que expressa indiferença, "tanto faz" — não é a mesma coisa que concordância ativa. De acuerdo, como igual, não muda por gênero ou número, porque é uma fórmula fixa, não um adjetivo que concorda com um sujeito. A resposta é simples: de acuerdo expressa concordância com uma opinião, não confirmação de um fato nem indiferença.',
  vi: 'De acuerdo là một phản ứng cố định với ý kiến hay đề xuất của người khác, được nói trọn vẹn, hai từ cùng lúc. Nó khác với verdad, thứ xác nhận một sự thật là đúng: verdad nói về sự thật của chính lời khẳng định, de acuerdo nói về việc người nói đồng ý với một quan điểm. Nó cũng khác với igual, thứ thể hiện sự thờ ơ, "không khác gì" — không giống với sự đồng ý chủ động. De acuerdo, giống như igual, không đổi theo giống hay số, vì đó là một công thức cố định, không phải tính từ hòa hợp với chủ ngữ. Câu trả lời rất đơn giản: de acuerdo thể hiện sự đồng ý với một ý kiến, không phải xác nhận sự thật hay thờ ơ.',
  id: 'De acuerdo adalah reaksi tetap terhadap pendapat atau usulan orang lain, diucapkan secara utuh, dua kata sekaligus. Ini berbeda dari verdad, yang mengonfirmasi fakta sebagai benar: verdad tentang kebenaran pernyataan itu sendiri, de acuerdo tentang penutur setuju dengan sudut pandang. Ini juga berbeda dari igual, yang mengungkapkan ketidakpedulian, "tidak ada bedanya" — bukan hal yang sama dengan persetujuan aktif. De acuerdo, seperti igual, tidak berubah menurut gender atau jumlah, karena itu adalah rumus tetap, bukan kata sifat yang sesuai dengan subjek. Jawabannya sederhana: de acuerdo mengungkapkan persetujuan dengan pendapat, bukan konfirmasi fakta dan bukan ketidakpedulian.',
  tr: 'De acuerdo, başkasının fikrine ya da önerisine karşı bütün olarak, iki kelime birden söylenen sabit bir tepkidir. Bir gerçeği doğru olarak onaylayan verdad\'dan farklıdır: verdad ifadenin kendisinin doğruluğuyla ilgilidir, de acuerdo ise konuşanın bir görüşe katılmasıyla ilgilidir. Kayıtsızlığı, "farketmez"i ifade eden igual\'den de farklıdır — aktif katılımla aynı şey değildir. De acuerdo, igual gibi, cinsiyete ya da sayıya göre değişmez, çünkü bu özneyle uyum sağlayan bir sıfat değil, sabit bir formüldür. Cevap basittir: de acuerdo bir fikre katılımı ifade eder, bir gerçeğin onaylanmasını ya da kayıtsızlığı değil.',
  pl: 'De acuerdo to utrwalona reakcja na czyjąś opinię lub propozycję, wypowiadana w całości, od razu dwoma słowami. Różni się od verdad, które potwierdza fakt jako prawdziwy: verdad dotyczy prawdziwości samego twierdzenia, de acuerdo dotyczy tego, że mówiący zgadza się z punktem widzenia. Różni się też od igual, które wyraża obojętność, „bez różnicy” — to nie to samo, co aktywna zgoda. De acuerdo, podobnie jak igual, nie zmienia się przez rodzaj ani liczbę, ponieważ jest to utrwalona formuła, a nie przymiotnik zgadzający się z podmiotem. Odpowiedź jest prosta: de acuerdo wyraża zgodę z opinią, nie potwierdzenie faktu ani obojętność.',
});

const FORMULA_BODY = L({
  ru: 'De acuerdo можно использовать двумя способами: как самостоятельную реплику — просто De acuerdo в ответ на чью-то мысль — или как часть вопроса с eres: ¿Eres de acuerdo? Тот же принцип, что и с любым другим вопросом: порядок слов не меняется, разницу делают знаки ¿? и интонация. Форма de acuerdo остаётся одинаковой всегда — и в вопросе, и в утверждении, и с мужчиной, и с женщиной, потому что это застывшая формула, а не прилагательное. Ответ прост: нет, форма всегда одна.',
  uk: 'De acuerdo можна використовувати двома способами: як самостійну репліку — просто De acuerdo у відповідь на чиюсь думку — або як частину питання з eres: ¿Eres de acuerdo? Той самий принцип, що й з будь-яким іншим питанням: порядок слів не змінюється, різницю роблять знаки ¿? та інтонація. Форма de acuerdo лишається однаковою завжди — і в питанні, і в твердженні, і з чоловіком, і з жінкою, бо це застигла формула, а не прикметник. Відповідь проста: ні, форма завжди одна.',
  es: 'De acuerdo can be used in two ways: as a standalone reply — simply De acuerdo in response to someone\'s thought — or as part of a question with eres: ¿Eres de acuerdo? The same principle as with any other question: the word order does not change, the marks ¿? and the intonation make the difference. The form de acuerdo stays the same always — in a question, in a statement, with a man, with a woman — because it is a fixed formula, not an adjective. The answer is simple: no, the form is always the same.',
  'pt-BR': 'De acuerdo pode ser usado de duas formas: como uma resposta independente — simplesmente De acuerdo em resposta ao pensamento de alguém — ou como parte de uma pergunta com eres: ¿Eres de acuerdo? O mesmo princípio de qualquer outra pergunta: a ordem das palavras não muda, os sinais ¿? e a entonação fazem a diferença. A forma de acuerdo permanece a mesma sempre — numa pergunta, numa afirmação, com um homem, com uma mulher — porque é uma fórmula fixa, não um adjetivo. A resposta é simples: não, a forma é sempre a mesma.',
  vi: 'De acuerdo có thể dùng theo hai cách: như một câu trả lời độc lập — chỉ đơn giản De acuerdo để đáp lại suy nghĩ của ai đó — hoặc như một phần của câu hỏi với eres: ¿Eres de acuerdo? Cùng nguyên tắc như bất kỳ câu hỏi nào khác: trật tự từ không đổi, dấu ¿? và ngữ điệu tạo ra khác biệt. Dạng de acuerdo luôn giữ nguyên — trong câu hỏi, trong câu khẳng định, với đàn ông, với phụ nữ — vì đó là công thức cố định, không phải tính từ. Câu trả lời rất đơn giản: không, dạng luôn giữ nguyên.',
  id: 'De acuerdo dapat digunakan dengan dua cara: sebagai balasan mandiri — cukup De acuerdo sebagai respons terhadap pemikiran seseorang — atau sebagai bagian dari pertanyaan dengan eres: ¿Eres de acuerdo? Prinsip yang sama seperti pertanyaan lainnya: urutan kata tidak berubah, tanda ¿? dan intonasi membuat perbedaan. Bentuk de acuerdo selalu tetap sama — dalam pertanyaan, dalam pernyataan, dengan pria, dengan wanita — karena itu adalah rumus tetap, bukan kata sifat. Jawabannya sederhana: tidak, bentuknya selalu sama.',
  tr: 'De acuerdo iki şekilde kullanılabilir: bağımsız bir yanıt olarak — birinin düşüncesine yanıt olarak sadece De acuerdo — ya da eres ile bir sorunun parçası olarak: ¿Eres de acuerdo? Herhangi bir soruyla aynı ilke: kelime sırası değişmez, farkı ¿? işaretleri ve tonlama yaratır. De acuerdo biçimi her zaman aynı kalır — soruda, ifadede, bir erkekle, bir kadınla — çünkü bu sabit bir formüldür, bir sıfat değildir. Cevap basittir: hayır, biçim her zaman aynıdır.',
  pl: 'De acuerdo można używać na dwa sposoby: jako samodzielną odpowiedź — po prostu De acuerdo w odpowiedzi na czyjąś myśl — albo jako część pytania z eres: ¿Eres de acuerdo? Ta sama zasada co w każdym innym pytaniu: kolejność słów się nie zmienia, różnicę tworzą znaki ¿? i intonacja. Forma de acuerdo zawsze pozostaje taka sama — w pytaniu, w twierdzeniu, z mężczyzną, z kobietą — ponieważ jest to utrwalona formuła, nie przymiotnik. Odpowiedź jest prosta: nie, forma jest zawsze taka sama.',
});

const TRAP_BODY = L({
  ru: 'Легко перепутать de acuerdo с es verdad, ведь обе фразы звучат как реакция на чужие слова: но es verdad подтверждает правдивость факта, а de acuerdo — согласие с мнением, и подменить одно другим нельзя. Вторая ловушка — сказать es igual вместо de acuerdo, думая, что оба выражают положительный отклик: на самом деле es igual означает безразличие, «мне всё равно», а не согласие. Третья ошибка — написать deacuerdo слитно, одним словом: это неверно, de acuerdo всегда пишется через пробел, двумя словами. Проверка простая: если хочешь выразить согласие с мнением — только de acuerdo, ничто другое не подходит.',
  uk: 'Легко сплутати de acuerdo з es verdad, адже обидві фрази звучать як реакція на чужі слова: але es verdad підтверджує правдивість факту, а de acuerdo — згоду з думкою, і підмінити одне іншим не можна. Друга пастка — сказати es igual замість de acuerdo, думаючи, що обидва висловлюють позитивний відгук: насправді es igual означає байдужість, «мені байдуже», а не згоду. Третя помилка — написати deacuerdo разом, одним словом: це неправильно, de acuerdo завжди пишеться через пробіл, двома словами. Перевірка проста: якщо хочеш висловити згоду з думкою — тільки de acuerdo, ніщо інше не підходить.',
  es: 'It is easy to confuse de acuerdo with es verdad, since both phrases sound like a reaction to someone else\'s words: but es verdad confirms the truthfulness of a fact, while de acuerdo confirms agreement with an opinion, and one cannot substitute for the other. The second trap is saying es igual instead of de acuerdo, thinking both express a positive response: in fact es igual means indifference, "I don\'t care", not agreement. The third mistake is writing deacuerdo together, as one word: this is wrong, de acuerdo is always written with a space, as two words. The check is simple: if you want to express agreement with an opinion — only de acuerdo fits, nothing else.',
  'pt-BR': 'É fácil confundir de acuerdo com es verdad, já que ambas as frases soam como uma reação às palavras de outra pessoa: mas es verdad confirma a veracidade de um fato, enquanto de acuerdo confirma concordância com uma opinião, e uma não pode substituir a outra. A segunda armadilha é dizer es igual em vez de de acuerdo, pensando que ambas expressam uma resposta positiva: na verdade es igual significa indiferença, "tanto faz para mim", não concordância. O terceiro erro é escrever deacuerdo junto, como uma palavra só: isso está errado, de acuerdo sempre se escreve com espaço, duas palavras. A checagem é simples: se você quer expressar concordância com uma opinião — só de acuerdo cabe, nada mais.',
  vi: 'Dễ nhầm lẫn de acuerdo với es verdad, vì cả hai câu đều nghe như phản ứng với lời của người khác: nhưng es verdad xác nhận tính đúng đắn của một sự thật, còn de acuerdo xác nhận sự đồng ý với một ý kiến, và không thể thay thế cái này bằng cái kia. Cái bẫy thứ hai là nói es igual thay vì de acuerdo, nghĩ rằng cả hai đều thể hiện phản hồi tích cực: thực ra es igual nghĩa là thờ ơ, "tôi không quan tâm", không phải đồng ý. Lỗi thứ ba là viết deacuerdo liền nhau, thành một từ: điều này sai, de acuerdo luôn viết cách nhau, hai từ. Cách kiểm tra đơn giản: nếu muốn thể hiện sự đồng ý với một ý kiến — chỉ de acuerdo phù hợp, không gì khác.',
  id: 'Mudah mengacaukan de acuerdo dengan es verdad, karena kedua frasa terdengar seperti reaksi terhadap kata orang lain: tetapi es verdad mengonfirmasi kebenaran fakta, sedangkan de acuerdo mengonfirmasi persetujuan dengan pendapat. Jebakan kedua adalah mengatakan es igual alih-alih de acuerdo, berpikir keduanya respons positif: es igual berarti ketidakpedulian, "aku tidak peduli", bukan persetujuan. Kesalahan ketiga adalah menulis deacuerdo bersambung: ini salah, de acuerdo selalu ditulis dengan spasi, dua kata. Pengecekannya sederhana: hanya de acuerdo yang cocok untuk persetujuan.',
  tr: 'De acuerdo\'yu es verdad ile karıştırmak kolaydır, çünkü her iki ifade de başkasının sözlerine bir tepki gibi duyulur: ama es verdad bir gerçeğin doğruluğunu onaylar, de acuerdo ise bir fikre katılımı onaylar, ve biri diğerinin yerini alamaz. İkinci tuzak, ikisinin de olumlu bir yanıt ifade ettiğini düşünerek de acuerdo yerine es igual demektir: aslında es igual kayıtsızlık, "umurumda değil" demektir, katılım değil. Üçüncü hata, deacuerdo\'yu bitişik, tek kelime olarak yazmaktır: bu yanlıştır, de acuerdo her zaman boşlukla, iki kelime olarak yazılır. Kontrol basittir: bir fikre katılımı ifade etmek istiyorsanız — yalnızca de acuerdo uyar, başka hiçbir şey değil.',
  pl: 'Łatwo pomylić de acuerdo z es verdad, ponieważ obie frazy brzmią jak reakcja na czyjeś słowa: ale es verdad potwierdza prawdziwość faktu, a de acuerdo potwierdza zgodę z opinią, i jedno nie może zastąpić drugiego. Druga pułapka to powiedzenie es igual zamiast de acuerdo, myśląc, że obie wyrażają pozytywną odpowiedź: w rzeczywistości es igual znaczy obojętność, „wszystko mi jedno”, nie zgodę. Trzeci błąd to napisanie deacuerdo razem, jako jedno słowo: to błąd, de acuerdo zawsze pisze się z odstępem, dwoma słowami. Sprawdzenie jest proste: jeśli chcesz wyrazić zgodę z opinią — pasuje tylko de acuerdo, nic innego.',
});

export const ES_EPISODE_01_SESSION_14_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Согласие — не факт и не безразличие',
      uk: 'Згода — не факт і не байдужість',
      es: 'Agreement is not a fact and not indifference',
      'pt-BR': 'Concordância não é fato nem indiferença',
      vi: 'Đồng ý không phải sự thật và không phải thờ ơ',
      id: 'Persetujuan bukan fakta dan bukan ketidakpedulian',
      tr: 'Katılım bir gerçek ya da kayıtsızlık değildir',
      pl: 'Zgoda to nie fakt ani obojętność',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'De acuerdo — устойчивая реакция на чужое мнение или предложение, которую говорят целиком, двумя словами сразу. Она отличается от verdad, которая подтверждает факт как истинный: verdad про правду самого утверждения, ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ' — про то, что говорящий согласен с точкой зрения. Она отличается и от igual, которая выражает безразличие «без разницы» — совсем не то же самое, что активное согласие. De acuerdo, как и igual, не меняется по роду или числу, потому что это застывшая формула, а не прилагательное, согласующееся с подлежащим. Ответ прост: de acuerdo выражает согласие с мнением, а не подтверждение факта и не безразличие.', semantic: 'explanation' }),
      uk: R({ text: 'De acuerdo — стала реакція на чужу думку чи пропозицію, яку кажуть цілком, двома словами одразу. Вона відрізняється від verdad, яка підтверджує факт як істинний: verdad про правду самого твердження, ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ' — про те, що мовець згоден з точкою зору. Вона відрізняється і від igual, яка висловлює байдужість «без різниці» — зовсім не те саме, що активна згода. De acuerdo, як і igual, не змінюється за родом чи числом, бо це застигла формула, а не прикметник, що узгоджується з підметом. Відповідь проста: de acuerdo висловлює згоду з думкою, а не підтвердження факту і не байдужість.', semantic: 'explanation' }),
      es: R({ text: 'De acuerdo is a fixed reaction to someone else\'s opinion or proposal, said as a whole, two words at once. It differs from verdad, which confirms a fact as true: verdad is about the truth of the statement itself, ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ' is about the speaker agreeing with a point of view. It also differs from igual, which expresses indifference, "no difference" — not the same thing as active agreement. De acuerdo, like igual, does not change by gender or number, because it is a fixed formula, not an adjective agreeing with a subject. The answer is simple: de acuerdo expresses agreement with an opinion, not confirmation of a fact and not indifference.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'De acuerdo é uma reação fixa à opinião ou proposta de outra pessoa, dita por inteiro, duas palavras de uma vez. Ela difere de verdad, que confirma um fato como verdadeiro: verdad é sobre a verdade da própria afirmação, ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ' é sobre quem fala concordar com um ponto de vista. Também difere de igual, que expressa indiferença, "tanto faz" — não é a mesma coisa que concordância ativa. De acuerdo, como igual, não muda por gênero ou número, porque é uma fórmula fixa, não um adjetivo que concorda com um sujeito. A resposta é simples: de acuerdo expressa concordância com uma opinião, não confirmação de um fato nem indiferença.', semantic: 'explanation' }),
      vi: R({ text: 'De acuerdo là một phản ứng cố định với ý kiến hay đề xuất của người khác, được nói trọn vẹn, hai từ cùng lúc. Nó khác với verdad, thứ xác nhận một sự thật là đúng: verdad nói về sự thật của chính lời khẳng định, ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ' nói về việc người nói đồng ý với một quan điểm. Nó cũng khác với igual, thứ thể hiện sự thờ ơ, "không khác gì" — không giống với sự đồng ý chủ động. De acuerdo, giống như igual, không đổi theo giống hay số, vì đó là một công thức cố định, không phải tính từ hòa hợp với chủ ngữ. Câu trả lời rất đơn giản: de acuerdo thể hiện sự đồng ý với một ý kiến, không phải xác nhận sự thật hay thờ ơ.', semantic: 'explanation' }),
      id: R({ text: 'De acuerdo adalah reaksi tetap terhadap pendapat atau usulan orang lain, diucapkan secara utuh, dua kata sekaligus. Ini berbeda dari verdad, yang mengonfirmasi fakta sebagai benar: verdad tentang kebenaran pernyataan itu sendiri, ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ' tentang penutur setuju dengan sudut pandang. Ini juga berbeda dari igual, yang mengungkapkan ketidakpedulian, "tidak ada bedanya" — bukan hal yang sama dengan persetujuan aktif. De acuerdo, seperti igual, tidak berubah menurut gender atau jumlah, karena itu adalah rumus tetap, bukan kata sifat yang sesuai dengan subjek. Jawabannya sederhana: de acuerdo mengungkapkan persetujuan dengan pendapat, bukan konfirmasi fakta dan bukan ketidakpedulian.', semantic: 'explanation' }),
      tr: R({ text: 'De acuerdo, başkasının fikrine ya da önerisine karşı bütün olarak, iki kelime birden söylenen sabit bir tepkidir. Bir gerçeği doğru olarak onaylayan verdad\'dan farklıdır: verdad ifadenin kendisinin doğruluğuyla ilgilidir, ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ' ise konuşanın bir görüşe katılmasıyla ilgilidir. Kayıtsızlığı, "farketmez"i ifade eden igual\'den de farklıdır — aktif katılımla aynı şey değildir. De acuerdo, igual gibi, cinsiyete ya da sayıya göre değişmez, çünkü bu özneyle uyum sağlayan bir sıfat değil, sabit bir formüldür. Cevap basittir: de acuerdo bir fikre katılımı ifade eder, bir gerçeğin onaylanmasını ya da kayıtsızlığı değil.', semantic: 'explanation' }),
      pl: R({ text: 'De acuerdo to utrwalona reakcja na czyjąś opinię lub propozycję, wypowiadana w całości, od razu dwoma słowami. Różni się od verdad, które potwierdza fakt jako prawdziwy: verdad dotyczy prawdziwości samego twierdzenia, ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ' dotyczy tego, że mówiący zgadza się z punktem widzenia. Różni się też od igual, które wyraża obojętność, „bez różnicy” — to nie to samo, co aktywna zgoda. De acuerdo, podobnie jak igual, nie zmienia się przez rodzaj ani liczbę, ponieważ jest to utrwalona formuła, a nie przymiotnik zgadzający się z podmiotem. Odpowiedź jest prosta: de acuerdo wyraża zgodę z opinią, nie potwierdzenie faktu ani obojętność.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что выражает de acuerdo?',
        uk: 'Що виражає de acuerdo?',
        es: 'What does de acuerdo express?',
        'pt-BR': 'O que de acuerdo expressa?',
        vi: 'De acuerdo thể hiện điều gì?',
        id: 'Apa yang diungkapkan de acuerdo?',
        tr: 'De acuerdo neyi ifade eder?',
        pl: 'Co wyraża de acuerdo?',
      }),
      choices: [
        L({ ru: 'Согласие с мнением', uk: 'Згоду з думкою', es: 'Agreement with an opinion', 'pt-BR': 'Concordância com uma opinião', vi: 'Sự đồng ý với một ý kiến', id: 'Persetujuan dengan pendapat', tr: 'Bir fikre katılım', pl: 'Zgodę z opinią' }),
        L({ ru: 'Подтверждение факта', uk: 'Підтвердження факту', es: 'Confirmation of a fact', 'pt-BR': 'Confirmação de um fato', vi: 'Xác nhận một sự thật', id: 'Konfirmasi fakta', tr: 'Bir gerçeğin onaylanması', pl: 'Potwierdzenie faktu' }),
        L({ ru: 'Безразличие', uk: 'Байдужість', es: 'Indifference', 'pt-BR': 'Indiferença', vi: 'Sự thờ ơ', id: 'Ketidakpedulian', tr: 'Kayıtsızlık', pl: 'Obojętność' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'De acuerdo выражает именно согласие с мнением — не подтверждение факта (это verdad) и не безразличие (это igual).',
        uk: 'De acuerdo виражає саме згоду з думкою — не підтвердження факту (це verdad) і не байдужість (це igual).',
        es: 'De acuerdo expresses exactly agreement with an opinion — not confirmation of a fact (that is verdad) and not indifference (that is igual).',
        'pt-BR': 'De acuerdo expressa exatamente concordância com uma opinião — não confirmação de um fato (isso é verdad) nem indiferença (isso é igual).',
        vi: 'De acuerdo thể hiện chính xác sự đồng ý với một ý kiến — không phải xác nhận sự thật (đó là verdad) và không phải thờ ơ (đó là igual).',
        id: 'De acuerdo mengungkapkan tepatnya persetujuan dengan pendapat — bukan konfirmasi fakta (itu verdad) dan bukan ketidakpedulian (itu igual).',
        tr: 'De acuerdo tam olarak bir fikre katılımı ifade eder — bir gerçeğin onaylanması değil (bu verdad\'dır) ve kayıtsızlık değil (bu igual\'dir).',
        pl: 'De acuerdo wyraża dokładnie zgodę z opinią — nie potwierdzenie faktu (to verdad) i nie obojętność (to igual).',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'De acuerdo не согласуется ни с чем',
      uk: 'De acuerdo не узгоджується ні з чим',
      es: 'De acuerdo agrees with nothing',
      'pt-BR': 'De acuerdo não concorda com nada',
      vi: 'De acuerdo không hòa hợp với gì',
      id: 'De acuerdo tidak sesuai dengan apa pun',
      tr: 'De acuerdo hiçbir şeyle uyum sağlamaz',
      pl: 'De acuerdo nie zgadza się z niczym',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'De acuerdo можно использовать двумя способами: как самостоятельную реплику — просто De acuerdo в ответ на чью-то мысль — или как часть вопроса с eres: ', semantic: 'explanation' }, { text: '¿Eres de acuerdo?', semantic: 'targetCorrect' }, { text: ' Тот же принцип, что и с любым другим вопросом: порядок слов не меняется, разницу делают знаки ¿? и интонация. Форма de acuerdo остаётся одинаковой всегда — и в вопросе, и в утверждении, и с мужчиной, и с женщиной, потому что это застывшая формула, а не прилагательное. Ответ прост: de acuerdo не согласуется ни с чем — ни с родом, ни с числом собеседника.', semantic: 'explanation' }),
      uk: R({ text: 'De acuerdo можна використовувати двома способами: як самостійну репліку — просто De acuerdo у відповідь на чиюсь думку — або як частину питання з eres: ', semantic: 'explanation' }, { text: '¿Eres de acuerdo?', semantic: 'targetCorrect' }, { text: ' Той самий принцип, що й з будь-яким іншим питанням: порядок слів не змінюється, різницю роблять знаки ¿? та інтонація. Форма de acuerdo лишається однаковою завжди — і в питанні, і в твердженні, і з чоловіком, і з жінкою, бо це застигла формула, а не прикметник. Відповідь проста: de acuerdo не узгоджується ні з чим — ні з родом, ні з числом співрозмовника.', semantic: 'explanation' }),
      es: R({ text: 'De acuerdo can be used in two ways: as a standalone reply — simply De acuerdo in response to someone\'s thought — or as part of a question with eres: ', semantic: 'explanation' }, { text: '¿Eres de acuerdo?', semantic: 'targetCorrect' }, { text: ' The same principle as with any other question: the word order does not change, the marks ¿? and the intonation make the difference. The form de acuerdo stays the same always — in a question, in a statement, with a man, with a woman — because it is a fixed formula, not an adjective. The answer is simple: de acuerdo agrees with nothing — not the listener\'s gender, not their number.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'De acuerdo pode ser usado de duas formas: como uma resposta independente — simplesmente De acuerdo em resposta ao pensamento de alguém — ou como parte de uma pergunta com eres: ', semantic: 'explanation' }, { text: '¿Eres de acuerdo?', semantic: 'targetCorrect' }, { text: ' O mesmo princípio de qualquer outra pergunta: a ordem das palavras não muda, os sinais ¿? e a entonação fazem a diferença. A forma de acuerdo permanece a mesma sempre — numa pergunta, numa afirmação, com um homem, com uma mulher — porque é uma fórmula fixa, não um adjetivo. A resposta é simples: de acuerdo não concorda com nada — nem com o gênero, nem com o número do interlocutor.', semantic: 'explanation' }),
      vi: R({ text: 'De acuerdo có thể dùng theo hai cách: như một câu trả lời độc lập — chỉ đơn giản De acuerdo để đáp lại suy nghĩ của ai đó — hoặc như một phần của câu hỏi với eres: ', semantic: 'explanation' }, { text: '¿Eres de acuerdo?', semantic: 'targetCorrect' }, { text: ' Cùng nguyên tắc như bất kỳ câu hỏi nào khác: trật tự từ không đổi, dấu ¿? và ngữ điệu tạo ra khác biệt. Dạng de acuerdo luôn giữ nguyên — trong câu hỏi, trong câu khẳng định, với đàn ông, với phụ nữ — vì đó là công thức cố định, không phải tính từ. Câu trả lời rất đơn giản: de acuerdo không hòa hợp với gì cả — không phải giống, không phải số của người nghe.', semantic: 'explanation' }),
      id: R({ text: 'De acuerdo dapat digunakan dengan dua cara: sebagai balasan mandiri — cukup De acuerdo sebagai respons terhadap pemikiran seseorang — atau sebagai bagian dari pertanyaan dengan eres: ', semantic: 'explanation' }, { text: '¿Eres de acuerdo?', semantic: 'targetCorrect' }, { text: ' Prinsip yang sama seperti pertanyaan lainnya: urutan kata tidak berubah, tanda ¿? dan intonasi membuat perbedaan. Bentuk de acuerdo selalu tetap sama — dalam pertanyaan, dalam pernyataan, dengan pria, dengan wanita — karena itu adalah rumus tetap, bukan kata sifat. Jawabannya sederhana: de acuerdo tidak sesuai dengan apa pun — bukan gender, bukan jumlah pendengar.', semantic: 'explanation' }),
      tr: R({ text: 'De acuerdo iki şekilde kullanılabilir: bağımsız bir yanıt olarak — birinin düşüncesine yanıt olarak sadece De acuerdo — ya da eres ile bir sorunun parçası olarak: ', semantic: 'explanation' }, { text: '¿Eres de acuerdo?', semantic: 'targetCorrect' }, { text: ' Herhangi bir soruyla aynı ilke: kelime sırası değişmez, farkı ¿? işaretleri ve tonlama yaratır. De acuerdo biçimi her zaman aynı kalır — soruda, ifadede, bir erkekle, bir kadınla — çünkü bu sabit bir formüldür, bir sıfat değildir. Cevap basittir: de acuerdo hiçbir şeyle uyum sağlamaz — ne dinleyicinin cinsiyeti ne de sayısıyla.', semantic: 'explanation' }),
      pl: R({ text: 'De acuerdo można używać na dwa sposoby: jako samodzielną odpowiedź — po prostu De acuerdo w odpowiedzi na czyjąś myśl — albo jako część pytania z eres: ', semantic: 'explanation' }, { text: '¿Eres de acuerdo?', semantic: 'targetCorrect' }, { text: ' Ta sama zasada co w każdym innym pytaniu: kolejność słów się nie zmienia, różnicę tworzą znaki ¿? i intonacja. Forma de acuerdo zawsze pozostaje taka sama — w pytaniu, w twierdzeniu, z mężczyzną, z kobietą — ponieważ jest to utrwalona formuła, nie przymiotnik. Odpowiedź jest prosta: de acuerdo nie zgadza się z niczym — ani z rodzajem, ani z liczbą słuchacza.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Меняется ли de acuerdo по роду собеседника?',
        uk: 'Чи змінюється de acuerdo за родом співрозмовника?',
        es: 'Does de acuerdo change by the listener\'s gender?',
        'pt-BR': 'De acuerdo muda pelo gênero do interlocutor?',
        vi: 'De acuerdo có đổi theo giống của người nghe không?',
        id: 'Apakah de acuerdo berubah menurut gender pendengar?',
        tr: 'De acuerdo dinleyicinin cinsiyetine göre değişir mi?',
        pl: 'Czy de acuerdo zmienia się przez rodzaj słuchacza?',
      }),
      choices: [
        L({ ru: 'Нет, форма всегда одна', uk: 'Ні, форма завжди одна', es: 'No, the form is always the same', 'pt-BR': 'Não, a forma é sempre a mesma', vi: 'Không, dạng luôn giữ nguyên', id: 'Tidak, bentuknya selalu sama', tr: 'Hayır, biçim her zaman aynıdır', pl: 'Nie, forma jest zawsze taka sama' }),
        L({ ru: 'Да, как bonito/bonita', uk: 'Так, як bonito/bonita', es: 'Yes, like bonito/bonita', 'pt-BR': 'Sim, como bonito/bonita', vi: 'Có, giống bonito/bonita', id: 'Ya, seperti bonito/bonita', tr: 'Evet, bonito/bonita gibi', pl: 'Tak, jak bonito/bonita' }),
        L({ ru: 'Только в вопросе', uk: 'Тільки в питанні', es: 'Only in a question', 'pt-BR': 'Só numa pergunta', vi: 'Chỉ trong câu hỏi', id: 'Hanya dalam pertanyaan', tr: 'Yalnızca soruda', pl: 'Tylko w pytaniu' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Нет, форма всегда одна — de acuerdo не согласуется ни с чем, потому что это застывшая формула, а не прилагательное вроде bonito/bonita.',
        uk: 'Ні, форма завжди одна — de acuerdo не узгоджується ні з чим, бо це застигла формула, а не прикметник на кшталт bonito/bonita.',
        es: 'No, the form is always the same — de acuerdo agrees with nothing, because it is a fixed formula, not an adjective like bonito/bonita.',
        'pt-BR': 'Não, a forma é sempre a mesma — de acuerdo não concorda com nada, porque é uma fórmula fixa, não um adjetivo como bonito/bonita.',
        vi: 'Không, dạng luôn giữ nguyên — de acuerdo không hòa hợp với gì cả, vì đó là công thức cố định, không phải tính từ như bonito/bonita.',
        id: 'Tidak, bentuknya selalu sama — de acuerdo tidak sesuai dengan apa pun, karena itu rumus tetap, bukan kata sifat seperti bonito/bonita.',
        tr: 'Hayır, biçim her zaman aynıdır — de acuerdo hiçbir şeyle uyum sağlamaz, çünkü bu bonito/bonita gibi bir sıfat değil, sabit bir formüldür.',
        pl: 'Nie, forma jest zawsze taka sama — de acuerdo nie zgadza się z niczym, ponieważ jest to utrwalona formuła, a nie przymiotnik jak bonito/bonita.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'De acuerdo ≠ es verdad ≠ es igual',
      uk: 'De acuerdo ≠ es verdad ≠ es igual — три різні репліки',
      es: 'De acuerdo ≠ es verdad ≠ es igual — three different replies',
      'pt-BR': 'De acuerdo ≠ es verdad ≠ es igual — três respostas diferentes',
      vi: 'De acuerdo ≠ es verdad ≠ es igual — ba câu trả lời khác nhau',
      id: 'De acuerdo ≠ es verdad ≠ es igual — tiga balasan berbeda',
      tr: 'De acuerdo ≠ es verdad ≠ es igual — üç farklı yanıt',
      pl: 'De acuerdo ≠ es verdad ≠ es igual — trzy różne odpowiedzi',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Легко перепутать de acuerdo с ', semantic: 'explanation' }, { text: 'es verdad', semantic: 'targetWrong' }, { text: ', ведь обе фразы звучат как реакция на чужие слова: но es verdad подтверждает правдивость факта, а de acuerdo — согласие с мнением, и подменить одно другим нельзя. Вторая ловушка — сказать ', semantic: 'explanation' }, { text: 'es igual', semantic: 'targetWrong' }, { text: ' вместо ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ', думая, что оба выражают положительный отклик: на самом деле es igual означает безразличие, «мне всё равно», а не согласие. Третья ошибка — написать deacuerdo слитно, одним словом: это неверно, de acuerdo всегда пишется через пробел, двумя словами. Проверка простая: если хочешь выразить согласие с мнением — только de acuerdo, ничто другое не подходит.', semantic: 'explanation' }),
      uk: R({ text: 'Легко сплутати de acuerdo з ', semantic: 'explanation' }, { text: 'es verdad', semantic: 'targetWrong' }, { text: ', адже обидві фрази звучать як реакція на чужі слова: але es verdad підтверджує правдивість факту, а de acuerdo — згоду з думкою, і підмінити одне іншим не можна. Друга пастка — сказати ', semantic: 'explanation' }, { text: 'es igual', semantic: 'targetWrong' }, { text: ' замість ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ', думаючи, що обидва висловлюють позитивний відгук: насправді es igual означає байдужість, «мені байдуже», а не згоду. Третя помилка — написати deacuerdo разом, одним словом: це неправильно, de acuerdo завжди пишеться через пробіл, двома словами. Перевірка проста: якщо хочеш висловити згоду з думкою — тільки de acuerdo, ніщо інше не підходить.', semantic: 'explanation' }),
      es: R({ text: 'It is easy to confuse de acuerdo with ', semantic: 'explanation' }, { text: 'es verdad', semantic: 'targetWrong' }, { text: ', since both phrases sound like a reaction to someone else\'s words: but es verdad confirms the truthfulness of a fact, while de acuerdo confirms agreement with an opinion, and one cannot substitute for the other. The second trap is saying ', semantic: 'explanation' }, { text: 'es igual', semantic: 'targetWrong' }, { text: ' instead of ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ', thinking both express a positive response: in fact es igual means indifference, "I don\'t care", not agreement. The third mistake is writing deacuerdo together, as one word: this is wrong, de acuerdo is always written with a space, as two words. The check is simple: if you want to express agreement with an opinion — only de acuerdo fits, nothing else.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'É fácil confundir de acuerdo com ', semantic: 'explanation' }, { text: 'es verdad', semantic: 'targetWrong' }, { text: ', já que ambas as frases soam como uma reação às palavras de outra pessoa: mas es verdad confirma a veracidade de um fato, enquanto de acuerdo confirma concordância com uma opinião, e uma não pode substituir a outra. A segunda armadilha é dizer ', semantic: 'explanation' }, { text: 'es igual', semantic: 'targetWrong' }, { text: ' em vez de ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ', pensando que ambas expressam uma resposta positiva: na verdade es igual significa indiferença, "tanto faz para mim", não concordância. O terceiro erro é escrever deacuerdo junto, como uma palavra só: isso está errado, de acuerdo sempre se escreve com espaço, duas palavras. A checagem é simples: se você quer expressar concordância com uma opinião — só de acuerdo cabe, nada mais.', semantic: 'explanation' }),
      vi: R({ text: 'Dễ nhầm lẫn de acuerdo với ', semantic: 'explanation' }, { text: 'es verdad', semantic: 'targetWrong' }, { text: ', vì cả hai câu đều nghe như phản ứng với lời của người khác: nhưng es verdad xác nhận tính đúng đắn của một sự thật, còn de acuerdo xác nhận sự đồng ý với một ý kiến, và không thể thay thế cái này bằng cái kia. Cái bẫy thứ hai là nói ', semantic: 'explanation' }, { text: 'es igual', semantic: 'targetWrong' }, { text: ' thay vì ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ', nghĩ rằng cả hai đều thể hiện phản hồi tích cực: thực ra es igual nghĩa là thờ ơ, "tôi không quan tâm", không phải đồng ý. Lỗi thứ ba là viết deacuerdo liền nhau, thành một từ: điều này sai, de acuerdo luôn viết cách nhau, hai từ. Cách kiểm tra đơn giản: nếu muốn thể hiện sự đồng ý với một ý kiến — chỉ de acuerdo phù hợp, không gì khác.', semantic: 'explanation' }),
      id: R({ text: 'Mudah mengacaukan de acuerdo dengan ', semantic: 'explanation' }, { text: 'es verdad', semantic: 'targetWrong' }, { text: ', karena kedua frasa terdengar seperti reaksi terhadap kata-kata orang lain: tetapi es verdad mengonfirmasi kebenaran suatu fakta, sedangkan de acuerdo mengonfirmasi persetujuan dengan pendapat, dan satu tidak bisa menggantikan yang lain. Jebakan kedua adalah mengatakan ', semantic: 'explanation' }, { text: 'es igual', semantic: 'targetWrong' }, { text: ' alih-alih ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ', berpikir keduanya mengungkapkan respons positif: sebenarnya es igual berarti ketidakpedulian, "aku tidak peduli", bukan persetujuan. Kesalahan ketiga adalah menulis deacuerdo bersambung, sebagai satu kata: ini salah, de acuerdo selalu ditulis dengan spasi, dua kata. Pengecekannya sederhana: jika ingin mengungkapkan persetujuan dengan pendapat — hanya de acuerdo yang cocok, tidak ada yang lain.', semantic: 'explanation' }),
      tr: R({ text: 'De acuerdo\'yu ', semantic: 'explanation' }, { text: 'es verdad', semantic: 'targetWrong' }, { text: ' ile karıştırmak kolaydır, çünkü her iki ifade de başkasının sözlerine bir tepki gibi duyulur: ama es verdad bir gerçeğin doğruluğunu onaylar, de acuerdo ise bir fikre katılımı onaylar, ve biri diğerinin yerini alamaz. İkinci tuzak, ikisinin de olumlu bir yanıt ifade ettiğini düşünerek ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ' yerine ', semantic: 'explanation' }, { text: 'es igual', semantic: 'targetWrong' }, { text: ' demektir: aslında es igual kayıtsızlık, "umurumda değil" demektir, katılım değil. Üçüncü hata, deacuerdo\'yu bitişik, tek kelime olarak yazmaktır: bu yanlıştır, de acuerdo her zaman boşlukla, iki kelime olarak yazılır. Kontrol basittir: bir fikre katılımı ifade etmek istiyorsanız — yalnızca de acuerdo uyar, başka hiçbir şey değil.', semantic: 'explanation' }),
      pl: R({ text: 'Łatwo pomylić de acuerdo z ', semantic: 'explanation' }, { text: 'es verdad', semantic: 'targetWrong' }, { text: ', ponieważ obie frazy brzmią jak reakcja na czyjeś słowa: ale es verdad potwierdza prawdziwość faktu, a de acuerdo potwierdza zgodę z opinią, i jedno nie może zastąpić drugiego. Druga pułapka to powiedzenie ', semantic: 'explanation' }, { text: 'es igual', semantic: 'targetWrong' }, { text: ' zamiast ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ', myśląc, że obie wyrażają pozytywną odpowiedź: w rzeczywistości es igual znaczy obojętność, „wszystko mi jedno”, nie zgodę. Trzeci błąd to napisanie deacuerdo razem, jako jedno słowo: to błąd, de acuerdo zawsze pisze się z odstępem, dwoma słowami. Sprawdzenie jest proste: jeśli chcesz wyrazić zgodę z opinią — pasuje tylko de acuerdo, nic innego.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно написать «согласен»?',
        uk: 'Як правильно написати «згоден»?',
        es: 'How do you correctly write "agreed"?',
        'pt-BR': 'Como se escreve corretamente "concordo"?',
        vi: 'Viết đúng "đồng ý" như thế nào?',
        id: 'Bagaimana cara mengeja "setuju" dengan benar?',
        tr: '"Katılıyorum" doğru nasıl yazılır?',
        pl: 'Jak poprawnie napisać „zgadzam się”?',
      }),
      choices: [
        L({ ru: 'de acuerdo', uk: 'de acuerdo', es: 'de acuerdo', 'pt-BR': 'de acuerdo', vi: 'de acuerdo', id: 'de acuerdo', tr: 'de acuerdo', pl: 'de acuerdo' }),
        L({ ru: 'deacuerdo', uk: 'deacuerdo', es: 'deacuerdo', 'pt-BR': 'deacuerdo', vi: 'deacuerdo', id: 'deacuerdo', tr: 'deacuerdo', pl: 'deacuerdo' }),
        L({ ru: 'es igual', uk: 'es igual', es: 'es igual', 'pt-BR': 'es igual', vi: 'es igual', id: 'es igual', tr: 'es igual', pl: 'es igual' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'De acuerdo пишется двумя словами через пробел. Deacuerdo слитно неверно, а es igual означает безразличие, а не согласие.',
        uk: 'De acuerdo пишеться двома словами через пробіл. Deacuerdo разом неправильно, а es igual означає байдужість, а не згоду.',
        es: 'De acuerdo is written as two words with a space. Deacuerdo together is wrong, and es igual means indifference, not agreement.',
        'pt-BR': 'De acuerdo se escreve com espaço, duas palavras. Deacuerdo junto está errado, e es igual significa indiferença, não concordância.',
        vi: 'De acuerdo viết cách nhau, hai từ. Deacuerdo liền nhau là sai, và es igual nghĩa là thờ ơ, không phải đồng ý.',
        id: 'De acuerdo ditulis dengan spasi, dua kata. Deacuerdo bersambung salah, dan es igual berarti ketidakpedulian, bukan persetujuan.',
        tr: 'De acuerdo boşlukla, iki kelime olarak yazılır. Deacuerdo bitişik yanlıştır, ve es igual kayıtsızlık demektir, katılım değil.',
        pl: 'De acuerdo pisze się z odstępem, dwoma słowami. Deacuerdo razem jest błędne, a es igual znaczy obojętność, nie zgodę.',
      }),
    },
  },
];
