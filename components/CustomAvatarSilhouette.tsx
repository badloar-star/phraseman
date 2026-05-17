import React from 'react';
import { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';

type Props = {
  avatarId: string;
  primary: string;
  secondary: string;
};

const CUSTOM_SILHOUETTE_IDS = new Set([
  'custom-gen-01',
  'custom-gen-02',
  'custom-gen-03',
  'custom-gen-04',
  'custom-gen-05',
  'custom-gen-06',
  'custom-gen-07',
  'custom-gen-08',
  'custom-gen-09',
  'custom-gen-10',
]);

export const isCustomAvatarSilhouette = (avatarId?: string): boolean =>
  !!avatarId && CUSTOM_SILHOUETTE_IDS.has(avatarId);

export default function CustomAvatarSilhouette({ avatarId, primary, secondary }: Props) {
  const detail = {
    fill: 'none' as const,
    stroke: secondary,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (avatarId) {
    case 'custom-gen-01':
      return (
        <G>
          <Path fill={primary} d="M13 91 C16 73 25 60 38 55 L50 65 L62 55 C75 60 84 73 87 91 Z" />
          <Path fill={primary} d="M34 52 C36 39 42 31 50 31 C58 31 64 39 66 52 C61 59 39 59 34 52 Z" />
          <Polygon fill={primary} points="50,8 26,44 74,44" />
          <Path fill={secondary} d="M42 37 L50 19 L58 37 Z" opacity={0.9} />
          <Path {...detail} d="M31 74 C41 67 59 67 69 74" strokeWidth={3} />
          <Path fill={primary} d="M77 31 H83 V88 H77 Z" />
          <Circle cx={80} cy={23} r={8} fill={primary} />
          <Circle cx={80} cy={23} r={3.6} fill={secondary} opacity={0.92} />
        </G>
      );
    case 'custom-gen-02':
      return (
        <G>
          <Path fill={primary} d="M16 92 C20 71 31 58 43 55 L50 66 L57 55 C70 58 80 71 84 92 Z" />
          <Path fill={primary} d="M25 54 C27 31 38 15 50 12 C62 15 73 31 75 54 C70 65 30 65 25 54 Z" />
          <Path fill={secondary} d="M38 49 C40 39 44 34 50 34 C56 34 60 39 62 49 C58 53 42 53 38 49 Z" opacity={0.92} />
          <Path fill={secondary} d="M39 21 C31 25 28 35 31 44 C23 36 25 23 39 16 Z" opacity={0.92} />
          <Path {...detail} d="M31 74 C39 79 61 79 69 74" strokeWidth={3} />
          <Path {...detail} d="M50 64 V88" strokeWidth={2.6} />
        </G>
      );
    case 'custom-gen-03':
      return (
        <G>
          <Path fill={primary} d="M15 91 C20 70 31 59 43 55 H57 C69 59 80 70 85 91 Z" />
          <Circle cx={50} cy={43} r={12} fill={primary} />
          <Polygon fill={primary} points="24,30 50,18 76,30 50,42" />
          <Rect x={70} y={31} width={6} height={18} rx={3} fill={primary} />
          <Path fill={secondary} d="M33 68 H67 V85 H33 Z" opacity={0.92} />
          <Path fill={primary} d="M38 72 H62 V82 H38 Z" />
          <Path {...detail} d="M43 43 H57 M50 55 V64" strokeWidth={2.7} />
        </G>
      );
    case 'custom-gen-04':
      return (
        <G>
          <Path fill={primary} d="M14 92 C18 72 29 59 41 55 C37 72 42 83 50 92 C58 83 63 72 59 55 C71 59 82 72 86 92 Z" />
          <Path fill={primary} d="M30 53 C31 31 39 16 50 11 C61 16 69 31 70 53 C64 62 36 62 30 53 Z" />
          <Path fill={secondary} d="M50 17 C45 24 43 35 45 47 C39 39 40 25 50 17 Z" opacity={0.9} />
          <Circle cx={50} cy={39} r={4.4} fill={secondary} opacity={0.92} />
          <Path {...detail} d="M28 73 C38 69 62 69 72 73 M36 82 C44 79 56 79 64 82" strokeWidth={2.8} />
        </G>
      );
    case 'custom-gen-05':
      return (
        <G>
          <Path fill={primary} d="M12 91 C17 70 29 59 40 54 L50 67 L60 54 C71 59 83 70 88 91 Z" />
          <Path fill={primary} d="M32 50 C34 36 41 27 50 27 C59 27 66 36 68 50 C63 57 37 57 32 50 Z" />
          <Polygon fill={primary} points="27,36 50,12 73,36 62,34 50,26 38,34" />
          <Path {...detail} d="M27 49 C19 55 19 67 27 73 M73 49 C81 55 81 67 73 73" strokeWidth={4} />
          <Path {...detail} d="M34 66 C42 61 58 61 66 66 M50 67 V88" strokeWidth={2.8} />
        </G>
      );
    case 'custom-gen-06':
      return (
        <G>
          <Path fill={primary} d="M13 92 C16 71 28 57 42 54 L50 67 L58 54 C72 57 84 71 87 92 Z" />
          <Path fill={primary} d="M31 54 C34 34 42 22 50 22 C58 22 66 34 69 54 C63 60 37 60 31 54 Z" />
          <Path fill={primary} d="M23 57 C28 46 36 39 50 39 C64 39 72 46 77 57 C67 53 33 53 23 57 Z" />
          <Ellipse cx={43} cy={43} rx={6} ry={5} fill={secondary} opacity={0.92} />
          <Ellipse cx={57} cy={43} rx={6} ry={5} fill={secondary} opacity={0.92} />
          <Path {...detail} d="M49 43 H51 M38 73 L50 84 L62 73" strokeWidth={2.7} />
          <Rect x={69} y={62} width={12} height={24} rx={2.5} fill={primary} />
          <Path {...detail} d="M73 68 H77 M73 74 H77" strokeWidth={2.1} />
        </G>
      );
    case 'custom-gen-07':
      return (
        <G>
          <Path fill={primary} d="M12 91 C15 69 27 57 42 53 L50 67 L58 53 C73 57 85 69 88 91 Z" />
          <Path fill={primary} d="M35 56 C37 43 42 34 50 34 C58 34 63 43 65 56 C60 63 40 63 35 56 Z" />
          <Path fill={primary} d="M18 42 C27 27 38 19 50 17 C62 19 73 27 82 42 C64 36 36 36 18 42 Z" />
          <Path fill={secondary} d="M28 43 C39 39 61 39 72 43 C61 46 39 46 28 43 Z" opacity={0.92} />
          <Path {...detail} d="M38 69 C45 76 55 76 62 69" strokeWidth={3} />
          <Path fill={primary} d="M75 49 H80 V89 H75 Z" />
          <Polygon fill={secondary} points="77.5,39 83,50 72,50" opacity={0.9} />
        </G>
      );
    case 'custom-gen-08':
      return (
        <G>
          <Path fill={primary} d="M15 92 C18 72 30 59 42 55 L50 67 L58 55 C70 59 82 72 85 92 Z" />
          <Path fill={primary} d="M28 50 C29 32 38 20 50 20 C62 20 71 32 72 50 C65 62 35 62 28 50 Z" />
          <Path fill={primary} d="M23 31 C31 17 41 10 50 10 C59 10 69 17 77 31 C62 27 38 27 23 31 Z" />
          <Circle cx={50} cy={42} r={4.5} fill={secondary} opacity={0.94} />
          <Path {...detail} d="M35 43 C39 39 43 39 47 43 M53 43 C57 39 61 39 65 43" strokeWidth={2.5} />
          <Path fill={secondary} d="M30 71 C39 64 61 64 70 71 L65 84 H35 Z" opacity={0.92} />
          <Path fill={primary} d="M38 74 H62 L60 80 H40 Z" />
        </G>
      );
    case 'custom-gen-09':
      return (
        <G>
          <Path fill={primary} d="M14 92 C19 72 31 59 44 55 H56 C69 59 81 72 86 92 Z" />
          <Path fill={primary} d="M33 54 C34 38 41 28 50 28 C59 28 66 38 67 54 C62 62 38 62 33 54 Z" />
          <Path fill={primary} d="M30 29 C35 20 42 15 50 15 C58 15 65 20 70 29 C59 27 41 27 30 29 Z" />
          <Path fill={secondary} d="M25 26 C31 20 37 19 42 23 C36 24 31 27 27 33 Z" opacity={0.9} />
          <Path fill={secondary} d="M75 26 C69 20 63 19 58 23 C64 24 69 27 73 33 Z" opacity={0.9} />
          <Path {...detail} d="M39 70 C46 75 54 75 61 70 M39 80 H61" strokeWidth={3} />
          <Rect x={68} y={65} width={11} height={23} rx={5.5} fill={primary} />
          <Path {...detail} d="M72 72 H76" strokeWidth={2} />
        </G>
      );
    case 'custom-gen-10':
      return (
        <G>
          <Path fill={primary} d="M13 92 C17 71 29 58 42 55 L50 67 L58 55 C71 58 83 71 87 92 Z" />
          <Path fill={primary} d="M31 52 C33 35 40 25 50 25 C60 25 67 35 69 52 C63 60 37 60 31 52 Z" />
          <Polygon fill={primary} points="28,25 50,10 72,25 64,35 36,35" />
          <Path fill={secondary} d="M39 41 H47 V48 H39 Z M53 41 H61 V48 H53 Z" opacity={0.92} />
          <Path {...detail} d="M47 44 H53 M37 71 H63 M33 79 H67" strokeWidth={2.7} />
          <Path fill={secondary} d="M27 61 H73 V69 H27 Z" opacity={0.92} />
          <Path fill={primary} d="M31 63 H69 V67 H31 Z" />
        </G>
      );
    default:
      return null;
  }
}
