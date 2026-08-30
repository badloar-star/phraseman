import type {
  LocalizedSource,
  SessionVocabularyContactSourceV1,
  SessionVocabularySourceV1,
} from './session_shard_from_source_v1';

const L = (value: LocalizedSource): LocalizedSource => value;

const contact = (
  guidance: LocalizedSource,
  distractors: SessionVocabularyContactSourceV1['distractors'],
): SessionVocabularyContactSourceV1 => ({ guidance, distractors });

const EPISODE_01_SESSION_01_VOCABULARY_BASE_V1:
  readonly SessionVocabularySourceV1[] = Object.freeze([
  {
    id: 'e01-s01-word-i',
    target: 'I',
    meaning: L({
      ru: 'я',
      uk: 'я',
      es: 'yo',
      'pt-BR': 'eu',
      vi: 'tôi',
      id: 'saya',
      tr: 'ben',
      pl: 'ja',
    }),
    features: ['first_person_singular', 'subject_pronoun'],
    contacts: {
      recognize: contact(
        L({
          ru: 'I — одно английское слово и одна заглавная буква. Оно звучит /aɪ/: коротко, одним слогом.',
          uk: 'I — одне англійське слово й одна велика літера. Воно звучить /aɪ/: коротко, одним складом.',
          es: 'I es una palabra inglesa de una sola letra mayúscula. Suena /aɪ/: breve y en una sílaba.',
          'pt-BR': 'I é uma palavra inglesa formada por uma única letra maiúscula. Soa /aɪ/: breve e em uma sílaba.',
          vi: 'I là một từ tiếng Anh chỉ có một chữ in hoa. Từ này đọc là /aɪ/, gọn trong một âm tiết.',
          id: 'I adalah kata Inggris yang terdiri dari satu huruf kapital. Bunyinya /aɪ/, singkat dalam satu suku kata.',
          tr: 'I, tek bir büyük harften oluşan İngilizce bir sözcüktür. /aɪ/ diye, tek hecede söylenir.',
          pl: 'I to angielskie słowo złożone z jednej wielkiej litery. Brzmi /aɪ/, krótko i w jednej sylabie.',
        }),
        [
          {
            value: 'A',
            reasonCode: 'i_recognize_a_vowel_contrast',
            trapType: 'phonetic',
            feedback: L({
              ru: 'A звучит /eɪ/, а I — /aɪ/; в I первый гласный открыт сильнее.',
              uk: 'A звучить /eɪ/, а I — /aɪ/; у I перший голосний відкритіший.',
              es: 'A suena /eɪ/, mientras I suena /aɪ/; la primera vocal cambia.',
              'pt-BR': 'A soa /eɪ/, enquanto I soa /aɪ/; a primeira vogal é diferente.',
              vi: 'A có âm /eɪ/, còn I có âm /aɪ/; nguyên âm đầu khác nhau.',
              id: 'A berbunyi /eɪ/, sedangkan I /aɪ/; vokal pertamanya berbeda.',
              tr: 'A /eɪ/, I ise /aɪ/ diye okunur; ilk ünlü farklıdır.',
              pl: 'A brzmi /eɪ/, a I — /aɪ/; pierwsza samogłoska jest inna.',
            }),
          },
          {
            value: 'E',
            reasonCode: 'i_recognize_e_vowel_contrast',
            trapType: 'phonetic',
            feedback: L({
              ru: 'E звучит долгим /iː/, а I — дифтонгом /aɪ/; это разные названия букв.',
              uk: 'E звучить довгим /iː/, а I — дифтонгом /aɪ/; це різні назви літер.',
              es: 'E suena con /iː/ largo e I con el diptongo /aɪ/; son letras distintas.',
              'pt-BR': 'E soa com /iː/ longo e I com o ditongo /aɪ/; são letras diferentes.',
              vi: 'E có âm /iː/ dài, còn I có nguyên âm đôi /aɪ/; đó là hai chữ khác nhau.',
              id: 'E berbunyi /iː/ panjang, sedangkan I memakai diftong /aɪ/; keduanya huruf berbeda.',
              tr: 'E uzun /iː/, I ise /aɪ/ diftonguyla okunur; bunlar farklı harflerdir.',
              pl: 'E ma długie /iː/, a I dyftong /aɪ/; to różne nazwy liter.',
            }),
          },
        ],
      ),
      retrieve_meaning: contact(
        L({
          ru: 'I означает «я». Так говорящий показывает прямо на себя — без имени и без лишнего представления.',
          uk: 'I означає «я». Так мовець указує просто на себе — без імені й без зайвого представлення.',
          es: 'I significa «yo». Quien habla lo usa para señalarse a sí mismo, sin decir su nombre.',
          'pt-BR': 'I significa «eu». Quem fala usa essa palavra para apontar para si, sem dizer o próprio nome.',
          vi: 'I có nghĩa là “tôi”. Người nói dùng từ này để chỉ chính mình mà không cần nêu tên.',
          id: 'I berarti “saya”. Penutur memakai kata ini untuk menunjuk dirinya sendiri tanpa menyebut nama.',
          tr: 'I, “ben” demektir. Konuşan kişi adını söylemeden doğrudan kendisini gösterir.',
          pl: 'I znaczy „ja”. Osoba mówiąca wskazuje nim na siebie, bez podawania imienia.',
        }),
        [
          {
            value: 'me',
            reasonCode: 'i_meaning_me_object_case',
            trapType: 'grammar',
            feedback: L({
              ru: 'Me означает «меня/мне»; когда говорящий называет себя как подлежащее, нужно I.',
              uk: 'Me означає «мене/мені»; коли мовець є підметом, потрібне I.',
              es: 'Me es objeto; para nombrar al hablante como sujeto se usa I.',
              'pt-BR': 'Me funciona como objeto; para o falante como sujeito, usa-se I.',
              vi: 'Me là tân ngữ; khi người nói làm chủ ngữ, cần I.',
              id: 'Me adalah objek; untuk penutur sebagai subjek digunakan I.',
              tr: 'Me nesnedir; konuşan özne olduğunda I kullanılır.',
              pl: 'Me jest formą dopełnienia; mówiący jako podmiot wymaga I.',
            }),
          },
          {
            value: 'my',
            reasonCode: 'i_meaning_my_possessive',
            trapType: 'grammar',
            feedback: L({
              ru: 'My означает «мой/моя» и требует предмет после себя; отдельное «я» — I.',
              uk: 'My означає «мій/моя» й потребує назви предмета; окреме «я» — I.',
              es: 'My significa «mi» y acompaña a una cosa; «yo» como sujeto es I.',
              'pt-BR': 'My significa «meu/minha» e acompanha algo; «eu» como sujeito é I.',
              vi: 'My nghĩa là “của tôi” và đi trước một vật; “tôi” làm chủ ngữ là I.',
              id: 'My berarti “milik saya” dan diikuti benda; “saya” sebagai subjek adalah I.',
              tr: 'My “benim” anlamında bir adın önüne gelir; özne olan “ben” I olur.',
              pl: 'My znaczy „mój” i stoi przed rzeczą; samodzielne „ja” jako podmiot to I.',
            }),
          },
        ],
      ),
      build_form: contact(
        L({
          ru: 'I всегда пишется заглавной — даже посреди фразы. Это маленькое слово с привычкой держать спину прямо.',
          uk: 'I завжди пишеться великою — навіть посеред вислову. Це маленьке слово зі звичкою тримати спину рівно.',
          es: 'I siempre se escribe con mayúscula, incluso en medio de una frase. Es pequeña, pero nunca se encoge.',
          'pt-BR': 'I sempre se escreve com maiúscula, até no meio de uma frase. É pequena, mas nunca se encolhe.',
          vi: 'I luôn được viết hoa, kể cả khi đứng giữa câu. Từ này nhỏ nhưng lúc nào cũng đứng thẳng.',
          id: 'I selalu ditulis dengan huruf kapital, bahkan di tengah kalimat. Katanya kecil, tetapi selalu berdiri tegak.',
          tr: 'I, ifadenin ortasında bile her zaman büyük yazılır. Küçüktür ama hiç kambur durmaz.',
          pl: 'I zawsze zapisuje się wielką literą, nawet w środku zdania. Jest małe, lecz nigdy się nie garbi.',
        }),
        [
          {
            value: 'i',
            reasonCode: 'i_form_lowercase_pronoun',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Строчная i — не форма местоимения; английское «я» всегда пишется I.',
              uk: 'Мала i — не форма займенника; англійське «я» завжди пишеться I.',
              es: 'La i minúscula no es el pronombre; el «yo» inglés siempre se escribe I.',
              'pt-BR': 'A letra i minúscula não é o pronome; o «eu» inglês sempre se escreve I.',
              vi: 'i viết thường không phải đại từ; “tôi” trong tiếng Anh luôn là I.',
              id: 'i kecil bukan bentuk kata ganti; “saya” dalam bahasa Inggris selalu ditulis I.',
              tr: 'Küçük i zamir değildir; İngilizce “ben” her zaman I yazılır.',
              pl: 'Małe i nie jest zaimkiem; angielskie „ja” zawsze zapisuje się jako I.',
            }),
          },
          {
            value: 'l',
            reasonCode: 'i_form_lowercase_l_shape',
            trapType: 'orthographic',
            feedback: L({
              ru: 'l — строчная буква L без точки; английское местоимение «я» пишется заглавной I.',
              uk: 'l — мала літера L без крапки; англійський займенник «я» пишеться великою I.',
              es: 'l es la letra L minúscula sin punto; el pronombre inglés «yo» se escribe I.',
              'pt-BR': 'l é a letra L minúscula sem ponto; o pronome inglês «eu» se escreve I.',
              vi: 'l là chữ L thường không có dấu chấm; đại từ tiếng Anh “tôi” được viết là I.',
              id: 'l adalah huruf L kecil tanpa titik; kata ganti Inggris “saya” ditulis I.',
              tr: 'l noktasız küçük L harfidir; İngilizce “ben” zamiri büyük I yazılır.',
              pl: 'l to mała litera L bez kropki; angielski zaimek „ja” zapisuje się jako I.',
            }),
          },
        ],
      ),
    },
  },
  {
    id: 'e01-s01-word-am',
    target: 'am',
    meaning: L({
      ru: 'есть / являюсь',
      uk: 'є / являюся',
      es: 'soy / estoy',
      'pt-BR': 'sou / estou',
      vi: 'là',
      id: 'adalah',
      tr: '-im / -ım',
      pl: 'jestem',
    }),
    features: ['copula_be', 'first_person_singular'],
    contacts: {
      recognize: contact(
        L({
          ru: 'Am звучит /æm/. В конце губы смыкаются на /m/, поэтому слово заканчивается чётко.',
          uk: 'Am звучить /æm/. Наприкінці губи змикаються на /m/, тому слово завершується чітко.',
          es: 'Am suena /æm/. Al final, los labios se cierran en /m/, así que la palabra termina con claridad.',
          'pt-BR': 'Am soa /æm/. No final, os lábios se fecham em /m/, deixando a palavra bem definida.',
          vi: 'Am được đọc là /æm/. Cuối từ, hai môi khép lại ở âm /m/ nên âm kết thúc rất rõ.',
          id: 'Am berbunyi /æm/. Di akhir, bibir menutup pada /m/, sehingga ujung katanya terdengar jelas.',
          tr: 'Am /æm/ diye söylenir. Sonda dudaklar /m/ için kapanır; sözcük net biçimde biter.',
          pl: 'Am brzmi /æm/. Na końcu wargi zamykają się przy /m/, więc słowo ma wyraźne zakończenie.',
        }),
        [
          {
            value: 'an',
            reasonCode: 'am_recognize_an_final_n',
            trapType: 'phonetic',
            feedback: L({
              ru: 'An заканчивается /n/; в am губы смыкаются на /m/.',
              uk: 'An закінчується /n/; в am губи змикаються на /m/.',
              es: 'An acaba en /n/; am cierra los labios para /m/.',
              'pt-BR': 'An termina em /n/; am fecha os lábios no /m/.',
              vi: 'An kết thúc bằng /n/; am khép môi ở âm /m/.',
              id: 'An berakhir dengan /n/; am menutup bibir pada /m/.',
              tr: 'An /n/ ile biter; am söylerken dudaklar /m/ için kapanır.',
              pl: 'An kończy się /n/; w am wargi zamykają się przy /m/.',
            }),
          },
          {
            value: 'um',
            reasonCode: 'am_recognize_um_vowel_contrast',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Um начинается звуком /ʌ/, а am — /æ/; обе формы кончаются /m/, но гласный различается.',
              uk: 'Um починається звуком /ʌ/, а am — /æ/; обидві форми мають /m/, але голосний різниться.',
              es: 'Um empieza con /ʌ/ y am con /æ/; ambas terminan en /m/, pero la vocal cambia.',
              'pt-BR': 'Um começa com /ʌ/ e am com /æ/; ambas terminam em /m/, mas a vogal muda.',
              vi: 'Um bắt đầu bằng /ʌ/, còn am bằng /æ/; cả hai kết thúc /m/ nhưng nguyên âm khác nhau.',
              id: 'Um diawali /ʌ/, sedangkan am /æ/; keduanya berakhir /m/, tetapi vokalnya berbeda.',
              tr: 'Um /ʌ/, am ise /æ/ ile başlar; ikisi de /m/ ile biter ama ünlü farklıdır.',
              pl: 'Um zaczyna się /ʌ/, a am — /æ/; oba kończą się /m/, lecz różni je samogłoska.',
            }),
          },
        ],
      ),
      retrieve_meaning: contact(
        L({
          ru: 'Am ставится после I и соединяет говорящего с дальнейшей информацией. Само по себе оно почти незаметно, но без него фраза развалится.',
          uk: 'Am ставиться після I й поєднує мовця з подальшою інформацією. Саме воно майже непомітне, але без нього вислів розсиплеться.',
          es: 'Am va después de I y conecta a quien habla con la información que sigue. Casi no presume, pero sin ella la frase se desmonta.',
          'pt-BR': 'Am vem depois de I e liga quem fala à informação seguinte. Quase não aparece, mas sem ela a frase desmonta.',
          vi: 'Am đứng sau I và nối người nói với thông tin phía sau. Từ này khá kín đáo, nhưng thiếu nó thì câu sẽ rời ra.',
          id: 'Am muncul setelah I dan menghubungkan penutur dengan informasi berikutnya. Kecil perannya di layar, besar tugasnya di kalimat.',
          tr: 'Am, I sözcüğünden sonra gelir ve konuşanı sonraki bilgiye bağlar. Gösterişsizdir ama onsuz ifade dağılır.',
          pl: 'Am stoi po I i łączy mówiącego z dalszą informacją. Nie rzuca się w oczy, ale bez niego zdanie się rozsypuje.',
        }),
        [
          {
            value: 'an',
            reasonCode: 'am_meaning_an_not_connector',
            trapType: 'phonetic',
            feedback: L({
              ru: 'An — другое английское слово с финальным /n/; связку для говорящего I передаёт am с /m/.',
              uk: 'An — інше англійське слово з кінцевим /n/; зв’язку для мовця I передає am із /m/.',
              es: 'An es otra palabra inglesa y termina en /n/; la unión para el hablante I es am con /m/.',
              'pt-BR': 'An é outra palavra inglesa e termina em /n/; a ligação para o falante I é am com /m/.',
              vi: 'An là một từ tiếng Anh khác và kết thúc bằng /n/; từ nối cho người nói I là am với /m/.',
              id: 'An adalah kata Inggris lain dan berakhir /n/; penghubung untuk penutur I ialah am dengan /m/.',
              tr: 'An /n/ ile biten başka bir İngilizce sözcüktür; I konuşanını bağlayan biçim /m/ ile am olur.',
              pl: 'An jest innym angielskim słowem zakończonym /n/; łącznikiem dla mówiącego I jest am z /m/.',
            }),
          },
          {
            value: 'm',
            reasonCode: 'am_meaning_m_letter_not_connector',
            trapType: 'orthographic',
            feedback: L({
              ru: 'm — только одна буква и не выполняет работу связки; рядом с говорящим I требуется полное am.',
              uk: 'm — лише одна літера й не виконує роботу зв’язки; поруч із мовцем I потрібне повне am.',
              es: 'm es una sola letra y no funciona como unión; junto al hablante I se necesita la forma completa am.',
              'pt-BR': 'm é uma única letra e não funciona como ligação; junto ao falante I é necessária a forma completa am.',
              vi: 'm chỉ là một chữ cái và không làm nhiệm vụ nối; bên cạnh người nói I cần dạng đầy đủ am.',
              id: 'm hanya sebuah huruf dan bukan penghubung; di samping penutur I diperlukan bentuk lengkap am.',
              tr: 'm yalnızca bir harftir ve bağlantı kurmaz; konuşan I yanında tam am biçimi gerekir.',
              pl: 'm jest tylko literą i nie działa jako łącznik; przy mówiącym I potrzebna jest pełna forma am.',
            }),
          },
        ],
      ),
      build_form: contact(
        L({
          ru: 'Am пишется слитно и строчными буквами. Это короткая цельная форма: внутри неё нет пробела.',
          uk: 'Am пишеться разом і малими літерами. Це коротка цілісна форма: усередині неї немає пробілу.',
          es: 'Am se escribe unido y en minúsculas. Es una forma breve y completa, sin espacio en medio.',
          'pt-BR': 'Am se escreve junto e em letras minúsculas. É uma forma curta e inteira, sem espaço no meio.',
          vi: 'Am được viết liền bằng chữ thường. Đây là một dạng ngắn, nguyên vẹn và không có khoảng trắng ở giữa.',
          id: 'Am ditulis rapat dengan huruf kecil. Bentuknya pendek dan utuh, tanpa spasi di tengah.',
          tr: 'Am bitişik ve küçük harflerle yazılır. Kısa ama tam bir biçimdir; ortasında boşluk yoktur.',
          pl: 'Am zapisuje się łącznie i małymi literami. To krótka, pełna forma bez spacji w środku.',
        }),
        [
          {
            value: 'an',
            reasonCode: 'am_form_an_last_letter',
            trapType: 'orthographic',
            feedback: L({
              ru: 'An заканчивается n и является другим словом; форма с I пишется am через m.',
              uk: 'An закінчується n і є іншим словом; форма з I пишеться am через m.',
              es: 'An termina en n y es otra palabra; la forma con I se escribe am con m.',
              'pt-BR': 'An termina em n e é outra palavra; a forma com I se escreve am com m.',
              vi: 'An kết thúc bằng n và là từ khác; dạng đi với I viết am bằng m.',
              id: 'An berakhir dengan n dan merupakan kata lain; bentuk untuk I ditulis am dengan m.',
              tr: 'An n ile biter ve başka bir sözcüktür; I ile kullanılan biçim m ile am yazılır.',
              pl: 'An kończy się literą n i jest innym słowem; forma z I to am przez m.',
            }),
          },
          {
            value: 'm',
            reasonCode: 'am_form_missing_initial_a',
            trapType: 'orthographic',
            feedback: L({
              ru: 'm — одна конечная буква без a; связка для I пишется двумя буквами: am.',
              uk: 'm — одна кінцева літера без a; зв’язка для I пишеться двома літерами: am.',
              es: 'm es solo la letra final sin a; la unión para I se escribe con dos letras: am.',
              'pt-BR': 'm é apenas a letra final sem a; a ligação para I se escreve com duas letras: am.',
              vi: 'm chỉ là chữ cuối không có a; từ nối cho I phải viết đủ hai chữ: am.',
              id: 'm hanya huruf akhir tanpa a; penghubung untuk I ditulis lengkap dengan dua huruf: am.',
              tr: 'm başındaki a olmadan yalnız son harftir; I için bağlantı iki harfle am yazılır.',
              pl: 'm jest tylko końcową literą bez a; łącznik dla I zapisuje się dwiema literami: am.',
            }),
          },
        ],
      ),
    },
  },
  {
    id: 'e01-s01-word-here',
    target: 'here',
    meaning: L({
      ru: 'здесь',
      uk: 'тут',
      es: 'aquí',
      'pt-BR': 'aqui',
      vi: 'ở đây',
      id: 'di sini',
      tr: 'burada',
      pl: 'tutaj',
    }),
    features: ['adverb_place', 'proximal_location'],
    contacts: {
      recognize: contact(
        L({
          ru: 'Here начинается лёгким выдохом /h/ и звучит примерно /hɪr/. Произнесите его одним плавным движением.',
          uk: 'Here починається легким видихом /h/ і звучить приблизно /hɪr/. Вимовте його одним плавним рухом.',
          es: 'Here empieza con una suave salida de aire /h/ y suena aproximadamente /hɪr/. Dilo en un solo movimiento.',
          'pt-BR': 'Here começa com uma leve saída de ar /h/ e soa aproximadamente /hɪr/. Diga tudo em um movimento.',
          vi: 'Here bắt đầu bằng luồng hơi nhẹ /h/ và đọc gần như /hɪr/. Hãy nói liền trong một nhịp.',
          id: 'Here diawali hembusan ringan /h/ dan terdengar kira-kira /hɪr/. Ucapkan dalam satu gerakan lancar.',
          tr: 'Here hafif bir /h/ nefesiyle başlar ve yaklaşık /hɪr/ diye söylenir. Tek akışta çıkarın.',
          pl: 'Here zaczyna się lekkim wydechem /h/ i brzmi mniej więcej /hɪr/. Wypowiedz je jednym płynnym ruchem.',
        }),
        [
          {
            value: 'hair',
            reasonCode: 'here_recognize_hair_vowel',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Hair имеет более открытый звук /eə/ и означает «волосы»; here со звуком /ɪə/ означает «здесь».',
              uk: 'Hair має відкритіший звук /eə/ й означає «волосся»; here зі звуком /ɪə/ означає «тут».',
              es: 'Hair usa la vocal abierta /eə/ y significa «pelo»; here usa /ɪə/ y significa «aquí».',
              'pt-BR': 'Hair usa a vogal aberta /eə/ e significa «cabelo»; here usa /ɪə/ e significa «aqui».',
              vi: 'Hair có âm mở /eə/ và nghĩa là “tóc”; here có /ɪə/ và nghĩa là “ở đây”.',
              id: 'Hair memakai vokal terbuka /eə/ dan berarti “rambut”; here memakai /ɪə/ dan berarti “di sini”.',
              tr: 'Hair açık /eə/ sesiyle “saç” demektir; here /ɪə/ sesiyle “burada” demektir.',
              pl: 'Hair ma otwarte /eə/ i znaczy „włosy”; here ma /ɪə/ i znaczy „tutaj”.',
            }),
          },
          {
            value: 'he',
            reasonCode: 'here_recognize_he_long_i',
            trapType: 'phonetic',
            feedback: L({
              ru: 'He заканчивается долгим /iː/ и означает «он»; here имеет дополнительное окончание и означает «здесь».',
              uk: 'He закінчується довгим /iː/ й означає «він»; here має додатковий кінець і означає «тут».',
              es: 'He termina en /iː/ y significa «él»; here añade otro final y significa «aquí».',
              'pt-BR': 'He termina em /iː/ e significa «ele»; here tem outro final e significa «aqui».',
              vi: 'He kết thúc bằng /iː/ và nghĩa là “anh ấy”; here có phần cuối khác và nghĩa là “ở đây”.',
              id: 'He berakhir dengan /iː/ dan berarti “dia”; here memiliki akhir tambahan dan berarti “di sini”.',
              tr: 'He uzun /iː/ ile biter ve “o” demektir; here farklı bir sonla “burada” demektir.',
              pl: 'He kończy się długim /iː/ i znaczy „on”; here ma dodatkowe zakończenie i znaczy „tutaj”.',
            }),
          },
        ],
      ),
      retrieve_meaning: contact(
        L({
          ru: 'Here означает «здесь» — в том месте, где находится говорящий. Слово будто ставит маленькую метку прямо под ногами.',
          uk: 'Here означає «тут» — у місці, де перебуває мовець. Слово ніби ставить маленьку позначку просто під ногами.',
          es: 'Here significa «aquí», en el lugar donde está quien habla. Es como poner una pequeña marca bajo los pies.',
          'pt-BR': 'Here significa «aqui», no lugar onde está quem fala. É como colocar uma pequena marca sob os pés.',
          vi: 'Here có nghĩa là “ở đây”, tại nơi người nói đang đứng. Từ này giống như đặt một dấu nhỏ ngay dưới chân.',
          id: 'Here berarti “di sini”, di tempat penutur berada. Kata ini seperti memberi tanda kecil tepat di bawah kaki.',
          tr: 'Here, konuşanın bulunduğu yerde “burada” demektir. Sözcük sanki ayakların altına küçük bir işaret koyar.',
          pl: 'Here znaczy „tutaj”, w miejscu, w którym jest mówiący. To jak mały znacznik postawiony pod stopami.',
        }),
        [
          {
            value: 'there',
            reasonCode: 'here_meaning_there_distance',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'There означает «там»; для места рядом с говорящим нужно here — «здесь».',
              uk: 'There означає «там»; для місця біля мовця потрібне here — «тут».',
              es: 'There significa «allí»; para el lugar del hablante se usa here, «aquí».',
              'pt-BR': 'There significa «lá»; para o lugar do falante usa-se here, «aqui».',
              vi: 'There nghĩa là “ở đó”; nơi gần người nói dùng here, “ở đây”.',
              id: 'There berarti “di sana”; tempat penutur memakai here, “di sini”.',
              tr: 'There “orada” demektir; konuşanın yeri için here, yani “burada” gerekir.',
              pl: 'There znaczy „tam”; miejsce mówiącego określa here, czyli „tutaj”.',
            }),
          },
          {
            value: 'home',
            reasonCode: 'here_meaning_home_place_name',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Home означает «дом/дома»; нейтральное указание «здесь» передаёт here.',
              uk: 'Home означає «дім/удома»; нейтральне «тут» передає here.',
              es: 'Home significa «casa/en casa»; la indicación neutral «aquí» es here.',
              'pt-BR': 'Home significa «casa/em casa»; a indicação neutral «aqui» é here.',
              vi: 'Home nghĩa là “nhà/ở nhà”; chỉ “ở đây” nói chung là here.',
              id: 'Home berarti “rumah/di rumah”; penunjuk umum “di sini” adalah here.',
              tr: 'Home “ev/evde” demektir; genel “burada” anlamı here ile verilir.',
              pl: 'Home znaczy „dom/w domu”; neutralne „tutaj” to here.',
            }),
          },
        ],
      ),
      build_form: contact(
        L({
          ru: 'Here пишется четырьмя строчными буквами. В слове есть начало, середина и чёткое окончание — ничего не теряем.',
          uk: 'Here пишеться чотирма малими літерами. У слові є початок, середина й чітке закінчення — нічого не губимо.',
          es: 'Here se escribe con cuatro letras minúsculas. Tiene principio, centro y final: no dejes ninguna pieza atrás.',
          'pt-BR': 'Here se escreve com quatro letras minúsculas. Tem começo, meio e fim: nenhuma peça fica para trás.',
          vi: 'Here được viết bằng bốn chữ thường. Từ có đủ đầu, giữa và cuối, vì vậy đừng làm rơi mất phần nào.',
          id: 'Here ditulis dengan empat huruf kecil. Ada awal, tengah, dan akhir; jangan sampai ada bagian yang tertinggal.',
          tr: 'Here dört küçük harfle yazılır. Başı, ortası ve sonu vardır; hiçbir parçayı yolda bırakmayın.',
          pl: 'Here zapisuje się czterema małymi literami. Ma początek, środek i koniec — żadnego elementu nie zostawiamy.',
        }),
        [
          {
            value: 'hear',
            reasonCode: 'here_form_hear_homophone_meaning',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Hear пишется с ea и означает «слышать»; значение «здесь» пишется here.',
              uk: 'Hear пишеться з ea й означає «чути»; значення «тут» пишеться here.',
              es: 'Hear lleva ea y significa «oír»; «aquí» se escribe here.',
              'pt-BR': 'Hear leva ea e significa «ouvir»; «aqui» se escreve here.',
              vi: 'Hear có ea và nghĩa là “nghe”; “ở đây” viết là here.',
              id: 'Hear memakai ea dan berarti “mendengar”; “di sini” ditulis here.',
              tr: 'Hear ea ile yazılır ve “duymak” demektir; “burada” here yazılır.',
              pl: 'Hear ma ea i znaczy „słyszeć”; „tutaj” zapisuje się here.',
            }),
          },
          {
            value: 'her',
            reasonCode: 'here_form_her_missing_final_e',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Her без конечной e означает «её/ей»; слово «здесь» имеет форму here.',
              uk: 'Her без кінцевої e означає «її/їй»; слово «тут» має форму here.',
              es: 'Her sin e final significa «su/a ella»; «aquí» tiene la forma here.',
              'pt-BR': 'Her sem e final significa «dela/a ela»; «aqui» tem a forma here.',
              vi: 'Her thiếu e cuối và nghĩa là “cô ấy/của cô ấy”; “ở đây” là here.',
              id: 'Her tanpa e akhir berarti “dia/miliknya”; “di sini” adalah here.',
              tr: 'Sonunda e olmayan her “onu/onun” demektir; “burada” here biçimidir.',
              pl: 'Her bez końcowego e znaczy „ją/jej”; „tutaj” ma formę here.',
            }),
          },
        ],
      ),
    },
  },
  {
    id: 'e01-s01-word-ready',
    target: 'ready',
    meaning: L({
      ru: 'готов / готова',
      uk: 'готовий / готова',
      es: 'listo / lista',
      'pt-BR': 'pronto / pronta',
      vi: 'sẵn sàng',
      id: 'siap',
      tr: 'hazır',
      pl: 'gotowy / gotowa',
    }),
    features: ['state_adjective', 'readiness'],
    contacts: {
      recognize: contact(
        L({
          ru: 'Ready звучит /ˈredi/: ударение падает на начало, а короткий конец произносится легко.',
          uk: 'Ready звучить /ˈredi/: наголос падає на початок, а коротке закінчення вимовляється легко.',
          es: 'Ready suena /ˈredi/: el golpe de voz cae al principio y el final breve sale ligero.',
          'pt-BR': 'Ready soa /ˈredi/: a sílaba forte vem no começo e o final curto sai leve.',
          vi: 'Ready được đọc là /ˈredi/: trọng âm nằm ở đầu, còn phần cuối ngắn và nhẹ.',
          id: 'Ready berbunyi /ˈredi/: tekanannya ada di awal dan ujung pendeknya diucapkan ringan.',
          tr: 'Ready /ˈredi/ diye söylenir: vurgu baştadır, kısa son bölüm ise hafif çıkar.',
          pl: 'Ready brzmi /ˈredi/: akcent pada na początek, a krótkie zakończenie wymawia się lekko.',
        }),
        [
          {
            value: 'really',
            reasonCode: 'ready_recognize_really_medial_l',
            trapType: 'phonetic',
            feedback: L({
              ru: 'В really слышится /l/ и начальное /riː/; ready звучит /ˈredi/ без /l/.',
              uk: 'У really чути /l/ і початкове /riː/; ready звучить /ˈredi/ без /l/.',
              es: 'Really contiene /l/ y empieza /riː/; ready suena /ˈredi/ sin /l/.',
              'pt-BR': 'Really contém /l/ e começa /riː/; ready soa /ˈredi/ sem /l/.',
              vi: 'Really có /l/ và bắt đầu /riː/; ready đọc /ˈredi/ không có /l/.',
              id: 'Really mengandung /l/ dan diawali /riː/; ready berbunyi /ˈredi/ tanpa /l/.',
              tr: 'Really içinde /l/ ve başta /riː/ vardır; ready /l/ olmadan /ˈredi/ okunur.',
              pl: 'Really zawiera /l/ i zaczyna się /riː/; ready brzmi /ˈredi/ bez /l/.',
            }),
          },
          {
            value: 'reading',
            reasonCode: 'ready_recognize_reading_final_ing',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Reading имеет два слога с окончанием /-dɪŋ/; ready заканчивается коротким /-di/.',
              uk: 'Reading має два склади із закінченням /-dɪŋ/; ready закінчується коротким /-di/.',
              es: 'Reading termina en /-dɪŋ/; ready termina en el breve /-di/.',
              'pt-BR': 'Reading termina em /-dɪŋ/; ready termina no breve /-di/.',
              vi: 'Reading kết thúc bằng /-dɪŋ/; ready kết thúc ngắn bằng /-di/.',
              id: 'Reading berakhir dengan /-dɪŋ/; ready berakhir pendek dengan /-di/.',
              tr: 'Reading /-dɪŋ/ ile biter; ready kısa /-di/ ile biter.',
              pl: 'Reading kończy się /-dɪŋ/; ready ma krótkie zakończenie /-di/.',
            }),
          },
        ],
      ),
      retrieve_meaning: contact(
        L({
          ru: 'Ready означает «готов»: всё на месте и можно начинать. Это слово для момента перед стартом, когда осталось только кивнуть.',
          uk: 'Ready означає «готовий»: усе на місці й можна починати. Це слово для миті перед стартом, коли лишається тільки кивнути.',
          es: 'Ready significa «listo»: todo está preparado y se puede empezar. Es la palabra del instante justo antes de arrancar.',
          'pt-BR': 'Ready significa «pronto»: tudo está preparado e já dá para começar. É a palavra daquele instante antes da largada.',
          vi: 'Ready có nghĩa là “sẵn sàng”: mọi thứ đã ổn và có thể bắt đầu. Đây là từ dành cho khoảnh khắc ngay trước khi xuất phát.',
          id: 'Ready berarti “siap”: semuanya sudah beres dan kita bisa mulai. Inilah kata untuk sesaat sebelum berangkat.',
          tr: 'Ready “hazır” demektir: her şey yerindedir ve başlanabilir. Tam hareketten önce kullanılacak sözcüktür.',
          pl: 'Ready znaczy „gotowy”: wszystko jest na miejscu i można zaczynać. To słowo na chwilę tuż przed startem.',
        }),
        [
          {
            value: 'busy',
            reasonCode: 'ready_meaning_busy_state',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Busy означает «занят»; «готов и можно начинать» передаёт ready.',
              uk: 'Busy означає «зайнятий»; «готовий і можна починати» передає ready.',
              es: 'Busy significa «ocupado»; «preparado para empezar» es ready.',
              'pt-BR': 'Busy significa «ocupado»; «pronto para começar» é ready.',
              vi: 'Busy nghĩa là “bận”; “sẵn sàng để bắt đầu” là ready.',
              id: 'Busy berarti “sibuk”; “siap untuk mulai” adalah ready.',
              tr: 'Busy “meşgul” demektir; “başlamaya hazır” anlamı ready ile verilir.',
              pl: 'Busy znaczy „zajęty”; „gotowy, by zacząć” to ready.',
            }),
          },
          {
            value: 'tired',
            reasonCode: 'ready_meaning_tired_state',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Tired означает «устал»; состояние готовности выражает ready.',
              uk: 'Tired означає «втомлений»; стан готовності виражає ready.',
              es: 'Tired significa «cansado»; el estado de preparación se expresa con ready.',
              'pt-BR': 'Tired significa «cansado»; o estado de prontidão se expressa com ready.',
              vi: 'Tired nghĩa là “mệt”; trạng thái sẵn sàng là ready.',
              id: 'Tired berarti “lelah”; keadaan siap dinyatakan dengan ready.',
              tr: 'Tired “yorgun” demektir; hazır olma durumu ready ile anlatılır.',
              pl: 'Tired znaczy „zmęczony”; gotowość wyraża ready.',
            }),
          },
        ],
      ),
      build_form: contact(
        L({
          ru: 'Ready пишется пятью строчными буквами. Слово выглядит длиннее, чем звучит, поэтому собирайте его целиком, не на слух по кусочкам.',
          uk: 'Ready пишеться п’ятьма малими літерами. Слово виглядає довшим, ніж звучить, тому складайте його цілком, а не шматочками на слух.',
          es: 'Ready se escribe con cinco letras minúsculas. Parece más larga de lo que suena, así que constrúyela completa.',
          'pt-BR': 'Ready se escreve com cinco letras minúsculas. Parece maior no papel do que no ouvido, então monte a palavra inteira.',
          vi: 'Ready được viết bằng năm chữ thường. Từ này nhìn dài hơn khi nghe, vì vậy hãy ghép trọn vẹn thay vì đoán từng mảnh.',
          id: 'Ready ditulis dengan lima huruf kecil. Bentuknya tampak lebih panjang daripada bunyinya, jadi susunlah secara utuh.',
          tr: 'Ready beş küçük harfle yazılır. Görünüşü sesinden uzundur; bu yüzden sözcüğü parça parça değil, tam kurun.',
          pl: 'Ready zapisuje się pięcioma małymi literami. Wygląda dłużej, niż brzmi, więc składaj je w całości.',
        }),
        [
          {
            value: 'redy',
            reasonCode: 'ready_form_redy_missing_a',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Redy выглядит правдоподобно на слух, но теряет букву a; точная форма «готов» — ready.',
              uk: 'Redy виглядає правдоподібно на слух, але втрачає літеру a; точна форма «готовий» — ready.',
              es: 'Redy parece posible por el sonido, pero pierde la letra a; la forma exacta de «preparado» es ready.',
              'pt-BR': 'Redy parece possível pelo som, mas perde a letra a; a forma exata de «pronto» é ready.',
              vi: 'Redy trông hợp lý theo âm nhưng thiếu chữ a; dạng chính xác cho “sẵn sàng” là ready.',
              id: 'Redy tampak masuk akal dari bunyinya, tetapi kehilangan a; bentuk tepat untuk “siap” ialah ready.',
              tr: 'Redy sese göre mümkün görünür ama a harfini kaybeder; “hazır” için doğru biçim ready olur.',
              pl: 'Redy wygląda wiarygodnie ze słuchu, ale gubi literę a; dokładna forma „gotowy” to ready.',
            }),
          },
          {
            value: 'readdy',
            reasonCode: 'ready_form_readdy_double_d',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Readdy ошибочно удваивает d; в английской форме «готов» перед y стоит одна d: ready.',
              uk: 'Readdy помилково подвоює d; в англійській формі «готовий» перед y стоїть одна d: ready.',
              es: 'Readdy duplica la d por error; la forma inglesa de «preparado» lleva una sola d: ready.',
              'pt-BR': 'Readdy duplica o d por engano; a forma inglesa de «pronto» usa apenas um d: ready.',
              vi: 'Readdy thừa một chữ d; dạng tiếng Anh cho “sẵn sàng” chỉ có một d trước y: ready.',
              id: 'Readdy menggandakan d secara keliru; bentuk Inggris untuk “siap” hanya memakai satu d: ready.',
              tr: 'Readdy d harfini yanlışlıkla çiftler; İngilizce “hazır” biçiminde y önünde tek d vardır: ready.',
              pl: 'Readdy błędnie podwaja d; angielska forma „gotowy” ma przed y tylko jedno d: ready.',
            }),
          },
        ],
      ),
    },
  },
]);

