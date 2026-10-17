/**
 * [HOME-FOCUS-COST] — сколько JS-времени стоит один рендер Главной: «от начала рендера до первого пассивного эффекта корня» и «собственные эффекты корня».
 *
 * зачем (координатор 18.10, [BACK-BTN] «Сегодня»: тап → первый кадр 373–535 мс, дрейф JS 200–650 мс после возврата на Главную; правило «сперва логи»):
 * не ясно, что именно держит JS-поток при возврате — отрисовка Главной и её детей или пассивные эффекты. Порядок пассивных эффектов: дочерние раньше родителя,
 * внутри компонента — по объявлению. Поэтому:
 *   renderToEffectsMs = начало рендера → первый эффект корня (рендер корня и детей + коммит + эффекты детей);
 *   ownEffectsMs      = первый → последний эффект корня (только собственные эффекты Главной).
 * Строка пишется, когда любая часть ≥ порога. Только dev и не стор-релиз; в релизе обе функции пустые. Значения — числа, без данных пользователя.
 */
import { useEffect, useRef } from 'react';

import { IS_STORE_RELEASE } from './config';
import { renderWindowEpoch } from './render_cause_probe';

export const HOME_FOCUS_COST_THRESHOLD_MS = 30;
const ENABLED = __DEV__ && !IS_STORE_RELEASE;

export type HomeFocusCostState = { renderStartedAt: number; firstEffectAt: number; renders: number };

/** Вызывать из корня экрана ДО остальных хуков с эффектами; возвращает общую ссылку для `useHomeFocusCostEnd`. */
export const useHomeFocusCostBegin: () => { current: HomeFocusCostState } = ENABLED
  ? () => {
      const state = useRef<HomeFocusCostState>({ renderStartedAt: 0, firstEffectAt: 0, renders: 0 });
      state.current.renderStartedAt = Date.now();
      state.current.renders += 1;
      useEffect(() => { state.current.firstEffectAt = Date.now(); });
      return state;
    }
  : () => ({ current: { renderStartedAt: 0, firstEffectAt: 0, renders: 0 } });

/** Вызывать ПОСЛЕДНИМ из хуков с эффектами корня. */
export const useHomeFocusCostEnd: (state: { current: HomeFocusCostState }, tag: string) => void = ENABLED
  ? (state, tag) => {
      useEffect(() => {
        const s = state.current;
        const endAt = Date.now();
        const renderToEffectsMs = s.firstEffectAt - s.renderStartedAt;
        const ownEffectsMs = endAt - s.firstEffectAt;
        if (renderToEffectsMs < HOME_FOCUS_COST_THRESHOLD_MS && ownEffectsMs < HOME_FOCUS_COST_THRESHOLD_MS) return;
        console.log('[HOME-FOCUS-COST]', JSON.stringify({ tag, n: s.renders, window: renderWindowEpoch(), renderToEffectsMs, ownEffectsMs })); // guard-ok: строка только на тяжёлый рендер (≥ 30 мс), dev
      });
    }
  : () => undefined;
