import { readFileSync } from 'fs';
import { join } from 'path';

import { resolveNextOverlay, type OverlayKey } from '../components/overlay_arbiter_core';

function wants(...keys: OverlayKey[]): Partial<Record<OverlayKey, boolean>> {
  return Object.fromEntries(keys.map((key) => [key, true])) as Partial<Record<OverlayKey, boolean>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Регрессия: «глобально перестали работать ВСЕ тосты».
//
// Корень бага: модалка DailyTasksFirstVisitModal отключена (в проде всегда return null,
// её заменил брифинг Компаса), НО в app/_layout.tsx ключ 'dailyPlan' продолжал просить
// единственный слот арбитра через useOverlayVisible('dailyPlan', dailyPlanModalDue).
// dailyPlanModalDue становился true раз в сутки (seen !== '1'), арбитр отдавал слот
// 'dailyPlan', а так как модалка не рендерилась — её никто не закрывал → слот завис на
// весь день → все тосты (они НИЖЕ 'dailyPlan' по приоритету) глобально не показывались.
//
// Фикс: пока модалка отключена, 'dailyPlan' НЕ должен просить слот — в _layout.tsx
// передаём useOverlayVisible('dailyPlan', false).
// ─────────────────────────────────────────────────────────────────────────────

describe('overlay: disabled dailyPlan modal must not hog the arbiter slot', () => {
  const layoutSource = readFileSync(join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
  const modalSource = readFileSync(
    join(__dirname, '..', 'components', 'DailyTasksFirstVisitModal.tsx'),
    'utf8',
  );

  it('DailyTasksFirstVisitModal остаётся отключённой в проде (return null вне previewOnly)', () => {
    // Если модалку снова включат — этот тест упадёт, и автор обязан вернуть живой ownState
    // для ключа 'dailyPlan' вместе с рабочим closeDailyPlanModal (иначе тосты снова умрут).
    expect(modalSource).toContain('if (!previewOnly) return null;');
  });

  it("_layout.tsx НЕ передаёт живой dailyPlanModalDue в useOverlayVisible('dailyPlan', ...)", () => {
    // Запрещаем именно ту строку, что вызывала залипание слота.
    expect(layoutSource).not.toContain("useOverlayVisible('dailyPlan', dailyPlanModalDue)");
  });

  it("_layout.tsx гейтит 'dailyPlan' константой false, пока модалка отключена", () => {
    expect(layoutSource).toContain("useOverlayVisible('dailyPlan', false)");
  });

  it('если dailyPlan не просит слот — тосты получают единственный слот арбитра', () => {
    // Симуляция исправленного состояния: dailyPlan НЕ в wantsMap, тост просит слот.
    expect(resolveNextOverlay(null, wants('actionToast'))).toBe('actionToast');
    expect(resolveNextOverlay(null, wants('achievementToast', 'dailyTaskRewardToast'))).toBe(
      'achievementToast',
    );
  });

  it('документирует баг: пока dailyPlan держит слот, тосты голодают (нерегрессивный инвариант)', () => {
    // dailyPlan выше всех тостов по приоритету и непреемптивен — поэтому его нельзя
    // оставлять «вечно желающим», если его модалка не может закрыться.
    expect(resolveNextOverlay('dailyPlan', wants('dailyPlan', 'actionToast'))).toBe('dailyPlan');
    expect(resolveNextOverlay(null, wants('dailyPlan', 'actionToast'))).toBe('dailyPlan');
  });
});
