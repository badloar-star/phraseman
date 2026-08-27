import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24, карта сессий es_episode_01_session_map_v1.ts,
// сессия 8 "Всё про я целиком" / kind: 'checkpoint', builtOn: [1..7],
// recalls: [1,2,3,4,5]): интро НЕ упоминает "сессию/урок/главу/курс/экран/
// карточку" (тот же чёрный список слов, что и в сессии 7) — вместо этого
// прямо говорит о том, что проверяется владение всем материалом главы, без
// подсказок, без разбивки на отдельные темы. Recalls es/soy/fácil (1),
// no (2), bonito/bonita (3), verdadero/verdadera (4), rápido/rápida (5).
//
// зачем тело переписано короче исходного черновика (владелец, 2026-08-27,
// тот же класс правки, что и в сессиях 3-7): реальный гейт
// (learning_content_quality_gate_v1.ts) держит верхний потолок 320 знаков /
// 4 предложения; первый черновик этого файла был раздут до ~440-800 знаков
// на локаль и валил бы intro_body_overloaded. Переписано короче без потери
// concept→formula→trap структуры; тело дословно содержит формулировку
// правильного ответа вопроса (intro_question_not_grounded).
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_08_CHECKPOINT_TITLE = L({
  ru: 'Всё про я целиком',
  uk: 'Все про я цілком',
  es: 'Everything about "I" all together',
  'pt-BR': 'Tudo sobre "eu" junto',
  vi: 'Tất cả về "tôi" cùng một lúc',
  id: 'Semua tentang "saya" sekaligus',
  tr: '"Ben" hakkında her şey birlikte',
  pl: 'Wszystko o „ja” razem',
});

export const ES_EPISODE_01_SESSION_08_CHECKPOINT_SUMMARY = L({
  ru: 'Все признаки и связки, встречавшиеся до сих пор, проверяются вместе, без подсказок и без разбивки по темам.',
  uk: 'Усі ознаки й зв’язки, що траплялися досі, перевіряються разом, без підказок і без розбивки за темами.',
  es: 'All the qualities and linking words seen so far are checked together, without hints and without splitting by topic.',
  'pt-BR': 'Todas as qualidades e ligações vistas até agora são verificadas juntas, sem dicas e sem divisão por tema.',
  vi: 'Tất cả các đặc điểm và từ nối đã gặp cho đến nay được kiểm tra cùng nhau, không gợi ý và không chia theo chủ đề.',
  id: 'Semua sifat dan kata penghubung yang sudah dijumpai sejauh ini diperiksa bersama, tanpa petunjuk dan tanpa pembagian berdasarkan topik.',
  tr: 'Şimdiye kadar görülen tüm nitelikler ve bağlayıcılar birlikte kontrol edilir, ipucu olmadan ve konuya göre ayrım yapılmadan.',
  pl: 'Wszystkie poznane dotąd cechy i łączniki są sprawdzane razem, bez podpowiedzi i bez podziału na tematy.',
});

export const ES_EPISODE_01_SESSION_08_CHECKPOINT_GOAL = L({
  ru: 'Правильно применить любую из уже известных связок и признаков без подсказки, в произвольном порядке.',
  uk: 'Правильно застосувати будь-яку з уже відомих зв’язок і ознак без підказки, у довільному порядку.',
  es: 'Correctly apply any of the already-known linking words and qualities without a hint, in any order.',
  'pt-BR': 'Aplicar corretamente qualquer uma das ligações e qualidades já conhecidas sem dica, em qualquer ordem.',
  vi: 'Áp dụng đúng bất kỳ từ nối hoặc đặc điểm nào đã biết mà không có gợi ý, theo bất kỳ thứ tự nào.',
  id: 'Menerapkan dengan benar salah satu dari kata penghubung dan sifat yang sudah dikenal tanpa petunjuk, dalam urutan apa pun.',
  tr: 'Zaten bilinen bağlayıcılardan ve niteliklerden herhangi birini ipucu olmadan, herhangi bir sırayla doğru şekilde uygulamak.',
  pl: 'Poprawnie zastosować dowolny ze znanych już łączników i cech bez podpowiedzi, w dowolnej kolejności.',
});

