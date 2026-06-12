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
    "environment": "production",
    "productionActivation": "approved_by_user",
    "approvedBy": "current user",
    "approvedAt": "2026-05-26",
    "approvalSource": "Chat approval to move Home and rooms out of dev after review and testing.",
    "notes": "Home and rooms was promoted after the creator approved the 100-item set and requested removing the dev-only gate."
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
      "text": "bedroom is the correct English word for a room where you sleep in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a room where you sleep."
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
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C2",
      "type": "usage_rule",
      "text": "bathroom is the correct English word for a room where you wash or use the toilet in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a room where you wash or use the toilet."
    },
    {
      "id": "K2",
      "type": "answer_key",
      "text": "Choice 1, bathroom, is the only correct answer for home-and-rooms-002.",
      "itemId": "home-and-rooms-002",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C3",
      "type": "usage_rule",
      "text": "living room is the correct English word for a room where people relax or watch TV in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a room where people relax or watch TV."
    },
    {
      "id": "K3",
      "type": "answer_key",
      "text": "Choice 2, living room, is the only correct answer for home-and-rooms-003.",
      "itemId": "home-and-rooms-003",
      "answerIndex": 2,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C4",
      "type": "usage_rule",
      "text": "bed is the correct English word for the furniture you sleep on in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the furniture you sleep on."
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
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C5",
      "type": "usage_rule",
      "text": "chair is the correct English word for a seat for one person in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a seat for one person."
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
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C6",
      "type": "usage_rule",
      "text": "desk is the correct English word for a table for studying or working in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a table for studying or working."
    },
    {
      "id": "K6",
      "type": "answer_key",
      "text": "Choice 1, desk, is the only correct answer for home-and-rooms-006.",
      "itemId": "home-and-rooms-006",
      "answerIndex": 1,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C7",
      "type": "usage_rule",
      "text": "door is the correct English word for the thing you open to enter a room in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the thing you open to enter a room."
    },
    {
      "id": "K7",
      "type": "answer_key",
      "text": "Choice 2, door, is the only correct answer for home-and-rooms-007.",
      "itemId": "home-and-rooms-007",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C8",
      "type": "usage_rule",
      "text": "window is the correct English word for the glass opening that lets light in in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the glass opening that lets light in."
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
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C9",
      "type": "usage_rule",
      "text": "floor is the correct English word for the surface you walk on inside a room in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the surface you walk on inside a room."
    },
    {
      "id": "K9",
      "type": "answer_key",
      "text": "Choice 0, floor, is the only correct answer for home-and-rooms-009.",
      "itemId": "home-and-rooms-009",
      "answerIndex": 0,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C10",
      "type": "usage_rule",
      "text": "wall is the correct English word for the vertical side of a room in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the vertical side of a room."
    },
    {
      "id": "K10",
      "type": "answer_key",
      "text": "Choice 1, wall, is the only correct answer for home-and-rooms-010.",
      "itemId": "home-and-rooms-010",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C11",
      "type": "usage_rule",
      "text": "lamp is the correct English word for an object that gives light in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match an object that gives light."
    },
    {
      "id": "K11",
      "type": "answer_key",
      "text": "Choice 2, lamp, is the only correct answer for home-and-rooms-011.",
      "itemId": "home-and-rooms-011",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C12",
      "type": "usage_rule",
      "text": "carpet is the correct English word for soft material that covers much of the floor in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match soft material that covers much of the floor."
    },
    {
      "id": "K12",
      "type": "answer_key",
      "text": "Choice 3, carpet, is the only correct answer for home-and-rooms-012.",
      "itemId": "home-and-rooms-012",
      "answerIndex": 3,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C13",
      "type": "usage_rule",
      "text": "sink is the correct English word for the bowl where water runs for washing hands or dishes in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the bowl where water runs for washing hands or dishes."
    },
    {
      "id": "K13",
      "type": "answer_key",
      "text": "Choice 0, sink, is the only correct answer for home-and-rooms-013.",
      "itemId": "home-and-rooms-013",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C14",
      "type": "usage_rule",
      "text": "mirror is the correct English word for the glass where you see yourself in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the glass where you see yourself."
    },
    {
      "id": "K14",
      "type": "answer_key",
      "text": "Choice 1, mirror, is the only correct answer for home-and-rooms-014.",
      "itemId": "home-and-rooms-014",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C15",
      "type": "usage_rule",
      "text": "shelf is the correct English word for a flat board for holding things on a wall or cabinet in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a flat board for holding things on a wall or cabinet."
    },
    {
      "id": "K15",
      "type": "answer_key",
      "text": "Choice 2, shelf, is the only correct answer for home-and-rooms-015.",
      "itemId": "home-and-rooms-015",
      "answerIndex": 2,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C16",
      "type": "usage_rule",
      "text": "pillow is the correct English word for the soft thing under your head in bed in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the soft thing under your head in bed."
    },
    {
      "id": "K16",
      "type": "answer_key",
      "text": "Choice 3, pillow, is the only correct answer for home-and-rooms-016.",
      "itemId": "home-and-rooms-016",
      "answerIndex": 3,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C17",
      "type": "usage_rule",
      "text": "kitchen is the correct English word for the room where people cook food in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the room where people cook food."
    },
    {
      "id": "K17",
      "type": "answer_key",
      "text": "Choice 0, kitchen, is the only correct answer for home-and-rooms-017.",
      "itemId": "home-and-rooms-017",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C18",
      "type": "usage_rule",
      "text": "curtains is the correct English word for cloth pieces that cover a window in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match cloth pieces that cover a window."
    },
    {
      "id": "K18",
      "type": "answer_key",
      "text": "Choice 1, curtains, is the only correct answer for home-and-rooms-018.",
      "itemId": "home-and-rooms-018",
      "answerIndex": 1,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C19",
      "type": "usage_rule",
      "text": "blanket is the correct English word for a warm cover used on a bed in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a warm cover used on a bed."
    },
    {
      "id": "K19",
      "type": "answer_key",
      "text": "Choice 2, blanket, is the only correct answer for home-and-rooms-019.",
      "itemId": "home-and-rooms-019",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C20",
      "type": "usage_rule",
      "text": "cushion is the correct English word for a soft small pillow for a sofa or chair in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a soft small pillow for a sofa or chair."
    },
    {
      "id": "K20",
      "type": "answer_key",
      "text": "Choice 3, cushion, is the only correct answer for home-and-rooms-020.",
      "itemId": "home-and-rooms-020",
      "answerIndex": 3,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C21",
      "type": "usage_rule",
      "text": "sofa is the correct English word for a long soft seat for several people in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a long soft seat for several people."
    },
    {
      "id": "K21",
      "type": "answer_key",
      "text": "Choice 0, sofa, is the only correct answer for home-and-rooms-021.",
      "itemId": "home-and-rooms-021",
      "answerIndex": 0,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C22",
      "type": "usage_rule",
      "text": "cupboard is the correct English word for a cabinet with doors for storing things in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a cabinet with doors for storing things."
    },
    {
      "id": "K22",
      "type": "answer_key",
      "text": "Choice 1, cupboard, is the only correct answer for home-and-rooms-022.",
      "itemId": "home-and-rooms-022",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C23",
      "type": "usage_rule",
      "text": "table is the correct English word for furniture with a flat top for eating or placing things in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match furniture with a flat top for eating or placing things."
    },
    {
      "id": "K23",
      "type": "answer_key",
      "text": "Choice 2, table, is the only correct answer for home-and-rooms-023.",
      "itemId": "home-and-rooms-023",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C24",
      "type": "usage_rule",
      "text": "bookshelf is the correct English word for a shelf or case for books in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a shelf or case for books."
    },
    {
      "id": "K24",
      "type": "answer_key",
      "text": "Choice 3, bookshelf, is the only correct answer for home-and-rooms-024.",
      "itemId": "home-and-rooms-024",
      "answerIndex": 3,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C25",
      "type": "usage_rule",
      "text": "light switch is the correct English word for the small control you press to turn a light on or off in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the small control you press to turn a light on or off."
    },
    {
      "id": "K25",
      "type": "answer_key",
      "text": "Choice 0, light switch, is the only correct answer for home-and-rooms-025.",
      "itemId": "home-and-rooms-025",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C26",
      "type": "usage_rule",
      "text": "stairs is the correct English word for steps that connect one floor to another in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match steps that connect one floor to another."
    },
    {
      "id": "K26",
      "type": "answer_key",
      "text": "Choice 1, stairs, is the only correct answer for home-and-rooms-026.",
      "itemId": "home-and-rooms-026",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C27",
      "type": "usage_rule",
      "text": "balcony is the correct English word for a small outside platform on an upper floor in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a small outside platform on an upper floor."
    },
    {
      "id": "K27",
      "type": "answer_key",
      "text": "Choice 2, balcony, is the only correct answer for home-and-rooms-027.",
      "itemId": "home-and-rooms-027",
      "answerIndex": 2,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C28",
      "type": "usage_rule",
      "text": "coffee table is the correct English word for a low table usually placed near a sofa in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a low table usually placed near a sofa."
    },
    {
      "id": "K28",
      "type": "answer_key",
      "text": "Choice 3, coffee table, is the only correct answer for home-and-rooms-028.",
      "itemId": "home-and-rooms-028",
      "answerIndex": 3,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C29",
      "type": "usage_rule",
      "text": "TV is the correct English word for a television for watching shows or videos in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a television for watching shows or videos."
    },
    {
      "id": "K29",
      "type": "answer_key",
      "text": "Choice 0, TV, is the only correct answer for home-and-rooms-029.",
      "itemId": "home-and-rooms-029",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C30",
      "type": "usage_rule",
      "text": "screen is the correct English word for the part of a TV or device that shows the picture in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the part of a TV or device that shows the picture."
    },
    {
      "id": "K30",
      "type": "answer_key",
      "text": "Choice 1, screen, is the only correct answer for home-and-rooms-030.",
      "itemId": "home-and-rooms-030",
      "answerIndex": 1,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C31",
      "type": "usage_rule",
      "text": "clock is the correct English word for an object that shows the time in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match an object that shows the time."
    },
    {
      "id": "K31",
      "type": "answer_key",
      "text": "Choice 2, clock, is the only correct answer for home-and-rooms-031.",
      "itemId": "home-and-rooms-031",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C32",
      "type": "usage_rule",
      "text": "key is the correct English word for a small metal object used to open a lock in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a small metal object used to open a lock."
    },
    {
      "id": "K32",
      "type": "answer_key",
      "text": "Choice 3, key, is the only correct answer for home-and-rooms-032.",
      "itemId": "home-and-rooms-032",
      "answerIndex": 3,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C33",
      "type": "usage_rule",
      "text": "front door is the correct English word for the main door at the entrance of a home in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the main door at the entrance of a home."
    },
    {
      "id": "K33",
      "type": "answer_key",
      "text": "Choice 0, front door, is the only correct answer for home-and-rooms-033.",
      "itemId": "home-and-rooms-033",
      "answerIndex": 0,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C34",
      "type": "usage_rule",
      "text": "hallway is the correct English word for a narrow passage between rooms in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a narrow passage between rooms."
    },
    {
      "id": "K34",
      "type": "answer_key",
      "text": "Choice 1, hallway, is the only correct answer for home-and-rooms-034.",
      "itemId": "home-and-rooms-034",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C35",
      "type": "usage_rule",
      "text": "garage is the correct English word for a place at home for a car in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a place at home for a car."
    },
    {
      "id": "K35",
      "type": "answer_key",
      "text": "Choice 2, garage, is the only correct answer for home-and-rooms-035.",
      "itemId": "home-and-rooms-035",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C36",
      "type": "usage_rule",
      "text": "cabinet is the correct English word for a storage unit with doors or drawers in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a storage unit with doors or drawers."
    },
    {
      "id": "K36",
      "type": "answer_key",
      "text": "Choice 3, cabinet, is the only correct answer for home-and-rooms-036.",
      "itemId": "home-and-rooms-036",
      "answerIndex": 3,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C37",
      "type": "usage_rule",
      "text": "soap is the correct English word for the thing used with water to wash hands or body in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the thing used with water to wash hands or body."
    },
    {
      "id": "K37",
      "type": "answer_key",
      "text": "Choice 0, soap, is the only correct answer for home-and-rooms-037.",
      "itemId": "home-and-rooms-037",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C38",
      "type": "usage_rule",
      "text": "rug is the correct English word for a small carpet for part of the floor in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a small carpet for part of the floor."
    },
    {
      "id": "K38",
      "type": "answer_key",
      "text": "Choice 1, rug, is the only correct answer for home-and-rooms-038.",
      "itemId": "home-and-rooms-038",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C39",
      "type": "usage_rule",
      "text": "storage box is the correct English word for a box used to keep household items tidy in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a box used to keep household items tidy."
    },
    {
      "id": "K39",
      "type": "answer_key",
      "text": "Choice 2, storage box, is the only correct answer for home-and-rooms-039.",
      "itemId": "home-and-rooms-039",
      "answerIndex": 2,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C40",
      "type": "usage_rule",
      "text": "chest of drawers is the correct English word for a piece of furniture with several drawers in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a piece of furniture with several drawers."
    },
    {
      "id": "K40",
      "type": "answer_key",
      "text": "Choice 3, chest of drawers, is the only correct answer for home-and-rooms-040.",
      "itemId": "home-and-rooms-040",
      "answerIndex": 3,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C41",
      "type": "usage_rule",
      "text": "wardrobe is the correct English word for a tall cupboard for clothes in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a tall cupboard for clothes."
    },
    {
      "id": "K41",
      "type": "answer_key",
      "text": "Choice 0, wardrobe, is the only correct answer for home-and-rooms-041.",
      "itemId": "home-and-rooms-041",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C42",
      "type": "usage_rule",
      "text": "bedside table is the correct English word for a small table beside a bed in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a small table beside a bed."
    },
    {
      "id": "K42",
      "type": "answer_key",
      "text": "Choice 1, bedside table, is the only correct answer for home-and-rooms-042.",
      "itemId": "home-and-rooms-042",
      "answerIndex": 1,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C43",
      "type": "usage_rule",
      "text": "dining room is the correct English word for a room where people eat meals in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a room where people eat meals."
    },
    {
      "id": "K43",
      "type": "answer_key",
      "text": "Choice 2, dining room, is the only correct answer for home-and-rooms-043.",
      "itemId": "home-and-rooms-043",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C44",
      "type": "usage_rule",
      "text": "home office is the correct English word for a room or area for working at home in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a room or area for working at home."
    },
    {
      "id": "K44",
      "type": "answer_key",
      "text": "Choice 3, home office, is the only correct answer for home-and-rooms-044.",
      "itemId": "home-and-rooms-044",
      "answerIndex": 3,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C45",
      "type": "usage_rule",
      "text": "children's room is the correct English word for a room for a child at home in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a room for a child at home."
    },
    {
      "id": "K45",
      "type": "answer_key",
      "text": "Choice 0, children's room, is the only correct answer for home-and-rooms-045.",
      "itemId": "home-and-rooms-045",
      "answerIndex": 0,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C46",
      "type": "usage_rule",
      "text": "attic is the correct English word for the space or room under the roof in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the space or room under the roof."
    },
    {
      "id": "K46",
      "type": "answer_key",
      "text": "Choice 1, attic, is the only correct answer for home-and-rooms-046.",
      "itemId": "home-and-rooms-046",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C47",
      "type": "usage_rule",
      "text": "basement is the correct English word for the room or space below the ground floor in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the room or space below the ground floor."
    },
    {
      "id": "K47",
      "type": "answer_key",
      "text": "Choice 2, basement, is the only correct answer for home-and-rooms-047.",
      "itemId": "home-and-rooms-047",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C48",
      "type": "usage_rule",
      "text": "porch is the correct English word for a covered area at the entrance of a house in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a covered area at the entrance of a house."
    },
    {
      "id": "K48",
      "type": "answer_key",
      "text": "Choice 3, porch, is the only correct answer for home-and-rooms-048.",
      "itemId": "home-and-rooms-048",
      "answerIndex": 3,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C49",
      "type": "usage_rule",
      "text": "garden is the correct English word for the outside area with plants near a home in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the outside area with plants near a home."
    },
    {
      "id": "K49",
      "type": "answer_key",
      "text": "Choice 0, garden, is the only correct answer for home-and-rooms-049.",
      "itemId": "home-and-rooms-049",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C50",
      "type": "usage_rule",
      "text": "fence is the correct English word for a barrier around a garden or home area in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a barrier around a garden or home area."
    },
    {
      "id": "K50",
      "type": "answer_key",
      "text": "Choice 1, fence, is the only correct answer for home-and-rooms-050.",
      "itemId": "home-and-rooms-050",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C51",
      "type": "usage_rule",
      "text": "mailbox is the correct English word for a box where letters are delivered in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a box where letters are delivered."
    },
    {
      "id": "K51",
      "type": "answer_key",
      "text": "Choice 2, mailbox, is the only correct answer for home-and-rooms-051.",
      "itemId": "home-and-rooms-051",
      "answerIndex": 2,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C52",
      "type": "usage_rule",
      "text": "remote control is the correct English word for a small device used to control a TV in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a small device used to control a TV."
    },
    {
      "id": "K52",
      "type": "answer_key",
      "text": "Choice 3, remote control, is the only correct answer for home-and-rooms-052.",
      "itemId": "home-and-rooms-052",
      "answerIndex": 3,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C53",
      "type": "usage_rule",
      "text": "plug is the correct English word for the end of a cable that goes into a socket in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the end of a cable that goes into a socket."
    },
    {
      "id": "K53",
      "type": "answer_key",
      "text": "Choice 0, plug, is the only correct answer for home-and-rooms-053.",
      "itemId": "home-and-rooms-053",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C54",
      "type": "usage_rule",
      "text": "socket is the correct English word for the place in a wall where you plug in a device in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the place in a wall where you plug in a device."
    },
    {
      "id": "K54",
      "type": "answer_key",
      "text": "Choice 1, socket, is the only correct answer for home-and-rooms-054.",
      "itemId": "home-and-rooms-054",
      "answerIndex": 1,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C55",
      "type": "usage_rule",
      "text": "extension cord is the correct English word for a cable that gives more reach for electricity in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a cable that gives more reach for electricity."
    },
    {
      "id": "K55",
      "type": "answer_key",
      "text": "Choice 2, extension cord, is the only correct answer for home-and-rooms-055.",
      "itemId": "home-and-rooms-055",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C56",
      "type": "usage_rule",
      "text": "smoke alarm is the correct English word for a device that warns you about smoke in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a device that warns you about smoke."
    },
    {
      "id": "K56",
      "type": "answer_key",
      "text": "Choice 3, smoke alarm, is the only correct answer for home-and-rooms-056.",
      "itemId": "home-and-rooms-056",
      "answerIndex": 3,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C57",
      "type": "usage_rule",
      "text": "thermostat is the correct English word for a control for heating or cooling a room in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a control for heating or cooling a room."
    },
    {
      "id": "K57",
      "type": "answer_key",
      "text": "Choice 0, thermostat, is the only correct answer for home-and-rooms-057.",
      "itemId": "home-and-rooms-057",
      "answerIndex": 0,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C58",
      "type": "usage_rule",
      "text": "toilet is the correct English word for the bathroom fixture people use as a toilet in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the bathroom fixture people use as a toilet."
    },
    {
      "id": "K58",
      "type": "answer_key",
      "text": "Choice 1, toilet, is the only correct answer for home-and-rooms-058.",
      "itemId": "home-and-rooms-058",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C59",
      "type": "usage_rule",
      "text": "toilet paper is the correct English word for paper used in the bathroom near the toilet in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match paper used in the bathroom near the toilet."
    },
    {
      "id": "K59",
      "type": "answer_key",
      "text": "Choice 2, toilet paper, is the only correct answer for home-and-rooms-059.",
      "itemId": "home-and-rooms-059",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C60",
      "type": "usage_rule",
      "text": "toilet brush is the correct English word for a brush used for cleaning a toilet in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a brush used for cleaning a toilet."
    },
    {
      "id": "K60",
      "type": "answer_key",
      "text": "Choice 3, toilet brush, is the only correct answer for home-and-rooms-060.",
      "itemId": "home-and-rooms-060",
      "answerIndex": 3,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C61",
      "type": "usage_rule",
      "text": "bathrobe is the correct English word for a loose robe worn after a bath or shower in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a loose robe worn after a bath or shower."
    },
    {
      "id": "K61",
      "type": "answer_key",
      "text": "Choice 0, bathrobe, is the only correct answer for home-and-rooms-061.",
      "itemId": "home-and-rooms-061",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C62",
      "type": "usage_rule",
      "text": "laundry room is the correct English word for a room for washing clothes in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a room for washing clothes."
    },
    {
      "id": "K62",
      "type": "answer_key",
      "text": "Choice 1, laundry room, is the only correct answer for home-and-rooms-062.",
      "itemId": "home-and-rooms-062",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C63",
      "type": "usage_rule",
      "text": "storage room is the correct English word for a room for keeping things you do not use every day in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a room for keeping things you do not use every day."
    },
    {
      "id": "K63",
      "type": "answer_key",
      "text": "Choice 2, storage room, is the only correct answer for home-and-rooms-063.",
      "itemId": "home-and-rooms-063",
      "answerIndex": 2,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C64",
      "type": "usage_rule",
      "text": "ceiling is the correct English word for the top inside surface of a room in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the top inside surface of a room."
    },
    {
      "id": "K64",
      "type": "answer_key",
      "text": "Choice 3, ceiling, is the only correct answer for home-and-rooms-064.",
      "itemId": "home-and-rooms-064",
      "answerIndex": 3,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C65",
      "type": "usage_rule",
      "text": "alarm clock is the correct English word for a clock that wakes you up in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a clock that wakes you up."
    },
    {
      "id": "K65",
      "type": "answer_key",
      "text": "Choice 0, alarm clock, is the only correct answer for home-and-rooms-065.",
      "itemId": "home-and-rooms-065",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C66",
      "type": "usage_rule",
      "text": "drawer is the correct English word for a box-shaped part of furniture that slides out in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a box-shaped part of furniture that slides out."
    },
    {
      "id": "K66",
      "type": "answer_key",
      "text": "Choice 1, drawer, is the only correct answer for home-and-rooms-066.",
      "itemId": "home-and-rooms-066",
      "answerIndex": 1,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C67",
      "type": "usage_rule",
      "text": "laundry basket is the correct English word for a basket for dirty or clean clothes in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a basket for dirty or clean clothes."
    },
    {
      "id": "K67",
      "type": "answer_key",
      "text": "Choice 2, laundry basket, is the only correct answer for home-and-rooms-067.",
      "itemId": "home-and-rooms-067",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C68",
      "type": "usage_rule",
      "text": "hanger is the correct English word for an object for hanging clothes in a closet in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match an object for hanging clothes in a closet."
    },
    {
      "id": "K68",
      "type": "answer_key",
      "text": "Choice 3, hanger, is the only correct answer for home-and-rooms-068.",
      "itemId": "home-and-rooms-068",
      "answerIndex": 3,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C69",
      "type": "usage_rule",
      "text": "closet is the correct English word for a small storage space for clothes or household items in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a small storage space for clothes or household items."
    },
    {
      "id": "K69",
      "type": "answer_key",
      "text": "Choice 0, closet, is the only correct answer for home-and-rooms-069.",
      "itemId": "home-and-rooms-069",
      "answerIndex": 0,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C70",
      "type": "usage_rule",
      "text": "shoe rack is the correct English word for a small shelf or stand for shoes in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a small shelf or stand for shoes."
    },
    {
      "id": "K70",
      "type": "answer_key",
      "text": "Choice 1, shoe rack, is the only correct answer for home-and-rooms-070.",
      "itemId": "home-and-rooms-070",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C71",
      "type": "usage_rule",
      "text": "washing machine is the correct English word for a machine that washes clothes in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a machine that washes clothes."
    },
    {
      "id": "K71",
      "type": "answer_key",
      "text": "Choice 2, washing machine, is the only correct answer for home-and-rooms-071.",
      "itemId": "home-and-rooms-071",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C72",
      "type": "usage_rule",
      "text": "dryer is the correct English word for a machine that dries clothes in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a machine that dries clothes."
    },
    {
      "id": "K72",
      "type": "answer_key",
      "text": "Choice 3, dryer, is the only correct answer for home-and-rooms-072.",
      "itemId": "home-and-rooms-072",
      "answerIndex": 3,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C73",
      "type": "usage_rule",
      "text": "iron is the correct English word for a hot tool used to smooth clothes in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a hot tool used to smooth clothes."
    },
    {
      "id": "K73",
      "type": "answer_key",
      "text": "Choice 0, iron, is the only correct answer for home-and-rooms-073.",
      "itemId": "home-and-rooms-073",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C74",
      "type": "usage_rule",
      "text": "ironing board is the correct English word for a narrow board used when ironing clothes in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a narrow board used when ironing clothes."
    },
    {
      "id": "K74",
      "type": "answer_key",
      "text": "Choice 1, ironing board, is the only correct answer for home-and-rooms-074.",
      "itemId": "home-and-rooms-074",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C75",
      "type": "usage_rule",
      "text": "clothesline is the correct English word for a line where clothes hang to dry in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a line where clothes hang to dry."
    },
    {
      "id": "K75",
      "type": "answer_key",
      "text": "Choice 2, clothesline, is the only correct answer for home-and-rooms-075.",
      "itemId": "home-and-rooms-075",
      "answerIndex": 2,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C76",
      "type": "usage_rule",
      "text": "coat rack is the correct English word for a stand or rail for coats in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a stand or rail for coats."
    },
    {
      "id": "K76",
      "type": "answer_key",
      "text": "Choice 3, coat rack, is the only correct answer for home-and-rooms-076.",
      "itemId": "home-and-rooms-076",
      "answerIndex": 3,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C77",
      "type": "usage_rule",
      "text": "doormat is the correct English word for a mat outside or inside a door for wiping shoes in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a mat outside or inside a door for wiping shoes."
    },
    {
      "id": "K77",
      "type": "answer_key",
      "text": "Choice 0, doormat, is the only correct answer for home-and-rooms-077.",
      "itemId": "home-and-rooms-077",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C78",
      "type": "usage_rule",
      "text": "key hook is the correct English word for a small hook where keys are kept in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a small hook where keys are kept."
    },
    {
      "id": "K78",
      "type": "answer_key",
      "text": "Choice 1, key hook, is the only correct answer for home-and-rooms-078.",
      "itemId": "home-and-rooms-078",
      "answerIndex": 1,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C79",
      "type": "usage_rule",
      "text": "peephole is the correct English word for a small hole in a door for seeing who is outside in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a small hole in a door for seeing who is outside."
    },
    {
      "id": "K79",
      "type": "answer_key",
      "text": "Choice 2, peephole, is the only correct answer for home-and-rooms-079.",
      "itemId": "home-and-rooms-079",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C80",
      "type": "usage_rule",
      "text": "doorbell is the correct English word for a button or device people use to announce they are at the door in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a button or device people use to announce they are at the door."
    },
    {
      "id": "K80",
      "type": "answer_key",
      "text": "Choice 3, doorbell, is the only correct answer for home-and-rooms-080.",
      "itemId": "home-and-rooms-080",
      "answerIndex": 3,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C81",
      "type": "usage_rule",
      "text": "door handle is the correct English word for the part of a door you hold to open it in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the part of a door you hold to open it."
    },
    {
      "id": "K81",
      "type": "answer_key",
      "text": "Choice 0, door handle, is the only correct answer for home-and-rooms-081.",
      "itemId": "home-and-rooms-081",
      "answerIndex": 0,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C82",
      "type": "usage_rule",
      "text": "lock is the correct English word for the part that keeps a door closed and secure in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the part that keeps a door closed and secure."
    },
    {
      "id": "K82",
      "type": "answer_key",
      "text": "Choice 1, lock, is the only correct answer for home-and-rooms-082.",
      "itemId": "home-and-rooms-082",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C83",
      "type": "usage_rule",
      "text": "towel is the correct English word for a cloth used for drying your hands or body in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a cloth used for drying your hands or body."
    },
    {
      "id": "K83",
      "type": "answer_key",
      "text": "Choice 2, towel, is the only correct answer for home-and-rooms-083.",
      "itemId": "home-and-rooms-083",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C84",
      "type": "usage_rule",
      "text": "tap is the correct English word for the part where water comes out in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the part where water comes out."
    },
    {
      "id": "K84",
      "type": "answer_key",
      "text": "Choice 3, tap, is the only correct answer for home-and-rooms-084.",
      "itemId": "home-and-rooms-084",
      "answerIndex": 3,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C85",
      "type": "usage_rule",
      "text": "drain is the correct English word for the hole where water goes away in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the hole where water goes away."
    },
    {
      "id": "K85",
      "type": "answer_key",
      "text": "Choice 0, drain, is the only correct answer for home-and-rooms-085.",
      "itemId": "home-and-rooms-085",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C86",
      "type": "usage_rule",
      "text": "shower is the correct English word for a place or device for washing while standing in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a place or device for washing while standing."
    },
    {
      "id": "K86",
      "type": "answer_key",
      "text": "Choice 1, shower, is the only correct answer for home-and-rooms-086.",
      "itemId": "home-and-rooms-086",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C87",
      "type": "usage_rule",
      "text": "bathtub is the correct English word for a large tub where you can sit and wash in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a large tub where you can sit and wash."
    },
    {
      "id": "K87",
      "type": "answer_key",
      "text": "Choice 2, bathtub, is the only correct answer for home-and-rooms-087.",
      "itemId": "home-and-rooms-087",
      "answerIndex": 2,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C88",
      "type": "usage_rule",
      "text": "toothbrush is the correct English word for a small brush for cleaning teeth in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a small brush for cleaning teeth."
    },
    {
      "id": "K88",
      "type": "answer_key",
      "text": "Choice 3, toothbrush, is the only correct answer for home-and-rooms-088.",
      "itemId": "home-and-rooms-088",
      "answerIndex": 3,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C89",
      "type": "usage_rule",
      "text": "toothpaste is the correct English word for the paste used with a toothbrush in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match the paste used with a toothbrush."
    },
    {
      "id": "K89",
      "type": "answer_key",
      "text": "Choice 0, toothpaste, is the only correct answer for home-and-rooms-089.",
      "itemId": "home-and-rooms-089",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C90",
      "type": "usage_rule",
      "text": "comb is the correct English word for an object used to tidy hair in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match an object used to tidy hair."
    },
    {
      "id": "K90",
      "type": "answer_key",
      "text": "Choice 1, comb, is the only correct answer for home-and-rooms-090.",
      "itemId": "home-and-rooms-090",
      "answerIndex": 1,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C91",
      "type": "usage_rule",
      "text": "hair dryer is the correct English word for a device that blows warm air to dry hair in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a device that blows warm air to dry hair."
    },
    {
      "id": "K91",
      "type": "answer_key",
      "text": "Choice 2, hair dryer, is the only correct answer for home-and-rooms-091.",
      "itemId": "home-and-rooms-091",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C92",
      "type": "usage_rule",
      "text": "vacuum cleaner is the correct English word for a machine used to clean floors by sucking up dust in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a machine used to clean floors by sucking up dust."
    },
    {
      "id": "K92",
      "type": "answer_key",
      "text": "Choice 3, vacuum cleaner, is the only correct answer for home-and-rooms-092.",
      "itemId": "home-and-rooms-092",
      "answerIndex": 3,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C93",
      "type": "usage_rule",
      "text": "broom is the correct English word for a tool used to sweep the floor in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a tool used to sweep the floor."
    },
    {
      "id": "K93",
      "type": "answer_key",
      "text": "Choice 0, broom, is the only correct answer for home-and-rooms-093.",
      "itemId": "home-and-rooms-093",
      "answerIndex": 0,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C94",
      "type": "usage_rule",
      "text": "mop is the correct English word for a tool used to wash the floor in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a tool used to wash the floor."
    },
    {
      "id": "K94",
      "type": "answer_key",
      "text": "Choice 1, mop, is the only correct answer for home-and-rooms-094.",
      "itemId": "home-and-rooms-094",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C95",
      "type": "usage_rule",
      "text": "trash can is the correct English word for a container for rubbish in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a container for rubbish."
    },
    {
      "id": "K95",
      "type": "answer_key",
      "text": "Choice 2, trash can, is the only correct answer for home-and-rooms-095.",
      "itemId": "home-and-rooms-095",
      "answerIndex": 2,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C96",
      "type": "usage_rule",
      "text": "cloth is the correct English word for a piece of fabric used for cleaning or wiping in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a piece of fabric used for cleaning or wiping."
    },
    {
      "id": "K96",
      "type": "answer_key",
      "text": "Choice 3, cloth, is the only correct answer for home-and-rooms-096.",
      "itemId": "home-and-rooms-096",
      "answerIndex": 3,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C97",
      "type": "usage_rule",
      "text": "bathroom cabinet is the correct English word for a cabinet in the bathroom for toiletries or small items in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a cabinet in the bathroom for toiletries or small items."
    },
    {
      "id": "K97",
      "type": "answer_key",
      "text": "Choice 0, bathroom cabinet, is the only correct answer for home-and-rooms-097.",
      "itemId": "home-and-rooms-097",
      "answerIndex": 0,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C98",
      "type": "usage_rule",
      "text": "medicine cabinet is the correct English word for a bathroom or wall cabinet for medicines in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a bathroom or wall cabinet for medicines."
    },
    {
      "id": "K98",
      "type": "answer_key",
      "text": "Choice 1, medicine cabinet, is the only correct answer for home-and-rooms-098.",
      "itemId": "home-and-rooms-098",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C99",
      "type": "usage_rule",
      "text": "shower curtain is the correct English word for a curtain that keeps water inside the shower area in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a curtain that keeps water inside the shower area."
    },
    {
      "id": "K99",
      "type": "answer_key",
      "text": "Choice 2, shower curtain, is the only correct answer for home-and-rooms-099.",
      "itemId": "home-and-rooms-099",
      "answerIndex": 2,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
    },
    {
      "id": "C100",
      "type": "usage_rule",
      "text": "bath mat is the correct English word for a mat on the bathroom floor in a basic home-and-rooms vocabulary context.",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited learner vocabulary sources support the home vocabulary scope; the distractors are same-domain words but do not match a mat on the bathroom floor."
    },
    {
      "id": "K100",
      "type": "answer_key",
      "text": "Choice 3, bath mat, is the only correct answer for home-and-rooms-100.",
      "itemId": "home-and-rooms-100",
      "answerIndex": 3,
      "sourceIds": [
        "S1",
        "S2"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key follows the tested meaning, while the other choices name different rooms, objects, fixtures, storage items, or cleaning tools."
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
      "prompt": "Choose the English word for: a room where you sleep.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «комната, где спят».",
        "uk": "Яке англійське слово або фраза означає «a room where you sleep»?",
        "es": "¿Qué palabra o expresión inglesa significa «a room where you sleep»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a room where you sleep”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a room where you sleep”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a room where you sleep”?",
        "tr": "“a room where you sleep” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a room where you sleep”?"
      },
      "choices": [
        "bedroom",
        "bathroom",
        "kitchen",
        "living room"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose bedroom for the home-and-rooms meaning: a room where you sleep.",
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
        "bedroom is the only option that matches the tested meaning: a room where you sleep.",
        "bathroom is a plausible home-and-rooms distractor, but it does not mean: a room where you sleep.",
        "kitchen is a plausible home-and-rooms distractor, but it does not mean: a room where you sleep.",
        "living room is a plausible home-and-rooms distractor, but it does not mean: a room where you sleep."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: bedroom — комната, где спят. Это ровно то, что описано в задании.",
          "bathroom означает «комната, где моются или пользуются туалетом». Здесь спрашивают «комната, где спят»; ответ bedroom.",
          "Не kitchen: это «комната, где готовят еду». В этом вопросе правильный вариант — bedroom.",
          "living room — «комната, где отдыхают или смотрят телевизор», а в вопросе нужно «комната, где спят». Поэтому выбираем bedroom."
        ],
        "uk": [
          "Так: bedroom означає «a room where you sleep». Тримай у голові просту домашню картинку.",
          "bathroom теж із теми дому, але не означає «a room where you sleep». Тут правильна відповідь bedroom.",
          "kitchen теж із теми дому, але не означає «a room where you sleep». Тут правильна відповідь bedroom.",
          "living room теж із теми дому, але не означає «a room where you sleep». Тут правильна відповідь bedroom."
        ],
        "es": [
          "Sí: bedroom significa «a room where you sleep». La imagen de casa ayuda a recordarlo.",
          "bathroom también suena a casa, pero no significa «a room where you sleep». La respuesta correcta es bedroom.",
          "kitchen también suena a casa, pero no significa «a room where you sleep». La respuesta correcta es bedroom.",
          "living room también suena a casa, pero no significa «a room where you sleep». La respuesta correcta es bedroom."
        ],
        "pt-BR": [
          "Isso: bedroom significa “a room where you sleep”. Ligue a palavra a uma cena simples da casa.",
          "bathroom também é do tema casa, mas não significa “a room where you sleep”. A resposta certa é bedroom.",
          "kitchen também é do tema casa, mas não significa “a room where you sleep”. A resposta certa é bedroom.",
          "living room também é do tema casa, mas não significa “a room where you sleep”. A resposta certa é bedroom."
        ],
        "vi": [
          "bedroom nghĩa là “a room where you sleep”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "bathroom cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room where you sleep”. Đáp án đúng là bedroom.",
          "kitchen cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room where you sleep”. Đáp án đúng là bedroom.",
          "living room cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room where you sleep”. Đáp án đúng là bedroom."
        ],
        "id": [
          "bedroom berarti “a room where you sleep”. Bayangkan benda atau ruang itu di rumah.",
          "bathroom masih bertema rumah, tetapi bukan “a room where you sleep”. Jawaban yang tepat adalah bedroom.",
          "kitchen masih bertema rumah, tetapi bukan “a room where you sleep”. Jawaban yang tepat adalah bedroom.",
          "living room masih bertema rumah, tetapi bukan “a room where you sleep”. Jawaban yang tepat adalah bedroom."
        ],
        "tr": [
          "Evet: bedroom, “a room where you sleep” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "bathroom ev temasıyla ilgili olabilir, ama “a room where you sleep” anlamına gelmez. Doğru cevap bedroom.",
          "kitchen ev temasıyla ilgili olabilir, ama “a room where you sleep” anlamına gelmez. Doğru cevap bedroom.",
          "living room ev temasıyla ilgili olabilir, ama “a room where you sleep” anlamına gelmez. Doğru cevap bedroom."
        ],
        "pl": [
          "Tak: bedroom znaczy „a room where you sleep”. Połącz słowo z prostym obrazem w domu.",
          "bathroom też pasuje do tematu domu, ale nie znaczy „a room where you sleep”. Poprawna odpowiedź to bedroom.",
          "kitchen też pasuje do tematu domu, ale nie znaczy „a room where you sleep”. Poprawna odpowiedź to bedroom.",
          "living room też pasuje do tematu domu, ale nie znaczy „a room where you sleep”. Poprawna odpowiedź to bedroom."
        ]
      }
    },
    {
      "id": "home-and-rooms-002",
      "type": "mcq",
      "prompt": "Choose the English word for: a room where you wash or use the toilet.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «комната, где моются или пользуются туалетом».",
        "uk": "Яке англійське слово або фраза означає «a room where you wash or use the toilet»?",
        "es": "¿Qué palabra o expresión inglesa significa «a room where you wash or use the toilet»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a room where you wash or use the toilet”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a room where you wash or use the toilet”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a room where you wash or use the toilet”?",
        "tr": "“a room where you wash or use the toilet” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a room where you wash or use the toilet”?"
      },
      "choices": [
        "bedroom",
        "bathroom",
        "balcony",
        "garage"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose bathroom for the home-and-rooms meaning: a room where you wash or use the toilet.",
      "skillTag": "home_room_name",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C2",
        "K2"
      ],
      "choiceRationales": [
        "bedroom is a plausible home-and-rooms distractor, but it does not mean: a room where you wash or use the toilet.",
        "bathroom is the only option that matches the tested meaning: a room where you wash or use the toilet.",
        "balcony is a plausible home-and-rooms distractor, but it does not mean: a room where you wash or use the toilet.",
        "garage is a plausible home-and-rooms distractor, but it does not mean: a room where you wash or use the toilet."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "bedroom — комната, где спят. Это не про «комната, где моются или пользуются туалетом»; выбираем bathroom.",
          "Да: bathroom — комната, где моются или пользуются туалетом. Это ровно то, что описано в задании.",
          "Не balcony: это «небольшая открытая площадка на верхнем этаже». В этом вопросе правильный вариант — bathroom.",
          "garage — «место в доме для машины», а в вопросе нужно «комната, где моются или пользуются туалетом». Поэтому выбираем bathroom."
        ],
        "uk": [
          "bedroom теж із теми дому, але не означає «a room where you wash or use the toilet». Тут правильна відповідь bathroom.",
          "Так: bathroom означає «a room where you wash or use the toilet». Тримай у голові просту домашню картинку.",
          "balcony теж із теми дому, але не означає «a room where you wash or use the toilet». Тут правильна відповідь bathroom.",
          "garage теж із теми дому, але не означає «a room where you wash or use the toilet». Тут правильна відповідь bathroom."
        ],
        "es": [
          "bedroom también suena a casa, pero no significa «a room where you wash or use the toilet». La respuesta correcta es bathroom.",
          "Sí: bathroom significa «a room where you wash or use the toilet». La imagen de casa ayuda a recordarlo.",
          "balcony también suena a casa, pero no significa «a room where you wash or use the toilet». La respuesta correcta es bathroom.",
          "garage también suena a casa, pero no significa «a room where you wash or use the toilet». La respuesta correcta es bathroom."
        ],
        "pt-BR": [
          "bedroom também é do tema casa, mas não significa “a room where you wash or use the toilet”. A resposta certa é bathroom.",
          "Isso: bathroom significa “a room where you wash or use the toilet”. Ligue a palavra a uma cena simples da casa.",
          "balcony também é do tema casa, mas não significa “a room where you wash or use the toilet”. A resposta certa é bathroom.",
          "garage também é do tema casa, mas não significa “a room where you wash or use the toilet”. A resposta certa é bathroom."
        ],
        "vi": [
          "bedroom cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room where you wash or use the toilet”. Đáp án đúng là bathroom.",
          "bathroom nghĩa là “a room where you wash or use the toilet”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "balcony cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room where you wash or use the toilet”. Đáp án đúng là bathroom.",
          "garage cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room where you wash or use the toilet”. Đáp án đúng là bathroom."
        ],
        "id": [
          "bedroom masih bertema rumah, tetapi bukan “a room where you wash or use the toilet”. Jawaban yang tepat adalah bathroom.",
          "bathroom berarti “a room where you wash or use the toilet”. Bayangkan benda atau ruang itu di rumah.",
          "balcony masih bertema rumah, tetapi bukan “a room where you wash or use the toilet”. Jawaban yang tepat adalah bathroom.",
          "garage masih bertema rumah, tetapi bukan “a room where you wash or use the toilet”. Jawaban yang tepat adalah bathroom."
        ],
        "tr": [
          "bedroom ev temasıyla ilgili olabilir, ama “a room where you wash or use the toilet” anlamına gelmez. Doğru cevap bathroom.",
          "Evet: bathroom, “a room where you wash or use the toilet” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "balcony ev temasıyla ilgili olabilir, ama “a room where you wash or use the toilet” anlamına gelmez. Doğru cevap bathroom.",
          "garage ev temasıyla ilgili olabilir, ama “a room where you wash or use the toilet” anlamına gelmez. Doğru cevap bathroom."
        ],
        "pl": [
          "bedroom też pasuje do tematu domu, ale nie znaczy „a room where you wash or use the toilet”. Poprawna odpowiedź to bathroom.",
          "Tak: bathroom znaczy „a room where you wash or use the toilet”. Połącz słowo z prostym obrazem w domu.",
          "balcony też pasuje do tematu domu, ale nie znaczy „a room where you wash or use the toilet”. Poprawna odpowiedź to bathroom.",
          "garage też pasuje do tematu domu, ale nie znaczy „a room where you wash or use the toilet”. Poprawna odpowiedź to bathroom."
        ]
      }
    },
    {
      "id": "home-and-rooms-003",
      "type": "mcq",
      "prompt": "Choose the English word for: a room where people relax or watch TV.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «комната, где отдыхают или смотрят телевизор».",
        "uk": "Яке англійське слово або фраза означає «a room where people relax or watch TV»?",
        "es": "¿Qué palabra o expresión inglesa significa «a room where people relax or watch TV»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a room where people relax or watch TV”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a room where people relax or watch TV”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a room where people relax or watch TV”?",
        "tr": "“a room where people relax or watch TV” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a room where people relax or watch TV”?"
      },
      "choices": [
        "laundry room",
        "bathroom",
        "living room",
        "hallway"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose living room for the home-and-rooms meaning: a room where people relax or watch TV.",
      "skillTag": "home_room_name",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C3",
        "K3"
      ],
      "choiceRationales": [
        "laundry room is a plausible home-and-rooms distractor, but it does not mean: a room where people relax or watch TV.",
        "bathroom is a plausible home-and-rooms distractor, but it does not mean: a room where people relax or watch TV.",
        "living room is the only option that matches the tested meaning: a room where people relax or watch TV.",
        "hallway is a plausible home-and-rooms distractor, but it does not mean: a room where people relax or watch TV."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "laundry room — комната для стирки одежды. Это не про «комната, где отдыхают или смотрят телевизор»; выбираем living room.",
          "bathroom означает «комната, где моются или пользуются туалетом». Здесь спрашивают «комната, где отдыхают или смотрят телевизор»; ответ living room.",
          "Да: living room — комната, где отдыхают или смотрят телевизор. Это ровно то, что описано в задании.",
          "hallway — «узкий проход между комнатами», а в вопросе нужно «комната, где отдыхают или смотрят телевизор». Поэтому выбираем living room."
        ],
        "uk": [
          "laundry room теж із теми дому, але не означає «a room where people relax or watch TV». Тут правильна відповідь living room.",
          "bathroom теж із теми дому, але не означає «a room where people relax or watch TV». Тут правильна відповідь living room.",
          "Так: living room означає «a room where people relax or watch TV». Тримай у голові просту домашню картинку.",
          "hallway теж із теми дому, але не означає «a room where people relax or watch TV». Тут правильна відповідь living room."
        ],
        "es": [
          "laundry room también suena a casa, pero no significa «a room where people relax or watch TV». La respuesta correcta es living room.",
          "bathroom también suena a casa, pero no significa «a room where people relax or watch TV». La respuesta correcta es living room.",
          "Sí: living room significa «a room where people relax or watch TV». La imagen de casa ayuda a recordarlo.",
          "hallway también suena a casa, pero no significa «a room where people relax or watch TV». La respuesta correcta es living room."
        ],
        "pt-BR": [
          "laundry room também é do tema casa, mas não significa “a room where people relax or watch TV”. A resposta certa é living room.",
          "bathroom também é do tema casa, mas não significa “a room where people relax or watch TV”. A resposta certa é living room.",
          "Isso: living room significa “a room where people relax or watch TV”. Ligue a palavra a uma cena simples da casa.",
          "hallway também é do tema casa, mas não significa “a room where people relax or watch TV”. A resposta certa é living room."
        ],
        "vi": [
          "laundry room cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room where people relax or watch TV”. Đáp án đúng là living room.",
          "bathroom cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room where people relax or watch TV”. Đáp án đúng là living room.",
          "living room nghĩa là “a room where people relax or watch TV”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "hallway cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room where people relax or watch TV”. Đáp án đúng là living room."
        ],
        "id": [
          "laundry room masih bertema rumah, tetapi bukan “a room where people relax or watch TV”. Jawaban yang tepat adalah living room.",
          "bathroom masih bertema rumah, tetapi bukan “a room where people relax or watch TV”. Jawaban yang tepat adalah living room.",
          "living room berarti “a room where people relax or watch TV”. Bayangkan benda atau ruang itu di rumah.",
          "hallway masih bertema rumah, tetapi bukan “a room where people relax or watch TV”. Jawaban yang tepat adalah living room."
        ],
        "tr": [
          "laundry room ev temasıyla ilgili olabilir, ama “a room where people relax or watch TV” anlamına gelmez. Doğru cevap living room.",
          "bathroom ev temasıyla ilgili olabilir, ama “a room where people relax or watch TV” anlamına gelmez. Doğru cevap living room.",
          "Evet: living room, “a room where people relax or watch TV” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "hallway ev temasıyla ilgili olabilir, ama “a room where people relax or watch TV” anlamına gelmez. Doğru cevap living room."
        ],
        "pl": [
          "laundry room też pasuje do tematu domu, ale nie znaczy „a room where people relax or watch TV”. Poprawna odpowiedź to living room.",
          "bathroom też pasuje do tematu domu, ale nie znaczy „a room where people relax or watch TV”. Poprawna odpowiedź to living room.",
          "Tak: living room znaczy „a room where people relax or watch TV”. Połącz słowo z prostym obrazem w domu.",
          "hallway też pasuje do tematu domu, ale nie znaczy „a room where people relax or watch TV”. Poprawna odpowiedź to living room."
        ]
      }
    },
    {
      "id": "home-and-rooms-004",
      "type": "mcq",
      "prompt": "Choose the English word for: the furniture you sleep on.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «мебель, на которой спят».",
        "uk": "Яке англійське слово або фраза означає «the furniture you sleep on»?",
        "es": "¿Qué palabra o expresión inglesa significa «the furniture you sleep on»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the furniture you sleep on”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the furniture you sleep on”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the furniture you sleep on”?",
        "tr": "“the furniture you sleep on” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the furniture you sleep on”?"
      },
      "choices": [
        "chair",
        "desk",
        "shelf",
        "bed"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose bed for the home-and-rooms meaning: the furniture you sleep on.",
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
        "chair is a plausible home-and-rooms distractor, but it does not mean: the furniture you sleep on.",
        "desk is a plausible home-and-rooms distractor, but it does not mean: the furniture you sleep on.",
        "shelf is a plausible home-and-rooms distractor, but it does not mean: the furniture you sleep on.",
        "bed is the only option that matches the tested meaning: the furniture you sleep on."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "chair — сиденье для одного человека. Это не про «мебель, на которой спят»; выбираем bed.",
          "desk означает «стол для учебы или работы». Здесь спрашивают «мебель, на которой спят»; ответ bed.",
          "Не shelf: это «плоская доска для хранения вещей на стене или в шкафу». В этом вопросе правильный вариант — bed.",
          "Да: bed — мебель, на которой спят. Это ровно то, что описано в задании."
        ],
        "uk": [
          "chair теж із теми дому, але не означає «the furniture you sleep on». Тут правильна відповідь bed.",
          "desk теж із теми дому, але не означає «the furniture you sleep on». Тут правильна відповідь bed.",
          "shelf теж із теми дому, але не означає «the furniture you sleep on». Тут правильна відповідь bed.",
          "Так: bed означає «the furniture you sleep on». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "chair también suena a casa, pero no significa «the furniture you sleep on». La respuesta correcta es bed.",
          "desk también suena a casa, pero no significa «the furniture you sleep on». La respuesta correcta es bed.",
          "shelf también suena a casa, pero no significa «the furniture you sleep on». La respuesta correcta es bed.",
          "Sí: bed significa «the furniture you sleep on». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "chair também é do tema casa, mas não significa “the furniture you sleep on”. A resposta certa é bed.",
          "desk também é do tema casa, mas não significa “the furniture you sleep on”. A resposta certa é bed.",
          "shelf também é do tema casa, mas não significa “the furniture you sleep on”. A resposta certa é bed.",
          "Isso: bed significa “the furniture you sleep on”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "chair cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the furniture you sleep on”. Đáp án đúng là bed.",
          "desk cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the furniture you sleep on”. Đáp án đúng là bed.",
          "shelf cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the furniture you sleep on”. Đáp án đúng là bed.",
          "bed nghĩa là “the furniture you sleep on”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "chair masih bertema rumah, tetapi bukan “the furniture you sleep on”. Jawaban yang tepat adalah bed.",
          "desk masih bertema rumah, tetapi bukan “the furniture you sleep on”. Jawaban yang tepat adalah bed.",
          "shelf masih bertema rumah, tetapi bukan “the furniture you sleep on”. Jawaban yang tepat adalah bed.",
          "bed berarti “the furniture you sleep on”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "chair ev temasıyla ilgili olabilir, ama “the furniture you sleep on” anlamına gelmez. Doğru cevap bed.",
          "desk ev temasıyla ilgili olabilir, ama “the furniture you sleep on” anlamına gelmez. Doğru cevap bed.",
          "shelf ev temasıyla ilgili olabilir, ama “the furniture you sleep on” anlamına gelmez. Doğru cevap bed.",
          "Evet: bed, “the furniture you sleep on” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "chair też pasuje do tematu domu, ale nie znaczy „the furniture you sleep on”. Poprawna odpowiedź to bed.",
          "desk też pasuje do tematu domu, ale nie znaczy „the furniture you sleep on”. Poprawna odpowiedź to bed.",
          "shelf też pasuje do tematu domu, ale nie znaczy „the furniture you sleep on”. Poprawna odpowiedź to bed.",
          "Tak: bed znaczy „the furniture you sleep on”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-005",
      "type": "mcq",
      "prompt": "Choose the English word for: a seat for one person.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «сиденье для одного человека».",
        "uk": "Яке англійське слово або фраза означає «a seat for one person»?",
        "es": "¿Qué palabra o expresión inglesa significa «a seat for one person»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a seat for one person”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a seat for one person”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a seat for one person”?",
        "tr": "“a seat for one person” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a seat for one person”?"
      },
      "choices": [
        "chair",
        "bed",
        "table",
        "cupboard"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose chair for the home-and-rooms meaning: a seat for one person.",
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
        "chair is the only option that matches the tested meaning: a seat for one person.",
        "bed is a plausible home-and-rooms distractor, but it does not mean: a seat for one person.",
        "table is a plausible home-and-rooms distractor, but it does not mean: a seat for one person.",
        "cupboard is a plausible home-and-rooms distractor, but it does not mean: a seat for one person."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: chair — сиденье для одного человека. Это ровно то, что описано в задании.",
          "bed означает «мебель, на которой спят». Здесь спрашивают «сиденье для одного человека»; ответ chair.",
          "Не table: это «мебель с плоской поверхностью для еды или вещей». В этом вопросе правильный вариант — chair.",
          "cupboard — «шкафчик с дверцами для хранения вещей», а в вопросе нужно «сиденье для одного человека». Поэтому выбираем chair."
        ],
        "uk": [
          "Так: chair означає «a seat for one person». Тримай у голові просту домашню картинку.",
          "bed теж із теми дому, але не означає «a seat for one person». Тут правильна відповідь chair.",
          "table теж із теми дому, але не означає «a seat for one person». Тут правильна відповідь chair.",
          "cupboard теж із теми дому, але не означає «a seat for one person». Тут правильна відповідь chair."
        ],
        "es": [
          "Sí: chair significa «a seat for one person». La imagen de casa ayuda a recordarlo.",
          "bed también suena a casa, pero no significa «a seat for one person». La respuesta correcta es chair.",
          "table también suena a casa, pero no significa «a seat for one person». La respuesta correcta es chair.",
          "cupboard también suena a casa, pero no significa «a seat for one person». La respuesta correcta es chair."
        ],
        "pt-BR": [
          "Isso: chair significa “a seat for one person”. Ligue a palavra a uma cena simples da casa.",
          "bed também é do tema casa, mas não significa “a seat for one person”. A resposta certa é chair.",
          "table também é do tema casa, mas não significa “a seat for one person”. A resposta certa é chair.",
          "cupboard também é do tema casa, mas não significa “a seat for one person”. A resposta certa é chair."
        ],
        "vi": [
          "chair nghĩa là “a seat for one person”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "bed cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a seat for one person”. Đáp án đúng là chair.",
          "table cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a seat for one person”. Đáp án đúng là chair.",
          "cupboard cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a seat for one person”. Đáp án đúng là chair."
        ],
        "id": [
          "chair berarti “a seat for one person”. Bayangkan benda atau ruang itu di rumah.",
          "bed masih bertema rumah, tetapi bukan “a seat for one person”. Jawaban yang tepat adalah chair.",
          "table masih bertema rumah, tetapi bukan “a seat for one person”. Jawaban yang tepat adalah chair.",
          "cupboard masih bertema rumah, tetapi bukan “a seat for one person”. Jawaban yang tepat adalah chair."
        ],
        "tr": [
          "Evet: chair, “a seat for one person” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "bed ev temasıyla ilgili olabilir, ama “a seat for one person” anlamına gelmez. Doğru cevap chair.",
          "table ev temasıyla ilgili olabilir, ama “a seat for one person” anlamına gelmez. Doğru cevap chair.",
          "cupboard ev temasıyla ilgili olabilir, ama “a seat for one person” anlamına gelmez. Doğru cevap chair."
        ],
        "pl": [
          "Tak: chair znaczy „a seat for one person”. Połącz słowo z prostym obrazem w domu.",
          "bed też pasuje do tematu domu, ale nie znaczy „a seat for one person”. Poprawna odpowiedź to chair.",
          "table też pasuje do tematu domu, ale nie znaczy „a seat for one person”. Poprawna odpowiedź to chair.",
          "cupboard też pasuje do tematu domu, ale nie znaczy „a seat for one person”. Poprawna odpowiedź to chair."
        ]
      }
    },
    {
      "id": "home-and-rooms-006",
      "type": "mcq",
      "prompt": "Choose the English word for: a table for studying or working.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «стол для учебы или работы».",
        "uk": "Яке англійське слово або фраза означає «a table for studying or working»?",
        "es": "¿Qué palabra o expresión inglesa significa «a table for studying or working»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a table for studying or working”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a table for studying or working”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a table for studying or working”?",
        "tr": "“a table for studying or working” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a table for studying or working”?"
      },
      "choices": [
        "sofa",
        "desk",
        "bathtub",
        "door"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose desk for the home-and-rooms meaning: a table for studying or working.",
      "skillTag": "home_furniture",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C6",
        "K6"
      ],
      "choiceRationales": [
        "sofa is a plausible home-and-rooms distractor, but it does not mean: a table for studying or working.",
        "desk is the only option that matches the tested meaning: a table for studying or working.",
        "bathtub is a plausible home-and-rooms distractor, but it does not mean: a table for studying or working.",
        "door is a plausible home-and-rooms distractor, but it does not mean: a table for studying or working."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "sofa — длинное мягкое сиденье для нескольких человек. Это не про «стол для учебы или работы»; выбираем desk.",
          "Да: desk — стол для учебы или работы. Это ровно то, что описано в задании.",
          "Не bathtub: это «большая ванна, где можно сидеть и мыться». В этом вопросе правильный вариант — desk.",
          "door — «предмет, который открывают, чтобы войти в комнату», а в вопросе нужно «стол для учебы или работы». Поэтому выбираем desk."
        ],
        "uk": [
          "sofa теж із теми дому, але не означає «a table for studying or working». Тут правильна відповідь desk.",
          "Так: desk означає «a table for studying or working». Тримай у голові просту домашню картинку.",
          "bathtub теж із теми дому, але не означає «a table for studying or working». Тут правильна відповідь desk.",
          "door теж із теми дому, але не означає «a table for studying or working». Тут правильна відповідь desk."
        ],
        "es": [
          "sofa también suena a casa, pero no significa «a table for studying or working». La respuesta correcta es desk.",
          "Sí: desk significa «a table for studying or working». La imagen de casa ayuda a recordarlo.",
          "bathtub también suena a casa, pero no significa «a table for studying or working». La respuesta correcta es desk.",
          "door también suena a casa, pero no significa «a table for studying or working». La respuesta correcta es desk."
        ],
        "pt-BR": [
          "sofa também é do tema casa, mas não significa “a table for studying or working”. A resposta certa é desk.",
          "Isso: desk significa “a table for studying or working”. Ligue a palavra a uma cena simples da casa.",
          "bathtub também é do tema casa, mas não significa “a table for studying or working”. A resposta certa é desk.",
          "door também é do tema casa, mas não significa “a table for studying or working”. A resposta certa é desk."
        ],
        "vi": [
          "sofa cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a table for studying or working”. Đáp án đúng là desk.",
          "desk nghĩa là “a table for studying or working”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "bathtub cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a table for studying or working”. Đáp án đúng là desk.",
          "door cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a table for studying or working”. Đáp án đúng là desk."
        ],
        "id": [
          "sofa masih bertema rumah, tetapi bukan “a table for studying or working”. Jawaban yang tepat adalah desk.",
          "desk berarti “a table for studying or working”. Bayangkan benda atau ruang itu di rumah.",
          "bathtub masih bertema rumah, tetapi bukan “a table for studying or working”. Jawaban yang tepat adalah desk.",
          "door masih bertema rumah, tetapi bukan “a table for studying or working”. Jawaban yang tepat adalah desk."
        ],
        "tr": [
          "sofa ev temasıyla ilgili olabilir, ama “a table for studying or working” anlamına gelmez. Doğru cevap desk.",
          "Evet: desk, “a table for studying or working” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "bathtub ev temasıyla ilgili olabilir, ama “a table for studying or working” anlamına gelmez. Doğru cevap desk.",
          "door ev temasıyla ilgili olabilir, ama “a table for studying or working” anlamına gelmez. Doğru cevap desk."
        ],
        "pl": [
          "sofa też pasuje do tematu domu, ale nie znaczy „a table for studying or working”. Poprawna odpowiedź to desk.",
          "Tak: desk znaczy „a table for studying or working”. Połącz słowo z prostym obrazem w domu.",
          "bathtub też pasuje do tematu domu, ale nie znaczy „a table for studying or working”. Poprawna odpowiedź to desk.",
          "door też pasuje do tematu domu, ale nie znaczy „a table for studying or working”. Poprawna odpowiedź to desk."
        ]
      }
    },
    {
      "id": "home-and-rooms-007",
      "type": "mcq",
      "prompt": "Choose the English word for: the thing you open to enter a room.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «предмет, который открывают, чтобы войти в комнату».",
        "uk": "Яке англійське слово або фраза означає «the thing you open to enter a room»?",
        "es": "¿Qué palabra o expresión inglesa significa «the thing you open to enter a room»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the thing you open to enter a room”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the thing you open to enter a room”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the thing you open to enter a room”?",
        "tr": "“the thing you open to enter a room” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the thing you open to enter a room”?"
      },
      "choices": [
        "window",
        "floor",
        "door",
        "wall"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose door for the home-and-rooms meaning: the thing you open to enter a room.",
      "skillTag": "home_parts",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C7",
        "K7"
      ],
      "choiceRationales": [
        "window is a plausible home-and-rooms distractor, but it does not mean: the thing you open to enter a room.",
        "floor is a plausible home-and-rooms distractor, but it does not mean: the thing you open to enter a room.",
        "door is the only option that matches the tested meaning: the thing you open to enter a room.",
        "wall is a plausible home-and-rooms distractor, but it does not mean: the thing you open to enter a room."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "window — стеклянный проем, через который входит свет. Это не про «предмет, который открывают, чтобы войти в комнату»; выбираем door.",
          "floor означает «поверхность, по которой ходят в комнате». Здесь спрашивают «предмет, который открывают, чтобы войти в комнату»; ответ door.",
          "Да: door — предмет, который открывают, чтобы войти в комнату. Это ровно то, что описано в задании.",
          "wall — «вертикальная сторона комнаты», а в вопросе нужно «предмет, который открывают, чтобы войти в комнату». Поэтому выбираем door."
        ],
        "uk": [
          "window теж із теми дому, але не означає «the thing you open to enter a room». Тут правильна відповідь door.",
          "floor теж із теми дому, але не означає «the thing you open to enter a room». Тут правильна відповідь door.",
          "Так: door означає «the thing you open to enter a room». Тримай у голові просту домашню картинку.",
          "wall теж із теми дому, але не означає «the thing you open to enter a room». Тут правильна відповідь door."
        ],
        "es": [
          "window también suena a casa, pero no significa «the thing you open to enter a room». La respuesta correcta es door.",
          "floor también suena a casa, pero no significa «the thing you open to enter a room». La respuesta correcta es door.",
          "Sí: door significa «the thing you open to enter a room». La imagen de casa ayuda a recordarlo.",
          "wall también suena a casa, pero no significa «the thing you open to enter a room». La respuesta correcta es door."
        ],
        "pt-BR": [
          "window também é do tema casa, mas não significa “the thing you open to enter a room”. A resposta certa é door.",
          "floor também é do tema casa, mas não significa “the thing you open to enter a room”. A resposta certa é door.",
          "Isso: door significa “the thing you open to enter a room”. Ligue a palavra a uma cena simples da casa.",
          "wall também é do tema casa, mas não significa “the thing you open to enter a room”. A resposta certa é door."
        ],
        "vi": [
          "window cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the thing you open to enter a room”. Đáp án đúng là door.",
          "floor cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the thing you open to enter a room”. Đáp án đúng là door.",
          "door nghĩa là “the thing you open to enter a room”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "wall cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the thing you open to enter a room”. Đáp án đúng là door."
        ],
        "id": [
          "window masih bertema rumah, tetapi bukan “the thing you open to enter a room”. Jawaban yang tepat adalah door.",
          "floor masih bertema rumah, tetapi bukan “the thing you open to enter a room”. Jawaban yang tepat adalah door.",
          "door berarti “the thing you open to enter a room”. Bayangkan benda atau ruang itu di rumah.",
          "wall masih bertema rumah, tetapi bukan “the thing you open to enter a room”. Jawaban yang tepat adalah door."
        ],
        "tr": [
          "window ev temasıyla ilgili olabilir, ama “the thing you open to enter a room” anlamına gelmez. Doğru cevap door.",
          "floor ev temasıyla ilgili olabilir, ama “the thing you open to enter a room” anlamına gelmez. Doğru cevap door.",
          "Evet: door, “the thing you open to enter a room” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "wall ev temasıyla ilgili olabilir, ama “the thing you open to enter a room” anlamına gelmez. Doğru cevap door."
        ],
        "pl": [
          "window też pasuje do tematu domu, ale nie znaczy „the thing you open to enter a room”. Poprawna odpowiedź to door.",
          "floor też pasuje do tematu domu, ale nie znaczy „the thing you open to enter a room”. Poprawna odpowiedź to door.",
          "Tak: door znaczy „the thing you open to enter a room”. Połącz słowo z prostym obrazem w domu.",
          "wall też pasuje do tematu domu, ale nie znaczy „the thing you open to enter a room”. Poprawna odpowiedź to door."
        ]
      }
    },
    {
      "id": "home-and-rooms-008",
      "type": "mcq",
      "prompt": "Choose the English word for: the glass opening that lets light in.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «стеклянный проем, через который входит свет».",
        "uk": "Яке англійське слово або фраза означає «the glass opening that lets light in»?",
        "es": "¿Qué palabra o expresión inglesa significa «the glass opening that lets light in»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the glass opening that lets light in”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the glass opening that lets light in”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the glass opening that lets light in”?",
        "tr": "“the glass opening that lets light in” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the glass opening that lets light in”?"
      },
      "choices": [
        "door",
        "drawer",
        "shelf",
        "window"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose window for the home-and-rooms meaning: the glass opening that lets light in.",
      "skillTag": "home_parts",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C8",
        "K8"
      ],
      "choiceRationales": [
        "door is a plausible home-and-rooms distractor, but it does not mean: the glass opening that lets light in.",
        "drawer is a plausible home-and-rooms distractor, but it does not mean: the glass opening that lets light in.",
        "shelf is a plausible home-and-rooms distractor, but it does not mean: the glass opening that lets light in.",
        "window is the only option that matches the tested meaning: the glass opening that lets light in."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "door — предмет, который открывают, чтобы войти в комнату. Это не про «стеклянный проем, через который входит свет»; выбираем window.",
          "drawer означает «выдвижная часть мебели в форме коробки». Здесь спрашивают «стеклянный проем, через который входит свет»; ответ window.",
          "Не shelf: это «плоская доска для хранения вещей на стене или в шкафу». В этом вопросе правильный вариант — window.",
          "Да: window — стеклянный проем, через который входит свет. Это ровно то, что описано в задании."
        ],
        "uk": [
          "door теж із теми дому, але не означає «the glass opening that lets light in». Тут правильна відповідь window.",
          "drawer теж із теми дому, але не означає «the glass opening that lets light in». Тут правильна відповідь window.",
          "shelf теж із теми дому, але не означає «the glass opening that lets light in». Тут правильна відповідь window.",
          "Так: window означає «the glass opening that lets light in». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "door también suena a casa, pero no significa «the glass opening that lets light in». La respuesta correcta es window.",
          "drawer también suena a casa, pero no significa «the glass opening that lets light in». La respuesta correcta es window.",
          "shelf también suena a casa, pero no significa «the glass opening that lets light in». La respuesta correcta es window.",
          "Sí: window significa «the glass opening that lets light in». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "door também é do tema casa, mas não significa “the glass opening that lets light in”. A resposta certa é window.",
          "drawer também é do tema casa, mas não significa “the glass opening that lets light in”. A resposta certa é window.",
          "shelf também é do tema casa, mas não significa “the glass opening that lets light in”. A resposta certa é window.",
          "Isso: window significa “the glass opening that lets light in”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "door cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the glass opening that lets light in”. Đáp án đúng là window.",
          "drawer cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the glass opening that lets light in”. Đáp án đúng là window.",
          "shelf cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the glass opening that lets light in”. Đáp án đúng là window.",
          "window nghĩa là “the glass opening that lets light in”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "door masih bertema rumah, tetapi bukan “the glass opening that lets light in”. Jawaban yang tepat adalah window.",
          "drawer masih bertema rumah, tetapi bukan “the glass opening that lets light in”. Jawaban yang tepat adalah window.",
          "shelf masih bertema rumah, tetapi bukan “the glass opening that lets light in”. Jawaban yang tepat adalah window.",
          "window berarti “the glass opening that lets light in”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "door ev temasıyla ilgili olabilir, ama “the glass opening that lets light in” anlamına gelmez. Doğru cevap window.",
          "drawer ev temasıyla ilgili olabilir, ama “the glass opening that lets light in” anlamına gelmez. Doğru cevap window.",
          "shelf ev temasıyla ilgili olabilir, ama “the glass opening that lets light in” anlamına gelmez. Doğru cevap window.",
          "Evet: window, “the glass opening that lets light in” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "door też pasuje do tematu domu, ale nie znaczy „the glass opening that lets light in”. Poprawna odpowiedź to window.",
          "drawer też pasuje do tematu domu, ale nie znaczy „the glass opening that lets light in”. Poprawna odpowiedź to window.",
          "shelf też pasuje do tematu domu, ale nie znaczy „the glass opening that lets light in”. Poprawna odpowiedź to window.",
          "Tak: window znaczy „the glass opening that lets light in”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-009",
      "type": "mcq",
      "prompt": "Choose the English word for: the surface you walk on inside a room.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «поверхность, по которой ходят в комнате».",
        "uk": "Яке англійське слово або фраза означає «the surface you walk on inside a room»?",
        "es": "¿Qué palabra o expresión inglesa significa «the surface you walk on inside a room»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the surface you walk on inside a room”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the surface you walk on inside a room”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the surface you walk on inside a room”?",
        "tr": "“the surface you walk on inside a room” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the surface you walk on inside a room”?"
      },
      "choices": [
        "floor",
        "ceiling",
        "wall",
        "balcony"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose floor for the home-and-rooms meaning: the surface you walk on inside a room.",
      "skillTag": "home_parts",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C9",
        "K9"
      ],
      "choiceRationales": [
        "floor is the only option that matches the tested meaning: the surface you walk on inside a room.",
        "ceiling is a plausible home-and-rooms distractor, but it does not mean: the surface you walk on inside a room.",
        "wall is a plausible home-and-rooms distractor, but it does not mean: the surface you walk on inside a room.",
        "balcony is a plausible home-and-rooms distractor, but it does not mean: the surface you walk on inside a room."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: floor — поверхность, по которой ходят в комнате. Это ровно то, что описано в задании.",
          "ceiling означает «потолок». Здесь спрашивают «поверхность, по которой ходят в комнате»; ответ floor.",
          "Не wall: это «вертикальная сторона комнаты». В этом вопросе правильный вариант — floor.",
          "balcony — «небольшая открытая площадка на верхнем этаже», а в вопросе нужно «поверхность, по которой ходят в комнате». Поэтому выбираем floor."
        ],
        "uk": [
          "Так: floor означає «the surface you walk on inside a room». Тримай у голові просту домашню картинку.",
          "ceiling теж із теми дому, але не означає «the surface you walk on inside a room». Тут правильна відповідь floor.",
          "wall теж із теми дому, але не означає «the surface you walk on inside a room». Тут правильна відповідь floor.",
          "balcony теж із теми дому, але не означає «the surface you walk on inside a room». Тут правильна відповідь floor."
        ],
        "es": [
          "Sí: floor significa «the surface you walk on inside a room». La imagen de casa ayuda a recordarlo.",
          "ceiling también suena a casa, pero no significa «the surface you walk on inside a room». La respuesta correcta es floor.",
          "wall también suena a casa, pero no significa «the surface you walk on inside a room». La respuesta correcta es floor.",
          "balcony también suena a casa, pero no significa «the surface you walk on inside a room». La respuesta correcta es floor."
        ],
        "pt-BR": [
          "Isso: floor significa “the surface you walk on inside a room”. Ligue a palavra a uma cena simples da casa.",
          "ceiling também é do tema casa, mas não significa “the surface you walk on inside a room”. A resposta certa é floor.",
          "wall também é do tema casa, mas não significa “the surface you walk on inside a room”. A resposta certa é floor.",
          "balcony também é do tema casa, mas não significa “the surface you walk on inside a room”. A resposta certa é floor."
        ],
        "vi": [
          "floor nghĩa là “the surface you walk on inside a room”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "ceiling cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the surface you walk on inside a room”. Đáp án đúng là floor.",
          "wall cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the surface you walk on inside a room”. Đáp án đúng là floor.",
          "balcony cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the surface you walk on inside a room”. Đáp án đúng là floor."
        ],
        "id": [
          "floor berarti “the surface you walk on inside a room”. Bayangkan benda atau ruang itu di rumah.",
          "ceiling masih bertema rumah, tetapi bukan “the surface you walk on inside a room”. Jawaban yang tepat adalah floor.",
          "wall masih bertema rumah, tetapi bukan “the surface you walk on inside a room”. Jawaban yang tepat adalah floor.",
          "balcony masih bertema rumah, tetapi bukan “the surface you walk on inside a room”. Jawaban yang tepat adalah floor."
        ],
        "tr": [
          "Evet: floor, “the surface you walk on inside a room” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "ceiling ev temasıyla ilgili olabilir, ama “the surface you walk on inside a room” anlamına gelmez. Doğru cevap floor.",
          "wall ev temasıyla ilgili olabilir, ama “the surface you walk on inside a room” anlamına gelmez. Doğru cevap floor.",
          "balcony ev temasıyla ilgili olabilir, ama “the surface you walk on inside a room” anlamına gelmez. Doğru cevap floor."
        ],
        "pl": [
          "Tak: floor znaczy „the surface you walk on inside a room”. Połącz słowo z prostym obrazem w domu.",
          "ceiling też pasuje do tematu domu, ale nie znaczy „the surface you walk on inside a room”. Poprawna odpowiedź to floor.",
          "wall też pasuje do tematu domu, ale nie znaczy „the surface you walk on inside a room”. Poprawna odpowiedź to floor.",
          "balcony też pasuje do tematu domu, ale nie znaczy „the surface you walk on inside a room”. Poprawna odpowiedź to floor."
        ]
      }
    },
    {
      "id": "home-and-rooms-010",
      "type": "mcq",
      "prompt": "Choose the English word for: the vertical side of a room.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «вертикальная сторона комнаты».",
        "uk": "Яке англійське слово або фраза означає «the vertical side of a room»?",
        "es": "¿Qué palabra o expresión inglesa significa «the vertical side of a room»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the vertical side of a room”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the vertical side of a room”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the vertical side of a room”?",
        "tr": "“the vertical side of a room” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the vertical side of a room”?"
      },
      "choices": [
        "floor",
        "wall",
        "rug",
        "screen"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose wall for the home-and-rooms meaning: the vertical side of a room.",
      "skillTag": "home_parts",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C10",
        "K10"
      ],
      "choiceRationales": [
        "floor is a plausible home-and-rooms distractor, but it does not mean: the vertical side of a room.",
        "wall is the only option that matches the tested meaning: the vertical side of a room.",
        "rug is a plausible home-and-rooms distractor, but it does not mean: the vertical side of a room.",
        "screen is a plausible home-and-rooms distractor, but it does not mean: the vertical side of a room."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "floor — поверхность, по которой ходят в комнате. Это не про «вертикальная сторона комнаты»; выбираем wall.",
          "Да: wall — вертикальная сторона комнаты. Это ровно то, что описано в задании.",
          "Не rug: это «небольшой ковер на части пола». В этом вопросе правильный вариант — wall.",
          "screen — «часть телевизора или устройства, где видно изображение», а в вопросе нужно «вертикальная сторона комнаты». Поэтому выбираем wall."
        ],
        "uk": [
          "floor теж із теми дому, але не означає «the vertical side of a room». Тут правильна відповідь wall.",
          "Так: wall означає «the vertical side of a room». Тримай у голові просту домашню картинку.",
          "rug теж із теми дому, але не означає «the vertical side of a room». Тут правильна відповідь wall.",
          "screen теж із теми дому, але не означає «the vertical side of a room». Тут правильна відповідь wall."
        ],
        "es": [
          "floor también suena a casa, pero no significa «the vertical side of a room». La respuesta correcta es wall.",
          "Sí: wall significa «the vertical side of a room». La imagen de casa ayuda a recordarlo.",
          "rug también suena a casa, pero no significa «the vertical side of a room». La respuesta correcta es wall.",
          "screen también suena a casa, pero no significa «the vertical side of a room». La respuesta correcta es wall."
        ],
        "pt-BR": [
          "floor também é do tema casa, mas não significa “the vertical side of a room”. A resposta certa é wall.",
          "Isso: wall significa “the vertical side of a room”. Ligue a palavra a uma cena simples da casa.",
          "rug também é do tema casa, mas não significa “the vertical side of a room”. A resposta certa é wall.",
          "screen também é do tema casa, mas não significa “the vertical side of a room”. A resposta certa é wall."
        ],
        "vi": [
          "floor cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the vertical side of a room”. Đáp án đúng là wall.",
          "wall nghĩa là “the vertical side of a room”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "rug cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the vertical side of a room”. Đáp án đúng là wall.",
          "screen cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the vertical side of a room”. Đáp án đúng là wall."
        ],
        "id": [
          "floor masih bertema rumah, tetapi bukan “the vertical side of a room”. Jawaban yang tepat adalah wall.",
          "wall berarti “the vertical side of a room”. Bayangkan benda atau ruang itu di rumah.",
          "rug masih bertema rumah, tetapi bukan “the vertical side of a room”. Jawaban yang tepat adalah wall.",
          "screen masih bertema rumah, tetapi bukan “the vertical side of a room”. Jawaban yang tepat adalah wall."
        ],
        "tr": [
          "floor ev temasıyla ilgili olabilir, ama “the vertical side of a room” anlamına gelmez. Doğru cevap wall.",
          "Evet: wall, “the vertical side of a room” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "rug ev temasıyla ilgili olabilir, ama “the vertical side of a room” anlamına gelmez. Doğru cevap wall.",
          "screen ev temasıyla ilgili olabilir, ama “the vertical side of a room” anlamına gelmez. Doğru cevap wall."
        ],
        "pl": [
          "floor też pasuje do tematu domu, ale nie znaczy „the vertical side of a room”. Poprawna odpowiedź to wall.",
          "Tak: wall znaczy „the vertical side of a room”. Połącz słowo z prostym obrazem w domu.",
          "rug też pasuje do tematu domu, ale nie znaczy „the vertical side of a room”. Poprawna odpowiedź to wall.",
          "screen też pasuje do tematu domu, ale nie znaczy „the vertical side of a room”. Poprawna odpowiedź to wall."
        ]
      }
    },
    {
      "id": "home-and-rooms-011",
      "type": "mcq",
      "prompt": "Choose the English word for: an object that gives light.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «предмет, который дает свет».",
        "uk": "Яке англійське слово або фраза означає «an object that gives light»?",
        "es": "¿Qué palabra o expresión inglesa significa «an object that gives light»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “an object that gives light”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “an object that gives light”?",
        "id": "Kata atau frasa Inggris mana yang berarti “an object that gives light”?",
        "tr": "“an object that gives light” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „an object that gives light”?"
      },
      "choices": [
        "pillow",
        "broom",
        "lamp",
        "comb"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose lamp for the home-and-rooms meaning: an object that gives light.",
      "skillTag": "home_objects",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C11",
        "K11"
      ],
      "choiceRationales": [
        "pillow is a plausible home-and-rooms distractor, but it does not mean: an object that gives light.",
        "broom is a plausible home-and-rooms distractor, but it does not mean: an object that gives light.",
        "lamp is the only option that matches the tested meaning: an object that gives light.",
        "comb is a plausible home-and-rooms distractor, but it does not mean: an object that gives light."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "pillow — мягкая вещь под голову в кровати. Это не про «предмет, который дает свет»; выбираем lamp.",
          "broom означает «инструмент, которым подметают пол». Здесь спрашивают «предмет, который дает свет»; ответ lamp.",
          "Да: lamp — предмет, который дает свет. Это ровно то, что описано в задании.",
          "comb — «предмет, которым приводят волосы в порядок», а в вопросе нужно «предмет, который дает свет». Поэтому выбираем lamp."
        ],
        "uk": [
          "pillow теж із теми дому, але не означає «an object that gives light». Тут правильна відповідь lamp.",
          "broom теж із теми дому, але не означає «an object that gives light». Тут правильна відповідь lamp.",
          "Так: lamp означає «an object that gives light». Тримай у голові просту домашню картинку.",
          "comb теж із теми дому, але не означає «an object that gives light». Тут правильна відповідь lamp."
        ],
        "es": [
          "pillow también suena a casa, pero no significa «an object that gives light». La respuesta correcta es lamp.",
          "broom también suena a casa, pero no significa «an object that gives light». La respuesta correcta es lamp.",
          "Sí: lamp significa «an object that gives light». La imagen de casa ayuda a recordarlo.",
          "comb también suena a casa, pero no significa «an object that gives light». La respuesta correcta es lamp."
        ],
        "pt-BR": [
          "pillow também é do tema casa, mas não significa “an object that gives light”. A resposta certa é lamp.",
          "broom também é do tema casa, mas não significa “an object that gives light”. A resposta certa é lamp.",
          "Isso: lamp significa “an object that gives light”. Ligue a palavra a uma cena simples da casa.",
          "comb também é do tema casa, mas não significa “an object that gives light”. A resposta certa é lamp."
        ],
        "vi": [
          "pillow cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “an object that gives light”. Đáp án đúng là lamp.",
          "broom cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “an object that gives light”. Đáp án đúng là lamp.",
          "lamp nghĩa là “an object that gives light”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "comb cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “an object that gives light”. Đáp án đúng là lamp."
        ],
        "id": [
          "pillow masih bertema rumah, tetapi bukan “an object that gives light”. Jawaban yang tepat adalah lamp.",
          "broom masih bertema rumah, tetapi bukan “an object that gives light”. Jawaban yang tepat adalah lamp.",
          "lamp berarti “an object that gives light”. Bayangkan benda atau ruang itu di rumah.",
          "comb masih bertema rumah, tetapi bukan “an object that gives light”. Jawaban yang tepat adalah lamp."
        ],
        "tr": [
          "pillow ev temasıyla ilgili olabilir, ama “an object that gives light” anlamına gelmez. Doğru cevap lamp.",
          "broom ev temasıyla ilgili olabilir, ama “an object that gives light” anlamına gelmez. Doğru cevap lamp.",
          "Evet: lamp, “an object that gives light” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "comb ev temasıyla ilgili olabilir, ama “an object that gives light” anlamına gelmez. Doğru cevap lamp."
        ],
        "pl": [
          "pillow też pasuje do tematu domu, ale nie znaczy „an object that gives light”. Poprawna odpowiedź to lamp.",
          "broom też pasuje do tematu domu, ale nie znaczy „an object that gives light”. Poprawna odpowiedź to lamp.",
          "Tak: lamp znaczy „an object that gives light”. Połącz słowo z prostym obrazem w domu.",
          "comb też pasuje do tematu domu, ale nie znaczy „an object that gives light”. Poprawna odpowiedź to lamp."
        ]
      }
    },
    {
      "id": "home-and-rooms-012",
      "type": "mcq",
      "prompt": "Choose the English word for: soft material that covers much of the floor.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «мягкое покрытие для большей части пола».",
        "uk": "Яке англійське слово або фраза означає «soft material that covers much of the floor»?",
        "es": "¿Qué palabra o expresión inglesa significa «soft material that covers much of the floor»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “soft material that covers much of the floor”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “soft material that covers much of the floor”?",
        "id": "Kata atau frasa Inggris mana yang berarti “soft material that covers much of the floor”?",
        "tr": "“soft material that covers much of the floor” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „soft material that covers much of the floor”?"
      },
      "choices": [
        "curtains",
        "blanket",
        "towel",
        "carpet"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose carpet for the home-and-rooms meaning: soft material that covers much of the floor.",
      "skillTag": "home_objects",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C12",
        "K12"
      ],
      "choiceRationales": [
        "curtains is a plausible home-and-rooms distractor, but it does not mean: soft material that covers much of the floor.",
        "blanket is a plausible home-and-rooms distractor, but it does not mean: soft material that covers much of the floor.",
        "towel is a plausible home-and-rooms distractor, but it does not mean: soft material that covers much of the floor.",
        "carpet is the only option that matches the tested meaning: soft material that covers much of the floor."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "curtains — ткань, которой закрывают окно. Это не про «мягкое покрытие для большей части пола»; выбираем carpet.",
          "blanket означает «теплое покрывало для кровати». Здесь спрашивают «мягкое покрытие для большей части пола»; ответ carpet.",
          "Не towel: это «ткань для вытирания рук или тела». В этом вопросе правильный вариант — carpet.",
          "Да: carpet — мягкое покрытие для большей части пола. Это ровно то, что описано в задании."
        ],
        "uk": [
          "curtains теж із теми дому, але не означає «soft material that covers much of the floor». Тут правильна відповідь carpet.",
          "blanket теж із теми дому, але не означає «soft material that covers much of the floor». Тут правильна відповідь carpet.",
          "towel теж із теми дому, але не означає «soft material that covers much of the floor». Тут правильна відповідь carpet.",
          "Так: carpet означає «soft material that covers much of the floor». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "curtains también suena a casa, pero no significa «soft material that covers much of the floor». La respuesta correcta es carpet.",
          "blanket también suena a casa, pero no significa «soft material that covers much of the floor». La respuesta correcta es carpet.",
          "towel también suena a casa, pero no significa «soft material that covers much of the floor». La respuesta correcta es carpet.",
          "Sí: carpet significa «soft material that covers much of the floor». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "curtains também é do tema casa, mas não significa “soft material that covers much of the floor”. A resposta certa é carpet.",
          "blanket também é do tema casa, mas não significa “soft material that covers much of the floor”. A resposta certa é carpet.",
          "towel também é do tema casa, mas não significa “soft material that covers much of the floor”. A resposta certa é carpet.",
          "Isso: carpet significa “soft material that covers much of the floor”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "curtains cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “soft material that covers much of the floor”. Đáp án đúng là carpet.",
          "blanket cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “soft material that covers much of the floor”. Đáp án đúng là carpet.",
          "towel cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “soft material that covers much of the floor”. Đáp án đúng là carpet.",
          "carpet nghĩa là “soft material that covers much of the floor”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "curtains masih bertema rumah, tetapi bukan “soft material that covers much of the floor”. Jawaban yang tepat adalah carpet.",
          "blanket masih bertema rumah, tetapi bukan “soft material that covers much of the floor”. Jawaban yang tepat adalah carpet.",
          "towel masih bertema rumah, tetapi bukan “soft material that covers much of the floor”. Jawaban yang tepat adalah carpet.",
          "carpet berarti “soft material that covers much of the floor”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "curtains ev temasıyla ilgili olabilir, ama “soft material that covers much of the floor” anlamına gelmez. Doğru cevap carpet.",
          "blanket ev temasıyla ilgili olabilir, ama “soft material that covers much of the floor” anlamına gelmez. Doğru cevap carpet.",
          "towel ev temasıyla ilgili olabilir, ama “soft material that covers much of the floor” anlamına gelmez. Doğru cevap carpet.",
          "Evet: carpet, “soft material that covers much of the floor” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "curtains też pasuje do tematu domu, ale nie znaczy „soft material that covers much of the floor”. Poprawna odpowiedź to carpet.",
          "blanket też pasuje do tematu domu, ale nie znaczy „soft material that covers much of the floor”. Poprawna odpowiedź to carpet.",
          "towel też pasuje do tematu domu, ale nie znaczy „soft material that covers much of the floor”. Poprawna odpowiedź to carpet.",
          "Tak: carpet znaczy „soft material that covers much of the floor”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-013",
      "type": "mcq",
      "prompt": "Choose the English word for: the bowl where water runs for washing hands or dishes.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «чаша с водой для мытья рук или посуды».",
        "uk": "Яке англійське слово або фраза означає «the bowl where water runs for washing hands or dishes»?",
        "es": "¿Qué palabra o expresión inglesa significa «the bowl where water runs for washing hands or dishes»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the bowl where water runs for washing hands or dishes”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the bowl where water runs for washing hands or dishes”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the bowl where water runs for washing hands or dishes”?",
        "tr": "“the bowl where water runs for washing hands or dishes” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the bowl where water runs for washing hands or dishes”?"
      },
      "choices": [
        "sink",
        "bathtub",
        "drawer",
        "closet"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose sink for the home-and-rooms meaning: the bowl where water runs for washing hands or dishes.",
      "skillTag": "home_objects",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C13",
        "K13"
      ],
      "choiceRationales": [
        "sink is the only option that matches the tested meaning: the bowl where water runs for washing hands or dishes.",
        "bathtub is a plausible home-and-rooms distractor, but it does not mean: the bowl where water runs for washing hands or dishes.",
        "drawer is a plausible home-and-rooms distractor, but it does not mean: the bowl where water runs for washing hands or dishes.",
        "closet is a plausible home-and-rooms distractor, but it does not mean: the bowl where water runs for washing hands or dishes."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: sink — чаша с водой для мытья рук или посуды. Это ровно то, что описано в задании.",
          "bathtub означает «большая ванна, где можно сидеть и мыться». Здесь спрашивают «чаша с водой для мытья рук или посуды»; ответ sink.",
          "Не drawer: это «выдвижная часть мебели в форме коробки». В этом вопросе правильный вариант — sink.",
          "closet — «небольшое место для хранения одежды или домашних вещей», а в вопросе нужно «чаша с водой для мытья рук или посуды». Поэтому выбираем sink."
        ],
        "uk": [
          "Так: sink означає «the bowl where water runs for washing hands or dishes». Тримай у голові просту домашню картинку.",
          "bathtub теж із теми дому, але не означає «the bowl where water runs for washing hands or dishes». Тут правильна відповідь sink.",
          "drawer теж із теми дому, але не означає «the bowl where water runs for washing hands or dishes». Тут правильна відповідь sink.",
          "closet теж із теми дому, але не означає «the bowl where water runs for washing hands or dishes». Тут правильна відповідь sink."
        ],
        "es": [
          "Sí: sink significa «the bowl where water runs for washing hands or dishes». La imagen de casa ayuda a recordarlo.",
          "bathtub también suena a casa, pero no significa «the bowl where water runs for washing hands or dishes». La respuesta correcta es sink.",
          "drawer también suena a casa, pero no significa «the bowl where water runs for washing hands or dishes». La respuesta correcta es sink.",
          "closet también suena a casa, pero no significa «the bowl where water runs for washing hands or dishes». La respuesta correcta es sink."
        ],
        "pt-BR": [
          "Isso: sink significa “the bowl where water runs for washing hands or dishes”. Ligue a palavra a uma cena simples da casa.",
          "bathtub também é do tema casa, mas não significa “the bowl where water runs for washing hands or dishes”. A resposta certa é sink.",
          "drawer também é do tema casa, mas não significa “the bowl where water runs for washing hands or dishes”. A resposta certa é sink.",
          "closet também é do tema casa, mas não significa “the bowl where water runs for washing hands or dishes”. A resposta certa é sink."
        ],
        "vi": [
          "sink nghĩa là “the bowl where water runs for washing hands or dishes”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "bathtub cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the bowl where water runs for washing hands or dishes”. Đáp án đúng là sink.",
          "drawer cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the bowl where water runs for washing hands or dishes”. Đáp án đúng là sink.",
          "closet cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the bowl where water runs for washing hands or dishes”. Đáp án đúng là sink."
        ],
        "id": [
          "sink berarti “the bowl where water runs for washing hands or dishes”. Bayangkan benda atau ruang itu di rumah.",
          "bathtub masih bertema rumah, tetapi bukan “the bowl where water runs for washing hands or dishes”. Jawaban yang tepat adalah sink.",
          "drawer masih bertema rumah, tetapi bukan “the bowl where water runs for washing hands or dishes”. Jawaban yang tepat adalah sink.",
          "closet masih bertema rumah, tetapi bukan “the bowl where water runs for washing hands or dishes”. Jawaban yang tepat adalah sink."
        ],
        "tr": [
          "Evet: sink, “the bowl where water runs for washing hands or dishes” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "bathtub ev temasıyla ilgili olabilir, ama “the bowl where water runs for washing hands or dishes” anlamına gelmez. Doğru cevap sink.",
          "drawer ev temasıyla ilgili olabilir, ama “the bowl where water runs for washing hands or dishes” anlamına gelmez. Doğru cevap sink.",
          "closet ev temasıyla ilgili olabilir, ama “the bowl where water runs for washing hands or dishes” anlamına gelmez. Doğru cevap sink."
        ],
        "pl": [
          "Tak: sink znaczy „the bowl where water runs for washing hands or dishes”. Połącz słowo z prostym obrazem w domu.",
          "bathtub też pasuje do tematu domu, ale nie znaczy „the bowl where water runs for washing hands or dishes”. Poprawna odpowiedź to sink.",
          "drawer też pasuje do tematu domu, ale nie znaczy „the bowl where water runs for washing hands or dishes”. Poprawna odpowiedź to sink.",
          "closet też pasuje do tematu domu, ale nie znaczy „the bowl where water runs for washing hands or dishes”. Poprawna odpowiedź to sink."
        ]
      }
    },
    {
      "id": "home-and-rooms-014",
      "type": "mcq",
      "prompt": "Choose the English word for: the glass where you see yourself.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «стекло, в котором видишь себя».",
        "uk": "Яке англійське слово або фраза означає «the glass where you see yourself»?",
        "es": "¿Qué palabra o expresión inglesa significa «the glass where you see yourself»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the glass where you see yourself”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the glass where you see yourself”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the glass where you see yourself”?",
        "tr": "“the glass where you see yourself” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the glass where you see yourself”?"
      },
      "choices": [
        "screen",
        "mirror",
        "clock",
        "mailbox"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose mirror for the home-and-rooms meaning: the glass where you see yourself.",
      "skillTag": "home_objects",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C14",
        "K14"
      ],
      "choiceRationales": [
        "screen is a plausible home-and-rooms distractor, but it does not mean: the glass where you see yourself.",
        "mirror is the only option that matches the tested meaning: the glass where you see yourself.",
        "clock is a plausible home-and-rooms distractor, but it does not mean: the glass where you see yourself.",
        "mailbox is a plausible home-and-rooms distractor, but it does not mean: the glass where you see yourself."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "screen — часть телевизора или устройства, где видно изображение. Это не про «стекло, в котором видишь себя»; выбираем mirror.",
          "Да: mirror — стекло, в котором видишь себя. Это ровно то, что описано в задании.",
          "Не clock: это «предмет, который показывает время». В этом вопросе правильный вариант — mirror.",
          "mailbox — «ящик, куда доставляют письма», а в вопросе нужно «стекло, в котором видишь себя». Поэтому выбираем mirror."
        ],
        "uk": [
          "screen теж із теми дому, але не означає «the glass where you see yourself». Тут правильна відповідь mirror.",
          "Так: mirror означає «the glass where you see yourself». Тримай у голові просту домашню картинку.",
          "clock теж із теми дому, але не означає «the glass where you see yourself». Тут правильна відповідь mirror.",
          "mailbox теж із теми дому, але не означає «the glass where you see yourself». Тут правильна відповідь mirror."
        ],
        "es": [
          "screen también suena a casa, pero no significa «the glass where you see yourself». La respuesta correcta es mirror.",
          "Sí: mirror significa «the glass where you see yourself». La imagen de casa ayuda a recordarlo.",
          "clock también suena a casa, pero no significa «the glass where you see yourself». La respuesta correcta es mirror.",
          "mailbox también suena a casa, pero no significa «the glass where you see yourself». La respuesta correcta es mirror."
        ],
        "pt-BR": [
          "screen também é do tema casa, mas não significa “the glass where you see yourself”. A resposta certa é mirror.",
          "Isso: mirror significa “the glass where you see yourself”. Ligue a palavra a uma cena simples da casa.",
          "clock também é do tema casa, mas não significa “the glass where you see yourself”. A resposta certa é mirror.",
          "mailbox também é do tema casa, mas não significa “the glass where you see yourself”. A resposta certa é mirror."
        ],
        "vi": [
          "screen cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the glass where you see yourself”. Đáp án đúng là mirror.",
          "mirror nghĩa là “the glass where you see yourself”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "clock cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the glass where you see yourself”. Đáp án đúng là mirror.",
          "mailbox cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the glass where you see yourself”. Đáp án đúng là mirror."
        ],
        "id": [
          "screen masih bertema rumah, tetapi bukan “the glass where you see yourself”. Jawaban yang tepat adalah mirror.",
          "mirror berarti “the glass where you see yourself”. Bayangkan benda atau ruang itu di rumah.",
          "clock masih bertema rumah, tetapi bukan “the glass where you see yourself”. Jawaban yang tepat adalah mirror.",
          "mailbox masih bertema rumah, tetapi bukan “the glass where you see yourself”. Jawaban yang tepat adalah mirror."
        ],
        "tr": [
          "screen ev temasıyla ilgili olabilir, ama “the glass where you see yourself” anlamına gelmez. Doğru cevap mirror.",
          "Evet: mirror, “the glass where you see yourself” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "clock ev temasıyla ilgili olabilir, ama “the glass where you see yourself” anlamına gelmez. Doğru cevap mirror.",
          "mailbox ev temasıyla ilgili olabilir, ama “the glass where you see yourself” anlamına gelmez. Doğru cevap mirror."
        ],
        "pl": [
          "screen też pasuje do tematu domu, ale nie znaczy „the glass where you see yourself”. Poprawna odpowiedź to mirror.",
          "Tak: mirror znaczy „the glass where you see yourself”. Połącz słowo z prostym obrazem w domu.",
          "clock też pasuje do tematu domu, ale nie znaczy „the glass where you see yourself”. Poprawna odpowiedź to mirror.",
          "mailbox też pasuje do tematu domu, ale nie znaczy „the glass where you see yourself”. Poprawna odpowiedź to mirror."
        ]
      }
    },
    {
      "id": "home-and-rooms-015",
      "type": "mcq",
      "prompt": "Choose the English word for: a flat board for holding things on a wall or cabinet.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «плоская доска для хранения вещей на стене или в шкафу».",
        "uk": "Яке англійське слово або фраза означає «a flat board for holding things on a wall or cabinet»?",
        "es": "¿Qué palabra o expresión inglesa significa «a flat board for holding things on a wall or cabinet»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a flat board for holding things on a wall or cabinet”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a flat board for holding things on a wall or cabinet”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a flat board for holding things on a wall or cabinet”?",
        "tr": "“a flat board for holding things on a wall or cabinet” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a flat board for holding things on a wall or cabinet”?"
      },
      "choices": [
        "pillow",
        "tap",
        "shelf",
        "gate"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose shelf for the home-and-rooms meaning: a flat board for holding things on a wall or cabinet.",
      "skillTag": "home_storage",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C15",
        "K15"
      ],
      "choiceRationales": [
        "pillow is a plausible home-and-rooms distractor, but it does not mean: a flat board for holding things on a wall or cabinet.",
        "tap is a plausible home-and-rooms distractor, but it does not mean: a flat board for holding things on a wall or cabinet.",
        "shelf is the only option that matches the tested meaning: a flat board for holding things on a wall or cabinet.",
        "gate is a plausible home-and-rooms distractor, but it does not mean: a flat board for holding things on a wall or cabinet."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "pillow — мягкая вещь под голову в кровати. Это не про «плоская доска для хранения вещей на стене или в шкафу»; выбираем shelf.",
          "tap означает «часть, откуда течет вода». Здесь спрашивают «плоская доска для хранения вещей на стене или в шкафу»; ответ shelf.",
          "Да: shelf — плоская доска для хранения вещей на стене или в шкафу. Это ровно то, что описано в задании.",
          "gate — «другой вариант», а в вопросе нужно «плоская доска для хранения вещей на стене или в шкафу». Поэтому выбираем shelf."
        ],
        "uk": [
          "pillow теж із теми дому, але не означає «a flat board for holding things on a wall or cabinet». Тут правильна відповідь shelf.",
          "tap теж із теми дому, але не означає «a flat board for holding things on a wall or cabinet». Тут правильна відповідь shelf.",
          "Так: shelf означає «a flat board for holding things on a wall or cabinet». Тримай у голові просту домашню картинку.",
          "gate теж із теми дому, але не означає «a flat board for holding things on a wall or cabinet». Тут правильна відповідь shelf."
        ],
        "es": [
          "pillow también suena a casa, pero no significa «a flat board for holding things on a wall or cabinet». La respuesta correcta es shelf.",
          "tap también suena a casa, pero no significa «a flat board for holding things on a wall or cabinet». La respuesta correcta es shelf.",
          "Sí: shelf significa «a flat board for holding things on a wall or cabinet». La imagen de casa ayuda a recordarlo.",
          "gate también suena a casa, pero no significa «a flat board for holding things on a wall or cabinet». La respuesta correcta es shelf."
        ],
        "pt-BR": [
          "pillow também é do tema casa, mas não significa “a flat board for holding things on a wall or cabinet”. A resposta certa é shelf.",
          "tap também é do tema casa, mas não significa “a flat board for holding things on a wall or cabinet”. A resposta certa é shelf.",
          "Isso: shelf significa “a flat board for holding things on a wall or cabinet”. Ligue a palavra a uma cena simples da casa.",
          "gate também é do tema casa, mas não significa “a flat board for holding things on a wall or cabinet”. A resposta certa é shelf."
        ],
        "vi": [
          "pillow cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a flat board for holding things on a wall or cabinet”. Đáp án đúng là shelf.",
          "tap cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a flat board for holding things on a wall or cabinet”. Đáp án đúng là shelf.",
          "shelf nghĩa là “a flat board for holding things on a wall or cabinet”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "gate cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a flat board for holding things on a wall or cabinet”. Đáp án đúng là shelf."
        ],
        "id": [
          "pillow masih bertema rumah, tetapi bukan “a flat board for holding things on a wall or cabinet”. Jawaban yang tepat adalah shelf.",
          "tap masih bertema rumah, tetapi bukan “a flat board for holding things on a wall or cabinet”. Jawaban yang tepat adalah shelf.",
          "shelf berarti “a flat board for holding things on a wall or cabinet”. Bayangkan benda atau ruang itu di rumah.",
          "gate masih bertema rumah, tetapi bukan “a flat board for holding things on a wall or cabinet”. Jawaban yang tepat adalah shelf."
        ],
        "tr": [
          "pillow ev temasıyla ilgili olabilir, ama “a flat board for holding things on a wall or cabinet” anlamına gelmez. Doğru cevap shelf.",
          "tap ev temasıyla ilgili olabilir, ama “a flat board for holding things on a wall or cabinet” anlamına gelmez. Doğru cevap shelf.",
          "Evet: shelf, “a flat board for holding things on a wall or cabinet” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "gate ev temasıyla ilgili olabilir, ama “a flat board for holding things on a wall or cabinet” anlamına gelmez. Doğru cevap shelf."
        ],
        "pl": [
          "pillow też pasuje do tematu domu, ale nie znaczy „a flat board for holding things on a wall or cabinet”. Poprawna odpowiedź to shelf.",
          "tap też pasuje do tematu domu, ale nie znaczy „a flat board for holding things on a wall or cabinet”. Poprawna odpowiedź to shelf.",
          "Tak: shelf znaczy „a flat board for holding things on a wall or cabinet”. Połącz słowo z prostym obrazem w domu.",
          "gate też pasuje do tematu domu, ale nie znaczy „a flat board for holding things on a wall or cabinet”. Poprawna odpowiedź to shelf."
        ]
      }
    },
    {
      "id": "home-and-rooms-016",
      "type": "mcq",
      "prompt": "Choose the English word for: the soft thing under your head in bed.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «мягкая вещь под голову в кровати».",
        "uk": "Яке англійське слово або фраза означає «the soft thing under your head in bed»?",
        "es": "¿Qué palabra o expresión inglesa significa «the soft thing under your head in bed»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the soft thing under your head in bed”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the soft thing under your head in bed”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the soft thing under your head in bed”?",
        "tr": "“the soft thing under your head in bed” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the soft thing under your head in bed”?"
      },
      "choices": [
        "cushion",
        "towel",
        "rug",
        "pillow"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose pillow for the home-and-rooms meaning: the soft thing under your head in bed.",
      "skillTag": "home_bedroom",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C16",
        "K16"
      ],
      "choiceRationales": [
        "cushion is a plausible home-and-rooms distractor, but it does not mean: the soft thing under your head in bed.",
        "towel is a plausible home-and-rooms distractor, but it does not mean: the soft thing under your head in bed.",
        "rug is a plausible home-and-rooms distractor, but it does not mean: the soft thing under your head in bed.",
        "pillow is the only option that matches the tested meaning: the soft thing under your head in bed."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "cushion — маленькая мягкая подушка для дивана или кресла. Это не про «мягкая вещь под голову в кровати»; выбираем pillow.",
          "towel означает «ткань для вытирания рук или тела». Здесь спрашивают «мягкая вещь под голову в кровати»; ответ pillow.",
          "Не rug: это «небольшой ковер на части пола». В этом вопросе правильный вариант — pillow.",
          "Да: pillow — мягкая вещь под голову в кровати. Это ровно то, что описано в задании."
        ],
        "uk": [
          "cushion теж із теми дому, але не означає «the soft thing under your head in bed». Тут правильна відповідь pillow.",
          "towel теж із теми дому, але не означає «the soft thing under your head in bed». Тут правильна відповідь pillow.",
          "rug теж із теми дому, але не означає «the soft thing under your head in bed». Тут правильна відповідь pillow.",
          "Так: pillow означає «the soft thing under your head in bed». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "cushion también suena a casa, pero no significa «the soft thing under your head in bed». La respuesta correcta es pillow.",
          "towel también suena a casa, pero no significa «the soft thing under your head in bed». La respuesta correcta es pillow.",
          "rug también suena a casa, pero no significa «the soft thing under your head in bed». La respuesta correcta es pillow.",
          "Sí: pillow significa «the soft thing under your head in bed». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "cushion também é do tema casa, mas não significa “the soft thing under your head in bed”. A resposta certa é pillow.",
          "towel também é do tema casa, mas não significa “the soft thing under your head in bed”. A resposta certa é pillow.",
          "rug também é do tema casa, mas não significa “the soft thing under your head in bed”. A resposta certa é pillow.",
          "Isso: pillow significa “the soft thing under your head in bed”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "cushion cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the soft thing under your head in bed”. Đáp án đúng là pillow.",
          "towel cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the soft thing under your head in bed”. Đáp án đúng là pillow.",
          "rug cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the soft thing under your head in bed”. Đáp án đúng là pillow.",
          "pillow nghĩa là “the soft thing under your head in bed”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "cushion masih bertema rumah, tetapi bukan “the soft thing under your head in bed”. Jawaban yang tepat adalah pillow.",
          "towel masih bertema rumah, tetapi bukan “the soft thing under your head in bed”. Jawaban yang tepat adalah pillow.",
          "rug masih bertema rumah, tetapi bukan “the soft thing under your head in bed”. Jawaban yang tepat adalah pillow.",
          "pillow berarti “the soft thing under your head in bed”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "cushion ev temasıyla ilgili olabilir, ama “the soft thing under your head in bed” anlamına gelmez. Doğru cevap pillow.",
          "towel ev temasıyla ilgili olabilir, ama “the soft thing under your head in bed” anlamına gelmez. Doğru cevap pillow.",
          "rug ev temasıyla ilgili olabilir, ama “the soft thing under your head in bed” anlamına gelmez. Doğru cevap pillow.",
          "Evet: pillow, “the soft thing under your head in bed” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "cushion też pasuje do tematu domu, ale nie znaczy „the soft thing under your head in bed”. Poprawna odpowiedź to pillow.",
          "towel też pasuje do tematu domu, ale nie znaczy „the soft thing under your head in bed”. Poprawna odpowiedź to pillow.",
          "rug też pasuje do tematu domu, ale nie znaczy „the soft thing under your head in bed”. Poprawna odpowiedź to pillow.",
          "Tak: pillow znaczy „the soft thing under your head in bed”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-017",
      "type": "mcq",
      "prompt": "Choose the English word for: the room where people cook food.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «комната, где готовят еду».",
        "uk": "Яке англійське слово або фраза означає «the room where people cook food»?",
        "es": "¿Qué palabra o expresión inglesa significa «the room where people cook food»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the room where people cook food”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the room where people cook food”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the room where people cook food”?",
        "tr": "“the room where people cook food” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the room where people cook food”?"
      },
      "choices": [
        "kitchen",
        "bedroom",
        "bathroom",
        "porch"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose kitchen for the home-and-rooms meaning: the room where people cook food.",
      "skillTag": "home_room_name",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C17",
        "K17"
      ],
      "choiceRationales": [
        "kitchen is the only option that matches the tested meaning: the room where people cook food.",
        "bedroom is a plausible home-and-rooms distractor, but it does not mean: the room where people cook food.",
        "bathroom is a plausible home-and-rooms distractor, but it does not mean: the room where people cook food.",
        "porch is a plausible home-and-rooms distractor, but it does not mean: the room where people cook food."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: kitchen — комната, где готовят еду. Это ровно то, что описано в задании.",
          "bedroom означает «комната, где спят». Здесь спрашивают «комната, где готовят еду»; ответ kitchen.",
          "Не bathroom: это «комната, где моются или пользуются туалетом». В этом вопросе правильный вариант — kitchen.",
          "porch — «крытая площадка у входа в дом», а в вопросе нужно «комната, где готовят еду». Поэтому выбираем kitchen."
        ],
        "uk": [
          "Так: kitchen означає «the room where people cook food». Тримай у голові просту домашню картинку.",
          "bedroom теж із теми дому, але не означає «the room where people cook food». Тут правильна відповідь kitchen.",
          "bathroom теж із теми дому, але не означає «the room where people cook food». Тут правильна відповідь kitchen.",
          "porch теж із теми дому, але не означає «the room where people cook food». Тут правильна відповідь kitchen."
        ],
        "es": [
          "Sí: kitchen significa «the room where people cook food». La imagen de casa ayuda a recordarlo.",
          "bedroom también suena a casa, pero no significa «the room where people cook food». La respuesta correcta es kitchen.",
          "bathroom también suena a casa, pero no significa «the room where people cook food». La respuesta correcta es kitchen.",
          "porch también suena a casa, pero no significa «the room where people cook food». La respuesta correcta es kitchen."
        ],
        "pt-BR": [
          "Isso: kitchen significa “the room where people cook food”. Ligue a palavra a uma cena simples da casa.",
          "bedroom também é do tema casa, mas não significa “the room where people cook food”. A resposta certa é kitchen.",
          "bathroom também é do tema casa, mas não significa “the room where people cook food”. A resposta certa é kitchen.",
          "porch também é do tema casa, mas não significa “the room where people cook food”. A resposta certa é kitchen."
        ],
        "vi": [
          "kitchen nghĩa là “the room where people cook food”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "bedroom cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the room where people cook food”. Đáp án đúng là kitchen.",
          "bathroom cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the room where people cook food”. Đáp án đúng là kitchen.",
          "porch cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the room where people cook food”. Đáp án đúng là kitchen."
        ],
        "id": [
          "kitchen berarti “the room where people cook food”. Bayangkan benda atau ruang itu di rumah.",
          "bedroom masih bertema rumah, tetapi bukan “the room where people cook food”. Jawaban yang tepat adalah kitchen.",
          "bathroom masih bertema rumah, tetapi bukan “the room where people cook food”. Jawaban yang tepat adalah kitchen.",
          "porch masih bertema rumah, tetapi bukan “the room where people cook food”. Jawaban yang tepat adalah kitchen."
        ],
        "tr": [
          "Evet: kitchen, “the room where people cook food” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "bedroom ev temasıyla ilgili olabilir, ama “the room where people cook food” anlamına gelmez. Doğru cevap kitchen.",
          "bathroom ev temasıyla ilgili olabilir, ama “the room where people cook food” anlamına gelmez. Doğru cevap kitchen.",
          "porch ev temasıyla ilgili olabilir, ama “the room where people cook food” anlamına gelmez. Doğru cevap kitchen."
        ],
        "pl": [
          "Tak: kitchen znaczy „the room where people cook food”. Połącz słowo z prostym obrazem w domu.",
          "bedroom też pasuje do tematu domu, ale nie znaczy „the room where people cook food”. Poprawna odpowiedź to kitchen.",
          "bathroom też pasuje do tematu domu, ale nie znaczy „the room where people cook food”. Poprawna odpowiedź to kitchen.",
          "porch też pasuje do tematu domu, ale nie znaczy „the room where people cook food”. Poprawna odpowiedź to kitchen."
        ]
      }
    },
    {
      "id": "home-and-rooms-018",
      "type": "mcq",
      "prompt": "Choose the English word for: cloth pieces that cover a window.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «ткань, которой закрывают окно».",
        "uk": "Яке англійське слово або фраза означає «cloth pieces that cover a window»?",
        "es": "¿Qué palabra o expresión inglesa significa «cloth pieces that cover a window»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “cloth pieces that cover a window”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “cloth pieces that cover a window”?",
        "id": "Kata atau frasa Inggris mana yang berarti “cloth pieces that cover a window”?",
        "tr": "“cloth pieces that cover a window” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „cloth pieces that cover a window”?"
      },
      "choices": [
        "blanket",
        "curtains",
        "clothesline",
        "shower curtain"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose curtains for the home-and-rooms meaning: cloth pieces that cover a window.",
      "skillTag": "home_objects",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C18",
        "K18"
      ],
      "choiceRationales": [
        "blanket is a plausible home-and-rooms distractor, but it does not mean: cloth pieces that cover a window.",
        "curtains is the only option that matches the tested meaning: cloth pieces that cover a window.",
        "clothesline is a plausible home-and-rooms distractor, but it does not mean: cloth pieces that cover a window.",
        "shower curtain is a plausible home-and-rooms distractor, but it does not mean: cloth pieces that cover a window."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "blanket — теплое покрывало для кровати. Это не про «ткань, которой закрывают окно»; выбираем curtains.",
          "Да: curtains — ткань, которой закрывают окно. Это ровно то, что описано в задании.",
          "Не clothesline: это «веревка или линия, на которой сушат одежду». В этом вопросе правильный вариант — curtains.",
          "shower curtain — «занавеска, которая удерживает воду в зоне душа», а в вопросе нужно «ткань, которой закрывают окно». Поэтому выбираем curtains."
        ],
        "uk": [
          "blanket теж із теми дому, але не означає «cloth pieces that cover a window». Тут правильна відповідь curtains.",
          "Так: curtains означає «cloth pieces that cover a window». Тримай у голові просту домашню картинку.",
          "clothesline теж із теми дому, але не означає «cloth pieces that cover a window». Тут правильна відповідь curtains.",
          "shower curtain теж із теми дому, але не означає «cloth pieces that cover a window». Тут правильна відповідь curtains."
        ],
        "es": [
          "blanket también suena a casa, pero no significa «cloth pieces that cover a window». La respuesta correcta es curtains.",
          "Sí: curtains significa «cloth pieces that cover a window». La imagen de casa ayuda a recordarlo.",
          "clothesline también suena a casa, pero no significa «cloth pieces that cover a window». La respuesta correcta es curtains.",
          "shower curtain también suena a casa, pero no significa «cloth pieces that cover a window». La respuesta correcta es curtains."
        ],
        "pt-BR": [
          "blanket também é do tema casa, mas não significa “cloth pieces that cover a window”. A resposta certa é curtains.",
          "Isso: curtains significa “cloth pieces that cover a window”. Ligue a palavra a uma cena simples da casa.",
          "clothesline também é do tema casa, mas não significa “cloth pieces that cover a window”. A resposta certa é curtains.",
          "shower curtain também é do tema casa, mas não significa “cloth pieces that cover a window”. A resposta certa é curtains."
        ],
        "vi": [
          "blanket cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “cloth pieces that cover a window”. Đáp án đúng là curtains.",
          "curtains nghĩa là “cloth pieces that cover a window”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "clothesline cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “cloth pieces that cover a window”. Đáp án đúng là curtains.",
          "shower curtain cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “cloth pieces that cover a window”. Đáp án đúng là curtains."
        ],
        "id": [
          "blanket masih bertema rumah, tetapi bukan “cloth pieces that cover a window”. Jawaban yang tepat adalah curtains.",
          "curtains berarti “cloth pieces that cover a window”. Bayangkan benda atau ruang itu di rumah.",
          "clothesline masih bertema rumah, tetapi bukan “cloth pieces that cover a window”. Jawaban yang tepat adalah curtains.",
          "shower curtain masih bertema rumah, tetapi bukan “cloth pieces that cover a window”. Jawaban yang tepat adalah curtains."
        ],
        "tr": [
          "blanket ev temasıyla ilgili olabilir, ama “cloth pieces that cover a window” anlamına gelmez. Doğru cevap curtains.",
          "Evet: curtains, “cloth pieces that cover a window” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "clothesline ev temasıyla ilgili olabilir, ama “cloth pieces that cover a window” anlamına gelmez. Doğru cevap curtains.",
          "shower curtain ev temasıyla ilgili olabilir, ama “cloth pieces that cover a window” anlamına gelmez. Doğru cevap curtains."
        ],
        "pl": [
          "blanket też pasuje do tematu domu, ale nie znaczy „cloth pieces that cover a window”. Poprawna odpowiedź to curtains.",
          "Tak: curtains znaczy „cloth pieces that cover a window”. Połącz słowo z prostym obrazem w domu.",
          "clothesline też pasuje do tematu domu, ale nie znaczy „cloth pieces that cover a window”. Poprawna odpowiedź to curtains.",
          "shower curtain też pasuje do tematu domu, ale nie znaczy „cloth pieces that cover a window”. Poprawna odpowiedź to curtains."
        ]
      }
    },
    {
      "id": "home-and-rooms-019",
      "type": "mcq",
      "prompt": "Choose the English word for: a warm cover used on a bed.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «теплое покрывало для кровати».",
        "uk": "Яке англійське слово або фраза означає «a warm cover used on a bed»?",
        "es": "¿Qué palabra o expresión inglesa significa «a warm cover used on a bed»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a warm cover used on a bed”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a warm cover used on a bed”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a warm cover used on a bed”?",
        "tr": "“a warm cover used on a bed” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a warm cover used on a bed”?"
      },
      "choices": [
        "carpet",
        "towel",
        "blanket",
        "cloth"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose blanket for the home-and-rooms meaning: a warm cover used on a bed.",
      "skillTag": "home_bedroom",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C19",
        "K19"
      ],
      "choiceRationales": [
        "carpet is a plausible home-and-rooms distractor, but it does not mean: a warm cover used on a bed.",
        "towel is a plausible home-and-rooms distractor, but it does not mean: a warm cover used on a bed.",
        "blanket is the only option that matches the tested meaning: a warm cover used on a bed.",
        "cloth is a plausible home-and-rooms distractor, but it does not mean: a warm cover used on a bed."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "carpet — мягкое покрытие для большей части пола. Это не про «теплое покрывало для кровати»; выбираем blanket.",
          "towel означает «ткань для вытирания рук или тела». Здесь спрашивают «теплое покрывало для кровати»; ответ blanket.",
          "Да: blanket — теплое покрывало для кровати. Это ровно то, что описано в задании.",
          "cloth — «кусок ткани для уборки или вытирания», а в вопросе нужно «теплое покрывало для кровати». Поэтому выбираем blanket."
        ],
        "uk": [
          "carpet теж із теми дому, але не означає «a warm cover used on a bed». Тут правильна відповідь blanket.",
          "towel теж із теми дому, але не означає «a warm cover used on a bed». Тут правильна відповідь blanket.",
          "Так: blanket означає «a warm cover used on a bed». Тримай у голові просту домашню картинку.",
          "cloth теж із теми дому, але не означає «a warm cover used on a bed». Тут правильна відповідь blanket."
        ],
        "es": [
          "carpet también suena a casa, pero no significa «a warm cover used on a bed». La respuesta correcta es blanket.",
          "towel también suena a casa, pero no significa «a warm cover used on a bed». La respuesta correcta es blanket.",
          "Sí: blanket significa «a warm cover used on a bed». La imagen de casa ayuda a recordarlo.",
          "cloth también suena a casa, pero no significa «a warm cover used on a bed». La respuesta correcta es blanket."
        ],
        "pt-BR": [
          "carpet também é do tema casa, mas não significa “a warm cover used on a bed”. A resposta certa é blanket.",
          "towel também é do tema casa, mas não significa “a warm cover used on a bed”. A resposta certa é blanket.",
          "Isso: blanket significa “a warm cover used on a bed”. Ligue a palavra a uma cena simples da casa.",
          "cloth também é do tema casa, mas não significa “a warm cover used on a bed”. A resposta certa é blanket."
        ],
        "vi": [
          "carpet cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a warm cover used on a bed”. Đáp án đúng là blanket.",
          "towel cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a warm cover used on a bed”. Đáp án đúng là blanket.",
          "blanket nghĩa là “a warm cover used on a bed”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "cloth cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a warm cover used on a bed”. Đáp án đúng là blanket."
        ],
        "id": [
          "carpet masih bertema rumah, tetapi bukan “a warm cover used on a bed”. Jawaban yang tepat adalah blanket.",
          "towel masih bertema rumah, tetapi bukan “a warm cover used on a bed”. Jawaban yang tepat adalah blanket.",
          "blanket berarti “a warm cover used on a bed”. Bayangkan benda atau ruang itu di rumah.",
          "cloth masih bertema rumah, tetapi bukan “a warm cover used on a bed”. Jawaban yang tepat adalah blanket."
        ],
        "tr": [
          "carpet ev temasıyla ilgili olabilir, ama “a warm cover used on a bed” anlamına gelmez. Doğru cevap blanket.",
          "towel ev temasıyla ilgili olabilir, ama “a warm cover used on a bed” anlamına gelmez. Doğru cevap blanket.",
          "Evet: blanket, “a warm cover used on a bed” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "cloth ev temasıyla ilgili olabilir, ama “a warm cover used on a bed” anlamına gelmez. Doğru cevap blanket."
        ],
        "pl": [
          "carpet też pasuje do tematu domu, ale nie znaczy „a warm cover used on a bed”. Poprawna odpowiedź to blanket.",
          "towel też pasuje do tematu domu, ale nie znaczy „a warm cover used on a bed”. Poprawna odpowiedź to blanket.",
          "Tak: blanket znaczy „a warm cover used on a bed”. Połącz słowo z prostym obrazem w domu.",
          "cloth też pasuje do tematu domu, ale nie znaczy „a warm cover used on a bed”. Poprawna odpowiedź to blanket."
        ]
      }
    },
    {
      "id": "home-and-rooms-020",
      "type": "mcq",
      "prompt": "Choose the English word for: a soft small pillow for a sofa or chair.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «маленькая мягкая подушка для дивана или кресла».",
        "uk": "Яке англійське слово або фраза означає «a soft small pillow for a sofa or chair»?",
        "es": "¿Qué palabra o expresión inglesa significa «a soft small pillow for a sofa or chair»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a soft small pillow for a sofa or chair”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a soft small pillow for a sofa or chair”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a soft small pillow for a sofa or chair”?",
        "tr": "“a soft small pillow for a sofa or chair” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a soft small pillow for a sofa or chair”?"
      },
      "choices": [
        "pillowcase",
        "bath mat",
        "soap",
        "cushion"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose cushion for the home-and-rooms meaning: a soft small pillow for a sofa or chair.",
      "skillTag": "home_furniture",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C20",
        "K20"
      ],
      "choiceRationales": [
        "pillowcase is a plausible home-and-rooms distractor, but it does not mean: a soft small pillow for a sofa or chair.",
        "bath mat is a plausible home-and-rooms distractor, but it does not mean: a soft small pillow for a sofa or chair.",
        "soap is a plausible home-and-rooms distractor, but it does not mean: a soft small pillow for a sofa or chair.",
        "cushion is the only option that matches the tested meaning: a soft small pillow for a sofa or chair."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "pillowcase — наволочка. Это не про «маленькая мягкая подушка для дивана или кресла»; выбираем cushion.",
          "bath mat означает «коврик на полу в ванной». Здесь спрашивают «маленькая мягкая подушка для дивана или кресла»; ответ cushion.",
          "Не soap: это «средство для мытья рук или тела». В этом вопросе правильный вариант — cushion.",
          "Да: cushion — маленькая мягкая подушка для дивана или кресла. Это ровно то, что описано в задании."
        ],
        "uk": [
          "pillowcase теж із теми дому, але не означає «a soft small pillow for a sofa or chair». Тут правильна відповідь cushion.",
          "bath mat теж із теми дому, але не означає «a soft small pillow for a sofa or chair». Тут правильна відповідь cushion.",
          "soap теж із теми дому, але не означає «a soft small pillow for a sofa or chair». Тут правильна відповідь cushion.",
          "Так: cushion означає «a soft small pillow for a sofa or chair». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "pillowcase también suena a casa, pero no significa «a soft small pillow for a sofa or chair». La respuesta correcta es cushion.",
          "bath mat también suena a casa, pero no significa «a soft small pillow for a sofa or chair». La respuesta correcta es cushion.",
          "soap también suena a casa, pero no significa «a soft small pillow for a sofa or chair». La respuesta correcta es cushion.",
          "Sí: cushion significa «a soft small pillow for a sofa or chair». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "pillowcase também é do tema casa, mas não significa “a soft small pillow for a sofa or chair”. A resposta certa é cushion.",
          "bath mat também é do tema casa, mas não significa “a soft small pillow for a sofa or chair”. A resposta certa é cushion.",
          "soap também é do tema casa, mas não significa “a soft small pillow for a sofa or chair”. A resposta certa é cushion.",
          "Isso: cushion significa “a soft small pillow for a sofa or chair”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "pillowcase cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a soft small pillow for a sofa or chair”. Đáp án đúng là cushion.",
          "bath mat cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a soft small pillow for a sofa or chair”. Đáp án đúng là cushion.",
          "soap cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a soft small pillow for a sofa or chair”. Đáp án đúng là cushion.",
          "cushion nghĩa là “a soft small pillow for a sofa or chair”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "pillowcase masih bertema rumah, tetapi bukan “a soft small pillow for a sofa or chair”. Jawaban yang tepat adalah cushion.",
          "bath mat masih bertema rumah, tetapi bukan “a soft small pillow for a sofa or chair”. Jawaban yang tepat adalah cushion.",
          "soap masih bertema rumah, tetapi bukan “a soft small pillow for a sofa or chair”. Jawaban yang tepat adalah cushion.",
          "cushion berarti “a soft small pillow for a sofa or chair”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "pillowcase ev temasıyla ilgili olabilir, ama “a soft small pillow for a sofa or chair” anlamına gelmez. Doğru cevap cushion.",
          "bath mat ev temasıyla ilgili olabilir, ama “a soft small pillow for a sofa or chair” anlamına gelmez. Doğru cevap cushion.",
          "soap ev temasıyla ilgili olabilir, ama “a soft small pillow for a sofa or chair” anlamına gelmez. Doğru cevap cushion.",
          "Evet: cushion, “a soft small pillow for a sofa or chair” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "pillowcase też pasuje do tematu domu, ale nie znaczy „a soft small pillow for a sofa or chair”. Poprawna odpowiedź to cushion.",
          "bath mat też pasuje do tematu domu, ale nie znaczy „a soft small pillow for a sofa or chair”. Poprawna odpowiedź to cushion.",
          "soap też pasuje do tematu domu, ale nie znaczy „a soft small pillow for a sofa or chair”. Poprawna odpowiedź to cushion.",
          "Tak: cushion znaczy „a soft small pillow for a sofa or chair”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-021",
      "type": "mcq",
      "prompt": "Choose the English word for: a long soft seat for several people.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «длинное мягкое сиденье для нескольких человек».",
        "uk": "Яке англійське слово або фраза означає «a long soft seat for several people»?",
        "es": "¿Qué palabra o expresión inglesa significa «a long soft seat for several people»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a long soft seat for several people”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a long soft seat for several people”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a long soft seat for several people”?",
        "tr": "“a long soft seat for several people” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a long soft seat for several people”?"
      },
      "choices": [
        "sofa",
        "chair",
        "bedside table",
        "shoe rack"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose sofa for the home-and-rooms meaning: a long soft seat for several people.",
      "skillTag": "home_furniture",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C21",
        "K21"
      ],
      "choiceRationales": [
        "sofa is the only option that matches the tested meaning: a long soft seat for several people.",
        "chair is a plausible home-and-rooms distractor, but it does not mean: a long soft seat for several people.",
        "bedside table is a plausible home-and-rooms distractor, but it does not mean: a long soft seat for several people.",
        "shoe rack is a plausible home-and-rooms distractor, but it does not mean: a long soft seat for several people."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: sofa — длинное мягкое сиденье для нескольких человек. Это ровно то, что описано в задании.",
          "chair означает «сиденье для одного человека». Здесь спрашивают «длинное мягкое сиденье для нескольких человек»; ответ sofa.",
          "Не bedside table: это «маленький столик рядом с кроватью». В этом вопросе правильный вариант — sofa.",
          "shoe rack — «полка или стойка для обуви», а в вопросе нужно «длинное мягкое сиденье для нескольких человек». Поэтому выбираем sofa."
        ],
        "uk": [
          "Так: sofa означає «a long soft seat for several people». Тримай у голові просту домашню картинку.",
          "chair теж із теми дому, але не означає «a long soft seat for several people». Тут правильна відповідь sofa.",
          "bedside table теж із теми дому, але не означає «a long soft seat for several people». Тут правильна відповідь sofa.",
          "shoe rack теж із теми дому, але не означає «a long soft seat for several people». Тут правильна відповідь sofa."
        ],
        "es": [
          "Sí: sofa significa «a long soft seat for several people». La imagen de casa ayuda a recordarlo.",
          "chair también suena a casa, pero no significa «a long soft seat for several people». La respuesta correcta es sofa.",
          "bedside table también suena a casa, pero no significa «a long soft seat for several people». La respuesta correcta es sofa.",
          "shoe rack también suena a casa, pero no significa «a long soft seat for several people». La respuesta correcta es sofa."
        ],
        "pt-BR": [
          "Isso: sofa significa “a long soft seat for several people”. Ligue a palavra a uma cena simples da casa.",
          "chair também é do tema casa, mas não significa “a long soft seat for several people”. A resposta certa é sofa.",
          "bedside table também é do tema casa, mas não significa “a long soft seat for several people”. A resposta certa é sofa.",
          "shoe rack também é do tema casa, mas não significa “a long soft seat for several people”. A resposta certa é sofa."
        ],
        "vi": [
          "sofa nghĩa là “a long soft seat for several people”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "chair cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a long soft seat for several people”. Đáp án đúng là sofa.",
          "bedside table cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a long soft seat for several people”. Đáp án đúng là sofa.",
          "shoe rack cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a long soft seat for several people”. Đáp án đúng là sofa."
        ],
        "id": [
          "sofa berarti “a long soft seat for several people”. Bayangkan benda atau ruang itu di rumah.",
          "chair masih bertema rumah, tetapi bukan “a long soft seat for several people”. Jawaban yang tepat adalah sofa.",
          "bedside table masih bertema rumah, tetapi bukan “a long soft seat for several people”. Jawaban yang tepat adalah sofa.",
          "shoe rack masih bertema rumah, tetapi bukan “a long soft seat for several people”. Jawaban yang tepat adalah sofa."
        ],
        "tr": [
          "Evet: sofa, “a long soft seat for several people” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "chair ev temasıyla ilgili olabilir, ama “a long soft seat for several people” anlamına gelmez. Doğru cevap sofa.",
          "bedside table ev temasıyla ilgili olabilir, ama “a long soft seat for several people” anlamına gelmez. Doğru cevap sofa.",
          "shoe rack ev temasıyla ilgili olabilir, ama “a long soft seat for several people” anlamına gelmez. Doğru cevap sofa."
        ],
        "pl": [
          "Tak: sofa znaczy „a long soft seat for several people”. Połącz słowo z prostym obrazem w domu.",
          "chair też pasuje do tematu domu, ale nie znaczy „a long soft seat for several people”. Poprawna odpowiedź to sofa.",
          "bedside table też pasuje do tematu domu, ale nie znaczy „a long soft seat for several people”. Poprawna odpowiedź to sofa.",
          "shoe rack też pasuje do tematu domu, ale nie znaczy „a long soft seat for several people”. Poprawna odpowiedź to sofa."
        ]
      }
    },
    {
      "id": "home-and-rooms-022",
      "type": "mcq",
      "prompt": "Choose the English word for: a cabinet with doors for storing things.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «шкафчик с дверцами для хранения вещей».",
        "uk": "Яке англійське слово або фраза означає «a cabinet with doors for storing things»?",
        "es": "¿Qué palabra o expresión inglesa significa «a cabinet with doors for storing things»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a cabinet with doors for storing things”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a cabinet with doors for storing things”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a cabinet with doors for storing things”?",
        "tr": "“a cabinet with doors for storing things” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a cabinet with doors for storing things”?"
      },
      "choices": [
        "drawer",
        "cupboard",
        "bookshelf",
        "front door"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose cupboard for the home-and-rooms meaning: a cabinet with doors for storing things.",
      "skillTag": "home_storage",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C22",
        "K22"
      ],
      "choiceRationales": [
        "drawer is a plausible home-and-rooms distractor, but it does not mean: a cabinet with doors for storing things.",
        "cupboard is the only option that matches the tested meaning: a cabinet with doors for storing things.",
        "bookshelf is a plausible home-and-rooms distractor, but it does not mean: a cabinet with doors for storing things.",
        "front door is a plausible home-and-rooms distractor, but it does not mean: a cabinet with doors for storing things."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "drawer — выдвижная часть мебели в форме коробки. Это не про «шкафчик с дверцами для хранения вещей»; выбираем cupboard.",
          "Да: cupboard — шкафчик с дверцами для хранения вещей. Это ровно то, что описано в задании.",
          "Не bookshelf: это «полка или шкаф для книг». В этом вопросе правильный вариант — cupboard.",
          "front door — «главная дверь у входа в дом», а в вопросе нужно «шкафчик с дверцами для хранения вещей». Поэтому выбираем cupboard."
        ],
        "uk": [
          "drawer теж із теми дому, але не означає «a cabinet with doors for storing things». Тут правильна відповідь cupboard.",
          "Так: cupboard означає «a cabinet with doors for storing things». Тримай у голові просту домашню картинку.",
          "bookshelf теж із теми дому, але не означає «a cabinet with doors for storing things». Тут правильна відповідь cupboard.",
          "front door теж із теми дому, але не означає «a cabinet with doors for storing things». Тут правильна відповідь cupboard."
        ],
        "es": [
          "drawer también suena a casa, pero no significa «a cabinet with doors for storing things». La respuesta correcta es cupboard.",
          "Sí: cupboard significa «a cabinet with doors for storing things». La imagen de casa ayuda a recordarlo.",
          "bookshelf también suena a casa, pero no significa «a cabinet with doors for storing things». La respuesta correcta es cupboard.",
          "front door también suena a casa, pero no significa «a cabinet with doors for storing things». La respuesta correcta es cupboard."
        ],
        "pt-BR": [
          "drawer também é do tema casa, mas não significa “a cabinet with doors for storing things”. A resposta certa é cupboard.",
          "Isso: cupboard significa “a cabinet with doors for storing things”. Ligue a palavra a uma cena simples da casa.",
          "bookshelf também é do tema casa, mas não significa “a cabinet with doors for storing things”. A resposta certa é cupboard.",
          "front door também é do tema casa, mas não significa “a cabinet with doors for storing things”. A resposta certa é cupboard."
        ],
        "vi": [
          "drawer cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a cabinet with doors for storing things”. Đáp án đúng là cupboard.",
          "cupboard nghĩa là “a cabinet with doors for storing things”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "bookshelf cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a cabinet with doors for storing things”. Đáp án đúng là cupboard.",
          "front door cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a cabinet with doors for storing things”. Đáp án đúng là cupboard."
        ],
        "id": [
          "drawer masih bertema rumah, tetapi bukan “a cabinet with doors for storing things”. Jawaban yang tepat adalah cupboard.",
          "cupboard berarti “a cabinet with doors for storing things”. Bayangkan benda atau ruang itu di rumah.",
          "bookshelf masih bertema rumah, tetapi bukan “a cabinet with doors for storing things”. Jawaban yang tepat adalah cupboard.",
          "front door masih bertema rumah, tetapi bukan “a cabinet with doors for storing things”. Jawaban yang tepat adalah cupboard."
        ],
        "tr": [
          "drawer ev temasıyla ilgili olabilir, ama “a cabinet with doors for storing things” anlamına gelmez. Doğru cevap cupboard.",
          "Evet: cupboard, “a cabinet with doors for storing things” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "bookshelf ev temasıyla ilgili olabilir, ama “a cabinet with doors for storing things” anlamına gelmez. Doğru cevap cupboard.",
          "front door ev temasıyla ilgili olabilir, ama “a cabinet with doors for storing things” anlamına gelmez. Doğru cevap cupboard."
        ],
        "pl": [
          "drawer też pasuje do tematu domu, ale nie znaczy „a cabinet with doors for storing things”. Poprawna odpowiedź to cupboard.",
          "Tak: cupboard znaczy „a cabinet with doors for storing things”. Połącz słowo z prostym obrazem w domu.",
          "bookshelf też pasuje do tematu domu, ale nie znaczy „a cabinet with doors for storing things”. Poprawna odpowiedź to cupboard.",
          "front door też pasuje do tematu domu, ale nie znaczy „a cabinet with doors for storing things”. Poprawna odpowiedź to cupboard."
        ]
      }
    },
    {
      "id": "home-and-rooms-023",
      "type": "mcq",
      "prompt": "Choose the English word for: furniture with a flat top for eating or placing things.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «мебель с плоской поверхностью для еды или вещей».",
        "uk": "Яке англійське слово або фраза означає «furniture with a flat top for eating or placing things»?",
        "es": "¿Qué palabra o expresión inglesa significa «furniture with a flat top for eating or placing things»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “furniture with a flat top for eating or placing things”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “furniture with a flat top for eating or placing things”?",
        "id": "Kata atau frasa Inggris mana yang berarti “furniture with a flat top for eating or placing things”?",
        "tr": "“furniture with a flat top for eating or placing things” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „furniture with a flat top for eating or placing things”?"
      },
      "choices": [
        "chair",
        "hanger",
        "table",
        "toothbrush"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose table for the home-and-rooms meaning: furniture with a flat top for eating or placing things.",
      "skillTag": "home_furniture",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C23",
        "K23"
      ],
      "choiceRationales": [
        "chair is a plausible home-and-rooms distractor, but it does not mean: furniture with a flat top for eating or placing things.",
        "hanger is a plausible home-and-rooms distractor, but it does not mean: furniture with a flat top for eating or placing things.",
        "table is the only option that matches the tested meaning: furniture with a flat top for eating or placing things.",
        "toothbrush is a plausible home-and-rooms distractor, but it does not mean: furniture with a flat top for eating or placing things."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "chair — сиденье для одного человека. Это не про «мебель с плоской поверхностью для еды или вещей»; выбираем table.",
          "hanger означает «предмет, на который вешают одежду в шкафу». Здесь спрашивают «мебель с плоской поверхностью для еды или вещей»; ответ table.",
          "Да: table — мебель с плоской поверхностью для еды или вещей. Это ровно то, что описано в задании.",
          "toothbrush — «маленькая щетка для чистки зубов», а в вопросе нужно «мебель с плоской поверхностью для еды или вещей». Поэтому выбираем table."
        ],
        "uk": [
          "chair теж із теми дому, але не означає «furniture with a flat top for eating or placing things». Тут правильна відповідь table.",
          "hanger теж із теми дому, але не означає «furniture with a flat top for eating or placing things». Тут правильна відповідь table.",
          "Так: table означає «furniture with a flat top for eating or placing things». Тримай у голові просту домашню картинку.",
          "toothbrush теж із теми дому, але не означає «furniture with a flat top for eating or placing things». Тут правильна відповідь table."
        ],
        "es": [
          "chair también suena a casa, pero no significa «furniture with a flat top for eating or placing things». La respuesta correcta es table.",
          "hanger también suena a casa, pero no significa «furniture with a flat top for eating or placing things». La respuesta correcta es table.",
          "Sí: table significa «furniture with a flat top for eating or placing things». La imagen de casa ayuda a recordarlo.",
          "toothbrush también suena a casa, pero no significa «furniture with a flat top for eating or placing things». La respuesta correcta es table."
        ],
        "pt-BR": [
          "chair também é do tema casa, mas não significa “furniture with a flat top for eating or placing things”. A resposta certa é table.",
          "hanger também é do tema casa, mas não significa “furniture with a flat top for eating or placing things”. A resposta certa é table.",
          "Isso: table significa “furniture with a flat top for eating or placing things”. Ligue a palavra a uma cena simples da casa.",
          "toothbrush também é do tema casa, mas não significa “furniture with a flat top for eating or placing things”. A resposta certa é table."
        ],
        "vi": [
          "chair cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “furniture with a flat top for eating or placing things”. Đáp án đúng là table.",
          "hanger cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “furniture with a flat top for eating or placing things”. Đáp án đúng là table.",
          "table nghĩa là “furniture with a flat top for eating or placing things”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "toothbrush cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “furniture with a flat top for eating or placing things”. Đáp án đúng là table."
        ],
        "id": [
          "chair masih bertema rumah, tetapi bukan “furniture with a flat top for eating or placing things”. Jawaban yang tepat adalah table.",
          "hanger masih bertema rumah, tetapi bukan “furniture with a flat top for eating or placing things”. Jawaban yang tepat adalah table.",
          "table berarti “furniture with a flat top for eating or placing things”. Bayangkan benda atau ruang itu di rumah.",
          "toothbrush masih bertema rumah, tetapi bukan “furniture with a flat top for eating or placing things”. Jawaban yang tepat adalah table."
        ],
        "tr": [
          "chair ev temasıyla ilgili olabilir, ama “furniture with a flat top for eating or placing things” anlamına gelmez. Doğru cevap table.",
          "hanger ev temasıyla ilgili olabilir, ama “furniture with a flat top for eating or placing things” anlamına gelmez. Doğru cevap table.",
          "Evet: table, “furniture with a flat top for eating or placing things” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "toothbrush ev temasıyla ilgili olabilir, ama “furniture with a flat top for eating or placing things” anlamına gelmez. Doğru cevap table."
        ],
        "pl": [
          "chair też pasuje do tematu domu, ale nie znaczy „furniture with a flat top for eating or placing things”. Poprawna odpowiedź to table.",
          "hanger też pasuje do tematu domu, ale nie znaczy „furniture with a flat top for eating or placing things”. Poprawna odpowiedź to table.",
          "Tak: table znaczy „furniture with a flat top for eating or placing things”. Połącz słowo z prostym obrazem w domu.",
          "toothbrush też pasuje do tematu domu, ale nie znaczy „furniture with a flat top for eating or placing things”. Poprawna odpowiedź to table."
        ]
      }
    },
    {
      "id": "home-and-rooms-024",
      "type": "mcq",
      "prompt": "Choose the English word for: a shelf or case for books.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «полка или шкаф для книг».",
        "uk": "Яке англійське слово або фраза означає «a shelf or case for books»?",
        "es": "¿Qué palabra o expresión inglesa significa «a shelf or case for books»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a shelf or case for books”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a shelf or case for books”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a shelf or case for books”?",
        "tr": "“a shelf or case for books” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a shelf or case for books”?"
      },
      "choices": [
        "cupboard",
        "wardrobe",
        "laundry basket",
        "bookshelf"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose bookshelf for the home-and-rooms meaning: a shelf or case for books.",
      "skillTag": "home_storage",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C24",
        "K24"
      ],
      "choiceRationales": [
        "cupboard is a plausible home-and-rooms distractor, but it does not mean: a shelf or case for books.",
        "wardrobe is a plausible home-and-rooms distractor, but it does not mean: a shelf or case for books.",
        "laundry basket is a plausible home-and-rooms distractor, but it does not mean: a shelf or case for books.",
        "bookshelf is the only option that matches the tested meaning: a shelf or case for books."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "cupboard — шкафчик с дверцами для хранения вещей. Это не про «полка или шкаф для книг»; выбираем bookshelf.",
          "wardrobe означает «высокий шкаф для одежды». Здесь спрашивают «полка или шкаф для книг»; ответ bookshelf.",
          "Не laundry basket: это «корзина для грязной или чистой одежды». В этом вопросе правильный вариант — bookshelf.",
          "Да: bookshelf — полка или шкаф для книг. Это ровно то, что описано в задании."
        ],
        "uk": [
          "cupboard теж із теми дому, але не означає «a shelf or case for books». Тут правильна відповідь bookshelf.",
          "wardrobe теж із теми дому, але не означає «a shelf or case for books». Тут правильна відповідь bookshelf.",
          "laundry basket теж із теми дому, але не означає «a shelf or case for books». Тут правильна відповідь bookshelf.",
          "Так: bookshelf означає «a shelf or case for books». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "cupboard también suena a casa, pero no significa «a shelf or case for books». La respuesta correcta es bookshelf.",
          "wardrobe también suena a casa, pero no significa «a shelf or case for books». La respuesta correcta es bookshelf.",
          "laundry basket también suena a casa, pero no significa «a shelf or case for books». La respuesta correcta es bookshelf.",
          "Sí: bookshelf significa «a shelf or case for books». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "cupboard também é do tema casa, mas não significa “a shelf or case for books”. A resposta certa é bookshelf.",
          "wardrobe também é do tema casa, mas não significa “a shelf or case for books”. A resposta certa é bookshelf.",
          "laundry basket também é do tema casa, mas não significa “a shelf or case for books”. A resposta certa é bookshelf.",
          "Isso: bookshelf significa “a shelf or case for books”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "cupboard cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a shelf or case for books”. Đáp án đúng là bookshelf.",
          "wardrobe cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a shelf or case for books”. Đáp án đúng là bookshelf.",
          "laundry basket cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a shelf or case for books”. Đáp án đúng là bookshelf.",
          "bookshelf nghĩa là “a shelf or case for books”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "cupboard masih bertema rumah, tetapi bukan “a shelf or case for books”. Jawaban yang tepat adalah bookshelf.",
          "wardrobe masih bertema rumah, tetapi bukan “a shelf or case for books”. Jawaban yang tepat adalah bookshelf.",
          "laundry basket masih bertema rumah, tetapi bukan “a shelf or case for books”. Jawaban yang tepat adalah bookshelf.",
          "bookshelf berarti “a shelf or case for books”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "cupboard ev temasıyla ilgili olabilir, ama “a shelf or case for books” anlamına gelmez. Doğru cevap bookshelf.",
          "wardrobe ev temasıyla ilgili olabilir, ama “a shelf or case for books” anlamına gelmez. Doğru cevap bookshelf.",
          "laundry basket ev temasıyla ilgili olabilir, ama “a shelf or case for books” anlamına gelmez. Doğru cevap bookshelf.",
          "Evet: bookshelf, “a shelf or case for books” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "cupboard też pasuje do tematu domu, ale nie znaczy „a shelf or case for books”. Poprawna odpowiedź to bookshelf.",
          "wardrobe też pasuje do tematu domu, ale nie znaczy „a shelf or case for books”. Poprawna odpowiedź to bookshelf.",
          "laundry basket też pasuje do tematu domu, ale nie znaczy „a shelf or case for books”. Poprawna odpowiedź to bookshelf.",
          "Tak: bookshelf znaczy „a shelf or case for books”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-025",
      "type": "mcq",
      "prompt": "Choose the English word for: the small control you press to turn a light on or off.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «маленькая кнопка для включения или выключения света».",
        "uk": "Яке англійське слово або фраза означає «the small control you press to turn a light on or off»?",
        "es": "¿Qué palabra o expresión inglesa significa «the small control you press to turn a light on or off»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the small control you press to turn a light on or off”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the small control you press to turn a light on or off”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the small control you press to turn a light on or off”?",
        "tr": "“the small control you press to turn a light on or off” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the small control you press to turn a light on or off”?"
      },
      "choices": [
        "light switch",
        "socket",
        "door handle",
        "key hook"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose light switch for the home-and-rooms meaning: the small control you press to turn a light on or off.",
      "skillTag": "home_parts",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C25",
        "K25"
      ],
      "choiceRationales": [
        "light switch is the only option that matches the tested meaning: the small control you press to turn a light on or off.",
        "socket is a plausible home-and-rooms distractor, but it does not mean: the small control you press to turn a light on or off.",
        "door handle is a plausible home-and-rooms distractor, but it does not mean: the small control you press to turn a light on or off.",
        "key hook is a plausible home-and-rooms distractor, but it does not mean: the small control you press to turn a light on or off."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: light switch — маленькая кнопка для включения или выключения света. Это ровно то, что описано в задании.",
          "socket означает «место в стене, куда вставляют вилку». Здесь спрашивают «маленькая кнопка для включения или выключения света»; ответ light switch.",
          "Не door handle: это «часть двери, за которую берутся, чтобы открыть ее». В этом вопросе правильный вариант — light switch.",
          "key hook — «маленький крючок для ключей», а в вопросе нужно «маленькая кнопка для включения или выключения света». Поэтому выбираем light switch."
        ],
        "uk": [
          "Так: light switch означає «the small control you press to turn a light on or off». Тримай у голові просту домашню картинку.",
          "socket теж із теми дому, але не означає «the small control you press to turn a light on or off». Тут правильна відповідь light switch.",
          "door handle теж із теми дому, але не означає «the small control you press to turn a light on or off». Тут правильна відповідь light switch.",
          "key hook теж із теми дому, але не означає «the small control you press to turn a light on or off». Тут правильна відповідь light switch."
        ],
        "es": [
          "Sí: light switch significa «the small control you press to turn a light on or off». La imagen de casa ayuda a recordarlo.",
          "socket también suena a casa, pero no significa «the small control you press to turn a light on or off». La respuesta correcta es light switch.",
          "door handle también suena a casa, pero no significa «the small control you press to turn a light on or off». La respuesta correcta es light switch.",
          "key hook también suena a casa, pero no significa «the small control you press to turn a light on or off». La respuesta correcta es light switch."
        ],
        "pt-BR": [
          "Isso: light switch significa “the small control you press to turn a light on or off”. Ligue a palavra a uma cena simples da casa.",
          "socket também é do tema casa, mas não significa “the small control you press to turn a light on or off”. A resposta certa é light switch.",
          "door handle também é do tema casa, mas não significa “the small control you press to turn a light on or off”. A resposta certa é light switch.",
          "key hook também é do tema casa, mas não significa “the small control you press to turn a light on or off”. A resposta certa é light switch."
        ],
        "vi": [
          "light switch nghĩa là “the small control you press to turn a light on or off”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "socket cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the small control you press to turn a light on or off”. Đáp án đúng là light switch.",
          "door handle cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the small control you press to turn a light on or off”. Đáp án đúng là light switch.",
          "key hook cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the small control you press to turn a light on or off”. Đáp án đúng là light switch."
        ],
        "id": [
          "light switch berarti “the small control you press to turn a light on or off”. Bayangkan benda atau ruang itu di rumah.",
          "socket masih bertema rumah, tetapi bukan “the small control you press to turn a light on or off”. Jawaban yang tepat adalah light switch.",
          "door handle masih bertema rumah, tetapi bukan “the small control you press to turn a light on or off”. Jawaban yang tepat adalah light switch.",
          "key hook masih bertema rumah, tetapi bukan “the small control you press to turn a light on or off”. Jawaban yang tepat adalah light switch."
        ],
        "tr": [
          "Evet: light switch, “the small control you press to turn a light on or off” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "socket ev temasıyla ilgili olabilir, ama “the small control you press to turn a light on or off” anlamına gelmez. Doğru cevap light switch.",
          "door handle ev temasıyla ilgili olabilir, ama “the small control you press to turn a light on or off” anlamına gelmez. Doğru cevap light switch.",
          "key hook ev temasıyla ilgili olabilir, ama “the small control you press to turn a light on or off” anlamına gelmez. Doğru cevap light switch."
        ],
        "pl": [
          "Tak: light switch znaczy „the small control you press to turn a light on or off”. Połącz słowo z prostym obrazem w domu.",
          "socket też pasuje do tematu domu, ale nie znaczy „the small control you press to turn a light on or off”. Poprawna odpowiedź to light switch.",
          "door handle też pasuje do tematu domu, ale nie znaczy „the small control you press to turn a light on or off”. Poprawna odpowiedź to light switch.",
          "key hook też pasuje do tematu domu, ale nie znaczy „the small control you press to turn a light on or off”. Poprawna odpowiedź to light switch."
        ]
      }
    },
    {
      "id": "home-and-rooms-026",
      "type": "mcq",
      "prompt": "Choose the English word for: steps that connect one floor to another.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «ступени между этажами».",
        "uk": "Яке англійське слово або фраза означає «steps that connect one floor to another»?",
        "es": "¿Qué palabra o expresión inglesa significa «steps that connect one floor to another»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “steps that connect one floor to another”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “steps that connect one floor to another”?",
        "id": "Kata atau frasa Inggris mana yang berarti “steps that connect one floor to another”?",
        "tr": "“steps that connect one floor to another” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „steps that connect one floor to another”?"
      },
      "choices": [
        "hallway",
        "stairs",
        "balcony",
        "porch"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose stairs for the home-and-rooms meaning: steps that connect one floor to another.",
      "skillTag": "home_parts",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C26",
        "K26"
      ],
      "choiceRationales": [
        "hallway is a plausible home-and-rooms distractor, but it does not mean: steps that connect one floor to another.",
        "stairs is the only option that matches the tested meaning: steps that connect one floor to another.",
        "balcony is a plausible home-and-rooms distractor, but it does not mean: steps that connect one floor to another.",
        "porch is a plausible home-and-rooms distractor, but it does not mean: steps that connect one floor to another."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "hallway — узкий проход между комнатами. Это не про «ступени между этажами»; выбираем stairs.",
          "Да: stairs — ступени между этажами. Это ровно то, что описано в задании.",
          "Не balcony: это «небольшая открытая площадка на верхнем этаже». В этом вопросе правильный вариант — stairs.",
          "porch — «крытая площадка у входа в дом», а в вопросе нужно «ступени между этажами». Поэтому выбираем stairs."
        ],
        "uk": [
          "hallway теж із теми дому, але не означає «steps that connect one floor to another». Тут правильна відповідь stairs.",
          "Так: stairs означає «steps that connect one floor to another». Тримай у голові просту домашню картинку.",
          "balcony теж із теми дому, але не означає «steps that connect one floor to another». Тут правильна відповідь stairs.",
          "porch теж із теми дому, але не означає «steps that connect one floor to another». Тут правильна відповідь stairs."
        ],
        "es": [
          "hallway también suena a casa, pero no significa «steps that connect one floor to another». La respuesta correcta es stairs.",
          "Sí: stairs significa «steps that connect one floor to another». La imagen de casa ayuda a recordarlo.",
          "balcony también suena a casa, pero no significa «steps that connect one floor to another». La respuesta correcta es stairs.",
          "porch también suena a casa, pero no significa «steps that connect one floor to another». La respuesta correcta es stairs."
        ],
        "pt-BR": [
          "hallway também é do tema casa, mas não significa “steps that connect one floor to another”. A resposta certa é stairs.",
          "Isso: stairs significa “steps that connect one floor to another”. Ligue a palavra a uma cena simples da casa.",
          "balcony também é do tema casa, mas não significa “steps that connect one floor to another”. A resposta certa é stairs.",
          "porch também é do tema casa, mas não significa “steps that connect one floor to another”. A resposta certa é stairs."
        ],
        "vi": [
          "hallway cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “steps that connect one floor to another”. Đáp án đúng là stairs.",
          "stairs nghĩa là “steps that connect one floor to another”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "balcony cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “steps that connect one floor to another”. Đáp án đúng là stairs.",
          "porch cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “steps that connect one floor to another”. Đáp án đúng là stairs."
        ],
        "id": [
          "hallway masih bertema rumah, tetapi bukan “steps that connect one floor to another”. Jawaban yang tepat adalah stairs.",
          "stairs berarti “steps that connect one floor to another”. Bayangkan benda atau ruang itu di rumah.",
          "balcony masih bertema rumah, tetapi bukan “steps that connect one floor to another”. Jawaban yang tepat adalah stairs.",
          "porch masih bertema rumah, tetapi bukan “steps that connect one floor to another”. Jawaban yang tepat adalah stairs."
        ],
        "tr": [
          "hallway ev temasıyla ilgili olabilir, ama “steps that connect one floor to another” anlamına gelmez. Doğru cevap stairs.",
          "Evet: stairs, “steps that connect one floor to another” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "balcony ev temasıyla ilgili olabilir, ama “steps that connect one floor to another” anlamına gelmez. Doğru cevap stairs.",
          "porch ev temasıyla ilgili olabilir, ama “steps that connect one floor to another” anlamına gelmez. Doğru cevap stairs."
        ],
        "pl": [
          "hallway też pasuje do tematu domu, ale nie znaczy „steps that connect one floor to another”. Poprawna odpowiedź to stairs.",
          "Tak: stairs znaczy „steps that connect one floor to another”. Połącz słowo z prostym obrazem w domu.",
          "balcony też pasuje do tematu domu, ale nie znaczy „steps that connect one floor to another”. Poprawna odpowiedź to stairs.",
          "porch też pasuje do tematu domu, ale nie znaczy „steps that connect one floor to another”. Poprawna odpowiedź to stairs."
        ]
      }
    },
    {
      "id": "home-and-rooms-027",
      "type": "mcq",
      "prompt": "Choose the English word for: a small outside platform on an upper floor.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «небольшая открытая площадка на верхнем этаже».",
        "uk": "Яке англійське слово або фраза означає «a small outside platform on an upper floor»?",
        "es": "¿Qué palabra o expresión inglesa significa «a small outside platform on an upper floor»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a small outside platform on an upper floor”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a small outside platform on an upper floor”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a small outside platform on an upper floor”?",
        "tr": "“a small outside platform on an upper floor” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a small outside platform on an upper floor”?"
      },
      "choices": [
        "basement",
        "attic",
        "balcony",
        "garage"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose balcony for the home-and-rooms meaning: a small outside platform on an upper floor.",
      "skillTag": "home_parts",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C27",
        "K27"
      ],
      "choiceRationales": [
        "basement is a plausible home-and-rooms distractor, but it does not mean: a small outside platform on an upper floor.",
        "attic is a plausible home-and-rooms distractor, but it does not mean: a small outside platform on an upper floor.",
        "balcony is the only option that matches the tested meaning: a small outside platform on an upper floor.",
        "garage is a plausible home-and-rooms distractor, but it does not mean: a small outside platform on an upper floor."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "basement — помещение ниже первого этажа. Это не про «небольшая открытая площадка на верхнем этаже»; выбираем balcony.",
          "attic означает «пространство или комната под крышей». Здесь спрашивают «небольшая открытая площадка на верхнем этаже»; ответ balcony.",
          "Да: balcony — небольшая открытая площадка на верхнем этаже. Это ровно то, что описано в задании.",
          "garage — «место в доме для машины», а в вопросе нужно «небольшая открытая площадка на верхнем этаже». Поэтому выбираем balcony."
        ],
        "uk": [
          "basement теж із теми дому, але не означає «a small outside platform on an upper floor». Тут правильна відповідь balcony.",
          "attic теж із теми дому, але не означає «a small outside platform on an upper floor». Тут правильна відповідь balcony.",
          "Так: balcony означає «a small outside platform on an upper floor». Тримай у голові просту домашню картинку.",
          "garage теж із теми дому, але не означає «a small outside platform on an upper floor». Тут правильна відповідь balcony."
        ],
        "es": [
          "basement también suena a casa, pero no significa «a small outside platform on an upper floor». La respuesta correcta es balcony.",
          "attic también suena a casa, pero no significa «a small outside platform on an upper floor». La respuesta correcta es balcony.",
          "Sí: balcony significa «a small outside platform on an upper floor». La imagen de casa ayuda a recordarlo.",
          "garage también suena a casa, pero no significa «a small outside platform on an upper floor». La respuesta correcta es balcony."
        ],
        "pt-BR": [
          "basement também é do tema casa, mas não significa “a small outside platform on an upper floor”. A resposta certa é balcony.",
          "attic também é do tema casa, mas não significa “a small outside platform on an upper floor”. A resposta certa é balcony.",
          "Isso: balcony significa “a small outside platform on an upper floor”. Ligue a palavra a uma cena simples da casa.",
          "garage também é do tema casa, mas não significa “a small outside platform on an upper floor”. A resposta certa é balcony."
        ],
        "vi": [
          "basement cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small outside platform on an upper floor”. Đáp án đúng là balcony.",
          "attic cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small outside platform on an upper floor”. Đáp án đúng là balcony.",
          "balcony nghĩa là “a small outside platform on an upper floor”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "garage cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small outside platform on an upper floor”. Đáp án đúng là balcony."
        ],
        "id": [
          "basement masih bertema rumah, tetapi bukan “a small outside platform on an upper floor”. Jawaban yang tepat adalah balcony.",
          "attic masih bertema rumah, tetapi bukan “a small outside platform on an upper floor”. Jawaban yang tepat adalah balcony.",
          "balcony berarti “a small outside platform on an upper floor”. Bayangkan benda atau ruang itu di rumah.",
          "garage masih bertema rumah, tetapi bukan “a small outside platform on an upper floor”. Jawaban yang tepat adalah balcony."
        ],
        "tr": [
          "basement ev temasıyla ilgili olabilir, ama “a small outside platform on an upper floor” anlamına gelmez. Doğru cevap balcony.",
          "attic ev temasıyla ilgili olabilir, ama “a small outside platform on an upper floor” anlamına gelmez. Doğru cevap balcony.",
          "Evet: balcony, “a small outside platform on an upper floor” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "garage ev temasıyla ilgili olabilir, ama “a small outside platform on an upper floor” anlamına gelmez. Doğru cevap balcony."
        ],
        "pl": [
          "basement też pasuje do tematu domu, ale nie znaczy „a small outside platform on an upper floor”. Poprawna odpowiedź to balcony.",
          "attic też pasuje do tematu domu, ale nie znaczy „a small outside platform on an upper floor”. Poprawna odpowiedź to balcony.",
          "Tak: balcony znaczy „a small outside platform on an upper floor”. Połącz słowo z prostym obrazem w domu.",
          "garage też pasuje do tematu domu, ale nie znaczy „a small outside platform on an upper floor”. Poprawna odpowiedź to balcony."
        ]
      }
    },
    {
      "id": "home-and-rooms-028",
      "type": "mcq",
      "prompt": "Choose the English word for: a low table usually placed near a sofa.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «низкий столик рядом с диваном».",
        "uk": "Яке англійське слово або фраза означає «a low table usually placed near a sofa»?",
        "es": "¿Qué palabra o expresión inglesa significa «a low table usually placed near a sofa»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a low table usually placed near a sofa”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a low table usually placed near a sofa”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a low table usually placed near a sofa”?",
        "tr": "“a low table usually placed near a sofa” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a low table usually placed near a sofa”?"
      },
      "choices": [
        "dining table",
        "desk",
        "ironing board",
        "coffee table"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose coffee table for the home-and-rooms meaning: a low table usually placed near a sofa.",
      "skillTag": "home_furniture",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C28",
        "K28"
      ],
      "choiceRationales": [
        "dining table is a plausible home-and-rooms distractor, but it does not mean: a low table usually placed near a sofa.",
        "desk is a plausible home-and-rooms distractor, but it does not mean: a low table usually placed near a sofa.",
        "ironing board is a plausible home-and-rooms distractor, but it does not mean: a low table usually placed near a sofa.",
        "coffee table is the only option that matches the tested meaning: a low table usually placed near a sofa."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "dining table — обеденный стол. Это не про «низкий столик рядом с диваном»; выбираем coffee table.",
          "desk означает «стол для учебы или работы». Здесь спрашивают «низкий столик рядом с диваном»; ответ coffee table.",
          "Не ironing board: это «узкая доска для глажки одежды». В этом вопросе правильный вариант — coffee table.",
          "Да: coffee table — низкий столик рядом с диваном. Это ровно то, что описано в задании."
        ],
        "uk": [
          "dining table теж із теми дому, але не означає «a low table usually placed near a sofa». Тут правильна відповідь coffee table.",
          "desk теж із теми дому, але не означає «a low table usually placed near a sofa». Тут правильна відповідь coffee table.",
          "ironing board теж із теми дому, але не означає «a low table usually placed near a sofa». Тут правильна відповідь coffee table.",
          "Так: coffee table означає «a low table usually placed near a sofa». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "dining table también suena a casa, pero no significa «a low table usually placed near a sofa». La respuesta correcta es coffee table.",
          "desk también suena a casa, pero no significa «a low table usually placed near a sofa». La respuesta correcta es coffee table.",
          "ironing board también suena a casa, pero no significa «a low table usually placed near a sofa». La respuesta correcta es coffee table.",
          "Sí: coffee table significa «a low table usually placed near a sofa». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "dining table também é do tema casa, mas não significa “a low table usually placed near a sofa”. A resposta certa é coffee table.",
          "desk também é do tema casa, mas não significa “a low table usually placed near a sofa”. A resposta certa é coffee table.",
          "ironing board também é do tema casa, mas não significa “a low table usually placed near a sofa”. A resposta certa é coffee table.",
          "Isso: coffee table significa “a low table usually placed near a sofa”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "dining table cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a low table usually placed near a sofa”. Đáp án đúng là coffee table.",
          "desk cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a low table usually placed near a sofa”. Đáp án đúng là coffee table.",
          "ironing board cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a low table usually placed near a sofa”. Đáp án đúng là coffee table.",
          "coffee table nghĩa là “a low table usually placed near a sofa”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "dining table masih bertema rumah, tetapi bukan “a low table usually placed near a sofa”. Jawaban yang tepat adalah coffee table.",
          "desk masih bertema rumah, tetapi bukan “a low table usually placed near a sofa”. Jawaban yang tepat adalah coffee table.",
          "ironing board masih bertema rumah, tetapi bukan “a low table usually placed near a sofa”. Jawaban yang tepat adalah coffee table.",
          "coffee table berarti “a low table usually placed near a sofa”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "dining table ev temasıyla ilgili olabilir, ama “a low table usually placed near a sofa” anlamına gelmez. Doğru cevap coffee table.",
          "desk ev temasıyla ilgili olabilir, ama “a low table usually placed near a sofa” anlamına gelmez. Doğru cevap coffee table.",
          "ironing board ev temasıyla ilgili olabilir, ama “a low table usually placed near a sofa” anlamına gelmez. Doğru cevap coffee table.",
          "Evet: coffee table, “a low table usually placed near a sofa” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "dining table też pasuje do tematu domu, ale nie znaczy „a low table usually placed near a sofa”. Poprawna odpowiedź to coffee table.",
          "desk też pasuje do tematu domu, ale nie znaczy „a low table usually placed near a sofa”. Poprawna odpowiedź to coffee table.",
          "ironing board też pasuje do tematu domu, ale nie znaczy „a low table usually placed near a sofa”. Poprawna odpowiedź to coffee table.",
          "Tak: coffee table znaczy „a low table usually placed near a sofa”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-029",
      "type": "mcq",
      "prompt": "Choose the English word for: a television for watching shows or videos.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «устройство для просмотра передач и видео».",
        "uk": "Яке англійське слово або фраза означає «a television for watching shows or videos»?",
        "es": "¿Qué palabra o expresión inglesa significa «a television for watching shows or videos»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a television for watching shows or videos”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a television for watching shows or videos”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a television for watching shows or videos”?",
        "tr": "“a television for watching shows or videos” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a television for watching shows or videos”?"
      },
      "choices": [
        "TV",
        "screen",
        "clock",
        "thermostat"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose TV for the home-and-rooms meaning: a television for watching shows or videos.",
      "skillTag": "home_objects",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C29",
        "K29"
      ],
      "choiceRationales": [
        "TV is the only option that matches the tested meaning: a television for watching shows or videos.",
        "screen is a plausible home-and-rooms distractor, but it does not mean: a television for watching shows or videos.",
        "clock is a plausible home-and-rooms distractor, but it does not mean: a television for watching shows or videos.",
        "thermostat is a plausible home-and-rooms distractor, but it does not mean: a television for watching shows or videos."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: TV — устройство для просмотра передач и видео. Это ровно то, что описано в задании.",
          "screen означает «часть телевизора или устройства, где видно изображение». Здесь спрашивают «устройство для просмотра передач и видео»; ответ TV.",
          "Не clock: это «предмет, который показывает время». В этом вопросе правильный вариант — TV.",
          "thermostat — «регулятор отопления или охлаждения комнаты», а в вопросе нужно «устройство для просмотра передач и видео». Поэтому выбираем TV."
        ],
        "uk": [
          "Так: TV означає «a television for watching shows or videos». Тримай у голові просту домашню картинку.",
          "screen теж із теми дому, але не означає «a television for watching shows or videos». Тут правильна відповідь TV.",
          "clock теж із теми дому, але не означає «a television for watching shows or videos». Тут правильна відповідь TV.",
          "thermostat теж із теми дому, але не означає «a television for watching shows or videos». Тут правильна відповідь TV."
        ],
        "es": [
          "Sí: TV significa «a television for watching shows or videos». La imagen de casa ayuda a recordarlo.",
          "screen también suena a casa, pero no significa «a television for watching shows or videos». La respuesta correcta es TV.",
          "clock también suena a casa, pero no significa «a television for watching shows or videos». La respuesta correcta es TV.",
          "thermostat también suena a casa, pero no significa «a television for watching shows or videos». La respuesta correcta es TV."
        ],
        "pt-BR": [
          "Isso: TV significa “a television for watching shows or videos”. Ligue a palavra a uma cena simples da casa.",
          "screen também é do tema casa, mas não significa “a television for watching shows or videos”. A resposta certa é TV.",
          "clock também é do tema casa, mas não significa “a television for watching shows or videos”. A resposta certa é TV.",
          "thermostat também é do tema casa, mas não significa “a television for watching shows or videos”. A resposta certa é TV."
        ],
        "vi": [
          "TV nghĩa là “a television for watching shows or videos”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "screen cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a television for watching shows or videos”. Đáp án đúng là TV.",
          "clock cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a television for watching shows or videos”. Đáp án đúng là TV.",
          "thermostat cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a television for watching shows or videos”. Đáp án đúng là TV."
        ],
        "id": [
          "TV berarti “a television for watching shows or videos”. Bayangkan benda atau ruang itu di rumah.",
          "screen masih bertema rumah, tetapi bukan “a television for watching shows or videos”. Jawaban yang tepat adalah TV.",
          "clock masih bertema rumah, tetapi bukan “a television for watching shows or videos”. Jawaban yang tepat adalah TV.",
          "thermostat masih bertema rumah, tetapi bukan “a television for watching shows or videos”. Jawaban yang tepat adalah TV."
        ],
        "tr": [
          "Evet: TV, “a television for watching shows or videos” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "screen ev temasıyla ilgili olabilir, ama “a television for watching shows or videos” anlamına gelmez. Doğru cevap TV.",
          "clock ev temasıyla ilgili olabilir, ama “a television for watching shows or videos” anlamına gelmez. Doğru cevap TV.",
          "thermostat ev temasıyla ilgili olabilir, ama “a television for watching shows or videos” anlamına gelmez. Doğru cevap TV."
        ],
        "pl": [
          "Tak: TV znaczy „a television for watching shows or videos”. Połącz słowo z prostym obrazem w domu.",
          "screen też pasuje do tematu domu, ale nie znaczy „a television for watching shows or videos”. Poprawna odpowiedź to TV.",
          "clock też pasuje do tematu domu, ale nie znaczy „a television for watching shows or videos”. Poprawna odpowiedź to TV.",
          "thermostat też pasuje do tematu domu, ale nie znaczy „a television for watching shows or videos”. Poprawna odpowiedź to TV."
        ]
      }
    },
    {
      "id": "home-and-rooms-030",
      "type": "mcq",
      "prompt": "Choose the English word for: the part of a TV or device that shows the picture.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «часть телевизора или устройства, где видно изображение».",
        "uk": "Яке англійське слово або фраза означає «the part of a TV or device that shows the picture»?",
        "es": "¿Qué palabra o expresión inglesa significa «the part of a TV or device that shows the picture»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the part of a TV or device that shows the picture”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the part of a TV or device that shows the picture”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the part of a TV or device that shows the picture”?",
        "tr": "“the part of a TV or device that shows the picture” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the part of a TV or device that shows the picture”?"
      },
      "choices": [
        "mirror",
        "screen",
        "window",
        "smoke alarm"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose screen for the home-and-rooms meaning: the part of a TV or device that shows the picture.",
      "skillTag": "home_objects",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C30",
        "K30"
      ],
      "choiceRationales": [
        "mirror is a plausible home-and-rooms distractor, but it does not mean: the part of a TV or device that shows the picture.",
        "screen is the only option that matches the tested meaning: the part of a TV or device that shows the picture.",
        "window is a plausible home-and-rooms distractor, but it does not mean: the part of a TV or device that shows the picture.",
        "smoke alarm is a plausible home-and-rooms distractor, but it does not mean: the part of a TV or device that shows the picture."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "mirror — стекло, в котором видишь себя. Это не про «часть телевизора или устройства, где видно изображение»; выбираем screen.",
          "Да: screen — часть телевизора или устройства, где видно изображение. Это ровно то, что описано в задании.",
          "Не window: это «стеклянный проем, через который входит свет». В этом вопросе правильный вариант — screen.",
          "smoke alarm — «устройство, которое предупреждает о дыме», а в вопросе нужно «часть телевизора или устройства, где видно изображение». Поэтому выбираем screen."
        ],
        "uk": [
          "mirror теж із теми дому, але не означає «the part of a TV or device that shows the picture». Тут правильна відповідь screen.",
          "Так: screen означає «the part of a TV or device that shows the picture». Тримай у голові просту домашню картинку.",
          "window теж із теми дому, але не означає «the part of a TV or device that shows the picture». Тут правильна відповідь screen.",
          "smoke alarm теж із теми дому, але не означає «the part of a TV or device that shows the picture». Тут правильна відповідь screen."
        ],
        "es": [
          "mirror también suena a casa, pero no significa «the part of a TV or device that shows the picture». La respuesta correcta es screen.",
          "Sí: screen significa «the part of a TV or device that shows the picture». La imagen de casa ayuda a recordarlo.",
          "window también suena a casa, pero no significa «the part of a TV or device that shows the picture». La respuesta correcta es screen.",
          "smoke alarm también suena a casa, pero no significa «the part of a TV or device that shows the picture». La respuesta correcta es screen."
        ],
        "pt-BR": [
          "mirror também é do tema casa, mas não significa “the part of a TV or device that shows the picture”. A resposta certa é screen.",
          "Isso: screen significa “the part of a TV or device that shows the picture”. Ligue a palavra a uma cena simples da casa.",
          "window também é do tema casa, mas não significa “the part of a TV or device that shows the picture”. A resposta certa é screen.",
          "smoke alarm também é do tema casa, mas não significa “the part of a TV or device that shows the picture”. A resposta certa é screen."
        ],
        "vi": [
          "mirror cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the part of a TV or device that shows the picture”. Đáp án đúng là screen.",
          "screen nghĩa là “the part of a TV or device that shows the picture”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "window cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the part of a TV or device that shows the picture”. Đáp án đúng là screen.",
          "smoke alarm cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the part of a TV or device that shows the picture”. Đáp án đúng là screen."
        ],
        "id": [
          "mirror masih bertema rumah, tetapi bukan “the part of a TV or device that shows the picture”. Jawaban yang tepat adalah screen.",
          "screen berarti “the part of a TV or device that shows the picture”. Bayangkan benda atau ruang itu di rumah.",
          "window masih bertema rumah, tetapi bukan “the part of a TV or device that shows the picture”. Jawaban yang tepat adalah screen.",
          "smoke alarm masih bertema rumah, tetapi bukan “the part of a TV or device that shows the picture”. Jawaban yang tepat adalah screen."
        ],
        "tr": [
          "mirror ev temasıyla ilgili olabilir, ama “the part of a TV or device that shows the picture” anlamına gelmez. Doğru cevap screen.",
          "Evet: screen, “the part of a TV or device that shows the picture” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "window ev temasıyla ilgili olabilir, ama “the part of a TV or device that shows the picture” anlamına gelmez. Doğru cevap screen.",
          "smoke alarm ev temasıyla ilgili olabilir, ama “the part of a TV or device that shows the picture” anlamına gelmez. Doğru cevap screen."
        ],
        "pl": [
          "mirror też pasuje do tematu domu, ale nie znaczy „the part of a TV or device that shows the picture”. Poprawna odpowiedź to screen.",
          "Tak: screen znaczy „the part of a TV or device that shows the picture”. Połącz słowo z prostym obrazem w domu.",
          "window też pasuje do tematu domu, ale nie znaczy „the part of a TV or device that shows the picture”. Poprawna odpowiedź to screen.",
          "smoke alarm też pasuje do tematu domu, ale nie znaczy „the part of a TV or device that shows the picture”. Poprawna odpowiedź to screen."
        ]
      }
    },
    {
      "id": "home-and-rooms-031",
      "type": "mcq",
      "prompt": "Choose the English word for: an object that shows the time.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «предмет, который показывает время».",
        "uk": "Яке англійське слово або фраза означає «an object that shows the time»?",
        "es": "¿Qué palabra o expresión inglesa significa «an object that shows the time»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “an object that shows the time”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “an object that shows the time”?",
        "id": "Kata atau frasa Inggris mana yang berarti “an object that shows the time”?",
        "tr": "“an object that shows the time” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „an object that shows the time”?"
      },
      "choices": [
        "lock",
        "key",
        "clock",
        "tap"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose clock for the home-and-rooms meaning: an object that shows the time.",
      "skillTag": "home_objects",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C31",
        "K31"
      ],
      "choiceRationales": [
        "lock is a plausible home-and-rooms distractor, but it does not mean: an object that shows the time.",
        "key is a plausible home-and-rooms distractor, but it does not mean: an object that shows the time.",
        "clock is the only option that matches the tested meaning: an object that shows the time.",
        "tap is a plausible home-and-rooms distractor, but it does not mean: an object that shows the time."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "lock — часть двери, которая закрывает ее на ключ. Это не про «предмет, который показывает время»; выбираем clock.",
          "key означает «маленький металлический предмет для открывания замка». Здесь спрашивают «предмет, который показывает время»; ответ clock.",
          "Да: clock — предмет, который показывает время. Это ровно то, что описано в задании.",
          "tap — «часть, откуда течет вода», а в вопросе нужно «предмет, который показывает время». Поэтому выбираем clock."
        ],
        "uk": [
          "lock теж із теми дому, але не означає «an object that shows the time». Тут правильна відповідь clock.",
          "key теж із теми дому, але не означає «an object that shows the time». Тут правильна відповідь clock.",
          "Так: clock означає «an object that shows the time». Тримай у голові просту домашню картинку.",
          "tap теж із теми дому, але не означає «an object that shows the time». Тут правильна відповідь clock."
        ],
        "es": [
          "lock también suena a casa, pero no significa «an object that shows the time». La respuesta correcta es clock.",
          "key también suena a casa, pero no significa «an object that shows the time». La respuesta correcta es clock.",
          "Sí: clock significa «an object that shows the time». La imagen de casa ayuda a recordarlo.",
          "tap también suena a casa, pero no significa «an object that shows the time». La respuesta correcta es clock."
        ],
        "pt-BR": [
          "lock também é do tema casa, mas não significa “an object that shows the time”. A resposta certa é clock.",
          "key também é do tema casa, mas não significa “an object that shows the time”. A resposta certa é clock.",
          "Isso: clock significa “an object that shows the time”. Ligue a palavra a uma cena simples da casa.",
          "tap também é do tema casa, mas não significa “an object that shows the time”. A resposta certa é clock."
        ],
        "vi": [
          "lock cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “an object that shows the time”. Đáp án đúng là clock.",
          "key cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “an object that shows the time”. Đáp án đúng là clock.",
          "clock nghĩa là “an object that shows the time”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "tap cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “an object that shows the time”. Đáp án đúng là clock."
        ],
        "id": [
          "lock masih bertema rumah, tetapi bukan “an object that shows the time”. Jawaban yang tepat adalah clock.",
          "key masih bertema rumah, tetapi bukan “an object that shows the time”. Jawaban yang tepat adalah clock.",
          "clock berarti “an object that shows the time”. Bayangkan benda atau ruang itu di rumah.",
          "tap masih bertema rumah, tetapi bukan “an object that shows the time”. Jawaban yang tepat adalah clock."
        ],
        "tr": [
          "lock ev temasıyla ilgili olabilir, ama “an object that shows the time” anlamına gelmez. Doğru cevap clock.",
          "key ev temasıyla ilgili olabilir, ama “an object that shows the time” anlamına gelmez. Doğru cevap clock.",
          "Evet: clock, “an object that shows the time” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "tap ev temasıyla ilgili olabilir, ama “an object that shows the time” anlamına gelmez. Doğru cevap clock."
        ],
        "pl": [
          "lock też pasuje do tematu domu, ale nie znaczy „an object that shows the time”. Poprawna odpowiedź to clock.",
          "key też pasuje do tematu domu, ale nie znaczy „an object that shows the time”. Poprawna odpowiedź to clock.",
          "Tak: clock znaczy „an object that shows the time”. Połącz słowo z prostym obrazem w domu.",
          "tap też pasuje do tematu domu, ale nie znaczy „an object that shows the time”. Poprawna odpowiedź to clock."
        ]
      }
    },
    {
      "id": "home-and-rooms-032",
      "type": "mcq",
      "prompt": "Choose the English word for: a small metal object used to open a lock.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «маленький металлический предмет для открывания замка».",
        "uk": "Яке англійське слово або фраза означає «a small metal object used to open a lock»?",
        "es": "¿Qué palabra o expresión inglesa significa «a small metal object used to open a lock»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a small metal object used to open a lock”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a small metal object used to open a lock”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a small metal object used to open a lock”?",
        "tr": "“a small metal object used to open a lock” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a small metal object used to open a lock”?"
      },
      "choices": [
        "lock",
        "plug",
        "remote control",
        "key"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose key for the home-and-rooms meaning: a small metal object used to open a lock.",
      "skillTag": "home_entry",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C32",
        "K32"
      ],
      "choiceRationales": [
        "lock is a plausible home-and-rooms distractor, but it does not mean: a small metal object used to open a lock.",
        "plug is a plausible home-and-rooms distractor, but it does not mean: a small metal object used to open a lock.",
        "remote control is a plausible home-and-rooms distractor, but it does not mean: a small metal object used to open a lock.",
        "key is the only option that matches the tested meaning: a small metal object used to open a lock."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "lock — часть двери, которая закрывает ее на ключ. Это не про «маленький металлический предмет для открывания замка»; выбираем key.",
          "plug означает «конец кабеля, который вставляют в розетку». Здесь спрашивают «маленький металлический предмет для открывания замка»; ответ key.",
          "Не remote control: это «маленькое устройство для управления телевизором». В этом вопросе правильный вариант — key.",
          "Да: key — маленький металлический предмет для открывания замка. Это ровно то, что описано в задании."
        ],
        "uk": [
          "lock теж із теми дому, але не означає «a small metal object used to open a lock». Тут правильна відповідь key.",
          "plug теж із теми дому, але не означає «a small metal object used to open a lock». Тут правильна відповідь key.",
          "remote control теж із теми дому, але не означає «a small metal object used to open a lock». Тут правильна відповідь key.",
          "Так: key означає «a small metal object used to open a lock». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "lock también suena a casa, pero no significa «a small metal object used to open a lock». La respuesta correcta es key.",
          "plug también suena a casa, pero no significa «a small metal object used to open a lock». La respuesta correcta es key.",
          "remote control también suena a casa, pero no significa «a small metal object used to open a lock». La respuesta correcta es key.",
          "Sí: key significa «a small metal object used to open a lock». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "lock também é do tema casa, mas não significa “a small metal object used to open a lock”. A resposta certa é key.",
          "plug também é do tema casa, mas não significa “a small metal object used to open a lock”. A resposta certa é key.",
          "remote control também é do tema casa, mas não significa “a small metal object used to open a lock”. A resposta certa é key.",
          "Isso: key significa “a small metal object used to open a lock”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "lock cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small metal object used to open a lock”. Đáp án đúng là key.",
          "plug cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small metal object used to open a lock”. Đáp án đúng là key.",
          "remote control cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small metal object used to open a lock”. Đáp án đúng là key.",
          "key nghĩa là “a small metal object used to open a lock”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "lock masih bertema rumah, tetapi bukan “a small metal object used to open a lock”. Jawaban yang tepat adalah key.",
          "plug masih bertema rumah, tetapi bukan “a small metal object used to open a lock”. Jawaban yang tepat adalah key.",
          "remote control masih bertema rumah, tetapi bukan “a small metal object used to open a lock”. Jawaban yang tepat adalah key.",
          "key berarti “a small metal object used to open a lock”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "lock ev temasıyla ilgili olabilir, ama “a small metal object used to open a lock” anlamına gelmez. Doğru cevap key.",
          "plug ev temasıyla ilgili olabilir, ama “a small metal object used to open a lock” anlamına gelmez. Doğru cevap key.",
          "remote control ev temasıyla ilgili olabilir, ama “a small metal object used to open a lock” anlamına gelmez. Doğru cevap key.",
          "Evet: key, “a small metal object used to open a lock” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "lock też pasuje do tematu domu, ale nie znaczy „a small metal object used to open a lock”. Poprawna odpowiedź to key.",
          "plug też pasuje do tematu domu, ale nie znaczy „a small metal object used to open a lock”. Poprawna odpowiedź to key.",
          "remote control też pasuje do tematu domu, ale nie znaczy „a small metal object used to open a lock”. Poprawna odpowiedź to key.",
          "Tak: key znaczy „a small metal object used to open a lock”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-033",
      "type": "mcq",
      "prompt": "Choose the English word for: the main door at the entrance of a home.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «главная дверь у входа в дом».",
        "uk": "Яке англійське слово або фраза означає «the main door at the entrance of a home»?",
        "es": "¿Qué palabra o expresión inglesa significa «the main door at the entrance of a home»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the main door at the entrance of a home”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the main door at the entrance of a home”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the main door at the entrance of a home”?",
        "tr": "“the main door at the entrance of a home” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the main door at the entrance of a home”?"
      },
      "choices": [
        "front door",
        "closet",
        "bathroom cabinet",
        "garage"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose front door for the home-and-rooms meaning: the main door at the entrance of a home.",
      "skillTag": "home_entry",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C33",
        "K33"
      ],
      "choiceRationales": [
        "front door is the only option that matches the tested meaning: the main door at the entrance of a home.",
        "closet is a plausible home-and-rooms distractor, but it does not mean: the main door at the entrance of a home.",
        "bathroom cabinet is a plausible home-and-rooms distractor, but it does not mean: the main door at the entrance of a home.",
        "garage is a plausible home-and-rooms distractor, but it does not mean: the main door at the entrance of a home."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: front door — главная дверь у входа в дом. Это ровно то, что описано в задании.",
          "closet означает «небольшое место для хранения одежды или домашних вещей». Здесь спрашивают «главная дверь у входа в дом»; ответ front door.",
          "Не bathroom cabinet: это «шкафчик в ванной для туалетных принадлежностей». В этом вопросе правильный вариант — front door.",
          "garage — «место в доме для машины», а в вопросе нужно «главная дверь у входа в дом». Поэтому выбираем front door."
        ],
        "uk": [
          "Так: front door означає «the main door at the entrance of a home». Тримай у голові просту домашню картинку.",
          "closet теж із теми дому, але не означає «the main door at the entrance of a home». Тут правильна відповідь front door.",
          "bathroom cabinet теж із теми дому, але не означає «the main door at the entrance of a home». Тут правильна відповідь front door.",
          "garage теж із теми дому, але не означає «the main door at the entrance of a home». Тут правильна відповідь front door."
        ],
        "es": [
          "Sí: front door significa «the main door at the entrance of a home». La imagen de casa ayuda a recordarlo.",
          "closet también suena a casa, pero no significa «the main door at the entrance of a home». La respuesta correcta es front door.",
          "bathroom cabinet también suena a casa, pero no significa «the main door at the entrance of a home». La respuesta correcta es front door.",
          "garage también suena a casa, pero no significa «the main door at the entrance of a home». La respuesta correcta es front door."
        ],
        "pt-BR": [
          "Isso: front door significa “the main door at the entrance of a home”. Ligue a palavra a uma cena simples da casa.",
          "closet também é do tema casa, mas não significa “the main door at the entrance of a home”. A resposta certa é front door.",
          "bathroom cabinet também é do tema casa, mas não significa “the main door at the entrance of a home”. A resposta certa é front door.",
          "garage também é do tema casa, mas não significa “the main door at the entrance of a home”. A resposta certa é front door."
        ],
        "vi": [
          "front door nghĩa là “the main door at the entrance of a home”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "closet cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the main door at the entrance of a home”. Đáp án đúng là front door.",
          "bathroom cabinet cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the main door at the entrance of a home”. Đáp án đúng là front door.",
          "garage cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the main door at the entrance of a home”. Đáp án đúng là front door."
        ],
        "id": [
          "front door berarti “the main door at the entrance of a home”. Bayangkan benda atau ruang itu di rumah.",
          "closet masih bertema rumah, tetapi bukan “the main door at the entrance of a home”. Jawaban yang tepat adalah front door.",
          "bathroom cabinet masih bertema rumah, tetapi bukan “the main door at the entrance of a home”. Jawaban yang tepat adalah front door.",
          "garage masih bertema rumah, tetapi bukan “the main door at the entrance of a home”. Jawaban yang tepat adalah front door."
        ],
        "tr": [
          "Evet: front door, “the main door at the entrance of a home” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "closet ev temasıyla ilgili olabilir, ama “the main door at the entrance of a home” anlamına gelmez. Doğru cevap front door.",
          "bathroom cabinet ev temasıyla ilgili olabilir, ama “the main door at the entrance of a home” anlamına gelmez. Doğru cevap front door.",
          "garage ev temasıyla ilgili olabilir, ama “the main door at the entrance of a home” anlamına gelmez. Doğru cevap front door."
        ],
        "pl": [
          "Tak: front door znaczy „the main door at the entrance of a home”. Połącz słowo z prostym obrazem w domu.",
          "closet też pasuje do tematu domu, ale nie znaczy „the main door at the entrance of a home”. Poprawna odpowiedź to front door.",
          "bathroom cabinet też pasuje do tematu domu, ale nie znaczy „the main door at the entrance of a home”. Poprawna odpowiedź to front door.",
          "garage też pasuje do tematu domu, ale nie znaczy „the main door at the entrance of a home”. Poprawna odpowiedź to front door."
        ]
      }
    },
    {
      "id": "home-and-rooms-034",
      "type": "mcq",
      "prompt": "Choose the English word for: a narrow passage between rooms.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «узкий проход между комнатами».",
        "uk": "Яке англійське слово або фраза означає «a narrow passage between rooms»?",
        "es": "¿Qué palabra o expresión inglesa significa «a narrow passage between rooms»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a narrow passage between rooms”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a narrow passage between rooms”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a narrow passage between rooms”?",
        "tr": "“a narrow passage between rooms” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a narrow passage between rooms”?"
      },
      "choices": [
        "living room",
        "hallway",
        "storage room",
        "garden"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose hallway for the home-and-rooms meaning: a narrow passage between rooms.",
      "skillTag": "home_room_name",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C34",
        "K34"
      ],
      "choiceRationales": [
        "living room is a plausible home-and-rooms distractor, but it does not mean: a narrow passage between rooms.",
        "hallway is the only option that matches the tested meaning: a narrow passage between rooms.",
        "storage room is a plausible home-and-rooms distractor, but it does not mean: a narrow passage between rooms.",
        "garden is a plausible home-and-rooms distractor, but it does not mean: a narrow passage between rooms."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "living room — комната, где отдыхают или смотрят телевизор. Это не про «узкий проход между комнатами»; выбираем hallway.",
          "Да: hallway — узкий проход между комнатами. Это ровно то, что описано в задании.",
          "Не storage room: это «комната для хранения вещей не на каждый день». В этом вопросе правильный вариант — hallway.",
          "garden — «участок с растениями рядом с домом», а в вопросе нужно «узкий проход между комнатами». Поэтому выбираем hallway."
        ],
        "uk": [
          "living room теж із теми дому, але не означає «a narrow passage between rooms». Тут правильна відповідь hallway.",
          "Так: hallway означає «a narrow passage between rooms». Тримай у голові просту домашню картинку.",
          "storage room теж із теми дому, але не означає «a narrow passage between rooms». Тут правильна відповідь hallway.",
          "garden теж із теми дому, але не означає «a narrow passage between rooms». Тут правильна відповідь hallway."
        ],
        "es": [
          "living room también suena a casa, pero no significa «a narrow passage between rooms». La respuesta correcta es hallway.",
          "Sí: hallway significa «a narrow passage between rooms». La imagen de casa ayuda a recordarlo.",
          "storage room también suena a casa, pero no significa «a narrow passage between rooms». La respuesta correcta es hallway.",
          "garden también suena a casa, pero no significa «a narrow passage between rooms». La respuesta correcta es hallway."
        ],
        "pt-BR": [
          "living room também é do tema casa, mas não significa “a narrow passage between rooms”. A resposta certa é hallway.",
          "Isso: hallway significa “a narrow passage between rooms”. Ligue a palavra a uma cena simples da casa.",
          "storage room também é do tema casa, mas não significa “a narrow passage between rooms”. A resposta certa é hallway.",
          "garden também é do tema casa, mas não significa “a narrow passage between rooms”. A resposta certa é hallway."
        ],
        "vi": [
          "living room cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a narrow passage between rooms”. Đáp án đúng là hallway.",
          "hallway nghĩa là “a narrow passage between rooms”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "storage room cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a narrow passage between rooms”. Đáp án đúng là hallway.",
          "garden cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a narrow passage between rooms”. Đáp án đúng là hallway."
        ],
        "id": [
          "living room masih bertema rumah, tetapi bukan “a narrow passage between rooms”. Jawaban yang tepat adalah hallway.",
          "hallway berarti “a narrow passage between rooms”. Bayangkan benda atau ruang itu di rumah.",
          "storage room masih bertema rumah, tetapi bukan “a narrow passage between rooms”. Jawaban yang tepat adalah hallway.",
          "garden masih bertema rumah, tetapi bukan “a narrow passage between rooms”. Jawaban yang tepat adalah hallway."
        ],
        "tr": [
          "living room ev temasıyla ilgili olabilir, ama “a narrow passage between rooms” anlamına gelmez. Doğru cevap hallway.",
          "Evet: hallway, “a narrow passage between rooms” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "storage room ev temasıyla ilgili olabilir, ama “a narrow passage between rooms” anlamına gelmez. Doğru cevap hallway.",
          "garden ev temasıyla ilgili olabilir, ama “a narrow passage between rooms” anlamına gelmez. Doğru cevap hallway."
        ],
        "pl": [
          "living room też pasuje do tematu domu, ale nie znaczy „a narrow passage between rooms”. Poprawna odpowiedź to hallway.",
          "Tak: hallway znaczy „a narrow passage between rooms”. Połącz słowo z prostym obrazem w domu.",
          "storage room też pasuje do tematu domu, ale nie znaczy „a narrow passage between rooms”. Poprawna odpowiedź to hallway.",
          "garden też pasuje do tematu domu, ale nie znaczy „a narrow passage between rooms”. Poprawna odpowiedź to hallway."
        ]
      }
    },
    {
      "id": "home-and-rooms-035",
      "type": "mcq",
      "prompt": "Choose the English word for: a place at home for a car.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «место в доме для машины».",
        "uk": "Яке англійське слово або фраза означає «a place at home for a car»?",
        "es": "¿Qué palabra o expresión inglesa significa «a place at home for a car»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a place at home for a car”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a place at home for a car”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a place at home for a car”?",
        "tr": "“a place at home for a car” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a place at home for a car”?"
      },
      "choices": [
        "bathroom",
        "children's room",
        "garage",
        "dining room"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose garage for the home-and-rooms meaning: a place at home for a car.",
      "skillTag": "home_room_name",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C35",
        "K35"
      ],
      "choiceRationales": [
        "bathroom is a plausible home-and-rooms distractor, but it does not mean: a place at home for a car.",
        "children's room is a plausible home-and-rooms distractor, but it does not mean: a place at home for a car.",
        "garage is the only option that matches the tested meaning: a place at home for a car.",
        "dining room is a plausible home-and-rooms distractor, but it does not mean: a place at home for a car."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "bathroom — комната, где моются или пользуются туалетом. Это не про «место в доме для машины»; выбираем garage.",
          "children's room означает «комната для ребенка». Здесь спрашивают «место в доме для машины»; ответ garage.",
          "Да: garage — место в доме для машины. Это ровно то, что описано в задании.",
          "dining room — «комната, где едят», а в вопросе нужно «место в доме для машины». Поэтому выбираем garage."
        ],
        "uk": [
          "bathroom теж із теми дому, але не означає «a place at home for a car». Тут правильна відповідь garage.",
          "children's room теж із теми дому, але не означає «a place at home for a car». Тут правильна відповідь garage.",
          "Так: garage означає «a place at home for a car». Тримай у голові просту домашню картинку.",
          "dining room теж із теми дому, але не означає «a place at home for a car». Тут правильна відповідь garage."
        ],
        "es": [
          "bathroom también suena a casa, pero no significa «a place at home for a car». La respuesta correcta es garage.",
          "children's room también suena a casa, pero no significa «a place at home for a car». La respuesta correcta es garage.",
          "Sí: garage significa «a place at home for a car». La imagen de casa ayuda a recordarlo.",
          "dining room también suena a casa, pero no significa «a place at home for a car». La respuesta correcta es garage."
        ],
        "pt-BR": [
          "bathroom também é do tema casa, mas não significa “a place at home for a car”. A resposta certa é garage.",
          "children's room também é do tema casa, mas não significa “a place at home for a car”. A resposta certa é garage.",
          "Isso: garage significa “a place at home for a car”. Ligue a palavra a uma cena simples da casa.",
          "dining room também é do tema casa, mas não significa “a place at home for a car”. A resposta certa é garage."
        ],
        "vi": [
          "bathroom cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a place at home for a car”. Đáp án đúng là garage.",
          "children's room cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a place at home for a car”. Đáp án đúng là garage.",
          "garage nghĩa là “a place at home for a car”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "dining room cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a place at home for a car”. Đáp án đúng là garage."
        ],
        "id": [
          "bathroom masih bertema rumah, tetapi bukan “a place at home for a car”. Jawaban yang tepat adalah garage.",
          "children's room masih bertema rumah, tetapi bukan “a place at home for a car”. Jawaban yang tepat adalah garage.",
          "garage berarti “a place at home for a car”. Bayangkan benda atau ruang itu di rumah.",
          "dining room masih bertema rumah, tetapi bukan “a place at home for a car”. Jawaban yang tepat adalah garage."
        ],
        "tr": [
          "bathroom ev temasıyla ilgili olabilir, ama “a place at home for a car” anlamına gelmez. Doğru cevap garage.",
          "children's room ev temasıyla ilgili olabilir, ama “a place at home for a car” anlamına gelmez. Doğru cevap garage.",
          "Evet: garage, “a place at home for a car” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "dining room ev temasıyla ilgili olabilir, ama “a place at home for a car” anlamına gelmez. Doğru cevap garage."
        ],
        "pl": [
          "bathroom też pasuje do tematu domu, ale nie znaczy „a place at home for a car”. Poprawna odpowiedź to garage.",
          "children's room też pasuje do tematu domu, ale nie znaczy „a place at home for a car”. Poprawna odpowiedź to garage.",
          "Tak: garage znaczy „a place at home for a car”. Połącz słowo z prostym obrazem w domu.",
          "dining room też pasuje do tematu domu, ale nie znaczy „a place at home for a car”. Poprawna odpowiedź to garage."
        ]
      }
    },
    {
      "id": "home-and-rooms-036",
      "type": "mcq",
      "prompt": "Choose the English word for: a storage unit with doors or drawers.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «модуль для хранения с дверцами или ящиками».",
        "uk": "Яке англійське слово або фраза означає «a storage unit with doors or drawers»?",
        "es": "¿Qué palabra o expresión inglesa significa «a storage unit with doors or drawers»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a storage unit with doors or drawers”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a storage unit with doors or drawers”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a storage unit with doors or drawers”?",
        "tr": "“a storage unit with doors or drawers” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a storage unit with doors or drawers”?"
      },
      "choices": [
        "stair",
        "screen",
        "pillow",
        "cabinet"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose cabinet for the home-and-rooms meaning: a storage unit with doors or drawers.",
      "skillTag": "home_storage",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C36",
        "K36"
      ],
      "choiceRationales": [
        "stair is a plausible home-and-rooms distractor, but it does not mean: a storage unit with doors or drawers.",
        "screen is a plausible home-and-rooms distractor, but it does not mean: a storage unit with doors or drawers.",
        "pillow is a plausible home-and-rooms distractor, but it does not mean: a storage unit with doors or drawers.",
        "cabinet is the only option that matches the tested meaning: a storage unit with doors or drawers."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "stair — ступенька. Это не про «модуль для хранения с дверцами или ящиками»; выбираем cabinet.",
          "screen означает «часть телевизора или устройства, где видно изображение». Здесь спрашивают «модуль для хранения с дверцами или ящиками»; ответ cabinet.",
          "Не pillow: это «мягкая вещь под голову в кровати». В этом вопросе правильный вариант — cabinet.",
          "Да: cabinet — модуль для хранения с дверцами или ящиками. Это ровно то, что описано в задании."
        ],
        "uk": [
          "stair теж із теми дому, але не означає «a storage unit with doors or drawers». Тут правильна відповідь cabinet.",
          "screen теж із теми дому, але не означає «a storage unit with doors or drawers». Тут правильна відповідь cabinet.",
          "pillow теж із теми дому, але не означає «a storage unit with doors or drawers». Тут правильна відповідь cabinet.",
          "Так: cabinet означає «a storage unit with doors or drawers». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "stair también suena a casa, pero no significa «a storage unit with doors or drawers». La respuesta correcta es cabinet.",
          "screen también suena a casa, pero no significa «a storage unit with doors or drawers». La respuesta correcta es cabinet.",
          "pillow también suena a casa, pero no significa «a storage unit with doors or drawers». La respuesta correcta es cabinet.",
          "Sí: cabinet significa «a storage unit with doors or drawers». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "stair também é do tema casa, mas não significa “a storage unit with doors or drawers”. A resposta certa é cabinet.",
          "screen também é do tema casa, mas não significa “a storage unit with doors or drawers”. A resposta certa é cabinet.",
          "pillow também é do tema casa, mas não significa “a storage unit with doors or drawers”. A resposta certa é cabinet.",
          "Isso: cabinet significa “a storage unit with doors or drawers”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "stair cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a storage unit with doors or drawers”. Đáp án đúng là cabinet.",
          "screen cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a storage unit with doors or drawers”. Đáp án đúng là cabinet.",
          "pillow cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a storage unit with doors or drawers”. Đáp án đúng là cabinet.",
          "cabinet nghĩa là “a storage unit with doors or drawers”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "stair masih bertema rumah, tetapi bukan “a storage unit with doors or drawers”. Jawaban yang tepat adalah cabinet.",
          "screen masih bertema rumah, tetapi bukan “a storage unit with doors or drawers”. Jawaban yang tepat adalah cabinet.",
          "pillow masih bertema rumah, tetapi bukan “a storage unit with doors or drawers”. Jawaban yang tepat adalah cabinet.",
          "cabinet berarti “a storage unit with doors or drawers”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "stair ev temasıyla ilgili olabilir, ama “a storage unit with doors or drawers” anlamına gelmez. Doğru cevap cabinet.",
          "screen ev temasıyla ilgili olabilir, ama “a storage unit with doors or drawers” anlamına gelmez. Doğru cevap cabinet.",
          "pillow ev temasıyla ilgili olabilir, ama “a storage unit with doors or drawers” anlamına gelmez. Doğru cevap cabinet.",
          "Evet: cabinet, “a storage unit with doors or drawers” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "stair też pasuje do tematu domu, ale nie znaczy „a storage unit with doors or drawers”. Poprawna odpowiedź to cabinet.",
          "screen też pasuje do tematu domu, ale nie znaczy „a storage unit with doors or drawers”. Poprawna odpowiedź to cabinet.",
          "pillow też pasuje do tematu domu, ale nie znaczy „a storage unit with doors or drawers”. Poprawna odpowiedź to cabinet.",
          "Tak: cabinet znaczy „a storage unit with doors or drawers”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-037",
      "type": "mcq",
      "prompt": "Choose the English word for: the thing used with water to wash hands or body.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «средство для мытья рук или тела».",
        "uk": "Яке англійське слово або фраза означає «the thing used with water to wash hands or body»?",
        "es": "¿Qué palabra o expresión inglesa significa «the thing used with water to wash hands or body»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the thing used with water to wash hands or body”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the thing used with water to wash hands or body”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the thing used with water to wash hands or body”?",
        "tr": "“the thing used with water to wash hands or body” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the thing used with water to wash hands or body”?"
      },
      "choices": [
        "soap",
        "toothpaste",
        "cloth",
        "comb"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose soap for the home-and-rooms meaning: the thing used with water to wash hands or body.",
      "skillTag": "home_bathroom",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C37",
        "K37"
      ],
      "choiceRationales": [
        "soap is the only option that matches the tested meaning: the thing used with water to wash hands or body.",
        "toothpaste is a plausible home-and-rooms distractor, but it does not mean: the thing used with water to wash hands or body.",
        "cloth is a plausible home-and-rooms distractor, but it does not mean: the thing used with water to wash hands or body.",
        "comb is a plausible home-and-rooms distractor, but it does not mean: the thing used with water to wash hands or body."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: soap — средство для мытья рук или тела. Это ровно то, что описано в задании.",
          "toothpaste означает «паста, которую используют с зубной щеткой». Здесь спрашивают «средство для мытья рук или тела»; ответ soap.",
          "Не cloth: это «кусок ткани для уборки или вытирания». В этом вопросе правильный вариант — soap.",
          "comb — «предмет, которым приводят волосы в порядок», а в вопросе нужно «средство для мытья рук или тела». Поэтому выбираем soap."
        ],
        "uk": [
          "Так: soap означає «the thing used with water to wash hands or body». Тримай у голові просту домашню картинку.",
          "toothpaste теж із теми дому, але не означає «the thing used with water to wash hands or body». Тут правильна відповідь soap.",
          "cloth теж із теми дому, але не означає «the thing used with water to wash hands or body». Тут правильна відповідь soap.",
          "comb теж із теми дому, але не означає «the thing used with water to wash hands or body». Тут правильна відповідь soap."
        ],
        "es": [
          "Sí: soap significa «the thing used with water to wash hands or body». La imagen de casa ayuda a recordarlo.",
          "toothpaste también suena a casa, pero no significa «the thing used with water to wash hands or body». La respuesta correcta es soap.",
          "cloth también suena a casa, pero no significa «the thing used with water to wash hands or body». La respuesta correcta es soap.",
          "comb también suena a casa, pero no significa «the thing used with water to wash hands or body». La respuesta correcta es soap."
        ],
        "pt-BR": [
          "Isso: soap significa “the thing used with water to wash hands or body”. Ligue a palavra a uma cena simples da casa.",
          "toothpaste também é do tema casa, mas não significa “the thing used with water to wash hands or body”. A resposta certa é soap.",
          "cloth também é do tema casa, mas não significa “the thing used with water to wash hands or body”. A resposta certa é soap.",
          "comb também é do tema casa, mas não significa “the thing used with water to wash hands or body”. A resposta certa é soap."
        ],
        "vi": [
          "soap nghĩa là “the thing used with water to wash hands or body”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "toothpaste cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the thing used with water to wash hands or body”. Đáp án đúng là soap.",
          "cloth cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the thing used with water to wash hands or body”. Đáp án đúng là soap.",
          "comb cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the thing used with water to wash hands or body”. Đáp án đúng là soap."
        ],
        "id": [
          "soap berarti “the thing used with water to wash hands or body”. Bayangkan benda atau ruang itu di rumah.",
          "toothpaste masih bertema rumah, tetapi bukan “the thing used with water to wash hands or body”. Jawaban yang tepat adalah soap.",
          "cloth masih bertema rumah, tetapi bukan “the thing used with water to wash hands or body”. Jawaban yang tepat adalah soap.",
          "comb masih bertema rumah, tetapi bukan “the thing used with water to wash hands or body”. Jawaban yang tepat adalah soap."
        ],
        "tr": [
          "Evet: soap, “the thing used with water to wash hands or body” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "toothpaste ev temasıyla ilgili olabilir, ama “the thing used with water to wash hands or body” anlamına gelmez. Doğru cevap soap.",
          "cloth ev temasıyla ilgili olabilir, ama “the thing used with water to wash hands or body” anlamına gelmez. Doğru cevap soap.",
          "comb ev temasıyla ilgili olabilir, ama “the thing used with water to wash hands or body” anlamına gelmez. Doğru cevap soap."
        ],
        "pl": [
          "Tak: soap znaczy „the thing used with water to wash hands or body”. Połącz słowo z prostym obrazem w domu.",
          "toothpaste też pasuje do tematu domu, ale nie znaczy „the thing used with water to wash hands or body”. Poprawna odpowiedź to soap.",
          "cloth też pasuje do tematu domu, ale nie znaczy „the thing used with water to wash hands or body”. Poprawna odpowiedź to soap.",
          "comb też pasuje do tematu domu, ale nie znaczy „the thing used with water to wash hands or body”. Poprawna odpowiedź to soap."
        ]
      }
    },
    {
      "id": "home-and-rooms-038",
      "type": "mcq",
      "prompt": "Choose the English word for: a small carpet for part of the floor.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «небольшой ковер на части пола».",
        "uk": "Яке англійське слово або фраза означає «a small carpet for part of the floor»?",
        "es": "¿Qué palabra o expresión inglesa significa «a small carpet for part of the floor»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a small carpet for part of the floor”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a small carpet for part of the floor”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a small carpet for part of the floor”?",
        "tr": "“a small carpet for part of the floor” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a small carpet for part of the floor”?"
      },
      "choices": [
        "curtains",
        "rug",
        "blanket",
        "towel rack"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose rug for the home-and-rooms meaning: a small carpet for part of the floor.",
      "skillTag": "home_objects",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C38",
        "K38"
      ],
      "choiceRationales": [
        "curtains is a plausible home-and-rooms distractor, but it does not mean: a small carpet for part of the floor.",
        "rug is the only option that matches the tested meaning: a small carpet for part of the floor.",
        "blanket is a plausible home-and-rooms distractor, but it does not mean: a small carpet for part of the floor.",
        "towel rack is a plausible home-and-rooms distractor, but it does not mean: a small carpet for part of the floor."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "curtains — ткань, которой закрывают окно. Это не про «небольшой ковер на части пола»; выбираем rug.",
          "Да: rug — небольшой ковер на части пола. Это ровно то, что описано в задании.",
          "Не blanket: это «теплое покрывало для кровати». В этом вопросе правильный вариант — rug.",
          "towel rack — «другой вариант», а в вопросе нужно «небольшой ковер на части пола». Поэтому выбираем rug."
        ],
        "uk": [
          "curtains теж із теми дому, але не означає «a small carpet for part of the floor». Тут правильна відповідь rug.",
          "Так: rug означає «a small carpet for part of the floor». Тримай у голові просту домашню картинку.",
          "blanket теж із теми дому, але не означає «a small carpet for part of the floor». Тут правильна відповідь rug.",
          "towel rack теж із теми дому, але не означає «a small carpet for part of the floor». Тут правильна відповідь rug."
        ],
        "es": [
          "curtains también suena a casa, pero no significa «a small carpet for part of the floor». La respuesta correcta es rug.",
          "Sí: rug significa «a small carpet for part of the floor». La imagen de casa ayuda a recordarlo.",
          "blanket también suena a casa, pero no significa «a small carpet for part of the floor». La respuesta correcta es rug.",
          "towel rack también suena a casa, pero no significa «a small carpet for part of the floor». La respuesta correcta es rug."
        ],
        "pt-BR": [
          "curtains também é do tema casa, mas não significa “a small carpet for part of the floor”. A resposta certa é rug.",
          "Isso: rug significa “a small carpet for part of the floor”. Ligue a palavra a uma cena simples da casa.",
          "blanket também é do tema casa, mas não significa “a small carpet for part of the floor”. A resposta certa é rug.",
          "towel rack também é do tema casa, mas não significa “a small carpet for part of the floor”. A resposta certa é rug."
        ],
        "vi": [
          "curtains cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small carpet for part of the floor”. Đáp án đúng là rug.",
          "rug nghĩa là “a small carpet for part of the floor”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "blanket cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small carpet for part of the floor”. Đáp án đúng là rug.",
          "towel rack cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small carpet for part of the floor”. Đáp án đúng là rug."
        ],
        "id": [
          "curtains masih bertema rumah, tetapi bukan “a small carpet for part of the floor”. Jawaban yang tepat adalah rug.",
          "rug berarti “a small carpet for part of the floor”. Bayangkan benda atau ruang itu di rumah.",
          "blanket masih bertema rumah, tetapi bukan “a small carpet for part of the floor”. Jawaban yang tepat adalah rug.",
          "towel rack masih bertema rumah, tetapi bukan “a small carpet for part of the floor”. Jawaban yang tepat adalah rug."
        ],
        "tr": [
          "curtains ev temasıyla ilgili olabilir, ama “a small carpet for part of the floor” anlamına gelmez. Doğru cevap rug.",
          "Evet: rug, “a small carpet for part of the floor” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "blanket ev temasıyla ilgili olabilir, ama “a small carpet for part of the floor” anlamına gelmez. Doğru cevap rug.",
          "towel rack ev temasıyla ilgili olabilir, ama “a small carpet for part of the floor” anlamına gelmez. Doğru cevap rug."
        ],
        "pl": [
          "curtains też pasuje do tematu domu, ale nie znaczy „a small carpet for part of the floor”. Poprawna odpowiedź to rug.",
          "Tak: rug znaczy „a small carpet for part of the floor”. Połącz słowo z prostym obrazem w domu.",
          "blanket też pasuje do tematu domu, ale nie znaczy „a small carpet for part of the floor”. Poprawna odpowiedź to rug.",
          "towel rack też pasuje do tematu domu, ale nie znaczy „a small carpet for part of the floor”. Poprawna odpowiedź to rug."
        ]
      }
    },
    {
      "id": "home-and-rooms-039",
      "type": "mcq",
      "prompt": "Choose the English word for: a box used to keep household items tidy.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «коробка для хранения домашних вещей».",
        "uk": "Яке англійське слово або фраза означає «a box used to keep household items tidy»?",
        "es": "¿Qué palabra o expresión inglesa significa «a box used to keep household items tidy»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a box used to keep household items tidy”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a box used to keep household items tidy”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a box used to keep household items tidy”?",
        "tr": "“a box used to keep household items tidy” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a box used to keep household items tidy”?"
      },
      "choices": [
        "shoe rack",
        "mailbox",
        "storage box",
        "doorbell"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose storage box for the home-and-rooms meaning: a box used to keep household items tidy.",
      "skillTag": "home_storage",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C39",
        "K39"
      ],
      "choiceRationales": [
        "shoe rack is a plausible home-and-rooms distractor, but it does not mean: a box used to keep household items tidy.",
        "mailbox is a plausible home-and-rooms distractor, but it does not mean: a box used to keep household items tidy.",
        "storage box is the only option that matches the tested meaning: a box used to keep household items tidy.",
        "doorbell is a plausible home-and-rooms distractor, but it does not mean: a box used to keep household items tidy."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "shoe rack — полка или стойка для обуви. Это не про «коробка для хранения домашних вещей»; выбираем storage box.",
          "mailbox означает «ящик, куда доставляют письма». Здесь спрашивают «коробка для хранения домашних вещей»; ответ storage box.",
          "Да: storage box — коробка для хранения домашних вещей. Это ровно то, что описано в задании.",
          "doorbell — «кнопка или устройство у двери для звонка», а в вопросе нужно «коробка для хранения домашних вещей». Поэтому выбираем storage box."
        ],
        "uk": [
          "shoe rack теж із теми дому, але не означає «a box used to keep household items tidy». Тут правильна відповідь storage box.",
          "mailbox теж із теми дому, але не означає «a box used to keep household items tidy». Тут правильна відповідь storage box.",
          "Так: storage box означає «a box used to keep household items tidy». Тримай у голові просту домашню картинку.",
          "doorbell теж із теми дому, але не означає «a box used to keep household items tidy». Тут правильна відповідь storage box."
        ],
        "es": [
          "shoe rack también suena a casa, pero no significa «a box used to keep household items tidy». La respuesta correcta es storage box.",
          "mailbox también suena a casa, pero no significa «a box used to keep household items tidy». La respuesta correcta es storage box.",
          "Sí: storage box significa «a box used to keep household items tidy». La imagen de casa ayuda a recordarlo.",
          "doorbell también suena a casa, pero no significa «a box used to keep household items tidy». La respuesta correcta es storage box."
        ],
        "pt-BR": [
          "shoe rack também é do tema casa, mas não significa “a box used to keep household items tidy”. A resposta certa é storage box.",
          "mailbox também é do tema casa, mas não significa “a box used to keep household items tidy”. A resposta certa é storage box.",
          "Isso: storage box significa “a box used to keep household items tidy”. Ligue a palavra a uma cena simples da casa.",
          "doorbell também é do tema casa, mas não significa “a box used to keep household items tidy”. A resposta certa é storage box."
        ],
        "vi": [
          "shoe rack cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a box used to keep household items tidy”. Đáp án đúng là storage box.",
          "mailbox cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a box used to keep household items tidy”. Đáp án đúng là storage box.",
          "storage box nghĩa là “a box used to keep household items tidy”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "doorbell cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a box used to keep household items tidy”. Đáp án đúng là storage box."
        ],
        "id": [
          "shoe rack masih bertema rumah, tetapi bukan “a box used to keep household items tidy”. Jawaban yang tepat adalah storage box.",
          "mailbox masih bertema rumah, tetapi bukan “a box used to keep household items tidy”. Jawaban yang tepat adalah storage box.",
          "storage box berarti “a box used to keep household items tidy”. Bayangkan benda atau ruang itu di rumah.",
          "doorbell masih bertema rumah, tetapi bukan “a box used to keep household items tidy”. Jawaban yang tepat adalah storage box."
        ],
        "tr": [
          "shoe rack ev temasıyla ilgili olabilir, ama “a box used to keep household items tidy” anlamına gelmez. Doğru cevap storage box.",
          "mailbox ev temasıyla ilgili olabilir, ama “a box used to keep household items tidy” anlamına gelmez. Doğru cevap storage box.",
          "Evet: storage box, “a box used to keep household items tidy” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "doorbell ev temasıyla ilgili olabilir, ama “a box used to keep household items tidy” anlamına gelmez. Doğru cevap storage box."
        ],
        "pl": [
          "shoe rack też pasuje do tematu domu, ale nie znaczy „a box used to keep household items tidy”. Poprawna odpowiedź to storage box.",
          "mailbox też pasuje do tematu domu, ale nie znaczy „a box used to keep household items tidy”. Poprawna odpowiedź to storage box.",
          "Tak: storage box znaczy „a box used to keep household items tidy”. Połącz słowo z prostym obrazem w domu.",
          "doorbell też pasuje do tematu domu, ale nie znaczy „a box used to keep household items tidy”. Poprawna odpowiedź to storage box."
        ]
      }
    },
    {
      "id": "home-and-rooms-040",
      "type": "mcq",
      "prompt": "Choose the English word for: a piece of furniture with several drawers.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «мебель с несколькими выдвижными ящиками».",
        "uk": "Яке англійське слово або фраза означає «a piece of furniture with several drawers»?",
        "es": "¿Qué palabra o expresión inglesa significa «a piece of furniture with several drawers»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a piece of furniture with several drawers”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a piece of furniture with several drawers”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a piece of furniture with several drawers”?",
        "tr": "“a piece of furniture with several drawers” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a piece of furniture with several drawers”?"
      },
      "choices": [
        "bookshelf",
        "coat rack",
        "bath mat",
        "chest of drawers"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose chest of drawers for the home-and-rooms meaning: a piece of furniture with several drawers.",
      "skillTag": "home_storage",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C40",
        "K40"
      ],
      "choiceRationales": [
        "bookshelf is a plausible home-and-rooms distractor, but it does not mean: a piece of furniture with several drawers.",
        "coat rack is a plausible home-and-rooms distractor, but it does not mean: a piece of furniture with several drawers.",
        "bath mat is a plausible home-and-rooms distractor, but it does not mean: a piece of furniture with several drawers.",
        "chest of drawers is the only option that matches the tested meaning: a piece of furniture with several drawers."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "bookshelf — полка или шкаф для книг. Это не про «мебель с несколькими выдвижными ящиками»; выбираем chest of drawers.",
          "coat rack означает «стойка или вешалка для пальто». Здесь спрашивают «мебель с несколькими выдвижными ящиками»; ответ chest of drawers.",
          "Не bath mat: это «коврик на полу в ванной». В этом вопросе правильный вариант — chest of drawers.",
          "Да: chest of drawers — мебель с несколькими выдвижными ящиками. Это ровно то, что описано в задании."
        ],
        "uk": [
          "bookshelf теж із теми дому, але не означає «a piece of furniture with several drawers». Тут правильна відповідь chest of drawers.",
          "coat rack теж із теми дому, але не означає «a piece of furniture with several drawers». Тут правильна відповідь chest of drawers.",
          "bath mat теж із теми дому, але не означає «a piece of furniture with several drawers». Тут правильна відповідь chest of drawers.",
          "Так: chest of drawers означає «a piece of furniture with several drawers». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "bookshelf también suena a casa, pero no significa «a piece of furniture with several drawers». La respuesta correcta es chest of drawers.",
          "coat rack también suena a casa, pero no significa «a piece of furniture with several drawers». La respuesta correcta es chest of drawers.",
          "bath mat también suena a casa, pero no significa «a piece of furniture with several drawers». La respuesta correcta es chest of drawers.",
          "Sí: chest of drawers significa «a piece of furniture with several drawers». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "bookshelf também é do tema casa, mas não significa “a piece of furniture with several drawers”. A resposta certa é chest of drawers.",
          "coat rack também é do tema casa, mas não significa “a piece of furniture with several drawers”. A resposta certa é chest of drawers.",
          "bath mat também é do tema casa, mas não significa “a piece of furniture with several drawers”. A resposta certa é chest of drawers.",
          "Isso: chest of drawers significa “a piece of furniture with several drawers”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "bookshelf cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a piece of furniture with several drawers”. Đáp án đúng là chest of drawers.",
          "coat rack cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a piece of furniture with several drawers”. Đáp án đúng là chest of drawers.",
          "bath mat cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a piece of furniture with several drawers”. Đáp án đúng là chest of drawers.",
          "chest of drawers nghĩa là “a piece of furniture with several drawers”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "bookshelf masih bertema rumah, tetapi bukan “a piece of furniture with several drawers”. Jawaban yang tepat adalah chest of drawers.",
          "coat rack masih bertema rumah, tetapi bukan “a piece of furniture with several drawers”. Jawaban yang tepat adalah chest of drawers.",
          "bath mat masih bertema rumah, tetapi bukan “a piece of furniture with several drawers”. Jawaban yang tepat adalah chest of drawers.",
          "chest of drawers berarti “a piece of furniture with several drawers”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "bookshelf ev temasıyla ilgili olabilir, ama “a piece of furniture with several drawers” anlamına gelmez. Doğru cevap chest of drawers.",
          "coat rack ev temasıyla ilgili olabilir, ama “a piece of furniture with several drawers” anlamına gelmez. Doğru cevap chest of drawers.",
          "bath mat ev temasıyla ilgili olabilir, ama “a piece of furniture with several drawers” anlamına gelmez. Doğru cevap chest of drawers.",
          "Evet: chest of drawers, “a piece of furniture with several drawers” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "bookshelf też pasuje do tematu domu, ale nie znaczy „a piece of furniture with several drawers”. Poprawna odpowiedź to chest of drawers.",
          "coat rack też pasuje do tematu domu, ale nie znaczy „a piece of furniture with several drawers”. Poprawna odpowiedź to chest of drawers.",
          "bath mat też pasuje do tematu domu, ale nie znaczy „a piece of furniture with several drawers”. Poprawna odpowiedź to chest of drawers.",
          "Tak: chest of drawers znaczy „a piece of furniture with several drawers”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-041",
      "type": "mcq",
      "prompt": "Choose the English word for: a tall cupboard for clothes.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «высокий шкаф для одежды».",
        "uk": "Яке англійське слово або фраза означає «a tall cupboard for clothes»?",
        "es": "¿Qué palabra o expresión inglesa significa «a tall cupboard for clothes»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a tall cupboard for clothes”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a tall cupboard for clothes”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a tall cupboard for clothes”?",
        "tr": "“a tall cupboard for clothes” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a tall cupboard for clothes”?"
      },
      "choices": [
        "wardrobe",
        "drawer",
        "medicine cabinet",
        "trash can"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose wardrobe for the home-and-rooms meaning: a tall cupboard for clothes.",
      "skillTag": "home_storage",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C41",
        "K41"
      ],
      "choiceRationales": [
        "wardrobe is the only option that matches the tested meaning: a tall cupboard for clothes.",
        "drawer is a plausible home-and-rooms distractor, but it does not mean: a tall cupboard for clothes.",
        "medicine cabinet is a plausible home-and-rooms distractor, but it does not mean: a tall cupboard for clothes.",
        "trash can is a plausible home-and-rooms distractor, but it does not mean: a tall cupboard for clothes."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: wardrobe — высокий шкаф для одежды. Это ровно то, что описано в задании.",
          "drawer означает «выдвижная часть мебели в форме коробки». Здесь спрашивают «высокий шкаф для одежды»; ответ wardrobe.",
          "Не medicine cabinet: это «шкафчик для лекарств». В этом вопросе правильный вариант — wardrobe.",
          "trash can — «контейнер для мусора», а в вопросе нужно «высокий шкаф для одежды». Поэтому выбираем wardrobe."
        ],
        "uk": [
          "Так: wardrobe означає «a tall cupboard for clothes». Тримай у голові просту домашню картинку.",
          "drawer теж із теми дому, але не означає «a tall cupboard for clothes». Тут правильна відповідь wardrobe.",
          "medicine cabinet теж із теми дому, але не означає «a tall cupboard for clothes». Тут правильна відповідь wardrobe.",
          "trash can теж із теми дому, але не означає «a tall cupboard for clothes». Тут правильна відповідь wardrobe."
        ],
        "es": [
          "Sí: wardrobe significa «a tall cupboard for clothes». La imagen de casa ayuda a recordarlo.",
          "drawer también suena a casa, pero no significa «a tall cupboard for clothes». La respuesta correcta es wardrobe.",
          "medicine cabinet también suena a casa, pero no significa «a tall cupboard for clothes». La respuesta correcta es wardrobe.",
          "trash can también suena a casa, pero no significa «a tall cupboard for clothes». La respuesta correcta es wardrobe."
        ],
        "pt-BR": [
          "Isso: wardrobe significa “a tall cupboard for clothes”. Ligue a palavra a uma cena simples da casa.",
          "drawer também é do tema casa, mas não significa “a tall cupboard for clothes”. A resposta certa é wardrobe.",
          "medicine cabinet também é do tema casa, mas não significa “a tall cupboard for clothes”. A resposta certa é wardrobe.",
          "trash can também é do tema casa, mas não significa “a tall cupboard for clothes”. A resposta certa é wardrobe."
        ],
        "vi": [
          "wardrobe nghĩa là “a tall cupboard for clothes”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "drawer cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a tall cupboard for clothes”. Đáp án đúng là wardrobe.",
          "medicine cabinet cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a tall cupboard for clothes”. Đáp án đúng là wardrobe.",
          "trash can cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a tall cupboard for clothes”. Đáp án đúng là wardrobe."
        ],
        "id": [
          "wardrobe berarti “a tall cupboard for clothes”. Bayangkan benda atau ruang itu di rumah.",
          "drawer masih bertema rumah, tetapi bukan “a tall cupboard for clothes”. Jawaban yang tepat adalah wardrobe.",
          "medicine cabinet masih bertema rumah, tetapi bukan “a tall cupboard for clothes”. Jawaban yang tepat adalah wardrobe.",
          "trash can masih bertema rumah, tetapi bukan “a tall cupboard for clothes”. Jawaban yang tepat adalah wardrobe."
        ],
        "tr": [
          "Evet: wardrobe, “a tall cupboard for clothes” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "drawer ev temasıyla ilgili olabilir, ama “a tall cupboard for clothes” anlamına gelmez. Doğru cevap wardrobe.",
          "medicine cabinet ev temasıyla ilgili olabilir, ama “a tall cupboard for clothes” anlamına gelmez. Doğru cevap wardrobe.",
          "trash can ev temasıyla ilgili olabilir, ama “a tall cupboard for clothes” anlamına gelmez. Doğru cevap wardrobe."
        ],
        "pl": [
          "Tak: wardrobe znaczy „a tall cupboard for clothes”. Połącz słowo z prostym obrazem w domu.",
          "drawer też pasuje do tematu domu, ale nie znaczy „a tall cupboard for clothes”. Poprawna odpowiedź to wardrobe.",
          "medicine cabinet też pasuje do tematu domu, ale nie znaczy „a tall cupboard for clothes”. Poprawna odpowiedź to wardrobe.",
          "trash can też pasuje do tematu domu, ale nie znaczy „a tall cupboard for clothes”. Poprawna odpowiedź to wardrobe."
        ]
      }
    },
    {
      "id": "home-and-rooms-042",
      "type": "mcq",
      "prompt": "Choose the English word for: a small table beside a bed.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «маленький столик рядом с кроватью».",
        "uk": "Яке англійське слово або фраза означає «a small table beside a bed»?",
        "es": "¿Qué palabra o expresión inglesa significa «a small table beside a bed»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a small table beside a bed”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a small table beside a bed”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a small table beside a bed”?",
        "tr": "“a small table beside a bed” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a small table beside a bed”?"
      },
      "choices": [
        "coffee table",
        "bedside table",
        "ironing board",
        "doormat"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose bedside table for the home-and-rooms meaning: a small table beside a bed.",
      "skillTag": "home_bedroom",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C42",
        "K42"
      ],
      "choiceRationales": [
        "coffee table is a plausible home-and-rooms distractor, but it does not mean: a small table beside a bed.",
        "bedside table is the only option that matches the tested meaning: a small table beside a bed.",
        "ironing board is a plausible home-and-rooms distractor, but it does not mean: a small table beside a bed.",
        "doormat is a plausible home-and-rooms distractor, but it does not mean: a small table beside a bed."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "coffee table — низкий столик рядом с диваном. Это не про «маленький столик рядом с кроватью»; выбираем bedside table.",
          "Да: bedside table — маленький столик рядом с кроватью. Это ровно то, что описано в задании.",
          "Не ironing board: это «узкая доска для глажки одежды». В этом вопросе правильный вариант — bedside table.",
          "doormat — «коврик у двери для вытирания обуви», а в вопросе нужно «маленький столик рядом с кроватью». Поэтому выбираем bedside table."
        ],
        "uk": [
          "coffee table теж із теми дому, але не означає «a small table beside a bed». Тут правильна відповідь bedside table.",
          "Так: bedside table означає «a small table beside a bed». Тримай у голові просту домашню картинку.",
          "ironing board теж із теми дому, але не означає «a small table beside a bed». Тут правильна відповідь bedside table.",
          "doormat теж із теми дому, але не означає «a small table beside a bed». Тут правильна відповідь bedside table."
        ],
        "es": [
          "coffee table también suena a casa, pero no significa «a small table beside a bed». La respuesta correcta es bedside table.",
          "Sí: bedside table significa «a small table beside a bed». La imagen de casa ayuda a recordarlo.",
          "ironing board también suena a casa, pero no significa «a small table beside a bed». La respuesta correcta es bedside table.",
          "doormat también suena a casa, pero no significa «a small table beside a bed». La respuesta correcta es bedside table."
        ],
        "pt-BR": [
          "coffee table também é do tema casa, mas não significa “a small table beside a bed”. A resposta certa é bedside table.",
          "Isso: bedside table significa “a small table beside a bed”. Ligue a palavra a uma cena simples da casa.",
          "ironing board também é do tema casa, mas não significa “a small table beside a bed”. A resposta certa é bedside table.",
          "doormat também é do tema casa, mas não significa “a small table beside a bed”. A resposta certa é bedside table."
        ],
        "vi": [
          "coffee table cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small table beside a bed”. Đáp án đúng là bedside table.",
          "bedside table nghĩa là “a small table beside a bed”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "ironing board cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small table beside a bed”. Đáp án đúng là bedside table.",
          "doormat cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small table beside a bed”. Đáp án đúng là bedside table."
        ],
        "id": [
          "coffee table masih bertema rumah, tetapi bukan “a small table beside a bed”. Jawaban yang tepat adalah bedside table.",
          "bedside table berarti “a small table beside a bed”. Bayangkan benda atau ruang itu di rumah.",
          "ironing board masih bertema rumah, tetapi bukan “a small table beside a bed”. Jawaban yang tepat adalah bedside table.",
          "doormat masih bertema rumah, tetapi bukan “a small table beside a bed”. Jawaban yang tepat adalah bedside table."
        ],
        "tr": [
          "coffee table ev temasıyla ilgili olabilir, ama “a small table beside a bed” anlamına gelmez. Doğru cevap bedside table.",
          "Evet: bedside table, “a small table beside a bed” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "ironing board ev temasıyla ilgili olabilir, ama “a small table beside a bed” anlamına gelmez. Doğru cevap bedside table.",
          "doormat ev temasıyla ilgili olabilir, ama “a small table beside a bed” anlamına gelmez. Doğru cevap bedside table."
        ],
        "pl": [
          "coffee table też pasuje do tematu domu, ale nie znaczy „a small table beside a bed”. Poprawna odpowiedź to bedside table.",
          "Tak: bedside table znaczy „a small table beside a bed”. Połącz słowo z prostym obrazem w domu.",
          "ironing board też pasuje do tematu domu, ale nie znaczy „a small table beside a bed”. Poprawna odpowiedź to bedside table.",
          "doormat też pasuje do tematu domu, ale nie znaczy „a small table beside a bed”. Poprawna odpowiedź to bedside table."
        ]
      }
    },
    {
      "id": "home-and-rooms-043",
      "type": "mcq",
      "prompt": "Choose the English word for: a room where people eat meals.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «комната, где едят».",
        "uk": "Яке англійське слово або фраза означає «a room where people eat meals»?",
        "es": "¿Qué palabra o expresión inglesa significa «a room where people eat meals»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a room where people eat meals”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a room where people eat meals”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a room where people eat meals”?",
        "tr": "“a room where people eat meals” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a room where people eat meals”?"
      },
      "choices": [
        "home office",
        "bathroom",
        "dining room",
        "attic"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose dining room for the home-and-rooms meaning: a room where people eat meals.",
      "skillTag": "home_room_name",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C43",
        "K43"
      ],
      "choiceRationales": [
        "home office is a plausible home-and-rooms distractor, but it does not mean: a room where people eat meals.",
        "bathroom is a plausible home-and-rooms distractor, but it does not mean: a room where people eat meals.",
        "dining room is the only option that matches the tested meaning: a room where people eat meals.",
        "attic is a plausible home-and-rooms distractor, but it does not mean: a room where people eat meals."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "home office — место или комната для работы дома. Это не про «комната, где едят»; выбираем dining room.",
          "bathroom означает «комната, где моются или пользуются туалетом». Здесь спрашивают «комната, где едят»; ответ dining room.",
          "Да: dining room — комната, где едят. Это ровно то, что описано в задании.",
          "attic — «пространство или комната под крышей», а в вопросе нужно «комната, где едят». Поэтому выбираем dining room."
        ],
        "uk": [
          "home office теж із теми дому, але не означає «a room where people eat meals». Тут правильна відповідь dining room.",
          "bathroom теж із теми дому, але не означає «a room where people eat meals». Тут правильна відповідь dining room.",
          "Так: dining room означає «a room where people eat meals». Тримай у голові просту домашню картинку.",
          "attic теж із теми дому, але не означає «a room where people eat meals». Тут правильна відповідь dining room."
        ],
        "es": [
          "home office también suena a casa, pero no significa «a room where people eat meals». La respuesta correcta es dining room.",
          "bathroom también suena a casa, pero no significa «a room where people eat meals». La respuesta correcta es dining room.",
          "Sí: dining room significa «a room where people eat meals». La imagen de casa ayuda a recordarlo.",
          "attic también suena a casa, pero no significa «a room where people eat meals». La respuesta correcta es dining room."
        ],
        "pt-BR": [
          "home office também é do tema casa, mas não significa “a room where people eat meals”. A resposta certa é dining room.",
          "bathroom também é do tema casa, mas não significa “a room where people eat meals”. A resposta certa é dining room.",
          "Isso: dining room significa “a room where people eat meals”. Ligue a palavra a uma cena simples da casa.",
          "attic também é do tema casa, mas não significa “a room where people eat meals”. A resposta certa é dining room."
        ],
        "vi": [
          "home office cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room where people eat meals”. Đáp án đúng là dining room.",
          "bathroom cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room where people eat meals”. Đáp án đúng là dining room.",
          "dining room nghĩa là “a room where people eat meals”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "attic cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room where people eat meals”. Đáp án đúng là dining room."
        ],
        "id": [
          "home office masih bertema rumah, tetapi bukan “a room where people eat meals”. Jawaban yang tepat adalah dining room.",
          "bathroom masih bertema rumah, tetapi bukan “a room where people eat meals”. Jawaban yang tepat adalah dining room.",
          "dining room berarti “a room where people eat meals”. Bayangkan benda atau ruang itu di rumah.",
          "attic masih bertema rumah, tetapi bukan “a room where people eat meals”. Jawaban yang tepat adalah dining room."
        ],
        "tr": [
          "home office ev temasıyla ilgili olabilir, ama “a room where people eat meals” anlamına gelmez. Doğru cevap dining room.",
          "bathroom ev temasıyla ilgili olabilir, ama “a room where people eat meals” anlamına gelmez. Doğru cevap dining room.",
          "Evet: dining room, “a room where people eat meals” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "attic ev temasıyla ilgili olabilir, ama “a room where people eat meals” anlamına gelmez. Doğru cevap dining room."
        ],
        "pl": [
          "home office też pasuje do tematu domu, ale nie znaczy „a room where people eat meals”. Poprawna odpowiedź to dining room.",
          "bathroom też pasuje do tematu domu, ale nie znaczy „a room where people eat meals”. Poprawna odpowiedź to dining room.",
          "Tak: dining room znaczy „a room where people eat meals”. Połącz słowo z prostym obrazem w domu.",
          "attic też pasuje do tematu domu, ale nie znaczy „a room where people eat meals”. Poprawna odpowiedź to dining room."
        ]
      }
    },
    {
      "id": "home-and-rooms-044",
      "type": "mcq",
      "prompt": "Choose the English word for: a room or area for working at home.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «место или комната для работы дома».",
        "uk": "Яке англійське слово або фраза означає «a room or area for working at home»?",
        "es": "¿Qué palabra o expresión inglesa significa «a room or area for working at home»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a room or area for working at home”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a room or area for working at home”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a room or area for working at home”?",
        "tr": "“a room or area for working at home” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a room or area for working at home”?"
      },
      "choices": [
        "laundry room",
        "porch",
        "basement",
        "home office"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose home office for the home-and-rooms meaning: a room or area for working at home.",
      "skillTag": "home_room_name",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C44",
        "K44"
      ],
      "choiceRationales": [
        "laundry room is a plausible home-and-rooms distractor, but it does not mean: a room or area for working at home.",
        "porch is a plausible home-and-rooms distractor, but it does not mean: a room or area for working at home.",
        "basement is a plausible home-and-rooms distractor, but it does not mean: a room or area for working at home.",
        "home office is the only option that matches the tested meaning: a room or area for working at home."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "laundry room — комната для стирки одежды. Это не про «место или комната для работы дома»; выбираем home office.",
          "porch означает «крытая площадка у входа в дом». Здесь спрашивают «место или комната для работы дома»; ответ home office.",
          "Не basement: это «помещение ниже первого этажа». В этом вопросе правильный вариант — home office.",
          "Да: home office — место или комната для работы дома. Это ровно то, что описано в задании."
        ],
        "uk": [
          "laundry room теж із теми дому, але не означає «a room or area for working at home». Тут правильна відповідь home office.",
          "porch теж із теми дому, але не означає «a room or area for working at home». Тут правильна відповідь home office.",
          "basement теж із теми дому, але не означає «a room or area for working at home». Тут правильна відповідь home office.",
          "Так: home office означає «a room or area for working at home». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "laundry room también suena a casa, pero no significa «a room or area for working at home». La respuesta correcta es home office.",
          "porch también suena a casa, pero no significa «a room or area for working at home». La respuesta correcta es home office.",
          "basement también suena a casa, pero no significa «a room or area for working at home». La respuesta correcta es home office.",
          "Sí: home office significa «a room or area for working at home». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "laundry room também é do tema casa, mas não significa “a room or area for working at home”. A resposta certa é home office.",
          "porch também é do tema casa, mas não significa “a room or area for working at home”. A resposta certa é home office.",
          "basement também é do tema casa, mas não significa “a room or area for working at home”. A resposta certa é home office.",
          "Isso: home office significa “a room or area for working at home”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "laundry room cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room or area for working at home”. Đáp án đúng là home office.",
          "porch cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room or area for working at home”. Đáp án đúng là home office.",
          "basement cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room or area for working at home”. Đáp án đúng là home office.",
          "home office nghĩa là “a room or area for working at home”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "laundry room masih bertema rumah, tetapi bukan “a room or area for working at home”. Jawaban yang tepat adalah home office.",
          "porch masih bertema rumah, tetapi bukan “a room or area for working at home”. Jawaban yang tepat adalah home office.",
          "basement masih bertema rumah, tetapi bukan “a room or area for working at home”. Jawaban yang tepat adalah home office.",
          "home office berarti “a room or area for working at home”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "laundry room ev temasıyla ilgili olabilir, ama “a room or area for working at home” anlamına gelmez. Doğru cevap home office.",
          "porch ev temasıyla ilgili olabilir, ama “a room or area for working at home” anlamına gelmez. Doğru cevap home office.",
          "basement ev temasıyla ilgili olabilir, ama “a room or area for working at home” anlamına gelmez. Doğru cevap home office.",
          "Evet: home office, “a room or area for working at home” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "laundry room też pasuje do tematu domu, ale nie znaczy „a room or area for working at home”. Poprawna odpowiedź to home office.",
          "porch też pasuje do tematu domu, ale nie znaczy „a room or area for working at home”. Poprawna odpowiedź to home office.",
          "basement też pasuje do tematu domu, ale nie znaczy „a room or area for working at home”. Poprawna odpowiedź to home office.",
          "Tak: home office znaczy „a room or area for working at home”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-045",
      "type": "mcq",
      "prompt": "Choose the English word for: a room for a child at home.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «комната для ребенка».",
        "uk": "Яке англійське слово або фраза означає «a room for a child at home»?",
        "es": "¿Qué palabra o expresión inglesa significa «a room for a child at home»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a room for a child at home”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a room for a child at home”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a room for a child at home”?",
        "tr": "“a room for a child at home” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a room for a child at home”?"
      },
      "choices": [
        "children's room",
        "garage",
        "storage room",
        "kitchen"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose children's room for the home-and-rooms meaning: a room for a child at home.",
      "skillTag": "home_room_name",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C45",
        "K45"
      ],
      "choiceRationales": [
        "children's room is the only option that matches the tested meaning: a room for a child at home.",
        "garage is a plausible home-and-rooms distractor, but it does not mean: a room for a child at home.",
        "storage room is a plausible home-and-rooms distractor, but it does not mean: a room for a child at home.",
        "kitchen is a plausible home-and-rooms distractor, but it does not mean: a room for a child at home."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: children's room — комната для ребенка. Это ровно то, что описано в задании.",
          "garage означает «место в доме для машины». Здесь спрашивают «комната для ребенка»; ответ children's room.",
          "Не storage room: это «комната для хранения вещей не на каждый день». В этом вопросе правильный вариант — children's room.",
          "kitchen — «комната, где готовят еду», а в вопросе нужно «комната для ребенка». Поэтому выбираем children's room."
        ],
        "uk": [
          "Так: children's room означає «a room for a child at home». Тримай у голові просту домашню картинку.",
          "garage теж із теми дому, але не означає «a room for a child at home». Тут правильна відповідь children's room.",
          "storage room теж із теми дому, але не означає «a room for a child at home». Тут правильна відповідь children's room.",
          "kitchen теж із теми дому, але не означає «a room for a child at home». Тут правильна відповідь children's room."
        ],
        "es": [
          "Sí: children's room significa «a room for a child at home». La imagen de casa ayuda a recordarlo.",
          "garage también suena a casa, pero no significa «a room for a child at home». La respuesta correcta es children's room.",
          "storage room también suena a casa, pero no significa «a room for a child at home». La respuesta correcta es children's room.",
          "kitchen también suena a casa, pero no significa «a room for a child at home». La respuesta correcta es children's room."
        ],
        "pt-BR": [
          "Isso: children's room significa “a room for a child at home”. Ligue a palavra a uma cena simples da casa.",
          "garage também é do tema casa, mas não significa “a room for a child at home”. A resposta certa é children's room.",
          "storage room também é do tema casa, mas não significa “a room for a child at home”. A resposta certa é children's room.",
          "kitchen também é do tema casa, mas não significa “a room for a child at home”. A resposta certa é children's room."
        ],
        "vi": [
          "children's room nghĩa là “a room for a child at home”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "garage cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room for a child at home”. Đáp án đúng là children's room.",
          "storage room cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room for a child at home”. Đáp án đúng là children's room.",
          "kitchen cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room for a child at home”. Đáp án đúng là children's room."
        ],
        "id": [
          "children's room berarti “a room for a child at home”. Bayangkan benda atau ruang itu di rumah.",
          "garage masih bertema rumah, tetapi bukan “a room for a child at home”. Jawaban yang tepat adalah children's room.",
          "storage room masih bertema rumah, tetapi bukan “a room for a child at home”. Jawaban yang tepat adalah children's room.",
          "kitchen masih bertema rumah, tetapi bukan “a room for a child at home”. Jawaban yang tepat adalah children's room."
        ],
        "tr": [
          "Evet: children's room, “a room for a child at home” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "garage ev temasıyla ilgili olabilir, ama “a room for a child at home” anlamına gelmez. Doğru cevap children's room.",
          "storage room ev temasıyla ilgili olabilir, ama “a room for a child at home” anlamına gelmez. Doğru cevap children's room.",
          "kitchen ev temasıyla ilgili olabilir, ama “a room for a child at home” anlamına gelmez. Doğru cevap children's room."
        ],
        "pl": [
          "Tak: children's room znaczy „a room for a child at home”. Połącz słowo z prostym obrazem w domu.",
          "garage też pasuje do tematu domu, ale nie znaczy „a room for a child at home”. Poprawna odpowiedź to children's room.",
          "storage room też pasuje do tematu domu, ale nie znaczy „a room for a child at home”. Poprawna odpowiedź to children's room.",
          "kitchen też pasuje do tematu domu, ale nie znaczy „a room for a child at home”. Poprawna odpowiedź to children's room."
        ]
      }
    },
    {
      "id": "home-and-rooms-046",
      "type": "mcq",
      "prompt": "Choose the English word for: the space or room under the roof.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «пространство или комната под крышей».",
        "uk": "Яке англійське слово або фраза означає «the space or room under the roof»?",
        "es": "¿Qué palabra o expresión inglesa significa «the space or room under the roof»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the space or room under the roof”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the space or room under the roof”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the space or room under the roof”?",
        "tr": "“the space or room under the roof” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the space or room under the roof”?"
      },
      "choices": [
        "basement",
        "attic",
        "balcony",
        "hallway"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose attic for the home-and-rooms meaning: the space or room under the roof.",
      "skillTag": "home_room_name",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C46",
        "K46"
      ],
      "choiceRationales": [
        "basement is a plausible home-and-rooms distractor, but it does not mean: the space or room under the roof.",
        "attic is the only option that matches the tested meaning: the space or room under the roof.",
        "balcony is a plausible home-and-rooms distractor, but it does not mean: the space or room under the roof.",
        "hallway is a plausible home-and-rooms distractor, but it does not mean: the space or room under the roof."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "basement — помещение ниже первого этажа. Это не про «пространство или комната под крышей»; выбираем attic.",
          "Да: attic — пространство или комната под крышей. Это ровно то, что описано в задании.",
          "Не balcony: это «небольшая открытая площадка на верхнем этаже». В этом вопросе правильный вариант — attic.",
          "hallway — «узкий проход между комнатами», а в вопросе нужно «пространство или комната под крышей». Поэтому выбираем attic."
        ],
        "uk": [
          "basement теж із теми дому, але не означає «the space or room under the roof». Тут правильна відповідь attic.",
          "Так: attic означає «the space or room under the roof». Тримай у голові просту домашню картинку.",
          "balcony теж із теми дому, але не означає «the space or room under the roof». Тут правильна відповідь attic.",
          "hallway теж із теми дому, але не означає «the space or room under the roof». Тут правильна відповідь attic."
        ],
        "es": [
          "basement también suena a casa, pero no significa «the space or room under the roof». La respuesta correcta es attic.",
          "Sí: attic significa «the space or room under the roof». La imagen de casa ayuda a recordarlo.",
          "balcony también suena a casa, pero no significa «the space or room under the roof». La respuesta correcta es attic.",
          "hallway también suena a casa, pero no significa «the space or room under the roof». La respuesta correcta es attic."
        ],
        "pt-BR": [
          "basement também é do tema casa, mas não significa “the space or room under the roof”. A resposta certa é attic.",
          "Isso: attic significa “the space or room under the roof”. Ligue a palavra a uma cena simples da casa.",
          "balcony também é do tema casa, mas não significa “the space or room under the roof”. A resposta certa é attic.",
          "hallway também é do tema casa, mas não significa “the space or room under the roof”. A resposta certa é attic."
        ],
        "vi": [
          "basement cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the space or room under the roof”. Đáp án đúng là attic.",
          "attic nghĩa là “the space or room under the roof”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "balcony cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the space or room under the roof”. Đáp án đúng là attic.",
          "hallway cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the space or room under the roof”. Đáp án đúng là attic."
        ],
        "id": [
          "basement masih bertema rumah, tetapi bukan “the space or room under the roof”. Jawaban yang tepat adalah attic.",
          "attic berarti “the space or room under the roof”. Bayangkan benda atau ruang itu di rumah.",
          "balcony masih bertema rumah, tetapi bukan “the space or room under the roof”. Jawaban yang tepat adalah attic.",
          "hallway masih bertema rumah, tetapi bukan “the space or room under the roof”. Jawaban yang tepat adalah attic."
        ],
        "tr": [
          "basement ev temasıyla ilgili olabilir, ama “the space or room under the roof” anlamına gelmez. Doğru cevap attic.",
          "Evet: attic, “the space or room under the roof” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "balcony ev temasıyla ilgili olabilir, ama “the space or room under the roof” anlamına gelmez. Doğru cevap attic.",
          "hallway ev temasıyla ilgili olabilir, ama “the space or room under the roof” anlamına gelmez. Doğru cevap attic."
        ],
        "pl": [
          "basement też pasuje do tematu domu, ale nie znaczy „the space or room under the roof”. Poprawna odpowiedź to attic.",
          "Tak: attic znaczy „the space or room under the roof”. Połącz słowo z prostym obrazem w domu.",
          "balcony też pasuje do tematu domu, ale nie znaczy „the space or room under the roof”. Poprawna odpowiedź to attic.",
          "hallway też pasuje do tematu domu, ale nie znaczy „the space or room under the roof”. Poprawna odpowiedź to attic."
        ]
      }
    },
    {
      "id": "home-and-rooms-047",
      "type": "mcq",
      "prompt": "Choose the English word for: the room or space below the ground floor.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «помещение ниже первого этажа».",
        "uk": "Яке англійське слово або фраза означає «the room or space below the ground floor»?",
        "es": "¿Qué palabra o expresión inglesa significa «the room or space below the ground floor»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the room or space below the ground floor”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the room or space below the ground floor”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the room or space below the ground floor”?",
        "tr": "“the room or space below the ground floor” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the room or space below the ground floor”?"
      },
      "choices": [
        "attic",
        "porch",
        "basement",
        "bathroom"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose basement for the home-and-rooms meaning: the room or space below the ground floor.",
      "skillTag": "home_room_name",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C47",
        "K47"
      ],
      "choiceRationales": [
        "attic is a plausible home-and-rooms distractor, but it does not mean: the room or space below the ground floor.",
        "porch is a plausible home-and-rooms distractor, but it does not mean: the room or space below the ground floor.",
        "basement is the only option that matches the tested meaning: the room or space below the ground floor.",
        "bathroom is a plausible home-and-rooms distractor, but it does not mean: the room or space below the ground floor."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "attic — пространство или комната под крышей. Это не про «помещение ниже первого этажа»; выбираем basement.",
          "porch означает «крытая площадка у входа в дом». Здесь спрашивают «помещение ниже первого этажа»; ответ basement.",
          "Да: basement — помещение ниже первого этажа. Это ровно то, что описано в задании.",
          "bathroom — «комната, где моются или пользуются туалетом», а в вопросе нужно «помещение ниже первого этажа». Поэтому выбираем basement."
        ],
        "uk": [
          "attic теж із теми дому, але не означає «the room or space below the ground floor». Тут правильна відповідь basement.",
          "porch теж із теми дому, але не означає «the room or space below the ground floor». Тут правильна відповідь basement.",
          "Так: basement означає «the room or space below the ground floor». Тримай у голові просту домашню картинку.",
          "bathroom теж із теми дому, але не означає «the room or space below the ground floor». Тут правильна відповідь basement."
        ],
        "es": [
          "attic también suena a casa, pero no significa «the room or space below the ground floor». La respuesta correcta es basement.",
          "porch también suena a casa, pero no significa «the room or space below the ground floor». La respuesta correcta es basement.",
          "Sí: basement significa «the room or space below the ground floor». La imagen de casa ayuda a recordarlo.",
          "bathroom también suena a casa, pero no significa «the room or space below the ground floor». La respuesta correcta es basement."
        ],
        "pt-BR": [
          "attic também é do tema casa, mas não significa “the room or space below the ground floor”. A resposta certa é basement.",
          "porch também é do tema casa, mas não significa “the room or space below the ground floor”. A resposta certa é basement.",
          "Isso: basement significa “the room or space below the ground floor”. Ligue a palavra a uma cena simples da casa.",
          "bathroom também é do tema casa, mas não significa “the room or space below the ground floor”. A resposta certa é basement."
        ],
        "vi": [
          "attic cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the room or space below the ground floor”. Đáp án đúng là basement.",
          "porch cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the room or space below the ground floor”. Đáp án đúng là basement.",
          "basement nghĩa là “the room or space below the ground floor”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "bathroom cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the room or space below the ground floor”. Đáp án đúng là basement."
        ],
        "id": [
          "attic masih bertema rumah, tetapi bukan “the room or space below the ground floor”. Jawaban yang tepat adalah basement.",
          "porch masih bertema rumah, tetapi bukan “the room or space below the ground floor”. Jawaban yang tepat adalah basement.",
          "basement berarti “the room or space below the ground floor”. Bayangkan benda atau ruang itu di rumah.",
          "bathroom masih bertema rumah, tetapi bukan “the room or space below the ground floor”. Jawaban yang tepat adalah basement."
        ],
        "tr": [
          "attic ev temasıyla ilgili olabilir, ama “the room or space below the ground floor” anlamına gelmez. Doğru cevap basement.",
          "porch ev temasıyla ilgili olabilir, ama “the room or space below the ground floor” anlamına gelmez. Doğru cevap basement.",
          "Evet: basement, “the room or space below the ground floor” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "bathroom ev temasıyla ilgili olabilir, ama “the room or space below the ground floor” anlamına gelmez. Doğru cevap basement."
        ],
        "pl": [
          "attic też pasuje do tematu domu, ale nie znaczy „the room or space below the ground floor”. Poprawna odpowiedź to basement.",
          "porch też pasuje do tematu domu, ale nie znaczy „the room or space below the ground floor”. Poprawna odpowiedź to basement.",
          "Tak: basement znaczy „the room or space below the ground floor”. Połącz słowo z prostym obrazem w domu.",
          "bathroom też pasuje do tematu domu, ale nie znaczy „the room or space below the ground floor”. Poprawna odpowiedź to basement."
        ]
      }
    },
    {
      "id": "home-and-rooms-048",
      "type": "mcq",
      "prompt": "Choose the English word for: a covered area at the entrance of a house.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «крытая площадка у входа в дом».",
        "uk": "Яке англійське слово або фраза означає «a covered area at the entrance of a house»?",
        "es": "¿Qué palabra o expresión inglesa significa «a covered area at the entrance of a house»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a covered area at the entrance of a house”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a covered area at the entrance of a house”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a covered area at the entrance of a house”?",
        "tr": "“a covered area at the entrance of a house” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a covered area at the entrance of a house”?"
      },
      "choices": [
        "balcony",
        "garage",
        "closet",
        "porch"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose porch for the home-and-rooms meaning: a covered area at the entrance of a house.",
      "skillTag": "home_entry",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C48",
        "K48"
      ],
      "choiceRationales": [
        "balcony is a plausible home-and-rooms distractor, but it does not mean: a covered area at the entrance of a house.",
        "garage is a plausible home-and-rooms distractor, but it does not mean: a covered area at the entrance of a house.",
        "closet is a plausible home-and-rooms distractor, but it does not mean: a covered area at the entrance of a house.",
        "porch is the only option that matches the tested meaning: a covered area at the entrance of a house."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "balcony — небольшая открытая площадка на верхнем этаже. Это не про «крытая площадка у входа в дом»; выбираем porch.",
          "garage означает «место в доме для машины». Здесь спрашивают «крытая площадка у входа в дом»; ответ porch.",
          "Не closet: это «небольшое место для хранения одежды или домашних вещей». В этом вопросе правильный вариант — porch.",
          "Да: porch — крытая площадка у входа в дом. Это ровно то, что описано в задании."
        ],
        "uk": [
          "balcony теж із теми дому, але не означає «a covered area at the entrance of a house». Тут правильна відповідь porch.",
          "garage теж із теми дому, але не означає «a covered area at the entrance of a house». Тут правильна відповідь porch.",
          "closet теж із теми дому, але не означає «a covered area at the entrance of a house». Тут правильна відповідь porch.",
          "Так: porch означає «a covered area at the entrance of a house». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "balcony también suena a casa, pero no significa «a covered area at the entrance of a house». La respuesta correcta es porch.",
          "garage también suena a casa, pero no significa «a covered area at the entrance of a house». La respuesta correcta es porch.",
          "closet también suena a casa, pero no significa «a covered area at the entrance of a house». La respuesta correcta es porch.",
          "Sí: porch significa «a covered area at the entrance of a house». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "balcony também é do tema casa, mas não significa “a covered area at the entrance of a house”. A resposta certa é porch.",
          "garage também é do tema casa, mas não significa “a covered area at the entrance of a house”. A resposta certa é porch.",
          "closet também é do tema casa, mas não significa “a covered area at the entrance of a house”. A resposta certa é porch.",
          "Isso: porch significa “a covered area at the entrance of a house”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "balcony cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a covered area at the entrance of a house”. Đáp án đúng là porch.",
          "garage cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a covered area at the entrance of a house”. Đáp án đúng là porch.",
          "closet cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a covered area at the entrance of a house”. Đáp án đúng là porch.",
          "porch nghĩa là “a covered area at the entrance of a house”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "balcony masih bertema rumah, tetapi bukan “a covered area at the entrance of a house”. Jawaban yang tepat adalah porch.",
          "garage masih bertema rumah, tetapi bukan “a covered area at the entrance of a house”. Jawaban yang tepat adalah porch.",
          "closet masih bertema rumah, tetapi bukan “a covered area at the entrance of a house”. Jawaban yang tepat adalah porch.",
          "porch berarti “a covered area at the entrance of a house”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "balcony ev temasıyla ilgili olabilir, ama “a covered area at the entrance of a house” anlamına gelmez. Doğru cevap porch.",
          "garage ev temasıyla ilgili olabilir, ama “a covered area at the entrance of a house” anlamına gelmez. Doğru cevap porch.",
          "closet ev temasıyla ilgili olabilir, ama “a covered area at the entrance of a house” anlamına gelmez. Doğru cevap porch.",
          "Evet: porch, “a covered area at the entrance of a house” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "balcony też pasuje do tematu domu, ale nie znaczy „a covered area at the entrance of a house”. Poprawna odpowiedź to porch.",
          "garage też pasuje do tematu domu, ale nie znaczy „a covered area at the entrance of a house”. Poprawna odpowiedź to porch.",
          "closet też pasuje do tematu domu, ale nie znaczy „a covered area at the entrance of a house”. Poprawna odpowiedź to porch.",
          "Tak: porch znaczy „a covered area at the entrance of a house”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-049",
      "type": "mcq",
      "prompt": "Choose the English word for: the outside area with plants near a home.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «участок с растениями рядом с домом».",
        "uk": "Яке англійське слово або фраза означає «the outside area with plants near a home»?",
        "es": "¿Qué palabra o expresión inglesa significa «the outside area with plants near a home»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the outside area with plants near a home”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the outside area with plants near a home”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the outside area with plants near a home”?",
        "tr": "“the outside area with plants near a home” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the outside area with plants near a home”?"
      },
      "choices": [
        "garden",
        "bathroom",
        "laundry room",
        "hallway"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose garden for the home-and-rooms meaning: the outside area with plants near a home.",
      "skillTag": "home_outside",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C49",
        "K49"
      ],
      "choiceRationales": [
        "garden is the only option that matches the tested meaning: the outside area with plants near a home.",
        "bathroom is a plausible home-and-rooms distractor, but it does not mean: the outside area with plants near a home.",
        "laundry room is a plausible home-and-rooms distractor, but it does not mean: the outside area with plants near a home.",
        "hallway is a plausible home-and-rooms distractor, but it does not mean: the outside area with plants near a home."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: garden — участок с растениями рядом с домом. Это ровно то, что описано в задании.",
          "bathroom означает «комната, где моются или пользуются туалетом». Здесь спрашивают «участок с растениями рядом с домом»; ответ garden.",
          "Не laundry room: это «комната для стирки одежды». В этом вопросе правильный вариант — garden.",
          "hallway — «узкий проход между комнатами», а в вопросе нужно «участок с растениями рядом с домом». Поэтому выбираем garden."
        ],
        "uk": [
          "Так: garden означає «the outside area with plants near a home». Тримай у голові просту домашню картинку.",
          "bathroom теж із теми дому, але не означає «the outside area with plants near a home». Тут правильна відповідь garden.",
          "laundry room теж із теми дому, але не означає «the outside area with plants near a home». Тут правильна відповідь garden.",
          "hallway теж із теми дому, але не означає «the outside area with plants near a home». Тут правильна відповідь garden."
        ],
        "es": [
          "Sí: garden significa «the outside area with plants near a home». La imagen de casa ayuda a recordarlo.",
          "bathroom también suena a casa, pero no significa «the outside area with plants near a home». La respuesta correcta es garden.",
          "laundry room también suena a casa, pero no significa «the outside area with plants near a home». La respuesta correcta es garden.",
          "hallway también suena a casa, pero no significa «the outside area with plants near a home». La respuesta correcta es garden."
        ],
        "pt-BR": [
          "Isso: garden significa “the outside area with plants near a home”. Ligue a palavra a uma cena simples da casa.",
          "bathroom também é do tema casa, mas não significa “the outside area with plants near a home”. A resposta certa é garden.",
          "laundry room também é do tema casa, mas não significa “the outside area with plants near a home”. A resposta certa é garden.",
          "hallway também é do tema casa, mas não significa “the outside area with plants near a home”. A resposta certa é garden."
        ],
        "vi": [
          "garden nghĩa là “the outside area with plants near a home”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "bathroom cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the outside area with plants near a home”. Đáp án đúng là garden.",
          "laundry room cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the outside area with plants near a home”. Đáp án đúng là garden.",
          "hallway cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the outside area with plants near a home”. Đáp án đúng là garden."
        ],
        "id": [
          "garden berarti “the outside area with plants near a home”. Bayangkan benda atau ruang itu di rumah.",
          "bathroom masih bertema rumah, tetapi bukan “the outside area with plants near a home”. Jawaban yang tepat adalah garden.",
          "laundry room masih bertema rumah, tetapi bukan “the outside area with plants near a home”. Jawaban yang tepat adalah garden.",
          "hallway masih bertema rumah, tetapi bukan “the outside area with plants near a home”. Jawaban yang tepat adalah garden."
        ],
        "tr": [
          "Evet: garden, “the outside area with plants near a home” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "bathroom ev temasıyla ilgili olabilir, ama “the outside area with plants near a home” anlamına gelmez. Doğru cevap garden.",
          "laundry room ev temasıyla ilgili olabilir, ama “the outside area with plants near a home” anlamına gelmez. Doğru cevap garden.",
          "hallway ev temasıyla ilgili olabilir, ama “the outside area with plants near a home” anlamına gelmez. Doğru cevap garden."
        ],
        "pl": [
          "Tak: garden znaczy „the outside area with plants near a home”. Połącz słowo z prostym obrazem w domu.",
          "bathroom też pasuje do tematu domu, ale nie znaczy „the outside area with plants near a home”. Poprawna odpowiedź to garden.",
          "laundry room też pasuje do tematu domu, ale nie znaczy „the outside area with plants near a home”. Poprawna odpowiedź to garden.",
          "hallway też pasuje do tematu domu, ale nie znaczy „the outside area with plants near a home”. Poprawna odpowiedź to garden."
        ]
      }
    },
    {
      "id": "home-and-rooms-050",
      "type": "mcq",
      "prompt": "Choose the English word for: a barrier around a garden or home area.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «ограждение вокруг участка или дома».",
        "uk": "Яке англійське слово або фраза означає «a barrier around a garden or home area»?",
        "es": "¿Qué palabra o expresión inglesa significa «a barrier around a garden or home area»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a barrier around a garden or home area”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a barrier around a garden or home area”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a barrier around a garden or home area”?",
        "tr": "“a barrier around a garden or home area” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a barrier around a garden or home area”?"
      },
      "choices": [
        "gate",
        "fence",
        "wall",
        "clothesline"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose fence for the home-and-rooms meaning: a barrier around a garden or home area.",
      "skillTag": "home_outside",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C50",
        "K50"
      ],
      "choiceRationales": [
        "gate is a plausible home-and-rooms distractor, but it does not mean: a barrier around a garden or home area.",
        "fence is the only option that matches the tested meaning: a barrier around a garden or home area.",
        "wall is a plausible home-and-rooms distractor, but it does not mean: a barrier around a garden or home area.",
        "clothesline is a plausible home-and-rooms distractor, but it does not mean: a barrier around a garden or home area."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "gate — другой вариант. Это не про «ограждение вокруг участка или дома»; выбираем fence.",
          "Да: fence — ограждение вокруг участка или дома. Это ровно то, что описано в задании.",
          "Не wall: это «вертикальная сторона комнаты». В этом вопросе правильный вариант — fence.",
          "clothesline — «веревка или линия, на которой сушат одежду», а в вопросе нужно «ограждение вокруг участка или дома». Поэтому выбираем fence."
        ],
        "uk": [
          "gate теж із теми дому, але не означає «a barrier around a garden or home area». Тут правильна відповідь fence.",
          "Так: fence означає «a barrier around a garden or home area». Тримай у голові просту домашню картинку.",
          "wall теж із теми дому, але не означає «a barrier around a garden or home area». Тут правильна відповідь fence.",
          "clothesline теж із теми дому, але не означає «a barrier around a garden or home area». Тут правильна відповідь fence."
        ],
        "es": [
          "gate también suena a casa, pero no significa «a barrier around a garden or home area». La respuesta correcta es fence.",
          "Sí: fence significa «a barrier around a garden or home area». La imagen de casa ayuda a recordarlo.",
          "wall también suena a casa, pero no significa «a barrier around a garden or home area». La respuesta correcta es fence.",
          "clothesline también suena a casa, pero no significa «a barrier around a garden or home area». La respuesta correcta es fence."
        ],
        "pt-BR": [
          "gate também é do tema casa, mas não significa “a barrier around a garden or home area”. A resposta certa é fence.",
          "Isso: fence significa “a barrier around a garden or home area”. Ligue a palavra a uma cena simples da casa.",
          "wall também é do tema casa, mas não significa “a barrier around a garden or home area”. A resposta certa é fence.",
          "clothesline também é do tema casa, mas não significa “a barrier around a garden or home area”. A resposta certa é fence."
        ],
        "vi": [
          "gate cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a barrier around a garden or home area”. Đáp án đúng là fence.",
          "fence nghĩa là “a barrier around a garden or home area”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "wall cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a barrier around a garden or home area”. Đáp án đúng là fence.",
          "clothesline cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a barrier around a garden or home area”. Đáp án đúng là fence."
        ],
        "id": [
          "gate masih bertema rumah, tetapi bukan “a barrier around a garden or home area”. Jawaban yang tepat adalah fence.",
          "fence berarti “a barrier around a garden or home area”. Bayangkan benda atau ruang itu di rumah.",
          "wall masih bertema rumah, tetapi bukan “a barrier around a garden or home area”. Jawaban yang tepat adalah fence.",
          "clothesline masih bertema rumah, tetapi bukan “a barrier around a garden or home area”. Jawaban yang tepat adalah fence."
        ],
        "tr": [
          "gate ev temasıyla ilgili olabilir, ama “a barrier around a garden or home area” anlamına gelmez. Doğru cevap fence.",
          "Evet: fence, “a barrier around a garden or home area” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "wall ev temasıyla ilgili olabilir, ama “a barrier around a garden or home area” anlamına gelmez. Doğru cevap fence.",
          "clothesline ev temasıyla ilgili olabilir, ama “a barrier around a garden or home area” anlamına gelmez. Doğru cevap fence."
        ],
        "pl": [
          "gate też pasuje do tematu domu, ale nie znaczy „a barrier around a garden or home area”. Poprawna odpowiedź to fence.",
          "Tak: fence znaczy „a barrier around a garden or home area”. Połącz słowo z prostym obrazem w domu.",
          "wall też pasuje do tematu domu, ale nie znaczy „a barrier around a garden or home area”. Poprawna odpowiedź to fence.",
          "clothesline też pasuje do tematu domu, ale nie znaczy „a barrier around a garden or home area”. Poprawna odpowiedź to fence."
        ]
      }
    },
    {
      "id": "home-and-rooms-051",
      "type": "mcq",
      "prompt": "Choose the English word for: a box where letters are delivered.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «ящик, куда доставляют письма».",
        "uk": "Яке англійське слово або фраза означає «a box where letters are delivered»?",
        "es": "¿Qué palabra o expresión inglesa significa «a box where letters are delivered»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a box where letters are delivered”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a box where letters are delivered”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a box where letters are delivered”?",
        "tr": "“a box where letters are delivered” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a box where letters are delivered”?"
      },
      "choices": [
        "medicine cabinet",
        "storage box",
        "mailbox",
        "trash can"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose mailbox for the home-and-rooms meaning: a box where letters are delivered.",
      "skillTag": "home_entry",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C51",
        "K51"
      ],
      "choiceRationales": [
        "medicine cabinet is a plausible home-and-rooms distractor, but it does not mean: a box where letters are delivered.",
        "storage box is a plausible home-and-rooms distractor, but it does not mean: a box where letters are delivered.",
        "mailbox is the only option that matches the tested meaning: a box where letters are delivered.",
        "trash can is a plausible home-and-rooms distractor, but it does not mean: a box where letters are delivered."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "medicine cabinet — шкафчик для лекарств. Это не про «ящик, куда доставляют письма»; выбираем mailbox.",
          "storage box означает «коробка для хранения домашних вещей». Здесь спрашивают «ящик, куда доставляют письма»; ответ mailbox.",
          "Да: mailbox — ящик, куда доставляют письма. Это ровно то, что описано в задании.",
          "trash can — «контейнер для мусора», а в вопросе нужно «ящик, куда доставляют письма». Поэтому выбираем mailbox."
        ],
        "uk": [
          "medicine cabinet теж із теми дому, але не означає «a box where letters are delivered». Тут правильна відповідь mailbox.",
          "storage box теж із теми дому, але не означає «a box where letters are delivered». Тут правильна відповідь mailbox.",
          "Так: mailbox означає «a box where letters are delivered». Тримай у голові просту домашню картинку.",
          "trash can теж із теми дому, але не означає «a box where letters are delivered». Тут правильна відповідь mailbox."
        ],
        "es": [
          "medicine cabinet también suena a casa, pero no significa «a box where letters are delivered». La respuesta correcta es mailbox.",
          "storage box también suena a casa, pero no significa «a box where letters are delivered». La respuesta correcta es mailbox.",
          "Sí: mailbox significa «a box where letters are delivered». La imagen de casa ayuda a recordarlo.",
          "trash can también suena a casa, pero no significa «a box where letters are delivered». La respuesta correcta es mailbox."
        ],
        "pt-BR": [
          "medicine cabinet também é do tema casa, mas não significa “a box where letters are delivered”. A resposta certa é mailbox.",
          "storage box também é do tema casa, mas não significa “a box where letters are delivered”. A resposta certa é mailbox.",
          "Isso: mailbox significa “a box where letters are delivered”. Ligue a palavra a uma cena simples da casa.",
          "trash can também é do tema casa, mas não significa “a box where letters are delivered”. A resposta certa é mailbox."
        ],
        "vi": [
          "medicine cabinet cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a box where letters are delivered”. Đáp án đúng là mailbox.",
          "storage box cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a box where letters are delivered”. Đáp án đúng là mailbox.",
          "mailbox nghĩa là “a box where letters are delivered”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "trash can cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a box where letters are delivered”. Đáp án đúng là mailbox."
        ],
        "id": [
          "medicine cabinet masih bertema rumah, tetapi bukan “a box where letters are delivered”. Jawaban yang tepat adalah mailbox.",
          "storage box masih bertema rumah, tetapi bukan “a box where letters are delivered”. Jawaban yang tepat adalah mailbox.",
          "mailbox berarti “a box where letters are delivered”. Bayangkan benda atau ruang itu di rumah.",
          "trash can masih bertema rumah, tetapi bukan “a box where letters are delivered”. Jawaban yang tepat adalah mailbox."
        ],
        "tr": [
          "medicine cabinet ev temasıyla ilgili olabilir, ama “a box where letters are delivered” anlamına gelmez. Doğru cevap mailbox.",
          "storage box ev temasıyla ilgili olabilir, ama “a box where letters are delivered” anlamına gelmez. Doğru cevap mailbox.",
          "Evet: mailbox, “a box where letters are delivered” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "trash can ev temasıyla ilgili olabilir, ama “a box where letters are delivered” anlamına gelmez. Doğru cevap mailbox."
        ],
        "pl": [
          "medicine cabinet też pasuje do tematu domu, ale nie znaczy „a box where letters are delivered”. Poprawna odpowiedź to mailbox.",
          "storage box też pasuje do tematu domu, ale nie znaczy „a box where letters are delivered”. Poprawna odpowiedź to mailbox.",
          "Tak: mailbox znaczy „a box where letters are delivered”. Połącz słowo z prostym obrazem w domu.",
          "trash can też pasuje do tematu domu, ale nie znaczy „a box where letters are delivered”. Poprawna odpowiedź to mailbox."
        ]
      }
    },
    {
      "id": "home-and-rooms-052",
      "type": "mcq",
      "prompt": "Choose the English word for: a small device used to control a TV.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «маленькое устройство для управления телевизором».",
        "uk": "Яке англійське слово або фраза означає «a small device used to control a TV»?",
        "es": "¿Qué palabra o expresión inglesa significa «a small device used to control a TV»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a small device used to control a TV”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a small device used to control a TV”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a small device used to control a TV”?",
        "tr": "“a small device used to control a TV” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a small device used to control a TV”?"
      },
      "choices": [
        "key hook",
        "toothbrush",
        "door handle",
        "remote control"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose remote control for the home-and-rooms meaning: a small device used to control a TV.",
      "skillTag": "home_objects",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C52",
        "K52"
      ],
      "choiceRationales": [
        "key hook is a plausible home-and-rooms distractor, but it does not mean: a small device used to control a TV.",
        "toothbrush is a plausible home-and-rooms distractor, but it does not mean: a small device used to control a TV.",
        "door handle is a plausible home-and-rooms distractor, but it does not mean: a small device used to control a TV.",
        "remote control is the only option that matches the tested meaning: a small device used to control a TV."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "key hook — маленький крючок для ключей. Это не про «маленькое устройство для управления телевизором»; выбираем remote control.",
          "toothbrush означает «маленькая щетка для чистки зубов». Здесь спрашивают «маленькое устройство для управления телевизором»; ответ remote control.",
          "Не door handle: это «часть двери, за которую берутся, чтобы открыть ее». В этом вопросе правильный вариант — remote control.",
          "Да: remote control — маленькое устройство для управления телевизором. Это ровно то, что описано в задании."
        ],
        "uk": [
          "key hook теж із теми дому, але не означає «a small device used to control a TV». Тут правильна відповідь remote control.",
          "toothbrush теж із теми дому, але не означає «a small device used to control a TV». Тут правильна відповідь remote control.",
          "door handle теж із теми дому, але не означає «a small device used to control a TV». Тут правильна відповідь remote control.",
          "Так: remote control означає «a small device used to control a TV». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "key hook también suena a casa, pero no significa «a small device used to control a TV». La respuesta correcta es remote control.",
          "toothbrush también suena a casa, pero no significa «a small device used to control a TV». La respuesta correcta es remote control.",
          "door handle también suena a casa, pero no significa «a small device used to control a TV». La respuesta correcta es remote control.",
          "Sí: remote control significa «a small device used to control a TV». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "key hook também é do tema casa, mas não significa “a small device used to control a TV”. A resposta certa é remote control.",
          "toothbrush também é do tema casa, mas não significa “a small device used to control a TV”. A resposta certa é remote control.",
          "door handle também é do tema casa, mas não significa “a small device used to control a TV”. A resposta certa é remote control.",
          "Isso: remote control significa “a small device used to control a TV”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "key hook cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small device used to control a TV”. Đáp án đúng là remote control.",
          "toothbrush cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small device used to control a TV”. Đáp án đúng là remote control.",
          "door handle cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small device used to control a TV”. Đáp án đúng là remote control.",
          "remote control nghĩa là “a small device used to control a TV”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "key hook masih bertema rumah, tetapi bukan “a small device used to control a TV”. Jawaban yang tepat adalah remote control.",
          "toothbrush masih bertema rumah, tetapi bukan “a small device used to control a TV”. Jawaban yang tepat adalah remote control.",
          "door handle masih bertema rumah, tetapi bukan “a small device used to control a TV”. Jawaban yang tepat adalah remote control.",
          "remote control berarti “a small device used to control a TV”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "key hook ev temasıyla ilgili olabilir, ama “a small device used to control a TV” anlamına gelmez. Doğru cevap remote control.",
          "toothbrush ev temasıyla ilgili olabilir, ama “a small device used to control a TV” anlamına gelmez. Doğru cevap remote control.",
          "door handle ev temasıyla ilgili olabilir, ama “a small device used to control a TV” anlamına gelmez. Doğru cevap remote control.",
          "Evet: remote control, “a small device used to control a TV” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "key hook też pasuje do tematu domu, ale nie znaczy „a small device used to control a TV”. Poprawna odpowiedź to remote control.",
          "toothbrush też pasuje do tematu domu, ale nie znaczy „a small device used to control a TV”. Poprawna odpowiedź to remote control.",
          "door handle też pasuje do tematu domu, ale nie znaczy „a small device used to control a TV”. Poprawna odpowiedź to remote control.",
          "Tak: remote control znaczy „a small device used to control a TV”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-053",
      "type": "mcq",
      "prompt": "Choose the English word for: the end of a cable that goes into a socket.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «конец кабеля, который вставляют в розетку».",
        "uk": "Яке англійське слово або фраза означає «the end of a cable that goes into a socket»?",
        "es": "¿Qué palabra o expresión inglesa significa «the end of a cable that goes into a socket»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the end of a cable that goes into a socket”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the end of a cable that goes into a socket”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the end of a cable that goes into a socket”?",
        "tr": "“the end of a cable that goes into a socket” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the end of a cable that goes into a socket”?"
      },
      "choices": [
        "plug",
        "socket",
        "tap",
        "drain"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose plug for the home-and-rooms meaning: the end of a cable that goes into a socket.",
      "skillTag": "home_parts",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C53",
        "K53"
      ],
      "choiceRationales": [
        "plug is the only option that matches the tested meaning: the end of a cable that goes into a socket.",
        "socket is a plausible home-and-rooms distractor, but it does not mean: the end of a cable that goes into a socket.",
        "tap is a plausible home-and-rooms distractor, but it does not mean: the end of a cable that goes into a socket.",
        "drain is a plausible home-and-rooms distractor, but it does not mean: the end of a cable that goes into a socket."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: plug — конец кабеля, который вставляют в розетку. Это ровно то, что описано в задании.",
          "socket означает «место в стене, куда вставляют вилку». Здесь спрашивают «конец кабеля, который вставляют в розетку»; ответ plug.",
          "Не tap: это «часть, откуда течет вода». В этом вопросе правильный вариант — plug.",
          "drain — «отверстие, куда уходит вода», а в вопросе нужно «конец кабеля, который вставляют в розетку». Поэтому выбираем plug."
        ],
        "uk": [
          "Так: plug означає «the end of a cable that goes into a socket». Тримай у голові просту домашню картинку.",
          "socket теж із теми дому, але не означає «the end of a cable that goes into a socket». Тут правильна відповідь plug.",
          "tap теж із теми дому, але не означає «the end of a cable that goes into a socket». Тут правильна відповідь plug.",
          "drain теж із теми дому, але не означає «the end of a cable that goes into a socket». Тут правильна відповідь plug."
        ],
        "es": [
          "Sí: plug significa «the end of a cable that goes into a socket». La imagen de casa ayuda a recordarlo.",
          "socket también suena a casa, pero no significa «the end of a cable that goes into a socket». La respuesta correcta es plug.",
          "tap también suena a casa, pero no significa «the end of a cable that goes into a socket». La respuesta correcta es plug.",
          "drain también suena a casa, pero no significa «the end of a cable that goes into a socket». La respuesta correcta es plug."
        ],
        "pt-BR": [
          "Isso: plug significa “the end of a cable that goes into a socket”. Ligue a palavra a uma cena simples da casa.",
          "socket também é do tema casa, mas não significa “the end of a cable that goes into a socket”. A resposta certa é plug.",
          "tap também é do tema casa, mas não significa “the end of a cable that goes into a socket”. A resposta certa é plug.",
          "drain também é do tema casa, mas não significa “the end of a cable that goes into a socket”. A resposta certa é plug."
        ],
        "vi": [
          "plug nghĩa là “the end of a cable that goes into a socket”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "socket cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the end of a cable that goes into a socket”. Đáp án đúng là plug.",
          "tap cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the end of a cable that goes into a socket”. Đáp án đúng là plug.",
          "drain cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the end of a cable that goes into a socket”. Đáp án đúng là plug."
        ],
        "id": [
          "plug berarti “the end of a cable that goes into a socket”. Bayangkan benda atau ruang itu di rumah.",
          "socket masih bertema rumah, tetapi bukan “the end of a cable that goes into a socket”. Jawaban yang tepat adalah plug.",
          "tap masih bertema rumah, tetapi bukan “the end of a cable that goes into a socket”. Jawaban yang tepat adalah plug.",
          "drain masih bertema rumah, tetapi bukan “the end of a cable that goes into a socket”. Jawaban yang tepat adalah plug."
        ],
        "tr": [
          "Evet: plug, “the end of a cable that goes into a socket” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "socket ev temasıyla ilgili olabilir, ama “the end of a cable that goes into a socket” anlamına gelmez. Doğru cevap plug.",
          "tap ev temasıyla ilgili olabilir, ama “the end of a cable that goes into a socket” anlamına gelmez. Doğru cevap plug.",
          "drain ev temasıyla ilgili olabilir, ama “the end of a cable that goes into a socket” anlamına gelmez. Doğru cevap plug."
        ],
        "pl": [
          "Tak: plug znaczy „the end of a cable that goes into a socket”. Połącz słowo z prostym obrazem w domu.",
          "socket też pasuje do tematu domu, ale nie znaczy „the end of a cable that goes into a socket”. Poprawna odpowiedź to plug.",
          "tap też pasuje do tematu domu, ale nie znaczy „the end of a cable that goes into a socket”. Poprawna odpowiedź to plug.",
          "drain też pasuje do tematu domu, ale nie znaczy „the end of a cable that goes into a socket”. Poprawna odpowiedź to plug."
        ]
      }
    },
    {
      "id": "home-and-rooms-054",
      "type": "mcq",
      "prompt": "Choose the English word for: the place in a wall where you plug in a device.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «место в стене, куда вставляют вилку».",
        "uk": "Яке англійське слово або фраза означає «the place in a wall where you plug in a device»?",
        "es": "¿Qué palabra o expresión inglesa significa «the place in a wall where you plug in a device»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the place in a wall where you plug in a device”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the place in a wall where you plug in a device”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the place in a wall where you plug in a device”?",
        "tr": "“the place in a wall where you plug in a device” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the place in a wall where you plug in a device”?"
      },
      "choices": [
        "light switch",
        "socket",
        "lock",
        "peephole"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose socket for the home-and-rooms meaning: the place in a wall where you plug in a device.",
      "skillTag": "home_parts",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C54",
        "K54"
      ],
      "choiceRationales": [
        "light switch is a plausible home-and-rooms distractor, but it does not mean: the place in a wall where you plug in a device.",
        "socket is the only option that matches the tested meaning: the place in a wall where you plug in a device.",
        "lock is a plausible home-and-rooms distractor, but it does not mean: the place in a wall where you plug in a device.",
        "peephole is a plausible home-and-rooms distractor, but it does not mean: the place in a wall where you plug in a device."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "light switch — маленькая кнопка для включения или выключения света. Это не про «место в стене, куда вставляют вилку»; выбираем socket.",
          "Да: socket — место в стене, куда вставляют вилку. Это ровно то, что описано в задании.",
          "Не lock: это «часть двери, которая закрывает ее на ключ». В этом вопросе правильный вариант — socket.",
          "peephole — «маленькое отверстие в двери, чтобы видеть, кто снаружи», а в вопросе нужно «место в стене, куда вставляют вилку». Поэтому выбираем socket."
        ],
        "uk": [
          "light switch теж із теми дому, але не означає «the place in a wall where you plug in a device». Тут правильна відповідь socket.",
          "Так: socket означає «the place in a wall where you plug in a device». Тримай у голові просту домашню картинку.",
          "lock теж із теми дому, але не означає «the place in a wall where you plug in a device». Тут правильна відповідь socket.",
          "peephole теж із теми дому, але не означає «the place in a wall where you plug in a device». Тут правильна відповідь socket."
        ],
        "es": [
          "light switch también suena a casa, pero no significa «the place in a wall where you plug in a device». La respuesta correcta es socket.",
          "Sí: socket significa «the place in a wall where you plug in a device». La imagen de casa ayuda a recordarlo.",
          "lock también suena a casa, pero no significa «the place in a wall where you plug in a device». La respuesta correcta es socket.",
          "peephole también suena a casa, pero no significa «the place in a wall where you plug in a device». La respuesta correcta es socket."
        ],
        "pt-BR": [
          "light switch também é do tema casa, mas não significa “the place in a wall where you plug in a device”. A resposta certa é socket.",
          "Isso: socket significa “the place in a wall where you plug in a device”. Ligue a palavra a uma cena simples da casa.",
          "lock também é do tema casa, mas não significa “the place in a wall where you plug in a device”. A resposta certa é socket.",
          "peephole também é do tema casa, mas não significa “the place in a wall where you plug in a device”. A resposta certa é socket."
        ],
        "vi": [
          "light switch cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the place in a wall where you plug in a device”. Đáp án đúng là socket.",
          "socket nghĩa là “the place in a wall where you plug in a device”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "lock cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the place in a wall where you plug in a device”. Đáp án đúng là socket.",
          "peephole cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the place in a wall where you plug in a device”. Đáp án đúng là socket."
        ],
        "id": [
          "light switch masih bertema rumah, tetapi bukan “the place in a wall where you plug in a device”. Jawaban yang tepat adalah socket.",
          "socket berarti “the place in a wall where you plug in a device”. Bayangkan benda atau ruang itu di rumah.",
          "lock masih bertema rumah, tetapi bukan “the place in a wall where you plug in a device”. Jawaban yang tepat adalah socket.",
          "peephole masih bertema rumah, tetapi bukan “the place in a wall where you plug in a device”. Jawaban yang tepat adalah socket."
        ],
        "tr": [
          "light switch ev temasıyla ilgili olabilir, ama “the place in a wall where you plug in a device” anlamına gelmez. Doğru cevap socket.",
          "Evet: socket, “the place in a wall where you plug in a device” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "lock ev temasıyla ilgili olabilir, ama “the place in a wall where you plug in a device” anlamına gelmez. Doğru cevap socket.",
          "peephole ev temasıyla ilgili olabilir, ama “the place in a wall where you plug in a device” anlamına gelmez. Doğru cevap socket."
        ],
        "pl": [
          "light switch też pasuje do tematu domu, ale nie znaczy „the place in a wall where you plug in a device”. Poprawna odpowiedź to socket.",
          "Tak: socket znaczy „the place in a wall where you plug in a device”. Połącz słowo z prostym obrazem w domu.",
          "lock też pasuje do tematu domu, ale nie znaczy „the place in a wall where you plug in a device”. Poprawna odpowiedź to socket.",
          "peephole też pasuje do tematu domu, ale nie znaczy „the place in a wall where you plug in a device”. Poprawna odpowiedź to socket."
        ]
      }
    },
    {
      "id": "home-and-rooms-055",
      "type": "mcq",
      "prompt": "Choose the English word for: a cable that gives more reach for electricity.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «кабель, который удлиняет доступ к электричеству».",
        "uk": "Яке англійське слово або фраза означає «a cable that gives more reach for electricity»?",
        "es": "¿Qué palabra o expresión inglesa significa «a cable that gives more reach for electricity»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a cable that gives more reach for electricity”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a cable that gives more reach for electricity”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a cable that gives more reach for electricity”?",
        "tr": "“a cable that gives more reach for electricity” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a cable that gives more reach for electricity”?"
      },
      "choices": [
        "clothesline",
        "shower curtain",
        "extension cord",
        "towel rack"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose extension cord for the home-and-rooms meaning: a cable that gives more reach for electricity.",
      "skillTag": "home_parts",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C55",
        "K55"
      ],
      "choiceRationales": [
        "clothesline is a plausible home-and-rooms distractor, but it does not mean: a cable that gives more reach for electricity.",
        "shower curtain is a plausible home-and-rooms distractor, but it does not mean: a cable that gives more reach for electricity.",
        "extension cord is the only option that matches the tested meaning: a cable that gives more reach for electricity.",
        "towel rack is a plausible home-and-rooms distractor, but it does not mean: a cable that gives more reach for electricity."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "clothesline — веревка или линия, на которой сушат одежду. Это не про «кабель, который удлиняет доступ к электричеству»; выбираем extension cord.",
          "shower curtain означает «занавеска, которая удерживает воду в зоне душа». Здесь спрашивают «кабель, который удлиняет доступ к электричеству»; ответ extension cord.",
          "Да: extension cord — кабель, который удлиняет доступ к электричеству. Это ровно то, что описано в задании.",
          "towel rack — «другой вариант», а в вопросе нужно «кабель, который удлиняет доступ к электричеству». Поэтому выбираем extension cord."
        ],
        "uk": [
          "clothesline теж із теми дому, але не означає «a cable that gives more reach for electricity». Тут правильна відповідь extension cord.",
          "shower curtain теж із теми дому, але не означає «a cable that gives more reach for electricity». Тут правильна відповідь extension cord.",
          "Так: extension cord означає «a cable that gives more reach for electricity». Тримай у голові просту домашню картинку.",
          "towel rack теж із теми дому, але не означає «a cable that gives more reach for electricity». Тут правильна відповідь extension cord."
        ],
        "es": [
          "clothesline también suena a casa, pero no significa «a cable that gives more reach for electricity». La respuesta correcta es extension cord.",
          "shower curtain también suena a casa, pero no significa «a cable that gives more reach for electricity». La respuesta correcta es extension cord.",
          "Sí: extension cord significa «a cable that gives more reach for electricity». La imagen de casa ayuda a recordarlo.",
          "towel rack también suena a casa, pero no significa «a cable that gives more reach for electricity». La respuesta correcta es extension cord."
        ],
        "pt-BR": [
          "clothesline também é do tema casa, mas não significa “a cable that gives more reach for electricity”. A resposta certa é extension cord.",
          "shower curtain também é do tema casa, mas não significa “a cable that gives more reach for electricity”. A resposta certa é extension cord.",
          "Isso: extension cord significa “a cable that gives more reach for electricity”. Ligue a palavra a uma cena simples da casa.",
          "towel rack também é do tema casa, mas não significa “a cable that gives more reach for electricity”. A resposta certa é extension cord."
        ],
        "vi": [
          "clothesline cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a cable that gives more reach for electricity”. Đáp án đúng là extension cord.",
          "shower curtain cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a cable that gives more reach for electricity”. Đáp án đúng là extension cord.",
          "extension cord nghĩa là “a cable that gives more reach for electricity”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "towel rack cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a cable that gives more reach for electricity”. Đáp án đúng là extension cord."
        ],
        "id": [
          "clothesline masih bertema rumah, tetapi bukan “a cable that gives more reach for electricity”. Jawaban yang tepat adalah extension cord.",
          "shower curtain masih bertema rumah, tetapi bukan “a cable that gives more reach for electricity”. Jawaban yang tepat adalah extension cord.",
          "extension cord berarti “a cable that gives more reach for electricity”. Bayangkan benda atau ruang itu di rumah.",
          "towel rack masih bertema rumah, tetapi bukan “a cable that gives more reach for electricity”. Jawaban yang tepat adalah extension cord."
        ],
        "tr": [
          "clothesline ev temasıyla ilgili olabilir, ama “a cable that gives more reach for electricity” anlamına gelmez. Doğru cevap extension cord.",
          "shower curtain ev temasıyla ilgili olabilir, ama “a cable that gives more reach for electricity” anlamına gelmez. Doğru cevap extension cord.",
          "Evet: extension cord, “a cable that gives more reach for electricity” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "towel rack ev temasıyla ilgili olabilir, ama “a cable that gives more reach for electricity” anlamına gelmez. Doğru cevap extension cord."
        ],
        "pl": [
          "clothesline też pasuje do tematu domu, ale nie znaczy „a cable that gives more reach for electricity”. Poprawna odpowiedź to extension cord.",
          "shower curtain też pasuje do tematu domu, ale nie znaczy „a cable that gives more reach for electricity”. Poprawna odpowiedź to extension cord.",
          "Tak: extension cord znaczy „a cable that gives more reach for electricity”. Połącz słowo z prostym obrazem w domu.",
          "towel rack też pasuje do tematu domu, ale nie znaczy „a cable that gives more reach for electricity”. Poprawna odpowiedź to extension cord."
        ]
      }
    },
    {
      "id": "home-and-rooms-056",
      "type": "mcq",
      "prompt": "Choose the English word for: a device that warns you about smoke.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «устройство, которое предупреждает о дыме».",
        "uk": "Яке англійське слово або фраза означає «a device that warns you about smoke»?",
        "es": "¿Qué palabra o expresión inglesa significa «a device that warns you about smoke»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a device that warns you about smoke”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a device that warns you about smoke”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a device that warns you about smoke”?",
        "tr": "“a device that warns you about smoke” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a device that warns you about smoke”?"
      },
      "choices": [
        "doorbell",
        "alarm clock",
        "thermostat",
        "smoke alarm"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose smoke alarm for the home-and-rooms meaning: a device that warns you about smoke.",
      "skillTag": "home_safety",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C56",
        "K56"
      ],
      "choiceRationales": [
        "doorbell is a plausible home-and-rooms distractor, but it does not mean: a device that warns you about smoke.",
        "alarm clock is a plausible home-and-rooms distractor, but it does not mean: a device that warns you about smoke.",
        "thermostat is a plausible home-and-rooms distractor, but it does not mean: a device that warns you about smoke.",
        "smoke alarm is the only option that matches the tested meaning: a device that warns you about smoke."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "doorbell — кнопка или устройство у двери для звонка. Это не про «устройство, которое предупреждает о дыме»; выбираем smoke alarm.",
          "alarm clock означает «часы, которые будят утром». Здесь спрашивают «устройство, которое предупреждает о дыме»; ответ smoke alarm.",
          "Не thermostat: это «регулятор отопления или охлаждения комнаты». В этом вопросе правильный вариант — smoke alarm.",
          "Да: smoke alarm — устройство, которое предупреждает о дыме. Это ровно то, что описано в задании."
        ],
        "uk": [
          "doorbell теж із теми дому, але не означає «a device that warns you about smoke». Тут правильна відповідь smoke alarm.",
          "alarm clock теж із теми дому, але не означає «a device that warns you about smoke». Тут правильна відповідь smoke alarm.",
          "thermostat теж із теми дому, але не означає «a device that warns you about smoke». Тут правильна відповідь smoke alarm.",
          "Так: smoke alarm означає «a device that warns you about smoke». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "doorbell también suena a casa, pero no significa «a device that warns you about smoke». La respuesta correcta es smoke alarm.",
          "alarm clock también suena a casa, pero no significa «a device that warns you about smoke». La respuesta correcta es smoke alarm.",
          "thermostat también suena a casa, pero no significa «a device that warns you about smoke». La respuesta correcta es smoke alarm.",
          "Sí: smoke alarm significa «a device that warns you about smoke». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "doorbell também é do tema casa, mas não significa “a device that warns you about smoke”. A resposta certa é smoke alarm.",
          "alarm clock também é do tema casa, mas não significa “a device that warns you about smoke”. A resposta certa é smoke alarm.",
          "thermostat também é do tema casa, mas não significa “a device that warns you about smoke”. A resposta certa é smoke alarm.",
          "Isso: smoke alarm significa “a device that warns you about smoke”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "doorbell cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a device that warns you about smoke”. Đáp án đúng là smoke alarm.",
          "alarm clock cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a device that warns you about smoke”. Đáp án đúng là smoke alarm.",
          "thermostat cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a device that warns you about smoke”. Đáp án đúng là smoke alarm.",
          "smoke alarm nghĩa là “a device that warns you about smoke”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "doorbell masih bertema rumah, tetapi bukan “a device that warns you about smoke”. Jawaban yang tepat adalah smoke alarm.",
          "alarm clock masih bertema rumah, tetapi bukan “a device that warns you about smoke”. Jawaban yang tepat adalah smoke alarm.",
          "thermostat masih bertema rumah, tetapi bukan “a device that warns you about smoke”. Jawaban yang tepat adalah smoke alarm.",
          "smoke alarm berarti “a device that warns you about smoke”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "doorbell ev temasıyla ilgili olabilir, ama “a device that warns you about smoke” anlamına gelmez. Doğru cevap smoke alarm.",
          "alarm clock ev temasıyla ilgili olabilir, ama “a device that warns you about smoke” anlamına gelmez. Doğru cevap smoke alarm.",
          "thermostat ev temasıyla ilgili olabilir, ama “a device that warns you about smoke” anlamına gelmez. Doğru cevap smoke alarm.",
          "Evet: smoke alarm, “a device that warns you about smoke” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "doorbell też pasuje do tematu domu, ale nie znaczy „a device that warns you about smoke”. Poprawna odpowiedź to smoke alarm.",
          "alarm clock też pasuje do tematu domu, ale nie znaczy „a device that warns you about smoke”. Poprawna odpowiedź to smoke alarm.",
          "thermostat też pasuje do tematu domu, ale nie znaczy „a device that warns you about smoke”. Poprawna odpowiedź to smoke alarm.",
          "Tak: smoke alarm znaczy „a device that warns you about smoke”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-057",
      "type": "mcq",
      "prompt": "Choose the English word for: a control for heating or cooling a room.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «регулятор отопления или охлаждения комнаты».",
        "uk": "Яке англійське слово або фраза означає «a control for heating or cooling a room»?",
        "es": "¿Qué palabra o expresión inglesa significa «a control for heating or cooling a room»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a control for heating or cooling a room”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a control for heating or cooling a room”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a control for heating or cooling a room”?",
        "tr": "“a control for heating or cooling a room” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a control for heating or cooling a room”?"
      },
      "choices": [
        "thermostat",
        "remote control",
        "clock",
        "screen"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose thermostat for the home-and-rooms meaning: a control for heating or cooling a room.",
      "skillTag": "home_parts",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C57",
        "K57"
      ],
      "choiceRationales": [
        "thermostat is the only option that matches the tested meaning: a control for heating or cooling a room.",
        "remote control is a plausible home-and-rooms distractor, but it does not mean: a control for heating or cooling a room.",
        "clock is a plausible home-and-rooms distractor, but it does not mean: a control for heating or cooling a room.",
        "screen is a plausible home-and-rooms distractor, but it does not mean: a control for heating or cooling a room."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: thermostat — регулятор отопления или охлаждения комнаты. Это ровно то, что описано в задании.",
          "remote control означает «маленькое устройство для управления телевизором». Здесь спрашивают «регулятор отопления или охлаждения комнаты»; ответ thermostat.",
          "Не clock: это «предмет, который показывает время». В этом вопросе правильный вариант — thermostat.",
          "screen — «часть телевизора или устройства, где видно изображение», а в вопросе нужно «регулятор отопления или охлаждения комнаты». Поэтому выбираем thermostat."
        ],
        "uk": [
          "Так: thermostat означає «a control for heating or cooling a room». Тримай у голові просту домашню картинку.",
          "remote control теж із теми дому, але не означає «a control for heating or cooling a room». Тут правильна відповідь thermostat.",
          "clock теж із теми дому, але не означає «a control for heating or cooling a room». Тут правильна відповідь thermostat.",
          "screen теж із теми дому, але не означає «a control for heating or cooling a room». Тут правильна відповідь thermostat."
        ],
        "es": [
          "Sí: thermostat significa «a control for heating or cooling a room». La imagen de casa ayuda a recordarlo.",
          "remote control también suena a casa, pero no significa «a control for heating or cooling a room». La respuesta correcta es thermostat.",
          "clock también suena a casa, pero no significa «a control for heating or cooling a room». La respuesta correcta es thermostat.",
          "screen también suena a casa, pero no significa «a control for heating or cooling a room». La respuesta correcta es thermostat."
        ],
        "pt-BR": [
          "Isso: thermostat significa “a control for heating or cooling a room”. Ligue a palavra a uma cena simples da casa.",
          "remote control também é do tema casa, mas não significa “a control for heating or cooling a room”. A resposta certa é thermostat.",
          "clock também é do tema casa, mas não significa “a control for heating or cooling a room”. A resposta certa é thermostat.",
          "screen também é do tema casa, mas não significa “a control for heating or cooling a room”. A resposta certa é thermostat."
        ],
        "vi": [
          "thermostat nghĩa là “a control for heating or cooling a room”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "remote control cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a control for heating or cooling a room”. Đáp án đúng là thermostat.",
          "clock cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a control for heating or cooling a room”. Đáp án đúng là thermostat.",
          "screen cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a control for heating or cooling a room”. Đáp án đúng là thermostat."
        ],
        "id": [
          "thermostat berarti “a control for heating or cooling a room”. Bayangkan benda atau ruang itu di rumah.",
          "remote control masih bertema rumah, tetapi bukan “a control for heating or cooling a room”. Jawaban yang tepat adalah thermostat.",
          "clock masih bertema rumah, tetapi bukan “a control for heating or cooling a room”. Jawaban yang tepat adalah thermostat.",
          "screen masih bertema rumah, tetapi bukan “a control for heating or cooling a room”. Jawaban yang tepat adalah thermostat."
        ],
        "tr": [
          "Evet: thermostat, “a control for heating or cooling a room” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "remote control ev temasıyla ilgili olabilir, ama “a control for heating or cooling a room” anlamına gelmez. Doğru cevap thermostat.",
          "clock ev temasıyla ilgili olabilir, ama “a control for heating or cooling a room” anlamına gelmez. Doğru cevap thermostat.",
          "screen ev temasıyla ilgili olabilir, ama “a control for heating or cooling a room” anlamına gelmez. Doğru cevap thermostat."
        ],
        "pl": [
          "Tak: thermostat znaczy „a control for heating or cooling a room”. Połącz słowo z prostym obrazem w domu.",
          "remote control też pasuje do tematu domu, ale nie znaczy „a control for heating or cooling a room”. Poprawna odpowiedź to thermostat.",
          "clock też pasuje do tematu domu, ale nie znaczy „a control for heating or cooling a room”. Poprawna odpowiedź to thermostat.",
          "screen też pasuje do tematu domu, ale nie znaczy „a control for heating or cooling a room”. Poprawna odpowiedź to thermostat."
        ]
      }
    },
    {
      "id": "home-and-rooms-058",
      "type": "mcq",
      "prompt": "Choose the English word for: the bathroom fixture people use as a toilet.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «сантехника в ванной или туалете».",
        "uk": "Яке англійське слово або фраза означає «the bathroom fixture people use as a toilet»?",
        "es": "¿Qué palabra o expresión inglesa significa «the bathroom fixture people use as a toilet»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the bathroom fixture people use as a toilet”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the bathroom fixture people use as a toilet”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the bathroom fixture people use as a toilet”?",
        "tr": "“the bathroom fixture people use as a toilet” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the bathroom fixture people use as a toilet”?"
      },
      "choices": [
        "sink",
        "toilet",
        "bathtub",
        "washing machine"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose toilet for the home-and-rooms meaning: the bathroom fixture people use as a toilet.",
      "skillTag": "home_bathroom",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C58",
        "K58"
      ],
      "choiceRationales": [
        "sink is a plausible home-and-rooms distractor, but it does not mean: the bathroom fixture people use as a toilet.",
        "toilet is the only option that matches the tested meaning: the bathroom fixture people use as a toilet.",
        "bathtub is a plausible home-and-rooms distractor, but it does not mean: the bathroom fixture people use as a toilet.",
        "washing machine is a plausible home-and-rooms distractor, but it does not mean: the bathroom fixture people use as a toilet."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "sink — чаша с водой для мытья рук или посуды. Это не про «сантехника в ванной или туалете»; выбираем toilet.",
          "Да: toilet — сантехника в ванной или туалете. Это ровно то, что описано в задании.",
          "Не bathtub: это «большая ванна, где можно сидеть и мыться». В этом вопросе правильный вариант — toilet.",
          "washing machine — «машина, которая стирает одежду», а в вопросе нужно «сантехника в ванной или туалете». Поэтому выбираем toilet."
        ],
        "uk": [
          "sink теж із теми дому, але не означає «the bathroom fixture people use as a toilet». Тут правильна відповідь toilet.",
          "Так: toilet означає «the bathroom fixture people use as a toilet». Тримай у голові просту домашню картинку.",
          "bathtub теж із теми дому, але не означає «the bathroom fixture people use as a toilet». Тут правильна відповідь toilet.",
          "washing machine теж із теми дому, але не означає «the bathroom fixture people use as a toilet». Тут правильна відповідь toilet."
        ],
        "es": [
          "sink también suena a casa, pero no significa «the bathroom fixture people use as a toilet». La respuesta correcta es toilet.",
          "Sí: toilet significa «the bathroom fixture people use as a toilet». La imagen de casa ayuda a recordarlo.",
          "bathtub también suena a casa, pero no significa «the bathroom fixture people use as a toilet». La respuesta correcta es toilet.",
          "washing machine también suena a casa, pero no significa «the bathroom fixture people use as a toilet». La respuesta correcta es toilet."
        ],
        "pt-BR": [
          "sink também é do tema casa, mas não significa “the bathroom fixture people use as a toilet”. A resposta certa é toilet.",
          "Isso: toilet significa “the bathroom fixture people use as a toilet”. Ligue a palavra a uma cena simples da casa.",
          "bathtub também é do tema casa, mas não significa “the bathroom fixture people use as a toilet”. A resposta certa é toilet.",
          "washing machine também é do tema casa, mas não significa “the bathroom fixture people use as a toilet”. A resposta certa é toilet."
        ],
        "vi": [
          "sink cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the bathroom fixture people use as a toilet”. Đáp án đúng là toilet.",
          "toilet nghĩa là “the bathroom fixture people use as a toilet”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "bathtub cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the bathroom fixture people use as a toilet”. Đáp án đúng là toilet.",
          "washing machine cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the bathroom fixture people use as a toilet”. Đáp án đúng là toilet."
        ],
        "id": [
          "sink masih bertema rumah, tetapi bukan “the bathroom fixture people use as a toilet”. Jawaban yang tepat adalah toilet.",
          "toilet berarti “the bathroom fixture people use as a toilet”. Bayangkan benda atau ruang itu di rumah.",
          "bathtub masih bertema rumah, tetapi bukan “the bathroom fixture people use as a toilet”. Jawaban yang tepat adalah toilet.",
          "washing machine masih bertema rumah, tetapi bukan “the bathroom fixture people use as a toilet”. Jawaban yang tepat adalah toilet."
        ],
        "tr": [
          "sink ev temasıyla ilgili olabilir, ama “the bathroom fixture people use as a toilet” anlamına gelmez. Doğru cevap toilet.",
          "Evet: toilet, “the bathroom fixture people use as a toilet” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "bathtub ev temasıyla ilgili olabilir, ama “the bathroom fixture people use as a toilet” anlamına gelmez. Doğru cevap toilet.",
          "washing machine ev temasıyla ilgili olabilir, ama “the bathroom fixture people use as a toilet” anlamına gelmez. Doğru cevap toilet."
        ],
        "pl": [
          "sink też pasuje do tematu domu, ale nie znaczy „the bathroom fixture people use as a toilet”. Poprawna odpowiedź to toilet.",
          "Tak: toilet znaczy „the bathroom fixture people use as a toilet”. Połącz słowo z prostym obrazem w domu.",
          "bathtub też pasuje do tematu domu, ale nie znaczy „the bathroom fixture people use as a toilet”. Poprawna odpowiedź to toilet.",
          "washing machine też pasuje do tematu domu, ale nie znaczy „the bathroom fixture people use as a toilet”. Poprawna odpowiedź to toilet."
        ]
      }
    },
    {
      "id": "home-and-rooms-059",
      "type": "mcq",
      "prompt": "Choose the English word for: paper used in the bathroom near the toilet.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «бумага рядом с туалетом».",
        "uk": "Яке англійське слово або фраза означає «paper used in the bathroom near the toilet»?",
        "es": "¿Qué palabra o expresión inglesa significa «paper used in the bathroom near the toilet»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “paper used in the bathroom near the toilet”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “paper used in the bathroom near the toilet”?",
        "id": "Kata atau frasa Inggris mana yang berarti “paper used in the bathroom near the toilet”?",
        "tr": "“paper used in the bathroom near the toilet” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „paper used in the bathroom near the toilet”?"
      },
      "choices": [
        "towel",
        "cloth",
        "toilet paper",
        "blanket"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose toilet paper for the home-and-rooms meaning: paper used in the bathroom near the toilet.",
      "skillTag": "home_bathroom",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C59",
        "K59"
      ],
      "choiceRationales": [
        "towel is a plausible home-and-rooms distractor, but it does not mean: paper used in the bathroom near the toilet.",
        "cloth is a plausible home-and-rooms distractor, but it does not mean: paper used in the bathroom near the toilet.",
        "toilet paper is the only option that matches the tested meaning: paper used in the bathroom near the toilet.",
        "blanket is a plausible home-and-rooms distractor, but it does not mean: paper used in the bathroom near the toilet."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "towel — ткань для вытирания рук или тела. Это не про «бумага рядом с туалетом»; выбираем toilet paper.",
          "cloth означает «кусок ткани для уборки или вытирания». Здесь спрашивают «бумага рядом с туалетом»; ответ toilet paper.",
          "Да: toilet paper — бумага рядом с туалетом. Это ровно то, что описано в задании.",
          "blanket — «теплое покрывало для кровати», а в вопросе нужно «бумага рядом с туалетом». Поэтому выбираем toilet paper."
        ],
        "uk": [
          "towel теж із теми дому, але не означає «paper used in the bathroom near the toilet». Тут правильна відповідь toilet paper.",
          "cloth теж із теми дому, але не означає «paper used in the bathroom near the toilet». Тут правильна відповідь toilet paper.",
          "Так: toilet paper означає «paper used in the bathroom near the toilet». Тримай у голові просту домашню картинку.",
          "blanket теж із теми дому, але не означає «paper used in the bathroom near the toilet». Тут правильна відповідь toilet paper."
        ],
        "es": [
          "towel también suena a casa, pero no significa «paper used in the bathroom near the toilet». La respuesta correcta es toilet paper.",
          "cloth también suena a casa, pero no significa «paper used in the bathroom near the toilet». La respuesta correcta es toilet paper.",
          "Sí: toilet paper significa «paper used in the bathroom near the toilet». La imagen de casa ayuda a recordarlo.",
          "blanket también suena a casa, pero no significa «paper used in the bathroom near the toilet». La respuesta correcta es toilet paper."
        ],
        "pt-BR": [
          "towel também é do tema casa, mas não significa “paper used in the bathroom near the toilet”. A resposta certa é toilet paper.",
          "cloth também é do tema casa, mas não significa “paper used in the bathroom near the toilet”. A resposta certa é toilet paper.",
          "Isso: toilet paper significa “paper used in the bathroom near the toilet”. Ligue a palavra a uma cena simples da casa.",
          "blanket também é do tema casa, mas não significa “paper used in the bathroom near the toilet”. A resposta certa é toilet paper."
        ],
        "vi": [
          "towel cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “paper used in the bathroom near the toilet”. Đáp án đúng là toilet paper.",
          "cloth cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “paper used in the bathroom near the toilet”. Đáp án đúng là toilet paper.",
          "toilet paper nghĩa là “paper used in the bathroom near the toilet”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "blanket cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “paper used in the bathroom near the toilet”. Đáp án đúng là toilet paper."
        ],
        "id": [
          "towel masih bertema rumah, tetapi bukan “paper used in the bathroom near the toilet”. Jawaban yang tepat adalah toilet paper.",
          "cloth masih bertema rumah, tetapi bukan “paper used in the bathroom near the toilet”. Jawaban yang tepat adalah toilet paper.",
          "toilet paper berarti “paper used in the bathroom near the toilet”. Bayangkan benda atau ruang itu di rumah.",
          "blanket masih bertema rumah, tetapi bukan “paper used in the bathroom near the toilet”. Jawaban yang tepat adalah toilet paper."
        ],
        "tr": [
          "towel ev temasıyla ilgili olabilir, ama “paper used in the bathroom near the toilet” anlamına gelmez. Doğru cevap toilet paper.",
          "cloth ev temasıyla ilgili olabilir, ama “paper used in the bathroom near the toilet” anlamına gelmez. Doğru cevap toilet paper.",
          "Evet: toilet paper, “paper used in the bathroom near the toilet” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "blanket ev temasıyla ilgili olabilir, ama “paper used in the bathroom near the toilet” anlamına gelmez. Doğru cevap toilet paper."
        ],
        "pl": [
          "towel też pasuje do tematu domu, ale nie znaczy „paper used in the bathroom near the toilet”. Poprawna odpowiedź to toilet paper.",
          "cloth też pasuje do tematu domu, ale nie znaczy „paper used in the bathroom near the toilet”. Poprawna odpowiedź to toilet paper.",
          "Tak: toilet paper znaczy „paper used in the bathroom near the toilet”. Połącz słowo z prostym obrazem w domu.",
          "blanket też pasuje do tematu domu, ale nie znaczy „paper used in the bathroom near the toilet”. Poprawna odpowiedź to toilet paper."
        ]
      }
    },
    {
      "id": "home-and-rooms-060",
      "type": "mcq",
      "prompt": "Choose the English word for: a brush used for cleaning a toilet.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «щетка для чистки унитаза».",
        "uk": "Яке англійське слово або фраза означає «a brush used for cleaning a toilet»?",
        "es": "¿Qué palabra o expresión inglesa significa «a brush used for cleaning a toilet»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a brush used for cleaning a toilet”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a brush used for cleaning a toilet”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a brush used for cleaning a toilet”?",
        "tr": "“a brush used for cleaning a toilet” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a brush used for cleaning a toilet”?"
      },
      "choices": [
        "toothbrush",
        "broom",
        "mop",
        "toilet brush"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose toilet brush for the home-and-rooms meaning: a brush used for cleaning a toilet.",
      "skillTag": "home_cleaning",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C60",
        "K60"
      ],
      "choiceRationales": [
        "toothbrush is a plausible home-and-rooms distractor, but it does not mean: a brush used for cleaning a toilet.",
        "broom is a plausible home-and-rooms distractor, but it does not mean: a brush used for cleaning a toilet.",
        "mop is a plausible home-and-rooms distractor, but it does not mean: a brush used for cleaning a toilet.",
        "toilet brush is the only option that matches the tested meaning: a brush used for cleaning a toilet."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "toothbrush — маленькая щетка для чистки зубов. Это не про «щетка для чистки унитаза»; выбираем toilet brush.",
          "broom означает «инструмент, которым подметают пол». Здесь спрашивают «щетка для чистки унитаза»; ответ toilet brush.",
          "Не mop: это «инструмент, которым моют пол». В этом вопросе правильный вариант — toilet brush.",
          "Да: toilet brush — щетка для чистки унитаза. Это ровно то, что описано в задании."
        ],
        "uk": [
          "toothbrush теж із теми дому, але не означає «a brush used for cleaning a toilet». Тут правильна відповідь toilet brush.",
          "broom теж із теми дому, але не означає «a brush used for cleaning a toilet». Тут правильна відповідь toilet brush.",
          "mop теж із теми дому, але не означає «a brush used for cleaning a toilet». Тут правильна відповідь toilet brush.",
          "Так: toilet brush означає «a brush used for cleaning a toilet». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "toothbrush también suena a casa, pero no significa «a brush used for cleaning a toilet». La respuesta correcta es toilet brush.",
          "broom también suena a casa, pero no significa «a brush used for cleaning a toilet». La respuesta correcta es toilet brush.",
          "mop también suena a casa, pero no significa «a brush used for cleaning a toilet». La respuesta correcta es toilet brush.",
          "Sí: toilet brush significa «a brush used for cleaning a toilet». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "toothbrush também é do tema casa, mas não significa “a brush used for cleaning a toilet”. A resposta certa é toilet brush.",
          "broom também é do tema casa, mas não significa “a brush used for cleaning a toilet”. A resposta certa é toilet brush.",
          "mop também é do tema casa, mas não significa “a brush used for cleaning a toilet”. A resposta certa é toilet brush.",
          "Isso: toilet brush significa “a brush used for cleaning a toilet”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "toothbrush cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a brush used for cleaning a toilet”. Đáp án đúng là toilet brush.",
          "broom cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a brush used for cleaning a toilet”. Đáp án đúng là toilet brush.",
          "mop cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a brush used for cleaning a toilet”. Đáp án đúng là toilet brush.",
          "toilet brush nghĩa là “a brush used for cleaning a toilet”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "toothbrush masih bertema rumah, tetapi bukan “a brush used for cleaning a toilet”. Jawaban yang tepat adalah toilet brush.",
          "broom masih bertema rumah, tetapi bukan “a brush used for cleaning a toilet”. Jawaban yang tepat adalah toilet brush.",
          "mop masih bertema rumah, tetapi bukan “a brush used for cleaning a toilet”. Jawaban yang tepat adalah toilet brush.",
          "toilet brush berarti “a brush used for cleaning a toilet”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "toothbrush ev temasıyla ilgili olabilir, ama “a brush used for cleaning a toilet” anlamına gelmez. Doğru cevap toilet brush.",
          "broom ev temasıyla ilgili olabilir, ama “a brush used for cleaning a toilet” anlamına gelmez. Doğru cevap toilet brush.",
          "mop ev temasıyla ilgili olabilir, ama “a brush used for cleaning a toilet” anlamına gelmez. Doğru cevap toilet brush.",
          "Evet: toilet brush, “a brush used for cleaning a toilet” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "toothbrush też pasuje do tematu domu, ale nie znaczy „a brush used for cleaning a toilet”. Poprawna odpowiedź to toilet brush.",
          "broom też pasuje do tematu domu, ale nie znaczy „a brush used for cleaning a toilet”. Poprawna odpowiedź to toilet brush.",
          "mop też pasuje do tematu domu, ale nie znaczy „a brush used for cleaning a toilet”. Poprawna odpowiedź to toilet brush.",
          "Tak: toilet brush znaczy „a brush used for cleaning a toilet”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-061",
      "type": "mcq",
      "prompt": "Choose the English word for: a loose robe worn after a bath or shower.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «свободный халат после ванны или душа».",
        "uk": "Яке англійське слово або фраза означає «a loose robe worn after a bath or shower»?",
        "es": "¿Qué palabra o expresión inglesa significa «a loose robe worn after a bath or shower»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a loose robe worn after a bath or shower”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a loose robe worn after a bath or shower”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a loose robe worn after a bath or shower”?",
        "tr": "“a loose robe worn after a bath or shower” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a loose robe worn after a bath or shower”?"
      },
      "choices": [
        "bathrobe",
        "blanket",
        "curtains",
        "hanger"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose bathrobe for the home-and-rooms meaning: a loose robe worn after a bath or shower.",
      "skillTag": "home_bathroom",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C61",
        "K61"
      ],
      "choiceRationales": [
        "bathrobe is the only option that matches the tested meaning: a loose robe worn after a bath or shower.",
        "blanket is a plausible home-and-rooms distractor, but it does not mean: a loose robe worn after a bath or shower.",
        "curtains is a plausible home-and-rooms distractor, but it does not mean: a loose robe worn after a bath or shower.",
        "hanger is a plausible home-and-rooms distractor, but it does not mean: a loose robe worn after a bath or shower."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: bathrobe — свободный халат после ванны или душа. Это ровно то, что описано в задании.",
          "blanket означает «теплое покрывало для кровати». Здесь спрашивают «свободный халат после ванны или душа»; ответ bathrobe.",
          "Не curtains: это «ткань, которой закрывают окно». В этом вопросе правильный вариант — bathrobe.",
          "hanger — «предмет, на который вешают одежду в шкафу», а в вопросе нужно «свободный халат после ванны или душа». Поэтому выбираем bathrobe."
        ],
        "uk": [
          "Так: bathrobe означає «a loose robe worn after a bath or shower». Тримай у голові просту домашню картинку.",
          "blanket теж із теми дому, але не означає «a loose robe worn after a bath or shower». Тут правильна відповідь bathrobe.",
          "curtains теж із теми дому, але не означає «a loose robe worn after a bath or shower». Тут правильна відповідь bathrobe.",
          "hanger теж із теми дому, але не означає «a loose robe worn after a bath or shower». Тут правильна відповідь bathrobe."
        ],
        "es": [
          "Sí: bathrobe significa «a loose robe worn after a bath or shower». La imagen de casa ayuda a recordarlo.",
          "blanket también suena a casa, pero no significa «a loose robe worn after a bath or shower». La respuesta correcta es bathrobe.",
          "curtains también suena a casa, pero no significa «a loose robe worn after a bath or shower». La respuesta correcta es bathrobe.",
          "hanger también suena a casa, pero no significa «a loose robe worn after a bath or shower». La respuesta correcta es bathrobe."
        ],
        "pt-BR": [
          "Isso: bathrobe significa “a loose robe worn after a bath or shower”. Ligue a palavra a uma cena simples da casa.",
          "blanket também é do tema casa, mas não significa “a loose robe worn after a bath or shower”. A resposta certa é bathrobe.",
          "curtains também é do tema casa, mas não significa “a loose robe worn after a bath or shower”. A resposta certa é bathrobe.",
          "hanger também é do tema casa, mas não significa “a loose robe worn after a bath or shower”. A resposta certa é bathrobe."
        ],
        "vi": [
          "bathrobe nghĩa là “a loose robe worn after a bath or shower”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "blanket cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a loose robe worn after a bath or shower”. Đáp án đúng là bathrobe.",
          "curtains cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a loose robe worn after a bath or shower”. Đáp án đúng là bathrobe.",
          "hanger cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a loose robe worn after a bath or shower”. Đáp án đúng là bathrobe."
        ],
        "id": [
          "bathrobe berarti “a loose robe worn after a bath or shower”. Bayangkan benda atau ruang itu di rumah.",
          "blanket masih bertema rumah, tetapi bukan “a loose robe worn after a bath or shower”. Jawaban yang tepat adalah bathrobe.",
          "curtains masih bertema rumah, tetapi bukan “a loose robe worn after a bath or shower”. Jawaban yang tepat adalah bathrobe.",
          "hanger masih bertema rumah, tetapi bukan “a loose robe worn after a bath or shower”. Jawaban yang tepat adalah bathrobe."
        ],
        "tr": [
          "Evet: bathrobe, “a loose robe worn after a bath or shower” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "blanket ev temasıyla ilgili olabilir, ama “a loose robe worn after a bath or shower” anlamına gelmez. Doğru cevap bathrobe.",
          "curtains ev temasıyla ilgili olabilir, ama “a loose robe worn after a bath or shower” anlamına gelmez. Doğru cevap bathrobe.",
          "hanger ev temasıyla ilgili olabilir, ama “a loose robe worn after a bath or shower” anlamına gelmez. Doğru cevap bathrobe."
        ],
        "pl": [
          "Tak: bathrobe znaczy „a loose robe worn after a bath or shower”. Połącz słowo z prostym obrazem w domu.",
          "blanket też pasuje do tematu domu, ale nie znaczy „a loose robe worn after a bath or shower”. Poprawna odpowiedź to bathrobe.",
          "curtains też pasuje do tematu domu, ale nie znaczy „a loose robe worn after a bath or shower”. Poprawna odpowiedź to bathrobe.",
          "hanger też pasuje do tematu domu, ale nie znaczy „a loose robe worn after a bath or shower”. Poprawna odpowiedź to bathrobe."
        ]
      }
    },
    {
      "id": "home-and-rooms-062",
      "type": "mcq",
      "prompt": "Choose the English word for: a room for washing clothes.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «комната для стирки одежды».",
        "uk": "Яке англійське слово або фраза означає «a room for washing clothes»?",
        "es": "¿Qué palabra o expresión inglesa significa «a room for washing clothes»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a room for washing clothes”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a room for washing clothes”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a room for washing clothes”?",
        "tr": "“a room for washing clothes” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a room for washing clothes”?"
      },
      "choices": [
        "dining room",
        "laundry room",
        "home office",
        "living room"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose laundry room for the home-and-rooms meaning: a room for washing clothes.",
      "skillTag": "home_room_name",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C62",
        "K62"
      ],
      "choiceRationales": [
        "dining room is a plausible home-and-rooms distractor, but it does not mean: a room for washing clothes.",
        "laundry room is the only option that matches the tested meaning: a room for washing clothes.",
        "home office is a plausible home-and-rooms distractor, but it does not mean: a room for washing clothes.",
        "living room is a plausible home-and-rooms distractor, but it does not mean: a room for washing clothes."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "dining room — комната, где едят. Это не про «комната для стирки одежды»; выбираем laundry room.",
          "Да: laundry room — комната для стирки одежды. Это ровно то, что описано в задании.",
          "Не home office: это «место или комната для работы дома». В этом вопросе правильный вариант — laundry room.",
          "living room — «комната, где отдыхают или смотрят телевизор», а в вопросе нужно «комната для стирки одежды». Поэтому выбираем laundry room."
        ],
        "uk": [
          "dining room теж із теми дому, але не означає «a room for washing clothes». Тут правильна відповідь laundry room.",
          "Так: laundry room означає «a room for washing clothes». Тримай у голові просту домашню картинку.",
          "home office теж із теми дому, але не означає «a room for washing clothes». Тут правильна відповідь laundry room.",
          "living room теж із теми дому, але не означає «a room for washing clothes». Тут правильна відповідь laundry room."
        ],
        "es": [
          "dining room también suena a casa, pero no significa «a room for washing clothes». La respuesta correcta es laundry room.",
          "Sí: laundry room significa «a room for washing clothes». La imagen de casa ayuda a recordarlo.",
          "home office también suena a casa, pero no significa «a room for washing clothes». La respuesta correcta es laundry room.",
          "living room también suena a casa, pero no significa «a room for washing clothes». La respuesta correcta es laundry room."
        ],
        "pt-BR": [
          "dining room também é do tema casa, mas não significa “a room for washing clothes”. A resposta certa é laundry room.",
          "Isso: laundry room significa “a room for washing clothes”. Ligue a palavra a uma cena simples da casa.",
          "home office também é do tema casa, mas não significa “a room for washing clothes”. A resposta certa é laundry room.",
          "living room também é do tema casa, mas não significa “a room for washing clothes”. A resposta certa é laundry room."
        ],
        "vi": [
          "dining room cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room for washing clothes”. Đáp án đúng là laundry room.",
          "laundry room nghĩa là “a room for washing clothes”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "home office cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room for washing clothes”. Đáp án đúng là laundry room.",
          "living room cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room for washing clothes”. Đáp án đúng là laundry room."
        ],
        "id": [
          "dining room masih bertema rumah, tetapi bukan “a room for washing clothes”. Jawaban yang tepat adalah laundry room.",
          "laundry room berarti “a room for washing clothes”. Bayangkan benda atau ruang itu di rumah.",
          "home office masih bertema rumah, tetapi bukan “a room for washing clothes”. Jawaban yang tepat adalah laundry room.",
          "living room masih bertema rumah, tetapi bukan “a room for washing clothes”. Jawaban yang tepat adalah laundry room."
        ],
        "tr": [
          "dining room ev temasıyla ilgili olabilir, ama “a room for washing clothes” anlamına gelmez. Doğru cevap laundry room.",
          "Evet: laundry room, “a room for washing clothes” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "home office ev temasıyla ilgili olabilir, ama “a room for washing clothes” anlamına gelmez. Doğru cevap laundry room.",
          "living room ev temasıyla ilgili olabilir, ama “a room for washing clothes” anlamına gelmez. Doğru cevap laundry room."
        ],
        "pl": [
          "dining room też pasuje do tematu domu, ale nie znaczy „a room for washing clothes”. Poprawna odpowiedź to laundry room.",
          "Tak: laundry room znaczy „a room for washing clothes”. Połącz słowo z prostym obrazem w domu.",
          "home office też pasuje do tematu domu, ale nie znaczy „a room for washing clothes”. Poprawna odpowiedź to laundry room.",
          "living room też pasuje do tematu domu, ale nie znaczy „a room for washing clothes”. Poprawna odpowiedź to laundry room."
        ]
      }
    },
    {
      "id": "home-and-rooms-063",
      "type": "mcq",
      "prompt": "Choose the English word for: a room for keeping things you do not use every day.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «комната для хранения вещей не на каждый день».",
        "uk": "Яке англійське слово або фраза означає «a room for keeping things you do not use every day»?",
        "es": "¿Qué palabra o expresión inglesa significa «a room for keeping things you do not use every day»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a room for keeping things you do not use every day”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a room for keeping things you do not use every day”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a room for keeping things you do not use every day”?",
        "tr": "“a room for keeping things you do not use every day” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a room for keeping things you do not use every day”?"
      },
      "choices": [
        "bedroom",
        "bathroom",
        "storage room",
        "porch"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose storage room for the home-and-rooms meaning: a room for keeping things you do not use every day.",
      "skillTag": "home_room_name",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C63",
        "K63"
      ],
      "choiceRationales": [
        "bedroom is a plausible home-and-rooms distractor, but it does not mean: a room for keeping things you do not use every day.",
        "bathroom is a plausible home-and-rooms distractor, but it does not mean: a room for keeping things you do not use every day.",
        "storage room is the only option that matches the tested meaning: a room for keeping things you do not use every day.",
        "porch is a plausible home-and-rooms distractor, but it does not mean: a room for keeping things you do not use every day."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "bedroom — комната, где спят. Это не про «комната для хранения вещей не на каждый день»; выбираем storage room.",
          "bathroom означает «комната, где моются или пользуются туалетом». Здесь спрашивают «комната для хранения вещей не на каждый день»; ответ storage room.",
          "Да: storage room — комната для хранения вещей не на каждый день. Это ровно то, что описано в задании.",
          "porch — «крытая площадка у входа в дом», а в вопросе нужно «комната для хранения вещей не на каждый день». Поэтому выбираем storage room."
        ],
        "uk": [
          "bedroom теж із теми дому, але не означає «a room for keeping things you do not use every day». Тут правильна відповідь storage room.",
          "bathroom теж із теми дому, але не означає «a room for keeping things you do not use every day». Тут правильна відповідь storage room.",
          "Так: storage room означає «a room for keeping things you do not use every day». Тримай у голові просту домашню картинку.",
          "porch теж із теми дому, але не означає «a room for keeping things you do not use every day». Тут правильна відповідь storage room."
        ],
        "es": [
          "bedroom también suena a casa, pero no significa «a room for keeping things you do not use every day». La respuesta correcta es storage room.",
          "bathroom también suena a casa, pero no significa «a room for keeping things you do not use every day». La respuesta correcta es storage room.",
          "Sí: storage room significa «a room for keeping things you do not use every day». La imagen de casa ayuda a recordarlo.",
          "porch también suena a casa, pero no significa «a room for keeping things you do not use every day». La respuesta correcta es storage room."
        ],
        "pt-BR": [
          "bedroom também é do tema casa, mas não significa “a room for keeping things you do not use every day”. A resposta certa é storage room.",
          "bathroom também é do tema casa, mas não significa “a room for keeping things you do not use every day”. A resposta certa é storage room.",
          "Isso: storage room significa “a room for keeping things you do not use every day”. Ligue a palavra a uma cena simples da casa.",
          "porch também é do tema casa, mas não significa “a room for keeping things you do not use every day”. A resposta certa é storage room."
        ],
        "vi": [
          "bedroom cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room for keeping things you do not use every day”. Đáp án đúng là storage room.",
          "bathroom cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room for keeping things you do not use every day”. Đáp án đúng là storage room.",
          "storage room nghĩa là “a room for keeping things you do not use every day”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "porch cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a room for keeping things you do not use every day”. Đáp án đúng là storage room."
        ],
        "id": [
          "bedroom masih bertema rumah, tetapi bukan “a room for keeping things you do not use every day”. Jawaban yang tepat adalah storage room.",
          "bathroom masih bertema rumah, tetapi bukan “a room for keeping things you do not use every day”. Jawaban yang tepat adalah storage room.",
          "storage room berarti “a room for keeping things you do not use every day”. Bayangkan benda atau ruang itu di rumah.",
          "porch masih bertema rumah, tetapi bukan “a room for keeping things you do not use every day”. Jawaban yang tepat adalah storage room."
        ],
        "tr": [
          "bedroom ev temasıyla ilgili olabilir, ama “a room for keeping things you do not use every day” anlamına gelmez. Doğru cevap storage room.",
          "bathroom ev temasıyla ilgili olabilir, ama “a room for keeping things you do not use every day” anlamına gelmez. Doğru cevap storage room.",
          "Evet: storage room, “a room for keeping things you do not use every day” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "porch ev temasıyla ilgili olabilir, ama “a room for keeping things you do not use every day” anlamına gelmez. Doğru cevap storage room."
        ],
        "pl": [
          "bedroom też pasuje do tematu domu, ale nie znaczy „a room for keeping things you do not use every day”. Poprawna odpowiedź to storage room.",
          "bathroom też pasuje do tematu domu, ale nie znaczy „a room for keeping things you do not use every day”. Poprawna odpowiedź to storage room.",
          "Tak: storage room znaczy „a room for keeping things you do not use every day”. Połącz słowo z prostym obrazem w domu.",
          "porch też pasuje do tematu domu, ale nie znaczy „a room for keeping things you do not use every day”. Poprawna odpowiedź to storage room."
        ]
      }
    },
    {
      "id": "home-and-rooms-064",
      "type": "mcq",
      "prompt": "Choose the English word for: the top inside surface of a room.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «верхняя внутренняя поверхность комнаты».",
        "uk": "Яке англійське слово або фраза означає «the top inside surface of a room»?",
        "es": "¿Qué palabra o expresión inglesa significa «the top inside surface of a room»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the top inside surface of a room”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the top inside surface of a room”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the top inside surface of a room”?",
        "tr": "“the top inside surface of a room” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the top inside surface of a room”?"
      },
      "choices": [
        "floor",
        "wall",
        "rug",
        "ceiling"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose ceiling for the home-and-rooms meaning: the top inside surface of a room.",
      "skillTag": "home_parts",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C64",
        "K64"
      ],
      "choiceRationales": [
        "floor is a plausible home-and-rooms distractor, but it does not mean: the top inside surface of a room.",
        "wall is a plausible home-and-rooms distractor, but it does not mean: the top inside surface of a room.",
        "rug is a plausible home-and-rooms distractor, but it does not mean: the top inside surface of a room.",
        "ceiling is the only option that matches the tested meaning: the top inside surface of a room."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "floor — поверхность, по которой ходят в комнате. Это не про «верхняя внутренняя поверхность комнаты»; выбираем ceiling.",
          "wall означает «вертикальная сторона комнаты». Здесь спрашивают «верхняя внутренняя поверхность комнаты»; ответ ceiling.",
          "Не rug: это «небольшой ковер на части пола». В этом вопросе правильный вариант — ceiling.",
          "Да: ceiling — потолок. Это ровно то, что описано в задании."
        ],
        "uk": [
          "floor теж із теми дому, але не означає «the top inside surface of a room». Тут правильна відповідь ceiling.",
          "wall теж із теми дому, але не означає «the top inside surface of a room». Тут правильна відповідь ceiling.",
          "rug теж із теми дому, але не означає «the top inside surface of a room». Тут правильна відповідь ceiling.",
          "Так: ceiling означає «the top inside surface of a room». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "floor también suena a casa, pero no significa «the top inside surface of a room». La respuesta correcta es ceiling.",
          "wall también suena a casa, pero no significa «the top inside surface of a room». La respuesta correcta es ceiling.",
          "rug también suena a casa, pero no significa «the top inside surface of a room». La respuesta correcta es ceiling.",
          "Sí: ceiling significa «the top inside surface of a room». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "floor também é do tema casa, mas não significa “the top inside surface of a room”. A resposta certa é ceiling.",
          "wall também é do tema casa, mas não significa “the top inside surface of a room”. A resposta certa é ceiling.",
          "rug também é do tema casa, mas não significa “the top inside surface of a room”. A resposta certa é ceiling.",
          "Isso: ceiling significa “the top inside surface of a room”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "floor cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the top inside surface of a room”. Đáp án đúng là ceiling.",
          "wall cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the top inside surface of a room”. Đáp án đúng là ceiling.",
          "rug cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the top inside surface of a room”. Đáp án đúng là ceiling.",
          "ceiling nghĩa là “the top inside surface of a room”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "floor masih bertema rumah, tetapi bukan “the top inside surface of a room”. Jawaban yang tepat adalah ceiling.",
          "wall masih bertema rumah, tetapi bukan “the top inside surface of a room”. Jawaban yang tepat adalah ceiling.",
          "rug masih bertema rumah, tetapi bukan “the top inside surface of a room”. Jawaban yang tepat adalah ceiling.",
          "ceiling berarti “the top inside surface of a room”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "floor ev temasıyla ilgili olabilir, ama “the top inside surface of a room” anlamına gelmez. Doğru cevap ceiling.",
          "wall ev temasıyla ilgili olabilir, ama “the top inside surface of a room” anlamına gelmez. Doğru cevap ceiling.",
          "rug ev temasıyla ilgili olabilir, ama “the top inside surface of a room” anlamına gelmez. Doğru cevap ceiling.",
          "Evet: ceiling, “the top inside surface of a room” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "floor też pasuje do tematu domu, ale nie znaczy „the top inside surface of a room”. Poprawna odpowiedź to ceiling.",
          "wall też pasuje do tematu domu, ale nie znaczy „the top inside surface of a room”. Poprawna odpowiedź to ceiling.",
          "rug też pasuje do tematu domu, ale nie znaczy „the top inside surface of a room”. Poprawna odpowiedź to ceiling.",
          "Tak: ceiling znaczy „the top inside surface of a room”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-065",
      "type": "mcq",
      "prompt": "Choose the English word for: a clock that wakes you up.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «часы, которые будят утром».",
        "uk": "Яке англійське слово або фраза означає «a clock that wakes you up»?",
        "es": "¿Qué palabra o expresión inglesa significa «a clock that wakes you up»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a clock that wakes you up”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a clock that wakes you up”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a clock that wakes you up”?",
        "tr": "“a clock that wakes you up” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a clock that wakes you up”?"
      },
      "choices": [
        "alarm clock",
        "smoke alarm",
        "doorbell",
        "TV"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose alarm clock for the home-and-rooms meaning: a clock that wakes you up.",
      "skillTag": "home_bedroom",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C65",
        "K65"
      ],
      "choiceRationales": [
        "alarm clock is the only option that matches the tested meaning: a clock that wakes you up.",
        "smoke alarm is a plausible home-and-rooms distractor, but it does not mean: a clock that wakes you up.",
        "doorbell is a plausible home-and-rooms distractor, but it does not mean: a clock that wakes you up.",
        "TV is a plausible home-and-rooms distractor, but it does not mean: a clock that wakes you up."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: alarm clock — часы, которые будят утром. Это ровно то, что описано в задании.",
          "smoke alarm означает «устройство, которое предупреждает о дыме». Здесь спрашивают «часы, которые будят утром»; ответ alarm clock.",
          "Не doorbell: это «кнопка или устройство у двери для звонка». В этом вопросе правильный вариант — alarm clock.",
          "TV — «устройство для просмотра передач и видео», а в вопросе нужно «часы, которые будят утром». Поэтому выбираем alarm clock."
        ],
        "uk": [
          "Так: alarm clock означає «a clock that wakes you up». Тримай у голові просту домашню картинку.",
          "smoke alarm теж із теми дому, але не означає «a clock that wakes you up». Тут правильна відповідь alarm clock.",
          "doorbell теж із теми дому, але не означає «a clock that wakes you up». Тут правильна відповідь alarm clock.",
          "TV теж із теми дому, але не означає «a clock that wakes you up». Тут правильна відповідь alarm clock."
        ],
        "es": [
          "Sí: alarm clock significa «a clock that wakes you up». La imagen de casa ayuda a recordarlo.",
          "smoke alarm también suena a casa, pero no significa «a clock that wakes you up». La respuesta correcta es alarm clock.",
          "doorbell también suena a casa, pero no significa «a clock that wakes you up». La respuesta correcta es alarm clock.",
          "TV también suena a casa, pero no significa «a clock that wakes you up». La respuesta correcta es alarm clock."
        ],
        "pt-BR": [
          "Isso: alarm clock significa “a clock that wakes you up”. Ligue a palavra a uma cena simples da casa.",
          "smoke alarm também é do tema casa, mas não significa “a clock that wakes you up”. A resposta certa é alarm clock.",
          "doorbell também é do tema casa, mas não significa “a clock that wakes you up”. A resposta certa é alarm clock.",
          "TV também é do tema casa, mas não significa “a clock that wakes you up”. A resposta certa é alarm clock."
        ],
        "vi": [
          "alarm clock nghĩa là “a clock that wakes you up”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "smoke alarm cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a clock that wakes you up”. Đáp án đúng là alarm clock.",
          "doorbell cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a clock that wakes you up”. Đáp án đúng là alarm clock.",
          "TV cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a clock that wakes you up”. Đáp án đúng là alarm clock."
        ],
        "id": [
          "alarm clock berarti “a clock that wakes you up”. Bayangkan benda atau ruang itu di rumah.",
          "smoke alarm masih bertema rumah, tetapi bukan “a clock that wakes you up”. Jawaban yang tepat adalah alarm clock.",
          "doorbell masih bertema rumah, tetapi bukan “a clock that wakes you up”. Jawaban yang tepat adalah alarm clock.",
          "TV masih bertema rumah, tetapi bukan “a clock that wakes you up”. Jawaban yang tepat adalah alarm clock."
        ],
        "tr": [
          "Evet: alarm clock, “a clock that wakes you up” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "smoke alarm ev temasıyla ilgili olabilir, ama “a clock that wakes you up” anlamına gelmez. Doğru cevap alarm clock.",
          "doorbell ev temasıyla ilgili olabilir, ama “a clock that wakes you up” anlamına gelmez. Doğru cevap alarm clock.",
          "TV ev temasıyla ilgili olabilir, ama “a clock that wakes you up” anlamına gelmez. Doğru cevap alarm clock."
        ],
        "pl": [
          "Tak: alarm clock znaczy „a clock that wakes you up”. Połącz słowo z prostym obrazem w domu.",
          "smoke alarm też pasuje do tematu domu, ale nie znaczy „a clock that wakes you up”. Poprawna odpowiedź to alarm clock.",
          "doorbell też pasuje do tematu domu, ale nie znaczy „a clock that wakes you up”. Poprawna odpowiedź to alarm clock.",
          "TV też pasuje do tematu domu, ale nie znaczy „a clock that wakes you up”. Poprawna odpowiedź to alarm clock."
        ]
      }
    },
    {
      "id": "home-and-rooms-066",
      "type": "mcq",
      "prompt": "Choose the English word for: a box-shaped part of furniture that slides out.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «выдвижная часть мебели в форме коробки».",
        "uk": "Яке англійське слово або фраза означає «a box-shaped part of furniture that slides out»?",
        "es": "¿Qué palabra o expresión inglesa significa «a box-shaped part of furniture that slides out»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a box-shaped part of furniture that slides out”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a box-shaped part of furniture that slides out”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a box-shaped part of furniture that slides out”?",
        "tr": "“a box-shaped part of furniture that slides out” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a box-shaped part of furniture that slides out”?"
      },
      "choices": [
        "shelf",
        "drawer",
        "door",
        "basket"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose drawer for the home-and-rooms meaning: a box-shaped part of furniture that slides out.",
      "skillTag": "home_storage",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C66",
        "K66"
      ],
      "choiceRationales": [
        "shelf is a plausible home-and-rooms distractor, but it does not mean: a box-shaped part of furniture that slides out.",
        "drawer is the only option that matches the tested meaning: a box-shaped part of furniture that slides out.",
        "door is a plausible home-and-rooms distractor, but it does not mean: a box-shaped part of furniture that slides out.",
        "basket is a plausible home-and-rooms distractor, but it does not mean: a box-shaped part of furniture that slides out."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "shelf — плоская доска для хранения вещей на стене или в шкафу. Это не про «выдвижная часть мебели в форме коробки»; выбираем drawer.",
          "Да: drawer — выдвижная часть мебели в форме коробки. Это ровно то, что описано в задании.",
          "Не door: это «предмет, который открывают, чтобы войти в комнату». В этом вопросе правильный вариант — drawer.",
          "basket — «корзина», а в вопросе нужно «выдвижная часть мебели в форме коробки». Поэтому выбираем drawer."
        ],
        "uk": [
          "shelf теж із теми дому, але не означає «a box-shaped part of furniture that slides out». Тут правильна відповідь drawer.",
          "Так: drawer означає «a box-shaped part of furniture that slides out». Тримай у голові просту домашню картинку.",
          "door теж із теми дому, але не означає «a box-shaped part of furniture that slides out». Тут правильна відповідь drawer.",
          "basket теж із теми дому, але не означає «a box-shaped part of furniture that slides out». Тут правильна відповідь drawer."
        ],
        "es": [
          "shelf también suena a casa, pero no significa «a box-shaped part of furniture that slides out». La respuesta correcta es drawer.",
          "Sí: drawer significa «a box-shaped part of furniture that slides out». La imagen de casa ayuda a recordarlo.",
          "door también suena a casa, pero no significa «a box-shaped part of furniture that slides out». La respuesta correcta es drawer.",
          "basket también suena a casa, pero no significa «a box-shaped part of furniture that slides out». La respuesta correcta es drawer."
        ],
        "pt-BR": [
          "shelf também é do tema casa, mas não significa “a box-shaped part of furniture that slides out”. A resposta certa é drawer.",
          "Isso: drawer significa “a box-shaped part of furniture that slides out”. Ligue a palavra a uma cena simples da casa.",
          "door também é do tema casa, mas não significa “a box-shaped part of furniture that slides out”. A resposta certa é drawer.",
          "basket também é do tema casa, mas não significa “a box-shaped part of furniture that slides out”. A resposta certa é drawer."
        ],
        "vi": [
          "shelf cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a box-shaped part of furniture that slides out”. Đáp án đúng là drawer.",
          "drawer nghĩa là “a box-shaped part of furniture that slides out”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "door cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a box-shaped part of furniture that slides out”. Đáp án đúng là drawer.",
          "basket cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a box-shaped part of furniture that slides out”. Đáp án đúng là drawer."
        ],
        "id": [
          "shelf masih bertema rumah, tetapi bukan “a box-shaped part of furniture that slides out”. Jawaban yang tepat adalah drawer.",
          "drawer berarti “a box-shaped part of furniture that slides out”. Bayangkan benda atau ruang itu di rumah.",
          "door masih bertema rumah, tetapi bukan “a box-shaped part of furniture that slides out”. Jawaban yang tepat adalah drawer.",
          "basket masih bertema rumah, tetapi bukan “a box-shaped part of furniture that slides out”. Jawaban yang tepat adalah drawer."
        ],
        "tr": [
          "shelf ev temasıyla ilgili olabilir, ama “a box-shaped part of furniture that slides out” anlamına gelmez. Doğru cevap drawer.",
          "Evet: drawer, “a box-shaped part of furniture that slides out” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "door ev temasıyla ilgili olabilir, ama “a box-shaped part of furniture that slides out” anlamına gelmez. Doğru cevap drawer.",
          "basket ev temasıyla ilgili olabilir, ama “a box-shaped part of furniture that slides out” anlamına gelmez. Doğru cevap drawer."
        ],
        "pl": [
          "shelf też pasuje do tematu domu, ale nie znaczy „a box-shaped part of furniture that slides out”. Poprawna odpowiedź to drawer.",
          "Tak: drawer znaczy „a box-shaped part of furniture that slides out”. Połącz słowo z prostym obrazem w domu.",
          "door też pasuje do tematu domu, ale nie znaczy „a box-shaped part of furniture that slides out”. Poprawna odpowiedź to drawer.",
          "basket też pasuje do tematu domu, ale nie znaczy „a box-shaped part of furniture that slides out”. Poprawna odpowiedź to drawer."
        ]
      }
    },
    {
      "id": "home-and-rooms-067",
      "type": "mcq",
      "prompt": "Choose the English word for: a basket for dirty or clean clothes.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «корзина для грязной или чистой одежды».",
        "uk": "Яке англійське слово або фраза означає «a basket for dirty or clean clothes»?",
        "es": "¿Qué palabra o expresión inglesa significa «a basket for dirty or clean clothes»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a basket for dirty or clean clothes”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a basket for dirty or clean clothes”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a basket for dirty or clean clothes”?",
        "tr": "“a basket for dirty or clean clothes” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a basket for dirty or clean clothes”?"
      },
      "choices": [
        "trash can",
        "shoe rack",
        "laundry basket",
        "mailbox"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose laundry basket for the home-and-rooms meaning: a basket for dirty or clean clothes.",
      "skillTag": "home_laundry",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C67",
        "K67"
      ],
      "choiceRationales": [
        "trash can is a plausible home-and-rooms distractor, but it does not mean: a basket for dirty or clean clothes.",
        "shoe rack is a plausible home-and-rooms distractor, but it does not mean: a basket for dirty or clean clothes.",
        "laundry basket is the only option that matches the tested meaning: a basket for dirty or clean clothes.",
        "mailbox is a plausible home-and-rooms distractor, but it does not mean: a basket for dirty or clean clothes."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "trash can — контейнер для мусора. Это не про «корзина для грязной или чистой одежды»; выбираем laundry basket.",
          "shoe rack означает «полка или стойка для обуви». Здесь спрашивают «корзина для грязной или чистой одежды»; ответ laundry basket.",
          "Да: laundry basket — корзина для грязной или чистой одежды. Это ровно то, что описано в задании.",
          "mailbox — «ящик, куда доставляют письма», а в вопросе нужно «корзина для грязной или чистой одежды». Поэтому выбираем laundry basket."
        ],
        "uk": [
          "trash can теж із теми дому, але не означає «a basket for dirty or clean clothes». Тут правильна відповідь laundry basket.",
          "shoe rack теж із теми дому, але не означає «a basket for dirty or clean clothes». Тут правильна відповідь laundry basket.",
          "Так: laundry basket означає «a basket for dirty or clean clothes». Тримай у голові просту домашню картинку.",
          "mailbox теж із теми дому, але не означає «a basket for dirty or clean clothes». Тут правильна відповідь laundry basket."
        ],
        "es": [
          "trash can también suena a casa, pero no significa «a basket for dirty or clean clothes». La respuesta correcta es laundry basket.",
          "shoe rack también suena a casa, pero no significa «a basket for dirty or clean clothes». La respuesta correcta es laundry basket.",
          "Sí: laundry basket significa «a basket for dirty or clean clothes». La imagen de casa ayuda a recordarlo.",
          "mailbox también suena a casa, pero no significa «a basket for dirty or clean clothes». La respuesta correcta es laundry basket."
        ],
        "pt-BR": [
          "trash can também é do tema casa, mas não significa “a basket for dirty or clean clothes”. A resposta certa é laundry basket.",
          "shoe rack também é do tema casa, mas não significa “a basket for dirty or clean clothes”. A resposta certa é laundry basket.",
          "Isso: laundry basket significa “a basket for dirty or clean clothes”. Ligue a palavra a uma cena simples da casa.",
          "mailbox também é do tema casa, mas não significa “a basket for dirty or clean clothes”. A resposta certa é laundry basket."
        ],
        "vi": [
          "trash can cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a basket for dirty or clean clothes”. Đáp án đúng là laundry basket.",
          "shoe rack cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a basket for dirty or clean clothes”. Đáp án đúng là laundry basket.",
          "laundry basket nghĩa là “a basket for dirty or clean clothes”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "mailbox cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a basket for dirty or clean clothes”. Đáp án đúng là laundry basket."
        ],
        "id": [
          "trash can masih bertema rumah, tetapi bukan “a basket for dirty or clean clothes”. Jawaban yang tepat adalah laundry basket.",
          "shoe rack masih bertema rumah, tetapi bukan “a basket for dirty or clean clothes”. Jawaban yang tepat adalah laundry basket.",
          "laundry basket berarti “a basket for dirty or clean clothes”. Bayangkan benda atau ruang itu di rumah.",
          "mailbox masih bertema rumah, tetapi bukan “a basket for dirty or clean clothes”. Jawaban yang tepat adalah laundry basket."
        ],
        "tr": [
          "trash can ev temasıyla ilgili olabilir, ama “a basket for dirty or clean clothes” anlamına gelmez. Doğru cevap laundry basket.",
          "shoe rack ev temasıyla ilgili olabilir, ama “a basket for dirty or clean clothes” anlamına gelmez. Doğru cevap laundry basket.",
          "Evet: laundry basket, “a basket for dirty or clean clothes” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "mailbox ev temasıyla ilgili olabilir, ama “a basket for dirty or clean clothes” anlamına gelmez. Doğru cevap laundry basket."
        ],
        "pl": [
          "trash can też pasuje do tematu domu, ale nie znaczy „a basket for dirty or clean clothes”. Poprawna odpowiedź to laundry basket.",
          "shoe rack też pasuje do tematu domu, ale nie znaczy „a basket for dirty or clean clothes”. Poprawna odpowiedź to laundry basket.",
          "Tak: laundry basket znaczy „a basket for dirty or clean clothes”. Połącz słowo z prostym obrazem w domu.",
          "mailbox też pasuje do tematu domu, ale nie znaczy „a basket for dirty or clean clothes”. Poprawna odpowiedź to laundry basket."
        ]
      }
    },
    {
      "id": "home-and-rooms-068",
      "type": "mcq",
      "prompt": "Choose the English word for: an object for hanging clothes in a closet.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «предмет, на который вешают одежду в шкафу».",
        "uk": "Яке англійське слово або фраза означає «an object for hanging clothes in a closet»?",
        "es": "¿Qué palabra o expresión inglesa significa «an object for hanging clothes in a closet»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “an object for hanging clothes in a closet”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “an object for hanging clothes in a closet”?",
        "id": "Kata atau frasa Inggris mana yang berarti “an object for hanging clothes in a closet”?",
        "tr": "“an object for hanging clothes in a closet” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „an object for hanging clothes in a closet”?"
      },
      "choices": [
        "key hook",
        "towel rack",
        "coat rack",
        "hanger"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose hanger for the home-and-rooms meaning: an object for hanging clothes in a closet.",
      "skillTag": "home_clothes",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C68",
        "K68"
      ],
      "choiceRationales": [
        "key hook is a plausible home-and-rooms distractor, but it does not mean: an object for hanging clothes in a closet.",
        "towel rack is a plausible home-and-rooms distractor, but it does not mean: an object for hanging clothes in a closet.",
        "coat rack is a plausible home-and-rooms distractor, but it does not mean: an object for hanging clothes in a closet.",
        "hanger is the only option that matches the tested meaning: an object for hanging clothes in a closet."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "key hook — маленький крючок для ключей. Это не про «предмет, на который вешают одежду в шкафу»; выбираем hanger.",
          "towel rack означает «другой вариант». Здесь спрашивают «предмет, на который вешают одежду в шкафу»; ответ hanger.",
          "Не coat rack: это «стойка или вешалка для пальто». В этом вопросе правильный вариант — hanger.",
          "Да: hanger — предмет, на который вешают одежду в шкафу. Это ровно то, что описано в задании."
        ],
        "uk": [
          "key hook теж із теми дому, але не означає «an object for hanging clothes in a closet». Тут правильна відповідь hanger.",
          "towel rack теж із теми дому, але не означає «an object for hanging clothes in a closet». Тут правильна відповідь hanger.",
          "coat rack теж із теми дому, але не означає «an object for hanging clothes in a closet». Тут правильна відповідь hanger.",
          "Так: hanger означає «an object for hanging clothes in a closet». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "key hook también suena a casa, pero no significa «an object for hanging clothes in a closet». La respuesta correcta es hanger.",
          "towel rack también suena a casa, pero no significa «an object for hanging clothes in a closet». La respuesta correcta es hanger.",
          "coat rack también suena a casa, pero no significa «an object for hanging clothes in a closet». La respuesta correcta es hanger.",
          "Sí: hanger significa «an object for hanging clothes in a closet». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "key hook também é do tema casa, mas não significa “an object for hanging clothes in a closet”. A resposta certa é hanger.",
          "towel rack também é do tema casa, mas não significa “an object for hanging clothes in a closet”. A resposta certa é hanger.",
          "coat rack também é do tema casa, mas não significa “an object for hanging clothes in a closet”. A resposta certa é hanger.",
          "Isso: hanger significa “an object for hanging clothes in a closet”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "key hook cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “an object for hanging clothes in a closet”. Đáp án đúng là hanger.",
          "towel rack cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “an object for hanging clothes in a closet”. Đáp án đúng là hanger.",
          "coat rack cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “an object for hanging clothes in a closet”. Đáp án đúng là hanger.",
          "hanger nghĩa là “an object for hanging clothes in a closet”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "key hook masih bertema rumah, tetapi bukan “an object for hanging clothes in a closet”. Jawaban yang tepat adalah hanger.",
          "towel rack masih bertema rumah, tetapi bukan “an object for hanging clothes in a closet”. Jawaban yang tepat adalah hanger.",
          "coat rack masih bertema rumah, tetapi bukan “an object for hanging clothes in a closet”. Jawaban yang tepat adalah hanger.",
          "hanger berarti “an object for hanging clothes in a closet”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "key hook ev temasıyla ilgili olabilir, ama “an object for hanging clothes in a closet” anlamına gelmez. Doğru cevap hanger.",
          "towel rack ev temasıyla ilgili olabilir, ama “an object for hanging clothes in a closet” anlamına gelmez. Doğru cevap hanger.",
          "coat rack ev temasıyla ilgili olabilir, ama “an object for hanging clothes in a closet” anlamına gelmez. Doğru cevap hanger.",
          "Evet: hanger, “an object for hanging clothes in a closet” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "key hook też pasuje do tematu domu, ale nie znaczy „an object for hanging clothes in a closet”. Poprawna odpowiedź to hanger.",
          "towel rack też pasuje do tematu domu, ale nie znaczy „an object for hanging clothes in a closet”. Poprawna odpowiedź to hanger.",
          "coat rack też pasuje do tematu domu, ale nie znaczy „an object for hanging clothes in a closet”. Poprawna odpowiedź to hanger.",
          "Tak: hanger znaczy „an object for hanging clothes in a closet”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-069",
      "type": "mcq",
      "prompt": "Choose the English word for: a small storage space for clothes or household items.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «небольшое место для хранения одежды или домашних вещей».",
        "uk": "Яке англійське слово або фраза означає «a small storage space for clothes or household items»?",
        "es": "¿Qué palabra o expresión inglesa significa «a small storage space for clothes or household items»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a small storage space for clothes or household items”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a small storage space for clothes or household items”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a small storage space for clothes or household items”?",
        "tr": "“a small storage space for clothes or household items” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a small storage space for clothes or household items”?"
      },
      "choices": [
        "closet",
        "balcony",
        "garage",
        "sink"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose closet for the home-and-rooms meaning: a small storage space for clothes or household items.",
      "skillTag": "home_storage",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C69",
        "K69"
      ],
      "choiceRationales": [
        "closet is the only option that matches the tested meaning: a small storage space for clothes or household items.",
        "balcony is a plausible home-and-rooms distractor, but it does not mean: a small storage space for clothes or household items.",
        "garage is a plausible home-and-rooms distractor, but it does not mean: a small storage space for clothes or household items.",
        "sink is a plausible home-and-rooms distractor, but it does not mean: a small storage space for clothes or household items."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: closet — небольшое место для хранения одежды или домашних вещей. Это ровно то, что описано в задании.",
          "balcony означает «небольшая открытая площадка на верхнем этаже». Здесь спрашивают «небольшое место для хранения одежды или домашних вещей»; ответ closet.",
          "Не garage: это «место в доме для машины». В этом вопросе правильный вариант — closet.",
          "sink — «чаша с водой для мытья рук или посуды», а в вопросе нужно «небольшое место для хранения одежды или домашних вещей». Поэтому выбираем closet."
        ],
        "uk": [
          "Так: closet означає «a small storage space for clothes or household items». Тримай у голові просту домашню картинку.",
          "balcony теж із теми дому, але не означає «a small storage space for clothes or household items». Тут правильна відповідь closet.",
          "garage теж із теми дому, але не означає «a small storage space for clothes or household items». Тут правильна відповідь closet.",
          "sink теж із теми дому, але не означає «a small storage space for clothes or household items». Тут правильна відповідь closet."
        ],
        "es": [
          "Sí: closet significa «a small storage space for clothes or household items». La imagen de casa ayuda a recordarlo.",
          "balcony también suena a casa, pero no significa «a small storage space for clothes or household items». La respuesta correcta es closet.",
          "garage también suena a casa, pero no significa «a small storage space for clothes or household items». La respuesta correcta es closet.",
          "sink también suena a casa, pero no significa «a small storage space for clothes or household items». La respuesta correcta es closet."
        ],
        "pt-BR": [
          "Isso: closet significa “a small storage space for clothes or household items”. Ligue a palavra a uma cena simples da casa.",
          "balcony também é do tema casa, mas não significa “a small storage space for clothes or household items”. A resposta certa é closet.",
          "garage também é do tema casa, mas não significa “a small storage space for clothes or household items”. A resposta certa é closet.",
          "sink também é do tema casa, mas não significa “a small storage space for clothes or household items”. A resposta certa é closet."
        ],
        "vi": [
          "closet nghĩa là “a small storage space for clothes or household items”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "balcony cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small storage space for clothes or household items”. Đáp án đúng là closet.",
          "garage cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small storage space for clothes or household items”. Đáp án đúng là closet.",
          "sink cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small storage space for clothes or household items”. Đáp án đúng là closet."
        ],
        "id": [
          "closet berarti “a small storage space for clothes or household items”. Bayangkan benda atau ruang itu di rumah.",
          "balcony masih bertema rumah, tetapi bukan “a small storage space for clothes or household items”. Jawaban yang tepat adalah closet.",
          "garage masih bertema rumah, tetapi bukan “a small storage space for clothes or household items”. Jawaban yang tepat adalah closet.",
          "sink masih bertema rumah, tetapi bukan “a small storage space for clothes or household items”. Jawaban yang tepat adalah closet."
        ],
        "tr": [
          "Evet: closet, “a small storage space for clothes or household items” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "balcony ev temasıyla ilgili olabilir, ama “a small storage space for clothes or household items” anlamına gelmez. Doğru cevap closet.",
          "garage ev temasıyla ilgili olabilir, ama “a small storage space for clothes or household items” anlamına gelmez. Doğru cevap closet.",
          "sink ev temasıyla ilgili olabilir, ama “a small storage space for clothes or household items” anlamına gelmez. Doğru cevap closet."
        ],
        "pl": [
          "Tak: closet znaczy „a small storage space for clothes or household items”. Połącz słowo z prostym obrazem w domu.",
          "balcony też pasuje do tematu domu, ale nie znaczy „a small storage space for clothes or household items”. Poprawna odpowiedź to closet.",
          "garage też pasuje do tematu domu, ale nie znaczy „a small storage space for clothes or household items”. Poprawna odpowiedź to closet.",
          "sink też pasuje do tematu domu, ale nie znaczy „a small storage space for clothes or household items”. Poprawna odpowiedź to closet."
        ]
      }
    },
    {
      "id": "home-and-rooms-070",
      "type": "mcq",
      "prompt": "Choose the English word for: a small shelf or stand for shoes.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «полка или стойка для обуви».",
        "uk": "Яке англійське слово або фраза означає «a small shelf or stand for shoes»?",
        "es": "¿Qué palabra o expresión inglesa significa «a small shelf or stand for shoes»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a small shelf or stand for shoes”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a small shelf or stand for shoes”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a small shelf or stand for shoes”?",
        "tr": "“a small shelf or stand for shoes” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a small shelf or stand for shoes”?"
      },
      "choices": [
        "bookshelf",
        "shoe rack",
        "towel rack",
        "medicine cabinet"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose shoe rack for the home-and-rooms meaning: a small shelf or stand for shoes.",
      "skillTag": "home_storage",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C70",
        "K70"
      ],
      "choiceRationales": [
        "bookshelf is a plausible home-and-rooms distractor, but it does not mean: a small shelf or stand for shoes.",
        "shoe rack is the only option that matches the tested meaning: a small shelf or stand for shoes.",
        "towel rack is a plausible home-and-rooms distractor, but it does not mean: a small shelf or stand for shoes.",
        "medicine cabinet is a plausible home-and-rooms distractor, but it does not mean: a small shelf or stand for shoes."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "bookshelf — полка или шкаф для книг. Это не про «полка или стойка для обуви»; выбираем shoe rack.",
          "Да: shoe rack — полка или стойка для обуви. Это ровно то, что описано в задании.",
          "Не towel rack: это «другой вариант». В этом вопросе правильный вариант — shoe rack.",
          "medicine cabinet — «шкафчик для лекарств», а в вопросе нужно «полка или стойка для обуви». Поэтому выбираем shoe rack."
        ],
        "uk": [
          "bookshelf теж із теми дому, але не означає «a small shelf or stand for shoes». Тут правильна відповідь shoe rack.",
          "Так: shoe rack означає «a small shelf or stand for shoes». Тримай у голові просту домашню картинку.",
          "towel rack теж із теми дому, але не означає «a small shelf or stand for shoes». Тут правильна відповідь shoe rack.",
          "medicine cabinet теж із теми дому, але не означає «a small shelf or stand for shoes». Тут правильна відповідь shoe rack."
        ],
        "es": [
          "bookshelf también suena a casa, pero no significa «a small shelf or stand for shoes». La respuesta correcta es shoe rack.",
          "Sí: shoe rack significa «a small shelf or stand for shoes». La imagen de casa ayuda a recordarlo.",
          "towel rack también suena a casa, pero no significa «a small shelf or stand for shoes». La respuesta correcta es shoe rack.",
          "medicine cabinet también suena a casa, pero no significa «a small shelf or stand for shoes». La respuesta correcta es shoe rack."
        ],
        "pt-BR": [
          "bookshelf também é do tema casa, mas não significa “a small shelf or stand for shoes”. A resposta certa é shoe rack.",
          "Isso: shoe rack significa “a small shelf or stand for shoes”. Ligue a palavra a uma cena simples da casa.",
          "towel rack também é do tema casa, mas não significa “a small shelf or stand for shoes”. A resposta certa é shoe rack.",
          "medicine cabinet também é do tema casa, mas não significa “a small shelf or stand for shoes”. A resposta certa é shoe rack."
        ],
        "vi": [
          "bookshelf cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small shelf or stand for shoes”. Đáp án đúng là shoe rack.",
          "shoe rack nghĩa là “a small shelf or stand for shoes”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "towel rack cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small shelf or stand for shoes”. Đáp án đúng là shoe rack.",
          "medicine cabinet cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small shelf or stand for shoes”. Đáp án đúng là shoe rack."
        ],
        "id": [
          "bookshelf masih bertema rumah, tetapi bukan “a small shelf or stand for shoes”. Jawaban yang tepat adalah shoe rack.",
          "shoe rack berarti “a small shelf or stand for shoes”. Bayangkan benda atau ruang itu di rumah.",
          "towel rack masih bertema rumah, tetapi bukan “a small shelf or stand for shoes”. Jawaban yang tepat adalah shoe rack.",
          "medicine cabinet masih bertema rumah, tetapi bukan “a small shelf or stand for shoes”. Jawaban yang tepat adalah shoe rack."
        ],
        "tr": [
          "bookshelf ev temasıyla ilgili olabilir, ama “a small shelf or stand for shoes” anlamına gelmez. Doğru cevap shoe rack.",
          "Evet: shoe rack, “a small shelf or stand for shoes” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "towel rack ev temasıyla ilgili olabilir, ama “a small shelf or stand for shoes” anlamına gelmez. Doğru cevap shoe rack.",
          "medicine cabinet ev temasıyla ilgili olabilir, ama “a small shelf or stand for shoes” anlamına gelmez. Doğru cevap shoe rack."
        ],
        "pl": [
          "bookshelf też pasuje do tematu domu, ale nie znaczy „a small shelf or stand for shoes”. Poprawna odpowiedź to shoe rack.",
          "Tak: shoe rack znaczy „a small shelf or stand for shoes”. Połącz słowo z prostym obrazem w domu.",
          "towel rack też pasuje do tematu domu, ale nie znaczy „a small shelf or stand for shoes”. Poprawna odpowiedź to shoe rack.",
          "medicine cabinet też pasuje do tematu domu, ale nie znaczy „a small shelf or stand for shoes”. Poprawna odpowiedź to shoe rack."
        ]
      }
    },
    {
      "id": "home-and-rooms-071",
      "type": "mcq",
      "prompt": "Choose the English word for: a machine that washes clothes.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «машина, которая стирает одежду».",
        "uk": "Яке англійське слово або фраза означає «a machine that washes clothes»?",
        "es": "¿Qué palabra o expresión inglesa significa «a machine that washes clothes»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a machine that washes clothes”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a machine that washes clothes”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a machine that washes clothes”?",
        "tr": "“a machine that washes clothes” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a machine that washes clothes”?"
      },
      "choices": [
        "dryer",
        "dishwasher",
        "washing machine",
        "vacuum cleaner"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose washing machine for the home-and-rooms meaning: a machine that washes clothes.",
      "skillTag": "home_laundry",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C71",
        "K71"
      ],
      "choiceRationales": [
        "dryer is a plausible home-and-rooms distractor, but it does not mean: a machine that washes clothes.",
        "dishwasher is a plausible home-and-rooms distractor, but it does not mean: a machine that washes clothes.",
        "washing machine is the only option that matches the tested meaning: a machine that washes clothes.",
        "vacuum cleaner is a plausible home-and-rooms distractor, but it does not mean: a machine that washes clothes."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "dryer — машина, которая сушит одежду. Это не про «машина, которая стирает одежду»; выбираем washing machine.",
          "dishwasher означает «посудомоечная машина». Здесь спрашивают «машина, которая стирает одежду»; ответ washing machine.",
          "Да: washing machine — машина, которая стирает одежду. Это ровно то, что описано в задании.",
          "vacuum cleaner — «машина, которая всасывает пыль с пола», а в вопросе нужно «машина, которая стирает одежду». Поэтому выбираем washing machine."
        ],
        "uk": [
          "dryer теж із теми дому, але не означає «a machine that washes clothes». Тут правильна відповідь washing machine.",
          "dishwasher теж із теми дому, але не означає «a machine that washes clothes». Тут правильна відповідь washing machine.",
          "Так: washing machine означає «a machine that washes clothes». Тримай у голові просту домашню картинку.",
          "vacuum cleaner теж із теми дому, але не означає «a machine that washes clothes». Тут правильна відповідь washing machine."
        ],
        "es": [
          "dryer también suena a casa, pero no significa «a machine that washes clothes». La respuesta correcta es washing machine.",
          "dishwasher también suena a casa, pero no significa «a machine that washes clothes». La respuesta correcta es washing machine.",
          "Sí: washing machine significa «a machine that washes clothes». La imagen de casa ayuda a recordarlo.",
          "vacuum cleaner también suena a casa, pero no significa «a machine that washes clothes». La respuesta correcta es washing machine."
        ],
        "pt-BR": [
          "dryer também é do tema casa, mas não significa “a machine that washes clothes”. A resposta certa é washing machine.",
          "dishwasher também é do tema casa, mas não significa “a machine that washes clothes”. A resposta certa é washing machine.",
          "Isso: washing machine significa “a machine that washes clothes”. Ligue a palavra a uma cena simples da casa.",
          "vacuum cleaner também é do tema casa, mas não significa “a machine that washes clothes”. A resposta certa é washing machine."
        ],
        "vi": [
          "dryer cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a machine that washes clothes”. Đáp án đúng là washing machine.",
          "dishwasher cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a machine that washes clothes”. Đáp án đúng là washing machine.",
          "washing machine nghĩa là “a machine that washes clothes”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "vacuum cleaner cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a machine that washes clothes”. Đáp án đúng là washing machine."
        ],
        "id": [
          "dryer masih bertema rumah, tetapi bukan “a machine that washes clothes”. Jawaban yang tepat adalah washing machine.",
          "dishwasher masih bertema rumah, tetapi bukan “a machine that washes clothes”. Jawaban yang tepat adalah washing machine.",
          "washing machine berarti “a machine that washes clothes”. Bayangkan benda atau ruang itu di rumah.",
          "vacuum cleaner masih bertema rumah, tetapi bukan “a machine that washes clothes”. Jawaban yang tepat adalah washing machine."
        ],
        "tr": [
          "dryer ev temasıyla ilgili olabilir, ama “a machine that washes clothes” anlamına gelmez. Doğru cevap washing machine.",
          "dishwasher ev temasıyla ilgili olabilir, ama “a machine that washes clothes” anlamına gelmez. Doğru cevap washing machine.",
          "Evet: washing machine, “a machine that washes clothes” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "vacuum cleaner ev temasıyla ilgili olabilir, ama “a machine that washes clothes” anlamına gelmez. Doğru cevap washing machine."
        ],
        "pl": [
          "dryer też pasuje do tematu domu, ale nie znaczy „a machine that washes clothes”. Poprawna odpowiedź to washing machine.",
          "dishwasher też pasuje do tematu domu, ale nie znaczy „a machine that washes clothes”. Poprawna odpowiedź to washing machine.",
          "Tak: washing machine znaczy „a machine that washes clothes”. Połącz słowo z prostym obrazem w domu.",
          "vacuum cleaner też pasuje do tematu domu, ale nie znaczy „a machine that washes clothes”. Poprawna odpowiedź to washing machine."
        ]
      }
    },
    {
      "id": "home-and-rooms-072",
      "type": "mcq",
      "prompt": "Choose the English word for: a machine that dries clothes.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «машина, которая сушит одежду».",
        "uk": "Яке англійське слово або фраза означає «a machine that dries clothes»?",
        "es": "¿Qué palabra o expresión inglesa significa «a machine that dries clothes»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a machine that dries clothes”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a machine that dries clothes”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a machine that dries clothes”?",
        "tr": "“a machine that dries clothes” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a machine that dries clothes”?"
      },
      "choices": [
        "washing machine",
        "hair dryer",
        "iron",
        "dryer"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose dryer for the home-and-rooms meaning: a machine that dries clothes.",
      "skillTag": "home_laundry",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C72",
        "K72"
      ],
      "choiceRationales": [
        "washing machine is a plausible home-and-rooms distractor, but it does not mean: a machine that dries clothes.",
        "hair dryer is a plausible home-and-rooms distractor, but it does not mean: a machine that dries clothes.",
        "iron is a plausible home-and-rooms distractor, but it does not mean: a machine that dries clothes.",
        "dryer is the only option that matches the tested meaning: a machine that dries clothes."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "washing machine — машина, которая стирает одежду. Это не про «машина, которая сушит одежду»; выбираем dryer.",
          "hair dryer означает «устройство с теплым воздухом для сушки волос». Здесь спрашивают «машина, которая сушит одежду»; ответ dryer.",
          "Не iron: это «горячий инструмент для разглаживания одежды». В этом вопросе правильный вариант — dryer.",
          "Да: dryer — машина, которая сушит одежду. Это ровно то, что описано в задании."
        ],
        "uk": [
          "washing machine теж із теми дому, але не означає «a machine that dries clothes». Тут правильна відповідь dryer.",
          "hair dryer теж із теми дому, але не означає «a machine that dries clothes». Тут правильна відповідь dryer.",
          "iron теж із теми дому, але не означає «a machine that dries clothes». Тут правильна відповідь dryer.",
          "Так: dryer означає «a machine that dries clothes». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "washing machine también suena a casa, pero no significa «a machine that dries clothes». La respuesta correcta es dryer.",
          "hair dryer también suena a casa, pero no significa «a machine that dries clothes». La respuesta correcta es dryer.",
          "iron también suena a casa, pero no significa «a machine that dries clothes». La respuesta correcta es dryer.",
          "Sí: dryer significa «a machine that dries clothes». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "washing machine também é do tema casa, mas não significa “a machine that dries clothes”. A resposta certa é dryer.",
          "hair dryer também é do tema casa, mas não significa “a machine that dries clothes”. A resposta certa é dryer.",
          "iron também é do tema casa, mas não significa “a machine that dries clothes”. A resposta certa é dryer.",
          "Isso: dryer significa “a machine that dries clothes”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "washing machine cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a machine that dries clothes”. Đáp án đúng là dryer.",
          "hair dryer cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a machine that dries clothes”. Đáp án đúng là dryer.",
          "iron cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a machine that dries clothes”. Đáp án đúng là dryer.",
          "dryer nghĩa là “a machine that dries clothes”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "washing machine masih bertema rumah, tetapi bukan “a machine that dries clothes”. Jawaban yang tepat adalah dryer.",
          "hair dryer masih bertema rumah, tetapi bukan “a machine that dries clothes”. Jawaban yang tepat adalah dryer.",
          "iron masih bertema rumah, tetapi bukan “a machine that dries clothes”. Jawaban yang tepat adalah dryer.",
          "dryer berarti “a machine that dries clothes”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "washing machine ev temasıyla ilgili olabilir, ama “a machine that dries clothes” anlamına gelmez. Doğru cevap dryer.",
          "hair dryer ev temasıyla ilgili olabilir, ama “a machine that dries clothes” anlamına gelmez. Doğru cevap dryer.",
          "iron ev temasıyla ilgili olabilir, ama “a machine that dries clothes” anlamına gelmez. Doğru cevap dryer.",
          "Evet: dryer, “a machine that dries clothes” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "washing machine też pasuje do tematu domu, ale nie znaczy „a machine that dries clothes”. Poprawna odpowiedź to dryer.",
          "hair dryer też pasuje do tematu domu, ale nie znaczy „a machine that dries clothes”. Poprawna odpowiedź to dryer.",
          "iron też pasuje do tematu domu, ale nie znaczy „a machine that dries clothes”. Poprawna odpowiedź to dryer.",
          "Tak: dryer znaczy „a machine that dries clothes”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-073",
      "type": "mcq",
      "prompt": "Choose the English word for: a hot tool used to smooth clothes.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «горячий инструмент для разглаживания одежды».",
        "uk": "Яке англійське слово або фраза означає «a hot tool used to smooth clothes»?",
        "es": "¿Qué palabra o expresión inglesa significa «a hot tool used to smooth clothes»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a hot tool used to smooth clothes”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a hot tool used to smooth clothes”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a hot tool used to smooth clothes”?",
        "tr": "“a hot tool used to smooth clothes” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a hot tool used to smooth clothes”?"
      },
      "choices": [
        "iron",
        "comb",
        "broom",
        "tap"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose iron for the home-and-rooms meaning: a hot tool used to smooth clothes.",
      "skillTag": "home_laundry",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C73",
        "K73"
      ],
      "choiceRationales": [
        "iron is the only option that matches the tested meaning: a hot tool used to smooth clothes.",
        "comb is a plausible home-and-rooms distractor, but it does not mean: a hot tool used to smooth clothes.",
        "broom is a plausible home-and-rooms distractor, but it does not mean: a hot tool used to smooth clothes.",
        "tap is a plausible home-and-rooms distractor, but it does not mean: a hot tool used to smooth clothes."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: iron — горячий инструмент для разглаживания одежды. Это ровно то, что описано в задании.",
          "comb означает «предмет, которым приводят волосы в порядок». Здесь спрашивают «горячий инструмент для разглаживания одежды»; ответ iron.",
          "Не broom: это «инструмент, которым подметают пол». В этом вопросе правильный вариант — iron.",
          "tap — «часть, откуда течет вода», а в вопросе нужно «горячий инструмент для разглаживания одежды». Поэтому выбираем iron."
        ],
        "uk": [
          "Так: iron означає «a hot tool used to smooth clothes». Тримай у голові просту домашню картинку.",
          "comb теж із теми дому, але не означає «a hot tool used to smooth clothes». Тут правильна відповідь iron.",
          "broom теж із теми дому, але не означає «a hot tool used to smooth clothes». Тут правильна відповідь iron.",
          "tap теж із теми дому, але не означає «a hot tool used to smooth clothes». Тут правильна відповідь iron."
        ],
        "es": [
          "Sí: iron significa «a hot tool used to smooth clothes». La imagen de casa ayuda a recordarlo.",
          "comb también suena a casa, pero no significa «a hot tool used to smooth clothes». La respuesta correcta es iron.",
          "broom también suena a casa, pero no significa «a hot tool used to smooth clothes». La respuesta correcta es iron.",
          "tap también suena a casa, pero no significa «a hot tool used to smooth clothes». La respuesta correcta es iron."
        ],
        "pt-BR": [
          "Isso: iron significa “a hot tool used to smooth clothes”. Ligue a palavra a uma cena simples da casa.",
          "comb também é do tema casa, mas não significa “a hot tool used to smooth clothes”. A resposta certa é iron.",
          "broom também é do tema casa, mas não significa “a hot tool used to smooth clothes”. A resposta certa é iron.",
          "tap também é do tema casa, mas não significa “a hot tool used to smooth clothes”. A resposta certa é iron."
        ],
        "vi": [
          "iron nghĩa là “a hot tool used to smooth clothes”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "comb cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a hot tool used to smooth clothes”. Đáp án đúng là iron.",
          "broom cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a hot tool used to smooth clothes”. Đáp án đúng là iron.",
          "tap cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a hot tool used to smooth clothes”. Đáp án đúng là iron."
        ],
        "id": [
          "iron berarti “a hot tool used to smooth clothes”. Bayangkan benda atau ruang itu di rumah.",
          "comb masih bertema rumah, tetapi bukan “a hot tool used to smooth clothes”. Jawaban yang tepat adalah iron.",
          "broom masih bertema rumah, tetapi bukan “a hot tool used to smooth clothes”. Jawaban yang tepat adalah iron.",
          "tap masih bertema rumah, tetapi bukan “a hot tool used to smooth clothes”. Jawaban yang tepat adalah iron."
        ],
        "tr": [
          "Evet: iron, “a hot tool used to smooth clothes” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "comb ev temasıyla ilgili olabilir, ama “a hot tool used to smooth clothes” anlamına gelmez. Doğru cevap iron.",
          "broom ev temasıyla ilgili olabilir, ama “a hot tool used to smooth clothes” anlamına gelmez. Doğru cevap iron.",
          "tap ev temasıyla ilgili olabilir, ama “a hot tool used to smooth clothes” anlamına gelmez. Doğru cevap iron."
        ],
        "pl": [
          "Tak: iron znaczy „a hot tool used to smooth clothes”. Połącz słowo z prostym obrazem w domu.",
          "comb też pasuje do tematu domu, ale nie znaczy „a hot tool used to smooth clothes”. Poprawna odpowiedź to iron.",
          "broom też pasuje do tematu domu, ale nie znaczy „a hot tool used to smooth clothes”. Poprawna odpowiedź to iron.",
          "tap też pasuje do tematu domu, ale nie znaczy „a hot tool used to smooth clothes”. Poprawna odpowiedź to iron."
        ]
      }
    },
    {
      "id": "home-and-rooms-074",
      "type": "mcq",
      "prompt": "Choose the English word for: a narrow board used when ironing clothes.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «узкая доска для глажки одежды».",
        "uk": "Яке англійське слово або фраза означає «a narrow board used when ironing clothes»?",
        "es": "¿Qué palabra o expresión inglesa significa «a narrow board used when ironing clothes»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a narrow board used when ironing clothes”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a narrow board used when ironing clothes”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a narrow board used when ironing clothes”?",
        "tr": "“a narrow board used when ironing clothes” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a narrow board used when ironing clothes”?"
      },
      "choices": [
        "coffee table",
        "ironing board",
        "desk",
        "shelf"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose ironing board for the home-and-rooms meaning: a narrow board used when ironing clothes.",
      "skillTag": "home_laundry",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C74",
        "K74"
      ],
      "choiceRationales": [
        "coffee table is a plausible home-and-rooms distractor, but it does not mean: a narrow board used when ironing clothes.",
        "ironing board is the only option that matches the tested meaning: a narrow board used when ironing clothes.",
        "desk is a plausible home-and-rooms distractor, but it does not mean: a narrow board used when ironing clothes.",
        "shelf is a plausible home-and-rooms distractor, but it does not mean: a narrow board used when ironing clothes."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "coffee table — низкий столик рядом с диваном. Это не про «узкая доска для глажки одежды»; выбираем ironing board.",
          "Да: ironing board — узкая доска для глажки одежды. Это ровно то, что описано в задании.",
          "Не desk: это «стол для учебы или работы». В этом вопросе правильный вариант — ironing board.",
          "shelf — «плоская доска для хранения вещей на стене или в шкафу», а в вопросе нужно «узкая доска для глажки одежды». Поэтому выбираем ironing board."
        ],
        "uk": [
          "coffee table теж із теми дому, але не означає «a narrow board used when ironing clothes». Тут правильна відповідь ironing board.",
          "Так: ironing board означає «a narrow board used when ironing clothes». Тримай у голові просту домашню картинку.",
          "desk теж із теми дому, але не означає «a narrow board used when ironing clothes». Тут правильна відповідь ironing board.",
          "shelf теж із теми дому, але не означає «a narrow board used when ironing clothes». Тут правильна відповідь ironing board."
        ],
        "es": [
          "coffee table también suena a casa, pero no significa «a narrow board used when ironing clothes». La respuesta correcta es ironing board.",
          "Sí: ironing board significa «a narrow board used when ironing clothes». La imagen de casa ayuda a recordarlo.",
          "desk también suena a casa, pero no significa «a narrow board used when ironing clothes». La respuesta correcta es ironing board.",
          "shelf también suena a casa, pero no significa «a narrow board used when ironing clothes». La respuesta correcta es ironing board."
        ],
        "pt-BR": [
          "coffee table também é do tema casa, mas não significa “a narrow board used when ironing clothes”. A resposta certa é ironing board.",
          "Isso: ironing board significa “a narrow board used when ironing clothes”. Ligue a palavra a uma cena simples da casa.",
          "desk também é do tema casa, mas não significa “a narrow board used when ironing clothes”. A resposta certa é ironing board.",
          "shelf também é do tema casa, mas não significa “a narrow board used when ironing clothes”. A resposta certa é ironing board."
        ],
        "vi": [
          "coffee table cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a narrow board used when ironing clothes”. Đáp án đúng là ironing board.",
          "ironing board nghĩa là “a narrow board used when ironing clothes”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "desk cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a narrow board used when ironing clothes”. Đáp án đúng là ironing board.",
          "shelf cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a narrow board used when ironing clothes”. Đáp án đúng là ironing board."
        ],
        "id": [
          "coffee table masih bertema rumah, tetapi bukan “a narrow board used when ironing clothes”. Jawaban yang tepat adalah ironing board.",
          "ironing board berarti “a narrow board used when ironing clothes”. Bayangkan benda atau ruang itu di rumah.",
          "desk masih bertema rumah, tetapi bukan “a narrow board used when ironing clothes”. Jawaban yang tepat adalah ironing board.",
          "shelf masih bertema rumah, tetapi bukan “a narrow board used when ironing clothes”. Jawaban yang tepat adalah ironing board."
        ],
        "tr": [
          "coffee table ev temasıyla ilgili olabilir, ama “a narrow board used when ironing clothes” anlamına gelmez. Doğru cevap ironing board.",
          "Evet: ironing board, “a narrow board used when ironing clothes” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "desk ev temasıyla ilgili olabilir, ama “a narrow board used when ironing clothes” anlamına gelmez. Doğru cevap ironing board.",
          "shelf ev temasıyla ilgili olabilir, ama “a narrow board used when ironing clothes” anlamına gelmez. Doğru cevap ironing board."
        ],
        "pl": [
          "coffee table też pasuje do tematu domu, ale nie znaczy „a narrow board used when ironing clothes”. Poprawna odpowiedź to ironing board.",
          "Tak: ironing board znaczy „a narrow board used when ironing clothes”. Połącz słowo z prostym obrazem w domu.",
          "desk też pasuje do tematu domu, ale nie znaczy „a narrow board used when ironing clothes”. Poprawna odpowiedź to ironing board.",
          "shelf też pasuje do tematu domu, ale nie znaczy „a narrow board used when ironing clothes”. Poprawna odpowiedź to ironing board."
        ]
      }
    },
    {
      "id": "home-and-rooms-075",
      "type": "mcq",
      "prompt": "Choose the English word for: a line where clothes hang to dry.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «веревка или линия, на которой сушат одежду».",
        "uk": "Яке англійське слово або фраза означає «a line where clothes hang to dry»?",
        "es": "¿Qué palabra o expresión inglesa significa «a line where clothes hang to dry»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a line where clothes hang to dry”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a line where clothes hang to dry”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a line where clothes hang to dry”?",
        "tr": "“a line where clothes hang to dry” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a line where clothes hang to dry”?"
      },
      "choices": [
        "extension cord",
        "shower curtain",
        "clothesline",
        "fence"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose clothesline for the home-and-rooms meaning: a line where clothes hang to dry.",
      "skillTag": "home_laundry",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C75",
        "K75"
      ],
      "choiceRationales": [
        "extension cord is a plausible home-and-rooms distractor, but it does not mean: a line where clothes hang to dry.",
        "shower curtain is a plausible home-and-rooms distractor, but it does not mean: a line where clothes hang to dry.",
        "clothesline is the only option that matches the tested meaning: a line where clothes hang to dry.",
        "fence is a plausible home-and-rooms distractor, but it does not mean: a line where clothes hang to dry."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "extension cord — кабель, который удлиняет доступ к электричеству. Это не про «веревка или линия, на которой сушат одежду»; выбираем clothesline.",
          "shower curtain означает «занавеска, которая удерживает воду в зоне душа». Здесь спрашивают «веревка или линия, на которой сушат одежду»; ответ clothesline.",
          "Да: clothesline — веревка или линия, на которой сушат одежду. Это ровно то, что описано в задании.",
          "fence — «ограждение вокруг участка или дома», а в вопросе нужно «веревка или линия, на которой сушат одежду». Поэтому выбираем clothesline."
        ],
        "uk": [
          "extension cord теж із теми дому, але не означає «a line where clothes hang to dry». Тут правильна відповідь clothesline.",
          "shower curtain теж із теми дому, але не означає «a line where clothes hang to dry». Тут правильна відповідь clothesline.",
          "Так: clothesline означає «a line where clothes hang to dry». Тримай у голові просту домашню картинку.",
          "fence теж із теми дому, але не означає «a line where clothes hang to dry». Тут правильна відповідь clothesline."
        ],
        "es": [
          "extension cord también suena a casa, pero no significa «a line where clothes hang to dry». La respuesta correcta es clothesline.",
          "shower curtain también suena a casa, pero no significa «a line where clothes hang to dry». La respuesta correcta es clothesline.",
          "Sí: clothesline significa «a line where clothes hang to dry». La imagen de casa ayuda a recordarlo.",
          "fence también suena a casa, pero no significa «a line where clothes hang to dry». La respuesta correcta es clothesline."
        ],
        "pt-BR": [
          "extension cord também é do tema casa, mas não significa “a line where clothes hang to dry”. A resposta certa é clothesline.",
          "shower curtain também é do tema casa, mas não significa “a line where clothes hang to dry”. A resposta certa é clothesline.",
          "Isso: clothesline significa “a line where clothes hang to dry”. Ligue a palavra a uma cena simples da casa.",
          "fence também é do tema casa, mas não significa “a line where clothes hang to dry”. A resposta certa é clothesline."
        ],
        "vi": [
          "extension cord cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a line where clothes hang to dry”. Đáp án đúng là clothesline.",
          "shower curtain cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a line where clothes hang to dry”. Đáp án đúng là clothesline.",
          "clothesline nghĩa là “a line where clothes hang to dry”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "fence cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a line where clothes hang to dry”. Đáp án đúng là clothesline."
        ],
        "id": [
          "extension cord masih bertema rumah, tetapi bukan “a line where clothes hang to dry”. Jawaban yang tepat adalah clothesline.",
          "shower curtain masih bertema rumah, tetapi bukan “a line where clothes hang to dry”. Jawaban yang tepat adalah clothesline.",
          "clothesline berarti “a line where clothes hang to dry”. Bayangkan benda atau ruang itu di rumah.",
          "fence masih bertema rumah, tetapi bukan “a line where clothes hang to dry”. Jawaban yang tepat adalah clothesline."
        ],
        "tr": [
          "extension cord ev temasıyla ilgili olabilir, ama “a line where clothes hang to dry” anlamına gelmez. Doğru cevap clothesline.",
          "shower curtain ev temasıyla ilgili olabilir, ama “a line where clothes hang to dry” anlamına gelmez. Doğru cevap clothesline.",
          "Evet: clothesline, “a line where clothes hang to dry” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "fence ev temasıyla ilgili olabilir, ama “a line where clothes hang to dry” anlamına gelmez. Doğru cevap clothesline."
        ],
        "pl": [
          "extension cord też pasuje do tematu domu, ale nie znaczy „a line where clothes hang to dry”. Poprawna odpowiedź to clothesline.",
          "shower curtain też pasuje do tematu domu, ale nie znaczy „a line where clothes hang to dry”. Poprawna odpowiedź to clothesline.",
          "Tak: clothesline znaczy „a line where clothes hang to dry”. Połącz słowo z prostym obrazem w domu.",
          "fence też pasuje do tematu domu, ale nie znaczy „a line where clothes hang to dry”. Poprawna odpowiedź to clothesline."
        ]
      }
    },
    {
      "id": "home-and-rooms-076",
      "type": "mcq",
      "prompt": "Choose the English word for: a stand or rail for coats.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «стойка или вешалка для пальто».",
        "uk": "Яке англійське слово або фраза означає «a stand or rail for coats»?",
        "es": "¿Qué palabra o expresión inglesa significa «a stand or rail for coats»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a stand or rail for coats”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a stand or rail for coats”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a stand or rail for coats”?",
        "tr": "“a stand or rail for coats” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a stand or rail for coats”?"
      },
      "choices": [
        "shoe rack",
        "bookshelf",
        "towel rack",
        "coat rack"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose coat rack for the home-and-rooms meaning: a stand or rail for coats.",
      "skillTag": "home_entry",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C76",
        "K76"
      ],
      "choiceRationales": [
        "shoe rack is a plausible home-and-rooms distractor, but it does not mean: a stand or rail for coats.",
        "bookshelf is a plausible home-and-rooms distractor, but it does not mean: a stand or rail for coats.",
        "towel rack is a plausible home-and-rooms distractor, but it does not mean: a stand or rail for coats.",
        "coat rack is the only option that matches the tested meaning: a stand or rail for coats."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "shoe rack — полка или стойка для обуви. Это не про «стойка или вешалка для пальто»; выбираем coat rack.",
          "bookshelf означает «полка или шкаф для книг». Здесь спрашивают «стойка или вешалка для пальто»; ответ coat rack.",
          "Не towel rack: это «другой вариант». В этом вопросе правильный вариант — coat rack.",
          "Да: coat rack — стойка или вешалка для пальто. Это ровно то, что описано в задании."
        ],
        "uk": [
          "shoe rack теж із теми дому, але не означає «a stand or rail for coats». Тут правильна відповідь coat rack.",
          "bookshelf теж із теми дому, але не означає «a stand or rail for coats». Тут правильна відповідь coat rack.",
          "towel rack теж із теми дому, але не означає «a stand or rail for coats». Тут правильна відповідь coat rack.",
          "Так: coat rack означає «a stand or rail for coats». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "shoe rack también suena a casa, pero no significa «a stand or rail for coats». La respuesta correcta es coat rack.",
          "bookshelf también suena a casa, pero no significa «a stand or rail for coats». La respuesta correcta es coat rack.",
          "towel rack también suena a casa, pero no significa «a stand or rail for coats». La respuesta correcta es coat rack.",
          "Sí: coat rack significa «a stand or rail for coats». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "shoe rack também é do tema casa, mas não significa “a stand or rail for coats”. A resposta certa é coat rack.",
          "bookshelf também é do tema casa, mas não significa “a stand or rail for coats”. A resposta certa é coat rack.",
          "towel rack também é do tema casa, mas não significa “a stand or rail for coats”. A resposta certa é coat rack.",
          "Isso: coat rack significa “a stand or rail for coats”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "shoe rack cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a stand or rail for coats”. Đáp án đúng là coat rack.",
          "bookshelf cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a stand or rail for coats”. Đáp án đúng là coat rack.",
          "towel rack cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a stand or rail for coats”. Đáp án đúng là coat rack.",
          "coat rack nghĩa là “a stand or rail for coats”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "shoe rack masih bertema rumah, tetapi bukan “a stand or rail for coats”. Jawaban yang tepat adalah coat rack.",
          "bookshelf masih bertema rumah, tetapi bukan “a stand or rail for coats”. Jawaban yang tepat adalah coat rack.",
          "towel rack masih bertema rumah, tetapi bukan “a stand or rail for coats”. Jawaban yang tepat adalah coat rack.",
          "coat rack berarti “a stand or rail for coats”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "shoe rack ev temasıyla ilgili olabilir, ama “a stand or rail for coats” anlamına gelmez. Doğru cevap coat rack.",
          "bookshelf ev temasıyla ilgili olabilir, ama “a stand or rail for coats” anlamına gelmez. Doğru cevap coat rack.",
          "towel rack ev temasıyla ilgili olabilir, ama “a stand or rail for coats” anlamına gelmez. Doğru cevap coat rack.",
          "Evet: coat rack, “a stand or rail for coats” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "shoe rack też pasuje do tematu domu, ale nie znaczy „a stand or rail for coats”. Poprawna odpowiedź to coat rack.",
          "bookshelf też pasuje do tematu domu, ale nie znaczy „a stand or rail for coats”. Poprawna odpowiedź to coat rack.",
          "towel rack też pasuje do tematu domu, ale nie znaczy „a stand or rail for coats”. Poprawna odpowiedź to coat rack.",
          "Tak: coat rack znaczy „a stand or rail for coats”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-077",
      "type": "mcq",
      "prompt": "Choose the English word for: a mat outside or inside a door for wiping shoes.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «коврик у двери для вытирания обуви».",
        "uk": "Яке англійське слово або фраза означає «a mat outside or inside a door for wiping shoes»?",
        "es": "¿Qué palabra o expresión inglesa significa «a mat outside or inside a door for wiping shoes»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a mat outside or inside a door for wiping shoes”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a mat outside or inside a door for wiping shoes”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a mat outside or inside a door for wiping shoes”?",
        "tr": "“a mat outside or inside a door for wiping shoes” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a mat outside or inside a door for wiping shoes”?"
      },
      "choices": [
        "doormat",
        "bath mat",
        "rug",
        "carpet"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose doormat for the home-and-rooms meaning: a mat outside or inside a door for wiping shoes.",
      "skillTag": "home_entry",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C77",
        "K77"
      ],
      "choiceRationales": [
        "doormat is the only option that matches the tested meaning: a mat outside or inside a door for wiping shoes.",
        "bath mat is a plausible home-and-rooms distractor, but it does not mean: a mat outside or inside a door for wiping shoes.",
        "rug is a plausible home-and-rooms distractor, but it does not mean: a mat outside or inside a door for wiping shoes.",
        "carpet is a plausible home-and-rooms distractor, but it does not mean: a mat outside or inside a door for wiping shoes."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: doormat — коврик у двери для вытирания обуви. Это ровно то, что описано в задании.",
          "bath mat означает «коврик на полу в ванной». Здесь спрашивают «коврик у двери для вытирания обуви»; ответ doormat.",
          "Не rug: это «небольшой ковер на части пола». В этом вопросе правильный вариант — doormat.",
          "carpet — «мягкое покрытие для большей части пола», а в вопросе нужно «коврик у двери для вытирания обуви». Поэтому выбираем doormat."
        ],
        "uk": [
          "Так: doormat означає «a mat outside or inside a door for wiping shoes». Тримай у голові просту домашню картинку.",
          "bath mat теж із теми дому, але не означає «a mat outside or inside a door for wiping shoes». Тут правильна відповідь doormat.",
          "rug теж із теми дому, але не означає «a mat outside or inside a door for wiping shoes». Тут правильна відповідь doormat.",
          "carpet теж із теми дому, але не означає «a mat outside or inside a door for wiping shoes». Тут правильна відповідь doormat."
        ],
        "es": [
          "Sí: doormat significa «a mat outside or inside a door for wiping shoes». La imagen de casa ayuda a recordarlo.",
          "bath mat también suena a casa, pero no significa «a mat outside or inside a door for wiping shoes». La respuesta correcta es doormat.",
          "rug también suena a casa, pero no significa «a mat outside or inside a door for wiping shoes». La respuesta correcta es doormat.",
          "carpet también suena a casa, pero no significa «a mat outside or inside a door for wiping shoes». La respuesta correcta es doormat."
        ],
        "pt-BR": [
          "Isso: doormat significa “a mat outside or inside a door for wiping shoes”. Ligue a palavra a uma cena simples da casa.",
          "bath mat também é do tema casa, mas não significa “a mat outside or inside a door for wiping shoes”. A resposta certa é doormat.",
          "rug também é do tema casa, mas não significa “a mat outside or inside a door for wiping shoes”. A resposta certa é doormat.",
          "carpet também é do tema casa, mas não significa “a mat outside or inside a door for wiping shoes”. A resposta certa é doormat."
        ],
        "vi": [
          "doormat nghĩa là “a mat outside or inside a door for wiping shoes”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "bath mat cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a mat outside or inside a door for wiping shoes”. Đáp án đúng là doormat.",
          "rug cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a mat outside or inside a door for wiping shoes”. Đáp án đúng là doormat.",
          "carpet cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a mat outside or inside a door for wiping shoes”. Đáp án đúng là doormat."
        ],
        "id": [
          "doormat berarti “a mat outside or inside a door for wiping shoes”. Bayangkan benda atau ruang itu di rumah.",
          "bath mat masih bertema rumah, tetapi bukan “a mat outside or inside a door for wiping shoes”. Jawaban yang tepat adalah doormat.",
          "rug masih bertema rumah, tetapi bukan “a mat outside or inside a door for wiping shoes”. Jawaban yang tepat adalah doormat.",
          "carpet masih bertema rumah, tetapi bukan “a mat outside or inside a door for wiping shoes”. Jawaban yang tepat adalah doormat."
        ],
        "tr": [
          "Evet: doormat, “a mat outside or inside a door for wiping shoes” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "bath mat ev temasıyla ilgili olabilir, ama “a mat outside or inside a door for wiping shoes” anlamına gelmez. Doğru cevap doormat.",
          "rug ev temasıyla ilgili olabilir, ama “a mat outside or inside a door for wiping shoes” anlamına gelmez. Doğru cevap doormat.",
          "carpet ev temasıyla ilgili olabilir, ama “a mat outside or inside a door for wiping shoes” anlamına gelmez. Doğru cevap doormat."
        ],
        "pl": [
          "Tak: doormat znaczy „a mat outside or inside a door for wiping shoes”. Połącz słowo z prostym obrazem w domu.",
          "bath mat też pasuje do tematu domu, ale nie znaczy „a mat outside or inside a door for wiping shoes”. Poprawna odpowiedź to doormat.",
          "rug też pasuje do tematu domu, ale nie znaczy „a mat outside or inside a door for wiping shoes”. Poprawna odpowiedź to doormat.",
          "carpet też pasuje do tematu domu, ale nie znaczy „a mat outside or inside a door for wiping shoes”. Poprawna odpowiedź to doormat."
        ]
      }
    },
    {
      "id": "home-and-rooms-078",
      "type": "mcq",
      "prompt": "Choose the English word for: a small hook where keys are kept.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «маленький крючок для ключей».",
        "uk": "Яке англійське слово або фраза означає «a small hook where keys are kept»?",
        "es": "¿Qué palabra o expresión inglesa significa «a small hook where keys are kept»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a small hook where keys are kept”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a small hook where keys are kept”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a small hook where keys are kept”?",
        "tr": "“a small hook where keys are kept” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a small hook where keys are kept”?"
      },
      "choices": [
        "hanger",
        "key hook",
        "door handle",
        "light switch"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose key hook for the home-and-rooms meaning: a small hook where keys are kept.",
      "skillTag": "home_entry",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C78",
        "K78"
      ],
      "choiceRationales": [
        "hanger is a plausible home-and-rooms distractor, but it does not mean: a small hook where keys are kept.",
        "key hook is the only option that matches the tested meaning: a small hook where keys are kept.",
        "door handle is a plausible home-and-rooms distractor, but it does not mean: a small hook where keys are kept.",
        "light switch is a plausible home-and-rooms distractor, but it does not mean: a small hook where keys are kept."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "hanger — предмет, на который вешают одежду в шкафу. Это не про «маленький крючок для ключей»; выбираем key hook.",
          "Да: key hook — маленький крючок для ключей. Это ровно то, что описано в задании.",
          "Не door handle: это «часть двери, за которую берутся, чтобы открыть ее». В этом вопросе правильный вариант — key hook.",
          "light switch — «маленькая кнопка для включения или выключения света», а в вопросе нужно «маленький крючок для ключей». Поэтому выбираем key hook."
        ],
        "uk": [
          "hanger теж із теми дому, але не означає «a small hook where keys are kept». Тут правильна відповідь key hook.",
          "Так: key hook означає «a small hook where keys are kept». Тримай у голові просту домашню картинку.",
          "door handle теж із теми дому, але не означає «a small hook where keys are kept». Тут правильна відповідь key hook.",
          "light switch теж із теми дому, але не означає «a small hook where keys are kept». Тут правильна відповідь key hook."
        ],
        "es": [
          "hanger también suena a casa, pero no significa «a small hook where keys are kept». La respuesta correcta es key hook.",
          "Sí: key hook significa «a small hook where keys are kept». La imagen de casa ayuda a recordarlo.",
          "door handle también suena a casa, pero no significa «a small hook where keys are kept». La respuesta correcta es key hook.",
          "light switch también suena a casa, pero no significa «a small hook where keys are kept». La respuesta correcta es key hook."
        ],
        "pt-BR": [
          "hanger também é do tema casa, mas não significa “a small hook where keys are kept”. A resposta certa é key hook.",
          "Isso: key hook significa “a small hook where keys are kept”. Ligue a palavra a uma cena simples da casa.",
          "door handle também é do tema casa, mas não significa “a small hook where keys are kept”. A resposta certa é key hook.",
          "light switch também é do tema casa, mas não significa “a small hook where keys are kept”. A resposta certa é key hook."
        ],
        "vi": [
          "hanger cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small hook where keys are kept”. Đáp án đúng là key hook.",
          "key hook nghĩa là “a small hook where keys are kept”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "door handle cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small hook where keys are kept”. Đáp án đúng là key hook.",
          "light switch cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small hook where keys are kept”. Đáp án đúng là key hook."
        ],
        "id": [
          "hanger masih bertema rumah, tetapi bukan “a small hook where keys are kept”. Jawaban yang tepat adalah key hook.",
          "key hook berarti “a small hook where keys are kept”. Bayangkan benda atau ruang itu di rumah.",
          "door handle masih bertema rumah, tetapi bukan “a small hook where keys are kept”. Jawaban yang tepat adalah key hook.",
          "light switch masih bertema rumah, tetapi bukan “a small hook where keys are kept”. Jawaban yang tepat adalah key hook."
        ],
        "tr": [
          "hanger ev temasıyla ilgili olabilir, ama “a small hook where keys are kept” anlamına gelmez. Doğru cevap key hook.",
          "Evet: key hook, “a small hook where keys are kept” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "door handle ev temasıyla ilgili olabilir, ama “a small hook where keys are kept” anlamına gelmez. Doğru cevap key hook.",
          "light switch ev temasıyla ilgili olabilir, ama “a small hook where keys are kept” anlamına gelmez. Doğru cevap key hook."
        ],
        "pl": [
          "hanger też pasuje do tematu domu, ale nie znaczy „a small hook where keys are kept”. Poprawna odpowiedź to key hook.",
          "Tak: key hook znaczy „a small hook where keys are kept”. Połącz słowo z prostym obrazem w domu.",
          "door handle też pasuje do tematu domu, ale nie znaczy „a small hook where keys are kept”. Poprawna odpowiedź to key hook.",
          "light switch też pasuje do tematu domu, ale nie znaczy „a small hook where keys are kept”. Poprawna odpowiedź to key hook."
        ]
      }
    },
    {
      "id": "home-and-rooms-079",
      "type": "mcq",
      "prompt": "Choose the English word for: a small hole in a door for seeing who is outside.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «маленькое отверстие в двери, чтобы видеть, кто снаружи».",
        "uk": "Яке англійське слово або фраза означає «a small hole in a door for seeing who is outside»?",
        "es": "¿Qué palabra o expresión inglesa significa «a small hole in a door for seeing who is outside»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a small hole in a door for seeing who is outside”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a small hole in a door for seeing who is outside”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a small hole in a door for seeing who is outside”?",
        "tr": "“a small hole in a door for seeing who is outside” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a small hole in a door for seeing who is outside”?"
      },
      "choices": [
        "window",
        "mirror",
        "peephole",
        "socket"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose peephole for the home-and-rooms meaning: a small hole in a door for seeing who is outside.",
      "skillTag": "home_entry",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C79",
        "K79"
      ],
      "choiceRationales": [
        "window is a plausible home-and-rooms distractor, but it does not mean: a small hole in a door for seeing who is outside.",
        "mirror is a plausible home-and-rooms distractor, but it does not mean: a small hole in a door for seeing who is outside.",
        "peephole is the only option that matches the tested meaning: a small hole in a door for seeing who is outside.",
        "socket is a plausible home-and-rooms distractor, but it does not mean: a small hole in a door for seeing who is outside."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "window — стеклянный проем, через который входит свет. Это не про «маленькое отверстие в двери, чтобы видеть, кто снаружи»; выбираем peephole.",
          "mirror означает «стекло, в котором видишь себя». Здесь спрашивают «маленькое отверстие в двери, чтобы видеть, кто снаружи»; ответ peephole.",
          "Да: peephole — маленькое отверстие в двери, чтобы видеть, кто снаружи. Это ровно то, что описано в задании.",
          "socket — «место в стене, куда вставляют вилку», а в вопросе нужно «маленькое отверстие в двери, чтобы видеть, кто снаружи». Поэтому выбираем peephole."
        ],
        "uk": [
          "window теж із теми дому, але не означає «a small hole in a door for seeing who is outside». Тут правильна відповідь peephole.",
          "mirror теж із теми дому, але не означає «a small hole in a door for seeing who is outside». Тут правильна відповідь peephole.",
          "Так: peephole означає «a small hole in a door for seeing who is outside». Тримай у голові просту домашню картинку.",
          "socket теж із теми дому, але не означає «a small hole in a door for seeing who is outside». Тут правильна відповідь peephole."
        ],
        "es": [
          "window también suena a casa, pero no significa «a small hole in a door for seeing who is outside». La respuesta correcta es peephole.",
          "mirror también suena a casa, pero no significa «a small hole in a door for seeing who is outside». La respuesta correcta es peephole.",
          "Sí: peephole significa «a small hole in a door for seeing who is outside». La imagen de casa ayuda a recordarlo.",
          "socket también suena a casa, pero no significa «a small hole in a door for seeing who is outside». La respuesta correcta es peephole."
        ],
        "pt-BR": [
          "window também é do tema casa, mas não significa “a small hole in a door for seeing who is outside”. A resposta certa é peephole.",
          "mirror também é do tema casa, mas não significa “a small hole in a door for seeing who is outside”. A resposta certa é peephole.",
          "Isso: peephole significa “a small hole in a door for seeing who is outside”. Ligue a palavra a uma cena simples da casa.",
          "socket também é do tema casa, mas não significa “a small hole in a door for seeing who is outside”. A resposta certa é peephole."
        ],
        "vi": [
          "window cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small hole in a door for seeing who is outside”. Đáp án đúng là peephole.",
          "mirror cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small hole in a door for seeing who is outside”. Đáp án đúng là peephole.",
          "peephole nghĩa là “a small hole in a door for seeing who is outside”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "socket cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small hole in a door for seeing who is outside”. Đáp án đúng là peephole."
        ],
        "id": [
          "window masih bertema rumah, tetapi bukan “a small hole in a door for seeing who is outside”. Jawaban yang tepat adalah peephole.",
          "mirror masih bertema rumah, tetapi bukan “a small hole in a door for seeing who is outside”. Jawaban yang tepat adalah peephole.",
          "peephole berarti “a small hole in a door for seeing who is outside”. Bayangkan benda atau ruang itu di rumah.",
          "socket masih bertema rumah, tetapi bukan “a small hole in a door for seeing who is outside”. Jawaban yang tepat adalah peephole."
        ],
        "tr": [
          "window ev temasıyla ilgili olabilir, ama “a small hole in a door for seeing who is outside” anlamına gelmez. Doğru cevap peephole.",
          "mirror ev temasıyla ilgili olabilir, ama “a small hole in a door for seeing who is outside” anlamına gelmez. Doğru cevap peephole.",
          "Evet: peephole, “a small hole in a door for seeing who is outside” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "socket ev temasıyla ilgili olabilir, ama “a small hole in a door for seeing who is outside” anlamına gelmez. Doğru cevap peephole."
        ],
        "pl": [
          "window też pasuje do tematu domu, ale nie znaczy „a small hole in a door for seeing who is outside”. Poprawna odpowiedź to peephole.",
          "mirror też pasuje do tematu domu, ale nie znaczy „a small hole in a door for seeing who is outside”. Poprawna odpowiedź to peephole.",
          "Tak: peephole znaczy „a small hole in a door for seeing who is outside”. Połącz słowo z prostym obrazem w domu.",
          "socket też pasuje do tematu domu, ale nie znaczy „a small hole in a door for seeing who is outside”. Poprawna odpowiedź to peephole."
        ]
      }
    },
    {
      "id": "home-and-rooms-080",
      "type": "mcq",
      "prompt": "Choose the English word for: a button or device people use to announce they are at the door.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «кнопка или устройство у двери для звонка».",
        "uk": "Яке англійське слово або фраза означає «a button or device people use to announce they are at the door»?",
        "es": "¿Qué palabra o expresión inglesa significa «a button or device people use to announce they are at the door»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a button or device people use to announce they are at the door”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a button or device people use to announce they are at the door”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a button or device people use to announce they are at the door”?",
        "tr": "“a button or device people use to announce they are at the door” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a button or device people use to announce they are at the door”?"
      },
      "choices": [
        "smoke alarm",
        "clock",
        "thermostat",
        "doorbell"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose doorbell for the home-and-rooms meaning: a button or device people use to announce they are at the door.",
      "skillTag": "home_entry",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C80",
        "K80"
      ],
      "choiceRationales": [
        "smoke alarm is a plausible home-and-rooms distractor, but it does not mean: a button or device people use to announce they are at the door.",
        "clock is a plausible home-and-rooms distractor, but it does not mean: a button or device people use to announce they are at the door.",
        "thermostat is a plausible home-and-rooms distractor, but it does not mean: a button or device people use to announce they are at the door.",
        "doorbell is the only option that matches the tested meaning: a button or device people use to announce they are at the door."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "smoke alarm — устройство, которое предупреждает о дыме. Это не про «кнопка или устройство у двери для звонка»; выбираем doorbell.",
          "clock означает «предмет, который показывает время». Здесь спрашивают «кнопка или устройство у двери для звонка»; ответ doorbell.",
          "Не thermostat: это «регулятор отопления или охлаждения комнаты». В этом вопросе правильный вариант — doorbell.",
          "Да: doorbell — кнопка или устройство у двери для звонка. Это ровно то, что описано в задании."
        ],
        "uk": [
          "smoke alarm теж із теми дому, але не означає «a button or device people use to announce they are at the door». Тут правильна відповідь doorbell.",
          "clock теж із теми дому, але не означає «a button or device people use to announce they are at the door». Тут правильна відповідь doorbell.",
          "thermostat теж із теми дому, але не означає «a button or device people use to announce they are at the door». Тут правильна відповідь doorbell.",
          "Так: doorbell означає «a button or device people use to announce they are at the door». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "smoke alarm también suena a casa, pero no significa «a button or device people use to announce they are at the door». La respuesta correcta es doorbell.",
          "clock también suena a casa, pero no significa «a button or device people use to announce they are at the door». La respuesta correcta es doorbell.",
          "thermostat también suena a casa, pero no significa «a button or device people use to announce they are at the door». La respuesta correcta es doorbell.",
          "Sí: doorbell significa «a button or device people use to announce they are at the door». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "smoke alarm também é do tema casa, mas não significa “a button or device people use to announce they are at the door”. A resposta certa é doorbell.",
          "clock também é do tema casa, mas não significa “a button or device people use to announce they are at the door”. A resposta certa é doorbell.",
          "thermostat também é do tema casa, mas não significa “a button or device people use to announce they are at the door”. A resposta certa é doorbell.",
          "Isso: doorbell significa “a button or device people use to announce they are at the door”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "smoke alarm cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a button or device people use to announce they are at the door”. Đáp án đúng là doorbell.",
          "clock cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a button or device people use to announce they are at the door”. Đáp án đúng là doorbell.",
          "thermostat cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a button or device people use to announce they are at the door”. Đáp án đúng là doorbell.",
          "doorbell nghĩa là “a button or device people use to announce they are at the door”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "smoke alarm masih bertema rumah, tetapi bukan “a button or device people use to announce they are at the door”. Jawaban yang tepat adalah doorbell.",
          "clock masih bertema rumah, tetapi bukan “a button or device people use to announce they are at the door”. Jawaban yang tepat adalah doorbell.",
          "thermostat masih bertema rumah, tetapi bukan “a button or device people use to announce they are at the door”. Jawaban yang tepat adalah doorbell.",
          "doorbell berarti “a button or device people use to announce they are at the door”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "smoke alarm ev temasıyla ilgili olabilir, ama “a button or device people use to announce they are at the door” anlamına gelmez. Doğru cevap doorbell.",
          "clock ev temasıyla ilgili olabilir, ama “a button or device people use to announce they are at the door” anlamına gelmez. Doğru cevap doorbell.",
          "thermostat ev temasıyla ilgili olabilir, ama “a button or device people use to announce they are at the door” anlamına gelmez. Doğru cevap doorbell.",
          "Evet: doorbell, “a button or device people use to announce they are at the door” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "smoke alarm też pasuje do tematu domu, ale nie znaczy „a button or device people use to announce they are at the door”. Poprawna odpowiedź to doorbell.",
          "clock też pasuje do tematu domu, ale nie znaczy „a button or device people use to announce they are at the door”. Poprawna odpowiedź to doorbell.",
          "thermostat też pasuje do tematu domu, ale nie znaczy „a button or device people use to announce they are at the door”. Poprawna odpowiedź to doorbell.",
          "Tak: doorbell znaczy „a button or device people use to announce they are at the door”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-081",
      "type": "mcq",
      "prompt": "Choose the English word for: the part of a door you hold to open it.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «часть двери, за которую берутся, чтобы открыть ее».",
        "uk": "Яке англійське слово або фраза означає «the part of a door you hold to open it»?",
        "es": "¿Qué palabra o expresión inglesa significa «the part of a door you hold to open it»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the part of a door you hold to open it”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the part of a door you hold to open it”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the part of a door you hold to open it”?",
        "tr": "“the part of a door you hold to open it” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the part of a door you hold to open it”?"
      },
      "choices": [
        "door handle",
        "lock",
        "key",
        "tap"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose door handle for the home-and-rooms meaning: the part of a door you hold to open it.",
      "skillTag": "home_entry",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C81",
        "K81"
      ],
      "choiceRationales": [
        "door handle is the only option that matches the tested meaning: the part of a door you hold to open it.",
        "lock is a plausible home-and-rooms distractor, but it does not mean: the part of a door you hold to open it.",
        "key is a plausible home-and-rooms distractor, but it does not mean: the part of a door you hold to open it.",
        "tap is a plausible home-and-rooms distractor, but it does not mean: the part of a door you hold to open it."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: door handle — часть двери, за которую берутся, чтобы открыть ее. Это ровно то, что описано в задании.",
          "lock означает «часть двери, которая закрывает ее на ключ». Здесь спрашивают «часть двери, за которую берутся, чтобы открыть ее»; ответ door handle.",
          "Не key: это «маленький металлический предмет для открывания замка». В этом вопросе правильный вариант — door handle.",
          "tap — «часть, откуда течет вода», а в вопросе нужно «часть двери, за которую берутся, чтобы открыть ее». Поэтому выбираем door handle."
        ],
        "uk": [
          "Так: door handle означає «the part of a door you hold to open it». Тримай у голові просту домашню картинку.",
          "lock теж із теми дому, але не означає «the part of a door you hold to open it». Тут правильна відповідь door handle.",
          "key теж із теми дому, але не означає «the part of a door you hold to open it». Тут правильна відповідь door handle.",
          "tap теж із теми дому, але не означає «the part of a door you hold to open it». Тут правильна відповідь door handle."
        ],
        "es": [
          "Sí: door handle significa «the part of a door you hold to open it». La imagen de casa ayuda a recordarlo.",
          "lock también suena a casa, pero no significa «the part of a door you hold to open it». La respuesta correcta es door handle.",
          "key también suena a casa, pero no significa «the part of a door you hold to open it». La respuesta correcta es door handle.",
          "tap también suena a casa, pero no significa «the part of a door you hold to open it». La respuesta correcta es door handle."
        ],
        "pt-BR": [
          "Isso: door handle significa “the part of a door you hold to open it”. Ligue a palavra a uma cena simples da casa.",
          "lock também é do tema casa, mas não significa “the part of a door you hold to open it”. A resposta certa é door handle.",
          "key também é do tema casa, mas não significa “the part of a door you hold to open it”. A resposta certa é door handle.",
          "tap também é do tema casa, mas não significa “the part of a door you hold to open it”. A resposta certa é door handle."
        ],
        "vi": [
          "door handle nghĩa là “the part of a door you hold to open it”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "lock cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the part of a door you hold to open it”. Đáp án đúng là door handle.",
          "key cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the part of a door you hold to open it”. Đáp án đúng là door handle.",
          "tap cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the part of a door you hold to open it”. Đáp án đúng là door handle."
        ],
        "id": [
          "door handle berarti “the part of a door you hold to open it”. Bayangkan benda atau ruang itu di rumah.",
          "lock masih bertema rumah, tetapi bukan “the part of a door you hold to open it”. Jawaban yang tepat adalah door handle.",
          "key masih bertema rumah, tetapi bukan “the part of a door you hold to open it”. Jawaban yang tepat adalah door handle.",
          "tap masih bertema rumah, tetapi bukan “the part of a door you hold to open it”. Jawaban yang tepat adalah door handle."
        ],
        "tr": [
          "Evet: door handle, “the part of a door you hold to open it” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "lock ev temasıyla ilgili olabilir, ama “the part of a door you hold to open it” anlamına gelmez. Doğru cevap door handle.",
          "key ev temasıyla ilgili olabilir, ama “the part of a door you hold to open it” anlamına gelmez. Doğru cevap door handle.",
          "tap ev temasıyla ilgili olabilir, ama “the part of a door you hold to open it” anlamına gelmez. Doğru cevap door handle."
        ],
        "pl": [
          "Tak: door handle znaczy „the part of a door you hold to open it”. Połącz słowo z prostym obrazem w domu.",
          "lock też pasuje do tematu domu, ale nie znaczy „the part of a door you hold to open it”. Poprawna odpowiedź to door handle.",
          "key też pasuje do tematu domu, ale nie znaczy „the part of a door you hold to open it”. Poprawna odpowiedź to door handle.",
          "tap też pasuje do tematu domu, ale nie znaczy „the part of a door you hold to open it”. Poprawna odpowiedź to door handle."
        ]
      }
    },
    {
      "id": "home-and-rooms-082",
      "type": "mcq",
      "prompt": "Choose the English word for: the part that keeps a door closed and secure.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «часть двери, которая закрывает ее на ключ».",
        "uk": "Яке англійське слово або фраза означає «the part that keeps a door closed and secure»?",
        "es": "¿Qué palabra o expresión inglesa significa «the part that keeps a door closed and secure»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the part that keeps a door closed and secure”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the part that keeps a door closed and secure”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the part that keeps a door closed and secure”?",
        "tr": "“the part that keeps a door closed and secure” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the part that keeps a door closed and secure”?"
      },
      "choices": [
        "key",
        "lock",
        "door handle",
        "socket"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose lock for the home-and-rooms meaning: the part that keeps a door closed and secure.",
      "skillTag": "home_entry",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C82",
        "K82"
      ],
      "choiceRationales": [
        "key is a plausible home-and-rooms distractor, but it does not mean: the part that keeps a door closed and secure.",
        "lock is the only option that matches the tested meaning: the part that keeps a door closed and secure.",
        "door handle is a plausible home-and-rooms distractor, but it does not mean: the part that keeps a door closed and secure.",
        "socket is a plausible home-and-rooms distractor, but it does not mean: the part that keeps a door closed and secure."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "key — маленький металлический предмет для открывания замка. Это не про «часть двери, которая закрывает ее на ключ»; выбираем lock.",
          "Да: lock — часть двери, которая закрывает ее на ключ. Это ровно то, что описано в задании.",
          "Не door handle: это «часть двери, за которую берутся, чтобы открыть ее». В этом вопросе правильный вариант — lock.",
          "socket — «место в стене, куда вставляют вилку», а в вопросе нужно «часть двери, которая закрывает ее на ключ». Поэтому выбираем lock."
        ],
        "uk": [
          "key теж із теми дому, але не означає «the part that keeps a door closed and secure». Тут правильна відповідь lock.",
          "Так: lock означає «the part that keeps a door closed and secure». Тримай у голові просту домашню картинку.",
          "door handle теж із теми дому, але не означає «the part that keeps a door closed and secure». Тут правильна відповідь lock.",
          "socket теж із теми дому, але не означає «the part that keeps a door closed and secure». Тут правильна відповідь lock."
        ],
        "es": [
          "key también suena a casa, pero no significa «the part that keeps a door closed and secure». La respuesta correcta es lock.",
          "Sí: lock significa «the part that keeps a door closed and secure». La imagen de casa ayuda a recordarlo.",
          "door handle también suena a casa, pero no significa «the part that keeps a door closed and secure». La respuesta correcta es lock.",
          "socket también suena a casa, pero no significa «the part that keeps a door closed and secure». La respuesta correcta es lock."
        ],
        "pt-BR": [
          "key também é do tema casa, mas não significa “the part that keeps a door closed and secure”. A resposta certa é lock.",
          "Isso: lock significa “the part that keeps a door closed and secure”. Ligue a palavra a uma cena simples da casa.",
          "door handle também é do tema casa, mas não significa “the part that keeps a door closed and secure”. A resposta certa é lock.",
          "socket também é do tema casa, mas não significa “the part that keeps a door closed and secure”. A resposta certa é lock."
        ],
        "vi": [
          "key cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the part that keeps a door closed and secure”. Đáp án đúng là lock.",
          "lock nghĩa là “the part that keeps a door closed and secure”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "door handle cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the part that keeps a door closed and secure”. Đáp án đúng là lock.",
          "socket cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the part that keeps a door closed and secure”. Đáp án đúng là lock."
        ],
        "id": [
          "key masih bertema rumah, tetapi bukan “the part that keeps a door closed and secure”. Jawaban yang tepat adalah lock.",
          "lock berarti “the part that keeps a door closed and secure”. Bayangkan benda atau ruang itu di rumah.",
          "door handle masih bertema rumah, tetapi bukan “the part that keeps a door closed and secure”. Jawaban yang tepat adalah lock.",
          "socket masih bertema rumah, tetapi bukan “the part that keeps a door closed and secure”. Jawaban yang tepat adalah lock."
        ],
        "tr": [
          "key ev temasıyla ilgili olabilir, ama “the part that keeps a door closed and secure” anlamına gelmez. Doğru cevap lock.",
          "Evet: lock, “the part that keeps a door closed and secure” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "door handle ev temasıyla ilgili olabilir, ama “the part that keeps a door closed and secure” anlamına gelmez. Doğru cevap lock.",
          "socket ev temasıyla ilgili olabilir, ama “the part that keeps a door closed and secure” anlamına gelmez. Doğru cevap lock."
        ],
        "pl": [
          "key też pasuje do tematu domu, ale nie znaczy „the part that keeps a door closed and secure”. Poprawna odpowiedź to lock.",
          "Tak: lock znaczy „the part that keeps a door closed and secure”. Połącz słowo z prostym obrazem w domu.",
          "door handle też pasuje do tematu domu, ale nie znaczy „the part that keeps a door closed and secure”. Poprawna odpowiedź to lock.",
          "socket też pasuje do tematu domu, ale nie znaczy „the part that keeps a door closed and secure”. Poprawna odpowiedź to lock."
        ]
      }
    },
    {
      "id": "home-and-rooms-083",
      "type": "mcq",
      "prompt": "Choose the English word for: a cloth used for drying your hands or body.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «ткань для вытирания рук или тела».",
        "uk": "Яке англійське слово або фраза означає «a cloth used for drying your hands or body»?",
        "es": "¿Qué palabra o expresión inglesa significa «a cloth used for drying your hands or body»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a cloth used for drying your hands or body”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a cloth used for drying your hands or body”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a cloth used for drying your hands or body”?",
        "tr": "“a cloth used for drying your hands or body” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a cloth used for drying your hands or body”?"
      },
      "choices": [
        "blanket",
        "curtains",
        "towel",
        "carpet"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose towel for the home-and-rooms meaning: a cloth used for drying your hands or body.",
      "skillTag": "home_bathroom",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C83",
        "K83"
      ],
      "choiceRationales": [
        "blanket is a plausible home-and-rooms distractor, but it does not mean: a cloth used for drying your hands or body.",
        "curtains is a plausible home-and-rooms distractor, but it does not mean: a cloth used for drying your hands or body.",
        "towel is the only option that matches the tested meaning: a cloth used for drying your hands or body.",
        "carpet is a plausible home-and-rooms distractor, but it does not mean: a cloth used for drying your hands or body."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "blanket — теплое покрывало для кровати. Это не про «ткань для вытирания рук или тела»; выбираем towel.",
          "curtains означает «ткань, которой закрывают окно». Здесь спрашивают «ткань для вытирания рук или тела»; ответ towel.",
          "Да: towel — ткань для вытирания рук или тела. Это ровно то, что описано в задании.",
          "carpet — «мягкое покрытие для большей части пола», а в вопросе нужно «ткань для вытирания рук или тела». Поэтому выбираем towel."
        ],
        "uk": [
          "blanket теж із теми дому, але не означає «a cloth used for drying your hands or body». Тут правильна відповідь towel.",
          "curtains теж із теми дому, але не означає «a cloth used for drying your hands or body». Тут правильна відповідь towel.",
          "Так: towel означає «a cloth used for drying your hands or body». Тримай у голові просту домашню картинку.",
          "carpet теж із теми дому, але не означає «a cloth used for drying your hands or body». Тут правильна відповідь towel."
        ],
        "es": [
          "blanket también suena a casa, pero no significa «a cloth used for drying your hands or body». La respuesta correcta es towel.",
          "curtains también suena a casa, pero no significa «a cloth used for drying your hands or body». La respuesta correcta es towel.",
          "Sí: towel significa «a cloth used for drying your hands or body». La imagen de casa ayuda a recordarlo.",
          "carpet también suena a casa, pero no significa «a cloth used for drying your hands or body». La respuesta correcta es towel."
        ],
        "pt-BR": [
          "blanket também é do tema casa, mas não significa “a cloth used for drying your hands or body”. A resposta certa é towel.",
          "curtains também é do tema casa, mas não significa “a cloth used for drying your hands or body”. A resposta certa é towel.",
          "Isso: towel significa “a cloth used for drying your hands or body”. Ligue a palavra a uma cena simples da casa.",
          "carpet também é do tema casa, mas não significa “a cloth used for drying your hands or body”. A resposta certa é towel."
        ],
        "vi": [
          "blanket cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a cloth used for drying your hands or body”. Đáp án đúng là towel.",
          "curtains cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a cloth used for drying your hands or body”. Đáp án đúng là towel.",
          "towel nghĩa là “a cloth used for drying your hands or body”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "carpet cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a cloth used for drying your hands or body”. Đáp án đúng là towel."
        ],
        "id": [
          "blanket masih bertema rumah, tetapi bukan “a cloth used for drying your hands or body”. Jawaban yang tepat adalah towel.",
          "curtains masih bertema rumah, tetapi bukan “a cloth used for drying your hands or body”. Jawaban yang tepat adalah towel.",
          "towel berarti “a cloth used for drying your hands or body”. Bayangkan benda atau ruang itu di rumah.",
          "carpet masih bertema rumah, tetapi bukan “a cloth used for drying your hands or body”. Jawaban yang tepat adalah towel."
        ],
        "tr": [
          "blanket ev temasıyla ilgili olabilir, ama “a cloth used for drying your hands or body” anlamına gelmez. Doğru cevap towel.",
          "curtains ev temasıyla ilgili olabilir, ama “a cloth used for drying your hands or body” anlamına gelmez. Doğru cevap towel.",
          "Evet: towel, “a cloth used for drying your hands or body” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "carpet ev temasıyla ilgili olabilir, ama “a cloth used for drying your hands or body” anlamına gelmez. Doğru cevap towel."
        ],
        "pl": [
          "blanket też pasuje do tematu domu, ale nie znaczy „a cloth used for drying your hands or body”. Poprawna odpowiedź to towel.",
          "curtains też pasuje do tematu domu, ale nie znaczy „a cloth used for drying your hands or body”. Poprawna odpowiedź to towel.",
          "Tak: towel znaczy „a cloth used for drying your hands or body”. Połącz słowo z prostym obrazem w domu.",
          "carpet też pasuje do tematu domu, ale nie znaczy „a cloth used for drying your hands or body”. Poprawna odpowiedź to towel."
        ]
      }
    },
    {
      "id": "home-and-rooms-084",
      "type": "mcq",
      "prompt": "Choose the English word for: the part where water comes out.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «часть, откуда течет вода».",
        "uk": "Яке англійське слово або фраза означає «the part where water comes out»?",
        "es": "¿Qué palabra o expresión inglesa significa «the part where water comes out»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the part where water comes out”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the part where water comes out”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the part where water comes out”?",
        "tr": "“the part where water comes out” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the part where water comes out”?"
      },
      "choices": [
        "drain",
        "sink",
        "plug",
        "tap"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose tap for the home-and-rooms meaning: the part where water comes out.",
      "skillTag": "home_bathroom",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C84",
        "K84"
      ],
      "choiceRationales": [
        "drain is a plausible home-and-rooms distractor, but it does not mean: the part where water comes out.",
        "sink is a plausible home-and-rooms distractor, but it does not mean: the part where water comes out.",
        "plug is a plausible home-and-rooms distractor, but it does not mean: the part where water comes out.",
        "tap is the only option that matches the tested meaning: the part where water comes out."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "drain — отверстие, куда уходит вода. Это не про «часть, откуда течет вода»; выбираем tap.",
          "sink означает «чаша с водой для мытья рук или посуды». Здесь спрашивают «часть, откуда течет вода»; ответ tap.",
          "Не plug: это «конец кабеля, который вставляют в розетку». В этом вопросе правильный вариант — tap.",
          "Да: tap — часть, откуда течет вода. Это ровно то, что описано в задании."
        ],
        "uk": [
          "drain теж із теми дому, але не означає «the part where water comes out». Тут правильна відповідь tap.",
          "sink теж із теми дому, але не означає «the part where water comes out». Тут правильна відповідь tap.",
          "plug теж із теми дому, але не означає «the part where water comes out». Тут правильна відповідь tap.",
          "Так: tap означає «the part where water comes out». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "drain también suena a casa, pero no significa «the part where water comes out». La respuesta correcta es tap.",
          "sink también suena a casa, pero no significa «the part where water comes out». La respuesta correcta es tap.",
          "plug también suena a casa, pero no significa «the part where water comes out». La respuesta correcta es tap.",
          "Sí: tap significa «the part where water comes out». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "drain também é do tema casa, mas não significa “the part where water comes out”. A resposta certa é tap.",
          "sink também é do tema casa, mas não significa “the part where water comes out”. A resposta certa é tap.",
          "plug também é do tema casa, mas não significa “the part where water comes out”. A resposta certa é tap.",
          "Isso: tap significa “the part where water comes out”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "drain cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the part where water comes out”. Đáp án đúng là tap.",
          "sink cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the part where water comes out”. Đáp án đúng là tap.",
          "plug cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the part where water comes out”. Đáp án đúng là tap.",
          "tap nghĩa là “the part where water comes out”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "drain masih bertema rumah, tetapi bukan “the part where water comes out”. Jawaban yang tepat adalah tap.",
          "sink masih bertema rumah, tetapi bukan “the part where water comes out”. Jawaban yang tepat adalah tap.",
          "plug masih bertema rumah, tetapi bukan “the part where water comes out”. Jawaban yang tepat adalah tap.",
          "tap berarti “the part where water comes out”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "drain ev temasıyla ilgili olabilir, ama “the part where water comes out” anlamına gelmez. Doğru cevap tap.",
          "sink ev temasıyla ilgili olabilir, ama “the part where water comes out” anlamına gelmez. Doğru cevap tap.",
          "plug ev temasıyla ilgili olabilir, ama “the part where water comes out” anlamına gelmez. Doğru cevap tap.",
          "Evet: tap, “the part where water comes out” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "drain też pasuje do tematu domu, ale nie znaczy „the part where water comes out”. Poprawna odpowiedź to tap.",
          "sink też pasuje do tematu domu, ale nie znaczy „the part where water comes out”. Poprawna odpowiedź to tap.",
          "plug też pasuje do tematu domu, ale nie znaczy „the part where water comes out”. Poprawna odpowiedź to tap.",
          "Tak: tap znaczy „the part where water comes out”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-085",
      "type": "mcq",
      "prompt": "Choose the English word for: the hole where water goes away.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «отверстие, куда уходит вода».",
        "uk": "Яке англійське слово або фраза означає «the hole where water goes away»?",
        "es": "¿Qué palabra o expresión inglesa significa «the hole where water goes away»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the hole where water goes away”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the hole where water goes away”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the hole where water goes away”?",
        "tr": "“the hole where water goes away” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the hole where water goes away”?"
      },
      "choices": [
        "drain",
        "tap",
        "socket",
        "peephole"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose drain for the home-and-rooms meaning: the hole where water goes away.",
      "skillTag": "home_bathroom",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C85",
        "K85"
      ],
      "choiceRationales": [
        "drain is the only option that matches the tested meaning: the hole where water goes away.",
        "tap is a plausible home-and-rooms distractor, but it does not mean: the hole where water goes away.",
        "socket is a plausible home-and-rooms distractor, but it does not mean: the hole where water goes away.",
        "peephole is a plausible home-and-rooms distractor, but it does not mean: the hole where water goes away."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: drain — отверстие, куда уходит вода. Это ровно то, что описано в задании.",
          "tap означает «часть, откуда течет вода». Здесь спрашивают «отверстие, куда уходит вода»; ответ drain.",
          "Не socket: это «место в стене, куда вставляют вилку». В этом вопросе правильный вариант — drain.",
          "peephole — «маленькое отверстие в двери, чтобы видеть, кто снаружи», а в вопросе нужно «отверстие, куда уходит вода». Поэтому выбираем drain."
        ],
        "uk": [
          "Так: drain означає «the hole where water goes away». Тримай у голові просту домашню картинку.",
          "tap теж із теми дому, але не означає «the hole where water goes away». Тут правильна відповідь drain.",
          "socket теж із теми дому, але не означає «the hole where water goes away». Тут правильна відповідь drain.",
          "peephole теж із теми дому, але не означає «the hole where water goes away». Тут правильна відповідь drain."
        ],
        "es": [
          "Sí: drain significa «the hole where water goes away». La imagen de casa ayuda a recordarlo.",
          "tap también suena a casa, pero no significa «the hole where water goes away». La respuesta correcta es drain.",
          "socket también suena a casa, pero no significa «the hole where water goes away». La respuesta correcta es drain.",
          "peephole también suena a casa, pero no significa «the hole where water goes away». La respuesta correcta es drain."
        ],
        "pt-BR": [
          "Isso: drain significa “the hole where water goes away”. Ligue a palavra a uma cena simples da casa.",
          "tap também é do tema casa, mas não significa “the hole where water goes away”. A resposta certa é drain.",
          "socket também é do tema casa, mas não significa “the hole where water goes away”. A resposta certa é drain.",
          "peephole também é do tema casa, mas não significa “the hole where water goes away”. A resposta certa é drain."
        ],
        "vi": [
          "drain nghĩa là “the hole where water goes away”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "tap cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the hole where water goes away”. Đáp án đúng là drain.",
          "socket cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the hole where water goes away”. Đáp án đúng là drain.",
          "peephole cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the hole where water goes away”. Đáp án đúng là drain."
        ],
        "id": [
          "drain berarti “the hole where water goes away”. Bayangkan benda atau ruang itu di rumah.",
          "tap masih bertema rumah, tetapi bukan “the hole where water goes away”. Jawaban yang tepat adalah drain.",
          "socket masih bertema rumah, tetapi bukan “the hole where water goes away”. Jawaban yang tepat adalah drain.",
          "peephole masih bertema rumah, tetapi bukan “the hole where water goes away”. Jawaban yang tepat adalah drain."
        ],
        "tr": [
          "Evet: drain, “the hole where water goes away” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "tap ev temasıyla ilgili olabilir, ama “the hole where water goes away” anlamına gelmez. Doğru cevap drain.",
          "socket ev temasıyla ilgili olabilir, ama “the hole where water goes away” anlamına gelmez. Doğru cevap drain.",
          "peephole ev temasıyla ilgili olabilir, ama “the hole where water goes away” anlamına gelmez. Doğru cevap drain."
        ],
        "pl": [
          "Tak: drain znaczy „the hole where water goes away”. Połącz słowo z prostym obrazem w domu.",
          "tap też pasuje do tematu domu, ale nie znaczy „the hole where water goes away”. Poprawna odpowiedź to drain.",
          "socket też pasuje do tematu domu, ale nie znaczy „the hole where water goes away”. Poprawna odpowiedź to drain.",
          "peephole też pasuje do tematu domu, ale nie znaczy „the hole where water goes away”. Poprawna odpowiedź to drain."
        ]
      }
    },
    {
      "id": "home-and-rooms-086",
      "type": "mcq",
      "prompt": "Choose the English word for: a place or device for washing while standing.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «место или устройство для мытья стоя».",
        "uk": "Яке англійське слово або фраза означає «a place or device for washing while standing»?",
        "es": "¿Qué palabra o expresión inglesa significa «a place or device for washing while standing»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a place or device for washing while standing”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a place or device for washing while standing”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a place or device for washing while standing”?",
        "tr": "“a place or device for washing while standing” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a place or device for washing while standing”?"
      },
      "choices": [
        "bathtub",
        "shower",
        "toilet",
        "sink"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose shower for the home-and-rooms meaning: a place or device for washing while standing.",
      "skillTag": "home_bathroom",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C86",
        "K86"
      ],
      "choiceRationales": [
        "bathtub is a plausible home-and-rooms distractor, but it does not mean: a place or device for washing while standing.",
        "shower is the only option that matches the tested meaning: a place or device for washing while standing.",
        "toilet is a plausible home-and-rooms distractor, but it does not mean: a place or device for washing while standing.",
        "sink is a plausible home-and-rooms distractor, but it does not mean: a place or device for washing while standing."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "bathtub — большая ванна, где можно сидеть и мыться. Это не про «место или устройство для мытья стоя»; выбираем shower.",
          "Да: shower — место или устройство для мытья стоя. Это ровно то, что описано в задании.",
          "Не toilet: это «сантехника в ванной или туалете». В этом вопросе правильный вариант — shower.",
          "sink — «чаша с водой для мытья рук или посуды», а в вопросе нужно «место или устройство для мытья стоя». Поэтому выбираем shower."
        ],
        "uk": [
          "bathtub теж із теми дому, але не означає «a place or device for washing while standing». Тут правильна відповідь shower.",
          "Так: shower означає «a place or device for washing while standing». Тримай у голові просту домашню картинку.",
          "toilet теж із теми дому, але не означає «a place or device for washing while standing». Тут правильна відповідь shower.",
          "sink теж із теми дому, але не означає «a place or device for washing while standing». Тут правильна відповідь shower."
        ],
        "es": [
          "bathtub también suena a casa, pero no significa «a place or device for washing while standing». La respuesta correcta es shower.",
          "Sí: shower significa «a place or device for washing while standing». La imagen de casa ayuda a recordarlo.",
          "toilet también suena a casa, pero no significa «a place or device for washing while standing». La respuesta correcta es shower.",
          "sink también suena a casa, pero no significa «a place or device for washing while standing». La respuesta correcta es shower."
        ],
        "pt-BR": [
          "bathtub também é do tema casa, mas não significa “a place or device for washing while standing”. A resposta certa é shower.",
          "Isso: shower significa “a place or device for washing while standing”. Ligue a palavra a uma cena simples da casa.",
          "toilet também é do tema casa, mas não significa “a place or device for washing while standing”. A resposta certa é shower.",
          "sink também é do tema casa, mas não significa “a place or device for washing while standing”. A resposta certa é shower."
        ],
        "vi": [
          "bathtub cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a place or device for washing while standing”. Đáp án đúng là shower.",
          "shower nghĩa là “a place or device for washing while standing”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "toilet cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a place or device for washing while standing”. Đáp án đúng là shower.",
          "sink cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a place or device for washing while standing”. Đáp án đúng là shower."
        ],
        "id": [
          "bathtub masih bertema rumah, tetapi bukan “a place or device for washing while standing”. Jawaban yang tepat adalah shower.",
          "shower berarti “a place or device for washing while standing”. Bayangkan benda atau ruang itu di rumah.",
          "toilet masih bertema rumah, tetapi bukan “a place or device for washing while standing”. Jawaban yang tepat adalah shower.",
          "sink masih bertema rumah, tetapi bukan “a place or device for washing while standing”. Jawaban yang tepat adalah shower."
        ],
        "tr": [
          "bathtub ev temasıyla ilgili olabilir, ama “a place or device for washing while standing” anlamına gelmez. Doğru cevap shower.",
          "Evet: shower, “a place or device for washing while standing” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "toilet ev temasıyla ilgili olabilir, ama “a place or device for washing while standing” anlamına gelmez. Doğru cevap shower.",
          "sink ev temasıyla ilgili olabilir, ama “a place or device for washing while standing” anlamına gelmez. Doğru cevap shower."
        ],
        "pl": [
          "bathtub też pasuje do tematu domu, ale nie znaczy „a place or device for washing while standing”. Poprawna odpowiedź to shower.",
          "Tak: shower znaczy „a place or device for washing while standing”. Połącz słowo z prostym obrazem w domu.",
          "toilet też pasuje do tematu domu, ale nie znaczy „a place or device for washing while standing”. Poprawna odpowiedź to shower.",
          "sink też pasuje do tematu domu, ale nie znaczy „a place or device for washing while standing”. Poprawna odpowiedź to shower."
        ]
      }
    },
    {
      "id": "home-and-rooms-087",
      "type": "mcq",
      "prompt": "Choose the English word for: a large tub where you can sit and wash.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «большая ванна, где можно сидеть и мыться».",
        "uk": "Яке англійське слово або фраза означає «a large tub where you can sit and wash»?",
        "es": "¿Qué palabra o expresión inglesa significa «a large tub where you can sit and wash»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a large tub where you can sit and wash”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a large tub where you can sit and wash”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a large tub where you can sit and wash”?",
        "tr": "“a large tub where you can sit and wash” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a large tub where you can sit and wash”?"
      },
      "choices": [
        "shower",
        "sink",
        "bathtub",
        "laundry basket"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose bathtub for the home-and-rooms meaning: a large tub where you can sit and wash.",
      "skillTag": "home_bathroom",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C87",
        "K87"
      ],
      "choiceRationales": [
        "shower is a plausible home-and-rooms distractor, but it does not mean: a large tub where you can sit and wash.",
        "sink is a plausible home-and-rooms distractor, but it does not mean: a large tub where you can sit and wash.",
        "bathtub is the only option that matches the tested meaning: a large tub where you can sit and wash.",
        "laundry basket is a plausible home-and-rooms distractor, but it does not mean: a large tub where you can sit and wash."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "shower — место или устройство для мытья стоя. Это не про «большая ванна, где можно сидеть и мыться»; выбираем bathtub.",
          "sink означает «чаша с водой для мытья рук или посуды». Здесь спрашивают «большая ванна, где можно сидеть и мыться»; ответ bathtub.",
          "Да: bathtub — большая ванна, где можно сидеть и мыться. Это ровно то, что описано в задании.",
          "laundry basket — «корзина для грязной или чистой одежды», а в вопросе нужно «большая ванна, где можно сидеть и мыться». Поэтому выбираем bathtub."
        ],
        "uk": [
          "shower теж із теми дому, але не означає «a large tub where you can sit and wash». Тут правильна відповідь bathtub.",
          "sink теж із теми дому, але не означає «a large tub where you can sit and wash». Тут правильна відповідь bathtub.",
          "Так: bathtub означає «a large tub where you can sit and wash». Тримай у голові просту домашню картинку.",
          "laundry basket теж із теми дому, але не означає «a large tub where you can sit and wash». Тут правильна відповідь bathtub."
        ],
        "es": [
          "shower también suena a casa, pero no significa «a large tub where you can sit and wash». La respuesta correcta es bathtub.",
          "sink también suena a casa, pero no significa «a large tub where you can sit and wash». La respuesta correcta es bathtub.",
          "Sí: bathtub significa «a large tub where you can sit and wash». La imagen de casa ayuda a recordarlo.",
          "laundry basket también suena a casa, pero no significa «a large tub where you can sit and wash». La respuesta correcta es bathtub."
        ],
        "pt-BR": [
          "shower também é do tema casa, mas não significa “a large tub where you can sit and wash”. A resposta certa é bathtub.",
          "sink também é do tema casa, mas não significa “a large tub where you can sit and wash”. A resposta certa é bathtub.",
          "Isso: bathtub significa “a large tub where you can sit and wash”. Ligue a palavra a uma cena simples da casa.",
          "laundry basket também é do tema casa, mas não significa “a large tub where you can sit and wash”. A resposta certa é bathtub."
        ],
        "vi": [
          "shower cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a large tub where you can sit and wash”. Đáp án đúng là bathtub.",
          "sink cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a large tub where you can sit and wash”. Đáp án đúng là bathtub.",
          "bathtub nghĩa là “a large tub where you can sit and wash”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "laundry basket cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a large tub where you can sit and wash”. Đáp án đúng là bathtub."
        ],
        "id": [
          "shower masih bertema rumah, tetapi bukan “a large tub where you can sit and wash”. Jawaban yang tepat adalah bathtub.",
          "sink masih bertema rumah, tetapi bukan “a large tub where you can sit and wash”. Jawaban yang tepat adalah bathtub.",
          "bathtub berarti “a large tub where you can sit and wash”. Bayangkan benda atau ruang itu di rumah.",
          "laundry basket masih bertema rumah, tetapi bukan “a large tub where you can sit and wash”. Jawaban yang tepat adalah bathtub."
        ],
        "tr": [
          "shower ev temasıyla ilgili olabilir, ama “a large tub where you can sit and wash” anlamına gelmez. Doğru cevap bathtub.",
          "sink ev temasıyla ilgili olabilir, ama “a large tub where you can sit and wash” anlamına gelmez. Doğru cevap bathtub.",
          "Evet: bathtub, “a large tub where you can sit and wash” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "laundry basket ev temasıyla ilgili olabilir, ama “a large tub where you can sit and wash” anlamına gelmez. Doğru cevap bathtub."
        ],
        "pl": [
          "shower też pasuje do tematu domu, ale nie znaczy „a large tub where you can sit and wash”. Poprawna odpowiedź to bathtub.",
          "sink też pasuje do tematu domu, ale nie znaczy „a large tub where you can sit and wash”. Poprawna odpowiedź to bathtub.",
          "Tak: bathtub znaczy „a large tub where you can sit and wash”. Połącz słowo z prostym obrazem w domu.",
          "laundry basket też pasuje do tematu domu, ale nie znaczy „a large tub where you can sit and wash”. Poprawna odpowiedź to bathtub."
        ]
      }
    },
    {
      "id": "home-and-rooms-088",
      "type": "mcq",
      "prompt": "Choose the English word for: a small brush for cleaning teeth.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «маленькая щетка для чистки зубов».",
        "uk": "Яке англійське слово або фраза означає «a small brush for cleaning teeth»?",
        "es": "¿Qué palabra o expresión inglesa significa «a small brush for cleaning teeth»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a small brush for cleaning teeth”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a small brush for cleaning teeth”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a small brush for cleaning teeth”?",
        "tr": "“a small brush for cleaning teeth” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a small brush for cleaning teeth”?"
      },
      "choices": [
        "toilet brush",
        "comb",
        "mop",
        "toothbrush"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose toothbrush for the home-and-rooms meaning: a small brush for cleaning teeth.",
      "skillTag": "home_bathroom",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C88",
        "K88"
      ],
      "choiceRationales": [
        "toilet brush is a plausible home-and-rooms distractor, but it does not mean: a small brush for cleaning teeth.",
        "comb is a plausible home-and-rooms distractor, but it does not mean: a small brush for cleaning teeth.",
        "mop is a plausible home-and-rooms distractor, but it does not mean: a small brush for cleaning teeth.",
        "toothbrush is the only option that matches the tested meaning: a small brush for cleaning teeth."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "toilet brush — щетка для чистки унитаза. Это не про «маленькая щетка для чистки зубов»; выбираем toothbrush.",
          "comb означает «предмет, которым приводят волосы в порядок». Здесь спрашивают «маленькая щетка для чистки зубов»; ответ toothbrush.",
          "Не mop: это «инструмент, которым моют пол». В этом вопросе правильный вариант — toothbrush.",
          "Да: toothbrush — маленькая щетка для чистки зубов. Это ровно то, что описано в задании."
        ],
        "uk": [
          "toilet brush теж із теми дому, але не означає «a small brush for cleaning teeth». Тут правильна відповідь toothbrush.",
          "comb теж із теми дому, але не означає «a small brush for cleaning teeth». Тут правильна відповідь toothbrush.",
          "mop теж із теми дому, але не означає «a small brush for cleaning teeth». Тут правильна відповідь toothbrush.",
          "Так: toothbrush означає «a small brush for cleaning teeth». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "toilet brush también suena a casa, pero no significa «a small brush for cleaning teeth». La respuesta correcta es toothbrush.",
          "comb también suena a casa, pero no significa «a small brush for cleaning teeth». La respuesta correcta es toothbrush.",
          "mop también suena a casa, pero no significa «a small brush for cleaning teeth». La respuesta correcta es toothbrush.",
          "Sí: toothbrush significa «a small brush for cleaning teeth». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "toilet brush também é do tema casa, mas não significa “a small brush for cleaning teeth”. A resposta certa é toothbrush.",
          "comb também é do tema casa, mas não significa “a small brush for cleaning teeth”. A resposta certa é toothbrush.",
          "mop também é do tema casa, mas não significa “a small brush for cleaning teeth”. A resposta certa é toothbrush.",
          "Isso: toothbrush significa “a small brush for cleaning teeth”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "toilet brush cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small brush for cleaning teeth”. Đáp án đúng là toothbrush.",
          "comb cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small brush for cleaning teeth”. Đáp án đúng là toothbrush.",
          "mop cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a small brush for cleaning teeth”. Đáp án đúng là toothbrush.",
          "toothbrush nghĩa là “a small brush for cleaning teeth”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "toilet brush masih bertema rumah, tetapi bukan “a small brush for cleaning teeth”. Jawaban yang tepat adalah toothbrush.",
          "comb masih bertema rumah, tetapi bukan “a small brush for cleaning teeth”. Jawaban yang tepat adalah toothbrush.",
          "mop masih bertema rumah, tetapi bukan “a small brush for cleaning teeth”. Jawaban yang tepat adalah toothbrush.",
          "toothbrush berarti “a small brush for cleaning teeth”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "toilet brush ev temasıyla ilgili olabilir, ama “a small brush for cleaning teeth” anlamına gelmez. Doğru cevap toothbrush.",
          "comb ev temasıyla ilgili olabilir, ama “a small brush for cleaning teeth” anlamına gelmez. Doğru cevap toothbrush.",
          "mop ev temasıyla ilgili olabilir, ama “a small brush for cleaning teeth” anlamına gelmez. Doğru cevap toothbrush.",
          "Evet: toothbrush, “a small brush for cleaning teeth” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "toilet brush też pasuje do tematu domu, ale nie znaczy „a small brush for cleaning teeth”. Poprawna odpowiedź to toothbrush.",
          "comb też pasuje do tematu domu, ale nie znaczy „a small brush for cleaning teeth”. Poprawna odpowiedź to toothbrush.",
          "mop też pasuje do tematu domu, ale nie znaczy „a small brush for cleaning teeth”. Poprawna odpowiedź to toothbrush.",
          "Tak: toothbrush znaczy „a small brush for cleaning teeth”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-089",
      "type": "mcq",
      "prompt": "Choose the English word for: the paste used with a toothbrush.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «паста, которую используют с зубной щеткой».",
        "uk": "Яке англійське слово або фраза означає «the paste used with a toothbrush»?",
        "es": "¿Qué palabra o expresión inglesa significa «the paste used with a toothbrush»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “the paste used with a toothbrush”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “the paste used with a toothbrush”?",
        "id": "Kata atau frasa Inggris mana yang berarti “the paste used with a toothbrush”?",
        "tr": "“the paste used with a toothbrush” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „the paste used with a toothbrush”?"
      },
      "choices": [
        "toothpaste",
        "soap",
        "towel",
        "cloth"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose toothpaste for the home-and-rooms meaning: the paste used with a toothbrush.",
      "skillTag": "home_bathroom",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C89",
        "K89"
      ],
      "choiceRationales": [
        "toothpaste is the only option that matches the tested meaning: the paste used with a toothbrush.",
        "soap is a plausible home-and-rooms distractor, but it does not mean: the paste used with a toothbrush.",
        "towel is a plausible home-and-rooms distractor, but it does not mean: the paste used with a toothbrush.",
        "cloth is a plausible home-and-rooms distractor, but it does not mean: the paste used with a toothbrush."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: toothpaste — паста, которую используют с зубной щеткой. Это ровно то, что описано в задании.",
          "soap означает «средство для мытья рук или тела». Здесь спрашивают «паста, которую используют с зубной щеткой»; ответ toothpaste.",
          "Не towel: это «ткань для вытирания рук или тела». В этом вопросе правильный вариант — toothpaste.",
          "cloth — «кусок ткани для уборки или вытирания», а в вопросе нужно «паста, которую используют с зубной щеткой». Поэтому выбираем toothpaste."
        ],
        "uk": [
          "Так: toothpaste означає «the paste used with a toothbrush». Тримай у голові просту домашню картинку.",
          "soap теж із теми дому, але не означає «the paste used with a toothbrush». Тут правильна відповідь toothpaste.",
          "towel теж із теми дому, але не означає «the paste used with a toothbrush». Тут правильна відповідь toothpaste.",
          "cloth теж із теми дому, але не означає «the paste used with a toothbrush». Тут правильна відповідь toothpaste."
        ],
        "es": [
          "Sí: toothpaste significa «the paste used with a toothbrush». La imagen de casa ayuda a recordarlo.",
          "soap también suena a casa, pero no significa «the paste used with a toothbrush». La respuesta correcta es toothpaste.",
          "towel también suena a casa, pero no significa «the paste used with a toothbrush». La respuesta correcta es toothpaste.",
          "cloth también suena a casa, pero no significa «the paste used with a toothbrush». La respuesta correcta es toothpaste."
        ],
        "pt-BR": [
          "Isso: toothpaste significa “the paste used with a toothbrush”. Ligue a palavra a uma cena simples da casa.",
          "soap também é do tema casa, mas não significa “the paste used with a toothbrush”. A resposta certa é toothpaste.",
          "towel também é do tema casa, mas não significa “the paste used with a toothbrush”. A resposta certa é toothpaste.",
          "cloth também é do tema casa, mas não significa “the paste used with a toothbrush”. A resposta certa é toothpaste."
        ],
        "vi": [
          "toothpaste nghĩa là “the paste used with a toothbrush”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "soap cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the paste used with a toothbrush”. Đáp án đúng là toothpaste.",
          "towel cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the paste used with a toothbrush”. Đáp án đúng là toothpaste.",
          "cloth cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “the paste used with a toothbrush”. Đáp án đúng là toothpaste."
        ],
        "id": [
          "toothpaste berarti “the paste used with a toothbrush”. Bayangkan benda atau ruang itu di rumah.",
          "soap masih bertema rumah, tetapi bukan “the paste used with a toothbrush”. Jawaban yang tepat adalah toothpaste.",
          "towel masih bertema rumah, tetapi bukan “the paste used with a toothbrush”. Jawaban yang tepat adalah toothpaste.",
          "cloth masih bertema rumah, tetapi bukan “the paste used with a toothbrush”. Jawaban yang tepat adalah toothpaste."
        ],
        "tr": [
          "Evet: toothpaste, “the paste used with a toothbrush” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "soap ev temasıyla ilgili olabilir, ama “the paste used with a toothbrush” anlamına gelmez. Doğru cevap toothpaste.",
          "towel ev temasıyla ilgili olabilir, ama “the paste used with a toothbrush” anlamına gelmez. Doğru cevap toothpaste.",
          "cloth ev temasıyla ilgili olabilir, ama “the paste used with a toothbrush” anlamına gelmez. Doğru cevap toothpaste."
        ],
        "pl": [
          "Tak: toothpaste znaczy „the paste used with a toothbrush”. Połącz słowo z prostym obrazem w domu.",
          "soap też pasuje do tematu domu, ale nie znaczy „the paste used with a toothbrush”. Poprawna odpowiedź to toothpaste.",
          "towel też pasuje do tematu domu, ale nie znaczy „the paste used with a toothbrush”. Poprawna odpowiedź to toothpaste.",
          "cloth też pasuje do tematu domu, ale nie znaczy „the paste used with a toothbrush”. Poprawna odpowiedź to toothpaste."
        ]
      }
    },
    {
      "id": "home-and-rooms-090",
      "type": "mcq",
      "prompt": "Choose the English word for: an object used to tidy hair.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «предмет, которым приводят волосы в порядок».",
        "uk": "Яке англійське слово або фраза означає «an object used to tidy hair»?",
        "es": "¿Qué palabra o expresión inglesa significa «an object used to tidy hair»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “an object used to tidy hair”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “an object used to tidy hair”?",
        "id": "Kata atau frasa Inggris mana yang berarti “an object used to tidy hair”?",
        "tr": "“an object used to tidy hair” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „an object used to tidy hair”?"
      },
      "choices": [
        "toothbrush",
        "comb",
        "iron",
        "broom"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose comb for the home-and-rooms meaning: an object used to tidy hair.",
      "skillTag": "home_bathroom",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C90",
        "K90"
      ],
      "choiceRationales": [
        "toothbrush is a plausible home-and-rooms distractor, but it does not mean: an object used to tidy hair.",
        "comb is the only option that matches the tested meaning: an object used to tidy hair.",
        "iron is a plausible home-and-rooms distractor, but it does not mean: an object used to tidy hair.",
        "broom is a plausible home-and-rooms distractor, but it does not mean: an object used to tidy hair."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "toothbrush — маленькая щетка для чистки зубов. Это не про «предмет, которым приводят волосы в порядок»; выбираем comb.",
          "Да: comb — предмет, которым приводят волосы в порядок. Это ровно то, что описано в задании.",
          "Не iron: это «горячий инструмент для разглаживания одежды». В этом вопросе правильный вариант — comb.",
          "broom — «инструмент, которым подметают пол», а в вопросе нужно «предмет, которым приводят волосы в порядок». Поэтому выбираем comb."
        ],
        "uk": [
          "toothbrush теж із теми дому, але не означає «an object used to tidy hair». Тут правильна відповідь comb.",
          "Так: comb означає «an object used to tidy hair». Тримай у голові просту домашню картинку.",
          "iron теж із теми дому, але не означає «an object used to tidy hair». Тут правильна відповідь comb.",
          "broom теж із теми дому, але не означає «an object used to tidy hair». Тут правильна відповідь comb."
        ],
        "es": [
          "toothbrush también suena a casa, pero no significa «an object used to tidy hair». La respuesta correcta es comb.",
          "Sí: comb significa «an object used to tidy hair». La imagen de casa ayuda a recordarlo.",
          "iron también suena a casa, pero no significa «an object used to tidy hair». La respuesta correcta es comb.",
          "broom también suena a casa, pero no significa «an object used to tidy hair». La respuesta correcta es comb."
        ],
        "pt-BR": [
          "toothbrush também é do tema casa, mas não significa “an object used to tidy hair”. A resposta certa é comb.",
          "Isso: comb significa “an object used to tidy hair”. Ligue a palavra a uma cena simples da casa.",
          "iron também é do tema casa, mas não significa “an object used to tidy hair”. A resposta certa é comb.",
          "broom também é do tema casa, mas não significa “an object used to tidy hair”. A resposta certa é comb."
        ],
        "vi": [
          "toothbrush cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “an object used to tidy hair”. Đáp án đúng là comb.",
          "comb nghĩa là “an object used to tidy hair”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "iron cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “an object used to tidy hair”. Đáp án đúng là comb.",
          "broom cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “an object used to tidy hair”. Đáp án đúng là comb."
        ],
        "id": [
          "toothbrush masih bertema rumah, tetapi bukan “an object used to tidy hair”. Jawaban yang tepat adalah comb.",
          "comb berarti “an object used to tidy hair”. Bayangkan benda atau ruang itu di rumah.",
          "iron masih bertema rumah, tetapi bukan “an object used to tidy hair”. Jawaban yang tepat adalah comb.",
          "broom masih bertema rumah, tetapi bukan “an object used to tidy hair”. Jawaban yang tepat adalah comb."
        ],
        "tr": [
          "toothbrush ev temasıyla ilgili olabilir, ama “an object used to tidy hair” anlamına gelmez. Doğru cevap comb.",
          "Evet: comb, “an object used to tidy hair” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "iron ev temasıyla ilgili olabilir, ama “an object used to tidy hair” anlamına gelmez. Doğru cevap comb.",
          "broom ev temasıyla ilgili olabilir, ama “an object used to tidy hair” anlamına gelmez. Doğru cevap comb."
        ],
        "pl": [
          "toothbrush też pasuje do tematu domu, ale nie znaczy „an object used to tidy hair”. Poprawna odpowiedź to comb.",
          "Tak: comb znaczy „an object used to tidy hair”. Połącz słowo z prostym obrazem w domu.",
          "iron też pasuje do tematu domu, ale nie znaczy „an object used to tidy hair”. Poprawna odpowiedź to comb.",
          "broom też pasuje do tematu domu, ale nie znaczy „an object used to tidy hair”. Poprawna odpowiedź to comb."
        ]
      }
    },
    {
      "id": "home-and-rooms-091",
      "type": "mcq",
      "prompt": "Choose the English word for: a device that blows warm air to dry hair.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «устройство с теплым воздухом для сушки волос».",
        "uk": "Яке англійське слово або фраза означає «a device that blows warm air to dry hair»?",
        "es": "¿Qué palabra o expresión inglesa significa «a device that blows warm air to dry hair»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a device that blows warm air to dry hair”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a device that blows warm air to dry hair”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a device that blows warm air to dry hair”?",
        "tr": "“a device that blows warm air to dry hair” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a device that blows warm air to dry hair”?"
      },
      "choices": [
        "dryer",
        "vacuum cleaner",
        "hair dryer",
        "remote control"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose hair dryer for the home-and-rooms meaning: a device that blows warm air to dry hair.",
      "skillTag": "home_bathroom",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C91",
        "K91"
      ],
      "choiceRationales": [
        "dryer is a plausible home-and-rooms distractor, but it does not mean: a device that blows warm air to dry hair.",
        "vacuum cleaner is a plausible home-and-rooms distractor, but it does not mean: a device that blows warm air to dry hair.",
        "hair dryer is the only option that matches the tested meaning: a device that blows warm air to dry hair.",
        "remote control is a plausible home-and-rooms distractor, but it does not mean: a device that blows warm air to dry hair."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "dryer — машина, которая сушит одежду. Это не про «устройство с теплым воздухом для сушки волос»; выбираем hair dryer.",
          "vacuum cleaner означает «машина, которая всасывает пыль с пола». Здесь спрашивают «устройство с теплым воздухом для сушки волос»; ответ hair dryer.",
          "Да: hair dryer — устройство с теплым воздухом для сушки волос. Это ровно то, что описано в задании.",
          "remote control — «маленькое устройство для управления телевизором», а в вопросе нужно «устройство с теплым воздухом для сушки волос». Поэтому выбираем hair dryer."
        ],
        "uk": [
          "dryer теж із теми дому, але не означає «a device that blows warm air to dry hair». Тут правильна відповідь hair dryer.",
          "vacuum cleaner теж із теми дому, але не означає «a device that blows warm air to dry hair». Тут правильна відповідь hair dryer.",
          "Так: hair dryer означає «a device that blows warm air to dry hair». Тримай у голові просту домашню картинку.",
          "remote control теж із теми дому, але не означає «a device that blows warm air to dry hair». Тут правильна відповідь hair dryer."
        ],
        "es": [
          "dryer también suena a casa, pero no significa «a device that blows warm air to dry hair». La respuesta correcta es hair dryer.",
          "vacuum cleaner también suena a casa, pero no significa «a device that blows warm air to dry hair». La respuesta correcta es hair dryer.",
          "Sí: hair dryer significa «a device that blows warm air to dry hair». La imagen de casa ayuda a recordarlo.",
          "remote control también suena a casa, pero no significa «a device that blows warm air to dry hair». La respuesta correcta es hair dryer."
        ],
        "pt-BR": [
          "dryer também é do tema casa, mas não significa “a device that blows warm air to dry hair”. A resposta certa é hair dryer.",
          "vacuum cleaner também é do tema casa, mas não significa “a device that blows warm air to dry hair”. A resposta certa é hair dryer.",
          "Isso: hair dryer significa “a device that blows warm air to dry hair”. Ligue a palavra a uma cena simples da casa.",
          "remote control também é do tema casa, mas não significa “a device that blows warm air to dry hair”. A resposta certa é hair dryer."
        ],
        "vi": [
          "dryer cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a device that blows warm air to dry hair”. Đáp án đúng là hair dryer.",
          "vacuum cleaner cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a device that blows warm air to dry hair”. Đáp án đúng là hair dryer.",
          "hair dryer nghĩa là “a device that blows warm air to dry hair”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "remote control cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a device that blows warm air to dry hair”. Đáp án đúng là hair dryer."
        ],
        "id": [
          "dryer masih bertema rumah, tetapi bukan “a device that blows warm air to dry hair”. Jawaban yang tepat adalah hair dryer.",
          "vacuum cleaner masih bertema rumah, tetapi bukan “a device that blows warm air to dry hair”. Jawaban yang tepat adalah hair dryer.",
          "hair dryer berarti “a device that blows warm air to dry hair”. Bayangkan benda atau ruang itu di rumah.",
          "remote control masih bertema rumah, tetapi bukan “a device that blows warm air to dry hair”. Jawaban yang tepat adalah hair dryer."
        ],
        "tr": [
          "dryer ev temasıyla ilgili olabilir, ama “a device that blows warm air to dry hair” anlamına gelmez. Doğru cevap hair dryer.",
          "vacuum cleaner ev temasıyla ilgili olabilir, ama “a device that blows warm air to dry hair” anlamına gelmez. Doğru cevap hair dryer.",
          "Evet: hair dryer, “a device that blows warm air to dry hair” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "remote control ev temasıyla ilgili olabilir, ama “a device that blows warm air to dry hair” anlamına gelmez. Doğru cevap hair dryer."
        ],
        "pl": [
          "dryer też pasuje do tematu domu, ale nie znaczy „a device that blows warm air to dry hair”. Poprawna odpowiedź to hair dryer.",
          "vacuum cleaner też pasuje do tematu domu, ale nie znaczy „a device that blows warm air to dry hair”. Poprawna odpowiedź to hair dryer.",
          "Tak: hair dryer znaczy „a device that blows warm air to dry hair”. Połącz słowo z prostym obrazem w domu.",
          "remote control też pasuje do tematu domu, ale nie znaczy „a device that blows warm air to dry hair”. Poprawna odpowiedź to hair dryer."
        ]
      }
    },
    {
      "id": "home-and-rooms-092",
      "type": "mcq",
      "prompt": "Choose the English word for: a machine used to clean floors by sucking up dust.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «машина, которая всасывает пыль с пола».",
        "uk": "Яке англійське слово або фраза означає «a machine used to clean floors by sucking up dust»?",
        "es": "¿Qué palabra o expresión inglesa significa «a machine used to clean floors by sucking up dust»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a machine used to clean floors by sucking up dust”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a machine used to clean floors by sucking up dust”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a machine used to clean floors by sucking up dust”?",
        "tr": "“a machine used to clean floors by sucking up dust” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a machine used to clean floors by sucking up dust”?"
      },
      "choices": [
        "washing machine",
        "dryer",
        "hair dryer",
        "vacuum cleaner"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose vacuum cleaner for the home-and-rooms meaning: a machine used to clean floors by sucking up dust.",
      "skillTag": "home_cleaning",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C92",
        "K92"
      ],
      "choiceRationales": [
        "washing machine is a plausible home-and-rooms distractor, but it does not mean: a machine used to clean floors by sucking up dust.",
        "dryer is a plausible home-and-rooms distractor, but it does not mean: a machine used to clean floors by sucking up dust.",
        "hair dryer is a plausible home-and-rooms distractor, but it does not mean: a machine used to clean floors by sucking up dust.",
        "vacuum cleaner is the only option that matches the tested meaning: a machine used to clean floors by sucking up dust."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "washing machine — машина, которая стирает одежду. Это не про «машина, которая всасывает пыль с пола»; выбираем vacuum cleaner.",
          "dryer означает «машина, которая сушит одежду». Здесь спрашивают «машина, которая всасывает пыль с пола»; ответ vacuum cleaner.",
          "Не hair dryer: это «устройство с теплым воздухом для сушки волос». В этом вопросе правильный вариант — vacuum cleaner.",
          "Да: vacuum cleaner — машина, которая всасывает пыль с пола. Это ровно то, что описано в задании."
        ],
        "uk": [
          "washing machine теж із теми дому, але не означає «a machine used to clean floors by sucking up dust». Тут правильна відповідь vacuum cleaner.",
          "dryer теж із теми дому, але не означає «a machine used to clean floors by sucking up dust». Тут правильна відповідь vacuum cleaner.",
          "hair dryer теж із теми дому, але не означає «a machine used to clean floors by sucking up dust». Тут правильна відповідь vacuum cleaner.",
          "Так: vacuum cleaner означає «a machine used to clean floors by sucking up dust». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "washing machine también suena a casa, pero no significa «a machine used to clean floors by sucking up dust». La respuesta correcta es vacuum cleaner.",
          "dryer también suena a casa, pero no significa «a machine used to clean floors by sucking up dust». La respuesta correcta es vacuum cleaner.",
          "hair dryer también suena a casa, pero no significa «a machine used to clean floors by sucking up dust». La respuesta correcta es vacuum cleaner.",
          "Sí: vacuum cleaner significa «a machine used to clean floors by sucking up dust». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "washing machine também é do tema casa, mas não significa “a machine used to clean floors by sucking up dust”. A resposta certa é vacuum cleaner.",
          "dryer também é do tema casa, mas não significa “a machine used to clean floors by sucking up dust”. A resposta certa é vacuum cleaner.",
          "hair dryer também é do tema casa, mas não significa “a machine used to clean floors by sucking up dust”. A resposta certa é vacuum cleaner.",
          "Isso: vacuum cleaner significa “a machine used to clean floors by sucking up dust”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "washing machine cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a machine used to clean floors by sucking up dust”. Đáp án đúng là vacuum cleaner.",
          "dryer cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a machine used to clean floors by sucking up dust”. Đáp án đúng là vacuum cleaner.",
          "hair dryer cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a machine used to clean floors by sucking up dust”. Đáp án đúng là vacuum cleaner.",
          "vacuum cleaner nghĩa là “a machine used to clean floors by sucking up dust”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "washing machine masih bertema rumah, tetapi bukan “a machine used to clean floors by sucking up dust”. Jawaban yang tepat adalah vacuum cleaner.",
          "dryer masih bertema rumah, tetapi bukan “a machine used to clean floors by sucking up dust”. Jawaban yang tepat adalah vacuum cleaner.",
          "hair dryer masih bertema rumah, tetapi bukan “a machine used to clean floors by sucking up dust”. Jawaban yang tepat adalah vacuum cleaner.",
          "vacuum cleaner berarti “a machine used to clean floors by sucking up dust”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "washing machine ev temasıyla ilgili olabilir, ama “a machine used to clean floors by sucking up dust” anlamına gelmez. Doğru cevap vacuum cleaner.",
          "dryer ev temasıyla ilgili olabilir, ama “a machine used to clean floors by sucking up dust” anlamına gelmez. Doğru cevap vacuum cleaner.",
          "hair dryer ev temasıyla ilgili olabilir, ama “a machine used to clean floors by sucking up dust” anlamına gelmez. Doğru cevap vacuum cleaner.",
          "Evet: vacuum cleaner, “a machine used to clean floors by sucking up dust” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "washing machine też pasuje do tematu domu, ale nie znaczy „a machine used to clean floors by sucking up dust”. Poprawna odpowiedź to vacuum cleaner.",
          "dryer też pasuje do tematu domu, ale nie znaczy „a machine used to clean floors by sucking up dust”. Poprawna odpowiedź to vacuum cleaner.",
          "hair dryer też pasuje do tematu domu, ale nie znaczy „a machine used to clean floors by sucking up dust”. Poprawna odpowiedź to vacuum cleaner.",
          "Tak: vacuum cleaner znaczy „a machine used to clean floors by sucking up dust”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-093",
      "type": "mcq",
      "prompt": "Choose the English word for: a tool used to sweep the floor.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «инструмент, которым подметают пол».",
        "uk": "Яке англійське слово або фраза означає «a tool used to sweep the floor»?",
        "es": "¿Qué palabra o expresión inglesa significa «a tool used to sweep the floor»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a tool used to sweep the floor”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a tool used to sweep the floor”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a tool used to sweep the floor”?",
        "tr": "“a tool used to sweep the floor” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a tool used to sweep the floor”?"
      },
      "choices": [
        "broom",
        "mop",
        "toilet brush",
        "hanger"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose broom for the home-and-rooms meaning: a tool used to sweep the floor.",
      "skillTag": "home_cleaning",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C93",
        "K93"
      ],
      "choiceRationales": [
        "broom is the only option that matches the tested meaning: a tool used to sweep the floor.",
        "mop is a plausible home-and-rooms distractor, but it does not mean: a tool used to sweep the floor.",
        "toilet brush is a plausible home-and-rooms distractor, but it does not mean: a tool used to sweep the floor.",
        "hanger is a plausible home-and-rooms distractor, but it does not mean: a tool used to sweep the floor."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: broom — инструмент, которым подметают пол. Это ровно то, что описано в задании.",
          "mop означает «инструмент, которым моют пол». Здесь спрашивают «инструмент, которым подметают пол»; ответ broom.",
          "Не toilet brush: это «щетка для чистки унитаза». В этом вопросе правильный вариант — broom.",
          "hanger — «предмет, на который вешают одежду в шкафу», а в вопросе нужно «инструмент, которым подметают пол». Поэтому выбираем broom."
        ],
        "uk": [
          "Так: broom означає «a tool used to sweep the floor». Тримай у голові просту домашню картинку.",
          "mop теж із теми дому, але не означає «a tool used to sweep the floor». Тут правильна відповідь broom.",
          "toilet brush теж із теми дому, але не означає «a tool used to sweep the floor». Тут правильна відповідь broom.",
          "hanger теж із теми дому, але не означає «a tool used to sweep the floor». Тут правильна відповідь broom."
        ],
        "es": [
          "Sí: broom significa «a tool used to sweep the floor». La imagen de casa ayuda a recordarlo.",
          "mop también suena a casa, pero no significa «a tool used to sweep the floor». La respuesta correcta es broom.",
          "toilet brush también suena a casa, pero no significa «a tool used to sweep the floor». La respuesta correcta es broom.",
          "hanger también suena a casa, pero no significa «a tool used to sweep the floor». La respuesta correcta es broom."
        ],
        "pt-BR": [
          "Isso: broom significa “a tool used to sweep the floor”. Ligue a palavra a uma cena simples da casa.",
          "mop também é do tema casa, mas não significa “a tool used to sweep the floor”. A resposta certa é broom.",
          "toilet brush também é do tema casa, mas não significa “a tool used to sweep the floor”. A resposta certa é broom.",
          "hanger também é do tema casa, mas não significa “a tool used to sweep the floor”. A resposta certa é broom."
        ],
        "vi": [
          "broom nghĩa là “a tool used to sweep the floor”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "mop cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a tool used to sweep the floor”. Đáp án đúng là broom.",
          "toilet brush cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a tool used to sweep the floor”. Đáp án đúng là broom.",
          "hanger cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a tool used to sweep the floor”. Đáp án đúng là broom."
        ],
        "id": [
          "broom berarti “a tool used to sweep the floor”. Bayangkan benda atau ruang itu di rumah.",
          "mop masih bertema rumah, tetapi bukan “a tool used to sweep the floor”. Jawaban yang tepat adalah broom.",
          "toilet brush masih bertema rumah, tetapi bukan “a tool used to sweep the floor”. Jawaban yang tepat adalah broom.",
          "hanger masih bertema rumah, tetapi bukan “a tool used to sweep the floor”. Jawaban yang tepat adalah broom."
        ],
        "tr": [
          "Evet: broom, “a tool used to sweep the floor” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "mop ev temasıyla ilgili olabilir, ama “a tool used to sweep the floor” anlamına gelmez. Doğru cevap broom.",
          "toilet brush ev temasıyla ilgili olabilir, ama “a tool used to sweep the floor” anlamına gelmez. Doğru cevap broom.",
          "hanger ev temasıyla ilgili olabilir, ama “a tool used to sweep the floor” anlamına gelmez. Doğru cevap broom."
        ],
        "pl": [
          "Tak: broom znaczy „a tool used to sweep the floor”. Połącz słowo z prostym obrazem w domu.",
          "mop też pasuje do tematu domu, ale nie znaczy „a tool used to sweep the floor”. Poprawna odpowiedź to broom.",
          "toilet brush też pasuje do tematu domu, ale nie znaczy „a tool used to sweep the floor”. Poprawna odpowiedź to broom.",
          "hanger też pasuje do tematu domu, ale nie znaczy „a tool used to sweep the floor”. Poprawna odpowiedź to broom."
        ]
      }
    },
    {
      "id": "home-and-rooms-094",
      "type": "mcq",
      "prompt": "Choose the English word for: a tool used to wash the floor.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «инструмент, которым моют пол».",
        "uk": "Яке англійське слово або фраза означає «a tool used to wash the floor»?",
        "es": "¿Qué palabra o expresión inglesa significa «a tool used to wash the floor»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a tool used to wash the floor”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a tool used to wash the floor”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a tool used to wash the floor”?",
        "tr": "“a tool used to wash the floor” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a tool used to wash the floor”?"
      },
      "choices": [
        "broom",
        "mop",
        "comb",
        "iron"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose mop for the home-and-rooms meaning: a tool used to wash the floor.",
      "skillTag": "home_cleaning",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C94",
        "K94"
      ],
      "choiceRationales": [
        "broom is a plausible home-and-rooms distractor, but it does not mean: a tool used to wash the floor.",
        "mop is the only option that matches the tested meaning: a tool used to wash the floor.",
        "comb is a plausible home-and-rooms distractor, but it does not mean: a tool used to wash the floor.",
        "iron is a plausible home-and-rooms distractor, but it does not mean: a tool used to wash the floor."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "broom — инструмент, которым подметают пол. Это не про «инструмент, которым моют пол»; выбираем mop.",
          "Да: mop — инструмент, которым моют пол. Это ровно то, что описано в задании.",
          "Не comb: это «предмет, которым приводят волосы в порядок». В этом вопросе правильный вариант — mop.",
          "iron — «горячий инструмент для разглаживания одежды», а в вопросе нужно «инструмент, которым моют пол». Поэтому выбираем mop."
        ],
        "uk": [
          "broom теж із теми дому, але не означає «a tool used to wash the floor». Тут правильна відповідь mop.",
          "Так: mop означає «a tool used to wash the floor». Тримай у голові просту домашню картинку.",
          "comb теж із теми дому, але не означає «a tool used to wash the floor». Тут правильна відповідь mop.",
          "iron теж із теми дому, але не означає «a tool used to wash the floor». Тут правильна відповідь mop."
        ],
        "es": [
          "broom también suena a casa, pero no significa «a tool used to wash the floor». La respuesta correcta es mop.",
          "Sí: mop significa «a tool used to wash the floor». La imagen de casa ayuda a recordarlo.",
          "comb también suena a casa, pero no significa «a tool used to wash the floor». La respuesta correcta es mop.",
          "iron también suena a casa, pero no significa «a tool used to wash the floor». La respuesta correcta es mop."
        ],
        "pt-BR": [
          "broom também é do tema casa, mas não significa “a tool used to wash the floor”. A resposta certa é mop.",
          "Isso: mop significa “a tool used to wash the floor”. Ligue a palavra a uma cena simples da casa.",
          "comb também é do tema casa, mas não significa “a tool used to wash the floor”. A resposta certa é mop.",
          "iron também é do tema casa, mas não significa “a tool used to wash the floor”. A resposta certa é mop."
        ],
        "vi": [
          "broom cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a tool used to wash the floor”. Đáp án đúng là mop.",
          "mop nghĩa là “a tool used to wash the floor”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "comb cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a tool used to wash the floor”. Đáp án đúng là mop.",
          "iron cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a tool used to wash the floor”. Đáp án đúng là mop."
        ],
        "id": [
          "broom masih bertema rumah, tetapi bukan “a tool used to wash the floor”. Jawaban yang tepat adalah mop.",
          "mop berarti “a tool used to wash the floor”. Bayangkan benda atau ruang itu di rumah.",
          "comb masih bertema rumah, tetapi bukan “a tool used to wash the floor”. Jawaban yang tepat adalah mop.",
          "iron masih bertema rumah, tetapi bukan “a tool used to wash the floor”. Jawaban yang tepat adalah mop."
        ],
        "tr": [
          "broom ev temasıyla ilgili olabilir, ama “a tool used to wash the floor” anlamına gelmez. Doğru cevap mop.",
          "Evet: mop, “a tool used to wash the floor” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "comb ev temasıyla ilgili olabilir, ama “a tool used to wash the floor” anlamına gelmez. Doğru cevap mop.",
          "iron ev temasıyla ilgili olabilir, ama “a tool used to wash the floor” anlamına gelmez. Doğru cevap mop."
        ],
        "pl": [
          "broom też pasuje do tematu domu, ale nie znaczy „a tool used to wash the floor”. Poprawna odpowiedź to mop.",
          "Tak: mop znaczy „a tool used to wash the floor”. Połącz słowo z prostym obrazem w domu.",
          "comb też pasuje do tematu domu, ale nie znaczy „a tool used to wash the floor”. Poprawna odpowiedź to mop.",
          "iron też pasuje do tematu domu, ale nie znaczy „a tool used to wash the floor”. Poprawna odpowiedź to mop."
        ]
      }
    },
    {
      "id": "home-and-rooms-095",
      "type": "mcq",
      "prompt": "Choose the English word for: a container for rubbish.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «контейнер для мусора».",
        "uk": "Яке англійське слово або фраза означає «a container for rubbish»?",
        "es": "¿Qué palabra o expresión inglesa significa «a container for rubbish»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a container for rubbish”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a container for rubbish”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a container for rubbish”?",
        "tr": "“a container for rubbish” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a container for rubbish”?"
      },
      "choices": [
        "laundry basket",
        "storage box",
        "trash can",
        "mailbox"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose trash can for the home-and-rooms meaning: a container for rubbish.",
      "skillTag": "home_cleaning",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C95",
        "K95"
      ],
      "choiceRationales": [
        "laundry basket is a plausible home-and-rooms distractor, but it does not mean: a container for rubbish.",
        "storage box is a plausible home-and-rooms distractor, but it does not mean: a container for rubbish.",
        "trash can is the only option that matches the tested meaning: a container for rubbish.",
        "mailbox is a plausible home-and-rooms distractor, but it does not mean: a container for rubbish."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "laundry basket — корзина для грязной или чистой одежды. Это не про «контейнер для мусора»; выбираем trash can.",
          "storage box означает «коробка для хранения домашних вещей». Здесь спрашивают «контейнер для мусора»; ответ trash can.",
          "Да: trash can — контейнер для мусора. Это ровно то, что описано в задании.",
          "mailbox — «ящик, куда доставляют письма», а в вопросе нужно «контейнер для мусора». Поэтому выбираем trash can."
        ],
        "uk": [
          "laundry basket теж із теми дому, але не означає «a container for rubbish». Тут правильна відповідь trash can.",
          "storage box теж із теми дому, але не означає «a container for rubbish». Тут правильна відповідь trash can.",
          "Так: trash can означає «a container for rubbish». Тримай у голові просту домашню картинку.",
          "mailbox теж із теми дому, але не означає «a container for rubbish». Тут правильна відповідь trash can."
        ],
        "es": [
          "laundry basket también suena a casa, pero no significa «a container for rubbish». La respuesta correcta es trash can.",
          "storage box también suena a casa, pero no significa «a container for rubbish». La respuesta correcta es trash can.",
          "Sí: trash can significa «a container for rubbish». La imagen de casa ayuda a recordarlo.",
          "mailbox también suena a casa, pero no significa «a container for rubbish». La respuesta correcta es trash can."
        ],
        "pt-BR": [
          "laundry basket também é do tema casa, mas não significa “a container for rubbish”. A resposta certa é trash can.",
          "storage box também é do tema casa, mas não significa “a container for rubbish”. A resposta certa é trash can.",
          "Isso: trash can significa “a container for rubbish”. Ligue a palavra a uma cena simples da casa.",
          "mailbox também é do tema casa, mas não significa “a container for rubbish”. A resposta certa é trash can."
        ],
        "vi": [
          "laundry basket cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a container for rubbish”. Đáp án đúng là trash can.",
          "storage box cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a container for rubbish”. Đáp án đúng là trash can.",
          "trash can nghĩa là “a container for rubbish”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "mailbox cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a container for rubbish”. Đáp án đúng là trash can."
        ],
        "id": [
          "laundry basket masih bertema rumah, tetapi bukan “a container for rubbish”. Jawaban yang tepat adalah trash can.",
          "storage box masih bertema rumah, tetapi bukan “a container for rubbish”. Jawaban yang tepat adalah trash can.",
          "trash can berarti “a container for rubbish”. Bayangkan benda atau ruang itu di rumah.",
          "mailbox masih bertema rumah, tetapi bukan “a container for rubbish”. Jawaban yang tepat adalah trash can."
        ],
        "tr": [
          "laundry basket ev temasıyla ilgili olabilir, ama “a container for rubbish” anlamına gelmez. Doğru cevap trash can.",
          "storage box ev temasıyla ilgili olabilir, ama “a container for rubbish” anlamına gelmez. Doğru cevap trash can.",
          "Evet: trash can, “a container for rubbish” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "mailbox ev temasıyla ilgili olabilir, ama “a container for rubbish” anlamına gelmez. Doğru cevap trash can."
        ],
        "pl": [
          "laundry basket też pasuje do tematu domu, ale nie znaczy „a container for rubbish”. Poprawna odpowiedź to trash can.",
          "storage box też pasuje do tematu domu, ale nie znaczy „a container for rubbish”. Poprawna odpowiedź to trash can.",
          "Tak: trash can znaczy „a container for rubbish”. Połącz słowo z prostym obrazem w domu.",
          "mailbox też pasuje do tematu domu, ale nie znaczy „a container for rubbish”. Poprawna odpowiedź to trash can."
        ]
      }
    },
    {
      "id": "home-and-rooms-096",
      "type": "mcq",
      "prompt": "Choose the English word for: a piece of fabric used for cleaning or wiping.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «кусок ткани для уборки или вытирания».",
        "uk": "Яке англійське слово або фраза означає «a piece of fabric used for cleaning or wiping»?",
        "es": "¿Qué palabra o expresión inglesa significa «a piece of fabric used for cleaning or wiping»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a piece of fabric used for cleaning or wiping”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a piece of fabric used for cleaning or wiping”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a piece of fabric used for cleaning or wiping”?",
        "tr": "“a piece of fabric used for cleaning or wiping” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a piece of fabric used for cleaning or wiping”?"
      },
      "choices": [
        "towel",
        "blanket",
        "carpet",
        "cloth"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose cloth for the home-and-rooms meaning: a piece of fabric used for cleaning or wiping.",
      "skillTag": "home_cleaning",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C96",
        "K96"
      ],
      "choiceRationales": [
        "towel is a plausible home-and-rooms distractor, but it does not mean: a piece of fabric used for cleaning or wiping.",
        "blanket is a plausible home-and-rooms distractor, but it does not mean: a piece of fabric used for cleaning or wiping.",
        "carpet is a plausible home-and-rooms distractor, but it does not mean: a piece of fabric used for cleaning or wiping.",
        "cloth is the only option that matches the tested meaning: a piece of fabric used for cleaning or wiping."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "towel — ткань для вытирания рук или тела. Это не про «кусок ткани для уборки или вытирания»; выбираем cloth.",
          "blanket означает «теплое покрывало для кровати». Здесь спрашивают «кусок ткани для уборки или вытирания»; ответ cloth.",
          "Не carpet: это «мягкое покрытие для большей части пола». В этом вопросе правильный вариант — cloth.",
          "Да: cloth — кусок ткани для уборки или вытирания. Это ровно то, что описано в задании."
        ],
        "uk": [
          "towel теж із теми дому, але не означає «a piece of fabric used for cleaning or wiping». Тут правильна відповідь cloth.",
          "blanket теж із теми дому, але не означає «a piece of fabric used for cleaning or wiping». Тут правильна відповідь cloth.",
          "carpet теж із теми дому, але не означає «a piece of fabric used for cleaning or wiping». Тут правильна відповідь cloth.",
          "Так: cloth означає «a piece of fabric used for cleaning or wiping». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "towel también suena a casa, pero no significa «a piece of fabric used for cleaning or wiping». La respuesta correcta es cloth.",
          "blanket también suena a casa, pero no significa «a piece of fabric used for cleaning or wiping». La respuesta correcta es cloth.",
          "carpet también suena a casa, pero no significa «a piece of fabric used for cleaning or wiping». La respuesta correcta es cloth.",
          "Sí: cloth significa «a piece of fabric used for cleaning or wiping». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "towel também é do tema casa, mas não significa “a piece of fabric used for cleaning or wiping”. A resposta certa é cloth.",
          "blanket também é do tema casa, mas não significa “a piece of fabric used for cleaning or wiping”. A resposta certa é cloth.",
          "carpet também é do tema casa, mas não significa “a piece of fabric used for cleaning or wiping”. A resposta certa é cloth.",
          "Isso: cloth significa “a piece of fabric used for cleaning or wiping”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "towel cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a piece of fabric used for cleaning or wiping”. Đáp án đúng là cloth.",
          "blanket cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a piece of fabric used for cleaning or wiping”. Đáp án đúng là cloth.",
          "carpet cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a piece of fabric used for cleaning or wiping”. Đáp án đúng là cloth.",
          "cloth nghĩa là “a piece of fabric used for cleaning or wiping”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "towel masih bertema rumah, tetapi bukan “a piece of fabric used for cleaning or wiping”. Jawaban yang tepat adalah cloth.",
          "blanket masih bertema rumah, tetapi bukan “a piece of fabric used for cleaning or wiping”. Jawaban yang tepat adalah cloth.",
          "carpet masih bertema rumah, tetapi bukan “a piece of fabric used for cleaning or wiping”. Jawaban yang tepat adalah cloth.",
          "cloth berarti “a piece of fabric used for cleaning or wiping”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "towel ev temasıyla ilgili olabilir, ama “a piece of fabric used for cleaning or wiping” anlamına gelmez. Doğru cevap cloth.",
          "blanket ev temasıyla ilgili olabilir, ama “a piece of fabric used for cleaning or wiping” anlamına gelmez. Doğru cevap cloth.",
          "carpet ev temasıyla ilgili olabilir, ama “a piece of fabric used for cleaning or wiping” anlamına gelmez. Doğru cevap cloth.",
          "Evet: cloth, “a piece of fabric used for cleaning or wiping” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "towel też pasuje do tematu domu, ale nie znaczy „a piece of fabric used for cleaning or wiping”. Poprawna odpowiedź to cloth.",
          "blanket też pasuje do tematu domu, ale nie znaczy „a piece of fabric used for cleaning or wiping”. Poprawna odpowiedź to cloth.",
          "carpet też pasuje do tematu domu, ale nie znaczy „a piece of fabric used for cleaning or wiping”. Poprawna odpowiedź to cloth.",
          "Tak: cloth znaczy „a piece of fabric used for cleaning or wiping”. Połącz słowo z prostym obrazem w domu."
        ]
      }
    },
    {
      "id": "home-and-rooms-097",
      "type": "mcq",
      "prompt": "Choose the English word for: a cabinet in the bathroom for toiletries or small items.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «шкафчик в ванной для туалетных принадлежностей».",
        "uk": "Яке англійське слово або фраза означає «a cabinet in the bathroom for toiletries or small items»?",
        "es": "¿Qué palabra o expresión inglesa significa «a cabinet in the bathroom for toiletries or small items»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a cabinet in the bathroom for toiletries or small items”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a cabinet in the bathroom for toiletries or small items”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a cabinet in the bathroom for toiletries or small items”?",
        "tr": "“a cabinet in the bathroom for toiletries or small items” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a cabinet in the bathroom for toiletries or small items”?"
      },
      "choices": [
        "bathroom cabinet",
        "medicine cabinet",
        "cupboard",
        "bookshelf"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose bathroom cabinet for the home-and-rooms meaning: a cabinet in the bathroom for toiletries or small items.",
      "skillTag": "home_bathroom",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C97",
        "K97"
      ],
      "choiceRationales": [
        "bathroom cabinet is the only option that matches the tested meaning: a cabinet in the bathroom for toiletries or small items.",
        "medicine cabinet is a plausible home-and-rooms distractor, but it does not mean: a cabinet in the bathroom for toiletries or small items.",
        "cupboard is a plausible home-and-rooms distractor, but it does not mean: a cabinet in the bathroom for toiletries or small items.",
        "bookshelf is a plausible home-and-rooms distractor, but it does not mean: a cabinet in the bathroom for toiletries or small items."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да: bathroom cabinet — шкафчик в ванной для туалетных принадлежностей. Это ровно то, что описано в задании.",
          "medicine cabinet означает «шкафчик для лекарств». Здесь спрашивают «шкафчик в ванной для туалетных принадлежностей»; ответ bathroom cabinet.",
          "Не cupboard: это «шкафчик с дверцами для хранения вещей». В этом вопросе правильный вариант — bathroom cabinet.",
          "bookshelf — «полка или шкаф для книг», а в вопросе нужно «шкафчик в ванной для туалетных принадлежностей». Поэтому выбираем bathroom cabinet."
        ],
        "uk": [
          "Так: bathroom cabinet означає «a cabinet in the bathroom for toiletries or small items». Тримай у голові просту домашню картинку.",
          "medicine cabinet теж із теми дому, але не означає «a cabinet in the bathroom for toiletries or small items». Тут правильна відповідь bathroom cabinet.",
          "cupboard теж із теми дому, але не означає «a cabinet in the bathroom for toiletries or small items». Тут правильна відповідь bathroom cabinet.",
          "bookshelf теж із теми дому, але не означає «a cabinet in the bathroom for toiletries or small items». Тут правильна відповідь bathroom cabinet."
        ],
        "es": [
          "Sí: bathroom cabinet significa «a cabinet in the bathroom for toiletries or small items». La imagen de casa ayuda a recordarlo.",
          "medicine cabinet también suena a casa, pero no significa «a cabinet in the bathroom for toiletries or small items». La respuesta correcta es bathroom cabinet.",
          "cupboard también suena a casa, pero no significa «a cabinet in the bathroom for toiletries or small items». La respuesta correcta es bathroom cabinet.",
          "bookshelf también suena a casa, pero no significa «a cabinet in the bathroom for toiletries or small items». La respuesta correcta es bathroom cabinet."
        ],
        "pt-BR": [
          "Isso: bathroom cabinet significa “a cabinet in the bathroom for toiletries or small items”. Ligue a palavra a uma cena simples da casa.",
          "medicine cabinet também é do tema casa, mas não significa “a cabinet in the bathroom for toiletries or small items”. A resposta certa é bathroom cabinet.",
          "cupboard também é do tema casa, mas não significa “a cabinet in the bathroom for toiletries or small items”. A resposta certa é bathroom cabinet.",
          "bookshelf também é do tema casa, mas não significa “a cabinet in the bathroom for toiletries or small items”. A resposta certa é bathroom cabinet."
        ],
        "vi": [
          "bathroom cabinet nghĩa là “a cabinet in the bathroom for toiletries or small items”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "medicine cabinet cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a cabinet in the bathroom for toiletries or small items”. Đáp án đúng là bathroom cabinet.",
          "cupboard cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a cabinet in the bathroom for toiletries or small items”. Đáp án đúng là bathroom cabinet.",
          "bookshelf cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a cabinet in the bathroom for toiletries or small items”. Đáp án đúng là bathroom cabinet."
        ],
        "id": [
          "bathroom cabinet berarti “a cabinet in the bathroom for toiletries or small items”. Bayangkan benda atau ruang itu di rumah.",
          "medicine cabinet masih bertema rumah, tetapi bukan “a cabinet in the bathroom for toiletries or small items”. Jawaban yang tepat adalah bathroom cabinet.",
          "cupboard masih bertema rumah, tetapi bukan “a cabinet in the bathroom for toiletries or small items”. Jawaban yang tepat adalah bathroom cabinet.",
          "bookshelf masih bertema rumah, tetapi bukan “a cabinet in the bathroom for toiletries or small items”. Jawaban yang tepat adalah bathroom cabinet."
        ],
        "tr": [
          "Evet: bathroom cabinet, “a cabinet in the bathroom for toiletries or small items” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "medicine cabinet ev temasıyla ilgili olabilir, ama “a cabinet in the bathroom for toiletries or small items” anlamına gelmez. Doğru cevap bathroom cabinet.",
          "cupboard ev temasıyla ilgili olabilir, ama “a cabinet in the bathroom for toiletries or small items” anlamına gelmez. Doğru cevap bathroom cabinet.",
          "bookshelf ev temasıyla ilgili olabilir, ama “a cabinet in the bathroom for toiletries or small items” anlamına gelmez. Doğru cevap bathroom cabinet."
        ],
        "pl": [
          "Tak: bathroom cabinet znaczy „a cabinet in the bathroom for toiletries or small items”. Połącz słowo z prostym obrazem w domu.",
          "medicine cabinet też pasuje do tematu domu, ale nie znaczy „a cabinet in the bathroom for toiletries or small items”. Poprawna odpowiedź to bathroom cabinet.",
          "cupboard też pasuje do tematu domu, ale nie znaczy „a cabinet in the bathroom for toiletries or small items”. Poprawna odpowiedź to bathroom cabinet.",
          "bookshelf też pasuje do tematu domu, ale nie znaczy „a cabinet in the bathroom for toiletries or small items”. Poprawna odpowiedź to bathroom cabinet."
        ]
      }
    },
    {
      "id": "home-and-rooms-098",
      "type": "mcq",
      "prompt": "Choose the English word for: a bathroom or wall cabinet for medicines.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «шкафчик для лекарств».",
        "uk": "Яке англійське слово або фраза означає «a bathroom or wall cabinet for medicines»?",
        "es": "¿Qué palabra o expresión inglesa significa «a bathroom or wall cabinet for medicines»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a bathroom or wall cabinet for medicines”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a bathroom or wall cabinet for medicines”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a bathroom or wall cabinet for medicines”?",
        "tr": "“a bathroom or wall cabinet for medicines” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a bathroom or wall cabinet for medicines”?"
      },
      "choices": [
        "bathroom cabinet",
        "medicine cabinet",
        "wardrobe",
        "shoe rack"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose medicine cabinet for the home-and-rooms meaning: a bathroom or wall cabinet for medicines.",
      "skillTag": "home_bathroom",
      "sourceIds": [
        "S1",
        "S3"
      ],
      "claimIds": [
        "C98",
        "K98"
      ],
      "choiceRationales": [
        "bathroom cabinet is a plausible home-and-rooms distractor, but it does not mean: a bathroom or wall cabinet for medicines.",
        "medicine cabinet is the only option that matches the tested meaning: a bathroom or wall cabinet for medicines.",
        "wardrobe is a plausible home-and-rooms distractor, but it does not mean: a bathroom or wall cabinet for medicines.",
        "shoe rack is a plausible home-and-rooms distractor, but it does not mean: a bathroom or wall cabinet for medicines."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "bathroom cabinet — шкафчик в ванной для туалетных принадлежностей. Это не про «шкафчик для лекарств»; выбираем medicine cabinet.",
          "Да: medicine cabinet — шкафчик для лекарств. Это ровно то, что описано в задании.",
          "Не wardrobe: это «высокий шкаф для одежды». В этом вопросе правильный вариант — medicine cabinet.",
          "shoe rack — «полка или стойка для обуви», а в вопросе нужно «шкафчик для лекарств». Поэтому выбираем medicine cabinet."
        ],
        "uk": [
          "bathroom cabinet теж із теми дому, але не означає «a bathroom or wall cabinet for medicines». Тут правильна відповідь medicine cabinet.",
          "Так: medicine cabinet означає «a bathroom or wall cabinet for medicines». Тримай у голові просту домашню картинку.",
          "wardrobe теж із теми дому, але не означає «a bathroom or wall cabinet for medicines». Тут правильна відповідь medicine cabinet.",
          "shoe rack теж із теми дому, але не означає «a bathroom or wall cabinet for medicines». Тут правильна відповідь medicine cabinet."
        ],
        "es": [
          "bathroom cabinet también suena a casa, pero no significa «a bathroom or wall cabinet for medicines». La respuesta correcta es medicine cabinet.",
          "Sí: medicine cabinet significa «a bathroom or wall cabinet for medicines». La imagen de casa ayuda a recordarlo.",
          "wardrobe también suena a casa, pero no significa «a bathroom or wall cabinet for medicines». La respuesta correcta es medicine cabinet.",
          "shoe rack también suena a casa, pero no significa «a bathroom or wall cabinet for medicines». La respuesta correcta es medicine cabinet."
        ],
        "pt-BR": [
          "bathroom cabinet também é do tema casa, mas não significa “a bathroom or wall cabinet for medicines”. A resposta certa é medicine cabinet.",
          "Isso: medicine cabinet significa “a bathroom or wall cabinet for medicines”. Ligue a palavra a uma cena simples da casa.",
          "wardrobe também é do tema casa, mas não significa “a bathroom or wall cabinet for medicines”. A resposta certa é medicine cabinet.",
          "shoe rack também é do tema casa, mas não significa “a bathroom or wall cabinet for medicines”. A resposta certa é medicine cabinet."
        ],
        "vi": [
          "bathroom cabinet cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a bathroom or wall cabinet for medicines”. Đáp án đúng là medicine cabinet.",
          "medicine cabinet nghĩa là “a bathroom or wall cabinet for medicines”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "wardrobe cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a bathroom or wall cabinet for medicines”. Đáp án đúng là medicine cabinet.",
          "shoe rack cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a bathroom or wall cabinet for medicines”. Đáp án đúng là medicine cabinet."
        ],
        "id": [
          "bathroom cabinet masih bertema rumah, tetapi bukan “a bathroom or wall cabinet for medicines”. Jawaban yang tepat adalah medicine cabinet.",
          "medicine cabinet berarti “a bathroom or wall cabinet for medicines”. Bayangkan benda atau ruang itu di rumah.",
          "wardrobe masih bertema rumah, tetapi bukan “a bathroom or wall cabinet for medicines”. Jawaban yang tepat adalah medicine cabinet.",
          "shoe rack masih bertema rumah, tetapi bukan “a bathroom or wall cabinet for medicines”. Jawaban yang tepat adalah medicine cabinet."
        ],
        "tr": [
          "bathroom cabinet ev temasıyla ilgili olabilir, ama “a bathroom or wall cabinet for medicines” anlamına gelmez. Doğru cevap medicine cabinet.",
          "Evet: medicine cabinet, “a bathroom or wall cabinet for medicines” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "wardrobe ev temasıyla ilgili olabilir, ama “a bathroom or wall cabinet for medicines” anlamına gelmez. Doğru cevap medicine cabinet.",
          "shoe rack ev temasıyla ilgili olabilir, ama “a bathroom or wall cabinet for medicines” anlamına gelmez. Doğru cevap medicine cabinet."
        ],
        "pl": [
          "bathroom cabinet też pasuje do tematu domu, ale nie znaczy „a bathroom or wall cabinet for medicines”. Poprawna odpowiedź to medicine cabinet.",
          "Tak: medicine cabinet znaczy „a bathroom or wall cabinet for medicines”. Połącz słowo z prostym obrazem w domu.",
          "wardrobe też pasuje do tematu domu, ale nie znaczy „a bathroom or wall cabinet for medicines”. Poprawna odpowiedź to medicine cabinet.",
          "shoe rack też pasuje do tematu domu, ale nie znaczy „a bathroom or wall cabinet for medicines”. Poprawna odpowiedź to medicine cabinet."
        ]
      }
    },
    {
      "id": "home-and-rooms-099",
      "type": "mcq",
      "prompt": "Choose the English word for: a curtain that keeps water inside the shower area.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «занавеска, которая удерживает воду в зоне душа».",
        "uk": "Яке англійське слово або фраза означає «a curtain that keeps water inside the shower area»?",
        "es": "¿Qué palabra o expresión inglesa significa «a curtain that keeps water inside the shower area»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a curtain that keeps water inside the shower area”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a curtain that keeps water inside the shower area”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a curtain that keeps water inside the shower area”?",
        "tr": "“a curtain that keeps water inside the shower area” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a curtain that keeps water inside the shower area”?"
      },
      "choices": [
        "curtains",
        "clothesline",
        "shower curtain",
        "blanket"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose shower curtain for the home-and-rooms meaning: a curtain that keeps water inside the shower area.",
      "skillTag": "home_bathroom",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C99",
        "K99"
      ],
      "choiceRationales": [
        "curtains is a plausible home-and-rooms distractor, but it does not mean: a curtain that keeps water inside the shower area.",
        "clothesline is a plausible home-and-rooms distractor, but it does not mean: a curtain that keeps water inside the shower area.",
        "shower curtain is the only option that matches the tested meaning: a curtain that keeps water inside the shower area.",
        "blanket is a plausible home-and-rooms distractor, but it does not mean: a curtain that keeps water inside the shower area."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "curtains — ткань, которой закрывают окно. Это не про «занавеска, которая удерживает воду в зоне душа»; выбираем shower curtain.",
          "clothesline означает «веревка или линия, на которой сушат одежду». Здесь спрашивают «занавеска, которая удерживает воду в зоне душа»; ответ shower curtain.",
          "Да: shower curtain — занавеска, которая удерживает воду в зоне душа. Это ровно то, что описано в задании.",
          "blanket — «теплое покрывало для кровати», а в вопросе нужно «занавеска, которая удерживает воду в зоне душа». Поэтому выбираем shower curtain."
        ],
        "uk": [
          "curtains теж із теми дому, але не означає «a curtain that keeps water inside the shower area». Тут правильна відповідь shower curtain.",
          "clothesline теж із теми дому, але не означає «a curtain that keeps water inside the shower area». Тут правильна відповідь shower curtain.",
          "Так: shower curtain означає «a curtain that keeps water inside the shower area». Тримай у голові просту домашню картинку.",
          "blanket теж із теми дому, але не означає «a curtain that keeps water inside the shower area». Тут правильна відповідь shower curtain."
        ],
        "es": [
          "curtains también suena a casa, pero no significa «a curtain that keeps water inside the shower area». La respuesta correcta es shower curtain.",
          "clothesline también suena a casa, pero no significa «a curtain that keeps water inside the shower area». La respuesta correcta es shower curtain.",
          "Sí: shower curtain significa «a curtain that keeps water inside the shower area». La imagen de casa ayuda a recordarlo.",
          "blanket también suena a casa, pero no significa «a curtain that keeps water inside the shower area». La respuesta correcta es shower curtain."
        ],
        "pt-BR": [
          "curtains também é do tema casa, mas não significa “a curtain that keeps water inside the shower area”. A resposta certa é shower curtain.",
          "clothesline também é do tema casa, mas não significa “a curtain that keeps water inside the shower area”. A resposta certa é shower curtain.",
          "Isso: shower curtain significa “a curtain that keeps water inside the shower area”. Ligue a palavra a uma cena simples da casa.",
          "blanket também é do tema casa, mas não significa “a curtain that keeps water inside the shower area”. A resposta certa é shower curtain."
        ],
        "vi": [
          "curtains cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a curtain that keeps water inside the shower area”. Đáp án đúng là shower curtain.",
          "clothesline cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a curtain that keeps water inside the shower area”. Đáp án đúng là shower curtain.",
          "shower curtain nghĩa là “a curtain that keeps water inside the shower area”. Hãy gắn từ này với một hình ảnh rõ trong nhà.",
          "blanket cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a curtain that keeps water inside the shower area”. Đáp án đúng là shower curtain."
        ],
        "id": [
          "curtains masih bertema rumah, tetapi bukan “a curtain that keeps water inside the shower area”. Jawaban yang tepat adalah shower curtain.",
          "clothesline masih bertema rumah, tetapi bukan “a curtain that keeps water inside the shower area”. Jawaban yang tepat adalah shower curtain.",
          "shower curtain berarti “a curtain that keeps water inside the shower area”. Bayangkan benda atau ruang itu di rumah.",
          "blanket masih bertema rumah, tetapi bukan “a curtain that keeps water inside the shower area”. Jawaban yang tepat adalah shower curtain."
        ],
        "tr": [
          "curtains ev temasıyla ilgili olabilir, ama “a curtain that keeps water inside the shower area” anlamına gelmez. Doğru cevap shower curtain.",
          "clothesline ev temasıyla ilgili olabilir, ama “a curtain that keeps water inside the shower area” anlamına gelmez. Doğru cevap shower curtain.",
          "Evet: shower curtain, “a curtain that keeps water inside the shower area” demektir. Kelimeyi evdeki net bir görüntüyle bağla.",
          "blanket ev temasıyla ilgili olabilir, ama “a curtain that keeps water inside the shower area” anlamına gelmez. Doğru cevap shower curtain."
        ],
        "pl": [
          "curtains też pasuje do tematu domu, ale nie znaczy „a curtain that keeps water inside the shower area”. Poprawna odpowiedź to shower curtain.",
          "clothesline też pasuje do tematu domu, ale nie znaczy „a curtain that keeps water inside the shower area”. Poprawna odpowiedź to shower curtain.",
          "Tak: shower curtain znaczy „a curtain that keeps water inside the shower area”. Połącz słowo z prostym obrazem w domu.",
          "blanket też pasuje do tematu domu, ale nie znaczy „a curtain that keeps water inside the shower area”. Poprawna odpowiedź to shower curtain."
        ]
      }
    },
    {
      "id": "home-and-rooms-100",
      "type": "mcq",
      "prompt": "Choose the English word for: a mat on the bathroom floor.",
      "localizedPrompts": {
        "ru": "Выбери английский вариант: «коврик на полу в ванной».",
        "uk": "Яке англійське слово або фраза означає «a mat on the bathroom floor»?",
        "es": "¿Qué palabra o expresión inglesa significa «a mat on the bathroom floor»?",
        "pt-BR": "Qual palavra ou expressão em inglês significa “a mat on the bathroom floor”?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào có nghĩa là “a mat on the bathroom floor”?",
        "id": "Kata atau frasa Inggris mana yang berarti “a mat on the bathroom floor”?",
        "tr": "“a mat on the bathroom floor” anlamına gelen İngilizce kelime veya ifade hangisi?",
        "pl": "Które angielskie słowo albo wyrażenie znaczy „a mat on the bathroom floor”?"
      },
      "choices": [
        "doormat",
        "rug",
        "carpet",
        "bath mat"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose bath mat for the home-and-rooms meaning: a mat on the bathroom floor.",
      "skillTag": "home_bathroom",
      "sourceIds": [
        "S1",
        "S2"
      ],
      "claimIds": [
        "C100",
        "K100"
      ],
      "choiceRationales": [
        "doormat is a plausible home-and-rooms distractor, but it does not mean: a mat on the bathroom floor.",
        "rug is a plausible home-and-rooms distractor, but it does not mean: a mat on the bathroom floor.",
        "carpet is a plausible home-and-rooms distractor, but it does not mean: a mat on the bathroom floor.",
        "bath mat is the only option that matches the tested meaning: a mat on the bathroom floor."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "doormat — коврик у двери для вытирания обуви. Это не про «коврик на полу в ванной»; выбираем bath mat.",
          "rug означает «небольшой ковер на части пола». Здесь спрашивают «коврик на полу в ванной»; ответ bath mat.",
          "Не carpet: это «мягкое покрытие для большей части пола». В этом вопросе правильный вариант — bath mat.",
          "Да: bath mat — коврик на полу в ванной. Это ровно то, что описано в задании."
        ],
        "uk": [
          "doormat теж із теми дому, але не означає «a mat on the bathroom floor». Тут правильна відповідь bath mat.",
          "rug теж із теми дому, але не означає «a mat on the bathroom floor». Тут правильна відповідь bath mat.",
          "carpet теж із теми дому, але не означає «a mat on the bathroom floor». Тут правильна відповідь bath mat.",
          "Так: bath mat означає «a mat on the bathroom floor». Тримай у голові просту домашню картинку."
        ],
        "es": [
          "doormat también suena a casa, pero no significa «a mat on the bathroom floor». La respuesta correcta es bath mat.",
          "rug también suena a casa, pero no significa «a mat on the bathroom floor». La respuesta correcta es bath mat.",
          "carpet también suena a casa, pero no significa «a mat on the bathroom floor». La respuesta correcta es bath mat.",
          "Sí: bath mat significa «a mat on the bathroom floor». La imagen de casa ayuda a recordarlo."
        ],
        "pt-BR": [
          "doormat também é do tema casa, mas não significa “a mat on the bathroom floor”. A resposta certa é bath mat.",
          "rug também é do tema casa, mas não significa “a mat on the bathroom floor”. A resposta certa é bath mat.",
          "carpet também é do tema casa, mas não significa “a mat on the bathroom floor”. A resposta certa é bath mat.",
          "Isso: bath mat significa “a mat on the bathroom floor”. Ligue a palavra a uma cena simples da casa."
        ],
        "vi": [
          "doormat cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a mat on the bathroom floor”. Đáp án đúng là bath mat.",
          "rug cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a mat on the bathroom floor”. Đáp án đúng là bath mat.",
          "carpet cũng thuộc chủ đề nhà cửa, nhưng không có nghĩa là “a mat on the bathroom floor”. Đáp án đúng là bath mat.",
          "bath mat nghĩa là “a mat on the bathroom floor”. Hãy gắn từ này với một hình ảnh rõ trong nhà."
        ],
        "id": [
          "doormat masih bertema rumah, tetapi bukan “a mat on the bathroom floor”. Jawaban yang tepat adalah bath mat.",
          "rug masih bertema rumah, tetapi bukan “a mat on the bathroom floor”. Jawaban yang tepat adalah bath mat.",
          "carpet masih bertema rumah, tetapi bukan “a mat on the bathroom floor”. Jawaban yang tepat adalah bath mat.",
          "bath mat berarti “a mat on the bathroom floor”. Bayangkan benda atau ruang itu di rumah."
        ],
        "tr": [
          "doormat ev temasıyla ilgili olabilir, ama “a mat on the bathroom floor” anlamına gelmez. Doğru cevap bath mat.",
          "rug ev temasıyla ilgili olabilir, ama “a mat on the bathroom floor” anlamına gelmez. Doğru cevap bath mat.",
          "carpet ev temasıyla ilgili olabilir, ama “a mat on the bathroom floor” anlamına gelmez. Doğru cevap bath mat.",
          "Evet: bath mat, “a mat on the bathroom floor” demektir. Kelimeyi evdeki net bir görüntüyle bağla."
        ],
        "pl": [
          "doormat też pasuje do tematu domu, ale nie znaczy „a mat on the bathroom floor”. Poprawna odpowiedź to bath mat.",
          "rug też pasuje do tematu domu, ale nie znaczy „a mat on the bathroom floor”. Poprawna odpowiedź to bath mat.",
          "carpet też pasuje do tematu domu, ale nie znaczy „a mat on the bathroom floor”. Poprawna odpowiedź to bath mat.",
          "Tak: bath mat znaczy „a mat on the bathroom floor”. Połącz słowo z prostym obrazem w domu."
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
    "promptPattern": "Interface-language prompt asks which English word matches one concrete home-and-rooms meaning.",
    "explanationPattern": "Every choice gets a short interface-language explanation that names why it matches or misses the tested meaning.",
    "readerRewardPattern": "Every explanation gives a small memory anchor from the visible home scene, such as bed and sleep, door handle and entrance, or clean floor, without forced trick labels.",
    "distractorPattern": "Distractors are same-domain rooms, furniture, room parts, or simple home actions, so they feel plausible while leaving exactly one source-backed answer.",
    "itemCount": 100,
    "generationRulesVersion": "skyler-thematic-generation-checklist-2026-05-26",
    "notes": "Prompts ask for the English answer in the learner interface language; every answer choice has a matching explanation in every active interface locale."
  }
};
