import assert from 'node:assert/strict';
// зачем (10.10): файл *.test.ts запускает основной юнит-раннер — глобальный test вместо node:test (иначе «0 тестов»).

type LayoutModule = typeof import('../components/energy/energy_info_popover_layout');

async function loadLayout(): Promise<Partial<LayoutModule>> {
  try {
    return await import('../components/energy/energy_info_popover_layout');
  } catch {
    return {};
  }
}

test('popover geometry honors left and right safe areas at its preferred width', async () => {
  const module = await loadLayout();
  const actual = module.computeEnergyInfoPopoverLayout?.({
    windowWidth: 390,
    windowHeight: 844,
    insets: { top: 47, right: 21, bottom: 34, left: 19 },
    anchor: { x: 320, y: 80, w: 24, h: 24 },
    measuredHeight: 140,
  });
  assert.deepEqual(actual, {
    width: 220,
    maxHeight: 690,
    left: 141,
    top: 112,
    arrowLeft: 184,
    placement: 'below',
    showArrow: true,
  });
});

test('popover geometry remains valid on a narrower-than-220 viewport', async () => {
  const module = await loadLayout();
  const actual = module.computeEnergyInfoPopoverLayout?.({
    windowWidth: 210,
    windowHeight: 400,
    insets: { top: 10, right: 18, bottom: 12, left: 14 },
    anchor: { x: 0, y: 20, w: 20, h: 24 },
    measuredHeight: 120,
  });
  assert.deepEqual(actual, {
    width: 162,
    maxHeight: 328,
    left: 22,
    top: 52,
    arrowLeft: 12,
    placement: 'below',
    showArrow: false,
  });
});

test('popover geometry moves above a bottom anchor and attaches a bottom arrow', async () => {
  const module = await loadLayout();
  const actual = module.computeEnergyInfoPopoverLayout?.({
    windowWidth: 720,
    windowHeight: 260,
    insets: { top: 18, right: 30, bottom: 22, left: 28 },
    anchor: { x: 340, y: 205, w: 40, h: 17 },
    measuredHeight: 120,
  });
  assert.deepEqual(actual, {
    width: 220,
    maxHeight: 171,
    left: 340,
    top: 77,
    arrowLeft: 13,
    placement: 'above',
    showArrow: true,
  });
});

test('popover geometry caps huge-font content above without overlapping a landscape anchor', async () => {
  const module = await loadLayout();
  const anchor = { x: 340, y: 218, w: 40, h: 30 };
  const actual = module.computeEnergyInfoPopoverLayout?.({
    windowWidth: 720,
    windowHeight: 260,
    insets: { top: 18, right: 30, bottom: 22, left: 28 },
    anchor,
    measuredHeight: 600,
  });
  assert.deepEqual(actual, {
    width: 220,
    maxHeight: 184,
    left: 340,
    top: 26,
    arrowLeft: 13,
    placement: 'above',
    showArrow: false,
  });
  assert.ok(actual, 'expected layout');
  assert.ok(actual.top + Math.min(600, actual.maxHeight) <= anchor.y - 8);
});

test('popover with no usable anchor stays inside insets and suppresses the arrow', async () => {
  const module = await loadLayout();
  const noAnchor = module.computeEnergyInfoPopoverLayout?.({
    windowWidth: 390,
    windowHeight: 844,
    insets: { top: 47, right: 21, bottom: 34, left: 19 },
    anchor: null,
    measuredHeight: 140,
  });
  const offscreenAnchor = module.computeEnergyInfoPopoverLayout?.({
    windowWidth: 390,
    windowHeight: 844,
    insets: { top: 47, right: 21, bottom: 34, left: 19 },
    anchor: { x: 900, y: 80, w: 24, h: 24 },
    measuredHeight: 140,
  });
  assert.deepEqual(noAnchor, {
    width: 220,
    maxHeight: 747,
    left: 84,
    top: 55,
    arrowLeft: 103,
    placement: 'below',
    showArrow: false,
  });
  assert.equal(offscreenAnchor?.showArrow, false);
  assert.ok(offscreenAnchor && offscreenAnchor.left >= 27);
  assert.ok(offscreenAnchor && offscreenAnchor.left + offscreenAnchor.width <= 361);
});

test('oversized content stays inside vertical safe bounds for anchors beyond either edge', async () => {
  const module = await loadLayout();
  const input = {
    windowWidth: 390,
    windowHeight: 844,
    insets: { top: 47, right: 21, bottom: 34, left: 19 },
    measuredHeight: 1200,
  } as const;
  const layouts = [
    module.computeEnergyInfoPopoverLayout?.({ ...input, anchor: { x: 120, y: -400, w: 24, h: 24 } }),
    module.computeEnergyInfoPopoverLayout?.({ ...input, anchor: { x: 120, y: 1000, w: 24, h: 24 } }),
  ];
  for (const layout of layouts) {
    assert.ok(layout, 'expected layout');
    assert.ok(layout.top >= 55);
    assert.ok(layout.top + Math.min(input.measuredHeight, layout.maxHeight) <= 802);
    assert.equal(layout.showArrow, false);
  }
});

test('lifecycle generations reject an interrupted close after reopen', async () => {
  const module = await loadLayout();
  const gate = module.createEnergyPopoverLifecycleGate?.();
  const firstOpen = gate?.begin();
  assert.equal(gate?.startClosing(firstOpen ?? -1), true);
  assert.equal(gate?.canEnter(), false);
  const closing = firstOpen;
  const reopened = gate?.begin();
  assert.equal(gate?.isCurrent(firstOpen ?? -1), false);
  assert.equal(gate?.isCurrent(closing ?? -1), false);
  assert.equal(gate?.isCurrent(reopened ?? -1), true);
  assert.equal(gate?.canEnter(), true);
  gate?.invalidate();
  assert.equal(gate?.isCurrent(reopened ?? -1), false);
});

test('render intent preserves a pending open until committed owner loss rejects its callback', async () => {
  const module = await loadLayout();
  const gate = module.createEnergyPopoverRequestGate?.();
  const pendingMeasure = gate?.begin();
  const renderedEligibility = false;
  assert.equal(gate?.isCurrent(pendingMeasure ?? -1), true, 'render must not mutate the committed gate');
  if (!renderedEligibility) gate?.invalidate(); // Models the hosts' committed layout effect.
  assert.equal(gate?.isCurrent(pendingMeasure ?? -1), false);
  const nextOwnerOpen = gate?.begin();
  assert.equal(gate?.isCurrent(nextOwnerOpen ?? -1), true);
  assert.equal(gate?.isCurrent(pendingMeasure ?? -1), false);
});