const CONCEPT_BODY = L({
  ru: 'До сих пор каждый признак проверялся отдельно, с известной темой заранее. Здесь темы перемешаны без предупреждения, какая потребуется дальше. Проверяется умение быстро определить нужное правило без подсказки — не память об одном правиле.',
  uk: 'Досі кожна ознака перевірялася окремо, з відомою темою заздалегідь. Тут теми перемішані без попередження, яка знадобиться далі. Перевіряється уміння швидко визначити потрібне правило без підказки — не пам’ять про одне правило.',
  es: 'Until now, each quality was checked separately, with the topic known in advance. Here the topics are mixed with no warning about which will come next. What is checked is the ability to quickly work out the needed rule without a hint — not memory of one rule.',
  'pt-BR': 'Até agora, cada qualidade era verificada separadamente, com o tema já conhecido de antemão. Aqui os temas se misturam sem aviso de qual virá a seguir. Verifica-se a capacidade de descobrir rapidamente a regra necessária sem dica — não a memória de uma regra só.',
  vi: 'Cho đến giờ, mỗi đặc điểm được kiểm tra riêng biệt, đã biết trước chủ đề. Ở đây các chủ đề trộn lẫn không có cảnh báo điều gì sẽ đến tiếp theo. Điều được kiểm tra là khả năng nhanh chóng xác định quy tắc cần thiết mà không có gợi ý — không phải trí nhớ về một quy tắc.',
  id: 'Sampai sekarang, setiap sifat diperiksa terpisah, dengan topik yang sudah diketahui sebelumnya. Di sini topik-topik tercampur tanpa peringatan mana yang akan datang berikutnya. Yang diperiksa adalah kemampuan cepat mengetahui aturan yang diperlukan tanpa petunjuk — bukan ingatan tentang satu aturan.',
  tr: 'Şimdiye kadar her nitelik ayrı kontrol edildi, konu önceden bilinerek. Burada konular sırada ne olduğuna dair uyarı olmadan karışır. Kontrol edilen, gerekli kuralı ipucu olmadan hızlıca bulma becerisidir — tek bir kuralın hafızası değil.',
  pl: 'Do tej pory każda cecha była sprawdzana osobno, z tematem znanym z góry. Tutaj tematy są pomieszane bez ostrzeżenia, co będzie dalej. Sprawdza się umiejętność szybkiego ustalenia potrzebnej reguły bez podpowiedzi — nie pamięć jednej reguły.',
});

const FORMULA_BODY = L({
  ru: 'Формула проверки простая: сначала понять, о каком признаке идёт речь, затем подобрать форму. Es rápido и Es único выглядят похоже, но требуют разных слов. Ответ прост: собственный смысл слова определяет выбор, а не место в предложении.',
  uk: 'Формула перевірки проста: спершу зрозуміти, про яку ознаку йдеться, потім підібрати форму. Es rápido і Es único виглядають подібно, але вимагають різних слів. Відповідь проста: власний зміст слова визначає вибір, а не місце в реченні.',
  es: 'The checking formula is simple: first understand which quality is meant, then pick the form. Es rápido and Es único look similar but need different words. Each word is recognized by the word\'s own meaning, not by its place in the sentence.',
  'pt-BR': 'A fórmula de verificação é simples: primeiro entender qual qualidade está em jogo, depois escolher a forma. Es rápido e Es único parecem semelhantes, mas exigem palavras diferentes. Cada palavra é reconhecida pelo próprio significado, não pelo lugar na frase.',
  vi: 'Công thức kiểm tra đơn giản: trước tiên hiểu đặc điểm nào, sau đó chọn dạng. Es rápido và Es único trông giống nhau nhưng cần những từ khác nhau. Mỗi từ được nhận ra bằng chính nghĩa của nó, không phải bằng vị trí trong câu.',
  id: 'Rumus pemeriksaan sederhana: pertama memahami sifat mana yang dimaksud, lalu memilih bentuk. Es rápido dan Es único terlihat mirip tetapi memerlukan kata yang berbeda. Setiap kata dikenali dari maknanya sendiri, bukan posisinya dalam kalimat.',
  tr: 'Kontrol formülü basittir: önce hangi niteliğin kastedildiğini anlamak, sonra biçimi seçmek. Es rápido ve Es único benzer görünür ama farklı kelimeler gerektirir. Her kelime kendi anlamına göre tanınır, cümledeki yerine göre değil.',
  pl: 'Formuła sprawdzenia jest prosta: najpierw zrozumieć, o jaką cechę chodzi, potem dobrać formę. Es rápido i Es único wyglądają podobnie, ale wymagają różnych słów. Każde słowo rozpoznaje się po jego znaczeniu, a nie po miejscu w zdaniu.',
});

