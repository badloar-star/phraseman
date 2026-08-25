import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 32 "Все формы ser целиком" / kind: 'checkpoint', builtOn: [25..31],
// recalls: [1, 9, 17, 25, 27], закрывает Главу 4 "Мы и они"): по правилу
// владельца (память feedback_checkpoint_intro_no_meta_questions) checkpoint-
// интро НЕ должно быть списком пройденных тем и НЕ должно задавать мета-
// вопрос про сам процесс проверки ("что здесь проверяется"). Вместо этого
// три страницы учат ОДНОМУ конкретному языковому факту — той же схеме, что
// и обычная сессия. Выбран самый ценный контраст главы 4: somos и son
// различаются НЕ количеством людей (оба про "несколько"), а тем, входит ли
// говорящий в группу. Эта путаница — самая частая ошибка глав 4 согласно
// собственным дистракторам сессий 25-30 (somos как agreement_person_mismatch
// против son и наоборот встречается почти в каждой фразе с этими связками).
// Ни одна из трёх intro-страниц не упоминает номера сессий, слово
// "сессия/урок/глава/курс/экран/карточка" и не перечисляет пройденный
// материал построчно.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_32_CHECKPOINT_TITLE = L({
  ru: 'Все формы ser целиком',
  uk: 'Усі форми ser разом',
  es: 'All the forms of ser together',
  'pt-BR': 'Todas as formas de ser juntas',
  vi: 'Tất cả các dạng của ser cùng nhau',
  id: 'Semua bentuk ser bersama-sama',
  tr: 'Ser’in tüm biçimleri bir arada',
  pl: 'Wszystkie formy ser razem',
});

export const ES_EPISODE_01_SESSION_32_CHECKPOINT_SUMMARY = L({
  ru: 'Somos и son оба про «несколько», но их выбор зависит только от одного признака: входит ли говорящий в группу.',
  uk: 'Somos і son обидва про «кількох», але їхній вибір залежить лише від однієї ознаки: чи входить мовець у групу.',
  es: 'Somos and son are both about "several", but choosing between them depends on just one feature: whether the speaker belongs to the group.',
  'pt-BR': 'Somos e son são ambos sobre "várias pessoas", mas a escolha entre eles depende de só uma característica: se quem fala pertence ao grupo.',
  vi: 'Somos và son đều nói về "nhiều người", nhưng việc chọn giữa chúng chỉ phụ thuộc vào một đặc điểm: người nói có thuộc nhóm hay không.',
  id: 'Somos dan son sama-sama tentang "beberapa orang", tetapi pemilihan di antara keduanya hanya bergantung pada satu ciri: apakah penutur termasuk dalam kelompok.',
  tr: 'Somos ve son ikisi de "birkaç kişi" hakkındadır, ama aralarındaki seçim yalnızca tek bir özelliğe bağlıdır: konuşan gruba dahil mi.',
  pl: 'Somos i son oba dotyczą „kilku osób”, ale wybór między nimi zależy tylko od jednej cechy: czy mówiący należy do grupy.',
});

export const ES_EPISODE_01_SESSION_32_CHECKPOINT_GOAL = L({
  ru: 'Безошибочно выбирать между somos и son по единственному признаку — составу группы, а не по числу людей в ней.',
  uk: 'Безпомилково обирати між somos і son за єдиною ознакою — складом групи, а не за кількістю людей у ній.',
  es: 'Choose flawlessly between somos and son based on a single feature — the group\'s makeup, not the number of people in it.',
  'pt-BR': 'Escolher sem erros entre somos e son com base em uma única característica — a composição do grupo, não o número de pessoas nele.',
  vi: 'Chọn không sai giữa somos và son dựa trên một đặc điểm duy nhất — thành phần của nhóm, không phải số người trong đó.',
  id: 'Memilih tanpa kesalahan antara somos dan son berdasarkan satu ciri — susunan kelompok, bukan jumlah orang di dalamnya.',
  tr: 'Somos ve son arasında tek bir özelliğe göre hatasız seçim yapmak — gruptaki kişi sayısına değil, grubun bileşimine göre.',
  pl: 'Bezbłędnie wybierać między somos i son na podstawie jednej cechy — składu grupy, a nie liczby osób w niej.',
});

