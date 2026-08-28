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
  ru: 'Somos rápidos и son rápidos звучат почти одинаково, но означают разное: somos — про группу с говорящим, son — про группу без него. Число людей тут ни при чём: решает только один вопрос — «я тоже там?». Да — somos, нет — son.',
  uk: 'Somos rápidos і son rápidos звучать майже однаково, але означають різне: somos — про групу з мовцем, son — про групу без нього. Кількість людей тут ні до чого: вирішує лише одне питання — «я теж там?». Так — somos, ні — son.',
  es: 'Somos rápidos and son rápidos sound almost the same, but mean different things: somos is about a group with the speaker, son is about one without them. The number of people is irrelevant — only one question decides: "am I there too?" Yes — somos, no — son.',
  'pt-BR': 'Somos rápidos e son rápidos soam quase iguais, mas significam coisas diferentes: somos fala de um grupo com quem fala, son fala de um sem ele. O número de pessoas não importa — só uma pergunta decide: "eu também estou lá?" Sim — somos, não — son.',
  vi: 'Somos rápidos và son rápidos nghe gần giống nhau, nhưng khác nghĩa: somos nói về nhóm có người nói, son nói về nhóm không có người nói. Số người không quan trọng — chỉ một câu hỏi quyết định: "tôi có ở đó không?" Có — somos, không — son.',
  id: 'Somos rápidos dan son rápidos terdengar hampir sama, tetapi berarti berbeda: somos tentang kelompok dengan penutur, son tentang kelompok tanpa dia. Jumlah orang tidak penting — hanya satu pertanyaan yang memutuskan: "apakah saya juga di sana?" Ya — somos, tidak — son.',
  tr: 'Somos rápidos ve son rápidos neredeyse aynı duyulur, ama anlamları farklıdır: somos konuşanın da olduğu bir grup, son ise onsuz bir gruptur. Kişi sayısı önemsizdir — yalnızca bir soru karar verir: "ben de orada mıyım?" Evet — somos, hayır — son.',
  pl: 'Somos rápidos i son rápidos brzmią niemal identycznie, ale znaczą co innego: somos dotyczy grupy z mówiącym, son — grupy bez niego. Liczba osób nie ma znaczenia — decyduje tylko jedno pytanie: „czy ja też tam jestem?”. Tak — somos, nie — son.',
});

const FORMULA_BODY = L({
  ru: 'Формула одна: сначала «я в этой группе?», потом слово. Да — somos, нет — son. Признак согласуется с тем, о ком речь, а не с говорящим: Somos rápidas — говорящая женщина в женской группе, Son rápidos — группа мужского рода или смешанная.',
  uk: 'Формула одна: спочатку «я в цій групі?», потім слово. Так — somos, ні — son. Ознака узгоджується з тим, про кого йдеться, а не з мовцем: Somos rápidas — мовиця жінка в жіночій групі, Son rápidos — група чоловічого роду чи змішана.',
  es: 'The formula is one: first "am I in this group?", then the word. Yes — somos, no — son. The quality agrees with whoever is discussed, not the speaker: Somos rápidas — a female speaker in a feminine group, Son rápidos — a masculine or mixed group.',
  'pt-BR': 'A fórmula é uma só: primeiro "eu estou nesse grupo?", depois a palavra. Sim — somos, não — son. A qualidade concorda com quem é discutido, não com quem fala: Somos rápidas — falante mulher em grupo feminino, Son rápidos — grupo masculino ou misto.',
  vi: 'Công thức chỉ một: trước tiên "tôi có trong nhóm này không?", rồi mới chọn từ. Có — somos, không — son. Đặc điểm hòa hợp với người được nói tới, không phải người nói: Somos rápidas — người nói nữ trong nhóm giống cái, Son rápidos — nhóm giống đực hoặc hỗn hợp.',
  id: 'Rumusnya cuma satu: pertama "apakah saya ada di kelompok ini?", lalu pilih katanya. Ya — somos, tidak — son. Sifatnya sesuai dengan siapa yang dibicarakan, bukan penuturnya: Somos rápidas — penutur wanita di kelompok feminin, Son rápidos — kelompok maskulin atau campuran.',
  tr: 'Formül tektir: önce "ben bu grupta mıyım?", sonra kelimeyi seç. Evet — somos, hayır — son. Nitelik, konuşanın değil söz konusu olanın uyumundadır: Somos rápidas — dişil grupta kadın konuşan, Son rápidos — eril ya da karma grup.',
  pl: 'Formuła jest jedna: najpierw „czy ja jestem w tej grupie?”, potem słowo. Tak — somos, nie — son. Cecha zgadza się z tym, o kim mowa, nie z mówiącym: Somos rápidas — mówiąca kobieta w żeńskiej grupie, Son rápidos — grupa męska lub mieszana.',
});

