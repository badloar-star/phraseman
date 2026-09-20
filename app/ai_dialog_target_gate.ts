import type { Lang } from '../constants/i18n';
import { triLang } from '../constants/i18n';
import { FRENCH_CONTENT_SOURCE_GATE } from './french_content_source_gate';
import { resolveDialogueStudyTarget, type DialogueStudyTarget } from './dialogue_language_registry';
import { dialogueLanguageIsActivated } from './dialogue_language_activation';
import type { RuntimeStudyTarget } from './target_storage_keys';

export type AiDialogSourceGate = {
  enabled: boolean;
  /** Raw dialogue target. Unknown values stay visible as unknown — never English. */
  studyTarget: DialogueStudyTarget | 'unknown';
  reason:
    | 'english_ai_dialog_scenarios_available'
    | 'spanish_ai_dialog_source_gate'
    | 'french_ai_dialog_source_gate'
    | 'german_ai_dialog_source_gate'
    | 'unknown_ai_dialog_target';
  blockedRoutes: readonly string[];
  requiredEvidence: readonly string[];
};

export const FRENCH_AI_DIALOG_REQUIRED_EVIDENCE = Object.freeze([
  'french_ai_dialog_scenario_bank',
  'french_ai_dialog_prompt_contract',
  'french_ai_dialog_lesson_scenario_mapping',
  'french_ai_dialog_tts_voice_contract',
  'ru_uk_ai_dialog_help_prompt_review',
  'official_source_llm_ai_dialog_review',
]);

const SPANISH_AI_DIALOG_REQUIRED_EVIDENCE = Object.freeze([
  'spanish_ai_dialog_scenario_bank',
  'spanish_ai_dialog_prompt_contract',
  'spanish_ai_dialog_lesson_scenario_mapping',
  'spanish_ai_dialog_tts_voice_contract',
  'spanish_ai_dialog_native_review',
]);

const GERMAN_AI_DIALOG_REQUIRED_EVIDENCE = Object.freeze([
  'german_ai_dialog_scenario_bank',
  'german_ai_dialog_prompt_contract',
  'german_ai_dialog_lesson_scenario_mapping',
  'german_ai_dialog_tts_voice_contract',
  'german_ai_dialog_native_review',
]);

export function aiDialogContentGateForTarget(studyTarget?: RuntimeStudyTarget): AiDialogSourceGate {
  const target = resolveDialogueStudyTarget(studyTarget);
  if (target === 'en') {
    return {
      enabled: true,
      studyTarget: 'en',
      reason: 'english_ai_dialog_scenarios_available',
      blockedRoutes: [],
      requiredEvidence: [],
    };
  }

  if (target === 'es') {
    return {
      enabled: dialogueLanguageIsActivated('es'),
      studyTarget: 'es',
      reason: 'spanish_ai_dialog_source_gate',
      blockedRoutes: ['/ai_dialog_home', '/ai_dialog_briefing', '/ai_dialog_session', '/ai_companion_session'],
      requiredEvidence: SPANISH_AI_DIALOG_REQUIRED_EVIDENCE,
    };
  }

  if (target === 'de') {
    return {
      enabled: dialogueLanguageIsActivated('de'),
      studyTarget: 'de',
      reason: 'german_ai_dialog_source_gate',
      blockedRoutes: ['/ai_dialog_home', '/ai_dialog_briefing', '/ai_dialog_session', '/ai_companion_session'],
      requiredEvidence: GERMAN_AI_DIALOG_REQUIRED_EVIDENCE,
    };
  }

  if (!target) {
    return {
      enabled: false,
      studyTarget: 'unknown',
      reason: 'unknown_ai_dialog_target',
      blockedRoutes: ['/ai_dialog_home', '/ai_dialog_briefing', '/ai_dialog_session', '/ai_companion_session'],
      requiredEvidence: [],
    };
  }

  return {
    enabled: dialogueLanguageIsActivated('fr'),
    studyTarget: 'fr',
    reason: 'french_ai_dialog_source_gate',
    blockedRoutes: ['/ai_dialog_home', '/ai_dialog_briefing', '/ai_dialog_session', '/ai_companion_session'],
    requiredEvidence: FRENCH_AI_DIALOG_REQUIRED_EVIDENCE,
  };
}

export function aiDialogContentAvailableForTarget(studyTarget?: RuntimeStudyTarget): boolean {
  return aiDialogContentGateForTarget(studyTarget).enabled;
}