const TRAP_BODY = L({
  ru: 'Частая ошибка — перепутать похожие признаки: rápido и único оба на -o, но означают разное. Ещё ловушка — забыть, что fácil и verdad не меняются по роду. Третья — спутать es с soy: es для любого предмета, soy — только когда говорящий говорит о себе.',
  uk: 'Часта помилка — сплутати схожі ознаки: rápido і único обидва на -o, але означають різне. Ще пастка — забути, що fácil і verdad не змінюються за родом. Третя — сплутати es із soy: es для будь-якого предмета, soy — тільки коли мовець говорить про себе.',
  es: 'A common mistake is confusing similar qualities: rápido and único both end in -o but mean different things. Another trap is forgetting that fácil and verdad do not change for gender. A third trap: soy is used only when the speaker is talking about themselves.',
  'pt-BR': 'Um erro comum é confundir qualidades semelhantes: rápido e único terminam em -o, mas significam coisas diferentes. Outra armadilha é esquecer que fácil e verdad não mudam de gênero. Uma terceira: soy é usado só quando quem fala fala de si mesmo.',
  vi: 'Lỗi phổ biến là nhầm lẫn các đặc điểm giống nhau: rápido và único đều kết thúc bằng -o nhưng có nghĩa khác nhau. Cái bẫy khác là quên rằng fácil và verdad không đổi theo giống. Cái bẫy thứ ba: soy chỉ dùng khi người nói đang nói về chính mình.',
  id: 'Kesalahan umum adalah tertukar sifat yang mirip: rápido dan único sama-sama berakhiran -o tetapi artinya berbeda. Jebakan lain adalah lupa bahwa fácil dan verdad tidak berubah menurut gender. Jebakan ketiga: soy dipakai hanya ketika penutur berbicara tentang dirinya sendiri.',
  tr: 'Yaygın hata, benzer nitelikleri karıştırmaktır: rápido ve único ikisi de -o ile biter ama farklı anlamlara gelir. Başka tuzak, fácil ve verdad’ın cinsiyete göre değişmediğini unutmaktır. Üçüncü tuzak: soy yalnızca konuşan kendisinden bahsederken kullanılır.',
  pl: 'Częstym błędem jest pomylenie podobnych cech: rápido i único oba kończą się na -o, ale znaczą co innego. Kolejna pułapka to zapomnienie, że fácil i verdad nie zmieniają się przez rodzaj. Trzecia: soy używa się tylko wtedy, gdy mówiący mówi o sobie samym.',
});