type ContactStage = keyof SessionVocabularySourceV1['contacts'];
type Distractor = SessionVocabularyContactSourceV1['distractors'][number];

// Every row below is editor-authored. This table only keeps the third trap
// beside the original two so the source itself—not a late renderer fallback—
// owns the complete learning decision.
// зачем каст (2026-08-30): авторский литерал несёт trapType-строки шире
// сузившегося типа Distractor; строгую сверку контента держат editorial-гейты.
const THIRD_CONTACT_DISTRACTORS: Readonly<
  Record<string, Readonly<Record<ContactStage, Distractor>>>
> = <Readonly<Record<string, Readonly<Record<ContactStage, Distractor>>>>><unknown>Object.freeze({
  'e01-s01-word-i': Object.freeze({
    recognize: { value: 'Y', reasonCode: 'i_recognize_y_initial_glide', trapType: 'phonetic', feedback: L({
      ru: 'Y звучит /waɪ/: перед /aɪ/ слышится короткое /w/. В I звучит только /aɪ/.', uk: 'Y звучить /waɪ/: перед /aɪ/ чути коротке /w/. В I звучить лише /aɪ/.', es: 'Y suena /waɪ/, con una /w/ antes de /aɪ/. I suena solo /aɪ/.', 'pt-BR': 'Y soa /waɪ/, com /w/ antes de /aɪ/. I soa apenas /aɪ/.', vi: 'Y đọc /waɪ/, có /w/ trước /aɪ/. I chỉ đọc /aɪ/.', id: 'Y berbunyi /waɪ/, dengan /w/ sebelum /aɪ/. I hanya /aɪ/.', tr: 'Y /waɪ/ diye okunur; /aɪ/ önünde /w/ vardır. I yalnız /aɪ/ olur.', pl: 'Y brzmi /waɪ/, z /w/ przed /aɪ/. I brzmi tylko /aɪ/.',
    }) },
    retrieve_meaning: { value: 'you', reasonCode: 'i_meaning_you_other_person', trapType: 'grammar', feedback: L({
      ru: 'You — «ты/вы», то есть собеседник. Говорящий называет себя словом I — «я».', uk: 'You — «ти/ви», тобто співрозмовник. Мовець називає себе словом I — «я».', es: 'You señala a la otra persona. Para decir «yo», quien habla usa I.', 'pt-BR': 'You aponta para a outra pessoa. Para dizer «eu», quem fala usa I.', vi: 'You chỉ người nghe. Người nói dùng I để nói “tôi”.', id: 'You menunjuk lawan bicara. Penutur memakai I untuk “saya”.', tr: 'You karşıdaki kişiyi gösterir. Konuşan “ben” için I kullanır.', pl: 'You wskazuje rozmówcę. Mówiący używa I w znaczeniu „ja”.',
    }) },
    build_form: { value: '1', reasonCode: 'i_form_digit_one', trapType: 'orthographic', feedback: L({
      ru: '1 — цифра один. Английское «я» здесь пишется буквой I.', uk: '1 — цифра один. Англійське «я» тут пишеться літерою I.', es: '1 es el número uno. El «yo» inglés se escribe con la letra I.', 'pt-BR': '1 é o número um. O «eu» inglês se escreve com a letra I.', vi: '1 là số một. “Tôi” trong tiếng Anh được viết bằng chữ I.', id: '1 adalah angka satu. “Saya” dalam bahasa Inggris ditulis dengan huruf I.', tr: '1 bir rakamdır. İngilizce “ben” I harfiyle yazılır.', pl: '1 to cyfra jeden. Angielskie „ja” zapisuje się literą I.',
    }) },
  }),
  'e01-s01-word-am': Object.freeze({
    recognize: { value: "I'm", reasonCode: 'am_recognize_im_extra_i_sound', trapType: 'phonetic', feedback: L({
      ru: "I'm начинается с /aɪ/: сначала слышно I. В am сразу звучит /æm/.", uk: "I'm починається з /aɪ/: спочатку чути I. В am одразу звучить /æm/.", es: "I'm empieza con /aɪ/, donde se oye I. Am empieza directamente con /æm/.", 'pt-BR': "I'm começa com /aɪ/, onde se ouve I. Am começa direto com /æm/.", vi: "I'm mở đầu bằng /aɪ/, có âm I. Am đi thẳng vào /æm/.", id: "I'm diawali /aɪ/, jadi I terdengar. Am langsung berbunyi /æm/.", tr: "I'm /aɪ/ ile başlar ve I duyulur. Am doğrudan /æm/ olur.", pl: "I'm zaczyna się /aɪ/, więc słychać I. Am zaczyna się od razu /æm/.",
    }) },
    retrieve_meaning: { value: 'I', reasonCode: 'am_meaning_i_speaker_not_link', trapType: 'grammar', feedback: L({
      ru: 'I означает «я» и называет говорящего. Связку «есть / являюсь» передаёт am.', uk: 'I означає «я» й називає мовця. Зв’язку «є» передає am.', es: 'I significa «yo» y nombra a quien habla. La unión «soy/estoy» es am.', 'pt-BR': 'I significa «eu» e nomeia quem fala. A ligação «sou/estou» é am.', vi: 'I nghĩa là “tôi”; từ nối cần dùng trong câu này là am.', id: 'I berarti “saya”. Penghubung yang dicari adalah am.', tr: 'I “ben” demektir. Aranan bağlayıcı am olur.', pl: 'I znaczy „ja”. Szukanym łącznikiem jest am.',
    }) },
    build_form: { value: "I'm", reasonCode: 'am_form_contraction_not_standalone', trapType: 'grammar', feedback: L({
      ru: "I'm уже соединяет I и am. Когда нужен только второй элемент, пишется am.", uk: "I'm уже поєднує I та am. Коли потрібен лише другий елемент, пишеться am.", es: "I'm ya une I y am. Cuando se pide solo la segunda parte, se escribe am.", 'pt-BR': "I'm já junta I e am. Quando se pede só a segunda parte, escreve-se am.", vi: "I'm đã gộp I và am. Khi chỉ cần phần thứ hai, hãy viết am.", id: "I'm sudah menggabungkan I dan am. Jika hanya bagian kedua yang diminta, tulis am.", tr: "I'm, I ile am'i zaten birleştirir. Yalnız ikinci parça istenince am yazılır.", pl: "I'm już łączy I oraz am. Gdy potrzebna jest tylko druga część, piszemy am.",
    }) },
  }),
  'e01-s01-word-here': Object.freeze({
    recognize: { value: 'hero', reasonCode: 'here_recognize_hero_extra_syllable', trapType: 'phonetic', feedback: L({
      ru: 'Hero добавляет второй слог /roʊ/. Here заканчивается сразу после /hɪr/.', uk: 'Hero додає другий склад /roʊ/. Here закінчується одразу після /hɪr/.', es: 'Hero añade una segunda sílaba, /roʊ/. Here termina después de /hɪr/.', 'pt-BR': 'Hero acrescenta uma segunda sílaba, /roʊ/. Here termina depois de /hɪr/.', vi: 'Hero có thêm âm tiết /roʊ/. Here kết thúc ngay sau /hɪr/.', id: 'Hero memiliki suku kata tambahan /roʊ/. Here selesai setelah /hɪr/.', tr: 'Hero ek bir /roʊ/ hecesi taşır. Here /hɪr/ sonrasında biter.', pl: 'Hero dodaje sylabę /roʊ/. Here kończy się po /hɪr/.',
    }) },
    retrieve_meaning: { value: 'near', reasonCode: 'here_meaning_near_proximity_not_location', trapType: 'semantic_neighbor', feedback: L({
      ru: 'Near — «рядом» и обычно просит уточнить, рядом с чем. Самостоятельное «здесь» — here.', uk: 'Near — «поруч» і зазвичай просить уточнити, поруч із чим. Самостійне «тут» — here.', es: 'Near significa «cerca» y suele pedir cerca de qué. «Aquí» por sí solo es here.', 'pt-BR': 'Near significa «perto» e costuma pedir perto de quê. «Aqui» sozinho é here.', vi: 'Near nghĩa là “gần” và thường cần nói gần cái gì. “Ở đây” là here.', id: 'Near berarti “dekat” dan biasanya perlu objek. “Di sini” adalah here.', tr: 'Near “yakın” demektir ve genelde neye yakın olduğunu ister. “Burada” here olur.', pl: 'Near znaczy „blisko” i zwykle wymaga dopowiedzenia czego. „Tutaj” to here.',
    }) },
    build_form: { value: 'hire', reasonCode: 'here_form_hire_vowel_order', trapType: 'orthographic', feedback: L({
      ru: 'Hire меняет порядок гласных и означает «нанимать». Место «здесь» пишется here.', uk: 'Hire змінює порядок голосних і означає «наймати». Місце «тут» пишеться here.', es: 'Hire cambia el orden de las vocales y significa «contratar». «Aquí» se escribe here.', 'pt-BR': 'Hire muda a ordem das vogais e significa «contratar». «Aqui» se escreve here.', vi: 'Hire đổi thứ tự nguyên âm và nghĩa là “thuê”. “Ở đây” viết là here.', id: 'Hire menukar urutan vokal dan berarti “mempekerjakan”. “Di sini” ditulis here.', tr: 'Hire ünlülerin sırasını değiştirir ve “işe almak” demektir. “Burada” here yazılır.', pl: 'Hire zmienia kolejność samogłosek i znaczy „zatrudniać”. „Tutaj” zapisujemy here.',
    }) },
  }),
  'e01-s01-word-ready': Object.freeze({
    recognize: { value: 'already', reasonCode: 'ready_recognize_already_extra_opening', trapType: 'phonetic', feedback: L({
      ru: 'Already добавляет в начале /ɔːl/. В ready запись сразу начинается с /red-/.', uk: 'Already додає на початку /ɔːl/. У ready запис одразу починається з /red-/.', es: 'Already añade /ɔːl/ al principio. Ready empieza directamente por /red-/.', 'pt-BR': 'Already acrescenta /ɔːl/ no início. Ready começa direto por /red-/.', vi: 'Already thêm /ɔːl/ ở đầu. Ready bắt đầu ngay bằng /red-/.', id: 'Already menambahkan /ɔːl/ di awal. Ready langsung dimulai /red-/.', tr: 'Already başına /ɔːl/ ekler. Ready doğrudan /red-/ ile başlar.', pl: 'Already dodaje /ɔːl/ na początku. Ready zaczyna się od razu /red-/.',
    }) },
    retrieve_meaning: { value: 'waiting', reasonCode: 'ready_meaning_waiting_action_not_readiness', trapType: 'semantic_neighbor', feedback: L({
      ru: 'Waiting — «жду»: это действие ожидания. Ready означает, что уже можно начинать.', uk: 'Waiting — «чекаю»: це дія очікування. Ready означає, що вже можна починати.', es: 'Waiting es «esperando». Ready indica que ya se puede empezar.', 'pt-BR': 'Waiting é «esperando». Ready indica que já se pode começar.', vi: 'Waiting là “đang chờ”. Ready nghĩa là đã có thể bắt đầu.', id: 'Waiting berarti “sedang menunggu”. Ready berarti sudah bisa mulai.', tr: 'Waiting “bekliyor” demektir. Ready artık başlanabileceğini söyler.', pl: 'Waiting znaczy „czekam”. Ready mówi, że można już zaczynać.',
    }) },
    build_form: { value: 'read', reasonCode: 'ready_form_read_missing_y', trapType: 'orthographic', feedback: L({
      ru: 'Read заканчивается на d и означает «читать». Состояние «готов» пишется ready с y.', uk: 'Read закінчується на d й означає «читати». Стан «готовий» пишеться ready з y.', es: 'Read termina en d y significa «leer». El estado «listo» se escribe ready con y.', 'pt-BR': 'Read termina em d e significa «ler». O estado «pronto» se escreve ready com y.', vi: 'Read kết thúc bằng d và nghĩa là “đọc”. “Sẵn sàng” viết ready với y.', id: 'Read berakhir dengan d dan berarti “membaca”. “Siap” ditulis ready dengan y.', tr: 'Read d ile biter ve “okumak” demektir. “Hazır” ready diye y ile yazılır.', pl: 'Read kończy się na d i znaczy „czytać”. Stan „gotowy” zapisujemy ready z y.',
    }) },
  }),
});

export const EPISODE_01_SESSION_01_VOCABULARY_V1:
  readonly SessionVocabularySourceV1[] = Object.freeze(
  EPISODE_01_SESSION_01_VOCABULARY_BASE_V1.map((item) => {
    const third = THIRD_CONTACT_DISTRACTORS[item.id];
    if (!third) throw new Error(`session_01_third_contact_distractors_missing:${item.id}`);
    return Object.freeze({
      ...item,
      contacts: Object.freeze({
        recognize: Object.freeze({ ...item.contacts.recognize, distractors: Object.freeze([...item.contacts.recognize.distractors, third.recognize]) }),
        retrieve_meaning: Object.freeze({ ...item.contacts.retrieve_meaning, distractors: Object.freeze([...item.contacts.retrieve_meaning.distractors, third.retrieve_meaning]) }),
        build_form: Object.freeze({ ...item.contacts.build_form, distractors: Object.freeze([...item.contacts.build_form.distractors, third.build_form]) }),
      }),
    });
  }),
);
