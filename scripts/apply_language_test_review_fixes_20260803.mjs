import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const languageIndex = process.argv.indexOf('--language');
const ONLY_LANGUAGE = languageIndex >= 0 ? process.argv[languageIndex + 1] : null;

const italianC1Replacements = {
  'it-c1-009': {
    skill: 'vocabulary', format: 'multiple-choice',
    scenario: 'Interpreting a legal-administrative formula', scenarioRu: 'Интерпретация юридико-административной формулы',
    prompt: 'Choose the paraphrase that preserves the scope of the formal expression.', instructionRu: 'Выберите перефразирование, сохраняющее область действия формального выражения.',
    stimulus: "Il contributo sarà versato entro giugno, fatto salvo l'obbligo del beneficiario di restituire le somme non documentate.",
    answer: "Il pagamento resta previsto, senza pregiudicare l'obbligo di restituire le somme prive di giustificazione.",
    distractors: [
      { text: "Il pagamento avverrà solo dopo che ogni somma sarà stata restituita.", reasonRu: 'Фраза превращает сохранённую обязанность в предварительное условие выплаты.' },
      { text: "Con il pagamento viene cancellato l'obbligo di documentare le spese.", reasonRu: 'Fatto salvo сохраняет обязанность, а не отменяет её.' },
      { text: "La restituzione sostituisce definitivamente il versamento del contributo.", reasonRu: 'В тексте выплата и возможный возврат сосуществуют, а не заменяют друг друга.' },
    ],
    explanation: "Fatto salvo preserves the repayment duty while leaving the announced payment in force.",
    explanationRu: 'Fatto salvo сохраняет обязанность возврата, не отменяя объявленную выплату.',
    targetConstruct: 'scope-preserving interpretation of the formal formula fatto salvo',
    targetConstructRu: 'интерпретация формулы fatto salvo с сохранением области действия обязательств',
    canDoRu: 'Может точно интерпретировать формальную оговорку, сохраняющую отдельное обязательство.',
  },
  'it-c1-031': {
    skill: 'reading', format: 'multiple-choice',
    scenario: 'Evaluating a satisfaction trend under attrition', scenarioRu: 'Оценка динамики удовлетворённости при выбытии участников',
    prompt: 'Choose the conclusion warranted by the response-rate and composition evidence.', instructionRu: 'Выберите вывод, обоснованный данными о доле ответивших и составе выборки.',
    stimulus: "La soddisfazione dichiarata sale dal 68% all'81%. Nello stesso periodo il tasso di risposta scende dal 72% al 31% e l'analisi mostra che gli utenti che avevano aperto un reclamo hanno risposto molto meno degli altri. Il rapporto conclude che il servizio è certamente migliorato.",
    answer: "L'aumento può riflettere un miglioramento, ma il forte calo delle risposte e la perdita selettiva degli utenti insoddisfatti impediscono di attribuirglielo con certezza.",
    distractors: [
      { text: "L'aumento di tredici punti dimostra da solo un miglioramento certo.", reasonRu: 'Вывод игнорирует резкое снижение отклика и систематическое выбытие недовольных.' },
      { text: "Il servizio è certamente peggiorato perché ha risposto meno della metà degli utenti.", reasonRu: 'Низкий отклик создаёт неопределённость, но сам по себе не доказывает ухудшение.' },
      { text: "La diversa composizione non conta, purché la percentuale finale sia superiore.", reasonRu: 'Изменение состава напрямую влияет на сопоставимость процентов.' },
    ],
    explanation: 'Selective non-response can raise the observed satisfaction rate even without an equivalent population-level improvement.',
    explanationRu: 'Избирательный неответ может повысить наблюдаемую удовлетворённость без равного улучшения во всей совокупности.',
    targetConstruct: 'multi-step inference about attrition, selection bias, and limits of before-after comparison',
    targetConstructRu: 'многошаговый вывод о выбытии, смещении отбора и пределах сравнения до и после',
    canDoRu: 'Может ограничить причинный вывод при резком изменении отклика и состава выборки.',
  },
  'it-c1-033': {
    skill: 'reading', format: 'multiple-choice',
    scenario: 'Applying a nested policy exception', scenarioRu: 'Применение вложенного исключения из правила',
    prompt: 'Choose the case that satisfies the rule and every condition of its exception.', instructionRu: 'Выберите случай, который соответствует правилу и всем условиям исключения.',
    stimulus: "L'accesso ai dati grezzi richiede l'approvazione preventiva del responsabile. In emergenza è ammesso un accesso provvisorio senza approvazione, purché il responsabile sia avvisato subito e l'uso venga registrato entro 24 ore. La deroga non si applica ai dati sanitari.",
    answer: "Durante un guasto urgente, un'analista consulta dati tecnici, avvisa subito il responsabile e registra l'accesso entro 24 ore.",
    distractors: [
      { text: "Durante un'urgenza, un medico consulta dati sanitari e registra l'accesso il giorno successivo.", reasonRu: 'Исключение прямо не распространяется на медицинские данные.' },
      { text: "Un'analista consulta dati tecnici non urgenti e avvisa il responsabile dopo 24 ore.", reasonRu: 'Нет чрезвычайной ситуации, а уведомление не является немедленным.' },
      { text: "Durante un guasto, un'analista consulta dati tecnici ma non registra l'uso perché ha avvisato subito.", reasonRu: 'Немедленное уведомление не отменяет обязательную регистрацию в течение 24 часов.' },
    ],
    explanation: 'The case is urgent, excludes health data, provides immediate notice, and satisfies the 24-hour logging condition.',
    explanationRu: 'Случай срочный, не затрагивает медицинские данные, включает немедленное уведомление и регистрацию в течение 24 часов.',
    targetConstruct: 'scope tracking across a general rule, cumulative exception conditions, and an exclusion',
    targetConstructRu: 'отслеживание области действия общего правила, совокупных условий исключения и запрета',
    canDoRu: 'Может применить правило с несколькими совместными условиями и отдельным исключением.',
  },
  'it-c1-035': {
    skill: 'reading', format: 'multiple-choice',
    scenario: 'Calibrating a claim from qualified evidence', scenarioRu: 'Калибровка вывода по оговорённым данным',
    prompt: "Choose the summary that preserves the author's degree of confidence and limitations.", instructionRu: 'Выберите резюме, сохраняющее степень уверенности автора и ограничения.',
    stimulus: "Dopo l'introduzione della procedura, i ritardi registrati sono diminuiti. Tuttavia, il periodo osservato è breve, i ricorsi non sono inclusi e due uffici hanno applicato anche altre misure. I risultati sono promettenti, ma non bastano ancora a dimostrare un effetto stabile e attribuibile alla sola procedura.",
    answer: "I dati iniziali sono compatibili con un beneficio, ma durata, copertura e interventi concomitanti impediscono per ora una conclusione causale e stabile.",
    distractors: [
      { text: "La procedura ha dimostrato definitivamente di eliminare i ritardi in tutti gli uffici.", reasonRu: 'Текст прямо ограничивает устойчивость, охват и причинную атрибуцию.' },
      { text: "Poiché esistono limiti, i dati dimostrano che la procedura non ha alcun effetto.", reasonRu: 'Ограничения ослабляют вывод, но не доказывают отсутствие эффекта.' },
      { text: "Le altre misure confermano che ogni riduzione dipende esclusivamente dalla procedura.", reasonRu: 'Сопутствующие меры мешают, а не помогают приписать эффект одной процедуре.' },
    ],
    explanation: 'The author treats the signal as promising while withholding stable causal attribution because of explicit design limits.',
    explanationRu: 'Автор считает сигнал обнадёживающим, но не делает устойчивого причинного вывода из-за явных ограничений дизайна.',
    targetConstruct: 'stance reconstruction across supportive evidence, methodological limitations, and calibrated causal language',
    targetConstructRu: 'восстановление позиции по поддерживающим данным, ограничениям метода и калиброванной причинной формулировке',
    canDoRu: 'Может сохранить авторскую степень уверенности и пределы причинного вывода.',
  },
  'it-c1-038': {
    skill: 'pragmatics', format: 'multiple-choice',
    scenario: 'Structuring a reversible decision under uncertainty', scenarioRu: 'Структурирование обратимого решения в условиях неопределённости',
    prompt: 'Choose the proposal that turns uncertainty into a bounded, accountable decision.', instructionRu: 'Выберите предложение, превращающее неопределённость в ограниченное и подотчётное решение.',
    stimulus: "La direzione deve decidere oggi se introdurre un nuovo sistema. I dati indicano un possibile vantaggio, ma manca la verifica sulla sicurezza in condizioni di picco. Rinviare di tre mesi ha un costo; un avvio totale sarebbe difficile da revocare.",
    answer: "Autorizziamo per quattro settimane un pilota reversibile sul 10% dei casi: Marta verifica ogni giorno gli indicatori di sicurezza, sospendiamo al superamento della soglia concordata e decidiamo l'estensione il 5 settembre sui dati raccolti.",
    distractors: [
      { text: "Avviamo subito ovunque: l'incertezza sparirà quando il sistema sarà già in uso.", reasonRu: 'Полный труднообратимый запуск не ограничивает риск и не задаёт критерии остановки.' },
      { text: "Rinviamo senza scadenza finché non avremo la certezza assoluta.", reasonRu: 'Предложение требует недостижимой абсолютной уверенности и не управляет стоимостью ожидания.' },
      { text: "Facciamo una piccola prova e poi vedremo come va.", reasonRu: 'Нет срока, владельца, порога остановки, измерений и даты решения.' },
    ],
    explanation: 'The proposal bounds exposure and time, assigns monitoring, defines a stop rule, and schedules an evidence-based decision.',
    explanationRu: 'Предложение ограничивает масштаб и срок, назначает мониторинг, задаёт правило остановки и дату решения по данным.',
    targetConstruct: 'reversible decision design with bounded exposure, owner, monitoring, stop rule, and review date',
    targetConstructRu: 'проектирование обратимого решения с ограниченным масштабом, владельцем, мониторингом, правилом остановки и датой пересмотра',
    canDoRu: 'Может превратить сложную неопределённость в ограниченное, проверяемое и обратимое решение.',
  },
};

