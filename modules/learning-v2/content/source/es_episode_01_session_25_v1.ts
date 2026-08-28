import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_25_GOAL,
  ES_EPISODE_01_SESSION_25_INTRO,
  ES_EPISODE_01_SESSION_25_SUMMARY,
  ES_EPISODE_01_SESSION_25_TITLE,
} from './es_episode_01_session_25_intro_v1';
import { ES_EPISODE_01_SESSION_25_PHRASES } from './es_episode_01_session_25_phrases_v1';
import { ES_EPISODE_01_SESSION_25_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_25_mode_native_v1';
import { LESSON1_ES_SESSION_25_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 25 «Мы» —
 * собранный источник. Открывает Главу 4 «Мы и они».
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 25,
 * kind: 'phrases', teaches: ['first_person_plural'], builtOn: [1, 17],
 * recalls: [1].
 *
 * Новых слов нет — 15 фраз называют somos, связку первого лица
 * МНОЖЕСТВЕННОГО числа: тот же участник разговора («я»), что и soy
 * (сессия 1), но группой. Это сдвиг по ЧИСЛУ, а не по лицу — в отличие
 * от eres (сессия 9) и es (сессия 17), которые сдвигали именно лицо.
 * Somos уже появлялась мимоходом в сессии 14 («Somos de acuerdo»/
 * «No somos de acuerdo», features: first_person_plural как вторичная
 * черта) — эта сессия впервые делает её ГЛАВНЫМ, явным предметом трёх
 * intro-страниц, по тому же прецеденту, что и сессия 18 с caro
 * (использовалось мимоходом раньше собственной фокусной сессии).
 *
 * зачем только así и de acuerdo как признаки при somos: словарная
 * проверка показала, что большинство «неизменяемых» прилагательных
 * сессии 1 (fácil, difícil, importante, igual, verdadero) на самом деле
 * ТРЕБУЮТ окончание -s во множественном числе (fáciles, difíciles,
 * importantes, iguales, verdaderos) — это тема сессии 26 «Много: и
 * признак меняется» (plural_agreement), сюда её пускать нельзя. Verdad
 * и igual как безличные реакции («Es verdad», «Es igual») вообще не
 * переходят в первое лицо множественного числа — проверено отдельно,
 * это не вопрос согласования, а разная грамматическая природа. Только
 * así (наречие, неизменяемое и по роду, и по числу) и уже используемая
 * курсом формула de acuerdo остаются безопасными признаками при somos
 * без захода на территорию сессии 26.
 *
 * зачем фразы построены как двойные реплики (recall + somos-реакция):
 * чтобы получить 15 РАЗНЫХ фраз без новой лексики и без plural_agreement,
 * каждая фраза берёт уже известную реплику от первого/второго/третьего
 * лица единственного числа (soy/eres/es — recall сессии 1 и сессии 17) и
 * отвечает на неё формой somos. Son (сессия 27) используется только как
 * грамматический дистрактор на позиции связки, никогда как правильный
 * ответ.
 *
 * distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2 —
 * та же экономия, что и в сессиях 10/14/17.
 *
 * зачем sessionKindOverride: 'phrases' ОБЯЗАТЕЛЕН (найдено при аудите
 * сессий 14/17): lesson1SessionChoreographyV1 без явного override молча
 * берёт kind из АНГЛИЙСКОЙ карты EPISODE_01_SESSION_MAP_V1 по тому же
 * номеру сессии. Английская сессия 25 — 'words_then_phrases' («We con
 * are»), тогда как испанская карта ES_EPISODE_01_SESSION_MAP_V1 держит 25
 * как 'phrases'. Без override мок-сборка молча получала бы неверную
 * хореографию практики вместо всех 15 написанных фраз.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-28,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md): каждый обязательный контакт
 * должен быть реальным действием внутри одной из шести утверждённых
 * механик. es_episode_01_session_25_mode_native_v1.ts авторит все 12
 * practice-шагов (после 3 интро), lesson1SessionChoreographyV1 сверяет их
 * против esSession25ModeNativeStepsV1() через
 * LESSON1_ES_SESSION_25_MODE_NATIVE_PLAN_ID_V1. Интро (concept/formula/trap)
 * переписано в том же проходе — легаси-тела трёх страниц были 562-613
 * знаков и 4-6 предложений, выше потолка intro_body_overloaded (320/4);
 * смысл сохранён, форма ужата на один экран.
 */
export const ES_EPISODE_01_SESSION_25_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 25,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s25-v2',
  sessionKindOverride: 'phrases',
  distractorAuthorship: 'manual',
  modeNativePlanId: LESSON1_ES_SESSION_25_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_25_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_25_TITLE,
  summary: ES_EPISODE_01_SESSION_25_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_25_GOAL,
  introPages: ES_EPISODE_01_SESSION_25_INTRO,
  phrases: ES_EPISODE_01_SESSION_25_PHRASES,
});
