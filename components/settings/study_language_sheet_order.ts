// зачем (D188, сторож «5 языков при любом из 9 интерфейсов»): порядок строк шторки «Язык изучения» — чистая функция в лёгком
// модуле, чтобы сторож проверял итоговый список без загрузки экранного кода шторки (картинки, svg, тема).
import type { StudyTarget } from '../../app/study_target';

/** Порядок макета: выбранный язык первым, остальные — en, es, fr, de, it. */
export function orderStudyLanguageSheetOptions(options: readonly StudyTarget[], activeTarget: StudyTarget): StudyTarget[] {
  const canonical: readonly StudyTarget[] = ['en', 'es', 'fr', 'de', 'it'];
  const rank = (code: StudyTarget) => {
    const index = canonical.indexOf(code);
    return index < 0 ? canonical.length : index;
  };
  const rest = options.filter((code) => code !== activeTarget).slice().sort((a, b) => rank(a) - rank(b));
  return options.includes(activeTarget) ? [activeTarget, ...rest] : rest;
}