const CONCEPT_BODY = L({
  ru: 'Somos rápidos и son rápidos звучат почти одинаково, но означают разное: somos говорит о группе, в которую входит сам говорящий, а son — о группе, в которую он не входит. Число людей в группе тут вообще ни при чём — оба слова годятся хоть для двух человек, хоть для десяти. Решает только один вопрос: «я тоже там?». Если ответ да — somos rápidos, если нет — son rápidos. Эта же логика работает и с отрицанием: no somos значит «мы не», а no son значит «они не», причём признак после связки не меняется от самого факта отрицания вовсе.',
  uk: 'Somos rápidos і son rápidos звучать майже однаково, але означають різне: somos говорить про групу, в яку входить сам мовець, а son — про групу, в яку він не входить. Кількість людей у групі тут узагалі ні до чого — обидва слова годяться хоч для двох людей, хоч для десяти. Вирішує лише одне питання: «я теж там?». Якщо відповідь так — somos rápidos, якщо ні — son rápidos. Ця сама логіка працює і з запереченням: no somos означає «ми не», а no son означає «вони не», причому ознака після зв’язки не змінюється від самого факту заперечення взагалі.',
  es: 'Somos rápidos and son rápidos sound almost the same, but mean different things: somos talks about a group that includes the speaker, while son talks about a group that does not include the speaker. The number of people in the group has nothing to do with it at all — both words work for two people or for ten. Only one question decides: "am I there too?" If the answer is yes — somos rápidos, if no — son rápidos. The same logic works with negation: no somos means "we are not", and no son means "they are not", and the quality after the linking word does not change from negation at all.',
  'pt-BR': 'Somos rápidos e son rápidos soam quase iguais, mas significam coisas diferentes: somos fala de um grupo que inclui quem fala, enquanto son fala de um grupo que não inclui quem fala. O número de pessoas no grupo não tem nada a ver com isso — ambas as palavras servem tanto para duas pessoas quanto para dez. Só uma pergunta decide: "eu também estou lá?" Se a resposta é sim — somos rápidos, se não — son rápidos. A mesma lógica funciona com a negação: no somos significa "nós não somos", e no son significa "eles não são", e a qualidade depois da ligação não muda nada com a negação.',
  vi: 'Somos rápidos và son rápidos nghe gần như giống nhau, nhưng có nghĩa khác nhau: somos nói về một nhóm gồm cả người nói, còn son nói về một nhóm không có người nói. Số lượng người trong nhóm hoàn toàn không liên quan — cả hai từ đều dùng được cho hai người hay mười người. Chỉ một câu hỏi quyết định: "tôi có ở đó không?" Nếu câu trả lời là có — somos rápidos, nếu không — son rápidos. Logic tương tự áp dụng với phủ định: no somos nghĩa là "chúng tôi không", và no son nghĩa là "họ không", và đặc điểm sau từ nối hoàn toàn không đổi vì phủ định.',
  id: 'Somos rápidos dan son rápidos terdengar hampir sama, tetapi berarti berbeda: somos berbicara tentang kelompok yang mencakup penutur, sedangkan son berbicara tentang kelompok yang tidak mencakup penutur. Jumlah orang dalam kelompok sama sekali tidak ada hubungannya — kedua kata itu cocok untuk dua orang maupun sepuluh orang. Hanya satu pertanyaan yang memutuskan: "apakah saya juga di sana?" Jika jawabannya ya — somos rápidos, jika tidak — son rápidos. Logika yang sama berlaku dengan negasi: no somos berarti "kami tidak", dan no son berarti "mereka tidak", dan sifat setelah kata penghubung sama sekali tidak berubah karena negasi.',
  tr: 'Somos rápidos ve son rápidos neredeyse aynı duyulur, ama farklı anlamlara gelir: somos, konuşanı da içeren bir grup hakkındadır, son ise konuşanı içermeyen bir grup hakkındadır. Gruptaki kişi sayısının bununla hiçbir ilgisi yoktur — her iki kelime de iki kişi için de on kişi için de uygundur. Yalnızca bir soru karar verir: "ben de orada mıyım?" Cevap evetse — somos rápidos, hayırsa — son rápidos. Aynı mantık olumsuzlamada da işler: no somos "biz değiliz" demektir, no son ise "onlar değil" demektir ve bağlaçtan sonraki nitelik olumsuzlamadan hiç değişmez.',
  pl: 'Somos rápidos i son rápidos brzmią niemal identycznie, ale znaczą co innego: somos mówi o grupie obejmującej mówiącego, a son mówi o grupie, która go nie obejmuje. Liczba osób w grupie nie ma tu żadnego znaczenia — oba słowa pasują zarówno do dwóch, jak i do dziesięciu osób. Decyduje tylko jedno pytanie: „czy ja też tam jestem?”. Jeśli odpowiedź brzmi tak — somos rápidos, jeśli nie — son rápidos. Ta sama logika działa przy przeczeniu: no somos znaczy „my nie”, a no son znaczy „oni nie”, a cecha po łączniku wcale się nie zmienia przez sam fakt przeczenia.',
});

const FORMULA_BODY = L({
  ru: 'Формула проверки одна и та же для любой фразы с несколькими людьми: сначала спроси себя «я в этой группе?», а уже потом выбирай слово. Да — somos, нет — son. Признак после связки согласуется по роду и числу того, о ком речь, а не самого говорящего: Somos rápidas годится только если говорящая — женщина и вся группа женского рода, Son rápidos — если группа мужского рода или смешанная. Отрицание встраивается перед связкой тем же способом, что и в единственном числе: No somos rápidas, No son rápidos — no не меняет ни выбор связки, ни согласование признака.',
  uk: 'Формула перевірки одна й та сама для будь-якої фрази з кількома людьми: спочатку спитай себе «я в цій групі?», а вже потім обирай слово. Так — somos, ні — son. Ознака після зв’язки узгоджується за родом і числом того, про кого йдеться, а не самого мовця: Somos rápidas годиться лише якщо мовиця — жінка і вся група жіночого роду, Son rápidos — якщо група чоловічого роду чи змішана. Заперечення вбудовується перед зв’язкою тим самим способом, що й в однині: No somos rápidas, No son rápidos — no не змінює ні вибір зв’язки, ні узгодження ознаки.',
  es: 'The check formula is the same for any phrase about several people: first ask yourself "am I in this group?", and only then choose the word. Yes — somos, no — son. The quality after the linking word agrees with the gender and number of whoever is being discussed, not the speaker: Somos rápidas only works if the speaker is a woman and the whole group is feminine, Son rápidos works if the group is masculine or mixed. Negation is inserted before the linking word the same way as in the singular: No somos rápidas, No son rápidos — no changes neither the choice of the linking word nor the agreement of the quality.',
  'pt-BR': 'A fórmula de checagem é a mesma para qualquer frase sobre várias pessoas: primeiro pergunte a si mesmo "eu estou nesse grupo?", e só depois escolha a palavra. Sim — somos, não — son. A qualidade depois da ligação concorda com o gênero e o número de quem está sendo discutido, não de quem fala: Somos rápidas só funciona se quem fala é mulher e todo o grupo é feminino, Son rápidos funciona se o grupo é masculino ou misto. A negação é inserida antes da ligação do mesmo jeito que no singular: No somos rápidas, No son rápidos — no não muda nem a escolha da ligação nem a concordância da qualidade.',
  vi: 'Công thức kiểm tra giống nhau cho bất kỳ câu nào nói về nhiều người: trước tiên tự hỏi "tôi có trong nhóm này không?", rồi mới chọn từ. Có — somos, không — son. Đặc điểm sau từ nối hòa hợp với giống và số của người đang được nói tới, không phải người nói: Somos rápidas chỉ đúng nếu người nói là nữ và cả nhóm là giống cái, Son rápidos đúng nếu nhóm là giống đực hoặc hỗn hợp. Phủ định được chèn trước từ nối theo cùng cách như ở số ít: No somos rápidas, No son rápidos — no không thay đổi việc chọn từ nối hay sự hòa hợp của đặc điểm.',
  id: 'Rumus pengecekannya sama untuk frasa apa pun tentang beberapa orang: pertama tanyakan pada diri sendiri "apakah saya ada di kelompok ini?", baru kemudian pilih katanya. Ya — somos, tidak — son. Sifat setelah kata penghubung sesuai dengan gender dan jumlah dari siapa yang dibicarakan, bukan penuturnya: Somos rápidas hanya berlaku jika penuturnya wanita dan seluruh kelompok feminin, Son rápidos berlaku jika kelompoknya maskulin atau campuran. Negasi disisipkan sebelum kata penghubung dengan cara yang sama seperti pada bentuk tunggal: No somos rápidas, No son rápidos — no tidak mengubah baik pemilihan kata penghubung maupun kesesuaian sifat.',
  tr: 'Kontrol formülü, birkaç kişi hakkındaki herhangi bir ifade için aynıdır: önce kendine "ben bu grupta mıyım?" diye sor, ancak ondan sonra kelimeyi seç. Evet — somos, hayır — son. Bağlaçtan sonraki nitelik, konuşanın değil, söz konusu olanın cinsiyeti ve sayısıyla uyumludur: Somos rápidas yalnızca konuşan bir kadınsa ve tüm grup dişilse işe yarar, Son rápidos grup eril ya da karma ise işe yarar. Olumsuzlama, tekildeki ile aynı şekilde bağlaçtan önce eklenir: No somos rápidas, No son rápidos — no ne bağlaç seçimini ne de niteliğin uyumunu değiştirir.',
  pl: 'Formuła sprawdzania jest taka sama dla każdej frazy o kilku osobach: najpierw zapytaj siebie „czy ja jestem w tej grupie?”, a dopiero potem wybierz słowo. Tak — somos, nie — son. Cecha po łączniku zgadza się z rodzajem i liczbą tego, o kim mowa, a nie samego mówiącego: Somos rápidas działa tylko wtedy, gdy mówiąca jest kobietą i cała grupa jest rodzaju żeńskiego, Son rápidos działa, gdy grupa jest rodzaju męskiego lub mieszana. Przeczenie wstawia się przed łącznikiem tak samo jak w liczbie pojedynczej: No somos rápidas, No son rápidos — no nie zmienia ani wyboru łącznika, ani zgodności cechy.',
});

