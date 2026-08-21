import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import type { Avatar3DRenderPlan } from '../../modules/avatar-dna-3d/contracts';
import type { Avatar3DPrewarm } from '../../modules/avatar-dna-3d/prewarm';
import { Avatar3DScene } from './Avatar3DScene';

type Props = Readonly<{
  plan: Avatar3DRenderPlan;
  prewarm: Avatar3DPrewarm;
  size: number;
  backgroundColor?: string;
}>;

export function Avatar3DStage({ plan, prewarm, size, backgroundColor = '#F9EDE1' }: Props) {
  const [ready, setReady] = useState(prewarm.isReady());

  useEffect(() => {
    let active = true;
    void prewarm.ready().then(() => {
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, [prewarm]);

  if (!ready) return <View testID="avatar-3d-prewarming" style={{ width: size, height: size }} />;

  return (
    <Canvas
      camera={{ position: [0, 0, 5] }}
      frameloop="demand"
      onCreated={(state) => state.invalidate()}
      style={[styles.canvas, { width: size, height: size, backgroundColor }]}
    >
      <React.Suspense fallback={null}>
        <Avatar3DScene plan={plan} />
      </React.Suspense>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {},
});
