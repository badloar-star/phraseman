import React, { useEffect, useMemo } from 'react';
import { useLoader, useThree } from '@react-three/fiber/native';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Mesh, MeshStandardMaterial, Object3D } from 'three';
import type { Avatar3DRenderPlan } from '../../modules/avatar-dna-3d/contracts';
import { HUMAN_V2_BASE_ASSET } from '../../modules/avatar-dna-3d/local_assets';

type Props = Readonly<{ plan: Avatar3DRenderPlan }>;

const isMesh = (node: Object3D): node is Mesh => Boolean((node as Mesh).isMesh);

export function Avatar3DScene({ plan }: Props) {
  const invalidate = useThree((state) => state.invalidate);
  const gltf = useLoader(GLTFLoader, HUMAN_V2_BASE_ASSET.localUri ?? HUMAN_V2_BASE_ASSET.uri);
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    const activeMeshes = new Set(plan.visibleMeshIds);
    const facePreset = plan.morphWeights.head_width === 0.15
      ? 0
      : plan.morphWeights.jaw_shape === -0.2
        ? 1
        : 2;

    model.traverse((node) => {
      if (node.name === 'avatar_hair_wave') node.visible = activeMeshes.has('hair.wave');
      if (node.name === 'avatar_hair_crop') node.visible = activeMeshes.has('hair.crop');
      if (node.name === 'avatar_hood_assassin') node.visible = activeMeshes.has('hood.assassin');
      if (!isMesh(node)) return;

      if (node.name.startsWith('avatar_hair_wave_') || node.name.startsWith('avatar_hair_crop_')) {
        (node.material as MeshStandardMaterial).color.set(plan.materialParams.hairColor);
      }
      if (node.name === 'avatar_head_base' && node.morphTargetInfluences) {
        node.morphTargetInfluences.fill(0);
        node.morphTargetInfluences[facePreset] = 1;
      }
    });
    invalidate();
  }, [invalidate, model, plan]);

  return (
    <group position={[0, -0.05, 0]}>
      <ambientLight intensity={1.65} />
      <directionalLight intensity={1.8} position={[-2, 3, 4]} />
      <directionalLight intensity={0.55} position={[3, 1, 2]} />
      <primitive object={model} />
    </group>
  );
}
