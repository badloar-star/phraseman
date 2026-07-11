import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ARENA_DUEL_REACTION_EMOJIS } from '../constants/arena_duel_reaction_emojis';
import { hapticTap, hapticMediumImpact } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';

type ThemeSlice = {
  accent: string;
  bgCard: string;
  bgSurface2: string;
  border: string;
  textPrimary: string;
  textMuted: string;
};

const COOLDOWN_MS = 10_000;
const COLS = 6;

type Props = {
  sessionKey: string;
  pickerTitle: string;
  /** Дополнительный отступ снизу (SafeArea уже учтён снаружи — обычно 12–20). */
  bottomOffset: number;
  theme: ThemeSlice;
  /** Не показывать / не жать (например не тот phase). */
  disabled: boolean;
  onPick: (emoji: string) => Promise<void>;
};

function ArenaDuelEmojiReact({
  sessionKey,
  pickerTitle,
  bottomOffset,
  theme,
  disabled,
  onPick,
}: Props) {
  const { width } = useWindowDimensions();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const fabBottom = Math.max(bottomOffset, bottomInset) + 12;
  const [open, setOpen] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    setCooldownUntil(0);
    setOpen(false);
  }, [sessionKey]);

  useEffect(() => {
    const remainingMs = cooldownUntil - Date.now();
    if (remainingMs <= 0) return;
    const update = () => setTick((n) => n + 1);
    const intervalId = setInterval(update, 1000);
    const doneId = setTimeout(update, remainingMs + 50);
    return () => {
      clearInterval(intervalId);
      clearTimeout(doneId);
    };
  }, [cooldownUntil]);

  const cdLeft =
    cooldownUntil > Date.now() ? Math.ceil((cooldownUntil - Date.now()) / 1000) : 0;

  const openPicker = useCallback(() => {
    if (disabled || cdLeft > 0) return;
    void hapticTap();
    setOpen(true);
  }, [disabled, cdLeft]);

  const handleEmoji = useCallback(
    async (emoji: string) => {
      try {
        await hapticMediumImpact();
        await onPick(emoji);
        setOpen(false);
        setCooldownUntil(Date.now() + COOLDOWN_MS);
      } catch {
        setOpen(false);
      }
    },
    [onPick],
  );

  const cell = Math.min(52, Math.floor((width - 56) / COLS));

  if (disabled) return null;

  return (
    <>
      <TouchableOpacity
        accessibilityLabel="Emoji reaction"
        onPress={openPicker}
        activeOpacity={0.85}
        disabled={cdLeft > 0}
        style={[
          styles.fab,
          {
            bottom: fabBottom,
            backgroundColor: theme.bgCard,
            borderColor: theme.border,
            opacity: cdLeft > 0 ? 0.55 : 1,
          },
        ]}
      >
        <Ionicons name="happy-outline" size={26} color={theme.accent} />
        {cdLeft > 0 ? (
          <View style={[styles.cdBadge, { borderColor: theme.border, backgroundColor: theme.bgSurface2 }]}>
            <Text style={[styles.cdText, { color: theme.textMuted }]}>{cdLeft}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.sheet, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
          >
            <Text style={[styles.sheetTitle, { color: theme.textMuted }]}>{pickerTitle}</Text>
            <View style={styles.grid}>
              {ARENA_DUEL_REACTION_EMOJIS.map((em) => (
                <TouchableOpacity
                  key={em}
                  onPress={() => void handleEmoji(em)}
                  style={[
                    styles.emojiCell,
                    {
                      width: cell,
                      height: cell,
                      borderColor: theme.border,
                      backgroundColor: theme.bgSurface2,
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: Math.min(30, cell * 0.58) }}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default memo(ArenaDuelEmojiReact);

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cdBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cdText: { fontSize: 11, fontWeight: '800' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  sheet: {
    borderRadius: 20,
    borderWidth: 0,
    padding: 16,
    maxHeight: '52%',
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  emojiCell: {
    borderRadius: 14,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
