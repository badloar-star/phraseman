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
      <View
        testID="profile-card-bio-sheet"
        accessibilityViewIsModal
        style={[styles.sheet, { paddingBottom: Math.max(26, bottomInset + 12) }]}
      >
        <Pressable accessibilityRole="button" accessibilityLabel={t4(lang, PC.cancel)} onPress={onClose} hitSlop={12} style={styles.handleHit}>
          <View style={styles.handle} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>{t4(lang, PC.sheetText)}</Text>
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
          placeholderTextColor="rgba(255,255,255,0.4)"
          selectionColor="#FFFFFF"
          style={styles.field}
        />
        <View style={styles.meta}>
          <Text style={styles.metaText}>{t4(lang, PC.textHint)}</Text>
          <Text testID="profile-card-bio-counter" style={[styles.counter, n > 70 ? styles.warn : null]}>
            {`${n}/${PROFILE_CARD_BIO_MAX_CHARS}`}
          </Text>
        </View>
        <View style={styles.row}>
          <ProfileCardButton
            testID="profile-card-bio-cancel"
            tone="alt"
            label={t4(lang, PC.cancel)}
            onPress={onClose}
            outerStyle={styles.rowItem}
          >
            <Text style={[styles.buttonText, { color: buttonInk('alt', null) }]}>{t4(lang, PC.cancel)}</Text>
          </ProfileCardButton>
          <ProfileCardButton
            testID="profile-card-bio-save"
            tone={canSave ? 'primary' : 'off'}
            label={t4(lang, PC.save)}
            disabled={!canSave}
            busy={saving}
            onPress={handleSave}
            outerStyle={styles.rowItem}
          >
            <Text style={[styles.buttonText, { color: buttonInk(canSave ? 'primary' : 'off', null) }]}>{t4(lang, PC.save)}</Text>
          </ProfileCardButton>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default memo(ProfileCardBioSheetBase);

const styles = StyleSheet.create({
  avoid: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#151518',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingTop: 12,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30, // guard-ok: одна тень шторки, как в макете .vz-sheet
    shadowOffset: { width: 0, height: -20 },
    elevation: 24,
  },
  handleHit: { alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 20 },
  handle: { width: 42, height: 5, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.35)' },
  title: { marginTop: 12, fontSize: 24, lineHeight: 30, fontWeight: '800', color: '#FFFFFF' },
  field: {
    marginTop: 14,
    minHeight: 100,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, // guard-ok: поле ввода .vz-field — тонкий полупрозрачный кант (исключение 2.0)
    borderColor: 'rgba(255,255,255,0.14)',
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 8 },
  metaText: { flexShrink: 1, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.6)' },
  counter: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: 'rgba(255,255,255,0.6)', fontVariant: ['tabular-nums'] },
  warn: { color: '#FFB547' },
  row: { flexDirection: 'row', gap: 10, marginTop: 16 },
  rowItem: { flex: 1 },
  buttonText: { fontSize: 16, fontWeight: '800' },
});
