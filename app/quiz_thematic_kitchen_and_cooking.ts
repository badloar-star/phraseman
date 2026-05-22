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
    }
  ],
  "styleProfile": {
    "basedOnExistingPools": true,
    "sampledFiles": [
      "app/quiz_data.ts",
      "app/quiz_source_locale_payloads.ts"
    ],
    "promptPattern": "Kitchen vocabulary prompts use human translation questions or short phrase prompts, e.g. “Как по-английски «нож»?” and “Как сказать «нарезать лук»?”, never taxonomy labels or meta shells.",
    "explanationPattern": "Each explanation first gives the exact language reason, then may add a small grounded joke or concrete image from the real prompt/choices. No invented context and no sterile dictionary-only copy.",
    "distractorPattern": "Distractors are plausible same-domain words, false friends, wrong part of speech, or wrong context choices with one unambiguous correct answer.",
    "readerRewardPattern": "Each explanation gives a natural memory cue, mini-scene, useful contrast, or source-backed fact anchored to the actual prompt and choices. Keep it clear, human, and lightly playful without forcing lifehack labels."
  }
};
