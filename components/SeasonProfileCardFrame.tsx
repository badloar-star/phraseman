import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SEASON_PROFILE_CARD_FRAME_COLORS } from '../app/season_pass_track_config';

type Props = {
  radius?: number;
};

/**
 * Adaptive Season 1 frame for the complete user card (the profile bottom sheet).
 * It intentionally uses vector-like borders instead of stretching the reward
 * thumbnail, so the frame follows every profile-card level and screen height.
 */
function SeasonProfileCardFrame({ radius = 30 }: Props) {
  const roundedTop = {
    borderTopLeftRadius: radius,
    borderTopRightRadius: radius,
  };

  return (
    <View
      testID="season-profile-card-frame"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFillObject, styles.root]}
    >
      <View
        style={[
          StyleSheet.absoluteFillObject,
          roundedTop,
          styles.highlight,
        ]}
      />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          roundedTop,
          styles.main,
        ]}
      />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          roundedTop,
          styles.deep,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 24,
  },
  highlight: {
    borderWidth: 1,
    borderColor: SEASON_PROFILE_CARD_FRAME_COLORS.highlight,
  },
  main: {
    margin: 1,
    borderWidth: 2,
    borderColor: SEASON_PROFILE_CARD_FRAME_COLORS.main,
    opacity: 0.92,
  },
  deep: {
    margin: 4,
    borderWidth: 1,
    borderColor: SEASON_PROFILE_CARD_FRAME_COLORS.deep,
    opacity: 0.58,
  },
});

export default memo(SeasonProfileCardFrame);
