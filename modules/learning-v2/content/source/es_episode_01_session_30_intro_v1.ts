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
  ru: 'Мгновенно выбирать нужную форму связки (soy/eres/es/somos/son) по двум признакам ситуации, без перебора и без пауз.',
  uk: 'Миттєво обирати потрібну форму зв’язки (soy/eres/es/somos/son) за двома ознаками ситуації, без перебору й без пауз.',
  es: 'Instantly choose the right form of ser (soy/eres/es/somos/son) based on two features of the situation, without trial and without pauses.',
  'pt-BR': 'Escolher instantaneamente a forma certa de ser (soy/eres/es/somos/son) com base em duas características da situação, sem tentativas e sem pausas.',
  vi: 'Chọn ngay dạng đúng của ser (soy/eres/es/somos/son) dựa trên hai đặc điểm của tình huống, không thử sai và không ngập ngừng.',
  id: 'Segera memilih bentuk ser yang tepat (soy/eres/es/somos/son) berdasarkan dua ciri situasi, tanpa coba-coba dan tanpa jeda.',
  tr: 'Durumun iki özelliğine göre ser’in doğru biçimini (soy/eres/es/somos/son) hemen seçmek, deneme yanılma ve duraksama olmadan.',
  pl: 'Natychmiast wybierać właściwą formę ser (soy/eres/es/somos/son) na podstawie dwóch cech sytuacji, bez prób i bez wahania.',
});

const CONCEPT_BODY = L({
  ru: 'Пять связок отвечают на два вопроса: включён ли говорящий и сколько человек. Про себя — soy; к собеседнику — eres; про третьего — es. Если людей больше одного: говорящий внутри группы — somos, снаружи — son. Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — один признак, пять связок.',
  uk: 'П’ять зв’язок відповідають на два питання: чи включений мовець і скільки людей. Про себе — soy; до співрозмовника — eres; про третього — es. Якщо людей більше одного: мовець всередині групи — somos, зовні — son. Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — та сама ознака, п’ять зв’язок.',
  es: 'The five forms answer two questions: is the speaker included, and how many people. About yourself — soy; to the listener — eres; about someone else — es. If more than one: speaker inside the group — somos, outside — son. Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — one quality, five linking words.',
  'pt-BR': 'As cinco formas respondem a duas perguntas: quem fala está incluído, e quantas pessoas. Sobre si mesmo — soy; com o interlocutor — eres; sobre outra pessoa — es. Se há mais de uma: dentro do grupo — somos, fora — son. Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — mesma qualidade, cinco ligações.',
  vi: 'Năm dạng trả lời hai câu hỏi: người nói có được tính vào không, và có bao nhiêu người. Về bản thân — soy; với người nghe — eres; về người khác — es. Nếu hơn một người: người nói trong nhóm — somos, ngoài nhóm — son. Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — cùng đặc điểm, năm từ nối.',
  id: 'Lima bentuk menjawab dua pertanyaan: apakah penutur termasuk, dan berapa orang. Tentang diri sendiri — soy; dengan pendengar — eres; tentang orang lain — es. Jika lebih dari satu: di dalam kelompok — somos, di luar — son. Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — sifat sama, lima kata penghubung.',
  tr: 'Ser’in beş biçimi iki soruyu yanıtlar: konuşan dahil mi ve kaç kişi. Kendisi hakkında — soy; dinleyiciye — eres; başkası hakkında — es. Birden fazla kişi varsa: konuşan grubun içinde — somos, dışında — son. Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — aynı nitelik, beş bağlaç.',
  pl: 'Pięć form ser odpowiada na dwa pytania: czy mówiący jest uwzględniony i ile jest osób. O sobie — soy; do słuchacza — eres; o kimś innym — es. Jeśli osób jest więcej: mówiący w grupie — somos, poza nią — son. Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — ta sama cecha, pięć łączników.',
});

