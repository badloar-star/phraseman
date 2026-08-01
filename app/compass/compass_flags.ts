/**
 * Компас — единый шлюз флагов (изоляция и отключаемость).
 *
 * ПРИНЦИП ИЗОЛЯЦИИ (главное правило всей фичи «Компас»):
 * весь код Компаса живёт в `app/compass/` и спрашивает разрешение ТОЛЬКО здесь.
 * Основное приложение НЕ зависит от Компаса. Если главный выключатель
 * `compass_enabled` выключен — каждая проверка ниже возвращает false, любой
 * публичный вход Компаса отдаёт «пусто/null», и приложение работает как раньше.
 *
 * Под-крылья (учёба/экономика/мотивация/память/ИИ-голос) имеют силу ТОЛЬКО когда
 * включён главный флаг — поэтому здесь они композируются через `compassOn()`.
 * Один рубильник гасит всё; точечные рычаги гасят отдельные крылья.
 *
 * Источник значений — общий remote_flags (Firestore-override из админ-«Пульта»,
 * applies живьём через onSnapshot). Компас не держит свой канал конфига —
 * переиспользует существующий, чтобы не плодить инфраструктуру.
 */
import {
  isCompassEnabled,
  isCompassAiVoiceEnabled,
  isCompassDeepDiveEnabled,
  isCompassLessonInviteEnabled,
  isCompassEconomyEnabled,
  isCompassRetentionEnabled,
  isCompassTopicMapEnabled,
} from '../remote_flags';

/** Главный рубильник: включён ли Компас вообще. Любое крыло требует этого. */
export function compassOn(): boolean {
  return isCompassEnabled();
}

/** Крыло «Учёба»: дни-погружения (Компас зовёт в сессию за глубиной). */
export function compassDeepDiveOn(): boolean {
  return compassOn() && isCompassDeepDiveEnabled();
}

/** Lesson invite wing: Compass can suggest a focused lesson while still honoring the main kill-switch. */
export function compassLessonInviteOn(): boolean {
  return compassOn() && isCompassLessonInviteEnabled();
}

/** Крыло «Экономика»: единый вес дня + печать дня. */
export function compassEconomyOn(): boolean {
  return compassOn() && isCompassEconomyEnabled();
}

/** Крыло «Мотивация»: умный возврат, защита серии, умные пуши. */
export function compassRetentionOn(): boolean {
  return compassOn() && isCompassRetentionEnabled();
}

/** Крыло «Память»: карта тем (зеркало прогресса). */
export function compassTopicMapOn(): boolean {
  return compassOn() && isCompassTopicMapEnabled();
}

/** ИИ-голос дня (тёплый комментарий). Выкл → детерминированный fallback по Библии. */
export function compassAiVoiceOn(): boolean {
  return compassOn() && isCompassAiVoiceEnabled();
}
