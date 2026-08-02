/**
 * _admin_sound_lab.tsx — DEV/QA превью всех семантических звуков приложения.
 *
 * Зачем: звуки разбросаны по экранам и слышны только в момент реального
 * события (истёк таймер, пришла заявка в друзья, удалён аккаунт). Руками
 * половину не воспроизвести, а на слух невозможно сравнить громкость двух
 * соседних наград. Эта лаборатория проигрывает ЛЮБОЕ событие каталога по
 * тапу — тем же путём, что и приложение (soundDirector.request), поэтому
 * слышно ровно то, что услышит пользователь, вместе с кулдаунами и
 * приоритетами арбитра.
 *
 * Ещё она отвечает на вопрос «почему тихо?»: у каждой строки есть метка
 * состояния — есть ли WAV-файл и подключено ли событие к экрану. Раньше
 * событие могло иметь звук, лежать в каталоге и не вызываться ниоткуда, и
 * увидеть это можно было только грепом.
 *
 * Открывается только под ENABLE_DEV_TOOLS из хаба настроек. В продакшн-сборке
 * экран вырезается (см. стаб admin_sound_lab.tsx) и редиректит на главную.
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  Easing as REasing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { SOUND_EVENTS, type SoundEventId, type SoundFamily } from '../modules/audio/sound_events';
import { soundDirector } from '../modules/audio/sound_director';
import { getSoundSettingsSnapshot } from '../modules/audio/sound_settings';
import { SOUND_MOTION, type SoundMotionProfile } from '../modules/audio/sound_motion';

/** Порядок групп — как в каталоге, чтобы лаборатория читалась вместе с ним. */
const FAMILY_ORDER: readonly SoundFamily[] = [
  'learning',
  'voice',
  'completion',
  'system',
  'energy',
  'streak',
  'reward',
  'arena',
  'league',
  'social',
];

const FAMILY_TITLE: Record<SoundFamily, string> = {
  learning: 'Учёба',
  voice: 'Голос и запись',
  completion: 'Завершение',
  system: 'Системные',
  energy: 'Энергия',
  streak: 'Цепочка',
  reward: 'Награды',
  arena: 'Арена',
  league: 'Лига',
  social: 'Социальное',
};

const FAMILY_ICON: Record<SoundFamily, string> = {
  learning: 'school-outline',
  voice: 'mic-outline',
  completion: 'checkmark-done-outline',
  system: 'information-circle-outline',
  energy: 'flash-outline',
  streak: 'flame-outline',
  reward: 'gift-outline',
  arena: 'game-controller-outline',
  league: 'trophy-outline',
  social: 'people-outline',
};

type EventRow = {
  id: SoundEventId;
  family: SoundFamily;
  hasAsset: boolean;
  volume: number;
  priority: number;
  cooldownMs: number;
  durationMs: number;
  deferAfterVoice: boolean;
  iosOnly: boolean;
};

function buildRows(): readonly EventRow[] {
  return (Object.keys(SOUND_EVENTS) as SoundEventId[]).map((id) => {
    const d = SOUND_EVENTS[id];
    return {
      id,
      family: d.family,
      hasAsset: d.source !== null,
      volume: d.volume,
      priority: d.priority,
      cooldownMs: d.cooldownMs,
      durationMs: d.durationMs,
      deferAfterVoice: d.deferAfterVoice,
      iosOnly: d.platform === 'ios',
    };
  });
}

/** Сколько столбиков в дорожке волны. Достаточно, чтобы удары читались. */
const WAVE_BARS = 26;

/**
 * Строка события: играет звук и одновременно двигается по его волне.
 *
 * зачем: владелец просил, чтобы в лаборатории было слышно И видно. Тайминги
 * берутся из `SOUND_MOTION` — таблицы, измеренной разбором PCM каждого WAV:
 * подъём идёт до пика на `attackMs`, вспышки падают на `hits[]`, движение
 * гаснет на `audibleMs` (реальном звучании, а не длине файла — у всех WAV
 * длинный хвост тишины). Поэтому движение совпадает со звуком, а не «примерно».
 */
