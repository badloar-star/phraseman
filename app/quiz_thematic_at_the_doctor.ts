import type { SkylerThematicPack } from './quiz_thematic_packs';

export const AT_THE_DOCTOR_SKYLER_PACK: SkylerThematicPack = {
  "schemaVersion": "skyler-quiz-pack-v1",
  "target": "en",
  "categoryId": "at-the-doctor",
  "categoryTitle": "At the Doctor",
  "releasePolicy": {
    "environment": "dev-only",
    "productionActivation": "blocked_until_explicit_user_approval",
    "notes": "Keep this Skyler quiz pack out of production until the user explicitly approves production activation."
  },
  "researchPolicy": {
    "directTranslationUsed": false,
    "notes": "Starter pack uses expert-edited dictionary entries and British Council health-vocabulary context. Locale copy is adapted from source notes and current quiz-pool style, with no diagnosis, treatment advice, or direct medical guidance."
  },
  "styleProfile": {
    "basedOnExistingPools": true,
    "sampledFiles": [
      "app/quiz_data.ts",
      "app/quiz_source_locale_payloads.ts"
    ],
    "promptPattern": "Use short learner-facing scenes or direct everyday questions, not generic shells. Prompts stay concrete: pain, appointment, prescription, symptoms.",
    "explanationPattern": "Each explanation reacts to the tapped English option with a useful contrast, a small human image, and no dry dictionary-only feedback.",
    "readerRewardPattern": "Each explanation gives a memory cue or practical usage boundary tied to the selected option; no forced trick labels, no unsupported medical advice.",
    "distractorPattern": "Distractors are plausible health-context slips: wrong body part, wrong collocation, similar-looking word, or related medical noun in the wrong role."
  },
  "visualAssets": {
    "status": "queued",
    "styleBasis": "Visual kickoff follows existing Phraseman home_menu and achievement assets: premium mobile-game object illustration, centered readable subject, bevels, rim light, theme-specific material palette, no bitmap text.",
    "assets": [
      {
        "family": "forest",
        "plaquePrompt": "DALL-E prompt: At the Doctor topic plaque for Phraseman forest visual family, calm clinic-learning objects, clipboard, stethoscope, appointment card, premium mobile game illustration, deep forest teal and navy material, beveled frame, centered composition, room for app text overlay, no text, no letters, no numbers, no blood, no diagnosis claim.",
        "iconPrompt": "DALL-E prompt: At the Doctor compact topic icon for Phraseman forest visual family, stethoscope around a small appointment clipboard, polished mobile game icon, deep teal forest palette, beveled rim, transparent-friendly isolated object, no text, no letters, no numbers, no unsafe medical imagery."
      },
      {
        "family": "dark",
        "plaquePrompt": "DALL-E prompt: At the Doctor topic plaque for Phraseman dark visual family, calm clinic-learning objects, stethoscope, appointment card, small clipboard, premium mobile game illustration, graphite black and cool blue rim light, beveled frame, centered composition, room for app text overlay, no text, no letters, no numbers, no blood, no diagnosis claim.",
        "iconPrompt": "DALL-E prompt: At the Doctor compact topic icon for Phraseman dark visual family, silver stethoscope around a small dark clipboard, polished mobile game icon, graphite black palette with cool blue edge light, isolated readable object, no text, no letters, no numbers, no unsafe medical imagery."
      },
      {
        "family": "neon",
        "plaquePrompt": "DALL-E prompt: At the Doctor topic plaque for Phraseman neon visual family, friendly health-learning objects, stethoscope, prescription paper, calendar check, black background with lime neon edge light, premium glossy mobile game plaque, space for app text overlay, no text, no letters, no numbers, no blood or treatment claim.",
        "iconPrompt": "DALL-E prompt: At the Doctor compact topic icon for Phraseman neon visual family, glowing lime stethoscope and small medical clipboard, glossy bevels, black and neon green palette, readable at 64 px, isolated object, no text, no letters, no numbers."
      },
      {
        "family": "neonGreen",
        "plaquePrompt": "DALL-E prompt: At the Doctor topic plaque for Phraseman neonGreen visual family, friendly health-learning objects, stethoscope, prescription paper, calendar check, deep black surface with vivid green neon glow, premium glossy mobile game plaque, room for app text overlay, no text, no letters, no numbers, no blood or treatment claim.",
        "iconPrompt": "DALL-E prompt: At the Doctor compact topic icon for Phraseman neonGreen visual family, vivid green stethoscope and small clinic clipboard, glossy bevels, black enamel base, readable at 64 px, isolated object, no text, no letters, no numbers."
      },
      {
        "family": "gold",
        "plaquePrompt": "DALL-E prompt: At the Doctor topic plaque for Phraseman gold visual family, black-gold premium clinic-learning scene, stethoscope, appointment card, gentle cross symbol as abstract shape, metallic gold bevels, piano-black surface, room for app text overlay, no text, no letters, no numbers, no medical advice imagery.",
        "iconPrompt": "DALL-E prompt: At the Doctor compact topic icon for Phraseman gold visual family, black enamel medical clipboard with gold stethoscope and small check mark, luxury mobile game asset, beveled gold rim, transparent-friendly centered glyph, no text, no letters, no numbers."
      },
      {
        "family": "coral",
        "plaquePrompt": "DALL-E prompt: At the Doctor topic plaque for Phraseman coral visual family, warm coral and navy learning-health objects, soft stethoscope, bandage, appointment card, glossy rounded mobile game plaque, coral rim light, room for app-rendered text, no text, no letters, no numbers, no graphic injury.",
        "iconPrompt": "DALL-E prompt: At the Doctor compact topic icon for Phraseman coral visual family, coral stethoscope and small bandage over navy enamel base, polished bevels, centered readable mobile icon, no text, no letters, no numbers, no blood."
      },
      {
        "family": "minimalLight",
        "plaquePrompt": "DALL-E prompt: At the Doctor topic plaque for Phraseman minimal-light visual family, cream sketch-like premium plaque, graphite pencil clinic objects, appointment card, stethoscope, warm beige surface, clean understated bevels, room for app text overlay, no text, no letters, no numbers.",
        "iconPrompt": "DALL-E prompt: At the Doctor compact topic icon for Phraseman minimal-light visual family, graphite and cream stethoscope with small appointment clipboard, refined sketch-polished mobile icon, soft shadows, centered glyph, no text, no letters, no numbers."
      },
      {
        "family": "minimalDark",
        "plaquePrompt": "DALL-E prompt: At the Doctor topic plaque for Phraseman minimal-dark visual family, graphite dark clinic-learning plaque, silver stethoscope, slate clipboard, subtle blue rim light, premium but restrained mobile game finish, room for app text overlay, no text, no letters, no numbers.",
        "iconPrompt": "DALL-E prompt: At the Doctor compact topic icon for Phraseman minimal-dark visual family, silver stethoscope and dark graphite clipboard, cool blue edge highlight, readable centered glyph, transparent-friendly, no text, no letters, no numbers."
      }
    ]
  },
  "socialListening": {
    "status": "validated",
    "signals": [
      {
        "source": "British Council LearnEnglish Health discussion",
        "text": "Learner comments describe doctor visits with sore throat, stomach pain, allergies, symptoms, medication, injections, and appointments, showing practical demand for health-visit English.",
        "url": "https://learnenglish.britishcouncil.org/free-resources/vocabulary/b1-b2/health"
      },
      {
        "source": "British Council LearnEnglish Teens Health discussion",
        "text": "Learners discuss hospital visits, injections, broken bones, chemist/pharmacist vocabulary, and sick-preposition confusion, showing repeated everyday health vocabulary pain.",
        "url": "https://learnenglishteens.britishcouncil.org/vocabulary/a1-a2-vocabulary/health"
      }
    ]
  },
  "officialSources": [
    {
      "id": "S1",
      "title": "Cambridge Dictionary health and doctor vocabulary entries",
      "url": "https://dictionary.cambridge.org/us/dictionary/english/sore-throat",
      "tier": "B",
      "publisherType": "expert_edited_reference",
      "usedFor": "Dictionary definitions and learner examples for sore throat, appointment, prescription, and symptom wording.",
      "limitations": "Dictionary source only; it verifies word meaning and usage, not medical advice or full lesson sequencing.",
      "checkedAt": "2026-05-22"
    },
    {
      "id": "S2",
      "title": "British Council LearnEnglish Health vocabulary lesson",
      "url": "https://learnenglish.britishcouncil.org/free-resources/vocabulary/b1-b2/health",
      "tier": "B",
      "publisherType": "educational_publisher",
      "usedFor": "Learner-facing health vocabulary context and public discussion signals about doctor visits and symptoms.",
      "limitations": "Educational language source only; not used for diagnosis, treatment advice, or medical recommendations.",
      "checkedAt": "2026-05-22"
    }
  ],
  "claims": [
    {
      "id": "C1",
      "type": "usage_rule",
      "text": "I have a sore throat is a natural short way to describe throat pain in a doctor-visit context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Cambridge supports the sore throat wording and British Council health context shows learners using symptom phrases for doctor visits."
    },
    {
      "id": "C2",
      "type": "answer_key",
      "text": "Choice 0 is the only correct answer for the sore-throat item because it names the throat symptom naturally.",
      "itemId": "at-doctor-sore-throat-001",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both sources support sore throat as the relevant health phrase; the other choices change body part, grammar, or meaning."
    },
    {
      "id": "C3",
      "type": "usage_rule",
      "text": "Make an appointment is the standard collocation for arranging a time to see a doctor or similar professional.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Cambridge gives make an appointment examples and British Council learner context discusses scheduling a doctor appointment."
    },
    {
      "id": "C4",
      "type": "answer_key",
      "text": "Choice 0 is the only correct answer for the appointment item because make an appointment is the natural collocation.",
      "itemId": "at-doctor-appointment-002",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The dictionary collocation and learner health context align on appointment language; the distractors do not form the target phrase."
    },
    {
      "id": "C5",
      "type": "usage_rule",
      "text": "A prescription is the document or instruction for medicine from a doctor, not the front desk or a cooking instruction.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Cambridge supports prescription as medicine-related wording and British Council health context includes medicine and treatment vocabulary."
    },
    {
      "id": "C6",
      "type": "answer_key",
      "text": "Choice 0 is the only correct answer for the prescription item because it names the medicine document.",
      "itemId": "at-doctor-prescription-003",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both sources support medicine vocabulary in doctor contexts; reception, symptom, and recipe point to different meanings."
    },
    {
      "id": "C7",
      "type": "usage_rule",
      "text": "Symptoms is the umbrella word for signs or feelings of illness such as cough, fever, or pain.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Cambridge supports symptom as illness-related wording and British Council uses health vocabulary for discussing what is wrong."
    },
    {
      "id": "C8",
      "type": "answer_key",
      "text": "Choice 0 is the only correct answer for the symptoms item because cough, fever, and pain are examples of symptoms.",
      "itemId": "at-doctor-symptoms-004",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The dictionary meaning and health-vocabulary lesson support symptoms as the group word; the other options name appointments, papers, or procedures."
    }
  ],
  "localeReviews": [
    {
      "locale": "ru",
      "method": "research_adapted",
      "reviewer": "Skyler Locale Editor RU",
      "notes": "RU copy keeps the current warm quiz tone with short doctor-visit scenes and avoids medical advice.",
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
      "reviewer": "Skyler Locale Editor UK",
      "notes": "UK copy mirrors the practical symptom and appointment scope while using natural Ukrainian feedback hooks.",
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
      "reviewer": "Skyler Locale Editor ES",
      "notes": "ES copy stays concise and instructional, naming the selected English option and the exact health-context mismatch.",
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
      "reviewer": "Skyler Locale Editor PTBR",
      "notes": "PT-BR copy uses direct classroom-style feedback and keeps treatment or diagnosis language out of the explanations.",
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
      "reviewer": "Skyler Locale Editor VI",
      "notes": "VI copy explains the selected English option with concrete daily-health contrasts and no literal filler.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S2"
      ]
    },
    {
      "locale": "id",
      "method": "research_adapted",
      "reviewer": "Skyler Locale Editor ID",
      "notes": "ID copy keeps the feedback short, option-specific, and tied to practical clinic vocabulary.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S2"
      ]
    },
    {
      "locale": "tr",
      "method": "research_adapted",
      "reviewer": "Skyler Locale Editor TR",
      "notes": "TR copy highlights collocation and meaning contrasts with calm doctor-visit wording.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S2"
      ]
    },
    {
      "locale": "pl",
      "method": "research_adapted",
      "reviewer": "Skyler Locale Editor PL",
      "notes": "PL copy uses compact feedback with selected-option contrasts and practical memory images.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S2"
      ]
    }
  ],
  "items": [
    {
      "id": "at-doctor-sore-throat-001",
      "type": "mcq",
      "prompt": "Your throat hurts and talking feels rough. What do you say?",
      "localizedPrompts": {
        "ru": "Ð“Ð¾Ñ€Ð»Ð¾ Ð±Ð¾Ð»Ð¸Ñ‚, Ð³Ð¾Ð²Ð¾Ñ€Ð¸Ñ‚ÑŒ Ð½ÐµÐ¿Ñ€Ð¸ÑÑ‚Ð½Ð¾. Ð§Ñ‚Ð¾ ÑÐºÐ°Ð·Ð°Ñ‚ÑŒ Ð²Ñ€Ð°Ñ‡Ñƒ?",
        "uk": "Ð‘Ð¾Ð»Ð¸Ñ‚ÑŒ Ð³Ð¾Ñ€Ð»Ð¾, Ð³Ð¾Ð²Ð¾Ñ€Ð¸Ñ‚Ð¸ Ð²Ð°Ð¶ÐºÐ¾. Ð©Ð¾ ÑÐºÐ°Ð·Ð°Ñ‚Ð¸ Ð»Ñ–ÐºÐ°Ñ€ÑŽ?",
        "es": "Te duele la garganta y hablar cuesta. Â¿QuÃ© dices al mÃ©dico?",
        "pt-BR": "Sua garganta doi e falar incomoda. O que voce diz ao medico?",
        "vi": "Co hong bi dau va noi rat kho. Ban noi gi voi bac si?",
        "id": "Tenggorokan sakit dan bicara terasa berat. Apa yang kamu katakan ke dokter?",
        "tr": "Bogazin agriyor ve konusmak zor geliyor. Doktora ne dersin?",
        "pl": "Boli cie gardlo i trudno mowic. Co powiesz lekarzowi?"
      },
      "choices": [
        "I have a sore throat.",
        "I have a sore neck.",
        "I am throat pain.",
        "I have a painful voice."
      ],
      "correctIndex": 0,
      "learningGoal": "Use a natural symptom phrase for throat pain.",
      "skillTag": "doctor_symptom_phrase",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C1",
        "C2"
      ],
      "choiceRationales": [
        "This option naturally names throat pain as a symptom phrase.",
        "This option names the neck, not the throat, so the body part shifts.",
        "This option copies noun order and does not form a natural English sentence.",
        "This option talks about the voice, not the throat symptom itself."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Ð‘Ð¸Ð½Ð³Ð¾. I have a sore throat Ð¿Ñ€ÑÐ¼Ð¾ Ð½Ð°Ð·Ñ‹Ð²Ð°ÐµÑ‚ Ð±Ð¾Ð»ÑŒ Ð² Ð³Ð¾Ñ€Ð»Ðµ; ÐºÐ¾Ñ€Ð¾Ñ‚ÐºÐ°Ñ Ñ„Ñ€Ð°Ð·Ð° Ð·Ð²ÑƒÑ‡Ð¸Ñ‚ ÑÐ¿Ð¾ÐºÐ¾Ð¹Ð½Ð¾ Ñƒ Ð²Ñ€Ð°Ñ‡Ð°.",
          "I have a sore neck ÑƒÐ²Ð¾Ð´Ð¸Ñ‚ Ð±Ð¾Ð»ÑŒ Ð² ÑˆÐµÑŽ, Ð° Ð½Ðµ Ð² Ð³Ð¾Ñ€Ð»Ð¾. Ð”Ð»Ñ Ð³Ð¾Ñ€Ð»Ð° Ð½ÑƒÐ¶ÐµÐ½ ÐºÐ¾Ð½Ñ‚Ñ€Ð°ÑÑ‚ I have a sore throat.",
          "I am throat pain Ð·Ð²ÑƒÑ‡Ð¸Ñ‚ ÐºÐ°Ðº Ð½Ð°Ð±Ð¾Ñ€ ÑÐ»Ð¾Ð². Ð£ Ð²Ñ€Ð°Ñ‡Ð° Ð±ÐµÐ·Ð¾Ð¿Ð°ÑÐ½ÐµÐµ ÐºÐ¾Ñ€Ð¾Ñ‚ÐºÐ¾ ÑÐºÐ°Ð·Ð°Ñ‚ÑŒ I have a sore throat.",
          "I have a painful voice Ð³Ð¾Ð²Ð¾Ñ€Ð¸Ñ‚ Ð¿Ñ€Ð¾ Ð³Ð¾Ð»Ð¾Ñ, Ð½Ð¾ Ð½Ðµ Ð½Ð°Ð·Ñ‹Ð²Ð°ÐµÑ‚ Ð³Ð¾Ñ€Ð»Ð¾. I have a sore throat Ñ‚Ð¾Ñ‡Ð½ÐµÐµ Ð¸ Ð¿Ð¾Ð½ÑÑ‚Ð½ÐµÐµ."
        ],
        "uk": [
          "Ð‘Ñ–Ð½Ð³Ð¾. I have a sore throat Ð¿Ñ€ÑÐ¼Ð¾ Ð½Ð°Ð·Ð¸Ð²Ð°Ñ” Ð±Ñ–Ð»ÑŒ Ñƒ Ð³Ð¾Ñ€Ð»Ñ–; Ñ‚Ð°ÐºÐ° ÐºÐ¾Ñ€Ð¾Ñ‚ÐºÐ° Ñ„Ñ€Ð°Ð·Ð° Ð·Ð²ÑƒÑ‡Ð¸Ñ‚ÑŒ ÑÐ¿Ð¾ÐºÑ–Ð¹Ð½Ð¾ Ð² Ð»Ñ–ÐºÐ°Ñ€Ñ.",
          "I have a sore neck Ð¿ÐµÑ€ÐµÐ½Ð¾ÑÐ¸Ñ‚ÑŒ Ð±Ñ–Ð»ÑŒ Ñƒ ÑˆÐ¸ÑŽ, Ð½Ðµ Ð² Ð³Ð¾Ñ€Ð»Ð¾. Ð”Ð»Ñ Ð³Ð¾Ñ€Ð»Ð° Ð¿Ð¾Ñ‚Ñ€Ñ–Ð±ÐµÐ½ Ð²Ð°Ñ€Ñ–Ð°Ð½Ñ‚ I have a sore throat.",
          "I am throat pain Ð·Ð²ÑƒÑ‡Ð¸Ñ‚ÑŒ ÑÐº Ð½Ð°Ð±Ñ–Ñ€ ÑÐ»Ñ–Ð². Ð£ Ð»Ñ–ÐºÐ°Ñ€Ñ ÐºÑ€Ð°Ñ‰Ðµ ÑÐºÐ°Ð·Ð°Ñ‚Ð¸ Ð¿Ñ€Ð¾ÑÑ‚Ð¾ I have a sore throat.",
          "I have a painful voice Ð³Ð¾Ð²Ð¾Ñ€Ð¸Ñ‚ÑŒ Ð¿Ñ€Ð¾ Ð³Ð¾Ð»Ð¾Ñ, Ð° Ð½Ðµ Ð¿Ñ€Ð¾ Ð³Ð¾Ñ€Ð»Ð¾. I have a sore throat Ñ‚Ð¾Ñ‡Ð½Ñ–ÑˆÐµ Ð¾Ð¿Ð¸ÑÑƒÑ” Ð¿Ñ€Ð¾Ð±Ð»ÐµÐ¼Ñƒ."
        ],
        "es": [
          "I have a sore throat nombra directamente el dolor de garganta; es una frase corta y tranquila para el medico.",
          "I have a sore neck cambia la parte del cuerpo al cuello. Para garganta, el contraste correcto es I have a sore throat.",
          "I am throat pain junta palabras sin una frase natural. En una consulta, I have a sore throat suena claro.",
          "I have a painful voice habla de la voz, no de la garganta. I have a sore throat dice mejor el sintoma."
        ],
        "pt-BR": [
          "I have a sore throat nomeia diretamente a dor de garganta; e curto, claro e util na consulta.",
          "I have a sore neck muda a parte do corpo para o pescoco. Para garganta, use I have a sore throat.",
          "I am throat pain mistura palavras sem uma frase natural. No medico, I have a sore throat resolve melhor.",
          "I have a painful voice fala da voz, nao da garganta. I have a sore throat descreve o sintoma com mais precisao."
        ],
        "vi": [
          "I have a sore throat noi thang ve dau hong; cau ngan nay nghe binh tinh va ro khi gap bac si.",
          "I have a sore neck chuyen sang dau co, khong phai co hong. Can noi I have a sore throat cho dung y.",
          "I am throat pain ghep tu khong tu nhien. Khi noi voi bac si, I have a sore throat ro hon nhieu.",
          "I have a painful voice noi ve giong noi, khong phai co hong. I have a sore throat dung trong tam hon."
        ],
        "id": [
          "I have a sore throat langsung menyebut sakit tenggorokan; kalimat pendek ini jelas untuk dokter.",
          "I have a sore neck memindahkan sakit ke leher. Untuk tenggorokan, pakai I have a sore throat.",
          "I am throat pain terdengar seperti kata-kata yang ditumpuk. Di klinik, I have a sore throat lebih aman.",
          "I have a painful voice membahas suara, bukan tenggorokan. I have a sore throat lebih tepat untuk keluhan itu."
        ],
        "tr": [
          "I have a sore throat bogaz agrisini dogrudan soyler; doktorda kisa ve sakin bir cumle gibi durur.",
          "I have a sore neck agriyi boyna tasir. Bogaz icin dogru karsilik I have a sore throat olur.",
          "I am throat pain Ingilizcede dogal bir cumle degil. Doktora I have a sore throat demek daha nettir.",
          "I have a painful voice sesten soz eder, bogazdan degil. I have a sore throat sikayeti daha iyi tasir."
        ],
        "pl": [
          "I have a sore throat prosto nazywa bol gardla; to krotka, spokojna fraza u lekarza.",
          "I have a sore neck przenosi bol na szyje. Przy gardle potrzebujesz I have a sore throat.",
          "I am throat pain brzmi jak zlepione slowa. U lekarza I have a sore throat bedzie jasniejsze.",
          "I have a painful voice mowi o glosie, nie o gardle. I have a sore throat trafia dokladniej."
        ]
      }
    },
    {
      "id": "at-doctor-appointment-002",
      "type": "mcq",
      "prompt": "You need to see Dr. Evans tomorrow. What phrase books the time?",
      "localizedPrompts": {
        "ru": "ÐÑƒÐ¶Ð½Ð¾ Ð¿Ð¾Ð¿Ð°ÑÑ‚ÑŒ Ðº Ð´Ð¾ÐºÑ‚Ð¾Ñ€Ñƒ Ð·Ð°Ð²Ñ‚Ñ€Ð°. ÐšÐ°ÐºÐ°Ñ Ñ„Ñ€Ð°Ð·Ð° Ð·Ð°Ð¿Ð¸ÑÑ‹Ð²Ð°ÐµÑ‚ Ð²Ñ€ÐµÐ¼Ñ?",
        "uk": "Ð¢Ñ€ÐµÐ±Ð° Ð¿Ð¾Ñ‚Ñ€Ð°Ð¿Ð¸Ñ‚Ð¸ Ð´Ð¾ Ð»Ñ–ÐºÐ°Ñ€Ñ Ð·Ð°Ð²Ñ‚Ñ€Ð°. Ð¯ÐºÐ° Ñ„Ñ€Ð°Ð·Ð° Ð´Ð¾Ð¼Ð¾Ð²Ð»ÑÑ”Ñ‚ÑŒÑÑ Ð¿Ñ€Ð¾ Ñ‡Ð°Ñ?",
        "es": "Necesitas ver al doctor maÃ±ana. Â¿QuÃ© frase reserva la hora?",
        "pt-BR": "Voce precisa ver o medico amanha. Que frase marca o horario?",
        "vi": "Ban can gap bac si ngay mai. Cum nao dung de hen gio?",
        "id": "Kamu perlu menemui dokter besok. Frasa mana untuk membuat jadwal?",
        "tr": "Yarin doktora gorunmen gerekiyor. Hangi ifade saat ayarlar?",
        "pl": "Musisz jutro isc do lekarza. Ktora fraza umawia termin?"
      },
      "choices": [
        "I want to make an appointment.",
        "I want to do an appointment.",
        "I want to make a recipe.",
        "I want to meet a symptom."
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the natural collocation for arranging a doctor visit.",
      "skillTag": "doctor_appointment_collocation",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C3",
        "C4"
      ],
      "choiceRationales": [
        "This option uses the expected make an appointment collocation.",
        "This option uses do with appointment, a common learner slip.",
        "This option confuses appointment language with cooking instructions.",
        "This option combines meet with a medical noun that is not a person or event."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "I want to make an appointment Ð·Ð²ÑƒÑ‡Ð¸Ñ‚ ÐµÑÑ‚ÐµÑÑ‚Ð²ÐµÐ½Ð½Ð¾: make an appointment Ð·Ð½Ð°Ñ‡Ð¸Ñ‚ Ð´Ð¾Ð³Ð¾Ð²Ð¾Ñ€Ð¸Ñ‚ÑŒÑÑ Ð¾ Ð²Ñ€ÐµÐ¼ÐµÐ½Ð¸ Ð²Ð¸Ð·Ð¸Ñ‚Ð°.",
          "I want to do an appointment ÑÐ¿Ð¾Ñ‚Ñ‹ÐºÐ°ÐµÑ‚ÑÑ Ð½Ð° Ð³Ð»Ð°Ð³Ð¾Ð»Ðµ do. Ð’ Ñ‚Ð°ÐºÐ¾Ð¹ ÑÐ¸Ñ‚ÑƒÐ°Ñ†Ð¸Ð¸ Ð½ÑƒÐ¶ÐµÐ½ make an appointment.",
          "I want to make a recipe Ð¾Ñ‚Ð¿Ñ€Ð°Ð²Ð»ÑÐµÑ‚ Ð½Ð°Ñ Ð½Ð° ÐºÑƒÑ…Ð½ÑŽ, Ð½Ðµ Ðº Ð²Ñ€Ð°Ñ‡Ñƒ. Ð”Ð»Ñ Ð·Ð°Ð¿Ð¸ÑÐ¸ Ð½ÑƒÐ¶ÐµÐ½ I want to make an appointment.",
          "I want to meet a symptom Ð·Ð²ÑƒÑ‡Ð¸Ñ‚ ÑÑ‚Ñ€Ð°Ð½Ð½Ð¾: symptom Ð½Ðµ Ñ‡ÐµÐ»Ð¾Ð²ÐµÐº. Ð—Ð°Ð¿Ð¸ÑÑŒ Ð¾Ñ„Ð¾Ñ€Ð¼Ð»ÑÐµÑ‚ I want to make an appointment."
        ],
        "uk": [
          "I want to make an appointment Ð·Ð²ÑƒÑ‡Ð¸Ñ‚ÑŒ Ð¿Ñ€Ð¸Ñ€Ð¾Ð´Ð½Ð¾: make an appointment Ð¾Ð·Ð½Ð°Ñ‡Ð°Ñ” Ð´Ð¾Ð¼Ð¾Ð²Ð¸Ñ‚Ð¸ÑÑ Ð¿Ñ€Ð¾ Ñ‡Ð°Ñ Ð²Ñ–Ð·Ð¸Ñ‚Ñƒ.",
          "I want to do an appointment Ð·Ð±Ð¸Ð²Ð°Ñ”Ñ‚ÑŒÑÑ Ð½Ð° do. Ð”Ð»Ñ Ð·Ð°Ð¿Ð¸ÑÑƒ Ð´Ð¾ Ð»Ñ–ÐºÐ°Ñ€Ñ Ð¿Ð¾Ñ‚Ñ€Ñ–Ð±Ð½Ðµ make an appointment.",
          "I want to make a recipe Ð²ÐµÐ´Ðµ Ð½Ð° ÐºÑƒÑ…Ð½ÑŽ, Ð½Ðµ Ð´Ð¾ Ð»Ñ–ÐºÐ°Ñ€Ñ. Ð”Ð»Ñ Ñ‡Ð°ÑÑƒ Ð²Ñ–Ð·Ð¸Ñ‚Ñƒ ÐºÐ°Ð¶ÐµÐ¼Ð¾ I want to make an appointment.",
          "I want to meet a symptom Ð·Ð²ÑƒÑ‡Ð¸Ñ‚ÑŒ Ð´Ð¸Ð²Ð½Ð¾: symptom Ð½Ðµ Ð»ÑŽÐ´Ð¸Ð½Ð°. Ð—Ð°Ð¿Ð¸Ñ Ñ€Ð¾Ð±Ð¸Ñ‚ÑŒ I want to make an appointment."
        ],
        "es": [
          "I want to make an appointment usa la colocacion natural para pedir una hora con el medico.",
          "I want to do an appointment usa do donde el ingles espera make. La frase util es I want to make an appointment.",
          "I want to make a recipe se va a la cocina. Para una cita medica, necesitas I want to make an appointment.",
          "I want to meet a symptom trata symptom como persona. Para reservar hora, usa I want to make an appointment."
        ],
        "pt-BR": [
          "I want to make an appointment usa a combinacao natural para marcar uma consulta.",
          "I want to do an appointment troca make por do. Para consulta, diga I want to make an appointment.",
          "I want to make a recipe leva a cena para receita de comida. Consulta pede I want to make an appointment.",
          "I want to meet a symptom trata symptom como alguem. Para marcar horario, use I want to make an appointment."
        ],
        "vi": [
          "I want to make an appointment la cach tu nhien de hen lich gap bac si.",
          "I want to do an appointment dung do sai cho nay. Cum can nho la I want to make an appointment.",
          "I want to make a recipe dua ban sang cong thuc nau an. Hen kham dung I want to make an appointment.",
          "I want to meet a symptom nghe nhu gap mot trieu chung. Hen gio thi dung I want to make an appointment."
        ],
        "id": [
          "I want to make an appointment memakai pasangan kata yang alami untuk membuat janji dengan dokter.",
          "I want to do an appointment memakai do yang tidak pas. Untuk janji, pilih I want to make an appointment.",
          "I want to make a recipe membawa kita ke resep masakan. Jadwal dokter perlu I want to make an appointment.",
          "I want to meet a symptom membuat symptom seperti orang. Untuk mengatur waktu, gunakan I want to make an appointment."
        ],
        "tr": [
          "I want to make an appointment doktordan randevu almak icin dogal kaliptir.",
          "I want to do an appointment do yuzunden takiliyor. Randevu icin I want to make an appointment gerekir.",
          "I want to make a recipe bizi yemek tarifine goturur. Doktor saati icin I want to make an appointment de.",
          "I want to meet a symptom symptom kelimesini kisi gibi yapar. Randevu icin I want to make an appointment uygundur."
        ],
        "pl": [
          "I want to make an appointment to naturalna fraza, gdy chcesz umowic termin u lekarza.",
          "I want to do an appointment potyka sie o do. Przy terminie potrzebne jest I want to make an appointment.",
          "I want to make a recipe przenosi nas do przepisu kulinarnego. Wizyta wymaga I want to make an appointment.",
          "I want to meet a symptom brzmi, jakby symptom byl osoba. Termin zalatwia I want to make an appointment."
        ]
      }
    },
    {
      "id": "at-doctor-prescription-003",
      "type": "mcq",
      "prompt": "The doctor gives you the paper for medicine. What is it called?",
      "localizedPrompts": {
        "ru": "Ð’Ñ€Ð°Ñ‡ Ð´Ð°ÐµÑ‚ Ð±ÑƒÐ¼Ð°Ð³Ñƒ Ð´Ð»Ñ Ð»ÐµÐºÐ°Ñ€ÑÑ‚Ð²Ð°. ÐšÐ°Ðº ÑÑ‚Ð¾ Ð½Ð°Ð·Ñ‹Ð²Ð°ÐµÑ‚ÑÑ?",
        "uk": "Ð›Ñ–ÐºÐ°Ñ€ Ð´Ð°Ñ” Ð¿Ð°Ð¿Ñ–Ñ€ Ð´Ð»Ñ Ð»Ñ–ÐºÑ–Ð². Ð¯Ðº Ñ†Ðµ Ð½Ð°Ð·Ð¸Ð²Ð°Ñ”Ñ‚ÑŒÑÑ?",
        "es": "El medico te da un papel para la medicina. Â¿Como se llama?",
        "pt-BR": "O medico da um papel para o remedio. Como se chama?",
        "vi": "Bac si dua giay de lay thuoc. No goi la gi?",
        "id": "Dokter memberi kertas untuk obat. Itu disebut apa?",
        "tr": "Doktor ilac icin bir kagit verir. Buna ne denir?",
        "pl": "Lekarz daje papier na lekarstwo. Jak to sie nazywa?"
      },
      "choices": [
        "a prescription",
        "a reception",
        "a symptom",
        "a recipe"
      ],
      "correctIndex": 0,
      "learningGoal": "Recognize the word for a medicine document from a doctor.",
      "skillTag": "doctor_medicine_document",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C5",
        "C6"
      ],
      "choiceRationales": [
        "This option names the medicine document from a doctor.",
        "This option is a near-spelling distractor connected to front-desk reception.",
        "This option names a health problem sign, not a paper for medicine.",
        "This option is a familiar false friend with cooking meaning."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "a prescription â€” ÑÑ‚Ð¾ Ð´Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚ Ð´Ð»Ñ Ð»ÐµÐºÐ°Ñ€ÑÑ‚Ð²Ð° Ð¾Ñ‚ Ð²Ñ€Ð°Ñ‡Ð°; Ð·Ð²ÑƒÑ‡Ð¸Ñ‚ Ð¿Ð¾Ñ‡Ñ‚Ð¸ Ð¾Ñ„Ð¸Ñ†Ð¸Ð°Ð»ÑŒÐ½Ð¾, Ð½Ð¾ ÑÐ»Ð¾Ð²Ð¾ Ð¾Ñ‡ÐµÐ½ÑŒ Ð±Ñ‹Ñ‚Ð¾Ð²Ð¾Ðµ.",
          "a reception Ð¿Ð¾Ñ…Ð¾Ð¶Ðµ Ð¿Ð¾ Ð±ÑƒÐºÐ²Ð°Ð¼, Ð½Ð¾ ÑÑ‚Ð¾ ÑÑ‚Ð¾Ð¹ÐºÐ° Ð¸Ð»Ð¸ Ð¿Ñ€Ð¸ÐµÐ¼. Ð‘ÑƒÐ¼Ð°Ð³Ð° Ð´Ð»Ñ Ð»ÐµÐºÐ°Ñ€ÑÑ‚Ð²Ð° â€” a prescription.",
          "a symptom â€” ÑÑ‚Ð¾ Ð¿Ñ€Ð¸Ð·Ð½Ð°Ðº Ð±Ð¾Ð»ÐµÐ·Ð½Ð¸, Ð½Ð°Ð¿Ñ€Ð¸Ð¼ÐµÑ€ ÐºÐ°ÑˆÐµÐ»ÑŒ. Ð‘ÑƒÐ¼Ð°Ð³Ð° Ð¾Ñ‚ Ð²Ñ€Ð°Ñ‡Ð° Ð½Ð°Ð·Ñ‹Ð²Ð°ÐµÑ‚ÑÑ a prescription.",
          "a recipe Ð¶Ð¸Ð²ÐµÑ‚ Ð½Ð° ÐºÑƒÑ…Ð½Ðµ Ñ ÑÑƒÐ¿Ð¾Ð¼ Ð¸ Ð¿Ð¸Ñ€Ð¾Ð³Ð¾Ð¼. Ð”Ð»Ñ Ð»ÐµÐºÐ°Ñ€ÑÑ‚Ð²Ð° Ð¾Ñ‚ Ð²Ñ€Ð°Ñ‡Ð° Ð½ÑƒÐ¶Ð½Ð¾ a prescription."
        ],
        "uk": [
          "a prescription â€” Ñ†Ðµ Ð´Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚ Ð´Ð»Ñ Ð»Ñ–ÐºÑ–Ð² Ð²Ñ–Ð´ Ð»Ñ–ÐºÐ°Ñ€Ñ; ÑÐ»Ð¾Ð²Ð¾ Ð¾Ñ„Ñ–Ñ†Ñ–Ð¹Ð½Ðµ Ð½Ð° Ð²Ð¸Ð³Ð»ÑÐ´, Ð°Ð»Ðµ Ð´ÑƒÐ¶Ðµ Ñ‰Ð¾Ð´ÐµÐ½Ð½Ðµ.",
          "a reception ÑÑ…Ð¾Ð¶Ðµ Ð»Ñ–Ñ‚ÐµÑ€Ð°Ð¼Ð¸, Ñ‚Ð° Ñ†Ðµ Ð¿Ñ€Ð¸Ð¹Ð¼Ð°Ð»ÑŒÐ½Ñ Ð°Ð±Ð¾ ÑÑ‚Ñ–Ð¹ÐºÐ°. ÐŸÐ°Ð¿Ñ–Ñ€ Ð´Ð»Ñ Ð»Ñ–ÐºÑ–Ð² â€” a prescription.",
          "a symptom â€” Ñ†Ðµ Ð¾Ð·Ð½Ð°ÐºÐ° Ñ…Ð²Ð¾Ñ€Ð¾Ð±Ð¸, Ð½Ð°Ð¿Ñ€Ð¸ÐºÐ»Ð°Ð´ ÐºÐ°ÑˆÐµÐ»ÑŒ. Ð”Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚ Ð²Ñ–Ð´ Ð»Ñ–ÐºÐ°Ñ€Ñ â€” a prescription.",
          "a recipe Ð¶Ð¸Ð²Ðµ Ð½Ð° ÐºÑƒÑ…Ð½Ñ– Ð±Ñ–Ð»Ñ ÑÑƒÐ¿Ñƒ. Ð”Ð»Ñ Ð»Ñ–ÐºÑ–Ð² Ð²Ñ–Ð´ Ð»Ñ–ÐºÐ°Ñ€Ñ Ð¿Ð¾Ñ‚Ñ€Ñ–Ð±Ð½Ðµ a prescription."
        ],
        "es": [
          "a prescription es el documento para conseguir medicina; suena formal, pero es palabra diaria en la consulta.",
          "a reception se parece por las letras, pero habla de recepcion. El papel medico es a prescription.",
          "a symptom es una senal de enfermedad, como tos o fiebre. El papel para medicina es a prescription.",
          "a recipe pertenece a la cocina y a la sopa. Para medicina indicada por el medico, usa a prescription."
        ],
        "pt-BR": [
          "a prescription e o documento para pegar remedio; parece formal, mas aparece muito em consulta.",
          "a reception parece na escrita, mas e recepcao. O papel para remedio e a prescription.",
          "a symptom e um sinal de doenca, como tosse. O documento de remedio e a prescription.",
          "a recipe mora na cozinha, com bolo e sopa. Para remedio indicado pelo medico, use a prescription."
        ],
        "vi": [
          "a prescription la giay de lay thuoc theo loi bac si; tu nay nghe nghiem tuc nhung rat thuc te.",
          "a reception giong chu, nhung la quay tiep tan. Giay thuoc cua bac si la a prescription.",
          "a symptom la dau hieu benh, nhu ho. Giay de lay thuoc phai la a prescription.",
          "a recipe thuoc ve nau an va mon sup. Thuoc bac si ghi thi dung a prescription."
        ],
        "id": [
          "a prescription adalah dokumen untuk obat dari dokter; kata ini terdengar resmi tetapi sangat praktis.",
          "a reception mirip tulisannya, tetapi berarti bagian penerima tamu. Kertas obat adalah a prescription.",
          "a symptom adalah tanda sakit, misalnya batuk. Dokumen untuk obat disebut a prescription.",
          "a recipe milik dapur dan masakan. Untuk obat dari dokter, kata yang tepat adalah a prescription."
        ],
        "tr": [
          "a prescription doktorun ilac icin verdigi belgedir; resmi gibi durur ama gunluk hayatta is gorur.",
          "a reception yazilis olarak benzer, fakat resepsiyon demektir. Ilac kagidi a prescription olur.",
          "a symptom hastalik belirtisidir, mesela oksuruk. Ilac belgesi icin a prescription gerekir.",
          "a recipe mutfakta yemek tarifiyle gezer. Doktorun ilac kagidi icin a prescription kullan."
        ],
        "pl": [
          "a prescription to dokument na lekarstwo od lekarza; brzmi urzedowo, ale w praktyce bardzo codziennie.",
          "a reception wyglada podobnie, lecz oznacza recepcje. Papier na lek to a prescription.",
          "a symptom to objaw choroby, na przyklad kaszel. Dokument na lek nazywa sie a prescription.",
          "a recipe siedzi w kuchni przy zupie. Przy leku od lekarza potrzebujesz a prescription."
        ]
      }
    },
    {
      "id": "at-doctor-symptoms-004",
      "type": "mcq",
      "prompt": "Cough, fever, and pain are all your...",
      "localizedPrompts": {
        "ru": "ÐšÐ°ÑˆÐµÐ»ÑŒ, Ñ‚ÐµÐ¼Ð¿ÐµÑ€Ð°Ñ‚ÑƒÑ€Ð° Ð¸ Ð±Ð¾Ð»ÑŒ â€” ÑÑ‚Ð¾ Ð²ÑÐµ Ñ‚Ð²Ð¾Ð¸...",
        "uk": "ÐšÐ°ÑˆÐµÐ»ÑŒ, Ñ‚ÐµÐ¼Ð¿ÐµÑ€Ð°Ñ‚ÑƒÑ€Ð° Ñ– Ð±Ñ–Ð»ÑŒ â€” Ñ†Ðµ Ð²ÑÐµ Ñ‚Ð²Ð¾Ñ—...",
        "es": "Tos, fiebre y dolor son todos tus...",
        "pt-BR": "Tosse, febre e dor sao todos seus...",
        "vi": "Ho, sot va dau deu la...",
        "id": "Batuk, demam, dan nyeri semuanya adalah...",
        "tr": "Oksuruk, ates ve agri senin...",
        "pl": "Kaszel, goraczka i bol to twoje..."
      },
      "choices": [
        "symptoms",
        "appointments",
        "prescriptions",
        "injections"
      ],
      "correctIndex": 0,
      "learningGoal": "Use the umbrella word for signs or feelings of illness.",
      "skillTag": "doctor_symptom_vocabulary",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C7",
        "C8"
      ],
      "choiceRationales": [
        "This option names the group of illness signs or feelings.",
        "This option names scheduled visits, not the physical problems.",
        "This option names medicine documents, not cough or fever.",
        "This option names a procedure, not the things the patient feels."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "symptoms ÑÐ¾Ð±Ð¸Ñ€Ð°ÐµÑ‚ ÐºÐ°ÑˆÐµÐ»ÑŒ, Ñ‚ÐµÐ¼Ð¿ÐµÑ€Ð°Ñ‚ÑƒÑ€Ñƒ Ð¸ Ð±Ð¾Ð»ÑŒ Ð² Ð¾Ð´Ð½Ñƒ Ð¿Ð¾Ð½ÑÑ‚Ð½ÑƒÑŽ Ð³Ñ€ÑƒÐ¿Ð¿Ñƒ Ñ‚Ð¾Ð³Ð¾, Ñ‡Ñ‚Ð¾ Ñ‡ÑƒÐ²ÑÑ‚Ð²ÑƒÐµÑˆÑŒ.",
          "appointments â€” ÑÑ‚Ð¾ Ð·Ð°Ð¿Ð¸ÑÐ¸ Ð½Ð° Ð¿Ñ€Ð¸ÐµÐ¼, Ð° Ð½Ðµ ÐºÐ°ÑˆÐµÐ»ÑŒ Ð¸Ð»Ð¸ Ð±Ð¾Ð»ÑŒ. Ð”Ð»Ñ Ñ‚Ð°ÐºÐ¸Ñ… Ð¿Ñ€Ð¸Ð·Ð½Ð°ÐºÐ¾Ð² Ð½ÑƒÐ¶Ð½Ð¾ symptoms.",
          "prescriptions â€” ÑÑ‚Ð¾ Ð´Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚Ñ‹ Ð´Ð»Ñ Ð»ÐµÐºÐ°Ñ€ÑÑ‚Ð². ÐšÐ°ÑˆÐµÐ»ÑŒ Ð¸ Ñ‚ÐµÐ¼Ð¿ÐµÑ€Ð°Ñ‚ÑƒÑ€Ð° Ð¾Ñ‚Ð½Ð¾ÑÑÑ‚ÑÑ Ðº symptoms.",
          "injections â€” ÑÑ‚Ð¾ ÑƒÐºÐ¾Ð»Ñ‹, Ð´ÐµÐ¹ÑÑ‚Ð²Ð¸Ðµ Ð²Ñ€Ð°Ñ‡Ð°. Ð¢Ð¾, Ñ‡Ñ‚Ð¾ Ñ‚Ñ‹ Ð¾Ð¿Ð¸ÑÑ‹Ð²Ð°ÐµÑˆÑŒ Ð´Ð¾ ÑƒÐºÐ¾Ð»Ð°, â€” symptoms."
        ],
        "uk": [
          "symptoms Ð·Ð±Ð¸Ñ€Ð°Ñ” ÐºÐ°ÑˆÐµÐ»ÑŒ, Ñ‚ÐµÐ¼Ð¿ÐµÑ€Ð°Ñ‚ÑƒÑ€Ñƒ Ð¹ Ð±Ñ–Ð»ÑŒ Ð² Ð¾Ð´Ð½Ñƒ Ð·Ñ€Ð¾Ð·ÑƒÐ¼Ñ–Ð»Ñƒ Ð³Ñ€ÑƒÐ¿Ñƒ Ñ‚Ð¾Ð³Ð¾, Ñ‰Ð¾ Ð²Ñ–Ð´Ñ‡ÑƒÐ²Ð°Ñ”Ñˆ.",
          "appointments â€” Ñ†Ðµ Ð·Ð°Ð¿Ð¸ÑÐ¸ Ð½Ð° Ð¿Ñ€Ð¸Ð¹Ð¾Ð¼, Ð½Ðµ ÐºÐ°ÑˆÐµÐ»ÑŒ Ñ– Ð±Ñ–Ð»ÑŒ. Ð”Ð»Ñ Ñ‚Ð°ÐºÐ¸Ñ… Ð¾Ð·Ð½Ð°Ðº Ð¿Ð¾Ñ‚Ñ€Ñ–Ð±Ð½Ðµ symptoms.",
          "prescriptions â€” Ñ†Ðµ Ð´Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚Ð¸ Ð´Ð»Ñ Ð»Ñ–ÐºÑ–Ð². ÐšÐ°ÑˆÐµÐ»ÑŒ Ñ– Ñ‚ÐµÐ¼Ð¿ÐµÑ€Ð°Ñ‚ÑƒÑ€Ð° Ð½Ð°Ð»ÐµÐ¶Ð°Ñ‚ÑŒ Ð´Ð¾ symptoms.",
          "injections â€” Ñ†Ðµ ÑƒÐºÐ¾Ð»Ð¸, Ð´Ñ–Ñ Ð»Ñ–ÐºÐ°Ñ€Ñ. Ð¢Ðµ, Ñ‰Ð¾ Ñ‚Ð¸ Ð¾Ð¿Ð¸ÑÑƒÑ”Ñˆ Ð¿ÐµÑ€ÐµÐ´ Ð»Ñ–ÐºÑƒÐ²Ð°Ð½Ð½ÑÐ¼, â€” symptoms."
        ],
        "es": [
          "symptoms agrupa tos, fiebre y dolor como cosas que sientes cuando algo no va bien.",
          "appointments son citas, no tos ni dolor. Para esos signos del cuerpo, necesitas symptoms.",
          "prescriptions son documentos para medicina. Tos y fiebre viven mejor bajo symptoms.",
          "injections son inyecciones, una accion medica. Lo que cuentas antes son symptoms."
        ],
        "pt-BR": [
          "symptoms junta tosse, febre e dor como sinais que voce sente quando algo nao vai bem.",
          "appointments sao consultas marcadas, nao tosse ou dor. Para esses sinais, use symptoms.",
          "prescriptions sao documentos para remedio. Tosse e febre entram melhor em symptoms.",
          "injections sao injecoes, uma acao medica. O que voce descreve antes disso sao symptoms."
        ],
        "vi": [
          "symptoms gom ho, sot va dau thanh nhom dau hieu ma co the dang cam thay.",
          "appointments la lich hen, khong phai ho hay dau. Nhung dau hieu nay la symptoms.",
          "prescriptions la giay thuoc. Ho va sot thuoc ve symptoms thi dung hon.",
          "injections la mui tiem, mot hanh dong y te. Dieu ban ke voi bac si la symptoms."
        ],
        "id": [
          "symptoms mengumpulkan batuk, demam, dan nyeri sebagai tanda yang kamu rasakan.",
          "appointments adalah jadwal kunjungan, bukan batuk atau nyeri. Untuk tanda tubuh, pakai symptoms.",
          "prescriptions adalah dokumen obat. Batuk dan demam lebih tepat disebut symptoms.",
          "injections adalah suntikan, tindakan medis. Hal yang kamu ceritakan dulu adalah symptoms."
        ],
        "tr": [
          "symptoms oksuruk, ates ve agriyi hissettigin belirtiler olarak tek kelimede toplar.",
          "appointments randevulardir, oksuruk ya da agri degil. Bu beden isaretleri icin symptoms gerekir.",
          "prescriptions ilac belgeleridir. Oksuruk ve ates icin symptoms daha dogru kelimedir.",
          "injections igne anlamina gelir, yani bir uygulama. Doktora anlattigin seyler symptoms olur."
        ],
        "pl": [
          "symptoms zbiera kaszel, goraczke i bol jako rzeczy, ktore czujesz w ciele.",
          "appointments to umowione wizyty, nie kaszel ani bol. Dla takich oznak pasuje symptoms.",
          "prescriptions to dokumenty na leki. Kaszel i goraczka najlepiej wpadaja pod symptoms.",
          "injections to zastrzyki, czyli dzialanie medyczne. To, co opisujesz lekarzowi, to symptoms."
        ]
      }
    }
  ]
}
;
