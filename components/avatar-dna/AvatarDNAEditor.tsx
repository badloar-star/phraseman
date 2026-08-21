import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../constants/i18n';
import { PRESS, LUM, CHK } from '../../constants/motionHybrid';
import { avatarDNACopy } from '../../app/avatar_dna_copy';
import type { AvatarCamera, AvatarCategory, AvatarDNA, AvatarItemManifest } from '../../modules/avatar-dna/contracts';
import { avatarDNAEditorReducer, createAvatarDNAEditorState } from '../../modules/avatar-dna/editor_reducer';
import { useTheme } from '../ThemeContext';
import { AvatarDNAHero } from './AvatarDNAHero';
import { AvatarDNATabs } from './AvatarDNATabs';
import { AvatarDNACatalog } from './AvatarDNACatalog';
import { AvatarDNAConflictNotice } from './AvatarDNAConflictNotice';

export const AVATAR_DNA_EDITOR_MOTION = Object.freeze({ press: PRESS, entrance: LUM, save: CHK });

type Props = Readonly<{
  initialDNA: AvatarDNA;
  lang: Lang;
  reduceMotion?: boolean;
  onClose: () => void;
  onSave: (dna: AvatarDNA) => void | Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  onDraftChange?: (dna: AvatarDNA) => void;
}>;

export function AvatarDNAEditor({ initialDNA, lang, reduceMotion = false, onClose, onSave, onDirtyChange, onDraftChange }: Props) {
  const { theme: t } = useTheme();
  const copy = useMemo(() => avatarDNACopy(lang), [lang]);
  const [state, dispatch] = useReducer(avatarDNAEditorReducer, undefined, () => createAvatarDNAEditorState(initialDNA, 'free'));
  const [category, setCategory] = useState<AvatarCategory>('base');
  const [camera, setCamera] = useState<AvatarCamera>('studio');
  const [saving, setSaving] = useState(false);
  useEffect(() => { onDirtyChange?.(state.dirty); }, [onDirtyChange, state.dirty]);
  useEffect(() => { onDraftChange?.(state.present.chosenDNA); }, [onDraftChange, state.present.chosenDNA]);
  const iconStyle = [styles.iconButton, { backgroundColor: t.bgSurface }];
  const selectItem = (item: AvatarItemManifest) => dispatch({ type: 'select-item', category: item.category, itemId: item.id });
  const save = async () => { if (saving) return; setSaving(true); try { await onSave(state.present.chosenDNA); } finally { setSaving(false); } };

  return <View style={[styles.root, { backgroundColor: t.bgPrimary }]}>
    <View style={styles.topBar}>
      <Pressable accessibilityRole="button" accessibilityLabel={copy.close} onPress={onClose} style={iconStyle}><Text style={[styles.icon, { color: t.textPrimary }]}>×</Text></Pressable>
      <Text style={[styles.title, { color: t.textPrimary }]}>{copy.title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={copy.undo} accessibilityState={{ disabled: state.past.length === 0 }} disabled={state.past.length === 0} onPress={() => dispatch({ type: 'undo' })} style={iconStyle}><Text style={[styles.iconSmall, { color: state.past.length ? t.textPrimary : t.textMuted }]}>↶</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={copy.redo} accessibilityState={{ disabled: state.future.length === 0 }} disabled={state.future.length === 0} onPress={() => dispatch({ type: 'redo' })} style={iconStyle}><Text style={[styles.iconSmall, { color: state.future.length ? t.textPrimary : t.textMuted }]}>↷</Text></Pressable>
    </View>
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <AvatarDNAHero dna={state.present.chosenDNA} camera={camera} copy={copy} onCameraChange={setCamera} />
      <AvatarDNATabs value={category} copy={copy} onChange={setCategory} />
      <AvatarDNAConflictNotice notice={state.present.notice} copy={copy} onUndo={() => dispatch({ type: 'undo' })} onDismiss={() => dispatch({ type: 'dismiss-notice' })} />
      <AvatarDNACatalog category={category} dna={state.present.chosenDNA} copy={copy} reduceMotion={reduceMotion} onSelect={selectItem} />
      <View testID="avatar-dna-motion-mode" style={styles.motionMarker}><Text>{reduceMotion ? 'reduced' : 'full'}</Text></View>
    </ScrollView>
    <View style={[styles.bottom, { backgroundColor: t.bgPrimary }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={copy.save} accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => { void save(); }} style={({ pressed }) => [styles.save, { backgroundColor: t.correct, transform: [{ scale: pressed && !reduceMotion ? PRESS.scale.primary : 1 }] }]}><Text testID="avatar-dna-save-label" style={[styles.saveLabel, { color: t.correctText }]}>{copy.save}</Text></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, topBar: { minHeight: 64, paddingHorizontal: 14, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { minWidth: 44, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, icon: { fontSize: 28, lineHeight: 30 }, iconSmall: { fontSize: 24, lineHeight: 28, fontWeight: '800' },
  title: { flex: 1, fontSize: 20, lineHeight: 26, fontWeight: '900', textAlign: 'center' }, scroll: { paddingBottom: 116 }, motionMarker: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18 }, save: { minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#577D13', shadowOpacity: 0.24, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 }, saveLabel: { fontSize: 17, lineHeight: 22, fontWeight: '900' },
});
