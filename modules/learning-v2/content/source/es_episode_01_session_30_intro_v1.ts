import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 30 "Все пять форм подряд" / kind: 'recall', builtOn: [1, 9, 17, 25, 27],
// recalls: [1, 9, 17, 25, 27]): три страницы concept/formula/trap собирают
// вместе все пять форм связки ser (soy, eres, es, somos, son), пройденные
// по одной за сессию в предыдущих главах. Recall-сессия не вводит ни одного
// нового факта — она показывает всю парадигму как единую систему выбора: по
// одному признаку (включён ли говорящий) и по одному признаку (сколько
// человек), а не как пять изолированных фактов.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_30_TITLE = L({
  ru: 'Все пять форм подряд',
  uk: 'Усі п’ять форм поспіль',
  es: 'All five forms in a row',
  'pt-BR': 'As cinco formas seguidas',
  vi: 'Cả năm dạng liền một mạch',
  id: 'Kelima bentuk berturut-turut',
  tr: 'Beş biçim art arda',
  pl: 'Wszystkie pięć form pod rząd',
});

export const ES_EPISODE_01_SESSION_30_SUMMARY = L({
  ru: 'Soy, eres, es, somos, son — один и тот же выбор двух признаков: включён ли говорящий и сколько человек, без единого нового слова.',
  uk: 'Soy, eres, es, somos, son — той самий вибір двох ознак: чи включений мовець і скільки людей, без жодного нового слова.',
  es: 'Soy, eres, es, somos, son — the same choice between two features: whether the speaker is included and how many people, without a single new word.',
  'pt-BR': 'Soy, eres, es, somos, son — a mesma escolha entre duas características: se quem fala está incluído e quantas pessoas, sem nenhuma palavra nova.',
  vi: 'Soy, eres, es, somos, son — cùng một lựa chọn giữa hai đặc điểm: người nói có được tính vào hay không và có bao nhiêu người, không có từ mới nào.',
  id: 'Soy, eres, es, somos, son — pilihan yang sama antara dua ciri: apakah penutur termasuk dan berapa banyak orang, tanpa satu kata baru pun.',
  tr: 'Soy, eres, es, somos, son — iki özellik arasındaki aynı seçim: konuşan dahil mi ve kaç kişi, hiç yeni kelime olmadan.',
  pl: 'Soy, eres, es, somos, son — ten sam wybór dwóch cech: czy mówiący jest uwzględniony i ile osób, bez ani jednego nowego słowa.',
});

export const ES_EPISODE_01_SESSION_30_GOAL = L({
  ru: 'Мгновенно выбирать нужную форму ser (soy/eres/es/somos/son) по двум признакам ситуации, без перебора и без пауз.',
  uk: 'Миттєво обирати потрібну форму ser (soy/eres/es/somos/son) за двома ознаками ситуації, без перебору й без пауз.',
  es: 'Instantly choose the right form of ser (soy/eres/es/somos/son) based on two features of the situation, without trial and without pauses.',
  'pt-BR': 'Escolher instantaneamente a forma certa de ser (soy/eres/es/somos/son) com base em duas características da situação, sem tentativas e sem pausas.',
  vi: 'Chọn ngay dạng đúng của ser (soy/eres/es/somos/son) dựa trên hai đặc điểm của tình huống, không thử sai và không ngập ngừng.',
  id: 'Segera memilih bentuk ser yang tepat (soy/eres/es/somos/son) berdasarkan dua ciri situasi, tanpa coba-coba dan tanpa jeda.',
  tr: 'Durumun iki özelliğine göre ser’in doğru biçimini (soy/eres/es/somos/son) hemen seçmek, deneme yanılma ve duraksama olmadan.',
  pl: 'Natychmiast wybierać właściwą formę ser (soy/eres/es/somos/son) na podstawie dwóch cech sytuacji, bez prób i bez wahania.',
});

