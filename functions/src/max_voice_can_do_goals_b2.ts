import type { CanDoGoal, LocalizedMaxText } from './max_voice_can_do_goals';

export const B2_GOAL_IDS = [
  'b2_qualify_claim',
  'b2_nuanced_opinion',
  'b2_extended_argument',
  'b2_concession',
  'b2_hypothetical',
  'b2_negotiate',
  'b2_meeting',
  'b2_presentation',
  'b2_interview_advanced',
  'b2_rephrase_clarify',
  'b2_resolve_misunderstanding',
  'b2_formality_register',
  'b2_story_nuanced',
  'b2_problem_solution',
  'b2_news_discussion',
  'b2_collocation',
  'b2_phrasal_nuance',
  'b2_spontaneous_long_turn',
] as const;

function title(
  en: string,
  ru: string,
  uk: string,
  es: string,
  ptBR: string,
  vi: string,
  id: string,
  tr: string,
  pl: string,
): LocalizedMaxText {
  return { en, ru, uk, es, 'pt-BR': ptBR, vi, id, tr, pl };
}

function goal(
  id: typeof B2_GOAL_IDS[number],
  localizedTitle: LocalizedMaxText,
  canDo: string,
  phrases: string[],
  grammar: string,
  sceneIds: string[],
): CanDoGoal {
  return { id, level: 'B2', title: localizedTitle, canDo, phrases, grammar, sceneIds };
}