const SoundEventRow = memo(function SoundEventRow({
  row, t, onPlay,
}: {
  row: EventRow;
  t: ReturnType<typeof useTheme>['theme'];
  onPlay: (row: EventRow) => void;
}) {
  const motion: SoundMotionProfile | undefined = SOUND_MOTION[row.id];

  const pulse = useSharedValue(0);
  const glow = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => () => {
    cancelAnimation(pulse);
    cancelAnimation(glow);
    cancelAnimation(progress);
  }, [pulse, glow, progress]);

  // Звонкий тембр — золото, глухой — акцент темы. Порог 0.55 подобран по
  // измеренной яркости: выше него звуки читаются как «звенящие».
  const tone = motion && motion.bright > 0.55 ? '#FFC800' : t.accent;

  const handlePress = useCallback(() => {
    onPlay(row);
    if (!motion) return;

    const audible = motion.audibleMs;
    const attack = Math.max(16, motion.attackMs || Math.round(audible * 0.25));

    cancelAnimation(pulse);
    pulse.value = 0;
    pulse.value = withSequence(
      withTiming(1, { duration: attack, easing: REasing.out(REasing.cubic) }),
      withTiming(0, { duration: Math.max(90, audible - attack), easing: REasing.out(REasing.quad) }),
    );

    cancelAnimation(glow);
    glow.value = 0;
    const hits = motion.hits.length ? motion.hits : [attack];
    for (const at of hits) {
      glow.value = withDelay(
        at,
        withSequence(
          withTiming(1, { duration: 55, easing: REasing.out(REasing.cubic) }),
          withTiming(0, { duration: 190, easing: REasing.out(REasing.quad) }),
        ),
      );
    }

    cancelAnimation(progress);
    progress.value = 0;
    progress.value = withTiming(1, { duration: audible, easing: REasing.linear });
  }, [onPlay, row, motion, pulse, glow, progress]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.03 }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.22,
    backgroundColor: tone,
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.35 }],
    opacity: 0.65 + pulse.value * 0.35,
  }));

  return (
    <Animated.View style={cardStyle}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={!row.hasAsset}
        testID={`sound-lab-event-${row.id}`}
        accessibilityRole="button"
        accessibilityLabel={
          row.hasAsset ? `Проиграть ${row.id}` : `${row.id} — нет файла, событие молчит`
        }
        accessibilityState={{ disabled: !row.hasAsset }}
        style={[styles.row, { backgroundColor: t.bgCard }, !row.hasAsset && styles.rowSilent]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, styles.rowGlow, glowStyle]} pointerEvents="none" />

        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: t.textPrimary }]} numberOfLines={1}>
            {row.id}
          </Text>
          <Text style={[styles.rowDesc, { color: t.textMuted }]}>
            {row.hasAsset
              ? `громкость ${row.volume} · приоритет ${row.priority} · пауза ${row.cooldownMs} мс${row.iosOnly ? ' · только iOS' : ''}${row.deferAfterVoice ? ' · ждёт конца речи' : ''}`
              : 'нет файла — событие молчит'}
          </Text>

          {motion ? (
            <>
              <View style={styles.waveTrack}>
                {Array.from({ length: WAVE_BARS }, (_, i) => (
                  <WaveBar
                    key={i}
                    index={i}
                    motion={motion}
                    progress={progress}
                    tone={tone}
                    idle={t.textGhost}
                  />
                ))}
              </View>
              <Text style={[styles.rowDesc, { color: t.textMuted }]}>
                {`звучит ${motion.audibleMs} мс · ударов ${motion.hits.length || 1} · ${motion.shape}`}
              </Text>
            </>
          ) : null}
        </View>

        <Animated.View style={iconStyle}>
          <Ionicons
            name={row.hasAsset ? 'play-circle-outline' : 'ban-outline'}
            size={22}
            color={row.hasAsset ? tone : t.textMuted}
          />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

/**
 * Один столбик дорожки волны. Высота — из огибающей звука (рядом с ударом
 * выше), подсветка — по бегущему указателю. Вынесен отдельно, чтобы
 * подсвечиваться в UI-потоке без ре-рендера строки.
 */
const WaveBar = memo(function WaveBar({
  index, motion, progress, tone, idle,
}: {
  index: number;
  motion: SoundMotionProfile;
  progress: SharedValue<number>;
  tone: string;
  idle: string;
}) {
  const height = useMemo(() => {
    const at = (index / WAVE_BARS) * motion.audibleMs;
    // Ближе к удару — выше столбик; между ударами огибающая спадает.
    const nearest = motion.hits.reduce(
      (best, h) => Math.min(best, Math.abs(h - at)),
      Number.POSITIVE_INFINITY,
    );
    const punch = Number.isFinite(nearest) ? Math.max(0, 1 - nearest / 110) : 0;
    const tail = 1 - index / WAVE_BARS;
    return 3 + Math.max(0.12, Math.min(1, punch * 0.85 + tail * 0.28)) * 15;
  }, [index, motion]);

  const style = useAnimatedStyle(() => ({
    backgroundColor: progress.value > 0 && progress.value >= index / WAVE_BARS ? tone : idle,
  }));

  return <Animated.View style={[styles.waveBar, { height }, style]} />;
});

