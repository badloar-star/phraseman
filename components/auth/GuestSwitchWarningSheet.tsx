// ═══════════════════════════════════════════════════════════════════════════
// GuestSwitchWarningSheet.tsx — шторка «Войти в другой аккаунт?» для гостя с прогрессом.
//
// зачем (владелец: гость с прогрессом входит в ДРУГОЙ, уже существующий аккаунт — одно честное предупреждение «прогресс на этом телефоне
// не привязан к аккаунту и пропадёт»; макет Макетов docs/design/v2-app/guest-switch-warning.html, b973ac57d; вид поручен координатором 18.10).
// Строго по макету: шторка снизу, плитка-значок 60, заголовок 21/27, текст 16/22 вторым цветом, кнопки 52 (радиус 26) с зазором 12;
// «Войти» — главная заливка темы (ctaFill), «Отмена» — второй тон (buttonFill) с тенью; смахивание вниз = «Отмена». Тёмная и светлая — токены темы.
// Подключение в поток входа делает Авторизация; тексты — guestSignInOtherAccountCopy (только чтение).
//
// Защита от двойного тапа: после «Войти» обе кнопки сразу неактивны и шторка не закрывается жестом (иначе поздний «Отмена» перебил бы вход).
// Журнал [AUTH-SWITCH-SHEET]: показ и выбор (подтверждение / отмена кнопкой / отмена жестом-фоном); имя аккаунта в журнал не пишется.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { guestSignInOtherAccountCopy } from '../../app/account_switch_copy';
import { hapticTap } from '../../hooks/use-haptics';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
import { actionBoxShadow, nestedBoxShadow } from '../v2/ShadowSurface';

const LOG = '[AUTH-SWITCH-SHEET]';

export type GuestSwitchWarningSheetProps = Readonly<{
  visible: boolean;
  /** Подпись аккаунта, в который входим (для читалки); на экране не рисуется — макет её не содержит. */
  accountLabel?: string;
  /** «Войти»: вход продолжается; шторку закрывает вызывающий (visible → false). */
  onConfirm: () => void;
  /** «Отмена», смахивание вниз, фон, системная «назад»: остаёмся гостем. */
  onCancel: () => void;
}>;

/** Значок плитки из макета: человек и две стрелки обмена (viewBox 24, штрих 1,8). */
function SwitchIcon({ color }: Readonly<{ color: string }>) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={9} cy={8} r={3.2} />
      <Path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6" />
      <Path d="M16 7h5m0 0-2-2m2 2-2 2" />
      <Path d="M21 13h-5m0 0 2-2m-2 2 2 2" />
    </Svg>
  );
}