const fixes = {
  it: {
    A2: {
      'it-a2-006': { answer: 'Il 12 ho un impegno. Posso arrivare il 13 e tenere la camera?' },
      'it-a2-016': { answer: 'Ho tosse e febbre da tre giorni. Potrei fissare una visita per domani?' },
      'it-a2-020': { answer: 'Ho comprato questa lampada ieri, ma non si accende. Ho lo scontrino: sarebbe possibile sostituirla?' },
      'it-a2-026': { answer: 'Ero malato e ho perso la lezione. Quali esercizi devo recuperare prima della prossima?' },
    },
    B1: {
      'it-b1-009': { answer: 'Il file è arrivato oggi, due giorni tardi. Non posso consegnare domani: invierò la versione verificata venerdì alle 12.', explanation: 'The update gives the factual cause, explains why tomorrow is unsafe, and commits to a specific feasible deadline.', explanationRu: 'Сообщение называет фактическую причину, объясняет невозможность надёжной сдачи завтра и даёт конкретный выполнимый срок.', targetConstruct: 'delay update with factual cause, quality impact, and feasible commitment', targetConstructRu: 'сообщение о задержке с фактической причиной, влиянием на качество и выполнимым обязательством' },
      'it-b1-018': { answer: 'Non posso farti saltare la lista: i criteri valgono per tutti. Usa la lista normale o, se ne hai i requisiti, la procedura urgente.' },
      'it-b1-020': { answer: 'Non propongo di eliminare l’assistenza telefonica: propongo soltanto di chiuderla dopo le 20 nei giorni feriali.' },
      'it-b1-038': { answer: 'Mettiamo a verbale: testeremo il nuovo modulo per due settimane; Luca raccoglierà i commenti e presenterà i risultati venerdì 22.' },
      'it-b1-039': { answer: 'Grazie dell’avviso. Giovedì è confermato o stimato? Appena rispondete aggiorniamo il piano.' },
    },
    B2: {
      'it-b2-009': { answer: 'Mi assumo la responsabilità di non aver verificato che il controllo fosse stato eseguito. Senza quel controllo non possiamo pubblicare tutto domani in sicurezza: possiamo rinviare di due giorni oppure pubblicare domani soltanto la parte già verificata.' },
      'it-b2-017': { answer: 'Mi permetto di segnalare che, secondo il verbale aggiornato, tre sedi hanno firmato e una firma è ancora pendente. Poiché serve prima della pubblicazione comune, possiamo attendere oppure procedere senza la quarta sede.' },
      'it-b2-018': { targetConstruct: 'estimate communication with calibrated status, assumptions, and uncertainty' },
      'it-b2-020': { answer: 'Confermiamo così: Marta integra le osservazioni del cliente entro giovedì alle 16; Luca le invia gli allegati entro mercoledì. Siete d’accordo?', explanation: 'The clarification assigns named people, observable outputs, exact deadlines, and requests confirmation.', explanationRu: 'Уточнение закрепляет названных исполнителей, наблюдаемые результаты и точные сроки, а также запрашивает подтверждение.', targetConstruct: 'accountable commitment with owners, deliverables, deadlines, and confirmation', targetConstructRu: 'проверяемое обязательство с исполнителями, результатами, сроками и подтверждением' },
      'it-b2-029': { answer: 'Ci dispiace che la richiesta sia rimasta invisibile per tre giorni. Il registro mostra che non è stata cancellata, ma assegnata alla coda sbagliata. Correggiamo oggi l’assegnazione e le confermiamo i nuovi tempi.' },
      'it-b2-040': { answer: 'Sei membri approvano l’avvio immediato; due lo approvano soltanto dopo una verifica indipendente. Nessuno si oppone al progetto.' },
    },
    C1: {
      'it-c1-008': { answer: 'Fermiamoci: attribuire gli errori ai nuovi assunti senza dati è ingiusto e dannoso. Esaminiamo invece, caso per caso, errori, processi e cause documentate.' },
      'it-c1-009': { replace: italianC1Replacements['it-c1-009'] },
      'it-c1-025': { answer: 'Per quanto l’ipotesi sia plausibile, non è ancora sostenuta da prove sufficienti.' },
      'it-c1-028': { answer: 'Le interfacce poco chiare sono una causa condivisa, ma restano responsabilità specifiche: ogni referente documenti entro oggi la propria fase e il responsabile coordini domani le correzioni.' },
      'it-c1-030': { answer: 'Domani pubblichiamo i dati verificati e indichiamo la data prevista per integrare le parti ancora aperte: informiamo tempestivamente, rinunciando per ora alla completezza.' },
      'it-c1-031': { replace: italianC1Replacements['it-c1-031'] },
      'it-c1-032': { answer: 'La previsione contiene un doppio conteggio e mi assumo la responsabilità di correggerla. L’entità dipende da tre contratti: oggi presenterò tre scenari; domani non usate la vecchia cifra.', targetConstruct: 'material forecast-error disclosure with ownership, source of uncertainty, scenarios, and decision protection', targetConstructRu: 'раскрытие существенной ошибки прогноза с ответственностью, источником неопределённости, сценариями и защитой решения' },
      'it-c1-033': { replace: italianC1Replacements['it-c1-033'] },
      'it-c1-034': { answer: 'Mi permetto di precisare: secondo il rapporto confermato, due sedi hanno superato il controllo, mentre la sede Nord deve ripetere una prova. Per rilasciare l’autorizzazione comune, dobbiamo quindi escludere la sede Nord oppure rinviare la decisione.' },
      'it-c1-035': { replace: italianC1Replacements['it-c1-035'] },
      'it-c1-038': { replace: italianC1Replacements['it-c1-038'] },
      'it-c1-039': { answer: 'Sono favorevole a un’estensione graduale, ma un test di quattro settimane su un piccolo gruppo non dimostra effetti permanenti in tutta l’azienda.' },
    },
    C2: {
      'it-c2-012': { targetConstruct: 'contrastive concessive framing for surprise and reluctant revision of a prior expectation' },
      'it-c2-031': { answer: 'Nel punto in cui compariva l’affermazione, inseriamo una nota datata che ne registri la rimozione perché falsa e non supportata, senza ripeterne il contenuto.' },
      'it-c2-033': { answer: 'Il termine «progetto pilota» era ambiguo. Sospendiamo l’uso di dati reali e definiamo per iscritto se il pilota si svolgerà internamente o con dieci clienti, oltre a responsabilità e ripartizione dei costi già sostenuti.' },
      'it-c2-037': { answer: 'La maggioranza approva il piano nella forma attuale; la minoranza non lo approva ora, ma lo sosterrebbe se prima dell’avvio fosse aggiunto un controllo indipendente.' },
    },
  },
  de: {
    A2: {
      'de-a2-033': { answer: 'Gern, ich komme nach dem Kurs etwas später. Soll ich etwas zu essen mitbringen?', explanation: 'The response accepts, gives a feasible post-course arrival window, and asks a useful preparation question.', explanationRu: 'Ответ принимает приглашение, называет выполнимое время после курса и задаёт полезный вопрос о подготовке.' },
      'de-a2-034': { answer: 'Du solltest heute zwei Wecker stellen, damit du rechtzeitig aufstehst.' },
      'de-a2-037': { answer: 'Entschuldigt bitte, ich habe versehentlich die alte Liste geschickt. Hier ist die aktuelle Version; die zwei Änderungen sind markiert.' },
      'de-a2-040': { answer: 'Seit gestern funktioniert die Heizung nicht; in der Wohnung sind es nur 15 Grad. Bitte schicken Sie heute jemanden zur Reparatur und nennen Sie mir die Uhrzeit.' },
    },
    B1: {
      'de-b1-031': { answer: 'Klare Struktur; die Diagramme auf zwei Folien waren hinten unlesbar. Bitte Schrift vergrößern und weniger Werte zeigen.' },
      'de-b1-034': { answer: 'Mit den zwei priorisierten Aufgaben schaffe ich bis Freitag nur eine zweiseitige Zusammenfassung; den vollständigen Bericht bis Dienstag. Was hat Vorrang?' },
      'de-b1-036': { answer: 'Der morgige Kurs fällt wegen des Ausfalls der Lehrkraft aus. Sie können einen Ersatztermin oder eine Erstattung wählen; das Formular kommt heute.' },
      'de-b1-038': { answer: 'Entschuldigung, ich habe die Einladung vergessen; dadurch wurde der Termin verschoben und Sie müssen neu planen. Heute schlage ich einen neuen Termin vor, künftig prüfe ich den Versand.' },
    },
    B2: {
      'de-b2-024': { answer: 'Verband: alle Kosten sinken; Kritiker: Zweifel; Autorin: Einsparung hypothetisch, Verteilungsfrage offen.' },
      'de-b2-033': { answer: 'Marketing möchte das Marktfenster nutzen; das Sicherheitsteam will zuerst zwei Risiken klären. Ein begrenzter Test ist unser gemeinsamer Weg, sobald keine kritischen Risiken mehr offen sind.' },
      'de-b2-035': { answer: 'Wir halten das Budget ein: voller Umfang zwei Wochen später oder Kernfunktionen zum ursprünglichen Termin und der Rest danach.' },
      'de-b2-036': { answer: 'Unsere fehlerhafte Nachricht hat Sie unnötig belastet; das tut uns leid. Grund war die fehlgeschlagene Zahlung, nicht Ihr Alter. Wir klären sie und stellen den Zugang wieder her.' },
      'de-b2-037': { answer: 'Die Kosten liegen 20 % über Budget; ich habe zu spät eskaliert. Morgen lege ich Zahlen zu Erhöhung und Umfangskürzung vor; dann entscheiden wir.' },
    },
    C1: {
      'de-c1-024': { answer: 'Hersteller: nahezu fehlerfrei; Aufsicht: Ausnahmen offen; Autor: niedrige Quote hypothetisch, Verteilung zu prüfen.' },
      'de-c1-028': { answer: 'Die Ursachen können gemeinsam sein; trotzdem benennt jede beteiligte Person ihre Prüfschritte, und wir klären die Zuständigkeiten bis morgen.', explanation: 'The response allows for shared causes while requiring individual review steps and a deadline for assigning responsibilities.', explanationRu: 'Ответ допускает общие причины, но требует назвать индивидуальные шаги проверки и установить срок распределения ответственности.' },
      'de-c1-032': { answer: 'Prognose 15 % niedriger; ich habe zu spät eskaliert. Morgen folgen Szenarien für eine neue Investitionsentscheidung.' },
      'de-c1-036': { explanation: 'The follow-up makes the commitment observable by naming who does what, by when, and how completion is confirmed.', explanationRu: 'Уточнение делает обязательство проверяемым: кто, что и к какому сроку делает, а также как подтверждает завершение.', targetConstruct: 'accountable commitment with owner, deliverable, deadline, and confirmation', targetConstructRu: 'проверяемое обязательство с исполнителем, результатом, сроком и подтверждением' },
      'de-c1-037': { answer: 'Die zweitägige Unsichtbarkeit war nicht akzeptabel. Der Eintrag blieb gespeichert, war aber falsch zugeordnet; wir korrigieren das heute.' },
      'de-c1-038': { answer: 'Fakt: Der Liefertermin ist verstrichen. Auswirkung: kein vollständiger Start am Montag. Unsicherheit: neuer Termin offen. Entscheidung heute: Teilstart oder Verschiebung.' },
    },
    C2: {
      'de-c2-026': { answer: 'Bearbeitungszeit vermittelt offenbar den Effekt; Erfahrung ist ausgeglichen, die negative Kontrolle unauffällig.' },
      'de-c2-032': { answer: 'Absolute Sicherheit ist unerreichbar. Wegen der Lebensgefahr evakuieren wir, sobald zwei unabhängige Warnindikatoren anschlagen; neue Messungen aktualisieren die Entscheidung.' },
      'de-c2-035': { answer: 'Unsere Regel benachteiligte Bewerbende und entzog Chancen. Dafür tragen wir unabhängig von individuellen Absichten Verantwortung; wir entschuldigen uns, überprüfen alle betroffenen Entscheidungen und korrigieren festgestellte Benachteiligungen.' },
      'de-c2-039': { answer: 'Wir prüfen beide Definitionen und ihre Folgen. Dann sprechen beide ohne Unterbrechung gleich lang; weder Dienstalter noch vermutete Motive entscheiden.' },
    },
  },
  es: {
    B2: {
      'es-b2-001': { stimulus: 'Después de revisar los costes, los riesgos y las opiniones del equipo, la dirección estaba por fin preparada para ______ una decisión.' },
      'es-b2-019': { stimulus: 'El lunes, la directora preguntó: «¿Cuándo recibirán los clientes la actualización?». La actualización llegó el martes. El viernes recordamos la pregunta: «La directora preguntó cuándo ______ la actualización».', explanation: 'From the Friday reporting point, the Tuesday receipt is future relative to Monday but already past; the embedded question therefore uses recibirían.', explanationRu: 'С точки зрения пятницы получение во вторник было будущим относительно понедельника, но уже относится к прошлому; поэтому в косвенном вопросе используется recibirían.' },
      'es-b2-022': { answer: 'Una analista financiera comunica su intención con 48 horas de antelación y trabaja desde casa en la última semana del trimestre después de obtener una autorización escrita por una causa justificada.', explanation: 'The analyst satisfies the general 48-hour notice rule and the written-authorisation exception for the finance team.', explanationRu: 'Аналитик соблюдает общее правило уведомления за 48 часов и получает письменное разрешение, предусмотренное исключением для финансовой команды.' },
    },
    C1: {
      'es-c1-001': { replace: {
        skill: 'vocabulary', format: 'multiple-choice', scenario: 'Precise risk-management verb', scenarioRu: 'Точный глагол управления рисками',
        prompt: 'Choose the verb that matches the documented risk-management operation.', instructionRu: 'Выберите глагол, точно обозначающий описанную операцию управления рисками.',
        stimulus: 'La comisión no se limitó a enumerar los riesgos: los comparó por probabilidad e impacto antes de decidir. En el informe formal, esa operación se describe como ______ los riesgos.',
        answer: 'evaluar',
        distractors: [
          { text: 'asumir', reasonRu: 'Asumir означает принять риск, а не сопоставить его вероятность и влияние.' },
          { text: 'eludir', reasonRu: 'Eludir означает избежать риска, а не оценить его по критериям.' },
          { text: 'transferir', reasonRu: 'Transferir означает передать риск другой стороне, а не проанализировать его.' },
        ],
        explanation: 'Evaluar los riesgos means analysing them by criteria such as probability and impact; the other verbs mean accepting, avoiding, or shifting them.',
        explanationRu: 'Evaluar los riesgos означает анализировать риски по таким критериям, как вероятность и влияние; остальные глаголы обозначают принятие, избегание или передачу риска.',
        targetConstruct: 'register-sensitive distinction among standard risk-management collocations', targetConstructRu: 'регистрово точное различение стандартных сочетаний из сферы управления рисками',
        canDoRu: 'Может точно различать действия по оценке, принятию, избеганию и передаче риска.',
      } },
      'es-c1-038': { answer: 'Lamentamos el fallo en la notificación que le hizo perder el plazo. El criterio relativo a la jornada parcial no cambió; revisaremos su ayuda.', explanation: 'The reply acknowledges the documented notification failure and missed deadline, corrects the unsupported claim about the eligibility criterion, and offers a review without making a broader unsupported finding.', explanationRu: 'Ответ признаёт подтверждённый сбой уведомления и пропущенный срок, исправляет неподтверждённое утверждение о критерии права на помощь и предлагает пересмотр.' },
    },
    C2: {
      'es-c2-034': { answer: 'Los datos se entregarán una vez finalizadas las verificaciones y, en todo caso, dentro de los 60 días siguientes a la firma del acuerdo. Si se prevé un retraso, se documentarán la causa y el nuevo plazo y se activará una revisión conjunta.', explanation: 'The wording preserves the verification dependency, defines the 60-day period from signature, and requires a documented cause, new deadline, and joint review if delay is expected.', explanationRu: 'Формулировка сохраняет зависимость от проверки, задаёт 60-дневный срок от подписания соглашения и требует задокументировать причину, новый срок и совместный пересмотр при ожидаемой задержке.', ambiguityTailEn: 'Each alternative omits or violates at least one required dependency, boundary, or review mechanism.', ambiguityTailRu: 'Каждый другой вариант не соблюдает как минимум одно обязательное условие: завершение проверки, предельный срок или механизм пересмотра.' },
      'es-c2-035': { stimulus: 'El comité ha decidido por consenso operativo lanzar el piloto y ha acordado un umbral de riesgo que obligará a revisarlo. Una integrante sigue creyendo que el riesgo está infravalorado, quiere que conste su posición y debe colaborar con la ejecución acordada.' },
      'es-c2-037': { stimulus: 'Un periodista pregunta: «¿Cuántas familias abandonaron ustedes cuando recortaron todas las ayudas?». No se eliminaron todas: terminó una ayuda temporal para 120 hogares, 94 pasaron a otros programas y la revisión de los 26 casos restantes concluirá el viernes.' },
    },
  },
  fr: {
    A1: {
      'fr-a1-019': { prompt: 'Choose the sentence that correctly restates the description.' },
      'fr-a1-034': { targetConstruct: 'polite availability inquiry with avez-vous' },
    },
    A2: {
      'fr-a2-006': { answer: 'Mon train est annulé. Je ne peux pas arriver le 12 juin. Est-ce que je peux arriver le 13 et garder la même réservation ?' },
      'fr-a2-016': { answer: 'Bonjour, j’ai mal à la gorge depuis trois jours. Avez-vous un rendez-vous demain après-midi ?' },
      'fr-a2-020': { answer: 'Bonjour, j’ai acheté cette bouilloire hier, mais elle ne s’allume pas. Voici le ticket. Est-ce que je peux l’échanger ?' },
      'fr-a2-026': { answer: 'J’ai manqué le cours à cause d’un rendez-vous médical. Quelles pages dois-je lire et quel travail dois-je rendre ?' },
      'fr-a2-040': { answer: 'Je ne peux pas participer mardi à 15 h. Est-ce que mercredi à 10 h ou jeudi à 14 h vous conviendrait ?' },
    },
    B1: {
      'fr-b1-009': { answer: 'Le composant indispensable a été livré avec deux jours de retard, donc les tests finiront mercredi au lieu de lundi. Nous réorganisons le planning et je vous confirmerai l’avancement avant 16 h.' },
      'fr-b1-018': { answer: 'Je ne peux pas faire passer ta demande avant les autres sans motif prévu par la procédure, mais je peux vérifier que ton dossier est complet avant son examen dans l’ordre normal.' },
      'fr-b1-020': { answer: 'Je propose seulement un essai d’un mois, deux jours par semaine, avant toute décision ; il ne s’agit pas de fermer définitivement le bureau.' },
      'fr-b1-027': { answer: 'Des participants au cours ayant déjà reçu des commentaires lors de l’atelier.' },
      'fr-b1-038': { answer: 'Le groupe retient le modèle B ; Nadia demandera le devis définitif et l’enverra à Marc avant jeudi midi.' },
      'fr-b1-039': { answer: 'Merci de nous avoir prévenus. Pouvez-vous confirmer aujourd’hui la première date de livraison possible et les quantités disponibles, afin que nous évaluions une solution de remplacement ?', explanation: 'The response acknowledges the update, requests actionable information by a clear deadline, and identifies the next decision step.', explanationRu: 'Ответ признаёт сообщение, запрашивает необходимую для действий информацию к чёткому сроку и обозначает следующий шаг для принятия решения.' },
    },
    B2: {
      'fr-b2-006': { answer: 'Publier les données ligne par ligne est nécessaire pour révéler les trajets peu fiables ; le risque de complexité doit être traité par une meilleure présentation, non par l’opacité.' },
      'fr-b2-009': { answer: 'Nous avons détecté tardivement une erreur de calcul dont nous assumons la responsabilité. La corriger reporte le lancement de trois jours ; sinon, les résultats clients seraient faux. Nous proposons soit de décaler le lancement, soit d’en réduire le périmètre après avoir informé les clients.' },
      'fr-b2-013': { targetConstruct: 'bien que + present subjunctive in a concessive relation', explanation: 'Bien que requires the subjunctive; soit terminée describes the current completed state of the review.' },
      'fr-b2-029': { answer: 'Nous sommes désolés pour l’interruption d’accès. Votre compte n’a pas été supprimé : il est bloqué, et l’avertissement n’a pas été envoyé à cause de notre erreur. Nous vérifions la situation aujourd’hui et le réactiverons sous 24 h.' },
      'fr-b2-032': { targetConstruct: 'structural change distinguished from marginal, temporary, and easily reversible change' },
      'fr-b2-034': { answer: 'Le signalement tardif de l’incident par la direction en a aggravé l’impact.' },
      'fr-b2-039': { answer: 'Deux virements sur vingt ont échoué et la cause reste inconnue. Un lancement demain exposerait environ 8 000 paiements. Décidons-nous de suspendre le lancement ou de le limiter à un groupe étroitement surveillé ?' },
      'fr-b2-040': { answer: 'Le pilote est approuvé à l’unanimité ; trois membres ne soutiennent un démarrage lundi que si un contrôle indépendant est nommé avant vendredi.' },
    },
    C1: {
      'fr-c1-007': { answer: 'La publication des données est nécessaire au contrôle public, mais elle reste insuffisante sans mesures favorisant leur compréhension et un usage équitable.' },
      'fr-c1-008': { answer: 'Cette généralisation fondée sur l’origine nationale n’est pas étayée. Revenons aux faits et au fonctionnement du processus, sans faire porter à notre collègue un stéréotype.' },
      'fr-c1-010': { answer: 'Une réserve nuancée.', targetConstruct: 'nuanced reservation limiting the scope of an accepted result', explanation: "The speaker accepts the local result but narrows the conclusion's scope, which is a nuanced reservation." },
      'fr-c1-014': { answer: 'La directrice a rappelé que, la semaine précédente, le juriste avait exigé que le contrat soit révisé avant que le conseil ne se prononce ce jour-là.' },
      'fr-c1-015': { answer: 'Quant au délai, il est acceptable ; en revanche, le coût reste trop élevé.' },
      'fr-c1-016': { answer: 'Comparons la charge, sa durée probable et le coût de trois options — réaffectation, renfort temporaire et recrutements — puis décidons dans six semaines à partir de ces critères.' },
      'fr-c1-020': { stimulus: 'Le questionnaire donne presque le même score lorsqu’une personne le remplit deux fois, et l’échantillon interrogé ressemble à la population visée. Pourtant, il ne détecte qu’un cas réel sur trois.' },
      'fr-c1-025': { answer: 'Aussi convaincant que paraisse le résultat, il ne permet pas à lui seul de généraliser.' },
      'fr-c1-030': { answer: 'Déployons le système pendant quatre semaines sur les cas simples, avec contrôle humain pour les cas rares, un seuil d’arrêt défini à l’avance et une revue finale : nous gagnerons du temps sur les cas simples tout en acceptant un coût de contrôle pour limiter le risque.' },
      'fr-c1-032': { answer: 'Notre prévision sous-estime la demande de 18 % et je n’ai pas vu l’écart assez tôt. Nous vérifions deux scénarios — effet saisonnier temporaire ou sous-estimation durable due à une donnée manquante — et, pour l’achat de demain, je recommande la quantité basse avec une option d’extension jusqu’à la vérification.', explanationRu: 'Сообщение количественно описывает и признаёт ошибку, сохраняет причинную неопределённость, рассматривает два ограниченных сценария и адаптирует ближайшее решение.' },
      'fr-c1-034': { answer: 'Sauf erreur de ma part, l’annexe signée valide huit sites et classe les deux autres comme « non évalués ». Comme l’autorisation porte sur les dix sites, nous devons soit la limiter aux huit, soit compléter l’évaluation.' },
    },
    C2: {
      'fr-c2-005': { answer: 'Elle accepte la suspension temporaire de l’examen de sa demande.' },
      'fr-c2-029': { answer: 'Mesurer le débit, le taux de réouverture et la qualité, en pondérant les résultats selon la complexité des dossiers.' },
      'fr-c2-034': { answer: 'Je refuse de citer cette phrase seule, car elle ferait croire à tort que la sécurité est établie. Disons qu’aucun danger immédiat n’a été détecté, tout en précisant que plusieurs zones essentielles restent à examiner.' },
      'fr-c2-035': { answer: 'Nous nous excusons pour cette exclusion et le préjudice qu’elle a causé. L’institution assume sa responsabilité, rouvre la consultation et enquête sur les causes sans préjuger de l’intention.' },
      'fr-c2-036': { answer: 'Suspendons l’activité pendant 24 h, fixons avant le contrôle le critère de reprise, puis décidons à partir du résultat.' },
      'fr-c2-037': { answer: 'Le plan est adopté à la majorité ; la minorité indique qu’elle le soutiendrait si un contrôle indépendant avait lieu avant le lancement.' },
    },
  },
};