export default function AdminSoundLab() {
  const router = useRouter();
  const { theme: t } = useTheme();
  const insets = useStableSafeAreaInsets();

  const rows = useMemo(buildRows, []);
  /** Последнее сыгранное + вердикт арбитра — видно, почему звук не прозвучал. */
  const [lastPlayed, setLastPlayed] = useState<{ id: SoundEventId; verdict: string } | null>(null);
  const [effectsEnabled, setEffectsEnabled] = useState(() => getSoundSettingsSnapshot().effectsEnabled);

  const grouped = useMemo(() => {
    return FAMILY_ORDER.map((family) => ({
      family,
      items: rows.filter((r) => r.family === family),
    })).filter((g) => g.items.length > 0);
  }, [rows]);

  const totals = useMemo(() => {
    const withAsset = rows.filter((r) => r.hasAsset).length;
    return { all: rows.length, withAsset, silent: rows.length - withAsset };
  }, [rows]);

  const play = useCallback((row: EventRow) => {
    hapticTap();
    // зачем: сначала пробуем поднять НАСТОЯЩИЙ интерфейс события — тост или
    // модалку. Раньше лаборатория только проигрывала звук, и на экране висела
    // статичная плашка: не было видно главного, как звук ложится на реальную
    // анимацию. Тост/модалка сами зовут директора в нужный момент, поэтому при
    // успехе свой request НЕ делаем — иначе两 запроса на одно событие и дедуп.
    if (openPreview(row.id)) {
      setLastPlayed({ id: row.id, verdict: 'запущен настоящий интерфейс события' });
      return;
    }
    // Интерфейса у события нет (запись голоса, тики таймера) — играем звук как
    // раньше, тем же путём, что и приложение: через арбитра, с его кулдаунами.
    const decision = soundDirector.request(row.id, { scope: 'sound-lab' });
    const verdict =
      decision.kind === 'play'
        ? 'играет'
        : decision.kind === 'defer'
          ? 'отложен до конца речи'
          : `пропущен: ${decision.reason}`;
    setLastPlayed({ id: row.id, verdict });
  }, [openPreview]);

  const toggleEffects = useCallback(() => {
    hapticTap();
    setEffectsEnabled((prev) => {
      const next = !prev;
      // зачем: локальный тумблер лаборатории, чтобы проверить «выключенные
      // эффекты» не выходя в настройки. Сам пользовательский параметр не
      // трогаем — сюда придёт его значение при следующем изменении настроек.
      soundDirector.setEffectsEnabled(next);
      return next;
    });
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: t.bgPrimary, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Назад"
          testID="sound-lab-back"
        >
          <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Звуки — все события</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: t.textMuted }]}>
          {`${totals.all} событий, из них ${totals.withAsset} со звуком и ${totals.silent} пока без файла. `}
          Тап по строке проигрывает событие так же, как это делает приложение — через арбитра,
          с его кулдаунами и приоритетами.
        </Text>

        <TouchableOpacity
          onPress={toggleEffects}
          activeOpacity={0.8}
          testID="sound-lab-effects-toggle"
          accessibilityRole="switch"
          accessibilityLabel="Звуковые эффекты"
          accessibilityState={{ checked: effectsEnabled }}
          style={[styles.toggleBtn, { backgroundColor: t.bgCard }]}
        >
          <Ionicons
            name={effectsEnabled ? 'volume-high' : 'volume-mute'}
            size={22}
            color={effectsEnabled ? t.accent : t.textMuted}
            style={{ marginRight: 12 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: t.textPrimary }]}>
              {effectsEnabled ? 'Звуковые эффекты включены' : 'Звуковые эффекты выключены'}
            </Text>
          </View>
          <Ionicons
            name={effectsEnabled ? 'toggle' : 'toggle-outline'}
            size={30}
            color={effectsEnabled ? t.accent : t.textMuted}
          />
        </TouchableOpacity>

        {lastPlayed && (
          <View style={[styles.verdict, { backgroundColor: t.bgCard }]}>
            <Text style={[styles.verdictId, { color: t.textPrimary }]} numberOfLines={1}>
              {lastPlayed.id}
            </Text>
            <Text style={[styles.verdictText, { color: t.textMuted }]}>{lastPlayed.verdict}</Text>
          </View>
        )}

        {grouped.map((group) => (
          <View key={group.family}>
            <View style={styles.groupHead}>
              <Ionicons
                name={FAMILY_ICON[group.family] as never}
                size={15}
                color={t.textSecond}
                style={{ marginRight: 7 }}
              />
              <Text style={[styles.sectionLabel, { color: t.textSecond }]}>
                {FAMILY_TITLE[group.family].toUpperCase()}
              </Text>
            </View>

            {group.items.map((row) => (
              <SoundEventRow key={row.id} row={row} t={t} onPlay={play} />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  intro: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  groupHead: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  verdict: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 4 },
  verdictId: { fontSize: 13, fontWeight: '700' },
  verdictText: { fontSize: 12, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  /** Без файла — приглушаем всю строку, а не подписываем её мелким шрифтом. */
  rowSilent: { opacity: 0.45 },
  rowTitle: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  rowDesc: { fontSize: 12, lineHeight: 17 },
  /** Вспышка на ударах волны — заливка тоном, а не рамка. */
  rowGlow: { borderRadius: 12 },
  waveTrack: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 18,
    marginTop: 8,
    marginBottom: 6,
  },
  waveBar: { flex: 1, borderRadius: 1 },
});
