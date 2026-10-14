// ─── Визитка 2.0: шторка «Текст визитки» (только владелец «Про») ─────────────
// зачем (макет VC-EDIT / VC-EDIT-EMPTY): до 80 символов, одна строка, счётчик
// «n/80» (после 70 — предупреждающий цвет), подсказка, что текст увидят все.
// «Сохранить» выключена, пока поле пустое. Переносы строк не вводятся вовсе:
// Enter = «Готово», вставленный перенос превращается в пробел (сервер переносы
// отклоняет — лучше не дать их набрать, чем показать отказ).
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Lang } from '../../constants/i18n';
import { PROFILE_CARD_BIO_MAX_CHARS } from '../../app/profile_card_public';
import { buttonInk, ProfileCardButton } from './ProfileCardParts';
import { PC, t4 } from './profile_card_copy';
import { useProfileSheetPaint } from './profile_card_sheet_paint';
import SheetSwipeClose from '../modal_fx/SheetSwipeClose';

type Props = Readonly<{
  lang: Lang;
  initialText: string;
  saving: boolean;
  bottomInset: number;
  onSave: (text: string) => void;
  onClose: () => void;
}>;

function charCount(text: string): number {
  return Array.from(text).length;
}

/** Одна строка и не длиннее лимита — по символам Юникода, как на сервере. */
export function sanitizeBioInput(raw: string): string {
  const oneLine = raw.replace(/[\r\n]+/g, ' ');
  const chars = Array.from(oneLine);
  return chars.length > PROFILE_CARD_BIO_MAX_CHARS ? chars.slice(0, PROFILE_CARD_BIO_MAX_CHARS).join('') : oneLine;
}

function ProfileCardBioSheetBase({ lang, initialText, saving, bottomInset, onSave, onClose }: Props) {
  const p = useProfileSheetPaint();
  const [text, setText] = useState(initialText);
  const inputRef = useRef<TextInput>(null);
  useEffect(() => {
    setText(initialText);
  }, [initialText]);
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 260);
    return () => clearTimeout(timer);
  }, []);
  const n = charCount(text.trim());
  const canSave = n > 0 && !saving;
  const handleSave = useCallback(() => {
    if (!canSave) return;
    onSave(text.trim());
  }, [canSave, onSave, text]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.avoid}
      pointerEvents="box-none"
    >
      {/* зачем (координатор 14.10, «ручка ⇒ свайп»): свайп вниз = «Отмена», тот же onClose, что тап по ручке; пока идёт сохранение — свайп выключен */}
      <SheetSwipeClose name="profile-card-bio" onClose={onClose} enabled={!saving}>
      <View
        testID="profile-card-bio-sheet"
        accessibilityViewIsModal
        style={[styles.sheet, { backgroundColor: p.sheet, shadowColor: p.shadow, paddingBottom: Math.max(26, bottomInset + 12) }]}
      >
        <Pressable accessibilityRole="button" accessibilityLabel={t4(lang, PC.cancel)} onPress={onClose} hitSlop={12} style={styles.handleHit}>
          <View style={[styles.handle, { backgroundColor: p.handle }]} />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: p.title }]}>{t4(lang, PC.sheetText)}</Text>
        <TextInput
          ref={inputRef}
          testID="profile-card-bio-input"
          accessibilityLabel={t4(lang, PC.sheetText)}
          value={text}
          onChangeText={(value) => setText(sanitizeBioInput(value))}
          multiline
          blurOnSubmit
          returnKeyType="done"
          onSubmitEditing={handleSave}
          maxLength={PROFILE_CARD_BIO_MAX_CHARS * 2}
          placeholder={t4(lang, PC.addBio)}
          placeholderTextColor={p.placeholder}
          selectionColor={p.selection}
          style={[styles.field, { backgroundColor: p.field, boxShadow: p.fieldShadow as unknown as string /* зачем: типы RN для TextInput знают boxShadow только строкой */, color: p.fieldInk }]}
        />
        <View style={styles.meta}>
          <Text style={[styles.metaText, { color: p.hint }]}>{t4(lang, PC.textHint)}</Text>
          <Text testID="profile-card-bio-counter" style={[styles.counter, { color: p.hint }, n > 70 ? { color: p.warn } : null]}>
            {`${n}/${PROFILE_CARD_BIO_MAX_CHARS}`}
          </Text>
        </View>
        <View style={styles.row}>
          <ProfileCardButton
            testID="profile-card-bio-cancel"
            tone="alt"
            paint={p.button}
            label={t4(lang, PC.cancel)}
            onPress={onClose}
            outerStyle={styles.rowItem}
          >
            <Text style={[styles.buttonText, { color: buttonInk('alt', null, false, p.button) }]}>{t4(lang, PC.cancel)}</Text>
          </ProfileCardButton>
          <ProfileCardButton
            testID="profile-card-bio-save"
            tone={canSave ? 'primary' : 'off'}
            paint={p.button}
            label={t4(lang, PC.save)}
            disabled={!canSave}
            busy={saving}
            onPress={handleSave}
            outerStyle={styles.rowItem}
          >
            <Text style={[styles.buttonText, { color: buttonInk(canSave ? 'primary' : 'off', null, false, p.button) }]}>{t4(lang, PC.save)}</Text>
          </ProfileCardButton>
        </View>
      </View>
      </SheetSwipeClose>
    </KeyboardAvoidingView>
  );
}

export default memo(ProfileCardBioSheetBase);

const styles = StyleSheet.create({
  avoid: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingTop: 12,
    paddingHorizontal: 18,
    shadowOpacity: 0.5,
    shadowRadius: 30, // guard-ok: одна тень шторки, как в макете .vz-sheet
    shadowOffset: { width: 0, height: -20 },
    elevation: 24,
  },
  handleHit: { alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 20 },
  handle: { width: 42, height: 5, borderRadius: 5 },
  title: { marginTop: 12, fontSize: 24, lineHeight: 30, fontWeight: '800' },
  field: {
    marginTop: 14,
    minHeight: 100,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: 18,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 8 },
  metaText: { flexShrink: 1, fontSize: 13, lineHeight: 18 },
  counter: { fontSize: 13, lineHeight: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', gap: 10, marginTop: 16 },
  rowItem: { flex: 1 },
  buttonText: { fontSize: 16, fontWeight: '800' },
});
