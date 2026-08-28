import type {
  LocalizedSource,
  SessionVocabularyContactSourceV1,
  SessionVocabularySourceV1,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 33 "Хорошо или плохо" / quality_extended_adjective, builtOn: [1, 4],
// recalls: [1, 4]): единственное word-first слово — bueno, «хороший»,
// ПРИЗНАК мужского рода. Открывает Главу 5 ("Признаки целиком", session 40 —
// checkpoint) первым НОВЫМ прилагательным этой главы. Проверено grep по
// всему корпусу es_episode_01_session_*.ts — bueno/buena/malo ни разу не
// встречались как испанская лексика раньше (единственное совпадение по
// строке "bueno" — ложное срабатывание в episode_01_session_03_phrases_word_first_v1.ts,
// это английское слово "Bad" внутри объяснения на en, а не испанский bueno).
// Слово действительно новое.
//
// Bueno пишется и согласуется ТОЧНО так же, как caro/cara (сессия 1) и
// rápido/rápida (сессия 5): мужской род на -o, женский на -a — bueno/buena.
// Это тот же самый учебниковый паттерн -o/-a, что ученик уже знает с
// первой сессии курса (builtOn: [1, 4] — оценочные признаки truth_adjective
// и quality_adjective), поэтому build_form опирается на уже закреплённую
// формулу, а не вводит новую морфологию.
//
// malo ("плохой", смысловой антоним bueno) используется здесь ТОЛЬКО как
// значение дистрактора в build_form — семантическая ловушка на случай,
// если ученик путает антоним с искомым словом при сборке формы. malo НЕ
// вводится как отдельная лексическая единица в этой сессии — это территория
// будущей сессии (пара "хорошо или плохо" целиком раскрывается по ходу
// главы через фразы, а не здесь через word-first слот). Аналогично buena —
// корректная другая (женская) форма bueno, поэтому её нельзя использовать
// как НЕВЕРНЫЙ дистрактор для мужской цели build_form; там применены
// орфографическая ловушка (удвоение буквы) и семантическая ловушка (malo).
const L = (value: LocalizedSource): LocalizedSource => value;

const contact = (
  guidance: LocalizedSource,
  distractors: SessionVocabularyContactSourceV1['distractors'],
): SessionVocabularyContactSourceV1 => ({ guidance, distractors });

export const ES_EPISODE_01_SESSION_33_VOCABULARY_V1:
  readonly SessionVocabularySourceV1[] = Object.freeze([
  {
    id: 'es-e01-s33-word-bueno',
    target: 'bueno',
    meaning: L({
      ru: 'хороший — признак мужского рода',
      uk: 'хороший — ознака чоловічого роду',
      es: 'good — a masculine-gender quality',
      'pt-BR': 'good — a masculine-gender quality',
      vi: 'good — a masculine-gender quality',
      id: 'good — a masculine-gender quality',
      tr: 'good — a masculine-gender quality',
      pl: 'good — a masculine-gender quality',
    }),
    features: ['quality_extended_adjective'],
    contacts: {
      recognize: contact(
        L({
          ru: 'Bueno звучит с ударением на первый слог — BUE-no, два слога. В начале слова слышится слитный звук «бwэ» — b и дифтонг ue сливаются в один толчок, а не читаются раздельно как б-у-э.',
          uk: 'Bueno звучить з наголосом на перший склад — BUE-no, два склади. На початку слова чути злитий звук «бве» — b і дифтонг ue зливаються в один поштовх, а не читаються окремо як б-у-е.',
          es: 'Bueno has two syllables with stress on the first — BUE-no. At the start, the b and the ue diphthong blend into one single "bwe" push, not read as separate b-u-e sounds.',
          'pt-BR': 'Bueno tem duas sílabas com acento na primeira — BUE-no. No início, o b e o ditongo ue se fundem num único som "bue", não lidos como b-u-e separados.',
          vi: 'Bueno có hai âm tiết, trọng âm rơi vào âm đầu — BUE-no. Ở đầu từ, âm b và nguyên âm đôi ue hòa vào nhau thành một âm "bue" duy nhất, không đọc tách rời như b-u-e.',
          id: 'Bueno memiliki dua suku kata dengan tekanan pada suku kata pertama — BUE-no. Di awal kata, bunyi b dan diftong ue menyatu menjadi satu dorongan "bue", bukan dibaca terpisah sebagai b-u-e.',
          tr: 'Bueno iki hecelidir ve vurgu ilk hecededir — BUE-no. Başta, b sesi ile ue ikili ünlüsü tek bir "bue" sesinde birleşir, ayrı ayrı b-u-e olarak okunmaz.',
          pl: 'Bueno ma dwie sylaby z akcentem na pierwszej — BUE-no. Na początku b i dyftong ue zlewają się w jeden dźwięk "bue", a nie czytane osobno jako b-u-e.',
        }),
        [
          {
            value: 'buen',
            reasonCode: 'bueno_recognize_buen_truncated_form',
            trapType: 'grammar',
            feedback: L({
              ru: 'Buen — это укороченная форма, она звучит короче и обрывается сразу после n, без концовки -o. Она ставится только перед существительным мужского рода (buen día). Само по себе слово-признак произносится полностью: bueno.',
              uk: 'Buen — це скорочена форма, звучить коротше і обривається одразу після n, без закінчення -o. Вона ставиться тільки перед іменником чоловічого роду (buen día). Саме слово-ознака вимовляється повністю: bueno.',
              es: 'Buen is the shortened form — it sounds shorter and cuts off right after n, with no -o ending. It only stands before a masculine noun (buen día). The quality word by itself is pronounced in full: bueno.',
              'pt-BR': 'Buen é a forma truncada — soa mais curta e termina logo após o n, sem a terminação -o. Ela só aparece antes de um substantivo masculino (buen día). A palavra sozinha se pronuncia completa: bueno.',
              vi: 'Buen là dạng rút gọn — nghe ngắn hơn và dừng ngay sau n, không có đuôi -o. Dạng này chỉ đứng trước danh từ giống đực (buen día). Bản thân từ chỉ đặc điểm được phát âm đầy đủ: bueno.',
              id: 'Buen adalah bentuk terpotong — terdengar lebih pendek dan berhenti tepat setelah n, tanpa akhiran -o. Bentuk ini hanya berdiri sebelum kata benda maskulin (buen día). Kata sifat itu sendiri diucapkan lengkap: bueno.',
              tr: 'Buen kısaltılmış biçimdir — daha kısa duyulur ve -o son eki olmadan n harfinden hemen sonra kesilir. Yalnızca eril bir isimden önce kullanılır (buen día). Niteliğin kendisi tam olarak söylenir: bueno.',
              pl: 'Buen to skrócona forma — brzmi krócej i urywa się zaraz po n, bez końcówki -o. Stoi tylko przed rzeczownikiem rodzaju męskiego (buen día). Samo słowo-cecha wymawiane jest w pełni: bueno.',
            }),
          },
          {
            value: 'bueeno',
            reasonCode: 'bueno_recognize_extra_vowel_stretch',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Bueeno с растянутым «е» — не отдельное слово, а слуховая ошибка: слог bue звучит одним слитным толчком, без удвоения гласной. Правильно — bueno, два слога.',
              uk: 'Bueeno з розтягнутим «е» — не окреме слово, а слухова помилка: склад bue звучить одним злитим поштовхом, без подвоєння голосної. Правильно — bueno, два склади.',
              es: 'Bueeno with a stretched "e" is not a real word — it is a hearing mistake: the syllable bue sounds as one smooth push, with no doubled vowel. The correct form is bueno, two syllables.',
              'pt-BR': 'Bueeno com o "e" esticado não é uma palavra real — é um erro de audição: a sílaba bue soa como um único impulso, sem vogal dobrada. A forma correta é bueno, duas sílabas.',
              vi: 'Bueeno với âm "e" kéo dài không phải là một từ thật — đó là lỗi nghe: âm tiết bue nghe như một cú đẩy liền mạch, không có nguyên âm nhân đôi. Dạng đúng là bueno, hai âm tiết.',
              id: 'Bueeno dengan "e" yang diregangkan bukan kata sungguhan — itu kesalahan pendengaran: suku kata bue terdengar sebagai satu dorongan yang lancar, tanpa vokal ganda. Bentuk yang benar adalah bueno, dua suku kata.',
              tr: 'Uzatılmış "e" ile bueeno gerçek bir kelime değildir — bu bir duyma hatasıdır: bue hecesi çift ünlü olmadan tek bir akıcı vuruş gibi duyulur. Doğru biçim iki heceli bueno’dur.',
              pl: 'Bueeno z rozciągniętym „e” nie jest prawdziwym słowem — to błąd słuchowy: sylaba bue brzmi jak jedno płynne uderzenie, bez podwojonej samogłoski. Poprawna forma to bueno, dwie sylaby.',
            }),
          },
        ],
      ),
      retrieve_meaning: contact(
        L({
          ru: 'Bueno — это ПРИЗНАК, общая оценка: «хороший». Не цена и не скорость — просто хорошо это или нет.',
          uk: 'Bueno — це ОЗНАКА, загальна оцінка: «добрий». Не ціна і не швидкість — просто добре це чи ні.',
          es: 'Bueno is a QUALITY, a general evaluation: "good." Not price, not speed — just whether something is good.',
          'pt-BR': 'Bueno é uma QUALIDADE, uma avaliação geral: "bom". Não é preço nem velocidade — só se algo é bom.',
          vi: 'Bueno là một ĐẶC ĐIỂM, một đánh giá chung: "tốt". Không phải giá cả hay tốc độ — chỉ là tốt hay không.',
          id: 'Bueno adalah SIFAT, penilaian umum: "baik". Bukan harga atau kecepatan — hanya baik atau tidaknya sesuatu.',
          tr: 'Bueno bir NİTELİKTİR, genel bir değerlendirme: "iyi". Fiyat ya da hız değil — sadece bir şeyin iyi olup olmadığı.',
          pl: 'Bueno to CECHA, ogólna ocena: "dobry". Nie cena ani prędkość — tylko czy coś jest dobre.',
        }),
        [
          {
            value: 'caro',
            reasonCode: 'bueno_meaning_caro_wrong_quality_price',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Caro означает «дорого» — это про цену, а не про то, хорошая вещь или плохая. Нужно bueno.',
              uk: 'Caro означає «дорого» — це про ціну, а не про те, хороша річ чи погана. Потрібно bueno.',
              es: 'Caro means "expensive" — that is about price, not about whether something is good or bad. Bueno is needed.',
              'pt-BR': 'Caro significa "caro" — isso é sobre preço, não sobre algo ser bom ou ruim. Bueno é o que se precisa.',
              vi: 'Caro nghĩa là "đắt" — đó là về giá cả, không phải về việc thứ gì đó tốt hay xấu. Cần dùng bueno.',
              id: 'Caro berarti "mahal" — itu tentang harga, bukan tentang sesuatu baik atau buruk. Yang diperlukan adalah bueno.',
              tr: 'Caro "pahalı" anlamına gelir — bu fiyatla ilgilidir, bir şeyin iyi ya da kötü olmasıyla değil. Gereken kelime bueno.',
              pl: 'Caro znaczy "drogi" — to dotyczy ceny, a nie tego, czy coś jest dobre czy złe. Potrzebne jest bueno.',
            }),
          },
          {
            value: 'fácil',
            reasonCode: 'bueno_meaning_facil_wrong_quality_ease',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Fácil означает «лёгкий» — это про сложность задачи, а не про то, хорошая вещь или плохая. Нужно bueno.',
              uk: 'Fácil означає «легкий» — це про складність завдання, а не про те, хороша річ чи погана. Потрібно bueno.',
              es: 'Fácil means "easy" — that is about the difficulty of a task, not about whether something is good or bad. Bueno is needed.',
              'pt-BR': 'Fácil significa "fácil" — isso é sobre a dificuldade de uma tarefa, não sobre algo ser bom ou ruim. Bueno é o que se precisa.',
              vi: 'Fácil nghĩa là "dễ" — đó là về độ khó của một việc, không phải về việc thứ gì đó tốt hay xấu. Cần dùng bueno.',
              id: 'Fácil berarti "mudah" — itu tentang tingkat kesulitan suatu tugas, bukan tentang sesuatu baik atau buruk. Yang diperlukan adalah bueno.',
              tr: 'Fácil "kolay" anlamına gelir — bu bir işin zorluğuyla ilgilidir, bir şeyin iyi ya da kötü olmasıyla değil. Gereken kelime bueno.',
              pl: 'Fácil znaczy "łatwy" — to dotyczy trudności zadania, a nie tego, czy coś jest dobre czy złe. Potrzebne jest bueno.',
            }),
          },
        ],
      ),
      build_form: contact(
        L({
          ru: 'Bueno: b-u-e-n-o, без тильды. Пара на -o/-a, как и другие уже знакомые признаки: bueno/buena. Мужская форма кончается ровно на -o, без удвоений.',
          uk: 'Bueno: b-u-e-n-o, без тильди. Пара на -o/-a, як і інші вже знайомі ознаки: bueno/buena. Чоловіча форма закінчується рівно на -o, без подвоєнь.',
          es: 'Bueno: b-u-e-n-o, no tilde. An -o/-a pair, like other already-known qualities: bueno/buena. The masculine form ends in exactly one -o, no doubling.',
          'pt-BR': 'Bueno: b-u-e-n-o, sem til. Um par -o/-a, como outras qualidades já conhecidas: bueno/buena. A forma masculina termina em um único -o, sem duplicação.',
          vi: 'Bueno: b-u-e-n-o, không dấu ngã. Cặp -o/-a, giống các đặc điểm đã biết: bueno/buena. Dạng giống đực kết thúc bằng đúng một -o, không lặp chữ.',
          id: 'Bueno: b-u-e-n-o, tanpa tilde. Pasangan -o/-a, seperti sifat lain yang sudah dikenal: bueno/buena. Bentuk maskulin berakhir tepat satu -o, tanpa penggandaan.',
          tr: 'Bueno: b-u-e-n-o, tildesiz. Diğer bilinen nitelikler gibi bir -o/-a çifti: bueno/buena. Eril biçim tek bir -o ile biter, harf tekrarı olmaz.',
          pl: 'Bueno: b-u-e-n-o, bez tyldy. Para -o/-a, jak inne już znane cechy: bueno/buena. Forma męska kończy się dokładnie jednym -o, bez podwojenia.',
        }),
        [
          {
            value: 'buenno',
            reasonCode: 'bueno_form_double_letter_typo',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Проверьте написание внимательно: нужна ровно одна буква -n-, без удвоения — bueno, а не buenno.',
              uk: 'Перевірте написання уважно: потрібна рівно одна літера -n-, без подвоєння — bueno, а не buenno.',
              es: 'Check the spelling carefully: exactly one letter -n- is needed, no doubling — bueno, not buenno.',
              'pt-BR': 'Verifique a grafia com atenção: é preciso exatamente uma letra -n-, sem duplicação — bueno, não buenno.',
              vi: 'Hãy kiểm tra chính tả cẩn thận: chỉ cần đúng một chữ -n-, không lặp lại — bueno, không phải buenno.',
              id: 'Periksa ejaannya dengan cermat: hanya perlu satu huruf -n-, tanpa penggandaan — bueno, bukan buenno.',
              tr: 'Yazımı dikkatlice kontrol edin: tam olarak bir -n- harfi gerekir, tekrar yok — bueno, buenno değil.',
              pl: 'Sprawdź pisownię uważnie: potrzebna jest dokładnie jedna litera -n-, bez podwojenia — bueno, nie buenno.',
            }),
          },
          {
            value: 'malo',
            reasonCode: 'bueno_form_malo_antonym_not_target',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Malo означает противоположное — «плохой». Это не форма bueno, а другое слово с обратным смыслом. Нужно bueno.',
              uk: 'Malo означає протилежне — «поганий». Це не форма bueno, а інше слово з протилежним значенням. Потрібно bueno.',
              es: 'Malo means the opposite — "bad." It is not a form of bueno, but a different word with the reverse meaning. Bueno is needed.',
              'pt-BR': 'Malo significa o oposto — "ruim". Não é uma forma de bueno, mas uma palavra diferente com sentido invertido. Bueno é o que se precisa.',
              vi: 'Malo có nghĩa ngược lại — "xấu". Đây không phải là một dạng của bueno, mà là một từ khác mang nghĩa trái ngược. Cần dùng bueno.',
              id: 'Malo berarti kebalikannya — "buruk". Ini bukan bentuk dari bueno, melainkan kata lain dengan makna berlawanan. Yang diperlukan adalah bueno.',
              tr: 'Malo tam tersini ifade eder — "kötü". Bu, bueno’nun bir biçimi değil, ters anlamlı başka bir kelimedir. Gereken kelime bueno.',
              pl: 'Malo znaczy coś przeciwnego — "zły". To nie forma bueno, lecz inne słowo o odwrotnym znaczeniu. Potrzebne jest bueno.',
            }),
          },
        ],
      ),
    },
  },
]);
