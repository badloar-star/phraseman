/**
 * Миграция пары «интерфейс en + изучаю en» (вариант А, решение владельца — см. docs/phraseman-2.0/handoff/en_ui_study_target_variant_A.md).
 *
 * зачем: при английском интерфейсе английский не предлагается как язык изучения — старые уроки RU→EN человеку, не знающему русского,
 * бессмысленны. Пара уже могла сохраниться (дефолт был `en`, смена интерфейса язык изучения не трогала, `study_target_v1` восстанавливается
 * из облака). Тихо менять язык нельзя (русскоговорящий мог включить английский интерфейс «для погружения»), поэтому при следующем входе
 * открываем экран выбора языка изучения — человек выбирает сам. Один раз за запуск процесса.
 */
import { useEffect, useRef } from 'react';
import { router, usePathname } from 'expo-router';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { isStudyTargetAllowedForUi } from '../app/study_target';

const LOG = '[EN-UI-STUDY-TARGET]';
/** После первого кадра вкладок — не мешаем первому кадру и прогревам. */
const PROMPT_DELAY_MS = 1200;

let promptedThisProcess = false;

export function useEnUiStudyTargetMigration(): void {
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (promptedThisProcess) return undefined;
    if (isStudyTargetAllowedForUi(studyTarget, lang)) return undefined;
    if (pathname?.startsWith('/settings_language')) {
      console.log(`${LOG} пара ui=${lang} target=${studyTarget} — уже на экране языков, шторку откроет он сам`);
      return undefined;
    }
    console.log(`${LOG} пара ui=${lang} target=${studyTarget} не разрешена — через ${PROMPT_DELAY_MS} мс экран выбора языка изучения`);
    timer.current = setTimeout(() => {
      promptedThisProcess = true;
      router.push({ pathname: '/settings_language', params: { chooseStudy: '1' } } as never);
    }, PROMPT_DELAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [lang, studyTarget, pathname]);
}