const FORMULA_BODY = L({
  ru: 'Выбор связки — два вопроса подряд, не пять правил: сколько людей и кто говорит про кого. Один человек: про себя soy, к собеседнику eres, про третьего es. Несколько: говорящий внутри группы — somos, снаружи — son. No встаёт перед любой формой одинаково, саму формулу выбора это не меняет.',
  uk: 'Вибір зв’язки — два питання поспіль, а не п’ять правил: скільки людей і хто говорить про кого. Одна людина: про себе soy, до співрозмовника eres, про третього es. Кілька: мовець всередині групи — somos, зовні — son. No стає перед будь-якою формою однаково, саму формулу вибору це не змінює.',
  es: 'Choosing the linking word is two questions, not five rules: how many people, and who speaks about whom. One person: about yourself soy, to the listener eres, about someone else es. Several: speaker inside the group — somos, outside — son. No goes before any form the same way.',
  'pt-BR': 'Escolher a ligação são duas perguntas seguidas, não cinco regras: quantas pessoas e quem fala sobre quem. Uma pessoa: sobre si mesmo soy, com o interlocutor eres, sobre outra pessoa es. Várias: quem fala dentro do grupo — somos, fora — son. No vem antes de qualquer forma do mesmo jeito, não muda a fórmula de escolha.',
  vi: 'Chọn từ nối là hai câu hỏi liên tiếp, không phải năm quy tắc: có bao nhiêu người và ai nói về ai. Một người: về bản thân soy, với người nghe eres, về người khác es. Nhiều người: người nói ở trong nhóm — somos, ở ngoài — son. No đứng trước bất kỳ dạng nào theo cùng một cách, không thay đổi công thức lựa chọn.',
  id: 'Memilih kata penghubung adalah dua pertanyaan, bukan lima aturan: berapa orang dan siapa bicara tentang siapa. Satu orang: diri sendiri soy, pendengar eres, orang lain es. Beberapa: penutur di dalam kelompok — somos, di luar — son. No berada sebelum bentuk mana pun dengan cara sama.',
  tr: 'Bağlaç seçmek beş kural değil, art arda iki sorudur: kaç kişi ve kim kimden bahsediyor. Bir kişi: kendinden soy, dinleyiciye eres, başkasından es. Birden fazla: konuşan grubun içinde — somos, dışında — son. No her biçimin önüne aynı şekilde gelir, seçim formülünü değiştirmez.',
  pl: 'Wybór łącznika to dwa pytania z rzędu, nie pięć reguł: ile osób i kto mówi o kim. Jedna osoba: o sobie soy, do słuchacza eres, o kimś innym es. Kilka: mówiący w grupie — somos, poza nią — son. No staje przed każdą formą tak samo, nie zmienia samej formuły wyboru.',
});

