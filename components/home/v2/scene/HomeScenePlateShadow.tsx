// ═══════════════════════════════════════════════════════════════════════════
// HomeScenePlateShadow.tsx — тень плиты сцены Главной запечённой маской (без размытия в кадре).
//
// зачем (владелец кнопкой: ускорение первого кадра Главной; план 4 · ТЕМЫ home_first_frame_effects, шаг 2; ассеты 99165475b): размытая
// boxShadow (blur 26–28) компилирует шейдеры на первом кадре; маска — та же тень, заранее посчитанная скриптом из тех же параметров
// (белая, альфа = тень), красится цветом тени темы. Лежит ПОЗАДИ заливки плиты (заливка — отдельный слой поверх неё): вставки −margin
// от краёв (размер плиты не меряем — тень уже в первом кадре), сдвиг вниз offsetY. Тёмная тема — слой dark, светлая — light + lightSoft
// (как прежние два слоя boxShadow). Касаний не принимает: маска выходит за плиту на 44 dp — иначе выросла бы зона нажатия плитки.
// Лёгкий режим — без тени, как и прежде.
// зачем (Сверка 22.10, тень капсулы «обрывается справа ступенькой»): Image берёт размер из файла явной шириной (RN Image.android.js:
// style = [{width: source.width, height: source.height}, …]) — одни отступы картинку не тянут. Вставки задаёт обёртка, картинка
// заполняет её на 100 % — маска растягивается по фактическому размеру плиты на любом экране.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useSyncExternalStore } from 'react';
import { Image, View, type ImageStyle, type ViewStyle } from 'react-native';

import { isLiteModeOn, subscribeLiteModeFlag } from '../../../../constants/lite_mode_flag';
import { HOME_SCENE_SHADOW_MASKS, type HomeSceneShadowMask } from './home_scene_baked_assets.generated';

export type HomeScenePlateKind = keyof typeof HOME_SCENE_SHADOW_MASKS;

type Props = Readonly<{
  kind: HomeScenePlateKind;
  isLight: boolean;
  /** Цвет тени темы (g.plateShadow) и мягкой (g.plateShadowSoft): у масок альфа нормирована, цвет и сила — отсюда. */
  shadow: string;
  shadowSoft: string;
}>;

/** Слой масок — по размеру плиты (маски выходят за него вставками −margin). */
const FILL: ViewStyle = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 };
/** Картинка заполняет обёртку целиком — процент важнее размера из файла. */
const FULL: ImageStyle = { width: '100%', height: '100%' };

const box = (m: HomeSceneShadowMask): ViewStyle => ({
  position: 'absolute', left: -m.margin, right: -m.margin, top: m.offsetY - m.margin, bottom: -m.offsetY - m.margin,
});

function MaskLayer({ m, tint }: Readonly<{ m: HomeSceneShadowMask; tint: string }>) {
  return (
    <View pointerEvents="none" style={box(m)}>
      <Image accessible={false} source={m.source} resizeMode="stretch" fadeDuration={0} style={[FULL, { tintColor: tint }]} />
    </View>
  );
}

function HomeScenePlateShadow({ kind, isLight, shadow, shadowSoft }: Props) {
  const lite = useSyncExternalStore(subscribeLiteModeFlag, isLiteModeOn, isLiteModeOn);
  if (lite) return null;
  const set = HOME_SCENE_SHADOW_MASKS[kind];
  return (
    <View pointerEvents="none" style={FILL}>
      {isLight ? (
        <>
          <MaskLayer m={set.light} tint={shadow} />
          <MaskLayer m={set.lightSoft} tint={shadowSoft} />
        </>
      ) : (
        <MaskLayer m={set.dark} tint={shadow} />
      )}
    </View>
  );
}

export default memo(HomeScenePlateShadow);
