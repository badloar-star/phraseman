import type {
  LocalizedSource,
  SessionVocabularyContactSourceV1,
  SessionVocabularySourceV1,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-28, карта сессий es_episode_01_session_map_v1.ts,
// сессия 34 "Одинаковое и разное" / comparison_basic_adjective, builtOn: [33],
// recalls: [4, 33]): единственное word-first слово — diferente, «другой,
// отличающийся». Проверено grep по всему испанскому корпусу — diferente ни
// разу не встречалось как испанский target (все совпадения строки
// "diferente" в корпусе — слово ПОРТУГАЛЬСКОГО объяснения "diferente"
// ("different") внутри pt-BR-текста, не испанская лексика). Слово
// действительно новое.
//
// зачем НЕ igual (было бы прямее для "одинаковое"): igual уже введено в
// сессии 14 (es_episode_01_session_14_phrases_v1.ts, category
// 'invariable-adjective') с ЗАКРЕПЛЁННЫМ значением «всё равно, без разницы»
// (реакция безразличия, распаковано в контрасте с de acuerdo) — НЕ «то же
// самое / идентичное». Переопределять его здесь как «одинаковый» в смысле
// сравнения значило бы молча менять уже выученное значение слова — прямое
// нарушение правила "не упоминать то, чего нет" в обратную сторону (учить
// заново то, что уже выучено иначе). Поэтому здесь igual используется
// СТРОГО в своём прежнем значении «всё равно» как естественный смысловой
// партнёр нового антонима: "Es diferente" (это другое) звучит рядом с уже
// знакомым "Es igual" (это всё равно) — тема сессии "Одинаковое и разное"
// раскрывается через diferente (новое) против igual (recall), а не через
// новое значение igual.
//
// Diferente — НЕИЗМЕНЯЕМОЕ прилагательное (не -o/-a, а -e для обоих родов),
// тот же класс, что fácil (сессия 1) и igual (сессия 14): единственная и
// множественная формы — diferente/diferentes, без родовой пары. Это НЕ то
// же самое согласование, что bueno/malo (сессия 33, -o/-a) — сознательно
// расширяет уже известный курсу параллельный класс инвариантных признаков,
// а не превращает diferente в признак с родом, которого у него нет.
const L = (value: LocalizedSource): LocalizedSource => value;

const contact = (
  guidance: LocalizedSource,
  distractors: SessionVocabularyContactSourceV1['distractors'],
): SessionVocabularyContactSourceV1 => ({ guidance, distractors });

export const ES_EPISODE_01_SESSION_34_VOCABULARY_V1:
  readonly SessionVocabularySourceV1[] = Object.freeze([
  {
    id: 'es-e01-s34-word-diferente',
    target: 'diferente',
    meaning: L({
      ru: 'другой, отличающийся — не меняется по роду',
      uk: 'інший, відмінний — не змінюється за родом',
      es: 'different — invariable by gender',
      'pt-BR': 'different — invariable by gender',
      vi: 'different — invariable by gender',
      id: 'different — invariable by gender',
      tr: 'different — invariable by gender',
      pl: 'different — invariable by gender',
    }),
    features: ['comparison_basic_adjective', 'invariable_adjective'],
    contacts: {
      recognize: contact(
        L({
          ru: 'Diferente звучит с ударением на третий слог — di-fe-REN-te, четыре слога. Начинается на «ди», не на «де» — короткая i, а не e.',
          uk: 'Diferente звучить з наголосом на третій склад — di-fe-REN-te, чотири склади. Починається на «ді», не на «де» — коротка i, а не e.',
          es: 'Diferente has four syllables with stress on the third — di-fe-REN-te. It starts with "di", not "de" — a short i, not an e.',
          'pt-BR': 'Diferente tem quatro sílabas com acento na terceira — di-fe-REN-te. Começa com "di", não "de" — um i curto, não um e.',
          vi: 'Diferente có bốn âm tiết, trọng âm rơi vào âm thứ ba — di-fe-REN-te. Bắt đầu bằng "di", không phải "de" — nguyên âm i ngắn, không phải e.',
          id: 'Diferente memiliki empat suku kata dengan tekanan pada suku kata ketiga — di-fe-REN-te. Dimulai dengan "di", bukan "de" — i pendek, bukan e.',
          tr: 'Diferente dört hecelidir ve vurgu üçüncü hecededir — di-fe-REN-te. "De" değil "di" ile başlar — kısa bir i, e değil.',
          pl: 'Diferente ma cztery sylaby z akcentem na trzeciej — di-fe-REN-te. Zaczyna się na "di", nie "de" — krótkie i, nie e.',
        }),
        [
          {
            value: 'deferente',
            reasonCode: 'diferente_recognize_deferente_wrong_vowel',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Deferente начинается с «де» — другой гласный звук в начале. Нужное слово начинается с «ди»: diferente.',
              uk: 'Deferente починається з «де» — інший голосний звук на початку. Потрібне слово починається з «ді»: diferente.',
              es: 'Deferente starts with "de" — a different vowel sound at the start. The needed word starts with "di": diferente.',
              'pt-BR': 'Deferente começa com "de" — um som de vogal diferente no início. A palavra necessária começa com "di": diferente.',
              vi: 'Deferente bắt đầu bằng "de" — một âm nguyên âm khác ở đầu. Từ cần dùng bắt đầu bằng "di": diferente.',
              id: 'Deferente dimulai dengan "de" — bunyi vokal yang berbeda di awal. Kata yang diperlukan dimulai dengan "di": diferente.',
              tr: 'Deferente "de" ile başlar — başta farklı bir ünlü sesi. Gereken kelime "di" ile başlar: diferente.',
              pl: 'Deferente zaczyna się na "de" — inny dźwięk samogłoski na początku. Potrzebne słowo zaczyna się na "di": diferente.',
            }),
          },
          {
            value: 'diferrente',
            reasonCode: 'diferente_recognize_double_r_typo',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Diferrente с удвоенным -rr- звучал бы и писался бы иначе — испанское rr произносится сильнее, чем одиночное r. Нужна форма с одним r: diferente.',
              uk: 'Diferrente з подвоєним -rr- звучав би і писався б інакше — іспанське rr вимовляється сильніше за одиночне r. Потрібна форма з одним r: diferente.',
              es: 'Diferrente with a doubled -rr- would sound and be spelled differently — Spanish rr is pronounced stronger than a single r. The needed form has one r: diferente.',
              'pt-BR': 'Diferrente com -rr- dobrado soaria e se escreveria diferente — o rr espanhol é pronunciado mais forte que um r simples. A forma necessária tem um r: diferente.',
              vi: 'Diferrente với -rr- nhân đôi sẽ phát âm và viết khác — rr tiếng Tây Ban Nha được phát âm mạnh hơn r đơn. Dạng cần có một r: diferente.',
              id: 'Diferrente dengan -rr- ganda tidak benar — rr Spanyol diucapkan lebih kuat. Bentuk yang benar: diferente, satu r.',
              tr: 'Diferrente, ikili -rr- ile farklı okunur ve yazılırdı — İspanyolca rr, tek r\'den daha güçlü telaffuz edilir. Gereken biçim tek r ile: diferente.',
              pl: 'Diferrente z podwojonym -rr- brzmi inaczej — hiszpańskie rr jest mocniejsze niż pojedyncze r. Poprawna forma: diferente, jedno r.',
            }),
          },
        ],
      ),
      retrieve_meaning: contact(
        L({
          ru: 'Diferente — это ПРИЗНАК сравнения: «другой», не такой, как что-то ещё. Не про качество (хорошо/плохо), а про несовпадение.',
          uk: 'Diferente — це ОЗНАКА порівняння: «інший», не такий, як щось інше. Не про якість (добре/погано), а про невідповідність.',
          es: 'Diferente is a COMPARISON quality: "different," not the same as something else. Not about quality (good/bad), but about mismatch.',
          'pt-BR': 'Diferente é uma qualidade de COMPARAÇÃO: "diferente", não igual a outra coisa. Não é sobre qualidade (bom/ruim), mas sobre não coincidir.',
          vi: 'Diferente là một đặc điểm SO SÁNH: "khác", không giống thứ khác. Không phải về chất lượng (tốt/xấu), mà về sự không trùng khớp.',
          id: 'Diferente adalah sifat PERBANDINGAN: "berbeda", tidak sama dengan yang lain. Bukan tentang kualitas (baik/buruk), melainkan tentang ketidakcocokan.',
          tr: 'Diferente bir KARŞILAŞTIRMA niteliğidir: "farklı", başka bir şeyle aynı değil. Kalite (iyi/kötü) değil, uyuşmazlıkla ilgilidir.',
          pl: 'Diferente to cecha PORÓWNANIA: „inny”, nie taki sam jak coś innego. Nie chodzi o jakość (dobry/zły), lecz o niezgodność.',
        }),
        [
          {
            value: 'bueno',
            reasonCode: 'diferente_meaning_bueno_wrong_quality_general',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Bueno означает «хороший» — это общая оценка, а не сравнение с чем-то ещё. Нужно diferente.',
              uk: 'Bueno означає «хороший» — це загальна оцінка, а не порівняння з чимось іншим. Потрібно diferente.',
              es: 'Bueno means "good" — a general evaluation, not a comparison to something else. Diferente is needed.',
              'pt-BR': 'Bueno significa "bom" — uma avaliação geral, não uma comparação com outra coisa. Diferente é o que se precisa.',
              vi: 'Bueno nghĩa là "tốt" — một đánh giá chung, không phải so sánh với thứ khác. Cần dùng diferente.',
              id: 'Bueno berarti "baik" — penilaian umum, bukan perbandingan dengan yang lain. Yang diperlukan adalah diferente.',
              tr: 'Bueno "iyi" anlamına gelir — genel bir değerlendirmedir, başka bir şeyle karşılaştırma değil. Gereken kelime diferente.',
              pl: 'Bueno znaczy "dobry" — to ogólna ocena, nie porównanie z czymś innym. Potrzebne jest diferente.',
            }),
          },
          {
            value: 'igual',
            reasonCode: 'diferente_meaning_igual_opposite_extra',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Igual означает «всё равно, без разницы» — прямая противоположность diferente. «Другой, отличающийся» — это diferente.',
              uk: 'Igual означає «все одно, без різниці» — пряма протилежність diferente. «Інший, відмінний» — це diferente.',
              es: 'Igual means "all the same, it does not matter" — the direct opposite of diferente. "Different" is diferente.',
              'pt-BR': 'Igual significa "tanto faz, sem diferença" — o oposto direto de diferente. "Diferente" é diferente.',
              vi: 'Igual nghĩa là "cũng như nhau, không khác biệt" — trái nghĩa trực tiếp của diferente. "Khác" là diferente.',
              id: 'Igual berarti "sama saja, tidak masalah" — kebalikan langsung dari diferente. "Berbeda" adalah diferente.',
              tr: 'Igual "aynı şey, fark etmez" anlamına gelir — diferente\'nin doğrudan zıttı. "Farklı" diferente\'dir.',
              pl: 'Igual znaczy "bez różnicy, wszystko jedno" — bezpośrednie przeciwieństwo diferente. "Inny" to diferente.',
            }),
          },
        ],
      ),
      build_form: contact(
        L({
          ru: 'Diferente: d-i-f-e-r-e-n-t-e, без тильды. Не меняется по роду — тот же класс, что igual, только -e на конце для обоих родов. Множественное число просто добавляет -s: diferentes.',
          uk: 'Diferente: d-i-f-e-r-e-n-t-e, без тильди. Не змінюється за родом — той самий клас, що igual, лише -e в кінці для обох родів. Множина просто додає -s: diferentes.',
          es: 'Diferente: d-i-f-e-r-e-n-t-e, no tilde. It does not change by gender — the same class as igual, just -e at the end for both genders. The plural simply adds -s: diferentes.',
          'pt-BR': 'Diferente: d-i-f-e-r-e-n-t-e, sem til. Não muda por gênero — a mesma classe de igual, apenas -e no final para os dois gêneros. O plural só acrescenta -s: diferentes.',
          vi: 'Diferente: d-i-f-e-r-e-n-t-e, không dấu ngã. Không đổi theo giống — cùng lớp với igual, chỉ có -e ở cuối cho cả hai giống. Số nhiều chỉ thêm -s: diferentes.',
          id: 'Diferente: d-i-f-e-r-e-n-t-e, tanpa tilde. Tidak berubah menurut gender — kelas yang sama dengan igual, hanya -e di akhir untuk kedua gender. Jamak hanya menambahkan -s: diferentes.',
          tr: 'Diferente: d-i-f-e-r-e-n-t-e, tildesiz. Cinsiyete göre değişmez — igual ile aynı sınıf, her iki cinsiyet için de sonda sadece -e. Çoğul yalnızca -s ekler: diferentes.',
          pl: 'Diferente: d-i-f-e-r-e-n-t-e, bez tyldy. Nie zmienia się według rodzaju — ta sama klasa co igual, tylko -e na końcu dla obu rodzajów. Liczba mnoga po prostu dodaje -s: diferentes.',
        }),
        [
          {
            value: 'diferenta',
            reasonCode: 'diferente_form_wrongly_gendered_a_ending',
            trapType: 'grammar',
            feedback: L({
              ru: 'Diferenta не существует — diferente не меняется по роду, формы на -a у него нет, в отличие от bueno/buena. Нужно diferente для любого рода.',
              uk: 'Diferenta не існує — diferente не змінюється за родом, форми на -a в нього немає, на відміну від bueno/buena. Потрібно diferente для будь-якого роду.',
              es: 'Diferenta does not exist — diferente does not change by gender, it has no -a form, unlike bueno/buena. Diferente is needed for any gender.',
              'pt-BR': 'Diferenta não existe — diferente não muda por gênero, não tem forma em -a, diferente de bueno/buena. Diferente é necessário para qualquer gênero.',
              vi: 'Diferenta không tồn tại — diferente không đổi theo giống, không có dạng -a, khác với bueno/buena. Cần dùng diferente cho mọi giống.',
              id: 'Diferenta tidak ada — diferente tidak berubah menurut gender, tidak memiliki bentuk -a, berbeda dari bueno/buena. Diferente diperlukan untuk gender apa pun.',
              tr: 'Diferenta yoktur — diferente cinsiyete göre değişmez, bueno/buena\'nın aksine -a biçimi yoktur. Herhangi bir cinsiyet için diferente gerekir.',
              pl: 'Diferenta nie istnieje — diferente nie ma formy na -a. Dla każdego rodzaju: diferente.',
            }),
          },
          {
            value: 'igual',
            reasonCode: 'diferente_form_igual_antonym_not_target',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Igual означает противоположное — «всё равно, без разницы». Это не форма diferente, а другое слово с обратным смыслом. Нужно diferente.',
              uk: 'Igual означає протилежне — «все одно, без різниці». Це не форма diferente, а інше слово з протилежним значенням. Потрібно diferente.',
              es: 'Igual means the opposite — "all the same." Not a form of diferente, a different word. Diferente is needed.',
              'pt-BR': 'Igual significa o oposto — "tanto faz". Não é uma forma de diferente, é outra palavra. Diferente é o que se precisa.',
              vi: 'Igual nghĩa ngược lại — "cũng như nhau". Không phải dạng của diferente, mà là từ khác. Cần dùng diferente.',
              id: 'Igual berarti kebalikannya — "sama saja". Bukan bentuk dari diferente, melainkan kata lain. Yang diperlukan diferente.',
              tr: 'Igual tam tersini ifade eder — "aynı şey, fark etmez". Bu, diferente\'nin bir biçimi değil, ters anlamlı başka bir kelimedir. Gereken kelime diferente.',
              pl: 'Igual znaczy coś przeciwnego — "bez różnicy, wszystko jedno". To nie forma diferente, lecz inne słowo o odwrotnym znaczeniu. Potrzebne jest diferente.',
            }),
          },
        ],
      ),
    },
  },
]);
