// ═══════════════════════════════════════════════════════════
// dev_unified_result_preview — DEV-превью общего итога всех режимов (только разработка).
//
// зачем (владелец 12.11, задача «Экраны завершения: один итог на все режимы»): склейка «макет | эмулятор» снимается на тех
// же данных, что в макете docs/design/v2-app/elevate-flow.js (массив R), без настоящего занятия, без монет и записи прогресса.
//   /dev_unified_result_preview?id=r-lesson | r-words | r-tf | r-mist | r-exam
// В релизе маршрута нет: ENABLE_DEV_TOOLS && !IS_STORE_RELEASE, иначе уводим на Главную (как dev_cards_result_preview).
// ═══════════════════════════════════════════════════════════
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import ScreenGradient from '../components/ScreenGradient';
import UnifiedResult, { ResultChipsPanel, ResultMistakesPanel, ResultNotePanel, type UnifiedResultRing } from '../components/results/UnifiedResult';
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';
import { safeRouterBack } from './navigation_back';

const LOG = '[DEV-STATE]';

type Fixture = Readonly<{
  title: string;
  ring: UnifiedResultRing;
  headline: string;
  subline: string;
  primary: string;
  secondary?: string;
  chips?: Readonly<{ title: string; words: readonly string[] }>;
  mistakes?: Readonly<{ title: string; rows: readonly (readonly [string, string])[] }>;
  note?: Readonly<{ title: string; text: string }>;
}>;

// Данные — слово в слово из elevate-flow.js, массив R, поле `c`.
const FIXTURES: Readonly<Record<string, Fixture>> = {
  'r-lesson': {
    title: 'Урок 1 · эпизод 5', ring: { value: 83, progress: 0.83, suffix: '%', label: 'точность' },
    headline: '10 из 12 фраз с первого раза', subline: 'Открыт эпизод 6', primary: 'Следующий эпизод',
    chips: { title: 'Новые слова', words: ['cooking', 'dinner', 'messages'] },
    mistakes: { title: 'Разбор ошибок', rows: [['She is writing messages', 'ты собрал: She writing is messages'], ['It is working well', 'ты выбрал: Это работало хорошо']] },
  },
  'r-words': {
    title: 'Слова · урок 1', ring: { value: 12, of: 12, progress: 1, label: 'слов узнал' },
    headline: 'Словарь урока собран', subline: 'Четыре слова ушли в карточки', primary: 'К уроку',
    chips: { title: 'Ещё повторим завтра', words: ['waiting', 'listening'] },
  },
  'r-tf': {
    title: 'Смахни', ring: { value: 94, progress: 0.94, suffix: '%', label: 'точность' },
    headline: '17 из 18 без подсказки', subline: 'Меньше секунды на ответ', primary: 'Готово',
    mistakes: { title: 'Где споткнулся', rows: [['We usually wait here', 'это привычка, а не «сейчас»']] },
  },
  'r-mist': {
    title: 'Ошибки', ring: { value: 5, of: 6, progress: 0.83, label: 'исправлено' },
    headline: 'Пять ошибок закрыты', subline: 'Осталось семь в списке', primary: 'Готово',
    note: { title: 'Вернётся завтра', text: 'I tend to agree — свяжи значение со всей фразой.' },
  },
  'r-exam': {
    title: 'Экзамен главы 2', ring: { value: 11, of: 12, progress: 0.92, label: 'нужно 10' },
    headline: 'Глава 3 открыта', subline: 'Эпизоды 13–16 доступны', primary: 'К главе 3', secondary: 'Разбор ошибок',
    mistakes: { title: 'Одна ошибка', rows: [['Does she work here?', 'ты написал: Do she work here?']] },
  },
};

export default function DevUnifiedResultPreview() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const router = useRouter();
  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = raw && FIXTURES[raw] ? raw : 'r-lesson';
  const f = FIXTURES[id];

  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) {
    console.warn(`${LOG} unified_result_preview: отклонено — не dev-сборка, уводим на Главную`); // guard-ok: ранний выход логируется
    return <Redirect href="/" />;
  }
  console.log(`${LOG} unified_result_preview id=${id} (запрошено ${raw ?? '-'}) — без занятия и без начислений`); // guard-ok: ветка решает значение
  const leave = () => safeRouterBack(router);
  return (
    <ScreenGradient>
      <UnifiedResult
        testID={`unified-result-${id}`}
        title={f.title}
        ring={f.ring}
        headline={f.headline}
        subline={f.subline}
        onClose={leave}
        closeLabel="Закрыть"
        primary={{ label: f.primary, onPress: leave }}
        secondary={f.secondary ? { label: f.secondary, onPress: leave } : undefined}
      >
        {f.chips ? <ResultChipsPanel title={f.chips.title} chips={f.chips.words} /> : null}
        {f.mistakes ? <ResultMistakesPanel title={f.mistakes.title} rows={f.mistakes.rows.map(([text, detail]) => ({ key: text, text, detail }))} /> : null}
        {f.note ? <ResultNotePanel title={f.note.title} text={f.note.text} /> : null}
      </UnifiedResult>
    </ScreenGradient>
  );
}
