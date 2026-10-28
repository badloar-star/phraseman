// ═══════════════════════════════════════════════════════════════════════════
// ContentReportFlag.tsx — флажок «Пожаловаться» на реплику, задание или диалог: тот же ReportErrorButton (variant icon-flag, того же размера, что в уроках), виден ВСЕМ.
//
// зачем (координатор 28.10, слово владельца: «кнопка „Пожаловаться“ везде, где её нет; используй тот же флаг, что в уроках, в том же месте и того же размера»): обычная кнопка
// в сборке магазина скрыта (REPORT_ERROR_ENABLED = ENABLE_DEV_TOOLS), а с собственным транспортом submitOverride она показывается всем — так сделаны уроки Learning V2 и Шпиль.
// Здесь транспорт — submitContentReportV1 (долговечная очередь, «Спасибо» сразу, дослать без сети). Контекст отчёта: экран, id места, текст, ответ человека, язык контента.
// openRef + hideTrigger — открыть ту же форму из чужой кнопки (пункт меню «⋯» в Диалогах): самой кнопки тогда нет, форма прежняя.
// Новых мелких подписей нет: флажок без текста, голосовая подпись — на 9 языках.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { submitContentReportV1 } from '../app/content_report_v1';
import { useLang } from './LangContext';
import ReportErrorButton from './ReportErrorButton';

type Props = Readonly<{
  /** Экран-источник для админки («dialogue_v2_session», «learning_v2_placement», …). */
  screen: string;
  /** Машинный ключ места: id диалога/задания и реплики/номера. */
  dataId: string;
  /** Текст, на который жалуются. */
  dataText: string;
  /** Что человек ответил/собрал до жалобы. */
  userAnswer?: string;
  /** Язык контента (изучаемый), например «en». */
  contentLang?: string;
  /** Голосовая подпись флажка (9 языков), по месту: «в диалоге», «в задании». */
  label?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  /** Открыть форму из чужой кнопки: самой кнопки нет. */
  hideTrigger?: boolean;
  openRef?: React.MutableRefObject<(() => void) | null>;
}>;

function ContentReportFlag({ screen, dataId, dataText, userAnswer, contentLang, label, testID, style, hideTrigger, openRef }: Props) {
  const { lang } = useLang();
  const submit = useCallback(({ comment }: Readonly<{ comment: string }>) => submitContentReportV1({
    screen, dataId, dataText, userAnswer, comment, lang, contentLang,
  }), [screen, dataId, dataText, userAnswer, lang, contentLang]);
  return (
    <ReportErrorButton
      screen={screen}
      dataId={dataId}
      dataText={dataText}
      userAnswer={userAnswer}
      variant="icon-flag"
      accessibilityLabel={label}
      testID={testID}
      style={style as object | undefined}
      hideTrigger={hideTrigger}
      openRef={openRef}
      submitOverride={submit}
    />
  );
}

export default memo(ContentReportFlag);
