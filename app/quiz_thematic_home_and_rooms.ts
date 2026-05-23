import type { SkylerThematicPack } from './quiz_thematic_packs';

export const HOME_AND_ROOMS_SKYLER_PACK: SkylerThematicPack = {
  "schemaVersion": "skyler-quiz-pack-v1",
  "target": "en",
  "categoryId": "home-and-rooms",
  "categoryTitle": "Home and rooms",
  "researchPolicy": {
    "directTranslationUsed": false,
    "notes": "The first draft was authored from Oxford and British Council home/room vocabulary sources, then adapted per interface locale. It does not reuse the existing app quiz bank or direct translations."
  },
  "releasePolicy": {
    "environment": "dev-only",
    "productionActivation": "blocked_until_explicit_user_approval",
    "notes": "Home and rooms is generated Skyler thematic quiz content and must remain visible only in development until the user explicitly approves production activation."
  },
  "visualAssets": {
    "status": "generated",
    "styleBasis": "DALL-E/imagegen produced polished home-and-room theme card backgrounds and compact theme logos in the existing Phraseman thematic quiz style, with no bitmap text.",
    "assets": [
      {
        "family": "forest",
        "plaquePrompt": "Generate a forest theme card background for the Home and rooms quiz in existing Phraseman style, cozy room scene, no text.",
        "iconPrompt": "Generate a forest compact theme logo for the Home and rooms quiz in existing Phraseman style, readable room icon, no text.",
        "plaquePath": "assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-forest.webp",
        "iconPath": "assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-forest.webp"
      },
      {
        "family": "dark",
        "plaquePrompt": "Generate a dark theme card background for the Home and rooms quiz in existing Phraseman style, cozy room scene, no text.",
        "iconPrompt": "Generate a dark compact theme logo for the Home and rooms quiz in existing Phraseman style, readable room icon, no text.",
        "plaquePath": "assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-dark.webp",
        "iconPath": "assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-dark.webp"
      },
      {
        "family": "neon",
        "plaquePrompt": "Generate a neon theme card background for the Home and rooms quiz in existing Phraseman style, cozy room scene, no text.",
        "iconPrompt": "Generate a neon compact theme logo for the Home and rooms quiz in existing Phraseman style, readable room icon, no text.",
        "plaquePath": "assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-neon.webp",
        "iconPath": "assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-neon.webp"
      },
      {
        "family": "neonGreen",
        "plaquePrompt": "Generate a neonGreen theme card background for the Home and rooms quiz in existing Phraseman style, cozy room scene, no text.",
        "iconPrompt": "Generate a neonGreen compact theme logo for the Home and rooms quiz in existing Phraseman style, readable room icon, no text.",
        "plaquePath": "assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-neon-green.webp",
        "iconPath": "assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-neon-green.webp"
      },
      {
        "family": "gold",
        "plaquePrompt": "Generate a gold theme card background for the Home and rooms quiz in existing Phraseman style, cozy room scene, no text.",
        "iconPrompt": "Generate a gold compact theme logo for the Home and rooms quiz in existing Phraseman style, readable room icon, no text.",
        "plaquePath": "assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-gold.webp",
        "iconPath": "assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-gold.webp"
      },
      {
        "family": "coral",
        "plaquePrompt": "Generate a coral theme card background for the Home and rooms quiz in existing Phraseman style, cozy room scene, no text.",
        "iconPrompt": "Generate a coral compact theme logo for the Home and rooms quiz in existing Phraseman style, readable room icon, no text.",
        "plaquePath": "assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-coral.webp",
        "iconPath": "assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-coral.webp"
      },
      {
        "family": "minimalLight",
        "plaquePrompt": "Generate a minimalLight theme card background for the Home and rooms quiz in existing Phraseman style, cozy room scene, no text.",
        "iconPrompt": "Generate a minimalLight compact theme logo for the Home and rooms quiz in existing Phraseman style, readable room icon, no text.",
        "plaquePath": "assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-minimal-light.webp",
        "iconPath": "assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-minimal-light.webp"
      },
      {
        "family": "minimalDark",
        "plaquePrompt": "Generate a minimalDark theme card background for the Home and rooms quiz in existing Phraseman style, cozy room scene, no text.",
        "iconPrompt": "Generate a minimalDark compact theme logo for the Home and rooms quiz in existing Phraseman style, readable room icon, no text.",
        "plaquePath": "assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-minimal-dark.webp",
        "iconPath": "assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-minimal-dark.webp"
      }
    ]
  },
  "socialListening": {
    "status": "validated",
    "signals": [
      {
        "source": "Current Phraseman creator request",
        "text": "The creator explicitly asked for ordinary useful quiz categories like Kitchen and cooking, then selected Home and rooms as the next category."
      },
      {
        "source": "Phraseman thematic category adjacency",
        "text": "The app already ships Kitchen and cooking, so Home and rooms is the closest everyday A1-A2 sibling category for concrete object and action practice."
      }
    ]
  },
  "officialSources": [
    {
      "id": "S1",
      "title": "Oxford Learner's Dictionaries topic: Houses and homes",
      "url": "https://www.oxfordlearnersdictionaries.com/topic/houses-and-homes?level=a1",
      "tier": "B",
      "publisherType": "dictionary_or_academy",
      "usedFor": "A1/A2 home, room, furniture, room-part, and simple action vocabulary cross-checking.",
      "limitations": "Broad topic page includes advanced terms; this pack only uses simple visual A1-A2 items.",
      "checkedAt": "2026-05-22"
    },
    {
      "id": "S2",
      "title": "British Council LearnEnglish: Homes",
      "url": "https://learnenglish.britishcouncil.org/vocabulary/a1-a2-vocabulary/homes",
      "tier": "B",
      "publisherType": "official_institution",
      "usedFor": "A1 home vocabulary scope, learner-facing home prompts, and room-name practice.",
      "limitations": "Exercise page supports beginner scope but is not a complete dictionary for every item.",
      "checkedAt": "2026-05-22"
    },
    {
      "id": "S3",
      "title": "British Council LearnEnglish Teens: A room",
      "url": "https://learnenglishteens.britishcouncil.org/vocabulary/a1-a2-vocabulary/room",
      "tier": "B",
      "publisherType": "official_institution",
      "usedFor": "A1-A2 room-object vocabulary, visible room parts, and classroom-style item framing.",
      "limitations": "Teen lesson framing; final copy is adapted into the main app tone for all interface locales.",
      "checkedAt": "2026-05-22"
    }
  ],
  "claims": [
    {
      "id": "C1",
      "type": "usage_rule",
      "text": "bedroom is the correct English word for a room where you sleep. in this basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "S1 and S2 support the home vocabulary scope for bedroom; the listed distractors are same-domain words but do not match this specific meaning."
    },
    {
      "id": "K1",
      "type": "answer_key",
      "text": "Choice 0, bedroom, is the only correct answer for home-and-rooms-001.",
      "itemId": "home-and-rooms-001",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support bedroom for the tested meaning, while the other choices name different rooms, objects, parts, or actions."
    },
    {
      "id": "C2",
      "type": "usage_rule",
      "text": "bathroom is the correct English word for a room for washing. in this basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "S1 and S2 support the home vocabulary scope for bathroom; the listed distractors are same-domain words but do not match this specific meaning."
    },
    {
      "id": "K2",
      "type": "answer_key",
      "text": "Choice 1, bathroom, is the only correct answer for home-and-rooms-002.",
      "itemId": "home-and-rooms-002",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support bathroom for the tested meaning, while the other choices name different rooms, objects, parts, or actions."
    },
    {
      "id": "C3",
      "type": "usage_rule",
      "text": "living room is the correct English word for a room where people relax together. in this basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "S1 and S2 support the home vocabulary scope for living room; the listed distractors are same-domain words but do not match this specific meaning."
    },
    {
      "id": "K3",
      "type": "answer_key",
      "text": "Choice 2, living room, is the only correct answer for home-and-rooms-003.",
      "itemId": "home-and-rooms-003",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support living room for the tested meaning, while the other choices name different rooms, objects, parts, or actions."
    },
    {
      "id": "C4",
      "type": "usage_rule",
      "text": "bed is the correct English word for furniture for sleeping. in this basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "S1 and S2 support the home vocabulary scope for bed; the listed distractors are same-domain words but do not match this specific meaning."
    },
    {
      "id": "K4",
      "type": "answer_key",
      "text": "Choice 3, bed, is the only correct answer for home-and-rooms-004.",
      "itemId": "home-and-rooms-004",
      "answerIndex": 3,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support bed for the tested meaning, while the other choices name different rooms, objects, parts, or actions."
    },
    {
      "id": "C5",
      "type": "usage_rule",
      "text": "chair is the correct English word for furniture for sitting. in this basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "S1 and S3 support the home vocabulary scope for chair; the listed distractors are same-domain words but do not match this specific meaning."
    },
    {
      "id": "K5",
      "type": "answer_key",
      "text": "Choice 0, chair, is the only correct answer for home-and-rooms-005.",
      "itemId": "home-and-rooms-005",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support chair for the tested meaning, while the other choices name different rooms, objects, parts, or actions."
    },
    {
      "id": "C6",
      "type": "usage_rule",
      "text": "desk is the correct English word for furniture for work or study. in this basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "S1 and S3 support the home vocabulary scope for desk; the listed distractors are same-domain words but do not match this specific meaning."
    },
    {
      "id": "K6",
      "type": "answer_key",
      "text": "Choice 1, desk, is the only correct answer for home-and-rooms-006.",
      "itemId": "home-and-rooms-006",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support desk for the tested meaning, while the other choices name different rooms, objects, parts, or actions."
    },
    {
      "id": "C7",
      "type": "usage_rule",
      "text": "door is the correct English word for you open it to enter a room. in this basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "S1 and S3 support the home vocabulary scope for door; the listed distractors are same-domain words but do not match this specific meaning."
    },
    {
      "id": "K7",
      "type": "answer_key",
      "text": "Choice 2, door, is the only correct answer for home-and-rooms-007.",
      "itemId": "home-and-rooms-007",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support door for the tested meaning, while the other choices name different rooms, objects, parts, or actions."
    },
    {
      "id": "C8",
      "type": "usage_rule",
      "text": "window is the correct English word for you look outside through it. in this basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "S1 and S3 support the home vocabulary scope for window; the listed distractors are same-domain words but do not match this specific meaning."
    },
    {
      "id": "K8",
      "type": "answer_key",
      "text": "Choice 3, window, is the only correct answer for home-and-rooms-008.",
      "itemId": "home-and-rooms-008",
      "answerIndex": 3,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support window for the tested meaning, while the other choices name different rooms, objects, parts, or actions."
    },
    {
      "id": "C9",
      "type": "usage_rule",
      "text": "floor is the correct English word for you walk on it in a room. in this basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "S1 and S3 support the home vocabulary scope for floor; the listed distractors are same-domain words but do not match this specific meaning."
    },
    {
      "id": "K9",
      "type": "answer_key",
      "text": "Choice 0, floor, is the only correct answer for home-and-rooms-009.",
      "itemId": "home-and-rooms-009",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support floor for the tested meaning, while the other choices name different rooms, objects, parts, or actions."
    },
    {
      "id": "C10",
      "type": "usage_rule",
      "text": "wall is the correct English word for the side of a room. in this basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "S1 and S3 support the home vocabulary scope for wall; the listed distractors are same-domain words but do not match this specific meaning."
    },
    {
      "id": "K10",
      "type": "answer_key",
      "text": "Choice 1, wall, is the only correct answer for home-and-rooms-010.",
      "itemId": "home-and-rooms-010",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support wall for the tested meaning, while the other choices name different rooms, objects, parts, or actions."
    },
    {
      "id": "C11",
      "type": "usage_rule",
      "text": "clean is the correct English verb for make a room not dirty. in this basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "S1 and S2 support the home vocabulary scope for clean; the listed distractors are same-domain words but do not match this specific meaning."
    },
    {
      "id": "K11",
      "type": "answer_key",
      "text": "Choice 2, clean, is the only correct answer for home-and-rooms-011.",
      "itemId": "home-and-rooms-011",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support clean for the tested meaning, while the other choices name different rooms, objects, parts, or actions."
    },
    {
      "id": "C12",
      "type": "usage_rule",
      "text": "sit is the correct English verb for what you do on a chair. in this basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "S1 and S3 support the home vocabulary scope for sit; the listed distractors are same-domain words but do not match this specific meaning."
    },
    {
      "id": "K12",
      "type": "answer_key",
      "text": "Choice 3, sit, is the only correct answer for home-and-rooms-012.",
      "itemId": "home-and-rooms-012",
      "answerIndex": 3,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support sit for the tested meaning, while the other choices name different rooms, objects, parts, or actions."
    }
  ],
  "localeReviews": [
    {
      "locale": "ru",
      "method": "research_adapted",
      "reviewer": "Skyler ru Locale Editor",
      "notes": "RU copy keeps the current warm quiz tone: short concrete home images, direct contrasts, and no literal translation-only feedback.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S2"
      ]
    },
    {
      "locale": "uk",
      "method": "research_adapted",
      "reviewer": "Skyler uk Locale Editor",
      "notes": "UK copy uses natural Ukrainian prompts with concrete room images and per-choice contrasts, not copied Russian phrasing.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S2"
      ]
    },
    {
      "locale": "es",
      "method": "research_adapted",
      "reviewer": "Skyler es Locale Editor",
      "notes": "ES copy is concise and instructional, naming the selected English option and anchoring each answer in a home image.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S2"
      ]
    },
    {
      "locale": "pt-BR",
      "method": "research_adapted",
      "reviewer": "Skyler pt-BR Locale Editor",
      "notes": "PT-BR copy keeps explanations compact, practical, and tied to the chosen English word plus a concrete home cue.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S2"
      ]
    },
    {
      "locale": "vi",
      "method": "research_adapted",
      "reviewer": "Skyler vi Locale Editor",
      "notes": "VI copy uses simple learner-friendly Vietnamese and unique per-choice contrasts based on visible home objects.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S3"
      ]
    },
    {
      "locale": "id",
      "method": "research_adapted",
      "reviewer": "Skyler id Locale Editor",
      "notes": "ID copy is adapted into natural Indonesian with explicit selected-option feedback and concrete memory cues.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S3"
      ]
    },
    {
      "locale": "tr",
      "method": "research_adapted",
      "reviewer": "Skyler tr Locale Editor",
      "notes": "TR copy uses direct Turkish explanations, keeps the selected English choice visible, and avoids literal template copying.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S3"
      ]
    },
    {
      "locale": "pl",
      "method": "research_adapted",
      "reviewer": "Skyler pl Locale Editor",
      "notes": "PL copy gives concise Polish feedback with selected-choice contrast and a concrete anchor for memory.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S3"
      ]
    }
  ],
  "items": [
    {
      "id": "home-and-rooms-001",
      "type": "mcq",
      "prompt": "A room where you sleep.",
      "localizedPrompts": {
        "ru": "Какое английское слово означает «комната для сна»?",
        "uk": "Яке англійське слово означає «кімната для сну»?",
        "es": "¿Qué palabra inglesa significa «habitación para dormir»?",
        "pt-BR": "Qual palavra em inglês significa “quarto para dormir”?",
        "vi": "Từ tiếng Anh nào có nghĩa là “phòng để ngủ”?",
        "id": "Kata Inggris mana yang berarti “kamar untuk tidur”?",
        "tr": "“uyumak için oda” anlamına gelen İngilizce kelime hangisi?",
        "pl": "Które angielskie słowo znaczy „pokój do spania”?"
      },
      "choices": [
        "bedroom",
        "bathroom",
        "kitchen",
        "living room"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose bedroom for the home vocabulary meaning: A room where you sleep.",
      "skillTag": "home_room_name",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C1",
        "K1"
      ],
      "choiceRationales": [
        "bedroom matches the tested home-and-rooms meaning and is supported by the cited learner vocabulary sources.",
        "bathroom is a plausible same-domain distractor, but it does not express the tested meaning: A room where you sleep.",
        "kitchen is a plausible same-domain distractor, but it does not express the tested meaning: A room where you sleep.",
        "living room is a plausible same-domain distractor, but it does not express the tested meaning: A room where you sleep."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! bedroom — слово для «комната для сна». Держи короткий образ: кровать и сон, и ответ быстро всплывает.",
          "bathroom уводит в другую домашнюю деталь. Для «комната для сна» выбираем bedroom, слово держится за образ: кровать и сон.",
          "kitchen звучит по-домашнему, но смысл другой. bedroom закрывает идею «комната для сна»; вспоминай кровать и сон.",
          "living room не та вещь для этого смысла. Ответ bedroom; представь кровать и сон, и слово легче поймать."
        ],
        "uk": [
          "Бінго! bedroom — слово для «кімната для сну». Тримай короткий образ: ліжко і сон, і відповідь легко згадується.",
          "bathroom веде до іншої домашньої деталі. Для «кімната для сну» обираємо bedroom, бо тримаємо в голові ліжко і сон.",
          "kitchen теж із домашнього світу, але сенс інший. bedroom закриває ідею «кімната для сну»; згадай ліжко і сон.",
          "living room не та річ для цього значення. Відповідь bedroom; уяви ліжко і сон, і слово стає ближчим."
        ],
        "es": [
          "Bien. bedroom es la palabra para «habitación para dormir». Quédate con la imagen de una cama y sueño; ayuda a recordarla sin drama.",
          "bathroom apunta a otra cosa de la casa. Para «habitación para dormir», usa bedroom y piensa en una cama y sueño.",
          "kitchen suena doméstico, pero cambia el sentido. bedroom cubre «habitación para dormir»; imagina una cama y sueño.",
          "living room no nombra esa idea. La respuesta es bedroom; con una cama y sueño la palabra se queda mejor."
        ],
        "pt-BR": [
          "Correto. bedroom é a palavra para “quarto para dormir”. Guarde a imagem de uma cama e sono; ela puxa a resposta na hora.",
          "bathroom aponta para outra coisa da casa. Para “quarto para dormir”, use bedroom e imagine uma cama e sono.",
          "kitchen parece do mesmo tema, mas muda o sentido. bedroom cobre “quarto para dormir”; lembre de uma cama e sono.",
          "living room não nomeia essa ideia. A resposta é bedroom; com uma cama e sono, a palavra gruda melhor."
        ],
        "vi": [
          "Đúng. bedroom là từ cho “phòng để ngủ”. Hãy giữ hình ảnh chiếc giường và giấc ngủ; nó kéo câu trả lời về rất nhanh.",
          "bathroom chỉ sang thứ khác trong nhà. Với “phòng để ngủ”, chọn bedroom và nhớ chiếc giường và giấc ngủ.",
          "kitchen vẫn là từ về nhà cửa, nhưng nghĩa lệch. bedroom mới đúng cho “phòng để ngủ”; nghĩ tới chiếc giường và giấc ngủ.",
          "living room không gọi đúng ý này. Đáp án là bedroom; hình ảnh chiếc giường và giấc ngủ giúp nhớ lâu hơn."
        ],
        "id": [
          "Benar. bedroom adalah kata untuk “kamar untuk tidur”. Simpan gambaran tempat tidur dan tidur; itu membuat jawabannya mudah muncul.",
          "bathroom menunjuk hal lain di rumah. Untuk “kamar untuk tidur”, pilih bedroom dan bayangkan tempat tidur dan tidur.",
          "kitchen masih terasa seputar rumah, tetapi artinya bergeser. bedroom pas untuk “kamar untuk tidur”; ingat tempat tidur dan tidur.",
          "living room bukan nama untuk ide ini. Jawabannya bedroom; dengan tempat tidur dan tidur, kata itu lebih mudah menempel."
        ],
        "tr": [
          "Doğru. bedroom, “uyumak için oda” için kullanılan kelime. Aklında yatak ve uyku kalsın; cevap daha kolay gelir.",
          "bathroom evde başka bir şeyi gösterir. “uyumak için oda” için bedroom seçilir; yatak ve uyku bunu netleştirir.",
          "kitchen ev konusuna yakın durur, ama anlamı farklıdır. bedroom “uyumak için oda” fikrini verir; yatak ve uyku düşün.",
          "living room bu fikrin adı değildir. Cevap bedroom; yatak ve uyku görüntüsü kelimeyi tutturur."
        ],
        "pl": [
          "Dobrze. bedroom to słowo na „pokój do spania”. Zapamiętaj obraz: łóżko i sen; wtedy odpowiedź szybko wraca.",
          "bathroom wskazuje inną rzecz w domu. Dla „pokój do spania” wybierz bedroom i pomyśl o łóżko i sen.",
          "kitchen brzmi domowo, ale ma inny sens. bedroom oddaje „pokój do spania”; pomaga obraz łóżko i sen.",
          "living room nie nazywa tej idei. Odpowiedź to bedroom; z obrazem łóżko i sen łatwiej ją złapać."
        ]
      }
    },
    {
      "id": "home-and-rooms-002",
      "type": "mcq",
      "prompt": "A room for washing.",
      "localizedPrompts": {
        "ru": "Какое английское слово означает «комната, где моются»?",
        "uk": "Яке англійське слово означає «кімната, де миються»?",
        "es": "¿Qué palabra inglesa significa «cuarto donde te lavas»?",
        "pt-BR": "Qual palavra em inglês significa “cômodo onde você se lava”?",
        "vi": "Từ tiếng Anh nào có nghĩa là “phòng để tắm rửa”?",
        "id": "Kata Inggris mana yang berarti “ruang untuk mandi”?",
        "tr": "“yıkanmak için oda” anlamına gelen İngilizce kelime hangisi?",
        "pl": "Które angielskie słowo znaczy „pomieszczenie do mycia się”?"
      },
      "choices": [
        "bedroom",
        "bathroom",
        "hallway",
        "living room"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose bathroom for the home vocabulary meaning: A room for washing.",
      "skillTag": "home_room_name",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C2",
        "K2"
      ],
      "choiceRationales": [
        "bedroom is a plausible same-domain distractor, but it does not express the tested meaning: A room for washing.",
        "bathroom matches the tested home-and-rooms meaning and is supported by the cited learner vocabulary sources.",
        "hallway is a plausible same-domain distractor, but it does not express the tested meaning: A room for washing.",
        "living room is a plausible same-domain distractor, but it does not express the tested meaning: A room for washing."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "bedroom не подходит к смыслу «комната, где моются». Здесь нужен bathroom; якорь простой: душ, вода и зеркало.",
          "Бинго! bathroom — слово для «комната, где моются». Держи короткий образ: душ, вода и зеркало, и ответ быстро всплывает.",
          "hallway звучит по-домашнему, но смысл другой. bathroom закрывает идею «комната, где моются»; вспоминай душ, вода и зеркало.",
          "living room не та вещь для этого смысла. Ответ bathroom; представь душ, вода и зеркало, и слово легче поймать."
        ],
        "uk": [
          "bedroom не підходить до змісту «кімната, де миються». Тут потрібне bathroom; простий якір: душ, вода і дзеркало.",
          "Бінго! bathroom — слово для «кімната, де миються». Тримай короткий образ: душ, вода і дзеркало, і відповідь легко згадується.",
          "hallway теж із домашнього світу, але сенс інший. bathroom закриває ідею «кімната, де миються»; згадай душ, вода і дзеркало.",
          "living room не та річ для цього значення. Відповідь bathroom; уяви душ, вода і дзеркало, і слово стає ближчим."
        ],
        "es": [
          "bedroom no encaja con «cuarto donde te lavas». Aquí va bathroom; la pista mental es ducha, agua y espejo.",
          "Bien. bathroom es la palabra para «cuarto donde te lavas». Quédate con la imagen de ducha, agua y espejo; ayuda a recordarla sin drama.",
          "hallway suena doméstico, pero cambia el sentido. bathroom cubre «cuarto donde te lavas»; imagina ducha, agua y espejo.",
          "living room no nombra esa idea. La respuesta es bathroom; con ducha, agua y espejo la palabra se queda mejor."
        ],
        "pt-BR": [
          "bedroom não combina com “cômodo onde você se lava”. Aqui é bathroom; pense em chuveiro, água e espelho.",
          "Correto. bathroom é a palavra para “cômodo onde você se lava”. Guarde a imagem de chuveiro, água e espelho; ela puxa a resposta na hora.",
          "hallway parece do mesmo tema, mas muda o sentido. bathroom cobre “cômodo onde você se lava”; lembre de chuveiro, água e espelho.",
          "living room não nomeia essa ideia. A resposta é bathroom; com chuveiro, água e espelho, a palavra gruda melhor."
        ],
        "vi": [
          "bedroom không khớp với “phòng để tắm rửa”. Ở đây cần bathroom; điểm neo là vòi sen, nước và gương.",
          "Đúng. bathroom là từ cho “phòng để tắm rửa”. Hãy giữ hình ảnh vòi sen, nước và gương; nó kéo câu trả lời về rất nhanh.",
          "hallway vẫn là từ về nhà cửa, nhưng nghĩa lệch. bathroom mới đúng cho “phòng để tắm rửa”; nghĩ tới vòi sen, nước và gương.",
          "living room không gọi đúng ý này. Đáp án là bathroom; hình ảnh vòi sen, nước và gương giúp nhớ lâu hơn."
        ],
        "id": [
          "bedroom tidak cocok dengan “ruang untuk mandi”. Di sini perlu bathroom; pegang gambaran pancuran, air, dan cermin.",
          "Benar. bathroom adalah kata untuk “ruang untuk mandi”. Simpan gambaran pancuran, air, dan cermin; itu membuat jawabannya mudah muncul.",
          "hallway masih terasa seputar rumah, tetapi artinya bergeser. bathroom pas untuk “ruang untuk mandi”; ingat pancuran, air, dan cermin.",
          "living room bukan nama untuk ide ini. Jawabannya bathroom; dengan pancuran, air, dan cermin, kata itu lebih mudah menempel."
        ],
        "tr": [
          "bedroom, “yıkanmak için oda” anlamına uymaz. Burada bathroom gerekir; akıldaki küçük görsel duş, su ve ayna.",
          "Doğru. bathroom, “yıkanmak için oda” için kullanılan kelime. Aklında duş, su ve ayna kalsın; cevap daha kolay gelir.",
          "hallway ev konusuna yakın durur, ama anlamı farklıdır. bathroom “yıkanmak için oda” fikrini verir; duş, su ve ayna düşün.",
          "living room bu fikrin adı değildir. Cevap bathroom; duş, su ve ayna görüntüsü kelimeyi tutturur."
        ],
        "pl": [
          "bedroom nie pasuje do znaczenia „pomieszczenie do mycia się”. Tutaj potrzebne jest bathroom; skojarz z prysznic, woda i lustro.",
          "Dobrze. bathroom to słowo na „pomieszczenie do mycia się”. Zapamiętaj obraz: prysznic, woda i lustro; wtedy odpowiedź szybko wraca.",
          "hallway brzmi domowo, ale ma inny sens. bathroom oddaje „pomieszczenie do mycia się”; pomaga obraz prysznic, woda i lustro.",
          "living room nie nazywa tej idei. Odpowiedź to bathroom; z obrazem prysznic, woda i lustro łatwiej ją złapać."
        ]
      }
    },
    {
      "id": "home-and-rooms-003",
      "type": "mcq",
      "prompt": "A room where people relax together.",
      "localizedPrompts": {
        "ru": "Какое английское слово означает «комната, где отдыхают вместе»?",
        "uk": "Яке англійське слово означає «кімната, де відпочивають разом»?",
        "es": "¿Qué palabra inglesa significa «sala donde la gente descansa junta»?",
        "pt-BR": "Qual palavra em inglês significa “sala onde as pessoas relaxam juntas”?",
        "vi": "Từ tiếng Anh nào có nghĩa là “phòng mọi người thư giãn cùng nhau”?",
        "id": "Kata Inggris mana yang berarti “ruang untuk bersantai bersama”?",
        "tr": "“insanların birlikte dinlendiği oda” anlamına gelen İngilizce kelime hangisi?",
        "pl": "Które angielskie słowo znaczy „pokój, w którym ludzie odpoczywają razem”?"
      },
      "choices": [
        "kitchen",
        "bedroom",
        "living room",
        "bathroom"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose living room for the home vocabulary meaning: A room where people relax together.",
      "skillTag": "home_room_name",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C3",
        "K3"
      ],
      "choiceRationales": [
        "kitchen is a plausible same-domain distractor, but it does not express the tested meaning: A room where people relax together.",
        "bedroom is a plausible same-domain distractor, but it does not express the tested meaning: A room where people relax together.",
        "living room matches the tested home-and-rooms meaning and is supported by the cited learner vocabulary sources.",
        "bathroom is a plausible same-domain distractor, but it does not express the tested meaning: A room where people relax together."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "kitchen не подходит к смыслу «комната, где отдыхают вместе». Здесь нужен living room; якорь простой: диван, разговор и телевизор.",
          "bedroom уводит в другую домашнюю деталь. Для «комната, где отдыхают вместе» выбираем living room, слово держится за образ: диван, разговор и телевизор.",
          "Бинго! living room — слово для «комната, где отдыхают вместе». Держи короткий образ: диван, разговор и телевизор, и ответ быстро всплывает.",
          "bathroom не та вещь для этого смысла. Ответ living room; представь диван, разговор и телевизор, и слово легче поймать."
        ],
        "uk": [
          "kitchen не підходить до змісту «кімната, де відпочивають разом». Тут потрібне living room; простий якір: диван, розмова і телевізор.",
          "bedroom веде до іншої домашньої деталі. Для «кімната, де відпочивають разом» обираємо living room, бо тримаємо в голові диван, розмова і телевізор.",
          "Бінго! living room — слово для «кімната, де відпочивають разом». Тримай короткий образ: диван, розмова і телевізор, і відповідь легко згадується.",
          "bathroom не та річ для цього значення. Відповідь living room; уяви диван, розмова і телевізор, і слово стає ближчим."
        ],
        "es": [
          "kitchen no encaja con «sala donde la gente descansa junta». Aquí va living room; la pista mental es sofá, charla y televisión.",
          "bedroom apunta a otra cosa de la casa. Para «sala donde la gente descansa junta», usa living room y piensa en sofá, charla y televisión.",
          "Bien. living room es la palabra para «sala donde la gente descansa junta». Quédate con la imagen de sofá, charla y televisión; ayuda a recordarla sin drama.",
          "bathroom no nombra esa idea. La respuesta es living room; con sofá, charla y televisión la palabra se queda mejor."
        ],
        "pt-BR": [
          "kitchen não combina com “sala onde as pessoas relaxam juntas”. Aqui é living room; pense em sofá, conversa e TV.",
          "bedroom aponta para outra coisa da casa. Para “sala onde as pessoas relaxam juntas”, use living room e imagine sofá, conversa e TV.",
          "Correto. living room é a palavra para “sala onde as pessoas relaxam juntas”. Guarde a imagem de sofá, conversa e TV; ela puxa a resposta na hora.",
          "bathroom não nomeia essa ideia. A resposta é living room; com sofá, conversa e TV, a palavra gruda melhor."
        ],
        "vi": [
          "kitchen không khớp với “phòng mọi người thư giãn cùng nhau”. Ở đây cần living room; điểm neo là ghế sofa, trò chuyện và TV.",
          "bedroom chỉ sang thứ khác trong nhà. Với “phòng mọi người thư giãn cùng nhau”, chọn living room và nhớ ghế sofa, trò chuyện và TV.",
          "Đúng. living room là từ cho “phòng mọi người thư giãn cùng nhau”. Hãy giữ hình ảnh ghế sofa, trò chuyện và TV; nó kéo câu trả lời về rất nhanh.",
          "bathroom không gọi đúng ý này. Đáp án là living room; hình ảnh ghế sofa, trò chuyện và TV giúp nhớ lâu hơn."
        ],
        "id": [
          "kitchen tidak cocok dengan “ruang untuk bersantai bersama”. Di sini perlu living room; pegang gambaran sofa, obrolan, dan TV.",
          "bedroom menunjuk hal lain di rumah. Untuk “ruang untuk bersantai bersama”, pilih living room dan bayangkan sofa, obrolan, dan TV.",
          "Benar. living room adalah kata untuk “ruang untuk bersantai bersama”. Simpan gambaran sofa, obrolan, dan TV; itu membuat jawabannya mudah muncul.",
          "bathroom bukan nama untuk ide ini. Jawabannya living room; dengan sofa, obrolan, dan TV, kata itu lebih mudah menempel."
        ],
        "tr": [
          "kitchen, “insanların birlikte dinlendiği oda” anlamına uymaz. Burada living room gerekir; akıldaki küçük görsel koltuk, sohbet ve televizyon.",
          "bedroom evde başka bir şeyi gösterir. “insanların birlikte dinlendiği oda” için living room seçilir; koltuk, sohbet ve televizyon bunu netleştirir.",
          "Doğru. living room, “insanların birlikte dinlendiği oda” için kullanılan kelime. Aklında koltuk, sohbet ve televizyon kalsın; cevap daha kolay gelir.",
          "bathroom bu fikrin adı değildir. Cevap living room; koltuk, sohbet ve televizyon görüntüsü kelimeyi tutturur."
        ],
        "pl": [
          "kitchen nie pasuje do znaczenia „pokój, w którym ludzie odpoczywają razem”. Tutaj potrzebne jest living room; skojarz z sofa, rozmowa i telewizor.",
          "bedroom wskazuje inną rzecz w domu. Dla „pokój, w którym ludzie odpoczywają razem” wybierz living room i pomyśl o sofa, rozmowa i telewizor.",
          "Dobrze. living room to słowo na „pokój, w którym ludzie odpoczywają razem”. Zapamiętaj obraz: sofa, rozmowa i telewizor; wtedy odpowiedź szybko wraca.",
          "bathroom nie nazywa tej idei. Odpowiedź to living room; z obrazem sofa, rozmowa i telewizor łatwiej ją złapać."
        ]
      }
    },
    {
      "id": "home-and-rooms-004",
      "type": "mcq",
      "prompt": "Furniture for sleeping.",
      "localizedPrompts": {
        "ru": "Какое английское слово означает «мебель для сна»?",
        "uk": "Яке англійське слово означає «меблі для сну»?",
        "es": "¿Qué palabra inglesa significa «mueble para dormir»?",
        "pt-BR": "Qual palavra em inglês significa “móvel para dormir”?",
        "vi": "Từ tiếng Anh nào có nghĩa là “đồ nội thất để ngủ”?",
        "id": "Kata Inggris mana yang berarti “perabot untuk tidur”?",
        "tr": "“uyumak için mobilya” anlamına gelen İngilizce kelime hangisi?",
        "pl": "Które angielskie słowo znaczy „mebel do spania”?"
      },
      "choices": [
        "desk",
        "chair",
        "table",
        "bed"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose bed for the home vocabulary meaning: Furniture for sleeping.",
      "skillTag": "home_furniture",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C4",
        "K4"
      ],
      "choiceRationales": [
        "desk is a plausible same-domain distractor, but it does not express the tested meaning: Furniture for sleeping.",
        "chair is a plausible same-domain distractor, but it does not express the tested meaning: Furniture for sleeping.",
        "table is a plausible same-domain distractor, but it does not express the tested meaning: Furniture for sleeping.",
        "bed matches the tested home-and-rooms meaning and is supported by the cited learner vocabulary sources."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "desk не подходит к смыслу «мебель для сна». Здесь нужен bed; якорь простой: подушка и одеяло.",
          "chair уводит в другую домашнюю деталь. Для «мебель для сна» выбираем bed, слово держится за образ: подушка и одеяло.",
          "table звучит по-домашнему, но смысл другой. bed закрывает идею «мебель для сна»; вспоминай подушка и одеяло.",
          "Бинго! bed — слово для «мебель для сна». Держи короткий образ: подушка и одеяло, и ответ быстро всплывает."
        ],
        "uk": [
          "desk не підходить до змісту «меблі для сну». Тут потрібне bed; простий якір: подушка і ковдра.",
          "chair веде до іншої домашньої деталі. Для «меблі для сну» обираємо bed, бо тримаємо в голові подушка і ковдра.",
          "table теж із домашнього світу, але сенс інший. bed закриває ідею «меблі для сну»; згадай подушка і ковдра.",
          "Бінго! bed — слово для «меблі для сну». Тримай короткий образ: подушка і ковдра, і відповідь легко згадується."
        ],
        "es": [
          "desk no encaja con «mueble para dormir». Aquí va bed; la pista mental es almohada y manta.",
          "chair apunta a otra cosa de la casa. Para «mueble para dormir», usa bed y piensa en almohada y manta.",
          "table suena doméstico, pero cambia el sentido. bed cubre «mueble para dormir»; imagina almohada y manta.",
          "Bien. bed es la palabra para «mueble para dormir». Quédate con la imagen de almohada y manta; ayuda a recordarla sin drama."
        ],
        "pt-BR": [
          "desk não combina com “móvel para dormir”. Aqui é bed; pense em travesseiro e cobertor.",
          "chair aponta para outra coisa da casa. Para “móvel para dormir”, use bed e imagine travesseiro e cobertor.",
          "table parece do mesmo tema, mas muda o sentido. bed cobre “móvel para dormir”; lembre de travesseiro e cobertor.",
          "Correto. bed é a palavra para “móvel para dormir”. Guarde a imagem de travesseiro e cobertor; ela puxa a resposta na hora."
        ],
        "vi": [
          "desk không khớp với “đồ nội thất để ngủ”. Ở đây cần bed; điểm neo là gối và chăn.",
          "chair chỉ sang thứ khác trong nhà. Với “đồ nội thất để ngủ”, chọn bed và nhớ gối và chăn.",
          "table vẫn là từ về nhà cửa, nhưng nghĩa lệch. bed mới đúng cho “đồ nội thất để ngủ”; nghĩ tới gối và chăn.",
          "Đúng. bed là từ cho “đồ nội thất để ngủ”. Hãy giữ hình ảnh gối và chăn; nó kéo câu trả lời về rất nhanh."
        ],
        "id": [
          "desk tidak cocok dengan “perabot untuk tidur”. Di sini perlu bed; pegang gambaran bantal dan selimut.",
          "chair menunjuk hal lain di rumah. Untuk “perabot untuk tidur”, pilih bed dan bayangkan bantal dan selimut.",
          "table masih terasa seputar rumah, tetapi artinya bergeser. bed pas untuk “perabot untuk tidur”; ingat bantal dan selimut.",
          "Benar. bed adalah kata untuk “perabot untuk tidur”. Simpan gambaran bantal dan selimut; itu membuat jawabannya mudah muncul."
        ],
        "tr": [
          "desk, “uyumak için mobilya” anlamına uymaz. Burada bed gerekir; akıldaki küçük görsel yastık ve battaniye.",
          "chair evde başka bir şeyi gösterir. “uyumak için mobilya” için bed seçilir; yastık ve battaniye bunu netleştirir.",
          "table ev konusuna yakın durur, ama anlamı farklıdır. bed “uyumak için mobilya” fikrini verir; yastık ve battaniye düşün.",
          "Doğru. bed, “uyumak için mobilya” için kullanılan kelime. Aklında yastık ve battaniye kalsın; cevap daha kolay gelir."
        ],
        "pl": [
          "desk nie pasuje do znaczenia „mebel do spania”. Tutaj potrzebne jest bed; skojarz z poduszka i koc.",
          "chair wskazuje inną rzecz w domu. Dla „mebel do spania” wybierz bed i pomyśl o poduszka i koc.",
          "table brzmi domowo, ale ma inny sens. bed oddaje „mebel do spania”; pomaga obraz poduszka i koc.",
          "Dobrze. bed to słowo na „mebel do spania”. Zapamiętaj obraz: poduszka i koc; wtedy odpowiedź szybko wraca."
        ]
      }
    },
    {
      "id": "home-and-rooms-005",
      "type": "mcq",
      "prompt": "Furniture for sitting.",
      "localizedPrompts": {
        "ru": "Какое английское слово означает «мебель, на которой сидят»?",
        "uk": "Яке англійське слово означає «меблі, на яких сидять»?",
        "es": "¿Qué palabra inglesa significa «mueble para sentarse»?",
        "pt-BR": "Qual palavra em inglês significa “móvel para sentar”?",
        "vi": "Từ tiếng Anh nào có nghĩa là “đồ nội thất để ngồi”?",
        "id": "Kata Inggris mana yang berarti “perabot untuk duduk”?",
        "tr": "“oturmak için mobilya” anlamına gelen İngilizce kelime hangisi?",
        "pl": "Które angielskie słowo znaczy „mebel do siedzenia”?"
      },
      "choices": [
        "chair",
        "bed",
        "door",
        "window"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose chair for the home vocabulary meaning: Furniture for sitting.",
      "skillTag": "home_furniture",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C5",
        "K5"
      ],
      "choiceRationales": [
        "chair matches the tested home-and-rooms meaning and is supported by the cited learner vocabulary sources.",
        "bed is a plausible same-domain distractor, but it does not express the tested meaning: Furniture for sitting.",
        "door is a plausible same-domain distractor, but it does not express the tested meaning: Furniture for sitting.",
        "window is a plausible same-domain distractor, but it does not express the tested meaning: Furniture for sitting."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! chair — слово для «мебель, на которой сидят». Держи короткий образ: сиденье и спинка, и ответ быстро всплывает.",
          "bed уводит в другую домашнюю деталь. Для «мебель, на которой сидят» выбираем chair, слово держится за образ: сиденье и спинка.",
          "door звучит по-домашнему, но смысл другой. chair закрывает идею «мебель, на которой сидят»; вспоминай сиденье и спинка.",
          "window не та вещь для этого смысла. Ответ chair; представь сиденье и спинка, и слово легче поймать."
        ],
        "uk": [
          "Бінго! chair — слово для «меблі, на яких сидять». Тримай короткий образ: сидіння і спинка, і відповідь легко згадується.",
          "bed веде до іншої домашньої деталі. Для «меблі, на яких сидять» обираємо chair, бо тримаємо в голові сидіння і спинка.",
          "door теж із домашнього світу, але сенс інший. chair закриває ідею «меблі, на яких сидять»; згадай сидіння і спинка.",
          "window не та річ для цього значення. Відповідь chair; уяви сидіння і спинка, і слово стає ближчим."
        ],
        "es": [
          "Bien. chair es la palabra para «mueble para sentarse». Quédate con la imagen de asiento y respaldo; ayuda a recordarla sin drama.",
          "bed apunta a otra cosa de la casa. Para «mueble para sentarse», usa chair y piensa en asiento y respaldo.",
          "door suena doméstico, pero cambia el sentido. chair cubre «mueble para sentarse»; imagina asiento y respaldo.",
          "window no nombra esa idea. La respuesta es chair; con asiento y respaldo la palabra se queda mejor."
        ],
        "pt-BR": [
          "Correto. chair é a palavra para “móvel para sentar”. Guarde a imagem de assento e encosto; ela puxa a resposta na hora.",
          "bed aponta para outra coisa da casa. Para “móvel para sentar”, use chair e imagine assento e encosto.",
          "door parece do mesmo tema, mas muda o sentido. chair cobre “móvel para sentar”; lembre de assento e encosto.",
          "window não nomeia essa ideia. A resposta é chair; com assento e encosto, a palavra gruda melhor."
        ],
        "vi": [
          "Đúng. chair là từ cho “đồ nội thất để ngồi”. Hãy giữ hình ảnh mặt ghế và lưng ghế; nó kéo câu trả lời về rất nhanh.",
          "bed chỉ sang thứ khác trong nhà. Với “đồ nội thất để ngồi”, chọn chair và nhớ mặt ghế và lưng ghế.",
          "door vẫn là từ về nhà cửa, nhưng nghĩa lệch. chair mới đúng cho “đồ nội thất để ngồi”; nghĩ tới mặt ghế và lưng ghế.",
          "window không gọi đúng ý này. Đáp án là chair; hình ảnh mặt ghế và lưng ghế giúp nhớ lâu hơn."
        ],
        "id": [
          "Benar. chair adalah kata untuk “perabot untuk duduk”. Simpan gambaran dudukan dan sandaran; itu membuat jawabannya mudah muncul.",
          "bed menunjuk hal lain di rumah. Untuk “perabot untuk duduk”, pilih chair dan bayangkan dudukan dan sandaran.",
          "door masih terasa seputar rumah, tetapi artinya bergeser. chair pas untuk “perabot untuk duduk”; ingat dudukan dan sandaran.",
          "window bukan nama untuk ide ini. Jawabannya chair; dengan dudukan dan sandaran, kata itu lebih mudah menempel."
        ],
        "tr": [
          "Doğru. chair, “oturmak için mobilya” için kullanılan kelime. Aklında oturak ve sırtlık kalsın; cevap daha kolay gelir.",
          "bed evde başka bir şeyi gösterir. “oturmak için mobilya” için chair seçilir; oturak ve sırtlık bunu netleştirir.",
          "door ev konusuna yakın durur, ama anlamı farklıdır. chair “oturmak için mobilya” fikrini verir; oturak ve sırtlık düşün.",
          "window bu fikrin adı değildir. Cevap chair; oturak ve sırtlık görüntüsü kelimeyi tutturur."
        ],
        "pl": [
          "Dobrze. chair to słowo na „mebel do siedzenia”. Zapamiętaj obraz: siedzisko i oparcie; wtedy odpowiedź szybko wraca.",
          "bed wskazuje inną rzecz w domu. Dla „mebel do siedzenia” wybierz chair i pomyśl o siedzisko i oparcie.",
          "door brzmi domowo, ale ma inny sens. chair oddaje „mebel do siedzenia”; pomaga obraz siedzisko i oparcie.",
          "window nie nazywa tej idei. Odpowiedź to chair; z obrazem siedzisko i oparcie łatwiej ją złapać."
        ]
      }
    },
    {
      "id": "home-and-rooms-006",
      "type": "mcq",
      "prompt": "Furniture for work or study.",
      "localizedPrompts": {
        "ru": "Какое английское слово означает «мебель для работы или учебы»?",
        "uk": "Яке англійське слово означає «меблі для роботи або навчання»?",
        "es": "¿Qué palabra inglesa significa «mueble para trabajar o estudiar»?",
        "pt-BR": "Qual palavra em inglês significa “móvel para trabalhar ou estudar”?",
        "vi": "Từ tiếng Anh nào có nghĩa là “đồ nội thất để làm việc hoặc học”?",
        "id": "Kata Inggris mana yang berarti “perabot untuk bekerja atau belajar”?",
        "tr": "“çalışmak veya okumak için mobilya” anlamına gelen İngilizce kelime hangisi?",
        "pl": "Które angielskie słowo znaczy „mebel do pracy albo nauki”?"
      },
      "choices": [
        "bed",
        "desk",
        "sofa",
        "cupboard"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose desk for the home vocabulary meaning: Furniture for work or study.",
      "skillTag": "home_furniture",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C6",
        "K6"
      ],
      "choiceRationales": [
        "bed is a plausible same-domain distractor, but it does not express the tested meaning: Furniture for work or study.",
        "desk matches the tested home-and-rooms meaning and is supported by the cited learner vocabulary sources.",
        "sofa is a plausible same-domain distractor, but it does not express the tested meaning: Furniture for work or study.",
        "cupboard is a plausible same-domain distractor, but it does not express the tested meaning: Furniture for work or study."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "bed не подходит к смыслу «мебель для работы или учебы». Здесь нужен desk; якорь простой: ноутбук, тетрадь и лампа.",
          "Бинго! desk — слово для «мебель для работы или учебы». Держи короткий образ: ноутбук, тетрадь и лампа, и ответ быстро всплывает.",
          "sofa звучит по-домашнему, но смысл другой. desk закрывает идею «мебель для работы или учебы»; вспоминай ноутбук, тетрадь и лампа.",
          "cupboard не та вещь для этого смысла. Ответ desk; представь ноутбук, тетрадь и лампа, и слово легче поймать."
        ],
        "uk": [
          "bed не підходить до змісту «меблі для роботи або навчання». Тут потрібне desk; простий якір: ноутбук, зошит і лампа.",
          "Бінго! desk — слово для «меблі для роботи або навчання». Тримай короткий образ: ноутбук, зошит і лампа, і відповідь легко згадується.",
          "sofa теж із домашнього світу, але сенс інший. desk закриває ідею «меблі для роботи або навчання»; згадай ноутбук, зошит і лампа.",
          "cupboard не та річ для цього значення. Відповідь desk; уяви ноутбук, зошит і лампа, і слово стає ближчим."
        ],
        "es": [
          "bed no encaja con «mueble para trabajar o estudiar». Aquí va desk; la pista mental es portátil, cuaderno y lámpara.",
          "Bien. desk es la palabra para «mueble para trabajar o estudiar». Quédate con la imagen de portátil, cuaderno y lámpara; ayuda a recordarla sin drama.",
          "sofa suena doméstico, pero cambia el sentido. desk cubre «mueble para trabajar o estudiar»; imagina portátil, cuaderno y lámpara.",
          "cupboard no nombra esa idea. La respuesta es desk; con portátil, cuaderno y lámpara la palabra se queda mejor."
        ],
        "pt-BR": [
          "bed não combina com “móvel para trabalhar ou estudar”. Aqui é desk; pense em notebook, caderno e luminária.",
          "Correto. desk é a palavra para “móvel para trabalhar ou estudar”. Guarde a imagem de notebook, caderno e luminária; ela puxa a resposta na hora.",
          "sofa parece do mesmo tema, mas muda o sentido. desk cobre “móvel para trabalhar ou estudar”; lembre de notebook, caderno e luminária.",
          "cupboard não nomeia essa ideia. A resposta é desk; com notebook, caderno e luminária, a palavra gruda melhor."
        ],
        "vi": [
          "bed không khớp với “đồ nội thất để làm việc hoặc học”. Ở đây cần desk; điểm neo là máy tính, vở và đèn bàn.",
          "Đúng. desk là từ cho “đồ nội thất để làm việc hoặc học”. Hãy giữ hình ảnh máy tính, vở và đèn bàn; nó kéo câu trả lời về rất nhanh.",
          "sofa vẫn là từ về nhà cửa, nhưng nghĩa lệch. desk mới đúng cho “đồ nội thất để làm việc hoặc học”; nghĩ tới máy tính, vở và đèn bàn.",
          "cupboard không gọi đúng ý này. Đáp án là desk; hình ảnh máy tính, vở và đèn bàn giúp nhớ lâu hơn."
        ],
        "id": [
          "bed tidak cocok dengan “perabot untuk bekerja atau belajar”. Di sini perlu desk; pegang gambaran laptop, buku catatan, dan lampu.",
          "Benar. desk adalah kata untuk “perabot untuk bekerja atau belajar”. Simpan gambaran laptop, buku catatan, dan lampu; itu membuat jawabannya mudah muncul.",
          "sofa masih terasa seputar rumah, tetapi artinya bergeser. desk pas untuk “perabot untuk bekerja atau belajar”; ingat laptop, buku catatan, dan lampu.",
          "cupboard bukan nama untuk ide ini. Jawabannya desk; dengan laptop, buku catatan, dan lampu, kata itu lebih mudah menempel."
        ],
        "tr": [
          "bed, “çalışmak veya okumak için mobilya” anlamına uymaz. Burada desk gerekir; akıldaki küçük görsel laptop, defter ve lamba.",
          "Doğru. desk, “çalışmak veya okumak için mobilya” için kullanılan kelime. Aklında laptop, defter ve lamba kalsın; cevap daha kolay gelir.",
          "sofa ev konusuna yakın durur, ama anlamı farklıdır. desk “çalışmak veya okumak için mobilya” fikrini verir; laptop, defter ve lamba düşün.",
          "cupboard bu fikrin adı değildir. Cevap desk; laptop, defter ve lamba görüntüsü kelimeyi tutturur."
        ],
        "pl": [
          "bed nie pasuje do znaczenia „mebel do pracy albo nauki”. Tutaj potrzebne jest desk; skojarz z laptop, zeszyt i lampka.",
          "Dobrze. desk to słowo na „mebel do pracy albo nauki”. Zapamiętaj obraz: laptop, zeszyt i lampka; wtedy odpowiedź szybko wraca.",
          "sofa brzmi domowo, ale ma inny sens. desk oddaje „mebel do pracy albo nauki”; pomaga obraz laptop, zeszyt i lampka.",
          "cupboard nie nazywa tej idei. Odpowiedź to desk; z obrazem laptop, zeszyt i lampka łatwiej ją złapać."
        ]
      }
    },
    {
      "id": "home-and-rooms-007",
      "type": "mcq",
      "prompt": "You open it to enter a room.",
      "localizedPrompts": {
        "ru": "Какое английское слово означает «то, что открывают, чтобы войти»?",
        "uk": "Яке англійське слово означає «те, що відчиняють, щоб увійти»?",
        "es": "¿Qué palabra inglesa significa «lo que abres para entrar»?",
        "pt-BR": "Qual palavra em inglês significa “o que você abre para entrar”?",
        "vi": "Từ tiếng Anh nào có nghĩa là “thứ bạn mở để đi vào”?",
        "id": "Kata Inggris mana yang berarti “benda yang dibuka untuk masuk”?",
        "tr": "“içeri girmek için açılan şey” anlamına gelen İngilizce kelime hangisi?",
        "pl": "Które angielskie słowo znaczy „to, co otwierasz, żeby wejść”?"
      },
      "choices": [
        "wall",
        "floor",
        "door",
        "ceiling"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose door for the home vocabulary meaning: You open it to enter a room.",
      "skillTag": "home_room_part",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C7",
        "K7"
      ],
      "choiceRationales": [
        "wall is a plausible same-domain distractor, but it does not express the tested meaning: You open it to enter a room.",
        "floor is a plausible same-domain distractor, but it does not express the tested meaning: You open it to enter a room.",
        "door matches the tested home-and-rooms meaning and is supported by the cited learner vocabulary sources.",
        "ceiling is a plausible same-domain distractor, but it does not express the tested meaning: You open it to enter a room."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "wall не подходит к смыслу «то, что открывают, чтобы войти». Здесь нужен door; якорь простой: ручка и вход.",
          "floor уводит в другую домашнюю деталь. Для «то, что открывают, чтобы войти» выбираем door, слово держится за образ: ручка и вход.",
          "Бинго! door — слово для «то, что открывают, чтобы войти». Держи короткий образ: ручка и вход, и ответ быстро всплывает.",
          "ceiling не та вещь для этого смысла. Ответ door; представь ручка и вход, и слово легче поймать."
        ],
        "uk": [
          "wall не підходить до змісту «те, що відчиняють, щоб увійти». Тут потрібне door; простий якір: ручка і вхід.",
          "floor веде до іншої домашньої деталі. Для «те, що відчиняють, щоб увійти» обираємо door, бо тримаємо в голові ручка і вхід.",
          "Бінго! door — слово для «те, що відчиняють, щоб увійти». Тримай короткий образ: ручка і вхід, і відповідь легко згадується.",
          "ceiling не та річ для цього значення. Відповідь door; уяви ручка і вхід, і слово стає ближчим."
        ],
        "es": [
          "wall no encaja con «lo que abres para entrar». Aquí va door; la pista mental es manilla y entrada.",
          "floor apunta a otra cosa de la casa. Para «lo que abres para entrar», usa door y piensa en manilla y entrada.",
          "Bien. door es la palabra para «lo que abres para entrar». Quédate con la imagen de manilla y entrada; ayuda a recordarla sin drama.",
          "ceiling no nombra esa idea. La respuesta es door; con manilla y entrada la palabra se queda mejor."
        ],
        "pt-BR": [
          "wall não combina com “o que você abre para entrar”. Aqui é door; pense em maçaneta e entrada.",
          "floor aponta para outra coisa da casa. Para “o que você abre para entrar”, use door e imagine maçaneta e entrada.",
          "Correto. door é a palavra para “o que você abre para entrar”. Guarde a imagem de maçaneta e entrada; ela puxa a resposta na hora.",
          "ceiling não nomeia essa ideia. A resposta é door; com maçaneta e entrada, a palavra gruda melhor."
        ],
        "vi": [
          "wall không khớp với “thứ bạn mở để đi vào”. Ở đây cần door; điểm neo là tay nắm và lối vào.",
          "floor chỉ sang thứ khác trong nhà. Với “thứ bạn mở để đi vào”, chọn door và nhớ tay nắm và lối vào.",
          "Đúng. door là từ cho “thứ bạn mở để đi vào”. Hãy giữ hình ảnh tay nắm và lối vào; nó kéo câu trả lời về rất nhanh.",
          "ceiling không gọi đúng ý này. Đáp án là door; hình ảnh tay nắm và lối vào giúp nhớ lâu hơn."
        ],
        "id": [
          "wall tidak cocok dengan “benda yang dibuka untuk masuk”. Di sini perlu door; pegang gambaran gagang dan pintu masuk.",
          "floor menunjuk hal lain di rumah. Untuk “benda yang dibuka untuk masuk”, pilih door dan bayangkan gagang dan pintu masuk.",
          "Benar. door adalah kata untuk “benda yang dibuka untuk masuk”. Simpan gambaran gagang dan pintu masuk; itu membuat jawabannya mudah muncul.",
          "ceiling bukan nama untuk ide ini. Jawabannya door; dengan gagang dan pintu masuk, kata itu lebih mudah menempel."
        ],
        "tr": [
          "wall, “içeri girmek için açılan şey” anlamına uymaz. Burada door gerekir; akıldaki küçük görsel kapı kolu ve giriş.",
          "floor evde başka bir şeyi gösterir. “içeri girmek için açılan şey” için door seçilir; kapı kolu ve giriş bunu netleştirir.",
          "Doğru. door, “içeri girmek için açılan şey” için kullanılan kelime. Aklında kapı kolu ve giriş kalsın; cevap daha kolay gelir.",
          "ceiling bu fikrin adı değildir. Cevap door; kapı kolu ve giriş görüntüsü kelimeyi tutturur."
        ],
        "pl": [
          "wall nie pasuje do znaczenia „to, co otwierasz, żeby wejść”. Tutaj potrzebne jest door; skojarz z klamka i wejście.",
          "floor wskazuje inną rzecz w domu. Dla „to, co otwierasz, żeby wejść” wybierz door i pomyśl o klamka i wejście.",
          "Dobrze. door to słowo na „to, co otwierasz, żeby wejść”. Zapamiętaj obraz: klamka i wejście; wtedy odpowiedź szybko wraca.",
          "ceiling nie nazywa tej idei. Odpowiedź to door; z obrazem klamka i wejście łatwiej ją złapać."
        ]
      }
    },
    {
      "id": "home-and-rooms-008",
      "type": "mcq",
      "prompt": "You look outside through it.",
      "localizedPrompts": {
        "ru": "Какое английское слово означает «то, через что смотрят наружу»?",
        "uk": "Яке англійське слово означає «те, через що дивляться надвір»?",
        "es": "¿Qué palabra inglesa significa «lo que usas para mirar afuera»?",
        "pt-BR": "Qual palavra em inglês significa “por onde você olha para fora”?",
        "vi": "Từ tiếng Anh nào có nghĩa là “thứ bạn nhìn ra ngoài qua đó”?",
        "id": "Kata Inggris mana yang berarti “benda untuk melihat ke luar”?",
        "tr": "“dışarı bakmak için kullanılan şey” anlamına gelen İngilizce kelime hangisi?",
        "pl": "Które angielskie słowo znaczy „to, przez co patrzysz na zewnątrz”?"
      },
      "choices": [
        "door",
        "wall",
        "floor",
        "window"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose window for the home vocabulary meaning: You look outside through it.",
      "skillTag": "home_room_part",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C8",
        "K8"
      ],
      "choiceRationales": [
        "door is a plausible same-domain distractor, but it does not express the tested meaning: You look outside through it.",
        "wall is a plausible same-domain distractor, but it does not express the tested meaning: You look outside through it.",
        "floor is a plausible same-domain distractor, but it does not express the tested meaning: You look outside through it.",
        "window matches the tested home-and-rooms meaning and is supported by the cited learner vocabulary sources."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "door не подходит к смыслу «то, через что смотрят наружу». Здесь нужен window; якорь простой: стекло, свет и улица.",
          "wall уводит в другую домашнюю деталь. Для «то, через что смотрят наружу» выбираем window, слово держится за образ: стекло, свет и улица.",
          "floor звучит по-домашнему, но смысл другой. window закрывает идею «то, через что смотрят наружу»; вспоминай стекло, свет и улица.",
          "Бинго! window — слово для «то, через что смотрят наружу». Держи короткий образ: стекло, свет и улица, и ответ быстро всплывает."
        ],
        "uk": [
          "door не підходить до змісту «те, через що дивляться надвір». Тут потрібне window; простий якір: скло, світло і вулиця.",
          "wall веде до іншої домашньої деталі. Для «те, через що дивляться надвір» обираємо window, бо тримаємо в голові скло, світло і вулиця.",
          "floor теж із домашнього світу, але сенс інший. window закриває ідею «те, через що дивляться надвір»; згадай скло, світло і вулиця.",
          "Бінго! window — слово для «те, через що дивляться надвір». Тримай короткий образ: скло, світло і вулиця, і відповідь легко згадується."
        ],
        "es": [
          "door no encaja con «lo que usas para mirar afuera». Aquí va window; la pista mental es cristal, luz y calle.",
          "wall apunta a otra cosa de la casa. Para «lo que usas para mirar afuera», usa window y piensa en cristal, luz y calle.",
          "floor suena doméstico, pero cambia el sentido. window cubre «lo que usas para mirar afuera»; imagina cristal, luz y calle.",
          "Bien. window es la palabra para «lo que usas para mirar afuera». Quédate con la imagen de cristal, luz y calle; ayuda a recordarla sin drama."
        ],
        "pt-BR": [
          "door não combina com “por onde você olha para fora”. Aqui é window; pense em vidro, luz e rua.",
          "wall aponta para outra coisa da casa. Para “por onde você olha para fora”, use window e imagine vidro, luz e rua.",
          "floor parece do mesmo tema, mas muda o sentido. window cobre “por onde você olha para fora”; lembre de vidro, luz e rua.",
          "Correto. window é a palavra para “por onde você olha para fora”. Guarde a imagem de vidro, luz e rua; ela puxa a resposta na hora."
        ],
        "vi": [
          "door không khớp với “thứ bạn nhìn ra ngoài qua đó”. Ở đây cần window; điểm neo là kính, ánh sáng và đường phố.",
          "wall chỉ sang thứ khác trong nhà. Với “thứ bạn nhìn ra ngoài qua đó”, chọn window và nhớ kính, ánh sáng và đường phố.",
          "floor vẫn là từ về nhà cửa, nhưng nghĩa lệch. window mới đúng cho “thứ bạn nhìn ra ngoài qua đó”; nghĩ tới kính, ánh sáng và đường phố.",
          "Đúng. window là từ cho “thứ bạn nhìn ra ngoài qua đó”. Hãy giữ hình ảnh kính, ánh sáng và đường phố; nó kéo câu trả lời về rất nhanh."
        ],
        "id": [
          "door tidak cocok dengan “benda untuk melihat ke luar”. Di sini perlu window; pegang gambaran kaca, cahaya, dan jalan.",
          "wall menunjuk hal lain di rumah. Untuk “benda untuk melihat ke luar”, pilih window dan bayangkan kaca, cahaya, dan jalan.",
          "floor masih terasa seputar rumah, tetapi artinya bergeser. window pas untuk “benda untuk melihat ke luar”; ingat kaca, cahaya, dan jalan.",
          "Benar. window adalah kata untuk “benda untuk melihat ke luar”. Simpan gambaran kaca, cahaya, dan jalan; itu membuat jawabannya mudah muncul."
        ],
        "tr": [
          "door, “dışarı bakmak için kullanılan şey” anlamına uymaz. Burada window gerekir; akıldaki küçük görsel cam, ışık ve sokak.",
          "wall evde başka bir şeyi gösterir. “dışarı bakmak için kullanılan şey” için window seçilir; cam, ışık ve sokak bunu netleştirir.",
          "floor ev konusuna yakın durur, ama anlamı farklıdır. window “dışarı bakmak için kullanılan şey” fikrini verir; cam, ışık ve sokak düşün.",
          "Doğru. window, “dışarı bakmak için kullanılan şey” için kullanılan kelime. Aklında cam, ışık ve sokak kalsın; cevap daha kolay gelir."
        ],
        "pl": [
          "door nie pasuje do znaczenia „to, przez co patrzysz na zewnątrz”. Tutaj potrzebne jest window; skojarz z szyba, światło i ulica.",
          "wall wskazuje inną rzecz w domu. Dla „to, przez co patrzysz na zewnątrz” wybierz window i pomyśl o szyba, światło i ulica.",
          "floor brzmi domowo, ale ma inny sens. window oddaje „to, przez co patrzysz na zewnątrz”; pomaga obraz szyba, światło i ulica.",
          "Dobrze. window to słowo na „to, przez co patrzysz na zewnątrz”. Zapamiętaj obraz: szyba, światło i ulica; wtedy odpowiedź szybko wraca."
        ]
      }
    },
    {
      "id": "home-and-rooms-009",
      "type": "mcq",
      "prompt": "You walk on it in a room.",
      "localizedPrompts": {
        "ru": "Какое английское слово означает «часть комнаты, по которой ходят»?",
        "uk": "Яке англійське слово означає «частина кімнати, по якій ходять»?",
        "es": "¿Qué palabra inglesa significa «parte de la habitación por donde caminas»?",
        "pt-BR": "Qual palavra em inglês significa “parte do cômodo onde você anda”?",
        "vi": "Từ tiếng Anh nào có nghĩa là “phần của phòng mà bạn đi trên đó”?",
        "id": "Kata Inggris mana yang berarti “bagian ruangan yang dipijak”?",
        "tr": "“odada üzerinde yürüdüğün bölüm” anlamına gelen İngilizce kelime hangisi?",
        "pl": "Które angielskie słowo znaczy „część pokoju, po której chodzisz”?"
      },
      "choices": [
        "floor",
        "ceiling",
        "wall",
        "door"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose floor for the home vocabulary meaning: You walk on it in a room.",
      "skillTag": "home_room_part",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C9",
        "K9"
      ],
      "choiceRationales": [
        "floor matches the tested home-and-rooms meaning and is supported by the cited learner vocabulary sources.",
        "ceiling is a plausible same-domain distractor, but it does not express the tested meaning: You walk on it in a room.",
        "wall is a plausible same-domain distractor, but it does not express the tested meaning: You walk on it in a room.",
        "door is a plausible same-domain distractor, but it does not express the tested meaning: You walk on it in a room."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! floor — слово для «часть комнаты, по которой ходят». Держи короткий образ: шаги под ногами, и ответ быстро всплывает.",
          "ceiling уводит в другую домашнюю деталь. Для «часть комнаты, по которой ходят» выбираем floor, слово держится за образ: шаги под ногами.",
          "wall звучит по-домашнему, но смысл другой. floor закрывает идею «часть комнаты, по которой ходят»; вспоминай шаги под ногами.",
          "door не та вещь для этого смысла. Ответ floor; представь шаги под ногами, и слово легче поймать."
        ],
        "uk": [
          "Бінго! floor — слово для «частина кімнати, по якій ходять». Тримай короткий образ: кроки під ногами, і відповідь легко згадується.",
          "ceiling веде до іншої домашньої деталі. Для «частина кімнати, по якій ходять» обираємо floor, бо тримаємо в голові кроки під ногами.",
          "wall теж із домашнього світу, але сенс інший. floor закриває ідею «частина кімнати, по якій ходять»; згадай кроки під ногами.",
          "door не та річ для цього значення. Відповідь floor; уяви кроки під ногами, і слово стає ближчим."
        ],
        "es": [
          "Bien. floor es la palabra para «parte de la habitación por donde caminas». Quédate con la imagen de pasos bajo los pies; ayuda a recordarla sin drama.",
          "ceiling apunta a otra cosa de la casa. Para «parte de la habitación por donde caminas», usa floor y piensa en pasos bajo los pies.",
          "wall suena doméstico, pero cambia el sentido. floor cubre «parte de la habitación por donde caminas»; imagina pasos bajo los pies.",
          "door no nombra esa idea. La respuesta es floor; con pasos bajo los pies la palabra se queda mejor."
        ],
        "pt-BR": [
          "Correto. floor é a palavra para “parte do cômodo onde você anda”. Guarde a imagem de passos debaixo dos pés; ela puxa a resposta na hora.",
          "ceiling aponta para outra coisa da casa. Para “parte do cômodo onde você anda”, use floor e imagine passos debaixo dos pés.",
          "wall parece do mesmo tema, mas muda o sentido. floor cobre “parte do cômodo onde você anda”; lembre de passos debaixo dos pés.",
          "door não nomeia essa ideia. A resposta é floor; com passos debaixo dos pés, a palavra gruda melhor."
        ],
        "vi": [
          "Đúng. floor là từ cho “phần của phòng mà bạn đi trên đó”. Hãy giữ hình ảnh bước chân dưới chân; nó kéo câu trả lời về rất nhanh.",
          "ceiling chỉ sang thứ khác trong nhà. Với “phần của phòng mà bạn đi trên đó”, chọn floor và nhớ bước chân dưới chân.",
          "wall vẫn là từ về nhà cửa, nhưng nghĩa lệch. floor mới đúng cho “phần của phòng mà bạn đi trên đó”; nghĩ tới bước chân dưới chân.",
          "door không gọi đúng ý này. Đáp án là floor; hình ảnh bước chân dưới chân giúp nhớ lâu hơn."
        ],
        "id": [
          "Benar. floor adalah kata untuk “bagian ruangan yang dipijak”. Simpan gambaran langkah di bawah kaki; itu membuat jawabannya mudah muncul.",
          "ceiling menunjuk hal lain di rumah. Untuk “bagian ruangan yang dipijak”, pilih floor dan bayangkan langkah di bawah kaki.",
          "wall masih terasa seputar rumah, tetapi artinya bergeser. floor pas untuk “bagian ruangan yang dipijak”; ingat langkah di bawah kaki.",
          "door bukan nama untuk ide ini. Jawabannya floor; dengan langkah di bawah kaki, kata itu lebih mudah menempel."
        ],
        "tr": [
          "Doğru. floor, “odada üzerinde yürüdüğün bölüm” için kullanılan kelime. Aklında ayakların altındaki adımlar kalsın; cevap daha kolay gelir.",
          "ceiling evde başka bir şeyi gösterir. “odada üzerinde yürüdüğün bölüm” için floor seçilir; ayakların altındaki adımlar bunu netleştirir.",
          "wall ev konusuna yakın durur, ama anlamı farklıdır. floor “odada üzerinde yürüdüğün bölüm” fikrini verir; ayakların altındaki adımlar düşün.",
          "door bu fikrin adı değildir. Cevap floor; ayakların altındaki adımlar görüntüsü kelimeyi tutturur."
        ],
        "pl": [
          "Dobrze. floor to słowo na „część pokoju, po której chodzisz”. Zapamiętaj obraz: kroki pod stopami; wtedy odpowiedź szybko wraca.",
          "ceiling wskazuje inną rzecz w domu. Dla „część pokoju, po której chodzisz” wybierz floor i pomyśl o kroki pod stopami.",
          "wall brzmi domowo, ale ma inny sens. floor oddaje „część pokoju, po której chodzisz”; pomaga obraz kroki pod stopami.",
          "door nie nazywa tej idei. Odpowiedź to floor; z obrazem kroki pod stopami łatwiej ją złapać."
        ]
      }
    },
    {
      "id": "home-and-rooms-010",
      "type": "mcq",
      "prompt": "The side of a room.",
      "localizedPrompts": {
        "ru": "Какое английское слово означает «боковая часть комнаты»?",
        "uk": "Яке англійське слово означає «бічна частина кімнати»?",
        "es": "¿Qué palabra inglesa significa «lado de una habitación»?",
        "pt-BR": "Qual palavra em inglês significa “lado de um cômodo”?",
        "vi": "Từ tiếng Anh nào có nghĩa là “mặt bên của căn phòng”?",
        "id": "Kata Inggris mana yang berarti “sisi sebuah ruangan”?",
        "tr": "“odanın yan kısmı” anlamına gelen İngilizce kelime hangisi?",
        "pl": "Które angielskie słowo znaczy „bok pokoju”?"
      },
      "choices": [
        "floor",
        "wall",
        "ceiling",
        "window"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose wall for the home vocabulary meaning: The side of a room.",
      "skillTag": "home_room_part",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C10",
        "K10"
      ],
      "choiceRationales": [
        "floor is a plausible same-domain distractor, but it does not express the tested meaning: The side of a room.",
        "wall matches the tested home-and-rooms meaning and is supported by the cited learner vocabulary sources.",
        "ceiling is a plausible same-domain distractor, but it does not express the tested meaning: The side of a room.",
        "window is a plausible same-domain distractor, but it does not express the tested meaning: The side of a room."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "floor не подходит к смыслу «боковая часть комнаты». Здесь нужен wall; якорь простой: картина сбоку комнаты.",
          "Бинго! wall — слово для «боковая часть комнаты». Держи короткий образ: картина сбоку комнаты, и ответ быстро всплывает.",
          "ceiling звучит по-домашнему, но смысл другой. wall закрывает идею «боковая часть комнаты»; вспоминай картина сбоку комнаты.",
          "window не та вещь для этого смысла. Ответ wall; представь картина сбоку комнаты, и слово легче поймать."
        ],
        "uk": [
          "floor не підходить до змісту «бічна частина кімнати». Тут потрібне wall; простий якір: картина збоку кімнати.",
          "Бінго! wall — слово для «бічна частина кімнати». Тримай короткий образ: картина збоку кімнати, і відповідь легко згадується.",
          "ceiling теж із домашнього світу, але сенс інший. wall закриває ідею «бічна частина кімнати»; згадай картина збоку кімнати.",
          "window не та річ для цього значення. Відповідь wall; уяви картина збоку кімнати, і слово стає ближчим."
        ],
        "es": [
          "floor no encaja con «lado de una habitación». Aquí va wall; la pista mental es un cuadro al lado de la sala.",
          "Bien. wall es la palabra para «lado de una habitación». Quédate con la imagen de un cuadro al lado de la sala; ayuda a recordarla sin drama.",
          "ceiling suena doméstico, pero cambia el sentido. wall cubre «lado de una habitación»; imagina un cuadro al lado de la sala.",
          "window no nombra esa idea. La respuesta es wall; con un cuadro al lado de la sala la palabra se queda mejor."
        ],
        "pt-BR": [
          "floor não combina com “lado de um cômodo”. Aqui é wall; pense em um quadro no lado do cômodo.",
          "Correto. wall é a palavra para “lado de um cômodo”. Guarde a imagem de um quadro no lado do cômodo; ela puxa a resposta na hora.",
          "ceiling parece do mesmo tema, mas muda o sentido. wall cobre “lado de um cômodo”; lembre de um quadro no lado do cômodo.",
          "window não nomeia essa ideia. A resposta é wall; com um quadro no lado do cômodo, a palavra gruda melhor."
        ],
        "vi": [
          "floor không khớp với “mặt bên của căn phòng”. Ở đây cần wall; điểm neo là bức tranh bên cạnh phòng.",
          "Đúng. wall là từ cho “mặt bên của căn phòng”. Hãy giữ hình ảnh bức tranh bên cạnh phòng; nó kéo câu trả lời về rất nhanh.",
          "ceiling vẫn là từ về nhà cửa, nhưng nghĩa lệch. wall mới đúng cho “mặt bên của căn phòng”; nghĩ tới bức tranh bên cạnh phòng.",
          "window không gọi đúng ý này. Đáp án là wall; hình ảnh bức tranh bên cạnh phòng giúp nhớ lâu hơn."
        ],
        "id": [
          "floor tidak cocok dengan “sisi sebuah ruangan”. Di sini perlu wall; pegang gambaran gambar di sisi ruangan.",
          "Benar. wall adalah kata untuk “sisi sebuah ruangan”. Simpan gambaran gambar di sisi ruangan; itu membuat jawabannya mudah muncul.",
          "ceiling masih terasa seputar rumah, tetapi artinya bergeser. wall pas untuk “sisi sebuah ruangan”; ingat gambar di sisi ruangan.",
          "window bukan nama untuk ide ini. Jawabannya wall; dengan gambar di sisi ruangan, kata itu lebih mudah menempel."
        ],
        "tr": [
          "floor, “odanın yan kısmı” anlamına uymaz. Burada wall gerekir; akıldaki küçük görsel odanın yanındaki tablo.",
          "Doğru. wall, “odanın yan kısmı” için kullanılan kelime. Aklında odanın yanındaki tablo kalsın; cevap daha kolay gelir.",
          "ceiling ev konusuna yakın durur, ama anlamı farklıdır. wall “odanın yan kısmı” fikrini verir; odanın yanındaki tablo düşün.",
          "window bu fikrin adı değildir. Cevap wall; odanın yanındaki tablo görüntüsü kelimeyi tutturur."
        ],
        "pl": [
          "floor nie pasuje do znaczenia „bok pokoju”. Tutaj potrzebne jest wall; skojarz z obraz na boku pokoju.",
          "Dobrze. wall to słowo na „bok pokoju”. Zapamiętaj obraz: obraz na boku pokoju; wtedy odpowiedź szybko wraca.",
          "ceiling brzmi domowo, ale ma inny sens. wall oddaje „bok pokoju”; pomaga obraz obraz na boku pokoju.",
          "window nie nazywa tej idei. Odpowiedź to wall; z obrazem obraz na boku pokoju łatwiej ją złapać."
        ]
      }
    },
    {
      "id": "home-and-rooms-011",
      "type": "mcq",
      "prompt": "Make a room not dirty.",
      "localizedPrompts": {
        "ru": "Какой английский глагол означает «убирать, делать чистым»?",
        "uk": "Яке англійське дієслово означає «прибирати, робити чистим»?",
        "es": "¿Qué verbo inglés significa «limpiar, dejar algo limpio»?",
        "pt-BR": "Qual verbo em inglês significa “limpar, deixar algo limpo”?",
        "vi": "Động từ tiếng Anh nào có nghĩa là “làm sạch”?",
        "id": "Kata kerja Inggris mana yang berarti “membersihkan”?",
        "tr": "“temizlemek” anlamına gelen İngilizce fiil hangisi?",
        "pl": "Który angielski czasownik znaczy „sprzątać, robić coś czystym”?"
      },
      "choices": [
        "sleep",
        "sit",
        "clean",
        "open"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose clean for the home vocabulary meaning: Make a room not dirty.",
      "skillTag": "home_action",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C11",
        "K11"
      ],
      "choiceRationales": [
        "sleep is a plausible same-domain distractor, but it does not express the tested meaning: Make a room not dirty.",
        "sit is a plausible same-domain distractor, but it does not express the tested meaning: Make a room not dirty.",
        "clean matches the tested home-and-rooms meaning and is supported by the cited learner vocabulary sources.",
        "open is a plausible same-domain distractor, but it does not express the tested meaning: Make a room not dirty."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "sleep не подходит к смыслу «убирать, делать чистым». Здесь нужен clean; якорь простой: тряпка, порядок и чистый пол.",
          "sit уводит в другую домашнюю деталь. Для «убирать, делать чистым» выбираем clean, слово держится за образ: тряпка, порядок и чистый пол.",
          "Бинго! clean — слово для «убирать, делать чистым». Держи короткий образ: тряпка, порядок и чистый пол, и ответ быстро всплывает.",
          "open не та вещь для этого смысла. Ответ clean; представь тряпка, порядок и чистый пол, и слово легче поймать."
        ],
        "uk": [
          "sleep не підходить до змісту «прибирати, робити чистим». Тут потрібне clean; простий якір: ганчірка, порядок і чиста підлога.",
          "sit веде до іншої домашньої деталі. Для «прибирати, робити чистим» обираємо clean, бо тримаємо в голові ганчірка, порядок і чиста підлога.",
          "Бінго! clean — слово для «прибирати, робити чистим». Тримай короткий образ: ганчірка, порядок і чиста підлога, і відповідь легко згадується.",
          "open не та річ для цього значення. Відповідь clean; уяви ганчірка, порядок і чиста підлога, і слово стає ближчим."
        ],
        "es": [
          "sleep no encaja con «limpiar, dejar algo limpio». Aquí va clean; la pista mental es paño, orden y suelo limpio.",
          "sit apunta a otra cosa de la casa. Para «limpiar, dejar algo limpio», usa clean y piensa en paño, orden y suelo limpio.",
          "Bien. clean es la palabra para «limpiar, dejar algo limpio». Quédate con la imagen de paño, orden y suelo limpio; ayuda a recordarla sin drama.",
          "open no nombra esa idea. La respuesta es clean; con paño, orden y suelo limpio la palabra se queda mejor."
        ],
        "pt-BR": [
          "sleep não combina com “limpar, deixar algo limpo”. Aqui é clean; pense em pano, ordem e chão limpo.",
          "sit aponta para outra coisa da casa. Para “limpar, deixar algo limpo”, use clean e imagine pano, ordem e chão limpo.",
          "Correto. clean é a palavra para “limpar, deixar algo limpo”. Guarde a imagem de pano, ordem e chão limpo; ela puxa a resposta na hora.",
          "open não nomeia essa ideia. A resposta é clean; com pano, ordem e chão limpo, a palavra gruda melhor."
        ],
        "vi": [
          "sleep không khớp với “làm sạch”. Ở đây cần clean; điểm neo là khăn lau, gọn gàng và sàn sạch.",
          "sit chỉ sang thứ khác trong nhà. Với “làm sạch”, chọn clean và nhớ khăn lau, gọn gàng và sàn sạch.",
          "Đúng. clean là từ cho “làm sạch”. Hãy giữ hình ảnh khăn lau, gọn gàng và sàn sạch; nó kéo câu trả lời về rất nhanh.",
          "open không gọi đúng ý này. Đáp án là clean; hình ảnh khăn lau, gọn gàng và sàn sạch giúp nhớ lâu hơn."
        ],
        "id": [
          "sleep tidak cocok dengan “membersihkan”. Di sini perlu clean; pegang gambaran lap, rapi, dan lantai bersih.",
          "sit menunjuk hal lain di rumah. Untuk “membersihkan”, pilih clean dan bayangkan lap, rapi, dan lantai bersih.",
          "Benar. clean adalah kata untuk “membersihkan”. Simpan gambaran lap, rapi, dan lantai bersih; itu membuat jawabannya mudah muncul.",
          "open bukan nama untuk ide ini. Jawabannya clean; dengan lap, rapi, dan lantai bersih, kata itu lebih mudah menempel."
        ],
        "tr": [
          "sleep, “temizlemek” anlamına uymaz. Burada clean gerekir; akıldaki küçük görsel bez, düzen ve temiz zemin.",
          "sit evde başka bir şeyi gösterir. “temizlemek” için clean seçilir; bez, düzen ve temiz zemin bunu netleştirir.",
          "Doğru. clean, “temizlemek” için kullanılan kelime. Aklında bez, düzen ve temiz zemin kalsın; cevap daha kolay gelir.",
          "open bu fikrin adı değildir. Cevap clean; bez, düzen ve temiz zemin görüntüsü kelimeyi tutturur."
        ],
        "pl": [
          "sleep nie pasuje do znaczenia „sprzątać, robić coś czystym”. Tutaj potrzebne jest clean; skojarz z ściereczka, porządek i czysta podłoga.",
          "sit wskazuje inną rzecz w domu. Dla „sprzątać, robić coś czystym” wybierz clean i pomyśl o ściereczka, porządek i czysta podłoga.",
          "Dobrze. clean to słowo na „sprzątać, robić coś czystym”. Zapamiętaj obraz: ściereczka, porządek i czysta podłoga; wtedy odpowiedź szybko wraca.",
          "open nie nazywa tej idei. Odpowiedź to clean; z obrazem ściereczka, porządek i czysta podłoga łatwiej ją złapać."
        ]
      }
    },
    {
      "id": "home-and-rooms-012",
      "type": "mcq",
      "prompt": "What you do on a chair.",
      "localizedPrompts": {
        "ru": "Какой английский глагол означает «сидеть на стуле»?",
        "uk": "Яке англійське дієслово означає «сидіти на стільці»?",
        "es": "¿Qué verbo inglés significa «sentarse en una silla»?",
        "pt-BR": "Qual verbo em inglês significa “sentar em uma cadeira”?",
        "vi": "Động từ tiếng Anh nào có nghĩa là “ngồi trên ghế”?",
        "id": "Kata kerja Inggris mana yang berarti “duduk di kursi”?",
        "tr": "“sandalyeye oturmak” anlamına gelen İngilizce fiil hangisi?",
        "pl": "Który angielski czasownik znaczy „siedzieć na krześle”?"
      },
      "choices": [
        "sleep",
        "clean",
        "open",
        "sit"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose sit for the home vocabulary meaning: What you do on a chair.",
      "skillTag": "home_action",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C12",
        "K12"
      ],
      "choiceRationales": [
        "sleep is a plausible same-domain distractor, but it does not express the tested meaning: What you do on a chair.",
        "clean is a plausible same-domain distractor, but it does not express the tested meaning: What you do on a chair.",
        "open is a plausible same-domain distractor, but it does not express the tested meaning: What you do on a chair.",
        "sit matches the tested home-and-rooms meaning and is supported by the cited learner vocabulary sources."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "sleep не подходит к смыслу «сидеть на стуле». Здесь нужен sit; якорь простой: стул под тобой.",
          "clean уводит в другую домашнюю деталь. Для «сидеть на стуле» выбираем sit, слово держится за образ: стул под тобой.",
          "open звучит по-домашнему, но смысл другой. sit закрывает идею «сидеть на стуле»; вспоминай стул под тобой.",
          "Бинго! sit — слово для «сидеть на стуле». Держи короткий образ: стул под тобой, и ответ быстро всплывает."
        ],
        "uk": [
          "sleep не підходить до змісту «сидіти на стільці». Тут потрібне sit; простий якір: стілець під тобою.",
          "clean веде до іншої домашньої деталі. Для «сидіти на стільці» обираємо sit, бо тримаємо в голові стілець під тобою.",
          "open теж із домашнього світу, але сенс інший. sit закриває ідею «сидіти на стільці»; згадай стілець під тобою.",
          "Бінго! sit — слово для «сидіти на стільці». Тримай короткий образ: стілець під тобою, і відповідь легко згадується."
        ],
        "es": [
          "sleep no encaja con «sentarse en una silla». Aquí va sit; la pista mental es la silla debajo de ti.",
          "clean apunta a otra cosa de la casa. Para «sentarse en una silla», usa sit y piensa en la silla debajo de ti.",
          "open suena doméstico, pero cambia el sentido. sit cubre «sentarse en una silla»; imagina la silla debajo de ti.",
          "Bien. sit es la palabra para «sentarse en una silla». Quédate con la imagen de la silla debajo de ti; ayuda a recordarla sin drama."
        ],
        "pt-BR": [
          "sleep não combina com “sentar em uma cadeira”. Aqui é sit; pense em a cadeira embaixo de você.",
          "clean aponta para outra coisa da casa. Para “sentar em uma cadeira”, use sit e imagine a cadeira embaixo de você.",
          "open parece do mesmo tema, mas muda o sentido. sit cobre “sentar em uma cadeira”; lembre de a cadeira embaixo de você.",
          "Correto. sit é a palavra para “sentar em uma cadeira”. Guarde a imagem de a cadeira embaixo de você; ela puxa a resposta na hora."
        ],
        "vi": [
          "sleep không khớp với “ngồi trên ghế”. Ở đây cần sit; điểm neo là chiếc ghế dưới bạn.",
          "clean chỉ sang thứ khác trong nhà. Với “ngồi trên ghế”, chọn sit và nhớ chiếc ghế dưới bạn.",
          "open vẫn là từ về nhà cửa, nhưng nghĩa lệch. sit mới đúng cho “ngồi trên ghế”; nghĩ tới chiếc ghế dưới bạn.",
          "Đúng. sit là từ cho “ngồi trên ghế”. Hãy giữ hình ảnh chiếc ghế dưới bạn; nó kéo câu trả lời về rất nhanh."
        ],
        "id": [
          "sleep tidak cocok dengan “duduk di kursi”. Di sini perlu sit; pegang gambaran kursi di bawahmu.",
          "clean menunjuk hal lain di rumah. Untuk “duduk di kursi”, pilih sit dan bayangkan kursi di bawahmu.",
          "open masih terasa seputar rumah, tetapi artinya bergeser. sit pas untuk “duduk di kursi”; ingat kursi di bawahmu.",
          "Benar. sit adalah kata untuk “duduk di kursi”. Simpan gambaran kursi di bawahmu; itu membuat jawabannya mudah muncul."
        ],
        "tr": [
          "sleep, “sandalyeye oturmak” anlamına uymaz. Burada sit gerekir; akıldaki küçük görsel altındaki sandalye.",
          "clean evde başka bir şeyi gösterir. “sandalyeye oturmak” için sit seçilir; altındaki sandalye bunu netleştirir.",
          "open ev konusuna yakın durur, ama anlamı farklıdır. sit “sandalyeye oturmak” fikrini verir; altındaki sandalye düşün.",
          "Doğru. sit, “sandalyeye oturmak” için kullanılan kelime. Aklında altındaki sandalye kalsın; cevap daha kolay gelir."
        ],
        "pl": [
          "sleep nie pasuje do znaczenia „siedzieć na krześle”. Tutaj potrzebne jest sit; skojarz z krzesło pod tobą.",
          "clean wskazuje inną rzecz w domu. Dla „siedzieć na krześle” wybierz sit i pomyśl o krzesło pod tobą.",
          "open brzmi domowo, ale ma inny sens. sit oddaje „siedzieć na krześle”; pomaga obraz krzesło pod tobą.",
          "Dobrze. sit to słowo na „siedzieć na krześle”. Zapamiętaj obraz: krzesło pod tobą; wtedy odpowiedź szybko wraca."
        ]
      }
    }
  ],
  "styleProfile": {
    "basedOnExistingPools": true,
    "sampledFiles": [
      "app/quiz_data.ts",
      "app/quiz_source_locale_payloads.ts"
    ],
    "promptPattern": "Use short learner-facing clues such as A room where you sleep or Furniture for sitting, plus localized prompts that ask for the exact English word or verb. Avoid taxonomy labels and generic Which word fits shells.",
    "explanationPattern": "Each explanation names the selected English choice or the correct contrast, then gives one concrete home image so feedback stays useful and readable.",
    "readerRewardPattern": "Every explanation gives a small memory anchor from the visible home scene, such as bed and sleep, door handle and entrance, or clean floor, without forced trick labels.",
    "distractorPattern": "Distractors are same-domain rooms, furniture, room parts, or simple home actions, so they feel plausible while leaving exactly one source-backed answer."
  }
};