/** Owned B2 curriculum. No model translation and no fallback to B1 goals. */
export const B2_CAN_DO_GOALS: readonly CanDoGoal[] = Object.freeze([
  goal('b2_qualify_claim', title(
    'Qualify a claim', 'Уточнять утверждение', 'Уточнювати твердження', 'Matizar una afirmación',
    'Qualificar uma afirmação', 'Diễn đạt nhận định có điều kiện', 'Memberi batasan pada klaim',
    'Bir iddiayı nitelemek', 'Precyzować twierdzenie',
  ), 'qualify a claim without weakening the main point',
  ['Generally speaking, …', 'That tends to be true when …', 'I would not go so far as to say …'],
  'hedging-and-stance', ['conspiracy_seatmate']),
  goal('b2_nuanced_opinion', title(
    'A nuanced opinion', 'Аргументированное мнение', 'Аргументована думка', 'Una opinión matizada',
    'Uma opinião com nuances', 'Nêu quan điểm đa chiều', 'Pendapat yang bernuansa',
    'Nüanslı bir görüş', 'Zniuansowana opinia',
  ), 'give and defend a nuanced opinion while acknowledging another view',
  ['From my perspective, …', 'The main reason I see it differently is …', 'There is some truth in that, but …'],
  'stance-and-support', ['conspiracy_seatmate']),
  goal('b2_extended_argument', title(
    'Build an extended argument', 'Строить развёрнутый аргумент', 'Будувати розгорнутий аргумент', 'Construir un argumento extenso',
    'Construir um argumento completo', 'Xây dựng lập luận dài', 'Menyusun argumen panjang',
    'Uzun bir argüman kurmak', 'Budowanie dłuższej argumentacji',
  ), 'structure and sustain an argument across several connected points',
  ['To begin with, …', 'A further consideration is …', 'Taken together, these points suggest …'],
  'discourse-organization', ['surprise_guest_speech']),
  goal('b2_concession', title(
    'Concede and counter', 'Уступать и возражать', 'Погоджуватись і заперечувати', 'Conceder y contraargumentar',
    'Conceder e contra-argumentar', 'Nhượng bộ và phản biện', 'Mengakui lalu menyanggah',
    'Kabul edip karşı çıkmak', 'Ustępstwo i kontrargument',
  ), 'acknowledge another point and respond with a polite counterargument',
  ['I take your point.', 'Even so, …', 'Granted, …, but …'],
  'concession-clauses', ['bill_argument']),
  goal('b2_hypothetical', title(
    'Complex hypotheticals', 'Сложные гипотезы', 'Складні гіпотези', 'Hipótesis complejas',
    'Hipóteses complexas', 'Giả định phức tạp', 'Hipotesis kompleks',
    'Karmaşık varsayımlar', 'Złożone hipotezy',
  ), 'discuss complex hypothetical outcomes and alternatives',
  ['If that were to happen, …', 'Had we known earlier, …', 'Otherwise, we might have …'],
  'mixed-and-inverted-conditionals', ['taxi_wrong_way']),
  goal('b2_negotiate', title(
    'Reach a compromise', 'Находить компромисс', 'Знаходити компроміс', 'Llegar a un acuerdo',
    'Chegar a um acordo', 'Đạt được thỏa hiệp', 'Mencapai kompromi',
    'Uzlaşmaya varmak', 'Osiąganie kompromisu',
  ), 'negotiate terms, make conditional offers and reach a workable compromise',
  ['What if we met halfway?', 'I could agree to that provided …', 'That sounds workable.'],
  'conditional-negotiation', ['bill_argument', 'salesman_talks_you_out']),
  goal('b2_meeting', title(
    'Lead a meeting', 'Вести встречу', 'Вести зустріч', 'Dirigir una reunión',
    'Conduzir uma reunião', 'Điều hành cuộc họp', 'Memimpin rapat',
    'Toplantı yönetmek', 'Prowadzenie spotkania',
  ), 'lead a meeting, clarify contributions and summarise decisions',
  ['Shall we move on to …?', 'Could you clarify what you mean by …?', 'Let me summarise what we have agreed.'],
  'meeting-discourse', ['work_call']),
  goal('b2_presentation', title(
    'Present and answer questions', 'Выступать и отвечать на вопросы', 'Виступати й відповідати на запитання', 'Presentar y responder preguntas',
    'Apresentar e responder perguntas', 'Thuyết trình và trả lời câu hỏi', 'Presentasi dan menjawab pertanyaan',
    'Sunum ve soru yanıtlama', 'Prezentacja i pytania',
  ), 'give a structured presentation and handle follow-up questions',
  ['I would like to draw your attention to …', 'This brings me to …', 'I will come back to that in a moment.'],
  'presentation-signposting', ['surprise_guest_speech']),
  goal('b2_interview_advanced', title(
    'Explain achievements and trade-offs', 'Обсуждать достижения и компромиссы', 'Обговорювати досягнення й компроміси', 'Explicar logros y decisiones',
    'Explicar conquistas e escolhas', 'Trình bày thành tựu và đánh đổi', 'Menjelaskan pencapaian dan pertimbangan',
    'Başarıları ve ödünleri anlatmak', 'Osiągnięcia i kompromisy',
  ), 'discuss achievements, lessons and trade-offs in an advanced interview',
  ['A good example would be …', 'What I learned from that was …', 'In hindsight, I would …'],
  'narrative-evidence', ['condescending_interviewer', 'mistaken_for_boss']),
  goal('b2_rephrase_clarify', title(
    'Rephrase a complex idea', 'Переформулировать сложную мысль', 'Переформулювати складну думку', 'Reformular una idea compleja',
    'Reformular uma ideia complexa', 'Diễn đạt lại ý phức tạp', 'Mengungkapkan ulang gagasan rumit',
    'Karmaşık bir fikri yeniden ifade etmek', 'Przeformułowanie złożonej myśli',
  ), 'reformulate a complex idea clearly after misunderstanding',
  ['Let me put that another way.', 'What I mean is …', 'To be more precise, …'],
  'reformulation', ['looping_support_bot']),
  goal('b2_resolve_misunderstanding', title(
    'Repair a misunderstanding', 'Устранять недопонимание', 'Усувати непорозуміння', 'Resolver un malentendido',
    'Resolver um mal-entendido', 'Giải quyết hiểu lầm', 'Mengatasi kesalahpahaman',
    'Yanlış anlaşılmayı çözmek', 'Wyjaśnianie nieporozumienia',
  ), 'identify the source of a misunderstanding and confirm shared meaning',
  ['I think we may be talking at cross-purposes.', 'That is not quite what I meant.', 'Are we agreed that …?'],
  'clarification-and-confirmation', ['looping_support_bot']),
  goal('b2_formality_register', title(
    'Choose the right register', 'Выбирать подходящий стиль', 'Обирати доречний стиль', 'Elegir el registro adecuado',
    'Escolher o registro adequado', 'Chọn mức độ trang trọng phù hợp', 'Memilih ragam bahasa yang tepat',
    'Uygun resmiyet düzeyini seçmek', 'Dobór odpowiedniego rejestru',
  ), 'switch appropriately between neutral and formal spoken register',
  ['I was wondering whether …', 'Would you mind if …?', 'I appreciate your taking the time.'],
  'register-and-politeness', ['work_call', 'hotel_checkin']),
  goal('b2_story_nuanced', title(
    'Tell a story with viewpoint', 'Рассказывать с авторским взглядом', 'Розповідати з власним поглядом', 'Narrar con punto de vista',
    'Narrar com ponto de vista', 'Kể chuyện có góc nhìn', 'Bercerita dengan sudut pandang',
    'Bakış açısıyla hikâye anlatmak', 'Opowieść z perspektywą',
  ), 'tell a detailed story with viewpoint, emphasis and reflection',
  ['What struck me most was …', 'Little did I know …', 'Looking back, …'],
  'narrative-emphasis', ['party_fast_talk', 'taxi_wrong_way']),
  goal('b2_problem_solution', title(
    'Analyse a problem and solutions', 'Анализировать проблему и решения', 'Аналізувати проблему й рішення', 'Analizar un problema y soluciones',
    'Analisar um problema e soluções', 'Phân tích vấn đề và giải pháp', 'Menganalisis masalah dan solusi',
    'Sorun ve çözümleri analiz etmek', 'Analiza problemu i rozwiązań',
  ), 'analyse likely causes and compare practical solutions and drawbacks',
  ['The issue seems to stem from …', 'One way around this would be …', 'The drawback is …'],
  'cause-solution-evaluation', ['broken_robot_waiter', 'looping_support_bot']),
  goal('b2_news_discussion', title(
    'Discuss news carefully', 'Обсуждать новости без преувеличений', 'Обговорювати новини без перебільшень', 'Comentar noticias con cautela',
    'Discutir notícias com cautela', 'Thảo luận tin tức thận trọng', 'Membahas berita dengan hati-hati',
    'Haberleri dikkatli tartışmak', 'Ostrożne omawianie wiadomości',
  ), 'discuss reported events, distinguish certainty and avoid overclaiming',
  ['According to the report, …', 'It remains unclear whether …', 'The wider implication is …'],
  'reporting-and-epistemic-stance', ['conspiracy_seatmate']),
  goal('b2_collocation', title(
    'Use natural collocations', 'Использовать естественные сочетания', 'Використовувати природні сполучення', 'Usar colocaciones naturales',
    'Usar colocações naturais', 'Dùng cụm từ kết hợp tự nhiên', 'Menggunakan kolokasi alami',
    'Doğal eşdizimler kullanmak', 'Naturalne kolokacje',
  ), 'use high-frequency B2 collocations naturally in a new context',
  ['reach a conclusion', 'raise a concern', 'take responsibility'],
  'lexical-collocation', ['work_call']),
  goal('b2_phrasal_nuance', title(
    'Use nuanced phrasal verbs', 'Точно использовать фразовые глаголы', 'Точно вживати фразові дієслова', 'Usar verbos compuestos con precisión',
    'Usar phrasal verbs com precisão', 'Dùng cụm động từ chính xác', 'Menggunakan phrasal verb dengan tepat',
    'Phrasal verbleri doğru kullanmak', 'Precyzyjne phrasal verbs',
  ), 'use separable and idiomatic phrasal verbs accurately in context',
  ['follow up on', 'rule out', 'come up with'],
  'phrasal-verb-nuance', ['looping_support_bot', 'work_call']),
  goal('b2_spontaneous_long_turn', title(
    'Sustain a spontaneous long turn', 'Говорить развёрнуто без подготовки', 'Говорити розгорнуто без підготовки', 'Mantener un turno largo espontáneo',
    'Sustentar uma fala longa espontânea', 'Nói dài tự nhiên không chuẩn bị', 'Berbicara panjang secara spontan',
    'Doğaçlama uzun konuşmak', 'Dłuższa spontaniczna wypowiedź',
  ), 'sustain a coherent spontaneous two-minute turn with examples and a conclusion',
  ['The way I see it, …', 'To give you an example, …', 'That is why I would argue …'],
  'extended-spoken-discourse', ['surprise_guest_speech']),
]);