const CONCEPT_BODY = L({
  ru: 'Пять форм ser отвечают всего на два вопроса: включён ли говорящий и сколько человек. Про себя одного — soy; при обращении к одному собеседнику — eres; про кого-то третьего одного — es. Как только людей становится больше одного, добавляется второй вопрос: если говорящий внутри группы — somos, если снаружи — son. Никакого шестого варианта нет и не нужно: soy закрывает «я», eres закрывает «ты», es закрывает «он/она/оно», somos закрывает «мы», son закрывает «они». Recall прост: Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — один и тот же признак, пять разных связок вокруг него.',
  uk: 'П’ять форм ser відповідають лише на два питання: чи включений мовець і скільки людей. Про себе одного — soy; при зверненні до одного співрозмовника — eres; про когось третього одного — es. Щойно людей стає більше одного, додається друге питання: якщо мовець всередині групи — somos, якщо зовні — son. Жодного шостого варіанта немає й не потрібно: soy закриває «я», eres закриває «ти», es закриває «він/вона/воно», somos закриває «ми», son закриває «вони». Recall простий: Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — та сама ознака, п’ять різних зв’язок навколо неї.',
  es: 'The five forms of ser answer just two questions: is the speaker included, and how many people. About yourself alone — soy; addressing one listener — eres; about someone else alone — es. As soon as there is more than one person, a second question is added: if the speaker is inside the group — somos, if outside — son. There is no sixth option and none is needed: soy covers "I", eres covers "you", es covers "he/she/it", somos covers "we", son covers "they". The recall is simple: Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — the same quality, five different linking words around it.',
  'pt-BR': 'As cinco formas de ser respondem só a duas perguntas: quem fala está incluído, e quantas pessoas. Sobre si mesmo sozinho — soy; falando com um interlocutor — eres; sobre outra pessoa sozinha — es. Assim que há mais de uma pessoa, entra uma segunda pergunta: se quem fala está dentro do grupo — somos, se fora — son. Não existe uma sexta opção nem é preciso: soy cobre "eu", eres cobre "você", es cobre "ele/ela", somos cobre "nós", son cobre "eles". O recall é simples: Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — a mesma qualidade, cinco ligações diferentes ao redor dela.',
  vi: 'Năm dạng của ser chỉ trả lời hai câu hỏi: người nói có được tính vào hay không, và có bao nhiêu người. Nói về một mình mình — soy; nói với một người nghe — eres; nói về một người khác — es. Khi có hơn một người, câu hỏi thứ hai xuất hiện: nếu người nói ở trong nhóm — somos, nếu ở ngoài — son. Không có lựa chọn thứ sáu nào cả và cũng không cần: soy phủ "tôi", eres phủ "bạn", es phủ "anh ấy/cô ấy/nó", somos phủ "chúng tôi", son phủ "họ". Recall rất đơn giản: Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — cùng một đặc điểm, năm từ nối khác nhau quanh nó.',
  id: 'Lima bentuk ser hanya menjawab dua pertanyaan: apakah penutur termasuk, dan berapa banyak orang. Tentang diri sendiri saja — soy; berbicara dengan satu pendengar — eres; tentang orang lain sendirian — es. Begitu ada lebih dari satu orang, pertanyaan kedua ditambahkan: jika penutur ada di dalam kelompok — somos, jika di luar — son. Tidak ada opsi keenam dan tidak diperlukan: soy mencakup "saya", eres mencakup "kamu", es mencakup "dia", somos mencakup "kami", son mencakup "mereka". Recall-nya sederhana: Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — sifat yang sama, lima kata penghubung berbeda di sekelilingnya.',
  tr: 'Ser’in beş biçimi yalnızca iki soruyu yanıtlar: konuşan dahil mi ve kaç kişi. Yalnızca kendisi hakkında — soy; bir dinleyiciye hitap ederken — eres; başka biri hakkında tek başına — es. Birden fazla kişi olur olmaz ikinci bir soru eklenir: konuşan grubun içindeyse — somos, dışındaysa — son. Altıncı bir seçenek yoktur ve gerekmez: soy "ben"i, eres "sen"i, es "o"yu, somos "biz"i, son "onlar"ı kapsar. Recall basittir: Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — aynı nitelik, etrafında beş farklı bağlaç.',
  pl: 'Pięć form ser odpowiada tylko na dwa pytania: czy mówiący jest uwzględniony i ile jest osób. O sobie samym — soy; zwracając się do jednego słuchacza — eres; o kimś innym samym — es. Gdy tylko osób jest więcej niż jedna, dochodzi drugie pytanie: jeśli mówiący jest w grupie — somos, jeśli poza nią — son. Nie ma szóstej opcji i nie jest potrzebna: soy obejmuje „ja”, eres obejmuje „ty”, es obejmuje „on/ona/ono”, somos obejmuje „my”, son obejmuje „oni”. Recall jest prosty: Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — ta sama cecha, pięć różnych łączników wokół niej.',
});

const FORMULA_BODY = L({
  ru: 'Формула выбора связки — это два последовательных вопроса, не пять отдельных правил. Первый вопрос: сколько людей? Один — тогда второй вопрос: кто говорит про кого? Про себя — soy, к собеседнику — eres, про третьего — es. Несколько — тогда второй вопрос: говорящий внутри группы? Да — somos, нет — son. Отрицание встаёт перед любой из пяти форм одинаково: No soy rápido, No eres rápida, No es rápido, No somos rápidas, No son rápidos — no не меняет саму формулу выбора, оно лишь добавляется впереди уже выбранной связки.',
  uk: 'Формула вибору зв’язки — це два послідовні питання, а не п’ять окремих правил. Перше питання: скільки людей? Один — тоді друге питання: хто говорить про кого? Про себе — soy, до співрозмовника — eres, про третього — es. Кілька — тоді друге питання: мовець всередині групи? Так — somos, ні — son. Заперечення стає перед будь-якою з п’яти форм однаково: No soy rápido, No eres rápida, No es rápido, No somos rápidas, No son rápidos — no не змінює саму формулу вибору, воно лише додається перед уже обраною зв’язкою.',
  es: 'The formula for choosing the linking word is two sequential questions, not five separate rules. First question: how many people? One — then a second question: who is speaking about whom? About yourself — soy, to the listener — eres, about someone else — es. Several — then a second question: is the speaker inside the group? Yes — somos, no — son. Negation goes before any of the five forms the same way: No soy rápido, No eres rápida, No es rápido, No somos rápidas, No son rápidos — no does not change the choice formula itself, it is simply added before the linking word already chosen.',
  'pt-BR': 'A fórmula para escolher a ligação são duas perguntas sequenciais, não cinco regras separadas. Primeira pergunta: quantas pessoas? Uma — então uma segunda pergunta: quem fala sobre quem? Sobre si mesmo — soy, com o interlocutor — eres, sobre outra pessoa — es. Várias — então uma segunda pergunta: quem fala está dentro do grupo? Sim — somos, não — son. A negação vem antes de qualquer uma das cinco formas do mesmo jeito: No soy rápido, No eres rápida, No es rápido, No somos rápidas, No son rápidos — no não muda a fórmula de escolha em si, é só acrescentado antes da ligação já escolhida.',
  vi: 'Công thức chọn từ nối là hai câu hỏi liên tiếp, không phải năm quy tắc riêng lẻ. Câu hỏi đầu: có bao nhiêu người? Một — rồi câu hỏi thứ hai: ai đang nói về ai? Về bản thân — soy, với người nghe — eres, về người khác — es. Nhiều người — rồi câu hỏi thứ hai: người nói có ở trong nhóm không? Có — somos, không — son. Phủ định đứng trước bất kỳ dạng nào trong năm dạng theo cùng một cách: No soy rápido, No eres rápida, No es rápido, No somos rápidas, No son rápidos — no không thay đổi công thức lựa chọn, nó chỉ được thêm vào trước từ nối đã chọn.',
  id: 'Rumus untuk memilih kata penghubung adalah dua pertanyaan berurutan, bukan lima aturan terpisah. Pertanyaan pertama: berapa banyak orang? Satu — lalu pertanyaan kedua: siapa berbicara tentang siapa? Tentang diri sendiri — soy, dengan pendengar — eres, tentang orang lain — es. Beberapa — lalu pertanyaan kedua: apakah penutur ada di dalam kelompok? Ya — somos, tidak — son. Negasi berada sebelum salah satu dari lima bentuk dengan cara yang sama: No soy rápido, No eres rápida, No es rápido, No somos rápidas, No son rápidos — no tidak mengubah rumus pemilihan itu sendiri, hanya ditambahkan sebelum kata penghubung yang sudah dipilih.',
  tr: 'Bağlaç seçme formülü, beş ayrı kural değil, iki ardışık sorudur. İlk soru: kaç kişi? Bir — sonra ikinci soru: kim kimden bahsediyor? Kendinden — soy, dinleyiciye — eres, başkasından — es. Birden fazla — sonra ikinci soru: konuşan grubun içinde mi? Evet — somos, hayır — son. Olumsuzlama, beş biçimden herhangi birinin önüne aynı şekilde gelir: No soy rápido, No eres rápida, No es rápido, No somos rápidas, No son rápidos — no, seçim formülünün kendisini değiştirmez, yalnızca zaten seçilmiş bağlacın önüne eklenir.',
  pl: 'Formuła wyboru łącznika to dwa kolejne pytania, a nie pięć osobnych reguł. Pierwsze pytanie: ile osób? Jedna — wtedy drugie pytanie: kto mówi o kim? O sobie — soy, do słuchacza — eres, o kimś innym — es. Kilka — wtedy drugie pytanie: czy mówiący jest w grupie? Tak — somos, nie — son. Przeczenie staje przed dowolną z pięciu form tak samo: No soy rápido, No eres rápida, No es rápido, No somos rápidas, No son rápidos — no nie zmienia samej formuły wyboru, jest po prostu dodawane przed już wybranym łącznikiem.',
});

