// ════════════════════════════════════════════════════════════════════════════
// _motion_lab.tsx — «Лаборатория движения» (DEV Hub → Движение).
//
// Три направления × 13 поверхностей, перенесённые из макетов один в один.
// Каждую можно запустить на устройстве, замедлить до 0,25× и сравнить
// с двумя другими на той же поверхности.
//
// ВАЖНО: лаборатория НИЧЕГО не применяет к боевым экранам. Это витрина
// для выбора направления — сравниваем, потом внедряем выбранное.
// ════════════════════════════════════════════════════════════════════════════

import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { LabSurface } from '../components/motionlab/labSurfaces';
import {
  LAB_DIRECTIONS, LAB_SURFACES, makeSlow,
  type LabDirectionId, type LabSurfaceId, type LabSurfaceMeta,
} from '../components/motionlab/labKit';
import { hapticTap } from '../hooks/use-haptics';
import { safeRouterBack } from './navigation_back';

const SPEEDS = [1, 0.5, 0.25] as const;

export default function MotionLabScreen() {
  const { theme: t, f } = useTheme();
  const router = useRouter();

  const [dir, setDir] = useState<LabDirectionId>('impact');
  const [speed, setSpeed] = useState<number>(1);
  const [reduce, setReduce] = useState(false);
  const [open, setOpen] = useState<LabSurfaceId | null>(null);
  const [run, setRun] = useState(0);

  const slow = useMemo(() => makeSlow(speed), [speed]);
  const active = useMemo(() => LAB_DIRECTIONS.find((d) => d.id === dir)!, [dir]);

  const grouped = useMemo(() => {
    const map = new Map<string, LabSurfaceMeta[]>();
    LAB_SURFACES.forEach((s) => {
      const arr = map.get(s.category) ?? [];
      arr.push(s);
      map.set(s.category, arr);
    });
    return [...map.entries()];
  }, []);

  const launch = useCallback((id: LabSurfaceId) => {
    void hapticTap();
    setOpen(id);
    setRun((n) => n + 1);
  }, []);

  const replay = useCallback(() => {
    void hapticTap();
    setRun((n) => n + 1);
  }, []);

  const switchDir = useCallback((next: LabDirectionId) => {
    void hapticTap();
    setDir(next);
    setRun((n) => n + 1);
  }, []);

  const switchSpeed = useCallback((next: number) => {
    void hapticTap();
    setSpeed(next);
    setRun((n) => n + 1);
  }, []);

  const openMeta = open ? LAB_SURFACES.find((s) => s.id === open) : null;

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* ── шапка ─────────────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Pressable
            testID="motion-lab-back"
            accessibilityRole="button"
            accessibilityLabel="Назад"
            onPress={() => { void hapticTap(); safeRouterBack(router); }}
            hitSlop={10}
            style={{
              width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
              backgroundColor: t.bgSurface, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.border,
            }}
          >
            <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '900', letterSpacing: -0.4 }}>
              Лаборатория движения
            </Text>
            <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 2 }}>
              3 направления · {LAB_SURFACES.length} поверхностей · ничего не применяется к экранам
            </Text>
          </View>
        </View>

        {/* ── выбор направления ─────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
          {LAB_DIRECTIONS.map((d) => {
            const on = d.id === dir;
            return (
              <Pressable
                key={d.id}
                testID={`motion-lab-dir-${d.id}`}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => switchDir(d.id)}
                style={{
                  flex: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 10,
                  backgroundColor: on ? t.accentBg : t.bgSurface,
                  borderWidth: StyleSheet.hairlineWidth * 2,
                  borderColor: on ? t.accent : t.border,
                }}
              >
                <Text style={{ color: on ? t.accent : t.textGhost, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.4 }}>
                  {d.roman}
                </Text>
                <Text style={{ color: on ? t.textPrimary : t.textMuted, fontSize: f.caption, fontWeight: '800', marginTop: 2 }}>
                  {d.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={{ color: t.textMuted, fontSize: 11.5, lineHeight: 17, paddingHorizontal: 16, paddingTop: 10 }}>
          {active.tagline}
        </Text>

        {/* ── скорость и reduce motion ──────────────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
          <View style={{ flexDirection: 'row', borderRadius: 11, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.border }}>
            {SPEEDS.map((s) => {
              const on = s === speed;
              return (
                <Pressable
                  key={s}
                  testID={`motion-lab-speed-${s}`}
                  accessibilityRole="button"
                  onPress={() => switchSpeed(s)}
                  style={{ paddingHorizontal: 13, paddingVertical: 8, backgroundColor: on ? t.accentBg : 'transparent' }}
                >
                  <Text style={{ color: on ? t.accent : t.textGhost, fontSize: 11.5, fontWeight: '800' }}>{s}×</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            testID="motion-lab-reduce"
            accessibilityRole="switch"
            accessibilityState={{ checked: reduce }}
            onPress={() => { void hapticTap(); setReduce((v) => !v); setRun((n) => n + 1); }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 12, paddingVertical: 8, borderRadius: 11,
              backgroundColor: reduce ? t.accentBg : 'transparent',
              borderWidth: StyleSheet.hairlineWidth * 2, borderColor: reduce ? t.accent : t.border,
            }}
          >
            <Ionicons name={reduce ? 'checkbox' : 'square-outline'} size={14} color={reduce ? t.accent : t.textGhost} />
            <Text style={{ color: reduce ? t.accent : t.textGhost, fontSize: 11.5, fontWeight: '700' }}>Reduce Motion</Text>
          </Pressable>
        </View>

        {/* ── каталог ───────────────────────────────────────────────────── */}
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {grouped.map(([cat, items]) => (
            <View key={cat} style={{ marginTop: 10 }}>
              <Text style={{ color: t.textGhost, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 8 }}>
                {cat} · {items.length}
              </Text>
              {items.map((s) => (
                <Pressable
                  key={s.id}
                  testID={`motion-lab-surface-${s.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Запустить: ${s.title}`}
                  onPress={() => launch(s.id)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: t.bgCard, borderRadius: 16, padding: 14, marginBottom: 8,
                    borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>{s.title}</Text>
                    <Text style={{ color: t.textMuted, fontSize: 11.5, marginTop: 3, lineHeight: 16 }}>{s.detail}</Text>
                  </View>
                  <Ionicons name="play-circle-outline" size={26} color={t.accent} />
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* ── сцена ───────────────────────────────────────────────────────── */}
      {open && openMeta ? (
        <View style={StyleSheet.absoluteFill} testID="motion-lab-stage">
          <ScreenGradient>
            <View style={StyleSheet.absoluteFill}>
              <LabSurface key={`${open}-${dir}-${run}`} id={open} dir={dir} run={run} slow={slow} reduce={reduce} />
            </View>

            <SafeAreaView style={{ flex: 1, justifyContent: 'flex-end' }} edges={['bottom']} pointerEvents="box-none">
              <View
                style={{
                  margin: 12, borderRadius: 18, padding: 12,
                  backgroundColor: t.bgCard,
                  borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>
                      {openMeta.title}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: 10.5, marginTop: 2 }}>
                      {active.roman} · {active.name} · {speed}×{reduce ? ' · reduce' : ''}
                    </Text>
                  </View>
                  <Pressable
                    testID="motion-lab-replay"
                    accessibilityRole="button"
                    accessibilityLabel="Проиграть заново"
                    onPress={replay}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: t.accent,
                    }}
                  >
                    <Ionicons name="refresh" size={14} color={t.correctText} />
                    <Text style={{ color: t.correctText, fontSize: 12, fontWeight: '900' }}>Ещё раз</Text>
                  </Pressable>
                  <Pressable
                    testID="motion-lab-close"
                    accessibilityRole="button"
                    accessibilityLabel="Закрыть сцену"
                    onPress={() => { void hapticTap(); setOpen(null); }}
                    style={{
                      width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: t.bgSurface, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.border,
                    }}
                  >
                    <Ionicons name="close" size={18} color={t.textMuted} />
                  </Pressable>
                </View>

                <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                  {LAB_DIRECTIONS.map((d) => {
                    const on = d.id === dir;
                    return (
                      <Pressable
                        key={d.id}
                        testID={`motion-lab-stage-dir-${d.id}`}
                        accessibilityRole="button"
                        onPress={() => switchDir(d.id)}
                        style={{
                          flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 11,
                          backgroundColor: on ? t.accentBg : t.bgSurface,
                          borderWidth: StyleSheet.hairlineWidth * 2, borderColor: on ? t.accent : t.border,
                        }}
                      >
                        <Text style={{ color: on ? t.accent : t.textGhost, fontSize: 11.5, fontWeight: '800' }}>
                          {d.roman} · {d.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                  {SPEEDS.map((s) => {
                    const on = s === speed;
                    return (
                      <Pressable
                        key={s}
                        testID={`motion-lab-stage-speed-${s}`}
                        accessibilityRole="button"
                        onPress={() => switchSpeed(s)}
                        style={{
                          flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 10,
                          backgroundColor: on ? t.accentBg : t.bgSurface,
                          borderWidth: StyleSheet.hairlineWidth * 2, borderColor: on ? t.accent : t.border,
                        }}
                      >
                        <Text style={{ color: on ? t.accent : t.textGhost, fontSize: 11, fontWeight: '800' }}>{s}×</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </SafeAreaView>
          </ScreenGradient>
        </View>
      ) : null}
    </ScreenGradient>
  );
}
