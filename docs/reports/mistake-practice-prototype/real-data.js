window.REAL_TASKS = [
  {
    "id": "i04",
    "source": "Learning V2",
    "mode": "listen",
    "title": "Послушайте и выберите",
    "prompt": "Послушайте и выберите",
    "phrase": "",
    "answer": "ready",
    "options": [
      {
        "id": "en:lesson-01:session-01:i04:r1",
        "text": "ready"
      },
      {
        "id": "en:lesson-01:session-01:i04:r2",
        "text": "really"
      },
      {
        "id": "en:lesson-01:session-01:i04:r3",
        "text": "red"
      }
    ],
    "tokens": [],
    "distractors": [],
    "pairs": [],
    "audio": "ready",
    "feedback": [
      {
        "responseId": "en:lesson-01:session-01:i04:r2",
        "correct": false,
        "testedDimension": "Послушайте и выберите — ready",
        "feedbackByLocale": {
          "ru": "Похожее начало, но на слог длиннее. Ready — два слога: RE-dy.",
          "uk": "Схожий початок, але на склад довше. Ready — два склади: RE-dy."
        }
      },
      {
        "responseId": "en:lesson-01:session-01:i04:r3",
        "correct": false,
        "testedDimension": "Послушайте и выберите — ready",
        "feedbackByLocale": {
          "ru": "Обрубленное ready. Слушайте хвост «-dy».",
          "uk": "Обрубане ready. Слухайте хвіст «-dy»."
        }
      }
    ],
    "payload": {
      "family": "listen_choose",
      "referenceAudio": {
        "audioTargetId": "en:lesson-01:session-01:i04:audio",
        "transcript": "ready"
      },
      "slowReferenceAudio": null,
      "localizedMeaningChoices": [
        {
          "responseId": "en:lesson-01:session-01:i04:r1",
          "targetText": "ready",
          "meaningByLocale": null
        },
        {
          "responseId": "en:lesson-01:session-01:i04:r2",
          "targetText": "really",
          "meaningByLocale": null
        },
        {
          "responseId": "en:lesson-01:session-01:i04:r3",
          "targetText": "red",
          "meaningByLocale": null
        }
      ],
      "transcriptRevealPolicy": "after_first_attempt",
      "choiceFeedback": [
        {
          "responseId": "en:lesson-01:session-01:i04:r2",
          "correct": false,
          "testedDimension": "Послушайте и выберите — ready",
          "feedbackByLocale": {
            "ru": "Похожее начало, но на слог длиннее. Ready — два слога: RE-dy.",
            "uk": "Схожий початок, але на склад довше. Ready — два склади: RE-dy."
          }
        },
        {
          "responseId": "en:lesson-01:session-01:i04:r3",
          "correct": false,
          "testedDimension": "Послушайте и выберите — ready",
          "feedbackByLocale": {
            "ru": "Обрубленное ready. Слушайте хвост «-dy».",
            "uk": "Обрубане ready. Слухайте хвіст «-dy»."
          }
        }
      ],
      "isWordCard": false,
      "wordCard": null
    },
    "sourceFile": "modules/learning-v2/content/factory_native/generated_release/en/l01/s01/learner.json",
    "sourceId": "en:lesson-01:session-01:i04",
    "target": "en",
    "provenance": "authored",
    "history": "demo"
  },
  {
    "id": "i08",
    "source": "Learning V2",
    "mode": "pairs",
    "title": "Соедините пары (Speed Match, 4 пары)",
    "prompt": "Соедините пары (Speed Match, 4 пары)",
    "phrase": "",
    "answer": "",
    "options": [],
    "tokens": [],
    "distractors": [],
    "pairs": [
      {
        "pairId": "en:lesson-01:session-01:i08:p1",
        "target": "here",
        "meaningByLocale": {
          "ru": "здесь",
          "uk": "тут"
        }
      },
      {
        "pairId": "en:lesson-01:session-01:i08:p2",
        "target": "ready",
        "meaningByLocale": {
          "ru": "готов",
          "uk": "готовий"
        }
      },
      {
        "pairId": "en:lesson-01:session-01:i08:p3",
        "target": "fine",
        "meaningByLocale": {
          "ru": "хорошо",
          "uk": "добре"
        }
      },
      {
        "pairId": "en:lesson-01:session-01:i08:p4",
        "target": "happy",
        "meaningByLocale": {
          "ru": "рад",
          "uk": "радий"
        }
      }
    ],
    "audio": null,
    "feedback": [],
    "payload": {
      "family": "speed_match",
      "pairGrid": [
        {
          "pairId": "en:lesson-01:session-01:i08:p1",
          "target": "here",
          "meaningByLocale": {
            "ru": "здесь",
            "uk": "тут"
          }
        },
        {
          "pairId": "en:lesson-01:session-01:i08:p2",
          "target": "ready",
          "meaningByLocale": {
            "ru": "готов",
            "uk": "готовий"
          }
        },
        {
          "pairId": "en:lesson-01:session-01:i08:p3",
          "target": "fine",
          "meaningByLocale": {
            "ru": "хорошо",
            "uk": "добре"
          }
        },
        {
          "pairId": "en:lesson-01:session-01:i08:p4",
          "target": "happy",
          "meaningByLocale": {
            "ru": "рад",
            "uk": "радий"
          }
        }
      ],
      "leftColumn": [
        "here",
        "ready",
        "fine",
        "happy"
      ],
      "rightColumn": [
        "здесь",
        "готов",
        "хорошо",
        "рад"
      ],
      "pairingKey": "pair_id",
      "timerPolicy": {
        "enabledByDefault": true,
        "learnerCanDisable": true,
        "pausesOnInterruption": true
      },
      "finishStats": [
        "speed",
        "accuracy",
        "personal_best"
      ]
    },
    "sourceFile": "modules/learning-v2/content/factory_native/generated_release/en/l01/s01/learner.json",
    "sourceId": "en:lesson-01:session-01:i08",
    "target": "en",
    "provenance": "authored",
    "history": "demo"
  },
  {
    "id": "i09",
    "source": "Learning V2",
    "mode": "build",
    "title": "Соберите фразу — «я здесь»",
    "prompt": "Соберите фразу — «я здесь»",
    "phrase": "",
    "answer": "I am here.",
    "options": [],
    "tokens": [
      "I",
      "am",
      "here"
    ],
    "distractors": [
      "ready"
    ],
    "pairs": [],
    "audio": null,
    "feedback": [],
    "payload": {
      "family": "phrase_builder",
      "targetPhrase": "I am here.",
      "localizedMeaning": {
        "ru": "Соберите фразу — «я здесь»",
        "uk": "Складіть фразу — «я тут»"
      },
      "orderedTokens": [
        "I",
        "am",
        "here"
      ],
      "authoredDistractorTokens": [
        "ready"
      ],
      "slotFeedback": []
    },
    "sourceFile": "modules/learning-v2/content/factory_native/generated_release/en/l01/s01/learner.json",
    "sourceId": "en:lesson-01:session-01:i09",
    "target": "en",
    "provenance": "authored",
    "history": "demo"
  },
  {
    "id": "i10",
    "source": "Learning V2",
    "mode": "gap",
    "title": "Вставьте слово — вас спросили, как дела, всё хорошо",
    "prompt": "Вставьте слово — вас спросили, как дела, всё хорошо",
    "phrase": "I am ___ .",
    "answer": "fine",
    "options": [
      {
        "id": "en:lesson-01:session-01:i10:r1",
        "text": "fine"
      },
      {
        "id": "en:lesson-01:session-01:i10:r2",
        "text": "here"
      },
      {
        "id": "en:lesson-01:session-01:i10:r3",
        "text": "ready"
      }
    ],
    "tokens": [],
    "distractors": [],
    "pairs": [],
    "audio": null,
    "feedback": [
      {
        "responseId": "en:lesson-01:session-01:i10:r2",
        "correct": false,
        "testedDimension": "Вставьте слово — вас спросили, как дела,",
        "feedbackByLocale": {
          "ru": "«Я здесь» — это ответ на «где ты», а не на «как дела».",
          "uk": "«Я тут» — це відповідь на «де ти», а не на «як справи»."
        }
      },
      {
        "responseId": "en:lesson-01:session-01:i10:r3",
        "correct": false,
        "testedDimension": "Вставьте слово — вас спросили, как дела,",
        "feedbackByLocale": {
          "ru": "«Я готов» — подходит, когда пора начинать, а не когда спрашивают о самочувствии.",
          "uk": "«Я готовий» — годиться, коли пора починати, а не коли питають про самопочуття."
        }
      }
    ],
    "payload": {
      "family": "context_gap_grammar",
      "localizedScene": {
        "ru": "Вставьте слово — вас спросили, как дела, всё хорошо",
        "uk": "Вставте слово — вас запитали, як справи, все добре"
      },
      "gappedTargetPhrase": "I am ___ .",
      "gapOptions": [
        {
          "responseId": "en:lesson-01:session-01:i10:r1",
          "text": "fine"
        },
        {
          "responseId": "en:lesson-01:session-01:i10:r2",
          "text": "here"
        },
        {
          "responseId": "en:lesson-01:session-01:i10:r3",
          "text": "ready"
        }
      ],
      "testedDimension": "Вставьте слово — вас спросили, как дела,",
      "choiceFeedback": [
        {
          "responseId": "en:lesson-01:session-01:i10:r2",
          "correct": false,
          "testedDimension": "Вставьте слово — вас спросили, как дела,",
          "feedbackByLocale": {
            "ru": "«Я здесь» — это ответ на «где ты», а не на «как дела».",
            "uk": "«Я тут» — це відповідь на «де ти», а не на «як справи»."
          }
        },
        {
          "responseId": "en:lesson-01:session-01:i10:r3",
          "correct": false,
          "testedDimension": "Вставьте слово — вас спросили, как дела,",
          "feedbackByLocale": {
            "ru": "«Я готов» — подходит, когда пора начинать, а не когда спрашивают о самочувствии.",
            "uk": "«Я готовий» — годиться, коли пора починати, а не коли питають про самопочуття."
          }
        }
      ]
    },
    "sourceFile": "modules/learning-v2/content/factory_native/generated_release/en/l01/s01/learner.json",
    "sourceId": "en:lesson-01:session-01:i10",
    "target": "en",
    "provenance": "authored",
    "history": "demo"
  },
  {
    "id": "i11",
    "source": "Learning V2",
    "mode": "gap",
    "title": "Вставьте скрепку — начальник ждёт ответа, вы готовы",
    "prompt": "Вставьте скрепку — начальник ждёт ответа, вы готовы",
    "phrase": "I ___ ready.",
    "answer": "am",
    "options": [
      {
        "id": "en:lesson-01:session-01:i11:r1",
        "text": "am"
      },
      {
        "id": "en:lesson-01:session-01:i11:r2",
        "text": "is"
      },
      {
        "id": "en:lesson-01:session-01:i11:r3",
        "text": "are"
      }
    ],
    "tokens": [],
    "distractors": [],
    "pairs": [],
    "audio": null,
    "feedback": [
      {
        "responseId": "en:lesson-01:session-01:i11:r2",
        "correct": false,
        "testedDimension": "Вставьте скрепку — начальник ждёт ответа",
        "feedbackByLocale": {
          "ru": "Скрепка чужая. С I работает только am — про себя всегда I am.",
          "uk": "Скріпка чужа. З I працює тільки am — про себе завжди I am."
        }
      },
      {
        "responseId": "en:lesson-01:session-01:i11:r3",
        "correct": false,
        "testedDimension": "Вставьте скрепку — начальник ждёт ответа",
        "feedbackByLocale": {
          "ru": "Тоже не для I. Запомните пару навсегда: I am, как имя и фамилия.",
          "uk": "Теж не для I. Запам'ятайте пару назавжди: I am, як ім'я і прізвище."
        }
      }
    ],
    "payload": {
      "family": "context_gap_grammar",
      "localizedScene": {
        "ru": "Вставьте скрепку — начальник ждёт ответа, вы готовы",
        "uk": "Вставте скріпку — начальник чекає відповіді, ви готові"
      },
      "gappedTargetPhrase": "I ___ ready.",
      "gapOptions": [
        {
          "responseId": "en:lesson-01:session-01:i11:r1",
          "text": "am"
        },
        {
          "responseId": "en:lesson-01:session-01:i11:r2",
          "text": "is"
        },
        {
          "responseId": "en:lesson-01:session-01:i11:r3",
          "text": "are"
        }
      ],
      "testedDimension": "Вставьте скрепку — начальник ждёт ответа",
      "choiceFeedback": [
        {
          "responseId": "en:lesson-01:session-01:i11:r2",
          "correct": false,
          "testedDimension": "Вставьте скрепку — начальник ждёт ответа",
          "feedbackByLocale": {
            "ru": "Скрепка чужая. С I работает только am — про себя всегда I am.",
            "uk": "Скріпка чужа. З I працює тільки am — про себе завжди I am."
          }
        },
        {
          "responseId": "en:lesson-01:session-01:i11:r3",
          "correct": false,
          "testedDimension": "Вставьте скрепку — начальник ждёт ответа",
          "feedbackByLocale": {
            "ru": "Тоже не для I. Запомните пару навсегда: I am, как имя и фамилия.",
            "uk": "Теж не для I. Запам'ятайте пару назавжди: I am, як ім'я і прізвище."
          }
        }
      ]
    },
    "sourceFile": "modules/learning-v2/content/factory_native/generated_release/en/l01/s01/learner.json",
    "sourceId": "en:lesson-01:session-01:i11",
    "target": "en",
    "provenance": "authored",
    "history": "demo"
  },
  {
    "id": "i12",
    "source": "Learning V2",
    "mode": "dictation",
    "title": "Послушайте и соберите — «я готов»",
    "prompt": "Послушайте и соберите — «я готов»",
    "phrase": "",
    "answer": "I am ready.",
    "options": [],
    "tokens": [
      "I",
      "am",
      "ready"
    ],
    "distractors": [
      "fine"
    ],
    "pairs": [],
    "audio": "I am ready.",
    "feedback": [],
    "payload": {
      "family": "listen_build_dictation",
      "referenceAudio": {
        "audioTargetId": "en:lesson-01:session-01:i12:audio",
        "transcript": "I am ready."
      },
      "slowReferenceAudio": null,
      "hiddenTargetPhrase": "I am ready.",
      "orderedTokens": [
        "I",
        "am",
        "ready"
      ],
      "authoredDistractorTokens": [
        "fine"
      ],
      "slotFeedback": []
    },
    "sourceFile": "modules/learning-v2/content/factory_native/generated_release/en/l01/s01/learner.json",
    "sourceId": "en:lesson-01:session-01:i12",
    "target": "en",
    "provenance": "authored",
    "history": "demo"
  },
  {
    "id": "i14",
    "source": "Learning V2",
    "mode": "speech",
    "title": "Скажите вслух — «я рад»",
    "prompt": "Скажите вслух — «я рад»",
    "phrase": "",
    "answer": "I am happy.",
    "options": [],
    "tokens": [],
    "distractors": [],
    "pairs": [],
    "audio": "I am happy.",
    "feedback": [],
    "payload": {
      "family": "scripted_repeat_compare",
      "referenceAudio": {
        "audioTargetId": "en:lesson-01:session-01:i14:audio",
        "transcript": "I am happy."
      },
      "slowReferenceAudio": null,
      "targetPhrase": "I am happy.",
      "recordControlPolicy": "hold_press_release_with_accessible_toggle",
      "modelPlayback": "reference_and_slow",
      "learnerPlayback": "available_after_capture",
      "honestOutcomeStates": [
        "PASS_CONFIDENT",
        "NEEDS_WORK_CONFIDENT",
        "UNCERTAIN",
        "INVALID_AUDIO_OR_SYSTEM"
      ]
    },
    "sourceFile": "modules/learning-v2/content/factory_native/generated_release/en/l01/s01/learner.json",
    "sourceId": "en:lesson-01:session-01:i14",
    "target": "en",
    "provenance": "authored",
    "history": "demo"
  },
  {
    "id": "intro",
    "source": "Learning V2 · интро",
    "mode": "choice",
    "title": "Первое знакомство",
    "prompt": "Вы зашли в офис. Все обернулись. Скажите «я здесь».",
    "options": [
      {
        "id": "en:lesson-01:session-01:intro1:r1",
        "text": "I am here."
      },
      {
        "id": "en:lesson-01:session-01:intro1:r2",
        "text": "I here."
      },
      {
        "id": "en:lesson-01:session-01:intro1:r3",
        "text": "Am here."
      }
    ],
    "answer": "I am here.",
    "explanation": "`I` — это «я». `am` — маленькая скрепка. По-русски мы её пропускаем: «я\nздесь», «я готов». По-английски без неё фраза разваливается, как стул без\nодной ножки.\n\n`I am here` — «я здесь». Скажите вслух. Всё, вы только что произнесли\nпервое английское предложение, и оно правильное.",
    "sourceFile": "modules/learning-v2/content/factory_native/generated_release/en/l01/s01/intro.json",
    "sourceId": "en:lesson-01:session-01:intro1:q",
    "target": "en",
    "provenance": "authored",
    "history": "demo"
  },
  {
    "id": "exam-fill",
    "source": "Экзамен",
    "mode": "gap",
    "title": "Заполнить пропуск",
    "prompt": "Выберите пропущенное слово",
    "phrase": "She ___ a teacher.",
    "options": [
      {
        "id": "0",
        "text": "am"
      },
      {
        "id": "1",
        "text": "is"
      },
      {
        "id": "2",
        "text": "are"
      },
      {
        "id": "3",
        "text": "be"
      }
    ],
    "answer": "is",
    "sourceFile": "app/exam.tsx",
    "sourceLine": 103,
    "target": "en",
    "provenance": "authored",
    "history": "demo"
  },
  {
    "id": "exam-error",
    "source": "Экзамен",
    "mode": "choice",
    "title": "Исправить ошибку",
    "prompt": "Correct: He [are] a doctor.",
    "phrase": "",
    "options": [
      {
        "id": "0",
        "text": "is"
      },
      {
        "id": "1",
        "text": "are"
      },
      {
        "id": "2",
        "text": "am"
      },
      {
        "id": "3",
        "text": "was"
      }
    ],
    "answer": "is",
    "sourceFile": "app/exam.tsx",
    "sourceLine": 107,
    "target": "en",
    "provenance": "authored",
    "history": "demo"
  },
  {
    "id": "exam-choice4",
    "source": "Экзамен",
    "mode": "choice",
    "title": "Выбрать предложение",
    "prompt": "Which sentence is correct?",
    "phrase": "",
    "options": [
      {
        "id": "0",
        "text": "She am happy."
      },
      {
        "id": "1",
        "text": "He are my friend."
      },
      {
        "id": "2",
        "text": "They is late."
      },
      {
        "id": "3",
        "text": "You are right."
      }
    ],
    "answer": "You are right.",
    "sourceFile": "app/exam.tsx",
    "sourceLine": 106,
    "target": "en",
    "provenance": "authored",
    "history": "demo"
  },
  {
    "id": "typing",
    "source": "Диагностика",
    "mode": "typing",
    "title": "Ввести слово",
    "prompt": "Введите пропущенное слово",
    "phrase": "She has ___ working here for years.",
    "answer": "been",
    "meaning": "Она ___ работает здесь годами.",
    "sourceFile": "app/diagnostic_test.tsx",
    "sourceLine": 627,
    "target": "en",
    "provenance": "authored",
    "history": "demo"
  },
  {
    "id": "word",
    "source": "Слова урока",
    "mode": "choice",
    "title": "Выбрать слово",
    "prompt": "Готовый",
    "shown": "Готовый",
    "answer": "ready",
    "meaning": "Готовый",
    "options": [
      {
        "id": "0",
        "text": "ready"
      },
      {
        "id": "1",
        "text": "every"
      },
      {
        "id": "2",
        "text": "great"
      },
      {
        "id": "3",
        "text": "small"
      }
    ],
    "sourceFile": "app/lesson_words.tsx",
    "sourceLine": 453,
    "adaptation": "Реальные словарные данные; демонстрационный набор карточек и вариантов.",
    "target": "en",
    "provenance": "authored",
    "history": "demo"
  },
  {
    "id": "blitz",
    "source": "Карточки · блиц",
    "mode": "choice",
    "title": "Выбрать слово",
    "prompt": "Готовый",
    "shown": "Готовый",
    "answer": "ready",
    "meaning": "Готовый",
    "options": [
      {
        "id": "0",
        "text": "ready"
      },
      {
        "id": "1",
        "text": "every"
      },
      {
        "id": "2",
        "text": "great"
      },
      {
        "id": "3",
        "text": "small"
      }
    ],
    "sourceFile": "app/lesson_words.tsx",
    "sourceLine": 453,
    "adaptation": "Реальные словарные данные; демонстрационный набор карточек и вариантов.",
    "target": "en",
    "provenance": "authored",
    "history": "demo"
  },
  {
    "id": "swipe",
    "source": "Карточки · свайп",
    "mode": "swipe",
    "title": "Правильный перевод?",
    "prompt": "ready",
    "shown": "Готовый",
    "answer": "Да",
    "meaning": "Готовый",
    "options": [
      {
        "id": "0",
        "text": "ready"
      },
      {
        "id": "1",
        "text": "every"
      },
      {
        "id": "2",
        "text": "great"
      },
      {
        "id": "3",
        "text": "small"
      }
    ],
    "sourceFile": "app/lesson_words.tsx",
    "sourceLine": 453,
    "adaptation": "Реальные словарные данные; демонстрационный набор карточек и вариантов.",
    "target": "en",
    "provenance": "authored",
    "history": "demo"
  },
  {
    "id": "verb-past",
    "source": "Неправильные глаголы",
    "mode": "verb",
    "title": "Прошедшая форма",
    "prompt": "Выберите Past Simple",
    "phrase": "go",
    "meaning": "Идти; ехать",
    "answer": "went",
    "forms": [
      "go",
      "went",
      "gone"
    ],
    "options": [
      {
        "id": "0",
        "text": "go"
      },
      {
        "id": "1",
        "text": "went"
      },
      {
        "id": "2",
        "text": "gone"
      }
    ],
    "sourceFile": "app/irregular_verbs_data.ts",
    "sourceLine": 50,
    "adaptation": "Формы из словаря; порядок вариантов в макете демонстрационный.",
    "target": "en",
    "provenance": "authored",
    "history": "demo"
  },
  {
    "id": "verb-pp",
    "source": "Неправильные глаголы",
    "mode": "verb",
    "title": "Третья форма",
    "prompt": "Выберите Past Participle",
    "phrase": "go",
    "meaning": "Идти; ехать",
    "answer": "gone",
    "forms": [
      "go",
      "went",
      "gone"
    ],
    "options": [
      {
        "id": "0",
        "text": "go"
      },
      {
        "id": "1",
        "text": "went"
      },
      {
        "id": "2",
        "text": "gone"
      }
    ],
    "sourceFile": "app/irregular_verbs_data.ts",
    "sourceLine": 50,
    "adaptation": "Формы из словаря; порядок вариантов в макете демонстрационный.",
    "target": "en",
    "provenance": "authored",
    "history": "demo"
  }
];