function patchSource(language, level, levelFixes) {
  const candidatePath = path.join(ROOT, 'content', 'language-test-pilots', language, 'candidate-bank', `${level}.json`);
  const sourcePath = path.join(ROOT, 'content', 'language-test-pilots', language, 'candidate-bank', 'sources', `${level}.json`);
  const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  for (const [questionId, patch] of Object.entries(levelFixes)) {
    const question = candidate.questions.find(({ id }) => id === questionId);
    if (!question) throw new Error(`${questionId}: candidate question not found`);
    const sourceIndex = source.items.findIndex(({ stimulus }) => stimulus === question.stimulus);
    if (sourceIndex < 0) throw new Error(`${questionId}: source item not found`);
    if (patch.replace) source.items[sourceIndex] = structuredClone(patch.replace);
    else Object.assign(source.items[sourceIndex], patch);
  }
  if (WRITE) fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 2)}\n`, 'utf8');
  console.log(`${language}/${level}: ${Object.keys(levelFixes).length} source fixes ${WRITE ? 'written' : 'ready'}`);
}

for (const [language, levels] of Object.entries(fixes)) {
  if (ONLY_LANGUAGE && language !== ONLY_LANGUAGE) continue;
  for (const [level, levelFixes] of Object.entries(levels)) patchSource(language, level, levelFixes);
}

// German C2 item 001 also needs one distractor and its linked metadata corrected.
if (WRITE && (!ONLY_LANGUAGE || ONLY_LANGUAGE === 'de')) {
  const sourcePath = path.join(ROOT, 'content', 'language-test-pilots', 'de', 'candidate-bank', 'sources', 'C2.json');
  const candidate = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'language-test-pilots', 'de', 'candidate-bank', 'C2.json'), 'utf8'));
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const question = candidate.questions.find(({ id }) => id === 'de-c2-001');
  const item = source.items.find(({ stimulus }) => stimulus === question.stimulus);
  const distractor = item.distractors.find(({ text }) => text === 'hinfällig begründet')
    ?? item.distractors.find(({ text }) => text === 'entscheidungsreif');
  if (!distractor) throw new Error('de-c2-001 distractor not found');
  distractor.text = 'entscheidungsreif';
  distractor.reasonRu = 'Entscheidungsreif означало бы, что заявление готово к рассмотрению по существу; здесь предмет решения уже исчез.';
  for (const field of ['targetConstruct', 'targetConstructRu']) item[field] = item[field].replaceAll('hinfällig', 'entscheidungsreif');
  fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 2)}\n`, 'utf8');
  console.log('de/C2: de-c2-001 terminology fix written');
}
