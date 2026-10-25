// DeleteAccountVariantBBody.tsx — окна 1 и 2 удаления аккаунта по макету docs/design/v2-app/account-delete-variant-b.html.
// зачем (владелец 25.10 «Да, так»; сервер 713677ddd): окно 1 — «Удалить через 14 дней» без ввода слова (действие обратимо:
// вход тем же способом возвращает аккаунт), «Отмена» и тихая красная ссылка «Удалить навсегда сейчас»; окно 2 — необратимо:
// «сразу», ввод «УДАЛИТЬ», «Удалить навсегда» неактивна до слова, «Назад». Кнопки на всю ширину столбиком, без обводок.
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { DeleteVariantBCopy } from './delete_account_variant_b_copy';

type Glass = Readonly<{
  text: string;
  secondary: string;
  mutedText: string;
  buttonFill: string;
  opaqueControl: string;
}>;

type Paint = Readonly<{ fill: string; ink: string }>;

export type DeleteAccountVariantBStep = 'grace' | 'now';

export type DeleteAccountVariantBBodyProps = Readonly<{
  step: DeleteAccountVariantBStep;
  glass: Glass;
  fontSizes: Readonly<{ h2: number; body: number; caption: number }>;
  copy: DeleteVariantBCopy;
  title: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmWord: string;
  confirmInput: string;
  confirmMatches: boolean;
  deleting: boolean;
  /** Красная кнопка окна 1 (всегда активна) и ссылка. */
  gracePaint: Paint;
  /** Цвет тихой ссылки «Удалить навсегда сейчас» — semanticInk(glass).badText (замер Тем 55d8d4f9f: 5,80 против 4,81 у сырого bad). */
  linkColor: string;
  /** Красная кнопка окна 2 (неактивна до слова). */
  nowPaint: Paint;
  inputShadow: unknown;
  onChangeInput: (value: string) => void;
  onSubmitInput: () => void;
  onConfirmGrace: () => void;
  onOpenNow: () => void;
  onConfirmNow: () => void;
  onBack: () => void;
  onCancel: () => void;
}>;

function BoldSentence({ before, bold, after, color, strongColor, size }: Readonly<{ before: string; bold: string; after: string; color: string; strongColor: string; size: number }>) {
  return (
    <Text style={[styles.body, { color, fontSize: size, lineHeight: size * 1.45 }]}>
      {before}{' '}
      <Text style={{ color: strongColor, fontWeight: '700' }}>{bold}</Text>
      {after}
    </Text>
  );
}

function PillButton({ testID, label, fill, ink, disabled, busy, onPress }: Readonly<{ testID: string; label: string; fill: string; ink: string; disabled?: boolean; busy?: boolean; onPress: () => void }>) {
  return (
    <Pressable
      testID={testID}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, { backgroundColor: fill, opacity: busy ? 0.78 : pressed && !disabled ? 0.82 : 1 }]}
    >
      <View style={styles.pillRow}>
        {busy ? <ActivityIndicator size="small" color={ink} /> : null}
        <Text style={[styles.pillLabel, { color: ink }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function DeleteAccountVariantBBody(props: DeleteAccountVariantBBodyProps) {
  const { glass, fontSizes: f, copy, deleting } = props;
  if (props.step === 'grace') {
    return (
      <View style={styles.wrap} testID="delete-account-variant-b-grace">
        <Text accessibilityRole="header" style={[styles.title, { color: glass.text, fontSize: f.h2 }]}>{props.title}</Text>
        <BoldSentence before={copy.w1BodyBefore} bold={copy.w1BodyBold} after={copy.w1BodyAfter} color={glass.secondary} strongColor={glass.text} size={f.body} />
        <Text style={[styles.body, styles.second, { color: glass.secondary, fontSize: f.body, lineHeight: f.body * 1.45 }]}>{copy.w1Subscription}</Text>
        <View style={styles.actions}>
          <PillButton testID="delete-account-grace-confirm" label={copy.w1Cta} fill={props.gracePaint.fill} ink={props.gracePaint.ink} disabled={deleting} busy={deleting} onPress={props.onConfirmGrace} />
          <PillButton testID="delete-account-cancel" label={props.cancelLabel} fill={glass.buttonFill} ink={glass.text} disabled={deleting} onPress={props.onCancel} />
          <Pressable
            testID="delete-account-delete-now-link"
            accessibilityRole="button"
            accessibilityLabel={copy.w1DeleteNowLink}
            accessibilityState={{ disabled: deleting }}
            disabled={deleting}
            hitSlop={8}
            onPress={props.onOpenNow}
            style={({ pressed }) => [styles.link, { opacity: deleting ? 0.45 : pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.linkLabel, { color: props.linkColor }]}>{copy.w1DeleteNowLink}</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.wrap} testID="delete-account-variant-b-now">
      <Text accessibilityRole="header" style={[styles.title, { color: glass.text, fontSize: f.h2 }]}>{copy.w2Title}</Text>
      <BoldSentence before={copy.w2BodyBefore} bold={copy.w2BodyBold} after={copy.w2BodyAfter} color={glass.secondary} strongColor={glass.text} size={f.body} />
      <Text style={[styles.inputLabel, { color: glass.secondary, fontSize: f.caption }]}>{props.confirmLabel}</Text>
      <TextInput
        testID="delete-account-confirm-input"
        accessibilityLabel={props.confirmWord}
        // зачем: то же поле, что в прежнем окне — плашка контрола темы с малой тенью, без кромки.
        style={[styles.input, { backgroundColor: glass.opaqueControl, color: glass.text, fontSize: f.body, boxShadow: props.inputShadow as string }]}
        value={props.confirmInput}
        onChangeText={props.onChangeInput}
        placeholder={props.confirmWord}
        placeholderTextColor={glass.mutedText}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
        blurOnSubmit
        onSubmitEditing={props.onSubmitInput}
        maxLength={16}
        editable={!deleting}
      />
      <View style={styles.actions}>
        <PillButton testID="delete-account-confirm" label={copy.w2Cta} fill={props.nowPaint.fill} ink={props.nowPaint.ink} disabled={!props.confirmMatches || deleting} busy={deleting} onPress={props.onConfirmNow} />
        <PillButton testID="delete-account-now-back" label={copy.w2Back} fill={glass.buttonFill} ink={glass.text} disabled={deleting} onPress={props.onBack} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 22 },
  title: { fontWeight: '700', marginBottom: 10 },
  body: {},
  second: { marginTop: 10 },
  inputLabel: { fontWeight: '600', marginTop: 16, marginBottom: 8 },
  input: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 },
  actions: { marginTop: 20, gap: 10 },
  pill: { minHeight: 52, borderRadius: 26, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  pillRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pillLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  link: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 12 },
  linkLabel: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
