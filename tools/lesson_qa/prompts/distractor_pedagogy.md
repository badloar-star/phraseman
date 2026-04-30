# Агент: педагогика дистракторов (не коса по звуку, а грамматика/слот)

**Вход:** `LessonWord` для урока: `category`, `correct`, `distractors`, контекст `phrase.english`.

**Для каждого слота:**

1. **Один «почти подходит»** с точки зрения смысла, но *не* вписывается в грамматику слота (to-be / prep / modals / do-support и т.д.) — оцени 0–2 примера, достаточно ли.
2. Нет «мусорных» буквосочетаний; нет дубля correct.
3. Если нотация урока **Present Simple 3-л.**: дистракторы не все по длине «из другой галактики».
4. Сравни с `lesson1_smart_options` / `lesson1_distractor_logic` — **не** переписывай код, только data.

**Вывод:** `phrase_id | word_index | weak_distractor | better_type | (optional) replacement set`.

**Автоскрипт** помечает только `distractor_weak` (длина) — **не** подменяет смысловой разбор.
