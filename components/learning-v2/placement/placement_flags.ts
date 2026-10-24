// placement_flags.ts — флаг интерфейса теста «Не хочу с начала».
// зачем (координатор 24.10: «за флагом»): экраны собраны по макету, но тест не должен открываться, пока Learning V2 не подключит вопросы и прогресс
// (`registerPlacementBridgeV1`). Включает координатор вместе с Learning V2; пока false — кнопка на обложке ведёт в «Все уроки», как раньше.
export const LEARNING_V2_PLACEMENT_UI_ENABLED = false as boolean;