export function aiDialogTargetGateCopy(
  lang: Lang,
  studyTarget?: RuntimeStudyTarget,
): { title: string; body: string; action: string } {
  const target = resolveDialogueStudyTarget(studyTarget);
  if (target === 'es') {
    return {
      title: triLang(lang, { ru: 'Испанские AI-диалоги ещё проверяются', uk: 'Іспанські AI-діалоги ще перевіряються', en: 'Spanish AI dialogues are still being reviewed', es: 'Los diálogos de IA en español aún se están revisando', 'pt-BR': 'Os diálogos de IA em espanhol ainda estão em revisão', vi: 'Hội thoại AI tiếng Tây Ban Nha vẫn đang được kiểm tra', id: 'Dialog AI bahasa Spanyol masih ditinjau', tr: 'İspanyolca AI diyalogları hâlâ inceleniyor', pl: 'Hiszpańskie dialogi AI są jeszcze w trakcie weryfikacji' }),
      body: triLang(lang, { ru: 'Испанские сценарии, подсказки и озвучка ещё не получили отдельную проверку. Английские диалоги в этом режиме скрыты.', uk: 'Іспанські сценарії, підказки й озвучення ще не пройшли окрему перевірку. Англійські діалоги в цьому режимі приховано.', en: 'Spanish scenarios, hints, and audio still need their own review. English dialogues are hidden in this mode.', es: 'Los escenarios, las pistas y el audio en español aún necesitan su propia revisión. Los diálogos en inglés están ocultos en este modo.', 'pt-BR': 'Cenários, dicas e áudio em espanhol ainda precisam da própria revisão. Os diálogos em inglês estão ocultos neste modo.', vi: 'Kịch bản, gợi ý và âm thanh tiếng Tây Ban Nha vẫn cần được kiểm tra riêng. Hội thoại tiếng Anh bị ẩn ở chế độ này.', id: 'Skenario, petunjuk, dan audio bahasa Spanyol masih memerlukan peninjauan tersendiri. Dialog bahasa Inggris disembunyikan dalam mode ini.', tr: 'İspanyolca senaryolar, ipuçları ve ses için ayrı inceleme henüz tamamlanmadı. İngilizce diyaloglar bu modda gizlenir.', pl: 'Hiszpańskie scenariusze, podpowiedzi i nagrania nadal wymagają osobnej weryfikacji. Dialogi po angielsku są w tym trybie ukryte.' }),
      action: triLang(lang, { ru: 'К урокам', uk: 'До уроків', en: 'To lessons', es: 'Ir a lecciones', 'pt-BR': 'Ir para as lições', vi: 'Đến bài học', id: 'Ke pelajaran', tr: 'Derslere git', pl: 'Przejdź do lekcji' }),
    };
  }
  if (target === 'de') {
    return {
      title: triLang(lang, { ru: 'Немецкие AI-диалоги ещё проверяются', uk: 'Німецькі AI-діалоги ще перевіряються', en: 'German AI dialogues are still being reviewed', es: 'Los diálogos de IA en alemán aún se están revisando', 'pt-BR': 'Os diálogos de IA em alemão ainda estão em revisão', vi: 'Hội thoại AI tiếng Đức vẫn đang được kiểm tra', id: 'Dialog AI bahasa Jerman masih ditinjau', tr: 'Almanca AI diyalogları hâlâ inceleniyor', pl: 'Niemieckie dialogi AI są jeszcze w trakcie weryfikacji' }),
      body: triLang(lang, { ru: 'Немецкие сценарии, подсказки и озвучка ещё не получили отдельную проверку. Английские диалоги в этом режиме скрыты.', uk: 'Німецькі сценарії, підказки й озвучення ще не пройшли окрему перевірку. Англійські діалоги в цьому режимі приховано.', en: 'German scenarios, hints, and audio still need their own review. English dialogues are hidden in this mode.', es: 'Los escenarios, las pistas y el audio en alemán aún necesitan su propia revisión. Los diálogos en inglés están ocultos en este modo.', 'pt-BR': 'Cenários, dicas e áudio em alemão ainda precisam da própria revisão. Os diálogos em inglês estão ocultos neste modo.', vi: 'Kịch bản, gợi ý và âm thanh tiếng Đức vẫn cần được kiểm tra riêng. Hội thoại tiếng Anh bị ẩn ở chế độ này.', id: 'Skenario, petunjuk, dan audio bahasa Jerman masih memerlukan peninjauan tersendiri. Dialog bahasa Inggris disembunyikan dalam mode ini.', tr: 'Almanca senaryolar, ipuçları ve ses için ayrı inceleme henüz tamamlanmadı. İngilizce diyaloglar bu modda gizlenir.', pl: 'Niemieckie scenariusze, podpowiedzi i nagrania nadal wymagają osobnej weryfikacji. Dialogi po angielsku są w tym trybie ukryte.' }),
      action: triLang(lang, { ru: 'К урокам', uk: 'До уроків', en: 'To lessons', es: 'Ir a lecciones', 'pt-BR': 'Ir para as lições', vi: 'Đến bài học', id: 'Ke pelajaran', tr: 'Derslere git', pl: 'Przejdź do lekcji' }),
    };
  }
  if (!target) {
    return {
      title: triLang(lang, { ru: 'Диалоги для этого языка пока недоступны', uk: 'Діалоги для цієї мови поки недоступні', en: 'Dialogues are not available for this language yet', es: 'Los diálogos aún no están disponibles para este idioma', 'pt-BR': 'Os diálogos ainda não estão disponíveis para este idioma', vi: 'Hội thoại chưa khả dụng cho ngôn ngữ này', id: 'Dialog belum tersedia untuk bahasa ini', tr: 'Diyaloglar bu dil için henüz kullanılamıyor', pl: 'Dialogi nie są jeszcze dostępne dla tego języka' }),
      body: triLang(lang, { ru: 'Этот языковой контур ещё не прошёл отдельную проверку сценариев, подсказок и озвучки.', uk: 'Цей мовний контур ще не пройшов окрему перевірку сценаріїв, підказок і озвучення.', en: 'This language contour still needs its own review of scenarios, hints, and audio.', es: 'Este contorno de idioma aún necesita su propia revisión de escenarios, pistas y audio.', 'pt-BR': 'Este contorno de idioma ainda precisa da própria revisão de cenários, dicas e áudio.', vi: 'Lộ trình ngôn ngữ này vẫn cần được kiểm tra riêng về kịch bản, gợi ý và âm thanh.', id: 'Kontur bahasa ini masih memerlukan peninjauan tersendiri untuk skenario, petunjuk, dan audio.', tr: 'Bu dil kapsamı hâlâ senaryolar, ipuçları ve ses için ayrı incelemeye ihtiyaç duyuyor.', pl: 'Ten kontur językowy nadal wymaga osobnej weryfikacji scenariuszy, podpowiedzi i nagrań.' }),
      action: triLang(lang, { ru: 'К урокам', uk: 'До уроків', en: 'To lessons', es: 'Ir a lecciones', 'pt-BR': 'Ir para as lições', vi: 'Đến bài học', id: 'Ke pelajaran', tr: 'Derslere git', pl: 'Przejdź do lekcji' }),
    };
  }
  return {
    title: triLang(lang, { ru: 'Французские AI-диалоги ещё проверяются', uk: 'Французькі AI-діалоги ще перевіряються', en: 'French AI dialogues are still being reviewed', es: 'Los diálogos de IA en francés aún se están revisando', 'pt-BR': 'Os diálogos de IA em francês ainda estão em revisão', vi: 'Hội thoại AI tiếng Pháp vẫn đang được kiểm tra', id: 'Dialog AI bahasa Prancis masih ditinjau', tr: 'Fransızca AI diyalogları hâlâ inceleniyor', pl: 'Francuskie dialogi AI są jeszcze w trakcie weryfikacji' }),
    body: triLang(lang, { ru: 'Английские сценарии скрыты в режиме French. Диалоги появятся после отдельной проверки французских сценариев, подсказок и озвучки.', uk: 'Англійські сценарії приховано в режимі French. Діалоги з’являться після окремої перевірки французьких сценаріїв, підказок і озвучення.', en: 'English scenarios are hidden in French mode. Dialogues will appear once French scenarios, hints, and audio have been reviewed separately.', es: 'Los escenarios en inglés están ocultos en el modo French. Los diálogos aparecerán cuando se revisen los escenarios, las pistas y el audio en francés.', 'pt-BR': 'Os cenários em inglês ficam ocultos no modo French. Os diálogos aparecerão após a revisão dos cenários, dicas e áudio em francês.', vi: 'Các kịch bản tiếng Anh được ẩn ở chế độ French. Hội thoại sẽ xuất hiện sau khi kịch bản, gợi ý và âm thanh tiếng Pháp được kiểm tra.', id: 'Skenario bahasa Inggris disembunyikan dalam mode French. Dialog akan tersedia setelah skenario, petunjuk, dan audio bahasa Prancis ditinjau.', tr: 'İngilizce senaryolar French modunda gizlenir. Diyaloglar, Fransızca senaryolar, ipuçları ve ses incelendikten sonra açılacaktır.', pl: 'Scenariusze angielskie są ukryte w trybie French. Dialogi pojawią się po sprawdzeniu francuskich scenariuszy, podpowiedzi i nagrań.' }),
    action: triLang(lang, { ru: 'К урокам', uk: 'До уроків', en: 'To lessons', es: 'Ir a lecciones', 'pt-BR': 'Ir para as lições', vi: 'Đến bài học', id: 'Ke pelajaran', tr: 'Derslere git', pl: 'Przejdź do lekcji' }),
  };
}

/** @deprecated Use aiDialogTargetGateCopy with the requested target. */
export function frenchAiDialogGateCopy(lang: Lang): { title: string; body: string; action: string } {
  return aiDialogTargetGateCopy(lang, 'fr');
}

export const FRENCH_AI_DIALOG_SOURCE_GATE_REQUIRED_EVIDENCE = Object.freeze([
  ...FRENCH_AI_DIALOG_REQUIRED_EVIDENCE,
  ...FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation,
]);

export default function __AiDialogTargetGateRouteShim() {
  return null;
}
