import type { SkylerThematicPack } from './quiz_thematic_packs';

export const KITCHEN_AND_COOKING_SKYLER_PACK: SkylerThematicPack = {
  "schemaVersion": "skyler-quiz-pack-v1",
  "target": "en",
  "categoryId": "kitchen-and-cooking",
  "categoryTitle": "Kitchen and cooking",
  "researchPolicy": {
    "directTranslationUsed": false,
    "notes": "Pilot items were authored from source notes and then adapted per interface locale; no direct translation or existing app quiz-bank reuse was used."
  },
  "socialListening": {
    "status": "validated",
    "signals": [
      {
        "source": "Reddit r/EnglishLearning",
        "text": "A learner asks what simple word or category name to use for kitchen utensils, showing confusion around everyday kitchen object labels.",
        "url": "https://www.reddit.com/r/EnglishLearning/comments/1gpn0hm/words_for_kitchen_utensils/"
      },
      {
        "source": "Reddit r/whatstheword",
        "text": "A user asks for the word for the category of tools or things used in cooking, showing demand for category-level kitchen tool vocabulary.",
        "url": "https://www.reddit.com/r/whatstheword/comments/hghjj5/wtw_for_the_category_of_toolsthings_used_in/"
      }
    ]
  },
  "officialSources": [
    {
      "id": "S1",
      "title": "Cambridge Dictionary: frying pan",
      "url": "https://dictionary.cambridge.org/us/dictionary/english/frying-pan",
      "tier": "A",
      "publisherType": "dictionary_or_academy",
      "usedFor": "Definition and learner-level cross-check for frying pan as an object used for frying food.",
      "limitations": "Specific to frying pan; does not cover the full kitchen vocabulary set.",
      "checkedAt": "2026-05-21"
    },
    {
      "id": "S2",
      "title": "British Council LearnEnglish Teens: Kitchen exercises",
      "url": "https://learnenglishteens.britishcouncil.org/sites/teens/files/kitchen_-_exercises.pdf",
      "tier": "A",
      "publisherType": "official_institution",
      "usedFor": "A1-A2 kitchen object vocabulary and learner-friendly usage prompts for knife, bowl, spoon, fork, cup, plate, and cooker.",
      "limitations": "Basic classroom vocabulary; cooking verb contrasts still require dictionary or ELT cross-checking.",
      "checkedAt": "2026-05-21"
    },
    {
      "id": "S3",
      "title": "Oxford Learner's Dictionaries topic: Cooking and eating",
      "url": "https://www.oxfordlearnersdictionaries.com/us/topic/cooking-and-eating",
      "tier": "B",
      "publisherType": "dictionary_or_academy",
      "usedFor": "Cross-checking cooking/eating vocabulary labels, learner levels, and item-level distractor distinctions.",
      "limitations": "Broad topic page; specific item wording still needs comparison with another source.",
      "checkedAt": "2026-05-21"
    },
    {
      "id": "S4",
      "title": "BBC Learning English Quiznet: Food preparation and cooking",
      "url": "https://downloads.bbc.co.uk/worldservice/learningenglish/quiznet/pdfs/qnet_137_food_cooking_070614.pdf",
      "tier": "B",
      "publisherType": "educational_publisher",
      "usedFor": "Cooking/preparation vocabulary and common learner confusion around knife actions, frying, grilling, and baking.",
      "limitations": "Older educational PDF, so final wording is cross-checked against current dictionary and British Council sources.",
      "checkedAt": "2026-05-21"
    }
  ],
  "claims": [
    {
      "id": "C1",
      "type": "usage_rule",
      "text": "Knife is the correct kitchen word for the object used to cut vegetables or food into smaller pieces in this beginner context.",
      "sourceIds": [
        "S2",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "British Council uses knife for cutting food into smaller pieces; BBC also distinguishes knife-based preparation actions from frying."
    },
    {
      "id": "K1",
      "type": "answer_key",
      "text": "Choice 0, knife, is the only correct answer for kitchen-and-cooking-001.",
      "itemId": "kitchen-and-cooking-001",
      "answerIndex": 0,
      "sourceIds": [
        "S2",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both sources support knife for cutting/preparation, while cup, bowl, and chair are not cutting tools in the tested context."
    },
    {
      "id": "C2",
      "type": "usage_rule",
      "text": "Bowl is the correct kitchen word for the container used for soup or ice cream in this beginner context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "British Council tests bowl for soup or ice cream; Oxford places bowl in the cooking-and-eating vocabulary topic."
    },
    {
      "id": "K2",
      "type": "answer_key",
      "text": "Choice 2, bowl, is the only correct answer for kitchen-and-cooking-002.",
      "itemId": "kitchen-and-cooking-002",
      "answerIndex": 2,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The sources support bowl for the tested container meaning; glass, plate, and knife fit different kitchen uses."
    },
    {
      "id": "C3",
      "type": "usage_rule",
      "text": "Frying pan is the correct kitchen word for a pan used for frying food, such as eggs, in this everyday cooking context.",
      "sourceIds": [
        "S1",
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Cambridge defines frying pan as a pan used for frying food; Oxford lists frying pan in the cooking topic; BBC contrasts frying in a pan with other cooking methods."
    },
    {
      "id": "K3",
      "type": "answer_key",
      "text": "Choice 1, frying pan, is the only correct answer for kitchen-and-cooking-003.",
      "itemId": "kitchen-and-cooking-003",
      "answerIndex": 1,
      "sourceIds": [
        "S1",
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "All cited sources support frying pan for frying food; cupboard, fork, and bowl are plausible kitchen nouns but do not fit the action."
    },
    {
      "id": "C4",
      "type": "usage_rule",
      "text": "Bake is the best verb for making a cake in this cooking sentence.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Oxford lists bake in the cooking topic; BBC explicitly marks bake as correct for a cake and rejects roast, cook, and fry."
    },
    {
      "id": "K4",
      "type": "answer_key",
      "text": "Choice 3, bake, is the only correct answer for kitchen-and-cooking-004.",
      "itemId": "kitchen-and-cooking-004",
      "answerIndex": 3,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The sources support bake for cake; fry, grill, and roast are cooking verbs but do not match the source-backed cake context."
    },
    {
      "id": "C5",
      "type": "usage_rule",
      "text": "Spoon is the correct kitchen word for the object used to eat soup in this beginner context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "British Council includes spoon in the kitchen object set; Oxford lists spoon within cooking-and-eating vocabulary, supporting the object label."
    },
    {
      "id": "K5",
      "type": "answer_key",
      "text": "Choice 0, spoon, is the only correct answer for kitchen-and-cooking-005.",
      "itemId": "kitchen-and-cooking-005",
      "answerIndex": 0,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both sources support spoon as the relevant eating object; knife, cup, and cupboard fit different kitchen meanings."
    },
    {
      "id": "C6",
      "type": "usage_rule",
      "text": "Cup is the correct beginner kitchen word for a small container used for drinking tea in this prompt.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "British Council teaches cup as a kitchen object; Oxford places cup in the cooking-and-eating topic, supporting the drink-container label."
    },
    {
      "id": "K6",
      "type": "answer_key",
      "text": "Choice 2, cup, is the only correct answer for kitchen-and-cooking-006.",
      "itemId": "kitchen-and-cooking-006",
      "answerIndex": 2,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The sources support cup for drinking; fork, cooker, and plate are kitchen words but do not match the tea-container clue."
    },
    {
      "id": "C7",
      "type": "usage_rule",
      "text": "Chop is the correct verb for cutting onions into small pieces in this cooking instruction.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Oxford includes chop in cooking vocabulary; BBC treats chop as a food-preparation verb distinct from cooking methods like fry."
    },
    {
      "id": "K7",
      "type": "answer_key",
      "text": "Choice 1, chop, is the only correct answer for kitchen-and-cooking-007.",
      "itemId": "kitchen-and-cooking-007",
      "answerIndex": 1,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both sources support chop for food preparation; bake, pour, and grill are meaningful cooking words but not the tested onion-cutting action."
    },
    {
      "id": "C8",
      "type": "usage_rule",
      "text": "Grill is the correct verb for cooking steaks under a high heat in this source-backed cooking sentence.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Oxford includes grill in the cooking topic; BBC explicitly supports grilling steaks under a high heat and rejects competing verbs in that context."
    },
    {
      "id": "K8",
      "type": "answer_key",
      "text": "Choice 3, grill, is the only correct answer for kitchen-and-cooking-008.",
      "itemId": "kitchen-and-cooking-008",
      "answerIndex": 3,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited sources support grill for the steak sentence; boil, chop, and bake do not match the source-backed high-heat context."
    },
    {
      "id": "C9",
      "type": "usage_rule",
      "text": "Cook is the correct noun for a person who cooks well, while cooker names a kitchen appliance in this learner contrast.",
      "sourceIds": [
        "S2",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "British Council lists cooker as a kitchen object; BBC supports cook, not cooker, for a person who cooks well."
    },
    {
      "id": "K9",
      "type": "answer_key",
      "text": "Choice 0, cook, is the only correct answer for kitchen-and-cooking-009.",
      "itemId": "kitchen-and-cooking-009",
      "answerIndex": 0,
      "sourceIds": [
        "S2",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The sources separate cook as the person word from cooker as an object; cooking and kitchen do not complete the noun phrase naturally."
    },
    {
      "id": "C10",
      "type": "usage_rule",
      "text": "Fork is the correct kitchen word for the object used to pick up pieces of salad from a plate in this beginner context.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "British Council includes fork in the kitchen object set; Oxford lists fork within cooking-and-eating vocabulary, supporting the object label."
    },
    {
      "id": "K10",
      "type": "answer_key",
      "text": "Choice 2, fork, is the only correct answer for kitchen-and-cooking-010.",
      "itemId": "kitchen-and-cooking-010",
      "answerIndex": 2,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both sources support fork as an eating object; bowl, knife, and cooker fit other kitchen uses but not the salad-from-a-plate clue."
    },
    {
      "id": "C11",
      "type": "usage_rule",
      "text": "Plate is the correct beginner kitchen word for a flat dish used for serving or eating food.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited kitchen vocabulary references support plate as the flat dish, while bowl, glass, and knife name different kitchen objects."
    },
    {
      "id": "K11",
      "type": "answer_key",
      "text": "Choice 0, plate, is the only correct answer for kitchen-and-cooking-011.",
      "itemId": "kitchen-and-cooking-011",
      "answerIndex": 0,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support plate for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C12",
      "type": "usage_rule",
      "text": "Glass is the correct beginner kitchen word for a drinking container such as a water glass.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited kitchen vocabulary references support glass for a drinking container, while cup, plate, and fork serve different table roles."
    },
    {
      "id": "K12",
      "type": "answer_key",
      "text": "Choice 1, glass, is the only correct answer for kitchen-and-cooking-012.",
      "itemId": "kitchen-and-cooking-012",
      "answerIndex": 1,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support glass for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C13",
      "type": "usage_rule",
      "text": "Oven is the correct beginner kitchen word for the appliance used for baking food.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited kitchen vocabulary references support oven for baking, while cooker, fridge, and cupboard have different kitchen functions."
    },
    {
      "id": "K13",
      "type": "answer_key",
      "text": "Choice 2, oven, is the only correct answer for kitchen-and-cooking-013.",
      "itemId": "kitchen-and-cooking-013",
      "answerIndex": 2,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support oven for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C14",
      "type": "usage_rule",
      "text": "Fridge is the correct beginner kitchen word for the appliance that keeps food cold.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited kitchen vocabulary references support fridge for cold food storage, while oven, cupboard, and kettle do not match that function."
    },
    {
      "id": "K14",
      "type": "answer_key",
      "text": "Choice 3, fridge, is the only correct answer for kitchen-and-cooking-014.",
      "itemId": "kitchen-and-cooking-014",
      "answerIndex": 3,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support fridge for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C15",
      "type": "usage_rule",
      "text": "Kettle is the correct kitchen word for the item used to boil water for tea or similar drinks.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited kitchen vocabulary references support kettle for boiling water, while bowl, pan, and fork have different kitchen uses."
    },
    {
      "id": "K15",
      "type": "answer_key",
      "text": "Choice 1, kettle, is the only correct answer for kitchen-and-cooking-015.",
      "itemId": "kitchen-and-cooking-015",
      "answerIndex": 1,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support kettle for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C16",
      "type": "usage_rule",
      "text": "Sink is the correct kitchen word for the basin used for washing dishes or food.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited kitchen vocabulary references support sink for washing, while shelf, towel, and oven do not name the basin."
    },
    {
      "id": "K16",
      "type": "answer_key",
      "text": "Choice 2, sink, is the only correct answer for kitchen-and-cooking-016.",
      "itemId": "kitchen-and-cooking-016",
      "answerIndex": 2,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support sink for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C17",
      "type": "usage_rule",
      "text": "Microwave is the correct kitchen word for the appliance used to heat food quickly.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited kitchen vocabulary references support microwave for quick heating, while toaster, fridge, and kettle refer to different appliances."
    },
    {
      "id": "K17",
      "type": "answer_key",
      "text": "Choice 3, microwave, is the only correct answer for kitchen-and-cooking-017.",
      "itemId": "kitchen-and-cooking-017",
      "answerIndex": 3,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support microwave for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C18",
      "type": "usage_rule",
      "text": "Toaster is the correct kitchen word for the appliance used to toast bread.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited kitchen vocabulary references support toaster for bread toasting, while kettle, oven, and sink have different functions."
    },
    {
      "id": "K18",
      "type": "answer_key",
      "text": "Choice 1, toaster, is the only correct answer for kitchen-and-cooking-018.",
      "itemId": "kitchen-and-cooking-018",
      "answerIndex": 1,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support toaster for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C19",
      "type": "usage_rule",
      "text": "Apron is the correct kitchen word for clothing worn over the front of the body to protect clothes while cooking.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited kitchen vocabulary references support apron for protective cooking clothing, while towel, plate, and fork are different kitchen items."
    },
    {
      "id": "K19",
      "type": "answer_key",
      "text": "Choice 0, apron, is the only correct answer for kitchen-and-cooking-019.",
      "itemId": "kitchen-and-cooking-019",
      "answerIndex": 0,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support apron for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C20",
      "type": "usage_rule",
      "text": "Recipe is the correct cooking word for instructions that tell you how to prepare a dish.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support recipe for cooking instructions, while menu, receipt, and review do not name the instructions for making food."
    },
    {
      "id": "K20",
      "type": "answer_key",
      "text": "Choice 1, recipe, is the only correct answer for kitchen-and-cooking-020.",
      "itemId": "kitchen-and-cooking-020",
      "answerIndex": 1,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support recipe for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C21",
      "type": "usage_rule",
      "text": "Boil is the correct cooking verb for heating water until it reaches boiling point.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support boil for water, while chop, fry, and bake describe different cooking actions."
    },
    {
      "id": "K21",
      "type": "answer_key",
      "text": "Choice 0, boil, is the only correct answer for kitchen-and-cooking-021.",
      "itemId": "kitchen-and-cooking-021",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support boil for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C22",
      "type": "usage_rule",
      "text": "Fry is the correct cooking verb for cooking eggs in hot oil or fat in a pan.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support fry for eggs in a pan, while grill, boil, and pour name different actions."
    },
    {
      "id": "K22",
      "type": "answer_key",
      "text": "Choice 2, fry, is the only correct answer for kitchen-and-cooking-022.",
      "itemId": "kitchen-and-cooking-022",
      "answerIndex": 2,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support fry for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C23",
      "type": "usage_rule",
      "text": "Pour is the correct cooking verb for making a liquid such as milk flow from one container to another.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support pour for liquids, while chop, bake, and stir describe different actions."
    },
    {
      "id": "K23",
      "type": "answer_key",
      "text": "Choice 3, pour, is the only correct answer for kitchen-and-cooking-023.",
      "itemId": "kitchen-and-cooking-023",
      "answerIndex": 3,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support pour for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C24",
      "type": "usage_rule",
      "text": "Stir is the correct cooking verb for moving a spoon or similar tool around in soup to mix it.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support stir for mixing soup, while slice, grill, and freeze describe different actions."
    },
    {
      "id": "K24",
      "type": "answer_key",
      "text": "Choice 1, stir, is the only correct answer for kitchen-and-cooking-024.",
      "itemId": "kitchen-and-cooking-024",
      "answerIndex": 1,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support stir for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C25",
      "type": "usage_rule",
      "text": "Wash is the correct kitchen verb for cleaning dishes with water.",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited kitchen vocabulary references support wash for cleaning dishes, while bake, chop, and boil describe cooking or cutting actions."
    },
    {
      "id": "K25",
      "type": "answer_key",
      "text": "Choice 0, wash, is the only correct answer for kitchen-and-cooking-025.",
      "itemId": "kitchen-and-cooking-025",
      "answerIndex": 0,
      "sourceIds": [
        "S2",
        "S3"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support wash for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C26",
      "type": "usage_rule",
      "text": "Peel is the correct cooking verb for removing the skin from potatoes or similar food.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support peel for removing skins, while pour, stir, and roast describe different kitchen actions."
    },
    {
      "id": "K26",
      "type": "answer_key",
      "text": "Choice 2, peel, is the only correct answer for kitchen-and-cooking-026.",
      "itemId": "kitchen-and-cooking-026",
      "answerIndex": 2,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support peel for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C27",
      "type": "usage_rule",
      "text": "Slice is the correct cooking verb for cutting bread into thin flat pieces.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support slice for cutting into thin pieces, while boil, pour, and grill describe different actions."
    },
    {
      "id": "K27",
      "type": "answer_key",
      "text": "Choice 1, slice, is the only correct answer for kitchen-and-cooking-027.",
      "itemId": "kitchen-and-cooking-027",
      "answerIndex": 1,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support slice for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C28",
      "type": "usage_rule",
      "text": "Roast is the correct cooking verb for cooking chicken with dry heat, often in an oven.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support roast for chicken with dry heat, while chop, fry, and boil are different actions or methods."
    },
    {
      "id": "K28",
      "type": "answer_key",
      "text": "Choice 3, roast, is the only correct answer for kitchen-and-cooking-028.",
      "itemId": "kitchen-and-cooking-028",
      "answerIndex": 3,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support roast for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C29",
      "type": "usage_rule",
      "text": "Mix is the correct cooking verb for putting ingredients together so they become combined.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support mix for combining ingredients, while cup, cut, and fridge do not name that combining action."
    },
    {
      "id": "K29",
      "type": "answer_key",
      "text": "Choice 0, mix, is the only correct answer for kitchen-and-cooking-029.",
      "itemId": "kitchen-and-cooking-029",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support mix for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C30",
      "type": "usage_rule",
      "text": "Serve is the correct cooking and meal word for giving or presenting food to people at the table.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support serve for presenting food, while wash, peel, and boil describe preparation or cleaning actions."
    },
    {
      "id": "K30",
      "type": "answer_key",
      "text": "Choice 2, serve, is the only correct answer for kitchen-and-cooking-030.",
      "itemId": "kitchen-and-cooking-030",
      "answerIndex": 2,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support serve for this item, while the other choices name different kitchen objects or actions."
    },
    {
      "id": "C31",
      "type": "usage_rule",
      "text": "Grate is the correct cooking verb for rubbing cheese against a grater to make small pieces.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support grate for making small pieces with a grater, while slice, boil, and serve describe different actions."
    },
    {
      "id": "K31",
      "type": "answer_key",
      "text": "Choice 1, grate, is the only correct answer for kitchen-and-cooking-031.",
      "itemId": "kitchen-and-cooking-031",
      "answerIndex": 1,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support grate for this item, while the other choices name different recipe or kitchen actions."
    },
    {
      "id": "C32",
      "type": "usage_rule",
      "text": "Drain is the correct cooking verb for removing water from pasta after cooking.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support drain for removing liquid, while stir, bake, and peel describe different kitchen actions."
    },
    {
      "id": "K32",
      "type": "answer_key",
      "text": "Choice 3, drain, is the only correct answer for kitchen-and-cooking-032.",
      "itemId": "kitchen-and-cooking-032",
      "answerIndex": 3,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support drain for this item, while the other choices name different recipe or kitchen actions."
    },
    {
      "id": "C33",
      "type": "usage_rule",
      "text": "Steam is the correct cooking verb for cooking vegetables with hot steam.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support steam for cooking with vapor, while chop, wash, and fry describe cutting, cleaning, or oil cooking."
    },
    {
      "id": "K33",
      "type": "answer_key",
      "text": "Choice 0, steam, is the only correct answer for kitchen-and-cooking-033.",
      "itemId": "kitchen-and-cooking-033",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support steam for this item, while the other choices name different recipe or kitchen actions."
    },
    {
      "id": "C34",
      "type": "usage_rule",
      "text": "Melt is the correct cooking verb for making butter change from solid to liquid with heat.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support melt for changing a solid to liquid, while roast, pour, and freeze describe different processes."
    },
    {
      "id": "K34",
      "type": "answer_key",
      "text": "Choice 2, melt, is the only correct answer for kitchen-and-cooking-034.",
      "itemId": "kitchen-and-cooking-034",
      "answerIndex": 2,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support melt for this item, while the other choices name different recipe or kitchen actions."
    },
    {
      "id": "C35",
      "type": "usage_rule",
      "text": "Season is the correct cooking verb for adding salt, pepper, or spices to soup.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support season for adding flavor, while mix, slice, and boil describe combining, cutting, or heating."
    },
    {
      "id": "K35",
      "type": "answer_key",
      "text": "Choice 1, season, is the only correct answer for kitchen-and-cooking-035.",
      "itemId": "kitchen-and-cooking-035",
      "answerIndex": 1,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support season for this item, while the other choices name different recipe or kitchen actions."
    },
    {
      "id": "C36",
      "type": "usage_rule",
      "text": "Knead is the correct cooking verb for pressing and folding dough by hand.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support knead for working dough, while whisk, serve, and measure describe different recipe actions."
    },
    {
      "id": "K36",
      "type": "answer_key",
      "text": "Choice 3, knead, is the only correct answer for kitchen-and-cooking-036.",
      "itemId": "kitchen-and-cooking-036",
      "answerIndex": 3,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support knead for this item, while the other choices name different recipe or kitchen actions."
    },
    {
      "id": "C37",
      "type": "usage_rule",
      "text": "Whisk is the correct cooking verb for beating eggs quickly with a whisk or similar tool.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support whisk for beating eggs, while drain, grate, and preheat describe removing liquid, shredding, or heating first."
    },
    {
      "id": "K37",
      "type": "answer_key",
      "text": "Choice 0, whisk, is the only correct answer for kitchen-and-cooking-037.",
      "itemId": "kitchen-and-cooking-037",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support whisk for this item, while the other choices name different recipe or kitchen actions."
    },
    {
      "id": "C38",
      "type": "usage_rule",
      "text": "Spread is the correct cooking verb for putting soft butter across toast in a thin layer.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support spread for covering a surface with a soft food, while steam, slice, and roast describe different actions."
    },
    {
      "id": "K38",
      "type": "answer_key",
      "text": "Choice 2, spread, is the only correct answer for kitchen-and-cooking-038.",
      "itemId": "kitchen-and-cooking-038",
      "answerIndex": 2,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support spread for this item, while the other choices name different recipe or kitchen actions."
    },
    {
      "id": "C39",
      "type": "usage_rule",
      "text": "Measure is the correct recipe verb for checking the exact amount of flour before cooking or baking.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support measure for quantities in recipes, while peel, fry, and stir describe preparation or cooking actions."
    },
    {
      "id": "K39",
      "type": "answer_key",
      "text": "Choice 1, measure, is the only correct answer for kitchen-and-cooking-039.",
      "itemId": "kitchen-and-cooking-039",
      "answerIndex": 1,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support measure for this item, while the other choices name different recipe or kitchen actions."
    },
    {
      "id": "C40",
      "type": "usage_rule",
      "text": "Preheat is the correct recipe verb for heating an oven before putting food inside.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The cited cooking references support preheat for heating an oven first, while cool, mix, and serve describe different recipe steps."
    },
    {
      "id": "K40",
      "type": "answer_key",
      "text": "Choice 3, preheat, is the only correct answer for kitchen-and-cooking-040.",
      "itemId": "kitchen-and-cooking-040",
      "answerIndex": 3,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support preheat for this item, while the other choices name different recipe or kitchen actions."
    },
    {
      "id": "C41",
      "type": "usage_rule",
      "text": "cutting board is the correct English kitchen word or phrase for a board used as a safe surface for cutting food.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support cutting board for a board used as a safe surface for cutting food; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K41",
      "type": "answer_key",
      "text": "Choice 1, cutting board, is the only correct answer for kitchen-and-cooking-041.",
      "itemId": "kitchen-and-cooking-041",
      "answerIndex": 1,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of cutting board and rejects the distractors for this item."
    },
    {
      "id": "C42",
      "type": "usage_rule",
      "text": "pot is the correct English kitchen word or phrase for a deep cooking container used on a stove.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support pot for a deep cooking container used on a stove; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K42",
      "type": "answer_key",
      "text": "Choice 1, pot, is the only correct answer for kitchen-and-cooking-042.",
      "itemId": "kitchen-and-cooking-042",
      "answerIndex": 1,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of pot and rejects the distractors for this item."
    },
    {
      "id": "C43",
      "type": "usage_rule",
      "text": "lid is the correct English kitchen word or phrase for the cover for a pot or container.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support lid for the cover for a pot or container; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K43",
      "type": "answer_key",
      "text": "Choice 0, lid, is the only correct answer for kitchen-and-cooking-043.",
      "itemId": "kitchen-and-cooking-043",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of lid and rejects the distractors for this item."
    },
    {
      "id": "C44",
      "type": "usage_rule",
      "text": "spatula is the correct English kitchen word or phrase for a flat tool for lifting or turning food in a pan.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support spatula for a flat tool for lifting or turning food in a pan; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K44",
      "type": "answer_key",
      "text": "Choice 1, spatula, is the only correct answer for kitchen-and-cooking-044.",
      "itemId": "kitchen-and-cooking-044",
      "answerIndex": 1,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of spatula and rejects the distractors for this item."
    },
    {
      "id": "C45",
      "type": "usage_rule",
      "text": "ladle is the correct English kitchen word or phrase for a deep spoon for serving soup or sauce.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support ladle for a deep spoon for serving soup or sauce; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K45",
      "type": "answer_key",
      "text": "Choice 1, ladle, is the only correct answer for kitchen-and-cooking-045.",
      "itemId": "kitchen-and-cooking-045",
      "answerIndex": 1,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of ladle and rejects the distractors for this item."
    },
    {
      "id": "C46",
      "type": "usage_rule",
      "text": "peeler is the correct English kitchen word or phrase for a tool for removing thin skin from vegetables.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support peeler for a tool for removing thin skin from vegetables; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K46",
      "type": "answer_key",
      "text": "Choice 0, peeler, is the only correct answer for kitchen-and-cooking-046.",
      "itemId": "kitchen-and-cooking-046",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of peeler and rejects the distractors for this item."
    },
    {
      "id": "C47",
      "type": "usage_rule",
      "text": "colander is the correct English kitchen word or phrase for a bowl-shaped strainer for draining pasta or vegetables.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support colander for a bowl-shaped strainer for draining pasta or vegetables; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K47",
      "type": "answer_key",
      "text": "Choice 1, colander, is the only correct answer for kitchen-and-cooking-047.",
      "itemId": "kitchen-and-cooking-047",
      "answerIndex": 1,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of colander and rejects the distractors for this item."
    },
    {
      "id": "C48",
      "type": "usage_rule",
      "text": "rolling pin is the correct English kitchen word or phrase for a cylinder used to roll dough flat.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support rolling pin for a cylinder used to roll dough flat; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K48",
      "type": "answer_key",
      "text": "Choice 0, rolling pin, is the only correct answer for kitchen-and-cooking-048.",
      "itemId": "kitchen-and-cooking-048",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of rolling pin and rejects the distractors for this item."
    },
    {
      "id": "C49",
      "type": "usage_rule",
      "text": "baking tray is the correct English kitchen word or phrase for a flat tray used for baking in an oven.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support baking tray for a flat tray used for baking in an oven; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K49",
      "type": "answer_key",
      "text": "Choice 2, baking tray, is the only correct answer for kitchen-and-cooking-049.",
      "itemId": "kitchen-and-cooking-049",
      "answerIndex": 2,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of baking tray and rejects the distractors for this item."
    },
    {
      "id": "C50",
      "type": "usage_rule",
      "text": "blender is the correct English kitchen word or phrase for an appliance that blends food into smoothies, puree, or sauce.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support blender for an appliance that blends food into smoothies, puree, or sauce; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K50",
      "type": "answer_key",
      "text": "Choice 0, blender, is the only correct answer for kitchen-and-cooking-050.",
      "itemId": "kitchen-and-cooking-050",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of blender and rejects the distractors for this item."
    },
    {
      "id": "C51",
      "type": "usage_rule",
      "text": "sieve is the correct English kitchen word or phrase for a fine mesh tool for sifting flour.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support sieve for a fine mesh tool for sifting flour; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K51",
      "type": "answer_key",
      "text": "Choice 0, sieve, is the only correct answer for kitchen-and-cooking-051.",
      "itemId": "kitchen-and-cooking-051",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of sieve and rejects the distractors for this item."
    },
    {
      "id": "C52",
      "type": "usage_rule",
      "text": "jar is the correct English kitchen word or phrase for a storage jar for jam, sauce, spices, or grains.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support jar for a storage jar for jam, sauce, spices, or grains; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K52",
      "type": "answer_key",
      "text": "Choice 0, jar, is the only correct answer for kitchen-and-cooking-052.",
      "itemId": "kitchen-and-cooking-052",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of jar and rejects the distractors for this item."
    },
    {
      "id": "C53",
      "type": "usage_rule",
      "text": "mug is the correct English kitchen word or phrase for a large cup with a handle.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support mug for a large cup with a handle; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K53",
      "type": "answer_key",
      "text": "Choice 0, mug, is the only correct answer for kitchen-and-cooking-053.",
      "itemId": "kitchen-and-cooking-053",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of mug and rejects the distractors for this item."
    },
    {
      "id": "C54",
      "type": "usage_rule",
      "text": "scale is the correct English kitchen word or phrase for a kitchen scale for weighing ingredients.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support scale for a kitchen scale for weighing ingredients; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K54",
      "type": "answer_key",
      "text": "Choice 1, scale, is the only correct answer for kitchen-and-cooking-054.",
      "itemId": "kitchen-and-cooking-054",
      "answerIndex": 1,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of scale and rejects the distractors for this item."
    },
    {
      "id": "C55",
      "type": "usage_rule",
      "text": "timer is the correct English kitchen word or phrase for a timer that counts cooking minutes.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support timer for a timer that counts cooking minutes; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K55",
      "type": "answer_key",
      "text": "Choice 2, timer, is the only correct answer for kitchen-and-cooking-055.",
      "itemId": "kitchen-and-cooking-055",
      "answerIndex": 2,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of timer and rejects the distractors for this item."
    },
    {
      "id": "C56",
      "type": "usage_rule",
      "text": "napkin is the correct English kitchen word or phrase for a napkin for wiping hands or mouth at the table.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support napkin for a napkin for wiping hands or mouth at the table; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K56",
      "type": "answer_key",
      "text": "Choice 0, napkin, is the only correct answer for kitchen-and-cooking-056.",
      "itemId": "kitchen-and-cooking-056",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of napkin and rejects the distractors for this item."
    },
    {
      "id": "C57",
      "type": "usage_rule",
      "text": "combine is the correct English kitchen or recipe verb for combine ingredients.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support combine for combine ingredients; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K57",
      "type": "answer_key",
      "text": "Choice 0, combine, is the only correct answer for kitchen-and-cooking-057.",
      "itemId": "kitchen-and-cooking-057",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of combine and rejects the distractors for this item."
    },
    {
      "id": "C58",
      "type": "usage_rule",
      "text": "sprinkle is the correct English kitchen or recipe verb for sprinkle with sugar.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support sprinkle for sprinkle with sugar; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K58",
      "type": "answer_key",
      "text": "Choice 2, sprinkle, is the only correct answer for kitchen-and-cooking-058.",
      "itemId": "kitchen-and-cooking-058",
      "answerIndex": 2,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of sprinkle and rejects the distractors for this item."
    },
    {
      "id": "C59",
      "type": "usage_rule",
      "text": "simmer is the correct English kitchen or recipe verb for simmer sauce over low heat.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support simmer for simmer sauce over low heat; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K59",
      "type": "answer_key",
      "text": "Choice 2, simmer, is the only correct answer for kitchen-and-cooking-059.",
      "itemId": "kitchen-and-cooking-059",
      "answerIndex": 2,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of simmer and rejects the distractors for this item."
    },
    {
      "id": "C60",
      "type": "usage_rule",
      "text": "marinate is the correct English kitchen or recipe verb for marinate meat.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support marinate for marinate meat; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K60",
      "type": "answer_key",
      "text": "Choice 1, marinate, is the only correct answer for kitchen-and-cooking-060.",
      "itemId": "kitchen-and-cooking-060",
      "answerIndex": 1,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of marinate and rejects the distractors for this item."
    },
    {
      "id": "C61",
      "type": "usage_rule",
      "text": "teaspoon is the correct English kitchen word or phrase for a small spoon used for tea, sugar, or small spice amounts.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support teaspoon for a small spoon used for tea, sugar, or small spice amounts; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K61",
      "type": "answer_key",
      "text": "Choice 0, teaspoon, is the only correct answer for kitchen-and-cooking-061.",
      "itemId": "kitchen-and-cooking-061",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of teaspoon and rejects the distractors for this item."
    },
    {
      "id": "C62",
      "type": "usage_rule",
      "text": "tablespoon is the correct English kitchen word or phrase for a large spoon used as a recipe measure.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support tablespoon for a large spoon used as a recipe measure; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K62",
      "type": "answer_key",
      "text": "Choice 1, tablespoon, is the only correct answer for kitchen-and-cooking-062.",
      "itemId": "kitchen-and-cooking-062",
      "answerIndex": 1,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of tablespoon and rejects the distractors for this item."
    },
    {
      "id": "C63",
      "type": "usage_rule",
      "text": "tongs is the correct English kitchen word or phrase for kitchen tongs for gripping hot or slippery food.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support tongs for kitchen tongs for gripping hot or slippery food; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K63",
      "type": "answer_key",
      "text": "Choice 0, tongs, is the only correct answer for kitchen-and-cooking-063.",
      "itemId": "kitchen-and-cooking-063",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of tongs and rejects the distractors for this item."
    },
    {
      "id": "C64",
      "type": "usage_rule",
      "text": "grater is the correct English kitchen word or phrase for a grater for shredding cheese or vegetables.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support grater for a grater for shredding cheese or vegetables; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K64",
      "type": "answer_key",
      "text": "Choice 0, grater, is the only correct answer for kitchen-and-cooking-064.",
      "itemId": "kitchen-and-cooking-064",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of grater and rejects the distractors for this item."
    },
    {
      "id": "C65",
      "type": "usage_rule",
      "text": "masher is the correct English kitchen word or phrase for a masher used to make potatoes into mash.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support masher for a masher used to make potatoes into mash; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K65",
      "type": "answer_key",
      "text": "Choice 0, masher, is the only correct answer for kitchen-and-cooking-065.",
      "itemId": "kitchen-and-cooking-065",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of masher and rejects the distractors for this item."
    },
    {
      "id": "C66",
      "type": "usage_rule",
      "text": "measuring cup is the correct English kitchen word or phrase for a measuring cup for recipe amounts.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support measuring cup for a measuring cup for recipe amounts; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K66",
      "type": "answer_key",
      "text": "Choice 1, measuring cup, is the only correct answer for kitchen-and-cooking-066.",
      "itemId": "kitchen-and-cooking-066",
      "answerIndex": 1,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of measuring cup and rejects the distractors for this item."
    },
    {
      "id": "C67",
      "type": "usage_rule",
      "text": "oven mitt is the correct English kitchen word or phrase for a padded glove for holding hot oven trays.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support oven mitt for a padded glove for holding hot oven trays; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K67",
      "type": "answer_key",
      "text": "Choice 0, oven mitt, is the only correct answer for kitchen-and-cooking-067.",
      "itemId": "kitchen-and-cooking-067",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of oven mitt and rejects the distractors for this item."
    },
    {
      "id": "C68",
      "type": "usage_rule",
      "text": "pitcher is the correct English kitchen word or phrase for a pitcher for serving water, juice, or tea.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support pitcher for a pitcher for serving water, juice, or tea; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K68",
      "type": "answer_key",
      "text": "Choice 0, pitcher, is the only correct answer for kitchen-and-cooking-068.",
      "itemId": "kitchen-and-cooking-068",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of pitcher and rejects the distractors for this item."
    },
    {
      "id": "C69",
      "type": "usage_rule",
      "text": "corkscrew is the correct English kitchen word or phrase for a corkscrew for pulling a cork from a bottle.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support corkscrew for a corkscrew for pulling a cork from a bottle; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K69",
      "type": "answer_key",
      "text": "Choice 1, corkscrew, is the only correct answer for kitchen-and-cooking-069.",
      "itemId": "kitchen-and-cooking-069",
      "answerIndex": 1,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of corkscrew and rejects the distractors for this item."
    },
    {
      "id": "C70",
      "type": "usage_rule",
      "text": "jar opener is the correct English kitchen word or phrase for a tool for opening tight jar lids.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support jar opener for a tool for opening tight jar lids; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K70",
      "type": "answer_key",
      "text": "Choice 0, jar opener, is the only correct answer for kitchen-and-cooking-070.",
      "itemId": "kitchen-and-cooking-070",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of jar opener and rejects the distractors for this item."
    },
    {
      "id": "C71",
      "type": "usage_rule",
      "text": "garlic press is the correct English kitchen word or phrase for a tool that crushes a garlic clove into tiny pieces.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support garlic press for a tool that crushes a garlic clove into tiny pieces; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K71",
      "type": "answer_key",
      "text": "Choice 0, garlic press, is the only correct answer for kitchen-and-cooking-071.",
      "itemId": "kitchen-and-cooking-071",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of garlic press and rejects the distractors for this item."
    },
    {
      "id": "C72",
      "type": "usage_rule",
      "text": "zester is the correct English kitchen word or phrase for a tool for removing thin citrus zest.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support zester for a tool for removing thin citrus zest; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K72",
      "type": "answer_key",
      "text": "Choice 0, zester, is the only correct answer for kitchen-and-cooking-072.",
      "itemId": "kitchen-and-cooking-072",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of zester and rejects the distractors for this item."
    },
    {
      "id": "C73",
      "type": "usage_rule",
      "text": "pantry is the correct English kitchen word or phrase for a pantry where dry food supplies are stored.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support pantry for a pantry where dry food supplies are stored; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K73",
      "type": "answer_key",
      "text": "Choice 0, pantry, is the only correct answer for kitchen-and-cooking-073.",
      "itemId": "kitchen-and-cooking-073",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of pantry and rejects the distractors for this item."
    },
    {
      "id": "C74",
      "type": "usage_rule",
      "text": "countertop is the correct English kitchen word or phrase for a kitchen countertop work surface.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support countertop for a kitchen countertop work surface; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K74",
      "type": "answer_key",
      "text": "Choice 1, countertop, is the only correct answer for kitchen-and-cooking-074.",
      "itemId": "kitchen-and-cooking-074",
      "answerIndex": 1,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of countertop and rejects the distractors for this item."
    },
    {
      "id": "C75",
      "type": "usage_rule",
      "text": "freezer is the correct English kitchen word or phrase for a freezer for keeping food frozen.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support freezer for a freezer for keeping food frozen; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K75",
      "type": "answer_key",
      "text": "Choice 0, freezer, is the only correct answer for kitchen-and-cooking-075.",
      "itemId": "kitchen-and-cooking-075",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of freezer and rejects the distractors for this item."
    },
    {
      "id": "C76",
      "type": "usage_rule",
      "text": "dishwasher is the correct English kitchen word or phrase for a dishwasher machine that washes dishes automatically.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support dishwasher for a dishwasher machine that washes dishes automatically; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K76",
      "type": "answer_key",
      "text": "Choice 0, dishwasher, is the only correct answer for kitchen-and-cooking-076.",
      "itemId": "kitchen-and-cooking-076",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of dishwasher and rejects the distractors for this item."
    },
    {
      "id": "C77",
      "type": "usage_rule",
      "text": "dish rack is the correct English kitchen word or phrase for a rack where washed dishes dry.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support dish rack for a rack where washed dishes dry; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K77",
      "type": "answer_key",
      "text": "Choice 0, dish rack, is the only correct answer for kitchen-and-cooking-077.",
      "itemId": "kitchen-and-cooking-077",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of dish rack and rejects the distractors for this item."
    },
    {
      "id": "C78",
      "type": "usage_rule",
      "text": "sponge is the correct English kitchen word or phrase for a sponge used for washing dishes.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support sponge for a sponge used for washing dishes; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K78",
      "type": "answer_key",
      "text": "Choice 0, sponge, is the only correct answer for kitchen-and-cooking-078.",
      "itemId": "kitchen-and-cooking-078",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of sponge and rejects the distractors for this item."
    },
    {
      "id": "C79",
      "type": "usage_rule",
      "text": "dish soap is the correct English kitchen word or phrase for soap used for washing dishes.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support dish soap for soap used for washing dishes; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K79",
      "type": "answer_key",
      "text": "Choice 0, dish soap, is the only correct answer for kitchen-and-cooking-079.",
      "itemId": "kitchen-and-cooking-079",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of dish soap and rejects the distractors for this item."
    },
    {
      "id": "C80",
      "type": "usage_rule",
      "text": "rinse is the correct English kitchen or recipe verb for rinse dishes.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support rinse for rinse dishes; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K80",
      "type": "answer_key",
      "text": "Choice 0, rinse, is the only correct answer for kitchen-and-cooking-080.",
      "itemId": "kitchen-and-cooking-080",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of rinse and rejects the distractors for this item."
    },
    {
      "id": "C81",
      "type": "usage_rule",
      "text": "scrub is the correct English kitchen or recipe verb for scrub a dirty pan.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support scrub for scrub a dirty pan; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K81",
      "type": "answer_key",
      "text": "Choice 0, scrub, is the only correct answer for kitchen-and-cooking-081.",
      "itemId": "kitchen-and-cooking-081",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of scrub and rejects the distractors for this item."
    },
    {
      "id": "C82",
      "type": "usage_rule",
      "text": "thaw is the correct English kitchen or recipe verb for thaw meat.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support thaw for thaw meat; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K82",
      "type": "answer_key",
      "text": "Choice 2, thaw, is the only correct answer for kitchen-and-cooking-082.",
      "itemId": "kitchen-and-cooking-082",
      "answerIndex": 2,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of thaw and rejects the distractors for this item."
    },
    {
      "id": "C83",
      "type": "usage_rule",
      "text": "dice is the correct English kitchen or recipe verb for dice a carrot.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support dice for dice a carrot; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K83",
      "type": "answer_key",
      "text": "Choice 0, dice, is the only correct answer for kitchen-and-cooking-083.",
      "itemId": "kitchen-and-cooking-083",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of dice and rejects the distractors for this item."
    },
    {
      "id": "C84",
      "type": "usage_rule",
      "text": "mince is the correct English kitchen or recipe verb for mince garlic.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support mince for mince garlic; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K84",
      "type": "answer_key",
      "text": "Choice 0, mince, is the only correct answer for kitchen-and-cooking-084.",
      "itemId": "kitchen-and-cooking-084",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of mince and rejects the distractors for this item."
    },
    {
      "id": "C85",
      "type": "usage_rule",
      "text": "garnish is the correct English kitchen or recipe verb for garnish a dish with herbs.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support garnish for garnish a dish with herbs; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K85",
      "type": "answer_key",
      "text": "Choice 0, garnish, is the only correct answer for kitchen-and-cooking-085.",
      "itemId": "kitchen-and-cooking-085",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of garnish and rejects the distractors for this item."
    },
    {
      "id": "C86",
      "type": "usage_rule",
      "text": "toss is the correct English kitchen or recipe verb for toss a salad.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support toss for toss a salad; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K86",
      "type": "answer_key",
      "text": "Choice 0, toss, is the only correct answer for kitchen-and-cooking-086.",
      "itemId": "kitchen-and-cooking-086",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of toss and rejects the distractors for this item."
    },
    {
      "id": "C87",
      "type": "usage_rule",
      "text": "flip is the correct English kitchen or recipe verb for flip a pancake.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support flip for flip a pancake; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K87",
      "type": "answer_key",
      "text": "Choice 0, flip, is the only correct answer for kitchen-and-cooking-087.",
      "itemId": "kitchen-and-cooking-087",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of flip and rejects the distractors for this item."
    },
    {
      "id": "C88",
      "type": "usage_rule",
      "text": "crumble is the correct English kitchen or recipe verb for crumble cheese.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support crumble for crumble cheese; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K88",
      "type": "answer_key",
      "text": "Choice 0, crumble, is the only correct answer for kitchen-and-cooking-088.",
      "itemId": "kitchen-and-cooking-088",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of crumble and rejects the distractors for this item."
    },
    {
      "id": "C89",
      "type": "usage_rule",
      "text": "carve is the correct English kitchen or recipe verb for carve roasted turkey.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support carve for carve roasted turkey; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K89",
      "type": "answer_key",
      "text": "Choice 0, carve, is the only correct answer for kitchen-and-cooking-089.",
      "itemId": "kitchen-and-cooking-089",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of carve and rejects the distractors for this item."
    },
    {
      "id": "C90",
      "type": "usage_rule",
      "text": "broil is the correct English kitchen or recipe verb for cook under strong top heat.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support broil for cook under strong top heat; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K90",
      "type": "answer_key",
      "text": "Choice 0, broil, is the only correct answer for kitchen-and-cooking-090.",
      "itemId": "kitchen-and-cooking-090",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of broil and rejects the distractors for this item."
    },
    {
      "id": "C91",
      "type": "usage_rule",
      "text": "can opener is the correct English kitchen word or phrase for a tool for opening metal food cans.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support can opener for a tool for opening metal food cans; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K91",
      "type": "answer_key",
      "text": "Choice 0, can opener, is the only correct answer for kitchen-and-cooking-091.",
      "itemId": "kitchen-and-cooking-091",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of can opener and rejects the distractors for this item."
    },
    {
      "id": "C92",
      "type": "usage_rule",
      "text": "bottle opener is the correct English kitchen word or phrase for a tool for removing a metal bottle cap.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support bottle opener for a tool for removing a metal bottle cap; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K92",
      "type": "answer_key",
      "text": "Choice 0, bottle opener, is the only correct answer for kitchen-and-cooking-092.",
      "itemId": "kitchen-and-cooking-092",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of bottle opener and rejects the distractors for this item."
    },
    {
      "id": "C93",
      "type": "usage_rule",
      "text": "food processor is the correct English kitchen word or phrase for a food processor that chops, shreds, or mixes with attachments.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support food processor for a food processor that chops, shreds, or mixes with attachments; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K93",
      "type": "answer_key",
      "text": "Choice 0, food processor, is the only correct answer for kitchen-and-cooking-093.",
      "itemId": "kitchen-and-cooking-093",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of food processor and rejects the distractors for this item."
    },
    {
      "id": "C94",
      "type": "usage_rule",
      "text": "saucepan is the correct English kitchen word or phrase for a small deep pan with a long handle for sauce or milk.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support saucepan for a small deep pan with a long handle for sauce or milk; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K94",
      "type": "answer_key",
      "text": "Choice 0, saucepan, is the only correct answer for kitchen-and-cooking-094.",
      "itemId": "kitchen-and-cooking-094",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of saucepan and rejects the distractors for this item."
    },
    {
      "id": "C95",
      "type": "usage_rule",
      "text": "wok is the correct English kitchen word or phrase for a deep round pan used for quick high-heat stir-frying.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support wok for a deep round pan used for quick high-heat stir-frying; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K95",
      "type": "answer_key",
      "text": "Choice 0, wok, is the only correct answer for kitchen-and-cooking-095.",
      "itemId": "kitchen-and-cooking-095",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of wok and rejects the distractors for this item."
    },
    {
      "id": "C96",
      "type": "usage_rule",
      "text": "casserole dish is the correct English kitchen word or phrase for a dish used for baking a casserole in the oven.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support casserole dish for a dish used for baking a casserole in the oven; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K96",
      "type": "answer_key",
      "text": "Choice 0, casserole dish, is the only correct answer for kitchen-and-cooking-096.",
      "itemId": "kitchen-and-cooking-096",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of casserole dish and rejects the distractors for this item."
    },
    {
      "id": "C97",
      "type": "usage_rule",
      "text": "sauté is the correct English kitchen or recipe verb for sauté vegetables in a pan.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support sauté for sauté vegetables in a pan; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K97",
      "type": "answer_key",
      "text": "Choice 0, sauté, is the only correct answer for kitchen-and-cooking-097.",
      "itemId": "kitchen-and-cooking-097",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of sauté and rejects the distractors for this item."
    },
    {
      "id": "C98",
      "type": "usage_rule",
      "text": "blanch is the correct English kitchen or recipe verb for blanch vegetables.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support blanch for blanch vegetables; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K98",
      "type": "answer_key",
      "text": "Choice 0, blanch, is the only correct answer for kitchen-and-cooking-098.",
      "itemId": "kitchen-and-cooking-098",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of blanch and rejects the distractors for this item."
    },
    {
      "id": "C99",
      "type": "usage_rule",
      "text": "strain is the correct English kitchen or recipe verb for strain sauce.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support strain for strain sauce; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K99",
      "type": "answer_key",
      "text": "Choice 0, strain, is the only correct answer for kitchen-and-cooking-099.",
      "itemId": "kitchen-and-cooking-099",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of strain and rejects the distractors for this item."
    },
    {
      "id": "C100",
      "type": "usage_rule",
      "text": "fold is the correct English kitchen or recipe verb for fold egg whites into batter.",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "Both cited sources support fold for fold egg whites into batter; the distractors name different kitchen objects, tools, or actions."
    },
    {
      "id": "K100",
      "type": "answer_key",
      "text": "Choice 0, fold, is the only correct answer for kitchen-and-cooking-100.",
      "itemId": "kitchen-and-cooking-100",
      "answerIndex": 0,
      "sourceIds": [
        "S3",
        "S4"
      ],
      "verificationStatus": "verified",
      "sourceComparison": "The answer key aligns with the supported meaning of fold and rejects the distractors for this item."
    }
  ],
  "localeReviews": [
    {
      "locale": "ru",
      "method": "research_adapted",
      "reviewer": "Skyler Russian Locale Editor",
      "notes": "Russian explanations keep the learner focus on object function and avoid literal dictionary translation of every kitchen noun.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S2",
        "S3",
        "S4"
      ]
    },
    {
      "locale": "uk",
      "method": "research_adapted",
      "reviewer": "Skyler Ukrainian Locale Editor",
      "notes": "Ukrainian copy uses natural classroom wording for tool use, container use, and cooking verbs instead of copying Russian phrasing.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S2",
        "S3",
        "S4"
      ]
    },
    {
      "locale": "es",
      "method": "research_adapted",
      "reviewer": "Skyler Spanish Locale Editor",
      "notes": "Spanish explanations are adapted for beginner learners, with emphasis on function and contrast rather than word-for-word English glosses.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S2",
        "S3",
        "S4"
      ]
    },
    {
      "locale": "pt-BR",
      "method": "research_adapted",
      "reviewer": "Skyler Brazilian Portuguese Locale Editor",
      "notes": "Brazilian Portuguese review keeps concise app-style feedback and explains why each distractor belongs to a different kitchen situation.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S2",
        "S3",
        "S4"
      ]
    },
    {
      "locale": "vi",
      "method": "research_adapted",
      "reviewer": "Skyler Vietnamese Locale Editor",
      "notes": "Vietnamese notes adapt the source contrasts into simple functional clues so learners can separate tools, containers, and cooking actions.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S2",
        "S3",
        "S4"
      ]
    },
    {
      "locale": "id",
      "method": "research_adapted",
      "reviewer": "Skyler Indonesian Locale Editor",
      "notes": "Indonesian explanations use practical kitchen scenarios and keep the English answer visible without turning feedback into direct translation.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S2",
        "S3",
        "S4"
      ]
    },
    {
      "locale": "tr",
      "method": "research_adapted",
      "reviewer": "Skyler Turkish Locale Editor",
      "notes": "Turkish feedback separates meaning by use case, helping learners choose the English kitchen word from context rather than memorized pairs.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S2",
        "S3",
        "S4"
      ]
    },
    {
      "locale": "pl",
      "method": "research_adapted",
      "reviewer": "Skyler Polish Locale Editor",
      "notes": "Polish review keeps short, concrete explanations and flags distractors as different object types or cooking methods.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": [
        "S1",
        "S2",
        "S3",
        "S4"
      ]
    }
  ],
  "items": [
    {
      "id": "kitchen-and-cooking-001",
      "type": "mcq",
      "prompt": "How do you say “нож” in English?",
      "localizedPrompts": {
        "ru": "Как по-английски «нож»?",
        "uk": "Як англійською «ніж»?",
        "es": "¿Cómo se dice “cuchillo” en inglés?",
        "pt-BR": "Como se diz “faca” em inglês?",
        "vi": "“Con dao” nói bằng tiếng Anh là gì?",
        "id": "Apa bahasa Inggrisnya “pisau”?",
        "tr": "“Bıçak” İngilizce nasıl söylenir?",
        "pl": "Jak powiedzieć „nóż” po angielsku?"
      },
      "choices": [
        "knife",
        "cup",
        "bowl",
        "chair"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the right kitchen object for cutting food.",
      "skillTag": "kitchen_object_labels",
      "sourceIds": [
        "S2",
        "S4"
      ],
      "claimIds": [
        "C1",
        "K1"
      ],
      "choiceRationales": [
        "Knife is correct because the tested action is cutting food into smaller pieces.",
        "Cup is a drink container, so it does not match the cutting action.",
        "Bowl is a container for food such as soup, not a cutting tool.",
        "Chair belongs near a table, but it is furniture rather than a kitchen cutting object."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! Knife — нож: кухонный предмет для резки. Короткое слово, острый смысл, никаких лишних приключений.",
          "Cup — чашка для напитков. Чай туда можно, а слово «нож» нет: для ножа нужен knife.",
          "Bowl — миска. Она держит суп или салат, но ножом не становится; «нож» по-английски — knife.",
          "Chair — стул. Он полезен, если ты устал готовить, но слово «нож» переводится как knife."
        ],
        "uk": [
          "Бінго! Knife — це ніж. На кухні він не просто блищить металом, а перетворює овочі на акуратні шматочки.",
          "Cup потрібна для чаю чи кави, а не для моркви на дошці. Запам’ятай пару: cup тримає напій, knife робить шматочки.",
          "Bowl з’являється вже після нарізання: туди можна висипати овочі. Але сам момент «розрізати» робить knife.",
          "Chair рятує втомлені ноги, але овочі не переможе. Якщо мова про різання, на кухонну сцену виходить knife."
        ],
        "es": [
          "Bien. Knife es el cuchillo. En la escena de cocina no solo brilla: convierte verduras en trozos útiles.",
          "Cup sirve para té o café, no para la zanahoria en la tabla. Bebida en cup; corte con knife.",
          "Bowl llega después: ahí caen los trozos ya cortados. La acción de cortar la hace knife.",
          "Chair ayuda a sentarse, no a cortar verduras. Si hay corte en la cocina, el héroe es knife."
        ],
        "pt-BR": [
          "Isso. Knife é a faca. Na cozinha ela não só brilha: transforma legumes em pedaços prontos para usar.",
          "Cup segura chá ou café, não cenoura na tábua. Bebida vai em cup; corte pede knife.",
          "Bowl entra depois: recebe os pedaços já cortados. Quem faz o corte é knife.",
          "Chair ajuda você a sentar, mas não corta legumes. Se tem corte na cozinha, quem aparece é knife."
        ],
        "vi": [
          "Đúng. Knife là con dao. Trong bếp, nó không chỉ sáng bóng mà biến rau củ thành miếng gọn gàng.",
          "Cup dành cho trà hoặc cà phê, không dành cho củ cà rốt trên thớt. Đồ uống dùng cup; cắt thì cần knife.",
          "Bowl xuất hiện sau khi cắt: nó nhận phần rau đã thái. Việc cắt là của knife.",
          "Chair giúp ngồi nghỉ, không xử lý rau củ. Nếu có hành động cắt trong bếp, nhân vật chính là knife."
        ],
        "id": [
          "Benar. Knife adalah pisau. Di dapur, benda ini bukan pajangan; ia mengubah sayur menjadi potongan rapi.",
          "Cup untuk teh atau kopi, bukan wortel di talenan. Minuman masuk cup; urusan potong perlu knife.",
          "Bowl muncul setelah sayur dipotong: ia menampung hasilnya. Yang melakukan potongan tetap knife.",
          "Chair membantu duduk, bukan memotong sayur. Kalau aksinya memotong di dapur, jawabannya knife."
        ],
        "tr": [
          "Doğru. Knife bıçaktır. Mutfakta sadece parlamaz; sebzeyi düzgün parçalara ayırır.",
          "Cup çay ve kahve içindir; tahtadaki havuç için değil. İçecek cup, kesme işi knife ister.",
          "Bowl kesmeden sonra gelir: doğranmış parçaları toplar. Kesme anının aracı knife.",
          "Chair oturmak için işe yarar, sebze kesmez. Mutfakta kesme varsa sahneye knife çıkar."
        ],
        "pl": [
          "Dobrze. Knife to nóż. W kuchni nie tylko błyszczy, lecz robi z warzyw równe kawałki.",
          "Cup trzyma herbatę lub kawę, nie marchewkę na desce. Napój idzie do cup; krojenie potrzebuje knife.",
          "Bowl pojawia się po krojeniu: zbiera gotowe kawałki. Samo krojenie robi knife.",
          "Chair pomaga usiąść, ale warzyw nie pokroi. Gdy w kuchni jest krojenie, na scenę wchodzi knife."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-002",
      "type": "mcq",
      "prompt": "How do you say “миска” in English?",
      "localizedPrompts": {
        "ru": "Как по-английски «миска»?",
        "uk": "Як англійською «миска»?",
        "es": "¿Cómo se dice “cuenco” en inglés?",
        "pt-BR": "Como se diz “tigela” em inglês?",
        "vi": "“Cái bát” nói bằng tiếng Anh là gì?",
        "id": "Apa bahasa Inggrisnya “mangkuk”?",
        "tr": "“Kase” İngilizce nasıl söylenir?",
        "pl": "Jak powiedzieć „miska” po angielsku?"
      },
      "choices": [
        "glass",
        "plate",
        "bowl",
        "knife"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose the right container for soup or ice cream.",
      "skillTag": "kitchen_object_labels",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C2",
        "K2"
      ],
      "choiceRationales": [
        "Glass is plausible in a kitchen, but it is mainly for drinks in this beginner set.",
        "Plate is used for food, but the prompt points to a deeper container for soup or ice cream.",
        "Bowl is correct because the source-backed context uses it for soup or ice cream.",
        "Knife is a cutting object, so it does not match the container clue."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Glass — стакан для напитков. Миска глубже и живёт в мире супа, каши и салата: это bowl.",
          "Plate — тарелка, обычно плоская. Если еде нужны бортики повыше, это уже не plate, а bowl.",
          "Бинго! Bowl — миска: глубокая посуда для супа, каши или салата. Главное в слове — глубина.",
          "Knife — нож. Он режет еду, но не держит суп; слово «миска» по-английски — bowl."
        ],
        "uk": [
          "Glass тримає напій. Якщо їжа рідка, але її їдять ложкою, це вже не glass, а bowl.",
          "Plate пласка: суп на ній одразу тікає. Усе, що любить глибину — суп, пластівці, морозиво — проситься в bowl.",
          "Бінго! Bowl — миска, маленька «ямка» для їжі. Запам’ятай: якщо їжа сидить усередині, а не лежить зверху, це bowl.",
          "Knife допомагає готувати їжу, але не тримає її. Для миски думай не про дію, а про форму: глибокий посуд — bowl."
        ],
        "es": [
          "Glass guarda una bebida. Si es comida líquida y se toma con cuchara, ya no es glass; es bowl.",
          "Plate es plano: la sopa se escaparía. Lo que necesita profundidad — sopa, cereal, helado — va en bowl.",
          "Bien. Bowl es una pequeña “cueva” para comida. Si la comida queda dentro y no encima, piensa en bowl.",
          "Knife prepara comida, pero no la contiene. Para “miska”, piensa en forma: recipiente profundo, bowl."
        ],
        "pt-BR": [
          "Glass segura bebida. Se é comida líquida e vai com colher, já não é glass; é bowl.",
          "Plate é raso: a sopa fugiria. O que precisa de profundidade — sopa, cereal, sorvete — vai em bowl.",
          "Certo. Bowl é uma pequena “cova” para comida. Se a comida fica dentro, não em cima, pense em bowl.",
          "Knife ajuda a preparar comida, mas não a segura. Para tigela, pense na forma: recipiente fundo, bowl."
        ],
        "vi": [
          "Glass đựng đồ uống. Nếu là món lỏng nhưng ăn bằng thìa, đó không còn là glass mà là bowl.",
          "Plate phẳng nên súp rất dễ “chạy trốn”. Món cần lòng sâu — súp, ngũ cốc, kem — hợp với bowl.",
          "Đúng. Bowl như một cái “hố nhỏ” cho đồ ăn. Đồ nằm bên trong chứ không nằm trên mặt phẳng: bowl.",
          "Knife giúp chuẩn bị món ăn, nhưng không đựng món ăn. Với “miska”, hãy nghĩ đến vật sâu lòng: bowl."
        ],
        "id": [
          "Glass menampung minuman. Kalau cair tapi dimakan dengan sendok, itu bukan glass; itu bowl.",
          "Plate itu datar: sup akan kabur. Makanan yang butuh wadah dalam — sup, sereal, es krim — masuk bowl.",
          "Benar. Bowl seperti “lubang kecil” untuk makanan. Kalau makanan duduk di dalam, bukan di atas, pilih bowl.",
          "Knife membantu menyiapkan makanan, tetapi tidak menampungnya. Untuk mangkuk, pikirkan bentuk yang dalam: bowl."
        ],
        "tr": [
          "Glass içecek tutar. Sıvı ama kaşıkla yeniyorsa glass değil, bowl.",
          "Plate düzdür; çorba üstünde kaçış planı yapar. Derinlik isteyen çorba, gevrek ve dondurma bowl ister.",
          "Doğru. Bowl yemek için küçük bir “çukur” gibidir. Yemek üstünde değil içinde duruyorsa bowl düşün.",
          "Knife yemeği hazırlamaya yardım eder ama onu tutmaz. Kase için eylemi değil, derin şekli düşün: bowl."
        ],
        "pl": [
          "Glass trzyma napój. Jeśli coś jest płynne, ale jesz to łyżką, to nie glass, tylko bowl.",
          "Plate jest płaski: zupa od razu ucieknie. Zupa, płatki i lody lubią głębię, więc wybierz bowl.",
          "Dobrze. Bowl to mała “dziurka” na jedzenie. Jeśli jedzenie siedzi w środku, a nie leży na wierzchu, to bowl.",
          "Knife pomaga przygotować jedzenie, ale go nie trzyma. Przy misce myśl o kształcie: głębokie naczynie to bowl."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-003",
      "type": "mcq",
      "prompt": "How do you say “сковорода” in English?",
      "localizedPrompts": {
        "ru": "Как по-английски «сковорода»?",
        "uk": "Як англійською «пательня»?",
        "es": "¿Cómo se dice “sartén” en inglés?",
        "pt-BR": "Como se diz “frigideira” em inglês?",
        "vi": "“Cái chảo rán” nói bằng tiếng Anh là gì?",
        "id": "Apa bahasa Inggrisnya “wajan penggorengan”?",
        "tr": "“Kızartma tavası” İngilizce nasıl söylenir?",
        "pl": "Jak powiedzieć „patelnia” po angielsku?"
      },
      "choices": [
        "cupboard",
        "frying pan",
        "fork",
        "bowl"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the right object for frying food.",
      "skillTag": "kitchen_tool_action_match",
      "sourceIds": [
        "S1",
        "S3",
        "S4"
      ],
      "claimIds": [
        "C3",
        "K3"
      ],
      "choiceRationales": [
        "Cupboard is kitchen furniture for storage, not the object used to fry food.",
        "Frying pan is correct because it is source-backed as a pan used for frying food.",
        "Fork is an eating utensil, but it is not the pan used to fry eggs.",
        "Bowl is a food container, so it does not match the frying action."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Cupboard — шкафчик для хранения. Сковорода может там лежать, но называться она будет frying pan.",
          "Бинго! Frying pan — сковорода для жарки на плите. Это слово хорошо держит идею жара и масла.",
          "Fork — вилка. Ею едят уже готовое, но жарят не на fork, а на frying pan.",
          "Bowl — миска. В ней можно смешать продукты, но жарка происходит на frying pan, а не в глубокой миске."
        ],
        "uk": [
          "Cupboard — шафка для зберігання. Сковорода може лежати всередині cupboard, але сама сковорода називається frying pan.",
          "Бінго! Frying pan — сковорода для смаження на плиті. Якщо є олія, яйця й гаряча поверхня, це саме frying pan.",
          "Fork виходить після готування, коли їжа вже на тарілці. Якщо шипить олія і все на плиті, потрібна frying pan.",
          "Bowl може змішати яйця до сніданку, але смажити не вміє. Запам’ятай: bowl — усередині, frying pan — на вогні."
        ],
        "es": [
          "Cupboard es el armario donde guardas cosas. Donde vive la sartén es cupboard; donde se fríe es frying pan.",
          "Bien. Frying pan va con fry. Si imaginas aceite, huevos y sonido en la cocina, piensa en frying pan.",
          "Fork aparece cuando la comida ya está en el plato. Si todo pasa sobre el fuego, el protagonista es frying pan.",
          "Bowl mezcla huevos antes del desayuno, pero no fríe. Imagen útil: bowl por dentro, frying pan al fuego."
        ],
        "pt-BR": [
          "Cupboard é o armário onde as coisas moram. Onde guarda a panela é cupboard; onde frita é frying pan.",
          "Certo. Frying pan combina com fry. Pensou em óleo, ovos e chiado no fogão? Pense em frying pan.",
          "Fork entra quando a comida já está no prato. Se a cena está no fogo, o protagonista é frying pan.",
          "Bowl mistura ovos antes do café, mas não frita. Imagem útil: bowl por dentro, frying pan no fogo."
        ],
        "vi": [
          "Cupboard là tủ để đồ. Nơi cất chảo là cupboard; thứ đặt lên bếp để chiên là frying pan.",
          "Đúng. Frying pan đi cùng fry. Nghĩ tới dầu, trứng và tiếng xèo trên bếp là nghĩ tới frying pan.",
          "Fork xuất hiện khi đồ ăn đã lên đĩa. Nếu cảnh đang ở trên bếp với dầu nóng, nhân vật chính là frying pan.",
          "Bowl có thể trộn trứng trước bữa sáng, nhưng không chiên được. Hình ảnh nhớ: bowl ở trong, frying pan trên lửa."
        ],
        "id": [
          "Cupboard adalah lemari tempat menyimpan barang. Tempat wajan tinggal itu cupboard; alat untuk menggoreng itu frying pan.",
          "Benar. Frying pan dekat dengan fry. Bayangkan minyak, telur, dan suara mendesis di kompor: frying pan.",
          "Fork muncul saat makanan sudah di piring. Kalau adegannya di atas api, tokoh utamanya frying pan.",
          "Bowl bisa mencampur telur, tapi tidak bisa menggoreng. Gambar ingat: bowl di dalam, frying pan di atas api."
        ],
        "tr": [
          "Cupboard dolaptır, eşyaların evidir. Tava nerede durur? Cupboard. Yiyecek nerede kızarır? Frying pan.",
          "Doğru. Frying pan, fry ile akraba gibi durur. Yağ, yumurta ve cızırtı varsa akla frying pan gelsin.",
          "Fork yemek tabağa gelince sahneye çıkar. Yağ cızırdıyor ve ocak açıksa başrol frying pan.",
          "Bowl yumurtayı karıştırabilir ama kızartamaz. Görsel kural: bowl içeride, frying pan ateşte."
        ],
        "pl": [
          "Cupboard to szafka, miejsce przechowywania. Gdzie leży patelnia — cupboard; na czym smażysz — frying pan.",
          "Dobrze. Frying pan trzyma się słowa fry. Olej, jajka i skwierczenie na kuchence? Myśl o frying pan.",
          "Fork wchodzi, gdy jedzenie jest już na talerzu. Jeśli akcja dzieje się na ogniu, główną rolę ma frying pan.",
          "Bowl może wymieszać jajka, ale ich nie usmaży. Obrazek do pamięci: bowl w środku, frying pan na ogniu."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-004",
      "type": "mcq",
      "prompt": "Which English verb fits “bake a cake”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «печь торт»?",
        "uk": "Яке англійське дієслово потрібне для «пекти торт»?",
        "es": "¿Qué verbo inglés se usa para «hornear un pastel»?",
        "pt-BR": "Qual verbo em inglês se usa para “assar um bolo”?",
        "vi": "Động từ tiếng Anh nào dùng cho “nướng bánh”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “memanggang kue”?",
        "tr": "“Kek pişirmek” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „piec ciasto”?"
      },
      "choices": [
        "fry",
        "grill",
        "roast",
        "bake"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose the English cooking verb for baking a cake.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C4",
        "K4"
      ],
      "choiceRationales": [
        "Fry is a cooking verb, but the source-backed cake context points away from frying.",
        "Grill fits food cooked under high heat, but it is not the cake verb in this sentence.",
        "Roast often fits meat or vegetables, not the cake sentence used here.",
        "Bake is correct because the cited cooking references support it for a cake."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Fry — жарить на сковороде, обычно с маслом. Торт так не мучают: его выпекают — bake a cake.",
          "Grill — готовить на гриле или решётке. Торт на гриле звучит как эксперимент, а нормальная фраза — bake a cake.",
          "Roast — запекать мясо или овощи сухим жаром. Для торта обычный английский выбор — bake.",
          "Да, bake a cake — печь или выпекать торт. Bake — нормальный английский глагол для тортов, хлеба и выпечки."
        ],
        "uk": [
          "Fry — це сковорода й олія. Cake не плаває в олії, він піднімається в духовці, тому bake.",
          "Grill — решітка, жар і смужки. Для торта це занадто спортивний режим: cake відправляємо в духовку, тобто bake.",
          "Roast часто про м’ясо й овочі. Торт у цій компанії чужий гість: для випічки обирай bake.",
          "Так, bake a cake — пекти або випікати торт. Bake добре підходить для хліба, пирогів і тортів."
        ],
        "es": [
          "Fry es sartén y aceite. Un cake no nada en aceite; sube en el horno, así que bake.",
          "Grill trae parrilla, calor fuerte y marcas. Para un cake es demasiado gimnasio: horno y bake.",
          "Roast suele ir con carne o verduras. El cake queda raro en esa mesa; para repostería, bake.",
          "Sí, bake a cake. Recuerda bakery: pasteles, pan y pies viven cerca de bake."
        ],
        "pt-BR": [
          "Fry é frigideira e óleo. Cake não nada no óleo; ele cresce no forno, então bake.",
          "Grill traz grelha, calor forte e marcas. Para cake é treino pesado demais: forno e bake.",
          "Roast costuma ir com carne ou legumes. Cake fica estranho nessa turma; para confeitaria, bake.",
          "Sim, bake a cake. Lembre de bakery: bolos, pães e tortas ficam perto de bake."
        ],
        "vi": [
          "Fry là chảo và dầu. Cake không “bơi” trong dầu; nó nở trong lò, nên dùng bake.",
          "Grill có vỉ nướng, nhiệt mạnh và vệt cháy. Với cake thì quá “thể thao”; bánh cần lò và bake.",
          "Roast thường đi với thịt hoặc rau củ. Cake đứng hơi lạc đội; đồ bánh ngọt dùng bake.",
          "Đúng, bake a cake. Nhớ qua bakery: bánh, bánh mì, pie đều ở gần bake."
        ],
        "id": [
          "Fry berarti wajan dan minyak. Cake tidak berenang di minyak; ia mengembang di oven, jadi bake.",
          "Grill membawa panggangan, panas kuat, dan garis bakar. Untuk cake itu terlalu keras; oven berarti bake.",
          "Roast sering untuk daging atau sayur. Cake terasa salah rombongan; urusan kue pilih bake.",
          "Ya, bake a cake. Ingat bakery: kue, roti, dan pie dekat sekali dengan bake."
        ],
        "tr": [
          "Fry tava ve yağ demektir. Cake yağda yüzmez, fırında kabarır; bu yüzden bake.",
          "Grill ızgara, güçlü sıcaklık ve çizgiler getirir. Cake için fazla sert; fırın varsa bake.",
          "Roast genelde et ve sebzeyle gezer. Cake bu masada yabancı kalır; hamur işi için bake.",
          "Evet, bake a cake. Bakery kelimesini hatırla: kek, ekmek ve turta bake tarafındadır."
        ],
        "pl": [
          "Fry to patelnia i olej. Cake nie pływa w oleju, tylko rośnie w piekarniku, więc bake.",
          "Grill to ruszt, mocny żar i paski. Dla cake to zbyt sportowy tryb; piekarnik oznacza bake.",
          "Roast często chodzi z mięsem i warzywami. Cake jest tam obcym gościem; przy wypiekach wybierz bake.",
          "Tak, bake a cake. Zapamiętaj przez bakery: ciasta, chleb i tarty trzymają się bake."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-005",
      "type": "mcq",
      "prompt": "How do you say “ложка” in English?",
      "localizedPrompts": {
        "ru": "Как по-английски «ложка»?",
        "uk": "Як англійською «ложка»?",
        "es": "¿Cómo se dice “cuchara” en inglés?",
        "pt-BR": "Como se diz “colher” em inglês?",
        "vi": "“Cái thìa” nói bằng tiếng Anh là gì?",
        "id": "Apa bahasa Inggrisnya “sendok”?",
        "tr": "“Kaşık” İngilizce nasıl söylenir?",
        "pl": "Jak powiedzieć „łyżka” po angielsku?"
      },
      "choices": [
        "spoon",
        "knife",
        "cup",
        "cupboard"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the right eating object for soup.",
      "skillTag": "kitchen_object_labels",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C5",
        "K5"
      ],
      "choiceRationales": [
        "Spoon is correct because it matches the everyday eating object for soup.",
        "Knife is a kitchen object for cutting, not for eating soup.",
        "Cup is a drink container and does not match the soup-eating clue.",
        "Cupboard is kitchen storage furniture, not something used to eat soup."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да, spoon — ложка. Ею едят суп, кашу, соус или мороженое; маленький герой мягкой еды.",
          "Knife — нож, он режет. С супом knife выглядит уверенно, но бесполезно; нужна spoon.",
          "Cup — чашка для напитков. Ложка как столовый прибор — spoon; cup только держит чай и делает вид, что помогает.",
          "Cupboard — шкафчик для хранения. Он может хранить ложки, но сама «ложка» — spoon."
        ],
        "uk": [
          "Так, spoon — ложка. Вона для того, що зручно зачерпнути: суп, соус, кашу чи морозиво просто з банки.",
          "Knife ріже, але суп ножем не переконаєш. Якщо їжа рідка або м’яка і її треба зачерпнути, думай spoon.",
          "Cup тримає напій. Суп із чашки можливий, але в нормальному quiz-світі його їдять spoon.",
          "Cupboard — дім для ложок, але не сама ложка. Відкрили шафку, дістали героя для супу: spoon."
        ],
        "es": [
          "Sí, spoon es cuchara. Sirve para lo que puedes recoger: sopa, salsa, cereal o helado directo del bote.",
          "Knife corta, pero no convence a la sopa. Si algo es líquido o blando y se recoge, piensa en spoon.",
          "Cup guarda bebida. La sopa en taza puede pasar, pero en el mundo normal del quiz se come con spoon.",
          "Cupboard es la casa de las cucharas, no la cuchara. Abres el armario y sale el héroe: spoon."
        ],
        "pt-BR": [
          "Sim, spoon é colher. Ela serve para o que dá para pegar: sopa, molho, cereal ou sorvete do pote.",
          "Knife corta, mas não resolve sopa. Se é líquido ou macio e você precisa pegar, pense em spoon.",
          "Cup segura bebida. Sopa na xícara até existe, mas no quiz normal ela vai com spoon.",
          "Cupboard é a casa das colheres, não a colher. Abriu o armário, saiu o herói da sopa: spoon."
        ],
        "vi": [
          "Đúng, spoon là cái thìa. Nó dành cho thứ có thể múc: súp, sốt, cháo hoặc kem trong hộp.",
          "Knife dùng để cắt, nhưng không xử lý được súp. Món lỏng hoặc mềm cần múc thì nghĩ tới spoon.",
          "Cup đựng đồ uống. Súp trong cốc có thể có, nhưng trong quiz bình thường người ta ăn bằng spoon.",
          "Cupboard là “nhà” của thìa, không phải cái thìa. Mở tủ ra, nhân vật cứu món súp là spoon."
        ],
        "id": [
          "Ya, spoon adalah sendok. Ia dipakai untuk yang bisa disendok: sup, saus, bubur, atau es krim dari wadah.",
          "Knife memotong, tetapi tidak cocok untuk sup. Kalau cair atau lembut dan perlu diambil, pikirkan spoon.",
          "Cup menampung minuman. Sup di cangkir bisa saja, tapi di dunia quiz normal sup dimakan dengan spoon.",
          "Cupboard adalah rumah sendok, bukan sendoknya. Buka lemari, pahlawan sup keluar: spoon."
        ],
        "tr": [
          "Evet, spoon kaşıktır. Çorba, sos, lapa ya da kutudan dondurma almak için eldeki kahraman odur.",
          "Knife keser ama çorbayı ikna edemez. Sıvı ya da yumuşak bir şeyi almak gerekiyorsa spoon düşün.",
          "Cup içecek tutar. Çorba fincanda olabilir ama normal quiz evreninde çorba spoon ile yenir.",
          "Cupboard kaşıkların evidir, kaşığın kendisi değil. Dolabı aç, çorbanın kahramanı çıkar: spoon."
        ],
        "pl": [
          "Tak, spoon to łyżka. Jest od tego, co da się nabrać: zupy, sosu, owsianki albo lodów z pudełka.",
          "Knife kroi, ale zupy nie przekona. Jeśli coś jest płynne albo miękkie i trzeba to nabrać, myśl spoon.",
          "Cup trzyma napój. Zupa w kubku bywa możliwa, ale w normalnym quizowym świecie jesz ją spoon.",
          "Cupboard to dom łyżek, nie sama łyżka. Otwierasz szafkę i wychodzi bohater zupy: spoon."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-006",
      "type": "mcq",
      "prompt": "How do you say “чашка” in English?",
      "localizedPrompts": {
        "ru": "Как по-английски «чашка»?",
        "uk": "Як англійською «чашка»?",
        "es": "¿Cómo se dice “taza” en inglés?",
        "pt-BR": "Como se diz “xícara” em inglês?",
        "vi": "“Cái cốc” nói bằng tiếng Anh là gì?",
        "id": "Apa bahasa Inggrisnya “cangkir”?",
        "tr": "“Fincan” İngilizce nasıl söylenir?",
        "pl": "Jak powiedzieć „filiżanka” po angielsku?"
      },
      "choices": [
        "fork",
        "cooker",
        "cup",
        "plate"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose the right kitchen word for a drink container.",
      "skillTag": "kitchen_object_labels",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C6",
        "K6"
      ],
      "choiceRationales": [
        "Fork is an eating object, but it is not a container for tea.",
        "Cooker is a kitchen appliance, not something you drink from.",
        "Cup is correct because it names the small drink container in this context.",
        "Plate is for food, so it does not match the drink-container clue."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Fork — вилка для еды. Чай или кофе вилкой не пьют, даже если день странный; нужна cup.",
          "Cooker — устройство для готовки. Из cooker не пьют чай, это не чашка; правильный вариант — cup.",
          "Бинго, cup — чашка. “A cup of tea” и “a cup of coffee” — очень обычные английские фразы.",
          "Plate — тарелка для еды. Чашка для напитка по-английски — cup, а plate пусть держит печенье."
        ],
        "uk": [
          "Fork наколює й підчіплює їжу. Якщо мова про tea або coffee, шукай не зубці, а cup.",
          "Cooker готує, але з нього не п’ють. Для чаю потрібна маленька посудина в руці — cup.",
          "Бінго, cup. Запам’ятай готову фразу «a cup of tea»: чашка й чай ідуть парою, як перерва й печиво.",
          "Plate тримає печиво до чаю, але сам чай із тарілки втече. Напій проситься в cup."
        ],
        "es": [
          "Fork pincha comida. Si aparece tea o coffee, no busques dientes; busca cup.",
          "Cooker cocina, pero no se usa para beber. Para el té necesitas un recipiente pequeño en la mano: cup.",
          "Bien, cup. “A cup of tea” ya es una frase lista: taza y té van juntos como pausa y galleta.",
          "Plate sostiene la galleta del té, pero el té se escaparía. La bebida quiere cup."
        ],
        "pt-BR": [
          "Fork espeta comida. Apareceu tea ou coffee, não procure dentes; procure cup.",
          "Cooker cozinha, mas ninguém bebe dele. Para chá, o recipiente pequeno na mão é cup.",
          "Certo, cup. “A cup of tea” já vem pronto: xícara e chá andam juntos como pausa e biscoito.",
          "Plate segura o biscoito do chá, mas o chá fugiria. Bebida pede cup."
        ],
        "vi": [
          "Fork dùng để xiên thức ăn. Thấy tea hoặc coffee thì đừng tìm răng nĩa, hãy tìm cup.",
          "Cooker dùng để nấu, không phải để uống. Với trà, vật nhỏ cầm trên tay là cup.",
          "Đúng, cup. “A cup of tea” là cụm sẵn: cup và tea đi cùng nhau như giờ nghỉ và bánh quy.",
          "Plate giữ bánh ăn kèm trà, nhưng trà sẽ chạy khỏi đĩa. Đồ uống cần cup."
        ],
        "id": [
          "Fork menusuk makanan. Kalau ada tea atau coffee, jangan cari gerigi; cari cup.",
          "Cooker memasak, tetapi tidak dipakai minum. Untuk teh, wadah kecil di tangan adalah cup.",
          "Benar, cup. “A cup of tea” sudah jadi frasa siap pakai: cup dan tea seperti istirahat dan biskuit.",
          "Plate menahan biskuit untuk teh, tetapi tehnya akan kabur. Minuman butuh cup."
        ],
        "tr": [
          "Fork yemeği batırıp alır. Tea veya coffee varsa dişli araç değil, cup ara.",
          "Cooker yemek pişirir ama ondan içilmez. Çay için elde küçük bir kap gerekir: cup.",
          "Doğru, cup. “A cup of tea” kalıbında cup çay veya kahve için kullanılan fincanı anlatır.",
          "Plate çayın yanındaki kurabiyeyi tutar, çayın kendisi kaçar. İçecek cup ister."
        ],
        "pl": [
          "Fork nabija jedzenie. Gdy widzisz tea albo coffee, nie szukaj ząbków, tylko cup.",
          "Cooker gotuje, ale się z niego nie pije. Do herbaty potrzebujesz małego naczynia w dłoni: cup.",
          "Dobrze, cup. W zwrocie “a cup of tea” cup oznacza filiżankę albo kubek do herbaty lub kawy.",
          "Plate trzyma ciastko do herbaty, ale herbata z talerza ucieknie. Napój prosi się o cup."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-007",
      "type": "mcq",
      "prompt": "Which English verb fits “chop onions”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «нарезать лук»?",
        "uk": "Яке англійське дієслово потрібне для «нарізати цибулю»?",
        "es": "¿Qué verbo inglés se usa para «picar cebolla»?",
        "pt-BR": "Qual verbo em inglês se usa para “picar cebola”?",
        "vi": "Động từ tiếng Anh nào dùng cho “cắt nhỏ hành”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “memotong bawang kecil-kecil”?",
        "tr": "“Soğan doğramak” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „posiekać cebulę”?"
      },
      "choices": [
        "bake",
        "chop",
        "pour",
        "grill"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English cooking verb for cutting onions into small pieces.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C7",
        "K7"
      ],
      "choiceRationales": [
        "Bake is a cooking method, but it does not mean cut into small pieces.",
        "Chop is correct because it matches cutting onions into small pieces.",
        "Pour is for moving liquid, not for preparing onions with a knife.",
        "Grill is a heat-based cooking action, not the cutting action here."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Bake — печь в духовке. Лук можно запечь позже, но действие «нарезать лук» — chop onions.",
          "Блестяще! Chop onions — нарезать или порубить лук на мелкие кусочки. Chop — глагол для быстрой работы ножом.",
          "Pour — наливать жидкость. Лук не льётся из пакета, как молоко; если его режут, нужен chop.",
          "Grill — готовить на гриле. Это уже про жар, а не про нарезку; «нарезать лук» — chop onions."
        ],
        "uk": [
          "Bake — це духовка. Лук після bake уже запечений, але не нарізаний. Для «чик-чик на дошці» потрібен chop.",
          "Блискуче! Chop onions — нарізати цибулю на дрібні шматочки. Чуєш на дошці швидке «чик-чик» — це настрій chop.",
          "Pour — наливати. Якщо лук раптом можна налити, на кухні сталася наукова фантастика. Для нарізання потрібен chop.",
          "Grill вмикається, коли їжу смажать на решітці. До вогню лук зустрічає ніж, і ця дія — chop."
        ],
        "es": [
          "Bake es horno. La cebolla después de bake queda cocinada, no cortada. Para el “chic-chic” en la tabla, chop.",
          "Perfecto. Chop onions es cortar cebolla en trocitos. Ese “chic-chic” rápido sobre la tabla tiene sabor a chop.",
          "Pour es verter. Si una cebolla se puede verter, la cocina entró en ciencia ficción. Para cortar, chop.",
          "Grill aparece con parrilla y fuego. Antes del fuego, la cebolla conoce el cuchillo: chop."
        ],
        "pt-BR": [
          "Bake é forno. A cebola depois de bake fica assada, não picada. Para o “tchic-tchic” na tábua, chop.",
          "Perfeito. Chop onions é picar cebola em pedacinhos. O “tchic-tchic” rápido na tábua tem cara de chop.",
          "Pour é despejar. Se uma cebola pode ser despejada, a cozinha virou ficção científica. Para cortar, chop.",
          "Grill aparece com grelha e fogo. Antes do fogo, a cebola encontra a faca: chop."
        ],
        "vi": [
          "Bake là lò nướng. Hành sau bake là đã nướng, chưa phải đã cắt. Tiếng “cạch cạch” trên thớt là chop.",
          "Tuyệt. Chop onions là cắt hành thành miếng nhỏ. Tiếng dao nhanh trên thớt chính là cảm giác của chop.",
          "Pour là rót. Nếu có thể rót hành, căn bếp đã thành phim khoa học viễn tưởng. Cắt hành là chop.",
          "Grill đi với vỉ nướng và lửa. Trước khi gặp lửa, hành gặp dao: chop."
        ],
        "id": [
          "Bake berarti oven. Bawang setelah bake jadi dipanggang, bukan dipotong. Bunyi “cak-cak” di talenan adalah chop.",
          "Mantap. Chop onions berarti memotong bawang kecil-kecil. Bunyi pisau cepat di talenan terasa seperti chop.",
          "Pour berarti menuang. Kalau bawang bisa dituang, dapurnya sudah fiksi ilmiah. Untuk memotong, pilih chop.",
          "Grill muncul dengan panggangan dan api. Sebelum api, bawang bertemu pisau: chop."
        ],
        "tr": [
          "Bake fırındır. Soğan bake sonrası pişmiş olur, doğranmış değil. Tahtadaki “çıt çıt” için chop gerekir.",
          "Harika. Chop onions soğanı küçük parçalara doğramaktır. Tahtadaki hızlı bıçak sesi tam chop havasıdır.",
          "Pour dökmek demektir. Soğan dökülebiliyorsa mutfak bilim kurguya dönmüştür. Doğramak için chop.",
          "Grill ızgara ve ateşle gelir. Ateşten önce soğan bıçakla tanışır: chop."
        ],
        "pl": [
          "Bake to piekarnik. Cebula po bake jest upieczona, nie pokrojona. Do “ciach-ciach” na desce potrzebujesz chop.",
          "Świetnie. Chop onions to pokroić cebulę na drobne kawałki. Szybkie “ciach-ciach” na desce brzmi jak chop.",
          "Pour to nalewać. Jeśli cebulę da się nalać, kuchnia weszła w science fiction. Do krojenia wybierz chop.",
          "Grill pojawia się przy ruszcie i ogniu. Zanim cebula spotka ogień, spotyka nóż: chop."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-008",
      "type": "mcq",
      "prompt": "Which English verb fits “grill steaks”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «готовить стейки на гриле»?",
        "uk": "Яке англійське дієслово потрібне для «готувати стейки на грилі»?",
        "es": "¿Qué verbo inglés se usa para «hacer filetes a la parrilla»?",
        "pt-BR": "Qual verbo em inglês se usa para “grelhar bifes”?",
        "vi": "Động từ tiếng Anh nào dùng cho “nướng bít tết trên vỉ”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “memanggang steak”?",
        "tr": "“Biftekleri ızgara yapmak” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „grillować steki”?"
      },
      "choices": [
        "boil",
        "chop",
        "bake",
        "grill"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose the English cooking verb for grilling steaks.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C8",
        "K8"
      ],
      "choiceRationales": [
        "Boil uses hot water, so it does not match steaks under high heat.",
        "Chop is preparation with a knife, not the cooking method in this sentence.",
        "Bake is a cooking verb, but the steak clue points to grilling here.",
        "Grill is correct because it matches the source-backed high-heat steak context."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Boil — варить в воде. Стейки на гриле не boil; им нужна решётка, жар и глагол grill.",
          "Chop — нарезать кусочками. Со стейком это можно сделать потом, но «готовить на гриле» — grill.",
          "Bake — печь в духовке. Для стейков на гриле точнее grill: там решётка и прямой жар.",
          "Точно, grill steaks — готовить стейки на гриле. Grill — это решётка, прямой жар и характерные полоски."
        ],
        "uk": [
          "Boil — вода, каструля й бульбашки. Стейк зі смужками від решітки не варять, його grill.",
          "Chop — різати. М’ясо можна нарізати до чи після, але спосіб готування на решітці називається grill.",
          "Bake — духовка й рівне тепло. Якщо хочеться диму, решітки й смужок на стейку, обирай grill.",
          "Точно, grill steaks. Це про жар від решітки, димок і смужки на м’ясі — стейк отримує кухонну засмагу."
        ],
        "es": [
          "Boil es agua, olla y burbujas. Un steak con marcas de parrilla no se hierve; se grill.",
          "Chop es cortar. Puedes cortar la carne antes o después, pero cocinarla en parrilla es grill.",
          "Bake es horno y calor parejo. Si imaginas humo, parrilla y marcas en la carne, elige grill.",
          "Exacto, grill steaks. Habla de parrilla, humo y marcas en la carne: el bistec sale con bronceado de cocina."
        ],
        "pt-BR": [
          "Boil é água, panela e bolhas. Steak com marcas de grelha não ferve; ele vai no grill.",
          "Chop é cortar. Você pode cortar a carne antes ou depois, mas cozinhar na grelha é grill.",
          "Bake é forno e calor uniforme. Se imagina fumaça, grelha e marcas na carne, escolha grill.",
          "Isso, grill steaks. É grelha, fumaça e marcas na carne: o bife sai com bronzeado de cozinha."
        ],
        "vi": [
          "Boil là nước, nồi và bọt sôi. Steak có vệt vỉ nướng thì không luộc; nó cần grill.",
          "Chop là cắt. Bạn có thể cắt thịt trước hoặc sau, nhưng nấu trên vỉ là grill.",
          "Bake là lò và nhiệt đều. Nếu hình dung khói, vỉ và vệt cháy trên thịt, hãy chọn grill.",
          "Đúng, grill steaks. Đó là vỉ nướng, khói và vệt trên thịt: miếng steak có “làn da” của bếp."
        ],
        "id": [
          "Boil berarti air, panci, dan gelembung. Steak dengan garis panggangan tidak direbus; ia di-grill.",
          "Chop berarti memotong. Daging bisa dipotong sebelum atau sesudah, tetapi memasak di panggangan adalah grill.",
          "Bake berarti oven dan panas rata. Kalau ada asap, panggangan, dan garis di steak, pilih grill.",
          "Tepat, grill steaks. Ini tentang panggangan, asap, dan garis pada daging: steak keluar dengan jejak api."
        ],
        "tr": [
          "Boil su, tencere ve kabarcıktır. Izgara çizgili steak kaynatılmaz; grill yapılır.",
          "Chop kesmek demektir. Eti önce ya da sonra kesebilirsin, ama ızgarada pişirme işi grill.",
          "Bake fırın ve dengeli sıcaklıktır. Duman, ızgara ve et üstünde çizgi varsa cevap grill.",
          "Kesinlikle, grill steaks. Izgara, duman ve etin üstündeki çizgiler var: steak mutfak bronzluğu alır."
        ],
        "pl": [
          "Boil to woda, garnek i bąbelki. Steku z paskami od rusztu się nie gotuje, tylko grill.",
          "Chop to kroić. Mięso można pokroić przed albo po, ale gotowanie na ruszcie to grill.",
          "Bake to piekarnik i równe ciepło. Dym, ruszt i paski na steku prowadzą do grill.",
          "Dokładnie, grill steaks. To ruszt, dym i paski na mięsie: stek dostaje kuchenną opaleniznę."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-009",
      "type": "mcq",
      "prompt": "Which English word means “a person who cooks” in “he is a great cook”?",
      "localizedPrompts": {
        "ru": "Какое английское слово значит «повар» в фразе «он отличный повар»?",
        "uk": "Яке англійське слово означає «кухар» у фразі «він чудовий кухар»?",
        "es": "¿Qué palabra inglesa significa «cocinero» en «él es un gran cocinero»?",
        "pt-BR": "Que palavra em inglês significa “cozinheiro” em “ele é um ótimo cozinheiro”?",
        "vi": "Từ tiếng Anh nào nghĩa là “người nấu ăn” trong câu “anh ấy nấu ăn rất giỏi”?",
        "id": "Kata Inggris mana yang berarti “juru masak” dalam “dia juru masak yang hebat”?",
        "tr": "“O harika bir aşçı” cümlesinde “aşçı” için hangi İngilizce kelime kullanılır?",
        "pl": "Które angielskie słowo znaczy „kucharz” w zdaniu „on jest świetnym kucharzem”?"
      },
      "choices": [
        "cook",
        "cooker",
        "cooking",
        "kitchen"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the person word cook, not the appliance or activity word.",
      "skillTag": "kitchen_near_miss_contrast",
      "sourceIds": [
        "S2",
        "S4"
      ],
      "claimIds": [
        "C9",
        "K9"
      ],
      "choiceRationales": [
        "Cook is correct because it can name a person who cooks well.",
        "Cooker is a kitchen appliance word in this learner contrast, not the person.",
        "Cooking names the activity, so it does not complete the person noun phrase.",
        "Kitchen names the room or place, not the person described by great."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Да, cook. В “a great cook” это человек, который хорошо готовит. Короткое слово, а комплимент получается вполне солидный.",
          "Cooker — устройство для готовки: плита, рисоварка, мультиварка. Человека называют cook, не cooker.",
          "Cooking — процесс готовки. Но если хвалим человека, нужен cook: a great cook.",
          "Kitchen — кухня как место. Но «он отличный повар» описывает человека, поэтому нужен cook."
        ],
        "uk": [
          "Так, a great cook. Тут cook — людина, не процес: той самий герой, після якого всі просять добавку.",
          "Cooker — техніка: плита, мультиварка, прилад. Комплімент пристрою звучить дивно, людині потрібен cook.",
          "Cooking — процес, саме готування. Але «він чудовий кухар» хвалить людину, тому a great cook.",
          "Kitchen називає місце, а не людину. Кухня може бути красивою, але смачну вечерю робить людина: he is a great cook."
        ],
        "es": [
          "Sí, a great cook. Aquí cook es la persona, no el proceso: quien cocina tan bien que todos repiten.",
          "Cooker es aparato: cocina, olla eléctrica, máquina. El cumplido va a la persona, así que cook.",
          "Cooking es el proceso de cocinar. Aquí no elogiamos la actividad, sino a la persona: a great cook.",
          "Kitchen es el lugar. La cocina puede ser bonita, pero quien hace la cena es a great cook."
        ],
        "pt-BR": [
          "Sim, a great cook. Aqui cook é a pessoa, não o processo: quem cozinha tão bem que todos repetem.",
          "Cooker é aparelho: fogão, panela elétrica, máquina. O elogio vai para a pessoa, então cook.",
          "Cooking é o processo de cozinhar. Aqui não elogiamos a atividade, e sim a pessoa: a great cook.",
          "Kitchen é o lugar. A cozinha pode ser linda, mas quem faz o jantar é a great cook."
        ],
        "vi": [
          "Đúng, a great cook. Ở đây cook là người, không phải hành động: người nấu ngon đến mức ai cũng xin thêm.",
          "Cooker là thiết bị: bếp, nồi điện, máy. Lời khen dành cho người, nên cần cook.",
          "Cooking là quá trình nấu ăn. Ở đây ta khen con người, không khen hoạt động: a great cook.",
          "Kitchen là nơi chốn. Nhà bếp có thể đẹp, nhưng người nấu bữa tối mới là a great cook."
        ],
        "id": [
          "Ya, a great cook. Di sini cook adalah orang, bukan proses: orang yang masakannya bikin semua minta tambah.",
          "Cooker adalah alat: kompor, rice cooker, mesin. Pujian untuk orang perlu cook, bukan cooker.",
          "Cooking adalah proses memasak. Di sini yang dipuji orangnya, bukan kegiatannya: a great cook.",
          "Kitchen adalah tempat. Dapurnya bisa indah, tetapi yang membuat makan malam enak adalah a great cook."
        ],
        "tr": [
          "Evet, a great cook. Burada cook işlem değil, kişidir: yemeği bitince herkesin bir tabak daha istediği insan.",
          "Cooker cihazdır: ocak, elektrikli tencere, makine. İltifat insana gider; bu yüzden cook.",
          "Cooking pişirme sürecidir. Burada etkinliği değil, insanı övüyoruz: a great cook.",
          "Kitchen yerdir. Mutfak güzel olabilir ama lezzetli yemeği yapan kişi a great cook olur."
        ],
        "pl": [
          "Tak, a great cook. Tu cook to osoba, nie czynność: ktoś, po kim wszyscy proszą o dokładkę.",
          "Cooker to urządzenie: kuchenka, multicooker, sprzęt. Komplement dla człowieka potrzebuje cook.",
          "Cooking to proces gotowania. Tu chwalisz osobę, nie czynność, więc a great cook.",
          "Kitchen to miejsce. Kuchnia może być piękna, ale kolację robi człowiek: a great cook."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-010",
      "type": "mcq",
      "prompt": "How do you say “вилка” in English?",
      "localizedPrompts": {
        "ru": "Как по-английски «вилка»?",
        "uk": "Як англійською «виделка»?",
        "es": "¿Cómo se dice “tenedor” en inglés?",
        "pt-BR": "Como se diz “garfo” em inglês?",
        "vi": "“Cái nĩa” nói bằng tiếng Anh là gì?",
        "id": "Apa bahasa Inggrisnya “garpu”?",
        "tr": "“Çatal” İngilizce nasıl söylenir?",
        "pl": "Jak powiedzieć „widelec” po angielsku?"
      },
      "choices": [
        "bowl",
        "knife",
        "fork",
        "cooker"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose the right eating object for pieces of food on a plate.",
      "skillTag": "kitchen_object_labels",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C10",
        "K10"
      ],
      "choiceRationales": [
        "Bowl is a container, but the prompt asks for an object used to pick up food.",
        "Knife can cut food, but it is not the best object for picking up salad pieces.",
        "Fork is correct because it matches the everyday eating object for pieces of food.",
        "Cooker is a kitchen appliance, not an eating object for salad."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Bowl — миска. Она держит еду, но не подцепляет её; «вилка» по-английски — fork.",
          "Knife — нож. Он режет, а fork накалывает и подцепляет еду; не меняем приборы местами.",
          "Бинго, fork — вилка. У fork есть зубчики: ими удобно накалывать и подцеплять еду.",
          "Cooker — устройство для готовки. Fork — столовый прибор; cooker пусть готовит, а fork помогает есть."
        ],
        "uk": [
          "Bowl тримає салат, але не підчіплює шматочки. Миска — сцена, fork — інструмент у руці.",
          "Knife ріже, а fork піднімає їжу до тебе. Якщо шматочок уже готовий і його треба взяти, обирай fork.",
          "Бінго, fork. Запам’ятай за зубцями: усе, що зручно наколоти або підчепити — салат, пасту, пиріг — просить fork.",
          "Cooker готує десь поруч, але на тарілці кнопки не потрібні. Для шматочків їжі потрібен fork."
        ],
        "es": [
          "Bowl sostiene la ensalada, pero no levanta los trozos. Imagen útil: bowl es el escenario; fork es la herramienta.",
          "Knife corta, pero fork lleva la comida hacia ti. Si el trozo ya está listo y hay que tomarlo, elige fork.",
          "Bien, fork. Recuerda sus dientes: lo que se pincha o se recoge — ensalada, pasta, pastel — pide fork.",
          "Cooker cocina cerca, pero en el plato no necesitas botones. Para los bocados necesitas fork."
        ],
        "pt-BR": [
          "Bowl segura a salada, mas não pega os pedaços. Imagem útil: bowl é o palco; fork é a ferramenta.",
          "Knife corta, mas fork leva a comida até você. Se o pedaço já está pronto para pegar, escolha fork.",
          "Certo, fork. Lembre dos dentes: o que dá para espetar ou pegar — salada, massa, bolo — pede fork.",
          "Cooker cozinha por perto, mas no prato você não precisa de botões. Para os pedaços, precisa de fork."
        ],
        "vi": [
          "Bowl giữ salad, nhưng không gắp miếng ăn lên. Hình ảnh nhớ: bowl là sân khấu, fork là dụng cụ trong tay.",
          "Knife cắt, còn fork đưa thức ăn lên cho bạn. Miếng đã sẵn sàng để lấy thì chọn fork.",
          "Đúng, fork. Nhớ bằng các răng nĩa: món có thể xiên hoặc gắp — salad, pasta, bánh — cần fork.",
          "Cooker nấu ăn ở gần đó, nhưng trên đĩa không cần nút bấm. Với miếng thức ăn, cần fork."
        ],
        "id": [
          "Bowl menahan salad, tetapi tidak mengangkat potongannya. Gambar ingat: bowl adalah panggung; fork alat di tangan.",
          "Knife memotong, sedangkan fork mengangkat makanan ke arahmu. Kalau potongannya sudah siap diambil, pilih fork.",
          "Benar, fork. Ingat geriginya: yang bisa ditusuk atau diangkat — salad, pasta, kue — memanggil fork.",
          "Cooker memasak di dekat sana, tetapi di piring kamu tidak butuh tombol. Untuk potongan makanan, perlu fork."
        ],
        "tr": [
          "Bowl salatayı tutar ama parçaları kaldırmaz. Görsel kural: bowl sahne, fork eldeki araçtır.",
          "Knife keser, fork yemeği sana doğru taşır. Parça hazırsa ve almak gerekiyorsa fork seç.",
          "Doğru, fork. Dişlerinden hatırla: batırılan veya alınan salata, makarna, kek fork ister.",
          "Cooker yakınlarda yemek pişirir ama tabakta düğme gerekmez. Lokmalar için fork gerekir."
        ],
        "pl": [
          "Bowl trzyma sałatkę, ale nie podnosi kawałków. Obrazek: bowl to scena, fork to narzędzie w dłoni.",
          "Knife kroi, a fork podnosi jedzenie do ciebie. Jeśli kawałek jest gotowy do wzięcia, wybierz fork.",
          "Dobrze, fork. Zapamiętaj po ząbkach: sałatka, makaron i ciasto, które da się nabić albo podnieść, proszą o fork.",
          "Cooker gotuje gdzieś obok, ale na talerzu nie potrzebujesz przycisków. Do kawałków jedzenia potrzebujesz fork."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-011",
      "type": "mcq",
      "prompt": "How do you say “тарелка” in English?",
      "localizedPrompts": {
        "ru": "Как по-английски «тарелка»?",
        "uk": "Як по-англійськи «тарілка»?",
        "es": "¿Cómo se dice «plato» en inglés?",
        "pt-BR": "Como se diz “prato” em inglês?",
        "vi": "“cái đĩa” nói bằng tiếng Anh là gì?",
        "id": "Apa bahasa Inggrisnya “piring”?",
        "tr": "“tabak” İngilizce nasıl söylenir?",
        "pl": "Jak po angielsku powiedzieć „talerz”?"
      },
      "choices": [
        "plate",
        "bowl",
        "glass",
        "knife"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word for plate.",
      "skillTag": "kitchen_object_labels",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C11",
        "K11"
      ],
      "choiceRationales": [
        "Plate names the flat dish used for serving or eating food in the tested kitchen context.",
        "Bowl is a plausible same-table item, but it is deep rather than flat.",
        "Glass is a plausible mealtime item, but it is for drinks rather than food on a plate.",
        "Knife is a kitchen tool for cutting, not the dish used to hold the meal."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! Plate — тарелка: обычно плоская посуда для еды. Простое слово для обычной тарелки на столе.",
          "Bowl — миска, она глубже. Для супа bowl прекрасно, но обычная «тарелка» — plate.",
          "Glass — стакан для напитка. Он не заменяет тарелку; слово «тарелка» по-английски — plate.",
          "Knife — нож. Он режет еду, но не является посудой; «тарелка» — plate."
        ],
        "uk": [
          "Бінго! Plate — тарілка для їжі. Уяви вечерю, що красиво лежить перед тобою: без plate їй бракує сцени.",
          "Bowl глибша й любить суп або пластівці. Якщо котлета просто лежить перед тобою, їй потрібен plate.",
          "Glass тримає напій, а не вечерю. Вода йде в glass, а їжа на пласку сцену — plate.",
          "Knife ріже їжу, але не подає її. Коли потрібен предмет під вечерю, обирай plate."
        ],
        "es": [
          "Bien. Plate es el plato para comida. Imagina la cena puesta delante de ti: sin plate le falta escenario.",
          "Bowl es más profundo y ama sopa o cereal. Si la comida solo descansa delante de ti, necesita plate.",
          "Glass guarda bebida, no la cena. Agua en glass; comida en una escena plana: plate.",
          "Knife corta comida, pero no la sirve. Si necesitas dónde poner la cena, elige plate."
        ],
        "pt-BR": [
          "Certo. Plate é o prato para comida. Imagine o jantar na sua frente: sem plate, ele fica sem palco.",
          "Bowl é mais fundo e ama sopa ou cereal. Se a comida só fica na sua frente, precisa de plate.",
          "Glass segura bebida, não o jantar. Água vai no glass; comida no palco plano: plate.",
          "Knife corta comida, mas não serve de prato. Para colocar o jantar, escolha plate."
        ],
        "vi": [
          "Đúng. Plate là đĩa đựng đồ ăn. Hãy tưởng tượng bữa tối trước mặt bạn: không có plate thì món ăn thiếu sân khấu.",
          "Bowl sâu hơn và hợp với súp hoặc ngũ cốc. Miếng ăn nằm trước mặt bạn cần plate.",
          "Glass đựng đồ uống, không đựng bữa tối. Nước vào glass; đồ ăn lên mặt phẳng plate.",
          "Knife cắt thức ăn, nhưng không bày món ăn. Cần chỗ đặt bữa tối thì chọn plate."
        ],
        "id": [
          "Benar. Plate adalah piring untuk makanan. Bayangkan makan malam di depanmu: tanpa plate, makanannya tak punya panggung.",
          "Bowl lebih dalam dan cocok untuk sup atau sereal. Kalau makanan hanya berbaring di depanmu, perlu plate.",
          "Glass menampung minuman, bukan makan malam. Air masuk glass; makanan naik ke panggung datar: plate.",
          "Knife memotong makanan, tetapi tidak menyajikannya. Untuk tempat makan malam, pilih plate."
        ],
        "tr": [
          "Doğru. Plate yemek tabağıdır. Önündeki akşam yemeğini düşün: plate yoksa yemeğin sahnesi eksik kalır.",
          "Bowl daha derindir, çorba ve gevrek sever. Yemek önünde düz duruyorsa ona plate gerekir.",
          "Glass içecek tutar, akşam yemeğini değil. Su glass içine, yemek düz sahneye: plate.",
          "Knife yemeği keser ama servis etmez. Akşam yemeğini koyacak yüzey gerekiyorsa plate seç."
        ],
        "pl": [
          "Dobrze. Plate to talerz na jedzenie. Wyobraź sobie kolację przed sobą: bez plate brakuje jej sceny.",
          "Bowl jest głębszy i lubi zupę albo płatki. Jeśli jedzenie leży przed tobą, potrzebuje plate.",
          "Glass trzyma napój, nie obiad. Woda idzie do glass, a jedzenie na płaską scenę: plate.",
          "Knife kroi jedzenie, ale go nie podaje. Gdy potrzebujesz miejsca pod obiad, wybierz plate."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-012",
      "type": "mcq",
      "prompt": "How do you say “стакан” in English?",
      "localizedPrompts": {
        "ru": "Как по-английски «стакан»?",
        "uk": "Як по-англійськи «склянка»?",
        "es": "¿Cómo se dice «vaso» en inglés?",
        "pt-BR": "Como se diz “copo” em inglês?",
        "vi": "“cái ly” nói bằng tiếng Anh là gì?",
        "id": "Apa bahasa Inggrisnya “gelas”?",
        "tr": "“bardak” İngilizce nasıl söylenir?",
        "pl": "Jak po angielsku powiedzieć „szklanka”?"
      },
      "choices": [
        "cup",
        "glass",
        "plate",
        "fork"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English kitchen word for glass.",
      "skillTag": "kitchen_object_labels",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C12",
        "K12"
      ],
      "choiceRationales": [
        "Glass names the drinking container needed for this prompt.",
        "Cup is plausible for tea or coffee, but the tested word is a general glass.",
        "Plate is for food, not the drinking container.",
        "Fork is used to pick up food, not to hold a drink."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Cup — чашка, чаще для чая или кофе. Если нужен стакан для воды или сока, правильнее glass.",
          "Бинго! Glass — стакан. В кухонной теме a glass часто значит стакан для воды, сока или лимонада.",
          "Plate — тарелка для еды. Напиток с тарелки — плохой план; для стакана нужен glass.",
          "Fork — вилка. Ею едят, а не пьют; для воды, сока или лимонада выбирай glass."
        ],
        "uk": [
          "Cup — чашка, частіше для чаю або кави. Якщо потрібна склянка для води чи соку, точніше glass.",
          "Бінго! Glass — склянка. Уяви холодну воду в руці: прозорий посуд, ковток, і слово glass уже на місці.",
          "Plate тримає їжу. Напій із тарілки втече, тому для води потрібен glass.",
          "Fork підчіплює їжу, але напої не ловить. Для води в руці обирай glass."
        ],
        "es": [
          "Cup suele ir con té o café. Si imaginas un vaso transparente con agua, piensa en glass.",
          "Bien. Glass es vaso. Imagina agua fría en la mano: recipiente transparente, un sorbo, y glass encaja.",
          "Plate sostiene comida. Una bebida se escaparía del plato, así que usa glass.",
          "Fork levanta comida, no bebidas. Para agua en la mano, elige glass."
        ],
        "pt-BR": [
          "Cup costuma ir com chá ou café. Se imagina um copo transparente com água, pense em glass.",
          "Certo. Glass é copo. Imagine água gelada na mão: recipiente transparente, um gole, e glass encaixa.",
          "Plate segura comida. Bebida fugiria do prato, então use glass.",
          "Fork pega comida, não bebida. Para água na mão, escolha glass."
        ],
        "vi": [
          "Cup thường đi với trà hoặc cà phê. Nếu hình dung ly trong suốt có nước, hãy nghĩ tới glass.",
          "Đúng. Glass là cái ly/cốc. Tưởng tượng nước lạnh trong tay: đồ trong suốt, một ngụm, và glass khớp ngay.",
          "Plate giữ đồ ăn. Đồ uống sẽ chạy khỏi đĩa, nên cần glass.",
          "Fork gắp đồ ăn, không giữ đồ uống. Cầm nước trên tay thì chọn glass."
        ],
        "id": [
          "Cup sering dekat dengan teh atau kopi. Kalau membayangkan gelas bening berisi air, pikirkan glass.",
          "Benar. Glass adalah gelas. Bayangkan air dingin di tangan: wadah bening, satu teguk, dan glass pas.",
          "Plate menahan makanan. Minuman akan kabur dari piring, jadi pakai glass.",
          "Fork mengangkat makanan, bukan minuman. Untuk air di tangan, pilih glass."
        ],
        "tr": [
          "Cup genelde çay ve kahveyle gezer. Şeffaf su bardağı hayal ediyorsan glass düşün.",
          "Doğru. Glass bardaktır. Elinde soğuk su düşün: şeffaf kap, bir yudum, glass tam yerine oturur.",
          "Plate yemek tutar. İçecek tabaktan kaçar, bu yüzden glass gerekir.",
          "Fork yemeği alır, içeceği tutmaz. Elde su varsa glass seç."
        ],
        "pl": [
          "Cup częściej chodzi z herbatą lub kawą. Jeśli widzisz przezroczystą szklankę wody, myśl glass.",
          "Dobrze. Glass to szklanka. Wyobraź sobie zimną wodę w dłoni: przezroczyste naczynie, łyk i glass pasuje.",
          "Plate trzyma jedzenie. Napój ucieknie z talerza, więc potrzebujesz glass.",
          "Fork podnosi jedzenie, nie napoje. Do wody w dłoni wybierz glass."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-013",
      "type": "mcq",
      "prompt": "How do you say “духовка” in English?",
      "localizedPrompts": {
        "ru": "Как по-английски «духовка»?",
        "uk": "Як по-англійськи «духовка»?",
        "es": "¿Cómo se dice «horno» en inglés?",
        "pt-BR": "Como se diz “forno” em inglês?",
        "vi": "“lò nướng” nói bằng tiếng Anh là gì?",
        "id": "Apa bahasa Inggrisnya “oven”?",
        "tr": "“fırın” İngilizce nasıl söylenir?",
        "pl": "Jak po angielsku powiedzieć „piekarnik”?"
      },
      "choices": [
        "cooker",
        "fridge",
        "oven",
        "cupboard"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose the English kitchen word for oven.",
      "skillTag": "kitchen_object_labels",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C13",
        "K13"
      ],
      "choiceRationales": [
        "Cooker is related to cooking but is not the specific baking appliance in this prompt.",
        "Fridge keeps food cold, which conflicts with the baking context.",
        "Oven is the appliance used for baking food.",
        "Cupboard stores items and does not bake food."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Cooker — более широкое слово для устройства готовки. Духовка как отдельная горячая камера — oven.",
          "Fridge — холодильник, он охлаждает. Oven делает противоположное: нагревает и запекает.",
          "Бинго! Oven — духовка: закрытая горячая камера для выпечки и запекания. Слово сразу ведёт к жару внутри.",
          "Cupboard — шкафчик для хранения. Он может держать противень, но не нагревает еду; духовка — oven."
        ],
        "uk": [
          "Cooker ширше: це техніка для готування. Але якщо всередині жарко й печеться пиріг, точніше oven.",
          "Fridge робить їжу холодною. Для випічки потрібна протилежна планета — oven.",
          "Бінго! Oven — духовка. Це гаряча шафа кухні: зачиняєш дверцята, чекаєш, і їжа виходить уже іншою особистістю.",
          "Cupboard зберігає форми й дека, але не пече. Гаряча коробка для випічки — oven."
        ],
        "es": [
          "Cooker es más general. Si dentro hace calor y se hornea un pastel, la palabra precisa es oven.",
          "Fridge enfría comida. Para hornear necesitas el planeta contrario: oven.",
          "Bien. Oven es horno. Es el armario caliente de la cocina: cierras la puerta y la comida sale transformada.",
          "Cupboard guarda moldes y bandejas, pero no hornea. La caja caliente para baking es oven."
        ],
        "pt-BR": [
          "Cooker é mais geral. Se por dentro está quente e um bolo assa, a palavra precisa é oven.",
          "Fridge esfria comida. Para assar, você precisa do planeta oposto: oven.",
          "Certo. Oven é forno. É o armário quente da cozinha: você fecha a porta e a comida sai transformada.",
          "Cupboard guarda formas e assadeiras, mas não assa. A caixa quente da cozinha é oven."
        ],
        "vi": [
          "Cooker là từ rộng hơn. Nếu bên trong nóng và bánh đang nướng, từ chính xác hơn là oven.",
          "Fridge làm đồ ăn lạnh. Để nướng bánh, bạn cần “hành tinh” ngược lại: oven.",
          "Đúng. Oven là lò nướng. Nó như chiếc tủ nóng của bếp: đóng cửa lại, chờ một lúc, món ăn đổi hẳn tính cách.",
          "Cupboard cất khay và khuôn, nhưng không nướng. Hộp nóng để bake là oven."
        ],
        "id": [
          "Cooker lebih umum. Kalau bagian dalamnya panas dan kue sedang dipanggang, kata tepatnya oven.",
          "Fridge membuat makanan dingin. Untuk memanggang, kamu butuh planet sebaliknya: oven.",
          "Benar. Oven adalah oven. Ini lemari panas di dapur: pintunya ditutup, ditunggu, lalu makanan keluar berubah.",
          "Cupboard menyimpan loyang dan cetakan, tetapi tidak memanggang. Kotak panas untuk baking adalah oven."
        ],
        "tr": [
          "Cooker daha genel bir kelimedir. İçerisi sıcak ve kek pişiyorsa daha net kelime oven.",
          "Fridge yiyeceği soğutur. Pişirmek için zıt gezegen gerekir: oven.",
          "Doğru. Oven fırındır. Mutfağın sıcak dolabı gibi: kapağı kapatırsın, beklersin, yemek bambaşka çıkar.",
          "Cupboard kalıp ve tepsi saklar ama pişirmez. Baking için sıcak kutu oven olur."
        ],
        "pl": [
          "Cooker jest szerszym słowem. Jeśli w środku jest gorąco i piecze się ciasto, dokładniej będzie oven.",
          "Fridge chłodzi jedzenie. Do pieczenia potrzebujesz odwrotnej planety: oven.",
          "Dobrze. Oven to piekarnik. To gorąca szafka kuchni: zamykasz drzwiczki, czekasz, a jedzenie wychodzi odmienione.",
          "Cupboard trzyma foremki i blachy, ale nie piecze. Gorące pudełko do baking to oven."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-014",
      "type": "mcq",
      "prompt": "How do you say “холодильник” in English?",
      "localizedPrompts": {
        "ru": "Как по-английски «холодильник»?",
        "uk": "Як по-англійськи «холодильник»?",
        "es": "¿Cómo se dice «nevera» en inglés?",
        "pt-BR": "Como se diz “geladeira” em inglês?",
        "vi": "“tủ lạnh” nói bằng tiếng Anh là gì?",
        "id": "Apa bahasa Inggrisnya “kulkas”?",
        "tr": "“buzdolabı” İngilizce nasıl söylenir?",
        "pl": "Jak po angielsku powiedzieć „lodówka”?"
      },
      "choices": [
        "oven",
        "cupboard",
        "kettle",
        "fridge"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose the English kitchen word for fridge.",
      "skillTag": "kitchen_object_labels",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C14",
        "K14"
      ],
      "choiceRationales": [
        "Oven heats food, which is the opposite of the tested cold-storage meaning.",
        "Cupboard stores dry items but does not keep food cold.",
        "Kettle boils water and is not used for cold storage.",
        "Fridge is the appliance used to keep food cold."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Oven — духовка, она греет. Если нужен холод и хранение продуктов, правильный вариант — fridge.",
          "Cupboard — шкафчик для сухих вещей. Молоко там быстро устроит драму; холодильник — fridge.",
          "Kettle — чайник для кипячения воды. Для холодного хранения еды нужен fridge.",
          "Точно, fridge — холодильник. Это короткое разговорное слово для refrigerator, удобное как быстрый поход за соком."
        ],
        "uk": [
          "Oven гріє, а тут потрібен холод. Якщо сир має дожити до завтра, він іде не в oven, а в fridge.",
          "Cupboard зберігає сухі речі. Молоко там швидко влаштує драму, тому йому потрібен fridge.",
          "Kettle кип’ятить воду. Для холоду й продуктів це зовсім не той герой: потрібен fridge.",
          "Точно, fridge — холодильник. Там їжа чекає в холоді, а сік лишається бадьорим, ніби має маленьку відпустку."
        ],
        "es": [
          "Oven calienta, y aquí hace falta frío. Si el queso debe sobrevivir hasta mañana, va a fridge.",
          "Cupboard guarda cosas secas. La leche allí monta un drama; necesita fridge.",
          "Kettle hierve agua. Para frío y comida guardada, el héroe es fridge.",
          "Exacto, fridge es nevera. Allí la comida espera en frío y el jugo se mantiene fresco, como de vacaciones."
        ],
        "pt-BR": [
          "Oven esquenta, e aqui precisamos de frio. Se o queijo precisa sobreviver até amanhã, vai para fridge.",
          "Cupboard guarda coisas secas. Leite ali vira drama; precisa de fridge.",
          "Kettle ferve água. Para frio e comida guardada, o herói é fridge.",
          "Isso, fridge é geladeira. Lá a comida espera no frio e o suco fica esperto, quase de férias."
        ],
        "vi": [
          "Oven làm nóng, còn ở đây cần lạnh. Phô mai muốn sống tới mai thì không vào oven, mà vào fridge.",
          "Cupboard cất đồ khô. Sữa ở đó sẽ thành bi kịch, nên cần fridge.",
          "Kettle đun nước. Với đồ ăn cần giữ lạnh, nhân vật đúng là fridge.",
          "Đúng, fridge là tủ lạnh. Đồ ăn chờ trong cái lạnh, còn nước ép giữ được vẻ tươi tỉnh."
        ],
        "id": [
          "Oven memanaskan, sedangkan di sini perlu dingin. Keju yang mau selamat sampai besok masuk fridge.",
          "Cupboard menyimpan barang kering. Susu di sana akan jadi drama; ia butuh fridge.",
          "Kettle merebus air. Untuk makanan dingin dan disimpan, pahlawannya fridge.",
          "Tepat, fridge adalah kulkas. Di sana makanan menunggu dalam dingin, dan jus tetap segar seperti sedang liburan."
        ],
        "tr": [
          "Oven ısıtır, burada soğuk gerekir. Peynir yarına kadar yaşasın istiyorsan oven değil fridge.",
          "Cupboard kuru şeyleri saklar. Süt orada drama çıkarır; ona fridge gerekir.",
          "Kettle su kaynatır. Soğukta saklanan yiyecek için doğru kahraman fridge.",
          "Aynen, fridge buzdolabıdır. Yiyecek orada soğukta bekler, meyve suyu da küçük tatildeymiş gibi taze kalır."
        ],
        "pl": [
          "Oven grzeje, a tu potrzebny jest chłód. Jeśli ser ma dotrwać do jutra, idzie do fridge.",
          "Cupboard trzyma suche rzeczy. Mleko zrobi tam dramat, więc potrzebuje fridge.",
          "Kettle gotuje wodę. Do zimna i przechowywania jedzenia właściwy bohater to fridge.",
          "Dokładnie, fridge to lodówka. Tam jedzenie czeka w chłodzie, a sok zostaje rześki jak na małych wakacjach."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-015",
      "type": "mcq",
      "prompt": "How do you say “чайник” in English?",
      "localizedPrompts": {
        "ru": "Как по-английски «чайник»?",
        "uk": "Як по-англійськи «чайник»?",
        "es": "¿Cómo se dice «hervidor» en inglés?",
        "pt-BR": "Como se diz “chaleira” em inglês?",
        "vi": "“ấm đun nước” nói bằng tiếng Anh là gì?",
        "id": "Apa bahasa Inggrisnya “ketel”?",
        "tr": "“su ısıtıcısı” İngilizce nasıl söylenir?",
        "pl": "Jak po angielsku powiedzieć „czajnik”?"
      },
      "choices": [
        "bowl",
        "kettle",
        "pan",
        "fork"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English kitchen word for kettle.",
      "skillTag": "kitchen_object_labels",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C15",
        "K15"
      ],
      "choiceRationales": [
        "Bowl holds food but is not the item used to boil water.",
        "Kettle is the item used to boil water for tea or similar drinks.",
        "Pan is plausible cookware but not the specific tea-water item.",
        "Fork is a utensil for eating and does not boil water."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Bowl — миска. Она может держать суп, но воду для чая не кипятит; слово «чайник» — kettle.",
          "Бинго! Kettle — чайник. Его главная работа — кипятить воду для чая, кофе или чего-то срочно горячего.",
          "Pan — сковорода или кастрюля по контексту. Обычный чайник для воды — kettle.",
          "Fork — вилка. Она не кипятит воду, как бы уверенно ни лежала рядом; «чайник» — kettle."
        ],
        "uk": [
          "Bowl тримає суп або пластівці, але воду для чаю не кип’ятить. Для “вжух, чай готовий” потрібен kettle.",
          "Бінго! Kettle — чайник. Уяви мить перед чаєм: вода ще не в чашці, вона спершу шумить у kettle.",
          "Pan можна поставити на плиту, але чайна сцена зазвичай просить kettle, а не мандрівну сковорідку.",
          "Fork їсть пасту, але воду не кип’ятить. Якщо мета — чай, згадуй kettle."
        ],
        "es": [
          "Bowl guarda sopa o cereal, pero no hierve agua para té. Para “té listo”, necesitas kettle.",
          "Bien. Kettle es hervidor. Imagina el momento antes del té: el agua aún no está en la taza, suena en el kettle.",
          "Pan puede ir al fuego, pero la escena del té suele pedir kettle, no una sartén aventurera.",
          "Fork come pasta, pero no hierve agua. Si el objetivo es té, piensa en kettle."
        ],
        "pt-BR": [
          "Bowl segura sopa ou cereal, mas não ferve água para chá. Para “chá pronto”, precisa de kettle.",
          "Certo. Kettle é chaleira. Imagine antes do chá: a água ainda não está na xícara, ela primeiro faz barulho no kettle.",
          "Pan pode ir ao fogo, mas a cena do chá costuma pedir kettle, não uma panela aventureira.",
          "Fork come massa, mas não ferve água. Se a meta é chá, pense em kettle."
        ],
        "vi": [
          "Bowl đựng súp hoặc ngũ cốc, nhưng không đun nước pha trà. Muốn “trà sẵn sàng” thì cần kettle.",
          "Đúng. Kettle là ấm đun nước. Hãy tưởng tượng trước lúc pha trà: nước chưa vào cốc, nó đang reo trong kettle.",
          "Pan có thể lên bếp, nhưng cảnh pha trà thường cần kettle, không phải chảo đi lạc.",
          "Fork ăn mì, nhưng không đun nước. Nếu mục tiêu là trà, hãy nghĩ kettle."
        ],
        "id": [
          "Bowl menampung sup atau sereal, tetapi tidak merebus air teh. Untuk “teh siap”, perlu kettle.",
          "Benar. Kettle adalah ketel. Bayangkan sebelum teh siap: air belum masuk cangkir, ia dulu berbunyi di kettle.",
          "Pan bisa masuk kompor, tetapi adegan teh biasanya meminta kettle, bukan wajan petualang.",
          "Fork makan pasta, tetapi tidak merebus air. Kalau tujuannya teh, pikirkan kettle."
        ],
        "tr": [
          "Bowl çorba veya gevrek tutar ama çay suyu kaynatmaz. “Çay hazır” sahnesi kettle ister.",
          "Doğru. Kettle su ısıtıcısıdır. Çaydan önceki anı düşün: su bardağa değil, önce kettle içinde ses çıkarır.",
          "Pan ocağa gidebilir ama çay sahnesi genelde kettle ister, maceracı tava değil.",
          "Fork makarna yer ama su kaynatmaz. Amaç çaysa kettle düşün."
        ],
        "pl": [
          "Bowl trzyma zupę albo płatki, ale nie gotuje wody na herbatę. Do “herbata gotowa” potrzebujesz kettle.",
          "Dobrze. Kettle to czajnik. Wyobraź sobie chwilę przed herbatą: woda nie jest jeszcze w kubku, najpierw szumi w kettle.",
          "Pan może trafić na kuchenkę, ale scena z herbatą zwykle prosi o kettle, nie wędrującą patelnię.",
          "Fork je makaron, ale nie gotuje wody. Jeśli celem jest herbata, myśl kettle."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-016",
      "type": "mcq",
      "prompt": "How do you say “раковина” in English?",
      "localizedPrompts": {
        "ru": "Как по-английски «раковина»?",
        "uk": "Як по-англійськи «раковина»?",
        "es": "¿Cómo se dice «fregadero» en inglés?",
        "pt-BR": "Como se diz “pia” em inglês?",
        "vi": "“bồn rửa” nói bằng tiếng Anh là gì?",
        "id": "Apa bahasa Inggrisnya “wastafel”?",
        "tr": "“lavabo” İngilizce nasıl söylenir?",
        "pl": "Jak po angielsku powiedzieć „zlew”?"
      },
      "choices": [
        "shelf",
        "towel",
        "sink",
        "oven"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose the English kitchen word for sink.",
      "skillTag": "kitchen_object_labels",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C16",
        "K16"
      ],
      "choiceRationales": [
        "Shelf is for storage and does not name the washing basin.",
        "Towel dries things after washing, but is not the basin.",
        "Sink is the basin used for washing dishes or food.",
        "Oven heats food and does not match the washing-basin meaning."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Shelf — полка. На ней стоят вещи, но раковина или мойка по-английски — sink.",
          "Towel — полотенце. Им вытирают руки или посуду, но место под краном называется sink.",
          "Бинго! Sink — раковина или мойка. Это место под краном, где начинается большая жизнь посуды.",
          "Oven — духовка, она греет. Если речь о воде и мойке, нужен sink."
        ],
        "uk": [
          "Shelf — полиця: там стоять чашки, але посуд вона не миє. Водна точка кухні — sink.",
          "Towel з’являється після води, щоб витерти. Але місце, де починається миття, називається sink.",
          "Бінго! Sink — раковина. Уяви місце під краном, де тарілки стають мокрими, шумними й нарешті чистими.",
          "Oven гріє їжу, а sink приймає воду. Якщо мова про миття, духовку відпускаємо відпочити."
        ],
        "es": [
          "Shelf es estante: allí viven tazas, pero no se lavan platos. El punto de agua es sink.",
          "Towel aparece después del agua para secar. El lugar donde empieza el lavado es sink.",
          "Bien. Sink es fregadero. Imagina el lugar bajo el grifo donde los platos se mojan, hacen ruido y salen limpios.",
          "Oven calienta comida; sink recibe agua. Si hablamos de lavar, el horno descansa."
        ],
        "pt-BR": [
          "Shelf é prateleira: copos moram ali, mas pratos não são lavados. O ponto de água é sink.",
          "Towel aparece depois da água para secar. O lugar onde a lavagem começa é sink.",
          "Certo. Sink é pia. Imagine o lugar debaixo da torneira onde os pratos molham, fazem barulho e saem limpos.",
          "Oven esquenta comida; sink recebe água. Se é sobre lavar, o forno fica de folga."
        ],
        "vi": [
          "Shelf là kệ: cốc đứng ở đó, nhưng bát đĩa không được rửa ở đó. Điểm có nước là sink.",
          "Towel xuất hiện sau nước để lau khô. Nơi bắt đầu việc rửa là sink.",
          "Đúng. Sink là bồn rửa. Hãy nghĩ tới chỗ dưới vòi nước, nơi bát đĩa ướt, leng keng rồi sạch trở lại.",
          "Oven làm nóng đồ ăn; sink nhận nước. Nói về rửa thì lò nướng được nghỉ."
        ],
        "id": [
          "Shelf adalah rak: gelas tinggal di sana, tetapi piring tidak dicuci di sana. Titik air dapur adalah sink.",
          "Towel muncul setelah air untuk mengeringkan. Tempat mencuci dimulai adalah sink.",
          "Benar. Sink adalah bak cuci. Bayangkan tempat di bawah keran, saat piring basah, berisik, lalu akhirnya bersih.",
          "Oven memanaskan makanan; sink menerima air. Kalau membahas mencuci, oven boleh istirahat."
        ],
        "tr": [
          "Shelf raftır: bardaklar orada durur ama tabaklar orada yıkanmaz. Mutfağın su noktası sink.",
          "Towel sudan sonra kurutmak için gelir. Yıkamanın başladığı yer sink olur.",
          "Doğru. Sink lavabo/evyedir. Musluğun altındaki yeri düşün: tabaklar ıslanır, ses çıkarır ve temiz çıkar.",
          "Oven yemeği ısıtır; sink suyu karşılar. Konu yıkamaysa fırın dinlenebilir."
        ],
        "pl": [
          "Shelf to półka: kubki tam stoją, ale naczyń się tam nie myje. Wodny punkt kuchni to sink.",
          "Towel pojawia się po wodzie, żeby wytrzeć. Miejsce, gdzie zaczyna się mycie, to sink.",
          "Dobrze. Sink to zlew. Wyobraź sobie miejsce pod kranem, gdzie talerze robią się mokre, głośne i wreszcie czyste.",
          "Oven grzeje jedzenie, a sink przyjmuje wodę. Przy myciu piekarnik odpoczywa."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-017",
      "type": "mcq",
      "prompt": "How do you say “микроволновка” in English?",
      "localizedPrompts": {
        "ru": "Как по-английски «микроволновка»?",
        "uk": "Як по-англійськи «мікрохвильовка»?",
        "es": "¿Cómo se dice «microondas» en inglés?",
        "pt-BR": "Como se diz “micro-ondas” em inglês?",
        "vi": "“lò vi sóng” nói bằng tiếng Anh là gì?",
        "id": "Apa bahasa Inggrisnya “microwave”?",
        "tr": "“mikrodalga” İngilizce nasıl söylenir?",
        "pl": "Jak po angielsku powiedzieć „mikrofalówka”?"
      },
      "choices": [
        "toaster",
        "fridge",
        "kettle",
        "microwave"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose the English kitchen word for microwave.",
      "skillTag": "kitchen_object_labels",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C17",
        "K17"
      ],
      "choiceRationales": [
        "Toaster heats bread specifically and is not the general quick-heating appliance.",
        "Fridge keeps food cold, the opposite of this prompt.",
        "Kettle boils water and does not heat a plate of food.",
        "Microwave is the appliance used to heat food quickly."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Toaster — тостер для хлеба. Микроволновка для быстрого разогрева еды — microwave.",
          "Fridge — холодильник, он охлаждает. Microwave делает обратное: быстро греет еду.",
          "Kettle — чайник для воды. Тарелку с едой он не разогреет; для этого нужна microwave.",
          "Точно, microwave — микроволновка. Это прибор для быстрого разогрева еды, особенно когда ждать совсем не хочется."
        ],
        "uk": [
          "Toaster працює з хлібом. Якщо тарілка супу крутиться й за хвилину гаряча, це microwave.",
          "Fridge охолоджує. Для швидкого розігріву потрібна не холодна шафа, а microwave.",
          "Kettle кип’ятить воду для чаю. Обід у тарілці він не розігріє: для цього microwave.",
          "Точно, microwave. Уяви тарілку, що повільно крутиться за склом, а вчорашній суп знову стає гарячим."
        ],
        "es": [
          "Toaster trabaja con pan. Si el plato de sopa gira y sale caliente en un minuto, es microwave.",
          "Fridge enfría. Para calentar rápido no necesitas armario frío, sino microwave.",
          "Kettle hierve agua para té. No calienta tu plato de comida; para eso está microwave.",
          "Exacto, microwave. Imagina el plato girando detrás del cristal mientras la sopa de ayer vuelve a estar caliente."
        ],
        "pt-BR": [
          "Toaster trabalha com pão. Se o prato de sopa gira e sai quente em um minuto, é microwave.",
          "Fridge esfria. Para aquecer rápido, não precisa de armário frio; precisa de microwave.",
          "Kettle ferve água para chá. Não esquenta seu prato de comida; para isso existe microwave.",
          "Isso, microwave. Imagine o prato girando atrás do vidro enquanto a sopa de ontem volta a ficar quente."
        ],
        "vi": [
          "Toaster làm việc với bánh mì. Đĩa súp quay rồi nóng sau một phút thì đó là microwave.",
          "Fridge làm lạnh. Muốn hâm nóng nhanh thì không cần tủ lạnh, cần microwave.",
          "Kettle đun nước pha trà. Nó không hâm nóng cả đĩa thức ăn; việc đó là của microwave.",
          "Đúng, microwave. Hãy tưởng tượng chiếc đĩa quay sau lớp kính và bát súp hôm qua nóng lại."
        ],
        "id": [
          "Toaster bekerja dengan roti. Kalau piring sup berputar lalu panas dalam semenit, itu microwave.",
          "Fridge mendinginkan. Untuk memanaskan cepat, bukan lemari dingin yang dibutuhkan, tetapi microwave.",
          "Kettle merebus air teh. Ia tidak memanaskan sepiring makanan; itu tugas microwave.",
          "Tepat, microwave. Bayangkan piring berputar pelan di balik kaca, lalu sup kemarin hangat lagi."
        ],
        "tr": [
          "Toaster ekmekle çalışır. Çorba tabağı dönüp bir dakikada ısınıyorsa bu microwave.",
          "Fridge soğutur. Hızlı ısıtma için soğuk dolap değil, microwave gerekir.",
          "Kettle çay suyu kaynatır. Tabaktaki yemeği ısıtmaz; o iş microwave işi.",
          "Aynen, microwave. Camın arkasında yavaşça dönen tabağı ve dünün çorbasının yeniden ısınmasını düşün."
        ],
        "pl": [
          "Toaster pracuje z chlebem. Jeśli talerz zupy kręci się i po minucie jest gorący, to microwave.",
          "Fridge chłodzi. Do szybkiego podgrzania potrzebujesz nie zimnej szafy, tylko microwave.",
          "Kettle gotuje wodę na herbatę. Obiadu na talerzu nie podgrzeje; od tego jest microwave.",
          "Dokładnie, microwave. Wyobraź sobie talerz kręcący się za szybką, a wczorajszą zupę znów gorącą."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-018",
      "type": "mcq",
      "prompt": "How do you say “тостер” in English?",
      "localizedPrompts": {
        "ru": "Как по-английски «тостер»?",
        "uk": "Як по-англійськи «тостер»?",
        "es": "¿Cómo se dice «tostadora» en inglés?",
        "pt-BR": "Como se diz “torradeira” em inglês?",
        "vi": "“máy nướng bánh mì” nói bằng tiếng Anh là gì?",
        "id": "Apa bahasa Inggrisnya “pemanggang roti”?",
        "tr": "“ekmek kızartma makinesi” İngilizce nasıl söylenir?",
        "pl": "Jak po angielsku powiedzieć „toster”?"
      },
      "choices": [
        "kettle",
        "toaster",
        "oven",
        "sink"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English kitchen word for toaster.",
      "skillTag": "kitchen_object_labels",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C18",
        "K18"
      ],
      "choiceRationales": [
        "Kettle boils water and does not toast bread.",
        "Toaster is the appliance used to toast bread.",
        "Oven can bake, but the specific small bread-toasting appliance is toaster.",
        "Sink is for washing and does not toast bread."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Kettle — чайник для воды. Хлеб он не подрумянит; тостер по-английски — toaster.",
          "Бинго! Toaster — тостер: небольшой прибор, который подрумянивает ломтики хлеба.",
          "Oven — духовка, она шире по функциям. Отдельный прибор для тостов называется toaster.",
          "Sink — раковина для мытья. Тостер — toaster; вода и хлеб тут лучше не знакомить."
        ],
        "uk": [
          "Kettle кип’ятить воду. Хліб у ньому влаштує сумний суп, а не тост — потрібен toaster.",
          "Бінго! Toaster — тостер. Це маленький ранковий апарат: хліб заходить блідим, а виходить хрустким і задоволеним.",
          "Oven може гріти й пекти, але маленький ранковий апарат для хліба — toaster.",
          "Sink миє посуд. Хліб після sink стане мокрою драмою, а не тостом: потрібен toaster."
        ],
        "es": [
          "Kettle hierve agua. El pan allí sería una sopa triste, no toast; necesitas toaster.",
          "Bien. Toaster es tostadora. Es la máquina de la mañana: el pan entra pálido y sale crujiente.",
          "Oven puede calentar y hornear, pero el aparato pequeño del desayuno es toaster.",
          "Sink lava platos. El pan después de sink queda drama mojado, no tostada: toaster."
        ],
        "pt-BR": [
          "Kettle ferve água. Pão ali viraria sopa triste, não toast; precisa de toaster.",
          "Certo. Toaster é torradeira. É a máquina da manhã: o pão entra pálido e sai crocante.",
          "Oven pode aquecer e assar, mas o aparelho pequeno do café da manhã é toaster.",
          "Sink lava louça. Pão depois de sink vira drama molhado, não torrada: toaster."
        ],
        "vi": [
          "Kettle đun nước. Bánh mì ở đó sẽ thành món súp buồn, không phải toast; cần toaster.",
          "Đúng. Toaster là máy nướng bánh mì. Đó là chiếc máy buổi sáng: bánh mì vào nhạt màu, ra giòn rụm.",
          "Oven có thể nướng, nhưng thiết bị nhỏ cho lát bánh mì buổi sáng là toaster.",
          "Sink dùng để rửa. Bánh mì sau sink sẽ thành bi kịch ướt, không phải toast: toaster."
        ],
        "id": [
          "Kettle merebus air. Roti di sana jadi sup sedih, bukan toast; perlu toaster.",
          "Benar. Toaster adalah pemanggang roti. Ini mesin pagi hari: roti masuk pucat, keluar renyah.",
          "Oven bisa memanaskan dan memanggang, tetapi alat kecil untuk roti pagi adalah toaster.",
          "Sink untuk mencuci. Roti setelah sink jadi drama basah, bukan toast: toaster."
        ],
        "tr": [
          "Kettle su kaynatır. Ekmek içinde üzgün çorbaya döner, toast olmaz; toaster gerekir.",
          "Doğru. Toaster ekmek kızartma makinesidir. Sabah makinesi gibi: ekmek solgun girer, çıtır çıkar.",
          "Oven ısıtıp pişirebilir ama kahvaltı ekmeğinin küçük makinesi toaster.",
          "Sink bulaşık yıkar. Ekmek sink sonrası ıslak drama olur, toast değil: toaster."
        ],
        "pl": [
          "Kettle gotuje wodę. Chleb w nim zrobi smutną zupę, nie toast; potrzebujesz toaster.",
          "Dobrze. Toaster to toster. To poranna maszyna: chleb wchodzi blady, a wychodzi chrupiący.",
          "Oven może grzać i piec, ale małe śniadaniowe urządzenie do chleba to toaster.",
          "Sink służy do mycia. Chleb po sink będzie mokrym dramatem, nie tostą: toaster."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-019",
      "type": "mcq",
      "prompt": "How do you say “фартук” in English?",
      "localizedPrompts": {
        "ru": "Как по-английски «фартук»?",
        "uk": "Як по-англійськи «фартух»?",
        "es": "¿Cómo se dice «delantal» en inglés?",
        "pt-BR": "Como se diz “avental” em inglês?",
        "vi": "“tạp dề” nói bằng tiếng Anh là gì?",
        "id": "Apa bahasa Inggrisnya “celemek”?",
        "tr": "“önlük” İngilizce nasıl söylenir?",
        "pl": "Jak po angielsku powiedzieć „fartuch”?"
      },
      "choices": [
        "apron",
        "towel",
        "plate",
        "fork"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word for apron.",
      "skillTag": "kitchen_object_labels",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C19",
        "K19"
      ],
      "choiceRationales": [
        "Apron is worn while cooking to protect clothes.",
        "Towel dries hands or dishes but is not worn as the protective cooking garment.",
        "Plate is a dish for food, not kitchen clothing.",
        "Fork is a utensil for eating and not clothing."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! Apron — фартук: защитная одежда на кухне. Он принимает на себя соус, муку и кухонные неожиданности.",
          "Towel — полотенце. Им вытирают руки или посуду, но фартук надевают на себя: apron.",
          "Plate — тарелка. Она держит еду, но одежду от пятен не защищает; нужен apron.",
          "Fork — вилка. Она помогает есть, но не спасает одежду во время готовки; фартук — apron."
        ],
        "uk": [
          "Бінго! Apron — фартух. Він стоїть між тобою і соусом, який раптом вирішив стати дизайнером футболки.",
          "Towel витирає руки, але не живе на тобі весь процес готування. Захист одягу — apron.",
          "Plate тримає їжу, а не плями. Якщо рятуємо одяг під час готування, потрібен apron.",
          "Fork допомагає їсти, але футболку від соусу не захистить. Для кухонної броні обирай apron."
        ],
        "es": [
          "Bien. Apron es delantal. Se pone entre tú y la salsa que decidió rediseñar tu camiseta.",
          "Towel seca manos, pero no se lleva durante toda la cocina. Para proteger ropa, apron.",
          "Plate sostiene comida, no manchas. Si salvamos la ropa al cocinar, necesitamos apron.",
          "Fork ayuda a comer, pero no protege la camiseta de la salsa. La armadura de cocina es apron."
        ],
        "pt-BR": [
          "Certo. Apron é avental. Ele fica entre você e o molho que resolveu redesenhar sua camiseta.",
          "Towel seca as mãos, mas não fica em você durante a receita toda. Para proteger roupa, apron.",
          "Plate segura comida, não manchas. Se a missão é salvar a roupa, precisa de apron.",
          "Fork ajuda a comer, mas não protege a camiseta do molho. A armadura da cozinha é apron."
        ],
        "vi": [
          "Đúng. Apron là tạp dề. Nó đứng giữa bạn và phần nước sốt bỗng muốn thiết kế lại áo.",
          "Towel lau tay, nhưng không mặc suốt lúc nấu. Muốn bảo vệ quần áo thì cần apron.",
          "Plate giữ đồ ăn, không giữ vết bẩn. Cứu áo khi nấu ăn thì cần apron.",
          "Fork giúp ăn, nhưng không cứu áo khỏi sốt. Áo giáp nhà bếp là apron."
        ],
        "id": [
          "Benar. Apron adalah celemek. Ia berdiri di antara kamu dan saus yang tiba-tiba ingin mendesain kausmu.",
          "Towel mengeringkan tangan, tetapi tidak dipakai sepanjang memasak. Pelindung pakaian adalah apron.",
          "Plate menahan makanan, bukan noda. Kalau menyelamatkan baju saat memasak, perlu apron.",
          "Fork membantu makan, tetapi tidak melindungi kaus dari saus. Armor dapur adalah apron."
        ],
        "tr": [
          "Doğru. Apron önlüktür. Seninle tişörtünü yeniden tasarlamak isteyen sosun arasında durur.",
          "Towel elleri kurutur ama tüm yemek boyunca üstünde yaşamaz. Kıyafet koruması apron.",
          "Plate yemek tutar, leke değil. Yemek yaparken kıyafeti kurtaracaksan apron gerekir.",
          "Fork yemek yemeye yardım eder ama tişörtü sostan korumaz. Mutfak zırhı apron olur."
        ],
        "pl": [
          "Dobrze. Apron to fartuch. Staje między tobą a sosem, który nagle chce projektować koszulkę.",
          "Towel wyciera ręce, ale nie nosisz go przez całe gotowanie. Ochrona ubrań to apron.",
          "Plate trzyma jedzenie, nie plamy. Jeśli ratujemy ubranie podczas gotowania, potrzebny jest apron.",
          "Fork pomaga jeść, ale nie ochroni koszulki przed sosem. Kuchenna zbroja to apron."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-020",
      "type": "mcq",
      "prompt": "How do you say “рецепт” in English?",
      "localizedPrompts": {
        "ru": "Как по-английски «рецепт»?",
        "uk": "Як по-англійськи «рецепт»?",
        "es": "¿Cómo se dice «receta» en inglés?",
        "pt-BR": "Como se diz “receita” em inglês?",
        "vi": "“công thức nấu ăn” nói bằng tiếng Anh là gì?",
        "id": "Apa bahasa Inggrisnya “resep”?",
        "tr": "“tarif” İngilizce nasıl söylenir?",
        "pl": "Jak po angielsku powiedzieć „przepis”?"
      },
      "choices": [
        "menu",
        "recipe",
        "receipt",
        "review"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English kitchen word for recipe.",
      "skillTag": "cooking_context_words",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C20",
        "K20"
      ],
      "choiceRationales": [
        "Menu lists dishes you can order, not the instructions to cook them.",
        "Recipe is the set of instructions for preparing a dish.",
        "Receipt is a payment record and is a common false friend for recipe.",
        "Review is an opinion about food or a place, not cooking instructions."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Menu — меню: список блюд, которые можно заказать. Recipe объясняет, как блюдо приготовить.",
          "Бинго! Recipe — рецепт: список ингредиентов и шагов приготовления. Это инструкция к блюду, а не просто название.",
          "Receipt — чек после оплаты. Похож на recipe, но вместо ужина даст бухгалтерию; рецепт — recipe.",
          "Review — отзыв. Он скажет “вкусно” или “так себе”, но шаги приготовления даёт recipe."
        ],
        "uk": [
          "Menu показує, що можна замовити. Але якщо потрібні кроки “що змішати й коли”, це recipe.",
          "Бінго! Recipe — рецепт. Це не просто назва страви, а покрокова доріжка: що взяти, змішати й коли зупинитися.",
          "Receipt — чек після оплати. Це підступний сусід слова recipe: схожий, але замість вечері дасть бухгалтерію.",
          "Review — відгук. Він скаже “смачно”, але не пояснить, як це приготувати. Потрібен recipe."
        ],
        "es": [
          "Menu dice qué puedes pedir. Si necesitas pasos para cocinar, la palabra es recipe.",
          "Bien. Recipe es receta. No es solo el nombre del plato: te dice qué tomar, qué mezclar y cuándo parar.",
          "Receipt es recibo de pago. Es el vecino tramposo de recipe: parecido, pero trae contabilidad.",
          "Review es reseña. Puede decir “rico”, pero no explica cómo cocinarlo. Necesitas recipe."
        ],
        "pt-BR": [
          "Menu mostra o que você pode pedir. Se precisa dos passos para cozinhar, a palavra é recipe.",
          "Certo. Recipe é receita. Não é só o nome do prato: ela diz o que pegar, misturar e quando parar.",
          "Receipt é recibo. É o vizinho traiçoeiro de recipe: parece, mas traz contabilidade.",
          "Review é avaliação. Pode dizer “gostoso”, mas não ensina a preparar. Precisa de recipe."
        ],
        "vi": [
          "Menu cho biết bạn có thể gọi món gì. Nếu cần các bước nấu ăn, từ đúng là recipe.",
          "Đúng. Recipe là công thức nấu ăn. Nó không chỉ gọi tên món, mà chỉ bạn lấy gì, trộn gì và dừng lúc nào.",
          "Receipt là hóa đơn. Nó giống recipe nguy hiểm ở chữ, nhưng đưa bạn tới kế toán.",
          "Review là đánh giá. Nó nói “ngon”, nhưng không chỉ cách nấu. Bạn cần recipe."
        ],
        "id": [
          "Menu menunjukkan apa yang bisa dipesan. Kalau butuh langkah memasak, katanya recipe.",
          "Benar. Recipe adalah resep. Bukan sekadar nama makanan, tetapi langkah: ambil apa, campur apa, berhenti kapan.",
          "Receipt adalah struk pembayaran. Mirip recipe, tetapi membawamu ke akuntansi, bukan dapur.",
          "Review adalah ulasan. Ia bisa bilang “enak”, tetapi tidak mengajari cara memasak. Perlu recipe."
        ],
        "tr": [
          "Menu ne sipariş edebileceğini gösterir. Pişirme adımları gerekiyorsa kelime recipe.",
          "Doğru. Recipe tariftir. Sadece yemeğin adı değil; ne alacağını, ne karıştıracağını ve nerede duracağını söyler.",
          "Receipt ödeme fişidir. Recipe kelimesinin sinsi komşusu: benzer ama yemeğe değil muhasebeye götürür.",
          "Review yorumdur. “Lezzetli” diyebilir ama nasıl yapılacağını anlatmaz. Recipe gerekir."
        ],
        "pl": [
          "Menu pokazuje, co można zamówić. Jeśli potrzebujesz kroków gotowania, słowo to recipe.",
          "Dobrze. Recipe to przepis. To nie tylko nazwa dania, ale kroki: co wziąć, co wymieszać i kiedy przestać.",
          "Receipt to paragon. To podstępny sąsiad recipe: podobny, ale prowadzi do księgowości.",
          "Review to recenzja. Powie “smaczne”, ale nie pokaże, jak to ugotować. Potrzebujesz recipe."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-021",
      "type": "mcq",
      "prompt": "Which English verb fits “boil water”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «кипятить воду»?",
        "uk": "Яке англійське дієслово потрібне для «кип’ятити воду»?",
        "es": "¿Qué verbo inglés se usa para «hervir agua»?",
        "pt-BR": "Qual verbo em inglês se usa para “ferver água”?",
        "vi": "Động từ tiếng Anh nào dùng cho “đun sôi nước”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “merebus air”?",
        "tr": "“Su kaynatmak” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „gotować wodę”?"
      },
      "choices": [
        "boil",
        "chop",
        "fry",
        "bake"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English cooking verb for boiling water.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C21",
        "K21"
      ],
      "choiceRationales": [
        "Boil is the verb for heating water until it bubbles.",
        "Chop means cut into pieces and does not fit water.",
        "Fry uses oil and a pan, not plain water.",
        "Bake uses an oven and does not match boiling water."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! Boil water — кипятить воду. Boil начинается там, где вода доходит до кипения и появляются пузырьки.",
          "Chop — нарезать кусочками. Воду нельзя chop; если речь о кипячении, нужен boil.",
          "Fry — жарить на сковороде. Вода на сковороде не fry, она просто начинает спорить с физикой; нужен boil.",
          "Bake — печь в духовке. Воду для чая или пасты обычно boil, не bake."
        ],
        "uk": [
          "Бінго! Boil water — кип’ятити воду. Коли в каструлі з’являються активні бульбашки, вода майже аплодує.",
          "Chop — різати шматочками. Воду нарізати складно навіть дуже впевненим ножем; потрібне boil.",
          "Fry просить олію й сковороду. Вода з бульбашками обирає boil, а не смаження.",
          "Bake живе в духовці. Вода в каструлі до бульбашок — це boil."
        ],
        "es": [
          "Bien. Boil water es hervir agua. Cuando la olla se llena de burbujas activas, el agua casi aplaude.",
          "Chop es cortar en trozos. Cortar agua sería una hazaña rara; aquí necesitas boil.",
          "Fry pide aceite y sartén. Agua con burbujas elige boil, no fritura.",
          "Bake vive en el horno. Agua en olla hasta burbujas es boil."
        ],
        "pt-BR": [
          "Certo. Boil water é ferver água. Quando a panela ganha bolhas agitadas, a água quase aplaude.",
          "Chop é cortar em pedaços. Cortar água seria uma façanha estranha; aqui precisa de boil.",
          "Fry pede óleo e frigideira. Água com bolhas escolhe boil, não fritura.",
          "Bake mora no forno. Água na panela até borbulhar é boil."
        ],
        "vi": [
          "Đúng. Boil water là đun sôi nước. Khi nồi đầy bong bóng sôi động, nước gần như đang vỗ tay.",
          "Chop là cắt thành miếng. Cắt nước hơi kỳ diệu quá; ở đây cần boil.",
          "Fry cần dầu và chảo. Nước có bọt chọn boil, không chọn chiên.",
          "Bake sống trong lò nướng. Nước trong nồi sủi bọt là boil."
        ],
        "id": [
          "Benar. Boil water berarti merebus air. Saat panci penuh gelembung aktif, airnya hampir bertepuk tangan.",
          "Chop berarti memotong jadi bagian. Memotong air terlalu ajaib; di sini perlu boil.",
          "Fry butuh minyak dan wajan. Air bergelembung memilih boil, bukan fry.",
          "Bake tinggal di oven. Air di panci sampai bergelembung adalah boil."
        ],
        "tr": [
          "Doğru. Boil water su kaynatmaktır. Tencerede hareketli kabarcıklar çıkınca su neredeyse alkışlar.",
          "Chop parçalara kesmektir. Suyu kesmek fazla sihirli olur; burada boil gerekir.",
          "Fry yağ ve tava ister. Kabarcıklı su fry değil boil seçer.",
          "Bake fırında yaşar. Tencerede kabarcıklanan su boil olur."
        ],
        "pl": [
          "Dobrze. Boil water to gotować wodę. Gdy w garnku pojawiają się żywe bąbelki, woda prawie klaszcze.",
          "Chop to kroić na kawałki. Krojenie wody byłoby mocną magią; tu potrzeba boil.",
          "Fry potrzebuje oleju i patelni. Woda z bąbelkami wybiera boil, nie smażenie.",
          "Bake mieszka w piekarniku. Woda w garnku aż do bąbelków to boil."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-022",
      "type": "mcq",
      "prompt": "Which English verb fits “fry eggs”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «жарить яйца»?",
        "uk": "Яке англійське дієслово потрібне для «смажити яйця»?",
        "es": "¿Qué verbo inglés se usa para «freír huevos»?",
        "pt-BR": "Qual verbo em inglês se usa para “fritar ovos”?",
        "vi": "Động từ tiếng Anh nào dùng cho “chiên trứng”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “menggoreng telur”?",
        "tr": "“Yumurta kızartmak” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „smażyć jajka”?"
      },
      "choices": [
        "grill",
        "boil",
        "fry",
        "pour"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose the English cooking verb for frying eggs.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C22",
        "K22"
      ],
      "choiceRationales": [
        "Grill uses a grill or strong direct heat and does not match pan-fried eggs.",
        "Boil uses water and gives a different egg-cooking method.",
        "Fry is the verb for cooking eggs in a pan with oil or fat.",
        "Pour means let liquid flow and is not the cooking method."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Grill — готовить на гриле. Яичницу обычно делают на сковороде, поэтому “жарить яйца” — fry eggs.",
          "Boil — варить или кипятить в воде. Яйца можно boil, но “жарить яйца” на сковороде — fry.",
          "Бинго! Fry eggs — жарить яйца. Fry значит готовить на горячей сковороде, часто с маслом.",
          "Pour — наливать жидкость. Яйца не “наливают” как молоко; если они на сковороде, это fry."
        ],
        "uk": [
          "Grill любить решітку й смужки. Яйця на сковороді з олією зазвичай ідуть до fry.",
          "Boil дасть варені яйця. Якщо яйце шипить на сковороді, це вже fry.",
          "Бінго! Fry eggs. Уяви яйце на гарячій сковороді: краї схоплюються, усе тихо шипить — це fry.",
          "Pour — наливати. Яйця можна pour у миску, але готувати на сковороді — fry."
        ],
        "es": [
          "Grill ama la parrilla y las marcas. Huevos en sartén con aceite van con fry.",
          "Boil da huevos cocidos. Si el huevo chisporrotea en la sartén, ya es fry.",
          "Bien. Fry eggs. Imagina el huevo en la sartén caliente: los bordes se fijan y todo chisporrotea, eso es fry.",
          "Pour es verter. Puedes pour huevo en un bowl, pero cocinarlo en sartén es fry."
        ],
        "pt-BR": [
          "Grill ama grelha e marcas. Ovos na frigideira com óleo vão com fry.",
          "Boil dá ovos cozidos. Se o ovo chia na frigideira, já é fry.",
          "Certo. Fry eggs. Imagine o ovo na frigideira quente: as bordas firmam e tudo chia baixinho, isso é fry.",
          "Pour é despejar. Você pode pour ovo em uma tigela, mas cozinhar na frigideira é fry."
        ],
        "vi": [
          "Grill thích vỉ nướng và vệt cháy. Trứng trong chảo với dầu thường đi với fry.",
          "Boil cho trứng luộc. Nếu trứng xèo trong chảo, đó là fry.",
          "Đúng. Fry eggs. Hãy hình dung quả trứng trên chảo nóng: mép se lại, tiếng xèo nhỏ vang lên — đó là fry.",
          "Pour là rót/đổ. Bạn có thể pour trứng vào bát, nhưng nấu trên chảo là fry."
        ],
        "id": [
          "Grill suka panggangan dan garis bakar. Telur di wajan dengan minyak biasanya fry.",
          "Boil menghasilkan telur rebus. Kalau telur mendesis di wajan, itu fry.",
          "Benar. Fry eggs. Bayangkan telur di wajan panas: pinggirnya mengeras dan terdengar desis kecil, itulah fry.",
          "Pour berarti menuang. Telur bisa pour ke mangkuk, tetapi memasaknya di wajan adalah fry."
        ],
        "tr": [
          "Grill ızgara ve çizgileri sever. Yağlı tavada yumurta genelde fry ister.",
          "Boil haşlanmış yumurta verir. Yumurta tavada cızırdıyorsa bu fry olur.",
          "Doğru. Fry eggs. Sıcak tavada yumurtayı düşün: kenarlar toparlanır, hafif cızırtı duyulur; işte fry.",
          "Pour dökmektir. Yumurtayı kaseye pour edebilirsin ama tavada pişirmek fry."
        ],
        "pl": [
          "Grill lubi ruszt i paski. Jajka na patelni z olejem zwykle idą z fry.",
          "Boil da jajka gotowane. Jeśli jajko skwierczy na patelni, to już fry.",
          "Dobrze. Fry eggs. Wyobraź sobie jajko na gorącej patelni: brzegi się ścinają, cicho skwierczy — to fry.",
          "Pour to nalewać. Jajko można pour do miski, ale na patelni je fry."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-023",
      "type": "mcq",
      "prompt": "Which English verb fits “pour milk”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «налить молоко»?",
        "uk": "Яке англійське дієслово потрібне для «налити молоко»?",
        "es": "¿Qué verbo inglés se usa para «verter leche»?",
        "pt-BR": "Qual verbo em inglês se usa para “despejar leite”?",
        "vi": "Động từ tiếng Anh nào dùng cho “rót sữa”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “menuang susu”?",
        "tr": "“Süt dökmek” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „nalać mleko”?"
      },
      "choices": [
        "chop",
        "bake",
        "stir",
        "pour"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose the English cooking verb for pouring milk.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C23",
        "K23"
      ],
      "choiceRationales": [
        "Chop is for cutting solids into pieces, not moving milk.",
        "Bake uses an oven and does not describe moving a liquid.",
        "Stir means mix with a spoon, not transfer a liquid.",
        "Pour is the verb for moving a liquid such as milk from one container to another."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Chop — нарезать твёрдые продукты на кусочки. Молоко не режут, его наливают: pour.",
          "Bake — печь в духовке. Молоко в стакан не запекают, а наливают, поэтому здесь pour.",
          "Stir — помешивать. Можно stir молоко в кофе, но само действие “налить” — pour.",
          "Точно, pour milk. Pour значит наливать жидкость из одной ёмкости в другую."
        ],
        "uk": [
          "Chop — різати шматочками. Молоко так не працює: якщо воно тече з пакета, це pour.",
          "Bake відправляє їжу в духовку. Молоко в склянку не запікають, його pour.",
          "Stir — мішати ложкою. Але спершу молоко треба перемістити в чашку: pour.",
          "Точно, pour milk. Pour — коли рідина ллється з одного посуду в інший, акуратною цівкою без зайвої драми."
        ],
        "es": [
          "Chop es cortar en trozos. La leche no funciona así: si sale del cartón, es pour.",
          "Bake manda comida al horno. La leche al vaso no se hornea; se pour.",
          "Stir es mezclar con cuchara. Pero primero hay que mover la leche a la taza: pour.",
          "Exacto, pour milk. Pour es cuando un líquido pasa de un recipiente a otro en un chorro controlado."
        ],
        "pt-BR": [
          "Chop é cortar em pedaços. Leite não funciona assim: se sai da caixa, é pour.",
          "Bake manda comida ao forno. Leite no copo não assa; você pour.",
          "Stir é mexer com colher. Mas primeiro o leite precisa ir para a xícara: pour.",
          "Isso, pour milk. Pour é quando um líquido passa de um recipiente para outro em um fio controlado."
        ],
        "vi": [
          "Chop là cắt thành miếng. Sữa không hoạt động vậy: sữa chảy khỏi hộp là pour.",
          "Bake đưa đồ ăn vào lò. Sữa vào cốc không phải nướng; đó là pour.",
          "Stir là khuấy bằng thìa. Nhưng trước tiên cần chuyển sữa vào cốc: pour.",
          "Đúng, pour milk. Pour là khi chất lỏng chảy từ đồ đựng này sang đồ đựng khác thành dòng có kiểm soát."
        ],
        "id": [
          "Chop berarti memotong jadi bagian. Susu tidak begitu: kalau mengalir dari karton, itu pour.",
          "Bake membawa makanan ke oven. Susu ke gelas tidak dipanggang; itu pour.",
          "Stir berarti mengaduk dengan sendok. Tetapi susu perlu dipindah dulu ke cangkir: pour.",
          "Tepat, pour milk. Pour berarti cairan mengalir dari satu wadah ke wadah lain dengan aliran terkendali."
        ],
        "tr": [
          "Chop parçalara kesmektir. Süt böyle çalışmaz: kutudan akıyorsa bu pour.",
          "Bake yiyeceği fırına yollar. Bardağa süt fırınlanmaz, pour edilir.",
          "Stir kaşıkla karıştırmaktır. Ama önce süt bardağa taşınır: pour.",
          "Aynen, pour milk. Pour sıvının bir kaptan diğerine kontrollü bir çizgi halinde akmasıdır."
        ],
        "pl": [
          "Chop to kroić na kawałki. Mleko tak nie działa: gdy płynie z kartonu, to pour.",
          "Bake wysyła jedzenie do piekarnika. Mleka do szklanki się nie piecze, tylko pour.",
          "Stir to mieszać łyżką. Najpierw jednak mleko trzeba przenieść do kubka: pour.",
          "Dokładnie, pour milk. Pour jest wtedy, gdy płyn przelewa się z jednego naczynia do drugiego spokojnym strumieniem."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-024",
      "type": "mcq",
      "prompt": "Which English verb fits “stir soup”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «помешивать суп»?",
        "uk": "Яке англійське дієслово потрібне для «помішувати суп»?",
        "es": "¿Qué verbo inglés se usa para «remover la sopa»?",
        "pt-BR": "Qual verbo em inglês se usa para “mexer a sopa”?",
        "vi": "Động từ tiếng Anh nào dùng cho “khuấy súp”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “mengaduk sup”?",
        "tr": "“Çorbayı karıştırmak” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „mieszać zupę”?"
      },
      "choices": [
        "slice",
        "stir",
        "grill",
        "freeze"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English cooking verb for stirring soup.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C24",
        "K24"
      ],
      "choiceRationales": [
        "Slice means cut into thin pieces and does not fit soup.",
        "Stir is the verb for mixing soup with a spoon or similar tool.",
        "Grill uses direct heat and a grill, not the spoon movement in soup.",
        "Freeze makes something very cold and does not mean mix soup."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Slice — резать ломтиками. Суп ломтиками не режут; если ложка движется в кастрюле, это stir.",
          "Бинго! Stir soup — помешивать суп. Stir значит двигать ложкой внутри жидкости или смеси.",
          "Grill — готовить на гриле. Суп на решётке не помешивают; в кастрюле его stir.",
          "Freeze — замораживать. Если суп ещё горячий и его мешают ложкой, нужен stir."
        ],
        "uk": [
          "Slice — різати тонкими шматочками. Суп не нарізають, його рухають ложкою: stir.",
          "Бінго! Stir soup — помішувати суп. Ложка робить кола в каструлі, щоб усе змішалося й нічого не нудьгувало на дні.",
          "Grill любить решітку й жар. Суп на грилі звучить як кулінарний експеримент століття; потрібно stir.",
          "Freeze заморожує. Якщо суп ще живий і його треба розмішати, обирай stir."
        ],
        "es": [
          "Slice es cortar en láminas. La sopa no se corta; se mueve con cuchara: stir.",
          "Bien. Stir soup es remover la sopa. La cuchara dibuja círculos para mezclar todo y cuidar el fondo.",
          "Grill ama parrilla y calor. Sopa a la parrilla suena a experimento raro; aquí va stir.",
          "Freeze congela. Si la sopa sigue viva y hay que mezclarla, elige stir."
        ],
        "pt-BR": [
          "Slice é cortar em fatias finas. Sopa não se fatia; mexe com colher: stir.",
          "Certo. Stir soup é mexer a sopa. A colher faz círculos para misturar tudo e cuidar do fundo.",
          "Grill ama grelha e calor. Sopa na grelha parece experimento estranho; aqui é stir.",
          "Freeze congela. Se a sopa ainda está viva e precisa misturar, escolha stir."
        ],
        "vi": [
          "Slice là cắt lát mỏng. Súp không được cắt lát; nó được khuấy bằng thìa: stir.",
          "Đúng. Stir soup là khuấy súp. Cái thìa vẽ vòng tròn trong nồi để mọi thứ hòa vào nhau.",
          "Grill thích vỉ và lửa. Súp nướng nghe như thí nghiệm kỳ lạ; ở đây là stir.",
          "Freeze làm đông lạnh. Nếu súp còn nóng và cần trộn đều, chọn stir."
        ],
        "id": [
          "Slice berarti mengiris tipis. Sup tidak diiris; sup digerakkan dengan sendok: stir.",
          "Benar. Stir soup berarti mengaduk sup. Sendok membuat lingkaran di panci agar semuanya tercampur.",
          "Grill suka panggangan dan panas. Sup panggang terdengar seperti eksperimen; di sini stir.",
          "Freeze membekukan. Kalau sup masih hidup dan perlu dicampur, pilih stir."
        ],
        "tr": [
          "Slice ince dilimlere kesmektir. Çorba dilimlenmez, kaşıkla hareket eder: stir.",
          "Doğru. Stir soup çorbayı karıştırmaktır. Kaşık tencerede daireler çizer, her şey birbirine karışır.",
          "Grill ızgara ve sıcaklık sever. Izgara çorba garip deney olur; burada stir gerekir.",
          "Freeze dondurur. Çorba hâlâ sıcaksa ve karışması gerekiyorsa stir seç."
        ],
        "pl": [
          "Slice to kroić w cienkie plasterki. Zupy się nie kroi, tylko rusza łyżką: stir.",
          "Dobrze. Stir soup to mieszać zupę. Łyżka robi kółka w garnku, żeby wszystko się połączyło.",
          "Grill lubi ruszt i żar. Zupa z grilla brzmi jak eksperyment stulecia; tu trzeba stir.",
          "Freeze zamraża. Jeśli zupa żyje i trzeba ją wymieszać, wybierz stir."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-025",
      "type": "mcq",
      "prompt": "Which English verb fits “wash dishes”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «мыть посуду»?",
        "uk": "Яке англійське дієслово потрібне для «мити посуд»?",
        "es": "¿Qué verbo inglés se usa para «lavar los platos»?",
        "pt-BR": "Qual verbo em inglês se usa para “lavar a louça”?",
        "vi": "Động từ tiếng Anh nào dùng cho “rửa bát đĩa”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “mencuci piring”?",
        "tr": "“Bulaşıkları yıkamak” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „myć naczynia”?"
      },
      "choices": [
        "wash",
        "bake",
        "chop",
        "boil"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English cooking verb for washing dishes.",
      "skillTag": "kitchen_action_verbs",
      "sourceIds": [
        "S2",
        "S3"
      ],
      "claimIds": [
        "C25",
        "K25"
      ],
      "choiceRationales": [
        "Wash is the verb for cleaning dishes with water.",
        "Bake uses an oven and does not mean clean dishes.",
        "Chop means cut into pieces and would be disastrous with dishes.",
        "Boil uses hot water for cooking and does not mean wash dishes in this prompt."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! Wash dishes — мыть посуду. Wash значит очищать водой, обычно с губкой и средством.",
          "Bake — печь. После выпечки посуды обычно становится больше, но чистит её не bake, а wash.",
          "Chop — нарезать. Посуду не chop, если день совсем не задался; её wash.",
          "Boil — кипятить. Тарелки обычно моют водой и средством, а не кипятят: wash dishes."
        ],
        "uk": [
          "Бінго! Wash dishes — мити посуд. Уяви губку, піну й тарілку, з якої зникає слід від вечері.",
          "Bake відправляє їжу в духовку. Посуд після bake радше буде брудним, а чистить його wash.",
          "Chop — різати. Посуд краще не chop, інакше буде не прибирання, а уламки.",
          "Boil кип’ятить. Для звичайної брудної тарілки потрібен не суп із тарілок, а wash."
        ],
        "es": [
          "Bien. Wash dishes es lavar los platos. Imagina esponja, espuma y un plato que pierde las huellas de la cena.",
          "Bake manda comida al horno. Después de bake tendrás más platos sucios; los limpia wash.",
          "Chop es cortar. Mejor no chop los platos: eso no limpia, rompe.",
          "Boil hierve. Para un plato sucio normal no quieres sopa de platos; quieres wash."
        ],
        "pt-BR": [
          "Certo. Wash dishes é lavar a louça. Imagine esponja, espuma e um prato perdendo as marcas do jantar.",
          "Bake manda comida ao forno. Depois de bake, a louça fica mais suja; quem limpa é wash.",
          "Chop é cortar. Melhor não chop pratos: isso não limpa, quebra.",
          "Boil ferve. Para prato sujo comum, você não quer sopa de pratos; quer wash."
        ],
        "vi": [
          "Đúng. Wash dishes là rửa bát đĩa. Hãy nghĩ tới miếng bọt biển, bọt xà phòng và chiếc đĩa sạch dần.",
          "Bake đưa đồ ăn vào lò. Sau bake thường có thêm bát đĩa bẩn; việc làm sạch là wash.",
          "Chop là cắt. Đừng chop đĩa: đó không phải dọn dẹp, đó là mảnh vỡ.",
          "Boil là đun sôi. Với đĩa bẩn bình thường, bạn không cần súp đĩa; cần wash."
        ],
        "id": [
          "Benar. Wash dishes berarti mencuci piring. Bayangkan spons, busa, dan piring yang kehilangan jejak makan malam.",
          "Bake membawa makanan ke oven. Setelah bake, piring malah kotor; yang membersihkan adalah wash.",
          "Chop berarti memotong. Jangan chop piring: itu bukan bersih-bersih, itu pecahan.",
          "Boil berarti merebus. Untuk piring kotor biasa, bukan sup piring yang dibutuhkan, melainkan wash."
        ],
        "tr": [
          "Doğru. Wash dishes bulaşık yıkamaktır. Sünger, köpük ve akşam yemeği izleri silinen tabağı düşün.",
          "Bake yemeği fırına yollar. Bake sonrası tabak daha kirli olur; temizleyen wash.",
          "Chop kesmektir. Tabakları chop etme: temizlik değil, kırık çıkar.",
          "Boil kaynatmaktır. Kirli tabak için tabak çorbası değil, wash gerekir."
        ],
        "pl": [
          "Dobrze. Wash dishes to myć naczynia. Wyobraź sobie gąbkę, pianę i talerz, z którego znika ślad kolacji.",
          "Bake wysyła jedzenie do piekarnika. Po bake masz więcej brudnych naczyń; czyści je wash.",
          "Chop to kroić. Lepiej nie chop talerzy: to nie sprzątanie, tylko odłamki.",
          "Boil to gotować. Przy brudnym talerzu nie chcesz zupy z talerzy, tylko wash."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-026",
      "type": "mcq",
      "prompt": "Which English verb fits “peel potatoes”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «чистить картошку»?",
        "uk": "Яке англійське дієслово потрібне для «чистити картоплю»?",
        "es": "¿Qué verbo inglés se usa para «pelar patatas»?",
        "pt-BR": "Qual verbo em inglês se usa para “descascar batatas”?",
        "vi": "Động từ tiếng Anh nào dùng cho “gọt khoai tây”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “mengupas kentang”?",
        "tr": "“Patates soymak” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „obierać ziemniaki”?"
      },
      "choices": [
        "pour",
        "stir",
        "peel",
        "roast"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose the English cooking verb for peeling potatoes.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C26",
        "K26"
      ],
      "choiceRationales": [
        "Pour is for liquids and does not remove potato skin.",
        "Stir mixes food and does not remove the skin.",
        "Peel is the verb for removing potato skin.",
        "Roast cooks food in dry heat and does not mean remove skin."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Pour — наливать жидкость. Картошка не льётся, а если нужно снять кожуру, выбирай peel.",
          "Stir — помешивать. Картошку можно stir уже в блюде, но “чистить картошку” — peel potatoes.",
          "Бинго! Peel potatoes — чистить картошку. Peel значит снять кожуру или наружный слой.",
          "Roast — запекать. До духовки картошка часто проходит этап peel, если нужно убрать кожуру."
        ],
        "uk": [
          "Pour — наливати. Картоплю не наливають, із неї знімають шкірку: peel.",
          "Stir — мішати. Поки шкірка на місці, ложка не врятує: потрібне peel.",
          "Бінго! Peel potatoes. Уяви, як із картоплі тонкою стрічкою сходить шкірка — це саме peel.",
          "Roast запікає. Але до духовки картопля часто проходить етап peel."
        ],
        "es": [
          "Pour es verter. Las patatas no se vierten; se les quita la piel: peel.",
          "Stir es mezclar. Mientras la piel siga ahí, la cuchara no ayuda: peel.",
          "Bien. Peel potatoes. Imagina la piel de la patata saliendo en una tira fina: eso es peel.",
          "Roast asa. Pero antes del horno, la patata muchas veces pasa por peel."
        ],
        "pt-BR": [
          "Pour é despejar. Batata não se despeja; tira-se a casca: peel.",
          "Stir é mexer. Enquanto a casca está ali, a colher não salva: peel.",
          "Certo. Peel potatoes. Imagine a casca da batata saindo em uma tirinha fina: isso é peel.",
          "Roast assa. Mas antes do forno, a batata muitas vezes passa por peel."
        ],
        "vi": [
          "Pour là rót. Khoai tây không được rót; vỏ được bỏ ra bằng peel.",
          "Stir là khuấy. Khi vỏ còn đó, thìa không cứu được; cần peel.",
          "Đúng. Peel potatoes. Hãy tưởng tượng vỏ khoai tây rời ra thành một dải mỏng: đó là peel.",
          "Roast là nướng. Nhưng trước lò, khoai thường đi qua bước peel."
        ],
        "id": [
          "Pour berarti menuang. Kentang tidak dituang; kulitnya dilepas dengan peel.",
          "Stir berarti mengaduk. Selama kulit masih ada, sendok tidak membantu: peel.",
          "Benar. Peel potatoes. Bayangkan kulit kentang terlepas sebagai pita tipis: itulah peel.",
          "Roast berarti memanggang. Tetapi sebelum oven, kentang sering melewati tahap peel."
        ],
        "tr": [
          "Pour dökmektir. Patates dökülmez; kabuğu çıkarılır: peel.",
          "Stir karıştırmaktır. Kabuk dururken kaşık kurtarmaz; peel gerekir.",
          "Doğru. Peel potatoes. Patates kabuğunun ince bir şerit gibi ayrıldığını düşün; bu peel.",
          "Roast fırında pişirir. Ama fırından önce patates sık sık peel aşamasından geçer."
        ],
        "pl": [
          "Pour to nalewać. Ziemniaków się nie nalewa; zdejmuje się skórkę: peel.",
          "Stir to mieszać. Dopóki skórka jest na miejscu, łyżka nie pomoże: peel.",
          "Dobrze. Peel potatoes. Wyobraź sobie skórkę ziemniaka schodzącą cienką wstążką — to peel.",
          "Roast piecze. Ale przed piekarnikiem ziemniak często przechodzi przez peel."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-027",
      "type": "mcq",
      "prompt": "Which English verb fits “slice bread”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «нарезать хлеб ломтиками»?",
        "uk": "Яке англійське дієслово потрібне для «нарізати хліб скибками»?",
        "es": "¿Qué verbo inglés se usa para «cortar pan en rebanadas»?",
        "pt-BR": "Qual verbo em inglês se usa para “fatiar pão”?",
        "vi": "Động từ tiếng Anh nào dùng cho “cắt bánh mì thành lát”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “mengiris roti”?",
        "tr": "“Ekmeği dilimlemek” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „pokroić chleb w kromki”?"
      },
      "choices": [
        "boil",
        "slice",
        "pour",
        "grill"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English cooking verb for slicing bread.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C27",
        "K27"
      ],
      "choiceRationales": [
        "Boil uses water and does not cut bread into pieces.",
        "Slice is the verb for cutting bread into thin flat pieces.",
        "Pour is for liquids and cannot describe cutting bread.",
        "Grill cooks food with direct heat and does not mean cut into slices."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Boil — кипятить или варить в воде. Хлеб для тостов не варят; его режут ломтиками: slice.",
          "Бинго! Slice bread — нарезать хлеб ломтиками. Slice даёт ровные плоские куски для тоста или сэндвича.",
          "Pour — наливать жидкость. Хлеб не наливают, его нарезают ломтиками: slice.",
          "Grill — готовить на гриле. Но действие “нарезать хлеб ломтиками” происходит раньше и называется slice."
        ],
        "uk": [
          "Boil — кип’ятити. Хліб у воді швидко стане сумним супом, а нам потрібно slice.",
          "Бінго! Slice bread. Уяви рівні скибки хліба для тостів або бутерброда — ось це slice.",
          "Pour — наливати. Хліб не тече з пакета молока, його ріжуть: slice.",
          "Grill готує жаром. Але до тосту хліб часто треба slice."
        ],
        "es": [
          "Boil es hervir. El pan en agua se vuelve sopa triste; aquí necesitas slice.",
          "Bien. Slice bread. Imagina rebanadas parejas para tostadas o un sándwich: eso es slice.",
          "Pour es verter. El pan no sale como leche; se corta: slice.",
          "Grill cocina con calor. Pero antes de la tostada, muchas veces hay que slice el pan."
        ],
        "pt-BR": [
          "Boil é ferver. Pão na água vira sopa triste; aqui precisa de slice.",
          "Certo. Slice bread. Imagine fatias certinhas para torradas ou sanduíche: isso é slice.",
          "Pour é despejar. Pão não sai como leite; ele é cortado: slice.",
          "Grill cozinha com calor. Mas antes da torrada, muitas vezes é preciso slice o pão."
        ],
        "vi": [
          "Boil là đun sôi. Bánh mì trong nước sẽ thành món súp buồn; ở đây cần slice.",
          "Đúng. Slice bread. Hãy tưởng tượng những lát bánh mì đều nhau cho toast hoặc sandwich: đó là slice.",
          "Pour là rót. Bánh mì không chảy như sữa; nó được cắt: slice.",
          "Grill nấu bằng nhiệt trực tiếp. Nhưng trước khi nướng, bánh mì thường cần slice."
        ],
        "id": [
          "Boil berarti merebus. Roti dalam air jadi sup sedih; di sini perlu slice.",
          "Benar. Slice bread. Bayangkan irisan roti rapi untuk toast atau sandwich: itulah slice.",
          "Pour berarti menuang. Roti tidak mengalir seperti susu; roti dipotong: slice.",
          "Grill memasak dengan panas. Tetapi sebelum jadi toast, roti sering perlu slice."
        ],
        "tr": [
          "Boil kaynatmaktır. Ekmek suda üzgün çorbaya döner; burada slice gerekir.",
          "Doğru. Slice bread. Tost ya da sandviç için düzgün ekmek dilimlerini düşün; bu slice.",
          "Pour dökmektir. Ekmek süt gibi akmaz; dilim dilim gidiyorsa doğru fiil slice.",
          "Grill ısıyla pişirir. Ama tosttan önce ekmeği sık sık slice etmek gerekir."
        ],
        "pl": [
          "Boil to gotować. Chleb w wodzie zrobi smutną zupę; tutaj trzeba slice.",
          "Dobrze. Slice bread. Wyobraź sobie równe kromki na tosty albo kanapkę — to slice.",
          "Pour to nalewać. Chleb nie płynie jak mleko, tylko się go kroi: slice.",
          "Grill gotuje żarem. Ale przed tostami chleb często trzeba slice."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-028",
      "type": "mcq",
      "prompt": "Which English verb fits “roast chicken”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «запекать курицу»?",
        "uk": "Яке англійське дієслово потрібне для «запікати курку»?",
        "es": "¿Qué verbo inglés se usa para «asar pollo»?",
        "pt-BR": "Qual verbo em inglês se usa para “assar frango”?",
        "vi": "Động từ tiếng Anh nào dùng cho “nướng gà”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “memanggang ayam”?",
        "tr": "“Tavuğu fırında pişirmek” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „piec kurczaka”?"
      },
      "choices": [
        "chop",
        "fry",
        "boil",
        "roast"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose the English cooking verb for roasting chicken.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C28",
        "K28"
      ],
      "choiceRationales": [
        "Chop means cut into pieces and is not the cooking method.",
        "Fry uses oil and a pan, which is different from roasting chicken.",
        "Boil cooks in water and does not match dry-heat chicken.",
        "Roast is the verb for cooking chicken with dry heat, often in an oven."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Chop — нарезать. Курицу можно chop на части, но “запекать курицу” — roast chicken.",
          "Fry — жарить на сковороде. Roast обычно про сухой жар в духовке или жаровне, особенно для курицы.",
          "Boil — варить в воде. Запечённая курица не плавает в кастрюле, она roast.",
          "Точно, roast chicken. Roast значит запекать сухим жаром, часто в духовке, пока мясо подрумянивается."
        ],
        "uk": [
          "Chop — нарізати. Курку можна chop до готування, але сам сухий жар у духовці — roast.",
          "Fry — олія й сковорода. Для цілої курки з рум’яною скоринкою частіше обирай roast.",
          "Boil дасть варену курку. Якщо хочеш сухий жар і золотисту шкірку, потрібен roast.",
          "Точно, roast chicken. Уяви курку в духовці: шкірка темнішає, сік лишається всередині, і це вже roast."
        ],
        "es": [
          "Chop es cortar. Puedes chop el pollo antes, pero el calor seco del horno es roast.",
          "Fry es aceite y sartén. Para pollo entero con piel dorada, suele ir roast.",
          "Boil da pollo hervido. Si quieres calor seco y piel dorada, necesitas roast.",
          "Exacto, roast chicken. Imagina el pollo en el horno: la piel se dora y el jugo queda dentro, eso es roast."
        ],
        "pt-BR": [
          "Chop é cortar. Você pode chop o frango antes, mas calor seco no forno é roast.",
          "Fry é óleo e frigideira. Para frango inteiro com casquinha dourada, costuma ser roast.",
          "Boil dá frango cozido. Se quer calor seco e pele dourada, precisa de roast.",
          "Isso, roast chicken. Imagine o frango no forno: a pele doura, o suco fica dentro, e isso é roast."
        ],
        "vi": [
          "Chop là chặt/cắt. Bạn có thể chop gà trước, nhưng nhiệt khô trong lò là roast.",
          "Fry là dầu và chảo. Gà nguyên con với da vàng thường hợp với roast.",
          "Boil cho gà luộc. Muốn nhiệt khô và da vàng thì cần roast.",
          "Đúng, roast chicken. Hãy tưởng tượng con gà trong lò: da vàng dần, nước thịt giữ bên trong — đó là roast."
        ],
        "id": [
          "Chop berarti memotong. Ayam bisa chop sebelum dimasak, tetapi panas kering di oven adalah roast.",
          "Fry berarti minyak dan wajan. Untuk ayam utuh berkulit keemasan, biasanya roast.",
          "Boil memberi ayam rebus. Kalau mau panas kering dan kulit keemasan, perlu roast.",
          "Tepat, roast chicken. Bayangkan ayam di oven: kulitnya menguning, sarinya tetap di dalam, itulah roast."
        ],
        "tr": [
          "Chop kesmektir. Tavuğu önce chop edebilirsin ama fırındaki kuru sıcaklık roast olur.",
          "Fry yağ ve tava demektir. Bütün tavuk ve kızarmış deri için genelde roast seçilir.",
          "Boil haşlanmış tavuk verir. Kuru sıcaklık ve altın deri istiyorsan roast gerekir.",
          "Aynen, roast chicken. Fırındaki tavuğu düşün: derisi kızarır, suyu içinde kalır; bu roast."
        ],
        "pl": [
          "Chop to kroić. Kurczaka można chop przed gotowaniem, ale suchy żar w piekarniku to roast.",
          "Fry to olej i patelnia. Cały kurczak ze złotą skórką zwykle idzie z roast.",
          "Boil da gotowanego kurczaka. Jeśli chcesz suchy żar i złotą skórkę, potrzebujesz roast.",
          "Dokładnie, roast chicken. Wyobraź sobie kurczaka w piekarniku: skórka się rumieni, sok zostaje w środku — to roast."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-029",
      "type": "mcq",
      "prompt": "Which English verb fits “mix ingredients”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «смешать ингредиенты»?",
        "uk": "Яке англійське дієслово потрібне для «змішати інгредієнти»?",
        "es": "¿Qué verbo inglés se usa para «mezclar ingredientes»?",
        "pt-BR": "Qual verbo em inglês se usa para “misturar ingredientes”?",
        "vi": "Động từ tiếng Anh nào dùng cho “trộn nguyên liệu”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “mencampur bahan”?",
        "tr": "“Malzemeleri karıştırmak” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „wymieszać składniki”?"
      },
      "choices": [
        "mix",
        "cup",
        "cut",
        "fridge"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English cooking verb for mixing ingredients.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C29",
        "K29"
      ],
      "choiceRationales": [
        "Mix is the verb for combining ingredients.",
        "Cup is a container and not the action of combining ingredients.",
        "Cut changes ingredients into pieces but does not combine them.",
        "Fridge is an appliance and not a cooking action."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! Mix ingredients — смешать ингредиенты. Mix значит соединить несколько продуктов в одну смесь.",
          "Cup — чашка. Она может держать часть ингредиентов, но не означает “смешать”. Здесь нужен глагол mix.",
          "Cut — резать. Это делает кусочки, но не соединяет ингредиенты в одну смесь. Для смешивания нужен mix.",
          "Fridge — холодильник. Он хранит продукты холодными, но не смешивает их. Действие здесь — mix."
        ],
        "uk": [
          "Бінго! Mix ingredients — змішати інгредієнти. Окремі продукти перестають бути солістами й стають однією командою.",
          "Cup — чашка, предмет. Вона може тримати інгредієнти, але дія “поєднати” називається mix.",
          "Cut робить шматочки. Але коли кілька інгредієнтів треба об’єднати в одній мисці, потрібне mix.",
          "Fridge охолоджує. Інгредієнти в ньому чекають, але не змішуються самі: дія — mix."
        ],
        "es": [
          "Bien. Mix ingredients es mezclar ingredientes. Los alimentos dejan de ir solos y se vuelven un equipo.",
          "Cup es una taza, un objeto. Puede contener ingredientes, pero unirlos se llama mix.",
          "Cut hace trozos. Cuando esos trozos deben hacerse amigos en un bowl, necesitas mix.",
          "Fridge enfría. Los ingredientes esperan allí, pero no se mezclan solos: mix."
        ],
        "pt-BR": [
          "Certo. Mix ingredients é misturar ingredientes. Os alimentos deixam de tocar solo e viram uma equipe.",
          "Cup é xícara, um objeto. Pode segurar ingredientes, mas juntar tudo se chama mix.",
          "Cut faz pedaços. Quando esses pedaços precisam virar amigos na tigela, precisa de mix.",
          "Fridge esfria. Ingredientes esperam lá, mas não se misturam sozinhos: mix."
        ],
        "vi": [
          "Đúng. Mix ingredients là trộn nguyên liệu. Các món riêng lẻ thôi diễn solo và trở thành một đội.",
          "Cup là cái cốc, một vật. Nó có thể đựng nguyên liệu, nhưng hành động kết hợp là mix.",
          "Cut tạo miếng nhỏ. Khi các miếng cần “làm bạn” trong bát, cần mix.",
          "Fridge làm lạnh. Nguyên liệu chờ trong đó, nhưng không tự trộn: hành động là mix."
        ],
        "id": [
          "Benar. Mix ingredients berarti mencampur bahan. Bahan-bahan berhenti tampil solo dan menjadi satu tim.",
          "Cup adalah cangkir, benda. Bisa menampung bahan, tetapi tindakan menggabungkan adalah mix.",
          "Cut membuat potongan. Saat potongan harus berteman dalam mangkuk, perlu mix.",
          "Fridge mendinginkan. Bahan menunggu di sana, tetapi tidak bercampur sendiri: mix."
        ],
        "tr": [
          "Doğru. Mix ingredients malzemeleri karıştırmaktır. Ayrı parçalar solo çalmayı bırakıp takım olur.",
          "Cup fincandır, yani nesne. Malzemeleri tutabilir ama birleştirme eylemi mix.",
          "Cut parça yapar. Parçalar aynı kasede arkadaş olacaksa mix gerekir.",
          "Fridge soğutur. Malzemeler orada bekler ama kendi kendine karışmaz: mix."
        ],
        "pl": [
          "Dobrze. Mix ingredients to wymieszać składniki. Osobne produkty przestają grać solo i stają się zespołem.",
          "Cup to kubek, przedmiot. Może trzymać składniki, ale połączenie ich to mix.",
          "Cut robi kawałki. Gdy kawałki mają zaprzyjaźnić się w misce, potrzebujesz mix.",
          "Fridge chłodzi. Składniki tam czekają, ale same się nie mieszają: mix."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-030",
      "type": "mcq",
      "prompt": "Which English verb fits “serve dinner”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «подавать ужин»?",
        "uk": "Яке англійське дієслово потрібне для «подавати вечерю»?",
        "es": "¿Qué verbo inglés se usa para «servir la cena»?",
        "pt-BR": "Qual verbo em inglês se usa para “servir o jantar”?",
        "vi": "Động từ tiếng Anh nào dùng cho “dọn bữa tối”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “menyajikan makan malam”?",
        "tr": "“Akşam yemeğini servis etmek” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „podawać kolację”?"
      },
      "choices": [
        "wash",
        "peel",
        "serve",
        "boil"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose the English cooking verb for serving dinner.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C30",
        "K30"
      ],
      "choiceRationales": [
        "Wash cleans dishes or food and does not mean present dinner.",
        "Peel removes skin from food and is a preparation step.",
        "Serve is the verb for presenting food to people at the table.",
        "Boil cooks food in water and does not mean present the meal."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Wash — мыть. После ужина это пригодится, но “подать ужин” — serve dinner.",
          "Peel — чистить кожуру. Это подготовка продукта, а не подача готового ужина. Здесь нужен serve.",
          "Бинго! Serve dinner — подать ужин. Serve значит поставить или дать готовую еду людям на стол.",
          "Boil — кипятить или варить. Ужин уже готов и идёт на стол, значит действие — serve."
        ],
        "uk": [
          "Wash — мити. До вечері можна wash тарілки, але сам момент “ось їжа” — serve.",
          "Peel — чистити шкірку. Це підготовка, а не урочистий вихід вечері на стіл.",
          "Бінго! Serve dinner — подати вечерю. Їжа вже готова й переїжджає з кухні до людей, де починається найважливіше.",
          "Boil готує у воді. Але коли каструля вже перемогла, вечерю треба serve."
        ],
        "es": [
          "Wash es lavar. Antes de cenar puedes wash platos, pero el momento “aquí está la comida” es serve.",
          "Peel es quitar la piel. Es preparación, no la entrada triunfal de la cena.",
          "Bien. Serve dinner es servir la cena. La comida ya está lista y viaja de la cocina a la mesa.",
          "Boil cocina en agua. Pero cuando la olla ya ganó, la cena se debe serve."
        ],
        "pt-BR": [
          "Wash é lavar. Antes do jantar você pode wash pratos, mas o momento “a comida chegou” é serve.",
          "Peel é tirar a casca. É preparo, não a entrada triunfal do jantar.",
          "Certo. Serve dinner é servir o jantar. A comida está pronta e vai da cozinha para a mesa.",
          "Boil cozinha em água. Mas quando a panela já venceu, o jantar precisa ser serve."
        ],
        "vi": [
          "Wash là rửa. Trước bữa tối có thể wash đĩa, nhưng khoảnh khắc “đồ ăn đây” là serve.",
          "Peel là gọt vỏ. Đó là bước chuẩn bị, không phải lúc bữa tối ra bàn.",
          "Đúng. Serve dinner là dọn bữa tối. Đồ ăn đã sẵn sàng và đi từ bếp ra bàn.",
          "Boil nấu trong nước. Nhưng khi nồi đã xong việc, bữa tối cần serve."
        ],
        "id": [
          "Wash berarti mencuci. Sebelum makan malam bisa wash piring, tetapi momen “makanan datang” adalah serve.",
          "Peel berarti mengupas kulit. Itu persiapan, bukan pintu masuk makan malam ke meja.",
          "Benar. Serve dinner berarti menyajikan makan malam. Makanan sudah siap dan pindah dari dapur ke meja.",
          "Boil memasak dalam air. Setelah panci menang, makan malam perlu serve."
        ],
        "tr": [
          "Wash yıkamaktır. Akşam yemeğinden önce tabakları wash edebilirsin, ama “yemek geldi” anı serve.",
          "Peel kabuk soymaktır. Bu hazırlık, akşam yemeğinin sahneye çıkışı değil.",
          "Doğru. Serve dinner akşam yemeğini servis etmektir. Yemek hazırdır ve mutfaktan sofraya geçer.",
          "Boil suda pişirir. Tencere görevini bitirince akşam yemeğini serve etmek gerekir."
        ],
        "pl": [
          "Wash to myć. Przed kolacją można wash talerze, ale chwila “oto jedzenie” to serve.",
          "Peel to obierać skórkę. To przygotowanie, nie uroczyste wejście kolacji na stół.",
          "Dobrze. Serve dinner to podać kolację. Jedzenie jest gotowe i przechodzi z kuchni na stół.",
          "Boil gotuje w wodzie. Gdy garnek już wygrał, kolację trzeba serve."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-031",
      "type": "mcq",
      "prompt": "Which English verb fits “grate cheese”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «натереть сыр»?",
        "uk": "Яке англійське дієслово потрібне для «натерти сир»?",
        "es": "¿Qué verbo inglés se usa para «rallar queso»?",
        "pt-BR": "Qual verbo em inglês se usa para “ralar queijo”?",
        "vi": "Động từ tiếng Anh nào dùng cho “bào phô mai”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “memarut keju”?",
        "tr": "“peyniri rendelemek” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „zetrzeć ser”?"
      },
      "choices": [
        "slice",
        "grate",
        "boil",
        "serve"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English cooking verb for grate cheese.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C31",
        "K31"
      ],
      "choiceRationales": [
        "slice means нарезать ломтиками and does not mean grate cheese.",
        "grate is the verb for grate cheese.",
        "boil means кипятить или варить and does not mean grate cheese.",
        "serve means подавать еду and does not mean grate cheese."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "slice — нарезать ломтиками: получились бы плоские кусочки сыра. Для тёрки и мелкой стружки нужен grate.",
          "Бинго! grate значит тереть на тёрке. Это слово подходит, когда сыр превращают в мелкую стружку.",
          "boil — кипятить или варить в воде. Сыр здесь не варят; его трут на тёрке, поэтому нужен grate.",
          "serve — подавать еду к столу. Оно не описывает движение по тёрке; правильный глагол здесь grate."
        ],
        "uk": [
          "slice — це нарізати скибками. Для «натерти сир» slice не підходить; потрібне grate.",
          "Бінго! grate — це дієслово для «натерти сир». Сир стає дрібною стружкою після тертки, тому grate точно називає цей рух.",
          "boil — це кип’ятити або варити. Для «натерти сир» boil не підходить; потрібне grate.",
          "serve — це подавати їжу. Для «натерти сир» serve не підходить; потрібне grate."
        ],
        "es": [
          "slice es cortar en rebanadas; describe otra acción. Para «rallar queso», slice no sirve; necesitas grate.",
          "Bien. grate es el verbo para «rallar queso». El queso queda en hebras pequeñas después del rallador, y esa acción es grate.",
          "boil es hervir; describe otra acción. Para «rallar queso», boil no sirve; necesitas grate.",
          "serve es servir comida; describe otra acción. Para «rallar queso», serve no sirve; necesitas grate."
        ],
        "pt-BR": [
          "slice é cortar em fatias; é outra ação. Para “ralar queijo”, slice não serve; use grate.",
          "Certo. grate é o verbo para “ralar queijo”. O queijo vira tirinhas no ralador, e essa ação específica se chama grate.",
          "boil é ferver; é outra ação. Para “ralar queijo”, boil não serve; use grate.",
          "serve é servir comida; é outra ação. Para “ralar queijo”, serve não serve; use grate."
        ],
        "vi": [
          "slice là cắt lát; đó là hành động khác. Với “bào phô mai”, slice không đúng; dùng grate.",
          "Đúng. grate là động từ cho “bào phô mai”. Phô mai thành sợi nhỏ sau dụng cụ bào, nên hành động đó là grate.",
          "boil là đun sôi hoặc luộc; đó là hành động khác. Với “bào phô mai”, boil không đúng; dùng grate.",
          "serve là dọn món ăn; đó là hành động khác. Với “bào phô mai”, serve không đúng; dùng grate."
        ],
        "id": [
          "slice berarti mengiris; itu tindakan lain. Untuk “memarut keju”, slice bukan aksinya; pakai grate.",
          "Benar. grate adalah kata kerja untuk “memarut keju”. Keju menjadi serpihan kecil lewat parutan; tindakan itu disebut grate.",
          "boil berarti merebus; itu tindakan lain. Untuk “memarut keju”, boil bukan aksinya; pakai grate.",
          "serve berarti menyajikan makanan; itu tindakan lain. Untuk “memarut keju”, serve bukan aksinya; pakai grate."
        ],
        "tr": [
          "slice, dilimlemek demektir; bu başka işlemdir. “peyniri rendelemek” için slice olmaz; grate gerekir.",
          "Doğru. grate, “peyniri rendelemek” için kullanılan fiildir. Peynir rendeden geçip küçük parçalara ayrılır; bu hareket grate diye geçer.",
          "boil, kaynatmak demektir; bu başka işlemdir. “peyniri rendelemek” için boil olmaz; grate gerekir.",
          "serve, yemek servis etmek demektir; bu başka işlemdir. “peyniri rendelemek” için serve olmaz; grate gerekir."
        ],
        "pl": [
          "slice znaczy kroić w plastry; to inna czynność. Do „zetrzeć ser” slice nie pasuje; wybierz grate.",
          "Dobrze. grate to czasownik do „zetrzeć ser”. Ser robi się drobnymi wiórkami na tarce, więc ten ruch nazywa się grate.",
          "boil znaczy gotować; to inna czynność. Do „zetrzeć ser” boil nie pasuje; wybierz grate.",
          "serve znaczy podawać jedzenie; to inna czynność. Do „zetrzeć ser” serve nie pasuje; wybierz grate."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-032",
      "type": "mcq",
      "prompt": "Which English verb fits “drain pasta”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «слить воду с пасты»?",
        "uk": "Яке англійське дієслово потрібне для «злити воду з пасти»?",
        "es": "¿Qué verbo inglés se usa para «escurrir pasta»?",
        "pt-BR": "Qual verbo em inglês se usa para “escorrer o macarrão”?",
        "vi": "Động từ tiếng Anh nào dùng cho “để ráo mì ống”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “meniriskan pasta”?",
        "tr": "“makarnayı süzmek” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „odcedzić makaron”?"
      },
      "choices": [
        "stir",
        "bake",
        "peel",
        "drain"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose the English cooking verb for drain pasta.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C32",
        "K32"
      ],
      "choiceRationales": [
        "stir means помешивать and does not mean drain pasta.",
        "bake means печь and does not mean drain pasta.",
        "peel means чистить кожуру and does not mean drain pasta.",
        "drain is the verb for drain pasta."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "stir — помешивать ложкой. Паста уже сварилась, и задача не мешать её, а слить воду: drain.",
          "bake — печь в духовке. У пасты лишняя вода после варки, поэтому нужен глагол drain.",
          "peel — снимать кожуру. У пасты нет кожуры; воду после варки сливают, это drain.",
          "Бинго! drain значит слить жидкость. С пастой это момент, когда вода уходит, а макароны остаются."
        ],
        "uk": [
          "stir — це помішувати. Для «злити воду з пасти» stir не підходить; потрібне drain.",
          "bake — це пекти. Для «злити воду з пасти» bake не підходить; потрібне drain.",
          "peel — це чистити шкірку. Для «злити воду з пасти» peel не підходить; потрібне drain.",
          "Бінго! drain — це дієслово для «злити воду з пасти». Вода йде через друшляк, а паста лишається без зайвої рідини."
        ],
        "es": [
          "stir es remover; describe otra acción. Para «escurrir pasta», stir no sirve; necesitas drain.",
          "bake es hornear; describe otra acción. Para «escurrir pasta», bake no sirve; necesitas drain.",
          "peel es pelar; describe otra acción. Para «escurrir pasta», peel no sirve; necesitas drain.",
          "Bien. drain es el verbo para «escurrir pasta». El agua se va por el colador y la pasta queda lista para la salsa."
        ],
        "pt-BR": [
          "stir é mexer; é outra ação. Para “escorrer o macarrão”, stir não serve; use drain.",
          "bake é assar no forno; é outra ação. Para “escorrer o macarrão”, bake não serve; use drain.",
          "peel é descascar; é outra ação. Para “escorrer o macarrão”, peel não serve; use drain.",
          "Certo. drain é o verbo para “escorrer o macarrão”. A água sai pelo escorredor, e o macarrão fica sem líquido sobrando."
        ],
        "vi": [
          "stir là khuấy; đó là hành động khác. Với “để ráo mì ống”, stir không đúng; dùng drain.",
          "bake là nướng bằng lò; đó là hành động khác. Với “để ráo mì ống”, bake không đúng; dùng drain.",
          "peel là gọt vỏ; đó là hành động khác. Với “để ráo mì ống”, peel không đúng; dùng drain.",
          "Đúng. drain là động từ cho “để ráo mì ống”. Nước đi qua rổ lọc, còn mì ở lại không bị ngập nước."
        ],
        "id": [
          "stir berarti mengaduk; itu tindakan lain. Untuk “meniriskan pasta”, stir bukan aksinya; pakai drain.",
          "bake berarti memanggang di oven; itu tindakan lain. Untuk “meniriskan pasta”, bake bukan aksinya; pakai drain.",
          "peel berarti mengupas kulit; itu tindakan lain. Untuk “meniriskan pasta”, peel bukan aksinya; pakai drain.",
          "Benar. drain adalah kata kerja untuk “meniriskan pasta”. Air keluar lewat saringan, sementara pastanya tetap tertinggal."
        ],
        "tr": [
          "stir, karıştırmak demektir; bu başka işlemdir. “makarnayı süzmek” için stir olmaz; drain gerekir.",
          "bake, fırında pişirmek demektir; bu başka işlemdir. “makarnayı süzmek” için bake olmaz; drain gerekir.",
          "peel, kabuk soymak demektir; bu başka işlemdir. “makarnayı süzmek” için peel olmaz; drain gerekir.",
          "Doğru. drain, “makarnayı süzmek” için kullanılan fiildir. Su süzgeçten akar, makarna ise susuz şekilde geride kalır."
        ],
        "pl": [
          "stir znaczy mieszać; to inna czynność. Do „odcedzić makaron” stir nie pasuje; wybierz drain.",
          "bake znaczy piec w piekarniku; to inna czynność. Do „odcedzić makaron” bake nie pasuje; wybierz drain.",
          "peel znaczy obierać skórkę; to inna czynność. Do „odcedzić makaron” peel nie pasuje; wybierz drain.",
          "Dobrze. drain to czasownik do „odcedzić makaron”. Woda odpływa przez sitko, a makaron zostaje bez nadmiaru płynu."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-033",
      "type": "mcq",
      "prompt": "Which English verb fits “steam vegetables”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «готовить овощи на пару»?",
        "uk": "Яке англійське дієслово потрібне для «готувати овочі на парі»?",
        "es": "¿Qué verbo inglés se usa para «cocinar verduras al vapor»?",
        "pt-BR": "Qual verbo em inglês se usa para “cozinhar legumes no vapor”?",
        "vi": "Động từ tiếng Anh nào dùng cho “hấp rau củ”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “mengukus sayuran”?",
        "tr": "“sebzeleri buharda pişirmek” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „gotować warzywa na parze”?"
      },
      "choices": [
        "steam",
        "chop",
        "wash",
        "fry"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English cooking verb for steam vegetables.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C33",
        "K33"
      ],
      "choiceRationales": [
        "steam is the verb for steam vegetables.",
        "chop means рубить или нарезать кусочками and does not mean steam vegetables.",
        "wash means мыть and does not mean steam vegetables.",
        "fry means жарить and does not mean steam vegetables."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! steam значит готовить на пару. Овощи получают жар от пара, а не от масла или кипящей воды.",
          "chop — рубить кусочками. Это подготовка ножом, а готовка овощей на пару называется steam.",
          "wash — мыть водой. После wash овощи ещё сырые; действие с горячим паром — steam.",
          "fry — жарить в масле. При steam овощи готовятся паром, поэтому сковорода с маслом не нужна."
        ],
        "uk": [
          "Бінго! steam — це дієслово для «готувати овочі на парі». Овочі нагріває пара, а не олія на сковорідці.",
          "chop — це рубати шматочками. Для «готувати овочі на парі» chop не підходить; потрібне steam.",
          "wash — це мити. Для «готувати овочі на парі» wash не підходить; потрібне steam.",
          "fry — це смажити в олії. Для «готувати овочі на парі» fry не підходить; потрібне steam."
        ],
        "es": [
          "Bien. steam es el verbo para «cocinar verduras al vapor». Las verduras reciben calor del vapor, no del aceite de una sartén.",
          "chop es picar en trozos; describe otra acción. Para «cocinar verduras al vapor», chop no sirve; necesitas steam.",
          "wash es lavar; describe otra acción. Para «cocinar verduras al vapor», wash no sirve; necesitas steam.",
          "fry es freír en aceite; describe otra acción. Para «cocinar verduras al vapor», fry no sirve; necesitas steam."
        ],
        "pt-BR": [
          "Certo. steam é o verbo para “cozinhar legumes no vapor”. Os legumes cozinham com vapor quente, não com óleo na frigideira.",
          "chop é picar em pedaços; é outra ação. Para “cozinhar legumes no vapor”, chop não serve; use steam.",
          "wash é lavar; é outra ação. Para “cozinhar legumes no vapor”, wash não serve; use steam.",
          "fry é fritar em óleo; é outra ação. Para “cozinhar legumes no vapor”, fry não serve; use steam."
        ],
        "vi": [
          "Đúng. steam là động từ cho “hấp rau”. Rau chín nhờ hơi nước nóng, không phải dầu trong chảo.",
          "chop là chặt hoặc băm miếng; đó là hành động khác. Với “hấp rau”, chop không đúng; dùng steam.",
          "wash là rửa; đó là hành động khác. Với “hấp rau”, wash không đúng; dùng steam.",
          "fry là chiên trong dầu; đó là hành động khác. Với “hấp rau”, fry không đúng; dùng steam."
        ],
        "id": [
          "Benar. steam adalah kata kerja untuk “mengukus sayuran”. Sayuran matang karena uap panas, bukan karena minyak di wajan.",
          "chop berarti mencacah; itu tindakan lain. Untuk “mengukus sayuran”, chop bukan aksinya; pakai steam.",
          "wash berarti mencuci; itu tindakan lain. Untuk “mengukus sayuran”, wash bukan aksinya; pakai steam.",
          "fry berarti menggoreng dengan minyak; itu tindakan lain. Untuk “mengukus sayuran”, fry bukan aksinya; pakai steam."
        ],
        "tr": [
          "Doğru. steam, “sebzeleri buharda pişirmek” için kullanılan fiildir. Sebzeyi tava yağı değil, sıcak buhar pişirir.",
          "chop, parçalara doğramak demektir; bu başka işlemdir. “sebzeleri buharda pişirmek” için chop olmaz; steam gerekir.",
          "wash, yıkamak demektir; bu başka işlemdir. “sebzeleri buharda pişirmek” için wash olmaz; steam gerekir.",
          "fry, yağda kızartmak demektir; bu başka işlemdir. “sebzeleri buharda pişirmek” için fry olmaz; steam gerekir."
        ],
        "pl": [
          "Dobrze. steam to czasownik do „gotować warzywa na parze”. Warzywa ogrzewa para, a nie olej na patelni.",
          "chop znaczy siekać na kawałki; to inna czynność. Do „gotować warzywa na parze” chop nie pasuje; wybierz steam.",
          "wash znaczy myć; to inna czynność. Do „gotować warzywa na parze” wash nie pasuje; wybierz steam.",
          "fry znaczy smażyć na oleju; to inna czynność. Do „gotować warzywa na parze” fry nie pasuje; wybierz steam."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-034",
      "type": "mcq",
      "prompt": "Which English verb fits “melt butter”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «растопить масло»?",
        "uk": "Яке англійське дієслово потрібне для «розтопити масло»?",
        "es": "¿Qué verbo inglés se usa para «derretir mantequilla»?",
        "pt-BR": "Qual verbo em inglês se usa para “derreter manteiga”?",
        "vi": "Động từ tiếng Anh nào dùng cho “làm tan bơ”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “melelehkan mentega”?",
        "tr": "“tereyağını eritmek” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „roztopić masło”?"
      },
      "choices": [
        "roast",
        "pour",
        "melt",
        "freeze"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose the English cooking verb for melt butter.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C34",
        "K34"
      ],
      "choiceRationales": [
        "roast means запекать and does not mean melt butter.",
        "pour means наливать and does not mean melt butter.",
        "melt is the verb for melt butter.",
        "freeze means замораживать and does not mean melt butter."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "roast — запекать сухим жаром. Масло тут не запекают: его делают жидким, поэтому нужен melt.",
          "pour — наливать уже жидкое. Масло сначала становится жидким, и это действие называется melt.",
          "Бинго! melt значит растопить. Твёрдое масло от тепла превращается в жидкое.",
          "freeze — замораживать. Это обратное действие: масло твердеет, а для жидкости нужен melt."
        ],
        "uk": [
          "roast — це запікати сухим жаром. Для «розтопити масло» roast не підходить; потрібне melt.",
          "pour — це наливати. Для «розтопити масло» pour не підходить; потрібне melt.",
          "Бінго! melt — це дієслово для «розтопити масло». Тверде масло від тепла стає рідким; це саме melt.",
          "freeze — це заморожувати. Для «розтопити масло» freeze не підходить; потрібне melt."
        ],
        "es": [
          "roast es asar con calor seco; describe otra acción. Para «derretir mantequilla», roast no sirve; necesitas melt.",
          "pour es verter un líquido; describe otra acción. Para «derretir mantequilla», pour no sirve; necesitas melt.",
          "Bien. melt es el verbo para «derretir mantequilla». La mantequilla sólida se vuelve líquida con calor; eso es melt.",
          "freeze es congelar; describe otra acción. Para «derretir mantequilla», freeze no sirve; necesitas melt."
        ],
        "pt-BR": [
          "roast é assar com calor seco; é outra ação. Para “derreter manteiga”, roast não serve; use melt.",
          "pour é despejar líquido; é outra ação. Para “derreter manteiga”, pour não serve; use melt.",
          "Certo. melt é o verbo para “derreter manteiga”. A manteiga sólida vira líquida com calor, então o verbo é melt.",
          "freeze é congelar; é outra ação. Para “derreter manteiga”, freeze não serve; use melt."
        ],
        "vi": [
          "roast là nướng bằng nhiệt khô; đó là hành động khác. Với “làm chảy bơ”, roast không đúng; dùng melt.",
          "pour là rót chất lỏng; đó là hành động khác. Với “làm chảy bơ”, pour không đúng; dùng melt.",
          "Đúng. melt là động từ cho “làm chảy bơ”. Bơ cứng gặp nhiệt và chuyển thành chất lỏng; đó là melt.",
          "freeze là làm đông; đó là hành động khác. Với “làm chảy bơ”, freeze không đúng; dùng melt."
        ],
        "id": [
          "roast berarti memanggang panas kering; itu tindakan lain. Untuk “melelehkan mentega”, roast bukan aksinya; pakai melt.",
          "pour berarti menuang cairan; itu tindakan lain. Untuk “melelehkan mentega”, pour bukan aksinya; pakai melt.",
          "Benar. melt adalah kata kerja untuk “melelehkan mentega”. Mentega padat berubah cair karena panas; itulah melt.",
          "freeze berarti membekukan; itu tindakan lain. Untuk “melelehkan mentega”, freeze bukan aksinya; pakai melt."
        ],
        "tr": [
          "roast, kuru ısıyla pişirmek demektir; bu başka işlemdir. “tereyağını eritmek” için roast olmaz; melt gerekir.",
          "pour, sıvı dökmek demektir; bu başka işlemdir. “tereyağını eritmek” için pour olmaz; melt gerekir.",
          "Doğru. melt, “tereyağını eritmek” için kullanılan fiildir. Katı tereyağı ısıyla sıvıya döner; bu eylem melt.",
          "freeze, dondurmak demektir; bu başka işlemdir. “tereyağını eritmek” için freeze olmaz; melt gerekir."
        ],
        "pl": [
          "roast znaczy piec suchym ciepłem; to inna czynność. Do „roztopić masło” roast nie pasuje; wybierz melt.",
          "pour znaczy wlewać płyn; to inna czynność. Do „roztopić masło” pour nie pasuje; wybierz melt.",
          "Dobrze. melt to czasownik do „roztopić masło”. Twarde masło pod wpływem ciepła robi się płynne; to melt.",
          "freeze znaczy zamrażać; to inna czynność. Do „roztopić masło” freeze nie pasuje; wybierz melt."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-035",
      "type": "mcq",
      "prompt": "Which English verb fits “season soup”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «приправить суп»?",
        "uk": "Яке англійське дієслово потрібне для «приправити суп»?",
        "es": "¿Qué verbo inglés se usa para «condimentar la sopa»?",
        "pt-BR": "Qual verbo em inglês se usa para “temperar a sopa”?",
        "vi": "Động từ tiếng Anh nào dùng cho “nêm súp”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “membumbui sup”?",
        "tr": "“çorbayı baharatlandırmak” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „doprawić zupę”?"
      },
      "choices": [
        "mix",
        "season",
        "slice",
        "boil"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English cooking verb for season soup.",
      "skillTag": "recipe_instruction_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C35",
        "K35"
      ],
      "choiceRationales": [
        "mix means смешивать and does not mean season soup.",
        "season is the verb for season soup.",
        "slice means нарезать ломтиками and does not mean season soup.",
        "boil means кипятить или варить and does not mean season soup."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "mix — смешивать ингредиенты. Для соли, перца и вкуса нужен другой глагол: season.",
          "Бинго! season значит приправить. Суп получает вкус от соли, специй или трав.",
          "slice — нарезать ломтиками. Суп не режут ломтями; его вкус доводят глаголом season.",
          "boil — кипятить. Он говорит про нагрев, а не про соль и специи; здесь нужен season."
        ],
        "uk": [
          "mix — це змішувати. Для «приправити суп» mix не підходить; потрібне season.",
          "Бінго! season — це дієслово для «приправити суп». Сіль, перець або трави додають смак, і це називається season.",
          "slice — це нарізати скибками. Для «приправити суп» slice не підходить; потрібне season.",
          "boil — це кип’ятити або варити. Для «приправити суп» boil не підходить; потрібне season."
        ],
        "es": [
          "mix es mezclar; describe otra acción. Para «sazonar la sopa», mix no sirve; necesitas season.",
          "Bien. season es el verbo para «sazonar la sopa». La sal, la pimienta o las hierbas cambian el sabor; eso es season.",
          "slice es cortar en rebanadas; describe otra acción. Para «sazonar la sopa», slice no sirve; necesitas season.",
          "boil es hervir; describe otra acción. Para «sazonar la sopa», boil no sirve; necesitas season."
        ],
        "pt-BR": [
          "mix é misturar; é outra ação. Para “temperar a sopa”, mix não serve; use season.",
          "Certo. season é o verbo para “temperar a sopa”. Sal, pimenta ou ervas dão sabor; essa ação é season.",
          "slice é cortar em fatias; é outra ação. Para “temperar a sopa”, slice não serve; use season.",
          "boil é ferver; é outra ação. Para “temperar a sopa”, boil não serve; use season."
        ],
        "vi": [
          "mix là trộn; đó là hành động khác. Với “nêm súp”, mix không đúng; dùng season.",
          "Đúng. season là động từ cho “nêm súp”. Muối, tiêu hoặc rau thơm làm món súp có vị; đó là season.",
          "slice là cắt lát; đó là hành động khác. Với “nêm súp”, slice không đúng; dùng season.",
          "boil là đun sôi hoặc luộc; đó là hành động khác. Với “nêm súp”, boil không đúng; dùng season."
        ],
        "id": [
          "mix berarti mencampur; itu tindakan lain. Untuk “membumbui sup”, mix bukan aksinya; pakai season.",
          "Benar. season adalah kata kerja untuk “membumbui sup”. Garam, lada, atau herba memberi rasa; tindakan itu adalah season.",
          "slice berarti mengiris; itu tindakan lain. Untuk “membumbui sup”, slice bukan aksinya; pakai season.",
          "boil berarti merebus; itu tindakan lain. Untuk “membumbui sup”, boil bukan aksinya; pakai season."
        ],
        "tr": [
          "mix, karıştırmak demektir; bu başka işlemdir. “çorbayı baharatlamak” için mix olmaz; season gerekir.",
          "Doğru. season, “çorbayı baharatlamak” için kullanılan fiildir. Tuz, biber veya otlar lezzet katar; bunun fiili season.",
          "slice, dilimlemek demektir; bu başka işlemdir. “çorbayı baharatlamak” için slice olmaz; season gerekir.",
          "boil, kaynatmak demektir; bu başka işlemdir. “çorbayı baharatlamak” için boil olmaz; season gerekir."
        ],
        "pl": [
          "mix znaczy mieszać razem; to inna czynność. Do „doprawić zupę” mix nie pasuje; wybierz season.",
          "Dobrze. season to czasownik do „doprawić zupę”. Sól, pieprz albo zioła dodają smaku, więc to czasownik season.",
          "slice znaczy kroić w plastry; to inna czynność. Do „doprawić zupę” slice nie pasuje; wybierz season.",
          "boil znaczy gotować; to inna czynność. Do „doprawić zupę” boil nie pasuje; wybierz season."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-036",
      "type": "mcq",
      "prompt": "Which English verb fits “knead dough”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «месить тесто»?",
        "uk": "Яке англійське дієслово потрібне для «місити тісто»?",
        "es": "¿Qué verbo inglés se usa para «amasar masa»?",
        "pt-BR": "Qual verbo em inglês se usa para “sovar a massa”?",
        "vi": "Động từ tiếng Anh nào dùng cho “nhào bột”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “menguleni adonan”?",
        "tr": "“hamur yoğurmak” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „ugniatać ciasto”?"
      },
      "choices": [
        "whisk",
        "serve",
        "measure",
        "knead"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose the English cooking verb for knead dough.",
      "skillTag": "recipe_instruction_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C36",
        "K36"
      ],
      "choiceRationales": [
        "whisk means взбивать венчиком and does not mean knead dough.",
        "serve means подавать еду and does not mean knead dough.",
        "measure means отмерять and does not mean knead dough.",
        "knead is the verb for knead dough."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "whisk — взбивать венчиком, обычно яйца или жидкость. Тесто руками разминают: knead.",
          "serve — подавать к столу. Сырое тесто ещё не подают; его нужно размять, то есть knead.",
          "measure — отмерять количество. Это про точность, а не про работу руками с тестом; нужен knead.",
          "Бинго! knead значит месить тесто. Ладони складывают, давят и делают тесто ровным."
        ],
        "uk": [
          "whisk — це збивати вінчиком. Для «місити тісто» whisk не підходить; потрібне knead.",
          "serve — це подавати їжу. Для «місити тісто» serve не підходить; потрібне knead.",
          "measure — це відміряти. Для «місити тісто» measure не підходить; потрібне knead.",
          "Бінго! knead — це дієслово для «місити тісто». Руки тиснуть і складають тісто, щоб воно стало рівним."
        ],
        "es": [
          "whisk es batir con varillas; describe otra acción. Para «amasar masa», whisk no sirve; necesitas knead.",
          "serve es servir comida; describe otra acción. Para «amasar masa», serve no sirve; necesitas knead.",
          "measure es medir; describe otra acción. Para «amasar masa», measure no sirve; necesitas knead.",
          "Bien. knead es el verbo para «amasar masa». Las manos presionan y doblan la masa hasta que queda uniforme."
        ],
        "pt-BR": [
          "whisk é bater com fouet; é outra ação. Para “sovar a massa”, whisk não serve; use knead.",
          "serve é servir comida; é outra ação. Para “sovar a massa”, serve não serve; use knead.",
          "measure é medir; é outra ação. Para “sovar a massa”, measure não serve; use knead.",
          "Certo. knead é o verbo para “sovar a massa”. As mãos apertam e dobram a massa até ela ficar lisa."
        ],
        "vi": [
          "whisk là đánh bằng phới; đó là hành động khác. Với “nhào bột”, whisk không đúng; dùng knead.",
          "serve là dọn món ăn; đó là hành động khác. Với “nhào bột”, serve không đúng; dùng knead.",
          "measure là đong hoặc đo; đó là hành động khác. Với “nhào bột”, measure không đúng; dùng knead.",
          "Đúng. knead là động từ cho “nhào bột”. Hai tay ấn và gấp khối bột cho đến khi bột đều hơn."
        ],
        "id": [
          "whisk berarti mengocok dengan whisk; itu tindakan lain. Untuk “menguleni adonan”, whisk bukan aksinya; pakai knead.",
          "serve berarti menyajikan makanan; itu tindakan lain. Untuk “menguleni adonan”, serve bukan aksinya; pakai knead.",
          "measure berarti mengukur; itu tindakan lain. Untuk “menguleni adonan”, measure bukan aksinya; pakai knead.",
          "Benar. knead adalah kata kerja untuk “menguleni adonan”. Tangan menekan dan melipat adonan sampai teksturnya rata."
        ],
        "tr": [
          "whisk, çırpmak demektir; bu başka işlemdir. “hamuru yoğurmak” için whisk olmaz; knead gerekir.",
          "serve, yemek servis etmek demektir; bu başka işlemdir. “hamuru yoğurmak” için serve olmaz; knead gerekir.",
          "measure, ölçmek demektir; bu başka işlemdir. “hamuru yoğurmak” için measure olmaz; knead gerekir.",
          "Doğru. knead, “hamuru yoğurmak” için kullanılan fiildir. Eller hamuru bastırıp katlar, doku daha düzgün olur."
        ],
        "pl": [
          "whisk znaczy ubijać trzepaczką; to inna czynność. Do „wyrabiać ciasto” whisk nie pasuje; wybierz knead.",
          "serve znaczy podawać jedzenie; to inna czynność. Do „wyrabiać ciasto” serve nie pasuje; wybierz knead.",
          "measure znaczy odmierzać; to inna czynność. Do „wyrabiać ciasto” measure nie pasuje; wybierz knead.",
          "Dobrze. knead to czasownik do „wyrabiać ciasto”. Dłonie naciskają i składają ciasto, aż masa robi się równa."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-037",
      "type": "mcq",
      "prompt": "Which English verb fits “whisk eggs”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «взбить яйца венчиком»?",
        "uk": "Яке англійське дієслово потрібне для «збити яйця вінчиком»?",
        "es": "¿Qué verbo inglés se usa para «batir huevos con varillas»?",
        "pt-BR": "Qual verbo em inglês se usa para “bater ovos com um batedor”?",
        "vi": "Động từ tiếng Anh nào dùng cho “đánh trứng bằng phới”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “mengocok telur dengan whisk”?",
        "tr": "“yumurtaları çırpmak” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „ubić jajka trzepaczką”?"
      },
      "choices": [
        "whisk",
        "drain",
        "grate",
        "preheat"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English cooking verb for whisk eggs.",
      "skillTag": "recipe_instruction_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C37",
        "K37"
      ],
      "choiceRationales": [
        "whisk is the verb for whisk eggs.",
        "drain means сливать жидкость and does not mean whisk eggs.",
        "grate means тереть на тёрке and does not mean whisk eggs.",
        "preheat means предварительно разогревать and does not mean whisk eggs."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! whisk значит взбивать венчиком. Яйца быстро перемешивают до однородной массы.",
          "drain — сливать жидкость. Яйца не процеживают; их взбивают, поэтому нужен whisk.",
          "grate — тереть на тёрке. Для сыра подходит, но с яйцами работает венчик: whisk.",
          "preheat — заранее разогреть духовку. Это шаг до готовки, а действие с яйцами — whisk."
        ],
        "uk": [
          "Бінго! whisk — це дієслово для «збити яйця». Яйця швидко рухають вінчиком, щоб жовток і білок змішалися.",
          "drain — це зливати рідину. Для «збити яйця» drain не підходить; потрібне whisk.",
          "grate — це терти на тертці. Для «збити яйця» grate не підходить; потрібне whisk.",
          "preheat — це заздалегідь розігрівати. Для «збити яйця» preheat не підходить; потрібне whisk."
        ],
        "es": [
          "Bien. whisk es el verbo para «batir huevos». El batidor mueve los huevos rápido hasta unir yema y clara.",
          "drain es escurrir; describe otra acción. Para «batir huevos», drain no sirve; necesitas whisk.",
          "grate es rallar; describe otra acción. Para «batir huevos», grate no sirve; necesitas whisk.",
          "preheat es precalentar; describe otra acción. Para «batir huevos», preheat no sirve; necesitas whisk."
        ],
        "pt-BR": [
          "Certo. whisk é o verbo para “bater ovos”. O batedor mistura os ovos rápido até gema e clara se juntarem.",
          "drain é escorrer; é outra ação. Para “bater ovos”, drain não serve; use whisk.",
          "grate é ralar; é outra ação. Para “bater ovos”, grate não serve; use whisk.",
          "preheat é preaquecer; é outra ação. Para “bater ovos”, preheat não serve; use whisk."
        ],
        "vi": [
          "Đúng. whisk là động từ cho “đánh trứng”. Dụng cụ đánh làm lòng đỏ và lòng trắng hòa vào nhau.",
          "drain là để ráo; đó là hành động khác. Với “đánh trứng”, drain không đúng; dùng whisk.",
          "grate là bào; đó là hành động khác. Với “đánh trứng”, grate không đúng; dùng whisk.",
          "preheat là làm nóng trước; đó là hành động khác. Với “đánh trứng”, preheat không đúng; dùng whisk."
        ],
        "id": [
          "Benar. whisk adalah kata kerja untuk “mengocok telur”. Pengocok menggabungkan kuning dan putih telur dengan gerakan cepat.",
          "drain berarti meniriskan; itu tindakan lain. Untuk “mengocok telur”, drain bukan aksinya; pakai whisk.",
          "grate berarti memarut; itu tindakan lain. Untuk “mengocok telur”, grate bukan aksinya; pakai whisk.",
          "preheat berarti memanaskan lebih dulu; itu tindakan lain. Untuk “mengocok telur”, preheat bukan aksinya; pakai whisk."
        ],
        "tr": [
          "Doğru. whisk, “yumurtaları çırpmak” için kullanılan fiildir. Çırpıcı yumurtayı hızlıca karıştırıp tek doku yapar.",
          "drain, süzmek demektir; bu başka işlemdir. “yumurtaları çırpmak” için drain olmaz; whisk gerekir.",
          "grate, rendelemek demektir; bu başka işlemdir. “yumurtaları çırpmak” için grate olmaz; whisk gerekir.",
          "preheat, önceden ısıtmak demektir; bu başka işlemdir. “yumurtaları çırpmak” için preheat olmaz; whisk gerekir."
        ],
        "pl": [
          "Dobrze. whisk to czasownik do „ubić jajka”. Trzepaczka szybko łączy żółtko i białko w jedną masę.",
          "drain znaczy odcedzać; to inna czynność. Do „ubić jajka” drain nie pasuje; wybierz whisk.",
          "grate znaczy trzeć na tarce; to inna czynność. Do „ubić jajka” grate nie pasuje; wybierz whisk.",
          "preheat znaczy wcześniej rozgrzewać; to inna czynność. Do „ubić jajka” preheat nie pasuje; wybierz whisk."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-038",
      "type": "mcq",
      "prompt": "Which English verb fits “spread butter on toast”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «намазать масло на тост»?",
        "uk": "Яке англійське дієслово потрібне для «намазати масло на тост»?",
        "es": "¿Qué verbo inglés se usa para «untar mantequilla en una tostada»?",
        "pt-BR": "Qual verbo em inglês se usa para “passar manteiga na torrada”?",
        "vi": "Động từ tiếng Anh nào dùng cho “phết bơ lên bánh mì nướng”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “mengoleskan mentega di roti panggang”?",
        "tr": "“tosta tereyağı sürmek” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „rozsmarować masło na toście”?"
      },
      "choices": [
        "steam",
        "slice",
        "spread",
        "roast"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose the English cooking verb for spread butter on toast.",
      "skillTag": "recipe_instruction_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C38",
        "K38"
      ],
      "choiceRationales": [
        "steam means готовить на пару and does not mean spread butter on toast.",
        "slice means нарезать ломтиками and does not mean spread butter on toast.",
        "spread is the verb for spread butter on toast.",
        "roast means запекать and does not mean spread butter on toast."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "steam — готовить паром. Масло на тост не готовят паром; его размазывают, это spread.",
          "slice — нарезать ломтиками. Тост уже целый, а масло нужно распределить по поверхности: spread.",
          "Бинго! spread значит намазать или распределить. Масло тонким слоем ложится на тост.",
          "roast — запекать или жарить сухим жаром. Для масла на тосте нужно не жарить, а spread."
        ],
        "uk": [
          "steam — це готувати на парі. Для «намазати масло на тост» steam не підходить; потрібне spread.",
          "slice — це нарізати скибками. Для «намазати масло на тост» slice не підходить; потрібне spread.",
          "Бінго! spread — це дієслово для «намазати масло на тост». Масло лягає тонким шаром по поверхні тосту.",
          "roast — це запікати сухим жаром. Для «намазати масло на тост» roast не підходить; потрібне spread."
        ],
        "es": [
          "steam es cocinar al vapor; describe otra acción. Para «untar mantequilla en una tostada», steam no sirve; necesitas spread.",
          "slice es cortar en rebanadas; describe otra acción. Para «untar mantequilla en una tostada», slice no sirve; necesitas spread.",
          "Bien. spread es el verbo para «untar mantequilla en una tostada». La mantequilla se reparte en una capa fina sobre la tostada.",
          "roast es asar con calor seco; describe otra acción. Para «untar mantequilla en una tostada», roast no sirve; necesitas spread."
        ],
        "pt-BR": [
          "steam é cozinhar no vapor; é outra ação. Para “passar manteiga na torrada”, steam não serve; use spread.",
          "slice é cortar em fatias; é outra ação. Para “passar manteiga na torrada”, slice não serve; use spread.",
          "Certo. spread é o verbo para “passar manteiga na torrada”. A manteiga fica em uma camada fina sobre a torrada.",
          "roast é assar com calor seco; é outra ação. Para “passar manteiga na torrada”, roast não serve; use spread."
        ],
        "vi": [
          "steam là hấp; đó là hành động khác. Với “phết bơ lên bánh mì nướng”, steam không đúng; dùng spread.",
          "slice là cắt lát; đó là hành động khác. Với “phết bơ lên bánh mì nướng”, slice không đúng; dùng spread.",
          "Đúng. spread là động từ cho “phết bơ lên bánh mì nướng”. Bơ được dàn thành lớp mỏng trên mặt bánh nướng.",
          "roast là nướng bằng nhiệt khô; đó là hành động khác. Với “phết bơ lên bánh mì nướng”, roast không đúng; dùng spread."
        ],
        "id": [
          "steam berarti mengukus; itu tindakan lain. Untuk “mengoleskan mentega ke roti panggang”, steam bukan aksinya; pakai spread.",
          "slice berarti mengiris; itu tindakan lain. Untuk “mengoleskan mentega ke roti panggang”, slice bukan aksinya; pakai spread.",
          "Benar. spread adalah kata kerja untuk “mengoleskan mentega ke roti panggang”. Mentega diratakan menjadi lapisan tipis di atas roti panggang.",
          "roast berarti memanggang panas kering; itu tindakan lain. Untuk “mengoleskan mentega ke roti panggang”, roast bukan aksinya; pakai spread."
        ],
        "tr": [
          "steam, buharda pişirmek demektir; bu başka işlemdir. “tosta tereyağı sürmek” için steam olmaz; spread gerekir.",
          "slice, dilimlemek demektir; bu başka işlemdir. “tosta tereyağı sürmek” için slice olmaz; spread gerekir.",
          "Doğru. spread, “tosta tereyağı sürmek” için kullanılan fiildir. Tereyağı tostun üstüne ince bir tabaka halinde yayılır.",
          "roast, kuru ısıyla pişirmek demektir; bu başka işlemdir. “tosta tereyağı sürmek” için roast olmaz; spread gerekir."
        ],
        "pl": [
          "steam znaczy gotować na parze; to inna czynność. Do „posmarować tost masłem” steam nie pasuje; wybierz spread.",
          "slice znaczy kroić w plastry; to inna czynność. Do „posmarować tost masłem” slice nie pasuje; wybierz spread.",
          "Dobrze. spread to czasownik do „posmarować tost masłem”. Masło tworzy cienką warstwę na powierzchni tostu.",
          "roast znaczy piec suchym ciepłem; to inna czynność. Do „posmarować tost masłem” roast nie pasuje; wybierz spread."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-039",
      "type": "mcq",
      "prompt": "Which English verb fits “measure flour”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «отмерить муку»?",
        "uk": "Яке англійське дієслово потрібне для «відміряти борошно»?",
        "es": "¿Qué verbo inglés se usa para «medir harina»?",
        "pt-BR": "Qual verbo em inglês se usa para “medir farinha”?",
        "vi": "Động từ tiếng Anh nào dùng cho “đong bột mì”?",
        "id": "Kata kerja Inggris mana yang dipakai untuk “mengukur tepung”?",
        "tr": "“unu ölçmek” için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy „odmierzyć mąkę”?"
      },
      "choices": [
        "peel",
        "measure",
        "fry",
        "stir"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English cooking verb for measure flour.",
      "skillTag": "recipe_instruction_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C39",
        "K39"
      ],
      "choiceRationales": [
        "peel means чистить кожуру and does not mean measure flour.",
        "measure is the verb for measure flour.",
        "fry means жарить and does not mean measure flour.",
        "stir means помешивать and does not mean measure flour."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "peel — снимать кожуру. У муки нет кожуры; нужное действие про точное количество: measure.",
          "Бинго! measure значит отмерить. Муку берут в нужном количестве, чтобы рецепт не поплыл.",
          "fry — жарить в масле. Это готовка на сковороде, а с мукой сейчас нужна точность: measure.",
          "stir — помешивать. Муку можно мешать позже, но сначала её количество нужно measure."
        ],
        "uk": [
          "peel — це чистити шкірку. Для «відміряти борошно» peel не підходить; потрібне measure.",
          "Бінго! measure — це дієслово для «відміряти борошно». Борошно беруть точною кількістю, щоб рецепт не зламався.",
          "fry — це смажити в олії. Для «відміряти борошно» fry не підходить; потрібне measure.",
          "stir — це помішувати. Для «відміряти борошно» stir не підходить; потрібне measure."
        ],
        "es": [
          "peel es pelar; describe otra acción. Para «medir harina», peel no sirve; necesitas measure.",
          "Bien. measure es el verbo para «medir harina». La harina se toma en cantidad exacta para que la receta funcione.",
          "fry es freír en aceite; describe otra acción. Para «medir harina», fry no sirve; necesitas measure.",
          "stir es remover; describe otra acción. Para «medir harina», stir no sirve; necesitas measure."
        ],
        "pt-BR": [
          "peel é descascar; é outra ação. Para “medir farinha”, peel não serve; use measure.",
          "Certo. measure é o verbo para “medir farinha”. A farinha entra em quantidade exata para a receita dar certo.",
          "fry é fritar em óleo; é outra ação. Para “medir farinha”, fry não serve; use measure.",
          "stir é mexer; é outra ação. Para “medir farinha”, stir não serve; use measure."
        ],
        "vi": [
          "peel là gọt vỏ; đó là hành động khác. Với “đong bột mì”, peel không đúng; dùng measure.",
          "Đúng. measure là động từ cho “đong bột mì”. Bột cần đúng lượng để công thức không bị lệch.",
          "fry là chiên trong dầu; đó là hành động khác. Với “đong bột mì”, fry không đúng; dùng measure.",
          "stir là khuấy; đó là hành động khác. Với “đong bột mì”, stir không đúng; dùng measure."
        ],
        "id": [
          "peel berarti mengupas kulit; itu tindakan lain. Untuk “mengukur tepung”, peel bukan aksinya; pakai measure.",
          "Benar. measure adalah kata kerja untuk “mengukur tepung”. Tepung diambil dengan jumlah tepat agar resepnya berhasil.",
          "fry berarti menggoreng dengan minyak; itu tindakan lain. Untuk “mengukur tepung”, fry bukan aksinya; pakai measure.",
          "stir berarti mengaduk; itu tindakan lain. Untuk “mengukur tepung”, stir bukan aksinya; pakai measure."
        ],
        "tr": [
          "peel, kabuk soymak demektir; bu başka işlemdir. “unu ölçmek” için peel olmaz; measure gerekir.",
          "Doğru. measure, “unu ölçmek” için kullanılan fiildir. Un net miktarla alınır; tarifin dengesi buna bağlıdır.",
          "fry, yağda kızartmak demektir; bu başka işlemdir. “unu ölçmek” için fry olmaz; measure gerekir.",
          "stir, karıştırmak demektir; bu başka işlemdir. “unu ölçmek” için stir olmaz; measure gerekir."
        ],
        "pl": [
          "peel znaczy obierać skórkę; to inna czynność. Do „odmierzyć mąkę” peel nie pasuje; wybierz measure.",
          "Dobrze. measure to czasownik do „odmierzyć mąkę”. Mąkę bierze się w dokładnej ilości, żeby przepis się udał.",
          "fry znaczy smażyć na oleju; to inna czynność. Do „odmierzyć mąkę” fry nie pasuje; wybierz measure.",
          "stir znaczy mieszać; to inna czynność. Do „odmierzyć mąkę” stir nie pasuje; wybierz measure."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-040",
      "type": "mcq",
      "prompt": "Which English verb fits “preheat the oven”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «заранее разогреть духовку»?",
        "uk": "Яке англійське дієслово потрібне для \"preheat the oven\"?",
        "es": "¿Qué verbo inglés se usa para \"preheat the oven\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"preheat the oven\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"preheat the oven\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"preheat the oven\"?",
        "tr": "\"preheat the oven\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"preheat the oven\"?"
      },
      "choices": [
        "cool",
        "mix",
        "serve",
        "preheat"
      ],
      "correctIndex": 3,
      "learningGoal": "Choose the English cooking verb for preheat the oven.",
      "skillTag": "recipe_instruction_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C40",
        "K40"
      ],
      "choiceRationales": [
        "cool means to lower temperature and does not mean preheat the oven.",
        "mix means to combine ingredients and does not mean preheat the oven.",
        "serve means to bring food to the table and does not mean preheat the oven.",
        "preheat is the verb for warming the oven before food goes inside."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "cool — охлаждать. Это обратное направление: духовке нужно набрать температуру заранее, preheat.",
          "mix — смешивать ингредиенты. Духовку не смешивают; её заранее разогревают, это preheat.",
          "serve — подавать еду. До подачи ещё далеко: сначала духовку заранее разогревают, preheat.",
          "Бинго! preheat значит заранее разогреть. Духовка набирает температуру до того, как еда попадёт внутрь."
        ],
        "uk": [
          "cool тут не підходить, бо cool означає охолоджувати, а для \"preheat the oven\" вибирай preheat.",
          "mix тут не підходить, бо mix означає змішувати інгредієнти, а духовку заздалегідь гріють словом preheat.",
          "serve тут не підходить, бо serve означає подавати їжу, а перед випіканням духовку треба preheat.",
          "Бінго! preheat означає заздалегідь розігріти. Духовка набирає температуру до того, як їжа зайде всередину."
        ],
        "es": [
          "cool no sirve aquí porque cool es enfriar, y para calentar el horno antes de cocinar necesitas preheat.",
          "mix no sirve aquí porque mix es mezclar ingredientes, no calentar el horno antes de usarlo.",
          "serve no sirve aquí porque serve es servir comida, y el horno se prepara antes con preheat.",
          "Bien. preheat significa calentar de antemano; el horno alcanza temperatura antes de que entre la comida."
        ],
        "pt-BR": [
          "cool não serve aqui porque cool é esfriar, e para aquecer o forno antes da comida entrar use preheat.",
          "mix não serve aqui porque mix é misturar ingredientes, não aquecer o forno antes do preparo.",
          "serve não serve aqui porque serve é servir comida, e o forno é preparado antes com preheat.",
          "Certo. preheat significa aquecer antes; o forno chega à temperatura antes de a comida entrar."
        ],
        "vi": [
          "cool không hợp ở đây vì cool là làm nguội, còn làm nóng lò trước cần preheat.",
          "mix không hợp ở đây vì mix là trộn nguyên liệu, không phải làm nóng lò trước.",
          "serve không hợp ở đây vì serve là dọn món ăn, còn lò được chuẩn bị trước bằng preheat.",
          "Đúng. preheat nghĩa là làm nóng trước; lò đạt nhiệt độ trước khi thức ăn được cho vào."
        ],
        "id": [
          "cool tidak cocok karena cool berarti mendinginkan, sedangkan oven perlu dipanaskan dulu dengan preheat.",
          "mix tidak cocok karena mix berarti mencampur bahan, bukan memanaskan oven sebelum dipakai.",
          "serve tidak cocok karena serve berarti menyajikan makanan, sedangkan oven disiapkan dulu dengan preheat.",
          "Benar. preheat berarti memanaskan lebih dulu; oven mencapai suhu sebelum makanan masuk."
        ],
        "tr": [
          "cool burada uymaz çünkü cool soğutmak demektir, fırını önceden ısıtmak için preheat gerekir.",
          "mix burada uymaz çünkü mix malzemeleri karıştırmaktır, fırını önceden ısıtmak değildir.",
          "serve burada uymaz çünkü serve yemek sunmaktır, fırın ise pişirmeden önce preheat olur.",
          "Doğru. preheat önceden ısıtmak demektir; fırın yemek girmeden önce sıcaklığa ulaşır."
        ],
        "pl": [
          "cool tutaj nie pasuje, bo cool znaczy schładzać, a piekarnik przed pieczeniem trzeba preheat.",
          "mix tutaj nie pasuje, bo mix znaczy mieszać składniki, nie wcześniej rozgrzewać piekarnik.",
          "serve tutaj nie pasuje, bo serve znaczy podawać jedzenie, a piekarnik przygotowuje się przez preheat.",
          "Dobrze. preheat znaczy wcześniej rozgrzać; piekarnik osiąga temperaturę, zanim jedzenie trafi do środka."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-041",
      "type": "mcq",
      "prompt": "Which English phrase means “разделочная доска”?",
      "localizedPrompts": {
        "ru": "Как по-английски «разделочная доска»?",
        "uk": "Яке англійське слово або фраза означає \"a board used as a safe surface for cutting food\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a board used as a safe surface for cutting food\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a board used as a safe surface for cutting food\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a board used as a safe surface for cutting food\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a board used as a safe surface for cutting food\"?",
        "tr": "\"a board used as a safe surface for cutting food\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a board used as a safe surface for cutting food\"?"
      },
      "choices": [
        "tray",
        "cutting board",
        "plate",
        "shelf"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English kitchen word or phrase for a board used as a safe surface for cutting food.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C41",
        "K41"
      ],
      "choiceRationales": [
        "tray is plausible kitchen vocabulary but does not mean a board used as a safe surface for cutting food.",
        "cutting board is the only correct answer for a board used as a safe surface for cutting food.",
        "plate is plausible kitchen vocabulary but does not mean a board used as a safe surface for cutting food.",
        "shelf is plausible kitchen vocabulary but does not mean a board used as a safe surface for cutting food."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "tray — поднос: на нём переносят еду или чашки. Для поверхности, на которой режут ножом, нужен cutting board.",
          "Бинго! cutting board — разделочная доска. Это плоская доска, на которой режут овощи, хлеб или мясо.",
          "plate — тарелка для еды. На тарелке можно подать нарезку, но резать безопаснее на cutting board.",
          "shelf — полка. Она держит посуду или продукты, но не служит рабочей поверхностью для ножа; это cutting board."
        ],
        "uk": [
          "tray тут не підходить, бо tray називає інший предмет або дію, а для \"разделочная доска\" вибирай cutting board.",
          "Бінго! cutting board точно відповідає ідеї \"разделочная доска\". Це потрібне англійське слово для цього значення.",
          "plate тут не підходить, бо plate називає інший предмет або дію, а для \"разделочная доска\" вибирай cutting board.",
          "shelf тут не підходить, бо shelf називає інший предмет або дію, а для \"разделочная доска\" вибирай cutting board."
        ],
        "es": [
          "tray no sirve aquí porque tray apunta a otra cosa de cocina, y para \"разделочная доска\" elige cutting board.",
          "Bien. cutting board encaja con \"разделочная доска\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "plate no sirve aquí porque plate apunta a otra cosa de cocina, y para \"разделочная доска\" elige cutting board.",
          "shelf no sirve aquí porque shelf apunta a otra cosa de cocina, y para \"разделочная доска\" elige cutting board."
        ],
        "pt-BR": [
          "tray não serve aqui porque tray aponta para outra ideia, e para \"разделочная доска\" use cutting board.",
          "Certo. cutting board combina com \"разделочная доска\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "plate não serve aqui porque plate aponta para outra ideia, e para \"разделочная доска\" use cutting board.",
          "shelf não serve aqui porque shelf aponta para outra ideia, e para \"разделочная доска\" use cutting board."
        ],
        "vi": [
          "tray không hợp ở đây vì tray nói về ý khác, còn với \"разделочная доска\" dùng cutting board.",
          "Đúng. cutting board khớp với \"разделочная доска\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "plate không hợp ở đây vì plate nói về ý khác, còn với \"разделочная доска\" dùng cutting board.",
          "shelf không hợp ở đây vì shelf nói về ý khác, còn với \"разделочная доска\" dùng cutting board."
        ],
        "id": [
          "tray tidak cocok di sini karena tray menunjuk ide berbeda, dan untuk \"разделочная доска\" pakai cutting board.",
          "Benar. cutting board cocok dengan \"разделочная доска\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "plate tidak cocok di sini karena plate menunjuk ide berbeda, dan untuk \"разделочная доска\" pakai cutting board.",
          "shelf tidak cocok di sini karena shelf menunjuk ide berbeda, dan untuk \"разделочная доска\" pakai cutting board."
        ],
        "tr": [
          "tray burada uymaz çünkü tray farklı bir şeyi anlatır, \"разделочная доска\" için cutting board gerekir.",
          "Doğru. cutting board, \"разделочная доска\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "plate burada uymaz çünkü plate farklı bir şeyi anlatır, \"разделочная доска\" için cutting board gerekir.",
          "shelf burada uymaz çünkü shelf farklı bir şeyi anlatır, \"разделочная доска\" için cutting board gerekir."
        ],
        "pl": [
          "tray tutaj nie pasuje, bo tray wskazuje inną rzecz lub czynność, a do \"разделочная доска\" wybierz cutting board.",
          "Dobrze. cutting board pasuje do \"разделочная доска\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "plate tutaj nie pasuje, bo plate wskazuje inną rzecz lub czynność, a do \"разделочная доска\" wybierz cutting board.",
          "shelf tutaj nie pasuje, bo shelf wskazuje inną rzecz lub czynność, a do \"разделочная доска\" wybierz cutting board."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-042",
      "type": "mcq",
      "prompt": "Which English word means “кастрюля”?",
      "localizedPrompts": {
        "ru": "Как по-английски «кастрюля»?",
        "uk": "Яке англійське слово або фраза означає \"a deep cooking container used on a stove\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a deep cooking container used on a stove\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a deep cooking container used on a stove\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a deep cooking container used on a stove\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a deep cooking container used on a stove\"?",
        "tr": "\"a deep cooking container used on a stove\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a deep cooking container used on a stove\"?"
      },
      "choices": [
        "bowl",
        "pot",
        "kettle",
        "oven"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English kitchen word or phrase for a deep cooking container used on a stove.",
      "skillTag": "kitchen_container_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C42",
        "K42"
      ],
      "choiceRationales": [
        "bowl is plausible kitchen vocabulary but does not mean a deep cooking container used on a stove.",
        "pot is the only correct answer for a deep cooking container used on a stove.",
        "kettle is plausible kitchen vocabulary but does not mean a deep cooking container used on a stove.",
        "oven is plausible kitchen vocabulary but does not mean a deep cooking container used on a stove."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "bowl — миска. Она держит суп уже на столе, а варят суп в кастрюле: pot.",
          "Бинго! pot — кастрюля. В ней варят суп, пасту или овощи на плите.",
          "kettle — чайник для кипячения воды. Для супа или пасты нужна не kettle, а pot.",
          "oven — духовка. Она запекает внутри, но кастрюля на плите по-английски — pot."
        ],
        "uk": [
          "bowl тут не підходить, бо bowl називає інший предмет або дію, а для \"кастрюля\" вибирай pot.",
          "Бінго! pot точно відповідає ідеї \"кастрюля\". Це потрібне англійське слово для цього значення.",
          "kettle тут не підходить, бо kettle називає інший предмет або дію, а для \"кастрюля\" вибирай pot.",
          "oven тут не підходить, бо oven називає інший предмет або дію, а для \"кастрюля\" вибирай pot."
        ],
        "es": [
          "bowl no sirve aquí porque bowl apunta a otra cosa de cocina, y para \"кастрюля\" elige pot.",
          "Bien. pot encaja con \"кастрюля\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "kettle no sirve aquí porque kettle apunta a otra cosa de cocina, y para \"кастрюля\" elige pot.",
          "oven no sirve aquí porque oven apunta a otra cosa de cocina, y para \"кастрюля\" elige pot."
        ],
        "pt-BR": [
          "bowl não serve aqui porque bowl aponta para outra ideia, e para \"кастрюля\" use pot.",
          "Certo. pot combina com \"кастрюля\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "kettle não serve aqui porque kettle aponta para outra ideia, e para \"кастрюля\" use pot.",
          "oven não serve aqui porque oven aponta para outra ideia, e para \"кастрюля\" use pot."
        ],
        "vi": [
          "bowl không hợp ở đây vì bowl nói về ý khác, còn với \"кастрюля\" dùng pot.",
          "Đúng. pot khớp với \"кастрюля\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "kettle không hợp ở đây vì kettle nói về ý khác, còn với \"кастрюля\" dùng pot.",
          "oven không hợp ở đây vì oven nói về ý khác, còn với \"кастрюля\" dùng pot."
        ],
        "id": [
          "bowl tidak cocok di sini karena bowl menunjuk ide berbeda, dan untuk \"кастрюля\" pakai pot.",
          "Benar. pot cocok dengan \"кастрюля\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "kettle tidak cocok di sini karena kettle menunjuk ide berbeda, dan untuk \"кастрюля\" pakai pot.",
          "oven tidak cocok di sini karena oven menunjuk ide berbeda, dan untuk \"кастрюля\" pakai pot."
        ],
        "tr": [
          "bowl burada uymaz çünkü bowl farklı bir şeyi anlatır, \"кастрюля\" için pot gerekir.",
          "Doğru. pot, \"кастрюля\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "kettle burada uymaz çünkü kettle farklı bir şeyi anlatır, \"кастрюля\" için pot gerekir.",
          "oven burada uymaz çünkü oven farklı bir şeyi anlatır, \"кастрюля\" için pot gerekir."
        ],
        "pl": [
          "bowl tutaj nie pasuje, bo bowl wskazuje inną rzecz lub czynność, a do \"кастрюля\" wybierz pot.",
          "Dobrze. pot pasuje do \"кастрюля\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "kettle tutaj nie pasuje, bo kettle wskazuje inną rzecz lub czynność, a do \"кастрюля\" wybierz pot.",
          "oven tutaj nie pasuje, bo oven wskazuje inną rzecz lub czynność, a do \"кастрюля\" wybierz pot."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-043",
      "type": "mcq",
      "prompt": "Which English word means “крышка кастрюли”?",
      "localizedPrompts": {
        "ru": "Как по-английски «крышка кастрюли»?",
        "uk": "Яке англійське слово або фраза означає \"the cover for a pot or container\"?",
        "es": "¿Qué palabra o frase inglesa significa \"the cover for a pot or container\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"the cover for a pot or container\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"the cover for a pot or container\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"the cover for a pot or container\"?",
        "tr": "\"the cover for a pot or container\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"the cover for a pot or container\"?"
      },
      "choices": [
        "lid",
        "sink",
        "fork",
        "towel"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for the cover for a pot or container.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C43",
        "K43"
      ],
      "choiceRationales": [
        "lid is the only correct answer for the cover for a pot or container.",
        "sink is plausible kitchen vocabulary but does not mean the cover for a pot or container.",
        "fork is plausible kitchen vocabulary but does not mean the cover for a pot or container.",
        "towel is plausible kitchen vocabulary but does not mean the cover for a pot or container."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! lid — крышка. Ею закрывают кастрюлю, сковороду или контейнер.",
          "sink — раковина или мойка. Там моют посуду, но кастрюлю сверху закрывает lid.",
          "fork — вилка. Она помогает есть, но крышкой для кастрюли не становится; нужна lid.",
          "towel — полотенце. Им вытирают руки или посуду, а закрывает кастрюлю lid."
        ],
        "uk": [
          "Бінго! lid точно відповідає ідеї \"крышка кастрюли\". Це потрібне англійське слово для цього значення.",
          "sink тут не підходить, бо sink називає інший предмет або дію, а для \"крышка кастрюли\" вибирай lid.",
          "fork тут не підходить, бо fork називає інший предмет або дію, а для \"крышка кастрюли\" вибирай lid.",
          "towel тут не підходить, бо towel називає інший предмет або дію, а для \"крышка кастрюли\" вибирай lid."
        ],
        "es": [
          "Bien. lid encaja con \"крышка кастрюли\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "sink no sirve aquí porque sink apunta a otra cosa de cocina, y para \"крышка кастрюли\" elige lid.",
          "fork no sirve aquí porque fork apunta a otra cosa de cocina, y para \"крышка кастрюли\" elige lid.",
          "towel no sirve aquí porque towel apunta a otra cosa de cocina, y para \"крышка кастрюли\" elige lid."
        ],
        "pt-BR": [
          "Certo. lid combina com \"крышка кастрюли\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "sink não serve aqui porque sink aponta para outra ideia, e para \"крышка кастрюли\" use lid.",
          "fork não serve aqui porque fork aponta para outra ideia, e para \"крышка кастрюли\" use lid.",
          "towel não serve aqui porque towel aponta para outra ideia, e para \"крышка кастрюли\" use lid."
        ],
        "vi": [
          "Đúng. lid khớp với \"крышка кастрюли\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "sink không hợp ở đây vì sink nói về ý khác, còn với \"крышка кастрюли\" dùng lid.",
          "fork không hợp ở đây vì fork nói về ý khác, còn với \"крышка кастрюли\" dùng lid.",
          "towel không hợp ở đây vì towel nói về ý khác, còn với \"крышка кастрюли\" dùng lid."
        ],
        "id": [
          "Benar. lid cocok dengan \"крышка кастрюли\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "sink tidak cocok di sini karena sink menunjuk ide berbeda, dan untuk \"крышка кастрюли\" pakai lid.",
          "fork tidak cocok di sini karena fork menunjuk ide berbeda, dan untuk \"крышка кастрюли\" pakai lid.",
          "towel tidak cocok di sini karena towel menunjuk ide berbeda, dan untuk \"крышка кастрюли\" pakai lid."
        ],
        "tr": [
          "Doğru. lid, \"крышка кастрюли\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "sink burada uymaz çünkü sink farklı bir şeyi anlatır, \"крышка кастрюли\" için lid gerekir.",
          "fork burada uymaz çünkü fork farklı bir şeyi anlatır, \"крышка кастрюли\" için lid gerekir.",
          "towel burada uymaz çünkü towel farklı bir şeyi anlatır, \"крышка кастрюли\" için lid gerekir."
        ],
        "pl": [
          "Dobrze. lid pasuje do \"крышка кастрюли\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "sink tutaj nie pasuje, bo sink wskazuje inną rzecz lub czynność, a do \"крышка кастрюли\" wybierz lid.",
          "fork tutaj nie pasuje, bo fork wskazuje inną rzecz lub czynność, a do \"крышка кастрюли\" wybierz lid.",
          "towel tutaj nie pasuje, bo towel wskazuje inną rzecz lub czynność, a do \"крышка кастрюли\" wybierz lid."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-044",
      "type": "mcq",
      "prompt": "Which English word means “лопатка для сковороды”?",
      "localizedPrompts": {
        "ru": "Как по-английски «лопатка для сковороды»?",
        "uk": "Яке англійське слово або фраза означає \"a flat tool for lifting or turning food in a pan\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a flat tool for lifting or turning food in a pan\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a flat tool for lifting or turning food in a pan\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a flat tool for lifting or turning food in a pan\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a flat tool for lifting or turning food in a pan\"?",
        "tr": "\"a flat tool for lifting or turning food in a pan\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a flat tool for lifting or turning food in a pan\"?"
      },
      "choices": [
        "ladle",
        "spatula",
        "grater",
        "peeler"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English kitchen word or phrase for a flat tool for lifting or turning food in a pan.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C44",
        "K44"
      ],
      "choiceRationales": [
        "ladle is plausible kitchen vocabulary but does not mean a flat tool for lifting or turning food in a pan.",
        "spatula is the only correct answer for a flat tool for lifting or turning food in a pan.",
        "grater is plausible kitchen vocabulary but does not mean a flat tool for lifting or turning food in a pan.",
        "peeler is plausible kitchen vocabulary but does not mean a flat tool for lifting or turning food in a pan."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "ladle — половник для супа или соуса. Переворачивать еду на сковороде удобнее spatula.",
          "Бинго! spatula — кухонная лопатка. Ею поддевают и переворачивают еду на сковороде.",
          "grater — тёрка. Она делает сыр или овощи мелкими кусочками, но для переворота нужен spatula.",
          "peeler — овощечистка. Она снимает кожуру, а лопатка для сковороды — spatula."
        ],
        "uk": [
          "ladle тут не підходить, бо ladle називає інший предмет або дію, а для \"лопатка для сковороды\" вибирай spatula.",
          "Бінго! spatula точно відповідає ідеї \"лопатка для сковороды\". Це потрібне англійське слово для цього значення.",
          "grater тут не підходить, бо grater називає інший предмет або дію, а для \"лопатка для сковороды\" вибирай spatula.",
          "peeler тут не підходить, бо peeler називає інший предмет або дію, а для \"лопатка для сковороды\" вибирай spatula."
        ],
        "es": [
          "ladle no sirve aquí porque ladle apunta a otra cosa de cocina, y para \"лопатка для сковороды\" elige spatula.",
          "Bien. spatula encaja con \"лопатка для сковороды\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "grater no sirve aquí porque grater apunta a otra cosa de cocina, y para \"лопатка для сковороды\" elige spatula.",
          "peeler no sirve aquí porque peeler apunta a otra cosa de cocina, y para \"лопатка для сковороды\" elige spatula."
        ],
        "pt-BR": [
          "ladle não serve aqui porque ladle aponta para outra ideia, e para \"лопатка для сковороды\" use spatula.",
          "Certo. spatula combina com \"лопатка для сковороды\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "grater não serve aqui porque grater aponta para outra ideia, e para \"лопатка для сковороды\" use spatula.",
          "peeler não serve aqui porque peeler aponta para outra ideia, e para \"лопатка для сковороды\" use spatula."
        ],
        "vi": [
          "ladle không hợp ở đây vì ladle nói về ý khác, còn với \"лопатка для сковороды\" dùng spatula.",
          "Đúng. spatula khớp với \"лопатка для сковороды\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "grater không hợp ở đây vì grater nói về ý khác, còn với \"лопатка для сковороды\" dùng spatula.",
          "peeler không hợp ở đây vì peeler nói về ý khác, còn với \"лопатка для сковороды\" dùng spatula."
        ],
        "id": [
          "ladle tidak cocok di sini karena ladle menunjuk ide berbeda, dan untuk \"лопатка для сковороды\" pakai spatula.",
          "Benar. spatula cocok dengan \"лопатка для сковороды\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "grater tidak cocok di sini karena grater menunjuk ide berbeda, dan untuk \"лопатка для сковороды\" pakai spatula.",
          "peeler tidak cocok di sini karena peeler menunjuk ide berbeda, dan untuk \"лопатка для сковороды\" pakai spatula."
        ],
        "tr": [
          "ladle burada uymaz çünkü ladle farklı bir şeyi anlatır, \"лопатка для сковороды\" için spatula gerekir.",
          "Doğru. spatula, \"лопатка для сковороды\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "grater burada uymaz çünkü grater farklı bir şeyi anlatır, \"лопатка для сковороды\" için spatula gerekir.",
          "peeler burada uymaz çünkü peeler farklı bir şeyi anlatır, \"лопатка для сковороды\" için spatula gerekir."
        ],
        "pl": [
          "ladle tutaj nie pasuje, bo ladle wskazuje inną rzecz lub czynność, a do \"лопатка для сковороды\" wybierz spatula.",
          "Dobrze. spatula pasuje do \"лопатка для сковороды\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "grater tutaj nie pasuje, bo grater wskazuje inną rzecz lub czynność, a do \"лопатка для сковороды\" wybierz spatula.",
          "peeler tutaj nie pasuje, bo peeler wskazuje inną rzecz lub czynność, a do \"лопатка для сковороды\" wybierz spatula."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-045",
      "type": "mcq",
      "prompt": "Which English word means “половник”?",
      "localizedPrompts": {
        "ru": "Как по-английски «половник»?",
        "uk": "Яке англійське слово або фраза означає \"a deep spoon for serving soup or sauce\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a deep spoon for serving soup or sauce\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a deep spoon for serving soup or sauce\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a deep spoon for serving soup or sauce\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a deep spoon for serving soup or sauce\"?",
        "tr": "\"a deep spoon for serving soup or sauce\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a deep spoon for serving soup or sauce\"?"
      },
      "choices": [
        "spoon",
        "ladle",
        "knife",
        "whisk"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English kitchen word or phrase for a deep spoon for serving soup or sauce.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C45",
        "K45"
      ],
      "choiceRationales": [
        "spoon is plausible kitchen vocabulary but does not mean a deep spoon for serving soup or sauce.",
        "ladle is the only correct answer for a deep spoon for serving soup or sauce.",
        "knife is plausible kitchen vocabulary but does not mean a deep spoon for serving soup or sauce.",
        "whisk is plausible kitchen vocabulary but does not mean a deep spoon for serving soup or sauce."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "spoon — обычная ложка. Для супа из кастрюли нужен глубокий половник: ladle.",
          "Бинго! ladle — половник. Им набирают суп, соус или рагу из кастрюли.",
          "knife — нож. Он режет продукты, но суп из кастрюли не набирает; нужен ladle.",
          "whisk — венчик для взбивания. Он смешивает яйца или соус, а разливают суп ladle."
        ],
        "uk": [
          "spoon тут не підходить, бо spoon називає інший предмет або дію, а для \"половник\" вибирай ladle.",
          "Бінго! ladle точно відповідає ідеї \"половник\". Це потрібне англійське слово для цього значення.",
          "knife тут не підходить, бо knife називає інший предмет або дію, а для \"половник\" вибирай ladle.",
          "whisk тут не підходить, бо whisk називає інший предмет або дію, а для \"половник\" вибирай ladle."
        ],
        "es": [
          "spoon no sirve aquí porque spoon apunta a otra cosa de cocina, y para \"половник\" elige ladle.",
          "Bien. ladle encaja con \"половник\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "knife no sirve aquí porque knife apunta a otra cosa de cocina, y para \"половник\" elige ladle.",
          "whisk no sirve aquí porque whisk apunta a otra cosa de cocina, y para \"половник\" elige ladle."
        ],
        "pt-BR": [
          "spoon não serve aqui porque spoon aponta para outra ideia, e para \"половник\" use ladle.",
          "Certo. ladle combina com \"половник\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "knife não serve aqui porque knife aponta para outra ideia, e para \"половник\" use ladle.",
          "whisk não serve aqui porque whisk aponta para outra ideia, e para \"половник\" use ladle."
        ],
        "vi": [
          "spoon không hợp ở đây vì spoon nói về ý khác, còn với \"половник\" dùng ladle.",
          "Đúng. ladle khớp với \"половник\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "knife không hợp ở đây vì knife nói về ý khác, còn với \"половник\" dùng ladle.",
          "whisk không hợp ở đây vì whisk nói về ý khác, còn với \"половник\" dùng ladle."
        ],
        "id": [
          "spoon tidak cocok di sini karena spoon menunjuk ide berbeda, dan untuk \"половник\" pakai ladle.",
          "Benar. ladle cocok dengan \"половник\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "knife tidak cocok di sini karena knife menunjuk ide berbeda, dan untuk \"половник\" pakai ladle.",
          "whisk tidak cocok di sini karena whisk menunjuk ide berbeda, dan untuk \"половник\" pakai ladle."
        ],
        "tr": [
          "spoon burada uymaz çünkü spoon farklı bir şeyi anlatır, \"половник\" için ladle gerekir.",
          "Doğru. ladle, \"половник\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "knife burada uymaz çünkü knife farklı bir şeyi anlatır, \"половник\" için ladle gerekir.",
          "whisk burada uymaz çünkü whisk farklı bir şeyi anlatır, \"половник\" için ladle gerekir."
        ],
        "pl": [
          "spoon tutaj nie pasuje, bo spoon wskazuje inną rzecz lub czynność, a do \"половник\" wybierz ladle.",
          "Dobrze. ladle pasuje do \"половник\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "knife tutaj nie pasuje, bo knife wskazuje inną rzecz lub czynność, a do \"половник\" wybierz ladle.",
          "whisk tutaj nie pasuje, bo whisk wskazuje inną rzecz lub czynność, a do \"половник\" wybierz ladle."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-046",
      "type": "mcq",
      "prompt": "Which English word means “овощечистка”?",
      "localizedPrompts": {
        "ru": "Как по-английски «овощечистка»?",
        "uk": "Яке англійське слово або фраза означає \"a tool for removing thin skin from vegetables\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a tool for removing thin skin from vegetables\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a tool for removing thin skin from vegetables\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a tool for removing thin skin from vegetables\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a tool for removing thin skin from vegetables\"?",
        "tr": "\"a tool for removing thin skin from vegetables\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a tool for removing thin skin from vegetables\"?"
      },
      "choices": [
        "peeler",
        "grater",
        "fork",
        "toaster"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a tool for removing thin skin from vegetables.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C46",
        "K46"
      ],
      "choiceRationales": [
        "peeler is the only correct answer for a tool for removing thin skin from vegetables.",
        "grater is plausible kitchen vocabulary but does not mean a tool for removing thin skin from vegetables.",
        "fork is plausible kitchen vocabulary but does not mean a tool for removing thin skin from vegetables.",
        "toaster is plausible kitchen vocabulary but does not mean a tool for removing thin skin from vegetables."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! peeler — овощечистка. Ею снимают тонкую кожуру с картошки, моркови или яблока.",
          "grater — тёрка. Она измельчает продукт, а кожуру тонкой полоской снимает peeler.",
          "fork — вилка. Ею едят или придерживают еду, но овощи чистят peeler.",
          "toaster — тостер для хлеба. К овощной кожуре он не относится; нужный инструмент — peeler."
        ],
        "uk": [
          "Бінго! peeler точно відповідає ідеї \"овощечистка\". Це потрібне англійське слово для цього значення.",
          "grater тут не підходить, бо grater називає інший предмет або дію, а для \"овощечистка\" вибирай peeler.",
          "fork тут не підходить, бо fork називає інший предмет або дію, а для \"овощечистка\" вибирай peeler.",
          "toaster тут не підходить, бо toaster називає інший предмет або дію, а для \"овощечистка\" вибирай peeler."
        ],
        "es": [
          "Bien. peeler encaja con \"овощечистка\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "grater no sirve aquí porque grater apunta a otra cosa de cocina, y para \"овощечистка\" elige peeler.",
          "fork no sirve aquí porque fork apunta a otra cosa de cocina, y para \"овощечистка\" elige peeler.",
          "toaster no sirve aquí porque toaster apunta a otra cosa de cocina, y para \"овощечистка\" elige peeler."
        ],
        "pt-BR": [
          "Certo. peeler combina com \"овощечистка\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "grater não serve aqui porque grater aponta para outra ideia, e para \"овощечистка\" use peeler.",
          "fork não serve aqui porque fork aponta para outra ideia, e para \"овощечистка\" use peeler.",
          "toaster não serve aqui porque toaster aponta para outra ideia, e para \"овощечистка\" use peeler."
        ],
        "vi": [
          "Đúng. peeler khớp với \"овощечистка\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "grater không hợp ở đây vì grater nói về ý khác, còn với \"овощечистка\" dùng peeler.",
          "fork không hợp ở đây vì fork nói về ý khác, còn với \"овощечистка\" dùng peeler.",
          "toaster không hợp ở đây vì toaster nói về ý khác, còn với \"овощечистка\" dùng peeler."
        ],
        "id": [
          "Benar. peeler cocok dengan \"овощечистка\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "grater tidak cocok di sini karena grater menunjuk ide berbeda, dan untuk \"овощечистка\" pakai peeler.",
          "fork tidak cocok di sini karena fork menunjuk ide berbeda, dan untuk \"овощечистка\" pakai peeler.",
          "toaster tidak cocok di sini karena toaster menunjuk ide berbeda, dan untuk \"овощечистка\" pakai peeler."
        ],
        "tr": [
          "Doğru. peeler, \"овощечистка\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "grater burada uymaz çünkü grater farklı bir şeyi anlatır, \"овощечистка\" için peeler gerekir.",
          "fork burada uymaz çünkü fork farklı bir şeyi anlatır, \"овощечистка\" için peeler gerekir.",
          "toaster burada uymaz çünkü toaster farklı bir şeyi anlatır, \"овощечистка\" için peeler gerekir."
        ],
        "pl": [
          "Dobrze. peeler pasuje do \"овощечистка\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "grater tutaj nie pasuje, bo grater wskazuje inną rzecz lub czynność, a do \"овощечистка\" wybierz peeler.",
          "fork tutaj nie pasuje, bo fork wskazuje inną rzecz lub czynność, a do \"овощечистка\" wybierz peeler.",
          "toaster tutaj nie pasuje, bo toaster wskazuje inną rzecz lub czynność, a do \"овощечистка\" wybierz peeler."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-047",
      "type": "mcq",
      "prompt": "Which English word means “дуршлаг”?",
      "localizedPrompts": {
        "ru": "Как по-английски «дуршлаг»?",
        "uk": "Яке англійське слово або фраза означає \"a bowl-shaped strainer for draining pasta or vegetables\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a bowl-shaped strainer for draining pasta or vegetables\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a bowl-shaped strainer for draining pasta or vegetables\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a bowl-shaped strainer for draining pasta or vegetables\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a bowl-shaped strainer for draining pasta or vegetables\"?",
        "tr": "\"a bowl-shaped strainer for draining pasta or vegetables\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a bowl-shaped strainer for draining pasta or vegetables\"?"
      },
      "choices": [
        "bowl",
        "colander",
        "cup",
        "tray"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English kitchen word or phrase for a bowl-shaped strainer for draining pasta or vegetables.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C47",
        "K47"
      ],
      "choiceRationales": [
        "bowl is plausible kitchen vocabulary but does not mean a bowl-shaped strainer for draining pasta or vegetables.",
        "colander is the only correct answer for a bowl-shaped strainer for draining pasta or vegetables.",
        "cup is plausible kitchen vocabulary but does not mean a bowl-shaped strainer for draining pasta or vegetables.",
        "tray is plausible kitchen vocabulary but does not mean a bowl-shaped strainer for draining pasta or vegetables."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "bowl — миска. Она держит жидкость, а дуршлаг наоборот даёт воде уйти: colander.",
          "Бинго! colander — дуршлаг. Через его отверстия сливают воду с пасты или овощей.",
          "cup — чашка. В неё наливают напиток, но воду с макарон сливают через colander.",
          "tray — поднос. Он переносит посуду, а для слива воды нужен colander."
        ],
        "uk": [
          "bowl тут не підходить, бо bowl називає інший предмет або дію, а для \"дуршлаг\" вибирай colander.",
          "Бінго! colander точно відповідає ідеї \"дуршлаг\". Це потрібне англійське слово для цього значення.",
          "cup тут не підходить, бо cup називає інший предмет або дію, а для \"дуршлаг\" вибирай colander.",
          "tray тут не підходить, бо tray називає інший предмет або дію, а для \"дуршлаг\" вибирай colander."
        ],
        "es": [
          "bowl no sirve aquí porque bowl apunta a otra cosa de cocina, y para \"дуршлаг\" elige colander.",
          "Bien. colander encaja con \"дуршлаг\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "cup no sirve aquí porque cup apunta a otra cosa de cocina, y para \"дуршлаг\" elige colander.",
          "tray no sirve aquí porque tray apunta a otra cosa de cocina, y para \"дуршлаг\" elige colander."
        ],
        "pt-BR": [
          "bowl não serve aqui porque bowl aponta para outra ideia, e para \"дуршлаг\" use colander.",
          "Certo. colander combina com \"дуршлаг\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "cup não serve aqui porque cup aponta para outra ideia, e para \"дуршлаг\" use colander.",
          "tray não serve aqui porque tray aponta para outra ideia, e para \"дуршлаг\" use colander."
        ],
        "vi": [
          "bowl không hợp ở đây vì bowl nói về ý khác, còn với \"дуршлаг\" dùng colander.",
          "Đúng. colander khớp với \"дуршлаг\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "cup không hợp ở đây vì cup nói về ý khác, còn với \"дуршлаг\" dùng colander.",
          "tray không hợp ở đây vì tray nói về ý khác, còn với \"дуршлаг\" dùng colander."
        ],
        "id": [
          "bowl tidak cocok di sini karena bowl menunjuk ide berbeda, dan untuk \"дуршлаг\" pakai colander.",
          "Benar. colander cocok dengan \"дуршлаг\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "cup tidak cocok di sini karena cup menunjuk ide berbeda, dan untuk \"дуршлаг\" pakai colander.",
          "tray tidak cocok di sini karena tray menunjuk ide berbeda, dan untuk \"дуршлаг\" pakai colander."
        ],
        "tr": [
          "bowl burada uymaz çünkü bowl farklı bir şeyi anlatır, \"дуршлаг\" için colander gerekir.",
          "Doğru. colander, \"дуршлаг\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "cup burada uymaz çünkü cup farklı bir şeyi anlatır, \"дуршлаг\" için colander gerekir.",
          "tray burada uymaz çünkü tray farklı bir şeyi anlatır, \"дуршлаг\" için colander gerekir."
        ],
        "pl": [
          "bowl tutaj nie pasuje, bo bowl wskazuje inną rzecz lub czynność, a do \"дуршлаг\" wybierz colander.",
          "Dobrze. colander pasuje do \"дуршлаг\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "cup tutaj nie pasuje, bo cup wskazuje inną rzecz lub czynność, a do \"дуршлаг\" wybierz colander.",
          "tray tutaj nie pasuje, bo tray wskazuje inną rzecz lub czynność, a do \"дуршлаг\" wybierz colander."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-048",
      "type": "mcq",
      "prompt": "Which English phrase means “скалка”?",
      "localizedPrompts": {
        "ru": "Как по-английски «скалка»?",
        "uk": "Яке англійське слово або фраза означає \"a cylinder used to roll dough flat\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a cylinder used to roll dough flat\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a cylinder used to roll dough flat\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a cylinder used to roll dough flat\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a cylinder used to roll dough flat\"?",
        "tr": "\"a cylinder used to roll dough flat\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a cylinder used to roll dough flat\"?"
      },
      "choices": [
        "rolling pin",
        "cutting board",
        "kettle",
        "apron"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a cylinder used to roll dough flat.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C48",
        "K48"
      ],
      "choiceRationales": [
        "rolling pin is the only correct answer for a cylinder used to roll dough flat.",
        "cutting board is plausible kitchen vocabulary but does not mean a cylinder used to roll dough flat.",
        "kettle is plausible kitchen vocabulary but does not mean a cylinder used to roll dough flat.",
        "apron is plausible kitchen vocabulary but does not mean a cylinder used to roll dough flat."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! rolling pin — скалка. Ею раскатывают тесто в тонкий ровный слой.",
          "cutting board — разделочная доска. На ней режут, но тесто раскатывают rolling pin.",
          "kettle — чайник. Он кипятит воду, а с тестом работает rolling pin.",
          "apron — фартук. Он защищает одежду, но не раскатывает тесто; нужна rolling pin."
        ],
        "uk": [
          "Бінго! rolling pin точно відповідає ідеї \"скалка\". Це потрібне англійське слово для цього значення.",
          "cutting board тут не підходить, бо cutting board називає інший предмет або дію, а для \"скалка\" вибирай rolling pin.",
          "kettle тут не підходить, бо kettle називає інший предмет або дію, а для \"скалка\" вибирай rolling pin.",
          "apron тут не підходить, бо apron називає інший предмет або дію, а для \"скалка\" вибирай rolling pin."
        ],
        "es": [
          "Bien. rolling pin encaja con \"скалка\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "cutting board no sirve aquí porque cutting board apunta a otra cosa de cocina, y para \"скалка\" elige rolling pin.",
          "kettle no sirve aquí porque kettle apunta a otra cosa de cocina, y para \"скалка\" elige rolling pin.",
          "apron no sirve aquí porque apron apunta a otra cosa de cocina, y para \"скалка\" elige rolling pin."
        ],
        "pt-BR": [
          "Certo. rolling pin combina com \"скалка\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "cutting board não serve aqui porque cutting board aponta para outra ideia, e para \"скалка\" use rolling pin.",
          "kettle não serve aqui porque kettle aponta para outra ideia, e para \"скалка\" use rolling pin.",
          "apron não serve aqui porque apron aponta para outra ideia, e para \"скалка\" use rolling pin."
        ],
        "vi": [
          "Đúng. rolling pin khớp với \"скалка\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "cutting board không hợp ở đây vì cutting board nói về ý khác, còn với \"скалка\" dùng rolling pin.",
          "kettle không hợp ở đây vì kettle nói về ý khác, còn với \"скалка\" dùng rolling pin.",
          "apron không hợp ở đây vì apron nói về ý khác, còn với \"скалка\" dùng rolling pin."
        ],
        "id": [
          "Benar. rolling pin cocok dengan \"скалка\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "cutting board tidak cocok di sini karena cutting board menunjuk ide berbeda, dan untuk \"скалка\" pakai rolling pin.",
          "kettle tidak cocok di sini karena kettle menunjuk ide berbeda, dan untuk \"скалка\" pakai rolling pin.",
          "apron tidak cocok di sini karena apron menunjuk ide berbeda, dan untuk \"скалка\" pakai rolling pin."
        ],
        "tr": [
          "Doğru. rolling pin, \"скалка\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "cutting board burada uymaz çünkü cutting board farklı bir şeyi anlatır, \"скалка\" için rolling pin gerekir.",
          "kettle burada uymaz çünkü kettle farklı bir şeyi anlatır, \"скалка\" için rolling pin gerekir.",
          "apron burada uymaz çünkü apron farklı bir şeyi anlatır, \"скалка\" için rolling pin gerekir."
        ],
        "pl": [
          "Dobrze. rolling pin pasuje do \"скалка\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "cutting board tutaj nie pasuje, bo cutting board wskazuje inną rzecz lub czynność, a do \"скалка\" wybierz rolling pin.",
          "kettle tutaj nie pasuje, bo kettle wskazuje inną rzecz lub czynność, a do \"скалка\" wybierz rolling pin.",
          "apron tutaj nie pasuje, bo apron wskazuje inną rzecz lub czynność, a do \"скалка\" wybierz rolling pin."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-049",
      "type": "mcq",
      "prompt": "Which English phrase means “противень”?",
      "localizedPrompts": {
        "ru": "Как по-английски «противень»?",
        "uk": "Яке англійське слово або фраза означає \"a flat tray used for baking in an oven\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a flat tray used for baking in an oven\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a flat tray used for baking in an oven\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a flat tray used for baking in an oven\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a flat tray used for baking in an oven\"?",
        "tr": "\"a flat tray used for baking in an oven\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a flat tray used for baking in an oven\"?"
      },
      "choices": [
        "plate",
        "pan",
        "baking tray",
        "shelf"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose the English kitchen word or phrase for a flat tray used for baking in an oven.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C49",
        "K49"
      ],
      "choiceRationales": [
        "plate is plausible kitchen vocabulary but does not mean a flat tray used for baking in an oven.",
        "pan is plausible kitchen vocabulary but does not mean a flat tray used for baking in an oven.",
        "baking tray is the only correct answer for a flat tray used for baking in an oven.",
        "shelf is plausible kitchen vocabulary but does not mean a flat tray used for baking in an oven."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "plate — тарелка. На ней подают готовую еду, а в духовку с печеньем ставят baking tray.",
          "pan — сковорода или форма по контексту. Для плоского противня в духовке точнее baking tray.",
          "Бинго! baking tray — противень. На нём пекут печенье, овощи или другие блюда в духовке.",
          "shelf — полка. Она хранит вещи, но противень для выпечки называется baking tray."
        ],
        "uk": [
          "plate тут не підходить, бо plate називає інший предмет або дію, а для \"противень\" вибирай baking tray.",
          "pan тут не підходить, бо pan називає інший предмет або дію, а для \"противень\" вибирай baking tray.",
          "Бінго! baking tray точно відповідає ідеї \"противень\". Це потрібне англійське слово для цього значення.",
          "shelf тут не підходить, бо shelf називає інший предмет або дію, а для \"противень\" вибирай baking tray."
        ],
        "es": [
          "plate no sirve aquí porque plate apunta a otra cosa de cocina, y para \"противень\" elige baking tray.",
          "pan no sirve aquí porque pan apunta a otra cosa de cocina, y para \"противень\" elige baking tray.",
          "Bien. baking tray encaja con \"противень\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "shelf no sirve aquí porque shelf apunta a otra cosa de cocina, y para \"противень\" elige baking tray."
        ],
        "pt-BR": [
          "plate não serve aqui porque plate aponta para outra ideia, e para \"противень\" use baking tray.",
          "pan não serve aqui porque pan aponta para outra ideia, e para \"противень\" use baking tray.",
          "Certo. baking tray combina com \"противень\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "shelf não serve aqui porque shelf aponta para outra ideia, e para \"противень\" use baking tray."
        ],
        "vi": [
          "plate không hợp ở đây vì plate nói về ý khác, còn với \"противень\" dùng baking tray.",
          "pan không hợp ở đây vì pan nói về ý khác, còn với \"противень\" dùng baking tray.",
          "Đúng. baking tray khớp với \"противень\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "shelf không hợp ở đây vì shelf nói về ý khác, còn với \"противень\" dùng baking tray."
        ],
        "id": [
          "plate tidak cocok di sini karena plate menunjuk ide berbeda, dan untuk \"противень\" pakai baking tray.",
          "pan tidak cocok di sini karena pan menunjuk ide berbeda, dan untuk \"противень\" pakai baking tray.",
          "Benar. baking tray cocok dengan \"противень\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "shelf tidak cocok di sini karena shelf menunjuk ide berbeda, dan untuk \"противень\" pakai baking tray."
        ],
        "tr": [
          "plate burada uymaz çünkü plate farklı bir şeyi anlatır, \"противень\" için baking tray gerekir.",
          "pan burada uymaz çünkü pan farklı bir şeyi anlatır, \"противень\" için baking tray gerekir.",
          "Doğru. baking tray, \"противень\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "shelf burada uymaz çünkü shelf farklı bir şeyi anlatır, \"противень\" için baking tray gerekir."
        ],
        "pl": [
          "plate tutaj nie pasuje, bo plate wskazuje inną rzecz lub czynność, a do \"противень\" wybierz baking tray.",
          "pan tutaj nie pasuje, bo pan wskazuje inną rzecz lub czynność, a do \"противень\" wybierz baking tray.",
          "Dobrze. baking tray pasuje do \"противень\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "shelf tutaj nie pasuje, bo shelf wskazuje inną rzecz lub czynność, a do \"противень\" wybierz baking tray."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-050",
      "type": "mcq",
      "prompt": "Which English word means “блендер”?",
      "localizedPrompts": {
        "ru": "Как по-английски «блендер»?",
        "uk": "Яке англійське слово або фраза означає \"an appliance that blends food into smoothies, puree, or sauce\"?",
        "es": "¿Qué palabra o frase inglesa significa \"an appliance that blends food into smoothies, puree, or sauce\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"an appliance that blends food into smoothies, puree, or sauce\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"an appliance that blends food into smoothies, puree, or sauce\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"an appliance that blends food into smoothies, puree, or sauce\"?",
        "tr": "\"an appliance that blends food into smoothies, puree, or sauce\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"an appliance that blends food into smoothies, puree, or sauce\"?"
      },
      "choices": [
        "blender",
        "microwave",
        "toaster",
        "kettle"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for an appliance that blends food into smoothies, puree, or sauce.",
      "skillTag": "kitchen_appliance_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C50",
        "K50"
      ],
      "choiceRationales": [
        "blender is the only correct answer for an appliance that blends food into smoothies, puree, or sauce.",
        "microwave is plausible kitchen vocabulary but does not mean an appliance that blends food into smoothies, puree, or sauce.",
        "toaster is plausible kitchen vocabulary but does not mean an appliance that blends food into smoothies, puree, or sauce.",
        "kettle is plausible kitchen vocabulary but does not mean an appliance that blends food into smoothies, puree, or sauce."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! blender — блендер. Он измельчает и смешивает продукты до пюре, смузи или соуса.",
          "microwave — микроволновка. Она разогревает еду, но не превращает фрукты в смузи; нужен blender.",
          "toaster — тостер для хлеба. Он делает тосты, а смешивает и измельчает продукты blender.",
          "kettle — чайник. Он кипятит воду, но для смузи или пюре нужен blender."
        ],
        "uk": [
          "Бінго! blender точно відповідає ідеї \"блендер\". Це потрібне англійське слово для цього значення.",
          "microwave тут не підходить, бо microwave називає інший предмет або дію, а для \"блендер\" вибирай blender.",
          "toaster тут не підходить, бо toaster називає інший предмет або дію, а для \"блендер\" вибирай blender.",
          "kettle тут не підходить, бо kettle називає інший предмет або дію, а для \"блендер\" вибирай blender."
        ],
        "es": [
          "Bien. blender encaja con \"блендер\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "microwave no sirve aquí porque microwave apunta a otra cosa de cocina, y para \"блендер\" elige blender.",
          "toaster no sirve aquí porque toaster apunta a otra cosa de cocina, y para \"блендер\" elige blender.",
          "kettle no sirve aquí porque kettle apunta a otra cosa de cocina, y para \"блендер\" elige blender."
        ],
        "pt-BR": [
          "Certo. blender combina com \"блендер\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "microwave não serve aqui porque microwave aponta para outra ideia, e para \"блендер\" use blender.",
          "toaster não serve aqui porque toaster aponta para outra ideia, e para \"блендер\" use blender.",
          "kettle não serve aqui porque kettle aponta para outra ideia, e para \"блендер\" use blender."
        ],
        "vi": [
          "Đúng. blender khớp với \"блендер\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "microwave không hợp ở đây vì microwave nói về ý khác, còn với \"блендер\" dùng blender.",
          "toaster không hợp ở đây vì toaster nói về ý khác, còn với \"блендер\" dùng blender.",
          "kettle không hợp ở đây vì kettle nói về ý khác, còn với \"блендер\" dùng blender."
        ],
        "id": [
          "Benar. blender cocok dengan \"блендер\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "microwave tidak cocok di sini karena microwave menunjuk ide berbeda, dan untuk \"блендер\" pakai blender.",
          "toaster tidak cocok di sini karena toaster menunjuk ide berbeda, dan untuk \"блендер\" pakai blender.",
          "kettle tidak cocok di sini karena kettle menunjuk ide berbeda, dan untuk \"блендер\" pakai blender."
        ],
        "tr": [
          "Doğru. blender, \"блендер\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "microwave burada uymaz çünkü microwave farklı bir şeyi anlatır, \"блендер\" için blender gerekir.",
          "toaster burada uymaz çünkü toaster farklı bir şeyi anlatır, \"блендер\" için blender gerekir.",
          "kettle burada uymaz çünkü kettle farklı bir şeyi anlatır, \"блендер\" için blender gerekir."
        ],
        "pl": [
          "Dobrze. blender pasuje do \"блендер\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "microwave tutaj nie pasuje, bo microwave wskazuje inną rzecz lub czynność, a do \"блендер\" wybierz blender.",
          "toaster tutaj nie pasuje, bo toaster wskazuje inną rzecz lub czynność, a do \"блендер\" wybierz blender.",
          "kettle tutaj nie pasuje, bo kettle wskazuje inną rzecz lub czynność, a do \"блендер\" wybierz blender."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-051",
      "type": "mcq",
      "prompt": "Which English word means “сито”?",
      "localizedPrompts": {
        "ru": "Как по-английски «сито»?",
        "uk": "Яке англійське слово або фраза означає \"a fine mesh tool for sifting flour\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a fine mesh tool for sifting flour\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a fine mesh tool for sifting flour\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a fine mesh tool for sifting flour\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a fine mesh tool for sifting flour\"?",
        "tr": "\"a fine mesh tool for sifting flour\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a fine mesh tool for sifting flour\"?"
      },
      "choices": [
        "sieve",
        "jar",
        "timer",
        "napkin"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a fine mesh tool for sifting flour.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C51",
        "K51"
      ],
      "choiceRationales": [
        "sieve is the only correct answer for a fine mesh tool for sifting flour.",
        "jar is plausible kitchen vocabulary but does not mean a fine mesh tool for sifting flour.",
        "timer is plausible kitchen vocabulary but does not mean a fine mesh tool for sifting flour.",
        "napkin is plausible kitchen vocabulary but does not mean a fine mesh tool for sifting flour."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! sieve — сито. Через него просеивают муку или отделяют мелкое от крупного.",
          "jar — банка. В ней хранят продукты, но муку через неё не просеивают; для этого нужен sieve.",
          "timer — таймер. Он отсчитывает время, а не пропускает муку через мелкие отверстия.",
          "napkin — салфетка. Она вытирает руки или стол, но сито по-английски — sieve."
        ],
        "uk": [
          "Бінго! sieve точно відповідає ідеї \"сито\". Це потрібне англійське слово для цього значення.",
          "jar тут не підходить, бо jar називає інший предмет або дію, а для \"сито\" вибирай sieve.",
          "timer тут не підходить, бо timer називає інший предмет або дію, а для \"сито\" вибирай sieve.",
          "napkin тут не підходить, бо napkin називає інший предмет або дію, а для \"сито\" вибирай sieve."
        ],
        "es": [
          "Bien. sieve encaja con \"сито\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "jar no sirve aquí porque jar apunta a otra cosa de cocina, y para \"сито\" elige sieve.",
          "timer no sirve aquí porque timer apunta a otra cosa de cocina, y para \"сито\" elige sieve.",
          "napkin no sirve aquí porque napkin apunta a otra cosa de cocina, y para \"сито\" elige sieve."
        ],
        "pt-BR": [
          "Certo. sieve combina com \"сито\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "jar não serve aqui porque jar aponta para outra ideia, e para \"сито\" use sieve.",
          "timer não serve aqui porque timer aponta para outra ideia, e para \"сито\" use sieve.",
          "napkin não serve aqui porque napkin aponta para outra ideia, e para \"сито\" use sieve."
        ],
        "vi": [
          "Đúng. sieve khớp với \"сито\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "jar không hợp ở đây vì jar nói về ý khác, còn với \"сито\" dùng sieve.",
          "timer không hợp ở đây vì timer nói về ý khác, còn với \"сито\" dùng sieve.",
          "napkin không hợp ở đây vì napkin nói về ý khác, còn với \"сито\" dùng sieve."
        ],
        "id": [
          "Benar. sieve cocok dengan \"сито\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "jar tidak cocok di sini karena jar menunjuk ide berbeda, dan untuk \"сито\" pakai sieve.",
          "timer tidak cocok di sini karena timer menunjuk ide berbeda, dan untuk \"сито\" pakai sieve.",
          "napkin tidak cocok di sini karena napkin menunjuk ide berbeda, dan untuk \"сито\" pakai sieve."
        ],
        "tr": [
          "Doğru. sieve, \"сито\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "jar burada uymaz çünkü jar farklı bir şeyi anlatır, \"сито\" için sieve gerekir.",
          "timer burada uymaz çünkü timer farklı bir şeyi anlatır, \"сито\" için sieve gerekir.",
          "napkin burada uymaz çünkü napkin farklı bir şeyi anlatır, \"сито\" için sieve gerekir."
        ],
        "pl": [
          "Dobrze. sieve pasuje do \"сито\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "jar tutaj nie pasuje, bo jar wskazuje inną rzecz lub czynność, a do \"сито\" wybierz sieve.",
          "timer tutaj nie pasuje, bo timer wskazuje inną rzecz lub czynność, a do \"сито\" wybierz sieve.",
          "napkin tutaj nie pasuje, bo napkin wskazuje inną rzecz lub czynność, a do \"сито\" wybierz sieve."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-052",
      "type": "mcq",
      "prompt": "Which English word means “банка для хранения”?",
      "localizedPrompts": {
        "ru": "Как по-английски «банка для хранения»?",
        "uk": "Яке англійське слово або фраза означає \"a storage jar for jam, sauce, spices, or grains\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a storage jar for jam, sauce, spices, or grains\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a storage jar for jam, sauce, spices, or grains\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a storage jar for jam, sauce, spices, or grains\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a storage jar for jam, sauce, spices, or grains\"?",
        "tr": "\"a storage jar for jam, sauce, spices, or grains\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a storage jar for jam, sauce, spices, or grains\"?"
      },
      "choices": [
        "jar",
        "scale",
        "mug",
        "timer"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a storage jar for jam, sauce, spices, or grains.",
      "skillTag": "kitchen_container_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C52",
        "K52"
      ],
      "choiceRationales": [
        "jar is the only correct answer for a storage jar for jam, sauce, spices, or grains.",
        "scale is plausible kitchen vocabulary but does not mean a storage jar for jam, sauce, spices, or grains.",
        "mug is plausible kitchen vocabulary but does not mean a storage jar for jam, sauce, spices, or grains.",
        "timer is plausible kitchen vocabulary but does not mean a storage jar for jam, sauce, spices, or grains."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! jar — банка. В ней хранят варенье, соус, специи или крупы.",
          "scale — весы. Они измеряют вес, но не хранят варенье; банка — jar.",
          "mug — кружка. Из неё пьют, а продукты обычно хранят в jar.",
          "timer — таймер. Он нужен для времени готовки, но банка для хранения — jar."
        ],
        "uk": [
          "Бінго! jar точно відповідає ідеї \"банка для хранения\". Це потрібне англійське слово для цього значення.",
          "scale тут не підходить, бо scale називає інший предмет або дію, а для \"банка для хранения\" вибирай jar.",
          "mug тут не підходить, бо mug називає інший предмет або дію, а для \"банка для хранения\" вибирай jar.",
          "timer тут не підходить, бо timer називає інший предмет або дію, а для \"банка для хранения\" вибирай jar."
        ],
        "es": [
          "Bien. jar encaja con \"банка для хранения\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "scale no sirve aquí porque scale apunta a otra cosa de cocina, y para \"банка для хранения\" elige jar.",
          "mug no sirve aquí porque mug apunta a otra cosa de cocina, y para \"банка для хранения\" elige jar.",
          "timer no sirve aquí porque timer apunta a otra cosa de cocina, y para \"банка для хранения\" elige jar."
        ],
        "pt-BR": [
          "Certo. jar combina com \"банка для хранения\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "scale não serve aqui porque scale aponta para outra ideia, e para \"банка для хранения\" use jar.",
          "mug não serve aqui porque mug aponta para outra ideia, e para \"банка для хранения\" use jar.",
          "timer não serve aqui porque timer aponta para outra ideia, e para \"банка для хранения\" use jar."
        ],
        "vi": [
          "Đúng. jar khớp với \"банка для хранения\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "scale không hợp ở đây vì scale nói về ý khác, còn với \"банка для хранения\" dùng jar.",
          "mug không hợp ở đây vì mug nói về ý khác, còn với \"банка для хранения\" dùng jar.",
          "timer không hợp ở đây vì timer nói về ý khác, còn với \"банка для хранения\" dùng jar."
        ],
        "id": [
          "Benar. jar cocok dengan \"банка для хранения\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "scale tidak cocok di sini karena scale menunjuk ide berbeda, dan untuk \"банка для хранения\" pakai jar.",
          "mug tidak cocok di sini karena mug menunjuk ide berbeda, dan untuk \"банка для хранения\" pakai jar.",
          "timer tidak cocok di sini karena timer menunjuk ide berbeda, dan untuk \"банка для хранения\" pakai jar."
        ],
        "tr": [
          "Doğru. jar, \"банка для хранения\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "scale burada uymaz çünkü scale farklı bir şeyi anlatır, \"банка для хранения\" için jar gerekir.",
          "mug burada uymaz çünkü mug farklı bir şeyi anlatır, \"банка для хранения\" için jar gerekir.",
          "timer burada uymaz çünkü timer farklı bir şeyi anlatır, \"банка для хранения\" için jar gerekir."
        ],
        "pl": [
          "Dobrze. jar pasuje do \"банка для хранения\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "scale tutaj nie pasuje, bo scale wskazuje inną rzecz lub czynność, a do \"банка для хранения\" wybierz jar.",
          "mug tutaj nie pasuje, bo mug wskazuje inną rzecz lub czynność, a do \"банка для хранения\" wybierz jar.",
          "timer tutaj nie pasuje, bo timer wskazuje inną rzecz lub czynność, a do \"банка для хранения\" wybierz jar."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-053",
      "type": "mcq",
      "prompt": "Which English word means “кружка”?",
      "localizedPrompts": {
        "ru": "Как по-английски «кружка»?",
        "uk": "Яке англійське слово або фраза означає \"a large cup with a handle\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a large cup with a handle\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a large cup with a handle\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a large cup with a handle\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a large cup with a handle\"?",
        "tr": "\"a large cup with a handle\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a large cup with a handle\"?"
      },
      "choices": [
        "mug",
        "napkin",
        "scale",
        "sieve"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a large cup with a handle.",
      "skillTag": "kitchen_container_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C53",
        "K53"
      ],
      "choiceRationales": [
        "mug is the only correct answer for a large cup with a handle.",
        "napkin is plausible kitchen vocabulary but does not mean a large cup with a handle.",
        "scale is plausible kitchen vocabulary but does not mean a large cup with a handle.",
        "sieve is plausible kitchen vocabulary but does not mean a large cup with a handle."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! mug — кружка. Обычно это большая чашка с ручкой для чая, кофе или какао.",
          "napkin — салфетка. Ею вытирают руки, но пить чай из неё не получится; нужна mug.",
          "scale — весы. Они помогают взвесить муку, а кружка по-английски — mug.",
          "sieve — сито. Оно просеивает муку, но кружка для напитка — mug."
        ],
        "uk": [
          "Бінго! mug точно відповідає ідеї \"кружка\". Це потрібне англійське слово для цього значення.",
          "napkin тут не підходить, бо napkin називає інший предмет або дію, а для \"кружка\" вибирай mug.",
          "scale тут не підходить, бо scale називає інший предмет або дію, а для \"кружка\" вибирай mug.",
          "sieve тут не підходить, бо sieve називає інший предмет або дію, а для \"кружка\" вибирай mug."
        ],
        "es": [
          "Bien. mug encaja con \"кружка\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "napkin no sirve aquí porque napkin apunta a otra cosa de cocina, y para \"кружка\" elige mug.",
          "scale no sirve aquí porque scale apunta a otra cosa de cocina, y para \"кружка\" elige mug.",
          "sieve no sirve aquí porque sieve apunta a otra cosa de cocina, y para \"кружка\" elige mug."
        ],
        "pt-BR": [
          "Certo. mug combina com \"кружка\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "napkin não serve aqui porque napkin aponta para outra ideia, e para \"кружка\" use mug.",
          "scale não serve aqui porque scale aponta para outra ideia, e para \"кружка\" use mug.",
          "sieve não serve aqui porque sieve aponta para outra ideia, e para \"кружка\" use mug."
        ],
        "vi": [
          "Đúng. mug khớp với \"кружка\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "napkin không hợp ở đây vì napkin nói về ý khác, còn với \"кружка\" dùng mug.",
          "scale không hợp ở đây vì scale nói về ý khác, còn với \"кружка\" dùng mug.",
          "sieve không hợp ở đây vì sieve nói về ý khác, còn với \"кружка\" dùng mug."
        ],
        "id": [
          "Benar. mug cocok dengan \"кружка\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "napkin tidak cocok di sini karena napkin menunjuk ide berbeda, dan untuk \"кружка\" pakai mug.",
          "scale tidak cocok di sini karena scale menunjuk ide berbeda, dan untuk \"кружка\" pakai mug.",
          "sieve tidak cocok di sini karena sieve menunjuk ide berbeda, dan untuk \"кружка\" pakai mug."
        ],
        "tr": [
          "Doğru. mug, \"кружка\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "napkin burada uymaz çünkü napkin farklı bir şeyi anlatır, \"кружка\" için mug gerekir.",
          "scale burada uymaz çünkü scale farklı bir şeyi anlatır, \"кружка\" için mug gerekir.",
          "sieve burada uymaz çünkü sieve farklı bir şeyi anlatır, \"кружка\" için mug gerekir."
        ],
        "pl": [
          "Dobrze. mug pasuje do \"кружка\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "napkin tutaj nie pasuje, bo napkin wskazuje inną rzecz lub czynność, a do \"кружка\" wybierz mug.",
          "scale tutaj nie pasuje, bo scale wskazuje inną rzecz lub czynność, a do \"кружка\" wybierz mug.",
          "sieve tutaj nie pasuje, bo sieve wskazuje inną rzecz lub czynność, a do \"кружка\" wybierz mug."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-054",
      "type": "mcq",
      "prompt": "Which English word means “кухонные весы”?",
      "localizedPrompts": {
        "ru": "Как по-английски «кухонные весы»?",
        "uk": "Яке англійське слово або фраза означає \"a kitchen scale for weighing ingredients\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a kitchen scale for weighing ingredients\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a kitchen scale for weighing ingredients\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a kitchen scale for weighing ingredients\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a kitchen scale for weighing ingredients\"?",
        "tr": "\"a kitchen scale for weighing ingredients\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a kitchen scale for weighing ingredients\"?"
      },
      "choices": [
        "timer",
        "scale",
        "jar",
        "napkin"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English kitchen word or phrase for a kitchen scale for weighing ingredients.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C54",
        "K54"
      ],
      "choiceRationales": [
        "timer is plausible kitchen vocabulary but does not mean a kitchen scale for weighing ingredients.",
        "scale is the only correct answer for a kitchen scale for weighing ingredients.",
        "jar is plausible kitchen vocabulary but does not mean a kitchen scale for weighing ingredients.",
        "napkin is plausible kitchen vocabulary but does not mean a kitchen scale for weighing ingredients."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "timer — таймер. Он считает минуты, а граммы и вес показывает scale.",
          "Бинго! scale — весы. На кухне ими взвешивают муку, сахар или другие ингредиенты.",
          "jar — банка для хранения. Она может держать сахар, но его вес измеряет scale.",
          "napkin — салфетка. Она полезна после готовки, но кухонные весы — scale."
        ],
        "uk": [
          "timer тут не підходить, бо timer називає інший предмет або дію, а для \"кухонные весы\" вибирай scale.",
          "Бінго! scale точно відповідає ідеї \"кухонные весы\". Це потрібне англійське слово для цього значення.",
          "jar тут не підходить, бо jar називає інший предмет або дію, а для \"кухонные весы\" вибирай scale.",
          "napkin тут не підходить, бо napkin називає інший предмет або дію, а для \"кухонные весы\" вибирай scale."
        ],
        "es": [
          "timer no sirve aquí porque timer apunta a otra cosa de cocina, y para \"кухонные весы\" elige scale.",
          "Bien. scale encaja con \"кухонные весы\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "jar no sirve aquí porque jar apunta a otra cosa de cocina, y para \"кухонные весы\" elige scale.",
          "napkin no sirve aquí porque napkin apunta a otra cosa de cocina, y para \"кухонные весы\" elige scale."
        ],
        "pt-BR": [
          "timer não serve aqui porque timer aponta para outra ideia, e para \"кухонные весы\" use scale.",
          "Certo. scale combina com \"кухонные весы\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "jar não serve aqui porque jar aponta para outra ideia, e para \"кухонные весы\" use scale.",
          "napkin não serve aqui porque napkin aponta para outra ideia, e para \"кухонные весы\" use scale."
        ],
        "vi": [
          "timer không hợp ở đây vì timer nói về ý khác, còn với \"кухонные весы\" dùng scale.",
          "Đúng. scale khớp với \"кухонные весы\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "jar không hợp ở đây vì jar nói về ý khác, còn với \"кухонные весы\" dùng scale.",
          "napkin không hợp ở đây vì napkin nói về ý khác, còn với \"кухонные весы\" dùng scale."
        ],
        "id": [
          "timer tidak cocok di sini karena timer menunjuk ide berbeda, dan untuk \"кухонные весы\" pakai scale.",
          "Benar. scale cocok dengan \"кухонные весы\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "jar tidak cocok di sini karena jar menunjuk ide berbeda, dan untuk \"кухонные весы\" pakai scale.",
          "napkin tidak cocok di sini karena napkin menunjuk ide berbeda, dan untuk \"кухонные весы\" pakai scale."
        ],
        "tr": [
          "timer burada uymaz çünkü timer farklı bir şeyi anlatır, \"кухонные весы\" için scale gerekir.",
          "Doğru. scale, \"кухонные весы\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "jar burada uymaz çünkü jar farklı bir şeyi anlatır, \"кухонные весы\" için scale gerekir.",
          "napkin burada uymaz çünkü napkin farklı bir şeyi anlatır, \"кухонные весы\" için scale gerekir."
        ],
        "pl": [
          "timer tutaj nie pasuje, bo timer wskazuje inną rzecz lub czynność, a do \"кухонные весы\" wybierz scale.",
          "Dobrze. scale pasuje do \"кухонные весы\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "jar tutaj nie pasuje, bo jar wskazuje inną rzecz lub czynność, a do \"кухонные весы\" wybierz scale.",
          "napkin tutaj nie pasuje, bo napkin wskazuje inną rzecz lub czynność, a do \"кухонные весы\" wybierz scale."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-055",
      "type": "mcq",
      "prompt": "Which English word means “таймер”?",
      "localizedPrompts": {
        "ru": "Как по-английски «таймер»?",
        "uk": "Яке англійське слово або фраза означає \"a timer that counts cooking minutes\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a timer that counts cooking minutes\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a timer that counts cooking minutes\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a timer that counts cooking minutes\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a timer that counts cooking minutes\"?",
        "tr": "\"a timer that counts cooking minutes\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a timer that counts cooking minutes\"?"
      },
      "choices": [
        "sieve",
        "jar",
        "timer",
        "mug"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose the English kitchen word or phrase for a timer that counts cooking minutes.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C55",
        "K55"
      ],
      "choiceRationales": [
        "sieve is plausible kitchen vocabulary but does not mean a timer that counts cooking minutes.",
        "jar is plausible kitchen vocabulary but does not mean a timer that counts cooking minutes.",
        "timer is the only correct answer for a timer that counts cooking minutes.",
        "mug is plausible kitchen vocabulary but does not mean a timer that counts cooking minutes."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "sieve — сито. Оно просеивает муку, а минуты до готовности отсчитывает timer.",
          "jar — банка. В ней можно хранить специи, но время готовки показывает timer.",
          "Бинго! timer — таймер. Он помогает не забыть, когда блюдо пора доставать или выключать.",
          "mug — кружка. Она держит напиток, но не следит за временем; нужен timer."
        ],
        "uk": [
          "sieve тут не підходить, бо sieve називає інший предмет або дію, а для \"таймер\" вибирай timer.",
          "jar тут не підходить, бо jar називає інший предмет або дію, а для \"таймер\" вибирай timer.",
          "Бінго! timer точно відповідає ідеї \"таймер\". Це потрібне англійське слово для цього значення.",
          "mug тут не підходить, бо mug називає інший предмет або дію, а для \"таймер\" вибирай timer."
        ],
        "es": [
          "sieve no sirve aquí porque sieve apunta a otra cosa de cocina, y para \"таймер\" elige timer.",
          "jar no sirve aquí porque jar apunta a otra cosa de cocina, y para \"таймер\" elige timer.",
          "Bien. timer encaja con \"таймер\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "mug no sirve aquí porque mug apunta a otra cosa de cocina, y para \"таймер\" elige timer."
        ],
        "pt-BR": [
          "sieve não serve aqui porque sieve aponta para outra ideia, e para \"таймер\" use timer.",
          "jar não serve aqui porque jar aponta para outra ideia, e para \"таймер\" use timer.",
          "Certo. timer combina com \"таймер\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "mug não serve aqui porque mug aponta para outra ideia, e para \"таймер\" use timer."
        ],
        "vi": [
          "sieve không hợp ở đây vì sieve nói về ý khác, còn với \"таймер\" dùng timer.",
          "jar không hợp ở đây vì jar nói về ý khác, còn với \"таймер\" dùng timer.",
          "Đúng. timer khớp với \"таймер\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "mug không hợp ở đây vì mug nói về ý khác, còn với \"таймер\" dùng timer."
        ],
        "id": [
          "sieve tidak cocok di sini karena sieve menunjuk ide berbeda, dan untuk \"таймер\" pakai timer.",
          "jar tidak cocok di sini karena jar menunjuk ide berbeda, dan untuk \"таймер\" pakai timer.",
          "Benar. timer cocok dengan \"таймер\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "mug tidak cocok di sini karena mug menunjuk ide berbeda, dan untuk \"таймер\" pakai timer."
        ],
        "tr": [
          "sieve burada uymaz çünkü sieve farklı bir şeyi anlatır, \"таймер\" için timer gerekir.",
          "jar burada uymaz çünkü jar farklı bir şeyi anlatır, \"таймер\" için timer gerekir.",
          "Doğru. timer, \"таймер\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "mug burada uymaz çünkü mug farklı bir şeyi anlatır, \"таймер\" için timer gerekir."
        ],
        "pl": [
          "sieve tutaj nie pasuje, bo sieve wskazuje inną rzecz lub czynność, a do \"таймер\" wybierz timer.",
          "jar tutaj nie pasuje, bo jar wskazuje inną rzecz lub czynność, a do \"таймер\" wybierz timer.",
          "Dobrze. timer pasuje do \"таймер\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "mug tutaj nie pasuje, bo mug wskazuje inną rzecz lub czynność, a do \"таймер\" wybierz timer."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-056",
      "type": "mcq",
      "prompt": "Which English word means “салфетка”?",
      "localizedPrompts": {
        "ru": "Как по-английски «салфетка»?",
        "uk": "Яке англійське слово або фраза означає \"a napkin for wiping hands or mouth at the table\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a napkin for wiping hands or mouth at the table\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a napkin for wiping hands or mouth at the table\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a napkin for wiping hands or mouth at the table\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a napkin for wiping hands or mouth at the table\"?",
        "tr": "\"a napkin for wiping hands or mouth at the table\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a napkin for wiping hands or mouth at the table\"?"
      },
      "choices": [
        "napkin",
        "jar",
        "scale",
        "sieve"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a napkin for wiping hands or mouth at the table.",
      "skillTag": "table_setting_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C56",
        "K56"
      ],
      "choiceRationales": [
        "napkin is the only correct answer for a napkin for wiping hands or mouth at the table.",
        "jar is plausible kitchen vocabulary but does not mean a napkin for wiping hands or mouth at the table.",
        "scale is plausible kitchen vocabulary but does not mean a napkin for wiping hands or mouth at the table.",
        "sieve is plausible kitchen vocabulary but does not mean a napkin for wiping hands or mouth at the table."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! napkin — салфетка. Ею вытирают руки или рот за столом.",
          "jar — банка. Она хранит продукты, но салфетка по-английски — napkin.",
          "scale — весы. Они измеряют вес, а не вытирают руки; нужна napkin.",
          "sieve — сито. Оно просеивает муку, но салфетка — napkin."
        ],
        "uk": [
          "Бінго! napkin точно відповідає ідеї \"салфетка\". Це потрібне англійське слово для цього значення.",
          "jar тут не підходить, бо jar називає інший предмет або дію, а для \"салфетка\" вибирай napkin.",
          "scale тут не підходить, бо scale називає інший предмет або дію, а для \"салфетка\" вибирай napkin.",
          "sieve тут не підходить, бо sieve називає інший предмет або дію, а для \"салфетка\" вибирай napkin."
        ],
        "es": [
          "Bien. napkin encaja con \"салфетка\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "jar no sirve aquí porque jar apunta a otra cosa de cocina, y para \"салфетка\" elige napkin.",
          "scale no sirve aquí porque scale apunta a otra cosa de cocina, y para \"салфетка\" elige napkin.",
          "sieve no sirve aquí porque sieve apunta a otra cosa de cocina, y para \"салфетка\" elige napkin."
        ],
        "pt-BR": [
          "Certo. napkin combina com \"салфетка\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "jar não serve aqui porque jar aponta para outra ideia, e para \"салфетка\" use napkin.",
          "scale não serve aqui porque scale aponta para outra ideia, e para \"салфетка\" use napkin.",
          "sieve não serve aqui porque sieve aponta para outra ideia, e para \"салфетка\" use napkin."
        ],
        "vi": [
          "Đúng. napkin khớp với \"салфетка\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "jar không hợp ở đây vì jar nói về ý khác, còn với \"салфетка\" dùng napkin.",
          "scale không hợp ở đây vì scale nói về ý khác, còn với \"салфетка\" dùng napkin.",
          "sieve không hợp ở đây vì sieve nói về ý khác, còn với \"салфетка\" dùng napkin."
        ],
        "id": [
          "Benar. napkin cocok dengan \"салфетка\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "jar tidak cocok di sini karena jar menunjuk ide berbeda, dan untuk \"салфетка\" pakai napkin.",
          "scale tidak cocok di sini karena scale menunjuk ide berbeda, dan untuk \"салфетка\" pakai napkin.",
          "sieve tidak cocok di sini karena sieve menunjuk ide berbeda, dan untuk \"салфетка\" pakai napkin."
        ],
        "tr": [
          "Doğru. napkin, \"салфетка\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "jar burada uymaz çünkü jar farklı bir şeyi anlatır, \"салфетка\" için napkin gerekir.",
          "scale burada uymaz çünkü scale farklı bir şeyi anlatır, \"салфетка\" için napkin gerekir.",
          "sieve burada uymaz çünkü sieve farklı bir şeyi anlatır, \"салфетка\" için napkin gerekir."
        ],
        "pl": [
          "Dobrze. napkin pasuje do \"салфетка\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "jar tutaj nie pasuje, bo jar wskazuje inną rzecz lub czynność, a do \"салфетка\" wybierz napkin.",
          "scale tutaj nie pasuje, bo scale wskazuje inną rzecz lub czynność, a do \"салфетка\" wybierz napkin.",
          "sieve tutaj nie pasuje, bo sieve wskazuje inną rzecz lub czynność, a do \"салфетка\" wybierz napkin."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-057",
      "type": "mcq",
      "prompt": "Which English verb fits “combine ingredients”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «соединить ингредиенты вместе»?",
        "uk": "Яке англійське дієслово потрібне для \"combine ingredients\"?",
        "es": "¿Qué verbo inglés se usa para \"combine ingredients\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"combine ingredients\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"combine ingredients\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"combine ingredients\"?",
        "tr": "\"combine ingredients\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"combine ingredients\"?"
      },
      "choices": [
        "combine",
        "sprinkle",
        "marinate",
        "simmer"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen or recipe verb for combine ingredients.",
      "skillTag": "recipe_instruction_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C57",
        "K57"
      ],
      "choiceRationales": [
        "combine is the only correct answer for combine ingredients.",
        "sprinkle is plausible kitchen vocabulary but does not mean combine ingredients.",
        "marinate is plausible kitchen vocabulary but does not mean combine ingredients.",
        "simmer is plausible kitchen vocabulary but does not mean combine ingredients."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! combine значит соединить. В рецепте это когда несколько ингредиентов собирают в одну смесь.",
          "sprinkle — посыпать сверху. Это про мелкие капли или крупинки, а не про соединение ингредиентов.",
          "marinate — мариновать. Это когда продукт лежит в маринаде, а не просто соединяется с другими.",
          "simmer — тихо кипеть. Это про слабый нагрев, а не про объединение продуктов."
        ],
        "uk": [
          "Бінго! combine точно відповідає ідеї \"combine ingredients\". Це потрібне англійське слово для цього значення.",
          "sprinkle тут не підходить, бо sprinkle називає інший предмет або дію, а для \"combine ingredients\" вибирай combine.",
          "marinate тут не підходить, бо marinate називає інший предмет або дію, а для \"combine ingredients\" вибирай combine.",
          "simmer тут не підходить, бо simmer називає інший предмет або дію, а для \"combine ingredients\" вибирай combine."
        ],
        "es": [
          "Bien. combine encaja con \"combine ingredients\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "sprinkle no sirve aquí porque sprinkle apunta a otra cosa de cocina, y para \"combine ingredients\" elige combine.",
          "marinate no sirve aquí porque marinate apunta a otra cosa de cocina, y para \"combine ingredients\" elige combine.",
          "simmer no sirve aquí porque simmer apunta a otra cosa de cocina, y para \"combine ingredients\" elige combine."
        ],
        "pt-BR": [
          "Certo. combine combina com \"combine ingredients\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "sprinkle não serve aqui porque sprinkle aponta para outra ideia, e para \"combine ingredients\" use combine.",
          "marinate não serve aqui porque marinate aponta para outra ideia, e para \"combine ingredients\" use combine.",
          "simmer não serve aqui porque simmer aponta para outra ideia, e para \"combine ingredients\" use combine."
        ],
        "vi": [
          "Đúng. combine khớp với \"combine ingredients\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "sprinkle không hợp ở đây vì sprinkle nói về ý khác, còn với \"combine ingredients\" dùng combine.",
          "marinate không hợp ở đây vì marinate nói về ý khác, còn với \"combine ingredients\" dùng combine.",
          "simmer không hợp ở đây vì simmer nói về ý khác, còn với \"combine ingredients\" dùng combine."
        ],
        "id": [
          "Benar. combine cocok dengan \"combine ingredients\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "sprinkle tidak cocok di sini karena sprinkle menunjuk ide berbeda, dan untuk \"combine ingredients\" pakai combine.",
          "marinate tidak cocok di sini karena marinate menunjuk ide berbeda, dan untuk \"combine ingredients\" pakai combine.",
          "simmer tidak cocok di sini karena simmer menunjuk ide berbeda, dan untuk \"combine ingredients\" pakai combine."
        ],
        "tr": [
          "Doğru. combine, \"combine ingredients\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "sprinkle burada uymaz çünkü sprinkle farklı bir şeyi anlatır, \"combine ingredients\" için combine gerekir.",
          "marinate burada uymaz çünkü marinate farklı bir şeyi anlatır, \"combine ingredients\" için combine gerekir.",
          "simmer burada uymaz çünkü simmer farklı bir şeyi anlatır, \"combine ingredients\" için combine gerekir."
        ],
        "pl": [
          "Dobrze. combine pasuje do \"combine ingredients\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "sprinkle tutaj nie pasuje, bo sprinkle wskazuje inną rzecz lub czynność, a do \"combine ingredients\" wybierz combine.",
          "marinate tutaj nie pasuje, bo marinate wskazuje inną rzecz lub czynność, a do \"combine ingredients\" wybierz combine.",
          "simmer tutaj nie pasuje, bo simmer wskazuje inną rzecz lub czynność, a do \"combine ingredients\" wybierz combine."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-058",
      "type": "mcq",
      "prompt": "Which English verb fits “sprinkle with sugar”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «посыпать сахаром»?",
        "uk": "Яке англійське дієслово потрібне для \"sprinkle with sugar\"?",
        "es": "¿Qué verbo inglés se usa para \"sprinkle with sugar\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"sprinkle with sugar\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"sprinkle with sugar\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"sprinkle with sugar\"?",
        "tr": "\"sprinkle with sugar\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"sprinkle with sugar\"?"
      },
      "choices": [
        "simmer",
        "combine",
        "sprinkle",
        "marinate"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose the English kitchen or recipe verb for sprinkle with sugar.",
      "skillTag": "recipe_instruction_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C58",
        "K58"
      ],
      "choiceRationales": [
        "simmer is plausible kitchen vocabulary but does not mean sprinkle with sugar.",
        "combine is plausible kitchen vocabulary but does not mean sprinkle with sugar.",
        "sprinkle is the only correct answer for sprinkle with sugar.",
        "marinate is plausible kitchen vocabulary but does not mean sprinkle with sugar."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "simmer — тихо кипеть на слабом огне. Сахар сверху не кипит; его посыпают, это sprinkle.",
          "combine — соединять ингредиенты. Для сахара тонким слоем сверху нужен другой глагол: sprinkle.",
          "Бинго! sprinkle значит посыпать. Так говорят, когда сахар, соль или зелень падают сверху маленькими частями.",
          "marinate — мариновать. Это про выдержать продукт в соусе, а «посыпать сахаром» — sprinkle."
        ],
        "uk": [
          "simmer тут не підходить, бо simmer називає інший предмет або дію, а для \"sprinkle with sugar\" вибирай sprinkle.",
          "combine тут не підходить, бо combine називає інший предмет або дію, а для \"sprinkle with sugar\" вибирай sprinkle.",
          "Бінго! sprinkle точно відповідає ідеї \"sprinkle with sugar\". Це потрібне англійське слово для цього значення.",
          "marinate тут не підходить, бо marinate називає інший предмет або дію, а для \"sprinkle with sugar\" вибирай sprinkle."
        ],
        "es": [
          "simmer no sirve aquí porque simmer apunta a otra cosa de cocina, y para \"sprinkle with sugar\" elige sprinkle.",
          "combine no sirve aquí porque combine apunta a otra cosa de cocina, y para \"sprinkle with sugar\" elige sprinkle.",
          "Bien. sprinkle encaja con \"sprinkle with sugar\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "marinate no sirve aquí porque marinate apunta a otra cosa de cocina, y para \"sprinkle with sugar\" elige sprinkle."
        ],
        "pt-BR": [
          "simmer não serve aqui porque simmer aponta para outra ideia, e para \"sprinkle with sugar\" use sprinkle.",
          "combine não serve aqui porque combine aponta para outra ideia, e para \"sprinkle with sugar\" use sprinkle.",
          "Certo. sprinkle combina com \"sprinkle with sugar\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "marinate não serve aqui porque marinate aponta para outra ideia, e para \"sprinkle with sugar\" use sprinkle."
        ],
        "vi": [
          "simmer không hợp ở đây vì simmer nói về ý khác, còn với \"sprinkle with sugar\" dùng sprinkle.",
          "combine không hợp ở đây vì combine nói về ý khác, còn với \"sprinkle with sugar\" dùng sprinkle.",
          "Đúng. sprinkle khớp với \"sprinkle with sugar\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "marinate không hợp ở đây vì marinate nói về ý khác, còn với \"sprinkle with sugar\" dùng sprinkle."
        ],
        "id": [
          "simmer tidak cocok di sini karena simmer menunjuk ide berbeda, dan untuk \"sprinkle with sugar\" pakai sprinkle.",
          "combine tidak cocok di sini karena combine menunjuk ide berbeda, dan untuk \"sprinkle with sugar\" pakai sprinkle.",
          "Benar. sprinkle cocok dengan \"sprinkle with sugar\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "marinate tidak cocok di sini karena marinate menunjuk ide berbeda, dan untuk \"sprinkle with sugar\" pakai sprinkle."
        ],
        "tr": [
          "simmer burada uymaz çünkü simmer farklı bir şeyi anlatır, \"sprinkle with sugar\" için sprinkle gerekir.",
          "combine burada uymaz çünkü combine farklı bir şeyi anlatır, \"sprinkle with sugar\" için sprinkle gerekir.",
          "Doğru. sprinkle, \"sprinkle with sugar\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "marinate burada uymaz çünkü marinate farklı bir şeyi anlatır, \"sprinkle with sugar\" için sprinkle gerekir."
        ],
        "pl": [
          "simmer tutaj nie pasuje, bo simmer wskazuje inną rzecz lub czynność, a do \"sprinkle with sugar\" wybierz sprinkle.",
          "combine tutaj nie pasuje, bo combine wskazuje inną rzecz lub czynność, a do \"sprinkle with sugar\" wybierz sprinkle.",
          "Dobrze. sprinkle pasuje do \"sprinkle with sugar\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "marinate tutaj nie pasuje, bo marinate wskazuje inną rzecz lub czynność, a do \"sprinkle with sugar\" wybierz sprinkle."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-059",
      "type": "mcq",
      "prompt": "Which English verb fits “simmer sauce over low heat”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «томить соус на слабом огне»?",
        "uk": "Яке англійське дієслово потрібне для \"simmer sauce over low heat\"?",
        "es": "¿Qué verbo inglés se usa para \"simmer sauce over low heat\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"simmer sauce over low heat\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"simmer sauce over low heat\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"simmer sauce over low heat\"?",
        "tr": "\"simmer sauce over low heat\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"simmer sauce over low heat\"?"
      },
      "choices": [
        "marinate",
        "sprinkle",
        "simmer",
        "combine"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose the English kitchen or recipe verb for simmer sauce over low heat.",
      "skillTag": "recipe_instruction_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C59",
        "K59"
      ],
      "choiceRationales": [
        "marinate is plausible kitchen vocabulary but does not mean simmer sauce over low heat.",
        "sprinkle is plausible kitchen vocabulary but does not mean simmer sauce over low heat.",
        "simmer is the only correct answer for simmer sauce over low heat.",
        "combine is plausible kitchen vocabulary but does not mean simmer sauce over low heat."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "marinate — мариновать. Продукт лежит в маринаде, а соус на слабом огне должен simmer.",
          "sprinkle — посыпать. Это движение сверху, а тихое кипение соуса называется simmer.",
          "Бинго! simmer значит тихо кипеть или томиться. Соус слегка пузырится на слабом огне.",
          "combine — соединять. Соус можно combine с ингредиентами раньше, но на слабом огне он simmer."
        ],
        "uk": [
          "marinate тут не підходить, бо marinate називає інший предмет або дію, а для \"simmer sauce over low heat\" вибирай simmer.",
          "sprinkle тут не підходить, бо sprinkle називає інший предмет або дію, а для \"simmer sauce over low heat\" вибирай simmer.",
          "Бінго! simmer точно відповідає ідеї \"simmer sauce over low heat\". Це потрібне англійське слово для цього значення.",
          "combine тут не підходить, бо combine називає інший предмет або дію, а для \"simmer sauce over low heat\" вибирай simmer."
        ],
        "es": [
          "marinate no sirve aquí porque marinate apunta a otra cosa de cocina, y para \"simmer sauce over low heat\" elige simmer.",
          "sprinkle no sirve aquí porque sprinkle apunta a otra cosa de cocina, y para \"simmer sauce over low heat\" elige simmer.",
          "Bien. simmer encaja con \"simmer sauce over low heat\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "combine no sirve aquí porque combine apunta a otra cosa de cocina, y para \"simmer sauce over low heat\" elige simmer."
        ],
        "pt-BR": [
          "marinate não serve aqui porque marinate aponta para outra ideia, e para \"simmer sauce over low heat\" use simmer.",
          "sprinkle não serve aqui porque sprinkle aponta para outra ideia, e para \"simmer sauce over low heat\" use simmer.",
          "Certo. simmer combina com \"simmer sauce over low heat\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "combine não serve aqui porque combine aponta para outra ideia, e para \"simmer sauce over low heat\" use simmer."
        ],
        "vi": [
          "marinate không hợp ở đây vì marinate nói về ý khác, còn với \"simmer sauce over low heat\" dùng simmer.",
          "sprinkle không hợp ở đây vì sprinkle nói về ý khác, còn với \"simmer sauce over low heat\" dùng simmer.",
          "Đúng. simmer khớp với \"simmer sauce over low heat\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "combine không hợp ở đây vì combine nói về ý khác, còn với \"simmer sauce over low heat\" dùng simmer."
        ],
        "id": [
          "marinate tidak cocok di sini karena marinate menunjuk ide berbeda, dan untuk \"simmer sauce over low heat\" pakai simmer.",
          "sprinkle tidak cocok di sini karena sprinkle menunjuk ide berbeda, dan untuk \"simmer sauce over low heat\" pakai simmer.",
          "Benar. simmer cocok dengan \"simmer sauce over low heat\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "combine tidak cocok di sini karena combine menunjuk ide berbeda, dan untuk \"simmer sauce over low heat\" pakai simmer."
        ],
        "tr": [
          "marinate burada uymaz çünkü marinate farklı bir şeyi anlatır, \"simmer sauce over low heat\" için simmer gerekir.",
          "sprinkle burada uymaz çünkü sprinkle farklı bir şeyi anlatır, \"simmer sauce over low heat\" için simmer gerekir.",
          "Doğru. simmer, \"simmer sauce over low heat\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "combine burada uymaz çünkü combine farklı bir şeyi anlatır, \"simmer sauce over low heat\" için simmer gerekir."
        ],
        "pl": [
          "marinate tutaj nie pasuje, bo marinate wskazuje inną rzecz lub czynność, a do \"simmer sauce over low heat\" wybierz simmer.",
          "sprinkle tutaj nie pasuje, bo sprinkle wskazuje inną rzecz lub czynność, a do \"simmer sauce over low heat\" wybierz simmer.",
          "Dobrze. simmer pasuje do \"simmer sauce over low heat\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "combine tutaj nie pasuje, bo combine wskazuje inną rzecz lub czynność, a do \"simmer sauce over low heat\" wybierz simmer."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-060",
      "type": "mcq",
      "prompt": "Which English verb fits “marinate meat”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «мариновать мясо»?",
        "uk": "Яке англійське дієслово потрібне для \"marinate meat\"?",
        "es": "¿Qué verbo inglés se usa para \"marinate meat\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"marinate meat\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"marinate meat\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"marinate meat\"?",
        "tr": "\"marinate meat\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"marinate meat\"?"
      },
      "choices": [
        "sprinkle",
        "marinate",
        "simmer",
        "combine"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English kitchen or recipe verb for marinate meat.",
      "skillTag": "recipe_instruction_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C60",
        "K60"
      ],
      "choiceRationales": [
        "sprinkle is plausible kitchen vocabulary but does not mean marinate meat.",
        "marinate is the only correct answer for marinate meat.",
        "simmer is plausible kitchen vocabulary but does not mean marinate meat.",
        "combine is plausible kitchen vocabulary but does not mean marinate meat."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "sprinkle — посыпать сверху. Мясо для вкуса держат в маринаде, поэтому нужен marinate.",
          "Бинго! marinate значит мариновать. Мясо лежит в соусе или специях, чтобы стать ароматнее.",
          "simmer — тихо кипеть. Мясо в маринаде не обязано кипеть; действие называется marinate.",
          "combine — соединять ингредиенты. Это шире, но «мариновать мясо» точнее передаёт marinate."
        ],
        "uk": [
          "sprinkle тут не підходить, бо sprinkle називає інший предмет або дію, а для \"marinate meat\" вибирай marinate.",
          "Бінго! marinate точно відповідає ідеї \"marinate meat\". Це потрібне англійське слово для цього значення.",
          "simmer тут не підходить, бо simmer називає інший предмет або дію, а для \"marinate meat\" вибирай marinate.",
          "combine тут не підходить, бо combine називає інший предмет або дію, а для \"marinate meat\" вибирай marinate."
        ],
        "es": [
          "sprinkle no sirve aquí porque sprinkle apunta a otra cosa de cocina, y para \"marinate meat\" elige marinate.",
          "Bien. marinate encaja con \"marinate meat\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "simmer no sirve aquí porque simmer apunta a otra cosa de cocina, y para \"marinate meat\" elige marinate.",
          "combine no sirve aquí porque combine apunta a otra cosa de cocina, y para \"marinate meat\" elige marinate."
        ],
        "pt-BR": [
          "sprinkle não serve aqui porque sprinkle aponta para outra ideia, e para \"marinate meat\" use marinate.",
          "Certo. marinate combina com \"marinate meat\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "simmer não serve aqui porque simmer aponta para outra ideia, e para \"marinate meat\" use marinate.",
          "combine não serve aqui porque combine aponta para outra ideia, e para \"marinate meat\" use marinate."
        ],
        "vi": [
          "sprinkle không hợp ở đây vì sprinkle nói về ý khác, còn với \"marinate meat\" dùng marinate.",
          "Đúng. marinate khớp với \"marinate meat\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "simmer không hợp ở đây vì simmer nói về ý khác, còn với \"marinate meat\" dùng marinate.",
          "combine không hợp ở đây vì combine nói về ý khác, còn với \"marinate meat\" dùng marinate."
        ],
        "id": [
          "sprinkle tidak cocok di sini karena sprinkle menunjuk ide berbeda, dan untuk \"marinate meat\" pakai marinate.",
          "Benar. marinate cocok dengan \"marinate meat\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "simmer tidak cocok di sini karena simmer menunjuk ide berbeda, dan untuk \"marinate meat\" pakai marinate.",
          "combine tidak cocok di sini karena combine menunjuk ide berbeda, dan untuk \"marinate meat\" pakai marinate."
        ],
        "tr": [
          "sprinkle burada uymaz çünkü sprinkle farklı bir şeyi anlatır, \"marinate meat\" için marinate gerekir.",
          "Doğru. marinate, \"marinate meat\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "simmer burada uymaz çünkü simmer farklı bir şeyi anlatır, \"marinate meat\" için marinate gerekir.",
          "combine burada uymaz çünkü combine farklı bir şeyi anlatır, \"marinate meat\" için marinate gerekir."
        ],
        "pl": [
          "sprinkle tutaj nie pasuje, bo sprinkle wskazuje inną rzecz lub czynność, a do \"marinate meat\" wybierz marinate.",
          "Dobrze. marinate pasuje do \"marinate meat\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "simmer tutaj nie pasuje, bo simmer wskazuje inną rzecz lub czynność, a do \"marinate meat\" wybierz marinate.",
          "combine tutaj nie pasuje, bo combine wskazuje inną rzecz lub czynność, a do \"marinate meat\" wybierz marinate."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-061",
      "type": "mcq",
      "prompt": "Which English word means “чайная ложка”?",
      "localizedPrompts": {
        "ru": "Как по-английски «чайная ложка»?",
        "uk": "Яке англійське слово або фраза означає \"a small spoon used for tea, sugar, or small spice amounts\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a small spoon used for tea, sugar, or small spice amounts\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a small spoon used for tea, sugar, or small spice amounts\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a small spoon used for tea, sugar, or small spice amounts\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a small spoon used for tea, sugar, or small spice amounts\"?",
        "tr": "\"a small spoon used for tea, sugar, or small spice amounts\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a small spoon used for tea, sugar, or small spice amounts\"?"
      },
      "choices": [
        "teaspoon",
        "tablespoon",
        "tongs",
        "pitcher"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a small spoon used for tea, sugar, or small spice amounts.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C61",
        "K61"
      ],
      "choiceRationales": [
        "teaspoon is the only correct answer for a small spoon used for tea, sugar, or small spice amounts.",
        "tablespoon is plausible kitchen vocabulary but does not mean a small spoon used for tea, sugar, or small spice amounts.",
        "tongs is plausible kitchen vocabulary but does not mean a small spoon used for tea, sugar, or small spice amounts.",
        "pitcher is plausible kitchen vocabulary but does not mean a small spoon used for tea, sugar, or small spice amounts."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! teaspoon — чайная ложка. Это маленькая ложка для чая, сахара или небольшой порции специи.",
          "tablespoon — столовая ложка. Она больше, а для маленькой чайной ложки нужен teaspoon.",
          "tongs — щипцы. Ими берут горячую или скользкую еду, но чайная ложка — teaspoon.",
          "pitcher — кувшин. Он держит напиток, а не маленькую ложку; правильное слово — teaspoon."
        ],
        "uk": [
          "Бінго! teaspoon точно відповідає ідеї \"чайная ложка\". Це потрібне англійське слово для цього значення.",
          "tablespoon тут не підходить, бо tablespoon називає інший предмет або дію, а для \"чайная ложка\" вибирай teaspoon.",
          "tongs тут не підходить, бо tongs називає інший предмет або дію, а для \"чайная ложка\" вибирай teaspoon.",
          "pitcher тут не підходить, бо pitcher називає інший предмет або дію, а для \"чайная ложка\" вибирай teaspoon."
        ],
        "es": [
          "Bien. teaspoon encaja con \"чайная ложка\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "tablespoon no sirve aquí porque tablespoon apunta a otra cosa de cocina, y para \"чайная ложка\" elige teaspoon.",
          "tongs no sirve aquí porque tongs apunta a otra cosa de cocina, y para \"чайная ложка\" elige teaspoon.",
          "pitcher no sirve aquí porque pitcher apunta a otra cosa de cocina, y para \"чайная ложка\" elige teaspoon."
        ],
        "pt-BR": [
          "Certo. teaspoon combina com \"чайная ложка\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "tablespoon não serve aqui porque tablespoon aponta para outra ideia, e para \"чайная ложка\" use teaspoon.",
          "tongs não serve aqui porque tongs aponta para outra ideia, e para \"чайная ложка\" use teaspoon.",
          "pitcher não serve aqui porque pitcher aponta para outra ideia, e para \"чайная ложка\" use teaspoon."
        ],
        "vi": [
          "Đúng. teaspoon khớp với \"чайная ложка\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "tablespoon không hợp ở đây vì tablespoon nói về ý khác, còn với \"чайная ложка\" dùng teaspoon.",
          "tongs không hợp ở đây vì tongs nói về ý khác, còn với \"чайная ложка\" dùng teaspoon.",
          "pitcher không hợp ở đây vì pitcher nói về ý khác, còn với \"чайная ложка\" dùng teaspoon."
        ],
        "id": [
          "Benar. teaspoon cocok dengan \"чайная ложка\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "tablespoon tidak cocok di sini karena tablespoon menunjuk ide berbeda, dan untuk \"чайная ложка\" pakai teaspoon.",
          "tongs tidak cocok di sini karena tongs menunjuk ide berbeda, dan untuk \"чайная ложка\" pakai teaspoon.",
          "pitcher tidak cocok di sini karena pitcher menunjuk ide berbeda, dan untuk \"чайная ложка\" pakai teaspoon."
        ],
        "tr": [
          "Doğru. teaspoon, \"чайная ложка\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "tablespoon burada uymaz çünkü tablespoon farklı bir şeyi anlatır, \"чайная ложка\" için teaspoon gerekir.",
          "tongs burada uymaz çünkü tongs farklı bir şeyi anlatır, \"чайная ложка\" için teaspoon gerekir.",
          "pitcher burada uymaz çünkü pitcher farklı bir şeyi anlatır, \"чайная ложка\" için teaspoon gerekir."
        ],
        "pl": [
          "Dobrze. teaspoon pasuje do \"чайная ложка\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "tablespoon tutaj nie pasuje, bo tablespoon wskazuje inną rzecz lub czynność, a do \"чайная ложка\" wybierz teaspoon.",
          "tongs tutaj nie pasuje, bo tongs wskazuje inną rzecz lub czynność, a do \"чайная ложка\" wybierz teaspoon.",
          "pitcher tutaj nie pasuje, bo pitcher wskazuje inną rzecz lub czynność, a do \"чайная ложка\" wybierz teaspoon."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-062",
      "type": "mcq",
      "prompt": "Which English word means “столовая ложка”?",
      "localizedPrompts": {
        "ru": "Как по-английски «столовая ложка»?",
        "uk": "Яке англійське слово або фраза означає \"a large spoon used as a recipe measure\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a large spoon used as a recipe measure\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a large spoon used as a recipe measure\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a large spoon used as a recipe measure\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a large spoon used as a recipe measure\"?",
        "tr": "\"a large spoon used as a recipe measure\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a large spoon used as a recipe measure\"?"
      },
      "choices": [
        "teaspoon",
        "tablespoon",
        "measuring cup",
        "jar opener"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English kitchen word or phrase for a large spoon used as a recipe measure.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C62",
        "K62"
      ],
      "choiceRationales": [
        "teaspoon is plausible kitchen vocabulary but does not mean a large spoon used as a recipe measure.",
        "tablespoon is the only correct answer for a large spoon used as a recipe measure.",
        "measuring cup is plausible kitchen vocabulary but does not mean a large spoon used as a recipe measure.",
        "jar opener is plausible kitchen vocabulary but does not mean a large spoon used as a recipe measure."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "teaspoon — чайная ложка. Она меньше; для столовой ложки нужен tablespoon.",
          "Бинго! tablespoon — столовая ложка. В рецептах это большая ложка и отдельная мера.",
          "measuring cup — мерный стакан. Он измеряет объём, но столовая ложка — tablespoon.",
          "jar opener — открывалка для банок. Она помогает с крышкой, но не означает столовую ложку."
        ],
        "uk": [
          "teaspoon тут не підходить, бо teaspoon називає інший предмет або дію, а для \"столовая ложка\" вибирай tablespoon.",
          "Бінго! tablespoon точно відповідає ідеї \"столовая ложка\". Це потрібне англійське слово для цього значення.",
          "measuring cup тут не підходить, бо measuring cup називає інший предмет або дію, а для \"столовая ложка\" вибирай tablespoon.",
          "jar opener тут не підходить, бо jar opener називає інший предмет або дію, а для \"столовая ложка\" вибирай tablespoon."
        ],
        "es": [
          "teaspoon no sirve aquí porque teaspoon apunta a otra cosa de cocina, y para \"столовая ложка\" elige tablespoon.",
          "Bien. tablespoon encaja con \"столовая ложка\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "measuring cup no sirve aquí porque measuring cup apunta a otra cosa de cocina, y para \"столовая ложка\" elige tablespoon.",
          "jar opener no sirve aquí porque jar opener apunta a otra cosa de cocina, y para \"столовая ложка\" elige tablespoon."
        ],
        "pt-BR": [
          "teaspoon não serve aqui porque teaspoon aponta para outra ideia, e para \"столовая ложка\" use tablespoon.",
          "Certo. tablespoon combina com \"столовая ложка\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "measuring cup não serve aqui porque measuring cup aponta para outra ideia, e para \"столовая ложка\" use tablespoon.",
          "jar opener não serve aqui porque jar opener aponta para outra ideia, e para \"столовая ложка\" use tablespoon."
        ],
        "vi": [
          "teaspoon không hợp ở đây vì teaspoon nói về ý khác, còn với \"столовая ложка\" dùng tablespoon.",
          "Đúng. tablespoon khớp với \"столовая ложка\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "measuring cup không hợp ở đây vì measuring cup nói về ý khác, còn với \"столовая ложка\" dùng tablespoon.",
          "jar opener không hợp ở đây vì jar opener nói về ý khác, còn với \"столовая ложка\" dùng tablespoon."
        ],
        "id": [
          "teaspoon tidak cocok di sini karena teaspoon menunjuk ide berbeda, dan untuk \"столовая ложка\" pakai tablespoon.",
          "Benar. tablespoon cocok dengan \"столовая ложка\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "measuring cup tidak cocok di sini karena measuring cup menunjuk ide berbeda, dan untuk \"столовая ложка\" pakai tablespoon.",
          "jar opener tidak cocok di sini karena jar opener menunjuk ide berbeda, dan untuk \"столовая ложка\" pakai tablespoon."
        ],
        "tr": [
          "teaspoon burada uymaz çünkü teaspoon farklı bir şeyi anlatır, \"столовая ложка\" için tablespoon gerekir.",
          "Doğru. tablespoon, \"столовая ложка\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "measuring cup burada uymaz çünkü measuring cup farklı bir şeyi anlatır, \"столовая ложка\" için tablespoon gerekir.",
          "jar opener burada uymaz çünkü jar opener farklı bir şeyi anlatır, \"столовая ложка\" için tablespoon gerekir."
        ],
        "pl": [
          "teaspoon tutaj nie pasuje, bo teaspoon wskazuje inną rzecz lub czynność, a do \"столовая ложка\" wybierz tablespoon.",
          "Dobrze. tablespoon pasuje do \"столовая ложка\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "measuring cup tutaj nie pasuje, bo measuring cup wskazuje inną rzecz lub czynność, a do \"столовая ложка\" wybierz tablespoon.",
          "jar opener tutaj nie pasuje, bo jar opener wskazuje inną rzecz lub czynność, a do \"столовая ложка\" wybierz tablespoon."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-063",
      "type": "mcq",
      "prompt": "Which English word means “кухонные щипцы”?",
      "localizedPrompts": {
        "ru": "Как по-английски «кухонные щипцы»?",
        "uk": "Яке англійське слово або фраза означає \"kitchen tongs for gripping hot or slippery food\"?",
        "es": "¿Qué palabra o frase inglesa significa \"kitchen tongs for gripping hot or slippery food\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"kitchen tongs for gripping hot or slippery food\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"kitchen tongs for gripping hot or slippery food\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"kitchen tongs for gripping hot or slippery food\"?",
        "tr": "\"kitchen tongs for gripping hot or slippery food\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"kitchen tongs for gripping hot or slippery food\"?"
      },
      "choices": [
        "tongs",
        "pitcher",
        "tray cloth",
        "corkscrew"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for kitchen tongs for gripping hot or slippery food.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C63",
        "K63"
      ],
      "choiceRationales": [
        "tongs is the only correct answer for kitchen tongs for gripping hot or slippery food.",
        "pitcher is plausible kitchen vocabulary but does not mean kitchen tongs for gripping hot or slippery food.",
        "tray cloth is plausible kitchen vocabulary but does not mean kitchen tongs for gripping hot or slippery food.",
        "corkscrew is plausible kitchen vocabulary but does not mean kitchen tongs for gripping hot or slippery food."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! tongs — щипцы. Ими удобно брать горячую пасту, салат, мясо или кусочки еды.",
          "pitcher — кувшин. Из него наливают напиток, а еду захватывают щипцами: tongs.",
          "tray cloth — салфетка или ткань для подноса. Она не хватает еду; для этого нужны tongs.",
          "corkscrew — штопор. Он вытаскивает пробку, а кухонные щипцы — tongs."
        ],
        "uk": [
          "Бінго! tongs точно відповідає ідеї \"кухонные щипцы\". Це потрібне англійське слово для цього значення.",
          "pitcher тут не підходить, бо pitcher називає інший предмет або дію, а для \"кухонные щипцы\" вибирай tongs.",
          "tray cloth тут не підходить, бо tray cloth називає інший предмет або дію, а для \"кухонные щипцы\" вибирай tongs.",
          "corkscrew тут не підходить, бо corkscrew називає інший предмет або дію, а для \"кухонные щипцы\" вибирай tongs."
        ],
        "es": [
          "Bien. tongs encaja con \"кухонные щипцы\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "pitcher no sirve aquí porque pitcher apunta a otra cosa de cocina, y para \"кухонные щипцы\" elige tongs.",
          "tray cloth no sirve aquí porque tray cloth apunta a otra cosa de cocina, y para \"кухонные щипцы\" elige tongs.",
          "corkscrew no sirve aquí porque corkscrew apunta a otra cosa de cocina, y para \"кухонные щипцы\" elige tongs."
        ],
        "pt-BR": [
          "Certo. tongs combina com \"кухонные щипцы\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "pitcher não serve aqui porque pitcher aponta para outra ideia, e para \"кухонные щипцы\" use tongs.",
          "tray cloth não serve aqui porque tray cloth aponta para outra ideia, e para \"кухонные щипцы\" use tongs.",
          "corkscrew não serve aqui porque corkscrew aponta para outra ideia, e para \"кухонные щипцы\" use tongs."
        ],
        "vi": [
          "Đúng. tongs khớp với \"кухонные щипцы\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "pitcher không hợp ở đây vì pitcher nói về ý khác, còn với \"кухонные щипцы\" dùng tongs.",
          "tray cloth không hợp ở đây vì tray cloth nói về ý khác, còn với \"кухонные щипцы\" dùng tongs.",
          "corkscrew không hợp ở đây vì corkscrew nói về ý khác, còn với \"кухонные щипцы\" dùng tongs."
        ],
        "id": [
          "Benar. tongs cocok dengan \"кухонные щипцы\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "pitcher tidak cocok di sini karena pitcher menunjuk ide berbeda, dan untuk \"кухонные щипцы\" pakai tongs.",
          "tray cloth tidak cocok di sini karena tray cloth menunjuk ide berbeda, dan untuk \"кухонные щипцы\" pakai tongs.",
          "corkscrew tidak cocok di sini karena corkscrew menunjuk ide berbeda, dan untuk \"кухонные щипцы\" pakai tongs."
        ],
        "tr": [
          "Doğru. tongs, \"кухонные щипцы\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "pitcher burada uymaz çünkü pitcher farklı bir şeyi anlatır, \"кухонные щипцы\" için tongs gerekir.",
          "tray cloth burada uymaz çünkü tray cloth farklı bir şeyi anlatır, \"кухонные щипцы\" için tongs gerekir.",
          "corkscrew burada uymaz çünkü corkscrew farklı bir şeyi anlatır, \"кухонные щипцы\" için tongs gerekir."
        ],
        "pl": [
          "Dobrze. tongs pasuje do \"кухонные щипцы\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "pitcher tutaj nie pasuje, bo pitcher wskazuje inną rzecz lub czynność, a do \"кухонные щипцы\" wybierz tongs.",
          "tray cloth tutaj nie pasuje, bo tray cloth wskazuje inną rzecz lub czynność, a do \"кухонные щипцы\" wybierz tongs.",
          "corkscrew tutaj nie pasuje, bo corkscrew wskazuje inną rzecz lub czynność, a do \"кухонные щипцы\" wybierz tongs."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-064",
      "type": "mcq",
      "prompt": "Which English word means “тёрка”?",
      "localizedPrompts": {
        "ru": "Как по-английски «тёрка»?",
        "uk": "Яке англійське слово або фраза означає \"a grater for shredding cheese or vegetables\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a grater for shredding cheese or vegetables\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a grater for shredding cheese or vegetables\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a grater for shredding cheese or vegetables\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a grater for shredding cheese or vegetables\"?",
        "tr": "\"a grater for shredding cheese or vegetables\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a grater for shredding cheese or vegetables\"?"
      },
      "choices": [
        "grater",
        "masher",
        "pitcher",
        "oven mitt"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a grater for shredding cheese or vegetables.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C64",
        "K64"
      ],
      "choiceRationales": [
        "grater is the only correct answer for a grater for shredding cheese or vegetables.",
        "masher is plausible kitchen vocabulary but does not mean a grater for shredding cheese or vegetables.",
        "pitcher is plausible kitchen vocabulary but does not mean a grater for shredding cheese or vegetables.",
        "oven mitt is plausible kitchen vocabulary but does not mean a grater for shredding cheese or vegetables."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! grater — тёрка. Через её острые отверстия сыр или овощи становятся мелкой стружкой.",
          "masher — толкушка для пюре. Она давит картошку, но не натирает сыр; нужна grater.",
          "pitcher — кувшин. Он хранит или наливает напиток, а тёрка по-английски — grater.",
          "oven mitt — кухонная рукавица. Она защищает руку от жара, но не натирает продукты."
        ],
        "uk": [
          "Бінго! grater точно відповідає ідеї \"тёрка\". Це потрібне англійське слово для цього значення.",
          "masher тут не підходить, бо masher називає інший предмет або дію, а для \"тёрка\" вибирай grater.",
          "pitcher тут не підходить, бо pitcher називає інший предмет або дію, а для \"тёрка\" вибирай grater.",
          "oven mitt тут не підходить, бо oven mitt називає інший предмет або дію, а для \"тёрка\" вибирай grater."
        ],
        "es": [
          "Bien. grater encaja con \"тёрка\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "masher no sirve aquí porque masher apunta a otra cosa de cocina, y para \"тёрка\" elige grater.",
          "pitcher no sirve aquí porque pitcher apunta a otra cosa de cocina, y para \"тёрка\" elige grater.",
          "oven mitt no sirve aquí porque oven mitt apunta a otra cosa de cocina, y para \"тёрка\" elige grater."
        ],
        "pt-BR": [
          "Certo. grater combina com \"тёрка\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "masher não serve aqui porque masher aponta para outra ideia, e para \"тёрка\" use grater.",
          "pitcher não serve aqui porque pitcher aponta para outra ideia, e para \"тёрка\" use grater.",
          "oven mitt não serve aqui porque oven mitt aponta para outra ideia, e para \"тёрка\" use grater."
        ],
        "vi": [
          "Đúng. grater khớp với \"тёрка\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "masher không hợp ở đây vì masher nói về ý khác, còn với \"тёрка\" dùng grater.",
          "pitcher không hợp ở đây vì pitcher nói về ý khác, còn với \"тёрка\" dùng grater.",
          "oven mitt không hợp ở đây vì oven mitt nói về ý khác, còn với \"тёрка\" dùng grater."
        ],
        "id": [
          "Benar. grater cocok dengan \"тёрка\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "masher tidak cocok di sini karena masher menunjuk ide berbeda, dan untuk \"тёрка\" pakai grater.",
          "pitcher tidak cocok di sini karena pitcher menunjuk ide berbeda, dan untuk \"тёрка\" pakai grater.",
          "oven mitt tidak cocok di sini karena oven mitt menunjuk ide berbeda, dan untuk \"тёрка\" pakai grater."
        ],
        "tr": [
          "Doğru. grater, \"тёрка\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "masher burada uymaz çünkü masher farklı bir şeyi anlatır, \"тёрка\" için grater gerekir.",
          "pitcher burada uymaz çünkü pitcher farklı bir şeyi anlatır, \"тёрка\" için grater gerekir.",
          "oven mitt burada uymaz çünkü oven mitt farklı bir şeyi anlatır, \"тёрка\" için grater gerekir."
        ],
        "pl": [
          "Dobrze. grater pasuje do \"тёрка\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "masher tutaj nie pasuje, bo masher wskazuje inną rzecz lub czynność, a do \"тёрка\" wybierz grater.",
          "pitcher tutaj nie pasuje, bo pitcher wskazuje inną rzecz lub czynność, a do \"тёрка\" wybierz grater.",
          "oven mitt tutaj nie pasuje, bo oven mitt wskazuje inną rzecz lub czynność, a do \"тёрка\" wybierz grater."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-065",
      "type": "mcq",
      "prompt": "Which English word means “толкушка для пюре”?",
      "localizedPrompts": {
        "ru": "Как по-английски «толкушка для пюре»?",
        "uk": "Яке англійське слово або фраза означає \"a masher used to make potatoes into mash\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a masher used to make potatoes into mash\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a masher used to make potatoes into mash\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a masher used to make potatoes into mash\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a masher used to make potatoes into mash\"?",
        "tr": "\"a masher used to make potatoes into mash\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a masher used to make potatoes into mash\"?"
      },
      "choices": [
        "masher",
        "corkscrew",
        "teaspoon",
        "measuring cup"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a masher used to make potatoes into mash.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C65",
        "K65"
      ],
      "choiceRationales": [
        "masher is the only correct answer for a masher used to make potatoes into mash.",
        "corkscrew is plausible kitchen vocabulary but does not mean a masher used to make potatoes into mash.",
        "teaspoon is plausible kitchen vocabulary but does not mean a masher used to make potatoes into mash.",
        "measuring cup is plausible kitchen vocabulary but does not mean a masher used to make potatoes into mash."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! masher — толкушка. Ею разминают картошку или овощи в пюре.",
          "corkscrew — штопор. Он нужен для пробки, а картошку в пюре превращает masher.",
          "teaspoon — чайная ложка. Ею можно попробовать пюре, но разминать картошку лучше masher.",
          "measuring cup — мерный стакан. Он помогает с количеством, но не делает пюре; нужен masher."
        ],
        "uk": [
          "Бінго! masher точно відповідає ідеї \"толкушка для пюре\". Це потрібне англійське слово для цього значення.",
          "corkscrew тут не підходить, бо corkscrew називає інший предмет або дію, а для \"толкушка для пюре\" вибирай masher.",
          "teaspoon тут не підходить, бо teaspoon називає інший предмет або дію, а для \"толкушка для пюре\" вибирай masher.",
          "measuring cup тут не підходить, бо measuring cup називає інший предмет або дію, а для \"толкушка для пюре\" вибирай masher."
        ],
        "es": [
          "Bien. masher encaja con \"толкушка для пюре\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "corkscrew no sirve aquí porque corkscrew apunta a otra cosa de cocina, y para \"толкушка для пюре\" elige masher.",
          "teaspoon no sirve aquí porque teaspoon apunta a otra cosa de cocina, y para \"толкушка для пюре\" elige masher.",
          "measuring cup no sirve aquí porque measuring cup apunta a otra cosa de cocina, y para \"толкушка для пюре\" elige masher."
        ],
        "pt-BR": [
          "Certo. masher combina com \"толкушка для пюре\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "corkscrew não serve aqui porque corkscrew aponta para outra ideia, e para \"толкушка для пюре\" use masher.",
          "teaspoon não serve aqui porque teaspoon aponta para outra ideia, e para \"толкушка для пюре\" use masher.",
          "measuring cup não serve aqui porque measuring cup aponta para outra ideia, e para \"толкушка для пюре\" use masher."
        ],
        "vi": [
          "Đúng. masher khớp với \"толкушка для пюре\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "corkscrew không hợp ở đây vì corkscrew nói về ý khác, còn với \"толкушка для пюре\" dùng masher.",
          "teaspoon không hợp ở đây vì teaspoon nói về ý khác, còn với \"толкушка для пюре\" dùng masher.",
          "measuring cup không hợp ở đây vì measuring cup nói về ý khác, còn với \"толкушка для пюре\" dùng masher."
        ],
        "id": [
          "Benar. masher cocok dengan \"толкушка для пюре\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "corkscrew tidak cocok di sini karena corkscrew menunjuk ide berbeda, dan untuk \"толкушка для пюре\" pakai masher.",
          "teaspoon tidak cocok di sini karena teaspoon menunjuk ide berbeda, dan untuk \"толкушка для пюре\" pakai masher.",
          "measuring cup tidak cocok di sini karena measuring cup menunjuk ide berbeda, dan untuk \"толкушка для пюре\" pakai masher."
        ],
        "tr": [
          "Doğru. masher, \"толкушка для пюре\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "corkscrew burada uymaz çünkü corkscrew farklı bir şeyi anlatır, \"толкушка для пюре\" için masher gerekir.",
          "teaspoon burada uymaz çünkü teaspoon farklı bir şeyi anlatır, \"толкушка для пюре\" için masher gerekir.",
          "measuring cup burada uymaz çünkü measuring cup farklı bir şeyi anlatır, \"толкушка для пюре\" için masher gerekir."
        ],
        "pl": [
          "Dobrze. masher pasuje do \"толкушка для пюре\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "corkscrew tutaj nie pasuje, bo corkscrew wskazuje inną rzecz lub czynność, a do \"толкушка для пюре\" wybierz masher.",
          "teaspoon tutaj nie pasuje, bo teaspoon wskazuje inną rzecz lub czynność, a do \"толкушка для пюре\" wybierz masher.",
          "measuring cup tutaj nie pasuje, bo measuring cup wskazuje inną rzecz lub czynność, a do \"толкушка для пюре\" wybierz masher."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-066",
      "type": "mcq",
      "prompt": "Which English phrase means “мерный стакан”?",
      "localizedPrompts": {
        "ru": "Как по-английски «мерный стакан»?",
        "uk": "Яке англійське слово або фраза означає \"a measuring cup for recipe amounts\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a measuring cup for recipe amounts\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a measuring cup for recipe amounts\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a measuring cup for recipe amounts\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a measuring cup for recipe amounts\"?",
        "tr": "\"a measuring cup for recipe amounts\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a measuring cup for recipe amounts\"?"
      },
      "choices": [
        "pitcher",
        "measuring cup",
        "oven mitt",
        "tongs"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English kitchen word or phrase for a measuring cup for recipe amounts.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C66",
        "K66"
      ],
      "choiceRationales": [
        "pitcher is plausible kitchen vocabulary but does not mean a measuring cup for recipe amounts.",
        "measuring cup is the only correct answer for a measuring cup for recipe amounts.",
        "oven mitt is plausible kitchen vocabulary but does not mean a measuring cup for recipe amounts.",
        "tongs is plausible kitchen vocabulary but does not mean a measuring cup for recipe amounts."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "pitcher — кувшин. Он наливает напиток, но точные порции в рецепте измеряет measuring cup.",
          "Бинго! measuring cup — мерный стакан. Им отмеряют воду, муку, сахар или масло.",
          "oven mitt — кухонная рукавица. Она защищает от горячего, а не измеряет объём.",
          "tongs — щипцы. Ими берут еду, но для измерения ингредиентов нужен measuring cup."
        ],
        "uk": [
          "pitcher тут не підходить, бо pitcher називає інший предмет або дію, а для \"мерный стакан\" вибирай measuring cup.",
          "Бінго! measuring cup точно відповідає ідеї \"мерный стакан\". Це потрібне англійське слово для цього значення.",
          "oven mitt тут не підходить, бо oven mitt називає інший предмет або дію, а для \"мерный стакан\" вибирай measuring cup.",
          "tongs тут не підходить, бо tongs називає інший предмет або дію, а для \"мерный стакан\" вибирай measuring cup."
        ],
        "es": [
          "pitcher no sirve aquí porque pitcher apunta a otra cosa de cocina, y para \"мерный стакан\" elige measuring cup.",
          "Bien. measuring cup encaja con \"мерный стакан\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "oven mitt no sirve aquí porque oven mitt apunta a otra cosa de cocina, y para \"мерный стакан\" elige measuring cup.",
          "tongs no sirve aquí porque tongs apunta a otra cosa de cocina, y para \"мерный стакан\" elige measuring cup."
        ],
        "pt-BR": [
          "pitcher não serve aqui porque pitcher aponta para outra ideia, e para \"мерный стакан\" use measuring cup.",
          "Certo. measuring cup combina com \"мерный стакан\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "oven mitt não serve aqui porque oven mitt aponta para outra ideia, e para \"мерный стакан\" use measuring cup.",
          "tongs não serve aqui porque tongs aponta para outra ideia, e para \"мерный стакан\" use measuring cup."
        ],
        "vi": [
          "pitcher không hợp ở đây vì pitcher nói về ý khác, còn với \"мерный стакан\" dùng measuring cup.",
          "Đúng. measuring cup khớp với \"мерный стакан\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "oven mitt không hợp ở đây vì oven mitt nói về ý khác, còn với \"мерный стакан\" dùng measuring cup.",
          "tongs không hợp ở đây vì tongs nói về ý khác, còn với \"мерный стакан\" dùng measuring cup."
        ],
        "id": [
          "pitcher tidak cocok di sini karena pitcher menunjuk ide berbeda, dan untuk \"мерный стакан\" pakai measuring cup.",
          "Benar. measuring cup cocok dengan \"мерный стакан\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "oven mitt tidak cocok di sini karena oven mitt menunjuk ide berbeda, dan untuk \"мерный стакан\" pakai measuring cup.",
          "tongs tidak cocok di sini karena tongs menunjuk ide berbeda, dan untuk \"мерный стакан\" pakai measuring cup."
        ],
        "tr": [
          "pitcher burada uymaz çünkü pitcher farklı bir şeyi anlatır, \"мерный стакан\" için measuring cup gerekir.",
          "Doğru. measuring cup, \"мерный стакан\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "oven mitt burada uymaz çünkü oven mitt farklı bir şeyi anlatır, \"мерный стакан\" için measuring cup gerekir.",
          "tongs burada uymaz çünkü tongs farklı bir şeyi anlatır, \"мерный стакан\" için measuring cup gerekir."
        ],
        "pl": [
          "pitcher tutaj nie pasuje, bo pitcher wskazuje inną rzecz lub czynność, a do \"мерный стакан\" wybierz measuring cup.",
          "Dobrze. measuring cup pasuje do \"мерный стакан\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "oven mitt tutaj nie pasuje, bo oven mitt wskazuje inną rzecz lub czynność, a do \"мерный стакан\" wybierz measuring cup.",
          "tongs tutaj nie pasuje, bo tongs wskazuje inną rzecz lub czynność, a do \"мерный стакан\" wybierz measuring cup."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-067",
      "type": "mcq",
      "prompt": "Which English phrase means “кухонная рукавица-прихватка”?",
      "localizedPrompts": {
        "ru": "Как по-английски «кухонная рукавица-прихватка»?",
        "uk": "Яке англійське слово або фраза означає \"a padded glove for holding hot oven trays\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a padded glove for holding hot oven trays\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a padded glove for holding hot oven trays\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a padded glove for holding hot oven trays\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a padded glove for holding hot oven trays\"?",
        "tr": "\"a padded glove for holding hot oven trays\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a padded glove for holding hot oven trays\"?"
      },
      "choices": [
        "oven mitt",
        "grater",
        "masher",
        "pitcher"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a padded glove for holding hot oven trays.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C67",
        "K67"
      ],
      "choiceRationales": [
        "oven mitt is the only correct answer for a padded glove for holding hot oven trays.",
        "grater is plausible kitchen vocabulary but does not mean a padded glove for holding hot oven trays.",
        "masher is plausible kitchen vocabulary but does not mean a padded glove for holding hot oven trays.",
        "pitcher is plausible kitchen vocabulary but does not mean a padded glove for holding hot oven trays."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! oven mitt — кухонная рукавица. Её надевают, чтобы взять горячий противень или форму.",
          "grater — тёрка. Она измельчает продукты, но от горячей духовки защищает oven mitt.",
          "masher — толкушка. Она давит картошку, а руку от жара защищает oven mitt.",
          "pitcher — кувшин. Он держит напиток, но горячую форму берут через oven mitt."
        ],
        "uk": [
          "Бінго! oven mitt точно відповідає ідеї \"кухонная рукавица-прихватка\". Це потрібне англійське слово для цього значення.",
          "grater тут не підходить, бо grater називає інший предмет або дію, а для \"кухонная рукавица-прихватка\" вибирай oven mitt.",
          "masher тут не підходить, бо masher називає інший предмет або дію, а для \"кухонная рукавица-прихватка\" вибирай oven mitt.",
          "pitcher тут не підходить, бо pitcher називає інший предмет або дію, а для \"кухонная рукавица-прихватка\" вибирай oven mitt."
        ],
        "es": [
          "Bien. oven mitt encaja con \"кухонная рукавица-прихватка\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "grater no sirve aquí porque grater apunta a otra cosa de cocina, y para \"кухонная рукавица-прихватка\" elige oven mitt.",
          "masher no sirve aquí porque masher apunta a otra cosa de cocina, y para \"кухонная рукавица-прихватка\" elige oven mitt.",
          "pitcher no sirve aquí porque pitcher apunta a otra cosa de cocina, y para \"кухонная рукавица-прихватка\" elige oven mitt."
        ],
        "pt-BR": [
          "Certo. oven mitt combina com \"кухонная рукавица-прихватка\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "grater não serve aqui porque grater aponta para outra ideia, e para \"кухонная рукавица-прихватка\" use oven mitt.",
          "masher não serve aqui porque masher aponta para outra ideia, e para \"кухонная рукавица-прихватка\" use oven mitt.",
          "pitcher não serve aqui porque pitcher aponta para outra ideia, e para \"кухонная рукавица-прихватка\" use oven mitt."
        ],
        "vi": [
          "Đúng. oven mitt khớp với \"кухонная рукавица-прихватка\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "grater không hợp ở đây vì grater nói về ý khác, còn với \"кухонная рукавица-прихватка\" dùng oven mitt.",
          "masher không hợp ở đây vì masher nói về ý khác, còn với \"кухонная рукавица-прихватка\" dùng oven mitt.",
          "pitcher không hợp ở đây vì pitcher nói về ý khác, còn với \"кухонная рукавица-прихватка\" dùng oven mitt."
        ],
        "id": [
          "Benar. oven mitt cocok dengan \"кухонная рукавица-прихватка\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "grater tidak cocok di sini karena grater menunjuk ide berbeda, dan untuk \"кухонная рукавица-прихватка\" pakai oven mitt.",
          "masher tidak cocok di sini karena masher menunjuk ide berbeda, dan untuk \"кухонная рукавица-прихватка\" pakai oven mitt.",
          "pitcher tidak cocok di sini karena pitcher menunjuk ide berbeda, dan untuk \"кухонная рукавица-прихватка\" pakai oven mitt."
        ],
        "tr": [
          "Doğru. oven mitt, \"кухонная рукавица-прихватка\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "grater burada uymaz çünkü grater farklı bir şeyi anlatır, \"кухонная рукавица-прихватка\" için oven mitt gerekir.",
          "masher burada uymaz çünkü masher farklı bir şeyi anlatır, \"кухонная рукавица-прихватка\" için oven mitt gerekir.",
          "pitcher burada uymaz çünkü pitcher farklı bir şeyi anlatır, \"кухонная рукавица-прихватка\" için oven mitt gerekir."
        ],
        "pl": [
          "Dobrze. oven mitt pasuje do \"кухонная рукавица-прихватка\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "grater tutaj nie pasuje, bo grater wskazuje inną rzecz lub czynność, a do \"кухонная рукавица-прихватка\" wybierz oven mitt.",
          "masher tutaj nie pasuje, bo masher wskazuje inną rzecz lub czynność, a do \"кухонная рукавица-прихватка\" wybierz oven mitt.",
          "pitcher tutaj nie pasuje, bo pitcher wskazuje inną rzecz lub czynność, a do \"кухонная рукавица-прихватка\" wybierz oven mitt."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-068",
      "type": "mcq",
      "prompt": "Which English word means “кувшин”?",
      "localizedPrompts": {
        "ru": "Как по-английски «кувшин»?",
        "uk": "Яке англійське слово або фраза означає \"a pitcher for serving water, juice, or tea\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a pitcher for serving water, juice, or tea\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a pitcher for serving water, juice, or tea\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a pitcher for serving water, juice, or tea\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a pitcher for serving water, juice, or tea\"?",
        "tr": "\"a pitcher for serving water, juice, or tea\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a pitcher for serving water, juice, or tea\"?"
      },
      "choices": [
        "pitcher",
        "tongs",
        "jar opener",
        "measuring cup"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a pitcher for serving water, juice, or tea.",
      "skillTag": "kitchen_container_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C68",
        "K68"
      ],
      "choiceRationales": [
        "pitcher is the only correct answer for a pitcher for serving water, juice, or tea.",
        "tongs is plausible kitchen vocabulary but does not mean a pitcher for serving water, juice, or tea.",
        "jar opener is plausible kitchen vocabulary but does not mean a pitcher for serving water, juice, or tea.",
        "measuring cup is plausible kitchen vocabulary but does not mean a pitcher for serving water, juice, or tea."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! pitcher — кувшин. Из него наливают воду, лимонад, сок или чай.",
          "tongs — щипцы. Они хватают еду, но напиток на столе обычно стоит в pitcher.",
          "jar opener — открывалка для банок. Она работает с крышкой, а кувшин — pitcher.",
          "measuring cup — мерный стакан. Он отмеряет объём, но кувшин для подачи напитка — pitcher."
        ],
        "uk": [
          "Бінго! pitcher точно відповідає ідеї \"кувшин\". Це потрібне англійське слово для цього значення.",
          "tongs тут не підходить, бо tongs називає інший предмет або дію, а для \"кувшин\" вибирай pitcher.",
          "jar opener тут не підходить, бо jar opener називає інший предмет або дію, а для \"кувшин\" вибирай pitcher.",
          "measuring cup тут не підходить, бо measuring cup називає інший предмет або дію, а для \"кувшин\" вибирай pitcher."
        ],
        "es": [
          "Bien. pitcher encaja con \"кувшин\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "tongs no sirve aquí porque tongs apunta a otra cosa de cocina, y para \"кувшин\" elige pitcher.",
          "jar opener no sirve aquí porque jar opener apunta a otra cosa de cocina, y para \"кувшин\" elige pitcher.",
          "measuring cup no sirve aquí porque measuring cup apunta a otra cosa de cocina, y para \"кувшин\" elige pitcher."
        ],
        "pt-BR": [
          "Certo. pitcher combina com \"кувшин\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "tongs não serve aqui porque tongs aponta para outra ideia, e para \"кувшин\" use pitcher.",
          "jar opener não serve aqui porque jar opener aponta para outra ideia, e para \"кувшин\" use pitcher.",
          "measuring cup não serve aqui porque measuring cup aponta para outra ideia, e para \"кувшин\" use pitcher."
        ],
        "vi": [
          "Đúng. pitcher khớp với \"кувшин\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "tongs không hợp ở đây vì tongs nói về ý khác, còn với \"кувшин\" dùng pitcher.",
          "jar opener không hợp ở đây vì jar opener nói về ý khác, còn với \"кувшин\" dùng pitcher.",
          "measuring cup không hợp ở đây vì measuring cup nói về ý khác, còn với \"кувшин\" dùng pitcher."
        ],
        "id": [
          "Benar. pitcher cocok dengan \"кувшин\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "tongs tidak cocok di sini karena tongs menunjuk ide berbeda, dan untuk \"кувшин\" pakai pitcher.",
          "jar opener tidak cocok di sini karena jar opener menunjuk ide berbeda, dan untuk \"кувшин\" pakai pitcher.",
          "measuring cup tidak cocok di sini karena measuring cup menunjuk ide berbeda, dan untuk \"кувшин\" pakai pitcher."
        ],
        "tr": [
          "Doğru. pitcher, \"кувшин\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "tongs burada uymaz çünkü tongs farklı bir şeyi anlatır, \"кувшин\" için pitcher gerekir.",
          "jar opener burada uymaz çünkü jar opener farklı bir şeyi anlatır, \"кувшин\" için pitcher gerekir.",
          "measuring cup burada uymaz çünkü measuring cup farklı bir şeyi anlatır, \"кувшин\" için pitcher gerekir."
        ],
        "pl": [
          "Dobrze. pitcher pasuje do \"кувшин\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "tongs tutaj nie pasuje, bo tongs wskazuje inną rzecz lub czynność, a do \"кувшин\" wybierz pitcher.",
          "jar opener tutaj nie pasuje, bo jar opener wskazuje inną rzecz lub czynność, a do \"кувшин\" wybierz pitcher.",
          "measuring cup tutaj nie pasuje, bo measuring cup wskazuje inną rzecz lub czynność, a do \"кувшин\" wybierz pitcher."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-069",
      "type": "mcq",
      "prompt": "Which English word means “штопор”?",
      "localizedPrompts": {
        "ru": "Как по-английски «штопор»?",
        "uk": "Яке англійське слово або фраза означає \"a corkscrew for pulling a cork from a bottle\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a corkscrew for pulling a cork from a bottle\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a corkscrew for pulling a cork from a bottle\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a corkscrew for pulling a cork from a bottle\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a corkscrew for pulling a cork from a bottle\"?",
        "tr": "\"a corkscrew for pulling a cork from a bottle\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a corkscrew for pulling a cork from a bottle\"?"
      },
      "choices": [
        "jar opener",
        "corkscrew",
        "teaspoon",
        "oven mitt"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English kitchen word or phrase for a corkscrew for pulling a cork from a bottle.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C69",
        "K69"
      ],
      "choiceRationales": [
        "jar opener is plausible kitchen vocabulary but does not mean a corkscrew for pulling a cork from a bottle.",
        "corkscrew is the only correct answer for a corkscrew for pulling a cork from a bottle.",
        "teaspoon is plausible kitchen vocabulary but does not mean a corkscrew for pulling a cork from a bottle.",
        "oven mitt is plausible kitchen vocabulary but does not mean a corkscrew for pulling a cork from a bottle."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "jar opener — открывалка для банок. Для пробки в бутылке нужен другой инструмент: corkscrew.",
          "Бинго! corkscrew — штопор. Он вкручивается в пробку и помогает вытащить её из бутылки.",
          "teaspoon — чайная ложка. Она полезна для сахара, но пробку из бутылки вытаскивает corkscrew.",
          "oven mitt — кухонная рукавица. Она защищает от жара, а штопор по-английски — corkscrew."
        ],
        "uk": [
          "jar opener тут не підходить, бо jar opener називає інший предмет або дію, а для \"штопор\" вибирай corkscrew.",
          "Бінго! corkscrew точно відповідає ідеї \"штопор\". Це потрібне англійське слово для цього значення.",
          "teaspoon тут не підходить, бо teaspoon називає інший предмет або дію, а для \"штопор\" вибирай corkscrew.",
          "oven mitt тут не підходить, бо oven mitt називає інший предмет або дію, а для \"штопор\" вибирай corkscrew."
        ],
        "es": [
          "jar opener no sirve aquí porque jar opener apunta a otra cosa de cocina, y para \"штопор\" elige corkscrew.",
          "Bien. corkscrew encaja con \"штопор\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "teaspoon no sirve aquí porque teaspoon apunta a otra cosa de cocina, y para \"штопор\" elige corkscrew.",
          "oven mitt no sirve aquí porque oven mitt apunta a otra cosa de cocina, y para \"штопор\" elige corkscrew."
        ],
        "pt-BR": [
          "jar opener não serve aqui porque jar opener aponta para outra ideia, e para \"штопор\" use corkscrew.",
          "Certo. corkscrew combina com \"штопор\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "teaspoon não serve aqui porque teaspoon aponta para outra ideia, e para \"штопор\" use corkscrew.",
          "oven mitt não serve aqui porque oven mitt aponta para outra ideia, e para \"штопор\" use corkscrew."
        ],
        "vi": [
          "jar opener không hợp ở đây vì jar opener nói về ý khác, còn với \"штопор\" dùng corkscrew.",
          "Đúng. corkscrew khớp với \"штопор\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "teaspoon không hợp ở đây vì teaspoon nói về ý khác, còn với \"штопор\" dùng corkscrew.",
          "oven mitt không hợp ở đây vì oven mitt nói về ý khác, còn với \"штопор\" dùng corkscrew."
        ],
        "id": [
          "jar opener tidak cocok di sini karena jar opener menunjuk ide berbeda, dan untuk \"штопор\" pakai corkscrew.",
          "Benar. corkscrew cocok dengan \"штопор\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "teaspoon tidak cocok di sini karena teaspoon menunjuk ide berbeda, dan untuk \"штопор\" pakai corkscrew.",
          "oven mitt tidak cocok di sini karena oven mitt menunjuk ide berbeda, dan untuk \"штопор\" pakai corkscrew."
        ],
        "tr": [
          "jar opener burada uymaz çünkü jar opener farklı bir şeyi anlatır, \"штопор\" için corkscrew gerekir.",
          "Doğru. corkscrew, \"штопор\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "teaspoon burada uymaz çünkü teaspoon farklı bir şeyi anlatır, \"штопор\" için corkscrew gerekir.",
          "oven mitt burada uymaz çünkü oven mitt farklı bir şeyi anlatır, \"штопор\" için corkscrew gerekir."
        ],
        "pl": [
          "jar opener tutaj nie pasuje, bo jar opener wskazuje inną rzecz lub czynność, a do \"штопор\" wybierz corkscrew.",
          "Dobrze. corkscrew pasuje do \"штопор\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "teaspoon tutaj nie pasuje, bo teaspoon wskazuje inną rzecz lub czynność, a do \"штопор\" wybierz corkscrew.",
          "oven mitt tutaj nie pasuje, bo oven mitt wskazuje inną rzecz lub czynność, a do \"штопор\" wybierz corkscrew."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-070",
      "type": "mcq",
      "prompt": "Which English phrase means “открывалка для банок”?",
      "localizedPrompts": {
        "ru": "Как по-английски «открывалка для банок»?",
        "uk": "Яке англійське слово або фраза означає \"a tool for opening tight jar lids\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a tool for opening tight jar lids\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a tool for opening tight jar lids\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a tool for opening tight jar lids\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a tool for opening tight jar lids\"?",
        "tr": "\"a tool for opening tight jar lids\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a tool for opening tight jar lids\"?"
      },
      "choices": [
        "jar opener",
        "corkscrew",
        "masher",
        "tongs"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a tool for opening tight jar lids.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C70",
        "K70"
      ],
      "choiceRationales": [
        "jar opener is the only correct answer for a tool for opening tight jar lids.",
        "corkscrew is plausible kitchen vocabulary but does not mean a tool for opening tight jar lids.",
        "masher is plausible kitchen vocabulary but does not mean a tool for opening tight jar lids.",
        "tongs is plausible kitchen vocabulary but does not mean a tool for opening tight jar lids."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! jar opener — открывалка для банок. Она помогает провернуть тугую крышку.",
          "corkscrew — штопор. Он работает с пробкой, а крышку банки открывает jar opener.",
          "masher — толкушка. Она делает пюре, но с крышкой банки не помогает; нужен jar opener.",
          "tongs — щипцы. Они берут еду, а не открывают банку; правильный инструмент — jar opener."
        ],
        "uk": [
          "Бінго! jar opener точно відповідає ідеї \"открывалка для банок\". Це потрібне англійське слово для цього значення.",
          "corkscrew тут не підходить, бо corkscrew називає інший предмет або дію, а для \"открывалка для банок\" вибирай jar opener.",
          "masher тут не підходить, бо masher називає інший предмет або дію, а для \"открывалка для банок\" вибирай jar opener.",
          "tongs тут не підходить, бо tongs називає інший предмет або дію, а для \"открывалка для банок\" вибирай jar opener."
        ],
        "es": [
          "Bien. jar opener encaja con \"открывалка для банок\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "corkscrew no sirve aquí porque corkscrew apunta a otra cosa de cocina, y para \"открывалка для банок\" elige jar opener.",
          "masher no sirve aquí porque masher apunta a otra cosa de cocina, y para \"открывалка для банок\" elige jar opener.",
          "tongs no sirve aquí porque tongs apunta a otra cosa de cocina, y para \"открывалка для банок\" elige jar opener."
        ],
        "pt-BR": [
          "Certo. jar opener combina com \"открывалка для банок\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "corkscrew não serve aqui porque corkscrew aponta para outra ideia, e para \"открывалка для банок\" use jar opener.",
          "masher não serve aqui porque masher aponta para outra ideia, e para \"открывалка для банок\" use jar opener.",
          "tongs não serve aqui porque tongs aponta para outra ideia, e para \"открывалка для банок\" use jar opener."
        ],
        "vi": [
          "Đúng. jar opener khớp với \"открывалка для банок\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "corkscrew không hợp ở đây vì corkscrew nói về ý khác, còn với \"открывалка для банок\" dùng jar opener.",
          "masher không hợp ở đây vì masher nói về ý khác, còn với \"открывалка для банок\" dùng jar opener.",
          "tongs không hợp ở đây vì tongs nói về ý khác, còn với \"открывалка для банок\" dùng jar opener."
        ],
        "id": [
          "Benar. jar opener cocok dengan \"открывалка для банок\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "corkscrew tidak cocok di sini karena corkscrew menunjuk ide berbeda, dan untuk \"открывалка для банок\" pakai jar opener.",
          "masher tidak cocok di sini karena masher menunjuk ide berbeda, dan untuk \"открывалка для банок\" pakai jar opener.",
          "tongs tidak cocok di sini karena tongs menunjuk ide berbeda, dan untuk \"открывалка для банок\" pakai jar opener."
        ],
        "tr": [
          "Doğru. jar opener, \"открывалка для банок\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "corkscrew burada uymaz çünkü corkscrew farklı bir şeyi anlatır, \"открывалка для банок\" için jar opener gerekir.",
          "masher burada uymaz çünkü masher farklı bir şeyi anlatır, \"открывалка для банок\" için jar opener gerekir.",
          "tongs burada uymaz çünkü tongs farklı bir şeyi anlatır, \"открывалка для банок\" için jar opener gerekir."
        ],
        "pl": [
          "Dobrze. jar opener pasuje do \"открывалка для банок\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "corkscrew tutaj nie pasuje, bo corkscrew wskazuje inną rzecz lub czynność, a do \"открывалка для банок\" wybierz jar opener.",
          "masher tutaj nie pasuje, bo masher wskazuje inną rzecz lub czynność, a do \"открывалка для банок\" wybierz jar opener.",
          "tongs tutaj nie pasuje, bo tongs wskazuje inną rzecz lub czynność, a do \"открывалка для банок\" wybierz jar opener."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-071",
      "type": "mcq",
      "prompt": "Which English phrase means “пресс для чеснока”?",
      "localizedPrompts": {
        "ru": "Как по-английски «пресс для чеснока»?",
        "uk": "Яке англійське слово або фраза означає \"a tool that crushes a garlic clove into tiny pieces\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a tool that crushes a garlic clove into tiny pieces\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a tool that crushes a garlic clove into tiny pieces\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a tool that crushes a garlic clove into tiny pieces\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a tool that crushes a garlic clove into tiny pieces\"?",
        "tr": "\"a tool that crushes a garlic clove into tiny pieces\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a tool that crushes a garlic clove into tiny pieces\"?"
      },
      "choices": [
        "garlic press",
        "grater",
        "masher",
        "tongs"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a tool that crushes a garlic clove into tiny pieces.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C71",
        "K71"
      ],
      "choiceRationales": [
        "garlic press is the only correct answer for a tool that crushes a garlic clove into tiny pieces.",
        "grater is plausible kitchen vocabulary but does not mean a tool that crushes a garlic clove into tiny pieces.",
        "masher is plausible kitchen vocabulary but does not mean a tool that crushes a garlic clove into tiny pieces.",
        "tongs is plausible kitchen vocabulary but does not mean a tool that crushes a garlic clove into tiny pieces."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! garlic press — пресс для чеснока. Он раздавливает зубчик чеснока в мелкую кашицу.",
          "grater — тёрка. Она натирает сыр или овощи, но чеснок через специальный пресс — garlic press.",
          "masher — толкушка для пюре. Она давит картошку, а для зубчика чеснока нужен garlic press.",
          "tongs — щипцы. Ими берут еду, но чеснок они не выдавливают; правильный инструмент — garlic press."
        ],
        "uk": [
          "Бінго! garlic press точно відповідає ідеї \"пресс для чеснока\". Це потрібне англійське слово для цього значення.",
          "grater тут не підходить, бо grater називає інший предмет або дію, а для \"пресс для чеснока\" вибирай garlic press.",
          "masher тут не підходить, бо masher називає інший предмет або дію, а для \"пресс для чеснока\" вибирай garlic press.",
          "tongs тут не підходить, бо tongs називає інший предмет або дію, а для \"пресс для чеснока\" вибирай garlic press."
        ],
        "es": [
          "Bien. garlic press encaja con \"пресс для чеснока\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "grater no sirve aquí porque grater apunta a otra cosa de cocina, y para \"пресс для чеснока\" elige garlic press.",
          "masher no sirve aquí porque masher apunta a otra cosa de cocina, y para \"пресс для чеснока\" elige garlic press.",
          "tongs no sirve aquí porque tongs apunta a otra cosa de cocina, y para \"пресс для чеснока\" elige garlic press."
        ],
        "pt-BR": [
          "Certo. garlic press combina com \"пресс для чеснока\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "grater não serve aqui porque grater aponta para outra ideia, e para \"пресс для чеснока\" use garlic press.",
          "masher não serve aqui porque masher aponta para outra ideia, e para \"пресс для чеснока\" use garlic press.",
          "tongs não serve aqui porque tongs aponta para outra ideia, e para \"пресс для чеснока\" use garlic press."
        ],
        "vi": [
          "Đúng. garlic press khớp với \"пресс для чеснока\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "grater không hợp ở đây vì grater nói về ý khác, còn với \"пресс для чеснока\" dùng garlic press.",
          "masher không hợp ở đây vì masher nói về ý khác, còn với \"пресс для чеснока\" dùng garlic press.",
          "tongs không hợp ở đây vì tongs nói về ý khác, còn với \"пресс для чеснока\" dùng garlic press."
        ],
        "id": [
          "Benar. garlic press cocok dengan \"пресс для чеснока\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "grater tidak cocok di sini karena grater menunjuk ide berbeda, dan untuk \"пресс для чеснока\" pakai garlic press.",
          "masher tidak cocok di sini karena masher menunjuk ide berbeda, dan untuk \"пресс для чеснока\" pakai garlic press.",
          "tongs tidak cocok di sini karena tongs menunjuk ide berbeda, dan untuk \"пресс для чеснока\" pakai garlic press."
        ],
        "tr": [
          "Doğru. garlic press, \"пресс для чеснока\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "grater burada uymaz çünkü grater farklı bir şeyi anlatır, \"пресс для чеснока\" için garlic press gerekir.",
          "masher burada uymaz çünkü masher farklı bir şeyi anlatır, \"пресс для чеснока\" için garlic press gerekir.",
          "tongs burada uymaz çünkü tongs farklı bir şeyi anlatır, \"пресс для чеснока\" için garlic press gerekir."
        ],
        "pl": [
          "Dobrze. garlic press pasuje do \"пресс для чеснока\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "grater tutaj nie pasuje, bo grater wskazuje inną rzecz lub czynność, a do \"пресс для чеснока\" wybierz garlic press.",
          "masher tutaj nie pasuje, bo masher wskazuje inną rzecz lub czynność, a do \"пресс для чеснока\" wybierz garlic press.",
          "tongs tutaj nie pasuje, bo tongs wskazuje inną rzecz lub czynność, a do \"пресс для чеснока\" wybierz garlic press."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-072",
      "type": "mcq",
      "prompt": "Which English word means “тёрка для цедры”?",
      "localizedPrompts": {
        "ru": "Как по-английски «тёрка для цедры»?",
        "uk": "Яке англійське слово або фраза означає \"a tool for removing thin citrus zest\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a tool for removing thin citrus zest\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a tool for removing thin citrus zest\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a tool for removing thin citrus zest\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a tool for removing thin citrus zest\"?",
        "tr": "\"a tool for removing thin citrus zest\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a tool for removing thin citrus zest\"?"
      },
      "choices": [
        "zester",
        "peeler",
        "sieve",
        "ladle"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a tool for removing thin citrus zest.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C72",
        "K72"
      ],
      "choiceRationales": [
        "zester is the only correct answer for a tool for removing thin citrus zest.",
        "peeler is plausible kitchen vocabulary but does not mean a tool for removing thin citrus zest.",
        "sieve is plausible kitchen vocabulary but does not mean a tool for removing thin citrus zest.",
        "ladle is plausible kitchen vocabulary but does not mean a tool for removing thin citrus zest."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! zester — тёрка для цедры. Ею снимают тонкий ароматный слой с лимона или апельсина.",
          "peeler — овощечистка. Она снимает более широкую кожуру, а тонкую цедру делает zester.",
          "sieve — сито. Оно просеивает муку, но не снимает лимонную цедру; нужен zester.",
          "ladle — половник. Им набирают суп, а не трут кожуру цитруса; правильное слово — zester."
        ],
        "uk": [
          "Бінго! zester точно відповідає ідеї \"тёрка для цедры\". Це потрібне англійське слово для цього значення.",
          "peeler тут не підходить, бо peeler називає інший предмет або дію, а для \"тёрка для цедры\" вибирай zester.",
          "sieve тут не підходить, бо sieve називає інший предмет або дію, а для \"тёрка для цедры\" вибирай zester.",
          "ladle тут не підходить, бо ladle називає інший предмет або дію, а для \"тёрка для цедры\" вибирай zester."
        ],
        "es": [
          "Bien. zester encaja con \"тёрка для цедры\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "peeler no sirve aquí porque peeler apunta a otra cosa de cocina, y para \"тёрка для цедры\" elige zester.",
          "sieve no sirve aquí porque sieve apunta a otra cosa de cocina, y para \"тёрка для цедры\" elige zester.",
          "ladle no sirve aquí porque ladle apunta a otra cosa de cocina, y para \"тёрка для цедры\" elige zester."
        ],
        "pt-BR": [
          "Certo. zester combina com \"тёрка для цедры\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "peeler não serve aqui porque peeler aponta para outra ideia, e para \"тёрка для цедры\" use zester.",
          "sieve não serve aqui porque sieve aponta para outra ideia, e para \"тёрка для цедры\" use zester.",
          "ladle não serve aqui porque ladle aponta para outra ideia, e para \"тёрка для цедры\" use zester."
        ],
        "vi": [
          "Đúng. zester khớp với \"тёрка для цедры\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "peeler không hợp ở đây vì peeler nói về ý khác, còn với \"тёрка для цедры\" dùng zester.",
          "sieve không hợp ở đây vì sieve nói về ý khác, còn với \"тёрка для цедры\" dùng zester.",
          "ladle không hợp ở đây vì ladle nói về ý khác, còn với \"тёрка для цедры\" dùng zester."
        ],
        "id": [
          "Benar. zester cocok dengan \"тёрка для цедры\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "peeler tidak cocok di sini karena peeler menunjuk ide berbeda, dan untuk \"тёрка для цедры\" pakai zester.",
          "sieve tidak cocok di sini karena sieve menunjuk ide berbeda, dan untuk \"тёрка для цедры\" pakai zester.",
          "ladle tidak cocok di sini karena ladle menunjuk ide berbeda, dan untuk \"тёрка для цедры\" pakai zester."
        ],
        "tr": [
          "Doğru. zester, \"тёрка для цедры\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "peeler burada uymaz çünkü peeler farklı bir şeyi anlatır, \"тёрка для цедры\" için zester gerekir.",
          "sieve burada uymaz çünkü sieve farklı bir şeyi anlatır, \"тёрка для цедры\" için zester gerekir.",
          "ladle burada uymaz çünkü ladle farklı bir şeyi anlatır, \"тёрка для цедры\" için zester gerekir."
        ],
        "pl": [
          "Dobrze. zester pasuje do \"тёрка для цедры\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "peeler tutaj nie pasuje, bo peeler wskazuje inną rzecz lub czynność, a do \"тёрка для цедры\" wybierz zester.",
          "sieve tutaj nie pasuje, bo sieve wskazuje inną rzecz lub czynność, a do \"тёрка для цедры\" wybierz zester.",
          "ladle tutaj nie pasuje, bo ladle wskazuje inną rzecz lub czynność, a do \"тёрка для цедры\" wybierz zester."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-073",
      "type": "mcq",
      "prompt": "Which English word means “кладовая для продуктов”?",
      "localizedPrompts": {
        "ru": "Как по-английски «кладовая для продуктов»?",
        "uk": "Яке англійське слово або фраза означає \"a pantry where dry food supplies are stored\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a pantry where dry food supplies are stored\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a pantry where dry food supplies are stored\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a pantry where dry food supplies are stored\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a pantry where dry food supplies are stored\"?",
        "tr": "\"a pantry where dry food supplies are stored\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a pantry where dry food supplies are stored\"?"
      },
      "choices": [
        "pantry",
        "countertop",
        "freezer",
        "dishwasher"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a pantry where dry food supplies are stored.",
      "skillTag": "kitchen_storage_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C73",
        "K73"
      ],
      "choiceRationales": [
        "pantry is the only correct answer for a pantry where dry food supplies are stored.",
        "countertop is plausible kitchen vocabulary but does not mean a pantry where dry food supplies are stored.",
        "freezer is plausible kitchen vocabulary but does not mean a pantry where dry food supplies are stored.",
        "dishwasher is plausible kitchen vocabulary but does not mean a pantry where dry food supplies are stored."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! pantry — кладовая для продуктов. Там хранят крупы, консервы, специи и сухие запасы.",
          "countertop — рабочая поверхность. На ней готовят, но запасы хранят в pantry.",
          "freezer — морозилка. Она держит продукты замороженными, а сухие запасы обычно живут в pantry.",
          "dishwasher — посудомоечная машина. Она моет посуду, но не хранит крупы и специи; нужна pantry."
        ],
        "uk": [
          "Бінго! pantry точно відповідає ідеї \"кладовая для продуктов\". Це потрібне англійське слово для цього значення.",
          "countertop тут не підходить, бо countertop називає інший предмет або дію, а для \"кладовая для продуктов\" вибирай pantry.",
          "freezer тут не підходить, бо freezer називає інший предмет або дію, а для \"кладовая для продуктов\" вибирай pantry.",
          "dishwasher тут не підходить, бо dishwasher називає інший предмет або дію, а для \"кладовая для продуктов\" вибирай pantry."
        ],
        "es": [
          "Bien. pantry encaja con \"кладовая для продуктов\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "countertop no sirve aquí porque countertop apunta a otra cosa de cocina, y para \"кладовая для продуктов\" elige pantry.",
          "freezer no sirve aquí porque freezer apunta a otra cosa de cocina, y para \"кладовая для продуктов\" elige pantry.",
          "dishwasher no sirve aquí porque dishwasher apunta a otra cosa de cocina, y para \"кладовая для продуктов\" elige pantry."
        ],
        "pt-BR": [
          "Certo. pantry combina com \"кладовая для продуктов\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "countertop não serve aqui porque countertop aponta para outra ideia, e para \"кладовая для продуктов\" use pantry.",
          "freezer não serve aqui porque freezer aponta para outra ideia, e para \"кладовая для продуктов\" use pantry.",
          "dishwasher não serve aqui porque dishwasher aponta para outra ideia, e para \"кладовая для продуктов\" use pantry."
        ],
        "vi": [
          "Đúng. pantry khớp với \"кладовая для продуктов\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "countertop không hợp ở đây vì countertop nói về ý khác, còn với \"кладовая для продуктов\" dùng pantry.",
          "freezer không hợp ở đây vì freezer nói về ý khác, còn với \"кладовая для продуктов\" dùng pantry.",
          "dishwasher không hợp ở đây vì dishwasher nói về ý khác, còn với \"кладовая для продуктов\" dùng pantry."
        ],
        "id": [
          "Benar. pantry cocok dengan \"кладовая для продуктов\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "countertop tidak cocok di sini karena countertop menunjuk ide berbeda, dan untuk \"кладовая для продуктов\" pakai pantry.",
          "freezer tidak cocok di sini karena freezer menunjuk ide berbeda, dan untuk \"кладовая для продуктов\" pakai pantry.",
          "dishwasher tidak cocok di sini karena dishwasher menunjuk ide berbeda, dan untuk \"кладовая для продуктов\" pakai pantry."
        ],
        "tr": [
          "Doğru. pantry, \"кладовая для продуктов\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "countertop burada uymaz çünkü countertop farklı bir şeyi anlatır, \"кладовая для продуктов\" için pantry gerekir.",
          "freezer burada uymaz çünkü freezer farklı bir şeyi anlatır, \"кладовая для продуктов\" için pantry gerekir.",
          "dishwasher burada uymaz çünkü dishwasher farklı bir şeyi anlatır, \"кладовая для продуктов\" için pantry gerekir."
        ],
        "pl": [
          "Dobrze. pantry pasuje do \"кладовая для продуктов\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "countertop tutaj nie pasuje, bo countertop wskazuje inną rzecz lub czynność, a do \"кладовая для продуктов\" wybierz pantry.",
          "freezer tutaj nie pasuje, bo freezer wskazuje inną rzecz lub czynność, a do \"кладовая для продуктов\" wybierz pantry.",
          "dishwasher tutaj nie pasuje, bo dishwasher wskazuje inną rzecz lub czynność, a do \"кладовая для продуктов\" wybierz pantry."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-074",
      "type": "mcq",
      "prompt": "Which English word means “кухонная столешница”?",
      "localizedPrompts": {
        "ru": "Как по-английски «кухонная столешница»?",
        "uk": "Яке англійське слово або фраза означає \"a kitchen countertop work surface\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a kitchen countertop work surface\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a kitchen countertop work surface\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a kitchen countertop work surface\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a kitchen countertop work surface\"?",
        "tr": "\"a kitchen countertop work surface\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a kitchen countertop work surface\"?"
      },
      "choices": [
        "shelf",
        "countertop",
        "tray",
        "pantry"
      ],
      "correctIndex": 1,
      "learningGoal": "Choose the English kitchen word or phrase for a kitchen countertop work surface.",
      "skillTag": "kitchen_surface_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C74",
        "K74"
      ],
      "choiceRationales": [
        "shelf is plausible kitchen vocabulary but does not mean a kitchen countertop work surface.",
        "countertop is the only correct answer for a kitchen countertop work surface.",
        "tray is plausible kitchen vocabulary but does not mean a kitchen countertop work surface.",
        "pantry is plausible kitchen vocabulary but does not mean a kitchen countertop work surface."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "shelf — полка. На ней хранят вещи, а рабочая поверхность на кухне — countertop.",
          "Бинго! countertop — столешница. На ней режут, ставят миски и собирают ингредиенты перед готовкой.",
          "tray — поднос. Он переносит еду или чашки, но столешница по-английски — countertop.",
          "pantry — кладовая. Там хранят продукты, а готовят и раскладывают ингредиенты на countertop."
        ],
        "uk": [
          "shelf тут не підходить, бо shelf називає інший предмет або дію, а для \"кухонная столешница\" вибирай countertop.",
          "Бінго! countertop точно відповідає ідеї \"кухонная столешница\". Це потрібне англійське слово для цього значення.",
          "tray тут не підходить, бо tray називає інший предмет або дію, а для \"кухонная столешница\" вибирай countertop.",
          "pantry тут не підходить, бо pantry називає інший предмет або дію, а для \"кухонная столешница\" вибирай countertop."
        ],
        "es": [
          "shelf no sirve aquí porque shelf apunta a otra cosa de cocina, y para \"кухонная столешница\" elige countertop.",
          "Bien. countertop encaja con \"кухонная столешница\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "tray no sirve aquí porque tray apunta a otra cosa de cocina, y para \"кухонная столешница\" elige countertop.",
          "pantry no sirve aquí porque pantry apunta a otra cosa de cocina, y para \"кухонная столешница\" elige countertop."
        ],
        "pt-BR": [
          "shelf não serve aqui porque shelf aponta para outra ideia, e para \"кухонная столешница\" use countertop.",
          "Certo. countertop combina com \"кухонная столешница\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "tray não serve aqui porque tray aponta para outra ideia, e para \"кухонная столешница\" use countertop.",
          "pantry não serve aqui porque pantry aponta para outra ideia, e para \"кухонная столешница\" use countertop."
        ],
        "vi": [
          "shelf không hợp ở đây vì shelf nói về ý khác, còn với \"кухонная столешница\" dùng countertop.",
          "Đúng. countertop khớp với \"кухонная столешница\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "tray không hợp ở đây vì tray nói về ý khác, còn với \"кухонная столешница\" dùng countertop.",
          "pantry không hợp ở đây vì pantry nói về ý khác, còn với \"кухонная столешница\" dùng countertop."
        ],
        "id": [
          "shelf tidak cocok di sini karena shelf menunjuk ide berbeda, dan untuk \"кухонная столешница\" pakai countertop.",
          "Benar. countertop cocok dengan \"кухонная столешница\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "tray tidak cocok di sini karena tray menunjuk ide berbeda, dan untuk \"кухонная столешница\" pakai countertop.",
          "pantry tidak cocok di sini karena pantry menunjuk ide berbeda, dan untuk \"кухонная столешница\" pakai countertop."
        ],
        "tr": [
          "shelf burada uymaz çünkü shelf farklı bir şeyi anlatır, \"кухонная столешница\" için countertop gerekir.",
          "Doğru. countertop, \"кухонная столешница\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "tray burada uymaz çünkü tray farklı bir şeyi anlatır, \"кухонная столешница\" için countertop gerekir.",
          "pantry burada uymaz çünkü pantry farklı bir şeyi anlatır, \"кухонная столешница\" için countertop gerekir."
        ],
        "pl": [
          "shelf tutaj nie pasuje, bo shelf wskazuje inną rzecz lub czynność, a do \"кухонная столешница\" wybierz countertop.",
          "Dobrze. countertop pasuje do \"кухонная столешница\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "tray tutaj nie pasuje, bo tray wskazuje inną rzecz lub czynność, a do \"кухонная столешница\" wybierz countertop.",
          "pantry tutaj nie pasuje, bo pantry wskazuje inną rzecz lub czynność, a do \"кухонная столешница\" wybierz countertop."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-075",
      "type": "mcq",
      "prompt": "Which English word means “морозилка”?",
      "localizedPrompts": {
        "ru": "Как по-английски «морозилка»?",
        "uk": "Яке англійське слово або фраза означає \"a freezer for keeping food frozen\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a freezer for keeping food frozen\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a freezer for keeping food frozen\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a freezer for keeping food frozen\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a freezer for keeping food frozen\"?",
        "tr": "\"a freezer for keeping food frozen\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a freezer for keeping food frozen\"?"
      },
      "choices": [
        "freezer",
        "fridge",
        "oven",
        "microwave"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a freezer for keeping food frozen.",
      "skillTag": "kitchen_appliance_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C75",
        "K75"
      ],
      "choiceRationales": [
        "freezer is the only correct answer for a freezer for keeping food frozen.",
        "fridge is plausible kitchen vocabulary but does not mean a freezer for keeping food frozen.",
        "oven is plausible kitchen vocabulary but does not mean a freezer for keeping food frozen.",
        "microwave is plausible kitchen vocabulary but does not mean a freezer for keeping food frozen."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! freezer — морозилка. Она держит продукты замороженными, а не просто холодными.",
          "fridge — холодильник. Он охлаждает, но для льда и заморозки точнее freezer.",
          "oven — духовка. Она нагревает, а морозилка делает обратное: freezer.",
          "microwave — микроволновка. Она быстро разогревает еду, но замораживает её freezer."
        ],
        "uk": [
          "Бінго! freezer точно відповідає ідеї \"морозилка\". Це потрібне англійське слово для цього значення.",
          "fridge тут не підходить, бо fridge називає інший предмет або дію, а для \"морозилка\" вибирай freezer.",
          "oven тут не підходить, бо oven називає інший предмет або дію, а для \"морозилка\" вибирай freezer.",
          "microwave тут не підходить, бо microwave називає інший предмет або дію, а для \"морозилка\" вибирай freezer."
        ],
        "es": [
          "Bien. freezer encaja con \"морозилка\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "fridge no sirve aquí porque fridge apunta a otra cosa de cocina, y para \"морозилка\" elige freezer.",
          "oven no sirve aquí porque oven apunta a otra cosa de cocina, y para \"морозилка\" elige freezer.",
          "microwave no sirve aquí porque microwave apunta a otra cosa de cocina, y para \"морозилка\" elige freezer."
        ],
        "pt-BR": [
          "Certo. freezer combina com \"морозилка\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "fridge não serve aqui porque fridge aponta para outra ideia, e para \"морозилка\" use freezer.",
          "oven não serve aqui porque oven aponta para outra ideia, e para \"морозилка\" use freezer.",
          "microwave não serve aqui porque microwave aponta para outra ideia, e para \"морозилка\" use freezer."
        ],
        "vi": [
          "Đúng. freezer khớp với \"морозилка\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "fridge không hợp ở đây vì fridge nói về ý khác, còn với \"морозилка\" dùng freezer.",
          "oven không hợp ở đây vì oven nói về ý khác, còn với \"морозилка\" dùng freezer.",
          "microwave không hợp ở đây vì microwave nói về ý khác, còn với \"морозилка\" dùng freezer."
        ],
        "id": [
          "Benar. freezer cocok dengan \"морозилка\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "fridge tidak cocok di sini karena fridge menunjuk ide berbeda, dan untuk \"морозилка\" pakai freezer.",
          "oven tidak cocok di sini karena oven menunjuk ide berbeda, dan untuk \"морозилка\" pakai freezer.",
          "microwave tidak cocok di sini karena microwave menunjuk ide berbeda, dan untuk \"морозилка\" pakai freezer."
        ],
        "tr": [
          "Doğru. freezer, \"морозилка\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "fridge burada uymaz çünkü fridge farklı bir şeyi anlatır, \"морозилка\" için freezer gerekir.",
          "oven burada uymaz çünkü oven farklı bir şeyi anlatır, \"морозилка\" için freezer gerekir.",
          "microwave burada uymaz çünkü microwave farklı bir şeyi anlatır, \"морозилка\" için freezer gerekir."
        ],
        "pl": [
          "Dobrze. freezer pasuje do \"морозилка\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "fridge tutaj nie pasuje, bo fridge wskazuje inną rzecz lub czynność, a do \"морозилка\" wybierz freezer.",
          "oven tutaj nie pasuje, bo oven wskazuje inną rzecz lub czynność, a do \"морозилка\" wybierz freezer.",
          "microwave tutaj nie pasuje, bo microwave wskazuje inną rzecz lub czynność, a do \"морозилка\" wybierz freezer."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-076",
      "type": "mcq",
      "prompt": "Which English word means “посудомоечная машина”?",
      "localizedPrompts": {
        "ru": "Как по-английски «посудомоечная машина»?",
        "uk": "Яке англійське слово або фраза означає \"a dishwasher machine that washes dishes automatically\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a dishwasher machine that washes dishes automatically\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a dishwasher machine that washes dishes automatically\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a dishwasher machine that washes dishes automatically\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a dishwasher machine that washes dishes automatically\"?",
        "tr": "\"a dishwasher machine that washes dishes automatically\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a dishwasher machine that washes dishes automatically\"?"
      },
      "choices": [
        "dishwasher",
        "sink",
        "toaster",
        "blender"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a dishwasher machine that washes dishes automatically.",
      "skillTag": "kitchen_appliance_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C76",
        "K76"
      ],
      "choiceRationales": [
        "dishwasher is the only correct answer for a dishwasher machine that washes dishes automatically.",
        "sink is plausible kitchen vocabulary but does not mean a dishwasher machine that washes dishes automatically.",
        "toaster is plausible kitchen vocabulary but does not mean a dishwasher machine that washes dishes automatically.",
        "blender is plausible kitchen vocabulary but does not mean a dishwasher machine that washes dishes automatically."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! dishwasher — посудомоечная машина. Она моет тарелки, чашки и приборы автоматически.",
          "sink — раковина. Там посуду можно мыть руками, а машина для этого — dishwasher.",
          "toaster — тостер. Он подрумянивает хлеб, но посуду не моет; нужна dishwasher.",
          "blender — блендер. Он измельчает продукты, а тарелки после еды моет dishwasher."
        ],
        "uk": [
          "Бінго! dishwasher точно відповідає ідеї \"посудомоечная машина\". Це потрібне англійське слово для цього значення.",
          "sink тут не підходить, бо sink називає інший предмет або дію, а для \"посудомоечная машина\" вибирай dishwasher.",
          "toaster тут не підходить, бо toaster називає інший предмет або дію, а для \"посудомоечная машина\" вибирай dishwasher.",
          "blender тут не підходить, бо blender називає інший предмет або дію, а для \"посудомоечная машина\" вибирай dishwasher."
        ],
        "es": [
          "Bien. dishwasher encaja con \"посудомоечная машина\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "sink no sirve aquí porque sink apunta a otra cosa de cocina, y para \"посудомоечная машина\" elige dishwasher.",
          "toaster no sirve aquí porque toaster apunta a otra cosa de cocina, y para \"посудомоечная машина\" elige dishwasher.",
          "blender no sirve aquí porque blender apunta a otra cosa de cocina, y para \"посудомоечная машина\" elige dishwasher."
        ],
        "pt-BR": [
          "Certo. dishwasher combina com \"посудомоечная машина\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "sink não serve aqui porque sink aponta para outra ideia, e para \"посудомоечная машина\" use dishwasher.",
          "toaster não serve aqui porque toaster aponta para outra ideia, e para \"посудомоечная машина\" use dishwasher.",
          "blender não serve aqui porque blender aponta para outra ideia, e para \"посудомоечная машина\" use dishwasher."
        ],
        "vi": [
          "Đúng. dishwasher khớp với \"посудомоечная машина\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "sink không hợp ở đây vì sink nói về ý khác, còn với \"посудомоечная машина\" dùng dishwasher.",
          "toaster không hợp ở đây vì toaster nói về ý khác, còn với \"посудомоечная машина\" dùng dishwasher.",
          "blender không hợp ở đây vì blender nói về ý khác, còn với \"посудомоечная машина\" dùng dishwasher."
        ],
        "id": [
          "Benar. dishwasher cocok dengan \"посудомоечная машина\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "sink tidak cocok di sini karena sink menunjuk ide berbeda, dan untuk \"посудомоечная машина\" pakai dishwasher.",
          "toaster tidak cocok di sini karena toaster menunjuk ide berbeda, dan untuk \"посудомоечная машина\" pakai dishwasher.",
          "blender tidak cocok di sini karena blender menunjuk ide berbeda, dan untuk \"посудомоечная машина\" pakai dishwasher."
        ],
        "tr": [
          "Doğru. dishwasher, \"посудомоечная машина\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "sink burada uymaz çünkü sink farklı bir şeyi anlatır, \"посудомоечная машина\" için dishwasher gerekir.",
          "toaster burada uymaz çünkü toaster farklı bir şeyi anlatır, \"посудомоечная машина\" için dishwasher gerekir.",
          "blender burada uymaz çünkü blender farklı bir şeyi anlatır, \"посудомоечная машина\" için dishwasher gerekir."
        ],
        "pl": [
          "Dobrze. dishwasher pasuje do \"посудомоечная машина\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "sink tutaj nie pasuje, bo sink wskazuje inną rzecz lub czynność, a do \"посудомоечная машина\" wybierz dishwasher.",
          "toaster tutaj nie pasuje, bo toaster wskazuje inną rzecz lub czynność, a do \"посудомоечная машина\" wybierz dishwasher.",
          "blender tutaj nie pasuje, bo blender wskazuje inną rzecz lub czynność, a do \"посудомоечная машина\" wybierz dishwasher."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-077",
      "type": "mcq",
      "prompt": "Which English phrase means “сушилка для посуды”?",
      "localizedPrompts": {
        "ru": "Как по-английски «сушилка для посуды»?",
        "uk": "Яке англійське слово або фраза означає \"a rack where washed dishes dry\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a rack where washed dishes dry\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a rack where washed dishes dry\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a rack where washed dishes dry\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a rack where washed dishes dry\"?",
        "tr": "\"a rack where washed dishes dry\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a rack where washed dishes dry\"?"
      },
      "choices": [
        "dish rack",
        "baking tray",
        "cutting board",
        "napkin"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a rack where washed dishes dry.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C77",
        "K77"
      ],
      "choiceRationales": [
        "dish rack is the only correct answer for a rack where washed dishes dry.",
        "baking tray is plausible kitchen vocabulary but does not mean a rack where washed dishes dry.",
        "cutting board is plausible kitchen vocabulary but does not mean a rack where washed dishes dry.",
        "napkin is plausible kitchen vocabulary but does not mean a rack where washed dishes dry."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! dish rack — сушилка для посуды. В неё ставят вымытые тарелки и чашки, чтобы стекла вода.",
          "baking tray — противень. Его ставят в духовку, а чистую посуду сушат в dish rack.",
          "cutting board — разделочная доска. На ней режут продукты, но тарелки после мытья идут в dish rack.",
          "napkin — салфетка. Ею можно вытереть руки, а посуда сушится в dish rack."
        ],
        "uk": [
          "Бінго! dish rack точно відповідає ідеї \"сушилка для посуды\". Це потрібне англійське слово для цього значення.",
          "baking tray тут не підходить, бо baking tray називає інший предмет або дію, а для \"сушилка для посуды\" вибирай dish rack.",
          "cutting board тут не підходить, бо cutting board називає інший предмет або дію, а для \"сушилка для посуды\" вибирай dish rack.",
          "napkin тут не підходить, бо napkin називає інший предмет або дію, а для \"сушилка для посуды\" вибирай dish rack."
        ],
        "es": [
          "Bien. dish rack encaja con \"сушилка для посуды\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "baking tray no sirve aquí porque baking tray apunta a otra cosa de cocina, y para \"сушилка для посуды\" elige dish rack.",
          "cutting board no sirve aquí porque cutting board apunta a otra cosa de cocina, y para \"сушилка для посуды\" elige dish rack.",
          "napkin no sirve aquí porque napkin apunta a otra cosa de cocina, y para \"сушилка для посуды\" elige dish rack."
        ],
        "pt-BR": [
          "Certo. dish rack combina com \"сушилка для посуды\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "baking tray não serve aqui porque baking tray aponta para outra ideia, e para \"сушилка для посуды\" use dish rack.",
          "cutting board não serve aqui porque cutting board aponta para outra ideia, e para \"сушилка для посуды\" use dish rack.",
          "napkin não serve aqui porque napkin aponta para outra ideia, e para \"сушилка для посуды\" use dish rack."
        ],
        "vi": [
          "Đúng. dish rack khớp với \"сушилка для посуды\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "baking tray không hợp ở đây vì baking tray nói về ý khác, còn với \"сушилка для посуды\" dùng dish rack.",
          "cutting board không hợp ở đây vì cutting board nói về ý khác, còn với \"сушилка для посуды\" dùng dish rack.",
          "napkin không hợp ở đây vì napkin nói về ý khác, còn với \"сушилка для посуды\" dùng dish rack."
        ],
        "id": [
          "Benar. dish rack cocok dengan \"сушилка для посуды\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "baking tray tidak cocok di sini karena baking tray menunjuk ide berbeda, dan untuk \"сушилка для посуды\" pakai dish rack.",
          "cutting board tidak cocok di sini karena cutting board menunjuk ide berbeda, dan untuk \"сушилка для посуды\" pakai dish rack.",
          "napkin tidak cocok di sini karena napkin menunjuk ide berbeda, dan untuk \"сушилка для посуды\" pakai dish rack."
        ],
        "tr": [
          "Doğru. dish rack, \"сушилка для посуды\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "baking tray burada uymaz çünkü baking tray farklı bir şeyi anlatır, \"сушилка для посуды\" için dish rack gerekir.",
          "cutting board burada uymaz çünkü cutting board farklı bir şeyi anlatır, \"сушилка для посуды\" için dish rack gerekir.",
          "napkin burada uymaz çünkü napkin farklı bir şeyi anlatır, \"сушилка для посуды\" için dish rack gerekir."
        ],
        "pl": [
          "Dobrze. dish rack pasuje do \"сушилка для посуды\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "baking tray tutaj nie pasuje, bo baking tray wskazuje inną rzecz lub czynność, a do \"сушилка для посуды\" wybierz dish rack.",
          "cutting board tutaj nie pasuje, bo cutting board wskazuje inną rzecz lub czynność, a do \"сушилка для посуды\" wybierz dish rack.",
          "napkin tutaj nie pasuje, bo napkin wskazuje inną rzecz lub czynność, a do \"сушилка для посуды\" wybierz dish rack."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-078",
      "type": "mcq",
      "prompt": "Which English word means “губка для мытья посуды”?",
      "localizedPrompts": {
        "ru": "Как по-английски «губка для мытья посуды»?",
        "uk": "Яке англійське слово або фраза означає \"a sponge used for washing dishes\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a sponge used for washing dishes\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a sponge used for washing dishes\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a sponge used for washing dishes\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a sponge used for washing dishes\"?",
        "tr": "\"a sponge used for washing dishes\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a sponge used for washing dishes\"?"
      },
      "choices": [
        "sponge",
        "towel",
        "napkin",
        "oven mitt"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a sponge used for washing dishes.",
      "skillTag": "kitchen_cleaning_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C78",
        "K78"
      ],
      "choiceRationales": [
        "sponge is the only correct answer for a sponge used for washing dishes.",
        "towel is plausible kitchen vocabulary but does not mean a sponge used for washing dishes.",
        "napkin is plausible kitchen vocabulary but does not mean a sponge used for washing dishes.",
        "oven mitt is plausible kitchen vocabulary but does not mean a sponge used for washing dishes."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! sponge — губка. Ею трут тарелки, чашки и сковородки во время мытья.",
          "towel — полотенце. Им вытирают руки или посуду, но моют тарелки губкой: sponge.",
          "napkin — салфетка. Она для стола или рук, а губка для мытья посуды — sponge.",
          "oven mitt — кухонная рукавица. Она защищает от жара, но грязную тарелку отмоет sponge."
        ],
        "uk": [
          "Бінго! sponge точно відповідає ідеї \"губка для мытья посуды\". Це потрібне англійське слово для цього значення.",
          "towel тут не підходить, бо towel називає інший предмет або дію, а для \"губка для мытья посуды\" вибирай sponge.",
          "napkin тут не підходить, бо napkin називає інший предмет або дію, а для \"губка для мытья посуды\" вибирай sponge.",
          "oven mitt тут не підходить, бо oven mitt називає інший предмет або дію, а для \"губка для мытья посуды\" вибирай sponge."
        ],
        "es": [
          "Bien. sponge encaja con \"губка для мытья посуды\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "towel no sirve aquí porque towel apunta a otra cosa de cocina, y para \"губка для мытья посуды\" elige sponge.",
          "napkin no sirve aquí porque napkin apunta a otra cosa de cocina, y para \"губка для мытья посуды\" elige sponge.",
          "oven mitt no sirve aquí porque oven mitt apunta a otra cosa de cocina, y para \"губка для мытья посуды\" elige sponge."
        ],
        "pt-BR": [
          "Certo. sponge combina com \"губка для мытья посуды\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "towel não serve aqui porque towel aponta para outra ideia, e para \"губка для мытья посуды\" use sponge.",
          "napkin não serve aqui porque napkin aponta para outra ideia, e para \"губка для мытья посуды\" use sponge.",
          "oven mitt não serve aqui porque oven mitt aponta para outra ideia, e para \"губка для мытья посуды\" use sponge."
        ],
        "vi": [
          "Đúng. sponge khớp với \"губка для мытья посуды\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "towel không hợp ở đây vì towel nói về ý khác, còn với \"губка для мытья посуды\" dùng sponge.",
          "napkin không hợp ở đây vì napkin nói về ý khác, còn với \"губка для мытья посуды\" dùng sponge.",
          "oven mitt không hợp ở đây vì oven mitt nói về ý khác, còn với \"губка для мытья посуды\" dùng sponge."
        ],
        "id": [
          "Benar. sponge cocok dengan \"губка для мытья посуды\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "towel tidak cocok di sini karena towel menunjuk ide berbeda, dan untuk \"губка для мытья посуды\" pakai sponge.",
          "napkin tidak cocok di sini karena napkin menunjuk ide berbeda, dan untuk \"губка для мытья посуды\" pakai sponge.",
          "oven mitt tidak cocok di sini karena oven mitt menunjuk ide berbeda, dan untuk \"губка для мытья посуды\" pakai sponge."
        ],
        "tr": [
          "Doğru. sponge, \"губка для мытья посуды\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "towel burada uymaz çünkü towel farklı bir şeyi anlatır, \"губка для мытья посуды\" için sponge gerekir.",
          "napkin burada uymaz çünkü napkin farklı bir şeyi anlatır, \"губка для мытья посуды\" için sponge gerekir.",
          "oven mitt burada uymaz çünkü oven mitt farklı bir şeyi anlatır, \"губка для мытья посуды\" için sponge gerekir."
        ],
        "pl": [
          "Dobrze. sponge pasuje do \"губка для мытья посуды\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "towel tutaj nie pasuje, bo towel wskazuje inną rzecz lub czynność, a do \"губка для мытья посуды\" wybierz sponge.",
          "napkin tutaj nie pasuje, bo napkin wskazuje inną rzecz lub czynność, a do \"губка для мытья посуды\" wybierz sponge.",
          "oven mitt tutaj nie pasuje, bo oven mitt wskazuje inną rzecz lub czynność, a do \"губка для мытья посуды\" wybierz sponge."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-079",
      "type": "mcq",
      "prompt": "Which English phrase means “средство для мытья посуды”?",
      "localizedPrompts": {
        "ru": "Как по-английски «средство для мытья посуды»?",
        "uk": "Яке англійське слово або фраза означає \"soap used for washing dishes\"?",
        "es": "¿Qué palabra o frase inglesa significa \"soap used for washing dishes\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"soap used for washing dishes\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"soap used for washing dishes\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"soap used for washing dishes\"?",
        "tr": "\"soap used for washing dishes\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"soap used for washing dishes\"?"
      },
      "choices": [
        "dish soap",
        "salt",
        "flour",
        "sugar"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for soap used for washing dishes.",
      "skillTag": "kitchen_cleaning_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C79",
        "K79"
      ],
      "choiceRationales": [
        "dish soap is the only correct answer for soap used for washing dishes.",
        "salt is plausible kitchen vocabulary but does not mean soap used for washing dishes.",
        "flour is plausible kitchen vocabulary but does not mean soap used for washing dishes.",
        "sugar is plausible kitchen vocabulary but does not mean soap used for washing dishes."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! dish soap — средство для мытья посуды. Его добавляют на губку, чтобы убрать жир и остатки еды.",
          "salt — соль. Её добавляют в еду, но тарелки от жира моют с dish soap.",
          "flour — мука. Она нужна для теста, а не для мытья посуды; правильный вариант — dish soap.",
          "sugar — сахар. Он делает еду сладкой, но не заменяет средство для посуды: dish soap."
        ],
        "uk": [
          "Бінго! dish soap точно відповідає ідеї \"средство для мытья посуды\". Це потрібне англійське слово для цього значення.",
          "salt тут не підходить, бо salt називає інший предмет або дію, а для \"средство для мытья посуды\" вибирай dish soap.",
          "flour тут не підходить, бо flour називає інший предмет або дію, а для \"средство для мытья посуды\" вибирай dish soap.",
          "sugar тут не підходить, бо sugar називає інший предмет або дію, а для \"средство для мытья посуды\" вибирай dish soap."
        ],
        "es": [
          "Bien. dish soap encaja con \"средство для мытья посуды\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "salt no sirve aquí porque salt apunta a otra cosa de cocina, y para \"средство для мытья посуды\" elige dish soap.",
          "flour no sirve aquí porque flour apunta a otra cosa de cocina, y para \"средство для мытья посуды\" elige dish soap.",
          "sugar no sirve aquí porque sugar apunta a otra cosa de cocina, y para \"средство для мытья посуды\" elige dish soap."
        ],
        "pt-BR": [
          "Certo. dish soap combina com \"средство для мытья посуды\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "salt não serve aqui porque salt aponta para outra ideia, e para \"средство для мытья посуды\" use dish soap.",
          "flour não serve aqui porque flour aponta para outra ideia, e para \"средство для мытья посуды\" use dish soap.",
          "sugar não serve aqui porque sugar aponta para outra ideia, e para \"средство для мытья посуды\" use dish soap."
        ],
        "vi": [
          "Đúng. dish soap khớp với \"средство для мытья посуды\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "salt không hợp ở đây vì salt nói về ý khác, còn với \"средство для мытья посуды\" dùng dish soap.",
          "flour không hợp ở đây vì flour nói về ý khác, còn với \"средство для мытья посуды\" dùng dish soap.",
          "sugar không hợp ở đây vì sugar nói về ý khác, còn với \"средство для мытья посуды\" dùng dish soap."
        ],
        "id": [
          "Benar. dish soap cocok dengan \"средство для мытья посуды\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "salt tidak cocok di sini karena salt menunjuk ide berbeda, dan untuk \"средство для мытья посуды\" pakai dish soap.",
          "flour tidak cocok di sini karena flour menunjuk ide berbeda, dan untuk \"средство для мытья посуды\" pakai dish soap.",
          "sugar tidak cocok di sini karena sugar menunjuk ide berbeda, dan untuk \"средство для мытья посуды\" pakai dish soap."
        ],
        "tr": [
          "Doğru. dish soap, \"средство для мытья посуды\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "salt burada uymaz çünkü salt farklı bir şeyi anlatır, \"средство для мытья посуды\" için dish soap gerekir.",
          "flour burada uymaz çünkü flour farklı bir şeyi anlatır, \"средство для мытья посуды\" için dish soap gerekir.",
          "sugar burada uymaz çünkü sugar farklı bir şeyi anlatır, \"средство для мытья посуды\" için dish soap gerekir."
        ],
        "pl": [
          "Dobrze. dish soap pasuje do \"средство для мытья посуды\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "salt tutaj nie pasuje, bo salt wskazuje inną rzecz lub czynność, a do \"средство для мытья посуды\" wybierz dish soap.",
          "flour tutaj nie pasuje, bo flour wskazuje inną rzecz lub czynność, a do \"средство для мытья посуды\" wybierz dish soap.",
          "sugar tutaj nie pasuje, bo sugar wskazuje inną rzecz lub czynność, a do \"средство для мытья посуды\" wybierz dish soap."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-080",
      "type": "mcq",
      "prompt": "Which English verb fits “rinse dishes”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «ополоснуть посуду»?",
        "uk": "Яке англійське дієслово потрібне для \"rinse dishes\"?",
        "es": "¿Qué verbo inglés se usa para \"rinse dishes\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"rinse dishes\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"rinse dishes\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"rinse dishes\"?",
        "tr": "\"rinse dishes\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"rinse dishes\"?"
      },
      "choices": [
        "rinse",
        "scrub",
        "thaw",
        "dice"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen or recipe verb for rinse dishes.",
      "skillTag": "kitchen_cleaning_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C80",
        "K80"
      ],
      "choiceRationales": [
        "rinse is the only correct answer for rinse dishes.",
        "scrub is plausible kitchen vocabulary but does not mean rinse dishes.",
        "thaw is plausible kitchen vocabulary but does not mean rinse dishes.",
        "dice is plausible kitchen vocabulary but does not mean rinse dishes."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! rinse значит ополоснуть. Это быстро промыть водой, обычно без долгого трения.",
          "scrub — тереть или отчищать. Если нужно просто смыть водой, точнее rinse.",
          "thaw — размораживать. Это про замороженные продукты, а посуду водой ополаскивают: rinse.",
          "dice — нарезать кубиками. Посуду кубиками не режут; для воды после мытья нужен rinse."
        ],
        "uk": [
          "Бінго! rinse точно відповідає ідеї \"rinse dishes\". Це потрібне англійське слово для цього значення.",
          "scrub тут не підходить, бо scrub називає інший предмет або дію, а для \"rinse dishes\" вибирай rinse.",
          "thaw тут не підходить, бо thaw називає інший предмет або дію, а для \"rinse dishes\" вибирай rinse.",
          "dice тут не підходить, бо dice називає інший предмет або дію, а для \"rinse dishes\" вибирай rinse."
        ],
        "es": [
          "Bien. rinse encaja con \"rinse dishes\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "scrub no sirve aquí porque scrub apunta a otra cosa de cocina, y para \"rinse dishes\" elige rinse.",
          "thaw no sirve aquí porque thaw apunta a otra cosa de cocina, y para \"rinse dishes\" elige rinse.",
          "dice no sirve aquí porque dice apunta a otra cosa de cocina, y para \"rinse dishes\" elige rinse."
        ],
        "pt-BR": [
          "Certo. rinse combina com \"rinse dishes\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "scrub não serve aqui porque scrub aponta para outra ideia, e para \"rinse dishes\" use rinse.",
          "thaw não serve aqui porque thaw aponta para outra ideia, e para \"rinse dishes\" use rinse.",
          "dice não serve aqui porque dice aponta para outra ideia, e para \"rinse dishes\" use rinse."
        ],
        "vi": [
          "Đúng. rinse khớp với \"rinse dishes\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "scrub không hợp ở đây vì scrub nói về ý khác, còn với \"rinse dishes\" dùng rinse.",
          "thaw không hợp ở đây vì thaw nói về ý khác, còn với \"rinse dishes\" dùng rinse.",
          "dice không hợp ở đây vì dice nói về ý khác, còn với \"rinse dishes\" dùng rinse."
        ],
        "id": [
          "Benar. rinse cocok dengan \"rinse dishes\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "scrub tidak cocok di sini karena scrub menunjuk ide berbeda, dan untuk \"rinse dishes\" pakai rinse.",
          "thaw tidak cocok di sini karena thaw menunjuk ide berbeda, dan untuk \"rinse dishes\" pakai rinse.",
          "dice tidak cocok di sini karena dice menunjuk ide berbeda, dan untuk \"rinse dishes\" pakai rinse."
        ],
        "tr": [
          "Doğru. rinse, \"rinse dishes\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "scrub burada uymaz çünkü scrub farklı bir şeyi anlatır, \"rinse dishes\" için rinse gerekir.",
          "thaw burada uymaz çünkü thaw farklı bir şeyi anlatır, \"rinse dishes\" için rinse gerekir.",
          "dice burada uymaz çünkü dice farklı bir şeyi anlatır, \"rinse dishes\" için rinse gerekir."
        ],
        "pl": [
          "Dobrze. rinse pasuje do \"rinse dishes\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "scrub tutaj nie pasuje, bo scrub wskazuje inną rzecz lub czynność, a do \"rinse dishes\" wybierz rinse.",
          "thaw tutaj nie pasuje, bo thaw wskazuje inną rzecz lub czynność, a do \"rinse dishes\" wybierz rinse.",
          "dice tutaj nie pasuje, bo dice wskazuje inną rzecz lub czynność, a do \"rinse dishes\" wybierz rinse."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-081",
      "type": "mcq",
      "prompt": "Which English verb fits “scrub a dirty pan”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «оттирать грязную сковороду»?",
        "uk": "Яке англійське дієслово потрібне для \"scrub a dirty pan\"?",
        "es": "¿Qué verbo inglés se usa para \"scrub a dirty pan\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"scrub a dirty pan\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"scrub a dirty pan\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"scrub a dirty pan\"?",
        "tr": "\"scrub a dirty pan\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"scrub a dirty pan\"?"
      },
      "choices": [
        "scrub",
        "rinse",
        "thaw",
        "garnish"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen or recipe verb for scrub a dirty pan.",
      "skillTag": "kitchen_cleaning_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C81",
        "K81"
      ],
      "choiceRationales": [
        "scrub is the only correct answer for scrub a dirty pan.",
        "rinse is plausible kitchen vocabulary but does not mean scrub a dirty pan.",
        "thaw is plausible kitchen vocabulary but does not mean scrub a dirty pan.",
        "garnish is plausible kitchen vocabulary but does not mean scrub a dirty pan."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! scrub значит оттирать или тереть. Это когда грязь держится крепко и нужна губка плюс усилие.",
          "rinse — ополоснуть водой. Если сковороду надо именно оттирать, одного rinse мало; нужен scrub.",
          "thaw — размораживать. Это про лёд и замороженные продукты, а грязную сковороду scrub.",
          "garnish — украсить блюдо сверху. Сковороду не украшают зеленью; её оттирают: scrub."
        ],
        "uk": [
          "Бінго! scrub точно відповідає ідеї \"scrub a dirty pan\". Це потрібне англійське слово для цього значення.",
          "rinse тут не підходить, бо rinse називає інший предмет або дію, а для \"scrub a dirty pan\" вибирай scrub.",
          "thaw тут не підходить, бо thaw називає інший предмет або дію, а для \"scrub a dirty pan\" вибирай scrub.",
          "garnish тут не підходить, бо garnish називає інший предмет або дію, а для \"scrub a dirty pan\" вибирай scrub."
        ],
        "es": [
          "Bien. scrub encaja con \"scrub a dirty pan\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "rinse no sirve aquí porque rinse apunta a otra cosa de cocina, y para \"scrub a dirty pan\" elige scrub.",
          "thaw no sirve aquí porque thaw apunta a otra cosa de cocina, y para \"scrub a dirty pan\" elige scrub.",
          "garnish no sirve aquí porque garnish apunta a otra cosa de cocina, y para \"scrub a dirty pan\" elige scrub."
        ],
        "pt-BR": [
          "Certo. scrub combina com \"scrub a dirty pan\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "rinse não serve aqui porque rinse aponta para outra ideia, e para \"scrub a dirty pan\" use scrub.",
          "thaw não serve aqui porque thaw aponta para outra ideia, e para \"scrub a dirty pan\" use scrub.",
          "garnish não serve aqui porque garnish aponta para outra ideia, e para \"scrub a dirty pan\" use scrub."
        ],
        "vi": [
          "Đúng. scrub khớp với \"scrub a dirty pan\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "rinse không hợp ở đây vì rinse nói về ý khác, còn với \"scrub a dirty pan\" dùng scrub.",
          "thaw không hợp ở đây vì thaw nói về ý khác, còn với \"scrub a dirty pan\" dùng scrub.",
          "garnish không hợp ở đây vì garnish nói về ý khác, còn với \"scrub a dirty pan\" dùng scrub."
        ],
        "id": [
          "Benar. scrub cocok dengan \"scrub a dirty pan\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "rinse tidak cocok di sini karena rinse menunjuk ide berbeda, dan untuk \"scrub a dirty pan\" pakai scrub.",
          "thaw tidak cocok di sini karena thaw menunjuk ide berbeda, dan untuk \"scrub a dirty pan\" pakai scrub.",
          "garnish tidak cocok di sini karena garnish menunjuk ide berbeda, dan untuk \"scrub a dirty pan\" pakai scrub."
        ],
        "tr": [
          "Doğru. scrub, \"scrub a dirty pan\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "rinse burada uymaz çünkü rinse farklı bir şeyi anlatır, \"scrub a dirty pan\" için scrub gerekir.",
          "thaw burada uymaz çünkü thaw farklı bir şeyi anlatır, \"scrub a dirty pan\" için scrub gerekir.",
          "garnish burada uymaz çünkü garnish farklı bir şeyi anlatır, \"scrub a dirty pan\" için scrub gerekir."
        ],
        "pl": [
          "Dobrze. scrub pasuje do \"scrub a dirty pan\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "rinse tutaj nie pasuje, bo rinse wskazuje inną rzecz lub czynność, a do \"scrub a dirty pan\" wybierz scrub.",
          "thaw tutaj nie pasuje, bo thaw wskazuje inną rzecz lub czynność, a do \"scrub a dirty pan\" wybierz scrub.",
          "garnish tutaj nie pasuje, bo garnish wskazuje inną rzecz lub czynność, a do \"scrub a dirty pan\" wybierz scrub."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-082",
      "type": "mcq",
      "prompt": "Which English verb fits “thaw meat”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «разморозить мясо»?",
        "uk": "Яке англійське дієслово потрібне для \"thaw meat\"?",
        "es": "¿Qué verbo inglés se usa para \"thaw meat\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"thaw meat\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"thaw meat\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"thaw meat\"?",
        "tr": "\"thaw meat\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"thaw meat\"?"
      },
      "choices": [
        "simmer",
        "scrub",
        "thaw",
        "dice"
      ],
      "correctIndex": 2,
      "learningGoal": "Choose the English kitchen or recipe verb for thaw meat.",
      "skillTag": "recipe_instruction_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C82",
        "K82"
      ],
      "choiceRationales": [
        "simmer is plausible kitchen vocabulary but does not mean thaw meat.",
        "scrub is plausible kitchen vocabulary but does not mean thaw meat.",
        "thaw is the only correct answer for thaw meat.",
        "dice is plausible kitchen vocabulary but does not mean thaw meat."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "simmer — томить на слабом огне. Замороженное мясо сначала должно thaw, а уже потом готовиться.",
          "scrub — оттирать. Мясо не трут как сковороду; из заморозки его выводят глаголом thaw.",
          "Бинго! thaw значит разморозить. Продукт перестаёт быть твёрдым от льда и становится готовым к готовке.",
          "dice — нарезать кубиками. Перед нарезкой замороженному мясу обычно нужно thaw."
        ],
        "uk": [
          "simmer тут не підходить, бо simmer називає інший предмет або дію, а для \"thaw meat\" вибирай thaw.",
          "scrub тут не підходить, бо scrub називає інший предмет або дію, а для \"thaw meat\" вибирай thaw.",
          "Бінго! thaw точно відповідає ідеї \"thaw meat\". Це потрібне англійське слово для цього значення.",
          "dice тут не підходить, бо dice називає інший предмет або дію, а для \"thaw meat\" вибирай thaw."
        ],
        "es": [
          "simmer no sirve aquí porque simmer apunta a otra cosa de cocina, y para \"thaw meat\" elige thaw.",
          "scrub no sirve aquí porque scrub apunta a otra cosa de cocina, y para \"thaw meat\" elige thaw.",
          "Bien. thaw encaja con \"thaw meat\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "dice no sirve aquí porque dice apunta a otra cosa de cocina, y para \"thaw meat\" elige thaw."
        ],
        "pt-BR": [
          "simmer não serve aqui porque simmer aponta para outra ideia, e para \"thaw meat\" use thaw.",
          "scrub não serve aqui porque scrub aponta para outra ideia, e para \"thaw meat\" use thaw.",
          "Certo. thaw combina com \"thaw meat\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "dice não serve aqui porque dice aponta para outra ideia, e para \"thaw meat\" use thaw."
        ],
        "vi": [
          "simmer không hợp ở đây vì simmer nói về ý khác, còn với \"thaw meat\" dùng thaw.",
          "scrub không hợp ở đây vì scrub nói về ý khác, còn với \"thaw meat\" dùng thaw.",
          "Đúng. thaw khớp với \"thaw meat\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "dice không hợp ở đây vì dice nói về ý khác, còn với \"thaw meat\" dùng thaw."
        ],
        "id": [
          "simmer tidak cocok di sini karena simmer menunjuk ide berbeda, dan untuk \"thaw meat\" pakai thaw.",
          "scrub tidak cocok di sini karena scrub menunjuk ide berbeda, dan untuk \"thaw meat\" pakai thaw.",
          "Benar. thaw cocok dengan \"thaw meat\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "dice tidak cocok di sini karena dice menunjuk ide berbeda, dan untuk \"thaw meat\" pakai thaw."
        ],
        "tr": [
          "simmer burada uymaz çünkü simmer farklı bir şeyi anlatır, \"thaw meat\" için thaw gerekir.",
          "scrub burada uymaz çünkü scrub farklı bir şeyi anlatır, \"thaw meat\" için thaw gerekir.",
          "Doğru. thaw, \"thaw meat\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "dice burada uymaz çünkü dice farklı bir şeyi anlatır, \"thaw meat\" için thaw gerekir."
        ],
        "pl": [
          "simmer tutaj nie pasuje, bo simmer wskazuje inną rzecz lub czynność, a do \"thaw meat\" wybierz thaw.",
          "scrub tutaj nie pasuje, bo scrub wskazuje inną rzecz lub czynność, a do \"thaw meat\" wybierz thaw.",
          "Dobrze. thaw pasuje do \"thaw meat\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "dice tutaj nie pasuje, bo dice wskazuje inną rzecz lub czynność, a do \"thaw meat\" wybierz thaw."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-083",
      "type": "mcq",
      "prompt": "Which English verb fits “dice a carrot”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «нарезать морковь кубиками»?",
        "uk": "Яке англійське дієслово потрібне для \"dice a carrot\"?",
        "es": "¿Qué verbo inglés se usa para \"dice a carrot\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"dice a carrot\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"dice a carrot\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"dice a carrot\"?",
        "tr": "\"dice a carrot\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"dice a carrot\"?"
      },
      "choices": [
        "dice",
        "peel",
        "thaw",
        "garnish"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen or recipe verb for dice a carrot.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C83",
        "K83"
      ],
      "choiceRationales": [
        "dice is the only correct answer for dice a carrot.",
        "peel is plausible kitchen vocabulary but does not mean dice a carrot.",
        "thaw is plausible kitchen vocabulary but does not mean dice a carrot.",
        "garnish is plausible kitchen vocabulary but does not mean dice a carrot."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! dice значит нарезать кубиками. Кусочки получаются маленькие, ровные и похожие на кубики.",
          "peel — снять кожуру. Морковь можно peel сначала, но кубики делает уже dice.",
          "thaw — разморозить. Это про холод, а форма кусочков “кубиками” — dice.",
          "garnish — украсить блюдо. Морковь кубиками не украшают этим словом; её dice."
        ],
        "uk": [
          "Бінго! dice точно відповідає ідеї \"dice a carrot\". Це потрібне англійське слово для цього значення.",
          "peel тут не підходить, бо peel називає інший предмет або дію, а для \"dice a carrot\" вибирай dice.",
          "thaw тут не підходить, бо thaw називає інший предмет або дію, а для \"dice a carrot\" вибирай dice.",
          "garnish тут не підходить, бо garnish називає інший предмет або дію, а для \"dice a carrot\" вибирай dice."
        ],
        "es": [
          "Bien. dice encaja con \"dice a carrot\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "peel no sirve aquí porque peel apunta a otra cosa de cocina, y para \"dice a carrot\" elige dice.",
          "thaw no sirve aquí porque thaw apunta a otra cosa de cocina, y para \"dice a carrot\" elige dice.",
          "garnish no sirve aquí porque garnish apunta a otra cosa de cocina, y para \"dice a carrot\" elige dice."
        ],
        "pt-BR": [
          "Certo. dice combina com \"dice a carrot\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "peel não serve aqui porque peel aponta para outra ideia, e para \"dice a carrot\" use dice.",
          "thaw não serve aqui porque thaw aponta para outra ideia, e para \"dice a carrot\" use dice.",
          "garnish não serve aqui porque garnish aponta para outra ideia, e para \"dice a carrot\" use dice."
        ],
        "vi": [
          "Đúng. dice khớp với \"dice a carrot\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "peel không hợp ở đây vì peel nói về ý khác, còn với \"dice a carrot\" dùng dice.",
          "thaw không hợp ở đây vì thaw nói về ý khác, còn với \"dice a carrot\" dùng dice.",
          "garnish không hợp ở đây vì garnish nói về ý khác, còn với \"dice a carrot\" dùng dice."
        ],
        "id": [
          "Benar. dice cocok dengan \"dice a carrot\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "peel tidak cocok di sini karena peel menunjuk ide berbeda, dan untuk \"dice a carrot\" pakai dice.",
          "thaw tidak cocok di sini karena thaw menunjuk ide berbeda, dan untuk \"dice a carrot\" pakai dice.",
          "garnish tidak cocok di sini karena garnish menunjuk ide berbeda, dan untuk \"dice a carrot\" pakai dice."
        ],
        "tr": [
          "Doğru. dice, \"dice a carrot\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "peel burada uymaz çünkü peel farklı bir şeyi anlatır, \"dice a carrot\" için dice gerekir.",
          "thaw burada uymaz çünkü thaw farklı bir şeyi anlatır, \"dice a carrot\" için dice gerekir.",
          "garnish burada uymaz çünkü garnish farklı bir şeyi anlatır, \"dice a carrot\" için dice gerekir."
        ],
        "pl": [
          "Dobrze. dice pasuje do \"dice a carrot\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "peel tutaj nie pasuje, bo peel wskazuje inną rzecz lub czynność, a do \"dice a carrot\" wybierz dice.",
          "thaw tutaj nie pasuje, bo thaw wskazuje inną rzecz lub czynność, a do \"dice a carrot\" wybierz dice.",
          "garnish tutaj nie pasuje, bo garnish wskazuje inną rzecz lub czynność, a do \"dice a carrot\" wybierz dice."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-084",
      "type": "mcq",
      "prompt": "Which English verb fits “mince garlic”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «мелко нарубить чеснок»?",
        "uk": "Яке англійське дієслово потрібне для \"mince garlic\"?",
        "es": "¿Qué verbo inglés se usa para \"mince garlic\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"mince garlic\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"mince garlic\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"mince garlic\"?",
        "tr": "\"mince garlic\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"mince garlic\"?"
      },
      "choices": [
        "mince",
        "slice",
        "boil",
        "pour"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen or recipe verb for mince garlic.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C84",
        "K84"
      ],
      "choiceRationales": [
        "mince is the only correct answer for mince garlic.",
        "slice is plausible kitchen vocabulary but does not mean mince garlic.",
        "boil is plausible kitchen vocabulary but does not mean mince garlic.",
        "pour is plausible kitchen vocabulary but does not mean mince garlic."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! mince значит очень мелко нарубить. С чесноком это маленькие кусочки, почти крошка.",
          "slice — нарезать ломтиками. Для тонких пластинок подойдёт slice, но мелкая рубка чеснока — mince.",
          "boil — кипятить или варить. Чеснок здесь не варят; его мелко рубят: mince.",
          "pour — наливать жидкость. Чеснок не льётся, а мелко режется ножом; нужен mince."
        ],
        "uk": [
          "Бінго! mince точно відповідає ідеї \"mince garlic\". Це потрібне англійське слово для цього значення.",
          "slice тут не підходить, бо slice називає інший предмет або дію, а для \"mince garlic\" вибирай mince.",
          "boil тут не підходить, бо boil називає інший предмет або дію, а для \"mince garlic\" вибирай mince.",
          "pour тут не підходить, бо pour називає інший предмет або дію, а для \"mince garlic\" вибирай mince."
        ],
        "es": [
          "Bien. mince encaja con \"mince garlic\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "slice no sirve aquí porque slice apunta a otra cosa de cocina, y para \"mince garlic\" elige mince.",
          "boil no sirve aquí porque boil apunta a otra cosa de cocina, y para \"mince garlic\" elige mince.",
          "pour no sirve aquí porque pour apunta a otra cosa de cocina, y para \"mince garlic\" elige mince."
        ],
        "pt-BR": [
          "Certo. mince combina com \"mince garlic\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "slice não serve aqui porque slice aponta para outra ideia, e para \"mince garlic\" use mince.",
          "boil não serve aqui porque boil aponta para outra ideia, e para \"mince garlic\" use mince.",
          "pour não serve aqui porque pour aponta para outra ideia, e para \"mince garlic\" use mince."
        ],
        "vi": [
          "Đúng. mince khớp với \"mince garlic\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "slice không hợp ở đây vì slice nói về ý khác, còn với \"mince garlic\" dùng mince.",
          "boil không hợp ở đây vì boil nói về ý khác, còn với \"mince garlic\" dùng mince.",
          "pour không hợp ở đây vì pour nói về ý khác, còn với \"mince garlic\" dùng mince."
        ],
        "id": [
          "Benar. mince cocok dengan \"mince garlic\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "slice tidak cocok di sini karena slice menunjuk ide berbeda, dan untuk \"mince garlic\" pakai mince.",
          "boil tidak cocok di sini karena boil menunjuk ide berbeda, dan untuk \"mince garlic\" pakai mince.",
          "pour tidak cocok di sini karena pour menunjuk ide berbeda, dan untuk \"mince garlic\" pakai mince."
        ],
        "tr": [
          "Doğru. mince, \"mince garlic\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "slice burada uymaz çünkü slice farklı bir şeyi anlatır, \"mince garlic\" için mince gerekir.",
          "boil burada uymaz çünkü boil farklı bir şeyi anlatır, \"mince garlic\" için mince gerekir.",
          "pour burada uymaz çünkü pour farklı bir şeyi anlatır, \"mince garlic\" için mince gerekir."
        ],
        "pl": [
          "Dobrze. mince pasuje do \"mince garlic\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "slice tutaj nie pasuje, bo slice wskazuje inną rzecz lub czynność, a do \"mince garlic\" wybierz mince.",
          "boil tutaj nie pasuje, bo boil wskazuje inną rzecz lub czynność, a do \"mince garlic\" wybierz mince.",
          "pour tutaj nie pasuje, bo pour wskazuje inną rzecz lub czynność, a do \"mince garlic\" wybierz mince."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-085",
      "type": "mcq",
      "prompt": "Which English verb fits “garnish a dish with herbs”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «украсить блюдо зеленью»?",
        "uk": "Яке англійське дієслово потрібне для \"garnish a dish with herbs\"?",
        "es": "¿Qué verbo inglés se usa para \"garnish a dish with herbs\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"garnish a dish with herbs\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"garnish a dish with herbs\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"garnish a dish with herbs\"?",
        "tr": "\"garnish a dish with herbs\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"garnish a dish with herbs\"?"
      },
      "choices": [
        "garnish",
        "scrub",
        "drain",
        "knead"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen or recipe verb for garnish a dish with herbs.",
      "skillTag": "recipe_instruction_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C85",
        "K85"
      ],
      "choiceRationales": [
        "garnish is the only correct answer for garnish a dish with herbs.",
        "scrub is plausible kitchen vocabulary but does not mean garnish a dish with herbs.",
        "drain is plausible kitchen vocabulary but does not mean garnish a dish with herbs.",
        "knead is plausible kitchen vocabulary but does not mean garnish a dish with herbs."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! garnish значит украсить блюдо перед подачей. Часто это зелень, лимон или что-то сверху для вида и вкуса.",
          "scrub — оттирать грязь. Блюдо перед подачей не scrub; его можно красиво garnish.",
          "drain — слить жидкость. Зелень сверху не сливают, а добавляют как украшение: garnish.",
          "knead — месить тесто. Это работа с тестом руками, а зелень на готовое блюдо — garnish."
        ],
        "uk": [
          "Бінго! garnish точно відповідає ідеї \"garnish a dish with herbs\". Це потрібне англійське слово для цього значення.",
          "scrub тут не підходить, бо scrub називає інший предмет або дію, а для \"garnish a dish with herbs\" вибирай garnish.",
          "drain тут не підходить, бо drain називає інший предмет або дію, а для \"garnish a dish with herbs\" вибирай garnish.",
          "knead тут не підходить, бо knead називає інший предмет або дію, а для \"garnish a dish with herbs\" вибирай garnish."
        ],
        "es": [
          "Bien. garnish encaja con \"garnish a dish with herbs\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "scrub no sirve aquí porque scrub apunta a otra cosa de cocina, y para \"garnish a dish with herbs\" elige garnish.",
          "drain no sirve aquí porque drain apunta a otra cosa de cocina, y para \"garnish a dish with herbs\" elige garnish.",
          "knead no sirve aquí porque knead apunta a otra cosa de cocina, y para \"garnish a dish with herbs\" elige garnish."
        ],
        "pt-BR": [
          "Certo. garnish combina com \"garnish a dish with herbs\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "scrub não serve aqui porque scrub aponta para outra ideia, e para \"garnish a dish with herbs\" use garnish.",
          "drain não serve aqui porque drain aponta para outra ideia, e para \"garnish a dish with herbs\" use garnish.",
          "knead não serve aqui porque knead aponta para outra ideia, e para \"garnish a dish with herbs\" use garnish."
        ],
        "vi": [
          "Đúng. garnish khớp với \"garnish a dish with herbs\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "scrub không hợp ở đây vì scrub nói về ý khác, còn với \"garnish a dish with herbs\" dùng garnish.",
          "drain không hợp ở đây vì drain nói về ý khác, còn với \"garnish a dish with herbs\" dùng garnish.",
          "knead không hợp ở đây vì knead nói về ý khác, còn với \"garnish a dish with herbs\" dùng garnish."
        ],
        "id": [
          "Benar. garnish cocok dengan \"garnish a dish with herbs\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "scrub tidak cocok di sini karena scrub menunjuk ide berbeda, dan untuk \"garnish a dish with herbs\" pakai garnish.",
          "drain tidak cocok di sini karena drain menunjuk ide berbeda, dan untuk \"garnish a dish with herbs\" pakai garnish.",
          "knead tidak cocok di sini karena knead menunjuk ide berbeda, dan untuk \"garnish a dish with herbs\" pakai garnish."
        ],
        "tr": [
          "Doğru. garnish, \"garnish a dish with herbs\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "scrub burada uymaz çünkü scrub farklı bir şeyi anlatır, \"garnish a dish with herbs\" için garnish gerekir.",
          "drain burada uymaz çünkü drain farklı bir şeyi anlatır, \"garnish a dish with herbs\" için garnish gerekir.",
          "knead burada uymaz çünkü knead farklı bir şeyi anlatır, \"garnish a dish with herbs\" için garnish gerekir."
        ],
        "pl": [
          "Dobrze. garnish pasuje do \"garnish a dish with herbs\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "scrub tutaj nie pasuje, bo scrub wskazuje inną rzecz lub czynność, a do \"garnish a dish with herbs\" wybierz garnish.",
          "drain tutaj nie pasuje, bo drain wskazuje inną rzecz lub czynność, a do \"garnish a dish with herbs\" wybierz garnish.",
          "knead tutaj nie pasuje, bo knead wskazuje inną rzecz lub czynność, a do \"garnish a dish with herbs\" wybierz garnish."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-086",
      "type": "mcq",
      "prompt": "Which English verb fits “toss a salad”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «перемешать салат»?",
        "uk": "Яке англійське дієслово потрібне для \"toss a salad\"?",
        "es": "¿Qué verbo inglés se usa para \"toss a salad\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"toss a salad\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"toss a salad\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"toss a salad\"?",
        "tr": "\"toss a salad\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"toss a salad\"?"
      },
      "choices": [
        "toss",
        "freeze",
        "preheat",
        "grate"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen or recipe verb for toss a salad.",
      "skillTag": "recipe_instruction_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C86",
        "K86"
      ],
      "choiceRationales": [
        "toss is the only correct answer for toss a salad.",
        "freeze is plausible kitchen vocabulary but does not mean toss a salad.",
        "preheat is plausible kitchen vocabulary but does not mean toss a salad.",
        "grate is plausible kitchen vocabulary but does not mean toss a salad."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! toss значит легко перемешать салат. Ингредиенты поднимают и переворачивают, не превращая всё в кашу.",
          "freeze — замораживать. Салат обычно не замораживают; его аккуратно перемешивают: toss.",
          "preheat — заранее разогреть. Это про духовку, а салат перемешивают глаголом toss.",
          "grate — тереть на тёрке. Сыр можно grate для салата, но сам салат перемешивают: toss."
        ],
        "uk": [
          "Бінго! toss точно відповідає ідеї \"toss a salad\". Це потрібне англійське слово для цього значення.",
          "freeze тут не підходить, бо freeze називає інший предмет або дію, а для \"toss a salad\" вибирай toss.",
          "preheat тут не підходить, бо preheat називає інший предмет або дію, а для \"toss a salad\" вибирай toss.",
          "grate тут не підходить, бо grate називає інший предмет або дію, а для \"toss a salad\" вибирай toss."
        ],
        "es": [
          "Bien. toss encaja con \"toss a salad\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "freeze no sirve aquí porque freeze apunta a otra cosa de cocina, y para \"toss a salad\" elige toss.",
          "preheat no sirve aquí porque preheat apunta a otra cosa de cocina, y para \"toss a salad\" elige toss.",
          "grate no sirve aquí porque grate apunta a otra cosa de cocina, y para \"toss a salad\" elige toss."
        ],
        "pt-BR": [
          "Certo. toss combina com \"toss a salad\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "freeze não serve aqui porque freeze aponta para outra ideia, e para \"toss a salad\" use toss.",
          "preheat não serve aqui porque preheat aponta para outra ideia, e para \"toss a salad\" use toss.",
          "grate não serve aqui porque grate aponta para outra ideia, e para \"toss a salad\" use toss."
        ],
        "vi": [
          "Đúng. toss khớp với \"toss a salad\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "freeze không hợp ở đây vì freeze nói về ý khác, còn với \"toss a salad\" dùng toss.",
          "preheat không hợp ở đây vì preheat nói về ý khác, còn với \"toss a salad\" dùng toss.",
          "grate không hợp ở đây vì grate nói về ý khác, còn với \"toss a salad\" dùng toss."
        ],
        "id": [
          "Benar. toss cocok dengan \"toss a salad\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "freeze tidak cocok di sini karena freeze menunjuk ide berbeda, dan untuk \"toss a salad\" pakai toss.",
          "preheat tidak cocok di sini karena preheat menunjuk ide berbeda, dan untuk \"toss a salad\" pakai toss.",
          "grate tidak cocok di sini karena grate menunjuk ide berbeda, dan untuk \"toss a salad\" pakai toss."
        ],
        "tr": [
          "Doğru. toss, \"toss a salad\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "freeze burada uymaz çünkü freeze farklı bir şeyi anlatır, \"toss a salad\" için toss gerekir.",
          "preheat burada uymaz çünkü preheat farklı bir şeyi anlatır, \"toss a salad\" için toss gerekir.",
          "grate burada uymaz çünkü grate farklı bir şeyi anlatır, \"toss a salad\" için toss gerekir."
        ],
        "pl": [
          "Dobrze. toss pasuje do \"toss a salad\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "freeze tutaj nie pasuje, bo freeze wskazuje inną rzecz lub czynność, a do \"toss a salad\" wybierz toss.",
          "preheat tutaj nie pasuje, bo preheat wskazuje inną rzecz lub czynność, a do \"toss a salad\" wybierz toss.",
          "grate tutaj nie pasuje, bo grate wskazuje inną rzecz lub czynność, a do \"toss a salad\" wybierz toss."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-087",
      "type": "mcq",
      "prompt": "Which English verb fits “flip a pancake”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «перевернуть блин»?",
        "uk": "Яке англійське дієслово потрібне для \"flip a pancake\"?",
        "es": "¿Qué verbo inglés se usa para \"flip a pancake\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"flip a pancake\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"flip a pancake\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"flip a pancake\"?",
        "tr": "\"flip a pancake\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"flip a pancake\"?"
      },
      "choices": [
        "flip",
        "whisk",
        "measure",
        "marinate"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen or recipe verb for flip a pancake.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C87",
        "K87"
      ],
      "choiceRationales": [
        "flip is the only correct answer for flip a pancake.",
        "whisk is plausible kitchen vocabulary but does not mean flip a pancake.",
        "measure is plausible kitchen vocabulary but does not mean flip a pancake.",
        "marinate is plausible kitchen vocabulary but does not mean flip a pancake."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! flip значит перевернуть. Блин меняет сторону на сковороде одним быстрым движением.",
          "whisk — взбивать венчиком. Тесто можно whisk раньше, но готовый блин на сковороде flip.",
          "measure — отмерять количество. Это про граммы и чашки, а не про переворот блина.",
          "marinate — мариновать. Блины не маринуют; их переворачивают: flip."
        ],
        "uk": [
          "Бінго! flip точно відповідає ідеї \"flip a pancake\". Це потрібне англійське слово для цього значення.",
          "whisk тут не підходить, бо whisk називає інший предмет або дію, а для \"flip a pancake\" вибирай flip.",
          "measure тут не підходить, бо measure називає інший предмет або дію, а для \"flip a pancake\" вибирай flip.",
          "marinate тут не підходить, бо marinate називає інший предмет або дію, а для \"flip a pancake\" вибирай flip."
        ],
        "es": [
          "Bien. flip encaja con \"flip a pancake\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "whisk no sirve aquí porque whisk apunta a otra cosa de cocina, y para \"flip a pancake\" elige flip.",
          "measure no sirve aquí porque measure apunta a otra cosa de cocina, y para \"flip a pancake\" elige flip.",
          "marinate no sirve aquí porque marinate apunta a otra cosa de cocina, y para \"flip a pancake\" elige flip."
        ],
        "pt-BR": [
          "Certo. flip combina com \"flip a pancake\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "whisk não serve aqui porque whisk aponta para outra ideia, e para \"flip a pancake\" use flip.",
          "measure não serve aqui porque measure aponta para outra ideia, e para \"flip a pancake\" use flip.",
          "marinate não serve aqui porque marinate aponta para outra ideia, e para \"flip a pancake\" use flip."
        ],
        "vi": [
          "Đúng. flip khớp với \"flip a pancake\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "whisk không hợp ở đây vì whisk nói về ý khác, còn với \"flip a pancake\" dùng flip.",
          "measure không hợp ở đây vì measure nói về ý khác, còn với \"flip a pancake\" dùng flip.",
          "marinate không hợp ở đây vì marinate nói về ý khác, còn với \"flip a pancake\" dùng flip."
        ],
        "id": [
          "Benar. flip cocok dengan \"flip a pancake\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "whisk tidak cocok di sini karena whisk menunjuk ide berbeda, dan untuk \"flip a pancake\" pakai flip.",
          "measure tidak cocok di sini karena measure menunjuk ide berbeda, dan untuk \"flip a pancake\" pakai flip.",
          "marinate tidak cocok di sini karena marinate menunjuk ide berbeda, dan untuk \"flip a pancake\" pakai flip."
        ],
        "tr": [
          "Doğru. flip, \"flip a pancake\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "whisk burada uymaz çünkü whisk farklı bir şeyi anlatır, \"flip a pancake\" için flip gerekir.",
          "measure burada uymaz çünkü measure farklı bir şeyi anlatır, \"flip a pancake\" için flip gerekir.",
          "marinate burada uymaz çünkü marinate farklı bir şeyi anlatır, \"flip a pancake\" için flip gerekir."
        ],
        "pl": [
          "Dobrze. flip pasuje do \"flip a pancake\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "whisk tutaj nie pasuje, bo whisk wskazuje inną rzecz lub czynność, a do \"flip a pancake\" wybierz flip.",
          "measure tutaj nie pasuje, bo measure wskazuje inną rzecz lub czynność, a do \"flip a pancake\" wybierz flip.",
          "marinate tutaj nie pasuje, bo marinate wskazuje inną rzecz lub czynność, a do \"flip a pancake\" wybierz flip."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-088",
      "type": "mcq",
      "prompt": "Which English verb fits “crumble cheese”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «раскрошить сыр»?",
        "uk": "Яке англійське дієслово потрібне для \"crumble cheese\"?",
        "es": "¿Qué verbo inglés se usa para \"crumble cheese\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"crumble cheese\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"crumble cheese\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"crumble cheese\"?",
        "tr": "\"crumble cheese\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"crumble cheese\"?"
      },
      "choices": [
        "crumble",
        "melt",
        "serve",
        "rinse"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen or recipe verb for crumble cheese.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C88",
        "K88"
      ],
      "choiceRationales": [
        "crumble is the only correct answer for crumble cheese.",
        "melt is plausible kitchen vocabulary but does not mean crumble cheese.",
        "serve is plausible kitchen vocabulary but does not mean crumble cheese.",
        "rinse is plausible kitchen vocabulary but does not mean crumble cheese."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! crumble значит раскрошить. Сыр распадается на маленькие неровные кусочки.",
          "melt — растопить. Если сыр становится жидким от тепла, это melt; если ломается крошкой, это crumble.",
          "serve — подавать еду. Сыр можно serve позже, но действие “раскрошить” — crumble.",
          "rinse — ополоснуть водой. Сыр водой не крошат; для маленьких кусочков нужен crumble."
        ],
        "uk": [
          "Бінго! crumble точно відповідає ідеї \"crumble cheese\". Це потрібне англійське слово для цього значення.",
          "melt тут не підходить, бо melt називає інший предмет або дію, а для \"crumble cheese\" вибирай crumble.",
          "serve тут не підходить, бо serve називає інший предмет або дію, а для \"crumble cheese\" вибирай crumble.",
          "rinse тут не підходить, бо rinse називає інший предмет або дію, а для \"crumble cheese\" вибирай crumble."
        ],
        "es": [
          "Bien. crumble encaja con \"crumble cheese\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "melt no sirve aquí porque melt apunta a otra cosa de cocina, y para \"crumble cheese\" elige crumble.",
          "serve no sirve aquí porque serve apunta a otra cosa de cocina, y para \"crumble cheese\" elige crumble.",
          "rinse no sirve aquí porque rinse apunta a otra cosa de cocina, y para \"crumble cheese\" elige crumble."
        ],
        "pt-BR": [
          "Certo. crumble combina com \"crumble cheese\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "melt não serve aqui porque melt aponta para outra ideia, e para \"crumble cheese\" use crumble.",
          "serve não serve aqui porque serve aponta para outra ideia, e para \"crumble cheese\" use crumble.",
          "rinse não serve aqui porque rinse aponta para outra ideia, e para \"crumble cheese\" use crumble."
        ],
        "vi": [
          "Đúng. crumble khớp với \"crumble cheese\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "melt không hợp ở đây vì melt nói về ý khác, còn với \"crumble cheese\" dùng crumble.",
          "serve không hợp ở đây vì serve nói về ý khác, còn với \"crumble cheese\" dùng crumble.",
          "rinse không hợp ở đây vì rinse nói về ý khác, còn với \"crumble cheese\" dùng crumble."
        ],
        "id": [
          "Benar. crumble cocok dengan \"crumble cheese\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "melt tidak cocok di sini karena melt menunjuk ide berbeda, dan untuk \"crumble cheese\" pakai crumble.",
          "serve tidak cocok di sini karena serve menunjuk ide berbeda, dan untuk \"crumble cheese\" pakai crumble.",
          "rinse tidak cocok di sini karena rinse menunjuk ide berbeda, dan untuk \"crumble cheese\" pakai crumble."
        ],
        "tr": [
          "Doğru. crumble, \"crumble cheese\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "melt burada uymaz çünkü melt farklı bir şeyi anlatır, \"crumble cheese\" için crumble gerekir.",
          "serve burada uymaz çünkü serve farklı bir şeyi anlatır, \"crumble cheese\" için crumble gerekir.",
          "rinse burada uymaz çünkü rinse farklı bir şeyi anlatır, \"crumble cheese\" için crumble gerekir."
        ],
        "pl": [
          "Dobrze. crumble pasuje do \"crumble cheese\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "melt tutaj nie pasuje, bo melt wskazuje inną rzecz lub czynność, a do \"crumble cheese\" wybierz crumble.",
          "serve tutaj nie pasuje, bo serve wskazuje inną rzecz lub czynność, a do \"crumble cheese\" wybierz crumble.",
          "rinse tutaj nie pasuje, bo rinse wskazuje inną rzecz lub czynność, a do \"crumble cheese\" wybierz crumble."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-089",
      "type": "mcq",
      "prompt": "Which English verb fits “carve roasted turkey”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «нарезать жареную индейку»?",
        "uk": "Яке англійське дієслово потрібне для \"carve roasted turkey\"?",
        "es": "¿Qué verbo inglés se usa para \"carve roasted turkey\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"carve roasted turkey\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"carve roasted turkey\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"carve roasted turkey\"?",
        "tr": "\"carve roasted turkey\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"carve roasted turkey\"?"
      },
      "choices": [
        "carve",
        "dice",
        "stir",
        "sprinkle"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen or recipe verb for carve roasted turkey.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C89",
        "K89"
      ],
      "choiceRationales": [
        "carve is the only correct answer for carve roasted turkey.",
        "dice is plausible kitchen vocabulary but does not mean carve roasted turkey.",
        "stir is plausible kitchen vocabulary but does not mean carve roasted turkey.",
        "sprinkle is plausible kitchen vocabulary but does not mean carve roasted turkey."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! carve значит нарезать большое готовое мясо на порции. Так режут индейку, курицу или roast.",
          "dice — нарезать кубиками. Индейку на столе обычно режут порциями, не кубиками; нужен carve.",
          "stir — помешивать. Готовую индейку не мешают ложкой; её аккуратно нарезают: carve.",
          "sprinkle — посыпать сверху. Это про соль, сахар или зелень, а мясо на порции режут carve."
        ],
        "uk": [
          "Бінго! carve точно відповідає ідеї \"carve roasted turkey\". Це потрібне англійське слово для цього значення.",
          "dice тут не підходить, бо dice називає інший предмет або дію, а для \"carve roasted turkey\" вибирай carve.",
          "stir тут не підходить, бо stir називає інший предмет або дію, а для \"carve roasted turkey\" вибирай carve.",
          "sprinkle тут не підходить, бо sprinkle називає інший предмет або дію, а для \"carve roasted turkey\" вибирай carve."
        ],
        "es": [
          "Bien. carve encaja con \"carve roasted turkey\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "dice no sirve aquí porque dice apunta a otra cosa de cocina, y para \"carve roasted turkey\" elige carve.",
          "stir no sirve aquí porque stir apunta a otra cosa de cocina, y para \"carve roasted turkey\" elige carve.",
          "sprinkle no sirve aquí porque sprinkle apunta a otra cosa de cocina, y para \"carve roasted turkey\" elige carve."
        ],
        "pt-BR": [
          "Certo. carve combina com \"carve roasted turkey\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "dice não serve aqui porque dice aponta para outra ideia, e para \"carve roasted turkey\" use carve.",
          "stir não serve aqui porque stir aponta para outra ideia, e para \"carve roasted turkey\" use carve.",
          "sprinkle não serve aqui porque sprinkle aponta para outra ideia, e para \"carve roasted turkey\" use carve."
        ],
        "vi": [
          "Đúng. carve khớp với \"carve roasted turkey\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "dice không hợp ở đây vì dice nói về ý khác, còn với \"carve roasted turkey\" dùng carve.",
          "stir không hợp ở đây vì stir nói về ý khác, còn với \"carve roasted turkey\" dùng carve.",
          "sprinkle không hợp ở đây vì sprinkle nói về ý khác, còn với \"carve roasted turkey\" dùng carve."
        ],
        "id": [
          "Benar. carve cocok dengan \"carve roasted turkey\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "dice tidak cocok di sini karena dice menunjuk ide berbeda, dan untuk \"carve roasted turkey\" pakai carve.",
          "stir tidak cocok di sini karena stir menunjuk ide berbeda, dan untuk \"carve roasted turkey\" pakai carve.",
          "sprinkle tidak cocok di sini karena sprinkle menunjuk ide berbeda, dan untuk \"carve roasted turkey\" pakai carve."
        ],
        "tr": [
          "Doğru. carve, \"carve roasted turkey\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "dice burada uymaz çünkü dice farklı bir şeyi anlatır, \"carve roasted turkey\" için carve gerekir.",
          "stir burada uymaz çünkü stir farklı bir şeyi anlatır, \"carve roasted turkey\" için carve gerekir.",
          "sprinkle burada uymaz çünkü sprinkle farklı bir şeyi anlatır, \"carve roasted turkey\" için carve gerekir."
        ],
        "pl": [
          "Dobrze. carve pasuje do \"carve roasted turkey\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "dice tutaj nie pasuje, bo dice wskazuje inną rzecz lub czynność, a do \"carve roasted turkey\" wybierz carve.",
          "stir tutaj nie pasuje, bo stir wskazuje inną rzecz lub czynność, a do \"carve roasted turkey\" wybierz carve.",
          "sprinkle tutaj nie pasuje, bo sprinkle wskazuje inną rzecz lub czynność, a do \"carve roasted turkey\" wybierz carve."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-090",
      "type": "mcq",
      "prompt": "Which English verb fits “cook under strong top heat”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «готовить под верхним жаром»?",
        "uk": "Яке англійське дієслово потрібне для \"cook under strong top heat\"?",
        "es": "¿Qué verbo inglés se usa para \"cook under strong top heat\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"cook under strong top heat\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"cook under strong top heat\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"cook under strong top heat\"?",
        "tr": "\"cook under strong top heat\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"cook under strong top heat\"?"
      },
      "choices": [
        "broil",
        "steam",
        "simmer",
        "wash"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen or recipe verb for cook under strong top heat.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C90",
        "K90"
      ],
      "choiceRationales": [
        "broil is the only correct answer for cook under strong top heat.",
        "steam is plausible kitchen vocabulary but does not mean cook under strong top heat.",
        "simmer is plausible kitchen vocabulary but does not mean cook under strong top heat.",
        "wash is plausible kitchen vocabulary but does not mean cook under strong top heat."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! broil значит готовить под сильным верхним жаром. Еда быстро подрумянивается сверху.",
          "steam — готовить на пару. Там работает пар, а при broil еду греет сильный жар сверху.",
          "simmer — томить на слабом огне. Broil наоборот резкий и горячий, не тихое пузырение.",
          "wash — мыть водой. Это очищение, а не готовка под верхним жаром; нужен broil."
        ],
        "uk": [
          "Бінго! broil точно відповідає ідеї \"cook under strong top heat\". Це потрібне англійське слово для цього значення.",
          "steam тут не підходить, бо steam називає інший предмет або дію, а для \"cook under strong top heat\" вибирай broil.",
          "simmer тут не підходить, бо simmer називає інший предмет або дію, а для \"cook under strong top heat\" вибирай broil.",
          "wash тут не підходить, бо wash називає інший предмет або дію, а для \"cook under strong top heat\" вибирай broil."
        ],
        "es": [
          "Bien. broil encaja con \"cook under strong top heat\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "steam no sirve aquí porque steam apunta a otra cosa de cocina, y para \"cook under strong top heat\" elige broil.",
          "simmer no sirve aquí porque simmer apunta a otra cosa de cocina, y para \"cook under strong top heat\" elige broil.",
          "wash no sirve aquí porque wash apunta a otra cosa de cocina, y para \"cook under strong top heat\" elige broil."
        ],
        "pt-BR": [
          "Certo. broil combina com \"cook under strong top heat\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "steam não serve aqui porque steam aponta para outra ideia, e para \"cook under strong top heat\" use broil.",
          "simmer não serve aqui porque simmer aponta para outra ideia, e para \"cook under strong top heat\" use broil.",
          "wash não serve aqui porque wash aponta para outra ideia, e para \"cook under strong top heat\" use broil."
        ],
        "vi": [
          "Đúng. broil khớp với \"cook under strong top heat\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "steam không hợp ở đây vì steam nói về ý khác, còn với \"cook under strong top heat\" dùng broil.",
          "simmer không hợp ở đây vì simmer nói về ý khác, còn với \"cook under strong top heat\" dùng broil.",
          "wash không hợp ở đây vì wash nói về ý khác, còn với \"cook under strong top heat\" dùng broil."
        ],
        "id": [
          "Benar. broil cocok dengan \"cook under strong top heat\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "steam tidak cocok di sini karena steam menunjuk ide berbeda, dan untuk \"cook under strong top heat\" pakai broil.",
          "simmer tidak cocok di sini karena simmer menunjuk ide berbeda, dan untuk \"cook under strong top heat\" pakai broil.",
          "wash tidak cocok di sini karena wash menunjuk ide berbeda, dan untuk \"cook under strong top heat\" pakai broil."
        ],
        "tr": [
          "Doğru. broil, \"cook under strong top heat\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "steam burada uymaz çünkü steam farklı bir şeyi anlatır, \"cook under strong top heat\" için broil gerekir.",
          "simmer burada uymaz çünkü simmer farklı bir şeyi anlatır, \"cook under strong top heat\" için broil gerekir.",
          "wash burada uymaz çünkü wash farklı bir şeyi anlatır, \"cook under strong top heat\" için broil gerekir."
        ],
        "pl": [
          "Dobrze. broil pasuje do \"cook under strong top heat\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "steam tutaj nie pasuje, bo steam wskazuje inną rzecz lub czynność, a do \"cook under strong top heat\" wybierz broil.",
          "simmer tutaj nie pasuje, bo simmer wskazuje inną rzecz lub czynność, a do \"cook under strong top heat\" wybierz broil.",
          "wash tutaj nie pasuje, bo wash wskazuje inną rzecz lub czynność, a do \"cook under strong top heat\" wybierz broil."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-091",
      "type": "mcq",
      "prompt": "Which English phrase means “открывалка для консервов”?",
      "localizedPrompts": {
        "ru": "Как по-английски «открывалка для консервов»?",
        "uk": "Яке англійське слово або фраза означає \"a tool for opening metal food cans\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a tool for opening metal food cans\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a tool for opening metal food cans\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a tool for opening metal food cans\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a tool for opening metal food cans\"?",
        "tr": "\"a tool for opening metal food cans\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a tool for opening metal food cans\"?"
      },
      "choices": [
        "can opener",
        "bottle opener",
        "corkscrew",
        "jar opener"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a tool for opening metal food cans.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C91",
        "K91"
      ],
      "choiceRationales": [
        "can opener is the only correct answer for a tool for opening metal food cans.",
        "bottle opener is plausible kitchen vocabulary but does not mean a tool for opening metal food cans.",
        "corkscrew is plausible kitchen vocabulary but does not mean a tool for opening metal food cans.",
        "jar opener is plausible kitchen vocabulary but does not mean a tool for opening metal food cans."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! can opener — открывалка для консервов. Ею открывают металлические банки с фасолью, тунцом или кукурузой.",
          "bottle opener — открывалка для бутылок. Она работает с крышкой бутылки, а консервную банку открывает can opener.",
          "corkscrew — штопор. Он вытаскивает пробку, но не режет крышку консервной банки.",
          "jar opener — открывалка для стеклянных банок с крышкой. Для консервов нужен can opener."
        ],
        "uk": [
          "Бінго! can opener точно відповідає ідеї \"открывалка для консервов\". Це потрібне англійське слово для цього значення.",
          "bottle opener тут не підходить, бо bottle opener називає інший предмет або дію, а для \"открывалка для консервов\" вибирай can opener.",
          "corkscrew тут не підходить, бо corkscrew називає інший предмет або дію, а для \"открывалка для консервов\" вибирай can opener.",
          "jar opener тут не підходить, бо jar opener називає інший предмет або дію, а для \"открывалка для консервов\" вибирай can opener."
        ],
        "es": [
          "Bien. can opener encaja con \"открывалка для консервов\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "bottle opener no sirve aquí porque bottle opener apunta a otra cosa de cocina, y para \"открывалка для консервов\" elige can opener.",
          "corkscrew no sirve aquí porque corkscrew apunta a otra cosa de cocina, y para \"открывалка для консервов\" elige can opener.",
          "jar opener no sirve aquí porque jar opener apunta a otra cosa de cocina, y para \"открывалка для консервов\" elige can opener."
        ],
        "pt-BR": [
          "Certo. can opener combina com \"открывалка для консервов\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "bottle opener não serve aqui porque bottle opener aponta para outra ideia, e para \"открывалка для консервов\" use can opener.",
          "corkscrew não serve aqui porque corkscrew aponta para outra ideia, e para \"открывалка для консервов\" use can opener.",
          "jar opener não serve aqui porque jar opener aponta para outra ideia, e para \"открывалка для консервов\" use can opener."
        ],
        "vi": [
          "Đúng. can opener khớp với \"открывалка для консервов\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "bottle opener không hợp ở đây vì bottle opener nói về ý khác, còn với \"открывалка для консервов\" dùng can opener.",
          "corkscrew không hợp ở đây vì corkscrew nói về ý khác, còn với \"открывалка для консервов\" dùng can opener.",
          "jar opener không hợp ở đây vì jar opener nói về ý khác, còn với \"открывалка для консервов\" dùng can opener."
        ],
        "id": [
          "Benar. can opener cocok dengan \"открывалка для консервов\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "bottle opener tidak cocok di sini karena bottle opener menunjuk ide berbeda, dan untuk \"открывалка для консервов\" pakai can opener.",
          "corkscrew tidak cocok di sini karena corkscrew menunjuk ide berbeda, dan untuk \"открывалка для консервов\" pakai can opener.",
          "jar opener tidak cocok di sini karena jar opener menunjuk ide berbeda, dan untuk \"открывалка для консервов\" pakai can opener."
        ],
        "tr": [
          "Doğru. can opener, \"открывалка для консервов\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "bottle opener burada uymaz çünkü bottle opener farklı bir şeyi anlatır, \"открывалка для консервов\" için can opener gerekir.",
          "corkscrew burada uymaz çünkü corkscrew farklı bir şeyi anlatır, \"открывалка для консервов\" için can opener gerekir.",
          "jar opener burada uymaz çünkü jar opener farklı bir şeyi anlatır, \"открывалка для консервов\" için can opener gerekir."
        ],
        "pl": [
          "Dobrze. can opener pasuje do \"открывалка для консервов\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "bottle opener tutaj nie pasuje, bo bottle opener wskazuje inną rzecz lub czynność, a do \"открывалка для консервов\" wybierz can opener.",
          "corkscrew tutaj nie pasuje, bo corkscrew wskazuje inną rzecz lub czynność, a do \"открывалка для консервов\" wybierz can opener.",
          "jar opener tutaj nie pasuje, bo jar opener wskazuje inną rzecz lub czynność, a do \"открывалка для консервов\" wybierz can opener."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-092",
      "type": "mcq",
      "prompt": "Which English phrase means “открывалка для бутылок”?",
      "localizedPrompts": {
        "ru": "Как по-английски «открывалка для бутылок»?",
        "uk": "Яке англійське слово або фраза означає \"a tool for removing a metal bottle cap\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a tool for removing a metal bottle cap\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a tool for removing a metal bottle cap\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a tool for removing a metal bottle cap\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a tool for removing a metal bottle cap\"?",
        "tr": "\"a tool for removing a metal bottle cap\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a tool for removing a metal bottle cap\"?"
      },
      "choices": [
        "bottle opener",
        "can opener",
        "garlic press",
        "zester"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a tool for removing a metal bottle cap.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C92",
        "K92"
      ],
      "choiceRationales": [
        "bottle opener is the only correct answer for a tool for removing a metal bottle cap.",
        "can opener is plausible kitchen vocabulary but does not mean a tool for removing a metal bottle cap.",
        "garlic press is plausible kitchen vocabulary but does not mean a tool for removing a metal bottle cap.",
        "zester is plausible kitchen vocabulary but does not mean a tool for removing a metal bottle cap."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! bottle opener — открывалка для бутылок. Ею снимают металлическую крышку с бутылки.",
          "can opener — открывалка для консервов. Она нужна для банки, а бутылочную крышку снимает bottle opener.",
          "garlic press — пресс для чеснока. Он давит чеснок, но бутылку не открывает.",
          "zester — тёрка для цедры. Она снимает тонкую кожуру цитруса, а крышку бутылки — bottle opener."
        ],
        "uk": [
          "Бінго! bottle opener точно відповідає ідеї \"открывалка для бутылок\". Це потрібне англійське слово для цього значення.",
          "can opener тут не підходить, бо can opener називає інший предмет або дію, а для \"открывалка для бутылок\" вибирай bottle opener.",
          "garlic press тут не підходить, бо garlic press називає інший предмет або дію, а для \"открывалка для бутылок\" вибирай bottle opener.",
          "zester тут не підходить, бо zester називає інший предмет або дію, а для \"открывалка для бутылок\" вибирай bottle opener."
        ],
        "es": [
          "Bien. bottle opener encaja con \"открывалка для бутылок\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "can opener no sirve aquí porque can opener apunta a otra cosa de cocina, y para \"открывалка для бутылок\" elige bottle opener.",
          "garlic press no sirve aquí porque garlic press apunta a otra cosa de cocina, y para \"открывалка для бутылок\" elige bottle opener.",
          "zester no sirve aquí porque zester apunta a otra cosa de cocina, y para \"открывалка для бутылок\" elige bottle opener."
        ],
        "pt-BR": [
          "Certo. bottle opener combina com \"открывалка для бутылок\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "can opener não serve aqui porque can opener aponta para outra ideia, e para \"открывалка для бутылок\" use bottle opener.",
          "garlic press não serve aqui porque garlic press aponta para outra ideia, e para \"открывалка для бутылок\" use bottle opener.",
          "zester não serve aqui porque zester aponta para outra ideia, e para \"открывалка для бутылок\" use bottle opener."
        ],
        "vi": [
          "Đúng. bottle opener khớp với \"открывалка для бутылок\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "can opener không hợp ở đây vì can opener nói về ý khác, còn với \"открывалка для бутылок\" dùng bottle opener.",
          "garlic press không hợp ở đây vì garlic press nói về ý khác, còn với \"открывалка для бутылок\" dùng bottle opener.",
          "zester không hợp ở đây vì zester nói về ý khác, còn với \"открывалка для бутылок\" dùng bottle opener."
        ],
        "id": [
          "Benar. bottle opener cocok dengan \"открывалка для бутылок\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "can opener tidak cocok di sini karena can opener menunjuk ide berbeda, dan untuk \"открывалка для бутылок\" pakai bottle opener.",
          "garlic press tidak cocok di sini karena garlic press menunjuk ide berbeda, dan untuk \"открывалка для бутылок\" pakai bottle opener.",
          "zester tidak cocok di sini karena zester menunjuk ide berbeda, dan untuk \"открывалка для бутылок\" pakai bottle opener."
        ],
        "tr": [
          "Doğru. bottle opener, \"открывалка для бутылок\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "can opener burada uymaz çünkü can opener farklı bir şeyi anlatır, \"открывалка для бутылок\" için bottle opener gerekir.",
          "garlic press burada uymaz çünkü garlic press farklı bir şeyi anlatır, \"открывалка для бутылок\" için bottle opener gerekir.",
          "zester burada uymaz çünkü zester farklı bir şeyi anlatır, \"открывалка для бутылок\" için bottle opener gerekir."
        ],
        "pl": [
          "Dobrze. bottle opener pasuje do \"открывалка для бутылок\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "can opener tutaj nie pasuje, bo can opener wskazuje inną rzecz lub czynność, a do \"открывалка для бутылок\" wybierz bottle opener.",
          "garlic press tutaj nie pasuje, bo garlic press wskazuje inną rzecz lub czynność, a do \"открывалка для бутылок\" wybierz bottle opener.",
          "zester tutaj nie pasuje, bo zester wskazuje inną rzecz lub czynność, a do \"открывалка для бутылок\" wybierz bottle opener."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-093",
      "type": "mcq",
      "prompt": "Which English phrase means “кухонный комбайн”?",
      "localizedPrompts": {
        "ru": "Как по-английски «кухонный комбайн»?",
        "uk": "Яке англійське слово або фраза означає \"a food processor that chops, shreds, or mixes with attachments\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a food processor that chops, shreds, or mixes with attachments\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a food processor that chops, shreds, or mixes with attachments\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a food processor that chops, shreds, or mixes with attachments\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a food processor that chops, shreds, or mixes with attachments\"?",
        "tr": "\"a food processor that chops, shreds, or mixes with attachments\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a food processor that chops, shreds, or mixes with attachments\"?"
      },
      "choices": [
        "food processor",
        "blender",
        "microwave",
        "dishwasher"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a food processor that chops, shreds, or mixes with attachments.",
      "skillTag": "kitchen_appliance_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C93",
        "K93"
      ],
      "choiceRationales": [
        "food processor is the only correct answer for a food processor that chops, shreds, or mixes with attachments.",
        "blender is plausible kitchen vocabulary but does not mean a food processor that chops, shreds, or mixes with attachments.",
        "microwave is plausible kitchen vocabulary but does not mean a food processor that chops, shreds, or mixes with attachments.",
        "dishwasher is plausible kitchen vocabulary but does not mean a food processor that chops, shreds, or mixes with attachments."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! food processor — кухонный комбайн. Он быстро режет, измельчает или смешивает продукты насадками.",
          "blender — блендер. Он хорош для смузи и пюре, но кухонный комбайн шире по задачам: food processor.",
          "microwave — микроволновка. Она разогревает еду, а не режет и измельчает продукты.",
          "dishwasher — посудомоечная машина. Она моет посуду, но не готовит ингредиенты; нужен food processor."
        ],
        "uk": [
          "Бінго! food processor точно відповідає ідеї \"кухонный комбайн\". Це потрібне англійське слово для цього значення.",
          "blender тут не підходить, бо blender називає інший предмет або дію, а для \"кухонный комбайн\" вибирай food processor.",
          "microwave тут не підходить, бо microwave називає інший предмет або дію, а для \"кухонный комбайн\" вибирай food processor.",
          "dishwasher тут не підходить, бо dishwasher називає інший предмет або дію, а для \"кухонный комбайн\" вибирай food processor."
        ],
        "es": [
          "Bien. food processor encaja con \"кухонный комбайн\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "blender no sirve aquí porque blender apunta a otra cosa de cocina, y para \"кухонный комбайн\" elige food processor.",
          "microwave no sirve aquí porque microwave apunta a otra cosa de cocina, y para \"кухонный комбайн\" elige food processor.",
          "dishwasher no sirve aquí porque dishwasher apunta a otra cosa de cocina, y para \"кухонный комбайн\" elige food processor."
        ],
        "pt-BR": [
          "Certo. food processor combina com \"кухонный комбайн\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "blender não serve aqui porque blender aponta para outra ideia, e para \"кухонный комбайн\" use food processor.",
          "microwave não serve aqui porque microwave aponta para outra ideia, e para \"кухонный комбайн\" use food processor.",
          "dishwasher não serve aqui porque dishwasher aponta para outra ideia, e para \"кухонный комбайн\" use food processor."
        ],
        "vi": [
          "Đúng. food processor khớp với \"кухонный комбайн\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "blender không hợp ở đây vì blender nói về ý khác, còn với \"кухонный комбайн\" dùng food processor.",
          "microwave không hợp ở đây vì microwave nói về ý khác, còn với \"кухонный комбайн\" dùng food processor.",
          "dishwasher không hợp ở đây vì dishwasher nói về ý khác, còn với \"кухонный комбайн\" dùng food processor."
        ],
        "id": [
          "Benar. food processor cocok dengan \"кухонный комбайн\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "blender tidak cocok di sini karena blender menunjuk ide berbeda, dan untuk \"кухонный комбайн\" pakai food processor.",
          "microwave tidak cocok di sini karena microwave menunjuk ide berbeda, dan untuk \"кухонный комбайн\" pakai food processor.",
          "dishwasher tidak cocok di sini karena dishwasher menunjuk ide berbeda, dan untuk \"кухонный комбайн\" pakai food processor."
        ],
        "tr": [
          "Doğru. food processor, \"кухонный комбайн\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "blender burada uymaz çünkü blender farklı bir şeyi anlatır, \"кухонный комбайн\" için food processor gerekir.",
          "microwave burada uymaz çünkü microwave farklı bir şeyi anlatır, \"кухонный комбайн\" için food processor gerekir.",
          "dishwasher burada uymaz çünkü dishwasher farklı bir şeyi anlatır, \"кухонный комбайн\" için food processor gerekir."
        ],
        "pl": [
          "Dobrze. food processor pasuje do \"кухонный комбайн\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "blender tutaj nie pasuje, bo blender wskazuje inną rzecz lub czynność, a do \"кухонный комбайн\" wybierz food processor.",
          "microwave tutaj nie pasuje, bo microwave wskazuje inną rzecz lub czynność, a do \"кухонный комбайн\" wybierz food processor.",
          "dishwasher tutaj nie pasuje, bo dishwasher wskazuje inną rzecz lub czynność, a do \"кухонный комбайн\" wybierz food processor."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-094",
      "type": "mcq",
      "prompt": "Which English word means “сотейник или небольшая кастрюля с ручкой”?",
      "localizedPrompts": {
        "ru": "Как по-английски «сотейник / небольшая кастрюля с ручкой»?",
        "uk": "Яке англійське слово або фраза означає \"a small deep pan with a long handle for sauce or milk\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a small deep pan with a long handle for sauce or milk\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a small deep pan with a long handle for sauce or milk\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a small deep pan with a long handle for sauce or milk\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a small deep pan with a long handle for sauce or milk\"?",
        "tr": "\"a small deep pan with a long handle for sauce or milk\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a small deep pan with a long handle for sauce or milk\"?"
      },
      "choices": [
        "saucepan",
        "wok",
        "casserole dish",
        "mixing bowl"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a small deep pan with a long handle for sauce or milk.",
      "skillTag": "kitchen_container_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C94",
        "K94"
      ],
      "choiceRationales": [
        "saucepan is the only correct answer for a small deep pan with a long handle for sauce or milk.",
        "wok is plausible kitchen vocabulary but does not mean a small deep pan with a long handle for sauce or milk.",
        "casserole dish is plausible kitchen vocabulary but does not mean a small deep pan with a long handle for sauce or milk.",
        "mixing bowl is plausible kitchen vocabulary but does not mean a small deep pan with a long handle for sauce or milk."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! saucepan — небольшая кастрюля с длинной ручкой. В ней удобно греть соус, молоко или кашу.",
          "wok — глубокая круглая сковорода для быстрой жарки. Для соуса в маленькой кастрюле точнее saucepan.",
          "casserole dish — форма для запеканки. Её ставят в духовку, а соус греют в saucepan.",
          "mixing bowl — миска для смешивания. В ней удобно мешать, но на плите используют saucepan."
        ],
        "uk": [
          "Бінго! saucepan точно відповідає ідеї \"сотейник или небольшая кастрюля с ручкой\". Це потрібне англійське слово для цього значення.",
          "wok тут не підходить, бо wok називає інший предмет або дію, а для \"сотейник или небольшая кастрюля с ручкой\" вибирай saucepan.",
          "casserole dish тут не підходить, бо casserole dish називає інший предмет або дію, а для \"сотейник или небольшая кастрюля с ручкой\" вибирай saucepan.",
          "mixing bowl тут не підходить, бо mixing bowl називає інший предмет або дію, а для \"сотейник или небольшая кастрюля с ручкой\" вибирай saucepan."
        ],
        "es": [
          "Bien. saucepan encaja con \"сотейник или небольшая кастрюля с ручкой\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "wok no sirve aquí porque wok apunta a otra cosa de cocina, y para \"сотейник или небольшая кастрюля с ручкой\" elige saucepan.",
          "casserole dish no sirve aquí porque casserole dish apunta a otra cosa de cocina, y para \"сотейник или небольшая кастрюля с ручкой\" elige saucepan.",
          "mixing bowl no sirve aquí porque mixing bowl apunta a otra cosa de cocina, y para \"сотейник или небольшая кастрюля с ручкой\" elige saucepan."
        ],
        "pt-BR": [
          "Certo. saucepan combina com \"сотейник или небольшая кастрюля с ручкой\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "wok não serve aqui porque wok aponta para outra ideia, e para \"сотейник или небольшая кастрюля с ручкой\" use saucepan.",
          "casserole dish não serve aqui porque casserole dish aponta para outra ideia, e para \"сотейник или небольшая кастрюля с ручкой\" use saucepan.",
          "mixing bowl não serve aqui porque mixing bowl aponta para outra ideia, e para \"сотейник или небольшая кастрюля с ручкой\" use saucepan."
        ],
        "vi": [
          "Đúng. saucepan khớp với \"сотейник или небольшая кастрюля с ручкой\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "wok không hợp ở đây vì wok nói về ý khác, còn với \"сотейник или небольшая кастрюля с ручкой\" dùng saucepan.",
          "casserole dish không hợp ở đây vì casserole dish nói về ý khác, còn với \"сотейник или небольшая кастрюля с ручкой\" dùng saucepan.",
          "mixing bowl không hợp ở đây vì mixing bowl nói về ý khác, còn với \"сотейник или небольшая кастрюля с ручкой\" dùng saucepan."
        ],
        "id": [
          "Benar. saucepan cocok dengan \"сотейник или небольшая кастрюля с ручкой\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "wok tidak cocok di sini karena wok menunjuk ide berbeda, dan untuk \"сотейник или небольшая кастрюля с ручкой\" pakai saucepan.",
          "casserole dish tidak cocok di sini karena casserole dish menunjuk ide berbeda, dan untuk \"сотейник или небольшая кастрюля с ручкой\" pakai saucepan.",
          "mixing bowl tidak cocok di sini karena mixing bowl menunjuk ide berbeda, dan untuk \"сотейник или небольшая кастрюля с ручкой\" pakai saucepan."
        ],
        "tr": [
          "Doğru. saucepan, \"сотейник или небольшая кастрюля с ручкой\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "wok burada uymaz çünkü wok farklı bir şeyi anlatır, \"сотейник или небольшая кастрюля с ручкой\" için saucepan gerekir.",
          "casserole dish burada uymaz çünkü casserole dish farklı bir şeyi anlatır, \"сотейник или небольшая кастрюля с ручкой\" için saucepan gerekir.",
          "mixing bowl burada uymaz çünkü mixing bowl farklı bir şeyi anlatır, \"сотейник или небольшая кастрюля с ручкой\" için saucepan gerekir."
        ],
        "pl": [
          "Dobrze. saucepan pasuje do \"сотейник или небольшая кастрюля с ручкой\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "wok tutaj nie pasuje, bo wok wskazuje inną rzecz lub czynność, a do \"сотейник или небольшая кастрюля с ручкой\" wybierz saucepan.",
          "casserole dish tutaj nie pasuje, bo casserole dish wskazuje inną rzecz lub czynność, a do \"сотейник или небольшая кастрюля с ручкой\" wybierz saucepan.",
          "mixing bowl tutaj nie pasuje, bo mixing bowl wskazuje inną rzecz lub czynność, a do \"сотейник или небольшая кастрюля с ручкой\" wybierz saucepan."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-095",
      "type": "mcq",
      "prompt": "Which English word means “вок”?",
      "localizedPrompts": {
        "ru": "Как по-английски «вок»?",
        "uk": "Яке англійське слово або фраза означає \"a deep round pan used for quick high-heat stir-frying\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a deep round pan used for quick high-heat stir-frying\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a deep round pan used for quick high-heat stir-frying\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a deep round pan used for quick high-heat stir-frying\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a deep round pan used for quick high-heat stir-frying\"?",
        "tr": "\"a deep round pan used for quick high-heat stir-frying\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a deep round pan used for quick high-heat stir-frying\"?"
      },
      "choices": [
        "wok",
        "saucepan",
        "baking tray",
        "pitcher"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a deep round pan used for quick high-heat stir-frying.",
      "skillTag": "kitchen_tool_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C95",
        "K95"
      ],
      "choiceRationales": [
        "wok is the only correct answer for a deep round pan used for quick high-heat stir-frying.",
        "saucepan is plausible kitchen vocabulary but does not mean a deep round pan used for quick high-heat stir-frying.",
        "baking tray is plausible kitchen vocabulary but does not mean a deep round pan used for quick high-heat stir-frying.",
        "pitcher is plausible kitchen vocabulary but does not mean a deep round pan used for quick high-heat stir-frying."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! wok — вок. Это глубокая круглая сковорода для быстрой жарки на сильном огне.",
          "saucepan — маленькая кастрюля с ручкой. Для stir-fry и быстрого жара обычно нужен wok.",
          "baking tray — противень. Он идёт в духовку, а вок работает на плите: wok.",
          "pitcher — кувшин. Из него наливают напитки, но готовят овощи на сильном огне в wok."
        ],
        "uk": [
          "Бінго! wok точно відповідає ідеї \"вок\". Це потрібне англійське слово для цього значення.",
          "saucepan тут не підходить, бо saucepan називає інший предмет або дію, а для \"вок\" вибирай wok.",
          "baking tray тут не підходить, бо baking tray називає інший предмет або дію, а для \"вок\" вибирай wok.",
          "pitcher тут не підходить, бо pitcher називає інший предмет або дію, а для \"вок\" вибирай wok."
        ],
        "es": [
          "Bien. wok encaja con \"вок\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "saucepan no sirve aquí porque saucepan apunta a otra cosa de cocina, y para \"вок\" elige wok.",
          "baking tray no sirve aquí porque baking tray apunta a otra cosa de cocina, y para \"вок\" elige wok.",
          "pitcher no sirve aquí porque pitcher apunta a otra cosa de cocina, y para \"вок\" elige wok."
        ],
        "pt-BR": [
          "Certo. wok combina com \"вок\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "saucepan não serve aqui porque saucepan aponta para outra ideia, e para \"вок\" use wok.",
          "baking tray não serve aqui porque baking tray aponta para outra ideia, e para \"вок\" use wok.",
          "pitcher não serve aqui porque pitcher aponta para outra ideia, e para \"вок\" use wok."
        ],
        "vi": [
          "Đúng. wok khớp với \"вок\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "saucepan không hợp ở đây vì saucepan nói về ý khác, còn với \"вок\" dùng wok.",
          "baking tray không hợp ở đây vì baking tray nói về ý khác, còn với \"вок\" dùng wok.",
          "pitcher không hợp ở đây vì pitcher nói về ý khác, còn với \"вок\" dùng wok."
        ],
        "id": [
          "Benar. wok cocok dengan \"вок\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "saucepan tidak cocok di sini karena saucepan menunjuk ide berbeda, dan untuk \"вок\" pakai wok.",
          "baking tray tidak cocok di sini karena baking tray menunjuk ide berbeda, dan untuk \"вок\" pakai wok.",
          "pitcher tidak cocok di sini karena pitcher menunjuk ide berbeda, dan untuk \"вок\" pakai wok."
        ],
        "tr": [
          "Doğru. wok, \"вок\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "saucepan burada uymaz çünkü saucepan farklı bir şeyi anlatır, \"вок\" için wok gerekir.",
          "baking tray burada uymaz çünkü baking tray farklı bir şeyi anlatır, \"вок\" için wok gerekir.",
          "pitcher burada uymaz çünkü pitcher farklı bir şeyi anlatır, \"вок\" için wok gerekir."
        ],
        "pl": [
          "Dobrze. wok pasuje do \"вок\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "saucepan tutaj nie pasuje, bo saucepan wskazuje inną rzecz lub czynność, a do \"вок\" wybierz wok.",
          "baking tray tutaj nie pasuje, bo baking tray wskazuje inną rzecz lub czynność, a do \"вок\" wybierz wok.",
          "pitcher tutaj nie pasuje, bo pitcher wskazuje inną rzecz lub czynność, a do \"вок\" wybierz wok."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-096",
      "type": "mcq",
      "prompt": "Which English phrase means “форма для запеканки”?",
      "localizedPrompts": {
        "ru": "Как по-английски «форма для запеканки»?",
        "uk": "Яке англійське слово або фраза означає \"a dish used for baking a casserole in the oven\"?",
        "es": "¿Qué palabra o frase inglesa significa \"a dish used for baking a casserole in the oven\"?",
        "pt-BR": "Qual palavra ou expressão em inglês significa \"a dish used for baking a casserole in the oven\"?",
        "vi": "Từ hoặc cụm từ tiếng Anh nào nghĩa là \"a dish used for baking a casserole in the oven\"?",
        "id": "Kata atau frasa Inggris mana yang berarti \"a dish used for baking a casserole in the oven\"?",
        "tr": "\"a dish used for baking a casserole in the oven\" için hangi İngilizce kelime veya ifade kullanılır?",
        "pl": "Które angielskie słowo lub wyrażenie oznacza \"a dish used for baking a casserole in the oven\"?"
      },
      "choices": [
        "casserole dish",
        "cutting board",
        "colander",
        "dish rack"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen word or phrase for a dish used for baking a casserole in the oven.",
      "skillTag": "kitchen_container_labels",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C96",
        "K96"
      ],
      "choiceRationales": [
        "casserole dish is the only correct answer for a dish used for baking a casserole in the oven.",
        "cutting board is plausible kitchen vocabulary but does not mean a dish used for baking a casserole in the oven.",
        "colander is plausible kitchen vocabulary but does not mean a dish used for baking a casserole in the oven.",
        "dish rack is plausible kitchen vocabulary but does not mean a dish used for baking a casserole in the oven."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! casserole dish — форма для запеканки. В неё кладут блюдо и ставят запекаться в духовку.",
          "cutting board — разделочная доска. На ней режут продукты, но запеканку готовят в casserole dish.",
          "colander — дуршлаг. Через него сливают воду, а не запекают блюдо.",
          "dish rack — сушилка для посуды. Она держит чистые тарелки, но форма для запеканки — casserole dish."
        ],
        "uk": [
          "Бінго! casserole dish точно відповідає ідеї \"форма для запеканки\". Це потрібне англійське слово для цього значення.",
          "cutting board тут не підходить, бо cutting board називає інший предмет або дію, а для \"форма для запеканки\" вибирай casserole dish.",
          "colander тут не підходить, бо colander називає інший предмет або дію, а для \"форма для запеканки\" вибирай casserole dish.",
          "dish rack тут не підходить, бо dish rack називає інший предмет або дію, а для \"форма для запеканки\" вибирай casserole dish."
        ],
        "es": [
          "Bien. casserole dish encaja con \"форма для запеканки\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "cutting board no sirve aquí porque cutting board apunta a otra cosa de cocina, y para \"форма для запеканки\" elige casserole dish.",
          "colander no sirve aquí porque colander apunta a otra cosa de cocina, y para \"форма для запеканки\" elige casserole dish.",
          "dish rack no sirve aquí porque dish rack apunta a otra cosa de cocina, y para \"форма для запеканки\" elige casserole dish."
        ],
        "pt-BR": [
          "Certo. casserole dish combina com \"форма для запеканки\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "cutting board não serve aqui porque cutting board aponta para outra ideia, e para \"форма для запеканки\" use casserole dish.",
          "colander não serve aqui porque colander aponta para outra ideia, e para \"форма для запеканки\" use casserole dish.",
          "dish rack não serve aqui porque dish rack aponta para outra ideia, e para \"форма для запеканки\" use casserole dish."
        ],
        "vi": [
          "Đúng. casserole dish khớp với \"форма для запеканки\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "cutting board không hợp ở đây vì cutting board nói về ý khác, còn với \"форма для запеканки\" dùng casserole dish.",
          "colander không hợp ở đây vì colander nói về ý khác, còn với \"форма для запеканки\" dùng casserole dish.",
          "dish rack không hợp ở đây vì dish rack nói về ý khác, còn với \"форма для запеканки\" dùng casserole dish."
        ],
        "id": [
          "Benar. casserole dish cocok dengan \"форма для запеканки\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "cutting board tidak cocok di sini karena cutting board menunjuk ide berbeda, dan untuk \"форма для запеканки\" pakai casserole dish.",
          "colander tidak cocok di sini karena colander menunjuk ide berbeda, dan untuk \"форма для запеканки\" pakai casserole dish.",
          "dish rack tidak cocok di sini karena dish rack menunjuk ide berbeda, dan untuk \"форма для запеканки\" pakai casserole dish."
        ],
        "tr": [
          "Doğru. casserole dish, \"форма для запеканки\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "cutting board burada uymaz çünkü cutting board farklı bir şeyi anlatır, \"форма для запеканки\" için casserole dish gerekir.",
          "colander burada uymaz çünkü colander farklı bir şeyi anlatır, \"форма для запеканки\" için casserole dish gerekir.",
          "dish rack burada uymaz çünkü dish rack farklı bir şeyi anlatır, \"форма для запеканки\" için casserole dish gerekir."
        ],
        "pl": [
          "Dobrze. casserole dish pasuje do \"форма для запеканки\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "cutting board tutaj nie pasuje, bo cutting board wskazuje inną rzecz lub czynność, a do \"форма для запеканки\" wybierz casserole dish.",
          "colander tutaj nie pasuje, bo colander wskazuje inną rzecz lub czynność, a do \"форма для запеканки\" wybierz casserole dish.",
          "dish rack tutaj nie pasuje, bo dish rack wskazuje inną rzecz lub czynność, a do \"форма для запеканки\" wybierz casserole dish."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-097",
      "type": "mcq",
      "prompt": "Which English verb fits “sauté vegetables in a pan”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «быстро обжарить овощи на сковороде»?",
        "uk": "Яке англійське дієслово потрібне для \"sauté vegetables in a pan\"?",
        "es": "¿Qué verbo inglés se usa para \"sauté vegetables in a pan\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"sauté vegetables in a pan\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"sauté vegetables in a pan\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"sauté vegetables in a pan\"?",
        "tr": "\"sauté vegetables in a pan\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"sauté vegetables in a pan\"?"
      },
      "choices": [
        "sauté",
        "broil",
        "simmer",
        "blanch"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen or recipe verb for sauté vegetables in a pan.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C97",
        "K97"
      ],
      "choiceRationales": [
        "sauté is the only correct answer for sauté vegetables in a pan.",
        "broil is plausible kitchen vocabulary but does not mean sauté vegetables in a pan.",
        "simmer is plausible kitchen vocabulary but does not mean sauté vegetables in a pan.",
        "blanch is plausible kitchen vocabulary but does not mean sauté vegetables in a pan."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! sauté значит быстро обжарить на сковороде с небольшим количеством масла. Овощи остаются яркими и не варятся.",
          "broil — готовить под сильным верхним жаром. Овощи на сковороде быстро обжаривают глаголом sauté.",
          "simmer — тихо томить на слабом огне. Sauté быстрее и активнее: сковорода, масло и короткое обжаривание.",
          "blanch — быстро ошпарить кипятком и охладить. Для обжарки на сковороде нужен sauté."
        ],
        "uk": [
          "Бінго! sauté точно відповідає ідеї \"sauté vegetables in a pan\". Це потрібне англійське слово для цього значення.",
          "broil тут не підходить, бо broil називає інший предмет або дію, а для \"sauté vegetables in a pan\" вибирай sauté.",
          "simmer тут не підходить, бо simmer називає інший предмет або дію, а для \"sauté vegetables in a pan\" вибирай sauté.",
          "blanch тут не підходить, бо blanch називає інший предмет або дію, а для \"sauté vegetables in a pan\" вибирай sauté."
        ],
        "es": [
          "Bien. sauté encaja con \"sauté vegetables in a pan\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "broil no sirve aquí porque broil apunta a otra cosa de cocina, y para \"sauté vegetables in a pan\" elige sauté.",
          "simmer no sirve aquí porque simmer apunta a otra cosa de cocina, y para \"sauté vegetables in a pan\" elige sauté.",
          "blanch no sirve aquí porque blanch apunta a otra cosa de cocina, y para \"sauté vegetables in a pan\" elige sauté."
        ],
        "pt-BR": [
          "Certo. sauté combina com \"sauté vegetables in a pan\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "broil não serve aqui porque broil aponta para outra ideia, e para \"sauté vegetables in a pan\" use sauté.",
          "simmer não serve aqui porque simmer aponta para outra ideia, e para \"sauté vegetables in a pan\" use sauté.",
          "blanch não serve aqui porque blanch aponta para outra ideia, e para \"sauté vegetables in a pan\" use sauté."
        ],
        "vi": [
          "Đúng. sauté khớp với \"sauté vegetables in a pan\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "broil không hợp ở đây vì broil nói về ý khác, còn với \"sauté vegetables in a pan\" dùng sauté.",
          "simmer không hợp ở đây vì simmer nói về ý khác, còn với \"sauté vegetables in a pan\" dùng sauté.",
          "blanch không hợp ở đây vì blanch nói về ý khác, còn với \"sauté vegetables in a pan\" dùng sauté."
        ],
        "id": [
          "Benar. sauté cocok dengan \"sauté vegetables in a pan\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "broil tidak cocok di sini karena broil menunjuk ide berbeda, dan untuk \"sauté vegetables in a pan\" pakai sauté.",
          "simmer tidak cocok di sini karena simmer menunjuk ide berbeda, dan untuk \"sauté vegetables in a pan\" pakai sauté.",
          "blanch tidak cocok di sini karena blanch menunjuk ide berbeda, dan untuk \"sauté vegetables in a pan\" pakai sauté."
        ],
        "tr": [
          "Doğru. sauté, \"sauté vegetables in a pan\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "broil burada uymaz çünkü broil farklı bir şeyi anlatır, \"sauté vegetables in a pan\" için sauté gerekir.",
          "simmer burada uymaz çünkü simmer farklı bir şeyi anlatır, \"sauté vegetables in a pan\" için sauté gerekir.",
          "blanch burada uymaz çünkü blanch farklı bir şeyi anlatır, \"sauté vegetables in a pan\" için sauté gerekir."
        ],
        "pl": [
          "Dobrze. sauté pasuje do \"sauté vegetables in a pan\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "broil tutaj nie pasuje, bo broil wskazuje inną rzecz lub czynność, a do \"sauté vegetables in a pan\" wybierz sauté.",
          "simmer tutaj nie pasuje, bo simmer wskazuje inną rzecz lub czynność, a do \"sauté vegetables in a pan\" wybierz sauté.",
          "blanch tutaj nie pasuje, bo blanch wskazuje inną rzecz lub czynność, a do \"sauté vegetables in a pan\" wybierz sauté."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-098",
      "type": "mcq",
      "prompt": "Which English verb fits “blanch vegetables”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «бланшировать овощи»?",
        "uk": "Яке англійське дієслово потрібне для \"blanch vegetables\"?",
        "es": "¿Qué verbo inglés se usa para \"blanch vegetables\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"blanch vegetables\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"blanch vegetables\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"blanch vegetables\"?",
        "tr": "\"blanch vegetables\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"blanch vegetables\"?"
      },
      "choices": [
        "blanch",
        "sauté",
        "carve",
        "fold"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen or recipe verb for blanch vegetables.",
      "skillTag": "cooking_action_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C98",
        "K98"
      ],
      "choiceRationales": [
        "blanch is the only correct answer for blanch vegetables.",
        "sauté is plausible kitchen vocabulary but does not mean blanch vegetables.",
        "carve is plausible kitchen vocabulary but does not mean blanch vegetables.",
        "fold is plausible kitchen vocabulary but does not mean blanch vegetables."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! blanch значит быстро опустить овощи в кипяток, а потом часто охладить. Цвет остаётся ярким, а текстура — живой.",
          "sauté — быстро обжарить на сковороде. Blanch работает через кипяток, не через масло.",
          "carve — нарезать готовое мясо на порции. Овощи в кипятке не carve, а blanch.",
          "fold — аккуратно вмешать смесь. Для короткой обработки овощей кипятком нужен blanch."
        ],
        "uk": [
          "Бінго! blanch точно відповідає ідеї \"blanch vegetables\". Це потрібне англійське слово для цього значення.",
          "sauté тут не підходить, бо sauté називає інший предмет або дію, а для \"blanch vegetables\" вибирай blanch.",
          "carve тут не підходить, бо carve називає інший предмет або дію, а для \"blanch vegetables\" вибирай blanch.",
          "fold тут не підходить, бо fold називає інший предмет або дію, а для \"blanch vegetables\" вибирай blanch."
        ],
        "es": [
          "Bien. blanch encaja con \"blanch vegetables\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "sauté no sirve aquí porque sauté apunta a otra cosa de cocina, y para \"blanch vegetables\" elige blanch.",
          "carve no sirve aquí porque carve apunta a otra cosa de cocina, y para \"blanch vegetables\" elige blanch.",
          "fold no sirve aquí porque fold apunta a otra cosa de cocina, y para \"blanch vegetables\" elige blanch."
        ],
        "pt-BR": [
          "Certo. blanch combina com \"blanch vegetables\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "sauté não serve aqui porque sauté aponta para outra ideia, e para \"blanch vegetables\" use blanch.",
          "carve não serve aqui porque carve aponta para outra ideia, e para \"blanch vegetables\" use blanch.",
          "fold não serve aqui porque fold aponta para outra ideia, e para \"blanch vegetables\" use blanch."
        ],
        "vi": [
          "Đúng. blanch khớp với \"blanch vegetables\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "sauté không hợp ở đây vì sauté nói về ý khác, còn với \"blanch vegetables\" dùng blanch.",
          "carve không hợp ở đây vì carve nói về ý khác, còn với \"blanch vegetables\" dùng blanch.",
          "fold không hợp ở đây vì fold nói về ý khác, còn với \"blanch vegetables\" dùng blanch."
        ],
        "id": [
          "Benar. blanch cocok dengan \"blanch vegetables\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "sauté tidak cocok di sini karena sauté menunjuk ide berbeda, dan untuk \"blanch vegetables\" pakai blanch.",
          "carve tidak cocok di sini karena carve menunjuk ide berbeda, dan untuk \"blanch vegetables\" pakai blanch.",
          "fold tidak cocok di sini karena fold menunjuk ide berbeda, dan untuk \"blanch vegetables\" pakai blanch."
        ],
        "tr": [
          "Doğru. blanch, \"blanch vegetables\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "sauté burada uymaz çünkü sauté farklı bir şeyi anlatır, \"blanch vegetables\" için blanch gerekir.",
          "carve burada uymaz çünkü carve farklı bir şeyi anlatır, \"blanch vegetables\" için blanch gerekir.",
          "fold burada uymaz çünkü fold farklı bir şeyi anlatır, \"blanch vegetables\" için blanch gerekir."
        ],
        "pl": [
          "Dobrze. blanch pasuje do \"blanch vegetables\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "sauté tutaj nie pasuje, bo sauté wskazuje inną rzecz lub czynność, a do \"blanch vegetables\" wybierz blanch.",
          "carve tutaj nie pasuje, bo carve wskazuje inną rzecz lub czynność, a do \"blanch vegetables\" wybierz blanch.",
          "fold tutaj nie pasuje, bo fold wskazuje inną rzecz lub czynność, a do \"blanch vegetables\" wybierz blanch."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-099",
      "type": "mcq",
      "prompt": "Which English verb fits “strain sauce”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «процедить соус»?",
        "uk": "Яке англійське дієслово потрібне для \"strain sauce\"?",
        "es": "¿Qué verbo inglés se usa para \"strain sauce\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"strain sauce\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"strain sauce\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"strain sauce\"?",
        "tr": "\"strain sauce\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"strain sauce\"?"
      },
      "choices": [
        "strain",
        "drain",
        "rinse",
        "scrub"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen or recipe verb for strain sauce.",
      "skillTag": "recipe_instruction_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C99",
        "K99"
      ],
      "choiceRationales": [
        "strain is the only correct answer for strain sauce.",
        "drain is plausible kitchen vocabulary but does not mean strain sauce.",
        "rinse is plausible kitchen vocabulary but does not mean strain sauce.",
        "scrub is plausible kitchen vocabulary but does not mean strain sauce."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! strain значит процедить. Соус пропускают через сито, чтобы убрать комочки или кусочки.",
          "drain — слить жидкость, например воду с пасты. Для соуса через сито точнее strain.",
          "rinse — ополоснуть водой. Соус не ополаскивают; его процеживают через сито: strain.",
          "scrub — оттирать грязь. Это действие для сковороды или поверхности, а соус нужно strain."
        ],
        "uk": [
          "Бінго! strain точно відповідає ідеї \"strain sauce\". Це потрібне англійське слово для цього значення.",
          "drain тут не підходить, бо drain називає інший предмет або дію, а для \"strain sauce\" вибирай strain.",
          "rinse тут не підходить, бо rinse називає інший предмет або дію, а для \"strain sauce\" вибирай strain.",
          "scrub тут не підходить, бо scrub називає інший предмет або дію, а для \"strain sauce\" вибирай strain."
        ],
        "es": [
          "Bien. strain encaja con \"strain sauce\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "drain no sirve aquí porque drain apunta a otra cosa de cocina, y para \"strain sauce\" elige strain.",
          "rinse no sirve aquí porque rinse apunta a otra cosa de cocina, y para \"strain sauce\" elige strain.",
          "scrub no sirve aquí porque scrub apunta a otra cosa de cocina, y para \"strain sauce\" elige strain."
        ],
        "pt-BR": [
          "Certo. strain combina com \"strain sauce\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "drain não serve aqui porque drain aponta para outra ideia, e para \"strain sauce\" use strain.",
          "rinse não serve aqui porque rinse aponta para outra ideia, e para \"strain sauce\" use strain.",
          "scrub não serve aqui porque scrub aponta para outra ideia, e para \"strain sauce\" use strain."
        ],
        "vi": [
          "Đúng. strain khớp với \"strain sauce\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "drain không hợp ở đây vì drain nói về ý khác, còn với \"strain sauce\" dùng strain.",
          "rinse không hợp ở đây vì rinse nói về ý khác, còn với \"strain sauce\" dùng strain.",
          "scrub không hợp ở đây vì scrub nói về ý khác, còn với \"strain sauce\" dùng strain."
        ],
        "id": [
          "Benar. strain cocok dengan \"strain sauce\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "drain tidak cocok di sini karena drain menunjuk ide berbeda, dan untuk \"strain sauce\" pakai strain.",
          "rinse tidak cocok di sini karena rinse menunjuk ide berbeda, dan untuk \"strain sauce\" pakai strain.",
          "scrub tidak cocok di sini karena scrub menunjuk ide berbeda, dan untuk \"strain sauce\" pakai strain."
        ],
        "tr": [
          "Doğru. strain, \"strain sauce\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "drain burada uymaz çünkü drain farklı bir şeyi anlatır, \"strain sauce\" için strain gerekir.",
          "rinse burada uymaz çünkü rinse farklı bir şeyi anlatır, \"strain sauce\" için strain gerekir.",
          "scrub burada uymaz çünkü scrub farklı bir şeyi anlatır, \"strain sauce\" için strain gerekir."
        ],
        "pl": [
          "Dobrze. strain pasuje do \"strain sauce\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "drain tutaj nie pasuje, bo drain wskazuje inną rzecz lub czynność, a do \"strain sauce\" wybierz strain.",
          "rinse tutaj nie pasuje, bo rinse wskazuje inną rzecz lub czynność, a do \"strain sauce\" wybierz strain.",
          "scrub tutaj nie pasuje, bo scrub wskazuje inną rzecz lub czynność, a do \"strain sauce\" wybierz strain."
        ]
      }
    },
    {
      "id": "kitchen-and-cooking-100",
      "type": "mcq",
      "prompt": "Which English verb fits “fold egg whites into batter”?",
      "localizedPrompts": {
        "ru": "Какой английский глагол нужен для «аккуратно вмешать белки в тесто»?",
        "uk": "Яке англійське дієслово потрібне для \"fold egg whites into batter\"?",
        "es": "¿Qué verbo inglés se usa para \"fold egg whites into batter\"?",
        "pt-BR": "Qual verbo em inglês se usa para \"fold egg whites into batter\"?",
        "vi": "Động từ tiếng Anh nào dùng cho \"fold egg whites into batter\"?",
        "id": "Kata kerja Inggris mana yang dipakai untuk \"fold egg whites into batter\"?",
        "tr": "\"fold egg whites into batter\" için hangi İngilizce fiil kullanılır?",
        "pl": "Którego angielskiego czasownika używa się przy \"fold egg whites into batter\"?"
      },
      "choices": [
        "fold",
        "whisk",
        "stir",
        "combine"
      ],
      "correctIndex": 0,
      "learningGoal": "Choose the English kitchen or recipe verb for fold egg whites into batter.",
      "skillTag": "recipe_instruction_verbs",
      "sourceIds": [
        "S3",
        "S4"
      ],
      "claimIds": [
        "C100",
        "K100"
      ],
      "choiceRationales": [
        "fold is the only correct answer for fold egg whites into batter.",
        "whisk is plausible kitchen vocabulary but does not mean fold egg whites into batter.",
        "stir is plausible kitchen vocabulary but does not mean fold egg whites into batter.",
        "combine is plausible kitchen vocabulary but does not mean fold egg whites into batter."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Бинго! fold значит аккуратно вмешать. Смесь как бы поднимают и складывают, чтобы не выбить воздух из белков.",
          "whisk — взбивать венчиком. Белки можно whisk раньше, но аккуратно вводят их в тесто глаголом fold.",
          "stir — помешивать. Для нежного теста stir может быть слишком грубым; нужен аккуратный fold.",
          "combine — соединить ингредиенты. Это общее слово, а для воздушных белков точнее fold."
        ],
        "uk": [
          "Бінго! fold точно відповідає ідеї \"fold egg whites into batter\". Це потрібне англійське слово для цього значення.",
          "whisk тут не підходить, бо whisk називає інший предмет або дію, а для \"fold egg whites into batter\" вибирай fold.",
          "stir тут не підходить, бо stir називає інший предмет або дію, а для \"fold egg whites into batter\" вибирай fold.",
          "combine тут не підходить, бо combine називає інший предмет або дію, а для \"fold egg whites into batter\" вибирай fold."
        ],
        "es": [
          "Bien. fold encaja con \"fold egg whites into batter\". Es la palabra inglesa para esa herramienta, objeto o acción.",
          "whisk no sirve aquí porque whisk apunta a otra cosa de cocina, y para \"fold egg whites into batter\" elige fold.",
          "stir no sirve aquí porque stir apunta a otra cosa de cocina, y para \"fold egg whites into batter\" elige fold.",
          "combine no sirve aquí porque combine apunta a otra cosa de cocina, y para \"fold egg whites into batter\" elige fold."
        ],
        "pt-BR": [
          "Certo. fold combina com \"fold egg whites into batter\". Essa é a palavra em inglês para esse objeto, ferramenta ou ação.",
          "whisk não serve aqui porque whisk aponta para outra ideia, e para \"fold egg whites into batter\" use fold.",
          "stir não serve aqui porque stir aponta para outra ideia, e para \"fold egg whites into batter\" use fold.",
          "combine não serve aqui porque combine aponta para outra ideia, e para \"fold egg whites into batter\" use fold."
        ],
        "vi": [
          "Đúng. fold khớp với \"fold egg whites into batter\". Đây là từ tiếng Anh gọi đúng đồ vật, dụng cụ hoặc hành động đó.",
          "whisk không hợp ở đây vì whisk nói về ý khác, còn với \"fold egg whites into batter\" dùng fold.",
          "stir không hợp ở đây vì stir nói về ý khác, còn với \"fold egg whites into batter\" dùng fold.",
          "combine không hợp ở đây vì combine nói về ý khác, còn với \"fold egg whites into batter\" dùng fold."
        ],
        "id": [
          "Benar. fold cocok dengan \"fold egg whites into batter\". Ini kata Inggris yang tepat untuk benda, alat, atau tindakan itu.",
          "whisk tidak cocok di sini karena whisk menunjuk ide berbeda, dan untuk \"fold egg whites into batter\" pakai fold.",
          "stir tidak cocok di sini karena stir menunjuk ide berbeda, dan untuk \"fold egg whites into batter\" pakai fold.",
          "combine tidak cocok di sini karena combine menunjuk ide berbeda, dan untuk \"fold egg whites into batter\" pakai fold."
        ],
        "tr": [
          "Doğru. fold, \"fold egg whites into batter\" fikrine uyar. Bu nesne, araç veya eylem için gereken İngilizce kelime budur.",
          "whisk burada uymaz çünkü whisk farklı bir şeyi anlatır, \"fold egg whites into batter\" için fold gerekir.",
          "stir burada uymaz çünkü stir farklı bir şeyi anlatır, \"fold egg whites into batter\" için fold gerekir.",
          "combine burada uymaz çünkü combine farklı bir şeyi anlatır, \"fold egg whites into batter\" için fold gerekir."
        ],
        "pl": [
          "Dobrze. fold pasuje do \"fold egg whites into batter\". To właściwe angielskie słowo dla tego przedmiotu, narzędzia albo działania.",
          "whisk tutaj nie pasuje, bo whisk wskazuje inną rzecz lub czynność, a do \"fold egg whites into batter\" wybierz fold.",
          "stir tutaj nie pasuje, bo stir wskazuje inną rzecz lub czynność, a do \"fold egg whites into batter\" wybierz fold.",
          "combine tutaj nie pasuje, bo combine wskazuje inną rzecz lub czynność, a do \"fold egg whites into batter\" wybierz fold."
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
    "promptPattern": "Kitchen vocabulary prompts use human translation questions or short phrase prompts, e.g. “Как по-английски «нож»?” and “Как сказать «нарезать лук»?”, never taxonomy labels or meta shells.",
    "explanationPattern": "Each explanation first explains the tapped English word or the exact correct contrast, then adds a short grounded cue from the real prompt/choices. No taxonomy meta, no copied long tails, no invented context, and no sterile dictionary-only copy.",
    "distractorPattern": "Distractors are plausible same-domain words, false friends, wrong part of speech, or wrong context choices with one unambiguous correct answer.",
    "readerRewardPattern": "Each explanation gives a natural memory cue, mini-scene, or useful contrast anchored to the actual prompt and choices. Keep it clear, human, and lightly playful without forcing lifehack labels."
  },
  "visualAssets": {
    "status": "queued",
    "styleBasis": "DALL-E visual kickoff follows existing Phraseman quiz theme cards: premium mobile-game polish, centered kitchen object cluster, bevels, rim light, no bitmap text.",
    "assets": [
      {
        "family": "forest",
        "plaquePrompt": "Generate a forest family topic plaque for the Kitchen and cooking quiz in existing Phraseman style, centered kitchen tools and ingredients, no text.",
        "iconPrompt": "Generate a forest family compact topic icon for the Kitchen and cooking quiz in existing Phraseman style, readable as kitchen tools, no text."
      },
      {
        "family": "dark",
        "plaquePrompt": "Generate a dark family topic plaque for the Kitchen and cooking quiz in existing Phraseman style, centered kitchen tools and ingredients, no text.",
        "iconPrompt": "Generate a dark family compact topic icon for the Kitchen and cooking quiz in existing Phraseman style, readable as kitchen tools, no text."
      },
      {
        "family": "neonGreen",
        "plaquePrompt": "Generate a neonGreen family topic plaque for the Kitchen and cooking quiz in existing Phraseman style, centered kitchen tools and ingredients, no text.",
        "iconPrompt": "Generate a neonGreen family compact topic icon for the Kitchen and cooking quiz in existing Phraseman style, readable as kitchen tools, no text."
      },
      {
        "family": "gold",
        "plaquePrompt": "Generate a gold family topic plaque for the Kitchen and cooking quiz in existing Phraseman style, centered kitchen tools and ingredients, no text.",
        "iconPrompt": "Generate a gold family compact topic icon for the Kitchen and cooking quiz in existing Phraseman style, readable as kitchen tools, no text."
      },
      {
        "family": "coral",
        "plaquePrompt": "Generate a coral family topic plaque for the Kitchen and cooking quiz in existing Phraseman style, centered kitchen tools and ingredients, no text.",
        "iconPrompt": "Generate a coral family compact topic icon for the Kitchen and cooking quiz in existing Phraseman style, readable as kitchen tools, no text."
      },
      {
        "family": "minimalDark",
        "plaquePrompt": "Generate a minimalDark family topic plaque for the Kitchen and cooking quiz in existing Phraseman style, centered kitchen tools and ingredients, no text.",
        "iconPrompt": "Generate a minimalDark family compact topic icon for the Kitchen and cooking quiz in existing Phraseman style, readable as kitchen tools, no text."
      }
    ]
  },
  "releasePolicy": {
    "environment": "production",
    "productionActivation": "approved_by_user",
    "approvedBy": "Phraseman owner",
    "approvedAt": "2026-05-22",
    "approvalSource": "chat instruction: включай в прду",
    "notes": "The user explicitly approved production activation for the content-complete Kitchen and cooking Skyler quiz pack."
  }
};
