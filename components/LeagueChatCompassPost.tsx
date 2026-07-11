import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  getMyLeagueChatPollVote,
  resolveLeagueChatText,
  voteLeagueChatPoll,
  type LeagueChatMessage,
  type LeagueChatPollOption,
} from '../app/firestore_league_chat';
import { compassIconSource } from '../constants/weeklyCompassIcons';
import type { ThemeMode } from '../constants/theme';

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
  themeMode: ThemeMode;
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

function LeagueChatCompassPost({ message, lang, t, f, icon, themeMode }: LeagueChatCompassPostProps) {
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
      setMyVote(optionKey);
      setLocalVotes((cur) => ({ ...cur, [optionKey]: Math.max(0, Math.floor(Number(cur[optionKey]) || 0)) + 1 }));
      const ok = await voteLeagueChatPoll(message.id, optionKey).catch(() => false);
      if (!ok) {
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
  const avatarSize = 36;
  const avatarGap = 8;

  return (
    <View
      testID={`league-chat-compass-${message.id}`}
      style={{ flexDirection: 'row', gap: avatarGap, paddingVertical: 10, paddingHorizontal: 2 }}
    >
      {/* Threads-стиль: аватар Компаса слева (акцентный кружок, без рамки), справа
          «Compass · AI» и плоский текст с лёгким зелёным фоном (как в Help Board). */}
      <View style={{ paddingTop: 2 }}>
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(71,200,112,0.14)',
            overflow: 'hidden',
          }}
        >
          <Image
            source={compassIconSource(themeMode)}
            style={{ width: avatarSize - 3, height: avatarSize - 3 }}
            contentFit="contain"
            accessibilityLabel="Compass"
            accessibilityIgnoresInvertColors
          />
        </View>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={icon} size={12} color={t.accent} />
          <Text numberOfLines={1} style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '900' }}>
            Compass
          </Text>
          <View style={{ backgroundColor: 'rgba(71,200,112,0.16)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
            <Text style={{ color: t.accent, fontSize: Math.max(9, f.caption - 3), fontWeight: '900' }}>AI</Text>
          </View>
        </View>

        <View
          style={{
            flexShrink: 1,
            borderRadius: 14,
            backgroundColor: 'rgba(71,200,112,0.06)',
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginTop: 5,
            gap: 8,
          }}
        >
          <Text
            testID={`league-chat-compass-text-${message.id}`}
            style={{
              color: t.textPrimary,
              fontSize: f.sub,
              lineHeight: Math.round(f.sub * 1.38),
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
                    accessibilityRole="button"
                    disabled={showResults || voting}
                    onPress={() => handleVote(option.key)}
                    activeOpacity={0.8}
                    style={{
                      borderRadius: 12,
                      borderWidth: 0,
                      borderColor: chosen ? t.accent : t.border,
                      backgroundColor: chosen ? t.accent : 'transparent',
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      overflow: 'hidden',
                    }}
                  >
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons name="people-outline" size={12} color={t.textGhost} />
                  <Text style={{ color: t.textGhost, fontSize: Math.max(9, f.caption - 2), fontWeight: '700' }}>
                    {total}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default React.memo(LeagueChatCompassPost);
