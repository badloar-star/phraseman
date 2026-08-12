import type { Lang } from '../constants/i18n';
import { triLang } from '../constants/i18n';
import { FRENCH_CONTENT_SOURCE_GATE } from './french_content_source_gate';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export type AiDialogSourceGate = {
  enabled: boolean;
  studyTarget: 'en' | 'fr';
  reason: 'english_ai_dialog_scenarios_available' | 'french_ai_dialog_source_gate';
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

export function aiDialogContentGateForTarget(studyTarget?: RuntimeStudyTarget): AiDialogSourceGate {
  const target = storageStudyTarget(studyTarget);
  if (target !== 'fr') {
    return {
      enabled: true,
      studyTarget: 'en',
      reason: 'english_ai_dialog_scenarios_available',
      blockedRoutes: [],
      requiredEvidence: [],
    };
  }

  return {
    enabled: false,
    studyTarget: 'fr',
    reason: 'french_ai_dialog_source_gate',
    blockedRoutes: ['/ai_dialog_home', '/ai_dialog_briefing', '/ai_dialog_session', '/ai_companion_session'],
    requiredEvidence: FRENCH_AI_DIALOG_REQUIRED_EVIDENCE,
  };
}

export function aiDialogContentAvailableForTarget(studyTarget?: RuntimeStudyTarget): boolean {
  return aiDialogContentGateForTarget(studyTarget).enabled;
}

export function frenchAiDialogGateCopy(lang: Lang): { title: string; body: string; action: string } {
  return {
    title: triLang(lang, { ru: 'Французские AI-диалоги ещё проверяются', uk: 'Французькі AI-діалоги ще перевіряються', es: 'Los diálogos de IA en francés aún se están revisando', 'pt-BR': 'Os diálogos de IA em francês ainda estão em revisão', vi: 'Hội thoại AI tiếng Pháp vẫn đang được kiểm tra', id: 'Dialog AI bahasa Prancis masih ditinjau', tr: 'Fransızca AI diyalogları hâlâ inceleniyor', pl: 'Francuskie dialogi AI są jeszcze w trakcie weryfikacji' }),
    body: triLang(lang, { ru: 'Английские сценарии скрыты в режиме French. Диалоги появятся после отдельной проверки французских сценариев, подсказок и озвучки.', uk: 'Англійські сценарії приховано в режимі French. Діалоги з’являться після окремої перевірки французьких сценаріїв, підказок і озвучення.', es: 'Los escenarios en inglés están ocultos en el modo French. Los diálogos aparecerán cuando se revisen los escenarios, las pistas y el audio en francés.', 'pt-BR': 'Os cenários em inglês ficam ocultos no modo French. Os diálogos aparecerão após a revisão dos cenários, dicas e áudio em francês.', vi: 'Các kịch bản tiếng Anh được ẩn ở chế độ French. Hội thoại sẽ xuất hiện sau khi kịch bản, gợi ý và âm thanh tiếng Pháp được kiểm tra.', id: 'Skenario bahasa Inggris disembunyikan dalam mode French. Dialog akan tersedia setelah skenario, petunjuk, dan audio bahasa Prancis ditinjau.', tr: 'İngilizce senaryolar French modunda gizlenir. Diyaloglar, Fransızca senaryolar, ipuçları ve ses incelendikten sonra açılacaktır.', pl: 'Scenariusze angielskie są ukryte w trybie French. Dialogi pojawią się po sprawdzeniu francuskich scenariuszy, podpowiedzi i nagrań.' }),
    action: triLang(lang, { ru: 'К урокам', uk: 'До уроків', es: 'Ir a lecciones', 'pt-BR': 'Ir para as lições', vi: 'Đến bài học', id: 'Ke pelajaran', tr: 'Derslere git', pl: 'Przejdź do lekcji' }),
  };
}

export const FRENCH_AI_DIALOG_SOURCE_GATE_REQUIRED_EVIDENCE = Object.freeze([
  ...FRENCH_AI_DIALOG_REQUIRED_EVIDENCE,
  ...FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation,
]);

export default function __AiDialogTargetGateRouteShim() {
  return null;
}
