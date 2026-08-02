import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
  SlideInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { getStableId } from '../../../app/stable_id';
import { ensureAccountGeneration, isCurrentAccountGeneration } from '../../../app/account_generation';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import { buildLesson1LegacyV2SourcePayload } from '../../../modules/learning-v2/content/legacy_lesson_payload';
import { lesson1MapInputFromProgress } from '../../../modules/learning-v2/map/lesson1_map_progress_adapter';
import { buildLessonMapModel, type LessonMapNode } from '../../../modules/learning-v2/map/lesson_map_model';
import { createLesson1LocalProgressStore, type Lesson1LocalProgressState } from '../../../modules/learning-v2/progress/lesson1_local_progress';

const SESSION_IDS = ['understand', 'use', 'master'].flatMap(zone =>
  [1, 2, 3, 4].map(index => `lesson-1-${zone}-${index}`),
);
const fallbackModel = buildLessonMapModel({ lessonId: 1, completedSessionIds: [], currentSessionId: SESSION_IDS[0] });

function Node({ node, onPress }: { node: LessonMapNode; onPress: (node: LessonMapNode) => void }) {
  const reducedMotion = useReducedMotion();
  const halo = useSharedValue(node.state === 'current' ? 0.7 : 0);
  useEffect(() => {
    if (node.state !== 'current' || reducedMotion) { halo.value = node.state === 'current' ? 0.7 : 0; return; }
    const update = () => {
      halo.value = AppState.currentState === 'active'
        ? withRepeat(withSequence(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }), withTiming(.55, { duration: 1200, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System })), -1, false)
        : 0;
    };
    update(); const subscription = AppState.addEventListener('change', update);
    return () => { subscription.remove(); halo.value = 0; };
  }, [halo, node.state, reducedMotion]);
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value, transform: [{ scale: 1 + halo.value * .14 }] }));
  const size = node.state === 'current' ? 76 : node.state === 'next' ? 62 : node.state === 'completed' ? 58 : 60;
  const locked = node.state === 'locked';
  const accessibleState = node.state === 'completed' ? 'пройдена' : node.state === 'current' ? 'текущая' : node.state === 'next' ? 'следующая' : 'заблокирована';
  const entrance = reducedMotion
    ? FadeInDown.duration(1)
    : FadeInDown.delay((node.order - 1) * 40).duration(320).easing(Easing.bezier(.38, .70, .125, 1));
  return <Animated.View entering={entrance} style={[styles.nodeLane, { transform: [{ translateX: node.xOffset }] }]}>
    {node.state === 'current' && <Animated.View pointerEvents="none" style={[styles.halo, { width: size, height: size, borderRadius: size / 2 }, haloStyle]} />}
    <Pressable accessibilityRole="button" accessibilityLabel={`Сессия ${node.order}, ${accessibleState}`} accessibilityHint={locked ? 'Сначала завершите предыдущую сессию' : 'Открыть сведения о сессии'} onPress={() => onPress(node)} style={({ pressed }) => [styles.node, { width: size, height: size, borderRadius: size / 2 }, styles[`node_${node.state}`], pressed && !locked && styles.nodePressed]}>
      {locked ? <Ionicons name="lock-closed" size={20} color="#777D88" /> : node.state === 'completed' ? <Ionicons name="checkmark" size={27} color="#07110A" /> : <Text style={[styles.nodeNumber, node.state === 'current' && styles.nodeNumberCurrent]}>{node.order}</Text>}
    </Pressable>
  </Animated.View>;
}

