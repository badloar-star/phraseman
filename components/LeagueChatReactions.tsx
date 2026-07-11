import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  getMyLeagueChatReaction,
  LEAGUE_CHAT_REACTION_EMOJIS,
  toggleLeagueChatReaction,
  type LeagueChatMessage,
} from '../app/firestore_league_chat';
import { hapticTap } from '../hooks/use-haptics';

/**
 * LeagueChatReactions — ряд эмодзи-реакций под сообщением.
 *
 * Дёшево: реакция = increment(±1) в поле reactions того же документа (без
 * Cloud Function, без отдельных доков). Свой выбор хранится локально.
 *
 * Показываем только эмодзи, у которых есть счётчик > 0, плюс компактную кнопку
 * «добавить реакцию», раскрывающую палитру. Так ряд не загромождает чат.
 */

interface ThemeColors {
  accent: string;
  bgSurface: string;
  textPrimary: string;
  textMuted: string;
  border: string;
  correctText: string;
}

interface FontSizes {
  caption: number;
}

interface LeagueChatReactionsProps {
  message: LeagueChatMessage;
  align: 'flex-start' | 'flex-end';
  t: ThemeColors;
  f: FontSizes;
  compact?: boolean;
}

function LeagueChatReactions({ message, align, t, f, compact = false }: LeagueChatReactionsProps) {
  const [myReaction, setMyReaction] = useState<string | undefined>(undefined);
  const [counts, setCounts] = useState<Record<string, number>>(message.reactions || {});
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    setCounts(message.reactions || {});
  }, [message.reactions]);

  useEffect(() => {
    let cancelled = false;
    void getMyLeagueChatReaction(message.id).then((r) => {
      if (!cancelled) setMyReaction(r);
    });
    return () => {
      cancelled = true;
    };
  }, [message.id]);

  const react = useCallback(
    (emoji: string) => {
      hapticTap();
      setPaletteOpen(false);
      const prev = myReaction;
      const nextReaction = prev === emoji ? undefined : emoji;
      setMyReaction(nextReaction);
      // Оптимистичный апдейт счётчиков.
      setCounts((cur) => {
        const next = { ...cur };
        if (prev === emoji) {
          next[emoji] = Math.max(0, (Number(next[emoji]) || 0) - 1);
        } else {
          next[emoji] = (Number(next[emoji]) || 0) + 1;
          if (prev) next[prev] = Math.max(0, (Number(next[prev]) || 0) - 1);
        }
        return next;
      });
      void toggleLeagueChatReaction(message.id, emoji).catch(() => {});
    },
    [message.id, myReaction],
  );

  const activeEmojis = LEAGUE_CHAT_REACTION_EMOJIS.filter(
    (e) => (Number(counts[e]) || 0) > 0 || myReaction === e,
  );

  return (
    <View style={{ alignItems: align, marginTop: compact ? 0 : 4, gap: 4, flexShrink: 1 }}>
      <View style={{ flexDirection: 'row', flexWrap: compact ? 'nowrap' : 'wrap', gap: compact ? 3 : 4, justifyContent: align, alignItems: 'center' }}>
        {activeEmojis.map((emoji) => {
          const count = Math.max(0, Number(counts[emoji]) || 0);
          if (count <= 0 && myReaction !== emoji) return null;
          const mine = myReaction === emoji;
          return (
            <TouchableOpacity
              key={emoji}
              testID={`league-chat-reaction-${message.id}-${emoji}`}
              onPress={() => react(emoji)}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                paddingHorizontal: compact ? 6 : 7,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: mine ? t.accent : t.bgSurface,
                borderWidth: 0,
                borderColor: mine ? t.accent : t.border,
              }}
            >
              <Text style={{ fontSize: Math.max(11, f.caption) }}>{emoji}</Text>
              {count > 0 && (
                <Text
                  style={{
                    color: mine ? t.correctText : t.textMuted,
                    fontSize: Math.max(9, f.caption - 2),
                    fontWeight: '900',
                  }}
                >
                  {count}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          testID={`league-chat-react-add-${message.id}`}
          onPress={() => setPaletteOpen((v) => !v)}
          activeOpacity={0.7}
          // Кнопка ~20-24px — hitSlop добивает зону нажатия до комфортных ~40px.
          hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}
          style={{
            paddingHorizontal: compact ? 6 : 7,
            paddingVertical: 3,
            borderRadius: 999,
            borderWidth: 0,
            borderColor: t.border,
            opacity: 0.7,
          }}
        >
          <Text style={{ color: t.textMuted, fontSize: Math.max(10, f.caption - 1), fontWeight: '900' }}>
            {paletteOpen ? '×' : '☺'}
          </Text>
        </TouchableOpacity>
      </View>

      {paletteOpen && (
        <View
          style={{
            flexDirection: 'row',
            gap: 4,
            padding: 5,
            borderRadius: 999,
            backgroundColor: t.bgSurface,
            borderWidth: 0,
            borderColor: t.border,
          }}
        >
          {LEAGUE_CHAT_REACTION_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              testID={`league-chat-react-pick-${message.id}-${emoji}`}
              onPress={() => react(emoji)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={{ paddingHorizontal: 5, paddingVertical: 2 }}
            >
              <Text style={{ fontSize: Math.max(15, f.caption + 4) }}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default React.memo(LeagueChatReactions);
