(function installLearningV2OwnerEpisodeEditor(globalScope) {
  "use strict";

  const REQUIRED_FAMILIES = Object.freeze([
    "phrase_builder",
    "listen_choose",
    "sound_contrast",
    "listen_build_dictation",
    "context_gap_grammar",
    "speed_match",
    "scripted_repeat_compare",
  ]);
  const CHOICE_FAMILIES = new Set([
    "listen_choose",
    "sound_contrast",
    "context_gap_grammar",
    "speed_match",
  ]);
  const PURPOSES = Object.freeze([
    "intro_comprehension_check",
    "intro_comprehension_check",
    "intro_comprehension_check",
    "supported_practice",
    "supported_practice",
    "guided_practice",
    "guided_practice",
    "retrieval_practice",
    "near_transfer",
    "independent_check",
    "interleaved_review",
    "independent_check",
  ]);
  const PURPOSE_LABELS = Object.freeze({
    intro_comprehension_check: "Проверка понимания интро",
    supported_practice: "Практика с поддержкой",
    guided_practice: "Направляемая практика",
    retrieval_practice: "Воспроизведение по памяти",
    near_transfer: "Применение в похожей ситуации",
    independent_check: "Самостоятельная проверка",
    interleaved_review: "Возврат к прошлому материалу",
  });
  const FAMILY_LABELS = Object.freeze({
    phrase_builder: "Собрать фразу",
    listen_choose: "Прослушать и выбрать",
    sound_contrast: "Различить звучание",
    listen_build_dictation: "Собрать услышанное",
    context_gap_grammar: "Выбрать форму в контексте",
    speed_match: "Быстро сопоставить",
    scripted_repeat_compare: "Произнести и сравнить",
  });
  const REFERENCE_SESSIONS = Object.freeze([
    {
      title: "Hello, I’m… — первое знакомство",
      paragraphs: [
        "Use Hello or Hi to begin a friendly conversation. Use I’m + your name to introduce yourself: I’m Maya.",
        "I’m is the natural spoken form of I am. Keep the pattern together: Hello, I’m Maya.",
      ],
      concepts: [
        [
          "Hello / Hi",
          "Both start a conversation. Hello is neutral; Hi is a little more informal.",
        ],
        ["I’m + name", "Use I’m before your name: I’m Maya."],
        [
          "Nice to meet you",
          "Say this after you and another person exchange names.",
        ],
      ],
      questions: [
        [
          "Which greeting works in a neutral first meeting?",
          "Hello",
          "Good night",
        ],
        ["Which pattern introduces your name?", "I’m Maya.", "I Maya."],
        [
          "What do you say after exchanging names?",
          "Nice to meet you.",
          "See you yesterday.",
        ],
      ],
      phrases: [
        "Hello, I’m Maya.",
        "Hi, I’m Leo.",
        "Nice to meet you.",
        "I’m Alex.",
        "Hello, I’m Nina.",
        "Nice to meet you, Leo.",
        "Hi, I’m Sam.",
        "Hello, I’m Ana.",
        "I’m Maya. Nice to meet you.",
      ],
    },
    {
      title: "What’s your name? — спросить имя",
      paragraphs: [
        "Ask What’s your name? when you want to know a person’s name. What’s is the spoken form of What is.",
        "Answer with My name is… or the shorter I’m…. In a friendly conversation, both are natural.",
      ],
      concepts: [
        [
          "What’s your name?",
          "A direct, neutral question for a person’s name.",
        ],
        ["My name is…", "A complete answer: My name is Daniel."],
        [
          "You can call me…",
          "Use this to give the name you prefer people to use.",
        ],
      ],
      questions: [
        [
          "Which question asks for a person’s name?",
          "What’s your name?",
          "Where do you live?",
        ],
        [
          "Which is a complete answer?",
          "My name is Daniel.",
          "My name Daniel.",
        ],
        [
          "Which phrase gives a preferred name?",
          "You can call me Dan.",
          "You call I Dan.",
        ],
      ],
      phrases: [
        "What’s your name?",
        "My name is Daniel.",
        "You can call me Dan.",
        "I’m Sofia.",
        "What’s your name, please?",
        "My name is Leo.",
        "You can call me Mia.",
        "Hi, what’s your name?",
        "My name is Ana, but you can call me Annie.",
      ],
    },
    {
      title: "I’m from… — страна и происхождение",
      paragraphs: [
        "Use I’m from + place to say where you come from: I’m from Poland. Ask Where are you from?",
        "Use a country after from. Do not add a before most country names.",
      ],
      concepts: [
        [
          "I’m from + place",
          "Use from before the country or city you come from.",
        ],
        [
          "Where are you from?",
          "This asks about a person’s country or place of origin.",
        ],
        ["Country without a", "Say from Spain, not from a Spain."],
      ],
      questions: [
        [
          "Which sentence gives your country?",
          "I’m from Poland.",
          "I’m Poland.",
        ],
        [
          "Which question asks about origin?",
          "Where are you from?",
          "What is your job?",
        ],
        ["Which form is natural?", "She’s from Spain.", "She’s from a Spain."],
      ],
      phrases: [
        "I’m from Poland.",
        "Where are you from?",
        "She’s from Spain.",
        "I’m from Dublin.",
        "He’s from Brazil.",
        "Are you from Ireland?",
        "We’re from Ukraine.",
        "Where is Ana from?",
        "I’m from Poland, but I live in Ireland.",
      ],
    },
    {
      title: "I live in… — место проживания",
      paragraphs: [
        "Use I live in + city or country for your current home. This can be different from where you are from.",
        "Ask Where do you live? Use do in the question, but not in the answer.",
      ],
      concepts: [
        [
          "I live in + place",
          "This tells someone your current city or country.",
        ],
        ["Where do you live?", "Use do to form the present-simple question."],
        [
          "from vs live in",
          "From gives origin; live in gives your current home.",
        ],
      ],
      questions: [
        [
          "Which sentence gives a current home?",
          "I live in Cork.",
          "I from Cork.",
        ],
        ["Which question is correct?", "Where do you live?", "Where you live?"],
        [
          "Which pair can both be true?",
          "I’m from Spain. I live in Ireland.",
          "I live from Ireland.",
        ],
      ],
      phrases: [
        "I live in Cork.",
        "Where do you live?",
        "She lives in Dublin.",
        "I live near the centre.",
        "Do you live in Ireland?",
        "He lives in Madrid.",
        "We live in a small town.",
        "Where does Mia live?",
        "I’m from Spain, and I live in Cork now.",
      ],
    },
    {
      title: "am, is, are — кто есть кто",
      paragraphs: [
        "Use am with I, is with he, she, or it, and are with you, we, or they.",
        "In conversation, the short forms are common: I’m, she’s, we’re, they’re.",
      ],
      concepts: [
        ["I am / I’m", "Am only goes with I."],
        ["he/she is", "Use is for one other person or thing."],
        ["you/we/they are", "Use are with you and with plural subjects."],
      ],
      questions: [
        ["Which form follows I?", "I am ready.", "I is ready."],
        ["Which form follows she?", "She is here.", "She are here."],
        ["Which form follows they?", "They are friends.", "They is friends."],
      ],
      phrases: [
        "I am ready.",
        "She is here.",
        "They are friends.",
        "We’re new here.",
        "Are you ready?",
        "He’s from Cork.",
        "I’m not late.",
        "They’re very friendly.",
        "I’m Ana, she’s Mia, and we’re friends.",
      ],
    },
    {
      title: "What do you do? — профессия",
      paragraphs: [
        "Ask What do you do? to ask about someone’s work. Answer I’m a/an + job or I work in + place or field.",
        "Use a before a consonant sound and an before a vowel sound: a designer, an engineer.",
      ],
      concepts: [
        ["What do you do?", "In introductions, this usually asks about work."],
        ["I’m a/an + job", "Use a or an before a singular job."],
        [
          "I work in + field/place",
          "Use this when the job title is less important than the field or workplace.",
        ],
      ],
      questions: [
        [
          "Which question asks about work?",
          "What do you do?",
          "Where are you from?",
        ],
        ["Which article is correct?", "I’m an engineer.", "I’m a engineer."],
        [
          "Which sentence gives a work field?",
          "I work in design.",
          "I work a design.",
        ],
      ],
      phrases: [
        "What do you do?",
        "I’m a designer.",
        "I’m an engineer.",
        "I work in education.",
        "She works in a café.",
        "He’s a student.",
        "Do you work here?",
        "I work in technology.",
        "I’m an engineer, and I work in Dublin.",
      ],
    },
    {
      title: "I like… — интересы",
      paragraphs: [
        "Use I like + noun to share interests: I like music. Ask Do you like…?",
        "Use don’t before like for a negative answer: I don’t like coffee. Do not use am with like.",
      ],
      concepts: [
        ["I like + noun", "Use this simple pattern to name an interest."],
        ["Do you like…?", "Use do to ask about another person’s interests."],
        [
          "I don’t like…",
          "Use don’t for a present-simple negative with I/you/we/they.",
        ],
      ],
      questions: [
        [
          "Which sentence shares an interest?",
          "I like music.",
          "I am like music.",
        ],
        [
          "Which question is correct?",
          "Do you like coffee?",
          "Are you like coffee?",
        ],
        ["Which negative is correct?", "I don’t like tea.", "I no like tea."],
      ],
      phrases: [
        "I like music.",
        "Do you like coffee?",
        "I don’t like tea.",
        "She likes books.",
        "We like travelling.",
        "He doesn’t like noise.",
        "What music do you like?",
        "I really like this café.",
        "I like music, but I don’t like loud places.",
      ],
    },
    {
      title: "I can… — умения",
      paragraphs: [
        "Use can + base verb to talk about ability: I can swim. The verb after can does not change.",
        "Ask Can you…? Answer Yes, I can or No, I can’t.",
      ],
      concepts: [
        ["can + base verb", "Say can speak, not can to speak or can speaks."],
        ["Can you…?", "Move can before the person to form a question."],
        ["can’t", "Use can’t when an ability is not available."],
      ],
      questions: [
        ["Which pattern is correct?", "I can swim.", "I can to swim."],
        ["Which question is correct?", "Can you help?", "Do can you help?"],
        ["Which negative is correct?", "I can’t drive.", "I don’t can drive."],
      ],
      phrases: [
        "I can swim.",
        "Can you help?",
        "I can’t drive.",
        "She can speak English.",
        "Can he cook?",
        "We can meet tomorrow.",
        "I can understand a little.",
        "Can you say that again?",
        "I can speak English, but I can’t speak fast.",
      ],
    },
    {
      title: "please и thank you — вежливая просьба",
      paragraphs: [
        "Use Could I have… please? for a polite request. Please can come near the end of the request.",
        "Say Thank you after receiving help. Reply You’re welcome.",
      ],
      concepts: [
        ["Could I have…?", "A polite pattern for asking for an item."],
        [
          "please / thank you",
          "Please softens a request; thank you shows appreciation.",
        ],
        ["You’re welcome", "A standard friendly reply to Thank you."],
      ],
      questions: [
        [
          "Which request is polite?",
          "Could I have some water, please?",
          "Give water.",
        ],
        ["What follows receiving help?", "Thank you.", "Please you."],
        [
          "What is a natural reply to Thank you?",
          "You’re welcome.",
          "I welcome you are.",
        ],
      ],
      phrases: [
        "Could I have some water, please?",
        "Thank you.",
        "You’re welcome.",
        "Could you help me, please?",
        "Yes, of course.",
        "Thanks for your help.",
        "Could I have the menu, please?",
        "Thank you very much.",
        "Could I have some water, please? Thank you.",
      ],
    },
    {
      title: "Короткий обмен репликами",
      paragraphs: [
        "A natural introduction is a sequence, not one isolated sentence: greeting, name, one question, and a short answer.",
        "Listen for the question word and answer only the information requested. Keep each turn short.",
      ],
      concepts: [
        ["greeting → name", "Start, then introduce yourself."],
        [
          "one question at a time",
          "Ask for a name, origin, home, work, or interest—then listen.",
        ],
        [
          "relevant answer",
          "Answer the exact question before adding another detail.",
        ],
      ],
      questions: [
        ["What normally comes first?", "A greeting.", "A long life story."],
        [
          "What is a good first question?",
          "What’s your name?",
          "Why are you late?",
        ],
        [
          "What should an answer do first?",
          "Answer the question asked.",
          "Change the subject.",
        ],
      ],
      phrases: [
        "Hi, I’m Sam.",
        "What’s your name?",
        "I’m Marta.",
        "Where are you from?",
        "I’m from Poland.",
        "Where do you live?",
        "I live in Dublin.",
        "Nice to meet you, Marta.",
        "Hi, I’m Sam. What’s your name?",
      ],
    },
    {
      title: "Переспросить и продолжить",
      paragraphs: [
        "If you do not hear or understand, use Sorry? or Could you say that again? This keeps the conversation open.",
        "Use a short follow-up such as And you? after giving your own answer.",
      ],
      concepts: [
        [
          "Sorry?",
          "A very short request to repeat, best with friendly intonation.",
        ],
        ["Could you say that again?", "A clear polite request for repetition."],
        ["And you?", "Returns the same question after your answer."],
      ],
      questions: [
        ["What can you say when you do not hear?", "Sorry?", "Never mind you."],
        [
          "Which request asks for repetition?",
          "Could you say that again?",
          "Could you go again yesterday?",
        ],
        ["Which phrase returns the question?", "And you?", "But me?"],
      ],
      phrases: [
        "Sorry?",
        "Could you say that again?",
        "And you?",
        "I’m from Spain. And you?",
        "Sorry, what’s your name?",
        "Could you speak more slowly?",
        "Yes, of course.",
        "Thanks, I understand now.",
        "I live in Cork. And you?",
      ],
    },
    {
      title: "Самостоятельное знакомство",
      paragraphs: [
        "Now combine the episode: greet the person, give your name, origin, and current home, then ask one relevant question.",
        "Accuracy matters, but the goal is a clear short exchange. Use familiar chunks instead of translating word by word.",
      ],
      concepts: [
        [
          "four-part introduction",
          "Greeting + name + origin/home + one question.",
        ],
        [
          "consistent am/is/are",
          "Keep the subject and form together while speaking.",
        ],
        [
          "conversation handoff",
          "Finish with a question so the other person can respond.",
        ],
      ],
      questions: [
        [
          "Which opening is complete and natural?",
          "Hi, I’m Ana.",
          "Hi, Ana I.",
        ],
        [
          "Which forms agree?",
          "I’m from Spain. She’s from Italy.",
          "I is from Spain. She are from Italy.",
        ],
        ["How can you hand over the turn?", "And you?", "I finish now."],
      ],
      phrases: [
        "Hi, I’m Ana.",
        "I’m from Spain.",
        "I live in Cork now.",
        "I’m a designer.",
        "I like music and books.",
        "I can speak a little English.",
        "What’s your name?",
        "Nice to meet you.",
        "Hi, I’m Ana. I’m from Spain, and I live in Cork. And you?",
      ],
    },
  ]);

  function clone(value) {
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function technicalHash(seed) {
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    const text = String(seed);
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      first = Math.imul(first ^ code, 0x01000193) >>> 0;
      second = Math.imul(second ^ code, 0x85ebca6b) >>> 0;
    }
    const block =
      first.toString(16).padStart(8, "0") +
      second.toString(16).padStart(8, "0");
    return block.repeat(4).slice(0, 64);
  }

  function technicalId(value, fallback) {
    const normalized = String(value || "")
      .normalize("NFC")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100);
    return normalized || fallback;
  }

  function createTechnicalSkeleton(input) {
    const episodeId = technicalId(input && input.episodeId, "episode-draft");
    const targetLanguage = technicalId(input && input.targetLanguage, "en");
    const introFingerprint = technicalHash(`${episodeId}:intro-owner-pending`);
    const objectiveId = (sessionOrdinal, slot) =>
      `objective-${episodeId}-s${String(sessionOrdinal).padStart(2, "0")}-${String(slot).padStart(2, "0")}`;
    const sessionSources = Array.from({ length: 12 }, (_, sessionIndex) => {
      const sessionOrdinal = sessionIndex + 1;
      return {
        schemaVersion: "v2-activity-session-source-shard.v2",
        episodeId,
        targetLanguage,
        normalizationLocale: targetLanguage,
        normalizationProfileHash:
          "bc457837153049467d4c8e84a23829b8e3afebec3252551241e26bcae7c9d47b",
        session: {
          sessionId: `${episodeId}:session:${String(sessionOrdinal).padStart(2, "0")}`,
          ordinal: sessionOrdinal,
          zone:
            sessionOrdinal <= 4
              ? "understand"
              : sessionOrdinal <= 8
                ? "use"
                : "master",
          targetSeconds: 240,
          tasks: Array.from({ length: 12 }, (_, taskIndex) => {
            const slot = taskIndex + 1;
            let family =
              REQUIRED_FAMILIES[
                (sessionIndex + Math.floor(taskIndex / 3)) %
                  REQUIRED_FAMILIES.length
              ];
            if (
              (slot === 10 || slot === 12) &&
              family === "scripted_repeat_compare"
            )
              family =
                REQUIRED_FAMILIES[sessionIndex % REQUIRED_FAMILIES.length];
            const taskId = `task-${episodeId}-s${String(sessionOrdinal).padStart(2, "0")}-${String(slot).padStart(2, "0")}`;
            const responseOptions = [1, 2].map((option) => ({
              responseId: `${taskId}-response-${String(option).padStart(2, "0")}`,
              text: "",
            }));
            const choice = CHOICE_FAMILIES.has(family);
            const correctResponse = choice ? responseOptions[0].responseId : "";
            const reviewedSessionOrdinal =
              sessionOrdinal === 1 ? 1 : sessionOrdinal - 1;
            const reviewedSlot = 8;
            const reviewedTaskId = `task-${episodeId}-s${String(reviewedSessionOrdinal).padStart(2, "0")}-${String(reviewedSlot).padStart(2, "0")}`;
            const linkedObjective =
              slot === 10
                ? objectiveId(sessionOrdinal, 4)
                : slot === 12
                  ? objectiveId(sessionOrdinal, 6)
                  : slot === 11
                    ? objectiveId(reviewedSessionOrdinal, reviewedSlot)
                    : objectiveId(sessionOrdinal, slot);
            return {
              taskId,
              slot,
              purpose: PURPOSES[taskIndex],
              family,
              activityId: `activity-${taskId}`,
              contentItemId: `content-${taskId}`,
              objectiveId: linkedObjective,
              learningFunction: "",
              answerExposure:
                slot === 10 || slot === 12
                  ? "forbidden"
                  : "allowed_after_attempt",
              promptNovelty: slot === 10 || slot === 12 ? "novel" : "trained",
              localEvaluatorCapsuleId: `capsule-${taskId}`,
              inputMode:
                family === "phrase_builder" ||
                family === "listen_build_dictation"
                  ? "ordered_tokens"
                  : family === "scripted_repeat_compare"
                    ? "scripted_speech"
                    : "single_choice",
              support: slot === 10 || slot === 12 ? "none" : "partial_cue",
              hintsAllowed: slot === 10 || slot === 12 ? 0 : 2,
              introQuestionRef:
                slot <= 3
                  ? {
                      introArtifactFingerprint: introFingerprint,
                      questionId: `${taskId}-intro-question`,
                      coveredConceptIds: [
                        `concept-${episodeId}-s${sessionOrdinal}-${slot}`,
                      ],
                    }
                  : null,
              reviewSource:
                slot === 11
                  ? {
                      kind:
                        sessionOrdinal === 1
                          ? "same_session_bootstrap"
                          : "prior_session",
                      reviewOfTaskId: reviewedTaskId,
                      sourceSessionOrdinal: reviewedSessionOrdinal,
                    }
                  : null,
              learner: {
                promptId: `${taskId}-prompt`,
                prompt: "",
                responseOptions,
                mediaIds: [],
                audioTargetIds: [],
                accessibilityLabel: "",
              },
              scriptedAlternate: [
                "listen_choose",
                "sound_contrast",
                "listen_build_dictation",
                "scripted_repeat_compare",
              ].includes(family)
                ? {
                    alternateId: `${taskId}-alternate`,
                    instruction: "",
                    voiceEvidenceEquivalent: false,
                    canAward: false,
                  }
                : null,
              evaluator: {
                inputKind: choice
                  ? "choice_token"
                  : family === "scripted_repeat_compare"
                    ? "transcript"
                    : "text",
                normalizationRef: "v2-local-evaluator-normalization.v1",
                correctResponse,
                acceptedResponses: correctResponse ? [correctResponse] : [],
                salt: technicalHash(`${taskId}:owner-draft-salt`),
              },
            };
          }),
        },
      };
    });
    return {
      sessionIntros: sessionSources.map((source) => {
        const conceptIds = source.session.tasks
          .slice(0, 3)
          .flatMap((task) => task.introQuestionRef.coveredConceptIds);
        return {
          contentClass: "production_candidate",
          introId: `intro-${episodeId}-s${String(source.session.ordinal).padStart(2, "0")}`,
          title: "",
          paragraphs: [""],
          concepts: conceptIds.map((conceptId) => ({
            conceptId,
            heading: "",
            explanation: "",
          })),
        };
      }),
      sessionSources,
    };
  }

  function createNeutralTestFixture(input) {
    const episodeId = technicalId(
      input && input.episodeId,
      "neutral-test-episode-never-release",
    );
    const targetLanguage = technicalId(input && input.targetLanguage, "en");
    const document = createTechnicalSkeleton({ episodeId, targetLanguage });
    const sessionIntros = document.sessionSources.map((source, index) => {
      const reference = REFERENCE_SESSIONS[index];
      return {
        contentClass: "neutral_test_fixture",
        introId: `reference-test-intro-s${String(source.session.ordinal).padStart(2, "0")}-never-release`,
        title: reference.title,
        paragraphs: reference.paragraphs,
        concepts: source.session.tasks
          .slice(0, 3)
          .map((task, conceptIndex) => ({
            conceptId: task.introQuestionRef.coveredConceptIds[0],
            heading: reference.concepts[conceptIndex][0],
            explanation: reference.concepts[conceptIndex][1],
          })),
      };
    });
    for (const [sessionIndex, source] of document.sessionSources.entries()) {
      const reference = REFERENCE_SESSIONS[sessionIndex];
      for (const [taskIndex, task] of source.session.tasks.entries()) {
        const slot = taskIndex + 1;
        const coordinate = `S${String(source.session.ordinal).padStart(2, "0")} · ${String(slot).padStart(2, "0")}`;
        const introQuestion = slot <= 3 ? reference.questions[taskIndex] : null;
        const target = introQuestion
          ? introQuestion[1]
          : reference.phrases[taskIndex - 3];
        const distractor = introQuestion
          ? introQuestion[2]
          : `Not this: ${reference.phrases[(taskIndex - 2) % reference.phrases.length]}`;
        task.learningFunction =
          slot <= 3
            ? `Проверить понимание понятия «${reference.concepts[taskIndex][0]}»`
            : slot === 11
              ? "Вернуть ранее изученную конструкцию в новом контексте"
              : slot === 10 || slot === 12
                ? "Самостоятельно применить изученную конструкцию без подсказки"
                : `Отработать фразу «${target}» от распознавания к воспроизведению`;
        task.learner.prompt = introQuestion
          ? `${introQuestion[0]} (${coordinate})`
          : task.family === "phrase_builder"
            ? `Соберите естественную фразу. ${coordinate}`
            : task.family === "listen_build_dictation"
              ? `Соберите услышанную фразу. ${coordinate}`
              : task.family === "scripted_repeat_compare"
                ? `Произнесите фразу по образцу: “${target}” (${coordinate})`
                : task.family === "context_gap_grammar"
                  ? `Выберите форму, которая завершает реплику. ${coordinate}`
                  : task.family === "sound_contrast"
                    ? `Выберите реплику, которую вы услышали. ${coordinate}`
                    : task.family === "speed_match"
                      ? `Быстро сопоставьте смысл с естественной репликой. ${coordinate}`
                      : `Прослушайте и выберите подходящую реплику. ${coordinate}`;
        task.learner.accessibilityLabel = `${task.learningFunction}. Эталонный тестовый эпизод, не опубликован.`;
        if (task.evaluator.inputKind === "choice_token") {
          task.learner.responseOptions[0].text = target;
          task.learner.responseOptions[1].text = distractor;
          task.evaluator.correctResponse =
            task.learner.responseOptions[0].responseId;
          task.evaluator.acceptedResponses = [task.evaluator.correctResponse];
        } else {
          const words = String(target).split(/\s+/u).filter(Boolean);
          const visibleWords =
            slot === 10 || slot === 12
              ? [...words.slice(1), words[0]].filter(Boolean)
              : words;
          const optionTexts =
            visibleWords.length >= 2
              ? visibleWords.slice(0, 6)
              : [String(target), String(distractor)];
          task.learner.responseOptions = optionTexts.map(
            (text, optionIndex) => ({
              responseId: `${task.taskId}-response-${String(optionIndex + 1).padStart(2, "0")}`,
              text,
            }),
          );
          task.evaluator.correctResponse = target;
          task.evaluator.acceptedResponses = [target];
        }
        if (task.scriptedAlternate) {
          task.scriptedAlternate.instruction =
            slot === 10 || slot === 12
              ? "Если аудио или микрофон недоступны, выполните доступную текстовую версию без оценки произношения."
              : `Если аудио или микрофон недоступны, прочитайте фразу «${target}» и продолжите без оценки произношения.`;
        }
      }
    }
    return {
      contentClass: "neutral_test_fixture",
      fixtureId: "learning-v2-reference-episode-a1-introductions-v1",
      localTestOnly: true,
      sessionIntros,
      sessionSources: document.sessionSources,
      publicationAuthority: "none",
      runtimeConsumer: false,
      releaseAuthority: false,
    };
  }

  function fail(code) {
    throw new Error(code);
  }

  function unwrap(value) {
    if (Array.isArray(value)) return { sessionSources: value };
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Array.isArray(value.sessionSources)
    ) {
      if (
        value.contentClass === "neutral_test_fixture" &&
        value.localTestOnly === true &&
        Array.isArray(value.sessionIntros)
      ) {
        return {
          contentClass: "neutral_test_fixture",
          fixtureId: String(value.fixtureId || ""),
          localTestOnly: true,
          sessionIntros: value.sessionIntros,
          sessionSources: value.sessionSources,
          publicationAuthority: "none",
          runtimeConsumer: false,
          releaseAuthority: false,
        };
      }
      return {
        ...(Array.isArray(value.sessionIntros)
          ? { sessionIntros: value.sessionIntros }
          : {}),
        sessionSources: value.sessionSources,
      };
    }
    fail("Нужен массив сессий или объект { sessionSources: [...] }.");
  }

  function parseRaw(raw) {
    if (typeof raw !== "string" || raw.trim().length === 0) {
      fail("Сначала откройте JSON-файл эпизода или вставьте его содержимое.");
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      fail("JSON эпизода не читается. Исправьте синтаксис.");
    }
    return clone(unwrap(parsed));
  }

  function nonempty(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function validateTask(task, sessionIndex, taskIndex) {
    const issues = [];
    const slot = taskIndex + 1;
    if (!task || typeof task !== "object" || Array.isArray(task)) {
      return ["Задание отсутствует или имеет неверный формат."];
    }
    if (task.slot !== slot) issues.push(`Ожидается слот ${slot}.`);
    if (task.purpose !== PURPOSES[taskIndex]) {
      issues.push("Назначение задания не соответствует его позиции.");
    }
    if (!REQUIRED_FAMILIES.includes(task.family)) {
      issues.push("Выберите поддерживаемый тип задания.");
    }
    if (!nonempty(task.learningFunction)) {
      issues.push("Опишите, что ученик отрабатывает в этом задании.");
    }
    if (!nonempty(task.learner && task.learner.prompt)) {
      issues.push("Добавьте видимое условие задания.");
    }
    if (!nonempty(task.learner && task.learner.accessibilityLabel)) {
      issues.push("Добавьте понятное описание для озвучивания интерфейса.");
    }
    const options = task.learner && task.learner.responseOptions;
    if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
      issues.push("Нужно от 2 до 6 вариантов или выбираемых частей.");
    } else {
      const ids = new Set();
      for (const option of options) {
        if (
          !nonempty(option && option.responseId) ||
          !nonempty(option && option.text)
        ) {
          issues.push("У каждого варианта нужны ID и видимый текст.");
          break;
        }
        if (ids.has(option.responseId)) {
          issues.push("ID вариантов внутри задания не должны повторяться.");
          break;
        }
        ids.add(option.responseId);
      }
      const correct = task.evaluator && task.evaluator.correctResponse;
      if (!nonempty(correct)) issues.push("Укажите правильный ответ.");
      if (
        CHOICE_FAMILIES.has(task.family) &&
        nonempty(correct) &&
        !ids.has(correct)
      ) {
        issues.push(
          "Для задания с выбором правильный ответ должен быть ID варианта.",
        );
      }
    }
    const accepted = task.evaluator && task.evaluator.acceptedResponses;
    if (!Array.isArray(accepted) || accepted.length < 1) {
      issues.push("Добавьте хотя бы один принимаемый ответ.");
    } else if (
      task.evaluator &&
      !accepted.includes(task.evaluator.correctResponse)
    ) {
      issues.push("Правильный ответ должен входить в принимаемые ответы.");
    }
    if (slot <= 3 && !task.introQuestionRef) {
      issues.push("Первые три задания должны быть вопросами по интро.");
    }
    if (slot > 3 && task.introQuestionRef !== null) {
      issues.push("Ссылка на вопрос интро допустима только в слотах 1–3.");
    }
    if (slot === 11 && !task.reviewSource) {
      issues.push("В слоте 11 укажите, какой прошлый материал повторяется.");
    }
    if (slot !== 11 && task.reviewSource !== null) {
      issues.push("Источник повторения допустим только в слоте 11.");
    }
    if (
      (slot === 10 || slot === 12) &&
      (task.support !== "none" ||
        task.hintsAllowed !== 0 ||
        task.answerExposure !== "forbidden" ||
        task.promptNovelty === "trained")
    ) {
      issues.push(
        "Самостоятельная проверка должна быть без подсказок и показа ответа.",
      );
    }
    if (
      (slot === 10 || slot === 12) &&
      task.family === "scripted_repeat_compare"
    ) {
      issues.push(
        "Произнесение по образцу не считается самостоятельной проверкой.",
      );
    }
    if (
      task.scriptedAlternate &&
      !nonempty(task.scriptedAlternate.instruction)
    ) {
      issues.push(
        "Добавьте доступную инструкцию на случай недоступного аудио или речи.",
      );
    }
    if (sessionIndex < 0) issues.push("Сессия не определена.");
    return issues;
  }

  function inspect(document) {
    const issues = [];
    const sessions = Array.isArray(document && document.sessionSources)
      ? document.sessionSources
      : [];
    if (sessions.length !== 12) {
      issues.push(`Нужно ровно 12 сессий. Сейчас: ${sessions.length}.`);
    }
    if (Object.prototype.hasOwnProperty.call(document || {}, "sessionIntros")) {
      const intros = Array.isArray(document && document.sessionIntros)
        ? document.sessionIntros
        : [];
      if (intros.length !== 12) {
        issues.push(`Нужно ровно 12 интро. Сейчас: ${intros.length}.`);
      } else {
        intros.forEach((intro, index) => {
          const source = sessions[index];
          const requiredConceptIds = new Set(
            (source?.session?.tasks || [])
              .slice(0, 3)
              .flatMap(
                (task) => task?.introQuestionRef?.coveredConceptIds || [],
              ),
          );
          const concepts = Array.isArray(intro?.concepts) ? intro.concepts : [];
          const conceptIds = new Set(
            concepts.map((concept) => concept?.conceptId),
          );
          if (
            !nonempty(intro?.title) ||
            !Array.isArray(intro?.paragraphs) ||
            intro.paragraphs.length < 1 ||
            intro.paragraphs.some((paragraph) => !nonempty(paragraph)) ||
            concepts.length < 1 ||
            concepts.some(
              (concept) =>
                !nonempty(concept?.conceptId) ||
                !nonempty(concept?.heading) ||
                !nonempty(concept?.explanation),
            ) ||
            conceptIds.size !== requiredConceptIds.size ||
            [...conceptIds].some(
              (conceptId) => !requiredConceptIds.has(conceptId),
            )
          ) {
            issues.push(
              `Интро сессии ${index + 1} должно содержать заголовок, абзацы и объяснения всех понятий вопросов 1–3.`,
            );
          }
        });
      }
    }
    let taskCount = 0;
    const allFamilies = new Set();
    const rows = sessions.map((source, sessionIndex) => {
      const session = source && source.session;
      const tasks = Array.isArray(session && session.tasks)
        ? session.tasks
        : [];
      taskCount += tasks.length;
      const sessionIssues = [];
      if (!session || session.ordinal !== sessionIndex + 1) {
        sessionIssues.push(`Ожидается порядковый номер ${sessionIndex + 1}.`);
      }
      if (tasks.length !== 12) {
        sessionIssues.push(`Нужно 12 заданий. Сейчас: ${tasks.length}.`);
      }
      const families = new Set();
      const taskRows = tasks.map((task, taskIndex) => {
        if (task && REQUIRED_FAMILIES.includes(task.family)) {
          families.add(task.family);
          allFamilies.add(task.family);
        }
        return Object.freeze({
          slot: taskIndex + 1,
          issues: Object.freeze(validateTask(task, sessionIndex, taskIndex)),
        });
      });
      if (families.size < 3 || families.size > 4) {
        sessionIssues.push("В сессии должно использоваться 3–4 типа заданий.");
      }
      return Object.freeze({
        ordinal: sessionIndex + 1,
        sessionId: String((session && session.sessionId) || ""),
        taskCount: tasks.length,
        issueCount:
          sessionIssues.length +
          taskRows.reduce((sum, row) => sum + row.issues.length, 0),
        issues: Object.freeze(sessionIssues),
        tasks: Object.freeze(taskRows),
      });
    });
    if (sessions.length === 12 && taskCount !== 144) {
      issues.push(`Нужно 144 задания. Сейчас: ${taskCount}.`);
    }
    if (
      sessions.length === 12 &&
      allFamilies.size !== REQUIRED_FAMILIES.length
    ) {
      issues.push("В эпизоде должны встретиться все семь типов заданий.");
    }
    const rowIssueCount = rows.reduce((sum, row) => sum + row.issueCount, 0);
    return Object.freeze({
      sessionCount: sessions.length,
      taskCount,
      issueCount: issues.length + rowIssueCount,
      issues: Object.freeze(issues),
      rows: Object.freeze(rows),
      readyForServerValidation:
        sessions.length === 12 &&
        taskCount === 144 &&
        issues.length + rowIssueCount === 0,
    });
  }

  function taskAt(document, sessionIndex, taskIndex) {
    const task =
      document &&
      document.sessionSources &&
      document.sessionSources[sessionIndex] &&
      document.sessionSources[sessionIndex].session &&
      document.sessionSources[sessionIndex].session.tasks &&
      document.sessionSources[sessionIndex].session.tasks[taskIndex];
    if (!task) fail("Задание не найдено.");
    return task;
  }

  function patchTask(document, sessionIndex, taskIndex, patch) {
    const next = clone(document);
    const task = taskAt(next, sessionIndex, taskIndex);
    if (Object.prototype.hasOwnProperty.call(patch, "learningFunction")) {
      task.learningFunction = String(patch.learningFunction);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "prompt")) {
      task.learner.prompt = String(patch.prompt);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "accessibilityLabel")) {
      task.learner.accessibilityLabel = String(patch.accessibilityLabel);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "responseOptions")) {
      if (!Array.isArray(patch.responseOptions))
        fail("Варианты должны быть массивом.");
      task.learner.responseOptions = clone(patch.responseOptions);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "correctResponse")) {
      task.evaluator.correctResponse = String(patch.correctResponse);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "acceptedResponses")) {
      if (!Array.isArray(patch.acceptedResponses))
        fail("Ответы должны быть массивом.");
      task.evaluator.acceptedResponses = patch.acceptedResponses.map(String);
    }
    if (
      Object.prototype.hasOwnProperty.call(patch, "alternateInstruction") &&
      task.scriptedAlternate
    ) {
      task.scriptedAlternate.instruction = String(patch.alternateInstruction);
    }
    return next;
  }

  function patchSessionIntro(document, sessionIndex, patch) {
    const next = clone(document);
    if (!Array.isArray(next.sessionIntros) || !next.sessionIntros[sessionIndex])
      fail("Интро выбранной сессии не найдено.");
    const intro = next.sessionIntros[sessionIndex];
    if (Object.prototype.hasOwnProperty.call(patch, "title"))
      intro.title = String(patch.title);
    if (Object.prototype.hasOwnProperty.call(patch, "paragraphs")) {
      if (!Array.isArray(patch.paragraphs))
        fail("Абзацы должны быть массивом.");
      intro.paragraphs = patch.paragraphs.map(String);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "concepts")) {
      if (!Array.isArray(patch.concepts)) fail("Понятия должны быть массивом.");
      intro.concepts = clone(patch.concepts);
    }
    return next;
  }

  function promoteReferenceFixture(document, input) {
    if (
      !document ||
      document.contentClass !== "neutral_test_fixture" ||
      document.localTestOnly !== true ||
      document.fixtureId !== "learning-v2-reference-episode-a1-introductions-v1"
    )
      fail("Только эталонный тестовый эпизод можно взять как основу.");
    const episodeId = technicalId(input && input.episodeId, "episode-draft");
    const production = createTechnicalSkeleton({
      episodeId,
      targetLanguage: input && input.targetLanguage,
    });
    document.sessionIntros.forEach((intro, sessionIndex) => {
      production.sessionIntros[sessionIndex].title = intro.title;
      production.sessionIntros[sessionIndex].paragraphs = clone(
        intro.paragraphs,
      );
      production.sessionIntros[sessionIndex].concepts.forEach(
        (concept, conceptIndex) => {
          concept.heading = intro.concepts[conceptIndex].heading;
          concept.explanation = intro.concepts[conceptIndex].explanation;
        },
      );
    });
    document.sessionSources.forEach((source, sessionIndex) => {
      source.session.tasks.forEach((task, taskIndex) => {
        const target =
          production.sessionSources[sessionIndex].session.tasks[taskIndex];
        target.learningFunction = task.learningFunction;
        target.learner.prompt = task.learner.prompt;
        target.learner.accessibilityLabel = task.learner.accessibilityLabel;
        target.learner.responseOptions = task.learner.responseOptions.map(
          (option, optionIndex) => ({
            responseId:
              target.learner.responseOptions[optionIndex]?.responseId ||
              `${target.taskId}-response-${String(optionIndex + 1).padStart(2, "0")}`,
            text: option.text,
          }),
        );
        if (target.evaluator.inputKind === "choice_token") {
          const correctIndex = Math.max(
            0,
            task.learner.responseOptions.findIndex(
              (option) => option.responseId === task.evaluator.correctResponse,
            ),
          );
          target.evaluator.correctResponse =
            target.learner.responseOptions[correctIndex].responseId;
          target.evaluator.acceptedResponses = [
            target.evaluator.correctResponse,
          ];
        } else {
          target.evaluator.correctResponse = task.evaluator.correctResponse;
          target.evaluator.acceptedResponses = clone(
            task.evaluator.acceptedResponses,
          );
        }
        if (target.scriptedAlternate && task.scriptedAlternate) {
          target.scriptedAlternate.instruction =
            task.scriptedAlternate.instruction;
        }
      });
    });
    return production;
  }

  function serialize(document) {
    if (
      document &&
      document.contentClass === "neutral_test_fixture" &&
      document.localTestOnly === true
    ) {
      return JSON.stringify(
        {
          contentClass: "neutral_test_fixture",
          fixtureId: document.fixtureId,
          localTestOnly: true,
          sessionIntros: document.sessionIntros,
          sessionSources: document.sessionSources,
          publicationAuthority: "none",
          runtimeConsumer: false,
          releaseAuthority: false,
        },
        null,
        2,
      );
    }
    return JSON.stringify(
      {
        sessionIntros: Array.isArray(document.sessionIntros)
          ? document.sessionIntros
          : [],
        sessionSources: document.sessionSources,
      },
      null,
      2,
    );
  }

  const api = Object.freeze({
    REQUIRED_FAMILIES,
    PURPOSE_LABELS,
    FAMILY_LABELS,
    isChoiceFamily: (family) => CHOICE_FAMILIES.has(family),
    createTechnicalSkeleton,
    createNeutralTestFixture,
    parseRaw,
    inspect,
    taskAt,
    patchTask,
    patchSessionIntro,
    promoteReferenceFixture,
    serialize,
  });
  globalScope.LearningV2OwnerEpisodeEditorV1 = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
