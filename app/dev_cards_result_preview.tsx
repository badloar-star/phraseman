// ═══════════════════════════════════════════════════════════
// dev_cards_result_preview — DEV-превью экрана «Итог тренировки» Карточек (только разработка).
//
// зачем (Авторизация 12.10, съёмка R1 cards-v2-041/042/051/052, cards-section-053/054/055): итог показывается только в конце настоящей
// тренировки, а Блиц в этот момент зачисляет монеты и проходит гейт тренировок (сеть). Здесь — ТОТ ЖЕ экран итога (SessionResultScreen →
// CardsSessionResultV2) на данных макета cards-v2.html: тренировка не идёт, монеты не зачисляются, формы отзыва нет (она пишет отметку показа).
//   /dev_cards_result_preview?state=errors | clean | good | grow
// В релизе маршрута нет: ENABLE_DEV_TOOLS && !IS_STORE_RELEASE, иначе уводим на Главную. Охраняет tests/dev_cards_result_preview.test.ts.
// ═══════════════════════════════════════════════════════════
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';

import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';
import { safeRouterBack } from './navigation_back';
import SessionResultScreen from './flashcards/SessionResultScreen';
import { devCardsResultFixture, isDevCardsResultState } from './flashcards/dev_cards_result_fixture';

const LOG = '[DEV-STATE]';

export default function DevCardsResultPreview() {
  const params = useLocalSearchParams<{ state?: string | string[] }>();
  const router = useRouter();
  const raw = Array.isArray(params.state) ? params.state[0] : params.state;
  const state = isDevCardsResultState(raw) ? raw : 'errors';
  const fixture = useMemo(() => devCardsResultFixture(state), [state]);

  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) {
    console.warn(`${LOG} cards_result_preview: отклонено — не dev-сборка, уводим на Главную`); // guard-ok: ранний выход логируется
    return <Redirect href="/" />;
  }
  console.log(`${LOG} cards_result_preview state=${state} (запрошено ${raw ?? '-'}) correct=${fixture.correct} wrong=${fixture.wrong} — без тренировки и без зачисления`); // guard-ok: ветка решает значение
  return (
    <SessionResultScreen
      correct={fixture.correct}
      wrong={fixture.wrong}
      runesGained={fixture.coins}
      learnLeft={0}
      overline="Блиц · Путешествия"
      durationSec={fixture.durationSec}
      mistakes={fixture.mistakes}
      retryLabel="Ещё раз"
      onRetryWrong={() => console.log(`${LOG} cards_result_preview: «Ещё раз» — в превью ничего не запускается`)} // guard-ok: действие превью
      // зачем (сторож navigation_back_underlay_contract, Темы 13.10): единый безопасный возврат, без нативного router.back()
      onDone={() => safeRouterBack(router)}
      testID="fc-blitz-result"
    />
  );
}
