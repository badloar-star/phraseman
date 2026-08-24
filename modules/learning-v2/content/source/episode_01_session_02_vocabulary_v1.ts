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

export const EPISODE_01_SESSION_02_VOCABULARY_V1:
  readonly SessionVocabularySourceV1[] = Object.freeze([
  {
    id: 'e01-s02-word-not',
    target: 'not',
    meaning: L({
      ru: 'не — отрицание признака или места',
      uk: 'не — заперечення ознаки або місця',
      es: 'no — negación de una cualidad o un lugar',
      'pt-BR': 'não — negação de uma característica ou lugar',
      vi: 'không — phủ định một đặc điểm hoặc nơi chốn',
      id: 'tidak — menyangkal keadaan atau tempat',
      tr: 'değil — bir özelliği ya da yeri olumsuz yapar',
      pl: 'nie — przeczenie cechy albo miejsca',
    }),
    features: ['negation_not'],
    contacts: {
      recognize: contact(
        L({
          ru: 'Not звучит с короткой гласной и чёткой конечной /t/. В no конечной /t/ нет, а now заканчивается дифтонгом /aʊ/.',
          uk: 'Not звучить із коротким голосним і чітким кінцевим /t/. У no кінцевого /t/ немає, а now закінчується дифтонгом /aʊ/.',
          es: 'Not lleva una vocal breve y una /t/ final clara. No no tiene /t/ final y now termina con el diptongo /aʊ/.',
          'pt-BR': 'Not tem vogal breve e /t/ final claro. No não tem /t/ final, e now termina com o ditongo /aʊ/.',
          vi: 'Not có nguyên âm ngắn và âm /t/ rõ ở cuối. No không có /t/ cuối, còn now kết thúc bằng nguyên âm đôi /aʊ/.',
          id: 'Not memakai vokal pendek dan /t/ yang jelas di akhir. No tidak memiliki /t/ akhir, sedangkan now berakhir dengan diftong /aʊ/.',
          tr: 'Not kısa ünlü ve belirgin son /t/ ile söylenir. No sonunda /t/ taşımaz, now ise /aʊ/ diftonguyla biter.',
          pl: 'Not ma krótką samogłoskę i wyraźne końcowe /t/. No nie ma /t/ na końcu, a now kończy się dyftongiem /aʊ/.',
        }),
        [
          {
            value: 'no',
            reasonCode: 'not_recognize_no_missing_final_t',
            trapType: 'phonetic',
            feedback: L({
              ru: 'No обрывается после гласной; в not после неё слышна конечная /t/.',
              uk: 'No обривається після голосного; у not після нього чути кінцевий /t/.',
              es: 'No termina después de la vocal; not añade una /t/ audible al final.',
              'pt-BR': 'No termina depois da vogal; not acrescenta um /t/ audível no final.',
              vi: 'No dừng sau nguyên âm; not còn có âm /t/ nghe được ở cuối.',
              id: 'No berhenti setelah vokal; not masih memiliki /t/ yang terdengar di akhir.',
              tr: 'No ünlüden sonra biter; not sonunda ayrıca duyulan bir /t/ vardır.',
              pl: 'No kończy się po samogłosce; w not słychać jeszcze końcowe /t/.',
            }),
          },
          {
            value: 'now',
            reasonCode: 'not_recognize_now_diphthong',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Now заканчивается звуком /aʊ/ без /t/; в not гласная короткая, а слово закрывает /t/.',
              uk: 'Now закінчується звуком /aʊ/ без /t/; у not голосний короткий, а слово закриває /t/.',
              es: 'Now acaba en /aʊ/ sin /t/; not lleva vocal breve y se cierra con /t/.',
              'pt-BR': 'Now termina em /aʊ/ sem /t/; not tem vogal breve e fecha com /t/.',
              vi: 'Now kết thúc bằng /aʊ/ và không có /t/; not có nguyên âm ngắn rồi đóng bằng /t/.',
              id: 'Now berakhir dengan /aʊ/ tanpa /t/; not memakai vokal pendek lalu ditutup /t/.',
              tr: 'Now /aʊ/ ile ve /t/ olmadan biter; not kısa ünlüden sonra /t/ ile kapanır.',
              pl: 'Now kończy się /aʊ/ bez /t/; not ma krótką samogłoskę i zamyka je /t/.',
            }),
          },
        ],
      ),
      retrieve_meaning: contact(
        L({
          ru: 'Not отменяет признак или место и соответствует русскому «не». No — самостоятельный ответ «нет», а never означает «никогда».',
          uk: 'Not заперечує ознаку або місце й відповідає українському «не». No — окрема відповідь «ні», а never означає «ніколи».',
          es: 'Not niega una cualidad o un lugar. No puede ser una respuesta independiente y never significa «nunca».',
          'pt-BR': 'Not nega uma característica ou um lugar. No pode ser uma resposta independente, e never significa «nunca».',
          vi: 'Not phủ định một đặc điểm hoặc nơi chốn. No có thể là câu trả lời “không”, còn never nghĩa là “không bao giờ”.',
          id: 'Not menyangkal keadaan atau tempat. No dapat menjadi jawaban “tidak”, sedangkan never berarti “tidak pernah”.',
          tr: 'Not bir özelliği ya da yeri olumsuz yapar. No tek başına “hayır” cevabıdır, never ise “asla” demektir.',
          pl: 'Not zaprzecza cesze albo miejscu. No może być samodzielną odpowiedzią „nie”, a never znaczy „nigdy”.',
        }),
        [
          {
            value: 'no',
            reasonCode: 'not_meaning_no_standalone_answer',
            trapType: 'collocation_pragmatics',
            feedback: L({
              ru: 'No обычно отвечает «нет» само по себе; отрицание признака внутри конструкции передаёт not.',
              uk: 'No зазвичай відповідає «ні» окремо; ознаку всередині конструкції заперечує not.',
              es: 'No suele funcionar como respuesta independiente; dentro de la estructura, la cualidad se niega con not.',
              'pt-BR': 'No costuma funcionar como resposta independente; dentro da estrutura, a característica é negada com not.',
              vi: 'No thường là câu trả lời độc lập “không”; để phủ định đặc điểm trong cấu trúc cần not.',
              id: 'No biasanya menjadi jawaban mandiri “tidak”; keadaan di dalam struktur disangkal dengan not.',
              tr: 'No çoğunlukla tek başına “hayır” cevabıdır; yapı içindeki özellik not ile olumsuz yapılır.',
              pl: 'No zwykle jest samodzielną odpowiedzią „nie”; cechę wewnątrz konstrukcji neguje not.',
            }),
          },
          {
            value: 'never',
            reasonCode: 'not_meaning_never_time_frequency',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Never означает «никогда» и добавляет смысл времени; простое отрицание «не» передаёт not.',
              uk: 'Never означає «ніколи» й додає значення часу; просте заперечення «не» передає not.',
              es: 'Never significa «nunca» y añade una idea de tiempo; la negación simple corresponde a not.',
              'pt-BR': 'Never significa «nunca» e acrescenta uma ideia de tempo; a negação simples corresponde a not.',
              vi: 'Never nghĩa là “không bao giờ” và thêm ý thời gian; phủ định đơn giản dùng not.',
              id: 'Never berarti “tidak pernah” dan menambahkan makna waktu; negasi sederhana memakai not.',
              tr: 'Never “asla/hiçbir zaman” demektir ve zaman anlamı ekler; yalın olumsuzluk not ile kurulur.',
              pl: 'Never znaczy „nigdy” i dodaje znaczenie czasu; zwykłe przeczenie wyraża not.',
            }),
          },
        ],
      ),
      build_form: contact(
        L({
          ru: 'Not пишется n-o-t. No теряет конечную t, а note добавляет e и меняет произношение.',
          uk: 'Not пишеться n-o-t. No втрачає кінцеву t, а note додає e й змінює вимову.',
          es: 'Not se escribe n-o-t. No pierde la t final y note añade una e que cambia la pronunciación.',
          'pt-BR': 'Not se escreve n-o-t. No perde o t final e note acrescenta um e que muda a pronúncia.',
          vi: 'Not được viết n-o-t. No thiếu t ở cuối, còn note thêm e và đổi cách phát âm.',
          id: 'Not ditulis n-o-t. No kehilangan t terakhir, sedangkan note menambah e dan mengubah pengucapan.',
          tr: 'Not n-o-t biçiminde yazılır. No son t harfini kaybeder, note ise e ekleyip söylenişi değiştirir.',
          pl: 'Not zapisuje się n-o-t. No nie ma końcowego t, a note dodaje e i zmienia wymowę.',
        }),
        [
          {
            value: 'no',
            reasonCode: 'not_form_no_missing_t',
            trapType: 'orthographic',
            feedback: L({
              ru: 'No не хватает последней буквы t; полная форма отрицания пишется not.',
              uk: 'У no бракує останньої літери t; повна форма заперечення пишеться not.',
              es: 'A no le falta la t final; la forma completa de la negación es not.',
              'pt-BR': 'No não tem o t final; a forma completa da negação é not.',
              vi: 'No thiếu chữ t ở cuối; dạng phủ định đầy đủ được viết là not.',
              id: 'No kehilangan huruf t terakhir; bentuk negasi lengkap ditulis not.',
              tr: 'No son t harfini taşımaz; olumsuzluğun tam biçimi not olarak yazılır.',
              pl: 'No nie ma ostatniej litery t; pełna forma przeczenia to not.',
            }),
          },
          {
            value: 'note',
            reasonCode: 'not_form_note_extra_e',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Note содержит лишнюю e и означает «заметка»; отрицание пишется без e: not.',
              uk: 'Note містить зайву e й означає «нотатка»; заперечення пишеться без e: not.',
              es: 'Note añade una e y significa «nota»; la negación se escribe sin e: not.',
              'pt-BR': 'Note acrescenta um e e significa «nota»; a negação se escreve sem e: not.',
              vi: 'Note có thêm e và nghĩa là “ghi chú”; từ phủ định không có e: not.',
              id: 'Note menambah e dan berarti “catatan”; kata negasi ditulis tanpa e: not.',
              tr: 'Note fazladan e taşır ve “not/nota” anlamına gelir; olumsuzluk e olmadan not yazılır.',
              pl: 'Note dodaje e i oznacza „notatkę”; przeczenie zapisuje się bez e: not.',
            }),
          },
        ],
      ),
    },
  },
]);
