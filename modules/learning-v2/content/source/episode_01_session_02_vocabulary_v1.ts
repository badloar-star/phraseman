import type {
  LocalizedSource,
  SessionVocabularyContactSourceV1,
  SessionVocabularySourceV1,
} from './session_shard_from_source_v1';
import { EPISODE_01_SESSION_02_THIRD_DISTRACTORS_V1 } from './episode_01_session_02_third_distractors_v1';

const L = (value: LocalizedSource): LocalizedSource => value;
const contact = (
  guidance: LocalizedSource,
  distractors: SessionVocabularyContactSourceV1['distractors'],
): SessionVocabularyContactSourceV1 => ({ guidance, distractors });

const EPISODE_01_SESSION_02_VOCABULARY_BASE_V1:
  readonly SessionVocabularySourceV1[] = Object.freeze([
  {
    id: 'e01-s02-word-happy', target: 'happy', features: ['feeling_adjective'],
    meaning: L({ ru: 'счастливый / радостный', uk: 'щасливий / радісний', es: 'feliz / contento', 'pt-BR': 'feliz / contente', vi: 'vui vẻ / hạnh phúc', id: 'senang / bahagia', tr: 'mutlu', pl: 'szczęśliwy / radosny' }),
    contacts: {
      recognize: contact(
        L({ ru: 'Happy значит «счастливый / радостный». Произносится /ˈhæpi/: ударение падает на первый слог, а конец звучит как короткое /i/.', uk: 'Happy означає «щасливий / радісний». Вимовляється /ˈhæpi/: наголос падає на перший склад, а в кінці чути коротке /i/.', es: 'Happy significa «feliz / contento». Se pronuncia /ˈhæpi/: la primera sílaba lleva el acento y el final suena como una /i/ breve.', 'pt-BR': 'Happy significa «feliz / contente». Pronuncia-se /ˈhæpi/: a primeira sílaba recebe o acento e o final soa como um /i/ breve.', vi: 'Happy có nghĩa là “vui vẻ / hạnh phúc”. Từ này được phát âm /ˈhæpi/: trọng âm ở âm tiết đầu và phần cuối là âm /i/ ngắn.', id: 'Happy berarti “senang / bahagia”. Pengucapannya /ˈhæpi/: tekanan ada pada suku kata pertama dan bagian akhir berbunyi /i/ pendek.', tr: 'Happy “mutlu” demektir. /ˈhæpi/ diye söylenir: vurgu ilk hecededir ve sonunda kısa bir /i/ duyulur.', pl: 'Happy znaczy „szczęśliwy / radosny”. Wymawia się /ˈhæpi/: akcent pada na pierwszą sylabę, a na końcu słychać krótkie /i/.' }),
        [
          { value: 'heavy', reasonCode: 'happy_recognize_heavy_middle_v', trapType: 'phonetic', feedback: L({ ru: 'Heavy означает «тяжёлый» и содержит звук /v/; в happy после /hæp/ сразу идёт короткое /i/.', uk: 'Heavy означає «важкий» і має звук /v/; у happy після /hæp/ одразу йде коротке /i/.', es: 'Heavy significa «pesado» y contiene /v/; happy pasa de /hæp/ directamente a una /i/ breve.', 'pt-BR': 'Heavy significa «pesado» e contém /v/; happy passa de /hæp/ direto para um /i/ breve.', vi: 'Heavy nghĩa là “nặng” và có âm /v/; happy đi từ /hæp/ thẳng sang âm /i/ ngắn.', id: 'Heavy berarti “berat” dan memiliki /v/; happy berpindah dari /hæp/ langsung ke /i/ pendek.', tr: 'Heavy “ağır” demektir ve /v/ sesi taşır; happy /hæp/ sonrasında doğrudan kısa /i/ ile biter.', pl: 'Heavy znaczy „ciężki” i zawiera /v/; happy przechodzi z /hæp/ od razu do krótkiego /i/.' }) },
          { value: 'happen', reasonCode: 'happy_recognize_happen_final_syllable', trapType: 'phonetic', feedback: L({ ru: 'Happen означает «происходить» и заканчивается без звука /i/; состояние радости звучит happy.', uk: 'Happen означає «відбуватися» й не закінчується звуком /i/; стан радості звучить happy.', es: 'Happen significa «ocurrir» y no termina en /i/; el estado de alegría se oye happy.', 'pt-BR': 'Happen significa «acontecer» e não termina em /i/; o estado de alegria soa happy.', vi: 'Happen nghĩa là “xảy ra” và không kết thúc bằng /i/; trạng thái vui là happy.', id: 'Happen berarti “terjadi” dan tidak berakhir dengan /i/; keadaan senang berbunyi happy.', tr: 'Happen “olmak/gerçekleşmek” demektir ve /i/ ile bitmez; mutluluk durumu happy diye duyulur.', pl: 'Happen znaczy „wydarzyć się” i nie kończy się /i/; stan radości brzmi happy.' }) },
        ],
      ),
      retrieve_meaning: contact(
        L({ ru: 'Happy называет радость. Sad — противоположное чувство, а fine лишь сообщает, что всё нормально.', uk: 'Happy називає радість. Sad — протилежне почуття, а fine лише повідомляє, що все гаразд.', es: 'Happy nombra la alegría. Sad expresa el sentimiento contrario y fine solo dice que todo está bien.', 'pt-BR': 'Happy nomeia a alegria. Sad expressa o sentimento oposto, e fine apenas diz que tudo está bem.', vi: 'Happy gọi tên niềm vui. Sad là cảm xúc ngược lại, còn fine chỉ nói rằng mọi thứ ổn.', id: 'Happy menamai rasa senang. Sad adalah perasaan sebaliknya, sedangkan fine hanya menyatakan keadaan baik.', tr: 'Happy sevinci adlandırır. Sad bunun karşıt duygusudur; fine ise yalnızca durumun iyi olduğunu söyler.', pl: 'Happy nazywa radość. Sad to uczucie przeciwne, a fine tylko mówi, że wszystko jest w porządku.' }),
        [
          { value: 'sad', reasonCode: 'happy_meaning_sad_opposite_feeling', trapType: 'semantic_neighbor', feedback: L({ ru: 'Sad относится к чувствам, но означает грусть; для радости нужно happy.', uk: 'Sad теж називає почуття, але означає смуток; для радості потрібне happy.', es: 'Sad también es un sentimiento, pero significa tristeza; la alegría corresponde a happy.', 'pt-BR': 'Sad também é um sentimento, mas significa tristeza; alegria corresponde a happy.', vi: 'Sad cũng là cảm xúc nhưng có nghĩa là buồn; vui phải là happy.', id: 'Sad juga merupakan perasaan, tetapi berarti sedih; rasa senang adalah happy.', tr: 'Sad de bir duygudur ama üzüntü demektir; sevinç için happy gerekir.', pl: 'Sad też nazywa uczucie, ale oznacza smutek; radość to happy.' }) },
          { value: 'fine', reasonCode: 'happy_meaning_fine_neutral_state', trapType: 'semantic_neighbor', feedback: L({ ru: 'Fine означает спокойное «нормально» и не обязательно радость; happy прямо называет радостное состояние.', uk: 'Fine означає спокійне «нормально» й не обов’язково радість; happy прямо називає радісний стан.', es: 'Fine indica que uno está bien, no necesariamente alegre; happy nombra directamente la alegría.', 'pt-BR': 'Fine indica que a pessoa está bem, não necessariamente alegre; happy nomeia a alegria.', vi: 'Fine chỉ trạng thái ổn, không nhất thiết vui; happy trực tiếp nói về niềm vui.', id: 'Fine menyatakan keadaan baik, tidak selalu senang; happy secara langsung menamai rasa gembira.', tr: 'Fine durumun normal olduğunu söyler, mutluluğu şart koşmaz; happy doğrudan sevinci adlandırır.', pl: 'Fine mówi, że jest w porządku, niekoniecznie radośnie; happy wprost nazywa radość.' }) },
        ],
      ),
      build_form: contact(
        L({ ru: 'Happy пишется h-a-p-p-y: две p удерживают середину, а y завершает слово. Happen меняет конец, heavy заменяет pp звуком и буквой v.', uk: 'Happy пишеться h-a-p-p-y: дві p тримають середину, а y завершує слово. Happen змінює кінець, heavy замінює pp літерою й звуком v.', es: 'Happy se escribe h-a-p-p-y: las dos p sostienen el centro y la y cierra la palabra. Happen cambia el final y heavy introduce v.', 'pt-BR': 'Happy se escreve h-a-p-p-y: dois p ficam no centro e y fecha a palavra. Happen muda o final e heavy introduz v.', vi: 'Happy được viết h-a-p-p-y: hai chữ p nằm ở giữa và y kết thúc từ. Happen đổi phần cuối, còn heavy đưa v vào giữa.', id: 'Happy ditulis h-a-p-p-y: dua p berada di tengah dan y menutup kata. Happen mengubah akhir, sedangkan heavy memasukkan v.', tr: 'Happy h-a-p-p-y yazılır: ortada iki p vardır ve sözcük y ile biter. Happen sonu değiştirir, heavy ise v harfi getirir.', pl: 'Happy zapisuje się h-a-p-p-y: w środku są dwa p, a słowo kończy y. Happen zmienia koniec, a heavy wprowadza v.' }),
        [
          { value: 'happen', reasonCode: 'happy_form_happen_wrong_ending', trapType: 'orthographic', feedback: L({ ru: 'Happen заканчивается -en и означает «происходить»; состояние радости пишется с -y: happy.', uk: 'Happen закінчується на -en і означає «відбуватися»; стан радості пишеться з -y: happy.', es: 'Happen termina en -en y significa «ocurrir»; el estado alegre termina en -y: happy.', 'pt-BR': 'Happen termina em -en e significa «acontecer»; o estado alegre termina em -y: happy.', vi: 'Happen kết thúc bằng -en và nghĩa là “xảy ra”; trạng thái vui kết thúc bằng -y: happy.', id: 'Happen berakhir -en dan berarti “terjadi”; keadaan senang berakhir -y: happy.', tr: 'Happen -en ile biter ve “gerçekleşmek” demektir; mutlu durum -y ile yazılır: happy.', pl: 'Happen kończy się -en i znaczy „wydarzyć się”; radosny stan kończy się -y: happy.' }) },
          { value: 'heavy', reasonCode: 'happy_form_heavy_middle_v', trapType: 'orthographic', feedback: L({ ru: 'Heavy содержит v и означает «тяжёлый»; в happy середину образуют две p.', uk: 'Heavy містить v й означає «важкий»; у happy середину утворюють дві p.', es: 'Heavy contiene v y significa «pesado»; happy lleva dos p en el centro.', 'pt-BR': 'Heavy contém v e significa «pesado»; happy leva dois p no centro.', vi: 'Heavy có v và nghĩa là “nặng”; happy có hai chữ p ở giữa.', id: 'Heavy memiliki v dan berarti “berat”; happy memakai dua p di tengah.', tr: 'Heavy v taşır ve “ağır” demektir; happy ortada iki p ile yazılır.', pl: 'Heavy zawiera v i znaczy „ciężki”; happy ma w środku dwa p.' }) },
        ],
      ),
    },
  },
  {
    id: 'e01-s02-word-sad', target: 'sad', features: ['feeling_adjective'],
    meaning: L({ ru: 'грустный', uk: 'сумний', es: 'triste', 'pt-BR': 'triste', vi: 'buồn', id: 'sedih', tr: 'üzgün', pl: 'smutny' }),
    contacts: {
      recognize: contact(
        L({ ru: 'Sad значит «грустный». Произносится /sæd/: это один короткий слог с открытым /æ/ и отчётливым /d/ в конце.', uk: 'Sad означає «сумний». Вимовляється /sæd/: це один короткий склад із відкритим /æ/ та чітким /d/ у кінці.', es: 'Sad significa «triste». Se pronuncia /sæd/: es una sola sílaba breve, con una /æ/ abierta y una /d/ clara al final.', 'pt-BR': 'Sad significa «triste». Pronuncia-se /sæd/: é uma única sílaba curta, com /æ/ aberto e /d/ claro no final.', vi: 'Sad có nghĩa là “buồn”. Từ này được phát âm /sæd/: chỉ có một âm tiết ngắn, với âm /æ/ mở và âm /d/ rõ ở cuối.', id: 'Sad berarti “sedih”. Pengucapannya /sæd/: satu suku kata pendek, dengan /æ/ terbuka dan /d/ yang jelas di akhir.', tr: 'Sad “üzgün” demektir. /sæd/ diye söylenir: açık /æ/ ve sonda belirgin /d/ bulunan tek, kısa bir hecedir.', pl: 'Sad znaczy „smutny”. Wymawia się /sæd/: to jedna krótka sylaba z otwartym /æ/ i wyraźnym /d/ na końcu.' }),
        [
          { value: 'said', reasonCode: 'sad_recognize_said_vowel_e', trapType: 'phonetic', feedback: L({ ru: 'Said означает «сказал» и звучит с /e/; в sad слышна более открытая /æ/.', uk: 'Said означає «сказав» і звучить із /e/; у sad чути відкритіший /æ/.', es: 'Said significa «dijo» y suena con /e/; sad contiene una /æ/ más abierta.', 'pt-BR': 'Said significa «disse» e soa com /e/; sad contém um /æ/ mais aberto.', vi: 'Said nghĩa là “đã nói” và có âm /e/; sad có âm /æ/ mở hơn.', id: 'Said berarti “mengatakan” dalam bentuk lampau dan memakai /e/; sad memakai /æ/ yang lebih terbuka.', tr: 'Said “söyledi” demektir ve /e/ ile duyulur; sad daha açık /æ/ taşır.', pl: 'Said znaczy „powiedział” i ma /e/; sad zawiera bardziej otwarte /æ/.' }) },
          { value: 'sat', reasonCode: 'sad_recognize_sat_final_t', trapType: 'phonetic', feedback: L({ ru: 'Sat означает «сидел» и заканчивается /t/; sad закрывается звонким /d/.', uk: 'Sat означає «сидів» і закінчується /t/; sad завершується дзвінким /d/.', es: 'Sat significa «se sentó» y termina en /t/; sad se cierra con /d/.', 'pt-BR': 'Sat significa «sentou» e termina em /t/; sad fecha com /d/.', vi: 'Sat nghĩa là “đã ngồi” và kết thúc bằng /t/; sad khép lại bằng /d/.', id: 'Sat berarti “duduk” dalam bentuk lampau dan berakhir /t/; sad ditutup /d/.', tr: 'Sat “oturdu” demektir ve /t/ ile biter; sad /d/ ile kapanır.', pl: 'Sat znaczy „siedział” i kończy się /t/; sad zamyka /d/.' }) },
          { value: 'sand', reasonCode: 'sad_recognize_sand_extra_n', trapType: 'phonetic', feedback: L({ ru: 'Sand означает «песок»: перед /d/ слышно дополнительное /n/. В sad после /æ/ сразу звучит /d/.', uk: 'Sand означає «пісок»: перед /d/ чути додаткове /n/. У sad після /æ/ одразу звучить /d/.', es: 'Sand significa «arena»: antes de /d/ se oye una /n/ extra. En sad, /d/ llega justo después de /æ/.', 'pt-BR': 'Sand significa «areia»: há um /n/ extra antes de /d/. Em sad, /d/ vem logo após /æ/.', vi: 'Sand nghĩa là “cát”: có thêm âm /n/ trước /d/. Trong sad, /d/ đến ngay sau /æ/.', id: 'Sand berarti “pasir”: ada bunyi /n/ tambahan sebelum /d/. Pada sad, /d/ langsung mengikuti /æ/.', tr: 'Sand “kum” demektir: /d/ öncesinde fazladan /n/ duyulur. Sad içinde /æ/ sesini doğrudan /d/ izler.', pl: 'Sand znaczy „piasek”: przed /d/ słychać dodatkowe /n/. W sad po /æ/ od razu pojawia się /d/.' }) },
        ],
      ),
      retrieve_meaning: contact(
        L({ ru: 'Sad означает грусть. Happy называет противоположную радость, а tired говорит не о настроении, а о нехватке сил.', uk: 'Sad означає смуток. Happy називає протилежну радість, а tired говорить не про настрій, а про брак сил.', es: 'Sad significa tristeza. Happy nombra la alegría contraria y tired habla de falta de energía, no del ánimo.', 'pt-BR': 'Sad significa tristeza. Happy nomeia a alegria oposta, e tired fala de falta de energia, não de humor.', vi: 'Sad nghĩa là buồn. Happy là niềm vui ngược lại, còn tired nói về thiếu sức chứ không phải tâm trạng.', id: 'Sad berarti sedih. Happy menamai rasa senang yang berlawanan, sedangkan tired menunjukkan kekurangan tenaga.', tr: 'Sad üzüntü demektir. Happy karşıt sevinci adlandırır; tired ise ruh hâlinden çok enerji eksikliğini söyler.', pl: 'Sad oznacza smutek. Happy nazywa przeciwną radość, a tired mówi o braku sił, nie o nastroju.' }),
        [
          { value: 'happy', reasonCode: 'sad_meaning_happy_opposite', trapType: 'semantic_neighbor', feedback: L({ ru: 'Happy тоже чувство, но противоположное: радость. Грусть передаёт sad.', uk: 'Happy теж називає почуття, але протилежне — радість. Смуток передає sad.', es: 'Happy también es un sentimiento, pero el opuesto: alegría. La tristeza es sad.', 'pt-BR': 'Happy também é um sentimento, mas o oposto: alegria. Tristeza é sad.', vi: 'Happy cũng là cảm xúc nhưng trái nghĩa: vui. Buồn là sad.', id: 'Happy juga perasaan, tetapi kebalikannya: senang. Sedih adalah sad.', tr: 'Happy de bir duygudur ama karşıtı olan sevinci anlatır. Üzüntü sad ile söylenir.', pl: 'Happy też nazywa uczucie, lecz przeciwne: radość. Smutek to sad.' }) },
          { value: 'tired', reasonCode: 'sad_meaning_tired_energy_not_mood', trapType: 'semantic_neighbor', feedback: L({ ru: 'Tired означает усталость и нехватку сил; sad называет именно грустное настроение.', uk: 'Tired означає втому й брак сил; sad називає саме сумний настрій.', es: 'Tired significa cansancio y falta de energía; sad nombra el ánimo triste.', 'pt-BR': 'Tired significa cansaço e falta de energia; sad nomeia o humor triste.', vi: 'Tired nghĩa là mệt và thiếu sức; sad gọi đúng tâm trạng buồn.', id: 'Tired berarti lelah dan kekurangan tenaga; sad menamai suasana hati sedih.', tr: 'Tired yorgunluk ve enerji eksikliğidir; sad doğrudan üzgün ruh hâlini anlatır.', pl: 'Tired oznacza zmęczenie i brak sił; sad nazywa smutny nastrój.' }) },
        ],
      ),
      build_form: contact(
        L({ ru: 'Sad пишется s-a-d. Said добавляет i и меняет гласную, а sat заменяет конечную d на t.', uk: 'Sad пишеться s-a-d. Said додає i й змінює голосний, а sat замінює кінцеву d на t.', es: 'Sad se escribe s-a-d. Said añade i y cambia la vocal; sat sustituye la d final por t.', 'pt-BR': 'Sad se escreve s-a-d. Said acrescenta i e muda a vogal; sat troca o d final por t.', vi: 'Sad được viết s-a-d. Said thêm i và đổi nguyên âm; sat thay d cuối bằng t.', id: 'Sad ditulis s-a-d. Said menambah i dan mengubah vokal; sat mengganti d terakhir dengan t.', tr: 'Sad s-a-d yazılır. Said i ekleyip ünlüyü değiştirir; sat ise sondaki d yerine t getirir.', pl: 'Sad zapisuje się s-a-d. Said dodaje i i zmienia samogłoskę, a sat zastępuje końcowe d literą t.' }),
        [
          { value: 'said', reasonCode: 'sad_form_said_extra_i', trapType: 'orthographic', feedback: L({ ru: 'Said содержит лишнюю i и означает «сказал»; состояние грусти пишется коротко: sad.', uk: 'Said містить зайву i й означає «сказав»; стан смутку пишеться коротко: sad.', es: 'Said contiene una i adicional y significa «dijo»; el estado triste se escribe sad.', 'pt-BR': 'Said contém um i extra e significa «disse»; o estado triste se escreve sad.', vi: 'Said có thêm i và nghĩa là “đã nói”; trạng thái buồn được viết sad.', id: 'Said memiliki i tambahan dan berarti “mengatakan” dalam bentuk lampau; keadaan sedih ditulis sad.', tr: 'Said fazladan i taşır ve “söyledi” demektir; üzgün durum sad yazılır.', pl: 'Said ma dodatkowe i i znaczy „powiedział”; smutny stan zapisuje się sad.' }) },
          { value: 'sat', reasonCode: 'sad_form_sat_final_t', trapType: 'orthographic', feedback: L({ ru: 'Sat заканчивается t и означает «сидел»; sad заканчивается d и называет грусть.', uk: 'Sat закінчується t й означає «сидів»; sad закінчується d та називає смуток.', es: 'Sat termina en t y significa «se sentó»; sad termina en d y nombra tristeza.', 'pt-BR': 'Sat termina em t e significa «sentou»; sad termina em d e nomeia tristeza.', vi: 'Sat kết thúc bằng t và nghĩa là “đã ngồi”; sad kết thúc bằng d và có nghĩa là buồn.', id: 'Sat berakhir t dan berarti “duduk” dalam bentuk lampau; sad berakhir d dan berarti sedih.', tr: 'Sat t ile biter ve “oturdu” demektir; sad d ile biter ve üzüntüyü anlatır.', pl: 'Sat kończy się t i znaczy „siedział”; sad kończy się d i nazywa smutek.' }) },
        ],
      ),
    },
  },
  {
    id: 'e01-s02-word-tired', target: 'tired', features: ['feeling_adjective'],
    meaning: L({ ru: 'уставший', uk: 'втомлений', es: 'cansado', 'pt-BR': 'cansado', vi: 'mệt', id: 'lelah', tr: 'yorgun', pl: 'zmęczony' }),
    contacts: {
      recognize: contact(
        L({ ru: 'Tired значит «уставший». Произносится /ˈtaɪərd/: ударение слышно в начале, а слово завершается звуком /d/.', uk: 'Tired означає «втомлений». Вимовляється /ˈtaɪərd/: наголос чути на початку, а слово завершується звуком /d/.', es: 'Tired significa «cansado». Se pronuncia /ˈtaɪərd/: el acento se oye al principio y la palabra termina con el sonido /d/.', 'pt-BR': 'Tired significa «cansado». Pronuncia-se /ˈtaɪərd/: o acento fica no início e a palavra termina com o som /d/.', vi: 'Tired có nghĩa là “mệt”. Từ này được phát âm /ˈtaɪərd/: trọng âm nằm ở đầu và từ kết thúc bằng âm /d/.', id: 'Tired berarti “lelah”. Pengucapannya /ˈtaɪərd/: tekanan terdengar di awal dan kata berakhir dengan bunyi /d/.', tr: 'Tired “yorgun” demektir. /ˈtaɪərd/ diye söylenir: vurgu baştadır ve sözcük /d/ sesiyle biter.', pl: 'Tired znaczy „zmęczony”. Wymawia się /ˈtaɪərd/: akcent słychać na początku, a słowo kończy się dźwiękiem /d/.' }),
        [
          { value: 'tried', reasonCode: 'tired_recognize_tried_initial_cluster', trapType: 'phonetic', feedback: L({ ru: 'Tried означает «попробовал» и начинаетcя сочетанием /tr/; в tired после /t/ сразу слышен гласный.', uk: 'Tried означає «спробував» і починається сполукою /tr/; у tired після /t/ одразу чути голосний.', es: 'Tried significa «intentó» y empieza con el grupo /tr/; tired coloca la vocal justo después de /t/.', 'pt-BR': 'Tried significa «tentou» e começa com o grupo /tr/; tired coloca a vogal logo depois de /t/.', vi: 'Tried nghĩa là “đã thử” và bắt đầu bằng cụm /tr/; tired có nguyên âm ngay sau /t/.', id: 'Tried berarti “mencoba” dalam bentuk lampau dan dimulai /tr/; tired menempatkan vokal langsung setelah /t/.', tr: 'Tried “denedi” demektir ve /tr/ ile başlar; tired içinde /t/ sonrasında hemen ünlü gelir.', pl: 'Tried znaczy „spróbował” i zaczyna się grupą /tr/; w tired po /t/ od razu słychać samogłoskę.' }) },
          { value: 'tiered', reasonCode: 'tired_recognize_tiered_first_vowel', trapType: 'phonetic', feedback: L({ ru: 'Tiered означает «многоуровневый» и начинается звуком, близким к «тир»; усталость начинается /taɪ/: tired.', uk: 'Tiered означає «багаторівневий» і починається звуком, близьким до «тір»; втома починається /taɪ/: tired.', es: 'Tiered significa «escalonado» y empieza con un sonido cercano a «tir»; cansancio empieza /taɪ/: tired.', 'pt-BR': 'Tiered significa «em níveis» e começa com som próximo de «tir»; cansaço começa /taɪ/: tired.', vi: 'Tiered nghĩa là “nhiều tầng” và bắt đầu gần âm “tir”; trạng thái mệt bắt đầu bằng /taɪ/: tired.', id: 'Tiered berarti “bertingkat” dan dimulai dengan bunyi dekat “tir”; lelah dimulai /taɪ/: tired.', tr: 'Tiered “katmanlı” demektir ve “tir” benzeri sesle başlar; yorgunluk /taɪ/ ile başlar: tired.', pl: 'Tiered znaczy „wielopoziomowy” i zaczyna się dźwiękiem bliskim „tir”; zmęczenie zaczyna /taɪ/: tired.' }) },
        ],
      ),
      retrieve_meaning: contact(
        L({ ru: 'Tired означает нехватку сил. Ready говорит о готовности, а fine — о нормальном самочувствии.', uk: 'Tired означає брак сил. Ready говорить про готовність, а fine — про нормальне самопочуття.', es: 'Tired significa falta de energía. Ready habla de preparación y fine de estar bien.', 'pt-BR': 'Tired significa falta de energia. Ready fala de prontidão e fine de estar bem.', vi: 'Tired nghĩa là thiếu sức. Ready nói về sẵn sàng, còn fine nói rằng vẫn ổn.', id: 'Tired berarti kekurangan tenaga. Ready berbicara tentang kesiapan dan fine tentang keadaan baik.', tr: 'Tired enerji eksikliğidir. Ready hazır olmayı, fine ise durumun iyi olmasını anlatır.', pl: 'Tired oznacza brak sił. Ready mówi o gotowości, a fine o dobrym samopoczuciu.' }),
        [
          { value: 'ready', reasonCode: 'tired_meaning_ready_preparation', trapType: 'semantic_neighbor', feedback: L({ ru: 'Ready означает «готов», то есть можно начинать; tired говорит, что сил мало.', uk: 'Ready означає «готовий», тобто можна починати; tired говорить, що сил мало.', es: 'Ready significa «listo para empezar»; tired indica que falta energía.', 'pt-BR': 'Ready significa «pronto para começar»; tired indica falta de energia.', vi: 'Ready nghĩa là sẵn sàng bắt đầu; tired nói rằng đang thiếu sức.', id: 'Ready berarti siap memulai; tired menyatakan tenaga sedang berkurang.', tr: 'Ready başlamaya hazır olmayı anlatır; tired enerjinin az olduğunu söyler.', pl: 'Ready znaczy „gotowy do rozpoczęcia”; tired mówi o braku energii.' }) },
          { value: 'fine', reasonCode: 'tired_meaning_fine_okay_state', trapType: 'semantic_neighbor', feedback: L({ ru: 'Fine означает «нормально» и не сообщает об усталости; нехватку сил называет tired.', uk: 'Fine означає «нормально» й не повідомляє про втому; брак сил називає tired.', es: 'Fine significa «bien» y no comunica cansancio; la falta de energía es tired.', 'pt-BR': 'Fine significa «bem» e não comunica cansaço; falta de energia é tired.', vi: 'Fine nghĩa là ổn và không nói về mệt; thiếu sức là tired.', id: 'Fine berarti baik-baik saja dan tidak menyatakan lelah; kekurangan tenaga adalah tired.', tr: 'Fine “iyiyim” anlamındadır ve yorgunluk bildirmez; enerji eksikliği tired ile anlatılır.', pl: 'Fine znaczy „w porządku” i nie mówi o zmęczeniu; brak sił to tired.' }) },
        ],
      ),
      build_form: contact(
        L({ ru: 'Tired пишется t-i-r-e-d. В tried буквы r и i меняются местами, а tiered вставляет лишнюю e после i.', uk: 'Tired пишеться t-i-r-e-d. У tried літери r та i міняються місцями, а tiered вставляє зайву e після i.', es: 'Tired se escribe t-i-r-e-d. Tried intercambia r e i; tiered añade una e después de i.', 'pt-BR': 'Tired se escreve t-i-r-e-d. Tried troca r e i; tiered acrescenta e depois de i.', vi: 'Tired được viết t-i-r-e-d. Tried đổi chỗ r và i; tiered thêm e sau i.', id: 'Tired ditulis t-i-r-e-d. Tried menukar r dan i; tiered menambah e setelah i.', tr: 'Tired t-i-r-e-d yazılır. Tried r ile i harflerinin yerini değiştirir; tiered i sonrasında fazladan e ekler.', pl: 'Tired zapisuje się t-i-r-e-d. Tried zamienia r z i, a tiered dodaje e po i.' }),
        [
          { value: 'tried', reasonCode: 'tired_form_tried_ri_order', trapType: 'orthographic', feedback: L({ ru: 'Tried ставит r перед i и означает «попробовал»; в tired порядок t-i-r сохраняет значение усталости.', uk: 'Tried ставить r перед i й означає «спробував»; у tired порядок t-i-r зберігає значення втоми.', es: 'Tried pone r antes de i y significa «intentó»; tired mantiene t-i-r para el cansancio.', 'pt-BR': 'Tried põe r antes de i e significa «tentou»; tired mantém t-i-r para cansaço.', vi: 'Tried đặt r trước i và nghĩa là “đã thử”; tired giữ thứ tự t-i-r để chỉ mệt.', id: 'Tried menempatkan r sebelum i dan berarti “mencoba”; tired mempertahankan t-i-r untuk keadaan lelah.', tr: 'Tried r harfini i önüne alır ve “denedi” demektir; yorgunluk için tired t-i-r sırasını korur.', pl: 'Tried stawia r przed i i znaczy „spróbował”; tired zachowuje t-i-r dla zmęczenia.' }) },
          { value: 'tiered', reasonCode: 'tired_form_tiered_extra_e', trapType: 'orthographic', feedback: L({ ru: 'Tiered добавляет e и означает «многоуровневый»; состояние усталости пишется без этой e: tired.', uk: 'Tiered додає e й означає «багаторівневий»; стан втоми пишеться без цієї e: tired.', es: 'Tiered añade e y significa «escalonado»; el cansancio se escribe sin esa e: tired.', 'pt-BR': 'Tiered acrescenta e e significa «em níveis»; cansaço se escreve sem esse e: tired.', vi: 'Tiered thêm e và nghĩa là “nhiều tầng”; trạng thái mệt không có e đó: tired.', id: 'Tiered menambah e dan berarti “bertingkat”; keadaan lelah ditulis tanpa e itu: tired.', tr: 'Tiered e ekler ve “katmanlı” demektir; yorgun durum bu e olmadan tired yazılır.', pl: 'Tiered dodaje e i znaczy „wielopoziomowy”; zmęczenie zapisuje się bez tego e: tired.' }) },
        ],
      ),
    },
  },
  {
    id: 'e01-s02-word-fine', target: 'fine', features: ['feeling_adjective'],
    meaning: L({ ru: 'нормально / хорошо', uk: 'нормально / добре', es: 'bien', 'pt-BR': 'bem', vi: 'ổn', id: 'baik-baik saja', tr: 'iyi', pl: 'w porządku / dobrze' }),
    contacts: {
      recognize: contact(
        L({ ru: 'Fine значит «нормально / хорошо». Произносится /faɪn/: это один слог, который заканчивается ясным звуком /n/.', uk: 'Fine означає «нормально / добре». Вимовляється /faɪn/: це один склад, який завершується чітким звуком /n/.', es: 'Fine significa «bien». Se pronuncia /faɪn/: es una sola sílaba que termina con un sonido /n/ claro.', 'pt-BR': 'Fine significa «bem». Pronuncia-se /faɪn/: é uma única sílaba que termina com um som /n/ claro.', vi: 'Fine có nghĩa là “ổn”. Từ này được phát âm /faɪn/: chỉ có một âm tiết và kết thúc bằng âm /n/ rõ.', id: 'Fine berarti “baik-baik saja”. Pengucapannya /faɪn/: satu suku kata yang berakhir dengan bunyi /n/ yang jelas.', tr: 'Fine “iyi” demektir. /faɪn/ diye söylenir: tek hecedir ve sonunda belirgin bir /n/ sesi vardır.', pl: 'Fine znaczy „w porządku / dobrze”. Wymawia się /faɪn/: to jedna sylaba zakończona wyraźnym dźwiękiem /n/.' }),
        [
          { value: 'find', reasonCode: 'fine_recognize_find_final_d', trapType: 'phonetic', feedback: L({ ru: 'Find означает «найти» и после /n/ добавляет /d/; fine заканчивается прямо на /n/.', uk: 'Find означає «знайти» й після /n/ додає /d/; fine закінчується одразу на /n/.', es: 'Find significa «encontrar» y añade /d/ después de /n/; fine termina directamente en /n/.', 'pt-BR': 'Find significa «encontrar» e acrescenta /d/ depois de /n/; fine termina diretamente em /n/.', vi: 'Find nghĩa là “tìm thấy” và thêm /d/ sau /n/; fine kết thúc ngay ở /n/.', id: 'Find berarti “menemukan” dan menambah /d/ setelah /n/; fine berhenti pada /n/.', tr: 'Find “bulmak” demektir ve /n/ sonrasına /d/ ekler; fine doğrudan /n/ ile biter.', pl: 'Find znaczy „znaleźć” i dodaje /d/ po /n/; fine kończy się bezpośrednio na /n/.' }) },
          { value: 'five', reasonCode: 'fine_recognize_five_middle_v', trapType: 'phonetic', feedback: L({ ru: 'Five означает «пять» и содержит /v/; в fine середину образует /n/.', uk: 'Five означає «п’ять» і містить /v/; у fine всередині чути /n/.', es: 'Five significa «cinco» y contiene /v/; fine lleva /n/.', 'pt-BR': 'Five significa «cinco» e contém /v/; fine leva /n/.', vi: 'Five nghĩa là “năm” và có /v/; fine có /n/.', id: 'Five berarti “lima” dan memiliki /v/; fine memakai /n/.', tr: 'Five “beş” demektir ve /v/ taşır; fine içinde /n/ vardır.', pl: 'Five znaczy „pięć” i zawiera /v/; fine ma /n/.' }) },
          { value: 'line', reasonCode: 'fine_recognize_line_initial_l', trapType: 'phonetic', feedback: L({ ru: 'Line означает «линия» и начинается с /l/. В fine тот же хвост /aɪn/, но первый звук — /f/.', uk: 'Line означає «лінія» й починається з /l/. У fine той самий хвіст /aɪn/, але перший звук — /f/.', es: 'Line significa «línea» y empieza con /l/. Fine comparte el final /aɪn/, pero empieza con /f/.', 'pt-BR': 'Line significa «linha» e começa com /l/. Fine tem o mesmo final /aɪn/, mas começa com /f/.', vi: 'Line nghĩa là “đường” và bắt đầu bằng /l/. Fine có cùng đuôi /aɪn/ nhưng bắt đầu bằng /f/.', id: 'Line berarti “garis” dan dimulai dengan /l/. Fine memiliki akhir /aɪn/ yang sama, tetapi dimulai dengan /f/.', tr: 'Line “çizgi” demektir ve /l/ ile başlar. Fine aynı /aɪn/ sonunu taşır ama /f/ ile başlar.', pl: 'Line znaczy „linia” i zaczyna się od /l/. Fine ma ten sam koniec /aɪn/, lecz zaczyna się od /f/.' }) },
        ],
      ),
      retrieve_meaning: contact(
        L({ ru: 'Fine — спокойный ответ «нормально». Tired сообщает об усталости, а sad — о грусти.', uk: 'Fine — спокійна відповідь «нормально». Tired повідомляє про втому, а sad — про смуток.', es: 'Fine es una respuesta tranquila: «bien». Tired comunica cansancio y sad tristeza.', 'pt-BR': 'Fine é uma resposta tranquila: «bem». Tired comunica cansaço, e sad tristeza.', vi: 'Fine là câu trả lời bình thản rằng vẫn ổn. Tired nói mệt, còn sad nói buồn.', id: 'Fine adalah jawaban tenang bahwa keadaan baik. Tired menyatakan lelah dan sad menyatakan sedih.', tr: 'Fine sakin bir “iyiyim” cevabıdır. Tired yorgunluğu, sad ise üzüntüyü bildirir.', pl: 'Fine to spokojna odpowiedź „w porządku”. Tired mówi o zmęczeniu, a sad o smutku.' }),
        [
          { value: 'tired', reasonCode: 'fine_meaning_tired_low_energy', trapType: 'semantic_neighbor', feedback: L({ ru: 'Tired означает «устал» и прямо говорит о нехватке сил; нейтральное «нормально» — fine.', uk: 'Tired означає «втомився» й прямо говорить про брак сил; нейтральне «нормально» — fine.', es: 'Tired significa «cansado» y expresa falta de energía; el neutral «bien» es fine.', 'pt-BR': 'Tired significa «cansado» e expressa falta de energia; o neutro «bem» é fine.', vi: 'Tired nghĩa là mệt và thiếu sức; câu “ổn” trung tính là fine.', id: 'Tired berarti lelah dan kekurangan tenaga; jawaban netral “baik” adalah fine.', tr: 'Tired “yorgunum” diyerek enerji eksikliğini bildirir; nötr “iyiyim” cevabı fine olur.', pl: 'Tired znaczy „zmęczony” i mówi o braku sił; neutralne „w porządku” to fine.' }) },
          { value: 'sad', reasonCode: 'fine_meaning_sad_negative_mood', trapType: 'semantic_neighbor', feedback: L({ ru: 'Sad означает грусть, а fine не называет отрицательного чувства — только сообщает, что всё нормально.', uk: 'Sad означає смуток, а fine не називає негативного почуття — лише повідомляє, що все нормально.', es: 'Sad significa tristeza; fine no nombra un sentimiento negativo, solo dice que todo está bien.', 'pt-BR': 'Sad significa tristeza; fine não nomeia sentimento negativo, apenas diz que tudo está bem.', vi: 'Sad nghĩa là buồn; fine không gọi tên cảm xúc tiêu cực mà chỉ nói mọi thứ ổn.', id: 'Sad berarti sedih; fine tidak menamai perasaan negatif, hanya menyatakan keadaan baik.', tr: 'Sad üzüntüyü anlatır; fine olumsuz bir duygu değil, yalnızca durumun iyi olduğunu söyler.', pl: 'Sad oznacza smutek; fine nie nazywa negatywnego uczucia, tylko mówi, że wszystko jest w porządku.' }) },
        ],
      ),
      build_form: contact(
        L({ ru: 'Fine пишется f-i-n-e. Find заменяет конечную e на d, а five заменяет n на v.', uk: 'Fine пишеться f-i-n-e. Find замінює кінцеву e на d, а five замінює n на v.', es: 'Fine se escribe f-i-n-e. Find cambia la e final por d y five cambia n por v.', 'pt-BR': 'Fine se escreve f-i-n-e. Find troca o e final por d, e five troca n por v.', vi: 'Fine được viết f-i-n-e. Find đổi e cuối thành d, còn five đổi n thành v.', id: 'Fine ditulis f-i-n-e. Find mengganti e terakhir dengan d, sedangkan five mengganti n dengan v.', tr: 'Fine f-i-n-e yazılır. Find sondaki e yerine d getirir; five ise n yerine v kullanır.', pl: 'Fine zapisuje się f-i-n-e. Find zastępuje końcowe e literą d, a five zastępuje n literą v.' }),
        [
          { value: 'find', reasonCode: 'fine_form_find_final_d', trapType: 'orthographic', feedback: L({ ru: 'Find заканчивается d и означает «найти»; ответ «нормально» заканчивается e: fine.', uk: 'Find закінчується d й означає «знайти»; відповідь «нормально» закінчується e: fine.', es: 'Find termina en d y significa «encontrar»; la respuesta «bien» termina en e: fine.', 'pt-BR': 'Find termina em d e significa «encontrar»; a resposta «bem» termina em e: fine.', vi: 'Find kết thúc bằng d và nghĩa là “tìm thấy”; câu “ổn” kết thúc bằng e: fine.', id: 'Find berakhir d dan berarti “menemukan”; jawaban “baik” berakhir e: fine.', tr: 'Find d ile biter ve “bulmak” demektir; “iyiyim” cevabı e ile biter: fine.', pl: 'Find kończy się d i znaczy „znaleźć”; odpowiedź „w porządku” kończy się e: fine.' }) },
          { value: 'five', reasonCode: 'fine_form_five_middle_v', trapType: 'orthographic', feedback: L({ ru: 'Five содержит v и означает «пять»; в fine третья буква n.', uk: 'Five містить v й означає «п’ять»; у fine третя літера n.', es: 'Five contiene v y significa «cinco»; en fine la tercera letra es n.', 'pt-BR': 'Five contém v e significa «cinco»; em fine a terceira letra é n.', vi: 'Five có v và nghĩa là “năm”; trong fine chữ thứ ba là n.', id: 'Five memiliki v dan berarti “lima”; pada fine huruf ketiga adalah n.', tr: 'Five v taşır ve “beş” demektir; fine içinde üçüncü harf n olur.', pl: 'Five zawiera v i znaczy „pięć”; w fine trzecią literą jest n.' }) },
        ],
      ),
    },
  },
]);

