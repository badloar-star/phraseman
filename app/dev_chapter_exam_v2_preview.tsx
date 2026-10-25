// ═══════════════════════════════════════════════════════════
// dev_chapter_exam_v2_preview — DEV-превью экрана экзамена главы v2 по состояниям (только разработка).
//
// зачем (координатор 25.10, Сверка): склейка «прототип PYJfpbH1Upz9KCLngxVyG9 | эмулятор» решает, включён ли экзамен v2 в OTA, а проходить
// экзамен на тестовом аккаунте нельзя (это запись экзамена). Каждое состояние открывается ссылкой:
//   /dev_chapter_exam_v2_preview?state=<состояние>&chapter=1|2|3&theme=dark|light
//   start — первый вопрос попытки; situation / situation_write / dialogue / fix — вопрос каждого типа («или напиши» — situation_write);
//   answer_correct / answer_typo / answer_wrong — проверенный ответ; result_pass (9 из 10, +40) / result_fail (6 из 10) — итог;
//   mistakes — разбор ошибок; review — «Повтори эти темы» после провала; cooldown — пауза пересдачи (вход раньше часа).
// Экран — тот же ChapterExamV2Run, что в бою; данные — снимок из настоящего банка главы (chapter_exam_v2_dev_presets.ts). Подготовка, энергия
// и запись экзамена не вызываются, сеть не трогается. Тема меняется ТОЛЬКО в памяти процесса (app/dev_appearance_override.ts).
// В релизе маршрута нет: префикс dev_ вне стор-бандла + ENABLE_DEV_TOOLS && !IS_STORE_RELEASE, иначе уводим на Главную.
// Охраняет tests/chapter_exam_v2_dev_preview_contract.test.ts.
// ═══════════════════════════════════════════════════════════
import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo } from 'react';

import { useTheme } from '../components/ThemeContext';
import ChapterExamV2Run from '../components/learning-v2/exam_v2/ChapterExamV2Run';
import { chapterExamV2DevPreset, isChapterExamV2DevState, type ChapterExamV2DevState } from '../components/learning-v2/exam_v2/chapter_exam_v2_dev_presets';
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';
import { getDevAppearance, setDevAppearance } from './dev_appearance_override';

const LOG = '[DEV-STATE]';
const DEV_LESSON = 1;

function Inner() {
  const params = useLocalSearchParams<{ state?: string; chapter?: string; theme?: string }>();
  const { isDark } = useTheme();
  const state: ChapterExamV2DevState = isChapterExamV2DevState(params.state) ? params.state : 'start';
  const chapter = [1, 2, 3].includes(Number(params.chapter)) ? Number(params.chapter) : 1;
  const wanted = params.theme === 'dark' || params.theme === 'light' ? params.theme : null;

  // тема ссылкой: в памяти процесса, на выходе возвращаем то, что было (без записи в хранилище и облако)
  useEffect(() => {
    if (!wanted) return undefined;
    const before = getDevAppearance();
    setDevAppearance(wanted);
    return () => setDevAppearance(before);
  }, [wanted]);

  const preset = useMemo(() => chapterExamV2DevPreset(state, chapter), [state, chapter]);
  const theme = wanted ?? (isDark ? 'dark' : 'light');

  useEffect(() => {
    console.log(`${LOG} chapter_exam_v2_preview route state=${state} fromParam=${String(params.state ?? 'нет→start')} chapter=${chapter} fromParam=${String(params.chapter ?? 'нет→1')} theme=${theme} preset=${preset ? `${preset.phase}#${preset.index}` : 'нет банка'}`); // guard-ok: dev-маршрут, в релизе не открывается (Redirect на Главную)
  }, [state, params.state, chapter, params.chapter, theme, preset]);

  if (!preset) return <Redirect href="/" />;
  // key: смена состояния пересоздаёт экран — локальные состояния вопроса и итога стартуют заново
  return <ChapterExamV2Run key={`${state}|${chapter}|${theme}`} lessonOrdinal={DEV_LESSON} chapterOrdinal={chapter} source="dev_preview" devPreset={preset} />;
}

export default function DevChapterExamV2PreviewRoute() {
  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return <Redirect href="/" />;
  return <Inner />;
}
