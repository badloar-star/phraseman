import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getMyLeagueChatPollVote,
  resolveLeagueChatText,
  voteLeagueChatPoll,
  type LeagueChatMessage,
  type LeagueChatPollOption,
} from '../app/firestore_league_chat';

/**
 * LeagueChatCompassPost — рендер системного поста Компаса в чате лиги.
 *
 * Поддерживает:
 *  - локализованный текст (i18n[lang] → text);
 *  - опрос/квиз с кнопками (голос = increment в pollVotes, один голос на пост);
 *  - показ результатов после голосования (проценты по pollVotes).
 *
 * Стоимость: голос — 1 write increment в тот же документ (без Cloud Function,
 * без новых доков). Свой голос хранится локально.
 */

interface ThemeColors {
  accent: string;
  bgSurface: string;
  textPrimary: string;
  textMuted: string;
  textGhost: string;
  border: string;
  correctText: string;
}

interface FontSizes {
  sub: number;
  caption: number;
}

interface LeagueChatCompassPostProps {
  message: LeagueChatMessage;
  lang: string;
  t: ThemeColors;
  f: FontSizes;
  icon: keyof typeof Ionicons.glyphMap;
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

function pollLabel(option: LeagueChatPollOption, lang: string): string {
  const label = option.label?.[lang] ?? option.label?.ru;
  return typeof label === 'string' && label ? label : option.key;
}

function totalVotes(votes: Record<string, number> | undefined): number {
  if (!votes) return 0;
  return Object.values(votes).reduce((sum, n) => sum + Math.max(0, Math.floor(Number(n) || 0)), 0);
}

function LeagueChatCompassPost({ message, lang, t, f, icon, onToast }: LeagueChatCompassPostProps) {
  const [myVote, setMyVote] = useState<string | undefined>(undefined);
  const [voting, setVoting] = useState(false);
  const [localVotes, setLocalVotes] = useState<Record<string, number>>(message.pollVotes || {});

  const isPoll = message.compassKind === 'poll' && Array.isArray(message.poll) && message.poll.length > 0;

  useEffect(() => {
    setLocalVotes(message.pollVotes || {});
  }, [message.pollVotes]);

  useEffect(() => {
    let cancelled = false;
    if (!isPoll) return;
    void getMyLeagueChatPollVote(message.id).then((vote) => {
      if (!cancelled) setMyVote(vote);
    });
    return () => {
      cancelled = true;
    };
  }, [isPoll, message.id]);

  const handleVote = useCallback(
    async (optionKey: string) => {
      if (voting || myVote) return;
      setVoting(true);
      // Оптимистично: показываем свой голос сразу.
      setMyVote(optionKey);
      setLocalVotes((cur) => ({ ...cur, [optionKey]: Math.max(0, Math.floor(Number(cur[optionKey]) || 0)) + 1 }));
      const ok = await voteLeagueChatPoll(message.id, optionKey).catch(() => false);
      if (!ok) {
        // Откат, если запись не прошла (или уже голосовал).
        setMyVote(undefined);
        setLocalVotes(message.pollVotes || {});
      }
      setVoting(false);
    },
    [voting, myVote, message.id, message.pollVotes],
  );

  const text = resolveLeagueChatText(message, lang);
  const total = totalVotes(localVotes);
  const showResults = Boolean(myVote);

  return (
    <View
      testID={`league-chat-compass-${message.id}`}
      style={{ alignItems: 'center', paddingHorizontal: 2, marginVertical: 4 }}
    >
      <View
        style={{
          maxWidth: '92%',
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 16,
          backgroundColor: t.bgSurface,
          borderWidth: 0.5,
          borderColor: t.border,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={icon} size={14} color={t.accent} />
          <Text style={{ color: t.accent, fontSize: Math.max(10, f.caption - 1), fontWeight: '900', letterSpacing: 0.3 }}>
            Compass
          </Text>
        </View>

        <Text
          testID={`league-chat-compass-text-${message.id}`}
          style={{
            color: t.textPrimary,
            fontSize: f.sub,
            lineHeight: Math.round(f.sub * 1.4),
            fontWeight: '600',
          }}
        >
          {text}
        </Text>

        {isPoll && (
          <View style={{ gap: 6, marginTop: 2 }}>
            {message.poll!.map((option) => {
              const count = Math.max(0, Math.floor(Number(localVotes[option.key]) || 0));
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const chosen = myVote === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  testID={`league-chat-poll-${message.id}-${option.key}`}
                  disabled={showResults || voting}
                  onPress={() => handleVote(option.key)}
                  activeOpacity={0.8}
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: chosen ? t.accent : t.border,
                    backgroundColor: chosen ? t.accent : 'transparent',
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    overflow: 'hidden',
                  }}
                >
                  {/* Полоска результата (фон) после голосования. */}
                  {showResults && !chosen && (
                    <View
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${pct}%`,
                        backgroundColor: t.border,
                        opacity: 0.5,
                      }}
                    />
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <Text
                      style={{
                        color: chosen ? t.correctText : t.textPrimary,
                        fontSize: Math.max(11, f.caption),
                        fontWeight: '700',
                        flexShrink: 1,
                      }}
                    >
                      {pollLabel(option, lang)}
                    </Text>
                    {showResults && (
                      <Text
                        style={{
                          color: chosen ? t.correctText : t.textMuted,
                          fontSize: Math.max(10, f.caption - 1),
                          fontWeight: '900',
                        }}
                      >
                        {pct}%
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
            {showResults && (
              <Text style={{ color: t.textGhost, fontSize: Math.max(9, f.caption - 2), fontWeight: '700', marginTop: 2 }}>
                {total} {total === 1 ? '·' : '··'}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

export default React.memo(LeagueChatCompassPost);
