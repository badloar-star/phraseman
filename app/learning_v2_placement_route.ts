// learning_v2_placement_route.ts — путь экрана теста «Не хочу с начала». Литерал пути живёт здесь (в app/learning_v2_*), а не в компонентах:
// сторож learning_v2_visibility_switch_contract не пускает «входы в V2» вне разрешённых мест. Сам экран при скрытом V2 уводит на Главную (isLearningV2Hidden).
export const LEARNING_V2_PLACEMENT_HREF = '/learning_v2_placement';

// зачем: тот же сторож пропускает и путь «Слов» урока (был литералом в SeasonCourseConnected с 0eb910479 — тест видимости V2 краснел на HEAD)
export const LEARNING_V2_LESSON_WORDS_HREF = '/learning_v2_lesson_words';

export default function __RouteShim() { return null; }