function GuestSwitchWarningSheet({ visible, accountLabel, onConfirm, onCancel }: GuestSwitchWarningSheetProps) {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const copy = guestSignInOtherAccountCopy(lang);
  // решение принято один раз за показ: ref — мгновенная защита (до перерисовки), state — внешний вид «неактивно»
  const decidedRef = useRef<'confirm' | 'cancel' | null>(null);
  const cancelByButtonRef = useRef(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    decidedRef.current = null;
    cancelByButtonRef.current = false;
    setConfirmed(false);
    console.log(LOG, 'show', JSON.stringify({ lang, hasAccountLabel: Boolean(accountLabel) })); // guard-ok: показ шторки; имя аккаунта не пишем
    // lang и подпись читаются в момент показа; перерисовка при их смене журнал не повторяет
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const confirm = useCallback(() => {
    if (decidedRef.current) {
      console.log(LOG, 'tap ignored', JSON.stringify({ button: 'confirm', already: decidedRef.current })); // guard-ok: ранний выход называет причину
      return;
    }
    decidedRef.current = 'confirm';
    setConfirmed(true); // Optimistic UI: кнопки гаснут на том же тапе
    hapticTap();
    console.log(LOG, 'choice', JSON.stringify({ choice: 'confirm' })); // guard-ok: выбор
    onConfirm();
  }, [onConfirm]);

  // единый путь отмены: и кнопка (через requestDismiss оболочки), и жест/фон/«назад» приходят сюда один раз
  const handleClose = useCallback(() => {
    if (decidedRef.current) {
      console.log(LOG, 'close ignored', JSON.stringify({ already: decidedRef.current })); // guard-ok: ранний выход называет причину
      return;
    }
    decidedRef.current = 'cancel';
    console.log(LOG, 'choice', JSON.stringify({ choice: 'cancel', via: cancelByButtonRef.current ? 'button' : 'swipe_or_backdrop' })); // guard-ok: выбор
    onCancel();
  }, [onCancel]);

  return (
    <HybridSheetShell
      visible={visible}
      onClose={handleClose}
      closeLabel={copy.cancel}
      dismissDisabled={confirmed}
      backdropAccessible={false}
      material="liquid-glass"
      testID="guest-switch-warning-sheet"
    >
      {({ requestDismiss }) => (
        <View style={s.content}>
          {/* зачем (Темы 18.10, проверка 138 сочетаний тем): opaqueControl давал тон к шторке 1,00 — плитка невидима; buttonFill ≥ 1,74, значок text ≥ 11,99, плюс малая тень как у «Отмены» */}
          <View style={[s.tile, { backgroundColor: g.buttonFill, boxShadow: nestedBoxShadow(g) }]}>
            <SwitchIcon color={g.text} />
          </View>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[s.title, { color: g.text }]}>{copy.title}</Text>
          <Text maxFontSizeMultiplier={1.3} style={[s.body, { color: g.secondary }]}>{copy.body}</Text>
          <View style={s.actions}>
            <Pressable
              testID="guest-switch-confirm"
              accessibilityRole="button"
              accessibilityLabel={accountLabel ? `${copy.confirm}: ${accountLabel}` : copy.confirm}
              accessibilityState={{ disabled: confirmed }}
              disabled={confirmed}
              onPress={confirm}
              style={({ pressed }) => [s.button, { backgroundColor: g.ctaFill, boxShadow: actionBoxShadow(g) }, confirmed ? s.dim : null, pressed && !confirmed ? s.pressed : null]}
            >
              <Text maxFontSizeMultiplier={1.3} style={[s.buttonText, { color: g.ctaFillInk }]}>{copy.confirm}</Text>
            </Pressable>
            <Pressable
              testID="guest-switch-cancel"
              accessibilityRole="button"
              accessibilityLabel={copy.cancel}
              accessibilityState={{ disabled: confirmed }}
              disabled={confirmed}
              onPress={() => {
                if (decidedRef.current) return;
                hapticTap();
                cancelByButtonRef.current = true;
                requestDismiss();
              }}
              style={({ pressed }) => [s.button, { backgroundColor: g.buttonFill, boxShadow: nestedBoxShadow(g) }, confirmed ? s.dim : null, pressed && !confirmed ? s.pressed : null]}
            >
              <Text maxFontSizeMultiplier={1.3} style={[s.buttonText, { color: g.text }]}>{copy.cancel}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </HybridSheetShell>
  );
}

export default memo(GuestSwitchWarningSheet);

// макет `.ic` 60 радиус 18 (сверху 22), `.st` 21/27 700 (сверху 16), `.sm` 16/22 (сверху 8, до 300 шириной), `.acts` зазор 12 (сверху 24), `.btn` 52 радиус 26 16/700
const s = StyleSheet.create({
  content: { alignItems: 'center', paddingTop: 6 },
  tile: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  title: { fontSize: 21, lineHeight: 27, fontWeight: '700', textAlign: 'center', marginTop: 16 },
  body: { fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 8, maxWidth: 300 },
  actions: { alignSelf: 'stretch', gap: 12, marginTop: 24 },
  button: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  pressed: { transform: [{ scale: 0.97 }] },
  dim: { opacity: 0.55 },
});