export const ES_EPISODE_01_SESSION_08_CHECKPOINT_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Темы больше не идут по очереди',
      uk: 'Теми більше не йдуть по черзі',
      es: 'Topics no longer come one at a time',
      'pt-BR': 'Os temas não vêm mais um de cada vez',
      vi: 'Các chủ đề không còn đến lần lượt',
      id: 'Topik tidak lagi datang satu per satu',
      tr: 'Konular artık sırayla gelmiyor',
      pl: 'Tematy nie następują już po kolei',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'До сих пор каждый признак проверялся отдельно, с известной темой заранее. Здесь темы перемешаны без предупреждения, какая потребуется дальше. Проверяется ', semantic: 'explanation' }, { text: 'умение быстро определить нужное правило без подсказки', semantic: 'targetCorrect' }, { text: ' — не память об одном правиле.', semantic: 'explanation' }),
      uk: R({ text: 'Досі кожна ознака перевірялася окремо, з відомою темою заздалегідь. Тут теми перемішані без попередження, яка знадобиться далі. Перевіряється ', semantic: 'explanation' }, { text: 'уміння швидко визначити потрібне правило без підказки', semantic: 'targetCorrect' }, { text: ' — не пам’ять про одне правило.', semantic: 'explanation' }),
      es: R({ text: 'Until now, each quality was checked separately, with the topic known in advance. Here the topics are mixed with no warning about which will come next. What is checked is ', semantic: 'explanation' }, { text: 'the ability to quickly work out the needed rule without a hint', semantic: 'targetCorrect' }, { text: ' — not memory of one rule.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Até agora, cada qualidade era verificada separadamente, com o tema já conhecido de antemão. Aqui os temas se misturam sem aviso de qual virá a seguir. Verifica-se ', semantic: 'explanation' }, { text: 'a capacidade de descobrir rapidamente a regra necessária sem dica', semantic: 'targetCorrect' }, { text: ' — não a memória de uma regra só.', semantic: 'explanation' }),
      vi: R({ text: 'Cho đến giờ, mỗi đặc điểm được kiểm tra riêng biệt, đã biết trước chủ đề. Ở đây các chủ đề trộn lẫn không có cảnh báo điều gì sẽ đến tiếp theo. Điều được kiểm tra là ', semantic: 'explanation' }, { text: 'khả năng nhanh chóng xác định quy tắc cần thiết mà không có gợi ý', semantic: 'targetCorrect' }, { text: ' — không phải trí nhớ về một quy tắc.', semantic: 'explanation' }),
      id: R({ text: 'Sampai sekarang, setiap sifat diperiksa terpisah, dengan topik yang sudah diketahui sebelumnya. Di sini topik-topik tercampur tanpa peringatan mana yang akan datang berikutnya. Yang diperiksa adalah ', semantic: 'explanation' }, { text: 'kemampuan untuk cepat mengetahui aturan yang diperlukan tanpa petunjuk', semantic: 'targetCorrect' }, { text: ' — bukan ingatan tentang satu aturan.', semantic: 'explanation' }),
      tr: R({ text: 'Şimdiye kadar her nitelik ayrı kontrol edildi, konu önceden bilinerek. Burada konular sırada ne olduğuna dair uyarı olmadan karışır. Kontrol edilen, ', semantic: 'explanation' }, { text: 'gerekli kuralı ipucu olmadan hızlıca bulma becerisi', semantic: 'targetCorrect' }, { text: 'dir — tek bir kuralın hafızası değil.', semantic: 'explanation' }),
      pl: R({ text: 'Do tej pory każda cecha była sprawdzana osobno, z tematem znanym z góry. Tutaj tematy są pomieszane bez ostrzeżenia, co będzie dalej. Sprawdza się ', semantic: 'explanation' }, { text: 'umiejętność szybkiego ustalenia potrzebnej reguły bez podpowiedzi', semantic: 'targetCorrect' }, { text: ' — nie pamięć jednej reguły.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что именно проверяется здесь?',
        uk: 'Що саме перевіряється тут?',
        es: 'What exactly is being checked here?',
        'pt-BR': 'O que exatamente é verificado aqui?',
        vi: 'Điều gì chính xác đang được kiểm tra ở đây?',
        id: 'Apa sebenarnya yang diperiksa di sini?',
        tr: 'Burada tam olarak ne kontrol edilir?',
        pl: 'Co dokładnie jest tu sprawdzane?',
      }),
      choices: [
        L({ ru: 'Умение быстро определить нужное правило без подсказки', uk: 'Уміння швидко визначити потрібне правило без підказки', es: 'The ability to quickly work out the needed rule without a hint', 'pt-BR': 'A capacidade de descobrir rapidamente a regra necessária sem dica', vi: 'Khả năng nhanh chóng xác định quy tắc cần thiết mà không có gợi ý', id: 'Kemampuan untuk cepat mengetahui aturan yang diperlukan tanpa petunjuk', tr: 'Gerekli kuralı ipucu olmadan hızlıca bulma becerisi', pl: 'Umiejętność szybkiego ustalenia potrzebnej reguły bez podpowiedzi' }),
        L({ ru: 'Память об одном правиле', uk: 'Пам’ять про одне правило', es: 'Memory of one rule', 'pt-BR': 'A memória de uma regra só', vi: 'Trí nhớ về một quy tắc', id: 'Ingatan tentang satu aturan', tr: 'Tek bir kuralın hafızası', pl: 'Pamięć jednej reguły' }),
        L({ ru: 'Скорость печати', uk: 'Швидкість друку', es: 'Typing speed', 'pt-BR': 'Velocidade de digitação', vi: 'Tốc độ gõ phím', id: 'Kecepatan mengetik', tr: 'Yazma hızı', pl: 'Szybkość pisania' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Проверяется умение быстро определить нужное правило без подсказки — не память об одном правиле и не скорость печати.',
        uk: 'Перевіряється вміння швидко визначити потрібне правило без підказки — не пам’ять про одне правило і не швидкість друку.',
        es: 'What is checked is the ability to quickly work out the needed rule without a hint — not memory of one rule and not typing speed.',
        'pt-BR': 'O que se verifica é a capacidade de descobrir rapidamente a regra necessária sem dica — não a memória de uma regra só nem a velocidade de digitação.',
        vi: 'Điều được kiểm tra là khả năng nhanh chóng xác định quy tắc cần thiết mà không có gợi ý — không phải trí nhớ về một quy tắc hay tốc độ gõ phím.',
        id: 'Yang diperiksa adalah kemampuan untuk cepat mengetahui aturan yang diperlukan tanpa petunjuk — bukan ingatan tentang satu aturan dan bukan kecepatan mengetik.',
        tr: 'Kontrol edilen, gerekli kuralı ipucu olmadan hızlıca bulma becerisidir — tek bir kuralın hafızası ya da yazma hızı değil.',
        pl: 'Sprawdza się umiejętność szybkiego ustalenia potrzebnej reguły bez podpowiedzi — nie pamięć jednej reguły ani szybkość pisania.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Слово признака выдаёт себя само',
      uk: 'Слово ознаки видає себе саме',
      es: 'The quality word gives itself away',
      'pt-BR': 'A palavra da qualidade se revela sozinha',
      vi: 'Từ chỉ đặc điểm tự bộc lộ chính nó',
      id: 'Kata sifat mengungkapkan dirinya sendiri',
      tr: 'Nitelik kelimesi kendini ele verir',
      pl: 'Słowo cechy zdradza się samo',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула проверки простая: сначала понять, о каком признаке идёт речь, затем подобрать форму. ', semantic: 'explanation' }, { text: 'Es rápido', semantic: 'targetCorrect' }, { text: ' и ', semantic: 'explanation' }, { text: 'Es único', semantic: 'targetCorrect' }, { text: ' выглядят похоже, но требуют разных слов. Ответ прост: ', semantic: 'explanation' }, { text: 'собственный смысл слова определяет выбор', semantic: 'targetCorrect' }, { text: ', а не место в предложении.', semantic: 'explanation' }),
      uk: R({ text: 'Формула перевірки проста: спершу зрозуміти, про яку ознаку йдеться, потім підібрати форму. ', semantic: 'explanation' }, { text: 'Es rápido', semantic: 'targetCorrect' }, { text: ' і ', semantic: 'explanation' }, { text: 'Es único', semantic: 'targetCorrect' }, { text: ' виглядають подібно, але вимагають різних слів. Відповідь проста: ', semantic: 'explanation' }, { text: 'власний зміст слова визначає вибір', semantic: 'targetCorrect' }, { text: ', а не місце в реченні.', semantic: 'explanation' }),
      es: R({ text: 'The checking formula is simple: first understand which quality is meant, then pick the form. ', semantic: 'explanation' }, { text: 'Es rápido', semantic: 'targetCorrect' }, { text: ' and ', semantic: 'explanation' }, { text: 'Es único', semantic: 'targetCorrect' }, { text: ' look similar but need different words. ', semantic: 'explanation' }, { text: 'The word\'s own meaning', semantic: 'targetCorrect' }, { text: ' determines the choice, not the place in the sentence.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula de verificação é simples: primeiro entender qual qualidade está em jogo, depois escolher a forma. ', semantic: 'explanation' }, { text: 'Es rápido', semantic: 'targetCorrect' }, { text: ' e ', semantic: 'explanation' }, { text: 'Es único', semantic: 'targetCorrect' }, { text: ' parecem semelhantes, mas exigem palavras diferentes. ', semantic: 'explanation' }, { text: 'O próprio significado da palavra', semantic: 'targetCorrect' }, { text: ' determina a escolha, não o lugar na frase.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức kiểm tra đơn giản: trước tiên hiểu đặc điểm nào, sau đó chọn dạng. ', semantic: 'explanation' }, { text: 'Es rápido', semantic: 'targetCorrect' }, { text: ' và ', semantic: 'explanation' }, { text: 'Es único', semantic: 'targetCorrect' }, { text: ' trông giống nhau nhưng cần những từ khác nhau. ', semantic: 'explanation' }, { text: 'Chính nghĩa của từ', semantic: 'targetCorrect' }, { text: ' quyết định lựa chọn, không phải vị trí trong câu.', semantic: 'explanation' }),
      id: R({ text: 'Rumus pemeriksaan sederhana: pertama memahami sifat mana yang dimaksud, lalu memilih bentuk. ', semantic: 'explanation' }, { text: 'Es rápido', semantic: 'targetCorrect' }, { text: ' dan ', semantic: 'explanation' }, { text: 'Es único', semantic: 'targetCorrect' }, { text: ' terlihat mirip tetapi memerlukan kata yang berbeda. ', semantic: 'explanation' }, { text: 'Makna kata itu sendiri', semantic: 'targetCorrect' }, { text: ' menentukan pilihan, bukan posisinya dalam kalimat.', semantic: 'explanation' }),
      tr: R({ text: 'Kontrol formülü basittir: önce hangi niteliğin kastedildiğini anlamak, sonra biçimi seçmek. ', semantic: 'explanation' }, { text: 'Es rápido', semantic: 'targetCorrect' }, { text: ' ve ', semantic: 'explanation' }, { text: 'Es único', semantic: 'targetCorrect' }, { text: ' benzer görünür ama farklı kelimeler gerektirir. ', semantic: 'explanation' }, { text: 'Kelimenin kendi anlamı', semantic: 'targetCorrect' }, { text: ' seçimi belirler, cümledeki yeri değil.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła sprawdzenia jest prosta: najpierw zrozumieć, o jaką cechę chodzi, potem dobrać formę. ', semantic: 'explanation' }, { text: 'Es rápido', semantic: 'targetCorrect' }, { text: ' i ', semantic: 'explanation' }, { text: 'Es único', semantic: 'targetCorrect' }, { text: ' wyglądają podobnie, ale wymagają różnych słów. ', semantic: 'explanation' }, { text: 'Własne znaczenie słowa', semantic: 'targetCorrect' }, { text: ' decyduje o wyborze, a nie miejsce w zdaniu.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'От чего зависит, какое слово признака нужно выбрать?',
        uk: 'Від чого залежить, яке слово ознаки потрібно обрати?',
        es: 'What determines which quality word needs to be chosen?',
        'pt-BR': 'O que determina qual palavra de qualidade precisa ser escolhida?',
        vi: 'Điều gì quyết định từ chỉ đặc điểm nào cần được chọn?',
        id: 'Apa yang menentukan kata sifat mana yang perlu dipilih?',
        tr: 'Hangi nitelik kelimesinin seçilmesi gerektiğini ne belirler?',
        pl: 'Od czego zależy, które słowo cechy trzeba wybrać?',
      }),
      choices: [
        L({ ru: 'Собственный смысл слова', uk: 'Власний зміст слова', es: 'The word\'s own meaning', 'pt-BR': 'O próprio significado da palavra', vi: 'Chính nghĩa của từ', id: 'Makna kata itu sendiri', tr: 'Kelimenin kendi anlamı', pl: 'Własne znaczenie słowa' }),
        L({ ru: 'Место слова в предложении', uk: 'Місце слова в реченні', es: 'The word\'s place in the sentence', 'pt-BR': 'O lugar da palavra na frase', vi: 'Vị trí của từ trong câu', id: 'Posisi kata dalam kalimat', tr: 'Kelimenin cümledeki yeri', pl: 'Miejsce słowa w zdaniu' }),
        L({ ru: 'Длина слова', uk: 'Довжина слова', es: 'The length of the word', 'pt-BR': 'O comprimento da palavra', vi: 'Độ dài của từ', id: 'Panjang kata', tr: 'Kelimenin uzunluğu', pl: 'Długość słowa' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Правильный ответ — собственный смысл слова: rápido говорит о темпе, único о единственности, verdadero об истинности, и только этот смысл определяет выбор, а не место в предложении и не длина слова.',
        uk: 'Правильна відповідь — власний зміст слова: rápido говорить про темп, único про єдиність, verdadero про істинність, і саме цей зміст визначає вибір, а не місце в реченні і не довжина слова.',
        es: 'The correct answer is the word\'s own meaning: rápido talks about pace, único about uniqueness, verdadero about being true, and only that meaning determines the choice, not the place in the sentence or the length of the word.',
        'pt-BR': 'A resposta certa é o próprio significado da palavra: rápido fala de ritmo, único de singularidade, verdadero de ser verdadeiro, e só esse significado determina a escolha, não o lugar na frase nem o comprimento da palavra.',
        vi: 'Câu trả lời đúng là chính nghĩa của từ đó: rápido nói về tốc độ, único về sự duy nhất, verdadero về sự đúng đắn, và chỉ nghĩa đó quyết định lựa chọn, không phải vị trí trong câu hay độ dài của từ.',
        id: 'Jawaban yang benar adalah makna kata itu sendiri: rápido berbicara tentang kecepatan, único tentang keunikan, verdadero tentang kebenaran, dan hanya makna itulah yang menentukan pilihan, bukan posisi dalam kalimat atau panjang kata.',
        tr: 'Doğru cevap kelimenin kendi anlamıdır: rápido tempodan, único eşsizlikten, verdadero doğruluktan bahseder, ve seçimi belirleyen yalnızca bu anlamdır, cümledeki yeri ya da kelimenin uzunluğu değil.',
        pl: 'Poprawna odpowiedź to własne znaczenie słowa: rápido mówi o tempie, único o wyjątkowości, verdadero o prawdziwości, i tylko to znaczenie decyduje o wyborze, a nie miejsce w zdaniu ani długość słowa.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Похожая структура — не значит одно и то же',
      uk: 'Схожа структура — не означає те саме',
      es: 'Similar structure does not mean the same thing',
      'pt-BR': 'Estrutura parecida não significa a mesma coisa',
      vi: 'Cấu trúc giống nhau không có nghĩa là giống nhau',
      id: 'Struktur mirip tidak berarti hal yang sama',
      tr: 'Benzer yapı aynı şey demek değildir',
      pl: 'Podobna struktura nie znaczy to samo',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Частая ошибка — перепутать похожие признаки: ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' и ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' оба на -o, но означают разное. Ещё ловушка — забыть, что ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: ' и ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetCorrect' }, { text: ' не меняются по роду. Третья — спутать ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' с ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetWrong' }, { text: ': es для любого предмета, ', semantic: 'explanation' }, { text: 'soy — только когда говорящий говорит о себе', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      uk: R({ text: 'Часта помилка — сплутати схожі ознаки: ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' і ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' обидва на -o, але означають різне. Ще пастка — забути, що ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: ' і ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetCorrect' }, { text: ' не змінюються за родом. Третя — сплутати ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' із ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetWrong' }, { text: ': es для будь-якого предмета, ', semantic: 'explanation' }, { text: 'soy — тільки коли мовець говорить про себе', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      es: R({ text: 'A common mistake is confusing similar qualities: ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' and ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' both end in -o but mean different things. Another trap is forgetting that ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: ' and ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetCorrect' }, { text: ' do not change for gender. A third trap: ', semantic: 'explanation' }, { text: 'soy is used only when the speaker is talking about themselves', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Um erro comum é confundir qualidades semelhantes: ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' e ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' terminam em -o, mas significam coisas diferentes. Outra armadilha é esquecer que ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: ' e ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetCorrect' }, { text: ' não mudam de gênero. Uma terceira: ', semantic: 'explanation' }, { text: 'soy é usado só quando quem fala fala de si mesmo', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi phổ biến là nhầm lẫn các đặc điểm giống nhau: ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' và ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' đều kết thúc bằng -o nhưng có nghĩa khác nhau. Cái bẫy khác là quên rằng ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: ' và ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetCorrect' }, { text: ' không đổi theo giống. Cái bẫy thứ ba: ', semantic: 'explanation' }, { text: 'soy chỉ dùng khi người nói đang nói về chính mình', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan umum adalah tertukar sifat yang mirip: ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' dan ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' sama-sama berakhiran -o tetapi artinya berbeda. Jebakan lain adalah lupa bahwa ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: ' dan ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetCorrect' }, { text: ' tidak berubah menurut gender. Jebakan ketiga: ', semantic: 'explanation' }, { text: 'soy dipakai hanya ketika penutur berbicara tentang dirinya sendiri', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      tr: R({ text: 'Yaygın hata, benzer nitelikleri karıştırmaktır: ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' ve ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' ikisi de -o ile biter ama farklı anlamlara gelir. Başka tuzak, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: ' ve ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetCorrect' }, { text: '’ın cinsiyete göre değişmediğini unutmaktır. Üçüncü tuzak: ', semantic: 'explanation' }, { text: 'soy yalnızca konuşan kendisinden bahsederken kullanılır', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      pl: R({ text: 'Częstym błędem jest pomylenie podobnych cech: ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' i ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' oba kończą się na -o, ale znaczą co innego. Kolejna pułapka to zapomnienie, że ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: ' i ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetCorrect' }, { text: ' nie zmieniają się przez rodzaj. Trzecia: ', semantic: 'explanation' }, { text: 'soy używa się tylko wtedy, gdy mówiący mówi o sobie samym', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Когда используется soy вместо es?',
        uk: 'Коли використовується soy замість es?',
        es: 'When is soy used instead of es?',
        'pt-BR': 'Quando soy é usado em vez de es?',
        vi: 'Khi nào soy được dùng thay vì es?',
        id: 'Kapan soy dipakai alih-alih es?',
        tr: 'Es yerine soy ne zaman kullanılır?',
        pl: 'Kiedy używa się soy zamiast es?',
      }),
      choices: [
        L({ ru: 'Когда говорящий говорит о себе', uk: 'Коли мовець говорить про себе', es: 'When the speaker is talking about themselves', 'pt-BR': 'Quando quem fala está falando de si mesmo', vi: 'Khi người nói đang nói về chính mình', id: 'Ketika penutur berbicara tentang dirinya sendiri', tr: 'Konuşan kendisinden bahsederken', pl: 'Gdy mówiący mówi o sobie samym' }),
        L({ ru: 'Когда речь идёт о любом предмете', uk: 'Коли йдеться про будь-який предмет', es: 'When talking about any thing', 'pt-BR': 'Quando se fala de qualquer coisa', vi: 'Khi nói về bất kỳ vật gì', id: 'Ketika berbicara tentang benda apa pun', tr: 'Herhangi bir şeyden bahsedilirken', pl: 'Gdy mowa o dowolnej rzeczy' }),
        L({ ru: 'Никогда, soy и es взаимозаменяемы', uk: 'Ніколи, soy та es взаємозамінні', es: 'Never, soy and es are interchangeable', 'pt-BR': 'Nunca, soy e es são intercambiáveis', vi: 'Không bao giờ, soy và es có thể thay thế nhau', id: 'Tidak pernah, soy dan es dapat dipertukarkan', tr: 'Asla, soy ve es birbirinin yerine kullanılabilir', pl: 'Nigdy, soy i es są wymienne' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Soy используется, только когда говорящий говорит о себе — es используется для любого предмета или ситуации, а не наоборот.',
        uk: 'Soy використовується тільки тоді, коли мовець говорить про себе — es використовується для будь-якого предмета чи ситуації, а не навпаки.',
        es: 'Soy is used only when the speaker is talking about themselves — es is used for any thing or situation, not the other way around.',
        'pt-BR': 'Soy é usado só quando quem fala está falando de si mesmo — es é usado para qualquer coisa ou situação, não o contrário.',
        vi: 'Soy chỉ được dùng khi người nói đang nói về chính mình — es được dùng cho bất kỳ vật hay tình huống nào, không phải ngược lại.',
        id: 'Soy dipakai hanya ketika penutur berbicara tentang dirinya sendiri — es dipakai untuk benda atau situasi apa pun, bukan sebaliknya.',
        tr: 'Soy yalnızca konuşan kendisinden bahsederken kullanılır — es herhangi bir şey ya da durum için kullanılır, tersi değil.',
        pl: 'Soy używa się tylko wtedy, gdy mówiący mówi o sobie samym — es używa się dla dowolnej rzeczy lub sytuacji, a nie odwrotnie.',
      }),
    },
  },
];
