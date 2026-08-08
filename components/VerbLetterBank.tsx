import React, { useCallback, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import {
  buildLetterBank,
  assembledWord,
  isAssemblyCorrect,
  type LetterTile,
} from '../app/verb_letter_bank';

export interface VerbLetterBankProps {
  /** Канонически правильная форма (для построения банка букв). */
  target: string;
  /** Все допустимые формы (включая варианты was|were) — для проверки. */
  acceptedForms: string[];
  /** Заблокирован ввод (фаза фидбэка). */
  disabled?: boolean;
  /** Вызывается при попытке «Проверить» с результатом. */
  onSubmit: (correct: boolean, assembled: string) => void;
  /** Сбросочный ключ — при смене заново строит банк (новый глагол/форма). */
  resetKey: string;
}

/**
 * «Собери форму из букв» — активное воспроизведение (recall) поверх recognition.
 * Тап по букве снизу → она встаёт в строку ответа; тап по букве в ответе → убирает.
 */
export default function VerbLetterBank({
  target,
  acceptedForms,
  disabled,
  onSubmit,
  resetKey,
}: VerbLetterBankProps) {
  const { theme: t, f } = useTheme();
  const bank = useMemo(() => buildLetterBank(target), [target, resetKey]);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<LetterTile[]>([]);

  const addLetter = useCallback((tile: LetterTile) => {
    if (disabled || used.has(tile.id)) return;
    hapticTap();
    setUsed(prev => new Set(prev).add(tile.id));
    setPicked(prev => [...prev, tile]);
  }, [disabled, used]);

  const removeLetter = useCallback((index: number) => {
    if (disabled) return;
    hapticTap();
    setPicked(prev => {
      const tile = prev[index];
      if (tile) setUsed(u => { const n = new Set(u); n.delete(tile.id); return n; });
      return prev.filter((_, i) => i !== index);
    });
  }, [disabled]);

  const clearAll = useCallback(() => {
    if (disabled) return;
    hapticTap();
    setUsed(new Set());
    setPicked([]);
  }, [disabled]);

  const assembled = assembledWord(picked);
  const canSubmit = picked.length > 0 && !disabled;

  const submit = useCallback(() => {
    if (!canSubmit) return;
    onSubmit(isAssemblyCorrect(assembled, acceptedForms), assembled);
  }, [canSubmit, assembled, acceptedForms, onSubmit]);

  return (
    <View style={{ gap: 14, paddingHorizontal: 16 }}>
      {/* Строка собранного ответа */}
      <View style={{
        minHeight: 56, flexDirection: 'row', flexWrap: 'wrap', gap: 6,
        alignItems: 'center', justifyContent: 'center',
        borderBottomWidth: 2, borderBottomColor: t.border, paddingBottom: 8,
      }}>
        {picked.length === 0 ? (
          <Text style={{ color: t.textSecond, fontSize: f.body, opacity: 0.6 }}>· · ·</Text>
        ) : (
          picked.map((tile, i) => (
            <TouchableOpacity
              key={`${tile.id}_${i}`}
              onPress={() => removeLetter(i)}
              activeOpacity={0.7}
              disabled={disabled}
              style={{
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                backgroundColor: t.bgCard, borderWidth: 1.5, borderColor: t.correct + '80',
              }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800' }}>{tile.char}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Банк доступных букв */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {bank.map(tile => {
          const isUsed = used.has(tile.id);
          return (
            <TouchableOpacity
              key={tile.id}
              onPress={() => addLetter(tile)}
              activeOpacity={0.7}
              disabled={disabled || isUsed}
              style={{
                minWidth: 44, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: isUsed ? 'transparent' : t.bgCard,
                borderWidth: 0, borderColor: isUsed ? t.border + '40' : t.border,
                opacity: isUsed ? 0.35 : 1,
              }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>{tile.char}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Действия */}
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={clearAll}
          disabled={disabled || picked.length === 0}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
            flexDirection: 'row', alignItems: 'center', gap: 6,
            borderWidth: 0, borderColor: t.border,
            opacity: picked.length === 0 ? 0.4 : 1,
          }}
        >
          <Ionicons name="backspace-outline" size={18} color={t.textSecond} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={submit}
          disabled={!canSubmit}
          activeOpacity={0.8}
          style={{
            flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
            backgroundColor: canSubmit ? t.correct : t.bgCard,
            borderWidth: 1.5, borderColor: canSubmit ? t.correct : t.border,
            opacity: canSubmit ? 1 : 0.6,
          }}
        >
          <Text style={{ color: canSubmit ? t.correctText : t.textSecond, fontSize: f.bodyLg, fontWeight: '800' }}>
            {assembled ? assembled : '—'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
