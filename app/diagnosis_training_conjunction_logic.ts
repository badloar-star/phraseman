import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

function conjStep(input: {
  id: string;
  order: number;
  difficulty: DiagnosisTrainingStep['difficulty'];
  targetSkill: string;
  sentence: string;
  translation: TriText;
  options: string[];
  correctAnswer: string;
  correctFeedback: TriText;
  wrong: Record<string, TriText>;
  retry: [TriText, TriText, TriText];
  focusWords: string[];
}): DiagnosisTrainingStep {
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    explanationBlock: tri(
      'Snachala nazovi logiku svyazi: addition, contrast, cause, result, condition, time ili concession.',
      'Spershu nazvy logiku zviazku: addition, contrast, cause, result, condition, time abo concession.',
      'Primero nombra la relacion: adicion, contraste, causa, resultado, condicion, tiempo o concesion.',
    ),
    microTask: tri('Vyberi connector po logike mezhdu dvumya chastyami.', 'Obery connector za logikoiu mizh dvoma chastynamy.', 'Elige el connector segun la logica entre las dos partes.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(
        'Ne sovsem. Smotri ne na perevod slova, a na svyaz: addition, contrast, cause, result, condition ili time.',
        'Ne zovsim. Dyvys ne na pereklad slova, a na zviazok: addition, contrast, cause, result, condition chy time.',
        'No exactamente. Mira la relacion, no solo la traduccion: adicion, contraste, causa, resultado, condicion o tiempo.',
      )])),
    retryFeedback: [
      input.retry[0],
      input.retry[1],
      input.retry[2],
      tri(
        `Podskazka: zdes nuzhen connector "${input.correctAnswer}".`,
        `Pidkazka: tut potriben connector "${input.correctAnswer}".`,
        `Pista: aqui necesitamos "${input.correctAnswer}".`,
      ),
    ],
    fallbackExplanation: tri(
      'And = dobavlenie. But = contrast. Because = prichina. So = rezultat. If = uslovie. When = vremya. Although = nesmotrya na.',
      'And = dodavannia. But = contrast. Because = prychyna. So = rezultat. If = umova. When = chas. Although = nezvazhaiuchy na.',
      'And = adicion. But = contraste. Because = causa. So = resultado. If = condicion. When = tiempo. Although = aunque.',
    ),
    focusWords: input.focusWords,
  };
}

const basicWrong = (correct: string): Record<string, TriText> => ({
  and: tri(`And tolko dobavlyaet. Zdes nuzhna drugaya logika: ${correct}.`, `And lyshe dodaie. Tut potribna insha logika: ${correct}.`, `And solo anade. Aqui necesitamos otra logica: ${correct}.`),
  but: tri(`But pokazyvaet contrast. Zdes nuzhna drugaya logika: ${correct}.`, `But pokazue contrast. Tut potribna insha logika: ${correct}.`, `But muestra contraste. Aqui necesitamos otra logica: ${correct}.`),
  because: tri(`Because vvodit prichinu. Zdes nuzhna drugaya logika: ${correct}.`, `Because vvodyt prychynu. Tut potribna insha logika: ${correct}.`, `Because introduce causa. Aqui necesitamos otra logica: ${correct}.`),
  so: tri(`So vvodit rezultat. Zdes nuzhna drugaya logika: ${correct}.`, `So vvodyt rezultat. Tut potribna insha logika: ${correct}.`, `So introduce resultado. Aqui necesitamos otra logica: ${correct}.`),
  if: tri(`If vvodit uslovie. Zdes nuzhna drugaya logika: ${correct}.`, `If vvodyt umovu. Tut potribna insha logika: ${correct}.`, `If introduce condicion. Aqui necesitamos otra logica: ${correct}.`),
  when: tri(`When vvodit vremya. Zdes nuzhna drugaya logika: ${correct}.`, `When vvodyt chas. Tut potribna insha logika: ${correct}.`, `When introduce tiempo. Aqui necesitamos otra logica: ${correct}.`),
  although: tri(`Although oznachaet "hotya / despite". Zdes nuzhna drugaya logika: ${correct}.`, `Although oznachaie "khocha / despite". Tut potribna insha logika: ${correct}.`, `Although significa aunque. Aqui necesitamos otra logica: ${correct}.`),
});

