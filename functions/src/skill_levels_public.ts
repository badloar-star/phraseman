/**
 * Уровни навыков, которые видят другие люди (владелец 11.11.2026, D207): шесть целых 0..30 в порядке клиентского
 * списка навыков (modules/skills/skill_points_table.ts → SKILL_IDS: listening, speech, vocab, grammar, speed, social).
 *
 * зачем отдельный файл: одну и ту же запись разбирают два места — проекция публичного профиля (уровни при визитке «Про»)
 * и выдача друзьям (уровни всегда). Правило разбора одно: частично верную запись не чиним, а отбрасываем целиком.
 * Сервер уровни не считает и не проверяет на достоверность — это заявление телефона, как и ранг монеты на визитке;
 * наград и прав за уровень нет.
 */
export const PUBLIC_SKILL_COUNT = 6;
export const PUBLIC_SKILL_LEVEL_MAX = 30;

export function validSkillLevels(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length !== PUBLIC_SKILL_COUNT) return null;
  const valid = value.every((level) => typeof level === 'number' && Number.isInteger(level) && level >= 0 && level <= PUBLIC_SKILL_LEVEL_MAX);
  return valid ? [...(value as number[])] : null;
}
