# Skyler Item Blueprint

Target: `en`
Category: `kitchen-and-cooking`

This blueprint prepared the first thematic quiz pack. The first 10-item draft
now lives in `pack-001.draft.json` and has passed Skyler gate. Future expansion
should keep the same source, claim, answer_key, locale, and distractor rules.

## Scope

- First pack size: 10-12 MCQ items.
- Difficulty ramp: A1 object labels -> A2 tool/action matching -> B1 context and near-miss choices.
- Source rule: every final item must cite at least two of S1-S4. Social signals prove learner demand only; they cannot prove answers.
- Locale rule: explanations must be adapted for ru, uk, es, pt-BR, vi, id, tr, pl from source notes, not translated directly.

## Candidate Items

| Item id | Level | Skill tag | Item type | Tested point | Likely correct answer | Source IDs | Draft risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| kitchen-and-cooking-001 | A1 | kitchen_object_labels | vocabulary meaning | Category word for tools used in cooking/serving. | utensils | S1, S2 | Keep wording simple; avoid making "utensils" mean every kitchen object. |
| kitchen-and-cooking-002 | A1 | kitchen_object_labels | object-to-use | Object used to cut vegetables or food. | knife | S1, S2 | Distractors must be plausible kitchen objects, not random nouns. |
| kitchen-and-cooking-003 | A1 | kitchen_object_labels | object-to-use | Object commonly used to eat soup or cereal from. | bowl | S2, S3 | Avoid plate/dish ambiguity by anchoring soup/cereal context. |
| kitchen-and-cooking-004 | A1 | kitchen_object_labels | object-to-use | Object used for drinking tea, coffee, or water. | cup | S2, S3 | Mug/cup can overlap; if used, make the tested context unambiguous or avoid the contrast. |
| kitchen-and-cooking-005 | A2 | cooking_action_verbs | phrase completion | Verb for cutting food into small pieces. | chop | S3, S4 | Do not confuse with "slice" unless the prompt specifies shape/thin pieces. |
| kitchen-and-cooking-006 | A2 | cooking_action_verbs | phrase completion | Verb for moving liquid from one container to another. | pour | S3, S4 | Distractors should test action meaning, not grammar. |
| kitchen-and-cooking-007 | A2 | cooking_action_verbs | phrase completion | Verb for moving food around in liquid or a pan with a spoon. | stir | S3, S4 | Avoid "mix" as a competing correct answer unless context excludes it. |
| kitchen-and-cooking-008 | A2 | kitchen_tool_action_match | object-to-action | Tool/pan used for frying food such as eggs. | frying pan | S1, S3, S4 | Regional wording is acceptable if source-backed; avoid "skillet" unless separately sourced. |
| kitchen-and-cooking-009 | A2 | kitchen_tool_action_match | object-to-action | Tool used to open a can/tin. | can opener | S1, S3 | Can/tin regional variation should be handled in explanations, not as a hidden trap. |
| kitchen-and-cooking-010 | B1 | kitchen_context_choice | context choice | Best object in a short cooking instruction. | baking tray | S1, S3 | Only use if source pages clearly support the object; otherwise replace with safer item. |
| kitchen-and-cooking-011 | B1 | kitchen_context_choice | context choice | Best action verb in a short recipe instruction. | boil | S3, S4 | Need context that excludes "cook" and "heat"; answer_key must be explicit. |
| kitchen-and-cooking-012 | B1 | kitchen_near_miss_contrast | mistake contrast | Difference between object label and action verb in a recipe sentence. | source-backed phrase | S2, S3, S4 | Highest ambiguity risk; only draft after item-level source comparison. |

## Rejected Or Delayed Ideas

- cooker/stove contrast: useful, but regional wording can create ambiguity.
- plate/dish contrast: useful, but "dish" can mean object, prepared food, or course.
- cup/mug contrast: useful later, but not ideal for the first pack unless source-backed with clear context.
- recipe facts or cooking advice: out of scope; the pack teaches English vocabulary, not culinary technique.
- idioms with food: interesting, but a separate later category.
