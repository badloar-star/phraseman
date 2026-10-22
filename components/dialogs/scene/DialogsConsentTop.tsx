// ═══════════════════════════════════════════════════════════════════════════
// DialogsConsentTop.tsx — верх листа «Включить AI-диалоги?»: живой мини-диалог на свету темы и маленький герой в углу (вариант «в», выбор владельца 22.10).
//
// зачем (владелец: огромные буквы-заглушки «М»/«Д» в листе не нравятся; эталон docs/design/v2-app/dialogs-consent-variants.html, телефон «в»): пузыри переписки — прежний
// DialogueConsentChatReplay (приходит как children, без правок), под ними — подложка сцены из токенов выбранной темы, справа сверху — предмет dialogs_scene_consent 70×70
// (до регистрации файла в реестре картинок — заглушка, как у сцены). Отступ справа 92 даёт место герою, чтобы пузыри не заезжали на него. Касаний верх не ловит: принять/отклонить —
// только кнопки листа. Показывается только при DIALOGS_SCENE_V2_ENABLED (решает AiDialogConsentModal).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedArtLayers } from '../../theme/ThemedArtLayers';
import { useTheme } from '../../ThemeContext';
import { useLv2Glass } from '../../learning-v2/LearningV2Glass';
import DialogsSceneBackdrop from './DialogsSceneBackdrop';
import { resolveDialogsSceneArt } from './dialogs_scene_art';
import { dialogsSceneColors } from './dialogs_scene_tokens';

const CORNER = 70;

function DialogsConsentTop({ children }: Readonly<{ children: React.ReactNode }>) {
  const g = useLv2Glass();
  const { liquidGlassAppearance } = useTheme();
  const colors = useMemo(() => dialogsSceneColors(g), [g]);
  const art = useMemo(() => resolveDialogsSceneArt('consent', liquidGlassAppearance), [liquidGlassAppearance]);
  return (
    <View testID="dialogs-consent-top" style={s.top}>
      <DialogsSceneBackdrop colors={colors} idPrefix="dlgConsent" />
      {art.base ? (
        <View pointerEvents="none" style={s.corner}>
          <ThemedArtLayers source={art.base} accent={art.accent} style={s.cornerImage} contentFit="contain" contentPosition="center" />
        </View>
      ) : null}
      <View style={s.chat}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  // зачем: подложка и свет — как у верха листа в эталоне (.sheet-art.sc); скругление и обрезка по краям блока
  top: { borderRadius: 24, overflow: 'hidden', marginBottom: 14 },
  corner: { position: 'absolute', right: 10, top: 8, width: CORNER, height: CORNER, opacity: 0.95 },
  cornerImage: { width: CORNER, height: CORNER },
  // зачем: справа 92 — место герою (эталон `.cv-chat padding: 16px 92px 8px 18px`)
  chat: { paddingTop: 16, paddingRight: 92, paddingBottom: 8, paddingLeft: 18 },
});

export default memo(DialogsConsentTop);
