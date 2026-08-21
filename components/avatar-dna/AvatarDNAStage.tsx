import React, { memo, useMemo } from 'react';
import { StyleSheet, View, type ImageStyle, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import rig from '../../config/avatar-dna/human_v1.rig.json';
import { avatarCatalog } from '../../modules/avatar-dna/catalog';
import type { AvatarCamera, AvatarDNA } from '../../modules/avatar-dna/contracts';
import { resolveAvatarDNA } from '../../modules/avatar-dna/resolver';

type Props = Readonly<{
  dna: AvatarDNA;
  camera: AvatarCamera;
  size: number;
  accessibilityLabel?: string;
}>;

type Crop = readonly [number, number, number, number];

const parseCrop = (value: readonly number[]): Crop => {
  if (value.length !== 4 || value.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new TypeError('avatar_rig_invalid: crop');
  }
  return [value[0], value[1], value[2], value[3]];
};

const PORTRAIT_CROP = parseCrop(rig.portraitCrop);
const STUDIO_CROP = parseCrop(rig.studioCrop);

const cropForCamera = (camera: AvatarCamera): Crop => (
  camera === 'portrait' ? PORTRAIT_CROP : STUDIO_CROP
);

const layerGeometry = (size: number, camera: AvatarCamera): ImageStyle => {
  const [x, y, width, height] = cropForCamera(camera);
  const scale = Math.max(1 / width, 1 / height);
  const renderedSize = size * scale;
  return {
    position: 'absolute',
    width: renderedSize,
    height: renderedSize,
    left: size / 2 - (x + width / 2) * renderedSize,
    top: size / 2 - (y + height / 2) * renderedSize,
  };
};

export const AvatarDNAStage = memo(function AvatarDNAStage({
  dna,
  camera,
  size,
  accessibilityLabel = 'Avatar',
}: Props) {
  const layers = useMemo(() => resolveAvatarDNA(dna, avatarCatalog).layers, [dna]);
  const imageStyle = useMemo(() => layerGeometry(size, camera), [camera, size]);
  const stageStyle = useMemo<ViewStyle>(() => ({ width: size, height: size }), [size]);

  return (
    <View
      testID="avatar-dna-stage"
      pointerEvents="none"
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[styles.stage, stageStyle]}
    >
      {layers.map((layer) => (
        <Image
          key={layer.id}
          testID={`avatar-layer-${layer.id}`}
          source={{ uri: layer.file }}
          contentFit="fill"
          cachePolicy="memory-disk"
          pointerEvents="none"
          accessible={false}
          accessibilityLabel={layer.id}
          style={imageStyle}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  stage: {
    position: 'relative',
    overflow: 'hidden',
  },
});