export default function LearningV2LessonMap() {
  const router = useRouter(); const insets = useStableSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [model, setModel] = useState(fallbackModel);
  const [selected, setSelected] = useState<LessonMapNode | 'dictionary' | 'theory' | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const payload = useMemo(() => buildLesson1LegacyV2SourcePayload(), []);
  useEffect(() => { void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion); }, []);
  useEffect(() => {
    if (id && id !== '1') return;
    let cancelled = false;
    void (async () => {
      const stableId = await getStableId(); const token = ensureAccountGeneration(stableId);
      const accountScopeHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, stableId);
      const store = createLesson1LocalProgressStore(AsyncStorage, scope => isCurrentAccountGeneration(token, scope.stableId), SESSION_IDS);
      const state = await store.load({ stableId, accountScopeHash, seasonId: 'learning-v2', studyTarget: 'en', learnerSourceLocale: 'ru', generation: token.generation });
      if (!cancelled) setModel(buildLessonMapModel(lesson1MapInputFromProgress(state)));
    })().catch(() => { /* fallback preserves final map geometry offline/corrupt-state */ });
    return () => { cancelled = true; };
  }, [id]);
  const completeCount = model.zones.flatMap(zone => zone.nodes).filter(node => node.state === 'completed').length;
  const selectNode = (node: LessonMapNode) => {
    if (node.state === 'locked' || node.state === 'next') { setSelected(node); return; }
    setSelected(node);
  };
  return <View style={styles.screen}>
    <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 104 }]}>
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Назад" hitSlop={10} onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={24} color="#F4F6F8" /></Pressable><View accessibilityLabel="Общий баланс звёзд появится после подключения V2-кошелька" style={styles.wallet}><Ionicons name="star" size={16} color="#F5C84C" /><Text style={styles.walletText}>—</Text></View></View>
      <Text style={styles.eyebrow}>УРОК 1 · A1</Text><Text style={styles.title}>Знакомство</Text><Text style={styles.canDo}>Ты сможешь представиться и сказать простые фразы о себе.</Text>
      <View style={styles.tools}><Pressable accessibilityRole="button" accessibilityLabel="Открыть словарь урока" onPress={() => setSelected('dictionary')} style={styles.tool}><Ionicons name="book-outline" size={18} color="#D9E2EC" /><Text style={styles.toolText}>Словарь · {payload.vocabulary.length}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Открыть теорию урока" onPress={() => setSelected('theory')} style={styles.tool}><Ionicons name="bulb-outline" size={18} color="#D9E2EC" /><Text style={styles.toolText}>Теория</Text></Pressable></View>
      <Text accessibilityLabel={`Пройдено ${completeCount} из 12`} style={styles.progress}>{completeCount} из 12 сессий</Text>
      {model.zones.map(zone => <View key={zone.id}><Text style={styles.zone}>{zone.title}</Text>{zone.nodes.map(node => <Node key={node.id} node={node} onPress={selectNode} />)}</View>)}
      <View style={styles.checkpoint}><Ionicons name="flag" size={28} color="#F5C84C" /><View><Text style={styles.checkpointTitle}>Контрольная точка</Text><Text style={styles.checkpointText}>Откроется после двенадцатой сессии</Text></View></View>
    </ScrollView>
    {selected && <Animated.View entering={reducedMotion ? SlideInDown.duration(1) : SlideInDown.duration(320).easing(Easing.bezier(.38, .70, .125, 1))} accessibilityViewIsModal style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}><View style={styles.grabber} />
      {selected === 'dictionary' ? <><Text style={styles.sheetTitle}>Словарь урока</Text><Text style={styles.sheetText}>{payload.vocabulary.slice(0, 8).map(word => word.surface).join(' · ')}</Text></> : selected === 'theory' ? <><Text style={styles.sheetTitle}>Теория урока</Text><Text style={styles.sheetText}>Короткое объяснение и примеры урока сохранены из существующего Lesson 1.</Text></> : <><Text style={styles.sheetTitle}>Сессия {selected.order}</Text><Text style={styles.sheetText}>{selected.state === 'locked' || selected.state === 'next' ? 'Сначала спокойно заверши предыдущую сессию.' : selected.state === 'completed' ? 'Сессия пройдена. Можно улучшить результат.' : '12 заданий · около 6 минут'}</Text></>}
      <Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={styles.sheetCta}><Text style={styles.sheetCtaText}>{typeof selected === 'object' && selected.state === 'current' ? 'Начать' : 'Понятно'}</Text></Pressable></Animated.View>}
  </View>;
}

const styles = StyleSheet.create({ screen:{flex:1,backgroundColor:'#12161C'},scroll:{paddingHorizontal:18},header:{height:44,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},headerButton:{width:40,height:40,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'#202833'},wallet:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'#202833',paddingHorizontal:12,height:36,borderRadius:18},walletText:{color:'#F4F6F8',fontWeight:'800'},eyebrow:{color:'#7E8A99',fontSize:11,fontWeight:'800',letterSpacing:2,marginTop:18},title:{color:'#F7F9FB',fontSize:30,lineHeight:35,fontWeight:'800',marginTop:4},canDo:{color:'#B4BEC9',fontSize:15.5,lineHeight:22,marginTop:8,fontWeight:'600'},tools:{flexDirection:'row',gap:10,marginTop:18},tool:{backgroundColor:'#1C242E',borderRadius:16,paddingHorizontal:14,height:44,flexDirection:'row',alignItems:'center',gap:7},toolText:{color:'#D9E2EC',fontWeight:'700',fontSize:13},progress:{color:'#AAB6C4',fontWeight:'700',marginTop:22},zone:{color:'#8793A3',fontSize:11.5,fontWeight:'800',letterSpacing:2,marginTop:22,marginLeft:8},nodeLane:{height:96,alignItems:'center',justifyContent:'center'},node:{alignItems:'center',justifyContent:'center',borderWidth:2,borderBottomWidth:6},node_completed:{backgroundColor:'#8EE65A',borderColor:'#B9F58C'},node_current:{backgroundColor:'#F5C84C',borderColor:'#FFE28A'},node_next:{backgroundColor:'#516DFF',borderColor:'#8BA2FF'},node_locked:{backgroundColor:'#252C35',borderColor:'#39424D'},nodePressed:{transform:[{scale:.94}]},nodeNumber:{color:'#F7F9FB',fontWeight:'900',fontSize:22},nodeNumberCurrent:{color:'#17120A',fontSize:28},halo:{position:'absolute',backgroundColor:'#F5C84C'},checkpoint:{marginTop:14,marginHorizontal:4,borderRadius:22,padding:20,backgroundColor:'#1C242E',flexDirection:'row',gap:14,alignItems:'center'},checkpointTitle:{color:'#F7F9FB',fontSize:17,fontWeight:'800'},checkpointText:{color:'#9AA7B5',fontSize:13,marginTop:3},sheet:{position:'absolute',left:0,right:0,bottom:0,backgroundColor:'#202833',borderTopLeftRadius:28,borderTopRightRadius:28,paddingTop:14,paddingHorizontal:22},grabber:{width:38,height:4,borderRadius:2,backgroundColor:'#647182',alignSelf:'center'},sheetTitle:{color:'#F7F9FB',fontSize:22,fontWeight:'900',marginTop:20},sheetText:{color:'#B4BEC9',lineHeight:20,marginTop:8,minHeight:52},sheetCta:{height:56,borderRadius:20,backgroundColor:'#8EE65A',alignItems:'center',justifyContent:'center',marginTop:14},sheetCtaText:{color:'#07110A',fontWeight:'900',fontSize:16} });
