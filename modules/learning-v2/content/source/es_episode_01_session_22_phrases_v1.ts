import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_22_LOCALIZED_DETAILS } from './es_episode_01_session_22_localized_details_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 22 "Важно или нет" / importance_adjective, builtOn: [5, 21],
// recalls: [5, 21]): 15 фраз применения. Новых слов нет — importante уже
// встречался как обычное слово-признак в сессии 1 (Es importante) и в
// сессии 21 (El libro es importante); здесь тема получает первую
// СФОКУСИРОВАННУЮ трактовку — противопоставление importante его ближайшей
// смысловой противоположности в курсе, igual («всё равно», уже введённой в
// сессии 19/21 именно как реакция на отсутствие значимости: No es igual —
// «это не всё равно»). Прямого антонима importante/«неважно» одним словом
// курс не вводил (kind: 'phrases' запрещает вводить новое слово), поэтому
// igual используется как семантический контраст, ровно как предполагает
// задание сессии.
//
// Recurring noun — el libro (сессия 21, noun_gender): большинство фраз
// применяют importante/igual к конкретной книге через El libro es
// importante / El libro no es importante, признавая род существительного
// (артикль el, согласование caro/bonito recall). Меньшинство фраз держит
// безличную конструкцию Es importante / No es importante (сессия 1, 17) —
// про ситуации без названного предмета, чтобы не превращать все 15 фраз в
// одну и ту же рамку про книгу. Recall pace_adjective (сессия 5,
// rápido/rápida) и price_adjective/gender_agreement_full (сессия 21,
// caro/barato) вплетены как соседние по смыслу признаки в вопросах о
// приоритете ("что важнее — цена или скорость").
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s22-es-importante',
      english: 'Es importante',
      russian: 'Это важно',
      explanation:
        'Безличная оценка значимости ситуации или дела — без названного предмета. Признак importante не меняется по роду, связка es используется потому, что речь не о собеседнике и не о себе.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — обращение к собеседнику напрямую. Безличная оценка значимости — только Es.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Безличная оценка значимости — только Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'importante',
          category: 'quality-adjective',
          distractors: [
            { value: 'igual', reasonCode: 'antonym_confusion:importante', why: 'Igual означает безразличие — противоположный смысл. Здесь утверждают значимость: нужно importante.', trapType: 'semantic_neighbor' },
            { value: 'caro', reasonCode: 'wrong_word:importante', why: 'Caro означает «дорого» — про цену, а не про значимость. Нужно importante.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'impersonal_subject'],
    },
    {
      id: 'es-e01-s22-no-es-importante',
      english: 'No es importante',
      russian: 'Это не важно',
      explanation:
        'Так снижают значимость темы, вопреки чужому беспокойству. No встаёт перед es, importante не меняется от отрицания — та же формула отрицания, что и в прежних темах курса.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание значимости — no.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — обращение к собеседнику. Возражение про значимость дела — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Возражение про значимость дела — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'importante',
          category: 'quality-adjective',
          distractors: [
            { value: 'igual', reasonCode: 'antonym_confusion:importante', why: 'Igual означает безразличие — другой оттенок, а не «неважно». Нужно importante.', trapType: 'semantic_neighbor' },
            { value: 'bonito', reasonCode: 'wrong_word:importante', why: 'Bonito означает «красиво» — про внешность, а не про значимость. Нужно importante.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'impersonal_subject', 'negation'],
    },
    {
      id: 'es-e01-s22-es-importante-o-igual-q',
      english: '¿Es importante o es igual?',
      russian: 'Это важно, или всё равно?',
      explanation:
        'Прямой вопрос с выбором между значимостью и безразличием — узнают, стоит ли вообще беспокоиться. Связка es повторяется в обеих половинах вопроса, признаки соединяет союз o.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — обращение к собеседнику. Вопрос о значимости ситуации — только Es.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Вопрос о значимости ситуации — только Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'importante',
          category: 'quality-adjective',
          distractors: [
            { value: 'caro', reasonCode: 'wrong_word:importante', why: 'Caro означает «дорого» — про цену, а не про значимость. Нужно importante.', trapType: 'semantic_neighbor' },
            { value: 'único', reasonCode: 'wrong_word:importante', why: 'Único означает «единственный» — про неповторимость, а не про значимость. Нужно importante.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'o',
          category: 'conjunction',
          distractors: [
            { value: 'y', reasonCode: 'wrong_word:o', why: 'Y означает «и» — соединяет, а не предлагает выбор. Между двумя противоположными вариантами нужно o.', trapType: 'semantic_neighbor' },
            { value: 'es', reasonCode: 'wrong_word:o', why: 'Es — связка, она уже стоит дважды в этой фразе. Между вариантами нужен союз выбора o.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — обращение к собеседнику. Вторая часть вопроса про ситуацию — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Вторая часть вопроса про ситуацию — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'igual',
          category: 'invariable-adjective',
          distractors: [
            { value: 'iguales', reasonCode: 'invariable_adjective_wrongly_inflected:igual', why: 'Igual не меняется по числу в этой конструкции — формы iguales здесь не место.', trapType: 'grammar' },
            { value: 'verdad', reasonCode: 'wrong_word:igual', why: 'Verdad означает «правда» — подтверждение факта, а не безразличие. Нужно igual.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'impersonal_subject', 'question_marks'],
    },
    {
      id: 'es-e01-s22-el-libro-es-importante',
      english: 'El libro es importante',
      russian: 'Книга важная',
      explanation:
        'Так называют конкретную книгу значимой — например, для учёбы или работы. Артикль el называет род libro; сам признак importante по роду не меняется, но стоит рядом с названным предметом, а не безлично.',
      words: [
        {
          correct: 'El',
          category: 'article',
          distractors: [
            { value: 'La', reasonCode: 'article_gender_mismatch:El', why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен El, а не La.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'wrong_word:El', why: 'Es — это связка, она встанет дальше, а не в начале перед словом-предметом. Здесь нужен артикль El.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            { value: 'libre', reasonCode: 'wrong_word:libro', why: 'Libre означает «свободный» — совсем другое слово. Про книгу нужно libro.', trapType: 'phonetic' },
            { value: 'importante', reasonCode: 'wrong_word:libro', why: 'Importante — это признак «важно», он не называет сам предмет. Нужно существительное libro.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — обращение к собеседнику. Оценка значимости книги — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Оценка значимости книги — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'importante',
          category: 'quality-adjective',
          distractors: [
            { value: 'igual', reasonCode: 'antonym_confusion:importante', why: 'Igual означает безразличие — противоположный смысл. Здесь утверждают значимость книги: нужно importante.', trapType: 'semantic_neighbor' },
            { value: 'barato', reasonCode: 'wrong_word:importante', why: 'Barato означает «дёшево» — про цену, а не про значимость. Нужно importante.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'noun_gender'],
    },
    {
      id: 'es-e01-s22-el-libro-no-es-importante',
      english: 'El libro no es importante',
      russian: 'Книга не важная',
      explanation:
        'Возражение на мнение, что конкретная книга значима, — например, устаревший учебник. No встаёт перед связкой es, El libro остаётся на месте: отрицается только признак, а не сам предмет.',
      words: [
        {
          correct: 'El',
          category: 'article',
          distractors: [
            { value: 'La', reasonCode: 'article_gender_mismatch:El', why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен El, а не La.', trapType: 'grammar' },
            { value: 'No', reasonCode: 'word_order_invalid:El', why: 'No должно стоять перед связкой, а не в начале вместо артикля. Фраза начинается с El.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            { value: 'litro', reasonCode: 'wrong_word:libro', why: 'Litro означает «литр» — звучит похоже, но это другое слово. Про книгу нужно libro.', trapType: 'phonetic' },
            { value: 'igual', reasonCode: 'wrong_word:libro', why: 'Igual уже используется дальше как признак безразличия. Здесь нужно существительное libro.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'no',
          category: 'negation',
          distractors: [
            { value: 'nada', reasonCode: 'negation_word_mismatch:no', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание значимости — no.', trapType: 'semantic_neighbor' },
            { value: 'non', reasonCode: 'orthographic_invalid:no', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — обращение к собеседнику. Возражение про значимость книги — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Возражение про значимость книги — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'importante',
          category: 'quality-adjective',
          distractors: [
            { value: 'igual', reasonCode: 'antonym_confusion:importante', why: 'Igual означает безразличие — здесь возражают именно про значимость книги. Нужно importante.', trapType: 'semantic_neighbor' },
            { value: 'único', reasonCode: 'wrong_word:importante', why: 'Único означает «единственный» — про неповторимость, не про значимость. Нужно importante.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'noun_gender', 'negation'],
    },
    {
      id: 'es-e01-s22-es-igual',
      english: 'Es igual',
      russian: 'Всё равно',
      explanation:
        'Безличная реакция полного безразличия к ситуации — например, к выбору между двумя одинаково приемлемыми вариантами. Igual не меняется по роду и числу — эта форма закреплена как готовая реакция.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — обращение к собеседнику. Реакция на ситуацию — только Es.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Реакция на ситуацию — только Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'igual',
          category: 'invariable-adjective',
          distractors: [
            { value: 'importante', reasonCode: 'antonym_confusion:igual', why: 'Importante означает «важно» — противоположный смысл. Здесь нужна реакция безразличия: igual.', trapType: 'semantic_neighbor' },
            { value: 'así', reasonCode: 'wrong_word:igual', why: 'Así означает «так» — описание образа действия, а не безразличие. Нужно igual.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'impersonal_subject', 'fixed_reaction'],
    },
    {
      id: 'es-e01-s22-el-libro-es-igual',
      english: 'El libro es igual',
      russian: 'Книга такая же',
      explanation:
        'Так говорят о конкретной книге, когда она ничем не отличается от другой, — например, одно и то же издание. El называет род libro, а igual остаётся неизменным, потому что этот признак не согласуется по роду.',
      words: [
        {
          correct: 'El',
          category: 'article',
          distractors: [
            { value: 'La', reasonCode: 'article_gender_mismatch:El', why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен El, а не La.', trapType: 'grammar' },
            { value: 'Los', reasonCode: 'article_number_mismatch:El', why: 'Los — артикль множественного числа. Здесь говорят об одной книге, нужен El.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            { value: 'libre', reasonCode: 'wrong_word:libro', why: 'Libre означает «свободный» — совсем другое слово. Про книгу нужно libro.', trapType: 'phonetic' },
            { value: 'igual', reasonCode: 'wrong_word:libro', why: 'Igual — это признак «такой же», он не называет сам предмет. Нужно существительное libro.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — обращение к собеседнику. Сравнение книги — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Сравнение книги — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'igual',
          category: 'invariable-adjective',
          distractors: [
            { value: 'iguala', reasonCode: 'invariable_adjective_wrongly_inflected:igual', why: 'Igual не меняется по роду — формы iguala не существует, даже рядом с libro мужского рода.', trapType: 'grammar' },
            { value: 'importante', reasonCode: 'antonym_confusion:igual', why: 'Importante означает «важно» — противоположный смысл. Здесь про схожесть: нужно igual.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'noun_gender', 'invariable_adjective'],
    },
    {
      id: 'es-e01-s22-es-verdad-el-libro-es-importante',
      english: '¿Es verdad?; el libro es importante',
      russian: 'Это правда? Книга важная',
      explanation:
        'Вопрос об истинности заявления и отдельное подтверждение через конкретный предмет — книгу. Первая часть безлична (Es verdad), вторая называет саму книгу и её значимость.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — обращение к собеседнику напрямую. Вопрос об истинности факта — только Es.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Вопрос об истинности факта — только Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'verdad',
          category: 'truth-noun',
          distractors: [
            { value: 'importante', reasonCode: 'wrong_word:verdad', why: 'Importante уже используется дальше про значимость книги. Здесь нужен вопрос об истинности: verdad.', trapType: 'semantic_neighbor' },
            { value: 'igual', reasonCode: 'wrong_word:verdad', why: 'Igual означает безразличие, а не вопрос об истинности. Нужно verdad.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'el',
          category: 'article',
          distractors: [
            { value: 'la', reasonCode: 'article_gender_mismatch:el', why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен el, а не la.', trapType: 'grammar' },
            { value: 'un', reasonCode: 'wrong_word:el', why: 'Un — другой тип артикля, этот курс использует только el/la. Нужно el.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            { value: 'libre', reasonCode: 'wrong_word:libro', why: 'Libre означает «свободный» — совсем другое слово. Про книгу нужно libro.', trapType: 'phonetic' },
            { value: 'verdad', reasonCode: 'wrong_word:libro', why: 'Verdad уже стояло выше в вопросе об истинности. Здесь нужно существительное libro.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — обращение к собеседнику. Оценка значимости книги — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Оценка значимости книги — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'importante',
          category: 'quality-adjective',
          distractors: [
            { value: 'igual', reasonCode: 'antonym_confusion:importante', why: 'Igual означает безразличие — противоположный смысл. Здесь утверждают значимость: нужно importante.', trapType: 'semantic_neighbor' },
            { value: 'caro', reasonCode: 'wrong_word:importante', why: 'Caro означает «дорого» — про цену, а не про значимость. Нужно importante.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'noun_gender', 'question_marks', 'fact_check'],
    },
    {
      id: 'es-e01-s22-de-acuerdo-no-es-igual',
      english: 'De acuerdo; no es igual',
      russian: 'Согласен, это не всё равно',
      explanation:
        'Согласие с чужим мнением, за которым следует отдельное возражение против безразличия — говорящий признаёт правоту, но настаивает, что разница есть. De acuerdo не меняется, no es igual — обычная формула отрицания.',
      words: [
        {
          correct: 'De',
          category: 'agreement-phrase-part',
          distractors: [
            { value: 'Es', reasonCode: 'wrong_word:De', why: 'Es — связка «есть», а не часть формулы согласия. Формула согласия начинается с De.', trapType: 'semantic_neighbor' },
            { value: 'No', reasonCode: 'wrong_word:De', why: 'No отрицает, а тут сначала утверждается согласие. Формула согласия начинается с De.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'acuerdo',
          category: 'agreement-phrase-part',
          distractors: [
            { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual уже используется дальше отдельно про безразличие. Формула согласия — именно acuerdo.', trapType: 'semantic_neighbor' },
            { value: 'importante', reasonCode: 'wrong_word:acuerdo', why: 'Importante означает «важно» — не про согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'no',
          category: 'negation',
          distractors: [
            { value: 'nada', reasonCode: 'negation_word_mismatch:no', why: 'Nada — «ничего». Отрицание безразличия — no.', trapType: 'semantic_neighbor' },
            { value: 'non', reasonCode: 'orthographic_invalid:no', why: 'Non — не испанское слово. Отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — обращение к собеседнику. Возражение про безразличие — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Возражение про безразличие — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'igual',
          category: 'invariable-adjective',
          distractors: [
            { value: 'iguala', reasonCode: 'invariable_adjective_wrongly_inflected:igual', why: 'Igual не меняется по роду — формы iguala не существует.', trapType: 'grammar' },
            { value: 'verdad', reasonCode: 'wrong_word:igual', why: 'Verdad — про истинность факта, а не про безразличие. Нужно igual.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'impersonal_subject', 'negation', 'agreement_phrase'],
    },
    {
      id: 'es-e01-s22-es-caro-pero-no-es-importante',
      english: 'Es caro, pero no es importante',
      russian: 'Это дорого, но это не важно',
      explanation:
        'Так отделяют цену от значимости — вещь может быть дорогой, но не иметь большого значения для решения. Обе части фразы держат безличную связку es; союз pero противопоставляет два разных признака.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — обращение к собеседнику. Оценка цены предмета — только Es.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Оценка цены предмета — только Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'caro',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'cara', reasonCode: 'gender_mismatch:caro', why: 'Cara — форма женского рода, с -a. По умолчанию, без названного предмета, используется форма на -o: caro.', trapType: 'grammar' },
            { value: 'importante', reasonCode: 'wrong_word:caro', why: 'Importante уже используется дальше во второй половине фразы. Первая половина — именно про цену: caro.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'pero',
          category: 'conjunction',
          distractors: [
            { value: 'o', reasonCode: 'wrong_word:pero', why: 'O предлагает выбор между вариантами, а не противопоставляет два факта. Нужно pero.', trapType: 'semantic_neighbor' },
            { value: 'y', reasonCode: 'wrong_word:pero', why: 'Y просто соединяет, без противопоставления. Здесь цена и значимость расходятся: нужно pero.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'no',
          category: 'negation',
          distractors: [
            { value: 'nada', reasonCode: 'negation_word_mismatch:no', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание значимости — no.', trapType: 'semantic_neighbor' },
            { value: 'non', reasonCode: 'orthographic_invalid:no', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — обращение к собеседнику. Возражение про значимость — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Возражение про значимость — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'importante',
          category: 'quality-adjective',
          distractors: [
            { value: 'igual', reasonCode: 'antonym_confusion:importante', why: 'Igual означает полное безразличие — здесь же речь именно о невысокой значимости, вопреки цене. Нужно importante.', trapType: 'semantic_neighbor' },
            { value: 'barato', reasonCode: 'wrong_word:importante', why: 'Barato означает «дёшево» — противоречило бы первой части фразы. Нужно importante.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'impersonal_subject', 'gender_agreement_full', 'negation', 'price_adjective'],
    },
    {
      id: 'es-e01-s22-es-importante-el-libro-q',
      english: '¿Es importante el libro?',
      russian: 'Книга важная?',
      explanation:
        'Так спрашивают о значимости книги напрямую, начиная вопрос со связки. El libro встаёт после признака — обычный порядок для вопроса; знаки ¿...? обрамляют всю фразу.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres — обращение к собеседнику. Вопрос о значимости книги — только Es.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Вопрос о значимости книги — только Es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'importante',
          category: 'quality-adjective',
          distractors: [
            { value: 'igual', reasonCode: 'antonym_confusion:importante', why: 'Igual означает безразличие — противоположный смысл. Здесь спрашивают именно о значимости: нужно importante.', trapType: 'semantic_neighbor' },
            { value: 'único', reasonCode: 'wrong_word:importante', why: 'Único означает «единственный» — про неповторимость, а не про значимость. Нужно importante.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'el',
          category: 'article',
          distractors: [
            { value: 'la', reasonCode: 'article_gender_mismatch:el', why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен el, а не la.', trapType: 'grammar' },
            { value: 'un', reasonCode: 'wrong_word:el', why: 'Un — другой тип артикля, этот курс использует только el/la. Нужно el.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            { value: 'litro', reasonCode: 'wrong_word:libro', why: 'Litro означает «литр» — звучит похоже, но это другое слово. Про книгу нужно libro.', trapType: 'phonetic' },
            { value: 'verdad', reasonCode: 'wrong_word:libro', why: 'Verdad означает «правда» — другое существительное, не про книгу. Нужно libro.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'noun_gender', 'question_marks'],
    },
    {
      id: 'es-e01-s22-el-libro-es-rapido-pero-no-es-importante',
      english: 'El libro es rápido, pero no es importante',
      russian: 'Книга быстрая (лёгкая для чтения), но неважная',
      explanation:
        'Так сравнивают темп чтения книги с её значимостью — например, лёгкое чтиво без особой пользы. Rápido согласуется с родом libro формой на -o; вторая часть повторяет отрицание importante безлично для того же предмета.',
      words: [
        {
          correct: 'El',
          category: 'article',
          distractors: [
            { value: 'La', reasonCode: 'article_gender_mismatch:El', why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен El, а не La.', trapType: 'grammar' },
            { value: 'Los', reasonCode: 'article_number_mismatch:El', why: 'Los — артикль множественного числа. Здесь говорят об одной книге, нужен El.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            { value: 'libre', reasonCode: 'wrong_word:libro', why: 'Libre означает «свободный» — совсем другое слово. Про книгу нужно libro.', trapType: 'phonetic' },
            { value: 'rápido', reasonCode: 'wrong_word:libro', why: 'Rápido — это признак «быстро», он не называет сам предмет. Нужно существительное libro.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — обращение к собеседнику. Оценка темпа чтения книги — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Оценка темпа чтения книги — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'rápida', reasonCode: 'gender_mismatch:rápido', why: 'Rápida — форма женского рода, с -a. Libro мужского рода, поэтому нужна форма на -o: rápido.', trapType: 'grammar' },
            { value: 'caro', reasonCode: 'wrong_word:rápido', why: 'Caro означает «дорого» — про цену, а не про темп чтения. Нужно rápido.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'pero',
          category: 'conjunction',
          distractors: [
            { value: 'o', reasonCode: 'wrong_word:pero', why: 'O предлагает выбор между вариантами, а не противопоставляет два факта. Нужно pero.', trapType: 'semantic_neighbor' },
            { value: 'y', reasonCode: 'wrong_word:pero', why: 'Y просто соединяет, без противопоставления. Здесь темп и значимость расходятся: нужно pero.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'no',
          category: 'negation',
          distractors: [
            { value: 'nada', reasonCode: 'negation_word_mismatch:no', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание значимости — no.', trapType: 'semantic_neighbor' },
            { value: 'non', reasonCode: 'orthographic_invalid:no', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — обращение к собеседнику. Возражение про значимость книги — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Возражение про значимость книги — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'importante',
          category: 'quality-adjective',
          distractors: [
            { value: 'igual', reasonCode: 'antonym_confusion:importante', why: 'Igual означает полное безразличие — здесь же именно невысокая значимость, вопреки быстрому чтению. Нужно importante.', trapType: 'semantic_neighbor' },
            { value: 'bonito', reasonCode: 'wrong_word:importante', why: 'Bonito означает «красиво» — про внешность, а не про значимость. Нужно importante.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'noun_gender', 'gender_agreement_full', 'negation', 'pace_adjective'],
    },
    {
      id: 'es-e01-s22-no-es-igual-el-libro-es-importante',
      english: 'No es igual; el libro es importante',
      russian: 'Это не всё равно; книга важная',
      explanation:
        'Так возражают против безразличия и сразу поясняют почему — называют конкретную причину через книгу. Первая часть безлична (No es igual), вторая называет предмет и его значимость.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nunca', reasonCode: 'negation_word_mismatch:No', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — no.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — обращение к собеседнику. Возражение про безразличие — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Возражение про безразличие — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'igual',
          category: 'invariable-adjective',
          distractors: [
            { value: 'importante', reasonCode: 'antonym_confusion:igual', why: 'Importante уже используется дальше про значимость книги. Первая часть — про безразличие: igual.', trapType: 'semantic_neighbor' },
            { value: 'iguala', reasonCode: 'invariable_adjective_wrongly_inflected:igual', why: 'Igual не меняется по роду — формы iguala не существует.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'el',
          category: 'article',
          distractors: [
            { value: 'la', reasonCode: 'article_gender_mismatch:el', why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен el, а не la.', trapType: 'grammar' },
            { value: 'un', reasonCode: 'wrong_word:el', why: 'Un — другой тип артикля, этот курс использует только el/la. Нужно el.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            { value: 'litro', reasonCode: 'wrong_word:libro', why: 'Litro означает «литр» — звучит похоже, но это другое слово. Про книгу нужно libro.', trapType: 'phonetic' },
            { value: 'igual', reasonCode: 'wrong_word:libro', why: 'Igual уже стояло выше как признак безразличия. Здесь нужно существительное libro.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — обращение к собеседнику. Оценка значимости книги — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Оценка значимости книги — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'importante',
          category: 'quality-adjective',
          distractors: [
            { value: 'único', reasonCode: 'wrong_word:importante', why: 'Único означает «единственный» — про неповторимость, а не про значимость. Нужно importante.', trapType: 'semantic_neighbor' },
            { value: 'bonito', reasonCode: 'wrong_word:importante', why: 'Bonito означает «красиво» — про внешность, а не про значимость. Нужно importante.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'noun_gender', 'negation', 'fixed_reaction'],
    },
    {
      id: 'es-e01-s22-el-libro-no-es-igual-es-importante',
      english: 'El libro no es igual; es importante',
      russian: 'Книга не такая же; она важная',
      explanation:
        'Так подчёркивают, что конкретная книга отличается от прочих именно из-за своей значимости — например, редкое издание среди обычных. Первая часть называет предмет и отрицает схожесть, вторая безлично подтверждает причину.',
      words: [
        {
          correct: 'El',
          category: 'article',
          distractors: [
            { value: 'La', reasonCode: 'article_gender_mismatch:El', why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен El, а не La.', trapType: 'grammar' },
            { value: 'No', reasonCode: 'word_order_invalid:El', why: 'No должно стоять перед связкой, а не в начале вместо артикля. Фраза начинается с El.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            { value: 'litro', reasonCode: 'wrong_word:libro', why: 'Litro означает «литр» — звучит похоже, но это другое слово. Про книгу нужно libro.', trapType: 'phonetic' },
            { value: 'igual', reasonCode: 'wrong_word:libro', why: 'Igual уже используется дальше как признак схожести. Здесь нужно существительное libro.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'no',
          category: 'negation',
          distractors: [
            { value: 'nunca', reasonCode: 'negation_word_mismatch:no', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — no.', trapType: 'semantic_neighbor' },
            { value: 'non', reasonCode: 'orthographic_invalid:no', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — обращение к собеседнику. Возражение про схожесть книги — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Возражение про схожесть книги — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'igual',
          category: 'invariable-adjective',
          distractors: [
            { value: 'iguala', reasonCode: 'invariable_adjective_wrongly_inflected:igual', why: 'Igual не меняется по роду — формы iguala не существует, даже рядом с libro мужского рода.', trapType: 'grammar' },
            { value: 'importante', reasonCode: 'antonym_confusion:igual', why: 'Importante уже используется дальше про значимость книги. Здесь про схожесть: нужно igual.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — обращение к собеседнику. Подтверждение значимости — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Подтверждение значимости — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'importante',
          category: 'quality-adjective',
          distractors: [
            { value: 'único', reasonCode: 'wrong_word:importante', why: 'Único означает «единственный» — про неповторимость, а не про значимость напрямую. Нужно importante.', trapType: 'semantic_neighbor' },
            { value: 'cara', reasonCode: 'wrong_word:importante', why: 'Cara означает «дорогая» — про цену и не тот род (libro мужского рода). Нужно importante.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'noun_gender', 'negation', 'invariable_adjective'],
    },
    {
      id: 'es-e01-s22-el-libro-es-caro-o-es-importante-q',
      english: '¿El libro es caro o es importante?',
      russian: 'Книга дорогая или важная?',
      explanation:
        'Прямой вопрос о приоритете — что решает выбор: цена или значимость книги. El libro встаёт первым, затем связка и оба признака через союз o.',
      words: [
        {
          correct: 'El',
          category: 'article',
          distractors: [
            { value: 'La', reasonCode: 'article_gender_mismatch:El', why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен El, а не La.', trapType: 'grammar' },
            { value: 'Es', reasonCode: 'word_order_invalid:El', why: 'Es — связка, она встанет дальше, после El libro, а не в начале фразы. Нужен артикль El.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            { value: 'litro', reasonCode: 'wrong_word:libro', why: 'Litro означает «литр» — звучит похоже, но это другое слово. Про книгу нужно libro.', trapType: 'phonetic' },
            { value: 'caro', reasonCode: 'wrong_word:libro', why: 'Caro — это признак «дорого», он не называет сам предмет. Нужно существительное libro.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — обращение к собеседнику. Вопрос о книге — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Вопрос о книге — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'caro',
          category: 'quality-adjective-gendered',
          distractors: [
            { value: 'cara', reasonCode: 'gender_mismatch:caro', why: 'Cara — форма женского рода, с -a. Libro мужского рода, поэтому нужна форма на -o: caro.', trapType: 'grammar' },
            { value: 'importante', reasonCode: 'wrong_word:caro', why: 'Importante уже используется дальше во второй половине вопроса. Первая половина — именно про цену: caro.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'o',
          category: 'conjunction',
          distractors: [
            { value: 'y', reasonCode: 'wrong_word:o', why: 'Y означает «и» — соединяет, а не предлагает выбор. Между двумя признаками нужно o.', trapType: 'semantic_neighbor' },
            { value: 'pero', reasonCode: 'wrong_word:o', why: 'Pero противопоставляет два факта в одном утверждении, а не предлагает выбор в вопросе. Нужно o.', trapType: 'semantic_neighbor' },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            { value: 'eres', reasonCode: 'agreement_person_mismatch:es', why: 'Eres — обращение к собеседнику. Вторая часть вопроса о книге — только es.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'agreement_person_mismatch:es', why: 'Soy — про себя. Вторая часть вопроса о книге — только es.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'importante',
          category: 'quality-adjective',
          distractors: [
            { value: 'igual', reasonCode: 'antonym_confusion:importante', why: 'Igual означает безразличие — а вопрос предлагает выбор между двумя конкретными причинами. Нужно importante.', trapType: 'semantic_neighbor' },
            { value: 'barato', reasonCode: 'wrong_word:importante', why: 'Barato означает «дёшево» — прямая противоположность caro, а не про значимость. Нужно importante.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'noun_gender', 'gender_agreement_full', 'question_marks', 'price_adjective'],
    },
  ]);

export const ES_EPISODE_01_SESSION_22_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) => {
      const localizedDetails = ES_SESSION_22_LOCALIZED_DETAILS[phrase.id];
      // зачем не хранить explicit undefined: canonical JSON fail-closed
      // отклоняет non-JSON values, и один отсутствующий optional detail ломал
      // preflight всего испанского authoring-реестра до выдачи DRAFT/HOLD.
      return Object.freeze(
        localizedDetails ? { ...phrase, localizedDetails } : { ...phrase },
      );
    }),
  );
