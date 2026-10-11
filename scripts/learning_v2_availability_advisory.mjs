/**
 * Разбор справки доступности Learning V2 из вывода теста tests/learning_v2_bundle_availability.test.ts.
 *
 * зачем (координатор 12.10, отчёт release:precheck 3a25ea4bb): гейт озвучки был зелёным при потолке 0 — «каждое выпущенное
 * занятие собирается», но выпущенных НОЛЬ, и в стор-сборке раздел V2 открывал 0 занятий. Если V2 входит в сборку, пустой
 * раздел — красный. Нет справки — тоже красный: доказать, что раздел не пуст, нечем.
 */
const ADVISORY_RE = /\[V2-AVAILABILITY\] advisory (\{.*\})/;

/** Достать JSON справки из сырого вывода раннера. null — строки нет или JSON битый. */
export function parseLearningV2AvailabilityAdvisory(output) {
  for (const line of String(output ?? '').split('\n')) {
    const match = ADVISORY_RE.exec(line);
    if (!match) continue;
    try {
      const parsed = JSON.parse(match[1]);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      // зачем: битая строка = нет справки; вызывающий решает (красный) и печатает причину.
      return null;
    }
  }
  return null;
}

/**
 * Решение по справке: пуст ли выпущенный раздел V2.
 * releasedByArtifact — сколько занятий покажет приложение (артефакт выпуска); contiguousCeiling — сколько собирается подряд.
 * Красный, если любой из них не больше нуля или справки нет.
 */
export function learningV2ReleasedCeilingVerdict(advisory) {
  if (!advisory) return { ok: false, reason: 'advisory_missing', released: null, ceiling: null };
  const released = Number(advisory.releasedByArtifact);
  const ceiling = Number(advisory.contiguousCeiling);
  if (!Number.isFinite(released) || !Number.isFinite(ceiling)) {
    return { ok: false, reason: 'advisory_fields_missing', released: null, ceiling: null };
  }
  if (released <= 0 || ceiling <= 0) return { ok: false, reason: 'zero_released_sessions', released, ceiling };
  return { ok: true, reason: 'released_sessions_present', released, ceiling };
}