const TRAP_BODY = L({
  ru: 'Самая частая ошибка — решить вопрос связки по количеству людей, а не по их составу: кажется, что «нас много» само по себе требует somos, но это неверно. Если говорящий описывает чужую компанию со стороны, даже из десяти человек, нужно son, а не somos — потому что его самого там нет. И наоборот: даже пара «я и один друг» требует somos, потому что говорящий входит в эту пару. Проверка одна и та же в любом случае: сначала «я в группе?», и только потом — форма признака под нужный род и число.',
  uk: 'Найчастіша помилка — вирішити питання зв’язки за кількістю людей, а не за їхнім складом: здається, що «нас багато» саме собою вимагає somos, але це неправильно. Якщо мовець описує чужу компанію збоку, навіть із десяти людей, потрібне son, а не somos — бо його самого там немає. І навпаки: навіть пара «я і один друг» вимагає somos, бо мовець входить у цю пару. Перевірка та сама в будь-якому випадку: спочатку «я в групі?», і лише потім — форма ознаки під потрібний рід і число.',
  es: 'The most common mistake is deciding the linking word by the number of people rather than by who is in the group: it seems like "there are many of us" alone should require somos, but that is wrong. If the speaker describes someone else\'s group from the outside, even of ten people, son is needed, not somos — because the speaker is not part of it. The other way around, even a pair of "me and one friend" requires somos, because the speaker belongs to that pair. The check is always the same: first "am I in the group?", only then the quality form matching the right gender and number.',
  'pt-BR': 'O erro mais comum é decidir a ligação pelo número de pessoas em vez de por quem está no grupo: parece que "somos muitos" por si só exige somos, mas isso está errado. Se quem fala descreve o grupo de outra pessoa de fora, mesmo de dez pessoas, precisa de son, não somos — porque quem fala não faz parte dele. Ao contrário, mesmo uma dupla de "eu e um amigo" exige somos, porque quem fala pertence a essa dupla. A checagem é sempre a mesma: primeiro "eu estou no grupo?", só depois a forma da qualidade que combina com o gênero e o número certos.',
  vi: 'Lỗi phổ biến nhất là quyết định từ nối theo số lượng người thay vì theo ai ở trong nhóm: có vẻ như "chúng ta đông" tự nó đòi hỏi somos, nhưng điều đó sai. Nếu người nói mô tả một nhóm khác từ bên ngoài, dù có mười người, cần son, không phải somos — vì người nói không thuộc nhóm đó. Ngược lại, dù chỉ là cặp "tôi và một người bạn" cũng cần somos, vì người nói thuộc cặp đó. Cách kiểm tra luôn giống nhau: trước tiên "tôi có trong nhóm không?", sau đó mới đến dạng đặc điểm khớp với giống và số đúng.',
  id: 'Kesalahan paling umum adalah memutuskan kata penghubung berdasarkan jumlah orang, bukan berdasarkan siapa yang ada dalam kelompok: tampaknya "kita banyak" saja sudah memerlukan somos, tetapi itu salah. Jika penutur mendeskripsikan kelompok orang lain dari luar, bahkan sepuluh orang sekalipun, yang diperlukan adalah son, bukan somos — karena penutur bukan bagian darinya. Sebaliknya, bahkan pasangan "saya dan satu teman" pun memerlukan somos, karena penutur termasuk dalam pasangan itu. Pengecekannya selalu sama: pertama "apakah saya ada di kelompok?", baru kemudian bentuk sifat yang cocok dengan gender dan jumlah yang tepat.',
  tr: 'En yaygın hata, bağlaca kimin grupta olduğuna göre değil, kişi sayısına göre karar vermektir: "bizim çok kişiyiz" tek başına somos gerektiriyormuş gibi görünür, ama bu yanlıştır. Konuşan başka birinin grubunu dışarıdan tarif ediyorsa, on kişi olsa bile, somos değil son gerekir — çünkü konuşan onun bir parçası değildir. Tersi de geçerlidir: "ben ve bir arkadaşım" gibi bir çift bile somos gerektirir, çünkü konuşan o çiftin içindedir. Kontrol her zaman aynıdır: önce "ben grupta mıyım?", ancak ondan sonra doğru cinsiyet ve sayıya uyan nitelik biçimi.',
  pl: 'Najczęstszy błąd to decydowanie o łączniku na podstawie liczby osób zamiast tego, kto jest w grupie: wydaje się, że „jest nas wielu” samo w sobie wymaga somos, ale to błąd. Jeśli mówiący opisuje cudzą grupę z zewnątrz, nawet dziesięcioosobową, potrzebne jest son, nie somos — bo sam mówiący do niej nie należy. I odwrotnie, nawet para „ja i jeden przyjaciel” wymaga somos, bo mówiący należy do tej pary. Sprawdzenie jest zawsze takie samo: najpierw „czy ja jestem w grupie?”, dopiero potem forma cechy dopasowana do właściwego rodzaju i liczby.',
});