const rw = (a: string, b: string, c: string): [TriText, TriText, TriText] => [
  tri(a, b, c),
  tri('Because = why, so = result, but = contrast, and = addition.', 'Because = why, so = result, but = contrast, and = addition.', 'Because = causa, so = resultado, but = contraste, and = adicion.'),
  tri('Prochitai dve chasti otdelno i nazovi svyaz mezhdu nimi.', 'Prochytai dvi chastyny okremo i nazvy zviazok mizh nymy.', 'Lee las dos partes por separado y nombra la relacion.'),
];

export const CONJUNCTION_LOGIC_TRAINING: DiagnosisTraining = {
  id: 'conjunction_logic',
  category: 'conjunction',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 16,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('And / But / Because / So / If / When: logika svyazi', 'And / But / Because / So / If / When: logika zviazku', 'And / But / Because / So / If / When: logica de conexion'),
  shortTitle: tri('Connector Logic', 'Connector Logic', 'Connector Logic'),
  shortDiagnosis: tri('Ty putaesh and, but, because, so, if, when i although.', 'Ty plutaiesh and, but, because, so, if, when i although.', 'Confundes and, but, because, so, if, when y although.'),
  diagnosisText: tri(
    'Ty vybiraesh soyuzy po perevodu, a ne po logike svyazi: dobavlenie, contrast, prichina, rezultat, uslovie ili vremya.',
    'Ty obyraiesh spoluchnyky za perekladom, a ne za logikoiu zviazku: dodavannia, contrast, prychyna, rezultat, umova abo chas.',
    'Eliges conectores por traduccion, no por la logica: adicion, contraste, causa, resultado, condicion o tiempo.',
  ),
  mentalModel: tri(
    'And dobavlyaet. But protivopostavlyaet. Because daet prichinu. So daet rezultat. If daet uslovie. When daet vremya. Although daet despite-contrast.',
    'And dodaie. But proty stavyt. Because daie prychynu. So daie rezultat. If daie umovu. When daie chas. Although daie despite-contrast.',
    'And anade. But contrasta. Because da causa. So da resultado. If da condicion. When da tiempo. Although da contraste con concesion.',
  ),
  contrastSet: ['and', 'but', 'because', 'so', 'if', 'when', 'although'],
  coreRule: tri(
    'and = dobavlenie, but = contrast, because = prichina, so = rezultat, if = uslovie, when = vremya, although = nesmotrya na contrast.',
    'and = dodavannia, but = contrast, because = prychyna, so = rezultat, if = umova, when = chas, although = nezvazhaiuchy na contrast.',
    'and = adicion, but = contraste, because = causa, so = resultado, if = condicion, when = tiempo, although = concesion.',
  ),
  whatUserMustLearn: {
    ru: [
      'And soedinyaet dve pohozhie ili dobavochnye idei.',
      'But pokazyvaet contrast.',
      'Because otvechaet na vopros why.',
      'So pokazyvaet result.',
      'If pokazyvaet condition.',
      'When pokazyvaet time.',
      'Although pokazyvaet despite-contrast.',
      'Because i so ne nado menyat mestami.',
    ],
    uk: [
      'And ziednuie dvi skhozhi abo dodatkovi idei.',
      'But pokazue contrast.',
      'Because vidpovidaie na pytannia why.',
      'So pokazue result.',
      'If pokazue condition.',
      'When pokazue time.',
      'Although pokazue despite-contrast.',
      'Because i so ne treba miniaty mistsiamy.',
    ],
    es: [
      'And une dos ideas similares o adicionales.',
      'But muestra contraste.',
      'Because responde a why.',
      'So muestra resultado.',
      'If muestra condicion.',
      'When muestra tiempo.',
      'Although muestra contraste con concesion.',
      'Because y so no se intercambian.',
    ],
  },
  examples: [
    { en: 'I was tired, but I kept working.', ru: 'Ya ustal, no prodolzhil rabotat.', uk: 'Ya vtomyvsia, ale prodovzhyv pratsiuvaty.', es: 'Estaba cansado, pero segui trabajando.', why: tri('Vtoraya chast idet protiv ozhidaniya: but.', 'Druha chastyna ide proty ochikuvannia: but.', 'La segunda parte va contra la expectativa: but.') },
    { en: 'I stayed home because I was sick.', ru: 'Ya ostalsya doma, potomu chto bolel.', uk: 'Ya zalyshyvsia vdoma, tomu shcho khvoriv.', es: 'Me quede en casa porque estaba enfermo.', why: tri('Because vvodit prichinu.', 'Because vvodyt prychynu.', 'Because introduce causa.') },
    { en: 'I was sick, so I stayed home.', ru: 'Ya bolel, poetomu ostalsya doma.', uk: 'Ya khvoriv, tomu zalyshyvsia vdoma.', es: 'Estaba enfermo, asi que me quede en casa.', why: tri('So vvodit rezultat.', 'So vvodyt rezultat.', 'So introduce resultado.') },
    { en: 'If it rains, we will stay inside.', ru: 'Esli poidet dozhd, my ostanemsya vnutri.', uk: 'Yakshcho pide doshch, my zalyshymosia vseredyni.', es: 'Si llueve, nos quedaremos dentro.', why: tri('If vvodit uslovie.', 'If vvodyt umovu.', 'If introduce condicion.') },
    { en: 'When I get home, I will call you.', ru: 'Kogda ya pridu domoi, ya pozvonyu.', uk: 'Koly ya pryidu dodomu, ya podzvoniu.', es: 'Cuando llegue a casa, te llamare.', why: tri('When vvodit vremya.', 'When vvodyt chas.', 'When introduce tiempo.') },
    { en: 'Although it was expensive, I bought it.', ru: 'Hotya eto bylo dorogo, ya kupil eto.', uk: 'Khocha tse bulo doroho, ya kupyv tse.', es: 'Aunque era caro, lo compre.', why: tri('Although vvodit prepyatstvie.', 'Although vvodyt pereshkodu.', 'Although introduce obstaculo.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Soyuz - eto znak logiki, ne prosto perevod.', 'Spoluchnyk - tse znak logiky, ne prosto pereklad.', 'Un conector es una senal logica, no solo una traduccion.') },
    { id: 'intro_rule', type: 'rule', text: tri('Nazovi svyaz, potom vyberi connector.', 'Nazvy zviazok, potim obery connector.', 'Nombra la relacion y luego elige connector.') },
    { id: 'intro_warning', type: 'warning', text: tri('Samaya opasnaya para: because = prichina, so = rezultat.', 'Nainebezpechnisha para: because = prychyna, so = rezultat.', 'La pareja peligrosa: because = causa, so = resultado.') },
  ],
  steps: [
    conjStep({ id: 'conj_easy_001', order: 1, difficulty: 'easy', targetSkill: 'addition_and', sentence: 'I came home ___ made dinner.', translation: tri('Ya prishel domoi i prigotovil uzhin.', 'Ya pryishov dodomu i pryhotuvav vecheriu.', 'Llegue a casa y prepare la cena.'), options: ['and', 'but', 'because', 'although'], correctAnswer: 'and', correctFeedback: tri('Da. Eto dva deistviya podryad. Addition = and.', 'Tak. Tse dvi dii pospil. Addition = and.', 'Si. Son dos acciones seguidas. Adicion = and.'), wrong: basicWrong('and'), retry: rw('Dva deistviya dobavlyayutsya. Addition = and.', 'Dvi dii dodaiutsia. Addition = and.', 'Dos acciones se anaden. Adicion = and.'), focusWords: ['and'] }),
    conjStep({ id: 'conj_easy_002', order: 2, difficulty: 'easy', targetSkill: 'contrast_but', sentence: 'I was tired, ___ I kept working.', translation: tri('Ya ustal, no prodolzhil rabotat.', 'Ya vtomyvsia, ale prodovzhyv pratsiuvaty.', 'Estaba cansado, pero segui trabajando.'), options: ['and', 'but', 'because', 'so'], correctAnswer: 'but', correctFeedback: tri('Da. Tired sozdaet ozhidanie stop, no kept working protiv etogo. Contrast = but.', 'Tak. Tired stvoriuie ochikuvannia stop, ale kept working proty tsoho. Contrast = but.', 'Si. Tired crea expectativa de parar, pero kept working va contra eso. Contraste = but.'), wrong: basicWrong('but'), retry: rw('Vtoraya chast idet protiv pervoi. Contrast = but.', 'Druha chastyna ide proty pershoi. Contrast = but.', 'La segunda parte va contra la primera. Contraste = but.'), focusWords: ['but', 'tired'] }),
    conjStep({ id: 'conj_easy_003', order: 3, difficulty: 'easy', targetSkill: 'addition_and', sentence: 'She opened the app ___ started the lesson.', translation: tri('Ona otkryla app i nachala urok.', 'Vona vidkryla app i pochala urok.', 'Abrio la app y empezo la leccion.'), options: ['and', 'but', 'so', 'if'], correctAnswer: 'and', correctFeedback: tri('Da. Dva posledovatelnyh deistviya bez contrast. Nuzhen and.', 'Tak. Dvi poslidovni dii bez contrast. Potriben and.', 'Si. Dos acciones seguidas sin contraste. Necesitamos and.'), wrong: basicWrong('and'), retry: rw('Action plus action = and.', 'Action plus action = and.', 'Accion mas accion = and.'), focusWords: ['and'] }),
    conjStep({ id: 'conj_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'cause_because', sentence: 'I stayed home ___ I was sick.', translation: tri('Ya ostalsya doma, potomu chto bolel.', 'Ya zalyshyvsia vdoma, tomu shcho khvoriv.', 'Me quede en casa porque estaba enfermo.'), options: ['because', 'so', 'but', 'if'], correctAnswer: 'because', correctFeedback: tri('Da. I was sick obyasnyaet why. Cause = because.', 'Tak. I was sick poiasniuie why. Cause = because.', 'Si. I was sick explica por que. Causa = because.'), wrong: basicWrong('because'), retry: rw('Posle propuska stoit prichina. Cause = because.', 'Pislia propusku stoie prychyna. Cause = because.', 'Despues del hueco esta la causa. Causa = because.'), focusWords: ['because', 'sick'] }),
    conjStep({ id: 'conj_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'result_so', sentence: 'I was sick, ___ I stayed home.', translation: tri('Ya bolel, poetomu ostalsya doma.', 'Ya khvoriv, tomu zalyshyvsia vdoma.', 'Estaba enfermo, asi que me quede en casa.'), options: ['because', 'so', 'but', 'although'], correctAnswer: 'so', correctFeedback: tri('Da. Stayed home - rezultat bolezni. Result = so.', 'Tak. Stayed home - rezultat khvoroby. Result = so.', 'Si. Stayed home es resultado de estar enfermo. Resultado = so.'), wrong: basicWrong('so'), retry: rw('Pervaya chast prichina, vtoraya rezultat. Result = so.', 'Persha chastyna prychyna, druha rezultat. Result = so.', 'Primera parte causa, segunda resultado. Resultado = so.'), focusWords: ['so', 'sick'] }),
    conjStep({ id: 'conj_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'because_so_direction', sentence: 'Choose the correct pair.', translation: tri('Vyberi pravilnuyu paru.', 'Obery pravylnu paru.', 'Elige la pareja correcta.'), options: ['I left because I was tired / I was tired, so I left', 'I left so I was tired / I was tired because I left', 'I left but I was tired / I was tired although I left', 'I left if I was tired / I was tired when I left'], correctAnswer: 'I left because I was tired / I was tired, so I left', correctFeedback: tri('Da. Because pered prichinoi, so pered rezultatom.', 'Tak. Because pered prychynoiu, so pered rezultatom.', 'Si. Because antes de causa, so antes de resultado.'), wrong: {}, retry: rw('Cause: tired. Result: left.', 'Cause: tired. Result: left.', 'Causa: tired. Resultado: left.'), focusWords: ['because', 'so'] }),
    conjStep({ id: 'conj_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'condition_if', sentence: '___ it rains, we will stay inside.', translation: tri('Esli poidet dozhd, my ostanemsya vnutri.', 'Yakshcho pide doshch, my zalyshymosia vseredyni.', 'Si llueve, nos quedaremos dentro.'), options: ['If', 'When', 'Because', 'Although'], correctAnswer: 'If', correctFeedback: tri('Da. Rain mozhet byt ili net. Condition = if.', 'Tak. Rain mozhe buty abo ni. Condition = if.', 'Si. Puede llover o no. Condicion = if.'), wrong: { If: tri('', '', ''), When: tri('When zvuchit kak tochnyi moment. Zdes uslovie, nuzhen if.', 'When zvuchyt yak tochnyi moment. Tut umova, potriben if.', 'When suena como momento seguro. Aqui es condicion: if.'), Because: basicWrong('If').because, Although: basicWrong('If').although }, retry: rw('Mozhet sluchitsya ili net. Condition = if.', 'Mozhe statysia abo ni. Condition = if.', 'Puede ocurrir o no. Condicion = if.'), focusWords: ['if', 'rains'] }),
    conjStep({ id: 'conj_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'time_when', sentence: '___ I get home, I will call you.', translation: tri('Kogda ya pridu domoi, ya pozvonyu.', 'Koly ya pryidu dodomu, ya podzvoniu.', 'Cuando llegue a casa, te llamare.'), options: ['If', 'When', 'Because', 'So'], correctAnswer: 'When', correctFeedback: tri('Da. Rech o momente vremeni. Time = when.', 'Tak. Ydetsia pro moment chasu. Time = when.', 'Si. Hablamos de momento de tiempo. Tiempo = when.'), wrong: { If: tri('If zvuchit kak somnenie. Zdes time, nuzhen when.', 'If zvuchyt yak sumniv. Tut time, potriben when.', 'If suena como duda. Aqui es tiempo: when.'), Because: basicWrong('When').because, So: basicWrong('When').so }, retry: rw('Eto moment vremeni, ne condition. Time = when.', 'Tse moment chasu, ne condition. Time = when.', 'Es momento de tiempo, no condicion. Tiempo = when.'), focusWords: ['when'] }),
    conjStep({ id: 'conj_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'if_when_difference', sentence: 'Choose the correct pair.', translation: tri('Vyberi pravilnuyu paru.', 'Obery pravylnu paru.', 'Elige la pareja correcta.'), options: ['If it rains, I will stay home / When I get home, I will call you', 'When it rains, I will stay home / If I get home, I will call you', 'Because it rains, I will stay home / So I get home, I will call you', 'Although it rains, I will stay home / But I get home, I will call you'], correctAnswer: 'If it rains, I will stay home / When I get home, I will call you', correctFeedback: tri('Da. If dlya condition, when dlya time.', 'Tak. If dlia condition, when dlia time.', 'Si. If para condicion, when para tiempo.'), wrong: {}, retry: rw('Rain = condition. Get home = time moment.', 'Rain = condition. Get home = time moment.', 'Rain = condicion. Get home = momento de tiempo.'), focusWords: ['if', 'when'] }),
    conjStep({ id: 'conj_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'although_concession', sentence: '___ it was expensive, I bought it.', translation: tri('Hotya eto bylo dorogo, ya kupil eto.', 'Khocha tse bulo doroho, ya kupyv tse.', 'Aunque era caro, lo compre.'), options: ['Although', 'Because', 'So', 'And'], correctAnswer: 'Although', correctFeedback: tri('Da. Expensive - prepyatstvie, no pokupka sluchilas. Concession = although.', 'Tak. Expensive - pereshkoda, ale pokupka stalasia. Concession = although.', 'Si. Expensive es obstaculo, pero la compra ocurrio. Concesion = although.'), wrong: { Because: basicWrong('Although').because, So: basicWrong('Although').so, And: basicWrong('Although').and }, retry: rw('Despite-obstacle = although.', 'Despite-obstacle = although.', 'Obstaculo con accion ocurrida = although.'), focusWords: ['although'] }),
    conjStep({ id: 'conj_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'but_contrast', sentence: 'It was expensive, ___ I bought it.', translation: tri('Eto bylo dorogo, no ya kupil eto.', 'Tse bulo doroho, ale ya kupyv tse.', 'Era caro, pero lo compre.'), options: ['but', 'because', 'so', 'if'], correctAnswer: 'but', correctFeedback: tri('Da. Expensive, no bought it. Contrast = but.', 'Tak. Expensive, ale bought it. Contrast = but.', 'Si. Caro, pero lo compre. Contraste = but.'), wrong: basicWrong('but'), retry: rw('Dve chasti konfliktuyut. Contrast = but.', 'Dvi chastyny konfliktuiut. Contrast = but.', 'Las dos partes chocan. Contraste = but.'), focusWords: ['but'] }),
    conjStep({ id: 'conj_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'although_but_structure', sentence: 'Choose the correct pair.', translation: tri('Vyberi pravilnuyu paru.', 'Obery pravylnu paru.', 'Elige la pareja correcta.'), options: ['Although I was tired, I kept working / I was tired, but I kept working', 'But I was tired, I kept working / I was tired, although I kept working', 'Because I was tired, I kept working / I was tired, so I kept working', 'If I was tired, I kept working / I was tired, when I kept working'], correctAnswer: 'Although I was tired, I kept working / I was tired, but I kept working', correctFeedback: tri('Da. Although otkryvaet concession; but stoit mezhdu dvumya chastyami.', 'Tak. Although vidkryvaie concession; but stoie mizh dvoma chastynamy.', 'Si. Although abre concesion; but va entre dos partes.'), wrong: {}, retry: rw('Although..., ... / ..., but ...', 'Although..., ... / ..., but ...', 'Although..., ... / ..., but ...'), focusWords: ['although', 'but'] }),
    conjStep({ id: 'conj_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_logic_choice', sentence: "I wanted to help, ___ I didn't know what to do.", translation: tri('Ya hotel pomoch, no ne znal chto delat.', 'Ya khotiv dopomohty, ale ne znav shcho robyty.', 'Queria ayudar, pero no sabia que hacer.'), options: ['and', 'but', 'because', 'so'], correctAnswer: 'but', correctFeedback: tri('Da. Wanted to help protiv ne znal kak. Contrast = but.', 'Tak. Wanted to help proty ne znav yak. Contrast = but.', 'Si. Queria ayudar contra no sabia como. Contraste = but.'), wrong: basicWrong('but'), retry: rw('Zhelanie vs problema. Contrast = but.', 'Bazhannia vs problema. Contrast = but.', 'Deseo vs problema. Contraste = but.'), focusWords: ['but'] }),
    conjStep({ id: 'conj_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_cause_result_condition', sentence: '___ you need help, call me.', translation: tri('Esli tebe nuzhna pomoshch, pozvoni mne.', 'Yakshcho tobi potribna dopomoha, podzvony meni.', 'Si necesitas ayuda, llamame.'), options: ['If', 'Because', 'So', 'But'], correctAnswer: 'If', correctFeedback: tri('Da. Need help - condition dlya call me. Condition = if.', 'Tak. Need help - condition dlia call me. Condition = if.', 'Si. Need help es condicion para call me. Condicion = if.'), wrong: { Because: basicWrong('If').because, So: basicWrong('If').so, But: basicWrong('If').but }, retry: rw('Nuzhna pomoshch? Togda zvoni. Condition = if.', 'Potribna dopomoha? Todi dzvony. Condition = if.', 'Necesitas ayuda? Entonces llama. Condicion = if.'), focusWords: ['if'] }),
    conjStep({ id: 'conj_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Vyberi pravilnoe predlozhenie.', 'Obery pravylne rechennia.', 'Elige la oracion correcta.'), options: ['I was tired, but I finished the work because it was important.', 'I was tired, because I finished the work but it was important.', 'I was tired, so it was important although I finished the work.', 'I was tired, if I finished the work because it was important.'], correctAnswer: 'I was tired, but I finished the work because it was important.', correctFeedback: tri('Da. But = contrast: tired but finished. Because = prichina: important.', 'Tak. But = contrast: tired but finished. Because = prychyna: important.', 'Si. But = contraste: tired but finished. Because = causa: important.'), wrong: {}, retry: rw('Tired but finished; finished because important.', 'Tired but finished; finished because important.', 'Cansado pero termine; termine porque era importante.'), focusWords: ['but', 'because'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['cause_result_confusion', 'contrast_addition_confusion', 'condition_time_confusion', 'although_but_confusion', 'wrong_connector_logic', 'because_so_double_connector_error', 'if_when_error', 'missing_second_clause_after_although'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Pokazyvaem svyaz mezhdu dvumya chastyami.', 'Pokazuiemo zviazok mizh dvoma chastynamy.', 'Mostramos la relacion entre las dos partes.'),
    depth2: tri('Proshche: cause, result, contrast, condition ili time?', 'Prostishe: cause, result, contrast, condition chy time?', 'Mas simple: causa, resultado, contraste, condicion o tiempo?'),
    depth3: tri('Gotovye pary: because = why, so = result, but = contrast.', 'Hotovi pary: because = why, so = result, but = contrast.', 'Pares listos: because = causa, so = resultado, but = contraste.'),
    depth4: tri('Pochti podskazka: priamo ukazyvaem tip logic link.', 'Maizhe pidkazka: priamo vkazuiemo typ logic link.', 'Casi pista: indicamos el tipo de relacion logica.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Ne perevodi connector otdelno. Addition = and, contrast = but, cause = because, result = so, condition = if, time = when, despite = although.', 'Ne perekladai connector okremo. Addition = and, contrast = but, cause = because, result = so, condition = if, time = when, despite = although.', 'No traduzcas el connector aislado. Adicion = and, contraste = but, causa = because, resultado = so, condicion = if, tiempo = when, aunque = although.') },
    afterThreeWrongInSameExercise: { action: 'show_logic_type_hint_then_retry', card: tri('Sistema pokazhet tip svyazi, no ne vyberet connector za polzovatelya.', 'Systema pokazhe typ zviazku, ale ne obere connector za korystuvacha.', 'El sistema muestra el tipo de relacion, pero no elige el connector.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: snachala vyberi relation type, potom connector.', 'Guided mode: spershu obery relation type, potim connector.', 'Modo guiado: primero elige relation type, luego connector.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_conj_001', prompt: tri('I was tired, ___ I kept working: addition ili contrast?', 'I was tired, ___ I kept working: addition chy contrast?', 'I was tired, ___ I kept working: adicion o contraste?'), options: ['addition', 'contrast'], correctIndex: 1, thenReturnToExerciseId: 'conj_easy_002' },
      { id: 'guided_conj_002', prompt: tri('I stayed home ___ I was sick: I was sick - cause ili result?', 'I stayed home ___ I was sick: I was sick - cause chy result?', 'I stayed home ___ I was sick: I was sick es causa o resultado?'), options: ['cause', 'result'], correctIndex: 0, thenReturnToExerciseId: 'conj_contrast_001' },
      { id: 'guided_conj_003', prompt: tri('I was sick, ___ I stayed home: I stayed home - cause ili result?', 'I was sick, ___ I stayed home: I stayed home - cause chy result?', 'I was sick, ___ I stayed home: I stayed home es causa o resultado?'), options: ['cause', 'result'], correctIndex: 1, thenReturnToExerciseId: 'conj_contrast_002' },
      { id: 'guided_conj_004', prompt: tri('If it rains: rain eto condition ili exact time?', 'If it rains: rain tse condition chy exact time?', 'If it rains: lluvia es condicion o tiempo exacto?'), options: ['condition', 'exact time'], correctIndex: 0, thenReturnToExerciseId: 'conj_contrast_004' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'conjunction',
    microDiagnosisId: 'conjunction_logic',
    diagnosisLabel: tri('Logika soyuzov', 'Logika spoluchnykiv', 'Logica de conectores'),
    contrastSet: ['and', 'but', 'because', 'so', 'if', 'when', 'although'],
    focusWords: ['and', 'but', 'because', 'so', 'if', 'when', 'although'],
    focusPatterns: ['addition_and', 'contrast_but', 'cause_because', 'result_so', 'because_so_direction', 'condition_if', 'time_when', 'if_when_difference', 'although_concession', 'although_but_structure', 'mixed_logic_choice', 'mixed_cause_result_condition', 'mixed_sentence_correction'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_conjunction_logic_start',
    answer: 'diagnosis_training_conjunction_logic_answer',
    mastery: 'diagnosis_training_conjunction_logic_mastery',
    fallback: 'diagnosis_training_conjunction_logic_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'conjunction', microDiagnosisId: 'conjunction_logic', contrastSet: ['and', 'but', 'because', 'so', 'if', 'when', 'although'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logLogicType: true, logConnector: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=conjunction&microDiagnosisId=conjunction_logic',
  },
  qualityChecklist: {
    hasStableId: true,
    hasCategory: true,
    hasMultilingualTitle: true,
    hasPlainDiagnosisText: true,
    hasMentalModel: true,
    hasContrastSet: true,
    hasAtLeastSixExamples: true,
    hasAtLeastTwelveExercises: true,
    hasEasyContrastMixedStructure: true,
    hasDistractorSpecificFeedback: true,
    hasRetryFeedbackLevels: true,
    hasGuidedModeForRepeatedMistakes: true,
    hasMasteryRules: true,
    hasSmartTrainerConfig: true,
    hasAnalyticsPayload: true,
    hasFallbackRoute: true,
  },
};


