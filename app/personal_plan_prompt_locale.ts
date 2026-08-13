import type { Lang } from '../constants/i18n';

export type PersonalPlanPromptTranslations = {
  promptRu: string;
  promptUk?: string;
  promptEs?: string;
};

export function personalPlanPromptForLang(
  prompt: PersonalPlanPromptTranslations,
  lang: Lang,
): string {
  if (lang === 'uk') return prompt.promptUk?.trim() || prompt.promptRu;
  if (lang === 'es') return prompt.promptEs?.trim() || prompt.promptRu;
  return prompt.promptRu;
}

export default function __PersonalPlanPromptLocaleRouteShim() {
  return null;
}
