import { ES_SESSION_01_LOCALIZED_DETAILS } from './es_episode_01_session_01_localized_details_v1';
import { ES_EPISODE_01_SESSION_01_PHRASES } from './es_episode_01_session_01_phrases_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

/**
 * зачем этот файл (владелец, 2026-08-23, правило 8-bis СТАРТ ES.md —
 * играбельный макет): lesson1DistractorChoicesV2 (английский словарь
 * категорий на 514 строк — местоимения to be, притяжательные my/your/his,
 * предлоги at/in/on/to) — единственный путь, которым конвейер сборки макета
 * (authoredDistractorFeedback в session_package_from_shard_v1.ts) объясняет
 * ошибку по умолчанию для любой сессии, кроме 12-15 (у тех свои рукописные
 * episode_01_session_NN_task_feedback_v1.ts). Испанская фраза 'No es así' не
 * входит ни в одну английскую категорию — сборка падала.
 *
 * Разбор для сессии 1 уже написан вручную на всех 9 языках, но лежит в
 * localizedDetails и туда не долетает: V2RejectedAnswer (контракт
 * content_item.ts) хранит только value+reasonCode, без текста. Этот файл —
 * тот же паттерн, что episode_01_session_12/13/14/15_task_feedback_v1.ts:
 * прямой доступ к готовому тексту по неправильному значению, не генерация.
 *
 * Матч фразы по target через id, не по позиции и не по meaning (meaning —
 * перевод, не совпадает с target). Все 15 target сессии 1 уникальны.
 */
function normalize(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('es');
}

export function esEpisode01Session01FeedbackByTarget(
  locale: LearningV2InterfaceLocale,
  target: string,
  wrongValue: string,
): string | undefined {
  const phrase = ES_EPISODE_01_SESSION_01_PHRASES.find(
    (candidate) => normalize(candidate.english) === normalize(target),
  );
  if (!phrase) return undefined;
  // зачем locale==='es' → 'en' (владелец, 2026-08-23, "ОНО ДОЛЖНО БЫТЬ
  // ИЗМЕНЕННО НА EN ПОЛНОЦЕННО"): та же замена, что уже действует в
  // meaningFor() (session_shard_from_source_v1.ts) — ES_SESSION_01_LOCALIZED_DETAILS
  // не хранит ключ 'es' (целевой язык курса не переводится сам на себя),
  // разбор ошибки для интерфейса на 'es' показываем на английском, как и перевод.
  const detailsLocale = locale === 'es' ? 'en' : (locale as Exclude<LearningV2InterfaceLocale, 'es'>);
  const details = ES_SESSION_01_LOCALIZED_DETAILS[phrase.id]?.[detailsLocale];
  if (!details) return undefined;
  const normalizedWrong = normalize(wrongValue);
  for (const word of details.words) {
    const hit = word.distractors.find(
      (distractor) => normalize(distractor.value) === normalizedWrong,
    );
    if (hit) return hit.reason;
  }
  return undefined;
}