// Ручная редактура по Библии текстов 2026-08-28. Здесь нет шаблонной
// подстановки: каждое слово, учебное действие и каждая locale имеют собственный
// короткий текст. Ловушки называются только после выбора — в feedback выше.
const TEXT_BIBLE_GUIDANCE_BY_TARGET_V1: Readonly<Record<string, Readonly<{
  recognize: LocalizedSource;
  retrieve_meaning: LocalizedSource;
  build_form: LocalizedSource;
}>>> = Object.freeze({
  happy: {
    recognize: L({
      ru: 'Happy значит «счастливый, радостный». Слушайте /ˈhæpi/: ударение в начале, а короткое /i/ в конце будто улыбается.',
      uk: 'Happy означає «щасливий, радісний». Слухайте /ˈhæpi/: наголос на початку, а коротке /i/ наприкінці ніби усміхається.',
      es: 'Happy significa «feliz, contento». Escucha /ˈhæpi/: el golpe cae al principio y la /i/ breve del final parece sonreír.',
      'pt-BR': 'Happy significa «feliz, contente». Ouça /ˈhæpi/: a força cai no início e o /i/ curto do final parece sorrir.',
      vi: 'Happy nghĩa là “vui vẻ, hạnh phúc”. Hãy nghe /ˈhæpi/: nhấn ở đầu, còn âm /i/ ngắn cuối từ nghe như đang mỉm cười.',
      id: 'Happy berarti “senang, bahagia”. Dengarkan /ˈhæpi/: tekanan ada di awal, lalu /i/ pendek di akhir terdengar seperti senyum.',
      tr: 'Happy “mutlu, sevinçli” demektir. /ˈhæpi/ sesinde vurgu baştadır; sondaki kısa /i/ sanki gülümser.',
      pl: 'Happy znaczy „szczęśliwy, radosny”. Posłuchaj /ˈhæpi/: akcent jest na początku, a krótkie /i/ na końcu brzmi jak uśmiech.',
    }),
    retrieve_meaning: L({
      ru: 'Happy называет ясную радость — ту самую, когда улыбка появляется раньше слов.',
      uk: 'Happy називає справжню радість — ту, коли усмішка з’являється раніше за слова.',
      es: 'Happy nombra una alegría clara: esa en la que la sonrisa llega antes que las palabras.',
      'pt-BR': 'Happy nomeia uma alegria clara: aquela em que o sorriso chega antes das palavras.',
      vi: 'Happy gọi tên niềm vui rõ ràng — kiểu vui khiến nụ cười đến trước lời nói.',
      id: 'Happy menamai rasa senang yang jelas—jenis perasaan saat senyum datang sebelum kata-kata.',
      tr: 'Happy açık bir sevinci anlatır; hani gülümseme sözlerden önce gelir ya, işte onu.',
      pl: 'Happy nazywa wyraźną radość — taką, gdy uśmiech pojawia się przed słowami.',
    }),
    build_form: L({
      ru: 'Happy пишется h-a-p-p-y: две p стоят в середине, y закрывает слово. Две p — будто радость пришла не одна.',
      uk: 'Happy пишеться h-a-p-p-y: дві p стоять посередині, y закриває слово. Дві p — ніби радість прийшла не сама.',
      es: 'Happy se escribe h-a-p-p-y: dos p en el centro y una y al final. La alegría, por lo visto, vino acompañada.',
      'pt-BR': 'Happy se escreve h-a-p-p-y: dois p no meio e y no final. Pelo visto, a alegria chegou acompanhada.',
      vi: 'Happy được viết h-a-p-p-y: hai chữ p ở giữa, y đứng cuối. Niềm vui này xem ra không đi một mình.',
      id: 'Happy ditulis h-a-p-p-y: dua p di tengah dan y di akhir. Rupanya rasa senang datang bersama teman.',
      tr: 'Happy h-a-p-p-y yazılır: ortada iki p, sonda y vardır. Sevinç belli ki yalnız gelmemiş.',
      pl: 'Happy zapisuje się h-a-p-p-y: dwa p w środku, y na końcu. Radość najwyraźniej nie przyszła sama.',
    }),
  },
  sad: {
    recognize: L({
      ru: 'Sad значит «грустный». Это короткое /sæd/ с ясным /d/ в конце — слово маленькое, настроение в нём поместилось целиком.',
      uk: 'Sad означає «сумний». Це коротке /sæd/ із чітким /d/ наприкінці — слово мале, а настрій умістився весь.',
      es: 'Sad significa «triste». Es un /sæd/ breve con una /d/ clara al final: palabra pequeña, emoción completa.',
      'pt-BR': 'Sad significa «triste». É um /sæd/ curto com /d/ claro no final: palavra pequena, sentimento inteiro.',
      vi: 'Sad nghĩa là “buồn”. Âm /sæd/ ngắn, kết thúc bằng /d/ rõ: từ bé mà chứa trọn một tâm trạng.',
      id: 'Sad berarti “sedih”. Bunyi /sæd/ pendek dan berakhir dengan /d/ yang jelas: kata kecil, perasaan lengkap.',
      tr: 'Sad “üzgün” demektir. Kısa /sæd/ sonunda belirgin /d/ taşır: sözcük küçük, duygu eksiksiz.',
      pl: 'Sad znaczy „smutny”. Krótkie /sæd/ kończy wyraźne /d/: małe słowo, a mieści cały nastrój.',
    }),
    retrieve_meaning: L({
      ru: 'Sad — это грусть: настроение, когда улыбка решила взять выходной.',
      uk: 'Sad — це смуток: настрій, коли усмішка вирішила взяти вихідний.',
      es: 'Sad es tristeza: el estado de ánimo en el que la sonrisa decidió tomarse el día libre.',
      'pt-BR': 'Sad é tristeza: o estado em que o sorriso resolveu tirar o dia de folga.',
      vi: 'Sad là buồn — tâm trạng khi nụ cười quyết định xin nghỉ một ngày.',
      id: 'Sad adalah sedih—perasaan saat senyum memutuskan mengambil hari libur.',
      tr: 'Sad üzüntüdür; gülümsemenin bir günlüğüne izin aldığı ruh hâli.',
      pl: 'Sad oznacza smutek — nastrój, w którym uśmiech zrobił sobie dzień wolny.',
    }),
    build_form: L({
      ru: 'Sad пишется s-a-d: всего три буквы. Грусть здесь без длинной речи — она и так всё сказала.',
      uk: 'Sad пишеться s-a-d: лише три літери. Смуток тут без довгої промови — він і так усе сказав.',
      es: 'Sad se escribe s-a-d: solo tres letras. La tristeza no da un discurso largo; ya dijo bastante.',
      'pt-BR': 'Sad se escreve s-a-d: só três letras. A tristeza dispensa discurso longo; já disse o bastante.',
      vi: 'Sad được viết s-a-d: chỉ ba chữ cái. Nỗi buồn không cần diễn văn dài, vậy là đủ hiểu rồi.',
      id: 'Sad ditulis s-a-d: hanya tiga huruf. Kesedihan tidak perlu pidato panjang; pesannya sudah sampai.',
      tr: 'Sad s-a-d yazılır: yalnızca üç harf. Üzüntü uzun konuşmaz; mesaj zaten alınmıştır.',
      pl: 'Sad zapisuje się s-a-d: tylko trzy litery. Smutek nie potrzebuje długiej przemowy — już wszystko powiedział.',
    }),
  },
  tired: {
    recognize: L({
      ru: 'Tired значит «уставший». В /ˈtaɪərd/ ударение падает в начало, а само слово тянется — почти как тот, кто его произносит.',
      uk: 'Tired означає «втомлений». У /ˈtaɪərd/ наголос падає на початок, а саме слово тягнеться — майже як той, хто його каже.',
      es: 'Tired significa «cansado». En /ˈtaɪərd/ la fuerza cae al principio y la palabra se estira, casi como quien la dice.',
      'pt-BR': 'Tired significa «cansado». Em /ˈtaɪərd/ a força cai no início e a palavra se alonga, quase como quem a diz.',
      vi: 'Tired nghĩa là “mệt”. Trong /ˈtaɪərd/, trọng âm ở đầu và từ kéo dài ra — gần giống người đang nói nó.',
      id: 'Tired berarti “lelah”. Pada /ˈtaɪərd/, tekanan ada di awal dan katanya memanjang—mirip orang yang mengucapkannya.',
      tr: 'Tired “yorgun” demektir. /ˈtaɪərd/ başta vurgulanır ve uzar; neredeyse söyleyen kişi gibi.',
      pl: 'Tired znaczy „zmęczony”. W /ˈtaɪərd/ akcent pada na początek, a słowo się ciągnie — prawie jak osoba, która je mówi.',
    }),
    retrieve_meaning: L({
      ru: 'Tired сообщает, что сил мало. Даже батарейка внутри будто просит зарядку.',
      uk: 'Tired повідомляє, що сил мало. Навіть внутрішня батарейка ніби просить заряджання.',
      es: 'Tired dice que queda poca energía. Hasta la batería interior parece pedir un cargador.',
      'pt-BR': 'Tired diz que resta pouca energia. Até a bateria interna parece pedir um carregador.',
      vi: 'Tired nói rằng đã gần hết sức. Cục pin bên trong dường như cũng đang đòi sạc.',
      id: 'Tired menyatakan tenaga tinggal sedikit. Baterai di dalam diri seolah meminta pengisi daya.',
      tr: 'Tired enerjinin azaldığını söyler. İçerideki pil bile şarj aleti arıyor gibidir.',
      pl: 'Tired mówi, że zostało mało sił. Nawet wewnętrzna bateria jakby prosiła o ładowarkę.',
    }),
    build_form: L({
      ru: 'Tired пишется t-i-r-e-d. Пять букв дошли до финиша — последняя d ещё держится бодрее остальных.',
      uk: 'Tired пишеться t-i-r-e-d. П’ять літер дійшли до фінішу — остання d ще тримається бадьоріше за інших.',
      es: 'Tired se escribe t-i-r-e-d. Cinco letras llegan a la meta; la d final aún parece más despierta que las demás.',
      'pt-BR': 'Tired se escreve t-i-r-e-d. Cinco letras chegam ao fim; o d final ainda parece mais acordado que as outras.',
      vi: 'Tired được viết t-i-r-e-d. Năm chữ cái về tới đích; chữ d cuối còn có vẻ tỉnh hơn cả.',
      id: 'Tired ditulis t-i-r-e-d. Lima huruf mencapai garis akhir; d terakhir masih tampak paling segar.',
      tr: 'Tired t-i-r-e-d yazılır. Beş harf bitişe ulaşır; sondaki d hâlâ diğerlerinden daha dinç görünür.',
      pl: 'Tired zapisuje się t-i-r-e-d. Pięć liter dotarło do mety; końcowe d wygląda jeszcze najprzytomniej.',
    }),
  },
  fine: {
    recognize: L({
      ru: 'Fine значит «нормально, хорошо». Это один слог /faɪn/ с ясным /n/ в конце — короткий ответ без лишней драмы.',
      uk: 'Fine означає «нормально, добре». Це один склад /faɪn/ із чітким /n/ наприкінці — коротка відповідь без зайвої драми.',
      es: 'Fine significa «bien». Es una sola sílaba, /faɪn/, con una /n/ clara al final: respuesta breve y sin drama.',
      'pt-BR': 'Fine significa «bem». É uma sílaba, /faɪn/, com /n/ claro no final: resposta curta e sem drama.',
      vi: 'Fine nghĩa là “ổn, tốt”. Đây là một âm tiết /faɪn/ với /n/ rõ ở cuối — câu trả lời ngắn, không cần kịch tính.',
      id: 'Fine berarti “baik-baik saja”. Bunyi /faɪn/ hanya satu suku kata dengan /n/ jelas di akhir—jawaban singkat tanpa drama.',
      tr: 'Fine “iyi, normal” demektir. Tek heceli /faɪn/ sonunda belirgin /n/ taşır: kısa cevap, gereksiz drama yok.',
      pl: 'Fine znaczy „w porządku, dobrze”. To jedna sylaba /faɪn/ z wyraźnym /n/ na końcu — krótka odpowiedź bez dramatu.',
    }),
    retrieve_meaning: L({
      ru: 'Fine — спокойное «всё нормально». Не фейерверк, не катастрофа: день просто держится молодцом.',
      uk: 'Fine — спокійне «усе нормально». Не феєрверк і не катастрофа: день просто тримається молодцем.',
      es: 'Fine es un tranquilo «todo bien». Ni fuegos artificiales ni desastre: el día simplemente se porta bien.',
      'pt-BR': 'Fine é um tranquilo «tudo bem». Nem fogos de artifício nem desastre: o dia apenas segue direitinho.',
      vi: 'Fine là một câu “mọi thứ ổn” rất bình thản. Không pháo hoa, không thảm họa: ngày vẫn chạy ngon lành.',
      id: 'Fine adalah “semuanya baik” yang tenang. Bukan pesta kembang api atau bencana: hari berjalan sebagaimana mestinya.',
      tr: 'Fine sakin bir “her şey yolunda” demektir. Ne havai fişek ne felaket; gün usulca işini yapıyor.',
      pl: 'Fine to spokojne „wszystko w porządku”. Bez fajerwerków i katastrofy: dzień po prostu daje radę.',
    }),
    build_form: L({
      ru: 'Fine пишется f-i-n-e. Четыре буквы выстроились ровно — всё действительно fine.',
      uk: 'Fine пишеться f-i-n-e. Чотири літери стали рівно — усе справді fine.',
      es: 'Fine se escribe f-i-n-e. Cuatro letras bien ordenadas: todo está, literalmente, fine.',
      'pt-BR': 'Fine se escreve f-i-n-e. Quatro letras bem alinhadas: está tudo, literalmente, fine.',
      vi: 'Fine được viết f-i-n-e. Bốn chữ cái xếp ngay ngắn — mọi thứ đúng là fine.',
      id: 'Fine ditulis f-i-n-e. Empat huruf berbaris rapi—semuanya memang fine.',
      tr: 'Fine f-i-n-e yazılır. Dört harf düzgünce sıralanır; her şey gerçekten fine.',
      pl: 'Fine zapisuje się f-i-n-e. Cztery litery stoją równo — wszystko naprawdę jest fine.',
    }),
  },
});