const TRAP_BODY = L({
  ru: 'Самая частая путаница — перепутать somos и son, потому что оба про «несколько». Проверка одна: входит ли говорящий в группу, о которой речь? Да — somos, нет — son; число людей тут ни при чём, только состав группы. Вторая путаница — забыть, что eres это ВСЕГДА обращение к одному собеседнику напрямую, а не рассказ о ком-то третьем; рассказ о третьем — это всегда es, даже если по смыслу похоже на «ты». Проверка простая: если фраза обращена ко второму лицу — eres, если описывает кого-то со стороны — es, а группа выбирается по составу, а не по числу.',
  uk: 'Найчастіша плутанина — переплутати somos і son, бо обидва про «кількох». Перевірка одна: чи входить мовець у групу, про яку йдеться? Так — somos, ні — son; кількість людей тут ні до чого, лише склад групи. Друга плутанина — забути, що eres це ЗАВЖДИ звернення до одного співрозмовника напряму, а не розповідь про когось третього; розповідь про третього — це завжди es, навіть якщо за змістом схоже на «ти». Перевірка проста: якщо фраза звернена до другої особи — eres, якщо описує когось збоку — es, а група обирається за складом, а не за кількістю.',
  es: 'The most common confusion is mixing up somos and son, because both are about "several". There is one check: does the speaker belong to the group being discussed? Yes — somos, no — son; the number of people has nothing to do with it, only the group\'s makeup. The second confusion is forgetting that eres is ALWAYS a direct address to one listener, not a description of someone else; describing a third party is always es, even if it feels similar to "you" in meaning. The check is simple: if the phrase addresses the second person directly — eres, if it describes someone from outside — es, and the group is chosen by makeup, not by number.',
  'pt-BR': 'A confusão mais comum é misturar somos e son, porque ambos são sobre "várias pessoas". Há uma checagem: quem fala pertence ao grupo de que se fala? Sim — somos, não — son; o número de pessoas não tem nada a ver, só a composição do grupo. A segunda confusão é esquecer que eres é SEMPRE um endereçamento direto a um interlocutor, não uma descrição de outra pessoa; descrever um terceiro é sempre es, mesmo que pareça parecido com "você" em significado. A checagem é simples: se a frase se dirige diretamente à segunda pessoa — eres, se descreve alguém de fora — es, e o grupo é escolhido pela composição, não pelo número.',
  vi: 'Sự nhầm lẫn phổ biến nhất là lẫn lộn somos và son, vì cả hai đều nói về "nhiều người". Chỉ có một cách kiểm tra: người nói có thuộc nhóm đang được nói tới hay không? Có — somos, không — son; số lượng người không liên quan, chỉ thành phần của nhóm mới quan trọng. Sự nhầm lẫn thứ hai là quên rằng eres LUÔN LUÔN là nói trực tiếp với một người nghe, không phải mô tả về người khác; mô tả về người thứ ba luôn là es, kể cả khi về nghĩa nó giống với "bạn". Cách kiểm tra đơn giản: nếu câu nói trực tiếp với ngôi thứ hai — eres, nếu mô tả ai đó từ bên ngoài — es, còn nhóm được chọn theo thành phần, không theo số lượng.',
  id: 'Kebingungan paling umum adalah mengacaukan somos dan son, karena keduanya tentang "beberapa orang". Hanya ada satu pengecekan: apakah penutur termasuk dalam kelompok yang dibicarakan? Ya — somos, tidak — son; jumlah orang tidak ada hubungannya, hanya susunan kelompok yang penting. Kebingungan kedua adalah melupakan bahwa eres SELALU merupakan sapaan langsung kepada satu pendengar, bukan deskripsi tentang orang lain; mendeskripsikan pihak ketiga selalu es, meskipun terasa mirip dengan "kamu" secara makna. Pengecekannya sederhana: jika frasa menyapa orang kedua secara langsung — eres, jika mendeskripsikan seseorang dari luar — es, dan kelompok dipilih berdasarkan susunan, bukan jumlah.',
  tr: 'En yaygın karışıklık, ikisi de "birkaç kişi" hakkında olduğu için somos ve son’u karıştırmaktır. Tek bir kontrol vardır: konuşan, söz konusu olan gruba dahil mi? Evet — somos, hayır — son; kişi sayısının bununla hiçbir ilgisi yoktur, yalnızca grubun bileşimi önemlidir. İkinci karışıklık, eres’in HER ZAMAN bir dinleyiciye doğrudan hitap olduğunu, başka birinin tarifi olmadığını unutmaktır; üçüncü bir kişiyi tarif etmek her zaman es’tir, anlam olarak "sen"e benzese bile. Kontrol basittir: ifade ikinci kişiye doğrudan hitap ediyorsa — eres, dışarıdan birini tarif ediyorsa — es, grup ise sayıya değil bileşime göre seçilir.',
  pl: 'Najczęstsza pomyłka to mylenie somos i son, ponieważ oba dotyczą „kilku osób”. Jest jedno sprawdzenie: czy mówiący należy do grupy, o której mowa? Tak — somos, nie — son; liczba osób nie ma tu znaczenia, liczy się tylko skład grupy. Druga pomyłka to zapominanie, że eres to ZAWSZE bezpośrednie zwrócenie się do jednego słuchacza, a nie opis kogoś innego; opisywanie osoby trzeciej to zawsze es, nawet jeśli znaczeniowo przypomina „ty”. Sprawdzenie jest proste: jeśli fraza zwraca się bezpośrednio do drugiej osoby — eres, jeśli opisuje kogoś z zewnątrz — es, a grupa jest wybierana według składu, nie liczby.',
});

