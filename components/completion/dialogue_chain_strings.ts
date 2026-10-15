// ═══════════════════════════════════════════════════════════════════════════
// dialogue_chain_strings.ts — тексты m18 «Итог диалога — думает… → реакция», 9 языков.
//
// зачем (координатор 15.10; эталон engagement-moments-v3-all.html `done3`): «Эмма думает…» → «Эмма довольна», «Закажи кофе · 3 цели из 3».
// У персоны нет пола в данных, а «довольна/доволен» — родовое слово: реакция сформулирована без рода («{name}: отлично!») — ВАРИАНТ (б), ждёт «да» владельца через координатора.
// TODO-i18n: всё кроме RU — предложение, носителем не проверено; список — docs/work/tasks/moments-v3-m18-strings.md.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../constants/i18n';

type Nine = Readonly<{ ru: string; uk: string; en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>;

const S = {
  thinking: { ru: '{name} думает…', uk: '{name} думає…', en: '{name} is thinking…', es: '{name} está pensando…', 'pt-BR': '{name} está pensando…', vi: '{name} đang suy nghĩ…', id: '{name} sedang berpikir…', tr: '{name} düşünüyor…', pl: '{name} myśli…' },
  pleased: { ru: '{name}: отлично!', uk: '{name}: чудово!', en: '{name}: great job!', es: '{name}: ¡genial!', 'pt-BR': '{name}: ótimo!', vi: '{name}: tuyệt lắm!', id: '{name}: hebat!', tr: '{name}: harika!', pl: '{name}: świetnie!' },
  neutral: { ru: '{name}: неплохо', uk: '{name}: непогано', en: '{name}: not bad', es: '{name}: nada mal', 'pt-BR': '{name}: nada mal', vi: '{name}: khá ổn', id: '{name}: lumayan', tr: '{name}: fena değil', pl: '{name}: nieźle' },
  partner: { ru: 'Собеседник', uk: 'Співрозмовник', en: 'Your partner', es: 'Tu interlocutor', 'pt-BR': 'Seu parceiro', vi: 'Người trò chuyện', id: 'Lawan bicara', tr: 'Muhatabın', pl: 'Rozmówca' },
  goalsOf: { ru: '{met} из {total}', uk: '{met} з {total}', en: '{met} of {total}', es: '{met} de {total}', 'pt-BR': '{met} de {total}', vi: '{met}/{total}', id: '{met} dari {total}', tr: '{total} içinden {met}', pl: '{met} z {total}' },
} as const satisfies Readonly<Record<string, Nine>>;

export type DialogueChainStringKey = keyof typeof S;
export const DIALOGUE_CHAIN_STRING_KEYS = Object.keys(S) as readonly DialogueChainStringKey[];
export const DIALOGUE_CHAIN_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

/** Текст на языке интерфейса; `{ключ}` — из vars. Неизвестный язык (fr/de интерфейса диалогов) — английский. */
export function dialogueChainText(lang: Lang, key: DialogueChainStringKey, vars?: Readonly<Record<string, string | number>>): string {
  const table = S[key] as Nine;
  const raw = (table as Record<string, string>)[lang] ?? table.en;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}