export const ES_EPISODE_01_SESSION_32_CHECKPOINT_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Один вопрос решает всё: «я в группе?»',
      uk: 'Одне питання вирішує все: «я в групі?»',
      es: 'One question decides everything: "am I in the group?"',
      'pt-BR': 'Uma pergunta decide tudo: "eu estou no grupo?"',
      vi: 'Một câu hỏi quyết định tất cả: "tôi có trong nhóm không?"',
      id: 'Satu pertanyaan memutuskan segalanya: "apakah saya ada di kelompok?"',
      tr: 'Tek bir soru her şeyi belirler: "ben grupta mıyım?"',
      pl: 'Jedno pytanie decyduje o wszystkim: „czy ja jestem w grupie?”',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Somos rápidos и son rápidos звучат почти одинаково, но означают разное: somos говорит о группе, в которую входит сам говорящий, а son — о группе, в которую он не входит. Число людей в группе тут вообще ни при чём — оба слова годятся хоть для двух человек, хоть для десяти. Решает только один вопрос: «я тоже там?». Если ответ да — ', semantic: 'explanation' }, { text: 'somos rápidos', semantic: 'targetCorrect' }, { text: ', если нет — son rápidos. Эта же логика работает и с отрицанием: no somos значит «мы не», а no son значит «они не», причём признак после связки не меняется от самого факта отрицания вовсе.', semantic: 'explanation' }),
      uk: R({ text: 'Somos rápidos і son rápidos звучать майже однаково, але означають різне: somos говорить про групу, в яку входить сам мовець, а son — про групу, в яку він не входить. Кількість людей у групі тут узагалі ні до чого — обидва слова годяться хоч для двох людей, хоч для десяти. Вирішує лише одне питання: «я теж там?». Якщо відповідь так — ', semantic: 'explanation' }, { text: 'somos rápidos', semantic: 'targetCorrect' }, { text: ', якщо ні — son rápidos. Ця сама логіка працює і з запереченням: no somos означає «ми не», а no son означає «вони не», причому ознака після зв’язки не змінюється від самого факту заперечення взагалі.', semantic: 'explanation' }),
      es: R({ text: 'Somos rápidos and son rápidos sound almost the same, but mean different things: somos talks about a group that includes the speaker, while son talks about a group that does not include the speaker. The number of people in the group has nothing to do with it at all — both words work for two people or for ten. Only one question decides: "am I there too?" If the answer is yes — ', semantic: 'explanation' }, { text: 'somos rápidos', semantic: 'targetCorrect' }, { text: ', if no — son rápidos. The same logic works with negation: no somos means "we are not", and no son means "they are not", and the quality after the linking word does not change from negation at all.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Somos rápidos e son rápidos soam quase iguais, mas significam coisas diferentes: somos fala de um grupo que inclui quem fala, enquanto son fala de um grupo que não inclui quem fala. O número de pessoas no grupo não tem nada a ver com isso — ambas as palavras servem tanto para duas pessoas quanto para dez. Só uma pergunta decide: "eu também estou lá?" Se a resposta é sim — ', semantic: 'explanation' }, { text: 'somos rápidos', semantic: 'targetCorrect' }, { text: ', se não — son rápidos. A mesma lógica funciona com a negação: no somos significa "nós não somos", e no son significa "eles não são", e a qualidade depois da ligação não muda nada com a negação.', semantic: 'explanation' }),
      vi: R({ text: 'Somos rápidos và son rápidos nghe gần như giống nhau, nhưng có nghĩa khác nhau: somos nói về một nhóm gồm cả người nói, còn son nói về một nhóm không có người nói. Số lượng người trong nhóm hoàn toàn không liên quan — cả hai từ đều dùng được cho hai người hay mười người. Chỉ một câu hỏi quyết định: "tôi có ở đó không?" Nếu câu trả lời là có — ', semantic: 'explanation' }, { text: 'somos rápidos', semantic: 'targetCorrect' }, { text: ', nếu không — son rápidos. Logic tương tự áp dụng với phủ định: no somos nghĩa là "chúng tôi không", và no son nghĩa là "họ không", và đặc điểm sau từ nối hoàn toàn không đổi vì phủ định.', semantic: 'explanation' }),
      id: R({ text: 'Somos rápidos dan son rápidos terdengar hampir sama, tetapi berarti berbeda: somos berbicara tentang kelompok yang mencakup penutur, sedangkan son berbicara tentang kelompok yang tidak mencakup penutur. Jumlah orang dalam kelompok sama sekali tidak ada hubungannya — kedua kata itu cocok untuk dua orang maupun sepuluh orang. Hanya satu pertanyaan yang memutuskan: "apakah saya juga di sana?" Jika jawabannya ya — ', semantic: 'explanation' }, { text: 'somos rápidos', semantic: 'targetCorrect' }, { text: ', jika tidak — son rápidos. Logika yang sama berlaku dengan negasi: no somos berarti "kami tidak", dan no son berarti "mereka tidak", dan sifat setelah kata penghubung sama sekali tidak berubah karena negasi.', semantic: 'explanation' }),
      tr: R({ text: 'Somos rápidos ve son rápidos neredeyse aynı duyulur, ama farklı anlamlara gelir: somos, konuşanı da içeren bir grup hakkındadır, son ise konuşanı içermeyen bir grup hakkındadır. Gruptaki kişi sayısının bununla hiçbir ilgisi yoktur — her iki kelime de iki kişi için de on kişi için de uygundur. Yalnızca bir soru karar verir: "ben de orada mıyım?" Cevap evetse — ', semantic: 'explanation' }, { text: 'somos rápidos', semantic: 'targetCorrect' }, { text: ', hayırsa — son rápidos. Aynı mantık olumsuzlamada da işler: no somos "biz değiliz" demektir, no son ise "onlar değil" demektir ve bağlaçtan sonraki nitelik olumsuzlamadan hiç değişmez.', semantic: 'explanation' }),
      pl: R({ text: 'Somos rápidos i son rápidos brzmią niemal identycznie, ale znaczą co innego: somos mówi o grupie obejmującej mówiącego, a son mówi o grupie, która go nie obejmuje. Liczba osób w grupie nie ma tu żadnego znaczenia — oba słowa pasują zarówno do dwóch, jak i do dziesięciu osób. Decyduje tylko jedno pytanie: „czy ja też tam jestem?”. Jeśli odpowiedź brzmi tak — ', semantic: 'explanation' }, { text: 'somos rápidos', semantic: 'targetCorrect' }, { text: ', jeśli nie — son rápidos. Ta sama logika działa przy przeczeniu: no somos znaczy „my nie”, a no son znaczy „oni nie”, a cecha po łączniku wcale się nie zmienia przez sam fakt przeczenia.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Говорящий описывает свою собственную группу — как звучит уверенное «мы быстрые»?',
        uk: 'Мовець описує свою власну групу — як звучить впевнене «ми швидкі»?',
        es: 'The speaker is describing their own group — how does a confident "we are fast" sound?',
        'pt-BR': 'Quem fala está descrevendo o próprio grupo — como soa um confiante "somos rápidos"?',
        vi: 'Người nói đang mô tả nhóm của chính mình — câu tự tin "chúng tôi nhanh" nghe thế nào?',
        id: 'Penutur mendeskripsikan kelompoknya sendiri — bagaimana "kami cepat" yang percaya diri terdengar?',
        tr: 'Konuşan kendi grubunu tarif ediyor — kendinden emin "biz hızlıyız" nasıl duyulur?',
        pl: 'Mówiący opisuje własną grupę — jak brzmi pewne „jesteśmy szybcy”?',
      }),
      choices: [
        L({ ru: 'Somos rápidos', uk: 'Somos rápidos', es: 'Somos rápidos', 'pt-BR': 'Somos rápidos', vi: 'Somos rápidos', id: 'Somos rápidos', tr: 'Somos rápidos', pl: 'Somos rápidos' }),
        L({ ru: 'Son rápidos', uk: 'Son rápidos', es: 'Son rápidos', 'pt-BR': 'Son rápidos', vi: 'Son rápidos', id: 'Son rápidos', tr: 'Son rápidos', pl: 'Son rápidos' }),
        L({ ru: 'Es rápido', uk: 'Es rápido', es: 'Es rápido', 'pt-BR': 'Es rápido', vi: 'Es rápido', id: 'Es rápido', tr: 'Es rápido', pl: 'Es rápido' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Somos rápidos верно: говорящий описывает СВОЮ группу, значит он в неё входит — нужна связка somos, а не son (группа без него) или es (только один человек).',
        uk: 'Somos rápidos правильно: мовець описує СВОЮ групу, отже він до неї входить — потрібна зв’язка somos, а не son (група без нього) або es (лише одна людина).',
        es: 'Somos rápidos is correct: the speaker is describing their OWN group, meaning they belong to it — somos is needed, not son (a group without them) or es (only one person).',
        'pt-BR': 'Somos rápidos está correto: quem fala está descrevendo o PRÓPRIO grupo, ou seja, faz parte dele — precisa de somos, não son (um grupo sem ele) nem es (só uma pessoa).',
        vi: 'Somos rápidos đúng: người nói đang mô tả CHÍNH nhóm của mình, nghĩa là họ thuộc về nhóm đó — cần somos, không phải son (nhóm không có họ) hay es (chỉ một người).',
        id: 'Somos rápidos benar: penutur mendeskripsikan kelompoknya SENDIRI, artinya dia termasuk di dalamnya — perlu somos, bukan son (kelompok tanpa dia) atau es (hanya satu orang).',
        tr: 'Somos rápidos doğrudur: konuşan KENDİ grubunu tarif ediyor, yani ona dahil — somos gerekir, son (onsuz bir grup) veya es (yalnızca bir kişi) değil.',
        pl: 'Somos rápidos jest poprawne: mówiący opisuje SWOJĄ grupę, czyli do niej należy — potrzebne jest somos, nie son (grupa bez niego) ani es (tylko jedna osoba).',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Согласование признака — по группе, не по говорящему',
      uk: 'Узгодження ознаки — за групою, не за мовцем',
      es: 'Agreement of the quality — with the group, not the speaker',
      'pt-BR': 'Concordância da qualidade — com o grupo, não com quem fala',
      vi: 'Sự hòa hợp của đặc điểm — theo nhóm, không theo người nói',
      id: 'Kesesuaian sifat — dengan kelompok, bukan dengan penutur',
      tr: 'Niteliğin uyumu — konuşana değil gruba göre',
      pl: 'Zgodność cechy — z grupą, nie z mówiącym',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула проверки одна и та же для любой фразы с несколькими людьми: сначала спроси себя «я в этой группе?», а уже потом выбирай слово. Да — somos, нет — son. Признак после связки согласуется по роду и числу того, о ком речь, а не самого говорящего: ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' годится только если говорящая — женщина и вся группа женского рода, Son rápidos — если группа мужского рода или смешанная. Отрицание встраивается перед связкой тем же способом, что и в единственном числе: No somos rápidas, No son rápidos — no не меняет ни выбор связки, ни согласование признака.', semantic: 'explanation' }),
      uk: R({ text: 'Формула перевірки одна й та сама для будь-якої фрази з кількома людьми: спочатку спитай себе «я в цій групі?», а вже потім обирай слово. Так — somos, ні — son. Ознака після зв’язки узгоджується за родом і числом того, про кого йдеться, а не самого мовця: ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' годиться лише якщо мовиця — жінка і вся група жіночого роду, Son rápidos — якщо група чоловічого роду чи змішана. Заперечення вбудовується перед зв’язкою тим самим способом, що й в однині: No somos rápidas, No son rápidos — no не змінює ні вибір зв’язки, ні узгодження ознаки.', semantic: 'explanation' }),
      es: R({ text: 'The check formula is the same for any phrase about several people: first ask yourself "am I in this group?", and only then choose the word. Yes — somos, no — son. The quality after the linking word agrees with the gender and number of whoever is being discussed, not the speaker: ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' only works if the speaker is a woman and the whole group is feminine, Son rápidos works if the group is masculine or mixed. Negation is inserted before the linking word the same way as in the singular: No somos rápidas, No son rápidos — no changes neither the choice of the linking word nor the agreement of the quality.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula de checagem é a mesma para qualquer frase sobre várias pessoas: primeiro pergunte a si mesmo "eu estou nesse grupo?", e só depois escolha a palavra. Sim — somos, não — son. A qualidade depois da ligação concorda com o gênero e o número de quem está sendo discutido, não de quem fala: ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' só funciona se quem fala é mulher e todo o grupo é feminino, Son rápidos funciona se o grupo é masculino ou misto. A negação é inserida antes da ligação do mesmo jeito que no singular: No somos rápidas, No son rápidos — no não muda nem a escolha da ligação nem a concordância da qualidade.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức kiểm tra giống nhau cho bất kỳ câu nào nói về nhiều người: trước tiên tự hỏi "tôi có trong nhóm này không?", rồi mới chọn từ. Có — somos, không — son. Đặc điểm sau từ nối hòa hợp với giống và số của người đang được nói tới, không phải người nói: ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' chỉ đúng nếu người nói là nữ và cả nhóm là giống cái, Son rápidos đúng nếu nhóm là giống đực hoặc hỗn hợp. Phủ định được chèn trước từ nối theo cùng cách như ở số ít: No somos rápidas, No son rápidos — no không thay đổi việc chọn từ nối hay sự hòa hợp của đặc điểm.', semantic: 'explanation' }),
      id: R({ text: 'Rumus pengecekannya sama untuk frasa apa pun tentang beberapa orang: pertama tanyakan pada diri sendiri "apakah saya ada di kelompok ini?", baru kemudian pilih katanya. Ya — somos, tidak — son. Sifat setelah kata penghubung sesuai dengan gender dan jumlah dari siapa yang dibicarakan, bukan penuturnya: ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' hanya berlaku jika penuturnya wanita dan seluruh kelompok feminin, Son rápidos berlaku jika kelompoknya maskulin atau campuran. Negasi disisipkan sebelum kata penghubung dengan cara yang sama seperti pada bentuk tunggal: No somos rápidas, No son rápidos — no tidak mengubah baik pemilihan kata penghubung maupun kesesuaian sifat.', semantic: 'explanation' }),
      tr: R({ text: 'Kontrol formülü, birkaç kişi hakkındaki herhangi bir ifade için aynıdır: önce kendine "ben bu grupta mıyım?" diye sor, ancak ondan sonra kelimeyi seç. Evet — somos, hayır — son. Bağlaçtan sonraki nitelik, konuşanın değil, söz konusu olanın cinsiyeti ve sayısıyla uyumludur: ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' yalnızca konuşan bir kadınsa ve tüm grup dişilse işe yarar, Son rápidos grup eril ya da karma ise işe yarar. Olumsuzlama, tekildeki ile aynı şekilde bağlaçtan önce eklenir: No somos rápidas, No son rápidos — no ne bağlaç seçimini ne de niteliğin uyumunu değiştirir.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła sprawdzania jest taka sama dla każdej frazy o kilku osobach: najpierw zapytaj siebie „czy ja jestem w tej grupie?”, a dopiero potem wybierz słowo. Tak — somos, nie — son. Cecha po łączniku zgadza się z rodzajem i liczbą tego, o kim mowa, a nie samego mówiącego: ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' działa tylko wtedy, gdy mówiąca jest kobietą i cała grupa jest rodzaju żeńskiego, Son rápidos działa, gdy grupa jest rodzaju męskiego lub mieszana. Przeczenie wstawia się przed łącznikiem tak samo jak w liczbie pojedynczej: No somos rápidas, No son rápidos — no nie zmienia ani wyboru łącznika, ani zgodności cechy.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Говорящая-женщина описывает свою группу женского рода — как звучит уверенное «мы быстрые»?',
        uk: 'Мовиця-жінка описує свою групу жіночого роду — як звучить впевнене «ми швидкі»?',
        es: 'A female speaker is describing her own feminine group — how does a confident "we are fast" sound?',
        'pt-BR': 'Uma pessoa que fala descreve seu próprio grupo feminino — como soa um confiante "somos rápidas"?',
        vi: 'Người nói nữ mô tả nhóm giống cái của mình — câu tự tin "chúng tôi nhanh" nghe thế nào?',
        id: 'Penutur wanita mendeskripsikan kelompok femininnya sendiri — bagaimana "kami cepat" yang percaya diri terdengar?',
        tr: 'Kadın bir konuşan kendi dişil grubunu tarif ediyor — kendinden emin "biz hızlıyız" nasıl duyulur?',
        pl: 'Mówiąca kobieta opisuje swoją grupę żeńską — jak brzmi pewne „jesteśmy szybkie”?',
      }),
      choices: [
        L({ ru: 'Somos rápidas', uk: 'Somos rápidas', es: 'Somos rápidas', 'pt-BR': 'Somos rápidas', vi: 'Somos rápidas', id: 'Somos rápidas', tr: 'Somos rápidas', pl: 'Somos rápidas' }),
        L({ ru: 'Son rápidas', uk: 'Son rápidas', es: 'Son rápidas', 'pt-BR': 'Son rápidas', vi: 'Son rápidas', id: 'Son rápidas', tr: 'Son rápidas', pl: 'Son rápidas' }),
        L({ ru: 'Somos rápidos', uk: 'Somos rápidos', es: 'Somos rápidos', 'pt-BR': 'Somos rápidos', vi: 'Somos rápidos', id: 'Somos rápidos', tr: 'Somos rápidos', pl: 'Somos rápidos' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Somos rápidas верно: связка somos, потому что говорящая входит в свою группу, плюс окончание -as, потому что группа женского рода — оба условия выполняются одновременно, независимо друг от друга.',
        uk: 'Somos rápidas правильно: зв’язка somos, бо мовиця входить у свою групу, плюс закінчення -as, бо група жіночого роду — обидві умови виконуються одночасно, незалежно одна від одної.',
        es: 'Somos rápidas is correct: the linking word somos, because the speaker belongs to her own group, plus the -as ending, because the group is feminine — both conditions apply at once, independently of each other.',
        'pt-BR': 'Somos rápidas está correto: a ligação somos, porque quem fala pertence ao próprio grupo, mais a terminação -as, porque o grupo é feminino — ambas as condições valem ao mesmo tempo, independentemente uma da outra.',
        vi: 'Somos rápidas đúng: từ nối somos, vì người nói thuộc về nhóm của mình, cộng với đuôi -as, vì nhóm là giống cái — cả hai điều kiện áp dụng đồng thời, độc lập với nhau.',
        id: 'Somos rápidas benar: kata penghubung somos, karena penutur termasuk dalam kelompoknya sendiri, ditambah akhiran -as, karena kelompoknya feminin — kedua kondisi berlaku sekaligus, terlepas satu sama lain.',
        tr: 'Somos rápidas doğrudur: somos bağlacı, çünkü konuşan kendi grubuna dahil, artı -as eki, çünkü grup dişil — her iki koşul da birbirinden bağımsız olarak aynı anda geçerlidir.',
        pl: 'Somos rápidas jest poprawne: łącznik somos, ponieważ mówiąca należy do własnej grupy, plus końcówka -as, ponieważ grupa jest rodzaju żeńskiego — oba warunki obowiązują jednocześnie, niezależnie od siebie.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Число людей не решает, состав группы — решает',
      uk: 'Кількість людей не вирішує, склад групи — вирішує',
      es: 'The number of people does not decide, the group\'s makeup does',
      'pt-BR': 'O número de pessoas não decide, a composição do grupo decide',
      vi: 'Số lượng người không quyết định, thành phần nhóm mới quyết định',
      id: 'Jumlah orang tidak menentukan, susunan kelompok yang menentukan',
      tr: 'Kişi sayısı değil, grubun bileşimi karar verir',
      pl: 'Liczba osób nie decyduje, decyduje skład grupy',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Самая частая ошибка — решить вопрос связки по количеству людей, а не по их составу: кажется, что «нас много» само по себе требует somos, но это неверно. Если говорящий описывает чужую компанию со стороны, даже из десяти человек, нужно ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', а не somos — потому что его самого там нет. И наоборот: даже пара «я и один друг» требует somos, потому что говорящий входит в эту пару. Проверка одна и та же в любом случае: сначала «я в группе?», и только потом — форма признака под нужный род и число.', semantic: 'explanation' }),
      uk: R({ text: 'Найчастіша помилка — вирішити питання зв’язки за кількістю людей, а не за їхнім складом: здається, що «нас багато» саме собою вимагає somos, але це неправильно. Якщо мовець описує чужу компанію збоку, навіть із десяти людей, потрібне ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', а не somos — бо його самого там немає. І навпаки: навіть пара «я і один друг» вимагає somos, бо мовець входить у цю пару. Перевірка та сама в будь-якому випадку: спочатку «я в групі?», і лише потім — форма ознаки під потрібний рід і число.', semantic: 'explanation' }),
      es: R({ text: 'The most common mistake is deciding the linking word by the number of people rather than by who is in the group: it seems like "there are many of us" alone should require somos, but that is wrong. If the speaker describes someone else\'s group from the outside, even of ten people, ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ' is needed, not somos — because the speaker is not part of it. The other way around, even a pair of "me and one friend" requires somos, because the speaker belongs to that pair. The check is always the same: first "am I in the group?", only then the quality form matching the right gender and number.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'O erro mais comum é decidir a ligação pelo número de pessoas em vez de por quem está no grupo: parece que "somos muitos" por si só exige somos, mas isso está errado. Se quem fala descreve o grupo de outra pessoa de fora, mesmo de dez pessoas, precisa de ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', não somos — porque quem fala não faz parte dele. Ao contrário, mesmo uma dupla de "eu e um amigo" exige somos, porque quem fala pertence a essa dupla. A checagem é sempre a mesma: primeiro "eu estou no grupo?", só depois a forma da qualidade que combina com o gênero e o número certos.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi phổ biến nhất là quyết định từ nối theo số lượng người thay vì theo ai ở trong nhóm: có vẻ như "chúng ta đông" tự nó đòi hỏi somos, nhưng điều đó sai. Nếu người nói mô tả một nhóm khác từ bên ngoài, dù có mười người, cần ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', không phải somos — vì người nói không thuộc nhóm đó. Ngược lại, dù chỉ là cặp "tôi và một người bạn" cũng cần somos, vì người nói thuộc cặp đó. Cách kiểm tra luôn giống nhau: trước tiên "tôi có trong nhóm không?", sau đó mới đến dạng đặc điểm khớp với giống và số đúng.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan paling umum adalah memutuskan kata penghubung berdasarkan jumlah orang, bukan berdasarkan siapa yang ada dalam kelompok: tampaknya "kita banyak" saja sudah memerlukan somos, tetapi itu salah. Jika penutur mendeskripsikan kelompok orang lain dari luar, bahkan sepuluh orang sekalipun, yang diperlukan adalah ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', bukan somos — karena penutur bukan bagian darinya. Sebaliknya, bahkan pasangan "saya dan satu teman" pun memerlukan somos, karena penutur termasuk dalam pasangan itu. Pengecekannya selalu sama: pertama "apakah saya ada di kelompok?", baru kemudian bentuk sifat yang cocok dengan gender dan jumlah yang tepat.', semantic: 'explanation' }),
      tr: R({ text: 'En yaygın hata, bağlaca kimin grupta olduğuna göre değil, kişi sayısına göre karar vermektir: "bizim çok kişiyiz" tek başına somos gerektiriyormuş gibi görünür, ama bu yanlıştır. Konuşan başka birinin grubunu dışarıdan tarif ediyorsa, on kişi olsa bile, somos değil ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ' gerekir — çünkü konuşan onun bir parçası değildir. Tersi de geçerlidir: "ben ve bir arkadaşım" gibi bir çift bile somos gerektirir, çünkü konuşan o çiftin içindedir. Kontrol her zaman aynıdır: önce "ben grupta mıyım?", ancak ondan sonra doğru cinsiyet ve sayıya uyan nitelik biçimi.', semantic: 'explanation' }),
      pl: R({ text: 'Najczęstszy błąd to decydowanie o łączniku na podstawie liczby osób zamiast tego, kto jest w grupie: wydaje się, że „jest nas wielu” samo w sobie wymaga somos, ale to błąd. Jeśli mówiący opisuje cudzą grupę z zewnątrz, nawet dziesięcioosobową, potrzebne jest ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', nie somos — bo sam mówiący do niej nie należy. I odwrotnie, nawet para „ja i jeden przyjaciel” wymaga somos, bo mówiący należy do tej pary. Sprawdzenie jest zawsze takie samo: najpierw „czy ja jestem w grupie?”, dopiero potem forma cechy dopasowana do właściwego rodzaju i liczby.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Говорящий описывает компанию из десяти человек со стороны, сам в неё не входя — какая связка?',
        uk: 'Мовець описує компанію з десяти людей збоку, сам до неї не входячи — яка зв’язка?',
        es: 'The speaker describes a group of ten people from the outside, not belonging to it themselves — which linking word?',
        'pt-BR': 'Quem fala descreve um grupo de dez pessoas de fora, sem pertencer a ele — qual ligação?',
        vi: 'Người nói mô tả một nhóm mười người từ bên ngoài, bản thân không thuộc nhóm đó — từ nối nào?',
        id: 'Penutur mendeskripsikan kelompok sepuluh orang dari luar, tanpa dirinya termasuk di dalamnya — kata penghubung mana?',
        tr: 'Konuşan, kendisi ona ait olmadan on kişilik bir grubu dışarıdan tarif ediyor — hangi bağlaç?',
        pl: 'Mówiący opisuje z zewnątrz grupę dziesięciu osób, sam do niej nie należąc — jaki łącznik?',
      }),
      choices: [
        L({ ru: 'Son', uk: 'Son', es: 'Son', 'pt-BR': 'Son', vi: 'Son', id: 'Son', tr: 'Son', pl: 'Son' }),
        L({ ru: 'Somos', uk: 'Somos', es: 'Somos', 'pt-BR': 'Somos', vi: 'Somos', id: 'Somos', tr: 'Somos', pl: 'Somos' }),
        L({ ru: 'Es', uk: 'Es', es: 'Es', 'pt-BR': 'Es', vi: 'Es', id: 'Es', tr: 'Es', pl: 'Es' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Son верно, несмотря на большое число людей: говорящий сам не входит в эту компанию, а размер группы (десять человек) вообще не влияет на выбор связки — важен только состав.',
        uk: 'Son правильно, попри велику кількість людей: мовець сам не входить у цю компанію, а розмір групи (десять людей) взагалі не впливає на вибір зв’язки — важливий лише склад.',
        es: 'Son is correct despite the large number of people: the speaker themselves does not belong to that group, and the group\'s size (ten people) does not affect the choice of linking word at all — only the makeup matters.',
        'pt-BR': 'Son está correto apesar do grande número de pessoas: quem fala não pertence a esse grupo, e o tamanho do grupo (dez pessoas) não afeta em nada a escolha da ligação — só a composição importa.',
        vi: 'Son đúng dù có nhiều người: bản thân người nói không thuộc nhóm đó, và kích thước nhóm (mười người) hoàn toàn không ảnh hưởng đến việc chọn từ nối — chỉ thành phần mới quan trọng.',
        id: 'Son benar meskipun jumlah orang banyak: penutur sendiri tidak termasuk dalam kelompok itu, dan ukuran kelompok (sepuluh orang) sama sekali tidak memengaruhi pemilihan kata penghubung — hanya susunannya yang penting.',
        tr: 'Son doğrudur, çok sayıda kişi olmasına rağmen: konuşan kendisi o gruba dahil değildir ve grubun büyüklüğü (on kişi) bağlaç seçimini hiç etkilemez — yalnızca bileşim önemlidir.',
        pl: 'Son jest poprawne mimo dużej liczby osób: mówiący sam nie należy do tej grupy, a jej wielkość (dziesięć osób) w ogóle nie wpływa na wybór łącznika — liczy się tylko skład.',
      }),
    },
  },
];