export const ES_EPISODE_01_SESSION_30_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Пять форм — два вопроса, а не пять правил',
      uk: 'П’ять форм — два питання, а не п’ять правил',
      es: 'Five forms — two questions, not five rules',
      'pt-BR': 'Cinco formas — duas perguntas, não cinco regras',
      vi: 'Năm dạng — hai câu hỏi, không phải năm quy tắc',
      id: 'Lima bentuk — dua pertanyaan, bukan lima aturan',
      tr: 'Beş biçim — beş kural değil, iki soru',
      pl: 'Pięć form — dwa pytania, nie pięć reguł',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Пять форм ser отвечают всего на два вопроса: включён ли говорящий и сколько человек. Про себя одного — soy; при обращении к одному собеседнику — eres; про кого-то третьего одного — es. Как только людей становится больше одного, добавляется второй вопрос: если говорящий внутри группы — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', если снаружи — son. Никакого шестого варианта нет и не нужно: soy закрывает «я», eres закрывает «ты», es закрывает «он/она/оно», somos закрывает «мы», son закрывает «они». Recall прост: Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — один и тот же признак, пять разных связок вокруг него.', semantic: 'explanation' }),
      uk: R({ text: 'П’ять форм ser відповідають лише на два питання: чи включений мовець і скільки людей. Про себе одного — soy; при зверненні до одного співрозмовника — eres; про когось третього одного — es. Щойно людей стає більше одного, додається друге питання: якщо мовець всередині групи — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', якщо зовні — son. Жодного шостого варіанта немає й не потрібно: soy закриває «я», eres закриває «ти», es закриває «він/вона/воно», somos закриває «ми», son закриває «вони». Recall простий: Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — та сама ознака, п’ять різних зв’язок навколо неї.', semantic: 'explanation' }),
      es: R({ text: 'The five forms of ser answer just two questions: is the speaker included, and how many people. About yourself alone — soy; addressing one listener — eres; about someone else alone — es. As soon as there is more than one person, a second question is added: if the speaker is inside the group — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', if outside — son. There is no sixth option and none is needed: soy covers "I", eres covers "you", es covers "he/she/it", somos covers "we", son covers "they". The recall is simple: Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — the same quality, five different linking words around it.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'As cinco formas de ser respondem só a duas perguntas: quem fala está incluído, e quantas pessoas. Sobre si mesmo sozinho — soy; falando com um interlocutor — eres; sobre outra pessoa sozinha — es. Assim que há mais de uma pessoa, entra uma segunda pergunta: se quem fala está dentro do grupo — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', se fora — son. Não existe uma sexta opção nem é preciso: soy cobre "eu", eres cobre "você", es cobre "ele/ela", somos cobre "nós", son cobre "eles". O recall é simples: Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — a mesma qualidade, cinco ligações diferentes ao redor dela.', semantic: 'explanation' }),
      vi: R({ text: 'Năm dạng của ser chỉ trả lời hai câu hỏi: người nói có được tính vào hay không, và có bao nhiêu người. Nói về một mình mình — soy; nói với một người nghe — eres; nói về một người khác — es. Khi có hơn một người, câu hỏi thứ hai xuất hiện: nếu người nói ở trong nhóm — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', nếu ở ngoài — son. Không có lựa chọn thứ sáu nào cả và cũng không cần: soy phủ "tôi", eres phủ "bạn", es phủ "anh ấy/cô ấy/nó", somos phủ "chúng tôi", son phủ "họ". Recall rất đơn giản: Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — cùng một đặc điểm, năm từ nối khác nhau quanh nó.', semantic: 'explanation' }),
      id: R({ text: 'Lima bentuk ser hanya menjawab dua pertanyaan: apakah penutur termasuk, dan berapa banyak orang. Tentang diri sendiri saja — soy; berbicara dengan satu pendengar — eres; tentang orang lain sendirian — es. Begitu ada lebih dari satu orang, pertanyaan kedua ditambahkan: jika penutur ada di dalam kelompok — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', jika di luar — son. Tidak ada opsi keenam dan tidak diperlukan: soy mencakup "saya", eres mencakup "kamu", es mencakup "dia", somos mencakup "kami", son mencakup "mereka". Recall-nya sederhana: Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — sifat yang sama, lima kata penghubung berbeda di sekelilingnya.', semantic: 'explanation' }),
      tr: R({ text: 'Ser’in beş biçimi yalnızca iki soruyu yanıtlar: konuşan dahil mi ve kaç kişi. Yalnızca kendisi hakkında — soy; bir dinleyiciye hitap ederken — eres; başka biri hakkında tek başına — es. Birden fazla kişi olur olmaz ikinci bir soru eklenir: konuşan grubun içindeyse — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', dışındaysa — son. Altıncı bir seçenek yoktur ve gerekmez: soy "ben"i, eres "sen"i, es "o"yu, somos "biz"i, son "onlar"ı kapsar. Recall basittir: Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — aynı nitelik, etrafında beş farklı bağlaç.', semantic: 'explanation' }),
      pl: R({ text: 'Pięć form ser odpowiada tylko na dwa pytania: czy mówiący jest uwzględniony i ile jest osób. O sobie samym — soy; zwracając się do jednego słuchacza — eres; o kimś innym samym — es. Gdy tylko osób jest więcej niż jedna, dochodzi drugie pytanie: jeśli mówiący jest w grupie — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', jeśli poza nią — son. Nie ma szóstej opcji i nie jest potrzebna: soy obejmuje „ja”, eres obejmuje „ty”, es obejmuje „on/ona/ono”, somos obejmuje „my”, son obejmuje „oni”. Recall jest prosty: Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — ta sama cecha, pięć różnych łączników wokół niej.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Один человек, но говорят не о себе и не с собеседником напрямую — какая связка?',
        uk: 'Одна людина, але йдеться не про себе і не до співрозмовника напряму — яка зв’язка?',
        es: 'One person, but not about the speaker and not a direct address — which linking word?',
        'pt-BR': 'Uma pessoa, mas não sobre quem fala nem endereçado diretamente — qual ligação?',
        vi: 'Một người, nhưng không phải người nói và không nói trực tiếp — từ nối nào?',
        id: 'Satu orang, tetapi bukan tentang penutur dan bukan sapaan langsung — kata penghubung mana?',
        tr: 'Bir kişi, ama konuşan hakkında değil ve doğrudan hitap değil — hangi bağlaç?',
        pl: 'Jedna osoba, ale nie o mówiącym i nie bezpośredni zwrot — jaki łącznik?',
      }),
      choices: [
        L({ ru: 'es', uk: 'es', es: 'es', 'pt-BR': 'es', vi: 'es', id: 'es', tr: 'es', pl: 'es' }),
        L({ ru: 'eres', uk: 'eres', es: 'eres', 'pt-BR': 'eres', vi: 'eres', id: 'eres', tr: 'eres', pl: 'eres' }),
        L({ ru: 'soy', uk: 'soy', es: 'soy', 'pt-BR': 'soy', vi: 'soy', id: 'soy', tr: 'soy', pl: 'soy' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Es верно: один человек, о котором рассказывают со стороны — не сам говорящий (тогда было бы soy) и не собеседник напрямую (тогда было бы eres).',
        uk: 'Es правильно: одна людина, про яку розповідають збоку — не сам мовець (тоді було б soy) і не співрозмовник напряму (тоді було б eres).',
        es: 'Es is correct: one person being described from outside — not the speaker (that would be soy) and not the listener directly (that would be eres).',
        'pt-BR': 'Es está correto: uma pessoa descrita de fora — não quem fala (seria soy) e não o interlocutor diretamente (seria eres).',
        vi: 'Es đúng: một người được mô tả từ bên ngoài — không phải người nói (thì sẽ là soy) và không phải người nghe trực tiếp (thì sẽ là eres).',
        id: 'Es benar: satu orang yang dideskripsikan dari luar — bukan penutur (itu akan jadi soy) dan bukan pendengar langsung (itu akan jadi eres).',
        tr: 'Es doğrudur: dışarıdan tarif edilen bir kişi — konuşan değil (o zaman soy olurdu) ve doğrudan dinleyici de değil (o zaman eres olurdu).',
        pl: 'Es jest poprawne: jedna osoba opisywana z zewnątrz — nie mówiący (wtedy byłoby soy) i nie bezpośredni słuchacz (wtedy byłoby eres).',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Два вопроса подряд, отрицание не меняет формулу',
      uk: 'Два питання поспіль, заперечення не змінює формулу',
      es: 'Two questions in a row, negation does not change the formula',
      'pt-BR': 'Duas perguntas seguidas, a negação não muda a fórmula',
      vi: 'Hai câu hỏi liên tiếp, phủ định không đổi công thức',
      id: 'Dua pertanyaan berturut-turut, negasi tidak mengubah rumus',
      tr: 'Art arda iki soru, olumsuzlama formülü değiştirmez',
      pl: 'Dwa pytania pod rząd, przeczenie nie zmienia formuły',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула выбора связки — это два последовательных вопроса, не пять отдельных правил. Первый вопрос: сколько людей? Один — тогда второй вопрос: кто говорит про кого? Про себя — soy, к собеседнику — eres, про третьего — es. Несколько — тогда второй вопрос: говорящий внутри группы? Да — somos, нет — son. Отрицание встаёт перед любой из пяти форм одинаково: No soy rápido, No eres rápida, No es rápido, ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son rápidos — no не меняет саму формулу выбора, оно лишь добавляется впереди уже выбранной связки.', semantic: 'explanation' }),
      uk: R({ text: 'Формула вибору зв’язки — це два послідовні питання, а не п’ять окремих правил. Перше питання: скільки людей? Один — тоді друге питання: хто говорить про кого? Про себе — soy, до співрозмовника — eres, про третього — es. Кілька — тоді друге питання: мовець всередині групи? Так — somos, ні — son. Заперечення стає перед будь-якою з п’яти форм однаково: No soy rápido, No eres rápida, No es rápido, ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son rápidos — no не змінює саму формулу вибору, воно лише додається перед уже обраною зв’язкою.', semantic: 'explanation' }),
      es: R({ text: 'The formula for choosing the linking word is two sequential questions, not five separate rules. First question: how many people? One — then a second question: who is speaking about whom? About yourself — soy, to the listener — eres, about someone else — es. Several — then a second question: is the speaker inside the group? Yes — somos, no — son. Negation goes before any of the five forms the same way: No soy rápido, No eres rápida, No es rápido, ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son rápidos — no does not change the choice formula itself, it is simply added before the linking word already chosen.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula para escolher a ligação são duas perguntas sequenciais, não cinco regras separadas. Primeira pergunta: quantas pessoas? Uma — então uma segunda pergunta: quem fala sobre quem? Sobre si mesmo — soy, com o interlocutor — eres, sobre outra pessoa — es. Várias — então uma segunda pergunta: quem fala está dentro do grupo? Sim — somos, não — son. A negação vem antes de qualquer uma das cinco formas do mesmo jeito: No soy rápido, No eres rápida, No es rápido, ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son rápidos — no não muda a fórmula de escolha em si, é só acrescentado antes da ligação já escolhida.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức chọn từ nối là hai câu hỏi liên tiếp, không phải năm quy tắc riêng lẻ. Câu hỏi đầu: có bao nhiêu người? Một — rồi câu hỏi thứ hai: ai đang nói về ai? Về bản thân — soy, với người nghe — eres, về người khác — es. Nhiều người — rồi câu hỏi thứ hai: người nói có ở trong nhóm không? Có — somos, không — son. Phủ định đứng trước bất kỳ dạng nào trong năm dạng theo cùng một cách: No soy rápido, No eres rápida, No es rápido, ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son rápidos — no không thay đổi công thức lựa chọn, nó chỉ được thêm vào trước từ nối đã chọn.', semantic: 'explanation' }),
      id: R({ text: 'Rumus untuk memilih kata penghubung adalah dua pertanyaan berurutan, bukan lima aturan terpisah. Pertanyaan pertama: berapa banyak orang? Satu — lalu pertanyaan kedua: siapa berbicara tentang siapa? Tentang diri sendiri — soy, dengan pendengar — eres, tentang orang lain — es. Beberapa — lalu pertanyaan kedua: apakah penutur ada di dalam kelompok? Ya — somos, tidak — son. Negasi berada sebelum salah satu dari lima bentuk dengan cara yang sama: No soy rápido, No eres rápida, No es rápido, ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son rápidos — no tidak mengubah rumus pemilihan itu sendiri, hanya ditambahkan sebelum kata penghubung yang sudah dipilih.', semantic: 'explanation' }),
      tr: R({ text: 'Bağlaç seçme formülü, beş ayrı kural değil, iki ardışık sorudur. İlk soru: kaç kişi? Bir — sonra ikinci soru: kim kimden bahsediyor? Kendinden — soy, dinleyiciye — eres, başkasından — es. Birden fazla — sonra ikinci soru: konuşan grubun içinde mi? Evet — somos, hayır — son. Olumsuzlama, beş biçimden herhangi birinin önüne aynı şekilde gelir: No soy rápido, No eres rápida, No es rápido, ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son rápidos — no, seçim formülünün kendisini değiştirmez, yalnızca zaten seçilmiş bağlacın önüne eklenir.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła wyboru łącznika to dwa kolejne pytania, a nie pięć osobnych reguł. Pierwsze pytanie: ile osób? Jedna — wtedy drugie pytanie: kto mówi o kim? O sobie — soy, do słuchacza — eres, o kimś innym — es. Kilka — wtedy drugie pytanie: czy mówiący jest w grupie? Tak — somos, nie — son. Przeczenie staje przed dowolną z pięciu form tak samo: No soy rápido, No eres rápida, No es rápido, ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son rápidos — no nie zmienia samej formuły wyboru, jest po prostu dodawane przed już wybranym łącznikiem.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Отрицание про группу женского рода без говорящего внутри — как сказать?',
        uk: 'Заперечення про групу жіночого роду без мовця всередині — як сказати?',
        es: 'Negation about a feminine group without the speaker inside — how do you say it?',
        'pt-BR': 'Negação sobre um grupo feminino sem quem fala dentro — como dizer?',
        vi: 'Phủ định về nhóm giống cái không có người nói ở trong — nói thế nào?',
        id: 'Negasi tentang kelompok feminin tanpa penutur di dalamnya — bagaimana mengatakannya?',
        tr: 'İçinde konuşan olmayan dişil bir grup hakkında olumsuzlama — nasıl söylenir?',
        pl: 'Przeczenie o grupie żeńskiej bez mówiącego w środku — jak powiedzieć?',
      }),
      choices: [
        L({ ru: 'No son rápidas', uk: 'No son rápidas', es: 'No son rápidas', 'pt-BR': 'No son rápidas', vi: 'No son rápidas', id: 'No son rápidas', tr: 'No son rápidas', pl: 'No son rápidas' }),
        L({ ru: 'No somos rápidas', uk: 'No somos rápidas', es: 'No somos rápidas', 'pt-BR': 'No somos rápidas', vi: 'No somos rápidas', id: 'No somos rápidas', tr: 'No somos rápidas', pl: 'No somos rápidas' }),
        L({ ru: 'No son rápidos', uk: 'No son rápidos', es: 'No son rápidos', 'pt-BR': 'No son rápidos', vi: 'No son rápidos', id: 'No son rápidos', tr: 'No son rápidos', pl: 'No son rápidos' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No son rápidas верно: несколько человек (son, а не somos, потому что говорящий снаружи) женского рода (rápidas), с no впереди связки.',
        uk: 'No son rápidas правильно: кілька людей (son, а не somos, бо мовець зовні) жіночого роду (rápidas), з no перед зв’язкою.',
        es: 'No son rápidas is correct: several people (son, not somos, because the speaker is outside), feminine (rápidas), with no before the linking word.',
        'pt-BR': 'No son rápidas está correto: várias pessoas (son, não somos, porque quem fala está fora), feminino (rápidas), com no antes da ligação.',
        vi: 'No son rápidas đúng: nhiều người (son, không phải somos, vì người nói ở ngoài), giống cái (rápidas), với no trước từ nối.',
        id: 'No son rápidas benar: beberapa orang (son, bukan somos, karena penutur di luar), feminin (rápidas), dengan no sebelum kata penghubung.',
        tr: 'No son rápidas doğrudur: birkaç kişi (son, somos değil, çünkü konuşan dışarıda), dişil (rápidas), bağlaçtan önce no ile.',
        pl: 'No son rápidas jest poprawne: kilka osób (son, nie somos, bo mówiący jest na zewnątrz), rodzaj żeński (rápidas), z no przed łącznikiem.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Somos и son — состав группы, не число людей',
      uk: 'Somos і son — склад групи, не кількість людей',
      es: 'Somos and son — group makeup, not the number of people',
      'pt-BR': 'Somos e son — composição do grupo, não o número de pessoas',
      vi: 'Somos và son — thành phần nhóm, không phải số người',
      id: 'Somos dan son — susunan kelompok, bukan jumlah orang',
      tr: 'Somos ve son — kişi sayısı değil, grup bileşimi',
      pl: 'Somos i son — skład grupy, nie liczba osób',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Самая частая путаница — перепутать somos и son, потому что оба про «несколько». Проверка одна: входит ли говорящий в группу, о которой речь? Да — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', нет — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '; число людей тут ни при чём, только состав группы. Вторая путаница — забыть, что eres это ВСЕГДА обращение к одному собеседнику напрямую, а не рассказ о ком-то третьем; рассказ о третьем — это всегда es, даже если по смыслу похоже на «ты». Проверка простая: если фраза обращена ко второму лицу — eres, если описывает кого-то со стороны — es, а группа выбирается по составу, а не по числу.', semantic: 'explanation' }),
      uk: R({ text: 'Найчастіша плутанина — переплутати somos і son, бо обидва про «кількох». Перевірка одна: чи входить мовець у групу, про яку йдеться? Так — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', ні — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '; кількість людей тут ні до чого, лише склад групи. Друга плутанина — забути, що eres це ЗАВЖДИ звернення до одного співрозмовника напряму, а не розповідь про когось третього; розповідь про третього — це завжди es, навіть якщо за змістом схоже на «ти». Перевірка проста: якщо фраза звернена до другої особи — eres, якщо описує когось збоку — es, а група обирається за складом, а не за кількістю.', semantic: 'explanation' }),
      es: R({ text: 'The most common confusion is mixing up somos and son, because both are about "several". There is one check: does the speaker belong to the group being discussed? Yes — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', no — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '; the number of people has nothing to do with it, only the group\'s makeup. The second confusion is forgetting that eres is ALWAYS a direct address to one listener, not a description of someone else; describing a third party is always es, even if it feels similar to "you" in meaning. The check is simple: if the phrase addresses the second person directly — eres, if it describes someone from outside — es, and the group is chosen by makeup, not by number.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A confusão mais comum é misturar somos e son, porque ambos são sobre "várias pessoas". Há uma checagem: quem fala pertence ao grupo de que se fala? Sim — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', não — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '; o número de pessoas não tem nada a ver, só a composição do grupo. A segunda confusão é esquecer que eres é SEMPRE um endereçamento direto a um interlocutor, não uma descrição de outra pessoa; descrever um terceiro é sempre es, mesmo que pareça parecido com "você" em significado. A checagem é simples: se a frase se dirige diretamente à segunda pessoa — eres, se descreve alguém de fora — es, e o grupo é escolhido pela composição, não pelo número.', semantic: 'explanation' }),
      vi: R({ text: 'Sự nhầm lẫn phổ biến nhất là lẫn lộn somos và son, vì cả hai đều nói về "nhiều người". Chỉ có một cách kiểm tra: người nói có thuộc nhóm đang được nói tới hay không? Có — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', không — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '; số lượng người không liên quan, chỉ thành phần của nhóm mới quan trọng. Sự nhầm lẫn thứ hai là quên rằng eres LUÔN LUÔN là nói trực tiếp với một người nghe, không phải mô tả về người khác; mô tả về người thứ ba luôn là es, kể cả khi về nghĩa nó giống với "bạn". Cách kiểm tra đơn giản: nếu câu nói trực tiếp với ngôi thứ hai — eres, nếu mô tả ai đó từ bên ngoài — es, còn nhóm được chọn theo thành phần, không theo số lượng.', semantic: 'explanation' }),
      id: R({ text: 'Kebingungan paling umum adalah mengacaukan somos dan son, karena keduanya tentang "beberapa orang". Hanya ada satu pengecekan: apakah penutur termasuk dalam kelompok yang dibicarakan? Ya — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', tidak — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '; jumlah orang tidak ada hubungannya, hanya susunan kelompok yang penting. Kebingungan kedua adalah melupakan bahwa eres SELALU merupakan sapaan langsung kepada satu pendengar, bukan deskripsi tentang orang lain; mendeskripsikan pihak ketiga selalu es, meskipun terasa mirip dengan "kamu" secara makna. Pengecekannya sederhana: jika frasa menyapa orang kedua secara langsung — eres, jika mendeskripsikan seseorang dari luar — es, dan kelompok dipilih berdasarkan susunan, bukan jumlah.', semantic: 'explanation' }),
      tr: R({ text: 'En yaygın karışıklık, ikisi de "birkaç kişi" hakkında olduğu için somos ve son’u karıştırmaktır. Tek bir kontrol vardır: konuşan, söz konusu olan gruba dahil mi? Evet — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', hayır — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '; kişi sayısının bununla hiçbir ilgisi yoktur, yalnızca grubun bileşimi önemlidir. İkinci karışıklık, eres’in HER ZAMAN bir dinleyiciye doğrudan hitap olduğunu, başka birinin tarifi olmadığını unutmaktır; üçüncü bir kişiyi tarif etmek her zaman es’tir, anlam olarak "sen"e benzese bile. Kontrol basittir: ifade ikinci kişiye doğrudan hitap ediyorsa — eres, dışarıdan birini tarif ediyorsa — es, grup ise sayıya değil bileşime göre seçilir.', semantic: 'explanation' }),
      pl: R({ text: 'Najczęstsza pomyłka to mylenie somos i son, ponieważ oba dotyczą „kilku osób”. Jest jedno sprawdzenie: czy mówiący należy do grupy, o której mowa? Tak — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', nie — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '; liczba osób nie ma tu znaczenia, liczy się tylko skład grupy. Druga pomyłka to zapominanie, że eres to ZAWSZE bezpośrednie zwrócenie się do jednego słuchacza, a nie opis kogoś innego; opisywanie osoby trzeciej to zawsze es, nawet jeśli znaczeniowo przypomina „ty”. Sprawdzenie jest proste: jeśli fraza zwraca się bezpośrednio do drugiej osoby — eres, jeśli opisuje kogoś z zewnątrz — es, a grupa jest wybierana według składu, nie liczby.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Прямое обращение к одной собеседнице — какая связка?',
        uk: 'Пряме звернення до однієї співрозмовниці — яка зв’язка?',
        es: 'Direct address to one female listener — which linking word?',
        'pt-BR': 'Endereçamento direto a uma interlocutora — qual ligação?',
        vi: 'Nói trực tiếp với một người nghe nữ — từ nối nào?',
        id: 'Sapaan langsung kepada satu pendengar wanita — kata penghubung mana?',
        tr: 'Bir kadın dinleyiciye doğrudan hitap — hangi bağlaç?',
        pl: 'Bezpośredni zwrot do jednej słuchaczki — jaki łącznik?',
      }),
      choices: [
        L({ ru: 'eres', uk: 'eres', es: 'eres', 'pt-BR': 'eres', vi: 'eres', id: 'eres', tr: 'eres', pl: 'eres' }),
        L({ ru: 'es', uk: 'es', es: 'es', 'pt-BR': 'es', vi: 'es', id: 'es', tr: 'es', pl: 'es' }),
        L({ ru: 'somos', uk: 'somos', es: 'somos', 'pt-BR': 'somos', vi: 'somos', id: 'somos', tr: 'somos', pl: 'somos' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Eres верно: прямое обращение ко второму лицу — не рассказ о ней со стороны (тогда было бы es) и не группа (тогда было бы somos).',
        uk: 'Eres правильно: пряме звернення до другої особи — не розповідь про неї збоку (тоді було б es) і не група (тоді було б somos).',
        es: 'Eres is correct: a direct address to the second person — not a description of her from outside (that would be es) and not a group (that would be somos).',
        'pt-BR': 'Eres está correto: um endereçamento direto à segunda pessoa — não uma descrição dela de fora (seria es) e não um grupo (seria somos).',
        vi: 'Eres đúng: nói trực tiếp với ngôi thứ hai — không phải mô tả về cô ấy từ bên ngoài (thì sẽ là es) và không phải nhóm (thì sẽ là somos).',
        id: 'Eres benar: sapaan langsung kepada orang kedua — bukan deskripsi tentang dia dari luar (itu akan jadi es) dan bukan kelompok (itu akan jadi somos).',
        tr: 'Eres doğrudur: ikinci kişiye doğrudan hitap — onu dışarıdan tarif etmek değil (o zaman es olurdu) ve grup da değil (o zaman somos olurdu).',
        pl: 'Eres jest poprawne: bezpośredni zwrot do drugiej osoby — nie opis jej z zewnątrz (wtedy byłoby es) i nie grupa (wtedy byłoby somos).',
      }),
    },
  },
];