const TRAP_BODY = L({
  ru: 'Частая ошибка — судить о связке по числу людей: кажется, «нас много» само требует somos. Но компания из десяти человек со стороны — это son, ведь говорящего там нет. А пара «я и друг» — это somos, потому что говорящий в неё входит. Проверка одна: «я в группе?».',
  uk: 'Часта помилка — судити про зв’язку за кількістю людей: здається, «нас багато» саме вимагає somos. Але компанія з десяти людей збоку — це son, бо мовця там немає. А пара «я і друг» — це somos, бо мовець входить у неї. Перевірка одна: «я в групі?».',
  es: 'A common mistake is judging the linking word by the number of people: "many of us" seems to require somos on its own. But a group of ten seen from the outside is son, because the speaker is not there. A pair of "me and a friend" is somos, because the speaker belongs to it.',
  'pt-BR': 'Um erro comum é julgar a ligação pelo número de pessoas: "somos muitos" parece exigir somos por si só. Mas o grupo de outra pessoa, de dez, visto de fora, é son, porque quem fala não está lá. Já uma dupla de "eu e um amigo" é somos, porque quem fala pertence a ela. A checagem é uma só: "eu estou no grupo?"',
  vi: 'Lỗi thường gặp là đánh giá từ nối theo số người: "chúng ta đông" có vẻ tự nó cần somos. Nhưng nhóm mười người khác nhìn từ ngoài là son, vì người nói không ở đó. Còn cặp "tôi và một người bạn" là somos, vì người nói thuộc cặp đó. Cách kiểm tra chỉ một: "tôi có trong nhóm không?"',
  id: 'Kesalahan umum adalah menilai kata penghubung dari jumlah orang: "kita banyak" tampaknya memerlukan somos begitu saja. Tapi kelompok sepuluh orang dilihat dari luar adalah son, karena penutur tidak ada di sana. Pasangan "saya dan seorang teman" adalah somos, karena penutur termasuk di dalamnya.',
  tr: 'Yaygın bir hata, bağlacı kişi sayısına göre değerlendirmektir: "bizim çok kişiyiz" tek başına somos gerektiriyormuş gibi görünür. Ama dışarıdan bakılan on kişilik bir grup son\'dur, çünkü konuşan orada değildir. "Ben ve bir arkadaşım" çifti ise somos\'tur, çünkü konuşan ona dahildir.',
  pl: 'Częsty błąd to ocenianie łącznika po liczbie osób: „jest nas wielu” zdaje się samo wymagać somos. Ale cudza grupa dziesięciu osób widziana z zewnątrz to son, bo mówiącego tam nie ma. Para „ja i przyjaciel” to somos, bo mówiący do niej należy. Sprawdzenie jest jedno: „czy ja jestem w grupie?”.',
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
      ru: R({ text: 'Somos rápidos и son rápidos звучат почти одинаково, но означают разное: somos — про группу с говорящим, son — про группу без него. Число людей тут ни при чём: решает только один вопрос — «я тоже там?». Да — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', нет — son.', semantic: 'explanation' }),
      uk: R({ text: 'Somos rápidos і son rápidos звучать майже однаково, але означають різне: somos — про групу з мовцем, son — про групу без нього. Кількість людей тут ні до чого: вирішує лише одне питання — «я теж там?». Так — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', ні — son.', semantic: 'explanation' }),
      es: R({ text: 'Somos rápidos and son rápidos sound almost the same, but mean different things: somos is about a group with the speaker, son is about one without them. The number of people is irrelevant — only one question decides: "am I there too?" Yes — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', no — son.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Somos rápidos e son rápidos soam quase iguais, mas significam coisas diferentes: somos fala de um grupo com quem fala, son fala de um sem ele. O número de pessoas não importa — só uma pergunta decide: "eu também estou lá?" Sim — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', não — son.', semantic: 'explanation' }),
      vi: R({ text: 'Somos rápidos và son rápidos nghe gần giống nhau, nhưng khác nghĩa: somos nói về nhóm có người nói, son nói về nhóm không có người nói. Số người không quan trọng — chỉ một câu hỏi quyết định: "tôi có ở đó không?" Có — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', không — son.', semantic: 'explanation' }),
      id: R({ text: 'Somos rápidos dan son rápidos terdengar hampir sama, tetapi berarti berbeda: somos tentang kelompok dengan penutur, son tentang kelompok tanpa dia. Jumlah orang tidak penting — hanya satu pertanyaan yang memutuskan: "apakah saya juga di sana?" Ya — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', tidak — son.', semantic: 'explanation' }),
      tr: R({ text: 'Somos rápidos ve son rápidos neredeyse aynı duyulur, ama anlamları farklıdır: somos konuşanın da olduğu bir grup, son ise onsuz bir gruptur. Kişi sayısı önemsizdir — yalnızca bir soru karar verir: "ben de orada mıyım?" Evet — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', hayır — son.', semantic: 'explanation' }),
      pl: R({ text: 'Somos rápidos i son rápidos brzmią niemal identycznie, ale znaczą co innego: somos dotyczy grupy z mówiącym, son — grupy bez niego. Liczba osób nie ma znaczenia — decyduje tylko jedno pytanie: „czy ja też tam jestem?”. Tak — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', nie — son.', semantic: 'explanation' }),
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
      ru: R({ text: 'Формула одна: сначала «я в этой группе?», потом слово. Да — somos, нет — son. Признак согласуется с тем, о ком речь, а не с говорящим: ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — говорящая женщина в женской группе, Son rápidos — группа мужского рода или смешанная.', semantic: 'explanation' }),
      uk: R({ text: 'Формула одна: спочатку «я в цій групі?», потім слово. Так — somos, ні — son. Ознака узгоджується з тим, про кого йдеться, а не з мовцем: ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — мовиця жінка в жіночій групі, Son rápidos — група чоловічого роду чи змішана.', semantic: 'explanation' }),
      es: R({ text: 'The formula is one: first "am I in this group?", then the word. Yes — somos, no — son. The quality agrees with whoever is discussed, not the speaker: ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — a female speaker in a feminine group, Son rápidos — a masculine or mixed group.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é uma só: primeiro "eu estou nesse grupo?", depois a palavra. Sim — somos, não — son. A qualidade concorda com quem é discutido, não com quem fala: ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — falante mulher em grupo feminino, Son rápidos — grupo masculino ou misto.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức chỉ một: trước tiên "tôi có trong nhóm này không?", rồi mới chọn từ. Có — somos, không — son. Đặc điểm hòa hợp với người được nói tới, không phải người nói: ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — người nói nữ trong nhóm giống cái, Son rápidos — nhóm giống đực hoặc hỗn hợp.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya cuma satu: pertama "apakah saya ada di kelompok ini?", lalu pilih katanya. Ya — somos, tidak — son. Sifatnya sesuai dengan siapa yang dibicarakan, bukan penuturnya: ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — penutur wanita di kelompok feminin, Son rápidos — kelompok maskulin atau campuran.', semantic: 'explanation' }),
      tr: R({ text: 'Formül tektir: önce "ben bu grupta mıyım?", sonra kelimeyi seç. Evet — somos, hayır — son. Nitelik, konuşanın değil söz konusu olanın uyumundadır: ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — dişil grupta kadın konuşan, Son rápidos — eril ya da karma grup.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest jedna: najpierw „czy ja jestem w tej grupie?”, potem słowo. Tak — somos, nie — son. Cecha zgadza się z tym, o kim mowa, nie z mówiącym: ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — mówiąca kobieta w żeńskiej grupie, Son rápidos — grupa męska lub mieszana.', semantic: 'explanation' }),
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
      ru: R({ text: 'Частая ошибка — судить о связке по числу людей: кажется, «нас много» само требует somos. Но компания из десяти человек со стороны — это ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', ведь говорящего там нет. А пара «я и друг» — это somos, потому что говорящий в неё входит. Проверка одна: «я в группе?».', semantic: 'explanation' }),
      uk: R({ text: 'Часта помилка — судити про зв’язку за кількістю людей: здається, «нас багато» саме вимагає somos. Але компанія з десяти людей збоку — це ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', бо мовця там немає. А пара «я і друг» — це somos, бо мовець входить у неї. Перевірка одна: «я в групі?».', semantic: 'explanation' }),
      es: R({ text: 'A common mistake is judging the linking word by the number of people: "many of us" seems to require somos on its own. But a group of ten seen from the outside is ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', because the speaker is not there. A pair of "me and a friend" is somos, because the speaker belongs to it.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Um erro comum é julgar a ligação pelo número de pessoas: "somos muitos" parece exigir somos por si só. Mas o grupo de outra pessoa, de dez, visto de fora, é ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', porque quem fala não está lá. Já uma dupla de "eu e um amigo" é somos, porque quem fala pertence a ela. A checagem é uma só: "eu estou no grupo?"', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi thường gặp là đánh giá từ nối theo số người: "chúng ta đông" có vẻ tự nó cần somos. Nhưng nhóm mười người khác nhìn từ ngoài là ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', vì người nói không ở đó. Còn cặp "tôi và một người bạn" là somos, vì người nói thuộc cặp đó. Cách kiểm tra chỉ một: "tôi có trong nhóm không?"', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan umum adalah menilai kata penghubung dari jumlah orang: "kita banyak" tampaknya memerlukan somos begitu saja. Tapi kelompok sepuluh orang dilihat dari luar adalah ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', karena penutur tidak ada di sana. Pasangan "saya dan seorang teman" adalah somos, karena penutur termasuk di dalamnya.', semantic: 'explanation' }),
      tr: R({ text: 'Yaygın bir hata, bağlacı kişi sayısına göre değerlendirmektir: "bizim çok kişiyiz" tek başına somos gerektiriyormuş gibi görünür. Ama dışarıdan bakılan on kişilik bir grup ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '\'dur, çünkü konuşan orada değildir. "Ben ve bir arkadaşım" çifti ise somos\'tur, çünkü konuşan ona dahildir.', semantic: 'explanation' }),
      pl: R({ text: 'Częsty błąd to ocenianie łącznika po liczbie osób: „jest nas wielu” zdaje się samo wymagać somos. Ale cudza grupa dziesięciu osób widziana z zewnątrz to ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', bo mówiącego tam nie ma. Para „ja i przyjaciel” to somos, bo mówiący do niej należy. Sprawdzenie jest jedno: „czy ja jestem w grupie?”.', semantic: 'explanation' }),
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