export const EPISODE_01_SESSION_02_VOCABULARY_V1:
  readonly SessionVocabularySourceV1[] = Object.freeze(
  EPISODE_01_SESSION_02_VOCABULARY_BASE_V1.map((entry) => {
    const guidance = TEXT_BIBLE_GUIDANCE_BY_TARGET_V1[entry.target];
    if (!guidance) throw new Error(`session_02_text_bible_guidance_missing:${entry.target}`);
    return Object.freeze({
      ...entry,
      contacts: Object.freeze({
        recognize: Object.freeze({
          ...entry.contacts.recognize,
          guidance: guidance.recognize,
          distractors: Object.freeze([
            ...entry.contacts.recognize.distractors,
            ...(EPISODE_01_SESSION_02_THIRD_DISTRACTORS_V1[entry.target]?.recognize
              ? [EPISODE_01_SESSION_02_THIRD_DISTRACTORS_V1[entry.target]!.recognize!]
              : []),
          ]),
        }),
        retrieve_meaning: Object.freeze({
          ...entry.contacts.retrieve_meaning,
          guidance: guidance.retrieve_meaning,
          distractors: Object.freeze([
            ...entry.contacts.retrieve_meaning.distractors,
            ...(EPISODE_01_SESSION_02_THIRD_DISTRACTORS_V1[entry.target]?.retrieve_meaning
              ? [EPISODE_01_SESSION_02_THIRD_DISTRACTORS_V1[entry.target]!.retrieve_meaning!]
              : []),
          ]),
        }),
        build_form: Object.freeze({
          ...entry.contacts.build_form,
          guidance: guidance.build_form,
          distractors: Object.freeze([
            ...entry.contacts.build_form.distractors,
            ...(EPISODE_01_SESSION_02_THIRD_DISTRACTORS_V1[entry.target]?.build_form
              ? [EPISODE_01_SESSION_02_THIRD_DISTRACTORS_V1[entry.target]!.build_form!]
              : []),
          ]),
        }),
      }),
    });
  }),
);
