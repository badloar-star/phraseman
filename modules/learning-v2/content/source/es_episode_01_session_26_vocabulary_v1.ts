import type {
  LocalizedSource,
  SessionVocabularyContactSourceV1,
  SessionVocabularySourceV1,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 26 "Много: и признак меняется" / plural_agreement, builtOn: [3, 25],
// recalls: [3, 25]): единственное word-first слово — rápidos, форма
// МНОЖЕСТВЕННОГО числа мужского рода уже известного прилагательного rápido
// (сессия 5, там же rápido/rápida — согласование по РОДУ). Здесь тот же
// признак впервые согласуется по ЧИСЛУ: rápido → rápidos, добавление -s к
// гласной концовке. Выбран именно rápidos, а не совсем новое слово, по
// прямому указанию задания: чище педагогически показать НОВУЮ ось
// согласования на уже освоенном слове, чем заставлять учить одновременно и
// новую лексику, и новое правило.
//
// зачем именно rápido, а не bonito (тоже кандидат из сессии 3): rápido уже
// напрямую употреблялось с somos в сессии 25 ("Eres rápido, somos así") —
// признак уже стоял рядом с первым лицом множественного числа, только без
// собственного согласования по числу (там его подхватывало así). Здесь
// естественное продолжение той же карточки говорящих: теперь сам rápido
// получает форму множественного числа, а не остаётся при somos así.
//
// зачем категория 'quality-adjective-gendered-plural': она отражает, что
// слово несёт ОБА согласования сразу — по роду (унаследовано от sesión 3,
// -o/-a) и по числу (тема этой сессии, -s). Ни 'quality-adjective' (сессия
// 1, без рода), ни 'quality-adjective-gendered' (сессии 3-25, без числа) не
// покрывают это полностью — нужна отдельная категория, которая появится
// впервые именно здесь.
const L = (value: LocalizedSource): LocalizedSource => value;

const contact = (
  guidance: LocalizedSource,
  distractors: SessionVocabularyContactSourceV1['distractors'],
): SessionVocabularyContactSourceV1 => ({ guidance, distractors });

export const ES_EPISODE_01_SESSION_26_VOCABULARY_V1:
  readonly SessionVocabularySourceV1[] = Object.freeze([
  {
    id: 'es-e01-s26-word-rapidos',
    target: 'rápidos',
    meaning: L({
      ru: 'быстрые — признак множественного числа, мужской род или по умолчанию',
      uk: 'швидкі — ознака множини, чоловічий рід або за замовчуванням',
      es: 'fast — the plural, masculine or default form of the quality',
      'pt-BR': 'fast — the plural, masculine or default form of the quality',
      vi: 'fast — the plural, masculine or default form of the quality',
      id: 'fast — the plural, masculine or default form of the quality',
      tr: 'fast — the plural, masculine or default form of the quality',
      pl: 'fast — the plural, masculine or default form of the quality',
    }),
    features: ['quality_adjective', 'gender_agreement_full', 'plural_agreement', 'pace_adjective'],
    contacts: {
      recognize: contact(
        L({
          ru: 'Rápidos звучит как rápido с добавленным звуком -s в самом конце — ударение остаётся на том же слоге, RÁ-pi-dos, три слога плюс лёгкое шипение на конце. Это ровно тот же признак, что и в сессии про rápido, просто с дополнительным звуком.',
          uk: 'Rápidos звучить як rápido з доданим звуком -s наприкінці — наголос лишається на тому самому складі, RÁ-pi-dos, три склади плюс легке шипіння наприкінці. Це рівно та сама ознака, що й rápido, просто з додатковим звуком.',
          es: 'Rápidos sounds like rápido with an added -s sound at the very end — the stress stays on the same syllable, RÁ-pi-dos, the same three syllables plus a light hiss at the end.',
          'pt-BR': 'Rápidos sounds like rápido with an added -s sound at the very end — the stress stays on the same syllable, RÁ-pi-dos, the same three syllables plus a light hiss at the end.',
          vi: 'Rápidos sounds like rápido with an added -s sound at the very end — the stress stays on the same syllable, RÁ-pi-dos, the same three syllables plus a light hiss at the end.',
          id: 'Rápidos sounds like rápido with an added -s sound at the very end — the stress stays on the same syllable, RÁ-pi-dos, the same three syllables plus a light hiss at the end.',
          tr: 'Rápidos sounds like rápido with an added -s sound at the very end — the stress stays on the same syllable, RÁ-pi-dos, the same three syllables plus a light hiss at the end.',
          pl: 'Rápidos sounds like rápido with an added -s sound at the very end — the stress stays on the same syllable, RÁ-pi-dos, the same three syllables plus a light hiss at the end.',
        }),
        [
          {
            value: 'rápido',
            reasonCode: 'rapidos_recognize_rapido_missing_s',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Rápido без -s звучит короче и означает «быстрый» об одном. Rápidos заканчивается лёгким шипением -s — это про нескольких.',
              uk: 'Rápido без -s звучить коротше і означає «швидкий» про одного. Rápidos закінчується легким шипінням -s — це про кількох.',
              es: 'Rápido without -s sounds shorter and means "fast" about one. Rápidos ends with a light hiss -s — that is about several.',
              'pt-BR': 'Rápido without -s sounds shorter and means "fast" about one. Rápidos ends with a light hiss -s — that is about several.',
              vi: 'Rápido without -s sounds shorter and means "fast" about one. Rápidos ends with a light hiss -s — that is about several.',
              id: 'Rápido without -s sounds shorter and means "fast" about one. Rápidos ends with a light hiss -s — that is about several.',
              tr: 'Rápido without -s sounds shorter and means "fast" about one. Rápidos ends with a light hiss -s — that is about several.',
              pl: 'Rápido without -s sounds shorter and means "fast" about one. Rápidos ends with a light hiss -s — that is about several.',
            }),
          },
          {
            value: 'rápidas',
            reasonCode: 'rapidos_recognize_rapidas_wrong_gender',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Rápidas заканчивается на -as, женский род множественного числа. Слышится другой гласный перед -s — rápidos заканчивается на -os.',
              uk: 'Rápidas закінчується на -as, жіночий рід множини. Чути інший голосний перед -s — rápidos закінчується на -os.',
              es: 'Rápidas ends in -as, feminine plural. A different vowel is heard before -s — rápidos ends in -os.',
              'pt-BR': 'Rápidas ends in -as, feminine plural. A different vowel is heard before -s — rápidos ends in -os.',
              vi: 'Rápidas ends in -as, feminine plural. A different vowel is heard before -s — rápidos ends in -os.',
              id: 'Rápidas ends in -as, feminine plural. A different vowel is heard before -s — rápidos ends in -os.',
              tr: 'Rápidas ends in -as, feminine plural. A different vowel is heard before -s — rápidos ends in -os.',
              pl: 'Rápidas ends in -as, feminine plural. A different vowel is heard before -s — rápidos ends in -os.',
            }),
          },
        ],
      ),
      retrieve_meaning: contact(
        L({
          ru: 'Rápidos описывает темп нескольких людей сразу — тот же признак «быстро», что и rápido, но теперь относится не к одному, а к группе мужского рода или по умолчанию.',
          uk: 'Rápidos описує темп кількох людей одразу — та сама ознака «швидко», що й rápido, але тепер стосується не одного, а групи чоловічого роду або за замовчуванням.',
          es: 'Rápidos describes the pace of several people at once — the same quality "fast" as rápido, but now about a group, not just one, masculine or default.',
          'pt-BR': 'Rápidos describes the pace of several people at once — the same quality "fast" as rápido, but now about a group, not just one, masculine or default.',
          vi: 'Rápidos describes the pace of several people at once — the same quality "fast" as rápido, but now about a group, not just one, masculine or default.',
          id: 'Rápidos describes the pace of several people at once — the same quality "fast" as rápido, but now about a group, not just one, masculine or default.',
          tr: 'Rápidos describes the pace of several people at once — the same quality "fast" as rápido, but now about a group, not just one, masculine or default.',
          pl: 'Rápidos describes the pace of several people at once — the same quality "fast" as rápido, but now about a group, not just one, masculine or default.',
        }),
        [
          {
            value: 'rápido',
            reasonCode: 'rapidos_meaning_rapido_singular_only',
            trapType: 'grammar',
            feedback: L({
              ru: 'Rápido говорит только об одном человеке. Про группу нужна форма множественного числа: rápidos.',
              uk: 'Rápido говорить тільки про одну людину. Про групу потрібна форма множини: rápidos.',
              es: 'Rápido talks about only one person. For a group, the plural form is needed: rápidos.',
              'pt-BR': 'Rápido talks about only one person. For a group, the plural form is needed: rápidos.',
              vi: 'Rápido talks about only one person. For a group, the plural form is needed: rápidos.',
              id: 'Rápido talks about only one person. For a group, the plural form is needed: rápidos.',
              tr: 'Rápido talks about only one person. For a group, the plural form is needed: rápidos.',
              pl: 'Rápido talks about only one person. For a group, the plural form is needed: rápidos.',
            }),
          },
          {
            value: 'difíciles',
            reasonCode: 'rapidos_meaning_dificiles_wrong_quality',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Difíciles означает «трудные» — совсем другой признак, не про темп. Нужно rápidos.',
              uk: 'Difíciles означає «важкі» — зовсім інша ознака, не про темп. Потрібно rápidos.',
              es: 'Difíciles means "difficult" — a completely different quality, not pace. Rápidos is needed.',
              'pt-BR': 'Difíciles means "difficult" — a completely different quality, not pace. Rápidos is needed.',
              vi: 'Difíciles means "difficult" — a completely different quality, not pace. Rápidos is needed.',
              id: 'Difíciles means "difficult" — a completely different quality, not pace. Rápidos is needed.',
              tr: 'Difíciles means "difficult" — a completely different quality, not pace. Rápidos is needed.',
              pl: 'Difíciles means "difficult" — a completely different quality, not pace. Rápidos is needed.',
            }),
          },
        ],
      ),
      build_form: contact(
        L({
          ru: 'Rápidos пишется как rápido плюс одна буква -s в конце: r-á-p-i-d-o-s. Гласная концовка -o получает простое -s во множественном числе — так же работает bonito → bonitos, barato → baratos. Женский род пишется rápidas, той же схемой: -a плюс -s.',
          uk: 'Rápidos пишеться як rápido плюс одна літера -s наприкінці: r-á-p-i-d-o-s. Голосна концовка -o отримує просте -s у множині — так само працює bonito → bonitos, barato → baratos. Жіночий рід пишеться rápidas, тією ж схемою: -a плюс -s.',
          es: 'Rápidos is spelled as rápido plus one letter -s at the end: r-á-p-i-d-o-s. The vowel ending -o simply gets -s in the plural — the same way bonito → bonitos, barato → baratos work. The feminine is spelled rápidas, by the same scheme: -a plus -s.',
          'pt-BR': 'Rápidos is spelled as rápido plus one letter -s at the end: r-á-p-i-d-o-s. The vowel ending -o simply gets -s in the plural — the same way bonito → bonitos, barato → baratos work. The feminine is spelled rápidas, by the same scheme: -a plus -s.',
          vi: 'Rápidos is spelled as rápido plus one letter -s at the end: r-á-p-i-d-o-s. The vowel ending -o simply gets -s in the plural — the same way bonito → bonitos, barato → baratos work. The feminine is spelled rápidas, by the same scheme: -a plus -s.',
          id: 'Rápidos is spelled as rápido plus one letter -s at the end: r-á-p-i-d-o-s. The vowel ending -o simply gets -s in the plural — the same way bonito → bonitos, barato → baratos work. The feminine is spelled rápidas, by the same scheme: -a plus -s.',
          tr: 'Rápidos is spelled as rápido plus one letter -s at the end: r-á-p-i-d-o-s. The vowel ending -o simply gets -s in the plural — the same way bonito → bonitos, barato → baratos work. The feminine is spelled rápidas, by the same scheme: -a plus -s.',
          pl: 'Rápidos is spelled as rápido plus one letter -s at the end: r-á-p-i-d-o-s. The vowel ending -o simply gets -s in the plural — the same way bonito → bonitos, barato → baratos work. The feminine is spelled rápidas, by the same scheme: -a plus -s.',
        }),
        [
          {
            value: 'rápidoes',
            reasonCode: 'rapidos_form_wrong_ending_es',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Rápidoes не существует как форма множественного числа — окончание -es добавляют только к признакам, заканчивающимся на согласную (fácil → fáciles). Rápido заканчивается на гласную -o, поэтому здесь достаточно одной -s: rápidos, не rápidoes.',
              uk: 'Rápidoes не існує як форма множини — закінчення -es додають тільки до ознак, що закінчуються на приголосну (fácil → fáciles). Rápido закінчується на голосну -o, тому тут досить однієї -s: rápidos, не rápidoes.',
              es: 'Rápidoes does not exist as a plural form — the ending -es is added only to qualities ending in a consonant (fácil → fáciles). Rápido ends in the vowel -o, so only -s is needed here: rápidos, not rápidoes.',
              'pt-BR': 'Rápidoes não existe como forma plural — a terminação -es é adicionada apenas a qualidades terminadas em consoante (fácil → fáciles). Rápido termina na vogal -o, então basta -s aqui: rápidos, não rápidoes.',
              vi: 'Rápidoes không tồn tại như một dạng số nhiều — đuôi -es chỉ được thêm vào những đặc điểm kết thúc bằng phụ âm (fácil → fáciles). Rápido kết thúc bằng nguyên âm -o, nên chỉ cần -s ở đây: rápidos, không phải rápidoes.',
              id: 'Rápidoes tidak ada sebagai bentuk jamak — akhiran -es hanya ditambahkan pada sifat yang berakhiran konsonan (fácil → fáciles). Rápido berakhiran vokal -o, jadi cukup -s di sini: rápidos, bukan rápidoes.',
              tr: 'Rápidoes çoğul bir biçim olarak mevcut değildir — -es eki yalnızca ünsüzle biten niteliklere eklenir (fácil → fáciles). Rápido sesli harf -o ile biter, bu yüzden burada sadece -s yeterlidir: rápidos, rápidoes değil.',
              pl: 'Rápidoes nie istnieje jako forma liczby mnogiej — końcówkę -es dodaje się tylko do cech kończących się na spółgłoskę (fácil → fáciles). Rápido kończy się na samogłoskę -o, więc wystarczy tu samo -s: rápidos, nie rápidoes.',
            }),
          },
          {
            value: 'rápidas',
            reasonCode: 'rapidos_form_rapidas_wrong_gender',
            trapType: 'grammar',
            feedback: L({
              ru: 'Rápidas — форма женского рода множественного числа, с -as. По умолчанию, без названной группы, нужна форма на -os: rápidos.',
              uk: 'Rápidas — форма жіночого роду множини, з -as. За замовчуванням, без названої групи, потрібна форма на -os: rápidos.',
              es: 'Rápidas is the feminine plural form, with -as. By default, with no named group, the form with -os is needed: rápidos.',
              'pt-BR': 'Rápidas is the feminine plural form, with -as. By default, with no named group, the form with -os is needed: rápidos.',
              vi: 'Rápidas is the feminine plural form, with -as. By default, with no named group, the form with -os is needed: rápidos.',
              id: 'Rápidas is the feminine plural form, with -as. By default, with no named group, the form with -os is needed: rápidos.',
              tr: 'Rápidas is the feminine plural form, with -as. By default, with no named group, the form with -os is needed: rápidos.',
              pl: 'Rápidas is the feminine plural form, with -as. By default, with no named group, the form with -os is needed: rápidos.',
            }),
          },
        ],
      ),
    },
  },
]);
