import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

import DialogueTargetBoundary from '../components/dialogs/DialogueTargetBoundary';
import {
  settleDialogEnergyStart,
  useMountedInstanceRef,
  type DialogEnergyStartResult,
} from '../app/ai_dialog_energy_settlement';

jest.mock('react-native', () => ({
  Text: 'Text',
  View: 'View',
  StyleSheet: { flatten: (style: unknown) => style },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function Harness(props: {
  result: Promise<DialogEnergyStartResult>;
  acknowledge: jest.Mock;
  navigateBack: jest.Mock;
  showNoEnergy: jest.Mock;
}) {
  const mounted = useMountedInstanceRef();
  useEffect(() => {
    void props.result.then((result) => settleDialogEnergyStart({
      result,
      mounted: mounted.current,
      acknowledge: props.acknowledge,
      navigateBack: props.navigateBack,
      showNoEnergy: props.showNoEnergy,
    }));
  }, [mounted, props]);
  return <Text>session</Text>;
}

describe('dialog energy settlement across target remounts', () => {
  it('acknowledges an old durable spend but never lets the unmounted target navigate or mutate UI', async () => {
    const old = deferred<DialogEnergyStartResult>();
    const current = deferred<DialogEnergyStartResult>();
    const acknowledge = jest.fn();
    const navigateBack = jest.fn();
    const showNoEnergy = jest.fn();
    const screen = await render(
      <DialogueTargetBoundary target="es">
        <Harness result={old.promise} acknowledge={acknowledge} navigateBack={navigateBack} showNoEnergy={showNoEnergy} />
      </DialogueTargetBoundary>,
    );
    await screen.rerender(
      <DialogueTargetBoundary target="de">
        <Harness result={current.promise} acknowledge={acknowledge} navigateBack={navigateBack} showNoEnergy={showNoEnergy} />
      </DialogueTargetBoundary>,
    );

    old.resolve('spent');
    await Promise.resolve();
    expect(acknowledge).toHaveBeenCalledTimes(1);
    expect(navigateBack).not.toHaveBeenCalled();
    expect(showNoEnergy).not.toHaveBeenCalled();

    current.resolve('cancelled');
    await Promise.resolve();
    expect(navigateBack).toHaveBeenCalledTimes(1);
  });

  it('ignores a cancelled result from the old target', async () => {
    const old = deferred<DialogEnergyStartResult>();
    const acknowledge = jest.fn();
    const navigateBack = jest.fn();
    const showNoEnergy = jest.fn();
    const screen = await render(
      <DialogueTargetBoundary target="es">
        <Harness result={old.promise} acknowledge={acknowledge} navigateBack={navigateBack} showNoEnergy={showNoEnergy} />
      </DialogueTargetBoundary>,
    );
    await screen.rerender(<DialogueTargetBoundary target="de"><Text>new</Text></DialogueTargetBoundary>);
    old.resolve('cancelled');
    await Promise.resolve();
    expect(acknowledge).not.toHaveBeenCalled();
    expect(navigateBack).not.toHaveBeenCalled();
    expect(showNoEnergy).not.toHaveBeenCalled();
  });

  it('ignores an insufficient result from the old target', async () => {
    const old = deferred<DialogEnergyStartResult>();
    const acknowledge = jest.fn();
    const navigateBack = jest.fn();
    const showNoEnergy = jest.fn();
    const screen = await render(
      <DialogueTargetBoundary target="fr">
        <Harness result={old.promise} acknowledge={acknowledge} navigateBack={navigateBack} showNoEnergy={showNoEnergy} />
      </DialogueTargetBoundary>,
    );
    await screen.rerender(<DialogueTargetBoundary target="de"><Text>new</Text></DialogueTargetBoundary>);
    old.resolve('insufficient');
    await Promise.resolve();
    expect(showNoEnergy).not.toHaveBeenCalled();
  });
});
