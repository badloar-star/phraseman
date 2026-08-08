import Ionicons from '@expo/vector-icons/Ionicons';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { initFirebaseAppCheckIfAvailable } from '../../../app/app_check_init';
import { runTournamentBotSeedSingleFlight } from '../tournament_bot_seed_single_flight';
import {
  ACCENT,
  ACCENT_BORDER_SOFT,
  ACCENT_DIM,
  ADMIN_SURFACE,
  ADMIN_TEXT,
  ADMIN_TEXT_MUTED,
  AccordionSection,
  AdminHint,
} from '../ui';

interface Props {
  open: boolean;
  onToggle: (id: string) => void;
}

interface SeedBotProfilesResult {
  ok: boolean;
  count: number;
  overwrite: boolean;
}

const BOT_COUNT = 200;

function tournamentBotSeedError(error: unknown): string {
  const code = String((error as { code?: unknown })?.code ?? '').toLowerCase();
  const message = String((error as { message?: unknown })?.message ?? '').toLowerCase();

  if (code.includes('permission-denied') || message.includes('permission-denied')) {
    return 'Нужен аккаунт с правами администратора. Выдай admin-claim, затем выйди и войди снова.';
  }
  if (code.includes('unauthenticated') || message.includes('unauthenticated')) {
    return 'Сначала войди в аккаунт администратора.';
  }
  if (code.includes('unavailable') || message.includes('network')) {
    return 'Нет связи с сервером. Проверь интернет и повтори.';
  }
  return 'Не удалось собрать ботов. Проверь Metro-лог и повтори.';
}

export default function TournamentBotsSection({ open, onToggle }: Props) {
  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const [seeding, setSeeding] = useState(false);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const seedBots = useCallback(async () => {
    await runTournamentBotSeedSingleFlight(inFlightRef, async () => {
      setSeeding(true);
      setStatus(null);

      try {
        await initFirebaseAppCheckIfAvailable().catch(() => false);
        const callable = httpsCallable<
          { count: number; overwrite: boolean },
          SeedBotProfilesResult
        >(getFunctions(getApp(), 'us-central1'), 'adminSeedBotProfiles');
        // The current backend maps `overwrite` directly to Firestore `merge`.
        // true preserves any additional fields already stored on bot profiles.
        const response = await callable({ count: 200, overwrite: true });
        const count = Number.isFinite(response.data?.count) ? response.data.count : BOT_COUNT;
        if (mountedRef.current) {
          setStatus({
            kind: 'success',
            text: `Готово: создано или обновлено ${count} ботов.`,
          });
        }
      } catch (error) {
        if (mountedRef.current) {
          setStatus({ kind: 'error', text: tournamentBotSeedError(error) });
        }
      } finally {
        if (mountedRef.current) setSeeding(false);
      }
    });
  }, []);

  return (
    <AccordionSection
      id="tournament_bots"
      icon="people-circle-outline"
      title="Турниры — DEV-боты"
      badge={BOT_COUNT}
      open={open}
      onToggle={onToggle}
    >
      <AdminHint>
        Сервер создаст детерминированный пул из 200 турнирных персонажей в botProfiles и сохранит дополнительные поля существующих профилей. Нужны права admin.
      </AdminHint>

      <TouchableOpacity
        testID="admin-tournament-seed-bots"
        accessibilityRole="button"
        accessibilityLabel="Собрать 200 турнирных ботов"
        accessibilityState={{ disabled: seeding, busy: seeding }}
        disabled={seeding}
        onPress={() => { void seedBots(); }}
        activeOpacity={0.7}
        style={{
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: 0.5,
          borderBottomWidth: 0.5,
          borderColor: ACCENT_BORDER_SOFT,
          backgroundColor: ADMIN_SURFACE,
          opacity: seeding ? 0.65 : 1,
        }}
      >
        {seeding ? (
          <ActivityIndicator size="small" color={ACCENT} style={{ marginRight: 12 }} />
        ) : (
          <Ionicons name="people-outline" size={22} color={ACCENT} style={{ marginRight: 12 }} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: ADMIN_TEXT, fontSize: 15, fontWeight: '700' }}>
            {seeding ? 'Собираю ботов…' : 'Собрать 200 ботов'}
          </Text>
          <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 12, lineHeight: 17, marginTop: 2 }}>
            Защищённый вызов adminSeedBotProfiles
          </Text>
        </View>
        {!seeding && <Ionicons name="chevron-forward" size={18} color={ACCENT_DIM} />}
      </TouchableOpacity>

      {status && (
        <Text
          testID="admin-tournament-seed-bots-status"
          accessibilityLiveRegion="polite"
          style={{
            color: status.kind === 'success' ? '#7CC58A' : '#D9A04A',
            fontSize: 12,
            lineHeight: 18,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          {status.text}
        </Text>
      )}
    </AccordionSection>
  );
}