const TRAP_BODY = L({
  ru: 'Частая путаница — somos и son: проверка одна — входит ли говорящий в группу? Да — somos, нет — son, число тут ни при чём. Вторая путаница — забыть, что eres всегда обращение к собеседнику напрямую, а не рассказ о третьем; про третьего — всегда es, даже если похоже на «ты».',
  uk: 'Часта плутанина — somos і son: перевірка одна — чи входить мовець у групу? Так — somos, ні — son, кількість тут ні до чого. Друга плутанина — забути, що eres завжди звернення до співрозмовника напряму, а не розповідь про третього; про третього — завжди es, навіть якщо схоже на «ти».',
  es: 'A common confusion is somos versus son: does the speaker belong to the group? Yes — somos, no — son, number has nothing to do with it. The second confusion: eres is always a direct address to the listener, never a description of someone else; describing a third person is always es.',
  'pt-BR': 'Uma confusão comum é somos e son: há uma checagem — quem fala pertence ao grupo? Sim — somos, não — son, o número não importa aqui. A segunda confusão é esquecer que eres é sempre um endereçamento direto ao interlocutor, não uma descrição de outra pessoa; descrever um terceiro é sempre es, mesmo que pareça com "você".',
  vi: 'Nhầm lẫn thường gặp là somos và son: chỉ có một cách kiểm tra — người nói có thuộc nhóm không? Có — somos, không — son, số lượng không liên quan. Nhầm lẫn thứ hai là quên rằng eres luôn nói trực tiếp với người nghe, không phải mô tả người khác; mô tả người thứ ba luôn là es, dù nghe giống "bạn".',
  id: 'Kebingungan umum adalah somos dan son: apakah penutur termasuk kelompok? Ya — somos, tidak — son, jumlah tidak relevan. Kebingungan kedua: eres selalu sapaan langsung ke pendengar, bukan deskripsi orang lain; mendeskripsikan orang ketiga selalu es.',
  tr: 'Yaygın bir karışıklık somos ile son’dur: tek kontrol — konuşan gruba dahil mi? Evet — somos, hayır — son, sayının bununla ilgisi yoktur. İkinci karışıklık, eres’in her zaman dinleyiciye doğrudan hitap olduğunu unutmaktır, başkasının tarifi değil; üçüncü kişiyi tarif etmek her zaman es’tir, "sen"e benzese bile.',
  pl: 'Częsta pomyłka to somos i son: jest jedno sprawdzenie — czy mówiący należy do grupy? Tak — somos, nie — son, liczba nie ma tu znaczenia. Druga pomyłka to zapominanie, że eres to zawsze bezpośrednie zwrócenie się do słuchacza, a nie opis kogoś innego; opis osoby trzeciej to zawsze es, nawet gdy przypomina „ty”.',
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
      ru: R({ text: 'Пять связок отвечают на два вопроса: включён ли говорящий и сколько человек. Про себя — soy; к собеседнику — eres; про третьего — es. Если людей больше одного: говорящий внутри группы — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', снаружи — son. Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — один признак, пять связок.', semantic: 'explanation' }),
      uk: R({ text: 'П’ять зв’язок відповідають на два питання: чи включений мовець і скільки людей. Про себе — soy; до співрозмовника — eres; про третього — es. Якщо людей більше одного: мовець всередині групи — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', зовні — son. Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — та сама ознака, п’ять зв’язок.', semantic: 'explanation' }),
      es: R({ text: 'The five forms answer two questions: is the speaker included, and how many people. About yourself — soy; to the listener — eres; about someone else — es. If more than one: speaker inside the group — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', outside — son. Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — one quality, five linking words.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'As cinco formas respondem a duas perguntas: quem fala está incluído, e quantas pessoas. Sobre si mesmo — soy; com o interlocutor — eres; sobre outra pessoa — es. Se há mais de uma: dentro do grupo — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', fora — son. Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — mesma qualidade, cinco ligações.', semantic: 'explanation' }),
      vi: R({ text: 'Năm dạng trả lời hai câu hỏi: người nói có được tính vào không, và có bao nhiêu người. Về bản thân — soy; với người nghe — eres; về người khác — es. Nếu hơn một người: người nói trong nhóm — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', ngoài nhóm — son. Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — cùng đặc điểm, năm từ nối.', semantic: 'explanation' }),
      id: R({ text: 'Lima bentuk menjawab dua pertanyaan: apakah penutur termasuk, dan berapa orang. Tentang diri sendiri — soy; dengan pendengar — eres; tentang orang lain — es. Jika lebih dari satu: di dalam kelompok — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', di luar — son. Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — sifat sama, lima kata penghubung.', semantic: 'explanation' }),
      tr: R({ text: 'Ser’in beş biçimi iki soruyu yanıtlar: konuşan dahil mi ve kaç kişi. Kendisi hakkında — soy; dinleyiciye — eres; başkası hakkında — es. Birden fazla kişi varsa: konuşan grubun içinde — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', dışında — son. Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — aynı nitelik, beş bağlaç.', semantic: 'explanation' }),
      pl: R({ text: 'Pięć form ser odpowiada na dwa pytania: czy mówiący jest uwzględniony i ile jest osób. O sobie — soy; do słuchacza — eres; o kimś innym — es. Jeśli osób jest więcej: mówiący w grupie — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', poza nią — son. Soy rápido, eres rápida, es rápido, somos rápidas, son rápidos — ta sama cecha, pięć łączników.', semantic: 'explanation' }),
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
      ru: R({ text: 'Выбор связки — два вопроса подряд, не пять правил: сколько людей и кто говорит про кого. Один человек: про себя soy, к собеседнику eres, про третьего es. Несколько: говорящий внутри группы — somos, снаружи — son. No встаёт перед любой формой одинаково: No soy rápido, No eres rápida, No es rápido, ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son rápidos.', semantic: 'explanation' }),
      uk: R({ text: 'Вибір зв’язки — два питання поспіль, а не п’ять правил: скільки людей і хто говорить про кого. Одна людина: про себе soy, до співрозмовника eres, про третього es. Кілька: мовець всередині групи — somos, зовні — son. No стає перед будь-якою формою однаково: No soy rápido, No eres rápida, No es rápido, ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son rápidos.', semantic: 'explanation' }),
      es: R({ text: 'Choosing the linking word is two questions, not five rules: how many people, and who speaks about whom. One person: about yourself soy, to the listener eres, about someone else es. Several: speaker inside the group — somos, outside — son. No goes before any form the same way: No soy rápido, No eres rápida, No es rápido, ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son rápidos.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Escolher a ligação são duas perguntas seguidas, não cinco regras: quantas pessoas e quem fala sobre quem. Uma pessoa: sobre si mesmo soy, com o interlocutor eres, sobre outra pessoa es. Várias: quem fala dentro do grupo — somos, fora — son. No vem antes de qualquer forma do mesmo jeito: No soy rápido, No eres rápida, No es rápido, ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son rápidos.', semantic: 'explanation' }),
      vi: R({ text: 'Chọn từ nối là hai câu hỏi liên tiếp, không phải năm quy tắc: có bao nhiêu người và ai nói về ai. Một người: về bản thân soy, với người nghe eres, về người khác es. Nhiều người: người nói ở trong nhóm — somos, ở ngoài — son. No đứng trước bất kỳ dạng nào theo cùng một cách: No soy rápido, No eres rápida, No es rápido, ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son rápidos.', semantic: 'explanation' }),
      id: R({ text: 'Memilih kata penghubung adalah dua pertanyaan, bukan lima aturan: berapa orang dan siapa bicara tentang siapa. Satu orang: diri sendiri soy, pendengar eres, orang lain es. Beberapa: penutur di dalam kelompok — somos, di luar — son. No berada sebelum bentuk mana pun dengan cara sama: No soy rápido, No eres rápida, No es rápido, ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son rápidos.', semantic: 'explanation' }),
      tr: R({ text: 'Bağlaç seçmek beş kural değil, art arda iki sorudur: kaç kişi ve kim kimden bahsediyor. Bir kişi: kendinden soy, dinleyiciye eres, başkasından es. Birden fazla: konuşan grubun içinde — somos, dışında — son. No her biçimin önüne aynı şekilde gelir: No soy rápido, No eres rápida, No es rápido, ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son rápidos.', semantic: 'explanation' }),
      pl: R({ text: 'Wybór łącznika to dwa pytania z rzędu, nie pięć reguł: ile osób i kto mówi o kim. Jedna osoba: o sobie soy, do słuchacza eres, o kimś innym es. Kilka: mówiący w grupie — somos, poza nią — son. No staje przed każdą formą tak samo: No soy rápido, No eres rápida, No es rápido, ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son rápidos.', semantic: 'explanation' }),
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
      ru: R({ text: 'Частая путаница — somos и son: проверка одна — входит ли говорящий в группу? Да — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', нет — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', число тут ни при чём. Вторая путаница — забыть, что eres всегда обращение к собеседнику напрямую, а не рассказ о третьем; про третьего — всегда es, даже если похоже на «ты».', semantic: 'explanation' }),
      uk: R({ text: 'Часта плутанина — somos і son: перевірка одна — чи входить мовець у групу? Так — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', ні — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', кількість тут ні до чого. Друга плутанина — забути, що eres завжди звернення до співрозмовника напряму, а не розповідь про третього; про третього — завжди es, навіть якщо схоже на «ти».', semantic: 'explanation' }),
      es: R({ text: 'A common confusion is somos versus son: does the speaker belong to the group? Yes — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', no — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', number has nothing to do with it. The second confusion: eres is always a direct address to the listener, never a description of someone else; describing a third person is always es.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Uma confusão comum é somos e son: há uma checagem — quem fala pertence ao grupo? Sim — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', não — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', o número não importa aqui. A segunda confusão é esquecer que eres é sempre um endereçamento direto ao interlocutor, não uma descrição de outra pessoa; descrever um terceiro é sempre es, mesmo que pareça com "você".', semantic: 'explanation' }),
      vi: R({ text: 'Nhầm lẫn thường gặp là somos và son: chỉ có một cách kiểm tra — người nói có thuộc nhóm không? Có — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', không — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', số lượng không liên quan. Nhầm lẫn thứ hai là quên rằng eres luôn nói trực tiếp với người nghe, không phải mô tả người khác; mô tả người thứ ba luôn là es, dù nghe giống "bạn".', semantic: 'explanation' }),
      id: R({ text: 'Kebingungan umum adalah somos dan son: apakah penutur termasuk kelompok? Ya — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', tidak — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', jumlah tidak relevan. Kebingungan kedua: eres selalu sapaan langsung ke pendengar, bukan deskripsi orang lain; mendeskripsikan orang ketiga selalu es.', semantic: 'explanation' }),
      tr: R({ text: 'Yaygın bir karışıklık somos ile son’dur: tek kontrol — konuşan gruba dahil mi? Evet — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', hayır — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', sayının bununla ilgisi yoktur. İkinci karışıklık, eres’in her zaman dinleyiciye doğrudan hitap olduğunu unutmaktır, başkasının tarifi değil; üçüncü kişiyi tarif etmek her zaman es’tir, "sen"e benzese bile.', semantic: 'explanation' }),
      pl: R({ text: 'Częsta pomyłka to somos i son: jest jedno sprawdzenie — czy mówiący należy do grupy? Tak — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', nie — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', liczba nie ma tu znaczenia. Druga pomyłka to zapominanie, że eres to zawsze bezpośrednie zwrócenie się do słuchacza, a nie opis kogoś innego; opis osoby trzeciej to zawsze es, nawet gdy przypomina „ty”.', semantic: 'explanation' }),
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
